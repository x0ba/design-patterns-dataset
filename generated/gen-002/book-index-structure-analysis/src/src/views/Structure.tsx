import { useMemo, useState } from 'react';
import { BOOK, CHAPTERS, chapterOf } from '../data/book.ts';
import type { EntryType } from '../data/types.ts';
import { useStore } from '../store.tsx';
import { formatRange } from '../lib/locators.ts';
import { Heading, Seg, Stat, TypeTag, fmt } from '../components/bits.tsx';
import type { Analysis } from '../lib/analysis.ts';

const TYPES: EntryType[] = ['person', 'place', 'ship', 'concept'];

function thinThreshold(an: Analysis) {
  return Math.round(an.median * 0.3);
}

export function thinRuns(an: Analysis, start: number, end: number) {
  const th = thinThreshold(an);
  const runs: { start: number; end: number; refs: number }[] = [];
  let cur: { start: number; end: number; refs: number } | null = null;
  for (let p = start; p <= end; p++) {
    if (an.coverage[p] <= th) {
      if (!cur) cur = { start: p, end: p, refs: 0 };
      cur.end = p;
      cur.refs += an.coverage[p];
    } else if (cur) {
      if (cur.end - cur.start >= 2) runs.push(cur);
      cur = null;
    }
  }
  if (cur && cur.end - cur.start >= 2) runs.push(cur);
  return runs;
}

function DensityChart() {
  const { an, s, dispatch } = useStore();
  const [hover, setHover] = useState<number | null>(null);
  const W = 1180;
  const H = 150;
  const BAND = 30;
  const YMAX = 90;
  const x = (p: number) => ((p - 1) / BOOK.totalPages) * W;
  const bw = W / BOOK.totalPages;
  const y = (v: number) => H - (Math.min(v, YMAX) / YMAX) * (H - 6);
  const sel = s.ui.chapter;
  const select = (ch: number, page: number | null = null) => dispatch({ type: 'ui', patch: { chapter: ch, page } });
  const hc = hover ? chapterOf(hover) : null;

  return (
    <div className="chart-wrap" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H + BAND + 4}`} className="density">
        {[10, 20, 30, 40, 50, 60, 70, 80].map((v) => (
          <g key={v}>
            <line x1={0} x2={W} y1={y(v)} y2={y(v)} className="grid" />
            {v % 20 === 0 && (
              <text x={2} y={y(v) - 2} className="axis">
                {v}
              </text>
            )}
          </g>
        ))}
        {CHAPTERS.map((c) => (
          <rect
            key={'bg' + c.num}
            x={x(c.start)}
            width={x(c.end + 1) - x(c.start)}
            y={0}
            height={H}
            className={`chbg ${c.num === sel ? 'sel' : ''}`}
            onClick={() => select(c.num)}
          />
        ))}
        {Array.from({ length: BOOK.biblio.start - 1 }, (_, i) => i + 1).map((p) => {
          const v = an.starts[p];
          const ch = chapterOf(p).num;
          const thin = ch <= 14 && an.chapters[ch - 1].perPage < an.median * 0.7;
          return (
            <rect
              key={p}
              x={x(p) + 0.15}
              width={Math.max(0.6, bw - 0.3)}
              y={y(v)}
              height={H - y(v)}
              className={`bar ${p > BOOK.textEnd ? 'notes' : thin ? 'thin' : ''} ${hover === p ? 'hov' : ''}`}
              onMouseEnter={() => setHover(p)}
              onClick={() => select(ch <= 14 ? ch : sel, ch <= 14 ? p : null)}
            />
          );
        })}
        {an.chapters.map((c) => (
          <line
            key={'avg' + c.num}
            x1={x(c.start)}
            x2={x(c.end + 1)}
            y1={y(c.perPage)}
            y2={y(c.perPage)}
            className={`avg ${c.perPage < an.median * 0.7 ? 'low' : ''}`}
          />
        ))}
        <line x1={0} x2={x(BOOK.textEnd + 1)} y1={y(an.median)} y2={y(an.median)} className="median" />
        <rect x={x(BOOK.biblio.start)} width={x(BOOK.biblio.end + 1) - x(BOOK.biblio.start)} y={0} height={H} fill="url(#hatch2)" />
        <defs>
          <pattern id="hatch2" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="#ddd7cb" strokeWidth="1.5" />
          </pattern>
        </defs>
        {/* chapter band */}
        {CHAPTERS.map((c) => {
          const st = an.chapters[c.num - 1];
          const low = st.perPage < an.median * 0.7;
          return (
            <g key={'band' + c.num} onClick={() => select(c.num)} className="band-g">
              <rect x={x(c.start) + 0.5} width={x(c.end + 1) - x(c.start) - 1} y={H + 4} height={BAND - 4} className={`band ${c.num === sel ? 'sel' : ''} ${low ? 'low' : ''}`} />
              <text x={(x(c.start) + x(c.end + 1)) / 2} y={H + 16} textAnchor="middle" className="band-num">
                {c.num}
              </text>
              <text x={(x(c.start) + x(c.end + 1)) / 2} y={H + 27} textAnchor="middle" className="band-sub">
                {st.perPage.toFixed(1)}
              </text>
            </g>
          );
        })}
        <rect x={x(BOOK.notes.start) + 0.5} width={x(BOOK.notes.end + 1) - x(BOOK.notes.start) - 1} y={H + 4} height={BAND - 4} className="band notesband" />
        <text x={(x(BOOK.notes.start) + x(BOOK.notes.end + 1)) / 2} y={H + 16} textAnchor="middle" className="band-num">
          Notes
        </text>
        <text x={(x(BOOK.notes.start) + x(BOOK.notes.end + 1)) / 2} y={H + 27} textAnchor="middle" className="band-sub">
          {an.notes.perPage.toFixed(1)}
        </text>
        <text x={(x(BOOK.biblio.start) + x(BOOK.biblio.end + 1)) / 2} y={H + 16} textAnchor="middle" className="band-num muted">
          Bibl.
        </text>
      </svg>
      {hover && hc && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b>p. {hover}</b> · {hc.num <= 14 ? `Ch. ${hc.num}` : hc.title}
          <br />
          {an.starts[hover]} locators begin here · {an.coverage[hover]} references cover it
        </div>
      )}
    </div>
  );
}

function ChapterTable() {
  const { an, s, dispatch } = useStore();
  const max = Math.max(...an.chapters.map((c) => c.perPage));
  return (
    <table className="chtable">
      <thead>
        <tr>
          <th>Ch.</th>
          <th>Title</th>
          <th className="num">Pages</th>
          <th className="num">Locators</th>
          <th>Locators per page</th>
          <th className="num">vs med.</th>
        </tr>
      </thead>
      <tbody>
        {an.chapters.map((c) => {
          const ratio = c.perPage / an.median;
          const low = ratio < 0.7;
          return (
            <tr key={c.num} className={`${s.ui.chapter === c.num ? 'sel' : ''} ${low ? 'low' : ''}`} onClick={() => dispatch({ type: 'ui', patch: { chapter: c.num, page: null } })}>
              <td className="chn">{c.num}</td>
              <td className="cht" title={c.title}>
                {c.title}
              </td>
              <td className="num muted nowrap">
                {c.start}–{c.end}
              </td>
              <td className="num">{fmt(c.locs)}</td>
              <td>
                <div className="hbar">
                  <div className="hbar-fill" style={{ width: `${(c.perPage / max) * 100}%` }} />
                  <div className="hbar-med" style={{ left: `${(an.median / max) * 100}%` }} />
                  <span className="hbar-val">{c.perPage.toFixed(1)}</span>
                </div>
              </td>
              <td className={`num ${low ? 'warn' : 'muted'}`}>{Math.round(ratio * 100)}%</td>
            </tr>
          );
        })}
        <tr className="notesrow">
          <td className="chn">n</td>
          <td className="cht">Notes (pp. 541–598)</td>
          <td className="num muted">58 pp</td>
          <td className="num">{fmt(an.notes.locs)}</td>
          <td className="muted small">{an.notes.cite} cite sources only</td>
          <td />
        </tr>
      </tbody>
    </table>
  );
}

function ChapterDrill() {
  const { an, s, dispatch, base } = useStore();
  const chNum = s.ui.chapter;
  const ch = an.chapters[chNum - 1];
  const [tab, setTab] = useState<'bridge' | 'top' | 'page'>('bridge');
  const page = s.ui.page && s.ui.page >= ch.start && s.ui.page <= ch.end ? s.ui.page : null;
  const activeTab = page ? (tab === 'bridge' || tab === 'top' ? tab : 'page') : tab === 'page' ? 'bridge' : tab;
  const prev = an.chapters[chNum - 2];
  const next = an.chapters[chNum];
  const runs = useMemo(() => thinRuns(an, ch.start, ch.end), [an, ch]);
  const th = thinThreshold(an);

  const bridging = useMemo(() => {
    const out: { id: number; a: number; b: number }[] = [];
    for (const [id, m] of an.entryChapters) {
      if (m.get(chNum)) continue;
      const a = prev ? m.get(prev.num) ?? 0 : 0;
      const b = next ? m.get(next.num) ?? 0 : 0;
      if ((prev ? a > 0 : true) && (next ? b > 0 : true) && a + b >= 2) out.push({ id, a, b });
    }
    return out.sort((x, y) => y.a + y.b - (x.a + x.b));
  }, [an, chNum, prev, next]);

  const top = useMemo(() => {
    const out: { id: number; n: number }[] = [];
    for (const [id, m] of an.entryChapters) {
      const n = m.get(chNum);
      if (n) out.push({ id, n });
    }
    return out.sort((a, b) => b.n - a.n).slice(0, 40);
  }, [an, chNum]);

  const pageRefs = useMemo(() => {
    if (!page) return [];
    const m = new Map<number, string[]>();
    for (const r of an.pageRefs[page]) {
      if (!m.has(r.id)) m.set(r.id, []);
      if (r.sub) m.get(r.id)!.push(r.sub);
    }
    return [...m.entries()].map(([id, subs]) => ({ e: an.byId.get(id)!, subs })).sort((a, b) => a.e.heading.localeCompare(b.e.heading));
  }, [an, page]);

  const totalTypes = TYPES.reduce((a, t) => a + ch.types[t], 0);
  const bookTotal = TYPES.reduce((a, t) => a + an.bookTypes[t], 0);
  const expected = Math.round(an.median * ch.pages);
  const ratio = ch.perPage / an.median;
  const PW = 640;
  const PH = 76;
  const pmax = 70;
  const pages = Array.from({ length: ch.pages }, (_, i) => ch.start + i);
  const bw = PW / ch.pages;
  const inReread = (p: number) => s.reread.some((r) => p >= r.start && p <= r.end);

  const openEntry = (id: number) => {
    const e = base.find((x) => x.id === id)!;
    if (e.direct.length > 7) dispatch({ type: 'go', view: 'strings', patch: { stringId: id, stringFilter: 'all' } });
    else dispatch({ type: 'go', view: 'entries', patch: { entryId: id, entryQuery: '' } });
  };

  return (
    <section className="drill">
      <div className="drill-head">
        <div>
          <div className="eyebrow">Chapter {ch.num} · pp. {ch.start}–{ch.end} · {ch.pages} pages</div>
          <h2>{ch.title}</h2>
        </div>
        <div className="drill-nav">
          <button className="btn ghost sm" disabled={chNum === 1} onClick={() => dispatch({ type: 'ui', patch: { chapter: chNum - 1, page: null } })}>
            ‹ Ch. {chNum - 1}
          </button>
          <button className="btn ghost sm" disabled={chNum === 14} onClick={() => dispatch({ type: 'ui', patch: { chapter: chNum + 1, page: null } })}>
            Ch. {chNum + 1} ›
          </button>
        </div>
      </div>
      <div className="stats">
        <Stat label="Locators" value={fmt(ch.locs)} sub={`${fmt(ch.entries)} headings cite this chapter`} />
        <Stat label="Per page" value={ch.perPage.toFixed(1)} sub={`${Math.round(ratio * 100)}% of book median (${an.median.toFixed(1)})`} tone={ratio < 0.7 ? 'warn' : undefined} />
        <Stat
          label="Neighbours"
          value={
            <span className="neigh">
              {prev ? `${prev.perPage.toFixed(1)}` : '—'} <span className="muted">|</span> {next ? `${next.perPage.toFixed(1)}` : '—'}
            </span>
          }
          sub={`Ch. ${prev?.num ?? '–'} | Ch. ${next?.num ?? '–'}`}
        />
        <Stat
          label="At median density"
          value={fmt(expected)}
          sub={expected > ch.locs ? `${fmt(expected - ch.locs)} fewer than that here` : `${fmt(ch.locs - expected)} above that`}
          tone={expected - ch.locs > ch.pages * 8 ? 'warn' : undefined}
        />
      </div>

      <div className="pagebars">
        <div className="pagebars-head">
          <span>Locators by page</span>
          <span className="muted small">
            Pages at or under {th} references are marked thin · click a page for its references
          </span>
        </div>
        <svg viewBox={`0 0 ${PW} ${PH + 16}`} className="pchart">
          <line x1={0} x2={PW} y1={PH - (an.median / pmax) * PH} y2={PH - (an.median / pmax) * PH} className="median" />
          {pages.map((p, i) => {
            const v = an.starts[p];
            const h = (Math.min(v, pmax) / pmax) * PH;
            const thin = an.coverage[p] <= th;
            return (
              <g key={p} onClick={() => { dispatch({ type: 'ui', patch: { page: p } }); setTab('page'); }} className="pcol">
                <rect x={i * bw} y={0} width={bw} height={PH + 16} className={`pcol-bg ${page === p ? 'sel' : ''}`} />
                <rect x={i * bw + 1} y={PH - h} width={bw - 2} height={Math.max(h, 1)} className={`pbar ${thin ? 'thin' : ''}`} />
                {inReread(p) && <rect x={i * bw + 1} y={PH + 2} width={bw - 2} height={3} className="reread-mark" />}
                {(i % 5 === 0 || p === page) && (
                  <text x={i * bw + bw / 2} y={PH + 14} textAnchor="middle" className={`axis ${p === page ? 'strong' : ''}`}>
                    {p}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="drill-cols">
        <div className="drill-left">
          <h3>Thin runs</h3>
          {runs.length === 0 && <p className="muted small">No runs of three or more thin pages.</p>}
          {runs.map((r) => {
            const key = `run-${r.start}`;
            const added = s.reread.some((x) => x.key === key);
            return (
              <div key={key} className="run">
                <div>
                  <b>pp. {formatRange(r.start, r.end)}</b>
                  <span className="muted">
                    {' '}
                    · {r.end - r.start + 1} pp · {r.refs} refs
                  </span>
                </div>
                <button
                  className="btn sm"
                  disabled={added}
                  onClick={() => dispatch({ type: 'reread-add', item: { key, start: r.start, end: r.end, note: `Thin run in Ch. ${ch.num}: ${r.refs} references over ${r.end - r.start + 1} pages` } })}
                >
                  {added ? 'On list' : '+ Re-read'}
                </button>
              </div>
            );
          })}
          <h3>Heading types vs. whole book</h3>
          <div className="mix">
            {TYPES.map((t) => {
              const here = totalTypes ? ch.types[t] / totalTypes : 0;
              const book = an.bookTypes[t] / bookTotal;
              const low = here < book * 0.75;
              return (
                <div className="mix-row" key={t}>
                  <TypeTag type={t} />
                  <div className="mix-bars">
                    <div className="mix-bar here" style={{ width: `${here * 100}%` }} />
                    <div className="mix-bar book" style={{ width: `${book * 100}%` }} />
                  </div>
                  <span className={`mix-val ${low ? 'warn' : ''}`}>
                    {Math.round(here * 100)}% <span className="muted">/ {Math.round(book * 100)}%</span>
                  </span>
                </div>
              );
            })}
            <div className="mix-legend small muted">
              <span className="sw here" /> this chapter <span className="sw book" /> book
            </div>
          </div>
        </div>
        <div className="drill-right">
          <div className="tabs">
            <Seg
              value={activeTab}
              onChange={(v) => setTab(v)}
              options={[
                ['bridge', `In Ch. ${prev?.num ?? '–'} & ${next?.num ?? '–'}, not here (${bridging.length})`],
                ['top', 'Most cited here'],
                ...(page ? ([['page', `p. ${page}`]] as ['page', string][]) : []),
              ]}
            />
          </div>
          <div className="drill-list">
            {activeTab === 'bridge' && (
              <>
                <p className="hint">
                  Headings indexed on both sides of this chapter but never inside it. Worth checking whether they come up in the text and were missed.
                </p>
                <table className="mini">
                  <thead>
                    <tr>
                      <th>Heading</th>
                      <th className="num">Ch. {prev?.num}</th>
                      <th className="num">Ch. {next?.num}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bridging.slice(0, 60).map((b) => {
                      const e = an.byId.get(b.id)!;
                      return (
                        <tr key={b.id} onClick={() => openEntry(b.id)}>
                          <td>
                            <Heading e={e} className="serif" /> <TypeTag type={e.type} />
                          </td>
                          <td className="num">{b.a}</td>
                          <td className="num">{b.b}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
            {activeTab === 'top' && (
              <table className="mini">
                <thead>
                  <tr>
                    <th>Heading</th>
                    <th className="num">Locators here</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((t) => {
                    const e = an.byId.get(t.id)!;
                    return (
                      <tr key={t.id} onClick={() => openEntry(t.id)}>
                        <td>
                          <Heading e={e} className="serif" /> <TypeTag type={e.type} />
                        </td>
                        <td className="num">{t.n}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {activeTab === 'page' && page && (
              <>
                <div className="pagehead">
                  <span>
                    <b>p. {page}</b> · {an.coverage[page]} reference{an.coverage[page] === 1 ? '' : 's'}
                  </span>
                  <span className="pager">
                    <button className="btn ghost sm" disabled={page <= ch.start} onClick={() => dispatch({ type: 'ui', patch: { page: page - 1 } })}>
                      ‹
                    </button>
                    <button className="btn ghost sm" disabled={page >= ch.end} onClick={() => dispatch({ type: 'ui', patch: { page: page + 1 } })}>
                      ›
                    </button>
                    <button
                      className="btn sm"
                      disabled={inReread(page)}
                      onClick={() => dispatch({ type: 'reread-add', item: { key: `p-${page}`, start: page, end: page, note: `Ch. ${ch.num}: ${an.coverage[page]} references` } })}
                    >
                      {inReread(page) ? 'On list' : '+ Re-read'}
                    </button>
                  </span>
                </div>
                {pageRefs.length === 0 && <p className="muted small">Nothing in the draft index points to this page.</p>}
                <ul className="refs">
                  {pageRefs.map(({ e, subs }) => (
                    <li key={e.id} onClick={() => openEntry(e.id)}>
                      <Heading e={e} className="serif" />
                      {subs.length > 0 && <span className="muted">: {subs.join('; ')}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function StructureView() {
  const { an } = useStore();
  const low = an.chapters.filter((c) => c.perPage < an.median * 0.7);
  return (
    <div className="view structure">
      <div className="view-head">
        <div>
          <h1>Locators against the chapter structure</h1>
          <p className="lede">
            Locators beginning on each page, pp. 1–{BOOK.notes.end}. The line across each chapter is its mean per page.
            {low.length > 0 && (
              <>
                {' '}
                <span className="warn">
                  {low.map((c) => `Ch. ${c.num}`).join(', ')} {low.length === 1 ? 'runs' : 'run'} under 70% of the book median.
                </span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="legend">
        <span><i className="lg-bar" /> locators beginning on page</span>
        <span><i className="lg-bar thin" /> chapter under 70% of median</span>
        <span><i className="lg-bar notes" /> notes</span>
        <span><i className="lg-line" /> chapter mean</span>
        <span><i className="lg-line dashed" /> book median, {an.median.toFixed(1)} per page</span>
        <span className="muted">Click a chapter or a page to inspect it</span>
      </div>
      <DensityChart />
      <div className="structure-grid">
        <ChapterTable />
        <ChapterDrill />
      </div>
    </div>
  );
}
