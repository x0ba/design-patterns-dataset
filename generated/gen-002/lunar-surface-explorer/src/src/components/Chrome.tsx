import { useEffect, useMemo, useRef, useState } from 'react';
import { Place, SavedPlace, SUGGESTED_KEYS, getPlace, searchPlaces } from '../data';
import { fmtLatLon, fmtNum, toVec, V3 } from '../lib/geo';
import { DAY_MS, illumination, phaseName, sunElevation, sunVector } from '../lib/sun';
import { fmtDate, fmtUtc } from '../lib/describe';
import type { Layers, ViewInfo } from '../engine/Engine';
import { Icon } from './Icon';

/* ───────────── Search ───────────── */
export function SearchBox({ onPick }: { onPick: (key: string) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const results: Place[] = useMemo(() => {
    if (!q.trim()) return SUGGESTED_KEYS.map((k) => getPlace(k)!).filter(Boolean);
    return searchPlaces(q, 8);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  useEffect(() => setHi(0), [q]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        (ref.current?.querySelector('input') as HTMLInputElement)?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pick = (p: Place) => { onPick(p.key); setOpen(false); setQ(''); (document.activeElement as HTMLElement)?.blur(); };

  return (
    <div className="search" ref={ref}>
      <Icon name="search" size={18} />
      <input
        type="text" role="combobox" aria-expanded={open} aria-controls="search-list" aria-autocomplete="list"
        aria-activedescendant={open ? `sr-${hi}` : undefined}
        placeholder="Search craters, seas, landing sites, missions…" value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(results.length - 1, h + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
          else if (e.key === 'Enter' && results[hi]) pick(results[hi]);
          else if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur(); }
        }}
      />
      {q && <button className="icon-btn clear" aria-label="Clear search" onClick={() => setQ('')}><Icon name="close" size={14} /></button>}
      <kbd className="slash" aria-hidden>/</kbd>
      {open && (
        <ul id="search-list" className="results" role="listbox">
          {!q.trim() && <li className="rl-head" role="presentation">Try one of these</li>}
          {q.trim() && results.length === 0 && <li className="rl-empty" role="presentation">No match for “{q}”. Try a crater name like “Tycho”, or “Apollo 11”.</li>}
          {results.map((p, i) => (
            <li key={p.key} id={`sr-${i}`} role="option" aria-selected={i === hi} className={i === hi ? 'hi' : ''}
              onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); pick(p); }}>
              <span className={'rl-ic ' + (p.type === 'apollo' ? 'apollo' : p.type === 'robotic' ? 'robotic st-' + p.robotic!.status : 'feat')} />
              <span className="rl-main">
                <b>{highlight(p.name, q)}</b>
                <small>{p.kindLabel} · {fmtLatLon(p.lat, p.lon, 0)}</small>
              </span>
              {p.key === 'r:polar-scout' && <span className="rl-new">New</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function highlight(name: string, q: string) {
  const i = name.toLowerCase().indexOf(q.trim().toLowerCase());
  if (!q.trim() || i < 0) return name;
  return <>{name.slice(0, i)}<mark>{name.slice(i, i + q.trim().length)}</mark>{name.slice(i + q.trim().length)}</>;
}

/* ───────────── Saved places ───────────── */
export function SavedMenu({
  saved, onOpen, onRemove, onNote, openState, setOpenState,
}: {
  saved: SavedPlace[]; onOpen: (k: string) => void; onRemove: (k: string) => void; onNote: (k: string, n: string) => void;
  openState: boolean; setOpenState: (b: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => {
    if (!openState) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpenState(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenState(false); };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey); };
  }, [openState, setOpenState]);
  return (
    <div className="saved" ref={ref}>
      <button className={'btn top' + (openState ? ' on' : '')} aria-expanded={openState} aria-haspopup="true" onClick={() => setOpenState(!openState)}>
        <Icon name="bookmark" /> Saved places <span className="count">{saved.length}</span>
      </button>
      {openState && (
        <div className="saved-pop" role="dialog" aria-label="Saved places">
          <h2>Your saved places</h2>
          {saved.length === 0 && <p className="empty">Nothing saved yet. Open any crater or landing site and choose “Save this place”.</p>}
          <ul>
            {[...saved].reverse().map((s) => {
              const p = getPlace(s.key);
              if (!p) return null;
              return (
                <li key={s.key}>
                  <button className="sv-main" onClick={() => { onOpen(s.key); setOpenState(false); }}>
                    <span className={'rl-ic ' + (p.type === 'apollo' ? 'apollo' : p.type === 'robotic' ? 'robotic st-' + p.robotic!.status : 'feat')} />
                    <span>
                      <b>{p.name}</b>
                      <small>{p.kindLabel} · saved {fmtDate(s.savedAt, { day: 'numeric', month: 'short' })}</small>
                    </span>
                  </button>
                  <button className="icon-btn" aria-label={`Remove ${p.name} from saved places`} onClick={() => onRemove(s.key)}><Icon name="trash" size={15} /></button>
                                  {editing === s.key ? (
                    <input autoFocus className="sv-note-in" defaultValue={s.note} maxLength={90} placeholder="Add a note"
                      onBlur={(e) => { onNote(s.key, e.target.value); setEditing(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                  ) : (
                    <button className="sv-note" onClick={() => setEditing(s.key)} title="Edit note">
                      {s.note ? s.note : <i>Add a note</i>} <Icon name="edit" size={12} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ───────────── Map controls ───────────── */
export function MapControls({
  onZoom, onTilt, tilted, onGlobe, onPole,
}: { onZoom: (f: number) => void; onTilt: () => void; tilted: boolean; onGlobe: () => void; onPole: () => void }) {
  return (
    <div className="mapctl" role="group" aria-label="Map controls">
      <button aria-label="Zoom in" title="Zoom in" onClick={() => onZoom(0.55)}><Icon name="plus" size={18} /></button>
      <button aria-label="Zoom out" title="Zoom out" onClick={() => onZoom(1.8)}><Icon name="minus" size={18} /></button>
      <button aria-label="Tilt the view for a 3D look" aria-pressed={tilted} className={tilted ? 'on' : ''} title="Tilt for a 3D look" onClick={onTilt}>
        <Icon name="tilt" size={18} /><span>3D</span>
      </button>
      <button aria-label="Show the whole Moon" title="Whole Moon" onClick={onGlobe}><Icon name="globe" size={18} /></button>
      <button aria-label="Go to the south pole" title="South pole" onClick={onPole}><Icon name="pole" size={18} /></button>
    </div>
  );
}

/* ───────────── Layers ───────────── */
export function LayersMenu({ layers, setLayers }: { layers: Layers; setLayers: (l: Layers) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const item = (k: keyof Layers, label: string, dot: string) => (
    <label key={k} className="lay-item">
      <input type="checkbox" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />
      <span className={'lay-dot ' + dot} />{label}
    </label>
  );
  return (
    <div className="layers" ref={ref}>
      <button className={'btn dark' + (open ? ' on' : '')} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="layers" /> Map layers
      </button>
      {open && (
        <div className="lay-pop">
          {item('missions', 'Landing sites and missions', 'ms')}
          {item('labels', 'Place names', 'nm')}
          {item('shadow', 'Never-sunlit areas (blue)', 'psr')}
          {item('saved', 'Saved places', 'sv')}
          <div className="lay-key">
            <span><i className="kk apollo" />Apollo</span>
            <span><i className="kk robotic st-active" />Active</span>
            <span><i className="kk robotic st-ended" />Ended</span>
            <span><i className="kk robotic st-crashed" />Crashed</span>
          </div>
          <p className="lay-note">Positions and sizes follow the catalogue. Surface texture is illustrative, not a photograph.</p>
        </div>
      )}
    </div>
  );
}

/* ───────────── Locator + sun compass ───────────── */
export function Locator({ view, time, mark }: { view: ViewInfo | null; time: number; mark: Place }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const S = 76, dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = S * dpr; c.height = S * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sun = sunVector(time);
    const img = ctx.createImageData(S * dpr, S * dpr);
    const rad = (S * dpr) / 2 - 2 * dpr;
    const cx = (S * dpr) / 2;
    for (let j = 0; j < S * dpr; j++) {
      for (let i = 0; i < S * dpr; i++) {
        const x = (i - cx) / rad, y = -(j - cx) / rad;
        const r2 = x * x + y * y;
        const o = (j * S * dpr + i) * 4;
        if (r2 > 1) { img.data[o + 3] = 0; continue; }
        const z = Math.sqrt(1 - r2);
        const d = Math.max(0, x * sun[0] + y * sun[1] + z * sun[2]);
        const m = 0.18 + 0.72 * Math.pow(d, 0.7);
        img.data[o] = 200 * m; img.data[o + 1] = 202 * m; img.data[o + 2] = 210 * m; img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dot = (lat: number, lon: number, fill: string, r: number, stroke?: string) => {
      const v = toVec(lat, lon) as V3;
      const x = S / 2 + v[0] * (S / 2 - 2), y = S / 2 - v[1] * (S / 2 - 2);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      if (v[2] < 0) { ctx.globalAlpha = 0.5; ctx.setLineDash([2, 2]); ctx.strokeStyle = stroke ?? fill; ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
      else { ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); } }
    };
    if (view) {
      dot(mark.lat, mark.lon, '#7cc7ff', 3, '#04101c');
      // view focus (ring)
      const v = toVec(view.lat, view.lon) as V3;
      const x = S / 2 + v[0] * (S / 2 - 2), y = S / 2 - v[1] * (S / 2 - 2);
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.globalAlpha = v[2] < 0 ? 0.5 : 1; ctx.stroke(); ctx.globalAlpha = 1;
    }
  }, [view?.lat, view?.lon, time, mark.key]);

  const sunAng = view ? view.sunAngle : 0;
  const el = view ? view.sunEl : 0;
  return (
    <div className="locator" aria-label="Where on the Moon you are looking">
      <div className="loc-col">
        <canvas ref={cv} style={{ width: 76, height: 76 }} role="img" aria-label="Moon as seen from Earth, with the current view marked" />
        <span className="loc-cap">The Moon from Earth</span>
      </div>
      <div className="loc-col">
        <div className="compass" aria-hidden>
          <svg viewBox="-38 -38 76 76" width="76" height="76">
            <circle r="34" className="cp-ring" />
            <g transform={`rotate(${-sunAng + 90})`} opacity={el < 0 ? 0.35 : 1}>
              <line x1="0" y1="0" x2="0" y2="-20" className="cp-arrow" />
              <path d="M-5 -17 L0 -26 L5 -17 Z" className="cp-head" />
              <circle cx="0" cy="-30" r="4.5" className="cp-sun" />
            </g>
            <circle r="2.4" className="cp-c" />
          </svg>
        </div>
        <span className="loc-cap">{el < -0.5 ? 'Sun is below the horizon' : `Sunlight direction`}</span>
      </div>
    </div>
  );
}

/* ───────────── Time bar ───────────── */
const SPAN_DAYS = 45;
export function TimeBar({
  time, setTime, today, playing, setPlaying, place,
}: { time: number; setTime: (t: number) => void; today: number; playing: boolean; setPlaying: (b: boolean) => void; place: Place }) {
  const off = (time - today) / DAY_MS;
  const el = sunElevation(place.lat, place.lon, time);
  const dateStr = new Date(time).toISOString().slice(0, 10);
  const phase = phaseName(time);
  const lit = Math.round(illumination(time) * 100);
  const step = (d: number) => { setPlaying(false); setTime(time + d * DAY_MS); };
  const nm = place.apollo ? place.apollo.mission : place.name;
  return (
    <div className="timebar" role="group" aria-label="Date and sunlight">
      <button className="tb-play" aria-label={playing ? 'Pause' : 'Play the passing days'} onClick={() => setPlaying(!playing)}>
        <Icon name={playing ? 'pause' : 'play'} size={16} />
      </button>
      <div className="tb-date">
        <label htmlFor="tb-d">Sunlight on</label>
        <div className="tb-date-row">
          <button className="icon-btn" aria-label="Previous day" onClick={() => step(-1)}><Icon name="prev" size={12} /></button>
          <input id="tb-d" type="date" value={dateStr} min="1950-01-01" max="2100-12-31"
            onChange={(e) => {
              if (!e.target.value) return;
              const [y, m, d] = e.target.value.split('-').map(Number);
              setPlaying(false);
              setTime(Date.UTC(y, m - 1, d, new Date(time).getUTCHours(), 0));
            }} />
          <button className="icon-btn" aria-label="Next day" onClick={() => step(1)}><Icon name="next" size={12} /></button>
        </div>
      </div>
      <div className="tb-slide">
        <input type="range" min={-SPAN_DAYS * 4} max={SPAN_DAYS * 4} step={1} value={Math.round(off * 4)} aria-label="Move through time"
          onChange={(e) => { setPlaying(false); setTime(today + (parseInt(e.target.value) / 4) * DAY_MS); }} />
        <div className="tb-ticks"><span>−{SPAN_DAYS} days</span><span>{fmtUtc(time).split(' · ')[1]}</span><span>+{SPAN_DAYS} days</span></div>
      </div>
      <button className="btn" onClick={() => { setPlaying(false); setTime(today); }} disabled={Math.abs(off) < 0.01}>Today</button>
      <div className={'tb-sun' + (el > 0 ? ' up' : '')}>
        <span className="tb-sun-n">{el < 0 ? '–' : ''}{fmtNum(Math.abs(el), Math.abs(el) < 10 ? 1 : 0)}°</span>
        <span className="tb-sun-t"><b>Sun at {nm}</b>{el < -0.5 ? 'below the horizon' : el < 6 ? 'skimming the horizon' : 'above the horizon'}</span>
      </div>
      <div className="tb-phase" title="How the Moon looks from Earth on this date"><b>{phase}</b>{lit}% lit</div>
    </div>
  );
}

export function Toast({ msg }: { msg: string | null }) {
  return <div className={'toast' + (msg ? ' show' : '')} role="status" aria-live="polite">{msg}</div>;
}
