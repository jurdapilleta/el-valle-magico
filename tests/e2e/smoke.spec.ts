import { expect, test } from '@playwright/test';
import { stage, start } from './helpers';

test('start gesture unlocks audio and a tap walks Luna', async ({ page }) => {
  const errors = await start(page);
  await expect(stage(page)).toHaveAttribute('data-zone', 'hub');
  await expect.poll(() => page.evaluate(() => window.__valle!.audioUnlocked())).toBe(true);

  const before = await page.evaluate(() => window.__valle!.luna());
  const box = (await page.locator('canvas').boundingBox())!;
  // Open ground to the upper right, away from Luna in the centre.
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.5);
  await expect(stage(page)).toHaveAttribute('data-state', 'world.walking');
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle', { timeout: 20_000 });

  const after = await page.evaluate(() => window.__valle!.luna());
  expect(Math.hypot(after[0] - before[0], after[2] - before[2])).toBeGreaterThan(1);

  const info = await page.evaluate(() => window.__valle!.renderInfo());
  expect(info.calls).toBeGreaterThan(0);
  expect(info.calls).toBeLessThanOrEqual(120);
  expect(info.triangles).toBeLessThanOrEqual(150_000);
  expect(errors).toEqual([]);
});
