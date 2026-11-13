import { ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import type { Part } from '../../../characters/merge';
import { Tappable } from '../../Tappable';
import { LAGO, ZONES } from '../defs';
import { Built, Pool, Rainbow } from './shared';

const lilyPad = (flower: string) => (): Part[] => [
  {
    geometry: new CylinderGeometry(0.75, 0.75, 0.08, 16),
    colour: '#6CC477',
    position: [0, 0.08, 0],
  },
  { geometry: new ConeGeometry(0.22, 0.34, 8), colour: flower, position: [0.1, 0.3, 0.05] },
  { geometry: new SphereGeometry(0.08, 6, 6), colour: '#FFD23F', position: [0.1, 0.48, 0.05] },
];

// Musical lily pads near the shore (a taste of Nenúfares Musicales).
const PADS = [
  { x: -4.4, z: -9.6, colour: '#FF7AC8', rate: 0.5 },
  { x: -1.6, z: -8.8, colour: '#FFFFFF', rate: 0.63 },
  { x: 1.6, z: -8.8, colour: '#FFD23F', rate: 0.75 },
  { x: 4.4, z: -9.6, colour: '#9B6BFF', rate: 1 },
];

// Melodía's rock at the water's edge.
const rock = (): Part[] => [
  {
    geometry: new SphereGeometry(1.15, 10, 8),
    colour: '#C9C2D6',
    position: [0, 0, 0],
    scale: [1, 0.22, 0.9],
  },
];

export default function LagoDecor() {
  const host = ZONES.lago.host!;
  return (
    <>
      <Pool {...LAGO.lake} colour="#8AD3FF" />
      <Rainbow x={LAGO.lake.x} z={LAGO.lake.z - 9} span={9} />
      <Built parts={rock} x={host.x} z={host.z} />
      {PADS.map((p) => (
        <Tappable
          key={p.rate}
          x={p.x}
          z={p.z}
          react="bounce"
          sfx="chime"
          rate={p.rate}
          hit={[1, 1.2]}
        >
          <Built parts={lilyPad(p.colour)} />
        </Tappable>
      ))}
    </>
  );
}
