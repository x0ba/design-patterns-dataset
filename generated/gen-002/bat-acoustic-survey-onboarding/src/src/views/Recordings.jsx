import React, { useMemo, useState } from 'react';
import { FILES, DETECTORS, LABELS, LABEL_ORDER, REASONS, REASON_ORDER, PROJECT, fmtClock, fmtDay, nf } from '../data.js';
import { Icon, LabelChip } from '../ui.jsx';

const PAGE = 12;
const COLS = [
  { k: 'name', t: 'File' },
  { k: 'det', t: 'Detector' },
  { k: 'ts', t: 'Recorded' },
  { k: 'sr', t: 'Rate', r: true },
  { k: 'dur', t: 'Length', r: true },
  { k: 'calls', t: 'Calls', r: true },
  { k: 'snr', t: 'SNR dB', r: true },
  { k: 'label', t: 'Label' },
  { k: 'conf', t: 'Conf.', r: true },
];

export default function Recordings({ ctx }) {
  const { info, vetted, applied, go } = ctx;
  const [q, setQ] = useState('');
  const [det, setDet] = useState('all');
  const [night, setNight] = useState('all');
  const [label, setLabel] = useState('all');
  const [sr, setSr] = useState('all');
  const [reason, setReason] = useState('all');
  const [sort, setSort] = useState({ k: 'ts', dir: 1 });
  const [page, setPage] = useState(0);

  const eff = (f) => vetted[f.id]?.label ?? info[f.i].auto;

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let r = FILES.filter((f) => {
      if (det !== 'all' && f.det !== det) return false;
      if (night !== 'all' && f.night !== +night) return false;
      if (sr !== 'all' && f.sr !== +sr) return false;
      if (label !== 'all' && eff(f) !== label) return false;
      if (reason !== 'all' && info[f.i].reason !== reason) return false;
      if (ql && !f.name.toLowerCase().includes(ql)) return false;
      return true;
    });
    const val = (f) => (sort.k === 'label' ? LABELS[eff(f)].name : sort.k === 'conf' ? (info[f.i].reason && f.conf == null ? -1 : f.conf ?? -1) : f[sort.k]);
    r = r.slice().sort((a, b) => {
      const x = val(a), y = val(b);
      const c = typeof x === 'string' ? x.localeCompare(y) : x - y;
      return (c || a.ts - b.ts) * sort.dir;
    });
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, det, night, sr, label, reason, sort, info, vetted]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages - 1);
  const slice = rows.slice(p * PAGE, p * PAGE + PAGE);
  const reset = (fn) => (e) => { fn(e.target.value); setPage(0); };
  const clickSort = (k) => setSort((s) => (s.k === k ? { k, dir: -s.dir } : { k, dir: 1 }));
  const filtered = det !== 'all' || night !== 'all' || label !== 'all' || sr !== 'all' || reason !== 'all' || q;

  const open = (f) => go('vetting', { vet: { queue: 'custom', custom: rows.slice(0, 3000).map((x) => x.id), cur: f.id } });

  return (
    <div className="page">
      <div className="page-h">
        <div>
          <h1>Recordings</h1>
          <p className="muted">{nf(FILES.length)} files from three detectors, {PROJECT.nights.join(', ')}. Select a file to open it in Vetting.</p>
        </div>
      </div>
      <section className="card flush">
        <div className="filters">
          <label className="search"><Icon name="search" size={16} /><input value={q} onChange={reset(setQ)} placeholder="Search file name, e.g. HR03_20261110" aria-label="Search file names" /></label>
          <label>Detector<select value={det} onChange={reset(setDet)}><option value="all">All</option>{DETECTORS.map((d) => <option key={d.id} value={d.id}>{d.id} {d.name}</option>)}</select></label>
          <label>Night<select value={night} onChange={reset(setNight)}><option value="all">All</option>{PROJECT.nights.map((n, i) => <option key={n} value={i}>{n}</option>)}</select></label>
          <label>Label<select value={label} onChange={reset(setLabel)}><option value="all">All</option>{LABEL_ORDER.map((k) => <option key={k} value={k}>{LABELS[k].name}</option>)}</select></label>
          <label>Rejected by<select value={reason} onChange={reset(setReason)}><option value="all">Any</option>{REASON_ORDER.map((r) => <option key={r} value={r}>{REASONS[r].short}</option>)}</select></label>
          <label>Rate<select value={sr} onChange={reset(setSr)}><option value="all">All</option><option value="256">256 kHz</option><option value="384">384 kHz</option></select></label>
          {filtered && <button className="link" onClick={() => { setQ(''); setDet('all'); setNight('all'); setLabel('all'); setSr('all'); setReason('all'); setPage(0); }}>Clear</button>}
        </div>
        <table className="data">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.k} className={c.r ? 'r' : ''} aria-sort={sort.k === c.k ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
                  <button onClick={() => clickSort(c.k)}>{c.t}{sort.k === c.k ? <span className="sortm">{sort.dir > 0 ? '▲' : '▼'}</span> : null}</button>
                </th>
              ))}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((f) => {
              const inf = info[f.i];
              const v = vetted[f.id];
              return (
                <tr key={f.id} tabIndex={0} onClick={() => open(f)} onKeyDown={(e) => e.key === 'Enter' && open(f)}>
                  <td className="mono">{f.name}</td>
                  <td>{f.det}</td>
                  <td>{fmtDay(f.ts)}, {fmtClock(f.ts)}</td>
                  <td className="r">{f.sr} kHz</td>
                  <td className="r">{f.dur.toFixed(1)} s</td>
                  <td className="r">{f.calls}</td>
                  <td className="r">{f.snr.toFixed(1)}</td>
                  <td><LabelChip label={eff(f)} small /></td>
                  <td className="r">{inf.reason || f.conf == null ? <span className="muted">—</span> : `${Math.round(f.conf * 100)}%`}</td>
                  <td>
                    {v ? <span className="tag vet">Vetted</span> : inf.reason ? <span className="tag rej">{REASONS[inf.reason].short}</span> : null}
                  </td>
                </tr>
              );
            })}
            {!slice.length && <tr><td colSpan={10} className="empty">No files match these filters.</td></tr>}
          </tbody>
        </table>
        <div className="pager">
          <span className="muted">{rows.length ? `${nf(p * PAGE + 1)}–${nf(Math.min(rows.length, p * PAGE + PAGE))} of ${nf(rows.length)} files` : '0 files'}</span>
          <div>
            <button className="btn small" disabled={p === 0} onClick={() => setPage(0)}>First</button>
            <button className="btn small" disabled={p === 0} onClick={() => setPage(p - 1)}>Previous</button>
            <span className="pg">Page {p + 1} of {nf(pages)}</span>
            <button className="btn small" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>Next</button>
          </div>
        </div>
      </section>
    </div>
  );
}
