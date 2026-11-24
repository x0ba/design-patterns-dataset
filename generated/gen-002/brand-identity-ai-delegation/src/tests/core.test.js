// Logic tests for the Studiotrace checks, corrections, and contribution record.
// Run with: npm test
'use strict';

const assert = require('node:assert/strict');
const SEED = require('../src/data.js');
const Core = require('../src/core.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('ok - ' + name);
}

const byId = (id, outs = SEED.outputs) => outs.find((o) => o.id === id);
const clone = (x) => JSON.parse(JSON.stringify(x));

test('snapshot has 15 outputs: 11 delivered, 4 queued', () => {
  assert.equal(SEED.outputs.length, 15);
  assert.equal(SEED.outputs.filter((o) => !Core.isPending(o)).length, 11);
  assert.equal(SEED.outputs.filter(Core.isPending).length, 4);
});

test('exactly four delivered outputs fail checks, with the expected causes', () => {
  const failing = SEED.outputs
    .filter((o) => !Core.isPending(o))
    .filter((o) => Core.failingChecks(o).length > 0)
    .map((o) => o.id)
    .sort();
  assert.deepEqual(failing, ['MB-3', 'PB-2', 'WD-1', 'WD-2']);

  const causes = (id) => Core.failingChecks(byId(id)).map((c) => c.id);
  assert.deepEqual(causes('MB-3'), ['palette']);
  assert.deepEqual(causes('WD-2'), ['palette']);
  assert.deepEqual(causes('PB-2'), ['wordmark']);
  assert.deepEqual(causes('WD-1'), ['wordmark']);
});

test('terracotta is not in the palette; the five palette hexes are', () => {
  assert.equal(Core.inPalette('#B8603F'), false);
  ['#3B2A20', '#F4E9D8', '#C9A227', '#7A8B6F', '#FFFFFF'].forEach((hex) => {
    assert.equal(Core.inPalette(hex), true, hex);
  });
  assert.equal(Core.inPalette('#c9a227'), true, 'case-insensitive');
});

test('corrections name the palette fix and the ampersand fix', () => {
  const mb3 = Core.correctionsFor(byId('MB-3'));
  assert.equal(mb3.length, 1);
  assert.match(mb3[0], /band to Sage #7A8B6F/);
  assert.match(mb3[0], /Remove #B8603F/);

  const wd1 = Core.correctionsFor(byId('WD-1'));
  assert.equal(wd1.length, 1);
  assert.match(wd1[0], /hand-lettered ampersand from wordmark-v3\.svg/);

  assert.deepEqual(Core.correctionsFor(byId('MB-1')), []);
});

test('record lists the two kept outputs, covers two of five types, and has no blockers', () => {
  const rec = Core.buildRecord(SEED.outputs);
  assert.deepEqual(rec.kept.map((o) => o.id), ['MB-1', 'PB-1']);
  assert.equal(rec.coveredTypes.length, 2);
  assert.equal(rec.blockerCount, 0);
  const checks = Core.submissionChecks(rec, null);
  assert.equal(checks.find((c) => c.id === 'exported').pass, false);
  assert.equal(checks.find((c) => c.id === 'coverage').pass, false);
});

test('a kept output with a typeface ampersand is blocked in the record', () => {
  const outs = clone(SEED.outputs);
  const pb2 = byId('PB-2', outs);
  pb2.decision = 'kept';
  const rec = Core.buildRecord(outs);
  assert.equal(rec.blockerCount, 1);
  const row = rec.sections.find((s) => s.output.id === 'PB-2').rows.find((r) => r.element === 'Ampersand');
  assert.equal(row.prov, 'ai');
});

test('student restoring the ampersand clears the block and marks placement as edited', () => {
  const outs = clone(SEED.outputs);
  const wd1 = byId('WD-1', outs);
  wd1.decision = 'kept';
  wd1.ampersand = 'student';
  const rec = Core.buildRecord(outs);
  const row = (name) => Core.provenanceRows(wd1).find((r) => r.element === name);
  assert.equal(row('Ampersand').prov, 'student');
  assert.equal(row('Wordmark placement').prov, 'ai-edited');
  assert.equal(Core.failingChecks(wd1).length, 0);
  assert.equal(rec.blockerCount, 0);
});

test('editing a color to a palette value changes color provenance to AI-made and student-edited', () => {
  const outs = clone(SEED.outputs);
  const mb3 = byId('MB-3', outs);
  mb3.design.band = '#7A8B6F';
  assert.deepEqual(Core.editedSlots(mb3), ['band']);
  assert.equal(Core.failingChecks(mb3).length, 0);
  const color = Core.provenanceRows(mb3).find((r) => r.element === 'Color application');
  assert.equal(color.prov, 'ai-edited');
  assert.match(color.note, /band set to Sage/);
});

test('markdown export contains the student-made assets, provenance labels, and trail', () => {
  const rec = Core.buildRecord(SEED.outputs);
  const md = Core.recordMarkdown(rec, {
    project: SEED.project.name,
    course: SEED.course.name,
    student: SEED.student.name,
    program: SEED.student.program,
    instructor: SEED.course.instructor,
    model: SEED.model,
    critiqueText: 'Fri, Nov 20, 2026, 9:00 a.m. Pacific',
    generatedText: 'Nov 17, 4:43 p.m.',
    wordmark: 'wordmark-v3.svg, drawn Oct 28, 2026',
    paletteText: 'x',
    typeText: 'y',
    trail: SEED.trail.map((e) => ({ at: e.at, actorLabel: e.actor, text: e.text }))
  });
  assert.match(md, /# Contribution record: Crumb & Kettle Identity/);
  assert.match(md, /\| Wordmark \| wordmark-v3\.svg, drawn Oct 28, 2026 \| Student-made \|/);
  assert.match(md, /### Menu board · V1 Tight \(MB-1\)/);
  assert.match(md, /\| Ampersand \| Student-made \|/);
  assert.match(md, /\| Color application \| AI-made \|/);
  assert.match(md, /## Not submitted/);
  assert.match(md, /Discarded: Standard spacing crowds the coffee prices/);
});

test('timestamps are shown in Pacific time with a.m./p.m. style', () => {
  assert.equal(Core.formatTime('2026-11-17T16:40:00-08:00'), 'Nov 17, 4:40 p.m.');
  assert.equal(Core.formatTime('2026-11-11T13:52:00-08:00'), 'Nov 11, 1:52 p.m.');
});

test('every seed artboard has the expected number of color slots and a valid spacing variation', () => {
  SEED.outputs.filter((o) => !Core.isPending(o)).forEach((o) => {
    assert.equal(Object.keys(o.design).length, 5, o.id);
    assert.ok(o.n >= 1 && o.n <= 3, o.id);
  });
});

console.log('\n' + passed + ' tests passed.');
