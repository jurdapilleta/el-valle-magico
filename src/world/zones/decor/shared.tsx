import { useMemo } from 'react';
import { TorusGeometry, type BufferGeometry } from 'three';
import { merge, toon, type Part } from '../../../characters/merge';

// The six rainbow bands, from the canonical learning colours (§6.2).
const RAINBOW = ['#FF4D5E', '#FF9A3D', '#FFD23F', '#3DD68C', '#3D8BFF', '#9B6BFF'];

/** A rainbow standing on the ground at (x, z), `span` metres from centre to foot. */
export function Rainbow({ x, z, span }: { x: number; z: number; span: number }) {
  const geometry = useMemo(
    () =>
      merge(
        RAINBOW.map((colour, i): Part => ({
          geometry: new TorusGeometry(span + 0.9 - i * 0.36, 0.2, 6, 40, Math.PI),
          colour,
        })),
      ),
    [span],
  );
  return <mesh geometry={geometry} material={toon} position={[x, 0, z]} raycast={() => null} />;
}

/** Flat water or ice; it never takes taps, so they fall through to the ground. */
export function Pool({ x, z, r, colour }: { x: number; z: number; r: number; colour: string }) {
  return (
    <mesh position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <circleGeometry args={[r, 40]} />
      <meshBasicMaterial color={colour} />
    </mesh>
  );
}

/** A static shape built once from parts: one draw call. */
export function Built({
  parts,
  x = 0,
  z = 0,
  y = 0,
  yaw = 0,
  geometry,
}: {
  parts?: () => Part[];
  geometry?: BufferGeometry;
  x?: number;
  z?: number;
  y?: number;
  yaw?: number;
}) {
  // Parts are fixed per call site, so building once is enough.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const built = useMemo(() => geometry ?? merge(parts!()), []);
  return (
    <mesh
      geometry={built}
      material={toon}
      position={[x, y, z]}
      rotation={[0, yaw, 0]}
      raycast={() => null}
    />
  );
}
