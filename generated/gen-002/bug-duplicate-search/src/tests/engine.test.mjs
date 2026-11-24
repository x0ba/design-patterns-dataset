import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BUILDS, CURRENT_BUILD, SESSION, DB_STATS } from '../src/data/session.js';
import { buildCorpus } from '../src/data/corpus.js';
import { buildIndex, search, makeContext, analyze, canonTerms } from '../src/search/engine.js';

const records = buildCorpus(BUILDS);
const index = buildIndex(records, BUILDS);
const byId = new Map(records.map((r) => [r.id, r]));

const ALL_STATUSES = new Set(['open', 'fixed', 'cant-repro', 'duplicate']);
const ALL_PLATFORMS = new Set(['PS5', 'Xbox Series', 'PC']);
const ALL_SEVERITIES = new Set(['S1', 'S2', 'S3', 'S4']);

const ctx = makeContext({
  query: SESSION.description,
  dumpSig: SESSION.signature,
  platform: SESSION.platform,
  currentBuild: CURRENT_BUILD,
  builds: BUILDS,
});

function run(query = SESSION.description, extra = {}) {
  return search(index, query, {
    statuses: ALL_STATUSES,
    platforms: ALL_PLATFORMS,
    severities: ALL_SEVERITIES,
    minBuildIdx: -1,
    onlySig: false,
    onlyClips: false,
    includeSig: true,
    dumpSig: SESSION.signature,
    sortBy: 'relevance',
    ...extra,
  });
}

test('corpus matches the database totals', () => {
  assert.equal(records.length, DB_STATS.total);
  assert.equal(records.filter((r) => r.status === 'open').length, DB_STATS.open);
  const ids = new Set(records.map((r) => r.id));
  assert.equal(ids.size, records.length, 'report IDs are unique');
});

test('every hand-written report mentions map and rain or is one of the named candidates', () => {
  const mentionsBoth = records.filter((r) => {
    const t = canonTerms(`${r.title} ${r.description}`);
    return t.has('MAP') && t.has('WX');
  });
  // 14 "other" reports plus GW-31877 (map+storm) and GW-33519 (map+rain) and GW-33088 (map+rainy).
  assert.ok(mentionsBoth.length >= 14, `found ${mentionsBoth.length}`);
});

test('the same-signature report ranks first for the tester query', () => {
  const res = run();
  assert.equal(records[res.results[0]].id, 'GW-31877');
});

test('signature match is the only same-signature report, and it is fixed in 0.47.2090', () => {
  const same = records.filter((r) => r.signature === SESSION.signature);
  assert.deepEqual(same.map((r) => r.id), ['GW-31877']);
  assert.equal(same[0].fixedIn, '0.47.2090');
  assert.equal(same[0].dupes, 12);
});

test('GW-31877 is recommended as a reopen (regression) against the current build', () => {
  const a = analyze(byId.get('GW-31877'), ctx);
  assert.equal(a.sameSig, true);
  assert.equal(a.sug.kind, 'reopen');
  assert.equal(a.sug.target, 'GW-31877');
  assert.match(a.sug.reason, /regression/);
});

test('GW-33402 (PC freeze, same trigger) is related, not a duplicate', () => {
  const a = analyze(byId.get('GW-33402'), ctx);
  assert.equal(a.sug.kind, 'related');
  assert.deepEqual(a.hits.sort(), ['FT', 'COOP', 'MAP'].sort());
});

test('GW-33519 (weather flicker, cosmetic) is related', () => {
  const a = analyze(byId.get('GW-33519'), ctx);
  assert.equal(a.sug.kind, 'related');
});

test('GW-31560 is a duplicate and points at the canonical GW-31877', () => {
  const a = analyze(byId.get('GW-31560'), ctx);
  assert.equal(a.sug.kind, 'follow');
  assert.equal(a.sug.target, 'GW-31877');
});

test('GW-32004 (same conditions on PS5, stall not crash) is a possible duplicate', () => {
  const a = analyze(byId.get('GW-32004'), ctx);
  assert.equal(a.sug.kind, 'compare');
});

test('GW-31012 (stale weather tint that mentions co-op) is only related, not a possible duplicate', () => {
  const a = analyze(byId.get('GW-31012'), ctx);
  assert.equal(a.sug.kind, 'related');
});

test('GW-30903 (similar map crash fixed in 0.46.2051, different signature) is related', () => {
  const a = analyze(byId.get('GW-30903'), ctx);
  assert.equal(a.sug.kind, 'related');
  assert.match(a.sug.reason, /Different crash signature/);
});

test("tester's full query returns only the hand-written candidates, not the filler", () => {
  const res = run();
  assert.ok(res.total <= 30, `returned ${res.total}`);
  assert.ok(res.results.every((i) => ['GW-31877', 'GW-33402', 'GW-33519', 'GW-33088', 'GW-32004', 'GW-31560', 'GW-31012',
    'GW-32877', 'GW-30581', 'GW-30903', 'GW-32511', 'GW-31688', 'GW-32290', 'GW-30722', 'GW-32948', 'GW-30118', 'GW-30466']
    .includes(records[i].id)));
});

test('an unrelated query returns nothing when the dump signature is excluded', () => {
  const res = run('zzzz qqqq', { includeSig: false });
  assert.equal(res.total, 0);
});

test('the dump signature is always a search term while it is included', () => {
  const res = run('zzzz qqqq');
  assert.deepEqual(res.results.map((i) => records[i].id), ['GW-31877']);
});

test('status filter narrows results but statusCounts still reflects all statuses', () => {
  const res = run(SESSION.description, { statuses: new Set(['open']) });
  assert.ok(res.results.every((i) => records[i].status === 'open'));
  assert.ok(res.statusCounts.fixed >= 1, 'fixed count still visible');
});

test('platform filter removes PC-only reports when PS5-only is selected', () => {
  const res = run(SESSION.description, { platforms: new Set(['PS5']) });
  const pcOnly = res.results.map((i) => records[i]).filter((r) => r.platforms.length === 1 && r.platforms[0] === 'PC');
  assert.equal(pcOnly.length, 0);
});

test('build floor filter keeps only reports seen in the given build or later', () => {
  const res = run(SESSION.description, { minBuildIdx: BUILDS.indexOf('0.48.2117') });
  assert.ok(res.results.every((i) => records[i].lastIdx === BUILDS.indexOf('0.48.2117')));
});

test('empty query lists by recency without throwing', () => {
  const res = run('', { includeSig: false });
  assert.equal(res.total, records.length);
});
