import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import type { Part } from '../../../characters/merge';
import { Tappable } from '../../Tappable';
import { BOSQUE } from '../defs';
import { Built, Pool } from './shared';

const SNOW = '#FFFFFF';
const EYE = '#3A2A4A';

const snowman = (): Part[] => [
  { geometry: new SphereGeometry(0.62, 14, 10), colour: SNOW, position: [0, 0.55, 0] },
  { geometry: new SphereGeometry(0.45, 14, 10), colour: SNOW, position: [0, 1.4, 0] },
  { geometry: new SphereGeometry(0.33, 14, 10), colour: SNOW, position: [0, 2.05, 0] },
  {
    geometry: new ConeGeometry(0.07, 0.34, 8),
    colour: '#FF9A3D',
    position: [0, 2.05, 0.42],
    rotation: [Math.PI / 2, 0, 0],
  },
  ...[0.12, -0.12].map((x): Part => ({
    geometry: new SphereGeometry(0.045, 6, 6),
    colour: EYE,
    position: [x, 2.15, 0.3],
  })),
  {
    geometry: new CylinderGeometry(0.32, 0.36, 0.14, 12),
    colour: '#3DD68C',
    position: [0, 1.75, 0],
  },
  { geometry: new CylinderGeometry(0.3, 0.3, 0.05, 12), colour: '#5A3A6A', position: [0, 2.34, 0] },
  { geometry: new CylinderGeometry(0.2, 0.2, 0.3, 12), colour: '#5A3A6A', position: [0, 2.5, 0] },
  ...[1, -1].map((side): Part => ({
    geometry: new BoxGeometry(0.6, 0.05, 0.05),
    colour: '#B08968',
    position: [0.68 * side, 1.5, 0],
    rotation: [0, 0, 0.4 * side],
  })),
];

// Ice crystals that ring when tapped.
const crystal = (): Part[] => [
  { geometry: new ConeGeometry(0.34, 0.9, 6), colour: '#BDEBFF', position: [0, 1.15, 0] },
  {
    geometry: new ConeGeometry(0.34, 0.5, 6),
    colour: '#DDF4FF',
    position: [0, 0.45, 0],
    rotation: [Math.PI, 0, 0],
  },
  {
    geometry: new ConeGeometry(0.18, 0.5, 6),
    colour: '#BDEBFF',
    position: [0.34, 0.5, 0.1],
    rotation: [0, 0, -0.5],
  },
  {
    geometry: new ConeGeometry(0.16, 0.44, 6),
    colour: '#DDF4FF',
    position: [-0.3, 0.44, -0.1],
    rotation: [0, 0, 0.5],
  },
];

const CRYSTALS = [
  { x: -9.5, z: -9, rate: 1.26 },
  { x: 3, z: -11.5, rate: 1.5 },
  { x: 11, z: -1.5, rate: 1.68 },
  { x: -11, z: -3, rate: 2 },
];

/** Soft bands of colour far behind the trees (a generic aurora, §4.1). */
function Aurora() {
  return (
    <>
      {[
        { x: -18, y: 26, colour: '#9AF0D5', tilt: 0.12 },
        { x: 14, y: 30, colour: '#C9B6FF', tilt: -0.1 },
      ].map((band) => (
        <mesh
          key={band.colour}
          position={[band.x, band.y, -70]}
          rotation={[0, 0, band.tilt]}
          raycast={() => null}
        >
          <planeGeometry args={[60, 7]} />
          <meshBasicMaterial
            color={band.colour}
            transparent
            opacity={0.45}
            fog={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

export default function BosqueDecor() {
  return (
    <>
      <Pool {...BOSQUE.pond} r={3.2} colour="#BDEBFF" />
      <Aurora />
      <Tappable {...BOSQUE.snowman} react="spin" hit={[1.1, 2.8]} walk>
        <Built parts={snowman} />
      </Tappable>
      {CRYSTALS.map((c) => (
        <Tappable
          key={c.rate}
          x={c.x}
          z={c.z}
          react="bloom"
          sfx="chime"
          rate={c.rate}
          hit={[0.95, 1.8]}
        >
          <Built parts={crystal} />
        </Tappable>
      ))}
    </>
  );
}
