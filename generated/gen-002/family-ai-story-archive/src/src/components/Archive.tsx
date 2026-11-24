import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_SETTINGS, CHARACTERS, MONTHS, charFull } from '../data';
import { EMPTY, SORTS, activeCount, lengthOf, matches } from '../filters';
import type { Filters, Sort } from '../filters';
import { fmtDay, fmtMonth, fmtMonthLong, fmtTime, forLabel, monthKey, plural, cap } from '../format';
import { go, href } from '../router';
import { highlightTerms, parseQuery, splitHighlight } from '../search';
import { useStore } from '../store';
import { StoryArt } from '../art';
import type { Kid, Maker, Story } from '../types';
import { IconBook, IconChevronD, IconClose, IconCompare, IconEar, IconHeart, IconImage, IconRegen, IconSearch } from '../icons';

export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  return <>{splitHighlight(text, terms).map((p, i) => (p.hit ? <mark key={i}>{p.t}</mark> : <span key={i}>{p.t}</span>))}</>;
}

/* ---------------------------------------------------------------- Sidebar */

function Section({ title, hint, children, defaultOpen = true }: { title: string; hint?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="fsec">
      <button className="fsec-h" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}</span>
        {hint && <span className="fsec-hint">{hint}</span>}
        <span className={'chev' + (open ? ' open' : '')}><IconChevronD size={16} /></span>
      </button>
      {open && <div className="fsec-b">{children}</div>}
    </section>
  );
}

function Check({ label, count, checked, onChange, sub }: { label: string; count: number; checked: boolean; onChange: () => void; sub?: string }) {
  const disabled = !checked && count === 0;
  return (
    <label className={'chk' + (disabled ? ' dis' : '') + (checked ? ' on' : '')}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      <span className="box">{checked && <svg viewBox="0 0 12 12" width="10" height="10"><path d="m2 6.5 2.6 2.6L10 3.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}</span>
      <span className="lbl">{label}{sub && <small>{sub}</small>}</span>
      <span className="cnt">{count}</span>
    </label>
  );
}

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function Sidebar() {
  const { stories, filters: f, setFilters } = useStore();
  const set = (patch: Partial<Filters>) => setFilters((p) => ({ ...p, ...patch }));
  const [showAllSettings, setShowAllSettings] = useState(false);

  const facets = useMemo(() => {
    const base = (skip: keyof Filters | (keyof Filters)[]) => {
      const sk = Array.isArray(skip) ? skip : [skip];
      const pq = parseQuery(f.q);
      return stories.filter((s) => {
        // apply all filters except the skipped ones
        const ff = { ...f };
        for (const k of sk) (ff as Record<string, unknown>)[k] = (EMPTY as unknown as Record<string, unknown>)[k];
        return matches(s, ff, undefined, pq);
      });
    };
    const kid = base('kids'); const mk = base('makers');
    const ch = base('chars'); const st = base('settings');
    const mo = base(['from', 'to']); const ag = base('ages'); const ln = base('lengths'); const il = base('minIllus');
    const count = (list: Story[], fn: (s: Story) => boolean) => list.reduce((n, s) => n + (fn(s) ? 1 : 0), 0);
    return {
      kids: (['pia', 'leo', 'both'] as Kid[]).map((k) => [k, count(kid, (s) => s.for === k)] as const),
      makers: (['Jonah', 'Hana'] as Maker[]).map((k) => [k, count(mk, (s) => s.by === k)] as const),
      chars: CHARACTERS.map((c) => [c.id, count(ch, (s) => [...f.chars.filter((x) => x !== c.id), c.id].every((x) => s.characters.includes(x)))] as const),
      settings: ALL_SETTINGS.map((c) => [c, count(st, (s) => [...f.settings.filter((x) => x !== c), c].every((x) => s.settings.includes(x)))] as const)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
      months: MONTHS.map((m) => [m, count(mo, (s) => monthKey(s) === m)] as const),
      ages: [4, 5, 6, 7, 8, 9, 10].map((a) => [a, count(ag, (s) => s.readingAge === a)] as const),
      lengths: (['short', 'medium', 'long'] as const).map((l) => [l, count(ln, (s) => lengthOf(s) === l)] as const),
      illus: [1, 3, 5].map((n) => [n, count(il, (s) => s.illustrations >= n)] as const),
    };
  }, [stories, f]);

  const maxMonth = Math.max(1, ...facets.months.map((m) => m[1]));
  const n = activeCount({ ...f, q: '' });
  const settingsShown = showAllSettings ? facets.settings : facets.settings.filter(([id], i) => i < 8 || f.settings.includes(id));
  const monthLabel = (m: string) => fmtMonth(m);
  const inRange = (m: string) => (!f.from || m >= f.from) && (!f.to || m <= f.to) && (f.from || f.to);

  return (
    <aside className="sidebar" aria-label="Filters">
      <div className="sb-head">
        <h2>Narrow down</h2>
        {n > 0 && <button className="link" onClick={() => setFilters((p) => ({ ...EMPTY, q: p.q }))}>Clear filters ({n})</button>}
      </div>

      <Section title="Made for">
        {facets.kids.map(([k, c]) => <Check key={k} label={forLabel(k)} count={c} checked={f.kids.includes(k)} onChange={() => set({ kids: toggle(f.kids, k) })} />)}
      </Section>

      <Section title="Recurring characters" hint="match all">
        {facets.chars.map(([id, c]) => (
          <Check key={id} label={CHARACTERS.find((x) => x.id === id)!.name} sub={CHARACTERS.find((x) => x.id === id)!.kind} count={c} checked={f.chars.includes(id)} onChange={() => set({ chars: toggle(f.chars, id) })} />
        ))}
      </Section>

      <Section title="Settings" hint="match all">
        {settingsShown.map(([id, c]) => <Check key={id} label={id} count={c} checked={f.settings.includes(id)} onChange={() => set({ settings: toggle(f.settings, id) })} />)}
        <button className="link more" onClick={() => setShowAllSettings(!showAllSettings)}>{showAllSettings ? 'Show fewer' : `Show all ${facets.settings.length} settings`}</button>
      </Section>

      <Section title="Made by">
        {facets.makers.map(([k, c]) => <Check key={k} label={k} count={c} checked={f.makers.includes(k)} onChange={() => set({ makers: toggle(f.makers, k) })} />)}
      </Section>

      <Section title="When">
        <div className="histo" role="group" aria-label="Stories per month. Click a month to filter.">
          {facets.months.map(([m, c]) => {
            const sel = inRange(m);
            const only = f.from === m && f.to === m;
            return (
              <button key={m} className={'bar' + (sel ? ' sel' : '') + (c === 0 && !sel ? ' zero' : '')} title={`${fmtMonthLong(m)}: ${plural(c, 'story', 'stories')}`}
                aria-pressed={only} aria-label={`${fmtMonthLong(m)}, ${plural(c, 'story', 'stories')}`}
                onClick={() => (only ? set({ from: '', to: '' }) : set({ from: m, to: m }))}>
                <i style={{ height: `${Math.max(c ? 8 : 2, (c / maxMonth) * 100)}%` }} />
              </button>
            );
          })}
        </div>
        <div className="histo-axis"><span>May ’25</span><span>Nov ’26</span></div>
        <div className="range">
          <label>From
            <select value={f.from} onChange={(e) => set({ from: e.target.value, to: f.to && e.target.value > f.to ? e.target.value : f.to })}>
              <option value="">Any month</option>
              {MONTHS.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </label>
          <label>To
            <select value={f.to} onChange={(e) => set({ to: e.target.value, from: f.from && e.target.value < f.from ? e.target.value : f.from })}>
              <option value="">Any month</option>
              {MONTHS.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </label>
        </div>
      </Section>

      <Section title="Illustrations" defaultOpen={false}>
        <div className="pills">
          {facets.illus.map(([k, c]) => (
            <button key={k} className={'pill' + (f.minIllus === k ? ' on' : '')} disabled={!c && f.minIllus !== k} onClick={() => set({ minIllus: f.minIllus === k ? 0 : k })}>{k}+ <small>{c}</small></button>
          ))}
        </div>
      </Section>
      <Section title="Reading age" defaultOpen={false}>
        <div className="pills">
          {facets.ages.map(([a, c]) => (
            <button key={a} className={'pill' + (f.ages.includes(a) ? ' on' : '')} disabled={!c && !f.ages.includes(a)} onClick={() => set({ ages: toggle(f.ages, a) })}>{a} <small>{c}</small></button>
          ))}
        </div>
      </Section>
      <Section title="Length" defaultOpen={false}>
        <div className="pills">
          {facets.lengths.map(([l, c]) => (
            <button key={l} className={'pill' + (f.lengths.includes(l) ? ' on' : '')} disabled={!c && !f.lengths.includes(l)} onClick={() => set({ lengths: toggle(f.lengths, l) })}>
              {l === 'short' ? 'Under 550 words' : l === 'medium' ? '550–900' : 'Over 900'} <small>{c}</small>
            </button>
          ))}
        </div>
      </Section>
    </aside>
  );
}

/* ---------------------------------------------------------------- Row */

export function Meta({ s }: { s: Story }) {
  return (
    <>
      <span className="for">For {forLabel(s.for)}</span>
      <span className="dot" />
      <span>by {s.by}</span>
      <span className="dot" />
      <span>{fmtDay(s.createdAt)} · {fmtTime(s.createdAt)}</span>
    </>
  );
}

function Row({ s, terms, selected, canAdd, onToggle }: { s: Story; terms: string[]; selected: boolean; canAdd: boolean; onToggle: () => void }) {
  const mostRead = s.versions.length > 1 ? s.versions.reduce((a, b) => (b.readAloud > a.readAloud ? b : a)) : null;
  return (
    <article className={'row' + (selected ? ' picked' : '')}>
      <div className="thumb">
        <StoryArt story={s} />
        <span className="ill"><IconImage size={13} />{s.illustrations === 0 ? 'Text only' : s.illustrations}</span>
      </div>
      <div className="rbody">
        <h3>
          <a className="stretch" href={href(`story/${s.id}`)}><Highlight text={s.title} terms={terms} /></a>
          {s.favoriteBy && <span className="fav" title={`${s.favoriteBy} marked this a favorite`}><IconHeart size={15} /><span className="sr">Favorite of {s.favoriteBy}</span></span>}
          {s.versions.length > 1 && <span className="vpill" title={s.versions.map((v) => v.label).join(' · ')}><IconRegen size={13} />{s.versions.length} versions</span>}
        </h3>
        <p className="prompt"><Highlight text={s.prompt} terms={terms} /></p>
        <div className="meta"><Meta s={s} /></div>
        <div className="tags">
          {s.characters.map((c) => <span key={c} className="tag char">{charFull(c)}</span>)}
          {s.settings.map((c) => <span key={c} className={'tag' + (terms.some((t) => c.includes(t)) ? ' hl' : '')}>{c}</span>)}
        </div>
      </div>
      <div className="rside">
        <ul className="stats">
          <li><IconBook size={15} />{s.wordCount.toLocaleString()} words · age {s.readingAge}</li>
          <li><IconEar size={15} />{s.readAloud === 0 ? 'Not read yet' : `Read aloud ${s.readAloud}×`}</li>
          {mostRead && mostRead.readAloud > 0 && <li className="note">Most read: {mostRead.label.toLowerCase()}</li>}
        </ul>
        <button className={'cmp' + (selected ? ' on' : '')} onClick={onToggle} disabled={!selected && !canAdd} aria-pressed={selected} title={!selected && !canAdd ? 'You can compare up to 3 stories' : undefined}>
          <IconCompare size={15} />{selected ? 'Added' : 'Compare'}
        </button>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------- Page */

export function Archive() {
  const { stories, filters: f, setFilters, results, sort, setSort, effectiveSort, compare, toggleCompare } = useStore();
  const pq = useMemo(() => parseQuery(f.q), [f.q]);
  const terms = useMemo(() => highlightTerms(pq), [pq]);
  const searchRef = useRef<HTMLInputElement>(null);
  const nonQ = activeCount({ ...f, q: '' });

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement)) {
        e.preventDefault(); searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const set = (patch: Partial<Filters>) => setFilters((p) => ({ ...p, ...patch }));
  const chips: { label: string; clear: () => void }[] = [];
  f.kids.forEach((k) => chips.push({ label: `For ${forLabel(k)}`, clear: () => set({ kids: f.kids.filter((x) => x !== k) }) }));
  f.makers.forEach((k) => chips.push({ label: `By ${k}`, clear: () => set({ makers: f.makers.filter((x) => x !== k) }) }));
  f.chars.forEach((c) => chips.push({ label: charFull(c), clear: () => set({ chars: f.chars.filter((x) => x !== c) }) }));
  f.settings.forEach((c) => chips.push({ label: cap(c), clear: () => set({ settings: f.settings.filter((x) => x !== c) }) }));
  if (f.from || f.to) chips.push({ label: f.from && f.to ? (f.from === f.to ? fmtMonthLong(f.from) : `${fmtMonth(f.from)} – ${fmtMonth(f.to)}`) : f.from ? `Since ${fmtMonth(f.from)}` : `Until ${fmtMonth(f.to)}`, clear: () => set({ from: '', to: '' }) });
  if (f.minIllus) chips.push({ label: `${f.minIllus}+ illustrations`, clear: () => set({ minIllus: 0 }) });
  f.ages.forEach((a) => chips.push({ label: `Reading age ${a}`, clear: () => set({ ages: f.ages.filter((x) => x !== a) }) }));
  f.lengths.forEach((l) => chips.push({ label: l === 'short' ? 'Under 550 words' : l === 'medium' ? '550–900 words' : 'Over 900 words', clear: () => set({ lengths: f.lengths.filter((x) => x !== l) }) }));

  const picked = compare.map((id) => stories.find((s) => s.id === id)!).filter(Boolean);
  const showCompareAll = results.length >= 2 && results.length <= 3 && !results.every((r) => compare.includes(r.id));
  const heartCount = useMemo(() => stories.filter((s) => s.favoriteBy).length, [stories]);
  const versionCount = useMemo(() => stories.filter((s) => s.versions.length > 1).length, [stories]);
  const filtersOn = nonQ > 0 || !!f.q;

  return (
    <div className="archive">
      <Sidebar />
      <main className="results" id="main">
        <div className="searchbar">
          <IconSearch size={20} />
          <input ref={searchRef} type="search" value={f.q} onChange={(e) => set({ q: e.target.value })} aria-label="Search stories"
            placeholder="Search prompts, titles, characters…  try “dragon scared of the dark lighthouse”" />
          {f.q && <button className="clear" onClick={() => { set({ q: '' }); searchRef.current?.focus(); }} aria-label="Clear search"><IconClose size={16} /></button>}
          <kbd title="Press / to search">/</kbd>
        </div>

        <div className="quick">
          <button className={'qpill' + (f.heartOnly ? ' on' : '')} aria-pressed={f.heartOnly} onClick={() => set({ heartOnly: !f.heartOnly })}><IconHeart size={14} /> Favorites <small>{heartCount}</small></button>
          <button className={'qpill' + (f.versionsOnly ? ' on' : '')} aria-pressed={f.versionsOnly} onClick={() => set({ versionsOnly: !f.versionsOnly })}><IconRegen size={14} /> Has other versions or endings <small>{versionCount}</small></button>
          {chips.length > 0 && <span className="qsep" />}
          {chips.map((c, i) => (
            <button key={i} className="fchip" onClick={c.clear} aria-label={`Remove filter: ${c.label}`}>{c.label}<IconClose size={13} /></button>
          ))}
        </div>

        <div className="rhead">
          <h1 aria-live="polite">
            <strong>{results.length}</strong> {results.length === 1 ? 'story' : 'stories'}
            {filtersOn && <span className="of"> of {stories.length}</span>}
          </h1>
          {f.q && pq.groups.some((g) => g.length > 1) && (
            <span className="syn">Also matching {Array.from(new Set(pq.groups.filter((g) => g.length > 1).flatMap((g) => g.slice(1, 4)))).slice(0, 4).join(', ')}</span>
          )}
          <div className="spacer" />
          {showCompareAll && (
            <button className="btn ghost" onClick={() => go(`compare/${results.map((r) => r.id).join(',')}`)}><IconCompare size={16} /> Compare these {results.length}</button>
          )}
          <label className="sort">Sort
            <select value={effectiveSort} onChange={(e) => setSort(e.target.value as Sort)}>
              {SORTS.filter((s) => s.id !== 'match' || f.q).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          {sort && <button className="link" onClick={() => setSort(null)}>Reset</button>}
        </div>

        {results.length === 0 ? (
          <div className="empty">
            <IconSearch size={28} />
            <h2>No stories match all of that</h2>
            <p>Try removing a filter{f.q ? ' or a word from the search' : ''}. Search looks at titles, prompts, characters and settings.</p>
            <button className="btn" onClick={() => setFilters(EMPTY)}>Clear everything</button>
          </div>
        ) : (
          <div className="rows">
            {results.map((s) => (
              <Row key={s.id} s={s} terms={terms} selected={compare.includes(s.id)} canAdd={compare.length < 3} onToggle={() => toggleCompare(s.id)} />
            ))}
            <div className="endcap">{results.length === stories.length ? `That’s every story in the archive — ${stories.length} since May 2025.` : `That’s all ${results.length}.`}</div>
          </div>
        )}
      </main>

      {picked.length > 0 && (
        <div className="tray" role="region" aria-label="Stories to compare">
          <span className="tray-t"><IconCompare size={16} /> Compare</span>
          {picked.map((s) => (
            <span key={s.id} className="tray-item">
              <span className="tray-th"><StoryArt story={s} /></span>
              <span className="tray-n"><b>{s.title}</b><small>{fmtDay(s.createdAt)}</small></span>
              <button onClick={() => toggleCompare(s.id)} aria-label={`Remove ${s.title} from comparison`}><IconClose size={14} /></button>
            </span>
          ))}
          {picked.length < 3 && <span className="tray-hint">{picked.length === 1 ? 'Pick at least one more' : 'Add one more or compare now'}</span>}
          <span className="spacer" />
          <button className="link light" onClick={() => picked.forEach((s) => toggleCompare(s.id))}>Clear</button>
          <button className="btn amber" disabled={picked.length < 2} onClick={() => go(`compare/${compare.join(',')}`)}>Compare {picked.length >= 2 ? picked.length : ''} stories</button>
        </div>
      )}
    </div>
  );
}
