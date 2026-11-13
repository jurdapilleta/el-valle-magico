import { ANIMAL_ITEMS, ANIMALS, LETTERS, TRACK_ITEMS, VOWELS } from '../../content/items';
import { pickOne, shuffle } from '../engine/rounds';
import { pickItems } from '../engine/spaced';
import {
  keyOf,
  type GameConfig,
  type ItemId,
  type RoundContext,
  type RoundSpec,
} from '../engine/types';
import { patternRound } from './pradera';
import { defaults, voice } from './shared';

// GAME_DESIGN §10, games 12–14: Bosque Nevado.

const letter = (key: string): ItemId => `letter.${key}`;
const ALL_LETTERS = Object.keys(LETTERS);
/** The first letter of an animal's name, without its article ("la vaca" → v). */
export const initialOf = (animal: ItemId): string =>
  ANIMALS[keyOf(animal)]!.name.split(' ')[1]!.charAt(0).normalize('NFD').charAt(0);

/**
 * Level 1: her own initial against one other letter. Level 2: the vowels.
 * Level 3: an animal is shown; which letter does its name start with?
 */
function lettersRound(ctx: RoundContext): RoundSpec {
  const others = (target: string, n: number, pool: string[]) =>
    shuffle(
      pool.filter((k) => k !== target),
      ctx.rng,
    ).slice(0, n);

  if (ctx.level === 1) {
    const own = (ctx.child.firstLetter ?? 'a').toLowerCase();
    const target = own in LETTERS ? own : 'a';
    return {
      target: letter(target),
      choices: shuffle([target, ...others(target, 1, ALL_LETTERS)], ctx.rng).map(letter),
    };
  }
  if (ctx.level === 2) {
    const pool = VOWELS.map(letter).filter((id) => id !== ctx.avoid);
    const target = keyOf(pickItems(pool, ctx.records, 1, ctx.rng)[0]!);
    return {
      target: letter(target),
      choices: shuffle([target, ...others(target, 2, VOWELS)], ctx.rng).map(letter),
    };
  }
  const animal = pickOne(ANIMAL_ITEMS, ctx.rng);
  const target = initialOf(animal);
  return {
    target: letter(target),
    choices: shuffle([target, ...others(target, 2, ALL_LETTERS)], ctx.rng).map(letter),
    show: [animal],
  };
}

export const letters: GameConfig = {
  ...defaults,
  id: 'letters',
  title: 'las letras de hielo',
  zone: 'bosque',
  host: 'copo',
  objectives: ['LET-1'],
  type: 'choose-one',
  levels: [
    { poolSize: 2, choices: 2, itemsPool: ALL_LETTERS.map(letter) },
    { poolSize: 3, choices: 3, itemsPool: VOWELS.map(letter) },
    {
      poolSize: 3,
      choices: 3,
      itemsPool: ALL_LETTERS.map(letter),
      prompt: ['snow.letters.initial'],
    },
  ],
  makeRound: lettersRound,
  voice: voice('copo', 'letters', {
    // Letters are said by sound and by name (§7.4).
    prompt: [['snow.letters.prompt.{item}', 'item.letter.{item}.sound']],
    answer: ['item.letter.{item}.sound', 'item.letter.{item}.name'],
    wrong: 'letter.wrong.{item}',
  }),
  sticker: 'letters',
  stage: 'LettersStage',
};

export const next: GameConfig = {
  ...defaults,
  id: 'next',
  title: '¿qué sigue?',
  zone: 'bosque',
  host: 'copo',
  objectives: ['LOG-2'],
  type: 'choose-one',
  levels: [
    { poolSize: 4, choices: 2, itemsPool: TRACK_ITEMS },
    { poolSize: 5, choices: 2, itemsPool: TRACK_ITEMS },
    { poolSize: 5, choices: 3, itemsPool: TRACK_ITEMS },
  ],
  makeRound: patternRound(TRACK_ITEMS),
  voice: voice('copo', 'next', { prompt: ['logic.next.prompt'], answer: 'logic.next.answer' }),
  sticker: 'next',
  stage: 'NextStage',
};

/** Several tracks alike and one different; more tracks at higher levels. */
function oddRound(ctx: RoundContext): RoundSpec {
  const [same, odd] = shuffle(ctx.config.itemsPool, ctx.rng) as [ItemId, ItemId];
  const count = ctx.config.choices;
  const oddAt = Math.floor(ctx.rng() * count);
  // "#n" tells the identical tracks apart on stage.
  const choices = Array.from({ length: count }, (_, i) => `${i === oddAt ? odd : same}#${i}`);
  return { target: choices[oddAt]!, choices };
}

export const tracks: GameConfig = {
  ...defaults,
  id: 'tracks',
  title: 'las huellas',
  zone: 'bosque',
  host: 'copo',
  objectives: ['LOG-1'],
  type: 'choose-one',
  levels: [
    { poolSize: 3, choices: 3, itemsPool: TRACK_ITEMS },
    { poolSize: 4, choices: 4, itemsPool: TRACK_ITEMS },
    { poolSize: 5, choices: 5, itemsPool: TRACK_ITEMS },
  ],
  makeRound: oddRound,
  voice: voice('copo', 'tracks', { prompt: ['logic.odd.prompt'], answer: 'logic.odd.answer' }),
  sticker: 'tracks',
  stage: 'TracksStage',
};
