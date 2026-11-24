import { useMemo } from 'react';
import { DATA, STATUS_LABEL, STATUS_ORDER } from '../data';
import { L, replace } from '../lib/router';
import { Icon, StatusBadge } from '../components/ui';
import { dur, fmtDate, tc } from '../lib/util';

const PAGE = 25;

function Pager({ page, pages, total, set }: { page: number; pages: number; total: number; set: (p: number) => void }) {
  if (pages <= 1) return <div className="pager"><span className="sub">{total} results</span></div>;
  return (
    <div className="pager">
      <span className="sub">{(page - 1) * PAGE + 1}–{Math.min(total, page * PAGE)} of {total}</span>
      <div>
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => set(page - 1)}><Icon name="chev-left" size={12} /> Previous</button>
        <span className="pg">Page {page} of {pages}</span>
        <button className="btn btn-sm" disabled={page >= pages} onClick={() => set(page + 1)}>Next <Icon name="chev-right" size={12} /></button>
      </div>
    </div>
  );
}

function setQ(base: string, q: URLSearchParams, patch: Record<string, string | undefined>) {
  const n = new URLSearchParams(q);
  Object.entries(patch).forEach(([k, v]) => { if (v === undefined || v === '' || v === 'all') n.delete(k); else n.set(k, v); });
  if (!('page' in patch)) n.delete('page');
  const s = n.toString();
  replace(`${base}${s ? '?' + s : ''}`);
}

export function ArchivePage({ pid, q }: { pid: string; q: URLSearchParams }) {
  const d = DATA[pid];
  const base = L.archive(pid);
  const source = q.get('source') || 'all';
  const status = q.get('status') || 'all';
  const text = q.get('q') || '';
  const sort = q.get('sort') || 'id';
  const page = Math.max(1, Number(q.get('page') || 1));
  const srcObj = d.sources.find((s) => s.id === source);

  const bySource = useMemo(() => d.items.filter((i) => source === 'all' || i.sourceId === source), [d, source]);
  const counts = useMemo(() => { const c: Record<string, number> = { all: bySource.length }; STATUS_ORDER.forEach((s) => (c[s] = bySource.filter((i) => i.clearance.status === s).length)); return c; }, [bySource]);
  const rows = useMemo(() => {
    const t = text.trim().toLowerCase();
    let r = bySource.filter((i) => (status === 'all' || i.clearance.status === status) && (!t || `${i.id} ${i.title} ${i.detail}`.toLowerCase().includes(t)));
    const ord = (s: string) => STATUS_ORDER.indexOf(s as never);
    r = [...r].sort((a, b) => sort === 'year' ? a.year - b.year || a.id.localeCompare(b.id) : sort === 'status' ? ord(b.clearance.status) - ord(a.clearance.status) || a.id.localeCompare(b.id) : sort === 'waiting' ? (a.clearance.requestedOn || '9').localeCompare(b.clearance.requestedOn || '9') : a.id.localeCompare(b.id));
    return r;
  }, [bySource, status, text, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const pg = Math.min(page, pages);
  const slice = rows.slice((pg - 1) * PAGE, pg * PAGE);

  return (
    <>
      <header className="ph">
        <div className="ph-main">
          <div className="eyebrow">{d.project.title}</div>
          <h1>{srcObj ? srcObj.name : 'Archive & clearances'}</h1>
          <p className="lede">{srcObj ? `${srcObj.kind}. ${counts.all} items in ${d.project.title}.` : `${d.items.length} archival items from ${d.sources.length} sources. Every item carries its own clearance record.`}</p>
        </div>
      </header>

      {srcObj && (
        <section className="card src-card">
          <dl className="kv kv-row">
            <div><dt>Licensing contact</dt><dd>{srcObj.contact}<br /><span className="sub">{srcObj.email}</span></dd></div>
            <div><dt>Usual turnaround</dt><dd>{srcObj.turnaround}</dd></div>
            <div className="wide"><dt>Terms</dt><dd>{srcObj.terms}</dd></div>
          </dl>
        </section>
      )}

      <section className="card">
        <div className="filters">
          <div className="findbox grow">
            <Icon name="search" size={14} />
            <input value={text} onChange={(e) => setQ(base, q, { q: e.target.value })} placeholder="Filter by ID, title or description" aria-label="Filter archival items" />
          </div>
          <label className="sel"><span>Source</span>
            <select value={source} onChange={(e) => setQ(base, q, { source: e.target.value })}>
              <option value="all">All sources ({d.items.length})</option>
              {d.sources.map((s) => <option key={s.id} value={s.id}>{s.name} ({d.items.filter((i) => i.sourceId === s.id).length})</option>)}
            </select>
          </label>
          <label className="sel"><span>Sort by</span>
            <select value={sort} onChange={(e) => setQ(base, q, { sort: e.target.value })}>
              <option value="id">Item ID</option><option value="year">Year of footage</option><option value="status">Clearance (open first)</option><option value="waiting">Oldest request first</option>
            </select>
          </label>
        </div>
        <div className="seg-filter" role="group" aria-label="Clearance status">
          {(['all', ...STATUS_ORDER] as const).map((s) => (
            <button key={s} className={`sf ${status === s ? 'on' : ''}`} aria-pressed={status === s} onClick={() => setQ(base, q, { status: s })}>
              {s !== 'all' && <i className={`sf-dot sf-${s}`} />}{s === 'all' ? 'All' : STATUS_LABEL[s]} <span>{counts[s]}</span>
            </button>
          ))}
        </div>
        <details className="legend-help">
          <summary>What the clearance statuses mean</summary>
          <ul>
            <li><StatusBadge status="cleared-all-media" size="sm" /> Licensed for every medium. No restriction on festival, broadcast or streaming.</li>
            <li><StatusBadge status="cleared-festival-only" size="sm" /> Licensed for festival screenings only. Needs a new licence before broadcast or release.</li>
            <li><StatusBadge status="pending" size="sm" /> Request sent, no answer yet. Treat as <b>not cleared</b>.</li>
            <li><StatusBadge status="denied" size="sm" /> The source refused. Replace or cut the footage.</li>
          </ul>
        </details>
        <table className="tbl archive-tbl">
          <thead><tr><th>Item</th><th>Description</th>{!srcObj && <th>Source</th>}<th>Year</th><th>Used in</th><th>Clearance</th></tr></thead>
          <tbody>
            {slice.map((i) => {
              const s = d.sources.find((x) => x.id === i.sourceId)!;
              return (
                <tr key={i.id}>
                  <td className="mono"><a href={L.item(pid, i.id)}>{i.id}</a></td>
                  <td><a className="rowlink" href={L.item(pid, i.id)}>{i.title}</a><div className="sub">{i.rollCount > 1 ? `Roll ${i.roll} of ${i.rollCount} · ` : ''}{i.format}</div></td>
                  {!srcObj && <td>{s.name}</td>}
                  <td className="mono">{i.year}</td>
                  <td>{i.usages.length ? i.usages.map((u, k) => <span key={u.sceneN}>{k > 0 && ', '}<a href={L.scene(pid, u.sceneN)}>Scene {u.sceneN}</a></span>) : <span className="muted">Not used</span>}</td>
                  <td><StatusBadge status={i.clearance.status} size="sm" short />{i.clearance.status === 'pending' && <div className="sub">sent {fmtDate(i.clearance.requestedOn!)}</div>}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="muted pad">No items match these filters. <a href={base}>Clear filters</a></td></tr>}
          </tbody>
        </table>
        <Pager page={pg} pages={pages} total={rows.length} set={(p) => setQ(base, q, { page: String(p) })} />
      </section>
    </>
  );
}

export function ClipsPage({ pid, q }: { pid: string; q: URLSearchParams }) {
  const d = DATA[pid];
  const base = L.clips(pid);
  const type = q.get('type') || 'all';
  const used = q.get('used') || 'all';
  const text = q.get('q') || '';
  const page = Math.max(1, Number(q.get('page') || 1));
  const types = useMemo(() => [...new Set(d.clips.map((c) => c.type))].sort(), [d]);
  const rows = useMemo(() => {
    const t = text.trim().toLowerCase();
    return d.clips.filter((c) => (type === 'all' || c.type === type) && (used === 'all' || (used === 'yes' ? c.sceneN !== undefined : c.sceneN === undefined)) && (!t || `${c.id} ${c.desc}`.toLowerCase().includes(t)));
  }, [d, type, used, text]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const pg = Math.min(page, pages);
  return (
    <>
      <header className="ph"><div className="ph-main"><div className="eyebrow">{d.project.title}</div><h1>Clips</h1><p className="lede">{d.clips.length.toLocaleString('en-US')} clips: camera rushes, interview angles, graphics and archival transfers. {d.clips.filter((c) => c.sceneN !== undefined).length.toLocaleString('en-US')} are placed in a scene.</p></div></header>
      <section className="card">
        <div className="filters">
          <div className="findbox grow"><Icon name="search" size={14} /><input value={text} onChange={(e) => setQ(base, q, { q: e.target.value })} placeholder="Filter by clip name or description" aria-label="Filter clips" /></div>
          <label className="sel"><span>Type</span><select value={type} onChange={(e) => setQ(base, q, { type: e.target.value })}><option value="all">All types</option>{types.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="sel"><span>In the cut</span><select value={used} onChange={(e) => setQ(base, q, { used: e.target.value })}><option value="all">All clips</option><option value="yes">Placed in a scene</option><option value="no">Not placed yet</option></select></label>
        </div>
        <table className="tbl">
          <thead><tr><th>Clip</th><th>Description</th><th>Type</th><th className="r">Length</th><th>Shot</th><th>Scene</th></tr></thead>
          <tbody>
            {rows.slice((pg - 1) * PAGE, pg * PAGE).map((c) => (
              <tr key={c.id}>
                <td className="mono"><a href={L.clip(pid, c.id)}>{c.id}</a></td>
                <td>{c.desc}{c.circled && <span className="circ" title="Circled take"> ●</span>}</td>
                <td>{c.type}</td><td className="r mono">{tc(c.durSec, c.durSec >= 3600)}</td><td>{fmtDate(c.shot, true)}</td>
                <td>{c.sceneN ? <a href={L.scene(pid, c.sceneN)}>Scene {c.sceneN}</a> : <span className="muted">—</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="muted pad">No clips match. <a href={base}>Clear filters</a></td></tr>}
          </tbody>
        </table>
        <Pager page={pg} pages={pages} total={rows.length} set={(p) => setQ(base, q, { page: String(p) })} />
      </section>
    </>
  );
}

export function ClipPage({ pid, id }: { pid: string; id: string }) {
  const d = DATA[pid];
  const c = d.clips.find((x) => x.id === id);
  if (!c) return <div className="empty"><strong>No clip “{id}”</strong><p><a href={L.clips(pid)}>All clips</a></p></div>;
  const s = c.sceneN ? d.scenes.find((x) => x.n === c.sceneN) : undefined;
  return (
    <>
      <header className="ph"><div className="ph-main"><div className="eyebrow">Clip · {c.type}</div><h1 className="mono h1-id">{c.id}</h1><p className="lede">{c.desc}</p></div></header>
      <section className="card narrow">
        <dl className="kv">
          <div><dt>Length</dt><dd className="mono">{tc(c.durSec)} <span className="sub">({dur(c.durSec)})</span></dd></div>
          <div><dt>Shot</dt><dd>{fmtDate(c.shot, true)}</dd></div>
          <div><dt>Source</dt><dd>{c.camera}</dd></div>
          <div><dt>Circled take</dt><dd>{c.circled ? 'Yes' : 'No'}</dd></div>
          <div><dt>Placed in</dt><dd>{s ? <a href={L.scene(pid, s.n)}>Scene {s.n} · {s.title}</a> : 'Not placed in a scene yet'}</dd></div>
          {c.itemId && <div><dt>Archival item</dt><dd><a className="mono" href={L.item(pid, c.itemId)}>{c.itemId}</a></dd></div>}
        </dl>
      </section>
    </>
  );
}

export function TranscriptsPage({ pid, q }: { pid: string; q: URLSearchParams }) {
  const d = DATA[pid];
  const base = L.transcripts(pid);
  const text = q.get('q') || '';
  const used = q.get('used') || 'all';
  const rows = useMemo(() => {
    const t = text.trim().toLowerCase();
    return d.transcripts.filter((x) => (!t || `${x.name} ${x.role}`.toLowerCase().includes(t)) && (used === 'all' || (used === 'yes' ? x.usedIn.length > 0 : x.usedIn.length === 0)));
  }, [d, text, used]);
  return (
    <>
      <header className="ph"><div className="ph-main"><div className="eyebrow">{d.project.title}</div><h1>Interview transcripts</h1><p className="lede">{d.transcripts.length} interviews. {d.transcripts.filter((t) => t.usedIn.length).length} have passages in the cut.</p></div></header>
      <section className="card">
        <div className="filters">
          <div className="findbox grow"><Icon name="search" size={14} /><input value={text} onChange={(e) => setQ(base, q, { q: e.target.value })} placeholder="Filter by name or role" aria-label="Filter transcripts" /></div>
          <label className="sel"><span>In the cut</span><select value={used} onChange={(e) => setQ(base, q, { used: e.target.value })}><option value="all">All interviews</option><option value="yes">Used in a scene</option><option value="no">Not used yet</option></select></label>
        </div>
        <table className="tbl">
          <thead><tr><th>Interviewee</th><th>Role</th><th>Recorded</th><th className="r">Length</th><th>Status</th><th>Used in</th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td><a className="rowlink" href={L.transcript(pid, t.id)}>{t.name}</a></td>
                <td>{t.role}</td><td>{fmtDate(t.recorded, true)}</td><td className="r mono">{tc(t.durSec)}</td><td>{t.status}</td>
                <td>{t.usedIn.length ? t.usedIn.map((u, k) => <span key={u.sceneN}>{k > 0 && ', '}<a href={L.transcript(pid, t.id, { scene: u.sceneN })}>Scene {u.sceneN}</a></span>) : <span className="muted">Not used</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="muted pad">No interviews match. <a href={base}>Clear filters</a></td></tr>}
          </tbody>
        </table>
        <div className="pager"><span className="sub">{rows.length} interviews</span></div>
      </section>
    </>
  );
}
