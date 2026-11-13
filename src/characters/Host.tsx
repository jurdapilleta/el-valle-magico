import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  SphereGeometry,
  type BufferGeometry,
  type Group,
} from 'three';
import type { HostId } from '../world/zones/defs';
import { merge, reducedMotion, toon, type Part } from './merge';

export type HostAnim = 'Idle' | 'Talk' | 'Happy';

const EYE = '#3A2A4A';
const sphere = (r: number) => new SphereGeometry(r, 12, 8);
const eyes = (x: number, y: number, z: number, r = 0.05): Part[] =>
  [x, -x].map((ex) => ({ geometry: sphere(r), colour: EYE, position: [ex, y, z] }));

type Design = { body: Part[]; head: Part[]; headAt: [number, number, number] };

// Original characters (§6.4), built from rounded primitives like the unicorns.
const DESIGNS: Record<HostId, () => Design> = {
  // Princesa Estrella: brown skin, curly dark hair, gold star crown, mint-and-pink dress.
  estrella: () => {
    const skin = '#8D5A3B';
    const hair = '#2B1B17';
    return {
      body: [
        { geometry: new ConeGeometry(0.62, 1.25, 14), colour: '#9AF0D5', position: [0, 0.63, 0] },
        {
          geometry: new CylinderGeometry(0.6, 0.64, 0.16, 14),
          colour: '#FF8FD8',
          position: [0, 0.09, 0],
        },
        {
          geometry: new CapsuleGeometry(0.2, 0.3, 3, 10),
          colour: '#FF8FD8',
          position: [0, 1.3, 0],
        },
        ...[1, -1].map((side): Part => ({
          geometry: new CapsuleGeometry(0.07, 0.42, 3, 8),
          colour: skin,
          position: [0.3 * side, 1.18, 0.04],
          rotation: [0, 0, 0.4 * side],
        })),
      ],
      headAt: [0, 1.74, 0],
      head: [
        { geometry: sphere(0.3), colour: skin },
        ...(
          [
            [0, 0.2, -0.1, 0.24],
            [0.24, 0.1, -0.08, 0.2],
            [-0.24, 0.1, -0.08, 0.2],
            [0.2, -0.12, -0.14, 0.18],
            [-0.2, -0.12, -0.14, 0.18],
            [0, 0.02, -0.24, 0.24],
          ] as const
        ).map(([x, y, z, r]): Part => ({ geometry: sphere(r), colour: hair, position: [x, y, z] })),
        {
          geometry: new ConeGeometry(0.13, 0.18, 5),
          colour: '#FFD23F',
          position: [0, 0.43, -0.04],
        },
        ...eyes(0.11, 0.02, 0.27),
        ...[0.17, -0.17].map((x): Part => ({
          geometry: sphere(0.05),
          colour: '#E08A7A',
          position: [x, -0.08, 0.24],
        })),
      ],
    };
  },

  // Granjero Tomás: round brown bear in overalls and a straw hat.
  tomas: () => {
    const fur = '#A9743F';
    return {
      body: [
        { geometry: sphere(0.62), colour: fur, position: [0, 0.78, 0], scale: [1, 1.1, 0.9] },
        {
          geometry: new CylinderGeometry(0.6, 0.63, 0.62, 14),
          colour: '#6FA8DC',
          position: [0, 0.52, 0],
          scale: [1, 1, 0.92],
        },
        { geometry: new BoxGeometry(0.5, 0.4, 0.1), colour: '#6FA8DC', position: [0, 1.02, 0.5] },
        ...[1, -1].flatMap((side): Part[] => [
          { geometry: sphere(0.2), colour: fur, position: [0.64 * side, 0.98, 0.05] },
          { geometry: sphere(0.21), colour: fur, position: [0.3 * side, 0.14, 0.16] },
        ]),
      ],
      headAt: [0, 1.62, 0],
      head: [
        { geometry: sphere(0.42), colour: fur },
        ...[0.3, -0.3].map((x): Part => ({
          geometry: sphere(0.14),
          colour: fur,
          position: [x, 0.3, -0.02],
        })),
        { geometry: sphere(0.2), colour: '#E8C9A0', position: [0, -0.1, 0.32] },
        { geometry: sphere(0.065), colour: EYE, position: [0, -0.04, 0.5] },
        ...eyes(0.16, 0.08, 0.36),
        {
          geometry: new CylinderGeometry(0.58, 0.58, 0.05, 16),
          colour: '#F2D27A',
          position: [0, 0.36, 0],
        },
        {
          geometry: new CylinderGeometry(0.27, 0.3, 0.24, 14),
          colour: '#F2D27A',
          position: [0, 0.48, 0],
        },
      ],
    };
  },

  // Zorro Copo: white arctic fox, sitting, with a red scarf.
  copo: () => {
    const fur = '#FAFCFF';
    return {
      body: [
        { geometry: sphere(0.45), colour: fur, position: [0, 0.56, 0], scale: [1, 1.25, 1] },
        ...[0.16, -0.16].map((x): Part => ({
          geometry: new CapsuleGeometry(0.09, 0.42, 3, 8),
          colour: fur,
          position: [x, 0.3, 0.32],
        })),
        { geometry: sphere(0.28), colour: fur, position: [0.5, 0.3, -0.3], scale: [1, 1, 1.5] },
        { geometry: sphere(0.16), colour: '#DDEBFA', position: [0.62, 0.36, -0.62] },
        {
          geometry: new CylinderGeometry(0.31, 0.35, 0.16, 12),
          colour: '#FF4D5E',
          position: [0, 1.06, 0],
        },
        {
          geometry: new BoxGeometry(0.14, 0.4, 0.06),
          colour: '#FF4D5E',
          position: [0.18, 0.86, 0.3],
          rotation: [0, 0, -0.2],
        },
      ],
      headAt: [0, 1.36, 0.02],
      head: [
        { geometry: sphere(0.34), colour: fur },
        ...[1, -1].map((side): Part => ({
          geometry: new ConeGeometry(0.12, 0.32, 8),
          colour: fur,
          position: [0.2 * side, 0.36, -0.02],
          rotation: [0, 0, -0.2 * side],
        })),
        {
          geometry: new ConeGeometry(0.15, 0.32, 10),
          colour: fur,
          position: [0, -0.07, 0.38],
          rotation: [Math.PI / 2, 0, 0],
        },
        { geometry: sphere(0.055), colour: EYE, position: [0, -0.07, 0.54] },
        ...eyes(0.14, 0.07, 0.28),
      ],
    };
  },

  // Rana Melodía: green frog with a tiny ukulele.
  melodia: () => {
    const green = '#6CC477';
    const wood = '#C98A5E';
    return {
      body: [
        { geometry: sphere(0.5), colour: green, position: [0, 0.45, 0], scale: [1.15, 0.85, 1] },
        { geometry: sphere(0.36), colour: '#C9F0B0', position: [0, 0.4, 0.2] },
        ...[0.5, -0.5].map((x): Part => ({
          geometry: sphere(0.22),
          colour: '#4FAE5C',
          position: [x, 0.18, 0.12],
        })),
        {
          geometry: new CylinderGeometry(0.2, 0.2, 0.09, 14),
          colour: wood,
          position: [0.1, 0.5, 0.52],
          rotation: [Math.PI / 2, 0, 0],
        },
        {
          geometry: new CylinderGeometry(0.07, 0.07, 0.1, 10),
          colour: '#5A3A2A',
          position: [0.1, 0.5, 0.55],
          rotation: [Math.PI / 2, 0, 0],
        },
        {
          geometry: new BoxGeometry(0.07, 0.46, 0.05),
          colour: wood,
          position: [-0.14, 0.7, 0.52],
          rotation: [0, 0, 0.9],
        },
      ],
      headAt: [0, 0.98, 0.04],
      head: [
        { geometry: sphere(0.4), colour: green, scale: [1.2, 0.8, 1] },
        ...[0.22, -0.22].flatMap((x): Part[] => [
          { geometry: sphere(0.15), colour: '#FFFFFF', position: [x, 0.3, 0.1] },
          { geometry: sphere(0.075), colour: EYE, position: [x, 0.32, 0.22] },
          { geometry: sphere(0.06), colour: '#FF8FD8', position: [x * 1.4, 0, 0.3] },
        ]),
      ],
    };
  },
};

const cache = new Map<
  HostId,
  { body: BufferGeometry; head: BufferGeometry; headAt: Design['headAt'] }
>();

function build(id: HostId) {
  let built = cache.get(id);
  if (!built) {
    const design = DESIGNS[id]();
    built = { body: merge(design.body), head: merge(design.head), headAt: design.headAt };
    cache.set(id, built);
  }
  return built;
}

/**
 * A zone host with Idle, Talk and Happy driven in code (two draw calls).
 * Faces +z, feet on y = 0. `getAnim` is read every frame.
 */
export function Host({ id, getAnim }: { id: HostId; getAnim: () => HostAnim }) {
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const parts = useMemo(() => build(id), [id]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const anim = getAnim();
    const ease = Math.min(1, delta * 12);
    let bob = Math.sin(t * 2) * 0.02;
    let nod = Math.sin(t * 0.9) * 0.04;
    let tilt = 0;
    if (anim === 'Talk') {
      nod = Math.sin(t * 11) * 0.12;
      tilt = Math.sin(t * 3) * 0.08;
    } else if (anim === 'Happy') {
      bob = Math.abs(Math.sin(t * 9)) * (reducedMotion ? 0.1 : 0.3);
      nod = Math.sin(t * 9) * 0.15;
    }
    if (root.current) {
      root.current.position.y += (bob - root.current.position.y) * ease;
      root.current.rotation.z += (tilt - root.current.rotation.z) * ease;
    }
    if (head.current) head.current.rotation.x += (nod - head.current.rotation.x) * ease;
  });

  return (
    <group ref={root}>
      <mesh geometry={parts.body} material={toon} />
      <group ref={head} position={parts.headAt}>
        <mesh geometry={parts.head} material={toon} />
      </group>
    </group>
  );
}
