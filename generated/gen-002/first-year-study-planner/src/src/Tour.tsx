import { useEffect, useLayoutEffect, useState } from 'react';
import { Icon } from './Icon';
import { useStore } from './store';

export const TOUR_STEPS: { target: string | null; title: string; body: string; place: 'right' | 'left' | 'bottom' | 'center' }[] = [
  { target: null, title: 'Welcome to Firstweek, Jaylen', body: 'This is where your whole term lives: classes, shifts, readings, and every deadline. Six quick stops.', place: 'center' },
  { target: 'term', title: 'Your term at a glance', body: 'Fall 2026 runs 16 weeks, Aug 24 to Dec 11. The bar fills in as the weeks go by.', place: 'right' },
  { target: 'checklist-rail', title: 'Ms. Ortega\'s checklist', body: 'Seven setup steps for COLL 100. They check themselves off as you go, and the countdown shows how long until the Week 2 check-in.', place: 'left' },
  { target: 'courses-list', title: 'One syllabus per course', body: 'Open a course to enter its syllabus. A gray dot means not started, half means in progress, and a check means done.', place: 'right' },
  { target: 'week', title: 'Your week, planned', body: 'Once your syllabi are in, the week planner shows classes, shifts, and what\'s due, and helps you find time for each thing.', place: 'right' },
  { target: 'help', title: 'Stuck? Help opens beside your work', body: 'Help opens in the side panel, so anything you\'re typing stays put. It has 26 short how-tos, step-by-step walkthroughs, and peer coach hours.', place: 'bottom' },
];

export function Tour() {
  const { s, d } = useStore();
  const n = s.tourStep!;
  const step = TOUR_STEPS[n - 1];
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (step.target === 'checklist-rail' && (s.rail !== 'checklist' || !s.railOpen)) d({ type: 'rail', tab: 'checklist' });
  }, [n]);

  useLayoutEffect(() => {
    const measure = () => {
      const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    const t = setTimeout(measure, 60);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [n, s.rail, s.railOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft' && n > 1) d({ type: 'tour', step: n - 1 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const close = (finished: boolean) => d({ type: 'tour', step: null, resumeAt: finished ? TOUR_STEPS.length + 1 : n });
  const next = () => (n >= TOUR_STEPS.length ? close(true) : d({ type: 'tour', step: n + 1 }));

  const pad = 6;
  const W = 320;
  let pos: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  if (rect && step.place !== 'center') {
    if (step.place === 'right') pos = { left: rect.right + 18, top: Math.min(Math.max(16, rect.top), window.innerHeight - 240) };
    if (step.place === 'left') pos = { left: rect.left - W - 18, top: Math.min(Math.max(16, rect.top + 40), window.innerHeight - 240) };
    if (step.place === 'bottom') pos = { left: Math.min(rect.right - W, window.innerWidth - W - 16), top: rect.bottom + 14 };
  }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect && step.target ? (
        <div className="tour-spot" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: Math.min(rect.height + pad * 2, window.innerHeight - rect.top) }} />
      ) : (
        <div className="tour-dim" />
      )}
      <div className="tour-card" style={{ ...pos, width: W }}>
        <div className="tour-progress">
          {TOUR_STEPS.map((_, i) => (
            <span key={i} className={i + 1 < n ? 'past' : i + 1 === n ? 'now' : ''} />
          ))}
          <span className="tour-count">Step {n} of {TOUR_STEPS.length}</span>
        </div>
        <h3 id="tour-title">{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-actions">
          <button className="link sm" onClick={() => close(false)}>
            Skip for now
          </button>
          <div>
            {n > 1 && (
              <button className="btn ghost sm" onClick={() => d({ type: 'tour', step: n - 1 })}>
                Back
              </button>
            )}
            <button className="btn primary sm" onClick={next} autoFocus>
              {n >= TOUR_STEPS.length ? 'Finish tour' : 'Next'} {n < TOUR_STEPS.length && <Icon name="arrowR" size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
