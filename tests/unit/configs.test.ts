import { describe, expect, it } from 'vitest';
import { STICKERS } from '../../src/content/stickers';
import { ANIMALS, OBJECTIVES, SIMILAR_COLOURS } from '../../src/content/items';
import { numberOf } from '../../src/content/numbers';
import { GAME_LIST, GAMES } from '../../src/games/configs';
import { initialOf } from '../../src/games/configs/bosque';
import { buildRound } from '../../src/games/engine/rounds';
import {
  NEXT_ROUND_DELAY,
  RoundRunner,
  type RunnerEvent,
} from '../../src/games/engine/RoundRunner';
import {
  baseOf,
  keyOf,
  stepsOf,
  voiceIds,
  type GameConfig,
  type ItemId,
  type Level,
  type Round,
} from '../../src/games/engine/types';
import { STAGES, EMBLEMS } from '../../src/games/scenes/stages';
import { VOICE_ES } from '../../src/i18n/voice.es';
import { ZONE_IDS, ZONES } from '../../src/world/zones/defs';

const LEVELS: Level[] = [1, 2, 3];

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const rounds = (config: GameConfig, level: Level, n = 60, seed = 5): Round[] => {
  const rng = seeded(seed);
  return Array.from({ length: n }, () => buildRound(config, level, {}, rng, undefined, {}));
};

/** Plays a round the way a child who knows the answer would. */
function solve(runner: RoundRunner, config: GameConfig, round: Round, step: string): void {
  switch (step) {
    case 'tap-all': {
      const quantity = round.quantity ?? config.quantityOf?.(round.target) ?? 1;
      for (let i = 0; i < quantity; i++) runner.tapObject(i);
      break;
    }
    case 'choose-one':
      runner.choose(round.target);
      break;
    case 'drag-to-slot':
      for (const item of round.items ?? [])
        runner.place(item, config.slotOf?.(item) ?? baseOf(item));
      break;
    case 'sequence':
      for (const item of round.order ?? []) runner.tapItem(item);
      break;
    case 'free-play':
      for (const item of round.choices) runner.tapItem(item);
      break;
    case 'pairs': {
      const left = [...round.choices];
      while (left.length > 0) {
        const first = left.shift()!;
        const at = left.findIndex((c) => baseOf(c) === baseOf(first));
        runner.tapItem(first);
        runner.tapItem(left.splice(at, 1)[0]!);
      }
      break;
    }
  }
}

function play(config: GameConfig, level: Level, seed = 3) {
  const events: RunnerEvent[] = [];
  const runner = new RoundRunner(config, {
    level,
    rng: seeded(seed),
    now: () => 1,
    onEvent: (e) => {
      events.push(e);
    },
  });
  runner.start(false);
  for (let guard = 0; guard < 200 && events.at(-1)!.type !== 'complete'; guard++) {
    const prompt = events.findLast((e) => e.type === 'prompt');
    if (prompt?.type !== 'prompt') break;
    const before = events.length;
    solve(runner, config, prompt.round, prompt.step);
    // A step that finished the round leaves feedback pending; let it pass.
    if (events.slice(before).some((e) => e.type === 'correct'))
      runner.tick(NEXT_ROUND_DELAY + 0.01);
  }
  return events;
}

describe('game catalogue', () => {
  it('has the 16 games of v1, each with its own id, sticker and stage', () => {
    expect(GAME_LIST).toHaveLength(16);
    expect(new Set(GAME_LIST.map((g) => g.id)).size).toBe(16);
    expect(new Set(GAME_LIST.map((g) => g.sticker)).size).toBe(16);
    expect(new Set(GAME_LIST.map((g) => g.stage)).size).toBe(16);
    expect(Object.keys(STICKERS)).toHaveLength(16);
  });

  it('places every game in exactly one zone, on that zone, with a stage', () => {
    const placed = ZONE_IDS.flatMap((id) => ZONES[id].games.map((g) => ({ zone: id, id: g.id })));
    expect(placed.map((p) => p.id).sort()).toEqual(GAME_LIST.map((g) => g.id).sort());
    for (const { zone, id } of placed) {
      expect(GAMES[id]!.zone, id).toBe(zone);
      expect(ZONES[zone].stage, zone).toBeDefined();
    }
  });

  it('covers every learning objective tracked in the parent area', () => {
    const covered = new Set(GAME_LIST.flatMap((g) => g.objectives));
    for (const code of covered) expect(OBJECTIVES[code], code).toBeDefined();
    for (const code of Object.keys(OBJECTIVES)) expect(covered.has(code), code).toBe(true);
  });
});

describe.each(GAME_LIST.map((config) => [config.id, config] as const))(
  'config: %s',
  (_, config) => {
    it('has a stage component, an entrance emblem and a sticker voice line', () => {
      expect(STAGES[config.stage], config.stage).toBeDefined();
      expect(EMBLEMS[config.id]).toBeDefined();
      expect(VOICE_ES[STICKERS[config.sticker]!.voice]).toBeDefined();
    });

    it('keeps to the round limits of §7.1', () => {
      expect(config.roundsPerGame).toBeGreaterThanOrEqual(1);
      expect(config.roundsPerGame).toBeLessThanOrEqual(5);
      expect(config.maxDurationSec).toBeLessThanOrEqual(180);
      expect(config.levels).toHaveLength(3);
      expect(config.voice.correct.length).toBeGreaterThanOrEqual(8);
      expect(config.voice.incorrect.length).toBeGreaterThanOrEqual(6);
    });

    it.each(LEVELS)('builds well-formed rounds at level %i', (level) => {
      for (const round of rounds(config, level)) {
        const steps = stepsOf(config, level);
        expect(round.steps).toEqual(steps);
        expect(new Set(round.choices).size, 'choices are distinct').toBe(round.choices.length);
        if (steps.includes('choose-one')) {
          expect(round.choices).toContain(round.target);
          expect(round.choices.length).toBeGreaterThanOrEqual(2);
          // Big targets: never more than five things to choose between.
          expect(round.choices.length).toBeLessThanOrEqual(5);
        }
        if (steps.includes('drag-to-slot')) {
          expect(round.items!.length).toBeGreaterThan(0);
          for (const item of round.items!) {
            expect(round.slots, `${item} has a slot`).toContain(
              config.slotOf?.(item) ?? baseOf(item),
            );
          }
        }
        if (steps.includes('sequence')) {
          expect([...round.order!].sort()).toEqual([...round.items!].sort());
        }
        if (steps.includes('pairs')) {
          const kinds = round.choices.map(baseOf);
          for (const kind of kinds) expect(kinds.filter((k) => k === kind)).toHaveLength(2);
        }
        if (steps.includes('tap-all')) {
          const quantity = round.quantity ?? config.quantityOf!(round.target);
          expect(quantity).toBeGreaterThanOrEqual(1);
          expect(quantity).toBeLessThanOrEqual(10);
        }
      }
    });

    it.each(LEVELS)(
      'has a registered voice line for everything it can say at level %i',
      (level) => {
        const said = new Set<string>([
          config.voice.invite,
          config.voice.intro,
          config.voice.complete,
          ...config.voice.hints,
          ...config.voice.correct,
          ...config.voice.incorrect,
        ]);
        const prompts = config.levels[level - 1]!.prompt ?? config.voice.prompt;
        for (const round of rounds(config, level, 150)) {
          round.steps.forEach((_, i) =>
            voiceIds(prompts[i], round.target).forEach((id) => said.add(id)),
          );
          voiceIds(config.voice.answer, round.target).forEach((id) => said.add(id));
          const touched = [...round.choices, ...(round.items ?? [])];
          for (const item of touched)
            voiceIds(config.voice.each, item).forEach((id) => said.add(id));
          if (round.steps.includes('choose-one') && config.voice.wrong) {
            for (const item of round.choices)
              voiceIds(config.voice.wrong, item).forEach((id) => said.add(id));
          }
          if (config.voice.count) {
            const quantity = round.quantity ?? config.quantityOf?.(round.target) ?? 0;
            for (let n = 1; n <= quantity; n++)
              voiceIds(config.voice.count, `n.${n}`).forEach((id) => said.add(id));
          }
        }
        for (const id of said) expect(VOICE_ES[id], id).toBeDefined();
      },
    );

    it.each(LEVELS)('can be played through to the sticker at level %i', (level) => {
      const events = play(config, level);
      const done = events.at(-1)!;
      expect(done.type).toBe('complete');
      if (done.type !== 'complete') return;
      expect(done.summary.rounds).toBe(config.roundsPerGame);
      expect(done.summary.attempts.every(Boolean)).toBe(true);
      expect(events.some((e) => e.type === 'incorrect' || e.type === 'hint')).toBe(false);
    });
  },
);

// ---- What each game's levels promise (GAME_DESIGN §10) ----

describe('level tables', () => {
  const targets = (id: string, level: Level) => rounds(GAMES[id]!, level, 80);

  it('Globos: 3 balloons from 6 colours, then 4 from 8, then similar pairs together', () => {
    for (const r of targets('balloons', 1)) {
      expect(r.choices).toHaveLength(3);
      expect(['color.morado', 'color.blanco']).not.toContain(r.target);
    }
    for (const r of targets('balloons', 2)) expect(r.choices).toHaveLength(4);
    for (const r of targets('balloons', 3)) {
      const twin = SIMILAR_COLOURS[keyOf(r.target)];
      if (twin) expect(r.choices).toContain(`color.${twin}`);
    }
  });

  it('Joyas: fit three gems first, then name the shape among 4, then among 5', () => {
    for (const r of targets('jewels', 1)) {
      expect(r.steps).toEqual(['drag-to-slot']);
      expect(r.items).toHaveLength(3);
      expect([...r.slots!].sort()).toEqual([...r.items!].sort());
    }
    for (const r of targets('jewels', 2)) expect(r.choices).toHaveLength(4);
    for (const r of targets('jewels', 3)) expect(r.choices).toHaveLength(5);
  });

  it('Puertas: big or small, then three sizes, then put all three in order', () => {
    for (const r of targets('doors', 1)) {
      expect([...r.choices].sort()).toEqual(['size.grande', 'size.pequena']);
    }
    for (const r of targets('doors', 2)) expect(r.choices).toHaveLength(3);
    for (const r of targets('doors', 3)) {
      expect(r.steps).toEqual(['drag-to-slot']);
      expect(r.slots).toEqual(['size.pequena', 'size.mediana', 'size.grande']);
    }
  });

  it('Torre: count 2–3 blocks, then up to 5, then stack biggest first', () => {
    for (const r of targets('tower', 1)) expect([2, 3]).toContain(r.quantity);
    for (const r of targets('tower', 2)) expect(r.quantity).toBeLessThanOrEqual(5);
    for (const r of targets('tower', 3)) {
      expect(r.order).toEqual(['size.grande', 'size.mediana', 'size.pequena']);
    }
  });

  it('Los Animales: free play with six animals, then find one among 3, then among 4', () => {
    for (const r of targets('animals', 1)) {
      expect(r.steps).toEqual(['free-play']);
      expect(r.choices).toHaveLength(6);
      expect(r.need).toBe(2);
    }
    for (const r of targets('animals', 2)) expect(r.choices).toHaveLength(3);
    for (const r of targets('animals', 3)) expect(r.choices).toHaveLength(4);
  });

  it('¿Quién hace muu?: 2 very different animals, up to 4 at level 3', () => {
    for (const r of targets('who', 1)) expect(r.choices).toHaveLength(2);
    for (const r of targets('who', 3)) expect(r.choices).toHaveLength(4);
  });

  it('Hogar de los Animales: two homes, then three; every animal goes where it lives', () => {
    for (const r of targets('homes', 1)) {
      expect(r.slots).toEqual(['home.granja', 'home.agua']);
      expect(r.slots).toContain(`home.${ANIMALS[keyOf(r.target)]!.home}`);
    }
    for (const r of targets('homes', 3)) expect(r.slots).toHaveLength(3);
    expect(GAMES.homes!.slotOf!('animal.zorro')).toBe('home.bosque');
    expect(GAMES.homes!.slotOf!('animal.rana')).toBe('home.agua');
  });

  it.each(['eggs', 'count-unicorns'])(
    '%s: 1–3 with 2 choices, 1–5 with 3, 1–10 near misses',
    (id) => {
      for (const r of targets(id, 1)) {
        expect(numberOf(r.target)).toBeLessThanOrEqual(3);
        expect(r.choices).toHaveLength(2);
      }
      for (const r of targets(id, 2)) {
        expect(numberOf(r.target)).toBeLessThanOrEqual(5);
        expect(r.choices).toHaveLength(3);
      }
      for (const r of targets(id, 3)) {
        const n = numberOf(r.target);
        const others = r.choices.filter((c) => c !== r.target).map(numberOf);
        for (const near of [n - 1, n + 1].filter((v) => v >= 1 && v <= 10))
          expect(others).toContain(near);
      }
    },
  );

  it('¿Dónde hay más?: the bigger group is the answer; "igual" only at level 3', () => {
    for (const level of LEVELS) {
      for (const r of targets('more', level)) {
        const [a, b] = r.groups as [number, number];
        expect(r.target).toBe(a === b ? 'cmp.igual' : a > b ? 'cmp.a' : 'cmp.b');
        if (level < 3) expect(a).not.toBe(b);
        if (level === 1) expect(Math.abs(a - b)).toBeGreaterThanOrEqual(2);
        expect(Math.max(a, b)).toBeLessThanOrEqual(6);
      }
    }
    expect(targets('more', 3).some((r) => r.target === 'cmp.igual')).toBe(true);
  });

  it.each(['necklace', 'next'])('%s: AB, then AAB, then ABC patterns continue correctly', (id) => {
    const unit = { 1: 2, 2: 3, 3: 3 } as const;
    for (const level of LEVELS) {
      for (const r of targets(id, level)) {
        const show = r.show!;
        const period = unit[level];
        // The shown part really repeats, and the answer is what comes next.
        for (let i = period; i < show.length; i++) expect(show[i]).toBe(show[i - period]);
        expect(r.target).toBe(show[show.length - period]);
        expect(r.choices).toHaveLength(level === 3 ? 3 : 2);
        expect(new Set(show).size).toBe(level === 3 ? 3 : 2);
      }
    }
  });

  it('Letras de Hielo: her initial, then vowels, then the first letter of an animal', () => {
    const letters = GAMES.letters!;
    const rng = seeded(9);
    for (let i = 0; i < 40; i++) {
      const own = buildRound(letters, 1, {}, rng, undefined, { firstLetter: 'M' });
      expect(own.target).toBe('letter.m');
      expect(own.choices).toHaveLength(2);
    }
    // No name set yet: starts with A rather than failing.
    expect(buildRound(letters, 1, {}, rng, undefined, {}).target).toBe('letter.a');
    for (const r of targets('letters', 2)) {
      expect(['a', 'e', 'i', 'o', 'u']).toContain(keyOf(r.target));
    }
    for (const r of targets('letters', 3)) {
      expect(r.show).toHaveLength(1);
      expect(keyOf(r.target)).toBe(initialOf(r.show![0]!));
    }
    expect(initialOf('animal.buho')).toBe('b');
    expect(initialOf('animal.ardilla')).toBe('a');
  });

  it('Las Huellas: exactly one track differs, among 3, 4, then 5', () => {
    for (const level of LEVELS) {
      for (const r of targets('tracks', level)) {
        expect(r.choices).toHaveLength(level + 2);
        const kinds = r.choices.map(baseOf);
        expect(kinds.filter((k) => k === baseOf(r.target))).toHaveLength(1);
        expect(new Set(kinds).size).toBe(2);
      }
    }
  });

  it('Parejas: 3, 4, then 6 pairs', () => {
    expect(targets('pairs', 1)[0]!.choices).toHaveLength(6);
    expect(targets('pairs', 2)[0]!.choices).toHaveLength(8);
    expect(targets('pairs', 3)[0]!.choices).toHaveLength(12);
  });

  it('Caras: three faces, then four; level 3 tells a story first', () => {
    for (const r of targets('faces', 1)) expect(r.choices).toHaveLength(3);
    for (const r of targets('faces', 2)) expect(r.choices).toHaveLength(4);
    expect(GAMES.faces!.levels[2].prompt).toEqual([['lake.faces.story.{item}', 'lake.faces.how']]);
  });
});

function itemsOf(config: GameConfig): ItemId[] {
  return config.levels.flatMap((l) => l.itemsPool);
}

describe('colour-learning objects use the canonical colours', () => {
  it('only ever asks about the eight learning colours', () => {
    for (const id of itemsOf(GAMES.balloons!)) expect(id).toMatch(/^color\./);
    expect(new Set(itemsOf(GAMES.balloons!)).size).toBe(8);
  });
});
