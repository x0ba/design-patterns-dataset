import { BUILDINGS, type Lang } from '../data/campus';
import type { Destination } from '../data/destinations';
import { LANGS, STRINGS, fmt } from './i18n';
import type { Route, Step } from './route';

export const localeOf = (lang: Lang) => LANGS.find((l) => l.id === lang)!.locale;

/** minutes since midnight → "10:30 am" (English) or a locale time */
export function clock(mins: number, lang: Lang): string {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  if (lang === 'en') {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  }
  const d = new Date(2026, 0, 1, h, m);
  return new Intl.DateTimeFormat(localeOf(lang), { hour: 'numeric', minute: '2-digit', hour12: lang !== 'vi' }).format(d);
}

export const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

interface Hours {
  kind: '24' | 'MF' | 'MS' | 'D';
  o: number;
  c: number;
}

function parseHours(h: string): Hours {
  if (h === '24') return { kind: '24', o: 0, c: 1440 };
  const [days, range] = h.split(' ');
  const [a, b] = range.split('-');
  const t = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  return { kind: days as Hours['kind'], o: t(a), c: t(b) };
}

export function hoursLine(d: Destination, lang: Lang): string {
  const T = STRINGS[lang];
  const h = parseHours(d.hours);
  if (h.kind === '24') return T.open24;
  return `${T.days[h.kind]} · ${clock(h.o, lang)} – ${clock(h.c, lang)}`;
}

export function openStatus(d: Destination, now: Date, lang: Lang): { open: boolean; text: string } {
  const T = STRINGS[lang];
  const h = parseHours(d.hours);
  if (h.kind === '24') return { open: true, text: T.open24 };
  const dow = now.getDay(); // 0 = Sunday
  const todayOk = h.kind === 'D' || (h.kind === 'MF' && dow >= 1 && dow <= 5) || (h.kind === 'MS' && dow >= 1 && dow <= 6);
  const t = minutesOf(now);
  const within = h.o < h.c ? t >= h.o && t < h.c : t >= h.o || t < h.c;
  if (todayOk && within) return { open: true, text: `${T.openNow} · ${fmt(T.until, { t: clock(h.c, lang) })}` };
  if (todayOk && t < h.o) return { open: false, text: `${T.closedNow} · ${fmt(T.opensAt, { t: clock(h.o, lang) })}` };
  return { open: false, text: todayOk ? T.closedNow : T.closedToday };
}

const SMALL = new Set(['and', 'of', 'for', 'the', 'to', 'a', 'at', 'in', 'on']);
export function titleCase(s: string): string {
  return s
    .split(' ')
    .map((w, i) => {
      if (/[A-Z0-9]/.test(w) && w !== w.toLowerCase()) return w;
      if (i > 0 && SMALL.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

export function bName(d: Destination, lang: Lang) {
  return BUILDINGS[d.b].name[lang];
}

export function dateRange(from: string, to: string, lang: Lang): string {
  const f = new Date(from + 'T12:00:00');
  const t = new Date(to + 'T12:00:00');
  try {
    return new Intl.DateTimeFormat(localeOf(lang), { month: 'short', day: 'numeric' }).formatRange(f, t);
  } catch {
    return `${from} – ${to}`;
  }
}

export function dateOne(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(localeOf(lang), { month: 'short', day: 'numeric' }).format(new Date(iso + 'T12:00:00'));
}

export function formatPhone(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function maskPhone(digits: string): string {
  return `(•••) •••-••${digits.slice(-2)}`;
}

export function minutesLabel(secs: number): number {
  return Math.max(1, Math.round(secs / 60));
}

export function feet(m: number) {
  return Math.round((m * 3.281) / 5) * 5;
}

export interface MessageInput {
  lang: Lang;
  dest: Destination;
  startName: string;
  steps: Step[];
  route: Route;
  pace: 'slow' | 'standard';
  stepFree: boolean;
  apptMin: number | null;
  compact?: boolean;
}

/** Plain-text directions used for the text message and the QR code. */
export function messageText(i: MessageInput): string {
  const T = STRINGS[i.lang];
  const lines: string[] = [];
  lines.push(`Wardway ${T.campus}`);
  lines.push(fmt(T.printTitle, { name: i.dest.name }));
  lines.push(`${bName(i.dest, i.lang)}, ${fmt(T.level, { n: i.dest.level })}${i.dest.rooms ? ` · ${roomsLabel(i.dest.rooms, i.lang)}` : ''}`);
  lines.push(fmt(T.printFrom, { name: i.startName }));
  const mins = minutesLabel(i.route.secs);
  lines.push(
    `${fmt(T.minWalk, { n: mins })} ${T.walkWord} ${i.pace === 'slow' ? T.atSlow : T.atStandard}${i.stepFree ? ' · ' + T.stepFreeBadge : ''}`,
  );
  if (i.apptMin !== null) lines.push(fmt(T.appt, { t: clock(i.apptMin, i.lang) }));
  lines.push('');
  i.steps.forEach((s, n) => {
    lines.push(`${n + 1}. ${s.text}`);
    if (s.note && !i.compact) lines.push(`   ! ${s.note}`);
  });
  if (!i.compact) {
    lines.push('');
    lines.push(T.help);
  }
  return lines.join('\n');
}

const PLACE_WORDS: Record<string, Record<Lang, string>> = {
  'Main lobby': { en: 'Main lobby', es: 'Vestíbulo principal', vi: 'Sảnh chính', tl: 'Main lobby' },
  Lobby: { en: 'Lobby', es: 'Vestíbulo', vi: 'Sảnh', tl: 'Lobby' },
  'Pavilion lobby': { en: 'Pavilion lobby', es: 'Vestíbulo del Pabellón', vi: 'Sảnh Tòa Tim mạch', tl: 'Pavilion lobby' },
  'Near elevators': { en: 'Near the elevators', es: 'Junto a los ascensores', vi: 'Gần thang máy', tl: 'Malapit sa elevator' },
  'Next to elevator': { en: 'Next to the elevator', es: 'Junto al ascensor', vi: 'Cạnh thang máy', tl: 'Katabi ng elevator' },
  'Level 1 booth': { en: 'Level 1 booth', es: 'Cabina del Nivel 1', vi: 'Quầy Tầng 1', tl: 'Booth sa Level 1' },
  'Entrance lane': { en: 'Entrance lane', es: 'Carril de entrada', vi: 'Làn vào', tl: 'Lane ng pasukan' },
  'Level 1 curb': { en: 'Level 1 curb', es: 'Acera del Nivel 1', vi: 'Lề đường Tầng 1', tl: 'Gilid ng kalsada sa Level 1' },
  'East side': { en: 'East side', es: 'Lado este', vi: 'Phía Đông', tl: 'Silangang bahagi' },
  'Near cafe': { en: 'Near the café', es: 'Junto a la cafetería', vi: 'Gần căn tin', tl: 'Malapit sa cafeteria' },
};

/** "Rooms 270–288" for numbered ranges, or a translated place note ("Near the elevators"). */
export function roomsLabel(rooms: string, lang: Lang): string {
  if (/^\d/.test(rooms)) return `${STRINGS[lang].rooms} ${rooms}`;
  const hit = PLACE_WORDS[rooms];
  if (hit) return hit[lang];
  const m = /^Level (\d)$/.exec(rooms);
  if (m) return fmt(STRINGS[lang].level, { n: m[1] });
  return rooms;
}
