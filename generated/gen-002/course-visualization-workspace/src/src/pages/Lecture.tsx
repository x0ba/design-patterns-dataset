import { useEffect, useMemo, useRef, useState } from 'react';
import { DECKS, LECTURE5, Slide } from '../data/course';
import { Route, useStore } from '../store';
import { Icon } from '../components/Icon';
import { LineChart, SmallMultiples, indexSeries, sliceYears } from '../components/charts';
import { CORE_IDS, monthlySeries, monthsFor, versionMonthCount } from '../data/bike';

const fmtT = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const CAPTIONS: string[][] = [
  ['Okay, let’s get started. PS3 grades are out — regrade requests are open until Friday.', 'Today wraps up the Encoding module, and I’ll walk you through PS4 at the end.'],
  ['Quick recap from week 2: position on a common scale beats length, which beats angle and area.', 'But accuracy depends on the task you’re asking the reader to do.'],
  ['Gleicher and colleagues give us three ways to put two things in front of a reader.', 'Juxtapose: side by side. Superimpose: in the same space. Or explicitly encode the relationship.', 'Each one has a cost — eye movement, clutter, or losing the raw values.'],
  ['Javed and colleagues tested four ways to show several time series at once.', 'For “which is highest at this moment”, shared-space techniques like plain lines win.', 'For comparing trends spread across time, small multiples hold up better as you add series.'],
  ['Talbot, Setlur and Anand revisited the classic bar chart ratio task.', 'The headline: aligned baselines matter more than whether the bars are adjacent.'],
  ['Pies. Kosara and Skau suggest people read area and arc length more than angle.', 'A pie with two or three parts is fine. Comparing across pies is not.'],
  ['PS4. Go to Datasets, San Diego bike counts, and pick version 3. Not the latest — version 3.', 'Four counters: Harbor Drive, University Avenue, 30th Street, Pacific Beach Boardwalk.', 'University Ave was offline March to May 2021. Leave it missing. Label it. Don’t interpolate.', 'Three charts: one juxtaposes, one superimposes, one explicitly encodes. Then 300 to 400 words.'],
  ['Good question — yes, you can index to the 2019 average for the explicit one.', 'And yes, the critique round uses your work-in-progress, so upload something by Sunday.'],
];

function SlideVisual({ kind }: { kind: Slide['kind'] }) {
  const d = useMemo(() => sliceYears(monthlySeries(3, CORE_IDS), monthsFor(versionMonthCount(3)), 2019, 2025), []);
  if (kind === 'chart-juxt') return <SmallMultiples series={d.series} months={d.months} width={400} height={180} sharedY markGap />;
  if (kind === 'chart-super') return <LineChart series={d.series} months={d.months} width={420} height={180} markGap directLabels />;
  if (kind === 'chart-explicit') return <LineChart series={indexSeries(d.series, d.months)} months={d.months} width={420} height={180} indexed />;
  if (kind === 'chart-gap') {
    const g = sliceYears(monthlySeries(3, ['UNV-02']), monthsFor(versionMonthCount(3)), 2020, 2022);
    return <LineChart series={g.series} months={g.months} width={420} height={180} markGap directLabels={false} />;
  }
  if (kind === 'versions') {
    return (
      <div className="slide-versions">
        {[1, 2, 3, 4, 5, 6].map((v) => <div key={v} className={'sv' + (v === 3 ? ' on' : '')}>v{v}{v === 3 && <small>PS4</small>}{v === 6 && <small>latest</small>}</div>)}
      </div>
    );
  }
  return null;
}

export function SlideView({ slide, deckTitle, n, total }: { slide: Slide; deckTitle: string; n: number; total: number }) {
  const hasVisual = slide.kind && slide.kind !== 'title';
  return (
    <div className={'slide' + (slide.kind === 'title' ? ' title-slide' : '')}>
      <div className="slide-inner">
        <div className="slide-title">{slide.title}</div>
        <div className={'slide-body' + (hasVisual ? ' with-visual' : '')}>
          <ul>{slide.bullets.map((b) => <li key={b} dangerouslySetInnerHTML={{ __html: b.replace(/`([^`]+)`/g, '<code>$1</code>') }} />)}</ul>
          {hasVisual && <div className="slide-visual"><SlideVisual kind={slide.kind} /></div>}
        </div>
      </div>
      <div className="slide-foot"><span>VIZ 120 · {deckTitle}</span><span>{n} / {total}</span></div>
    </div>
  );
}

export function LecturePage({ n, route }: { n: number; route: Route }) {
  if (n !== 5) {
    return (
      <div className="page-narrow">
        <div className="crumbs"><a href={`#/weeks/${n}`}>Week {n}</a><span>›</span><span>Lecture {n}</span></div>
        <h1 className="page-title">Lecture {n}</h1>
        <div className="card muted">{n === 6 ? 'Interaction techniques · Tue Nov 17 · 78 min. You attended this lecture in person; the recording is available for review.' : 'Recording posts after the lecture.'}</div>
      </div>
    );
  }
  return <Lecture5 route={route} />;
}

function Lecture5({ route }: { route: Route }) {
  const { state, update, markOpened } = useStore();
  const qt = route.query.get('t');
  const [pos, setPos] = useState<number>(qt !== null ? +qt : state.lecturePos);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const posRef = useRef(pos);
  posRef.current = pos;
  const dur = LECTURE5.duration;

  useEffect(() => markOpened('lecture-5'), [markOpened]);
  useEffect(() => {
    if (qt !== null) setPos(+qt);
  }, [qt]);
  const played = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const c = LECTURE5.chapters.reduce((acc, ch) => (posRef.current >= ch.t ? ch.t : acc), 0);
      played.current[c] = (played.current[c] || 0) + 0.25 * speed;
      setPos((p) => Math.min(dur, p + 0.25 * speed));
    }, 250);
    return () => clearInterval(id);
  }, [playing, speed, dur]);
  useEffect(() => {
    if (pos >= dur) setPlaying(false);
  }, [pos, dur]);
  // persist position every couple of seconds and on leave
  useEffect(() => {
    const save = () => {
      const add = played.current;
      played.current = {};
      update((s) => {
        const lc = { ...s.lectureChapters };
        Object.entries(add).forEach(([k, v]) => (lc[k] = (lc[k] || 0) + v));
        return { ...s, lecturePos: Math.floor(posRef.current), lectureChapters: lc };
      });
    };
    const id = setInterval(save, 2000);
    return () => { clearInterval(id); save(); };
  }, [update]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === 'ArrowRight') setPos((p) => Math.min(dur, p + 10));
      if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 10));
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [dur]);

  const chIdx = LECTURE5.chapters.reduce((acc, c, i) => (pos >= c.t ? i : acc), 0);
  const ch = LECTURE5.chapters[chIdx];
  const chEnd = LECTURE5.chapters[chIdx + 1]?.t ?? dur;
  const frac = (pos - ch.t) / (chEnd - ch.t);
  const [s0, s1] = ch.slides;
  const slideIdx = Math.min(s1, s0 + Math.floor(frac * (s1 - s0 + 1)));
  const deck = DECKS[ch.deck as 'a' | 'b'];
  const caps = CAPTIONS[chIdx];
  const cap = caps[Math.min(caps.length - 1, Math.floor(frac * caps.length))];

  const seek = (t: number) => setPos(Math.max(0, Math.min(dur, t)));

  return (
    <div className="lecture">
      <div className="crumbs"><a href="#/weeks/5">Week 5</a><span>›</span><span>Lecture recording</span></div>
      <div className="lecture-head">
        <h1 className="page-title">{LECTURE5.title}</h1>
        <span className="muted">{LECTURE5.date} · Peterson Hall 108 · 74:12</span>
      </div>
      <div className="lecture-grid">
        <div>
          <div className="player">
            <div className="screen" onClick={() => setPlaying((p) => !p)}>
              <SlideView slide={deck.slides[slideIdx]} deckTitle={deck.title} n={slideIdx + 1} total={deck.slides.length} />
              <div className="speaker" aria-hidden><svg viewBox="0 0 60 44" width="96" height="70"><rect width="60" height="44" fill="#2d2a26" /><circle cx="30" cy="17" r="8" fill="#8a7f70" /><path d="M14 44c2-10 8-15 16-15s14 5 16 15z" fill="#5f574c" /></svg></div>
              {!playing && <div className="play-overlay"><Icon name="play" size={44} /></div>}
              <div className="caption">{cap}</div>
            </div>
            <div className="scrub" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * dur); }}>
              <div className="scrub-fill" style={{ width: `${(pos / dur) * 100}%` }} />
              {LECTURE5.chapters.map((c) => <span key={c.t} className={'scrub-mark' + (c.ps4 ? ' ps4' : '')} style={{ left: `${(c.t / dur) * 100}%` }} title={c.title} />)}
              <div className="scrub-knob" style={{ left: `${(pos / dur) * 100}%` }} />
            </div>
            <div className="player-controls">
              <button className="icon-btn" onClick={() => seek(pos - 10)} title="Back 10s (←)"><Icon name="back10" /></button>
              <button className="play-btn" onClick={() => setPlaying(!playing)} title="Play/pause (space)"><Icon name={playing ? 'pause' : 'play'} size={18} /></button>
              <button className="icon-btn" onClick={() => seek(pos + 10)} title="Forward 10s (→)"><Icon name="fwd10" /></button>
              <span className="mono time">{fmtT(pos)} / {fmtT(dur)}</span>
              <span className="now-ch">{ch.title}</span>
              <div className="speed">
                {[1, 1.5, 2].map((s) => <button key={s} className={speed === s ? 'on' : ''} onClick={() => setSpeed(s)}>{s}×</button>)}
              </div>
            </div>
          </div>
          <div className="lecture-below">
            <a className="card linkcard" href={`#/slides/${ch.deck}?s=${slideIdx}`}><Icon name="slides" /> Open this slide in the deck ({deck.title}, slide {slideIdx + 1})</a>
            <a className="card linkcard" href="#/ps/4"><Icon name="clipboard" /> PS4 brief</a>
          </div>
        </div>
        <aside className="chapters card">
          <div className="rail-head">Chapters</div>
          <ol>
            {LECTURE5.chapters.map((c, i) => {
              const end = LECTURE5.chapters[i + 1]?.t ?? dur;
              const secs = (state.lectureChapters[String(c.t)] || 0) + (played.current[String(c.t)] || 0);
              const watched = secs >= 0.8 * (end - c.t);
              const partial = !watched && secs >= 20;
              return (
                <li key={c.t} className={(i === chIdx ? 'on ' : '') + (c.ps4 ? 'ps4' : '')}>
                  <button onClick={() => { seek(c.t); setPlaying(true); }}>
                    <span className="mono">{fmtT(c.t)}</span>
                    <span className="ch-t">{c.title}</span>
                    <span className="ch-meta">{Math.round((end - c.t) / 60)} min{watched ? ' · ✓ watched' : partial ? ` · ${Math.round(secs / 60)} min watched` : ''}</span>
                  </button>
                  {c.ps4 && <span className="pill warn sm">PS4</span>}
                </li>
              );
            })}
          </ol>
          <div className="rail-head" style={{ marginTop: 14 }}>Slides</div>
          <ul className="file-list">
            <li><Icon name="slides" /><a href="#/slides/a">L5 — Comparison by design</a></li>
            <li><Icon name="slides" /><a href="#/slides/b">PS4 walkthrough — bike counts v3</a></li>
          </ul>
          <div className="muted small" style={{ marginTop: 10 }}>Keys: space play/pause · ← → skip 10s. Your position is saved.</div>
        </aside>
      </div>
    </div>
  );
}

export function SlidesPage({ deck: k, route }: { deck: 'a' | 'b'; route: Route }) {
  const deck = DECKS[k];
  const { state, update, markOpened, toast } = useStore();
  const qs = route.query.get('s');
  const [i, setI] = useState<number>(qs !== null ? +qs : state.slidePos[k]);
  useEffect(() => markOpened(deck.id), [deck.id, markOpened]);
  useEffect(() => { update((s) => ({ ...s, slidePos: { ...s.slidePos, [k]: i } })); }, [i, k, update]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') setI((x) => Math.min(deck.slides.length - 1, x + 1));
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [deck.slides.length]);
  const s = deck.slides[i];
  const outline = () => {
    const txt = `${deck.title}\nVIZ 120 · Lecture 5 · Tue Nov 10\n\n` + deck.slides.map((sl, j) => `${j + 1}. ${sl.title}\n${sl.bullets.map((b) => '   - ' + b.replace(/`/g, '')).join('\n')}`).join('\n\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
    a.download = deck.file.replace('.pdf', '_outline.txt');
    a.click();
    toast('Slide outline downloaded');
  };
  return (
    <div className="slides-page">
      <div className="crumbs"><a href="#/weeks/5">Week 5</a><span>›</span><span>Slides</span></div>
      <div className="lecture-head">
        <h1 className="page-title">{deck.title}</h1>
        <div className="draft-actions">
          <span className="muted">{deck.file} · {deck.size}</span>
          <button className="btn sm" onClick={outline}><Icon name="download" /> Outline (.txt)</button>
          <a className="btn sm" href={k === 'a' ? '#/slides/b' : '#/slides/a'}>Other deck</a>
        </div>
      </div>
      <div className="slides-grid">
        <ol className="thumbs">
          {deck.slides.map((sl, j) => (
            <li key={j}><button className={j === i ? 'on' : ''} onClick={() => setI(j)}><span className="mono">{j + 1}</span>{sl.title}</button></li>
          ))}
        </ol>
        <div>
          <div className="slide-stage"><SlideView slide={s} deckTitle={deck.title} n={i + 1} total={deck.slides.length} /></div>
          <div className="slide-nav">
            <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}><Icon name="chev-left" /> Previous</button>
            <span className="mono">{i + 1} / {deck.slides.length}</span>
            <button className="btn" disabled={i === deck.slides.length - 1} onClick={() => setI(i + 1)}>Next <Icon name="chev-right" /></button>
          </div>
          {k === 'b' && <div className="muted small center">Spoken version: <a href="#/lecture/5?t=3485">Lecture 5 at 58:05</a></div>}
        </div>
      </div>
    </div>
  );
}
