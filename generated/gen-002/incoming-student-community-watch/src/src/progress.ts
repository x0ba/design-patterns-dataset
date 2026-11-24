import type { Data } from './store';
import { SCAM_MESSAGES, SCAM_ACCOUNTS, PII, HELD_POSTS, QUESTIONS, UNVERIFIED } from './data/cases';

export interface Step { label: string; done: boolean }

export const wbSteps = (d: Data): Step[] => [
  { label: 'Take it (staff-only)', done: d.wb.ownedByMe },
  { label: 'Consult Counseling on-call', done: d.wb.escalations.some((e) => e.contactId === 'counseling') },
  { label: 'Private check-in sent', done: d.wb.checkInAt !== null },
  { label: 'Outcome logged', done: d.wb.resolvedAt !== null },
];

const scamPosts = SCAM_MESSAGES.filter((m) => m.state !== 'dm');
export const scamSteps = (d: Data): Step[] => [
  { label: `Remove ${scamPosts.length} posts`, done: scamPosts.every((m) => d.scam.removed.includes(m.id)) },
  { label: `Suspend ${SCAM_ACCOUNTS.length} accounts`, done: SCAM_ACCOUNTS.every((a) => d.scam.suspended.includes(a.id)) },
  { label: 'Send case to D. Mbeki', done: d.scam.mbekiAt !== null },
  { label: 'Warn the community', done: d.scam.warningAt !== null },
  { label: 'Notify DM recipients', done: d.scam.recipientsNotifiedAt !== null },
  { label: 'Auto-hold look-alikes', done: d.scam.autoHold },
];

export const piiSteps = (d: Data): Step[] => [
  { label: `Hide ${PII.comments.length} comments`, done: PII.comments.every((c) => d.pii.hidden.includes(c.id)) },
  { label: 'Hand follow-up to a leader', done: d.pii.leader !== null },
];

export const heldDone = (d: Data) => HELD_POSTS.filter((h) => d.held[h.id] !== 'pending').length;
export const questionsAssigned = (d: Data) => QUESTIONS.filter((q) => d.questions[q.id]).length;
export const accountsDone = (d: Data) => UNVERIFIED.filter((a) => d.accounts[a.id] !== 'pending').length;

export type CaseState = 'open' | 'active' | 'done';
export const stateOf = (steps: Step[]): CaseState =>
  steps.every((s) => s.done) ? 'done' : steps.some((s) => s.done) ? 'active' : 'open';

export const visibleScamPosts = (d: Data) => SCAM_MESSAGES.filter((m) => m.state === 'visible' && !d.scam.removed.includes(m.id));
export const visiblePiiComments = (d: Data) => PII.comments.filter((c) => !d.pii.hidden.includes(c.id));
