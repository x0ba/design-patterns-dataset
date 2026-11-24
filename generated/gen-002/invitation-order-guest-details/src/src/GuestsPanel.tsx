import { useEffect, useRef } from 'react';
import type { Guest } from './data';
import { COUNTRIES, FILTERS, LINE_MAX, NAME_MAX, oneLineAddress, regionLabels } from './logic';
import type { Fix, Issue } from './logic';
import { Counter, Icon } from './ui';

export type Row = { g: Guest; issues: Issue[]; fixed: boolean; isNew?: boolean };

type Props = {
  rows: Row[]; // already filtered + sorted
  total: number;
  counts: Record<string, number>;
  attention: number;
  filter: string;
  setFilter: (f: string) => void;
  query: string;
  setQuery: (q: string) => void;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onPatch: (id: string, patch: Partial<Guest>) => void;
  onFix: (g: Guest, fix: Fix) => void;
  onRemove: (id: string) => void;
  onNext: (id: string) => void;
  onAdd: () => void;
  onSwapAll: () => void;
  pendingSwaps: number;
};

export function GuestsPanel(p: Props) {
  const chips = [
    { id: 'attention', label: 'Needs attention', n: p.attention, accent: true },
    ...FILTERS.map((f) => ({ id: f.id, label: f.label, n: p.counts[f.id] ?? 0, accent: false })),
    { id: 'all', label: 'All guests', n: p.total, accent: false },
  ];

  return (
    <div className="panel guests-panel" id="panel-guests" role="tabpanel" aria-labelledby="tab-guests">
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter guests">
          {chips.map((c) => (
            <button key={c.id} type="button" className={'chip' + (p.filter === c.id ? ' on' : '') + (c.accent ? ' accent' : '')}
              aria-pressed={p.filter === c.id} onClick={() => p.setFilter(c.id)}
              disabled={c.n === 0 && c.id !== 'attention' && c.id !== 'all' && p.filter !== c.id}>
              {c.label} <b>{c.n}</b>
            </button>
          ))}
        </div>
        <div className="tools">
          <label className="search">
            <Icon name="search" size={16} />
            <span className="sr">Search guests</span>
            <input value={p.query} onChange={(e) => p.setQuery(e.target.value)} placeholder="Search name or address" />
          </label>
          <button type="button" className="btn ghost" onClick={p.onAdd}><Icon name="plus" size={16} />Add guest</button>
        </div>
      </div>

      {p.filter === 'swap' && p.pendingSwaps > 1 && (
        <div className="bulk">
          <span>{p.pendingSwaps} names look swapped. Check the first and last name in each, or fix them all together.</span>
          <button type="button" className="btn primary sm" onClick={p.onSwapAll}>Swap all {p.pendingSwaps}</button>
        </div>
      )}

      <div className="table" role="list" aria-label="Guest addresses">
        <div className="thead" aria-hidden="true">
          <span />
          <span>Printed name</span>
          <span>Address</span>
          <span>Status</span>
          <span />
        </div>
        {p.rows.length === 0 && (
          <div className="empty">
            {p.filter === 'attention' ? (
              <><Icon name="check" size={22} /><strong>No addresses need attention.</strong><span>Every guest has a name and an address we can print.</span></>
            ) : (
              <><strong>No guests match.</strong><span>Try a different filter or search.</span></>
            )}
          </div>
        )}
        {p.rows.map((r) => (
          <GuestRow key={r.g.id} row={r} open={p.openId === r.g.id} p={p} />
        ))}
      </div>
    </div>
  );
}

function GuestRow({ row, open, p }: { row: Row; open: boolean; p: Props }) {
  const { g, issues, fixed } = row;
  const ref = useRef<HTMLDivElement>(null);
  const top = issues[0];
  const status = top ? (
    <span className={'status ' + top.tone}><Icon name="alert" size={14} />{top.chip}{issues.length > 1 ? ` +${issues.length - 1}` : ''}</span>
  ) : fixed ? (
    <span className="status ok"><Icon name="check" size={14} />{g.ack ? 'Kept as entered' : 'Fixed'}</span>
  ) : (
    <span className="status quiet"><Icon name="check" size={14} />Ready</span>
  );

  return (
    <div ref={ref} className={'row' + (open ? ' open' : '') + (top ? ' flagged ' + top.tone : '') + (fixed && !top ? ' fixed' : '')} role="listitem" data-id={g.id}>
      <button type="button" className="row-head" aria-expanded={open} aria-controls={`ed-${g.id}`}
        onClick={() => p.setOpenId(open ? null : g.id)}>
        <span className="dot" aria-hidden="true" />
        <span className="cell-name">
          <span className="nm">{g.name || <i>No name yet</i>}</span>
          <span className="src">{g.src === 'import' ? "Marcus's spreadsheet" : 'Typed in'}</span>
        </span>
        <span className="cell-addr">
          <span className="ad">{oneLineAddress(g)}{g.country && g.country !== 'United States' ? `, ${g.country}` : ''}</span>
          {top && <span className={'why ' + top.tone}>{top.short}</span>}
        </span>
        <span className="cell-status">{status}</span>
        <span className="chev" aria-hidden="true"><Icon name="chevron" /></span>
      </button>
      {open && <Editor g={g} issues={issues} p={p} />}
    </div>
  );
}

function Editor({ g, issues, p }: { g: Guest; issues: Issue[]; p: Props }) {
  const id = g.id;
  const labels = regionLabels(g.country);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (g.name === '' && !g.line1) first.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch: Partial<Guest>) => p.onPatch(id, patch);
  const nameOver = g.name.length > NAME_MAX;
  const l1Over = g.line1.length > LINE_MAX;
  const l2Over = g.line2.length > LINE_MAX;
  const noCountry = g.country === '';

  return (
    <div className="editor" id={`ed-${id}`} role="region" aria-label={`Edit ${g.name || 'new guest'}`}>
      {issues.length > 0 ? (
        <div className="issues">
          {issues.map((i, k) => (
            <div className={'issue ' + i.tone} key={i.kind + k}>
              <Icon name="alert" size={20} />
              <div className="issue-body">
                <h4>{i.title}</h4>
                <p>{i.detail}</p>
                {i.fixes.length > 0 && (
                  <div className="fixes">
                    {i.fixes.map((f) => (
                      <button key={f.label} type="button" className={'btn sm ' + (f.quiet ? 'ghost' : 'primary')} onClick={() => p.onFix(g, f)}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="issue ok" role="status">
          <Icon name="check" size={20} />
          <div className="issue-body"><h4>This envelope is ready to print</h4></div>
          <button type="button" className="btn sm primary" onClick={() => p.onNext(id)}>Next to fix <Icon name="arrow" size={15} /></button>
        </div>
      )}

      <div className="form">
        <div className="field span-all">
          <div className="label-row">
            <label htmlFor={`f-name-${id}`}>Name line</label>
            <Counter value={g.name.length} max={NAME_MAX} />
          </div>
          <input ref={first} id={`f-name-${id}`} value={g.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={nameOver || undefined} />
        </div>
        <div className="field span-3">
          <div className="label-row">
            <label htmlFor={`f-line1-${id}`}>Address line 1</label>
            <Counter value={g.line1.length} max={LINE_MAX} />
          </div>
          <input id={`f-line1-${id}`} value={g.line1} onChange={(e) => set({ line1: e.target.value })} aria-invalid={l1Over || undefined} />
        </div>
        <div className="field span-3">
          <div className="label-row">
            <label htmlFor={`f-line2-${id}`}>Apt, unit or line 2</label>
            <Counter value={g.line2.length} max={LINE_MAX} />
          </div>
          <input id={`f-line2-${id}`} value={g.line2} onChange={(e) => set({ line2: e.target.value })} aria-invalid={l2Over || undefined} />
        </div>
        <div className="field span-2">
          <label htmlFor={`f-city-${id}`}>City</label>
          <input id={`f-city-${id}`} value={g.city} onChange={(e) => set({ city: e.target.value })} />
        </div>
        <div className="field span-1">
          <label htmlFor={`f-region-${id}`}>{labels.region}</label>
          <input id={`f-region-${id}`} value={g.region} onChange={(e) => set({ region: e.target.value })} />
        </div>
        <div className="field span-1">
          <label htmlFor={`f-postal-${id}`}>{labels.postal}</label>
          <input id={`f-postal-${id}`} value={g.postal} onChange={(e) => set({ postal: e.target.value })} />
        </div>
        <div className="field span-2">
          <label htmlFor={`f-country-${id}`}>Country</label>
          <select id={`f-country-${id}`} value={g.country} onChange={(e) => set({ country: e.target.value })} aria-invalid={noCountry || undefined}>
            {noCountry && <option value="">Choose a country</option>}
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="editor-foot">
        <button type="button" className="btn danger-ghost sm" onClick={() => p.onRemove(id)}><Icon name="trash" size={15} />Remove guest</button>
        <button type="button" className="btn sm" onClick={() => p.setOpenId(null)}>Done</button>
      </div>
    </div>
  );
}
