// Generates the mock Northgate batch used by the Tapcard Assist review UI.
//
// Everything here is fabricated for the front end. The counts are fixed so the
// review state matches the working snapshot: 600 service lines in the batch,
// 410 proposed (188 high / 141 medium / 81 low), 37 proposed GRR, and 12
// proposals that contradict a 2024 field verification. The generator is
// seeded, so re-running it produces the same file.
//
// Usage: node scripts/generate-batch.mjs

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../src/data/northgate-batch.json');

// ---------- seeded helpers ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261116);
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
// Year draw that never produces an empty range.
const yr = (lo, hi) => int(Math.min(lo, hi), hi);
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const pad = (n, w) => String(n).padStart(w, '0');
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
function shuffle(xs) {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

// ---------- batch geometry ----------
const BLOCKS = 24;
const LOTS = 25; // 24 x 25 = 600 service lines
const COMPLETED = 410; // first 410 in block order are proposed; the rest are queued

const STREETS = [
  'Larkspur Ct', 'Hollis Ave', 'Cedar Ridge Dr', 'Brandt St', 'Orchard Ln', 'Vine St',
  'Alder Way', 'Kestrel Rd', 'Millrace Ave', 'Northgate Blvd', 'Pennock St', 'Wexford Pl',
];
const STREET_START = [1400, 1200, 2100, 1800, 900, 1500, 2600, 1100, 2300, 3000, 700, 1600];

const TAP_NUMBERS = new Set();
function tapNo() {
  let n;
  do n = int(1000, 5999); while (TAP_NUMBERS.has(n));
  TAP_NUMBERS.add(n);
  return n;
}
const usedPermits = new Set();
function permitNo(year) {
  let n;
  do n = int(100, 1400); while (usedPermits.has(`${year}-${n}`));
  usedPermits.add(`${year}-${n}`);
  return `BP-${String(year).slice(2)}-${pad(n, 4)}`;
}
const fvUsed = new Set();
function fvNo() {
  let n;
  do n = int(250, 699); while (fvUsed.has(n));
  fvUsed.add(n);
  return `FV-24-${pad(n, 4)}`;
}
const CREWS = ['Crew 1 (M. Osei)', 'Crew 2 (J. Halvorsen)', 'Crew 3 (D. Brandt)'];
function fvDate() {
  return `2024-${pad(int(3, 10), 2)}-${pad(int(1, 28), 2)}`;
}

// ---------- 1. addresses ----------
const lines = [];
for (let b = 1; b <= BLOCKS; b++) {
  const si = (b - 1) % 12;
  const street = STREETS[si];
  const blockCode = `0${400 + b}`; // 0401 .. 0424
  const blockBuilt = int(1938, 1968);
  for (let l = 1; l <= LOTS; l++) {
    const seq = lines.length + 1;
    const number = STREET_START[si] + (b > 12 ? 60 : 0) + (l - 1) * 2;
    lines.push({
      id: `NG-${pad(seq, 4)}`,
      seq,
      block: blockCode,
      street,
      address: `${number} ${street}`,
      number,
      parcelId: `NG-${blockCode}-${pad(l, 3)}`,
      builtYear: clamp(blockBuilt + int(-2, 2), 1938, 1971),
      status: seq <= COMPLETED ? 'proposed' : 'queued',
    });
  }
}

// ---------- 2. proposal plan (utility side) ----------
// [count, key, class, material, confidence, method]
const PLAN = [
  [26, 'tap_linked', 'GRR', 'Galvanized iron', 'high', 'direct'],
  [2, 'tap_unlinked_grr', 'GRR', 'Galvanized iron', 'high', 'direct'],
  [9, 'neighbor_grr', 'GRR', 'Galvanized iron', 'high', 'neighbor'],
  [15, 'tap_lead', 'LEAD', 'Lead', 'high', 'direct'],
  [4, 'tap_lead_partial', 'LEAD', 'Lead', 'medium', 'direct'],
  [3, 'neighbor_lead', 'LEAD', 'Lead', 'medium', 'neighbor'],
  [27, 'tap_plastic', 'NON_LEAD', 'Polyethylene (PE)', 'high', 'direct'],
  [14, 'neighbor_plastic', 'NON_LEAD', 'Polyethylene (PE)', 'medium', 'neighbor'],
  [72, 'tap_copper', 'NON_LEAD', 'Copper', 'high', 'direct'],
  [15, 'permit_copper_stated', 'NON_LEAD', 'Copper', 'high', 'permit'],
  [22, 'permit_copper_unstated', 'NON_LEAD', 'Copper', 'medium', 'permit'],
  [16, 'neighbor_copper', 'NON_LEAD', 'Copper', 'medium', 'neighbor'],
  [13, 'permit_copper_unstated', 'NON_LEAD', 'Copper', 'low', 'permit'],
  [22, 'tap_galv', 'NON_LEAD', 'Galvanized iron', 'high', 'direct'],
  [26, 'neighbor_galv', 'NON_LEAD', 'Galvanized iron', 'medium', 'neighbor'],
  [10, 'neighbor_galv', 'NON_LEAD', 'Galvanized iron', 'low', 'neighbor'],
  [12, 'tap_illegible', 'UNKNOWN', 'Unknown', 'low', 'direct'],
  [40, 'neighbor_mixed_galv', 'UNKNOWN', 'Unknown (leaning galvanized)', 'medium', 'neighbor'],
  [16, 'permit_nomat', 'UNKNOWN', 'Unknown', 'medium', 'permit'],
  [30, 'neighbor_mixed_cu', 'UNKNOWN', 'Unknown (leaning copper)', 'low', 'neighbor'],
  [16, 'permit_nomat', 'UNKNOWN', 'Unknown', 'low', 'permit'],
];
let specs = [];
for (const [n, key, cls, material, confidence, method] of PLAN) {
  for (let i = 0; i < n; i++) specs.push({ key, cls, material, confidence, method, fv: null });
}
if (specs.length !== COMPLETED) throw new Error(`plan has ${specs.length}, expected ${COMPLETED}`);
specs = shuffle(specs);

// Assign plan rows to the first 410 lines in block order.
const proposed = lines.slice(0, COMPLETED);
proposed.forEach((line, i) => (line.spec = specs[i]));

// ---------- 3. 2024 field verifications ----------
// 12 contradictions: copper proposals (mostly from a permit that does not state
// material) that a 2024 excavation found otherwise.
const pickFrom = (pred, n) => shuffle(specs.filter((s) => !s.fv && pred(s))).slice(0, n);
const conflictSpecs = [
  ...pickFrom((s) => s.key === 'permit_copper_unstated' && s.confidence === 'medium', 9),
  ...pickFrom((s) => s.key === 'permit_copper_unstated' && s.confidence === 'low', 1),
  ...pickFrom((s) => s.key === 'neighbor_copper', 2),
];
if (conflictSpecs.length !== 12) throw new Error('conflict selection failed');
const conflictResults = shuffle(['GRR', 'GRR', 'GRR', 'GRR', 'GRR', 'GRR', 'GRR', 'GAL', 'GAL', 'GAL', 'LEAD', 'LEAD']);
conflictSpecs.forEach((s, i) => {
  s.fv = { result: conflictResults[i], conflict: true };
});
// 22 agreeing field verifications on direct, high-confidence records.
const agreeSpecs = shuffle(
  specs.filter((s) => !s.fv && s.confidence === 'high' && s.method === 'direct'),
).slice(0, 22);
agreeSpecs.forEach((s) => (s.fv = { result: null, conflict: false }));

function fvFor(spec) {
  const pool = {
    GRR: { material: 'Galvanized iron', cls: 'GRR', text: 'Curb-stop excavation: galvanized iron; lead goose-neck at main end visible.' },
    GAL: { material: 'Galvanized iron', cls: 'NON_LEAD', text: 'Curb-stop excavation: galvanized iron; no lead connection found at main or meter.' },
    LEAD: { material: 'Lead', cls: 'LEAD', text: 'Curb-stop excavation: lead pipe; full run to main observed.' },
  };
  if (spec.fv.conflict) {
    return { ...pool[spec.fv.result], ref: fvNo(), date: fvDate(), crew: pick(CREWS) };
  }
  // Agreeing verification: mirror the proposal.
  const txt =
    spec.cls === 'GRR'
      ? pool.GRR.text
      : spec.cls === 'LEAD'
        ? pool.LEAD.text
        : spec.material === 'Copper'
          ? 'Curb-stop excavation: copper run observed from curb stop to meter.'
          : spec.material.startsWith('Polyethylene')
            ? 'Curb-stop excavation: polyethylene service observed.'
            : pool.GAL.text;
  return { material: spec.material, cls: spec.cls, text: txt, ref: fvNo(), date: fvDate(), crew: pick(CREWS) };
}

// ---------- 4. utility side builders ----------
function neighborRef(line, offset) {
  return `${line.number + offset} ${line.street}`;
}
function tapYear(line, lo) {
  return int(Math.max(line.builtYear, lo), 1971);
}

function buildUtility(spec, line) {
  const L = line;
  const out = { material: spec.material, cls: spec.cls, method: spec.method, sources: [], reasoning: '', install: null };
  const tap = (text, year, extra = {}) => {
    const n = tapNo();
    return { kind: 'tap_card', ref: `Tap card #N-${n}`, date: String(year), text, ...extra };
  };
  const nb = (offset, what, year) => ({
    kind: 'neighbor_record',
    ref: `${neighborRef(L, offset)} · tap card #N-${tapNo()} (${year})`,
    date: String(year),
    text: what,
  });

  switch (spec.key) {
    case 'tap_linked': {
      const y = tapYear(L, 1945);
      out.sources.push(tap(pick([
        'handwritten: 3/4 in. galvanized iron; lead goose-neck at main end',
        'handwritten: 3/4 in. galv. iron, lead goose-neck at tap',
        'typed: 3/4 in. galvanized iron run; lead goose-neck at main',
      ]), y, { documentsLeadLink: true }));
      out.install = { year: y, basis: 'tap' };
      out.reasoning =
        'Tap card records galvanized iron with a lead goose-neck at the main end. The galvanized run is downstream of a documented lead connection, which meets the GRR definition (§3.2).';
      break;
    }
    case 'tap_unlinked_grr': {
      const y = tapYear(L, 1945);
      out.sources.push(tap('typed: 1 in. galvanized iron, curb to meter', y));
      out.install = { year: y, basis: 'tap' };
      out.reasoning =
        'Tap card records 1 in. galvanized iron. No lead connection is recorded, but galvanized services in this block were generally on the replacement list, so GRR is proposed.';
      break;
    }
    case 'neighbor_grr': {
      const y1 = int(1950, 1958);
      const y2 = int(1950, 1958);
      out.sources.push(nb(-2, 'typed: 1 in. galvanized iron, curb to meter', y1));
      out.sources.push(nb(2, 'typed: 1 in. galvanized iron, curb to meter', y2));
      out.install = { year: L.builtYear, basis: 'assumed' };
      out.reasoning =
        'No tap card or field verification for this line. The services on either side are galvanized iron on the same main, so this line is inferred as galvanized and downstream of the same lead main. Proposed as GRR at high confidence.';
      break;
    }
    case 'tap_lead': {
      const y = tapYear(L, 1945);
      out.sources.push(tap('handwritten: 3/4 in. lead goose-neck', y, { documentsLeadLink: true }));
      out.install = { year: y, basis: 'tap' };
      out.reasoning = 'Tap card states lead goose-neck at the service. Direct record governs (§4.1), so lead is proposed.';
      break;
    }
    case 'tap_lead_partial': {
      const y = tapYear(L, 1945);
      out.sources.push(tap('handwritten, partly illegible: 3/4 in. ____ goose-neck (material word smudged)', y));
      out.install = { year: y, basis: 'tap' };
      out.reasoning =
        'Card is partly illegible. The legible entries show a goose-neck at the service and the material word is smudged. Lead is proposed at medium confidence pending confirmation.';
      break;
    }
    case 'neighbor_lead': {
      const y = int(1948, 1962);
      out.sources.push({
        kind: 'neighbor_record',
        ref: `${neighborRef(L, 2)} · FV-24-${pad(int(250, 699), 4)}`,
        date: String(y),
        text: 'curb stop: lead goose-neck observed at field verification',
      });
      out.install = { year: L.builtYear, basis: 'assumed' };
      out.reasoning =
        'No direct record for this line. The adjacent field-verified service on the same main has a lead goose-neck at the curb stop. Neighbor inference is capped at medium confidence (§4.4).';
      break;
    }
    case 'tap_plastic': {
      const y = tapYear(L, 1962);
      out.sources.push(tap('typed: 1 in. polyethylene (PE) service, curb to meter', y));
      out.install = { year: y, basis: 'tap' };
      out.reasoning = `Tap card records polyethylene service installed in ${y}. Direct record; non-lead.`;
      break;
    }
    case 'neighbor_plastic': {
      const y1 = int(1964, 1970);
      const y2 = int(1964, 1970);
      out.sources.push(nb(-4, 'typed: 1 in. polyethylene service', y1));
      out.sources.push(nb(4, 'typed: 1 in. polyethylene service', y2));
      out.install = { year: Math.max(L.builtYear, y1), basis: 'assumed' };
      out.reasoning =
        'No direct record for this line. Two neighboring tap cards from the same period show polyethylene service, so polyethylene is proposed at medium confidence.';
      break;
    }
    case 'tap_copper': {
      const y = tapYear(L, 1945);
      out.sources.push(tap('typed: 3/4 in. copper, curb to meter', y));
      out.install = { year: y, basis: 'tap' };
      out.reasoning = 'Tap card records 3/4 in. copper from the curb stop to the meter. Direct record; non-lead.';
      break;
    }
    case 'permit_copper_stated': {
      const y = yr(Math.max(L.builtYear + 1, 1955), 1971);
      const bp = permitNo(y);
      out.sources.push({
        kind: 'permit',
        ref: bp,
        date: String(y),
        text: `new 3/4 in. copper service, main tap at ${L.street}`,
        statesMaterial: true,
      });
      out.install = { year: y, basis: `Permit ${bp} (new service)` };
      out.reasoning = 'Permit names copper as the service material. A permit that states the material is a direct record (§4.3), so copper is proposed.';
      break;
    }
    case 'permit_copper_unstated': {
      const y = L.forcedYear ?? yr(Math.max(L.builtYear + 1, 1955), 1966);
      const bp = L.forcedPermit ? L.forcedPermit : permitNo(y);
      out.sources.push({
        kind: 'permit',
        ref: bp,
        date: String(y),
        text: 'water service renewed, material not stated',
        statesMaterial: false,
      });
      out.install = { year: y, basis: `Permit ${bp} (renewal)` };
      out.reasoning =
        spec.confidence === 'low'
          ? `Permit shows work at the service in ${y} but names no material. Copper is proposed on period practice; low confidence.`
          : pick([
              `Permit records a service renewal in ${y}. Service renewals of that period were typically copper, so copper is proposed.`,
              `Permit ${bp} (${y}) renewed the water service. The renewal is treated as copper, consistent with the zone's post-war replacements.`,
              `Renewal permit from ${y}. Material is not stated on the permit, but copper is the standard for that period, so copper is proposed.`,
            ]);
      break;
    }
    case 'neighbor_copper': {
      const y1 = int(1948, 1960);
      const y2 = int(1948, 1960);
      out.sources.push(nb(-2, 'typed: 3/4 in. copper', y1));
      out.sources.push(nb(2, 'typed: 3/4 in. copper', y2));
      out.install = { year: L.builtYear, basis: 'assumed' };
      out.reasoning =
        'No direct record for this line. Neighboring tap cards on this block show 3/4 in. copper, so copper is inferred at medium confidence.';
      break;
    }
    case 'tap_galv': {
      const y = tapYear(L, 1945);
      out.sources.push(tap('handwritten: 1 in. galvanized iron, curb to meter', y));
      out.install = { year: y, basis: 'tap' };
      out.reasoning =
        'Tap card records galvanized iron with no lead connection noted. Under §3.2 that is galvanized without a lead link, so it is non-lead rather than GRR. Non-lead is proposed.';
      break;
    }
    case 'neighbor_galv': {
      const y1 = int(1950, 1962);
      const y2 = int(1950, 1962);
      out.sources.push(nb(-2, 'typed: 3/4 in. galvanized iron', y1));
      if (spec.confidence === 'medium') out.sources.push(nb(2, 'typed: 3/4 in. galvanized iron', y2));
      out.install = { year: L.builtYear, basis: 'assumed' };
      out.reasoning =
        spec.confidence === 'medium'
          ? 'No direct record. Adjacent services are galvanized iron, so this line is inferred as galvanized, non-lead, at medium confidence.'
          : 'Only one nearby record, galvanized iron. Inferred as galvanized, non-lead, at low confidence.';
      break;
    }
    case 'tap_illegible': {
      const y = tapYear(L, 1945);
      out.sources.push(tap('handwritten: 3/4 in. service; material field illegible', y));
      out.install = { year: y, basis: 'tap' };
      out.reasoning =
        'Service size is legible but the material entry is illegible. Nothing on the card identifies the material, so Unknown is proposed.';
      break;
    }
    case 'neighbor_mixed_galv':
    case 'neighbor_mixed_cu': {
      const lean = spec.key === 'neighbor_mixed_galv' ? 'galvanized' : 'copper';
      const y1 = int(1950, 1962);
      const y2 = int(1950, 1962);
      out.sources.push(nb(-2, lean === 'galvanized' ? 'typed: 3/4 in. galvanized iron' : 'typed: 3/4 in. copper', y1));
      out.sources.push(nb(2, lean === 'galvanized' ? 'typed: 1 in. copper' : 'typed: 1 in. galvanized iron', y2));
      out.install = { year: L.builtYear, basis: 'assumed' };
      out.reasoning = `No legible direct record. Neighboring services on this main are mixed (galvanized and copper), leaning ${lean}. Insufficient for a classification; Unknown is proposed.`;
      break;
    }
    case 'permit_nomat': {
      const y = yr(Math.max(L.builtYear + 1, 1955), 1968);
      const bp = permitNo(y);
      out.sources.push({
        kind: 'permit',
        ref: bp,
        date: String(y),
        text: 'service excavation at curb, material not stated',
        statesMaterial: false,
      });
      out.install = { year: y, basis: `Permit ${bp} (excavation)` };
      out.reasoning = `Permit supports excavation at the service in ${y} but names no material. The permit is used for the date only. Unknown is proposed.`;
      break;
    }
    default:
      throw new Error(`unknown key ${spec.key}`);
  }
  return out;
}

// ---------- 5. customer side ----------
function buildCustomer(line) {
  const r = rand();
  if (r < 0.6) {
    return {
      material: 'Unknown',
      cls: 'UNKNOWN',
      method: 'none',
      sources: [],
      reasoning: 'No customer-side record for this parcel. The customer side is not inferred from neighboring lines (§3.4). Unknown.',
    };
  }
  if (r < 0.8) {
    const y = int(1962, 1971);
    const bp = permitNo(y);
    return {
      material: 'Copper',
      cls: 'NON_LEAD',
      method: 'permit',
      sources: [{ kind: 'permit', ref: bp, date: String(y), text: 'customer plumbing repair, 3/4 in. copper, meter to house', statesMaterial: true }],
      reasoning: `Customer plumbing permit from ${y} names copper for the meter-to-house run. Customer side is copper.`,
    };
  }
  if (r < 0.88) {
    const y = int(1958, 1966);
    const bp = permitNo(y);
    return {
      material: 'Galvanized iron',
      cls: 'NON_LEAD',
      method: 'permit',
      sources: [{ kind: 'permit', ref: bp, date: String(y), text: 'customer line replaced, galvanized iron stated', statesMaterial: true }],
      reasoning: 'Customer line replacement permit names galvanized iron. Customer side is galvanized, not requiring replacement.',
    };
  }
  const fv = `FV-24-${pad(int(250, 699), 4)}`;
  return {
    material: 'Copper',
    cls: 'NON_LEAD',
    method: 'direct',
    sources: [{ kind: 'field_verification', ref: fv, date: fvDate(), text: 'meter-side excavation: copper observed' }],
    reasoning: 'Field verification at the meter observed copper. Direct observation governs (§4.5).',
  };
}

// ---------- 6. assemble ----------
// Two lines carry specific details from the working snapshot so the first view matches it:
//  - the first high-confidence lead tap card is Tap card #N-4417 (1951)
//  - a medium-confidence copper proposal from a 1962 renewal permit that states no material (BP-62-0893)
//    and is contradicted by the 2024 field verification.
let forcedLeadDone = false;
let forcedPermitDone = false;
for (const line of proposed) {
  const spec = line.spec;
  if (!forcedLeadDone && spec.key === 'tap_lead' && spec.confidence === 'high') {
    line.builtYear = int(1938, 1948);
    line.forcedTap = true;
    forcedLeadDone = true;
  }
  if (!forcedPermitDone && spec.key === 'permit_copper_unstated' && spec.fv?.conflict && spec.confidence === 'medium') {
    line.builtYear = int(1938, 1950);
    line.forcedPermit = 'BP-62-0893';
    line.forcedYear = 1962;
    forcedPermitDone = true;
  }
}

for (const line of proposed) {
  const spec = line.spec;
  const util = buildUtility(spec, line);
  if (line.forcedTap) {
    util.sources = [{
      kind: 'tap_card',
      ref: 'Tap card #N-4417',
      date: '1951',
      text: 'handwritten: 3/4 in. lead goose-neck',
      documentsLeadLink: true,
    }];
    util.install = { year: 1951, basis: 'tap' };
  }
  if (line.forcedPermit) {
    util.sources = [{
      kind: 'permit',
      ref: 'Permit BP-62-0893',
      date: '1962',
      text: 'water service renewed, material not stated',
      statesMaterial: false,
    }];
    util.install = { year: 1962, basis: 'Permit BP-62-0893 (renewal)' };
    util.reasoning =
      'Permit BP-62-0893 records a service renewal in 1962. Service renewals of that period were typically copper, so copper is proposed.';
  }

  const install = util.install;
  const { install: _ignored, ...utility } = util;
  const record = {
    id: line.id,
    seq: line.seq,
    block: line.block,
    street: line.street,
    address: line.address,
    parcelId: line.parcelId,
    builtYear: line.builtYear,
    installYear: install.year,
    installBasis: install.basis === 'assumed' ? 'Assumed from build year (no install record)' : install.basis === 'tap' ? utility.sources[0].ref + ` (${install.year})` : install.basis,
    status: 'proposed',
    confidence: spec.confidence,
    utility: { ...utility, method: spec.method },
    customer: buildCustomer(line),
  };
  if (spec.fv) record.fv2024 = fvFor(spec);
  line.record = record;
}

// Customer-side lead on three non-conflicting lines, from 2024 meter-side field checks.
const leadCustomer = shuffle(proposed.filter((l) => !l.spec.fv?.conflict && l.spec.key !== 'tap_lead')).slice(0, 3);
for (const line of leadCustomer) {
  const fv = `FV-24-${pad(int(250, 699), 4)}`;
  line.record.customer = {
    material: 'Lead (pigtail)',
    cls: 'LEAD',
    method: 'direct',
    sources: [{ kind: 'field_verification', ref: fv, date: fvDate(), text: 'meter-side pothole: lead pigtail present, 1/2 in.' }],
    reasoning: '2024 field verification at the meter found a lead pigtail. Direct observation governs (§4.5), so the customer side is lead.',
  };
}

// Seed decisions: a first pass of high-confidence direct-record proposals already accepted by the reviewer.
const seedDecisions = {};
const eligible = proposed.filter((l) => {
  const u = l.record.utility;
  return u.method === 'direct' && l.record.confidence === 'high' && u.cls !== 'GRR' && !l.spec.fv?.conflict && !leadCustomer.includes(l);
});
const ACCEPT_COUNT = 58;
eligible.slice(0, ACCEPT_COUNT).forEach((l, i) => {
  const day = 9 + Math.floor(i / 20);
  const hh = pad(8 + (i % 9), 2);
  const mm = pad((i * 7) % 60, 2);
  seedDecisions[l.id] = {
    status: 'accepted',
    by: 'LF',
    at: `2026-11-${pad(day, 2)}T${hh}:${mm}:00-08:00`,
  };
});

// Queued lines are addresses only, awaiting the next run.
const outLines = lines.map((l) =>
  l.status === 'proposed'
    ? l.record
    : {
        id: l.id,
        seq: l.seq,
        block: l.block,
        street: l.street,
        address: l.address,
        parcelId: l.parcelId,
        builtYear: l.builtYear,
        installYear: null,
        installBasis: null,
        status: 'queued',
      },
);

const file = {
  meta: {
    batchId: 'NG-2026-03',
    zone: 'Northgate pressure zone',
    utility: 'Calder Falls Public Utilities · Water Distribution Division',
    purpose: 'Annual lead service line inventory update',
    dueDate: '2026-12-15',
    asOf: '2026-11-16',
    builtRange: [1938, 1971],
    totalLines: lines.length,
    runLabel: 'Run 3 · paused at 410 of 600',
    lastRunAt: '2026-11-14T17:42:00-08:00',
    citywideSyncedAt: '2026-11-14T06:00:00-08:00',
  },
  lines: outLines,
  seedDecisions,
};

writeFileSync(OUT, JSON.stringify(file));

// ---------- self-check summary ----------
const done = outLines.filter((l) => l.status === 'proposed');
const count = (fn) => done.filter(fn).length;
const summary = {
  total: outLines.length,
  proposed: done.length,
  queued: outLines.length - done.length,
  high: count((l) => l.confidence === 'high'),
  medium: count((l) => l.confidence === 'medium'),
  low: count((l) => l.confidence === 'low'),
  grr: count((l) => l.utility.cls === 'GRR'),
  grrUnlinked: count((l) => l.utility.cls === 'GRR' && !l.utility.sources.some((s) => s.documentsLeadLink)),
  fvConflicts: count((l) => l.fv2024 && (l.fv2024.cls !== l.utility.cls || l.fv2024.material !== l.utility.material)),
  permitNotStatedNonUnknown: count((l) => l.utility.method === 'permit' && l.utility.cls !== 'UNKNOWN' && l.utility.sources.some((s) => s.statesMaterial === false)),
  neighborHigh: count((l) => l.utility.method === 'neighbor' && l.confidence === 'high'),
  methods: { direct: count((l) => l.utility.method === 'direct'), permit: count((l) => l.utility.method === 'permit'), neighbor: count((l) => l.utility.method === 'neighbor') },
  customerLead: count((l) => l.customer.cls === 'LEAD'),
  seedAccepted: Object.keys(seedDecisions).length,
};
console.log(JSON.stringify(summary, null, 2));
