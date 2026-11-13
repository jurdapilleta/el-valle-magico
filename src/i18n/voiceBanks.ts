// Which audio bank a voice line is packed into, and who says it (GAME_DESIGN §11).
// Pure functions of the line ID, shared by the game, the recorder page and the
// build tools, so nothing has to be listed twice.

export type Speaker = 'luna' | 'estrella' | 'tomas' | 'copo' | 'melodia';

export const HOSTS: Speaker[] = ['estrella', 'tomas', 'copo', 'melodia'];

/** Spanish name of each voice, for the recording script and recorder page. */
export const SPEAKER_NAMES: Record<Speaker, string> = {
  luna: 'Luna (voz de mamá o papá)',
  estrella: 'Princesa Estrella',
  tomas: 'Granjero Tomás',
  copo: 'Zorro Copo',
  melodia: 'Rana Melodía',
};

const ITEM_BANKS: Record<string, string> = {
  color: 'items-colors',
  num: 'items-numbers',
  animal: 'items-animals',
  shape: 'items-shapes',
  letter: 'items-letters',
  emotion: 'items-emotions',
};

/**
 * Hosts speak their own greeting, invitation and introduction. Everything
 * heard during play (prompts, item names, praise, hints) is Luna's voice: she
 * is the companion who asks the questions, and the voice the child knows best.
 */
export function speakerOf(id: string): Speaker {
  const first = id.slice(0, id.indexOf('.'));
  return (HOSTS as string[]).includes(first) ? (first as Speaker) : 'luna';
}

/** The sprite file a line lives in: one per host, one per item family, and a few for Luna. */
export function bankOf(id: string): string {
  const [first, second] = id.split('.');
  if ((HOSTS as string[]).includes(first!) || first === 'luna' || first === 'common') return first!;
  if (first === 'item') return ITEM_BANKS[second!] ?? 'games';
  if (first === 'sticker') return 'stickers';
  return 'games';
}

/** Sprite layout: clips one after another with a gap, as [start ms, length ms]. */
export function packSprite(
  clips: { id: string; ms: number }[],
  gapMs = 250,
): Record<string, [number, number]> {
  const sprite: Record<string, [number, number]> = {};
  let at = 0;
  for (const clip of clips) {
    sprite[clip.id] = [at, clip.ms];
    at += clip.ms + gapMs;
  }
  return sprite;
}
