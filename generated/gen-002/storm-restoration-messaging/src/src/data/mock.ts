// Mock data for the Linecall Storm Room. Everything here is fictional.
// The state is the one the storm desk sees at 02:40 on 17 Nov 2026, nine hours into the ice event.

import type { Crew, MedicalCallback, Msg, Notice, Outage, Role } from '../types';
import { t } from '../time';

export const COOP = 'Cedar Bend Electric Cooperative';
export const EVENT = 'Ice event · 16–17 Nov 2026';
export const DESK_USER = 'Renee Okafor';
export const STORM_ID = 'STORM';

// ---------------------------------------------------------------------------
// Outages (23 active cases)
// ---------------------------------------------------------------------------

function out(
  id: string,
  feeder: string,
  substation: string,
  location: string,
  members: number,
  cause: Outage['cause'],
  status: Outage['status'],
  crewIds: string[],
  etr: string | null,
  etrBy?: string,
  etrAt?: string,
  extra: Partial<Outage> = {},
): Outage {
  return {
    id,
    feeder,
    substation,
    location,
    members,
    cause,
    status,
    crewIds,
    etr,
    etrBy: etr ? (etrBy ?? null) : null,
    etrAt: etr && etrAt ? t(etrAt) : null,
    scriptEtr: etr,
    scriptState: 'current',
    medical: false,
    ...extra,
  };
}

export const initialOutages: Outage[] = [
  out('OUT-1131', 'MAD-07', 'Madrona', 'Sawmill Rd N, poles 40–44', 143, 'Ice-loaded conductor', 'working', ['c2'], '08:00', 'Gordon Hale', '02:05'),
  out('OUT-1132', 'RDG-03', 'Ridgeline', 'Hollis Rd', 52, 'Tree on line', 'en-route', ['c5'], '07:30', 'Dwayne Pruitt', '01:50', { medical: true }),
  out('OUT-1133', 'EGC-01', 'Eagle Creek', 'Eagle Creek Tap', 12, 'Tree on line', 'working', ['c3'], '04:30', 'Darnell Price', '01:40'),
  out('OUT-1134', 'KSL-06', 'Kessler', 'Kessler Ln, poles 1–4', 380, 'Ice-loaded conductor', 'working', ['c1'], '09:00', 'Marcus Tellez', '21:05'),
  out('OUT-1135', 'PCR-02', 'Pinecrest', 'Cutter Rd', 9, 'Unknown', 'reported', [], null),
  out('OUT-1136', 'RDG-09', 'Ridgeline', 'Starling Rd', 100, 'Tree on line', 'working', ['c4'], '08:30', 'Dwayne Pruitt', '00:40'),
  out('OUT-1137', 'MAD-03', 'Madrona', 'Old Mill Rd', 31, 'Tree on line', 'working', ['pl4'], '07:00', 'Dwayne Pruitt', '01:20'),
  out('OUT-1138', 'EGC-04', 'Eagle Creek', 'Lindqvist Rd', 300, 'Ice-loaded conductor', 'working', ['pl1', 'pl2'], '10:00', 'Gordon Hale', '01:31', { medical: true }),
  out('OUT-1139', 'PCR-05', 'Pinecrest', 'Pruett Hollow Rd', 9, 'Broken pole', 'reported', [], null, undefined, undefined, { medical: true }),
  out('OUT-1140', 'RDG-01', 'Ridgeline', 'Fairgrounds Rd', 150, 'Ice-loaded conductor', 'en-route', ['pl3'], '11:00', 'Dwayne Pruitt', '02:10'),
  out('OUT-1141', 'MAD-09', 'Madrona', 'Route 14 N', 90, 'Tree on line', 'reported', [], null),
  out('OUT-1142', 'KSL-02', 'Kessler', 'Millrace Ct', 240, 'Ice-loaded conductor', 'assigned', ['c1'], '10:00', 'Marcus Tellez', '01:44'),
  out('OUT-1143', 'PCR-01', 'Pinecrest', 'Pinecrest Village, north loop', 340, 'Broken pole', 'reported', [], null),
  out('OUT-1144', 'EGC-02', 'Eagle Creek', 'Cypress Bend', 74, 'Tree on line', 'reported', [], null),
  out('OUT-1145', 'RDG-06', 'Ridgeline', 'Thistle Ln', 33, 'Unknown', 'reported', [], null),
  out('OUT-1146', 'KSL-04', 'Kessler', 'Old Ferry Rd', 330, 'Ice-loaded conductor', 'assigned', ['c2'], '11:00', 'Gordon Hale', '01:12'),
  out('OUT-1147', 'MAD-12', 'Madrona', 'County Road 9, mile 1.8', 410, 'Broken pole', 'working', ['c6'], '06:00', 'Gordon Hale', '23:40', {
    scriptEtr: '06:00',
    scriptState: 'current',
    pendingEtr: { time: '10:30', by: 'Luis Ortega', at: t('02:31'), msgId: 'a-1147-est' },
  }),
  out('OUT-1148', 'MAD-15', 'Madrona', 'Hollow Creek Rd', 180, 'Ice-loaded conductor', 'reported', [], null),
  out('OUT-1149', 'EGC-07', 'Eagle Creek', 'Route 9 at Sayre', 41, 'Tree on line', 'assigned', ['c3'], '05:30', 'Darnell Price', '02:00'),
  out('OUT-1150', 'RDG-11', 'Ridgeline', 'Thistle Ridge', 52, 'Tree on line', 'reported', [], null),
  out('OUT-1151', 'PCR-04', 'Pinecrest', 'Dutch Hill Rd', 64, 'Ice-loaded conductor', 'reported', [], null),
  out('OUT-1152', 'KSL-09', 'Kessler', 'Starling Ridge', 120, 'Tree on line', 'working', ['c7'], '06:30', 'Hank Sorensen', '01:20'),
  out('OUT-1153', 'MAD-18', 'Madrona', 'Pruitt Lane', 40, 'Unknown', 'reported', [], null),
];

// ---------------------------------------------------------------------------
// Crews (7 in-house, 4 Prairie Line Electric mutual aid)
// ---------------------------------------------------------------------------

export const initialCrews: Crew[] = [
  { id: 'c1', name: 'Crew 1', org: 'Cedar Bend', foreman: 'Marcus Tellez', truck: 'Bucket 101', outageId: 'OUT-1134', activity: 'Working', checkIn: t('02:33') },
  { id: 'c2', name: 'Crew 2', org: 'Cedar Bend', foreman: 'Ruth Abernathy', truck: 'Digger 112', outageId: 'OUT-1131', activity: 'Working', checkIn: t('02:36') },
  { id: 'c3', name: 'Crew 3', org: 'Cedar Bend', foreman: 'Darnell Price', truck: 'Bucket 118', outageId: 'OUT-1133', activity: 'Working', checkIn: t('02:12') },
  { id: 'c4', name: 'Crew 4', org: 'Cedar Bend', foreman: 'Pete Kowalczyk', truck: 'Bucket 124', outageId: 'OUT-1136', activity: 'Working', checkIn: t('02:31') },
  { id: 'c5', name: 'Crew 5', org: 'Cedar Bend', foreman: 'Jolene Baptiste', truck: 'Bucket 131', outageId: 'OUT-1132', activity: 'En route', checkIn: t('02:38') },
  { id: 'c6', name: 'Crew 6', org: 'Cedar Bend', foreman: 'Luis Ortega', truck: 'Line truck 136', outageId: 'OUT-1147', activity: 'On scene', checkIn: t('02:34') },
  { id: 'c7', name: 'Crew 7', org: 'Cedar Bend', foreman: 'Hank Sorensen', truck: 'Bucket 142', outageId: 'OUT-1152', activity: 'Working', checkIn: t('01:26') },
  { id: 'pl1', name: 'PL Crew 1', org: 'Prairie Line Electric', foreman: 'Corey Lindgren', truck: 'PL-204', outageId: 'OUT-1138', activity: 'Working', checkIn: t('02:29') },
  { id: 'pl2', name: 'PL Crew 2', org: 'Prairie Line Electric', foreman: 'Trina Haugen', truck: 'PL-211', outageId: 'OUT-1138', activity: 'Working', checkIn: t('02:35') },
  { id: 'pl3', name: 'PL Crew 3', org: 'Prairie Line Electric', foreman: 'Mateo Ruiz', truck: 'PL-219', outageId: 'OUT-1140', activity: 'En route', checkIn: t('02:40') },
  { id: 'pl4', name: 'PL Crew 4', org: 'Prairie Line Electric', foreman: 'Ben Osei', truck: 'PL-223', outageId: 'OUT-1137', activity: 'Working', checkIn: t('02:21') },
];

// ---------------------------------------------------------------------------
// Messages. Handwritten threads first, then generated routine traffic so the
// room has about 180 messages since 17:30 across 23 outages.
// ---------------------------------------------------------------------------

let seq = 0;
function msg(
  outageId: string,
  time: string,
  author: string,
  role: Role,
  body: string,
  extra: Partial<Msg> = {},
): Msg {
  seq += 1;
  return {
    id: extra.id ?? `m-${String(seq).padStart(3, '0')}`,
    outageId,
    at: t(time),
    author,
    role,
    body,
    ...extra,
  };
}

const sys = (outageId: string, time: string, body: string): Msg =>
  msg(outageId, time, 'Linecall', 'system', body, { system: true });

const DWAYNE = 'Dwayne Pruitt';
const MARISOL = 'Marisol Vega';
const GORDON = 'Gordon Hale';
const TANISHA = 'Tanisha Reeves';
const PRIYA = 'Priya Raman';
const ELLIS = 'Ellis Monroe';

const handwritten: Msg[] = [
  // OUT-1147: County Road 9, the 410-member outage whose 6 AM estimate is breaking.
  msg('OUT-1147', '17:52', DWAYNE, 'dispatch', 'OUT-1147 opened. MAD-12 lockout at Madrona Sub. Conductor down on County Road 9 near the Lutz farm. 410 members.'),
  msg('OUT-1147', '18:34', 'Luis Ortega', 'crew', 'Crew 6 on scene CR 9 mile 1.8. Conductor across the ditch, not energized. Patrolling for cause.', { unit: 'Crew 6' }),
  msg('OUT-1147', '20:10', DWAYNE, 'dispatch', 'Patrol from Madrona confirms the lockout holds. Keep clear of the conductor until we verify no backfeed.'),
  msg('OUT-1147', '21:48', 'Luis Ortega', 'crew', 'Spans 1 and 2 need new conductor. Pole at mile 1.8 leaning hard. Not sure yet if it is ice or the tree. Need a line truck, not a bucket.', { unit: 'Crew 6' }),
  msg('OUT-1147', '23:38', GORDON, 'ops', 'Call center: members on CR 9 get a 6:00 AM estimate. Crew 6 has two spans and a pole to finish. Setting ETR 06:00.'),
  sys('OUT-1147', '23:40', 'ETR set to 6:00 AM by Gordon Hale.'),
  msg('OUT-1147', '23:55', TANISHA, 'callcenter', 'CR 9 script updated to 6:00 AM. Outbound text to 410 members goes at midnight.'),
  msg('OUT-1147', '00:14', 'Luis Ortega', 'crew', 'Line truck held up at the Route 14 bridge. About 40 min out.', { unit: 'Crew 6' }),
  msg('OUT-1147', '01:12', 'Luis Ortega', 'crew', 'Pole at mile 1.8 snapped at the base, ground-line side. Need a replacement. Ridgeline yard has one, 45 ft class 2.', { unit: 'Crew 6' }),
  msg('OUT-1147', '01:20', DWAYNE, 'dispatch', 'Loading the Ridgeline pole on Truck 207. Crew 6 hold the span until it is on site.'),
  msg('OUT-1147', '02:08', 'Luis Ortega', 'crew', 'New pole set at 02:08. Crossarm going up now.', { unit: 'Crew 6' }),
  sys('OUT-1147', '02:31', 'Cause updated: Broken pole (was Ice-loaded conductor), by Crew 6.'),
  msg('OUT-1147', '02:31', 'Luis Ortega', 'crew', 'New estimate for CR 9 is 10:30 AM, not 6. The pole is set, but the old one took the crossarm and two spans sagged into the ditch. Re-tension and clearance on those spans happen after the crossarm goes up. Need you to confirm 10:30 so the call center can change. 6 AM will not hold.', {
    unit: 'Crew 6',
    id: 'a-1147-est',
    awaiting: {
      owner: 'Renee Okafor',
      ownerRole: 'storm',
      kind: 'estimate',
      etr: '10:30',
      suggestion: 'Confirmed, 10:30 AM. Call me the minute the crossarm is up. If it slips past 9:30 I need to know.',
    },
  }),
  msg('OUT-1147', '02:36', TANISHA, 'callcenter', 'Script still reads 6:00 AM and the 03:00 outbound is queued for all 410 members. I need your call on the new time before 03:00.', {
    id: 'a-1147-handoff',
    awaiting: {
      owner: 'Renee Okafor',
      ownerRole: 'storm',
      kind: 'handoff',
      suggestion: 'Hold the 6 AM text. CR 9 is moving to 10:30 AM and I am confirming with Crew 6 now. You will have the script change within minutes.',
    },
  }),

  // OUT-1136: Starling Rd. Pete Kowalczyk asks whether a Prairie Line crew is coming.
  msg('OUT-1136', '00:40', DWAYNE, 'dispatch', 'OUT-1136 Starling Rd: tree on the primary, 100 members. Crew 4 assigned, ETR 08:30.'),
  msg('OUT-1136', '01:05', 'Pete Kowalczyk', 'crew', 'Crew 4 on scene. Two trees: one across the primary, one on the service drop.', { unit: 'Crew 4' }),
  msg('OUT-1136', '01:58', 'Pete Kowalczyk', 'crew', 'Primary is clear. Transformer on the service side is cracked. Pulling it now.', { unit: 'Crew 4' }),
  msg('OUT-1136', '02:22', 'Pete Kowalczyk', 'crew', 'Renee, is the Prairie Line crew coming to Starling Rd tonight? Or do I keep my two-man on the service and let the transformer wait? I am not releasing anybody until I know.', {
    unit: 'Crew 4',
    id: 'a-1136-q',
    awaiting: {
      owner: 'Renee Okafor',
      ownerRole: 'storm',
      kind: 'question',
      suggestion: 'No Prairie Line crew for Starling Rd tonight. PL Crew 3 is headed to Fairgrounds Rd. Keep your two-man on the transformer. I will call you if that changes.',
    },
  }),

  // OUT-1134: Kessler Ln. Crew 1 needs a second bucket. Ops decides.
  msg('OUT-1134', '17:58', DWAYNE, 'dispatch', 'OUT-1134 Kessler Ln: 380 members. Ice-loaded conductor across four spans. Crew 1 assigned.'),
  msg('OUT-1134', '19:40', 'Marcus Tellez', 'crew', 'Crew 1 on Kessler Ln. Four poles, two conductors on the ground. One bucket only reaches two of them.', { unit: 'Crew 1' }),
  sys('OUT-1134', '21:05', 'ETR set to 9:00 AM by Marcus Tellez.'),
  msg('OUT-1134', '23:20', 'Marcus Tellez', 'crew', 'Pole three is leaning on the transformer. Need a second bucket or the far end runs to 10:00.', { unit: 'Crew 1' }),
  msg('OUT-1134', '02:14', 'Marcus Tellez', 'crew', 'Ops, I need a second bucket on Kessler Ln for the four-pole run. Crew 1 is one bucket short. Can you approve pulling PL Crew 1\'s bucket from the Lindqvist job? If not, the far end is 10:00.', {
    unit: 'Crew 1',
    id: 'a-1134-req',
    awaiting: {
      owner: GORDON,
      ownerRole: 'ops',
      kind: 'request',
      suggestion: 'Approved. Pull the bucket from Lindqvist and send it to Kessler Ln. I will square it with Prairie Line.',
    },
  }),

  // OUT-1139: Pruett Hollow. Medical priority, no crew yet.
  msg('OUT-1139', '01:52', TANISHA, 'callcenter', 'Medical callback MC-0417: oxygen concentrator on Pruett Hollow Rd. Member says the battery lasts about 2 hours. OUT-1139 has no crew.'),
  msg('OUT-1139', '02:14', TANISHA, 'callcenter', 'Dwayne, can we get a crew ETA for the Pruett Hollow member? I need something to tell them on the callback.', {
    id: 'a-1139-med',
    awaiting: {
      owner: DWAYNE,
      ownerRole: 'dispatch',
      kind: 'medical',
      suggestion: 'Pruett Hollow is next for the next bucket. ETA 04:30. Tell the member to call 911 if they feel short of breath or the concentrator battery alarm sounds.',
    },
  }),

  // OUT-1132: Hollis Rd. Medical callback MC-0422.
  msg('OUT-1132', '01:50', DWAYNE, 'dispatch', 'OUT-1132 Hollis Rd: tree on line, 52 members. Crew 5 en route, ETR 07:30.'),
  msg('OUT-1132', '02:05', TANISHA, 'callcenter', 'MC-0422 is a CPAP user with no backup battery. Callback due 02:20.'),
  msg('OUT-1132', '02:38', 'Jolene Baptiste', 'crew', 'Crew 5 leaving the yard now. About 25 min to Hollis Rd.', { unit: 'Crew 5' }),

  // OUT-1131: Sawmill Rd N.
  msg('OUT-1131', '18:20', MARISOL, 'dispatch', 'OUT-1131 Sawmill Rd N: ice-loaded conductor, 143 members. Crew 2 assigned.'),
  msg('OUT-1131', '19:50', 'Ruth Abernathy', 'crew', 'Crew 2 on Sawmill. Two spans of conductor down on the road. Pole 42 cracked near the top.', { unit: 'Crew 2' }),
  msg('OUT-1131', '02:05', GORDON, 'ops', 'ETR 8:00 AM on Sawmill Rd N. Crew 2 has two spans left and a reclose check.'),

  // OUT-1133: Eagle Creek Tap.
  msg('OUT-1133', '01:40', 'Darnell Price', 'crew', 'Crew 3 at Eagle Creek Tap. Tree on the primary, 12 members. Estimate 4:30 AM. Cutting now.', { unit: 'Crew 3' }),
  msg('OUT-1133', '02:12', 'Darnell Price', 'crew', 'Tree is off. Re-energizing the tap. Crew 3 moves to Route 9 at Sayre next.', { unit: 'Crew 3' }),

  // OUT-1138: Lindqvist Rd. Prairie Line crews on the ground.
  msg('OUT-1138', '21:28', MARISOL, 'dispatch', 'OUT-1138 Lindqvist Rd: 300 members. PL Crew 1 and PL Crew 2 assigned. Ice on the crossarm hardware.'),
  msg('OUT-1138', '22:55', 'Corey Lindgren', 'mutual', 'PL Crew 1 on scene. Span 3 down across the road. Need the county to block CR 14 for the bucket.', { unit: 'PL Crew 1' }),
  msg('OUT-1138', '00:30', MARISOL, 'dispatch', 'County blocked CR 14 at Lindqvist. Go ahead.'),
  msg('OUT-1138', '01:31', GORDON, 'ops', 'ETR 10:00 AM on Lindqvist. Two spans of conductor and one transformer.'),
  msg('OUT-1138', '02:27', TANISHA, 'callcenter', 'Medical callback MC-0426: insulin refrigerator on Lindqvist Rd. Member has a cooler on hand. Callback requested.'),
  msg('OUT-1138', '02:29', 'Corey Lindgren', 'mutual', 'Span 3 is up. Working the last transformer. Maybe two more hours.', { unit: 'PL Crew 1' }),

  // OUT-1152: Starling Ridge. Crew 7 goes silent at 01:26.
  msg('OUT-1152', '22:48', DWAYNE, 'dispatch', 'OUT-1152 Starling Ridge: tree on the secondary, 120 members. Crew 7 assigned.'),
  msg('OUT-1152', '23:30', 'Hank Sorensen', 'crew', 'Crew 7 on scene. Tree across the secondary, two poles leaning. Need a bucket.', { unit: 'Crew 7' }),
  msg('OUT-1152', '00:55', 'Hank Sorensen', 'crew', 'Tree cut. Pole 1 is fine. Pole 2 needs a crossarm.', { unit: 'Crew 7' }),
  sys('OUT-1152', '01:20', 'ETR set to 6:30 AM by Hank Sorensen.'),
  msg('OUT-1152', '01:26', 'Hank Sorensen', 'crew', 'Going up on pole 2. Radio is low. Will check in from the top.', { unit: 'Crew 7' }),
  sys('OUT-1152', '02:27', 'Check-in overdue: Crew 7, last heard 01:26.'),
  msg('OUT-1152', '02:28', DWAYNE, 'dispatch', 'Pinged Crew 7 by radio and phone. No answer.'),
  msg('OUT-1152', '02:33', MARISOL, 'dispatch', 'Asked Crew 1 to swing by Starling Ridge after Kessler Ln if we still have no answer by 02:45.'),

  // STORM: storm-wide traffic and staging. Mateo Ruiz asks where to stage tonight.
  msg(STORM_ID, '17:40', GORDON, 'ops', 'Prairie Line sent four trucks under the mutual aid agreement. Staging is at Ridgeline Sub yard until we assign them.'),
  msg(STORM_ID, '19:15', DESK_USER, 'storm', 'Check-ins every 30 minutes by radio or phone. Miss two and dispatch pings you.'),
  msg(STORM_ID, '21:30', MARISOL, 'dispatch', 'PL Crews 1 and 2 are at Lindqvist (OUT-1138). PL Crew 4 is on Old Mill (OUT-1137).'),
  msg(STORM_ID, '02:36', 'Mateo Ruiz', 'mutual', 'PL Crew 3 out of the Prairie Line yard on Truck PL-219, about 40 min from the county line. Where do you want us tonight? Radio says the Kessler lot is flooded.', {
    unit: 'PL Crew 3',
    id: 'a-storm-stage',
    awaiting: {
      owner: DESK_USER,
      ownerRole: 'storm',
      kind: 'question',
      suggestion: 'PL Crew 3: stage at the Ridgeline Sub yard tonight, not Kessler. Your job is OUT-1140 on Fairgrounds Rd. Dispatch meets you at the gate at 03:30.',
    },
  }),
];

// Routine traffic for the outages without a handwritten thread.
const FILLER_OUTAGES = ['OUT-1135', 'OUT-1137', 'OUT-1140', 'OUT-1141', 'OUT-1142', 'OUT-1143', 'OUT-1144', 'OUT-1145', 'OUT-1146', 'OUT-1148', 'OUT-1149', 'OUT-1150', 'OUT-1151', 'OUT-1153'];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRoutine(): Msg[] {
  const rand = rng(20261117);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  const out: Msg[] = [];
  const pad = (n: number) => String(n).padStart(2, '0');
  const clockOf = (mins: number) => {
    const v = ((Math.floor(mins) % 1440) + 1440) % 1440;
    return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`;
  };
  const crewById = (id: string) => initialCrews.find((c) => c.id === id);

  for (const id of FILLER_OUTAGES) {
    const o = initialOutages.find((x) => x.id === id);
    if (!o) continue;
    const crew = o.crewIds.length ? crewById(o.crewIds[0]) : undefined;
    const disp = pick([DWAYNE, MARISOL]);
    const agent = pick([PRIYA, ELLIS]);
    const count = 7 + Math.floor(rand() * 3); // 7 to 9 messages each
    const start = -390 + Math.floor(rand() * 180);
    const span = 159 - start;
    const times = Array.from({ length: count }, () => start + Math.floor(rand() * span)).sort((a, b) => a - b);
    times[0] = start;

    times.forEach((at, i) => {
      let role: Role;
      let author: string;
      let body: string;
      let unit: string | undefined;
      const roll = rand();
      if (i === 0) {
        role = 'dispatch';
        author = disp;
        body = `${o.id} opened on ${o.feeder}, ${o.location}. ${o.members} members out. Cause: ${o.cause.toLowerCase()}.`;
      } else if (roll < 0.3 || !crew) {
        if (roll < 0.15 || !crew) {
          role = 'dispatch';
          author = disp;
          body = crew
            ? `${o.id}: Patrol on ${o.feeder} found ${2 + Math.floor(rand() * 7)} spans down between ${o.location} and the county line.`
            : `${o.id} still needs a crew. Next available goes after the current job.`;
        } else {
          role = 'callcenter';
          author = agent;
          body = `${o.members > 150 ? 'Dozens of' : 'A few'} calls on ${o.location} since the last update. Script is holding.`;
        }
      } else {
        role = crew.org === 'Prairie Line Electric' ? 'mutual' : 'crew';
        author = crew.foreman;
        unit = crew.name;
        const variants = [
          `On scene ${o.location}. ${2 + Math.floor(rand() * 7)} spans to look at, starting at the substation end.`,
          `${2 + Math.floor(rand() * 4)} spans clear on ${o.location}. Going to the transformer next.`,
          `Crossarm and one insulator to replace on ${o.location}. Parts are on the truck.`,
          `Tree crew needed on ${o.location}. Not ours to cut. We are making it safe and moving on.`,
          `About ${Math.round(o.members * 0.4)} members back on at ${o.location}. The rest are still out on the lateral.`,
          `Lateral ${o.location} is re-energized. Patrolling the last section.`,
        ];
        body = pick(variants);
      }
      out.push(msg(o.id, clockOf(at), author, role, body, unit ? { unit } : {}));
    });
  }
  return out;
}

export const initialMessages: Msg[] = [...handwritten, ...generateRoutine()].sort((a, b) => a.at - b.at);

// ---------------------------------------------------------------------------
// Member notices: four sent and one draft ready.
// ---------------------------------------------------------------------------

export const initialNotices: Notice[] = [
  {
    id: 'n-advisory',
    outageId: null,
    audience: 9084,
    etr: null,
    text: 'Cedar Bend Electric: ice is building on lines across Tolliver County and more outages are likely overnight. Crews are staged. Keep generators outdoors and away from windows. Report an outage at the app or call the outage line.',
    sentAt: t('17:50'),
    sentBy: GORDON,
    label: 'Storm advisory · all members',
  },
  {
    id: 'n-1134',
    outageId: 'OUT-1134',
    audience: 380,
    etr: '09:00',
    text: 'Crews are working on broken lines on Kessler Ln. Estimated restoration 9:00 AM. We will text you if that changes.',
    sentAt: t('21:12'),
    sentBy: TANISHA,
    label: 'OUT-1134 · Kessler Ln',
  },
  {
    id: 'n-1147',
    outageId: 'OUT-1147',
    audience: 410,
    etr: '06:00',
    text: 'Crews are repairing a broken pole on County Road 9 near the Lutz farm. Estimated restoration 6:00 AM. Reply HELP for help or STOP to unsubscribe.',
    sentAt: t('00:02'),
    sentBy: TANISHA,
    label: 'OUT-1147 · County Road 9',
  },
  {
    id: 'n-1133',
    outageId: 'OUT-1133',
    audience: 12,
    etr: '04:30',
    text: 'Crew 3 is clearing a fallen tree on Eagle Creek Tap. Estimated restoration 4:30 AM.',
    sentAt: t('01:44'),
    sentBy: TANISHA,
    label: 'OUT-1133 · Eagle Creek Tap',
  },
  {
    id: 'd-1147',
    outageId: 'OUT-1147',
    audience: 410,
    etr: '10:30',
    text: 'Correction from Cedar Bend Electric: restoration on County Road 9 has moved from 6:00 AM to 10:30 AM. A utility pole broke in the ice and crews have set a new one. We are sorry for the change. Reply HELP for help or STOP to unsubscribe.',
    sentAt: null,
    sentBy: '',
    draftedBy: TANISHA,
    label: 'Correction · OUT-1147 · County Road 9',
  },
];

// ---------------------------------------------------------------------------
// Medical-priority callbacks (3 open).
// ---------------------------------------------------------------------------

export const initialMedical: MedicalCallback[] = [
  {
    id: 'MC-0417',
    account: 'Acct ending 4417',
    address: 'Pruett Hollow Rd',
    outageId: 'OUT-1139',
    need: 'Oxygen concentrator, battery about 2 hours',
    requestedAt: t('01:52'),
    status: 'open',
    owner: TANISHA,
  },
  {
    id: 'MC-0422',
    account: 'Acct ending 0932',
    address: 'Hollis Rd',
    outageId: 'OUT-1132',
    need: 'CPAP, no backup power',
    requestedAt: t('02:05'),
    status: 'due',
    owner: PRIYA,
  },
  {
    id: 'MC-0426',
    account: 'Acct ending 2278',
    address: 'Lindqvist Rd',
    outageId: 'OUT-1138',
    need: 'Insulin refrigerator, cooler on hand',
    requestedAt: t('02:27'),
    status: 'open',
    owner: TANISHA,
  },
];
