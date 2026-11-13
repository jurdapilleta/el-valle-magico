import { GAME_LIST } from '../games/configs';

export type Sticker = {
  /** Voice line said when the sticker is tapped in the album. */
  voice: string;
  /** The game it is earned in; its picture is that game's icon. */
  game: string;
};

// One sticker per game for now. The album grows toward 60 (GAME_DESIGN §8.4)
// as games gain more than one sticker each.
export const STICKERS: Record<string, Sticker> = Object.fromEntries(
  GAME_LIST.map((game) => [game.sticker, { voice: `sticker.${game.sticker}`, game: game.id }]),
);
