import { PEER_DRAFTS, PROBLEM_SETS, PS4_RUBRIC, READINGS } from '../data/course';
import { CRITIQUE_DUE, PS4_DUE, countdown, critiqueProgress, fmtDayTime, relTime, useNow, useStore, wordCount } from '../store';
import { Icon } from '../components/Icon';
import { LivesIn, week5Items } from '../components/Shell';
import { Glyph } from './Draft';

function Ref({ to, children, hint }: { to: string; children: React.ReactNode; hint: string }) {
  return (
    <a href={'#' + to} className="ref" data-hint={hint}>
      {children}
    </a>
  );
}

export function BriefPage({ n }: { n: number }) {
  if (n !== 4) return <OtherBrief n={n} />;
  return <PS4Brief />;
}

function PS4Brief() {
  const { state, update } = useStore();
  const now = useNow();
  const items = week5Items(state);
  const left = items.filter((i) => !i.done && !i.optional);
  const v3Opened = !!state.opened['sd-bike-counts@3'];
  const javedOpened = !!state.opened['r13'];
  const lectureOpened = !!state.opened['lecture-5'];
  const draft = state.draft;
  const showCallout = left.length > 0 && !state.dismissed['brief-week5'];

  return (
    <div className="page-grid">
      <div className="page-main">
        <div className="crumbs"><a href="#/ps">Problem sets</a><span>›</span><span>PS4</span></div>
        <h1 className="page-title">PS4 · Encoding comparisons</h1>
        <div className="meta-row">
          <span className="meta"><Icon name="calendar" /> Due <b>Thu Nov 19, 11:59pm</b> <span className="muted">({countdown(PS4_DUE, now)} from now)</span></span>
          <span className="meta">20 points</span>
          <span className="meta">Released Tue Nov 10 in Lecture 5</span>
          <span className="meta"><span className="dot" style={{ background: '#1f6f6a' }} /> Encoding module</span>
        </div>

        {showCallout && (
          <div className="callout warn">
            <div className="callout-icon"><Icon name="info" size={18} /></div>
            <div className="callout-body">
              <b>This brief leans on Week 5, which you missed.</b> You have an excused absence for Tue Nov 10 – Thu Nov 12. The dataset version, the reading and the walkthrough it points to all live in <a href="#/weeks/5">Week 5 · Comparison by design</a> — {left.length} of {items.filter((i) => !i.optional).length} items there are still unopened.
              <div className="callout-actions">
                <a className="btn primary sm" href="#/weeks/5">Open Week 5 catch-up</a>
                <a className="btn sm" href="#/lecture/5?t=3485">Watch just the PS4 walkthrough (11 min)</a>
                <button className="btn-link" onClick={() => update((s) => ({ ...s, dismissed: { ...s.dismissed, 'brief-week5': true } }))}>Dismiss</button>
              </div>
            </div>
          </div>
        )}

        <section className="card">
          <h2 className="sec-title">What you’ll need</h2>
          <div className="materials">
            <div className={'material' + (draft.version !== 3 ? ' attention' : '')}>
              <div className="mat-kind"><Icon name="table" /> Dataset · exact version matters</div>
              <a className="mat-title" href="#/datasets/sd-bike-counts?v=3">San Diego bike counts, 2019–2025 — <span className="vtag strong">v3</span></a>
              <LivesIn week={5} kind="Datasets" />
              <div className="mat-status">
                {v3Opened ? <span className="pill ok"><Icon name="check" /> v3 opened</span> : <span className="pill new">Not opened yet</span>}
                {draft.version !== 3 ? (
                  <span className="pill bad"><Icon name="alert" /> Your draft is on v{draft.version}</span>
                ) : (
                  <span className="pill ok"><Icon name="check" /> Your draft uses v3</span>
                )}
              </div>
              <p className="mat-note">Six versions exist. v4–v6 were posted for PS5 and the final project; v6 is the default “latest” download. Use v3.</p>
            </div>
            <div className="material">
              <div className="mat-kind"><Icon name="book" /> Reading · required for Task 4</div>
              <a className="mat-title" href="#/readings/r13">Javed, McDonnel & Elmqvist (2010). Graphical Perception of Multiple Time Series</a>
              <LivesIn week={5} kind="Readings" />
              <div className="mat-status">{javedOpened ? <span className="pill ok"><Icon name="check" /> Opened</span> : <span className="pill new">Not opened yet</span>}<span className="muted small">~40 min · focus on Table 2 and §6</span></div>
            </div>
            <div className="material">
              <div className="mat-kind"><Icon name="video" /> Lecture segment</div>
              <a className="mat-title" href="#/lecture/5?t=3485">Lecture 5 · PS4 walkthrough, 58:05–69:40</a>
              <LivesIn week={5} kind="Recording" />
              <div className="mat-status">{lectureOpened ? <span className="pill ok"><Icon name="check" /> Started</span> : <span className="pill new">Not watched</span>}<a className="muted small" href="#/slides/b">Slides: PS4 walkthrough (12)</a></div>
            </div>
          </div>
        </section>

        <section className="card prose">
          <h2 className="sec-title">Overview</h2>
          <p>Bike traffic in San Diego changed a lot between 2019 and 2025: commuting collapsed in spring 2020, the beach routes boomed, and protected lanes opened on 30th St in August 2022. In this problem set you’ll design <b>three different charts</b> that compare monthly ridership at four counters, then argue which comparison each chart makes easiest.</p>
          <p>This is the last problem set in the Encoding module. It applies the three comparison strategies from <Ref to="/lecture/5?t=685" hint="Week 5 · Lecture 5 at 11:25">Lecture 5</Ref> — juxtapose, superimpose, explicitly encode — to a real, slightly messy dataset.</p>

          <h2 className="sec-title">Tasks</h2>
          <ol className="tasks">
            <li>
              <b>Get the data.</b> Load <Ref to="/datasets/sd-bike-counts?v=3" hint="Week 5 · Datasets · version 3 of 6">San Diego bike counts v3</Ref> and sum <code>count</code> to monthly totals for the four core counters, Jan 2019 – Sep 2025:
              <div className="counter-chips">
                {['HBR-01 Harbor Dr', 'UNV-02 University Ave', '30T-03 30th St', 'PBB-04 Pacific Beach Boardwalk'].map((c) => <code key={c}>{c}</code>)}
              </div>
            </li>
            <li><b>Make three charts</b> of the same monthly totals: one that <i>juxtaposes</i> the counters, one that <i>superimposes</i> them, and one that <i>explicitly encodes</i> the comparison (e.g. index each counter to its 2019 average = 100). You choose which is which.</li>
            <li><b>Handle the outage honestly.</b> University Ave was offline Mar–May 2021, and v3 leaves those days empty on purpose. Show the gap as missing — don’t interpolate — and label it on every chart.</li>
            <li><b>Write 300–400 words.</b> For each chart, name the comparison task it serves best (e.g. “which counter was busiest in July 2023?” vs “whose trend recovered fastest?”). Cite <Ref to="/readings/r13" hint="Week 5 · Readings · required">Javed et al. (2010)</Ref> and Lecture 5.</li>
          </ol>

          <h2 className="sec-title">Rubric <span className="muted small">20 points</span></h2>
          <table className="rubric">
            <thead><tr><th>Criterion</th><th>Beginning</th><th>Developing</th><th>Meets</th></tr></thead>
            <tbody>
              {PS4_RUBRIC.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.name}</b><div className="muted small">{r.pts} pts</div></td>
                  {r.levels.map((l, i) => <td key={i}>{l}</td>)}
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="sec-title">Submitting</h2>
          <p>Submit from <a href="#/draft/ps4">your PS4 draft</a>: three charts plus the write-up, exported as one PDF, or a link to a notebook that renders them. Work-in-progress drafts went to <a href="#/critique">Critique Round 3</a> on Sun Nov 15; your two reviews come back <b>Wed Nov 18 at 9:00am</b>, which leaves a day to revise.</p>
          <p className="muted">Late policy: 3 late days per term, used in whole days. You have 3 of 3 left. Questions → PS4 discussion thread, Section B04 (Thu 2pm), or the extra PS4 office hours Wed Nov 18, 4–6pm, CSE B260.</p>
        </section>
      </div>

      <aside className="rail">
        <DraftCard />
        <TonightCard now={now} />
        <div className="card rail-card">
          <div className="rail-head"><Icon name="route" /> Week 5 catch-up</div>
          <Progress done={items.filter((i) => i.done && !i.optional).length} total={items.filter((i) => !i.optional).length} />
          <ul className="mini-list">
            {items.filter((i) => !i.optional).slice(0, 6).map((i) => (
              <li key={i.id} className={i.done ? 'done' : ''}>
                <span className="tick-box">{i.done ? <Icon name="check" size={12} /> : null}</span>
                <a href={'#' + i.path}>{i.label}</a>
              </li>
            ))}
          </ul>
          <a className="btn sm block" href="#/weeks/5">All of Week 5</a>
        </div>
      </aside>
    </div>
  );
}

export function Progress({ done, total, tone }: { done: number; total: number; tone?: 'alert' }) {
  return (
    <div className="progress">
      <div className="progress-bar"><div className={'progress-fill ' + (tone || '')} style={{ width: `${(done / total) * 100}%` }} /></div>
      <span className="progress-txt">{done}/{total}</span>
    </div>
  );
}

export function DraftCard() {
  const { state } = useStore();
  const now = useNow();
  const d = state.draft;
  const active = d.attempts.find((a) => a.id === d.active);
  return (
    <div className="card rail-card">
      <div className="rail-head"><Icon name="bookmark" /> My PS4 draft</div>
      <div className="muted small">Last saved {fmtDayTime(new Date(d.savedAt).getTime())} · {relTime(new Date(d.savedAt).getTime(), now)}</div>
      {d.version !== 3 && (
        <div className="inline-warn"><Icon name="alert" /><span>Built on bike counts <b>v{d.version}</b>. PS4 requires v3.</span></div>
      )}
      <ul className="attempt-mini">
        {d.attempts.map((a, i) => (
          <li key={a.id} className={a.id === d.active ? 'active' : ''}>
            <Glyph e={a.encoding} />
            <div>
              <div className="am-title">{i + 1}. {a.title}</div>
              <div className="muted small">{a.status}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="muted small">Write-up: {wordCount(d.writeup)} / 300–400 words</div>
      <a className="btn primary block" href="#/draft/ps4">Resume{active ? `: ${active.title}` : ''}</a>
    </div>
  );
}

export function TonightCard({ now }: { now: number }) {
  const { state } = useStore();
  return (
    <div className="card rail-card urgent">
      <div className="rail-head"><Icon name="clock" /> Due tonight · 11:59pm</div>
      <div className="countdown mono">{countdown(CRITIQUE_DUE, now)} left</div>
      <div className="muted small">Critique Round 3 — two classmates’ PS4 drafts, 4 criteria each</div>
      <ul className="crit-mini">
        {PEER_DRAFTS.map((p) => {
          const c = state.critiques[p.id];
          const pr = critiqueProgress(c);
          return (
            <li key={p.id}>
              <a href={`#/critique/${p.id}`}>
                <span className="mono">#{p.id}</span> <span className="muted">{p.author}</span>
              </a>
              {c.submittedAt ? <span className="pill ok sm"><Icon name="check" /> Submitted</span> : <Progress done={pr.done} total={4} tone="alert" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OtherBrief({ n }: { n: number }) {
  const ps = PROBLEM_SETS.find((p) => p.n === n);
  if (!ps) return <div className="empty-page">No problem set {n}.</div>;
  const blurbs: Record<number, string> = {
    1: 'Replicate three of Cleveland & McGill’s elementary perceptual tasks with the class lab data, and plot judgment error by task.',
    2: 'Take a published chart of coffee exports and redesign it twice, justifying each mark and channel choice.',
    3: 'Choose palettes and scales for two campus datasets; defend one sequential and one diverging choice.',
    5: 'Build a small interactive view with brushing and linking. Releases Mon Nov 23 after Lecture 7.',
  };
  return (
    <div className="page-narrow">
      <div className="crumbs"><a href="#/ps">Problem sets</a><span>›</span><span>PS{n}</span></div>
      <h1 className="page-title">PS{n} · {ps.title}</h1>
      <div className="meta-row"><span className="meta">Due {ps.due}</span><span className="meta">{ps.points} points</span>{ps.score && <span className="pill ok">Graded · {ps.score}</span>}{ps.status === 'not released' && <span className="pill">Not released yet</span>}</div>
      <div className="card prose"><p>{blurbs[n]}</p>{ps.status === 'graded' && <p className="muted">Feedback from your TA is attached to your submission. Regrade window closed.</p>}</div>
    </div>
  );
}

export function ProblemSetsPage() {
  const { state } = useStore();
  return (
    <div className="page-narrow">
      <h1 className="page-title">Problem sets</h1>
      <p className="lede">Five problem sets, one per module checkpoint. Each is worth 20 points.</p>
      <div className="card flush">
        <table className="list-table">
          <thead><tr><th>#</th><th>Title</th><th>Due</th><th>Status</th><th /></tr></thead>
          <tbody>
            {PROBLEM_SETS.map((p) => (
              <tr key={p.n} className={p.n === 4 ? 'hl' : ''} onClick={() => (window.location.hash = `/ps/${p.n}`)}>
                <td className="mono">PS{p.n}</td>
                <td><b>{p.title}</b></td>
                <td>{p.due}</td>
                <td>
                  {p.status === 'graded' && <span className="pill ok">Graded · {p.score}</span>}
                  {p.status === 'draft' && <span className="pill warn">Draft · {state.draft.attempts.length} attempts</span>}
                  {p.status === 'not released' && <span className="pill">Not released</span>}
                </td>
                <td>{p.n === 4 && <a href="#/draft/ps4" onClick={(e) => e.stopPropagation()}>Open draft →</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Readings referenced: {READINGS.filter((r) => r.usedIn).map((r) => `${r.authors.split(',')[0]} ${r.year} (${r.usedIn})`).join(', ')}</p>
    </div>
  );
}
