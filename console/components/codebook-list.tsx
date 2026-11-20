'use client';

import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox';
import { Input, InputClear, InputGroup } from '@ui-sdk/react/input';
import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectLabel, SelectTrigger, SelectValue } from '@ui-sdk/react/select';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { codebookHref, plural } from '@/lib/format';
import { useUrlState } from '@/lib/use-url-state';

export interface ListEntry { id: string; name: string; level: string; parent?: string; deprecated?: boolean; search: string; sites: number; open: number }

const LEVELS = [{ value: 'all', label: 'All levels' }, { value: 'archetype', label: 'Archetypes' }, { value: 'pattern', label: 'Patterns' }, { value: 'component', label: 'Components' }];
const SORTS = [{ value: 'archetype', label: 'By archetype' }, { value: 'usage', label: 'By usage' }, { value: 'name', label: 'By name' }];

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function CodebookList({ entries }: { entries: ListEntry[] }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = useUrlState('q', params.get('q') ?? '');
  const [level, setLevel] = useUrlState('level', params.get('level') ?? '');
  const [sort, setSort] = useUrlState('sort', params.get('sort') ?? '');
  const [used, setUsed] = useUrlState('used', params.get('used') ?? '');
  const current = decodeURIComponent(pathname.split('/')[2] ?? '');
  const max = Math.max(1, ...entries.map((e) => e.sites));

  const shown = useMemo(() => {
    const needle = q.toLowerCase();
    let es = entries.filter((e) => (!level || e.level === level) && (!needle || e.search.includes(needle)) && (!used || e.sites > 0 || (e.level === 'archetype' && !level && sort !== 'usage' && sort !== 'name')));
    if (sort === 'usage') es = [...es].sort((a, b) => b.sites - a.sites || a.name.localeCompare(b.name));
    if (sort === 'name') es = [...es].sort((a, b) => a.name.localeCompare(b.name));
    // Grouped by archetype with "only used": drop archetypes left with nothing under them.
    if (used && !sort && !level) es = es.filter((e, i) => e.level !== 'archetype' || (es[i + 1] && es[i + 1].level !== 'archetype'));
    return es;
  }, [entries, q, level, sort, used]);

  const grouped = !sort && !level;
  const usedCount = entries.filter((e) => e.sites > 0).length;

  // Entry links carry the filters, so moving between entries keeps the list as it is.
  const query = new URLSearchParams(Object.entries({ q, level, sort, used }).filter(([, v]) => v)).toString();

  return (
    <nav className="cb-list panel" aria-label="Codebook entries">
      <form className="cb-filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <InputGroup className="search">
          <Input type="search" aria-label="Search the codebook" placeholder="Search names, ids, definitions…" value={q} onValueChange={setQ} autoComplete="off" spellCheck={false} />
          <InputClear className="input-clear" aria-label="Clear search" />
        </InputGroup>
        <div className="cb-selects">
          <Select items={LEVELS} value={level || 'all'} onValueChange={(v) => setLevel(!v || v === 'all' ? '' : String(v))}>
            <SelectLabel className="sr-only">Level</SelectLabel>
            <SelectTrigger className="select-trigger"><SelectValue /></SelectTrigger>
            <SelectContent className="select-content">
              {LEVELS.map((i) => <SelectItem key={i.value} value={i.value} className="select-item">{i.label}<SelectItemIndicator className="select-check" /></SelectItem>)}
            </SelectContent>
          </Select>
          <Select items={SORTS} value={sort || 'archetype'} onValueChange={(v) => setSort(!v || v === 'archetype' ? '' : String(v))}>
            <SelectLabel className="sr-only">Sort</SelectLabel>
            <SelectTrigger className="select-trigger"><SelectValue /></SelectTrigger>
            <SelectContent className="select-content">
              {SORTS.map((i) => <SelectItem key={i.value} value={i.value} className="select-item">{i.label}<SelectItemIndicator className="select-check" /></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="cb-count">
          <label className="check">
            <Checkbox checked={!!used} onCheckedChange={(c) => setUsed(c === true ? '1' : '')}><CheckboxIndicator /></Checkbox>
            Only seen in labels <span className="muted num">{usedCount}</span>
          </label>
          <span className="small muted num" aria-live="polite">{plural(shown.filter((e) => !grouped || e.level !== 'archetype').length, 'entry', 'entries')}</span>
        </div>
      </form>
      <div className="cb-cols small muted" aria-hidden="true"><span>Entry</span><span>Sites</span></div>
      <ul className="cb-items">
        {shown.map((e) => {
          const showId = slugOf(e.name) !== e.id && !(grouped && e.level === 'archetype');
          return (
            <li key={e.id}>
              <Link
                href={`${codebookHref(e.id)}${query ? `?${query}` : ''}`}
                className="cb-item"
                data-level={e.level}
                data-grouped={grouped || undefined}
                data-zero={e.sites === 0 || undefined}
                aria-current={e.id === current ? 'page' : undefined}
                title={`${e.name} (${e.id}), ${e.level}`}
              >
                <span className="cb-item-name">
                  {e.name}
                  {showId ? <span className="mono cb-item-id"> {e.id}</span> : null}
                </span>
                <span className="cb-item-flags">
                  {e.deprecated ? <span className="chip">deprecated</span> : null}
                  {e.open ? <span className="chip chip-warn" title={`${e.open} open proposal${e.open === 1 ? '' : 's'}`}>+{e.open}</span> : null}
                </span>
                {grouped && e.level === 'archetype' ? <span /> : (
                  <span className="usage" title={`On ${plural(e.sites, 'labeled site')}`}>
                    <span className="usage-bar" aria-hidden="true"><b style={{ width: `${(e.sites / max) * 100}%` }} /></span>
                    <span className="num">{e.sites || '·'}<span className="sr-only"> sites</span></span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {!shown.length ? <p className="muted small empty-row">No entries match. Try another word, or show all levels.</p> : null}
    </nav>
  );
}
