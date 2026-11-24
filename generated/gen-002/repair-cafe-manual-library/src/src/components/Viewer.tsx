import { useEffect, useMemo, useRef, useState } from 'react';
import { Doc, RepairLog, SCAN_LABEL, TYPE_LABEL } from '../data/types';
import { TRANSCRIBED, pageText } from '../data/manual';
import { FaultQuery, pagesMentioning, faultScore } from '../lib/search';
import { fmtDate, plural, years } from '../lib/format';
import { ScanPage } from './ScanPage';
import { LogCard, PageRefTarget } from './PastFixes';
import { IconBack, IconNext, IconPrint, IconSun, IconZoomIn, IconZoomOut, IconSearch, IconX, IconAlert, TypeIcon, IconInfo } from './icons';

interface Props {
  doc: Doc;
  page: number;
  fault: FaultQuery;
  logs: RepairLog[];
  related: Doc[];
  backLabel: string;
  onPage: (n: number) => void;
  onBack: () => void;
  onOpenDoc: (id: string, page?: number) => void;
  refTarget: (log: RepairLog) => PageRefTarget | undefined;
}

const ZOOMS = [1, 1.2, 1.45];

export function Viewer({ doc, page, fault, logs, related, backLabel, onPage, onBack, onOpenDoc, refTarget }: Props) {
  const transcribed = TRANSCRIBED[doc.id];
  const [boost, setBoost] = useState(false);
  const [zoomIx, setZoomIx] = useState(0);
  const [find, setFind] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [page, doc.id]);

  const go = (n: number) => onPage(Math.max(1, Math.min(doc.pages, n)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(page + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(page - 1);
      else if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const terms = useMemo(
    () =>
      find
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 1),
    [find],
  );

  const findHits = useMemo(() => {
    if (!transcribed || !terms.length) return [];
    return transcribed
      .map((p) => {
        const text = pageText(p);
        const low = text.toLowerCase();
        if (!terms.every((t) => low.includes(t))) return null;
        const i = low.indexOf(terms[0]);
        const s = Math.max(0, i - 40);
        const snippet = (s > 0 ? '…' : '') + text.slice(s, i + 70).trim() + '…';
        return { n: p.n, title: p.title, snippet };
      })
      .filter(Boolean) as { n: number; title: string; snippet: string }[];
  }, [transcribed, terms]);

  const faultPages = pagesMentioning(doc.id, fault);
  const keySections = doc.contents?.filter((c) => c.key) ?? [];
  const current = doc.contents?.slice().reverse().find((c) => page >= c.page);
  const pageTitle = transcribed?.find((p) => p.n === page)?.title;

  return (
    <div className="viewer">
      <div className="viewer-bar">
        <button className="btn btn-back" onClick={onBack}>
          <IconBack size={20} /> {backLabel}
        </button>
        <div className="viewer-title">
          <span className={`type-tile sm t-${doc.type}`}>
            <TypeIcon type={doc.type} size={20} />
          </span>
          <div>
            <h1>{doc.title}</h1>
            <p className="muted">
              {TYPE_LABEL[doc.type]} · {years(doc.yearFrom, doc.yearTo)} · {plural(doc.pages, 'page')} · {SCAN_LABEL[doc.scan]}
            </p>
          </div>
        </div>
      </div>

      <div className="viewer-grid">
        {/* ---------- left: where to look ---------- */}
        <aside className="v-left">
          {keySections.length > 0 && (
            <section className="v-sec">
              <h2 className="v-h">Go straight to</h2>
              <div className="jump-list">
                {keySections.map((c) => {
                  const on = page >= c.page && page <= (c.endPage ?? c.page);
                  return (
                    <button key={c.page} className={`jump ${on ? 'on' : ''}`} onClick={() => go(c.page)}>
                      <span>{c.title}</span>
                      <span className="pg">p.{c.endPage ? `${c.page}–${c.endPage}` : c.page}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {faultPages.length > 0 && (
            <section className="v-sec fault-sec">
              <h2 className="v-h">Mentions “{fault.raw.trim()}”</h2>
              <div className="pg-row">
                {faultPages.map((p) => (
                  <button key={p} className={`pg-btn ${p === page ? 'on' : ''}`} onClick={() => go(p)}>
                    p.{p}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="v-sec">
            <h2 className="v-h">Find in this document</h2>
            {transcribed ? (
              <>
                <div className="find-box">
                  <IconSearch size={18} />
                  <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="e.g. brush, governor, 2340-118" aria-label="Find in this document" />
                  {find && (
                    <button className="icon-btn" onClick={() => setFind('')} aria-label="Clear">
                      <IconX size={16} />
                    </button>
                  )}
                </div>
                {terms.length > 0 && (
                  <div className="find-results">
                    {findHits.length === 0 ? (
                      <p className="muted small">Not found in this document.</p>
                    ) : (
                      <>
                        <p className="muted small">On {plural(findHits.length, 'page')}</p>
                        {findHits.map((h) => (
                          <button key={h.n} className={`find-hit-row ${h.n === page ? 'on' : ''}`} onClick={() => go(h.n)}>
                            <span className="fh-pg">p.{h.n}</span>
                            <span className="fh-body">
                              <b>{h.title}</b>
                              <span>{h.snippet}</span>
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="muted small">This scan hasn’t been typed up yet, so it can’t be searched. Use the page numbers below.</p>
            )}
          </section>

          {doc.contents && (
            <section className="v-sec">
              <h2 className="v-h">Contents</h2>
              <ol className="toc">
                {doc.contents.map((c) => (
                  <li key={c.page}>
                    <button className={current === c ? 'on' : ''} onClick={() => go(c.page)}>
                      <span>{c.title}</span>
                      <span className="pg">{c.endPage ? `${c.page}–${c.endPage}` : c.page}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="v-sec">
            <h2 className="v-h">All pages</h2>
            <div className="page-grid">
              {Array.from({ length: doc.pages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={`pg-cell ${n === page ? 'on' : ''} ${doc.missingPages?.includes(n) ? 'pg-missing' : ''} ${faultPages.includes(n) ? 'fault' : ''}`}
                  onClick={() => go(n)}
                  title={doc.missingPages?.includes(n) ? `Page ${n} — missing from scan` : `Page ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* ---------- centre: the page ---------- */}
        <section className="v-center">
          <div className="v-tools">
            <div className="pager">
              <button className="btn btn-pager" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
                <IconBack size={20} /> Previous
              </button>
              <span className="pager-pos">
                Page <b>{page}</b> of {doc.pages}
                {pageTitle && <span className="pager-title"> · {pageTitle}</span>}
              </span>
              <button className="btn btn-pager" onClick={() => go(page + 1)} disabled={page >= doc.pages} aria-label="Next page">
                Next <IconNext size={20} />
              </button>
            </div>
            <div className="tool-group">
              <button className={`btn btn-tool ${boost ? 'on' : ''}`} onClick={() => setBoost(!boost)} aria-pressed={boost} title="Make faint text darker">
                <IconSun size={18} /> {boost ? 'Text darkened' : 'Darken text'}
              </button>
              <div className="zoom">
                <button className="icon-btn" onClick={() => setZoomIx(Math.max(0, zoomIx - 1))} disabled={zoomIx === 0} aria-label="Smaller">
                  <IconZoomOut />
                </button>
                <span>{Math.round(ZOOMS[zoomIx] * 100)}%</span>
                <button className="icon-btn" onClick={() => setZoomIx(Math.min(ZOOMS.length - 1, zoomIx + 1))} disabled={zoomIx === ZOOMS.length - 1} aria-label="Bigger">
                  <IconZoomIn />
                </button>
              </div>
              <button className="btn btn-tool" onClick={() => window.print()} title="Print this page for the bench">
                <IconPrint /> Print page
              </button>
            </div>
          </div>
          {doc.scan === 'faded' && !boost && (
            <div className="faded-tip">
              <IconAlert size={16} /> This is a faded photocopy.
              <button className="link-btn" onClick={() => setBoost(true)}>
                Darken the text
              </button>
            </div>
          )}
          <div className="page-scroll" ref={scroller}>
            <ScanPage doc={doc} page={page} transcribed={transcribed} terms={terms} boost={boost} zoom={ZOOMS[zoomIx]} onPage={go} />
          </div>
        </section>

        {/* ---------- right: about + past fixes ---------- */}
        <aside className="v-right">
          <section className="v-sec">
            <h2 className="v-h">About this document</h2>
            <dl className="facts">
              <dt>Models</dt>
              <dd>
                <span className="models">
                  {doc.models.map((m) => (
                    <span key={m} className="model">
                      {m}
                    </span>
                  ))}
                </span>
              </dd>
              <dt>Made</dt>
              <dd>{years(doc.yearFrom, doc.yearTo)}</dd>
              <dt>Scan</dt>
              <dd>
                <span className={`scan-badge s-${doc.scan}`}>
                  {doc.scan === 'partial' && doc.missingPages ? `Missing p.${doc.missingPages.join(', ')}` : SCAN_LABEL[doc.scan]}
                </span>
              </dd>
              <dt>Language</dt>
              <dd>{doc.language}</dd>
              <dt>Added by</dt>
              <dd>
                {doc.contributor}, {fmtDate(doc.added)}
              </dd>
            </dl>
            {doc.note && (
              <p className="contrib-note">
                <IconInfo size={16} /> <span>{doc.note}</span>
              </p>
            )}
          </section>

          <section className="v-sec">
            <h2 className="v-h">
              Past repairs on {doc.models.length > 1 ? 'these models' : 'this model'} <span className="count">{logs.length}</span>
            </h2>
            {logs.length === 0 && <p className="muted small">None logged yet.</p>}
            {logs
              .slice()
              .sort((a, b) => Number(pagesMentioningLog(b, fault)) - Number(pagesMentioningLog(a, fault)) || OUTCOME_RANK[a.outcome] - OUTCOME_RANK[b.outcome] || b.date.localeCompare(a.date))
              .map((l) => (
              <LogCard
                key={l.id}
                log={l}
                emphasis={fault.concepts.length > 0 && pagesMentioningLog(l, fault)}
                defaultOpen={fault.concepts.length > 0 && pagesMentioningLog(l, fault)}
                refTarget={refTarget}
                onOpenPage={(id, n) => (id === doc.id ? go(n) : onOpenDoc(id, n))}
              />
            ))}
          </section>

          {related.length > 0 && (
            <section className="v-sec">
              <h2 className="v-h">Also in the library</h2>
              <ul className="related">
                {related.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => onOpenDoc(r.id)}>
                      <span className={`type-tile xs t-${r.type}`}>
                        <TypeIcon type={r.type} size={16} />
                      </span>
                      <span>
                        <b>{TYPE_LABEL[r.type]}</b>
                        <span className="muted small">
                          {r.models.join(' / ')} · {plural(r.pages, 'page')} · {SCAN_LABEL[r.scan]}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

const OUTCOME_RANK = { fixed: 0, partly: 1, not: 2 } as const;
const pagesMentioningLog = (l: RepairLog, fq: FaultQuery) => faultScore(fq, l.fault) === 1;
