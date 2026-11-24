import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp, readiness } from '../store';
import { Icon } from './ui';
import { RuleText } from './RuleText';

const PAPER = { letter: { w: 816, h: 1056 }, a4: { w: 794, h: 1123 } };
const PAD = { t: 58, x: 58, b: 64 };
const GAP = 26;

function Cover({ toc, sections }: { toc: boolean; sections: { num: number; title: string }[] }) {
  return (
    <>
      <header className="sheet-cover">
        <div className="sheet-kicker">A game of tides, prices and patient ships</div>
        <h1>Saltwind Exchange</h1>
        <div className="sheet-sub">Rulebook &middot; Version 0.7</div>
        <div className="sheet-facts"><span>2&ndash;5 players</span><span>Ages 12+</span><span>About 90 minutes</span></div>
      </header>
      {toc && (
        <nav className="sheet-toc" aria-label="Contents">
          <h2>Contents</h2>
          <ol>{sections.map((s) => <li key={s.num}><span>{s.num}</span> {s.title}</li>)}</ol>
        </nav>
      )}
    </>
  );
}

function Body({ marks }: { marks: boolean }) {
  const { state } = useApp();
  return (
    <>
      {state.sections.map((s) => (
        <section key={s.num} className="sheet-section">
          <h2><span>{s.num}</span> {s.title}</h2>
          {s.rules.map((id) => {
            const rule = state.rules[id];
            return (
              <div key={id} className="sheet-rule">
                <h3><span>{id}</span> {rule.title}</h3>
                <RuleText text={rule.text} mark={marks} />
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}

export function PrintPreview() {
  const { state, dispatch } = useApp();
  const r = readiness(state);
  const [paper, setPaper] = useState<'letter' | 'a4'>('letter');
  const [cols, setCols] = useState<1 | 2>(2);
  const [toc, setToc] = useState(true);
  const [marks, setMarks] = useState(r.blockers > 0);
  const [page, setPage] = useState(0);
  const [bodyPages, setBodyPages] = useState(1);
  const draft = r.blockers > 0;
  const colsRef = useRef<HTMLDivElement>(null);
  const d = PAPER[paper];
  const W = d.w - PAD.x * 2;
  const H = d.h - PAD.t - PAD.b;
  const total = 1 + bodyPages;

  useLayoutEffect(() => {
    const el = colsRef.current;
    if (!el) return;
    const measure = () => setBodyPages(Math.max(1, Math.ceil((el.scrollWidth + GAP - 2) / (W + GAP))));
    measure();
    document.fonts?.ready.then(measure);
  }, [paper, cols, marks, state.rules, W]);

  useEffect(() => { setPage((p) => Math.min(p, total - 1)); }, [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'print', open: false });
      if (e.key === 'ArrowRight') setPage((p) => Math.min(total - 1, p + 1));
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(0, p - 1));
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('printing-open');
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('printing-open'); };
  }, [dispatch, total]);

  useEffect(() => {
    const id = 'page-size';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
    el.textContent = `@page { size: ${paper === 'letter' ? 'letter' : 'A4'}; margin: 0.6in 0.6in 0.7in; @bottom-center { content: counter(page); font: 9pt Georgia, serif; color: #555; } }`;
  }, [paper]);

  const colW = (W - GAP * (cols - 1)) / cols;
  const step = W + GAP; // distance between pages along the column strip

  return (
    <div className="print-overlay" role="dialog" aria-label="Print preview">
      <div className="print-toolbar">
        <div className="print-title">
          <strong>Print preview</strong>
          <span className="muted">Saltwind Exchange rulebook, v0.7</span>
          {draft ? <span className="status warn"><span className="dot" /> Draft: {r.blockers} open {r.blockers === 1 ? 'item' : 'items'}</span> : <span className="status ok"><Icon name="check" size={14} /> Ready</span>}
        </div>
        <div className="print-opts">
          <div className="seg" role="group" aria-label="Paper"><button className={paper === 'letter' ? 'on' : ''} onClick={() => setPaper('letter')}>Letter</button><button className={paper === 'a4' ? 'on' : ''} onClick={() => setPaper('a4')}>A4</button></div>
          <div className="seg" role="group" aria-label="Columns"><button className={cols === 1 ? 'on' : ''} onClick={() => setCols(1)}>1 column</button><button className={cols === 2 ? 'on' : ''} onClick={() => setCols(2)}>2 columns</button></div>
          <label className="toggle"><input type="checkbox" checked={toc} onChange={(e) => setToc(e.target.checked)} /> Contents</label>
          <label className="toggle"><input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} /> Highlight open items</label>
        </div>
        <div className="print-actions">
          <button className="btn" onClick={() => dispatch({ type: 'print', open: false })}>Close</button>
          <button className="btn primary" onClick={() => window.print()}><Icon name="print" size={16} /> Print{draft ? ' draft' : ''}</button>
        </div>
      </div>

      {/* on screen: one page at a time */}
      <div className="print-stage screen-only">
        <div className="pager-bar">
          <button className="btn small" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page">&larr;</button>
          <span>Page <strong>{page + 1}</strong> of {total}</span>
          <button className="btn small" disabled={page === total - 1} onClick={() => setPage(page + 1)} aria-label="Next page">&rarr;</button>
          <span className="muted">The printer may move a page break by a line or two.</span>
        </div>
        <div className="page-zoom" style={{ zoom: Math.min(0.85, (window.innerHeight - 122) / d.h) }}>
          <div className="page" style={{ width: d.w, height: d.h, padding: `${PAD.t}px ${PAD.x}px ${PAD.b}px` }}>
            {draft && <div className="watermark" aria-hidden="true">DRAFT</div>}
            {page === 0 && <div className="page-content"><Cover toc={toc} sections={state.sections} /></div>}
            <div className="page-viewport" style={page === 0 ? { width: W, height: H, position: 'absolute', top: PAD.t, left: PAD.x, visibility: 'hidden' } : { width: W, height: H }}>
              <div
                ref={colsRef}
                className="page-cols"
                style={{ width: W, height: H, columnCount: cols, columnGap: GAP, columnFill: 'auto', transform: `translateX(${-(page - 1) * step}px)` }}
              >
                <Body marks={marks} />
              </div>
            </div>
            <div className="page-num">{page + 1}</div>
          </div>
        </div>
      </div>
      <span hidden>{colW}</span>

      {/* on paper: one continuous flow, paginated by the browser */}
      <article className={`sheet print-only cols-${cols}`}>
        <Cover toc={toc} sections={state.sections} />
        <div className="sheet-body"><Body marks={marks} /></div>
        {draft && <div className="watermark" aria-hidden="true">DRAFT</div>}
      </article>
    </div>
  );
}
