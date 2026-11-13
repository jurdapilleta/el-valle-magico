import type { ItemId } from '../games/engine/types';

/** Learning items for NUM-1/2/3: "num.1" … "num.10". */
export const NUMBER_ITEMS: ItemId[] = Array.from({ length: 10 }, (_, i) => `num.${i + 1}`);

export function numberOf(item: ItemId): number {
  return Number(item.slice(item.lastIndexOf('.') + 1));
}

export function numbersUpTo(max: number): ItemId[] {
  return NUMBER_ITEMS.slice(0, max);
}
