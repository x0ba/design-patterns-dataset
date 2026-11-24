import { CINEMAS, FILMS, SCREENINGS } from "../data/catalog";
import { PAST_ALERTS, WEEK_ALERTS } from "../data/alerts";
import type { AlertType, Cinema, Film, Format, Screening } from "../types";
import { NOW, calendarDaysBetween, mondayOf, parseDay, parseStamp } from "./time";
import { percentSold } from "./rules";

export const FILM_BY_ID = new Map(FILMS.map((f) => [f.id, f]));
export const CINEMA_BY_ID = new Map(CINEMAS.map((c) => [c.id, c]));

export interface ScreeningRow extends Screening {
  film: Film;
  cinema: Cinema;
  pct: number;
}

export const SCREENING_ROWS: ScreeningRow[] = SCREENINGS.map((s) => {
  const film = FILM_BY_ID.get(s.filmId);
  const cinema = CINEMA_BY_ID.get(s.cinemaId);
  if (!film || !cinema) throw new Error(`Unknown film or cinema for ${s.id}`);
  return { ...s, film, cinema, pct: percentSold(s.sold, cinema.seats) };
});

export const SCREENING_BY_ID = new Map(SCREENING_ROWS.map((s) => [s.id, s]));

export interface AlertRow {
  id: string;
  at: string;
  when: Date;
  type: AlertType;
  film: Film;
  cinema: Cinema;
  format: Format;
  date: string;
  time: string;
  sold: number;
  pct: number;
  series: string | null;
  /** Set when the alert points at a screening in the upcoming list. */
  screeningId: string | null;
}

function fromScreening(at: string, type: AlertType, sid: string): AlertRow {
  const s = SCREENING_BY_ID.get(sid);
  if (!s) throw new Error(`Unknown screening ${sid}`);
  return {
    id: `a-${at}-${sid}`,
    at,
    when: parseStamp(at),
    type,
    film: s.film,
    cinema: s.cinema,
    format: s.format,
    date: s.date,
    time: s.time,
    sold: s.sold,
    pct: s.pct,
    series: s.series,
    screeningId: sid,
  };
}

function fromHistory(row: (typeof PAST_ALERTS)[number], index: number): AlertRow {
  const [at, type, filmId, cinemaId, format, date, time, sold, series] = row;
  const film = FILM_BY_ID.get(filmId);
  const cinema = CINEMA_BY_ID.get(cinemaId);
  if (!film || !cinema) throw new Error(`Unknown film or cinema in history row ${index}`);
  return {
    id: `h-${index}`,
    at,
    when: parseStamp(at),
    type,
    film,
    cinema,
    format,
    date,
    time,
    sold,
    pct: percentSold(sold, cinema.seats),
    series,
    screeningId: null,
  };
}

/** Every alert in the last 30 days, newest first. */
export const ALL_ALERTS: AlertRow[] = [
  ...WEEK_ALERTS.map((a) => fromScreening(a.at, a.type, a.sid)),
  ...PAST_ALERTS.map((row, i) => fromHistory(row, i)),
].sort((a, b) => b.when.getTime() - a.when.getTime());

/** Alerts from the last seven days (what the Today screen calls "this week"). */
export function alertsLastSevenDays(now: Date = NOW): AlertRow[] {
  const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  return ALL_ALERTS.filter((a) => a.when.getTime() >= cutoff && a.when.getTime() <= now.getTime());
}

export function alertsLastThirtyDays(now: Date = NOW): AlertRow[] {
  const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  return ALL_ALERTS.filter((a) => a.when.getTime() >= cutoff && a.when.getTime() <= now.getTime());
}

/** Simple linear pace from the last two sales snapshots, projected to showtime. */
export interface Projection {
  pacePerDay: number;
  projectedSold: number;
  projectedPct: number;
  daysToShow: number;
}

export function projectSold(s: ScreeningRow, now: Date = NOW): Projection | null {
  const h = s.sales;
  if (!h || h.length < 2) return null;
  const prev = h[h.length - 2];
  const last = h[h.length - 1];
  const span = calendarDaysBetween(parseDay(prev.date), parseDay(last.date));
  if (span <= 0) return null;
  const pace = (last.sold - prev.sold) / span;
  const daysToShow = Math.max(0, calendarDaysBetween(now, parseDay(s.date)));
  const projectedSold = Math.min(s.cinema.seats, Math.round(last.sold + pace * daysToShow));
  return {
    pacePerDay: pace,
    projectedSold,
    projectedPct: percentSold(projectedSold, s.cinema.seats),
    daysToShow,
  };
}

export interface WeekGroup {
  monday: string;
  rows: ScreeningRow[];
}

/** Groups screenings by the Monday of their week, in date order. */
export function groupByWeek(rows: ScreeningRow[]): WeekGroup[] {
  const groups: WeekGroup[] = [];
  for (const row of rows) {
    const monday = mondayOf(row.date);
    const last = groups[groups.length - 1];
    if (last && last.monday === monday) last.rows.push(row);
    else groups.push({ monday, rows: [row] });
  }
  return groups;
}

export const SERIES_NAMES: string[] = Array.from(
  new Set([
    ...SCREENINGS.map((s) => s.series).filter((s): s is string => Boolean(s)),
    ...PAST_ALERTS.map((r) => r[8]).filter((s): s is string => Boolean(s)),
  ]),
).sort((a, b) => a.localeCompare(b));

export const LIBRARY_COUNTS = { wanted: 214, mustSeeOnFilm: 61, seen: 389 };
