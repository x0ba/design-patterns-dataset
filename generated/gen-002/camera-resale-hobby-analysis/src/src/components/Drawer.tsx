import { useEffect, useMemo, useRef } from 'react';
import type { Row } from '../lib/types';
import { ALL_ROWS, CAT_COLOR, CAT_LABEL, median } from '../lib/metrics';
import { dateShort, dayMonth, days, perHr1, signed0, usd0, usd2, MINUS_SIGN } from '../lib/format';
import { PriceHistory } from './charts';
import { Swatch, useWidth } from './ui';

const STATUS_LABEL: Record<string, string> = { sold: 'Sold', listed: 'Listed', kept: 'Kept', 'written-off': 'Written off' };

export function Drawer({ row, onClose, open }: { row: Row | null; onClose: () => void; open: (id: string) => void }) {
  return row ? <DrawerInner key={row.id} row={row} onClose={onClose} open={open} /> : null;
}

function DrawerInner({ row, onClose, open }: { row: Row; onClose: () => void; open: (id: string) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [chartRef, cw] = useWidth<HTMLDivElement>();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [row, onClose]);

  const siblings = useMemo(() => {
    const others = ALL_ROWS.filter((r) => r.title === row.title && r.id !== row.id && r.status === 'sold');
    if (!others.length) return null;
    return {
      n: others.length,
      medNet: median(others.map((r) => r.net)) as number,
      medDays: median(others.map((r) => r.daysListed as number)) as number,
      list: others.slice(0, 3),
    };
  }, [row]);

  const sold = row.status === 'sold';
  const feePct = sold && row.salePrice ? ((row.fee ?? 0) / row.salePrice) * 100 : 0;
  const cuts = row.cuts ?? [];
  const sinceCut = cuts.length && row.daysListed !== null ? row.daysListed - (Math.round((Date.parse(cuts[cuts.length - 1].date) - Date.parse(row.listed as string)) / 86400000)) : null;

  return (
    <div className="drawer-root">
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`${row.title} details`}>
        <header className="d-head">
          <div>
            <div className="d-eyebrow"><Swatch color={CAT_COLOR[row.category]} />{CAT_LABEL[row.category]} · {row.id}</div>
            <h2>{row.title}</h2>
            <div className="d-meta">
              <span className={'pill ' + row.status}>{STATUS_LABEL[row.status]}</span>
              {row.platform && <span>on {row.platform}</span>}
              <span>from {row.source.toLowerCase()}, {dateShort(row.acquired)}</span>
            </div>
          </div>
          <button ref={closeRef} type="button" className="icon-btn close" onClick={onClose} aria-label="Close details">✕</button>
        </header>

        <div className="d-body">
          <div className="d-stats">
            <div><span>{sold ? 'Net profit' : 'Cost so far'}</span><b className={sold && row.net < 0 ? 'neg' : ''}>{sold ? signed0(row.net) : usd0(row.cost)}</b></div>
            <div><span>Hours logged</span><b>{row.hours.toFixed(2).replace(/0$/, '')} h</b></div>
            <div><span>{sold ? 'Per hour' : 'Days listed'}</span><b>{sold ? perHr1(row.perHour) : days(row.daysListed)}</b></div>
            <div><span>{sold ? 'Days to sell' : 'Cuts so far'}</span><b>{sold ? days(row.daysListed) : cuts.length}</b></div>
          </div>

          {row.listDay !== null && (
            <section>
              <h3>Asking price over time</h3>
              <div ref={chartRef} className="d-chart">{cw > 0 && <PriceHistory row={row} width={cw} />}</div>
              <ol className="cutlist">
                <li><span className="cl-date">{dayMonth(row.listed as string)}</span><span>Listed at <b>{usd0(row.listPrice as number)}</b></span><span className="cl-day">day 0</span></li>
                {cuts.map((c, i) => {
                  const d = Math.round((Date.parse(c.date) - Date.parse(row.listed as string)) / 86400000);
                  const prev = i === 0 ? (row.listPrice as number) : cuts[i - 1].price;
                  return (
                    <li key={c.date}><span className="cl-date">{dayMonth(c.date)}</span><span>Cut {usd0(prev)} {'→'} <b>{usd0(c.price)}</b> <em>({MINUS_SIGN}{Math.round(row.cutPcts[i])}%)</em></span><span className="cl-day">day {d}</span></li>
                  );
                })}
                {sold && (
                  <li className="cl-sold"><span className="cl-date">{dayMonth(row.sold as string)}</span><span>Sold for <b>{usd0(row.salePrice as number)}</b>{row.offer && <em> (accepted an offer below asking)</em>}</span><span className="cl-day">day {row.daysListed}</span></li>
                )}
                {!sold && <li className="cl-now"><span className="cl-date">Today</span><span>Asking <b>{usd0(row.lastPrice as number)}</b>{sinceCut !== null && <em> (last cut {sinceCut} days ago)</em>}</span><span className="cl-day">day {row.daysListed}</span></li>}
              </ol>
            </section>
          )}

          {row.status === 'kept' || row.status === 'written-off' ? (
            <section>
              <h3>What happened</h3>
              <p className="d-note">{row.note}</p>
              <p className="d-note dim">Cost {usd0(row.cost)} ({usd0(row.purchase)} purchase + {usd0(row.parts)} parts) and {row.hours} hours, with no sale to set against it.</p>
            </section>
          ) : null}

          <section>
            <h3>{sold ? 'Where the money went' : 'Money in so far'}</h3>
            <table className="receipt">
              <tbody>
                {sold && <tr><td>Sale price</td><td>{usd2(row.salePrice as number)}</td></tr>}
                {sold && <tr><td>Platform fee <small>{feePct.toFixed(1)}% on {row.platform}</small></td><td>{usd2(-(row.fee ?? 0))}</td></tr>}
                {sold && <tr><td>Shipping you paid</td><td>{(row.shipping ?? 0) > 0 ? usd2(-(row.shipping ?? 0)) : <span className="dim">$0.00 · buyer paid</span>}</td></tr>}
                <tr><td>Purchase price <small>{row.source.toLowerCase()}</small></td><td>{usd2(-row.purchase)}</td></tr>
                <tr><td>Parts and supplies</td><td>{row.parts > 0 ? usd2(-row.parts) : <span className="dim">$0.00</span>}</td></tr>
                <tr className="total"><td>{sold ? 'Net profit' : 'Net so far'}</td><td className={row.net < 0 ? 'neg' : ''}>{row.net < 0 ? usd2(row.net) : '+' + usd2(row.net)}</td></tr>
                {sold && row.hours > 0 && <tr className="sub"><td>Spread over {row.hours.toFixed(2).replace(/0$/, '')} hours of cleaning and repair</td><td>{perHr1(row.perHour)}</td></tr>}
              </tbody>
            </table>
          </section>

          {sold && (
            <section>
              <h3>Buyer feedback</h3>
              {row.feedback ? (
                <figure className="quote">
                  <div className="stars" aria-label={`${row.feedback.stars} out of 5 stars`}>{'★'.repeat(row.feedback.stars)}<span>{'★'.repeat(5 - row.feedback.stars)}</span></div>
                  <blockquote>{row.feedback.text}</blockquote>
                </figure>
              ) : <p className="dim">The buyer didn’t leave feedback.</p>}
            </section>
          )}

          {siblings && (
            <section>
              <h3>Other {row.title} you’ve sold</h3>
              <p className="d-note">{siblings.n} more, median <b>{signed0(siblings.medNet)}</b> profit and <b>{Math.round(siblings.medDays)} days</b> to sell.</p>
              <div className="sib">
                {siblings.list.map((s) => (
                  <button type="button" key={s.id} onClick={() => open(s.id)}>{dateShort(s.sold as string)} · {usd0(s.salePrice as number)} · {days(s.daysListed)}</button>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
