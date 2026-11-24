import { KIOSKS, BUILDINGS, CLOSURES, type Lang } from '../data/campus';
import type { Destination } from '../data/destinations';
import { STRINGS, fmt } from '../lib/i18n';
import { clock, minutesLabel, feet, roomsLabel } from '../lib/format';
import type { Route, Step } from '../lib/route';
import { MapView } from './MapView';

interface Props {
  lang: Lang;
  dest: Destination;
  route: Route;
  steps: Step[];
  startNode: string;
  closed: Set<string>;
  apptMin: number | null;
  arriveMin: number;
  pace: 'slow' | 'standard';
  stepFree: boolean;
}

export function PrintSheet({ lang, dest, route, steps, startNode, closed, apptMin, arriveMin, pace, stepFree }: Props) {
  const T = STRINGS[lang];
  const start = KIOSKS.find((k) => k.node === startNode)!;
  const levels = [...route.levels].sort((a, b) => a - b);
  return (
    <div className="print-only sheet" aria-hidden="true">
      <div className="s-brand">
        <span>Wardway {T.campus}</span>
        <span>{T.directions}</span>
      </div>
      <h1>{fmt(T.printTitle, { name: dest.name })}</h1>
      <div className="s-where">
        {BUILDINGS[dest.b].name[lang]} · {fmt(T.level, { n: dest.level })}
        {dest.rooms ? ` · ${roomsLabel(dest.rooms, lang)}` : ''}
      </div>
      <div className="s-facts">
        <div className="s-fact"><b>{T.printFrom.split(':')[0]}</b><span style={{ fontSize: '11pt' }}>{start.name[lang]}</span></div>
        <div className="s-fact"><b>{T.walkWord}</b><span>{fmt(T.minWalk, { n: minutesLabel(route.secs) })}</span><div style={{ fontSize: '9pt' }}>{pace === 'slow' ? T.atSlow : T.atStandard} · {route.walkM} m ({feet(route.walkM)} ft){stepFree ? ' · ' + T.stepFreeBadge : ''}</div></div>
        <div className="s-fact"><b>{T.arriveLabel}</b><span>{clock(arriveMin, lang)}</span></div>
        <div className="s-fact"><b>{T.apptLabel}</b><span>{apptMin === null ? '—' : clock(apptMin, lang)}</span></div>
      </div>
      <ol>
        {steps.map((s, i) => (
          <li key={s.key}>
            <span className="n">{i + 1}</span>
            <div>
              <div className="t">{s.text}</div>
              {s.m > 0 && <div className="m">{fmt(T.stepMin, { n: minutesLabel(s.secs) })} · {fmt(T.m, { n: s.m })}</div>}
              {s.note && <div className="nt">{s.note}</div>}
            </div>
          </li>
        ))}
      </ol>
      <div className="s-maps">
        {levels.map((l) => (
          <div className="s-map" key={l}>
            <b>{fmt(T.tabLevel, { n: l })}</b>
            <MapView level={l} route={route} dest={dest} startNode={startNode} startLabel={start.name[lang].split(' ').slice(0, 2).join(' ')} closed={closed} lang={lang} printMode />
          </div>
        ))}
      </div>
      <div className="s-foot">
        {CLOSURES.filter((c) => closed.has(c.id)).length > 0 && (
          <div style={{ marginBottom: 4 }}>
            {T.closuresPrint}: {CLOSURES.filter((c) => closed.has(c.id)).map((c) => closureTitle(c.id, lang)).join(' · ')}
          </div>
        )}
        {T.printNote} {T.help}
      </div>
    </div>
  );
}

export function closureTitle(id: string, lang: Lang): string {
  const T = STRINGS[lang];
  if (id === 'hvp-bank-b') return fmt(T.closureElevator, { k: 'B', b: BUILDINGS.HVP.short[lang] });
  if (id === 'sky-main-pavilion') return fmt(T.closureSky, { a: BUILDINGS.MB.short[lang], b: BUILDINGS.HVP.short[lang] });
  return T.closureDoors;
}
