export interface Chapter {
  num: number; // 1..14; 15 = notes, 16 = bibliography
  label: string;
  title: string;
  start: number;
  end: number;
}

export const BOOK = {
  title: 'Harbors of Oil',
  subtitle: 'The Atlantic Whaling Ports, 1690–1925',
  author: 'Ruth E. Halloran',
  publisher: 'Wickford University Press',
  productionEditor: 'Simon Achterberg',
  totalPages: 612,
  textEnd: 540,
  notes: { start: 541, end: 598 },
  biblio: { start: 599, end: 612 },
  indexablePages: 598,
  feePerPage: 4.1,
  due: 'Fri 20 Nov',
  daysLeft: 4,
  limitPages: 28,
  linesPerPage: 110,
  baselinePages: 31.5,
  draftLabel: 'First pass · saved Mon 16 Nov, 23:41',
};

export const CHAPTERS: Chapter[] = [
  { num: 1, label: '1', title: 'Shore Whaling and the Long Island Towns, 1650–1720', start: 1, end: 36 },
  { num: 2, label: '2', title: 'Nantucket Goes to Sea', start: 37, end: 74 },
  { num: 3, label: '3', title: 'Spermaceti and the Candle Combination', start: 75, end: 112 },
  { num: 4, label: '4', title: 'War, Embargo, and the Empty Wharves, 1775–1815', start: 113, end: 150 },
  { num: 5, label: '5', title: 'New Bedford Ascendant', start: 151, end: 190 },
  { num: 6, label: '6', title: 'The Lay: Wages, Debt, and the Outfitters', start: 191, end: 228 },
  { num: 7, label: '7', title: 'Crews of Many Shores', start: 229, end: 264 },
  { num: 8, label: '8', title: 'Pacific Grounds and Island Ports', start: 265, end: 300 },
  { num: 9, label: '9', title: "The Wives' Ports: Households, Credit, and Waiting", start: 301, end: 344 },
  { num: 10, label: '10', title: 'Sag Harbor, New London, and the Lesser Ports', start: 345, end: 382 },
  { num: 11, label: '11', title: 'The Arctic Turn: Baleen and the Western Fleet', start: 383, end: 420 },
  { num: 12, label: '12', title: 'Rock Oil and the Price of Light, 1859–1870', start: 421, end: 458 },
  { num: 13, label: '13', title: 'The Stone Fleet and the Disaster of 1871', start: 459, end: 500 },
  { num: 14, label: '14', title: 'Last Voyages: The Ports in Memory, 1880–1925', start: 501, end: 540 },
];

export const NOTES_CH: Chapter = { num: 15, label: 'Notes', title: 'Notes', start: 541, end: 598 };
export const BIB_CH: Chapter = { num: 16, label: 'Bibl.', title: 'Bibliography (not indexed)', start: 599, end: 612 };

export const ALL_SECTIONS = [...CHAPTERS, NOTES_CH, BIB_CH];

/** Notes pages are split among chapters in proportion to chapter length. */
export const NOTES_BLOCKS: { ch: number; start: number; end: number }[] = (() => {
  const total = BOOK.notes.end - BOOK.notes.start + 1; // 58
  const textTotal = BOOK.textEnd;
  const blocks: { ch: number; start: number; end: number }[] = [];
  let p = BOOK.notes.start;
  let acc = 0;
  CHAPTERS.forEach((c, i) => {
    acc += c.end - c.start + 1;
    const endP = i === CHAPTERS.length - 1 ? BOOK.notes.end : BOOK.notes.start + Math.round((acc / textTotal) * total) - 1;
    blocks.push({ ch: c.num, start: p, end: Math.max(p, endP) });
    p = Math.max(p, endP) + 1;
  });
  return blocks;
})();

export function chapterOf(page: number): Chapter {
  for (const c of ALL_SECTIONS) if (page >= c.start && page <= c.end) return c;
  return BIB_CH;
}

/** Which text chapter a notes page belongs to. */
export function notesChapterOf(page: number): number {
  for (const b of NOTES_BLOCKS) if (page >= b.start && page <= b.end) return b.ch;
  return 14;
}
