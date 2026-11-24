import type { Card, Change, Comment, DeckId, PersonId, Rule, Section, Session, Suggestion } from '../types';
import { CARD_ROWS, DECK_ORDER } from './cards';
import { RULES, SECTION_TITLES } from './rulebook';
import { at } from '../lib/time';

export const slug = (s: string) =>
  s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const INIT: Record<string, PersonId> = { h: 'hollis', j: 'jun', t: 'teodora' };

/* ---------- Rules ---------- */
export const buildRules = (): Record<string, Rule> => {
  const out: Record<string, Rule> = {};
  for (const [id, title, text] of RULES) out[id] = { id, section: Number(id.split('.')[0]), title, text };
  return out;
};
export const buildSections = (): Section[] => {
  const map = new Map<number, string[]>();
  for (const [id] of RULES) {
    const n = Number(id.split('.')[0]);
    map.set(n, [...(map.get(n) ?? []), id]);
  }
  return [...map.entries()].map(([num, rules]) => ({ num, title: SECTION_TITLES[num], rules }));
};

/* ---------- Changes since Saturday's playtest ---------- */
type CardChange = [string, number, number, number, PersonId, 'card', string, 'cost' | 'effect' | 'flavor', string];
type RuleChange = [string, number, number, number, PersonId, 'rule', string, 'text', string, string]; // from, to snippets
const RAW_CHANGES: (CardChange | RuleChange)[] = [
  ['c01', 14, 16, 40, 'hollis', 'card', 'salt-runner', 'cost', '2'],
  ['c02', 14, 17, 5, 'jun', 'card', 'salt-tax-lifted', 'effect', 'Salt price +1 this round.'],
  ['c03', 14, 17, 12, 'jun', 'card', 'timber-shortage', 'cost', '2'],
  ['c04', 14, 17, 31, 'jun', 'card', 'pearl-rush', 'effect', 'Pearl price +3.'],
  ['c05', 14, 17, 40, 'hollis', 'card', 'tidewardens-quay', 'effect', 'Your ships dock here for free. Gain 2 coins whenever any ship docks here.'],
  ['c06', 14, 18, 2, 'jun', 'card', 'guild-embargo', 'effect', 'Choose a player. They cannot sell Timber this round.'],
  ['c07', 14, 18, 10, 'hollis', 'card', 'the-counting-house', 'cost', '5'],
  ['c08', 14, 18, 20, 'jun', 'rule', '5.1', 'text', 'Price changes apply to every player’s cargo.', 'Price changes apply to everyone, including the player who played the card.'],
  ['c09', 14, 19, 44, 'jun', 'card', 'rumor-of-war', 'flavor', 'Everyone knows someone who knows.'],
  ['c10', 14, 20, 30, 'hollis', 'card', 'galleon-verity', 'cost', '7'],
  ['c11', 14, 20, 48, 'hollis', 'card', 'fluyt-annelise', 'effect', 'Hold 6.'],
  ['c12', 14, 21, 10, 'jun', 'card', 'price-freeze', 'cost', '3'],
  ['c13', 15, 8, 15, 'jun', 'card', 'spice-monopoly', 'effect', 'Spice price +2. You may not load Spice.'],
  ['c14', 15, 8, 40, 'jun', 'rule', '5.2', 'text', 'At the end of the Market phase, a marker on the floor or ceiling stays put.', 'At the end of the Market phase, a marker on the floor moves up one step and a marker on the ceiling moves down one step, even if it was not moved by a card this round.'],
  ['c15', 15, 9, 5, 'jun', 'card', 'dockside-auction', 'effect', 'Swap one of your cargo with one from the supply.'],
  ['c16', 15, 9, 52, 'jun', 'card', 'harvest-surplus', 'effect', 'Salt and Spice prices -1.'],
  ['c17', 15, 10, 10, 'hollis', 'card', 'carrack-ironbell', 'effect', 'Hold 6. Immune to Storm and Fog events.'],
  ['c18', 15, 10, 30, 'jun', 'card', 'fog-bank', 'effect', 'Weather. Skip the Market and Sail phases this round.'],
  ['c19', 15, 11, 2, 'hollis', 'rule', '6.2', 'text', 'There is no limit to the income a Harbor can earn.', 'Harbor income is capped at 3 coins per round. Any additional income that you would earn is lost.'],
  ['c20', 15, 11, 48, 'jun', 'card', 'foreign-buyers', 'effect', 'Choose a cargo. Its price +1 per docked ship carrying it.'],
  ['c21', 15, 12, 15, 'jun', 'card', 'ledger-error', 'effect', 'Move any price up 1.'],
  ['c22', 15, 12, 40, 'hollis', 'card', 'cutter-wren', 'effect', 'Hold 2. Docks twice per round.'],
  ['c23', 15, 13, 20, 'jun', 'card', 'spice-glut', 'effect', 'Spice price -2.'],
];

/* ---------- Cards ---------- */
function hash(s: string) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function buildState() {
  const cards: Record<string, Card> = {};
  for (const deck of DECK_ORDER) {
    for (const [name, cost, effect, flavor, version, ed] of CARD_ROWS[deck]) {
      const id = slug(name);
      const hsh = hash(id);
      cards[id] = {
        id, name, cost, effect, flavor, deck, version,
        editor: INIT[ed],
        // quiet earlier edits: Oct 4 .. Nov 12 (Teodora was last seen Nov 12)
        edited: new Date(2026, 9, 4 + (hsh % 39), 9 + (hsh % 11), (hsh >> 3) % 60),
      };
    }
  }

  const rules = buildRules();

  const changes: Change[] = RAW_CHANGES.map((c) => {
    const [id, day, h, m, by, kind, target, field] = c;
    const when = at(day, h, m);
    if (kind === 'card') {
      const card = cards[target];
      const before = c[8] as string;
      const after = field === 'cost' ? String(card.cost) : (card[field as 'effect' | 'flavor'] as string);
      card.editor = by;
      card.edited = when;
      return { id, at: when, by, kind, target, field, before, after, vFrom: card.version - 1, vTo: card.version, seen: by === 'hollis' };
    }
    const rule = rules[target];
    const from = c[8] as string;
    const to = c[9] as string;
    const before = rule.text.replace(to, from);
    return { id, at: when, by, kind, target, field: 'text', before, after: rule.text, seen: by === 'hollis' };
  });
  changes.sort((a, b) => b.at.getTime() - a.at.getTime());

  // Jun is typing in Spice Glut right now (unsaved)
  cards['spice-glut'].live = {
    by: 'jun',
    effect: 'Move the Spice price down 2. This hits every player, including you. Then draw a Market card.',
    since: at(15, 14, 58),
  };

  const comments: Comment[] = [
    { id: 'k1', author: 'sam', at: at(14, 23, 12), anchor: { kind: 'card', id: 'tidewardens-quay' }, status: 'open', replies: [],
      text: 'I had this out by round 2 and every dock after that cost me nothing, plus everybody else’s docking paid me. By round 4 I was buying a ship a turn and the other three of us were just watching me count coins. Not fun for the table, and I won.' },
    { id: 'k2', author: 'sam', at: at(14, 23, 31), anchor: { kind: 'card', id: 'brigantine-dawn' }, status: 'open', replies: [],
      text: 'The card says “moors” but rule 4.2 says “docks.” Are those the same thing? We lost a minute on this, and then Aditi made a joke about boats that I won’t repeat.' },
    { id: 'k3', author: 'sam', at: at(14, 23, 48), anchor: { kind: 'rule', id: '4.2' }, status: 'open', replies: [],
      text: 'When two ships want the last berth in the same round, who goes first? We went clockwise from the Gull marker but the book doesn’t actually say that anywhere.' },
    { id: 'k4', author: 'sam', at: at(15, 0, 5), anchor: { kind: 'card', id: 'salt-runner' }, status: 'open', replies: [],
      text: 'Thanks for bumping the cost to 3. It’s still a better deal than Fluyt Annelise at 6, though. Salt is in half the Contracts and the market, so I bought it every game.' },
    { id: 'k5', author: 'sam', at: at(15, 0, 40), anchor: { kind: 'card', id: 'spice-glut' }, status: 'open', replies: [],
      text: 'I didn’t realize the price drop hits the player who played it too, and I dropped my own Spice by 2 with a full hold. Maybe the card should say “every player, including you.”' },
    { id: 'k6', author: 'sam', at: at(15, 1, 15), anchor: { kind: 'rule', id: '9.1' }, status: 'open', replies: [],
      text: 'We argued for five minutes about the last round: does Tally still happen, and when do unfinished Contracts count as failed? Two paragraphs and no example. A worked example of round six would settle it.' },
    { id: 'k7', author: 'sam', at: at(15, 1, 50), anchor: { kind: 'card', id: 'the-patient-heron' }, status: 'open', replies: [],
      text: 'Love the flavor text on this one. Please don’t cut it for space when you rewrite the effect.' },
    { id: 'k8', author: 'sam', at: at(15, 2, 20), anchor: { kind: 'rule', id: '2.1' }, status: 'open', replies: [],
      text: 'The rulebook says 10 starting coins but the player aid card I was handed says 12. Which is right? Aditi started with 12 and had the easiest first round.' },
    { id: 'k9', author: 'sam', at: at(15, 3, 30), anchor: { kind: 'card', id: 'fog-bank' }, status: 'open', replies: [],
      text: 'Does Fog Bank skip the market phase entirely or just the sailing? We skipped everything and it felt harsh, since nobody could do anything for a whole round.' },
    { id: 'k10', author: 'sam', at: at(15, 5, 48), anchor: { kind: 'card', id: 'merchantman-odile' }, status: 'open', replies: [],
      text: 'Typo in the effect text: “cargoe” should be “cargo.” Also the sentence is a bit of a mouthful, but that might just be me being picky at 5am.' },
    { id: 'k11', author: 'sam', at: at(15, 6, 55), anchor: { kind: 'rule', id: '6.2' }, status: 'open', replies: [],
      text: 'Is the 3 coin cap on Harbor income per Harbor or total? I read it as per Harbor, which would still let one player earn 9 a round.' },
    { id: 'k12', author: 'aditi', at: at(11, 20, 14, 10), anchor: { kind: 'card', id: 'skiff-marigold' }, status: 'resolved',
      text: 'Does the Skiff really dock for free everywhere? That feels strong for a starting ship.',
      replies: [{ by: 'hollis', at: at(9, 20, 40, 10), text: 'Yes, on purpose. It only holds 2, and the free docking is what makes the first round move quickly. Let me know if it still feels strong after a few games.' }] },
    { id: 'k13', author: 'aditi', at: at(8, 18, 3, 10), anchor: { kind: 'rule', id: '3.2' }, status: 'resolved',
      text: 'The Market phase heading says “drift” but I couldn’t find that word defined anywhere.',
      replies: [{ by: 'hollis', at: at(8, 19, 20, 10), text: 'Good catch. It’s now in rule 5.3 and in the glossary.' }] },
  ];
  // fix: resolved Aditi dates (Nov 8/9)
  comments[11].at = at(9, 14, 10);
  comments[12].at = at(8, 18, 3);
  comments[11].replies[0].at = at(9, 20, 40);
  comments[12].replies[0].at = at(8, 19, 20);

  const suggestion: Suggestion = {
    id: 'sg1', ruleId: '4.2', by: 'jun', at: at(15, 14, 5), status: 'pending',
    rationale:
      'Our table paid docking fees out of order on Saturday, so I put the sequence into numbered steps. I also added the tie-break for the last berth (turn order from the Gull marker), which answers Sam’s question, and I used “dock” everywhere so we stop mixing it up with “moor.”',
    proposed:
`A ship may dock at any harbor that has an open berth. Each harbor has one berth fewer than the number of players. To dock, a ship follows these steps in order:

1. Sail the ship to the harbor you choose.
2. Pay the harbor's docking fee to the harbor's owner, or to the bank if nobody owns it.
3. Place the ship on an open berth. It is now docked.
4. Load or unload cargo (rule 4.3). A docked ship may do this once per round.

If more ships arrive than there are berths, ships dock in turn order starting with the first player. A ship that cannot dock stays at sea and may try another harbor next round.

Some ships and Harbors change how docking works. Read the card carefully, and remember that the card wins (rule 1.3).`,
  };

  const sessions: Session[] = [
    { id: 's1', date: at(13, 14, 0, 8), version: '0.3', players: ['Hollis', 'Sam', 'Aditi'], minutes: 112, target: 90,
      headline: 'First full run. The Market deck was too thin, so price swings felt random.',
      notes: [{ by: 'hollis', at: at(13, 17, 0, 8), text: 'Only 12 Market cards at this point. Prices jumped around and nobody could plan a route.', tags: ['market', 'pacing'] }] },
    { id: 's2', date: at(27, 14, 0, 8), version: '0.4', players: ['Hollis', 'Sam', 'Aditi', 'Dev Okafor'], minutes: 101, target: 90,
      headline: 'Contracts added. Sail phase dragged: too many choices on every turn.',
      notes: [{ by: 'hollis', at: at(27, 16, 50, 8), text: 'Contracts gave people a goal, which was great. Sail phase turns took about four minutes each at the end though.', tags: ['contracts', 'pacing'] }] },
    { id: 's3', date: at(11, 14, 0, 9), version: '0.5', players: ['Hollis', 'Sam', 'Jun (video)'], minutes: 94, target: 90,
      headline: 'Wholesale price rule fixed the “everything is free” feeling.',
      notes: [{ by: 'jun', at: at(11, 16, 30, 9), text: 'Wholesale at two below current price is the right gap. Anything wider made price cards irrelevant.', tags: ['market', 'economy'] }] },
    { id: 's4', date: at(25, 14, 0, 9), version: '0.6', players: ['Hollis', 'Sam', 'Aditi', 'Dev Okafor'], minutes: 88, target: 90,
      headline: 'First session under the 90 minute target.',
      notes: [{ by: 'hollis', at: at(25, 16, 0, 9), text: 'Four ships limit and the six Market card hand limit both helped. Ended with everyone within 12 coins of each other.', tags: ['pacing', 'balance'] }] },
    { id: 's5', date: at(1, 14, 0, 10), version: '0.6', players: ['Hollis', 'Aditi', 'Dev Okafor', 'Teodora (video)'], minutes: 84, target: 90,
      rounds: [11, 12, 13, 14, 16, 18],
      gold: [
        { name: 'Hollis', series: [11, 16, 22, 29, 36, 44] }, { name: 'Aditi', series: [11, 15, 21, 28, 35, 41] },
        { name: 'Dev', series: [10, 14, 20, 26, 32, 38] }, { name: 'Teodora', series: [12, 16, 21, 27, 33, 40] },
      ],
      headline: 'Tightest game yet. Contracts felt strong without taking over.',
      notes: [{ by: 'teodora', at: at(1, 16, 20, 10), text: 'Best session so far. I would not touch the economy. Harbors were the missing piece.', tags: ['balance', 'harbor'] }] },
    { id: 's6', date: at(14, 13, 30), version: '0.7', players: ['Hollis', 'Sam', 'Aditi', 'Dev Okafor'], minutes: 130, target: 90,
      rounds: [9, 14, 18, 24, 31, 34],
      gold: [
        { name: 'Sam', series: [12, 19, 31, 46, 63, 84] }, { name: 'Hollis', series: [11, 15, 19, 24, 27, 30] },
        { name: 'Aditi', series: [12, 14, 19, 22, 28, 31] }, { name: 'Dev', series: [10, 13, 16, 21, 22, 26] },
      ],
      headline: 'The new Harbor cards made the economy snowball. Forty minutes over target.',
      notes: [
        { by: 'hollis', at: at(14, 16, 5), tags: ['harbor', 'economy', 'pacing'],
          text: 'Sam built Tidewarden’s Quay in round 2 and the Counting House in round 3. From round 4 on nobody could catch up on coin. Round 6 took 34 minutes because every turn was just counting what Sam would earn.' },
        { by: 'hollis', at: at(14, 16, 12), tags: ['rules', 'docking'],
          text: 'Aditi: “Who goes first when two ships want the last berth?” We guessed. Need a tie-break written down in 4.2.' },
        { by: 'hollis', at: at(14, 16, 20), tags: ['feel'],
          text: 'Dev: “Fun for the first hour, then I started doing math to stay awake.” Fair. The ships felt nice. The Harbors need a ceiling.' },
      ] },
  ];

  return { cards, rules, changes, comments, suggestion, sessions };
}
export const DECKS: DeckId[] = DECK_ORDER;
