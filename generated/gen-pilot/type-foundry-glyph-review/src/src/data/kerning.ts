import { t, LAST_REVIEW } from './core';

export type KernDecision = 'pending' | 'accepted' | 'reverted';

export interface KernPair {
  id: string;
  left: string;
  right: string;
  before: number | null; // null = no pair existed on Tuesday
  after: number;
  at: number;
  unsure: boolean;
  note?: string;
  context: string;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Dutch newspaper vocabulary to proof pairs in context.
const WORDS = [
  'Tweede Kamer', 'Tijdens', 'Toen', 'Terug', 'Tussen', 'Twente', 'Tarieven', 'Toekomst', 'Vandaag', 'Verkiezingen',
  'Vorige', 'Volgens', 'Veel', 'Verder', 'Wat', 'Water', 'Weer', 'Wonen', 'Werk', 'Yoga', 'Yerseke', 'Ypenburg',
  'AVONDEDITIE', 'ANTWOORD', 'ALTIJD', 'LAATSTE', 'PAVILJOEN', 'KAVEL', 'OVERWAY', 'Papier', 'Plaats', 'Prijs',
  'Faillissement', 'Flevoland', 'Kosten', 'Koers', 'Ruw', 'RTV', 'krant.', 'ver.', 'over,', 'nieuw.', 'zwaar.',
  'IJSSELMEER', 'IJmuiden', '(hoofd)', '‘Avond’', '“Aan', 'L’Oréal', 'f)', 'stof.', 'Fryslân', 'Tóth', 'Tübingen',
  'Täby', 'Tïmo', 'Kõrge', 'Wörth', 'Yücel', 'ťava', 'ďalej', 'ľudia', 'Γαλλία', 'Τα νέα', 'ΤΑΥΤΟΤΗΤΑ', 'Υπουργός', 'Τώρα',
  'Γέφυρα', 'ΑΥΓΟΥΣΤΟΣ', 'ΛΥΣΗ', 'Γόνος', 'Τέλος', 'Γύρος', 'Ρόδος', 'Τύπος',
];

function contextFor(l: string, r: string) {
  const pair = l + r;
  const hits = WORDS.filter((w) => w.includes(pair));
  if (hits.length) return hits.slice(0, 2).join('  ');
  const greek = /[Ͱ-Ͽ]/.test(pair);
  const upper = l === l.toUpperCase() && r === r.toUpperCase() && /\p{L}/u.test(r);
  if (greek) return upper ? `ΗΗ${pair}ΗΗ  ΟΟ${pair}ΟΟ` : `ηη${pair}ηη  οο${pair}οο`;
  return upper ? `HH${pair}HH  OO${pair}OO` : `nn${pair}nn  oo${pair}oo`;
}

// Hand-noted pairs Jonas flagged as unsure (18).
const UNSURE: Array<[string, string, number | null, number, string]> = [
  ['T', 'ï', -74, -20, 'Dieresis hits the T bar at the class value (−74). Exception at −20 clears it. It’s rare — not sure it’s worth an exception.'],
  ['I', 'J', 0, -24, 'Dutch caps: IJSSELMEER. −24 makes I+J read as one letter like the Ĳ glyph. Match the ligature or keep them separate?'],
  ['ť', 'a', -10, 36, 'Caron-apostrophe collides with the a. +36 fixes it, but maybe ť should be drawn narrower instead (outline — not mine to change).'],
  ['ď', 'a', -8, 28, 'Same as ť: +28 to clear the caron. Slovak only, low priority for De Getijde.'],
  ['ľ', 'u', 0, 22, 'ľ + u: +22. Feels loose in Regular-size proofs but anything less touches.'],
  ['f', ')', 20, 48, 'Hook clears the paren at +48. Worried it looks gappy at text sizes. A shorter f hook would fix this better.'],
  ['f', '’', 12, 34, 'Same question as f) — I can kern it, but the hook is the real problem.'],
  ['Γ', 'α', -60, -86, 'Kerned against Eleni’s new α from last night. If α is sent back this needs redoing.'],
  ['Τ', 'ά', -68, -40, 'Tonos tucks under the Τ bar at the class value; exception −40.'],
  ['Υ', 'ο', -50, -72, 'Matched to Latin Yo (−72). Greek readers may expect it a bit looser — Eleni?'],
  ['r', '.', -40, -58, 'Bold r flag over the period: −58 puts the dot under the flag. Newspaper settings are tight, but please look.'],
  ['L', '’', -96, -124, 'Very tight. Only shows up in L’Oréal-type names. Too much?'],
  ['A', 'Y', -78, -96, 'Largest value in the font now. Looks right in AVONDEDITIE headlines, heavy in small caps-like settings.'],
  ['‘', 'A', -40, -66, 'Opening quote over A. Tight on purpose for pull quotes — confirm with Marieke’s pull-quote style?'],
  ['W', 'ö', -54, -30, 'Dieresis clashes with the W arm; exception at −30.'],
  ['T', 'y', -60, -78, 'Changed with the whole y class. Check against Tweede Kamer / Ty in headlines.'],
  ['K', 'õ', -30, -12, 'Tilde touches the K arm at −30.'],
  ['P', '.', -90, -118, 'Deep, the period sits under the P bowl. Standard for Bold but check against Regular (−96).'],
];

// Systematic pairs (Jonas re-kerned whole classes in Bold).
const LEFTS: Record<string, string> = {
  T: 'aeocsuyrwvzáéóäëöüàèò,.-:;', V: 'aeoucsAéóäöüá,.-', W: 'aeoucsAéóäüá,.-', Y: 'aeoucsAéóäüá,.-', A: 'TVWYtvwy’”CGOQU',
  L: 'TVWY’”yvw', P: 'A,.aeoá', F: 'A,.aeoár', K: 'oeuyOCGv', R: 'TVWYoey', r: ',.aeo', y: ',.aeo', v: ',.aeo',
  w: ',.aeo', k: 'oea', f: ']}?!', '“': 'AÁÄ', 'Γ': 'αεοωάέόρ', 'Τ': 'αεοωυέόΑ', 'Υ': 'αεωάέΑ', 'Α': 'ΤΥΥ', 'Λ': 'ΤΥ', 'Ρ': 'Α,.ο', O: 'VWYTAX,.', D: 'VWYA,.', x: 'oe', U: 'A,.',
};

function baseValue(l: string, r: string, rnd: () => number) {
  const punct = /[,.]/.test(r);
  const round = /[oeocsaáéóäëöüàèòαεοωάέόρCGOQ]/.test(r);
  let v: number;
  if ('TVWYΓΤΥ'.includes(l)) v = punct ? -100 : round ? -70 : -50;
  else if ('PFΡ'.includes(l)) v = punct ? -110 : -40;
  else if ('ALΑΛ'.includes(l)) v = /[’”]/.test(r) ? -90 : -70;
  else if ('rvwy'.includes(l)) v = punct ? -55 : -14;
  else if (l === 'f') v = 30;
  else if (l === '“') v = -60;
  else v = -24;
  if (/[-:;]/.test(r)) v = -40;
  return Math.round((v + (rnd() - 0.5) * 24) / 2) * 2;
}

function build(): KernPair[] {
  const rnd = mulberry32(1311);
  const out: KernPair[] = [];
  const seen = new Set<string>();
  let clockMin = t('Wed', 9, 2);
  const stamp = () => {
    // spread across Wed working day and this morning
    clockMin += 1 + Math.floor(rnd() * 4);
    if (clockMin > t('Wed', 16, 30) && clockMin < t('Thu', 7, 50)) clockMin = t('Thu', 7, 52);
    return Math.min(clockMin, t('Thu', 9, 12));
  };
  const unsureSet = new Map(UNSURE.map((u) => [u[0] + u[1], u]));
  const systematic: Array<[string, string]> = [];
  for (const [l, rs] of Object.entries(LEFTS)) for (const r of rs) systematic.push([l, r]);
  // interleave unsure pairs among systematic ones so the timeline looks natural
  const order: Array<[string, string]> = [];
  const unsurePairs = UNSURE.map((u) => [u[0], u[1]] as [string, string]);
  systematic.forEach((p, i) => {
    order.push(p);
    if (i % 11 === 5 && unsurePairs.length) order.push(unsurePairs.shift()!);
  });
  order.push(...unsurePairs);

  for (const [l, r] of order) {
    const key = l + r;
    if (seen.has(key)) continue;
    seen.add(key);
    const u = unsureSet.get(key);
    if (u) {
      out.push({ id: key, left: l, right: r, before: u[2], after: u[3], at: stamp(), unsure: true, note: u[4], context: contextFor(l, r) });
    } else {
      const after = baseValue(l, r, rnd);
      const isNew = rnd() < 0.12;
      const delta = Math.round(((rnd() - 0.5) * 36) / 2) * 2 || 6;
      out.push({ id: key, left: l, right: r, before: isNew ? null : after - delta, after, at: stamp(), unsure: false, context: contextFor(l, r) });
    }
    if (out.length === 214) break;
  }
  return out;
}

export const KERN_PAIRS: KernPair[] = build();
export const KERN_SINCE = LAST_REVIEW;

// Pairs Jonas keeps working through live while Ines has the app open.
export const LIVE_QUEUE: Array<[string, string, number]> = [
  ['Y', 'o', -72], ['Y', 'e', -70], ['Y', 'a', -68], ['Y', 'u', -52], ['Y', 'ó', -66], ['Y', 'ö', -40], ['Y', 'é', -66],
  ['Y', 's', -62], ['Y', 'c', -70], ['Y', ',', -104],
];
