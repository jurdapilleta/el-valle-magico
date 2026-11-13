import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { sceneMachine, stateToString, type SceneEvent } from '../../src/core/machine';

function run(...events: SceneEvent['type'][]): string {
  const actor = createActor(sceneMachine).start();
  for (const type of events) actor.send({ type } as SceneEvent);
  return stateToString(actor.getSnapshot().value);
}

describe('sceneMachine', () => {
  it('boots into the world only after the start gesture and load', () => {
    expect(run()).toBe('boot');
    expect(run('READY')).toBe('boot');
    expect(run('TAP_WAYPOINT')).toBe('boot');
    expect(run('START')).toBe('loading');
    expect(run('START', 'READY')).toBe('world.idle');
  });

  it('walks on tap and returns to idle on arrival', () => {
    expect(run('START', 'READY', 'TAP_WAYPOINT')).toBe('world.walking');
    expect(run('START', 'READY', 'TAP_WAYPOINT', 'TAP_WAYPOINT')).toBe('world.walking');
    expect(run('START', 'READY', 'TAP_WAYPOINT', 'ARRIVED')).toBe('world.idle');
  });

  it('runs a game from invite to celebration and back', () => {
    const toGame: SceneEvent['type'][] = ['START', 'READY', 'TAP_HOST', 'ACCEPT'];
    expect(run(...toGame)).toBe('game.intro');
    expect(run(...toGame, 'DONE', 'ANSWER', 'NEXT')).toBe('game.round');
    expect(run(...toGame, 'DONE', 'ANSWER', 'FINISH', 'DONE')).toBe('world.idle');
  });

  it('lets Luna exit a game at any point', () => {
    expect(run('START', 'READY', 'TAP_HOST', 'ACCEPT', 'DONE', 'TAP_LUNA')).toBe('world.idle');
  });

  it('cannot reach the parent gate before the start gesture', () => {
    expect(run('HOLD_PARENT')).toBe('boot');
    expect(run('START', 'READY', 'HOLD_PARENT', 'PASS', 'CLOSE')).toBe('world.idle');
  });
});
