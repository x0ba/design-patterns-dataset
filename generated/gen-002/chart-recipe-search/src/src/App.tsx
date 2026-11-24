import { useEffect, useMemo, useRef, useState } from 'react';
import { COLLECTIONS, FILE, RECENT_SEARCHES, RECIPES, SAVED_INITIAL, SETUP_OPTIONS, USER, type Recipe } from './data';
import { DIFFICULTY, joinList, fitLabel, fitScore, fmtDate, fmtMinutes, runStatus, searchScore, totalMinutes, type Extras } from './logic';
import { Thumb } from './Thumb';
import { RecipeDrawer } from './RecipeDrawer';
import { CompareModal } from './CompareModal';
import { Icon, StatusBadge, DifficultyPips } from './bits';

type View = { kind: 'suggested' } | { kind: 'search'; q: string } | { kind: 'collection'; id: string };
type ToolFilter = 'all' | 'matplotlib' | 'ready';
type Sort = 'relevance' | 'fit' | 'easy' | 'remakes' | 'updated';

const BY_ID = new Map(RECIPES.map((r) => [r.id, r]));
export const getRecipe = (id: string) => BY_ID.get(id)!;
const MATCHES = RECIPES.filter((r) => r.match);
const MAX_SHORTLIST = 3;

export default function App() {
  const [view, setView] = useState<View>({ kind: 'suggested' });
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [recent, setRecent] = useState(RECENT_SEARCHES);
  const [focus, setFocus] = useState<'winter' | 'year'>('winter');
  const [extras, setExtras] = useState<Extras>({});
  const [toolFilter, setToolFilter] = useState<ToolFilter>('all');
  const [maxDiff, setMaxDiff] = useState(4);
  const [sort, setSort] = useState<Sort>('fit');
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [saved, setSaved] = useState(SAVED_INITIAL);
  const [openId, setOpenId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number>();

  const notify = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (compareOpen) setCompareOpen(false);
        else if (openId) setOpenId(null);
        else setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [compareOpen, openId]);

  const runSearch = (q: string) => {
    const t = q.trim();
    setSearchOpen(false);
    searchRef.current?.blur();
    if (!t) {
      setView({ kind: 'suggested' });
      setSort('fit');
      return;
    }
    setQuery(t);
    setView({ kind: 'search', q: t });
    setSort('relevance');
    setRecent((r) => [t, ...r.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6));
  };

  const backToSuggestions = () => {
    setView({ kind: 'suggested' });
    setQuery('');
    if (sort === 'relevance') setSort('fit');
  };

  /* ---------------------------------------------------- base list */
  const base: { recipe: Recipe; rel: number }[] = useMemo(() => {
    if (view.kind === 'suggested') return MATCHES.map((r) => ({ recipe: r, rel: 0 }));
    if (view.kind === 'collection')
      return RECIPES.filter((r) => r.collections.includes(view.id)).map((r) => ({ recipe: r, rel: 0 }));
    return RECIPES.map((r) => ({ recipe: r, rel: searchScore(r, view.q) })).filter((x) => x.rel > 0);
  }, [view]);

  const counts = useMemo(
    () => ({
      all: base.length,
      matplotlib: base.filter((x) => x.recipe.tool === 'matplotlib').length,
      ready: base.filter((x) => runStatus(x.recipe, extras).kind === 'ready').length,
    }),
    [base, extras],
  );

  const list = useMemo(() => {
    let l = base.filter((x) => x.recipe.difficulty <= maxDiff);
    if (toolFilter === 'matplotlib') l = l.filter((x) => x.recipe.tool === 'matplotlib');
    if (toolFilter === 'ready') l = l.filter((x) => runStatus(x.recipe, extras).kind === 'ready');
    const fit = (r: Recipe) => fitScore(r, focus);
    // "Best fit for you" also weighs whether Walter can actually run it.
    const SETUP_W = { ready: 10, browser: -2, install: -4, other: -8 } as const;
    const forYou = (r: Recipe) => fit(r) + SETUP_W[runStatus(r, extras).kind];
    const cmp: Record<Sort, (a: (typeof l)[0], b: (typeof l)[0]) => number> = {
      relevance: (a, b) => b.rel + fit(b.recipe) / 60 - (a.rel + fit(a.recipe) / 60),
      fit: (a, b) => forYou(b.recipe) - forYou(a.recipe) || b.recipe.remakes - a.recipe.remakes,
      easy: (a, b) => a.recipe.difficulty - b.recipe.difficulty || fit(b.recipe) - fit(a.recipe),
      remakes: (a, b) => b.recipe.remakes - a.recipe.remakes,
      updated: (a, b) => b.recipe.updated.localeCompare(a.recipe.updated),
    };
    return [...l].sort(cmp[sort]).map((x) => x.recipe);
  }, [base, toolFilter, maxDiff, sort, focus, extras]);

  const quickRead = useMemo(() => {
    const mpl = MATCHES.filter((r) => r.tool === 'matplotlib');
    const ready = MATCHES.filter((r) => runStatus(r, extras).kind === 'ready');
    const readyWinter = ready.filter((r) => r.match!.winter === 'built-in');
    const readyEasy = ready.filter((r) => r.difficulty <= 2);
    const missing = new Set<string>();
    mpl.forEach((r) => {
      const st = runStatus(r, extras);
      if (st.kind === 'install') st.missing.forEach((m) => missing.add(m));
    });
    return {
      mpl: mpl.length,
      ready: ready.length,
      readyMpl: ready.filter((r) => r.tool === 'matplotlib').length,
      readyWinter: readyWinter.length,
      readyEasy: readyEasy.length,
      missing: [...missing],
    };
  }, [extras]);

  /* ------------------------------------------------ shortlist/saved */
  const toggleShortlist = (id: string) => {
    if (shortlist.includes(id)) {
      setShortlist((s) => s.filter((x) => x !== id));
      return;
    }
    if (shortlist.length >= MAX_SHORTLIST) {
      notify('Your shortlist holds 3. Remove one to add another.');
      return;
    }
    setShortlist((s) => [...s, id]);
    const r = getRecipe(id);
    notify(`Added “${shortTitle(r.title)}” to your shortlist (${shortlist.length + 1} of 3)`);
  };
  const savedEntry = (id: string) => saved.find((s) => s.id === id);
  const toggleSaved = (id: string) => {
    if (savedEntry(id)) {
      setSaved((s) => s.filter((x) => x.id !== id));
      notify('Removed from saved recipes');
    } else {
      setSaved((s) => [...s, { id, note: 'Saved today', status: 'saved', date: '2026-11-17' }]);
      notify('Saved — find it under Saved in the right column');
    }
  };

  const viewTitle = () => {
    if (view.kind === 'suggested')
      return (
        <>
          <h1>
            {MATCHES.length} recipes fit the shape of <span className="mono">{FILE.name}</span>
          </h1>
          <p className="sub">
            Matched on your columns and shape (daily · 127 years · seasonal) out of 8,400 recipes, ranked for{' '}
            <strong>{focus === 'winter' ? 'a winter-only chart' : 'the whole year'}</strong>.
          </p>
        </>
      );
    if (view.kind === 'search')
      return (
        <>
          <button className="crumb" onClick={backToSuggestions}>
            <Icon name="back" /> Suggestions for your file
          </button>
          <h1>
            {base.length === 0 ? 'No close matches' : `${base.length} close ${base.length === 1 ? 'match' : 'matches'}`} for “{view.q}”
          </h1>
          <p className="sub">
            Searched titles, tags and walkthroughs. Recipes that also fit your file are marked{' '}
            <span className="fit-chip strong small">Fits your file</span>.
          </p>
        </>
      );
    const c = COLLECTIONS.find((c) => c.id === view.id)!;
    const fitting = base.filter((x) => x.recipe.match).length;
    return (
      <>
        <button className="crumb" onClick={backToSuggestions}>
          <Icon name="back" /> Suggestions for your file
        </button>
        <h1>{c.name}</h1>
        <p className="sub">
          Collection by @{c.curator} · {c.count} recipes · {fitting === base.length
            ? `these ${base.length} fit your file’s shape`
            : `showing the ${base.length} closest to your file, ${fitting} of which fit its shape`}
        </p>
      </>
    );
  };

  return (
    <div className="app">
      {/* ------------------------------------------------------------ header */}
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => (e.preventDefault(), backToSuggestions())}>
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <rect x="2" y="12" width="5" height="10" rx="1" fill="#2166ac" />
            <rect x="9.5" y="6" width="5" height="16" rx="1" fill="#b4441f" />
            <rect x="17" y="2" width="5" height="20" rx="1" fill="#1f5f5b" />
          </svg>
          Chartpantry
        </a>
        <div className="search">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(query);
            }}
          >
            <Icon name="search" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Describe the chart you want, e.g. “snow depth every day”"
              aria-label="Search recipes"
            />
            {query && (
              <button type="button" className="clear" onClick={backToSuggestions} aria-label="Clear search">
                ×
              </button>
            )}
            <kbd>/</kbd>
          </form>
          {searchOpen && (
            <div className="search-pop">
              <div className="pop-label">Your searches this session</div>
              {recent.map((r) => (
                <button key={r} onMouseDown={(e) => e.preventDefault()} onClick={() => runSearch(r)}>
                  <Icon name="clock" /> {r}
                </button>
              ))}
            </div>
          )}
        </div>
        <nav className="topnav">
          <a href="#" onClick={(e) => (e.preventDefault(), backToSuggestions())} className={view.kind !== 'collection' ? 'active' : ''}>
            For my data
          </a>
          <a href="#" onClick={(e) => (e.preventDefault(), setView({ kind: 'collection', id: 'stripes-spirals' }))} className={view.kind === 'collection' ? 'active' : ''}>
            Collections
          </a>
          <a href="#saved" onClick={(e) => (e.preventDefault(), document.getElementById('saved')?.scrollIntoView({ behavior: 'smooth' }))}>
            Saved <span className="count">{saved.length}</span>
          </a>
          <span className="avatar" title={`@${USER.handle}`}>
            {USER.initials}
          </span>
        </nav>
      </header>

      <div className="layout">
        {/* ------------------------------------------------------------ left */}
        <aside className="left">
          <section className="panel">
            <div className="panel-h">
              <h2>Your data</h2>
              <span className="muted small">uploaded {FILE.uploadedAgo}</span>
            </div>
            <div className="file">
              <Icon name="file" />
              <div>
                <div className="mono strong">{FILE.name}</div>
                <div className="muted small">
                  {FILE.rows.toLocaleString()} rows · {FILE.first.slice(0, 4)}–{FILE.last.slice(0, 4)} · {FILE.columns.length} columns
                </div>
              </div>
            </div>
            <table className="cols">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Values</th>
                  <th className="num">Blank</th>
                </tr>
              </thead>
              <tbody>
                {FILE.columns.map((c) => (
                  <tr key={c.name}>
                    <td>
                      <span className="mono">{c.name}</span>
                      <div className="muted tiny">{c.type}</div>
                    </td>
                    <td className="small">{c.name === 'date' ? 'daily, no gaps' : c.detail}</td>
                    <td className={`num small ${c.missing > 5 ? 'warn-text' : ''}`}>{c.missing ? `${c.missing}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">
              {FILE.missingPct}% of values are blank overall. Snow depth has the most gaps.
            </p>
            <h3 className="mini-h">Shape we detected</h3>
            <ul className="shapes">
              {FILE.shapes.map((s) => (
                <li key={s.tag}>
                  <span className="shape-chip on">{s.tag}</span>
                  <span className="small muted">{s.reason}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>What you’re making</h2>
            <p className="small goal">“One striking poster image showing how winters have changed.”</p>
            <div className="radio-group" role="radiogroup" aria-label="Season focus">
              <label className={focus === 'winter' ? 'on' : ''}>
                <input type="radio" name="focus" checked={focus === 'winter'} onChange={() => setFocus('winter')} />
                <span>
                  <strong>Winters only</strong>
                  <span className="muted tiny">Dec–Feb, 126 complete winters</span>
                </span>
              </label>
              <label className={focus === 'year' ? 'on' : ''}>
                <input type="radio" name="focus" checked={focus === 'year'} onChange={() => setFocus('year')} />
                <span>
                  <strong>The whole year</strong>
                  <span className="muted tiny">winter shown in context</span>
                </span>
              </label>
            </div>
          </section>

          <section className="panel">
            <h2>What you can run</h2>
            <ul className="setup">
              <li>
                <Icon name="check" /> Python 3.11
              </li>
              <li>
                <Icon name="check" /> matplotlib 3.8
              </li>
              <li className="muted">
                <Icon name="check" />
                <span>
                  numpy, Pillow <span className="tiny">(come with matplotlib)</span>
                </span>
              </li>
            </ul>
            <p className="tiny muted setup-note">Not installed. Tick one only if that changes:</p>
            <div className="setup-extra">
              {SETUP_OPTIONS.map((o) => (
                <label key={o.id}>
                  <input
                    type="checkbox"
                    checked={!!extras[o.id]}
                    onChange={(e) => setExtras((x) => ({ ...x, [o.id]: e.target.checked }))}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </section>
        </aside>

        {/* ------------------------------------------------------------ main */}
        <main className="main">
          <div className="results-head">{viewTitle()}</div>

          {view.kind === 'suggested' && (
            <div className="quickread">
              <Icon name="info" />
              <p>
                <strong>{quickRead.mpl}</strong> of these use matplotlib, and <strong>{quickRead.readyMpl}</strong> of those run
                with what you have.{' '}
                {quickRead.missing.length > 0 && <>The other {quickRead.mpl - quickRead.readyMpl} also need {joinList(quickRead.missing)}. </>}
                Of the {quickRead.ready} you can run,{' '}
                <strong>{quickRead.readyWinter}</strong> are built for winter-only charts and{' '}
                <strong>{quickRead.readyEasy}</strong> are level 1–2.{' '}
                {toolFilter !== 'ready' && (
                  <button className="linkish" onClick={() => setToolFilter('ready')}>
                    Show just those {quickRead.ready}
                  </button>
                )}
              </p>
            </div>
          )}

          <div className="filterbar">
            <div className="seg" role="tablist" aria-label="Filter by what you can run">
              {(
                [
                  ['all', 'All', counts.all],
                  ['matplotlib', 'matplotlib', counts.matplotlib],
                  ['ready', 'You can run it', counts.ready],
                ] as const
              ).map(([k, label, n]) => (
                <button key={k} role="tab" aria-selected={toolFilter === k} className={toolFilter === k ? 'on' : ''} onClick={() => setToolFilter(k)}>
                  {k === 'ready' && <Icon name="check" />}
                  {label} <span className="n">{n}</span>
                </button>
              ))}
            </div>
            <label className="select push">
              <span className="sr">Difficulty</span>
              <select value={maxDiff} onChange={(e) => setMaxDiff(Number(e.target.value))}>
                <option value={4}>Any difficulty</option>
                <option value={1}>Level 1 only</option>
                <option value={2}>Up to level 2</option>
                <option value={3}>Up to level 3</option>
              </select>
            </label>
            <label className="select">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                {view.kind === 'search' && <option value="relevance">Best match for search</option>}
                <option value="fit">Best fit for your file + setup</option>
                <option value="easy">Easiest first</option>
                <option value="remakes">Most remade</option>
                <option value="updated">Recently updated</option>
              </select>
            </label>
          </div>

          <div className="list">
            {list.length === 0 && (
              <div className="empty">
                <p>
                  <strong>Nothing matches these filters.</strong>
                </p>
                <p className="muted">
                  {view.kind === 'search' ? 'Try fewer words, or ' : ''}
                  <button
                    className="linkish"
                    onClick={() => {
                      setToolFilter('all');
                      setMaxDiff(4);
                    }}
                  >
                    clear the filters
                  </button>
                  {view.kind === 'search' && (
                    <>
                      {' '}or{' '}
                      <button className="linkish" onClick={backToSuggestions}>
                        go back to suggestions for your file
                      </button>
                    </>
                  )}
                  .
                </p>
              </div>
            )}
            {list.map((r) => (
              <RecipeRow
                key={r.id}
                r={r}
                focus={focus}
                extras={extras}
                inShortlist={shortlist.includes(r.id)}
                shortlistFull={shortlist.length >= MAX_SHORTLIST}
                saved={savedEntry(r.id)}
                showFitBadge={view.kind !== 'suggested'}
                onOpen={() => setOpenId(r.id)}
                onShortlist={() => toggleShortlist(r.id)}
                onSave={() => toggleSaved(r.id)}
              />
            ))}
          </div>
          {list.length > 0 && (
            <p className="list-foot muted small">
              {view.kind === 'suggested'
                ? `That’s all ${MATCHES.length} recipes whose data shape fits your file${list.length < MATCHES.length ? ` (${list.length} shown with current filters)` : ''}. Search above to look beyond your file’s shape.`
                : `${list.length} shown.`}
            </p>
          )}
        </main>

        {/* ------------------------------------------------------------ right */}
        <aside className="right">
          <section className="panel shortlist">
            <div className="panel-h">
              <h2>Your shortlist</h2>
              <span className="muted small">{shortlist.length} of 3</span>
            </div>
            <p className="small muted">Pick 2 or 3 to try. Compare them side by side before you start.</p>
            <ol className="slots">
              {Array.from({ length: MAX_SHORTLIST }, (_, i) => {
                const id = shortlist[i];
                if (!id)
                  return (
                    <li key={i} className="slot empty-slot">
                      <span className="slot-n">{i + 1}</span>
                      <span className="muted small">Use “Shortlist” on a recipe</span>
                    </li>
                  );
                const r = getRecipe(id);
                const st = runStatus(r, extras);
                return (
                  <li key={id} className="slot">
                    <button className="slot-thumb" onClick={() => setOpenId(id)} aria-label={`Open ${r.title}`}>
                      <Thumb kind={r.thumb} seed={r.id} />
                    </button>
                    <div className="slot-body">
                      <button className="slot-title" onClick={() => setOpenId(id)}>
                        {shortTitle(r.title)}
                      </button>
                      <div className="slot-meta">
                        <StatusBadge status={st} compact />
                        <span className="tiny muted">
                          Level {r.difficulty} · {fmtMinutes(totalMinutes(r))}
                        </span>
                      </div>
                    </div>
                    <button className="x" onClick={() => toggleShortlist(id)} aria-label="Remove from shortlist">
                      ×
                    </button>
                  </li>
                );
              })}
            </ol>
            {shortlist.length > 0 && <ShortlistSummary ids={shortlist} extras={extras} />}
            <button className="btn primary block" disabled={shortlist.length < 2} onClick={() => setCompareOpen(true)}>
              Compare side by side
            </button>
            {shortlist.length < 2 && <p className="tiny muted center">Add at least 2 to compare</p>}
          </section>

          <section className="panel" id="saved">
            <div className="panel-h">
              <h2>Saved</h2>
              <span className="muted small">{saved.length}</span>
            </div>
            <ul className="saved">
              {saved.map((s) => {
                const r = getRecipe(s.id);
                return (
                  <li key={s.id}>
                    <button onClick={() => setOpenId(s.id)}>
                      <Thumb kind={r.thumb} seed={r.id} className="saved-thumb" />
                      <span>
                        <span className="saved-title">{shortTitle(r.title)}</span>
                        <span className="tiny muted">
                          {r.tool} · Level {r.difficulty}
                        </span>
                        {s.status === 'too-hard' ? (
                          <span className="too-hard">Tried — too hard</span>
                        ) : (
                          <span className="tiny muted">{s.note}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="panel">
            <h2>Related collections</h2>
            {COLLECTIONS.map((c) => (
              <button
                key={c.id}
                className={`collection ${view.kind === 'collection' && view.id === c.id ? 'on' : ''}`}
                onClick={() => {
                  setView({ kind: 'collection', id: c.id });
                  if (sort === 'relevance') setSort('fit');
                  window.scrollTo({ top: 0 });
                }}
              >
                <span className="mosaic">
                  {c.thumbs.map((t, i) => (
                    <Thumb key={i} kind={t} seed={c.id + i} />
                  ))}
                </span>
                <span className="c-body">
                  <span className="c-name">{c.name}</span>
                  <span className="tiny muted">
                    {c.count} recipes · by @{c.curator}
                  </span>
                  <span className="tiny">{c.blurb}</span>
                </span>
              </button>
            ))}
          </section>
        </aside>
      </div>

      {openId && (
        <RecipeDrawer
          r={getRecipe(openId)}
          focus={focus}
          extras={extras}
          inShortlist={shortlist.includes(openId)}
          shortlistFull={shortlist.length >= MAX_SHORTLIST}
          saved={savedEntry(openId)}
          onClose={() => setOpenId(null)}
          onShortlist={() => toggleShortlist(openId)}
          onSave={() => toggleSaved(openId)}
          notify={notify}
        />
      )}
      {compareOpen && (
        <CompareModal
          ids={shortlist}
          extras={extras}
          focus={focus}
          onClose={() => setCompareOpen(false)}
          onRemove={(id) => {
            const next = shortlist.filter((x) => x !== id);
            setShortlist(next);
            if (next.length < 2) setCompareOpen(false);
          }}
          onOpen={(id) => {
            setCompareOpen(false);
            setOpenId(id);
          }}
          notify={notify}
        />
      )}
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}

export function shortTitle(t: string) {
  // Drop trailing ", Place 1900–2020" style suffixes for compact spots.
  return t.replace(/,\s*[A-Z][^,]*\d{4}–\d{4}$/, '').replace(/,\s*\d{4}–\d{4}$/, '');
}

function ShortlistSummary({ ids, extras }: { ids: string[]; extras: Extras }) {
  const rs = ids.map(getRecipe);
  const mins = rs.reduce((a, r) => a + totalMinutes(r), 0);
  const notReady = rs.filter((r) => runStatus(r, extras).kind !== 'ready');
  return (
    <div className="sl-summary small">
      <div>
        <span className="muted">Time to make all {rs.length}:</span> {fmtMinutes(mins)}
      </div>
      {notReady.length === 0 ? (
        <div className="ok-text">
          <Icon name="check" /> All run with your Python + matplotlib
        </div>
      ) : (
        <div className="warn-text">
          <Icon name="alert" /> {notReady.length} won’t run with your setup: {notReady.map((r) => shortTitle(r.title).split(/[:,]/)[0]).join('; ')}
        </div>
      )}
    </div>
  );
}

function RecipeRow(props: {
  r: Recipe;
  focus: 'winter' | 'year';
  extras: Extras;
  inShortlist: boolean;
  shortlistFull: boolean;
  saved?: { status: string };
  showFitBadge: boolean;
  onOpen: () => void;
  onShortlist: () => void;
  onSave: () => void;
}) {
  const { r, focus, extras, inShortlist, shortlistFull, saved } = props;
  const st = runStatus(r, extras);
  const score = fitScore(r, focus);
  const fl = fitLabel(score);
  return (
    <article className={`row ${inShortlist ? 'picked' : ''}`}>
      <button className="row-thumb" onClick={props.onOpen} aria-label={`Open ${r.title}`}>
        <Thumb kind={r.thumb} seed={r.id} />
      </button>
      <div className="row-body">
        <h3>
          <button className="title-link" onClick={props.onOpen}>
            {r.title}
          </button>
        </h3>
        <div className="meta small muted">
          @{r.author} · {r.tool} · updated {fmtDate(r.updated)} · {r.license} · {r.remakes.toLocaleString()} remakes
        </div>
        {r.match ? (
          <div className="fitline">
            <span className={`fit-chip ${fl.tone}`}>{props.showFitBadge ? 'Fits your file' : fl.label}</span>
            <span className="small">{r.match.why}</span>
          </div>
        ) : (
          <div className="fitline">
            <span className="fit-chip none">Different data shape</span>
            <span className="small muted">Sample is {r.sample.rows} ({r.shapes.join(', ')}) — not like your daily file.</span>
          </div>
        )}
        <div className="row-facts">
          <StatusBadge status={st} />
          {r.match && focus === 'winter' && (
            <span className={`fact small ${r.match.winter === 'needs rework' ? 'muted' : ''}`}>
              <Icon name="snow" />
              {r.match.winter === 'built-in' ? 'Winter-only built in' : r.match.winter === 'one setting' ? 'Winter-only: change one setting' : 'Not a winter chart'}
            </span>
          )}
        </div>
        {saved?.status === 'too-hard' && (
          <div className="note too-hard-note small">
            <Icon name="alert" /> You marked this “tried, too hard” on Oct 26.
          </div>
        )}
        {r.match?.watch && saved?.status !== 'too-hard' && (
          <div className="note small">
            <Icon name="alert" /> {r.match.watch}
          </div>
        )}
      </div>
      <div className="row-side">
        <div className="diff">
          <DifficultyPips level={r.difficulty} />
          <div className="small strong">Level {r.difficulty}</div>
          <div className="tiny muted">{DIFFICULTY[r.difficulty]}</div>
          <div className="tiny muted">{r.steps.length} steps</div>
          <div className="tiny muted">{fmtMinutes(totalMinutes(r))}</div>
        </div>
        <button
          className={`btn ${inShortlist ? 'picked' : 'outline'}`}
          onClick={props.onShortlist}
          disabled={!inShortlist && shortlistFull}
          title={!inShortlist && shortlistFull ? 'Shortlist is full — remove one first' : undefined}
        >
          {inShortlist ? (
            <>
              <Icon name="check" /> Shortlisted
            </>
          ) : (
            <>+ Shortlist</>
          )}
        </button>
        <button className={`btn ghost small ${saved ? 'saved-on' : ''}`} onClick={props.onSave} aria-pressed={!!saved}>
          <Icon name={saved ? 'starFill' : 'star'} /> {saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </article>
  );
}
