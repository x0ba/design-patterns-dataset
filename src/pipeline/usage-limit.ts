// Claude Code subscription windows ("You've hit your 5-hour limit · resets 5:30am
// (America/Los_Angeles)") are account-wide. One rater hitting one pauses every
// claude-code run in this process until the reset, so later sites are not labeled
// into the same wall. The CLI prints that sentence and exits; `-p` does not wait.

const BUFFER_MS = 15_000;
const MIN_WAIT_MS = 30_000;
const HEARTBEAT_MS = 30 * 60_000;
const MAX_SLEEP_MS = 2_147_000_000; // setTimeout ceiling is 2^31-1 ms
const CLOCK_GRACE_MS = 2 * 60_000;

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// One line of a Claude Code limit notice. The reset clause is part of the same line
// ("· resets 5:30am (America/Los_Angeles)"), sometimes followed by "· progress saved".
const LIMIT_LINE = /you(?:['’])ve hit your [^\n]{0,300}|you(?:['’])ve reached your [^\n]{0,300}|you(?:['’])re out of (?:extra )?usage[^\n]{0,300}|usage limit reached[^\n]{0,300}|requires usage credits[^\n]{0,300}/i;

const RESET_CLOCK = /resets(?:\s+at)?\s+(?:([A-Za-z]{3})\s+(\d{1,2}),\s+(?:(\d{4}),\s+)?)?(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?(?:\s+\(([^)]+)\))?/i;

export class UsageLimitError extends Error {
  readonly resetsAt: Date | undefined;
  constructor(message: string, resetsAt?: Date) {
    super(message);
    this.name = 'UsageLimitError';
    this.resetsAt = resetsAt;
  }
}

/** A Claude Code usage-limit notice, or undefined when `text` is some other failure. */
export function parseUsageLimit(text: string, now = new Date()): { resetsAt?: Date } | undefined {
  const line = text.match(LIMIT_LINE)?.[0];
  if (!line || !/resets(?:\s+at)?\s+/i.test(line)) return undefined;
  return { resetsAt: parseResetClause(line, now) };
}

export function usageLimitFromText(text: string, now = new Date()): UsageLimitError | undefined {
  const parsed = parseUsageLimit(text, now);
  if (!parsed) return undefined;
  const message = text.trim().replace(/\s+/g, ' ').slice(0, 500);
  return new UsageLimitError(message, parsed.resetsAt);
}

export interface UsageGateOptions {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
}

/**
 * Process-wide pause. `hold` is idempotent for the same deadline: concurrent
 * raters that hit the limit together log once and wake together.
 */
export class UsageGate {
  private until = 0;
  private detail = '';
  private resetsAt: Date | undefined;
  private generation = 0;
  private loggedResume = 0;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly log: (line: string) => void;

  constructor(opts: UsageGateOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.log = opts.log ?? ((line) => console.log(line));
  }

  /** True while labeling must not start. The error carries the notice that opened the pause. */
  pending(): UsageLimitError | undefined {
    if (this.now() >= this.until) return undefined;
    return new UsageLimitError(this.detail, this.resetsAt);
  }

  hold(err: UsageLimitError): void {
    const deadline = this.deadlineFor(err.resetsAt);
    if (deadline <= this.until) return;
    this.until = deadline;
    this.detail = err.message;
    this.resetsAt = err.resetsAt;
    this.generation++;
    const wait = formatDuration(deadline - this.now());
    const when = new Date(deadline).toISOString();
    this.log(`Claude usage limit reached: ${err.message}. Pausing labeling for ${wait}, until ${when}. No further sites will be labeled until then.`);
  }

  async wait(): Promise<void> {
    if (this.now() >= this.until) return;
    const gen = this.generation;
    let nextNote = this.now() + HEARTBEAT_MS;
    while (this.now() < this.until) {
      const remaining = this.until - this.now();
      const untilNote = Math.max(0, nextNote - this.now());
      const slice = Math.min(remaining, MAX_SLEEP_MS, untilNote > 0 ? untilNote : HEARTBEAT_MS);
      await this.sleep(slice);
      if (this.now() >= this.until) break;
      if (this.now() >= nextNote) {
        this.log(`Still paused for Claude usage. Labeling resumes at ${new Date(this.until).toISOString()} (${formatDuration(this.until - this.now())} left). No further sites will be labeled until then.`);
        nextNote = this.now() + HEARTBEAT_MS;
      }
    }
    if (this.loggedResume < gen) {
      this.loggedResume = this.generation;
      this.log('Claude usage is available again. Continuing labeling.');
    }
  }

  private deadlineFor(resetsAt: Date | undefined): number {
    const now = this.now();
    if (!resetsAt || resetsAt.getTime() + BUFFER_MS <= now) return now + MIN_WAIT_MS;
    return resetsAt.getTime() + BUFFER_MS;
  }
}

export const usageGate = new UsageGate();

function parseResetClause(line: string, now: Date): Date | undefined {
  const m = line.replace(/\u202f/g, ' ').match(RESET_CLOCK);
  if (!m) return undefined;
  const mon = m[1];
  const day = m[2];
  const year = m[3];
  const hour12 = Number(m[4]);
  const minute = m[5] ? Number(m[5]) : 0;
  const ap = m[6].toLowerCase();
  const zone = resolveZone(m[7]);
  let hour = hour12 % 12;
  if (ap === 'p') hour += 12;
  if (mon) {
    const month = MONTHS[mon.toLowerCase()];
    if (month === undefined || !day) return undefined;
    const y = year ? Number(year) : zonedParts(now.getTime(), zone).year;
    let at = zonedTime(y, month, Number(day), hour, minute, zone);
    // The CLI prints the year only when it differs from the current one. A date
    // with no year that is already far in the past is next year.
    if (!year && at.getTime() < now.getTime() - 36 * 3600_000) at = zonedTime(y + 1, month, Number(day), hour, minute, zone);
    return at;
  }
  // Time-only means the reset is inside the next day ("5:30am", minutes omitted on the hour).
  const today = zonedParts(now.getTime(), zone);
  const todayAt = zonedTime(today.year, today.month, today.day, hour, minute, zone);
  if (todayAt.getTime() >= now.getTime() - CLOCK_GRACE_MS) return todayAt;
  const next = addDays(today, 1);
  return zonedTime(next.year, next.month, next.day, hour, minute, zone);
}

function resolveZone(name: string | undefined): string {
  const trimmed = name?.trim();
  if (trimmed && validZone(trimmed)) return trimmed;
  const sys = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return sys && validZone(sys) ? sys : 'UTC';
}

function validZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function zonedParts(ms: number, timeZone: string): { year: number; month: number; day: number } {
  const p = partsOf(ms, timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return { year: Number(p.year), month: Number(p.month) - 1, day: Number(p.day) };
}

function partsOf(ms: number, timeZone: string, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  const dtf = new Intl.DateTimeFormat('en-US', { ...opts, timeZone, hourCycle: 'h23' });
  return Object.fromEntries(dtf.formatToParts(new Date(ms)).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
}

/** Milliseconds to add to a UTC timestamp to get the wall clock in `timeZone` (LA is negative). */
function zoneOffsetMs(timeZone: string, utcMs: number): number {
  const p = partsOf(utcMs, timeZone, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  // Some engines format midnight as hour 24 on the previous calendar day.
  let day = Number(p.day);
  let hour = Number(p.hour);
  if (hour === 24) { hour = 0; day += 1; }
  const asUTC = Date.UTC(Number(p.year), Number(p.month) - 1, day, hour, Number(p.minute), Number(p.second));
  return asUTC - utcMs;
}

function zonedTime(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const guess = Date.UTC(year, month, day, hour, minute, 0);
  const utc = guess - zoneOffsetMs(timeZone, guess - zoneOffsetMs(timeZone, guess));
  return new Date(utc);
}

function addDays(parts: { year: number; month: number; day: number }, days: number): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(parts.year, parts.month, parts.day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth(), day: utc.getUTCDate() };
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days) return hours ? `${days}d ${hours}h` : `${days}d`;
  if (hours) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes) return `${minutes}m`;
  return `${total}s`;
}
