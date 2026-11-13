import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Object3D, type InstancedMesh } from 'three';
import { reducedMotion } from '../characters/merge';

// All of the game's 3D particles: one instanced mesh, one draw call (§5.3).
// Anything may call `burst(...)`; the component below animates and draws them.

type Kind = 'sparkle' | 'confetti' | 'ring';
type Particle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size: number;
  gravity: number;
  colour: Color;
};

const MAX = 160;
const GOLD = ['#FFD972', '#FFF0B8', '#FFFFFF'].map((c) => new Color(c));
const PARTY = ['#FF8FD8', '#FFD972', '#9AF0D5', '#8AD3FF', '#C9B6FF', '#FF9F8A'].map(
  (c) => new Color(c),
);
const particles: Particle[] = [];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;

/** Emits a burst at a world position. Celebrations stay short (§2: two seconds, not ten). */
export function burst(kind: Kind, at: { x: number; y: number; z: number }): void {
  const scale = reducedMotion ? 0.4 : 1;
  const count = Math.round({ sparkle: 14, confetti: 60, ring: 28 }[kind] * scale);
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX) particles.shift();
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const base = { x: at.x, y: at.y, z: at.z, age: 0 };
    if (kind === 'sparkle') {
      const speed = 1 + Math.random() * 1.6;
      particles.push({
        ...base,
        vx: Math.cos(angle) * speed,
        vy: 1 + Math.random() * 2,
        vz: Math.sin(angle) * speed * 0.6,
        life: 0.6 + Math.random() * 0.4,
        size: 0.09 + Math.random() * 0.07,
        gravity: 2,
        colour: pick(GOLD),
      });
    } else if (kind === 'confetti') {
      const speed = 1.5 + Math.random() * 3.5;
      particles.push({
        ...base,
        vx: Math.cos(angle) * speed,
        vy: 4 + Math.random() * 4,
        vz: Math.sin(angle) * speed * 0.5,
        life: 1.4 + Math.random() * 0.6,
        size: 0.1 + Math.random() * 0.08,
        gravity: 7,
        colour: pick(PARTY),
      });
    } else {
      // A rainbow ring that widens around its centre (level up, §8.3).
      particles.push({
        ...base,
        x: at.x + Math.cos(angle) * 0.6,
        z: at.z + Math.sin(angle) * 0.6,
        vx: Math.cos(angle) * 1.8,
        vy: 0.9,
        vz: Math.sin(angle) * 1.8,
        life: 1.1,
        size: 0.13,
        gravity: 0,
        colour: PARTY[i % PARTY.length]!,
      });
    }
  }
}

const dummy = new Object3D();

export function Particles() {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    // Instance colours must exist before the first draw.
    const m = mesh.current!;
    for (let i = 0; i < MAX; i++) m.setColorAt(i, GOLD[0]!);
    m.count = 0;
  }, []);

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(delta, 0.1);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!;
      p.age += dt;
      if (p.age >= p.life) {
        particles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }
    particles.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      // Pop in, then shrink away.
      dummy.scale.setScalar(p.size * Math.sin(Math.PI * Math.min(1, p.age / p.life + 0.15)));
      dummy.rotation.set(p.age * 6, p.age * 4, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, p.colour);
    });
    m.count = particles.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, MAX]}
      frustumCulled={false}
      raycast={() => null}
    >
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
