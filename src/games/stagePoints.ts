import type { Vector3 } from 'three';

/**
 * World positions of everything tappable on a game's stage, keyed like
 * "choice:color.rojo". Used to aim celebration particles at the right item
 * and by the smoke tests to find where to tap.
 */
export const stagePoints = new Map<string, Vector3>();
