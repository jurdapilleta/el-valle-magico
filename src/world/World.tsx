import { lazy, Suspense, useEffect, useMemo, useRef, type ComponentType } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import type { Mesh } from 'three';
import type { QualityPreset } from '../app/quality';
import { audio } from '../audio/AudioManager';
import { toonRamp } from '../characters/merge';
import { sceneActor, useSceneState } from '../core/machine';
import { useGameStore } from '../core/store';
import { STAGES } from '../games/scenes/stages';
import { tickSession, useSession } from '../games/session';
import { GameEntrance, HostActor, IdleDirector, Portal, Waypoint } from './actors';
import { CameraRig } from './CameraRig';
import { InstancedModel } from './InstancedModel';
import { Luna } from './Luna';
import { Particles } from './Particles';
import { luna, walkLunaTo } from './lunaState';
import { zoneReady } from './travel';
import { ZONES, type ZoneDef, type ZoneId } from './zones/defs';

const TAP_SLOP_PX = 10;
const modelUrl = (name: string) => `models/nature/${name}.glb`;

// Each zone's buildings and props are a separate chunk, fetched when the zone
// is first entered (or prefetched from a neighbouring zone).
const decorImports: Record<ZoneId, () => Promise<{ default: ComponentType }>> = {
  hub: () => import('./zones/decor/HubDecor'),
  castillo: () => import('./zones/decor/CastilloDecor'),
  granja: () => import('./zones/decor/GranjaDecor'),
  bosque: () => import('./zones/decor/BosqueDecor'),
  lago: () => import('./zones/decor/LagoDecor'),
  pradera: () => import('./zones/decor/PraderaDecor'),
};
const DECOR = Object.fromEntries(
  Object.entries(decorImports).map(([id, load]) => [id, lazy(load)]),
) as unknown as Record<ZoneId, ComponentType>;

function Scenery({ zone, density }: { zone: ZoneDef; density: number }) {
  const sets = useMemo(() => zone.scenery(density), [zone, density]);
  return (
    <>
      {sets.map((set) => (
        <InstancedModel
          key={set.key}
          url={modelUrl(set.model)}
          placements={set.placements}
          snow={set.snow}
        />
      ))}
    </>
  );
}

/**
 * Mounts only once the zone's models and decor have loaded (it sits inside
 * their Suspense boundary), so it is the "zone is ready" signal. It then
 * warms up the neighbouring zones, which makes walking on feel instant.
 */
function ZoneReady({ zone, density }: { zone: ZoneDef; density: number }) {
  const state = useSceneState();
  useEffect(() => {
    if (state === 'loading') zoneReady();
  }, [state]);
  useEffect(() => {
    for (const portal of zone.portals) {
      void decorImports[portal.to]();
      for (const set of ZONES[portal.to].scenery(density))
        useGLTF.preload(modelUrl(set.model), false);
    }
  }, [zone, density]);
  return null;
}

function TapMarker() {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.visible = luna.path.length > 0;
    mesh.position.set(luna.target.x, 0.04, luna.target.z);
    mesh.scale.setScalar(1 + 0.15 * Math.sin(clock.elapsedTime * 6));
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} visible={false} raycast={() => null}>
      <ringGeometry args={[0.35, 0.55, 32]} />
      <meshBasicMaterial color="#FFD972" />
    </mesh>
  );
}

function SessionTicker() {
  useFrame((_, delta) => tickSession(delta));
  return null;
}

export function World({ preset }: { preset: QualityPreset }) {
  const state = useSceneState();
  const zoneId = useGameStore((s) => s.zone);
  const zone = ZONES[zoneId];
  const inGame = state.startsWith('game');
  const Decor = DECOR[zoneId];
  const stageName = useSession((s) => s.config?.stage);
  const Stage = stageName ? STAGES[stageName] : undefined;

  const onGroundTap = (e: ThreeEvent<MouseEvent>) => {
    // A drag (look-around) is not a tap. Browsers only synthesise click from
    // the primary touch, so extra fingers never reach this handler.
    if (e.delta > TAP_SLOP_PX) return;
    if (!sceneActor.getSnapshot().matches('world')) return;
    audio.pop();
    walkLunaTo(e.point);
  };

  return (
    <>
      <color attach="background" args={[zone.colours.sky]} />
      <fog attach="fog" args={[zone.colours.fog, 45, 120]} />
      <hemisphereLight args={['#FFFFFF', zone.colours.ground, 1.1]} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.4}
        castShadow={preset.shadows}
        shadow-mapSize={[1024, 1024]}
      />

      {/* Larger than the navmesh so taps past its edge still resolve to a walk. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={onGroundTap} receiveShadow>
        <planeGeometry args={[400, 400]} />
        {/* A little self-light keeps pale ground (snow) from shading to grey. */}
        <meshToonMaterial
          color={zone.colours.ground}
          emissive={zone.colours.ground}
          gradientMap={toonRamp}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Keyed by zone: stepping through a portal swaps the whole subtree. */}
      <Suspense key={zoneId} fallback={null}>
        <Scenery zone={zone} density={preset.instanceDensity} />
        <Decor />
        {/* During a game only the stage is live: one thing to look at (§2). */}
        {!inGame && (
          <>
            {zone.portals.map((portal) => (
              <Portal key={portal.to} {...portal} />
            ))}
            {zone.waypoints.map((point, i) => (
              <Waypoint key={i} {...point} phase={i * 1.3} />
            ))}
            {zone.host && <HostActor host={zone.host} />}
            {zone.games.map((game) => (
              <GameEntrance key={game.id} {...game} />
            ))}
          </>
        )}
        <ZoneReady zone={zone} density={preset.instanceDensity} />
      </Suspense>

      {inGame && Stage && <Stage />}
      <Particles />
      <TapMarker />
      <Luna />
      <CameraRig />
      <SessionTicker />
      <IdleDirector />
    </>
  );
}
