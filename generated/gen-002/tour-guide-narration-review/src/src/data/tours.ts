import type { Item, Segment } from '../types';
import { ts } from './parse';
import { ribeira } from './ribeira';

interface Route {
  name: string;
  stops: [string, number, string][]; // title, planned minutes, a line Inês says there
}

const ROUTES: Record<string, Route> = {
  baixa: {
    name: 'Baixa & Bolhão Food Walk',
    stops: [
      ['Avenida dos Aliados — meeting point', 10, 'This avenue is where Porto celebrates everything — football, São João, New Year. If something good happens, people come here.'],
      ['Café Majestic', 12, 'The Majestic opened in 1921. Look at the mirrors and the carved wood — this was where the city came to be seen.'],
      ['Rua de Santa Catarina', 9, 'This is the shopping street, but I want you to look above the shop windows, at the first floor. That is the real Porto.'],
      ['Capela das Almas', 10, 'All of this outside is tiles. Almost sixteen thousand. Stand on the other side of the street, you see it better.'],
      ['Mercado do Bolhão', 25, 'The market reopened in 2022 after the restoration. Most of the vendors came back — Dona Lurdes with the flowers has been here forty years.'],
      ['Confeitaria do Bolhão — pastéis', 14, 'Here we try the pastel de nata — and I will tell you why the Porto ones are just as good as Lisbon ones.'],
      ['Rua Formosa grocers', 12, 'This shop still weighs the coffee and the dried cod the old way. Smell it before you go in.'],
      ['Francesinha at Praça dos Poveiros', 22, 'The francesinha. A sandwich, but also a way of life. Meat, cheese, more meat, and the sauce — every café guards its recipe.'],
      ['Trindade — wrap-up', 6, 'From here you have the metro to everywhere. Thank you, and please go home and have a nap.'],
    ],
  },
  miragaia: {
    name: 'Miragaia: The Forgotten Riverside',
    stops: [
      ['Alfândega Nova — customs house', 10, 'The customs house is from 1859. All the goods arriving by river had to pass through here and pay.'],
      ['Igreja de São Pedro de Miragaia', 12, 'This little church is the heart of Miragaia — the fishermen came here before they went to sea.'],
      ['The arcades of Rua de Miragaia', 14, 'These arcades kept the merchants dry. Some of the houses still have the old shop doors from the 1700s.'],
      ['Escadas do Caminho Novo', 10, 'Yes, we climb. One hundred and twenty steps. I promise the view is worth it.'],
      ['Tasca on Rua de Tomar — sardines', 22, 'In season, we eat sardines here grilled on the street, on a slice of bread, with the fingers.'],
      ['Jardins do Palácio de Cristal', 18, 'The gardens are full of peacocks. They are loud and they know they are beautiful.'],
      ['Miradouro over the Douro', 10, 'From here you can see the whole river mouth, all the way to the sea at Foz.'],
      ['Massarelos — wrap-up by the river', 8, 'Down there is where the Massarelos tile factory used to be. Thank you all!'],
    ],
  },
  se: {
    name: 'Sé & the Medieval Walls',
    stops: [
      ['Terreiro da Sé', 12, 'The cathedral is a fortress first and a church second. Look at the walls — they were built to be defended.'],
      ['The cathedral cloister', 15, 'The cloister has tiles from the 1730s inside — this is the classic blue and white, Great Production period.'],
      ['Paço Episcopal', 8, 'The bishop’s palace. For centuries the bishop was the lord of the city, and he lived like it.'],
      ['Muralha Fernandina', 12, 'This is the wall from the fourteenth century. Most of it was demolished, but this stretch survived.'],
      ['Escadas das Verdades', 10, 'The Stairs of Truths. Nobody agrees why they have this name. I have three theories and I will tell you all of them.'],
      ['Bairro da Sé — Rua de Dom Hugo', 14, 'This neighbourhood is the oldest in Porto. People have lived on this hill for more than two thousand years.'],
      ['Casa-Museu Guerra Junqueiro', 10, 'A poet’s house, full of his collections. The garden at the back has the best quiet view in the old town.'],
      ['Largo da Pena Ventosa — wrap-up', 9, 'Pena Ventosa means windy rock. You can feel why. Thank you all, obrigada!'],
    ],
  },
  foz: {
    name: 'Foz do Douro — Sea Air & Seafood',
    stops: [
      ['Passeio Alegre garden', 10, 'This garden was where the rich families of Porto came for the sea air in the nineteenth century.'],
      ['Farolim de Felgueiras', 12, 'The little lighthouse at the end of the pier. On a stormy day the waves go over the top of it.'],
      ['Praia dos Ingleses', 10, 'The English beach — the merchants’ families bathed here, in long striped costumes.'],
      ['Pastelaria in Foz Velha', 14, 'In Foz Velha we have a bolo de arroz, a rice cake, with a galão — milky coffee in a glass.'],
      ['Avenida Brasil promenade', 16, 'This promenade is the longest walk in Porto without a hill. Enjoy it, it’s rare.'],
      ['Castelo do Queijo', 10, 'The Cheese Castle. Because the rock it sits on looks like a cheese. That is really the reason.'],
      ['Matosinhos fish market', 22, 'The boats come in early; by nine everything is sold to the restaurants on the street behind us.'],
      ['Grilled fish lunch on Rua Heróis de França', 26, 'Here they grill outside, on the street, in big iron grills. Choose your fish, they weigh it.'],
    ],
  },
  gaia: {
    name: 'Gaia Lodges & the Port Trade',
    stops: [
      ['Lower deck, Dom Luís I bridge', 8, 'We cross on the lower deck — look back at the Ribeira, it’s the postcard view.'],
      ['Cais de Gaia — the rabelo moorings', 12, 'Each of these boats belongs to a port house. On the 24th of June they race them.'],
      ['A family lodge on Rua de Cândido dos Reis', 28, 'This lodge is still family owned. The barrels at the back have been here since before my grandmother was born.'],
      ['Cooperage workshop', 14, 'The cooper repairs barrels by hand, with fire and water. There are very few left who can do it.'],
      ['Tasting — tawny and ruby', 24, 'Smell first, then taste. Tawny is from the small barrels, ruby from the big vats.'],
      ['Mosteiro da Serra do Pilar viewpoint', 16, 'The round monastery on the hill — Wellington used it in 1809 to plan how to cross the river.'],
      ['Cable car down to the quay', 10, 'The cable car takes six minutes. Some people close their eyes. That’s fine.'],
      ['Wrap-up at Cais de Gaia', 8, 'Thank you all. If you buy a bottle, buy a tawny — and keep it for a cold evening.'],
    ],
  },
  cedofeita: {
    name: 'Cedofeita & Bombarda: Bakeries and Galleries',
    stops: [
      ['Praça de Carlos Alberto', 8, 'This square was a market for cattle, then a place for political meetings. Now it’s a place for coffee.'],
      ['Rua de Cedofeita bakery', 14, 'The broa — corn bread — comes out at ten. If we are lucky, it is still warm.'],
      ['Igreja de São Martinho de Cedofeita', 12, 'This is the oldest church in Porto, Romanesque, twelfth century. Small, plain and very beautiful.'],
      ['Rua de Miguel Bombarda galleries', 22, 'On opening Saturdays all the galleries open together and the whole street becomes a party.'],
      ['Courtyard of the Centro Comercial Bombarda', 14, 'This was a car garage. Now it is shops of local designers — ceramics, prints, bags.'],
      ['Vegetarian tasca on Rua do Rosário', 22, 'Not everything in Porto is meat and fish. Here they do caldo verde without chouriço and it’s still perfect.'],
      ['Jardim do Carregal', 8, 'A small garden with a big magnolia. In March it’s the most beautiful tree in the city.'],
      ['Wrap-up at Praça dos Leões', 8, 'The fountain with the lions — university students used to throw each other in. Some still do.'],
    ],
  },
  bonfim: {
    name: 'Bonfim: The East Side',
    stops: [
      ['Campo 24 de Agosto', 8, 'This square is named after the liberal revolution of 1820, which started here in Porto.'],
      ['Igreja do Bonfim', 10, 'The neighbourhood takes its name from this church. Good end — Bonfim.'],
      ['Ilhas of Rua do Duque de Saldanha', 18, 'These are the ilhas — workers’ houses behind the street front, built for the factory families.'],
      ['Old Fábrica de Fiação', 12, 'This was a textile mill. Hundreds of women worked here, many of them under fourteen.'],
      ['Mercearia on Rua do Heroísmo', 16, 'A grocery that has not changed since 1950. Ask for the queijo da serra, she’ll give you a taste.'],
      ['Cemitério do Prado do Repouso', 14, 'The cemetery is beautiful and a little strange. The merchant families built small palaces for their dead.'],
      ['Tasca on Rua do Bonfim — petiscos', 26, 'Petiscos are small plates. We share everything. Nobody orders just for themselves.'],
      ['Jardim de São Lázaro — wrap-up', 10, 'The oldest public garden in Porto, from 1834. Thank you all for coming east with me.'],
    ],
  },
};

// [route, date, label, duration h:mm:ss, guests]
const RECORDINGS: [keyof typeof ROUTES, string, string, string, number][] = [
  ['baixa', '2020-09-12', 'Trial run', '2:28:40', 4],
  ['baixa', '2020-10-03', 'Second run', '2:14:05', 9],
  ['baixa', '2020-11-21', 'Full run', '2:02:30', 11],
  ['se', '2021-04-17', 'Trial run', '2:31:10', 5],
  ['se', '2021-05-08', 'Second run', '2:09:45', 10],
  ['baixa', '2021-06-19', 'Summer version', '1:58:20', 12],
  ['se', '2021-09-25', 'Full run', '1:52:15', 12],
  ['miragaia', '2022-03-12', 'Trial run', '2:24:50', 6],
  ['miragaia', '2022-04-02', 'Second run', '2:07:40', 9],
  ['baixa', '2022-05-14', 'After Bolhão closure — temporary market', '1:49:30', 10],
  ['miragaia', '2022-06-25', 'Full run', '1:56:05', 11],
  ['foz', '2022-09-10', 'Trial run', '2:29:55', 6],
  ['foz', '2022-10-01', 'Second run', '2:12:10', 8],
  ['se', '2022-10-29', 'Rain version — indoor stops', '1:44:20', 7],
  ['baixa', '2022-11-26', 'Bolhão reopened', '2:06:00', 12],
  ['foz', '2023-04-15', 'Full run', '2:01:35', 10],
  ['gaia', '2023-05-20', 'Trial run', '2:27:30', 5],
  ['gaia', '2023-06-10', 'Second run', '2:11:00', 10],
  ['gaia', '2023-07-08', 'Full run', '1:59:10', 12],
  ['miragaia', '2023-09-16', 'New sardine stop', '2:03:45', 9],
  ['cedofeita', '2023-10-14', 'Trial run', '2:22:40', 4],
  ['cedofeita', '2023-11-04', 'Second run', '2:05:25', 8],
  ['se', '2024-03-23', 'Refresh', '1:57:50', 11],
  ['cedofeita', '2024-04-13', 'Gallery Saturday version', '2:18:15', 12],
  ['gaia', '2024-06-22', 'São João week', '2:09:30', 12],
  ['foz', '2024-09-07', 'Matosinhos extension', '2:26:05', 9],
  ['bonfim', '2024-10-19', 'Trial run', '2:30:20', 5],
  ['bonfim', '2024-11-09', 'Second run', '2:13:40', 8],
  ['bonfim', '2025-03-15', 'Full run', '2:01:15', 10],
  ['baixa', '2025-04-26', 'Refresh — new pastelaria', '1:54:40', 12],
  ['cedofeita', '2025-05-24', 'Full run', '1:58:05', 10],
  ['gaia', '2025-07-12', 'Private group — Dutch family', '1:41:50', 6],
  ['miragaia', '2025-09-20', 'Refresh', '2:00:30', 11],
  ['bonfim', '2025-10-18', 'With the ilhas residents’ association', '2:17:25', 9],
  ['se', '2026-04-11', 'Refresh', '1:55:10', 12],
  ['foz', '2026-06-13', 'Summer version', '2:08:45', 12],
];

function buildTour(idx: number): Item {
  const [routeKey, date, label, dur, guests] = RECORDINGS[idx];
  const route = ROUTES[routeKey];
  const duration = ts(dur);
  const planned = route.stops.reduce((a, s) => a + s[1], 0) * 60;
  // Distribute actual time roughly in proportion to plan, with deterministic variation.
  const weights = route.stops.map((s, i) => s[1] * (0.85 + (((idx * 7 + i * 13) % 11) / 11) * 0.4));
  const wsum = weights.reduce((a, b) => a + b, 0);
  let cursor = 0;
  const chapters = route.stops.map((s, i) => {
    const len = i === route.stops.length - 1 ? duration - cursor : Math.round((weights[i] / wsum) * duration);
    const ch = { title: s[0], start: cursor, end: cursor + len, planned: s[1] * 60 };
    cursor += len;
    return ch;
  });
  const transcript: Segment[] = [];
  chapters.forEach((ch, i) => {
    transcript.push({ t: ch.start, speaker: 'Inês', text: i === 0 ? 'Bom dia, everyone — okay, I think we are all here. Let’s start.' : 'Okay, gather in close, everyone. Here we are.' });
    transcript.push({ t: ch.start + 45, speaker: 'Inês', text: route.stops[i][2] });
    if (i < chapters.length - 1) transcript.push({ t: ch.end - 100, speaker: 'none', text: '[Walking]' });
  });
  return {
    id: `tour-${routeKey}-${date}`,
    kind: 'tour',
    title: route.name,
    subtitle: label,
    route: route.name,
    date,
    duration,
    planned,
    guests,
    chapters,
    transcript,
    position: 0,
    played: duration,
  };
}

export const tours: Item[] = [ribeira, ...RECORDINGS.map((_, i) => buildTour(i)).reverse()];
