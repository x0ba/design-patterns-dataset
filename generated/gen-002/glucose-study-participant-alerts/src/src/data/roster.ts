import { NOW, pt, SAMPLE, GRID_START } from '../lib/time';

export interface Participant {
  id: string;
  age: number;
  sex: 'Female' | 'Male';
  sensorSn: string;
  sensorSite: string;
  insertedOn: string; // Pacific date the current sensor was inserted
  insertedMs: number;
  baseline: number; // typical fasting glucose, mg/dL (mock physiology)
  activity: number; // relative step volume (mock physiology)
  lastUploadMs: number; // last data received by the study server
  lastReadingMs: number; // timestamp of the last CGM reading received
  heartbeatMs?: number; // companion app last check-in
  injuredOn?: string; // date an activity-limiting injury was reported
  phone: string;
  notes: { on: string; text: string }[];
  lastSymptomEntry?: { at: number; text: string };
}

const GOAL_STEPS = 8000;
export const STEP_GOAL = GOAL_STEPS;

function floorToGrid(ms: number): number {
  return Math.floor((ms - GRID_START) / SAMPLE) * SAMPLE + GRID_START;
}

interface Row {
  id: string;
  age: number;
  sex: 'Female' | 'Male';
  sn: string;
  site: string;
  ins: string;
  baseline: number;
  activity: number;
  upload?: string; // HH:MM on Tue 17 Nov unless `uploadOn` given
  uploadOn?: string;
  phone: string;
  injuredOn?: string;
  heartbeat?: string;
  notes?: { on: string; text: string }[];
  symptom?: { at: string; text: string };
}

const TODAY = '2026-11-17';

const rows: Row[] = [
  { id: 'P-305', age: 58, sex: 'Female', sn: 'CG7-30512-882', site: 'left upper arm', ins: '2026-11-12', baseline: 88, activity: 1.12, upload: '06:38', phone: '(858) 555-0105', notes: [{ on: '2026-11-14', text: 'Left-knee stiffness after yoga class; cleared for usual activity.' }] },
  { id: 'P-306', age: 64, sex: 'Male', sn: 'CG7-30613-047', site: 'left upper arm', ins: '2026-11-13', baseline: 96, activity: 1.05, upload: '06:36', phone: '(858) 555-0106' },
  { id: 'P-307', age: 41, sex: 'Female', sn: 'CG7-30711-395', site: 'right upper arm', ins: '2026-11-11', baseline: 90, activity: 0.92, upload: '06:37', phone: '(858) 555-0107' },
  { id: 'P-308', age: 52, sex: 'Female', sn: 'CG7-30813-620', site: 'left upper arm', ins: '2026-11-14', baseline: 94, activity: 1.18, upload: '06:35', phone: '(858) 555-0108', notes: [{ on: '2026-11-16', text: 'Phone battery ran down in the evening; companion app restarted at 02:44.' }] },
  { id: 'P-309', age: 67, sex: 'Male', sn: 'CG7-30912-158', site: 'right upper arm', ins: '2026-11-12', baseline: 92, activity: 1.0, upload: '06:39', phone: '(858) 555-0109', injuredOn: '2026-11-14', notes: [
    { on: '2026-11-14', text: 'Sprained left ankle stepping off a curb. Walking is painful; ankle wrapped.' },
    { on: '2026-11-16', text: 'Still limping. Doing seated activity and short walks to the car only.' },
  ] },
  { id: 'P-310', age: 36, sex: 'Female', sn: 'CG7-31015-734', site: 'left upper arm', ins: '2026-11-15', baseline: 84, activity: 1.3, upload: '06:37', phone: '(858) 555-0110' },
  { id: 'P-311', age: 45, sex: 'Male', sn: 'CG7-31108-901', site: 'left upper arm', ins: '2026-11-08', baseline: 101, activity: 1.22, upload: '06:36', phone: '(858) 555-0111', notes: [{ on: '2026-11-08', text: 'Prefers sensor changes before 10:00.' }] },
  { id: 'P-312', age: 60, sex: 'Female', sn: 'CG7-31213-506', site: 'right upper arm', ins: '2026-11-13', baseline: 89, activity: 1.08, upload: '06:38', phone: '(858) 555-0112' },
  { id: 'P-313', age: 49, sex: 'Male', sn: 'CG7-31310-213', site: 'left upper arm', ins: '2026-11-10', baseline: 97, activity: 1.15, upload: '06:38', phone: '(858) 555-0113', notes: [{ on: '2026-11-16', text: 'Lay on the sensor arm while resting after lunch; reported a dull ache at the site.' }] },
  { id: 'P-314', age: 55, sex: 'Female', sn: 'CG7-31411-778', site: 'right upper arm', ins: '2026-11-11', baseline: 93, activity: 1.1, upload: '06:37', phone: '(858) 555-0114', notes: [{ on: '2026-11-16', text: 'Adhesive edge lifted after a shower; re-taped at 09:10 on 16 Nov.' }] },
  { id: 'P-315', age: 62, sex: 'Male', sn: 'CG7-31509-342', site: 'right upper arm', ins: '2026-11-09', baseline: 99, activity: 1.02, upload: '06:36', phone: '(858) 555-0115' },
  { id: 'P-316', age: 47, sex: 'Female', sn: 'CG7-31614-089', site: 'left upper arm', ins: '2026-11-14', baseline: 86, activity: 0.95, upload: '06:39', phone: '(858) 555-0116' },
  { id: 'P-317', age: 58, sex: 'Male', sn: 'CG7-31709-660', site: 'left upper arm', ins: '2026-11-09', baseline: 95, activity: 1.04, upload: '19:38', uploadOn: '2026-11-16', heartbeat: '06:31', phone: '(858) 555-0117', notes: [{ on: '2026-11-12', text: 'Two short signal drops at lunch; resolved after reconnecting the phone.' }] },
  { id: 'P-318', age: 69, sex: 'Female', sn: 'CG7-31812-415', site: 'right upper arm', ins: '2026-11-12', baseline: 91, activity: 1.2, upload: '06:36', phone: '(858) 555-0118', notes: [{ on: '2026-11-14', text: 'Safety call completed overnight; see adverse-event log AE-C3-003.' }] },
  { id: 'P-319', age: 42, sex: 'Male', sn: 'CG7-31908-287', site: 'left upper arm', ins: '2026-11-08', baseline: 88, activity: 1.35, upload: '06:37', phone: '(858) 555-0119' },
  { id: 'P-320', age: 51, sex: 'Female', sn: 'CG7-32015-523', site: 'right upper arm', ins: '2026-11-15', baseline: 85, activity: 1.06, upload: '06:38', phone: '(858) 555-0120' },
  { id: 'P-321', age: 65, sex: 'Male', sn: 'CG7-32113-144', site: 'left upper arm', ins: '2026-11-13', baseline: 98, activity: 1.14, upload: '06:35', phone: '(858) 555-0121' },
  { id: 'P-322', age: 54, sex: 'Female', sn: 'CG7-32210-967', site: 'left upper arm', ins: '2026-11-10', baseline: 84, activity: 1.0, upload: '06:36', phone: '(858) 555-0122', notes: [{ on: '2026-11-12', text: 'Reports sleeping on the sensor arm some nights.' }], symptom: { at: '2026-11-16T21:14', text: 'Feeling fine. Long day in the lab.' } },
];

function build(r: Row): Participant {
  const uploadMs = r.uploadOn
    ? pt(r.uploadOn, r.upload ?? '06:36')
    : pt(TODAY, r.upload ?? '06:36');
  const readingMs = floorToGrid(uploadMs - 2 * 60_000);
  return {
    id: r.id,
    age: r.age,
    sex: r.sex,
    sensorSn: r.sn,
    sensorSite: r.site,
    insertedOn: r.ins,
    insertedMs: pt(r.ins, '08:30'),
    baseline: r.baseline,
    activity: r.activity,
    lastUploadMs: uploadMs,
    lastReadingMs: readingMs,
    heartbeatMs: r.heartbeat ? pt(TODAY, r.heartbeat) : undefined,
    injuredOn: r.injuredOn,
    phone: r.phone,
    notes: r.notes ?? [],
    lastSymptomEntry: r.symptom ? { at: pt(r.symptom.at.slice(0, 10), r.symptom.at.slice(11)), text: r.symptom.text } : undefined,
  };
}

export const ROSTER: Participant[] = rows.map(build);

export const PARTICIPANT_BY_ID: Record<string, Participant> = Object.fromEntries(
  ROSTER.map((p) => [p.id, p]),
);

export function participant(id: string): Participant {
  const p = PARTICIPANT_BY_ID[id];
  if (!p) throw new Error(`Unknown participant ${id}`);
  return p;
}

/** Sanity: the snapshot time is the one the whole mock is built around. */
export const SNAPSHOT_MS = NOW;
