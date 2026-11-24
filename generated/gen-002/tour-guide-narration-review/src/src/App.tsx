import { createContext, useContext, useEffect, useReducer, useRef, type Dispatch } from 'react';
import { initialState, reducer, type Action, type State } from './store';
import { chapterIndexAt, fmtFor } from './util';
import Sidebar from './components/Sidebar';
import NowPlaying from './components/NowPlaying';
import PlayerBar from './components/PlayerBar';
import ToursView from './components/ToursView';
import LecturesView from './components/LecturesView';
import BookmarksView from './components/BookmarksView';
import Toast from './components/Toast';

interface Ctx {
  state: State;
  dispatch: Dispatch<Action>;
}
const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable || el.tagName === 'SELECT';
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Simulated playback clock
  useEffect(() => {
    if (!state.playing) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: 'tick', dt: (now - last) / 1000 });
      last = now;
    }, 100);
    return () => window.clearInterval(id);
  }, [state.playing]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = stateRef.current;
      const item = s.items[s.currentId];
      const label = (t: number) => fmtFor(item, t);
      if (e.code === 'Space') {
        e.preventDefault();
        dispatch({ type: 'toggle' });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const dir = e.key === 'ArrowLeft' ? -1 : 1;
        if (e.shiftKey) {
          const ci = chapterIndexAt(item.chapters, s.position);
          const ch = item.chapters[ci];
          let target: number;
          if (dir < 0) target = s.position - ch.start > 3 || ci === 0 ? ch.start : item.chapters[ci - 1].start;
          else target = ci < item.chapters.length - 1 ? item.chapters[ci + 1].start : item.duration;
          dispatch({ type: 'seek', t: target });
        } else dispatch({ type: 'skip', by: dir < 0 ? -15 : 30 });
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        dispatch({ type: 'addBookmark' });
      } else if ((e.key === '[' || e.key === ']') && item.kind === 'tour') {
        e.preventDefault();
        const kind = e.key === '[' ? 'cut-start' : 'cut-end';
        dispatch({ type: 'addBookmark', kind });
        dispatch({ type: 'toast', text: `${kind === 'cut-start' ? 'Cut starts' : 'Cut ends'} at ${label(s.position)}` });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const current = state.items[state.currentId];
  useEffect(() => {
    document.title = `${state.playing ? '▶ ' : ''}${current.title}${current.kind === 'tour' ? ` (${current.subtitle.toLowerCase()})` : ''} — Stopwise`;
  }, [current, state.playing]);

  return (
    <AppCtx.Provider value={{ state, dispatch }}>
      <div className="app">
        <Sidebar />
        <main className="main">
          {state.view === 'now' && <NowPlaying />}
          {state.view === 'tours' && <ToursView />}
          {state.view === 'lectures' && <LecturesView />}
          {state.view === 'bookmarks' && <BookmarksView />}
        </main>
        <PlayerBar />
        <Toast />
      </div>
    </AppCtx.Provider>
  );
}
