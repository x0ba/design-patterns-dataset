import type { ArchivalItem, Clearance, LogEntry, Scene, Source, Status, Usage } from './types';
import type { SourceSpec } from './stories';
import { SOURCE_COUNTS } from './stories';
import { addDays, int, mulberry32, pick, shuffle, type Rng } from '../lib/util';

const ROLL_NOTES_FILM = ['wide establishing coverage', 'closer coverage and action', 'detail and reaction shots', 'reporter piece to camera', 'alternate angle'];
const ROLL_NOTES_PHOTO = ['frame A', 'frame B', 'frame C', 'frame D', 'frame E'];
const ROLL_NOTES_DOC = ['pages 1–2', 'pages 3–4', 'pages 5–6', 'cover and index', 'loose enclosures'];

export function addBusinessDays(iso: string, n: number) {
  let d = iso;
  let left = n;
  while (left > 0) {
    d = addDays(d, 1);
    const wd = new Date(Date.parse(d)).getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

function pad(n: number, w: number) { return String(n).padStart(w, '0'); }

function pickStatus(r: Rng, w: [number, number, number, number]): Status {
  const x = r();
  if (x < w[0]) return 'cleared-all-media';
  if (x < w[0] + w[1]) return 'cleared-festival-only';
  if (x < w[0] + w[1] + w[2]) return 'pending';
  return 'denied';
}

const DENIAL = [
  'Library holds the item under an exclusive licence to a broadcaster until 2028.',
  'Original rights holder could not be traced; library will not license on its behalf.',
  'Contributor estate declined permission for any documentary use.',
  'Item contains third-party music not covered by the library’s licence.',
];

interface Built { sources: Source[]; items: ArchivalItem[] }

export function buildArchive(project: string, specs: SourceSpec[], scenes: Scene[], seed: number, protectedScenes: number[]): Built {
  const r = mulberry32(seed);
  const counts = SOURCE_COUNTS[project];
  const sources: Source[] = specs.map((s) => ({
    id: s.key, project, name: s.name, prefix: s.prefix, kind: s.kind, contact: s.contact, email: s.email, terms: s.terms, turnaround: s.turnaround,
  }));
  const items: ArchivalItem[] = [];
  const usedIds = new Set<string>();
  const sceneStoryCount = new Map<number, number>();

  // ---- decide which stories feed which scene
  const eligible = scenes.filter((s) => !protectedScenes.includes(s.n));
  const weightFor = (s: Scene) => (s.kind === 'archival' ? 6 : s.kind === 'montage' ? 2 : s.kind === 'verite' ? 0.6 : s.kind === 'interview' ? 0.2 : 0);
  const storyScene = new Map<string, number | undefined>();

  const allStories: { spec: SourceSpec; idx: number }[] = [];
  specs.forEach((spec) => spec.stories.forEach((_, idx) => allStories.push({ spec, idx })));
  const key = (sp: SourceSpec, idx: number) => `${sp.key}:${idx}`;

  const reelMatch = (s: Scene, reels: number[]) => reels.includes(s.reel);
  // pass 1: every archival-kind scene gets at least one story
  const archScenes = eligible.filter((s) => s.kind === 'archival');
  const shuffled = shuffle(r, allStories);
  for (const sc of archScenes) {
    const c = shuffled.find((st) => !storyScene.has(key(st.spec, st.idx)) && reelMatch(sc, st.spec.stories[st.idx][3]));
    if (c) { storyScene.set(key(c.spec, c.idx), sc.n); sceneStoryCount.set(sc.n, 1); }
  }
  // pass 2: the rest, weighted
  for (const st of shuffled) {
    const k = key(st.spec, st.idx);
    if (storyScene.has(k)) continue;
    const reels = st.spec.stories[st.idx][3];
    const cands = eligible.filter((s) => reelMatch(s, reels) && weightFor(s) > 0);
    if (!cands.length || r() < 0.08) { storyScene.set(k, undefined); continue; }
    const ws = cands.map((s) => weightFor(s) / (1 + (sceneStoryCount.get(s.n) || 0) * 1.4));
    const tot = ws.reduce((a, b) => a + b, 0);
    let x = r() * tot, ch = cands[0];
    for (let i = 0; i < cands.length; i++) { x -= ws[i]; if (x <= 0) { ch = cands[i]; break; } }
    storyScene.set(k, ch.n);
    sceneStoryCount.set(ch.n, (sceneStoryCount.get(ch.n) || 0) + 1);
  }

  // ---- build items
  specs.forEach((spec, si) => {
    const want = counts[si];
    let made = 0;
    let lastYearBase: Record<number, number> = {};
    let seq = 100 + int(r, 0, 300);
    spec.stories.forEach((story, idx) => {
      const [year, title, rolls, reels] = story;
      let base: number;
      const isStrikePicket = project === 'salt-road' && spec.key === 'hnl' && year === 1974 && title.startsWith('Wharf strike: pickets');
      if (isStrikePicket) { base = 315; lastYearBase[year] = 318; } // rolls 316, 317, 318
      else if (spec.idStyle === 'year') {
        base = (lastYearBase[year] ?? 0) + int(r, 40, 220);
        if (year === 1974 && base >= 300 && base <= 325) base += 40;
        lastYearBase[year] = base;
      } else { seq += int(r, 3, 41); base = seq; }
      const sceneN = storyScene.get(key(spec, idx));
      for (let roll = 1; roll <= rolls; roll++) {
        if (made >= want) break;
        made++;
        const num = base + roll;
        let id: string;
        switch (spec.idStyle) {
          case 'year': id = `${spec.prefix}-${year}-${pad(num, project === 'salt-road' && spec.key === 'mpb' ? 3 : 4)}`; break;
          case 'plain4': id = `${spec.prefix}-${pad(num + 1000, 4)}`; break;
          case 'plain5': id = `${spec.prefix}-${pad(num * 7 + 100, 5)}`; break;
          case 'fc': id = `${spec.prefix}-FC-${pad(num, 3)}`; break;
          default: id = `${spec.prefix}-${pad(num, 3)}`;
        }
        if (usedIds.has(id)) id = id + 'b';
        usedIds.add(id);

        const isPhoto = spec.medium === 'photo' || (spec.medium === 'mixed' && r() < 0.65);
        const isVideo = spec.medium === 'video';
        const notes = isPhoto ? (spec.medium === 'mixed' && /ledger|minutes|roster|leaflet|log|timetable|cards|petition/i.test(title) ? ROLL_NOTES_DOC : ROLL_NOTES_PHOTO) : ROLL_NOTES_FILM;
        let detail = `${rolls > 1 ? `Roll ${roll} of ${rolls}: ` : ''}${notes[(roll - 1) % notes.length]}`;
        let format: string;
        let tone: ArchivalItem['tone'];
        if (isPhoto) {
          format = year < 1940 ? 'Glass-plate scan, 600 dpi' : year < 1990 ? 'B&W print scan, 600 dpi' : 'Digital image, 300 dpi';
          tone = year < 1940 ? 'sepia' : year < 1990 ? 'bw' : 'color';
        } else if (isVideo) {
          format = year < 1995 ? 'U-matic transfer, 4:3' : 'Betacam SP, 4:3';
          tone = 'video';
        } else if (spec.key === 'pfc') {
          format = 'Standard 8mm, silent, colour'; tone = 'color';
        } else {
          const bw = year < 1972 || r() < 0.3;
          format = `16mm ${bw ? 'B&W' : 'colour'}, ${r() < 0.55 ? 'optical sound' : 'silent'}`;
          tone = bw ? 'bw' : 'color';
        }
        const durSec = isPhoto ? 0 : isVideo ? int(r, 90, 520) : int(r, 45, 260);

        // clearance
        let status = pickStatus(r, spec.weights);
        const ref = `${spec.prefix}-LIC-26-${pad(int(r, 100, 899), 4)}`;
        const requestedBy = r() < 0.8 ? 'Joaquín Reyes' : 'Noor Haddad';
        let requestedOn: string | undefined;
        let decidedOn: string | undefined;
        let rights = '';
        let fee: string | undefined;
        let expectedBy: string | undefined;
        let note: string | undefined;
        let clearanceRef = ref;
        const log: LogEntry[] = [];
        const identified = addDays('2026-06-01', int(r, 0, 100));
        let uses: Usage[] = [];

        const special = project === 'salt-road' && id === 'HNL-1974-0317';
        const sib316 = project === 'salt-road' && id === 'HNL-1974-0316';
        const sib318 = project === 'salt-road' && id === 'HNL-1974-0318';
        if (special || sib318) status = 'pending';
        if (sib316) status = 'cleared-festival-only';

        const feeAmt = () => spec.fee ? `USD ${(Math.round(int(r, spec.fee![0], spec.fee![1]) / 5) * 5).toLocaleString('en-US')}` : 'No fee (permission letter)';
        if (special || sib318) {
          requestedOn = '2026-10-28'; rights = 'Festival-only: non-broadcast festival exhibition, worldwide, 3 years'; clearanceRef = 'HNL-LIC-26-0418';
          expectedBy = addBusinessDays('2026-10-28', 15);
        } else if (sib316) {
          requestedOn = '2026-08-19'; decidedOn = '2026-09-02'; rights = 'Festival-only: non-broadcast festival exhibition, worldwide, 3 years'; clearanceRef = 'HNL-LIC-26-0361'; fee = 'USD 780';
        } else if (status === 'pending') {
          requestedOn = addDays('2026-09-28', int(r, 0, 44)); if (requestedOn === '2026-10-28') requestedOn = '2026-10-27';
          rights = r() < 0.6 ? 'Festival-only: non-broadcast festival exhibition, worldwide, 3 years' : 'All media, worldwide, 10 years';
          expectedBy = addBusinessDays(requestedOn, parseInt(spec.turnaround) || 15);
        } else if (status === 'cleared-all-media') {
          requestedOn = addDays('2026-03-02', int(r, 0, 160)); decidedOn = addDays(requestedOn, int(r, 6, 24)); if (decidedOn > '2026-11-14') decidedOn = '2026-11-12';
          rights = year < 1930 || spec.key === 'erl' ? 'Public domain; scan licence, all media' : 'All media, worldwide, in perpetuity'; fee = feeAmt();
        } else if (status === 'cleared-festival-only') {
          requestedOn = addDays('2026-03-02', int(r, 0, 160)); decidedOn = addDays(requestedOn, int(r, 6, 24)); if (decidedOn > '2026-11-14') decidedOn = '2026-11-12';
          rights = 'Festival-only: non-broadcast festival exhibition, worldwide, 3 years'; fee = feeAmt();
        } else {
          requestedOn = addDays('2026-05-04', int(r, 0, 130)); decidedOn = addDays(requestedOn, int(r, 9, 30)); if (decidedOn > '2026-11-14') decidedOn = '2026-11-10';
          rights = 'All media, worldwide'; note = pick(r, DENIAL);
        }

        const clearance: Clearance = { status, ref: clearanceRef, rights, requestedOn, requestedBy, decidedOn, fee, expectedBy, note };

        // usage
        let useScene = sceneN;
        const unusedRoll = r() < 0.18;
        if (special) useScene = 22;
        else if (sib316 || sib318 || unusedRoll) useScene = undefined;
        if (useScene !== undefined) {
          if (special) uses = [{ sceneN: 22, srcIn: 41, srcOut: 93 }];
          else if (durSec === 0) uses = [{ sceneN: useScene, srcIn: 0, srcOut: 0 }];
          else { const a = int(r, 0, Math.max(1, durSec - 40)); uses = [{ sceneN: useScene, srcIn: a, srcOut: Math.min(durSec, a + int(r, 6, 38)) }]; }
        }

        // activity log
        if (special) {
          log.push(
            { date: '2026-09-22', who: 'Noor Haddad', text: 'Pulled from the Hartwell online catalogue as picture reference for Scene 22.' },
            { date: '2026-10-09', who: 'Noor Haddad', text: 'Watermarked screener received. Confirmed this is the night picket at Gate 4. Using source 00:00:41–00:01:33.' },
            { date: '2026-10-21', who: 'Inés Marlow', text: 'Approved in the fine cut. Needs to be cleared for festival submission before locking Reel 3.' },
            { date: '2026-10-28', who: 'Joaquín Reyes', text: 'Festival-only licence request sent to Hartwell licensing, ref HNL-LIC-26-0418. Covers 0317 and 0318.' },
            { date: '2026-11-04', who: 'Hartwell Licensing', text: 'Automated acknowledgement: request is in the queue. Standard turnaround is 15 business days.' },
            { date: '2026-11-09', who: 'Joaquín Reyes', text: 'Asked Hartwell whether the newsreader voice-over on the optical track is covered by the same licence. No reply yet.' },
          );
        } else {
          log.push({ date: identified, who: requestedBy === 'Noor Haddad' ? 'Noor Haddad' : 'Joaquín Reyes', text: useScene ? `Identified for Scene ${useScene}.` : 'Logged as a candidate during archive research.' });
          if (requestedOn) log.push({ date: requestedOn, who: requestedBy, text: `Licence request sent to ${spec.name}.` });
          if (decidedOn) log.push({ date: decidedOn, who: spec.name.split(' ')[0] + ' ' + (status === 'denied' ? 'declined' : 'confirmed'), text: status === 'denied' ? (note || 'Request declined.') : `Licence issued: ${rights}${fee ? `. Fee ${fee}.` : '.'}` });
          log.sort((a, b) => a.date.localeCompare(b.date));
        }
        if (sib316) log.splice(0, log.length, { date: '2026-08-19', who: 'Joaquín Reyes', text: 'Festival-only request sent to Hartwell (ref HNL-LIC-26-0361). 0316 only.' }, { date: '2026-09-02', who: 'Hartwell Licensing', text: 'Licence issued, festival-only. Fee USD 780.' });

        items.push({
          id, project, sourceId: spec.key, title, detail, year,
          date: `${year}`, format, durSec, story: `${spec.key}:${idx}`, roll, rollCount: rolls, clearance, usages: uses, log, tone,
        });
        void reels;
      }
    });
  });

  // special-case title/detail for the focal item
  const focal = items.find((i) => i.id === 'HNL-1974-0317');
  if (focal) {
    focal.title = 'Wharf strike: pickets at Gate 4, night';
    focal.detail = 'Roll 2 of 3: closer coverage and action. Night exterior, fire barrel and picket line, police line at the gate, reporter voice-over on the optical track.';
    focal.date = '1974-03-12';
    focal.durSec = 168;
    focal.format = '16mm B&W, optical sound';
    focal.tone = 'bw';
  }
  return { sources, items };
}
