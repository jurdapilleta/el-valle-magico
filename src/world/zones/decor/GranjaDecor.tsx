import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import type { Part } from '../../../characters/merge';
import { Tappable } from '../../Tappable';
import { GRANJA } from '../defs';
import { Built, Pool } from './shared';

const RED = '#E5534B';
const TRIM = '#FFF6E5';

// Red barn with a white-trimmed door (§4.1).
const barn = (): Part[] => [
  { geometry: new BoxGeometry(6.2, 3.4, 5), colour: RED, position: [0, 1.7, 0] },
  {
    geometry: new ConeGeometry(4.5, 2.4, 4),
    colour: '#8C4A3F',
    position: [0, 4.6, 0],
    rotation: [0, Math.PI / 4, 0],
    scale: [1, 1, 0.82],
  },
  { geometry: new BoxGeometry(2, 2.5, 0.2), colour: TRIM, position: [0, 1.25, 2.5] },
  { geometry: new BoxGeometry(1.7, 2.2, 0.24), colour: '#B5413A', position: [0, 1.1, 2.5] },
  { geometry: new BoxGeometry(0.9, 0.9, 0.2), colour: TRIM, position: [0, 3.1, 2.46] },
  ...[-2.3, 2.3].map((x): Part => ({
    geometry: new BoxGeometry(0.9, 0.9, 0.2),
    colour: TRIM,
    position: [x, 2, 2.46],
  })),
];

const STRAW = '#F2D27A';
const hay = (): Part[] => [
  {
    geometry: new CylinderGeometry(0.7, 0.7, 1.1, 16),
    colour: STRAW,
    position: [0, 0.7, 0],
    rotation: [0, 0, Math.PI / 2],
  },
  ...[0.56, -0.56].map((x): Part => ({
    geometry: new CylinderGeometry(0.45, 0.45, 0.02, 12),
    colour: '#E0B95A',
    position: [x, 0.7, 0],
    rotation: [0, 0, Math.PI / 2],
  })),
];

const pumpkin = (): Part[] => [
  {
    geometry: new SphereGeometry(0.5, 12, 10),
    colour: '#FF9A3D',
    position: [0, 0.4, 0],
    scale: [1, 0.78, 1],
  },
  {
    geometry: new CylinderGeometry(0.06, 0.08, 0.25, 6),
    colour: '#6CC477',
    position: [0, 0.85, 0],
  },
];

const HAY = [
  { x: -7, z: -8, rate: 0.7 },
  { x: 9, z: -12, rate: 0.8 },
];
const PUMPKINS = [
  { x: 9, z: -10.5, rate: 1 },
  { x: -9.5, z: -8.5, rate: 1.15 },
  { x: 1.5, z: -11.5, rate: 1.3 },
];

export default function GranjaDecor() {
  return (
    <>
      <Built parts={barn} {...GRANJA.barn} />
      <Pool {...GRANJA.pond} r={3} colour="#8AD3FF" />
      {HAY.map((h) => (
        <Tappable key={h.rate} x={h.x} z={h.z} react="bounce" rate={h.rate} hit={[1.1, 1.8]}>
          <Built parts={hay} />
        </Tappable>
      ))}
      {PUMPKINS.map((p) => (
        <Tappable key={p.rate} x={p.x} z={p.z} react="bounce" rate={p.rate} hit={[0.95, 1.4]}>
          <Built parts={pumpkin} />
        </Tappable>
      ))}
    </>
  );
}
