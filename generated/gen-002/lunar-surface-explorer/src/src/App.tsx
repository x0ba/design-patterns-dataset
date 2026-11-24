import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_PLACE, getPlace, SavedPlace, SEED_SAVED } from './data';
import { Engine, Layers, ViewInfo } from './engine/Engine';
import { loadTerrain } from './engine/terrain';
import { Panel } from './components/Panel';
import { LayersMenu, Locator, MapControls, SavedMenu, SearchBox, TimeBar, Toast } from './components/Chrome';
import { Tab, viewFor } from './lib/framing';
import { DAY_MS } from './lib/sun';
import { Icon } from './components/Icon';

/** The story takes place on this day. */
export const TODAY = Date.UTC(2026, 10, 17, 15, 0);
const TODAY_ISO = '2026-11-17';
const SAVE_KEY = 'lunaview.saved.v1';

function loadSaved(): SavedPlace[] {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as SavedPlace[];
      if (Array.isArray(arr)) return arr.filter((s) => getPlace(s.key));
    }
  } catch { /* ignore */ }
  return SEED_SAVED;
}

function parseHash() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const p = h.get('p');
  const tab = h.get('tab') as Tab | null;
  const t = Number(h.get('t'));
  return {
    key: p && getPlace(p) ? p : DEFAULT_PLACE,
    tab: tab && ['about', 'sun', 'compare'].includes(tab) ? tab : ('about' as Tab),
    time: Number.isFinite(t) && t > 0 ? t : TODAY,
    cmp: h.get('c') && getPlace(h.get('c')!) ? h.get('c')! : 'a:apollo-11',
  };
}

export default function App() {
  const init = useMemo(parseHash, []);
  const [placeKey, setPlaceKey] = useState(init.key);
  const [tab, setTab] = useState<Tab>(init.tab);
  const [time, setTime] = useState(init.time);
  const [playing, setPlaying] = useState(false);
  const [closeUp, setCloseUp] = useState(false);
  const [compareKey, setCompareKey] = useState(init.cmp);
  const [sliderSun, setSliderSun] = useState<number | null>(null);
  const [saved, setSaved] = useState<SavedPlace[]>(loadSaved);
  const [savedOpen, setSavedOpen] = useState(false);
  const [noteEditing, setNoteEditing] = useState(false);
  const [layers, setLayers] = useState<Layers>({ missions: true, labels: true, shadow: true, saved: true });
  const [view, setView] = useState<ViewInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const firstFrame = useRef(true);
  const toastTimer = useRef<number | undefined>(undefined);

  const place = getPlace(placeKey)!;
  const effCompare = compareKey === placeKey ? (placeKey === 'a:apollo-11' ? 'r:polar-scout' : 'a:apollo-11') : compareKey;
  const comparePlace = getPlace(effCompare)!;

  const say = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const select = useCallback((key: string) => {
    setPlaceKey(key);
    setTab('about');
    setCloseUp(false);
    setSliderSun(null);
    setNoteEditing(false);
  }, []);

  /* ── engine lifecycle ── */
  const selectRef = useRef(select);
  selectRef.current = select;
  useEffect(() => {
    const host = hostRef.current!;
    let engine: Engine;
    try {
      engine = new Engine(host, {
        onSelect: (k) => selectRef.current(k),
        onView: (v) => setView(v),
        onInteract: () => { setPlaying(false); },
      });
    } catch (e) {
      setFailed('Your browser could not start 3D graphics (WebGL). Try a recent version of Chrome, Edge, Firefox or Safari.');
      return;
    }
    engineRef.current = engine;
    loadTerrain((p) => setProgress(p))
      .then((t) => {
        engine.setTerrain(t);
        setReady(true);
      })
      .catch((e) => { console.error(e); setFailed('The Moon’s surface map could not be built in this browser.'); });
    return () => { engine.dispose(); engineRef.current = null; };
  }, []);

  /* ── push state into the engine ── */
  useEffect(() => { engineRef.current?.setLayers(layers); }, [layers, ready]);
  useEffect(() => { engineRef.current?.setTime(time); }, [time, ready]);
  useEffect(() => { engineRef.current?.setSavedKeys(saved.map((s) => s.key)); }, [saved, ready]);
  useEffect(() => {
    const e = engineRef.current;
    if (!e || !ready) return;
    e.setSelected(placeKey);
    e.setCompare(tab === 'compare' ? effCompare : null);
    const gap = placeKey === 'f:haworth' || placeKey === 'r:polar-scout';
    e.setGuides({ gap, sunBeam: tab === 'sun' });
    const v = viewFor(place, tab, tab === 'compare' ? comparePlace : null, closeUp);
    if (firstFrame.current) { e.flyTo({ ...v, duration: 0 }); firstFrame.current = false; }
    else e.flyTo(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey, tab, effCompare, closeUp, ready]);

  /* ── play the days ── */
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setTime((t) => t + DAY_MS * 0.09), 70);
    return () => window.clearInterval(id);
  }, [playing]);

  /* ── url + title ── */
  useEffect(() => {
    document.title = `${place.name} · Lunaview`;
    const h = new URLSearchParams();
    h.set('p', placeKey);
    if (tab !== 'about') h.set('tab', tab);
    if (tab === 'compare') h.set('c', effCompare);
    if (Math.abs(time - TODAY) > 60000) h.set('t', String(Math.round(time / 60000) * 60000));
    const id = window.setTimeout(() => history.replaceState(null, '', '#' + h.toString()), 250);
    return () => window.clearTimeout(id);
  }, [placeKey, tab, time, effCompare, place.name]);

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { /* ignore */ }
  }, [saved]);

  /* ── actions ── */
  const isSaved = saved.some((s) => s.key === placeKey);
  const toggleSave = () => {
    if (isSaved) {
      setSaved((s) => s.filter((x) => x.key !== placeKey));
      setNoteEditing(false);
      say(`Removed ${place.name} from your saved places`);
    } else {
      setSaved((s) => [...s, { key: placeKey, note: '', savedAt: TODAY_ISO }]);
      setNoteEditing(true);
      say(`Saved ${place.name}`);
    }
  };
  const setNote = (key: string, note: string) => setSaved((s) => s.map((x) => (x.key === key ? { ...x, note } : x)));
  const share = () => {
    const url = location.href;
    const done = () => say('Link copied. It opens right to this view.');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, () => { fallbackCopy(url); done(); });
    else { fallbackCopy(url); done(); }
  };

  const flyRel = (o: { tilt?: number; range?: number }) => {
    const e = engineRef.current;
    if (!e || !view) return;
    e.flyTo({ lat: view.lat, lon: view.lon, range: o.range ?? view.range, tilt: o.tilt ?? view.tilt, duration: 0.8 });
  };
  const tilted = !!view && view.tilt > 8;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); select(DEFAULT_PLACE); setTime(TODAY); }} aria-label="Lunaview home">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
            <defs><radialGradient id="bm" cx=".35" cy=".3" r=".9"><stop offset="0" stopColor="#f4f1e8" /><stop offset="1" stopColor="#8d93a3" /></radialGradient></defs>
            <circle cx="13" cy="13" r="12" fill="url(#bm)" />
            <circle cx="9" cy="9" r="2.6" fill="#000" opacity=".16" /><circle cx="16.5" cy="15" r="3.4" fill="#000" opacity=".14" /><circle cx="10" cy="18" r="1.6" fill="#000" opacity=".16" />
          </svg>
          <span>Lunaview</span>
        </a>
        <SearchBox onPick={select} />
        <div className="topbar-r">
          <SavedMenu
            saved={saved} openState={savedOpen} setOpenState={setSavedOpen}
            onOpen={select}
            onRemove={(k) => { setSaved((s) => s.filter((x) => x.key !== k)); if (k === placeKey) setNoteEditing(false); }}
            onNote={setNote}
          />
        </div>
      </header>

      <main className="main">
        <Panel
          place={place} tab={tab} setTab={(t) => { setTab(t); if (t !== 'about') setCloseUp(false); }}
          time={time} setTime={(t) => { setPlaying(false); setTime(t); }} today={TODAY}
          closeUp={closeUp} setCloseUp={setCloseUp}
          compareKey={effCompare} setCompareKey={setCompareKey} onSelect={select}
          saved={saved} isSaved={isSaved} onToggleSave={toggleSave} onShare={share}
          noteEditing={noteEditing} onNote={(n) => setNote(placeKey, n)} onCloseNote={() => setNoteEditing(false)}
          sliderSun={sliderSun} setSliderSun={setSliderSun}
        />

        <section className="stage" aria-label="3D Moon">
          <div className="moon-host" ref={hostRef} />
          <div className="stage-tl">
            <LayersMenu layers={layers} setLayers={setLayers} />
            <Locator view={view} time={time} mark={place} />
          </div>
          <MapControls
            onZoom={(f) => engineRef.current?.zoomBy(f)}
            tilted={tilted}
            onTilt={() => flyRel({ tilt: tilted ? 0 : 50 })}
            onGlobe={() => engineRef.current?.flyTo({ lat: place.lat * 0.45, lon: place.lon, range: 4.9, tilt: 0, duration: 1.8 })}
            onPole={() => engineRef.current?.flyTo({ lat: -90, lon: 0, range: 0.38, tilt: 0, duration: 1.8 })}
          />
          <TimeBar time={time} setTime={setTime} today={TODAY} playing={playing} setPlaying={setPlaying} place={place} />
          {ready && layers.shadow && view && view.lat < -80 && view.range < 0.9 && (
            <div className="psr-key"><i /> Blue: never reached by sunlight</div>
          )}
          <div className="hint" aria-hidden>Drag to turn the Moon · scroll to zoom · double-click to fly in · hold Shift and drag to tilt</div>
          {!ready && !failed && (
            <div className="loading" role="status">
              <div className="ld-moon" />
              <p>Charting the Moon’s surface…</p>
              <div className="ld-bar"><i style={{ width: `${Math.max(8, progress * 100)}%` }} /></div>
            </div>
          )}
          {failed && (
            <div className="loading err" role="alert"><Icon name="info" size={28} /><p>{failed}</p></div>
          )}
        </section>
      </main>
      <Toast msg={toast} />
    </div>
  );
}

function fallbackCopy(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
  ta.remove();
}
