import { Vector3 } from 'three';
import { sceneActor } from '../core/machine';
import { useGameStore } from '../core/store';
import { navFor, zoneBlocked } from './navmesh';
import { ZONES, type Point } from './zones/defs';

export const WALK_SPEED = 3; // m/s
export const STROLL_SPEED = 1.5; // when Luna wanders off on her own

// Per-frame data lives outside React/Zustand so moving Luna never re-renders.
export const luna = {
  position: new Vector3(0, 0, 0),
  path: [] as Vector3[],
  speed: WALK_SPEED,
  /** Where the current walk ends; drives the tap marker. */
  target: new Vector3(0, 0, 0),
  /** Runs once when the current walk ends. */
  onArrive: null as (() => void) | null,
  /** performance.now() until which Luna plays her Happy animation. */
  happyUntil: 0,
  /** Yaw Luna turns to when standing still, or null to keep her heading. */
  faceYaw: null as number | null,
  /** Set when she is moved instantly (zone change); the camera snaps to her. */
  teleported: false,
  /** Extra camera yaw from the look-around drag, radians. */
  lookYaw: 0,
  dragging: false,
};

const scratch = new Vector3();

function isClear(from: Vector3, to: Vector3): boolean {
  const zone = ZONES[useGameStore.getState().zone];
  const steps = Math.ceil(from.distanceTo(to) / 0.4);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    // Half a metre of clearance so she does not brush obstacles.
    if (zoneBlocked(zone, from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, 0.5))
      return false;
  }
  return true;
}

/** Tap-to-go: sends Luna to `point` (or the walkable spot nearest to it). */
export function walkLunaTo(point: Point, onArrive?: () => void, speed = WALK_SPEED): void {
  if (!sceneActor.getSnapshot().matches('world')) return;
  const nav = navFor(useGameStore.getState().zone);
  let path = nav.findPath(luna.position, scratch.set(point.x, 0, point.z));
  const end = path[path.length - 1];
  // The grid navmesh can zigzag; when nothing is in the way, walk straight.
  if (end && isClear(luna.position, end)) path = [end];
  if (!end) {
    onArrive?.();
    return;
  }
  luna.path = path;
  luna.speed = speed;
  luna.target.copy(end);
  luna.onArrive = onArrive ?? null;
  luna.faceYaw = null;
  sceneActor.send({ type: 'TAP_WAYPOINT' });
}

/** Moves Luna instantly, facing the player (used when she steps through a portal). */
export function placeLuna(point: Point): void {
  luna.position.set(point.x, 0, point.z);
  luna.path = [];
  luna.onArrive = null;
  luna.faceYaw = 0;
  luna.teleported = true;
}

export function cheerLuna(ms = 1200): void {
  luna.happyUntil = performance.now() + ms;
}
