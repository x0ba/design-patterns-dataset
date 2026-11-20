import type { Metadata } from 'next';
import Link from 'next/link';
import { Crop } from '@/components/crop';
import { ReviewButtons, StatusFilter } from '@/components/proposal-review';
import { siteShot } from '@/lib/data';
import { codebookHref, plural, siteHref } from '@/lib/format';
import { listProposals, type ProposalRecord } from '../../../src/pipeline/proposals.ts';

export const metadata: Metadata = { title: 'Proposals' };

const STATUSES = ['open', 'accepted', 'rejected', 'all'] as const;

export default async function ProposalsPage({ searchParams }: PageProps<'/proposals'>) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as any) ? (sp.status as (typeof STATUSES)[number]) : 'open';
  const all = listProposals();
  const counts = Object.fromEntries(STATUSES.map((s) => [s, s === 'all' ? all.length : all.filter((r) => r.proposal.status === s).length]));
  const rows = all.filter((r) => status === 'all' || r.proposal.status === status);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Proposals</h1>
          <p className="muted small measure">Raters file these during batches. The codebook only changes when you accept one here, between batches.</p>
        </div>
        <StatusFilter value={status} counts={counts} />
      </div>
      {rows.length ? (
        <>
          <section className="panel panel-flush" aria-labelledby="index-h">
            <h2 id="index-h" className="sr-only">Index</h2>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr><th>Proposal</th><th>Kind</th><th>Name</th><th>Batch</th><th className="num">Filings</th><th className="num">Sites</th><th className="num">Values</th>{status !== 'open' ? <th>Status</th> : null}</tr>
                </thead>
                <tbody>
                  {rows.map(({ batch, proposal: p }) => (
                    <tr key={`${batch}/${p.id}`}>
                      <th scope="row"><a className="mono row-title" href={`#p-${batch}-${p.id}`}>{p.id}</a></th>
                      <td><span className="chip">{p.kind}</span></td>
                      <td className="cell-wrap">{p.kind === 'new-entry' ? <>{p.name} <span className="muted">{p.level}{p.parent ? ` in ${p.parent}` : ''}</span></> : <span className="muted">values for <span className="mono">{p.id}</span></span>}</td>
                      <td className="mono muted">{batch}</td>
                      <td className="num">{p.rationale.length}</td>
                      <td className="num">{p.sources.length}</td>
                      <td className="num">{p.dimensions.flatMap((d) => d.subdimensions).reduce((a, x) => a + x.values.length, 0)}</td>
                      {status !== 'open' ? <td><span className="prop-status" data-status={p.status}>{p.status}</span></td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <ul className="proposals">
            {rows.map((r) => <li key={`${r.batch}/${r.proposal.id}`}><ProposalCard r={r} /></li>)}
          </ul>
        </>
      ) : (
        <div className="empty-state">
          <h2>No {status === 'all' ? '' : `${status[0].toUpperCase()}${status.slice(1)} `}Proposals</h2>
          <p>{status === 'open' ? 'Nothing is waiting for review. Raters file proposals when a site shows something the codebook can’t describe.' : <Link href="/proposals?status=all">Show all proposals</Link>}</p>
        </div>
      )}
    </>
  );
}

function ProposalCard({ r: { batch, proposal: p } }: { r: ProposalRecord }) {
  const crops = p.evidence.filter((e) => e.bbox).map((e) => ({ e, shot: siteShot(batch, e.site) })).filter((c) => c.shot.screenshot || c.shot.lfs).slice(0, 4);
  const subs = p.dimensions.flatMap((d) => d.subdimensions);
  return (
    <article className="panel prop" id={`p-${batch}-${p.id}`} data-status={p.status} aria-labelledby={`p-${batch}-${p.id}-h`}>
      <div className="prop-head">
        <div className="prop-title">
          <h2 id={`p-${batch}-${p.id}-h`} className="prop-id mono">{p.id}</h2>
          <span className="chip">{p.kind}</span>
          <span className="small muted"><span className="mono">{batch}</span> · codebook <span className="mono">{p.codebookVersion}</span> · {plural(p.rationale.length, 'filing')} · {plural(p.sources.length, 'site')}</span>
        </div>
        {p.status === 'open' ? (
          <ReviewButtons batch={batch} id={p.id} />
        ) : (
          <p className="small prop-review">
            <span className="prop-status" data-status={p.status}>{p.status[0].toUpperCase() + p.status.slice(1)}</span>
            {p.review?.mergedInto ? <> into <span className="mono">{p.review.mergedInto}</span></> : null}
            {p.review?.note ? <span className="muted">. {p.review.note}</span> : null}
          </p>
        )}
      </div>
      <div className="prop-body">
        <div className="prop-main">
          {p.kind === 'new-entry' ? (
            <p className="prop-def"><b>{p.name}</b> <span className="small muted">{p.level}{p.parent ? <> in <Link href={codebookHref(p.parent)} className="mono">{p.parent}</Link></> : null}</span><br />{p.definition}</p>
          ) : (
            <p>New values for <Link href={codebookHref(p.id)} className="mono">{p.id}</Link></p>
          )}
          {subs.length ? (
            <table className="data data-tight prop-values">
              <thead><tr><th>Dimension</th><th>Value</th><th>Meaning</th></tr></thead>
              {subs.map((s) => (
                <tbody key={s.id}>
                  {s.values.map((v, i) => (
                    <tr key={v.id}>
                      {i === 0 ? <th scope="rowgroup" rowSpan={s.values.length}><span className="mono">{s.id}</span>{s.name && s.name !== s.id ? <div className="muted small">{s.name}</div> : null}</th> : null}
                      <td className="mono"><b>{v.id}</b></td>
                      <td className="cell-wrap">{v.name}{v.description ? <span className="muted">. {v.description}</span> : null}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          ) : null}
          <h3>Rationale</h3>
          <ul className="rationale">
            {p.rationale.map((r, i) => (
              <li key={i}>
                <p className="rationale-by small"><span className="mono">{r.rater}</span> <span className="muted">on</span> <Link className="mono" href={siteHref(batch, r.site)}>{r.site}</Link></p>
                <p>{r.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <aside className="prop-evidence" aria-label="Evidence">
          <h3>Found On</h3>
          <ul className="chips">{p.sources.map((s) => <li key={`${s.batch}/${s.site}`}><Link className="chip mono" href={siteHref(s.batch, s.site)}>{s.site}</Link></li>)}</ul>
          {crops.length ? (
            <ul className="prop-crops">
              {crops.map(({ e, shot }, i) => (
                <li key={i}>
                  <Link href={siteHref(batch, e.site)} title={`${e.site}, ${e.rater}${e.quote ? `: “${e.quote}”` : ''}`}>
                    <Crop shot={shot} bbox={e.bbox!} />
                  </Link>
                  <p className="small muted truncate"><span className="mono">{e.rater}</span>{e.quote ? <> “{e.quote}”</> : null}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
