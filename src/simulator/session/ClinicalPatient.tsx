import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group } from 'three';
import { PatientModel } from '../PatientModel';
import { ClinicalCharacter } from '../ClinicalCharacter';
import { getSceneGeometry } from '../sceneGeometry';
import { advancePatientRoute, samplePatientPose } from '../patientMotion';
import { findPatientRoute, patientColliders, pointBlocked } from './patientNavigation';
import { DEPARTMENT_ANCHORS } from '../sceneManifest';
import type { ClinicalSession, PatientLocation } from './clinicalSession';
import type { GroundPoint } from '../RoomMovement';

// A seated patient stands up beside the chair before entering the navigation graph.
// The chair footprint itself is an obstacle, so walking must start in the aisle.
const positions:Record<PatientLocation,GroundPoint>={waiting:{x:-2.20,z:9.30},reception:{x:5.82,z:4.77},changing:{x:-5.51,z:5.08},corridor:{x:-2.54,z:4.75},imaging:{x:.65,z:-1.95},exit:{x:DEPARTMENT_ANCHORS.exit[0],z:DEPARTMENT_ANCHORS.exit[2]}};
const receptionOperator={x:7.70,z:4.77};
export function ClinicalPatient({ session, paused, onArrive, onWaiting, collider }: { session:ClinicalSession;paused:boolean;onArrive:(p:PatientLocation)=>void;onWaiting:(waiting:boolean)=>void;collider:MutableRefObject<GroundPoint|null> }) {
  const root=useRef<Group>(null),{invalidate,camera}=useThree();
  const geometry=getSceneGeometry(session.state);
  const locationPoint=session.patientLocation==='imaging'? geometry.supine?{x:.6,z:.5}:{x:geometry.patientPosition[0],z:Math.max(-1.76,geometry.patientPosition[2])}:positions[session.patientLocation];
  const motion=useRef({position:[locationPoint.x,locationPoint.z] as [number,number],path:[] as [number,number][],running:false,time:0});
  const gait=useRef({time:0,running:false});
  const latest=useRef({paused,onArrive,onWaiting,session});latest.current={paused,onArrive,onWaiting,session};
  const waiting=useRef(false),arrival=useRef(false);
  const colliders=useMemo(()=>patientColliders(session.state,session.doors.changing,session.doors.control),[session.state,session.doors.changing,session.doors.control]);
  const patientX=geometry.patientPosition[0],patientZ=geometry.patientPosition[2];
  useEffect(()=>{
    if(!session.destination){motion.current.running=false; motion.current.path=[];return;}
    const end=session.destination==='imaging'?(geometry.supine?{x:.6,z:.5}:{x:patientX,z:Math.max(-1.76,patientZ)}):positions[session.destination];
    const route=findPatientRoute({x:motion.current.position[0],z:motion.current.position[1]},end,colliders);
    motion.current.path=route?.map(p=>[p.x,p.z])??[];
    motion.current.running=!!route;
    arrival.current=false;invalidate();
  },[session.destination,session.doors.changing,session.doors.control,colliders,geometry.supine,patientX,patientZ,invalidate]);
  useEffect(()=>{invalidate();},[paused,invalidate]);
  useFrame((_,delta)=>{
    if(!root.current)return;
    const m=motion.current,l=latest.current;
    root.current.visible=l.session.patientLocation!=='exit'&&(l.session.patientLocation!=='imaging'||!!l.session.destination);
    collider.current=root.current.visible?{x:m.position[0],z:m.position[1]}:null;
    gait.current.running=false;
    const dt=Math.min(.08,delta);
    // Keep route-facing while walking. Once the reception approach is complete,
    // ease the patient's attention toward the radiographer behind the desk.
    const settledAtReception=!m.running&&!m.path.length&&(l.session.patientLocation==='reception'||(arrival.current&&l.session.destination==='reception'));
    if(settledAtReception&&!l.paused){
      const yaw=Math.atan2(receptionOperator.x-m.position[0],receptionOperator.z-m.position[1]);
      const turn=Math.atan2(Math.sin(yaw-root.current.rotation.y),Math.cos(yaw-root.current.rotation.y));
      if(Math.abs(turn)>.002){root.current.rotation.y+=turn*(1-Math.exp(-6*dt));invalidate();}
    }
    if(!l.session.destination||l.paused)return;
    const distance=Math.hypot(camera.position.x-m.position[0],camera.position.z-m.position[1]);
    const path=m.path.map(p=>[...p] as [number,number]);
    // The radiographer walks faster than the patient's base pace. Smoothly
    // increase walking speed while the student leads a few metres ahead, so
    // a normal escorted walk doesn't strand the patient at reception.
    // Truly abandoned patients still wait at the existing 5 m limit.
    const followSpeed=Math.min(2.4,1.24+Math.max(0,distance-1.6)*.4);
    const next=advancePatientRoute(m.position,path,dt*followSpeed);
    const obstructed=pointBlocked({x:next[0],z:next[1]},[...colliders,{kind:'circle',x:camera.position.x,z:camera.position.z,radius:.22}]);
    // During escort the patient waits when the student leaves them behind.
    // A called patient crosses the waiting hall independently to check in.
    // After registration, normal escort pacing and proximity rules apply.
    const summoned=l.session.destination==='reception';
    const stopped=!m.running||obstructed||(!summoned&&distance>5);
    if(stopped!==waiting.current){waiting.current=stopped;l.onWaiting(stopped);}
    if(!stopped){
      const dx=next[0]-m.position[0],dz=next[1]-m.position[1];
      if(Math.hypot(dx,dz)>.001){const yaw=Math.atan2(dx,dz);root.current.rotation.y+=Math.atan2(Math.sin(yaw-root.current.rotation.y),Math.cos(yaw-root.current.rotation.y))*Math.min(1,dt*9);}
      m.position=next;m.path=path;m.time+=dt;
      if(!m.path.length&&!arrival.current){arrival.current=true;m.running=false;l.onArrive(l.session.destination);}
    }
    const pose=samplePatientPose(m.time,!stopped&&m.running);
    gait.current.time=m.time;gait.current.running=!stopped&&m.running;
    root.current.position.set(m.position[0],pose.stepLift*.4,m.position[1]);
    // Keep evaluating proximity while following; React receives only state changes.
    invalidate();
  });
  const seated=session.patientLocation==='waiting'&&!session.destination;
  const appearance=({'chest-pa':0,'chest-lateral':1,'abdomen-ap':2,'chest-ap':4,'pelvis-ap':3} as const)[session.state.protocol];
  return <group ref={root} position={[locationPoint.x,0,locationPoint.z]}>{seated
    ? <group position={[-.40,0,.62]} rotation={[0,Math.PI,0]}><ClinicalCharacter state={{...session.state,anatomy:'surface',arms:'down'}} garment="outpatient" seated appearance={appearance}/></group>
    : <PatientModel state={{...session.state,anatomy:'surface',arms:'down'}} garment={session.changed?'gown':'outpatient'} gait={gait}/>}
  </group>;
}
