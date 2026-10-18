import { describe,it,expect } from 'vitest';
import { createSession } from './clinicalSession';
import { encounterTask,guidanceRoute } from './encounterGuidance';

describe('one next physical action',()=>{
 it('distinguishes invitation, escort, preparation and privacy',()=>{
  const s={...createSession('guidance'),stage:'changing' as const,registered:true};
  expect(encounterTask(s).title).toBe('follow');
  expect(encounterTask({...s,destination:'changing'}).title).toBe('changingRoom');
  expect(encounterTask({...s,patientLocation:'changing'}).title).toBe('changing');
  const gown={...s,patientLocation:'changing' as const,gownHanded:true};
  expect(encounterTask(gown).title).toBe('shut');
  expect(encounterTask({...gown,doors:{...gown.doors,changing:true}}).title).toBe('checkReady');
 });
 it('points to hygiene, detector, tube and protection as each becomes relevant',()=>{
  const s=createSession('equipment');
  expect(encounterTask({...s,stage:'position'}).title).toBe('hygiene');
  expect(encounterTask({...s,stage:'position',hygiene:true}).title).toBe('position');
  expect(encounterTask({...s,stage:'equipment'}).title).toBe('detector');
  expect(encounterTask({...s,stage:'equipment',state:{...s.state,detectorReady:true}}).title).toBe('equipment');
  expect(encounterTask({...s,stage:'exposure'}).title).toBe('closeLead');
  expect(encounterTask({...s,stage:'complete'}).target).toBeNull();
 });
 it('guides through room portals rather than the shielded partition',()=>{
  expect(guidanceRoute({x:1,z:-1},{x:5,z:-1})).toEqual([{x:2.12,z:4.2},{x:5.12,z:4.2},{x:5,z:-1}]);
  expect(guidanceRoute({x:-1,z:8},{x:7,z:4.7})[0]).toEqual({x:-1.9,z:5.6});
 });
});
