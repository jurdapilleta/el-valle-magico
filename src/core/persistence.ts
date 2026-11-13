import { get, set } from 'idb-keyval';
import type { QualitySetting } from '../app/quality';

// GAME_DESIGN §9.5
export type Save = {
  version: 1;
  child: { name?: string; firstLetter?: string };
  settings: {
    sessionMinutes: 10 | 15 | 20 | 0;
    volumes: { voice: number; music: number; sfx: number };
    quality: QualitySetting;
    locale: 'es' | 'en';
  };
  progress: Record<string, { level: 1 | 2 | 3; plays: number; completions: number }>;
  items: Record<
    string,
    { seen: number; correctFirstTry: number; lastSeen: number; box: 1 | 2 | 3 }
  >;
  stickers: string[];
  minutesByDay: Record<string, number>;
  /** Per objective: was each of the last ten rounds right first time? (§3 mastery rule) */
  objectives: Record<string, boolean[]>;
};

export function defaultSave(): Save {
  return {
    version: 1,
    child: {},
    settings: {
      sessionMinutes: 15,
      volumes: { voice: 1, music: 0.6, sfx: 0.8 },
      quality: 'auto',
      locale: 'es',
    },
    progress: {},
    items: {},
    stickers: [],
    minutesByDay: {},
    objectives: {},
  };
}

const KEY = 'valle-magico-save';
// Used when IndexedDB is unavailable (private mode, some WebViews).
let memory: Save | undefined;

export async function loadSave(): Promise<Save> {
  try {
    const stored = await get<Save>(KEY);
    // Fields added since the save was written take their defaults.
    if (stored?.version === 1) return { ...defaultSave(), ...stored };
  } catch {
    if (memory) return memory;
  }
  return defaultSave();
}

export async function writeSave(save: Save): Promise<void> {
  memory = save;
  try {
    await set(KEY, save);
  } catch {
    // Kept in memory only for this session.
  }
}

export const MASTERY_WINDOW = 10;
export const MASTERY_RATE = 0.8;

/** §3: mastered at 80 % right-first-time over the last ten attempts. */
export function isMastered(attempts: boolean[] | undefined): boolean {
  if (!attempts || attempts.length < MASTERY_WINDOW) return false;
  return attempts.filter(Boolean).length / attempts.length >= MASTERY_RATE;
}

/** Appends a game's round results to each of its objectives, keeping the last ten. */
export function recordAttempts(
  objectives: Record<string, boolean[]>,
  codes: string[],
  attempts: boolean[],
): Record<string, boolean[]> {
  const next = { ...objectives };
  for (const code of codes)
    next[code] = [...(next[code] ?? []), ...attempts].slice(-MASTERY_WINDOW);
  return next;
}
