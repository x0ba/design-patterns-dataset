import {
  REQUIREMENTS, SEEDED_CORRECTIONS, SEEDED_REVIEW_TIMES, NOW_BASE, DEFAULT_INTERNAL_DUE,
  type Requirement, type Review, type PersonId, type Status, type Mand, type DocId, type Candidate, draftSection,
} from './data';

export interface HistoryEntry { at: string; who: 'model' | 'leah'; text: string }

export interface Req extends Requirement {
  review: Review;
  reviewedAt: string | null;
  ai: Requirement; // model's first-pass values
  sourceText: string; // what the source document actually says
  assignee: PersonId | null;
  assignNote: string;
  assignDue: string;
  sentAt: string | null;
  history: HistoryEntry[];
  added?: boolean;
}

export type Panel = null | 'reject' | 'correct' | 'assign';
export type Attention = null | 'quote' | 'lowconf' | 'addendum' | 'passfail';

export interface Filters {
  q: string;
  review: 'all' | 'unreviewed' | 'reviewed';
  statuses: Status[];
  attention: Attention;
  doc: 'all' | DocId;
  mand: 'all' | Mand;
}

export const EMPTY_FILTERS: Filters = { q: '', review: 'all', statuses: [], attention: null, doc: 'all', mand: 'all' };

export type View = 'matrix' | 'gaps' | 'addenda' | 'run';

export interface AppState {
  reqs: Req[];
  selectedId: string;
  view: View;
  filters: Filters;
  panel: Panel;
  verifiedAddenda: Record<string, string>; // key -> time
  addedCandidates: string[];
}

// ── Clock: fixed scenario time that advances with real elapsed time ──
const LOAD = Date.now();
export const now = () => new Date(NOW_BASE.getTime() + (Date.now() - LOAD));
export const timeLabel = (d = now()) =>
  d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

// ── Quote verification ──
const norm = (s: string) =>
  s.toLowerCase().replace(/[‘’“”"]/g, "'").replace(/[^a-z0-9$%.' ]+/g, ' ').replace(/\s+/g, ' ').trim();
export const quoteVerified = (r: Req) => norm(r.sourceText).includes(norm(r.text));

export const isOpenGap = (r: Req) => r.review !== 'removed' && r.status !== 'addressed';
export const isActive = (r: Req) => r.review !== 'removed';
export const isAddendum = (r: Req) => r.doc !== 'RFP' || !!r.supersedes;
export const LOW_CONF = 0.75;

export function matchesAttention(r: Req, a: Attention) {
  switch (a) {
    case 'quote': return !quoteVerified(r);
    case 'lowconf': return r.conf < LOW_CONF;
    case 'addendum': return isAddendum(r);
    case 'passfail': return r.passFail && isOpenGap(r);
    default: return true;
  }
}

export function applyFilters(reqs: Req[], f: Filters) {
  const q = f.q.trim().toLowerCase();
  return reqs.filter((r) => {
    if (f.review === 'unreviewed' && r.review !== 'unreviewed') return false;
    if (f.review === 'reviewed' && r.review === 'unreviewed') return false;
    if (f.statuses.length && !f.statuses.includes(r.status)) return false;
    if (f.doc !== 'all' && r.doc !== f.doc) return false;
    if (f.mand !== 'all' && r.mand !== f.mand) return false;
    if (f.attention && !matchesAttention(r, f.attention)) return false;
    if (q) {
      const hay = `${r.id} ${r.title} ${r.text} ${r.sec} ${r.excerpt ?? ''} ${r.reasoning}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ── Initial state ──
function buildInitial(): Req[] {
  return REQUIREMENTS.map((base, i) => {
    const corr = SEEDED_CORRECTIONS[base.id];
    const ai: Requirement = { ...base, ...(corr?.ai ?? {}) };
    const history: HistoryEntry[] = [{ at: '8:24 AM', who: 'model', text: `Extracted from ${base.doc === 'RFP' ? 'RFP' : base.doc === 'A1' ? 'Addendum 1' : 'Addendum 2'} p.${base.page} and mapped as ${ai.status}.` }];
    let review: Review = 'unreviewed';
    let reviewedAt: string | null = null;
    if (i < 22) {
      reviewedAt = SEEDED_REVIEW_TIMES[i];
      if (corr) {
        review = 'corrected';
        history.push({ at: corr.at, who: 'leah', text: `Corrected. ${corr.note}` });
      } else {
        review = 'accepted';
        history.push({ at: reviewedAt, who: 'leah', text: 'Accepted the model’s mapping.' });
      }
    }
    return {
      ...base,
      review,
      reviewedAt,
      ai,
      sourceText: base.actual ?? base.text,
      ...(review === 'unreviewed' ? ai : {}),
      assignee: null,
      assignNote: '',
      assignDue: DEFAULT_INTERNAL_DUE,
      sentAt: null,
      history,
    } as Req;
  });
}

export const initialState: AppState = {
  reqs: buildInitial(),
  selectedId: 'R-023',
  view: 'matrix',
  filters: EMPTY_FILTERS,
  panel: null,
  verifiedAddenda: {},
  addedCandidates: [],
};

// ── Actions ──
export type Action =
  | { type: 'select'; id: string }
  | { type: 'view'; view: View }
  | { type: 'filters'; filters: Partial<Filters> }
  | { type: 'resetFilters' }
  | { type: 'panel'; panel: Panel }
  | { type: 'accept'; id: string }
  | { type: 'remap'; id: string; draftSec: string; draftPage: number; status: Status; note: string }
  | { type: 'rejectMapping'; id: string; status: Status; note: string; assignTo: PersonId | null }
  | { type: 'correct'; id: string; text: string; mand: Mand; status: Status; note: string }
  | { type: 'remove'; id: string; note: string }
  | { type: 'revert'; id: string }
  | { type: 'assign'; id: string; to: PersonId | null; note?: string; due?: string }
  | { type: 'assignMany'; pairs: { id: string; to: PersonId }[] }
  | { type: 'send'; to: PersonId; ids: string[] }
  | { type: 'restore'; req: Req }
  | { type: 'verifyAddendum'; key: string; on: boolean }
  | { type: 'addCandidate'; c: Candidate };

function update(state: AppState, id: string, fn: (r: Req) => Req): AppState {
  return { ...state, reqs: state.reqs.map((r) => (r.id === id ? fn(r) : r)) };
}

const log = (r: Req, text: string): HistoryEntry[] => [...r.history, { at: timeLabel(), who: 'leah', text }];

export function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'select':
      return { ...state, selectedId: a.id, panel: null };
    case 'view':
      return { ...state, view: a.view, panel: null };
    case 'filters':
      return { ...state, filters: { ...state.filters, ...a.filters } };
    case 'resetFilters':
      return { ...state, filters: EMPTY_FILTERS };
    case 'panel':
      return { ...state, panel: a.panel };
    case 'accept':
      return update(state, a.id, (r) => ({ ...r, review: 'accepted', reviewedAt: timeLabel(), history: log(r, `Accepted: ${r.status}${r.draftSec ? `, mapped to draft §${r.draftSec} p.${r.draftPage}` : ''}.`) }));
    case 'remap': {
      const s = draftSection(a.draftSec)!;
      return {
        ...update(state, a.id, (r) => ({
          ...r, review: 'corrected', reviewedAt: timeLabel(), draftSec: a.draftSec, draftPage: a.draftPage, excerpt: null, basis: undefined, status: a.status,
          history: log(r, `Remapped from ${r.draftSec ? `§${r.draftSec} p.${r.draftPage}` : 'no section'} to §${a.draftSec} ${s.title} p.${a.draftPage}; status ${a.status}.${a.note ? ` Note: ${a.note}` : ''}`),
        })),
        panel: null,
      };
    }
    case 'rejectMapping':
      return {
        ...update(state, a.id, (r) => ({
          ...r, review: 'rejected', reviewedAt: timeLabel(), status: a.status,
          assignee: a.assignTo ?? r.assignee, sentAt: a.assignTo ? null : r.sentAt,
          assignNote: a.assignTo ? a.note : r.assignNote,
          history: log(r, `Rejected the mapping to ${r.draftSec ? `§${r.draftSec} p.${r.draftPage}` : 'the document'}: draft doesn’t answer it. Status set to ${a.status}.${a.note ? ` Note: ${a.note}` : ''}${a.assignTo ? ` Assigned to ${a.assignTo === 'marcus' ? 'Marcus' : a.assignTo === 'priya' ? 'Priya' : a.assignTo === 'tom' ? 'Tom' : 'Janelle'}.` : ''}`),
        })),
        panel: null,
      };
    case 'correct':
      return {
        ...update(state, a.id, (r) => {
          const changes: string[] = [];
          if (a.text !== r.text) changes.push('requirement text');
          if (a.mand !== r.mand) changes.push(`type ${r.mand} → ${a.mand}`);
          if (a.status !== r.status) changes.push(`status ${r.status} → ${a.status}`);
          return {
            ...r, review: 'corrected', reviewedAt: timeLabel(), text: a.text, mand: a.mand, status: a.status,
            history: log(r, `Corrected ${changes.length ? changes.join(', ') : '(no field changes)'}.${a.note ? ` Note: ${a.note}` : ''}`),
          };
        }),
        panel: null,
      };
    case 'remove':
      return {
        ...update(state, a.id, (r) => ({ ...r, review: 'removed', reviewedAt: timeLabel(), assignee: null, history: log(r, `Removed from matrix: not a real requirement.${a.note ? ` Note: ${a.note}` : ''}`) })),
        panel: null,
      };
    case 'revert':
      return update(state, a.id, (r) => ({
        ...r, ...r.ai, review: 'unreviewed', reviewedAt: null, history: log(r, 'Reverted to the model’s first-pass version.'),
      }));
    case 'assign':
      return {
        ...update(state, a.id, (r) => ({
          ...r, assignee: a.to, assignNote: a.note ?? r.assignNote, assignDue: a.due ?? r.assignDue, sentAt: a.to === r.assignee ? r.sentAt : null,
          history: log(r, a.to ? `Assigned to ${nameOf(a.to)}${a.due ? `, due ${a.due}` : ''}.` : `Unassigned from ${r.assignee ? nameOf(r.assignee) : 'nobody'}.`),
        })),
        panel: null,
      };
    case 'assignMany': {
      const m = new Map(a.pairs.map((p) => [p.id, p.to]));
      return {
        ...state,
        reqs: state.reqs.map((r) => (m.has(r.id) ? { ...r, assignee: m.get(r.id)!, sentAt: null, history: log(r, `Assigned to suggested owner ${nameOf(m.get(r.id)!)}.`) } : r)),
      };
    }
    case 'send': {
      const t = timeLabel();
      const ids = new Set(a.ids);
      return { ...state, reqs: state.reqs.map((r) => (ids.has(r.id) ? { ...r, sentAt: t, history: log(r, `Sent to ${nameOf(a.to)} for a fix by ${r.assignDue}.`) } : r)) };
    }
    case 'restore':
      return { ...state, reqs: state.reqs.map((r) => (r.id === a.req.id ? a.req : r)) };
    case 'verifyAddendum': {
      const v = { ...state.verifiedAddenda };
      if (a.on) v[a.key] = timeLabel(); else delete v[a.key];
      return { ...state, verifiedAddenda: v };
    }
    case 'addCandidate': {
      const c = a.c;
      const n = state.reqs.length + 1;
      const id = 'R-' + String(n).padStart(3, '0');
      const base: Requirement = {
        id, doc: c.doc, sec: c.sec, page: c.page, title: c.title, text: c.text, mand: 'Mandatory', crit: c.crit, passFail: c.crit === 'R',
        draftSec: null, draftPage: null, excerpt: null, status: 'missing', conf: 0, reasoning: `Excluded by the model as “${c.reason.toLowerCase()}.” ${c.note} Added back by you, so not yet mapped to the draft.`, suggestedOwner: null,
      };
      const req: Req = {
        ...base, ai: base, sourceText: c.text, review: 'corrected', reviewedAt: timeLabel(), assignee: null, assignNote: '', assignDue: DEFAULT_INTERNAL_DUE, sentAt: null, added: true,
        history: [{ at: '8:24 AM', who: 'model', text: `Excluded (${c.reason.toLowerCase()}).` }, { at: timeLabel(), who: 'leah', text: 'Added to the matrix from the model’s borderline exclusions.' }],
      };
      return { ...state, reqs: [...state.reqs, req], addedCandidates: [...state.addedCandidates, c.key], selectedId: id };
    }
  }
}

export const nameOf = (p: PersonId) =>
  ({ leah: 'Leah', marcus: 'Marcus', priya: 'Priya', tom: 'Tom', janelle: 'Janelle' })[p];

export const docLabel = (d: DocId) => (d === 'RFP' ? 'RFP' : d === 'A1' ? 'Addendum 1' : 'Addendum 2');
export const srcRef = (r: { doc: DocId; sec: string; page: number }) =>
  r.doc === 'RFP' ? `RFP §${r.sec} · p.${r.page}` : `${r.doc === 'A1' ? 'Add. 1' : 'Add. 2'} ${r.sec} · p.${r.page}`;

export function groupKey(r: Req) {
  return r.doc === 'RFP' ? r.sec.split('.')[0].replace(/\(.*$/, '') : r.doc;
}

export function toCSV(reqs: Req[]) {
  const head = ['ID', 'Source', 'Section', 'Page', 'Requirement', 'Type', 'Evaluation', 'Draft section', 'Draft page', 'Status', 'Model confidence', 'Review', 'Owner'];
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = reqs.filter(isActive).map((r) => [
    r.id, docLabel(r.doc), r.sec, r.page, r.text, r.mand, r.crit, r.draftSec ? `§${r.draftSec} ${draftSection(r.draftSec)?.title ?? ''}` : '', r.draftPage ?? '', r.status, r.conf ? r.conf.toFixed(2) : '', r.review, r.assignee ? nameOf(r.assignee) : '',
  ]);
  return [head, ...rows].map((row) => row.map(esc).join(',')).join('\n');
}

export { ADDENDUM_ITEMS } from './data';
import { ADDENDUM_ITEMS as _AI } from './data';
export const ADDENDA_KEYS = _AI.map((i) => i.key);
