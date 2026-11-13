import {
  BufferAttribute,
  Color,
  DataTexture,
  Euler,
  Matrix4,
  MeshToonMaterial,
  NearestFilter,
  Quaternion,
  RedFormat,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Part = {
  geometry: BufferGeometry;
  colour: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

// One material for everything built in code: colour comes from vertex colours,
// so each merged shape is a single draw call (§5.3 draw-call budget).
/**
 * The game's gentle toon ramp (§6.1): three soft steps from shade to light,
 * so rounded shapes read as round without hard shadows.
 */
export const toonRamp = new DataTexture(new Uint8Array([158, 212, 255]), 3, 1, RedFormat);
toonRamp.minFilter = toonRamp.magFilter = NearestFilter;
toonRamp.needsUpdate = true;

export const toon = new MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp });

/** Bakes each part's transform and colour into one geometry. */
export function merge(parts: Part[]): BufferGeometry {
  const matrix = new Matrix4();
  const baked = parts.map((part) => {
    // Non-indexed throughout, so any mix of primitives merges.
    const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
    geometry.deleteAttribute('uv');
    matrix.compose(
      new Vector3(...(part.position ?? [0, 0, 0])),
      new Quaternion().setFromEuler(new Euler(...(part.rotation ?? [0, 0, 0]))),
      new Vector3(...(part.scale ?? [1, 1, 1])),
    );
    geometry.applyMatrix4(matrix);
    const colour = new Color(part.colour);
    const count = geometry.getAttribute('position').count;
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colour.toArray(colours, i * 3);
    geometry.setAttribute('color', new BufferAttribute(colours, 3));
    return geometry;
  });
  return mergeGeometries(baked);
}

export const reducedMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
