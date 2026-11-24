import type { ArchivalItem, Clip, Project, Reel, Scene, Source, Transcript } from './types';
import { LAST_PILOT, NIGHT_FERRY, PEOPLE, SALT_ROAD, type ProjectSpec } from './specs';
import { LAST_PILOT_SOURCES, NIGHT_FERRY_SOURCES, SALT_ROAD_SOURCES } from './stories';
import { buildArchive } from './archive';
import { assignPassages, buildTranscripts, PEOPLE_BY_PROJECT, resolvePassages } from './transcripts';
import { buildClips } from './clips';
import { dur, int, mulberry32, tc } from '../lib/util';

export interface ProjectData {
  project: Project;
  reels: Reel[];
  scenes: Scene[];
  sources: Source[];
  items: ArchivalItem[];
  clips: Clip[];
  transcripts: Transcript[];
}

const HANDWRITTEN: Record<string, Record<number, { synopsis: string; note?: string; dur?: number }>> = {
  'salt-road': {
    21: { dur: 83, synopsis: 'Present-day Gate 4 on a Monday morning: the shift arriving at a wharf running a third of its old traffic. Sets up the picket location before the archive cut.' },
    22: { dur: 69, synopsis: 'Hartwell newsfilm of the March 1974 picket at Gate 4: fire barrel, police line, a reporter working along the picket. Runs under the newsreader’s original voice-over and hands off to Leonard Pike in Scene 23.', note: 'The newsreader voice-over is on the optical track. If Hartwell’s licence does not cover it we mute and re-voice; see the clearance log entry of Nov 9.' },
    23: { dur: 112, synopsis: 'Leonard Pike on the picket night: what the camera pointed at and what it left out. Plays straight after the Hartwell footage, no music under.', note: 'Hold the last frame of Scene 22 for half a second before Pike’s first word.' },
    24: { synopsis: 'Photographs and meeting minutes from the Local 418 hall, laid over room tone recorded in the hall itself.' },
  },
};

const KIND_DUR: Record<string, [number, number]> = { archival: [55, 150], interview: [70, 160], verite: [30, 95], montage: [40, 110], title: [15, 40] };

function buildProject(spec: ProjectSpec, sourceSpecs: Parameters<typeof buildArchive>[1], protectedScenes: number[]): ProjectData {
  const r = mulberry32(spec.seed);
  const project: Project = {
    id: spec.id, title: spec.title, format: spec.format, stage: spec.stage, accent: spec.accent, tint: spec.tint, unit: spec.unit,
    logline: spec.logline, director: spec.director, commissioner: spec.commissioner, updated: spec.updated,
    team: spec.team.map((k) => PEOPLE[k]),
  };
  const scenes: Scene[] = [];
  const reels: Reel[] = [];
  const interviewKeys = new Map<number, string>();
  let n = 0;
  const hand = HANDWRITTEN[spec.id] || {};
  const states = spec.id === 'salt-road'
    ? ['Picture locked', 'Picture locked', 'Fine cut', 'Fine cut', 'Fine cut', 'Fine cut, notes pending']
    : spec.id === 'night-ferry' ? ['Assembly', 'Assembly', 'Assembly', 'Assembly', 'Assembly', 'Not started'] : ['Rough cut'];
  spec.reels.forEach((rs, ri) => {
    let t = 0;
    const nums: number[] = [];
    rs.scenes.forEach(([title, kind, who]) => {
      n++;
      const h = hand[n];
      const [lo, hi] = KIND_DUR[kind];
      const durSec = h?.dur ?? int(r, lo, hi);
      const sc: Scene = {
        project: spec.id, n, reel: ri + 1, title, kind, synopsis: h?.synopsis || '', durSec, startSec: t,
        editor: spec.editors[ri % spec.editors.length], cutState: states[ri], archival: [], note: h?.note,
      };
      scenes.push(sc); nums.push(n); t += durSec;
      if (who) interviewKeys.set(n, who);
    });
    reels.push({ project: spec.id, n: ri + 1, title: rs.title, blurb: rs.blurb, sceneNums: nums, durSec: t });
  });

  assignPassages(spec.id, scenes, interviewKeys, spec.seed);
  const { sources, items } = buildArchive(spec.id, sourceSpecs, scenes, spec.seed + 3, protectedScenes);
  for (const it of items) for (const u of it.usages) scenes.find((s) => s.n === u.sceneN)!.archival.push(it.id);
  const transcripts = buildTranscripts(spec.id, scenes, spec.seed + 4, spec.director);
  resolvePassages(scenes, transcripts);
  const clips = buildClips(spec.id, scenes, items, transcripts, spec.clipTotal, spec.seed);

  // generated synopses
  for (const s of scenes) {
    if (s.synopsis) continue;
    const reelTitle = reels[s.reel - 1].title;
    if (s.kind === 'archival') {
      const srcs = new Set(s.archival.map((id) => items.find((i) => i.id === id)!.sourceId));
      s.synopsis = s.archival.length
        ? `Archival sequence for “${reelTitle}”, built from ${s.archival.length} ${s.archival.length === 1 ? 'item' : 'items'} across ${srcs.size} ${srcs.size === 1 ? 'source' : 'sources'}.`
        : `Archival sequence for “${reelTitle}”. Items still being sourced.`;
    } else if (s.kind === 'interview' && s.passage) {
      const t = transcripts.find((x) => x.id === s.passage!.transcriptId)!;
      s.synopsis = `${t.name} (${t.role.charAt(0).toLowerCase()}${t.role.slice(1)}). Passage ${tc(s.passage.inSec)}–${tc(s.passage.outSec)} from the interview.`;
    } else if (s.kind === 'verite') s.synopsis = 'Observational footage with location sound. No narration.';
    else if (s.kind === 'montage') s.synopsis = 'Montage cut to music temp. Picture and ambience only.';
    else s.synopsis = 'Titles and graphics.';
  }
  return { project, reels, scenes, sources, items, clips, transcripts };
}

export const DATA: Record<string, ProjectData> = {
  'salt-road': buildProject(SALT_ROAD, SALT_ROAD_SOURCES, [22, 23]),
  'night-ferry': buildProject(NIGHT_FERRY, NIGHT_FERRY_SOURCES, []),
  'last-pilot': buildProject(LAST_PILOT, LAST_PILOT_SOURCES, []),
};
export const PROJECTS: Project[] = Object.values(DATA).map((d) => d.project);

export const ME = PEOPLE.ama;
void PEOPLE_BY_PROJECT; void dur;

export function statusOf(it: ArchivalItem) { return it.clearance.status; }
export const STATUS_ORDER = ['cleared-all-media', 'cleared-festival-only', 'pending', 'denied'] as const;
export const STATUS_LABEL: Record<string, string> = {
  'cleared-all-media': 'Cleared, all media',
  'cleared-festival-only': 'Cleared, festival only',
  pending: 'Pending',
  denied: 'Denied',
};
export function festivalOk(s: string) { return s === 'cleared-all-media' || s === 'cleared-festival-only'; }
