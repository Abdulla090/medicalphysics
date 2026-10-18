import { expect, type Page } from '@playwright/test';


const viewport = (page: Page) => page.locator('.sim-three-room canvas');
export async function pose(page: Page): Promise<number[]> {
  return JSON.parse((await viewport(page).getAttribute('data-observer-position'))!);
}

/** Send actual secondary-button look gestures; diagnostics are read-only. */
export async function lookAt(page: Page, point: number[]) {
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

export async function walkTo(page: Page, x: number, z: number, stopWhenComplete=false) {
  await viewport(page).focus();
  // A continuously held key can overshoot while a software GPU delays the CDP
  // poll/keyup round trip. Each actual keyboard pulse releases before telemetry
  // is read, then the next pulse re-aims from the real stopped camera position.
  for (let pulse = 0; pulse < 45; pulse++) {
    if(stopWhenComplete&&await page.locator('.cg-shell').getAttribute('data-game-stage')==='complete')return;
    const position = await pose(page);
    if (Math.hypot(position[0] - x, position[2] - z) < .15) break;
    try{await lookAt(page, [x, position[1], z]);}catch(error){if(stopWhenComplete&&await page.locator('.cg-shell').getAttribute('data-game-stage')==='complete')return;throw error;}
    await viewport(page).focus();
    try { await page.keyboard.press('w', { delay: Math.min(600,Math.max(70,Math.hypot(position[0]-x,position[2]-z)/1.7*650)) }); }
    finally { await page.keyboard.up('w'); }
  }
  const arrived = await pose(page);
  expect(Math.hypot(arrived[0] - x, arrived[2] - z),`Walk to ${x}, ${z}; actual ${arrived.join(', ')}`).toBeLessThan(.5);
}

