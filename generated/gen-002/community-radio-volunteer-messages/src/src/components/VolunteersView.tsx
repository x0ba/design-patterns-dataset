import { useState } from 'react';
import { ME, Role, volunteers } from '../data';
import { useStore } from '../store';
import { Avatar, DAYS, Icon, showsFor, slotLabel } from '../util';

const ROLES: Role[] = ['host', 'board op', 'engineer', 'board member', 'trainee'];
const label = (r: string) => r[0].toUpperCase() + r.slice(1) + (r.endsWith('s') ? '' : 's');

export function VolunteersView() {
  const { d } = useStore();
  const [role, setRole] = useState<Role | 'all' | 'early'>('all');
  const [q, setQ] = useState('');

  const list = volunteers.filter((v) => {
    if (role === 'early' && !v.willingEarly) return false;
    if (role !== 'all' && role !== 'early' && !v.roles.includes(role)) return false;
    if (q) {
      const hay = `${v.name} ${v.roles.join(' ')} ${showsFor(v.id).map((s) => s.name).join(' ')} ${v.note ?? ''}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <h1>Volunteers</h1>
          <div className="page-sub">{volunteers.length} people keep KRVT on the air</div>
        </div>
        <div className="search page-search">
          <Icon name="search" size={15} />
          <input placeholder="Search by name, show, or note" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </header>
      <div className="filters">
        <button className={`fchip ${role === 'all' ? 'on' : ''}`} onClick={() => setRole('all')}>Everyone <span>{volunteers.length}</span></button>
        {ROLES.map((r) => (
          <button key={r} className={`fchip ${role === r ? 'on' : ''}`} onClick={() => setRole(r)}>
            {label(r)} <span>{volunteers.filter((v) => v.roles.includes(r)).length}</span>
          </button>
        ))}
        <span className="fsep" />
        <button className={`fchip ${role === 'early' ? 'on' : ''}`} onClick={() => setRole('early')}>
          <Icon name="sun" size={13} /> Will fill in early mornings <span>{volunteers.filter((v) => v.willingEarly).length}</span>
        </button>
      </div>

      <div className="table-wrap">
        <table className="vtable">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Shows</th><th>Notes</th><th>Phone</th><th>Since</th><th /></tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v.id}>
                <td>
                  <div className="vname"><Avatar id={v.id} size={28} /><div><b>{v.name}</b>{v.title && <span>{v.title}</span>}</div></div>
                </td>
                <td><div className="chips">{v.roles.map((r) => <span key={r} className={`chip role-${r.replace(' ', '')}`}>{r[0].toUpperCase() + r.slice(1)}</span>)}</div></td>
                <td className="vshows">
                  {showsFor(v.id).map((s) => (
                    <div key={s.id}>{s.name} <span>{DAYS[s.day]} {slotLabel(s.start, s.end)}{s.boardOpId === v.id ? ' · board' : ''}</span></div>
                  ))}
                  {showsFor(v.id).length === 0 && <span className="muted">—</span>}
                </td>
                <td className="vnote">
                  {v.willingEarly && <span className="chip early"><Icon name="sun" size={11} /> Early fill-in</span>}
                  {v.earlyNote ?? v.note ?? ''}
                </td>
                <td className="mono-sm">{v.phone}</td>
                <td className="muted">{v.joined}</td>
                <td>{v.id !== ME && <button className="btn ghost sm" onClick={() => d({ type: 'startDm', volId: v.id })}>Message</button>}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="empty">No one matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
