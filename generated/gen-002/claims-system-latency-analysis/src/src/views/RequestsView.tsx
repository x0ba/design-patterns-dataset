// Request explorer: failed requests in the selected range (or all 72 hours), with filters, paging,
// and a span waterfall for each request. Successful requests appear only as the 1-in-400 sample.

import { useMemo, useState } from 'react';
import type { Dataset, Req, Span } from '../data/generate.ts';
import { recordRange } from '../data/series.ts';
import { CONNECTORS, ENDPOINTS, MINUTES, ROUTE_NONE, ROUTE_LABEL } from '../data/scenario.ts';
import { clock, clockMs, fmtInt, fmtMs, fmtPct, rangeLabel } from '../lib/format.ts';
import { COLORS } from '../components/chartParts.tsx';

type Sort = { key: 'time' | 'duration'; dir: 'asc' | 'desc' };
const PAGE = 50;

export function RequestsView({ ds, failures, samples, sel }: { ds: Dataset; failures: Req[]; samples: Req[]; sel: [number, number] }) {
  const [scope, setScope] = useState<'selection' | 'all'>('selection');
  const [connector, setConnector] = useState<string>('all');
  const [endpoint, setEndpoint] = useState<string>('all');
  const [retried, setRetried] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [includeOk, setIncludeOk] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>({ key: 'time', dir: 'asc' });
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const [m0, m1] = scope === 'selection' ? sel : [0, MINUTES];

  const rows = useMemo(() => {
    const [lo, hi] = recordRange(failures, m0, m1);
    const out: Req[] = [];
    const q = query.trim().toLowerCase();
    const pass = (r: Req) => {
      if (connector !== 'all' && String(r.route) !== connector) return false;
      if (endpoint !== 'all' && String(r.endpoint) !== endpoint) return false;
      if (retried === 'yes' && !r.retried) return false;
      if (retried === 'no' && r.retried) return false;
      if (status !== 'all' && String(r.status) !== status) return false;
      if (q && !(r.id.includes(q) || r.claimant.includes(q))) return false;
      return true;
    };
    for (let i = lo; i < hi; i++) if (pass(failures[i])) out.push(failures[i]);
    if (includeOk && status === 'all' && retried !== 'yes') {
      for (const s of samples) {
        if (s.m < m0 || s.m >= m1) continue;
        if (pass(s)) out.push(s);
      }
    }
    const dir = sort.dir === 'asc' ? 1 : -1;
    out.sort((a, b) => (sort.key === 'time' ? a.t - b.t : a.durMs - b.durMs) * dir);
    return out;
  }, [failures, samples, m0, m1, connector, endpoint, retried, status, includeOk, query, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const pageRows = rows.slice(safePage * PAGE, safePage * PAGE + PAGE);
  const retriedCount = rows.reduce((a, r) => a + (r.retried ? 1 : 0), 0);
  const failedCount = rows.reduce((a, r) => a + (r.status >= 500 ? 1 : 0), 0);

  const selected = picked ? rows.find((r) => r.id === picked) ?? failures.find((r) => r.id === picked) ?? samples.find((r) => r.id === picked) ?? null : null;

  const toggleSort = (key: Sort['key']) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'time' ? 'asc' : 'desc' }));
    setPage(0);
  };

  return (
    <div className="view requests">
      <section className="card filter-card">
        <div className="filters">
          <label className="field">
            <span>Range</span>
            <select value={scope} onChange={(e) => { setScope(e.target.value as 'selection' | 'all'); setPage(0); }}>
              <option value="selection">Selected range ({rangeLabel(sel[0], sel[1])})</option>
              <option value="all">All 72 hours</option>
            </select>
          </label>
          <label className="field">
            <span>Connector</span>
            <select value={connector} onChange={(e) => { setConnector(e.target.value); setPage(0); }}>
              <option value="all">All</option>
              {CONNECTORS.map((c, i) => (
                <option key={c} value={String(i)}>{c}</option>
              ))}
              <option value={String(ROUTE_NONE)}>No mainframe hop</option>
            </select>
          </label>
          <label className="field">
            <span>Endpoint</span>
            <select value={endpoint} onChange={(e) => { setEndpoint(e.target.value); setPage(0); }}>
              <option value="all">All endpoints</option>
              {ENDPOINTS.map((ep, i) => (
                <option key={ep.id} value={String(i)}>{ep.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
              <option value="all">All failures</option>
              <option value="504">504 gateway timeout</option>
              <option value="502">502 upstream reset</option>
            </select>
          </label>
          <label className="field">
            <span>Retried by user</span>
            <select value={retried} onChange={(e) => { setRetried(e.target.value); setPage(0); }}>
              <option value="all">Any</option>
              <option value="yes">Retried</option>
              <option value="no">Not retried</option>
            </select>
          </label>
          <label className="field field-wide">
            <span>Request or claimant key</span>
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="e.g. 3f9a or ck_" />
          </label>
          <label className="check">
            <input type="checkbox" checked={includeOk} onChange={(e) => { setIncludeOk(e.target.checked); setPage(0); }} />
            Include sampled successful requests
          </label>
        </div>
        <div className="summary-strip">
          <span><b>{fmtInt(rows.length)}</b> requests match</span>
          <span><b>{fmtInt(failedCount)}</b> failed with 5xx</span>
          <span><b>{fmtPct(rows.length ? retriedCount / rows.length : 0, 0)}</b> retried</span>
          <span className="muted">Successful requests appear only as the 1-in-400 sample.</span>
        </div>
      </section>

      <div className="requests-split">
        <section className="card table-card">
          <table className="data-table request-table">
            <thead>
              <tr>
                <th>
                  <button className="sort" onClick={() => toggleSort('time')}>
                    Time {sort.key === 'time' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                  </button>
                </th>
                <th>Endpoint</th>
                <th>Connector</th>
                <th>Status</th>
                <th className="num">
                  <button className="sort" onClick={() => toggleSort('duration')}>
                    Duration {sort.key === 'duration' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                  </button>
                </th>
                <th>Retried</th>
                <th>Request</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} className={`${r.id === picked ? 'row-picked' : ''} ${r.sampled ? 'row-ok' : ''}`} onClick={() => setPicked(r.id)}>
                  <td className="nowrap">{clock(Math.floor(r.t / 60000))}:{String(Math.floor((r.t % 60000) / 1000)).padStart(2, '0')}</td>
                  <td>{ENDPOINTS[r.endpoint].label}</td>
                  <td>{r.route < 3 ? CONNECTORS[r.route] : <span className="muted">none</span>}</td>
                  <td>
                    <span className={`status ${r.status >= 500 ? 'status-bad' : 'status-ok'}`}>{r.status}</span>
                  </td>
                  <td className="num">{fmtMs(r.durMs)}</td>
                  <td>{r.sampled ? <span className="muted">–</span> : r.retried ? 'yes' : 'no'}</td>
                  <td className="mono muted">{r.id.slice(0, 13)}</td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">No requests match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="pager">
            <button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Previous</button>
            <span>Page {safePage + 1} of {pages} · {fmtInt(rows.length)} rows</span>
            <button disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Next</button>
          </div>
        </section>

        <aside className="card detail-card">
          {selected ? <RequestDetail ds={ds} r={selected} samples={samples} /> : <div className="empty-detail">Pick a request to see its trace.</div>}
        </aside>
      </div>
    </div>
  );
}

function RequestDetail({ ds, r, samples }: { ds: Dataset; r: Req; samples: Req[] }) {
  const peer = useMemo(() => nearestOkPeer(samples, r), [samples, r]);
  const mfSpan = r.spans.find((s) => s.kind === 'mf');
  const ep = ENDPOINTS[r.endpoint];
  const minute = Math.floor(r.t / 60000);
  const util = r.route < 3 ? ds.concC[minute * 3 + r.route] / ds.pool[minute] : null;
  return (
    <div className="detail">
      <div className="detail-head">
        <div className="detail-status">
          <span className={`status ${r.status >= 500 ? 'status-bad' : 'status-ok'}`}>{r.status}</span>
          <span className="muted">{r.sampled ? 'sampled success' : 'failed request'}</span>
        </div>
        <h3>{ep.label}</h3>
        <div className="mono small muted">{ep.method} {ep.path}</div>
      </div>
      <dl className="metric-list compact">
        <div><dt>Request ID</dt><dd className="mono">{r.id}</dd></div>
        <div><dt>Received</dt><dd>{clockMs(r.t)}</dd></div>
        <div><dt>Duration at edge</dt><dd>{fmtMs(r.durMs)}</dd></div>
        <div><dt>Connector</dt><dd>{r.route < 3 ? CONNECTORS[r.route] : ROUTE_LABEL[ROUTE_NONE]}</dd></div>
        <div><dt>Retried by user</dt><dd>{r.sampled ? '–' : r.retried ? 'yes' : 'no'}</dd></div>
        <div><dt>Claimant key</dt><dd className="mono">{r.claimant}</dd></div>
        {util !== null && <div><dt>Connector use that minute</dt><dd>{(util * 100).toFixed(0)}% of pool</dd></div>}
      </dl>
      <Waterfall spans={r.spans} total={r.durMs} />
      {mfSpan && mfSpan.outcome !== 'ok' && (
        <p className="note-bad small">
          The last hop, {mfSpan.svc}, {mfSpan.outcome === 'timeout' ? `received no response for ${fmtMs(mfSpan.durMs)} and the gateway returned 504` : `closed the session after ${fmtMs(mfSpan.durMs)}`}.
          The traces stop at the connector edge, so the wait inside it is not separated.
        </p>
      )}
      {peer && (
        <>
          <h4>Nearest successful request on the same route</h4>
          <div className="small muted">
            {clockMs(peer.t)} · {ENDPOINTS[peer.endpoint].label} · {fmtMs(peer.durMs)}
          </div>
          <Waterfall spans={peer.spans} total={peer.durMs} compact />
        </>
      )}
    </div>
  );
}

function nearestOkPeer(samples: Req[], r: Req): Req | null {
  let best: Req | null = null;
  let bestGap = Infinity;
  for (const s of samples) {
    if (s.route !== r.route || s.endpoint !== r.endpoint) continue;
    const gap = Math.abs(s.t - r.t);
    if (gap < bestGap && gap <= 30 * 60000) {
      best = s;
      bestGap = gap;
    }
  }
  return best;
}

function spanColor(s: Span): string {
  if (s.outcome === 'timeout') return COLORS.fail;
  if (s.outcome === 'reset') return COLORS.amber;
  if (s.kind === 'edge') return '#8f9aab';
  if (s.kind === 'gateway') return '#a9b4c2';
  if (s.kind === 'mf') return COLORS.conn[Math.max(0, CONNECTORS.indexOf(s.svc as (typeof CONNECTORS)[number]))] ?? COLORS.amber;
  return COLORS.accent;
}

export function Waterfall({ spans, total, compact = false }: { spans: Span[]; total: number; compact?: boolean }) {
  const W = 400;
  const LABEL = compact ? 118 : 138;
  const rowH = compact ? 16 : 20;
  const maxT = Math.max(total, ...spans.map((s) => s.startMs + s.durMs), 1);
  const x = (ms: number) => LABEL + (ms / maxT) * (W - LABEL - 52);
  const H = spans.length * rowH + 22;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxT);
  return (
    <svg className="waterfall" width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trace waterfall">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={x(t)} x2={x(t)} y1={0} y2={H - 16} stroke={COLORS.grid} />
          <text x={x(t)} y={H - 4} fontSize={9.5} fill={COLORS.muted} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>
            {t >= 1000 ? `${(t / 1000).toFixed(t >= 10000 ? 0 : 1)} s` : `${Math.round(t)} ms`}
          </text>
        </g>
      ))}
      {spans.map((s, i) => {
        const y = i * rowH;
        const x0 = x(s.startMs);
        const x1 = x(s.startMs + s.durMs);
        const label = s.depth ? `${'· '.repeat(Math.min(s.depth, 3))}${s.svc}` : s.svc;
        return (
          <g key={i}>
            <text x={4 + Math.min(s.depth, 3) * 0} y={y + rowH / 2 + 3.5} fontSize={compact ? 9.5 : 10.5} fill={s.kind === 'edge' ? COLORS.inkSoft : COLORS.ink} fontWeight={s.kind === 'mf' ? 600 : 400}>
              {label}
            </text>
            <rect x={x0} y={y + 4} width={Math.max(2, x1 - x0)} height={rowH - 8} rx={2} fill={spanColor(s)} opacity={s.kind === 'edge' ? 0.35 : 0.9} />
            <text x={Math.min(x1 + 4, W - 4)} y={y + rowH / 2 + 3.5} fontSize={9.5} fill={COLORS.muted} textAnchor={x1 + 4 > W - 44 ? 'end' : 'start'}>
              {s.outcome === 'timeout' ? 'timeout' : s.outcome === 'reset' ? 'reset' : fmtMs(s.durMs)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

