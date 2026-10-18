import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClinicalSession, type AcademicConnection } from './useClinicalSession';
import { applySessionAction as apply } from './clinicalSession';
import { prepareEncounter } from './sessionTestFixtures';
import { loadImage, saveDraft, saveImage } from './practiceStore';
import { AcquisitionEngine } from './acquisition';
import type { CapturedImage } from '../types';
import { calculateMetrics } from '../physics';

vi.mock('./practiceStore',()=>({loadImage:vi.fn(),saveDraft:vi.fn(),saveImage:vi.fn()}));
vi.mock('./acquisition',()=>({AcquisitionEngine:vi.fn()}));
const acquire=vi.fn(),cancel=vi.fn();
beforeEach(()=>{
 vi.clearAllMocks();
 vi.mocked(saveDraft).mockResolvedValue(undefined);vi.mocked(saveImage).mockResolvedValue(undefined);vi.mocked(loadImage).mockResolvedValue(undefined);
 vi.mocked(AcquisitionEngine).mockImplementation(()=>({acquire,cancel}) as unknown as AcquisitionEngine);
 acquire.mockImplementation(async record=>({id:record.id,createdAt:record.createdAt,state:record.state,seed:record.seed,engineVersion:record.engineVersion,width:32,height:39,pixels:new Uint16Array(1248),previewUrl:'data:image/png;base64,test',warnings:[],metrics:calculateMetrics(record.state)} satisfies CapturedImage));
});
afterEach(cleanup);

describe('festival session reliability',()=>{
 it('keeps real acquired pixels in memory when local storage is unavailable',async()=>{
  vi.mocked(saveDraft).mockRejectedValue(new DOMException('Quota exceeded','QuotaExceededError'));
  vi.mocked(saveImage).mockRejectedValue(new DOMException('Quota exceeded','QuotaExceededError'));
  const initial=prepareEncounter();
  const {result}=renderHook(()=>useClinicalSession(initial));
  await waitFor(()=>expect(result.current.storageUnavailable).toBe(true));
  act(()=>{result.current.commit({type:'prepare'});result.current.commit({type:'breathe'});});
  await act(()=>result.current.acquire());
  expect(result.current.session.stage).toBe('review');expect(result.current.images).toHaveLength(1);
  expect(result.current.images[0].pixels).toBeInstanceOf(Uint16Array);
  expect(result.current.saved).toBe(false);expect(result.current.paused).toBe(false);
  vi.mocked(saveDraft).mockResolvedValue(undefined);vi.mocked(saveImage).mockResolvedValue(undefined);
  await act(()=>result.current.retrySave());
  expect(result.current.storageUnavailable).toBe(false);expect(result.current.saved).toBe(true);
  expect(saveImage).toHaveBeenLastCalledWith(initial.id,result.current.images[0]);
 });
 it('does not start a worker if exposure is canceled while persistence settles',async()=>{
  let resolve!:()=>void;vi.mocked(saveDraft).mockReturnValueOnce(new Promise<void>(done=>{resolve=done;}));
  const initial=prepareEncounter();const {result}=renderHook(()=>useClinicalSession(initial));
  await waitFor(()=>expect(saveDraft).toHaveBeenCalled());
  act(()=>{result.current.commit({type:'prepare'});result.current.commit({type:'breathe'});});
  let task!:Promise<void>;act(()=>{task=result.current.acquire();});
  act(()=>result.current.cancel());
  await act(async()=>{resolve();await task;});
  expect(acquire).not.toHaveBeenCalled();expect(result.current.session.acquisitions[0].status).toBe('canceled');
 });
 it('cancels an interrupted pending acquisition if stored pixels cannot be read',async()=>{
  let initial=prepareEncounter();initial=apply(initial,{type:'prepare'},1000);initial=apply(initial,{type:'breathe'},1001);initial=apply(initial,{type:'expose',id:'interrupted',seed:1},1002);
  vi.mocked(loadImage).mockRejectedValue(new Error('Storage blocked'));
  const {result}=renderHook(()=>useClinicalSession(initial));
  await waitFor(()=>expect(result.current.session.acquisitions[0].status).toBe('canceled'));
  expect(result.current.session.stage).toBe('exposure');expect(acquire).not.toHaveBeenCalled();
 });
 it('still pauses academic work after a storage failure',async()=>{
  vi.mocked(saveDraft).mockRejectedValue(new Error('Storage blocked'));
  const remote:AcademicConnection={connected:true,scope:'assessment:test',reconcile:vi.fn().mockResolvedValue(undefined),upload:vi.fn(),submit:vi.fn()};
  const initial=prepareEncounter('outpatient-chest','assessment');const {result}=renderHook(()=>useClinicalSession(initial,remote));
  await waitFor(()=>expect(result.current.error).toBe('save-failed'));
  expect(result.current.paused).toBe(true);
  act(()=>{expect(result.current.commit({type:'prepare'})).toBeNull();});
  expect(result.current.paused).toBe(true);
  expect(acquire).not.toHaveBeenCalled();
 });
 it('allows aligned repeat positioning before correcting tube angle at equipment setup',()=>{
  let s=prepareEncounter();s=apply(s,{type:'settings',patch:{tubeAngle:10}},1000);s=apply(s,{type:'equipment'},1001);
  s=apply(s,{type:'prepare'},1002);s=apply(s,{type:'breathe'},1003);s=apply(s,{type:'expose',id:'angled',seed:1},1004);
  s=apply(s,{type:'processed',id:'angled',width:32,height:39},1005);
  s=apply(s,{type:'review',id:'angled',decision:'repeat',coverage:'Coverage reviewed',positioning:'Patient alignment retained',rationale:'Correct the tube angle before repeating.'},1006);
  expect(s.positionAdjusted).toBe(false);
  s=apply(s,{type:'position'},1007);expect(s.stage).toBe('equipment');
  s=apply(s,{type:'settings',patch:{tubeAngle:0,detectorReady:true}},1008);s=apply(s,{type:'equipment'},1009);
  expect(s.stage).toBe('exposure');expect(s.state.tubeAngle).toBe(0);
 });
});
