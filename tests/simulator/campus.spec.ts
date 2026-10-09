import { expect, test, type Page } from '@playwright/test';

async function enterDepartment(page: Page) {
  await page.goto('/tools/xray-simulator');
  // Software WebGL on CI has a slower initial shader compile than hardware
  // acceleration. Check the real first render, not just canvas attachment.
  await expect(page.locator('.sim-three-room canvas')).toHaveAttribute('data-observer-position', /\[/, { timeout: 75000 });
  await expect(page.locator('.sim-three-room')).toHaveAttribute('data-camera-view', 'first-person');
}

test('first-person department starts as a focused game at the reception desk', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await enterDepartment(page);
  await expect(page.getByRole('region', { name: 'Current mission' })).toContainText('Register your patient');
  await expect(page.getByRole('button', { name: /Interact: Register patient/ })).toBeVisible();
  await expect(page.locator('.sim-learning')).toBeHidden();
  await expect(page.locator('.sim-campus-map')).toBeHidden();
  await expect(page.locator('.sim-console')).toBeHidden();
  await expect(page.locator('.sim-acquisitions')).toBeHidden();
  await page.getByRole('button', { name: 'Open case information' }).click();
  const encounter = page.getByRole('dialog', { name: 'Clinical encounter details' });
  await expect(encounter).toContainText('TRAINING ID');
  await expect(encounter).toContainText('LEARNING OBJECTIVE');
  await page.keyboard.press('Escape');
  await expect(encounter).toBeHidden();
  const position = JSON.parse(await page.locator('.sim-three-room canvas').getAttribute('data-observer-position') ?? '[]') as number[];
  expect(position[0]).toBeGreaterThan(4.8);
  expect(position[2]).toBeGreaterThan(4.2);
  await page.getByRole('button', { name: /Interact: Register patient/ }).click();
  const reception = page.getByRole('dialog', { name: 'Meet your patient.' });
  await expect(reception).toBeVisible();
  await expect(reception).toContainText('Alex Morgan');
  await page.screenshot({ path: 'artifacts/simulator/game-registration-desktop.png' });
  expect(errors).toEqual([]);
});

test('mobile gameplay remains navigable without the old interface clutter', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterDepartment(page);
  await expect(page.getByRole('button', { name: 'Walk forward' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Current mission' })).toBeVisible();
  await expect(page.locator('.sim-learning')).toBeHidden();
  await expect(page.getByRole('button', { name: /Interact: Register patient/ })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    actual: document.documentElement.scrollWidth,
  }));
  expect(dimensions.actual).toBeLessThanOrEqual(dimensions.viewport + 1);
  await page.screenshot({ path: 'artifacts/simulator/game-mobile.png', fullPage: true });
});
