import type { Clip, MapId, Marker } from './types';

export const NOW_START = new Date(2026, 10, 17, 15, 40, 0); // Tue Nov 17, 3:40 PM
export const MEETING = new Date(2026, 10, 17, 18, 0, 0);

export const COACH = { name: 'Dana Okafor', initials: 'DO', role: 'Head coach', org: 'Lowtide Esports', plan: 'Team plan · 10 seats' };

export const INITIAL_MARKERS: Marker[] = [
  { id: 'm1', roundId: 'foundry-r13', t: 39, text: 'Kael and Vesper both stay A off one sound cue', createdLabel: 'Mon 11:52 PM' },
  { id: 'm2', roundId: 'foundry-r15', t: 62, text: 'Mara rotates through Kiln with no info', createdLabel: 'Mon 11:58 PM' },
  { id: 'm3', roundId: 'foundry-r16', t: 68, text: "Retake util dumped before anyone's in position", createdLabel: 'Tue 12:03 AM' },
  { id: 'm4', roundId: 'foundry-r17', t: 41, text: 'Rotate call? Check comms', createdLabel: 'Tue 12:06 AM' },
  { id: 'm5', roundId: 'foundry-r17', t: 52, text: 'Juno peeks before flash lands', createdLabel: 'Tue 12:07 AM' },
  { id: 'm6', roundId: 'foundry-r19', t: 70, text: 'Kael/Juno swing together, no trade spacing', createdLabel: 'Tue 12:14 AM' },
  { id: 'm7', roundId: 'foundry-r20', t: 27, text: 'Vesper over-rotates off one footstep', createdLabel: 'Tue 12:17 AM' },
  { id: 'm8', roundId: 'foundry-r22', t: 76, text: 'Same retake as R17. Show back to back', createdLabel: 'Tue 12:21 AM' },
  { id: 'm9', roundId: 'saltworks-r6', t: 39, text: 'Halcyon fake Pier, we all bite', createdLabel: 'Tue 12:40 AM' },
  { id: 'm10', roundId: 'saltworks-r18', t: 74, text: "Rook's default leaves Docks open", createdLabel: 'Tue 12:51 AM' },
  { id: 'm11', roundId: 'canopy-r14', t: 22, text: 'Clean A hold. Show as the good example', createdLabel: 'Tue 1:08 AM' },
];

export const SESSION = {
  title: 'Halcyon Five scrim review',
  when: 'Tonight · 6:00 PM',
  target: 6,
  audience: 'Full roster + analyst',
};

export const INITIAL_CLIPS: Clip[] = [
  { id: 'c1', roundId: 'foundry-r15', tIn: 57, tOut: 67, pov: 'Mara', speed: 1, title: 'Mara rotates through Kiln with no info', note: 'Ask Mara what she heard before leaving Lane.' },
  { id: 'c2', roundId: 'foundry-r16', tIn: 63, tOut: 74, pov: 'Spectator', speed: 0.5, title: "Retake util dumped before anyone's in position", note: 'Count who is actually on Kiln when the first Flare goes.' },
];

export interface ScoutClip {
  id: string;
  map: MapId;
  title: string;
  source: string;
  at: string;
  len: string;
  note: string;
}

export const SCOUTING = {
  title: 'Halcyon scouting',
  created: 'Thu, Nov 12 · 9:14 PM',
  clips: [
    { id: 's1', map: 'foundry', title: 'B Lane double-Veil exec (Kiln Door + Cat)', source: 'HF vs Brightwater · Div 2 Wk 7', at: 'R4 0:21', len: '0:14', note: 'Lumen throws both. Exec lands ~4s after the second pops.' },
    { id: 's2', map: 'foundry', title: 'Tess plays back site post-plant, every time', source: 'HF vs Brightwater · Div 2 Wk 7', at: 'R9 0:47', len: '0:12', note: 'Off-angle by the Kiln Door. Whoever swings the door first dies.' },
    { id: 's3', map: 'foundry', title: 'Nyx lurks Conveyor for late Cat flank', source: 'HF vs Ironvale · Div 2 Wk 6', at: 'R14 0:52', len: '0:18', note: 'Times it with the retake. Watch Catwalk after plant.' },
    { id: 's4', map: 'foundry', title: 'Pistol: 5-man A Main rush', source: 'HF vs Ironvale · Div 2 Wk 6', at: 'R1 0:09', len: '0:11', note: '' },
    { id: 's5', map: 'foundry', title: 'Post-plant crossfire: default box + Kiln Door', source: 'HF vs Kestrel Gaming · Div 2 Wk 5', at: 'R18 0:58', len: '0:16', note: 'Same two spots three rounds in a row.' },
    { id: 's6', map: 'saltworks', title: 'Pier fake, three rotate to Docks', source: 'HF vs Brightwater · Div 2 Wk 7', at: 'R6 0:33', len: '0:20', note: 'Fake util only, no bodies committed.' },
    { id: 's7', map: 'saltworks', title: 'Lumen solo Brine lurk', source: 'HF vs Kestrel Gaming · Div 2 Wk 5', at: 'R11 0:40', len: '0:15', note: '' },
    { id: 's8', map: 'saltworks', title: 'Anti-eco stack Evaporator', source: 'HF vs Ironvale · Div 2 Wk 6', at: 'R3 0:12', len: '0:09', note: '' },
    { id: 's9', map: 'saltworks', title: 'Retake: they wait for all five', source: 'HF vs Brightwater · Div 2 Wk 7', at: 'R20 1:02', len: '0:22', note: 'Compare with our retakes. They trade the time for numbers.' },
    { id: 's10', map: 'saltworks', title: 'Brask entry Flare timing', source: 'HF vs Kestrel Gaming · Div 2 Wk 5', at: 'R16 0:24', len: '0:08', note: 'Pops at the top of Docks, swings 0.5s after.' },
    { id: 's11', map: 'canopy', title: 'Fast Treeline take after first pick', source: 'HF vs Ironvale · Div 2 Wk 6', at: 'R7 0:28', len: '0:13', note: '' },
    { id: 's12', map: 'canopy', title: 'Corvid off-angle in Atrium', source: 'HF vs Brightwater · Div 2 Wk 7', at: 'R15 0:36', len: '0:10', note: '' },
    { id: 's13', map: 'canopy', title: 'Default spread, hit on 0:55', source: 'HF vs Kestrel Gaming · Div 2 Wk 5', at: 'R10 0:55', len: '0:17', note: 'IGL call is late every round. Punish with a flank.' },
    { id: 's14', map: 'canopy', title: 'Force buy round 2, Greenhouse', source: 'HF vs Ironvale · Div 2 Wk 6', at: 'R2 0:18', len: '0:12', note: '' },
  ] as ScoutClip[],
};
