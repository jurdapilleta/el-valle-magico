import type { GameConfig } from '../engine/types';
import { letters, next, tracks } from './bosque';
import { balloons, doors, jewels, tower } from './castillo';
import { animals, eggs, homes, who } from './granja';
import { faces, pairs } from './lago';
import { countUnicorns, more, necklace } from './pradera';

/** The 16 games of v1 (GAME_DESIGN §10), in catalogue order. */
export const GAME_LIST: GameConfig[] = [
  balloons,
  jewels,
  doors,
  tower,
  animals,
  who,
  homes,
  eggs,
  countUnicorns,
  more,
  necklace,
  letters,
  next,
  tracks,
  pairs,
  faces,
];

export const GAMES: Record<string, GameConfig> = Object.fromEntries(
  GAME_LIST.map((config) => [config.id, config]),
);
