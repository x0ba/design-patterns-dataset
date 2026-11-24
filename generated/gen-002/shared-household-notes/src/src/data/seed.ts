import type {
  Change,
  Collaborator,
  DepositItem,
  FurnitureItem,
  NoteState,
  Person,
  Presence,
  Task,
  TaskSection,
  Thread,
  Trashed,
  PersonId,
} from '../types';
import { DECISION_LABEL, ME_DEVICE } from '../constants';
import { fmtDue } from '../lib/format';

// The app opens at this moment. Real time elapsed since page load is added on top,
// so "just now" and "N min ago" stay honest while the page is open.
export const CLOCK_BASE = new Date(2026, 10, 17, 9, 14).getTime();
const LOADED_AT = Date.now();
export const nowMs = (): number => CLOCK_BASE + (Date.now() - LOADED_AT);

const T = (s: string): number => new Date(s.replace(' ', 'T')).getTime();

export const PEOPLE: Record<PersonId, Person> = {
  kenji: { id: 'kenji', name: 'Kenji Morales', first: 'Kenji', initials: 'KM', hue: 205 },
  lucia: { id: 'lucia', name: 'Lucía Vargas', first: 'Lucía', initials: 'LV', hue: 12 },
  priya: { id: 'priya', name: 'Priya Raman', first: 'Priya', initials: 'PR', hue: 268 },
  sam: { id: 'sam', name: 'Sam Okafor', first: 'Sam', initials: 'SO', hue: 152 },
  theo: { id: 'theo', name: 'Theo Lindqvist', first: 'Theo', initials: 'TL', hue: 36 },
  marjorie: { id: 'marjorie', name: 'Marjorie Chen', first: 'Marjorie', initials: 'MC', hue: 330, landlord: true },
};

export const ROOMMATES: PersonId[] = ['kenji', 'lucia', 'priya', 'sam', 'theo'];

export const DEVICES: Record<PersonId, string> = {
  kenji: ME_DEVICE,
  lucia: 'Android phone',
  priya: 'Safari · MacBook',
  sam: 'iPad',
  theo: 'iPhone',
  marjorie: 'Chrome · Windows',
};

// Who is in the note right now, as the presence service reports it.
export const PRESENCE: Presence[] = [
  { personId: 'lucia', section: 'furniture', itemId: 'f-01', doing: 'claiming' },
  { personId: 'priya', section: 'furniture', itemId: 'f-01', doing: 'editing' },
];

export const OTHER_NOTES = [
  { title: 'Groceries & supplies', edited: 'Sam · yesterday' },
  { title: 'House rules (2026 renewal)', edited: 'Priya · Oct 28' },
  { title: 'Tahoe trip, January', edited: 'Lucía · Nov 3' },
  { title: 'Subscriptions & bills', edited: 'Theo · Nov 11' },
];

function task(
  id: string,
  title: string,
  room: string,
  assignee: PersonId | null,
  due: string,
  done?: [PersonId, string],
): Task {
  const doneAt = done ? T(done[1]) : undefined;
  // Spread "last edited" stamps across Nov 12–16 so the list reads as real activity.
  const n = Number(id.split('-')[1]) || 1;
  const openEdit = T(
    `2026-11-${String(12 + ((n * 3) % 5)).padStart(2, '0')} ${String(8 + ((n * 5) % 12)).padStart(2, '0')}:${String((n * 17) % 60).padStart(2, '0')}`,
  );
  return {
    id,
    title,
    room,
    assignee,
    due,
    done: !!done,
    doneBy: done?.[0],
    doneAt,
    updatedBy: done?.[0] ?? assignee ?? 'kenji',
    updatedAt: doneAt ?? openEdit,
  };
}

const cleaning: Task[] = [
  task('cl-01', 'Clean fridge & freezer, wipe shelves and drawers', 'Kitchen', 'priya', '2026-11-22'),
  task('cl-02', 'Degrease range hood and replace the filter', 'Kitchen', 'sam', '2026-11-24'),
  task('cl-03', 'Clean inside cabinets and drawers', 'Kitchen', 'lucia', '2026-11-21', ['lucia', '2026-11-14 18:20']),
  task('cl-04', 'Clean sink, faucet and garbage disposal', 'Kitchen', 'kenji', '2026-11-23', ['kenji', '2026-11-13 19:05']),
  task('cl-05', 'Run dishwasher clean cycle and clean its filter', 'Kitchen', 'theo', '2026-11-25'),
  task('cl-06', 'Mop kitchen floor, baseboards and under the sink', 'Kitchen', 'priya', '2026-11-28'),
  task('cl-07', 'Wipe kitchen walls and cabinet fronts', 'Kitchen', 'lucia', '2026-11-22', ['lucia', '2026-11-16 21:02']),
  task('cl-08', 'Scrub tub, tile and grout', 'Bathroom 1', 'sam', '2026-11-21', ['sam', '2026-11-14 20:15']),
  task('cl-09', 'Clean toilet, base and behind it', 'Bathroom 1', 'theo', '2026-11-21', ['theo', '2026-11-12 10:30']),
  task('cl-10', 'Clean mirror, vanity and light fixture', 'Bathroom 2', 'kenji', '2026-11-22'),
  task('cl-11', 'Re-caulk shower door track and clean the glass', 'Bathroom 2', 'priya', '2026-11-26'),
  task('cl-12', 'Clean bath exhaust fan cover', 'Bathroom 2', 'lucia', '2026-11-27', ['lucia', '2026-11-11 08:45']),
  task('cl-13', 'Vacuum and steam the sofa area and rug', 'Living room', 'kenji', '2026-11-27'),
  task('cl-14', 'Clean inside windows, sills and screens', 'Living room', 'sam', '2026-11-26', ['sam', '2026-11-14 16:40']),
  task('cl-15', 'Dust blinds, shelves and light fixtures', 'Living room', 'theo', '2026-11-26'),
  task('cl-16', 'Wipe baseboards and light switches in every room', 'Living room', 'lucia', '2026-11-28'),
  task('cl-17', 'Wash front door, frame and doorbell', 'Entry', 'theo', '2026-11-24', ['theo', '2026-11-09 17:55']),
  task('cl-18', 'Own room: patch nail holes, wipe closet and doors', "Kenji's room", 'kenji', '2026-11-28', ['kenji', '2026-11-15 12:05']),
  task('cl-19', 'Own room: patch nail holes, wipe closet and doors', "Lucía's room", 'lucia', '2026-11-28'),
  task('cl-20', 'Own room: patch nail holes, wipe closet and doors', "Priya's room", 'priya', '2026-11-28'),
  task('cl-21', 'Own room: patch nail holes, wipe closet and doors', "Sam's room", 'sam', '2026-11-28'),
  task('cl-22', 'Own room: patch nail holes, wipe closet and doors', "Theo's room", 'theo', '2026-11-28'),
  task('cl-23', 'Garage: sweep, bins out to the curb', 'Garage', 'sam', '2026-11-29'),
];

const utilities: Task[] = [
  task('u-01', 'Submit final electric and gas meter reads', 'Accounts', null, '2026-11-30'),
  task('u-02', 'Cancel internet service effective Dec 1', 'Accounts', null, '2026-11-30'),
  task('u-03', 'Confirm final water and sewer bill is closed', 'Accounts', null, '2026-12-05'),
  task('u-04', 'Stop trash and recycling pickup', 'Accounts', null, '2026-11-30'),
  task('u-05', 'Set up USPS change of address, starting Dec 1', 'Mail', null, '2026-11-28', ['priya', '2026-11-10 20:40']),
  task('u-06', 'Cancel renters insurance after the move-out date', 'Accounts', null, '2026-12-01'),
];

const fi = (
  id: string,
  name: string,
  detail: string,
  decision: FurnitureItem['decision'],
  claimedBy: PersonId | null,
  by: PersonId,
  at: string,
  conflict?: FurnitureItem['conflict'],
): FurnitureItem => ({ id, name, detail, decision, claimedBy, updatedBy: by, updatedAt: T(at), conflict });

const furniture: FurnitureItem[] = [
  fi(
    'f-01',
    'Charcoal 3-seat sofa',
    'Good shape. Coffee stain on the middle cushion.',
    'sell',
    'lucia',
    'lucia',
    '2026-11-17 09:07',
    {
      summary: 'Lucía claimed the sofa 2 min after Priya moved it to Sell. Choose which one stands.',
      options: [
        { label: "Keep it (Lucía's claim)", by: 'lucia', at: T('2026-11-17 09:07'), decision: 'keep', claimedBy: 'lucia' },
        { label: "Sell it (Priya's move)", by: 'priya', at: T('2026-11-17 09:05'), decision: 'sell', claimedBy: null },
      ],
    },
  ),
  fi('f-02', 'Oak dining table', 'Seats 6, extends to 8. Both leaves are in the hall closet.', 'keep', null, 'kenji', '2026-11-06 19:20'),
  fi('f-03', 'Black metal dining chairs (set of 4)', 'Two need new felt pads.', 'donate', null, 'theo', '2026-11-11 13:10'),
  fi('f-04', 'Tall white bookshelf', '5 shelves. Wall anchors are in the box on top.', 'keep', 'sam', 'sam', '2026-11-09 21:45'),
  fi('f-05', 'Short black bookshelf', '3 shelves. Top shelf has a warp.', 'sell', null, 'priya', '2026-11-12 11:30'),
  fi('f-06', '55-inch TV and wall mount', 'Mount holes in the living room wall need patching.', 'keep', 'theo', 'theo', '2026-11-08 16:02'),
  fi('f-07', 'Round walnut coffee table', 'Ring marks on the top. Nobody has claimed it yet.', 'undecided', null, 'kenji', '2026-11-13 10:48'),
  fi('f-08', 'Wool area rug, 8 × 10 ft', 'Cream. Cleaned in May, so it should be fine.', 'undecided', null, 'lucia', '2026-11-10 22:15'),
  fi('f-09', 'Brass floor lamp', 'Works. Needs a new bulb.', 'keep', 'priya', 'priya', '2026-11-15 14:30'),
  fi('f-10', 'Mesh desk chair', 'Armrest cap missing.', 'donate', null, 'sam', '2026-11-07 09:40'),
  fi('f-11', 'Chest freezer (garage)', 'Defrost and clean before pickup. Unplug 24 h before.', 'undecided', null, 'kenji', '2026-11-04 18:55'),
];

const depositRaw: (Omit<DepositItem, 'done'> & { done?: boolean })[] = [
  { id: 'd-01', text: 'Nail holes patched and touched up with the original paint', note: 'Matching paint is in the garage, labeled "412 Alder, eggshell".' },
  { id: 'd-02', text: 'Carpets professionally cleaned, receipt in the shared folder', note: 'Receipt goes in the folder for Marjorie.' },
  { id: 'd-03', text: 'Oven, racks and drip pans cleaned', linkedTaskId: 'cl-oven' },
  { id: 'd-04', text: 'Fridge and freezer cleaned and defrosted', linkedTaskId: 'cl-01' },
  { id: 'd-05', text: 'Bathroom tub, tile and grout cleaned', done: true, doneBy: 'sam', doneAt: T('2026-11-14 20:15'), linkedTaskId: 'cl-08' },
  { id: 'd-06', text: 'Light fixtures working, bulbs replaced', done: true, doneBy: 'theo', doneAt: T('2026-11-13 18:40') },
  { id: 'd-07', text: 'Smoke and CO detector batteries replaced', done: true, doneBy: 'kenji', doneAt: T('2026-11-12 09:30') },
  { id: 'd-08', text: 'Window screens back in their frames' },
  { id: 'd-09', text: 'All keys returned (6 sets)', note: '4 of 6 collected. Still missing: Sam and Theo.' },
  { id: 'd-10', text: 'Garbage disposal runs clean, no odor' },
  { id: 'd-11', text: 'Living room TV mount holes patched' },
  { id: 'd-12', text: 'Garage door remotes returned' },
  { id: 'd-13', text: 'Forwarding address sent to landlord in writing', done: true, doneBy: 'kenji', doneAt: T('2026-11-05 10:12') },
  { id: 'd-14', text: 'Final walkthrough booked', note: 'Mon, Nov 30 at 9:30 AM with Marjorie.', done: true, doneBy: 'kenji', doneAt: T('2026-11-10 18:20') },
];

const deposit: DepositItem[] = depositRaw.map((d) => ({ done: false, ...d }) as DepositItem);

const MONEY_NOTES = [
  'Deposit is $3,250. Split five ways that is $650 each, if all of it comes back.',
  'Carpets: Marjorie said "probably" on the phone, so plan for the cleaning cost. A pro clean is about $240. Priya is getting a second quote.',
  'Van for the donation run: Sam is checking. Split the rental five ways.',
  'Final electric and gas bills: Kenji pays November, we settle on Dec 3.',
].join('\n');

const threads: Thread[] = [
  {
    id: 'th-01',
    anchor: { section: 'furniture' },
    author: 'sam',
    at: T('2026-11-17 07:40'),
    text: "who's renting the van?",
    resolved: false,
    replies: [{ id: 'r-01', author: 'theo', at: T('2026-11-17 08:05'), text: 'My cousin has a 10 ft box truck, free the 28th. I can ask.' }],
  },
  {
    id: 'th-02',
    anchor: { section: 'furniture', itemId: 'f-01' },
    author: 'lucia',
    at: T('2026-11-17 09:07'),
    text: 'I want the couch. It is the only one that fits the new place. Can we hold off on selling it until the 20th?',
    resolved: false,
    replies: [],
  },
  {
    id: 'th-03',
    anchor: { section: 'furniture', itemId: 'f-01' },
    author: 'priya',
    at: T('2026-11-17 09:08'),
    text: "It has a coffee stain on the middle cushion and I'd rather sell it than argue about it.",
    resolved: false,
    replies: [],
  },
  {
    id: 'th-04',
    anchor: { section: 'deposit', itemId: 'd-03' },
    author: 'lucia',
    at: T('2026-11-16 08:30'),
    text: 'Did anybody clear the oven? It was on the cleaning list yesterday and now it is gone.',
    resolved: false,
    replies: [
      { id: 'r-02', author: 'priya', at: T('2026-11-16 08:52'), text: "Not me. I thought it was Theo's." },
      { id: 'r-03', author: 'sam', at: T('2026-11-16 09:20'), text: "I didn't touch it." },
    ],
  },
  {
    id: 'th-05',
    anchor: { section: 'cleaning', itemId: 'cl-01' },
    author: 'priya',
    at: T('2026-11-15 19:10'),
    text: 'The fridge takes about 45 minutes with the freezer. Can someone take the freezer half?',
    resolved: false,
    replies: [{ id: 'r-04', author: 'lucia', at: T('2026-11-15 20:02'), text: "I'll do the freezer on the 21st." }],
  },
  {
    id: 'th-06',
    anchor: { section: 'deposit', itemId: 'd-14' },
    author: 'kenji',
    at: T('2026-11-10 18:20'),
    text: "Marjorie's walkthrough is Nov 30 at 9:30. Let's have every room done by Nov 28 so we can do a last pass.",
    resolved: false,
    replies: [],
  },
  {
    id: 'th-07',
    anchor: { section: 'utilities', itemId: 'u-02' },
    author: 'theo',
    at: T('2026-11-16 12:40'),
    text: 'Do we need the internet until Dec 1? I think cancelling on the 30th is fine.',
    resolved: false,
    replies: [],
  },
  {
    id: 'th-08',
    anchor: { section: 'cleaning', itemId: 'cl-23' },
    author: 'sam',
    at: T('2026-11-16 18:05'),
    text: "Garage sweep: who has the big broom? I'm not doing the bins alone.",
    resolved: false,
    replies: [],
  },
  {
    id: 'th-09',
    anchor: { section: 'deposit', itemId: 'd-06' },
    author: 'theo',
    at: T('2026-11-13 18:45'),
    text: 'Bulbs replaced in the hall and the kitchen.',
    resolved: true,
    replies: [],
  },
  {
    id: 'th-10',
    anchor: { section: 'cleaning', itemId: 'cl-03' },
    author: 'lucia',
    at: T('2026-11-14 18:25'),
    text: 'Cabinets done. Took photos for the folder.',
    resolved: true,
    replies: [],
  },
];

const collaborators: Collaborator[] = [
  { personId: 'kenji', role: 'owner', sections: 'all', status: 'active' },
  { personId: 'lucia', role: 'editor', sections: 'all', status: 'active' },
  { personId: 'priya', role: 'editor', sections: 'all', status: 'active' },
  { personId: 'sam', role: 'editor', sections: 'all', status: 'active' },
  { personId: 'theo', role: 'editor', sections: 'all', status: 'active' },
  { personId: 'marjorie', role: 'commenter', sections: [], status: 'pending', invitedAt: T('2026-11-10 18:03') },
];

const trash: Trashed[] = [
  {
    item: {
      id: 'cl-oven',
      title: 'Clean oven interior, racks & drip pans',
      room: 'Kitchen',
      assignee: 'theo',
      due: '2026-11-26',
      done: false,
      updatedBy: 'theo',
      updatedAt: T('2026-11-15 22:41'),
    },
    section: 'cleaning',
    index: 1,
    deletedAt: T('2026-11-15 22:41'),
    deletedBy: 'theo',
  },
];

// ---- Edit history -------------------------------------------------------

type ChangeDraft = Omit<Change, 'id'>;

const handcrafted: ChangeDraft[] = [
  { at: T('2026-11-02 09:12'), by: 'kenji', device: DEVICES.kenji, kind: 'create', section: 'note', text: 'created the note “Move-Out: 412 Alder St”' },
  { at: T('2026-11-10 18:03'), by: 'kenji', device: DEVICES.kenji, kind: 'share', section: 'note', text: 'invited Marjorie Chen as landlord. No sections shared yet.' },
  {
    at: T('2026-11-15 22:41'),
    by: 'theo',
    device: DEVICES.theo,
    kind: 'delete',
    section: 'cleaning',
    itemId: 'cl-oven',
    itemTitle: 'Clean oven interior, racks & drip pans',
    text: 'deleted “Clean oven interior, racks & drip pans” (assigned to Theo, due Nov 26)',
  },
  {
    at: T('2026-11-17 09:05'),
    by: 'priya',
    device: DEVICES.priya,
    kind: 'decision',
    section: 'furniture',
    itemId: 'f-01',
    itemTitle: 'Charcoal 3-seat sofa',
    text: 'moved “Charcoal 3-seat sofa” to Sell',
  },
  {
    at: T('2026-11-17 09:07'),
    by: 'lucia',
    device: DEVICES.lucia,
    kind: 'claim',
    section: 'furniture',
    itemId: 'f-01',
    itemTitle: 'Charcoal 3-seat sofa',
    text: 'claimed “Charcoal 3-seat sofa”',
  },
];

const TOTAL_CHANGES = 187;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildHistory(): Change[] {
  const rnd = mulberry32(412);
  const pick = <X,>(arr: X[]): X => arr[Math.floor(rnd() * arr.length)];
  const first = (id: PersonId | null) => (id ? PEOPLE[id].first : 'nobody');

  const drafts: ChangeDraft[] = [...handcrafted];

  // Every completed item gets its check-off entry, at the time it was done.
  const doneItems: { section: TaskSection | 'deposit'; id: string; title: string; by: PersonId; at: number }[] = [];
  for (const t of cleaning) if (t.done && t.doneBy && t.doneAt) doneItems.push({ section: 'cleaning', id: t.id, title: t.title, by: t.doneBy, at: t.doneAt });
  for (const t of utilities) if (t.done && t.doneBy && t.doneAt) doneItems.push({ section: 'utilities', id: t.id, title: t.title, by: t.doneBy, at: t.doneAt });
  for (const d of deposit) if (d.done && d.doneBy && d.doneAt) doneItems.push({ section: 'deposit', id: d.id, title: d.text, by: d.doneBy, at: d.doneAt });
  for (const d of doneItems) {
    drafts.push({
      at: d.at,
      by: d.by,
      device: DEVICES[d.by],
      kind: 'done',
      section: d.section,
      itemId: d.id,
      itemTitle: d.title,
      text: `checked off “${d.title}”`,
    });
  }

  const openTasks = [...cleaning.map((t) => ({ section: 'cleaning' as const, t })), ...utilities.map((t) => ({ section: 'utilities' as const, t }))];
  const doneTasks = openTasks.filter((x) => x.t.done);
  const roommates = ['kenji', 'kenji', 'lucia', 'priya', 'sam', 'theo'] as PersonId[];
  const start = T('2026-11-02 09:30');
  const end = T('2026-11-17 08:45');

  const fill = TOTAL_CHANGES - drafts.length;
  for (let i = 0; i < fill; i++) {
    const r = rnd();
    const at = Math.round(start + rnd() * (end - start));
    const by = pick(roommates);
    const device = DEVICES[by];
    const base = { at, by, device };

    if (r < 0.3) {
      const { section, t } = pick(openTasks);
      const assignee = rnd() < 0.15 ? null : pick(ROOMMATES);
      const text = assignee ? `assigned “${t.title}” to ${first(assignee)}` : `unassigned “${t.title}”`;
      drafts.push({ ...base, kind: 'assign', section, itemId: t.id, itemTitle: t.title, text });
    } else if (r < 0.44) {
      const { section, t } = pick(openTasks);
      const day = 18 + Math.floor(rnd() * 13);
      const due = `2026-11-${String(day).padStart(2, '0')}`;
      drafts.push({ ...base, kind: 'due', section, itemId: t.id, itemTitle: t.title, text: `moved the due date of “${t.title}” to ${fmtDue(due)}` });
    } else if (r < 0.54 && doneTasks.length) {
      const { section, t } = pick(doneTasks);
      drafts.push({ ...base, kind: 'undone', section, itemId: t.id, itemTitle: t.title, text: `unchecked “${t.title}”` });
    } else if (r < 0.7) {
      const f = pick(furniture);
      const options = (['keep', 'sell', 'donate', 'undecided'] as const).filter((d) => d !== f.decision);
      const d = pick([...options]);
      drafts.push({ ...base, kind: 'decision', section: 'furniture', itemId: f.id, itemTitle: f.name, text: `moved “${f.name}” to ${DECISION_LABEL[d]}` });
    } else if (r < 0.82) {
      const f = pick(furniture.filter((x) => x.id !== 'f-01'));
      const claimer = pick(['kenji', 'priya', 'sam', 'theo'] as PersonId[]);
      drafts.push({ at, by: claimer, device: DEVICES[claimer], kind: 'claim', section: 'furniture', itemId: f.id, itemTitle: f.name, text: `claimed “${f.name}”` });
    } else if (r < 0.93) {
      const f = pick(furniture);
      drafts.push({ ...base, kind: 'edit', section: 'furniture', itemId: f.id, itemTitle: f.name, text: `edited the details of “${f.name}”` });
    } else {
      drafts.push({ ...base, kind: 'edit', section: 'money', text: 'edited Money Notes' });
    }
  }

  return drafts
    .sort((a, b) => b.at - a.at)
    .map((d, i) => ({ ...d, id: `ch-${String(i + 1).padStart(3, '0')}` }) as Change);
}

export function buildSeed(): NoteState {
  return {
    people: PEOPLE,
    cleaning,
    utilities,
    furniture,
    deposit,
    depositAmount: 3250,
    walkthrough: 'Mon, Nov 30 · 9:30 AM',
    moneyNotes: MONEY_NOTES,
    threads,
    changes: buildHistory(),
    trash,
    collaborators,
  };
}

