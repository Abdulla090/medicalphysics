import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useConvex, useConvexAuth, useConvexConnectionState, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { CLINICAL_CASES, type CaseId } from '../clinicalCases';
import { createSession, type ClinicalSession } from './clinicalSession';
import { loadDraft } from './practiceStore';
import { useClinicalLocale } from './i18n';
import ClinicalGame from './ClinicalGame';
import type { AcademicConnection } from './useClinicalSession';
import { calculateMetrics, renderPixelsToCanvas } from '../physics';

export function PracticeEntry(){
 const [params,setParams]=useSearchParams(),{t}=useClinicalLocale();
 const [initial,setInitial]=useState<ClinicalSession|null>(null),[draft,setDraft]=useState<ClinicalSession|null>(null),[ready,setReady]=useState(false);
 const caseId=CLINICAL_CASES.find(c=>c.id===params.get('case'))?.id??'outpatient-chest';
 const mode=params.get('mode')==='independent'?'independent':'guided';
 useEffect(()=>{
  if(initial&&(!params.has('case')||initial.caseId===caseId)&&initial.mode===mode)return;
  let active=true;
  const prepare=async()=>{
   try{const saved=await loadDraft();if(!active)return;
    if(saved&&saved.mode===mode&&(!params.has('case')||saved.caseId===caseId)&&saved.submission==='draft'&&saved.actions.length){setDraft(saved);setReady(true);return;}
   }catch{/* A corrupt or unavailable local database never bypasses session validation. */}
   if(active){setInitial(createSession(crypto.randomUUID(),caseId,mode));setReady(true);}
  };void prepare();return()=>{active=false;};
 },[caseId,mode,params,initial]);
 const start=(id:CaseId)=>{setDraft(null);setInitial(createSession(crypto.randomUUID(),id,mode));const next=new URLSearchParams(params);next.set('case',id);setParams(next,{replace:true});};
 if(!ready)return <div className="cg-loading">{t('title')}…</div>;
 if(draft&&!initial)return <div className="training-page"><div className="training-intro"><h1>{t('resume')}</h1><p>{draft.caseSnapshot.name} · {draft.caseSnapshot.accession}</p></div><div className="cg-actions"><button className="cg-primary" onClick={()=>{setInitial(draft);setDraft(null);}}>{t('resume')}</button><button onClick={()=>start(caseId)}>{t('fresh')}</button></div></div>;
 return initial?<ClinicalGame key={initial.id} initial={initial} onNew={start} festival={params.has('festival')}/>:null;
}
export function AssessmentEntry({attemptId}:{attemptId:string}){
 const {isAuthenticated,isLoading}=useConvexAuth(),{t}=useClinicalLocale();
 if(isLoading)return <div className="cg-loading">{t('assessment')}…</div>;
 if(!isAuthenticated)return <div className="training-page"><div className="training-intro"><h1>{t('assessment')}</h1><Link to="/auth">{t('training')}</Link></div></div>;
 return <ConnectedAssessment attemptId={attemptId as Id<'training_attempts'>}/>;
}
function ConnectedAssessment({attemptId}:{attemptId:Id<'training_attempts'>}){
 const record=useQuery(api.training.getAttempt,{attemptId}),convex=useConvex(),{t}=useClinicalLocale();
 const connection=useConvexConnectionState();
 const [initial,setInitial]=useState<ClinicalSession|null>(null),[failure,setFailure]=useState('');
 useEffect(()=>{
  if(!record||initial)return;
  let active=true;
  void (async()=>{
   const server=JSON.parse(record.sessionJson) as ClinicalSession;
   let chosen=server;
   try{
    const draft=await loadDraft('assessment:'+record.userId+':'+attemptId);
    if(draft&&draft.id===server.id&&draft.submission==='draft'&&server.submission==='draft'){
     const matches=server.actions.every((event,i)=>JSON.stringify(event)===JSON.stringify(draft.actions[i]));
     if(matches&&draft.actions.length>=server.actions.length)chosen=draft;
    }
   }catch{/* Server record remains authoritative when local recovery fails. */}
   if(active)setInitial(chosen);
  })().catch(()=>{if(active)setFailure(t('retry'));});
  return()=>{active=false;};
 },[record,initial,attemptId,t]);
 const academic=useMemo<AcademicConnection>(()=>({
  connected:connection.isWebSocketConnected,
  scope:'assessment:'+(record?.userId??'')+':'+attemptId,
  reconcile:async session=>{
   const remote=await convex.query(api.training.getAttempt,{attemptId});
   let saved=JSON.parse(remote.sessionJson) as ClinicalSession;
   if(saved.id!==session.id)throw new Error('Session conflict');
   if(remote.status==='submitted'){if(session.submission==='submitted')return;throw new Error('Attempt already submitted');}
   const shared=Math.min(saved.actions.length,session.actions.length);
   for(let i=0;i<shared;i++)if(JSON.stringify(saved.actions[i])!==JSON.stringify(session.actions[i]))throw new Error('Revision conflict');
   // A queued snapshot may precede a later already-acknowledged snapshot.
   if(saved.actions.length>=session.actions.length)return;
   while(saved.actions.length<session.actions.length){
    const events=session.actions.slice(saved.actions.length,saved.actions.length+100);
    const result=await convex.mutation(api.training.appendActions,{attemptId,revision:saved.actions.length,eventsJson:JSON.stringify(events)});
    saved={...saved,actions:session.actions.slice(0,result.revision)};
   }
  },
  upload:async image=>{await convex.mutation(api.training.uploadEvidence,{attemptId,acquisitionId:image.id,width:image.width,height:image.height,pixels:image.pixels.slice().buffer as ArrayBuffer});},
  submit:async session=>{await convex.mutation(api.training.submit,{attemptId,revision:session.actions.length});},
  image:async id=>{
   const e=await convex.query(api.training.getEvidence,{attemptId,acquisitionId:id});
   if(!e)return undefined;
   const session=JSON.parse((await convex.query(api.training.getAttempt,{attemptId})).sessionJson) as ClinicalSession;
   const a=session.acquisitions.find(a=>a.id===id);if(!a)return undefined;
   const pixels=new Uint16Array(e.pixels),canvas=document.createElement('canvas');renderPixelsToCanvas(pixels,e.width,e.height,canvas);
   return{id,createdAt:a.createdAt,state:a.state,metrics:calculateMetrics(a.state),pixels,width:e.width,height:e.height,previewUrl:canvas.toDataURL(),warnings:[],seed:a.seed,engineVersion:a.engineVersion};
  },
 }),[attemptId,convex,record?.userId,connection.isWebSocketConnected]);
 if(failure)return <p role="alert">{failure}</p>;
 if(!initial)return <div className="cg-loading">{t('assessment')}…</div>;
 return <ClinicalGame key={initial.id} initial={initial} academic={academic} onNew={()=>undefined}/>;
}
