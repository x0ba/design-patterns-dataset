import { useState, type Dispatch } from 'react';
import { Button, Callout, Pill } from '../components/ui';
import { playerById, resultLabel } from '../lib/swiss';
import type { EventState, Game, Result } from '../lib/types';
import { RESULT_TEXT, type Action } from '../state/reducer';
import { derive } from '../state/derive';
import { nowStamp } from '../components/ui';
import type { Nav } from '../App';

interface Props {
  state: EventState;
  dispatch: Dispatch<Action>;
  nav: Nav;
}

export function ResultsPage({ state, dispatch, nav }: Props) {
  const d = derive(state);
  const rounds = [...state.postedRounds].sort((a, b) => a - b);
  const [round, setRound] = useState<number>(Math.max(...rounds));
  const games = state.games.filter((g) => g.round === round).sort((a, b) => a.board - b.board);
  const entered = games.filter((g) => g.result !== null).length;
  const openHere = d.disputes.filter((g) => g.round === round);

  const quickEnter = (g: Game, r: Result) => {
    dispatch({ type: 'enterResult', gameId: g.id, result: r, at: nowStamp() });
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Results</p>
          <h1>Round {round} results</h1>
          <p className="lead">
            {entered} of {games.length} boards have a result. Use <strong>Correct</strong> to change a result that is
            already entered. Every change is logged with a reason.
          </p>
        </div>
        <div className="tabs" role="tablist" aria-label="Round">
          {rounds.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={r === round}
              className={`tab ${r === round ? 'tab-on' : ''}`}
              onClick={() => setRound(r)}
            >
              Round {r}
            </button>
          ))}
        </div>
      </header>

      {openHere.length > 0 && (
        <Callout tone="warn" title={`${openHere.length} result${openHere.length === 1 ? ' is' : 's are'} disputed`}>
          Players have told the director something different from the recorded result. Check the signed scoresheet
          before the next round is posted.
        </Callout>
      )}

      <table className="table results">
        <thead>
          <tr>
            <th className="num">Board</th>
            <th>White</th>
            <th>Result</th>
            <th>Black</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {games.map((g) => {
            const w = playerById(state, g.white);
            const b = playerById(state, g.black);
            const disputed = g.dispute && !g.dispute.resolved;
            return (
              <tr key={g.id} className={disputed ? 'row-disputed' : ''}>
                <td className="num">{g.board}</td>
                <td>
                  <div>{w.name}</div>
                  <div className="muted small">{w.rating}</div>
                </td>
                <td className="result-cell">
                  <strong>{resultLabel(g.result)}</strong>
                </td>
                <td>
                  <div>{b.name}</div>
                  <div className="muted small">{b.rating}</div>
                </td>
                <td>
                  {disputed && <Pill tone="warn">Players say {RESULT_TEXT[g.dispute!.reportedResult]}</Pill>}
                  {!disputed && g.result !== null && g.history && g.history.length > 0 && <Pill tone="info">Corrected</Pill>}
                  {!disputed && g.dispute?.resolved && <Pill tone="ok">Dispute closed</Pill>}
                  {g.result === null && <Pill>Not played</Pill>}
                  {!disputed && !g.dispute && g.result !== null && !g.history && <Pill tone="ok">Entered</Pill>}
                </td>
                <td className="actions-cell">
                  {g.result === null ? (
                    <div className="quick-enter" role="group" aria-label={`Enter result for board ${g.board}`}>
                      {(['1-0', '1/2', '0-1'] as Result[]).map((r) => (
                        <Button key={r} size="sm" onClick={() => quickEnter(g, r)} disabled={!state.postedRounds.includes(round)}>
                          {resultLabel(r)}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Button size="sm" variant={disputed ? 'primary' : 'default'} onClick={() => nav.dialog({ kind: 'correct', gameId: g.id })}>
                      {disputed ? 'Check and resolve…' : 'Correct…'}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="log-section">
        <h2>Event log</h2>
        <p className="muted small">Newest first. Everything the software records about today’s event appears here.</p>
        <ol className="log">
          {[...state.log].reverse().map((e, i) => (
            <li key={`${e.time}-${i}`}>
              <span className="log-time">{e.time}</span>
              <span>{e.text}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
