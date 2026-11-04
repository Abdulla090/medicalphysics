import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('theme', 'light');
    sessionStorage.setItem('splash_shown', 'true');
  });
});

async function enter(page: Page, experiment = 'simple-pendulum') {
  await page.goto(`/labs/stage-1/${experiment}`);
  await expect(page.locator('.lab-controls')).toBeVisible();
}

async function setRange(page: Page, name: string, value: string) {
  await page.getByRole('slider', { name, exact: true }).fill(value);
}

test('catalog links to all three functional Stage 1 labs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/labs');
  await expect(page.getByRole('heading', { name: 'Physics labs' })).toBeVisible();
  await expect(page.locator('.lab-experiment-row')).toHaveCount(3);
  await page.screenshot({ path: 'artifacts/labs/catalog-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Open experiment', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Simple pendulum' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('pendulum times complete cycles, pauses, resumes, persists, and exports a real trial', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await enter(page);
  await page.getByLabel('Oscillations per trial').selectOption('5');
  await page.getByRole('button', { name: '4×', exact: true }).click();
  await page.getByRole('button', { name: 'Start measurement', exact: true }).click();
  await expect(page.getByTestId('elapsed')).not.toHaveText('0.00s');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const elapsed = await page.getByTestId('elapsed').textContent();
  await page.waitForTimeout(250);
  await expect(page.getByTestId('elapsed')).toHaveText(elapsed!);
  await expect(page.getByRole('slider', { name: 'Pendulum length', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Resume measurement', exact: true }).click();
  await expect(page.locator('.lab-observations tbody tr')).toHaveCount(1);
  await expect(page.getByTestId('oscillation-count')).toHaveText('05/ 5');
  const cells = page.locator('.lab-observations tbody tr').first().locator('td');
  expect(Number(await cells.nth(3).textContent())).toBeCloseTo(8.984, 2);
  await page.getByLabel('Student / group', { exact: true }).fill('Physics / Group 04');
  await page.getByLabel('Observations & conclusion', { exact: true }).fill('Keep the angle fixed; vary the pendulum length.');
  await page.screenshot({ path: 'artifacts/labs/pendulum-measured-desktop.png', fullPage: true });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await downloadPromise;
  const body = await fs.readFile((await download.path())!, 'utf8');
  expect(body).toContain('"simulation"'); expect(body).toContain('"length_m"');
  await page.reload();
  await expect(page.locator('.lab-observations tbody tr')).toHaveCount(1);
  await expect(page.getByLabel('Student / group', { exact: true })).toHaveValue('Physics / Group 04');
  await expect(page.getByLabel('Observations & conclusion', { exact: true })).toHaveValue('Keep the angle fixed; vary the pendulum length.');
  await page.getByRole('button', { name: 'Reset apparatus', exact: true }).click();
  await expect(page.locator('.lab-observations tbody tr')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('bench readings produce a gravity fit, remain separate, and print with analysis', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Enter bench reading', exact: true }).click();
  for (const length of [0.4, 0.7, 1]) {
    await page.getByLabel('Length (m)', { exact: true }).fill(String(length));
    await page.getByLabel('Elapsed time (s)', { exact: true }).fill(String(10 * 2 * Math.PI * Math.sqrt(length / 9.80665)));
    await page.getByRole('button', { name: 'Add reading', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.lab-observations tbody tr')).toHaveCount(3);
  await page.getByRole('tab', { name: /Analysis/ }).click();
  await expect(page.locator('.lab-result-number')).toContainText('9.807');
  await page.getByRole('button', { name: 'Simulation', exact: true }).first().click();
  await expect(page.locator('.lab-result-number')).toContainText('—');
  await page.getByRole('button', { name: 'Bench readings', exact: true }).first().click();
  await page.getByLabel('Student / group', { exact: true }).fill('First-year practical · Group 04');
  await page.getByLabel('Observations & conclusion', { exact: true }).fill('T squared is proportional to length.');
  await page.screenshot({ path: 'artifacts/labs/pendulum-analysis-desktop.png', fullPage: true });
  await page.getByRole('tab', { name: 'Experiment', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.lab-analysis-panel')).toBeVisible();
  await expect(page.locator('.lab-notebook')).toBeVisible();
  await expect(page.locator('.lab-print-notes')).toContainText('T squared is proportional to length.');
  await page.pdf({ path: 'artifacts/labs/pendulum-sample-report.pdf', format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'Delete reading 1', exact: true }).click();
  await expect(page.locator('.lab-observations tbody tr')).toHaveCount(2);
});

test('Hooke and Ohm labs record and recover their model constants independently', async ({ page }) => {
  for (const exp of [
    { id: 'hookes-law', input: 'Hanging mass', values: ['100', '200', '300'], result: '20.000' },
    { id: 'ohms-law', input: 'Supply voltage', values: ['2', '4', '6'], result: '100.000' },
  ]) {
    await enter(page, exp.id);
    for (const value of exp.values) {
      await setRange(page, exp.input, value);
      await page.getByRole('button', { name: 'Record observation', exact: true }).click();
    }
    await expect(page.locator('.lab-observations tbody tr')).toHaveCount(3);
    await page.getByRole('tab', { name: /Analysis/ }).click();
    await expect(page.locator('.lab-result-number')).toContainText(exp.result);
    await page.getByRole('tab', { name: 'Lab manual', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Procedure', exact: true })).toBeVisible();
    await page.screenshot({ path: `artifacts/labs/${exp.id}-manual.png`, fullPage: true });
  }
});

test('desktop, mobile, Sorani RTL, and dark mode retain readable controls without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await enter(page);
  const start = await page.getByRole('button', { name: 'Start measurement', exact: true }).boundingBox();
  expect(start!.y + start!.height).toBeLessThanOrEqual(768);
  await page.screenshot({ path: 'artifacts/labs/pendulum-laptop.png' });
  expect((await new AxeBuilder({ page }).include('.physics-labs').analyze()).violations.map(v => v.id)).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  for (const lang of ['en', 'ku']) {
    if (lang === 'ku') await page.getByRole('button', { name: 'گۆڕینی زمان بۆ کوردی' }).click();
    await expect(page.locator('.physics-labs')).toHaveAttribute('dir', lang === 'en' ? 'ltr' : 'rtl');
    const width = await page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(width.scroll).toBeLessThanOrEqual(width.inner + 1);
    await page.screenshot({ path: `artifacts/labs/pendulum-mobile-${lang}.png`, fullPage: true });
    const violations = (await new AxeBuilder({ page }).include('.physics-labs').analyze()).violations;
    expect(violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: 'artifacts/labs/pendulum-mobile-dark.png', fullPage: true });
  const violations = (await new AxeBuilder({ page }).include('.physics-labs').analyze()).violations;
  expect(violations.map(v => v.id)).toEqual([]);
});

test('large angles display model bias guidance and tabs support keyboard navigation', async ({ page }) => {
  await enter(page);
  await setRange(page, 'Release angle', '30');
  await expect(page.getByText(/Large-angle motion:/)).toBeVisible();
  await page.getByLabel('Teaching view', { exact: true }).check();
  await expect(page.locator('.lab-prediction')).toContainText('Predicted period');
  await page.getByRole('tab', { name: 'Experiment', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Analysis', exact: true })).toBeFocused();
  await expect(page.locator('.lab-analysis-panel')).toBeVisible();
});

test('Labs stays reachable from tablet and desktop site navigation', async ({ page }) => {
  for (const width of [1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/tools');
    await expect(page.getByRole('heading', { name: 'Medical Physics Tools' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    if (width < 1280) await page.getByRole('button', { name: 'Open Menu', exact: true }).click();
    await page.getByRole('link', { name: 'Labs', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Physics labs' })).toBeVisible();
  }
});

test('3D electrical bench, output switch, camera, and diagram share one measurement state', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await enter(page, 'ohms-law');
  await expect(page.locator('.lab-three-viewport canvas[data-rendered="true"]')).toBeVisible();
  await expect(page.getByTestId('bench-primary-reading')).toHaveText('30.00mA');
  await page.getByRole('switch', { name: 'Supply output', exact: true }).click();
  await expect(page.getByTestId('bench-primary-reading')).toHaveText('0.00mA');
  await expect(page.getByRole('button', { name: 'Record observation', exact: true })).toBeDisabled();
  await page.getByRole('switch', { name: 'Supply output', exact: true }).click();
  await setRange(page, 'Supply voltage', '6');
  await expect(page.getByTestId('bench-primary-reading')).toHaveText('60.00mA');
  await page.getByRole('button', { name: 'Close-up', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close-up', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'artifacts/labs/ohm-3d-closeup.png' });
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await page.screenshot({ path: 'artifacts/labs/ohm-3d-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Diagram', exact: true }).click();
  await expect(page.locator('.lab-three-viewport')).toHaveCount(0);
  await expect(page.getByTestId('bench-primary-reading')).toHaveText('60.00mA');
  await page.getByRole('button', { name: 'Record observation', exact: true }).click();
  await expect(page.locator('.lab-observations tbody tr')).toContainText('0.0600');
  expect((await new AxeBuilder({ page }).include('.physics-labs').analyze()).violations.map(v => v.id)).toEqual([]);
  expect(errors).toEqual([]);
});

test('a changing spring load settles before a reading can be recorded', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await enter(page, 'hookes-law');
  await expect(page.locator('.lab-three-viewport canvas[data-rendered="true"]')).toBeVisible();
  await setRange(page, 'Hanging mass', '300');
  await expect(page.getByRole('button', { name: 'Record observation', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Record observation', exact: true })).toBeEnabled({ timeout: 15000 });
  await expect(page.getByTestId('bench-primary-reading')).toHaveText('14.71cm');
  await page.getByRole('button', { name: 'Record observation', exact: true }).click();
  await expect(page.locator('.lab-observations tbody tr')).toContainText('0.1471');
  await page.getByRole('button', { name: 'Front', exact: true }).click();
  await page.screenshot({ path: 'artifacts/labs/hooke-3d-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Close-up', exact: true }).click();
  await page.screenshot({ path: 'artifacts/labs/hooke-3d-ruler.png' });
  expect((await new AxeBuilder({ page }).include('.physics-labs').analyze()).violations.map(v => v.id)).toEqual([]);
});

test('white surfaces remain white and both 3D experiments fit a Sorani mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of ['hookes-law', 'ohms-law']) {
    await enter(page, id);
    await page.getByRole('button', { name: 'گۆڕینی زمان بۆ کوردی' }).click();
    await expect(page.locator('.lab-three-viewport canvas[data-rendered="true"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    expect(await page.locator('.physics-labs').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
    await page.screenshot({ path: `artifacts/labs/${id}-3d-mobile-ku.png`, fullPage: true });
    expect((await new AxeBuilder({ page }).include('.physics-labs').analyze()).violations.map(v => v.id)).toEqual([]);
  }
});
