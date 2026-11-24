import { DATA } from '../data';
import { L } from '../lib/router';
import { FrameThumb, Icon, StatusBadge } from '../components/ui';
import { sceneItems, summarize } from '../lib/clearance';
import { dur, fmtDate, tc, ago } from '../lib/util';
import { passageText } from './Transcript';

export function ScenePage({ pid, n }: { pid: string; n: number }) {
  const d = DATA[pid];
  const unit = d.project.unit;
  const s = d.scenes.find((x) => x.n === n);
  if (!s) return <div className="empty"><strong>Scene {n} doesn’t exist in {d.project.title}</strong><p><a href={L.reels(pid)}>Browse {unit.toLowerCase()}s</a></p></div>;
  const reel = d.reels[s.reel - 1];
  const items = sceneItems(pid, s);
  const sum = summarize(items);
  const prev = d.scenes.find((x) => x.n === n - 1);
  const next = d.scenes.find((x) => x.n === n + 1);
  const t = s.passage ? d.transcripts.find((x) => x.id === s.passage!.transcriptId) : undefined;
  const clips = d.clips.filter((c) => c.sceneN === n);
  const nextT = next?.passage ? d.transcripts.find((x) => x.id === next.passage!.transcriptId) : undefined;
  const pendingItems = items.filter((i) => i.clearance.status === 'pending');
  const deniedItems = items.filter((i) => i.clearance.status === 'denied');

  return (
    <>
      <header className="ph">
        <div className="ph-main">
          <div className="eyebrow"><a href={L.reel(pid, s.reel)}>{unit} {s.reel} · {reel.title}</a></div>
          <h1><span className="h1-num">Scene {s.n}</span> {s.title}</h1>
          <div className="chips">
            <span className="chip mono" title={`Position in ${unit.toLowerCase()} ${s.reel}`}>{tc(s.startSec)} – {tc(s.startSec + s.durSec)} in {unit.toLowerCase()}</span>
            <span className="chip">{dur(s.durSec)}</span>
            <span className="chip">{s.cutState}</span>
            <span className="chip">Editor: {s.editor}</span>
          </div>
        </div>
        <div className="ph-nav">
          {prev ? <a className="btn" href={L.scene(pid, prev.n)} title={prev.title}><Icon name="arrow-left" size={14} /> Scene {prev.n}</a> : null}
          {next ? <a className="btn" href={L.scene(pid, next.n)} title={next.title}>Scene {next.n} <Icon name="arrow-right" size={14} /></a> : null}
        </div>
      </header>

      <div className="cols">
        <div className="col-main">
          {/* festival verdict */}
          {sum.verdict !== 'none' && (
          <section className={`verdict v-${sum.verdict}`} aria-label="Festival clearance for this scene">
            <div className="v-icon"><Icon name={sum.verdict === 'cleared' || sum.verdict === 'festival' ? 'check-circle' : sum.verdict === 'pending' ? 'clock' : 'x-circle'} size={26} /></div>
            <div className="v-body">
              <div className="v-eyebrow">Festival use for this scene</div>
              {sum.verdict === 'cleared' && <><h2>Cleared for festival use</h2><p>All {sum.total} archival {sum.total === 1 ? 'item is' : 'items are'} cleared for all media.</p></>}
              {sum.verdict === 'festival' && <><h2>Cleared for festival use only</h2><p>All archival items are cleared for festivals. {sum.counts['cleared-festival-only']} {sum.counts['cleared-festival-only'] === 1 ? 'is' : 'are'} festival-only, so broadcast or streaming needs a new licence.</p></>}
              {sum.verdict === 'pending' && (
                <>
                  <h2>Not cleared yet</h2>
                  <p>
                    {sum.total === 1 ? 'The one archival item in this scene is' : `${pendingItems.length} of ${sum.total} archival items are`} still pending
                    {pendingItems.length === 1 && <>: <a href={L.item(pid, pendingItems[0].id)} className="mono">{pendingItems[0].id}</a>. Request sent {fmtDate(pendingItems[0].clearance.requestedOn!)} ({ago(pendingItems[0].clearance.requestedOn!)}){pendingItems[0].clearance.expectedBy && <>, reply expected by {fmtDate(pendingItems[0].clearance.expectedBy)}</>}.</>}
                    {pendingItems.length !== 1 && '.'}
                  </p>
                </>
              )}
              {sum.verdict === 'denied' && <><h2>Blocked: a licence was denied</h2><p>{deniedItems.map((i) => i.id).join(', ')} {deniedItems.length === 1 ? 'was' : 'were'} denied. This scene can’t play at a festival as cut.</p></>}
            </div>
            {pendingItems.length === 1 && <a className="btn btn-primary" href={L.item(pid, pendingItems[0].id)}>Open clearance record <Icon name="arrow-right" size={14} /></a>}
          </section>
          )}

          <section className="card">
            <h2>About this scene</h2>
            <p className="body">{s.synopsis}</p>
            {sum.verdict === 'none' && <p className="sub clear-none"><Icon name="check-circle" size={13} /> No archival items in this scene, so nothing to clear.</p>}
            {s.note && <div className="note"><Icon name="note" size={15} /><div><b>Editor’s note</b><p>{s.note}</p></div></div>}
          </section>

          {items.length > 0 && (
            <section className="card">
              <div className="card-head"><h2>Archival items in this scene <span className="count-pill">{items.length}</span></h2></div>
              <ul className="arch-list">
                {items.map((i) => {
                  const src = d.sources.find((x) => x.id === i.sourceId)!;
                  const u = i.usages.find((x) => x.sceneN === n)!;
                  return (
                    <li key={i.id} className="arch-card">
                      <FrameThumb id={i.id} tone={i.tone} w={148} h={84} label={i.durSec ? tc(u.srcIn) : 'STILL'} />
                      <div className="arch-body">
                        <div className="arch-top"><a className="mono idlink" href={L.item(pid, i.id)}>{i.id}</a><StatusBadge status={i.clearance.status} size="sm" /></div>
                        <div className="arch-title">{i.title}</div>
                        <div className="sub">{src.name} · {i.format}{i.durSec ? ` · used ${tc(u.srcIn)}–${tc(u.srcOut)}` : ''}</div>
                        {i.clearance.status === 'pending' && <div className="sub t-pending">Request sent {fmtDate(i.clearance.requestedOn!)}{i.clearance.expectedBy ? `, reply expected by ${fmtDate(i.clearance.expectedBy)}` : ''}</div>}
                        {i.clearance.status === 'denied' && <div className="sub t-denied">{i.clearance.note}</div>}
                      </div>
                      <a className="btn btn-sm" href={L.item(pid, i.id)}>Clearance record <Icon name="arrow-right" size={13} /></a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {t && s.passage && (
            <section className="card">
              <div className="card-head"><h2>Interview in this scene</h2></div>
              <div className="pass">
                <div className="pass-top"><b>{t.name}</b><span className="sub">{t.role}</span></div>
                <blockquote>{passageText(t, s.passage.inSec, s.passage.outSec).slice(0, 2).join(' ')}…</blockquote>
                <div className="pass-meta"><span className="mono">{tc(s.passage.inSec)} – {tc(s.passage.outSec)}</span><span>{dur(s.passage.outSec - s.passage.inSec)}</span>
                  <a className="btn btn-sm" href={L.transcript(pid, t.id, { scene: s.n })}>Open passage in transcript <Icon name="arrow-right" size={13} /></a></div>
              </div>
            </section>
          )}

          <section className="card">
            <div className="card-head"><h2>Clips in this scene <span className="count-pill">{clips.length}</span></h2><a href={L.clips(pid, { used: 'yes' })} className="textlink">All clips in the cut</a></div>
            {clips.length === 0 ? <p className="muted pad">No clips are attached to this scene yet.</p> : (
              <table className="tbl">
                <thead><tr><th>Clip</th><th>Description</th><th>Type</th><th className="r">Length</th></tr></thead>
                <tbody>
                  {clips.map((c) => (
                    <tr key={c.id}><td className="mono"><a href={L.clip(pid, c.id)}>{c.id}</a></td><td>{c.desc}{c.circled && <span className="circ" title="Circled take"> ●</span>}</td><td>{c.type}</td><td className="r mono">{tc(c.durSec, c.durSec >= 3600)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <aside className="col-side">
          {next && (
            <section className="card next-card" aria-label="What plays next">
              <div className="eyebrow">Plays next</div>
              <h3><a href={L.scene(pid, next.n)}>Scene {next.n} · {next.title}</a></h3>
              <div className="sub">{dur(next.durSec)} · {next.kind === 'interview' ? 'Interview' : next.kind === 'archival' ? 'Archival' : next.kind === 'montage' ? 'Montage' : 'Vérité'}</div>
              {nextT && next.passage && (
                <div className="pass pass-side">
                  <div className="pass-top"><b>{nextT.name}</b></div>
                  <blockquote>{passageText(nextT, next.passage.inSec, next.passage.outSec)[0]}</blockquote>
                  <div className="mono sub">{tc(next.passage.inSec)} – {tc(next.passage.outSec)} · {dur(next.passage.outSec - next.passage.inSec)}</div>
                  <a className="btn btn-primary btn-block" href={L.transcript(pid, nextT.id, { scene: next.n })}>Open this passage in the transcript <Icon name="arrow-right" size={14} /></a>
                </div>
              )}
              <a className="textlink" href={L.scene(pid, next.n)}>Go to Scene {next.n}</a>
            </section>
          )}
          {prev && (
            <section className="card">
              <div className="eyebrow">Plays before</div>
              <h3><a href={L.scene(pid, prev.n)}>Scene {prev.n} · {prev.title}</a></h3>
              <div className="sub">{dur(prev.durSec)}</div>
            </section>
          )}
          <section className="card">
            <div className="eyebrow">Around this scene</div>
            <ol className="mini-list">
              {reel.sceneNums.filter((x) => Math.abs(x - n) <= 3).map((x) => {
                const sc = d.scenes.find((y) => y.n === x)!;
                const sm = summarize(sceneItems(pid, sc));
                return (
                  <li key={x} className={x === n ? 'on' : ''}>
                    <a href={L.scene(pid, x)} aria-current={x === n ? 'page' : undefined}><span className="mono">{x}</span><span className="ml-t">{sc.title}</span>{sm.worst && (sm.worst === 'pending' || sm.worst === 'denied') && <Icon name={sm.worst === 'pending' ? 'clock' : 'x-circle'} size={13} className={sm.worst === 'pending' ? 't-pending' : 't-denied'} />}</a>
                  </li>
                );
              })}
            </ol>
            <a className="textlink" href={L.reel(pid, s.reel)}>All {reel.sceneNums.length} scenes in {unit} {s.reel}</a>
          </section>
        </aside>
      </div>
    </>
  );
}
