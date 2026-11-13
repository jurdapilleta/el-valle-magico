import { PlaneGeometry, type BufferGeometry, type Vector3 } from 'three';
import { Pathfinding } from 'three-pathfinding';
import { ZONES, type ZoneDef, type ZoneId } from './zones/defs';

/**
 * Stand-in for a Blender-baked navmesh (GAME_DESIGN §6.3): a flat grid on
 * y = 0 with every cell for which `blocked` is true removed. A zone with a
 * baked `<zone>_navmesh.glb` passes that geometry to createNav instead.
 */
export function createFlatNavGeometry(
  size: number,
  segments: number,
  blocked: (x: number, z: number) => boolean = () => false,
): BufferGeometry {
  const geometry = new PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex()!;
  const kept: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    const x = (position.getX(a) + position.getX(b) + position.getX(c)) / 3;
    const z = (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3;
    if (!blocked(x, z)) kept.push(a, b, c);
  }
  geometry.setIndex(kept);
  return geometry;
}

/** True where Luna cannot walk in `zone`; `margin` widens every obstacle. */
export function zoneBlocked(zone: ZoneDef, x: number, z: number, margin = 0): boolean {
  return (
    Math.hypot(x, z) > zone.radius - margin ||
    zone.obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + margin)
  );
}

/** A zone's walkable ground: a disc with its obstacles carved out, 1 m cells. */
export function createZoneNavGeometry(zone: ZoneDef): BufferGeometry {
  const size = zone.radius * 2 + 2;
  return createFlatNavGeometry(size, size, (x, z) => zoneBlocked(zone, x, z));
}

export type Nav = {
  /** Path from `from` to `to`, or to the walkable spot nearest `to`; empty if none. */
  findPath: (from: Vector3, to: Vector3) => Vector3[];
};

export function createNav(geometry: BufferGeometry, zoneId = 'zone'): Nav {
  const pathfinding = new Pathfinding();
  pathfinding.setZoneData(zoneId, Pathfinding.createZone(geometry));

  return {
    findPath(from, to) {
      const groupId = pathfinding.getGroup(zoneId, from);
      if (groupId === null || groupId === undefined) return [];
      const direct = pathfinding.findPath(from, to, zoneId, groupId);
      if (direct) return direct;
      // Tap landed off the mesh: walk to the nearest walkable polygon instead,
      // so no tap is ever silently ignored.
      const nearest = pathfinding.getClosestNode(to, zoneId, groupId);
      if (!nearest) return [];
      return pathfinding.findPath(from, nearest.centroid, zoneId, groupId) ?? [];
    },
  };
}

const navs = new Map<ZoneId, Nav>();

/** The navmesh for a zone, built on first use. */
export function navFor(id: ZoneId): Nav {
  let nav = navs.get(id);
  if (!nav) {
    nav = createNav(createZoneNavGeometry(ZONES[id]), id);
    navs.set(id, nav);
  }
  return nav;
}
