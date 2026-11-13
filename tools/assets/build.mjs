// Asset pipeline (GAME_DESIGN §6.3), Phase 1 subset: copies the selected CC0
// models from tools/assets/raw into public/models/nature/ and writes
// public/models/manifest.json with triangle counts and sizes. The budget test
// (tests/unit/budgets.test.ts) reads that manifest.
//
// Run from the repo root: npm run assets
// Source pack: https://kenney.nl/assets/nature-kit (CC0), unzipped to
// tools/assets/raw/nature-kit/.
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const natureKit = join(root, 'tools/assets/raw/nature-kit/Models/GLTF format');

// Every model in use, shared by all zones (each zone loads only the ones it
// places). Zone-specific buildings and characters are built in code.
const MODELS = [
  'tree_default',
  'tree_oak',
  'tree_fat',
  'tree_detailed',
  'tree_pineRoundA',
  'tree_pineTallA',
  'tree_pineSmallA',
  'tree_pineDefaultA',
  'plant_bush',
  'plant_bushLarge',
  'plant_flatTall',
  'flower_redA',
  'flower_yellowA',
  'flower_purpleA',
  'grass',
  'grass_large',
  'rock_smallA',
  'rock_largeA',
  'rock_tallA',
  'stone_tallA',
  'mushroom_red',
  'mushroom_redGroup',
  'mushroom_tanGroup',
  'stump_round',
  'log',
  'lily_large',
  'lily_small',
  'canoe',
  'crops_cornStageD',
  'crops_wheatStageB',
  'fence_simple',
  'statue_column',
];

if (!existsSync(natureKit)) {
  console.error(`Missing ${natureKit}. Unzip the pack there first (see header).`);
  process.exit(1);
}
const io = new NodeIO();
const outDir = join(root, 'public/models/nature');
mkdirSync(outDir, { recursive: true });
const models = {};
for (const name of MODELS) {
  const to = join(outDir, `${name}.glb`);
  copyFileSync(join(natureKit, `${name}.glb`), to);
  const doc = await io.read(to);
  let triangles = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const count = indices ? indices.getCount() : prim.getAttribute('POSITION').getCount();
      triangles += count / 3;
    }
  }
  models[name] = { file: `models/nature/${name}.glb`, triangles, bytes: statSync(to).size };
}

const manifest = { generated: new Date().toISOString().slice(0, 10), models };
writeFileSync(join(root, 'public/models/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const bytes = Object.values(models).reduce((sum, m) => sum + m.bytes, 0);
console.log(`${MODELS.length} models, ${(bytes / 1024).toFixed(0)} KB`);
