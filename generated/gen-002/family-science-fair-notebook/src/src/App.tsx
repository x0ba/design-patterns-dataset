import { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import {
  Change,
  Comment,
  ContainerId,
  FAIR_DATE,
  INITIAL_COMMENTS,
  INITIAL_HISTORY,
  INITIAL_PHOTOS,
  INITIAL_READINGS,
  ME,
  NOW,
  PEOPLE,
  Photo,
  PLANNED_DAYS,
  Reading,
  SUNDAY,
  TODAY_DAY,
  containerName,
} from './data';
import { Store, StoreCtx, Target, View } from './store';
import { checkReading, daysAgo, fmtDate } from './util';
import { Avatar, Icon } from './components/bits';
import Discussion from './components/Discussion';
import Changes from './views/Changes';
import Data from './views/Data';
import Photos from './views/Photos';
import { Conclusion, Hypothesis, People, Procedure } from './views/Sections';

let seq = 0;
const nowish = () => new Date(NOW.getTime() + ++seq * 1000);

export default function App() {
  const [view, setView] = useState<View>('changes');
  const [readings, setReadings] = useState<Reading[]>(INITIAL_READINGS);
  const [photos, setPhotos] = useState<Photo[]>(INITIAL_PHOTOS);
  const [history, setHistory] = useState<Change[]>(INITIAL_HISTORY);
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [reviewed, setReviewedState] = useState<Set<string>>(new Set());
  const [questioned, setQuestioned] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<Target | null>(null);
  const [focus, setFocus] = useState<Store['focus']>({ container: 'H-F', nonce: 0 });
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const go: Store['go'] = useCallback((v, opts) => {
    setView(v);
    if (opts?.container || opts?.readingId || opts?.photoId) {
      setFocus((f) => ({ container: opts.container ?? f.container, readingId: opts.readingId, photoId: opts.photoId, nonce: f.nonce + 1 }));
    }
    if (!opts?.readingId && !opts?.photoId) {
      scroller.current?.scrollTo({ top: 0 });
      setTarget(null);
    }
  }, []);

  const store: Store = useMemo(
    () => ({
      view,
      go,
      readings,
      photos,
      history,
      comments,
      reviewed,
      questioned,
      target,
      open: setTarget,
      focus,
      setFocusContainer: (c: ContainerId) => setFocus((f) => ({ container: c, nonce: f.nonce + 1 })),
      toast,
      setReviewed: (ids, on) =>
        setReviewedState((prev) => {
          const n = new Set(prev);
          ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
          return n;
        }),
      addComment: (c, flagReading) => {
        const nc: Comment = { ...c, id: 'u' + ++seq, at: nowish(), by: ME, replies: [] };
        setComments((all) => [...all, nc]);
        if (flagReading && c.target.startsWith('reading:')) {
          setQuestioned((q) => new Set(q).add(c.target.slice(8)));
        }
        const to = c.to.map((p) => PEOPLE[p].short).join(' & ');
        toast(c.kind === 'question' ? `Question sent${to ? ` to ${to}` : ''}.` : `Comment posted${to ? `. ${to} will be notified` : ''}.`);
      },
      addReading: (r) => {
        const id = `${r.container}-d${r.day}${r.second ? '-m' + ++seq : ''}`;
        const nr: Reading = { ...r, id, by: ME, at: nowish() };
        setReadings((all) => [...all, nr]);
        setHistory((h) => [...h, { id: 'h' + ++seq, at: nr.at, by: ME, kind: 'readings', readingIds: [id], summary: `Day ${r.day}, ${containerName(r.container)}` }]);
        setFocus((f) => ({ container: r.container, readingId: id, nonce: f.nonce + 1 }));
        toast(`Reading saved under your name: ${containerName(r.container)}, day ${r.day}${r.second ? ' (2nd measurement)' : ''}.`);
      },
      addPhoto: (p) => {
        const id = 'up' + ++seq;
        const np: Photo = { ...p, id, by: ME, at: nowish() };
        setPhotos((all) => [...all, np]);
        setHistory((h) => [...h, { id: 'h' + ++seq, at: np.at, by: ME, kind: 'photos', photoIds: [id] }]);
        toast('Photo added.');
      },
    }),
    [view, go, readings, photos, history, comments, reviewed, questioned, target, focus, toast],
  );

  const sinceSunday = history.filter((c) => c.at >= SUNDAY);
  const unreviewed = sinceSunday.filter((c) => c.by !== ME && !reviewed.has(c.id)).length;
  const dataFlags = readings.filter((r) => checkReading(readings, r)).length;
  const daysLeft = -daysAgo(FAIR_DATE);

  const nav: { id: View; label: string; icon: string; meta?: ReactNode; badge?: ReactNode }[] = [
    { id: 'changes', label: 'Since Sunday', icon: 'changes', meta: `${sinceSunday.length} edits`, badge: unreviewed ? <span className="nbadge">{unreviewed}</span> : <Icon name="check" size={14} /> },
    { id: 'hypothesis', label: 'Hypothesis', icon: 'bulb', meta: <>Temi · rewritten last night</>, badge: <span className="dot-temi" title="Changed since Sunday" /> },
    { id: 'procedure', label: 'Procedure', icon: 'list', meta: 'Temi · step 4 edited', badge: <span className="dot-temi" title="Changed since Sunday" /> },
    { id: 'data', label: 'Data', icon: 'data', meta: `6 tubs · day ${TODAY_DAY} of ${PLANNED_DAYS}`, badge: dataFlags ? <span className="nbadge nbadge-warn">{dataFlags}</span> : undefined },
    { id: 'photos', label: 'Photos', icon: 'photo', meta: `${photos.length} photos` },
    { id: 'conclusion', label: 'Conclusion', icon: 'pen', meta: 'Temi · not started' },
    { id: 'people', label: 'Family & access', icon: 'people', meta: '4 members' },
  ];

  return (
    <StoreCtx.Provider value={store}>
      <div className="app">
        <header className="top">
          <div className="brand">
            <svg viewBox="0 0 32 32" width="28" height="28">
              <rect x="1" y="1" width="30" height="30" rx="7" fill="#1f4e5f" />
              <path d="M12 8v7.5L7.5 23.5h17L20 15.5V8M10.5 8h11" fill="none" stroke="#f6f1e6" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
              <path d="M10.4 19.5h11.2" stroke="#e3a857" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <div>
              <div className="brand-n">Benchtop</div>
              <div className="brand-s">Family Notebook</div>
            </div>
          </div>
          <div className="proj">
            <div className="proj-t">Can mealworms eat polystyrene foam?</div>
            <div className="proj-s">
              <Avatar id="temi" size={16} /> Temi Oyelaran · 7th grade · Ms. Albrecht’s science class
            </div>
          </div>
          <div className="top-r">
            <div className="tstat">
              <span className="tstat-l">Experiment</span>
              <span className="tstat-v">
                Day {TODAY_DAY} of {PLANNED_DAYS}
              </span>
              <span className="prog">
                <span style={{ width: `${(TODAY_DAY / PLANNED_DAYS) * 100}%` }} />
              </span>
            </div>
            <div className="tstat tstat-fair">
              <span className="tstat-l">
                <Icon name="calendar" size={12} /> Science fair
              </span>
              <span className="tstat-v">
                {fmtDate(FAIR_DATE)} · {daysLeft} days
              </span>
            </div>
            <div className="me">
              <Avatar id="marcus" size={32} />
              <div>
                <div className="me-n">Marcus</div>
                <div className="me-r">Data &amp; comments</div>
              </div>
            </div>
          </div>
        </header>

        <nav className="side">
          {nav.map((n) => (
            <button key={n.id} className={'nav' + (view === n.id ? ' on' : '')} onClick={() => go(n.id)}>
              <Icon name={n.icon} size={18} />
              <span className="nav-main">
                <span className="nav-l">{n.label}</span>
                <span className="nav-m">{n.meta}</span>
              </span>
              {n.badge}
            </button>
          ))}

          <div className="perm-box">
            <div className="perm-h">What you can do</div>
            <div className="perm-r yes">
              <Icon name="check" size={14} /> Add readings &amp; photos
            </div>
            <div className="perm-r yes">
              <Icon name="check" size={14} /> Comment &amp; ask questions
            </div>
            <div className="perm-r no">
              <Icon name="lock" size={14} /> Edit Temi’s hypothesis, procedure or conclusion
            </div>
            <div className="perm-r no">
              <Icon name="lock" size={14} /> Change readings others entered
            </div>
            <div className="perm-f">Fair rule 4.2: the student writes the hypothesis and conclusions herself.</div>
          </div>
          <div className="side-foot muted tiny">Comments are visible to Temi, Grandma Funmi and Ms. Albrecht.</div>
        </nav>

        <main className="main page-scroll" ref={scroller}>
          {view === 'changes' && <Changes />}
          {view === 'hypothesis' && <Hypothesis />}
          {view === 'procedure' && <Procedure />}
          {view === 'data' && <Data />}
          {view === 'photos' && <Photos />}
          {view === 'conclusion' && <Conclusion />}
          {view === 'people' && <People />}
        </main>

        <Discussion />

        <div className="toasts">
          {toasts.map((t) => (
            <div className="toast" key={t.id}>
              <Icon name="check" size={15} /> {t.msg}
            </div>
          ))}
        </div>
      </div>
    </StoreCtx.Provider>
  );
}
