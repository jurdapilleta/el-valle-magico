import { expect, test } from '@playwright/test';
import { GAME_LIST } from '../../src/games/configs';
import { enterGame, playToEnd, stage, start, walkThrough } from './helpers';

test.setTimeout(240_000);

// On the phone project, one game of each interaction style is enough; the
// laptop project plays all sixteen.
const ON_PHONE = new Set(['count-unicorns', 'jewels', 'pairs', 'homes']);

// Phase 3 acceptance: for every game, enter, answer correctly to the end, exit.
for (const game of GAME_LIST) {
  test(`${game.id}: enter, answer every round correctly, earn the sticker`, async ({
    page,
  }, info) => {
    test.skip(info.project.name === 'phone' && !ON_PHONE.has(game.id), 'covered on laptop');
    const errors = await start(page, true);
    await enterGame(page, game.id);
    const moves = await playToEnd(page);
    expect(moves).toBeGreaterThanOrEqual(game.roundsPerGame);

    // Back in the world, in the same zone, with the sticker and a completed play saved.
    await expect(stage(page)).toHaveAttribute('data-state', 'world.idle', { timeout: 15_000 });
    await expect(stage(page)).toHaveAttribute('data-zone', game.zone);
    const saved = await page.evaluate(() => window.__valle!.progress());
    expect(saved.stickers).toContain(game.sticker);
    expect(saved.progress[game.id]).toMatchObject({ plays: 1, completions: 1 });
    for (const code of game.objectives) {
      expect(saved.objectives[code], code).toHaveLength(game.roundsPerGame);
      expect(saved.objectives[code]!.every(Boolean), `${code} all first try`).toBe(true);
    }

    // §5.3 budgets held while the game was on stage.
    const info3d = await page.evaluate(() => window.__valle!.renderInfo());
    expect(info3d.calls).toBeLessThanOrEqual(120);
    expect(info3d.triangles).toBeLessThanOrEqual(100_000);
    expect(errors).toEqual([]);
  });
}

test('a wrong answer wiggles and the round carries on; the sticker survives a reload', async ({
  page,
}) => {
  await start(page, true);
  await enterGame(page, 'count-unicorns');
  const round = () => page.evaluate(() => window.__valle!.round());

  await expect.poll(() => round().then((r) => r.step), { timeout: 30_000 }).toBe('tap-all');
  await page.waitForTimeout(3500);
  const { quantity } = await round();
  for (const move of await page.evaluate(() => window.__valle!.solution())) {
    await page.mouse.click(move.tap![0]!, move.tap![1]!);
    await page.waitForTimeout(250);
  }
  await expect.poll(() => round().then((r) => r.step)).toBe('choose-one');

  const wrong = page
    .locator('.card')
    .filter({ hasNotText: String(quantity) })
    .first();
  await wrong.click();
  await expect(page.locator('.card.wiggle')).toHaveCount(1);
  await expect(stage(page)).toHaveAttribute('data-state', 'game.round');
  await page.getByRole('button', { name: `Número ${quantity}`, exact: true }).click();
  await expect(page.locator('.stars .on')).toHaveCount(1);

  await playToEnd(page);
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle', { timeout: 15_000 });
  // The missed round is recorded as not-first-try for the parent area.
  const saved = await page.evaluate(() => window.__valle!.progress());
  expect(saved.objectives['NUM-3']).toEqual([false, true, true, true, true]);

  await page.reload();
  await page.getByRole('button', { name: 'Toca para empezar' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle');
  await page.getByRole('button', { name: 'Álbum de calcomanías' }).click();
  await page.getByRole('button', { name: 'Página siguiente' }).click();
  await expect(page.getByRole('button', { name: 'Calcomanía count-unicorns' })).toBeVisible();
});

test('tapping Luna leaves a game at any point', async ({ page }) => {
  await start(page, true);
  await enterGame(page, 'balloons');
  await page.getByRole('button', { name: 'Salir con Luna' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle');
  await expect(stage(page)).toHaveAttribute('data-zone', 'castillo');
  const saved = await page.evaluate(() => window.__valle!.progress());
  expect(saved.stickers).toEqual([]);
});

test("Luna's menu offers the zone's least-played game", async ({ page }) => {
  await start(page, true);
  await walkThrough(page, 'castillo');
  await page.getByRole('button', { name: 'Luna', exact: true }).click();
  await page.getByRole('button', { name: 'Jugar a los globos' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'world.invite', { timeout: 20_000 });
});
