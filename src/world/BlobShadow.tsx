import { CircleGeometry, MeshBasicMaterial } from 'three';

const DISC = new CircleGeometry(1, 20);
const SHADE = new MeshBasicMaterial({
  color: '#3A2A4A',
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
});

/**
 * A soft dark disc under a character: the stand-in for a real shadow on tiers
 * that have none (§5.3), so characters still look planted on the ground.
 */
export function BlobShadow({ radius }: { radius: number }) {
  return (
    <mesh
      geometry={DISC}
      material={SHADE}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.03, 0]}
      scale={radius}
      raycast={() => null}
    />
  );
}
