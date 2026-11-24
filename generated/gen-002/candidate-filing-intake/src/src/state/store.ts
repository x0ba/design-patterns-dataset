import { INITIAL_FILINGS, INITIAL_ORDER } from "../domain/mockData";
import { money } from "../domain/format";
import { DOC_LABELS } from "../domain/types";
import type { DocType, EventEntry, Filing, ReceivedDoc } from "../domain/types";

export type QueueFilter = "all" | "open" | "disqualifying" | "ready";
export type Tab = "review" | "notice";

export interface AppState {
  order: string[];
  filings: Record<string, Filing>;
  selectedId: string;
  tab: Tab;
  filter: QueueFilter;
  query: string;
}

export interface DocInput {
  type: DocType;
  pages: number;
  signed: boolean;
  notarized: boolean;
  dated: boolean;
  amount: number | null;
  tender: "check" | "cash" | null;
  reference: string;
  signatures: number | null;
  notes: string;
}

export type Action =
  | { type: "select"; id: string }
  | { type: "tab"; tab: Tab }
  | { type: "filter"; filter: QueueFilter }
  | { type: "query"; query: string }
  | { type: "logDoc"; id: string; input: DocInput; at: string }
  | { type: "amendBallot"; id: string; name: string; at: string }
  | { type: "payment"; id: string; amount: number; tender: "check" | "cash"; reference: string; at: string }
  | { type: "refer"; id: string; at: string }
  | { type: "noticePrinted"; id: string; at: string };

export function createInitialState(): AppState {
  return {
    order: INITIAL_ORDER,
    filings: INITIAL_FILINGS,
    selectedId: "Q-2026-1187",
    tab: "review",
    filter: "all",
    query: "",
  };
}

function withFiling(state: AppState, id: string, change: (f: Filing) => Filing): AppState {
  const current = state.filings[id];
  if (!current) return state;
  return { ...state, filings: { ...state.filings, [id]: change(current) } };
}

function event(at: string, text: string): EventEntry {
  return { at, text };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "select":
      return { ...state, selectedId: action.id, tab: "review" };

    case "tab":
      return { ...state, tab: action.tab };

    case "filter":
      return { ...state, filter: action.filter };

    case "query":
      return { ...state, query: action.query };

    case "logDoc":
      return withFiling(state, action.id, (f) => {
        const input = action.input;
        const docId = `DOC-${f.id.slice(-4)}-${String(f.docs.length + 1).padStart(2, "0")}`;
        const received: ReceivedDoc = {
          id: docId,
          type: input.type,
          receivedAt: action.at,
          pages: input.pages,
          signed: input.signed,
          notarized: input.notarized,
          dated: input.dated,
          amount: input.type === "fee_payment" ? input.amount : null,
          tender: input.type === "fee_payment" ? input.tender : null,
          reference: input.type === "fee_payment" ? input.reference : "",
          signatures: input.type === "petition_alternative" ? input.signatures : null,
          notes: input.notes,
        };
        const detail =
          input.type === "fee_payment" && input.amount !== null
            ? ` for ${money(input.amount)}`
            : "";
        return {
          ...f,
          docs: [...f.docs, received],
          events: [...f.events, event(action.at, `Logged ${DOC_LABELS[input.type]}${detail} as ${docId}.`)],
        };
      });

    case "amendBallot":
      return withFiling(state, action.id, (f) => {
        const from = f.candidate.ballotName;
        const to = action.name.trim();
        if (!to || to === from) return f;
        return {
          ...f,
          candidate: { ...f.candidate, ballotName: to },
          events: [...f.events, event(action.at, `Ballot name amended from "${from}" to "${to}".`)],
        };
      });

    case "payment":
      return withFiling(state, action.id, (f) => {
        const docId = `DOC-${f.id.slice(-4)}-${String(f.docs.length + 1).padStart(2, "0")}`;
        const received: ReceivedDoc = {
          id: docId,
          type: "fee_payment",
          receivedAt: action.at,
          pages: 1,
          signed: true,
          notarized: false,
          dated: true,
          amount: action.amount,
          tender: action.tender,
          reference: action.reference,
          signatures: null,
          notes: "Logged from the filing-fee check.",
        };
        const label = action.tender === "cash" ? `cash receipt ${action.reference}` : `check #${action.reference}`;
        return {
          ...f,
          docs: [...f.docs, received],
          events: [...f.events, event(action.at, `Fee payment of ${money(action.amount)} (${label}) applied as ${docId}.`)],
        };
      });

    case "refer":
      return withFiling(state, action.id, (f) => {
        if (f.referredAt) return f;
        return {
          ...f,
          referredAt: action.at,
          events: [...f.events, event(action.at, "Residence item referred to the supervising clerk.")],
        };
      });

    case "noticePrinted":
      return withFiling(state, action.id, (f) => ({
        ...f,
        noticePrintedAt: action.at,
        events: [...f.events, event(action.at, "Deficiency notice sent to the printer for candidate signature.")],
      }));

    default:
      return state;
  }
}
