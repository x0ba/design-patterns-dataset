import type { Booking, CheckSpec, Call, Service, Settings, Weekday } from '../types';
import { TZ, fmtMoney } from './time';

/* ------------------------------------------------------------------ */
/* Clock and hours                                                     */
/* ------------------------------------------------------------------ */

interface LocalClock {
  weekday: Weekday;
  minutes: number;
}

function localClock(when: string | number): LocalClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(when));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    weekday: get('weekday') as Weekday,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** True when the time falls inside regular hours. Outside that window it's after hours. */
export function isRegularHours(s: Settings, when: string | number): boolean {
  const c = localClock(when);
  const day = s.hours[c.weekday];
  if (!day || !day.open || !day.close) return false;
  return c.minutes >= toMinutes(day.open) && c.minutes < toMinutes(day.close);
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

export type Quote =
  | { kind: 'amount'; amount: number; afterHours: boolean }
  | { kind: 'quote' }
  | { kind: 'none' };

/** What the assistant would quote with these settings at this time. */
export function quoteFor(s: Settings, svc: Service, when: string | number, qty = 1): Quote {
  if (svc.priceType === 'quote') return { kind: 'quote' };
  if (svc.priceType === 'none' || svc.regular === null) return { kind: 'none' };
  const after = !isRegularHours(s, when);
  const useAfter = after && svc.useAfterHours && svc.afterHours !== null;
  const unit = useAfter ? (svc.afterHours as number) : svc.regular;
  return { kind: 'amount', amount: unit * qty, afterHours: useAfter };
}

/** What the price sheet says the caller should hear: after-hours rate applies whenever one is set. */
export function correctAmount(s: Settings, svc: Service, when: string | number, qty = 1): number | null {
  if (svc.priceType !== 'fixed' || svc.regular === null) return null;
  const after = !isRegularHours(s, when);
  const unit = after && svc.afterHours !== null ? svc.afterHours : svc.regular;
  return unit * qty;
}

export function quoteLabel(q: Quote, qty = 1): string {
  if (q.kind === 'quote') return 'Quote only, no number';
  if (q.kind === 'none') return 'Not offered';
  const each = qty > 1 ? ` (${qty} × ${fmtMoney(q.amount / qty)})` : '';
  return `${fmtMoney(q.amount)}${each} · ${q.afterHours ? 'after-hours rate' : 'regular rate'}`;
}

/* ------------------------------------------------------------------ */
/* Booking                                                             */
/* ------------------------------------------------------------------ */

export function bookingLabel(b: Booking): string {
  switch (b) {
    case 'book':
      return 'Books the visit';
    case 'message':
      return 'Takes a message';
    case 'refuse':
      return "Doesn't offer it";
  }
}

/* ------------------------------------------------------------------ */
/* Service area                                                        */
/* ------------------------------------------------------------------ */

export function servedCity(s: Settings, name: string): boolean {
  return s.cities.some((c) => c.on && c.name.toLowerCase() === name.toLowerCase());
}

/* ------------------------------------------------------------------ */
/* Disclosure and greeting                                             */
/* ------------------------------------------------------------------ */

const OWNER_GREETING = /\bthis is (rafa|rafael)\b/i;

/** A greeting that introduces the assistant as the owner defeats the disclosure. */
export function greetingClaimsOwner(greeting: string): boolean {
  return OWNER_GREETING.test(greeting);
}

/* ------------------------------------------------------------------ */
/* Escalation: text immediately                                        */
/* ------------------------------------------------------------------ */

const CHILD = new Set([
  'child', 'children', 'kid', 'kids', 'baby', 'babies', 'toddler', 'toddlers', 'son', 'sons',
  'daughter', 'daughters', 'boy', 'girl', 'infant', 'grandson', 'granddaughter',
  'niño', 'niños', 'niña', 'niñas', 'bebé', 'bebés', 'hijo', 'hija', 'hijos', 'hijas',
]);
const PET = new Set([
  'dog', 'dogs', 'puppy', 'puppies', 'cat', 'cats', 'pet', 'pets', 'animal', 'animals',
  'kitten', 'perro', 'perra', 'perros', 'gato', 'gata', 'mascota',
]);
const VEHICLE = new Set([
  'car', 'cars', 'van', 'vans', 'truck', 'suv', 'minivan', 'vehicle', 'sedan',
  'carro', 'coche', 'camioneta', 'auto',
]);
const TRAPPED = /^(locked|trapped|stuck|inside|encerr|atrap|adentro)/;

/** Returns why the call should text Rafa right away, or null for normal handling. */
export function escalationReason(s: Settings, utterance: string): string | null {
  const lower = utterance.toLowerCase();
  const phrase = s.alertPhrases.find((p) => p.trim() && lower.includes(p.trim().toLowerCase()));
  if (phrase) return `the phrase "${phrase.trim()}"`;
  if (s.alertIntent) {
    const tokens = lower.split(/[^\p{L}]+/u).filter(Boolean);
    const child = tokens.some((t) => CHILD.has(t));
    const pet = tokens.some((t) => PET.has(t));
    const vehicle = tokens.some((t) => VEHICLE.has(t));
    const trapped = tokens.some((t) => TRAPPED.test(t));
    if ((child || pet) && vehicle && trapped) {
      return child ? 'a child locked in a vehicle' : 'a pet locked in a vehicle';
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Replay of flagged calls                                             */
/* ------------------------------------------------------------------ */

export interface CheckResult {
  status: 'pass' | 'fail' | 'manual';
  /** What the assistant would do with these settings. */
  now: string;
  /** What it should do. */
  should: string;
}

export function evaluateCheck(s: Settings, c: CheckSpec): CheckResult {
  switch (c.kind) {
    case 'price': {
      const svc = s.services.find((x) => x.id === c.serviceId);
      if (!svc) return { status: 'fail', now: 'Service missing from price sheet', should: 'Price from price sheet' };
      const q = quoteFor(s, svc, c.at, c.qty);
      const correct = correctAmount(s, svc, c.at, c.qty);
      const pass = q.kind === 'amount' && correct !== null && q.amount === correct;
      const shouldLabel = correct === null ? 'Quote only' : `${fmtMoney(correct)}${c.qty > 1 ? ` for ${c.qty}` : ''}`;
      return { status: pass ? 'pass' : 'fail', now: quoteLabel(q, c.qty), should: shouldLabel };
    }
    case 'area': {
      const served = servedCity(s, c.city);
      return {
        status: served === c.expectServed ? 'pass' : 'fail',
        now: served ? `Confirms service in ${c.city}` : `Says it doesn't serve ${c.city}`,
        should: c.expectServed ? `Confirm service in ${c.city}` : `Say it doesn't serve ${c.city}`,
      };
    }
    case 'booking': {
      const svc = s.services.find((x) => x.id === c.serviceId);
      const rule = svc ? svc.booking : 'refuse';
      return {
        status: rule === c.expect ? 'pass' : 'fail',
        now: bookingLabel(rule),
        should: bookingLabel(c.expect),
      };
    }
    case 'disclosure': {
      const claims = greetingClaimsOwner(s.greeting);
      const ok = s.disclosureOn && !claims;
      let now: string;
      if (!s.disclosureOn) now = 'No disclosure. Opens with the greeting only';
      else if (claims) now = 'Discloses, but the greeting still says "this is Rafa"';
      else now = 'Says it is Rafa’s AI assistant at the start';
      return { status: ok ? 'pass' : 'fail', now, should: 'Says it is an assistant at the start' };
    }
    case 'escalation': {
      const reason = escalationReason(s, c.utterance);
      return {
        status: reason ? 'pass' : 'fail',
        now: reason ? `Texts ${s.profile.alertNumber} right away (${reason})` : 'No text. Handles it as a normal call',
        should: `Texts ${s.profile.alertNumber} right away`,
      };
    }
    case 'manual':
      return { status: 'manual', now: c.why, should: 'Matches your price sheet and rules' };
  }
}

export function evaluateCall(s: Settings, call: Call): CheckResult[] {
  return (call.flag?.checks ?? []).map((c) => evaluateCheck(s, c));
}

export interface FlagTally {
  total: number;
  pass: number;
  fail: number;
  manual: number;
}

/** Counts how many open flagged calls the given settings would now handle correctly. */
export function tallyFlags(s: Settings, calls: Call[]): FlagTally {
  const tally: FlagTally = { total: 0, pass: 0, fail: 0, manual: 0 };
  for (const call of calls) {
    if (!call.flag) continue;
    tally.total += 1;
    const results = evaluateCall(s, call);
    const allPass = results.every((r) => r.status === 'pass');
    const anyFail = results.some((r) => r.status === 'fail');
    if (anyFail) tally.fail += 1;
    else if (allPass) tally.pass += 1;
    else tally.manual += 1;
  }
  return tally;
}

/** Short price text for the services table: what a caller hears right now. */
export function quoteNowShort(s: Settings, svc: Service, when: string | number): string {
  const q = quoteFor(s, svc, when);
  if (q.kind === 'quote') return 'Quote only';
  if (q.kind === 'none') return 'Not offered';
  return `${fmtMoney(q.amount)} ${q.afterHours ? 'after hours' : 'regular'}`;
}
