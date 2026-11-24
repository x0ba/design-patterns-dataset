import { useMemo } from 'react';
import { APOLLO, ROBOTIC, Place, getPlace } from '../data';
import { angleBetween, fmtDist, fmtLat, fmtNum, toVec, R_KM, kmToMi } from '../lib/geo';
import { dayNightPattern, fmtDate, sunNow, tempText, yearsBetween } from '../lib/describe';

const COMPARE_OPTIONS = [
  { group: 'Apollo landing sites', keys: APOLLO.map((a) => 'a:' + a.id) },
  { group: 'Robotic missions', keys: ['r:polar-scout', 'r:chandrayaan-3', 'r:odysseus', 'r:change-4', 'r:change-6', 'r:luna-9', 'r:blue-ghost-1', 'r:lcross'] },
  { group: 'Famous places', keys: ['f:shackleton', 'f:tycho', 'f:copernicus', 'f:mare-tranquillitatis', 'f:plato'] },
];

const EARTH_ROUTES: { km: number; name: string }[] = [
  { km: 800, name: 'New York to Cleveland' }, { km: 1150, name: 'New York to Chicago' },
  { km: 1800, name: 'Chicago to Dallas' }, { km: 2800, name: 'Chicago to Los Angeles' },
  { km: 3940, name: 'New York to Los Angeles' }, { km: 5570, name: 'New York to London' },
  { km: 9600, name: 'New York to Tokyo' },
];
function analogy(km: number) {
  if (km < 120) return 'about the length of a Los Angeles to San Diego drive';
  if (km < 500) return 'about the distance from Boston to Washington, D.C. and a bit more';
  const best = EARTH_ROUTES.reduce((a, b) => (Math.abs(b.km - km) < Math.abs(a.km - km) ? b : a));
  return `about the same as ${best.name} on Earth`;
}

function visited(p: Place): string {
  if (p.apollo) return `${fmtDate(p.apollo.date)} (crewed)`;
  if (p.robotic) return `${fmtDate(p.robotic.date)} (${p.robotic.kind === 'impactor' ? 'impact' : 'robotic'})`;
  const m = ROBOTIC.find((r) => r.featureNear === p.feature?.id);
  return m ? `Near ${m.name}’s ${m.kind === 'impactor' ? 'impact' : 'landing'} (${m.date.slice(0, 4)})` : 'No spacecraft has touched down here';
}
function who(p: Place): string {
  if (p.apollo) return p.apollo.crew.filter((c) => c.role.includes('walked')).map((c) => c.name).join(' & ');
  if (p.robotic) return p.robotic.operator;
  const n = p.feature!.namedAfter.split(',')[0].replace(/^(Sir|Saint|St\.?) /, '');
  return p.feature!.kind === 'mare' ? 'Early telescope observers' : `Named for ${n}`;
}
function visitDate(p: Place): string | null {
  if (p.apollo) return p.apollo.date;
  if (p.robotic) return p.robotic.date;
  return null;
}

interface Props { place: Place; time: number; compareKey: string; setCompareKey: (k: string) => void; onSelect: (k: string) => void }

export function CompareTab({ place, time, compareKey, setCompareKey, onSelect }: Props) {
  const other = getPlace(compareKey) ?? getPlace('a:apollo-11')!;
  const dist = useMemo(() => angleBetween(toVec(place.lat, place.lon), toVec(other.lat, other.lon)) * R_KM, [place, other]);
  const deg = (dist / R_KM) * (180 / Math.PI);
  const frac = deg / 360;
  const a = sunNow(place, time), b = sunNow(other, time);
  const da = visitDate(place), db = visitDate(other);
  const gap = da && db ? yearsBetween(da, db) : null;
  const rows: [string, string, string][] = [
    ['Latitude', fmtLat(place.lat), fmtLat(other.lat)],
    ['Sun right now', a.text, b.text],
    ['Sunlight', dayNightPattern(place), dayNightPattern(other)],
    ['Temperature', tempText(place), tempText(other)],
    ['Visited', visited(place), visited(other)],
    ['By', who(place), who(other)],
  ];
  const nm = (p: Place) => (p.apollo ? p.apollo.mission : p.name);
  const opts = COMPARE_OPTIONS.map((g) => ({ ...g, keys: g.keys.filter((k) => k !== place.key && getPlace(k)) }));

  return (
    <>
      <section className="card plain">
        <label className="sel-lab" htmlFor="cmp-sel">Compare {nm(place)} with</label>
        <div className="select-wrap">
          <select id="cmp-sel" value={compareKey} onChange={(e) => setCompareKey(e.target.value)}>
            {opts.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.keys.map((k) => <option key={k} value={k}>{getPlace(k)!.type === 'apollo' ? `${getPlace(k)!.apollo!.mission} · ${getPlace(k)!.apollo!.siteName}` : getPlace(k)!.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="dist">
          <div className="dist-num">{fmtNum(dist)} <small>km</small></div>
          <div className="dist-sub">{fmtNum(kmToMi(dist))} miles apart along the surface</div>
        </div>
        <div className="route" aria-hidden>
          <span className="rt-a">{nm(place)}</span>
          <span className="rt-line"><i style={{ left: `${Math.min(100, (deg / 180) * 100)}%` }} /></span>
          <span className="rt-b">{nm(other)}</span>
        </div>
        <p className="aside">
          That is {frac > 0.2 ? `${fmtNum(frac * 100)}% of the way around the Moon` : `about ${fmtNum(deg, 0)}° of the Moon’s curve`}, {analogy(dist)}.
          {Math.abs(Math.abs(place.lat - other.lat) - 90) < 4 && (Math.abs(place.lat) > 85 || Math.abs(other.lat) > 85) ? ' That is close to the equator-to-pole distance: a quarter of the way around.' : ''}
        </p>
        <button className="inline" onClick={() => onSelect(compareKey)}>Open {nm(other)} instead</button>
      </section>

      <section className="card">
        <table className="cmp">
          <thead>
            <tr><th scope="col"><span className="sr">Property</span></th><th scope="col">{nm(place)}</th><th scope="col">{nm(other)}</th></tr>
          </thead>
          <tbody>
            {rows.map(([k, x, y]) => (
              <tr key={k}><th scope="row">{k}</th><td>{x}</td><td>{y}</td></tr>
            ))}
          </tbody>
        </table>
        {gap != null && gap > 0.5 && (
          <p className="aside"><b>{fmtNum(gap, 0)} years</b> separate these two visits.</p>
        )}
      </section>
      <p className="foot">Temperatures are typical surface values. Both places are marked on the map, joined by the shortest path.</p>
    </>
  );
}
