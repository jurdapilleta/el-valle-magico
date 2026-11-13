import { lazy, Suspense, useEffect, useRef, type PointerEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import { Vector3 } from 'three';
import { audio } from '../audio/AudioManager';
import { detectTier, readDeviceInfo } from '../core/deviceTier';
import { sceneActor, useSceneState } from '../core/machine';
import { loadSave, writeSave, type Save } from '../core/persistence';
import { tickSessionClock } from '../core/sessionClock';
import { useGameStore } from '../core/store';
import { stagePoints } from '../games/stagePoints';
import { solution, useSession } from '../games/session';
import { Hud } from '../ui/Hud';
import { rig } from '../world/CameraRig';
import { luna } from '../world/lunaState';
import { worldStats } from '../world/travel';
import { World } from '../world/World';
import { resolvePreset } from './quality';
import { StartScreen } from './StartScreen';

// GAME_DESIGN §4.2: ±35° horizontal look-around, spring-returns on release.
const MAX_LOOK = (35 * Math.PI) / 180;
const DRAG_START_PX = 10;

// Dev-only (open with ?perf); the DEV guard keeps r3f-perf out of the production bundle.
const Perf =
  import.meta.env.DEV && new URLSearchParams(location.search).has('perf')
    ? lazy(() => import('r3f-perf').then((m) => ({ default: m.Perf })))
    : null;

// High tier only, and its own chunk.
const Effects = lazy(() => import('./Effects'));

declare global {
  interface Window {
    /** Read-only hooks for smoke tests. */
    __valle?: {
      luna: () => [number, number, number];
      audioUnlocked: () => boolean;
      round: () => {
        quantity: number;
        step: string | null;
        level: number;
        stars: number;
        solved: boolean;
        cards: boolean;
      };
      /** What a correct player would do next, as screen positions to tap or drag between. */
      solution: () => {
        tap?: number[] | null;
        drag?: (number[] | null)[];
        key: string;
      }[];
      renderInfo: () => { triangles: number; calls: number };
      /** Screen position of a point on the ground (y metres up). */
      screenPoint: (x: number, z: number, y?: number) => [number, number] | null;
      stats: () => { greets: number; idleHints: number; idleWalks: number; lastLoadMs: number };
      audio: () => ReturnType<typeof audio.state>;
      /** Advances the session clock, as if this much play time had passed. */
      elapse: (seconds: number) => void;
      progress: () => Pick<Save, 'stickers' | 'progress' | 'objectives'>;
    };
  }
}

export function App() {
  const state = useSceneState();
  const tier = useGameStore((s) => s.tier);
  const quality = useGameStore((s) => s.save.settings.quality);
  const zone = useGameStore((s) => s.zone);
  const preset = resolvePreset(quality, tier);
  const drag = useRef<{ id: number; startX: number } | null>(null);

  useEffect(() => {
    const { setTier, setSave } = useGameStore.getState();
    setTier(detectTier(readDeviceInfo()));
    void loadSave().then((save) => {
      setSave(save);
      for (const group of ['voice', 'music', 'sfx'] as const)
        audio.setVolume(group, save.settings.volumes[group]);
    });
    // Test aid: silent placeholder lines pass quickly (recordings are unaffected).
    if (new URLSearchParams(location.search).has('fastvoice')) audio.fastPlaceholders = true;
    void audio.load();
    window.__valle = {
      luna: () => [luna.position.x, luna.position.y, luna.position.z],
      audioUnlocked: () => audio.unlocked,
      round: () => {
        const { quantity, step, level, stars, solved, config } = useSession.getState();
        return { quantity, step, level, stars, solved, cards: config?.choiceUi === 'cards' };
      },
      renderInfo: () => ({ ...rig.render }),
      stats: () => ({ ...worldStats }),
      audio: () => audio.state(),
      elapse: (seconds) => tickSessionClock(seconds),
      progress: () => {
        const { stickers, progress, objectives } = useGameStore.getState().save;
        return { stickers, progress, objectives };
      },
      screenPoint: (x, z, y = 0) => {
        if (!rig.camera) return null;
        const p = new Vector3(x, y, z).project(rig.camera);
        return [((p.x + 1) / 2) * innerWidth, ((1 - p.y) / 2) * innerHeight];
      },
      solution: () =>
        solution().map((move) => {
          const at = (key: string) => {
            const p = stagePoints.get(key)?.clone().project(rig.camera!);
            return p ? [((p.x + 1) / 2) * innerWidth, ((1 - p.y) / 2) * innerHeight] : null;
          };
          return 'tap' in move
            ? { tap: at(move.tap), key: move.tap }
            : { drag: [at(move.drag[0]), at(move.drag[1])], key: move.drag[0] };
        }),
    };
    // §5.4: Esc is the laptop shortcut to the parent gate.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') sceneActor.send({ type: 'HOLD_PARENT' });
    };
    window.addEventListener('keydown', onKey);
    const clock = setInterval(() => !document.hidden && tickSessionClock(1), 1000);
    // §8.1: an accidental "back" must not leave the game. Keep one extra history
    // entry and put it back whenever it is used up.
    history.pushState(null, '');
    const stay = () => history.pushState(null, '');
    window.addEventListener('popstate', stay);
    const block = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', stay);
      clearInterval(clock);
    };
  }, []);

  // Minutes played per day, for the parent area (§7.6).
  useEffect(() => {
    const timer = setInterval(() => {
      if (sceneActor.getSnapshot().matches('boot') || document.hidden) return;
      const { save, setSave } = useGameStore.getState();
      const today = new Date().toISOString().slice(0, 10);
      const next = {
        ...save,
        minutesByDay: { ...save.minutesByDay, [today]: (save.minutesByDay[today] ?? 0) + 1 },
      };
      setSave(next);
      void writeSave(next);
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const onPointerDown = (e: PointerEvent) => {
    // First touch only: extra fingers neither tap nor drag.
    if (!e.isPrimary || drag.current) return;
    drag.current = { id: e.pointerId, startX: e.clientX };
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    if (!luna.dragging && Math.abs(dx) < DRAG_START_PX) return;
    luna.dragging = true;
    const yaw = (-dx / window.innerWidth) * 2 * MAX_LOOK;
    luna.lookYaw = Math.max(-MAX_LOOK, Math.min(MAX_LOOK, yaw));
  };
  const onPointerEnd = (e: PointerEvent) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    luna.dragging = false;
  };

  return (
    <div
      className="stage"
      data-state={state}
      data-zone={zone}
      data-tier={tier}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <Canvas
        dpr={[1, preset.dprCap]}
        shadows={preset.shadows}
        // No tone mapping: the learning colours must reach the screen exactly (§6.2).
        flat
        camera={{ fov: 50, near: 0.1, far: 200, position: [0, 3.5, 5.5] }}
      >
        <World preset={preset} />
        {preset.bloom && (
          <Suspense fallback={null}>
            <Effects />
          </Suspense>
        )}
        {Perf && (
          <Suspense fallback={null}>
            <Perf position="top-left" />
          </Suspense>
        )}
      </Canvas>
      {state === 'boot' ? <StartScreen /> : <Hud />}
    </div>
  );
}
