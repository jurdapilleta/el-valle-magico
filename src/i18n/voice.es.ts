import { ANIMALS, COLOURS, EMOTIONS, HOMES, LETTERS, SHAPES, SIZE_NAMES } from '../content/items';

// Voice line registry (GAME_DESIGN §11.3). The ID is the contract: audio files
// are named after it, and the recording script is generated from this table.
// Text is what the speaker says; it is never synthesised at runtime.

const NUMBER_WORDS = [
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
];

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const feminine = (name: string) => name.startsWith('la ');
const lines: Record<string, string> = {};

NUMBER_WORDS.forEach((word, i) => {
  const n = i + 1;
  lines[`item.num.${n}`] = word;
  lines[`num.answer.${n}`] =
    n === 1 ? '¡Uno! Hay un unicornio.' : `¡${cap(word)}! Hay ${word} unicornios.`;
  lines[`farm.eggs.answer.${n}`] =
    n === 1 ? '¡Uno! Hay un pollito.' : `¡${cap(word)}! Hay ${word} pollitos.`;
  lines[`num.wrong.${n}`] = `Ese es el ${word}.`;
});

for (const colour of Object.keys(COLOURS)) {
  lines[`item.color.${colour}`] = colour;
  lines[`castle.balloons.prompt.${colour}`] = `Toca el globo ${colour}.`;
  lines[`castle.balloons.answer.${colour}`] = `¡El globo ${colour}!`;
  lines[`color.wrong.${colour}`] = `Ese es ${colour}.`;
}

for (const [shape, name] of Object.entries(SHAPES)) {
  lines[`item.shape.${shape}`] = name;
  lines[`castle.jewels.prompt.${shape}`] = `Toca ${name}.`;
  lines[`shape.wrong.${shape}`] = `${feminine(name) ? 'Esa' : 'Ese'} es ${name}.`;
}

for (const [size, name] of Object.entries(SIZE_NAMES)) {
  lines[`item.size.${size}`] = name;
  lines[`castle.doors.prompt.${size}`] = `Toca la puerta ${name}.`;
  lines[`size.wrong.${size}`] = `Esa es la ${name}.`;
}

for (const [animal, info] of Object.entries(ANIMALS)) {
  lines[`item.animal.${animal}`] = cap(info.name);
  lines[`item.animal.${animal}.sound`] = info.sound;
  lines[`farm.where.${animal}`] = `¿Dónde está ${info.name}?`;
  lines[`farm.home.prompt.${animal}`] = `¿Dónde vive ${info.name}?`;
  lines[`farm.home.answer.${animal}`] = `${cap(info.name)} vive ${HOMES[info.home]}.`;
  lines[`animal.wrong.${animal}`] = `${feminine(info.name) ? 'Esa' : 'Ese'} es ${info.name}.`;
}
for (const [home, name] of Object.entries(HOMES)) lines[`item.home.${home}`] = cap(name);

for (const [letter, [sound, name]] of Object.entries(LETTERS)) {
  lines[`item.letter.${letter}.sound`] = sound;
  lines[`item.letter.${letter}.name`] = name;
  lines[`snow.letters.prompt.${letter}`] = `Toca la ${letter.toUpperCase()}.`;
  lines[`letter.wrong.${letter}`] = `Esa es la ${name}.`;
}

for (const emotion of Object.keys(EMOTIONS)) {
  lines[`item.emotion.${emotion}`] = emotion;
  lines[`lake.faces.prompt.${emotion}`] = `¿Quién está ${emotion}?`;
  lines[`emotion.wrong.${emotion}`] = `Ese está ${emotion}.`;
}

export const VOICE_ES: Record<string, string> = {
  'common.start': '¡Hola! Soy Luna. ¡Toca la estrella para empezar!',
  'common.praise.1': '¡Muy bien!',
  'common.praise.2': '¡Lo lograste!',
  'common.praise.3': '¡Eso es!',
  'common.praise.4': '¡Genial!',
  'common.praise.5': '¡Bravo!',
  'common.praise.6': '¡Qué lista eres!',
  'common.praise.7': '¡Perfecto!',
  'common.praise.8': '¡Sí, sí, sí!',
  'common.redirect.1': 'Mmm, ese no. ¡Inténtalo otra vez!',
  'common.redirect.2': 'Casi. Mira bien.',
  'common.redirect.3': 'Ese es otro. ¡Busca otra vez!',
  'common.redirect.4': 'No pasa nada. ¡Otra vez!',
  'common.redirect.5': 'Uy, ese no. ¡Tú puedes!',
  'common.redirect.6': 'Mira, mira… ¿cuál será?',
  'common.hint.look': 'Mira aquí.',
  'common.hint.luna-does': '¡Mira, es este!',
  'common.levelup': '¡Vamos a hacerlo un poquito más difícil!',
  'common.complete': '¡Lo lograste! ¡Tienes una calcomanía nueva!',
  'common.idle.1': '¿Vamos a ver a la princesa?',
  'common.idle.2': '¿Jugamos con los animales?',
  'common.idle.3': '¡Ven, sígueme!',
  'common.rest': '¡Qué bien jugamos! Ahora toca descansar. ¡Hasta pronto!',
  'common.exit': '¿Nos vamos?',

  'luna.where.hub': 'Estamos en la pradera. ¿A dónde vamos?',
  'luna.where.castillo': 'Estamos en el castillo de Estrella. ¿A dónde vamos?',
  'luna.where.granja': 'Estamos en la granja. ¿A dónde vamos?',
  'luna.where.bosque': 'Estamos en el bosque nevado. ¿A dónde vamos?',
  'luna.where.lago': 'Estamos en el lago del arcoíris. ¿A dónde vamos?',
  'luna.where.pradera': 'Estamos en la pradera de los unicornios. ¿A dónde vamos?',

  'estrella.hello': '¡Hola! Soy la princesa Estrella. ¡Bienvenida a mi castillo!',
  'tomas.hello': '¡Hola, hola! Soy Tomás. ¡Bienvenida a la granja!',
  'copo.hello': 'Psst… soy Copo. ¡Mira cuánta nieve!',
  'melodia.hello': '¡La, la, la! Soy Melodía. ¡Qué alegría verte!',

  // Pradera de Unicornios
  'luna.count.invite': '¡Hola! ¿Jugamos a contar?',
  'luna.count.intro': '¡Mira, vienen los unicornios! Toca cada uno para contarlos.',
  'num.prompt.count': 'Toca cada unicornio para contarlos.',
  'num.prompt.howmany': '¿Cuántos unicornios hay?',
  'luna.more.invite': '¿Jugamos a ver dónde hay más?',
  'luna.more.intro': 'Mira las dos cestas. Toca la que tiene más manzanas.',
  'meadow.more.prompt': '¿Dónde hay más?',
  'meadow.more.prompt.equal': '¿Dónde hay más? ¿O hay igual?',
  'meadow.more.answer.mas': '¡Sí! Aquí hay más.',
  'meadow.more.answer.igual': '¡Sí! Hay igual.',
  'luna.necklace.invite': '¿Hacemos un collar para Nube?',
  'luna.necklace.intro': 'Mira los colores del collar. ¿Cuál viene ahora?',
  'logic.next.prompt': '¿Qué sigue?',
  'logic.next.answer': '¡Eso es! Así sigue.',

  // Castillo de Estrella
  'estrella.balloons.invite': '¿Jugamos con los globos?',
  'estrella.balloons.intro': '¡Mira cuántos globos! ¿Me ayudas a encontrar los colores?',
  'estrella.jewels.invite': '¿Me ayudas con las joyas de mi corona?',
  'estrella.jewels.intro': 'A mi corona le faltan las joyas. Pon cada una en su sitio.',
  'castle.jewels.drag': 'Pon cada joya en su sitio.',
  'estrella.doors.invite': '¿Abrimos las puertas del castillo?',
  'estrella.doors.intro': 'Hay puertas grandes y pequeñas. ¡Toca la que te digo!',
  'castle.doors.order': 'Pon cada puerta en su sitio.',
  'castle.doors.answer': '¡Mira quién está detrás!',
  'estrella.tower.invite': '¿Hacemos una torre de bloques?',
  'estrella.tower.intro': 'Toca los bloques uno a uno y la torre crecerá.',
  'castle.tower.count': 'Toca cada bloque para hacer la torre.',
  'castle.tower.order': 'Pon primero el bloque más grande.',
  'castle.tower.answer': '¡Qué torre tan alta!',

  // La Granja
  'tomas.animals.invite': '¿Quieres conocer a mis animales?',
  'tomas.animals.intro': 'Estos son mis amigos. Tócalos y te dirán hola.',
  'farm.explore': 'Toca los animales.',
  'tomas.who.invite': '¿Jugamos a adivinar quién habla?',
  'tomas.who.intro': 'Escucha bien. ¿Quién hace este sonido?',
  'farm.who.prompt': '¿Quién hace este sonido?',
  'tomas.homes.invite': '¿Llevamos a los animales a su casa?',
  'tomas.homes.intro': 'Cada animal tiene su casa. Llévalo a donde vive.',
  'tomas.eggs.invite': '¿Contamos los huevos?',
  'tomas.eggs.intro': 'Las gallinas pusieron huevos. ¡Vamos a contarlos!',
  'farm.eggs.count': 'Toca cada huevo para contarlos.',
  'farm.eggs.howmany': '¿Cuántos pollitos hay?',

  // Bosque Nevado
  'copo.letters.invite': 'Psst… ¿jugamos con las letras de hielo?',
  'copo.letters.intro': 'Mira estas letras de hielo. ¡Toca la que te digo!',
  'snow.letters.initial': '¿Con qué letra empieza?',
  'copo.next.invite': '¿Seguimos las huellas en la nieve?',
  'copo.next.intro': 'Las huellas hacen un dibujo. ¿Cuál viene ahora?',
  'copo.tracks.invite': '¿Buscamos la huella diferente?',
  'copo.tracks.intro': 'Mira las huellas. Una no es como las demás.',
  'logic.odd.prompt': '¿Cuál es diferente?',
  'logic.odd.answer': '¡Sí! Esa es diferente.',

  // Lago del Arcoíris
  'melodia.pairs.invite': '¡La, la! ¿Jugamos a las parejas?',
  'melodia.pairs.intro': 'Debajo de los nenúfares hay amigos escondidos. Busca dos iguales.',
  'lake.pairs.prompt': 'Busca las parejas iguales.',
  'lake.pairs.answer': '¡Encontraste todas las parejas!',
  'melodia.faces.invite': '¿Jugamos a ver cómo están mis amigos?',
  'melodia.faces.intro': 'Mira las caras de mis amigos. ¿Cómo están?',
  'lake.faces.story.contento': 'A Nube le regalaron un globo.',
  'lake.faces.story.triste': 'Nube perdió su flor.',
  'lake.faces.story.enojado': 'A Nube le quitaron su juguete.',
  'lake.faces.story.sorprendido': '¡Nube vio un arcoíris enorme!',
  'lake.faces.how': '¿Cómo está Nube?',

  ...lines,

  // Sticker names, said when a sticker is tapped in the album.
  'sticker.count-unicorns': '¡Un unicornio verde menta!',
  'sticker.more': '¡Una cesta de manzanas!',
  'sticker.necklace': '¡Un collar de perlas!',
  'sticker.balloons': '¡Un globo rosa!',
  'sticker.jewels': '¡Una corona con joyas!',
  'sticker.doors': '¡Una puerta del castillo!',
  'sticker.tower': '¡Una torre de bloques!',
  'sticker.animals': '¡Una vaca!',
  'sticker.who': '¡Un pato!',
  'sticker.homes': '¡Un granero rojo!',
  'sticker.eggs': '¡Un pollito!',
  'sticker.letters': '¡Una letra de hielo!',
  'sticker.next': '¡Unas huellas en la nieve!',
  'sticker.tracks': '¡Un copo de nieve!',
  'sticker.pairs': '¡Un nenúfar!',
  'sticker.faces': '¡Una cara contenta!',
};

export type VoiceId = keyof typeof VOICE_ES;
