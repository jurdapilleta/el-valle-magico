# El Valle Mágico — Game Design & Technical Specification

**Version:** 1.0 · **Date:** 2026-11-09 · **Target player:** children aged 3–4, Spanish-speaking
**Purpose of this document:** complete brief for Claude Code to design, build and ship the game. Read it fully before writing code. Where it says MUST, do not deviate without asking.

---

## 0. How to use this document with Claude Code

1. Put this file at the repo root as `GAME_DESIGN.md`.
2. First prompt: *"Read GAME_DESIGN.md completely. Summarise the architecture back to me in 15 lines, list anything ambiguous, then implement Phase 0 (section 12) and stop."*
3. Work phase by phase. Each phase has acceptance criteria; do not start the next until they pass.
4. Every mini-game is data-driven (section 9). Adding a game = adding a config + one scene component, never touching the core loop.
5. Keep `docs/DECISIONS.md` updated with every deviation from this spec.

---

## 1. Vision

A calm, beautiful, stylised **3D world** a 3–4-year-old explores by **tapping where she wants to go**. A friendly unicorn companion (**Luna**) walks with her, talks to her in natural Spanish, and invites her into short learning games hidden around the valley: counting, colours, shapes, animals, sizes, first letters, and emotions.

What it is **not**:
- Not a free-roam 3D game with a joystick or camera stick. Toddlers cannot operate dual-axis controls; they get stuck facing a wall and quit. Immersion comes from *being in a place*, not from steering.
- Not an app with text, menus, timers, lives, scores, or "wrong" buzzers.
- Not a Disney game. All characters, names and designs are **original** (see §6.4). No Mickey, Frozen, or Disney princess likenesses, names, songs or colour-schemes.

Design pillars (in priority order):
1. **Zero reading, zero fail.** Every element is spoken; mistakes produce a gentle redirect, never a penalty.
2. **One finger.** Tap, and occasionally drag-and-drop with huge targets. Nothing else.
3. **Real voice.** Pre-recorded human-quality Spanish audio. No browser text-to-speech.
4. **Real 3D.** glTF models, animated characters, soft lighting, pastel palette — the look of a modern preschool game, not emoji.
5. **Didactic by design.** Each game has an explicit learning objective, a scaffold, adaptive difficulty and a parent-visible progress view.

---

## 2. The player (design constraints that come from age 3–4)

| Capability at 3–4 | Design consequence |
|---|---|
| Fine motor: taps are imprecise, often with the whole hand | Hit targets ≥ 96 px (≥ 120 px preferred). Nothing important near screen edges. Ignore multi-touch (use the first touch only). |
| Cannot read | No instructions in text. Icons + voice always. Decorative text only (e.g., the number "3" while the voice says "tres"). |
| Attention span 5–10 min per activity | Each mini-game round ≤ 20 s; a full game ≤ 3 min; natural stopping points every 3 min. |
| Does not understand "wrong" as information | Incorrect tap → the item wiggles, Luna says "Mmm, ese no… busca el rosa", target item glows. Never a red X or buzzer. |
| Needs repetition | Same game is replayable with re-randomised content; learning content cycles through a spaced-repetition list (§7.3). |
| Easily overstimulated | Max one moving distraction on screen during a question. Celebrations are 2 s, not 10. Soft music at −18 dB under voice. |
| Will tap everything | Every tappable thing in the world reacts (sound + animation). Nothing silently ignores a tap. |
| Cannot navigate menus | No main menu. Boot straight into the valley. Home = tap Luna. Parent settings behind a parent gate (§8.6). |
| Loses orientation in 3D | Camera is on rails (§5.3). Player can never be lost: Luna always walks to the nearest point of interest if idle for 20 s. |

---

## 3. Learning objectives (curriculum)

Mapped loosely to Spanish early-years (Educación Infantil 3–4) expectations. Each objective has a code used in game configs and progress tracking.

| Code | Objective | Spanish vocabulary covered |
|---|---|---|
| NUM-1 | Rote counting 1–5, then 1–10 | uno…diez |
| NUM-2 | One-to-one correspondence (count objects by touching each once) | "¿cuántos hay?" |
| NUM-3 | Recognise numerals 1–5 (later 1–10) | el número tres |
| NUM-4 | Compare quantities: más / menos / igual | más, menos, igual |
| COL-1 | Identify 8 colours | rojo, azul, amarillo, verde, rosa, morado, naranja, blanco |
| COL-2 | Match same colours | "el mismo color" |
| SHP-1 | Identify 5 shapes | círculo, cuadrado, triángulo, estrella, corazón |
| SHP-2 | Fit shapes into matching holes | — |
| SIZ-1 | Big / small; later ordering 3 sizes | grande, pequeño, mediano |
| ANI-1 | Name 18 animals and their sounds | vaca/muu, etc. |
| ANI-2 | Classify: farm / forest / water | granja, bosque, agua |
| MEM-1 | Visual memory (pairs 3→6) | "iguales" |
| LOG-1 | Odd-one-out | "diferente" |
| LOG-2 | Simple 2-step patterns (rojo-azul-rojo-?) | "¿qué sigue?" |
| LET-1 | Recognise the first letter of her own name (configurable) and vowels | letras, "suena…" |
| EMO-1 | Name 4 emotions on faces | contento, triste, enfadado, sorprendido |
| LIF-1 | Daily routine sequencing (3 pictures) | primero, después, al final |
| MUS-1 | Rhythm & pitch play (no right/wrong) | — |

Progression rule: a child is "learning" an objective until she reaches 80 % correct-first-try over the last 10 attempts, then it becomes "mastered" and appears less often (§7.3).

---

## 4. World design — "El Valle Mágico"

One continuous low-poly valley, ~120 × 120 m, loaded as a hub plus five zones that stream in when approached.

```
                 [Bosque Nevado]  (snow forest — letters, patterns)
                        |
 [La Granja] ---- [Pradera Central] ---- [Castillo de Estrella]
 (farm — animals)   (hub, Luna's home)   (castle — colours, shapes, sizes)
                        |
                [Lago del Arcoíris]  (lake — music, emotions, memory)
                        |
              [Pradera de Unicornios] (meadow — counting, more/less)
```

### 4.1 Zones

| Zone | Mood / palette | Host character | Mini-games | Ambient audio |
|---|---|---|---|---|
| **Pradera Central** (hub) | Spring meadow, warm pastels, big friendly tree with a swing | Luna (unicorn) | — (free play: tap flowers → they bloom and chime; tap butterflies; push the swing) | Birds, soft harp loop |
| **Castillo de Estrella** | Pink/lavender castle, flags, balloons | Princesa Estrella | Globos (COL), Joyas (SHP), Puertas (SIZ), Torre de Bloques (SIZ/NUM) | Music box loop |
| **La Granja** | Red barn, hay, pond | Granjero Tomás (bear) | Animales (ANI-1), ¿Quién hace…? (ANI-1), Hogar de los Animales (ANI-2), Huevos (NUM-2) | Farm ambience |
| **Pradera de Unicornios** | Rainbow mist, clover | Baby unicorns (Nube, Chispa, Brisa) | Cuenta Unicornios (NUM-1/2/3), ¿Dónde hay más? (NUM-4), Collar de Perlas (LOG-2) | Chimes, wind |
| **Bosque Nevado** | Snow, ice crystals, aurora (generic winter kingdom — **not** a Frozen reference; no ice queen, no "let it go" motifs) | Zorro Copo (fox) | Letras de Hielo (LET-1), ¿Qué sigue? (LOG-2), Huellas (LOG-1) | Snow crunch, celesta |
| **Lago del Arcoíris** | Lake at golden hour, lily pads | Rana Melodía (frog) | Parejas (MEM-1), Caras (EMO-1), Nenúfares Musicales (MUS-1), Mi Día (LIF-1) | Water, soft marimba |

### 4.2 Navigation (MUST)

- **Tap-to-go.** The player taps a glowing *waypoint* (large floating star or footprint marker) or a tappable object; Luna (with the camera) walks there along a navmesh path. 5–8 waypoints per zone.
- **Zone portals** are big arches/gates with an icon of the zone's host; tapping walks there and streams the zone.
- **Limited look-around**: drag horizontally rotates the camera ±35° around Luna, spring-returns on release. No vertical control. No zoom. No pinch.
- **No virtual joystick, no WASD, no first-person.** Keyboard arrows on laptop are accepted as an *optional* hidden input (parent may use them) but nothing depends on them.
- **Idle behaviour**: after 20 s idle, Luna looks at the camera and says a hint ("¿Vamos al castillo?"); after 45 s she walks slowly toward the nearest unplayed mini-game.
- **Never blocked**: Luna cannot fall off, get stuck, or enter water. Collision uses the navmesh only.

### 4.3 Camera (MUST)

- Third-person follow, pitched ~25° down, distance 6 m, smooth-damped (0.35 s).
- Inside a mini-game, camera tweens (1 s) to a fixed, framed "stage" position and locks. Exiting tweens back.
- Portrait and landscape both supported; in portrait the camera backs up 20 % and the UI anchors to the bottom.

### 4.4 Entering / leaving a mini-game

1. Player taps a host character or the glowing game object → host greets ("¡Hola! ¿Jugamos a contar?") with a big ✔/▶ button and a ↩ button. Tapping anywhere else cancels after 5 s.
2. Camera tweens to stage; 3D props animate in; host explains with voice + demonstration (first time) or short reminder (later).
3. Rounds play (§7). Exit any time by tapping Luna (bottom-left, always visible).
4. Completion: 2 s celebration (confetti particles, host dance, "¡Lo lograste!"), a sticker drops into the album (§8.4), camera returns.

---

## 5. Technology

### 5.1 Decision: web-first 3D (React Three Fiber) packaged as PWA, with Capacitor for store apps later

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Three.js via React Three Fiber (R3F) + Vite + TypeScript** | One codebase runs on laptop (any browser, offline PWA) and phone (PWA → Capacitor → App Store/Play Store); huge ecosystem (drei, rapier, postprocessing); Claude Code is very strong in TS/React; assets are plain glTF; trivial to deploy (static files) | Mobile GPU budget must be respected; no visual editor | **Chosen** |
| Godot 4 | Real editor, excellent 2D/3D, exports web + mobile | Web export is heavy (~30 MB+, slow iOS load, audio quirks); GDScript iteration via Claude Code is weaker; harder for the parent to run/debug | Fallback if R3F perf is insufficient |
| Unity | Industry standard | Overkill, licensing, large builds, slow iteration | Rejected |
| 2D only (Pixi/Phaser) | Easy, fast | Does not meet the "immersive 3D" requirement | Rejected |

### 5.2 Stack (MUST)

- **Vite 5+, TypeScript strict, React 18, @react-three/fiber, @react-three/drei, three**
- **Animation**: drei `useAnimations` for glTF clips; `@react-spring/three` or `maath` for tweens
- **Navigation**: `three-pathfinding` (navmesh baked in Blender, exported as glTF) — do not write your own A*
- **Physics**: none required (no physics for v1). If needed later: `@react-three/rapier`
- **Post-processing**: `@react-three/postprocessing` — Bloom (low) + Vignette only; disabled automatically on low-tier devices
- **Audio**: **Howler.js** (sprite sheets for SFX, streamed loops for music, one `Howl` per voice bank). No `SpeechSynthesis` anywhere in the codebase (lint rule: ban the identifier).
- **State**: Zustand (game state) + XState (scene state machine, §9.2)
- **Persistence**: `idb-keyval` (IndexedDB) with in-memory fallback
- **PWA**: `vite-plugin-pwa` (Workbox, precache all assets, offline-first)
- **Mobile wrap (Phase 6)**: Capacitor 6 → iOS/Android, with `@capacitor/haptics`, `@capacitor/screen-orientation`, `@capacitor/status-bar`
- **Tooling**: ESLint + Prettier, Vitest for logic (game configs, adaptive difficulty, spaced repetition), Playwright for smoke tests, GitHub Actions (lint, test, build, deploy to GitHub Pages)

### 5.3 Performance budgets (MUST)

| Metric | Budget | How enforced |
|---|---|---|
| Frame rate | 60 fps on iPhone 12 / Pixel 6; 30 fps minimum on iPhone SE 2 / low Android | `r3f-perf` in dev; device-tier detection at boot (GPU renderer string + `deviceMemory`) → quality preset |
| Triangles on screen | ≤ 150 k (hub), ≤ 100 k (zone + game) | Per-zone budget check in a Vitest test that parses glTF stats |
| Draw calls | ≤ 120 | Merge static geometry; instancing for flowers/grass/trees (drei `<Instances>`) |
| Textures | ≤ 2048² atlases, KTX2/Basis compressed; total GPU texture memory ≤ 128 MB | `gltf-transform` pipeline step |
| Initial load | ≤ 8 MB before first interactive frame; zones lazy-loaded (≤ 6 MB each) | Vite chunking + `<Suspense>` per zone; loading screen is Luna walking in place |
| Lights | 1 directional (with shadow map 1024, low tier: none) + 1 hemisphere + baked AO in textures | — |
| Shadows | Contact shadows (drei) for characters; no dynamic shadows on low tier | Quality preset |
| Audio | Voice: Opus/AAC 64 kbps mono; music 96 kbps stereo; total audio ≤ 40 MB | Pipeline script |

Quality presets: `high` (bloom, shadows, 1.0 DPR cap 2), `medium` (no bloom, contact shadows, DPR cap 1.5), `low` (no post, no shadows, DPR 1, half instancing density).

### 5.4 Platform behaviour

- **Laptop**: open `index.html` from the built `dist/` (or `npm run preview`), or the GitHub Pages URL. Fullscreen button (parent gate not required). Mouse click = tap. Keyboard ignored except arrows (optional) and `Esc` (parent gate).
- **Phone (PWA)**: "Add to Home Screen" → standalone, landscape-preferred but portrait works. Prevent pinch zoom, pull-to-refresh, long-press callouts, text selection.
- **Phone (Capacitor)**: identical web build inside a WebView; adds haptics and orientation lock. Store publishing is Phase 6 and optional.
- **Offline**: everything works offline after first load. No network calls at runtime at all (no analytics, no ads, no accounts — COPPA/GDPR-K by construction).

---

## 6. Art direction

### 6.1 Style

Stylised **low-poly with soft gradients** — think modern preschool TV: rounded shapes, no sharp edges, thick friendly proportions, big eyes, pastel palette with one saturated accent per zone. Flat/toon shading with a gentle 2-step ramp (custom `MeshToonMaterial` gradient map) plus baked AO. Outlines: none (costly, and not needed at this style).

### 6.2 Palette

| Role | Hex |
|---|---|
| Sky top / bottom | `#BFE3FF` / `#FFF1F8` |
| Grass | `#9FE0A8` (light), `#6CC477` (shadow) |
| Pink accent (castle) | `#FF8FD8` |
| Lavender | `#C9B6FF` |
| Sunshine yellow | `#FFD972` |
| Mint | `#9AF0D5` |
| Sky blue | `#8AD3FF` |
| Coral | `#FF9F8A` |
| Snow | `#F4F9FF`, ice `#BDEBFF` |
| UI background | `rgba(255,255,255,0.85)` with 28 px radius |
| Text (decorative only) | `#5A3A6A` |

Colour-learning objects (balloons, jewels, blocks) MUST use the eight canonical learning colours exactly: rojo `#FF4D5E`, azul `#3D8BFF`, amarillo `#FFD23F`, verde `#3DD68C`, rosa `#FF7AC8`, morado `#9B6BFF`, naranja `#FF9A3D`, blanco `#FFFFFF`. These are chosen to be unambiguous to a child and distinguishable under deuteranopia (rojo/verde differ in luminance by ≥ 30 %).

### 6.3 Asset sources & pipeline

Use CC0 / permissive assets, then customise. Do **not** generate 3D from text models; do not scrape.

| Need | Source (licence) |
|---|---|
| Nature kit, castle pieces, farm, props | Kenney.nl (CC0): *Nature Kit*, *Castle Kit*, *Farm*, *Holiday Kit* (snow) |
| Animals (rigged, animated) | Quaternius (CC0): *Animated Animals*, *Farm Animals*, *Ultimate Animated Animals* |
| Characters (unicorn, princess, fox, bear, frog) | Quaternius base + modification in Blender; or commission on Fiverr/Sketchfab (CC-BY requires credit screen in parent area) |
| Fonts (decorative) | Google Fonts: *Fredoka* (rounded), *Baloo 2* |
| UI icons | Phosphor Icons / own SVG |
| Particles | Own (sprite sheets, 256²) |

Pipeline (scripted in `tools/assets/`):
1. Blender: scale to metres, apply transforms, bake AO to vertex colour or 512² texture, name animation clips (`Idle`, `Walk`, `Happy`, `Talk`, `Sad`, `Dance`), export glTF 2.0 (separate `.bin` + textures).
2. `gltf-transform optimize --compress draco --texture-compress ktx2` → `public/models/<zone>/<name>.glb`.
3. Navmesh: separate low-poly mesh per zone named `navmesh`, exported alone (`<zone>_navmesh.glb`).
4. Manifest `public/models/manifest.json` with triangle counts and sizes (a test fails the build if a budget is exceeded).

### 6.4 Original characters (names and designs are ours)

| Character | Role | Look | Personality / voice |
|---|---|---|---|
| **Luna** | Companion unicorn; player's avatar-guide | White-lavender body, pastel rainbow mane, star mark on flank, big dark eyes | Warm, encouraging big-sister voice; speaks in short sentences; laughs often |
| **Princesa Estrella** | Castle host | Brown skin, curly dark hair with a small gold star crown, mint-and-pink dress (not blue/ice, not yellow ball gown) | Curious, playful, asks questions |
| **Granjero Tomás** | Farm host (bear) | Round brown bear in overalls and straw hat | Slow, kind, chuckles |
| **Zorro Copo** | Snow forest host (fox) | White arctic fox with a red scarf | Quick, whispery, mischievous |
| **Rana Melodía** | Lake host (frog) | Green frog with a tiny ukulele | Musical, sings her lines |
| **Nube, Chispa, Brisa** | Baby unicorns | Mint, peach, sky-blue | Giggle, don't speak |

Reviewer rule: before finalising any character, check it does not read as a known franchise character (silhouette, colours, signature props). If in doubt, change two of: colour scheme, hair/mane shape, outfit.

---

## 7. Didactic system (the part that makes it a learning game)

### 7.1 Round structure (every quiz-type mini-game)

```
INTRO (first time only, ≤ 12 s): host demonstrates one example, hand-cursor animation shows the tap.
PROMPT: voice line + target shown/said. 🔊 button repeats it.
   └─ 8 s no action → HINT 1: prompt repeated, target wiggles.
   └─ 16 s no action → HINT 2: target glows + arrow; Luna points.
   └─ 24 s → HINT 3: Luna taps it herself ("¡Mira, aquí!"), counts as "assisted".
RESPONSE:
   correct → sparkle on item, host praise (varied, 1.5 s), item animates (balloon floats away, jewel into crown…)
   incorrect → item wiggles, soft "boing", host redirect naming the wrong item ("Ese es azul. Busca el rosa.") — this teaches even on misses.
   2nd incorrect in same round → HINT 2 immediately.
NEXT ROUND after 1.2 s. Game ends after N rounds (default 5) or at 3 min, whichever first.
CELEBRATION (2 s) → sticker → back to world.
```

### 7.2 Adaptive difficulty

Each game config defines levels 1–3. Rule engine (pure function, unit-tested):
- Start at the child's stored level for that game (default 1).
- 3 consecutive first-try correct → level +1 (max 3), host says "¡Vamos a hacerlo un poquito más difícil!"
- 2 incorrect (or 1 assisted) within a game → level −1 (min 1), no announcement.
- Levels change only between rounds, never mid-round.

Examples: Count Unicorns L1 = 1–3 objects, 2 choices; L2 = 1–5, 3 choices; L3 = 1–10, 3 choices with near-miss distractors (n±1).

### 7.3 Spaced repetition of content

Each learning item (e.g., colour `morado`, animal `oveja`, numeral `4`) has a record `{ seen, correctFirstTry, lastSeen, box }` (Leitner boxes 1–3). Item selection for a round draws 60 % from box 1, 30 % box 2, 10 % box 3. Correct first-try → box +1; miss → box 1. Pure, tested function `pickItems(pool, records, n)`.

### 7.4 Scaffolding by game type

- **Counting**: objects are always arranged in a line or 2×N grid (never scattered) at L1–2; each object pulses when tapped and the voice counts aloud ("uno… dos… tres"). The numeral appears **with** the quantity.
- **Colours**: name always paired with the object ("el globo rosa"), never the colour alone at L1.
- **Shapes**: silhouettes have matching holes (SHP-2) before abstract recognition (SHP-1) is asked.
- **Letters**: her own name's first letter first (configurable in parent area), then vowels; letters are spoken by **sound** ("mmm") and name ("eme").
- **Emotions**: faces are animated 3D heads; each emotion has a short story line ("Nube está triste porque perdió su flor").

### 7.5 Language

- All in-game speech and decorative text: **Spanish (es-ES neutral, no regionalisms that would confuse; use "coche", "ordenador" is never said anyway)**. Numbers: "uno" (not "un") when counting.
- `en` locale kept in the strings table for later; no runtime language switch exposed to the child (parent area only).

### 7.6 Parent area ("Rincón de padres")

Behind a parent gate (§8.6). Shows: minutes played this week; per-objective status (learning / mastered) as simple bars; per-animal/colour/number "known" grid; options: child's name & first letter, session length limit (10/15/20 min → Luna yawns and says it's time to rest, music fades, world dims; no hard lock), volume sliders, quality preset, reset progress, credits/licences.

---

## 8. UX & interaction

### 8.1 Global rules (MUST)

- Hit targets ≥ 96 CSS px; preferred ≥ 120 px. 3D pickable objects get an invisible enlarged hit proxy.
- First-touch-only: ignore additional simultaneous touches.
- Every tap yields feedback within 100 ms (sound + scale pop).
- No modal dialogs except the parent gate. No system `alert`.
- Safe area: all HUD elements inside `env(safe-area-inset-*)`.
- Prevent: pinch zoom, double-tap zoom, pull-to-refresh, text selection, long-press menu, accidental back (history guard in PWA, back button → "¿Quieres salir?" with big ✔/↩ in Capacitor).
- Reduced-motion: respect `prefers-reduced-motion` → fewer particles, no camera bob.

### 8.2 HUD (always visible in world)

- Bottom-left: **Luna button** (portrait) → tap: Luna says where we are and offers two destinations as big icon buttons; tap again: closes.
- Bottom-right: **Sticker album** button (small book icon).
- Top-right (tiny, 40 px, semi-transparent): parent gate entry (hold 3 s). Deliberately small and dull.
- Inside a mini-game: top-centre progress as N stars filling; top-left 🔊 repeat prompt; bottom-left Luna (exit).

### 8.3 Feedback vocabulary

| Event | Visual | Audio |
|---|---|---|
| Tap anything | 1.1× scale pop, 120 ms | Soft "pop" (randomised pitch ±5 %) |
| Correct | Sparkle burst, item success animation | Rising 3-note chime + praise line |
| Incorrect | Horizontal wiggle | Soft low "boing" + redirect line |
| Round complete | Star fills | Short arpeggio |
| Game complete | Confetti 2 s, host dance clip | Fanfare (1.5 s) + "¡Lo lograste!" + sticker sound |
| Level up | Rainbow ring around Luna | Sparkle sweep + line |
| Hint | Target wiggle/glow/arrow | Prompt repeat |

### 8.4 Rewards: sticker album (the only meta-progression)

Every completed game gives one sticker (3D model rendered to a 2D card). 60 stickers total. Album is a book she can flip through; tapping a sticker says its name ("¡Un unicornio rosa!"). No locked content, no currency, no streaks.

### 8.5 Session pacing

Luna suggests a different zone after two games in the same zone. After the configured session length, the "time to rest" sequence runs (§7.6).

### 8.6 Parent gate

Hold the top-right button 3 s, then answer "¿Cuánto es 7 + 5?" with a numeric keypad (randomised two-digit sums). Standard COPPA-style gate.

---

## 9. Software architecture

### 9.1 Repository layout

```
el-valle-magico/
├─ GAME_DESIGN.md
├─ docs/DECISIONS.md
├─ public/
│  ├─ models/<zone>/*.glb, <zone>_navmesh.glb, manifest.json
│  ├─ audio/voice/es/<bank>.webm + <bank>.json (Howler sprite maps)
│  ├─ audio/music/*.webm, audio/sfx/sfx.webm + sfx.json
│  └─ icons/ (PWA icons 192/512, maskable)
├─ src/
│  ├─ app/            App.tsx, Canvas setup, quality presets, loading screen
│  ├─ core/           state machine (XState), stores (Zustand), persistence, device tier
│  ├─ world/          Hub + zone scenes, navmesh, Luna controller, camera rig, portals, ambient props
│  ├─ characters/     glTF character components with animation state (Idle/Walk/Talk/Happy/Sad/Dance)
│  ├─ games/
│  │  ├─ engine/      RoundRunner, hints, adaptive difficulty, spaced repetition, celebration
│  │  ├─ configs/     one JSON/TS config per game (§9.3)
│  │  └─ scenes/      one React component per game (3D stage only; logic lives in engine)
│  ├─ audio/          AudioManager (Howler), voice line registry, ducking
│  ├─ ui/             HUD, Luna button, sticker album, parent area, parent gate
│  ├─ i18n/           strings.es.ts, strings.en.ts, voice line IDs
│  └─ content/        learning items (colours, animals, numbers, shapes…), stickers
├─ tools/assets/      gltf pipeline, audio encode, budget checks
├─ tests/             vitest (engine), playwright (smoke)
└─ .github/workflows/ ci.yml (lint, test, build, deploy pages)
```

### 9.2 Scene state machine (XState)

```
boot → loading(hub) → world.idle
world.idle --tap waypoint--> world.walking --arrived--> world.idle
world.idle --tap host--> world.invite --accept--> game.intro --done--> game.round
game.round --answer--> game.feedback --next--> game.round | game.celebration
game.* --tap Luna--> world.idle (camera returns)
game.celebration --done--> world.idle
world.* --portal--> loading(zone) --ready--> world.idle
any --hold parent button--> parentGate --pass--> parentArea --close--> previous
any --session limit--> rest --tap--> world.idle (music stays soft)
```

### 9.3 Game config schema (data-driven; MUST)

```ts
type GameConfig = {
  id: string;                      // "count-unicorns"
  zone: ZoneId;                    // "pradera-unicornios"
  host: CharacterId;               // "luna" | "estrella" | ...
  objectives: ObjectiveCode[];     // ["NUM-1","NUM-2","NUM-3"]
  type: "choose-one" | "tap-all" | "drag-to-slot" | "pairs" | "sequence" | "free-play";
  roundsPerGame: number;           // default 5
  maxDurationSec: number;          // default 180
  levels: {                        // index 0..2
    poolSize: number;              // how many items shown
    choices: number;               // for choose-one
    distractorRule?: "random" | "near" | "same-category";
    itemsPool: ItemRef[] | ItemPoolRule;
  }[];
  voice: {                         // IDs into the voice bank
    intro: string; prompt: string; hints: [string,string,string];
    correct: string[]; incorrect: string[]; complete: string;
  };
  sticker: StickerId;
  stage: string;                   // name of the React scene component
};
```

The engine (`RoundRunner`) consumes a config and emits events the scene component renders; the scene never contains answer logic. This keeps 15+ games consistent and testable.

### 9.4 Audio manager

- Voice lines addressed by ID (`voice.play("castle.balloons.prompt.rosa")`); template lines are **pre-recorded per variant** (one file per colour/number/animal), never concatenated at runtime beyond [praise] + [item] with a 150 ms gap.
- Ducking: music −12 dB while a voice line plays; ambient −6 dB.
- Only one voice line at a time; a new prompt cancels the previous (with 60 ms fade).
- Unlock audio on first user gesture (iOS); show a big "toca para empezar" star on boot that both unlocks audio and starts the game.
- Volume groups: voice, music, sfx (parent sliders).

### 9.5 Persistence model

```ts
type Save = {
  version: 1;
  child: { name?: string; firstLetter?: string };
  settings: { sessionMinutes: 10|15|20|0; volumes: {voice:number;music:number;sfx:number}; quality: "auto"|"high"|"medium"|"low"; locale: "es"|"en" };
  progress: Record<GameId, { level: 1|2|3; plays: number; completions: number }>;
  items: Record<ItemId, { seen: number; correctFirstTry: number; lastSeen: number; box: 1|2|3 }>;
  stickers: StickerId[];
  minutesByDay: Record<string /*YYYY-MM-DD*/, number>;
};
```

---

## 10. Mini-game catalogue (v1 = 16 games)

Each entry: **Objective · Type · Levels · Interaction · Feedback · Stage props**

### Castillo de Estrella
1. **Globos del Castillo** — COL-1 · choose-one · L1 3 balloons/6 colours, L2 4 balloons/8 colours, L3 4 balloons incl. similar pairs (rosa/rojo, azul/morado) · "Toca el globo rosa" · correct: balloon floats up over the castle with sparkle trail · Props: castle balcony, balloon bunch, Estrella on balcony.
2. **Joyas de la Princesa** — SHP-1/SHP-2 · L1 drag-to-slot 3 shapes into crown holes (self-correcting: wrong shape won't fit, bounces back gently), L2 choose-one "toca la estrella" among 4, L3 among 5 with rotated shapes · Props: crown on cushion, gems glowing.
3. **Las Puertas** — SIZ-1 · choose-one · L1 "grande/pequeño" 2 doors, L2 3 doors "mediana", L3 order 3 by size (drag) · Correct door opens, baby unicorn peeks out · Props: castle hall with doors.
4. **Torre de Bloques** — NUM-1/SIZ-1 · tap-all/sequence · tap blocks in order while Luna counts, tower grows; L3 "pon el bloque más grande abajo" · Props: courtyard, 3–6 blocks.

### La Granja
5. **Los Animales** — ANI-1 · free-play · tap any animal → animation + name + sound; L2 "¿Dónde está la oveja?" choose-one · Props: barn, pen with 6 animals (rotating from 18).
6. **¿Quién hace muu?** — ANI-1 · choose-one · sound plays, child taps the animal · L1 2 very different animals, L3 4 incl. similar (oveja/cabra) · Props: animals peeking from barn windows.
7. **Hogar de los Animales** — ANI-2 · drag-to-slot · drag animal to farm / forest / water zone · L1 2 homes, L3 3 homes · Props: three dioramas.
8. **Los Huevos** — NUM-2/NUM-3 · tap-all then choose-one · tap each egg (it cracks, chick pops, voice counts), then tap the numeral · L1 1–3, L3 up to 10 · Props: nests on hay.

### Pradera de Unicornios
9. **Cuenta los Unicornios** — NUM-1/2/3 · tap-all + choose-one · baby unicorns gallop in and stop in a line; tap each to count; then choose numeral · L1 1–3/2 choices, L2 1–5/3, L3 1–10/3 near-miss · Props: meadow, rainbow.
10. **¿Dónde hay más?** — NUM-4 · choose-one · two groups of flowers/apples; "¿dónde hay más?" ; L3 "igual" appears · Props: two baskets.
11. **Collar de Perlas** — LOG-2 · choose-one · pattern of pearls on a string, child picks the next · L1 AB, L2 AAB, L3 ABC · Props: Nube wearing necklace.

### Bosque Nevado
12. **Letras de Hielo** — LET-1 · choose-one · ice letters; "toca la A… aaa" · L1 her initial vs 1 other, L2 vowels, L3 initial of animal names shown · Props: frozen pond, Copo sliding.
13. **¿Qué sigue?** — LOG-2 · choose-one · footprints/snowflakes pattern · Props: snowy path.
14. **Las Huellas** — LOG-1 · choose-one · 4 tracks/animals, one different · Props: snow bank.

### Lago del Arcoíris
15. **Parejas** — MEM-1 · pairs · lily-pad cards flip · L1 3 pairs, L2 4, L3 6 · Props: lake, Melodía on a rock.
16. **Caras** — EMO-1 · choose-one · three animated heads, "¿quién está contento?"; L3 short story then question · Props: dock with three friends.

Backlog (v1.1): **Nenúfares Musicales** (MUS-1 free-play xylophone), **Mi Día** (LIF-1 sequencing), **Pinta el Castillo** (free colouring on 3D castle), **Baila con Luna** (follow the move).

---

## 11. Voice & audio production

### 11.1 Voice source (decision required from the owner — pick one before Phase 4)

| Option | Quality | Effort | Notes |
|---|---|---|---|
| **A. Parent records lines** (phone + quiet room, or USB mic) | Highest engagement for a 4-year-old (it's mum/dad's voice) | ~2 h for ~250 lines using the provided script + `tools/audio/record.html` recorder page | Recommended for Luna at least |
| **B. ElevenLabs (es, child-friendly female voice, e.g., multilingual v2)** | Very good, consistent | Low; script → batch API → files | Needs a paid plan for ~250 lines; check licence allows app use (it does on paid tiers) |
| C. Hire a voice actor (Fiverr, native es) | Excellent | 1–2 days, ~€80–150 | For hosts |
| ✗ Browser TTS | Poor | — | Banned |

Mixed approach recommended: Luna = parent (A); hosts = B or C.

### 11.2 Technical specs

- Record/generate 48 kHz WAV → normalise to −16 LUFS, trim silence to 80 ms head / 150 ms tail → encode WebM/Opus 64 kbps (+ AAC m4a fallback for old Safari) → pack per bank into Howler sprites (`tools/audio/build.ts`).
- Banks: `common` (praise, redirects, hints, UI), `luna`, `estrella`, `tomas`, `copo`, `melodia`, `items-colors`, `items-numbers`, `items-animals`, `items-shapes`, `items-letters`, `items-emotions`.
- Praise and redirect lines: ≥ 8 variants each, chosen without immediate repeats.

### 11.3 Script (excerpt — the full script is generated from `src/i18n/voice.es.ts`; these are the canonical lines)

**Common**
| ID | Line |
|---|---|
| common.start | ¡Hola! Soy Luna. ¡Toca la estrella para empezar! |
| common.praise.1–8 | ¡Muy bien! · ¡Lo lograste! · ¡Eso es! · ¡Genial! · ¡Bravo! · ¡Qué lista eres! · ¡Perfecto! · ¡Sí, sí, sí! |
| common.redirect.1–6 | Mmm, ese no. ¡Inténtalo otra vez! · Casi. Mira bien. · Ese es otro. ¡Busca otra vez! · No pasa nada. ¡Otra vez! · Uy, ese no. ¡Tú puedes! · Mira, mira… ¿cuál será? |
| common.hint.look | Mira aquí. |
| common.hint.luna-does | ¡Mira, es este! |
| common.levelup | ¡Vamos a hacerlo un poquito más difícil! |
| common.complete | ¡Lo lograste! ¡Tienes una pegatina nueva! |
| common.idle.1–3 | ¿Vamos a ver a la princesa? · ¿Jugamos con los animales? · ¡Ven, sígueme! |
| common.rest | Qué bien hemos jugado. Ahora toca descansar. ¡Hasta pronto! |
| common.exit | ¿Nos vamos? |

**Items (one file per item; template "el globo {color}" etc. recorded fully)**
colours: `item.color.rojo` "rojo" … plus `castle.balloons.prompt.rojo` "Toca el globo rojo" (×8)
numbers: `item.num.1` "uno" … `item.num.10` "diez"; `num.prompt.howmany` "¿Cuántos unicornios hay?"; `num.answer.3` "¡Tres! Hay tres unicornios." (×10)
shapes: `castle.jewels.prompt.estrella` "Toca la estrella" (×5); `item.shape.*`
animals: `item.animal.vaca` "La vaca" ; `item.animal.vaca.sound` "¡Muuu!" ; `farm.who.prompt` "¿Quién hace este sonido?" ; `farm.where.vaca` "¿Dónde está la vaca?" (×18)
sizes: `castle.doors.prompt.grande` "Toca la puerta grande" ; `.pequena` ; `.mediana`
letters: `item.letter.a.sound` "aaa" ; `item.letter.a.name` "a" ; `snow.letters.prompt.a` "Toca la A"
emotions: `lake.faces.prompt.contento` "¿Quién está contento?" (×4) ; `lake.faces.story.*`

**Hosts (intro + complete per game, ~2 lines × 16 games)**
e.g., `estrella.balloons.intro` "¡Hola! Mira cuántos globos. ¿Me ayudas a encontrar los colores?" ; `tomas.eggs.intro` "Las gallinas han puesto huevos. ¡Vamos a contarlos!"

Target total: ~260 lines, ~12 minutes of audio.

### 11.4 Music & SFX

- 6 loops (hub + 5 zones), 60–90 s, seamless, soft instrumentation (harp, celesta, marimba, ukulele). Source: compose with a musician, or CC0/CC-BY from Kevin MacLeod (credit in parent area) / Kenney audio.
- SFX sprite: pop, chime3, boing, arpeggio, fanfare, sparkle, sticker, flip, splash, crunch, footsteps×3 surfaces, animal sounds×18 (real recordings, freesound CC0).

---

## 12. Delivery plan (phases with acceptance criteria)

**Phase 0 — Scaffold (½ day)**
Vite+TS+R3F project, ESLint/Prettier, Vitest, Playwright, CI, PWA plugin, quality presets, device tier detection, AudioManager with unlock gesture, Zustand+XState skeleton, placeholder Luna (capsule) walking on a flat navmesh via tap-to-go. ✅ Runs on laptop & phone browser at 60 fps; tap moves Luna; "toca para empezar" unlocks audio and plays a test chime.

**Phase 1 — Vertical slice (2–3 days)**
Hub meadow with real assets (Kenney nature + instanced grass/flowers), camera rig, Luna glTF with Idle/Walk/Happy, HUD, one complete game (**Cuenta los Unicornios**) through the data-driven engine with hints, adaptive levels, celebration and a sticker. Placeholder voice = recorded by the owner with the recorder page (even rough). ✅ A 4-year-old completes the game unaided in a test session; engine tests green; budgets met.

**Phase 2 — World (3–4 days)**
Five zones streamed via portals, hosts with Idle/Talk/Happy, ambient free-play props, idle/suggestion behaviour, sticker album, persistence. ✅ Navigation never blocks; zone loads ≤ 3 s on Pixel 6 over Wi-Fi then offline.

**Phase 3 — Games 2–16 (5–7 days)**
Implement remaining games via configs + stage components, spaced repetition, Leitner selection, parent area + gate, session limit. ✅ Each game has a Vitest for its config and a Playwright smoke test (enter, answer correctly ×5, exit).

**Phase 4 — Audio (2 days + recording time)**
Final voice (per §11.1 decision), music, SFX, ducking, sprite packing. ✅ No TTS; all 260 lines present; lint rule passes.

**Phase 5 — Polish & PWA release (2 days)**
Toon shading, bloom (high tier), particles, loading screen, icons, offline verification, GitHub Pages deploy, Lighthouse PWA ≥ 90. ✅ Installable on iPhone & Android; works in airplane mode.

**Phase 6 — Optional store apps (1–2 days + store review)**
Capacitor wrap, haptics, orientation lock, privacy labels ("no data collected"). TestFlight/internal track for family only — no public store listing needed.

Definition of done for any task: lint + tests + build green; budgets met; tested on one phone and one laptop; `DECISIONS.md` updated if the spec changed.

---

## 13. Playtesting protocol (do this after Phase 1 and after Phase 3)

1. 10-minute session, phone in landscape, no adult help unless she asks.
2. Record (screen + camera on hands) with consent.
3. Log: taps that did nothing · moments of confusion (> 8 s idle) · misunderstood prompts · frustration · what she replayed voluntarily.
4. Fix the top 3 issues before adding features. A game she avoids twice is redesigned or cut.

---

## 14. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Mobile GPU too weak for 3D scenes | Stutter → child disengages | Budgets (§5.3), tiers, instancing, KTX2; low tier removes post/shadows; fallback: 2.5D orthographic camera |
| iOS audio unlock / WebView quirks | Silence on first play | Mandatory start gesture; Howler html5 fallback off; test on real iPhone each phase |
| Asset-style inconsistency (mixing CC0 packs) | Looks cheap | Single toon material + palette remap pass in Blender; one AO bake style |
| Voice production delay | Blocks Phase 4 | Phase 1 uses rough parent recording; script frozen by end of Phase 3 |
| Scope creep (more games, free roam, multiplayer) | Never ships | 16 games cap in v1; navigation rules are MUST |
| Accidental franchise resemblance | Legal / takedown risk if ever shared | §6.4 reviewer rule; no franchise names anywhere in repo, assets or audio |
| Child frustration with drag-and-drop | Avoids those games | Drag only in 3 games, with magnet snapping (≥ 25 % overlap snaps) and tap-tap alternative (tap item, tap slot) |

---

## 15. Open decisions for the owner

1. Voice source for Luna and hosts (§11.1). Recommendation: you record Luna; ElevenLabs for hosts.
2. Child's name and initial for LET-1 (set in parent area, but a default speeds testing).
3. Target devices: which phone(s) and laptop exactly? (Determines the "medium" tier baseline.)
4. Deploy target: GitHub Pages (public URL, unlisted) vs. local-only files. Recommendation: Pages, unlisted, for painless phone installs.
5. Whether Phase 6 (store apps) is wanted at all. Recommendation: no — PWA covers it.

---

## 16. First prompts for Claude Code (copy-paste)

**Kick-off**
> Read GAME_DESIGN.md completely. Summarise architecture and MUST rules in ≤ 20 lines. List open questions. Then implement Phase 0 exactly as specified, including CI and the audio-unlock start screen. Stop after Phase 0 acceptance criteria pass and show me how to run it on my phone.

**Vertical slice**
> Implement Phase 1: hub meadow with Kenney Nature Kit assets (download CC0 pack into tools/assets/raw, run the pipeline), Luna placeholder replaced by a rigged glTF, camera rig per §4.3, HUD per §8.2, and the game "Cuenta los Unicornios" using the data-driven engine (§9.3, §7). Write Vitest tests for RoundRunner, adaptive difficulty and pickItems. Use my rough voice files in public/audio/voice/es if present; otherwise use silent placeholders with the IDs in place — never TTS.

**Per game**
> Add the game "<name>" from §10 as a config in src/games/configs and a stage in src/games/scenes. Reuse the engine; do not add logic to the scene. Add its Vitest + Playwright smoke test. Update the sticker list and voice ID registry.
