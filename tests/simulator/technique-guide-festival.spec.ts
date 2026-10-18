import { expect, test, type Page } from '@playwright/test';

const canvas = (page: Page) => page.locator('.sim-three-room canvas');
const guide = (page: Page) => page.locator('.sim-student-guide').last();

async function reachEquipment(page: Page) {
  await page.locator('.cg-festival-skip button').click(); // Registration → changing room
  await page.locator('.cg-station .cg-festival-skip button').click(); // Changing → escort
  await page.locator('.cg-festival-skip button').click(); // Escort → positioning
  await page.locator('.cg-festival-skip button').click(); // Positioning → equipment
  await expect(page.locator('.cg-shell')).toHaveAttribute('data-game-stage', 'equipment');
  await expect(page.getByRole('dialog')).toBeVisible();
}

for (const { language, mobile } of [
  { language: 'en', mobile: false },
  { language: 'ku', mobile: true },
] as const) {
  test(`festival equipment guide stays optional, updates live and explains geometry · ${language} ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
    test.setTimeout(180000);
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((lang) => { localStorage.setItem('language', lang); localStorage.setItem('radiography-quality', 'low'); }, language);
    await page.goto('/tools/xray-simulator?case=outpatient-chest');
    await expect(canvas(page)).toHaveAttribute('data-observer-position', /\[/, { timeout: 75000 });
    await reachEquipment(page);
    await expect(guide(page).locator('.sim-student-guide-reading')).toHaveCount(0);
    await guide(page).locator('button').click();
    const readings = guide(page).locator('.sim-student-guide-grid .sim-student-guide-reading');
    await expect(readings).toHaveCount(3);
    const position = guide(page).locator('.sim-student-guide-geometry .sim-student-guide-reading').first();
    const coverage = guide(page).locator('.sim-student-guide-geometry .sim-student-guide-reading').last();
    const inputs = page.locator('.cg-station .cg-precision input[type=number]');
    await inputs.nth(0).fill('70'); // kVp below chest-PA exercise
    await inputs.nth(1).fill('200');
    await inputs.nth(2).fill('40'); // mAs = 8, above chest PA
    await inputs.nth(3).fill('180'); // SID in target
    await expect(readings.nth(0)).toHaveAttribute('data-state', 'low');
    await expect(readings.nth(1)).toHaveAttribute('data-state', 'high');
    await expect(readings.nth(2)).toHaveAttribute('data-state', 'target');
    await inputs.nth(5).fill('8'); // too narrow to include requested chest anatomy
    await inputs.nth(6).fill('8');
    await expect(coverage).toHaveAttribute('data-state', 'attention');
    await inputs.nth(0).fill('110');
    await inputs.nth(2).fill('10'); // mAs = 2
    await inputs.nth(3).fill('180');
    await inputs.nth(5).fill('35');
    await inputs.nth(6).fill('43');
    await expect(readings.nth(0)).toHaveAttribute('data-state', 'target');
    await expect(readings.nth(1)).toHaveAttribute('data-state', 'target');
    await expect(readings.nth(2)).toHaveAttribute('data-state', 'target');
    await expect(position).toHaveAttribute('data-state','target');
    await expect(coverage).toHaveAttribute('data-state','target');
    await expect(guide(page)).toContainText(language === 'ku' ? 'لە مەودای دروستی ڕاهێنانە' : 'Correct exercise range');
    await expect(guide(page)).toContainText(language === 'ku' ? 'سنووری ئامێری مۆدێلەکە' : 'Simulator equipment limit');
    await guide(page).screenshot({ path: `artifacts/simulator/technique-guide-${language}-${mobile ? 'mobile' : 'desktop'}.png` });
    await guide(page).locator('button').click();
    await expect(guide(page).locator('.sim-student-guide-reading')).toHaveCount(0);
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).resolves.toBe(true);
  });
}

test('legacy inspection studio has optional live case-specific guide in both exposure and positioning', async ({ page }) => {
  test.setTimeout(130000);
  await page.addInitScript(() => localStorage.setItem('language','en'));
  await page.goto('/tools/xray-simulator?studio');
  await page.getByRole('button', { name: 'Open inspection studio' }).click();
  await expect(page.getByRole('tab', { name: 'Exposure' })).toBeVisible();
  await guide(page).locator('button').click();
  const readings = guide(page).locator('.sim-student-guide-grid .sim-student-guide-reading');
  await expect(readings.nth(0)).toHaveAttribute('data-state', 'target');
  await page.getByRole('button',{name:'Increase Tube voltage'}).click();
  await expect(readings.nth(0)).toHaveAttribute('data-state', 'target');
  await page.getByRole('tab', { name: 'Positioning' }).click();
  await guide(page).locator('button').click();
  await expect(guide(page).locator('.sim-student-guide-geometry .sim-student-guide-reading')).toHaveCount(2);
  await page.getByRole('button',{name:'Increase Patient rotation'}).click();
  await page.getByRole('button',{name:'Increase Patient rotation'}).click();
  await page.getByRole('button',{name:'Increase Patient rotation'}).click();
  await page.getByRole('button',{name:'Increase Patient rotation'}).click();
  await expect(guide(page).locator('.sim-student-guide-geometry .sim-student-guide-reading').first()).toHaveAttribute('data-state','attention');
  await page.locator('.sim-exam').filter({hasText:'Chest lateral'}).click();
  if (await guide(page).locator('button').getAttribute('aria-expanded') === 'false') await guide(page).locator('button').click();
  await expect(guide(page)).toContainText('105–135 kVp');
});
