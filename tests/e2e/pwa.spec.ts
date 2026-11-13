import { expect, test, type Page } from '@playwright/test';
import { enterGame, playToEnd, stage, start, walkThrough } from './helpers';

test.setTimeout(240_000);

/** Waits until the service worker controls the page and has finished caching everything. */
async function waitForOfflineReady(page: Page): Promise<number> {
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cached = () =>
    page.evaluate(async () => {
      let total = 0;
      for (const name of await caches.keys())
        total += (await (await caches.open(name)).keys()).length;
      return total;
    });
  // Done when the count has stopped growing.
  let last = -1;
  let stable = 0;
  for (let i = 0; i < 120 && stable < 3; i++) {
    const now = await cached();
    stable = now === last && now > 0 ? stable + 1 : 0;
    last = now;
    await page.waitForTimeout(500);
  }
  return last;
}

test('is installable: manifest, icons and a service worker', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(new URL(href!, page.url()).href)).json();

  expect(manifest.name).toBe('El Valle Mágico');
  expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  expect(['fullscreen', 'standalone']).toContain(manifest.display);
  expect(manifest.start_url).toBeTruthy();
  expect(manifest.lang).toBe('es');

  // Android needs 192 and 512 px icons plus a maskable one; each must really be that size.
  const sizes = new Map<string, string>();
  for (const icon of manifest.icons as { src: string; sizes: string; purpose?: string }[]) {
    const url = new URL(icon.src, new URL(href!, page.url())).href;
    const real = await page.evaluate(async (src) => {
      const bitmap = await createImageBitmap(await (await fetch(src)).blob());
      return `${bitmap.width}x${bitmap.height}`;
    }, url);
    expect(real, icon.src).toBe(icon.sizes);
    sizes.set(icon.purpose ?? 'any', icon.sizes);
  }
  expect([...sizes.keys()].sort()).toEqual(['any', 'maskable']);
  expect((manifest.icons as { sizes: string }[]).map((i) => i.sizes)).toContain('192x192');

  // iOS uses its own icon link.
  const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect((await request.get(new URL(touch!, page.url()).href)).ok()).toBe(true);

  await page.evaluate(() => navigator.serviceWorker.ready);
  expect(
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r)),
  ).toBe(true);
});

test('works with no network: reload, change zone and play a game offline', async ({
  page,
  context,
}) => {
  await page.goto('/');
  const cached = await waitForOfflineReady(page);
  expect(cached).toBeGreaterThan(50);

  await context.setOffline(true);
  const errors = await start(page, true);
  await expect(stage(page)).toHaveAttribute('data-zone', 'hub');
  await expect.poll(() => page.evaluate(() => window.__valle!.audio().sfxReady)).toBe(true);

  // A zone and a game that were never opened while online.
  await enterGame(page, 'balloons');
  await playToEnd(page);
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle', { timeout: 15_000 });
  const saved = await page.evaluate(() => window.__valle!.progress());
  expect(saved.stickers).toContain('balloons');
  expect((await page.evaluate(() => window.__valle!.audio())).music).toBe('castillo');

  await walkThrough(page, 'hub');
  await walkThrough(page, 'bosque');
  expect(errors).toEqual([]);
});

test('talks to no other server, and the first screen costs under 8 MB', async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin;
  const foreign: string[] = [];
  let firstLoadBytes = 0;
  let counting = true;
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith(origin) && !/^(data|blob):/.test(url)) foreign.push(url);
  });
  page.on('response', async (response) => {
    // The service worker caches the rest of the game in the background; that is not "first load".
    if (!counting || response.request().serviceWorker()) return;
    firstLoadBytes += (await response.body().catch(() => Buffer.alloc(0))).length;
  });

  await start(page, true);
  counting = false;
  await walkThrough(page, 'lago');
  await enterGame(page, 'faces');
  await page.getByRole('button', { name: 'Salir con Luna' }).click();

  // §5.4: no analytics, no ads, no accounts, no CDN.
  expect(foreign).toEqual([]);
  // §5.3: at most 8 MB before the first interactive frame.
  expect(firstLoadBytes).toBeGreaterThan(100_000);
  expect(firstLoadBytes).toBeLessThan(8 * 1024 * 1024);
});
