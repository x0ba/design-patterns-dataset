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

/**
 * Self-imposed ceilings on account utilization (0–1) per Claude Code window, so a
 * batch leaves headroom for the account's owner. Keys are the CLI's window names.
 */
export interface UsageCaps { five_hour?: number; seven_day?: number }

const CAP_ENV: Record<keyof UsageCaps, string> = { seven_day: 'USAGE_CAP_WEEKLY', five_hour: 'USAGE_CAP_FIVE_HOUR' };
const WINDOW_NAME: Record<keyof UsageCaps, string> = { seven_day: 'weekly', five_hour: '5-hour' };

/** USAGE_CAP_WEEKLY / USAGE_CAP_FIVE_HOUR, as a fraction ("0.5") or a percent ("50"). Unset means no cap. */
export function capsFromEnv(env: NodeJS.ProcessEnv = process.env): UsageCaps {
  const caps: UsageCaps = {};
  for (const [win, name] of Object.entries(CAP_ENV) as [keyof UsageCaps, string][]) {
    const raw = env[name]?.trim();
    if (!raw) continue;
    let v = Number(raw.replace(/%$/, ''));
    if (!Number.isFinite(v) || v <= 0) throw new Error(`${name}=${raw}: expected a fraction (0.5) or a percent (50)`);
    if (v > 1) v /= 100;
    caps[win] = Math.min(v, 1);
  }
  return caps;
}

/** How often utilization must have been seen before starting work under a cap; older readings are re-probed. */
const READING_MAX_AGE_MS = 15 * 60_000;

export interface UsageGateOptions {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
  caps?: UsageCaps;
}

/**
 * Process-wide pause. `hold` is idempotent for the same deadline: concurrent
 * raters that hit the limit together log once and wake together.
 *
 * With caps, every Claude Code session's `rate_limit_event` is passed to
 * `observe`. Once a window's utilization reaches its cap, `wait()` (called before
 * each unit of work) blocks until that window resets. Unlike a real limit this
 * does not stop sessions already running; `pending()` stays clear, so they finish.
 */
export class UsageGate {
  private until = 0;
  private detail = '';
  private resetsAt: Date | undefined;
  private generation = 0;
  private loggedResume = 0;
  private capUntil = 0;
  private lastReading = 0;
  private probing: Promise<void> | undefined;
  private probeFn: (() => Promise<void>) | undefined;
  private readonly announced = new Set<string>();
  caps: UsageCaps;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly log: (line: string) => void;

  constructor(opts: UsageGateOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.log = opts.log ?? ((line) => console.log(line));
    this.caps = opts.caps ?? {};
  }

  /** How to get a fresh reading when none is recent (a tiny CLI call; see usage-probe.ts). */
  setProbe(fn: () => Promise<void>): void {
    this.probeFn = fn;
  }

  private capped(): boolean {
    return Object.keys(this.caps).length > 0;
  }

  /** Feed a `rate_limit_event.rate_limit_info` from the CLI's stream-json output. */
  observe(info: unknown): void {
    const windows = (info as { unifiedWindows?: Record<string, { utilization?: unknown; resetsAt?: unknown }> } | undefined)?.unifiedWindows;
    if (!windows || typeof windows !== 'object') return;
    this.lastReading = this.now();
    let seen = 0, under = 0;
    for (const [win, cap] of Object.entries(this.caps) as [keyof UsageCaps, number][]) {
      const w = windows[win];
      if (!w || typeof w.utilization !== 'number' || typeof w.resetsAt !== 'number') continue;
      seen++;
      if (w.utilization < cap) under++;
      if (!this.announced.has(win)) {
        this.announced.add(win);
        this.log(`Usage cap: ${WINDOW_NAME[win]} ${Math.round(cap * 100)}%; the account is at ${Math.round(w.utilization * 100)}% now (window resets ${new Date(w.resetsAt * 1000).toISOString()}).`);
      }
      if (w.utilization < cap) continue;
      const deadline = w.resetsAt * 1000 + BUFFER_MS;
      if (deadline <= this.now() || deadline <= this.capUntil) continue;
      this.capUntil = deadline;
      this.generation++;
      this.log(`Usage cap: ${WINDOW_NAME[win]} usage is at ${Math.round(w.utilization * 100)}% (cap ${Math.round(cap * 100)}%). Work already running finishes; nothing new starts until the window resets at ${new Date(deadline).toISOString()} (${formatDuration(deadline - this.now())}).`);
    }
    // Usage can drop before the window ends (e.g. the account's usage was reset): lift the cap pause.
    if (seen > 0 && under === seen && this.capUntil > this.now()) {
      this.capUntil = 0;
      this.log('Usage cap: the account is back under every cap; resuming.');
    }
  }

  /** Under a cap, make sure utilization was seen recently before work starts. */
  private async refresh(): Promise<void> {
    if (!this.capped() || !this.probeFn || this.now() - this.lastReading < READING_MAX_AGE_MS) return;
    this.probing ??= this.probeFn()
      .catch((e) => this.log(`Usage probe failed (${e instanceof Error ? e.message : e}); continuing on the last reading.`))
      .finally(() => { this.probing = undefined; this.lastReading = Math.max(this.lastReading, this.now()); });
    await this.probing;
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
    await this.refresh();
    const blockedUntil = () => Math.max(this.until, this.capUntil);
    if (this.now() >= blockedUntil()) return;
    const gen = this.generation;
    // A reading taken after waking (the window may not have reset as expected) can extend the pause.
    while (this.now() < blockedUntil()) {
      let nextNote = this.now() + HEARTBEAT_MS;
      while (this.now() < blockedUntil()) {
        const remaining = blockedUntil() - this.now();
        const untilNote = Math.max(0, nextNote - this.now());
        const slice = Math.min(remaining, MAX_SLEEP_MS, untilNote > 0 ? untilNote : HEARTBEAT_MS);
        await this.sleep(slice);
        if (this.now() >= blockedUntil()) break;
        if (this.now() >= nextNote && this.capUntil > this.until) {
          // Paused only by a self-imposed cap: re-read utilization, which may have dropped early.
          this.lastReading = 0;
          await this.refresh();
          if (this.now() >= blockedUntil()) break;
        }
        if (this.now() >= nextNote) {
          const why = this.capUntil > this.until ? 'at the usage cap' : 'for Claude usage';
          this.log(`Still paused ${why}. Work resumes at ${new Date(blockedUntil()).toISOString()} (${formatDuration(blockedUntil() - this.now())} left). No further sites will be labeled until then.`);
          nextNote = this.now() + HEARTBEAT_MS;
        }
      }
      this.lastReading = 0; // the window reset (or should have): read it again before starting
      await this.refresh();
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

export const usageGate = new UsageGate({ caps: capsFromEnv() });

/** Pass every parsed stream-json event from a claude CLI session through here. */
export function observeStreamEvent(ev: { type?: unknown; rate_limit_info?: unknown } | undefined): void {
  if (ev?.type === 'rate_limit_event') usageGate.observe(ev.rate_limit_info);
}

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
