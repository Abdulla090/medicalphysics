import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const viewport = (page: Page) => page.locator('.sim-three-room canvas');
async function pose(page: Page): Promise<number[]> {
  return JSON.parse((await viewport(page).getAttribute('data-observer-position'))!);
}

/** Send actual secondary-button look gestures; diagnostics are read-only. */
async function lookAt(page: Page, point: number[]) {
  const canvas = viewport(page);
  const position = await pose(page);
  const dx = point[0] - position[0], dy = point[1] - position[1], dz = point[2] - position[2];
  const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
  const currentYaw = Number(await canvas.getAttribute('data-observer-yaw'));
  const currentPitch = Number(await canvas.getAttribute('data-observer-pitch'));
  const deltaYaw = Math.atan2(Math.sin(yaw - currentYaw), Math.cos(yaw - currentYaw));
  let moveX = -deltaYaw / .0031, moveY = (currentPitch - pitch) / .0031;
  const box = (await canvas.boundingBox())!;
  while (Math.abs(moveX) + Math.abs(moveY) > .01) {
    const stepX = Math.max(-160, Math.min(160, moveX));
    const stepY = Math.max(-140, Math.min(140, moveY));
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(box.x + box.width * .5 + stepX, box.y + box.height * .5 + stepY, { steps: 2 });
    await page.mouse.up({ button: 'right' });
    moveX -= stepX; moveY -= stepY;
  }
  await expect.poll(async () => Number(await canvas.getAttribute('data-observer-pitch'))).toBeCloseTo(pitch, 2);
  await expect.poll(async () => {
    const actualYaw = Number(await canvas.getAttribute('data-observer-yaw'));
    return Math.atan2(Math.sin(actualYaw - yaw), Math.cos(actualYaw - yaw));
  }).toBeCloseTo(0, 2);
}

async function walkTo(page: Page, x: number, z: number) {
  await viewport(page).focus();
  if ((await pose(page))[1] > 1.3) {
    await viewport(page).press('c');
    await expect.poll(async () => (await pose(page))[1]).toBeCloseTo(1.12, 2);
  }
  // A continuously held key can overshoot while a software GPU delays the CDP
  // poll/keyup round trip. Each actual keyboard pulse releases before telemetry
  // is read, then the next pulse re-aims from the real stopped camera position.
  for (let pulse = 0; pulse < 30; pulse++) {
    const position = await pose(page);
    if (Math.hypot(position[0] - x, position[2] - z) < .15) break;
    await lookAt(page, [x, position[1], z]);
    await viewport(page).focus();
    try { await page.keyboard.press('w', { delay: 600 }); }
    finally { await page.keyboard.up('w'); }
  }
  const arrived = await pose(page);
  expect(Math.hypot(arrived[0] - x, arrived[2] - z)).toBeLessThan(.5);
}

test('operates the room by walking, aiming, grabbing and acquiring at the protected console', async ({ page }) => {
  test.skip(process.env.XRAY_ROOM_WALKTHROUGH !== '1', 'Extended room walkthrough is opt-in while software-renderer input timing remains under review.');
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tools/xray-simulator');
  await expect(viewport(page)).toHaveAttribute('data-observer-position', /\[/);
  await expect(page.locator('.sim-three-room')).toHaveAttribute('data-camera-view', 'first-person');
  await expect(page.locator('.sim-world-safety')).toContainText('Outside protected');
  const accessibility = await new AxeBuilder({ page }).include('.sim-app').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.failureSummary) }))).toEqual([]);
  await page.screenshot({ path: 'artifacts/simulator/first-person-room.png' });

  await walkTo(page, 1.35, .2);
  await lookAt(page, [.65, 1.35, -.35]);
  await expect(page.locator('.sim-world-target')).toHaveAttribute('data-world-target', 'tube');
  const box = (await viewport(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.locator('.sim-crosshair')).toHaveClass(/is-holding/);
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('.sim-crosshair')).not.toHaveClass(/is-holding/);
  // The captured state must reflect the source moved by hand, rather than a console edit.
  await viewport(page).press('t');
  await expect(page.locator('.sim-world-dial')).toContainText('Tube current');

  await walkTo(page, 1.35, -1.35);
  await lookAt(page, [.65, 1.15, -2.025]);
  await expect(page.locator('.sim-world-target')).toHaveAttribute('data-world-target', 'patient');
  await viewport(page).press('r');
  await viewport(page).press('b');
  await viewport(page).press('b');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();

  await walkTo(page, 2.25, -1.4);
  await lookAt(page, [2.25, 1.05, -2.65]);
  await expect(page.locator('.sim-world-target')).toHaveAttribute('data-world-target', '');
  await viewport(page).press('e');
  await expect(page.locator('.sim-app')).toHaveAttribute('data-exposure-state', 'idle');
  await expect(page.locator('.sim-world-safety')).toContainText('Outside protected');
  await walkTo(page, 1.35, -1.35);

  await walkTo(page, 1.35, -2.15);
  await lookAt(page, [.99, 1.25, -2.12]);
  await expect(page.locator('.sim-world-target')).toHaveAttribute('data-world-target', 'detector');
  await viewport(page).press('e'); // Disarm, then arm the actual receptor.
  await expect(page.locator('.sim-statusbar')).toContainText('Settings updated');
  await viewport(page).press('e');

  await walkTo(page, 2.25, -2.15);
  await lookAt(page, [2.25, 1.05, -2.65]);
  await expect(page.locator('.sim-world-target')).toHaveAttribute('data-world-target', 'console');
  await expect(page.locator('.sim-world-safety')).toContainText('Behind closed protective barrier');
  await viewport(page).press('e');
  await expect(page.locator('.sim-app')).toHaveAttribute('data-exposure-state', 'prepared');
  await viewport(page).press('e');
  await expect(page.getByRole('button', { name: 'Review Chest PA acquisition 1', exact: true })).toBeVisible();
  await viewport(page).press('v');
  await expect(page.getByRole('dialog', { name: 'Chest PA', exact: true })).toBeVisible();
  await expect(page.locator('.sim-film-meta')).toContainText('190 cm');
  await expect(page.locator('.sim-image-settings')).toContainText('Raised');
  await expect(page.locator('.sim-image-settings')).toContainText('4.8 / 0.0 cm');
  await page.screenshot({ path: 'artifacts/simulator/first-person-acquisition.png' });
  expect(errors).toEqual([]);
});
