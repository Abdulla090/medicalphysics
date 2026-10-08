import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openStudio(page: Page, overview = true) {
  await page.goto('/tools/xray-simulator');
  await expect(page.getByRole('heading', { name: 'Radiography studio 01' })).toBeVisible();
  await expect(page.locator('.sim-three-room canvas')).toBeVisible();
  await expect(page.locator('.sim-scene-loading')).toHaveCount(0);
  // Wait for the software renderer to finish its first drawing, rather than a fixed delay.
  await expect.poll(() => page.locator('.sim-three-room canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBeGreaterThan(0);
  if (overview) await page.getByRole('button', { name: 'Room', exact: true }).click();
}

async function capture(page: Page, name: string, index: number) {
  await page.getByRole('button', { name: 'Prepare exposure', exact: true }).click();
  await expect(page.locator('.sim-app')).toHaveAttribute('data-exposure-state', 'prepared');
  await page.locator('.sim-expose-button').click();
  const image = page.getByRole('button', { name: `Review ${name} acquisition ${index}`, exact: true });
  await expect(image).toBeVisible();
  await expect(page.locator('.sim-app')).toHaveAttribute('data-exposure-state', 'idle');
  return image;
}

async function expectAccessible(page: Page, selector: string) {
  const result = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(result.violations.map((violation) => ({ id: violation.id, count: violation.nodes.length, nodes: violation.nodes.map((node) => ({ target: node.target, detail: node.failureSummary })) }))).toEqual([]);
}

test('acquires a real worker image, preserves technique, windows and exports labeled output', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openStudio(page);
  await page.screenshot({ path: 'artifacts/simulator/studio-desktop.png' });
  const image = await capture(page, 'Chest PA', 1);
  await page.getByRole('spinbutton', { name: 'Tube voltage', exact: true }).fill('125');
  await page.getByRole('spinbutton', { name: 'Tube voltage', exact: true }).press('Tab');
  await image.click();
  await expect(page.getByRole('dialog', { name: 'Chest PA' })).toBeVisible();
  await expect(page.locator('.sim-film-meta')).toContainText('110 kVp');
  const canvas = page.locator('.sim-film-scroll canvas');
  const stats = await canvas.evaluate((element: HTMLCanvasElement) => {
    const data = element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data;
    let max = 0, min = 255;
    for (let i = 0; i < data.length; i += 4) { max = Math.max(max, data[i]); min = Math.min(min, data[i]); }
    return { max, min, width: element.width, height: element.height };
  });
  expect(stats.width).toBe(512);
  expect(stats.max - stats.min).toBeGreaterThan(70);
  const before = await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
  await page.getByLabel('Invert grayscale', { exact: true }).check();
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL())).not.toBe(before);
  await page.getByRole('button', { name: 'Reset display', exact: true }).click();
  await expectAccessible(page, '.sim-image-dialog');
  await page.screenshot({ path: 'artifacts/simulator/chest-review.png' });
  const png = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export labeled PNG', exact: true }).click();
  expect((await png).suggestedFilename()).toMatch(/^synthetic-chest-pa-.*\.png$/);
  await page.getByRole('button', { name: 'Close image review' }).click();
  const session = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export session' }).click();
  expect((await session).suggestedFilename()).toMatch(/^medicalphysics-session-.*\.json$/);
  expect(errors).toEqual([]);
});

test('blocks both exposure interlocks and invalidates a prepared technique after an edit', async ({ page }) => {
  await openStudio(page);
  await page.getByRole('tab', { name: 'Patient', exact: true }).click();
  await page.getByLabel('Lead screen closed', { exact: false }).uncheck();
  await expect(page.getByRole('button', { name: 'Prepare exposure' })).toBeDisabled();
  await expect(page.locator('.sim-blocked-message')).toContainText('protective barrier');
  await page.getByLabel('Lead screen closed', { exact: false }).check();
  await page.getByLabel('Detector ready', { exact: false }).uncheck();
  await expect(page.getByRole('button', { name: 'Prepare exposure' })).toBeDisabled();
  await page.getByLabel('Detector ready', { exact: false }).check();
  await page.getByRole('button', { name: 'Prepare exposure' }).click();
  await expect(page.locator('.sim-app')).toHaveAttribute('data-exposure-state', 'prepared');
  await page.getByRole('tab', { name: 'Exposure', exact: true }).click();
  await page.getByRole('button', { name: 'Increase Tube voltage', exact: true }).click();
  await expect(page.locator('.sim-app')).toHaveAttribute('data-exposure-state', 'idle');
  await expect(page.locator('.sim-film-thumbnail')).toHaveCount(0);
});

test('renders anatomy and every camera mode, handles supine projection and graphics loss', async ({ page }) => {
  test.setTimeout(150_000);
  await openStudio(page);
  await page.getByRole('button', { name: 'Patient', exact: true }).click();
  await page.getByRole('button', { name: 'skeleton', exact: true }).click();
  await expect(page.getByRole('button', { name: 'skeleton', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'artifacts/simulator/skeleton-view.png' });
  for (const name of ['Tube', 'Detector', 'Walk']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.sim-three-room')).toHaveAttribute('data-camera-view', name === 'Walk' ? 'first-person' : name.toLowerCase());
  }
  await expect(page.getByRole('button', { name: 'Walk forward' })).toBeVisible();
  const roomCanvas = page.locator('.sim-three-room canvas');
  const beforeWalking = await page.screenshot();
  const beforePose = JSON.parse((await roomCanvas.getAttribute('data-observer-position'))!) as number[];
  await roomCanvas.focus();
  await expect(roomCanvas).toBeFocused();
  await page.keyboard.down('w');
  try {
    await expect.poll(async () => {
      const pose = JSON.parse((await roomCanvas.getAttribute('data-observer-position'))!) as number[];
      return Math.hypot(pose[0] - beforePose[0], pose[2] - beforePose[2]);
    }).toBeGreaterThan(0.3);
  } finally {
    await page.keyboard.up('w');
  }
  await expect(page.locator('.sim-world-brief')).toHaveCount(0);
  await expect.poll(async () => (await page.screenshot()).equals(beforeWalking)).toBe(false);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.locator('.sim-exam').filter({ hasText: 'Chest AP' }).click();
  await expect(page.locator('.sim-room-label')).toContainText('Table bucky');
  await page.getByRole('button', { name: 'surface', exact: true }).click();
  await page.screenshot({ path: 'artifacts/simulator/supine-view.png' });
  await capture(page, 'Chest AP', 1);
  await page.locator('.sim-three-room canvas').evaluate((canvas: HTMLCanvasElement) => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.getByText('The graphics connection was interrupted')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review Chest AP acquisition 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Reconnect 3D room' }).click();
  await expect(page.locator('.sim-three-room canvas')).toBeVisible();
});

test('keeps the scene and operator controls usable at a narrow mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStudio(page);
  await expect(page.getByLabel('Examination', { exact: true })).toBeVisible();
  await page.getByLabel('Examination', { exact: true }).selectOption('pelvis-ap');
  await expect(page.getByRole('heading', { name: 'Pelvis AP', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Walk', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Walk forward' })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.screenshot({ path: 'artifacts/simulator/studio-mobile.png', fullPage: true });
  const image = await capture(page, 'Pelvis AP', 1);
  await image.click();
  await expect(page.getByRole('button', { name: 'Export labeled PNG' })).toBeVisible();
  await page.getByRole('button', { name: 'Close image review' }).click();
});

test('exposes labeled, accessible controls with sufficient text contrast', async ({ page }) => {
  test.setTimeout(90_000);
  await openStudio(page);
  await expectAccessible(page, '.sim-app');
  const exposure = page.getByRole('tab', { name: 'Exposure', exact: true });
  await exposure.focus();
  await exposure.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Positioning', exact: true })).toBeFocused();
  await expectAccessible(page, '.sim-app');
  await page.getByRole('tab', { name: 'Patient', exact: true }).click();
  await expectAccessible(page, '.sim-app');
  await page.getByRole('button', { name: 'Prepare exposure', exact: true }).click();
  await expectAccessible(page, '.sim-app');
  await page.getByRole('button', { name: 'Model & validation', exact: true }).click();
  await expectAccessible(page, '.sim-info-dialog');
});
