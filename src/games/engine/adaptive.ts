import type { Level } from './types';

export type Difficulty = {
  level: Level;
  /** Consecutive first-try-correct rounds since the last level change. */
  streak: number;
  /** Incorrect answers since the last level change. */
  incorrect: number;
};

export type RoundOutcome = { incorrect: number; assisted: boolean };

export const STREAK_TO_LEVEL_UP = 3;
export const INCORRECT_TO_LEVEL_DOWN = 2;

export function initialDifficulty(level: Level = 1): Difficulty {
  return { level, streak: 0, incorrect: 0 };
}

/**
 * Adaptive difficulty, GAME_DESIGN §7.2. Called between rounds only, so the
 * level never changes mid-round. "2 incorrect within a game" is read as
 * cumulative since the last level change (docs/DECISIONS.md).
 */
export function applyRound(
  d: Difficulty,
  outcome: RoundOutcome,
): { next: Difficulty; change: 'up' | 'down' | null } {
  const firstTry = outcome.incorrect === 0 && !outcome.assisted;
  const streak = firstTry ? d.streak + 1 : 0;
  const incorrect = d.incorrect + outcome.incorrect;

  if (outcome.assisted || incorrect >= INCORRECT_TO_LEVEL_DOWN) {
    const level = Math.max(1, d.level - 1) as Level;
    return { next: initialDifficulty(level), change: level < d.level ? 'down' : null };
  }
  if (streak >= STREAK_TO_LEVEL_UP) {
    const level = Math.min(3, d.level + 1) as Level;
    return { next: initialDifficulty(level), change: level > d.level ? 'up' : null };
  }
  return { next: { level: d.level, streak, incorrect }, change: null };
}
