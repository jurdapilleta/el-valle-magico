# Decisions and deviations from GAME_DESIGN.md

Newest first. Each entry: what, why, and when it is revisited.

## Phase 3 — 2026-11-12

1. **All game items are built in code** (`src/games/scenes/items3d.tsx`): balloons, gems, doors,
   blocks, eggs and chicks, apple baskets, pearls, ice letter tiles, footprints, emotion faces,
   home dioramas and all 18 animals. The animals are parametric (four-legged, bird, fish, frog,
   turtle, plus ears, horns, tails and markings); they are recognisable but simple. §6.3 points to
   Quaternius animated animals, which would need a download and a look at how they fit the style;
   this is the first thing I would upgrade in Phase 5.
2. **One stage per zone.** Every game in a zone plays on the same cleared spot in front of the
   host, with the zone's own buildings as backdrop, instead of a bespoke set per game (castle
   balcony, barn windows, frozen pond…). A game's stage component is its items and their layout.
3. **Stage kit** (`src/games/scenes/kit.tsx`): `Choices`, `ShowRow`, `TapObjects`, `DragBoard`,
   `PairsBoard`, `Pick`, `Glyph`. Stages compose these; hints, wiggles, celebration, dragging and
   the invisible hit proxies live in the kit, answers in the engine. Adding a game is a config plus
   a stage of a few lines, as §0.4 asks.
4. **Engine step types:** `drag-to-slot`, `sequence`, `pairs` and `free-play` join `tap-all` and
   `choose-one`. A config may supply `makeRound` when "one target plus distractors" does not fit
   (patterns, comparisons, odd-one-out, card tables), `slotOf` for drag games, and a per-level
   `prompt` override. These are functions in TS config files, so configs are no longer pure JSON.
5. **Dragging follows the finger at the item's own height**, not on the ground, so dropping an item
   visually on a slot really is on it; a drop within 1.5 m of a slot snaps in (§14 asks for 25 %
   overlap; this is more generous). **Tap-tap works everywhere drag does:** tap an item, tap a slot.
6. **A mismatch in Parejas is not a mistake**: it does not count against first-try or difficulty.
   A round is a whole table of cards, so the game is two rounds rather than five.
7. **Los Animales level 1 is free play**: six animals, each says its name and sound; a round ends
   after two different animals. No right or wrong, as §10 describes.
8. **Game entrances count as waypoints.** Each game's entrance is one of its own items under a
   star; a zone has two or three plain waypoint stars plus its entrances (five to eight markers).
9. **Luna's menu** now offers the zone's least-played game plus the two least-visited neighbours
   (three buttons in the lake zone, which has two neighbours), so the way back is always on offer.
   §8.2 says two destinations.
10. **Hub and zone portals were pulled within about ±50° of straight ahead.** On a 16:9 laptop the
    outer hub portals were off-screen from where Luna starts.
11. **Mastery (§3)** is tracked per objective as the last ten rounds' first-try results, stored in
    a new `objectives` field of the save (older saves get an empty one). The parent area shows it
    as a bar with Sin empezar / Aprendiendo / Dominado.
12. **Parent gate:** hold the small top-right button for three seconds, or press Esc on a laptop,
    then add two two-digit numbers on a keypad. A wrong answer asks a new sum.
13. **Parent area:** minutes this week, stickers, the 15 objectives, known-item grids (numbers,
    colours, animals, letters), child's name (its first letter drives Letras level 1), session
    length, volumes, graphics quality, reset progress (keeps name and settings), credits.
14. **Rest (§7.6):** when the session limit is reached and Luna is out in the world (never
    mid-game) she says it is time to rest and the screen dims; a tap wakes her and the clock starts
    again. There is no music to fade yet.
15. **Idle timer uses wall-clock time**; with a clamped frame delta it stretched on slow frames.
16. **Stickers:** 16, one per game, drawn as the game's icon (three album pages). The other 44 of
    §8.4 need a rule for what replays award; still open.
17. **Animal sounds are silent placeholder lines with captions**, like all voice. For
    ¿Quién hace muu? that means the question cannot yet be answered by ear: the caption shows the
    sound as text. Real recordings (§11.4) are needed before this game means anything to her.
18. **Test aids in the shipped build:** `?fastvoice` shortens silent placeholder lines, and
    `window.__valle` exposes read-only state plus `solution()` (where the right answer is) and
    `elapse()` (advance the session clock). They do nothing unless called from the console.
19. **New voice lines:** about 230 (prompts, answers, wrong-item names, invites, intros, sticker
    names), all in `src/i18n/voice.es.ts`. The registry now has roughly 330 lines, above the
    brief's 260 estimate.

## Phase 5 — 2026-11-13

1. **Toon ramp:** one three-step gradient map shared by everything built in code, the scenery and
   the ground (§6.1 says two steps; three reads softer on the rounded shapes).
2. **No tone mapping** (`flat` canvas). The default filmic curve was shifting every colour; the
   eight learning colours now reach the screen exactly as §6.2 lists them, and the look is the same
   with and without post-processing.
3. **Bloom and vignette on the high tier only**, in a separate 69 KB chunk that other devices never
   download. Checked by eye on this Mac's GPU. The automated tests run software rendering, which
   is the low tier, so they never exercise this path.
4. **Particles:** one instanced mesh for all of them. Sparkles on the right answer, a rainbow ring
   around Luna on level up, a short confetti burst when a game is completed (alongside the
   on-screen confetti), sparkles when stepping through a portal. Fewer with reduced motion.
5. **Blob shadows** under Luna (when there are no real shadows) and under the hosts. §5.3 asks for
   drei's contact shadows on the medium tier; a disc is far cheaper and looks right at this style.
6. **Music plays through Web Audio, not a streamed element.** Loops are now gapless, and the
   whole-file fetch can be served by the offline cache; streaming makes range requests, which the
   precache cannot answer (it fails outright on Safari). Cost: one decoded loop in memory.
7. **Icons:** Luna's face on the game's sky, drawn once in `tools/assets/make_icons.mjs` and
   rendered to 192, 512, maskable 512, a 180 px Apple touch icon and an SVG favicon.
8. **First paint:** the sky and a pulsing star are inline in `index.html`, shown before any script
   loads. Zone changes keep the trotting-Luna screen from Phase 2.
9. **Back-button guard:** the page keeps one spare history entry so an accidental "back" stays in
   the game. The Capacitor "¿Quieres salir?" dialog belongs to Phase 6.
10. **Lighthouse PWA ≥ 90 cannot be measured:** Lighthouse dropped its PWA category in version 12.
    In its place, an end-to-end test checks what that score used to: a manifest with name, display
    mode, start URL and correctly sized 192/512/maskable icons; an Apple touch icon; a registered
    service worker; and a full play session with the network off.
11. **Deployed to GitHub Pages** (public repository, unlisted address) at
    https://jurdapilleta.github.io/el-valle-magico/. Every push to `main` runs lint, typecheck,
    unit tests, the build and the end-to-end suite, and deploys only if all pass (about 13 minutes).
    The first run passed. Checked on the live site from a headless browser: it starts, the music
    and effects load, no request goes to any other server, and after the cache fills it reloads
    and starts with the network off. Personal details were removed from the brief and this log
    before the first commit. Installing on a real phone has still not been tried.
12. **Not done in this phase:** KTX2 textures (there are no textures), replacing the code-built
    characters and animals with rigged models, real music and effects.

## Verified / not verified at the end of Phase 5 (2026-11-13)

- Verified: lint, typecheck, build (precache: 74 files, 14.2 MB, of which 12.2 MB is audio), 324
  unit tests. Playwright: 47 of 48 passed in the full run; the one failure was a test reading a
  momentary music level, corrected and rerun with the PWA specs.
- New end-to-end tests: installability; offline (after one online visit, with the network off:
  reload, start, walk to a zone never opened online, play a game to its sticker, change zone
  twice); no request to any other origin during a session; first load under 8 MB.
- By eye, in the app's browser on this Mac (high tier): the hub with bloom, vignette, shadows and
  the new colours, no console errors.
- Not verified: installing on a real iPhone or Android phone, airplane mode on a device, frame
  rate on a phone, iOS Safari, the medium tier's look, and everything still open from earlier
  phases (playtest, recorded voice: 0 of 393 lines).

## Phase 4 — 2026-11-13

1. **Latin American Spanish** (decided by the owner). Changed: "pegatina" → "calcomanía" (voice and
   interface), "enfadado" → "enojado" (the emotion and its item ID), perfect tense → simple past
   ("han puesto" → "pusieron", "ha perdido" → "perdió", "hemos jugado" → "jugamos"…), the letter V
   is named "ve" not "uve", and "mantener pulsado" → "mantener presionado". "¡Lo lograste!" stays.
   A unit test keeps the Spain-only words out of the script.
2. **Voices** (decided by the owner): Luna is recorded by a parent, the four hosts are generated
   with ElevenLabs. **Luna says everything heard during play** (prompts, item names, counting,
   praise, redirects, hints, sticker names): 363 lines. **Hosts say only their greeting and each of
   their games' invitation and intro**: 30 lines (Estrella 9, Tomás 9, Copo 7, Melodía 5). §7.1
   has the host praise and redirect; that would need every item line in up to four voices.
3. **393 lines, not the brief's ~260**: sixteen games each name their items, wrong answers and
   answers. `docs/voice-script.md` (generated by `npm run audio:script`) lists them by voice.
4. **Banks** (§11.2): `common`, `luna`, one per host, `items-colors/-numbers/-animals/-shapes/
-letters/-emotions`, plus two not in the brief: `games` (per-game prompts and answers) and
   `stickers`. One WebM/Opus and one AAC file per bank, with a single `index.json` of sprite
   offsets instead of a JSON per bank.
5. **Pipeline** (`tools/audio/build.ts`, run with `npm run audio`): each take is made mono 48 kHz,
   trimmed to 80 ms of silence before and 150 ms after (found with ffmpeg's silence detector), then
   given **one fixed gain to −16 LUFS** measured with the EBU R128 meter. §11.2 says "normalise";
   a fixed gain is used because dynamic normalisation pumps on one-second clips. Lines too short
   for the meter ("uno") are peak-levelled to −3 dBFS instead. Gain is capped at +24 dB.
6. **Takes live in `tools/audio/raw/` and are git-ignored** (they are a family member's voice);
   the packed sprites in `public/audio/` are what ships and what gets committed.
7. **The ElevenLabs script (`npm run audio:hosts`) has not been run**: it needs the owner's own paid
   key, which stays in his shell. It is written from the public API documentation.
8. **Animal sounds are voice lines** ("¡Muuu!"), to be imitated by whoever records Luna, not the
   real recordings of §11.4. Real ones can replace them later without code changes.
9. **Music is six synthesised 64-second placeholder loops** (`tools/audio/make_music.py`): soft
   plucked and bell tones over four-chord progressions, seamless by construction. They are clearly
   stand-ins for composed music. Streamed (HTML5 audio), so a faint gap at the loop point is
   possible with lossy codecs.
10. **Ducking:** music drops 12 dB while any voice line plays (including silent placeholders, so
    behaviour is the same before and after recording) and fades out completely for rest.
    **There is no ambience layer** (birds, farm, water): no recordings exist, so the −6 dB ambient
    duck of §9.4 has nothing to act on yet.
11. **SFX** are still synthesised placeholders, now 11 (flip, splash, crunch and step added),
    packed into one sprite. Splash, crunch and step are not triggered anywhere yet.
12. **Audio total: 12.2 MB** of the 40 MB budget, nearly all music.
13. **ffmpeg** was installed with Homebrew (agreed); the pipeline and its test need it.

## Verified / not verified at the end of Phase 4 (2026-11-13)

- Verified: lint, typecheck, build, 324 unit tests (including the pipeline run on synthetic takes:
  trimming, levelling to within 3 LU of −16, sprite offsets, both formats, `--check` failing when
  lines are missing). In a browser: with one test take in place the line played from its sprite
  for its real length with no caption while the music ducked to a quarter and recovered; the
  audio end-to-end test (music per zone, ducking, rest fade) passes.
- Playwright: the last full run was 40 passed, 2 failed (one test tapping before the zone was
  drawn); after the fix the affected specs passed (10 of 10). No single all-green run since.
- **Phase 4's own criterion is not met: 0 of 393 lines are recorded.** `npm run audio:check`
  fails until they are. No TTS exists in the game and the lint rule passes.
- Not verified: how anything sounds. I cannot listen: the placeholder music and effects have
  never been heard by a person, and nor has a real recording gone through the pipeline.
  Also not verified: the recorder page in a real browser with a microphone, the ElevenLabs script,
  audio on iOS Safari, and everything still open from earlier phases.

## Verified / not verified at the end of Phase 3 (2026-11-13)

- Verified: lint, typecheck, production build, and 315 unit tests. Per game these cover
  well-formed rounds at every level, a registered voice line for everything the game can say, the
  level table of §10, and a simulated play-through to the sticker at each level. A sightline test
  checks that, from where Luna arrives, every portal, game entrance, host and waypoint is on a
  16:9 screen and none hides another.
- Verified with Playwright (desktop, plus Pixel 7 landscape for a subset): 40 tests pass, 12 are
  skipped by design (the phone project plays four of the sixteen games). Every game is entered by
  tapping its entrance in the 3D world and played to the sticker with real taps and drags; also
  covered are a wrong answer, leaving mid-game, Luna's menu, the sticker surviving a reload, the
  parent gate (hold, wrong sum, right sum, Esc), parent settings surviving a reload, the rest
  sequence, the tour of all zones, and the idle hint. The suite takes about eight minutes.
  The last full run had one failing test (38 passed); that test was then corrected and passed
  on its own on both projects, so there has not been a single run with all 40 green together.
- Bugs the browser runs caught, now fixed: a dragged item landed behind its slot; the outer hub
  portals were off-screen on 16:9; game entrances and waypoints hid portals and each other;
  front-row memory cards caught taps meant for the back row; walking and round timers stretched
  at low frame rates.
- Known limit: line of sight is only checked from where Luna arrives. After she walks, one
  tappable thing can still stand in front of another (a test hit this in the castle).
- The suite needs a machine with free memory: on this Mac with about 55 MB free it took 2.2 hours
  and failed on timeouts. Tests run two at a time for that reason.
- Still not verified: a playtest with the child, a real phone, iOS Safari, portrait layouts, and
  anything involving recorded voice (including whether ¿Quién hace muu? works by ear).

## Phase 2 — 2026-11-12

1. **One zone is on screen at a time.** §4 describes one continuous 120 m valley that streams
   zones in as they are approached. Here each zone is its own 36 m disc; stepping through a portal
   swaps the zone, with a loading screen (Luna trotting) only if loading takes more than 250 ms.
   Neighbouring zones are prefetched as soon as a zone is ready, so measured swaps take about
   10 ms. Simpler to keep inside the budgets and impossible to get lost in; revisit if the
   playtest shows she wants to see the next place from afar.
2. **All portals sit on the far (−z) arc of their zone.** The follow camera always looks toward
   −z, so a portal behind it could never be seen or tapped. The map's compass layout (§4) is kept
   as a graph (hub ↔ castle, farm, snow forest, lake; lake ↔ unicorn meadow), not as geometry.
3. **Luna arrives in the middle of a zone, facing the player**, not beside the portal she came
   through: from there the host, the buildings and every portal are in view at once.
4. **Portals are under 3.5 m tall with the emblem inside the arch.** Anything taller than the
   camera (about 3.7 m) is cut off by the top of the screen. The emblem is a small 3D picture of
   the destination (castle tower, barn, snowman, frog on a pond, rainbow, tree), not the host's
   face as §4.2 suggests: it reads better at that size.
5. **Hosts and all zone buildings are built in code** (`src/characters/Host.tsx`,
   `src/world/zones/decor/`), like Luna in Phase 1 and for the same reasons. No new asset packs
   were downloaded: the castle, barn, snowman, rainbow and props are primitives, and the snow
   forest reuses Nature Kit pines tinted toward white. Kenney's Castle, Farm and Holiday kits
   (§6.3) remain an option for Phase 5 polish.
6. **Zones are data** (`src/world/zones/defs.ts`): radius, colours, obstacles, host, portals,
   waypoints, scenery. The navmesh is generated from the obstacle list (1 m grid), still standing
   in for Blender-baked meshes. Models moved to one shared folder, `public/models/nature/`; each
   zone loads only the ones it places. Zone decor is a lazy chunk per zone (0.6–2.4 KB each).
7. **Cuenta los Unicornios moved to Pradera de Unicornios**, its home in §10. Hosts in the other
   four zones greet when tapped (Idle / Talk / Happy); their games arrive in Phase 3.
8. **Luna's menu offers the zone's game (if any) plus the least-visited neighbouring zones**, two
   buttons in total (§8.2). Visit counts are per session.
9. **Idle behaviour:** at 20 s Luna looks at the player and says a hint; at 45 s she strolls (half
   speed) to this zone's unplayed game, else the portal on the way to the nearest zone that has
   one, else the host. After three unanswered rounds she stays quiet until the next touch, so an
   abandoned tablet does not chatter all afternoon (not in §4.2).
10. **Free-play props never move Luna** except the swing and the snowman; they react in place
    (sound plus movement). Tappable flowers, crystals and lily pads play the chime at different
    pitches. All hit proxies are invisible meshes (no draw calls).
11. **Sticker album is a book of six-slot pages** with turn arrows once there is more than one
    page. Only one sticker exists so far (one page); the other 59 come with their games.
12. **Minutes played per day** are now recorded in the save (for the Phase 3 parent area).
13. **New voice lines:** `luna.where.<zone>` ×5 and `<host>.hello` ×4, in `src/i18n/voice.es.ts`.
14. **Still open from the brief:** real rigged characters, Spanish variety, voice recordings.

## Verified / not verified at the end of Phase 2

- Verified: lint, typecheck, 99 unit tests (per zone: every waypoint, portal, host and game is
  reachable from every way in; 150 random taps each, on and off the ground, always produce a walk
  that stays on walkable ground; paths go around obstacles; budgets; idle targets), production
  build (1.9 MB), and 12 Playwright tests in desktop and Pixel 7 landscape emulation: a tour of all
  six zones with renderer-measured budgets (13–31k triangles, 28–50 draw calls) and load times
  (3–11 ms against a 3 s limit), real taps on a waypoint, a portal, a host and a prop, the 20 s
  idle hint, the full counting game, and the sticker surviving a reload.
- Not verified: the Phase 2 load-time criterion on a real Pixel 6 over Wi-Fi (measured here on a
  Mac against a local server), offline behaviour on a device, the 45 s idle stroll end to end
  (its target logic is unit-tested), portrait layout of the new zones, and everything still open
  from Phase 1 (playtest with the child, real phone, iOS Safari, recorded voice).

## Phase 1 — 2026-11-09

1. **Luna and the baby unicorns are built in code** (`src/characters/Unicorn.tsx`), not a rigged
   glTF: there is no CC0 rigged unicorn, Blender is not available in this environment, and §6.3
   bans text-to-3D. Idle, Walk and Happy are procedural. Agreed with the owner. A real model replaces
   the component behind the same props (`body`, `mane`, `getAnim`).
2. **`GameConfig.type` may be a list of steps** (`['tap-all', 'choose-one']`) and a level may
   override it. §9.3 has one `type` per game, which cannot express Cuenta los Unicornios, Los
   Huevos (two steps) or Joyas/Puertas/Los Animales (type changes by level).
3. **Voice IDs may contain `{item}`**, filled from the item key (`num.answer.{item}` →
   `num.answer.3`), and `voice.prompt` is one ID per step. §9.3 has a single prompt string.
   Extra optional voice slots: `invite`, `answer`, `wrong`, `count`.
4. **"2 incorrect within a game → level −1"** (§7.2) is read as incorrect answers accumulated since
   the last level change. The streak for levelling up also resets on any level change.
5. **Empty Leitner boxes are skipped** and the remaining 60/30/10 weights renormalised (§7.3 does
   not say). Unseen items count as box 1.
6. **Missing recordings play as silent placeholders with an on-screen caption.** The caption is a
   tester's aid (the child cannot read it and does not need to) and disappears per line as soon as
   that line has a recording. Nothing is synthesised.
7. **Rough voice files are one file per line**, `public/audio/voice/es/lines/<id>.webm`, listed in
   `lines.json` (written by `tools/audio/record.html`). Sprite-packed banks (§11.2) are Phase 4.
8. **New voice lines beyond §11.3**: `luna.count.invite`, `luna.count.intro`, `num.prompt.count`,
   `num.wrong.1–10` ("Ese es el cuatro."), `luna.where.hub`, `sticker.unicornio-menta`. All are in
   `src/i18n/voice.es.ts`. Spanish variety is still as written in the brief (open question).
9. **Models are copied, not Draco/KTX2-compressed.** The Nature Kit models are 3–31 KB each with
   no textures, so compression would save little, and Draco needs a decoder that drei fetches from
   a CDN by default (forbidden: no runtime network). Revisit when a zone has textured assets.
10. **Scenery colours are baked into vertex colours** and each model is one instanced draw call;
    unicorns are seven merged parts. Measured in the hub: about 25k triangles and 33 draw calls;
    with a counting round on stage about 31k and 49.
11. **Hub navmesh is still generated in code** (a disc with the big tree carved out). When nothing
    blocks the straight line, Luna walks straight rather than following the grid's zigzag.
12. **Cuenta los Unicornios lives in the hub** until Pradera de Unicornios exists (Phase 2).
13. **Invite times out 5 s after the greeting line ends**, not 5 s after it appears (§4.4), so a
    slow listener is not cut off. Tapping elsewhere or ↩ cancels at once.
14. **Intro demonstration** (§7.1) is the host line plus the glowing ring and arrow on the first
    unicorn; there is no animated hand cursor yet.
15. **Not in Phase 1 (deferred as planned or noted):** idle hints at 20 s / 45 s (Phase 2), the
    parent-gate button (Phase 3), music and its ducking target (Phase 4), contact shadows on the
    medium tier, the level-up rainbow ring (Phase 5).
16. **The preview tool's dev server ran from the session's old folder**, so the in-app browser check
    used a dev server started by hand; visual checks were done with headless Chromium screenshots.

## Verified / not verified at the end of Phase 1

- Verified: lint, typecheck, 45 unit tests (RoundRunner, adaptive difficulty, pickItems, round
  building, navmesh, budgets), production build, and 6 Playwright tests in desktop and Pixel 7
  landscape emulation, including a full five-round play with real taps on the 3D unicorns, one
  wrong answer, the sticker, and renderer-measured budgets.
- Not verified: "a 4-year-old completes the game unaided" (the Phase 1 acceptance test, §13), real
  phone frame rate, iOS Safari, and anything involving recorded voice (no recordings exist yet).

## Phase 0 — 2026-11-09

1. **R3F v8 / drei v9 / three 0.169.** The spec pins React 18; R3F v9 requires React 19. Revisit only
   if a needed feature is v9-only.
2. **Flat navmesh generated in code** (`src/world/navmesh.ts`) instead of a Blender-baked glTF.
   Phase 0 asks for a flat navmesh; pathfinding still goes through `three-pathfinding`. Replaced by
   `hub_navmesh.glb` in Phase 1.
3. **Test chime is a WAV** (`public/audio/sfx/chime.wav`, generated by
   `tools/assets/make_placeholders.py`), not WebM/Opus. The encode pipeline (§11.2) is Phase 4.
4. **PWA icons are generated placeholders** (same script). Real icons in Phase 5.
5. **`dist/index.html` cannot be opened from disk** (§5.4): ES modules and the service worker need
   http. Use `npm run preview` or a hosted URL.
6. **GitHub Pages deploy is written but off** until §15.4 is decided: it runs only when the
   repository variable `DEPLOY_PAGES` is `true`.
7. **Parent gate returns to `world`**, not the previous state, in the state-machine skeleton. A
   history node replaces this when the gate is built in Phase 3.
8. **Camera yaw is world-fixed** (it follows Luna's position, not her heading), so the view never
   swings when she turns. §4.3 does not specify; this is the less disorienting reading.
9. **Post-processing, `@react-spring/three`, and Capacitor are not installed yet.** Nothing in
   Phase 0 uses them; presets already carry the `bloom` flag. Added in the phases that need them.
10. **Tap feedback in Phase 0 is visual only** (pulsing ring at the target). The "pop" SFX (§8.3)
    arrives with the SFX sprite; the chime is reserved for the start gesture.

## Verified / not verified at the end of Phase 0

- Verified: lint, typecheck, 16 unit tests, production build, Playwright smoke test (start gesture →
  audio unlocked → tap → Luna walks) in desktop and Pixel 7 landscape emulation.
- Not verified: 60 fps and audible chime on a real phone (needs a device in hand), and iOS Safari
  specifically.
