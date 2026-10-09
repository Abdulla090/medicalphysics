import { expect, test } from '@playwright/test';

test('clinical instructor follows the case and grades case-based learning', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tools/xray-simulator');
  await page.getByRole('button', { name: 'Open clinical instructor' }).click();
  const tutor = page.getByRole('dialog', { name: 'Think like a radiographer.' });
  await expect(tutor).toBeVisible();
  await expect(tutor).toContainText('EDU-DR-2401');
  await expect(tutor.getByRole('navigation', { name: 'Teaching stages' }).getByRole('button')).toHaveCount(6);
  await expect(tutor.getByRole('button', { name: 'Grade this module' })).toBeDisabled();

  await tutor.getByRole('radio').nth(1).check();
  await tutor.getByRole('radio').nth(3).check();
  await tutor.getByRole('button', { name: 'Grade this module' }).click();
  await expect(tutor).toContainText('Knowledge self-check only');
  await expect(tutor.getByRole('button', { name: 'Try again' })).toBeEnabled();
  // Validate the actual dialog contract here. WCAG scanner runs separately in
  // the studio suite; its extra browser instance can stall SwiftShader tests.
  await expect(tutor).toHaveAttribute('aria-modal', 'true');
  await expect(tutor.getByRole('heading', { name: 'Think like a radiographer.' })).toBeVisible();
  await tutor.getByRole('button', { name: 'Close clinical teaching panel' }).click();

  await page.getByRole('button', { name: 'View shift record' }).click();
  const record = page.getByRole('dialog', { name: 'Clinical shift record' });
  await expect(record).toBeVisible();
  await expect(record).toContainText('knowledge check');
  const download = page.waitForEvent('download');
  await record.getByRole('button', { name: 'Export complete session JSON' }).click();
  expect((await download).suggestedFilename()).toMatch(/^medicalphysics-session-.*\.json$/);
  await record.getByRole('button', { name: 'Close shift record' }).click();
  expect(errors).toEqual([]);
});

test('teaching panel and shift record remain usable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools/xray-simulator');
  await page.getByRole('button', { name: 'Open clinical instructor' }).click();
  await expect(page.getByRole('dialog', { name: 'Think like a radiographer.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close clinical teaching panel' }).click();
  await page.getByRole('button', { name: 'View shift record' }).click();
  await expect(page.getByRole('dialog', { name: 'Clinical shift record' })).toBeVisible();
  const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(sizes.page).toBeLessThanOrEqual(sizes.viewport + 1);
});
