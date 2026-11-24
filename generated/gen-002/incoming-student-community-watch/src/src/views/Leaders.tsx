import { useState } from 'react';
import { useStore } from '../store';
import { LEADERS, GROUPS, type LeaderStatus } from '../data/community';
import { Avatar, Pill, StatusDot, STATUS_LABEL, Btn } from '../components/ui';

export default function Leaders() {
  const s = useStore();
  const [filter, setFilter] = useState<LeaderStatus | 'all'>('all');
  const [pinged, setPinged] = useState<string[]>([]);
  const list = LEADERS.filter((l) => filter === 'all' || l.status === filter);
  const count = (st: LeaderStatus) => LEADERS.filter((l) => l.status === st).length;
  const uncovered = GROUPS.filter((g) => g.leaders.every((id) => LEADERS.find((l) => l.id === id)!.status !== 'shift'));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Orientation leaders</h1>
          <p className="page-sub">18 paid student leaders moderate assigned groups. Wellbeing cases stay with staff; leaders handle questions, held posts and routine follow-ups.</p>
        </div>
        <div className="stat-row">
          <div className="stat"><b>{count('shift')}</b><span>on shift</span></div>
          <div className="stat"><b>{count('session')}</b><span>in session</span></div>
          <div className="stat"><b>{count('off')}</b><span>off</span></div>
          <div className="stat warn"><b>{uncovered.length}</b><span>groups without a leader on shift</span></div>
        </div>
      </div>
      <div className="seg seg-sm" style={{ marginBottom: 14 }}>
        {(['all', 'shift', 'session', 'off'] as const).map((f) => (
          <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f === 'all' ? 'Everyone' : STATUS_LABEL[f]} <span className="muted">{f === 'all' ? LEADERS.length : count(f)}</span></button>
        ))}
      </div>
      <table className="table">
        <thead><tr><th>Leader</th><th>Status</th><th>Assigned groups</th><th className="num">Open hand-offs</th><th className="num">Handled since 9:00</th><th>Last action</th><th /></tr></thead>
        <tbody>
          {list.map((l) => {
            const groups = GROUPS.filter((g) => g.leaders.includes(l.id));
            return (
              <tr key={l.id}>
                <td><div className="leader-line"><Avatar initials={l.initials} size={28} tone={l.status === 'shift' ? 'teal' : 'slate'} /><div><b>{l.name}</b><div className="muted small">{l.detail}</div></div></div></td>
                <td><div className="nowrap"><StatusDot status={l.status} />{STATUS_LABEL[l.status]}</div><div className="muted small">{l.statusNote}</div></td>
                <td><div className="chips">{groups.map((g) => <span key={g.id} className="chip">{g.name}</span>)}</div></td>
                <td className="num"><b>{s.handoffs[l.id] ?? 0}</b></td>
                <td className="num">{l.handled}</td>
                <td className="mono">{l.lastAction}</td>
                <td className="right">
                  {l.status === 'off' ? null : pinged.includes(l.id) ? <Pill tone="green">Pinged</Pill> : (
                    <Btn small kind="ghost" onClick={() => { setPinged([...pinged, l.id]); s.act(`Pinged ${l.name.split(' ')[0]} to check their queue`, (d) => ({ handoffs: d.handoffs }), { log: `Pinged ${l.name} to check their hand-off queue` }); }}>Ping</Btn>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h3 className="sub-h">No leader on shift right now ({uncovered.length} groups)</h3>
      <div className="chips">{uncovered.map((g) => <span key={g.id} className="chip chip-warn">{g.name}</span>)}</div>
    </div>
  );
}
