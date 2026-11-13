import { describe, expect, it } from 'vitest';
import { ENTRY, ZONE_IDS, ZONES, type Point } from '../../src/world/zones/defs';

// From where Luna arrives, nothing tappable may hide the middle of something
// tappable behind it: a tap meant for a portal must not start a game instead.

type Target = Point & { name: string; radius: number };

/** The follow camera sits about 5.5 m behind Luna (§4.3). */
const CAMERA = { x: ENTRY.x, z: ENTRY.z + 5.5 };
/** Half-width of the view on a 16:9 screen with a 50° vertical field of view. */
const HALF_VIEW = Math.atan(Math.tan((25 * Math.PI) / 180) * (16 / 9));

function targets(id: (typeof ZONE_IDS)[number]): Target[] {
  const zone = ZONES[id];
  return [
    ...zone.portals.map((p) => ({ ...p, name: `portal→${p.to}`, radius: 2.1 })),
    ...zone.games.map((g) => ({ ...g, name: `game:${g.id}`, radius: 1.25 })),
    ...(zone.host ? [{ ...zone.host, name: 'host', radius: 1.3 }] : []),
    ...zone.waypoints.map((w, i) => ({ ...w, name: `waypoint ${i}`, radius: 1 })),
  ];
}

const distance = (t: Point) => Math.hypot(t.x - CAMERA.x, t.z - CAMERA.z);
const bearing = (t: Point) => Math.atan2(t.x - CAMERA.x, CAMERA.z - t.z);

describe.each(ZONE_IDS)('sightlines in %s', (id) => {
  const all = targets(id);

  it('shows every portal, game entrance and host on a 16:9 screen on arrival', () => {
    for (const t of all) expect(Math.abs(bearing(t)), t.name).toBeLessThan(HALF_VIEW);
  });

  it('never puts one tappable thing in front of the middle of another', () => {
    for (const near of all) {
      for (const far of all) {
        if (near === far || distance(near) >= distance(far)) continue;
        const cover = Math.asin(Math.min(1, near.radius / distance(near)));
        const apart = Math.abs(bearing(near) - bearing(far));
        expect(apart, `${near.name} hides ${far.name}`).toBeGreaterThan(cover);
      }
    }
  });
});
