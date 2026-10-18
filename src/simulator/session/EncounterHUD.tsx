import { useEffect, useState } from 'react';
import { ArrowUp, Map, X } from 'lucide-react';
import { ARCHITECTURE_COLLIDERS } from '../sceneManifest';
import { encounterTask, guidanceRoute } from './encounterGuidance';
import type { ClinicalSession } from './clinicalSession';
import { STAGES, useClinicalLocale } from './i18n';

export function EncounterHUD({session,expanded}:{session:ClinicalSession;expanded:boolean}){
 const {t,language}=useClinicalLocale(),[player,setPlayer]=useState({...session.player,yaw:0}),[map,setMap]=useState(false);
 useEffect(()=>{const changed=(e:Event)=>setPlayer((e as CustomEvent<typeof player>).detail);window.addEventListener('xray-location',changed);return()=>window.removeEventListener('xray-location',changed);},[]);
 const task=encounterTask(session),route=task.target?guidanceRoute(player,task.target):[],next=route[0];
 const yaw=next?Math.atan2(-(next.x-player.x),-(next.z-player.z)):0;
 let distance=0,previous=player;for(const point of route){distance+=Math.hypot(point.x-previous.x,point.z-previous.z);previous={...player,...point};}
 const index=STAGES.indexOf(session.stage),isKu=language==='ku';
 const mapLabel=isKu?'نەخشەی بەش':'Department map';
 return <>
  <section className="cg-objective" aria-label={t('guide')}>
   <div className="cg-objective-meta"><span>{t(session.stage)}</span><span dir="ltr">{String(index+1).padStart(2,'0')} / 09</span></div>
   <div className="cg-progress" aria-hidden="true">{STAGES.map((stage,i)=><i key={stage} className={i<index?'done':i===index?'current':''}/>)}</div>
   <div key={task.title} className="cg-task-copy"><h1>{expanded?t(task.title):t(session.stage)}</h1>{expanded&&<p>{task.detail[isKu?1:0]}</p>}</div>
   {expanded&&next&&<div className="cg-waypoint"><span className="cg-direction" dir="ltr"><ArrowUp size={19} style={{transform:`rotate(${yaw-player.yaw}rad)`}}/></span><span>{t(task.zone)}<small dir="ltr">{distance.toFixed(1)} m</small></span></div>}
  </section>
  <aside className={'cg-map'+(map?' expanded':'')}>
   <button aria-label={mapLabel} aria-expanded={map} onClick={()=>setMap(v=>!v)}>{map?<X size={17}/>:<Map size={17}/>}<span>{mapLabel}</span></button>
   {map&&<div className="cg-map-content"><svg viewBox="-7 -4 16 17" role="img" aria-label={mapLabel}>
    <path d="M-6.6 3.25H-3.4V-3.25H6.8V3.25H8.4V12.25H1V10.5H-3.4V6.25H-6.6Z" fill="#344b48"/>
    <g stroke="#adbbb4" strokeWidth=".075">{ARCHITECTURE_COLLIDERS.map((wall,i)=>wall.kind==='box'?<path key={i} d={`M${wall.minX} ${wall.minZ}L${wall.maxX} ${wall.maxZ}`}/>:null)}</g>
    <g fill="#dce5dc" fontSize=".39" textAnchor="middle"><text x="0" y="-.7">01</text><text x="5" y="-.7">02</text><text x="-5" y="4.7">03</text><text x="-1.2" y="8.7">04</text><text x="7.1" y="4.7">05</text></g>
    {expanded&&next&&<polyline points={[player,...route].map(p=>`${p.x},${p.z}`).join(' ')} fill="none" stroke="#f0d2a0" strokeWidth=".07" strokeDasharray=".16 .13"/>}
    {expanded&&task.target&&<circle cx={task.target.x} cy={task.target.z} r=".17" fill="#f0d2a0"/>}
    <g transform={`translate(${player.x} ${player.z}) rotate(${-player.yaw*180/Math.PI})`}><path d="M0 -.34L-.2 .23L0 .13L.2 .23Z" fill="#fff"/></g>
   </svg><p dir={isKu?'rtl':'ltr'}>01 {t('imaging')} · 02 {t('control')}<br/>03 {t('changingRoom')} · 04 {isKu?'چاوەڕوانی':'Waiting'} · 05 {t('reception')}</p></div>}
  </aside>
 </>;
}
