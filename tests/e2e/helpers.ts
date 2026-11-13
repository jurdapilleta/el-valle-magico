import { expect, type Page } from '@playwright/test';
import { GAMES } from '../../src/games/configs';
import { ZONES, type ZoneId } from '../../src/world/zones/defs';

export const stage = (page: Page) => page.locator('.stage');

/**
 * Loads the game and performs the start gesture. `fast` shortens the silent
 * placeholder voice lines so a whole game plays in seconds.
 */
export async function start(page: Page, fast = false): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(fast ? '/?fastvoice' : '/');
  await expect(stage(page)).toHaveAttribute('data-state', 'boot');
  await page.getByRole('button', { name: 'Toca para empezar' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle');
  // Taps in the 3D world only land once the zone's contents have been drawn:
  // more draw calls than the bare ground, then two more frames for good measure.
  await expect
    .poll(() => page.evaluate(() => window.__valle!.renderInfo().calls), { timeout: 20_000 })
    .toBeGreaterThan(10);
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
  return errors;
}

/** Opens Luna's menu and picks a destination by its label; waits until she has arrived. */
export async function travelByMenu(page: Page, label: string, zone: string): Promise<void> {
  await page.getByRole('button', { name: 'Luna', exact: true }).click();
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(stage(page)).toHaveAttribute('data-zone', zone, { timeout: 30_000 });
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle', { timeout: 10_000 });
}

const screenPoint = (page: Page, x: number, z: number, y = 0) =>
  page.evaluate(([px, pz, py]) => window.__valle!.screenPoint(px!, pz!, py), [x, z, y]);

/** Taps a spot in the 3D world, given in zone metres. */
export async function tapWorld(page: Page, x: number, z: number, y = 0): Promise<void> {
  const point = await screenPoint(page, x, z, y);
  await page.mouse.click(point![0], point![1]);
}

/** Taps the portal to `to` in the 3D world and waits until Luna has stepped through. */
export async function walkThrough(page: Page, to: ZoneId): Promise<void> {
  const from = (await stage(page).getAttribute('data-zone')) as ZoneId;
  const portal = ZONES[from].portals.find((p) => p.to === to)!;
  await page.waitForTimeout(700);
  await tapWorld(page, portal.x, portal.z, 1.2);
  await expect(stage(page)).toHaveAttribute('data-zone', to, { timeout: 40_000 });
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle', { timeout: 10_000 });
}

/** Zones to walk through from the hub. */
const ROUTES: Record<ZoneId, ZoneId[]> = {
  hub: [],
  castillo: ['castillo'],
  granja: ['granja'],
  bosque: ['bosque'],
  lago: ['lago'],
  pradera: ['lago', 'pradera'],
};

/**
 * Walks from the hub to a game's zone, taps the game's entrance in the 3D
 * world, and accepts the host's invitation.
 */
export async function enterGame(page: Page, id: string): Promise<void> {
  const zone = GAMES[id]!.zone as ZoneId;
  const here = (await stage(page).getAttribute('data-zone')) as ZoneId;
  for (const to of ROUTES[zone]) {
    if (to !== here) await walkThrough(page, to);
  }
  const entrance = ZONES[zone].games.find((g) => g.id === id)!;
  await page.waitForTimeout(700);
  await tapWorld(page, entrance.x, entrance.z, 1.2);
  await expect(stage(page)).toHaveAttribute('data-state', 'world.invite', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Sí, jugar' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', /^game\./);
}

/**
 * Plays the current game to the end with real taps and drags, asking the game
 * only where the right answer is. Returns how many moves it made.
 */
export async function playToEnd(page: Page): Promise<number> {
  let moves = 0;
  const inGame = async () =>
    (await stage(page).getAttribute('data-state'))?.startsWith('game') ?? false;
  // Let the camera settle on the stage.
  await page.waitForTimeout(1500);
  let lastSeen = '';
  let lastChange = Date.now();
  while (await inGame()) {
    const { solution, cards, round } = await page.evaluate(() => ({
      solution: window.__valle!.solution(),
      cards: window.__valle!.round().cards,
      round: window.__valle!.round(),
    }));
    // The same moves still pending after 45 s means a tap or drag is not registering.
    const seen = JSON.stringify([round, solution.map((m) => m.key)]);
    if (seen !== lastSeen) {
      lastSeen = seen;
      lastChange = Date.now();
    } else if (Date.now() - lastChange > 45_000) {
      throw new Error(`Game is stuck: ${seen}`);
    }
    if (solution.length === 0) {
      await page.waitForTimeout(250);
      continue;
    }
    for (const move of solution) {
      if (move.drag) {
        const [from, to] = move.drag as [number[], number[]];
        await page.mouse.move(from[0]!, from[1]!);
        await page.mouse.down();
        await page.mouse.move((from[0]! + to[0]!) / 2, (from[1]! + to[1]!) / 2, { steps: 6 });
        await page.mouse.move(to[0]!, to[1]!, { steps: 6 });
        await page.mouse.up();
      } else if (cards && move.key.startsWith('choice:')) {
        await page.locator(`[data-item="${move.key.slice(7)}"]`).click();
      } else if (move.tap) {
        await page.mouse.click(move.tap[0]!, move.tap[1]!);
      }
      moves++;
      await page.waitForTimeout(220);
    }
    await page.waitForTimeout(300);
  }
  return moves;
}
