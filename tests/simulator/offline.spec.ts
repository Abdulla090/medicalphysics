import { test,expect } from '@playwright/test';

test('downloaded public practice reopens offline without caching private API data',async({page,context})=>{
 test.setTimeout(180000);
 const manifest=await page.request.get('/practice-manifest.json');
 test.skip(!manifest.ok()||!manifest.headers()['content-type']?.includes('json'),'Run against a production preview after npm run build.');
 await page.addInitScript(()=>localStorage.setItem('language','en'));
 await page.goto('/tools/xray-simulator?case=outpatient-chest');
 await expect(page.locator('.sim-three-room canvas')).toHaveAttribute('data-observer-position',/\[/,{timeout:60000});
 await page.getByRole('button',{name:'Pause & encounter'}).click();
 await page.getByRole('button',{name:'Download practice for offline use',exact:true}).click();
 await expect(page.getByRole('button',{name:'Practice content is available offline',exact:true})).toBeDisabled({timeout:90000});
 const entries=await page.evaluate(async()=>{
  await navigator.serviceWorker.ready;
  const names=(await caches.keys()).filter(n=>n.startsWith('radiography-practice-'));
  return (await Promise.all(names.map(async name=>(await (await caches.open(name)).keys()).map(r=>new URL(r.url).pathname)))).flat();
 });
 expect(entries).toContain('/.practice-ready');
 expect(entries).toContain('/radiography/department-props.glb');
 expect(entries.every(url=>url==='/index.html'||url==='/.practice-ready'||url.startsWith('/assets/')||url.startsWith('/radiography/'))).toBe(true);
 await page.getByRole('button',{name:'Return to the room',exact:true}).click();
 await context.setOffline(true);await page.reload();
 await expect(page.locator('.sim-three-room canvas')).toHaveAttribute('data-observer-position',/\[/,{timeout:60000});
 await page.getByRole('button',{name:'Register your patient',exact:true}).click();
 await page.getByRole('button',{name:'Ask full name',exact:true}).click();
 await expect(page.getByLabel('Full name stated by patient')).toBeVisible();
 await page.screenshot({path:'artifacts/simulator/offline-practice.png'});
 await context.setOffline(false);
});
