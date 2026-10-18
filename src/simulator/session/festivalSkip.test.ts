import { describe, expect, it } from 'vitest';
import { CLINICAL_CASES } from '../clinicalCases';
import { applySessionAction as apply, createSession, exposureBlockers, FESTIVAL_SKIP_STAGES, replaySession } from './clinicalSession';

describe('optional festival shortcuts',()=>{
 for(const clinicalCase of CLINICAL_CASES)it('reaches protected exposure and replays honestly for '+clinicalCase.requested,()=>{
  const initial=createSession('festival',clinicalCase.id,'guided',1);
  let session=initial;
  for(const stage of FESTIVAL_SKIP_STAGES)session=apply(session,{type:'festival-skip',stage},2);
  expect(session.stage).toBe('exposure');
  expect(session.acquisitions).toHaveLength(0);
  expect(session.registration.nameVerified).toBe(false);
  expect(session.actions.every(event=>event.action.type==='festival-skip')).toBe(true);
  expect(session.prepared).toBe(false);
  expect(session.state.breathHeld).toBe(false);
  expect(()=>apply(session,{type:'expose',id:'early',seed:1},3)).toThrow('exposure-blocked');
  session=apply(session,{type:'prepare'},3);
  expect(exposureBlockers(session,3)).toContain('breathing-required');
  session=apply(session,{type:'breathe'},4);
  expect(exposureBlockers(session,4)).toEqual([]);
  session=apply(session,{type:'expose',id:'demo-image',seed:1},5);
  expect(replaySession(initial,session.actions)).toEqual(session);
  expect(()=>apply(session,{type:'festival-skip',stage:'equipment'},6)).toThrow('acquisition-busy');
 });
 it('rejects assessment shortcuts and stale clicks',()=>{
  expect(()=>apply(createSession('assessment','outpatient-chest','assessment'),{type:'festival-skip',stage:'registration'})).toThrow('assessment-skips-disabled');
  const first=apply(createSession('practice'),{type:'festival-skip',stage:'registration'});
  expect(()=>apply(first,{type:'festival-skip',stage:'registration'})).toThrow('skip-stage-mismatch');
 });
});
