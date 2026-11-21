import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capsFromEnv, parseUsageLimit, UsageGate, UsageLimitError, usageLimitFromText } from '../src/pipeline/usage-limit.ts';

const FIVE_HOUR = "You've hit your 5-hour limit · resets 5:30am (America/Los_Angeles)";

test('parses the Claude Code 5-hour limit notice', () => {
  // 09:54 UTC on 2026-11-09 is 1:54am PST. 5:30am PST is 13:30 UTC the same day.
  const now = new Date('2026-11-09T09:54:25.635Z');
  const parsed = parseUsageLimit(FIVE_HOUR, now);
  assert.equal(parsed?.resetsAt?.toISOString(), '2026-11-09T13:30:00.000Z');
});

test('parses a time on the hour, a weekly date, a dated year, and daylight time', () => {
  const onTheHour = parseUsageLimit("You've hit your 5-hour limit · resets 5am (UTC)", new Date('2026-11-09T04:00:00.000Z'));
  assert.equal(onTheHour?.resetsAt?.toISOString(), '2026-11-09T05:00:00.000Z');

  const weekly = parseUsageLimit(
    "You've hit your weekly limit · resets Nov 16, 1:15am (America/Los_Angeles)",
    new Date('2026-11-09T09:54:00.000Z'),
  );
  assert.equal(weekly?.resetsAt?.toISOString(), '2026-11-16T09:15:00.000Z');

  const nextYear = parseUsageLimit(
    "You've hit your weekly limit · resets Jan 2, 2027, 5:30am (America/Los_Angeles)",
    new Date('2026-11-09T09:54:00.000Z'),
  );
  assert.equal(nextYear?.resetsAt?.toISOString(), '2027-01-02T13:30:00.000Z');

  // July is PDT (UTC-7). 5:30am PDT is 12:30 UTC.
  const pdt = parseUsageLimit(FIVE_HOUR, new Date('2026-07-15T10:00:00.000Z'));
  assert.equal(pdt?.resetsAt?.toISOString(), '2026-07-15T12:30:00.000Z');
});

test('a clock time already past today is the next day, and a trailing clause is ignored', () => {
  // 18:00 UTC is 10:00am PST, so 5:30am was earlier today. The CLI would mean tomorrow.
  const rolled = parseUsageLimit(FIVE_HOUR, new Date('2026-11-09T18:00:00.000Z'));
  assert.equal(rolled?.resetsAt?.toISOString(), '2026-11-10T13:30:00.000Z');

  const saved = parseUsageLimit(`${FIVE_HOUR} · progress saved`, new Date('2026-11-09T09:54:00.000Z'));
  assert.equal(saved?.resetsAt?.toISOString(), '2026-11-09T13:30:00.000Z');

  const extra = parseUsageLimit("You're out of extra usage · resets 11:05pm (America/New_York)", new Date('2026-11-09T20:00:00.000Z'));
  assert.equal(extra?.resetsAt?.toISOString(), '2026-11-10T04:05:00.000Z');
});

test('other failures are not usage limits', () => {
  assert.equal(parseUsageLimit('claude CLI could not connect to the rater MCP server'), undefined);
  assert.equal(parseUsageLimit("You've hit your monthly spend limit."), undefined);
  assert.equal(parseUsageLimit('The hero says you have hit your stride. The nav resets the layout.'), undefined);
});

test('the batch waits out one shared deadline and does not start again early', async () => {
  let now = Date.parse('2026-11-09T09:54:00.000Z');
  const logs: string[] = [];
  const gate = new UsageGate({
    now: () => now,
    sleep: async (ms) => { now += ms; },
    log: (line) => logs.push(line),
  });
  const err = usageLimitFromText(FIVE_HOUR, new Date(now));
  assert.ok(err instanceof UsageLimitError);
  gate.hold(err!);
  gate.hold(usageLimitFromText(FIVE_HOUR, new Date(now))!);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /No further sites will be labeled until then/);
  assert.ok(gate.pending());

  await gate.wait();
  assert.ok(now >= err!.resetsAt!.getTime());
  assert.equal(gate.pending(), undefined);
  assert.match(logs.at(-1)!, /Continuing labeling/);

  const pausedLogs = logs.length;
  await gate.wait();
  assert.equal(logs.length, pausedLogs);
});

test('a second, later reset extends the pause', async () => {
  let now = Date.parse('2026-11-09T09:54:00.000Z');
  const logs: string[] = [];
  const gate = new UsageGate({
    now: () => now,
    sleep: async (ms) => { now += ms; },
    log: (line) => logs.push(line),
  });
  gate.hold(new UsageLimitError(FIVE_HOUR, new Date('2026-11-09T13:30:00.000Z')));
  gate.hold(new UsageLimitError(
    "You've hit your weekly limit · resets Nov 16, 1:15am (America/Los_Angeles)",
    new Date('2026-11-16T09:15:00.000Z'),
  ));
  assert.equal(logs.length, 2);
  await gate.wait();
  assert.ok(now >= Date.parse('2026-11-16T09:15:00.000Z'));
});

test('a notice with no parseable reset time still pauses briefly instead of labeling', async () => {
  let now = 10_000;
  const gate = new UsageGate({
    now: () => now,
    sleep: async (ms) => { now += ms; },
    log: () => {},
  });
  const err = usageLimitFromText("You've hit your 5-hour limit · resets sometime soon");
  assert.ok(err);
  assert.equal(err?.resetsAt, undefined);
  gate.hold(err!);
  await gate.wait();
  assert.ok(now - 10_000 >= 30_000);
  assert.ok(now - 10_000 < 60_000);
});

// rate_limit_event.rate_limit_info as the CLI's stream-json reports it.
const reading = (weekly: number, weeklyResetsAt: number, fiveHour = 0.1) => ({
  status: 'allowed',
  unifiedWindows: {
    five_hour: { utilization: fiveHour, resetsAt: weeklyResetsAt - 86_400, status: 'allowed' },
    seven_day: { utilization: weekly, resetsAt: weeklyResetsAt, status: 'allowed' },
  },
});

test('usage caps come from the environment as a fraction or a percent', () => {
  assert.deepEqual(capsFromEnv({}), {});
  assert.deepEqual(capsFromEnv({ USAGE_CAP_WEEKLY: '0.47' }), { seven_day: 0.47 });
  assert.deepEqual(capsFromEnv({ USAGE_CAP_WEEKLY: '50', USAGE_CAP_FIVE_HOUR: '80%' }), { seven_day: 0.5, five_hour: 0.8 });
  assert.throws(() => capsFromEnv({ USAGE_CAP_WEEKLY: 'half' }), /USAGE_CAP_WEEKLY/);
});

test('below the weekly cap, work starts; at it, new work waits for the weekly reset but running work is not stopped', async () => {
  let now = Date.parse('2026-11-17T15:00:00.000Z');
  const reset = Date.parse('2026-11-22T11:00:00.000Z') / 1000;
  const logs: string[] = [];
  const gate = new UsageGate({ now: () => now, sleep: async (ms) => { now += ms; }, log: (l) => logs.push(l), caps: { seven_day: 0.47 } });

  gate.observe(reading(0.3, reset));
  await gate.wait();
  assert.equal(now, Date.parse('2026-11-17T15:00:00.000Z'));

  gate.observe(reading(0.48, reset));
  gate.observe(reading(0.49, reset)); // same window: one notice
  assert.equal(logs.filter((l) => l.startsWith('Usage cap: weekly usage is at')).length, 1);
  assert.ok(logs.some((l) => /weekly usage is at 48% \(cap 47%\)/.test(l)));
  assert.equal(gate.pending(), undefined); // sessions in flight keep running

  await gate.wait();
  assert.ok(now >= reset * 1000);
  assert.match(logs.at(-1)!, /Continuing/);
});

test('a window without a cap is ignored, and a stale reading is probed before work starts', async () => {
  let now = Date.parse('2026-11-17T15:00:00.000Z');
  const reset = Date.parse('2026-11-22T11:00:00.000Z') / 1000;
  const gate = new UsageGate({ now: () => now, sleep: async (ms) => { now += ms; }, log: () => {}, caps: { seven_day: 0.5 } });
  let probes = 0;
  let next = reading(0.2, reset, 0.99); // 5-hour is not capped
  gate.setProbe(async () => { probes++; gate.observe(next); });

  await gate.wait();
  assert.equal(probes, 1);
  await gate.wait(); // fresh reading: no second probe
  assert.equal(probes, 1);

  now += 20 * 60_000; // stale again; this time the probe finds the cap reached
  next = reading(0.55, reset);
  await gate.wait();
  assert.equal(probes >= 2, true);
  assert.ok(now >= reset * 1000);
});

test('without caps, readings never block and no probe runs', async () => {
  let now = 1_000;
  const gate = new UsageGate({ now: () => now, sleep: async (ms) => { now += ms; }, log: () => {} });
  let probes = 0;
  gate.setProbe(async () => { probes++; });
  gate.observe(reading(1, 10_000_000));
  await gate.wait();
  assert.equal(now, 1_000);
  assert.equal(probes, 0);
});

test('a cap pause lifts early when a re-read shows usage dropped (e.g. the account was reset)', async () => {
  let now = Date.parse('2026-11-18T08:00:00.000Z');
  const reset = Date.parse('2026-11-22T11:00:00.000Z') / 1000;
  const logs: string[] = [];
  const gate = new UsageGate({ now: () => now, sleep: async (ms) => { now += ms; }, log: (l) => logs.push(l), caps: { seven_day: 0.75 } });
  const started = now;
  let probes = 0;
  // The usage resets 2 hours into the pause; the next heartbeat's re-read lifts it.
  gate.setProbe(async () => { probes++; gate.observe(reading(now - started >= 2 * 3600_000 ? 0 : 0.76, reset)); });
  gate.observe(reading(0.76, reset));
  await gate.wait();
  assert.ok(now < reset * 1000, 'resumed before the window reset');
  assert.ok(now - started <= 2.5 * 3600_000 + 1);
  assert.ok(probes >= 4);
  assert.ok(logs.some((l) => /back under every cap/.test(l)));
});
