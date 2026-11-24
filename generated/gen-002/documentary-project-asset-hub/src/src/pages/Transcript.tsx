import { useEffect, useMemo, useRef, useState } from 'react';
import { DATA } from '../data';
import type { Transcript } from '../data/types';
import { L } from '../lib/router';
import { Icon } from '../components/ui';
import { dur, fmtDate, tc } from '../lib/util';
import { useStore } from '../lib/store';
import { copyText } from '../lib/copy';
import { itemMap, summarize } from '../lib/clearance';

export function passageText(t: Transcript, inSec: number, outSec: number) {
  return t.turns.filter((x) => x.who === 'S' && x.start >= inSec && x.start < outSec).map((x) => x.text);
}

function hl(text: string, q: string) {
  if (!q) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'));
  return parts.map((p, i) => (p.toLowerCase() === q.toLowerCase() ? <mark key={i} className="tr-mark">{p}</mark> : p));
}

export function TranscriptPage({ pid, id, scene }: { pid: string; id: string; scene?: number }) {
  const d = DATA[pid];
  const t = d.transcripts.find((x) => x.id === id);
  const { say } = useStore();
  const [find, setFind] = useState('');
  const [mi, setMi] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const focus = t?.usedIn.find((u) => u.sceneN === scene);

  useEffect(() => {
    if (!focus) return;
    const raf = requestAnimationFrame(() => {
      const el = body.current?.querySelector('[data-focus-first]') as HTMLElement | null;
      el?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(raf);
  }, [focus?.sceneN, id]);

  const matches = useMemo(() => (t && find.length > 1 ? t.turns.filter((x) => x.text.toLowerCase().includes(find.toLowerCase())).length : 0), [t, find]);
  useEffect(() => { setMi(0); }, [find]);
  const jump = (dir: 1 | -1) => {
    const els = body.current?.querySelectorAll('.tr-mark');
    if (!els || !els.length) return;
    const n = (mi + dir + els.length) % els.length;
    setMi(n);
    (els[n] as HTMLElement).scrollIntoView({ block: 'center' });
  };

  if (!t) return <div className="empty"><strong>No transcript “{id}”</strong><p><a href={L.transcripts(pid)}>All transcripts</a></p></div>;
  const inUsed = (start: number) => t.usedIn.find((u) => start >= u.inSec && start < u.outSec);
  const focusScene = focus ? d.scenes.find((s) => s.n === focus.sceneN)! : undefined;
  const before = focusScene ? d.scenes.find((s) => s.n === focusScene.n - 1) : undefined;
  const beforeSum = before ? summarize(before.archival.map((i) => itemMap(pid).get(i)!).filter(Boolean)) : undefined;

  const copyPassage = async () => {
    if (!focus) return;
    const txt = `${t.name} (${t.role})\nIN ${tc(focus.inSec)}  OUT ${tc(focus.outSec)}  (${dur(focus.outSec - focus.inSec)})  Scene ${focus.sceneN}\n\n` + passageText(t, focus.inSec, focus.outSec).join('\n\n');
    say((await copyText(txt)) ? 'Passage and timecodes copied' : 'Copy failed');
  };
  const copyTc = async () => { if (focus) say((await copyText(`${tc(focus.inSec)} - ${tc(focus.outSec)}`)) ? `Timecodes copied: ${tc(focus.inSec)} – ${tc(focus.outSec)}` : 'Copy failed'); };

  let prevWho = '';
  let firstFocusDone = false;
  return (
    <>
      <header className="ph">
        <div className="ph-main">
          <div className="eyebrow">Interview transcript · {d.project.title}</div>
          <h1>{t.name}</h1>
          <p className="lede">{t.role}</p>
          <div className="chips">
            <span className="chip">Recorded {fmtDate(t.recorded, true)}</span>
            <span className="chip">{t.location}</span>
            <span className="chip mono">{tc(t.durSec)}</span>
            <span className="chip">Interviewer: {t.interviewer}</span>
            <span className="chip">{t.status}</span>
          </div>
        </div>
      </header>

      <div className="cols cols-tr">
        <div className="col-main">
          <section className="card tr-card">
            <div className="tr-tools">
              <div className="findbox">
                <Icon name="search" size={14} />
                <input value={find} onChange={(e) => setFind(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') jump(e.shiftKey ? -1 : 1); }} placeholder="Find in this transcript" aria-label="Find in this transcript" />
                {find.length > 1 && <span className="sub">{matches} {matches === 1 ? 'passage' : 'passages'}</span>}
                {matches > 0 && <><button className="icon-btn" onClick={() => jump(-1)} aria-label="Previous match"><Icon name="chev-left" size={14} /></button><button className="icon-btn" onClick={() => jump(1)} aria-label="Next match"><Icon name="chev-right" size={14} /></button></>}
              </div>
              <span className="sub">Clean verbatim: crew chatter and false starts removed. Timecodes are source media timecode.</span>
            </div>
            <div className="tr-body" ref={body}>
              {t.turns.map((x, i) => {
                const u = inUsed(x.start);
                const isFocus = !!focus && x.start >= focus.inSec && x.start < focus.outSec;
                const who = x.who === 'S' ? t.name : t.interviewer;
                const showWho = who !== prevWho; prevWho = who;
                const first = isFocus && !firstFocusDone; if (first) firstFocusDone = true;
                const lastFocus = isFocus && !t.turns.slice(i + 1).some((y) => y.start >= focus!.inSec && y.start < focus!.outSec);
                return (
                  <div key={i}>
                    {first && <div className="mark-in" id="passage-in"><span>IN {tc(focus!.inSec)}</span><em>Scene {focus!.sceneN} · {d.reels[focusScene!.reel - 1].title}</em></div>}
                    <div className={`turn ${x.who === 'I' ? 'turn-q' : ''} ${u ? 'used' : ''} ${isFocus ? 'focus' : ''}`} {...(first ? { 'data-focus-first': true } : {})}>
                      <div className="turn-tc mono">{tc(x.start)}</div>
                      <div className="turn-txt">
                        {showWho && <div className="turn-who">{who}{u && !isFocus && <a className="used-tag" href={L.scene(pid, u.sceneN)}>Used in Scene {u.sceneN}</a>}</div>}
                        <p>{hl(x.text, find.length > 1 ? find : '')}</p>
                      </div>
                    </div>
                    {lastFocus && <div className="mark-out"><span>OUT {tc(focus!.outSec)}</span><em>{dur(focus!.outSec - focus!.inSec)} used</em></div>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="col-side sticky-side">
          {focus && focusScene ? (
            <section className="card focus-card" aria-label="Selected passage">
              <div className="eyebrow">Passage in Scene {focus.sceneN}</div>
              <div className="tc-big">
                <div><span>IN</span><b className="mono">{tc(focus.inSec)}</b></div>
                <div><span>OUT</span><b className="mono">{tc(focus.outSec)}</b></div>
                <div><span>LENGTH</span><b className="mono">{tc(focus.outSec - focus.inSec, false)}</b></div>
              </div>
              <div className="btn-row">
                <button className="btn btn-primary" onClick={copyPassage}><Icon name="copy" size={14} /> Copy passage</button>
                <button className="btn" onClick={copyTc}>Copy timecodes</button>
              </div>
              <hr />
              <a className="ctx-link" href={L.scene(pid, focusScene.n)}><span className="sub">Used in</span><b>Scene {focusScene.n} · {focusScene.title}</b></a>
              {before && <a className="ctx-link" href={L.scene(pid, before.n)}><span className="sub">Plays right after</span><b>Scene {before.n} · {before.title}</b>
                {beforeSum && beforeSum.total > 0 && <span className={`sub ${beforeSum.worst === 'pending' || beforeSum.worst === 'denied' ? 't-pending' : ''}`}>{beforeSum.worst === 'pending' ? 'Archival still pending clearance' : beforeSum.worst === 'denied' ? 'Archival denied' : 'Archival cleared'}</span>}</a>}
            </section>
          ) : (
            <section className="card"><div className="eyebrow">Selected passage</div><p className="small">Choose a passage below to jump to it. Passages already in the cut are shaded in the transcript.</p></section>
          )}
          <section className="card">
            <div className="eyebrow">Passages in the cut</div>
            {t.usedIn.length === 0 ? <p className="small">This interview isn’t used in any scene yet.</p> : (
              <ul className="pl">
                {t.usedIn.map((u) => {
                  const s = d.scenes.find((x) => x.n === u.sceneN)!;
                  const on = focus?.sceneN === u.sceneN;
                  return (
                    <li key={u.sceneN} className={on ? 'on' : ''}>
                      <a href={L.transcript(pid, t.id, { scene: u.sceneN })} aria-current={on ? 'true' : undefined}>
                        <b>Scene {u.sceneN}</b><span className="sub">{s.title}</span>
                        <span className="mono sub">{tc(u.inSec)} – {tc(u.outSec)} · {dur(u.outSec - u.inSec)}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="card">
            <div className="eyebrow">Media</div>
            <p className="mono small">{t.media}</p>
            <a className="textlink" href={L.clips(pid, { q: t.name.split(' ').slice(-1)[0] })}>Find {t.name.split(' ')[0]}’s clips <Icon name="arrow-right" size={12} /></a>
          </section>
        </aside>
      </div>
    </>
  );
}
