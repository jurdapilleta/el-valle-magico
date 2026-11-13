import { expect, test, type Page } from '@playwright/test';
import { ZONES } from '../../src/world/zones/defs';
import { stage, start, tapWorld, travelByMenu } from './helpers';

test.setTimeout(240_000);

/** Renderer budgets (§5.3) and load time for the zone just entered. */
async function checkZone(page: Page, zone: string): Promise<void> {
  // Let a couple of frames render so the counters describe this zone.
  await page.waitForTimeout(600);
  const { info, stats } = await page.evaluate(() => ({
    info: window.__valle!.renderInfo(),
    stats: window.__valle!.stats(),
  }));
  expect(info.calls, `${zone} draw calls`).toBeLessThanOrEqual(120);
  expect(info.triangles, `${zone} triangles`).toBeLessThanOrEqual(100_000);
  // Phase 2 acceptance: a zone loads in at most 3 s.
  expect(stats.lastLoadMs, `${zone} load time`).toBeLessThan(3000);
  expect(stats.lastLoadMs).toBeGreaterThan(0);
}

test('visits all five zones through portals and returns to the hub', async ({ page }) => {
  const errors = await start(page);

  // Luna's menu always offers the two least-visited neighbours.
  await travelByMenu(page, 'Ir al lago', 'lago');
  await checkZone(page, 'lago');
  await travelByMenu(page, 'Ir a la pradera de unicornios', 'pradera');
  await checkZone(page, 'pradera');
  await travelByMenu(page, 'Ir al lago', 'lago');
  await travelByMenu(page, 'Ir a la pradera central', 'hub');

  for (const [label, zone] of [
    ['Ir al castillo', 'castillo'],
    ['Ir a la granja', 'granja'],
    ['Ir al bosque nevado', 'bosque'],
  ] as const) {
    await travelByMenu(page, label, zone);
    await checkZone(page, zone);
    await travelByMenu(page, 'Ir a la pradera central', 'hub');
  }
  await checkZone(page, 'hub');
  expect(errors).toEqual([]);
});

test('a portal, a waypoint, a host and a prop all answer a tap in the 3D world', async ({
  page,
}) => {
  const errors = await start(page);
  const luna = () => page.evaluate(() => window.__valle!.luna());

  // Waypoint star in the hub: Luna walks onto it.
  await tapWorld(page, 6, -4, 0.6);
  await expect(stage(page)).toHaveAttribute('data-state', 'world.walking');
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle', { timeout: 15_000 });
  const at = await luna();
  expect(Math.hypot(at[0] - 6, at[2] + 4)).toBeLessThan(0.2);

  // The castle portal, tapped on the arch itself.
  const portal = ZONES.hub.portals.find((p) => p.to === 'castillo')!;
  await tapWorld(page, portal.x, portal.z, 1.5);
  await expect(stage(page)).toHaveAttribute('data-zone', 'castillo', { timeout: 30_000 });
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle', { timeout: 10_000 });

  // Princesa Estrella says hello when tapped.
  await page.waitForTimeout(800);
  const host = ZONES.castillo.host!;
  await tapWorld(page, host.x, host.z, 1);
  await expect
    .poll(() => page.evaluate(() => window.__valle!.stats().greets), {
      timeout: 15_000,
    })
    .toBe(1);
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle');

  // A balloon bunch is free play: it reacts but does not move Luna or change state.
  const before = await luna();
  await tapWorld(page, -3.5, -11, 2.4);
  await page.waitForTimeout(500);
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle');
  expect(await luna()).toEqual(before);
  expect(errors).toEqual([]);
});

test('Luna gives a spoken hint after 20 s without a touch', async ({ page }) => {
  await start(page);
  const hints = () => page.evaluate(() => window.__valle!.stats().idleHints);
  expect(await hints()).toBe(0);
  await expect.poll(hints, { timeout: 30_000, intervals: [1000] }).toBe(1);
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle');
});
