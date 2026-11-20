import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Stats, type StatProps } from '@/components/stats';
import { AgreementPanel, Viewer } from '@/components/viewer';
import { codebookBundle, siteDetail } from '@/lib/data';
import { band, BAND_LABEL, enc, fmt, plural, repoHref, STATE_LABEL } from '@/lib/format';

async function load(params: PageProps<'/site/[batch]/[slug]'>['params']) {
  const { batch, slug } = await params;
  return siteDetail(decodeURIComponent(batch), decodeURIComponent(slug));
}

export async function generateMetadata({ params }: PageProps<'/site/[batch]/[slug]'>): Promise<Metadata> {
  const d = await load(params);
  if (!d) return { title: 'Site Not Found' };
  return { title: d.app ? `${d.app.name}: ${d.view?.name}` : d.meta?.title || d.slug };
}

export default async function SitePage({ params }: PageProps<'/site/[batch]/[slug]'>) {
  const d = await load(params);
  if (!d) notFound();
  const bundle = codebookBundle();
  const ids = new Set([...(d.consensus?.patterns ?? []), ...Object.values(d.labels).flatMap((l) => l.patterns)].map((p) => p.id));
  const levels = Object.fromEntries((bundle?.entries ?? []).filter((e) => ids.has(e.id)).map((e) => [e.id, e.level]));
  const url = d.meta?.finalUrl ?? d.status?.url;
  const repo = d.app ? repoHref(d.app) : undefined;

  const ag = d.agreement;
  const present = d.consensus?.patterns.filter((p) => p.status === 'present').length;
  const uncertain = d.consensus?.patterns.filter((p) => p.status === 'uncertain').length ?? 0;
  const rated = d.raters.filter((r) => d.labels[r]).length;
  const stats: StatProps[] = [
    { label: 'State', value: d.status ? STATE_LABEL[d.status.state] ?? d.status.state : '—', sub: d.status?.flags?.length ? plural(d.status.flags.length, 'flag') : d.status?.error ? 'Error' : `${rated}/${d.raters.length} raters done`, band: d.status?.state === 'failed' || d.status?.state === 'flagged' ? 'warn' : undefined },
    { label: 'Agreement', value: fmt(ag?.score), sub: ag ? BAND_LABEL[band(ag.score)!] : 'Needs two raters', band: band(ag?.score) },
    { label: 'Pattern-status α', value: fmt(ag?.patternStatusAlpha, 3), sub: ag?.patternStatusAlpha != null ? BAND_LABEL[band(ag.patternStatusAlpha)!] : ag ? 'No variation' : '—', band: band(ag?.patternStatusAlpha) },
    { label: 'Disagreements', value: ag ? ag.disagreements.length : '—', sub: ag ? (ag.disagreements.length ? `on ${plural(new Set(ag.disagreements.map((x) => x.field)).size, 'field')}` : 'Raters agree') : '—', href: ag?.disagreements.length ? '#agreement' : undefined },
    { label: 'Patterns', value: present ?? '—', sub: d.consensus ? `present in consensus${uncertain ? `, ${uncertain} uncertain` : ''}` : 'No consensus yet' },
  ];

  return (
    <>
      <nav aria-label="Breadcrumb" className="crumbs">
        <Link href={`/batch/${enc(d.batch)}`}>{d.batch}</Link>
        {d.app ? <><span aria-hidden="true"> / </span><span>{d.app.name}</span></> : null}
      </nav>
      <header className="page-head">
        <h1>{d.app ? d.view?.name : d.meta?.title || d.slug}</h1>
        {d.app?.name || d.view?.description ? (
          <p className="page-desc">
            {d.view?.description}
            {repo ? <> <a href={repo} target="_blank" rel="noreferrer">Repository{d.app!.commit ? ` @ ${d.app!.commit.slice(0, 7)}` : ''} ↗</a></> : null}
          </p>
        ) : null}
        <dl className="facts">
          {url ? <div><dt>URL</dt><dd className="mono"><a href={url} target="_blank" rel="noreferrer">{url}</a></dd></div> : null}
          {d.meta ? <div><dt>Screenshot</dt><dd className="num">{d.meta.screenshot.width} × {d.meta.screenshot.height} px</dd></div> : null}
          {d.meta?.capturedAt ? <div><dt>Captured</dt><dd><time dateTime={d.meta.capturedAt}>{d.meta.capturedAt.slice(0, 16).replace('T', ' ')}</time></dd></div> : null}
        </dl>
        {d.status?.error ? <p className="err small">{d.status.error}</p> : null}
        {d.status?.flags?.length ? <ul className="plain small warn-text">{d.status.flags.map((f) => <li key={f}>{f}</li>)}</ul> : null}
      </header>
      <Stats items={stats} label="Site summary" />
      <Viewer d={d} levels={levels} />
      <AgreementPanel d={d} />
    </>
  );
}
