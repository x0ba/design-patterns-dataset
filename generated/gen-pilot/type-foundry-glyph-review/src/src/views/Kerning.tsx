import { useCallback, useMemo, useState } from 'react';
import { PEOPLE, rel, shortStamp } from '../data/core';
import type { KernPair } from '../data/kerning';
import { useStore, useToast } from '../store';
import { kernStats } from '../derive';
import { Avatar, Icon, Seg, StatusPill } from '../components/ui';
import { PathText } from '../components/GlyphCanvas';

type Filter = 'unsure' | 'pending' | 'big' | 'new' | 'all';
type Sort = 'time' | 'delta' | 'pair';

let threadSeq = 500;

export function Kerning() {
  const { s, dispatch } = useStore();
  const toast = useToast();
  const ks = kernStats(s);
  const [filter, setFilter] = useState<Filter>('unsure');
  const [sort, setSort] = useState<Sort>('time');
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const [confirmBulk, setConfirmBulk] = useState(false);

  const delta = (p: KernPair) => p.after - (p.before ?? 0);
  const rows = useMemo(() => {
    let r = s.kernPairs.filter((p) => {
      if (filter === 'unsure') return p.unsure;
      if (filter === 'pending') return s.kern[p.id] === 'pending';
      if (filter === 'big') return Math.abs(delta(p)) >= 20;
      if (filter === 'new') return p.before === null;
      return true;
    });
    if (q.trim()) r = r.filter((p) => (p.left + p.right).includes(q.trim()) || p.left === q.trim() || p.right === q.trim());
    r = [...r].sort((a, b) =>
      sort === 'time' ? b.at - a.at : sort === 'delta' ? Math.abs(delta(b)) - Math.abs(delta(a)) : (a.left + a.right).localeCompare(b.left + b.right));
    return r;
  }, [s.kernPairs, s.kern, filter, sort, q]);

  const sel = s.kernPairs.find((p) => p.id === s.route.id) ?? rows[0] ?? s.kernPairs[0];
  const select = (id: string) => { dispatch({ type: 'go', route: { view: 'kerning', id } }); setNote(''); };

  // value maps for rendering Tuesday vs now (respecting Ines's reverts)
  const nowMap = useMemo(() => new Map(s.kernPairs.map((p) => [p.id, s.kern[p.id] === 'reverted' ? p.before ?? 0 : p.after])), [s.kernPairs, s.kern]);
  const tueMap = useMemo(() => new Map(s.kernPairs.map((p) => [p.id, p.before ?? 0])), [s.kernPairs]);
  const kernNow = useCallback((a: string, b: string) => nowMap.get(a + b) ?? 0, [nowMap]);
  const kernTue = useCallback((a: string, b: string) => tueMap.get(a + b) ?? 0, [tueMap]);
  const kernJonas = useCallback((a: string, b: string) => {
    const p = s.kernPairs.find((x) => x.id === a + b); return p ? p.after : 0;
  }, [s.kernPairs]);

  const unflaggedPending = s.kernPairs.filter((p) => !p.unsure && s.kern[p.id] === 'pending');
  const decide = (ids: string[], d: 'accepted' | 'reverted' | 'pending', label: string) => {
    const prev = ids.map((id) => [id, s.kern[id]] as const);
    dispatch({ type: 'kern', ids, decision: d });
    toast(label, { type: 'restore', state: { kern: { ...s.kern, ...Object.fromEntries(prev) } } });
  };

  const askJonas = () => {
    if (!note.trim() || !sel) return;
    dispatch({
      type: 'newThread',
      thread: {
        id: `th-k${++threadSeq}`, ch: sel.left, style: 'bold', subject: `Kerning ${sel.left}${sel.right} in Bold`, to: 'jonas', resolved: false,
        messages: [{ id: `mk${threadSeq}`, author: 'ines', at: s.now, text: note.trim() }],
      },
    });
    toast(`Comment on ${sel.left}${sel.right} sent to Jonas`);
    setNote('');
  };

  const selDec = sel ? s.kern[sel.id] : 'pending';

  return (
    <div className="kerning">
      <div className="page-head compact">
        <div className="eyebrow"><Avatar id="jonas" size={18} live /> Jonas Brandt · Bold · live now</div>
        <h1>Kerning changes in Bold since Tuesday</h1>
        <div className="kstats">
          <div><b>{ks.total}</b><span>pairs changed</span></div>
          <div><b>{ks.added}</b><span>new pairs</span></div>
          <div className="flag"><b>{ks.unsurePending}</b><span>unsure, to check</span></div>
          <div><b>{ks.accepted}</b><span>accepted</span></div>
          <div><b>{ks.reverted}</b><span>reverted</span></div>
          {s.liveNew > 0 && <div className="live"><b>+{s.liveNew}</b><span>since you opened this</span></div>}
          <div className="kbulk">
            {confirmBulk ? (
              <span className="confirm-inline">
                Accept {unflaggedPending.length} pairs Jonas didn’t flag?
                <button className="btn primary sm" onClick={() => { decide(unflaggedPending.map((p) => p.id), 'accepted', `${unflaggedPending.length} unflagged pairs accepted`); setConfirmBulk(false); }}>Accept</button>
                <button className="btn ghost sm" onClick={() => setConfirmBulk(false)}>Cancel</button>
              </span>
            ) : (
              <button className="btn" disabled={!unflaggedPending.length} onClick={() => setConfirmBulk(true)}>Accept all unflagged ({unflaggedPending.length})</button>
            )}
          </div>
        </div>
      </div>

      <div className="kern-body">
        <div className="kern-table-wrap">
          <div className="kt-tools">
            <Seg small value={filter} onChange={setFilter} options={[
              { value: 'unsure', label: <>Unsure <span className="c">{ks.unsure}</span></> },
              { value: 'pending', label: <>Not decided <span className="c">{ks.pending}</span></> },
              { value: 'big', label: <>Δ ≥ 20</> },
              { value: 'new', label: <>New <span className="c">{ks.added}</span></> },
              { value: 'all', label: <>All <span className="c">{ks.total}</span></> },
            ]} />
            <input className="search" placeholder="Pair or glyph…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter pairs" />
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="time">Latest first</option>
              <option value="delta">Biggest change</option>
              <option value="pair">Pair A–Z</option>
            </select>
          </div>
          <div className="kt-scroll">
            <table className="kt">
              <thead><tr><th>Pair</th><th className="num">Tue</th><th className="num">Now</th><th className="num">Δ</th><th>When</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const d = delta(p);
                  return (
                    <tr key={p.id} className={`${sel?.id === p.id ? 'on' : ''}`} onClick={() => select(p.id)}>
                      <td className="kt-pair">
                        <span className="spec bold">{p.left}{p.right}</span>
                        {p.unsure && <span className="kflag" title="Flagged unsure by Jonas"><Icon.flag size={10} /></span>}
                      </td>
                      <td className="num mono">{p.before ?? '—'}</td>
                      <td className="num mono">{p.after}</td>
                      <td className={`num mono ${Math.abs(d) >= 20 ? 'big' : ''}`}>{d > 0 ? '+' : ''}{d}</td>
                      <td className="when">{shortStamp(p.at, s.now)}</td>
                      <td><StatusPill status={s.kern[p.id]} /></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={6} className="empty">No pairs match.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {sel && (
          <div className="kern-detail">
            <div className="kd-head">
              <div>
                <h2><span className="spec bold">{sel.left} + {sel.right}</span> {sel.unsure && <span className="pill pill-flag"><Icon.flag size={10} /> unsure</span>}</h2>
                <div className="sub">Changed {rel(sel.at, s.now)} · {sel.before === null ? 'new pair (was unkerned)' : `was ${sel.before}`} → <b className="mono">{sel.after}</b></div>
              </div>
              <StatusPill status={selDec} />
            </div>

            <div className="kd-compare">
              <div className="kd-col">
                <div className="kd-label">Tue 11 Nov</div>
                <PathText style="bold" text={sel.left + sel.right} size={120} kern={() => sel.before ?? 0} />
                <div className="mono kd-val">{sel.before ?? 0}</div>
              </div>
              <div className="kd-col">
                <div className="kd-label">Jonas now</div>
                <PathText style="bold" text={sel.left + sel.right} size={120} kern={() => sel.after} />
                <div className="mono kd-val">{sel.after}</div>
              </div>
            </div>

            <div className="kd-context">
              <div className="ctx-row"><span className="ctx-label">Tue</span><PathText style="bold" text={sel.context} size={34} kern={kernTue} /></div>
              <div className="ctx-row"><span className="ctx-label">Now</span><PathText style="bold" text={sel.context} size={34} kern={kernJonas} /></div>
              <div className="ctx-row small"><span className="ctx-label">10 pt</span><PathText style="bold" text={sel.context + '  ' + sel.context} size={14} kern={kernNow} /></div>
            </div>

            {sel.note && (
              <div className="kd-note">
                <Avatar id="jonas" size={22} />
                <div><b>{PEOPLE.jonas.first}’s note</b><p>{sel.note}</p></div>
              </div>
            )}

            <div className="kd-actions">
              <button className="btn approve" disabled={selDec === 'accepted'} onClick={() => decide([sel.id], 'accepted', `${sel.left}${sel.right} ${sel.after} accepted`)}><Icon.check /> Accept {sel.after}</button>
              <button className="btn" disabled={selDec === 'reverted'} onClick={() => decide([sel.id], 'reverted', `${sel.left}${sel.right} reverted to ${sel.before ?? 'no kerning'}`)}>
                Revert to {sel.before ?? 'none'}
              </button>
              {selDec !== 'pending' && <button className="btn ghost" onClick={() => decide([sel.id], 'pending', 'Decision cleared')}>Clear</button>}
            </div>
            <div className="kd-reply">
              <textarea rows={2} placeholder={`Reply to Jonas about ${sel.left}${sel.right}…`} value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn" disabled={!note.trim()} onClick={askJonas}><Icon.bubble /> Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
