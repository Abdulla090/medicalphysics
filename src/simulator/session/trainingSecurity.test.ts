// @vitest-environment node
import { convexTest } from 'convex-test';
import { describe,it,expect } from 'vitest';
import schema from '../../../convex/schema';
import { api } from '../../../convex/_generated/api';
import { completeEncounter,prepareEncounter } from './sessionTestFixtures';
const modules=import.meta.glob('../../../convex/**/*.ts');
const weights=[['identity',15],['hygiene',5],['protocol',15],['protection',15],['position',15],['coverage',10],['technique',15],['detector',5],['respiration',5]].map(([criterion,points])=>({criterion:criterion as string,points:points as number}));
async function fixture(){
 const t=convexTest(schema,modules);
 const faculty=t.withIdentity({subject:'faculty'}),student=t.withIdentity({subject:'student'}),other=t.withIdentity({subject:'other'}),outsider=t.withIdentity({subject:'other-faculty'});
 const course=await t.run(async ctx=>{
  await ctx.db.insert('user_roles',{userId:'faculty',role:'instructor'});await ctx.db.insert('user_roles',{userId:'other-faculty',role:'instructor'});
  await ctx.db.insert('user_roles',{userId:'student',role:'user'});
  await ctx.db.insert('profiles',{userId:'student',fullName:'Synthetic Student'});await ctx.db.insert('profiles',{userId:'other',fullName:'Other Student'});
  return ctx.db.insert('courses',{title:'Local training',slug:'local-training',difficulty:'beginner',isPublished:true,orderIndex:0});
 });
 const cohort=await faculty.mutation(api.training.createCohort,{name:'Class A',courseId:course});
 await faculty.mutation(api.training.enroll,{cohortId:cohort,userId:'student',enrolled:true});
 const version=await faculty.mutation(api.training.publishCase,{caseId:'outpatient-chest',approvalNote:'Reviewed fictional teaching case and exercise rubric for this automated test.',weights});
 const assignment=await faculty.mutation(api.training.assign,{cohortId:cohort,...version,title:'Chest exercise',dueAt:Date.now()+86400000});
 const attempt=await student.mutation(api.training.startAttempt,{assignmentId:assignment});
 return {t,faculty,student,other,outsider,cohort,version,assignment,attempt};
}
describe('Convex academic authorization and evidence integrity',()=>{
 it('requires authentication and server roles without promoting legacy users',async()=>{
  const {t,student,other,outsider,cohort,attempt}=await fixture();
  await expect(t.query(api.training.dashboard,{})).rejects.toThrow('Authentication required');
  expect((await student.query(api.roles.current,{}))?.role).toBe('student');
  await expect(student.mutation(api.roles.setInstructor,{userId:'student',enabled:true})).rejects.toThrow('Permission denied');
  await expect(other.query(api.training.getAttempt,{attemptId:attempt})).rejects.toThrow();
  await expect(outsider.query(api.training.members,{cohortId:cohort})).rejects.toThrow('Cohort access denied');
  await expect(outsider.query(api.training.getAttempt,{attemptId:attempt})).rejects.toThrow('Cohort access denied');
 });
 it('rejects forged profile ownership, unauthorized uploads and invalid action evidence',async()=>{
  const {student,other,attempt}=await fixture();
  await expect(student.query(api.api.getUser,{userId:'other'})).rejects.toThrow('Permission denied');
  await expect(other.mutation(api.training.uploadEvidence,{attemptId:attempt,acquisitionId:'x',width:32,height:39,pixels:new ArrayBuffer(2496)})).rejects.toThrow();
  await expect(student.mutation(api.training.appendActions,{attemptId:attempt,revision:0,eventsJson:JSON.stringify([{seq:0,at:Date.now(),action:{type:'expose',id:'forged',seed:1}}])})).rejects.toThrow('exposure-blocked');
  await expect(student.mutation(api.training.uploadEvidence,{attemptId:attempt,acquisitionId:'x',width:32,height:39,pixels:new ArrayBuffer(2496)})).rejects.toThrow('Invalid image evidence');
 });
 it('freezes versions, validates the whole attempt, submits idempotently and audits faculty amendments',async()=>{
  const {t,faculty,student,other,attempt,version}=await fixture();
  const initial=await student.query(api.training.getAttempt,{attemptId:attempt});
  const local=completeEncounter(prepareEncounter('outpatient-chest','assessment',initial.startedAt));
  await student.mutation(api.training.appendActions,{attemptId:attempt,revision:0,eventsJson:JSON.stringify(local.actions)});
  // Retry after a lost acknowledgement is accepted only for identical evidence.
  await student.mutation(api.training.appendActions,{attemptId:attempt,revision:0,eventsJson:JSON.stringify(local.actions)});
  await expect(student.mutation(api.training.submit,{attemptId:attempt,revision:local.actions.length})).rejects.toThrow();
  const payload={attemptId:attempt,acquisitionId:'image-1',width:32,height:39,pixels:new ArrayBuffer(2496)};
  await student.mutation(api.training.uploadEvidence,payload);
  await student.mutation(api.training.uploadEvidence,payload);
  await expect(other.query(api.training.getEvidence,{attemptId:attempt,acquisitionId:'image-1'})).rejects.toThrow();
  await student.mutation(api.training.submit,{attemptId:attempt,revision:local.actions.length});await student.mutation(api.training.submit,{attemptId:attempt,revision:local.actions.length});
  await expect(student.mutation(api.training.deleteDraft,{attemptId:attempt})).rejects.toThrow();
  await expect(student.mutation(api.training.publishGrade,{attemptId:attempt,grade:90,feedback:'Forged',amendment:''})).rejects.toThrow();
  await faculty.mutation(api.training.publishGrade,{attemptId:attempt,grade:88,feedback:'Reviewed synthetic evidence.',amendment:''});
  await expect(faculty.mutation(api.training.publishGrade,{attemptId:attempt,grade:91,feedback:'Reviewed again.',amendment:''})).rejects.toThrow();
  await faculty.mutation(api.training.publishGrade,{attemptId:attempt,grade:91,feedback:'Second review completed.',amendment:'Corrected rubric interpretation after review.'});
  await faculty.mutation(api.training.publishCase,{caseId:'outpatient-chest',approvalNote:'New local review with revised weighting and publication.',weights:weights.map(w=>({...w,points:w.criterion==='identity'?20:w.criterion==='technique'?10:w.points}))});
  const final=await student.query(api.training.getAttempt,{attemptId:attempt});expect(final.caseVersionId).toBe(version.caseVersionId);expect(final.rubricVersionId).toBe(version.rubricVersionId);expect(final.reviews).toHaveLength(2);expect(JSON.parse(final.provisionalJson!).score).toBeGreaterThan(0);
  expect((await t.run(ctx=>ctx.db.query('training_audit').collect())).length).toBeGreaterThan(1);
 });
});
