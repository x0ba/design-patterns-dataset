import { useMemo, useState } from 'react';
import { DocType, Scan, SCAN_LABEL, TYPE_LABEL, TYPE_ORDER } from '../data/types';
import { DocHit, FacetKey, Filters, facetCounts } from '../lib/search';
import { IconCheck, IconChevronDown, TypeIcon } from './icons';

interface Props {
  hits: DocHit[]; // after text search, before filters
  filters: Filters;
  onToggle: (key: FacetKey, value: string | number) => void;
}

interface Opt {
  value: string | number;
  label: React.ReactNode;
  count: number;
}

function Group({
  title,
  options,
  selected,
  onToggle,
  limit = 6,
  startOpen = true,
  searchable = false,
}: {
  title: string;
  options: Opt[];
  selected: (string | number)[];
  onToggle: (v: string | number) => void;
  limit?: number;
  startOpen?: boolean;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(startOpen || selected.length > 0);
  const [all, setAll] = useState(false);
  const [filter, setFilter] = useState('');
  let shown = options.filter((o) => o.count > 0 || selected.includes(o.value));
  if (filter) shown = shown.filter((o) => String(o.value).toLowerCase().includes(filter.toLowerCase()));
  const visible = all || filter ? shown : shown.slice(0, limit).concat(shown.slice(limit).filter((o) => selected.includes(o.value)));
  const hidden = shown.length - visible.length;

  return (
    <section className="facet">
      <button className="facet-title" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}</span>
        {selected.length > 0 && <span className="facet-sel">{selected.length} chosen</span>}
        <IconChevronDown size={16} className={open ? 'chev open' : 'chev'} />
      </button>
      {open && (
        <div className="facet-body">
          {searchable && shown.length > limit && (
            <input className="facet-search" placeholder={`Find a ${title.toLowerCase()}…`} value={filter} onChange={(e) => setFilter(e.target.value)} />
          )}
          {visible.length === 0 && <p className="facet-none">None in these results</p>}
          {visible.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button key={String(o.value)} className={`opt ${on ? 'on' : ''}`} onClick={() => onToggle(o.value)} aria-pressed={on}>
                <span className="box">{on && <IconCheck size={14} />}</span>
                <span className="opt-label">{o.label}</span>
                <span className="opt-count">{o.count.toLocaleString('en-US')}</span>
              </button>
            );
          })}
          {hidden > 0 && (
            <button className="link-btn" onClick={() => setAll(true)}>
              Show {hidden} more
            </button>
          )}
          {all && !filter && shown.length > limit && (
            <button className="link-btn" onClick={() => setAll(false)}>
              Show fewer
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function Facets({ hits, filters, onToggle }: Props) {
  const counts = useMemo(() => {
    const keys: FacetKey[] = ['type', 'category', 'brand', 'scan', 'language', 'decade'];
    return Object.fromEntries(keys.map((k) => [k, facetCounts(hits, filters, k)])) as Record<FacetKey, Map<string | number, number>>;
  }, [hits, filters]);

  const byCount = (m: Map<string | number, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));

  const typeOpts: Opt[] = TYPE_ORDER.map((t: DocType) => ({
    value: t,
    count: counts.type.get(t) ?? 0,
    label: (
      <span className={`type-inline t-${t}`}>
        <TypeIcon type={t} size={17} /> {TYPE_LABEL[t]}
      </span>
    ),
  }));
  const catOpts: Opt[] = byCount(counts.category).map(([v, c]) => ({ value: v, count: c, label: v }));
  const brandOpts: Opt[] = byCount(counts.brand).map(([v, c]) => ({ value: v, count: c, label: v }));
  const scanOpts: Opt[] = (['good', 'faded', 'partial'] as Scan[]).map((s) => ({
    value: s,
    count: counts.scan.get(s) ?? 0,
    label: <span className={`scan-inline s-${s}`}>{SCAN_LABEL[s]}</span>,
  }));
  const decOpts: Opt[] = [...counts.decade.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([v, c]) => ({ value: v, count: c, label: `${v}s` }));
  const langOpts: Opt[] = byCount(counts.language).map(([v, c]) => ({ value: v, count: c, label: v }));

  return (
    <nav className="facets" aria-label="Narrow down">
      <h2 className="facets-title">Narrow down</h2>
      <Group title="Kind of document" options={typeOpts} selected={filters.type} onToggle={(v) => onToggle('type', v)} limit={5} />
      <Group title="Category" options={catOpts} selected={filters.category} onToggle={(v) => onToggle('category', v)} limit={5} />
      <Group title="Brand" options={brandOpts} selected={filters.brand} onToggle={(v) => onToggle('brand', v)} limit={6} searchable />
      <Group title="Decade made" options={decOpts} selected={filters.decade} onToggle={(v) => onToggle('decade', v)} limit={5} startOpen={false} />
      <Group title="Scan quality" options={scanOpts} selected={filters.scan} onToggle={(v) => onToggle('scan', v)} startOpen={false} />
      <Group title="Language" options={langOpts} selected={filters.language} onToggle={(v) => onToggle('language', v)} limit={4} startOpen={false} />
    </nav>
  );
}
