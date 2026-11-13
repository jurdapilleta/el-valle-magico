import { expect, test } from '@playwright/test';
import { stage, start, walkThrough } from './helpers';

const audio = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__valle!.audio());

test('music follows the zone, ducks under the voice and fades for rest', async ({ page }) => {
  const errors = await start(page);

  // The hub loop starts with the start gesture and settles at the music volume.
  await expect.poll(async () => (await audio(page)).music).toBe('hub');
  await expect
    .poll(async () => (await audio(page)).musicVolume, { timeout: 5000 })
    .toBeCloseTo(0.6, 1);
  expect((await audio(page)).sfxReady).toBe(true);

  // Luna speaks: the music drops by 12 dB (to about a quarter), then comes back.
  await page.getByRole('button', { name: 'Luna', exact: true }).click();
  await expect.poll(async () => (await audio(page)).speaking).toBe(true);
  await expect.poll(async () => (await audio(page)).musicVolume).toBeCloseTo(0.15, 1);
  await expect.poll(async () => (await audio(page)).speaking, { timeout: 10_000 }).toBe(false);
  await expect.poll(async () => (await audio(page)).musicVolume).toBeCloseTo(0.6, 1);
  await page.getByRole('button', { name: 'Luna', exact: true }).click();

  // Each zone has its own loop.
  await walkThrough(page, 'castillo');
  await expect.poll(async () => (await audio(page)).music).toBe('castillo');

  // Time to rest: the music fades right out, and returns when Luna wakes.
  await page.evaluate(() => window.__valle!.elapse(15 * 60 + 1));
  await expect(stage(page)).toHaveAttribute('data-state', 'rest');
  await expect.poll(async () => (await audio(page)).musicVolume, { timeout: 5000 }).toBe(0);
  await page.getByRole('button', { name: 'Luna descansa' }).click();
  await expect
    .poll(async () => (await audio(page)).musicVolume, { timeout: 5000 })
    .toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});
