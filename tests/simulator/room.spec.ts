import { test,expect,type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { lookAt,walkTo } from './journey-helpers';
import { CLINICAL_CASES } from '../../src/simulator/clinicalCases';
import { getWorldTargets } from '../../src/simulator/worldInteraction';
import { applyProtocol,DEFAULT_STATE } from '../../src/simulator/protocols';
const canvas=(p:Page)=>p.locator('.sim-three-room canvas'),shell=(p:Page)=>p.locator('.cg-shell');
async function use(p:Page,point:number[],id:string){await lookAt(p,point);await expect(p.locator('.cg-interact')).toHaveAttribute('data-world-target',id);await canvas(p).press('e');}
async function route(p:Page,points:number[][]){for(const[x,z]of points)await walkTo(p,x,z);}
for(const c of CLINICAL_CASES)test('complete manual encounter: '+c.requested,async({page:p})=>{
 test.setTimeout(600000);await p.addInitScript(()=>localStorage.setItem('language','en'));
 const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('/tools/xray-simulator?case='+c.id);await expect(canvas(p)).toHaveAttribute('data-observer-position',/\[/,{timeout:75000});
 console.log(c.requested,'room ready');await p.getByRole('button',{name:'Register your patient',exact:true}).click();const d=p.getByRole('dialog');
 const click=async(name:string)=>d.getByRole('button',{name,exact:true}).click();
 await expect(d.getByRole('button',{name:'Complete registration',exact:true})).toBeDisabled();
 await click('Ask full name');await d.getByLabel('Full name stated by patient').fill(c.name);await click('Verify against referral');
 await click('Ask hospital ID');await d.getByLabel('Identifier stated by patient').fill(c.identifier);await d.getByRole('button',{name:'Verify against referral',exact:true}).click();
 for(const n of ['Discuss referral','Ask for agreement','Complete registration'])await click(n);
 await expect(shell(p)).toHaveAttribute('data-patient-destination','');await p.getByRole('button',{name:'Invite patient to follow',exact:true}).click();
 console.log(c.requested,'registered');await route(p,[[2.7,4.8],[.1,4.8],[-2.8,4.8],[-4.35,4.9]]);await expect(shell(p)).toHaveAttribute('data-patient-location','changing',{timeout:45000});
 await use(p,[-5.05,1.22,4.63],'changing-booth');
 for(const n of ['Check positioning comfort','Ask about artifacts','Pregnancy considerations','Explain the examination','Practice breathing','Explain private changing','Request artifact removal','Offer positioning support','Listen and reassure'])await click(n);
 if(c.id==='abdominal-survey'){await expect(d.getByRole('button',{name:'Hand over gown',exact:true})).toBeDisabled();await click('Refer to supervising clinician');await click('Read simulated clinician report');}
 await click('Hand over gown');await walkTo(p,-2.7,4.85);await use(p,[-3.44,1.24,4.85],'changing-door');await expect(shell(p)).toHaveAttribute('data-game-stage','changing');
 await use(p,[-3.44,1.24,4.85],'changing-door');await click('Ask whether the patient is ready');await use(p,[-3.44,1.24,4.85],'changing-door');
 await walkTo(p,-4.32,4.84);await use(p,[-5.05,1.22,4.63],'changing-booth');await walkTo(p,-1.5,4.7);await expect(shell(p)).toHaveAttribute('data-patient-location','corridor',{timeout:30000});
 await walkTo(p,2.13,4.25);await use(p,[2.2,1.27,3.28],'patient-arrival');await route(p,[[2.12,2.2],[1.8,-.6]]);
 await expect(shell(p)).toHaveAttribute('data-patient-location','imaging',{timeout:45000});
 await route(p,[[1.72,-1.58],[-1.12,-1.7]]);await use(p,[-1.08,1.32,-3.13],'hygiene');
 const state={...applyProtocol(DEFAULT_STATE,c.requested),patientOffsetX:3.5,patientOffsetY:-2.5,patientRotation:7},targets=getWorldTargets(state),supine=['abdomen-ap','pelvis-ap','chest-ap'].includes(c.requested);
 if(supine)await route(p,[[1.52,-1.55],[.95,.45]]);else await walkTo(p,1.7,-1.57);
 if(c.requested==='chest-pa'){
  await lookAt(p,targets.find(t=>t.id==='patient')!.position);const box=(await canvas(p).boundingBox())!;await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2+18,box.y+box.height/2+8,{steps:6});await expect(p.locator('.cg-crosshair')).toHaveClass(/holding/);await p.screenshot({path:'artifacts/simulator/manual-positioning-hands.png'});await p.mouse.up();
 }
 await use(p,targets.find(t=>t.id==='patient')!.position,'patient');await expect(d.getByRole('button',{name:'Confirm positioning',exact:true})).toBeDisabled();
 for(const n of ['Lateral position','Head–feet position','Body rotation'])await d.getByRole('spinbutton',{name:n,exact:true}).fill('0');
 await d.getByRole('combobox',{name:'Arm position',exact:true}).selectOption(c.requested==='chest-pa'?'hips':c.requested==='chest-lateral'?'raised':'down');await click('Confirm positioning');
 await use(p,targets.find(t=>t.id==='detector')!.position,'detector');if(!supine)await walkTo(p,1.7,-.5);
 await use(p,targets.find(t=>t.id==='tube')!.position,'tube');await click('Confirm equipment setup');
 await route(p,[[2.15,2.4],[2.15,4.3],[5.12,4.25],[5.12,2.65]]);await use(p,[5.12,1.25,3.22],'control-door');await walkTo(p,5.05,.3);await use(p,[5.05,1.16,-1.1],'console');
 await expect(d.getByRole('button',{name:'Expose deliberately',exact:true})).toBeDisabled();for(const n of ['Prepare exposure','Give breathing instruction','Expose deliberately'])await click(n);
 await expect(shell(p)).toHaveAttribute('data-game-stage','review',{timeout:30000});await use(p,[5.05,1.16,-1.1],'console');
 await d.getByLabel('Coverage observations').fill('Requested anatomy and field edges reviewed.');await d.getByLabel('Positioning observations').fill('Symmetric positioning and no avoidable rotation.');await d.getByLabel('Decision and rationale').fill('Accept for this synthetic exercise after examining inclusion and motion.');
 await p.screenshot({path:'artifacts/simulator/manual-'+c.requested+'-review.png'});await click('Accept image');
 await walkTo(p,5.12,2.5);await use(p,[5.12,1.25,3.22],'control-door');await route(p,[[5.12,4.25],[2.13,4.25],[2.13,2.1],supine?[.95,.45]:[1.7,-1.45]]);
 await use(p,getWorldTargets({...state,patientOffsetX:0,patientOffsetY:0,patientRotation:0}).find(t=>t.id==='patient')!.position,'patient');
 await d.getByLabel('What will you tell the patient?').fill('The examination is finished. Your clinician will discuss the report with you.');await d.getByLabel('Encounter documentation').fill('Patient comfortable. Next steps explained. Assisted departure.');await click('Explain completion and escort out');
 for(const [x,z] of [[2.15,2.2],[2.15,4.55],[4.5,5.7],[6.6,5.1]]){if(await shell(p).getAttribute('data-game-stage')==='complete')break;await walkTo(p,x,z,true);}await expect(shell(p)).toHaveAttribute('data-game-stage','complete',{timeout:45000});await p.getByRole('button',{name:'Finish and save practice',exact:true}).click();expect(errors).toEqual([]);
});
test('English and Sorani phone controls preserve physical axes',async({page:p})=>{
 await p.setViewportSize({width:390,height:844});await p.addInitScript(()=>localStorage.setItem('language','en'));
 await p.goto('/tools/xray-simulator?case=outpatient-chest');await expect(canvas(p)).toHaveAttribute('data-observer-position',/\[/,{timeout:75000});
 const result=await new AxeBuilder({page:p}).include('.cg-shell').withTags(['wcag2a','wcag2aa']).analyze();expect(result.violations).toEqual([]);
 await p.getByRole('button',{name:'Pause & encounter'}).click();await p.getByRole('combobox',{name:'English / کوردی'}).selectOption('ku');
 await expect(shell(p)).toHaveAttribute('dir','rtl');await p.getByRole('button',{name:'گەڕانەوە بۆ ژوور'}).click();await expect(p.locator('.cg-walk')).toHaveAttribute('dir','ltr');
 const before=JSON.parse((await canvas(p).getAttribute('data-observer-position'))!),yaw=Number(await canvas(p).getAttribute('data-observer-yaw'));
 const forward=(await p.locator('.cg-walk-forward').boundingBox())!;await p.mouse.move(forward.x+22,forward.y+22);await p.mouse.down();await p.waitForTimeout(240);await p.mouse.up();
 const after=JSON.parse((await canvas(p).getAttribute('data-observer-position'))!);expect((after[0]-before[0])*(-Math.sin(yaw))+(after[2]-before[2])*(-Math.cos(yaw))).toBeGreaterThan(.03);
 const translated=await new AxeBuilder({page:p}).include('.cg-shell').withTags(['wcag2a','wcag2aa']).analyze();expect(translated.violations).toEqual([]);
 expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await p.screenshot({path:'artifacts/simulator/sorani-mobile.png'});
});
