import { Fragment, ReactNode } from 'react';
import { Doc, TYPE_LABEL } from '../data/types';
import { Block, Page, MANUAL_HEADER } from '../data/manual';
import { Figure } from './Figures';
import { mulberry32 } from '../data/rng';
import { years } from '../lib/format';

interface Ctx {
  terms: string[];
  onPage?: (n: number) => void;
  maxPage: number;
}

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function highlight(text: string, terms: string[], keyBase: string): ReactNode[] {
  if (!terms.length) return [text];
  const rx = new RegExp('(' + terms.map(escapeRx).join('|') + ')', 'gi');
  return text.split(rx).map((part, i) =>
    i % 2 ? (
      <mark key={keyBase + i} className="find-hit">
        {part}
      </mark>
    ) : (
      <Fragment key={keyBase + i}>{part}</Fragment>
    ),
  );
}

/** Turns "page 14", "pages 13 – 14" and "p.14" into jump links, and highlights search terms. */
export function RichText({ text, ctx }: { text: string; ctx: Ctx }) {
  const rx = /\b((?:pages?|p\.)\s?(\d{1,2})(?:\s?[–-]\s?(\d{1,2}))?)/gi;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = rx.exec(text))) {
    const n = Number(m[2]);
    if (!ctx.onPage || n < 1 || n > ctx.maxPage) continue;
    out.push(...highlight(text.slice(last, m.index), ctx.terms, `t${i}-`));
    out.push(
      <button key={`l${i}`} className="page-link" onClick={() => ctx.onPage!(n)} title={`Go to page ${n}`}>
        {m[1]}
      </button>,
    );
    last = m.index + m[0].length;
    i++;
  }
  out.push(...highlight(text.slice(last), ctx.terms, 'end-'));
  return <>{out}</>;
}

function PageCell({ text, ctx }: { text: string; ctx: Ctx }) {
  const parts = text.split(/(\d+)/);
  return (
    <>
      {parts.map((p, i) =>
        /^\d+$/.test(p) && Number(p) <= ctx.maxPage ? (
          <button key={i} className="page-link" onClick={() => ctx.onPage!(Number(p))} title={`Go to page ${p}`}>
            {p}
          </button>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function BlockView({ b, ctx }: { b: Block; ctx: Ctx }) {
  const R = (t: string) => <RichText text={t} ctx={ctx} />;
  switch (b.k) {
    case 'cover':
      return (
        <div className="cover">
          <div className="cover-brand">{b.brand}</div>
          <div className="cover-rule" />
          <div className="cover-title">{R(b.title)}</div>
          <div className="cover-sub">{R(b.sub)}</div>
          <div className="cover-models">{R(b.models)}</div>
          <div className="cover-form">{b.form}</div>
        </div>
      );
    case 'h':
      return <h3 className="s-h">{R(b.t)}</h3>;
    case 'h2':
      return <h4 className="s-h2">{R(b.t)}</h4>;
    case 'p':
      return <p className="s-p">{R(b.t)}</p>;
    case 'warn':
      return (
        <p className="s-warn">
          <b>CAUTION: </b>
          {R(b.t)}
        </p>
      );
    case 'hand':
      return <div className={`s-hand ${b.at ?? 'right'}`}>{R(b.t)}</div>;
    case 'ol':
      return (
        <ol className="s-ol">
          {b.items.map((t, i) => (
            <li key={i}>{R(t)}</li>
          ))}
        </ol>
      );
    case 'ul':
      return (
        <ul className="s-ol">
          {b.items.map((t, i) => (
            <li key={i}>{R(t)}</li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <table className="s-table">
          {b.widths && (
            <colgroup>
              {b.widths.map((w, i) => (
                <col key={i} style={{ width: w + '%' }} />
              ))}
            </colgroup>
          )}
          <thead>
            <tr>
              {b.head.map((h, i) => (
                <th key={i}>{R(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{/^page$/i.test(b.head[j]) && c && ctx.onPage ? <PageCell text={c} ctx={ctx} /> : R(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'fig':
      return (
        <figure className="s-fig">
          <Figure kind={b.fig} h={b.h} />
          <figcaption>{R(b.caption)}</figcaption>
        </figure>
      );
  }
}

interface Props {
  doc: Doc;
  page: number;
  transcribed?: Page[];
  terms: string[];
  boost: boolean;
  zoom: number;
  onPage: (n: number) => void;
}

export function ScanPage({ doc, page, transcribed, terms, boost, zoom, onPage }: Props) {
  const ctx: Ctx = { terms, onPage, maxPage: doc.pages };
  const tp = transcribed?.find((p) => p.n === page);
  const missing = doc.missingPages?.includes(page);
  const r = mulberry32(page * 97 + doc.id.length);
  const tilt = ((r() - 0.5) * 0.7).toFixed(2);
  const header = MANUAL_HEADER[doc.id] ?? `${doc.brand.toUpperCase()} ${doc.models.join(' · ')}`;

  return (
    <div className={`scan scan-${doc.scan} ${boost ? 'boost' : ''}`} style={{ ['--zoom' as string]: zoom }}>
      <div className="sheet" style={{ transform: `rotate(${tilt}deg)` }} data-page={page}>
        <div className="sheet-grain" />
        {missing ? (
          <div className="missing">
            <div className="missing-box">
              <b>Page {page} is missing</b>
              <span>This page wasn’t in the copy we were given to scan.</span>
            </div>
          </div>
        ) : (
          <div className="sheet-inner">
            {page > 1 && (
              <div className="s-running">
                <span>{header}</span>
                <span>{tp?.title ?? ''}</span>
              </div>
            )}
            {tp ? (
              tp.blocks.map((b, i) => <BlockView key={i} b={b} ctx={ctx} />)
            ) : page === 1 ? (
              <GenericCover doc={doc} />
            ) : (
              <GenericBody seed={page * 13 + doc.pages} />
            )}
            <div className="s-folio">— {page} —</div>
          </div>
        )}
      </div>
    </div>
  );
}

function GenericCover({ doc }: { doc: Doc }) {
  return (
    <div className="cover">
      <div className="cover-brand">{doc.brand.toUpperCase()}</div>
      <div className="cover-rule" />
      <div className="cover-title">{doc.family ? `${doc.family} ${doc.product}` : doc.product}</div>
      <div className="cover-sub">{TYPE_LABEL[doc.type].toUpperCase()}</div>
      <div className="cover-models">
        {doc.models.length > 1 ? 'Models' : 'Model'} {doc.models.join(' · ')}
      </div>
      <div className="cover-form">{years(doc.yearFrom, doc.yearTo)}</div>
    </div>
  );
}

function GenericBody({ seed }: { seed: number }) {
  const r = mulberry32(seed);
  const rows: ReactNode[] = [];
  let k = 0;
  rows.push(<div key={k++} className="bar bar-h" style={{ width: `${40 + r() * 30}%` }} />);
  for (let para = 0; para < 4; para++) {
    const lines = 3 + Math.floor(r() * 4);
    for (let l = 0; l < lines; l++) rows.push(<div key={k++} className="bar" style={{ width: l === lines - 1 ? `${30 + r() * 40}%` : `${88 + r() * 12}%` }} />);
    rows.push(<div key={k++} className="bar-gap" />);
    if (para === 1 && r() > 0.35) rows.push(<div key={k++} className="bar-fig" style={{ height: 120 + r() * 90 }} />);
  }
  return (
    <div className="generic-body" aria-label="Scanned page — text not transcribed">
      {rows}
      <div className="untranscribed">Scanned image only — this page hasn’t been typed up for searching yet.</div>
    </div>
  );
}
