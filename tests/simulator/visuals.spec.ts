import {test,expect} from '@playwright/test';
import {lookAt,walkTo} from './journey-helpers';
test('registration and occupied waiting hall are walkable',async({page})=>{
 test.setTimeout(240000);
 await page.addInitScript(()=>localStorage.setItem('language','en'));
 await page.goto('/tools/xray-simulator?case=outpatient-chest');
 await expect(page.locator('.sim-three-room canvas')).toHaveAttribute('data-observer-position',/\[/,{timeout:75000});
 await page.screenshot({path:'artifacts/simulator/registration.png',timeout:60000});
 for(const[x,z]of[[2.7,4.8],[-1.9,4.8],[-1.9,6.7],[-1.1,7.2]])await walkTo(page,x,z);
 await lookAt(page,[-1.5,1,9.8]);
 await page.screenshot({path:'artifacts/simulator/waiting-hall.png',timeout:60000});
 console.log('render metrics',await page.locator('.sim-three-room canvas').getAttribute('data-render-metrics'));
});
