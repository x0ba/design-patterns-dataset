import type { Item, Segment } from '../types';
import { parseTranscript, ts } from './parse';

export const AUTHOR = 'Margarida Teixeira Lopes';
export const SERIES = 'Porto, Read Closely — heritage lectures';

const azulejoTranscript = parseTranscript(`
0:00|M|Olá, and welcome back. This is the fourth lecture in the series, and if I'm honest it's the one I most enjoy giving, because tiles are the one part of Portuguese heritage that everybody already notices. My job today is to help you date what you're noticing.
0:38|M|We'll move fast — five centuries in fourteen minutes — so I'll give you a few anchor dates to hold on to. If you work as a guide, these are the ones visitors will ask you about.
1:05|M|First, the word. Azulejo comes from the Arabic al-zulayj — a small polished stone. It has nothing to do with azul, blue, whatever you may have heard on a tour. Blue arrives much later.
1:52|M|The earliest tiles used in Portugal were imported, mostly from Seville, at the end of the fifteenth and the start of the sixteenth century. The Hispano-Moresque techniques — corda seca, aresta — kept the colours apart with ridges or lines of grease.
2:40|M|The great example is the National Palace of Sintra, where King Manuel I installed Sevillian tiles after his journey through Andalusia. If you want to see what the very beginning looked like, that's where you go.
3:20|M|By the middle of the sixteenth century, Flemish and Italian potters bring the maiolica technique to Lisbon. Now you can paint directly onto a flat glazed surface. That changes everything — tiles can carry pictures, not just patterns.
4:10|M|Through the seventeenth century the dominant style is what we call azulejo de padrão, or tapete — carpet tiling. Repeating patterns of four, sixteen or more tiles, in blue, yellow and green, covering entire walls of churches like a textile.
4:55|M|It was cheaper than tapestry and it didn't rot. In a humid country, that matters. You'll still find whole naves covered this way, especially in smaller churches in the north and in the Alentejo.
5:30|M|If you see a repeating geometric pattern in blue and yellow, think seventeenth century first. That's your quick rule of thumb.
5:47|M|Now hold that in your mind, because what comes next is the opposite: a single colour, and a single enormous picture.
6:05|M|Around 1690 to 1700, under the influence of Dutch Delftware, Portuguese workshops shift almost entirely to blue on white. And then, between roughly 1725 and 1755, we get what historians call the Grande Produção — the Great Production — under King João V, paid for with Brazilian gold.
6:50|M|These are the large figurative panels: saints, hunting scenes, biblical stories, framed by painted baroque borders. Painted as one composition, numbered tile by tile on the back, then assembled on site.
7:30|M|And here is the point I want guides to be careful about. Almost all of this Great Production work was made for interiors — naves, cloisters, sacristies, the staircases of palaces. If someone tells you a church's tile panels date from the 1730s, they are almost certainly describing what's inside.
8:10|M|A tiled façade on a Porto church with a date in the 1730s should make you suspicious. Ask whether the façade tiles were added later — very often they were, in the nineteenth or even the twentieth century.
8:40|M|After the earthquake of 1755, Lisbon has to be rebuilt quickly, and the tile trade becomes just that — an industry. The Real Fábrica do Rato opens in Lisbon in 1767. Simpler patterns, faster production, the so-called Pombaline style.
9:25|M|In the north, Porto develops its own production. The Fábrica de Louça de Massarelos, on the riverbank west of the Alfândega, is founded in 1763 — it's generally considered the first of the city's great ceramic factories. Later come Miragaia, Santo António do Vale da Piedade and, across the river in Gaia, the Fábrica das Devesas.
10:15|M|Write that date down — 1763 — because you will hear 1766 and other years quoted. Massarelos kept going into the twentieth century; you can still find its marks on the backs of tiles in the city's collections.
10:55|M|Now — the moment Porto becomes the tiled city we know. Exterior tiling of ordinary houses is overwhelmingly a nineteenth-century phenomenon, and it really takes off from the 1840s and 1850s.
11:30|M|Part of the push came from the brasileiros de torna-viagem — emigrants returning rich from Brazil, where tiled façades were already common as protection against heat and damp. They built houses back home that announced their success.
12:05|M|Industrial production made it affordable: stamped and relief tiles, often from Porto and Gaia factories, sold by the square metre. That's why you find whole streets of tiled fronts in Porto, Ovar and Aveiro.
12:50|M|In the twentieth century the large narrative panel comes back — but outdoors, and on public buildings. Jorge Colaço's panels at São Bento station, completed in 1916, and his façade for Santo Ildefonso in 1932.
13:25|M|And the Capela das Almas on Rua de Santa Catarina — Eduardo Leite, 1929 — nearly sixteen thousand tiles in blue and white, imitating the eighteenth-century style. A twentieth-century façade dressed as an eighteenth-century one. Which is exactly why dating by eye alone can mislead you.
13:55|M|Next time: granite and gold — the baroque interiors of Porto. Até à próxima.
`);

export const AZULEJO_ID = 'lec-azulejos';

interface LecDef {
  id: string;
  title: string;
  duration: string;
  date: string;
  played: number; // fraction
  chapters: [string, string, string][]; // title, start, opening line
}

const defs: LecDef[] = [
  {
    id: 'lec-ribeira-medieval',
    title: 'The Ribeira Before the Quays: A Medieval Waterfront',
    duration: '22:30',
    date: '2025-03-02',
    played: 1,
    chapters: [
      ['A beach, not a quay', '0:00', 'Until the fifteenth century the Ribeira was a sloping beach of sand and mud where boats were simply dragged ashore.'],
      ['The Fernandine wall', '6:40', 'The wall finished under King Fernando in the 1370s enclosed the riverfront, with gates opening straight onto the water.'],
      ['Merchants and the bishop', '13:15', 'Who collected the tolls on the river was the great quarrel of medieval Porto — the bishop or the crown.'],
      ['Building the Cais', '18:50', 'The stone quays we know were built in stages from the late eighteenth century onwards.'],
    ],
  },
  {
    id: 'lec-port-trade',
    title: 'Port Wine and the Douro: Trade, Treaties and the 1756 Demarcation',
    duration: '31:15',
    date: '2024-11-20',
    played: 1,
    chapters: [
      ['Why the English came', '0:00', 'War with France closed the English market to French wine, and the merchants went looking for something to replace it.'],
      ['The Methuen Treaty, 1703', '7:30', 'Lower duties on Portuguese wine in exchange for English cloth — it shaped the river for two centuries.'],
      ['Pombal draws a line', '15:10', 'In 1756 the Marquis of Pombal created the Douro demarcation, one of the oldest regulated wine regions in the world.'],
      ['From rabelo to railway', '24:40', 'The arrival of the Douro railway in the 1880s ended the age of the rabelo boats as working vessels.'],
    ],
  },
  {
    id: 'lec-baroque',
    title: "Granite and Gold: Porto's Baroque Churches",
    duration: '38:40',
    date: '2026-10-14',
    played: 0,
    chapters: [
      ['Talha dourada', '0:00', 'Gilded woodcarving — talha dourada — is the signature of the Portuguese baroque interior.'],
      ['São Francisco', '9:20', 'The Gothic shell of São Francisco hides one of the most complete gilded interiors in the country.'],
      ['Santa Clara', '19:05', 'Santa Clara, beside the old wall, is smaller and in some ways even more overwhelming.'],
      ['How to describe gold without saying "gold"', '30:10', 'For guides: some ways to help visitors actually look, rather than just photograph.'],
    ],
  },
  {
    id: 'lec-nasoni',
    title: 'Nasoni: An Italian Architect in Porto',
    duration: '18:20',
    date: '2025-06-11',
    played: 1,
    chapters: [
      ['From Tuscany to the Douro', '0:00', 'Nicolau Nasoni arrived in Porto in 1725, hired to decorate the cathedral, and stayed for the rest of his life.'],
      ['The Clérigos tower', '6:10', 'The tower of the Clérigos, finished in 1763, became the landmark sailors used to find the river mouth.'],
      ['Nasoni across the city', '12:40', 'Once you can recognise his curves and shell motifs, you start to see Nasoni everywhere in the old town.'],
    ],
  },
  {
    id: 'lec-siege',
    title: 'The Siege of Porto, 1832–33',
    duration: '27:05',
    date: '2025-09-04',
    played: 0.62,
    chapters: [
      ['Two brothers, one crown', '0:00', 'The Liberal Wars were, at heart, a family quarrel between Pedro and Miguel over the Portuguese throne.'],
      ['The landing at Mindelo', '7:45', 'In July 1832 Pedro landed north of Porto with about seven thousand men and took the city almost without a fight.'],
      ['A year of hunger', '14:20', 'Then Miguel’s army surrounded the city. Shelling, hunger and cholera followed — and fires, including the one at the São Francisco convent in July 1832.'],
      ['Invicta', '22:30', 'The city never fell, and the title Invicta — unconquered — is still on Porto’s coat of arms.'],
    ],
  },
  {
    id: 'lec-tripeiros',
    title: "Tripeiros: The Story Behind Porto's Nickname",
    duration: '9:12',
    date: '2024-04-18',
    played: 1,
    chapters: [
      ['The Ceuta story', '0:00', 'The tradition says that in 1415 Porto gave its meat to the fleet sailing for Ceuta and kept only the offal.'],
      ['What the sources say', '3:30', 'The written evidence for the story is late, which doesn’t make it less important to the city.'],
      ['Tripas today', '6:50', 'Tripas à moda do Porto remains the dish that every family here has an opinion about.'],
    ],
  },
  {
    id: 'lec-bacalhau',
    title: 'Cod, Salt and Empire: Bacalhau in Portuguese Kitchens',
    duration: '24:48',
    date: '2024-04-18',
    played: 1,
    chapters: [
      ['Fish from far away', '0:00', 'Not one cod in a Portuguese kitchen was caught in Portuguese waters — and that is the start of the story.'],
      ['The White Fleet', '8:15', 'Through the twentieth century the White Fleet sailed every year for the Grand Banks of Newfoundland.'],
      ['Salt from Aveiro', '15:40', 'Without salt from the lagoons of Aveiro and the Sado, there would be no bacalhau culture at all.'],
      ['A thousand recipes', '20:30', 'Everyone says there are 365 recipes. Nobody has ever actually counted.'],
    ],
  },
  {
    id: 'lec-brasileiros',
    title: 'The Brasileiros de Torna-Viagem and Their Houses',
    duration: '16:35',
    date: '2026-10-14',
    played: 0,
    chapters: [
      ['Leaving and coming back', '0:00', 'Hundreds of thousands left northern Portugal for Brazil in the nineteenth century; a few came back very rich.'],
      ['A house that says "I made it"', '5:50', 'Palm trees in the garden, tiles on the front, a little tower — the brasileiro house had a vocabulary of its own.'],
      ['Where to find them', '11:30', 'From Ovar to the Minho, and in Porto’s own western parishes, the houses are still there if you know how to look.'],
    ],
  },
  {
    id: 'lec-bridges',
    title: 'Iron on the River: The Bridges of Porto',
    duration: '19:50',
    date: '2025-03-02',
    played: 1,
    chapters: [
      ['The bridge of boats', '0:00', 'Before iron, there was a bridge of boats — and the disaster of 1809, when it collapsed under people fleeing the French.'],
      ['Eiffel and Seyrig', '6:20', 'The Maria Pia bridge of 1877 came from Eiffel’s company; the Dom Luís I bridge of 1886 was designed by Théophile Seyrig.'],
      ['Concrete and the twentieth century', '13:45', 'The Arrábida bridge of 1963 was, for a while, the longest concrete arch in the world.'],
    ],
  },
  {
    id: 'lec-bolhao',
    title: 'The Bolhão Market: 1914 to Today',
    duration: '15:22',
    date: '2025-01-09',
    played: 0.3,
    chapters: [
      ['A market in a hollow', '0:00', 'The name Bolhão comes from a spring and a hollow in the ground where the market first gathered.'],
      ['The building', '5:10', 'The building we know opened in 1914, around a central courtyard with two levels of stalls.'],
      ['Restoration and return', '10:40', 'After years of restoration, the market reopened in 2022 — with most of the old vendors back in place.'],
    ],
  },
  {
    id: 'lec-olival',
    title: 'The Jewish Quarter of Olival',
    duration: '40:00',
    date: '2025-09-04',
    played: 0,
    chapters: [
      ['Inside the walls', '0:00', 'From 1386 Porto’s Jewish community lived in the Judiaria do Olival, around today’s Vitória.'],
      ['Daily life', '11:30', 'Merchants, doctors, craftsmen — the community was central to the city’s trade.'],
      ['1496 and after', '22:15', 'The decree of expulsion of 1496 and the forced conversions that followed changed everything.'],
      ['What remains', '33:00', 'Very little is visible above ground — which makes it all the more important to tell the story well.'],
    ],
  },
];

function buildLecture(d: LecDef): Item {
  const duration = ts(d.duration);
  const chapters = d.chapters.map(([title, start], i) => ({
    title,
    start: ts(start),
    end: i < d.chapters.length - 1 ? ts(d.chapters[i + 1][1]) : duration,
  }));
  const transcript: Segment[] = d.chapters.map(([, start, line]) => ({ t: ts(start), speaker: 'Margarida', text: line }));
  const pos = d.played >= 1 ? 0 : Math.round(duration * d.played);
  return {
    id: d.id,
    kind: 'lecture',
    title: d.title,
    subtitle: SERIES,
    author: AUTHOR,
    date: d.date,
    duration,
    chapters,
    transcript,
    position: pos,
    played: Math.round(duration * d.played),
  };
}

export const azulejo: Item = {
  id: AZULEJO_ID,
  kind: 'lecture',
  title: 'Azulejos: How Porto Learned to Wear Tiles',
  subtitle: SERIES,
  author: AUTHOR,
  date: '2026-10-14',
  duration: ts('14:06'),
  chapters: [
    { title: 'Introduction — what the word means', start: 0, end: ts('1:52') },
    { title: 'From Seville to Lisbon', start: ts('1:52'), end: ts('4:10') },
    { title: 'Carpets of tile: the 1600s', start: ts('4:10'), end: ts('6:05') },
    { title: 'The blue-and-white century', start: ts('6:05'), end: ts('8:40') },
    { title: "Factories, and Porto's own", start: ts('8:40'), end: ts('10:55') },
    { title: 'Tiles move outdoors', start: ts('10:55'), end: ts('12:50') },
    { title: 'Twentieth-century Porto', start: ts('12:50'), end: ts('14:06') },
  ],
  transcript: azulejoTranscript,
  position: ts('5:47'),
  played: ts('5:47'),
};

export const lectures: Item[] = [azulejo, ...defs.map(buildLecture)];
