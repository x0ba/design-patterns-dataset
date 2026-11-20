'use client';

import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox';
import { Input, InputClear, InputGroup } from '@ui-sdk/react/input';
import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectLabel, SelectTrigger, SelectValue } from '@ui-sdk/react/select';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useMemo, useState } from 'react';
import type { AppRef, SiteRow } from '@/lib/data';
import { plural, RATER_STATE, repoHref, siteHref, STATE_LABEL } from '@/lib/format';
import { useUrlState } from '@/lib/use-url-state';
import { StateDot, StateMark } from './marks';
import { Score } from './score';

const STATE_ITEMS = [{ value: 'all', label: 'All states' }, ...Object.entries(STATE_LABEL).map(([value, label]) => ({ value, label }))];

// Problems first when sorting by state.
const STATE_ORDER: Record<string, number> = { failed: 0, flagged: 1, labeling: 2, capturing: 3, queued: 4, labeled: 5 };

type SortKey = 'site' | 'state' | 'agreement' | 'disagreements';
/** The first click on a column sorts the way that surfaces problems: lowest agreement, most disagreements. */
const FIRST_DIR: Record<SortKey, 1 | -1> = { site: 1, state: 1, agreement: 1, disagreements: -1 };

const siteName = (s: SiteRow) => (s.app ? `${s.app.name}: ${s.view?.name}` : s.title || s.slug);

function compare(key: SortKey, a: SiteRow, b: SiteRow) {
  switch (key) {
    case 'site': return siteName(a).localeCompare(siteName(b));
    case 'state': return STATE_ORDER[a.state] - STATE_ORDER[b.state];
    // Sites without a score always sink to the bottom, whichever way the column is sorted.
    case 'agreement': return (a.agreement?.score ?? Infinity) - (b.agreement?.score ?? Infinity);
    case 'disagreements': return (a.agreement?.disagreements ?? -1) - (b.agreement?.disagreements ?? -1);
  }
}

type Item = { kind: 'site'; site: SiteRow } | { kind: 'app'; app: AppRef; sites: SiteRow[] };

export function SitesTable({ batch, raters, sites }: { batch: string; raters: string[]; sites: SiteRow[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useUrlState('q', params.get('q') ?? '');
  const [st, setSt] = useUrlState('state', params.get('state') ?? '');
  const [dis, setDis] = useUrlState('disagree', params.get('disagree') ?? '');
  const [sortParam, setSort] = useUrlState('sort', params.get('sort') ?? '');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const desc = sortParam.startsWith('-');
  const sortKey = (sortParam.replace(/^-/, '') || null) as SortKey | null;
  const mixedSources = new Set(sites.map((s) => s.source)).size > 1;
  const cols = mixedSources ? 7 : 6;

  const items = useMemo(() => {
    const needle = q.toLowerCase();
    let rows = sites.filter((s) =>
      (!needle || `${s.slug} ${s.title ?? ''} ${s.url ?? ''} ${s.domain ?? ''} ${s.source} ${s.app?.name ?? ''} ${s.view?.name ?? ''}`.toLowerCase().includes(needle))
      && (!st || s.state === st)
      && (!dis || !!s.agreement?.disagreements));
    // Sorted: a flat list, so the order is the order. Unsorted: views of one app sit under its group row.
    if (sortKey && sortKey in FIRST_DIR) {
      const dir = desc ? -1 : 1;
      rows = [...rows].sort((a, b) => {
        const c = compare(sortKey, a, b);
        if (Number.isNaN(c)) return 0;
        // Missing values stay last either way.
        if (sortKey === 'agreement' && (!a.agreement || !b.agreement)) return (a.agreement ? 0 : 1) - (b.agreement ? 0 : 1);
        return c * dir;
      });
      return { out: rows.map((s): Item => ({ kind: 'site', site: s })), count: rows.length };
    }
    const out: Item[] = [];
    const groups = new Map<string, Extract<Item, { kind: 'app' }>>();
    for (const s of rows) {
      if (!s.app) { out.push({ kind: 'site', site: s }); continue; }
      let g = groups.get(s.app.id);
      if (!g) { g = { kind: 'app', app: s.app, sites: [] }; groups.set(s.app.id, g); out.push(g); }
      g.sites.push(s);
    }
    return { out, count: rows.length };
  }, [sites, q, st, dis, sortKey, desc]);

  const flat = !!sortKey;
  const clickSort = (k: SortKey) => {
    const dir = sortKey === k ? (desc ? 1 : -1) : FIRST_DIR[k];
    setSort(dir === 1 ? k : `-${k}`);
  };
  const sortHead = (k: SortKey, label: string, className?: string) => (
    <th className={className} aria-sort={sortKey === k ? (desc ? 'descending' : 'ascending') : undefined}>
      <button type="button" className="sort" onClick={() => clickSort(k)} data-active={sortKey === k || undefined}>
        {label}<span className="sort-arrow" aria-hidden="true">{sortKey === k ? (desc ? '↓' : '↑') : '↕'}</span>
      </button>
    </th>
  );

  const rowClick = (slug: string) => (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    router.push(siteHref(batch, slug));
  };

  const siteRow = (s: SiteRow, nested: boolean) => {
    const done = raters.filter((r) => s.raters[r]?.state === 'done').length;
    const name = nested ? s.view?.name : flat && s.app ? <><span className="muted">{s.app.name}: </span>{s.view?.name}</> : s.title || s.slug;
    const hint = [s.view?.description, s.url].filter(Boolean).join('\n');
    return (
      <tr key={s.slug} className={nested ? 'row-link row-view' : 'row-link'} onClick={rowClick(s.slug)} data-state={s.state}>
        <th scope="row" className="col-site">
          <Link href={siteHref(batch, s.slug)} className="row-title" title={hint || undefined}>{name}</Link>
          {s.error ? <div className="row-issue err">{s.error}</div> : null}
          {s.flags.map((f) => <div key={f} className="row-issue warn-text">{f}</div>)}
        </th>
        <td className="muted">{nested ? null : s.domain}</td>
        {mixedSources ? <td className="muted">{nested ? null : s.source}</td> : null}
        <td><StateMark state={s.state} /></td>
        <td>
          <span className="raters">
            <span className="dots">
              {raters.map((r) => {
                const rs = s.raters[r];
                return <StateDot key={r} state={RATER_STATE[rs?.state ?? 'pending'] ?? 'queued'} label={`${r}: ${rs?.state ?? 'pending'}${rs?.error ? `. ${rs.error}` : ''}`} />;
              })}
            </span>
            <span className="num muted">{done}/{raters.length}</span>
          </span>
        </td>
        <td>{s.agreement ? <Score value={s.agreement.score} label={`Agreement on ${s.slug}`} banded size="sm" /> : <span className="muted">—</span>}</td>
        <td><Disagreements n={s.agreement?.disagreements} fields={s.agreement?.fields ?? []} /></td>
      </tr>
    );
  };

  const groupRows = (g: Extract<Item, { kind: 'app' }>) => {
    const key = `${batch}/${g.app.id}`;
    const isOpen = !collapsed.has(key);
    const states: Record<string, number> = {};
    for (const s of g.sites) states[s.state] = (states[s.state] ?? 0) + 1;
    const scored = g.sites.filter((s) => s.agreement);
    const mean = scored.length ? scored.reduce((a, s) => a + s.agreement!.score, 0) / scored.length : null;
    const done = g.sites.reduce((a, s) => a + raters.filter((r) => s.raters[r]?.state === 'done').length, 0);
    const nDis = scored.reduce((a, s) => a + s.agreement!.disagreements, 0);
    const fields = [...new Set(g.sites.flatMap((s) => s.agreement?.fields ?? []))];
    const href = repoHref(g.app);
    return (
      <Fragment key={key}>
        <tr className="row-group">
          <th scope="rowgroup" className="col-site">
            <span className="group-head">
              <button
                type="button"
                className="disclosure"
                aria-expanded={isOpen}
                onClick={() => setCollapsed((c) => { const n = new Set(c); if (n.has(key)) n.delete(key); else n.add(key); return n; })}
              >
                <span className="caret" aria-hidden="true" />
                <span className="row-title">{g.app.name}</span>
                <span className="muted num">{plural(g.sites.length, 'view')}</span>
              </button>
              {href ? <a className="small" href={href} target="_blank" rel="noreferrer" title={`${g.app.url}${g.app.commit ? ` at ${g.app.commit}` : ''}`}>repo{g.app.commit ? ` @ ${g.app.commit.slice(0, 7)}` : ''}<span aria-hidden="true"> ↗</span></a> : null}
            </span>
          </th>
          <td className="muted">{g.sites[0].domain}</td>
          {mixedSources ? <td className="muted">{g.sites[0].source}</td> : null}
          <td>
            <ul className="states">
              {Object.entries(states).sort(([a], [b]) => STATE_ORDER[a] - STATE_ORDER[b]).map(([s, n]) => <li key={s}><StateMark state={s}>{STATE_LABEL[s] ?? s} <span className="num">{n}</span></StateMark></li>)}
            </ul>
          </td>
          <td><span className="num muted">{done}/{g.sites.length * raters.length}</span></td>
          <td>{mean !== null ? <Score value={mean} label={`Mean agreement on ${g.app.name}`} banded size="sm" /> : <span className="muted">—</span>}</td>
          <td><Disagreements n={scored.length ? nDis : undefined} fields={fields} /></td>
        </tr>
        {isOpen ? g.sites.map((s) => siteRow(s, true)) : null}
      </Fragment>
    );
  };

  const filtered = !!(q || st || dis);

  return (
    <>
      <div className="panel-head panel-head-pad">
        <h2 id="sites-h">Sites <span className="h-note" aria-live="polite">{filtered ? `${items.count} of ${sites.length}` : sites.length}</span></h2>
        <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
          <InputGroup className="search">
            <Input type="search" aria-label="Filter sites" placeholder="Filter by name, URL or domain…" value={q} onValueChange={setQ} autoComplete="off" spellCheck={false} />
            <InputClear className="input-clear" aria-label="Clear filter" />
          </InputGroup>
          <Select items={STATE_ITEMS} value={st || 'all'} onValueChange={(v) => setSt(!v || v === 'all' ? '' : String(v))}>
            <SelectLabel className="sr-only">State</SelectLabel>
            <SelectTrigger className="select-trigger"><SelectValue /></SelectTrigger>
            <SelectContent className="select-content">
              {STATE_ITEMS.map((i) => (
                <SelectItem key={i.value} value={i.value} className="select-item">{i.label}<SelectItemIndicator className="select-check" /></SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="check">
            <Checkbox checked={!!dis} onCheckedChange={(c) => setDis(c === true ? '1' : '')}>
              <CheckboxIndicator />
            </Checkbox>
            With disagreements
          </label>
          {sortKey ? <button type="button" className="link-button small" onClick={() => setSort('')}>{sites.some((s) => s.app) ? 'Group by app' : 'Clear sort'}</button> : null}
        </form>
      </div>
      <div className="table-scroll table-sticky">
        <table className="data sites" aria-labelledby="sites-h">
          <thead>
            <tr>
              {sortHead('site', 'Site')}
              <th>Domain</th>
              {mixedSources ? <th>Source</th> : null}
              {sortHead('state', 'State')}
              <th>Raters</th>
              {sortHead('agreement', 'Agreement', 'col-score')}
              {sortHead('disagreements', 'Disagreements')}
            </tr>
          </thead>
          <tbody>
            {items.out.map((it) => (it.kind === 'site' ? siteRow(it.site, false) : groupRows(it)))}
            {!items.count ? (
              <tr>
                <td colSpan={cols} className="empty-row">
                  No sites match these filters.{' '}
                  <button type="button" className="link-button" onClick={() => { setQ(''); setSt(''); setDis(''); }}>Clear Filters</button>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** How many fields raters disagree on, then which ones. */
function Disagreements({ n, fields }: { n: number | undefined; fields: string[] }) {
  if (n === undefined) return <span className="muted">—</span>;
  if (!n) return <span className="muted num">0</span>;
  const shown = fields.slice(0, 2);
  return (
    <span className="dis" title={fields.join('\n')}>
      <b className="num">{n}</b>
      {shown.map((f) => <span key={f} className="chip">{f}</span>)}
      {fields.length > shown.length ? <span className="muted small">+{fields.length - shown.length}</span> : null}
    </span>
  );
}
