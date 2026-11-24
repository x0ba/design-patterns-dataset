import { useState } from 'react';
import { DATA } from '../data';
import { L } from '../lib/router';
import { FrameThumb, Icon, StatusBadge } from '../components/ui';
import { daysBetween, dur, fmtDate, NOW, tc, ago } from '../lib/util';
import { festivalLine } from '../lib/clearance';
import { useStore } from '../lib/store';
import { copyText } from '../lib/copy';

const MEANING: Record<string, string> = {
  'cleared-all-media': 'Licence covers every medium and territory listed below. Safe for festival, broadcast and streaming.',
  'cleared-festival-only': 'Licence covers festival exhibition only. It needs a fresh licence before broadcast, streaming or release.',
  pending: 'We have asked, and the source has not answered. Nothing can be assumed until they confirm in writing.',
  denied: 'The source refused. The item has to be replaced or cut before any screening.',
};

export function ItemPage({ pid, id }: { pid: string; id: string }) {
  const d = DATA[pid];
  const it = d.items.find((x) => x.id === id);
  const { notes, addNote, say } = useStore();
  const [draft, setDraft] = useState('');
  if (!it) return <div className="empty"><strong>No archival item “{id}” in {d.project.title}</strong><p><a href={L.archive(pid)}>Browse the archive</a></p></div>;
  const src = d.sources.find((x) => x.id === it.sourceId)!;
  const c = it.clearance;
  const fest = festivalLine(c.status);
  const scenes = it.usages.map((u) => ({ u, s: d.scenes.find((x) => x.n === u.sceneN)! }));
  const siblings = d.items.filter((x) => x.story === it.story && x.id !== it.id);
  const sourceCount = d.items.filter((x) => x.sourceId === src.id).length;
  const log = [...it.log, ...(notes[it.id] || [])];
  const dueIn = c.expectedBy ? daysBetween(NOW, c.expectedBy) : undefined;

  const summary = () => {
    const sc = scenes.map(({ s }) => `Scene ${s.n} (${d.project.unit} ${s.reel})`).join(', ') || 'not used in a scene';
    return `${it.id} · ${src.name}: ${c.status.toUpperCase().replace(/-/g, ' ')}. ${fest.text}. ` +
      (c.status === 'pending' ? `Request sent ${fmtDate(c.requestedOn!, true)} (ref ${c.ref}), reply expected by ${fmtDate(c.expectedBy!, true)}. ` : c.decidedOn ? `Decided ${fmtDate(c.decidedOn, true)} (ref ${c.ref}). ` : '') + `Used in ${sc}.`;
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); const t = draft.trim(); if (!t) return; addNote(it.id, t); setDraft(''); };

  return (
    <>
      <header className="ph">
        <div className="ph-main">
          <div className="eyebrow"><a href={L.archive(pid, { source: src.id })}>{src.name}</a> · archival item</div>
          <h1 className="mono h1-id">{it.id}</h1>
          <p className="lede">{it.title}{it.rollCount > 1 ? ` (roll ${it.roll} of ${it.rollCount})` : ''}</p>
        </div>
        <div className="ph-nav">
          <button className="btn" onClick={async () => say((await copyText(summary())) ? 'Status summary copied' : 'Copy failed. Select the text manually')}><Icon name="copy" size={14} /> Copy status summary</button>
        </div>
      </header>

      <section className={`verdict vs-${c.status}`} aria-label="Clearance verdict">
        <div className="v-icon"><Icon name={fest.ok ? 'check-circle' : c.status === 'pending' ? 'clock' : 'x-circle'} size={30} /></div>
        <div className="v-body">
          <div className="v-eyebrow">Festival use</div>
          <h2>{fest.text}</h2>
          <p>
            {c.status === 'pending' && <>Request sent <b>{fmtDate(c.requestedOn!)}</b> ({ago(c.requestedOn!)}). Reply expected by <b>{fmtDate(c.expectedBy!)}</b>{dueIn !== undefined && (dueIn > 0 ? ` (in ${dueIn} ${dueIn === 1 ? 'day' : 'days'})` : dueIn === 0 ? ' (today)' : ` (${-dueIn} days overdue)`)}.</>}
            {c.status !== 'pending' && c.decidedOn && <>Decided {fmtDate(c.decidedOn)} ({ago(c.decidedOn)}). {c.status === 'denied' && c.note}</>}
            {' '}{scenes.length > 0 && <>Used in {scenes.map(({ s }, i) => <span key={s.n}>{i > 0 && ', '}<a href={L.scene(pid, s.n)}>Scene {s.n}</a> ({d.project.unit} {s.reel})</span>)}.</>}
          </p>
        </div>
        <StatusBadge status={c.status} size="lg" />
      </section>

      <div className="cols">
        <div className="col-main">
          <section className="card">
            <div className="card-head"><h2>Clearance record</h2><span className="sub">{MEANING[c.status].split('.')[0]}.</span></div>
            <dl className="kv">
              <div><dt>Status</dt><dd><StatusBadge status={c.status} size="sm" /></dd></div>
              <div><dt>Rights {c.status === 'pending' ? 'requested' : 'granted'}</dt><dd>{c.rights}</dd></div>
              <div><dt>Licence reference</dt><dd className="mono">{c.ref}</dd></div>
              {c.requestedOn && <div><dt>Request sent</dt><dd>{fmtDate(c.requestedOn, true)} by {c.requestedBy}</dd></div>}
              {c.expectedBy && <div><dt>Reply expected by</dt><dd>{fmtDate(c.expectedBy, true)} <span className="sub">({src.turnaround} turnaround)</span></dd></div>}
              {c.decidedOn && <div><dt>Decided</dt><dd>{fmtDate(c.decidedOn, true)}</dd></div>}
              <div><dt>Fee</dt><dd>{c.fee ?? (c.status === 'pending' ? 'No quote yet' : c.status === 'denied' ? '—' : 'None')}</dd></div>
              <div><dt>Licensor contact</dt><dd>{src.contact}<br /><span className="sub">{src.email}</span></dd></div>
            </dl>
            <p className="meaning">{MEANING[c.status]}</p>
          </section>

          <section className="card">
            <div className="card-head"><h2>Activity</h2><span className="sub">{log.length} entries</span></div>
            <ol className="timeline">
              {log.map((e, i) => (
                <li key={i} className={i === log.length - 1 ? 'latest' : ''}>
                  <span className="tl-dot" />
                  <div className="tl-body"><div className="tl-head"><b>{e.who}</b><span className="sub">{fmtDate(e.date, true)}</span></div><p>{e.text}</p></div>
                </li>
              ))}
            </ol>
            <form className="note-form" onSubmit={submit}>
              <label htmlFor="note" className="sr-only">Add a note to the clearance log</label>
              <textarea id="note" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a note for the team, e.g. who you spoke to and what they said" rows={2} />
              <button className="btn btn-primary" type="submit" disabled={!draft.trim()}><Icon name="plus" size={14} /> Add note</button>
            </form>
          </section>

          {siblings.length > 0 && (
            <section className="card">
              <div className="card-head"><h2>Other rolls of this story</h2><span className="sub">Same {src.name.split(' ')[0]} report, different footage and different licence</span></div>
              <table className="tbl">
                <thead><tr><th>Item</th><th>Roll</th><th>Used in</th><th>Clearance</th></tr></thead>
                <tbody>
                  {[it, ...siblings].sort((a, b) => a.roll - b.roll).map((x) => (
                    <tr key={x.id} className={x.id === it.id ? 'here' : ''}>
                      <td className="mono">{x.id === it.id ? <b>{x.id} (this item)</b> : <a href={L.item(pid, x.id)}>{x.id}</a>}</td>
                      <td>Roll {x.roll} of {x.rollCount}</td>
                      <td>{x.usages.length ? x.usages.map((u) => `Scene ${u.sceneN}`).join(', ') : <span className="muted">Not used</span>}</td>
                      <td><StatusBadge status={x.clearance.status} size="sm" short /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <aside className="col-side">
          <section className="card">
            <FrameThumb id={it.id} tone={it.tone} w="100%" h={170} label={`${it.id}${it.durSec && scenes[0] ? ' · ' + tc(scenes[0].u.srcIn) : ''}`} />
            <p className="sub thumb-note">Reference frame. The licensed master is held by {src.name.split(' ')[0]}.</p>
            <dl className="kv kv-tight">
              <div><dt>Description</dt><dd>{it.detail}</dd></div>
              <div><dt>Date</dt><dd>{it.date}</dd></div>
              <div><dt>Format</dt><dd>{it.format}</dd></div>
              <div><dt>Length</dt><dd>{it.durSec ? <span className="mono">{tc(it.durSec)}</span> : 'Still image'}</dd></div>
            </dl>
          </section>
          {scenes.length > 0 && (
            <section className="card">
              <div className="eyebrow">Used in the cut</div>
              <ul className="used">
                {scenes.map(({ u, s }) => (
                  <li key={s.n}>
                    <a href={L.scene(pid, s.n)}><b>Scene {s.n}</b> · {s.title}</a>
                    <span className="sub">{d.project.unit} {s.reel} · {d.reels[s.reel - 1].title}{it.durSec ? ` · source ${tc(u.srcIn)}–${tc(u.srcOut)} (${dur(u.srcOut - u.srcIn)})` : ''}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="card">
            <div className="eyebrow">Source</div>
            <h3>{src.name}</h3>
            <div className="sub">{src.kind}</div>
            <p className="small">{src.terms}</p>
            <a className="textlink" href={L.archive(pid, { source: src.id })}>All {sourceCount} items from this source <Icon name="arrow-right" size={12} /></a>
          </section>
        </aside>
      </div>
    </>
  );
}
