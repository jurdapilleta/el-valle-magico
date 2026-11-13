# El Valle Mágico

A calm 3D learning game for one 3–4-year-old. The full brief is [GAME_DESIGN.md](GAME_DESIGN.md);
deviations are logged in [docs/DECISIONS.md](docs/DECISIONS.md). Current state: **Phase 5
(all 16 games, polish and offline PWA done; voice not recorded, not yet deployed)**.

## Run

```bash
npm install
npm run dev        # http://localhost:5173, also served on your LAN
```

Add `?perf` to the dev URL for the frame-rate overlay.

## On a phone

Phone and laptop on the same Wi-Fi, then open the `Network:` URL that `npm run dev` prints
(`http://<laptop-ip>:5173`). Tap the star, then tap the grass.

Installing as an app ("Add to Home Screen") and offline use need https, so they only work from a
hosted build (GitHub Pages, see §15.4 of the brief), not from the LAN address.

## Voice, music and sound effects

Until a line is recorded it plays silently with a caption. The full script, by voice, is in
[docs/voice-script.md](docs/voice-script.md).

- **Luna (a parent's voice, 363 lines).** Run `npm run dev`, open
  `http://localhost:5173/tools/audio/record.html` in Chrome or Edge, choose the folder
  `tools/audio/raw/voice/es` and record. Pick "Solo las que faltan" to do it in sittings.
- **The four hosts (30 lines, ElevenLabs).** Copy `tools/audio/voices.example.json` to
  `tools/audio/voices.json`, fill in your voice IDs, then run
  `ELEVENLABS_API_KEY=... npm run audio:hosts`.
- **Build.** `npm run audio` cleans, levels and packs every take into `public/audio/`; reload
  the game to hear them. `npm run audio:check` fails while any line is missing.
- **Placeholders.** `npm run audio:placeholders` regenerates the synthesised effects and music
  into `tools/audio/raw/`; replace any WAV there with a real one of the same name.

The pipeline needs ffmpeg (`brew install ffmpeg`).

## Assets

Models come from the Kenney Nature Kit (CC0). The pack is not committed: download it from
https://kenney.nl/assets/nature-kit, unzip to `tools/assets/raw/nature-kit/`, then `npm run assets`
copies the models in use to `public/models/` and rewrites the budget manifest.

## Check

```bash
npm run lint
npm run typecheck
npm test           # Vitest unit tests
npm run test:e2e   # Playwright smoke test (first time: npx playwright install chromium)
npm run build && npm run preview
```
