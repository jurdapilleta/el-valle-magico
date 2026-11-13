import { ring, set, type Circle, type ScenerySet } from './scatter';

export type ZoneId = 'hub' | 'castillo' | 'granja' | 'bosque' | 'lago' | 'pradera';
export type HostId = 'estrella' | 'tomas' | 'copo' | 'melodia';
export type Point = { x: number; z: number };

export type ZoneDef = {
  id: ZoneId;
  /** Spanish name with article, for screen-reader labels ("Ir a …"). */
  name: string;
  /** Voice line Luna says when asked where we are. */
  where: string;
  radius: number;
  colours: { ground: string; sky: string; fog: string };
  /** Carved out of the navmesh: buildings, water, characters, big props. */
  obstacles: Circle[];
  host?: Point & { id: HostId; hello: string };
  /** Where this zone's games are played; every game in the zone shares it. */
  stage?: Point;
  /** Entrances to this zone's mini-games: a sample of each game under a star. */
  games: (Point & { id: string })[];
  portals: (Point & { to: ZoneId })[];
  waypoints: Point[];
  scenery: (density: number) => ScenerySet[];
};

const RADIUS = 18;
const PORTAL_RADIUS = 16.5;

/**
 * A point on the zone's far arc. 0° is straight ahead (−z), positive to the
 * right. Portals all sit on this arc, within about ±50°: the camera always
 * looks toward −z, so anything behind it or far to the side of where Luna
 * arrives could not be seen or tapped.
 */
const arc = (degrees: number, radius = PORTAL_RADIUS): Point => ({
  x: Math.sin((degrees * Math.PI) / 180) * radius,
  z: -Math.cos((degrees * Math.PI) / 180) * radius,
});

// Shared positions: decor components draw at the same spots the navmesh carves.
export const HUB = { tree: { x: 0, z: -12 }, swing: { x: 0, z: -9 } };
export const CASTILLO = { castle: { x: 4, z: -12.5 } };
export const GRANJA = {
  barn: { x: -3, z: -13 },
  pond: { x: 8, z: -2.5 },
  crops: { x: -11, z: -4 },
};
export const BOSQUE = { pond: { x: 7, z: -9 }, snowman: { x: -5.5, z: -6 } };
export const LAGO = { lake: { x: 0, z: -15.5, r: 8 } };
export const PRADERA = {
  stage: { x: 3, z: -6 },
  rainbow: { x: 3, z: -15, span: 7 },
  chispa: { x: -6, z: -10 },
  brisa: { x: 10, z: -5 },
};

const edge = RADIUS + 1.5;
const grow = (circles: Circle[], by: number): Circle[] =>
  circles.map((c) => ({ ...c, r: c.r + by }));

const hub: ZoneDef = {
  id: 'hub',
  name: 'la pradera central',
  where: 'luna.where.hub',
  radius: RADIUS,
  colours: { ground: '#9FE0A8', sky: '#BFE3FF', fog: '#FFF1F8' },
  obstacles: [{ ...HUB.tree, r: 2 }],
  games: [],
  // Menu order: the two least-visited come first, ties in this order.
  portals: [
    { to: 'lago', ...arc(50) },
    { to: 'castillo', ...arc(18) },
    { to: 'granja', ...arc(-50) },
    { to: 'bosque', ...arc(-18) },
  ],
  waypoints: [
    { x: 0, z: -5 },
    { x: 6, z: -4 },
    { x: -6, z: -4 },
    { x: 7, z: -9 },
    { x: -7, z: -9 },
  ],
  scenery: (density) => {
    const n = (count: number) => Math.round(count * density);
    return [
      // The big friendly tree at the heart of the meadow (§4.1).
      { key: 'big-tree', model: 'tree_oak', placements: [{ ...HUB.tree, scale: 5.5, yaw: 0.6 }] },
      set('tree_default', ring(n(16), 3, edge, 34, [2.6, 3.6])),
      set('tree_oak', ring(n(12), 5, edge, 34, [2.6, 3.8])),
      set('tree_fat', ring(n(12), 7, edge, 36, [2.8, 3.8])),
      set('tree_detailed', ring(n(8), 9, edge + 2, 36, [2.8, 3.6])),
      set('plant_bush', ring(n(14), 11, edge - 1, 24, [1.6, 2.4])),
      set('plant_bushLarge', ring(n(8), 13, edge - 0.5, 24, [1.6, 2.2])),
      set('rock_largeA', ring(n(5), 15, edge - 0.5, 23, [1.6, 2.6])),
      set('rock_smallA', ring(n(8), 17, edge - 1, 22, [1.5, 2.5])),
      set('stump_round', ring(2, 19, edge - 0.5, 21, [2, 2.4])),
      set('log', ring(2, 21, edge - 0.5, 21, [2, 2.4])),
      set('flower_redA', ring(n(30), 23, 2, RADIUS, [1.6, 2.4], grow(hub.obstacles, 0.5))),
      set('flower_yellowA', ring(n(30), 25, 2, RADIUS, [1.6, 2.4], grow(hub.obstacles, 0.5))),
      set('flower_purpleA', ring(n(30), 27, 2, RADIUS, [1.6, 2.4], grow(hub.obstacles, 0.5))),
      set('grass', ring(n(70), 29, 1.5, RADIUS + 6, [1.4, 2.2], grow(hub.obstacles, 0.5))),
      set('grass_large', ring(n(30), 31, 3, RADIUS + 6, [1.2, 1.8], grow(hub.obstacles, 0.5))),
      set('mushroom_red', ring(6, 33, 2.4, 3.6, [1.6, 2.4], [], HUB.tree)),
    ];
  },
};

const castillo: ZoneDef = {
  id: 'castillo',
  name: 'el castillo',
  where: 'luna.where.castillo',
  radius: RADIUS,
  colours: { ground: '#B5E6B0', sky: '#E3D4FF', fog: '#FFE6F4' },
  obstacles: [
    { ...CASTILLO.castle, r: 6.5 },
    { x: -1.5, z: -5.5, r: 0.9 },
  ],
  host: { id: 'estrella', x: -1.5, z: -5.5, hello: 'estrella.hello' },
  stage: { x: 0.5, z: -2.5 },
  games: [
    { id: 'balloons', x: -5, z: -3.5 },
    { id: 'jewels', x: 5, z: -4.5 },
    { id: 'doors', x: 8.5, z: -6.5 },
    { id: 'tower', x: -5, z: -9.5 },
  ],
  portals: [{ to: 'hub', ...arc(-48) }],
  waypoints: [{ x: 1.5, z: -4.5 }],
  scenery: (density) => {
    const n = (count: number) => Math.round(count * density);
    const clear = grow(castillo.obstacles, 0.5);
    return [
      set('tree_default', ring(n(14), 41, edge, 34, [2.6, 3.6])),
      set('tree_fat', ring(n(14), 43, edge, 36, [2.8, 3.8])),
      set('plant_bushLarge', ring(n(12), 45, edge - 1, 24, [1.6, 2.4])),
      set('flower_redA', ring(n(44), 47, 2, RADIUS, [1.8, 2.6], clear)),
      set('flower_purpleA', ring(n(44), 49, 2, RADIUS, [1.8, 2.6], clear)),
      set('grass', ring(n(50), 51, 1.5, RADIUS + 6, [1.4, 2.2], clear)),
      // A column either side of the path to the castle gate.
      set(
        'statue_column',
        [-2.2, 2.2].map((dx) => ({
          x: CASTILLO.castle.x + dx,
          z: CASTILLO.castle.z + 6,
          scale: 2.6,
          yaw: 0,
        })),
      ),
    ];
  },
};

const granja: ZoneDef = {
  id: 'granja',
  name: 'la granja',
  where: 'luna.where.granja',
  radius: RADIUS,
  colours: { ground: '#B9DD8A', sky: '#BFE3FF', fog: '#FFF6DC' },
  obstacles: [
    { ...GRANJA.barn, r: 5.5 },
    { ...GRANJA.pond, r: 3.2 },
    { ...GRANJA.crops, r: 3.6 },
    { x: 1.5, z: -6.5, r: 0.9 },
  ],
  host: { id: 'tomas', x: 1.5, z: -6.5, hello: 'tomas.hello' },
  stage: { x: 0.5, z: -2.5 },
  games: [
    { id: 'animals', x: -5.5, z: -5.5 },
    { id: 'who', x: 6, z: -8 },
    { id: 'homes', x: -4.5, z: -8.5 },
    { id: 'eggs', x: 5, z: -10.5 },
  ],
  portals: [{ to: 'hub', ...arc(46) }],
  waypoints: [{ x: -1.5, z: -3.5 }],
  scenery: (density) => {
    const n = (count: number) => Math.round(count * density);
    const clear = grow(granja.obstacles, 0.5);
    return [
      set('tree_oak', ring(n(18), 61, edge, 34, [2.6, 3.8])),
      set('tree_default', ring(n(10), 63, edge, 36, [2.6, 3.4])),
      set('plant_bush', ring(n(12), 65, edge - 1, 24, [1.6, 2.4])),
      set('flower_yellowA', ring(n(40), 67, 2, RADIUS, [1.6, 2.4], clear)),
      set('grass', ring(n(60), 69, 1.5, RADIUS + 6, [1.4, 2.2], clear)),
      set('grass_large', ring(n(24), 71, 3, RADIUS + 6, [1.2, 1.8], clear)),
      set('crops_cornStageD', ring(n(16), 73, 0, 2.8, [1.8, 2.3], [], GRANJA.crops)),
      set('crops_wheatStageB', ring(n(16), 75, 0, 2.8, [1.8, 2.3], [], GRANJA.crops)),
      // A fence ring around the crop patch.
      set(
        'fence_simple',
        Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return {
            x: GRANJA.crops.x + Math.cos(a) * 3.3,
            z: GRANJA.crops.z + Math.sin(a) * 3.3,
            scale: 2,
            yaw: -a + Math.PI / 2,
          };
        }),
      ),
    ];
  },
};

const bosque: ZoneDef = {
  id: 'bosque',
  name: 'el bosque nevado',
  where: 'luna.where.bosque',
  radius: RADIUS,
  colours: { ground: '#F4F9FF', sky: '#C7D8FF', fog: '#EAF4FF' },
  obstacles: [
    { ...BOSQUE.pond, r: 3.4 },
    { ...BOSQUE.snowman, r: 0.9 },
    { x: 1, z: -6.5, r: 0.9 },
  ],
  host: { id: 'copo', x: 1, z: -6.5, hello: 'copo.hello' },
  stage: { x: 0.5, z: -2.5 },
  games: [
    { id: 'letters', x: -2, z: -10.5 },
    { id: 'next', x: 5.5, z: -4.5 },
    { id: 'tracks', x: -7.5, z: -4 },
  ],
  portals: [{ to: 'hub', ...arc(-38) }],
  waypoints: [
    { x: 3.5, z: -11 },
    { x: -3.5, z: -5 },
  ],
  scenery: (density) => {
    const n = (count: number) => Math.round(count * density);
    return [
      set('tree_pineRoundA', ring(n(18), 81, edge, 34, [3, 4.2]), 0.55),
      set('tree_pineTallA', ring(n(16), 83, edge, 36, [3, 4.4]), 0.55),
      set('tree_pineDefaultA', ring(n(12), 85, edge + 1, 36, [3, 4]), 0.55),
      set('tree_pineSmallA', ring(n(14), 87, edge - 1, 26, [2.4, 3.2]), 0.55),
      set('rock_tallA', ring(n(6), 89, edge - 0.5, 24, [2, 3]), 0.6),
      set('rock_largeA', ring(n(6), 91, edge - 0.5, 23, [1.8, 2.6]), 0.6),
      set('stone_tallA', ring(n(5), 93, edge - 0.5, 22, [1.8, 2.4]), 0.75),
    ];
  },
};

const lago: ZoneDef = {
  id: 'lago',
  name: 'el lago',
  where: 'luna.where.lago',
  radius: RADIUS,
  colours: { ground: '#A8DDA0', sky: '#FFD9B8', fog: '#FFE9D2' },
  obstacles: [LAGO.lake, { x: 0, z: -6.3, r: 1 }],
  host: { id: 'melodia', x: 0, z: -6.3, hello: 'melodia.hello' },
  stage: { x: 0.5, z: -2.3 },
  games: [
    { id: 'pairs', x: -5, z: -5.5 },
    { id: 'faces', x: 5, z: -5.5 },
  ],
  portals: [
    { to: 'pradera', ...arc(46) },
    { to: 'hub', ...arc(-46) },
  ],
  waypoints: [
    { x: -2.5, z: -3 },
    { x: 2.5, z: -3 },
    { x: -9, z: -9.5 },
  ],
  scenery: (density) => {
    const n = (count: number) => Math.round(count * density);
    const clear = grow(lago.obstacles, 0.6);
    return [
      set('tree_default', ring(n(14), 101, edge, 34, [2.6, 3.6])),
      set('tree_detailed', ring(n(12), 103, edge, 36, [2.8, 3.6])),
      set('plant_bush', ring(n(10), 105, edge - 1, 24, [1.6, 2.4])),
      set('rock_smallA', ring(n(8), 107, 8.4, 9.4, [1.4, 2.2], [], LAGO.lake)),
      // Reeds along the shore and lilies out on the water.
      set('plant_flatTall', ring(n(26), 109, 7.6, 8.6, [1.8, 2.6], [], LAGO.lake)),
      set('lily_large', ring(n(9), 111, 1, 6.6, [1.8, 2.6], [], LAGO.lake)),
      set('lily_small', ring(n(12), 113, 1, 7, [1.8, 2.6], [], LAGO.lake)),
      set('canoe', [{ x: -5.6, z: -10.4, scale: 2.2, yaw: 0.9 }]),
      set('flower_purpleA', ring(n(26), 115, 2, RADIUS, [1.6, 2.4], clear)),
      set('grass', ring(n(50), 117, 1.5, RADIUS + 6, [1.4, 2.2], clear)),
    ];
  },
};

const pradera: ZoneDef = {
  id: 'pradera',
  name: 'la pradera de unicornios',
  where: 'luna.where.pradera',
  radius: RADIUS,
  colours: { ground: '#A6E8B8', sky: '#CFEBFF', fog: '#F3E8FF' },
  obstacles: [
    { ...PRADERA.stage, r: 1 },
    { ...PRADERA.chispa, r: 0.8 },
    { ...PRADERA.brisa, r: 0.8 },
    { x: PRADERA.rainbow.x - PRADERA.rainbow.span, z: PRADERA.rainbow.z, r: 1.1 },
    { x: PRADERA.rainbow.x + PRADERA.rainbow.span, z: PRADERA.rainbow.z, r: 1.1 },
  ],
  stage: PRADERA.stage,
  games: [
    { id: 'count-unicorns', ...PRADERA.stage },
    { id: 'more', x: -3.5, z: -3.5 },
    { id: 'necklace', x: -9, z: -9 },
  ],
  portals: [{ to: 'lago', ...arc(-48) }],
  waypoints: [
    { x: 10, z: -10 },
    { x: -2, z: -11.5 },
  ],
  scenery: (density) => {
    const n = (count: number) => Math.round(count * density);
    // Low plants stay off the stage where the herd lines up.
    const clear = [...grow(pradera.obstacles, 0.5), { ...PRADERA.stage, r: 6 }];
    return [
      set('tree_fat', ring(n(22), 121, edge, 36, [2.8, 3.8])),
      set('plant_bushLarge', ring(n(10), 123, edge - 1, 24, [1.6, 2.4])),
      set('flower_redA', ring(n(34), 125, 2, RADIUS, [1.6, 2.4], clear)),
      set('flower_yellowA', ring(n(34), 127, 2, RADIUS, [1.6, 2.4], clear)),
      set('flower_purpleA', ring(n(34), 129, 2, RADIUS, [1.6, 2.4], clear)),
      set('grass', ring(n(60), 131, 1.5, RADIUS + 6, [1.4, 2.2], clear)),
      set('mushroom_redGroup', ring(n(8), 133, 4, RADIUS - 1, [1.6, 2.4], clear)),
      set('mushroom_tanGroup', ring(n(8), 135, 4, RADIUS - 1, [1.6, 2.4], clear)),
    ];
  },
};

export const ZONES: Record<ZoneId, ZoneDef> = { hub, castillo, granja, bosque, lago, pradera };
export const ZONE_IDS = Object.keys(ZONES) as ZoneId[];

const inward = (p: Point, metres: number): Point => {
  const length = Math.hypot(p.x, p.z);
  const k = (length - metres) / length;
  return { x: p.x * k, z: p.z * k };
};

/** Where Luna stops in front of a portal before stepping through. */
export const portalApproach = (portal: Point): Point => inward(portal, 2);

/**
 * Where Luna appears when she steps into a zone: the middle, facing the
 * player, so the host, the buildings and every portal are in view at once.
 */
export const ENTRY: Point = { x: 0, z: 0.5 };

/** Where Luna stands to talk to a character: just in front, toward the camera. */
export const standInFront = (p: Point): Point => ({ x: p.x, z: p.z + 2.2 });

/** First zone to walk into on the shortest route from `from` to any zone where `wanted` holds. */
export function nextHop(from: ZoneId, wanted: (id: ZoneId) => boolean): ZoneId | null {
  const first = new Map<ZoneId, ZoneId>();
  const queue: ZoneId[] = [];
  for (const portal of ZONES[from].portals) {
    first.set(portal.to, portal.to);
    queue.push(portal.to);
  }
  const seen = new Set<ZoneId>([from, ...queue]);
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (wanted(id)) return first.get(id)!;
    for (const portal of ZONES[id].portals) {
      if (seen.has(portal.to)) continue;
      seen.add(portal.to);
      first.set(portal.to, first.get(id)!);
      queue.push(portal.to);
    }
  }
  return null;
}
