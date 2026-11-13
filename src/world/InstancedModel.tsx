import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Object3D,
  type InstancedMesh,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from '../characters/merge';
import type { Placement } from './zones/scatter';

const WHITE = new Color('#FFFFFF');
// Shared by all scenery: colours are baked into vertices, so each model is a
// single instanced draw call whatever its material count (§5.3).
const material = toon;

/**
 * Flattens a glTF scene into one geometry, turning each mesh's material colour
 * into vertex colours nudged toward pastel (§6.1, §14 style consistency).
 */
function flatten(scene: Object3D, snow: number): BufferGeometry {
  scene.updateMatrixWorld(true);
  const pieces: BufferGeometry[] = [];
  scene.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    source.applyMatrix4(mesh.matrixWorld);
    if (!source.getAttribute('normal')) source.computeVertexNormals();
    // Keep only what the toon material needs, so every piece merges cleanly.
    const piece = new BufferGeometry();
    piece.setAttribute('position', source.getAttribute('position'));
    piece.setAttribute('normal', source.getAttribute('normal'));

    const base = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const colour = ((base as MeshStandardMaterial | undefined)?.color ?? WHITE)
      .clone()
      .lerp(WHITE, Math.max(0.1, snow));
    const count = piece.getAttribute('position').count;
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colour.toArray(colours, i * 3);
    piece.setAttribute('color', new BufferAttribute(colours, 3));
    pieces.push(piece);
  });
  return mergeGeometries(pieces);
}

/**
 * Draws one glTF model many times in a single instanced draw call. Instances
 * are scenery only and never intercept taps.
 */
export function InstancedModel({
  url,
  placements,
  snow = 0,
}: {
  url: string;
  placements: Placement[];
  /** 0–1: tints the model toward white (snow-dusted). */
  snow?: number;
}) {
  // Second argument off: no Draco, so no decoder is ever fetched from a CDN.
  const { scene } = useGLTF(url, false);
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => flatten(scene, snow), [scene, snow]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    placements.forEach((p, i) => {
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.set(0, p.yaw, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [geometry, placements]);

  if (placements.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, material, placements.length]} raycast={() => null} />
  );
}
