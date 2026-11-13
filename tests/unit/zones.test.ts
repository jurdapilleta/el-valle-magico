import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { idleLine, idleTarget } from '../../src/world/idle';
import { stageOf } from '../../src/world/layout';
import { navFor, zoneBlocked } from '../../src/world/navmesh';
import {
  ENTRY,
  nextHop,
  portalApproach,
  standInFront,
  ZONE_IDS,
  ZONES,
  type Point,
  type ZoneId,
} from '../../src/world/zones/defs';

const v = (p: Point) => new Vector3(p.x, 0, p.z);

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Smallest distance from point p to segment ab, on the ground plane. */
function distanceToSegment(p: Point, a: Vector3, b: Vector3): number {
  const ab = b.clone().sub(a);
  const t = Math.max(0, Math.min(1, v(p).sub(a).dot(ab) / (ab.lengthSq() || 1)));
  return a.clone().addScaledVector(ab, t).distanceTo(v(p));
}

/** Where Luna can be standing when a walk starts: the way in, or in front of any portal. */
function startsOf(id: ZoneId): Point[] {
  return [ENTRY, ...ZONES[id].portals.map(portalApproach)];
}

describe('zone graph', () => {
  it('has the hub plus five zones, laid out as in the design', () => {
    expect(ZONE_IDS).toHaveLength(6);
    const links = (id: ZoneId) => ZONES[id].portals.map((p) => p.to).sort();
    expect(links('hub')).toEqual(['bosque', 'castillo', 'granja', 'lago']);
    expect(links('lago')).toEqual(['hub', 'pradera']);
    expect(links('pradera')).toEqual(['lago']);
  });

  it('every portal has a way back', () => {
    for (const id of ZONE_IDS) {
      for (const portal of ZONES[id].portals) {
        expect(
          ZONES[portal.to].portals.some((p) => p.to === id),
          `${portal.to} → ${id}`,
        ).toBe(true);
      }
    }
  });

  it('every zone has 5–8 markers to walk to, and every zone but the hub has games', () => {
    for (const id of ZONE_IDS) {
      const zone = ZONES[id];
      // Glowing markers to walk to: plain waypoints plus the game entrances.
      const markers = zone.waypoints.length + zone.games.length;
      expect(markers, id).toBeGreaterThanOrEqual(5);
      expect(markers, id).toBeLessThanOrEqual(8);
      if (id !== 'hub') expect(zone.games.length, id).toBeGreaterThan(0);
    }
  });

  it('keeps portals in front of the camera, where they can be seen and tapped', () => {
    for (const id of ZONE_IDS) {
      for (const portal of ZONES[id].portals)
        expect(portal.z, `${id}→${portal.to}`).toBeLessThan(-5);
    }
  });

  it('routes toward a zone by its first hop', () => {
    expect(nextHop('castillo', (id) => id === 'pradera')).toBe('hub');
    expect(nextHop('hub', (id) => id === 'pradera')).toBe('lago');
    expect(nextHop('lago', (id) => id === 'pradera')).toBe('pradera');
    expect(nextHop('hub', () => false)).toBeNull();
  });
});

describe.each(ZONE_IDS)('navigation in %s never blocks', (id) => {
  const zone = ZONES[id];
  const nav = navFor(id);
  const starts = startsOf(id);

  it('starts on walkable ground', () => {
    for (const start of starts) expect(zoneBlocked(zone, start.x, start.z, 0.5)).toBe(false);
  });

  it('reaches every waypoint, portal, host and game from every way in', () => {
    const goals: Point[] = [
      ...zone.waypoints,
      ...zone.portals.map(portalApproach),
      ...(zone.host ? [standInFront(zone.host)] : []),
      ...zone.games.map(standInFront),
      ...(zone.stage ? [stageOf(id).seat] : []),
    ];
    for (const start of starts) {
      for (const goal of goals) {
        // Already there: nothing to walk (the game treats that as having arrived).
        if (v(start).distanceTo(v(goal)) < 1e-6) continue;
        const path = nav.findPath(v(start), v(goal));
        const end = path[path.length - 1];
        expect(end, `${id}: (${start.x},${start.z}) → (${goal.x},${goal.z})`).toBeDefined();
        expect(end!.distanceTo(v(goal))).toBeLessThan(1e-3);
      }
    }
  });

  it('turns any tap, on or off the ground, into a walk that stays on it', () => {
    const rand = seeded(7);
    for (let i = 0; i < 150; i++) {
      // Taps land anywhere up to well outside the zone, including on obstacles.
      const tap = { x: (rand() - 0.5) * 70, z: (rand() - 0.5) * 70 };
      const start = starts[i % starts.length]!;
      const path = nav.findPath(v(start), v(tap));
      expect(path.length, `${id}: tap (${tap.x.toFixed(1)},${tap.z.toFixed(1)})`).toBeGreaterThan(
        0,
      );
      for (const p of path) {
        expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(zone.radius + 1);
        expect(p.y).toBeCloseTo(0);
      }
    }
  });

  it('walks around obstacles, never through them', () => {
    const rand = seeded(11);
    for (let i = 0; i < 60; i++) {
      const goal = zone.waypoints[i % zone.waypoints.length]!;
      const start = starts[Math.floor(rand() * starts.length)]!;
      const path = [v(start), ...nav.findPath(v(start), v(goal))];
      for (let k = 1; k < path.length; k++) {
        for (const o of zone.obstacles) {
          // Grid cells are 1 m, so a path may shave an obstacle's rim by up to that.
          expect(distanceToSegment(o, path[k - 1]!, path[k]!)).toBeGreaterThan(o.r - 1.1);
        }
      }
    }
  });
});

describe('idle behaviour', () => {
  const none = new Set<string>();
  const all = new Set(ZONE_IDS.flatMap((id) => ZONES[id].games.map((g) => g.id)));
  const allBut = (...ids: string[]) => new Set([...all].filter((id) => !ids.includes(id)));

  it('heads for the unplayed game in its own zone', () => {
    expect(idleTarget('pradera', none)).toMatchObject({ kind: 'game' });
  });

  it('heads for the portal on the way to the nearest unplayed game', () => {
    expect(idleTarget('hub', none)).toMatchObject({ kind: 'portal' });
    expect(idleTarget('hub', allBut('more'))).toMatchObject({ kind: 'portal', to: 'lago' });
    expect(idleTarget('castillo', allBut('more'))).toMatchObject({ kind: 'portal', to: 'hub' });
    expect(idleTarget('lago', allBut('more'))).toMatchObject({ kind: 'portal', to: 'pradera' });
    expect(idleTarget('lago', allBut('pairs'))).toMatchObject({ kind: 'game' });
  });

  it('visits the host once every game has been played, or stays put', () => {
    expect(idleTarget('granja', all)).toMatchObject({ kind: 'host' });
    expect(idleTarget('hub', all)).toBeNull();
    expect(idleTarget('pradera', all)).toBeNull();
  });

  it('always targets walkable ground', () => {
    for (const id of ZONE_IDS) {
      for (const done of [none, all]) {
        const target = idleTarget(id, done);
        if (target) expect(zoneBlocked(ZONES[id], target.x, target.z), id).toBe(false);
      }
    }
  });

  it('varies the spoken hint in the hub', () => {
    expect(idleLine('hub', 0)).not.toBe(idleLine('hub', 1));
    expect(idleLine('bosque', 0)).toBe('common.idle.3');
  });
});
