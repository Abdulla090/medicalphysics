import { expect, test } from '@playwright/test';

test('clinical shift exposes an interactive OSCE coach and student journal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tools/xray-simulator');
  await expect(page.locator('.sim-three-room canvas')).toBeVisible({ timeout: 75000 });
  await page.getByRole('button', { name: 'Open radiography coach' }).click();
  const coach = page.getByRole('dialog', { name: /Before the beam/ });
  await expect(coach).toBeVisible();
  await expect(coach).toContainText('EDU-DR-2401');
  await expect(coach.getByRole('navigation', { name: 'Coach workflow' })).toBeVisible();
  await coach.getByRole('button', { name: 'Independent OSCE' }).click();
  await expect(coach.getByRole('button', { name: 'Independent OSCE' })).toHaveAttribute('aria-pressed', 'true');
  await coach.getByRole('button', { name: 'Close radiography coach' }).click();
  await expect(coach).toBeHidden();
  await page.getByRole('button', { name: 'Open clinical instructor' }).click();
  await expect(page.getByRole('dialog', { name: 'Think like a radiographer.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('phone shift retains accessible OSCE actions without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools/xray-simulator');
  await expect(page.getByRole('button', { name: 'Open radiography coach' })).toBeVisible({ timeout: 75000 });
  await page.getByRole('button', { name: 'Open radiography coach' }).click();
  await expect(page.getByRole('dialog', { name: /Before the beam/ })).toBeVisible();
  const width = await page.evaluate(() => ({ inner: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.inner + 1);
});
