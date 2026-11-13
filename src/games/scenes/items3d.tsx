import { useMemo } from 'react';
import {
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from 'three';
import { merge, toon, type Part } from '../../characters/merge';
import { COLOURS } from '../../content/items';
import { Glyph } from './kit';

// What the learning items look like on stage. Everything is built from
// rounded primitives in code (docs/DECISIONS.md), one draw call per item.

const EYE = '#3A2A4A';
const sphere = (r: number, w = 12, h = 8) => new SphereGeometry(r, w, h);
const eyes = (x: number, y: number, z: number, r = 0.045): Part[] =>
  [x, -x].map((ex) => ({ geometry: sphere(r, 8, 6), colour: EYE, position: [ex, y, z] }));

const cache = new Map<string, BufferGeometry>();

/** A merged shape, built once per `k` and shared by every copy on stage. */
export function Model({
  k,
  make,
  scale = 1,
  y = 0,
  yaw = 0,
  roll = 0,
}: {
  k: string;
  make: () => Part[];
  scale?: number;
  y?: number;
  yaw?: number;
  roll?: number;
}) {
  const geometry = useMemo(() => {
    let built = cache.get(k);
    if (!built) {
      built = merge(make());
      cache.set(k, built);
    }
    return built;
    // `make` is a pure function of `k`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  return (
    <mesh
      geometry={geometry}
      material={toon}
      scale={scale}
      position={[0, y, 0]}
      rotation={[0, yaw, roll]}
      raycast={() => null}
    />
  );
}

// ---- Colours ----

export function Balloon({ colour }: { colour: string }) {
  const hex = COLOURS[colour] ?? '#FFFFFF';
  return (
    <Model
      k={`balloon:${colour}`}
      make={() => [
        { geometry: sphere(0.55, 16, 12), colour: hex, position: [0, 2, 0], scale: [1, 1.2, 1] },
        { geometry: new ConeGeometry(0.1, 0.16, 8), colour: hex, position: [0, 1.3, 0] },
        {
          geometry: new CylinderGeometry(0.015, 0.015, 1.2, 4),
          colour: '#FFFFFF',
          position: [0, 0.62, 0],
        },
      ]}
    />
  );
}

export function Pearl({ colour }: { colour: string }) {
  return (
    <Model
      k={`pearl:${colour}`}
      make={() => [
        {
          geometry: sphere(0.42, 16, 12),
          colour: COLOURS[colour] ?? '#FFFFFF',
          position: [0, 0.75, 0],
        },
        { geometry: sphere(0.1, 8, 6), colour: '#FFFFFF', position: [0.14, 0.92, 0.3] },
      ]}
    />
  );
}

// ---- Shapes ----

function outline(points: [number, number][]): Shape {
  const shape = new Shape();
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return shape;
}

function shapeGeometry(shape: string): BufferGeometry {
  const depth = 0.22;
  const extrude = (s: Shape) =>
    new ExtrudeGeometry(s, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
  switch (shape) {
    case 'circulo':
      return new CylinderGeometry(0.55, 0.55, depth, 28).rotateX(Math.PI / 2);
    case 'cuadrado':
      return new BoxGeometry(0.98, 0.98, depth);
    case 'triangulo':
      return extrude(
        outline([
          [-0.62, -0.5],
          [0.62, -0.5],
          [0, 0.6],
        ]),
      );
    case 'estrella':
      return extrude(
        outline(
          Array.from({ length: 10 }, (_, k): [number, number] => {
            const r = k % 2 === 0 ? 0.66 : 0.28;
            const a = Math.PI / 2 + (k * Math.PI) / 5;
            return [Math.cos(a) * r, Math.sin(a) * r];
          }),
        ),
      );
    default: {
      // corazon
      const heart = new Shape();
      heart.moveTo(0, -0.55);
      heart.bezierCurveTo(-0.9, 0.05, -0.55, 0.75, 0, 0.3);
      heart.bezierCurveTo(0.55, 0.75, 0.9, 0.05, 0, -0.55);
      return extrude(heart);
    }
  }
}

/** A gem (or, with `hole`, the dark hollow it fits into). All gems share one colour: only shape differs. */
export function Gem({ shape, hole, roll = 0 }: { shape: string; hole?: boolean; roll?: number }) {
  return (
    <Model
      k={`gem:${shape}:${hole ? 'hole' : 'gem'}`}
      roll={roll}
      y={0.9}
      scale={hole ? 1.12 : 1}
      make={() => [{ geometry: shapeGeometry(shape), colour: hole ? '#7A5C8A' : '#8AD3FF' }]}
    />
  );
}

// ---- Sizes ----

export const SIZE_SCALE: Record<string, number> = { pequena: 0.6, mediana: 0.85, grande: 1.15 };

export function Door({ size, ghost }: { size: string; ghost?: boolean }) {
  return (
    <Model
      k={`door:${ghost ? 'ghost' : 'door'}`}
      scale={SIZE_SCALE[size] ?? 1}
      make={() =>
        ghost
          ? [{ geometry: new BoxGeometry(1.1, 2, 0.12), colour: '#CFC6DC', position: [0, 1, 0] }]
          : [
              { geometry: new BoxGeometry(1.1, 2, 0.16), colour: '#FFE3F5', position: [0, 1, 0] },
              {
                geometry: new BoxGeometry(0.86, 1.78, 0.2),
                colour: '#C98A5E',
                position: [0, 0.92, 0.02],
              },
              { geometry: sphere(0.07, 8, 6), colour: '#FFD23F', position: [0.28, 0.9, 0.14] },
            ]
      }
    />
  );
}

const BLOCK_COLOURS = ['#FF7AC8', '#3D8BFF', '#FFD23F', '#3DD68C', '#9B6BFF'];
export const BLOCK_SIZE: Record<string, number> = { pequena: 0.55, mediana: 0.8, grande: 1.05 };

export function Block({ colour = 0, size = 0.62 }: { colour?: number; size?: number }) {
  const hex = BLOCK_COLOURS[colour % BLOCK_COLOURS.length]!;
  return (
    <Model
      k={`block:${hex}`}
      scale={size}
      make={() => [{ geometry: new BoxGeometry(1, 1, 1), colour: hex, position: [0, 0.5, 0] }]}
    />
  );
}

// ---- Counting ----

export function Egg({ hatched }: { hatched: boolean }) {
  return hatched ? (
    <Model
      k="chick"
      make={() => [
        { geometry: sphere(0.34), colour: '#FFFDF5', position: [0, 0.2, 0], scale: [1, 0.6, 1] },
        { geometry: sphere(0.3), colour: '#FFD23F', position: [0, 0.5, 0] },
        { geometry: sphere(0.22), colour: '#FFD23F', position: [0, 0.9, 0.04] },
        {
          geometry: new ConeGeometry(0.07, 0.16, 8),
          colour: '#FF9A3D',
          position: [0, 0.88, 0.28],
          rotation: [Math.PI / 2, 0, 0],
        },
        ...eyes(0.09, 0.96, 0.2, 0.035),
      ]}
    />
  ) : (
    <Model
      k="egg"
      make={() => [
        {
          geometry: sphere(0.36, 14, 12),
          colour: '#FFF6E5',
          position: [0, 0.46, 0],
          scale: [1, 1.3, 1],
        },
      ]}
    />
  );
}

/** A basket holding `count` apples. */
export function Basket({ count }: { count: number }) {
  return (
    <Model
      k={`basket:${count}`}
      make={() => [
        {
          geometry: new CylinderGeometry(1, 0.8, 0.5, 18),
          colour: '#C98A5E',
          position: [0, 0.25, 0],
        },
        ...Array.from({ length: count }, (_, i): Part => {
          // Two rows of three, so the quantity can be read at a glance.
          const col = i % 3;
          const row = Math.floor(i / 3);
          return {
            geometry: sphere(0.24, 12, 10),
            colour: '#FF4D5E',
            position: [(col - 1) * 0.52, 0.68, (row - 0.5) * 0.52],
          };
        }),
      ]}
    />
  );
}

// ---- Letters and tracks ----

export function LetterTile({ letter }: { letter: string }) {
  return (
    <>
      <Model
        k="ice"
        make={() => [
          { geometry: new BoxGeometry(1.05, 1.05, 0.4), colour: '#BDEBFF', position: [0, 0.6, 0] },
        ]}
      />
      <Glyph text={letter.toUpperCase()} y={0.62} size={0.86} />
    </>
  );
}

const trackTextures = new Map<string, CanvasTexture>();
function trackTexture(kind: string): CanvasTexture {
  let texture = trackTextures.get(kind);
  if (!texture) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.arc(64, 64, 60, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = c.strokeStyle = '#4A6FA5';
    c.lineWidth = 9;
    c.lineCap = 'round';
    const oval = (x: number, y: number, rx: number, ry: number) => {
      c.beginPath();
      c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      c.fill();
    };
    if (kind === 'pata') {
      oval(64, 80, 24, 19);
      [-30, -10, 10, 30].forEach((dx, i) => oval(64 + dx, i === 0 || i === 3 ? 52 : 40, 9, 11));
    } else if (kind === 'pajaro') {
      for (const [x, y] of [
        [36, 34],
        [64, 26],
        [92, 34],
        [64, 102],
      ] as const) {
        c.beginPath();
        c.moveTo(64, 76);
        c.lineTo(x, y);
        c.stroke();
      }
    } else if (kind === 'pezuna') {
      oval(48, 64, 13, 30);
      oval(80, 64, 13, 30);
    } else {
      c.beginPath();
      c.roundRect(42, 22, 44, 56, 20);
      c.fill();
      c.beginPath();
      c.roundRect(46, 86, 36, 22, 9);
      c.fill();
    }
    texture = new CanvasTexture(canvas);
    trackTextures.set(kind, texture);
  }
  return texture;
}

/** A footprint in the snow, drawn as a round picture that always faces the player. */
export function Track({ kind }: { kind: string }) {
  return (
    <sprite position={[0, 0.75, 0]} scale={1.15} raycast={() => null}>
      <spriteMaterial map={trackTexture(kind)} depthTest={false} />
    </sprite>
  );
}

// ---- Emotions ----

const FACE_COLOURS = ['#9AF0D5', '#FFC9A8', '#8AD3FF', '#C9B6FF'];

function mouth(emotion: string): Part[] {
  const dark = '#5A3A6A';
  const arc = new TorusGeometry(0.17, 0.035, 6, 14, Math.PI);
  if (emotion === 'contento')
    return [{ geometry: arc, colour: dark, position: [0, 0.62, 0.55], rotation: [0, 0, Math.PI] }];
  if (emotion === 'triste') return [{ geometry: arc, colour: dark, position: [0, 0.46, 0.53] }];
  if (emotion === 'enojado')
    return [
      { geometry: new BoxGeometry(0.26, 0.05, 0.05), colour: dark, position: [0, 0.5, 0.54] },
    ];
  return [
    { geometry: new TorusGeometry(0.09, 0.035, 6, 14), colour: dark, position: [0, 0.5, 0.54] },
  ];
}

function brows(emotion: string): Part[] {
  // Positive tilt lifts the outer end of the right-hand brow.
  const tilt = { contento: 0, triste: -0.5, enojado: 0.55, sorprendido: 0 }[emotion] ?? 0;
  const lift = emotion === 'sorprendido' ? 0.1 : 0;
  if (emotion === 'contento') return [];
  return [1, -1].map((side) => ({
    geometry: new BoxGeometry(0.18, 0.04, 0.04),
    colour: '#5A3A6A',
    position: [0.17 * side, 0.98 + lift, 0.44],
    rotation: [0, 0, tilt * side],
  }));
}

export function Face({ emotion, colour = 0 }: { emotion: string; colour?: number }) {
  const hex = FACE_COLOURS[colour % FACE_COLOURS.length]!;
  return (
    <Model
      k={`face:${emotion}:${hex}`}
      make={() => [
        { geometry: sphere(0.55, 18, 14), colour: hex, position: [0, 0.7, 0] },
        {
          geometry: new ConeGeometry(0.08, 0.36, 10),
          colour: '#FFD972',
          position: [0, 1.36, 0.06],
        },
        ...eyes(0.17, 0.82, 0.48, emotion === 'sorprendido' ? 0.085 : 0.06),
        ...mouth(emotion),
        ...brows(emotion),
        ...(emotion === 'triste'
          ? [
              {
                geometry: sphere(0.05, 8, 6),
                colour: '#3D8BFF',
                position: [0.22, 0.68, 0.5],
              } as Part,
            ]
          : []),
        ...(emotion === 'enojado'
          ? [0.3, -0.3].map((x): Part => ({
              geometry: sphere(0.09, 8, 6),
              colour: '#FF4D5E',
              position: [x, 0.62, 0.42],
            }))
          : []),
      ]}
    />
  );
}

// ---- Animals ----

type Ears = 'round' | 'point' | 'long' | 'flop';
type Spec = {
  t: 'quad' | 'bird' | 'fish' | 'frog' | 'turtle';
  c: string;
  c2: string;
  ears?: Ears;
  x?: string[];
};

const SPECS: Record<string, Spec> = {
  vaca: { t: 'quad', c: '#FFFFFF', c2: '#F6B8C8', ears: 'flop', x: ['patches', 'horns'] },
  cerdo: { t: 'quad', c: '#FFB3C7', c2: '#FF8FAE', ears: 'point', x: ['snoutDisc', 'curl'] },
  oveja: { t: 'quad', c: '#FFFDF5', c2: '#6B6470', ears: 'flop', x: ['wool', 'darkFace'] },
  caballo: {
    t: 'quad',
    c: '#B5763F',
    c2: '#D9A777',
    ears: 'point',
    x: ['mane', 'longTail', 'tall'],
  },
  gallina: { t: 'bird', c: '#FFFFFF', c2: '#FF9A3D', x: ['comb'] },
  pato: { t: 'bird', c: '#FFD23F', c2: '#FF9A3D', x: ['bill'] },
  perro: { t: 'quad', c: '#C98A5E', c2: '#F3D3B5', ears: 'flop', x: ['tailUp'] },
  gato: { t: 'quad', c: '#FF9A3D', c2: '#FFFFFF', ears: 'point', x: ['longTail'] },
  cabra: { t: 'quad', c: '#D9D4CC', c2: '#F3EFE8', ears: 'flop', x: ['horns', 'beard'] },
  zorro: { t: 'quad', c: '#F2762E', c2: '#FFFFFF', ears: 'point', x: ['bushy'] },
  oso: { t: 'quad', c: '#8A552B', c2: '#E8C9A0', ears: 'round', x: ['stout'] },
  conejo: { t: 'quad', c: '#EDEAE4', c2: '#FFC4D6', ears: 'long', x: ['puff'] },
  buho: { t: 'bird', c: '#9A6B45', c2: '#FF9A3D', x: ['bigEyes', 'tufts'] },
  ciervo: {
    t: 'quad',
    c: '#C68B59',
    c2: '#F3E3CF',
    ears: 'point',
    x: ['antlers', 'spots', 'tall'],
  },
  ardilla: { t: 'quad', c: '#C25B2A', c2: '#F3D3B5', ears: 'round', x: ['bigTail'] },
  pez: { t: 'fish', c: '#3D8BFF', c2: '#FFD23F' },
  rana: { t: 'frog', c: '#6CC477', c2: '#C9F0B0' },
  tortuga: { t: 'turtle', c: '#3F9A52', c2: '#9FE0A8' },
};

function quad({ c, c2, ears, x = [] }: Spec): Part[] {
  const has = (feature: string) => x.includes(feature);
  const leg = has('tall') ? 0.55 : 0.4;
  const up = leg - 0.4; // everything above the legs shifts with their length
  const girth = has('stout') ? 1.25 : 1;
  const face = has('darkFace') ? c2 : c;
  const parts: Part[] = [
    {
      geometry: new CapsuleGeometry(0.3, 0.45, 4, 12),
      colour: c,
      position: [0, 0.6 + up, 0],
      rotation: [Math.PI / 2, 0, 0],
      scale: [girth, 1, girth],
    },
    ...[
      [0.17, 0.24],
      [-0.17, 0.24],
      [0.17, -0.24],
      [-0.17, -0.24],
    ].map(([lx, lz]): Part => ({
      geometry: new CylinderGeometry(0.08, 0.08, leg, 8),
      colour: has('darkFace') ? c2 : c,
      position: [lx!, leg / 2, lz!],
    })),
    { geometry: sphere(0.27), colour: face, position: [0, 0.98 + up, 0.4] },
    has('snoutDisc')
      ? {
          geometry: new CylinderGeometry(0.13, 0.13, 0.1, 12),
          colour: c2,
          position: [0, 0.94 + up, 0.66],
          rotation: [Math.PI / 2, 0, 0],
        }
      : {
          geometry: sphere(0.14),
          colour: has('darkFace') ? face : c2,
          position: [0, 0.9 + up, 0.6],
        },
    ...eyes(0.11, 1.05 + up, 0.61),
  ];
  const earY = 1.2 + up;
  if (ears === 'round') {
    parts.push(
      ...[0.2, -0.2].map((ex): Part => ({
        geometry: sphere(0.1),
        colour: c,
        position: [ex, earY, 0.36],
      })),
    );
  } else if (ears === 'point') {
    parts.push(
      ...[1, -1].map((side): Part => ({
        geometry: new ConeGeometry(0.09, 0.22, 8),
        colour: c,
        position: [0.16 * side, earY + 0.04, 0.36],
        rotation: [0, 0, -0.2 * side],
      })),
    );
  } else if (ears === 'long') {
    parts.push(
      ...[0.1, -0.1].flatMap((ex): Part[] => [
        {
          geometry: new CapsuleGeometry(0.07, 0.4, 3, 8),
          colour: c,
          position: [ex, earY + 0.24, 0.34],
        },
        {
          geometry: new CapsuleGeometry(0.035, 0.32, 3, 6),
          colour: c2,
          position: [ex, earY + 0.24, 0.39],
        },
      ]),
    );
  } else if (ears === 'flop') {
    parts.push(
      ...[0.29, -0.29].map((ex): Part => ({
        geometry: sphere(0.12),
        colour: face,
        position: [ex, 1 + up, 0.36],
        scale: [0.6, 1, 0.5],
      })),
    );
  }
  if (has('horns'))
    parts.push(
      ...[1, -1].map((side): Part => ({
        geometry: new ConeGeometry(0.045, 0.2, 8),
        colour: '#F3E3CF',
        position: [0.13 * side, earY + 0.08, 0.34],
        rotation: [0, 0, -0.35 * side],
      })),
    );
  if (has('patches'))
    parts.push(
      ...(
        [
          [0.22, 0.72, 0.05, 0.16],
          [-0.2, 0.68, -0.2, 0.18],
          [0.05, 0.86, -0.25, 0.14],
          [0.2, 1.08, 0.36, 0.1],
        ] as const
      ).map(([px, py, pz, r]): Part => ({
        geometry: sphere(r),
        colour: '#4A4350',
        position: [px, py, pz],
      })),
    );
  if (has('wool'))
    parts.push(
      ...(
        [
          [0, 0.92, 0.05],
          [0.24, 0.72, 0.1],
          [-0.24, 0.72, 0.1],
          [0.2, 0.74, -0.25],
          [-0.2, 0.74, -0.25],
          [0, 0.9, -0.3],
          [0, 1.24, 0.36],
        ] as const
      ).map(([px, py, pz]): Part => ({ geometry: sphere(0.2), colour: c, position: [px, py, pz] })),
    );
  if (has('mane'))
    parts.push(
      ...[0, 1, 2].map((i): Part => ({
        geometry: sphere(0.12),
        colour: '#5A3A2A',
        position: [0, 1.3 + up - i * 0.14, 0.26 - i * 0.12],
      })),
    );
  if (has('spots'))
    parts.push(
      ...(
        [
          [0.14, 0.9, -0.05],
          [-0.12, 0.92, -0.2],
          [0.02, 0.94, 0.12],
        ] as const
      ).map(([px, py, pz]): Part => ({
        geometry: sphere(0.06, 8, 6),
        colour: '#FFFFFF',
        position: [px, py + up, pz],
      })),
    );
  if (has('antlers'))
    parts.push(
      ...[1, -1].flatMap((side): Part[] => [
        {
          geometry: new BoxGeometry(0.04, 0.4, 0.04),
          colour: '#8A552B',
          position: [0.14 * side, earY + 0.28, 0.32],
          rotation: [0, 0, -0.3 * side],
        },
        {
          geometry: new BoxGeometry(0.04, 0.2, 0.04),
          colour: '#8A552B',
          position: [0.26 * side, earY + 0.38, 0.32],
          rotation: [0, 0, -1 * side],
        },
      ]),
    );
  if (has('beard'))
    parts.push({
      geometry: new ConeGeometry(0.07, 0.2, 8),
      colour: '#FFFFFF',
      position: [0, 0.74 + up, 0.58],
      rotation: [Math.PI, 0, 0],
    });
  // Tails
  const back = -0.52;
  if (has('longTail'))
    parts.push({
      geometry: new CapsuleGeometry(0.05, 0.5, 3, 8),
      colour: has('mane') ? '#5A3A2A' : c,
      position: [0, 0.62 + up, back - 0.1],
      rotation: [0.6, 0, 0],
    });
  if (has('curl'))
    parts.push({
      geometry: new TorusGeometry(0.08, 0.03, 6, 12),
      colour: c2,
      position: [0, 0.72, back],
    });
  if (has('tailUp'))
    parts.push({
      geometry: new ConeGeometry(0.07, 0.34, 8),
      colour: c,
      position: [0, 0.88, back + 0.04],
      rotation: [-0.5, 0, 0],
    });
  if (has('puff'))
    parts.push({ geometry: sphere(0.13), colour: '#FFFFFF', position: [0, 0.66, back] });
  if (has('bushy'))
    parts.push(
      { geometry: sphere(0.2), colour: c, position: [0, 0.7, back - 0.14], scale: [1, 1, 1.6] },
      { geometry: sphere(0.13), colour: '#FFFFFF', position: [0, 0.74, back - 0.46] },
    );
  if (has('bigTail'))
    parts.push(
      { geometry: sphere(0.22), colour: c, position: [0, 0.7, back - 0.08] },
      { geometry: sphere(0.26), colour: c, position: [0, 1.02, back - 0.2] },
      { geometry: sphere(0.2), colour: c, position: [0, 1.32, back - 0.1] },
    );
  return parts;
}

function bird({ c, c2, x = [] }: Spec): Part[] {
  const owl = x.includes('bigEyes');
  const parts: Part[] = [
    { geometry: sphere(0.36), colour: c, position: [0, 0.5, 0], scale: [1, 1.1, 1.1] },
    { geometry: sphere(owl ? 0.3 : 0.22), colour: c, position: [0, owl ? 1 : 1.02, 0.1] },
    ...[0.34, -0.34].map((wx): Part => ({
      geometry: sphere(0.22),
      colour: owl ? '#7A5335' : c,
      position: [wx, 0.52, -0.02],
      scale: [0.4, 1, 0.9],
    })),
    ...[0.12, -0.12].map((fx): Part => ({
      geometry: new BoxGeometry(0.12, 0.05, 0.2),
      colour: '#FF9A3D',
      position: [fx, 0.03, 0.12],
    })),
  ];
  if (x.includes('bill'))
    parts.push({
      geometry: sphere(0.15),
      colour: c2,
      position: [0, 0.97, 0.34],
      scale: [1.2, 0.4, 1.3],
    });
  else
    parts.push({
      geometry: new ConeGeometry(0.07, 0.18, 8),
      colour: c2,
      position: [0, 0.98, owl ? 0.4 : 0.34],
      rotation: [Math.PI / 2, 0, 0],
    });
  if (x.includes('comb'))
    parts.push(
      ...[-0.07, 0, 0.07].map((cz, i): Part => ({
        geometry: sphere(0.07, 8, 6),
        colour: '#FF4D5E',
        position: [0, 1.24 + (i === 1 ? 0.04 : 0), 0.1 + cz],
      })),
      { geometry: sphere(0.06, 8, 6), colour: '#FF4D5E', position: [0, 0.86, 0.3] },
    );
  if (owl)
    parts.push(
      ...[0.13, -0.13].flatMap((ex): Part[] => [
        { geometry: sphere(0.12), colour: '#FFFFFF', position: [ex, 1.05, 0.3] },
        { geometry: sphere(0.06, 8, 6), colour: EYE, position: [ex, 1.05, 0.4] },
        { geometry: new ConeGeometry(0.07, 0.2, 6), colour: c, position: [ex * 1.5, 1.32, 0.1] },
      ]),
      { geometry: sphere(0.24), colour: '#E8C9A0', position: [0, 0.48, 0.2] },
    );
  else parts.push(...eyes(0.09, 1.07, 0.28, 0.035));
  return parts;
}

const fish = ({ c, c2 }: Spec): Part[] => [
  { geometry: sphere(0.42), colour: c, position: [0, 0.72, 0], scale: [1.45, 0.9, 0.5] },
  {
    geometry: new ConeGeometry(0.3, 0.4, 4),
    colour: c2,
    position: [-0.76, 0.72, 0],
    rotation: [0, 0, -Math.PI / 2],
    scale: [1, 1, 0.3],
  },
  {
    geometry: new ConeGeometry(0.16, 0.26, 4),
    colour: c2,
    position: [0, 1.14, 0],
    scale: [1.6, 1, 0.3],
  },
  { geometry: sphere(0.09, 8, 6), colour: '#FFFFFF', position: [0.34, 0.8, 0.17] },
  { geometry: sphere(0.045, 8, 6), colour: EYE, position: [0.36, 0.8, 0.24] },
];

const frog = ({ c, c2 }: Spec): Part[] => [
  { geometry: sphere(0.42), colour: c, position: [0, 0.38, 0], scale: [1.15, 0.85, 1] },
  { geometry: sphere(0.3), colour: c2, position: [0, 0.34, 0.18] },
  ...[0.42, -0.42].map((lx): Part => ({
    geometry: sphere(0.19),
    colour: '#4FAE5C',
    position: [lx, 0.15, 0.1],
  })),
  { geometry: sphere(0.34), colour: c, position: [0, 0.82, 0.04], scale: [1.2, 0.8, 1] },
  ...[0.19, -0.19].flatMap((ex): Part[] => [
    { geometry: sphere(0.13), colour: '#FFFFFF', position: [ex, 1.08, 0.1] },
    { geometry: sphere(0.065, 8, 6), colour: EYE, position: [ex, 1.1, 0.2] },
  ]),
];

const turtle = ({ c, c2 }: Spec): Part[] => [
  { geometry: sphere(0.48), colour: c, position: [0, 0.4, 0], scale: [1.05, 0.62, 1.2] },
  ...[0, 1, 2].map((i): Part => ({
    geometry: sphere(0.13),
    colour: '#2F7A40',
    position: [0, 0.66, -0.3 + i * 0.3],
    scale: [1.6, 0.4, 1],
  })),
  { geometry: sphere(0.19), colour: c2, position: [0, 0.42, 0.66] },
  ...[
    [0.42, 0.34],
    [-0.42, 0.34],
    [0.42, -0.34],
    [-0.42, -0.34],
  ].map(([fx, fz]): Part => ({ geometry: sphere(0.13), colour: c2, position: [fx!, 0.12, fz!] })),
  ...eyes(0.08, 0.5, 0.82, 0.035),
];

const BUILDERS = { quad, bird, fish, frog, turtle };

export function Animal({ animal, scale = 1 }: { animal: string; scale?: number }) {
  const spec = SPECS[animal] ?? SPECS.gato!;
  return <Model k={`animal:${animal}`} scale={scale * 1.15} make={() => BUILDERS[spec.t](spec)} />;
}

// ---- Homes ----

export function HomeModel({ home }: { home: string }) {
  return (
    <Model
      k={`home:${home}`}
      make={() =>
        home === 'granja'
          ? [
              { geometry: new BoxGeometry(1.5, 1, 1.2), colour: '#E5534B', position: [0, 0.5, 0] },
              {
                geometry: new ConeGeometry(1.2, 0.7, 4),
                colour: '#8C4A3F',
                position: [0, 1.35, 0],
                rotation: [0, Math.PI / 4, 0],
              },
              {
                geometry: new BoxGeometry(0.5, 0.7, 0.1),
                colour: '#FFF6E5',
                position: [0, 0.35, 0.61],
              },
            ]
          : home === 'bosque'
            ? [
                {
                  geometry: new CylinderGeometry(0.14, 0.18, 0.5, 8),
                  colour: '#C98A5E',
                  position: [0, 0.25, 0],
                },
                {
                  geometry: new ConeGeometry(0.75, 0.9, 10),
                  colour: '#3F9A52',
                  position: [0, 0.85, 0],
                },
                {
                  geometry: new ConeGeometry(0.58, 0.8, 10),
                  colour: '#4FAE5C',
                  position: [0, 1.4, 0],
                },
                {
                  geometry: new ConeGeometry(0.4, 0.7, 10),
                  colour: '#6CC477',
                  position: [0, 1.9, 0],
                },
              ]
            : [
                {
                  geometry: new CylinderGeometry(0.95, 0.95, 0.12, 24),
                  colour: '#8AD3FF',
                  position: [0, 0.06, 0],
                },
                {
                  geometry: new CylinderGeometry(0.4, 0.4, 0.05, 16),
                  colour: '#6CC477',
                  position: [0.3, 0.14, 0.2],
                },
                {
                  geometry: new TorusGeometry(0.45, 0.03, 6, 20),
                  colour: '#FFFFFF',
                  position: [-0.2, 0.13, -0.15],
                  rotation: [Math.PI / 2, 0, 0],
                },
              ]
      }
    />
  );
}

/** The back of a memory card: a lily pad. */
export function LilyPad() {
  return (
    <Model
      k="lilypad"
      make={() => [
        {
          geometry: new CylinderGeometry(0.72, 0.72, 0.1, 18),
          colour: '#6CC477',
          position: [0, 0.05, 0],
        },
        {
          geometry: new CylinderGeometry(0.5, 0.5, 0.03, 18),
          colour: '#8FD694',
          position: [0, 0.11, 0],
        },
      ]}
    />
  );
}
