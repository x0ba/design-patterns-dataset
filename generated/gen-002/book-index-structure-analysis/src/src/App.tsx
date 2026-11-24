import { useEffect, useState } from 'react';
import { BOOK } from './data/book.ts';
import { fmtPages, useStore, type View } from './store.tsx';
import { fmt } from './components/bits.tsx';
import { StructureView } from './views/Structure.tsx';
import { StringsView } from './views/Strings.tsx';
import { XrefsView } from './views/Xrefs.tsx';
import { NamesView } from './views/Names.tsx';
import { BudgetView } from './views/Budget.tsx';
import { EntriesView } from './views/Entries.tsx';
import { RereadView } from './views/Reread.tsx';

function LengthMeter() {
  const { projectedLines, limitLines, baselineLines, dispatch } = useStore();
  const max = 34 * BOOK.linesPerPage;
  const min = 24 * BOOK.linesPerPage;
  const pct = (l: number) => `${Math.max(0, Math.min(100, ((l - min) / (max - min)) * 100))}%`;
  const over = projectedLines - limitLines;
  return (
    <button className="meter" onClick={() => dispatch({ type: 'go', view: 'budget' })} title="Open length budget">
      <div className="meter-top">
        <span className="meter-label">Length</span>
        <span className={`meter-val ${over > 0 ? 'warn' : 'ok'}`}>{fmtPages(projectedLines)} pp</span>
        <span className="meter-limit">
          limit {BOOK.limitPages} · {over > 0 ? `${fmt(over)} lines over` : `${fmt(-over)} lines spare`}
        </span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: pct(projectedLines) }} />
        <div className="meter-base" style={{ left: pct(baselineLines) }} title={`Cast-off estimate ${BOOK.baselinePages} pp`} />
        <div className="meter-limitmark" style={{ left: pct(limitLines) }} />
      </div>
    </button>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">¶</span>
        <span className="brand-name">Indexwright</span>
      </div>
      <div className="project">
        <div className="project-title">
          <i>{BOOK.title}:</i> {BOOK.subtitle}
        </div>
        <div className="project-meta">
          {BOOK.author} · {BOOK.publisher} · {BOOK.draftLabel}
        </div>
      </div>
      <div className="topbar-right">
        <LengthMeter />
        <div className="due">
          <div className="due-label">Delivery</div>
          <div className="due-val">
            {BOOK.due} <span className="due-days">{BOOK.daysLeft} days</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Nav() {
  const { s, dispatch, an, decided, projectedLines } = useStore();
  const openStrings = an.long.filter((e) => !decided(`split:${e.id}`) && !decided(`keep:${e.id}`)).length;
  const openX =
    an.xrefs.filter((x) => x.status === 'missing' && !decided(`xref:${x.id}`)).length + (decided('loop') ? 0 : 1);
  const openNames = an.clusters.filter((c) => !decided(`name:${c.id}`)).length;
  const thin = an.chapters.filter((c) => c.perPage < an.median * 0.7).length;
  const items: { v: View; label: string; count?: string; tone?: 'warn' | 'ok' | 'plain'; group?: string }[] = [
    { v: 'structure', label: 'Chapter structure', count: thin ? `${thin} thin` : undefined, tone: thin ? 'warn' : 'plain', group: 'Review' },
    { v: 'strings', label: 'Long locator strings', count: String(openStrings), tone: openStrings ? 'warn' : 'ok' },
    { v: 'xrefs', label: 'Cross-references', count: String(openX), tone: openX ? 'warn' : 'ok' },
    { v: 'names', label: 'Name forms', count: String(openNames), tone: openNames ? 'warn' : 'ok' },
    { v: 'budget', label: 'Length budget', count: `${fmtPages(projectedLines)} pp`, tone: projectedLines > BOOK.limitPages * BOOK.linesPerPage ? 'warn' : 'ok', group: 'Deliver' },
    { v: 'reread', label: 'Pages to re-read', count: String(s.reread.length), tone: 'plain' },
    { v: 'entries', label: 'All entries', count: fmt(an.totals.main), tone: 'plain' },
  ];
  const fee = BOOK.indexablePages * BOOK.feePerPage;
  return (
    <nav className="nav">
      {items.map((it) => (
        <div key={it.v}>
          {it.group && <div className="nav-group">{it.group}</div>}
          <button className={`nav-item ${s.ui.view === it.v ? 'on' : ''}`} onClick={() => dispatch({ type: 'go', view: it.v })}>
            <span>{it.label}</span>
            {it.count && <span className={`nav-count ${it.tone}`}>{it.count === '0' && it.tone === 'ok' ? '✓' : it.count}</span>}
          </button>
        </div>
      ))}
      <div className="nav-foot">
        <div className="nav-foot-h">Draft index</div>
        <dl>
          <dt>Main entries</dt>
          <dd>{fmt(an.totals.main)}</dd>
          <dt>Subentries</dt>
          <dd>{fmt(an.totals.subs)}</dd>
          <dt>Locators</dt>
          <dd>{fmt(an.totals.locs)}</dd>
          <dt>Cross-refs</dt>
          <dd>{fmt(an.totals.xrefs)}</dd>
        </dl>
        <div className="nav-foot-h">Book</div>
        <dl>
          <dt>Pages</dt>
          <dd>{BOOK.totalPages}</dd>
          <dt>Text</dt>
          <dd>1–{BOOK.textEnd}, 14 ch.</dd>
          <dt>Notes</dt>
          <dd>
            {BOOK.notes.start}–{BOOK.notes.end}
          </dd>
          <dt>Fee</dt>
          <dd title={`${BOOK.indexablePages} indexable pages × $${BOOK.feePerPage.toFixed(2)}`}>
            ${fee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </dd>
        </dl>
        <div className="nav-foot-note">
          {BOOK.indexablePages} indexable pp × ${BOOK.feePerPage.toFixed(2)}
        </div>
      </div>
    </nav>
  );
}

function Toast() {
  const { s } = useStore();
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (!s.toast) return;
    setShown(s.toast.n);
    const t = setTimeout(() => setShown(null), 2600);
    return () => clearTimeout(t);
  }, [s.toast]);
  if (!s.toast || shown !== s.toast.n) return null;
  return <div className="toast">{s.toast.text}</div>;
}

export default function App() {
  const { s } = useStore();
  return (
    <div className="app">
      <TopBar />
      <div className="body">
        <Nav />
        <main className="main">
          {s.ui.view === 'structure' && <StructureView />}
          {s.ui.view === 'strings' && <StringsView />}
          {s.ui.view === 'xrefs' && <XrefsView />}
          {s.ui.view === 'names' && <NamesView />}
          {s.ui.view === 'budget' && <BudgetView />}
          {s.ui.view === 'entries' && <EntriesView />}
          {s.ui.view === 'reread' && <RereadView />}
        </main>
      </div>
      <Toast />
    </div>
  );
}
