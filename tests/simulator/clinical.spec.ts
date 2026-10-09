import { expect, test } from '@playwright/test';

test('registration sets a real patient journey and starts gown preparation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tools/xray-simulator');
  await expect(page.getByRole('button', { name: /Interact: Register patient/ })).toBeVisible({ timeout: 75000 });
  await page.evaluate(() => {
    const observable = window as typeof window & { journeyArrivals?: string[] };
    observable.journeyArrivals = [];
    window.addEventListener('xray-patient-arrived', event => observable.journeyArrivals?.push((event as CustomEvent<string>).detail));
  });
  await page.getByRole('button', { name: /Interact: Register patient/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Meet your patient.' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox', { name: 'ACTIVE APPOINTMENT' }).selectOption('lateral-followup');
  await expect(dialog).toContainText('EDU-DR-2402');
  await expect(dialog.getByRole('button', { name: 'Complete registration' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Ask full name' }).click();
  await dialog.getByRole('textbox', { name: 'Full name stated by patient' }).fill('Jordan Lee');
  await dialog.getByRole('button', { name: 'Verify spoken full name' }).click();
  await dialog.getByRole('button', { name: 'Ask hospital ID' }).click();
  await dialog.getByRole('textbox', { name: 'Identifier stated by patient' }).fill('EDU 0836');
  await dialog.getByRole('button', { name: 'Verify spoken hospital identifier' }).click();
  await dialog.getByRole('button', { name: 'Discuss referral' }).click();
  await dialog.getByRole('button', { name: 'Ask for agreement' }).click();
  await expect(dialog.getByRole('button', { name: 'Complete registration' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Complete registration' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('region', { name: 'Current mission' })).toContainText('Prepare for the examination');
  await expect(page.getByRole('region', { name: 'Current mission' })).toContainText('CHANGING ROOM');
  await expect(page.locator('.sim-app')).toHaveAttribute('data-game-stage', 'changing');
  await expect.poll(() => page.evaluate(() => (window as typeof window & { journeyArrivals?: string[] }).journeyArrivals ?? []), { timeout: 22000 }).toContain('changing');
  expect(errors).toEqual([]);
});

test('registration is usable on a phone without horizontal page scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools/xray-simulator');
  await expect(page.getByRole('button', { name: /Interact: Register patient/ })).toBeVisible();
  await page.getByRole('button', { name: /Interact: Register patient/ }).click();
  await expect(page.getByRole('dialog', { name: 'Meet your patient.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete registration' })).toBeDisabled();
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  await page.screenshot({ path: 'artifacts/simulator/game-registration-mobile.png' });
});
