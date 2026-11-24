import { useEffect, useRef } from 'react';
import { FILE, type Recipe } from './data';
import { DIFFICULTY, codeFilename, downloadText, fitLabel, fitScore, fmtDate, fmtMinutes, hasReq, runStatus, totalMinutes, type Extras } from './logic';
import { Thumb } from './Thumb';
import { DifficultyPips, Icon, StatusBadge } from './bits';

export function reqNote(req: string, extras: Extras): { state: 'ok' | 'no' | 'lang'; note: string } {
  const h = hasReq(req, extras);
  if (req === 'numpy' || req === 'Pillow') return { state: 'ok', note: 'comes with matplotlib' };
  if (req.includes('in browser')) return { state: 'ok', note: 'nothing to install' };
  if (h === null) return { state: 'lang', note: req === 'JSON' ? 'a spec format, not Python' : 'a different language from Python' };
  if (h) return { state: 'ok', note: req === 'Python' || req === 'matplotlib' ? 'you have this' : 'you marked this installed' };
  const why: Record<string, string> = {
    pandas: 'separate install (pip install pandas)',
    SciPy: 'separate install (pip install scipy)',
    ffmpeg: 'separate program, outside Python',
    'local web server': 'needed to load the CSV in a browser',
    cartopy: 'separate install with map data',
    xarray: 'separate install',
  };
  return { state: 'no', note: why[req] ?? 'not in your setup' };
}

export function RecipeDrawer(props: {
  r: Recipe;
  focus: 'winter' | 'year';
  extras: Extras;
  inShortlist: boolean;
  shortlistFull: boolean;
  saved?: { status: string; note: string };
  onClose: () => void;
  onShortlist: () => void;
  onSave: () => void;
  notify: (m: string) => void;
}) {
  const { r, focus, extras, saved } = props;
  const st = runStatus(r, extras);
  const fl = fitLabel(fitScore(r, focus));
  const adapted = r.code.includes(FILE.name);
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    bodyRef.current?.scrollTo({ top: 0 });
  }, [r.id]);

  const download = () => {
    downloadText(codeFilename(r), r.code);
    props.notify(`Downloaded ${codeFilename(r)}${adapted ? ' — already set up for your file' : ''}`);
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-top">
          <span className="muted small">Recipe</span>
          <button ref={closeRef} className="icon-btn" onClick={props.onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="drawer-body" ref={bodyRef}>
          <div className="drawer-hero">
            <Thumb kind={r.thumb} seed={r.id} />
          </div>
          <h2 id="drawer-title" className="drawer-title">
            {r.title}
          </h2>
          <div className="meta small muted">
            by @{r.author} · updated {fmtDate(r.updated)} · {r.license} · {r.remakes.toLocaleString()} remakes
          </div>
          <p className="lede">{r.summary}</p>

          <div className="drawer-actions">
            <button
              className={`btn ${props.inShortlist ? 'picked' : 'primary'}`}
              onClick={props.onShortlist}
              disabled={!props.inShortlist && props.shortlistFull}
            >
              {props.inShortlist ? (
                <>
                  <Icon name="check" /> On your shortlist
                </>
              ) : props.shortlistFull ? (
                'Shortlist full (3)'
              ) : (
                '+ Add to shortlist'
              )}
            </button>
            <button className="btn outline" onClick={download}>
              <Icon name="download" /> Download .{codeFilename(r).split('.').pop()} file
            </button>
            <button className={`btn ghost ${saved ? 'saved-on' : ''}`} onClick={props.onSave}>
              <Icon name={saved ? 'starFill' : 'star'} /> {saved ? 'Saved' : 'Save'}
            </button>
          </div>

          {saved?.status === 'too-hard' && (
            <div className="callout warn">
              <Icon name="alert" />
              <div>
                <strong>You marked this “tried, too hard”.</strong> {saved.note}. It is level {r.difficulty} and needs{' '}
                {r.requires.filter((q) => hasReq(q, extras) === false).join(', ') || 'nothing extra'}.
              </div>
            </div>
          )}

          <div className="facts-grid">
            <div>
              <div className="tiny muted">Will it run for you?</div>
              <StatusBadge status={st} />
            </div>
            <div>
              <div className="tiny muted">Difficulty</div>
              <div className="small">
                <DifficultyPips level={r.difficulty} /> Level {r.difficulty} · {DIFFICULTY[r.difficulty]}
              </div>
            </div>
            <div>
              <div className="tiny muted">Time</div>
              <div className="small">
                {r.steps.length} steps · {fmtMinutes(totalMinutes(r))}
              </div>
            </div>
          </div>

          {r.match ? (
            <section className="d-sec">
              <h3>
                How it fits your file <span className={`fit-chip ${fl.tone}`}>{fl.label}</span>
              </h3>
              <p className="small">{r.match.why}</p>
              <table className="map">
                <thead>
                  <tr>
                    <th>Recipe expects</th>
                    <th>Your column</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {r.match.uses.map((u) => (
                    <tr key={u.expects}>
                      <td className="mono">{u.expects}</td>
                      <td className="mono">{u.yours ?? '—'}</td>
                      <td className="small">
                        <span className={u.ok ? 'ok-text' : 'warn-text'}>
                          <Icon name={u.ok ? 'check' : 'alert'} />
                        </span>{' '}
                        {u.note ?? (u.ok ? 'matches' : '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="small">
                <Icon name="snow" />{' '}
                {r.match.winter === 'built-in'
                  ? 'Winter-only is built in — no changes needed for a Dec–Feb chart.'
                  : r.match.winter === 'one setting'
                    ? 'Shows the whole year; one setting restricts it to winter.'
                    : 'Not designed around winter; showing winters only would mean reworking it.'}
              </p>
              {r.match.watch && (
                <p className="small warn-text">
                  <Icon name="alert" /> {r.match.watch}
                </p>
              )}
            </section>
          ) : (
            <section className="d-sec">
              <h3>How it fits your file</h3>
              <p className="small muted">
                This recipe works from {r.sample.rows.toLowerCase()} ({r.shapes.join(', ')}), not a daily record like yours. You would
                need to summarise your file first.
              </p>
            </section>
          )}

          <section className="d-sec">
            <h3>What you need</h3>
            <ul className="reqs">
              {r.requires.map((q) => {
                const n = reqNote(q, extras);
                return (
                  <li key={q} className={n.state}>
                    <Icon name={n.state === 'ok' ? 'check' : n.state === 'lang' ? 'info' : 'x'} />
                    <strong>{q}</strong> <span className="muted small">— {n.note}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="d-sec">
            <h3>Missing values</h3>
            <p className="small">{r.missing}</p>
            <p className="small muted">
              Your file: {FILE.missingPct}% blank overall — tmax_f 1.2%, tmin_f 1.3%, prcp_in 2.6%, snwd_in 5.4%.
            </p>
          </section>

          <section className="d-sec">
            <h3>Walkthrough</h3>
            <ol className="steps">
              {r.steps.map((s, i) => (
                <li key={i}>
                  <span className="step-n">{i + 1}</span>
                  <span className="step-t">{s.title}</span>
                  <span className="muted small">{s.mins} min</span>
                </li>
              ))}
            </ol>
            <p className="small muted">Output: {r.poster}</p>
          </section>

          <section className="d-sec">
            <h3>
              Code{' '}
              {adapted && <span className="adapted">Your file name and columns filled in</span>}
            </h3>
            <pre className="code">
              <code>{r.code}</code>
            </pre>
            <button className="btn outline" onClick={download}>
              <Icon name="download" /> Download {codeFilename(r)}
            </button>
          </section>

          <section className="d-sec two">
            <div>
              <h3>Sample data</h3>
              <p className="small">
                <span className="mono">{r.sample.name}</span>
                <br />
                <span className="muted">
                  {r.sample.rows} · {r.sample.span}
                </span>
              </p>
            </div>
            {r.remakeExamples && (
              <div>
                <h3>Recent remakes</h3>
                <ul className="small plain">
                  {r.remakeExamples.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
