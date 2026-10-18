import type { CapturedImage } from '../types';
import { createSession, replaySession, type ClinicalSession } from './clinicalSession';
const DB='medicalphysics-practice-v1';
function openDB():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>{request.result.createObjectStore('sessions');request.result.createObjectStore('images');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function access<T>(store:string,mode:IDBTransactionMode,key:string,value?:unknown):Promise<T>{
  const db=await openDB();
  try{return await new Promise<T>((resolve,reject)=>{const tx=db.transaction(store,mode);const req=value===undefined?tx.objectStore(store).get(key):tx.objectStore(store).put(value,key);let result:T;req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
export async function saveDraft(session:ClinicalSession,scope='practice'){
 const db=await openDB();
 try{await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('sessions','readwrite'),store=tx.objectStore('sessions'),read=store.get(scope);
  read.onsuccess=()=>{const previous=read.result?.session as ClinicalSession|undefined;
   // An older encounter's queued write must never replace the new encounter's head.
   if(!previous||previous.id===session.id||previous.createdAt<=session.createdAt)store.put({version:1,session},scope);
  };
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });}finally{db.close();}
}
export async function loadDraft(scope='practice'):Promise<ClinicalSession|null>{
  const data=await access<{version:number;session:ClinicalSession}|undefined>('sessions','readonly',scope);
  if(!data||data.version!==1)return null;
  const s=data.session;
  if(s.mode==='assessment'&&scope==='practice')return null;
  // Replay locally stored actions through the same validator; corrupt drafts never bypass interlocks.
  const initial=createSession(s.id,s.caseId,s.mode,s.createdAt,s.caseVersion,s.rubricVersion);
  initial.caseSnapshot=s.caseSnapshot;
  return replaySession(initial,s.actions);
}
export const saveImage=(sessionId:string,image:CapturedImage)=>access('images','readwrite',sessionId+':'+image.id,image);
export const loadImage=(sessionId:string,id:string)=>access<CapturedImage|undefined>('images','readonly',sessionId+':'+id);
