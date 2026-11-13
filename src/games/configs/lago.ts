import { EMOTION_ITEMS } from '../../content/items';
import { shuffle } from '../engine/rounds';
import type { GameConfig, RoundContext, RoundSpec } from '../engine/types';
import { defaults, voice } from './shared';

// GAME_DESIGN §10, games 15–16: Lago del Arcoíris.

const PAIR_ANIMALS = ['pato', 'rana', 'pez', 'tortuga', 'conejo', 'gato', 'vaca', 'buho'].map(
  (key) => `animal.${key}`,
);

/** A table of face-down cards: `poolSize` pairs. */
function pairsRound(ctx: RoundContext): RoundSpec {
  const kinds = shuffle(ctx.config.itemsPool, ctx.rng).slice(0, ctx.config.poolSize);
  const choices = shuffle(
    kinds.flatMap((kind) => [`${kind}#a`, `${kind}#b`]),
    ctx.rng,
  );
  return { target: choices[0]!, choices };
}

export const pairs: GameConfig = {
  ...defaults,
  id: 'pairs',
  title: 'las parejas',
  zone: 'lago',
  host: 'melodia',
  objectives: ['MEM-1'],
  type: 'pairs',
  // Each round is a whole table of cards, so two rounds make a game.
  roundsPerGame: 2,
  levels: [
    { poolSize: 3, choices: 6, itemsPool: PAIR_ANIMALS },
    { poolSize: 4, choices: 8, itemsPool: PAIR_ANIMALS },
    { poolSize: 6, choices: 12, itemsPool: PAIR_ANIMALS },
  ],
  makeRound: pairsRound,
  voice: voice('melodia', 'pairs', {
    prompt: ['lake.pairs.prompt'],
    answer: 'lake.pairs.answer',
    each: 'item.animal.{item}',
  }),
  sticker: 'pairs',
  stage: 'PairsStage',
};

export const faces: GameConfig = {
  ...defaults,
  id: 'faces',
  title: 'las caras',
  zone: 'lago',
  host: 'melodia',
  objectives: ['EMO-1'],
  type: 'choose-one',
  levels: [
    { poolSize: 3, choices: 3, itemsPool: EMOTION_ITEMS },
    { poolSize: 4, choices: 4, itemsPool: EMOTION_ITEMS },
    {
      poolSize: 3,
      choices: 3,
      itemsPool: EMOTION_ITEMS,
      // A short story, then the question (§7.4).
      prompt: [['lake.faces.story.{item}', 'lake.faces.how']],
    },
  ],
  voice: voice('melodia', 'faces', {
    prompt: ['lake.faces.prompt.{item}'],
    answer: 'item.emotion.{item}',
    wrong: 'emotion.wrong.{item}',
  }),
  sticker: 'faces',
  stage: 'FacesStage',
};
