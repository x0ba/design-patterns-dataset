import type { Dispatch } from "react";
import type { Action, AppState, QueueFilter } from "../state/store";
import type { Disposition } from "../domain/rules";
import { DISPOSITION_TEXT, namesMatch } from "../domain/rules";
import { fmtTime } from "../domain/format";
import { Pill, toneForDisposition } from "./Pill";

export interface Summary {
  kind: Disposition;
  openCount: number;
}

interface Props {
  state: AppState;
  summaries: Record<string, Summary>;
  dispatch: Dispatch<Action>;
}

const FILTERS: { key: QueueFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "disqualifying", label: "Disqualifying" },
  { key: "ready", label: "Ready" },
];

export function QueuePanel({ state, summaries, dispatch }: Props) {
  const query = state.query.trim().toLowerCase();

  const counts: Record<QueueFilter, number> = {
    all: state.order.length,
    open: state.order.filter((id) => summaries[id].kind !== "complete").length,
    disqualifying: state.order.filter((id) => summaries[id].kind === "disqualifying").length,
    ready: state.order.filter((id) => summaries[id].kind === "complete").length,
  };

  const rows = state.order
    .map((id) => state.filings[id])
    .filter((f) => {
      const s = summaries[f.id];
      if (state.filter === "open" && s.kind === "complete") return false;
      if (state.filter === "disqualifying" && s.kind !== "disqualifying") return false;
      if (state.filter === "ready" && s.kind !== "complete") return false;
      if (!query) return true;
      return [f.id, f.candidate.legalName, f.candidate.ballotName, f.office.title, String(f.office.district)]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

  return (
    <aside className="queue" aria-label="Today's intake queue">
      <div className="queue-head">
        <div className="queue-title">Today&rsquo;s intake</div>
        <div className="queue-sub">Walk-in filings at this counter desk · {state.order.length} today</div>
      </div>

      <div className="queue-search">
        <input
          type="search"
          value={state.query}
          onChange={(e) => dispatch({ type: "query", query: e.target.value })}
          placeholder="Search name, filing no., or office"
          aria-label="Search filings"
        />
      </div>

      <div className="segmented" role="tablist" aria-label="Filter filings">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={state.filter === f.key}
            className={state.filter === f.key ? "active" : ""}
            onClick={() => dispatch({ type: "filter", filter: f.key })}
          >
            {f.label} <span className="seg-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <ul className="queue-list">
        {rows.length === 0 && <li className="queue-empty">No filings match these filters.</li>}
        {rows.map((f) => {
          const s = summaries[f.id];
          const selected = f.id === state.selectedId;
          const renamed = !namesMatch(f.candidate.ballotName, f.voterFile.nameOnFile);
          return (
            <li key={f.id}>
              <button
                className={`queue-item ${selected ? "selected" : ""}`}
                onClick={() => dispatch({ type: "select", id: f.id })}
                aria-current={selected ? "true" : undefined}
              >
                <span className="queue-row">
                  <span className="queue-name">{f.candidate.legalName}</span>
                  <Pill tone={toneForDisposition(s.kind)}>{DISPOSITION_TEXT[s.kind]}</Pill>
                </span>
                <span className="queue-meta">
                  {f.id} · {f.office.title} {f.office.district}
                </span>
                <span className="queue-meta">
                  Received {fmtTime(f.receivedAt)}
                  {s.openCount > 0 ? ` · ${s.openCount} open` : " · all checks met"}
                  {renamed ? " · ballot name differs" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
