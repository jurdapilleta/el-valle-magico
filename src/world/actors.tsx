import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  MeshBasicMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Group,
  type Mesh,
} from 'three';
import { audio } from '../audio/AudioManager';
import { Host, type HostAnim } from '../characters/Host';
import { merge, toon, type Part } from '../characters/merge';
import { sceneActor } from '../core/machine';
import { useGameStore } from '../core/store';
import { EMBLEMS as GAME_EMBLEMS } from '../games/scenes/stages';
import { goToGame } from '../games/session';
import {
  IDLE_HINT_SECONDS,
  IDLE_MAX_ROUNDS,
  IDLE_WALK_SECONDS,
  idleLine,
  idleTarget,
} from './idle';
import { BlobShadow } from './BlobShadow';
import { luna, STROLL_SPEED, walkLunaTo } from './lunaState';
import { hostState, travelTo, visitHost, worldStats } from './travel';
import type { Point, ZoneDef, ZoneId } from './zones/defs';

const inWorld = () => sceneActor.getSnapshot().matches('world');
const stop = (e: ThreeEvent<MouseEvent>) => e.stopPropagation();

// ---- Shared star (waypoints and the game entrance) ----

function starGeometry(): ExtrudeGeometry {
  const shape = new Shape();
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? 0.5 : 0.22;
    const a = Math.PI / 2 + (k * Math.PI) / 5;
    if (k === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false });
}
const STAR = starGeometry();
const GOLD = new MeshBasicMaterial({ color: '#FFD972' });
const PALE_GOLD = new MeshBasicMaterial({ color: '#FFF0B8' });

// ---- Waypoints (§4.2: glowing markers she taps to go there) ----

export function Waypoint({ x, z, phase }: Point & { phase: number }) {
  const star = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const mesh = star.current;
    if (!mesh) return;
    // Nothing to offer once Luna is standing on it.
    mesh.visible = Math.hypot(luna.position.x - x, luna.position.z - z) > 1.4;
    const t = clock.elapsedTime + phase;
    mesh.position.y = 0.55 + 0.1 * Math.sin(t * 2.4);
    mesh.rotation.y = t * 1.1;
  });
  const onTap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!inWorld()) return;
    audio.pop();
    walkLunaTo({ x, z });
  };
  return (
    <group position={[x, 0, z]}>
      <mesh ref={star} geometry={STAR} material={PALE_GOLD} scale={0.7} raycast={() => null} />
      <mesh position={[0, 0.7, 0]} visible={false} onPointerDown={onTap} onClick={stop}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
    </group>
  );
}

// ---- Portals (§4.2: big arches with an emblem of where they lead) ----

const ACCENT: Record<ZoneId, string> = {
  hub: '#6CC477',
  castillo: '#FF8FD8',
  granja: '#FF6B5E',
  bosque: '#BDEBFF',
  lago: '#8AD3FF',
  pradera: '#C9B6FF',
};

const sphere = (r: number) => new SphereGeometry(r, 12, 8);

/** A small 3D picture of the destination, sitting on top of the arch. */
const EMBLEMS: Record<ZoneId, () => Part[]> = {
  hub: () => [
    {
      geometry: new CylinderGeometry(0.1, 0.13, 0.5, 8),
      colour: '#C98A5E',
      position: [0, 0.25, 0],
    },
    { geometry: sphere(0.42), colour: '#6CC477', position: [0, 0.8, 0] },
  ],
  castillo: () => [
    {
      geometry: new CylinderGeometry(0.3, 0.3, 0.7, 12),
      colour: '#FFC4EA',
      position: [0, 0.35, 0],
    },
    { geometry: new ConeGeometry(0.4, 0.5, 12), colour: '#C9B6FF', position: [0, 0.95, 0] },
  ],
  granja: () => [
    { geometry: new BoxGeometry(0.8, 0.55, 0.6), colour: '#FF6B5E', position: [0, 0.28, 0] },
    {
      geometry: new ConeGeometry(0.62, 0.4, 4),
      colour: '#FFFFFF',
      position: [0, 0.75, 0],
      rotation: [0, Math.PI / 4, 0],
    },
  ],
  bosque: () => [
    { geometry: sphere(0.36), colour: '#FFFFFF', position: [0, 0.34, 0] },
    { geometry: sphere(0.26), colour: '#FFFFFF', position: [0, 0.84, 0] },
    {
      geometry: new ConeGeometry(0.06, 0.24, 8),
      colour: '#FF9A3D',
      position: [0, 0.84, 0.3],
      rotation: [Math.PI / 2, 0, 0],
    },
  ],
  lago: () => [
    {
      geometry: new CylinderGeometry(0.55, 0.55, 0.1, 16),
      colour: '#8AD3FF',
      position: [0, 0.1, 0],
    },
    { geometry: sphere(0.3), colour: '#6CC477', position: [0, 0.38, 0], scale: [1.15, 0.8, 1] },
    { geometry: sphere(0.1), colour: '#FFFFFF', position: [0.14, 0.62, 0.1] },
    { geometry: sphere(0.1), colour: '#FFFFFF', position: [-0.14, 0.62, 0.1] },
  ],
  pradera: () =>
    ['#FF4D5E', '#FFD23F', '#3D8BFF'].map((colour, i): Part => ({
      geometry: new TorusGeometry(0.55 - i * 0.14, 0.07, 6, 16, Math.PI),
      colour,
      position: [0, 0.1, 0],
    })),
};

const portalCache = new Map<ZoneId, BufferGeometry>();
function portalGeometry(to: ZoneId): BufferGeometry {
  let geometry = portalCache.get(to);
  if (!geometry) {
    const colour = ACCENT[to];
    // Kept under 3.5 m: the follow camera never sees anything taller than itself.
    geometry = merge([
      ...[1.3, -1.3].map((x): Part => ({
        geometry: new CylinderGeometry(0.3, 0.36, 1.9, 12),
        colour: '#FFFFFF',
        position: [x, 0.95, 0],
      })),
      { geometry: new TorusGeometry(1.3, 0.3, 10, 20, Math.PI), colour, position: [0, 1.9, 0] },
      // The emblem floats in the opening, where a picture of the destination belongs.
      ...EMBLEMS[to]().map((part): Part => ({
        ...part,
        position: [
          (part.position?.[0] ?? 0) * 1.3,
          0.75 + (part.position?.[1] ?? 0) * 1.3,
          0.25 + (part.position?.[2] ?? 0) * 1.3,
        ],
        scale: (part.scale ?? [1, 1, 1]).map((v) => v * 1.3) as [number, number, number],
      })),
    ]);
    portalCache.set(to, geometry);
  }
  return geometry;
}

export function Portal({ x, z, to }: Point & { to: ZoneId }) {
  const glow = useRef<Mesh>(null);
  const geometry = useMemo(() => portalGeometry(to), [to]);
  const material = useMemo(
    () => new MeshBasicMaterial({ color: ACCENT[to], transparent: true, opacity: 0.55 }),
    [to],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.scale.setScalar(1 + 0.08 * Math.sin(clock.elapsedTime * 3));
  });
  const onTap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!inWorld()) return;
    audio.pop();
    travelTo(to);
  };
  return (
    // The arch faces the middle of the zone.
    <group position={[x, 0, z]} rotation={[0, Math.atan2(x, z), 0]}>
      <mesh geometry={geometry} material={toon} raycast={() => null} />
      <mesh ref={glow} position={[0, 1.55, 0]} material={material} raycast={() => null}>
        <circleGeometry args={[1.25, 24]} />
      </mesh>
      <mesh position={[0, 1.8, 0]} visible={false} onPointerDown={onTap} onClick={stop}>
        <cylinderGeometry args={[2.1, 2.1, 3.6, 10]} />
      </mesh>
    </group>
  );
}

// ---- Zone host ----

const hostAnim = (): HostAnim =>
  hostState.talking ? 'Talk' : performance.now() < hostState.happyUntil ? 'Happy' : 'Idle';

export function HostActor({ host }: { host: NonNullable<ZoneDef['host']> }) {
  const onTap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!inWorld()) return;
    audio.pop();
    visitHost();
  };
  return (
    <group position={[host.x, 0, host.z]}>
      <Host id={host.id} getAnim={hostAnim} />
      <BlobShadow radius={0.8} />
      <mesh position={[0, 1.2, 0]} visible={false} onPointerDown={onTap} onClick={stop}>
        <cylinderGeometry args={[1.3, 1.3, 2.6, 10]} />
      </mesh>
    </group>
  );
}

// ---- Game entrance: one of the game's own items under a glowing star ----

export function GameEntrance({ id, x, z }: Point & { id: string }) {
  const star = useRef<Group>(null);
  const Emblem = GAME_EMBLEMS[id];
  useFrame(({ clock }) => {
    if (!star.current) return;
    star.current.position.y = 2.7 + 0.15 * Math.sin(clock.elapsedTime * 2.5 + x);
    star.current.rotation.y = clock.elapsedTime * 1.2;
  });
  const onTap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!inWorld()) return;
    audio.pop();
    goToGame(id);
  };
  return (
    <group position={[x, 0, z]}>
      {Emblem && <Emblem />}
      <group ref={star} position={[0, 2.7, 0]} scale={0.8}>
        <mesh geometry={STAR} material={GOLD} raycast={() => null} />
      </group>
      <mesh position={[0, 1.5, 0]} visible={false} onPointerDown={onTap} onClick={stop}>
        <cylinderGeometry args={[1.25, 1.25, 3, 10]} />
      </mesh>
    </group>
  );
}

// ---- Idle behaviour (§4.2): a hint at 20 s, a stroll at 45 s ----

export function IdleDirector() {
  // Wall-clock time: a slow frame rate must not stretch the wait.
  const idle = useRef({ since: performance.now(), hinted: false, rounds: 0 });

  useEffect(() => {
    const reset = () => {
      idle.current = { since: performance.now(), hinted: false, rounds: 0 };
    };
    window.addEventListener('pointerdown', reset, true);
    return () => window.removeEventListener('pointerdown', reset, true);
  }, []);

  useFrame(() => {
    const state = idle.current;
    const now = performance.now();
    if (!sceneActor.getSnapshot().matches({ world: 'idle' }) || state.rounds >= IDLE_MAX_ROUNDS) {
      state.since = now;
      return;
    }
    const seconds = (now - state.since) / 1000;
    const { zone, save } = useGameStore.getState();

    if (!state.hinted && seconds >= IDLE_HINT_SECONDS) {
      state.hinted = true;
      worldStats.idleHints++;
      luna.faceYaw = 0; // look at the player
      void audio.say(idleLine(zone, state.rounds));
    }
    if (seconds >= IDLE_WALK_SECONDS) {
      state.since = now;
      state.hinted = false;
      state.rounds++;
      const completed = new Set(
        Object.entries(save.progress)
          .filter(([, p]) => p.completions > 0)
          .map(([id]) => id),
      );
      const target = idleTarget(zone, completed);
      if (!target) return;
      worldStats.idleWalks++;
      walkLunaTo(target, undefined, STROLL_SPEED);
    }
  });

  return null;
}
