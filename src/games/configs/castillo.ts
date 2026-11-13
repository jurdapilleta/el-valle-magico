import { COLOUR_ITEMS, SHAPE_ITEMS, SIMILAR_COLOURS, SIZE_ITEMS } from '../../content/items';
import { numberOf, numbersUpTo } from '../../content/numbers';
import { pickItems } from '../engine/spaced';
import { shuffle, targetAndDistractors } from '../engine/rounds';
import { keyOf, type GameConfig, type RoundContext, type RoundSpec } from '../engine/types';
import { defaults, voice } from './shared';

// GAME_DESIGN §10, games 1–4: Castillo de Estrella.

const SIX_COLOURS = COLOUR_ITEMS.filter((id) => !['color.morado', 'color.blanco'].includes(id));

/** Level 3 always puts the target next to the colour it is most easily mistaken for. */
function balloonRound(ctx: RoundContext): RoundSpec {
  const round = targetAndDistractors(ctx);
  const twin = SIMILAR_COLOURS[keyOf(round.target)];
  if (ctx.level < 3 || !twin || round.choices.includes(`color.${twin}`)) return round;
  const swapAt = round.choices.findIndex((c) => c !== round.target);
  const choices = [...round.choices];
  choices[swapAt] = `color.${twin}`;
  return { ...round, choices };
}

export const balloons: GameConfig = {
  ...defaults,
  id: 'balloons',
  title: 'los globos',
  zone: 'castillo',
  host: 'estrella',
  objectives: ['COL-1'],
  type: 'choose-one',
  levels: [
    { poolSize: 3, choices: 3, itemsPool: SIX_COLOURS },
    { poolSize: 4, choices: 4, itemsPool: COLOUR_ITEMS },
    { poolSize: 4, choices: 4, distractorRule: 'same-category', itemsPool: COLOUR_ITEMS },
  ],
  makeRound: balloonRound,
  voice: voice('estrella', 'balloons', {
    prompt: ['castle.balloons.prompt.{item}'],
    answer: 'castle.balloons.answer.{item}',
    wrong: 'color.wrong.{item}',
  }),
  sticker: 'balloons',
  stage: 'BalloonsStage',
};

/** Level 1 fits three gems into their matching holes (SHP-2) before naming shapes (SHP-1). */
function jewelRound(ctx: RoundContext): RoundSpec {
  if (ctx.level > 1) return targetAndDistractors(ctx);
  const items = pickItems(ctx.config.itemsPool, ctx.records, 3, ctx.rng);
  return { target: items[0]!, choices: [], items, slots: shuffle(items, ctx.rng) };
}

export const jewels: GameConfig = {
  ...defaults,
  id: 'jewels',
  title: 'las joyas de la princesa',
  zone: 'castillo',
  host: 'estrella',
  objectives: ['SHP-1', 'SHP-2'],
  type: 'choose-one',
  levels: [
    {
      poolSize: 3,
      choices: 3,
      itemsPool: SHAPE_ITEMS,
      type: 'drag-to-slot',
      prompt: ['castle.jewels.drag'],
    },
    { poolSize: 4, choices: 4, itemsPool: SHAPE_ITEMS },
    { poolSize: 5, choices: 5, itemsPool: SHAPE_ITEMS },
  ],
  makeRound: jewelRound,
  voice: voice('estrella', 'jewels', {
    prompt: ['castle.jewels.prompt.{item}'],
    wrong: 'shape.wrong.{item}',
    each: 'item.shape.{item}',
  }),
  sticker: 'jewels',
  stage: 'JewelsStage',
};

/** Level 3 sorts all three doors into places of matching size. */
function doorRound(ctx: RoundContext): RoundSpec {
  if (ctx.level < 3) return targetAndDistractors(ctx);
  return {
    target: 'size.grande',
    choices: [],
    items: shuffle(SIZE_ITEMS, ctx.rng),
    slots: [...SIZE_ITEMS],
  };
}

export const doors: GameConfig = {
  ...defaults,
  id: 'doors',
  title: 'las puertas',
  zone: 'castillo',
  host: 'estrella',
  objectives: ['SIZ-1'],
  type: 'choose-one',
  levels: [
    { poolSize: 2, choices: 2, itemsPool: ['size.pequena', 'size.grande'] },
    { poolSize: 3, choices: 3, itemsPool: SIZE_ITEMS },
    {
      poolSize: 3,
      choices: 3,
      itemsPool: SIZE_ITEMS,
      type: 'drag-to-slot',
      prompt: ['castle.doors.order'],
    },
  ],
  makeRound: doorRound,
  voice: voice('estrella', 'doors', {
    prompt: ['castle.doors.prompt.{item}'],
    answer: 'castle.doors.answer',
    wrong: 'size.wrong.{item}',
  }),
  sticker: 'doors',
  stage: 'DoorsStage',
};

/** Levels 1–2 count blocks into a tower; level 3 stacks three from biggest to smallest. */
function towerRound(ctx: RoundContext): RoundSpec {
  if (ctx.level < 3) {
    const round = targetAndDistractors(ctx);
    return { ...round, choices: [], quantity: numberOf(round.target) };
  }
  const order = [...SIZE_ITEMS].reverse();
  return { target: order[0]!, choices: [], items: shuffle(order, ctx.rng), order };
}

export const tower: GameConfig = {
  ...defaults,
  id: 'tower',
  title: 'la torre de bloques',
  zone: 'castillo',
  host: 'estrella',
  objectives: ['NUM-1', 'SIZ-1'],
  type: 'tap-all',
  levels: [
    { poolSize: 3, choices: 1, itemsPool: numbersUpTo(3).slice(1) },
    { poolSize: 5, choices: 1, itemsPool: numbersUpTo(5).slice(1) },
    {
      poolSize: 3,
      choices: 1,
      itemsPool: SIZE_ITEMS,
      type: 'sequence',
      prompt: ['castle.tower.order'],
    },
  ],
  makeRound: towerRound,
  voice: voice('estrella', 'tower', {
    prompt: ['castle.tower.count'],
    answer: 'castle.tower.answer',
    count: 'item.num.{item}',
  }),
  sticker: 'tower',
  stage: 'TowerStage',
};
