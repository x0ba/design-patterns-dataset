import { useState } from 'react';
import { CLIENT, DAYS_LEFT, DEADLINE_LABEL, PEOPLE, STYLES, clock, fullStamp, rel, styleById, type Script, type StyleId } from '../data/core';
import { INITIAL_PRESENCE } from '../data/access';
import { skey } from '../data/glyphs';
import { lockKey, useGo, useStore, useToast } from '../store';
import { lockReadiness } from '../derive';
import { Avatar, Bar, Icon, Modal, Spec, StatusPill } from '../components/ui';
import { GlyphCanvas } from '../components/GlyphCanvas';

const DEFAULT_MESSAGE = `Hi Marieke — Calloway Regular is ready for a first look: the full Latin set, locked as final. You can view every glyph and leave comments directly on them; nothing you do can change the font. Greek and the other weights follow before ${DEADLINE_LABEL}. — Ines`;

export function Release() {
  const { s, dispatch } = useStore();
  const go = useGo();
  const toast = useToast();
  const [style, setStyle] = useState<StyleId>('regular');
  const [script, setScript] = useState<Script>('latin');
  const [peek, setPeek] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'lock' | 'unlock' | null>(null);
  const [msg, setMsg] = useState(DEFAULT_MESSAGE);

  const r = lockReadiness(s, style, script);
  const name = `${styleById(style).name} ${script === 'latin' ? 'Latin' : 'Greek'}`;
  const lr = lockReadiness(s, 'regular', 'latin');
  const marieke = s.share.marieke;
  const peekGlyph = r.inReview.find((g) => g.id === peek) ?? r.inReview[0];
  const othersInStyle = (['tomas', 'eleni', 'jonas'] as const).filter((id) => {
    const a = s.access[id];
    const inStyle = a.styles === 'all' || a.styles.includes(style);
    const touches = a.outlines === 'all' || (a.outlines === 'greek' && script === 'greek') || a.spacing || a.kerning;
    return inStyle && touches;
  });

  const approve = (glyphId: string, ch: string) => {
    dispatch({ type: 'setStatus', style, glyphId, status: 'approved' });
    toast(`${ch} approved in ${styleById(style).name}`, { type: 'setStatus', style, glyphId, status: 'review' });
  };

  return (
    <div className="release">
      <div className="page-head compact">
        <div className="eyebrow">Delivery to {CLIENT} · {DEADLINE_LABEL} · {DAYS_LEFT} days</div>
        <h1>Lock & share</h1>
        <p className="lede">Lock a set as final when every glyph in it is approved. Then share it read-only with the client.</p>
      </div>

      <div className="release-body">
        <div className="rl-col">
          <table className="matrix">
            <thead><tr><th>Style</th><th>Latin · 408</th><th>Greek · 204</th></tr></thead>
            <tbody>
              {STYLES.map((st) => (
                <tr key={st.id}>
                  <td className="m-style" style={{ fontWeight: st.weight, fontStyle: st.italic ? 'italic' : 'normal' }}>{st.name}</td>
                  {(['latin', 'greek'] as Script[]).map((sc) => {
                    const x = lockReadiness(s, st.id, sc);
                    const on = st.id === style && sc === script;
                    return (
                      <td key={sc}>
                        <button className={`m-cell ${on ? 'on' : ''} ${x.locked ? 'locked' : ''}`} onClick={() => { setStyle(st.id); setScript(sc); setPeek(null); }}>
                          <span className="m-top">
                            <b>{x.counts.approved}</b>/{x.total}
                            {x.locked ? <span className="m-lock"><Icon.lock size={10} /> final</span> : x.ready ? <span className="m-ready">ready</span> : null}
                          </span>
                          <Bar approved={x.counts.approved} review={x.counts.review} draft={x.counts.draft} height={4} />
                          <span className="m-sub">{x.counts.review ? `${x.counts.review} review` : ''}{x.counts.review && x.counts.draft ? ' · ' : ''}{x.counts.draft ? `${x.counts.draft} draft` : ''}{!x.counts.review && !x.counts.draft ? 'all approved' : ''}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="lock-panel">
          <div className="lp-head">
            <div>
              <h2>{name}</h2>
              <div className="sub">{r.total} glyphs · {r.locked ? 'locked as final' : 'open for editing'}</div>
            </div>
            {r.locked
              ? <button className="btn" onClick={() => setConfirm('unlock')}>Unlock</button>
              : <button className="btn primary" disabled={!r.ready} onClick={() => setConfirm('lock')}><Icon.lock /> Lock as final</button>}
          </div>

          <ul className="checklist">
            <li className={r.counts.review + r.counts.draft === 0 ? 'yes' : 'no'}>
              <span className="ck">{r.counts.review + r.counts.draft === 0 ? <Icon.check /> : <Icon.cross />}</span>
              <div>
                <b>{r.counts.review + r.counts.draft === 0 ? `All ${r.total} glyphs approved` : `${r.counts.approved} of ${r.total} approved — ${r.counts.review + r.counts.draft} left`}</b>
                {script === 'latin' && r.inReview.length > 0 && r.inReview.length <= 12 && (
                  <div className="pending-glyphs">
                    <div className="pg-list">
                      {r.inReview.map((g) => (
                        <button key={g.id} className={`pg ${peekGlyph?.id === g.id ? 'on' : ''}`} onClick={() => setPeek(g.id)}>
                          <Spec ch={g.ch} style={style} size={28} />
                          <span className="pg-name">{g.name}</span>
                          <StatusPill status={s.statuses[skey(style, g.id)]} />
                        </button>
                      ))}
                    </div>
                    {peekGlyph && (
                      <div className="pg-peek">
                        <GlyphCanvas key={style + peekGlyph.id} style={style} ch={peekGlyph.ch} mode="now" height={250} metrics points />
                        <div className="pg-actions">
                          <span className="small">{peekGlyph.name} · drawn by Tomás</span>
                          <button className="btn approve sm" onClick={() => approve(peekGlyph.id, peekGlyph.ch)}><Icon.check /> Approve</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {(script === 'greek' || r.inReview.length > 12) && r.counts.review + r.counts.draft > 0 && (
                  <button className="link" onClick={() => go(script === 'greek' && style !== 'regular' && style !== 'bold' ? 'glyphs' : 'glyphs', style)}>Open {styleById(style).name} glyphs <Icon.arrow /></button>
                )}
              </div>
            </li>
            <li className={r.threads.length === 0 ? 'yes' : 'no'}>
              <span className="ck">{r.threads.length === 0 ? <Icon.check /> : <Icon.cross />}</span>
              <div>
                <b>{r.threads.length === 0 ? 'No open comment threads in this set' : `${r.threads.length} open thread${r.threads.length > 1 ? 's' : ''}`}</b>
                {r.threads.map((t) => (
                  <div key={t.id} className="thread-inline">
                    <Spec ch={t.ch!} style={t.style} size={20} />
                    <span><b>{t.subject}</b> — {PEOPLE[t.messages[0].author].first}, {rel(t.messages[0].at, s.now)}</span>
                    <button className="btn sm ghost" onClick={() => go('comments', t.id)}>Open</button>
                    <button className="btn sm" onClick={() => { dispatch({ type: 'resolve', threadId: t.id, resolved: true }); toast(`“${t.subject}” resolved`, { type: 'resolve', threadId: t.id, resolved: false }); }}>Resolve</button>
                  </div>
                ))}
              </div>
            </li>
            <li className={r.activeHere.length ? 'warn' : 'yes'}>
              <span className="ck">{r.activeHere.length ? <Icon.flag /> : <Icon.check />}</span>
              <div>
                <b>{r.activeHere.length ? `Jonas is working in ${styleById(style).name} right now` : `Nobody is editing ${styleById(style).name} right now`}</b>
                {!r.activeHere.length && style === 'regular' && <div className="small">Jonas is in Bold. Last change to Regular kerning: Mon 3 Nov.</div>}
              </div>
            </li>
          </ul>

          <div className="effects">
            <h3>{r.locked ? 'While locked' : 'Locking will'}</h3>
            <ul>
              <li>Freeze outlines, spacing and kerning for these {r.total} glyphs. {othersInStyle.length ? `${othersInStyle.map((id) => PEOPLE[id].first).join(', ')} keep${othersInStyle.length === 1 ? 's' : ''} their other access but can’t change this set.` : ''}</li>
              <li>Mark the set <b>Final</b> for anyone viewing it, including the client.</li>
              <li>Only you can unlock. Unlocking is recorded in the history.</li>
            </ul>
          </div>
          {!r.ready && !r.locked && <p className="small blocker">To lock: {[r.counts.review + r.counts.draft ? `approve the remaining ${r.counts.review + r.counts.draft}` : '', r.threads.length ? `resolve ${r.threads.length} thread${r.threads.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ')}.</p>}
        </section>

        <section className="share-panel">
          <div className="sp-head">
            <Avatar id="marieke" size={36} dim={!marieke.resentAt} />
            <div>
              <h2>Marieke de Wit</h2>
              <div className="sub">Art director, {CLIENT} · view & comment only</div>
            </div>
          </div>
          <div className="sp-status">
            Invited {fullStamp(INITIAL_PRESENCE.marieke.kind === 'invited' ? INITIAL_PRESENCE.marieke.invitedAt : 0)} · <b>not joined yet</b>
            {marieke.resentAt && <><br />Invitation re-sent today at {clock(marieke.resentAt)}</>}
          </div>
          <div className="field">
            <label>Marieke can see</label>
            <label className={`radio ${marieke.scope === 'regular-latin' ? 'on' : ''}`}>
              <input type="radio" checked={marieke.scope === 'regular-latin'} onChange={() => { dispatch({ type: 'share', scope: 'regular-latin' }); toast('Marieke will see Regular only'); }} />
              <span><b>Regular only</b> — the set you’re handing over{lr.locked ? '' : '. Not locked yet'}</span>
            </label>
            <label className={`radio ${marieke.scope === 'all' ? 'on' : ''}`}>
              <input type="radio" checked={marieke.scope === 'all'} onChange={() => { dispatch({ type: 'share', scope: 'all' }); toast('Marieke will see all six styles'); }} />
              <span><b>All six styles</b> — includes work in progress and open drafts</span>
            </label>
          </div>
          {!lr.locked && marieke.scope === 'regular-latin' && (
            <div className="warnbox"><Icon.flag /> Regular Latin isn’t locked yet. Marieke would see {lr.counts.review} glyph{lr.counts.review === 1 ? '' : 's'} still in review and might see glyphs change after the first look.</div>
          )}
          <div className="field">
            <label>Message with the invitation</label>
            <textarea rows={6} value={msg} onChange={(e) => setMsg(e.target.value)} />
          </div>
          <button className="btn primary block" onClick={() => {
            dispatch({ type: 'share', scope: marieke.scope, message: msg, resend: true });
            toast(`Invitation re-sent to Marieke de Wit (${marieke.scope === 'regular-latin' ? 'Regular only' : 'all styles'}, view & comment)`);
          }}>
            {marieke.resentAt ? 'Send again' : 'Re-send invitation'}
          </button>
        </section>
      </div>

      {confirm === 'lock' && (
        <Modal title={`Lock ${name} as final?`} onClose={() => setConfirm(null)} footer={<>
          <button className="btn ghost" onClick={() => setConfirm(null)}>Cancel</button>
          <button className="btn primary" onClick={() => {
            dispatch({ type: 'lock', key: lockKey(style, script), on: true });
            toast(`${name} locked as final`, { type: 'lock', key: lockKey(style, script), on: false });
            setConfirm(null);
          }}><Icon.lock /> Lock {r.total} glyphs</button>
        </>}>
          <p>All {r.total} glyphs are approved and nothing is open. After locking, outlines, spacing and kerning in {name} are read-only for Tomás, Eleni and Jonas. Eleni’s Greek and Jonas’s Bold kerning are not affected.</p>
          <p className="small">You can unlock at any time; unlocking is recorded.</p>
        </Modal>
      )}
      {confirm === 'unlock' && (
        <Modal title={`Unlock ${name}?`} onClose={() => setConfirm(null)} footer={<>
          <button className="btn ghost" onClick={() => setConfirm(null)}>Cancel</button>
          <button className="btn sendback" onClick={() => {
            dispatch({ type: 'lock', key: lockKey(style, script), on: false });
            toast(`${name} unlocked`, { type: 'lock', key: lockKey(style, script), on: true });
            setConfirm(null);
          }}>Unlock</button>
        </>}>
          <p>Collaborators with access will be able to edit {name} again. {marieke.scope === 'regular-latin' && style === 'regular' ? 'Marieke will no longer see it marked Final.' : ''}</p>
        </Modal>
      )}
    </div>
  );
}
