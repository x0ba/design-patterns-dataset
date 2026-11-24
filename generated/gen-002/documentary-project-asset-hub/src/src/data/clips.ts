import type { ArchivalItem, Clip, Scene, Transcript } from './types';
import { addDays, int, mulberry32, pick, tc } from '../lib/util';

const SIZES = ['Wide', 'Medium', 'Close-up', 'Detail', 'Low angle', 'Handheld follow', 'Locked-off', 'Slow push-in', 'Tracking', 'Over-the-shoulder'];
const VOCAB: Record<string, { subjects: string[]; conds: string[]; range: [string, number] }> = {
  'salt-road': {
    subjects: ['salt sacks on pallets', 'Crane 7 boom', 'brine channel', 'weighing-house scales', 'tide gauge on Pier 2', 'gulls on a bollard', 'a salt truck on Route 9', 'tally boards on a hook', 'hands tying a mooring line', 'rust on the Gate 4 hinge', 'the works whistle housing', 'evaporation pans', 'pallet jack on wet concrete', 'dockside lamp coming on', 'a hopper emptying', 'the Customs House clock', 'container stack, Pier 4', 'chain and shackle', 'salt crust on a fence post', 'forklift reversing'],
    conds: ['at dawn', 'in rain', 'at dusk', 'in fog', 'in hard noon light', 'at night, sodium lamps', 'in wind', 'at low tide', 'at slack water', 'after a shower'],
    range: ['2025-02-10', 410],
  },
  'night-ferry': {
    subjects: ['wake off the stern', 'vehicle deck lashing chains', 'galley steam', 'radar sweep', 'cabin door numbers', 'porthole condensation', 'a hand on the rail', 'lifebuoy swinging', 'mooring crew at Karrow', 'engine-room gauges', 'a passenger asleep in the lounge', 'stair treads, deck 3'],
    conds: ['at night', 'in fog', 'at first light', 'in swell', 'under deck lights'],
    range: ['2026-01-12', 220],
  },
  'last-pilot': {
    subjects: ['the pilot ladder', 'bulk carrier hull', 'a channel buoy', 'pilot cutter wake', 'the harbour wall', 'the chart table', 'a binoculars case', 'rope fenders'],
    conds: ['at dawn', 'in chop', 'in grey light', 'at slack water'],
    range: ['2026-08-03', 40],
  },
};

const CAMS = ['ARRI Alexa Mini LF', 'Sony FX6', 'Blackmagic Pocket 6K'];

export function buildClips(project: string, scenes: Scene[], items: ArchivalItem[], transcripts: Transcript[], total: number, seed: number): Clip[] {
  const r = mulberry32(seed + 9);
  const V = VOCAB[project];
  const clips: Clip[] = [];
  const dayCards = new Map<string, number>();
  let card = 1;
  const shootDay = () => addDays(V.range[0], int(r, 0, V.range[1]));
  const cardFor = (d: string) => { if (!dayCards.has(d)) dayCards.set(d, card++); return dayCards.get(d)!; };
  let cnt = new Map<number, number>();
  const bro = (sceneN: number | undefined, type = 'B-roll', drone = false): Clip => {
    const d = shootDay();
    const c = cardFor(d);
    const k = (cnt.get(c) || 0) + 1; cnt.set(c, k);
    const camera = drone ? 'DJI Mavic 3 Pro' : pick(r, CAMS);
    const letter = drone ? 'D' : camera.startsWith('ARRI') ? 'A' : camera.startsWith('Sony') ? 'B' : 'C';
    const desc = drone ? `Aerial, ${pick(r, V.subjects)} ${pick(r, V.conds)}` : `${pick(r, SIZES)}, ${pick(r, V.subjects)} ${pick(r, V.conds)}`;
    return {
      id: `${letter}${String(c).padStart(3, '0')}_C${String(k).padStart(3, '0')}`,
      project, type: drone ? 'Drone' : type, desc, durSec: int(r, 6, 95), shot: d, camera, circled: r() < 0.16, sceneN,
    };
  };

  // full-length interview clips (A and B camera)
  for (const t of transcripts) {
    for (const cam of ['A', 'B']) {
      clips.push({ id: `INT_${t.id.toUpperCase().slice(0, 10)}_${cam}001`, project, type: 'Interview', desc: `${t.name}: full interview, ${cam}-cam ${cam === 'A' ? 'medium' : 'close'}`, durSec: t.durSec, shot: t.recorded, camera: cam === 'A' ? 'ARRI Alexa Mini LF' : 'Sony FX6', circled: false });
    }
  }
  // scene-driven clips
  for (const s of scenes) {
    if (s.kind === 'interview' && s.passage) {
      const t = transcripts.find((x) => x.id === s.passage!.transcriptId)!;
      for (const cam of ['A', 'B']) {
        clips.push({
          id: `INT_${t.id.toUpperCase().slice(0, 10)}_${cam}001-s${s.n}`, project, type: 'Interview',
          desc: `${t.name}: ${cam}-cam ${cam === 'A' ? 'medium' : 'close'}, subclip ${tc(s.passage.inSec)}–${tc(s.passage.outSec)}`,
          durSec: s.passage.outSec - s.passage.inSec, shot: t.recorded, camera: cam === 'A' ? 'ARRI Alexa Mini LF' : 'Sony FX6', circled: true, sceneN: s.n,
        });
      }
      for (let i = 0; i < int(r, 3, 6); i++) clips.push(bro(s.n));
    } else if (s.kind === 'verite') for (let i = 0; i < int(r, 6, 13); i++) clips.push(bro(s.n, 'Vérité'));
    else if (s.kind === 'montage') for (let i = 0; i < int(r, 8, 15); i++) clips.push(bro(s.n, 'B-roll', r() < 0.2));
    else if (s.kind === 'title') clips.push({ id: `GFX_S${String(s.n).padStart(2, '0')}_v1`, project, type: 'Graphics', desc: `${s.title}: motion graphics, v1`, durSec: int(r, 12, 40), shot: '2026-10-05', camera: 'After Effects render', circled: false, sceneN: s.n });
  }
  for (const it of items) {
    for (const u of it.usages) {
      clips.push({
        id: `${it.id}_XFER`, project, type: 'Archival transfer',
        desc: `${it.title}${it.durSec ? '' : ' (still)'}: conformed transfer`, durSec: it.durSec || 6, shot: it.clearance.requestedOn || '2026-09-20', camera: 'Telecine / scan', circled: true, sceneN: u.sceneN, itemId: it.id,
      });
    }
  }
  // focal scene extras
  const s22 = scenes.find((s) => s.n === 22 && project === 'salt-road');
  if (s22) clips.push({ id: 'GFX_S22_LT01', project, type: 'Graphics', desc: 'Lower third: “Gate 4, March 1974”', durSec: 6, shot: '2026-10-12', camera: 'After Effects render', circled: true, sceneN: 22 });
  const s21 = scenes.find((s) => s.n === 21 && project === 'salt-road');
  void s21;

  // fill remaining as unassigned rushes
  const fill = total - clips.length;
  for (let i = 0; i < fill; i++) clips.push(bro(undefined, r() < 0.25 ? 'Vérité' : 'B-roll', r() < 0.08));
  // dedupe ids
  const seen = new Set<string>();
  for (const c of clips) { let id = c.id; let n = 2; while (seen.has(id)) id = `${c.id}.${n++}`; c.id = id; seen.add(id); }
  return clips;
}
