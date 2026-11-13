import type { ItemId } from '../games/engine/types';

// Learning items (GAME_DESIGN §3). An item id is "<family>.<key>".

/** The eight canonical learning colours (§6.2). */
export const COLOURS: Record<string, string> = {
  rojo: '#FF4D5E',
  azul: '#3D8BFF',
  amarillo: '#FFD23F',
  verde: '#3DD68C',
  rosa: '#FF7AC8',
  morado: '#9B6BFF',
  naranja: '#FF9A3D',
  blanco: '#FFFFFF',
};
/** Pairs a child may confuse; used as distractors at level 3. */
export const SIMILAR_COLOURS: Record<string, string> = {
  rosa: 'rojo',
  rojo: 'rosa',
  azul: 'morado',
  morado: 'azul',
  naranja: 'amarillo',
  amarillo: 'naranja',
};

export const SHAPES: Record<string, string> = {
  circulo: 'el círculo',
  cuadrado: 'el cuadrado',
  triangulo: 'el triángulo',
  estrella: 'la estrella',
  corazon: 'el corazón',
};

/** Smallest first. */
export const SIZES = ['pequena', 'mediana', 'grande'] as const;
export const SIZE_NAMES: Record<string, string> = {
  pequena: 'pequeña',
  mediana: 'mediana',
  grande: 'grande',
};

export type Home = 'granja' | 'bosque' | 'agua';
export type AnimalInfo = { name: string; sound: string; home: Home };

export const ANIMALS: Record<string, AnimalInfo> = {
  vaca: { name: 'la vaca', sound: '¡Muuu!', home: 'granja' },
  cerdo: { name: 'el cerdo', sound: '¡Oinc, oinc!', home: 'granja' },
  oveja: { name: 'la oveja', sound: '¡Beee!', home: 'granja' },
  caballo: { name: 'el caballo', sound: '¡Hiii!', home: 'granja' },
  gallina: { name: 'la gallina', sound: '¡Co, co, co!', home: 'granja' },
  pato: { name: 'el pato', sound: '¡Cua, cua!', home: 'agua' },
  perro: { name: 'el perro', sound: '¡Guau, guau!', home: 'granja' },
  gato: { name: 'el gato', sound: '¡Miau!', home: 'granja' },
  cabra: { name: 'la cabra', sound: '¡Meee!', home: 'granja' },
  zorro: { name: 'el zorro', sound: '¡Yip, yip!', home: 'bosque' },
  oso: { name: 'el oso', sound: '¡Grrr!', home: 'bosque' },
  conejo: { name: 'el conejo', sound: '¡Snif, snif!', home: 'bosque' },
  buho: { name: 'el búho', sound: '¡Uuh, uuh!', home: 'bosque' },
  ciervo: { name: 'el ciervo', sound: '¡Brooo!', home: 'bosque' },
  ardilla: { name: 'la ardilla', sound: '¡Chic, chic!', home: 'bosque' },
  pez: { name: 'el pez', sound: '¡Glu, glu!', home: 'agua' },
  rana: { name: 'la rana', sound: '¡Croac!', home: 'agua' },
  tortuga: { name: 'la tortuga', sound: '¡Plof!', home: 'agua' },
};
export const HOMES: Record<Home, string> = {
  granja: 'en la granja',
  bosque: 'en el bosque',
  agua: 'en el agua',
};
/** Animals a child may confuse; used as distractors at level 3. */
export const SIMILAR_ANIMALS: Record<string, string> = {
  oveja: 'cabra',
  cabra: 'oveja',
  perro: 'zorro',
  zorro: 'perro',
  gallina: 'pato',
  pato: 'gallina',
  caballo: 'ciervo',
  ciervo: 'caballo',
};

export const VOWELS = ['a', 'e', 'i', 'o', 'u'];
/** Letter → [how it sounds, what it is called]. */
export const LETTERS: Record<string, [string, string]> = {
  a: ['aaa', 'a'],
  e: ['eee', 'e'],
  i: ['iii', 'i'],
  o: ['ooo', 'o'],
  u: ['uuu', 'u'],
  m: ['mmm', 'eme'],
  p: ['p, p, p', 'pe'],
  s: ['sss', 'ese'],
  l: ['lll', 'ele'],
  t: ['t, t, t', 'te'],
  v: ['vvv', 've'],
  c: ['c, c, c', 'ce'],
  g: ['g, g, g', 'ge'],
  z: ['zzz', 'zeta'],
  b: ['b, b, b', 'be'],
  r: ['rrr', 'erre'],
};

export const EMOTIONS: Record<string, string> = {
  contento: 'contento',
  triste: 'triste',
  enojado: 'enojado',
  sorprendido: 'sorprendido',
};

/** Kinds of footprint for the odd-one-out and pattern games. */
export const TRACKS = ['pata', 'pajaro', 'pezuna', 'bota'];

export const ids = (family: string, keys: Iterable<string>): ItemId[] =>
  [...keys].map((key) => `${family}.${key}`);

export const COLOUR_ITEMS = ids('color', Object.keys(COLOURS));
export const SHAPE_ITEMS = ids('shape', Object.keys(SHAPES));
export const SIZE_ITEMS = ids('size', SIZES);
export const ANIMAL_ITEMS = ids('animal', Object.keys(ANIMALS));
export const EMOTION_ITEMS = ids('emotion', Object.keys(EMOTIONS));
export const TRACK_ITEMS = ids('track', TRACKS);
export const animalsOf = (...homes: Home[]): ItemId[] =>
  ANIMAL_ITEMS.filter((id) => homes.includes(ANIMALS[id.slice(7)]!.home));

/** The objectives of §3, for the parent area. */
export const OBJECTIVES: Record<string, string> = {
  'NUM-1': 'Contar del 1 al 10',
  'NUM-2': 'Contar objetos uno a uno',
  'NUM-3': 'Reconocer los números',
  'NUM-4': 'Más, menos, igual',
  'COL-1': 'Los colores',
  'SHP-1': 'Las formas',
  'SHP-2': 'Encajar formas',
  'SIZ-1': 'Grande y pequeño',
  'ANI-1': 'Animales y sus sonidos',
  'ANI-2': 'Dónde viven los animales',
  'MEM-1': 'Memoria visual',
  'LOG-1': 'El diferente',
  'LOG-2': 'Series y patrones',
  'LET-1': 'Primeras letras',
  'EMO-1': 'Las emociones',
};
