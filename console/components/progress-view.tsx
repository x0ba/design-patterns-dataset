import Link from 'next/link';
import { notFound } from 'next/navigation';
import { batchList, batchSummary, type BatchRef, type BatchSummary } from '@/lib/data';
import { band, BAND_LABEL, codebookHref, enc, fmt, pct, plural } from '@/lib/format';
import { listProposals } from '../../src/pipeline/proposals.ts';
import { StateMark } from './marks';
import { BandKey, Score } from './score';
import { SitesTable } from './sites-table';
import { SpecimenStrip } from './specimen-strip';
import { Stats, type StatProps } from './stats';

export function ProgressView({ batch }: { batch?: string }) {
  const batches = batchList();
  if (!batches.length) {
    return (
      <div className="empty-state">
        <h1>No Batches Yet</h1>
        <p>Label a list of sites to start one. Progress shows up here as raters work.</p>
        <pre><code>node scripts/label.ts --batch batch-001</code></pre>
      </div>
    );
  }
  const name = batch ?? batches[0].name;
  const b = batchSummary(name);
  if (!b) notFound();
  const total = b.sites.length;
  const done = b.counts.labeled + b.counts.flagged;
  const inProgress = b.counts.capturing + b.counts.labeling;
  const scored = b.sites.filter((s) => s.agreement);
  const meanAgreement = scored.length ? scored.reduce((a, s) => a + s.agreement!.score, 0) / scored.length : null;
  const disagreeing = scored.filter((s) => s.agreement!.disagreements).length;
  const statusAlpha = b.irr?.fields.find((f) => f.field === 'pattern.status' || f.label === 'Pattern status')?.alpha ?? null;
  const attention = b.counts.flagged + b.counts.failed;
  const openProposals = listProposals().filter((p) => p.batch === b.batch && p.proposal.status === 'open').length;

  const stats: StatProps[] = [
    {
      label: 'Labeled',
      value: <>{done}<span className="stat-of">/{total}</span></>,
      sub: `${pct(done, total)}${inProgress ? `, ${inProgress} in progress` : ''}${b.counts.queued ? `, ${b.counts.queued} queued` : ''}`,
    },
    {
      label: 'Mean agreement',
      value: fmt(meanAgreement),
      sub: scored.length ? `${BAND_LABEL[band(meanAgreement)!]}, over ${plural(scored.length, 'site')}` : 'Needs two raters on a site',
      band: band(meanAgreement),
    },
    {
      label: 'Pattern-status α',
      value: fmt(statusAlpha, 3),
      sub: statusAlpha !== null ? BAND_LABEL[band(statusAlpha)!] : b.irr ? 'No variation to measure' : 'Run irr.ts',
      band: band(statusAlpha),
    },
    {
      label: 'Sites with disagreements',
      value: <>{disagreeing}<span className="stat-of">/{scored.length}</span></>,
      sub: scored.length ? `${pct(disagreeing, scored.length)} of compared sites` : 'None compared yet',
      href: disagreeing ? `/batch/${enc(b.batch)}?disagree=1` : undefined,
    },
    {
      label: 'Needs attention',
      value: attention,
      sub: attention ? [b.counts.flagged ? `${b.counts.flagged} flagged` : '', b.counts.failed ? `${b.counts.failed} failed` : ''].filter(Boolean).join(', ') : 'Nothing flagged or failed',
      band: attention ? 'warn' : undefined,
    },
    {
      label: 'Open proposals',
      value: openProposals,
      sub: openProposals ? 'Waiting for review' : 'None waiting',
      href: openProposals ? '/proposals' : undefined,
    },
  ];

  const legend: [string, string, number][] = [
    ['labeled', 'Labeled', b.counts.labeled],
    ['flagged', 'Flagged', b.counts.flagged],
    ['failed', 'Failed', b.counts.failed],
    ['labeling', 'In progress', inProgress],
    ['queued', 'Queued', b.counts.queued],
  ];

  return (
    <>
      <BatchTabs batches={batches} current={b.batch} />

      <header className="page-head">
        <h1>{b.batch}</h1>
        <dl className="facts">
          <div><dt>Codebook</dt><dd className="mono">{b.info?.codebookVersion ?? 'unknown'}</dd></div>
          <div><dt>Raters</dt><dd className="mono">{b.raters.join(', ') || 'none'}</dd></div>
          {b.info?.createdAt ? <div><dt>Started</dt><dd><time dateTime={b.info.createdAt}>{b.info.createdAt.slice(0, 10)}</time></dd></div> : null}
        </dl>
      </header>

      <Stats items={stats} label="Batch summary" />

      <section className="panel strip-panel" aria-labelledby="strip-h">
        <div className="panel-head">
          <h2 id="strip-h">Sites by State</h2>
          <ul className="legend" aria-label="Sites by state">
            {legend.map(([st, label, n]) => (
              <li key={st} data-zero={n === 0 || undefined}><StateMark state={st}>{label}</StateMark> <span className="num">{n}</span></li>
            ))}
          </ul>
        </div>
        <SpecimenStrip batch={b.batch} sites={b.sites.map((s) => ({ slug: s.slug, state: s.state, title: s.app ? `${s.app.name}: ${s.view?.name}` : s.title || s.slug, score: s.agreement?.score ?? null }))} />
      </section>

      <Reliability b={b} />

      <section className="panel panel-flush" aria-labelledby="sites-h">
        <SitesTable batch={b.batch} raters={b.raters} sites={b.sites} />
      </section>
    </>
  );
}

/** Batches as links, newest first, so switching is one click and every batch's size is visible. */
function BatchTabs({ batches, current }: { batches: BatchRef[]; current: string }) {
  if (batches.length < 2) return null;
  return (
    <nav className="batch-tabs" aria-label="Batches">
      {batches.map((x) => (
        <Link key={x.name} href={`/batch/${enc(x.name)}`} aria-current={x.name === current ? 'page' : undefined}>
          <span className="mono">{x.name}</span>
          <span className="num">{x.sites}</span>
        </Link>
      ))}
    </nav>
  );
}

function Reliability({ b }: { b: BatchSummary }) {
  if (!b.irr) {
    return (
      <section className="panel" aria-labelledby="irr-h">
        <h2 id="irr-h">Inter-Rater Reliability</h2>
        <p className="muted">Not computed yet. Run <code>node scripts/irr.ts --batch {b.batch}</code> once two raters have labeled a site.</p>
      </section>
    );
  }
  // Group fields by where they live in a label, keeping the file's order within each group.
  const groups = new Map<string, typeof b.irr.fields>();
  for (const f of b.irr.fields) groups.set(f.location, [...(groups.get(f.location) ?? []), f]);
  const worst = (b.irr.patternStatusByPattern ?? []).filter((p) => p.alpha !== null).sort((x, y) => x.alpha! - y.alpha!).slice(0, 12);

  return (
    <section className="panel" aria-labelledby="irr-h">
      <div className="panel-head">
        <h2 id="irr-h">Inter-Rater Reliability <span className="h-note">Krippendorff’s α over {plural(b.irr.sitesWithTwoPlusLabels, 'site')}</span></h2>
        <BandKey />
      </div>
      <div className="irr">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr><th>Field</th><th>Metric</th><th className="col-score">α</th><th className="num">Pairwise</th><th className="num">Units</th></tr>
            </thead>
            {[...groups].map(([loc, fields]) => (
              <tbody key={loc}>
                <tr className="row-sub"><th colSpan={5} scope="colgroup">{loc}</th></tr>
                {fields.map((f) => (
                  <tr key={`${f.label}/${f.location}`}>
                    <th scope="row">{f.label}</th>
                    <td className="muted">{f.metric}</td>
                    <td>
                      {f.alpha === null
                        ? <span className="muted" title={f.note}>Not measurable{f.note ? ' *' : ''}</span>
                        : <Score value={f.alpha} digits={3} label={`α for ${f.label}`} banded />}
                    </td>
                    <td className="num">{f.metric === 'interval' ? <span className="muted" title="Exact agreement isn’t meaningful for a continuous value">—</span> : fmt(f.pairwiseAgreement, 2)}</td>
                    <td className="num">{f.units}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        {worst.length ? (
          <div className="irr-worst">
            <h3>Least Reliable Patterns <span className="h-note">status α</span></h3>
            <table className="data data-tight">
              <thead><tr><th>Pattern</th><th className="col-score">α</th><th className="num">Units</th></tr></thead>
              <tbody>
                {worst.map((p) => (
                  <tr key={p.id}>
                    <th scope="row"><Link className="mono" href={codebookHref(p.id)}>{p.id}</Link></th>
                    <td><Score value={p.alpha} digits={2} label={`Status α for ${p.id}`} banded size="sm" /></td>
                    <td className="num">{p.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
