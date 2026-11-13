import { useRef, type ReactNode } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { Group } from 'three';
import { audio, type SfxId } from '../audio/AudioManager';
import { reducedMotion } from '../characters/merge';
import { sceneActor } from '../core/machine';
import { walkLunaTo } from './lunaState';

export type Reaction = 'bounce' | 'spin' | 'float' | 'bloom' | 'swing';

type Props = {
  x: number;
  z: number;
  y?: number;
  /** Radius and height of the invisible hit proxy, in metres (§8.1: generous). */
  hit?: [number, number];
  react: Reaction;
  sfx?: SfxId;
  /** Playback rate: gives a row of props different pitches. */
  rate?: number;
  /** Height of the point the reaction turns around (a swing hangs from its beam). */
  pivotY?: number;
  /** Whether Luna walks over when it is tapped. */
  walk?: boolean;
  children: ReactNode;
};

const DURATION: Record<Reaction, number> = {
  bounce: 0.6,
  spin: 0.9,
  float: 2.4,
  bloom: 3,
  swing: 4,
};

/**
 * Anything in the world a child can tap just for fun (§2: nothing silently
 * ignores a tap). It always answers at once with a sound and a movement.
 */
export function Tappable({
  x,
  z,
  y = 0,
  hit = [1, 2],
  react,
  sfx,
  rate = 1,
  pivotY = 0,
  walk,
  children,
}: Props) {
  const inner = useRef<Group>(null);
  const tappedAt = useRef(-Infinity);

  useFrame(() => {
    const g = inner.current;
    if (!g) return;
    const k = (performance.now() / 1000 - tappedAt.current) / DURATION[react];
    const live = k >= 0 && k < 1;
    const arc = live ? Math.sin(Math.PI * k) : 0;
    const amount = reducedMotion ? 0.4 : 1;
    switch (react) {
      case 'bounce':
        g.position.y = arc * 0.5 * amount;
        g.scale.setScalar(1 + arc * 0.2);
        break;
      case 'spin':
        g.rotation.y = live ? k * Math.PI * 2 : 0;
        g.position.y = arc * 0.3 * amount;
        break;
      case 'float':
        g.position.y = arc * 3 * amount;
        g.rotation.z = arc * 0.3;
        break;
      case 'bloom':
        // Opens quickly, holds, then settles back.
        g.scale.setScalar(1 + Math.min(1, arc * 3) * 0.7);
        break;
      case 'swing':
        g.rotation.x = live ? Math.sin(k * Math.PI * 6) * 0.6 * (1 - k) * amount : 0;
        break;
    }
  });

  const onTap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!sceneActor.getSnapshot().matches('world')) return;
    tappedAt.current = performance.now() / 1000;
    if (sfx) audio.playSfx(sfx, rate);
    else audio.pop();
    if (walk) walkLunaTo({ x, z });
  };

  return (
    <group position={[x, y, z]}>
      <group position={[0, pivotY, 0]}>
        <group ref={inner}>{children}</group>
      </group>
      {/* onClick keeps the tap from also reaching the ground behind (tap-to-go). */}
      <mesh
        position={[0, hit[1] / 2, 0]}
        visible={false}
        onPointerDown={onTap}
        onClick={(e) => e.stopPropagation()}
      >
        <cylinderGeometry args={[hit[0], hit[0], hit[1], 10]} />
      </mesh>
    </group>
  );
}
