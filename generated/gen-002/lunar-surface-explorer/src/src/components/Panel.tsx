import { useMemo, useState } from 'react';
import {
  Place, getPlace, POLAR_SCOUT, HAWORTH_CENTER, POLAR_SCOUT_GAP_KM, ICE_PERCENT, ROBOTIC, FEATURE_BY_ID, Feature, SavedPlace,
} from '../data';
import { distanceKm, fmtAge, fmtDist, fmtLatLon, fmtNum, fmtTemp, kmToMi } from '../lib/geo';
import { DAY_MS, maxElevation, nextHorizonCrossing } from '../lib/sun';
import { dayNightPattern, elLabel, fmtDate, sunWords } from '../lib/describe';
import { sunElevation } from '../lib/sun';
import { CraterSunDiagram, SunChart, floorThresholdDeg } from './SunViz';
import { CompareTab } from './CompareTab';
import type { Tab } from '../lib/framing';
import { Icon } from './Icon';

export interface PanelProps {
  place: Place;
  tab: Tab;
  setTab: (t: Tab) => void;
  time: number;
  setTime: (t: number) => void;
  today: number;
  closeUp: boolean;
  setCloseUp: (b: boolean) => void;
  compareKey: string;
  setCompareKey: (k: string) => void;
  onSelect: (k: string) => void;
  saved: SavedPlace[];
  isSaved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  noteEditing: boolean;
  onNote: (note: string) => void;
  onCloseNote: () => void;
  sliderSun: number | null;
  setSliderSun: (v: number | null) => void;
}

const TAB_LABEL: Record<Tab, string> = { about: 'About', sun: 'Sunlight', compare: 'Compare' };

export function Panel(p: PanelProps) {
  const { place } = p;
  const noteVal = p.saved.find((s) => s.key === place.key)?.note ?? '';
  return (
    <aside className="panel" aria-label="Place details">
      <header className="ph">
        <div className="ph-top">
          <span className="kind">
            <KindDot place={place} />
            {place.kindLabel}
          </span>
          <span className="ph-actions">
            <button className="btn ghost" onClick={p.onShare} title="Copy a link to this view">
              <Icon name="link" /> Share
            </button>
            <button className={'btn save' + (p.isSaved ? ' on' : '')} onClick={p.onToggleSave} aria-pressed={p.isSaved}>
              <Icon name={p.isSaved ? 'bookmark-fill' : 'bookmark'} /> {p.isSaved ? 'Saved' : 'Save this place'}
            </button>
          </span>
        </div>
        <h1>{place.type === 'apollo' ? `${place.apollo!.mission}` : place.name}</h1>
        <p className="sub">
          {place.type === 'apollo' ? `${place.apollo!.siteName} · ` : ''}
          {fmtLatLon(place.lat, place.lon)}
          {place.type === 'feature' && place.feature!.parent ? '' : ''}
        </p>
        {p.isSaved && p.noteEditing && (
          <div className="note-pop" role="group" aria-label="Add a note">
            <label htmlFor="note-in">Saved. Add a note to remind yourself why (optional):</label>
            <div className="note-row">
              <input id="note-in" autoFocus defaultValue={noteVal} placeholder="e.g. Show my nephew on Saturday" maxLength={90}
                onKeyDown={(e) => { if (e.key === 'Enter') p.onCloseNote(); }}
                onChange={(e) => p.onNote(e.target.value)} />
              <button className="btn" onClick={p.onCloseNote}>Done</button>
            </div>
          </div>
        )}
        {p.isSaved && !p.noteEditing && noteVal && <p className="note-show"><Icon name="note" /> {noteVal}</p>}
      </header>

      <div className="tabs" role="tablist">
        {(['about', 'sun', 'compare'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={p.tab === t} className={p.tab === t ? 'on' : ''} onClick={() => p.setTab(t)}>
            {t === 'sun' && place.feature?.psr ? 'Why it’s dark' : TAB_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="pbody" key={place.key + p.tab} role="tabpanel">
        {p.tab === 'about' && <About {...p} />}
        {p.tab === 'sun' && <SunTab {...p} />}
        {p.tab === 'compare' && (
          <CompareTab place={place} time={p.time} compareKey={p.compareKey} setCompareKey={p.setCompareKey} onSelect={p.onSelect} />
        )}
      </div>
    </aside>
  );
}

function KindDot({ place }: { place: Place }) {
  const cls = place.type === 'apollo' ? 'apollo' : place.type === 'robotic' ? 'robotic ' + place.robotic!.status : 'feature';
  return <span className={'kdot ' + cls} aria-hidden />;
}

/* ───────────────────────────── ABOUT ───────────────────────────── */
function About(p: PanelProps) {
  const { place } = p;
  if (place.key === 'f:haworth') return <AboutHaworth {...p} />;
  if (place.type === 'apollo') return <AboutApollo {...p} />;
  if (place.type === 'robotic') return <AboutRobotic {...p} />;
  return <AboutFeature {...p} />;
}

function Fact({ k, v, hint }: { k: string; v: React.ReactNode; hint?: string }) {
  return (
    <div className="fact">
      <dt>{k}</dt>
      <dd>{v}</dd>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function IceBar() {
  const cells = Array.from({ length: 100 }, (_, i) => i);
  return (
    <div className="icebar" role="img" aria-label={`${ICE_PERCENT.low} to ${ICE_PERCENT.high} percent of the soil by weight is water ice`}>
      <div className="cells">
        {cells.map((i) => (
          <i key={i} className={i < ICE_PERCENT.low ? 'full' : i < ICE_PERCENT.high ? 'part' : ''} />
        ))}
      </div>
      <div className="icebar-lab">
        <span><b>3–5%</b> ice by weight</span>
        <span>95–97% rock and dust</span>
      </div>
    </div>
  );
}

function AboutHaworth(p: PanelProps) {
  const f = FEATURE_BY_ID.get('haworth')!;
  const poleKm = distanceKm(f.lat, f.lon, -90, 0);
  const days = Math.max(0, Math.floor((p.today - Date.UTC(2026, 9, 28)) / DAY_MS));
  const rimToCenter = HAWORTH_CENTER.diameter / 2 + POLAR_SCOUT_GAP_KM;
  const ratio = HAWORTH_CENTER.diameter / POLAR_SCOUT_GAP_KM;
  return (
    <>
      <section className="finding">
        <div className="eyebrow"><span className="pulse" /> Latest finding · 28 October 2026</div>
        <h2>Water ice, right next to Haworth</h2>
        <p>
          The robotic lander <button className="inline" onClick={() => p.onSelect('r:polar-scout')}>Polar Scout</button> touched
          down just <b>{fmtDist(POLAR_SCOUT_GAP_KM)}</b> outside Haworth’s rim. It reports ice making up an estimated{' '}
          <b>{ICE_PERCENT.low}–{ICE_PERCENT.high}%</b> of the lunar soil by weight.
        </p>
        <IceBar />
        <p className="aside">
          That is roughly 2–3 tablespoons of water in every kilogram (2.2 lb) of soil. Haworth’s floor is one of the places
          that stays dark all the time, which is where ice is expected to survive.
        </p>
      </section>

      <section className="card gapcard">
        <h3>How close did it land?</h3>
        <div className="gap-viz" aria-hidden>
          <div className="gv-crater"><span>Haworth · {fmtNum(HAWORTH_CENTER.diameter)} km wide</span></div>
          <div className="gv-gap"><i /></div>
          <div className="gv-lander"><i /></div>
        </div>
        <p>
          The gap is about <b>1/{fmtNum(ratio, 0)}</b> of the crater’s width: {fmtDist(POLAR_SCOUT_GAP_KM)} from the rim,
          or {fmtDist(rimToCenter)} from the crater’s center. That is about a 35-minute walk on Earth.
        </p>
        <button className={'btn wide' + (p.closeUp ? ' on' : '')} onClick={() => p.setCloseUp(!p.closeUp)}>
          <Icon name={p.closeUp ? 'zoom-out' : 'zoom-in'} /> {p.closeUp ? 'Back to the whole crater' : 'Zoom to the landing spot'}
        </button>
      </section>

      <section className="card">
        <h3>About Haworth</h3>
        <dl className="facts">
          <Fact k="Width" v={fmtDist(f.diameter)} />
          <Fact k="Depth" v={fmtDist(f.depth!, { digits: 1 })} />
          <Fact k="Distance to the pole" v={fmtDist(poleKm)} hint="The Moon’s south pole" />
          <Fact k="Age" v={fmtAge(f.ageMyr!)} />
        </dl>
        <p className="aside">Named after {f.namedAfter}.</p>
      </section>

      <section className="next">
        <button className="next-card" onClick={() => p.setTab('sun')}>
          <span className="nc-ic sun"><Icon name="sun" /></span>
          <span><b>Why is it always dark?</b><small>See how the crater walls shade the floor</small></span>
          <Icon name="chev" />
        </button>
        <button className="next-card" onClick={() => { p.setCompareKey('a:apollo-11'); p.setTab('compare'); }}>
          <span className="nc-ic flag"><Icon name="compare" /></span>
          <span><b>How far is Apollo 11?</b><small>Compare with the 1969 landing site</small></span>
          <Icon name="chev" />
        </button>
      </section>
      <p className="foot">Polar Scout has been on the surface for {days} days.</p>
    </>
  );
}

function AboutFeature(p: PanelProps) {
  const f = p.place.feature!;
  const near = ROBOTIC.filter((r) => r.featureNear === f.id);
  const sizeLabel = f.kind === 'crater' ? 'Width' : f.kind === 'mare' ? 'Width' : 'Length';
  const sibs = f.parent ? FEATURE_BY_ID.get(f.parent) : null;
  const blurb = f.blurb ?? genericBlurb(f);
  return (
    <>
      <section className="card plain">
        <p className="lead">{blurb}</p>
      </section>
      {near.map((r) => (
        <section className="card hl" key={r.id}>
          <div className="eyebrow">Visited by a robot</div>
          <h3>{r.name}</h3>
          <p>{r.summary}</p>
          <button className="btn" onClick={() => p.onSelect('r:' + r.id)}>See {r.name}</button>
        </section>
      ))}
      <section className="card">
        <h3>The facts</h3>
        <dl className="facts">
          <Fact k={sizeLabel} v={fmtDist(f.diameter)} />
          {f.depth != null && f.kind === 'crater' && <Fact k="Depth" v={fmtDist(f.depth, { digits: 1 })} />}
          {f.height != null && <Fact k="Peak height" v={fmtDist(f.height, { digits: 1 })} />}
          {f.ageMyr != null && <Fact k="Age" v={fmtAge(f.ageMyr)} />}
          {f.psr && <Fact k="Floor in permanent shadow" v={`${Math.round(f.psr.share * 100)}%`} />}
          {f.psr && <Fact k="Coldest recorded" v={fmtTemp(f.psr.minTempK)} hint={`${f.psr.minTempK} K`} />}
        </dl>
        <p className="aside">{f.kind === 'mare' ? f.namedAfter : `Named after ${f.namedAfter}${/[.)]$/.test(f.namedAfter) ? '' : '.'}`}</p>
        {sibs && <button className="inline" onClick={() => p.onSelect('f:' + sibs.id)}>Go to {sibs.name}</button>}
      </section>
      {f.psr && f.psr.share > 0.5 && (
        <section className="next">
          <button className="next-card" onClick={() => p.setTab('sun')}>
            <span className="nc-ic sun"><Icon name="sun" /></span>
            <span><b>Why is it always dark?</b><small>The shadow story behind {f.name}</small></span>
            <Icon name="chev" />
          </button>
        </section>
      )}
    </>
  );
}

function genericBlurb(f: Feature) {
  const sz = fmtDist(f.diameter);
  switch (f.kind) {
    case 'crater':
      return f.parent
        ? `A small crater, ${sz} across, next to ${FEATURE_BY_ID.get(f.parent)?.name ?? 'a larger crater'}. Small craters like this are named by adding a letter to a bigger neighbor.`
        : `${f.name} is a crater ${sz} wide${f.depth ? ` and ${fmtDist(f.depth, { digits: 1 })} deep` : ''}, carved out when a rock from space hit the Moon ${f.ageMyr ? fmtAge(f.ageMyr).replace('about ', 'about ') : 'long ago'}.`;
    case 'mare':
      return `${f.name} (“${f.english}”) is a vast, dark plain of old lava, about ${sz} across.`;
    case 'mountain':
      return `${f.name} is a mountain range or peak about ${sz} long, rising as high as ${f.height ? fmtDist(f.height, { digits: 1 }) : 'several kilometers'}.`;
    default:
      return `${f.name} is a long, narrow channel, about ${sz} long, where lava once flowed or the ground cracked and sank.`;
  }
}

function AboutApollo(p: PanelProps) {
  const a = p.place.apollo!;
  return (
    <>
      <section className="card plain">
        <p className="lead">{a.summary}</p>
        <dl className="facts">
          <Fact k="Landed" v={fmtDate(a.date)} />
          <Fact k="Where" v={a.region} />
          <Fact k="Time on the surface" v={a.surfaceTime} />
          <Fact k="Samples brought home" v={`${fmtNum(a.samplesKg, 1)} kg (${fmtNum(a.samplesKg * 2.2046, 0)} lb)`} />
        </dl>
      </section>
      <section className="card">
        <h3>The crew</h3>
        <ul className="crew">
          {a.crew.map((c) => (
            <li key={c.name}><b>{c.name}</b><span>{c.role}</span></li>
          ))}
        </ul>
      </section>
      <section className="card">
        <h3>What they left behind</h3>
        <ul className="bullets">{a.leftBehind.map((l) => <li key={l}>{l}</li>)}</ul>
      </section>
      {a.id === 'apollo-11' && (
        <section className="next">
          <button className="next-card" onClick={() => p.onSelect('f:haworth')}>
            <span className="nc-ic ice"><Icon name="drop" /></span>
            <span><b>Where Polar Scout found ice</b><small>Haworth crater, near the south pole</small></span>
            <Icon name="chev" />
          </button>
        </section>
      )}
    </>
  );
}

function AboutRobotic(p: PanelProps) {
  const r = p.place.robotic!;
  const isPS = r.id === 'polar-scout';
  const statusText = { active: 'Active on the surface', ended: 'Mission ended', crashed: r.kind === 'impactor' ? 'Planned impact' : 'Crashed' }[r.status];
  const days = Math.max(0, Math.floor((p.today - Date.parse(r.date + 'T00:00:00Z')) / DAY_MS));
  const f = r.featureNear ? FEATURE_BY_ID.get(r.featureNear) : null;
  return (
    <>
      <section className={'card ' + (isPS ? 'finding' : 'plain')}>
        {isPS && <div className="eyebrow"><span className="pulse" /> Newest mission</div>}
        <p className="lead">{r.summary}</p>
        {isPS && <IceBar />}
        {isPS && (
          <button className={'btn wide' + (p.closeUp ? ' on' : '')} onClick={() => p.setCloseUp(!p.closeUp)}>
            <Icon name={p.closeUp ? 'zoom-out' : 'zoom-in'} /> {p.closeUp ? 'Back out' : 'Zoom to the gap'}
          </button>
        )}
      </section>
      <section className="card">
        <h3>Mission facts</h3>
        <dl className="facts">
          <Fact k={r.kind === 'impactor' ? 'Impact date' : 'Landing date'} v={fmtDate(r.date)} />
          <Fact k="Operator" v={r.operator} />
          <Fact k="Status" v={<span className={'status ' + r.status}>{statusText}</span>} hint={r.status === 'active' ? `${days} days since landing` : undefined} />
          <Fact k="Type" v={r.kind === 'impactor' ? 'Impactor' : r.kind === 'rover' ? 'Rover' : 'Lander'} />
        </dl>
      </section>
      {f && (
        <section className="next">
          <button className="next-card" onClick={() => p.onSelect('f:' + f.id)}>
            <span className="nc-ic feat"><Icon name="crater" /></span>
            <span><b>{f.name} crater</b><small>{fmtDist(f.diameter)} wide{f.psr ? ` · ${Math.round(f.psr.share * 100)}% of the floor never sunlit` : ''}</small></span>
            <Icon name="chev" />
          </button>
        </section>
      )}
    </>
  );
}

/* ───────────────────────────── SUNLIGHT ───────────────────────────── */
function SunTab(p: PanelProps) {
  const { place, time } = p;
  const f = place.feature;
  const el = sunElevation(place.lat, place.lon, time);
  const peak = useMemo(() => maxElevation(place.lat, place.lon, time - 3 * DAY_MS, 366), [place.key, Math.round(time / DAY_MS)]);
  const next = useMemo(() => nextHorizonCrossing(place.lat, place.lon, time), [place.key, Math.round(time / (DAY_MS / 24))]);
  const polar = !!(f?.psr && f.psr.share > 0.5 && f.kind === 'crater');
  const thr = polar ? floorThresholdDeg(f!.diameter, f!.depth!) : null;
  const sliderVal = p.sliderSun ?? Math.max(0, el);
  const name = place.type === 'apollo' ? place.apollo!.mission + ' site' : place.name;

  return (
    <>
      <section className="card plain">
        <div className="sunnow">
          <div className="sn-big">
            <span className="sn-num">{fmtNum(Math.abs(el), Math.abs(el) < 10 ? 1 : 0)}°</span>
            <span className="sn-unit">{el < 0 ? 'below' : 'above'} the horizon</span>
          </div>
          <div className="sn-txt">
            <b>Sun at {name}</b>
            <span>{fmtUtcShort(time)}</span>
            <span>{sunWords(el)}.</span>
          </div>
        </div>
        {next && (
          <p className="aside">
            {next.kind === 'sunset' ? 'Sunset' : 'Sunrise'} in about {fmtNum((next.t - time) / DAY_MS, 1)} days
            {Math.abs(place.lat) > 80 ? ' (near the poles the Sun just dips and rises along the horizon).' : '.'}
          </p>
        )}
        {!next && <p className="aside">The Sun doesn’t cross the horizon in the next 40 days here.</p>}
      </section>

      {polar && (
        <section className="card">
          <h3>Why the floor stays dark</h3>
          <ol className="why">
            <li>
              <b>The Moon barely tilts.</b> Earth’s axis leans 23.4°, which gives us seasons and a Sun that climbs high.
              The Moon leans only 1.5°. Near its poles the Sun just circles the horizon, never rising far above it.
            </li>
            <li>
              <b>Crater walls do the rest.</b> At {name}, the Sun never climbs above{' '}
              <b>{fmtNum(peak, 1)}°</b> in the next year. The crater’s rim blocks anything below about <b>{fmtNum(thr!, 1)}°</b> from reaching the floor.
            </li>
          </ol>
          <CraterSunDiagram name={f!.name} widthKm={f!.diameter} depthKm={f!.depth!} sunEl={sliderVal} onChange={p.setSliderSun} />
          <div className="chips">
            <button className={'chip' + (p.sliderSun == null ? ' on' : '')} onClick={() => p.setSliderSun(null)}>Today · {fmtNum(Math.max(0, el), 1)}°</button>
            <button className={'chip' + (p.sliderSun != null && Math.abs(p.sliderSun - peak) < 0.05 ? ' on' : '')} onClick={() => p.setSliderSun(Math.round(peak * 10) / 10)}>Highest this year · {fmtNum(peak, 1)}°</button>
            <button className={'chip' + (p.sliderSun != null && Math.abs(p.sliderSun - thr!) < 0.05 ? ' on' : '')} onClick={() => p.setSliderSun(Math.round((thr! + 0.1) * 10) / 10)}>Needed to light the floor · {fmtNum(thr!, 1)}°</button>
          </div>
        </section>
      )}

      <section className="card">
        <h3>{polar ? 'The Sun over the next month' : `Sunlight at ${name}`}</h3>
        <SunChart lat={place.lat} lon={place.lon} t={time} onJump={p.setTime} placeName={name}
          threshold={polar ? { deg: thr!, label: `${fmtNum(thr!, 1)}° would light the floor` } : null} />
        <p className="aside">{dayNightPattern(place)}</p>
      </section>

      {polar && f && (
        <section className="card">
          <h3>Cold enough to keep ice</h3>
          <dl className="facts">
            <Fact k="Floor never sunlit" v={`${Math.round(f.psr!.share * 100)}%`} />
            <Fact k="Coldest" v={fmtTemp(f.psr!.minTempK)} hint={`${f.psr!.minTempK} K, about as cold as the surface of Pluto`} />
          </dl>
          <p className="aside">
            With no sunlight and nowhere for heat to come from, ice that lands here can last for billions of years. That is why
            scientists look in places like {f.name}.
          </p>
        </section>
      )}
      {!polar && (
        <p className="foot">Sun positions come from a simplified model of the Moon’s orientation and are accurate to a degree or so.</p>
      )}
      {polar && <p className="foot">Sun positions come from a simplified model and are accurate to a degree or so.</p>}
    </>
  );
}

function fmtUtcShort(t: number) {
  return new Date(t).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export { getPlace, kmToMi, elLabel, POLAR_SCOUT };
