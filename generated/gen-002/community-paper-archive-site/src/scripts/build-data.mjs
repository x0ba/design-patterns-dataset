// Builds the static data the site loads at runtime (public/data/*.json) and
// the photo illustrations (public/img/photos/*.svg). Deterministic: the same
// seed always produces the same archive.
//
// Hand-written stories (November 2026 issue, the 1994 flood coverage) are
// merged with generated back issues so the counts match the real archive:
// 452 issues from March 1988 to November 2026, about 9,800 pre-2010
// OCR articles and about 4,100 born-digital articles since 2010.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as P from './content/pools.mjs';
import { issue as issue2026, articles as featured2026 } from './content/featured-2026.mjs';
import { articles as featured1994 } from './content/featured-1994.mjs';
import { sceneNames, sceneSvg, favicon } from './content/art.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'public', 'data');
const PHOTOS = join(ROOT, 'public', 'img', 'photos');
const IMG = join(ROOT, 'public', 'img');

// ---------- helpers -------------------------------------------------------

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261116);
const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const slugify = (s) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
const pad = (n) => String(n).padStart(2, '0');
const fill = (t, ctx) => t.replace(/\{(\w+)\}/g, (_, k) => (ctx[k] ?? `{${k}}`));
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const SMALL = new Set(['a', 'an', 'and', 'at', 'after', 'by', 'for', 'from', 'in', 'of', 'on', 'the', 'to', 'with', 'ahead']);
const titleCase = (s) =>
  s
    .split(' ')
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : cap(w)))
    .join(' ');

// Second Thursday of the month: the paper's publication day.
function issueDate(y, m) {
  const wd = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const firstThu = 1 + ((4 - wd + 7) % 7);
  return `${y}-${pad(m)}-${pad(firstThu + 7)}`;
}
const weekday = (iso) =>
  P.DAYS[(new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7];

// ---------- issue calendar ------------------------------------------------

// Months with no issue. 465 months from March 1988 to November 2026 minus
// these 13 gives the 452 published issues.
const SKIPPED = [
  '1989-07', '1990-08', '1991-01', '1991-07', '1992-08', '1993-01', '1996-07',
  '2000-08', '2001-01', '2003-07', '2005-08', '2008-01', '2014-07',
];
const CURRENT = issue2026.id;

const calendar = [];
for (let i = 0; i <= 464; i++) {
  const y = 1988 + Math.floor((i + 2) / 12);
  const m = ((i + 2) % 12) + 1;
  const id = `${y}-${pad(m)}`;
  if (!SKIPPED.includes(id)) calendar.push({ id, y, m });
}
if (calendar.length !== 452) throw new Error(`Expected 452 issues, got ${calendar.length}`);

// ---------- places --------------------------------------------------------

const hoods = P.NEIGHBORHOODS.map(([name, blurb]) => ({ name, slug: slugify(name), blurb }));
const hoodByName = Object.fromEntries(hoods.map((h) => [h.name, h]));

const streetNames = new Map(Object.entries(P.FEATURED_STREETS));
const stemCombos = [];
for (const stem of P.STREET_STEMS) for (const suf of P.STREET_SUFFIXES) stemCombos.push(`${stem} ${suf}`);
for (const name of shuffle(stemCombos)) {
  if (streetNames.size >= 210) break;
  if (!streetNames.has(name)) streetNames.set(name, pick(hoods).name);
}
if (streetNames.size !== 210) throw new Error(`Expected 210 streets, got ${streetNames.size}`);
const streets = [...streetNames].map(([name, hood]) => ({ name, slug: slugify(name), hood: hoodByName[hood] }));
const streetByName = Object.fromEntries(streets.map((s) => [s.name, s]));

// ---------- contributors --------------------------------------------------

const FEATURED_PEOPLE = {
  'Helen Rusakova': ['Staff writer', 'Mill Hill', 'Covers the Millrace Town Council and writes the Council Watch column.'],
  'Thomas Quill': ['Staff writer', 'Foxglove Heights', 'Reports on neighborhood news and wrote the paper’s website launch story.'],
  'Sana Whitcomb': ['Staff writer', 'Canal Park', 'Covers food, housing and the parish social programs.'],
  'Dale Pruitt': ['Contributing writer', 'Lower Millrace', 'Writes about scouting, parks and the Millrace Green.'],
  'Carmen Lopes': ['Contributing writer', 'Bellwood', 'Writes about volunteer groups and the Bellwood Chapel.'],
  'Oren Bell': ['Staff writer', 'Stonebridge', 'Covers the city’s public works projects and trail maintenance.'],
  'Jonah Peltier': ['Staff writer', 'Hickory Ridge', 'Covers traffic, parking and the council’s transportation votes.'],
  'Priya Raman': ['Education reporter', 'Eastgate', 'Covers the district’s schools and student programs.'],
  'Tobias Greer': ['Contributing writer', 'Mill Hill', 'Writes about students, sports and science clubs.'],
  'Bernard Kowal': ['Letters editor', 'Tannery Flats', 'Has lived on Tannery Street since 1986 and edits the letters page.'],
  'Maureen Doyle': ['Contributing writer', 'Tannery Flats', 'Writes about the Lantern Walk and seasonal events.'],
  'Marguerite Shaw': ['Obituaries editor', 'Canal Park', 'Writes obituaries and the Remember This column.'],
  'Ines Ferreira': ['Events editor', 'Cedar Hollow', 'Compiles the monthly events calendar and the holiday roundup.'],
  'Dorothy Kessler': ['Then & Now columnist', 'Kettle Hill', 'Researches old photographs in the county archive and retakes them from the same spots.'],
  'Gil Amador': ['Photographer', 'Mill Hill', 'Has photographed the Millrace neighborhoods for the paper since 2015.'],
  'Gene Auerbach': ['Photographer', 'Eastgate', 'Photographed the paper’s coverage of the 1994 flood and the years after.'],
  'Marisol Trent': ['Staff writer', 'Foundry Row', 'Covered the 1994 flood and the cleanup that followed.'],
  'Ruth Okafor': ['Contributing writer', 'Tannery Flats', 'Writes occasionally about her street and its volunteers.'],
};
const featuredNames = Object.keys(FEATURED_PEOPLE);
const usedNames = new Set(featuredNames);
const people = featuredNames.map((name) => {
  const [role, hood, bio] = FEATURED_PEOPLE[name];
  return { name, role, hood: hoodByName[hood], bio };
});
while (people.length < 186) {
  const name = `${pick(P.FIRST_NAMES)} ${pick(P.LAST_NAMES)}`;
  if (usedNames.has(name)) continue;
  usedNames.add(name);
  const role = chance(0.15) ? 'Photographer' : chance(0.1) ? 'Columnist' : 'Contributing writer';
  const hood = pick(hoods);
  const bio = `${role === 'Photographer' ? 'Photographer' : 'Writer'} for the Gazette since the late 1980s. Lives in ${hood.name}. ${pick(P.HOBBIES)}`;
  people.push({ name, role, hood, bio });
}
function chance(p) {
  return rand() < p;
}
const personByName = Object.fromEntries(people.map((p) => [p.name, p]));
const randomPersonName = () => `${pick(P.FIRST_NAMES)} ${pick(P.LAST_NAMES)}`;

// ---------- featured articles --------------------------------------------

const featuredAll = [
  ...featured1994.map((a) => ({ ...a, issue: a.issue })),
  ...featured2026.map((a) => ({ ...a, issue: CURRENT, ocr: false })),
];

// ---------- generated articles -------------------------------------------

const SECTION_W = [
  ['Neighborhood News', 26], ['Council Watch', 12], ['Schools', 12], ['Letters', 6],
  ['Obituaries', 9], ['Events', 10], ['Then & Now', 5],
];
const weightedPick = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of pairs) {
    if ((r -= w) < 0) return v;
  }
  return pairs[0][0];
};

// Keep the 1993–1995 generated stories free of the Tannery Street tags so the
// flood coverage is the only match for that street in those years.
const isFloodYear = (y) => y >= 1993 && y <= 1995;
const OCR_SWAP = { l: '1', i: 'l', o: '0', e: 'c', n: 'r', a: 'o', s: '5' };
function ocrNoise(text) {
  return text.replace(/\b[A-Za-z]{5,}\b/g, (w) => {
    if (rand() > 0.04) return w;
    const idx = ri(1, w.length - 2);
    const ch = w[idx].toLowerCase();
    if (!OCR_SWAP[ch]) return w;
    return w.slice(0, idx) + OCR_SWAP[ch] + w.slice(idx + 1);
  });
}

function makeContext(issueYear, hood) {
  const pool = streets.filter((s) => s.hood.slug === hood.slug && !(isFloodYear(issueYear) && s.name === 'Tannery Street'));
  const st = pool.length ? pick(pool) : pick(streets.filter((s) => !(isFloodYear(issueYear) && s.name === 'Tannery Street')));
  const st2 = pick(streets.filter((s) => s !== st && !(isFloodYear(issueYear) && s.name === 'Tannery Street')));
  return {
    hood: hood.name,
    street: st.name,
    street2: st2.name,
    org: pick(P.ORGS),
    person: randomPersonName(),
    num: ri(4, 40),
    grade: ri(3, 8),
    season: pick(P.SEASONS),
    month: pick(P.MONTHS),
    money: pick(P.MONEY),
    school: pick(P.SCHOOLS),
    thing: pick(P.THINGS),
    day: pick(P.DAYS),
    place: pick(P.PLACES),
    role: pick(P.ROLE_WORDS),
    year: issueYear - ri(20, 40),
    year2: issueYear,
    _street: st,
  };
}

function generateArticle(section, issueYear, issueId, date, pre) {
  let hood = pick(hoods);
  while (isFloodYear(issueYear) && hood.name === 'Tannery Flats') hood = pick(hoods);
  const ctx = makeContext(issueYear, hood);
  if (section === 'Obituaries') ctx.num = ri(62, 96);
  const T = P.TEMPLATES[section];
  const title = titleCase(fill(pick(T.headlines), ctx));
  const deck = cap(fill(pick(T.decks), ctx));
  const pool = shuffle(T.body);
  const paraCount = ri(2, 3);
  const paragraphs = [];
  let k = 0;
  for (let p = 0; p < paraCount; p++) {
    const sentences = [];
    const n = ri(1, 2);
    for (let s = 0; s < n; s++) sentences.push(fill(pool[k++ % pool.length], ctx));
    paragraphs.push(sentences.join(' '));
  }
  if (section === 'Letters') {
    if (!paragraphs[0].startsWith('To the editor')) paragraphs[0] = `To the editor: ${paragraphs[0]}`;
    if (T.sig) paragraphs.push(fill(T.sig, ctx));
  }
  const bodyText = pre ? paragraphs.map(ocrNoise) : paragraphs;
  const streetsTagged = [ctx._street];
  if (chance(0.3)) streetsTagged.push(streetByName[ctx.street2] ?? ctx._street);
  const uniqueStreets = [...new Set(streetsTagged.map((s) => s.name))];
  return {
    issue: issueId,
    date,
    section,
    page: section === 'Front Page' ? 1 : ri(2, 24),
    title,
    deck,
    by: [pick(people).name],
    streets: uniqueStreets,
    hoods: [hood.name],
    ocr: pre,
    body: bodyText,
    photos: [],
  };
}

// ---------- assemble issues ----------------------------------------------

const usedIds = new Set();
function articleId(issueId, title) {
  const base = `${issueId}-${slugify(title).slice(0, 64).replace(/-+$/, '')}`;
  let id = base;
  let n = 2;
  while (usedIds.has(id)) id = `${base}-${n++}`;
  usedIds.add(id);
  return id;
}

const allArticles = [];
const issues = [];
const issueFiles = new Map();

calendar.forEach((cal, idx) => {
  const pre = cal.y <= 2009;
  const date = issueDate(cal.y, cal.m);
  const featuredHere = featuredAll.filter((a) => a.issue === cal.id);
  const maxFeaturedPage = Math.max(0, ...featuredHere.map((a) => a.page));
  const pages = Math.max(maxFeaturedPage, pre ? ri(16, 28) : ri(20, 24));

  const generated = [];
  if (cal.id !== CURRENT) {
    const target = pre ? ri(36, 42) : ri(18, 23);
    const frontNeeded = Math.max(0, 2 - featuredHere.filter((a) => a.section === 'Front Page').length);
    for (let i = 0; i < frontNeeded; i++) generated.push(generateArticle('Front Page', cal.y, cal.id, date, pre));
    while (generated.length + featuredHere.length < target) {
      const section = weightedPick(SECTION_W);
      generated.push(generateArticle(section, cal.y, cal.id, date, pre));
    }
  }
  generated.forEach((g) => { g.page = Math.min(g.page, pages); });

  const records = [
    ...featuredHere.map((f) => ({
      issue: cal.id,
      date,
      section: f.section,
      page: f.page,
      title: f.title,
      deck: f.deck,
      by: f.by,
      streets: f.streets ?? [],
      hoods: f.hoods ?? [],
      ocr: f.ocr ?? false,
      body: f.body,
      photos: (f.photos ?? []).map((p) => ({ src: `img/photos/${p.scene}.svg`, caption: p.caption, credit: p.credit })),
      events: f.events,
      featured: true,
    })),
    ...generated,
  ];
  records.sort((a, b) => a.page - b.page || (a.featured ? -1 : 1) - (b.featured ? -1 : 1));

  const sectionCounts = {};
  for (const r of records) {
    r.id = articleId(cal.id, r.title);
    sectionCounts[r.section] = (sectionCounts[r.section] ?? 0) + 1;
    allArticles.push(r);
  }

  issues.push({
    id: cal.id,
    no: idx + 1,
    date,
    year: cal.y,
    month: cal.m,
    label: `${P.MONTHS[cal.m - 1]} ${cal.y}`,
    pages,
    count: records.length,
    sections: sectionCounts,
    current: cal.id === CURRENT,
  });
  issueFiles.set(cal.id, records);
});

// ---------- derive indexes ------------------------------------------------

const streetCount = Object.fromEntries(streets.map((s) => [s.slug, 0]));
const hoodCount = Object.fromEntries(hoods.map((h) => [h.slug, 0]));
const personCount = Object.fromEntries(people.map((p) => [p.name, 0]));
const personSince = {};

for (const a of allArticles) {
  for (const s of a.streets) streetCount[slugify(s)]++;
  for (const h of a.hoods) hoodCount[slugify(h)]++;
  for (const b of a.by) {
    personCount[b] = (personCount[b] ?? 0) + 1;
    const y = Number(a.issue.slice(0, 4));
    personSince[b] = Math.min(personSince[b] ?? 9999, y);
  }
}

const eventsOut = [];
for (const a of allArticles) {
  if (!a.events) continue;
  for (const e of a.events) {
    eventsOut.push({
      ...e,
      weekday: weekday(e.date),
      hoodSlug: slugify(e.hood),
      articleId: a.id,
    });
  }
}

const site = {
  generated: '2026-11-16',
  currentIssue: CURRENT,
  nextIssueDate: issueDate(2026, 12),
  totals: { issues: issues.length, articles: allArticles.length },
  skippedMonths: SKIPPED,
  sections: ['Front Page', 'Neighborhood News', 'Council Watch', 'Schools', 'Letters', 'Obituaries', 'Events', 'Then & Now'],
  issues,
  neighborhoods: hoods.map((h) => ({ slug: h.slug, name: h.name, blurb: h.blurb, count: hoodCount[h.slug] })),
  streets: streets
    .map((s) => ({ slug: s.slug, name: s.name, hood: { slug: s.hood.slug, name: s.hood.name }, count: streetCount[s.slug] }))
    .sort((a, b) => a.name.localeCompare(b.name)),
  contributors: people
    .map((p) => ({
      slug: slugify(p.name),
      name: p.name,
      role: p.role,
      hood: { slug: p.hood.slug, name: p.hood.name },
      bio: p.bio,
      since: personSince[p.name] ?? null,
      count: personCount[p.name] ?? 0,
    }))
    .sort((a, b) => a.name.split(' ').slice(-1)[0].localeCompare(b.name.split(' ').slice(-1)[0])),
  events: eventsOut,
};

// Search index: one compact record per article. Only the hand-written stories
// carry their full text here; generated back issues are searched by title,
// deck, byline and tags.
const articleIndex = allArticles.map((a) => {
  const rec = {
    id: a.id,
    issue: a.issue,
    date: a.date,
    page: a.page,
    section: a.section,
    title: a.title,
    deck: a.deck,
    by: a.by,
    streets: a.streets.map((s) => slugify(s)),
    hoods: a.hoods.map((h) => slugify(h)),
    ocr: a.ocr,
  };
  if (a.featured) rec.text = a.body.join(' ');
  return rec;
});

// ---------- write ---------------------------------------------------------

rmSync(DATA, { recursive: true, force: true });
rmSync(PHOTOS, { recursive: true, force: true });
mkdirSync(join(DATA, 'issues'), { recursive: true });
mkdirSync(PHOTOS, { recursive: true });

const write = (path, obj) => writeFileSync(path, JSON.stringify(obj));
write(join(DATA, 'site.json'), site);
write(join(DATA, 'articles.json'), articleIndex);

for (const [id, records] of issueFiles) {
  const meta = issues.find((i) => i.id === id);
  const out = {
    id,
    no: meta.no,
    date: meta.date,
    label: meta.label,
    pages: meta.pages,
    current: meta.current,
    articles: records.map((r) => ({
      id: r.id,
      issue: r.issue,
      date: r.date,
      page: r.page,
      section: r.section,
      title: r.title,
      deck: r.deck,
      by: r.by,
      streets: r.streets.map((n) => ({ name: n, slug: slugify(n) })),
      hoods: r.hoods.map((n) => ({ name: n, slug: slugify(n) })),
      ocr: r.ocr,
      body: r.body,
      photos: r.photos,
      ...(r.events ? { events: r.events.map((e) => ({ ...e, weekday: weekday(e.date), hoodSlug: slugify(e.hood) })) } : {}),
    })),
  };
  write(join(DATA, 'issues', `${id}.json`), out);
}

for (const name of sceneNames) {
  writeFileSync(join(PHOTOS, `${name}.svg`), sceneSvg(name));
}
writeFileSync(join(IMG, 'favicon.svg'), favicon);

const preCount = allArticles.filter((a) => Number(a.issue.slice(0, 4)) < 2010).length;
console.log(
  `Built ${issues.length} issues, ${allArticles.length} articles ` +
    `(${preCount} pre-2010 OCR, ${allArticles.length - preCount} born-digital), ` +
    `${site.streets.length} streets, ${site.neighborhoods.length} neighborhoods, ${site.contributors.length} contributors, ` +
    `${eventsOut.length} events, ${sceneNames.length} photos.`,
);
