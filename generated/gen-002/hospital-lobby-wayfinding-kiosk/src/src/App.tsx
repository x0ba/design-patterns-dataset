import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CLOSURES,
  KIOSKS,
  NODES,
  SIM_START,
  activeClosureIds,
  type Lang,
  type Pace,
} from './data/campus';
import { CARDIAC_REHAB_ID, DESTINATIONS, DEST_BY_ID } from './data/destinations';
import { LANGS, STRINGS, fmt } from './lib/i18n';
import { buildSteps, findRoute, nearestOfKind, type Step } from './lib/route';
import {
  bName,
  clock,
  dateRange,
  feet,
  hoursLine,
  localeOf,
  messageText,
  minutesLabel,
  minutesOf,
  openStatus,
  roomsLabel,
  titleCase,
} from './lib/format';
import { Icon } from './components/Icon';
import { MapView } from './components/MapView';
import { SearchOverlay } from './components/SearchOverlay';
import { ApptModal, QrModal, SendModal, StartPicker } from './components/Modals';
import { PrintSheet, closureTitle } from './components/PrintSheet';

type ModalKind = null | 'search' | 'send' | 'qr' | 'start' | 'appt';

export function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [big, setBig] = useState(false);
  const [kioskId, setKioskId] = useState('main');
  const [destId, setDestId] = useState(CARDIAC_REHAB_ID);
  const [stepFree, setStepFree] = useState(true);
  const [pace, setPace] = useState<Pace>('slow');
  const [appt, setAppt] = useState<number | null>(10 * 60 + 30);
  const [modal, setModal] = useState<ModalKind>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [level, setLevel] = useState(1);
  const [now, setNow] = useState(SIM_START);

  // The kiosk clock starts at 10:12 am on the day of the demo and runs in real time.
  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => setNow(new Date(SIM_START.getTime() + (Date.now() - t0))), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.size = big ? 'large' : 'normal';
  }, [big]);
  useEffect(() => {
    document.documentElement.lang = lang === 'tl' ? 'fil' : lang;
  }, [lang]);

  const T = STRINGS[lang];
  const kiosk = KIOSKS.find((k) => k.id === kioskId)!;
  const dest = DEST_BY_ID.get(destId)!;
  const closedKey = [...activeClosureIds(now)].join(',');
  const closed = useMemo(() => new Set(closedKey ? closedKey.split(',') : []), [closedKey]);

  const prefs = useMemo(() => ({ stepFree, pace, closed }), [stepFree, pace, closed]);
  const route = useMemo(() => findRoute(kiosk.node, dest, prefs), [kiosk, dest, prefs]);
  const usual = useMemo(() => findRoute(kiosk.node, dest, { stepFree, pace, closed: new Set<string>() }), [kiosk, dest, stepFree, pace]);

  const stepsFor = useCallback(
    (l: Lang) => (route ? buildSteps(route, dest, l, localeOf(l), (n) => KIOSKS.find((k) => k.node === n)?.name[l], closed) : []),
    [route, dest, closed],
  );
  const steps: Step[] = useMemo(() => stepsFor(lang), [stepsFor, lang]);

  const levels = useMemo(() => (route ? [...route.levels].sort((a, b) => a - b) : [NODES.get(kiosk.node)!.level]), [route, kiosk]);
  useEffect(() => {
    setActiveStep(0);
    setLevel(levels.includes(1) ? 1 : levels[0]);
  }, [destId, kioskId, stepFree, pace]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickStep = (i: number) => {
    setActiveStep(i);
    const s = steps[i];
    if (s) setLevel(s.level);
  };

  const selectDest = (id: string) => {
    setDestId(id);
    setAppt(id === CARDIAC_REHAB_ID ? 10 * 60 + 30 : null);
    setModal(null);
  };
  const pickNearest = (kind: string) => {
    const d = nearestOfKind(kiosk.node, kind, DESTINATIONS, prefs);
    if (d) selectDest(d.id);
  };

  const nowMin = minutesOf(now);
  const arriveMin = route ? Math.round(nowMin + route.secs / 60) : nowMin;
  const spare = appt !== null ? appt - arriveMin : null;
  const mins = route ? minutesLabel(route.secs) : 0;
  const delta = route && usual ? Math.round((route.secs - usual.secs) / 60) : 0;
  const status = openStatus(dest, now, lang);
  const activeLegs = route && steps[activeStep] ? new Set(Array.from({ length: steps[activeStep].legEnd - steps[activeStep].legStart + 1 }, (_, k) => steps[activeStep].legStart + k)) : null;
  const startLabel = kiosk.name[lang].replace(/ \(.*/, '').split(',')[0];

  const msgFor = (l: Lang, compact = false) =>
    route
      ? messageText({ lang: l, dest, startName: KIOSKS.find((k) => k.id === kioskId)!.name[l], steps: stepsFor(l), route, pace, stepFree, apptMin: appt, compact })
      : '';

  const aliases = dest.aliases.slice(0, 3).map(titleCase);

  return (
    <>
      <div className="app">
        {/* ---------- top bar ---------- */}
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 32 32"><path d="M16 5v22M5 16h22" stroke="#0b5563" strokeWidth="6" strokeLinecap="round" /></svg>
            </div>
            <div>
              <div className="brand-name">{T.appName}</div>
              <div className="brand-sub">{T.campus}</div>
            </div>
          </div>
          <button className="here" onClick={() => setModal('start')} aria-label={`${T.youAreHere}: ${kiosk.name[lang]}. ${T.changeStart}`}>
            <Icon name="pin" />
            <span>
              <span className="lbl">{T.youAreHere}</span>
              <b>{kiosk.name[lang]}</b>
            </span>
            <span className="chg">{T.changeStart}</span>
          </button>
          <div className="spacer" />
          <button className="tsize" aria-pressed={big} onClick={() => setBig((b) => !b)}>
            <Icon name="type" /> {T.textSize}: {big ? T.larger : T.normal}
          </button>
          <div className="seg" role="group" aria-label="Language">
            {LANGS.map((l) => (
              <button key={l.id} aria-pressed={lang === l.id} lang={l.id === 'tl' ? 'fil' : l.id} onClick={() => setLang(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="clock" aria-label="Current time">{clock(nowMin, lang)}</div>
        </header>

        {/* ---------- main ---------- */}
        <main className="main">
          {/* left: destination */}
          <section className="col" aria-label={T.whereTo}>
            <button className="searchbtn" onClick={() => setModal('search')}>
              <Icon name="search" size={34} /> {T.searchButton}
            </button>

            <div className="card card-pad dest">
              <div>
                <div className="h-label">{T.whereTo}</div>
                <h1>{dest.name}</h1>
                <div className="where">{bName(dest, lang)}</div>
                <div className="where2">
                  {fmt(T.level, { n: dest.level })}
                  {dest.rooms ? ` · ${roomsLabel(dest.rooms, lang)}` : ''}
                </div>
              </div>
              <div className={`status ${status.open ? 'open' : 'closed'}`}>
                <i /> {status.text}
              </div>
              <div className="facts">
                {dest.ext && (
                  <div className="fact">
                    <Icon name="phone" />
                    <div><b>{T.phone}</b><span>{fmt(T.ext, { n: dest.ext })}</span></div>
                  </div>
                )}
                <div className="fact">
                  <Icon name="clock" />
                  <div><b>{T.hours}</b><span>{hoursLine(dest, lang)}</span></div>
                </div>
              </div>
              {aliases.length > 0 && (
                <div>
                  <div className="h-label" style={{ marginBottom: 6 }}>{T.alsoCalled}</div>
                  <div className="aka">{aliases.map((a) => <span key={a}>{a}</span>)}</div>
                </div>
              )}
            </div>

            <div className="card card-pad">
              <div className="opt-row">
                <div>
                  <div className="opt-title">{T.stepFree}</div>
                  <div className="opt-sub">{T.stepFreeSub}</div>
                </div>
                <button className="switch" role="switch" aria-checked={stepFree} aria-label={T.stepFree} onClick={() => setStepFree((v) => !v)} />
              </div>
              <hr className="divider" />
              <div className="opt-row">
                <div className="opt-title">{T.pace}</div>
                <div className="pace" role="group" aria-label={T.pace}>
                  <button aria-pressed={pace === 'slow'} onClick={() => setPace('slow')}>{T.slow}</button>
                  <button aria-pressed={pace === 'standard'} onClick={() => setPace('standard')}>{T.standard}</button>
                </div>
              </div>
            </div>
          </section>

          {/* middle: summary + map */}
          <section className="col" aria-label={T.mapTitle}>
            <div className="card hero">
              {route ? (
                <>
                  <div className="hero-top">
                    <span className="hero-min">{mins}</span>
                    <span className="hero-unit">{T.minUnit} {T.walkWord}</span>
                    <span className="hero-pace">
                      {pace === 'slow' ? T.atSlow : T.atStandard}
                      <br />
                      {route.walkM} m · {feet(route.walkM)} ft
                    </span>
                  </div>
                  <div className="chips">
                    {stepFree && <span className="chip"><Icon name="stepfree" size={22} /> {T.stepFreeBadge}</span>}
                    {route.legs.some((l) => l.edge?.kind === 'stairs' || l.edge?.via === 'steps') && <span className="chip warn"><Icon name="stairs" size={22} /> {T.stairsBadge}</span>}
                    {closed.size > 0 && <span className="chip"><Icon name="check" size={22} /> {T.avoidsBadge}</span>}
                    {delta >= 1 && <span className="chip warn"><Icon name="clock" size={20} /> +{delta} min</span>}
                  </div>
                  <div className="timeline">
                    <div className="tcell">
                      <b>{T.arriveLabel}</b>
                      <span>{clock(arriveMin, lang)}</span>
                    </div>
                    {appt !== null && spare !== null ? (
                      <div className={`tcell ${spare >= 0 ? 'go' : 'late'}`}>
                        <div className="tcell-h">
                          <b>{T.apptLabel} {clock(appt, lang)}</b>
                          <button className="edit" onClick={() => setModal('appt')} aria-label={`${T.apptTitle}: ${T.changeStart}`}><Icon name="edit" size={20} /></button>
                        </div>
                        <span>{spare >= 0 ? fmt(T.spare, { n: spare }) : fmt(T.late, { n: -spare })}</span>
                      </div>
                    ) : (
                      <button className="btn ghost" style={{ minHeight: 56, fontSize: '1.02rem' }} onClick={() => setModal('appt')}>
                        <Icon name="clock" /> {T.addAppt}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="note" style={{ marginTop: 0 }}><Icon name="alert" /> <span>{T.noRoute}</span></div>
              )}
            </div>

            <div className="card mapcard">
              <div className="maphead">
                <div className="tabs" role="group" aria-label={T.mapTitle}>
                  {levels.map((l) => (
                    <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>{fmt(T.tabLevel, { n: l })}</button>
                  ))}
                </div>
              </div>
              <div className="mapwrap">
                <MapView level={level} route={route} dest={dest} startNode={kiosk.node} startLabel={startLabel} closed={closed} activeLegs={activeLegs} lang={lang} />
              </div>
              <div className="legend">
                <span><i style={{ background: '#1a5fd0', borderRadius: '50%' }} /> {T.legendYou}</span>
                <span><i style={{ background: '#17212b' }} /> {T.legendDest}</span>
                <span><i style={{ background: 'var(--route)' }} /> {T.routeVia}</span>
                <span><i style={{ background: 'var(--closed)' }} /> {T.legendClosed}</span>
              </div>
            </div>
          </section>

          {/* right: directions */}
          <section className="col" aria-label={T.directions}>
            <div className="card dirs">
              <div className="dirs-head">
                <h2>{T.directions}</h2>
                <span>{route ? `${fmt(T.minWalk, { n: mins })} · ${route.walkM} m` : ''}</span>
              </div>
              <ol className="steps">
                {steps.map((s, i) => (
                  <li key={s.key}>
                    <button className={`step ${s.kind === 'arrive' ? 'arrive' : ''}`} aria-current={activeStep === i} onClick={() => pickStep(i)}>
                      <span className="step-n">{s.kind === 'arrive' ? <Icon name="flag" size={24} /> : i + 1}</span>
                      <span className="step-text">{s.text}</span>
                      {s.kind !== 'arrive' && (
                        <span className="step-chip">
                          <b>{fmt(T.minWalk, { n: minutesLabel(s.secs) })}</b>
                          {s.m > 0 ? <i>{fmt(T.m, { n: s.m })}</i> : <i><Icon name={s.kind === 'stairs' ? 'stairs' : 'elevator'} size={20} label={s.kind} /></i>}
                        </span>
                      )}
                      {s.note && (
                        <span className="note"><Icon name="alert" size={22} /><span>{s.note}</span></span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="actions">
                <button className="btn primary stack" onClick={() => setModal('send')} disabled={!route}>
                  <Icon name="sms" size={30} /> {T.textPhone}
                </button>
                <button className="btn stack" onClick={() => window.print()} disabled={!route}>
                  <Icon name="print" size={30} /> {T.print}
                </button>
                <button className="btn stack" onClick={() => setModal('qr')} disabled={!route}>
                  <Icon name="qr" size={30} /> {T.qr}
                </button>
              </div>
            </div>
          </section>
        </main>

        {/* ---------- closures ---------- */}
        <footer className="foot" aria-label={T.closuresTitle}>
          <div className="foot-title"><Icon name="alert" size={30} /> {T.closuresTitle}</div>
          {CLOSURES.map((c) => {
            const on = closed.has(c.id);
            const touches = route?.nodes.some((n) => NODES.get(n)!.b === c.b || (c.kind === 'skybridge' && NODES.get(n)!.b === 'HVP')) ?? false;
            return (
              <div className="clos" key={c.id} style={on ? undefined : { opacity: 0.6 }}>
                <Icon name="blocked" size={32} />
                <div>
                  <div className="clos-t">{closureTitle(c.id, lang)}</div>
                  <div className="clos-d">
                    <span>{c.id === 'sky-main-pavilion' ? fmt(T.closureUntil, { d: dateRange(c.to, c.to, lang) }) : dateRange(c.from, c.to, lang)}</span>
                    <span className="ok">✓ {touches ? T.avoidedOnRoute : T.notOnRoute}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </footer>
      </div>

      {modal === 'search' && <SearchOverlay lang={lang} onPick={selectDest} onNearest={pickNearest} onClose={() => setModal(null)} />}
      {modal === 'send' && route && <SendModal lang={lang} buildMessage={(l) => msgFor(l)} onClose={() => setModal(null)} />}
      {modal === 'qr' && route && <QrModal lang={lang} text={msgFor(lang, true)} onClose={() => setModal(null)} />}
      {modal === 'start' && <StartPicker lang={lang} kioskId={kioskId} closed={closed} onPick={(id) => { setKioskId(id); setModal(null); }} onClose={() => setModal(null)} />}
      {modal === 'appt' && <ApptModal lang={lang} value={appt} onChange={setAppt} onClose={() => setModal(null)} />}

      {route && (
        <PrintSheet lang={lang} dest={dest} route={route} steps={steps} startNode={kiosk.node} closed={closed} apptMin={appt} arriveMin={arriveMin} pace={pace} stepFree={stepFree} />
      )}
    </>
  );
}
