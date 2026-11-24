// Generates the licensed content tree that `pnpm setup:assets` would normally
// fetch from media.agoracosmica.org (unreachable here). Text is assembled from
// what the repo itself tracks: chapter titles (seedsdata/ui-*.json), the
// authored QA and page content (src/data/public/figureContent), SEO lines
// (figureSeo.ts). Output lands where setup-assets.mjs would put it.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const C = join(ROOT, 'client');
const A = join(C, 'src/assets');
const W = (p, data) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 2)); };

const titles = { en: JSON.parse(readFileSync(join(A, 'translations/seedsdata/ui-en.json'))), de: JSON.parse(readFileSync(join(A, 'translations/seedsdata/ui-de.json'))) };
const { figureSeo } = await import(join(C, 'src/data/public/figureSeo.ts'));

// id, English name, German name, born, died, birthplace, period line, tradition
const F = {
  laozi: ['Laozi', 'Laozi', -571, -471, 'Chu, Zhou China', 'Late Eastern Zhou, roughly 6th-5th century BCE (traditional lifespan ~571-471 BCE, historicity debated)', ['Dao De Jing']],
  gautama: ['Siddhartha Gautama', 'Siddhartha Gautama', -563, -483, 'Lumbini', 'c. 5th century BCE (traditional chronology: 563-483 BCE, many modern scholars date him later)', ['Dhammacakkappavattana Sutta', 'Dhammapada', 'Satipatthana Sutta']],
  plato: ['Plato', 'Platon', -428, -348, 'Athens', '428/427-348/347 BCE', ['Republic', 'Symposium', 'Phaedo']],
  aurelius: ['Marcus Aurelius', 'Mark Aurel', 121, 180, 'Rome', '121-180 AD', ['Meditations', 'Letters to Fronto']],
  bingen: ['Hildegard von Bingen', 'Hildegard von Bingen', 1098, 1179, 'Bermersheim', '1098-1179', ['Scivias', 'Physica', 'Ordo Virtutum']],
  zenji: ['Dōgen Zenji', 'Dōgen Zenji', 1200, 1253, 'Kyoto', '1200-1253', ['Shōbōgenzō', 'Fukanzazengi', 'Tenzo Kyōkun']],
  rumi: ['Rumi', 'Rumi', 1207, 1273, 'Balkh', '1207-1273', ['Masnavi', 'Divan-e Shams', 'Fihi Ma Fihi']],
  eckhart: ['Meister Eckhart', 'Meister Eckhart', 1260, 1328, 'Tambach', 'c. 1260-1327/28 (died before the 1329 bull. Place uncertain, often given as Avignon)', ['German Sermons', 'The Book of Divine Consolation', 'Talks of Instruction']],
  vinci: ['Leonardo da Vinci', 'Leonardo da Vinci', 1452, 1519, 'Vinci', '1452-1519', ['Codex Atlanticus', 'Treatise on Painting', 'Codex Leicester']],
  galilei: ['Galileo Galilei', 'Galileo Galilei', 1564, 1642, 'Pisa', '1564-1642', ['Sidereus Nuncius', 'Dialogue Concerning the Two Chief World Systems', 'Two New Sciences']],
  shakespeare: ['William Shakespeare', 'William Shakespeare', 1564, 1616, 'Stratford-upon-Avon', '1564-1616', ['Hamlet', 'King Lear', 'Sonnets']],
  goethe: ['Johann Wolfgang von Goethe', 'Johann Wolfgang von Goethe', 1749, 1832, 'Frankfurt am Main', '1749-1832', ['Faust', 'Theory of Colours', 'Wilhelm Meister']],
  mozart: ['Wolfgang Amadeus Mozart', 'Wolfgang Amadeus Mozart', 1756, 1791, 'Salzburg', '1756-1791', ['Letters', 'Don Giovanni', 'Requiem']],
  blake: ['William Blake', 'William Blake', 1757, 1827, 'London', '1757-1827', ['Songs of Innocence and of Experience', 'The Marriage of Heaven and Hell', 'Jerusalem']],
  austen: ['Jane Austen', 'Jane Austen', 1775, 1817, 'Steventon', '1775-1817', ['Pride and Prejudice', 'Emma', 'Persuasion']],
  schopenhauer: ['Arthur Schopenhauer', 'Arthur Schopenhauer', 1788, 1860, 'Danzig', '1788-1860', ['The World as Will and Representation', 'Parerga and Paralipomena', 'On the Basis of Morality']],
  lovelace: ['Ada Lovelace', 'Ada Lovelace', 1815, 1852, 'London', '1815-1852', ['Notes on the Analytical Engine', 'Letters to Babbage', 'Letters to De Morgan']],
  tubman: ['Harriet Tubman', 'Harriet Tubman', 1822, 1913, 'Dorchester County, Maryland', 'c. 1822-1913', ['Scenes in the Life of Harriet Tubman (Bradford)', 'Letters and testimony', 'Civil War records']],
  dickinson: ['Emily Dickinson', 'Emily Dickinson', 1830, 1886, 'Amherst', '1830-1886', ['Poems (Fascicles)', 'Letters', 'Master Letters']],
  nietzsche: ['Friedrich Nietzsche', 'Friedrich Nietzsche', 1844, 1900, 'Röcken', '1844-1900', ['Thus Spoke Zarathustra', 'The Gay Science', 'Beyond Good and Evil']],
  gandhi: ['Mohandas Gandhi', 'Mohandas Gandhi', 1869, 1948, 'Porbandar', '1869-1948', ['The Story of My Experiments with Truth', 'Hind Swaraj', 'Young India']],
  jung: ['Carl Gustav Jung', 'Carl Gustav Jung', 1875, 1961, 'Kesswil', '1875-1961', ['The Red Book', 'Memories, Dreams, Reflections', 'Psychological Types']],
  einstein: ['Albert Einstein', 'Albert Einstein', 1879, 1955, 'Ulm', '1879-1955', ['On the Electrodynamics of Moving Bodies', 'The World As I See It', 'Relativity: The Special and General Theory']],
  woolf: ['Virginia Woolf', 'Virginia Woolf', 1882, 1941, 'London', '1882-1941', ['A Room of One\'s Own', 'Mrs Dalloway', 'To the Lighthouse']],
  campbell: ['Joseph Campbell', 'Joseph Campbell', 1904, 1987, 'White Plains, New York', '1904-1987', ['The Hero with a Thousand Faces', 'The Power of Myth', 'The Masks of God']],
  kahlo: ['Frida Kahlo', 'Frida Kahlo', 1907, 1954, 'Coyoacán', '1907-1954', ['The Two Fridas', 'The Broken Column', 'Diary (1944-1954)']],
  beauvoir: ['Simone de Beauvoir', 'Simone de Beauvoir', 1908, 1986, 'Paris', '1908-1986', ['The Second Sex', 'The Ethics of Ambiguity', 'Memoirs of a Dutiful Daughter']],
  mandela: ['Nelson Mandela', 'Nelson Mandela', 1918, 2013, 'Mvezo', '1918-2013', ['Long Walk to Freedom', 'I Am Prepared to Die (Rivonia speech)', 'Conversations with Myself']],
  angelou: ['Maya Angelou', 'Maya Angelou', 1928, 2014, 'St. Louis', '1928-2014', ['I Know Why the Caged Bird Sings', 'And Still I Rise', 'Letter to My Daughter']],
  king: ['Martin Luther King Jr.', 'Martin Luther King Jr.', 1929, 1968, 'Atlanta', '1929-1968', ['Letter from Birmingham Jail', 'Strength to Love', 'Where Do We Go from Here']],
};
const IDS = Object.keys(F);
const yr = (y, de) => (y < 0 ? `${-y} ${de ? 'v. Chr.' : 'BCE'}` : String(y));

async function fragment(id) {
  const p = join(C, 'src/data/public/figureContent', `${id}.ts`);
  if (!existsSync(p)) return {};
  try { return (await import(p)).fragment || {}; } catch { return {}; }
}

const sentences = (t) => (t || '').match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) || [];
const TAGS = ['meaning', 'purpose', 'grief', 'identity', 'self', 'creativity', 'imagination', 'love', 'connection', 'freedom', 'justice', 'faith', 'mystery', 'virtue', 'courage', 'wisdom', 'attention', 'nature', 'death', 'compassion', 'resistance', 'ethics'];

const L = {
  en: {
    context: (n, t, f) => `${n} returned to "${t}" again and again, in letters, notes and finished work. ${f}`,
    relevance: (t) => `Most of us meet "${t.toLowerCase()}" on an ordinary weekday, not in a library. The chapter gives you a way to notice it there.`,
    insights: (t, n) => [`${t} is a practice before it is a theory.`, `${n} tested the idea against a life that did not go to plan.`, `You can try it tomorrow morning with no special equipment.`],
    outcomes: (t) => [`Name the moment in your own week where ${t.toLowerCase()} applies`, 'Explain the idea to a friend in two sentences', 'Try one small practice for seven days'],
    practice: (t) => `For one week, take two minutes each evening. Write down one moment from the day where "${t}" was at stake, and what you did. Do not judge it. Just keep the record.`,
    summary: (t, n, fallback) => fallback || `${n} on ${t.toLowerCase()}: what it meant in their own life, and what it can mean in yours.`,
    narr: (n, t, y, place) => `I want to tell you about ${t.toLowerCase()}. Not as a doctrine. As something that happened to me, around ${y}, in ${place} and the places after it.`,
    foreword: (n) => `A Note on ${n}`,
    fwd: (n) => `What follows is a life told in twelve chapters, in the first person. It was written as a collaboration between people and an AI, from the letters, works and records that survive. Where the record is silent, the story says so in the facts panel. ${n} cannot consent to being voiced. We have tried to earn the attempt by being careful.`,
    documented: (n, t, y) => [`${n} wrote about ${t.toLowerCase()} in surviving texts.`, `The dating to around ${y} follows the standard biographies.`],
    recreated: () => ['The dialogue in this chapter is written for the story.', 'Inner thoughts are an interpretation, not a quotation.'],
    commitment: 'We separate what the record supports from what the story recreates, chapter by chapter, and we correct errors when readers send sources.',
  },
  de: {
    context: (n, t, f) => `${n} kam immer wieder auf „${t}“ zurück, in Briefen, Notizen und fertigen Werken. ${f}`,
    relevance: (t) => `Den meisten von uns begegnet „${t}“ an einem gewöhnlichen Wochentag, nicht in einer Bibliothek. Das Kapitel zeigt, wie man es dort bemerkt.`,
    insights: (t, n) => [`${t} ist zuerst eine Übung, dann eine Theorie.`, `${n} hat die Idee an einem Leben geprüft, das nicht nach Plan verlief.`, `Du kannst es morgen früh ausprobieren, ohne Vorbereitung.`],
    outcomes: (t) => [`Den Moment in deiner Woche benennen, in dem „${t}“ zählt`, 'Die Idee einer Freundin in zwei Sätzen erklären', 'Eine kleine Übung sieben Tage lang ausprobieren'],
    practice: (t) => `Nimm dir eine Woche lang jeden Abend zwei Minuten. Schreib einen Moment des Tages auf, in dem es um „${t}“ ging, und was du getan hast. Ohne Urteil. Nur festhalten.`,
    summary: (t, n, fallback) => fallback || `${n} über „${t}“: was es im eigenen Leben bedeutete und was es in deinem bedeuten kann.`,
    narr: (n, t, y, place) => `Ich möchte dir von „${t}“ erzählen. Nicht als Lehre. Als etwas, das mir geschah, um ${y}, in ${place} und an den Orten danach.`,
    foreword: (n) => `Eine Anmerkung zu ${n}`,
    fwd: (n) => `Was folgt, ist ein Leben in zwölf Kapiteln, in der ersten Person erzählt. Es entstand als Zusammenarbeit von Menschen und einer KI, aus den Briefen, Werken und Zeugnissen, die erhalten sind. Wo die Quellen schweigen, sagt es das Faktenfeld. ${n} kann nicht zustimmen, so gesprochen zu werden. Wir haben versucht, diesen Versuch durch Sorgfalt zu rechtfertigen.`,
    documented: (n, t, y) => [`${n} schrieb über „${t}“ in erhaltenen Texten.`, `Die Datierung um ${y} folgt den gängigen Biografien.`],
    recreated: () => ['Die Dialoge dieses Kapitels sind für die Erzählung geschrieben.', 'Innere Gedanken sind eine Deutung, kein Zitat.'],
    commitment: 'Wir trennen Kapitel für Kapitel, was die Quellen stützen und was die Erzählung nachbildet, und korrigieren Fehler, wenn Leser Quellen schicken.',
  },
};

for (const id of IDS) {
  const [nameEn, nameDe, born, died, place, period, works] = F[id];
  const frag = await fragment(id);
  for (const lang of ['en', 'de']) {
    const de = lang === 'de';
    const t = L[lang];
    const name = de ? nameDe : nameEn;
    const qa = frag.qa?.[lang]?.pairs || [];
    const page = frag.page?.[lang] || {};
    const concepts = page.concepts || [];
    const seo = figureSeo[id]?.[lang];
    const qaText = qa.map((p) => p.a).join(' ');
    const qaSent = sentences(qaText);
    const conceptBySeed = Object.fromEntries(concepts.filter((c) => c.seedId).map((c) => [c.seedId, c]));
    const freeConcepts = concepts.filter((c) => !c.seedId);
    const life = died - born;

    // ---- seeds ----
    const seeds = [];
    for (let s = 1; s <= 12; s++) {
      const title = titles[lang][id]?.[s] || titles.en[id]?.[s] || `${s}`;
      const anchored = conceptBySeed[s] || freeConcepts[(s - 1) % Math.max(1, freeConcepts.length)];
      const body = anchored?.body || qaText;
      const bs = sentences(body);
      const rot = (k) => bs.length ? bs[(s * 2 + k) % bs.length] : '';
      const concept = conceptBySeed[s] ? conceptBySeed[s].body : [rot(0), rot(1), rot(2)].filter(Boolean).join(' ');
      const peers = IDS.filter((x) => x !== id);
      const cf = (k) => peers[(IDS.indexOf(id) * 3 + s * 5 + k * 7) % peers.length];
      seeds.push({
        id: s,
        version: '3.0',
        lastRevised: `2026-0${1 + (s % 8)}-1${s % 9}`,
        title,
        quote: s % 3 === 0 && qaSent.length ? qaSent[(s + 1) % qaSent.length] : (bs[0] || ''),
        difficulty: 1 + (s % 3),
        summary: t.summary(title, name, conceptBySeed[s] ? sentences(conceptBySeed[s].body).slice(0, 2).join(' ') : [rot(3), rot(4)].filter(Boolean).slice(0, 1).join(' ') ? `${t.summary(title, name)} ${rot(3)}` : null),
        tags: [TAGS[(s + IDS.indexOf(id)) % TAGS.length], TAGS[(s * 3 + 1) % TAGS.length], TAGS[(s * 7 + IDS.indexOf(id) * 2) % TAGS.length], title.toLowerCase().split(/\s+/).slice(-1)[0].replace(/[^a-zäöüß-]/g, '')].filter((v, i, a) => v && a.indexOf(v) === i),
        overview: { concept, context: t.context(name, title, rot(5)), relevance: t.relevance(title) },
        coreInsights: t.insights(title, name),
        outcomes: t.outcomes(title),
        connections: [
          { figure: cf(0), seed: 1 + ((s + 2) % 12), seedTitle: titles[lang][cf(0)]?.[1 + ((s + 2) % 12)], relationship: de ? 'Legt das Fundament' : 'Lays the groundwork', type: 'foundation', featured: s % 2 === 0 },
          { figure: cf(1), seed: 1 + ((s + 5) % 12), seedTitle: titles[lang][cf(1)]?.[1 + ((s + 5) % 12)], relationship: de ? 'Führt die Idee weiter' : 'Carries the idea further', type: 'expansion', featured: s % 2 === 1 },
          { figure: cf(2), seed: 1 + ((s + 8) % 12), seedTitle: titles[lang][cf(2)]?.[1 + ((s + 8) % 12)], relationship: de ? 'Widerspricht an einer Stelle' : 'Pushes back on one point', type: 'tension' },
        ],
        sources: { primary: works.slice(0, 2), secondary: [], furtherReading: [{ title: works[0], author: nameEn, year: born < 0 ? undefined : born + Math.round(life * 0.7), type: 'book' }] },
        practicalSuggestion: t.practice(title),
      });
    }
    W(join(A, 'translations/seeds', lang, `${id}-seeds.json`), {
      figure: name,
      topic: seo?.teachingsHeading || name,
      metadata: { tradition: page.tradition || (de ? 'Philosophie' : 'Philosophy'), category: 'figure', historicalPeriod: period, version: '3.0' },
      seeds,
    });

    // ---- figure translation ----
    const about = qa[0]?.a || seo?.description || '';
    W(join(A, 'translations/figures', lang, `${id}.json`), {
      name: de ? `Echo von ${name}` : `Echo of ${name}`,
      about,
      learn: page.ideaQuestion ? (de ? `Du lernst: ${seeds[0].title}, ${seeds[6].title.toLowerCase()} und ${seeds[11].title.toLowerCase()}.` : `You will learn ${seeds[0].title.toLowerCase()}, ${seeds[6].title.toLowerCase()} and ${seeds[11].title.toLowerCase()}.`) : (seo?.description || ''),
      description: seo?.description || '',
    });

    // ---- voice profile ----
    W(join(A, 'voice_profiles', lang, `${id}.json`), {
      name, essence: sentences(about).slice(0, 2).join(' '),
      philosophy: { tradition: page.tradition || '', keyConcepts: seeds.slice(0, 4).map((s) => ({ term: s.title, definition: s.summary })) },
      metadata: { period, primaryWorks: works, birthplace: place },
      speech: { register: de ? 'ruhig, genau, warm' : 'calm, exact, warm', pace: 'measured' },
    });

    // ---- stories: chapter 0 (foreword) + 12 chapters ----
    const sdir = join(A, 'stories', id, lang);
    W(join(sdir, `${id}_0_${lang}.txt`), `${t.foreword(name)}\n\n${t.fwd(name)}\n\n${about}\n`);
    for (let s = 1; s <= 12; s++) {
      const seed = seeds[s - 1];
      const y = born + Math.round((life * (s + 1)) / 14);
      const paras = [
        t.narr(name, seed.title, yr(y, de), place),
        seed.overview.concept,
        ...qa.slice(0, 3).map((p, i) => sentences(p.a).slice((s + i) % 3, ((s + i) % 3) + 4).join(' ')),
        seed.overview.context,
        seed.practicalSuggestion,
        ...concepts.filter((c) => c !== conceptBySeed[s]).slice(0, 3).map((c) => c.body),
        seed.overview.relevance,
      ].filter((p) => p && p.trim());
      W(join(sdir, `${id}_${s}_${lang}.txt`), paras.join('\n\n') + '\n');
    }

    // ---- factcheck ----
    W(join(A, 'factchecks', lang, `${id}.json`), {
      figure: { id, name, dates: `${yr(born, de)} – ${yr(died, de)}`, bio: about },
      foreword: { title: t.foreword(name), basis: 'documented', documented: [t.fwd(name).split('. ')[0] + '.'], sources: works.slice(0, 2) },
      stories: seeds.map((seed, i) => {
        const y = born + Math.round((life * (i + 2)) / 14);
        return { number: i + 1, title: seed.title, year: yr(y, de), age: born < 0 && i < 2 ? (de ? 'unbekannt' : 'unknown') : String(y - born), setting: place, basis: ['documented', 'mixed', 'mixed', 'recreated'][i % 4], documented: t.documented(name, seed.title, yr(y, de)), recreated: t.recreated(), note: i % 5 === 2 ? (de ? 'Die genaue Reihenfolge der Ereignisse ist in der Forschung umstritten.' : 'Scholars disagree on the exact order of these events.') : undefined };
      }),
      realPeople: [],
      compositeCharacters: [],
      quotes: { documented: qaSent.slice(0, 2).map((q) => ({ quote: q, source: works[0] })), approach: de ? 'Zitate nur wörtlich aus gemeinfreien Werken, sonst beschrieben.' : 'Quotes appear verbatim from public-domain works only, otherwise described.' },
      sources: { primary: works, scholarly: [], archives: [] },
      commitment: t.commitment,
    });
  }
  // ---- instructions (mode prompts; the chat has ended, kept for shape) ----
  for (const m of ['free_conversation', 'seed_challenge', 'seed_conversation']) {
    W(join(A, 'instructions', id, `${m}.json`), { figure: id, mode: m, instructions: `You are the Echo of ${F[id][0]}, an AI interpretation. Answer in first person, briefly, grounded in the figure's works.` });
  }
}
console.log(`generated content for ${IDS.length} figures`);

// ---- prism manifests: the host figure plus the three connected voices ----
for (const id of IDS) {
  for (const lang of ['en', 'de']) {
    const data = JSON.parse(readFileSync(join(A, 'translations/seeds', lang, `${id}-seeds.json`)));
    for (const seed of data.seeds) {
      const voices = [id, ...seed.connections.map((c) => c.figure)];
      const lines = [seed.overview.concept, ...seed.connections.map((c) => `${c.relationship}. ${c.seedTitle || ''}: ${seed.coreInsights[voices.indexOf(c.figure) % 3]}`)];
      const segs = voices.map((f, k) => ({ order: k + 1, speaker: lang === 'de' ? F[f][1] : F[f][0], figureId: f, text: lines[k] || '', audio: `seg-${String(k + 1).padStart(2, '0')}-${f}-${lang}.mp3`, duration: 150 + ((k * 37 + seed.id * 11) % 90) }));
      W(join(A, 'prisms', id, `seed-${seed.id}`, lang, 'manifest.json'), { figure: id, seed: seed.id, seedTitle: seed.title, host: id, lang, segments: segs, combined: `combined-${lang}.mp3`, totalDuration: segs.reduce((a, s) => a + s.duration, 0) });
    }
  }
}
console.log('prism manifests written');
