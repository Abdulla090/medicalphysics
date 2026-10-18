import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('real acquisition survives unavailable storage and the review desk is accessible',async({page})=>{
 test.setTimeout(180000);
 await page.addInitScript(()=>{
  localStorage.setItem('language','en');localStorage.setItem('radiography-quality','low');
  Object.defineProperty(window,'indexedDB',{value:{open:()=>{throw new DOMException('Device storage blocked','SecurityError');}}});
 });
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/tools/xray-simulator?case=outpatient-chest');
 await expect(page.locator('.sim-three-room canvas')).toHaveAttribute('data-observer-position',/\[/,{timeout:75000});
 for(let i=0;i<5;i++)await page.getByRole('button',{name:/Skip for demo/}).click();
 await page.getByRole('button',{name:'Prepare exposure',exact:true}).click();
 await page.getByRole('button',{name:'Give breathing instruction',exact:true}).click();
 await page.getByRole('button',{name:'Expose deliberately',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Review the radiograph',exact:true})).toBeVisible({timeout:60000});
 await expect(page.locator('.cg-film canvas')).toHaveAttribute('width','512');
 await expect(page.locator('.cg-footer')).toContainText('Not saved');
 await page.getByLabel('Window level').fill('0.55');
 await page.getByRole('button',{name:'Invert display',exact:true}).click();
 await expect(page.getByRole('button',{name:'Invert display',exact:true})).toHaveAttribute('aria-pressed','true');
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export synthetic PNG',exact:true}).click();
 expect((await download).suggestedFilename()).toMatch(/^synthetic-.*\.png$/);
 await page.getByRole('button',{name:'Reset display',exact:true}).click();
 await expect(page.getByLabel('Window level')).toHaveValue('0.46');
 expect((await new AxeBuilder({page}).include('.cg-station').analyze()).violations).toEqual([]);
 await page.screenshot({path:'artifacts/simulator/showcase-review-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'artifacts/simulator/showcase-review-phone.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByRole('button',{name:'Accept image',exact:true})).toBeDisabled();
 await page.getByLabel('Coverage observations').fill('The field includes the requested chest anatomy.');
 await page.getByLabel('Positioning observations').fill('No apparent rotation, arms clear.');
 await page.getByLabel('Decision and rationale').fill('Accept for this synthetic teaching exercise after review.');
 await page.getByRole('button',{name:'Accept image',exact:true}).click();
 await expect(page.locator('.cg-shell')).toHaveAttribute('data-game-stage','handoff');
 expect(errors).toEqual([]);
});

test('lost graphics can reopen without resetting the patient encounter',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('language','en');localStorage.setItem('radiography-quality','low');});
 await page.goto('/tools/xray-simulator?case=outpatient-chest');
 const canvas=page.locator('.sim-three-room canvas');
 await expect(canvas).toHaveAttribute('data-observer-position',/\[/,{timeout:75000});
 await page.getByRole('button',{name:/Skip for demo/}).click();
 const id=await page.locator('.cg-shell').getAttribute('data-session-id');
 // Exercise the browser's actual context-loss mechanism, without altering session state.
 await canvas.evaluate(element=>{
  const gl=(element as HTMLCanvasElement).getContext('webgl2');
  if(!gl)throw new Error('Expected WebGL2 test context');
  const extension=gl.getExtension('WEBGL_lose_context');
  if(!extension)throw new Error('Context loss extension unavailable');
  extension.loseContext();
 });
 await page.getByRole('button',{name:'Reopen 3D room',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-observer-position',/\[/,{timeout:75000});
 await expect(page.locator('.cg-shell')).toHaveAttribute('data-session-id',id!);
 await expect(page.locator('.cg-shell')).toHaveAttribute('data-game-stage','changing');
});

test('refresh offers the saved encounter and a confirmed new case survives another refresh',async({page})=>{
 test.setTimeout(180000);
 page.on('dialog',dialog=>void dialog.accept());
 await page.addInitScript(()=>{localStorage.setItem('language','en');localStorage.setItem('radiography-quality','low');});
 await page.goto('/tools/xray-simulator?festival&case=outpatient-chest');
 await page.getByRole('button',{name:'Begin encounter',exact:true}).click();
 await expect(page.locator('.sim-three-room canvas')).toHaveAttribute('data-observer-position',/\[/,{timeout:75000});
 await page.getByRole('button',{name:/Skip for demo/}).click();
 await expect(page.locator('.cg-footer')).toContainText('Saved on this device');
 const first=await page.locator('.cg-shell').getAttribute('data-session-id');
 await page.reload();
 await page.getByRole('button',{name:'Resume saved encounter',exact:true}).click();
 await expect(page.locator('.cg-shell')).toHaveAttribute('data-session-id',first!);
 await expect(page.locator('.cg-shell')).toHaveAttribute('data-game-stage','changing');
 await page.getByRole('button',{name:'Pause & encounter',exact:true}).click();
 await page.getByRole('button',{name:'Restart encounter',exact:true}).click();
 await page.getByLabel('Requested projection').selectOption('lateral-followup');
 await page.getByRole('button',{name:'Restart encounter',exact:true}).click();
 await page.getByRole('button',{name:'Begin encounter',exact:true}).click();
 await expect(page).toHaveURL(/case=lateral-followup/);
 await expect(page.locator('.sim-three-room canvas')).toHaveAttribute('data-observer-position',/\[/,{timeout:75000});
 await page.getByRole('button',{name:/Skip for demo/}).click();
 await expect(page.locator('.cg-footer')).toContainText('Saved on this device');
 const second=await page.locator('.cg-shell').getAttribute('data-session-id');expect(second).not.toBe(first);
 await page.reload();await page.getByRole('button',{name:'Resume saved encounter',exact:true}).click();
 await expect(page.locator('.cg-shell')).toHaveAttribute('data-session-id',second!);
});
