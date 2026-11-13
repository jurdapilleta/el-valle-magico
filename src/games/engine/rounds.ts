import { pickItems, type ItemRecord } from './spaced';
import {
  stepsOf,
  type GameConfig,
  type ItemId,
  type Level,
  type Rng,
  type Round,
  type RoundContext,
  type RoundSpec,
} from './types';

export function shuffle<T>(list: readonly T[], rng: Rng): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export const pickOne = <T>(list: readonly T[], rng: Rng): T =>
  list[Math.min(list.length - 1, Math.floor(rng() * list.length))]!;

/** The default round: a target chosen by spaced repetition, plus distractors. */
export function targetAndDistractors(ctx: RoundContext): RoundSpec {
  const pool = ctx.config.itemsPool;
  const targetPool = pool.length > 1 ? pool.filter((id) => id !== ctx.avoid) : pool;
  const target = pickItems(targetPool, ctx.records, 1, ctx.rng)[0]!;

  const others = pool.filter((id) => id !== target);
  const wanted = Math.min(ctx.config.choices - 1, others.length);
  let distractors: ItemId[];
  if (ctx.config.distractorRule === 'near') {
    // Near misses first (pool neighbours, i.e. n±1 for ordered pools), then random.
    const at = pool.indexOf(target);
    const near = [pool[at - 1], pool[at + 1]].filter((id): id is ItemId => id !== undefined);
    const rest = shuffle(
      others.filter((id) => !near.includes(id)),
      ctx.rng,
    );
    distractors = [...shuffle(near, ctx.rng), ...rest].slice(0, wanted);
  } else {
    distractors = shuffle(others, ctx.rng).slice(0, wanted);
  }
  return { target, choices: shuffle([target, ...distractors], ctx.rng) };
}

/** Builds one round. `avoid` keeps the same target from appearing twice in a row. */
export function buildRound(
  config: GameConfig,
  level: Level,
  records: Record<ItemId, ItemRecord>,
  rng: Rng = Math.random,
  avoid?: ItemId,
  child: RoundContext['child'] = {},
): Round {
  const ctx: RoundContext = {
    level,
    config: config.levels[level - 1]!,
    records,
    rng,
    avoid,
    child,
  };
  const spec = config.makeRound ? config.makeRound(ctx) : targetAndDistractors(ctx);
  return { ...spec, steps: stepsOf(config, level), level };
}
