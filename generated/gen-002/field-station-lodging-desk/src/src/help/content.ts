export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'steps'; items: string[] }
  | { kind: 'callout'; tone: 'info' | 'warn'; text: string };

export interface Article {
  id: string;
  title: string;
  kicker: string;
  summary: string;
  body: Block[];
}

export interface GlossaryEntry {
  label: string;
  short: string;
  article: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  'block-hold': {
    label: 'Block hold',
    short: 'Bunks reserved for a group under one code. A held bunk does not need a name yet. Until the release, held bunks count toward kitchen covers as pending.',
    article: 'block-hold',
  },
  tentative: {
    label: 'Tentative booking',
    short: 'A named person whose place the course has not confirmed yet. Counts toward covers as pending, not confirmed.',
    article: 'tentative',
  },
  unnamed: {
    label: 'Unnamed hold bunk',
    short: 'A bunk held for the course with no person in it yet. Pending until someone is named or the bunk is released.',
    article: 'block-hold',
  },
  release: {
    label: 'Release (17:00 today)',
    short: 'Deadline after which unconfirmed hold bunks (tentative or unnamed) return to free stock. Confirmed people keep their bunks.',
    article: 'release',
  },
  covers: {
    label: 'Cover count',
    short: 'One cover is one person served one meal. The kitchen plans food from covers.',
    article: 'covers',
  },
  'waiver-gate': {
    label: 'Waiver gate',
    short: 'Check-in and boat boarding need a signed waiver on file. It does not stop bunk assignment or the kitchen count.',
    article: 'waiver-gate',
  },
  restricted: {
    label: 'Restricted – permit housing',
    short: 'Cabin reserved for another use on certain nights. A course stay that covers those nights cannot be placed there.',
    article: 'restricted',
  },
  designation: {
    label: 'Gender designation',
    short: "Women's, men's or mixed. A person can only be placed in a cabin that matches their lodging group, or a mixed cabin.",
    article: 'move',
  },
  manifest: {
    label: 'Boat manifest',
    short: 'The passenger list for the captain. Only confirmed people with a complete waiver are boardable.',
    article: 'boat',
  },
};

export const ARTICLES: Article[] = [
  {
    id: 'start',
    kicker: 'Start here',
    title: 'Your first day with Cabinroll',
    summary: 'What each screen is for and the order to work in today.',
    body: [
      {
        kind: 'p',
        text: 'Cabinroll tracks who sleeps where, how many people the kitchen feeds, and who rides the boat. The screens are linked: when you change a bunk, the kitchen count, boat list and Today checklist update with it.',
      },
      {
        kind: 'steps',
        items: [
          'Today: the list of what has to be settled before the 17:00 release and before the boat.',
          'Bunks: click any bunk to see who is in it and the moves you can make.',
          'People: confirm names, mark waivers on file, and handle unnamed slots in one list.',
          'Meals: compare what the kitchen has with what the system says, copy the message, and mark it sent.',
          'Transfers: place people on trip 1 or trip 2 and mark the manifest sent.',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        text: 'Every change is recorded in the activity feed on Today. Check the feed before you change something again, so you know what has already been done.',
      },
    ],
  },
  {
    id: 'block-hold',
    kicker: 'Term',
    title: 'Block hold',
    summary: 'Group reservations and why held bunks are not the same as confirmed people.',
    body: [
      {
        kind: 'p',
        text: 'A block hold is a group reservation: the station holds a set number of bunks for a course under one code. BIO 377 has 24 bunks held for 18 Nov to 2 Dec. A held bunk does not need a name yet.',
      },
      {
        kind: 'list',
        items: [
          'Confirmed: the course has confirmed this person. Counts as a confirmed cover.',
          'Tentative: a name is in the bunk, but the course has not confirmed it. Counts as a pending cover.',
          'Unnamed: a held bunk with no one in it yet. Counts as a pending cover.',
        ],
      },
      {
        kind: 'p',
        text: "The kitchen's 27 covers came from the whole hold, so they include every pending bunk. Pending covers are not final until the release.",
      },
      {
        kind: 'callout',
        tone: 'info',
        text: 'A held bunk is a promise about space, not food. Plan the kitchen from the confirmed count, and treat pending covers as the most you could feed.',
      },
    ],
  },
  {
    id: 'tentative',
    kicker: 'Term',
    title: 'Tentative booking',
    summary: 'A named person whose place is not final yet.',
    body: [
      {
        kind: 'p',
        text: 'A tentative booking is a named person whose place the course has not confirmed. For example, add/drop may still be open. The bunk is held for them, but the booking is not final.',
      },
      {
        kind: 'list',
        items: [
          'On the kitchen sheet, a tentative person is in the maximum but not the confirmed number.',
          'Confirm only when the course has confirmed the name in writing.',
          'Release only when the course has told you the person is not coming. The bunk then goes back to free stock.',
        ],
      },
    ],
  },
  {
    id: 'release',
    kicker: 'Deadline',
    title: 'The 17:00 release',
    summary: 'What happens to unconfirmed bunks today at 17:00.',
    body: [
      {
        kind: 'p',
        text: 'At the release time, held bunks that are still tentative or unnamed return to free stock. Confirmed people keep their bunks. For BIO 377 the release is Tue 17 Nov at 17:00.',
      },
      {
        kind: 'p',
        text: 'After the release the kitchen number drops to the confirmed count, unless more people are confirmed before the deadline. A bunk released today may be taken by another booking by tomorrow.',
      },
      {
        kind: 'callout',
        tone: 'warn',
        text: 'Today the release is the deadline, not a background process. Use the Today countdown for time left, and the Meals screen for the number you would be left with.',
      },
    ],
  },
  {
    id: 'covers',
    kicker: 'Term',
    title: 'Cover count and the kitchen',
    summary: 'How the kitchen number is built, meal by meal.',
    body: [
      {
        kind: 'p',
        text: 'A cover is one person served one meal. The kitchen plans food from covers, not from bunks or names.',
      },
      {
        kind: 'list',
        items: [
          'Confirmed covers: residents and confirmed course members who are on site for that meal.',
          'Pending covers: tentative names and unnamed hold bunks, decided at the release.',
          'Maximum: confirmed plus pending.',
        ],
      },
      {
        kind: 'p',
        text: 'The course arrives by boat at 13:30 on 18 Nov, so they count from dinner that day. Breakfast and lunch on 18 Nov are residents only, unless lunch is packed for the boat. On the check-out morning (2 Dec) only breakfast counts.',
      },
    ],
  },
  {
    id: 'waiver-gate',
    kicker: 'Term',
    title: 'The waiver gate',
    summary: 'Whether an incomplete waiver stops check-in, the boat, or bunks.',
    body: [
      {
        kind: 'p',
        text: 'The waiver gate checks that a signed waiver is on file before a person can be checked in. In this station setup the same gate also blocks boat boarding, because the manifest uses the same check.',
      },
      {
        kind: 'list',
        items: [
          'Blocked: check-in and boat boarding.',
          'Not blocked: bunk assignment, the kitchen count, and naming a person in a slot.',
        ],
      },
      {
        kind: 'p',
        text: 'Marking a waiver "on file" records a fact. Do it only when the signed copy is in the station file.',
      },
      {
        kind: 'callout',
        tone: 'warn',
        text: 'The station sets the gate rules. If you are unsure whether a page counts as a signed waiver, ask the station office before the boat leaves.',
      },
    ],
  },
  {
    id: 'restricted',
    kicker: 'Term',
    title: 'Restricted – permit housing',
    summary: 'Why Manglar is off limits to this course.',
    body: [
      {
        kind: 'p',
        text: 'A restricted cabin is reserved for another use on certain nights. Manglar is "Restricted – permit housing" from 25 to 27 Nov, reserved for MINAE permit inspectors.',
      },
      {
        kind: 'p',
        text: 'The BIO 377 stay runs 18 Nov to 2 Dec, and every night in that window overlaps the restriction. Course members therefore cannot be placed in Manglar for this stay. Cabinroll blocks the placement and says why.',
      },
      {
        kind: 'steps',
        items: [
          'Open each person in Manglar (Bunks, then the bunk, then Move).',
          'Choose a free bunk in a cabin that matches their lodging group.',
          'Prefer a free bunk outside the hold. The hold stays at 24 bunks.',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        text: 'If you move someone into an unnamed hold bunk instead, the restricted bunk they leave cannot stay in the hold, so the hold shrinks by one. The preview shows the new size before you confirm.',
      },
    ],
  },
  {
    id: 'confirm',
    kicker: 'How to',
    title: 'Confirm a booking',
    summary: 'Turn a tentative name into a confirmed one.',
    body: [
      {
        kind: 'steps',
        items: [
          'Open the person from People, or the bunk from Bunks.',
          'Check that the course has confirmed the name in writing.',
          'Click Confirm booking. The preview shows the kitchen counts before and after.',
          'Confirm. The entry is logged.',
        ],
      },
      {
        kind: 'p',
        text: 'You can only confirm someone who is in a bunk. If there is an unnamed slot, name it first.',
      },
    ],
  },
  {
    id: 'move',
    kicker: 'How to',
    title: 'Move someone without breaking the hold',
    summary: 'Pick a legal bunk, and see what happens to the hold.',
    body: [
      {
        kind: 'steps',
        items: [
          'Open the bunk the person is in, then choose Move to another bunk.',
          'Each candidate shows either a reason it is blocked or a note about the hold.',
          'Read the preview: it gives the hold size after the move.',
          'Confirm the move.',
        ],
      },
      {
        kind: 'p',
        text: 'A move never changes how many people there are, or the cover count for them. It changes which bunks are in the hold. Cabins must match lodging groups, and occupied bunks are never offered.',
      },
    ],
  },
  {
    id: 'kitchen',
    kicker: 'How to',
    title: 'Send the kitchen a corrected count',
    summary: 'Copy the message, send it, and mark the sheet as sent here.',
    body: [
      {
        kind: 'steps',
        items: [
          'Open Meals and read the Wed 18 Nov table: the kitchen sheet, the confirmed count and the pending count.',
          'Decide on lunch: packed for the boat, or served on site.',
          'Copy the message and send it to the kitchen by your usual channel.',
          'Click Mark as sent. The kitchen sheet here then matches what you sent.',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        text: 'Cabinroll does not send email. Copy gives you the exact text. Mark as sent records it here, and the checklist reflects it.',
      },
    ],
  },
  {
    id: 'boat',
    kicker: 'How to',
    title: 'Boat trips and the manifest',
    summary: 'Two trips of 14 seats, and who is boardable.',
    body: [
      {
        kind: 'p',
        text: 'Trip 1 leaves Sierpe dock at 13:30 on 18 Nov. Trip 2 is listed at 15:00, which still needs confirming with the captain. Each trip seats 14.',
      },
      {
        kind: 'list',
        items: [
          'Boardable: confirmed, with a complete waiver.',
          'Waiver holds stay on the manifest, marked HOLD, so the captain can see them.',
          'Tentative and unnamed seats stay off the manifest until they are confirmed.',
        ],
      },
      {
        kind: 'steps',
        items: [
          'Use the trip menu on each passenger to place them.',
          'Check that no trip is over 14.',
          'Copy the text and send it to the captain, then click Mark as sent.',
          'If the list changes afterwards, the button says the manifest is out of date.',
        ],
      },
    ],
  },
  {
    id: 'when-to-ask',
    kicker: 'Help',
    title: 'When to ask someone first',
    summary: 'The few decisions that are not yours to make alone.',
    body: [
      {
        kind: 'p',
        text: 'Most of today is routine. These decisions need someone else:',
      },
      {
        kind: 'list',
        items: [
          'Confirming or releasing a name: the course coordinator (Dr. Helen Brandt) confirms enrolment for the course.',
          'Putting anyone in a restricted cabin, or taking a bunk the permit inspectors need: the station manager.',
          'Whether a page counts as a signed waiver, or whether a waiver hold can board the boat: the station office.',
          'Lunch packed for the boat instead of served on site: the kitchen lead.',
        ],
      },
      {
        kind: 'p',
        text: 'The station manager, Dr. Elena Vargas, is at a conference and back Mon 23 Nov. Send anything that cannot wait to the station office and copy the course coordinator.',
      },
    ],
  },
];

export function articleById(id: string | undefined): Article | undefined {
  return ARTICLES.find((a) => a.id === id);
}
