import type { ItemId, Rng } from './types';

export type ItemRecord = {
  seen: number;
  correctFirstTry: number;
  lastSeen: number;
  box: 1 | 2 | 3;
};

// GAME_DESIGN §7.3: Leitner boxes, 60 % / 30 % / 10 %.
export const BOX_WEIGHTS: Record<1 | 2 | 3, number> = { 1: 0.6, 2: 0.3, 3: 0.1 };

/**
 * Draws `n` distinct items from `pool`, weighted by Leitner box. Unseen items
 * count as box 1. Empty boxes are skipped and the remaining weights
 * renormalised, so a pool of fully mastered items still yields a round.
 */
export function pickItems(
  pool: ItemId[],
  records: Record<ItemId, ItemRecord>,
  n: number,
  rng: Rng = Math.random,
): ItemId[] {
  const remaining = [...new Set(pool)];
  const picked: ItemId[] = [];

  while (picked.length < n && remaining.length > 0) {
    const boxes: Record<1 | 2 | 3, ItemId[]> = { 1: [], 2: [], 3: [] };
    for (const id of remaining) boxes[records[id]?.box ?? 1].push(id);

    const live = ([1, 2, 3] as const).filter((b) => boxes[b].length > 0);
    const total = live.reduce((sum, b) => sum + BOX_WEIGHTS[b], 0);
    let roll = rng() * total;
    let box = live[live.length - 1]!;
    for (const b of live) {
      roll -= BOX_WEIGHTS[b];
      if (roll < 0) {
        box = b;
        break;
      }
    }

    const candidates = boxes[box];
    const id = candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))]!;
    picked.push(id);
    remaining.splice(remaining.indexOf(id), 1);
  }
  return picked;
}

/** Correct first try → box +1; anything else → back to box 1. */
export function updateRecord(
  record: ItemRecord | undefined,
  firstTry: boolean,
  now: number,
): ItemRecord {
  const prev = record ?? { seen: 0, correctFirstTry: 0, lastSeen: 0, box: 1 as const };
  return {
    seen: prev.seen + 1,
    correctFirstTry: prev.correctFirstTry + (firstTry ? 1 : 0),
    lastSeen: now,
    box: firstTry ? (Math.min(3, prev.box + 1) as 1 | 2 | 3) : 1,
  };
}
