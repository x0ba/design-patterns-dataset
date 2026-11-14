import { t, type PersonId, type StyleId } from './core';

export interface Message { id: string; author: PersonId; at: number; text: string }
export interface Thread {
  id: string;
  ch?: string;
  style: StyleId;
  subject: string;
  to: PersonId | null; // null = everyone
  messages: Message[];
  resolved: boolean;
}

let n = 0;
const m = (author: PersonId, at: number, text: string): Message => ({ id: `m${++n}`, author, at, text });

export const THREADS: Thread[] = [
  {
    id: 'th-italic-f', ch: 'f', style: 'italic', subject: 'Italic f descender', to: 'ines', resolved: false,
    messages: [
      m('jonas', t('Sun9', 10, 12), 'The italic f descender reaches −262 while g and j stop at −236. In “gf” and “f/” it collides at any kerning value I can live with. Are you shortening the descender, or should I add exceptions?'),
      m('tomas', t('Mon', 9, 40), 'I’d shorten it. It also touches the baseline rule in their caption style. Ines, your call — it’s your f.'),
    ],
  },
  {
    id: 'th-sigma', ch: 'ς', style: 'regular', subject: 'Final sigma terminal — flat or ball?', to: 'ines', resolved: false,
    messages: [
      m('eleni', t('Thu', 3, 1), 'ς Regular and Bold: I brought the terminal closer to your s — flat cut, no ball. If you prefer the old ball terminal I’ve kept it as ς.alt in the file. Descender now stops at −212 to match ρ and φ.'),
    ],
  },
  {
    id: 'th-amp', ch: '&', style: 'light', subject: 'Light ampersand at caption sizes', to: 'ines', resolved: false,
    messages: [
      m('tomas', t('Tue', 18, 22), 'Light &: opened the lower counter and lifted the crossing ~12 units. It looked clotted at 8 pt captions. Can you check it at 9/11 before I carry the change to Regular?'),
    ],
  },
  {
    id: 'th-esszett', ch: 'ẞ', style: 'regular', subject: 'Capital sharp s: flat top', to: null, resolved: false,
    messages: [
      m('tomas', t('Mon', 15, 5), 'ẞ Regular: drew the flat-top form as we discussed, ß reworked to match. Leaving this open until Ines approves both — they’re the last bits of Regular Latin besides Ŋ/ŋ and Ħ/ħ.'),
    ],
  },
  {
    id: 'th-greek-kern', ch: 'α', style: 'bold', subject: 'When are Greek outlines frozen for kerning?', to: 'eleni', resolved: false,
    messages: [
      m('jonas', t('Wed', 16, 40), 'Waiting on your α and λ revisions before I kern Greek in Bold. Can you tell me when outlines are frozen?'),
      m('eleni', t('Thu', 2, 58), 'Revised tonight. Frozen unless Ines sends anything back.'),
    ],
  },
  {
    id: 'th-tonos', ch: 'Ή', style: 'regular', subject: 'Tonos position on capitals', to: 'eleni', resolved: false,
    messages: [
      m('ines', t('Sat8', 11, 30), 'Tonos on the capitals sits too far left of Ή — the stroke nearly touches the left stem at headline sizes.'),
      m('eleni', t('Wed', 23, 20), 'Moved 18 units right on Ή, Ί and Ώ in Regular. Bold follows after your review.'),
    ],
  },
  {
    id: 'th-semibold-r', ch: 'R', style: 'semibold', subject: 'Semibold R leg changed — RSB', to: 'jonas', resolved: false,
    messages: [
      m('tomas', t('Mon', 11, 15), 'Changed the leg angle on Semibold R; the right sidebearing will need a look before you do Semibold kerning.'),
      m('jonas', t('Mon', 12, 2), 'Noted. I’ll do Semibold after Bold.'),
    ],
  },
  {
    id: 'th-bi-k', ch: 'k', style: 'bold-italic', subject: 'Bold Italic k arm joins too high', to: 'tomas', resolved: false,
    messages: [
      m('ines', t('Fri7', 17, 48), 'Bold Italic k: the arm joins too high, “ck” starts to look like “cl<”. Bring the junction down toward the x-height middle.'),
      m('tomas', t('Mon', 9, 12), 'On it this week.'),
    ],
  },
  {
    id: 'th-tf', ch: '1', style: 'bold', subject: 'Tabular one in Bold looks loose', to: null, resolved: false,
    messages: [
      m('jonas', t('Wed', 11, 5), 'one.tf in Bold looks loose in the market tables (stock prices page). Proposal: keep the 580 advance but move the outline 10 units right. That’s an outline change, so not mine — flagging it.'),
    ],
  },
];
