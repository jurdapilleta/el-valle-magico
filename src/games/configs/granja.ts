import { ANIMAL_ITEMS, ANIMALS, animalsOf, SIMILAR_ANIMALS } from '../../content/items';
import { numberOf, numbersUpTo } from '../../content/numbers';
import { pickItems } from '../engine/spaced';
import { shuffle, targetAndDistractors } from '../engine/rounds';
import { keyOf, type GameConfig, type RoundContext, type RoundSpec } from '../engine/types';
import { defaults, voice } from './shared';

// GAME_DESIGN §10, games 5–8: La Granja.

const FARM = animalsOf('granja');

/** Level 1 is free play: six animals to tap, each says its name and sound. */
function animalsRound(ctx: RoundContext): RoundSpec {
  if (ctx.level > 1) return targetAndDistractors(ctx);
  const choices = pickItems(ctx.config.itemsPool, ctx.records, ctx.config.poolSize, ctx.rng);
  return { target: choices[0]!, choices, need: ctx.config.choices };
}

export const animals: GameConfig = {
  ...defaults,
  id: 'animals',
  title: 'los animales',
  zone: 'granja',
  host: 'tomas',
  objectives: ['ANI-1'],
  type: 'choose-one',
  levels: [
    { poolSize: 6, choices: 2, itemsPool: FARM, type: 'free-play', prompt: ['farm.explore'] },
    { poolSize: 3, choices: 3, itemsPool: FARM },
    { poolSize: 4, choices: 4, itemsPool: ANIMAL_ITEMS },
  ],
  makeRound: animalsRound,
  voice: voice('tomas', 'animals', {
    prompt: ['farm.where.{item}'],
    answer: ['item.animal.{item}', 'item.animal.{item}.sound'],
    wrong: 'animal.wrong.{item}',
    each: ['item.animal.{item}', 'item.animal.{item}.sound'],
  }),
  sticker: 'animals',
  stage: 'AnimalsStage',
};

/** Level 3 pairs the target with the animal it is most easily mistaken for. */
function whoRound(ctx: RoundContext): RoundSpec {
  const round = targetAndDistractors(ctx);
  const twin = SIMILAR_ANIMALS[keyOf(round.target)];
  if (ctx.level < 3 || !twin || round.choices.includes(`animal.${twin}`)) return round;
  const swapAt = round.choices.findIndex((c) => c !== round.target);
  const choices = [...round.choices];
  choices[swapAt] = `animal.${twin}`;
  return { ...round, choices };
}

export const who: GameConfig = {
  ...defaults,
  id: 'who',
  title: '¿quién hace muu?',
  zone: 'granja',
  host: 'tomas',
  objectives: ['ANI-1'],
  type: 'choose-one',
  levels: [
    // Very different voices first.
    {
      poolSize: 2,
      choices: 2,
      itemsPool: ['animal.vaca', 'animal.pato', 'animal.gato', 'animal.cerdo'],
    },
    { poolSize: 3, choices: 3, itemsPool: FARM },
    { poolSize: 4, choices: 4, distractorRule: 'same-category', itemsPool: ANIMAL_ITEMS },
  ],
  makeRound: whoRound,
  voice: voice('tomas', 'who', {
    prompt: [['farm.who.prompt', 'item.animal.{item}.sound']],
    answer: 'item.animal.{item}',
    wrong: 'animal.wrong.{item}',
  }),
  sticker: 'who',
  stage: 'WhoStage',
};

const homeOf = (item: string) => `home.${ANIMALS[keyOf(item)]!.home}`;

/** One animal to carry to where it lives. */
function homesRound(ctx: RoundContext): RoundSpec {
  const pool = ctx.config.itemsPool.filter((id) => id !== ctx.avoid);
  const target = pickItems(pool, ctx.records, 1, ctx.rng)[0]!;
  const slots =
    ctx.level === 1 ? ['home.granja', 'home.agua'] : ['home.granja', 'home.bosque', 'home.agua'];
  return {
    target,
    choices: [],
    items: [target],
    slots: ctx.level === 3 ? shuffle(slots, ctx.rng) : slots,
  };
}

export const homes: GameConfig = {
  ...defaults,
  id: 'homes',
  title: 'el hogar de los animales',
  zone: 'granja',
  host: 'tomas',
  objectives: ['ANI-2'],
  type: 'drag-to-slot',
  levels: [
    { poolSize: 1, choices: 2, itemsPool: animalsOf('granja', 'agua') },
    { poolSize: 1, choices: 3, itemsPool: ANIMAL_ITEMS },
    { poolSize: 1, choices: 3, itemsPool: ANIMAL_ITEMS },
  ],
  makeRound: homesRound,
  slotOf: homeOf,
  voice: voice('tomas', 'homes', {
    prompt: ['farm.home.prompt.{item}'],
    answer: 'farm.home.answer.{item}',
  }),
  sticker: 'homes',
  stage: 'HomesStage',
};

export const eggs: GameConfig = {
  ...defaults,
  id: 'eggs',
  title: 'los huevos',
  zone: 'granja',
  host: 'tomas',
  objectives: ['NUM-2', 'NUM-3'],
  type: ['tap-all', 'choose-one'],
  levels: [
    { poolSize: 3, choices: 2, distractorRule: 'random', itemsPool: numbersUpTo(3) },
    { poolSize: 5, choices: 3, distractorRule: 'random', itemsPool: numbersUpTo(5) },
    { poolSize: 10, choices: 3, distractorRule: 'near', itemsPool: numbersUpTo(10) },
  ],
  quantityOf: numberOf,
  choiceUi: 'cards',
  voice: voice('tomas', 'eggs', {
    prompt: ['farm.eggs.count', 'farm.eggs.howmany'],
    answer: 'farm.eggs.answer.{item}',
    wrong: 'num.wrong.{item}',
    count: 'item.num.{item}',
  }),
  sticker: 'eggs',
  stage: 'EggsStage',
};
