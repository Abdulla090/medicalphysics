import { FacultyCourses } from '@/simulator/session/FacultyCourses';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { ArrowUpRight } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { CLINICAL_CASES, type CaseId } from '@/simulator/clinicalCases';
import { getProtocol } from '@/simulator/protocols';
import { CASE_KU, useClinicalLocale } from '@/simulator/session/i18n';
import { SourceImage, Station } from '@/simulator/session/Workstations';
import { calculateMetrics, renderPixelsToCanvas } from '@/simulator/physics';
import type { ClinicalSession } from '@/simulator/session/clinicalSession';
import '@/simulator/simulator.css';
import '@/simulator/session/clinicalGame.css';

const RUBRIC=[['identity',15],['hygiene',5],['protocol',15],['protection',15],['position',15],['coverage',10],['technique',15],['detector',5],['respiration',5]] as const;
const LABELS:Record<string,[string,string]>={identity:['Identification & preparation','ناسینەوە و ئامادەکاری'],hygiene:['Hand hygiene','پاککردنەوەی دەست'],protocol:['Requested projection','ئاڕاستەی داواکراو'],protection:['Operator protection','پاراستنی کارمەند'],position:['Alignment','ڕێکخستن'],coverage:['Coverage','داپۆشین'],technique:['Technique','تەکنیک'],detector:['Detector readiness','ئامادەیی وەرگر'],respiration:['Breathing','هەناسە']};
function useCopy(){const locale=useClinicalLocale();const copy=useCallback((en:string,ku:string)=>locale.language==='ku'?ku:en,[locale.language]);return{...locale,copy};}
export default function Training(){
 const {t,rtl,language,setLanguage,copy}=useCopy(),{isAuthenticated,isLoading}=useConvexAuth(),location=useLocation();
 const faculty=location.pathname==='/faculty';
 return <div className="training-page" dir={rtl?'rtl':'ltr'} lang={rtl?'ckb-IQ':'en'}>
  <header className="training-header"><Link to="/">medicalphysics</Link><nav><Link to="/training">{t('training')}</Link>{isAuthenticated&&<Link to="/faculty">{t('faculty')}</Link>}<button onClick={()=>setLanguage(language==='en'?'ku':'en')}>{language==='en'?'کوردی':'English'}</button></nav></header>
  <div className="training-intro"><h1>{faculty?t('faculty'):copy('Practice the whole encounter.','ڕاهێنان لە تەواوی دانیشتنی نەخۆش.')}</h1><p>{faculty?copy('Manage classes, publish reviewed cases and give students feedback on their clinical decisions.','پۆلەکان بەڕێوەببە، کەیسە پێداچووەکان بڵاو بکەرەوە و ڕاوبۆچوون لەسەر بڕیارە کلینیکییەکانی خوێندکار بدە.'):copy('From the first conversation to the last image review. Five projections, one department, unlimited practice.','لە یەکەم گفتوگۆ تا کۆتا پێداچوونەوەی وێنە. پێنج ئاڕاستە، یەک بەش، ڕاهێنانی بێ سنوور.')}</p></div>
  {!faculty&&<div className="training-row"><div><strong>{t('festival')}</strong><p>{copy('A guided encounter with controls for first-time visitors. No account needed.','دانیشتنێکی ڕێنماییکراو لەگەڵ کۆنترۆڵ بۆ سەردانکەری نوێ. پێویستی بە هەژمار نییە.')}</p></div><Link className="training-link" to="/tools/xray-simulator?festival&case=outpatient-chest">{t('enterRoom')}<ArrowUpRight size={16}/></Link></div>}
  {isLoading?<p>{copy('Loading account…','بارکردنی هەژمار…')}</p>:isAuthenticated?<UniversityWorkspace faculty={faculty}/>:<section className="training-section"><h2>{copy('Assigned learning','فێربوونی دیاریکراو')}</h2><p className="training-empty">{copy('Sign in to see your classes, assigned cases and faculty feedback.','بچۆ ژوورەوە بۆ بینینی پۆل، کەیسە دیاریکراوەکان و ڕاوبۆچوونی مامۆستا.')}</p><Link to="/auth" className="training-link">{copy('Sign in','چوونەژوورەوە')}</Link></section>}
  {!faculty&&<section className="training-section"><h2>{copy('Practice catalogue','لیستی ڕاهێنان')}</h2><div className="training-rows">{CLINICAL_CASES.map(c=><div className="training-row" key={c.id}><div><strong>{getProtocol(c.requested).name}</strong><p>{language==='ku'?CASE_KU[c.id].focus:c.teachingFocus}</p></div><div><Link className="training-link" to={'/tools/xray-simulator?case='+c.id}>{t('guided')}<ArrowUpRight size={16}/></Link><Link className="training-link" to={'/tools/xray-simulator?case='+c.id+'&mode=independent'}>{t('independent')}</Link></div></div>)}</div></section>}
  <p className="cg-note">{t('synthetic')} · {t('practiceOnly')}</p>
 </div>;
}
function UniversityWorkspace({faculty}:{faculty:boolean}){
 const data=useQuery(api.training.dashboard,{}),ensureProfile=useMutation(api.roles.ensureProfile),start=useMutation(api.training.startAttempt),navigate=useNavigate(),{copy,t,language}=useCopy();
 const [error,setError]=useState(''),[review,setReview]=useState<Id<'training_attempts'>|null>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{void ensureProfile({}).catch(()=>setError(copy('Profile could not be synchronized. Reload to retry.','پرۆفایل هاوتا نەکرا. دووبارە بار بکەرەوە.')));},[ensureProfile,copy]);
 if(!data)return <p>{copy('Loading training records…','بارکردنی تۆمارەکانی ڕاهێنان…')}</p>;
 if(faculty&&data.role==='student')return <p role="status">{copy('Instructor access must be granted by your university administrator.','دەستگەیشتنی مامۆستا دەبێت لەلایەن بەڕێوەبەری زانکۆ بدرێت.')}</p>;
 const launch=async(id:Id<'assignments'>)=>{setBusy(true);try{const attempt=await start({assignmentId:id});navigate('/tools/xray-simulator?attempt='+attempt);}catch{setError(copy('The assignment could not start. Check enrollment, connection and deadline.','ئەرکەکە دەستی پێ نەکرد. تۆماربوون، پەیوەندی و کاتی دیاریکراو بپشکنە.'));}finally{setBusy(false);}};
 return <>
  {data.university&&<p>{language==='ku'?data.university.nameKu:data.university.name}</p>}
  {error&&<p role="alert" className="cg-alert">{error}</p>}
  {faculty&&<FacultyControls data={data}/>}
  <section className="training-section"><h2>{copy('Classes & assignments','پۆل و ئەرکەکان')}</h2>{!data.assignments.length?<p className="training-empty">{copy('No assignments yet. Your instructor will publish reviewed cases here.','هێشتا ئەرک نییە. مامۆستاکەت کەیسە پێداچووەکان لێرە بڵاو دەکاتەوە.')}</p>:<div className="training-rows">{data.assignments.map(a=><div className="training-row" key={a._id}><div><strong>{a.title}</strong><p>{data.cohorts.find(c=>c._id===a.cohortId)?.name} · {copy('Due','کۆتا کات')}: {new Date(a.dueAt).toLocaleString(language==='ku'?'ckb-IQ':'en-GB')}</p></div>{!faculty&&<button disabled={busy} onClick={()=>launch(a._id)}>{copy('Open assignment','کردنەوەی ئەرک')}</button>}</div>)}</div>}</section>
  <section className="training-section"><h2>{faculty?copy('Attempt review','پێداچوونەوەی هەوڵەکان'):copy('Attempts & feedback','هەوڵ و ڕاوبۆچوون')}</h2>{!data.attempts.length?<p className="training-empty">{copy('Completed and draft attempts will appear here.','هەوڵە تەواو و ڕەشنووسەکان لێرە دەردەکەون.')}</p>:<div className="training-rows">{data.attempts.map(a=><div className="training-row" key={a._id}><div><strong>{data.assignments.find(x=>x._id===a.assignmentId)?.title}</strong><p>{faculty?a.userId+' · ':''}{a.status==='draft'?copy('Draft','ڕەشنووس'):a.review?copy('Grade published','نمرە بڵاوکرایەوە'):t('submitted')}{a.review?' · '+a.review.grade+'/100':''}</p>{a.review&&<p className="training-feedback">{a.review.feedback}</p>}</div><button onClick={()=>a.status==='draft'&&!faculty?navigate('/tools/xray-simulator?attempt='+a._id):setReview(a._id)}>{copy('Open record','کردنەوەی تۆمار')}</button></div>)}</div>}</section>
  {review&&<AttemptReview id={review} faculty={faculty} onClose={()=>setReview(null)}/>}
 </>;
}
type Dashboard=NonNullable<ReturnType<typeof useQuery<typeof api.training.dashboard>>>;
function FacultyControls({data}:{data:Dashboard}){
 const {copy,language}=useCopy(),createCohort=useMutation(api.training.createCohort),enroll=useMutation(api.training.enroll),publish=useMutation(api.training.publishCase),assign=useMutation(api.training.assign),setInstructor=useMutation(api.roles.setInstructor),branding=useMutation(api.training.branding);
 const versions=useQuery(api.training.versions,{});
 const [cohort,setCohort]=useState(''),[course,setCourse]=useState(''),[name,setName]=useState(''),[userId,setUserId]=useState(''),[caseId,setCaseId]=useState<CaseId>('outpatient-chest'),[note,setNote]=useState(''),[weights,setWeights]=useState(RUBRIC.map(([criterion,points])=>({criterion,points:Number(points)})));
 const [version,setVersion]=useState(''),[title,setTitle]=useState(''),[due,setDue]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[uni,setUni]=useState(''),[uniKu,setUniKu]=useState('');
 const run=async(task:()=>Promise<unknown>)=>{setBusy(true);setMessage('');try{await task();setMessage(copy('Saved.','پاشەکەوت کرا.'));}catch(e){setMessage(copy('Could not save. Check permissions and required fields.','پاشەکەوت نەکرا. دەسەڵات و خانە پێویستەکان بپشکنە.'));}finally{setBusy(false);}};
 const form=(event:FormEvent,task:()=>Promise<unknown>)=>{event.preventDefault();void run(task);};
 return <section className="training-section">
  <p role="status">{message}</p><FacultyCourses/>{data.role==='admin'&&<ClassFaculty data={data}/>}
  <details><summary>{copy('Classes and enrollment','پۆل و تۆماربوون')}</summary><div className="training-controls">
   <form onSubmit={e=>form(e,()=>createCohort({name,courseId:course as Id<'courses'>}))}>
    <label>{copy('Class name','ناوی پۆل')}<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>{copy('Course','کۆرس')}<select required value={course} onChange={e=>setCourse(e.target.value)}><option value="">{copy('Select a course','کۆرسێک هەڵبژێرە')}</option>{data.courses.map(c=><option key={c._id} value={c._id}>{c.title}</option>)}</select></label>
    <button disabled={busy}>{copy('Create class','دروستکردنی پۆل')}</button>
   </form>
   <form onSubmit={e=>form(e,()=>enroll({cohortId:cohort as Id<'cohorts'>,userId,enrolled:true}))}>
    <label>{copy('Class','پۆل')}<select required value={cohort} onChange={e=>setCohort(e.target.value)}><option value="">{copy('Select a class','پۆلێک هەڵبژێرە')}</option>{data.cohorts.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
    <label>{copy('Student account ID','ناسێنەری هەژماری خوێندکار')}<input required value={userId} onChange={e=>setUserId(e.target.value)}/></label>
    <button disabled={busy}>{copy('Enroll student','تۆمارکردنی خوێندکار')}</button>
    <button type="button" disabled={busy||!cohort||!userId} onClick={()=>run(()=>enroll({cohortId:cohort as Id<'cohorts'>,userId,enrolled:false}))}>{copy('Remove enrollment','لابردنی تۆماربوون')}</button>
   </form>
  </div>{cohort&&<ClassMembers id={cohort as Id<'cohorts'>}/>}</details>
  <details><summary>{copy('Review and publish case & rubric','پێداچوونەوە و بڵاوکردنەوەی کەیس و پێوەر')}</summary><form onSubmit={e=>form(e,()=>publish({caseId,approvalNote:note,weights}))}>
   <label>{copy('Case','کەیس')}<select value={caseId} onChange={e=>setCaseId(e.target.value as CaseId)}>{CLINICAL_CASES.map(c=><option key={c.id} value={c.id}>{getProtocol(c.requested).name}</option>)}</select></label>
   <p>{language==='ku'?CASE_KU[caseId].focus:CLINICAL_CASES.find(c=>c.id===caseId)?.teachingFocus}</p>
   <div className="training-controls">{weights.map((w,i)=><label key={w.criterion}>{LABELS[w.criterion][language==='ku'?1:0]}<input type="number" min="0" max="100" required value={w.points} onChange={e=>setWeights(all=>all.map((x,j)=>i===j?{...x,points:Number(e.target.value)}:x))}/></label>)}</div>
   <label>{copy('Faculty review record: terminology, exercise targets and rubric rationale','تۆماری پێداچوونەوەی مامۆستا: زاراوە، ئامانج و هۆکاری پێوەر')}<textarea required minLength={20} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label>
   <label><span>{copy('I have reviewed this original teaching case and these exercise targets for local use.','ئەم کەیسە فێرکارییە و ئامانجەکانم بۆ بەکارهێنانی ناوخۆ پێداچوونەوە کردووە.')}</span><input type="checkbox" required/></label>
   <button className="cg-primary" disabled={busy||weights.reduce((s,w)=>s+w.points,0)!==100}>{copy('Publish immutable version','بڵاوکردنەوەی وەشانی نەگۆڕ')}</button>
  </form></details>
  <details><summary>{copy('Assign reviewed case','دیاریکردنی کەیسی پێداچوو')}</summary><form onSubmit={e=>form(e,()=>{
   const selected=versions?.find(v=>v._id===version),rubric=selected?.rubrics[0];if(!rubric)throw new Error('Missing rubric');
   return assign({cohortId:cohort as Id<'cohorts'>,caseVersionId:selected!._id,rubricVersionId:rubric._id,title,dueAt:new Date(due).getTime()});
  })}>
   <label>{copy('Class','پۆل')}<select required value={cohort} onChange={e=>setCohort(e.target.value)}><option value="">{copy('Select a class','پۆلێک هەڵبژێرە')}</option>{data.cohorts.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
   <label>{copy('Published case version','وەشانی بڵاوکراوەی کەیس')}<select required value={version} onChange={e=>setVersion(e.target.value)}><option value="">{copy('Select a version','وەشانێک هەڵبژێرە')}</option>{versions?.map(v=><option key={v._id} value={v._id}>{v.caseId} · v{v.version}</option>)}</select></label>
   <label>{copy('Assignment title','ناوی ئەرک')}<input required maxLength={140} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label>{copy('Deadline','کۆتا کات')}<input required type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/></label>
   <button className="cg-primary" disabled={busy}>{copy('Assign to class','دیاریکردن بۆ پۆل')}</button>
  </form></details>
  {data.role==='admin'&&<details><summary>{copy('University administration','بەڕێوەبردنی زانکۆ')}</summary><div className="training-controls"><form onSubmit={e=>form(e,()=>setInstructor({userId,enabled:true}))}><label>{copy('Instructor account ID','ناسێنەری هەژماری مامۆستا')}<input required value={userId} onChange={e=>setUserId(e.target.value)}/></label><button disabled={busy}>{copy('Grant instructor access','پێدانی دەستگەیشتنی مامۆستا')}</button><button type="button" disabled={busy||!userId} onClick={()=>run(()=>setInstructor({userId,enabled:false}))}>{copy('Revoke instructor access','لابردنی دەستگەیشتنی مامۆستا')}</button></form><form onSubmit={e=>form(e,()=>branding({name:uni,nameKu:uniKu}))}><label>{copy('University name (English)','ناوی زانکۆ (ئینگلیزی)')}<input required value={uni} onChange={e=>setUni(e.target.value)}/></label><label>{copy('University name (Sorani)','ناوی زانکۆ (سۆرانی)')}<input required value={uniKu} onChange={e=>setUniKu(e.target.value)}/></label><button disabled={busy}>{copy('Save university name','پاشەکەوتکردنی ناوی زانکۆ')}</button></form></div><Link to="/admin/courses">{copy('Manage course content','بەڕێوەبردنی ناوەڕۆکی کۆرس')}</Link></details>}
 </section>;
}
function ClassMembers({id}:{id:Id<'cohorts'>}){const members=useQuery(api.training.members,{cohortId:id}),{copy}=useCopy();return <div className="training-rows">{members?.length?members.map(m=><div className="training-row" key={m._id}><strong>{m.profile?.fullName??m.userId}</strong><span>{m.userId}</span></div>):<p className="training-empty">{copy('No students enrolled.','هیچ خوێندکارێک تۆمار نەکراوە.')}</p>}</div>;}
function AttemptReview({id,faculty,onClose}:{id:Id<'training_attempts'>;faculty:boolean;onClose:()=>void}){
 const record=useQuery(api.training.getAttempt,{attemptId:id}),publish=useMutation(api.training.publishGrade),{copy,t,language}=useCopy();
 const [grade,setGrade]=useState(''),[feedback,setFeedback]=useState(''),[amendment,setAmendment]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 if(!record)return <Station title={t('review')} onClose={onClose}><p>{copy('Loading evidence…','بارکردنی بەڵگە…')}</p></Station>;
 const session=JSON.parse(record.sessionJson) as ClinicalSession;
 const provisional=record.provisionalJson?JSON.parse(record.provisionalJson) as {score:number;total:number;items:{id:string;earned:number;points:number}[];criticalFailures:string[]}:null;
 const exportRecord=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({purpose:'Synthetic training / not for diagnosis',...record,session},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='instructor-report-'+id+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <Station title={t('review')} description={session.caseSnapshot.name+' · '+session.caseSnapshot.accession} onClose={onClose} wide>
  <p>{copy('Frozen case / rubric version','وەشانی نەگۆڕی کەیس / پێوەر')}: {session.caseVersion} / {session.rubricVersion}</p>
  {session.acquisitions.filter(a=>a.status==='ready').map(a=><section key={a.id}><EvidenceImage attemptId={id} acquisitionId={a.id} session={session}/><p>{t('technique')}: {a.state.kvp} kVp · {calculateMetrics(a.state).mas.toFixed(2)} mAs · {a.state.sid} cm</p><p className="training-feedback">{a.review?.coverage}\n{a.review?.positioning}\n{a.review?.rationale}</p></section>)}
  {provisional&&<><h3>{copy('Provisional exercise result · requires faculty review','ئەنجامی کاتی ڕاهێنان · پێویستی بە پێداچوونەوەی مامۆستا هەیە')}: {provisional.score}/{provisional.total}</h3><div className="training-rows">{provisional.items.map(i=><div className="training-row" key={i.id}><span>{LABELS[i.id]?.[language==='ku'?1:0]??i.id}</span><b>{i.earned}/{i.points}</b></div>)}</div></>}
  <h3>{t('handoff')}</h3><p className="training-feedback">{session.handoff?.explanation}\n{session.handoff?.notes}</p>
  <button onClick={exportRecord}>{t('export')}</button>
  {faculty&&record.status==='submitted'&&<form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await publish({attemptId:id,grade:Number(grade),feedback,amendment});onClose();}catch{setError(copy('Grade could not be published. Check permissions and amendment reason.','نمرە بڵاو نەکرایەوە. دەسەڵات و هۆکاری دەستکاری بپشکنە.'));}finally{setBusy(false);}}}>
   <label>{copy('Faculty grade / 100','نمرەی مامۆستا / ١٠٠')}<input required type="number" min="0" max="100" step=".5" value={grade} onChange={e=>setGrade(e.target.value)}/></label>
   <label>{copy('Feedback to student','ڕاوبۆچوون بۆ خوێندکار')}<textarea required maxLength={5000} value={feedback} onChange={e=>setFeedback(e.target.value)}/></label>
   {!!record.reviews.length&&<label>{copy('Reason for amending the published result','هۆکاری دەستکاری ئەنجامی بڵاوکراوە')}<textarea required minLength={10} value={amendment} onChange={e=>setAmendment(e.target.value)}/></label>}
   {error&&<p role="alert">{error}</p>}<button className="cg-primary" disabled={busy}>{copy('Publish reviewed grade','بڵاوکردنەوەی نمرەی پێداچوو')}</button>
  </form>}
 </Station>;
}
function EvidenceImage({attemptId,acquisitionId,session}:{attemptId:Id<'training_attempts'>;acquisitionId:string;session:ClinicalSession}){
 const evidence=useQuery(api.training.getEvidence,{attemptId,acquisitionId});
 const a=session.acquisitions.find(a=>a.id===acquisitionId);
 const image=useMemo(()=>{if(!evidence||!a)return null;const pixels=new Uint16Array(evidence.pixels),canvas=document.createElement('canvas');renderPixelsToCanvas(pixels,evidence.width,evidence.height,canvas);return{id:a.id,createdAt:a.createdAt,state:a.state,metrics:calculateMetrics(a.state),width:evidence.width,height:evidence.height,pixels,previewUrl:canvas.toDataURL(),warnings:[]};},[evidence,a]);
 return image?<SourceImage image={image}/>:null;
}
function ClassFaculty({data}:{data:Dashboard}){
 const {copy}=useCopy(),save=useMutation(api.training.setCohortInstructors),[id,setId]=useState(''),[ids,setIds]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 return <details><summary>{copy('Assign faculty to classes','دیاریکردنی مامۆستا بۆ پۆلەکان')}</summary><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await save({cohortId:id as Id<'cohorts'>,instructorIds:ids.split(/[\s,]+/).filter(Boolean)});setMessage(copy('Class faculty saved.','مامۆستای پۆل پاشەکەوت کرا.'));}catch{setMessage(copy('Each account must already have instructor access.','هەر هەژمارێک دەبێت پێشتر دەستگەیشتنی مامۆستای هەبێت.'));}finally{setBusy(false);}}}>
  <label>{copy('Class','پۆل')}<select required value={id} onChange={e=>{setId(e.target.value);setIds(data.cohorts.find(c=>c._id===e.target.value)?.instructorIds.join('\n')??'');}}><option value="">{copy('Select a class','پۆلێک هەڵبژێرە')}</option>{data.cohorts.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
  <label>{copy('Instructor account IDs, one per line','ناسێنەرەکانی هەژماری مامۆستا، یەک لە هەر هێڵێک')}<textarea required value={ids} onChange={e=>setIds(e.target.value)}/></label><button disabled={busy}>{copy('Save class faculty','پاشەکەوتکردنی مامۆستای پۆل')}</button><p role="status">{message}</p>
 </form></details>;
}
