import type { Passage, Scene, Transcript, Turn } from './types';
import { addDays, int, mulberry32, shuffle, type Rng } from '../lib/util';
import { pikeTurns } from './pike';

type Topic = 'local' | 'scholar' | 'ferry' | 'pilot';
interface P { key: string; name: string; role: string; topic: Topic; place: string }

const QA: Record<Topic, [string, string][]> = {
  local: [
    ['How would you describe the place you grew up?', 'Small enough that you knew whose boots were by which door. Everything ran on the tide table and the shift rota, and if you’d lost track of both you’d lost track of the week.'],
    ['What did an ordinary working day look like?', 'Up before it was light, tea standing up, and you’d be at the gate for the six-forty whistle. Nobody needed a clock. The whole town moved at the same time.'],
    ['What do you remember about the strike?', 'That it was quiet at first. People think of shouting, but mostly it was standing about in the cold, working out who could lend whom a week’s rent. The shouting was for the cameras.'],
    ['Who held things together?', 'The women, honestly. The strike kitchen fed sixty on a good day and nobody was ever thanked for it in the papers.'],
    ['What changed when the containers came?', 'A ship that used to need forty men for three days needed eight men for one. You can call that progress, I’ve heard it called that. Say it to the man who’s just been told.'],
    ['How did the town change after the works closed?', 'It went quiet in the wrong way. The whistle stopped, and for a month people kept glancing at their wrists at twenty to seven.'],
    ['Did the flood change how people saw the town?', 'We’d always assumed the water was on our side because it paid us. Nineteen-ninety reminded everybody it wasn’t on anybody’s side.'],
    ['What would you want people to know about the road?', 'That it wasn’t built for us. It was built for the salt, and we happened to live along it. But we made it ours, which is a different thing.'],
    ['Is there an object you kept?', 'My father’s tally stick, cut with a penknife. He’d say four hundred notches on a good day, though I never believed him.'],
    ['What do you hope happens to the wharf?', 'Something with people in it. A museum’s all right, but a tide table needs somebody to read it.'],
    ['How does it feel to talk about it now?', 'Strange. Fifty years on and I can still tell you which gate the wind came through.'],
    ['Anything you’d like to add?', 'Only that when you’ve finished, come back and tell us how it ends. We’d all like to know.'],
  ],
  scholar: [
    ['Why does the Salt Road matter beyond Halloran?', 'Because it’s an unusually clean example of infrastructure creating a place, and then a place outliving its infrastructure. Most towns don’t get to watch both halves happen inside one lifetime.'],
    ['What do the records tell us about the 1974 dispute?', 'That it was about overtime on paper and about being counted on a ledger. Those are different arguments, and both sides spent weeks having the wrong one.'],
    ['How reliable are the surviving accounts?', 'Every account is partial. The newsfilm gives you the loudest ten minutes of a three-week dispute, the union minutes give you the arithmetic, and neither gives you the kitchen.'],
    ['What’s changed in how we look at industrial towns?', 'We used to talk about decline. Now we talk about what remains, which is a more useful question.'],
    ['What does the estuary look like now?', 'Remarkably alive. Waders on the old pans in winter, eelgrass coming back along Pier 2. Salt turns out to be a landscape, not just a product.'],
    ['What should audiences take away?', 'That the people in these films weren’t waiting to become history. They were arguing about Tuesday.'],
  ],
  ferry: [
    ['What is a crossing like at three in the morning?', 'Quiet, and slower than you expect. Everyone aboard has a reason to be awake and nobody asks what it is.'],
    ['Why do people still take the night boat?', 'Because it’s the one place the mainland can’t reach you. The signal drops at the headland, and you can feel the whole deck exhale.'],
    ['What’s the hardest part of the job?', 'Fog. Not the danger of it, the waiting. You hold the ship still in a white room for four hours and then it lifts as if nothing happened.'],
    ['What would be lost if it stopped?', 'More than a timetable. The island would still be there, but it would be further away.'],
    ['Tell me about a crossing you remember.', 'A February one, gale force eight, a full freight deck and a baby born in cabin 9. We were four minutes from the harbour wall. She’s at secondary school now.'],
    ['How has the crossing changed?', 'The ferries have got newer and the passengers have got older. The sea’s exactly the same.'],
    ['Anything you’d like to add?', 'Come across on a Thursday. You’ll see.'],
  ],
  pilot: [
    ['What does a pilot actually do?', 'You borrow a ship for forty minutes. The captain has the command and the insurance, you have the channel, and you have to know it better than anyone on board knows anything.'],
    ['How do you learn a channel?', 'Slowly, and wrongly at first. You learn where the water goes when it’s angry and where the mud shifts after a storm. It’s not in any chart.'],
    ['What will you miss?', 'The ladder at dawn. You climb up out of a small boat onto a big one, and for a minute everything is very clear.'],
    ['Is there a day you remember?', 'The first one. I was twenty-six and the captain asked if I was the pilot or the pilot’s daughter. I said both, and he let me bring her in.'],
    ['What’s the future of pilotage?', 'More screens and fewer ladders. But the water will still want someone who’s afraid of it, a bit.'],
  ],
};

const SALT: P[] = [
  { key: 'pike', name: 'Leonard Pike', role: 'Retired dockworker, Halloran wharf 1961–1996', topic: 'local', place: 'Pike residence, Port Halloran' },
  { key: 'abboud', name: 'Marguerite Abboud', role: 'Retired salt-works chemist', topic: 'local', place: 'Abboud residence, Ketterick' },
  { key: 'osei', name: 'Hattie Osei', role: 'President, Dockworkers’ Local 418', topic: 'local', place: 'Local 418 hall, Quay Lane' },
  { key: 'teague', name: 'Rosalind Teague', role: 'Daughter of the Local 418 bookkeeper', topic: 'local', place: 'Teague kitchen, Dock Street' },
  { key: 'zhao', name: 'Dr. Wen Zhao', role: 'Maritime historian, Estuary State University', topic: 'scholar', place: 'University office, Estuary State' },
  { key: 'duffield', name: 'Walter Duffield', role: 'Former Hartwell newsfilm cameraman', topic: 'local', place: 'Duffield home, Marrow Heights' },
  { key: 'rook', name: 'Anneliese Rook', role: 'Journalist, the Halloran Courier (1970s)', topic: 'local', place: 'Courier newsroom archive' },
  { key: 'okonkwo', name: 'Desmond Okonkwo', role: 'Former Halloran harbour board member', topic: 'local', place: 'Customs House, Halloran' },
  { key: 'herrera', name: 'Tomás Herrera', role: 'Crane operator, Halloran wharf (current)', topic: 'local', place: 'Crane 7 cab, Halloran wharf' },
  { key: 'lindqvist', name: 'Birgit Lindqvist', role: 'Collections manager, Calder County Historical Society', topic: 'scholar', place: 'Historical Society reading room' },
  { key: 'nambiar', name: 'Dr. Priya Nambiar', role: 'Estuary ecologist, Marrow Bay Trust', topic: 'scholar', place: 'Marrow Bay Trust field station' },
  { key: 'castellanos', name: 'Evelyn Castellanos', role: 'Retired Halloran Market trader', topic: 'local', place: 'Halloran Market' },
  { key: 'pettigrew', name: 'Gus Pettigrew', role: 'Former crane operator, Pier 2', topic: 'local', place: 'Pettigrew garage, Eastgate' },
  { key: 'siddiqui', name: 'Farah Siddiqui', role: 'Halloran Courier photographer (1970s)', topic: 'local', place: 'Siddiqui studio, Dock Street' },
  { key: 'tuckett', name: 'Rev. Alan Tuckett', role: 'Chaplain, Halloran Seamen’s Mission', topic: 'local', place: 'Seamen’s Mission chapel' },
  { key: 'adeyemi', name: 'Oluwaseun Adeyemi', role: 'Retired port health inspector', topic: 'local', place: 'Adeyemi residence, Eastgate' },
  { key: 'kowalczyk', name: 'Marian Kowalczyk', role: 'Laboratory technician, Ketterick works', topic: 'local', place: 'Ketterick works laboratory' },
  { key: 'garrity', name: 'Bill Garrity', role: 'Retired treasurer, Local 418', topic: 'local', place: 'Local 418 hall, Quay Lane' },
  { key: 'archambault', name: 'Delphine Archambault', role: 'Harbour board secretary in the 1970s', topic: 'local', place: 'Archambault residence, Marrow Heights' },
  { key: 'varghese', name: 'Sunil Varghese', role: 'Former reporter, Meridian Public Broadcasting', topic: 'local', place: 'Meridian PB newsroom' },
  { key: 'fitch', name: 'Lorna Fitch', role: 'Owner, the Quay Café, Dock Street', topic: 'local', place: 'The Quay Café' },
  { key: 'donoghue', name: 'Mick Donoghue', role: 'Salt truck driver, Route 9', topic: 'local', place: 'Cab of a salt truck, Route 9' },
  { key: 'elamin', name: 'Yasmin El-Amin', role: 'Volunteer, Marrow Bay Trust', topic: 'scholar', place: 'Marrow Bay saltmarsh' },
  { key: 'brandt', name: 'Harold Brandt', role: 'Retired harbour pilot', topic: 'local', place: 'Brandt residence, Pier Road' },
  { key: 'mbeki', name: 'Cecily Mbeki', role: 'First woman on the Local 418 tally desk', topic: 'local', place: 'Mbeki residence, Eastgate' },
  { key: 'pascoe', name: 'Ivor Pascoe', role: 'Former Hartwell newsfilm sound recordist', topic: 'local', place: 'Pascoe home, Calder' },
  { key: 'roe', name: 'Tamsin Roe', role: 'Halloran town councillor', topic: 'local', place: 'Halloran Town Hall' },
  { key: 'ackroyd', name: 'Dennis Ackroyd', role: 'Foreman, Ketterick salt works', topic: 'local', place: 'Ketterick works canteen' },
  { key: 'gallagher', name: 'Noreen Gallagher', role: 'Dock Street resident, 1990 flood', topic: 'local', place: 'Gallagher front room, Dock Street' },
  { key: 'mensah', name: 'Kwabena Mensah', role: 'Container terminal supervisor, Pier 4', topic: 'local', place: 'Pier 4 terminal office' },
  { key: 'sandvik', name: 'Hilde Sandvik', role: 'Coastal geographer, Estuary State University', topic: 'scholar', place: 'University field lab' },
  { key: 'dinapoli', name: 'Frank DiNapoli', role: 'Ice-cream seller on the quay', topic: 'local', place: 'The quay, Halloran' },
  { key: 'whitaker', name: 'Joan Whitaker', role: 'Strike kitchen volunteer, 1974', topic: 'local', place: 'Whitaker residence, Eastgate' },
  { key: 'lamont', name: 'Percy Lamont', role: 'Wharf watchman, retired', topic: 'local', place: 'Lamont allotment, Marrow Heights' },
  { key: 'reddy', name: 'Anita Reddy', role: 'Teacher, Halloran Primary School', topic: 'local', place: 'Halloran Primary School' },
  { key: 'bergstrom', name: 'Silas Bergstrom', role: 'Brewer, Kettle & Salt', topic: 'local', place: 'Kettle & Salt brewery' },
  { key: 'orourke', name: 'Maeve O’Rourke', role: 'Retired customs officer', topic: 'local', place: 'Customs House, Halloran' },
  { key: 'quinn', name: 'Rafael Quinn', role: 'Marine surveyor', topic: 'local', place: 'Pier 2 office' },
  { key: 'pym', name: 'Dorothea Pym', role: 'Church warden, St. Brendan’s', topic: 'local', place: 'St. Brendan’s church hall' },
  { key: 'strachan', name: 'Ewan Strachan', role: 'Tugboat skipper', topic: 'local', place: 'Tug Halloran Belle' },
  { key: 'mokoena', name: 'Thandi Mokoena', role: 'Organiser, Dockworkers’ Federation', topic: 'local', place: 'Federation office, Estuary' },
];

const FERRY: P[] = [
  { key: 'szabo', name: 'Captain Imre Szabo', role: 'Master, MV Karrow Maid', topic: 'ferry', place: 'Bridge, MV Karrow Maid' },
  { key: 'fairweather', name: 'Odette Fairweather', role: 'Head cook, ferry galley', topic: 'ferry', place: 'Galley, MV Karrow Maid' },
  { key: 'rahimi', name: 'Dalia Rahimi', role: 'First officer', topic: 'ferry', place: 'Bridge, MV Karrow Maid' },
  { key: 'calloway', name: 'Dermot Calloway', role: 'Haulier, Karrow Island', topic: 'ferry', place: 'Freight deck' },
  { key: 'moberg', name: 'Ingrid Moberg', role: 'Passenger, cabin 214, every Thursday', topic: 'ferry', place: 'Cabin 214' },
  { key: 'oyelaran', name: 'Bram Oyelaran', role: 'Chair, Karrow Island Council', topic: 'ferry', place: 'Karrow Council chamber' },
  { key: 'pellegrino', name: 'Joss Pellegrino', role: 'Deckhand', topic: 'ferry', place: 'Vehicle deck' },
  { key: 'ostrowski', name: 'Mei-Lin Ostrowski', role: 'Purser', topic: 'ferry', place: 'Purser’s office' },
  { key: 'achebe', name: 'Raymond Achebe', role: 'Chief engineer', topic: 'ferry', place: 'Engine room' },
  { key: 'brandvold', name: 'Katya Brandvold', role: 'Cabin steward', topic: 'ferry', place: 'Cabin corridor, deck 3' },
  { key: 'pryce', name: 'Stanley Pryce', role: 'Retired master, 1979–2008', topic: 'ferry', place: 'Pryce residence, Karrow' },
  { key: 'dewit', name: 'Hanneke de Wit', role: 'Passenger, medical student', topic: 'ferry', place: 'Passenger lounge' },
  { key: 'armitage', name: 'Lewis Armitage', role: 'Island postmaster', topic: 'ferry', place: 'Karrow post office' },
  { key: 'obi', name: 'Nkechi Obi', role: 'Nurse, commuting passenger', topic: 'ferry', place: 'Passenger lounge' },
  { key: 'rowlands', name: 'Gareth Rowlands', role: 'Coastguard watch officer', topic: 'ferry', place: 'Coastguard station' },
  { key: 'halvorsen', name: 'Tove Halvorsen', role: 'Ferry historian', topic: 'scholar', place: 'Karrow Island Museum' },
  { key: 'warsame', name: 'Abdi Warsame', role: 'Galley hand', topic: 'ferry', place: 'Galley, MV Karrow Maid' },
  { key: 'marchetti', name: 'Colette Marchetti', role: 'Island baker', topic: 'ferry', place: 'Marchetti bakery, Karrow' },
];

const PILOT: P[] = [
  { key: 'aldous', name: 'Gwen Aldous', role: 'Harbour pilot, 34 years', topic: 'pilot', place: 'Pilot cutter Marrow Star' },
  { key: 'naidoo', name: 'Tarek Naidoo', role: 'Harbour master, Westmark Port', topic: 'pilot', place: 'Harbour master’s office' },
  { key: 'margit', name: 'Margit Aldous', role: 'Gwen’s sister', topic: 'pilot', place: 'Aldous family kitchen' },
  { key: 'okoro', name: 'Ben Okoro', role: 'Coxswain, pilot cutter Marrow Star', topic: 'pilot', place: 'Pilot cutter Marrow Star' },
  { key: 'draper', name: 'Sheila Draper', role: 'Retired harbour master', topic: 'pilot', place: 'Draper residence, Westmark' },
];

export const PEOPLE_BY_PROJECT: Record<string, P[]> = { 'salt-road': SALT, 'night-ferry': FERRY, 'last-pilot': PILOT };

function words(s: string) { return s.split(/\s+/).length; }

export function buildTranscripts(project: string, scenes: Scene[], seed: number, interviewer: string): Transcript[] {
  const r = mulberry32(seed);
  const people = PEOPLE_BY_PROJECT[project];
  const out: Transcript[] = [];
  people.forEach((p, i) => {
    const id = `${p.key}`;
    const isPike = project === 'salt-road' && p.key === 'pike';
    const durSec = isPike ? 6750 : int(r, 38, 96) * 60 + int(r, 0, 59);
    const span = { 'salt-road': ['2025-03-04', 360], 'night-ferry': ['2026-01-12', 200], 'last-pilot': ['2026-08-03', 30] }[project] as [string, number];
    const recorded = isPike ? '2025-09-18' : addDays(span[0], (i * 37 + 11) % span[1]);
    let turns: Turn[];
    if (isPike) turns = pikeTurns();
    else {
      const pool = QA[p.topic];
      const k = Math.min(pool.length, int(r, 6, Math.min(10, pool.length)));
      const idxs = shuffle(r, [...pool.keys()]).slice(0, k).sort((a, b) => a - b);
      turns = [];
      idxs.forEach((qi, j) => {
        const base = 100 + Math.floor(((durSec - 260) * j) / k) + int(r, 0, 90);
        const [q, a] = pool[qi];
        turns.push({ start: base, end: base + 7, who: 'I', text: q });
        turns.push({ start: base + 10, end: base + 10 + Math.round(words(a) / 2.4), who: 'S', text: a });
      });
    }
    const usedIn: Transcript['usedIn'] = [];
    scenes.filter((s) => s.passage?.transcriptId === id && s.passage.inSec >= 0).forEach((s) => usedIn.push({ sceneN: s.n, inSec: s.passage!.inSec, outSec: s.passage!.outSec }));
    const status: Transcript['status'] = i % 17 === 13 ? 'In transcription' : i % 7 === 5 ? 'Transcribed' : 'Reviewed';
    out.push({
      id, project, name: p.name, role: p.role, recorded, location: p.place, durSec, interviewer,
      media: `INT_${p.key.toUpperCase().slice(0, 10)}_A001 · B001`, turns, usedIn, status,
    });
  });
  return out;
}

// Assign passages to interview scenes. Pike's three are fixed; others use one answer turn.
export function assignPassages(project: string, scenes: Scene[], specKeys: Map<number, string>, seed: number) {
  const r = mulberry32(seed + 5);
  const people = PEOPLE_BY_PROJECT[project];
  const turnsCache = new Map<string, Turn[]>();
  const rr: Rng = r;
  void rr; void turnsCache; void people;
  for (const s of scenes) {
    const key = specKeys.get(s.n);
    if (!key) continue;
    if (project === 'salt-road' && key === 'pike') {
      if (s.n === 11) s.passage = { transcriptId: 'pike', inSec: 19 * 60 + 12, outSec: 20 * 60 + 4 };
      else if (s.n === 23) s.passage = { transcriptId: 'pike', inSec: 3600 + 12 * 60 + 40, outSec: 3600 + 14 * 60 + 5 };
      else if (s.n === 62) s.passage = { transcriptId: 'pike', inSec: 3600 + 38 * 60 + 20, outSec: 3600 + 39 * 60 + 15 };
    } else s.passage = { transcriptId: key, inSec: -1, outSec: -1 }; // resolved after transcripts are built
  }
}

export function resolvePassages(scenes: Scene[], transcripts: Transcript[]) {
  const byId = new Map(transcripts.map((t) => [t.id, t]));
  const used = new Map<string, number>();
  for (const s of scenes) {
    if (!s.passage || s.passage.inSec >= 0) continue;
    const t = byId.get(s.passage.transcriptId)!;
    const answers = t.turns.filter((x) => x.who === 'S');
    const n = used.get(t.id) || 0;
    used.set(t.id, n + 1);
    const a = answers[(n * 2 + 1) % answers.length];
    s.passage = { transcriptId: t.id, inSec: a.start, outSec: a.end };
    t.usedIn.push({ sceneN: s.n, inSec: a.start, outSec: a.end });
  }
  for (const t of transcripts) t.usedIn.sort((a, b) => a.sceneN - b.sceneN);
}

export type { Passage };
