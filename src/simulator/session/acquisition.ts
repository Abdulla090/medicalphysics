import { calculateMetrics, renderPixelsToCanvas } from '../physics';
import type { CapturedImage } from '../types';
import type { RadiographResponse } from '../radiograph.worker';
import type { AcquisitionRecord } from './clinicalSession';

/** A generation-scoped worker. Cancellation invalidates callbacks before terminating it. */
export class AcquisitionEngine {
  private worker:Worker|null=null;
  private generation=0;
  private timer:ReturnType<typeof setTimeout>|null=null;
  private reject:((error:Error)=>void)|null=null;
  cancel(){
    this.generation++;this.worker?.terminate();this.worker=null;
    if(this.timer)clearTimeout(this.timer);this.timer=null;
    this.reject?.(new DOMException('Acquisition canceled','AbortError'));this.reject=null;
  }
  acquire(record:AcquisitionRecord):Promise<CapturedImage>{
    this.cancel();const generation=this.generation;
    return new Promise((resolve,reject)=>{
      this.reject=reject;
      const finish=()=>{if(this.timer)clearTimeout(this.timer);this.worker?.terminate();this.worker=null;this.timer=null;this.reject=null;};
      try{
        const worker=new Worker(new URL('../radiograph.worker.ts',import.meta.url),{type:'module'});this.worker=worker;
        this.timer=setTimeout(()=>{if(generation!==this.generation)return;finish();reject(new Error('acquisition-timeout'));},30000);
        worker.onerror=()=>{if(generation!==this.generation)return;finish();reject(new Error('acquisition-failed'));};
        worker.onmessage=(event:MessageEvent<RadiographResponse>)=>{
          if(generation!==this.generation||event.data.id!==record.id)return;
          const result=event.data;finish();
          if('error' in result){reject(new Error('acquisition-failed'));return;}
          try{
            const canvas=document.createElement('canvas');
            renderPixelsToCanvas(result.pixels,result.width,result.height,canvas);
            resolve({id:record.id,createdAt:record.createdAt,state:{...record.state},metrics:calculateMetrics(record.state),pixels:result.pixels,width:result.width,height:result.height,
              previewUrl:canvas.toDataURL('image/png'),warnings:[],quality:result.quality,seed:record.seed,engineVersion:record.engineVersion});
          }catch{reject(new Error('image-display-failed'));}
        };
        worker.postMessage({id:record.id,state:record.state,seed:record.seed,width:512});
      }catch(error){finish();reject(error);}
    });
  }
}
