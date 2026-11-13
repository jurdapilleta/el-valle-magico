import { audio } from '../audio/AudioManager';
import { sceneActor } from './machine';
import { useGameStore } from './store';

/** Seconds played since the game started or since the last rest (§8.5). */
export const sessionClock = { seconds: 0 };

/**
 * Advances the session clock; once the parent's limit is reached and Luna is
 * out in the world (never mid-game), it is time to rest (§7.6): she says so,
 * the music fades, the world dims, and nothing is locked.
 */
export function tickSessionClock(seconds: number): void {
  const state = sceneActor.getSnapshot();
  if (state.matches('world') || state.matches('game')) sessionClock.seconds += seconds;
  const limit = useGameStore.getState().save.settings.sessionMinutes * 60;
  if (limit <= 0 || sessionClock.seconds < limit) return;
  if (!state.matches({ world: 'idle' }) && !state.matches({ world: 'walking' })) return;
  sessionClock.seconds = 0;
  sceneActor.send({ type: 'SESSION_LIMIT' });
  audio.setMusicMuted(true);
  void audio.say('common.rest');
}

/** A tap ends the rest; the clock starts again from zero. */
export function endRest(): void {
  sessionClock.seconds = 0;
  audio.stopVoice();
  audio.setMusicMuted(false);
  sceneActor.send({ type: 'TAP' });
}
