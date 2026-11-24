import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DOCS, DOC_BY_ID } from './data/docs';
import { LOGS } from './data/logs';
import { TRANSCRIBED } from './data/manual';
import { CAFE, VOLUNTEERS, ME } from './data/people';
import { Doc, RepairLog, TYPE_ORDER } from './data/types';
import {
  EMPTY_FILTERS,
  FacetKey,
  Filters,
  SortKey,
  applyFilters,
  groupLogs,
  isEmptyQuery,
  logsForDoc,
  nearMisses,
  normModel,
  parseFault,
  parseItemQuery,
  searchDocs,
  sortHits,
  activeFilterCount,
} from './lib/search';
import { Facets } from './components/Facets';
import { Results } from './components/Results';
import { PastFixes, PageRefTarget } from './components/PastFixes';
import { Viewer } from './components/Viewer';
import { IconBook, IconSearch, IconX, IconWrench } from './components/icons';
import { plural } from './lib/format';

interface UrlState {
  q: string;
  f: string;
  doc: string | null;
  p: number;
}

function readHash(): UrlState {
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const doc = h.get('doc');
  return { q: h.get('q') ?? '', f: h.get('fault') ?? '', doc: doc && DOC_BY_ID.has(doc) ? doc : null, p: Number(h.get('p')) || 1 };
}

function writeHash(s: UrlState, push: boolean) {
  const h = new URLSearchParams();
  if (s.q) h.set('q', s.q);
  if (s.f) h.set('fault', s.f);
  if (s.doc) {
    h.set('doc', s.doc);
    if (s.p > 1) h.set('p', String(s.p));
  }
  const str = h.toString();
  const url = str ? '#' + str : window.location.pathname + window.location.search;
  if (push) window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}

const LAST_SESSION = LOGS[0].date;
const RECENT = LOGS.filter((l) => l.date === LAST_SESSION).slice(0, 3);
const IN_TODAY = VOLUNTEERS.filter((v) => v.today).length;

/** The best indexed document a repair log's page references ("p.14") can point at. */
function refTargetFor(log: RepairLog): PageRefTarget | undefined {
  if (!log.model) return undefined;
  const cands = Object.keys(TRANSCRIBED)
    .map((id) => DOC_BY_ID.get(id)!)
    .filter((d) => d.brand === log.brand && d.models.some((m) => normModel(m) === normModel(log.model!)))
    .sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
  const d = cands[0];
  return d ? { docId: d.id, maxPage: d.pages } : undefined;
}

export default function App() {
  const initial = useMemo(readHash, []);
  const [q, setQ] = useState(initial.q);
  const [fault, setFault] = useState(initial.f);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('best');
  const [openDoc, setOpenDoc] = useState<string | null>(initial.doc);
  const [page, setPage] = useState(initial.p);
  const faultRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLInputElement>(null);
  const resultsScroll = useRef(0);
  const pushed = useRef(0);

  // keep the address bar in step, so the browser Back button works
  useEffect(() => {
    writeHash({ q, f: fault, doc: openDoc, p: page }, false);
  }, [q, fault, openDoc, page]);

  useEffect(() => {
    const onPop = () => {
      const s = readHash();
      if (!s.doc) pushed.current = 0;
      setQ(s.q);
      setFault(s.f);
      setOpenDoc(s.doc);
      setPage(s.p);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const iq = useMemo(() => parseItemQuery(q), [q]);
  const fq = useMemo(() => parseFault(fault), [fault]);
  const searched = useMemo(() => searchDocs(iq), [iq]);
  const effSort: SortKey = isEmptyQuery(iq) && sort === 'best' ? 'added' : sort;
  const filtered = useMemo(() => sortHits(applyFilters(searched, filters), effSort), [searched, filters, effSort]);
  const misses = useMemo(() => nearMisses(iq, searched), [iq, searched]);
  const groups = useMemo(() => groupLogs(LOGS, iq, fq, filters.brand), [iq, fq, filters.brand]);

  const toggle = useCallback((key: FacetKey, value: string | number) => {
    setFilters((f) => {
      const cur = f[key] as (string | number)[];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...f, [key]: next };
    });
  }, []);

  const open = (id: string, p = 1) => {
    if (!openDoc) resultsScroll.current = window.scrollY;
    writeHash({ q, f: fault, doc: id, p }, true);
    pushed.current++;
    setOpenDoc(id);
    setPage(p);
    window.scrollTo({ top: 0 });
  };

  const back = () => {
    if (pushed.current > 0) {
      pushed.current--;
      window.history.back(); // popstate restores the results
    } else {
      setOpenDoc(null);
      setPage(1);
    }
    requestAnimationFrame(() => window.scrollTo({ top: resultsScroll.current }));
  };

  const addModel = (m: string) => setQ((cur) => `${cur.trim()} or ${m}`);

  const clearAll = () => {
    setQ('');
    setFault('');
    setFilters(EMPTY_FILTERS);
    itemRef.current?.focus();
  };

  const doc: Doc | undefined = openDoc ? DOC_BY_ID.get(openDoc) : undefined;
  const hasQuery = !isEmptyQuery(iq);
  const anything = hasQuery || !!fault.trim() || activeFilterCount(filters) > 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">
            <IconBook size={22} />
          </span>
          <div>
            <div className="brand-name">Fixbook</div>
            <div className="brand-sub">{CAFE.name} library</div>
          </div>
        </div>
        <div className="library-stats">
          <span>
            <b>{DOCS.length.toLocaleString('en-US')}</b> documents
          </span>
          <span>
            <b>{LOGS.length}</b> repair logs
          </span>
        </div>
        <div className="session">
          <span className="live-dot" aria-hidden="true" />
          <span>
            <b>Session on</b> · {CAFE.sessionLabel}, {CAFE.hours} · {CAFE.venue}
          </span>
          <span className="session-sep" />
          <span>{IN_TODAY} volunteers in</span>
          <span className="session-sep" />
          <span className="me">
            <IconWrench size={15} /> {ME} · Table 2
          </span>
        </div>
      </header>

      {doc ? (
        <Viewer
          key={doc.id}
          doc={doc}
          refTarget={refTargetFor}
          page={page}
          fault={fq}
          logs={logsForDoc(LOGS, doc)}
          related={DOCS.filter((d) => d.id !== doc.id && d.brand === doc.brand && d.models.some((m) => doc.models.includes(m)))}
          backLabel={anything ? `Back to results (${filtered.length})` : 'Back to the library'}
          onPage={(n) => setPage(n)}
          onBack={back}
          onOpenDoc={(id, p) => open(id, p)}
        />
      ) : (
        <>
          <div className="search-band">
            <form className="search-form" onSubmit={(e) => e.preventDefault()} role="search">
              <label className="field field-item">
                <span className="field-label">What’s on the bench?</span>
                <span className="field-box">
                  <IconSearch size={22} />
                  <input
                    ref={itemRef}
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Brand, model number or item — e.g. Sunbeam 2346"
                    aria-label="What's on the bench"
                  />
                  {q && (
                    <button type="button" className="icon-btn" onClick={() => setQ('')} aria-label="Clear item">
                      <IconX />
                    </button>
                  )}
                </span>
              </label>
              <label className="field field-fault">
                <span className="field-label">What’s wrong with it?</span>
                <span className="field-box">
                  <IconWrench size={20} />
                  <input
                    ref={faultRef}
                    value={fault}
                    onChange={(e) => setFault(e.target.value)}
                    placeholder="e.g. hums but won’t spin"
                    aria-label="What's wrong with it"
                  />
                  {fault && (
                    <button type="button" className="icon-btn" onClick={() => setFault('')} aria-label="Clear fault">
                      <IconX />
                    </button>
                  )}
                </span>
              </label>
              {anything && (
                <button type="button" className="btn btn-quiet start-over" onClick={clearAll}>
                  Start over
                </button>
              )}
            </form>
            <div className="search-hint">
              {misses.length > 0 ? (
                <>
                  <span className="hint-label">Number hard to read? Close model numbers in the library:</span>
                  {misses.map((m) => (
                    <button key={m.model} className="hint-chip" onClick={() => addModel(m.model)} title={`Also search ${m.brand} ${m.model}`}>
                      + {m.model} <span className="muted">({plural(m.count, 'doc')})</span>
                    </button>
                  ))}
                </>
              ) : (
                <span className="hint-label">
                  Can’t read a digit? Type both numbers — <code>2346 2348</code> — or put <code>?</code> for the unclear digit: <code>234?</code>
                </span>
              )}
            </div>
          </div>

          <main className="main-grid">
            <Facets hits={searched} filters={filters} onToggle={toggle} />
            <Results
              hits={filtered}
              total={DOCS.length}
              filters={filters}
              sort={effSort}
              fault={fq}
              hasQuery={hasQuery}
              onSort={setSort}
              onToggle={toggle}
              onClearFilters={() => setFilters(EMPTY_FILTERS)}
              onClearAll={clearAll}
              onOpen={open}
            />
            <PastFixes
              groups={groups}
              itemLabel={hasQuery ? q.trim() : filters.brand.join(', ')}
              faultLabel={fq.concepts.length ? fault.trim() : ''}
              totalLogs={LOGS.length}
              recent={RECENT}
              refTarget={refTargetFor}
              onOpenPage={(id, p) => open(id, p)}
              onFocusFault={() => faultRef.current?.focus()}
            />
          </main>
        </>
      )}
    </div>
  );
}
