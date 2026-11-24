import type { Dispatch } from 'react';
import { Button, Callout, Pill, fmtPts, nowStamp } from '../components/ui';
import { fmtScore, playerById, pointsThrough, resultLabel } from '../lib/swiss';
import type { EventState, Result } from '../lib/types';
import type { Derived } from '../state/derive';
import type { Action } from '../state/reducer';
import type { Nav } from '../App';

interface Props {
  state: EventState;
  d: Derived;
  dispatch: Dispatch<Action>;
  nav: Nav;
}

export function PairingsPage({ state, d, dispatch, nav }: Props) {
  if (d.pairRound !== null && d.preview) {
    return <Preview state={state} d={d} nav={nav} />;
  }
  return <Posted state={state} d={d} dispatch={dispatch} />;
}

/* ------------------------------------------------------------------ *
 * Preview of the next round (not visible to the hall yet)
 * ------------------------------------------------------------------ */

function Preview({ state, d, nav }: { state: EventState; d: Derived; nav: Nav }) {
  const pv = d.preview!;
  const pr = pv.round;
  const byeName = pv.bye ? playerById(state, pv.bye.playerId).name : null;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Round {pr} · preview</p>
          <h1>Round {pr} pairings</h1>
          <p className="lead">
            {pv.boards.length} boards{byeName ? ` and one bye` : ', no bye'}. This list is worked out from the scores
            right now, and it changes whenever you change a result, add a late entry or withdraw a player. The hall
            sees nothing until you post it.
          </p>
        </div>
        <div className="head-actions">
          <Button variant="primary" disabled={!d.canPost} onClick={() => nav.dialog({ kind: 'post', round: pr })}>
            Post round {pr}…
          </Button>
        </div>
      </header>

      {!d.canPost && (
        <Callout tone="warn" title="Not ready to post">
          <ul className="bullets">
            {d.checks
              .filter((c) => !c.ok)
              .map((c) => (
                <li key={c.id}>{c.label}.</li>
              ))}
          </ul>
          Finish these on the Before round {pr} page, then come back here.
        </Callout>
      )}

      {pv.problems.length > 0 && (
        <Callout tone="bad" title="Check these boards before posting">
          {pv.problems.join(' ')}
        </Callout>
      )}

      <table className="table pairings">
        <thead>
          <tr>
            <th className="num">Board</th>
            <th>White</th>
            <th>Black</th>
            <th className="num">Score group</th>
            <th>Why this pairing</th>
          </tr>
        </thead>
        <tbody>
          {pv.boards.map((b) => {
            const w = playerById(state, b.white);
            const k = playerById(state, b.black);
            return (
              <tr key={b.board}>
                <td className="num">{b.board}</td>
                <td>
                  {w.name} <span className="muted small">({w.rating})</span>
                </td>
                <td>
                  {k.name} <span className="muted small">({k.rating})</span>
                </td>
                <td className="num">{fmtScore(b.scoreGroup)}</td>
                <td className="small muted">{b.reasons.join(' ')}</td>
              </tr>
            );
          })}
          {pv.bye && byeName && (
            <tr className="row-bye">
              <td className="num">Bye</td>
              <td colSpan={2}>
                <strong>{byeName}</strong> gets 1 point and is not paired.
              </td>
              <td className="num">{fmtScore(pointsThrough(state, pv.bye.playerId, pr - 1))}</td>
              <td className="small muted">{pv.bye.reason}</td>
            </tr>
          )}
        </tbody>
      </table>

      <section className="explain-grid">
        <div className="explain">
          <h3>How the boards were made</h3>
          <p>
            Players are grouped by points. Within a group, the top half by rating plays the bottom half. A pairing that
            repeats an earlier game is never used. Colours follow the club’s colour-balance rule.
          </p>
        </div>
        <div className="explain">
          <h3>Floats</h3>
          {pv.floats.length === 0 ? (
            <p>Nobody floats this round. Every score group pairs up within itself.</p>
          ) : (
            <ul className="bullets">
              {pv.floats.map((f) => (
                <li key={f.playerId}>
                  <strong>{playerById(state, f.playerId).name}</strong> floats from the {fmtScore(f.from)}-point group
                  to the {fmtScore(f.to)}-point group. The {fmtScore(f.from)} group has an odd number of players left
                  after pairing, so one player must move down.
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="explain">
          <h3>Byes</h3>
          {byeName ? (
            <p>
              One bye is needed because there is an odd number of players. {pv.bye!.reason}
            </p>
          ) : (
            <p>
              No bye. There are {pv.activeCount} active players, an even number, so every player has a board.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Posted round: results are entered here
 * ------------------------------------------------------------------ */

function Posted({ state, d, dispatch }: { state: EventState; d: Derived; dispatch: Dispatch<Action> }) {
  const round = d.currentRound;
  const games = state.games.filter((g) => g.round === round).sort((a, b) => a.board - b.board);
  const bye = state.credits.find((c) => c.round === round && c.kind === 'bye');
  const entered = games.filter((g) => g.result !== null).length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Round {round} · posted</p>
          <h1>Round {round} boards</h1>
          <p className="lead">
            {entered} of {games.length} results entered.{' '}
            {entered === games.length
              ? 'All results are in. The next round can be paired.'
              : 'Enter each result as the board finishes.'}
          </p>
        </div>
        <div className="head-actions">
          <Button onClick={() => window.print()}>Print the boards</Button>
        </div>
      </header>

      <table className="table pairings">
        <thead>
          <tr>
            <th className="num">Board</th>
            <th>White</th>
            <th>Black</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => {
            const w = playerById(state, g.white);
            const k = playerById(state, g.black);
            return (
              <tr key={g.id}>
                <td className="num">{g.board}</td>
                <td>{w.name}</td>
                <td>{k.name}</td>
                <td>
                  {g.result === null ? (
                    <div className="quick-enter">
                      {(['1-0', '1/2', '0-1'] as Result[]).map((r) => (
                        <Button
                          key={r}
                          size="sm"
                          onClick={() => dispatch({ type: 'enterResult', gameId: g.id, result: r, at: nowStamp() })}
                        >
                          {resultLabel(r)}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Pill tone="ok">{resultLabel(g.result)}</Pill>
                  )}
                </td>
              </tr>
            );
          })}
          {bye && (
            <tr className="row-bye">
              <td className="num">Bye</td>
              <td colSpan={2}>{playerById(state, bye.playerId).name}</td>
              <td>
                <Pill>{fmtPts(bye.points)} point</Pill>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
