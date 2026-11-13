// Audio pipeline (GAME_DESIGN §11.2). Run from the repo root:
//
//   npm run audio            build everything that has source material
//   npm run audio:check      same, and fail if any voice line is still missing
//
// Sources (tools/audio/raw/, not shipped):
//   voice/es/<line id>.<webm|wav|mp3|m4a|ogg>   one take per line
//   sfx/<name>.wav                               sound effects
//   music/<zone>.wav                             one loop per zone
//
// Output (public/audio/, shipped):
//   voice/es/<bank>.webm + .m4a, voice/es/index.json   Howler sprites per bank
//   sfx/sfx.webm + .m4a, sfx/sfx.json                  one SFX sprite
//   music/<zone>.webm + .m4a                           streamed loops
//
// Needs ffmpeg and ffprobe on the PATH (brew install ffmpeg).
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { VOICE_ES } from '../../src/i18n/voice.es';
import {
  bankOf,
  packSprite,
  speakerOf,
  SPEAKER_NAMES,
  type Speaker,
} from '../../src/i18n/voiceBanks';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const check = args.includes('--check');
const RAW = flag('--raw') ?? 'tools/audio/raw';
const OUT = flag('--out') ?? 'public/audio';

const TARGET_LUFS = -16;
const HEAD_SILENCE = 0.08;
const TAIL_SILENCE = 0.15;
const VOICE_GAP_MS = 250;
const SFX_GAP_MS = 120;
const TAKE_EXTENSIONS = ['.webm', '.wav', '.mp3', '.m4a', '.ogg'];

const ffmpeg = (...argv: string[]) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

function seconds(file: string): number {
  const out = execFileSync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    file,
  ]);
  return Number(String(out).trim());
}

/**
 * Integrated loudness of a clip in LUFS (EBU R128), or null when the clip is
 * too short or too quiet for the meter to give a reading.
 */
function loudness(file: string): number | null {
  // ffmpeg prints the meter's summary on stderr.
  const log = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'],
    { encoding: 'utf8' },
  ).stderr;
  const readings = [...log.matchAll(/\bI:\s+(-?[\d.]+) LUFS/g)];
  const last = readings[readings.length - 1];
  const value = last ? Number(last[1]) : NaN;
  return Number.isFinite(value) && value > -60 ? value : null;
}

/** Peak level in dBFS, the fallback measure for clips the loudness meter cannot read. */
function peak(file: string): number {
  const log = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'],
    { encoding: 'utf8' },
  ).stderr;
  const match = /max_volume: (-?[\d.]+) dB/.exec(log);
  return match ? Number(match[1]) : 0;
}

/**
 * One take → clean mono 48 kHz WAV: silence trimmed to 80 ms before and
 * 150 ms after, then one fixed gain to reach −16 LUFS (a plain gain rather
 * than dynamic normalisation, which pumps on clips this short), with a
 * limiter as a safety net.
 */
function cleanTake(source: string, target: string, work: string): void {
  const mono = join(work, 'mono.wav');
  const trimmed = join(work, 'trimmed.wav');
  ffmpeg('-i', source, '-ac', '1', '-ar', '48000', mono);

  // Find the silence at each end, then cut leaving a little of it.
  const total = seconds(mono);
  const log = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-nostats',
      '-i',
      mono,
      '-af',
      'silencedetect=noise=-45dB:d=0.05',
      '-f',
      'null',
      '-',
    ],
    { encoding: 'utf8' },
  ).stderr;
  const starts = [...log.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/silence_end: (-?[\d.]+)/g)].map((m) => Number(m[1]));
  const head = starts[0] !== undefined && starts[0] <= 0.02 ? (ends[0] ?? 0) : 0;
  const lastStart = starts[starts.length - 1];
  // Trailing silence runs to the end of the file (its end is at, or missing before, EOF).
  const trailing =
    lastStart !== undefined &&
    lastStart > head &&
    (ends.length < starts.length || ends[ends.length - 1]! >= total - 0.02);
  const from = Math.max(0, head - HEAD_SILENCE);
  const to = Math.min(total, (trailing ? lastStart : total) + TAIL_SILENCE);
  ffmpeg('-i', mono, '-ss', from.toFixed(3), '-to', to.toFixed(3), trimmed);

  const measured = loudness(trimmed);
  // Very short lines ("uno") have no loudness reading: bring their peak to −3 dBFS instead.
  const wanted = measured === null ? -3 - peak(trimmed) : TARGET_LUFS - measured;
  const gain = Math.max(-20, Math.min(24, wanted));
  ffmpeg(
    '-i',
    trimmed,
    '-af',
    `volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=false`,
    target,
  );
}

/** Joins clips (each followed by a gap of silence) into one WAV; returns the sprite map in ms. */
function joinClips(
  clips: { id: string; file: string }[],
  target: string,
  gapMs: number,
  work: string,
) {
  const padded = clips.map((clip, i) => {
    const file = join(work, `pad-${i}.wav`);
    ffmpeg('-i', clip.file, '-af', `apad=pad_dur=${gapMs / 1000}`, file);
    return file;
  });
  const list = join(work, 'list.txt');
  writeFileSync(list, padded.map((file) => `file '${file}'`).join('\n'));
  ffmpeg('-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', target);
  return packSprite(
    clips.map((clip) => ({ id: clip.id, ms: Math.round(seconds(clip.file) * 1000) })),
    gapMs,
  );
}

/** WebM/Opus for most browsers plus AAC for older Safari (§11.2). */
function encode(wav: string, target: string, kbps: number, channels: 1 | 2): void {
  const common = ['-i', wav, '-ac', String(channels)];
  ffmpeg(...common, '-c:a', 'libopus', '-b:a', `${kbps}k`, `${target}.webm`);
  ffmpeg(...common, '-c:a', 'aac', '-b:a', `${kbps}k`, '-movflags', '+faststart', `${target}.m4a`);
}

function clearDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function folderBytes(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
    const path = join(dir, entry.name);
    return sum + (entry.isDirectory() ? folderBytes(path) : statSync(path).size);
  }, 0);
}

const work = mkdtempSync(join(tmpdir(), 'valle-audio-'));

// ---- Voice: one sprite per bank ----

const voiceRaw = join(RAW, 'voice/es');
const takes = new Map<string, string>();
if (existsSync(voiceRaw)) {
  for (const name of readdirSync(voiceRaw)) {
    const ext = extname(name).toLowerCase();
    if (TAKE_EXTENSIONS.includes(ext))
      takes.set(basename(name, extname(name)), join(voiceRaw, name));
  }
}
const ids = Object.keys(VOICE_ES);
const unknown = [...takes.keys()].filter((id) => !(id in VOICE_ES));
if (unknown.length > 0) console.warn(`Ignoring takes that match no line: ${unknown.join(', ')}`);

const voiceOut = join(OUT, 'voice/es');
clearDir(voiceOut);
const byBank = new Map<string, { id: string; file: string }[]>();
for (const id of ids) {
  const source = takes.get(id);
  if (!source) continue;
  const clean = join(work, `${id}.wav`);
  cleanTake(source, clean, work);
  const bank = bankOf(id);
  byBank.set(bank, [...(byBank.get(bank) ?? []), { id, file: clean }]);
}
const banks: Record<string, Record<string, [number, number]>> = {};
for (const [bank, clips] of byBank) {
  const wav = join(work, `bank-${bank}.wav`);
  banks[bank] = joinClips(clips, wav, VOICE_GAP_MS, work);
  encode(wav, join(voiceOut, bank), 64, 1);
}
writeFileSync(join(voiceOut, 'index.json'), JSON.stringify({ banks }) + '\n');

// ---- Sound effects: one sprite ----

const sfxRaw = join(RAW, 'sfx');
const sfxOut = join(OUT, 'sfx');
clearDir(sfxOut);
const sfxClips = existsSync(sfxRaw)
  ? readdirSync(sfxRaw)
      .filter((name) => name.endsWith('.wav'))
      .sort()
      .map((name) => ({ id: basename(name, '.wav'), file: join(sfxRaw, name) }))
  : [];
if (sfxClips.length > 0) {
  const wav = join(work, 'sfx.wav');
  const mono = sfxClips.map((clip) => {
    const file = join(work, `sfx-${clip.id}.wav`);
    ffmpeg('-i', clip.file, '-ac', '1', '-ar', '48000', file);
    return { id: clip.id, file };
  });
  const sprite = joinClips(mono, wav, SFX_GAP_MS, work);
  encode(wav, join(sfxOut, 'sfx'), 64, 1);
  writeFileSync(join(sfxOut, 'sfx.json'), JSON.stringify(sprite) + '\n');
}

// ---- Music: one streamed loop per zone ----

const musicRaw = join(RAW, 'music');
const musicOut = join(OUT, 'music');
clearDir(musicOut);
const loops = existsSync(musicRaw) ? readdirSync(musicRaw).filter((n) => n.endsWith('.wav')) : [];
for (const name of loops)
  encode(join(musicRaw, name), join(musicOut, basename(name, '.wav')), 96, 2);

rmSync(work, { recursive: true, force: true });

// ---- Report ----

const speakers = Object.keys(SPEAKER_NAMES) as Speaker[];
const missing = ids.filter((id) => !takes.has(id));
console.log(`Voice lines: ${ids.length - missing.length} of ${ids.length} recorded`);
for (const speaker of speakers) {
  const all = ids.filter((id) => speakerOf(id) === speaker);
  const done = all.filter((id) => takes.has(id));
  console.log(`  ${SPEAKER_NAMES[speaker].padEnd(28)} ${done.length} / ${all.length}`);
}
console.log(`Sound effects: ${sfxClips.length}   Music loops: ${loops.length}`);
const megabytes = folderBytes(OUT) / 1024 / 1024;
console.log(`Total audio: ${megabytes.toFixed(1)} MB (budget 40 MB)`);

if (megabytes > 40) {
  console.error('Audio is over the 40 MB budget (§5.3).');
  process.exit(1);
}
if (check && missing.length > 0) {
  console.error(`\n${missing.length} voice lines have no recording yet, for example:`);
  for (const id of missing.slice(0, 8)) console.error(`  ${id}  "${VOICE_ES[id]}"`);
  console.error('See docs/voice-script.md for the full list.');
  process.exit(1);
}
