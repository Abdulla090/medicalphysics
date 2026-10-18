import { useCallback, useEffect, useRef, useState } from 'react';
import { applySessionAction, pendingAcquisition, SessionError, type ClinicalSession, type SessionAction } from './clinicalSession';
import { AcquisitionEngine } from './acquisition';
import { loadImage, saveDraft, saveImage } from './practiceStore';
import type { CapturedImage } from '../types';

export interface AcademicConnection {
  connected:boolean;
  scope:string;
  reconcile:(session:ClinicalSession)=>Promise<void>;
  upload:(image:CapturedImage)=>Promise<void>;
  submit:(session:ClinicalSession)=>Promise<void>;
  image?:(id:string)=>Promise<CapturedImage|undefined>;
}
export function useClinicalSession(initial:ClinicalSession,academic?:AcademicConnection) {
  const [session,setSession]=useState(initial),current=useRef(initial);
  const [images,setImages]=useState<CapturedImage[]>([]),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  const [online,setOnline]=useState(navigator.onLine),[reconciling,setReconciling]=useState(false);
  const engine=useRef<AcquisitionEngine|null>(null),queue=useRef(Promise.resolve());
  const position=useRef(initial.player),remote=useRef(academic);remote.current=academic;
  const mounted=useRef(true);
  const [saved,setSaved]=useState(false);
  const [storageUnavailable,setStorageUnavailable]=useState(false),[recoveringImage,setRecoveringImage]=useState(false);
  const saveRevision=useRef(0);
  // Practice remains usable in private browsing or when a festival device is full.
  // Assessment still requires durable evidence before progressing.
  const localWrite=useCallback(async(operation:()=>Promise<unknown>)=>{
    try{await operation();return true;}catch(reason){
      if(mounted.current)setStorageUnavailable(true);
      if(remote.current)throw reason;
      return false;
    }
  },[]);
  const persist=useCallback((next:ClinicalSession)=>{
    const revision=++saveRevision.current;
    setSaving(true);setSaved(false);
    const operation=queue.current.catch(()=>undefined).then(async()=>{
      const durable=await localWrite(()=>saveDraft(next,remote.current?.scope??'practice'));
      if(remote.current){if(!navigator.onLine||!remote.current.connected)throw new Error('offline-assessment');await remote.current.reconcile(next);}
      if(mounted.current&&revision===saveRevision.current)setSaved(durable);
    });
    queue.current=operation;
    void operation.then(()=>{if(mounted.current&&revision===saveRevision.current)setSaving(false);},()=>{if(mounted.current&&revision===saveRevision.current){setSaving(false);setError(navigator.onLine?'save-failed':'offline-assessment');}});
    return operation;
  },[localWrite]);
  const commit=useCallback((action:SessionAction,locate=true)=>{
    try{
      const settling=action.type==='processed'||action.type==='cancel';
      if(!settling&&remote.current&&(!navigator.onLine||!remote.current.connected||reconciling||storageUnavailable||error==='save-failed'))throw new SessionError('offline-assessment');
      let next=current.current;const at=Math.max(Date.now(),next.actions.at(-1)?.at??0);
      if(locate&&!pendingAcquisition(next)&&Math.hypot(next.player.x-position.current.x,next.player.z-position.current.z)>.02)next=applySessionAction(next,{type:'location',...position.current},at);
      next=applySessionAction(next,action,at);current.current=next;setSession(next);setError('');
      void persist(next);return next;
    }catch(reason){setError(reason instanceof Error?reason.message:'action-rejected');return null;}
  },[error,persist,reconciling,storageUnavailable]);
  const academicConnected=academic?.connected;
  useEffect(()=>{
    if(academicConnected===undefined)return;
    if(!academicConnected){setError('offline-assessment');return;}
    let active=true;setReconciling(true);
    void queue.current.catch(()=>undefined).then(()=>remote.current?.reconcile(current.current)).then(()=>{if(active)setError('');},()=>{if(active)setError('save-failed');}).finally(()=>{if(active)setReconciling(false);});
    return()=>{active=false;};
  },[academicConnected]);
  useEffect(()=>{
    mounted.current=true;engine.current=new AcquisitionEngine();
    const location=(event:Event)=>{const p=(event as CustomEvent<{x:number;z:number}>).detail;if(Number.isFinite(p?.x)&&Number.isFinite(p?.z))position.current={x:p.x,z:p.z};};
    const offline=()=>{setOnline(false);if(remote.current)setError('offline-assessment');};
    const reconnect=async()=>{setOnline(true);if(!remote.current)return;setReconciling(true);try{await queue.current.catch(()=>undefined);await remote.current.reconcile(current.current);setError('');}catch{setError('save-failed');}finally{setReconciling(false);}};
    window.addEventListener('xray-location',location);window.addEventListener('offline',offline);window.addEventListener('online',reconnect);
    document.documentElement.dataset.clinicalEncounter='active';
    const beforeUnload=(e:BeforeUnloadEvent)=>{if(current.current.actions.length&&current.current.submission==='draft'){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',beforeUnload);
    void Promise.all(initial.acquisitions.filter(a=>a.status==='ready').slice(-8).map(async a=>(await loadImage(initial.id,a.id))??remote.current?.image?.(a.id))).then(items=>{if(mounted.current)setImages(items.filter((i):i is CapturedImage=>!!i));}).catch(()=>setError('image-recovery-failed'));
    // Recover persisted output without rerunning an exposure; otherwise preserve the canceled attempt.
    const pending=pendingAcquisition(initial);
    if(pending)void loadImage(initial.id,pending.id).then(image=>{
      if(!mounted.current||pendingAcquisition(current.current)?.id!==pending.id)return;
      const next=applySessionAction(current.current,image?{type:'processed',id:image.id,width:image.width,height:image.height}:{type:'cancel'});
      current.current=next;setSession(next);if(image)setImages(items=>[image,...items].slice(0,8));void persist(next);
    }).catch(()=>{
      if(!mounted.current)return;
      const next=applySessionAction(current.current,{type:'cancel'});
      current.current=next;setSession(next);void persist(next);setError('image-recovery-failed');
    });
    else void persist(initial);
    return()=>{mounted.current=false;engine.current?.cancel();delete document.documentElement.dataset.clinicalEncounter;void queue.current.then(()=>window.dispatchEvent(new Event('clinical-safe-update'))).catch(()=>undefined);window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('xray-location',location);window.removeEventListener('offline',offline);window.removeEventListener('online',reconnect);};
  },[initial,persist]);
  const acquire=async()=>{
    const id=crypto.randomUUID(),seed=crypto.getRandomValues(new Uint32Array(1))[0];
    const next=commit({type:'expose',id,seed});if(!next)return;
    try{
      await queue.current;
      if(!mounted.current||pendingAcquisition(current.current)?.id!==id)return;
      const image=await engine.current!.acquire(pendingAcquisition(next)!);
      if(!mounted.current||current.current.id!==next.id||pendingAcquisition(current.current)?.id!==id)return;
      await localWrite(()=>saveImage(next.id,image));
      if(!mounted.current||pendingAcquisition(current.current)?.id!==id)return;
      const complete=commit({type:'processed',id,width:image.width,height:image.height},false);if(!complete)return;
      setImages(items=>[image,...items].slice(0,8));
      await queue.current;if(remote.current)await remote.current.upload(image);
    }catch(reason){
      if(!mounted.current||reason instanceof Error&&reason.name==='AbortError')return;
      if(pendingAcquisition(current.current))commit({type:'cancel'},false);
      setError(remote.current?'save-failed':reason instanceof Error?reason.message:'acquisition-failed');
    }
  };
  const uploadEvidence=async()=>{
    if(!remote.current)return;
    for(const acquisition of current.current.acquisitions.filter(a=>a.status==='ready')){
      const image=images.find(i=>i.id===acquisition.id)??await loadImage(current.current.id,acquisition.id)??await remote.current.image?.(acquisition.id);
      if(!image)throw new Error('image-recovery-failed');
      await remote.current.upload(image);
    }
  };
  const retrySave=async()=>{
    setReconciling(true);try{
      await queue.current.catch(()=>undefined);
      for(const image of images)await saveImage(current.current.id,image);
      await saveDraft(current.current,remote.current?.scope??'practice');
      if(remote.current)await remote.current.reconcile(current.current);
      await uploadEvidence();setStorageUnavailable(false);setSaved(true);setError('');
    }catch{if(remote.current)setError('save-failed');else setStorageUnavailable(true);}finally{setReconciling(false);}
  };
  const recoverImages=async()=>{
    setRecoveringImage(true);
    try{
      const records=current.current.acquisitions.filter(a=>a.status==='ready').slice(-8);
      const recovered=await Promise.all(records.map(async a=>images.find(i=>i.id===a.id)??await loadImage(current.current.id,a.id)??await remote.current?.image?.(a.id)));
      if(!mounted.current)return;
      setImages(recovered.filter((i):i is CapturedImage=>!!i));
      setError(recovered.some(i=>!i)?'image-recovery-failed':'');
    }catch{if(mounted.current)setError('image-recovery-failed');}finally{if(mounted.current)setRecoveringImage(false);}
  };
  const submit=async()=>{
    try{
      await queue.current;
      if(remote.current){await uploadEvidence();await remote.current.submit(current.current);}
      const next=applySessionAction(current.current,{type:'submit'});current.current=next;setSession(next);
      const durable=await localWrite(()=>saveDraft(next,remote.current?.scope??'practice'));setSaved(durable);setError('');
    }catch(reason){setError(reason instanceof Error?reason.message:'save-failed');}
  };
  return {session,images,error,saved,saving,online,reconciling,commit,acquire,submit,retrySave,storageUnavailable,recoverImages,recoveringImage,
    paused:!!academic&&(!online||!academic.connected||reconciling||storageUnavailable||error==='save-failed'),
    cancel:()=>{engine.current?.cancel();commit({type:'cancel'},false);},
    player:position,
  };
}
