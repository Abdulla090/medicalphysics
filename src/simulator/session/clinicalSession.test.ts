import { describe,it,expect } from 'vitest';
import { CLINICAL_CASES } from '../clinicalCases';
import { DEFAULT_STATE } from '../protocols';
import { applySessionAction as apply, createSession, replaySession, exposureBlockers } from './clinicalSession';
import { prepareEncounter,completeEncounter } from './sessionTestFixtures';
import { findPatientRoute,patientColliders,pointBlocked } from './patientNavigation';

describe('validated manual clinical encounter',()=>{
 it('calls a waiting patient to the desk before asking name and recording registration',()=>{
  let s=createSession('reception-game');
  expect(s.patientLocation).toBe('waiting');
  expect(s.player.x).toBeGreaterThan(7.25);
  expect(()=>apply(s,{type:'register'})).toThrow('identity-required');
  s=apply(s,{type:'call'});
  expect(s.destination).toBe('reception');
  expect(()=>apply(s,{type:'dialogue',phase:'registration',action:{type:'ask',topic:'name'}})).toThrow('dialogue-unreachable');
  s=apply(s,{type:'arrived',location:'reception'});
  expect(s.destination).toBeNull();
  expect(s.patientLocation).toBe('reception');
  expect(()=>apply(s,{type:'call'})).toThrow('patient-not-ready');
  s=apply(s,{type:'location',x:5.82,z:4.77});
  expect(()=>apply(s,{type:'dialogue',phase:'registration',action:{type:'ask',topic:'name'}})).toThrow('dialogue-unreachable');
 });
 for(const c of CLINICAL_CASES)it('completes and replays '+c.requested,()=>{
  const s=completeEncounter(prepareEncounter(c.id));
  expect(s.stage).toBe('complete');expect(s.submission).toBe('draft');
  const submitted=apply(s,{type:'submit'},1000);
  expect(replaySession(createSession(s.id,c.id,'guided',1),submitted.actions)).toEqual(submitted);
  expect(()=>apply(submitted,{type:'settings',patch:{kvp:80}},1001)).toThrow('submitted-immutable');
  expect(s.acquisitions[0].state.shielded).toBe(true);
 });
 it('never identifies, changes clothes, arms or exposes just because time passed',()=>{
  const start=createSession('manual');expect(()=>apply(start,{type:'register'})).toThrow('identity-required');
  const s=prepareEncounter();const privacy=s.actions.findIndex(e=>e.action.type==='changed');
  const before=replaySession(createSession(s.id,'outpatient-chest','guided',1),s.actions.slice(0,privacy));
  const later=apply(before,{type:'location',x:-2.8,z:4.85},999999);expect(later.changed).toBe(false);expect(later.stage).toBe('changing');
  expect(()=>apply(s,{type:'expose',id:'early',seed:1},1000)).toThrow('exposure-blocked');
 });
 it('holds incomplete screening, closed doors and unreachable interactions',()=>{
  const s=prepareEncounter('abdominal-survey');
  const gown=s.actions.findIndex(e=>e.action.type==='gown');
  const report=s.actions.findIndex(e=>e.action.type==='dialogue'&&e.action.action.type==='respond'&&e.action.action.response==='review-report');
  const before=replaySession(createSession(s.id,s.caseId,'guided',1),s.actions.slice(0,report));
  expect(()=>apply(before,{type:'gown'},1000)).toThrow('preparation-required');expect(report).toBeLessThan(gown);
  expect(()=>apply(createSession('closed'),{type:'door',door:'changing',closed:true})).toThrow('door-unreachable');
 });
 it('uses a fresh breath command, frozen seed and settings, rejects stale completion and supports cancellation',()=>{
  const s=prepareEncounter();let next=apply(s,{type:'prepare'},1000);next=apply(next,{type:'breathe'},1001);
  expect(exposureBlockers(next,14000)).toContain('breathing-required');
  const exposing=apply(next,{type:'expose',id:'a',seed:17},1002);
  expect(()=>apply(exposing,{type:'processed',id:'old',width:32,height:39},1003)).toThrow('stale-acquisition');
  expect(()=>apply(exposing,{type:'settings',patch:{kvp:80}},1003)).toThrow('acquisition-busy');
  const canceled=apply(exposing,{type:'cancel'},1004);
  expect(canceled.acquisitions[0].state).toEqual(exposing.acquisitions[0].state);expect(canceled.acquisitions[0].seed).toBe(17);
  expect(()=>apply(canceled,{type:'processed',id:'a',width:32,height:39},1005)).toThrow('stale-acquisition');
 });
 it('requires deliberate repositioning, review rationale and handoff',()=>{
  const s=prepareEncounter();const i=s.actions.findIndex(e=>e.action.type==='position');const atPosition=replaySession(createSession(s.id,s.caseId,'guided',1),s.actions.slice(0,i-1));
  expect(()=>apply(atPosition,{type:'position'},1000)).toThrow('alignment-required');
  expect(()=>apply(s,{type:'submit'},1000)).toThrow('handoff-required');
  expect(()=>apply(s,{type:'review',id:'x',decision:'accept',coverage:'yes',positioning:'good',rationale:''},1000)).toThrow();
  expect(()=>apply(prepareEncounter('outpatient-chest','assessment'),{type:'hint',topic:'exposure'},1000)).toThrow('assessment-hints-disabled');
 });
 it('cannot forge shield or breath booleans or unknown properties',()=>{
  expect(()=>apply(createSession('forged'),{type:'settings',patch:{shielded:true}} as never)).toThrow();
  expect(()=>apply(createSession('forged'),{type:'location',x:999,z:0})).toThrow();
 });
});
describe('shared department navigation',()=>{
 it('connects the waiting seats to the patient side of the registration counter',()=>{
  const route=findPatientRoute({x:-2.2,z:9.3},{x:5.82,z:4.77},patientColliders(DEFAULT_STATE,false,false));
  expect(route).not.toBeNull();
  expect(route?.at(-1)).toEqual({x:5.82,z:4.77});
 });
 it('routes around walls and furniture, while closed doors block the changing room',()=>{
  const start={x:5.4,z:4.3},end={x:-5.51,z:5.08},colliders=patientColliders(DEFAULT_STATE,false,false);
  const path=findPatientRoute(start,end,colliders);expect(path).not.toBeNull();
  let previous=start;for(const p of path!){for(let i=0;i<=100;i++)expect(pointBlocked({x:previous.x+(p.x-previous.x)*i/100,z:previous.z+(p.z-previous.z)*i/100},colliders)).toBe(false);previous=p;}
  expect(findPatientRoute(start,end,patientColliders(DEFAULT_STATE,true,false))).toBeNull();
 });
});
