import { create } from 'zustand';
import { audio, variantPicker } from '../audio/AudioManager';
import { sceneActor } from '../core/machine';
import { recordAttempts, writeSave } from '../core/persistence';
import { useGameStore } from '../core/store';
import { stageOf } from '../world/layout';
import { burst } from '../world/Particles';
import { cheerLuna, luna, walkLunaTo } from '../world/lunaState';
import { hostState } from '../world/travel';
import { ZONES } from '../world/zones/defs';
import { GAMES } from './configs';
import { stagePoints } from './stagePoints';
import { RoundRunner, type HintTarget, type RunnerEvent } from './engine/RoundRunner';
import {
  baseOf,
  voiceId,
  voiceIds,
  type GameConfig,
  type ItemId,
  type Level,
  type Round,
  type StepType,
} from './engine/types';

const CELEBRATION_MS = 2000; // §4.4: celebrations are 2 s, not 10
const STICKER_MS = 1800;
const INVITE_TIMEOUT_MS = 5000;

/** What the stage and HUD render. Written only by the session glue below. */
type SessionView = {
  config: GameConfig | null;
  roundIndex: number;
  totalRounds: number;
  stars: number;
  level: Level;
  step: StepType | null;
  target: ItemId | null;
  choices: ItemId[];
  items: ItemId[];
  slots: string[];
  show: ItemId[];
  groups: number[];
  /** Number of objects on stage in a tap-all step. */
  quantity: number;
  /** Object index → the number it was counted as. */
  counted: Record<number, number>;
  /** Dragged item → the slot it now sits in. */
  placed: Record<ItemId, string>;
  sequenced: ItemId[];
  explored: ItemId[];
  faceUp: ItemId[];
  matched: ItemId[];
  /** Item picked up by a tap, waiting for a tap on a slot (the no-drag alternative). */
  selected: ItemId | null;
  hint: { level: 1 | 2 | 3; target: HintTarget } | null;
  /** Last wrong pick; `nonce` retriggers the wiggle for a repeated miss. */
  wrong: { item: ItemId; nonce: number } | null;
  solved: boolean;
  celebrating: boolean;
  newSticker: string | null;
  /** Widest row on stage, in items: the camera frames this much. */
  span: number;
};

const ROUND_STATE = {
  counted: {},
  placed: {},
  sequenced: [],
  explored: [],
  faceUp: [],
  matched: [],
  selected: null,
  hint: null,
  wrong: null,
  solved: false,
} satisfies Partial<SessionView>;

const EMPTY: SessionView = {
  config: null,
  roundIndex: 0,
  totalRounds: 0,
  stars: 0,
  level: 1,
  step: null,
  target: null,
  choices: [],
  items: [],
  slots: [],
  show: [],
  groups: [],
  quantity: 0,
  ...ROUND_STATE,
  celebrating: false,
  newSticker: null,
  span: 3,
};

export const useSession = create<SessionView>(() => EMPTY);
const set = useSession.setState;

type Active = {
  run: RoundRunner;
  config: GameConfig;
  round: Round | null;
  praise: () => string;
  redirect: () => string;
};
let runner: Active | null = null;
let pendingLines: string[] = [];
let inviteTimer: ReturnType<typeof setTimeout> | undefined;
let nonce = 0;

function spanOf(round: Round, config: GameConfig): number {
  const onStage = config.choiceUi === 'cards' ? 0 : round.choices.length;
  const cards = round.steps.includes('pairs') ? Math.ceil(round.choices.length / 2) : onStage;
  return Math.max(
    3,
    cards,
    round.items?.length ?? 0,
    round.slots?.length ?? 0,
    (round.show?.length ?? 0) + 1,
    Math.min(5, round.quantity ?? config.quantityOf?.(round.target) ?? 0),
  );
}

// ---- Invite (§4.4 step 1) ----

/** Walks Luna beside the zone's stage, then the host offers the game. */
export function goToGame(id: string): void {
  const zoneId = useGameStore.getState().zone;
  const config = GAMES[id];
  if (!config || !ZONES[zoneId].games.some((g) => g.id === id)) return;
  walkLunaTo(stageOf(zoneId).seat, () => openInvite(config));
}

function openInvite(config: GameConfig): void {
  if (!sceneActor.getSnapshot().matches({ world: 'idle' })) return;
  sceneActor.send({ type: 'TAP_HOST' });
  set({ ...EMPTY, config });
  // Half toward the stage, half toward the player.
  luna.faceYaw = 0.7;
  clearTimeout(inviteTimer);
  hostState.talking = config.host !== 'luna';
  void audio.say(config.voice.invite).then((finished) => {
    hostState.talking = false;
    if (finished) inviteTimer = setTimeout(cancelInvite, INVITE_TIMEOUT_MS);
  });
}

export function cancelInvite(): void {
  if (!sceneActor.getSnapshot().matches({ world: 'invite' })) return;
  clearTimeout(inviteTimer);
  audio.stopVoice();
  hostState.talking = false;
  sceneActor.send({ type: 'CANCEL' });
  set(EMPTY);
}

export function acceptInvite(): void {
  const { config } = useSession.getState();
  if (!config || !sceneActor.getSnapshot().matches({ world: 'invite' })) return;
  clearTimeout(inviteTimer);
  sceneActor.send({ type: 'ACCEPT' });

  const { save, setSave } = useGameStore.getState();
  const progress = save.progress[config.id] ?? { level: 1 as Level, plays: 0, completions: 0 };
  const firstTime = progress.plays === 0;
  const next = {
    ...save,
    progress: { ...save.progress, [config.id]: { ...progress, plays: progress.plays + 1 } },
  };
  setSave(next);
  void writeSave(next);

  runner = {
    config,
    round: null,
    praise: variantPicker(config.voice.correct),
    redirect: variantPicker(config.voice.incorrect),
    run: new RoundRunner(config, {
      level: progress.level,
      records: save.items,
      child: save.child,
      onEvent: handle,
    }),
  };
  pendingLines = [];
  set({ totalRounds: config.roundsPerGame, level: progress.level });
  runner.run.start(firstTime);
}

// ---- Player input ----

export const tapObject = (index: number): void => runner?.run.tapObject(index);
export const choose = (item: ItemId): void => runner?.run.choose(item);
export const tapItem = (item: ItemId): void => runner?.run.tapItem(item);
export const repeatPrompt = (): void => runner?.run.repeatPrompt();

export function place(item: ItemId, slot: string): void {
  set({ selected: null });
  runner?.run.place(item, slot);
}

/** Tap an item to pick it up, then tap a slot: dragging is never required (§14). */
export function select(item: ItemId | null): void {
  set({ selected: item });
}

/** Tapping Luna leaves the game at any point (§4.4 step 3). */
export function exitGame(): void {
  if (!sceneActor.getSnapshot().matches('game')) return;
  runner = null;
  audio.stopVoice();
  sceneActor.send({ type: 'TAP_LUNA' });
  set(EMPTY);
}

export function tickSession(dt: number): void {
  // Real time (hint and feedback timers must not stretch on a slow device),
  // capped so a backgrounded tab does not fire every hint at once on return.
  runner?.run.tick(Math.min(dt, 1));
}

// ---- What a correct player would do next (drives the smoke tests) ----

export type Move = { tap: string } | { drag: [string, string] };

export function solution(): Move[] {
  const view = useSession.getState();
  const config = runner?.config;
  const round = runner?.round;
  if (!config || !round || view.solved) return [];
  switch (view.step) {
    case 'tap-all':
      return Array.from({ length: view.quantity }, (_, i) => i)
        .filter((i) => view.counted[i] === undefined)
        .map((i) => ({ tap: `object:${i}` }));
    case 'choose-one':
      return [{ tap: `choice:${round.target}` }];
    case 'drag-to-slot':
      return view.items
        .filter((item) => !(item in view.placed))
        .map((item) => ({
          drag: [`item:${item}`, `slot:${config.slotOf?.(item) ?? baseOf(item)}`],
        }));
    case 'sequence':
      return (round.order ?? [])
        .slice(view.sequenced.length)
        .map((item) => ({ tap: `item:${item}` }));
    case 'free-play':
      return view.choices
        .filter((c) => !view.explored.includes(c))
        .map((c) => ({ tap: `item:${c}` }));
    case 'pairs': {
      const left = view.choices.filter((c) => !view.matched.includes(c));
      const first = left[0];
      const partner = left.find((c) => c !== first && baseOf(c) === baseOf(first!));
      return first && partner ? [{ tap: `item:${first}` }, { tap: `item:${partner}` }] : [];
    }
    default:
      return [];
  }
}

// ---- Runner events → view, sound and scene state ----

function handle(event: RunnerEvent): void {
  const active = runner;
  if (!active) return;
  const { config, run } = active;
  const stillActive = () => runner === active;

  switch (event.type) {
    case 'intro':
      hostState.talking = config.host !== 'luna';
      void audio.say(config.voice.intro).then(() => {
        hostState.talking = false;
        if (stillActive()) run.introDone();
      });
      break;

    case 'prompt': {
      const state = sceneActor.getSnapshot();
      if (state.matches({ game: 'intro' })) sceneActor.send({ type: 'DONE' });
      else if (state.matches({ game: 'feedback' })) sceneActor.send({ type: 'NEXT' });
      const { round } = event;
      active.round = round;
      set((s) => ({
        roundIndex: event.roundIndex,
        level: round.level,
        step: event.step,
        target: round.target,
        choices: round.choices,
        items: round.items ?? [],
        slots: round.slots ?? [],
        show: round.show ?? [],
        groups: round.groups ?? [],
        quantity: round.quantity ?? config.quantityOf?.(round.target) ?? 0,
        span: spanOf(round, config),
        // A new step keeps what the earlier steps of this round built up.
        ...(event.stepIndex === 0 ? ROUND_STATE : { hint: null, wrong: null, counted: s.counted }),
      }));
      const prompts = config.levels[round.level - 1]!.prompt ?? config.voice.prompt;
      const lines = [...pendingLines, ...voiceIds(prompts[event.stepIndex], round.target)];
      pendingLines = [];
      void audio.say(lines).then(() => stillActive() && run.resetIdle());
      break;
    }

    case 'counted':
      set((s) => ({ counted: { ...s.counted, [event.index]: event.count }, hint: null }));
      audio.pop();
      if (config.voice.count) void audio.say(voiceId(config.voice.count, `n.${event.count}`));
      break;

    case 'placed':
      set((s) => ({
        placed: { ...s.placed, [event.item]: event.slot },
        hint: null,
        selected: null,
      }));
      audio.playSfx('sparkle', 1.3);
      void audio.say(voiceIds(config.voice.each, event.item));
      break;

    case 'sequenced':
      set((s) => ({ sequenced: [...s.sequenced, event.item], hint: null }));
      audio.pop();
      void audio.say(voiceIds(config.voice.each, event.item));
      break;

    case 'explored':
      set((s) => ({
        explored: s.explored.includes(event.item) ? s.explored : [...s.explored, event.item],
        hint: null,
      }));
      audio.pop();
      void audio.say(voiceIds(config.voice.each, event.item));
      break;

    case 'flipped':
      set((s) => ({ faceUp: [...s.faceUp, event.item], hint: null }));
      audio.playSfx('flip');
      break;

    case 'matched':
      set((s) => ({
        matched: [...s.matched, ...event.items],
        faceUp: s.faceUp.filter((c) => !event.items.includes(c)),
        hint: null,
      }));
      audio.playSfx('sparkle', 1.3);
      void audio.say(voiceIds(config.voice.each, event.items[0]));
      break;

    case 'mismatch':
      break;

    case 'closed':
      set((s) => ({ faceUp: s.faceUp.filter((c) => !event.items.includes(c)) }));
      break;

    case 'hint':
      set({ hint: { level: event.level, target: event.target } });
      void audio.say(config.voice.hints[event.level - 1]!);
      break;

    case 'incorrect': {
      set({ wrong: { item: event.item, nonce: ++nonce }, selected: null });
      audio.playSfx('boing');
      // Naming what she touched teaches even on a miss (§7.1).
      const named = config.voice.wrong && view().step === 'choose-one';
      void audio.say([
        ...(named ? [voiceId(config.voice.wrong!, event.item)] : []),
        active.redirect(),
      ]);
      break;
    }

    case 'correct': {
      sceneActor.send({ type: 'ANSWER' });
      set({ solved: true, hint: null, wrong: null, selected: null });
      audio.playSfx('chime');
      // Sparkles on the right item (or over the stage when there is no single one).
      burst(
        'sparkle',
        stagePoints.get(`choice:${event.item}`) ??
          stageOf(useGameStore.getState().zone).centre.clone().setY(1.2),
      );
      cheerLuna();
      hostState.happyUntil = performance.now() + 1200;
      run.hold();
      const lines = [active.praise(), ...voiceIds(config.voice.answer, event.item)];
      void audio.say(lines).then(() => stillActive() && run.release());
      break;
    }

    case 'roundComplete':
      set({ stars: event.roundIndex + 1 });
      setTimeout(() => stillActive() && audio.playSfx('arpeggio'), 350);
      break;

    case 'levelChange':
      // Going down is never announced (§7.2).
      if (event.direction === 'up') {
        pendingLines = ['common.levelup'];
        audio.playSfx('sparkle');
        burst('ring', { x: luna.position.x, y: 0.4, z: luna.position.z });
      }
      break;

    case 'complete': {
      sceneActor.send({ type: 'FINISH' });
      const { save, setSave } = useGameStore.getState();
      const progress = save.progress[config.id] ?? { level: 1 as Level, plays: 1, completions: 0 };
      const next = {
        ...save,
        items: { ...save.items, ...event.summary.records },
        objectives: recordAttempts(save.objectives, config.objectives, event.summary.attempts),
        progress: {
          ...save.progress,
          [config.id]: {
            ...progress,
            level: event.summary.level,
            completions: progress.completions + 1,
          },
        },
        stickers: save.stickers.includes(config.sticker)
          ? save.stickers
          : [...save.stickers, config.sticker],
      };
      setSave(next);
      void writeSave(next);

      set({ celebrating: true, step: null, hint: null });
      audio.playSfx('fanfare');
      burst('confetti', stageOf(useGameStore.getState().zone).centre.clone().setY(1.5));
      cheerLuna(CELEBRATION_MS);
      hostState.happyUntil = performance.now() + CELEBRATION_MS;
      void audio.say(config.voice.complete);
      setTimeout(() => {
        if (!stillActive()) return;
        set({ celebrating: false, newSticker: config.sticker });
        audio.playSfx('sticker');
        setTimeout(() => {
          if (!stillActive()) return;
          runner = null;
          sceneActor.send({ type: 'DONE' });
          set(EMPTY);
        }, STICKER_MS);
      }, CELEBRATION_MS);
      break;
    }
  }
}

const view = () => useSession.getState();
