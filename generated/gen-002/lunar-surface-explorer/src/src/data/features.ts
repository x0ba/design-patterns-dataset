import { slug } from '../lib/geo';

export type FeatureKind = 'crater' | 'mare' | 'mountain' | 'rille';

export interface Feature {
  id: string;
  name: string;
  kind: FeatureKind;
  lat: number;
  lon: number;
  /** Width in km (length for mountain ranges and rilles). */
  diameter: number;
  /** Depth in km (craters) */
  depth: number | null;
  /** Height in km (mountains) */
  height?: number | null;
  ageMyr: number | null;
  namedAfter: string;
  blurb?: string;
  english?: string;
  /** For lettered satellite craters */
  parent?: string;
  psr?: { share: number; minTempK: number };
  rays?: boolean;
  floorDark?: boolean;
}

const out: Feature[] = [];

function C(
  name: string, lat: number, lon: number, diameter: number, depth: number | null,
  ageMyr: number | null, namedAfter: string, extra: Partial<Feature> = {},
) {
  out.push({ id: slug(name), name, kind: 'crater', lat, lon, diameter, depth, ageMyr, namedAfter, ...extra });
}
function M(name: string, english: string, lat: number, lon: number, diameter: number, ageMyr: number, blurb?: string) {
  out.push({
    id: slug(name), name, kind: 'mare', lat, lon, diameter, depth: null, ageMyr, english,
    namedAfter: `Latin for “${english}”. Early telescope observers thought these dark plains were oceans.`,
    blurb,
  });
}
function Mt(name: string, lat: number, lon: number, length: number, height: number | null, namedAfter: string, blurb?: string) {
  out.push({ id: slug(name), name, kind: 'mountain', lat, lon, diameter: length, depth: null, height, ageMyr: 3900, namedAfter, blurb });
}
function Ri(name: string, lat: number, lon: number, length: number, namedAfter: string, blurb?: string) {
  out.push({ id: slug(name), name, kind: 'rille', lat, lon, diameter: length, depth: 0.4, ageMyr: 3400, namedAfter, blurb });
}

/* ───────── South polar region ───────── */
C('Shackleton', -89.9, 0.0, 21, 4.2, 3100, 'Ernest Shackleton, Anglo-Irish Antarctic explorer (1874–1922)',
  { psr: { share: 1.0, minTempK: 38 },
    blurb: 'Sits almost exactly on the Moon’s south pole. Its floor has not seen sunlight for billions of years.' });
C('Haworth', -87.5, -5.0, 51, 3.8, 3900, 'Sir Walter Norman Haworth, British chemist and Nobel laureate (1883–1950)',
  { psr: { share: 0.97, minTempK: 39 } });
C('de Gerlache', -88.5, -87.1, 32, 4.0, 3900, 'Adrien de Gerlache, Belgian leader of the 1897–99 Belgica Antarctic expedition',
  { psr: { share: 0.92, minTempK: 40 } });
C('Faustini', -87.3, 77.0, 39, 3.6, 3900, 'Alessandro Faustini, an Italian scientist',
  { psr: { share: 0.99, minTempK: 37 } });
C('Shoemaker', -88.1, 44.9, 51, 4.0, 3900, 'Eugene Shoemaker, American geologist who pioneered the study of impact craters (1928–1997)',
  { psr: { share: 0.89, minTempK: 41 } });
C('Sverdrup', -88.5, -152.0, 30, 3.0, 3900, 'Harald Sverdrup, Norwegian oceanographer and polar explorer',
  { psr: { share: 0.95, minTempK: 40 } });
C('Cabeus', -84.9, -35.5, 98, 4.0, 3900, 'Niccolò Cabeo, Italian Jesuit scholar (1586–1650)',
  { psr: { share: 0.74, minTempK: 42 }, blurb: 'In 2009 NASA’s LCROSS probe crashed into Cabeus on purpose and found water in the debris plume.' });
C('Nobile', -85.2, 53.3, 73, 3.2, 3900, 'Umberto Nobile, Italian airship designer and Arctic explorer (1885–1978)',
  { psr: { share: 0.63, minTempK: 44 } });
C('Amundsen', -84.5, 82.8, 101, 4.1, 3900, 'Roald Amundsen, Norwegian explorer, first to reach the South Pole (1872–1928)',
  { psr: { share: 0.41, minTempK: 46 } });
C('Malapert', -84.9, 0.4, 69, 3.0, 3900, 'Charles Malapert, Belgian Jesuit astronomer (1581–1630)',
  { psr: { share: 0.35, minTempK: 48 } });
C('Scott', -82.1, 48.5, 103, 4.0, 3900, 'Robert Falcon Scott, British Antarctic explorer (1868–1912)',
  { psr: { share: 0.28, minTempK: 51 } });
C('Idel’son', -81.5, 110.9, 60, 3.3, 3900, 'Mikhail Idel’son, Soviet astronomer',
  { psr: { share: 0.22, minTempK: 54 } });
C('Drygalski', -79.3, -84.9, 149, 4.5, 3900, 'Erich von Drygalski, German geographer and polar explorer (1865–1949)');
Mt('Malapert Mountain', -85.99, 0.12, 30, 5.0, 'Takes its name from nearby Malapert crater',
  'A broad peak near the south pole. It stays in sunlight for much of the year, which is why mission planners like it.');

/* ───────── Famous near-side craters ───────── */
C('Tycho', -43.31, -11.36, 85, 4.8, 108, 'Tycho Brahe, Danish astronomer (1546–1601)',
  { rays: true, blurb: 'One of the youngest big craters. Bright streaks of splashed-out rock reach more than 1,500 km across the Moon and are easy to spot at Full Moon.' });
C('Copernicus', 9.62, -20.08, 96, 3.8, 800, 'Nicolaus Copernicus, Polish astronomer (1473–1543)',
  { rays: true, blurb: 'A textbook crater: terraced walls, a ring of mountains in the middle, and a spray of bright rays.' });
C('Kepler', 8.12, -38.01, 32, 2.7, 1200, 'Johannes Kepler, German astronomer (1571–1630)', { rays: true });
C('Aristarchus', 23.73, -47.49, 40, 3.7, 450, 'Aristarchus of Samos, ancient Greek astronomer',
  { rays: true, blurb: 'The brightest large crater on the near side. It can be seen glowing even in earthshine.' });
C('Plato', 51.62, -9.38, 101, 2.0, 3840, 'Plato, ancient Greek philosopher', { floorDark: true });
C('Archimedes', 29.72, -3.95, 83, 2.1, 3200, 'Archimedes, ancient Greek mathematician', { floorDark: true });
C('Eratosthenes', 14.47, -11.32, 58, 3.6, 3200, 'Eratosthenes, Greek mathematician who measured the size of the Earth');
C('Clavius', -58.62, -14.04, 225, 3.5, 4000, 'Christopher Clavius, German Jesuit mathematician (1538–1612)',
  { blurb: 'Large enough to hold several smaller craters on its floor, which makes a neat chain you can see with binoculars.' });
C('Ptolemaeus', -9.31, -1.93, 153, 2.4, 3900, 'Claudius Ptolemy, Greek-Roman astronomer', { floorDark: true });
C('Alphonsus', -13.39, -3.2, 119, 2.7, 3900, 'Alfonso X of Castile, 13th-century patron of astronomy');
C('Arzachel', -17.7, -1.9, 97, 3.6, 3200, 'Al-Zarqali, 11th-century Andalusian astronomer');
C('Langrenus', -8.9, 60.9, 132, 2.7, 3200, 'Michael van Langren, Flemish astronomer');
C('Petavius', -25.1, 60.4, 177, 3.3, 3900, 'Denis Pétau, French Jesuit scholar');
C('Grimaldi', -5.2, -68.3, 172, 2.0, 3900, 'Francesco Maria Grimaldi, Italian Jesuit astronomer', { floorDark: true });
C('Gassendi', -17.5, -39.96, 110, 2.0, 3900, 'Pierre Gassendi, French philosopher and astronomer');
C('Schickard', -44.0, -54.6, 227, 2.5, 3900, 'Wilhelm Schickard, German astronomer and inventor');
C('Bailly', -66.5, -69.1, 303, 4.2, 4100, 'Jean Sylvain Bailly, French astronomer and politician');
C('Hipparchus', -5.5, 5.2, 138, 1.1, 4000, 'Hipparchus, ancient Greek astronomer');
C('Theophilus', -11.4, 26.4, 100, 4.4, 3200, 'Theophilus of Alexandria, 4th-century patriarch');
C('Cyrillus', -13.2, 24.0, 98, 3.8, 3900, 'Cyril of Alexandria, 5th-century theologian');
C('Catharina', -18.0, 23.4, 104, 4.0, 3900, 'Catherine of Alexandria, early Christian scholar');
C('Posidonius', 31.8, 29.9, 95, 2.3, 3800, 'Posidonius, ancient Greek philosopher and astronomer');
C('Aristoteles', 50.2, 17.3, 87, 3.3, 3500, 'Aristotle, ancient Greek philosopher');
C('Eudoxus', 44.3, 16.3, 67, 3.3, 3500, 'Eudoxus of Cnidus, ancient Greek astronomer');
C('Cassini', 40.2, 4.6, 57, 1.2, 3400, 'Giovanni Domenico Cassini, Italian-French astronomer');
C('Atlas', 46.7, 44.4, 87, 2.7, 3500, 'Atlas, Titan of Greek myth');
C('Hercules', 46.7, 39.1, 69, 3.1, 3500, 'Hercules, hero of Greek and Roman myth');
C('Endymion', 53.6, 56.4, 123, 3.0, 3800, 'Endymion, shepherd of Greek myth');
C('Pythagoras', 63.5, -62.8, 142, 5.0, 2000, 'Pythagoras, ancient Greek philosopher and mathematician');
C('Anaximander', 66.9, -51.3, 68, 3.0, 3800, 'Anaximander, ancient Greek philosopher');
C('J. Herschel', 62.0, -42.0, 156, 1.5, 3900, 'John Herschel, English astronomer (1792–1871)');
C('Bullialdus', -20.7, -22.2, 61, 3.5, 1000, 'Ismaël Bullialdus, French astronomer');
C('Pitatus', -29.9, -13.5, 106, 1.1, 3900, 'Pietro Pitati, Italian astronomer');
C('Maginus', -50.0, -6.3, 194, 3.0, 4000, 'Giovanni Antonio Magini, Italian astronomer');
C('Longomontanus', -49.6, -21.8, 145, 4.0, 4000, 'Christen Longomontanus, Danish astronomer');
C('Walter', -33.1, 0.9, 140, 3.0, 4000, 'Bernhard Walther, German astronomer');
C('Stöfler', -41.1, 6.0, 126, 2.5, 3900, 'Johannes Stöffler, German astronomer');
C('Maurolycus', -42.0, 14.0, 114, 4.7, 4000, 'Francesco Maurolico, Italian mathematician');
C('Moretus', -70.6, -5.5, 111, 5.0, 3900, 'Theodor Moretus, Flemish Jesuit mathematician');
C('Newton', -76.7, -16.9, 78, 7.1, 3900, 'Isaac Newton, English physicist (1643–1727)',
  { blurb: 'One of the deepest craters on the Moon: its floor sits over 7 km below the rim.' });
C('Demonax', -77.8, 57.5, 114, 4.0, 3900, 'Demonax, ancient Greek philosopher');
C('Zeeman', -75.2, -135.2, 190, 4.0, 3900, 'Pieter Zeeman, Dutch physicist and Nobel laureate');
C('Hertzsprung', 1.4, -129.2, 591, 3.0, 3900, 'Ejnar Hertzsprung, Danish astronomer');
C('Apollo', -36.1, -151.8, 523, 3.0, 3900, 'The Apollo program; named after the Greek god');
C('Korolev', -4.0, -157.4, 437, 4.0, 3900, 'Sergei Korolev, chief designer of the Soviet space program');
C('Tsiolkovskiy', -20.4, 129.1, 180, 4.0, 3200, 'Konstantin Tsiolkovsky, Russian rocket pioneer',
  { blurb: 'A far-side crater with a dark, lava-flooded floor and a tall central peak.' });
C('Mendeleev', -5.7, 141.1, 313, 3.0, 3900, 'Dmitri Mendeleev, Russian chemist who created the periodic table');
C('Von Kármán', -44.45, 175.9, 186, 3.0, 3900, 'Theodore von Kármán, Hungarian-American aerospace engineer',
  { blurb: 'The landing area of China’s Chang’e 4, the first spacecraft to soft-land on the far side.' });
C('Schrödinger', -75.0, 132.4, 312, 3.0, 3800, 'Erwin Schrödinger, Austrian physicist');
C('Compton', 55.9, 104.0, 175, 3.0, 3900, 'Arthur Compton, American physicist');
C('Daedalus', 5.9, 179.4, 93, 3.0, 3900, 'Daedalus, the craftsman of Greek myth');
C('King', 5.0, 120.5, 76, 3.0, 1000, 'Arthur King, British physicist');
C('Giordano Bruno', 35.9, 102.8, 22, 3.0, 4, 'Giordano Bruno, Italian philosopher (1548–1600)',
  { rays: true, blurb: 'Among the youngest craters of its size, perhaps only a few million years old, so its rays are still bright.' });
C('Jackson', 22.4, -163.1, 71, 3.0, 1000, 'John Jackson, Scottish astronomer');
C('Hausen', -65.0, -88.0, 167, 3.0, 4000, 'Christian August Hausen, German mathematician');
C('Rutherfurd', -60.9, -12.1, 50, 3.0, 3900, 'Lewis Morris Rutherfurd, American astronomer');
C('Janssen', -45.4, 40.8, 190, 3.0, 4000, 'Jules Janssen, French astronomer');
C('Fabricius', -42.9, 42.0, 78, 3.0, 3900, 'David Fabricius, German astronomer');
C('Furnerius', -36.0, 60.6, 125, 3.0, 4000, 'Georges Fournier, French Jesuit mathematician');
C('Vendelinus', -16.4, 61.6, 147, 3.0, 4000, 'Godefroy Wendelin, Belgian astronomer');
C('Taruntius', 5.6, 46.5, 56, 3.0, 3500, 'Lucius Taruntius Firmanus, Roman philosopher');
C('Proclus', 16.1, 46.9, 28, 2.4, 100, 'Proclus, Greek philosopher and mathematician',
  { rays: true, blurb: 'A small, sharp crater with bright rays that fan out mostly to the west.' });
C('Messier', -1.9, 47.6, 9, 1.0, 1000, 'Charles Messier, French astronomer',
  { blurb: 'A pair of oddly oval craters with two bright streaks trailing behind, like a comet.' });
C('Menelaus', 16.3, 16.0, 27, 3.0, 1000, 'Menelaus of Alexandria, Greek mathematician');
C('Manilius', 14.5, 9.1, 39, 3.0, 100, 'Marcus Manilius, Roman poet and astrologer');
C('Bessel', 21.8, 17.9, 15, 1.7, 1000, 'Friedrich Bessel, German astronomer');
C('Linné', 27.7, 11.8, 2.2, 0.6, 100, 'Carl Linnaeus, Swedish botanist',
  { blurb: 'Once reported to have vanished. It hasn’t: it’s a small, bright crater that looks different under different lighting.' });
C('Aristillus', 33.9, 1.2, 55, 3.6, 2000, 'Aristillus, ancient Greek astronomer');
C('Autolycus', 30.7, 1.5, 39, 3.4, 2000, 'Autolycus of Pitane, Greek astronomer');
C('Timocharis', 26.7, -13.1, 34, 3.1, 1000, 'Timocharis, ancient Greek astronomer');
C('Lambert', 25.8, -21.0, 30, 2.6, 1000, 'Johann Heinrich Lambert, Swiss mathematician');
C('Pytheas', 20.6, -20.6, 20, 2.0, 1000, 'Pytheas, Greek explorer');
C('Euler', 23.3, -29.2, 28, 2.2, 1000, 'Leonhard Euler, Swiss mathematician');
C('Marius', 11.9, -50.8, 41, 1.8, 3400, 'Simon Marius, German astronomer');
C('Reiner', 7.0, -54.9, 30, 1.8, 1000, 'Vincenzo Reinieri, Italian astronomer');
C('Riccioli', -3.3, -74.3, 146, 3.0, 3900, 'Giovanni Battista Riccioli, Italian astronomer');
C('Cardanus', 13.2, -72.5, 49, 3.0, 3500, 'Gerolamo Cardano, Italian mathematician');
C('Hevelius', 2.2, -67.6, 115, 3.0, 3900, 'Johannes Hevelius, Polish astronomer');
C('Lichtenberg', 31.8, -67.7, 20, 2.0, 1000, 'Georg Christoph Lichtenberg, German physicist');
C('Mairan', 41.6, -43.4, 40, 3.0, 3500, 'Jean-Jacques d’Ortous de Mairan, French scientist');
C('Harpalus', 52.6, -43.4, 39, 3.6, 1000, 'Harpalus, ancient Greek astronomer');
C('Bianchini', 49.1, -34.3, 38, 3.0, 3500, 'Francesco Bianchini, Italian astronomer');
C('Timaeus', 62.8, -0.5, 33, 3.0, 3400, 'Timaeus of Locri, Greek philosopher');
C('Meton', 73.8, 19.2, 130, 3.0, 3900, 'Meton of Athens, Greek astronomer');
C('Birmingham', 65.1, -10.5, 92, 3.0, 3900, 'John Birmingham, Irish astronomer');
C('Philolaus', 72.1, -32.4, 70, 4.0, 3200, 'Philolaus, ancient Greek philosopher');
C('Anaxagoras', 73.4, -10.1, 51, 3.0, 1000, 'Anaxagoras, ancient Greek philosopher');
C('Byrd', 85.3, 4.6, 94, 3.0, 3900, 'Richard E. Byrd, American polar aviator and explorer');
C('Peary', 88.6, 33.0, 73, 3.0, 3900, 'Robert Peary, American Arctic explorer');
C('Hermite', 86.0, -89.9, 104, 3.0, 3900, 'Charles Hermite, French mathematician',
  { blurb: 'Among the coldest known places in the solar system: its permanently dark floor drops below 30 K.' });
C('Rozhdestvenskiy', 85.2, -155.4, 177, 3.0, 3900, 'Dmitri Rozhdestvensky, Russian physicist');
C('Mercator', -29.3, -26.1, 47, 2.6, 3500, 'Gerardus Mercator, Flemish cartographer');
C('Gruithuisen', 32.9, -39.7, 16, 1.5, 3500, 'Franz von Paula Gruithuisen, German astronomer');
C('Fra Mauro', -6.0, -17.0, 95, 1.0, 4100, 'Fra Mauro, 15th-century Venetian mapmaker');
C('Descartes', -11.7, 15.7, 48, 1.5, 3900, 'René Descartes, French philosopher');
C('Le Monnier', 26.6, 30.6, 61, 1.0, 3800, 'Pierre Charles Le Monnier, French astronomer');

/* ───────── Seas (maria) ───────── */
M('Mare Tranquillitatis', 'Sea of Tranquility', 8.5, 31.4, 873, 3600, 'The dark plain where Apollo 11 landed in 1969.');
M('Mare Serenitatis', 'Sea of Serenity', 28.0, 17.5, 707, 3800);
M('Mare Imbrium', 'Sea of Showers', 32.8, -15.6, 1123, 3300, 'The big dark “eye” at the upper left of the Moon’s face, formed when a huge asteroid struck about 3.9 billion years ago.');
M('Mare Crisium', 'Sea of Crises', 17.0, 59.1, 418, 3500, 'An isolated oval sea near the Moon’s right edge, easy to spot with the naked eye.');
M('Mare Nubium', 'Sea of Clouds', -21.3, -16.6, 715, 3500);
M('Mare Humorum', 'Sea of Moisture', -24.4, -38.6, 389, 3200);
M('Mare Frigoris', 'Sea of Cold', 56.0, 1.4, 1596, 3500);
M('Oceanus Procellarum', 'Ocean of Storms', 18.4, -57.4, 2568, 3300, 'The largest dark plain on the Moon, covering much of the western near side. Apollo 12 landed on its southern edge.');
M('Mare Fecunditatis', 'Sea of Fertility', -7.8, 51.3, 909, 3500);
M('Mare Nectaris', 'Sea of Nectar', -15.2, 35.5, 333, 3900);
M('Mare Vaporum', 'Sea of Vapors', 13.3, 3.6, 245, 3500);
M('Mare Cognitum', 'Sea that has become known', -10.0, -23.1, 376, 3400);
M('Mare Insularum', 'Sea of Islands', 7.5, -30.9, 513, 3300);
M('Mare Humboldtianum', 'Humboldt’s Sea', 56.8, 81.5, 273, 3500);
M('Mare Smythii', 'Smyth’s Sea', 1.3, 87.5, 373, 3500);
M('Mare Marginis', 'Sea of the Edge', 13.3, 86.1, 420, 3500);
M('Mare Orientale', 'Eastern Sea', -19.4, -92.8, 327, 3800, 'A bull’s-eye of rings left by a giant impact, right on the Moon’s western edge.');
M('Mare Moscoviense', 'Sea of Moscow', 27.3, 147.9, 277, 3200, 'One of the few seas on the far side.');
M('Mare Ingenii', 'Sea of Ingenuity', -33.7, 163.5, 318, 3600);
M('Mare Australe', 'Southern Sea', -38.9, 93.0, 603, 3500);
M('Mare Anguis', 'Serpent Sea', 22.6, 67.7, 150, 3500);
M('Mare Spumans', 'Foaming Sea', 1.1, 65.1, 139, 3500);
M('Mare Undarum', 'Sea of Waves', 6.8, 68.4, 243, 3500);
M('Lacus Somniorum', 'Lake of Dreams', 38.0, 29.2, 384, 3500);
M('Lacus Mortis', 'Lake of Death', 45.0, 27.2, 151, 3500);
M('Sinus Medii', 'Central Bay', 2.4, 1.7, 335, 3500, 'The spot closest to the middle of the Moon’s visible face.');
M('Sinus Iridum', 'Bay of Rainbows', 44.1, -31.5, 236, 3300, 'A half-ring crater that looks like a bay on the edge of Mare Imbrium. China’s Chang’e 3 landed here.');
M('Palus Putredinis', 'Marsh of Decay', 26.5, 0.4, 161, 3500);

/* ───────── Mountains ───────── */
Mt('Montes Apenninus', 18.9, -3.7, 401, 5.0, 'The Apennine Mountains of Italy', 'The tallest range on the near side, the rim of the Imbrium impact. Apollo 15 landed at its foot.');
Mt('Montes Alpes', 46.8, -0.8, 281, 3.0, 'The Alps of Europe', 'Cut by the long, straight Alpine Valley.');
Mt('Montes Caucasus', 38.4, 11.1, 445, 6.0, 'The Caucasus Mountains');
Mt('Montes Carpatus', 14.4, -24.4, 361, 2.0, 'The Carpathian Mountains');
Mt('Montes Jura', 47.1, -34.0, 422, 6.0, 'The Jura Mountains', 'A curved range that forms the rim of Sinus Iridum.');
Mt('Montes Pyrenaeus', -15.6, 41.1, 164, 3.0, 'The Pyrenees');
Mt('Montes Taurus', 28.0, 41.0, 726, 3.0, 'The Taurus Mountains of Turkey', 'The range beside the valley where Apollo 17 landed.');
Mt('Montes Haemus', 19.9, 9.1, 560, 2.0, 'The Balkan Mountains (Haemus Mons)');
Mt('Montes Cordillera', -17.4, -81.1, 1000, 6.0, 'The Spanish word for “mountain chain”');
Mt('Montes Rook', -20.6, -82.5, 791, 3.0, 'Lawrence Rooke, English astronomer');
Mt('Montes Teneriffe', 47.9, -13.2, 112, 2.4, 'Tenerife, the island in the Canary Islands');
Mt('Mons Pico', 45.8, -8.9, 25, 2.4, 'Pico Island in the Azores');
Mt('Mons Piton', 40.8, -0.9, 23, 2.3, 'Pico del Teide on Tenerife');
Mt('Mons Hadley', 26.5, 4.7, 25, 4.6, 'Nearby Hadley rille, named for John Hadley, English mathematician', 'The mountain towering over the Apollo 15 landing site.');
Mt('Mons Rümker', 40.8, -58.1, 70, 1.1, 'Karl Ludwig Rümker, German astronomer');
Mt('Mons La Hire', 27.8, -25.5, 25, 1.5, 'Philippe de La Hire, French mathematician');
Mt('Mons Gruithuisen Gamma', 36.6, -40.0, 20, 1.5, 'Franz von Paula Gruithuisen, German astronomer');

/* ───────── Rilles and valleys ───────── */
Ri('Rima Hadley', 25.0, 3.0, 80, 'Hadley crater', 'The winding channel beside the Apollo 15 landing site, carved by flowing lava long ago.');
Ri('Rima Ariadaeus', 6.4, 13.3, 250, 'Ariadaeus crater', 'A straight trench where the ground has dropped between two cracks. Visible in small telescopes.');
Ri('Rima Hyginus', 7.8, 6.3, 220, 'Hyginus crater');
Ri('Vallis Schröteri', 26.2, -50.8, 168, 'Johann Schröter, German astronomer', 'The Moon’s largest sinuous valley, winding out from the Aristarchus plateau.');
Ri('Vallis Alpes', 49.2, 3.6, 166, 'The Alps', 'A 166 km-long straight valley slicing through the Alps mountains.');
Ri('Rimae Triesnecker', 4.2, 3.3, 215, 'Triesnecker crater');
Ri('Rima Bode', 12.9, -3.9, 230, 'Johann Bode, German astronomer');
Ri('Rimae Sirsalis', -16.1, -60.4, 380, 'Sirsalis crater');
Ri('Rima Cauchy', 9.6, 38.0, 210, 'Cauchy crater');
Ri('Rimae Prinz', 27.0, -43.5, 80, 'Prinz crater');
Ri('Vallis Rheita', -42.5, 51.5, 445, 'Rheita crater', 'A crater chain so long it looks like a scar across the southern highlands.');
Ri('Rimae Bürg', 45.0, 28.0, 99, 'Bürg crater');
Ri('Rima Hesiodus', -30.0, -22.0, 300, 'Hesiodus crater');

export const CURATED: Feature[] = out;

export const PSR_ORDER = ['shackleton', 'haworth', 'de-gerlache', 'faustini', 'shoemaker', 'sverdrup', 'cabeus', 'nobile'];
