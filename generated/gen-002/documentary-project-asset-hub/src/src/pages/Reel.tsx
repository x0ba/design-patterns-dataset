import { useMemo, useState } from 'react';
import { DATA } from '../data';
import { L } from '../lib/router';
import { Icon, StatusBadge } from '../components/ui';
import { sceneItems, summarize } from '../lib/clearance';
import { dur, tc } from '../lib/util';

const KIND_LABEL: Record<string, string> = { archival: 'Archival', interview: 'Interview', verite: 'Vérité', montage: 'Montage', title: 'Titles' };
const KIND_ICON: Record<string, string> = { archival: 'archive', interview: 'mic', verite: 'film', montage: 'grid', title: 'doc' };

export function ReelPage({ pid, n }: { pid: string; n: number }) {
  const d = DATA[pid];
  const unit = d.project.unit;
  const reel = d.reels[n - 1];
  const [onlyOpen, setOnlyOpen] = useState(false);
  const rows = useMemo(() => reel ? reel.sceneNums.map((sn) => {
    const s = d.scenes.find((x) => x.n === sn)!;
    const items = sceneItems(pid, s);
    return { s, items, sum: summarize(items), who: s.passage ? d.transcripts.find((t) => t.id === s.passage!.transcriptId) : undefined };
  }) : [], [pid, n]);
  if (!reel) return <div className="empty"><strong>No such {unit.toLowerCase()}</strong><p><a href={L.reels(pid)}>See all {unit.toLowerCase()}s</a></p></div>;

  const reelItems = rows.flatMap((r) => r.items);
  const tot = summarize(reelItems);
  const shown = onlyOpen ? rows.filter((r) => r.sum.worst === 'pending' || r.sum.worst === 'denied') : rows;

  return (
    <>
      <header className="ph">
        <div className="ph-main">
          <div className="eyebrow">{d.project.title} · {unit} {n} of {d.reels.length}</div>
          <h1>{reel.title}</h1>
          <p className="lede">{reel.blurb}</p>
        </div>
        <dl className="ph-stats">
          <div><dt>Scenes</dt><dd>{reel.sceneNums.length}</dd></div>
          <div><dt>Running time</dt><dd className="mono">{tc(reel.durSec, false)}</dd></div>
          <div><dt>Cut state</dt><dd>{rows[0]?.s.cutState}</dd></div>
          <div><dt>Archival</dt><dd>{tot.total} items</dd></div>
        </dl>
      </header>

      <section className="card strip-card" aria-label={`Clearance across ${unit} ${n}`}>
        <div className="strip-head">
          <h2>Clearance across this {unit.toLowerCase()}</h2>
          <div className="legend">
            <span><i className="lg lg-ok" />All cleared</span>
            <span><i className="lg lg-fest" />Festival only</span>
            <span><i className="lg lg-pending" />Pending</span>
            <span><i className="lg lg-denied" />Denied</span>
            <span><i className="lg lg-none" />No archival</span>
          </div>
        </div>
        <div className="strip" role="list">
          {rows.map(({ s, sum }) => (
            <a key={s.n} role="listitem" href={L.scene(pid, s.n)} className={`seg seg-${sum.verdict}`} style={{ flexGrow: s.durSec }} title={`Scene ${s.n}: ${s.title} · ${dur(s.durSec)}${sum.total ? ` · ${sum.total} archival` : ''}`} aria-label={`Scene ${s.n}, ${s.title}`}>
              <span>{s.n}</span>
            </a>
          ))}
        </div>
        <div className="strip-foot">
          <span className="mono">00:00:00</span>
          <span className="strip-sum">
            {tot.counts.pending > 0 && <b className="t-pending">{tot.counts.pending} pending</b>}
            {tot.counts.denied > 0 && <b className="t-denied"> · {tot.counts.denied} denied</b>}
            {!tot.counts.pending && !tot.counts.denied && <b className="t-ok">All archival cleared for festival use</b>}
          </span>
          <span className="mono">{tc(reel.durSec)}</span>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Scenes in {unit} {n}</h2>
          <label className="check"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Only scenes with open clearances</label>
        </div>
        <table className="tbl scenes">
          <thead><tr><th className="num">Scene</th><th>Title</th><th>Content</th><th className="r">In {unit.toLowerCase()} at</th><th className="r">Length</th><th>Archival clearance</th></tr></thead>
          <tbody>
            {shown.map(({ s, items, sum, who }) => (
              <tr key={s.n} className="clickrow">
                <td className="num mono"><a href={L.scene(pid, s.n)}>{s.n}</a></td>
                <td>
                  <a className="rowlink" href={L.scene(pid, s.n)}>{s.title}</a>
                  {who && <div className="sub">{who.name}</div>}
                </td>
                <td><span className="kind"><Icon name={KIND_ICON[s.kind]} size={14} />{KIND_LABEL[s.kind]}</span></td>
                <td className="r mono">{tc(s.startSec)}</td>
                <td className="r mono">{tc(s.durSec, false)}</td>
                <td>
                  {sum.total === 0 ? <span className="muted">None in scene</span> : (
                    <span className="clear-cell">
                      <StatusBadge status={sum.worst!} size="sm" short />
                      <span className="sub">{sum.total === 1 ? items[0].id : `${sum.total} items${sum.counts.pending ? ` · ${sum.counts.pending} pending` : ''}`}</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="muted pad">No scenes with open clearances in this {unit.toLowerCase()}.</td></tr>}
          </tbody>
        </table>
      </section>

      <nav className="pager-nav" aria-label={`${unit}s`}>
        {n > 1 ? <a href={L.reel(pid, n - 1)}><Icon name="arrow-left" size={14} /> {unit} {n - 1} · {d.reels[n - 2].title}</a> : <span />}
        {n < d.reels.length ? <a href={L.reel(pid, n + 1)}>{unit} {n + 1} · {d.reels[n].title} <Icon name="arrow-right" size={14} /></a> : <span />}
      </nav>
    </>
  );
}
