import { useMemo, useState } from 'react';
import type { Row, Cat } from '../lib/types';
import {
  CAT_COLOR, CAT_LABEL, CAT_ORDER, GROUP_LABEL, PLATFORMS, RANGE_LABEL, SEQ_COLORS, groupFilter, groupStats, inTheBlackSince, cashCurve, modelStats, stat,
} from '../lib/metrics';
import type { GroupKey, ItemFilters, Preset, Range, Stat } from '../lib/metrics';
import { days, hrs0, monthYearFromDay, num, pct0, perHr, perHr1, plural, signed0, usd0 } from '../lib/format';
import { BubbleChart } from './charts';
import { Card, Segmented, Sparkline, Swatch } from './ui';

interface Props {
  rows: Row[];
  range: Range;
  goItems: (patch: Partial<ItemFilters>) => void;
  open: (id: string) => void;
}

export function Overview({ rows, range, goItems, open }: Props) {
  const all = useMemo(() => stat(rows), [rows]);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Where the money and the weekends go</h1>
          <p className="lede">
            <Takeaway rows={rows} />
            {range !== 'all' && <> Showing items acquired in the <b>{RANGE_LABEL[range].toLowerCase()}</b>; newer ones haven’t had time to sell yet.</>}
          </p>
        </div>
      </div>
      <Kpis s={all} rows={rows} goItems={goItems} />
      <Analysis rows={rows} all={all} goItems={goItems} open={open} />
      <Outliers rows={rows} goItems={goItems} open={open} />
    </div>
  );
}

// ---------------------------------------------------------------
const catName = (s: Stat) => s.label.replace('Point-and-shoot', 'Point-and-shoots');
function Takeaway({ rows }: { rows: Row[] }) {
  const g = groupStats(rows, 'category').filter((s) => s.n >= 40 && s.perHour !== null && s.medianDays !== null);
  if (g.length < 3) return <>Every item counts what you spent on it, sold or not.</>;
  const byHr = [...g].sort((a, b) => (b.perHour as number) - (a.perHour as number));
  const best = byHr[0], worst = byHr[byHr.length - 1];
  const slowest = [...g].sort((a, b) => (b.medianDays as number) - (a.medianDays as number))[0];
  return (
    <>
      <b>{catName(best)}</b> pay the most per hour ({perHr(best.perHour)}){slowest.key === best.key ? <> but take longest to sell ({Math.round(slowest.medianDays as number)} days)</> : null}.{' '}
      <b>{catName(worst)}</b> pay the least ({perHr(worst.perHour)}).
      {slowest.key !== best.key && <> <b>{catName(slowest)}</b> sit longest, a median {Math.round(slowest.medianDays as number)} days to sell.</>}
      {' '}Every figure counts what you spent on an item, sold or not.
    </>
  );
}

// ---------------------------------------------------------------
function Kpis({ s, rows, goItems }: { s: Stat; rows: Row[]; goItems: Props['goItems'] }) {
  const curve = useMemo(() => cashCurve(rows), [rows]);
  const since = useMemo(() => inTheBlackSince(curve), [curve]);
  const stale = rows.filter((r) => r.status === 'listed' && (r.daysListed ?? 0) >= 90).length;
  return (
    <div className="kpis">
      <div className="kpi kpi-wide">
        <div className="kpi-label">Net profit</div>
        <div className="kpi-main">
          <div className="kpi-value">{usd0(s.net)}</div>
          <Sparkline points={curve.map((p) => ({ x: p.day, y: p.value }))} width={150} height={46} />
        </div>
        <div className="kpi-sub">
          {usd0(s.revenue)} sales {'−'} {usd0(s.cost)} goods {'−'} {usd0(s.feesShip)} fees &amp; shipping
        </div>
        <div className="kpi-sub kpi-note">{since !== null && curve[0].value < 0 ? <>Cumulative cash in the black since {monthYearFromDay(since)}</> : <>Cumulative cash shown above</>}</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Profit per hour</div>
        <div className="kpi-value">{perHr1(s.perHour)}</div>
        <div className="kpi-sub">over {hrs0(s.hours)} of cleaning and repair</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Median days to sell</div>
        <div className="kpi-value">{s.medianDays === null ? '—' : Math.round(s.medianDays)}<span className="kpi-unit"> days</span></div>
        <div className="kpi-sub">from listing to sale, {num(s.sold)} items</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Sold</div>
        <div className="kpi-value">{pct0(s.soldShare * 100)}</div>
        <div className="kpi-sub">{num(s.sold)} of {num(s.n)} · {s.listed} listed · {s.retired} kept or written off</div>
      </div>
      <button type="button" className="kpi kpi-btn" onClick={() => goItems({ statuses: ['listed'], preset: null })}>
        <div className="kpi-label kpi-label-row">On the shelf now <span className="kpi-go">View →</span></div>
        <div className="kpi-value">{s.listed}<span className="kpi-unit"> items</span></div>
        <div className="kpi-sub">{usd0(s.shelfCost)} of stock · {stale} listed 90+ days</div>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------
function Analysis({ rows, all, goItems, open }: { rows: Row[]; all: Stat; goItems: Props['goItems']; open: Props['open'] }) {
  const [by, setBy] = useState<GroupKey>('category');
  const [picked, setPicked] = useState<Partial<Record<GroupKey, string>>>({});
  const [hover, setHover] = useState<string | null>(null);

  const groups = useMemo(() => groupStats(rows, by), [rows, by]);
  const colorOf = (g: Stat, i: number) => (by === 'category' ? CAT_COLOR[g.key as Cat] : g.key === 'Never listed' ? '#c9c1ae' : SEQ_COLORS[i % SEQ_COLORS.length]);
  const colored = groups.map((g, i) => ({ stat: g, color: colorOf(g, i) }));

  // default focus: the weakest group per hour (min 20 items), which is the one Gus is wondering about
  const fallback = useMemo(() => {
    const cand = groups.filter((g) => g.n >= 20 && g.perHour !== null && g.key !== 'Never listed');
    return cand.sort((a, b) => (a.perHour as number) - (b.perHour as number))[0]?.key ?? groups[0]?.key ?? null;
  }, [groups]);
  const selectedKey = picked[by] && groups.some((g) => g.key === picked[by]) ? (picked[by] as string) : fallback;
  const selected = groups.find((g) => g.key === selectedKey) ?? null;
  const maxAbsNet = Math.max(1, ...groups.map((g) => Math.abs(g.net)));

  return (
    <div className="grid-main">
      <div className="col">
        <Card
          title="Profit, hours and days to sell"
          sub="Net profit counts everything you spent on every item in the group, including stock still on the shelf."
          right={<Segmented<GroupKey> label="Group by" value={by} onChange={setBy} options={(Object.keys(GROUP_LABEL) as GroupKey[]).map((k) => ({ value: k, label: GROUP_LABEL[k] }))} />}
          className="table-card"
        >
          <table className="gt">
            <thead>
              <tr>
                <th>{GROUP_LABEL[by]}</th>
                <th className="r">Items</th>
                <th className="r net-col">Net profit</th>
                <th className="r">Hours</th>
                <th className="r">Per hour</th>
                <th className="r">Days to sell</th>
                <th className="r">Sold</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {colored.map(({ stat: g, color }) => {
                const isSel = g.key === selectedKey;
                return (
                  <tr key={g.key} className={(isSel ? 'sel ' : '') + (hover === g.key ? 'hov' : '') + (g.key === 'Never listed' ? ' muted' : '')}
                    onClick={() => setPicked((p) => ({ ...p, [by]: g.key }))} onMouseEnter={() => setHover(g.key)} onMouseLeave={() => setHover(null)}>
                    <td className="name"><Swatch color={color} />{g.label}</td>
                    <td className="r num">{num(g.n)}</td>
                    <td className="r net-col">
                      <div className="netcell">
                        <span className="bar-track"><span className={'bar-fill' + (g.net < 0 ? ' neg' : '')} style={{ width: `${(Math.abs(g.net) / maxAbsNet) * 100}%`, background: g.net < 0 ? undefined : color }} /></span>
                        <span className={'num' + (g.net < 0 ? ' neg' : '')}>{usd0(g.net)}</span>
                      </div>
                    </td>
                    <td className="r num">{num(Math.round(g.hours))}</td>
                    <td className={'r num strong' + ((g.perHour ?? 0) < 0 ? ' neg' : '')}>{perHr(g.perHour)}</td>
                    <td className="r num">{g.medianDays === null ? '—' : Math.round(g.medianDays)}</td>
                    <td className="r num">{pct0(g.soldShare * 100)}</td>
                    <td className="r go">
                      <button type="button" className="icon-btn" aria-label={`See ${g.label} items`} title="See these items"
                        onClick={(e) => { e.stopPropagation(); goItems(groupFilter(by, g.key)); }}>→</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="name">All items</td>
                <td className="r num">{num(all.n)}</td>
                <td className="r net-col"><span className="num">{usd0(all.net)}</span></td>
                <td className="r num">{num(Math.round(all.hours))}</td>
                <td className="r num strong">{perHr(all.perHour)}</td>
                <td className="r num">{all.medianDays === null ? '—' : Math.round(all.medianDays)}</td>
                <td className="r num">{pct0(all.soldShare * 100)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </Card>
        <Matrix rows={rows} goItems={goItems} />
      </div>
      <div className="col">
        <Card title="How the groups compare" sub="Higher is better per hour, further left sells faster, bigger bubble earns more in total." className="bubble-card">
          <BubbleChart data={colored} selectedKey={selectedKey} onSelect={(k) => setPicked((p) => ({ ...p, [by]: k }))} overall={{ perHour: all.perHour, medianDays: all.medianDays }} />
        </Card>
        {selected && <Inside group={selected} by={by} goItems={goItems} open={open} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
type Metric = 'net' | 'perHour' | 'days' | 'items';
function Matrix({ rows, goItems }: { rows: Row[]; goItems: Props['goItems'] }) {
  const [metric, setMetric] = useState<Metric>('perHour');
  const cells = useMemo(() => {
    const out: Record<string, Stat> = {};
    for (const c of CAT_ORDER) {
      const rc = rows.filter((r) => r.category === c);
      for (const p of PLATFORMS) out[`${c}|${p}`] = stat(rc.filter((r) => r.platform === p), `${c}|${p}`);
      out[`${c}|all`] = stat(rc);
    }
    for (const p of PLATFORMS) out[`all|${p}`] = stat(rows.filter((r) => r.platform === p));
    out['all|all'] = stat(rows);
    return out;
  }, [rows]);

  const val = (s: Stat): number | null => (metric === 'net' ? s.net : metric === 'perHour' ? s.perHour : metric === 'days' ? s.medianDays : s.n);
  const fmt = (s: Stat) => {
    const v = val(s);
    if (v === null) return '—';
    return metric === 'net' ? usd0(v) : metric === 'perHour' ? perHr(v) : metric === 'days' ? `${Math.round(v)} d` : num(v);
  };
  const solid = CAT_ORDER.flatMap((c) => PLATFORMS.map((p) => cells[`${c}|${p}`])).filter((s) => s.sold >= 6);
  const maxV = Math.max(1, ...solid.map((s) => Math.abs(val(s) ?? 0)));
  const shade = (s: Stat, interactive: boolean) => {
    const v = val(s);
    if (v === null || !interactive) return {};
    const a = (s.sold < 6 ? 0.05 : 0.07) + (s.sold < 6 ? 0.08 : 0.36) * Math.min(1, Math.abs(v) / maxV);
    const bg = v < 0 ? `rgba(178, 58, 34, ${a})` : `rgba(35, 63, 92, ${a})`;
    return { background: bg } as React.CSSProperties;
  };

  return (
    <Card
      title="Category by platform"
      sub={metric === 'days' ? 'Darker means slower. Dashed cells have fewer than 6 sold items.' : 'Darker means more. Dashed cells have fewer than 6 sold items. Click a cell to see its items.'}
      right={<Segmented<Metric> label="Metric" value={metric} onChange={setMetric}
        options={[{ value: 'perHour', label: 'Per hour' }, { value: 'net', label: 'Net profit' }, { value: 'days', label: 'Days to sell' }, { value: 'items', label: 'Items' }]} />}
    >
      <div className="matrix" role="table" aria-label="Category by platform">
        <div className="mx-head" role="row">
          <span />
          {PLATFORMS.map((p) => <span key={p} role="columnheader">{p}</span>)}
          <span role="columnheader" className="mx-all">All platforms</span>
        </div>
        {CAT_ORDER.map((c) => (
          <div className="mx-row" role="row" key={c}>
            <span className="mx-label" role="rowheader"><Swatch color={CAT_COLOR[c]} />{CAT_LABEL[c]}</span>
            {PLATFORMS.map((p) => {
              const s = cells[`${c}|${p}`];
              const thin = s.sold < 6;
              return (
                <button type="button" key={p} role="cell" className={'mx-cell' + (thin ? ' thin' : '')} style={shade(s, true)}
                  onClick={() => goItems({ cats: [c], platforms: [p] })} title={`${CAT_LABEL[c]} on ${p}: ${s.n} items, ${s.sold} sold`}>
                  <b>{fmt(s)}</b>
                  <small>{s.sold} sold</small>
                </button>
              );
            })}
            <span className="mx-cell mx-total" role="cell"><b>{fmt(cells[`${c}|all`])}</b><small>{cells[`${c}|all`].sold} sold</small></span>
          </div>
        ))}
        <div className="mx-row mx-foot" role="row">
          <span className="mx-label" role="rowheader">All categories</span>
          {PLATFORMS.map((p) => <span key={p} className="mx-cell mx-total" role="cell"><b>{fmt(cells[`all|${p}`])}</b><small>{cells[`all|${p}`].sold} sold</small></span>)}
          <span className="mx-cell mx-total" role="cell"><b>{fmt(cells['all|all'])}</b><small>{cells['all|all'].sold} sold</small></span>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------
function Inside({ group, by, goItems }: { group: Stat; by: GroupKey; goItems: Props['goItems']; open: Props['open'] }) {
  const models = useMemo(() => modelStats(group.rows, 3).filter((m) => m.perHour !== null), [group]);
  const sorted = [...models].sort((a, b) => (b.perHour as number) - (a.perHour as number));
  const k = Math.min(4, Math.floor(sorted.length / 2));
  const best = sorted.slice(0, k);
  const worst = sorted.slice(sorted.length - k).reverse();
  const maxAbs = Math.max(1, ...[...best, ...worst].map((m) => Math.abs(m.perHour as number)));
  const ModelRow = ({ m, tone }: { m: (typeof models)[number]; tone: 'good' | 'bad' }) => (
    <button type="button" className="mrow" onClick={() => goItems({ q: m.title, statuses: [], cats: [] })} title="See these items">
      <span className="mrow-name"><Swatch color={CAT_COLOR[m.category]} />{m.title}</span>
      <span className="mrow-n">{m.n}×</span>
      <span className="mrow-bar"><span className={tone} style={{ width: `${(Math.abs(m.perHour as number) / maxAbs) * 100}%` }} /></span>
      <span className={'mrow-v' + ((m.perHour as number) < 0 ? ' neg' : '')}>{perHr(m.perHour)}</span>
      <span className="mrow-net">{signed0(m.net)}</span>
    </button>
  );
  return (
    <Card
      title={<>Inside {group.label.replace(/ \(.*\)$/, '')}</>}
      sub={`Models bought 3 or more times in this ${GROUP_LABEL[by].toLowerCase()}, ranked by profit per hour.`}
      className="inside-card"
    >
      {k < 2 ? (
        <p className="empty">Not enough repeat models in this group to rank. Try a bigger group.</p>
      ) : (
        <div className="inside">
          <div className="mgroup"><h3 className="tone-good">Worth hunting for</h3>{best.map((m) => <ModelRow key={m.key} m={m} tone="good" />)}</div>
          <div className="mgroup"><h3 className="tone-bad">First to stop buying</h3>{worst.map((m) => <ModelRow key={m.key} m={m} tone="bad" />)}</div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------
function Outliers({ rows, goItems, open }: { rows: Row[]; goItems: Props['goItems']; open: Props['open'] }) {
  const sold = rows.filter((r) => r.status === 'sold');
  const slowest = [...sold].sort((a, b) => (b.daysListed as number) - (a.daysListed as number)).slice(0, 4);
  const losses = [...sold].sort((a, b) => a.net - b.net).slice(0, 4);
  const wins = [...sold].sort((a, b) => b.net - a.net).slice(0, 4);
  const shelf = rows.filter((r) => r.status === 'listed').sort((a, b) => (b.daysListed as number) - (a.daysListed as number)).slice(0, 4);

  const List = ({ title, sub, items, preset, meta, value }: { title: string; sub: string; items: Row[]; preset: Preset; meta: (r: Row) => string; value: (r: Row) => React.ReactNode }) => (
    <Card title={title} sub={sub} right={<button type="button" className="link" onClick={() => goItems({ preset })}>See all →</button>} className="out-card">
      <ul className="olist">
        {items.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => open(r.id)}>
              <span className="o-main"><b><Swatch color={CAT_COLOR[r.category]} />{r.title}</b><small>{meta(r)}</small></span>
              <span className="o-val">{value(r)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );

  return (
    <div className="outliers">
      <h2 className="section-h">Outliers worth a look</h2>
      <div className="out-grid">
        <List title="Sat the longest" sub="Sold, by days from listing to sale" items={slowest} preset="slow"
          meta={(r) => (r.cuts?.length ? `${usd0(r.listPrice as number)} → ${usd0(r.salePrice as number)} after ${plural(r.cuts.length, 'cut')}` : `asking ${usd0(r.listPrice as number)}, never cut`)} value={(r) => days(r.daysListed)} />
        <List title="Lost money" sub="Sold for less than they cost to get and ship" items={losses} preset="loss"
          meta={(r) => `sold ${usd0(r.revenue)}, cost ${usd0(r.cost)}, fees & shipping ${usd0(r.feesShip)}`} value={(r) => <span className="neg">{signed0(r.net)}</span>} />
        <List title="Biggest wins" sub="Sold, by net profit" items={wins} preset="top"
          meta={(r) => `bought ${usd0(r.purchase)}, sold ${usd0(r.revenue)} in ${r.daysListed} d`} value={(r) => signed0(r.net)} />
        <List title="Oldest on the shelf" sub="Still listed, by days since listing" items={shelf} preset="stale"
          meta={(r) => `asking ${usd0(r.lastPrice as number)}, cost ${usd0(r.cost)}, ${r.cuts?.length ? plural(r.cuts.length, 'cut') : 'never cut'}`} value={(r) => days(r.daysListed)} />
      </div>
    </div>
  );
}
