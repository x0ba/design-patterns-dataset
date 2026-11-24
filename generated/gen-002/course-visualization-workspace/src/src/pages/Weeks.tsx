import { ANNOUNCEMENTS, DATASETS, LECTURE5, MODULES, READINGS, WEEKS, STUDENT, shortAuthors } from '../data/course';
import { useNow, useStore } from '../store';
import { Icon } from '../components/Icon';
import { week5Items } from '../components/Shell';
import { DraftCard, Progress, TonightCard } from './Brief';

const watchedMin = (lc: Record<string, number>) => Math.round(Object.values(lc).reduce((a, b) => a + b, 0) / 60);
const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function ThisWeekPage() {
  const { state } = useStore();
  const now = useNow();
  const items = week5Items(state);
  const req = items.filter((i) => !i.optional);
  const w = WEEKS[5];
  return (
    <div className="page-grid">
      <div className="page-main">
        <div className="eyebrow">Week 6 of 10 · {w.dates} · Interaction module</div>
        <h1 className="page-title">Welcome back, {STUDENT.name.split(' ')[0]}</h1>
        <p className="lede">This week starts the Interaction module. Before Thursday you have two things due, and one week to catch up on.</p>

        <section className="card">
          <h2 className="sec-title">Your next three things</h2>
          <ol className="next-list">
            <li>
              <span className="nl-n">1</span>
              <div>
                <a href="#/critique" className="nl-title">Critique two PS4 drafts — #A-0817 and #A-0952</a>
                <div className="muted small">Critique Round 3 · due <b>tonight, 11:59pm</b> · 4 criteria each</div>
              </div>
              <a className="btn primary sm" href="#/critique/A-0817">Start</a>
            </li>
            <li>
              <span className="nl-n">2</span>
              <div>
                <a href="#/weeks/5" className="nl-title">Catch up on Week 5 · Comparison by design</a>
                <div className="muted small">You were out Nov 10–12 · {req.filter((i) => i.done).length} of {req.length} opened · PS4 depends on it</div>
              </div>
              <a className="btn sm" href="#/weeks/5">Open</a>
            </li>
            <li>
              <span className="nl-n">3</span>
              <div>
                <a href="#/draft/ps4" className="nl-title">Finish PS4 · Encoding comparisons</a>
                <div className="muted small">Due Thu Nov 19, 11:59pm · {state.draft.attempts.length} chart attempts so far</div>
              </div>
              <a className="btn sm" href="#/ps/4">Brief</a>
            </li>
          </ol>
        </section>

        <section className="card">
          <h2 className="sec-title">Week 6 · {w.title}</h2>
          <p>{w.summary}</p>
          <div className="wk-grid">
            <div className="wk-cell">
              <div className="mat-kind"><Icon name="video" /> Lecture 6 · today</div>
              <div><b>Interaction techniques</b> · 78 min</div>
              <div className="muted small">Recording posted 12:31pm · you attended</div>
            </div>
            <div className="wk-cell">
              <div className="mat-kind"><Icon name="users" /> Section B04</div>
              <div><b>Thu Nov 19, 2:00–2:50pm</b></div>
              <div className="muted small">Center Hall 216 · bring PS4 questions</div>
            </div>
          </div>
          <h3 className="sub-title">Readings</h3>
          <ReadingRows week={6} />
        </section>

        <section className="card">
          <h2 className="sec-title">Announcements</h2>
          <ul className="ann-list">
            {ANNOUNCEMENTS.map((a) => (
              <li key={a.title}>
                <div className="ann-head"><b>{a.title}</b><span className="muted small">{a.who} · {a.when}</span></div>
                <p>{a.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <aside className="rail">
        <TonightCard now={now} />
        <DraftCard />
      </aside>
    </div>
  );
}

export function ReadingRows({ week }: { week: number }) {
  const { state } = useStore();
  return (
    <ul className="reading-rows">
      {READINGS.filter((r) => r.week === week).map((r) => (
        <li key={r.id}>
          <a href={`#/readings/${r.id}`}>
            <span className="rr-auth">{shortAuthors(r.authors)} ({r.year})</span>
            <span className="rr-title">{r.title}</span>
          </a>
          <span className="rr-meta">
            {r.usedIn && <span className="pill warn sm">{r.usedIn}</span>}
            <span className="muted small">{r.minutes} min · {r.required ? 'required' : 'optional'}</span>
            {state.read[r.id] ? <span className="pill ok sm"><Icon name="check" /> Read</span> : state.opened[r.id] ? <span className="pill sm">Opened</span> : <span className="pill new sm">Not opened</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function WeeksPage() {
  const { state } = useStore();
  return (
    <div className="page-wide">
      <h1 className="page-title">Weeks & modules</h1>
      <p className="lede">Ten weeks in four modules. Every week has a lecture recording, slides, readings and a section; datasets are listed in the week they’re introduced.</p>
      <div className="term-strip">
        {WEEKS.map((w) => {
          const mod = MODULES.find((m) => m.id === w.module)!;
          return (
            <a key={w.n} href={`#/weeks/${w.n}`} className={'term-cell ' + w.status + (w.missed ? ' missed' : '')} style={{ borderTopColor: mod.color }}>
              <div className="tc-n">Week {w.n}</div>
              <div className="tc-d">{w.dates}</div>
              {w.status === 'current' && <span className="now-pip">now</span>}
              {w.missed && <span className="pill warn sm">missed</span>}
            </a>
          );
        })}
      </div>
      <div className="module-grid">
        {MODULES.map((mod) => (
          <div key={mod.id} className="card module-card" style={{ borderTopColor: mod.color }}>
            <div className="mod-name" style={{ color: mod.color }}>{mod.name}</div>
            <p className="muted small">{mod.blurb}</p>
            {mod.weeks.map((n) => {
              const w = WEEKS[n - 1];
              const rs = READINGS.filter((r) => r.week === n);
              const ds = DATASETS.filter((d) => d.week === n);
              const unopened = rs.filter((r) => !state.opened[r.id]).length;
              return (
                <a key={n} href={`#/weeks/${n}`} className="mod-week">
                  <div className="mw-head"><b>Week {n}</b> <span className="muted small">{w.dates}</span>{w.missed && <span className="pill warn sm">you were out</span>}{w.status === 'current' && <span className="now-pip">now</span>}</div>
                  <div className="mw-title">{w.title}</div>
                  <div className="muted small">Lecture · slides · {rs.length} reading{rs.length === 1 ? "" : "s"}{ds.length ? ` · ${ds.length} dataset${ds.length > 1 ? 's' : ''}` : ''}{w.status !== 'future' && unopened ? ` · ${unopened} unopened` : ''}</div>
                </a>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeekPage({ n }: { n: number }) {
  const w = WEEKS[n - 1];
  const { state } = useStore();
  if (!w) return <div className="empty-page">No week {n}.</div>;
  const mod = MODULES.find((m) => m.id === w.module)!;
  const ds = DATASETS.filter((d) => d.week === n);
  const items = week5Items(state);
  const req = items.filter((i) => !i.optional);
  return (
    <div className="page-wide">
      <div className="crumbs"><a href="#/weeks">Weeks</a><span>›</span><span style={{ color: mod.color }}>{mod.name}</span><span>›</span><span>Week {n}</span></div>
      <div className="week-head">
        <div>
          <div className="eyebrow">{mod.name} module · week {mod.weeks.indexOf(n) + 1} of {mod.weeks.length} · {w.dates}</div>
          <h1 className="page-title">Week {n} · {w.title}</h1>
          <p className="lede">{w.summary}</p>
        </div>
        <div className="week-nav">
          {n > 1 && <a className="btn sm" href={`#/weeks/${n - 1}`}><Icon name="chev-left" /> Week {n - 1}</a>}
          {n < 10 && <a className="btn sm" href={`#/weeks/${n + 1}`}>Week {n + 1} <Icon name="chev-right" /></a>}
        </div>
      </div>

      {w.missed && (
        <div className="catchup card">
          <div className="catchup-head">
            <div>
              <h2 className="sec-title">Catch up on what you missed</h2>
              <p className="muted">Excused absence, Tue Nov 10 – Thu Nov 12 (recorded by Priya V.). Ordered by what PS4 needs first.</p>
            </div>
            <div className="catchup-prog"><Progress done={req.filter((i) => i.done).length} total={req.length} /></div>
          </div>
          <ol className="catchup-list">
            {items.map((it, i) => (
              <li key={it.id} className={it.done ? 'done' : ''}>
                <span className="cl-n">{it.done ? <Icon name="check" size={14} /> : i + 1}</span>
                <span className="cl-kind">{it.kind}</span>
                <a href={'#' + it.path} className="cl-title">{it.label}</a>
                <span className="cl-sub muted small">
                  {it.sub}
                  {it.id === 'lecture-5' && watchedMin(state.lectureChapters) > 0 && <> · <b>{watchedMin(state.lectureChapters)} of 74 min watched</b></>}
                </span>
                <span className="cl-act">{it.done ? <span className="pill ok sm"><Icon name="check" /> Opened</span> : <a className="btn sm" href={'#' + it.path}>Open</a>}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="week-cols">
        <section className="card">
          <h2 className="sec-title"><Icon name="video" /> Lecture {n}</h2>
          {n === 5 ? (
            <>
              <a href="#/lecture/5" className="lecture-card">
                <div className="lc-thumb"><Icon name="play" size={28} /></div>
                <div>
                  <b>{LECTURE5.title}</b>
                  <div className="muted small">{LECTURE5.date} · 74 min · 8 chapters · captions</div>
                </div>
              </a>
              <ul className="chapter-mini">
                {LECTURE5.chapters.map((c) => (
                  <li key={c.t} className={c.ps4 ? 'ps4' : ''}><a href={`#/lecture/5?t=${c.t}`}><span className="mono">{fmtT(c.t)}</span> {c.title}</a>{c.ps4 && <span className="pill warn sm">PS4</span>}</li>
                ))}
              </ul>
              <h3 className="sub-title">Slides</h3>
              <ul className="file-list">
                <li><Icon name="slides" /><a href="#/slides/a">L5 — Comparison by design</a><span className="muted small">20 slides · 6.2 MB</span></li>
                <li><Icon name="slides" /><a href="#/slides/b">PS4 walkthrough — bike counts v3</a><span className="muted small">12 slides · 2.1 MB</span></li>
              </ul>
            </>
          ) : (
            <div className="muted">{w.status === 'future' ? `Lecture on ${w.lectureDate}. Recording posts the same afternoon.` : `${w.lectureDate} · recording and slides available. ${n === 6 ? 'Posted today 12:31pm.' : ''}`}</div>
          )}
        </section>
        <section className="card">
          <h2 className="sec-title"><Icon name="book" /> Readings</h2>
          <ReadingRows week={n} />
          <h2 className="sec-title" style={{ marginTop: 18 }}><Icon name="table" /> Datasets introduced</h2>
          {ds.length ? (
            <ul className="file-list">
              {ds.map((d) => (
                <li key={d.id}><Icon name="table" /><a href={`#/datasets/${d.id}${d.id === 'sd-bike-counts' ? '?v=3' : ''}`}>{d.name}</a><span className="muted small">{d.versions ? `${d.versions.length} versions · PS4 uses v3` : d.grain}</span></li>
              ))}
            </ul>
          ) : <div className="muted small">None this week.</div>}
          <h2 className="sec-title" style={{ marginTop: 18 }}><Icon name="users" /> Section B04</h2>
          <div className="muted small">{n === 5 ? <>Thu Nov 12 · <a href="#/section?week=5">Worksheet 5 and Priya’s notes</a></> : n === 6 ? 'Thu Nov 19, 2:00pm · Center Hall 216' : w.status === 'future' ? (n === 7 ? 'No section — Thanksgiving' : 'Thursday 2:00pm') : 'Worksheet and notes posted.'}</div>
        </section>
      </div>
    </div>
  );
}
