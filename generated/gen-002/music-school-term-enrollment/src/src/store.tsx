import { createContext, useContext, useEffect, useReducer, useState, type Dispatch, type ReactNode } from 'react';
import type { AppState, DraftLine, Enrollment, PlanId, Receipt, ViewId } from './types';
import { initialState } from './data/seed';
import { buildQuote, withdrawalQuote, RATES } from './lib/pricing';
import { nowMs, TERM } from './lib/time';
import { money } from './lib/money';

export type Action =
  | { type: 'setView'; view: ViewId }
  | { type: 'selectFamily'; familyId: string }
  | { type: 'startDraft'; familyId: string }
  | { type: 'addLine'; childName: string; age: number; programId: string; slotId: string }
  | { type: 'removeLine'; lineId: string }
  | { type: 'changeSlot'; lineId: string; slotId: string }
  | { type: 'setPlan'; plan: PlanId }
  | { type: 'clearDraft' }
  | { type: 'confirmDraft'; atMs: number }
  | { type: 'withdraw'; enrollmentId: string; atMs: number; reason: string }
  | { type: 'dismissReceipt' };

const Ctx = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

/** Seats taken for a slot: base bookings + active enrollments + this draft's holds. */
export function seatsTaken(state: AppState, slotId: string): number {
  const slot = state.slots.find((s) => s.id === slotId);
  if (!slot) return 0;
  const enrolled = state.enrollments.filter((e) => e.status === 'active' && e.slotId === slotId).length;
  const held = state.draft.lines.filter((l) => l.slotId === slotId).length;
  return slot.baseBooked + enrolled + held;
}

export function seatCapacity(state: AppState, slotId: string): number {
  const slot = state.slots.find((s) => s.id === slotId);
  const program = state.programs.find((p) => p.id === slot?.programId);
  return program?.seats ?? 0;
}

export function seatsOpen(state: AppState, slotId: string): number {
  return Math.max(0, seatCapacity(state, slotId) - seatsTaken(state, slotId));
}

/** Money owed by a family: scheduled installments on active enrollments. */
export function familyBalanceCents(state: AppState, familyId: string): number {
  return state.enrollments
    .filter((e) => e.familyId === familyId && e.status === 'active')
    .reduce(
      (sum, e) => sum + e.allocations.filter((a) => a.status === 'scheduled').reduce((s, a) => s + a.amountCents, 0),
      0,
    );
}

function cardLabel(state: AppState, familyId: string): string {
  const f = state.families.find((x) => x.id === familyId);
  return f ? `${f.cardBrand} ending ${f.cardLast4}` : 'card on file';
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setView':
      return { ...state, view: action.view };

    case 'selectFamily':
      return { ...state, selectedFamilyId: action.familyId, view: 'families' };

    case 'startDraft': {
      // A draft with holds must be finished or cleared before another family starts.
      if (state.draft.familyId && state.draft.familyId !== action.familyId && state.draft.lines.length > 0) {
        return state;
      }
      // Same family with holds in progress: keep them, just go back to the form.
      if (state.draft.familyId === action.familyId && state.draft.lines.length > 0) {
        return { ...state, view: 'enroll', selectedFamilyId: action.familyId, receipt: null };
      }
      return {
        ...state,
        draft: { familyId: action.familyId, lines: [], plan: 'inst3' },
        receipt: null,
        view: 'enroll',
        selectedFamilyId: action.familyId,
      };
    }

    case 'addLine': {
      if (!state.draft.familyId || seatsOpen(state, action.slotId) <= 0) return state;
      const id = `line-${state.seq + 1}`;
      const line: DraftLine = {
        id,
        childName: action.childName,
        age: action.age,
        programId: action.programId,
        slotId: action.slotId,
      };
      return {
        ...state,
        seq: state.seq + 1,
        draft: { ...state.draft, lines: [...state.draft.lines, line] },
      };
    }

    case 'removeLine':
      return {
        ...state,
        draft: { ...state.draft, lines: state.draft.lines.filter((l) => l.id !== action.lineId) },
      };

    case 'changeSlot': {
      const line = state.draft.lines.find((l) => l.id === action.lineId);
      if (!line || line.slotId === action.slotId || seatsOpen(state, action.slotId) <= 0) return state;
      return {
        ...state,
        draft: {
          ...state.draft,
          lines: state.draft.lines.map((l) => (l.id === action.lineId ? { ...l, slotId: action.slotId } : l)),
        },
      };
    }

    case 'setPlan':
      return { ...state, draft: { ...state.draft, plan: action.plan } };

    case 'clearDraft':
      return { ...state, draft: { ...state.draft, lines: [], familyId: null } };

    case 'confirmDraft': {
      const { draft } = state;
      if (!draft.familyId || draft.lines.length === 0) return state;
      const family = state.families.find((f) => f.id === draft.familyId);
      if (!family) return state;
      const quote = buildQuote(draft.lines, state.programs, action.atMs, draft.plan);

      let seq = state.seq + 1;
      const enrollments: Enrollment[] = quote.lines.map((pl, i) => {
        const line = draft.lines.find((l) => l.id === pl.lineId)!;
        return {
          id: `enr-${seq + i}`,
          familyId: family.id,
          childName: line.childName,
          age: line.age,
          programId: line.programId,
          slotId: line.slotId,
          listCents: pl.listCents,
          earlyCents: pl.earlyCents,
          siblingCents: pl.siblingCents,
          netCents: pl.netCents,
          registrationCents: i === 0 ? RATES.registrationCents : 0,
          enrolledAt: action.atMs,
          status: 'active',
          allocations: pl.schedule.map((amountCents, k) => ({
            installment: k + 1,
            amountCents,
            status: k === 0 ? 'paid' : 'scheduled',
          })),
        };
      });
      seq += enrollments.length;

      const planLabel = draft.plan === 'full' ? 'paid in full' : 'installment 1 of 3';
      const txn = {
        id: `t-${seq}`,
        at: action.atMs,
        familyName: family.name,
        kind: 'payment' as const,
        type: 'enrollment' as const,
        description: `${TERM.name} enrollment · ${draft.lines.length} student${draft.lines.length > 1 ? 's' : ''} · ${planLabel}`,
        method: cardLabel(state, family.id),
        amountCents: quote.chargeTodayCents,
      };

      const nextInstallment = quote.installments[1];
      const receipt: Receipt = {
        number: `LB-${seq + 1}`,
        familyId: family.id,
        familyName: family.name,
        chargedCents: quote.chargeTodayCents,
        cardLabel: cardLabel(state, family.id),
        planLabel: draft.plan === 'full' ? 'Paid in full' : '3 installments',
        studentNames: draft.lines.map((l) => l.childName),
        nextDueMs: nextInstallment ? nextInstallment.dueMs : null,
        nextDueCents: nextInstallment ? nextInstallment.totalCents : null,
      };

      return {
        ...state,
        seq: seq + 1,
        enrollments: [...state.enrollments, ...enrollments],
        txns: [txn, ...state.txns],
        draft: { familyId: null, lines: [], plan: draft.plan },
        receipt,
      };
    }

    case 'withdraw': {
      const enr = state.enrollments.find((e) => e.id === action.enrollmentId);
      if (!enr || enr.status !== 'active') return state;
      const q = withdrawalQuote(enr, action.atMs);
      const family = state.families.find((f) => f.id === enr.familyId);
      const description =
        q.rule === 'free-cancel'
          ? `${TERM.name} withdrawal · within 7-day window · full refund of tuition paid`
          : `${TERM.name} withdrawal · after 7-day window · ${q.weeksRemaining} of ${RATES.termWeeks} weeks remain, less ${money(RATES.prorateFeeCents)} fee`;
      const txn = {
        id: `t-${state.seq + 2}`,
        at: action.atMs,
        familyName: family?.name ?? '',
        kind: 'refund' as const,
        type: 'withdrawal' as const,
        description: `${description} · ${enr.childName}`,
        method: family ? `${family.cardBrand} ••${family.cardLast4}` : '',
        amountCents: q.refundCents,
      };
      return {
        ...state,
        seq: state.seq + 2,
        enrollments: state.enrollments.map((e) =>
          e.id === enr.id
            ? {
                ...e,
                status: 'withdrawn',
                withdrawnAt: action.atMs,
                refundCents: q.refundCents,
                withdrawReason: action.reason,
                withdrawRule: q.rule,
                allocations: e.allocations.map((a) => (a.status === 'scheduled' ? { ...a, status: 'void' } : a)),
              }
            : e,
        ),
        txns: [txn, ...state.txns],
      };
    }

    case 'dismissReceipt':
      return { ...state, receipt: null };

    default:
      return state;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

/** Re-renders every 15 seconds so countdowns and "now" stay current. */
export function useNow(): number {
  const [now, setNow] = useState(() => nowMs());
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

