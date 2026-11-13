import { Vector3 } from 'three';
import { ZONES, type ZoneId } from './zones/defs';

export type StageLayout = {
  /** Centre of the stage where a game's items line up. */
  centre: Vector3;
  /** Where Luna stands while a game is on. */
  seat: Vector3;
  camera: Vector3;
  /** Aimed in front of the items so they sit in the upper half, clear of the answer cards. */
  look: Vector3;
};

const layouts = new Map<ZoneId, StageLayout>();

/** Every zone with games has one stage; all its games play there. */
export function stageOf(id: ZoneId): StageLayout {
  let layout = layouts.get(id);
  if (!layout) {
    const { x, z } = ZONES[id].stage ?? { x: 0, z: -3 };
    layout = {
      centre: new Vector3(x, 0, z),
      seat: new Vector3(x - 4.2, 0, z - 0.2),
      camera: new Vector3(x, 4.4, z + 10),
      look: new Vector3(x, 0.3, z + 0.7),
    };
    layouts.set(id, layout);
  }
  return layout;
}

/**
 * Width in metres the stage camera keeps in frame, whatever the aspect ratio:
 * the widest row of items plus room for Luna beside it.
 */
export function stageFitWidth(span: number): number {
  return Math.max(8.5, span * 1.6 + 4.5);
}
