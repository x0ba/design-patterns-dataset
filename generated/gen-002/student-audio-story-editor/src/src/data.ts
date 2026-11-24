import {
  ambiencePeaks,
  buildWords,
  musicPeaks,
  speechPeaks,
  type Anchor,
  type Clip,
  type ClipKind,
  type Segment,
  type SoundEvent,
  type Utt,
} from './model';

export const NOW = new Date('2026-11-16T19:42:00');
export const DUE = new Date('2026-11-20T23:59:00');

export const STUDENT = { name: 'Sofía Ramírez-Clark', first: 'Sofía', initials: 'SR' };
export const TEACHER = { name: 'Sr. Delgado', full: 'Mateo Delgado', initials: 'MD' };
export const COURSE = 'Español 3 · Period 4';
export const PROJECT = 'Crónica de mi barrio';

export const COLORS = {
  sofia: '#138A7E',
  pickup: '#1F9E8F',
  arturo: '#5552D9',
  rosa: '#C0457A',
  ambience: '#9C7A1E',
  bus: '#7D7A3A',
  music: '#3A78C2',
};

type Def = {
  id: string;
  name: string;
  short: string;
  kind: ClipKind;
  duration: number;
  color: string;
  speakers: Record<string, string>;
  utts?: Utt[];
  events?: SoundEvent[];
  recorded: string;
  note?: string;
  library?: string;
  takeGroup?: string;
  takeNo?: number;
  loud?: Record<string, number>;
  ownVoice: boolean;
};

const u = (spk: string, start: number, end: number, text: string): Utt => ({ spk, start, end, text });

function build(d: Def): Clip {
  const utts = d.utts ?? [];
  const words = buildWords(utts);
  let peaks: number[];
  if (d.kind === 'ambience') peaks = ambiencePeaks(d.id, d.duration, d.events ?? []);
  else if (d.kind === 'music') peaks = musicPeaks(d.id, d.duration);
  else peaks = speechPeaks(d.id, d.duration, words, d.loud);
  return {
    id: d.id,
    name: d.name,
    short: d.short,
    kind: d.kind,
    duration: d.duration,
    color: d.color,
    speakers: d.speakers,
    utts,
    words,
    events: d.events ?? [],
    peaks,
    recorded: d.recorded,
    note: d.note,
    library: d.library,
    takeGroup: d.takeGroup,
    takeNo: d.takeNo,
    ownVoice: d.ownVoice,
  };
}

const S = { S: 'Sofía' };

const defs: Def[] = [
  {
    id: 'intro',
    name: 'Introducción',
    short: 'Intro',
    kind: 'narration',
    duration: 38,
    color: COLORS.sofia,
    speakers: S,
    recorded: 'Nov 9',
    ownVoice: true,
    utts: [
      u('S', 0.6, 5.2, 'Hola, soy Sofía Ramírez-Clark y esto es Crónica de mi barrio.'),
      u('S', 5.9, 11.8, 'Vivo en La Loma desde que nací, pero nunca [p:pregunté] cómo [i:era] el barrio antes.'),
      u('S', 12.5, 18.6, 'Los domingos, la Avenida Central se llena de puestos de fruta, de música y de gente.'),
      u('S', 19.3, 25.4, 'Para esta crónica, [p:hablé] con dos personas que [p:vieron] crecer el barrio:'),
      u('S', 26.1, 31.0, 'Don Arturo, el panadero de la esquina, y mi abuela Rosa.'),
      u('S', 31.8, 37.2, 'Ellos me [p:contaron] cómo [i:era] La Loma cuando todo [i:empezaba].'),
    ],
  },
  {
    id: 'narr1',
    name: 'Narración media · toma 1',
    short: 'Narración t1',
    kind: 'narration',
    duration: 31,
    color: COLORS.sofia,
    speakers: S,
    recorded: 'Nov 11',
    takeGroup: 'narr',
    takeNo: 1,
    ownVoice: true,
    note: 'la mejor, pero repetir «el problema»',
    utts: [
      u('S', 0.5, 6.4, 'Don Arturo [p:abrió] la panadería en mil novecientos ochenta y uno.'),
      u('S', 7.0, 12.6, 'En esa época, la avenida no [i:tenía] semáforos y los niños [i:jugaban] en la calle.'),
      u('S', 13.4, 19.8, 'Pero el ?problema es que el barrio está cambiando muy rápido.'),
      u('S', 20.5, 25.6, 'Muchas familias ya se [p:fueron] porque los alquileres [p:subieron].'),
      u('S', 26.2, 30.4, 'Por eso [p:quise] hablar con mi abuela.'),
    ],
  },
  {
    id: 'narr2',
    name: 'Narración media · toma 2',
    short: 'Narración t2',
    kind: 'narration',
    duration: 26,
    color: COLORS.sofia,
    speakers: S,
    recorded: 'Nov 11',
    takeGroup: 'narr',
    takeNo: 2,
    ownVoice: true,
    note: 'me trabé en «los niños»',
    utts: [
      u('S', 0.4, 5.8, 'Don Arturo [p:abrió] la panadería en mil novecientos ochenta y uno.'),
      u('S', 6.4, 12.9, 'En esa época, la avenida no [i:tenía] semáforos y los niños… eh… los niños [i:jugaban] en la calle.'),
      u('S', 13.6, 19.2, 'Hoy muchas familias ya se [p:fueron] porque los alquileres [p:subieron].'),
      u('S', 20.0, 25.4, 'Por eso [p:quise] hablar con mi abuela, que [p:llegó] antes que nadie.'),
    ],
  },
  {
    id: 'narr3',
    name: 'Narración media · toma 3',
    short: 'Narración t3',
    kind: 'narration',
    duration: 22,
    color: COLORS.sofia,
    speakers: S,
    recorded: 'Nov 12',
    takeGroup: 'narr',
    takeNo: 3,
    ownVoice: true,
    note: 'muy rápido, se oye un camión',
    utts: [
      u('S', 0.3, 4.9, 'Don Arturo [p:abrió] la panadería en el ochenta y uno.'),
      u('S', 5.4, 10.2, 'Pero el ?problema es que el barrio está cambiando muy rápido.'),
      u('S', 10.8, 16.0, 'Muchas familias se [p:fueron] porque los alquileres [p:subieron].'),
      u('S', 16.6, 21.5, 'Por eso [p:quise] hablar con mi abuela.'),
    ],
  },
  {
    id: 'arturo',
    name: 'Entrevista · Don Arturo',
    short: 'Don Arturo',
    kind: 'interview',
    duration: 107,
    color: COLORS.arturo,
    speakers: { S: 'Sofía', A: 'Don Arturo' },
    recorded: 'Nov 7',
    ownVoice: false,
    loud: { S: 0.8, A: 1 },
    utts: [
      u('S', 0.8, 4.6, 'Don Arturo, ¿cuándo [p:llegó] usted a La Loma?'),
      u('A', 5.4, 12.8, '[p:Llegué] en el setenta y ocho, con mi esposa. [i:Teníamos] veintidós años y nada más.'),
      u('A', 13.5, 21.0, 'Al principio [p:trabajé] en una fábrica de cajas, allá por la vía del tren.'),
      u('S', 21.8, 25.2, '¿Y cómo [p:empezó] la panadería?'),
      u('A', 26.0, 35.6, 'Mi suegro [i:hacía] pan en Jalisco, y él me [p:enseñó]. En el ochenta y uno [p:abrimos] aquí, en la esquina.'),
      u('A', 36.3, 44.9, 'Los primeros años [i:vendíamos] el pan en una canasta, de puerta en puerta, porque no [i:había] clientes.'),
      u('S', 45.7, 49.0, '¿Qué es lo que más extraña de esos años?'),
      u('A', 49.8, 55.4, 'Ay, mija… la gente. Todos se [i:conocían].'),
      u('A', 56.1, 65.8, 'Las señoras [i:venían] a las seis de la mañana por las conchas, y se [i:quedaban] platicando una hora.'),
      u('A', 66.5, 74.2, 'Los sábados [i:cerrábamos] la calle y [i:había] baile. Mi esposa [i:bailaba] mejor que nadie.'),
      u('S', 75.0, 78.4, '¿Y cómo ve el barrio ahora?'),
      u('A', 79.2, 88.0, 'Ha cambiado mucho. El año pasado [p:cerraron] la tortillería, y luego la zapatería de los Medina.'),
      u('A', 88.7, 97.5, 'Pero el pan sigue igual. Yo sigo abriendo a las seis, como siempre.'),
      u('A', 98.2, 103.6, 'Mientras haya una señora que quiera su concha, aquí voy a estar.'),
      u('S', 104.2, 106.4, 'Gracias, Don Arturo.'),
    ],
  },
  {
    id: 'rosa',
    name: 'Entrevista · Abuela Rosa',
    short: 'Abuela Rosa',
    kind: 'interview',
    duration: 161,
    color: COLORS.rosa,
    speakers: { S: 'Sofía', R: 'Abuela Rosa' },
    recorded: 'Nov 8',
    ownVoice: false,
    loud: { S: 0.8, R: 0.92 },
    utts: [
      u('S', 0.6, 4.2, 'Abuela, ¿cómo [i:era] La Loma cuando [p:llegaste]?'),
      u('R', 5.0, 9.8, 'Uy, mija. Pues mira… déjame pensar.'),
      u('R', 10.6, 19.4, 'Nosotros [i:vivíamos] en Michoacán, en un rancho, y tu abuelo [p:consiguió] trabajo aquí en la construcción,'),
      u('R', 20.1, 26.0, 'y cuando [p:llegamos] en el setenta y dos, todo [i:era] campo.'),
      u('R', 26.8, 35.9, 'Donde ahora está el supermercado [i:había] milpas, y un señor [i:tenía] vacas. ¡Vacas, imagínate!'),
      u('S', 36.6, 39.0, '¿En serio? ¿Vacas?'),
      u('R', 39.7, 47.2, 'Sí, sí. Y no [i:había] calles de cemento, todo [i:era] tierra. Cuando [i:llovía], [i:era] puro lodo.'),
      u('R', 47.9, 57.8, 'Tu abuelo [p:construyó] la casa poco a poco, los fines de semana. Primero un cuarto, luego la cocina…'),
      u('R', 58.5, 66.3, '[p:Tardamos] como diez años. Bueno, en realidad nunca la [p:terminamos], siempre [i:faltaba] algo.'),
      u('R', 67.0, 75.4, 'Y luego, ¿qué más? Ah, mi comadre Lupe [i:vivía] enfrente, y ella [i:tenía] la única tele de la cuadra.'),
      u('R', 76.1, 84.6, 'Todos los niños [i:iban] a su casa a ver las caricaturas. Tu tío Beto también.'),
      u('R', 85.3, 92.0, 'Bueno, eso no importa. ¿Qué me [p:preguntaste]?'),
      u('S', 92.7, 96.8, '¿Cómo [p:empezó] el mercado de los domingos?'),
      u('R', 97.6, 107.9, 'Ah, el mercado. Eso lo [p:empezamos] las mujeres, ¿sabes? En el setenta y nueve.'),
      u('R', 108.6, 118.0, 'No [i:había] tienda cerca, entonces cada una [i:traía] lo que [i:tenía]: nopales, tamales, ropa de los niños.'),
      u('R', 118.7, 126.5, 'El primer domingo [p:fuimos] seis. Al año siguiente ya [i:éramos] más de cuarenta.'),
      u('R', 127.2, 134.0, 'Y ahí [p:conocí] a la mamá de Don Arturo, fíjate.'),
      u('S', 134.7, 138.2, '¿Y ahora? ¿Qué piensas del barrio?'),
      u('R', 138.9, 148.6, 'Ahora hay edificios nuevos y gente que no conozco. Algunos ni saludan.'),
      u('R', 149.3, 160.4, 'Pero los domingos, cuando huelo los elotes en la avenida, me siento otra vez como en el setenta y nueve.'),
    ],
  },
  {
    id: 'mercado',
    name: 'Ambiente · mercado de la Avenida Central',
    short: 'Mercado',
    kind: 'ambience',
    duration: 70,
    color: COLORS.ambience,
    speakers: {},
    recorded: 'Nov 8',
    ownVoice: false,
    events: [
      { t: 3, label: 'Pregón: «¡Aguacates, a veinte!»' },
      { t: 14, label: 'Música de radio de un puesto' },
      { t: 27, label: 'Risas, gente conversando' },
      { t: 41, label: 'Campanita del elotero' },
      { t: 55, label: 'Pregón: «¡Pásele, güera, pásele!»' },
    ],
  },
  {
    id: 'parada',
    name: 'Ambiente · parada de la línea 14',
    short: 'Parada bus',
    kind: 'ambience',
    duration: 45,
    color: COLORS.bus,
    speakers: {},
    recorded: 'Nov 10',
    ownVoice: false,
    events: [
      { t: 6, label: 'Autobús frenando' },
      { t: 12, label: 'Puertas que se abren' },
      { t: 20, label: 'Conversación lejana' },
      { t: 33, label: 'Autobús arrancando' },
    ],
  },
  {
    id: 'sting',
    name: 'Cortinilla «Brisa»',
    short: 'Cortinilla',
    kind: 'music',
    duration: 12,
    color: COLORS.music,
    speakers: {},
    recorded: 'Class library',
    library: 'Guitarra y cajón · biblioteca de la clase',
    ownVoice: false,
  },
  {
    id: 'p1',
    name: 'Pickup 1 · «Esto es Crónica de mi barrio»',
    short: 'Pickup 1',
    kind: 'pickup',
    duration: 4,
    color: COLORS.pickup,
    speakers: S,
    recorded: 'Nov 12',
    ownVoice: true,
    utts: [u('S', 0.4, 3.4, 'Esto es Crónica de mi barrio.')],
  },
  {
    id: 'p2',
    name: 'Pickup 2 · «Don Arturo tenía veintidós años…»',
    short: 'Pickup 2',
    kind: 'pickup',
    duration: 5,
    color: COLORS.pickup,
    speakers: S,
    recorded: 'Nov 12',
    ownVoice: true,
    utts: [u('S', 0.4, 4.5, 'Don Arturo [i:tenía] veintidós años cuando [p:llegó].')],
  },
  {
    id: 'p3',
    name: 'Pickup 3 · «Mi abuela llegó al barrio…»',
    short: 'Pickup 3',
    kind: 'pickup',
    duration: 5,
    color: COLORS.pickup,
    speakers: S,
    recorded: 'Nov 12',
    ownVoice: true,
    utts: [u('S', 0.3, 4.6, 'Mi abuela [p:llegó] al barrio en el setenta y dos.')],
  },
  {
    id: 'p4',
    name: 'Pickup 4 · «Los domingos, la avenida huele…»',
    short: 'Pickup 4',
    kind: 'pickup',
    duration: 6,
    color: COLORS.pickup,
    speakers: S,
    recorded: 'Nov 12',
    ownVoice: true,
    utts: [u('S', 0.4, 5.5, 'Los domingos, la avenida huele a elote y a pan dulce.')],
  },
  {
    id: 'p5',
    name: 'Pickup 5 · «Ahora, escuchemos a mi abuela»',
    short: 'Pickup 5',
    kind: 'pickup',
    duration: 4,
    color: COLORS.pickup,
    speakers: S,
    recorded: 'Nov 12',
    ownVoice: true,
    utts: [u('S', 0.3, 3.6, 'Ahora, escuchemos a mi abuela.')],
  },
];

export const initialClips: Clip[] = defs.map(build);

// Current draft arrangement: 0:38 + 0:15 + 1:47 + 0:31 + 2:41 = 5:52
export const initialSegs: Segment[] = [
  { id: 'seg-intro', clipId: 'intro', track: 'voice', in: 0, out: 38, start: 0, gain: 0 },
  { id: 'seg-mercado', clipId: 'mercado', track: 'voice', in: 12, out: 27, start: 0, gain: 0 },
  { id: 'seg-arturo', clipId: 'arturo', track: 'voice', in: 0, out: 107, start: 0, gain: 0 },
  { id: 'seg-narr1', clipId: 'narr1', track: 'voice', in: 0, out: 31, start: 0, gain: 0 },
  { id: 'seg-rosa', clipId: 'rosa', track: 'voice', in: 0, out: 161, start: 0, gain: 0 },
];

export type CommentCategory = 'Pronunciation' | 'Structure' | 'Content' | 'Past tenses';

export interface TeacherComment {
  id: string;
  n: number;
  anchor: Anchor;
  draftPos: number;
  category: CommentCategory;
  text: string;
  date: string;
  action?: 'rerecord' | 'trim-rosa' | 'closing';
}

export const teacherComments: TeacherComment[] = [
  {
    id: 'c1',
    n: 1,
    anchor: { clipId: 'narr1', t: 15.2 },
    draftPos: 38 + 15 + 107 + 15.2,
    category: 'Pronunciation',
    text: 'Aquí dices «el ploblema». Es pro-BLE-ma, con una «r» suave después de la p. Vuelve a grabar solo esta frase; no hace falta repetir toda la toma.',
    date: 'Fri, Nov 13',
    action: 'rerecord',
  },
  {
    id: 'c2',
    n: 2,
    anchor: { clipId: 'rosa', t: 68.0 },
    draftPos: 38 + 15 + 107 + 31 + 68,
    category: 'Structure',
    text: 'La entrevista con tu abuela dura 2:41 y aquí se alarga. Lo de la comadre Lupe y la tele es muy bonito, pero no es tu tema. Quédate con sus mejores respuestas: la llegada en el 72, la casa y el mercado.',
    date: 'Fri, Nov 13',
    action: 'trim-rosa',
  },
  {
    id: 'c3',
    n: 3,
    anchor: { end: true },
    draftPos: 352,
    category: 'Structure',
    text: 'El final se queda en el aire: termina con la voz de tu abuela. Necesitas una frase de cierre con TU voz. ¿Qué aprendiste de tu barrio? Usa el pretérito o el imperfecto.',
    date: 'Fri, Nov 13',
    action: 'closing',
  },
];

export const overallNote = {
  date: 'Fri, Nov 13',
  text: 'Sofía, ¡las entrevistas tienen mucha vida! Muy buen uso del imperfecto para describir cómo era el barrio. Para la versión final: entre 3 y 4 minutos, corrige la pronunciación que te marqué y termina con tu propia voz.',
};

export interface RubricCriterion {
  id: 'content' | 'pron' | 'past' | 'structure';
  name: string;
  es: string;
  draft: number;
  full: string;
  remark: string;
}

export const rubric: RubricCriterion[] = [
  {
    id: 'content',
    name: 'Content',
    es: 'Contenido',
    draft: 22,
    full: 'Two or more voices from the neighborhood; clear sense of how the barrio has changed; details a listener can picture.',
    remark: 'Great details (las vacas, las conchas). Keep them!',
  },
  {
    id: 'pron',
    name: 'Pronunciation',
    es: 'Pronunciación',
    draft: 18,
    full: 'Narration is clear and understandable; vowels are pure; r / rr and stress are accurate.',
    remark: 'Revisa «problema». Habla un poco más despacio en la narración.',
  },
  {
    id: 'past',
    name: 'Use of past tenses',
    es: 'Uso de los pasados',
    draft: 21,
    full: 'Preterite for completed events, imperfect for description and habits, used correctly in your own narration.',
    remark: 'Bien: «abrió», «tenía», «jugaban». Use one in your closing line too.',
  },
  {
    id: 'structure',
    name: 'Structure',
    es: 'Estructura',
    draft: 14,
    full: '3:00–4:00 total. Clear opening, segments in an order that tells a story, a closing line in your own voice.',
    remark: 'Too long (5:52) and no ending in your voice yet.',
  },
];
