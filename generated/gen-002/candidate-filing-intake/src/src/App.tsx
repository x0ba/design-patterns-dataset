import { useCallback, useMemo, useReducer } from "react";
import { createInitialState, reducer } from "./state/store";
import type { Tab } from "./state/store";
import { useMockNow } from "./state/useMockNow";
import { DISPOSITION_TEXT, dispositionOf, evaluate } from "./domain/rules";
import { fmtTime, isoLocal } from "./domain/format";
import { TopBar, StatsStrip } from "./components/TopBar";
import { QueuePanel } from "./components/QueuePanel";
import type { Summary } from "./components/QueuePanel";
import { RecordCard } from "./components/RecordCard";
import { DocumentsCard } from "./components/DocumentsCard";
import { RequirementsCard } from "./components/RequirementsCard";
import { DispositionCard } from "./components/DispositionCard";
import { ActivityCard } from "./components/ActivityCard";
import { DeficiencyNotice } from "./components/DeficiencyNotice";
import { Pill, toneForDisposition } from "./components/Pill";

export default function App() {
  const now = useMockNow();
  const at = isoLocal(now);
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  const filing = state.filings[state.selectedId];
  const reqs = useMemo(() => evaluate(filing), [filing]);
  const disp = useMemo(() => dispositionOf(reqs), [reqs]);

  const summaries = useMemo(() => {
    const out: Record<string, Summary> = {};
    for (const id of state.order) {
      const d = dispositionOf(evaluate(state.filings[id]));
      out[id] = { kind: d.kind, openCount: d.openCount };
    }
    return out;
  }, [state.filings, state.order]);

  const setTab = useCallback((tab: Tab) => dispatch({ type: "tab", tab }), []);

  const printNotice = useCallback(() => {
    dispatch({ type: "noticePrinted", id: filing.id, at });
    dispatch({ type: "tab", tab: "notice" });
    // Let the notice render before the print dialog opens.
    window.setTimeout(() => window.print(), 150);
  }, [filing.id, at]);

  return (
    <div className="app">
      <TopBar now={now} />
      <StatsStrip />

      <div className="body">
        <QueuePanel state={state} summaries={summaries} dispatch={dispatch} />

        <main className="workspace">
          <header className="filing-head">
            <div className="filing-head-main">
              <div className="eyebrow">
                {filing.id} · Walk-in · Counter {filing.counter} · Received {fmtTime(filing.receivedAt)}
              </div>
              <h1>{filing.candidate.legalName}</h1>
              <div className="filing-sub">
                Ballot name requested: <strong>{filing.candidate.ballotName}</strong>
                <span className="sep">·</span>
                {filing.candidate.party}
                <span className="sep">·</span>
                {filing.office.title}, District {filing.office.district}
              </div>
            </div>
            <div className="filing-head-status">
              <Pill tone={toneForDisposition(disp.kind)}>{DISPOSITION_TEXT[disp.kind]}</Pill>
              <div className="filing-head-count">
                {disp.openCount === 0
                  ? "All checks met"
                  : `${disp.openCount} open · ${disp.disq.length} disqualifying · ${disp.cur.length} curable`}
              </div>
            </div>
          </header>

          <nav className="tabs" role="tablist" aria-label="Filing views">
            <button
              role="tab"
              aria-selected={state.tab === "review"}
              className={state.tab === "review" ? "active" : ""}
              onClick={() => setTab("review")}
            >
              Intake and review
            </button>
            <button
              role="tab"
              aria-selected={state.tab === "notice"}
              className={state.tab === "notice" ? "active" : ""}
              onClick={() => setTab("notice")}
            >
              Deficiency notice{disp.kind !== "complete" ? ` (${disp.openCount})` : ""}
            </button>
          </nav>

          {state.tab === "review" ? (
            <div className="review-grid">
              <div className="col-main">
                <RecordCard filing={filing} />
                <DocumentsCard filing={filing} at={at} dispatch={dispatch} />
              </div>
              <div className="col-side">
                <DispositionCard
                  disp={disp}
                  now={now}
                  onPreview={() => setTab("notice")}
                  onPrint={printNotice}
                />
                <RequirementsCard filing={filing} reqs={reqs} at={at} dispatch={dispatch} />
                <ActivityCard filing={filing} />
              </div>
            </div>
          ) : (
            <DeficiencyNotice
              filing={filing}
              reqs={reqs}
              now={now}
              onPrint={printNotice}
              onBack={() => setTab("review")}
            />
          )}
        </main>
      </div>
    </div>
  );
}
