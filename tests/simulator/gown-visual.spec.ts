import { expect, test, type Page } from '@playwright/test';
import { lookAt, walkTo } from './journey-helpers';

const canvas = (page: Page) => page.locator('.sim-three-room canvas');
async function screenshot(page: Page, name: string) {
  await expect(page.locator('.sim-scene-loading')).toHaveCount(0, { timeout: 75000 });
  await expect(canvas(page)).toBeVisible({ timeout: 75000 });
  await canvas(page).screenshot({ path: `artifacts/simulator/gown-${name}.png`, animations: 'disabled', timeout: 60000 });
}

test('capture hospital gown at the actual receptor from several camera angles and in supine pose', async ({ page }) => {
  test.setTimeout(240000);
  await page.addInitScript(() => { localStorage.setItem('language', 'en'); localStorage.setItem('radiography-quality', 'low'); });
  await page.goto('/tools/xray-simulator?studio');
  await expect(page.locator('.sim-scene-loading')).toHaveCount(0, { timeout: 75000 });
  await page.getByRole('button', { name: 'Open inspection studio' }).click();
  await page.getByRole('button', { name: 'Patient', exact: true }).click();
  await screenshot(page, 'standing-front');
  const rect = await canvas(page).boundingBox();
  if (!rect) throw new Error('3D canvas missing');
  const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + rect.width * 0.22, y, { steps: 14 });
  await page.mouse.up();
  await screenshot(page, 'standing-side');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + rect.width * 0.25, y, { steps: 14 });
  await page.mouse.up();
  await screenshot(page, 'standing-back');
  await page.locator('.sim-exam').filter({ hasText: 'Chest AP' }).click();
  await page.getByRole('button', { name: 'Patient', exact: true }).click();
  await screenshot(page, 'supine');
});

test('capture gown on mobile from the festival changing room and during walking', async ({ page }) => {
  test.setTimeout(360000);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.addInitScript(() => { localStorage.setItem('language', 'en'); localStorage.setItem('radiography-quality', 'low'); });
  await page.goto('/tools/xray-simulator?festival&case=outpatient-chest');
  await page.getByRole('button', { name: 'Begin encounter', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-observer-position', /\[/, { timeout: 75000 });
  // Real festival shortcuts position the real skinned actor in the changing room.
  // These screenshots are visual QA only; shortcuts are excluded from assessment.
  await page.locator('.cg-festival-skip button').click();
  await page.getByRole('dialog').getByRole('button',{name:'Close panel'}).first().click();
  await page.locator('.cg-festival-skip button').click();
  await expect(page.locator('.cg-shell')).toHaveAttribute('data-patient-location','changing');
  await walkTo(page,-4.45,4.83);
  await lookAt(page,[-5.51,.94,5.08]);
  await screenshot(page,'changing-mobile');
  await lookAt(page,[-5.05,1.22,4.63]);
  await page.getByRole('button',{name:'Invite patient to follow',exact:true}).click();
  await walkTo(page,-3.4,4.85);
  await lookAt(page,[-4.8,1.0,4.85]);
  await screenshot(page,'walking-mobile');
});
