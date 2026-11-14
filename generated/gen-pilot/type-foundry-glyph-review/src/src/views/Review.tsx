import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clock, fullStamp, PEOPLE, styleById } from '../data/core';
import { glyphByChar } from '../data/glyphs';
import { REVISIONS, type Revision } from '../data/revisions';
import { useGo, useStore, useToast } from '../store';
import { revisionStats } from '../derive';
import { Avatar, Icon, Seg, Spec, StatusPill, Toggle } from '../components/ui';
import { GlyphCanvas, PathText, type CanvasMode } from '../components/GlyphCanvas';
import { diffOutlines, getOutline, undoEdits, useStyleFonts } from '../outline';

const GROUPS: Array<{ title: string; filter: (r: Revision) => boolean }> = [
  { title: 'Eleni Markou · Regular', filter: (r) => r.author === 'eleni' && r.style === 'regular' },
  { title: 'Eleni Markou · Bold', filter: (r) => r.author === 'eleni' && r.style === 'bold' },
  { title: 'Tomás Reis · Light', filter: (r) => r.author === 'tomas' },
];

function Measured({ rev }: { rev: Revision }) {
  const sf = useStyleFonts(rev.style);
  const d = useMemo(() => {
    if (!sf) return null;
    const now = getOutline(sf, rev.ch);
    return now ? diffOutlines(undoEdits(now, rev.edits), now) : null;
  }, [sf, rev]);
  if (!d) return null;
  return (
    <dl className="measured">
      <div><dt>Points moved</dt><dd>{d.moved} <span>of {d.total}</span></dd></div>
      <div><dt>Largest shift</dt><dd>{d.maxShift} <span>units</span></dd></div>
      <div><dt>Advance width</dt><dd>{d.dAdvance === 0 ? 'unchanged' : d.dAdvance}</dd></div>
    </dl>
  );
}

export function Review() {
  const { s, dispatch } = useStore();
  const go = useGo();
  const toast = useToast();
  const [onlyPending, setOnlyPending] = useState(false);
  const [mode, setMode] = useState<CanvasMode>('overlay');
  const [points, setPoints] = useState(true);
  const [metrics, setMetrics] = useState(true);
  const [comment, setComment] = useState('');
  const [needComment, setNeedComment] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const fallback = REVISIONS.find((r) => s.decisions[r.id].decision === 'pending') ?? REVISIONS[0];
  const rev = REVISIONS.find((r) => r.id === s.route.id) ?? fallback;
  const dec = s.decisions[rev.id];
  const glyph = glyphByChar(rev.ch)!;
  const stats = revisionStats(s);
  const author = PEOPLE[rev.author];

  const visible = REVISIONS.filter((r) => !onlyPending || s.decisions[r.id].decision === 'pending' || r.id === rev.id);
  const idx = visible.findIndex((r) => r.id === rev.id);
  const select = useCallback((id: string) => { dispatch({ type: 'go', route: { view: 'review', id } }); setComment(''); setNeedComment(false); }, [dispatch]);
  const nextPending = () => {
    const after = [...REVISIONS.slice(REVISIONS.indexOf(rev) + 1), ...REVISIONS.slice(0, REVISIONS.indexOf(rev))];
    return after.find((r) => s.decisions[r.id].decision === 'pending' && r.id !== rev.id);
  };

  const decide = (decision: 'approved' | 'sent-back') => {
    if (decision === 'sent-back' && !comment.trim()) { setNeedComment(true); commentRef.current?.focus(); return; }
    const prev = s.decisions[rev.id];
    dispatch({ type: 'decide', id: rev.id, decision, comment: comment.trim() || undefined });
    toast(
      decision === 'approved'
        ? `${rev.ch} ${styleById(rev.style).name} approved`
        : `${rev.ch} ${styleById(rev.style).name} sent back to ${author.first} with your comment`,
      { type: 'decide', id: rev.id, decision: prev.decision },
    );
    const n = nextPending();
    if (n) select(n.id); else setComment('');
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); const n = visible[Math.min(visible.length - 1, idx + 1)]; if (n) select(n.id); }
      if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); const n = visible[Math.max(0, idx - 1)]; if (n) select(n.id); }
      if (e.key === 'a' && dec.decision === 'pending') decide('approved');
      if (e.key === 's' && dec.decision === 'pending') { e.preventDefault(); commentRef.current?.focus(); }
      if (e.key === '1') setMode('overlay');
      if (e.key === '2') setMode('side');
      if (e.key === '3') setMode('now');
      if (e.key === 'p') setPoints((v) => !v);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const editsMap = useMemo(() => {
    const m = new Map<string, Revision['edits']>();
    for (const r of REVISIONS) if (r.style === rev.style && r.author === rev.author) m.set(r.ch, r.edits);
    return m;
  }, [rev.style, rev.author]);
  const editsFor = useCallback((ch: string) => editsMap.get(ch), [editsMap]);
  const thread = s.threads.find((t) => t.ch === rev.ch && (t.style === rev.style || rev.ch === 'ς'));
  const kernDeps = rev.style === 'bold' ? s.kernPairs.filter((p) => p.left === rev.ch || p.right === rev.ch) : [];
  const authorLocal = clock(rev.at + author.tzOffsetFromLisbon * 60);

  return (
    <div className="review">
      <aside className="rev-list">
        <div className="rl-head">
          <div>
            <h2>Glyph revisions</h2>
            <div className="sub">{stats.total - stats.pending} of {stats.total} decided</div>
          </div>
          <Toggle on={onlyPending} onChange={setOnlyPending} label="To review only" />
        </div>
        <div className="rl-scroll">
          {GROUPS.map((g) => {
            const items = visible.filter(g.filter);
            if (!items.length) return null;
            return (
              <div key={g.title} className="rl-group">
                <div className="rl-group-title">{g.title}</div>
                {items.map((r) => {
                  const d = s.decisions[r.id].decision;
                  return (
                    <button key={r.id} className={`rl-item ${r.id === rev.id ? 'on' : ''} d-${d}`} onClick={() => select(r.id)}>
                      <Spec ch={r.ch} style={r.style} size={24} className="rl-glyph" />
                      <span className="rl-name">{glyphByChar(r.ch)?.name}</span>
                      <span className="rl-time">{clock(r.at)}</span>
                      <span className={`rl-dot d-${d}`} title={d}>{d === 'approved' ? <Icon.check size={10} /> : d === 'sent-back' ? <Icon.cross size={10} /> : null}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="kbd-hint"><kbd>J</kbd><kbd>K</kbd> move · <kbd>A</kbd> approve · <kbd>S</kbd> comment · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> view</div>
      </aside>

      <section className="rev-stage">
        <div className="stage-head">
          <div className="sh-title">
            <Spec ch={rev.ch} style={rev.style} size={34} />
            <div>
              <h1>{glyph.name} <span className="muted">· {styleById(rev.style).name}</span></h1>
              <div className="sub mono">{glyph.cp} · {glyph.script === 'greek' ? 'Greek' : 'Latin'} · {idx + 1} of {visible.length}</div>
            </div>
          </div>
          <div className="sh-tools">
            <Seg value={mode} onChange={setMode} options={[
              { value: 'overlay', label: 'Overlay', title: 'Tuesday outline in red over current (1)' },
              { value: 'side', label: 'Side by side', title: '2' },
              { value: 'now', label: 'Now only', title: '3' },
            ]} />
            <Toggle on={points} onChange={setPoints} label="Points" />
            <Toggle on={metrics} onChange={setMetrics} label="Metrics" />
          </div>
        </div>
        <div className="stage-canvas">
          <GlyphCanvas key={rev.id + mode} style={rev.style} ch={rev.ch} edits={rev.edits} mode={mode} points={points} metrics={metrics} height={mode === 'side' ? 400 : 452} />
          {mode === 'overlay' && (
            <div className="canvas-legend">
              <span><i className="lg-before" /> Tue 11 Nov 16:40</span>
              <span><i className="lg-now" /> Now ({author.first}, {clock(rev.at)})</span>
              {points && <span><i className="lg-moved" /> moved point</span>}
            </div>
          )}
        </div>
        <div className="context">
          <div className="ctx-row">
            <span className="ctx-label">Tue</span>
            <PathText style={rev.style} text={rev.context} size={46} editsFor={editsFor} className="ctx-before" />
            <PathText style={rev.style} text={rev.context} size={13} editsFor={editsFor} className="ctx-small" />
          </div>
          <div className="ctx-row">
            <span className="ctx-label">Now</span>
            <PathText style={rev.style} text={rev.context} size={46} />
            <PathText style={rev.style} text={rev.context} size={13} className="ctx-small" />
          </div>
        </div>
      </section>

      <aside className="rev-inspector">
        <div className="ri-author">
          <Avatar id={rev.author} size={30} />
          <div>
            <b>{author.name}</b>
            <div className="sub">{fullStamp(rev.at)}{author.tzOffsetFromLisbon ? ` · ${authorLocal} in ${author.city}` : ''}</div>
          </div>
        </div>
        <blockquote className="note">{rev.note}</blockquote>
        <Measured rev={rev} />

        {thread && (
          <button className="related" onClick={() => go('comments', thread.id)}>
            <Icon.bubble /> <span><b>{thread.subject}</b><br /><span className="sub">{thread.messages.length} message{thread.messages.length > 1 ? 's' : ''} · {thread.resolved ? 'resolved' : 'open'}{thread.to === 'ines' ? ' · for you' : ''}</span></span>
          </button>
        )}
        {kernDeps.length > 0 && (
          <button className="related warn" onClick={() => go('kerning', kernDeps[0].id)}>
            <Icon.flag /> <span><b>Jonas kerned {kernDeps.length} pair{kernDeps.length > 1 ? 's' : ''} against this outline</b><br />
              <span className="sub">{kernDeps.map((p) => p.left + p.right).join(', ')} — sending it back means re-kerning</span></span>
          </button>
        )}

        <div className="decision-box">
          <div className="db-state">
            <span>Decision</span>
            <StatusPill status={dec.decision === 'pending' ? 'pending' : dec.decision} />
          </div>
          {dec.decision === 'pending' ? (
            <>
              <textarea
                ref={commentRef}
                className={needComment ? 'need' : ''}
                placeholder={`Comment for ${author.first} — required to send back`}
                value={comment}
                onChange={(e) => { setComment(e.target.value); setNeedComment(false); }}
                rows={4}
              />
              {needComment && <div className="field-err">Say what to change before sending it back.</div>}
              <div className="db-actions">
                <button className="btn approve" onClick={() => decide('approved')}><Icon.check /> Approve</button>
                <button className="btn sendback" onClick={() => decide('sent-back')}>Send back</button>
              </div>
              <div className="sub center">Approving sets the glyph to <b>approved</b> in {styleById(rev.style).name}. Sending back returns it to <b>draft</b> and opens a thread for {author.first}.</div>
            </>
          ) : (
            <>
              <p className="small">
                {dec.decision === 'approved' ? 'Approved' : 'Sent back'} by you at {clock(dec.at)}.
                {dec.comment && <><br />“{dec.comment}”</>}
              </p>
              <button className="btn ghost" onClick={() => dispatch({ type: 'decide', id: rev.id, decision: 'pending' })}>Undo decision</button>
            </>
          )}
        </div>
        <div className="ri-nav">
          <button className="btn ghost" disabled={idx <= 0} onClick={() => select(visible[idx - 1].id)}>← Previous</button>
          <button className="btn ghost" disabled={idx >= visible.length - 1} onClick={() => select(visible[idx + 1].id)}>Next →</button>
        </div>
      </aside>
    </div>
  );
}
