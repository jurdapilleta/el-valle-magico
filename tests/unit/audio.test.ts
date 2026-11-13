import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VOICE_ES } from '../../src/i18n/voice.es';
import { bankOf, HOSTS, packSprite, speakerOf } from '../../src/i18n/voiceBanks';
import { ZONE_IDS } from '../../src/world/zones/defs';

const root = join(__dirname, '..', '..');
const ids = Object.keys(VOICE_ES);

describe('voice banks', () => {
  it('gives every line a speaker and a bank', () => {
    for (const id of ids) {
      expect(speakerOf(id), id).toBeTruthy();
      expect(bankOf(id), id).toMatch(/^[a-z-]+$/);
    }
  });

  it('hosts speak only their own greeting, invitations and intros; Luna says the rest', () => {
    for (const host of HOSTS) {
      const lines = ids.filter((id) => speakerOf(id) === host);
      expect(lines.length, host).toBeGreaterThan(0);
      for (const id of lines)
        expect(id).toMatch(new RegExp(`^${host}\\.(hello|\\w+\\.(invite|intro))$`));
      // A host's bank holds exactly that host's lines.
      expect(ids.filter((id) => bankOf(id) === host).sort()).toEqual([...lines].sort());
    }
    expect(speakerOf('castle.balloons.prompt.rosa')).toBe('luna');
    expect(speakerOf('common.praise.1')).toBe('luna');
  });

  it('uses the banks named in §11.2', () => {
    expect(bankOf('item.color.rojo')).toBe('items-colors');
    expect(bankOf('item.num.7')).toBe('items-numbers');
    expect(bankOf('item.animal.vaca.sound')).toBe('items-animals');
    expect(bankOf('item.shape.estrella')).toBe('items-shapes');
    expect(bankOf('item.letter.a.sound')).toBe('items-letters');
    expect(bankOf('item.emotion.triste')).toBe('items-emotions');
    expect(bankOf('common.hint.look')).toBe('common');
    expect(bankOf('luna.count.intro')).toBe('luna');
  });

  it('lays clips out one after another with a gap', () => {
    expect(
      packSprite(
        [
          { id: 'a', ms: 1000 },
          { id: 'b', ms: 500 },
          { id: 'c', ms: 250 },
        ],
        200,
      ),
    ).toEqual({ a: [0, 1000], b: [1200, 500], c: [1900, 250] });
  });

  it('has no line the Latin American script should not contain', () => {
    const text = Object.values(VOICE_ES).join(' ').toLowerCase();
    for (const word of ['pegatina', 'enfadad', ' habéis', ' vosotr', ' hemos ']) {
      expect(text, word).not.toContain(word);
    }
  });
});

describe('shipped audio', () => {
  const audio = join(root, 'public/audio');

  it('has the SFX sprite with every effect the game plays', () => {
    const sprite = JSON.parse(readFileSync(join(audio, 'sfx/sfx.json'), 'utf8')) as Record<
      string,
      number[]
    >;
    for (const id of [
      'chime',
      'pop',
      'boing',
      'arpeggio',
      'fanfare',
      'sparkle',
      'sticker',
      'flip',
    ]) {
      expect(sprite[id], id).toHaveLength(2);
    }
    for (const ext of ['webm', 'm4a']) expect(existsSync(join(audio, `sfx/sfx.${ext}`))).toBe(true);
  });

  it('has a music loop for the hub and each zone, in both formats', () => {
    for (const zone of ZONE_IDS) {
      for (const ext of ['webm', 'm4a']) {
        const file = join(audio, `music/${zone}.${ext}`);
        expect(existsSync(file), file).toBe(true);
        // Streamed loops, each well under the 6 MB zone budget.
        expect(statSync(file).size).toBeLessThan(3 * 1024 * 1024);
      }
    }
  });

  it('has a voice index whose every entry is a known line in the right bank', () => {
    const index = JSON.parse(readFileSync(join(audio, 'voice/es/index.json'), 'utf8')) as {
      banks: Record<string, Record<string, [number, number]>>;
    };
    for (const [bank, sprite] of Object.entries(index.banks)) {
      for (const id of Object.keys(sprite)) {
        expect(VOICE_ES[id], id).toBeDefined();
        expect(bankOf(id)).toBe(bank);
      }
      for (const ext of ['webm', 'm4a']) {
        expect(existsSync(join(audio, `voice/es/${bank}.${ext}`)), bank).toBe(true);
      }
    }
  });
});

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

describe.skipIf(!hasFfmpeg)('audio pipeline', () => {
  it('trims, levels and packs takes into per-bank sprites', () => {
    const work = mkdtempSync(join(tmpdir(), 'valle-test-'));
    const raw = join(work, 'raw/voice/es');
    const out = join(work, 'out');
    mkdirSync(raw, { recursive: true });
    // One second of quiet tone (about 13 dB under target) with half a second of silence either side.
    const take = (id: string, format: string) =>
      execFileSync('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:duration=1',
        '-af',
        'volume=0.5,adelay=500,apad=pad_dur=0.5',
        join(raw, `${id}.${format}`),
      ]);
    take('common.praise.1', 'wav');
    take('common.praise.2', 'mp3');
    take('tomas.hello', 'wav');
    take('not.a.real.line', 'wav');

    const result = spawnSync(
      'npx',
      ['vite-node', 'tools/audio/build.ts', '--', '--raw', join(work, 'raw'), '--out', out],
      { cwd: root, encoding: 'utf8' },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(`Voice lines: 3 of ${ids.length} recorded`);
    expect(result.stderr).toContain('not.a.real.line');

    const index = JSON.parse(readFileSync(join(out, 'voice/es/index.json'), 'utf8')) as {
      banks: Record<string, Record<string, [number, number]>>;
    };
    expect(Object.keys(index.banks).sort()).toEqual(['common', 'tomas']);
    const [first, second] = [
      index.banks.common!['common.praise.1']!,
      index.banks.common!['common.praise.2']!,
    ];
    // 1 s of sound plus the 80 ms and 150 ms of silence the brief keeps.
    for (const [, ms] of [first, second]) {
      expect(ms).toBeGreaterThan(1100);
      expect(ms).toBeLessThan(1450);
    }
    expect(second[0]).toBe(first[0] + first[1] + 250);
    expect(readdirSync(join(out, 'voice/es')).sort()).toEqual([
      'common.m4a',
      'common.webm',
      'index.json',
      'tomas.m4a',
      'tomas.webm',
    ]);

    // Levelled: the quiet take comes out near −16 LUFS.
    const measured = spawnSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-nostats',
        '-i',
        join(out, 'voice/es/tomas.webm'),
        '-af',
        'ebur128',
        '-f',
        'null',
        '-',
      ],
      { encoding: 'utf8' },
    ).stderr;
    const lufs = Number([...measured.matchAll(/\bI:\s+(-?[\d.]+) LUFS/g)].at(-1)![1]);
    expect(lufs).toBeGreaterThan(-19);
    expect(lufs).toBeLessThan(-13);

    // --check fails while lines are missing.
    const strict = spawnSync(
      'npx',
      [
        'vite-node',
        'tools/audio/build.ts',
        '--',
        '--raw',
        join(work, 'raw'),
        '--out',
        out,
        '--check',
      ],
      { cwd: root, encoding: 'utf8' },
    );
    expect(strict.status).toBe(1);
    rmSync(work, { recursive: true, force: true });
  }, 120_000);
});
