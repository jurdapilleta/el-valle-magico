import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, type Group } from 'three';
import { merge, reducedMotion, toon, type Part } from './merge';

export type UnicornAnim = 'Idle' | 'Walk' | 'Happy';

type Props = {
  body: string;
  mane: string[];
  horn?: string;
  /** Read every frame, so callers can drive it from refs without re-rendering. */
  getAnim: () => UnicornAnim;
  /** Offsets the animation clock so a herd does not move in unison. */
  phase?: number;
};

const EYE = '#3A2A4A';
const LEGS: [number, number, number][] = [
  [0.22, 0.85, 0.36],
  [-0.22, 0.85, 0.36],
  [0.22, 0.85, -0.36],
  [-0.22, 0.85, -0.36],
];
const MOTION = reducedMotion ? 0.35 : 1;
const material = toon;

const sphere = (r: number) => new SphereGeometry(r, 12, 8);

function build(body: string, mane: string[], horn: string) {
  const accent = mane[0]!;
  const torso = merge([
    {
      geometry: new CapsuleGeometry(0.42, 0.7, 4, 12),
      colour: body,
      position: [0, 1.05, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new CapsuleGeometry(0.22, 0.4, 3, 10),
      colour: body,
      position: [0, 1.5, 0.45],
      rotation: [0.55, 0, 0],
    },
    ...mane.map((colour, i): Part => ({
      geometry: sphere(0.16),
      colour,
      position: [0, 1.95 - i * 0.17, 0.32 - i * 0.1],
    })),
  ]);

  const head = merge([
    { geometry: sphere(0.34), colour: body, scale: [1, 1, 1.12] },
    { geometry: sphere(0.22), colour: body, position: [0, -0.1, 0.3] },
    { geometry: sphere(0.15), colour: accent, position: [0, 0.3, -0.06] },
    {
      geometry: new ConeGeometry(0.075, 0.42, 8),
      colour: horn,
      position: [0, 0.48, 0.14],
      rotation: [0.35, 0, 0],
    },
    ...[0.17, -0.17].flatMap((x): Part[] => [
      { geometry: new SphereGeometry(0.075, 8, 6), colour: EYE, position: [x, 0.08, 0.3] },
      {
        geometry: new SphereGeometry(0.025, 6, 4),
        colour: '#FFFFFF',
        position: [x + 0.02, 0.11, 0.36],
      },
      {
        geometry: new ConeGeometry(0.08, 0.2, 8),
        colour: body,
        position: [x, 0.36, -0.04],
        rotation: [-0.2, 0, x > 0 ? -0.3 : 0.3],
      },
    ]),
  ]);

  const leg = merge([
    { geometry: new CapsuleGeometry(0.12, 0.55, 3, 8), colour: body, position: [0, -0.4, 0] },
    {
      geometry: new CylinderGeometry(0.13, 0.14, 0.14, 8),
      colour: accent,
      position: [0, -0.78, 0],
    },
  ]);

  const tail = merge(
    mane.slice(0, 3).map((colour, i): Part => ({
      geometry: sphere(0.15 - i * 0.02),
      colour,
      position: [0, -i * 0.2, -0.08 - i * 0.08],
    })),
  );

  return { torso, head, leg, tail };
}

const cache = new Map<string, ReturnType<typeof build>>();

/**
 * Code-built unicorn (docs/DECISIONS.md): rounded primitives merged into seven
 * rigid parts, with Idle, Walk and Happy driven procedurally. It stands in for
 * a rigged glTF; a real model only has to honour the same props. Faces +z,
 * feet on y = 0.
 */
export function Unicorn({ body, mane, horn = '#FFD972', getAnim, phase = 0 }: Props) {
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const legs = useRef<(Group | null)[]>([]);

  const parts = useMemo(() => {
    const key = [body, horn, ...mane].join('|');
    let built = cache.get(key);
    if (!built) {
      built = build(body, mane, horn);
      cache.set(key, built);
    }
    return built;
  }, [body, mane, horn]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime + phase;
    const anim = getAnim();
    const ease = Math.min(1, delta * 12);

    let bob = Math.sin(t * 2) * 0.015;
    let swing = 0;
    let nod = Math.sin(t * 0.8) * 0.04;
    if (anim === 'Walk') {
      swing = Math.sin(t * 10) * 0.6;
      bob = Math.abs(Math.sin(t * 10)) * 0.05;
    } else if (anim === 'Happy') {
      swing = Math.sin(t * 9) * 0.25;
      bob = Math.abs(Math.sin(t * 9)) * 0.35 * MOTION;
      nod = Math.sin(t * 9) * 0.18;
    }

    if (root.current) root.current.position.y += (bob - root.current.position.y) * ease;
    if (head.current) head.current.rotation.x += (nod - head.current.rotation.x) * ease;
    if (tail.current) tail.current.rotation.y = Math.sin(t * (anim === 'Idle' ? 2 : 8)) * 0.35;
    legs.current.forEach((leg, i) => {
      if (!leg) return;
      // Diagonal pairs move together.
      const target = i === 0 || i === 3 ? swing : -swing;
      leg.rotation.x += (target - leg.rotation.x) * ease;
    });
  });

  return (
    <group ref={root}>
      <mesh geometry={parts.torso} material={material} castShadow />
      <group ref={head} position={[0, 1.85, 0.62]}>
        <mesh geometry={parts.head} material={material} />
      </group>
      {LEGS.map((position, i) => (
        <group
          key={i}
          position={position}
          ref={(g) => {
            legs.current[i] = g;
          }}
        >
          <mesh geometry={parts.leg} material={material} />
        </group>
      ))}
      <group ref={tail} position={[0, 1.2, -0.72]}>
        <mesh geometry={parts.tail} material={material} />
      </group>
    </group>
  );
}

export const LUNA_COLOURS = {
  body: '#F1EAFF',
  mane: ['#FF8FD8', '#FFD972', '#9AF0D5', '#8AD3FF', '#C9B6FF'],
};

// Nube, Chispa, Brisa (§6.4) plus two herd-mates for counts above three.
export const BABY_COLOURS = [
  { body: '#9AF0D5', mane: ['#FFFFFF', '#C9B6FF', '#FF8FD8'] },
  { body: '#FFC9A8', mane: ['#FFFFFF', '#FFD972', '#FF8FD8'] },
  { body: '#8AD3FF', mane: ['#FFFFFF', '#9AF0D5', '#C9B6FF'] },
  { body: '#C9B6FF', mane: ['#FFFFFF', '#FF8FD8', '#FFD972'] },
  { body: '#FFB3DF', mane: ['#FFFFFF', '#8AD3FF', '#9AF0D5'] },
];
