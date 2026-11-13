import type { ItemRecord } from './spaced';

export type StepType =
  'tap-all' | 'choose-one' | 'drag-to-slot' | 'pairs' | 'sequence' | 'free-play';

export type ItemId = string;
export type Level = 1 | 2 | 3;
export type Rng = () => number;

export type LevelConfig = {
  /** How many items are shown at most (for counting: the largest quantity). */
  poolSize: number;
  /** Number of answer options in a choose-one step (free play: taps needed). */
  choices: number;
  distractorRule?: 'random' | 'near' | 'same-category';
  itemsPool: ItemId[];
  /** Overrides the game's steps for this level (e.g. drag at L1, choose at L2). */
  type?: StepType | StepType[];
  /** Overrides the game's prompt lines for this level. */
  prompt?: (string | string[])[];
};

/** What one round asks. Which fields matter depends on the step type. */
export type RoundSpec = {
  /** The answer (choose-one), or the item the round is "about" for spaced repetition. */
  target: ItemId;
  /** Options to tap (choose-one, free-play) or the cards on the table (pairs). */
  choices: ItemId[];
  /** Things to drag (drag-to-slot) or tap in order (sequence). */
  items?: ItemId[];
  /** Places to drop on (drag-to-slot). */
  slots?: string[];
  /** The correct tapping order (sequence). */
  order?: ItemId[];
  /** Shown but not tappable: a pattern, or the picture the question is about. */
  show?: ItemId[];
  /** Sizes of the groups being compared. */
  groups?: number[];
  /** Number of objects in a tap-all step. */
  quantity?: number;
  /** Distinct taps that complete a free-play round. */
  need?: number;
};

export type Round = RoundSpec & { steps: StepType[]; level: Level };

export type RoundContext = {
  level: Level;
  config: LevelConfig;
  records: Record<ItemId, ItemRecord>;
  rng: Rng;
  /** Previous round's target, to avoid asking the same thing twice running. */
  avoid?: ItemId;
  child: { firstLetter?: string };
};

type Line = string | string[];

// GAME_DESIGN §9.3, with logged extensions (docs/DECISIONS.md): `type` may be a
// list of steps played in order within a round; voice IDs may contain `{item}`,
// replaced by the item's key ("num.answer.{item}" → "num.answer.3"); and a
// game may build its own rounds with `makeRound`.
export type GameConfig = {
  id: string;
  /** Spanish name for labels ("Jugar a …") and the parent area. */
  title: string;
  zone: string;
  host: string;
  objectives: string[];
  type: StepType | StepType[];
  roundsPerGame: number;
  maxDurationSec: number;
  levels: [LevelConfig, LevelConfig, LevelConfig];
  /** Builds a round when the default (one target plus distractors) does not fit. */
  makeRound?: (ctx: RoundContext) => RoundSpec;
  /** Objects shown for an item in a tap-all step (counting: its number). */
  quantityOf?: (item: ItemId) => number;
  /** The slot an item belongs in (drag-to-slot). */
  slotOf?: (item: ItemId) => string;
  /** 'cards' shows the choices as big numeral cards in the HUD instead of on stage. */
  choiceUi?: 'cards';
  voice: {
    invite: string;
    intro: string;
    /** One prompt per step, in step order. */
    prompt: Line[];
    hints: [string, string, string];
    correct: string[];
    incorrect: string[];
    /** Said after a correct answer, e.g. "¡Tres! Hay tres unicornios." */
    answer?: Line;
    /** Names a wrongly chosen item, e.g. "Ese es el cuatro." */
    wrong?: string;
    /** Said as each object is counted in a tap-all step. */
    count?: string;
    /** Said for each item placed, sequenced, explored or matched. */
    each?: Line;
    complete: string;
  };
  sticker: string;
  stage: string;
};

export function stepsOf(config: GameConfig, level: Level): StepType[] {
  const type = config.levels[level - 1]!.type ?? config.type;
  return Array.isArray(type) ? type : [type];
}

/** Strips the "#n" that tells apart two copies of the same item on stage. */
export const baseOf = (id: ItemId): ItemId => id.split('#')[0]!;

/** The item's own key: the last dot-separated part ("animal.vaca#1" → "vaca"). */
export const keyOf = (id: ItemId): string => {
  const base = baseOf(id);
  return base.slice(base.lastIndexOf('.') + 1);
};

/** "num.answer.{item}" + "num.3" → "num.answer.3". */
export function voiceId(template: string, item: ItemId): string {
  return template.replace('{item}', keyOf(item));
}

export function voiceIds(line: Line | undefined, item: ItemId): string[] {
  if (line === undefined) return [];
  return (Array.isArray(line) ? line : [line]).map((id) => voiceId(id, item));
}
