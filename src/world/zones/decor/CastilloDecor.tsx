import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import type { Part } from '../../../characters/merge';
import { Tappable } from '../../Tappable';
import { CASTILLO } from '../defs';
import { Built } from './shared';

const WALL = '#FFC4EA';
const TOWER = '#FFE3F5';
const ROOF = '#C9B6FF';

// Pink-and-lavender castle (§4.1), facing the meadow.
const castle = (): Part[] => [
  { geometry: new BoxGeometry(6.4, 4, 4), colour: WALL, position: [0, 2, 0] },
  ...(
    [
      [3.2, 2.1],
      [-3.2, 2.1],
      [3.2, -2.1],
      [-3.2, -2.1],
    ] as const
  ).flatMap(([x, z]): Part[] => [
    { geometry: new CylinderGeometry(1.1, 1.15, 6, 14), colour: TOWER, position: [x, 3, z] },
    { geometry: new ConeGeometry(1.45, 2.2, 14), colour: ROOF, position: [x, 7.1, z] },
    { geometry: new SphereGeometry(0.16, 8, 6), colour: '#FFD972', position: [x, 8.3, z] },
  ]),
  { geometry: new CylinderGeometry(1.35, 1.4, 8.4, 14), colour: TOWER, position: [0, 4.2, -0.8] },
  { geometry: new ConeGeometry(1.75, 2.8, 14), colour: '#FF8FD8', position: [0, 9.8, -0.8] },
  { geometry: new SphereGeometry(0.2, 8, 6), colour: '#FFD972', position: [0, 11.3, -0.8] },
  // Gate, balcony and windows.
  { geometry: new BoxGeometry(1.7, 2.5, 0.3), colour: '#B08968', position: [0, 1.25, 2.02] },
  {
    geometry: new CylinderGeometry(0.85, 0.85, 0.3, 14, 1, false, 0, Math.PI),
    colour: '#B08968',
    position: [0, 2.5, 2.02],
    rotation: [Math.PI / 2, Math.PI / 2, 0],
  },
  { geometry: new BoxGeometry(2.6, 0.25, 1), colour: '#FFFFFF', position: [0, 3.5, 2.4] },
  ...[-2.1, 2.1].map((x): Part => ({
    geometry: new BoxGeometry(0.7, 0.9, 0.1),
    colour: '#8AD3FF',
    position: [x, 2.6, 2.02],
  })),
];

const balloons = (colours: string[]) => (): Part[] =>
  colours.flatMap((colour, i): Part[] => {
    const x = (i - (colours.length - 1) / 2) * 0.55;
    const y = 2.3 + (i % 2) * 0.35;
    return [
      {
        geometry: new SphereGeometry(0.42, 12, 10),
        colour,
        position: [x, y, 0],
        scale: [1, 1.2, 1],
      },
      {
        geometry: new CylinderGeometry(0.012, 0.012, y - 0.4, 4),
        colour: '#FFFFFF',
        position: [x * 0.5, (y - 0.4) / 2 + 0.1, 0],
        rotation: [0, 0, -x * 0.25],
      },
    ];
  });

// Bunches in the learning colours (§6.2); a preview of the balloon game.
const BUNCHES = [
  { x: -9, z: -9.5, colours: ['#FF4D5E', '#FFD23F', '#3D8BFF'], rate: 0.8 },
  { x: 10, z: -7.5, colours: ['#FF7AC8', '#3DD68C', '#9B6BFF'], rate: 0.9 },
  { x: -3.5, z: -11, colours: ['#FF9A3D', '#FFFFFF', '#FF7AC8'], rate: 1 },
];

export default function CastilloDecor() {
  return (
    <>
      <Built parts={castle} {...CASTILLO.castle} />
      {BUNCHES.map((b) => (
        <Tappable key={b.rate} x={b.x} z={b.z} react="float" rate={b.rate} hit={[1.1, 3.2]}>
          <Built parts={balloons(b.colours)} />
        </Tappable>
      ))}
    </>
  );
}
