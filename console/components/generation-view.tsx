import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GEN_LABEL, GEN_MARK, GEN_STATES, genBatchList, genSummary, type GenBatchRef, type GenRow, type GenSummary } from '@/lib/generation';
import { enc, pct, siteHref } from '@/lib/format';
import { StateMark } from './marks';
import { Stats, type StatProps } from './stats';
import { Tick } from './tick';

const usd = (x: number) => `$${x.toFixed(2)}`;
const mins = (ms: number) => (ms < 60_000 ? '<1m' : ms < 3_600_000 ? `${Math.round(ms / 60_000)}m` : `${Math.floor(ms / 3_600_000)}h ${Math.round((ms % 3_600_000) / 60_000)}m`);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

export function GenerationView({ batch }: { batch?: string }) {
  const batches = genBatchList();
  if (!batches.length) {
    return (
      <div className="empty-state">
        <h1>No Generated Batches Yet</h1>
        <p>Write briefs for a batch, then generate apps from them. Each app shows up here as it builds.</p>
        <pre><code>node scripts/briefs.ts --batch gen-001 --n 48</code></pre>
      </div>
    );
  }
  const name = batch ?? batches[0].name;
  const g = genSummary(name);
  if (!g) notFound();
  const now = Date.now();
  const total = g.rows.length;
  const finished = g.rows.filter((r) => r.durationMs !== undefined);
  const medianMs = median(finished.map((r) => r.durationMs!));
  const labeled = g.rows.filter((r) => r.labeled).length;

  const stats: StatProps[] = [
    {
      label: 'Built',
      value: <>{g.counts.built}<span className="stat-of">/{total}</span></>,
      sub: `${pct(g.counts.built, total)}${g.counts.queued ? `, ${g.counts.queued} queued` : ''}`,
    },
    {
      label: 'Building',
      value: g.counts.building,
      sub: g.counts.stalled ? `${g.counts.stalled} stalled` : g.counts.building ? 'Sessions writing now' : 'Nothing running',
      band: g.counts.stalled ? 'warn' : undefined,
    },
    {
      label: 'Failed',
      value: g.counts.failed,
      sub: g.counts.failed ? 'Left out of the site list' : 'None failed',
      band: g.counts.failed ? 'warn' : undefined,
    },
    { label: 'Spend', value: usd(g.costUsd), sub: finished.length ? `${usd(g.costUsd / finished.length)} per app` : 'No finished apps yet' },
    { label: 'Median build', value: medianMs === null ? '—' : mins(medianMs), sub: finished.length ? `Over ${finished.length} finished` : 'No finished apps yet' },
    {
      label: 'Labeling',
      value: <>{labeled}<span className="stat-of">/{g.counts.built}</span></>,
      sub: labeled ? 'Started on Progress' : g.sitesFile ? 'Ready to label' : 'Site list written when generation ends',
      href: labeled ? `/batch/${enc(g.batch)}` : undefined,
    },
  ];

  return (
    <>
      {g.counts.building ? <Tick seconds={60} /> : null}
      <GenTabs batches={batches} current={g.batch} />

      <header className="page-head">
        <h1>{g.batch}</h1>
        <dl className="facts">
          <div><dt>Briefs</dt><dd className="mono">briefs/{g.batch}.yaml</dd></div>
          <div><dt>Writer</dt><dd className="mono">{g.file.writer.model}</dd></div>
          <div><dt>Seed</dt><dd className="mono">{g.file.seed}</dd></div>
          <div><dt>Codebook</dt><dd className="mono">{g.file.codebookVersion}</dd></div>
          <div><dt>Written</dt><dd><time dateTime={g.file.createdAt}>{g.file.createdAt.slice(0, 10)}</time></dd></div>
        </dl>
      </header>

      <Stats items={stats} label="Generation summary" />

      <section className="panel strip-panel" aria-labelledby="gen-strip-h">
        <div className="panel-head">
          <h2 id="gen-strip-h">Apps by State</h2>
          <ul className="legend" aria-label="Apps by state">
            {GEN_STATES.map((st) => (
              <li key={st} data-zero={g.counts[st] === 0 || undefined}><StateMark state={GEN_MARK[st]}>{GEN_LABEL[st]}</StateMark> <span className="num">{g.counts[st]}</span></li>
            ))}
          </ul>
        </div>
        <ol className="strip" aria-label="Apps in this batch">
          {g.rows.map((r) => (
            <li key={r.brief.slug}>
              <a className="cell" href={`#app-${r.brief.slug}`} data-state={GEN_MARK[r.state]} title={`${r.brief.product}: ${GEN_LABEL[r.state]}`} aria-label={`${r.brief.product}: ${GEN_LABEL[r.state]}`} />
            </li>
          ))}
        </ol>
      </section>

      <section className="panel panel-flush" aria-labelledby="gen-apps-h">
        <div className="panel-head panel-head-pad">
          <h2 id="gen-apps-h">Apps</h2>
          {g.counts.stalled ? <span className="muted">Stalled: no session activity for {g.stalledAfterMin}+ minutes. The run stopped, or is paused at a usage limit.</span> : null}
        </div>
        <div className="table-scroll">
          <table className="data gen-table">
            <thead>
              <tr>
                <th>Preview</th><th>App</th><th>State</th><th>Domain · Function</th><th>Generator</th>
                <th className="num">Time</th><th className="num">Cost</th><th className="num">Turns</th><th className="num">Repairs</th><th>Stack</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => <GenTableRow key={r.brief.slug} g={g} r={r} now={now} />)}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function GenTableRow({ g, r, now }: { g: GenSummary; r: GenRow; now: number }) {
  const b = r.brief;
  const elapsed = r.durationMs ?? (r.state === 'building' || r.state === 'stalled'
    ? (r.lastActivity ? now - Date.parse(r.lastActivity) : undefined)
    : undefined);
  return (
    <tr id={`app-${b.slug}`} className="gen-row" data-state={r.state}>
      <td className="gen-thumb-cell">
        {r.preview
          ? <a className="gen-thumb" href={r.preview} target="_blank" rel="noreferrer"><img src={r.preview} alt={`First viewport of ${b.product}`} width={96} height={60} loading="lazy" /></a>
          : r.state === 'queued' ? null : <span className="gen-thumb gen-thumb-empty" aria-hidden="true" />}
      </td>
      <th scope="row">
        <div className="gen-app">
        <span className="gen-product">
          {r.labeled ? <Link href={siteHref(g.batch, b.slug)}>{b.product}</Link> : b.product}
        </span>
        <span className="mono muted gen-slug">{b.slug}</span>
        {r.error ? <span className="gen-error" title={r.error}>{r.error.split('\n')[0]}</span> : null}
        </div>
      </th>
      <td>
        <StateMark state={GEN_MARK[r.state]}>{GEN_LABEL[r.state]}</StateMark>
        {r.state === 'building' || r.state === 'stalled'
          ? <span className="muted gen-sub">{elapsed !== undefined ? `last write ${mins(elapsed)} ago` : ''}</span>
          : null}
      </td>
      <td><span className="mono">{b.domain}</span><span className="muted"> · </span><Link className="mono" href={`/codebook/${enc(b.archetype)}`}>{b.archetype}</Link></td>
      <td className="mono">{b.generator}</td>
      <td className="num">{r.durationMs !== undefined ? mins(r.durationMs) : <span className="muted">—</span>}</td>
      <td className="num">{r.costUsd !== undefined ? usd(r.costUsd) : <span className="muted">—</span>}</td>
      <td className="num">{r.turns ?? <span className="muted">—</span>}</td>
      <td className="num">{r.repairs ?? <span className="muted">—</span>}</td>
      <td className="mono muted">{r.stack ?? '—'}</td>
    </tr>
  );
}

function GenTabs({ batches, current }: { batches: GenBatchRef[]; current: string }) {
  if (batches.length < 2) return null;
  return (
    <nav className="batch-tabs" aria-label="Generated batches">
      {batches.map((x) => (
        <Link key={x.name} href={`/generate/${enc(x.name)}`} aria-current={x.name === current ? 'page' : undefined}>
          <span className="mono">{x.name}</span>
          <span className="num">{x.built}/{x.briefs}</span>
        </Link>
      ))}
    </nav>
  );
}
