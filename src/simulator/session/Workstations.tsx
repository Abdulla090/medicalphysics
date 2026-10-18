import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { FestivalSkipContext } from './festivalSkipContext';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ArrowUpRight, Check, Minus, Plus } from 'lucide-react';
import { getDialogueReadiness, PREPARATION_TOPICS, REGISTRATION_TOPICS, type DialogueAction, type DialogueTopic } from '../clinicalDialogue';
import { calculateMetrics, renderPixelsToCanvas } from '../physics';
import { getProtocol } from '../protocols';
import type { CapturedImage, SimulatorState } from '../types';
import { pendingAcquisition, positioningChecks, provisionalAssessment, type ClinicalSession, type SessionAction } from './clinicalSession';
import { CASE_KU, COPY, OBJECTIVES, patientReply, useClinicalLocale, type CopyKey } from './i18n';
import { EncounterLearning } from './EncounterLearning';
import { TechniqueGuide } from '../TechniqueGuide';

type Send=(action:SessionAction)=>ClinicalSession|null;
export function Station({title,description,children,onClose,wide=false,className='',shortcuts=false}:{title:string;description?:string;children:ReactNode;onClose:()=>void;wide?:boolean;className?:string;shortcuts?:boolean}){
 const {rtl,t}=useClinicalLocale();
 const festivalSkip=useContext(FestivalSkipContext);
 return <Dialog.Root open onOpenChange={value=>{if(!value)onClose();}}><Dialog.Portal><Dialog.Overlay className="cg-overlay"/><Dialog.Content dir={rtl?'rtl':'ltr'} className={'cg-station sim-font'+(wide?' cg-wide':'')+' '+className} onCloseAutoFocus={event=>{event.preventDefault();document.querySelector<HTMLCanvasElement>('.sim-three-room canvas')?.focus();}}>
  <header><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description className={description?'':'sr-only'}>{description||t('title')}</Dialog.Description></div><Dialog.Close aria-label={t('closePanel')}><X size={20}/></Dialog.Close></header>
  <div className="cg-station-body">{children}{shortcuts&&festivalSkip}</div>
 </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function PatientConversation({session,phase,send,onClose}:{session:ClinicalSession;phase:'registration'|'preparation';send:Send;onClose:()=>void}){
 const {t,language}=useClinicalLocale(),c=session.caseSnapshot;
 const d=phase==='registration'?session.registration:session.preparationDialogue,ready=getDialogueReadiness(c,d);
 const [name,setName]=useState(d.typedName),[identifier,setIdentifier]=useState(d.typedIdentifier),[last,setLast]=useState<DialogueAction|null>(null);
 const act=(action:DialogueAction)=>{if(send({type:'dialogue',phase,action}))setLast(action);};
 const topics=phase==='registration'?REGISTRATION_TOPICS:PREPARATION_TOPICS;
 const topicLabel=(topic:DialogueTopic)=>t(topic==='privacy'?'privacyTopic':topic==='breathing'?'breathing':topic);
 return <Station title={t(phase==='registration'?'registration':'changing')} description={c.accession+' · '+getProtocol(c.requested).name} onClose={onClose} shortcuts>
  <div className="cg-referral"><span>{t('case')}</span><strong>{c.name}</strong><p>{language==='ku'?CASE_KU[c.id].indication:c.indication}</p></div>
  <div className="cg-conversation" aria-live="polite"><span>{c.name}</span><p>{last?patientReply(last,c,language):language==='ku'?'سڵاو. ئامادەم بۆ گفتوگۆ دەربارەی پشکنینەکەم.':'Hello. I am ready to talk about my examination.'}</p></div>
  {phase==='registration'?<>
   {d.nameVerified?<p className="cg-verified"><Check size={15}/><span>{d.typedName}</span><small>{t('verified')}</small></p>:d.asked.includes('name')&&<form onSubmit={event=>{event.preventDefault();act({type:'transcribe',field:'name',value:name});}}><label>{t('transcribeName')}<input value={name} maxLength={120} onChange={e=>setName(e.target.value)} autoComplete="off"/></label><button type="submit">{t('verify')}</button><span role="status">{d.nameVerified?t('verified'):d.typedName?t('unmatched'):''}</span></form>}
   {d.identifierVerified?<p className="cg-verified"><Check size={15}/><span dir="ltr">{d.typedIdentifier}</span><small>{t('verified')}</small></p>:d.asked.includes('identifier')&&<form onSubmit={event=>{event.preventDefault();act({type:'transcribe',field:'identifier',value:identifier});}}><label>{t('transcribeId')}<input dir="ltr" value={identifier} maxLength={120} onChange={e=>setIdentifier(e.target.value)} autoComplete="off"/></label><button type="submit">{t('verify')}</button><span role="status">{d.identifierVerified?t('verified'):d.typedIdentifier?t('unmatched'):''}</span></form>}
  </>:<div className="cg-question-list">
   {d.metalsReviewed&&!d.metalsRemoved&&<button onClick={()=>act({type:'respond',response:'remove-metals'})}>{t('removeMetals')}</button>}
   {d.mobilityReviewed&&!d.mobilityAssisted&&<button onClick={()=>act({type:'respond',response:'assist-mobility'})}>{t('assist')}</button>}
   <button onClick={()=>act({type:'respond',response:'reassure'})}>{t('reassure')}</button>
   {d.pregnancy==='hold'&&!d.clinicianReferred&&<button onClick={()=>act({type:'respond',response:'refer-clinician'})}>{t('refer')}</button>}
   {d.pregnancy==='hold'&&d.clinicianReferred&&<button onClick={()=>act({type:'respond',response:'review-report'})}>{t('report')}</button>}
  </div>}
  <div className="cg-question-list">{topics.filter(topic=>!d.asked.includes(topic)).map((topic,index)=><button className={index===0?'cg-next-question':''} key={topic} onClick={()=>act({type:'ask',topic})}>{topicLabel(topic)}<ArrowUpRight size={16}/></button>)}</div>
  {d.asked.length>0&&<details className="cg-conversation-history"><summary>{language==='ku'?'گفتوگۆکانی پێشوو':'Previous conversation'} <span dir="ltr">{d.asked.length}</span></summary><div className="cg-question-list">{topics.filter(topic=>d.asked.includes(topic)).map(topic=><button key={topic} onClick={()=>act({type:'ask',topic})}>{topicLabel(topic)}<Check size={16}/></button>)}</div></details>}
  {ready.safetyHold&&<p className="cg-alert" role="alert">{t('safetyHold')}</p>}
  <p className="cg-note" role="status">{ready.ready?t('ready'):t('needed')} <b dir="ltr">{ready.complete}/{ready.total}</b></p>
  <button className="cg-primary" disabled={!ready.ready} onClick={()=>{const next=send({type:phase==='registration'?'register':'gown'});if(next)onClose();}}>{t(phase==='registration'?'register':'gown')}</button>
 </Station>;
}
const DIALS=[
 ['patientOffsetX','offsetX',-15,15,.5,'cm'],['patientOffsetY','offsetY',-15,15,.5,'cm'],['patientRotation','rotation',-45,45,1,'°'],
 ['kvp','kvp',40,150,1,'kVp'],['ma','ma',25,500,25,'mA'],['exposureMs','exposureMs',1,500,1,'ms'],
 ['sid','sid',80,200,1,'cm'],['tubeAngle','tubeAngle',-30,30,1,'°'],['collimationWidth','collimationWidth',8,35,1,'cm'],['collimationHeight','collimationHeight',8,43,1,'cm'],
] as const;
export function PrecisionControls({state,kind,onChange}:{state:SimulatorState;kind:'patient'|'equipment';onChange:(patch:Partial<SimulatorState>)=>void}){
 const {t}=useClinicalLocale();
 return <div className="cg-precision">
  {DIALS.filter((_,i)=>kind==='patient'?i<3:i>=3).map(([key,label,min,max,step,unit])=><label key={key}>{t(label)}<span className="cg-dial" dir="ltr">
   <button aria-label={t(label)+' −'} onClick={()=>onChange({[key]:Math.max(min,Number((state[key]-step).toFixed(2)))})}><Minus size={16}/></button>
   <input aria-label={t(label)} type="number" inputMode="decimal" min={min} max={max} step={step} value={state[key]} onChange={e=>{if(e.target.value!==''&&Number.isFinite(e.target.valueAsNumber))onChange({[key]:Math.max(min,Math.min(max,e.target.valueAsNumber))});}}/>
   <span>{unit}</span><button aria-label={t(label)+' +'} onClick={()=>onChange({[key]:Math.min(max,Number((state[key]+step).toFixed(2)))})}><Plus size={16}/></button>
  </span></label>)}
  {kind==='patient'?<label>{t('arms')}<select value={state.arms} onChange={e=>onChange({arms:e.target.value as SimulatorState['arms']})}>{(['down','hips','raised']as const).map(a=><option key={a} value={a}>{t(a)}</option>)}</select></label>:<>
   <label>{t('grid')}<input type="checkbox" checked={state.grid} onChange={e=>onChange({grid:e.target.checked})}/></label>
   <label>{t('focalSpot')}<select dir="ltr" value={state.focalSpot} onChange={e=>onChange({focalSpot:Number(e.target.value)})}><option value=".6">0.6 mm</option><option value="1.2">1.2 mm</option></select></label>
  </>}
 </div>;
}
export function PositionStation({session,send,onClose}:{session:ClinicalSession;send:Send;onClose:()=>void}){
 const {t,language}=useClinicalLocale();
 const aligned=positioningChecks(session.state).every(c=>c.passed);
 return <Station title={t('position')} description={t('manual')} onClose={onClose} shortcuts>
  <PrecisionControls state={session.state} kind="patient" onChange={patch=>send({type:'settings',patch})}/>
  <ul className="cg-setup-checks" aria-label={t('setupChecks')}>{positioningChecks(session.state).map(c=><li key={c.id} data-passed={c.passed}><span aria-hidden="true">{c.passed?<Check size={16}/>:<Minus size={16}/>}</span>{t(c.id==='centering'?'centerCheck':c.id==='rotation'?'rotationCheck':'armsCheck')}<span>{c.passed?t('ready'):t('correctSetup')}</span></li>)}</ul>
  <TechniqueGuide state={session.state} clinicalCase={session.caseSnapshot} language={language} />
  <p className="cg-note">{t('practiceOnly')}</p>
  <button className="cg-primary" disabled={!aligned} onClick={()=>{if(send({type:'position'}))onClose();}}>{t('centered')}</button>
 </Station>;
}
export function EquipmentStation({session,send,onClose}:{session:ClinicalSession;send:Send;onClose:()=>void}){
 const {t,language}=useClinicalLocale();
 return <Station title={t('equipment')} onClose={onClose} shortcuts><PrecisionControls state={session.state} kind="equipment" onChange={patch=>send({type:'settings',patch})}/>
  <TechniqueGuide state={session.state} clinicalCase={session.caseSnapshot} language={language} />
  <p role="status">{session.state.detectorReady?t('detectorReady'):t('detector')}</p>
  <button className="cg-primary" disabled={!session.state.detectorReady||!session.positionConfirmed} onClick={()=>{if(send({type:'equipment'}))onClose();}}>{t('confirmEquipment')}</button>
 </Station>;
}
export function ExposureStation({session,send,onClose,onExpose,onCancel}:{session:ClinicalSession;send:Send;onClose:()=>void;onExpose:()=>void;onCancel:()=>void}){
 const {t,language}=useClinicalLocale(),[now,setNow]=useState(Date.now());
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(id);},[]);
 const busy=!!pendingAcquisition(session),holding=session.breathUntil>now;
 return <Station title={t('exposure')} description={getProtocol(session.state.protocol).name} onClose={onClose}>
  <dl className="cg-technique" dir="ltr"><div><dt>kVp</dt><dd>{session.state.kvp}</dd></div><div><dt>mAs</dt><dd>{calculateMetrics(session.state).mas.toFixed(2)}</dd></div><div><dt>SID</dt><dd>{session.state.sid} cm</dd></div></dl>
  <TechniqueGuide state={session.state} clinicalCase={session.caseSnapshot} language={language} />
  <p className="cg-breath-status" role="status">{busy?t('acquiring'):holding?t('hold')+' · '+Math.ceil((session.breathUntil-now)/1000)+' s':session.breathUntil?t('breathExpired'):t('exposureReady')}</p>
  {busy?<><p>{t('acquiring')}</p><button onClick={onCancel}>{t('cancel')}</button></>:<>
   <button className={session.prepared?'':'cg-primary'} disabled={session.prepared} onClick={()=>send({type:'prepare'})}>{t('prepare')}</button>
   <button disabled={!session.prepared} onClick={()=>send({type:'breathe'})}>{t('breathe')}</button>
   <button className={session.prepared?'cg-primary':''} disabled={!session.prepared||!holding} onClick={onExpose}>{t('expose')}</button>
  </>}
 </Station>;
}
export function SourceImage({image}:{image:CapturedImage}){
 const canvas=useRef<HTMLCanvasElement>(null),{t}=useClinicalLocale();
 const [center,setCenter]=useState(.46),[width,setWidth]=useState(.86),[invert,setInvert]=useState(false),[zoom,setZoom]=useState(1);
 useEffect(()=>{if(canvas.current)renderPixelsToCanvas(image.pixels,image.width,image.height,canvas.current,center,width,invert);},[image,center,width,invert]);
 const exportPng=()=>{
  const output=document.createElement('canvas');output.width=image.width;output.height=image.height+54;
  const ctx=output.getContext('2d')!;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,output.width,output.height);ctx.drawImage(canvas.current!,0,0);
  ctx.fillStyle='#152d25';ctx.font='12px sans-serif';ctx.fillText('SYNTHETIC TRAINING / NOT FOR DIAGNOSIS',12,image.height+20);ctx.fillText(getProtocol(image.state.protocol).name+' · '+image.state.kvp+' kVp · '+image.metrics.mas.toFixed(2)+' mAs',12,image.height+40);
  const link=document.createElement('a');link.download='synthetic-'+image.id+'.png';link.href=output.toDataURL();link.click();
 };
 return <div className="cg-source-image"><div dir="ltr" className="cg-film"><div className="cg-film-pan" tabIndex={0} aria-label={t('zoom')}><div style={{width:zoom*100+'%'}}><canvas ref={canvas} aria-label={t('synthetic')+' · '+getProtocol(image.state.protocol).name}/></div></div><span className="cg-film-label">SYNTHETIC · {getProtocol(image.state.protocol).name}</span></div>
  <div className="cg-image-controls"><label>{t('level')}<input dir="ltr" type="range" min=".05" max=".95" step=".01" value={center} onChange={e=>setCenter(Number(e.target.value))}/></label><label>{t('window')}<input dir="ltr" type="range" min=".1" max="1.8" step=".01" value={width} onChange={e=>setWidth(Number(e.target.value))}/></label><button aria-pressed={invert} onClick={()=>setInvert(x=>!x)}>{t('invert')}</button><button onClick={exportPng}>{t('png')}</button></div>
  <div className="cg-image-controls"><label>{t('zoom')}<input dir="ltr" type="range" min="1" max="3" step=".25" value={zoom} onChange={e=>setZoom(+e.target.value)}/><output dir="ltr">{zoom.toFixed(2)}×</output></label><button onClick={()=>{setZoom(1);setCenter(.46);setWidth(.86);setInvert(false);}}>{t('resetDisplay')}</button></div>
 </div>;
}
export function ReviewStation({session,image,send,onClose,onRecover,recovering=false}:{session:ClinicalSession;image?:CapturedImage;send:Send;onClose:()=>void;onRecover?:()=>void;recovering?:boolean}){
 const {t}=useClinicalLocale(),[coverage,setCoverage]=useState(''),[positioning,setPositioning]=useState(''),[rationale,setRationale]=useState('');
 const valid=coverage.trim().length>=5&&positioning.trim().length>=5&&rationale.trim().length>=10;
 const review=(decision:'accept'|'repeat')=>{if(image&&send({type:'review',id:image.id,decision,coverage,positioning,rationale}))onClose();};
 return <Station title={t('review')} description={t('reviewNote')} onClose={onClose} wide className="cg-review-station">
  {image?<SourceImage image={image}/>:<div className="cg-image-missing" role="alert"><p>{t('imageMissing')}</p><button disabled={recovering} onClick={onRecover}>{t('retryImage')}</button></div>}
  <div className="cg-review-notes">
  <label>{t('coverage')}<textarea value={coverage} maxLength={1500} onChange={e=>setCoverage(e.target.value)}/></label>
  <label>{t('positioning')}<textarea value={positioning} maxLength={1500} onChange={e=>setPositioning(e.target.value)}/></label>
  <label>{t('rationale')}<textarea value={rationale} maxLength={3000} onChange={e=>setRationale(e.target.value)}/></label>
  <div className="cg-actions"><button disabled={!valid||!image} onClick={()=>review('repeat')}>{t('repeat')}</button><button className="cg-primary" disabled={!valid||!image||session.stage!=='review'} onClick={()=>review('accept')}>{t('accept')}</button></div>
  </div>
 </Station>;
}
export function HandoffStation({session,send,onClose}:{session:ClinicalSession;send:Send;onClose:()=>void}){
 const {t}=useClinicalLocale(),[explanation,setExplanation]=useState(session.handoff?.explanation??''),[notes,setNotes]=useState(session.handoff?.notes??'');
 return <Station title={t('handoff')} onClose={onClose}>
  <p>{t('synthetic')}</p><label>{t('explanation')}<textarea maxLength={2000} value={explanation} onChange={e=>setExplanation(e.target.value)}/></label>
  <label>{t('notes')}<textarea maxLength={3000} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
  <button className="cg-primary" disabled={explanation.trim().length<10||notes.trim().length<10} onClick={()=>{if(send({type:'handoff',explanation,notes})){send({type:'escort',destination:'exit'});onClose();}}}>{t('discharge')}</button>
 </Station>;
}
export function GuideStation({session,onClose}:{session:ClinicalSession;onClose:()=>void}){
 const {t,language}=useClinicalLocale();
 const after=session.submission==='submitted'||session.mode!=='assessment';
 const demo=session.actions.some(e=>e.action.type==='festival-skip');
 const assessed=!demo&&session.acquisitions.some(a=>a.review?.decision==='accept')&&after?provisionalAssessment(session):null;
 return <Station title={t('guide')} onClose={onClose}>
  <h3>{t(session.stage)}</h3><p>{OBJECTIVES[session.stage][language==='ku'?1:0]}</p>
  {demo&&<p className="cg-note">{t('demoEncounter')}</p>}
  {after&&<><p>{language==='ku'?CASE_KU[session.caseId].focus:session.caseSnapshot.teachingFocus}</p>
   <EncounterLearning session={session}/>
   <p className="cg-note">{t('practiceOnly')}</p>
  </>}
  {assessed&&<><h3>{t('debrief')}</h3><strong dir="ltr">{assessed.score}/{assessed.total}</strong><p>{t('practiceOnly')}</p></>}
  <h3>{t('timeline')}</h3><ol className="cg-timeline">{session.actions.filter(e=>e.action.type!=='location'&&e.action.type!=='settings').slice(-80).map(e=><li key={e.seq}><time dir="ltr">{new Date(e.at).toLocaleTimeString(language==='ku'?'ckb-IQ':'en-GB',{hour:'2-digit',minute:'2-digit'})}</time><span>{e.action.type==='festival-skip'?t('skipDemo')+' · '+t(e.action.stage):t(actionLabel(e.action.type))}</span></li>)}</ol>
  <a href="https://www.iaea.org/publications/8841/diagnostic-radiology-physics" target="_blank" rel="noreferrer">IAEA · Diagnostic Radiology Physics</a>
 </Station>;
}
function actionLabel(type:SessionAction['type']):CopyKey {
 const mapping:Partial<Record<SessionAction['type'],CopyKey>>={dialogue:'changing',register:'registration',escort:'escort',arrived:'escort',door:'privacyTopic',location:'move',gown:'gown',changed:'changing',hygiene:'hygiene',settings:'technique',position:'position',equipment:'equipment',prepare:'prepare',breathe:'breathing',expose:'exposure',processed:'review',cancel:'cancel',review:'review',handoff:'handoff',hint:'hint',submit:'submit'};
 return mapping[type]??'case';
}
