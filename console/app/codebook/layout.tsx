import { CodebookList, type ListEntry } from '@/components/codebook-list';
import { codebookBundle, codebookUsage } from '@/lib/data';
import { plural } from '@/lib/format';
import { listProposals } from '../../../src/pipeline/proposals.ts';

export default function CodebookLayout({ children }: { children: React.ReactNode }) {
  const cb = codebookBundle();
  if (!cb) {
    return (
      <div className="empty-state">
        <h1>No Codebook Build</h1>
        <p>The console reads <code>dist/codebook.json</code>, which doesn’t exist yet. Build it from <code>codebook/</code>, then reload.</p>
        <pre><code>node scripts/build-codebook.ts</code></pre>
      </div>
    );
  }
  const usage = codebookUsage();
  const open: Record<string, number> = {};
  for (const p of listProposals()) if (p.proposal.status === 'open') open[p.proposal.id] = (open[p.proposal.id] ?? 0) + 1;
  const entries: ListEntry[] = cb.entries.map((e) => ({
    id: e.id,
    name: e.name,
    level: e.level,
    ...(e.parent ? { parent: e.parent } : {}),
    ...(e.deprecated ? { deprecated: true } : {}),
    search: `${e.id} ${e.name} ${e.aliases.join(' ')} ${e.definition}`.toLowerCase(),
    sites: usage.patterns[e.id]?.sites ?? 0,
    open: open[e.id] ?? 0,
  }));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Codebook <span className="mono">{cb.version}</span></h1>
          <p className="muted small">{plural(cb.entries.length, 'entry', 'entries')}. Usage counts come from consensus labels on {plural(usage.sites, 'site')}.</p>
        </div>
      </div>
      <div className="cb">
        <CodebookList entries={entries} />
        <div className="cb-detail">{children}</div>
      </div>
    </>
  );
}
