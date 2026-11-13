import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, CylinderGeometry, SphereGeometry, type Group } from 'three';
import type { Part } from '../../../characters/merge';
import { Tappable } from '../../Tappable';
import { HUB } from '../defs';
import { Built } from './shared';

const WOOD = '#C98A5E';

const swingFrame = (): Part[] => [
  ...[1.1, -1.1].map((x): Part => ({
    geometry: new CylinderGeometry(0.1, 0.13, 3.2, 8),
    colour: WOOD,
    position: [x, 1.6, 0],
  })),
  {
    geometry: new CylinderGeometry(0.1, 0.1, 2.6, 8),
    colour: WOOD,
    position: [0, 3.15, 0],
    rotation: [0, 0, Math.PI / 2],
  },
];

// Hangs from the beam: the origin is the pivot.
const swingSeat = (): Part[] => [
  ...[0.38, -0.38].map((x): Part => ({
    geometry: new CylinderGeometry(0.025, 0.025, 2.3, 6),
    colour: '#FFFFFF',
    position: [x, -1.15, 0],
  })),
  { geometry: new BoxGeometry(1, 0.1, 0.4), colour: '#FF8FD8', position: [0, -2.3, 0] },
];

const flower = (petal: string) => (): Part[] => [
  { geometry: new CylinderGeometry(0.05, 0.06, 0.7, 6), colour: '#6CC477', position: [0, 0.35, 0] },
  { geometry: new SphereGeometry(0.16, 10, 8), colour: '#FFD23F', position: [0, 0.78, 0] },
  ...Array.from({ length: 6 }, (_, i): Part => {
    const a = (i / 6) * Math.PI * 2;
    return {
      geometry: new SphereGeometry(0.17, 10, 8),
      colour: petal,
      position: [Math.cos(a) * 0.26, 0.76, Math.sin(a) * 0.26],
      scale: [1, 0.6, 1],
    };
  }),
];

// A row of flowers that chime up a scale when tapped (§4.1 free play).
const FLOWERS: { x: number; z: number; colour: string; rate: number }[] = [
  { x: -7.5, z: -5.2, colour: '#FF7AC8', rate: 0.75 },
  { x: -4.6, z: -6.6, colour: '#9B6BFF', rate: 0.84 },
  { x: -1.8, z: -7.4, colour: '#FF9A3D', rate: 0.94 },
  { x: 1.8, z: -7.4, colour: '#3D8BFF', rate: 1 },
  { x: 4.6, z: -6.6, colour: '#FF4D5E', rate: 1.12 },
  { x: 7.5, z: -5.2, colour: '#FFFFFF', rate: 1.26 },
];

const wing = (colour: string) => (): Part[] => [
  { geometry: new SphereGeometry(0.2, 8, 6), colour, position: [0.2, 0, 0], scale: [1, 0.12, 0.8] },
];

function Butterfly({ colour, phase }: { colour: string; phase: number }) {
  const body = useRef<Group>(null);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    if (body.current) {
      body.current.position.set(
        Math.cos(t * 0.7) * 0.7,
        1.5 + Math.sin(t * 1.9) * 0.2,
        Math.sin(t * 0.7) * 0.7,
      );
      body.current.rotation.y = -t * 0.7;
    }
    const flap = Math.sin(t * 14) * 0.9;
    if (left.current) left.current.rotation.z = flap;
    if (right.current) right.current.rotation.z = Math.PI - flap;
  });
  return (
    <group ref={body}>
      <group ref={left}>
        <Built parts={wing(colour)} />
      </group>
      <group ref={right}>
        <Built parts={wing(colour)} />
      </group>
    </group>
  );
}

export default function HubDecor() {
  return (
    <>
      <Built parts={swingFrame} x={HUB.swing.x} z={HUB.swing.z} />
      <Tappable {...HUB.swing} react="swing" pivotY={3.1} hit={[1.2, 3]} sfx="sparkle" walk>
        <Built parts={swingSeat} />
      </Tappable>

      {FLOWERS.map((f) => (
        <Tappable
          key={f.rate}
          x={f.x}
          z={f.z}
          react="bloom"
          sfx="chime"
          rate={f.rate}
          hit={[0.9, 1.6]}
        >
          <Built parts={flower(f.colour)} />
        </Tappable>
      ))}

      <Tappable x={-9} z={-3.5} react="spin" sfx="sparkle" rate={1.3} hit={[1.2, 2.4]}>
        <Butterfly colour="#FF8FD8" phase={0} />
      </Tappable>
      <Tappable x={9} z={-3.5} react="spin" sfx="sparkle" rate={1.5} hit={[1.2, 2.4]}>
        <Butterfly colour="#8AD3FF" phase={2} />
      </Tappable>
      <Tappable x={-3} z={-2.5} react="spin" sfx="sparkle" rate={1.7} hit={[1.2, 2.4]}>
        <Butterfly colour="#FFD972" phase={4} />
      </Tappable>
    </>
  );
}
