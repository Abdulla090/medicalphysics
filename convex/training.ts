import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { v, ConvexError } from 'convex/values';
import { z } from 'zod';
import { requireAdmin, requireFaculty, requireIdentity, roleFor } from './permissions';
import { actionSchema, applySessionAction, clinicalCaseFor, createSession, ENGINE_VERSION, provisionalAssessment, replaySession, type ActionEvidence, type ClinicalSession } from '../src/simulator/session/clinicalSession';
import type { CaseId, ClinicalCase } from '../src/simulator/clinicalCases';

type Context = QueryCtx | MutationCtx;
const criteria = ['identity','hygiene','protocol','protection','position','coverage','technique','detector','respiration'] as const;
async function facultyFor(ctx: Context, cohortId: Id<'cohorts'>) {
  const { identity, role } = await requireFaculty(ctx);
  const cohort = await ctx.db.get(cohortId);
  if (!cohort || (role !== 'admin' && !cohort.instructorIds.includes(identity.subject))) throw new ConvexError('Cohort access denied');
  return { identity, cohort };
}
async function memberFor(ctx: Context, cohortId: Id<'cohorts'>, subject: string) {
  const member = await ctx.db.query('cohort_members').withIndex('by_member',q => q.eq('cohortId',cohortId).eq('userId',subject)).unique();
  if (!member) throw new ConvexError('Enrollment required');
}
async function ownedAttempt(ctx: Context, id: Id<'training_attempts'>) {
  const identity = await requireIdentity(ctx);
  const attempt = await ctx.db.get(id);
  if (!attempt || attempt.userId !== identity.subject) throw new ConvexError('Attempt access denied');
  await memberFor(ctx, attempt.cohortId, identity.subject);
  return attempt;
}
async function readableAttempt(ctx: Context, id: Id<'training_attempts'>) {
  const identity = await requireIdentity(ctx);
  const attempt = await ctx.db.get(id);
  if (!attempt) throw new ConvexError('Attempt access denied');
  if (attempt.userId === identity.subject) await memberFor(ctx,attempt.cohortId,identity.subject);
  else await facultyFor(ctx,attempt.cohortId);
  return attempt;
}
const sessionOf = (attempt: Doc<'training_attempts'>) => JSON.parse(attempt.sessionJson) as ClinicalSession;
const cleanText = (value: string, max = 2000) => { const text = value.trim(); if (!text || text.length > max) throw new ConvexError('Invalid text length'); return text; };

async function courseEditor(ctx:Context,id:Id<'courses'>){
  const {identity,role}=await requireFaculty(ctx),course=await ctx.db.get(id);
  if(!course || role!=='admin'&&course.createdBy!==identity.subject)throw new ConvexError('Course edit access denied');
  return {identity,course};
}
export const editableCourses=query({args:{},handler:async ctx=>{
 const {identity,role}=await requireFaculty(ctx);
 return (await ctx.db.query('courses').collect()).filter(c=>role==='admin'||c.createdBy===identity.subject);
}});
export const saveCourse=mutation({args:{id:v.optional(v.id('courses')),title:v.string(),description:v.string(),published:v.boolean()},handler:async(ctx,args)=>{
 const {identity}=args.id?await courseEditor(ctx,args.id):await requireFaculty(ctx);
 const title=cleanText(args.title,160),description=cleanText(args.description,5000);
 if(args.id){await ctx.db.patch(args.id,{title,description,isPublished:args.published});return args.id;}
 return ctx.db.insert('courses',{title,description,isPublished:args.published,createdBy:identity.subject,slug:'training-'+Date.now()+'-'+Math.floor(Math.random()*100000),difficulty:'beginner',orderIndex:0});
}});
export const courseModules=query({args:{courseId:v.id('courses')},handler:async(ctx,args)=>{
 await courseEditor(ctx,args.courseId);
 const links=await ctx.db.query('course_lessons').withIndex('by_course',q=>q.eq('courseId',args.courseId)).collect();
 return Promise.all(links.sort((a,b)=>a.orderIndex-b.orderIndex).map(async link=>({link,lesson:await ctx.db.get(link.lessonId)})));
}});
export const saveModule=mutation({args:{courseId:v.id('courses'),lessonId:v.optional(v.id('lessons')),title:v.string(),content:v.string(),order:v.number(),published:v.boolean()},handler:async(ctx,args)=>{
 const {identity}=await courseEditor(ctx,args.courseId);
 if(!Number.isInteger(args.order)||args.order<0||args.order>500)throw new ConvexError('Invalid module order');
 const title=cleanText(args.title,160),content=cleanText(args.content,50000);
 if(args.lessonId){
  const links=await ctx.db.query('course_lessons').withIndex('by_lesson',q=>q.eq('lessonId',args.lessonId!)).collect();
  if(!links.length||links.some(l=>l.courseId!==args.courseId))throw new ConvexError('Shared module requires administrator editing');
  await ctx.db.patch(args.lessonId,{title,content,isPublished:args.published});await ctx.db.patch(links[0]._id,{orderIndex:args.order});return args.lessonId;
 }
 const lessonId=await ctx.db.insert('lessons',{title,slug:'module-'+Date.now()+'-'+Math.floor(Math.random()*100000),description:title,content,duration:'Self-paced',difficulty:'beginner',category:'xray',instructor:identity.name??'Faculty',createdBy:identity.subject,isPublished:args.published});
 await ctx.db.insert('course_lessons',{courseId:args.courseId,lessonId,orderIndex:args.order});return lessonId;
}});

export const dashboard = query({ args: {}, handler: async ctx => {
  const identity = await requireIdentity(ctx);
  const role = await roleFor(ctx,identity.subject);
  const memberships = await ctx.db.query('cohort_members').withIndex('by_user',q => q.eq('userId',identity.subject)).collect();
  const cohorts = role === 'student'
    ? (await Promise.all(memberships.map(m => ctx.db.get(m.cohortId)))).filter((c): c is Doc<'cohorts'> => c !== null)
    : (await ctx.db.query('cohorts').collect()).filter(c => role === 'admin' || c.instructorIds.includes(identity.subject));
  const assignments = (await Promise.all(cohorts.map(c => ctx.db.query('assignments').withIndex('by_cohort',q => q.eq('cohortId',c._id)).collect()))).flat();
  const attempts = role === 'student'
    ? await ctx.db.query('training_attempts').withIndex('by_user',q => q.eq('userId',identity.subject)).collect()
    : (await Promise.all(assignments.map(a => ctx.db.query('training_attempts').withIndex('by_assignment',q => q.eq('assignmentId',a._id)).collect()))).flat();
  const summaries = await Promise.all(attempts.filter(a => cohorts.some(c => c._id === a.cohortId)).map(async a => {
    const reviews = await ctx.db.query('training_reviews').withIndex('by_attempt',q => q.eq('attemptId',a._id)).collect();
    const review = reviews.sort((a,b) => b.publishedAt-a.publishedAt)[0] ?? null;
    return { _id:a._id, assignmentId:a.assignmentId, userId:a.userId, status:a.status, startedAt:a.startedAt, submittedAt:a.submittedAt, review };
  }));
  const courses = await ctx.db.query('courses').collect();
  return { role, cohorts, assignments, attempts:summaries, courses: courses.filter(c => c.isPublished || role !== 'student'), university: await ctx.db.query('university_settings').withIndex('by_key',q => q.eq('key','university')).unique() };
} });
export const createCohort = mutation({ args: { name:v.string(), courseId:v.id('courses') }, handler: async (ctx,args) => {
  const { identity } = await requireFaculty(ctx);
  if (!await ctx.db.get(args.courseId)) throw new ConvexError('Course missing');
  return ctx.db.insert('cohorts',{ name:cleanText(args.name,120), courseId:args.courseId, instructorIds:[identity.subject], createdBy:identity.subject });
} });
export const setCohortInstructors = mutation({ args: { cohortId:v.id('cohorts'), instructorIds:v.array(v.string()) }, handler: async (ctx,args) => {
  await requireAdmin(ctx);
  if (!args.instructorIds.length || args.instructorIds.length > 20) throw new ConvexError('Invalid faculty list');
  for (const id of args.instructorIds) if (await roleFor(ctx,id) === 'student') throw new ConvexError('Instructor capability required');
  await ctx.db.patch(args.cohortId,{ instructorIds:[...new Set(args.instructorIds)] });
} });
export const enroll = mutation({ args:{ cohortId:v.id('cohorts'), userId:v.string(), enrolled:v.boolean() }, handler:async(ctx,args) => {
  const { identity } = await facultyFor(ctx,args.cohortId);
  if (!await ctx.db.query('profiles').withIndex('by_userId',q => q.eq('userId',args.userId)).first()) throw new ConvexError('Student must sign in and create a profile first');
  const existing = await ctx.db.query('cohort_members').withIndex('by_member',q => q.eq('cohortId',args.cohortId).eq('userId',args.userId)).unique();
  if (args.enrolled && !existing) await ctx.db.insert('cohort_members',{cohortId:args.cohortId,userId:args.userId});
  if (!args.enrolled && existing) await ctx.db.delete(existing._id);
  await ctx.db.insert('training_audit',{actor:identity.subject,action:'enrollment',target:args.cohortId,detail:args.userId+':'+args.enrolled,at:Date.now()});
} });
export const members = query({ args:{cohortId:v.id('cohorts')},handler:async(ctx,args) => {
  await facultyFor(ctx,args.cohortId);
  const members = await ctx.db.query('cohort_members').withIndex('by_cohort',q => q.eq('cohortId',args.cohortId)).collect();
  return Promise.all(members.map(async m => ({...m,profile:await ctx.db.query('profiles').withIndex('by_userId',q=>q.eq('userId',m.userId)).first()})));
} });
export const publishCase = mutation({args:{caseId:v.string(),approvalNote:v.string(),weights:v.array(v.object({criterion:v.string(),points:v.number()}))},handler:async(ctx,args)=>{
  const {identity}=await requireFaculty(ctx);
  const c=clinicalCaseFor(args.caseId as CaseId);
  if (args.weights.length !== criteria.length || new Set(args.weights.map(x=>x.criterion)).size !== criteria.length
    || args.weights.some(w=>!criteria.includes(w.criterion as typeof criteria[number]) || !Number.isFinite(w.points) || w.points < 0 || w.points > 100)
    || args.weights.reduce((sum,w)=>sum+w.points,0)!==100) throw new ConvexError('Rubric must contain each criterion once and total 100');
  const approvalNote=cleanText(args.approvalNote);
  if(approvalNote.length<20) throw new ConvexError('Document faculty review of terminology, targets and rubric');
  const previous=await ctx.db.query('case_versions').withIndex('by_case',q=>q.eq('caseId',args.caseId)).collect();
  const version=Math.max(0,...previous.map(x=>x.version))+1;
  const caseVersionId=await ctx.db.insert('case_versions',{caseId:c.id,version,snapshot:JSON.stringify(c),approvedBy:identity.subject,approvalNote,publishedAt:Date.now()});
  const rubricVersionId=await ctx.db.insert('rubric_versions',{caseVersionId,version,weights:args.weights,approvedBy:identity.subject,publishedAt:Date.now()});
  return {caseVersionId,rubricVersionId};
}});
export const versions = query({args:{},handler:async ctx=>{
  await requireFaculty(ctx);
  const versions=await ctx.db.query('case_versions').collect();
  return Promise.all(versions.map(async c=>({...c,rubrics:await ctx.db.query('rubric_versions').withIndex('by_case',q=>q.eq('caseVersionId',c._id)).collect()})));
}});
export const assign = mutation({args:{cohortId:v.id('cohorts'),caseVersionId:v.id('case_versions'),rubricVersionId:v.id('rubric_versions'),title:v.string(),dueAt:v.number()},handler:async(ctx,args)=>{
  const {identity}=await facultyFor(ctx,args.cohortId);
  const c=await ctx.db.get(args.caseVersionId),rubric=await ctx.db.get(args.rubricVersionId);
  if(!c || !rubric || rubric.caseVersionId!==c._id || !Number.isFinite(args.dueAt) || args.dueAt<=Date.now()) throw new ConvexError('Invalid assignment');
  return ctx.db.insert('assignments',{...args,title:cleanText(args.title,140),createdBy:identity.subject,createdAt:Date.now()});
}});
export const startAttempt = mutation({args:{assignmentId:v.id('assignments')},handler:async(ctx,args)=>{
  const identity=await requireIdentity(ctx),a=await ctx.db.get(args.assignmentId);
  if(!a) throw new ConvexError('Assignment unavailable');
  await memberFor(ctx,a.cohortId,identity.subject);
  const existing=await ctx.db.query('training_attempts').withIndex('by_user_assignment',q=>q.eq('userId',identity.subject).eq('assignmentId',a._id)).collect();
  const draft=existing.find(x=>x.status==='draft');
  if(draft) return draft._id;
  if(a.dueAt<Date.now()) throw new ConvexError('Assignment deadline has passed');
  const c=await ctx.db.get(a.caseVersionId),r=await ctx.db.get(a.rubricVersionId);
  if(!c || !r) throw new ConvexError('Published version missing');
  const at=Date.now();
  const session=createSession(identity.subject+'-'+at,c.caseId as CaseId,'assessment',at,c.version,r.version);
  session.caseSnapshot=JSON.parse(c.snapshot) as ClinicalCase;
  return ctx.db.insert('training_attempts',{userId:identity.subject,assignmentId:a._id,cohortId:a.cohortId,caseVersionId:c._id,rubricVersionId:r._id,sessionJson:JSON.stringify(session),revision:0,status:'draft',startedAt:at});
}});
export const getAttempt = query({args:{attemptId:v.id('training_attempts')},handler:async(ctx,args)=>{
  const attempt=await readableAttempt(ctx,args.attemptId);
  const reviews=await ctx.db.query('training_reviews').withIndex('by_attempt',q=>q.eq('attemptId',attempt._id)).collect();
  return {...attempt,reviews};
}});
const eventSchema=z.object({seq:z.number().int().nonnegative(),at:z.number().finite(),action:actionSchema}).strict();
export const appendActions = mutation({args:{attemptId:v.id('training_attempts'),revision:v.number(),eventsJson:v.string()},handler:async(ctx,args)=>{
  const attempt=await ownedAttempt(ctx,args.attemptId);
  if(attempt.status!=='draft') throw new ConvexError('Submitted attempts are immutable');
  if(args.eventsJson.length>150000) throw new ConvexError('Evidence batch too large');
  const events=z.array(eventSchema).min(1).max(100).parse(JSON.parse(args.eventsJson)) as ActionEvidence[];
  const session=sessionOf(attempt);
  // A lost response can be retried safely, including after a newer acknowledgement.
  if(args.revision<attempt.revision){
    if(events.every(e=>JSON.stringify(session.actions[e.seq])===JSON.stringify(e))) return {revision:attempt.revision};
    throw new ConvexError('Revision conflict');
  }
  if(args.revision!==attempt.revision || events.some(e=>e.action.type==='submit' || e.at>Date.now()+30000)) throw new ConvexError('Invalid evidence revision');
  const next=replaySession(session,events);
  if(next.actions.length>4000) throw new ConvexError('Attempt action limit reached');
  await ctx.db.patch(attempt._id,{sessionJson:JSON.stringify(next),revision:next.actions.length});
  return {revision:next.actions.length};
}});
export const uploadEvidence = mutation({args:{attemptId:v.id('training_attempts'),acquisitionId:v.string(),pixels:v.bytes(),width:v.number(),height:v.number()},handler:async(ctx,args)=>{
  const attempt=await ownedAttempt(ctx,args.attemptId);
  if(attempt.status!=='draft') throw new ConvexError('Submitted attempts are immutable');
  const acquisition=sessionOf(attempt).acquisitions.find(x=>x.id===args.acquisitionId);
  if(!acquisition || acquisition.status!=='ready' || args.width!==acquisition.width || args.height!==acquisition.height
    || args.pixels.byteLength!==args.width*args.height*2 || args.pixels.byteLength>650000) throw new ConvexError('Invalid image evidence');
  const existing=await ctx.db.query('training_evidence').withIndex('by_acquisition',q=>q.eq('attemptId',args.attemptId).eq('acquisitionId',args.acquisitionId)).unique();
  if(existing) {
    const a=new Uint8Array(existing.pixels),b=new Uint8Array(args.pixels);
    if(a.length!==b.length || a.some((v,i)=>v!==b[i])) throw new ConvexError('Evidence is immutable');
    return existing._id;
  }
  return ctx.db.insert('training_evidence',{...args,owner:attempt.userId,engineVersion:ENGINE_VERSION});
}});
export const getEvidence = query({args:{attemptId:v.id('training_attempts'),acquisitionId:v.string()},handler:async(ctx,args)=>{
  await readableAttempt(ctx,args.attemptId);
  return ctx.db.query('training_evidence').withIndex('by_acquisition',q=>q.eq('attemptId',args.attemptId).eq('acquisitionId',args.acquisitionId)).unique();
}});
export const deleteDraft = mutation({args:{attemptId:v.id('training_attempts')},handler:async(ctx,args)=>{
  const attempt=await ownedAttempt(ctx,args.attemptId);
  if(attempt.status!=='draft') throw new ConvexError('Submitted attempts are immutable');
  const evidence=await ctx.db.query('training_evidence').withIndex('by_attempt',q=>q.eq('attemptId',attempt._id)).collect();
  for(const e of evidence) await ctx.db.delete(e._id);
  await ctx.db.delete(attempt._id);
}});
export const submit = mutation({args:{attemptId:v.id('training_attempts'),revision:v.number()},handler:async(ctx,args)=>{
  const attempt=await ownedAttempt(ctx,args.attemptId);
  if(attempt.status==='submitted') return {status:'submitted' as const};
  if(attempt.revision!==args.revision) throw new ConvexError('Save all evidence before submission');
  const session=sessionOf(attempt);
  const evidence=await ctx.db.query('training_evidence').withIndex('by_attempt',q=>q.eq('attemptId',attempt._id)).collect();
  if(session.acquisitions.some(a=>a.status==='ready'&&!evidence.some(e=>e.acquisitionId===a.id))) throw new ConvexError('Image evidence missing');
  const completed=applySessionAction(session,{type:'submit'},Math.max(Date.now(),session.actions.at(-1)?.at??0));
  const base=provisionalAssessment(completed),rubric=await ctx.db.get(attempt.rubricVersionId);
  if(!rubric) throw new ConvexError('Frozen rubric missing');
  const items=base.items.map(item=>{const points=rubric.weights.find(w=>w.criterion===item.id)?.points??0;return {...item,points,earned:item.earned>0?points:0};});
  const provisional={...base,items,score:items.reduce((n,i)=>n+i.earned,0),total:100,repeats:Math.max(0,session.acquisitions.filter(a=>a.status==='ready').length-1),facultyReviewRequired:true};
  await ctx.db.patch(attempt._id,{sessionJson:JSON.stringify(completed),revision:completed.actions.length,status:'submitted',submittedAt:Date.now(),provisionalJson:JSON.stringify(provisional)});
  return {status:'submitted' as const};
}});
export const publishGrade = mutation({args:{attemptId:v.id('training_attempts'),grade:v.number(),feedback:v.string(),amendment:v.string()},handler:async(ctx,args)=>{
  const attempt=await ctx.db.get(args.attemptId);
  if(!attempt || attempt.status!=='submitted') throw new ConvexError('Submitted attempt required');
  const {identity}=await facultyFor(ctx,attempt.cohortId);
  if(identity.subject===attempt.userId) throw new ConvexError('Cannot grade your own attempt');
  if(!Number.isFinite(args.grade)||args.grade<0||args.grade>100) throw new ConvexError('Grade must be 0–100');
  const previous=await ctx.db.query('training_reviews').withIndex('by_attempt',q=>q.eq('attemptId',attempt._id)).collect();
  if(previous.length&&args.amendment.trim().length<10) throw new ConvexError('Document the amendment reason');
  const id=await ctx.db.insert('training_reviews',{...args,feedback:cleanText(args.feedback,5000),facultyId:identity.subject,publishedAt:Date.now()});
  await ctx.db.insert('training_audit',{actor:identity.subject,action:'publish-grade',target:attempt._id,detail:JSON.stringify({review:id,previous:previous.map(r=>r._id),amendment:args.amendment}),at:Date.now()});
  return id;
}});
export const branding = mutation({args:{name:v.string(),nameKu:v.string()},handler:async(ctx,args)=>{
  const {identity}=await requireAdmin(ctx);
  const existing=await ctx.db.query('university_settings').withIndex('by_key',q=>q.eq('key','university')).unique();
  const value={key:'university' as const,name:cleanText(args.name,160),nameKu:cleanText(args.nameKu,160),updatedBy:identity.subject};
  if(existing) await ctx.db.patch(existing._id,value); else await ctx.db.insert('university_settings',value);
}});
