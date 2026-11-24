import { useEffect, useMemo, useState } from 'react';
import type { Row, Cat } from '../lib/types';
import {
  CAT_COLOR, CAT_LABEL, CAT_ORDER, EMPTY_FILTERS, PLATFORMS, PRESET_LABEL, SOURCES, applyFilters, stat,
} from '../lib/metrics';
import type { ItemFilters, Preset } from '../lib/metrics';
import { dateShort, num, perHr, plural, signed0, usd0 } from '../lib/format';
import { SalesScatter } from './charts';
import { Card, Swatch } from './ui';

type SortKey = 'title' | 'acquired' | 'cost' | 'hours' | 'platform' | 'ask' | 'cuts' | 'days' | 'net' | 'perHour';
const PAGE = 40;

const STATUS_LABEL: Record<string, string> = { sold: 'Sold', listed: 'Listed', kept: 'Kept', 'written-off': 'Written off' };

function sortValue(r: Row, k: SortKey): number | string | null {
  switch (k) {
    case 'title': return r.title.toLowerCase();
    case 'acquired': return r.acqDay;
    case 'cost': return r.cost;
    case 'hours': return r.hours;
    case 'platform': return r.platform ?? '~';
    case 'ask': return r.lastPrice;
    case 'cuts': return r.cuts?.length ?? null;
    case 'days': return r.daysListed;
    case 'net': return r.status === 'sold' ? r.net : null;
    case 'perHour': return r.status === 'sold' ? r.perHour : null;
  }
}

const presetSort: Record<Preset, { key: SortKey; dir: 'asc' | 'desc' }> = {
  stale: { key: 'days', dir: 'desc' }, slow: { key: 'days', dir: 'desc' }, loss: { key: 'net', dir: 'asc' }, top: { key: 'net', dir: 'desc' }, cut3: { key: 'days', dir: 'desc' },
};

export function Items({ rows, filters, setFilters, open, activeId }: {
  rows: Row[]; filters: ItemFilters; setFilters: (f: ItemFilters) => void; open: (id: string) => void; activeId: string | null;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'acquired', dir: 'desc' });
  const [page, setPage] = useState(0);

  // presets bring their own natural order
  useEffect(() => { if (filters.preset) setSort(presetSort[filters.preset]); }, [filters.preset]);
  useEffect(() => { setPage(0); }, [filters, rows]);

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const sorted = useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      const va = sortValue(a, sort.key), vb = sortValue(b, sort.key);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;   // blanks always last
      if (vb === null) return -1;
      const c = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return sort.dir === 'asc' ? c : -c;
    });
    return out;
  }, [filtered, sort]);

  const s = useMemo(() => stat(filtered), [filtered]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const view = sorted.slice(page * PAGE, page * PAGE + PAGE);
  const set = (patch: Partial<ItemFilters>) => setFilters({ ...filters, ...patch });
  const active = filters.q || filters.cats.length || filters.platforms.length || filters.sources.length || filters.statuses.length || filters.preset;
  const toggleCat = (c: Cat) => set({ cats: filters.cats.includes(c) ? filters.cats.filter((x) => x !== c) : [...filters.cats, c] });
  const th = (k: SortKey, label: string, cls = '') => (
    <th className={cls} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => setSort(sort.key === k ? { key: k, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: k === 'title' || k === 'platform' ? 'asc' : 'desc' })}>
        {label}<span className="sort-ind">{sort.key === k ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Every item</h1>
          <p className="lede">Filter, sort and open any item to see its price history. Each dot below is a sold item: the further right, the longer it sat.</p>
        </div>
      </div>

      <Card className="filters-card">
        <div className="filters">
          <label className="search">
            <span className="sr">Search brand or model</span>
            <input type="search" placeholder="Search brand or model, e.g. Mamiya" value={filters.q} onChange={(e) => set({ q: e.target.value })} />
          </label>
          <div className="chips" role="group" aria-label="Category">
            {CAT_ORDER.map((c) => (
              <button key={c} type="button" className={'chip' + (filters.cats.includes(c) ? ' on' : '')} aria-pressed={filters.cats.includes(c)} onClick={() => toggleCat(c)}>
                <Swatch color={CAT_COLOR[c]} />{CAT_LABEL[c]}
              </button>
            ))}
          </div>
          <Select label="Platform" value={filters.platforms[0] ?? ''} options={PLATFORMS as readonly string[]} onChange={(v) => set({ platforms: v ? [v] : [] })} />
          <Select label="Source" value={filters.sources[0] ?? ''} options={SOURCES as readonly string[]} onChange={(v) => set({ sources: v ? [v] : [] })} />
          <Select label="Status" value={filters.statuses.length === 1 ? filters.statuses[0] : filters.statuses.length ? 'kw' : ''}
            options={['sold', 'listed', 'kept', 'written-off']} labels={STATUS_LABEL}
            extra={filters.statuses.length > 1 ? [{ value: 'kw', label: 'Kept or written off' }] : []}
            onChange={(v) => set({ statuses: v === 'kw' ? ['kept', 'written-off'] : v ? [v] : [] })} />
        </div>
        <div className="presets">
          <span className="presets-label">Outliers</span>
          {(Object.keys(PRESET_LABEL) as Preset[]).map((p) => (
            <button key={p} type="button" className={'chip chip-preset' + (filters.preset === p ? ' on' : '')} aria-pressed={filters.preset === p} onClick={() => set({ preset: filters.preset === p ? null : p })}>
              {PRESET_LABEL[p]}
            </button>
          ))}
          <span className="spacer" />
          <span className="result-count"><b>{num(filtered.length)}</b> of {num(rows.length)} items{filtered.length > 0 && <> · <b className={s.net < 0 ? 'neg' : ''}>{signed0(s.net)}</b> net · {perHr(s.perHour)}</>}</span>
          {active ? <button type="button" className="link" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button> : null}
        </div>
      </Card>

      <Card title="Every sale" sub={`${plural(filtered.filter((r) => r.status === 'sold').length, 'sold item')} in this selection. Hover for details, click to open.`}
        right={<div className="legend">{CAT_ORDER.map((c) => <span key={c}><Swatch color={CAT_COLOR[c]} />{CAT_LABEL[c]}</span>)}</div>}>
        {filtered.some((r) => r.status === 'sold') ? <SalesScatter rows={filtered} onOpen={open} activeId={activeId} /> : <p className="empty">No sold items in this selection, so there is nothing to plot.</p>}
      </Card>

      <Card className="table-card items-card">
        <div className="tscroll">
          <table className="it">
            <thead>
              <tr>
                {th('title', 'Item')}
                {th('acquired', 'Acquired')}
                <th>Source</th>
                {th('cost', 'Cost', 'r')}
                {th('hours', 'Hours', 'r')}
                {th('platform', 'Platform')}
                {th('ask', 'Asking / sold', 'r')}
                {th('cuts', 'Cuts', 'r')}
                <th>Status</th>
                {th('days', 'Days listed', 'r')}
                {th('net', 'Net', 'r')}
                {th('perHour', 'Per hour', 'r')}
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr key={r.id} className={r.id === activeId ? 'sel' : ''} onClick={() => open(r.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') open(r.id); }}>
                  <td className="name"><Swatch color={CAT_COLOR[r.category]} /><span>{r.title}</span><small>{r.id}</small></td>
                  <td className="num dim">{dateShort(r.acquired)}</td>
                  <td className="dim">{r.source}</td>
                  <td className="r num">{usd0(r.cost)}</td>
                  <td className="r num">{r.hours.toFixed(2).replace(/0$/, '')}</td>
                  <td className="dim">{r.platform ?? '—'}</td>
                  <td className="r num">{r.status === 'sold' ? <>{usd0(r.salePrice as number)}</> : r.lastPrice !== null ? <span className="dim">{usd0(r.lastPrice)}</span> : '—'}</td>
                  <td className="r num dim">{r.cuts ? r.cuts.length : '—'}</td>
                  <td><span className={'pill ' + r.status}>{STATUS_LABEL[r.status]}</span></td>
                  <td className="r num">{r.daysListed === null ? '—' : r.daysListed}</td>
                  <td className={'r num' + (r.status === 'sold' && r.net < 0 ? ' neg' : '')}>{r.status === 'sold' ? signed0(r.net) : <span className="dim">{signed0(r.net)}</span>}</td>
                  <td className={'r num' + (r.status === 'sold' && (r.perHour ?? 0) < 0 ? ' neg' : '')}>{r.status === 'sold' ? perHr(r.perHour) : '—'}</td>
                </tr>
              ))}
              {view.length === 0 && (
                <tr><td colSpan={12} className="empty-cell">Nothing matches those filters. <button type="button" className="link" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>{sorted.length ? `${page * PAGE + 1}–${Math.min(sorted.length, (page + 1) * PAGE)} of ${num(sorted.length)}` : '0 items'}</span>
          <span className="pager-btns">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>← Previous</button>
            <span>Page {page + 1} of {pages}</span>
            <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next →</button>
          </span>
        </div>
        <p className="fineprint pad">Net is sale price minus platform fee, shipping, purchase price and parts. Unsold items show what they have cost so far. Days listed counts to today for items still listed.</p>
      </Card>
    </div>
  );
}

function Select({ label, value, options, labels, extra = [], onChange }: {
  label: string; value: string; options: readonly string[]; labels?: Record<string, string>; extra?: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <label className="select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {extra.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        {options.map((o) => <option key={o} value={o}>{labels?.[o] ?? o}</option>)}
      </select>
    </label>
  );
}
