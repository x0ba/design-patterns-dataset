import { DATA, STATUS_LABEL, STATUS_ORDER } from '../data';
import { L } from '../lib/router';
import { Icon, StatusBadge } from '../components/ui';
import { summarize } from '../lib/clearance';
import { daysBetween, fmtDate, NOW, tc } from '../lib/util';
import type { Status } from '../data/types';

export function ClearBar({ counts, total }: { counts: Record<Status, number>; total: number }) {
  return (
    <div className="stack" role="img" aria-label={STATUS_ORDER.map((s) => `${counts[s]} ${STATUS_LABEL[s]}`).join(', ')}>
      {STATUS_ORDER.map((s) => counts[s] > 0 && <span key={s} className={`stk stk-${s}`} style={{ flexGrow: counts[s] }} />)}
      <span className="sr-only">{total} items</span>
    </div>
  );
}

export function OverviewPage({ pid }: { pid: string }) {
  const d = DATA[pid];
  const p = d.project;
  const sum = summarize(d.items);
  const pending = d.items.filter((i) => i.clearance.status === 'pending').sort((a, b) => a.clearance.requestedOn!.localeCompare(b.clearance.requestedOn!));
  const denied = d.items.filter((i) => i.clearance.status === 'denied');
  const total = d.reels.reduce((a, r) => a + r.durSec, 0);
  return (
    <>
      <header className="ph">
        <div className="ph-main">
          <div className="eyebrow">{p.format} · {p.stage}</div>
          <h1>{p.title}</h1>
          <p className="lede">{p.logline}</p>
          <div className="chips">
            <span className="chip">Director: {p.director}</span>
            {p.commissioner && <span className="chip">Commissioned by {p.commissioner}</span>}
            <span className="chip">Running time {tc(total)}</span>
            <span className="chip">Updated {fmtDate(p.updated)}</span>
          </div>
        </div>
      </header>

      <div className="stats">
        <a className="stat" href={L.reels(pid)}><b>{d.reels.length}</b><span>{p.unit}s</span></a>
        <a className="stat" href={L.reels(pid)}><b>{d.scenes.length}</b><span>Scenes</span></a>
        <a className="stat" href={L.clips(pid)}><b>{d.clips.length.toLocaleString('en-US')}</b><span>Clips</span></a>
        <a className="stat" href={L.archive(pid)}><b>{d.items.length}</b><span>Archival items from {d.sources.length} sources</span></a>
        <a className="stat" href={L.transcripts(pid)}><b>{d.transcripts.length}</b><span>Interview transcripts</span></a>
      </div>

      <div className="cols">
        <div className="col-main">
          <section className="card">
            <div className="card-head"><h2>Archival clearance</h2><a className="textlink" href={L.archive(pid)}>Open archive</a></div>
            <ClearBar counts={sum.counts} total={sum.total} />
            <ul className="clear-legend">
              {STATUS_ORDER.map((s) => (
                <li key={s}><a href={L.archive(pid, { status: s })}><StatusBadge status={s} size="sm" /><b>{sum.counts[s]}</b></a></li>
              ))}
            </ul>
          </section>

          <section className="card">
            <div className="card-head"><h2>Needs attention</h2><span className="sub">{pending.length} pending · {denied.length} denied</span></div>
            <table className="tbl">
              <thead><tr><th>Item</th><th>Source</th><th>Requested</th><th className="r">Waiting</th><th>Used in</th></tr></thead>
              <tbody>
                {pending.slice(0, 6).map((i) => (
                  <tr key={i.id}>
                    <td className="mono"><a href={L.item(pid, i.id)}>{i.id}</a></td>
                    <td>{d.sources.find((s) => s.id === i.sourceId)!.name}</td>
                    <td>{fmtDate(i.clearance.requestedOn!)}</td>
                    <td className="r">{daysBetween(i.clearance.requestedOn!, NOW)} days</td>
                    <td>{i.usages.length ? i.usages.map((u) => <a key={u.sceneN} href={L.scene(pid, u.sceneN)}>Scene {u.sceneN}</a>) : <span className="muted">Not used</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <a className="textlink pad-b" href={L.archive(pid, { status: 'pending' })}>See all {pending.length} pending <Icon name="arrow-right" size={12} /></a>
          </section>
        </div>
        <aside className="col-side">
          <section className="card">
            <div className="card-head"><h2>{p.unit}s</h2></div>
            <ul className="reel-mini">
              {d.reels.map((r) => {
                const its = r.sceneNums.flatMap((n) => d.scenes.find((s) => s.n === n)!.archival);
                const sm = summarize(its.map((id) => d.items.find((x) => x.id === id)!));
                return (
                  <li key={r.n}>
                    <a href={L.reel(pid, r.n)}><span className="rm-n">{r.n}</span><span className="rm-t">{r.title}<span className="sub">{r.sceneNums.length} scenes · {tc(r.durSec, false)}</span></span>
                      {sm.counts.pending > 0 && <span className="count warn" title={`${sm.counts.pending} pending clearances`}>{sm.counts.pending}</span>}</a>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="card">
            <div className="card-head"><h2>Team</h2></div>
            <ul className="team">
              {p.team.map((m) => <li key={m.name}><b>{m.name}</b><span className="sub">{m.role}</span></li>)}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}

export function ReelsPage({ pid }: { pid: string }) {
  const d = DATA[pid];
  const unit = d.project.unit;
  return (
    <>
      <header className="ph">
        <div className="ph-main">
          <div className="eyebrow">{d.project.title}</div>
          <h1>{unit}s &amp; scenes</h1>
          <p className="lede">{d.reels.length} {unit.toLowerCase()}s, {d.scenes.length} scenes. Open a {unit.toLowerCase()} to see its scenes in order, or jump straight to a scene number.</p>
        </div>
        <form className="jump" onSubmit={(e) => { e.preventDefault(); const v = Number((e.currentTarget.elements.namedItem('sn') as HTMLInputElement).value); if (d.scenes.some((s) => s.n === v)) window.location.hash = L.scene(pid, v); }}>
          <label htmlFor="sn">Go to scene</label>
          <input id="sn" name="sn" type="number" min={1} max={d.scenes.length} placeholder={`1–${d.scenes.length}`} />
          <button className="btn" type="submit">Go</button>
        </form>
      </header>
      <div className="reel-grid">
        {d.reels.map((r) => {
          const its = r.sceneNums.flatMap((n) => d.scenes.find((s) => s.n === n)!.archival).map((id) => d.items.find((x) => x.id === id)!);
          const sm = summarize(its);
          const st = d.scenes.find((s) => s.n === r.sceneNums[0])!.cutState;
          return (
            <a key={r.n} className="card reel-card" href={L.reel(pid, r.n)}>
              <div className="eyebrow">{unit} {r.n}</div>
              <h3>{r.title}</h3>
              <p className="small">{r.blurb}</p>
              <div className="sub">Scenes {r.sceneNums[0]}–{r.sceneNums[r.sceneNums.length - 1]} · {r.sceneNums.length} scenes · {tc(r.durSec, false)}</div>
              <div className="rc-foot">
                <span className="chip">{st}</span>
                {sm.total > 0 && <ClearBar counts={sm.counts} total={sm.total} />}
                <span className="sub">{sm.counts.pending ? `${sm.counts.pending} pending` : sm.total ? 'Archival cleared' : 'No archival'}{sm.counts.denied ? ` · ${sm.counts.denied} denied` : ''}</span>
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}
