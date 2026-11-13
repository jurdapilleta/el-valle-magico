import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type PerspectiveCamera } from 'three';
import { sceneActor } from '../core/machine';
import { useGameStore } from '../core/store';
import { useSession } from '../games/session';
import { luna } from './lunaState';
import { stageFitWidth, stageOf } from './layout';

// GAME_DESIGN §4.3
const PITCH = (25 * Math.PI) / 180;
const DISTANCE = 6;
const PORTRAIT_BACKOFF = 1.2;
const FOLLOW_DAMP = 0.35;
/** Exponential time constant that settles the stage tween in about 1 s. */
const STAGE_DAMP = 0.25;
const LOOK_RETURN_RATE = 8;

/** The live camera, for projecting world points to the screen in smoke tests. */
export const rig: {
  camera: PerspectiveCamera | null;
  /** Last frame's renderer counters, for the budget check. */
  render: { triangles: number; calls: number };
} = { camera: null, render: { triangles: 0, calls: 0 } };

const desired = new Vector3();
const desiredLook = new Vector3();

/** Third-person follow camera on rails; inside a game it locks to the stage. */
export function CameraRig() {
  const lookAt = useRef(new Vector3(0, 1, 0));
  const placed = useRef(false);

  useFrame(({ camera, size, gl }, delta) => {
    rig.camera = camera as PerspectiveCamera;
    // Read before this frame renders, so these are the previous frame's totals.
    rig.render.triangles = gl.info.render.triangles;
    rig.render.calls = gl.info.render.calls;
    const inGame = sceneActor.getSnapshot().matches('game');
    if (!luna.dragging || inGame) luna.lookYaw *= Math.exp(-LOOK_RETURN_RATE * delta);

    if (inGame) {
      // Move along the view line until the herd's row just fits the screen.
      const cam = camera as PerspectiveCamera;
      const stage = stageOf(useGameStore.getState().zone);
      const halfFov = (cam.fov * Math.PI) / 360;
      const base = stage.camera.distanceTo(stage.look);
      const width = stageFitWidth(useSession.getState().span);
      const needed = width / 2 / (Math.tan(halfFov) * (size.width / size.height));
      desiredLook.copy(stage.look);
      desired
        .copy(stage.camera)
        .sub(stage.look)
        .multiplyScalar(Math.min(2.5, Math.max(0.8, needed / base)))
        .add(stage.look);
    } else {
      const dist = DISTANCE * (size.height > size.width ? PORTRAIT_BACKOFF : 1);
      desiredLook.set(luna.position.x, luna.position.y + 1.2, luna.position.z);
      desired.set(
        luna.position.x + Math.sin(luna.lookYaw) * dist * Math.cos(PITCH),
        luna.position.y + 1.2 + dist * Math.sin(PITCH),
        luna.position.z + Math.cos(luna.lookYaw) * dist * Math.cos(PITCH),
      );
    }

    // Luna stepped through a portal: cut to her instead of sweeping across the zone.
    if (luna.teleported) {
      luna.teleported = false;
      placed.current = false;
    }
    const t = placed.current ? 1 - Math.exp(-delta / (inGame ? STAGE_DAMP : FOLLOW_DAMP)) : 1;
    placed.current = true;
    camera.position.lerp(desired, t);
    lookAt.current.lerp(desiredLook, t);
    camera.lookAt(lookAt.current);
  });

  return null;
}
