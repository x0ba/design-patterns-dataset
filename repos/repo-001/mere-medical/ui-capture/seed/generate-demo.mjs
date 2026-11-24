// Extends the repo's own demo dump (apps/web/src/assets/demo.json) with ~3.5 years of
// recent records for the same patient, and writes it to <out>/assets/demo.json.
// The app's demo mode loads that file through its own import path
// (handleJSONDataImport -> RxDB importJSON), so nothing is hardcoded into UI code.
//
// usage: node generate-demo.mjs <repoRoot> <outFile>
import fs from 'node:fs';
import path from 'node:path';

const [repoRoot, outFile] = process.argv.slice(2);
const dump = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'apps/web/src/assets/demo.json'), 'utf8'),
);
const col = (n) => dump.collections.find((c) => c.name === n);
const USER = col('user_documents').docs[0].id;

// deterministic PRNG
let seed = 20261116;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const jitter = (v, pct) => v * (1 + (rnd() * 2 - 1) * pct);
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const idChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const epicId = () => 'T' + Array.from({ length: 40 }, () => pick(idChars)).join('') + 'B';
const numId = () => String(Math.floor(10000000 + rnd() * 89999999));

const CONN = {
  lowland: { id: 'a25cd905-d981-496b-ab08-ff1fd78b3ca8', kind: 'epic', patient: 'TEA538R9Oalv4iCf581QobYR3Le1v8.Gk.AJpfnwryEMB' },
  highlands: { id: '3993ce6f-d2d6-4526-840d-4753b7207c88', kind: 'epic', patient: 'TU7Ww-u45MuFg3rfCUJulShScNajzRO7B74I-03agGsIB' },
  hopedale: { id: 'e3936774-a661-4be0-8172-912ef5f758b7', kind: 'epic', patient: 'Tq8vN2mXbH1kRzP0aL7wYcE4dGfJ5sU9oI3tK6nM' },
  oakvalley: { id: '9a00c884-153c-4cc9-aedd-1ef3dd8b6610', kind: 'cerner', base: 'https://fhir-myrecord.cerner.com/dstu2/ec2458f2-1e24-41c8-b71b-0e701af7583d', patient: '12724066' },
  blessings: { id: '0f38582a-1773-4e2b-80e3-90fda727cdbd', kind: 'onpatient', patient: '1850092' },
};
const EPIC = 'https://fhir.epic.com/interconnect-fhir-oauth/FHIR/DSTU2';

const out = [];
function add(conn, type, resource, date, display, loinc) {
  const c = CONN[conn];
  let fullUrl, metaId, raw;
  if (c.kind === 'epic') {
    resource.id = resource.id || epicId();
    fullUrl = `${EPIC}/${type}/${resource.id}`;
    metaId = fullUrl;
    raw = { link: [{ relation: 'self', url: fullUrl }], fullUrl, resource, search: { mode: 'match' } };
  } else if (c.kind === 'cerner') {
    resource.id = resource.id || numId();
    fullUrl = `${c.base}/${type}/${resource.id}`;
    metaId = fullUrl;
    raw = { fullUrl, resource, search: { mode: 'match' } };
  } else {
    resource.id = resource.id || numId();
    metaId = `${type}/${resource.id}`;
    raw = { resource, fullUrl: [`/api/fhir/${type}/${resource.id}`] };
  }
  resource.resourceType = type;
  const doc = {
    id: `${c.id}|${USER}|${metaId}`,
    user_id: USER,
    connection_record_id: c.id,
    data_record: { raw, format: 'FHIR.DSTU2', content_type: 'application/json', resource_type: type.toLowerCase(), version_history: [] },
    metadata: { id: metaId, date, ...(display ? { display_name: display } : {}), ...(loinc ? { loinc_coding: [loinc] } : {}) },
    _meta: { lwt: Date.parse(date) + 86400000 * 2 },
    _deleted: false,
  };
  out.push(doc);
  return { doc, fullUrl, metaId };
}
const subj = (conn) => {
  const c = CONN[conn];
  if (c.kind === 'epic') return { display: 'Smith, John', reference: `${EPIC}/Patient/${c.patient}` };
  if (c.kind === 'cerner') return { display: 'SMITH, JOHN', reference: `Patient/${c.patient}` };
  return { reference: `Patient/${c.patient}` };
};
const iso = (d, hh = 9, mm = 0) => new Date(`${d}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00-05:00`).toISOString();

// ---------------- Labs ----------------
const q = (value, unit) => ({ value, unit, system: 'http://unitsofmeasure.org', code: unit });
const LABS = {
  GLU: ['2345-7', 'Glucose [Mass/volume] in Serum or Plasma', 'GLUCOSE', 'mg/dL', 70, 99, 0],
  BUN: ['3094-0', 'Urea nitrogen [Mass/volume] in Serum or Plasma', 'BLOOD UREA NITROGEN', 'mg/dL', 7, 20, 0],
  CRE: ['2160-0', 'Creatinine [Mass/volume] in Serum or Plasma', 'CREATININE', 'mg/dL', 0.67, 1.31, 2],
  EGFR: ['33914-3', 'Glomerular filtration rate/1.73 sq M.predicted', 'EGFR (CKD-EPI 2021)', 'mL/min/1.73m2', 60, null, 0],
  NA: ['2951-2', 'Sodium [Moles/volume] in Serum or Plasma', 'SODIUM', 'mmol/L', 136, 145, 0],
  K: ['2823-3', 'Potassium [Moles/volume] in Serum or Plasma', 'POTASSIUM', 'mmol/L', 3.5, 5.1, 1],
  CL: ['2075-0', 'Chloride [Moles/volume] in Serum or Plasma', 'CHLORIDE', 'mmol/L', 98, 107, 0],
  CO2: ['2028-9', 'Carbon dioxide, total [Moles/volume] in Serum or Plasma', 'CARBON DIOXIDE', 'mmol/L', 22, 29, 0],
  CA: ['17861-6', 'Calcium [Mass/volume] in Serum or Plasma', 'CALCIUM', 'mg/dL', 8.6, 10.3, 1],
  TP: ['2885-2', 'Protein [Mass/volume] in Serum or Plasma', 'PROTEIN, TOTAL', 'g/dL', 6.0, 8.3, 1],
  ALB: ['1751-7', 'Albumin [Mass/volume] in Serum or Plasma', 'ALBUMIN', 'g/dL', 3.5, 5.0, 1],
  TBIL: ['1975-2', 'Bilirubin.total [Mass/volume] in Serum or Plasma', 'BILIRUBIN, TOTAL', 'mg/dL', 0.1, 1.2, 1],
  ALP: ['6768-6', 'Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma', 'ALKALINE PHOSPHATASE', 'U/L', 40, 129, 0],
  AST: ['1920-8', 'Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma', 'AST (SGOT)', 'U/L', 10, 40, 0],
  ALT: ['1742-6', 'Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma', 'ALT (SGPT)', 'U/L', 7, 56, 0],
  CHOL: ['2093-3', 'Cholesterol [Mass/volume] in Serum or Plasma', 'CHOLESTEROL, TOTAL', 'mg/dL', null, 200, 0],
  TRIG: ['2571-8', 'Triglyceride [Mass/volume] in Serum or Plasma', 'TRIGLYCERIDES', 'mg/dL', null, 150, 0],
  HDL: ['2085-9', 'Cholesterol in HDL [Mass/volume] in Serum or Plasma', 'HDL CHOLESTEROL', 'mg/dL', 40, null, 0],
  LDL: ['13457-7', 'Cholesterol in LDL [Mass/volume] in Serum or Plasma by calculation', 'LDL CHOLESTEROL (CALC)', 'mg/dL', null, 100, 0],
  NHDL: ['43396-1', 'Cholesterol non HDL [Mass/volume] in Serum or Plasma', 'NON-HDL CHOLESTEROL', 'mg/dL', null, 130, 0],
  A1C: ['4548-4', 'Hemoglobin A1c/Hemoglobin.total in Blood', 'HEMOGLOBIN A1C', '%', 4.0, 5.6, 1],
  EAG: ['27353-2', 'Glucose mean value [Mass/volume] in Blood Estimated from glycated hemoglobin', 'ESTIMATED AVERAGE GLUCOSE', 'mg/dL', null, null, 0],
  WBC: ['6690-2', 'Leukocytes [#/volume] in Blood by Automated count', 'WBC', '10*3/uL', 4.0, 11.0, 1],
  RBC: ['789-8', 'Erythrocytes [#/volume] in Blood by Automated count', 'RBC', '10*6/uL', 4.5, 5.9, 2],
  HGB: ['718-7', 'Hemoglobin [Mass/volume] in Blood', 'HEMOGLOBIN', 'g/dL', 13.5, 17.5, 1],
  HCT: ['4544-3', 'Hematocrit [Volume Fraction] of Blood by Automated count', 'HEMATOCRIT', '%', 41, 53, 1],
  MCV: ['787-2', 'MCV [Entitic volume] by Automated count', 'MCV', 'fL', 80, 100, 0],
  PLT: ['777-3', 'Platelets [#/volume] in Blood by Automated count', 'PLATELET COUNT', '10*3/uL', 150, 400, 0],
  TSH: ['3016-3', 'Thyrotropin [Units/volume] in Serum or Plasma', 'TSH', 'mIU/L', 0.4, 4.0, 2],
  VITD: ['1989-3', '25-hydroxyvitamin D3 [Mass/volume] in Serum or Plasma', 'VITAMIN D, 25-HYDROXY', 'ng/mL', 30, 100, 0],
  UACR: ['9318-7', 'Albumin/Creatinine [Mass Ratio] in Urine', 'MICROALBUMIN/CREATININE RATIO, URINE', 'mg/g', null, 30, 0],
  PSA: ['2857-1', 'Prostate specific Ag [Mass/volume] in Serum or Plasma', 'PSA, TOTAL', 'ng/mL', null, 4.0, 2],
};
const PANELS = {
  CMP: ['COMPREHENSIVE METABOLIC PANEL', ['GLU', 'BUN', 'CRE', 'EGFR', 'NA', 'K', 'CL', 'CO2', 'CA', 'TP', 'ALB', 'TBIL', 'ALP', 'AST', 'ALT']],
  BMP: ['BASIC METABOLIC PANEL', ['GLU', 'BUN', 'CRE', 'EGFR', 'NA', 'K', 'CL', 'CO2', 'CA']],
  LIPID: ['LIPID PANEL', ['CHOL', 'TRIG', 'HDL', 'LDL', 'NHDL']],
  A1C: ['HEMOGLOBIN A1C', ['A1C', 'EAG']],
  CBC: ['CBC W/O DIFFERENTIAL', ['WBC', 'RBC', 'HGB', 'HCT', 'MCV', 'PLT']],
  TSH: ['TSH', ['TSH']],
  VITD: ['VITAMIN D 25 HYDROXY', ['VITD']],
  UACR: ['MICROALBUMIN/CREATININE RATIO, RANDOM URINE', ['UACR']],
  PSA: ['PSA, SCREENING', ['PSA']],
};
const BASE = { BUN: 15, CRE: 1.02, EGFR: 92, NA: 140, K: 4.3, CL: 103, CO2: 25, CA: 9.5, TP: 7.1, ALB: 4.4, TBIL: 0.7, ALP: 74, AST: 24, ALT: 33, WBC: 6.8, RBC: 5.1, HGB: 15.2, HCT: 45, MCV: 89, PLT: 248, TSH: 1.9, HDL: 41, TRIG: 168, PSA: 0.82, UACR: 11 };

function labPanel(conn, date, panel, overrides, performer, note) {
  const [panelName, keys] = PANELS[panel];
  const when = iso(date, 7, 40 + Math.floor(rnd() * 15));
  const issued = new Date(Date.parse(when) + (3 + rnd() * 20) * 3600000).toISOString();
  const results = [];
  for (const k of keys) {
    const [loinc, ldisp, name, unit, lo, hi, dp] = LABS[k];
    let v = overrides[k] ?? (BASE[k] !== undefined ? jitter(BASE[k], 0.06) : null);
    if (v === null) continue;
    v = round(v, dp);
    const range = {};
    if (lo !== null) range.low = q(lo, unit);
    if (hi !== null) range.high = q(hi, unit);
    range.text = lo !== null && hi !== null ? `${lo} - ${hi} ${unit}` : lo !== null ? `>=${lo} ${unit}` : hi !== null ? `<${hi} ${unit}` : 'Not Estab.';
    const res = {
      status: 'final',
      category: { coding: [{ system: 'http://hl7.org/fhir/observation-category', code: 'laboratory', display: 'Laboratory' }], text: 'Laboratory' },
      code: { coding: [{ system: 'http://loinc.org', code: loinc, display: ldisp }], text: name },
      subject: subj(conn),
      effectiveDateTime: when,
      issued,
      valueQuantity: q(v, unit),
      referenceRange: [range],
    };
    if ((hi !== null && v > hi) || (lo !== null && v < lo)) {
      const h = hi !== null && v > hi;
      res.interpretation = { coding: [{ system: 'http://hl7.org/fhir/v2/0078', code: h ? 'H' : 'L', display: h ? 'High' : 'Low' }], text: h ? 'High' : 'Low' };
    }
    if (k === 'EGFR') res.comments = 'eGFR calculated using the 2021 CKD-EPI creatinine equation, which does not use a race coefficient.';
    const r = add(conn, 'Observation', res, when, name, loinc);
    results.push({ display: `Component: ${name}`, reference: r.fullUrl });
  }
  const dr = {
    identifier: [{ use: 'official', type: { text: 'Placer Identifier' }, system: 'urn:oid:1.2.840.114350.1.13.225.2.7.2.798268', value: numId() }],
    status: 'final',
    category: { coding: [{ system: 'urn:oid:1.2.840.114350.1.13.225.2.7.10.798268.30', code: 'Lab', display: 'Lab' }], text: 'Lab' },
    code: { text: `${panelName} - Final result` },
    subject: subj(conn),
    effectiveDateTime: when,
    issued,
    performer: { display: performer },
    result: results,
    ...(note ? { conclusion: note } : {}),
  };
  return add(conn, 'DiagnosticReport', dr, when, panelName);
}

// ---------------- Vitals ----------------
function vitals(conn, date, { sys, dia, hr, lb, temp }) {
  const when = iso(date, 9, 5 + Math.floor(rnd() * 40));
  const vs = { coding: [{ system: 'http://hl7.org/fhir/observation-category', code: 'vital-signs', display: 'Vital Signs' }], text: 'Vital Signs' };
  const mk = (loinc, disp, name, value, unit, extra = {}) =>
    add(conn, 'Observation', { status: 'final', category: vs, code: { coding: [{ system: 'http://loinc.org', code: loinc, display: disp }], text: name }, subject: subj(conn), effectiveDateTime: when, valueQuantity: q(value, unit), ...extra }, when, name, loinc);
  mk('8480-6', 'Systolic blood pressure', 'BP SYSTOLIC', sys, 'mm[Hg]', sys >= 130 ? { referenceRange: [{ high: q(129, 'mm[Hg]'), text: '<130 mm[Hg]' }] } : {});
  mk('8462-4', 'Diastolic blood pressure', 'BP DIASTOLIC', dia, 'mm[Hg]');
  mk('8867-4', 'Heart rate', 'PULSE', hr, '/min');
  if (lb) {
    mk('29463-7', 'Body weight', 'WEIGHT', lb, '[lb_av]');
    mk('39156-5', 'Body mass index (BMI) [Ratio]', 'BMI', round((lb * 703) / (70 * 70), 2), 'kg/m2');
  }
  if (temp) mk('8310-5', 'Body temperature', 'TEMPERATURE', temp, '[degF]');
}

// ---------------- Other resource helpers ----------------
function encounter(conn, date, { type, reason, provider, location, minutes = 30, cls = 'outpatient', hosp, hh = 9 }) {
  const start = iso(date, hh, 0);
  const end = new Date(Date.parse(start) + minutes * 60000).toISOString();
  add(conn, 'Encounter', {
    status: 'finished',
    class: cls,
    type: [{ coding: [{ system: 'urn:oid:1.2.840.114350.1.13.225.2.7.10.698084.30', code: String(Math.floor(rnd() * 200)), display: type }], text: type }],
    patient: subj(conn),
    participant: [{ type: [{ coding: [{ system: 'http://hl7.org/fhir/v3/ParticipationType', code: 'ATND', display: 'attender' }], text: 'attender' }], individual: { display: provider } }],
    period: { start, end },
    length: { value: minutes, unit: 'minutes' },
    ...(reason ? { reason: [{ text: reason }] } : {}),
    location: [{ location: { display: location } }],
    ...(hosp ? { hospitalization: hosp } : {}),
  }, start, type);
}
function condition(conn, date, text, icd, status, extra = {}) {
  add(conn, 'Condition', {
    category: { coding: [{ system: 'http://hl7.org/fhir/condition-category', code: 'diagnosis', display: 'Diagnosis' }], text: 'Diagnosis' },
    code: { text, coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: icd, display: text }] },
    patient: subj(conn),
    dateRecorded: date,
    onsetDateTime: date,
    verificationStatus: 'confirmed',
    clinicalStatus: status,
    ...extra,
  }, date, text);
}
function med(conn, date, text, rxnorm, status, dosage, prescriber, end) {
  add(conn, 'MedicationStatement', {
    status,
    dateAsserted: iso(date, 10),
    medicationCodeableConcept: { text, coding: [{ code: rxnorm, system: 'http://www.nlm.nih.gov/research/umls/rxnorm', display: text }] },
    patient: subj(conn),
    effectivePeriod: { start: date, ...(end ? { end } : {}) },
    dosage: [{ text: dosage }],
    informationSource: { display: prescriber },
  }, iso(date, 10), text);
}
function imm(conn, date, text, cvx, site, lot, mfr) {
  const when = iso(date, 11, 15);
  add(conn, 'Immunization', {
    status: 'completed', reported: false, wasNotGiven: false,
    patient: subj(conn), date: when,
    vaccineCode: { text, coding: [{ code: cvx, system: 'http://hl7.org/fhir/sid/cvx', display: text }] },
    site: { text: site, coding: [{ code: site === 'left deltoid' ? 'LD' : 'RD', system: 'http://hl7.org/fhir/v3/ActSite', display: site }] },
    route: { text: 'Injection, intramuscular', coding: [{ code: 'IM', system: 'http://hl7.org/fhir/v3/RouteOfAdministration', display: 'Injection, intramuscular' }] },
    lotNumber: lot, manufacturer: { display: mfr },
  }, when, text);
}
function procedure(conn, date, text, cpt, performer, notes) {
  const when = iso(date, 13, 30);
  add(conn, 'Procedure', {
    status: 'completed', performedDateTime: when,
    code: { text, coding: [{ code: cpt, system: 'http://www.ama-assn.org/go/cpt', display: text }] },
    subject: subj(conn),
    performer: [{ actor: { display: performer } }],
    ...(notes ? { notes: [{ text: notes }] } : {}),
  }, when, text);
}
function imaging(conn, date, name, performer, conclusion) {
  const when = iso(date, 14, 10);
  add(conn, 'DiagnosticReport', {
    status: 'final',
    category: { coding: [{ code: 'Imaging', display: 'Imaging' }], text: 'Imaging' },
    code: { text: `${name} - Final result` },
    subject: subj(conn), effectiveDateTime: when, issued: new Date(Date.parse(when) + 5400000).toISOString(),
    performer: { display: performer }, conclusion,
  }, when, name);
}

// ================= The patient's story (2023-07 .. 2026-11) =================
const PCP = 'Priya Raman, MD';
const LOW = 'Lowland Community Hospital Primary Care - Suite 210';
const A1C = { '2023-08-14': 6.1, '2024-02-12': 6.7, '2024-08-19': 7.2, '2025-02-10': 6.6, '2025-08-11': 6.3, '2026-02-09': 6.4, '2026-08-17': 6.2, '2026-11-09': 6.0 };
const LIPID = { '2023-08-14': [238, 162], '2024-02-12': [181, 104], '2024-08-19': [166, 92], '2025-08-11': [172, 97], '2026-08-17': [159, 86] };
const WEIGHT = { '2023-08-14': 221, '2023-11-20': 219, '2024-02-12': 223, '2024-05-13': 217, '2024-08-19': 214, '2024-11-18': 216, '2025-02-10': 212, '2025-05-12': 209, '2025-08-11': 205, '2025-11-17': 207, '2026-02-09': 204, '2026-05-11': 201, '2026-08-17': 199, '2026-11-09': 198 };
const BP = { '2023-08-14': [134, 86], '2023-11-20': [138, 88], '2024-02-12': [136, 84], '2024-05-13': [132, 82], '2024-08-19': [141, 90], '2024-11-18': [139, 89], '2025-02-10': [144, 92], '2025-05-12': [128, 80], '2025-08-11': [124, 78], '2025-11-17': [126, 81], '2026-02-09': [122, 76], '2026-05-11': [130, 82], '2026-08-17': [121, 77], '2026-11-09': [124, 79] };
const VISIT_REASON = {
  '2023-08-14': 'Annual physical exam',
  '2023-11-20': 'Follow-up: elevated cholesterol, discuss statin',
  '2024-02-12': 'Follow-up: prediabetes, review A1c',
  '2024-05-13': 'Diabetes follow-up; metformin GI side effects',
  '2024-08-19': 'Annual physical exam; diabetes check',
  '2024-11-18': 'Diabetes follow-up',
  '2025-02-10': 'Diabetes follow-up; elevated blood pressure readings at home',
  '2025-05-12': 'Blood pressure recheck after starting lisinopril',
  '2025-08-11': 'Annual physical exam',
  '2025-11-17': 'Diabetes follow-up',
  '2026-02-09': 'Diabetes and hypertension follow-up',
  '2026-05-11': 'Telehealth: medication review',
  '2026-08-17': 'Annual physical exam',
  '2026-11-09': 'Diabetes follow-up; pre-holiday refills',
};
for (const [date, reason] of Object.entries(VISIT_REASON)) {
  const tele = reason.startsWith('Telehealth');
  encounter('lowland', date, { type: tele ? 'Telemedicine' : 'Office Visit', reason, provider: PCP, location: tele ? 'Lowland Community Hospital Virtual Care' : LOW, minutes: tele ? 20 : reason.includes('physical') ? 40 : 25 });
  if (!tele) vitals('lowland', date, { sys: BP[date][0], dia: BP[date][1], hr: 68 + Math.floor(rnd() * 14), lb: WEIGHT[date] });
}
for (const [date, a1c] of Object.entries(A1C)) {
  labPanel('lowland', date, 'A1C', { A1C: a1c, EAG: round(28.7 * a1c - 46.7, 0) }, 'Lowland Community Hospital Laboratory');
  const glu = 88 + (a1c - 5.6) * 34 + rnd() * 10;
  labPanel('lowland', date, date.endsWith('-08-14') || date.includes('-08-1') ? 'CMP' : 'BMP', { GLU: glu, K: date >= '2025-05' ? 4.7 : undefined }, 'Lowland Community Hospital Laboratory');
  if (date >= '2024-02') labPanel('lowland', date, 'UACR', { UACR: date === '2024-08-19' ? 38 : 9 + rnd() * 14 }, 'Lowland Community Hospital Laboratory');
}
for (const [date, [chol, ldl]] of Object.entries(LIPID)) {
  const hdl = round(39 + rnd() * 6, 0), trig = round(130 + rnd() * 70, 0);
  labPanel('lowland', date, 'LIPID', { CHOL: chol, LDL: ldl, HDL: hdl, TRIG: trig, NHDL: chol - hdl }, 'Lowland Community Hospital Laboratory');
}
for (const d of ['2023-08-14', '2024-08-19', '2025-08-11', '2026-08-17']) labPanel('lowland', d, 'CBC', {}, 'Lowland Community Hospital Laboratory');
labPanel('lowland', '2023-08-14', 'TSH', {}, 'Lowland Community Hospital Laboratory');
labPanel('lowland', '2025-08-11', 'TSH', { TSH: 2.31 }, 'Lowland Community Hospital Laboratory');
labPanel('lowland', '2024-08-19', 'VITD', { VITD: 21 }, 'Lowland Community Hospital Laboratory', 'Vitamin D insufficiency. Start vitamin D3 2000 IU daily, recheck in 6 months.');
labPanel('lowland', '2025-02-10', 'VITD', { VITD: 34 }, 'Lowland Community Hospital Laboratory');
labPanel('lowland', '2026-08-17', 'VITD', { VITD: 41 }, 'Lowland Community Hospital Laboratory');
labPanel('lowland', '2026-08-17', 'PSA', { PSA: 0.94 }, 'Lowland Community Hospital Laboratory');

// Conditions
condition('lowland', '2023-08-14', 'Prediabetes', 'R73.03', 'resolved', { abatementDateTime: '2024-02-12', notes: 'Superseded by type 2 diabetes diagnosis 02/2024.' });
condition('lowland', '2023-11-20', 'Hyperlipidemia, unspecified', 'E78.5', 'active');
condition('lowland', '2024-02-12', 'Type 2 diabetes mellitus without complications', 'E11.9', 'active');
condition('lowland', '2024-08-19', 'Vitamin D deficiency, unspecified', 'E55.9', 'active');
condition('lowland', '2024-08-19', 'Microalbuminuria', 'R80.9', 'resolved', { abatementDateTime: '2024-11-18' });
condition('lowland', '2025-02-10', 'Essential (primary) hypertension', 'I10', 'active');
condition('lowland', '2023-08-14', 'Class 1 obesity with body mass index 30.0-34.9 in adult', 'E66.811', 'active');
condition('lowland', '2025-04-21', 'Allergic rhinitis due to pollen', 'J30.1', 'active');

// Medications
med('lowland', '2023-11-20', 'ATORVASTATIN 20 MG TABLET', '617312', 'active', 'Take 1 tablet (20 mg total) by mouth nightly.', PCP);
med('lowland', '2024-02-12', 'METFORMIN 500 MG TABLET', '861007', 'completed', 'Take 1 tablet (500 mg total) by mouth 2 (two) times daily with meals.', PCP, '2024-05-13');
med('lowland', '2024-05-13', 'METFORMIN ER 500 MG 24 HR TABLET', '860975', 'completed', 'Take 2 tablets (1,000 mg total) by mouth daily with evening meal. Switched to ER due to GI upset.', PCP, '2024-08-19');
med('lowland', '2024-08-19', 'METFORMIN ER 750 MG 24 HR TABLET', '860981', 'active', 'Take 2 tablets (1,500 mg total) by mouth daily with evening meal.', PCP);
med('lowland', '2024-08-19', 'CHOLECALCIFEROL (VITAMIN D3) 50 MCG (2,000 UNIT) CAPSULE', '392263', 'active', 'Take 1 capsule by mouth daily.', PCP);
med('lowland', '2025-02-10', 'LISINOPRIL 10 MG TABLET', '314076', 'active', 'Take 1 tablet (10 mg total) by mouth daily.', PCP);
med('lowland', '2025-04-21', 'FLUTICASONE PROPIONATE 50 MCG/ACTUATION NASAL SPRAY,SUSPENSION', '896188', 'active', '2 sprays in each nostril daily as needed during allergy season.', PCP);
med('lowland', '2024-02-12', 'BLOOD-GLUCOSE METER KIT', '2563179', 'active', 'Use as directed to check blood sugar once daily before breakfast.', PCP);
med('lowland', '2024-02-12', 'ONETOUCH VERIO TEST STRIPS', '2563204', 'active', 'Use to check blood glucose once daily. Dispense 100 strips.', PCP);

// Procedures at primary care
for (const d of Object.keys(A1C)) procedure('lowland', d, 'ROUTINE VENIPUNCTURE', '36415', 'Lowland Community Hospital Laboratory');
procedure('lowland', '2024-08-19', 'DIABETIC FOOT EXAM', '2028F', PCP, 'Monofilament sensation intact bilaterally. No ulcers or calluses.');
procedure('lowland', '2025-08-11', 'DIABETIC FOOT EXAM', '2028F', PCP, 'Normal. Pedal pulses 2+ bilaterally.');
procedure('lowland', '2026-08-17', 'DIABETIC FOOT EXAM', '2028F', PCP);
procedure('lowland', '2024-08-19', 'ELECTROCARDIOGRAM, ROUTINE ECG WITH AT LEAST 12 LEADS', '93000', PCP, 'Normal sinus rhythm, rate 72. No acute ST changes.');

// Eye exam at Hopedale Medical Clinic (ophthalmology + dermatology)
encounter('hopedale', '2024-06-03', { type: 'Office Visit', reason: 'Diabetic eye exam', provider: 'Marcus Oyelaran, OD', location: 'Hopedale Eye Associates', minutes: 45, hh: 14 });
procedure('hopedale', '2024-06-03', 'IMAGING OF RETINA FOR DETECTION OR MONITORING OF DISEASE', '92250', 'Marcus Oyelaran, OD', 'No diabetic retinopathy OU. Repeat in 12 months.');
encounter('hopedale', '2025-06-16', { type: 'Office Visit', reason: 'Diabetic eye exam', provider: 'Marcus Oyelaran, OD', location: 'Hopedale Eye Associates', minutes: 45, hh: 14 });
procedure('hopedale', '2025-06-16', 'IMAGING OF RETINA FOR DETECTION OR MONITORING OF DISEASE', '92250', 'Marcus Oyelaran, OD', 'No retinopathy. Mild presbyopia, reading glasses recommended.');
condition('hopedale', '2025-06-16', 'Presbyopia', 'H52.4', 'active');
encounter('hopedale', '2025-09-22', { type: 'Office Visit', reason: 'Itchy raised spot on upper back', provider: 'Elena Vasquez-Reid, MD', location: 'Hopedale Dermatology', minutes: 20, hh: 10 });
condition('hopedale', '2025-09-22', 'Other seborrheic keratosis', 'L82.1', 'resolved', { abatementDateTime: '2025-11-03' });
procedure('hopedale', '2025-09-22', 'DESTRUCTION BENIGN LESIONS UP TO 14 (CRYOTHERAPY)', '17110', 'Elena Vasquez-Reid, MD', 'Liquid nitrogen x2 freeze-thaw cycles to 1 lesion, upper back. Tolerated well.');
encounter('hopedale', '2026-06-29', { type: 'Office Visit', reason: 'Diabetic eye exam', provider: 'Marcus Oyelaran, OD', location: 'Hopedale Eye Associates', minutes: 40, hh: 15 });
procedure('hopedale', '2026-06-29', 'IMAGING OF RETINA FOR DETECTION OR MONITORING OF DISEASE', '92250', 'Marcus Oyelaran, OD');

// Urgent care at Oak Valley Community Hospital (Cerner): ankle sprain
encounter('oakvalley', '2024-06-22', { type: 'Urgent Care', reason: 'Right ankle injury playing pickup basketball', provider: 'Daniel Kowalczyk, PA-C', location: 'Oak Valley Urgent Care - Riverside', minutes: 75, hh: 18 });
vitals('oakvalley', '2024-06-22', { sys: 142, dia: 91, hr: 88, temp: 98.4 });
imaging('oakvalley', '2024-06-22', 'XR ANKLE RIGHT 3+ VIEWS', 'Sarah Lindqvist, MD', 'No acute fracture or dislocation. Mild soft tissue swelling over the lateral malleolus. Ankle mortise intact.');
procedure('oakvalley', '2024-06-22', 'RADIOLOGIC EXAM ANKLE 3+ VIEWS', '73610', 'Sarah Lindqvist, MD');
condition('oakvalley', '2024-06-22', 'Sprain of anterior talofibular ligament of right ankle, initial encounter', 'S93.491A', 'resolved', { abatementDateTime: '2024-08-01' });
med('oakvalley', '2024-06-22', 'IBUPROFEN 600 MG TABLET', '197806', 'completed', 'Take 1 tablet by mouth every 8 hours as needed for pain, with food. Max 3 tablets/day.', 'Daniel Kowalczyk, PA-C', '2024-07-06');

// ED visit at Highlands Hospital Center: kidney stone
encounter('highlands', '2025-03-08', { type: 'Emergency', reason: 'Severe right flank pain radiating to groin, nausea', provider: 'Rebecca Thornbury, MD', location: 'Highlands Hospital Center Emergency Department', minutes: 310, cls: 'emergency', hh: 2, hosp: { admitSource: { text: 'Self-referral' }, dischargeDisposition: { text: 'Discharged to home' } } });
vitals('highlands', '2025-03-08', { sys: 158, dia: 96, hr: 104, temp: 98.9 });
labPanel('highlands', '2025-03-08', 'CBC', { WBC: 12.4 }, 'Highlands Hospital Center Laboratory');
labPanel('highlands', '2025-03-08', 'BMP', { GLU: 168, CRE: 1.24, EGFR: 74 }, 'Highlands Hospital Center Laboratory');
imaging('highlands', '2025-03-08', 'CT ABDOMEN PELVIS WITHOUT CONTRAST (RENAL STONE PROTOCOL)', 'Arjun Mehta, MD', 'IMPRESSION:\n1. 4 mm obstructing calculus at the right ureterovesical junction with mild right hydroureteronephrosis.\n2. Two nonobstructing punctate calculi in the left lower pole, each less than 2 mm.\n3. No acute appendicitis. Mild hepatic steatosis.');
procedure('highlands', '2025-03-08', 'CT ABDOMEN & PELVIS W/O CONTRAST', '74176', 'Arjun Mehta, MD');
condition('highlands', '2025-03-08', 'Calculus of ureter', 'N20.1', 'resolved', { abatementDateTime: '2025-03-19', notes: 'Patient reports passing stone at home on 3/17.' });
condition('highlands', '2025-03-08', 'Fatty (change of) liver, not elsewhere classified', 'K76.0', 'active');
med('highlands', '2025-03-08', 'TAMSULOSIN 0.4 MG CAPSULE', '863669', 'completed', 'Take 1 capsule (0.4 mg total) by mouth daily for 14 days. Strain urine.', 'Rebecca Thornbury, MD', '2025-03-22');
med('highlands', '2025-03-08', 'ONDANSETRON 4 MG DISINTEGRATING TABLET', '312086', 'completed', 'Dissolve 1 tablet on tongue every 8 hours as needed for nausea.', 'Rebecca Thornbury, MD', '2025-03-15');
med('highlands', '2025-03-08', 'KETOROLAC 10 MG TABLET', '834022', 'completed', 'Take 1 tablet by mouth every 6 hours as needed for pain. Do not exceed 5 days.', 'Rebecca Thornbury, MD', '2025-03-13');
encounter('highlands', '2025-04-02', { type: 'Office Visit', reason: 'Urology follow-up after ureteral stone', provider: 'Thomas Achebe, MD', location: 'Highlands Urology Clinic', minutes: 20, hh: 15 });
labPanel('highlands', '2025-04-02', 'BMP', { GLU: 121, CRE: 0.98 }, 'Highlands Hospital Center Laboratory');

// Blessings Clinic (OnPatient): sinusitis, penicillin allergy, vaccines
add('blessings', 'AllergyIntolerance', { patient: subj('blessings'), recordedDate: '2024-12-03', substance: { text: 'Penicillins', coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '70618', display: 'Penicillins' }] }, status: 'confirmed', criticality: 'CRITH', category: 'medication', reaction: [{ manifestation: [{ text: 'Hives' }, { text: 'Itching' }], severity: 'moderate', description: 'Hives on chest and arms after amoxicillin as a teenager' }] }, '2024-12-03', 'Penicillins');
add('lowland', 'AllergyIntolerance', { patient: subj('lowland'), recordedDate: iso('2025-04-21'), substance: { text: 'Tree pollen', coding: [{ system: 'http://snomed.info/sct', code: '256259004', display: 'Pollen' }] }, status: 'confirmed', criticality: 'CRITL', category: 'environment', reaction: [{ manifestation: [{ text: 'Sneezing' }, { text: 'Watery eyes' }], severity: 'mild' }] }, iso('2025-04-21'), 'Tree pollen');
condition('blessings', '2024-12-03', 'Acute maxillary sinusitis, unspecified', 'J01.00', 'resolved');
med('blessings', '2024-12-03', 'AZITHROMYCIN 250 MG TABLET', '308460', 'completed', 'Take 2 tablets on day 1, then 1 tablet daily on days 2-5. (Penicillin allergy - amoxicillin avoided.)', 'Grace Whitfield, NP', '2024-12-08');
med('blessings', '2024-12-03', 'BENZONATATE 100 MG CAPSULE', '197397', 'completed', 'Take 1 capsule by mouth 3 times daily as needed for cough.', 'Grace Whitfield, NP', '2024-12-17');
const FLU = [['2023-10-07', 'LD', 'UJ482AA'], ['2024-10-12', 'RD', 'AT9112B'], ['2025-10-04', 'LD', 'D7741KQ'], ['2026-10-17', 'LD', 'FL2026A3']];
for (const [d, s, lot] of FLU) imm('blessings', d, 'Influenza, injectable, quadrivalent, preservative free', '150', s === 'LD' ? 'left deltoid' : 'right deltoid', lot, 'Sanofi Pasteur');
imm('blessings', '2023-10-07', 'COVID-19 vaccine, mRNA, spike protein, LNP, preservative free, 30 mcg/0.3mL dose', '309', 'right deltoid', 'HH8216', 'Pfizer, Inc');
imm('blessings', '2024-10-12', 'COVID-19 vaccine, mRNA, spike protein, LNP, preservative free, 50 mcg/0.5mL dose', '312', 'left deltoid', '3043218', 'Moderna US, Inc.');
imm('lowland', '2024-02-12', 'Pneumococcal conjugate PCV 20, polysaccharide CRM197, preservative free', '216', 'left deltoid', 'LL7290', 'Pfizer, Inc');
imm('lowland', '2025-08-11', 'Hepatitis B vaccine (recombinant), CpG adjuvanted, adult 2-dose', '189', 'left deltoid', '944HQ', 'Dynavax Technologies');
imm('lowland', '2025-09-15', 'Hepatitis B vaccine (recombinant), CpG adjuvanted, adult 2-dose', '189', 'right deltoid', '944HR', 'Dynavax Technologies');
imm('blessings', '2025-10-04', 'COVID-19 vaccine, mRNA, spike protein, LNP, preservative free, 30 mcg/0.3mL dose', '309', 'right deltoid', 'LP4471', 'Pfizer, Inc');
encounter('blessings', '2024-12-03', { type: 'Office Visit', reason: 'Sinus pressure and congestion x 12 days, green nasal discharge', provider: 'Grace Whitfield, NP', location: 'Blessings Clinic', minutes: 15, hh: 16 });
vitals('blessings', '2024-12-03', { sys: 136, dia: 87, hr: 82, temp: 99.6 });

// ---------------- Merge into dump ----------------
const clinical = col('clinical_documents');
clinical.docs.push(...out);

// User looks like an established adult user (demo birthday is a child's)
const user = col('user_documents').docs[0];
user.birthday = '1984-02-23T05:00:00.000Z';

// Connections synced recently; one last sync failed (expired token), like real use
const SYNC = { lowland: '2026-11-15T14:02:11.418Z', highlands: '2026-11-15T14:02:13.902Z', oakvalley: '2026-11-15T14:02:12.775Z', blessings: '2026-11-15T14:02:15.120Z', hopedale: '2026-11-15T14:02:12.034Z' };
for (const [k, t] of Object.entries(SYNC)) {
  const c = col('connection_documents').docs.find((x) => x.id === CONN[k].id);
  c.last_sync_attempt = t;
  c.last_refreshed = k === 'hopedale' ? '2026-08-02T19:44:51.003Z' : new Date(Date.parse(t) - 3600000 * 30).toISOString();
  c.last_sync_was_error = k === 'hopedale';
  c._meta.lwt = Date.parse(t);
}

// Pin the latest A1c and lipid panel on the summary page
const latest = (name) => out.filter((d) => d.data_record.resource_type === 'diagnosticreport' && d.metadata.display_name === name).sort((a, b) => b.metadata.date.localeCompare(a.metadata.date))[0].id;
const prefs = col('summary_page_preferences').docs[0];
prefs.pinned_labs = [latest('HEMOGLOBIN A1C'), latest('LIPID PANEL'), ...prefs.pinned_labs];

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(dump));
const counts = {};
for (const d of clinical.docs) counts[d.data_record.resource_type] = (counts[d.data_record.resource_type] || 0) + 1;
console.log(`wrote ${outFile}: ${clinical.docs.length} clinical documents (+${out.length} new)`, counts);
