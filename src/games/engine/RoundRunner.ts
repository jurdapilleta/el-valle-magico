import { applyRound, initialDifficulty, type Difficulty } from './adaptive';
import { buildRound } from './rounds';
import { updateRecord, type ItemRecord } from './spaced';
import {
  baseOf,
  type GameConfig,
  type ItemId,
  type Level,
  type Rng,
  type Round,
  type RoundContext,
  type StepType,
} from './types';

// GAME_DESIGN §7.1
export const HINT_TIMES = [8, 16, 24] as const;
export const NEXT_ROUND_DELAY = 1.2;
/** How long two unmatched cards stay face up before turning back. */
export const MISMATCH_SECONDS = 0.9;

export type HintTarget =
  | { kind: 'object'; index: number }
  | { kind: 'choice'; item: ItemId }
  | { kind: 'item'; item: ItemId }
  | { kind: 'place'; item: ItemId; slot: string };

export type GameSummary = {
  level: Level;
  rounds: number;
  firstTry: number;
  /** One entry per round played: was it right first time, unaided? */
  attempts: boolean[];
  records: Record<ItemId, ItemRecord>;
};

type Pair = [ItemId, ItemId];

export type RunnerEvent =
  | { type: 'intro' }
  | { type: 'prompt'; round: Round; roundIndex: number; step: StepType; stepIndex: number }
  | { type: 'counted'; index: number; count: number; assisted: boolean }
  | { type: 'placed'; item: ItemId; slot: string; assisted: boolean }
  | { type: 'sequenced'; item: ItemId; index: number; assisted: boolean }
  | { type: 'explored'; item: ItemId; count: number; assisted: boolean }
  | { type: 'flipped'; item: ItemId }
  | { type: 'matched'; items: Pair; assisted: boolean }
  | { type: 'mismatch'; items: Pair }
  | { type: 'closed'; items: Pair }
  | { type: 'hint'; level: 1 | 2 | 3; target: HintTarget }
  | { type: 'correct'; item: ItemId; firstTry: boolean; assisted: boolean }
  | { type: 'incorrect'; item: ItemId; target: ItemId }
  | { type: 'roundComplete'; roundIndex: number; total: number }
  | { type: 'levelChange'; level: Level; direction: 'up' | 'down' }
  | { type: 'complete'; summary: GameSummary };

export type RunnerOptions = {
  level?: Level;
  records?: Record<ItemId, ItemRecord>;
  rng?: Rng;
  now?: () => number;
  child?: RoundContext['child'];
  onEvent: (event: RunnerEvent) => void;
};

type Phase = 'idle' | 'intro' | 'prompt' | 'feedback' | 'done';

/**
 * Runs one play of a data-driven game. It owns all answer logic; stage
 * components only render the events it emits. Time is injected through
 * tick(dt), so the whole round structure is deterministic under test.
 */
export class RoundRunner {
  private phase: Phase = 'idle';
  private difficulty: Difficulty;
  private records: Record<ItemId, ItemRecord>;
  private round!: Round;
  private roundIndex = -1;
  private stepIndex = 0;
  private counted = new Set<number>();
  private placed = new Map<ItemId, string>();
  private sequenced: ItemId[] = [];
  private explored = new Set<ItemId>();
  private open: ItemId[] = [];
  private matched = new Set<ItemId>();
  private closing: Pair | null = null;
  private closeIn = 0;
  private incorrectThisRound = 0;
  private assistedThisRound = false;
  private attempts: boolean[] = [];
  private idle = 0;
  private hintLevel = 0;
  private feedbackLeft = 0;
  private held = false;
  private elapsed = 0;
  private readonly rng: Rng;
  private readonly now: () => number;
  private readonly child: RoundContext['child'];
  private readonly emit: (event: RunnerEvent) => void;

  constructor(
    private readonly config: GameConfig,
    options: RunnerOptions,
  ) {
    this.difficulty = initialDifficulty(options.level ?? 1);
    this.records = { ...options.records };
    this.rng = options.rng ?? Math.random;
    this.now = options.now ?? Date.now;
    this.child = options.child ?? {};
    this.emit = options.onEvent;
  }

  get level(): Level {
    return this.difficulty.level;
  }

  /** `withIntro` is true only the first time the child plays this game. */
  start(withIntro: boolean): void {
    if (this.phase !== 'idle') return;
    if (withIntro) {
      this.phase = 'intro';
      this.emit({ type: 'intro' });
    } else {
      this.nextRound();
    }
  }

  introDone(): void {
    if (this.phase === 'intro') this.nextRound();
  }

  /** Keeps the feedback phase open (e.g. while a praise line is still playing). */
  hold(): void {
    this.held = true;
  }

  release(): void {
    this.held = false;
  }

  /** Restarts the hint clock, e.g. once the prompt's voice line has finished. */
  resetIdle(): void {
    this.idle = 0;
  }

  /** Re-emits the current prompt (the 🔊 button). */
  repeatPrompt(): void {
    if (this.phase === 'prompt') this.emitPrompt();
  }

  // ---- Player input ----

  /** tap-all: touch one of the objects being counted. */
  tapObject(index: number): void {
    if (this.phase !== 'prompt' || this.step !== 'tap-all') return;
    this.count(index, false);
  }

  /** choose-one: pick an answer. */
  choose(item: ItemId): void {
    if (this.phase !== 'prompt' || this.step !== 'choose-one') return;
    if (!this.round.choices.includes(item)) return;
    if (item === this.round.target) this.resolveCorrect(false);
    else this.miss(item, this.round.target);
  }

  /** drag-to-slot: drop (or tap-tap) an item onto a slot. */
  place(item: ItemId, slot: string): void {
    if (this.phase !== 'prompt' || this.step !== 'drag-to-slot') return;
    if (!this.round.items?.includes(item) || this.placed.has(item)) return;
    if (!this.round.slots?.includes(slot)) return;
    const correct = this.slotFor(item);
    if (slot === correct) this.doPlace(item, false);
    else this.miss(item, correct);
  }

  /** sequence, free-play and pairs: tap one of the items on stage. */
  tapItem(item: ItemId): void {
    if (this.phase !== 'prompt') return;
    if (this.step === 'sequence') {
      const order = this.round.order ?? [];
      if (!order.includes(item) || this.sequenced.includes(item)) return;
      const expected = order[this.sequenced.length]!;
      if (item === expected) this.advanceSequence(false);
      else this.miss(item, expected);
    } else if (this.step === 'free-play') {
      this.explore(item, false);
    } else if (this.step === 'pairs') {
      this.flip(item);
    }
  }

  tick(dt: number): void {
    if (this.phase === 'prompt') {
      this.elapsed += dt;
      if (this.closing) {
        this.closeIn -= dt;
        if (this.closeIn <= 0) {
          const items = this.closing;
          this.closing = null;
          this.emit({ type: 'closed', items });
        }
      }
      this.idle += dt;
      const due = HINT_TIMES[this.hintLevel];
      if (due !== undefined && this.idle >= due) {
        this.hintLevel++;
        const level = this.hintLevel as 1 | 2 | 3;
        this.emit({ type: 'hint', level, target: this.hintTarget() });
        if (level === 3) this.assist();
      }
    } else if (this.phase === 'feedback') {
      this.elapsed += dt;
      this.feedbackLeft -= dt;
      if (this.feedbackLeft <= 0 && !this.held) this.finishRound();
    }
  }

  // ---- Internals ----

  private get step(): StepType {
    return this.round.steps[this.stepIndex]!;
  }

  private get quantity(): number {
    return this.round.quantity ?? this.config.quantityOf?.(this.round.target) ?? 1;
  }

  private slotFor(item: ItemId): string {
    return this.config.slotOf?.(item) ?? baseOf(item);
  }

  private unmatched(): ItemId[] {
    return this.round.choices.filter((c) => !this.matched.has(c));
  }

  private hintTarget(): HintTarget {
    switch (this.step) {
      case 'tap-all': {
        let index = 0;
        while (this.counted.has(index)) index++;
        return { kind: 'object', index };
      }
      case 'drag-to-slot': {
        const item = (this.round.items ?? []).find((i) => !this.placed.has(i))!;
        return { kind: 'place', item, slot: this.slotFor(item) };
      }
      case 'sequence':
        return { kind: 'item', item: (this.round.order ?? [])[this.sequenced.length]! };
      case 'free-play':
        return { kind: 'item', item: this.round.choices.find((c) => !this.explored.has(c))! };
      case 'pairs':
        // Point at the partner of a card that is already face up, else any card.
        return { kind: 'item', item: this.pairToShow()[this.open.length === 1 ? 1 : 0] };
      default:
        return { kind: 'choice', item: this.round.target };
    }
  }

  private pairToShow(): Pair {
    const left = this.unmatched();
    const first = this.open[0] ?? left[0]!;
    const partner = left.find((c) => c !== first && baseOf(c) === baseOf(first))!;
    return [first, partner];
  }

  private resetHints(): void {
    this.idle = 0;
    this.hintLevel = 0;
  }

  private miss(item: ItemId, target: ItemId): void {
    this.incorrectThisRound++;
    this.emit({ type: 'incorrect', item, target });
    if (this.incorrectThisRound >= 2) {
      // Second miss in a round goes straight to the strong hint.
      this.hintLevel = 2;
      this.idle = HINT_TIMES[1];
      this.emit({ type: 'hint', level: 2, target: this.hintTarget() });
    } else {
      this.resetHints();
    }
  }

  /** Hint 3: Luna does it herself; the round counts as assisted. */
  private assist(): void {
    this.assistedThisRound = true;
    const target = this.hintTarget();
    switch (this.step) {
      case 'tap-all':
        if (target.kind === 'object') this.count(target.index, true);
        break;
      case 'drag-to-slot':
        if (target.kind === 'place') this.doPlace(target.item, true);
        break;
      case 'sequence':
        this.advanceSequence(true);
        break;
      case 'free-play':
        if (target.kind === 'item') this.explore(target.item, true);
        break;
      case 'pairs': {
        const items = this.pairToShow();
        this.open = [];
        this.match(items, true);
        break;
      }
      default:
        this.resolveCorrect(true);
    }
  }

  private count(index: number, assisted: boolean): void {
    if (index < 0 || index >= this.quantity || this.counted.has(index)) return;
    this.counted.add(index);
    this.resetHints();
    this.emit({ type: 'counted', index, count: this.counted.size, assisted });
    if (this.counted.size >= this.quantity) this.nextStep();
  }

  private doPlace(item: ItemId, assisted: boolean): void {
    const slot = this.slotFor(item);
    this.placed.set(item, slot);
    this.resetHints();
    this.emit({ type: 'placed', item, slot, assisted });
    if (this.placed.size >= (this.round.items ?? []).length) this.nextStep();
  }

  private advanceSequence(assisted: boolean): void {
    const order = this.round.order ?? [];
    const item = order[this.sequenced.length]!;
    this.sequenced.push(item);
    this.resetHints();
    this.emit({ type: 'sequenced', item, index: this.sequenced.length - 1, assisted });
    if (this.sequenced.length >= order.length) this.nextStep();
  }

  private explore(item: ItemId, assisted: boolean): void {
    if (!this.round.choices.includes(item)) return;
    this.explored.add(item);
    this.resetHints();
    // Repeat taps still answer (name and sound again); they just do not add up.
    this.emit({ type: 'explored', item, count: this.explored.size, assisted });
    const need = this.round.need ?? this.config.levels[this.round.level - 1]!.choices;
    if (this.explored.size >= Math.min(need, this.round.choices.length)) this.nextStep();
  }

  private flip(item: ItemId): void {
    if (this.closing || !this.round.choices.includes(item)) return;
    if (this.matched.has(item) || this.open.includes(item)) return;
    this.open.push(item);
    this.idle = 0;
    this.emit({ type: 'flipped', item });
    if (this.open.length < 2) return;
    const items = this.open as Pair;
    this.open = [];
    if (baseOf(items[0]) === baseOf(items[1])) {
      this.match(items, false);
    } else {
      // Turning over the wrong card is how memory games are played, not a mistake.
      this.closing = items;
      this.closeIn = MISMATCH_SECONDS;
      this.emit({ type: 'mismatch', items });
    }
  }

  private match(items: Pair, assisted: boolean): void {
    this.matched.add(items[0]).add(items[1]);
    this.resetHints();
    this.emit({ type: 'matched', items, assisted });
    if (this.matched.size >= this.round.choices.length) this.nextStep();
  }

  private nextStep(): void {
    if (this.stepIndex + 1 < this.round.steps.length) {
      this.stepIndex++;
      this.resetHints();
      this.emitPrompt();
    } else {
      // A round whose last step has no single answer is complete once it is done.
      this.resolveCorrect(this.assistedThisRound);
    }
  }

  private resolveCorrect(assisted: boolean): void {
    const firstTry = this.incorrectThisRound === 0 && !this.assistedThisRound && !assisted;
    this.attempts.push(firstTry);
    const item = baseOf(this.round.target);
    this.records[item] = updateRecord(this.records[item], firstTry, this.now());
    this.phase = 'feedback';
    this.feedbackLeft = NEXT_ROUND_DELAY;
    this.emit({ type: 'correct', item: this.round.target, firstTry, assisted });
    this.emit({
      type: 'roundComplete',
      roundIndex: this.roundIndex,
      total: this.config.roundsPerGame,
    });
  }

  private finishRound(): void {
    const { next, change } = applyRound(this.difficulty, {
      incorrect: this.incorrectThisRound,
      assisted: this.assistedThisRound,
    });
    this.difficulty = next;

    const lastRound = this.roundIndex + 1 >= this.config.roundsPerGame;
    if (lastRound || this.elapsed >= this.config.maxDurationSec) {
      this.phase = 'done';
      this.emit({
        type: 'complete',
        summary: {
          level: next.level,
          rounds: this.roundIndex + 1,
          firstTry: this.attempts.filter(Boolean).length,
          attempts: [...this.attempts],
          records: { ...this.records },
        },
      });
      return;
    }
    if (change) this.emit({ type: 'levelChange', level: next.level, direction: change });
    this.nextRound();
  }

  private nextRound(): void {
    const previous = this.roundIndex >= 0 ? this.round.target : undefined;
    this.round = buildRound(
      this.config,
      this.difficulty.level,
      this.records,
      this.rng,
      previous,
      this.child,
    );
    this.roundIndex++;
    this.stepIndex = 0;
    this.counted.clear();
    this.placed.clear();
    this.sequenced = [];
    this.explored.clear();
    this.open = [];
    this.matched.clear();
    this.closing = null;
    this.incorrectThisRound = 0;
    this.assistedThisRound = false;
    this.resetHints();
    this.held = false;
    this.phase = 'prompt';
    this.emitPrompt();
  }

  private emitPrompt(): void {
    this.emit({
      type: 'prompt',
      round: this.round,
      roundIndex: this.roundIndex,
      step: this.step,
      stepIndex: this.stepIndex,
    });
  }
}
