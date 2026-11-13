import type { GameConfig } from '../engine/types';

type Voice = GameConfig['voice'];

/** The lines every game shares, plus its host's invite and intro. */
export function voice(
  host: string,
  game: string,
  rest: Pick<Voice, 'prompt'> & Partial<Voice>,
): Voice {
  return {
    invite: `${host}.${game}.invite`,
    intro: `${host}.${game}.intro`,
    hints: ['common.hint.look', 'common.hint.look', 'common.hint.luna-does'],
    correct: Array.from({ length: 8 }, (_, i) => `common.praise.${i + 1}`),
    incorrect: Array.from({ length: 6 }, (_, i) => `common.redirect.${i + 1}`),
    complete: 'common.complete',
    ...rest,
  };
}

/** Defaults shared by every game (§7.1: five rounds or three minutes). */
export const defaults = { roundsPerGame: 5, maxDurationSec: 180 } as const;
