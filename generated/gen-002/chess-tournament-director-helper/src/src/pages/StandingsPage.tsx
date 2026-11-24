import { useState } from 'react';
import { fmtDecimal, fmtPts } from '../components/ui';
import { computeStandings, placeLabel, playerById } from '../lib/swiss';
import type { EventState } from '../lib/types';

export function StandingsPage({ state }: { state: EventState }) {
  const completed = [...state.postedRounds].sort((a, b) => a - b);
  const [through, setThrough] = useState<number>(Math.max(...completed));
  const rows = computeStandings(state, through);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Standings</p>
          <h1>Standings after round {through}</h1>
          <p className="lead">
            Ordered by points, then Buchholz Cut-1, then Sonneborn-Berger. Players still level after all three share a
            place (shown as =1, =2 and so on). Byes and late-entry credits count for points but are not opponents.
          </p>
        </div>
        <div className="tabs" role="tablist" aria-label="After round">
          {completed.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={r === through}
              className={`tab ${r === through ? 'tab-on' : ''}`}
              onClick={() => setThrough(r)}
            >
              After round {r}
            </button>
          ))}
        </div>
      </header>

      <table className="table standings">
        <thead>
          <tr>
            <th className="num">Place</th>
            <th>Name</th>
            <th className="num">Rating</th>
            <th className="num">Points</th>
            <th className="num" title="Sum of opponents’ scores minus the lowest">Buchholz Cut-1</th>
            <th className="num" title="Weighted by the score of each opponent beaten or drawn">Sonneborn-Berger</th>
            <th className="num">Games</th>
            <th className="num">Byes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = playerById(state, r.playerId);
            const note = p.withdrawnFromRound !== null ? `withdrawn from round ${p.withdrawnFromRound}` : p.status === 'waiting' ? 'waiting' : null;
            return (
              <tr key={r.playerId} className={p.withdrawnFromRound !== null ? 'row-muted' : ''}>
                <td className="num">{placeLabel(r)}</td>
                <td>
                  {p.name}
                  {note && <span className="muted small"> · {note}</span>}
                </td>
                <td className="num">{p.rating}</td>
                <td className="num"><strong>{fmtPts(r.points)}</strong></td>
                <td className="num">{fmtDecimal(r.buchholzCut1)}</td>
                <td className="num">{fmtDecimal(r.sonnebornBerger)}</td>
                <td className="num">{r.gamesPlayed}</td>
                <td className="num">{r.byes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
