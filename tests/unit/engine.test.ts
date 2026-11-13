import { describe, expect, it } from 'vitest';
import { numberOf, numbersUpTo } from '../../src/content/numbers';
import { countUnicorns } from '../../src/games/configs/pradera';
import { applyRound, initialDifficulty } from '../../src/games/engine/adaptive';
import { buildRound } from '../../src/games/engine/rounds';
import {
  HINT_TIMES,
  NEXT_ROUND_DELAY,
  RoundRunner,
  type RunnerEvent,
} from '../../src/games/engine/RoundRunner';
import { pickItems, updateRecord, type ItemRecord } from '../../src/games/engine/spaced';
import { voiceId, type Level } from '../../src/games/engine/types';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('applyRound (adaptive difficulty)', () => {
  const clean = { incorrect: 0, assisted: false };

  it('levels up after 3 consecutive first-try rounds', () => {
    let d = initialDifficulty(1);
    expect((d = applyRound(d, clean).next).level).toBe(1);
    expect((d = applyRound(d, clean).next).level).toBe(1);
    const third = applyRound(d, clean);
    expect(third).toMatchObject({ change: 'up', next: { level: 2, streak: 0 } });
  });

  it('a miss breaks the streak', () => {
    let d = initialDifficulty(1);
    d = applyRound(d, clean).next;
    d = applyRound(d, clean).next;
    d = applyRound(d, { incorrect: 1, assisted: false }).next;
    expect(d).toMatchObject({ level: 1, streak: 0, incorrect: 1 });
    expect(applyRound(d, clean).change).toBeNull();
  });

  it('levels down after 2 incorrect answers or 1 assisted round', () => {
    const two = applyRound(initialDifficulty(3), { incorrect: 2, assisted: false });
    expect(two).toMatchObject({ change: 'down', next: { level: 2 } });
    let d = applyRound(initialDifficulty(2), { incorrect: 1, assisted: false }).next;
    expect(d.level).toBe(2);
    d = applyRound(d, { incorrect: 1, assisted: false }).next;
    expect(d.level).toBe(1);
    expect(applyRound(initialDifficulty(2), { incorrect: 0, assisted: true }).next.level).toBe(1);
  });

  it('clamps at levels 1 and 3 without announcing a change', () => {
    expect(applyRound(initialDifficulty(1), { incorrect: 3, assisted: false })).toMatchObject({
      change: null,
      next: { level: 1 },
    });
    const top = { level: 3 as Level, streak: 2, incorrect: 0 };
    expect(applyRound(top, clean)).toMatchObject({ change: null, next: { level: 3 } });
  });
});

describe('pickItems (spaced repetition)', () => {
  const rec = (box: 1 | 2 | 3): ItemRecord => ({ seen: 1, correctFirstTry: 1, lastSeen: 0, box });

  it('returns n distinct items from the pool', () => {
    const picked = pickItems(numbersUpTo(10), {}, 4, seeded());
    expect(new Set(picked).size).toBe(4);
    for (const id of picked) expect(numbersUpTo(10)).toContain(id);
  });

  it('returns the whole pool when n exceeds it', () => {
    expect(pickItems(numbersUpTo(3), {}, 9, seeded()).sort()).toEqual(numbersUpTo(3));
  });

  it('draws roughly 60/30/10 from boxes 1/2/3', () => {
    const records = { a: rec(1), b: rec(2), c: rec(3) };
    const rng = seeded(7);
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 5000; i++) counts[pickItems(['a', 'b', 'c'], records, 1, rng)[0]!]!++;
    expect(counts.a! / 5000).toBeCloseTo(0.6, 1);
    expect(counts.b! / 5000).toBeCloseTo(0.3, 1);
    expect(counts.c! / 5000).toBeCloseTo(0.1, 1);
  });

  it('still picks when every item is mastered', () => {
    expect(pickItems(['a', 'b'], { a: rec(3), b: rec(3) }, 1, seeded())).toHaveLength(1);
  });

  it('promotes on a first-try answer and resets to box 1 on a miss', () => {
    const up = updateRecord(rec(2), true, 99);
    expect(up).toEqual({ seen: 2, correctFirstTry: 2, lastSeen: 99, box: 3 });
    expect(updateRecord(up, true, 100).box).toBe(3);
    expect(updateRecord(up, false, 100)).toMatchObject({ box: 1, correctFirstTry: 2, seen: 3 });
    expect(updateRecord(undefined, false, 5)).toMatchObject({ seen: 1, box: 1 });
  });
});

describe('buildRound', () => {
  it('matches the level table for Cuenta los Unicornios', () => {
    const rng = seeded(3);
    for (let i = 0; i < 50; i++) {
      const l1 = buildRound(countUnicorns, 1, {}, rng);
      expect(l1.choices).toHaveLength(2);
      expect(numberOf(l1.target)).toBeLessThanOrEqual(3);
      const l2 = buildRound(countUnicorns, 2, {}, rng);
      expect(l2.choices).toHaveLength(3);
      expect(numberOf(l2.target)).toBeLessThanOrEqual(5);
      expect(l2.choices).toContain(l2.target);
      expect(new Set(l2.choices).size).toBe(3);
    }
  });

  it('uses near-miss distractors (n±1) at level 3', () => {
    const rng = seeded(5);
    for (let i = 0; i < 50; i++) {
      const round = buildRound(countUnicorns, 3, {}, rng);
      const n = numberOf(round.target);
      const others = round.choices.filter((c) => c !== round.target).map(numberOf);
      const neighbours = [n - 1, n + 1].filter((v) => v >= 1 && v <= 10);
      for (const v of neighbours) expect(others).toContain(v);
    }
  });

  it('does not repeat the previous target', () => {
    const rng = seeded(9);
    for (let i = 0; i < 50; i++) {
      expect(buildRound(countUnicorns, 1, {}, rng, 'num.2').target).not.toBe('num.2');
    }
  });

  it('fills voice templates from the item key', () => {
    expect(voiceId('num.answer.{item}', 'num.7')).toBe('num.answer.7');
    expect(voiceId('common.complete', 'num.7')).toBe('common.complete');
  });
});

describe('RoundRunner', () => {
  function setup(level: Level = 1, seed = 2) {
    const events: RunnerEvent[] = [];
    const runner = new RoundRunner(countUnicorns, {
      level,
      rng: seeded(seed),
      now: () => 1000,
      onEvent: (e) => events.push(e),
    });
    const last = <T extends RunnerEvent['type']>(type: T) =>
      events.filter((e): e is Extract<RunnerEvent, { type: T }> => e.type === type).at(-1);
    const round = () => last('prompt')!.round;
    /** Counts every object, then answers correctly, then waits out the feedback. */
    const playRound = () => {
      const n = numberOf(round().target);
      for (let i = 0; i < n; i++) runner.tapObject(i);
      runner.choose(round().target);
      runner.tick(NEXT_ROUND_DELAY + 0.01);
    };
    return { runner, events, last, round, playRound };
  }

  it('plays the intro only when asked, then prompts the first step', () => {
    const a = setup();
    a.runner.start(true);
    expect(a.events.map((e) => e.type)).toEqual(['intro']);
    a.runner.introDone();
    expect(a.last('prompt')).toMatchObject({ roundIndex: 0, step: 'tap-all', stepIndex: 0 });

    const b = setup();
    b.runner.start(false);
    expect(b.events.map((e) => e.type)).toEqual(['prompt']);
  });

  it('counts each object once, then moves to the choose step', () => {
    const { runner, events, round, last } = setup(2);
    runner.start(false);
    const n = numberOf(round().target);
    runner.choose(round().target); // ignored: still counting
    runner.tapObject(0);
    runner.tapObject(0); // same object twice counts once
    runner.tapObject(99); // not an object
    expect(events.filter((e) => e.type === 'counted')).toHaveLength(1);
    for (let i = 1; i < n; i++) runner.tapObject(i);
    expect(last('counted')).toMatchObject({ count: n, assisted: false });
    expect(last('prompt')).toMatchObject({ step: 'choose-one', stepIndex: 1 });
  });

  it('redirects on a wrong answer without ending the round', () => {
    const { runner, round, last, events } = setup();
    runner.start(false);
    for (let i = 0; i < numberOf(round().target); i++) runner.tapObject(i);
    const wrong = round().choices.find((c) => c !== round().target)!;
    runner.choose(wrong);
    expect(last('incorrect')).toEqual({ type: 'incorrect', item: wrong, target: round().target });
    expect(events.some((e) => e.type === 'hint')).toBe(false);
    runner.choose(wrong);
    expect(last('hint')).toMatchObject({ level: 2, target: { kind: 'choice' } });
    runner.choose(round().target);
    expect(last('correct')).toMatchObject({ firstTry: false, assisted: false });
  });

  it('escalates hints at 8, 16 and 24 s, then Luna does it (assisted)', () => {
    const { runner, events, round, last } = setup();
    runner.start(false);
    for (let i = 0; i < numberOf(round().target); i++) runner.tapObject(i);
    const hints = () => events.filter((e) => e.type === 'hint').length;
    runner.tick(HINT_TIMES[0] - 0.1);
    expect(hints()).toBe(0);
    runner.tick(0.2);
    expect(last('hint')).toMatchObject({ level: 1 });
    runner.tick(8);
    expect(last('hint')).toMatchObject({ level: 2 });
    runner.tick(8);
    expect(last('hint')).toMatchObject({ level: 3 });
    expect(last('correct')).toMatchObject({ firstTry: false, assisted: true });
  });

  it('lets Luna count an object when the child stalls in the tap-all step', () => {
    const { runner, last } = setup();
    runner.start(false);
    runner.tick(8);
    runner.tick(8);
    runner.tick(8);
    expect(last('counted')).toMatchObject({ index: 0, assisted: true });
  });

  it('waits for the feedback delay and any hold before the next round', () => {
    const { runner, round, last } = setup();
    runner.start(false);
    for (let i = 0; i < numberOf(round().target); i++) runner.tapObject(i);
    runner.choose(round().target);
    runner.hold();
    runner.tick(5);
    expect(last('prompt')!.roundIndex).toBe(0);
    runner.release();
    runner.tick(0.01);
    expect(last('prompt')!.roundIndex).toBe(1);
  });

  it('levels up after 3 clean rounds and completes after 5', () => {
    const { runner, events, last, playRound } = setup();
    runner.start(false);
    for (let i = 0; i < 3; i++) playRound();
    expect(last('levelChange')).toEqual({ type: 'levelChange', level: 2, direction: 'up' });
    expect(last('prompt')!.round.level).toBe(2);
    playRound();
    playRound();
    const done = last('complete')!;
    expect(done.summary).toMatchObject({ level: 2, rounds: 5, firstTry: 5 });
    expect(Object.values(done.summary.records).every((r) => r.lastSeen === 1000)).toBe(true);
    expect(events.filter((e) => e.type === 'roundComplete')).toHaveLength(5);

    const before = events.length;
    runner.tapObject(0);
    runner.tick(60);
    expect(events).toHaveLength(before);
  });

  it('ends at the time limit even if rounds remain', () => {
    const events: RunnerEvent[] = [];
    const runner = new RoundRunner(
      { ...countUnicorns, maxDurationSec: 30 },
      { rng: seeded(), onEvent: (e) => events.push(e) },
    );
    runner.start(false);
    // Stall in the tap-all step until Luna has counted for her, past the limit.
    for (let t = 0; t < 400 && events.at(-1)!.type !== 'complete'; t++) {
      runner.tick(1);
      const prompt = events.findLast((e) => e.type === 'prompt');
      if (prompt?.type === 'prompt' && prompt.step === 'choose-one') {
        runner.choose(prompt.round.target);
      }
    }
    const done = events.at(-1)!;
    expect(done.type === 'complete' && done.summary.rounds).toBe(2);
  });
});
