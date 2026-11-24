import { useMemo } from 'react';
import type { Row } from '../lib/types';
import { CAT_COLOR, cutAnalysis, median } from '../lib/metrics';
import type { Bucket } from '../lib/metrics';
import { days, num, pct0, plural, signed0, usd0, MINUS_SIGN } from '../lib/format';
import type { ItemFilters } from '../lib/metrics';
import { PriceHistory } from './charts';
import { Card, Swatch } from './ui';

export function Cuts({ rows, open, goItems }: { rows: Row[]; open: (id: string) => void; goItems: (p: Partial<ItemFilters>) => void }) {
  const a = useMemo(() => cutAnalysis(rows), [rows]);
  const sold = rows.filter((r) => r.status === 'sold');

  const base = a.baseline.rate ?? 0;
  const anyRate = a.anyCut.rate ?? 0;
  const ratio = base > 0 ? anyRate / base : null;
  const bestSize = [...a.bySize].filter((b) => b.n >= 20 && b.rate !== null).sort((x, y) => (y.rate as number) - (x.rate as number))[0];
  const smallest = a.bySize[0];

  // how much of the first asking price a cut item gave up
  const gaveUp = median(sold.filter((r) => (r.cuts?.length ?? 0) > 0 && r.listPrice).map((r) => (1 - (r.salePrice as number) / (r.listPrice as number)) * 100));
  const noCutSold = sold.filter((r) => (r.cuts?.length ?? 0) === 0);

  const first = a.bySize[0], last = a.bySize[a.bySize.length - 1];
  const deeperBetter = first.rate !== null && last.rate !== null && last.n >= 20 && last.rate > first.rate + 5;
  let headline: string;
  if (ratio === null) headline = 'Not enough listings in this window to judge the cuts.';
  else if (ratio >= 1.5) headline = deeperBetter ? 'Yes, the cuts helped, and deeper cuts helped more.' : 'Yes, the cuts helped.';
  else if (ratio >= 1.15) headline = 'The cuts helped a little, but not by much.';
  else headline = 'The cuts did not visibly change how fast things sold.';

  const late = (() => {
    const l = a.ladder;
    const lateRows = l.slice(2);
    const lateN = lateRows.reduce((s, r) => s + r.n, 0);
    if (!l[0].n || !lateN || l[0].medianPerHour === null) return null;
    const lateSold = sold.filter((r) => (r.daysListed as number) > 60 && r.perHour !== null).map((r) => r.perHour as number);
    const lh = median(lateSold);
    if (lh === null) return null;
    return { share: lateRows.reduce((s, r) => s + r.shareOfNet, 0), lateHr: lh, earlyHr: l[0].medianPerHour };
  })();
  const trails = [...sold].filter((r) => (r.cuts?.length ?? 0) >= 2).sort((x, y) => (y.daysListed as number) - (x.daysListed as number)).slice(0, 6);
  const maxRate = Math.max(40, base, ...a.bySize.map((b) => b.rate ?? 0), ...a.byNumber.map((b) => b.rate ?? 0));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Did the price cuts after 30 days help?</h1>
          <p className="lede">
            You cut when an item is still unsold after about a month, usually every three to five weeks after that. This compares equal two-week windows before and after each cut.
          </p>
        </div>
      </div>

      <section className="verdict">
        <div className="verdict-main">
          <span className="eyebrow">What the data says</span>
          <h2>{headline}</h2>
          {ratio !== null && (
            <p>
              Of items still unsold at day 16, <b>{pct0(base)}</b> sold by day 30, before any cut. In the 14 days after a cut, <b>{pct0(anyRate)}</b> sold
              {ratio >= 1.15 && <> ({(Math.round(ratio * 10) / 10).toFixed(1)}× as often)</>}.
              {bestSize && smallest && bestSize.label !== smallest.label && smallest.rate !== null && (
                <> Cuts of {bestSize.label.toLowerCase()} did best at <b>{pct0(bestSize.rate as number)}</b>; cuts {smallest.label.toLowerCase()} managed {pct0(smallest.rate)}.</>
              )}
            </p>
          )}
          {gaveUp !== null && (
            <p className="verdict-cost">
              The price of waiting: items that needed cuts sold for a median <b>{pct0(gaveUp)}</b> below their first asking price, and {plural(noCutSold.length, 'item')} sold with no cut at all.
            </p>
          )}
        </div>
        <dl className="verdict-stats">
          <div><dt>Reached day 30 unsold</dt><dd>{num(a.reachedDay30)}</dd><small>{num(a.soldAfterDay30)} sold since · {num(a.stillListedAfterDay30)} still listed</small></div>
          <div><dt>Typical first cut</dt><dd>{a.medianFirstCut === null ? '—' : pct0(a.medianFirstCut)}</dd><small>median, as % of the asking price</small></div>
          <div><dt>Items cut at least once</dt><dd>{num(a.cutItems)}</dd><small>of {num(rows.filter((r) => r.listDay !== null).length)} ever listed</small></div>
        </dl>
      </section>

      <div className="grid-cuts">
        <Card title="Chance of selling within 14 days" sub="Share of items that sold in the two weeks after each cut, by how deep the cut was. The dotted line is the no-cut baseline.">
          <div className="rates">
            <RateRow bucket={a.baseline} max={maxRate} base={base} tone="base" label="Before the first cut" note="days 16 to 30" />
            <div className="rates-sep">After a cut of…</div>
            {a.bySize.map((b) => <RateRow key={b.label} bucket={b} max={maxRate} base={base} tone="cut" label={b.label} />)}
            <div className="rates-sep">After…</div>
            {a.byNumber.map((b) => <RateRow key={b.label} bucket={b} max={maxRate} base={base} tone="num" label={b.label} />)}
          </div>
          <p className="fineprint">Windows still open (cuts in the last 14 days) are left out. An item can appear under more than one cut. This is a before-and-after comparison, not an experiment: season and listing age move the odds too.</p>
        </Card>

        <Card title="What waiting costs" sub="Sold items, grouped by how long they sat from listing to sale.">
          <table className="ladder">
            <thead>
              <tr><th>Sold in</th><th className="r">Items</th><th className="r">Avg cuts</th><th className="r">Got of 1st ask</th><th className="r">Median profit</th><th className="r">Median per hour</th><th className="r">Share of profit</th></tr>
            </thead>
            <tbody>
              {a.ladder.map((l) => (
                <tr key={l.label}>
                  <td className="name">{l.label}</td>
                  <td className="r num">{num(l.n)}</td>
                  <td className="r num">{l.avgCuts === null ? '—' : l.avgCuts.toFixed(1)}</td>
                  <td className="r num">{l.keptPct === null ? '—' : pct0(l.keptPct)}</td>
                  <td className="r num">{l.medianNet === null ? '—' : signed0(l.medianNet)}</td>
                  <td className="r num">{l.medianPerHour === null ? '—' : usd0(l.medianPerHour) + '/h'}</td>
                  <td className="r"><span className="sharecell"><span className="bar-track"><span className="bar-fill" style={{ width: `${Math.max(0, l.shareOfNet)}%`, background: '#233f5c' }} /></span><span className="num">{pct0(l.shareOfNet)}</span></span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {late && (
            <p className="insight">
              Items that sold after day 60 made <b>{pct0(late.share)}</b> of your profit, but their median profit per hour is <b>{usd0(late.lateHr)}/h</b> against <b>{usd0(late.earlyHr)}/h</b> for items that sold within 30 days.
            </p>
          )}
          <p className="fineprint">“Got of 1st ask” is the sale price as a share of the very first asking price. Profit is after fees, shipping and what you paid.</p>
        </Card>
      </div>

      <Card title="The longest trails" sub="Sold items cut at least twice, longest wait first. Dots are cuts, the filled circle is the sale." right={<button type="button" className="link" onClick={() => goItems({ preset: 'cut3' })}>All items cut 3+ times →</button>}>
        <ul className="trails">
          {trails.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => open(r.id)}>
                <span className="t-name"><Swatch color={CAT_COLOR[r.category]} /><b>{r.title}</b><small>{r.platform} · bought for {usd0(r.purchase)}</small></span>
                <span className="t-chart"><PriceHistory row={r} width={230} height={44} mini /></span>
                <span className="t-text">{usd0(r.listPrice as number)} {'→'} {usd0(r.salePrice as number)}<small>{r.cuts?.length} cuts · {r.cutPcts.map((p) => MINUS_SIGN + Math.round(p) + '%').join(' ')}</small></span>
                <span className="t-days">{days(r.daysListed)}<small className={r.net < 0 ? 'neg' : ''}>{signed0(r.net)} net</small></span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function RateRow({ bucket, max, base, tone, label, note }: { bucket: Bucket; max: number; base: number; tone: 'base' | 'cut' | 'num'; label: string; note?: string }) {
  const r = bucket.rate;
  return (
    <div className="rate-row">
      <span className="rate-label">{label}{note && <small>{note}</small>}</span>
      <span className="rate-track">
        <span className="rate-base" style={{ left: `${(base / max) * 100}%` }} />
        {r !== null && <span className={'rate-fill ' + tone} style={{ width: `${(r / max) * 100}%` }} />}
      </span>
      <span className="rate-val">{r === null ? '—' : pct0(r)}</span>
      <span className="rate-n">n = {num(bucket.n)}</span>
    </div>
  );
}
