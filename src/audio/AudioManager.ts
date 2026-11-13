import { Howl, Howler } from 'howler';
import { VOICE_ES } from '../i18n/voice.es';
import { bankOf } from '../i18n/voiceBanks';

export type VolumeGroup = 'voice' | 'music' | 'sfx';

export type SfxId =
  | 'chime'
  | 'pop'
  | 'boing'
  | 'arpeggio'
  | 'fanfare'
  | 'sparkle'
  | 'sticker'
  | 'flip'
  | 'splash'
  | 'crunch'
  | 'step';

type Sprite = Record<string, [number, number]>;
/** Written by tools/audio/build.mjs: which lines are recorded, and where in each bank. */
type VoiceIndex = { banks: Record<string, Sprite> };

const VOICE_DIR = 'audio/voice/es';
const VOICE_GAP_MS = 150; // between sequenced lines, §9.4
const VOICE_FADE_MS = 60;
const DUCK_MUSIC = 10 ** (-12 / 20); // −12 dB under voice
const DUCK_FADE_MS = 180;
const MUSIC_CROSSFADE_MS = 900;
/** Opus in WebM first; AAC for Safari versions that cannot play it (§11.2). */
const sources = (path: string) => [`${path}.webm`, `${path}.m4a`];

type CaptionListener = (text: string | null) => void;

/**
 * Single entry point for sound (GAME_DESIGN §9.4): one voice line at a time,
 * volume groups, music with ducking, and the iOS unlock gesture.
 *
 * Voice lines are addressed by ID and played from per-bank sprites. A line
 * that has not been recorded yet plays as a silent placeholder of roughly the
 * right length and is surfaced as a caption, so the game stays testable while
 * the voice is being produced. Nothing here ever synthesises speech.
 */
class AudioManager {
  private volumes: Record<VolumeGroup, number> = { voice: 1, music: 0.6, sfx: 0.8 };
  private sfx: Howl | null = null;
  private sfxSprite: Sprite = {};
  private voiceIndex: VoiceIndex = { banks: {} };
  private voiceBanks = new Map<string, Howl>();
  private current: { stop?: () => void; cancel: () => void } | null = null;
  private voiceToken = 0;
  private music: { id: string; howl: Howl } | null = null;
  private wantedMusic: string | null = null;
  private musicMuted = false;
  private musicTarget = 0;
  private captionListener: CaptionListener = () => {};
  unlocked = false;
  /** Test aid: silent placeholders last a moment instead of the line's length. */
  fastPlaceholders = false;

  /** Must be called from a user gesture (iOS will not start audio otherwise). */
  async unlock(): Promise<void> {
    // Howler creates its AudioContext lazily; touching volume() forces it.
    Howler.volume(1);
    const ctx = Howler.ctx as AudioContext | undefined;
    if (ctx && ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch {
        // Stays locked; the next gesture retries.
        return;
      }
    }
    this.unlocked = true;
    if (this.wantedMusic) this.playMusic(this.wantedMusic);
  }

  /** Loads the sprite maps written by the audio build. Missing files just mean "nothing yet". */
  async load(): Promise<void> {
    const json = async <T>(url: string, fallback: T): Promise<T> => {
      try {
        const res = await fetch(url);
        return res.ok ? ((await res.json()) as T) : fallback;
      } catch {
        return fallback;
      }
    };
    [this.voiceIndex, this.sfxSprite] = await Promise.all([
      json<VoiceIndex>(`${VOICE_DIR}/index.json`, { banks: {} }),
      json<Sprite>('audio/sfx/sfx.json', {}),
    ]);
    if (Object.keys(this.sfxSprite).length > 0) {
      this.sfx = new Howl({ src: sources('audio/sfx/sfx'), sprite: this.sfxSprite });
    }
  }

  onCaption(listener: CaptionListener): void {
    this.captionListener = listener;
  }

  setVolume(group: VolumeGroup, value: number): void {
    this.volumes[group] = Math.min(1, Math.max(0, value));
    if (group === 'music') this.applyMusicVolume(0);
  }

  /** What is playing, for the parent area and smoke tests. */
  state() {
    return {
      music: this.music?.id ?? null,
      // The level the music is at or fading to (fades are queued while a loop is still loading).
      musicVolume: this.music ? this.musicTarget : 0,
      speaking: this.current !== null,
      sfxReady: this.sfx !== null,
      recordedLines: Object.values(this.voiceIndex.banks).reduce(
        (sum, sprite) => sum + Object.keys(sprite).length,
        0,
      ),
    };
  }

  // ---- Sound effects ----

  playSfx(id: SfxId, rate = 1): void {
    if (!this.sfx || !(id in this.sfxSprite)) return;
    const sound = this.sfx.play(id);
    this.sfx.volume(this.volumes.sfx, sound);
    this.sfx.rate(rate, sound);
  }

  /** Tap feedback: soft pop with ±5 % random pitch (§8.3). */
  pop(): void {
    this.playSfx('pop', 0.95 + Math.random() * 0.1);
  }

  // ---- Music: one soft loop per zone, ducked under the voice ----

  /** Crossfades to a zone's loop. Before the unlock gesture it is only remembered. */
  playMusic(id: string): void {
    this.wantedMusic = id;
    if (!this.unlocked || this.music?.id === id) return;
    const previous = this.music?.howl;
    if (previous) {
      previous.fade(previous.volume(), 0, MUSIC_CROSSFADE_MS);
      setTimeout(() => previous.unload(), MUSIC_CROSSFADE_MS + 50);
    }
    // Web Audio, not a streamed <audio> element: the loop is gapless and the file is
    // fetched whole, which the offline cache can serve (it cannot answer the range
    // requests that streaming makes). Only one loop is in memory at a time.
    const howl = new Howl({
      src: sources(`audio/music/${id}`),
      loop: true,
      html5: false,
      volume: 0,
    });
    this.music = { id, howl };
    howl.play();
    this.applyMusicVolume(MUSIC_CROSSFADE_MS);
  }

  /** Time to rest (§7.6): the music fades away, and comes back when Luna wakes. */
  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    this.applyMusicVolume(1500);
  }

  private applyMusicVolume(fadeMs = DUCK_FADE_MS): void {
    if (!this.music) return;
    const target = this.musicMuted ? 0 : this.volumes.music * (this.current ? DUCK_MUSIC : 1);
    this.musicTarget = target;
    const { howl } = this.music;
    if (fadeMs > 0) howl.fade(howl.volume(), target, fadeMs);
    else howl.volume(target);
  }

  // ---- Voice ----

  /**
   * Plays one line, or several in order. A new call cancels whatever is
   * playing. Resolves true when the sequence finished, false if cancelled.
   */
  async say(ids: string | string[]): Promise<boolean> {
    const token = ++this.voiceToken;
    this.stopCurrent();
    const list = Array.isArray(ids) ? ids : [ids];
    for (let i = 0; i < list.length; i++) {
      if (i > 0) await this.wait(VOICE_GAP_MS);
      if (token !== this.voiceToken) return false;
      await this.playLine(list[i]!);
      if (token !== this.voiceToken) return false;
    }
    this.current = null;
    this.captionListener(null);
    this.applyMusicVolume();
    return true;
  }

  stopVoice(): void {
    this.voiceToken++;
    this.stopCurrent();
    this.captionListener(null);
    this.applyMusicVolume();
  }

  get speaking(): boolean {
    return this.current !== null;
  }

  private stopCurrent(): void {
    const playing = this.current;
    this.current = null;
    if (!playing) return;
    playing.stop?.();
    playing.cancel();
  }

  private bank(name: string): Howl {
    let howl = this.voiceBanks.get(name);
    if (!howl) {
      howl = new Howl({
        src: sources(`${VOICE_DIR}/${name}`),
        sprite: this.voiceIndex.banks[name],
      });
      this.voiceBanks.set(name, howl);
    }
    return howl;
  }

  private playLine(id: string): Promise<void> {
    const text = VOICE_ES[id];
    if (text === undefined) console.warn(`Unknown voice line: ${id}`);
    const bankName = bankOf(id);
    const recorded = this.voiceIndex.banks[bankName]?.[id] !== undefined;

    return new Promise((resolve) => {
      if (!recorded) {
        // Silent placeholder, about as long as the line would take to say.
        this.captionListener(text ?? id);
        const ms = this.fastPlaceholders ? 120 : 500 + (text?.length ?? 10) * 55;
        const timer = setTimeout(resolve, ms);
        this.current = {
          cancel: () => {
            clearTimeout(timer);
            resolve();
          },
        };
        this.applyMusicVolume();
        return;
      }
      this.captionListener(null);
      const howl = this.bank(bankName);
      const sound = howl.play(id);
      howl.volume(this.volumes.voice, sound);
      const done = () => resolve();
      howl.once('end', done, sound);
      howl.once('loaderror', done);
      howl.once('playerror', done, sound);
      this.current = {
        // A new prompt cuts the old one off with a short fade (§9.4).
        stop: () => {
          howl.fade(this.volumes.voice, 0, VOICE_FADE_MS, sound);
          setTimeout(() => howl.stop(sound), VOICE_FADE_MS);
        },
        cancel: done,
      };
      this.applyMusicVolume();
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const audio = new AudioManager();

/** Picks a random variant, never the same one twice in a row. */
export function variantPicker(variants: string[]): () => string {
  let last = -1;
  return () => {
    let i = Math.floor(Math.random() * variants.length);
    if (variants.length > 1 && i === last) i = (i + 1) % variants.length;
    last = i;
    return variants[i]!;
  };
}
