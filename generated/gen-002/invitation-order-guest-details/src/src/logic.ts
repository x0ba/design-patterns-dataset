import type { EventState, Guest, VerifyKey } from './data';
import { ORDER } from './data';

export const NAME_MAX = 40;
export const LINE_MAX = 45;

export type Fix = {
  label: string;
  patch?: Partial<Guest>;
  removeId?: string;
  focus?: string; // field id suffix to focus
  keep?: boolean; // acknowledge "print as entered"
  quiet?: boolean; // secondary styling
};

export type IssueKind = 'emoji' | 'limit' | 'missing' | 'intl' | 'postal' | 'swap' | 'dup' | 'verify';

export type Issue = {
  kind: IssueKind;
  chip: string; // short label for the table
  tone: 'red' | 'amber';
  short: string; // one-line explanation shown under the address
  title: string;
  detail: string;
  fixes: Fix[];
};

export const KIND_ORDER: IssueKind[] = ['intl', 'emoji', 'limit', 'missing', 'postal', 'swap', 'dup', 'verify'];

export const FILTERS: { id: string; label: string; kinds: IssueKind[] }[] = [
  { id: 'verify', label: 'Unverified', kinds: ['verify'] },
  { id: 'dup', label: 'Duplicates', kinds: ['dup'] },
  { id: 'swap', label: 'Names swapped', kinds: ['swap'] },
  { id: 'intl', label: 'International', kinds: ['intl', 'postal'] },
  { id: 'emoji', label: 'Emoji, length', kinds: ['emoji', 'limit', 'missing'] },
];

const EMOJI = /[\p{Extended_Pictographic}‍️]/gu;
export const hasEmoji = (s: string) => /\p{Extended_Pictographic}/u.test(s);
export const stripEmoji = (s: string) => s.replace(EMOJI, '').replace(/\s+/g, ' ').trim();

export const COUNTRIES = ['United States', 'Canada', 'Philippines', 'Mexico', 'United Kingdom', 'Australia'];

export const regionLabels = (country: string) => {
  switch (country) {
    case 'Canada': return { region: 'Province', postal: 'Postal code' };
    case 'Philippines': return { region: 'Province / region', postal: 'Postal code' };
    case 'United Kingdom': return { region: 'County', postal: 'Postcode' };
    case 'Mexico': return { region: 'State', postal: 'Postal code' };
    case 'Australia': return { region: 'State', postal: 'Postcode' };
    default: return { region: 'State', postal: 'ZIP code' };
  }
};

const postalOk = (country: string, p: string) => {
  const v = p.trim();
  if (country === 'Canada') return /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/.test(v);
  if (country === 'Philippines') return /^\d{4}$/.test(v);
  if (country === 'United States' || country === '') return /^\d{5}(-\d{4})?$/.test(v);
  return v.length > 0;
};

function verifyIssue(g: Guest, key: VerifyKey): Issue | null {
  const city = g.city.trim().toLowerCase();
  const base = { kind: 'verify' as const, chip: 'Unverified', tone: 'amber' as const };
  switch (key) {
    case 'zipcity': {
      const bad = (city === 'davis' && !g.postal.startsWith('9561')) || (city === 'sacramento' && g.postal.startsWith('9561'));
      if (!bad) return null;
      return {
        ...base,
        short: `ZIP ${g.postal} doesn't match ${g.city}`,
        title: `ZIP ${g.postal} doesn't match ${g.city}, ${g.region}`,
        detail: `${g.postal} is a Sacramento ZIP code (Land Park). Davis addresses use 95616 to 95618. Mail with the wrong ZIP is often delayed or returned.`,
        fixes: [
          { label: 'Change ZIP to 95616 (Davis)', patch: { postal: '95616' } },
          { label: 'Change city to Sacramento', patch: { city: 'Sacramento' }, quiet: true },
        ],
      };
    }
    case 'apt': {
      if (g.line2.trim() || /(apt|unit|ste|suite|#)/i.test(g.line1)) return null;
      return {
        ...base,
        short: 'Missing apartment or unit number',
        title: 'This address needs an apartment number',
        detail: `${g.line1} is a 24-unit building. Without a unit number the post office can't deliver this invitation, and a number can't be added after printing.`,
        fixes: [
          { label: 'Add a unit number', focus: 'line2' },
          { label: "It's a single home, keep as entered", keep: true, quiet: true },
        ],
      };
    }
    case 'typo': {
      if (!/foslom/i.test(g.line1)) return null;
      return {
        ...base,
        short: `We couldn't find "Foslom Blvd" in ${g.city}`,
        title: `We couldn't find "Foslom Blvd" in ${g.city}`,
        detail: `There's a Folsom Blvd in ${g.postal}, with a 3190 block. This looks like a typo.`,
        fixes: [
          { label: 'Use 3190 Folsom Blvd', patch: { line1: g.line1.replace(/foslom/i, 'Folsom') } },
          { label: 'Keep as entered', keep: true, quiet: true },
        ],
      };
    }
    case 'zip': {
      if (/^\d{5}/.test(g.postal)) return null;
      return {
        ...base,
        short: `No ZIP code for ${g.city}`,
        title: 'The ZIP code is missing',
        detail: `For ${g.line1}, ${g.city}, the post office lists ZIP 95758.`,
        fixes: [{ label: 'Use ZIP 95758', patch: { postal: '95758' } }, { label: 'Type a ZIP', focus: 'postal', quiet: true }],
      };
    }
    case 'state': {
      if (!(city === 'portland' && g.region.toUpperCase() === 'CA')) return null;
      return {
        ...base,
        short: `Portland, CA doesn't match ZIP ${g.postal}`,
        title: `ZIP ${g.postal} is in Portland, Oregon, not California`,
        detail: 'The state looks like it was filled in from the rest of the spreadsheet, where almost everyone is in California.',
        fixes: [
          { label: 'Change state to OR', patch: { region: 'OR' } },
          { label: 'Keep as entered', keep: true, quiet: true },
        ],
      };
    }
    case 'house': {
      if (!g.line1.startsWith('14050')) return null;
      return {
        ...base,
        short: `House number 14050 not found on Greenback Ln`,
        title: `We couldn't find 14050 Greenback Ln`,
        detail: 'Greenback Ln in Citrus Heights runs from about 4000 to 8000. An extra digit may have slipped in.',
        fixes: [
          { label: 'Use 4050 Greenback Ln', patch: { line1: '4050 Greenback Ln' } },
          { label: 'Keep as entered', keep: true, quiet: true },
        ],
      };
    }
  }
}

export function issuesOf(g: Guest, all: Guest[]): Issue[] {
  const out: Issue[] = [];
  const f = g.flag;

  if (f?.type === 'intl' && g.country === '') {
    out.push({
      kind: 'intl', chip: 'Needs country', tone: 'red',
      short: `Country not set. This looks like an address in ${f.guess}`,
      title: `Set the country for this address`,
      detail: `${g.region} isn't a US state, so this was imported in US format. Once you choose a country we'll format the last line the way ${f.guess} post expects, with the country in capitals.`,
      fixes: [{ label: `Set country to ${f.guess}`, patch: { country: f.guess } }],
    });
  }

  if (hasEmoji(g.name)) {
    out.push({
      kind: 'emoji', chip: 'Emoji in name', tone: 'red',
      short: "Emoji can't be printed on the envelope",
      title: "Emoji can't be printed",
      detail: 'Our printers can only set letters, numbers and standard punctuation. The emoji would print as an empty box or be dropped.',
      fixes: [{ label: `Remove emoji`, patch: { name: stripEmoji(g.name) } }],
    });
  }

  if (g.name.length > NAME_MAX) {
    out.push({
      kind: 'limit', chip: 'Name too long', tone: 'red',
      short: `Name line is ${g.name.length - NAME_MAX} over the ${NAME_MAX}-character limit`,
      title: `Name is ${g.name.length - NAME_MAX} characters over the limit`,
      detail: `The name line fits ${NAME_MAX} characters on one line. Shorten it, for example "Dr. A. Villanueva-Santos & Family".`,
      fixes: [],
    });
  }
  for (const [k, label] of [['line1', 'Address line 1'], ['line2', 'Address line 2']] as const) {
    if (g[k].length > LINE_MAX) {
      out.push({
        kind: 'limit', chip: 'Line too long', tone: 'red',
        short: `${label} is ${g[k].length - LINE_MAX} over the ${LINE_MAX}-character limit`,
        title: `${label} is ${g[k].length - LINE_MAX} characters over the limit`,
        detail: `Address lines fit ${LINE_MAX} characters. Move part of it to line 2 or abbreviate.`,
        fixes: [],
      });
    }
  }

  if (!g.name.trim() || !g.line1.trim() || !g.city.trim()) {
    out.push({
      kind: 'missing', chip: 'Incomplete', tone: 'red',
      short: 'Name, street and city are all required',
      title: 'Some required fields are empty',
      detail: 'Fill in the name, street address and city so the envelope can be addressed.',
      fixes: [],
    });
  }

  const flagIsZip = f?.type === 'verify' && f.key === 'zip' && !g.ack;
  if (g.postal.trim() && !postalOk(g.country, g.postal) && g.country !== '') {
    const label = regionLabels(g.country).postal.toLowerCase();
    out.push({
      kind: 'postal', chip: 'Check postal code', tone: 'amber',
      short: `"${g.postal}" isn't a valid ${g.country} ${label}`,
      title: `"${g.postal}" doesn't look like a ${g.country} ${label}`,
      detail: g.country === 'Canada' ? 'Canadian postal codes look like V6J 1M4.' : g.country === 'Philippines' ? 'Philippine postal codes have 4 digits.' : 'Check the code.',
      fixes: [],
    });
  } else if (!g.postal.trim() && !flagIsZip && g.country !== '') {
    out.push({
      kind: 'postal', chip: 'Missing ZIP', tone: 'amber',
      short: 'Postal code is empty', title: 'Postal code is empty', detail: 'Add the postal code so the post office can sort it.', fixes: [],
    });
  }

  if (f?.type === 'verify' && !g.ack) {
    const i = verifyIssue(g, f.key);
    if (i) out.push(i);
  }

  if (f?.type === 'dup' && !g.ack) {
    const twin = all.find((x) => x.id === f.twin);
    if (twin) {
      out.push({
        kind: 'dup', chip: 'Possible duplicate', tone: 'amber',
        short: `Same address as "${twin.name}"`,
        title: `Same address as "${twin.name}"`,
        detail: `Both are at ${twin.line1}${twin.line2 ? ', ' + twin.line2 : ''}, ${twin.city}. ${twin.src === g.src ? 'Both were ' + (g.src === 'import' ? "imported from Marcus's spreadsheet" : 'typed in') : g.src === 'import' ? "This one came from Marcus's spreadsheet and the other was typed in" : "This one was typed in and the other came from Marcus's spreadsheet"}. If it's one household, you'd print and mail two sets to the same door.`,
        fixes: [
          { label: `Keep only "${g.name}"`, removeId: twin.id },
          { label: `Keep only "${twin.name}"`, removeId: g.id },
          { label: 'Different households, keep both', keep: true, quiet: true },
        ],
      });
    }
  }

  if (f?.type === 'swap' && !g.ack && g.name === f.original) {
    out.push({
      kind: 'swap', chip: 'Name swapped', tone: 'amber',
      short: `Looks like first and last name are swapped`,
      title: `"${g.name}" looks swapped`,
      detail: `In Marcus's spreadsheet the First name column says "${f.first}" and the Last name column says "${f.last}". Printed as is, the envelope would read "${f.original}".`,
      fixes: [
        { label: `Print as "${f.fixed}"`, patch: { name: f.fixed } },
        { label: `Keep "${f.original}"`, keep: true, quiet: true },
      ],
    });
  }

  out.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  return out;
}

// ---------- dates ----------
export const parseISO = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseLoose = (s: string): Date | null => {
  const t = s.trim();
  if (!t) return null;
  const iso = parseISO(t);
  if (iso) return iso;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (slash) return new Date(+slash[3], +slash[1] - 1, +slash[2]);
  const d = new Date(t);
  if (isNaN(d.getTime())) return null;
  if (!/\d{4}/.test(t)) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const L = 'en-US';
export const fmtFull = (d: Date) => d.toLocaleDateString(L, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
export const fmtLong = (d: Date) => d.toLocaleDateString(L, { month: 'long', day: 'numeric', year: 'numeric' });
export const fmtShort = (d: Date) => d.toLocaleDateString(L, { month: 'short', day: 'numeric' });
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

export const fmtTime = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return '';
  const h = +m[1];
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};

export type EventIssue = { field: keyof EventState; message: string; detail?: string };

export function eventIssues(e: EventState): EventIssue[] {
  const out: EventIssue[] = [];
  const wedding = parseISO(e.date);
  const today = parseISO(ORDER.today)!;
  if (!e.names.trim()) out.push({ field: 'names', message: "Add the couple's names" });
  else if (e.names.length > NAME_MAX) out.push({ field: 'names', message: `Names are ${e.names.length - NAME_MAX} characters over the ${NAME_MAX}-character limit` });
  if (!wedding) out.push({ field: 'date', message: 'Choose the wedding date' });
  else if (wedding < today) out.push({ field: 'date', message: 'That date has already passed' });
  if (!e.ceremonyVenue.trim()) out.push({ field: 'ceremonyVenue', message: 'Add the ceremony venue' });

  const rsvp = parseLoose(e.rsvpBy);
  if (!e.rsvpBy.trim()) out.push({ field: 'rsvpBy', message: 'Add an RSVP-by date' });
  else if (!rsvp) out.push({ field: 'rsvpBy', message: "We couldn't read that date", detail: 'Try a format like April 3, 2027.' });
  else if (wedding && rsvp > wedding)
    out.push({
      field: 'rsvpBy',
      message: `${fmtLong(rsvp)} is after your wedding`,
      detail: `Your wedding is ${fmtLong(wedding)}. Guests need to reply before the day, and most couples pick a date 3 to 6 weeks ahead.`,
    });
  else if (wedding && rsvp.getTime() === wedding.getTime())
    out.push({ field: 'rsvpBy', message: 'The RSVP date is the wedding day', detail: 'Pick a date before the wedding so you can give your caterer a final count.' });
  else if (rsvp < today) out.push({ field: 'rsvpBy', message: 'That date has already passed' });
  return out;
}

export const money = (n: number) => n.toLocaleString(L, { style: 'currency', currency: 'USD' });

export function addressLines(g: Guest): string[] {
  const lines = [g.name, g.line1];
  if (g.line2) lines.push(g.line2);
  const cp = [g.city, g.region].filter(Boolean).join(g.country === 'United States' || g.country === 'Canada' ? ', ' : ', ');
  if (g.country === 'Canada') lines.push(`${g.city} ${g.region}  ${g.postal.toUpperCase()}`.trim());
  else if (g.country === 'United States' || g.country === '') lines.push(`${cp} ${g.postal}`.trim());
  else lines.push(`${g.postal} ${g.city}${g.region ? ', ' + g.region : ''}`.trim());
  if (g.country && g.country !== 'United States') lines.push(g.country.toUpperCase());
  return lines;
}

export const oneLineAddress = (g: Guest) =>
  [g.line1, g.line2, g.city, [g.region, g.postal].filter(Boolean).join(' ')].filter(Boolean).join(', ');
