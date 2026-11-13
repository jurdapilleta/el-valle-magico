import { describe, expect, it } from 'vitest';
import { GAMES } from '../../src/games/configs';
import {
  HINT_TIMES,
  MISMATCH_SECONDS,
  NEXT_ROUND_DELAY,
  RoundRunner,
  type RunnerEvent,
} from '../../src/games/engine/RoundRunner';
import { baseOf, type GameConfig, type Level } from '../../src/games/engine/types';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function setup(config: GameConfig, level: Level) {
  const events: RunnerEvent[] = [];
  const runner = new RoundRunner(config, {
    level,
    rng: seeded(4),
    onEvent: (e) => {
      events.push(e);
    },
  });
  runner.start(false);
  const last = <T extends RunnerEvent['type']>(type: T) =>
    events.filter((e): e is Extract<RunnerEvent, { type: T }> => e.type === type).at(-1);
  const count = (type: RunnerEvent['type']) => events.filter((e) => e.type === type).length;
  const round = () => last('prompt')!.round;
  const stall = () => HINT_TIMES.forEach(() => runner.tick(8));
  return { runner, events, last, count, round, stall };
}

describe('drag-to-slot (Joyas level 1)', () => {
  const jewels = GAMES.jewels!;

  it('accepts each gem only in its own hole, and finishes when all are in', () => {
    const { runner, round, last, count } = setup(jewels, 1);
    const [a, b, c] = round().items as [string, string, string];
    runner.place(a, b);
    expect(last('incorrect')).toMatchObject({ item: a, target: a });
    expect(count('placed')).toBe(0);
    runner.place(a, 'not-a-slot');
    expect(count('incorrect')).toBe(1);

    runner.place(a, a);
    runner.place(a, a); // already placed: ignored
    expect(count('placed')).toBe(1);
    runner.place(b, b);
    runner.place(c, c);
    expect(last('correct')).toMatchObject({ firstTry: false, assisted: false });
  });

  it('counts as first try when every gem goes straight home', () => {
    const { runner, round, last } = setup(jewels, 1);
    for (const item of round().items!) runner.place(item, item);
    expect(last('correct')).toMatchObject({ firstTry: true });
  });

  it('hints at a gem and its hole, then Luna places it', () => {
    const { last, stall, round } = setup(jewels, 1);
    const first = round().items![0]!;
    stall();
    expect(last('hint')).toMatchObject({
      level: 3,
      target: { kind: 'place', item: first, slot: first },
    });
    expect(last('placed')).toMatchObject({ item: first, assisted: true });
  });
});

describe('sequence (Torre level 3)', () => {
  it('only accepts the blocks from biggest to smallest', () => {
    const { runner, last, count } = setup(GAMES.tower!, 3);
    runner.tapItem('size.pequena');
    expect(last('incorrect')).toMatchObject({ item: 'size.pequena', target: 'size.grande' });
    runner.tapItem('size.grande');
    runner.tapItem('size.grande'); // already on the tower
    runner.tapItem('size.mediana');
    expect(count('sequenced')).toBe(2);
    expect(count('correct')).toBe(0);
    runner.tapItem('size.pequena');
    expect(last('sequenced')).toMatchObject({ item: 'size.pequena', index: 2 });
    expect(last('correct')).toMatchObject({ firstTry: false });
  });
});

describe('free play (Los Animales level 1)', () => {
  it('never marks a tap wrong, and ends the round after two different animals', () => {
    const { runner, round, count, last } = setup(GAMES.animals!, 1);
    const [a, b] = round().choices as [string, string];
    runner.tapItem(a);
    runner.tapItem(a); // the same animal again still answers, but does not add up
    expect(count('explored')).toBe(2);
    expect(last('explored')).toMatchObject({ item: a, count: 1 });
    expect(count('correct')).toBe(0);
    runner.tapItem(b);
    expect(count('incorrect')).toBe(0);
    expect(last('correct')).toMatchObject({ firstTry: true });
  });
});

describe('pairs (Parejas)', () => {
  const pairs = GAMES.pairs!;

  it('keeps a matching pair face up and turns a mismatch back after a moment', () => {
    const { runner, round, last, count } = setup(pairs, 1);
    const cards = round().choices;
    const a = cards[0]!;
    const partner = cards.find((c) => c !== a && baseOf(c) === baseOf(a))!;
    const other = cards.find((c) => baseOf(c) !== baseOf(a))!;

    runner.tapItem(a);
    runner.tapItem(a); // the same card twice is one flip
    expect(count('flipped')).toBe(1);
    runner.tapItem(other);
    expect(last('mismatch')).toMatchObject({ items: [a, other] });
    // Not a mistake: memory games are played by looking.
    expect(count('incorrect')).toBe(0);

    runner.tapItem(partner); // ignored while the two cards are still showing
    expect(count('flipped')).toBe(2);
    runner.tick(MISMATCH_SECONDS + 0.01);
    expect(last('closed')).toMatchObject({ items: [a, other] });

    runner.tapItem(a);
    runner.tapItem(partner);
    expect(last('matched')).toMatchObject({ items: [a, partner], assisted: false });
    runner.tapItem(a); // matched cards stay put
    expect(count('flipped')).toBe(4);
  });

  it('finishes a table when every pair is found, and a game after two tables', () => {
    const { runner, round, count, last } = setup(pairs, 1);
    for (let table = 0; table < 2; table++) {
      const left = [...round().choices];
      while (left.length > 0) {
        const first = left.shift()!;
        const at = left.findIndex((c) => baseOf(c) === baseOf(first));
        runner.tapItem(first);
        runner.tapItem(left.splice(at, 1)[0]!);
      }
      runner.tick(NEXT_ROUND_DELAY + 0.01);
    }
    expect(count('matched')).toBe(6);
    expect(last('complete')!.summary).toMatchObject({ rounds: 2, firstTry: 2 });
  });

  it('when she stalls, Luna finds a pair for her', () => {
    const { last, stall } = setup(pairs, 1);
    stall();
    expect(last('matched')).toMatchObject({ assisted: true });
  });
});
