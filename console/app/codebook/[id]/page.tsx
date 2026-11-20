import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Instances, type DimDef, type Kid } from '@/components/instances';
import { codebookBundle, codebookInstances, codebookUsage } from '@/lib/data';
import { codebookHref, plural, siteHref } from '@/lib/format';
import { listProposals } from '../../../../src/pipeline/proposals.ts';

const entryOf = async (params: PageProps<'/codebook/[id]'>['params']) => {
  const id = decodeURIComponent((await params).id);
  return codebookBundle()?.entries.find((e) => e.id === id);
};

export async function generateMetadata({ params }: PageProps<'/codebook/[id]'>): Promise<Metadata> {
  const e = await entryOf(params);
  return { title: e ? `${e.name} in the Codebook` : 'Entry Not Found' };
}

export default async function EntryPage({ params }: PageProps<'/codebook/[id]'>) {
  const cb = codebookBundle();
  const e = await entryOf(params);
  if (!cb || !e) notFound();
  const usageAll = codebookUsage();
  const usage = usageAll.patterns;
  const u = usage[e.id];
  const props = listProposals().filter((p) => p.proposal.id === e.id);
  const instances = codebookInstances(e.id) ?? [];
  const children = cb.entries.filter((x) => x.parent === e.id);
  const kids: Kid[] = children.map((c) => ({ id: c.id, name: c.name, level: c.level, definition: c.definition, deprecated: !!c.deprecated, sites: usage[c.id]?.sites ?? 0 }));
  // Dimension definitions for every pattern an instance carries, so the drawer can name values.
  const patternIds = new Set(instances.map((i) => i.pattern));
  const defs: Record<string, { name: string; level: string; parent?: string; dims: DimDef[] }> = {};
  for (const x of cb.entries) {
    if (!patternIds.has(x.id)) continue;
    defs[x.id] = {
      name: x.name, level: x.level, ...(x.parent ? { parent: x.parent } : {}),
      dims: x.dimensions.flatMap((d) => d.subdimensions.map((s) => ({ id: s.id, name: s.name, values: s.values.map((v) => ({ id: v.id, name: v.name, description: v.description ?? v.example })) }))),
    };
  }
  const relations = Object.entries(e.relations).flatMap(([k, v]) => (v as string[]).map((r) => ({ k, r })));
  const preview = (e.previews[0] as any)?.path as string | undefined;

  const openProps = props.filter((p) => p.proposal.status === 'open').length;
  const elementCount = instances.filter((i) => i.pattern === e.id).length;

  return (
    <article className="panel entry" aria-labelledby="entry-h">
      <div className="entry-head">
        <div className="entry-intro">
          <p className="entry-path small">
            <span className="level-tag" data-level={e.level}>{e.level}</span>
            {e.parent ? <> in <Link href={codebookHref(e.parent)} className="mono">{e.parent}</Link></> : null}
            <span className="muted"> · added in <span className="mono">{e.addedIn}</span></span>
          </p>
          <h2 id="entry-h" className="entry-name">{e.name} <span className="mono muted entry-id">{e.id}</span></h2>
          {e.deprecated ? <p className="err">Deprecated. Use <Link href={codebookHref(e.replacedBy!)}>{e.replacedBy}</Link> instead.</p> : null}
          <p className="entry-def">{e.definition}</p>
          {e.aliases.length ? <p className="small muted">Also called {e.aliases.join(', ')}.</p> : null}
        </div>
        {preview ? (
          <figure className="preview">
            <img src={`/files/dist/${preview}`} alt={`Diagram of a ${e.name}`} />
          </figure>
        ) : null}
      </div>

      <dl className="stats stats-inline" aria-label="Usage">
        <div className="stat"><dt>Present on</dt><dd><span className="stat-value num">{u?.sites ?? 0}</span><span className="stat-sub">of {plural(usageAll.sites, 'labeled site')}</span></dd></div>
        <div className="stat" data-band={u?.uncertain ? 'warn' : undefined}><dt>Uncertain on</dt><dd><span className="stat-value num">{u?.uncertain ?? 0}</span><span className="stat-sub">sites</span></dd></div>
        <div className="stat"><dt>Labeled elements</dt><dd><span className="stat-value num">{children.length ? instances.length : elementCount}</span><span className="stat-sub">{children.length ? `incl. ${plural(children.length, 'child entry', 'child entries')}` : 'boxes in consensus'}</span></dd></div>
        <div className="stat" data-band={openProps ? 'warn' : undefined}><dt>Open proposals</dt><dd><span className="stat-value num">{openProps}</span><span className="stat-sub">{props.length ? `${props.length} filed in all` : 'none filed'}</span></dd></div>
      </dl>

      <Instances entry={{ id: e.id, name: e.name, level: e.level }} kids={kids} instances={instances} defs={defs} />

      {e.anatomy.length ? (
        <section>
          <h3>Anatomy</h3>
          <dl className="kv">
            {e.anatomy.map((a) => <div key={a.name} className="kv-row"><dt>{a.name}</dt><dd>{a.role}</dd></div>)}
          </dl>
        </section>
      ) : null}

      {e.dimensions.length ? (
        <section>
          <h3>Dimensions <span className="h-note">value counts from consensus labels</span></h3>
          <div className="dims">
            {e.dimensions.map((d) => (
              <div key={d.name} className="dim">
                <p className="dim-head"><b>{d.name}</b> <span className="chip">{d.family}</span></p>
                {d.question ? <p className="small muted dim-q">{d.question}</p> : null}
                {d.subdimensions.map((s) => {
                  const counts = u?.values?.[s.id] ?? {};
                  const total = Object.values(counts).reduce((a, n) => a + n, 0);
                  const mx = Math.max(1, ...Object.values(counts));
                  return (
                    <table key={s.id} className="data data-tight values">
                      <caption><span className="mono">{s.id}</span> <span className="muted">{s.name !== s.id ? s.name : ''} · {s.select === 'many' ? 'multi-select' : 'single-select'}{total ? ` · ${total} uses` : ''}</span></caption>
                      <tbody>
                        {s.values.map((v) => {
                          const n = counts[v.id] ?? 0;
                          return (
                            <tr key={v.id} data-zero={n === 0 || undefined}>
                              <th scope="row" title={v.description ?? ''}><span className="mono">{v.id}</span>{v.example ? <span className="muted"> e.g. {v.example}</span> : null}</th>
                              <td className="col-bar"><span className="usage-bar" aria-hidden="true"><b style={{ width: `${(n / mx) * 100}%` }} /></span></td>
                              <td className="num">{n || '·'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {relations.length ? (
        <section>
          <h3>Related</h3>
          <ul className="chips">{relations.map(({ k, r }) => <li key={`${k}/${r}`}><Link className="chip" href={codebookHref(r)}><span className="muted">{k}</span> <span className="mono">{r}</span></Link></li>)}</ul>
        </section>
      ) : null}

      {u?.where.length ? (
        <section>
          <h3>Seen On</h3>
          <ul className="chips">{u.where.map((w) => <li key={`${w.batch}/${w.slug}`}><Link className="chip mono" href={siteHref(w.batch, w.slug)}>{w.slug}</Link></li>)}</ul>
        </section>
      ) : null}

      {props.length ? (
        <section>
          <h3>Proposals</h3>
          <ul className="plain">
            {props.map((p) => (
              <li key={`${p.batch}/${p.proposal.id}`} className="small">
                <Link href={`/proposals?status=${p.proposal.status}`} className="mono">{p.batch}/{p.proposal.id}</Link> {p.proposal.kind}, {p.proposal.status}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {e.sources.length ? (
        <section>
          <h3>Sources</h3>
          <ul className="plain small">
            {e.sources.map((s, i) => (
              <li key={i}>
                {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.url}</a> : null}
                {s.paper ? <> paper <span className="mono">{s.paper}</span></> : null}
                {s.site ? <> <span className="mono">{s.batch}/{s.site}</span></> : null}
                {s.note ? <> {s.note}</> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
