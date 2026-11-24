import { createContext, useContext } from 'react';
import {
  Change,
  Comment,
  ContainerId,
  Photo,
  PersonId,
  Reading,
  containerName,
  container as getContainer,
  PEOPLE,
} from './data';
import { g } from './util';

export type View = 'changes' | 'hypothesis' | 'procedure' | 'data' | 'photos' | 'conclusion' | 'people';

export interface Target {
  key: string;
  kind: 'section' | 'reading' | 'photo' | 'step';
  title: string;
  subtitle?: string;
  owner?: PersonId; // who can edit the underlying thing
  quote?: string;
  defaultTo: PersonId[];
  defaultKind: 'comment' | 'question';
  readingId?: string;
  photoId?: string;
}

export interface Store {
  view: View;
  go: (v: View, opts?: { container?: ContainerId; readingId?: string; photoId?: string }) => void;
  readings: Reading[];
  photos: Photo[];
  history: Change[];
  comments: Comment[];
  reviewed: Set<string>;
  questioned: Set<string>;
  target: Target | null;
  open: (t: Target | null) => void;
  addComment: (c: Omit<Comment, 'id' | 'at' | 'by' | 'replies'>, flagReading?: boolean) => void;
  addReading: (r: Omit<Reading, 'id' | 'at' | 'by'>) => void;
  addPhoto: (p: Omit<Photo, 'id' | 'at' | 'by'>) => void;
  setReviewed: (ids: string[], on: boolean) => void;
  focus: { container: ContainerId; readingId?: string; photoId?: string; nonce: number };
  setFocusContainer: (c: ContainerId) => void;
  toast: (msg: string) => void;
}

export const StoreCtx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(StoreCtx);

export const commentsFor = (all: Comment[], key: string) => all.filter((c) => c.target === key);

// ---------- Target builders ----------
export function readingTarget(r: Reading): Target {
  const c = getContainer(r.container);
  return {
    key: `reading:${r.id}`,
    kind: 'reading',
    title: `${containerName(r.container)} · Day ${r.day}${r.second ? ' (2nd measurement)' : ''}`,
    subtitle: `${c.hasFoam ? g(r.mass) + ' foam · ' : ''}${r.live} live · ${r.dead} dead`,
    owner: r.by,
    defaultTo: [r.by === 'marcus' ? 'temi' : r.by],
    defaultKind: 'question',
    readingId: r.id,
  };
}

export function sectionTarget(section: 'hypothesis' | 'procedure' | 'conclusion', quote?: string): Target {
  const titles = { hypothesis: 'Temi’s hypothesis', procedure: 'Temi’s procedure', conclusion: 'Temi’s conclusion' };
  return {
    key: `section:${section}`,
    kind: 'section',
    title: titles[section],
    owner: 'temi',
    quote,
    defaultTo: ['temi'],
    defaultKind: 'comment',
  };
}

export function stepTarget(n: number): Target {
  return {
    key: `step:${n}`,
    kind: 'step',
    title: `Temi’s procedure · Step ${n}`,
    owner: 'temi',
    defaultTo: ['temi'],
    defaultKind: 'comment',
  };
}

export function photoTarget(p: Photo): Target {
  return {
    key: `photo:${p.id}`,
    kind: 'photo',
    title: `Photo · ${p.caption}`,
    subtitle: `${p.container ? containerName(p.container) : p.site === 'home' ? 'Home' : "Grandma's"} · Day ${p.day} · by ${PEOPLE[p.by].short}`,
    owner: p.by,
    defaultTo: [p.by === 'marcus' ? 'temi' : p.by],
    defaultKind: 'comment',
    photoId: p.id,
  };
}

export function targetFromKey(key: string, s: Pick<Store, 'readings' | 'photos'>): Target | null {
  const [kind, id] = key.split(':');
  if (kind === 'reading') {
    const r = s.readings.find((x) => x.id === id);
    return r ? readingTarget(r) : null;
  }
  if (kind === 'photo') {
    const p = s.photos.find((x) => x.id === id);
    return p ? photoTarget(p) : null;
  }
  if (kind === 'section') return sectionTarget(id as 'hypothesis');
  if (kind === 'step') return stepTarget(Number(id));
  return null;
}
