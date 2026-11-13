import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ZONE_IDS, ZONES } from '../../src/world/zones/defs';

// GAME_DESIGN §5.3 budgets, checked from the asset manifest written by
// `npm run assets` and from the scenery each zone actually instances. The
// end-to-end tests measure the real renderer on top of this.
type Manifest = { models: Record<string, { triangles: number; bytes: number }> };

const root = join(__dirname, '..', '..');
const { models } = JSON.parse(
  readFileSync(join(root, 'public/models/manifest.json'), 'utf8'),
) as Manifest;

/** Upper bound for one code-built unicorn (seven merged parts). */
const UNICORN_TRIANGLES = 3600;
const UNICORN_DRAW_CALLS = 7;
/** Allowance for a zone's code-built decor, host, portals and waypoints. */
const DECOR_TRIANGLES = 25_000;
const DECOR_DRAW_CALLS = 45;

function folderBytes(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
    const path = join(dir, entry.name);
    return sum + (entry.isDirectory() ? folderBytes(path) : statSync(path).size);
  }, 0);
}

describe.each(ZONE_IDS)('performance budgets: %s', (id) => {
  const scenery = ZONES[id].scenery(1);
  const triangles = scenery.reduce(
    (sum, set) => sum + (models[set.model]?.triangles ?? 0) * set.placements.length,
    0,
  );

  it('uses only models that are in the manifest', () => {
    for (const set of scenery) expect(models[set.model], set.model).toBeDefined();
  });

  it('stays under 100k triangles, even with a ten-unicorn round on stage', () => {
    const herd = ZONES[id].games.length > 0 ? 10 * UNICORN_TRIANGLES : 0;
    expect(triangles + DECOR_TRIANGLES + UNICORN_TRIANGLES + herd).toBeLessThanOrEqual(100_000);
  });

  it('stays under 120 draw calls', () => {
    // One instanced call per scenery set, plus Luna, ground and tap marker.
    const world = scenery.length + DECOR_DRAW_CALLS + UNICORN_DRAW_CALLS + 2;
    expect(world).toBeLessThanOrEqual(120);
    // In a game the portals, waypoints and host are hidden; the herd and its numerals appear.
    const game = scenery.length + 15 + 11 * UNICORN_DRAW_CALLS + 2 + 10;
    if (ZONES[id].games.length > 0) expect(game).toBeLessThanOrEqual(120);
  });

  it('halves instanced scenery on the low tier', () => {
    const count = (density: number) =>
      ZONES[id].scenery(density).reduce((sum, set) => sum + set.placements.length, 0);
    expect(count(0.5)).toBeLessThan(count(1) * 0.65);
  });

  it('fits the 6 MB per-zone download budget', () => {
    const used = new Set(scenery.map((set) => set.model));
    const bytes = [...used].reduce((sum, name) => sum + models[name]!.bytes, 0);
    expect(bytes).toBeLessThanOrEqual(6 * 1024 * 1024);
  });
});

describe('audio budget', () => {
  it('stays under 40 MB', () => {
    expect(folderBytes(join(root, 'public/audio'))).toBeLessThanOrEqual(40 * 1024 * 1024);
  });
});
