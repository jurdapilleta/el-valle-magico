import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { LUNA_COLOURS, Unicorn, type UnicornAnim } from '../characters/Unicorn';
import { sceneActor } from '../core/machine';
import { usePreset } from '../core/store';
import { BlobShadow } from './BlobShadow';
import { luna } from './lunaState';

const TURN_RATE = 10;

function turnToward(g: Group, yaw: number, delta: number) {
  const diff = Math.atan2(Math.sin(yaw - g.rotation.y), Math.cos(yaw - g.rotation.y));
  g.rotation.y += diff * Math.min(1, TURN_RATE * delta);
}

const lunaAnim = (): UnicornAnim =>
  luna.path.length > 0 ? 'Walk' : performance.now() < luna.happyUntil ? 'Happy' : 'Idle';

/** Luna follows `luna.path`; everything else about her is the Unicorn model. */
export function Luna() {
  const group = useRef<Group>(null);
  const { shadows } = usePreset();

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    // Real time, so a slow device walks at the same speed; capped so that a tab
    // left in the background does not make her leap on return.
    let step = luna.speed * Math.min(delta, 1);
    // Stepped through a portal: face the player straight away.
    if (luna.teleported) g.rotation.y = 0;

    while (step > 0 && luna.path.length > 0) {
      const next = luna.path[0]!;
      const dx = next.x - luna.position.x;
      const dz = next.z - luna.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1e-4) turnToward(g, Math.atan2(dx, dz), delta);
      if (dist <= step) {
        luna.position.copy(next);
        luna.path.shift();
        step -= dist;
        if (luna.path.length === 0) {
          sceneActor.send({ type: 'ARRIVED' });
          const arrived = luna.onArrive;
          luna.onArrive = null;
          arrived?.();
        }
      } else {
        luna.position.x += (dx / dist) * step;
        luna.position.z += (dz / dist) * step;
        step = 0;
      }
    }

    if (luna.path.length === 0 && luna.faceYaw !== null) turnToward(g, luna.faceYaw, delta);
    g.position.copy(luna.position);
  });

  return (
    <group ref={group}>
      <Unicorn body={LUNA_COLOURS.body} mane={LUNA_COLOURS.mane} getAnim={lunaAnim} />
      {!shadows && <BlobShadow radius={0.75} />}
    </group>
  );
}
