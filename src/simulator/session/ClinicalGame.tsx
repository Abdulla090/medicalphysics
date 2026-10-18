import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUp, ArrowDown, ArrowRight, ArrowUpRight, Menu, BookOpen, Volume2, VolumeX } from 'lucide-react';
import { CLINICAL_CASES, type CaseId } from '../clinicalCases';
import { getProtocol } from '../protocols';
import { getWorldTargets, type WorldTargetId } from '../worldInteraction';
import type { WorldAction } from '../WorldInteractions';
import type { SimulatorState } from '../types';
import { EncounterHUD } from './EncounterHUD';
import { playClinicalCue } from '../clinicalAudio';
import { ClinicalPatient } from './ClinicalPatient';
import { FESTIVAL_SKIP_STAGES, isProtected, pendingAcquisition, type ClinicalSession, type SessionAction } from './clinicalSession';
import { FestivalSkipContext } from './festivalSkipContext';
import { useClinicalSession, type AcademicConnection } from './useClinicalSession';
import { EquipmentStation, ExposureStation, GuideStation, HandoffStation, PatientConversation, PositionStation, ReviewStation, Station } from './Workstations';
import { errorText, useClinicalLocale, type CopyKey } from './i18n';
import type { RenderQuality } from './renderQuality';
import { downloadPractice, isPracticeAvailableOffline } from './offlinePractice';
import { ControlGuide, EncounterComplete, FestivalWelcome } from './FestivalExperience';
import { QuestionMarkCircledIcon, EnterFullScreenIcon } from '@radix-ui/react-icons';
import '../simulator.css';
import './clinicalGame.css';

const XrayScene=lazy(()=>import('../XrayScene'));
type Panel='registration'|'preparation'|'position'|'equipment'|'exposure'|'review'|'handoff'|'guide'|'menu'|'privacy'|'help'|'welcome'|'restart'|null;
export default function ClinicalGame({initial,academic,onNew,festival=false}:{initial:ClinicalSession;academic?:AcademicConnection;onNew:(id:CaseId)=>void;festival?:boolean}){
 const model=useClinicalSession(initial,academic),{session:s,commit:send}=model,{t,language,setLanguage,rtl}=useClinicalLocale();
 const [panel,setPanel]=useState<Panel>(festival&&!initial.actions.length?'welcome':null),[hover,setHover]=useState<WorldTargetId|null>(null),[grip,setGrip]=useState(false),[waiting,setWaiting]=useState(false);
 const [audio,setAudio]=useState(false),[quality,setQuality]=useState<RenderQuality>(()=>{try{const saved=localStorage.getItem('radiography-quality');if(saved==='low'||saved==='balanced'||saved==='high')return saved;}catch{/* Storage is optional for practice. */}return matchMedia('(max-width: 700px)').matches?'low':'balanced';});
 const [nextCase,setNextCase]=useState<CaseId>(s.caseId),[hidden,setHidden]=useState(document.hidden),[fullscreen,setFullscreen]=useState(!!document.fullscreenElement);
 const [viewFlags,setViewFlags]=useState({lightField:true,anatomy:'surface' as SimulatorState['anatomy']});
 const [downloaded,setDownloaded]=useState(false),[downloading,setDownloading]=useState(false),[downloadError,setDownloadError]=useState('');
 const [downloadProgress,setDownloadProgress]=useState(0);
 const [hint,setHint]=useState(false);
 const [cameraReset,setCameraReset]=useState(0);
 const roamingPatient=useRef<{x:number;z:number}|null>(null);
 const previousStage=useRef(s.stage),sceneState={...s.state,...viewFlags};
 const busy=!!pendingAcquisition(s),scenePaused=!!panel||model.paused||busy||hidden||s.stage==='complete';
 const scenePatientVisible=s.patientLocation==='imaging'&&!s.destination;
 const [status,setStatus]=useState('');
 const last=s.acquisitions.at(-1),image=model.images.find(i=>i.id===last?.id);
 const nextPatientId=CLINICAL_CASES[(CLINICAL_CASES.findIndex(item=>item.id===s.caseId)+1)%CLINICAL_CASES.length].id;
 const close=()=>setPanel(null);
 const open=useCallback((next:Panel)=>{document.exitPointerLock?.();setPanel(next);},[]);
 useEffect(()=>{
  if(previousStage.current!==s.stage){setHint(false);previousStage.current=s.stage;if(s.stage==='review')open('review');playClinicalCue('confirm',audio);}
 },[s.stage,audio,open]);
 useEffect(()=>{try{localStorage.setItem('radiography-quality',quality);}catch{/* Optional preference. */}},[quality]);
 useEffect(()=>{let active=true;void isPracticeAvailableOffline().then(available=>{if(active)setDownloaded(available);});return()=>{active=false;};},[]);
 useEffect(()=>{
  const visibility=()=>setHidden(document.hidden),screen=()=>setFullscreen(!!document.fullscreenElement);
  document.addEventListener('visibilitychange',visibility);document.addEventListener('fullscreenchange',screen);
  return()=>{document.removeEventListener('visibilitychange',visibility);document.removeEventListener('fullscreenchange',screen);};
 },[]);
 useEffect(()=>{if(!status)return;const id=setTimeout(()=>setStatus(''),4500);return()=>clearTimeout(id);},[status]);
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!panel){event.preventDefault();open('menu');}};
  window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
 },[panel,open]);
 const act=(a:SessionAction)=>{const next=send(a);if(next)playClinicalCue(a.type==='door'?'door':'confirm',audio);return next;};
 const worldAction=(id:WorldTargetId,action:WorldAction)=>{
  if(model.paused||busy)return;
  if(action==='review'){if(s.stage==='review')open('review');return;}
  if(action==='light'){setViewFlags(v=>({...v,lightField:!v.lightField}));return;}
  if(action==='pose'&&s.stage==='position'){act({type:'settings',patch:{arms:s.state.arms==='down'?'hips':s.state.arms==='hips'?'raised':'down'}});return;}
  if(action!=='use')return;
  if(id==='changing-door'&&s.gownHanded&&!s.changed&&s.doors.changing){open('privacy');return;}
  if(id==='changing-door'){act({type:'door',door:'changing',closed:!s.doors.changing});return;}
  if(id==='control-door'||id==='barrier'){act({type:'door',door:'control',closed:!s.doors.control});return;}
  if(id==='hygiene'){act({type:'hygiene'});setStatus(t('hygiene'));return;}
  if(id==='registration'){
   if(s.stage==='registration'&&s.patientLocation==='waiting'&&!s.destination){if(act({type:'call'}))setStatus(t('patientComing'));}
   else if(s.stage==='registration'&&s.patientLocation==='reception'&&!s.destination)open('registration');
   else if(s.patientLocation==='reception'&&!s.destination)act({type:'escort',destination:'changing'});
   return;
  }
  if(id==='changing-booth'){
   if(s.stage==='changing'&&s.patientLocation==='changing'&&!s.gownHanded)open('preparation');
   else if(s.stage==='escort'&&s.patientLocation==='changing'&&!s.destination)act({type:'escort',destination:'corridor'});
   return;
  }
  if(id==='patient-arrival'){
   if(s.patientLocation==='corridor'&&!s.destination)act({type:'escort',destination:'imaging'});
   return;
  }
  if(id==='patient'||id==='table'){
   if(s.stage==='position'&&s.hygiene)open('position');
   else if(s.stage==='handoff')open('handoff');
   else setStatus(t('hygiene'));
   return;
  }
  if(id==='detector'&&s.stage==='equipment'){act({type:'settings',patch:{detectorReady:!s.state.detectorReady}});return;}
  if(id==='tube'&&['equipment','exposure'].includes(s.stage)){open('equipment');return;}
  if(id==='console'){
   if(s.stage==='review')open('review');
   else if(s.stage==='exposure'){
    // Location is sampled at the interaction, never a user-toggleable shield flag.
    const next=send({type:'location',...model.player.current},false);
    if(next&&isProtected(next))open('exposure');else setStatus(t('unprotected'));
   }
   return;
  }
  if(id.startsWith('physics-')){if(s.mode!=='assessment'){act({type:'hint',topic:'physics'});open('guide');}}
 };
 const interactionLabel=(target:WorldTargetId|null=hover):CopyKey|null=>{
  if(!target)return null;
  if(target==='registration')return s.stage==='registration'&&s.patientLocation==='waiting'&&!s.destination?'callPatient':s.registered?(s.patientLocation==='reception'&&!s.destination?'follow':null):s.patientLocation==='reception'&&!s.destination?'registration':null;
  if(target==='changing-door'&&s.gownHanded&&!s.changed&&s.doors.changing)return 'checkReady';
  if(target==='changing-door')return s.doors.changing?'reopen':'shut';
  if(target==='control-door'||target==='barrier')return s.doors.control?'openLead':'closeLead';
  if(target==='changing-booth')return s.stage==='changing'&&s.patientLocation==='changing'&&!s.destination&&!s.gownHanded?'changing':s.stage==='escort'&&s.patientLocation==='changing'&&!s.destination?'follow':null;
  if(target==='patient-arrival')return s.patientLocation==='corridor'&&!s.destination?'escort':null;
  if(target==='hygiene')return s.stage==='position'&&!s.hygiene?'hygiene':null;
  if(target==='patient'||target==='table')return s.stage==='handoff'?'handoff':s.stage==='position'?'position':null;
  if(target==='detector'&&s.stage==='equipment')return 'detector';
  if(target==='tube'&&['equipment','exposure'].includes(s.stage))return 'equipment';
  if(target==='console')return s.stage==='review'?'review':s.stage==='exposure'?'exposure':null;
  if(target.startsWith('physics-')&&s.mode!=='assessment')return 'physics';
  return null;
 };
 const label=interactionLabel();
 const manipulate=(next:SimulatorState)=>{
  if(s.stage==='position'&&s.hygiene)send({type:'settings',patch:{patientOffsetX:next.patientOffsetX,patientOffsetY:next.patientOffsetY,patientRotation:next.patientRotation,arms:next.arms}});
  if(s.stage==='equipment')send({type:'settings',patch:{sid:next.sid,tubeAngle:next.tubeAngle}});
 };
 const exportReport=()=>{
  const report={purpose:'Synthetic training / not for diagnosis',session:s,images:model.images.map(({pixels,previewUrl,...rest})=>({...rest,sourcePixelCount:pixels.length})),validation:'Teaching content and rubric require local faculty approval. Hardware performance not certified.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='radiography-'+s.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const skipStage=FESTIVAL_SKIP_STAGES.find(stage=>stage===s.stage);
 const festivalSkip=!academic&&s.mode!=='assessment'&&s.submission==='draft'&&skipStage?<div className="cg-festival-skip"><button disabled={busy||model.paused} onClick={()=>{
  const next=send({type:'festival-skip',stage:skipStage});
  if(!next)return;
  model.player.current=next.player;setWaiting(false);setCameraReset(value=>value+1);
  open(next.stage==='changing'?'preparation':next.stage==='equipment'?'equipment':next.stage==='exposure'?'exposure':null);
 }}>{t('skipDemo')} · {t(skipStage)}</button><small>{t('demoSkipNote')}</small></div>:null;
 return <FestivalSkipContext.Provider value={festivalSkip}><div className="cg-shell sim-font" dir={rtl?'rtl':'ltr'} lang={rtl?'ckb-IQ':'en'} data-game-stage={s.stage} data-patient-location={s.patientLocation} data-patient-destination={s.destination??''} data-session-id={s.id} data-exposure-state={busy?'exposing':s.prepared?'prepared':'idle'}>
  <header className="cg-header"><Link to="/training" aria-label={t('training')}><ArrowLeft size={20}/><span>medicalphysics</span></Link><div className="cg-header-case"><strong>{getProtocol(s.state.protocol).name}</strong><span>{s.caseSnapshot.accession} · {t(festival?'festival':s.mode)}</span></div><button onClick={()=>open('help')} aria-label={t('controls')}><QuestionMarkCircledIcon width={20} height={20}/></button><button onClick={()=>open('guide')} aria-label={t('guide')}><BookOpen size={20}/></button><button onClick={()=>open('menu')} aria-label={t('pause')}><Menu size={20}/></button></header>
  <main className="cg-room" aria-label={t('title')}>
   <Suspense fallback={<div className="cg-loading">{t('loadingRoom')}…</div>}><XrayScene onInterrupted={()=>{close();setQuality('low');}} roamingPatient={roamingPatient} state={sceneState} view="first-person" cameraReset={cameraReset} initialPosition={model.player.current} exposing={busy} quality={quality}
    onSelect={()=>undefined} registered={s.registered} gownHanded={s.gownHanded} patientPrepared={s.changed} patientInRoom={scenePatientVisible} patientAtImaging={scenePatientVisible} changingDoorClosed={s.doors.changing} hygieneDone={s.hygiene} latestImage={image}
    clinicalActor={<ClinicalPatient key={s.actions.filter(event=>event.action.type==='festival-skip').length} collider={roamingPatient} session={s} paused={scenePaused} onArrive={location=>act({type:'arrived',location:location as 'reception'|'changing'|'corridor'|'imaging'|'exit'})} onWaiting={setWaiting}/>}
    world={{barrierClosed:s.doors.control,changingDoorClosed:s.doors.changing,patientPrepared:s.changed,patientInRoom:scenePatientVisible,registered:s.registered,canManipulatePatient:s.stage==='position'&&s.hygiene,
     interactiveTargets:getWorldTargets(s.state).filter(target=>interactionLabel(target.id)!==null).map(target=>target.id),onHover:setHover,onSelect:()=>undefined,onAction:worldAction,onManipulate:manipulate,onProtectionChange:()=>undefined,onGrip:setGrip,paused:scenePaused}}/></Suspense>
   {!panel&&<>
    {s.stage!=='complete'&&<EncounterHUD session={s} expanded={s.mode==='guided'||hint}/>}
    <div className="cg-festival-controls">{festivalSkip}</div>
    {s.mode==='independent'&&!hint&&<button className="cg-hint" onClick={()=>{act({type:'hint',topic:s.stage});setHint(true);}}>{t('hint')}</button>}
    <div className={'cg-crosshair'+(grip?' holding':label?' available':'')} aria-hidden="true"><i/><i/><i/><i/></div>
    {label&&!model.paused&&<button className="cg-interact" onClick={()=>hover&&worldAction(hover,'use')} aria-label={t(label)} data-world-target={hover}><kbd>E</kbd>{t(label)}<ArrowUpRight size={18}/></button>}
    
    {s.stage==='complete'?<EncounterComplete session={s} saving={model.saving} paused={model.paused} onSave={model.submit} onNext={!academic?()=>onNew(nextPatientId):undefined} onReview={()=>open('guide')} onExport={exportReport}/>:<><WalkControls disabled={model.paused||busy}/><LookControl disabled={model.paused||busy}/><p className="cg-control-caption">{t('instructions')}</p></>}
   </>}
   {(waiting&&s.destination||status||model.error||model.paused)&&<div className="cg-status" role={model.error?'alert':'status'}>{model.error?errorText(model.error,language):model.paused?t('offline'):status||t('waiting')}{(model.error==='save-failed'||model.paused)&&<button onClick={model.retrySave} disabled={!model.online||model.reconciling}>{t('retry')}</button>}</div>}
  </main>
  <footer className="cg-footer"><span>{s.actions.some(event=>event.action.type==='festival-skip')?t('demoEncounter'):t('synthetic')}</span><span>{model.storageUnavailable?t('memoryOnly'):model.saving?t('saving'):model.saved?t('saved'):t(s.mode)}</span></footer>
  {panel==='welcome'&&<FestivalWelcome session={s} onStart={close}/>}
  {panel==='help'&&<Station title={t('controls')} onClose={close}><ControlGuide/><button className="cg-primary" onClick={close}>{t('close')}</button></Station>}
  {panel==='restart'&&<Station title={t('restart')} description={t('restartNote')} onClose={close}><label>{t('projection')}<select value={nextCase} onChange={e=>setNextCase(e.target.value as CaseId)}>{CLINICAL_CASES.map(c=><option key={c.id} value={c.id}>{getProtocol(c.requested).name}</option>)}</select></label><button onClick={exportReport}>{t('export')}</button><div className="cg-actions"><button onClick={close}>{t('keepEncounter')}</button><button className="cg-primary" onClick={()=>onNew(nextCase)}>{t('restart')}</button></div></Station>}
  {panel==='privacy'&&<Station title={t('privacyTopic')} onClose={close}><p>{t('privacyCheck')}</p><button className="cg-primary" onClick={()=>{if(act({type:'changed'}))close();}}>{t('checkReady')}</button></Station>}
  {panel==='registration'&&<PatientConversation session={s} phase="registration" send={send} onClose={close}/>}
  {panel==='preparation'&&<PatientConversation session={s} phase="preparation" send={send} onClose={close}/>}
  {panel==='position'&&<PositionStation session={s} send={send} onClose={close}/>}
  {panel==='equipment'&&<EquipmentStation session={s} send={send} onClose={close}/>}
  {panel==='exposure'&&<ExposureStation session={s} send={send} onClose={close} onExpose={()=>{playClinicalCue('exposure',audio);void model.acquire();}} onCancel={model.cancel}/>}
  {panel==='review'&&<ReviewStation session={s} image={image} send={send} onClose={close} onRecover={model.recoverImages} recovering={model.recoveringImage}/>}
  {panel==='handoff'&&<HandoffStation session={s} send={send} onClose={close}/>}
  {panel==='guide'&&<GuideStation session={s} onClose={close}/>}
  {panel==='menu'&&<Station title={t('pause')} description={s.caseSnapshot.name+' · '+s.caseSnapshot.identifier} onClose={close}>
   <button className="cg-primary" onClick={close}>{t('close')}</button>
   {document.fullscreenEnabled&&<button onClick={()=>{void (document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()).catch(()=>setStatus(t('tryAgain')));}}><EnterFullScreenIcon/>{t(fullscreen?'leaveFullscreen':'fullscreen')}</button>}
   <button onClick={()=>open('help')}>{t('controls')}</button>
   {model.storageUnavailable&&<div className="cg-alert" role="status"><p>{t('storageWarning')}</p><button disabled={model.reconciling} onClick={model.retrySave}>{t('retry')}</button></div>}
   <label>{t('quality')}<select value={quality} onChange={e=>setQuality(e.target.value as RenderQuality)}>{(['low','balanced','high']as const).map(v=><option key={v} value={v}>{t(v)}</option>)}</select></label>
   <label>English / کوردی<select value={language} onChange={e=>setLanguage(e.target.value as 'en'|'ku')}><option value="en">English</option><option value="ku">کوردی · سۆرانی</option></select></label>
   <button aria-pressed={audio} onClick={()=>setAudio(x=>!x)}>{audio?<Volume2 size={18}/>:<VolumeX size={18}/>} {t('audio')} · {t(audio?'on':'off')}</button>
   {s.mode!=='assessment'&&<><label>{t('beam')}<input type="checkbox" checked={viewFlags.lightField} onChange={e=>setViewFlags(v=>({...v,lightField:e.target.checked}))}/></label><label>{t('anatomy')}<select value={viewFlags.anatomy} onChange={e=>setViewFlags(v=>({...v,anatomy:e.target.value as SimulatorState['anatomy']}))}>{(['surface','skeleton','organs']as const).map(v=><option key={v} value={v}>{t(v)}</option>)}</select></label></>}
   <button onClick={exportReport}>{t('export')}</button>
   <button disabled={downloading||downloaded} onClick={async()=>{setDownloading(true);setDownloadError('');try{await downloadPractice((done,total)=>setDownloadProgress(Math.round(done/total*100)));setDownloaded(true);}catch{setDownloadError(t('downloadFailed'));}finally{setDownloading(false);}}}>{t(downloaded?'downloaded':'download')}{downloading?' · '+downloadProgress+'%':''}</button>{downloadError&&<p role="alert">{downloadError}</p>}
   {!academic&&<button onClick={()=>{setNextCase(s.caseId);open('restart');}}>{t('restart')}</button>}
   <Link to="/training">{t('training')}</Link>
  </Station>}
 </div></FestivalSkipContext.Provider>;
}
function WalkControls({disabled}:{disabled:boolean}){
 const {t}=useClinicalLocale();
 const send=(direction:string,pressed:boolean)=>window.dispatchEvent(new CustomEvent('xray-walk',{detail:{direction,pressed}}));
 return <div className="cg-walk" dir="ltr" aria-label={t('move')}>{([['forward',ArrowUp],['left',ArrowLeft],['backward',ArrowDown],['right',ArrowRight]]as const).map(([direction,Icon])=><button key={direction} disabled={disabled} className={'cg-walk-'+direction} aria-label={t(direction)} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);send(direction,true);}} onPointerUp={e=>{send(direction,false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>send(direction,false)} onLostPointerCapture={()=>send(direction,false)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();send(direction,true);}}} onKeyUp={()=>send(direction,false)} onBlur={()=>send(direction,false)}><Icon size={20}/></button>)}</div>;
}
function LookControl({disabled}:{disabled:boolean}){
 const {t}=useClinicalLocale(),pointer=useRef<{id:number;x:number;y:number}|null>(null);
 const turn=(dx:number,dy:number)=>window.dispatchEvent(new CustomEvent('xray-look',{detail:{dx,dy}}));
 return <button className="cg-look" dir="ltr" aria-label={t('look')} disabled={disabled}
  onPointerDown={e=>{e.preventDefault();pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}
  onPointerMove={e=>{const p=pointer.current;if(!p||p.id!==e.pointerId)return;turn(e.clientX-p.x,e.clientY-p.y);pointer.current={id:p.id,x:e.clientX,y:e.clientY};}}
  onPointerUp={e=>{pointer.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
  onLostPointerCapture={()=>{pointer.current=null;}} onPointerCancel={()=>{pointer.current=null;}}
  onKeyDown={e=>{const directions:Record<string,[number,number]>={ArrowLeft:[-25,0],ArrowRight:[25,0],ArrowUp:[0,-25],ArrowDown:[0,25]};if(directions[e.key]){e.preventDefault();turn(...directions[e.key]);}}}>
  <span aria-hidden="true">+</span><span>{t('look')}</span>
 </button>;
}
