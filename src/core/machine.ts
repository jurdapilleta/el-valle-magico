import { useSyncExternalStore } from 'react';
import { createActor, setup, type StateValue } from 'xstate';

export type SceneEvent =
  | { type: 'START' }
  | { type: 'READY' }
  | { type: 'TAP_WAYPOINT' }
  | { type: 'ARRIVED' }
  | { type: 'TAP_HOST' }
  | { type: 'ACCEPT' }
  | { type: 'CANCEL' }
  | { type: 'PORTAL' }
  | { type: 'DONE' }
  | { type: 'ANSWER' }
  | { type: 'NEXT' }
  | { type: 'FINISH' }
  | { type: 'TAP_LUNA' }
  | { type: 'HOLD_PARENT' }
  | { type: 'PASS' }
  | { type: 'CLOSE' }
  | { type: 'SESSION_LIMIT' }
  | { type: 'TAP' };

// Scene state machine, GAME_DESIGN §9.2. Phase 0 exercises boot → loading →
// world.idle ⇄ world.walking; the remaining states are the skeleton later
// phases fill in.
export const sceneMachine = setup({
  types: { events: {} as SceneEvent },
}).createMachine({
  id: 'scene',
  initial: 'boot',
  states: {
    boot: { on: { START: 'loading' } },
    loading: { on: { READY: 'world' } },
    world: {
      initial: 'idle',
      on: { PORTAL: 'loading', HOLD_PARENT: 'parentGate', SESSION_LIMIT: 'rest' },
      states: {
        idle: { on: { TAP_WAYPOINT: 'walking', TAP_HOST: 'invite' } },
        walking: { on: { ARRIVED: 'idle', TAP_WAYPOINT: 'walking' } },
        invite: { on: { ACCEPT: '#scene.game', CANCEL: 'idle' } },
      },
    },
    game: {
      initial: 'intro',
      on: { TAP_LUNA: 'world', HOLD_PARENT: 'parentGate', SESSION_LIMIT: 'rest' },
      states: {
        intro: { on: { DONE: 'round' } },
        round: { on: { ANSWER: 'feedback' } },
        feedback: { on: { NEXT: 'round', FINISH: 'celebration' } },
        celebration: { on: { DONE: '#scene.world' } },
      },
    },
    // Phase 3: return to the previous state via a history node instead of world.
    parentGate: { on: { PASS: 'parentArea', CLOSE: 'world' } },
    parentArea: { on: { CLOSE: 'world' } },
    rest: { on: { TAP: 'world' } },
  },
});

/** Flattens an XState value to "world.idle" style strings. */
export function stateToString(value: StateValue): string {
  if (typeof value === 'string') return value;
  const [key, child] = Object.entries(value)[0] ?? [];
  if (key === undefined) return '';
  return child === undefined ? key : `${key}.${stateToString(child)}`;
}

export const sceneActor = createActor(sceneMachine).start();

const subscribe = (onChange: () => void) => {
  const sub = sceneActor.subscribe(onChange);
  return () => sub.unsubscribe();
};
const getState = () => stateToString(sceneActor.getSnapshot().value);

export function useSceneState(): string {
  return useSyncExternalStore(subscribe, getState);
}
