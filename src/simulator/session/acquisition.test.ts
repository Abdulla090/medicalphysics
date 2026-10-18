import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {AcquisitionEngine} from './acquisition';
import {prepareEncounter} from './sessionTestFixtures';
import {applySessionAction,pendingAcquisition} from './clinicalSession';
vi.mock('../physics',async importOriginal=>({...await importOriginal<typeof import('../physics')>(),renderPixelsToCanvas:vi.fn()}));
class WorkerDouble{
 static all:WorkerDouble[]=[];
 onmessage:((event:MessageEvent)=>void)|null=null;onerror:(()=>void)|null=null;
 terminate=vi.fn();postMessage=vi.fn();constructor(){WorkerDouble.all.push(this);}
}
function record(id:string){let s=prepareEncounter();s=applySessionAction(s,{type:'prepare'},1000);s=applySessionAction(s,{type:'breathe'},1001);s=applySessionAction(s,{type:'expose',id,seed:123},1002);return pendingAcquisition(s)!;}
beforeEach(()=>{WorkerDouble.all=[];vi.stubGlobal('Worker',WorkerDouble);vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,synthetic');});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
describe('acquisition worker lifecycle',()=>{
 it('terminates canceled workers and ignores late output after a subsequent exposure',async()=>{
  const engine=new AcquisitionEngine(),first=engine.acquire(record('first')),rejected=expect(first).rejects.toMatchObject({name:'AbortError'});
  engine.cancel();await rejected;expect(WorkerDouble.all[0].terminate).toHaveBeenCalledOnce();
  const second=engine.acquire(record('second'));
  WorkerDouble.all[0].onmessage?.({data:{id:'first',error:'stale failure'}} as MessageEvent);
  const pixels=new Uint16Array(32*39);pixels[42]=31901;
  WorkerDouble.all[1].onmessage?.({data:{id:'second',pixels,width:32,height:39}} as MessageEvent);
  const image=await second;expect(image.id).toBe('second');expect(image.pixels).toBe(pixels);expect(image.seed).toBe(123);expect(image.pixels[42]).toBe(31901);expect(WorkerDouble.all[1].terminate).toHaveBeenCalledOnce();
 });
 it('releases a timed out worker and rejects the acquisition without fabricating pixels',async()=>{
  vi.useFakeTimers();const engine=new AcquisitionEngine(),promise=engine.acquire(record('timeout')),rejected=expect(promise).rejects.toThrow('acquisition-timeout');
  await vi.advanceTimersByTimeAsync(30001);await rejected;expect(WorkerDouble.all[0].terminate).toHaveBeenCalledOnce();
 });
});
