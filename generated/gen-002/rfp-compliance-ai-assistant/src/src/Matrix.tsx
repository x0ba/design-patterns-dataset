import { useEffect, useMemo, useRef } from 'react';
import { useApp } from './App';
import { RFP_SECTIONS, type Status } from './data';
import {
  applyFilters, groupKey, quoteVerified, isActive, isOpenGap, matchesAttention, srcRef, LOW_CONF,
  type Attention, type Req,
} from './state';
import { StatusPill, ReviewMark, Avatar, ConfMeter, Icon, Kbd } from './ui';
import { Detail } from './Detail';

const GROUP_LABEL = (k: string) =>
  k === 'A1' ? 'Addendum 1 · Nov 9' : k === 'A2' ? 'Addendum 2 · Nov 13' : `§${k} ${RFP_SECTIONS[k]}`;

export function MatrixView() {
  const { state, dispatch, act } = useApp();
  const { reqs, filters, selectedId, panel } = state;
  const active = reqs.filter(isActive);
  const filtered = useMemo(() => applyFilters(reqs, filters), [reqs, filters]);
  const listRef = useRef<HTMLDivElement>(null);

  const counts = {
    addressed: active.filter((r) => r.status === 'addressed').length,
    partial: active.filter((r) => r.status === 'partial').length,
    missing: active.filter((r) => r.status === 'missing').length,
  };
  const rv = {
    accepted: reqs.filter((r) => r.review === 'accepted').length,
    corrected: reqs.filter((r) => r.review === 'corrected').length,
    rejected: reqs.filter((r) => r.review === 'rejected').length,
    removed: reqs.filter((r) => r.review === 'removed').length,
  };
  const reviewed = rv.accepted + rv.corrected + rv.rejected + rv.removed;
  const total = reqs.length;

  const attn: { id: Attention; label: string; n: number; hint: string }[] = [
    { id: 'quote', label: 'Quote not verbatim', n: reqs.filter((r) => isActive(r) && matchesAttention(r, 'quote')).length, hint: 'Model’s quote doesn’t appear word-for-word in the source: possibly invented or misread' },
    { id: 'lowconf', label: `Confidence < ${LOW_CONF * 100}`, n: reqs.filter((r) => isActive(r) && r.conf < LOW_CONF && r.conf > 0).length, hint: 'Mappings the model was least sure of' },
    { id: 'addendum', label: 'From addenda', n: reqs.filter((r) => isActive(r) && matchesAttention(r, 'addendum')).length, hint: 'Created or changed by Addendum 1 or 2' },
    { id: 'passfail', label: 'Pass/fail gaps', n: reqs.filter((r) => matchesAttention(r, 'passfail')).length, hint: 'Open items that can make the proposal non-responsive' },
  ];

  const groups = useMemo(() => {
    const m = new Map<string, Req[]>();
    for (const r of filtered) {
      const k = groupKey(r);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return [...m.entries()];
  }, [filtered]);

  const selected = reqs.find((r) => r.id === selectedId) ?? reqs[0];

  // keyboard navigation and actions
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) {
        if (e.key === 'Escape') (t as HTMLInputElement).blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = filtered.findIndex((r) => r.id === selectedId);
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const n = filtered[Math.min(filtered.length - 1, idx + 1)];
        if (n) dispatch({ type: 'select', id: n.id });
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = filtered[Math.max(0, idx - 1)];
        if (n) dispatch({ type: 'select', id: n.id });
      } else if (e.key === 'a' && selected.review !== 'removed') {
        acceptAndAdvance();
      } else if (e.key === 'r') dispatch({ type: 'panel', panel: 'reject' });
      else if (e.key === 'e') dispatch({ type: 'panel', panel: 'correct' });
      else if (e.key === 's') dispatch({ type: 'panel', panel: 'assign' });
      else if (e.key === 'Escape') dispatch({ type: 'panel', panel: null });
      else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('matrix-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // keep selected row in view (centered on first render)
  const first = useRef(true);
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-id="${selectedId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: first.current ? 'center' : 'nearest' });
    first.current = false;
  }, [selectedId]);

  function acceptAndAdvance() {
    const idx = filtered.findIndex((r) => r.id === selectedId);
    const next = filtered.slice(idx + 1).find((r) => r.review === 'unreviewed') ?? filtered.find((r) => r.review === 'unreviewed' && r.id !== selectedId);
    act({ type: 'accept', id: selectedId }, `Accepted ${selectedId}`);
    if (next) dispatch({ type: 'select', id: next.id });
  }

  const toggleStatus = (s: Status) => {
    const has = filters.statuses.includes(s);
    dispatch({ type: 'filters', filters: { statuses: has ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s] } });
  };
  const anyFilter = filters.q || filters.review !== 'all' || filters.statuses.length || filters.attention || filters.doc !== 'all' || filters.mand !== 'all';

  return (
    <div className="matrix">
      <section className="strip">
        <div className="strip-block progress-block">
          <div className="strip-label">Your review</div>
          <div className="progress-line">
            <strong>{reviewed}</strong><span className="muted"> of {total} checked</span>
            <span className="progress-legend">
              <span><i className="sw sw-ok" />{rv.accepted} accepted</span>
              <span><i className="sw sw-fix" />{rv.corrected} corrected</span>
              <span><i className="sw sw-no" />{rv.rejected} rejected</span>
              {rv.removed > 0 && <span><i className="sw sw-rm" />{rv.removed} removed</span>}
            </span>
          </div>
          <div className="progress-bar">
            <span className="pb-ok" style={{ width: `${(rv.accepted / total) * 100}%` }} />
            <span className="pb-fix" style={{ width: `${(rv.corrected / total) * 100}%` }} />
            <span className="pb-no" style={{ width: `${(rv.rejected / total) * 100}%` }} />
            <span className="pb-rm" style={{ width: `${(rv.removed / total) * 100}%` }} />
          </div>
        </div>
        <div className="strip-block">
          <div className="strip-label">Draft coverage</div>
          <div className="status-filters">
            {(['addressed', 'partial', 'missing'] as Status[]).map((s) => (
              <button key={s} className={`sf sf-${s} ${filters.statuses.includes(s) ? 'on' : ''}`} onClick={() => toggleStatus(s)}>
                <span className="sf-n">{counts[s]}</span>
                <span className="sf-l">{s}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="strip-block grow">
          <div className="strip-label">Check the model’s work</div>
          <div className="attn">
            {attn.map((a) => (
              <button key={a.id} title={a.hint} className={`attn-chip attn-${a.id} ${filters.attention === a.id ? 'on' : ''}`} onClick={() => dispatch({ type: 'filters', filters: { attention: filters.attention === a.id ? null : a.id } })}>
                {a.label}<span className="attn-n">{a.n}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="panes">
        <section className="list-pane">
          <div className="filterbar">
            <label className="search">
              <Icon name="search" />
              <input id="matrix-search" placeholder="Search requirements, sections, draft text" value={filters.q} onChange={(e) => dispatch({ type: 'filters', filters: { q: e.target.value } })} />
              <Kbd>/</Kbd>
            </label>
            <div className="filter-row">
              <div className="seg">
                {(['all', 'unreviewed', 'reviewed'] as const).map((v) => (
                  <button key={v} className={filters.review === v ? 'on' : ''} onClick={() => dispatch({ type: 'filters', filters: { review: v } })}>
                    {v === 'all' ? 'All' : v === 'unreviewed' ? `Unreviewed ${total - reviewed}` : 'Reviewed'}
                  </button>
                ))}
              </div>
              <select value={filters.doc} onChange={(e) => dispatch({ type: 'filters', filters: { doc: e.target.value as typeof filters.doc } })}>
                <option value="all">All sources</option>
                <option value="RFP">RFP (84 pp.)</option>
                <option value="A1">Addendum 1</option>
                <option value="A2">Addendum 2</option>
              </select>
              <select value={filters.mand} onChange={(e) => dispatch({ type: 'filters', filters: { mand: e.target.value as typeof filters.mand } })}>
                <option value="all">Mandatory + desirable</option>
                <option value="Mandatory">Mandatory</option>
                <option value="Desirable">Desirable</option>
              </select>
            </div>
            <div className="result-line">
              <span>{filtered.length === reqs.length ? `${reqs.length} requirements` : `${filtered.length} of ${reqs.length} shown`}</span>
              {anyFilter ? <button className="linkbtn" onClick={() => dispatch({ type: 'resetFilters' })}>Clear filters</button> : null}
            </div>
          </div>
          <div className="list" ref={listRef}>
            {groups.length === 0 && (
              <div className="empty">
                <p>No requirements match these filters.</p>
                <button className="btn btn-ghost" onClick={() => dispatch({ type: 'resetFilters' })}>Clear filters</button>
              </div>
            )}
            {groups.map(([k, rows]) => {
              const all = reqs.filter((r) => groupKey(r) === k);
              const open = all.filter(isOpenGap).length;
              const un = all.filter((r) => r.review === 'unreviewed').length;
              return (
                <div key={k} className="group">
                  <div className="group-h">
                    <span className="group-name">{GROUP_LABEL(k)}</span>
                    <span className="group-meta">
                      {un === 0 ? <span className="done">✓ reviewed</span> : <span>{un} to review</span>}
                      {open > 0 && <span className="group-open">{open} open</span>}
                    </span>
                  </div>
                  {rows.map((r) => <Row key={r.id} r={r} selected={r.id === selectedId} onClick={() => dispatch({ type: 'select', id: r.id })} />)}
                </div>
              );
            })}
          </div>
          <div className="keys">
            <span><Kbd>J</Kbd><Kbd>K</Kbd> move</span>
            <span><Kbd>A</Kbd> accept</span>
            <span><Kbd>R</Kbd> reject</span>
            <span><Kbd>E</Kbd> correct</span>
            <span><Kbd>S</Kbd> assign</span>
          </div>
        </section>
        <section className="detail-pane">
          <Detail r={selected} panel={panel} onAccept={acceptAndAdvance} />
        </section>
      </div>
    </div>
  );
}

function Row({ r, selected, onClick }: { r: Req; selected: boolean; onClick: () => void }) {
  const qv = quoteVerified(r);
  return (
    <button data-id={r.id} className={`row ${selected ? 'sel' : ''} ${r.review === 'removed' ? 'removed' : ''}`} onClick={onClick}>
      <ReviewMark r={r} />
      <div className="row-main">
        <div className="row-top">
          <span className="rid">{r.id}</span>
          <span className="row-title">{r.title}</span>
        </div>
        <div className="row-sub">
          <span className="ref">{srcRef(r)}</span>
          <span className="arrow">→</span>
          <span className="ref">{r.draftSec ? `Draft §${r.draftSec} · p.${r.draftPage}` : r.basis === 'document' ? 'Whole draft' : 'No section'}</span>
          {r.mand === 'Desirable' && <span className="mini-tag">Desirable</span>}
          {r.passFail && r.status !== 'addressed' && <span className="mini-tag pf">Pass/fail</span>}
          {!qv && <span className="mini-tag warn" title="Quote not found verbatim in source"><Icon name="alert" size={11} /> quote</span>}
          {r.supersedes && <span className="mini-tag add">supersedes {r.supersedes.ref}</span>}
        </div>
      </div>
      <div className="row-right">
        <StatusPill status={r.status} conflict={r.conflict} />
        <div className="row-right-sub">
          {r.assignee && <Avatar id={r.assignee} size={18} />}
          {r.conf > 0 ? <ConfMeter conf={r.conf} /> : <span className="conf-none">added</span>}
        </div>
      </div>
    </button>
  );
}
