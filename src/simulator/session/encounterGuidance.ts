import type { ClinicalSession } from './clinicalSession';
import type { CopyKey } from './i18n';
import { getWorldTargets } from '../worldInteraction';
import type { GroundPoint } from '../RoomMovement';

export interface EncounterTask { title: CopyKey; detail: [string,string]; target: GroundPoint | null; zone: CopyKey }
/** Guidance describes the next deliberate action. It never dispatches an action. */
export function encounterTask(s:ClinicalSession):EncounterTask {
 const task=(title:CopyKey,detail:[string,string],x:number,z:number,zone:CopyKey):EncounterTask=>({title,detail,target:{x,z},zone});
 const target=(id:string)=>getWorldTargets(s.state).find(t=>t.id===id)!.position;
 if(s.stage==='complete')return {title:'complete',detail:['Your patient has left. Save the encounter when you are ready.','نەخۆش ڕۆیشت. کاتێک ئامادەیت دانیشتنەکە پاشەکەوت بکە.'],target:null,zone:'exit'};
 if(s.destination==='exit')return task('exit',['Walk with your patient back to reception.','لەگەڵ نەخۆش بگەڕێوە بۆ پێشوازی.'],7,5.75,'exit');
 if(s.stage==='registration'){
  if(s.patientLocation==='waiting')return task('callPatient',['Stand behind the reception desk and call the next patient from the waiting seats.','لە پشت مێزی تۆمارکردن بوەستە و نەخۆشی دواتر لە کورسییەکانی چاوەڕوانی بانگ بکە.'],7.70,4.77,'reception');
  if(s.destination==='reception')return task('patientComing',['Stay at reception while the called patient walks up to your desk.','لە بەشی تۆمارکردن بمێنەوە تا نەخۆش بگاتە لای مێزەکەت.'],7.70,4.77,'reception');
  return task('registration',['Ask the patient for their name and hospital ID, then check the referral at your desk.','لە نەخۆش ناو و ژمارەی نەخۆشخانە بپرسە، پاشان ڕەوانەکردنەکە لە مێزەکەت بپشکنە.'],7.70,4.77,'reception');
 }
 if(s.stage==='changing'){
  if(s.patientLocation==='reception'&&!s.destination)return task('follow',['Your checked-in patient is ready. Invite them to follow you to the changing room.','نەخۆشی تۆمارکراوت ئامادەیە. بانگی بکە شوێنت بکەوێت بۆ ژووری گۆڕینی جل.'],7.70,4.77,'reception');
  if(s.destination)return task('changingRoom',['Lead the way. Stay close enough for your patient to follow.','پێشەنگ بە. نزیک بمێنەوە تا نەخۆش شوێنت بکەوێت.'],-4.35,4.85,'changingRoom');
  if(!s.gownHanded)return task('changing',['Talk through preparation, then hand over the gown.','دەربارەی ئامادەکاری قسە بکە، پاشان کراسەکە بدە.'],-5.05,4.63,'changingRoom');
  return s.doors.changing?task('checkReady',['Knock and ask whether the patient has finished changing.','دەرگا بدە و بپرسە ئایا نەخۆش جلگۆڕینی تەواو کردووە.'],-3.44,4.85,'changingRoom'):task('shut',['Step outside, then close the door for privacy.','بچۆ دەرەوە، پاشان دەرگا بۆ تایبەتمەندی دابخە.'],-2.9,4.85,'changingRoom');
 }
 if(s.stage==='escort'){
  if(s.doors.changing)return task('reopen',['The patient is ready. Open the privacy door.','نەخۆش ئامادەیە. دەرگای تایبەتمەندی بکەرەوە.'],-3.44,4.85,'changingRoom');
  if(s.patientLocation==='changing'&&!s.destination)return task('follow',['Return to the gown station and invite your patient to follow.','بگەڕێوە بۆ شوێنی کراس و بانگی نەخۆش بکە شوێنت بکەوێت.'],-5.05,4.63,'changingRoom');
  return task('escort',['Go to the Imaging 01 doorway and invite the patient inside.','بچۆ دەم دەرگای وێنەگرتن ٠١ و بانگی نەخۆش بکە بێتە ژوورەوە.'],2.2,3.28,'imaging');
 }
 if(s.stage==='position'&&!s.hygiene)return task('hygiene',['Use the hand hygiene dispenser beside the imaging wall.','پاککەرەوەی دەست لە تەنیشت دیواری وێنەگرتن بەکاربهێنە.'],-1.08,-3.13,'imaging');
 if(s.stage==='position'||s.stage==='handoff'){
  const p=target('patient');return task(s.stage,['Approach the patient to continue.','بۆ بەردەوامبوون نزیک نەخۆش ببەوە.'],p[0],p[2],'imaging');
 }
 if(s.stage==='equipment'){
  const id=s.state.detectorReady?'tube':'detector',p=target(id);
  return task(s.state.detectorReady?'equipment':'detector',s.state.detectorReady?['Set the tube, distance and field. Confirm when ready.','تیوب، دووری و بوار ڕێکبخە. کاتێک ئامادەیە پشتڕاستی بکەرەوە.']:['Aim at the detector and arm it.','ئامانج لە وەرگر بگرە و ئامادەی بکە.'],p[0],p[2],'imaging');
 }
 if(s.stage==='exposure'&&!s.doors.control)return task('closeLead',['Enter the control room, then close its lead door.','بچۆ ژووری کۆنترۆڵ، پاشان دەرگای سەربی دابخە.'],5.12,2.65,'control');
 return task(s.stage==='review'?'review':'exposure',s.stage==='review'?['At the console, inspect the image before accepting or repeating.','لە کۆنسۆڵ وێنە بپشکنە پێش پەسەندکردن یان دووبارەکردنەوە.']:['Use the console. Prepare, give breathing instructions, then expose.','کۆنسۆڵ بەکاربهێنە. ئامادە بکە، ڕێنمایی هەناسە بدە، پاشان وێنە بگرە.'],5.05,-1.1,'control');
}

/** Portal-first guidance keeps the arrow from pointing through a partition. */
export function guidanceRoute(p:GroundPoint,end:GroundPoint):GroundPoint[]{
 const zone=(v:GroundPoint)=>v.z<3.2?(v.x>3.4?'control':'imaging'):v.x< -3.4?'changing':v.z>6.25?(v.x<1?'waiting':'garden'):'corridor';
 const a=zone(p),b=zone(end),path:GroundPoint[]=[];
 const portals:Record<string,GroundPoint>={control:{x:5.12,z:4.2},imaging:{x:2.12,z:4.2},changing:{x:-2.8,z:4.85},waiting:{x:-1.9,z:5.6},garden:{x:5.5,z:5.6}};
 if(a!==b){if(portals[a])path.push(portals[a]);if(portals[b])path.push(portals[b]);}
 path.push(end);return path.filter((v,i)=>i===path.length-1||Math.hypot(p.x-v.x,p.z-v.z)>.55);
}
