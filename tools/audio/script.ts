// Writes docs/voice-script.md: every voice line, grouped by who says it and by
// bank, for whoever records or generates the voice (GAME_DESIGN §11.3).
// Run from the repo root: npm run audio:script
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { VOICE_ES } from '../../src/i18n/voice.es';
import { bankOf, speakerOf, SPEAKER_NAMES, type Speaker } from '../../src/i18n/voiceBanks';

const RAW = 'tools/audio/raw/voice/es';
const recorded = new Set(
  existsSync(RAW) ? readdirSync(RAW).map((name) => basename(name, extname(name))) : [],
);

const ids = Object.keys(VOICE_ES);
const speakers = Object.keys(SPEAKER_NAMES) as Speaker[];
const lines: string[] = [
  '# Guion de voces — El Valle Mágico',
  '',
  'Generado por `npm run audio:script` a partir de `src/i18n/voice.es.ts`. No editar a mano:',
  'cambia el texto en ese archivo y vuelve a generar.',
  '',
  `Total: ${ids.length} frases. Grabadas: ${ids.filter((id) => recorded.has(id)).length}.`,
  '',
  'Cómo decirlas: voz cálida y tranquila, frases cortas, sonriendo. Luna habla como una hermana',
  'mayor que anima. Los sonidos de animales se imitan con la voz.',
  '',
];

for (const speaker of speakers) {
  const mine = ids.filter((id) => speakerOf(id) === speaker);
  if (mine.length === 0) continue;
  const done = mine.filter((id) => recorded.has(id)).length;
  lines.push(`## ${SPEAKER_NAMES[speaker]} — ${mine.length} frases (${done} grabadas)`, '');
  const banks = [...new Set(mine.map(bankOf))];
  for (const bank of banks) {
    lines.push(`### ${bank}`, '', '| ✔ | ID | Frase |', '|---|---|---|');
    for (const id of mine.filter((line) => bankOf(line) === bank)) {
      lines.push(`| ${recorded.has(id) ? '✔' : ' '} | \`${id}\` | ${VOICE_ES[id]} |`);
    }
    lines.push('');
  }
}

writeFileSync('docs/voice-script.md', lines.join('\n'));
console.log(`docs/voice-script.md: ${ids.length} lines`);
