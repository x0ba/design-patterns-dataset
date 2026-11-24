import { useMemo, useState } from 'react';
import { Button, Callout, Pill, fmtPts } from '../components/ui';
import { computeStandings } from '../lib/swiss';
import type { EventState, Player } from '../lib/types';
import { derive } from '../state/derive';
import type { Nav } from '../App';

export function PlayersPage({ state, nav }: { state: EventState; nav: Nav }) {
  const d = derive(state);
  const [q, setQ] = useState('');
  const current = Math.max(...state.postedRounds, 0);
  const standings = useMemo(() => computeStandings(state, current), [state, current]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...state.players]
      .filter((p) => (needle ? p.name.toLowerCase().includes(needle) : true))
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [state.players, q]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Players</p>
          <h1>Players and late entries</h1>
          <p className="lead">
            {state.players.filter((p) => p.status === 'playing').length} players are in the event.{' '}
            {d.waiting.length > 0 ? `${d.waiting.length} is waiting for a decision. ` : ''}
            {d.leavingNow.length > 0 ? `${d.leavingNow.length} needs a withdrawal.` : ''}
          </p>
        </div>
        <div className="head-actions">
          <Button variant="primary" onClick={() => nav.dialog({ kind: 'late', playerId: null })}>
            Add a late entry…
          </Button>
        </div>
      </header>

      {(d.waiting.length > 0 || d.leavingNow.length > 0) && (
        <Callout tone="warn" title="These players need a decision">
          Late entries are added or marked “not joining”. Players who have gone home are withdrawn. Both must be
          settled before the next round is posted.
        </Callout>
      )}

      <input
        className="search"
        type="search"
        placeholder="Find a player by name"
        aria-label="Find a player by name"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th className="num">Age</th>
            <th className="num">Rating</th>
            <th className="num">Points</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const pts = standings.find((r) => r.playerId === p.id)?.points;
            return (
              <tr key={p.id} className={p.status === 'waiting' || p.leftEarly ? 'row-attention' : ''}>
                <td>
                  <strong>{p.name}</strong>
                  {p.note && <div className="muted small">{p.note}</div>}
                </td>
                <td className="num">{p.age || '—'}</td>
                <td className="num">{p.rating}</td>
                <td className="num">{pts !== undefined ? fmtPts(pts) : '—'}</td>
                <td>
                  <Status player={p} current={current} />
                </td>
                <td className="actions-cell">
                  {p.status === 'waiting' && (
                    <Button size="sm" variant="primary" onClick={() => nav.dialog({ kind: 'late', playerId: p.id })}>
                      Decide…
                    </Button>
                  )}
                  {p.status === 'playing' && p.withdrawnFromRound === null && (
                    <Button size="sm" variant={p.leftEarly ? 'danger' : 'ghost'} onClick={() => nav.dialog({ kind: 'withdraw', playerId: p.id })}>
                      Withdraw…
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function rank(p: Player): number {
  if (p.status === 'waiting') return 0;
  if (p.leftEarly) return 1;
  if (p.status === 'playing') return 2;
  return 3;
}

function Status({ player: p, current }: { player: Player; current: number }) {
  if (p.status === 'waiting') return <Pill tone="warn">Waiting to join</Pill>;
  if (p.status === 'declined') return <Pill>Not joining</Pill>;
  if (p.withdrawnFromRound !== null) return <Pill>Withdrawn from round {p.withdrawnFromRound}</Pill>;
  if (p.leftEarly) return <Pill tone="warn">Gone home, not withdrawn</Pill>;
  if (p.joinedRound !== null && p.joinedRound > current) return <Pill tone="info">Joins round {p.joinedRound}</Pill>;
  return <Pill tone="ok">Playing</Pill>;
}
