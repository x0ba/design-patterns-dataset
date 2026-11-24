import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { Card, CardFields, Change, Comment, DeckId, PersonId, Rule, Section, Session, Suggestion, View } from './types';
import { buildSections, buildState } from './data/seed';
import { CARD_ROWS, DECK_ORDER } from './data/cards';
import { slug } from './data/seed';
import { nowV } from './lib/time';
import { wordCount } from './lib/diff';

export interface Toast { id: number; msg: string; undo?: State }
export interface State {
  view: View;
  deck: DeckId;
  cardId: string;
  ruleId: string;
  commentId: string | null;
  sessionId: string;
  cards: Record<string, Card>;
  rules: Record<string, Rule>;
  sections: Section[];
  changes: Change[];
  comments: Comment[];
  suggestion: Suggestion;
  sessions: Session[];
  drafts: Record<string, Partial<CardFields>>;
  notify: Record<string, boolean>;
  printOpen: boolean;
  toast: Toast | null;
  seq: number;
}

export type Action =
  | { type: 'view'; view: View }
  | { type: 'selectDeck'; deck: DeckId }
  | { type: 'selectCard'; id: string }
  | { type: 'openCard'; id: string }
  | { type: 'openRule'; id: string }
  | { type: 'selectRule'; id: string }
  | { type: 'openComment'; id: string }
  | { type: 'draft'; id: string; patch: Partial<CardFields> }
  | { type: 'discard'; id: string }
  | { type: 'save'; id: string }
  | { type: 'seen'; id?: string }
  | { type: 'revert'; id: string }
  | { type: 'reply'; commentId: string; text: string; resolve: boolean }
  | { type: 'setResolved'; commentId: string; resolved: boolean }
  | { type: 'addComment'; anchor: Comment['anchor']; text: string }
  | { type: 'accept'; resolveSam: boolean }
  | { type: 'reject'; note: string }
  | { type: 'reopenSuggestion' }
  | { type: 'saveRule'; id: string; text: string }
  | { type: 'addNote'; sessionId: string; text: string; tags: string[] }
  | { type: 'selectSession'; id: string }
  | { type: 'notify'; id: string }
  | { type: 'print'; open: boolean }
  | { type: 'undo' }
  | { type: 'dismissToast' };

export const firstCardOf = (cards: Record<string, Card>, deck: DeckId) =>
  slug(CARD_ROWS[deck][0][0]) in cards ? slug(CARD_ROWS[deck][0][0]) : Object.values(cards).find((c) => c.deck === deck)!.id;

function init(): State {
  const seed = buildState();
  return {
    view: 'cards',
    deck: 'ships',
    cardId: 'brigantine-dawn',
    ruleId: '4.2',
    commentId: 'k1',
    sessionId: 's6',
    ...seed,
    sections: buildSections(),
    // Hollis is partway through rewriting Brigantine Dawn (unsaved, from 2:41 pm)
    drafts: { 'brigantine-dawn': { effect: 'Hold 3. When this ship docks, draw 2 Market cards and keep 1.' } },
    notify: {},
    printOpen: false,
    toast: null,
    seq: 100,
  };
}

const withToast = (prev: State, next: State, msg: string, undoable = false): State => ({
  ...next,
  toast: { id: next.seq + 1, msg, undo: undoable ? { ...prev, toast: null } : undefined },
  seq: next.seq + 1,
});

const same = (a: unknown, b: unknown) => a === b;

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'view':
      return { ...s, view: a.view };
    case 'selectDeck':
      return { ...s, deck: a.deck, cardId: firstCardOf(s.cards, a.deck) };
    case 'selectCard':
      return { ...s, cardId: a.id };
    case 'openCard': {
      const c = s.cards[a.id];
      return { ...s, view: 'cards', deck: c.deck, cardId: a.id };
    }
    case 'openRule':
      return { ...s, view: 'rulebook', ruleId: a.id };
    case 'selectRule':
      return { ...s, ruleId: a.id };
    case 'openComment':
      return { ...s, view: 'comments', commentId: a.id };
    case 'selectSession':
      return { ...s, sessionId: a.id };
    case 'draft': {
      const card = s.cards[a.id];
      const merged: Partial<CardFields> = { ...s.drafts[a.id], ...a.patch };
      (Object.keys(merged) as (keyof CardFields)[]).forEach((k) => {
        if (same(merged[k], card[k])) delete merged[k];
      });
      const drafts = { ...s.drafts };
      if (Object.keys(merged).length) drafts[a.id] = merged;
      else delete drafts[a.id];
      return { ...s, drafts };
    }
    case 'discard': {
      const drafts = { ...s.drafts };
      delete drafts[a.id];
      return { ...s, drafts };
    }
    case 'save': {
      const card = s.cards[a.id];
      const d = s.drafts[a.id];
      if (!d || card.live) return s;
      const t = nowV();
      const made: Change[] = [];
      (['cost', 'effect', 'flavor'] as const).forEach((f) => {
        if (d[f] === undefined) return;
        made.push({
          id: `n${s.seq}${f}`, at: t, by: 'hollis', kind: 'card', target: card.id, field: f,
          before: String(card[f] ?? ''), after: String(d[f] ?? ''), vFrom: card.version, vTo: card.version + 1, seen: true,
        });
      });
      const cards = {
        ...s.cards,
        [card.id]: {
          ...card, ...d, version: card.version + 1, editor: 'hollis' as PersonId, edited: t,
        },
      };
      const drafts = { ...s.drafts };
      delete drafts[a.id];
      return withToast(s, { ...s, cards, drafts, changes: [...made, ...s.changes], seq: s.seq + 1 }, `Saved ${card.name} as v${card.version + 1}`, true);
    }
    case 'seen': {
      const changes = s.changes.map((c) => (a.id ? (c.id === a.id ? { ...c, seen: true } : c) : { ...c, seen: true }));
      return { ...s, changes };
    }
    case 'revert': {
      const ch = s.changes.find((c) => c.id === a.id);
      if (!ch || ch.reverted) return s;
      const t = nowV();
      if (ch.kind === 'card') {
        const card = s.cards[ch.target];
        if (card.live) return withToast(s, s, `${card.name} is open in Jun’s editor right now. Try again once he saves.`);
        const cur = ch.field === 'cost' ? String(card.cost) : (card[ch.field as 'effect' | 'flavor'] as string);
        if (cur !== ch.after) return withToast(s, s, `Can’t revert: ${card.name} has changed since this edit.`);
        const val = ch.field === 'cost' ? Number(ch.before) : ch.before;
        const nextCard = { ...card, [ch.field]: val, version: card.version + 1, editor: 'hollis' as PersonId, edited: t };
        const rec: Change = { id: `n${s.seq}`, at: t, by: 'hollis', kind: 'card', target: card.id, field: ch.field, before: ch.after, after: ch.before, vFrom: card.version, vTo: card.version + 1, seen: true, note: 'Reverted a change' };
        const drafts = { ...s.drafts };
        if (drafts[card.id]) delete (drafts[card.id] as Record<string, unknown>)[ch.field];
        return withToast(s, {
          ...s, cards: { ...s.cards, [card.id]: nextCard }, drafts,
          changes: [rec, ...s.changes.map((c) => (c.id === ch.id ? { ...c, reverted: true, seen: true } : c))], seq: s.seq + 1,
        }, `Reverted ${card.name} to v${card.version - 1} text`, true);
      }
      const rule = s.rules[ch.target];
      if (rule.text !== ch.after) return withToast(s, s, `Can’t revert: rule ${rule.id} has changed since this edit.`);
      const rec: Change = { id: `n${s.seq}`, at: t, by: 'hollis', kind: 'rule', target: rule.id, field: 'text', before: ch.after, after: ch.before, seen: true, note: 'Reverted a change' };
      return withToast(s, {
        ...s, rules: { ...s.rules, [rule.id]: { ...rule, text: ch.before } },
        changes: [rec, ...s.changes.map((c) => (c.id === ch.id ? { ...c, reverted: true, seen: true } : c))], seq: s.seq + 1,
      }, `Reverted rule ${rule.id}`, true);
    }
    case 'reply': {
      const comments = s.comments.map((c) =>
        c.id === a.commentId
          ? { ...c, status: a.resolve ? ('resolved' as const) : c.status, replies: [...c.replies, { by: 'hollis' as PersonId, at: nowV(), text: a.text }] }
          : c,
      );
      return withToast(s, { ...s, comments }, a.resolve ? 'Replied and resolved' : 'Reply posted');
    }
    case 'setResolved': {
      const comments = s.comments.map((c) => (c.id === a.commentId ? { ...c, status: a.resolved ? ('resolved' as const) : ('open' as const) } : c));
      return withToast(s, { ...s, comments }, a.resolved ? 'Marked resolved' : 'Reopened', true);
    }
    case 'addComment': {
      const c: Comment = { id: `k${s.seq}`, author: 'hollis', at: nowV(), anchor: a.anchor, text: a.text, status: 'open', replies: [] };
      return withToast(s, { ...s, comments: [c, ...s.comments], seq: s.seq + 1 }, 'Note added');
    }
    case 'accept': {
      const sg = s.suggestion;
      if (sg.status !== 'pending') return s;
      const rule = s.rules[sg.ruleId];
      const t = nowV();
      const rec: Change = { id: `n${s.seq}`, at: t, by: 'hollis', kind: 'rule', target: rule.id, field: 'text', before: rule.text, after: sg.proposed, seen: true, note: 'Accepted Jun’s suggested rewrite' };
      let comments = s.comments;
      if (a.resolveSam)
        comments = comments.map((c) =>
          c.status === 'open' && c.author === 'sam' && c.anchor.kind === 'rule' && c.anchor.id === rule.id
            ? { ...c, status: 'resolved' as const, replies: [...c.replies, { by: 'hollis' as PersonId, at: t, text: 'Answered in Jun’s rewrite of 4.2: ships dock in turn order starting with the first player. It’s in the next version.' }] }
            : c,
        );
      return withToast(s, {
        ...s, comments, suggestion: { ...sg, status: 'accepted' },
        rules: { ...s.rules, [rule.id]: { ...rule, text: sg.proposed } }, changes: [rec, ...s.changes], seq: s.seq + 1,
      }, `Accepted Jun’s rewrite of rule ${rule.id}`, true);
    }
    case 'reject':
      return withToast(s, { ...s, suggestion: { ...s.suggestion, status: 'rejected', note: a.note } }, 'Suggestion rejected. Jun will see your reason.', true);
    case 'reopenSuggestion':
      return { ...s, suggestion: { ...s.suggestion, status: 'pending', note: undefined } };
    case 'saveRule': {
      const rule = s.rules[a.id];
      if (rule.text === a.text) return s;
      const rec: Change = { id: `n${s.seq}`, at: nowV(), by: 'hollis', kind: 'rule', target: rule.id, field: 'text', before: rule.text, after: a.text, seen: true };
      return withToast(s, { ...s, rules: { ...s.rules, [rule.id]: { ...rule, text: a.text } }, changes: [rec, ...s.changes], seq: s.seq + 1 }, `Saved rule ${rule.id}`, true);
    }
    case 'addNote': {
      const sessions = s.sessions.map((x) =>
        x.id === a.sessionId ? { ...x, notes: [...x.notes, { by: 'hollis', at: nowV(), text: a.text, tags: a.tags }] } : x,
      );
      return withToast(s, { ...s, sessions }, 'Note added to the playtest log');
    }
    case 'notify':
      return withToast(s, { ...s, notify: { ...s.notify, [a.id]: !s.notify[a.id] } }, s.notify[a.id] ? 'Okay, no ping' : 'We’ll ping you when Jun saves it');
    case 'print':
      return { ...s, printOpen: a.open };
    case 'undo':
      return s.toast?.undo ? { ...s.toast.undo, view: s.view, deck: s.deck, cardId: s.cardId, ruleId: s.ruleId, commentId: s.commentId, sessionId: s.sessionId, printOpen: s.printOpen, toast: null } : s;
    case 'dismissToast':
      return { ...s, toast: null };
  }
}

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}
export const useApp = () => useContext(Ctx)!;

/* ---------- selectors ---------- */
export const deckCards = (s: State, deck: DeckId) => Object.values(s.cards).filter((c) => c.deck === deck);
export const openComments = (s: State) => s.comments.filter((c) => c.status === 'open');
export const commentsFor = (s: State, kind: 'card' | 'rule', id: string) => s.comments.filter((c) => c.anchor.kind === kind && c.anchor.id === id);
export const wordsInRulebook = (s: State) => Object.values(s.rules).reduce((n, r) => n + wordCount(r.text), 0);

export interface Readiness {
  blockers: number;
  todo: string[];
  term: { kind: 'card' | 'rule'; id: string; label: string }[];
  ruleComments: Comment[];
  suggestionPending: boolean;
  words: number;
}
const MOOR = /\bmoor(s|ed|ing)?\b/i;
const TODO = /\[TODO[^\]]*\]/;
export function readiness(s: State): Readiness {
  const rules = Object.values(s.rules);
  const todo = rules.filter((r) => TODO.test(r.text)).map((r) => r.id);
  const term: Readiness['term'] = [
    ...rules.filter((r) => MOOR.test(r.text)).map((r) => ({ kind: 'rule' as const, id: r.id, label: `Rule ${r.id} ${r.title}` })),
    ...Object.values(s.cards).filter((c) => MOOR.test(c.effect) || MOOR.test(c.flavor)).map((c) => ({ kind: 'card' as const, id: c.id, label: c.name })),
  ];
  const ruleComments = s.comments.filter((c) => c.status === 'open' && c.anchor.kind === 'rule');
  const suggestionPending = s.suggestion.status === 'pending';
  return { blockers: todo.length + (suggestionPending ? 1 : 0), todo, term, ruleComments, suggestionPending, words: wordsInRulebook(s) };
}
export { DECK_ORDER };
