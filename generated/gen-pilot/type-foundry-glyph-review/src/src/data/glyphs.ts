import type { GlyphStatus, Script, StyleId } from './core';

export type GlyphCat = 'Uppercase' | 'Lowercase' | 'Figures' | 'Punctuation' | 'Symbols' | 'Marks' | 'Ligatures' | 'Spaces';

export interface Glyph {
  id: string; // glyph name, unique
  ch: string; // text used to render it
  name: string;
  script: Script;
  cat: GlyphCat;
  cp: string; // "U+00E9" or "liga"
}

const range = (a: number, b: number) => {
  const r: string[] = [];
  for (let i = a; i <= b; i++) r.push(String.fromCodePoint(i));
  return r;
};

// ---------- naming ----------
const ASCII_NAMES: Record<string, string> = {
  ' ': 'space', '!': 'exclam', '"': 'quotedbl', '#': 'numbersign', $: 'dollar', '%': 'percent', '&': 'ampersand',
  "'": 'quotesingle', '(': 'parenleft', ')': 'parenright', '*': 'asterisk', '+': 'plus', ',': 'comma', '-': 'hyphen',
  '.': 'period', '/': 'slash', '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six',
  '7': 'seven', '8': 'eight', '9': 'nine', ':': 'colon', ';': 'semicolon', '<': 'less', '=': 'equal', '>': 'greater',
  '?': 'question', '@': 'at', '[': 'bracketleft', '\\': 'backslash', ']': 'bracketright', '^': 'asciicircum',
  _: 'underscore', '`': 'grave', '{': 'braceleft', '|': 'bar', '}': 'braceright', '~': 'asciitilde',
};
const L1_NAMES = ['nbspace', 'exclamdown', 'cent', 'sterling', 'currency', 'yen', 'brokenbar', 'section', 'dieresis', 'copyright',
  'ordfeminine', 'guillemetleft', 'logicalnot', 'softhyphen', 'registered', 'macron', 'degree', 'plusminus', 'twosuperior',
  'threesuperior', 'acute', 'mu', 'paragraph', 'periodcentered', 'cedilla', 'onesuperior', 'ordmasculine', 'guillemetright',
  'onequarter', 'onehalf', 'threequarters', 'questiondown'];
const SPECIAL: Record<string, string> = {
  '×': 'multiply', '÷': 'divide', 'Ø': 'Oslash', 'ø': 'oslash', 'Æ': 'AE', 'æ': 'ae', 'Œ': 'OE', 'œ': 'oe', 'ß': 'germandbls',
  'ẞ': 'Germandbls', 'Þ': 'Thorn', 'þ': 'thorn', 'Ð': 'Eth', 'ð': 'eth', 'Đ': 'Dcroat', 'đ': 'dcroat', 'Ħ': 'Hbar', 'ħ': 'hbar',
  'ı': 'dotlessi', 'Ĳ': 'IJ', 'ĳ': 'ij', 'ĸ': 'kgreenlandic', 'Ŀ': 'Ldot', 'ŀ': 'ldot', 'Ł': 'Lslash', 'ł': 'lslash',
  'ŉ': 'napostrophe', 'Ŋ': 'Eng', 'ŋ': 'eng', 'Ŧ': 'Tbar', 'ŧ': 'tbar', 'ƒ': 'florin', 'Ə': 'Schwa', 'ə': 'schwa', 'ȷ': 'dotlessj',
  'Ǽ': 'AEacute', 'ǽ': 'aeacute', 'Ǿ': 'Oslashacute', 'ǿ': 'oslashacute',
  '–': 'endash', '—': 'emdash', '‘': 'quoteleft', '’': 'quoteright', '‚': 'quotesinglbase', '“': 'quotedblleft',
  '”': 'quotedblright', '„': 'quotedblbase', '•': 'bullet', '…': 'ellipsis', '′': 'minute', '″': 'second',
  '‹': 'guilsinglleft', '›': 'guilsinglright', '⁄': 'fraction', '€': 'Euro', '™': 'trademark', '−': 'minus', '†': 'dagger',
  'ℓ': 'litre', 'ˆ': 'circumflex', 'ˇ': 'caron', '˚': 'ring', '˜': 'tilde', '˝': 'hungarumlaut', 'ˉ': 'macronmod',
  'ʼ': 'apostrophemod', 'ʻ': 'commaturnedmod', '₤': 'lira', '₺': 'liraTurkish', '₹': 'rupeeIndian', '₽': 'ruble',
  '₴': 'hryvnia', '₦': 'naira', '₩': 'won', '₱': 'peso', '̀': 'gravecomb', '́': 'acutecomb', '̃': 'tildecomb',
  '̄': 'macroncomb', '̈': 'dieresiscomb', '̉': 'hookabovecomb', '̣': 'dotbelowcomb',
};
const MARKS: Record<string, string> = {
  '̀': 'grave', '́': 'acute', '̂': 'circumflex', '̃': 'tilde', '̄': 'macron', '̆': 'breve',
  '̇': 'dotaccent', '̈': 'dieresis', '̊': 'ring', '̋': 'hungarumlaut', '̌': 'caron', '̧': 'cedilla',
  '̨': 'ogonek', '̦': 'commaaccent', '̣': 'dotbelow', '̱': 'macronbelow',
};

const GREEK_BASE: Record<string, string> = {
  'Α': 'Alpha', 'Β': 'Beta', 'Γ': 'Gamma', 'Δ': 'Delta', 'Ε': 'Epsilon', 'Ζ': 'Zeta', 'Η': 'Eta', 'Θ': 'Theta', 'Ι': 'Iota',
  'Κ': 'Kappa', 'Λ': 'Lambda', 'Μ': 'Mu', 'Ν': 'Nu', 'Ξ': 'Xi', 'Ο': 'Omicron', 'Π': 'Pi', 'Ρ': 'Rho', 'Σ': 'Sigma', 'Τ': 'Tau',
  'Υ': 'Upsilon', 'Φ': 'Phi', 'Χ': 'Chi', 'Ψ': 'Psi', 'Ω': 'Omega',
  'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'epsilon', 'ζ': 'zeta', 'η': 'eta', 'θ': 'theta', 'ι': 'iota',
  'κ': 'kappa', 'λ': 'lambda', 'μ': 'mu', 'ν': 'nu', 'ξ': 'xi', 'ο': 'omicron', 'π': 'pi', 'ρ': 'rho', 'σ': 'sigma',
  'ς': 'sigmafinal', 'τ': 'tau', 'υ': 'upsilon', 'φ': 'phi', 'χ': 'chi', 'ψ': 'psi', 'ω': 'omega',
  'ʹ': 'numeralsign', '͵': 'lownumeralsign', 'ͺ': 'ypogegrammenimod', ';': 'questiongreek', '΄': 'tonos',
  '΅': 'dieresistonos', '·': 'anoteleia', 'ϗ': 'kaiSymbol', 'Ϙ': 'Koppaarchaic', 'ϙ': 'koppaarchaic', 'Ϛ': 'Stigma',
  'ϛ': 'stigma', 'Ϝ': 'Digamma', 'ϝ': 'digamma', 'Ϟ': 'Koppa', 'ϟ': 'koppa', 'Ϡ': 'Sampi', 'ϡ': 'sampi',
};
const GREEK_MARKS: Record<string, string> = {
  '̓': 'psili', '̔': 'dasia', '̀': 'varia', '́': 'oxia', '͂': 'perispomeni', 'ͅ': 'ypogegrammeni',
  '̈': 'dialytika', '̄': 'macron', '̆': 'vrachy',
};

const cpLabel = (ch: string) => 'U+' + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0');

function latinName(ch: string): string {
  if (ASCII_NAMES[ch]) return ASCII_NAMES[ch];
  const cp = ch.codePointAt(0)!;
  if (cp >= 0xa0 && cp <= 0xbf) return L1_NAMES[cp - 0xa0];
  if (SPECIAL[ch]) return SPECIAL[ch];
  if (/^[A-Za-z]$/.test(ch)) return ch;
  const nfd = ch.normalize('NFD');
  const base = nfd[0];
  if (/[A-Za-z]/.test(base)) {
    const marks = [...nfd.slice(1)].map((m) => {
      if (m === '̧' && /[GKLNRgklnr]/.test(base)) return 'commaaccent';
      return MARKS[m] ?? 'uni' + m.codePointAt(0)!.toString(16).toUpperCase();
    });
    return base + marks.join('');
  }
  return 'uni' + cp.toString(16).toUpperCase().padStart(4, '0');
}

function greekName(ch: string): string {
  if (GREEK_BASE[ch]) return GREEK_BASE[ch];
  const cp = ch.codePointAt(0)!;
  const nfd = ch.normalize('NFD');
  const base = GREEK_BASE[nfd[0]];
  if (base) {
    const ext = cp >= 0x1f00;
    const marks = [...nfd.slice(1)].map((m) => {
      if (m === '́' && !ext) return 'tonos';
      if (m === 'ͅ' && /[A-Z]/.test(base[0])) return 'prosgegrammeni';
      return GREEK_MARKS[m] ?? 'uni' + m.codePointAt(0)!.toString(16).toUpperCase();
    });
    return base + marks.join('');
  }
  return 'uni' + cp.toString(16).toUpperCase().padStart(4, '0');
}

function catOf(ch: string): GlyphCat {
  if (/\s|­/u.test(ch)) return 'Spaces';
  if (/\p{Lu}|\p{Lt}/u.test(ch)) return 'Uppercase';
  if (/\p{Ll}|\p{Lo}/u.test(ch)) return 'Lowercase';
  if (/\p{Nd}/u.test(ch)) return 'Figures';
  if (/\p{M}/u.test(ch)) return 'Marks';
  if (/\p{P}/u.test(ch)) return 'Punctuation';
  if (/\p{Lm}|\p{Sk}/u.test(ch)) return 'Marks';
  if (/\p{No}/u.test(ch)) return 'Figures';
  return 'Symbols';
}

// ---------- Latin: 408 ----------
const latinChars: string[] = [
  ...range(0x20, 0x7e),
  ...range(0xa0, 0xff),
  ...range(0x100, 0x17e),
  ...'–—‘’‚“”„•…′″‹›⁄€™−†ℓ'.split(''),
  ...'ƏəƒȘșȚțȷǦǧǪǫǺǻǼǽǾǿ'.split(''),
  ...'ẀẁẂẃẄẅỲỳẞḌḍḤḥṂṃṆṇṚṛṢṣṬṭẒẓḶḷ'.split(''),
  ...'ˆˇ˚˜˝ˉʼʻ'.split(''),
  ...'₤₺₹₽₴₦₩₱'.split(''),
  ...['̀', '́', '̃', '̄', '̈', '̉', '̣'],
];

export const LATIN: Glyph[] = [
  ...latinChars.map((ch) => ({ id: latinName(ch), ch, name: latinName(ch), script: 'latin' as Script, cat: catOf(ch), cp: cpLabel(ch) })),
  { id: 'fi', ch: 'fi', name: 'fi', script: 'latin', cat: 'Ligatures', cp: 'liga' },
  { id: 'fl', ch: 'fl', name: 'fl', script: 'latin', cat: 'Ligatures', cp: 'liga' },
];

// ---------- Greek: 204 ----------
const greekBlock = 'ʹ͵ͺ;΄΅Ά·ΈΉΊΌΎΏΐΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΪΫάέήίΰαβγδεζηθικλμνξοπρςστυφχψωϊϋόύώϗϘϙϚϛϜϝϞϟϠϡ';
const greekExt = range(0x1f00, 0x1fff).filter((c) => !/\p{Cn}/u.test(c)).slice(0, 204 - [...greekBlock].length);

export const GREEK: Glyph[] = [...[...greekBlock], ...greekExt].map((ch) => ({
  id: greekName(ch) + (LATIN.some((l) => l.id === greekName(ch)) ? '.grek' : ''),
  ch, name: greekName(ch), script: 'greek' as Script, cat: catOf(ch), cp: cpLabel(ch),
}));

export const ALL_GLYPHS = [...LATIN, ...GREEK];
export const glyphByChar = (ch: string) => ALL_GLYPHS.find((g) => g.ch === ch);
export const glyphById = new Map(ALL_GLYPHS.map((g) => [g.id, g]));

// ---------- statuses ----------
export type StatusMap = Record<string, GlyphStatus>; // key `${style}:${glyphId}`
export const skey = (style: StyleId, glyphId: string) => `${style}:${glyphId}`;

interface Counts { approved: number; review: number; draft: number }

function assign(out: StatusMap, style: StyleId, glyphs: Glyph[], counts: Counts, forced: Record<string, GlyphStatus>) {
  const remaining = { ...counts };
  for (const g of glyphs) {
    const f = forced[g.ch];
    if (f) { out[skey(style, g.id)] = f; remaining[f]--; }
  }
  for (const g of glyphs) {
    if (forced[g.ch]) continue;
    const st: GlyphStatus = remaining.approved > 0 ? 'approved' : remaining.review > 0 ? 'review' : 'draft';
    remaining[st]--;
    out[skey(style, g.id)] = st;
  }
}

const isLower = (g: Glyph) => g.cat === 'Lowercase';
const ARCHAIC = 'ϗϘϙϚϛϜϝϞϟϠϡ͵';
// maturity order for Greek: capitals & punctuation, then monotonic lowercase, then polytonic lowercase, then archaic
const greekOrdered = [
  ...GREEK.filter((g) => !isLower(g) && !ARCHAIC.includes(g.ch)),
  ...GREEK.filter((g) => isLower(g) && !ARCHAIC.includes(g.ch) && g.ch.codePointAt(0)! < 0x1f00),
  ...GREEK.filter((g) => isLower(g) && !ARCHAIC.includes(g.ch) && g.ch.codePointAt(0)! >= 0x1f00),
  ...GREEK.filter((g) => ARCHAIC.includes(g.ch)),
];

export const REGULAR_LATIN_IN_REVIEW = ['ẞ', 'ß', 'Ŋ', 'ŋ', 'Ħ', 'ħ'];

export function initialStatuses(revisedByStyle: Record<StyleId, string[]>): StatusMap {
  const out: StatusMap = {};
  const forcedReview = (style: StyleId, extra: string[] = []) =>
    Object.fromEntries([...revisedByStyle[style], ...extra].map((c) => [c, 'review' as GlyphStatus]));
  const draftArchaic = Object.fromEntries([...ARCHAIC].map((c) => [c, 'draft' as GlyphStatus]));

  // Regular: Latin 402/6/0, Greek 105/87/12
  assign(out, 'regular', LATIN, { approved: 402, review: 6, draft: 0 }, forcedReview('regular', REGULAR_LATIN_IN_REVIEW));
  assign(out, 'regular', greekOrdered, { approved: 105, review: 87, draft: 12 }, { ...forcedReview('regular'), ...draftArchaic });

  assign(out, 'light', LATIN, { approved: 397, review: 11, draft: 0 }, forcedReview('light', ['ẞ', 'ß', 'Ŋ', 'ŋ', 'ĸ', 'ŉ', 'Ħ', 'ħ', 'ƒ']));
  assign(out, 'light', greekOrdered, { approved: 41, review: 119, draft: 44 }, { ...forcedReview('light'), ...draftArchaic });

  assign(out, 'semibold', LATIN, { approved: 371, review: 37, draft: 0 }, forcedReview('semibold'));
  assign(out, 'semibold', greekOrdered, { approved: 0, review: 54, draft: 150 }, forcedReview('semibold'));

  assign(out, 'bold', LATIN, { approved: 396, review: 12, draft: 0 }, forcedReview('bold'));
  assign(out, 'bold', greekOrdered, { approved: 70, review: 110, draft: 24 }, { ...forcedReview('bold'), ...draftArchaic });

  assign(out, 'italic', LATIN, { approved: 352, review: 44, draft: 12 }, forcedReview('italic'));
  assign(out, 'italic', greekOrdered, { approved: 0, review: 44, draft: 160 }, forcedReview('italic'));

  assign(out, 'bold-italic', LATIN, { approved: 298, review: 86, draft: 24 }, forcedReview('bold-italic'));
  assign(out, 'bold-italic', greekOrdered, { approved: 0, review: 0, draft: 204 }, forcedReview('bold-italic'));
  return out;
}

export function countStatuses(map: StatusMap, style: StyleId, script: Script) {
  const glyphs = script === 'latin' ? LATIN : GREEK;
  const c = { approved: 0, review: 0, draft: 0 };
  for (const g of glyphs) c[map[skey(style, g.id)]]++;
  return c;
}
