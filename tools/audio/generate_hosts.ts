// Generates the four hosts' lines with ElevenLabs (GAME_DESIGN §11.1, option B)
// and saves them as takes in tools/audio/raw/voice/es/, where `npm run audio`
// picks them up. This is a build-time tool: the game itself never calls a
// network service and never synthesises speech.
//
// Run it yourself (it needs your own paid ElevenLabs key, kept out of the repo):
//
//   1. Copy tools/audio/voices.example.json to tools/audio/voices.json and put
//      in the voice ID you chose for each host (from your ElevenLabs voice library).
//   2. ELEVENLABS_API_KEY=... npm run audio:hosts
//   3. Listen to the files, delete any you dislike and run again (existing takes are kept).
//   4. npm run audio
//
// NOTE: written from the public API documentation and not run here (no key).
// Check the endpoint and model name against ElevenLabs' current docs if it fails.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { VOICE_ES } from '../../src/i18n/voice.es';
import { HOSTS, speakerOf, type Speaker } from '../../src/i18n/voiceBanks';

const OUT = 'tools/audio/raw/voice/es';
const VOICES_FILE = 'tools/audio/voices.json';
const MODEL = 'eleven_multilingual_v2';

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error('Set ELEVENLABS_API_KEY in your shell first (it is never written to disk).');
  process.exit(1);
}
if (!existsSync(VOICES_FILE)) {
  console.error(`Missing ${VOICES_FILE}: copy voices.example.json and fill in your voice IDs.`);
  process.exit(1);
}
const voices = JSON.parse(readFileSync(VOICES_FILE, 'utf8')) as Partial<Record<Speaker, string>>;
mkdirSync(OUT, { recursive: true });

const lines = Object.keys(VOICE_ES).filter((id) => HOSTS.includes(speakerOf(id)));
let made = 0;
for (const id of lines) {
  const target = join(OUT, `${id}.mp3`);
  if (existsSync(target)) continue;
  const voice = voices[speakerOf(id)];
  if (!voice || voice.startsWith('<')) {
    console.warn(`No voice ID for ${speakerOf(id)}; skipping ${id}`);
    continue;
  }
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: VOICE_ES[id], model_id: MODEL }),
  });
  if (!response.ok) {
    console.error(`${id}: ${response.status} ${await response.text()}`);
    process.exit(1);
  }
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  made++;
  console.log(`${id}  "${VOICE_ES[id]}"`);
}
console.log(`${made} new takes written to ${OUT} (${lines.length} host lines in total).`);
