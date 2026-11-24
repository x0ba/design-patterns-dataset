import { useEffect, useMemo, useState } from 'react';
import { DATASETS, WEEKS } from '../data/course';
import { Route, navigate, nowMs, useStore } from '../store';
import { Icon } from '../components/Icon';
import { LivesIn } from '../components/Shell';
import { LineChart } from '../components/charts';
import { CORE_IDS, buildCsv, columnsFor, dailyRows, monthlySeries, monthsFor, rowToCells, versionMonthCount } from '../data/bike';

export function DatasetsPage() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const list = DATASETS.filter((d) => !q || `${d.name} ${d.summary} ${d.usedIn?.join(' ')}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="page-wide">
      <h1 className="page-title">Datasets</h1>
      <p className="lede">{DATASETS.length} datasets, each filed under the week it was introduced. Some are versioned — problem sets name the exact version to use.</p>
      <div className="toolbar">
        <label className="search-field"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter datasets" /></label>
      </div>
      <div className="card flush">
        <table className="list-table">
          <thead><tr><th>Dataset</th><th>Introduced</th><th>Grain</th><th>Rows</th><th>Versions</th><th>Used in</th></tr></thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id} className={d.id === 'sd-bike-counts' ? 'hl' : ''} onClick={() => navigate(`/datasets/${d.id}`)}>
                <td><b>{d.name}</b><div className="muted small">{d.source}</div></td>
                <td className="nowrap"><a href={`#/weeks/${d.week}`} onClick={(e) => e.stopPropagation()}>Week {d.week}</a>{WEEKS[d.week - 1].missed && <span className="pill warn sm" style={{ marginLeft: 6 }}>missed</span>}</td>
                <td className="small">{d.grain}</td>
                <td className="mono small nowrap">{d.rows}</td>
                <td className="nowrap">{d.versions ? <><b>{d.versions.length}</b> <span className="pill warn sm">PS4 → v{d.requiredVersion}</span></> : <span className="muted">1</span>}</td>
                <td className="small">{d.usedIn?.join(', ') || <span className="muted">—</span>}{!state.opened[d.id] && WEEKS[d.week - 1].status !== 'future' && <span className="pill new sm" style={{ marginLeft: 6 }}>new to you</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SNIPPETS = {
  Python: (v: number) => `import pandas as pd\n\nbikes = pd.read_csv("viz120-data/sd-bike-counts/v${v}/sd_bike_counts_v${v}.csv",\n                    parse_dates=["date"])\ncore = ["HBR-01", "UNV-02", "30T-03", "PBB-04"]\nmonthly = (bikes[bikes.counter_id.isin(core)]\n           .groupby(["counter_id", pd.Grouper(key="date", freq="MS")])["count"]\n           .sum(min_count=1))   # keeps the 2021 outage as NaN`,
  R: (v: number) => `library(tidyverse)\n\nbikes <- read_csv("viz120-data/sd-bike-counts/v${v}/sd_bike_counts_v${v}.csv")\nmonthly <- bikes |>\n  filter(counter_id %in% c("HBR-01", "UNV-02", "30T-03", "PBB-04")) |>\n  mutate(month = floor_date(date, "month")) |>\n  group_by(counter_id, month) |>\n  summarise(count = if (all(is.na(count))) NA else sum(count, na.rm = TRUE))`,
  'Vega-Lite': (v: number) => `{\n  "data": {"url": "viz120-data/sd-bike-counts/v${v}/sd_bike_counts_v${v}.csv"},\n  "transform": [{"filter": {"field": "counter_id",\n    "oneOf": ["HBR-01", "UNV-02", "30T-03", "PBB-04"]}}],\n  "mark": "line",\n  "encoding": {\n    "x": {"timeUnit": "yearmonth", "field": "date"},\n    "y": {"aggregate": "sum", "field": "count"},\n    "color": {"field": "location"}\n  }\n}`,
};

export function DatasetPage({ id, route }: { id: string; route: Route }) {
  const d = DATASETS.find((x) => x.id === id);
  const { markOpened } = useStore();
  useEffect(() => {
    if (d) markOpened(d.id);
  }, [d, markOpened]);
  if (!d) return <div className="empty-page">Dataset not found.</div>;
  if (d.versions) return <VersionedDataset route={route} />;
  return (
    <div className="page-narrow">
      <div className="crumbs"><a href="#/datasets">Datasets</a><span>›</span><span>{d.name}</span></div>
      <h1 className="page-title">{d.name}</h1>
      <div className="meta-row"><LivesIn week={d.week} kind="Datasets" /><span className="meta muted">{d.source}</span><span className="meta muted">{d.license}</span></div>
      <p className="lede">{d.summary}</p>
      <div className="card">
        <h2 className="sec-title">Columns</h2>
        <Schema cols={d.columns} />
        <div className="muted small" style={{ marginTop: 10 }}>{d.rows} rows · {d.grain} · {d.format}. Path: <code>viz120-data/{d.id}/{d.id.replace(/-/g, '_')}.csv</code></div>
      </div>
    </div>
  );
}

function Schema({ cols }: { cols: { name: string; type: string; desc: string }[] }) {
  return (
    <table className="schema">
      <tbody>
        {cols.map((c) => (
          <tr key={c.name}><td><code>{c.name}</code></td><td className="muted small">{c.type}</td><td className="small">{c.desc}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function VersionedDataset({ route }: { route: Route }) {
  const d = DATASETS.find((x) => x.id === 'sd-bike-counts')!;
  const versions = d.versions!;
  const { state, update, markOpened, toast } = useStore();
  const qv = Number(route.query.get('v'));
  const v = qv >= 1 && qv <= 6 ? qv : 6;
  const ver = versions[v - 1];
  const [lang, setLang] = useState<keyof typeof SNIPPETS>('Python');
  useEffect(() => markOpened(`sd-bike-counts@${v}`), [v, markOpened]);

  const months = useMemo(() => monthsFor(versionMonthCount(v)), [v]);
  const series = useMemo(() => monthlySeries(v, CORE_IDS), [v]);
  const preview = useMemo(() => {
    // start the preview on the University Ave outage so the empty values are visible
    const all = dailyRows(v, { counters: ['HBR-01', 'UNV-02'] });
    const start = all.findIndex((r) => r.date === '2021-02-27');
    return all.slice(start, start + 12);
  }, [v]);
  const cols = columnsFor(v);
  const draftV = state.draft.version;

  const download = () => {
    const csv = buildCsv(v);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sd_bike_counts_v${v}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`Downloaded sd_bike_counts_v${v}.csv`);
  };

  return (
    <div className="page-grid">
      <div className="page-main">
        <div className="crumbs"><a href="#/datasets">Datasets</a><span>›</span><span>San Diego bike counts</span><span>›</span><span>v{v}</span></div>
        <h1 className="page-title">{d.name}</h1>
        <div className="meta-row"><LivesIn week={5} kind="Datasets" /><span className="meta muted">{d.source}</span><span className="meta muted">{d.license}</span></div>
        <p className="lede">{d.summary}</p>

        {v === 3 ? (
          <div className="callout ok">
            <div className="callout-icon"><Icon name="check" size={18} /></div>
            <div className="callout-body"><b>This is the PS4 version.</b> v3 is frozen for the problem set and won’t change. {draftV !== 3 ? <>Your draft is still on v{draftV}.</> : <>Your draft uses it.</>}</div>
          </div>
        ) : (
          <div className="callout warn">
            <div className="callout-icon"><Icon name="alert" size={18} /></div>
            <div className="callout-body">
              <b>You’re looking at v{v}{v === 6 ? ' (latest)' : ''}. PS4 uses v3.</b> {ver.warning}
              <div className="callout-actions"><a className="btn primary sm" href="#/datasets/sd-bike-counts?v=3">Switch to v3</a></div>
            </div>
          </div>
        )}

        <div className="versions">
          {versions.map((x) => (
            <a key={x.v} href={`#/datasets/sd-bike-counts?v=${x.v}`} className={'ver' + (x.v === v ? ' on' : '') + (x.v === 3 ? ' req' : '')}>
              <div className="ver-top">
                <span className="ver-n">v{x.v}</span>
                {x.v === 3 && <span className="pill ok sm">PS4</span>}
                {x.v === 6 && <span className="pill sm">latest</span>}
                {x.v === draftV && <span className="pill bad sm" title="The version your PS4 draft currently uses">your draft</span>}
              </div>
              <div className="ver-date">{x.date}</div>
              <div className="ver-range muted small">{x.range}</div>
            </a>
          ))}
        </div>

        <div className="card">
          <div className="ver-detail-head">
            <h2 className="sec-title">Version {v} · {ver.date} · {ver.author}</h2>
            <div className="stats">
              <span><b>{ver.rows}</b> rows</span><span><b>{ver.size}</b></span><span><b>{ver.counters}</b> counters</span><span>{ver.range}</span>
            </div>
          </div>
          <ul className="changes">{ver.changes.map((c) => <li key={c} dangerouslySetInnerHTML={{ __html: c.replace(/`([^`]+)`/g, '<code>$1</code>') }} />)}</ul>
          {ver.warning && v !== 6 && <div className="inline-warn"><Icon name="alert" /> {ver.warning}</div>}
        </div>

        <div className="card">
          <h2 className="sec-title">Monthly totals, four PS4 counters <span className="muted small">computed from v{v}</span></h2>
          <LineChart series={series} months={months} width={740} height={250} markGap />
          <div className="muted small">{v >= 5 ? 'Imputed values fill the University Ave outage in this version — the line is continuous through spring 2021.' : v === 1 ? 'Note the Harbor Dr spike in June 2021 — duplicated rows, fixed in v2.' : 'Hatched band: University Ave counter offline, Mar–May 2021. These rows have an empty count.'}</div>
        </div>

        <div className="card flush">
          <div className="card-pad"><h2 className="sec-title">Preview <span className="muted small">12 rows from late Feb 2021, around the outage{v >= 4 ? ' · 08:00 hourly slice' : ''}</span></h2></div>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>{rowToCells(r, v, 8).map((c, j) => <td key={j} className={c === '' ? 'nullcell' : ''}>{c === '' ? 'NA' : c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="sec-title">Columns <span className="muted small">v{v}</span></h2>
          <Schema cols={cols.map((c) => {
            const base = d.columns.find((x) => x.name === c || (c === 'bike_count' && x.name === 'count') || (c === 'location_name' && x.name === 'location'));
            if (base) return { ...base, name: c };
            if (c === 'hour') return { name: c, type: 'integer', desc: 'Hour of day, 0–23' };
            return { name: c, type: 'boolean', desc: 'True when the value was imputed' };
          })} />
        </div>
      </div>

      <aside className="rail">
        <div className="card rail-card">
          <div className="rail-head"><Icon name="download" /> Get v{v}</div>
          <button className="btn primary block" onClick={download}><Icon name="download" /> Download CSV · {ver.size}</button>
          {draftV !== v ? (
            <button className="btn block" onClick={() => { update((s) => ({ ...s, draft: { ...s.draft, version: v, savedAt: new Date(nowMs()).toISOString() } })); toast(`PS4 draft now uses v${v}`); }}>
              <Icon name="bookmark" /> Use v{v} in my PS4 draft
            </button>
          ) : (
            <div className="pill ok"><Icon name="check" /> Your PS4 draft uses v{v}</div>
          )}
          {v !== 3 && draftV !== 3 && <div className="muted small">Your draft is on v{draftV}. For PS4, open v3 and use that one.</div>}
        </div>
        <div className="card rail-card">
          <div className="rail-head">Load it</div>
          <div className="seg small">
            {(Object.keys(SNIPPETS) as (keyof typeof SNIPPETS)[]).map((k) => <button key={k} className={lang === k ? 'on' : ''} onClick={() => setLang(k)}>{k}</button>)}
          </div>
          <pre className="code">{SNIPPETS[lang](v)}</pre>
          <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(SNIPPETS[lang](v)); toast('Snippet copied'); }}><Icon name="copy" /> Copy</button>
        </div>
        {v !== 3 && (
          <div className="card rail-card">
            <div className="rail-head">How v{v} differs from v3</div>
            <ul className="diff">
              {v < 3 && <li className="minus">Ends Dec 2023 — missing 21 months PS4 needs</li>}
              {v === 1 && <li className="minus">Harbor Dr June 2021 doubled (duplicate rows)</li>}
              {v >= 4 && <li className="plus">Hourly rows (24× the size)</li>}
              {v >= 5 && <li className="minus">University Ave outage imputed — PS4 asks you to show it as missing</li>}
              {v >= 5 && <li className="minus">Columns renamed (<code>count</code> → <code>bike_count</code>)</li>}
              {v === 6 && <li className="plus">4 extra counters from 2025; October 2025 added</li>}
            </ul>
          </div>
        )}
        <div className="card rail-card">
          <div className="rail-head">Discussed in</div>
          <ul className="file-list">
            <li><Icon name="video" /><a href="#/lecture/5?t=3485">Lecture 5 · 58:05 PS4 walkthrough</a></li>
            <li><Icon name="slides" /><a href="#/slides/b?s=2">Walkthrough slide 3 — “v3 only”</a></li>
            <li><Icon name="clipboard" /><a href="#/ps/4">PS4 brief, Task 1</a></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
