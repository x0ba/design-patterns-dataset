import { useMemo } from 'react';
import { CRITIQUE_CRITERIA, CRITIQUE_HISTORY, PEER_DRAFTS, PeerDraft, RATING_LABELS } from '../data/course';
import { CRITIQUE_DUE, CritiqueState, MIN_WORDS, countdown, critiqueProgress, fmtDayTime, nowMs, relTime, useNow, useStore, wordCount } from '../store';
import { Icon } from '../components/Icon';
import { StackedArea, TruncatedBars, sliceYears } from '../components/charts';
import { CORE_IDS, monthlySeries, monthsFor, versionMonthCount } from '../data/bike';
import { Progress } from './Brief';

function PeerChart({ p, width, height }: { p: PeerDraft; width: number; height: number }) {
  const data = useMemo(() => sliceYears(monthlySeries(3, CORE_IDS), monthsFor(versionMonthCount(3)), 2019, 2025), []);
  if (p.chartKind === 'stacked') {
    return <StackedArea series={data.series} months={data.months} width={width} height={height} colors={['#e6194b', '#f58231', '#ffe119', '#3cb44b']} title={p.chartTitle} />;
  }
  return <TruncatedBars series={data.series} months={data.months} width={width} height={height} baseline={30} title={p.chartTitle} />;
}

export function CritiquePage() {
  const { state } = useStore();
  const now = useNow();
  const done = PEER_DRAFTS.filter((p) => state.critiques[p.id].submittedAt).length;
  return (
    <div className="page-wide">
      <div className="crumbs"><span>Critique rounds</span><span>›</span><span>Round 3</span></div>
      <div className="week-head">
        <div>
          <h1 className="page-title">Critique Round 3 · PS4 work-in-progress</h1>
          <p className="lede">Review two classmates’ PS4 drafts against four criteria. Reviews are anonymous both ways and released to authors Wed Nov 18 at 9:00am, so they can revise before Thursday.</p>
        </div>
        <div className={'due-box' + (done === 2 ? ' ok' : '')}>
          <div className="small">{done === 2 ? 'Both submitted' : 'Due tonight, 11:59pm'}</div>
          <div className="countdown mono">{done === 2 ? '✓' : countdown(CRITIQUE_DUE, now)}</div>
          <div className="small">{done} of 2 submitted</div>
        </div>
      </div>

      <div className="peer-cards">
        {PEER_DRAFTS.map((p, i) => {
          const c = state.critiques[p.id];
          const pr = critiqueProgress(c);
          return (
            <a key={p.id} className="card peer-card" href={`#/critique/${p.id}`}>
              <div className="pc-head">
                <div><span className="mono strong">#{p.id}</span> <span className="muted">· {p.author} · draft {i + 1} of 2</span></div>
                {c.submittedAt ? <span className="pill ok"><Icon name="check" /> Submitted {fmtDayTime(c.submittedAt)}</span> : pr.done ? <span className="pill warn">In progress</span> : <span className="pill new">Not started</span>}
              </div>
              <div className="pc-chart"><PeerChart p={p} width={500} height={230} /></div>
              <div className="pc-foot">
                <Progress done={pr.done} total={4} tone="alert" />
                <span className="btn primary sm">{c.submittedAt ? 'View review' : pr.done ? 'Continue' : 'Start review'} <Icon name="arrow-right" /></span>
              </div>
            </a>
          );
        })}
      </div>

      <div className="week-cols">
        <div className="card">
          <h2 className="sec-title">How to review</h2>
          <ul className="bullets">
            <li>For each criterion, pick a rating and write at least {MIN_WORDS} words. Say what you saw, why it matters, and what to try.</li>
            <li>Click on a chart to drop numbered pins; refer to them as [1], [2] in your comments.</li>
            <li>Be specific and kind. “The y-axis starts at 30k, which makes 30th St look 5× smaller than Harbor Dr” beats “axis is misleading”.</li>
            <li>Your answers autosave. Nothing is sent until you press Submit.</li>
          </ul>
        </div>
        <div className="card">
          <h2 className="sec-title">Your own draft</h2>
          <p>Your PS4 draft (#A-0433) went to two reviewers. Their feedback arrives <b>Wed Nov 18, 9:00am</b>.</p>
          <h3 className="sub-title">Earlier rounds</h3>
          <table className="list-table compact">
            <tbody>
              {CRITIQUE_HISTORY.map((h) => (
                <tr key={h.round}><td>Round {h.round}</td><td>{h.on}</td><td className="muted small">due {h.due}</td><td><span className="pill ok sm">{h.given} given · {h.received} received</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CritiqueEditor({ id }: { id: string }) {
  const p = PEER_DRAFTS.find((x) => x.id === id);
  const { state, update, toast } = useStore();
  const now = useNow();
  if (!p) return <div className="empty-page">Draft not found.</div>;
  const c = state.critiques[p.id];
  const submitted = !!c.submittedAt;
  const idx = PEER_DRAFTS.indexOf(p);
  const other = PEER_DRAFTS[1 - idx];
  const otherDone = !!state.critiques[other.id].submittedAt;
  const pr = critiqueProgress(c);

  const set = (fn: (cs: CritiqueState) => CritiqueState) =>
    update((s) => ({ ...s, critiques: { ...s.critiques, [p.id]: { ...fn(s.critiques[p.id]), lastEdited: nowMs() } } }));

  const addPin = (e: React.MouseEvent<HTMLDivElement>) => {
    if (submitted) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (c.pins.length >= 9) return toast('Up to 9 pins per draft');
    const n = (c.pins.reduce((m, pp) => Math.max(m, pp.n), 0) || 0) + 1;
    set((cs) => ({ ...cs, pins: [...cs.pins, { n, x, y }] }));
  };

  return (
    <div className="critique">
      <div className="draft-head">
        <div>
          <div className="crumbs"><a href="#/critique">Critique Round 3</a><span>›</span><span>#{p.id}</span></div>
          <h1 className="page-title">Draft <span className="mono">#{p.id}</span> <span className="muted thin">by {p.author}</span></h1>
        </div>
        <div className="draft-actions">
          <div className="seg">
            {PEER_DRAFTS.map((x, i) => (
              <a key={x.id} href={`#/critique/${x.id}`} className={x.id === p.id ? 'on' : ''}>
                {i + 1}. #{x.id} {state.critiques[x.id].submittedAt ? '✓' : `${critiqueProgress(state.critiques[x.id]).done}/4`}
              </a>
            ))}
          </div>
          <span className={'save-state' + (!submitted && !c.lastEdited ? ' saving' : '')}>{submitted ? `Submitted ${fmtDayTime(c.submittedAt!)}` : c.lastEdited ? `Autosaved ${relTime(c.lastEdited, now)}` : 'Not started'}</span>
        </div>
      </div>

      {submitted && (
        <div className="callout ok">
          <div className="callout-icon"><Icon name="check" size={18} /></div>
          <div className="callout-body">
            <b>Review submitted.</b> {otherDone ? 'Both Round 3 reviews are in — you’re done for tonight.' : `One more to go: #${other.id} by ${other.author}.`}
            <div className="callout-actions">
              {!otherDone && <a className="btn primary sm" href={`#/critique/${other.id}`}>Review #{other.id}</a>}
              <a className={'btn sm' + (otherDone ? ' primary' : '')} href="#/draft/ps4">Back to my PS4 draft</a>
              <button className="btn-link" onClick={() => set((cs) => ({ ...cs, submittedAt: undefined }))}>Reopen to edit</button>
            </div>
          </div>
        </div>
      )}

      <div className="crit-grid">
        <div className="crit-left">
          <div className="card">
            <div className="chart-pin-wrap">
              <PeerChart p={p} width={600} height={330} />
              <div className={'pin-layer' + (submitted ? ' locked' : '')} onClick={addPin} title={submitted ? '' : 'Click to drop a pin'}>
                {c.pins.map((pin) => (
                  <button key={pin.n} className="pin" style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    onClick={(e) => { e.stopPropagation(); if (!submitted) set((cs) => ({ ...cs, pins: cs.pins.filter((q) => q.n !== pin.n) })); }}
                    title={submitted ? `Pin ${pin.n}` : `Pin ${pin.n} — click to remove`}>{pin.n}</button>
                ))}
              </div>
            </div>
            <div className="pin-hint muted small"><Icon name="pin" /> {submitted ? `${c.pins.length} pins` : 'Click the chart to drop a numbered pin, then refer to it as [1] in a comment. Click a pin to remove it.'}</div>
          </div>
          <div className="card">
            <div className="rail-head">Author’s note</div>
            <p>{p.authorNote}</p>
            <div className="asked"><b>They asked:</b> {p.askedFor}</div>
            <div className="muted small">Submitted {p.submitted} · data: bike counts v3 · {p.attemptsShown} of 3 charts shared for review</div>
          </div>
          <div className="card muted small">
            Reviewing helps your own draft too: if something here trips you up, check whether <a href="#/draft/ps4">your attempts</a> do the same thing.
          </div>
        </div>

        <div className="crit-right">
          {CRITIQUE_CRITERIA.map((cr, i) => {
            const rating = c.ratings[cr.id];
            const text = c.comments[cr.id] || '';
            const wc = wordCount(text);
            const complete = rating && wc >= MIN_WORDS;
            return (
              <div key={cr.id} className={'card criterion' + (complete ? ' complete' : '')}>
                <div className="cr-head">
                  <span className="cr-n">{complete ? <Icon name="check" size={13} /> : i + 1}</span>
                  <div>
                    <div className="cr-name">{cr.name}</div>
                    <div className="muted small">{cr.prompt}</div>
                  </div>
                </div>
                <div className="ratings" role="radiogroup" aria-label={cr.name}>
                  {RATING_LABELS.map((l, k) => (
                    <button key={l} role="radio" aria-checked={rating === k + 1} disabled={submitted} className={'rate' + (rating === k + 1 ? ' on' : '')}
                      onClick={() => set((cs) => ({ ...cs, ratings: { ...cs.ratings, [cr.id]: k + 1 } }))}>
                      <span className="rate-n">{k + 1}</span>{l}
                    </button>
                  ))}
                </div>
                <textarea value={text} disabled={submitted} rows={3}
                  placeholder={cr.id === 'revision' ? 'e.g. “Split the stack into four small multiples with a shared y-scale so…”' : 'What you noticed, why it matters, what to try.'}
                  onChange={(e) => set((cs) => ({ ...cs, comments: { ...cs.comments, [cr.id]: e.target.value } }))} />
                <div className="cr-foot">
                  {!submitted && c.pins.length > 0 && (
                    <span className="pin-refs">
                      {c.pins.map((pin) => (
                        <button key={pin.n} className="chip-btn" onClick={() => set((cs) => ({ ...cs, comments: { ...cs.comments, [cr.id]: (cs.comments[cr.id] || '').replace(/\s*$/, (cs.comments[cr.id] || '').trim() ? ' ' : '') + `[${pin.n}] ` } }))}>[{pin.n}]</button>
                      ))}
                    </span>
                  )}
                  <span className={'wc ' + (wc >= MIN_WORDS ? 'ok' : '')}>{wc}/{MIN_WORDS} words min</span>
                </div>
              </div>
            );
          })}
          {!submitted && (
            <div className="submit-bar card">
              <Progress done={pr.done} total={4} tone="alert" />
              <span className="muted small">{pr.done === 4 ? 'Ready to submit.' : `${4 - pr.done} criteria still need a rating and ${MIN_WORDS}+ words.`}</span>
              <button className="btn primary" disabled={pr.done < 4} onClick={() => { set((cs) => ({ ...cs, submittedAt: nowMs() })); toast(`Review of #${p.id} submitted`); document.querySelector('.main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <Icon name="send" /> Submit review
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
