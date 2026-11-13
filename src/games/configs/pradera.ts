import { COLOUR_ITEMS } from '../../content/items';
import { numberOf, numbersUpTo } from '../../content/numbers';
import { shuffle } from '../engine/rounds';
import type { GameConfig, ItemId, RoundContext, RoundSpec } from '../engine/types';
import { defaults, voice } from './shared';

// GAME_DESIGN §10, games 9–11: Pradera de Unicornios.

export const countUnicorns: GameConfig = {
  ...defaults,
  id: 'count-unicorns',
  title: 'contar unicornios',
  zone: 'pradera',
  host: 'luna',
  objectives: ['NUM-1', 'NUM-2', 'NUM-3'],
  type: ['tap-all', 'choose-one'],
  levels: [
    { poolSize: 3, choices: 2, distractorRule: 'random', itemsPool: numbersUpTo(3) },
    { poolSize: 5, choices: 3, distractorRule: 'random', itemsPool: numbersUpTo(5) },
    { poolSize: 10, choices: 3, distractorRule: 'near', itemsPool: numbersUpTo(10) },
  ],
  quantityOf: numberOf,
  choiceUi: 'cards',
  voice: voice('luna', 'count', {
    prompt: ['num.prompt.count', 'num.prompt.howmany'],
    answer: 'num.answer.{item}',
    wrong: 'num.wrong.{item}',
    count: 'item.num.{item}',
  }),
  sticker: 'count-unicorns',
  stage: 'CountUnicornsStage',
};

/** Two baskets; which has more? At level 3 they may hold the same. */
function moreRound({ level, rng }: RoundContext): RoundSpec {
  const max = level === 1 ? 5 : 6;
  const gap = level === 1 ? 2 : 1;
  const choices: ItemId[] = ['cmp.a', 'cmp.b'];
  if (level === 3) choices.push('cmp.igual');
  if (level === 3 && rng() < 0.3) {
    const n = 1 + Math.floor(rng() * max);
    return { target: 'cmp.igual', choices, groups: [n, n] };
  }
  let a = 0;
  let b = 0;
  while (Math.abs(a - b) < gap) {
    a = 1 + Math.floor(rng() * max);
    b = 1 + Math.floor(rng() * max);
  }
  return { target: a > b ? 'cmp.a' : 'cmp.b', choices, groups: [a, b] };
}

export const more: GameConfig = {
  ...defaults,
  id: 'more',
  title: '¿dónde hay más?',
  zone: 'pradera',
  host: 'luna',
  objectives: ['NUM-4'],
  type: 'choose-one',
  levels: [
    { poolSize: 5, choices: 2, itemsPool: ['cmp.a', 'cmp.b'] },
    { poolSize: 6, choices: 2, itemsPool: ['cmp.a', 'cmp.b'] },
    {
      poolSize: 6,
      choices: 3,
      itemsPool: ['cmp.a', 'cmp.b', 'cmp.igual'],
      prompt: ['meadow.more.prompt.equal'],
    },
  ],
  makeRound: moreRound,
  voice: voice('luna', 'more', { prompt: ['meadow.more.prompt'] }),
  sticker: 'more',
  stage: 'MoreStage',
};

/**
 * A repeating pattern with the next element missing (LOG-2):
 * level 1 ABAB→A, level 2 AABAA→B, level 3 ABCAB→C.
 */
export function patternRound(pool: ItemId[]) {
  return ({ level, rng }: RoundContext): RoundSpec => {
    const [a, b, c] = shuffle(pool, rng) as [ItemId, ItemId, ItemId];
    const unit = level === 1 ? [a, b] : level === 2 ? [a, a, b] : [a, b, c];
    const length = level === 1 ? 4 : 5;
    const show = Array.from({ length }, (_, i) => unit[i % unit.length]!);
    const options = level === 3 ? [a, b, c] : [a, b];
    return { target: unit[length % unit.length]!, choices: shuffle(options, rng), show };
  };
}

export const necklace: GameConfig = {
  ...defaults,
  id: 'necklace',
  title: 'el collar de perlas',
  zone: 'pradera',
  host: 'luna',
  objectives: ['LOG-2'],
  type: 'choose-one',
  levels: [
    { poolSize: 4, choices: 2, itemsPool: COLOUR_ITEMS },
    { poolSize: 5, choices: 2, itemsPool: COLOUR_ITEMS },
    { poolSize: 5, choices: 3, itemsPool: COLOUR_ITEMS },
  ],
  // White pearls vanish against the snow-pale string; leave blanco out.
  makeRound: patternRound(COLOUR_ITEMS.filter((id) => id !== 'color.blanco')),
  voice: voice('luna', 'necklace', {
    prompt: ['logic.next.prompt'],
    answer: 'logic.next.answer',
    wrong: 'color.wrong.{item}',
  }),
  sticker: 'necklace',
  stage: 'NecklaceStage',
};
