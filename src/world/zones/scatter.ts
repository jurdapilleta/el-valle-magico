export type Placement = { x: number; z: number; scale: number; yaw: number };
export type ScenerySet = {
  key: string;
  model: string;
  placements: Placement[];
  /** 0–1: how far to tint toward white, for snow-dusted scenery. */
  snow?: number;
};
export type Circle = { x: number; z: number; r: number };

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/**
 * Deterministic scatter in a ring around `centre`, so a zone looks the same
 * on every load. Placements inside any `keepOut` circle are dropped.
 */
export function ring(
  count: number,
  seed: number,
  inner: number,
  outer: number,
  scale: [number, number],
  keepOut: Circle[] = [],
  centre: { x: number; z: number } = { x: 0, z: 0 },
): Placement[] {
  const rand = seeded(seed);
  const out: Placement[] = [];
  for (let tries = 0; out.length < count && tries < count * 20; tries++) {
    const angle = rand() * Math.PI * 2;
    // sqrt keeps the density even across the ring's area.
    const radius = Math.sqrt(inner * inner + rand() * (outer * outer - inner * inner));
    const x = centre.x + Math.cos(angle) * radius;
    const z = centre.z + Math.sin(angle) * radius;
    const s = scale[0] + rand() * (scale[1] - scale[0]);
    const yaw = rand() * Math.PI * 2;
    if (keepOut.some((k) => Math.hypot(x - k.x, z - k.z) < k.r)) continue;
    out.push({ x, z, scale: s, yaw });
  }
  return out;
}

export const set = (model: string, placements: Placement[], snow?: number): ScenerySet => ({
  key: model,
  model,
  placements,
  snow,
});
