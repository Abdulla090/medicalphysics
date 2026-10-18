import { REGISTRATION_TOPICS, PREPARATION_TOPICS } from '../clinicalDialogue';
import type { CaseId } from '../clinicalCases';
import { applySessionAction, createSession, type ClinicalSession, type SessionAction } from './clinicalSession';

/** Test-only evidence generator. Uses production transitions, never changes session fields. */
export function prepareEncounter(caseId:CaseId='outpatient-chest',mode:'guided'|'assessment'='guided',at=1):ClinicalSession {
 let s=createSession('test-'+caseId,caseId,mode,at);
 const act=(a:SessionAction)=>{s=applySessionAction(s,a,at++);};
 act({type:'location',x:7.7,z:4.8});
 act({type:'call'});act({type:'arrived',location:'reception'});
 for(const topic of REGISTRATION_TOPICS)act({type:'dialogue',phase:'registration',action:{type:'ask',topic}});
 for(const field of ['name','identifier']as const)act({type:'dialogue',phase:'registration',action:{type:'transcribe',field,value:s.caseSnapshot[field]}});
 act({type:'register'});act({type:'escort',destination:'changing'});act({type:'arrived',location:'changing'});act({type:'location',x:-4.6,z:4.85});
 for(const topic of PREPARATION_TOPICS)act({type:'dialogue',phase:'preparation',action:{type:'ask',topic}});
 for(const response of ['remove-metals','assist-mobility','reassure']as const)act({type:'dialogue',phase:'preparation',action:{type:'respond',response}});
 if(s.preparationDialogue.pregnancy==='hold')for(const response of ['refer-clinician','review-report']as const)act({type:'dialogue',phase:'preparation',action:{type:'respond',response}});
 act({type:'gown'});act({type:'location',x:-2.9,z:4.85});act({type:'door',door:'changing',closed:true});act({type:'changed'});act({type:'door',door:'changing',closed:false});
 act({type:'escort',destination:'corridor'});act({type:'arrived',location:'corridor'});act({type:'location',x:2.2,z:3.8});act({type:'escort',destination:'imaging'});act({type:'arrived',location:'imaging'});
 act({type:'location',x:-1.08,z:-2.4});act({type:'hygiene'});
 act({type:'settings',patch:{patientOffsetX:0,patientOffsetY:0,patientRotation:0,arms:caseId==='lateral-followup'?'raised':caseId==='outpatient-chest'?'hips':'down'}});act({type:'position'});
 act({type:'settings',patch:{detectorReady:true}});act({type:'equipment'});
 act({type:'location',x:5.1,z:2.6});act({type:'door',door:'control',closed:true});act({type:'location',x:5.1,z:0});
 return s;
}
export function completeEncounter(s:ClinicalSession):ClinicalSession {
 let at=(s.actions.at(-1)?.at??s.createdAt)+1;
 const act=(a:SessionAction)=>{s=applySessionAction(s,a,at++);};
 act({type:'prepare'});act({type:'breathe'});act({type:'expose',id:'image-1',seed:12903});act({type:'processed',id:'image-1',width:32,height:39});
 act({type:'review',id:'image-1',decision:'accept',coverage:'Requested anatomy included',positioning:'No visible rotation',rationale:'Appropriate image for this synthetic exercise.'});
 act({type:'location',x:5.1,z:2.7});act({type:'door',door:'control',closed:false});act({type:'location',x:1.5,z:0});
 act({type:'handoff',explanation:'The examination is complete. Your referring clinician will explain the report.',notes:'Explained next steps and assisted patient safely.'});
 act({type:'escort',destination:'exit'});act({type:'arrived',location:'exit'});return s;
}
