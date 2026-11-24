import { useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { HISTORY, HOLIDAYS, PEOPLE, SWIM, deviceById } from './data';
import { brightnessAt, dayOf, presenceAt, simulate, type RunResult } from './sim';
import type { Step } from './types';
import { DAY_SHORT, fmtDate, fmtTime, weekdayOf } from './time';

const T0 = 16 * 60;
const T1 = 23 * 60;
const pct = (t: number) => `${((Math.min(Math.max(t, T0), T1) - T0) / (T1 - T0)) * 100}%`;

interface Props {
  steps: Step[];
  run: RunResult;
  date: string;
  open: boolean;
  onDate: (d: string) => void;
  onToggle: () => void;
  onSelectStep: (id: string) => void;
}

export function DryRun({ steps, run, date, open, onDate, onToggle, onSelectStep }: Props) {
  const all = useMemo(() => HISTORY.map((d) => simulate(steps, d.date)), [steps]);
  return (
    <section className={`dock${open ? ' open' : ''}`} aria-label="Dry run">
      <header className="dock-head">
        <button type="button" className="dock-title" onClick={onToggle} aria-expanded={open}>
          <Icon name="flask" size={15} />
          <span>Dry run</span>
          <span className="muted">· recorded history</span>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} />
        </button>
        <div className="daychips" role="tablist" aria-label="Test day">
          {all.map((r) => {
            const wd = weekdayOf(r.date);
            const hol = HOLIDAYS.find((h) => h.date === r.date);
            const kind = r.outcome === 'ran' ? 'ran' : r.outcome === 'notScheduled' ? 'none' : r.outcome === 'error' ? 'err' : 'stop';
            return (
              <button
                type="button"
                role="tab"
                key={r.date}
                aria-selected={r.date === date}
                className={`daychip k-${kind}${r.date === date ? ' on' : ''}`}
                onClick={() => onDate(r.date)}
                title={`${fmtDate(r.date)}${hol ? ` · ${hol.name}` : ''} — ${r.short}`}
              >
                <span className="dc-day">{DAY_SHORT[wd]} {Number(r.date.slice(8))}</span>
                <span className="dc-res">
                  <i className="dc-dot" />
                  {r.outcome === 'ran' ? `${r.fired.length} actions` : r.outcome === 'notScheduled' ? 'No trigger' : r.outcome === 'holidayStop' ? 'Holiday' : r.outcome === 'error' ? 'Error' : 'Stopped'}
                </span>
                {SWIM.days.includes(wd) && <span className="dc-flag" title="Ada · swim practice"><Icon name="waves" size={10} stroke={2.2} /></span>}
              </button>
            );
          })}
        </div>
      </header>
      {open && (
        <div className="dock-body">
          <div className="dock-left">
            <Timeline run={run} onSelectStep={onSelectStep} />
          </div>
          <div className="dock-right">
            <div className={`dock-summary o-${run.outcome}`}>
              <b>{fmtDate(run.date)}{date === '2026-11-10' ? ' (last Tuesday)' : ''}:</b> {run.headline}
            </div>
            <div className="fired-head">What would have fired</div>
            {run.fired.length === 0 ? (
              <div className="fired-empty">
                {run.outcome === 'notScheduled' ? 'Nothing — the schedule doesn’t include this day.' : run.outcome === 'holidayStop' ? 'Nothing — the holiday check stopped the routine before any actions.' : 'Nothing — the routine stopped before any actions.'}
              </div>
            ) : (
              <ol className="fired">
                {run.fired.map((f, i) => (
                  <li key={i} onClick={() => onSelectStep(f.stepId)} title="Select step">
                    <span className="f-time">{fmtTime(f.at)}</span>
                    <span className={`f-icon f-${f.kind}`}>
                      <Icon name={f.kind === 'lights' ? 'bulb' : f.kind === 'wifi' ? 'wifiOff' : f.kind === 'notify' ? 'bell' : 'plug'} size={13} />
                    </span>
                    <span className="f-text">
                      <b>{f.text}</b>
                      {f.detail && <span className="f-detail">{f.detail}</span>}
                      {f.warn && (
                        <span className="f-warn">
                          <Icon name="alert" size={11} /> {f.warn}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Timeline({ run, onSelectStep }: { run: RunResult; onSelectStep: (id: string) => void }) {
  const day = dayOf(run.date);
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const wd = weekdayOf(run.date);

  const lanes = useMemo(() => {
    const events = day?.events ?? [];
    const presence = PEOPLE.map((p) => {
      const segs: { a: number; b: number }[] = [];
      let home = presenceAt(day, T0)[p.id];
      let start = T0;
      for (const e of events) {
        if (e.kind !== 'presence' || e.person !== p.id || e.t < T0) continue;
        const nowHome = e.state === 'home';
        if (nowHome !== home) {
          if (home) segs.push({ a: start, b: e.t });
          home = nowHome;
          start = e.t;
        }
      }
      if (home) segs.push({ a: start, b: T1 });
      const changes = events.filter((e) => e.kind === 'presence' && e.person === p.id && e.t >= T0 && e.t <= T1);
      return { p, segs, changes };
    });
    const doors = events.filter((e) => e.kind === 'door' && e.state === 'open' && e.t >= T0 && e.t <= T1);
    const lightSeries = (id: string) => {
      const pts: { a: number; b: number; v: number; by?: string }[] = [];
      let v = brightnessAt(day, id, T0);
      let start = T0;
      for (const e of events) {
        if (e.kind !== 'light' || e.device !== id || e.t < T0) continue;
        pts.push({ a: start, b: e.t, v });
        v = e.brightness;
        start = e.t;
      }
      pts.push({ a: start, b: T1, v });
      return pts;
    };
    return { presence, doors, lr: lightSeries('lr-ceiling'), hall: lightSeries('hall-night'), lightEvents: events.filter((e) => e.kind === 'light' && e.t >= T0 && e.t <= T1) };
  }, [day]);

  const hours = [];
  for (let h = T0; h <= T1; h += 60) hours.push(h);

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x < 0 || x > 1) return setHover(null);
    setHover(Math.round(T0 + x * (T1 - T0)));
  };

  const hp = hover !== null ? presenceAt(day, hover) : null;

  return (
    <div className="tl">
      <div className="tl-labels">
        <div className="tl-axis-space" />
        {lanes.presence.map(({ p }) => (
          <div key={p.id} className="tl-label">
            <span className="avatar xs" style={{ background: p.color }}>{p.initials[0]}</span> {p.name}
          </div>
        ))}
        <div className="tl-label">Doors</div>
        <div className="tl-label">Living rm</div>
        <div className="tl-label">Hall light</div>
        <div className="tl-label tl-label-routine">Routine</div>
      </div>
      <div className="tl-plot" ref={ref} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <div className="tl-axis">
          {hours.map((h) => (
            <span key={h} style={{ left: pct(h) }}>{fmtTime(h, true).replace(' PM', 'p')}</span>
          ))}
        </div>
        {hours.map((h) => (
          <div key={h} className="tl-grid" style={{ left: pct(h) }} />
        ))}
        {lanes.presence.map(({ p, segs, changes }) => (
          <div key={p.id} className="tl-lane">
            {p.id === SWIM.person && SWIM.days.includes(wd) && (
              <div className="tl-swim" style={{ left: pct(SWIM.start), width: `calc(${pct(SWIM.end)} - ${pct(SWIM.start)})` }} title={`Swim practice ${fmtTime(SWIM.start)}–${fmtTime(SWIM.end)}`}>
                <Icon name="waves" size={10} /> swim
              </div>
            )}
            {segs.map((s, i) => (
              <div key={i} className="tl-home" style={{ left: pct(s.a), width: `calc(${pct(s.b)} - ${pct(s.a)})`, background: p.color }} title={`${p.name} home ${fmtTime(s.a)}–${fmtTime(s.b)}`} />
            ))}
            {changes.map((c, i) => (
              <span key={i} className="tl-change" style={{ left: pct(c.t) }} title={`${p.name} ${c.kind === 'presence' && c.state === 'home' ? 'arrived' : 'left'} ${fmtTime(c.t)}`} />
            ))}
          </div>
        ))}
        <div className="tl-lane">
          {lanes.doors.map((d, i) => (
            <span key={i} className={`tl-door ${d.kind === 'door' && d.device === 'door-front' ? 'front' : 'back'}`} style={{ left: pct(d.t) }} title={`${deviceById((d as { device: string }).device)?.name} opened ${fmtTime(d.t)}`} />
          ))}
        </div>
        {[lanes.lr, lanes.hall].map((series, li) => (
          <div key={li} className="tl-lane tl-light">
            {series.map((s, i) =>
              s.v > 0 ? (
                <div key={i} className="tl-bright" style={{ left: pct(s.a), width: `calc(${pct(s.b)} - ${pct(s.a)})`, height: `${Math.max(18, s.v)}%` }} title={`${s.v}% ${fmtTime(s.a)}–${fmtTime(s.b)}`} />
              ) : null,
            )}
            {run.fired
              .filter((f) => f.kind === 'lights')
              .filter((f) => {
                const st = f.stepId;
                const step = findLight(run, st);
                return step === (li === 0 ? 'lr' : 'hall');
              })
              .map((f, i) => (
                <div key={`w${i}`} className="tl-would" style={{ left: pct(f.at), width: `calc(${pct(Math.min(T1, f.at + 60))} - ${pct(f.at)})` }} title={`Routine: ${f.detail}`} />
              ))}
          </div>
        ))}
        <div className="tl-lane tl-routine">
          {run.triggerAt !== null && run.endAt !== null && (
            <div className={`tl-span o-${run.outcome}`} style={{ left: pct(run.triggerAt), width: `calc(${pct(Math.max(run.endAt, run.triggerAt + 4))} - ${pct(run.triggerAt)})` }} />
          )}
          {run.triggerAt !== null && (() => {
            const atTrig = run.fired.filter((f) => f.at === run.triggerAt);
            return (
              <button
                type="button"
                className="tl-mark trig"
                style={{ left: pct(run.triggerAt) }}
                title={`${fmtTime(run.triggerAt)} · trigger${atTrig.map((f) => `\n• ${f.text}`).join('')}`}
                onClick={() => onSelectStep(Object.keys(run.steps)[0])}
              >
                <Icon name="clock" size={10} stroke={2.4} />
                {atTrig.length > 0 && <span className="tl-count">{atTrig.length}</span>}
              </button>
            );
          })()}
          {[...new Set(run.fired.map((f) => f.at))]
            .filter((at) => at !== run.triggerAt)
            .map((at) => {
              const group = run.fired.filter((f) => f.at === at);
              return (
                <button
                  type="button"
                  key={at}
                  className="tl-mark grp"
                  style={{ left: pct(at) }}
                  title={`${fmtTime(at)}${group.map((f) => `\n• ${f.text}`).join('')}`}
                  onClick={() => onSelectStep(group[0].stepId)}
                >
                  <Icon name="play" size={8} stroke={3} />
                  {group.length > 1 && <span className="tl-count">{group.length}</span>}
                </button>
              );
            })}
        </div>
        {hover !== null && hp && (
          <>
            <div className="tl-cursor" style={{ left: pct(hover) }} />
            <div className={`tl-tip${hover > T0 + (T1 - T0) * 0.62 ? ' left' : ''}`} style={{ left: pct(hover) }}>
              <b>{fmtTime(hover)}</b>
              {PEOPLE.map((p) => (
                <span key={p.id}>
                  {p.name}: {hp[p.id] ? 'home' : 'away'}
                </span>
              ))}
              <span>Living room: {brightnessAt(day, 'lr-ceiling', hover) || 'off'}{brightnessAt(day, 'lr-ceiling', hover) ? '%' : ''}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function findLight(run: RunResult, stepId: string): 'lr' | 'hall' | null {
  const f = run.fired.find((x) => x.stepId === stepId);
  if (!f?.detail) return null;
  if (f.detail.includes('Hall Night-Light')) return 'hall';
  if (f.detail.includes('Living Room') || f.detail.includes('Bookshelf')) return 'lr';
  return null;
}
