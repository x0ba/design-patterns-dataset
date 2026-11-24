import { useMemo, useState } from 'react';
import {
  mods, issues, issueByModule, modsBy, lastActivity, fmtDate, fmtShort, ago, daysAgo, dependents, hopsFrom, fmtNum, sizeRank, serviceAvgCov, serviceById, personByName,
  type Mod, type ServiceId,
} from './data';
import { Avatar, CovBar, Icon, PathText, ServiceDot, ServiceTag } from './ui';

const ordinal = (n: number) => { const v = n % 100; return n + (['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th'); };
const covWord = (c: number) => (c < 20 ? 'Almost untested' : c < 40 ? 'Lightly tested' : c < 70 ? 'Partly tested' : 'Well tested');
const ageWord = (d: string) => { const n = daysAgo(d); return n > 540 ? 'Untouched for a long while' : n > 180 ? 'Not changed recently' : n > 30 ? 'Changed in recent months' : 'Changed this month'; };

function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text: string) {
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch { return false; }
}

interface Props {
  selected: number | null;
  trailFrom: number | null; trailTo: number | null;
  blastOn: boolean; depth: number;
  onSelect: (id: number | null) => void;
  setFrom: (id: number) => void; setTo: (id: number) => void;
  setBlastOn: (v: boolean) => void; setDepth: (d: number) => void;
  askPerson: (name: string) => void;
  notify: (msg: string) => void;
}

export default function Inspector(p: Props) {
  if (p.selected === null) return <Overview onSelect={p.onSelect} />;
  return <Detail key={p.selected} {...p} m={mods[p.selected]} />;
}

function Overview({ onSelect }: { onSelect: (id: number) => void }) {
  const risky = useMemo(() => mods.slice().sort((a, b) => b.lines * (100 - b.cov) - a.lines * (100 - a.cov)).slice(0, 6), []);
  return (
    <div className="inspector-inner">
      <div className="insp-empty">
        <h2 className="insp-h">Nothing selected</h2>
        <p className="hint">Click a module on the map, or a step on the trail, to see what it does for the rest of the app, who last changed it, and what leans on it.</p>
      </div>
      <section className="sec">
        <h3 className="sec-h">Big and lightly tested</h3>
        <p className="sec-sub">Modules where a mistake would be hardest to catch.</p>
        <ul className="mini-list">
          {risky.map((m) => (
            <li key={m.i}><button className="mini" onClick={() => onSelect(m.i)}>
              <ServiceDot id={m.service} /><span className="mini-main"><b className="mono">{m.name}</b><span className="mono dim">{m.dir}/</span></span>
              <span className="mini-side"><CovBar value={m.cov} /><span className="mini-lines">{fmtNum(m.lines)} lines</span></span>
            </button></li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Detail({ m, ...p }: Props & { m: Mod }) {
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const person = personByName[m.by];
  const last = lastActivity(m.by);
  const near = useMemo(() => hopsFrom(m.i, 1), [m.i]);
  const nearIssues = useMemo(() => issues.filter((is) => { const h = near.get(is.module); return h !== undefined; }).map((is) => ({ is, hop: near.get(is.module)! })).sort((a, b) => a.hop - b.hop), [near]);
  const deps = useMemo(() => dependents(m.i, 3), [m.i]);
  const counts = useMemo(() => {
    const byDepth = [0, 0, 0, 0];
    const svc: Record<string, number> = {};
    deps.forEach((d, id) => { if (d <= p.depth) { byDepth[d]++; svc[mods[id].service] = (svc[mods[id].service] || 0) + 1; } });
    return { byDepth, svc, total: byDepth[1] + byDepth[2] + byDepth[3] };
  }, [deps, p.depth]);
  const list = useMemo(() => [...deps].filter(([, d]) => d <= p.depth).map(([id, d]) => ({ m: mods[id], d })).sort((a, b) => a.d - b.d || a.m.cov - b.m.cov), [deps, p.depth]);
  const direct = list.filter((x) => x.d === 1);
  const weak = direct.filter((x) => x.m.cov < 50).length;
  const callees = useMemo(() => m.out.map((id) => mods[id]).sort((a, b) => a.cov - b.cov), [m]);
  const areaMods = useMemo(() => mods.filter((x) => x.pkg === m.pkg && x.i !== m.i).sort((a, b) => (a.mod < b.mod ? 1 : -1)).slice(0, 4), [m]);
  const shown = showAll ? list : list.slice(0, 6);
  const suggest = useMemo(() => (person.active ? null : mods.filter((x) => x.pkg === m.pkg && x.i !== m.i && personByName[x.by].active).sort((a, b) => (a.mod < b.mod ? 1 : -1))[0] ?? null), [m, person.active]);
  const rankN = mods.filter((o) => o.lines > m.lines).length + 1;
  const svcAvg = serviceAvgCov(m.service);
  const crossSvc = Object.keys(counts.svc).filter((s) => s !== m.service) as ServiceId[];

  const askName = suggest ? suggest.by : m.by;
  const draft = () => {
    const first = askName.replace(/ [A-Z]\.$/, '');
    const ni = nearIssues.map((x) => x.is).sort((a, b) => (a.opened < b.opened ? 1 : -1))[0];
    const lead = ni ? `I'm tracing #${ni.n} (“${ni.title}”) and landed on ${m.path}.` : `I'm looking at ${m.path} before I change anything.`;
    const ask = 'Could you walk me through what it is responsible for, and what else relies on it, before I change anything?';
    return `Hi ${first}, I'm Wen, new on the tech team. ${lead} ${suggest ? `${m.by} last changed it on ${fmtDate(m.mod)} but is no longer on the team, and you recently worked on ${suggest.name} next to it (${fmtDate(suggest.mod)}).` : `You last changed it on ${fmtDate(m.mod)}.`} ${ask} Thanks!`;
  };
  const onCopy = async () => {
    const ok = await copyText(draft());
    setCopied(true); p.notify(ok ? `Draft for ${askName.replace(/ [A-Z]\.$/, '')} copied. Paste it into your team chat.` : 'Couldn’t reach the clipboard. Select the text and copy it manually.');
    setTimeout(() => setCopied(false), 2200);
  };

  const isFrom = p.trailFrom === m.i, isTo = p.trailTo === m.i;
  return (
    <div className="inspector-inner">
      <div className="insp-head">
        <div className="insp-head-top"><ServiceTag id={m.service} />
          <button className="icon-btn" onClick={() => p.onSelect(null)} aria-label="Deselect module" title="Deselect">{Icon.close}</button>
        </div>
        <h2 className="insp-name mono">{m.name}</h2>
        <div className="insp-path mono">{m.dir}/{m.name}</div>
        <div className="insp-actions">
          <button className={'btn' + (isFrom ? ' on' : '')} onClick={() => p.setFrom(m.i)}>{Icon.route} Trace from here</button>
          <button className={'btn' + (isTo ? ' on' : '')} onClick={() => p.setTo(m.i)}>{Icon.route} Trace to here</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-k">Lines</span>
          <span className="stat-v">{fmtNum(m.lines)}</span>
          <span className="stat-note">{rankN <= 15 ? `${ordinal(rankN)} largest of ${mods.length} modules` : rankN > mods.length * 0.75 ? 'Among the smallest' : `Bigger than ${Math.round(((mods.length - rankN) / mods.length) * 100)}% of modules`}</span>
        </div>
        <div className="stat">
          <span className="stat-k">Tested</span>
          <span className="stat-v">{m.cov}<small>%</small></span>
          <CovBar value={m.cov} wide />
          <span className="stat-note">{covWord(m.cov)} · {serviceById[m.service].name} avg {svcAvg}%</span>
        </div>
        <div className="stat">
          <span className="stat-k">Last changed</span>
          <span className="stat-v stat-date">{fmtDate(m.mod)}</span>
          <span className="stat-note">{ago(m.mod)} · {ageWord(m.mod)}</span>
        </div>
      </div>

      <section className="sec">
        <h3 className="sec-h">Last touched by</h3>
        <div className="owner">
          <Avatar name={m.by} size={38} />
          <div className="owner-main">
            <b>{person.full}</b>
            <span>{person.active ? 'Active volunteer' : 'No longer on the team'} · most recent change anywhere, {fmtDate(last!)}</span>
          </div>
        </div>
        {(person.active || suggest) ? (
          <>
            {suggest && <div className="owner owner-2"><Avatar name={suggest.by} size={28} /><div className="owner-main"><span className="owner-lead">Best person to ask instead</span><b>{suggest.by}</b><span>changed <span className="mono">{suggest.name}</span> next door on {fmtDate(suggest.mod)}</span></div></div>}
            <button className={'btn wide' + (copied ? ' done' : '')} onClick={onCopy}>{copied ? Icon.check : Icon.copy}{copied ? 'Copied to clipboard' : `Copy a question for ${askName.replace(/ [A-Z]\.$/, '')}`}</button>
          </>
        ) : (
          <p className="sec-sub">They’ve left, and nobody active has changed anything in this area. The area list below shows the closest hands.</p>
        )}
        <details className="draft"><summary>Preview the message</summary><p>{draft()}</p></details>
      </section>


      <section className="sec">
        <div className="sec-bar">
          <h3 className="sec-h">If you change this</h3>
          <label className="switch"><input type="checkbox" checked={p.blastOn} onChange={(e) => p.setBlastOn(e.target.checked)} /><span className="switch-ui" /><span className="switch-t">Show on map</span></label>
        </div>
        <div className="blast-sum">
          <div className="blast-big"><b>{counts.byDepth[1]}</b> call it directly{p.depth > 1 && <>, <b>{counts.total}</b> within {p.depth} hops</>}</div>
          {direct.length > 0 && <div className="blast-risk"><span className={'risk-dot' + (weak / direct.length >= 0.5 ? ' hi' : '')} />{weak} of {direct.length} direct callers are under 50% tested</div>}
          {crossSvc.length > 0 && <div className="blast-risk"><span className="risk-dot x" />Ripples into {crossSvc.map((s) => serviceById[s].name).join(' and ')}</div>}
          {direct.length === 0 && <div className="blast-risk">Nothing else calls this module.</div>}
        </div>
        <div className="hops" role="group" aria-label="How many hops to include">
          <span className="hops-l">Reach</span>
          {[1, 2, 3].map((d) => <button key={d} className={'seg' + (p.depth === d ? ' on' : '')} aria-pressed={p.depth === d} onClick={() => p.setDepth(d)}>{d} hop{d > 1 ? 's' : ''}</button>)}
        </div>
        <ul className="mini-list">
          {shown.map(({ m: x, d }) => (
            <li key={x.i}><button className="mini" onClick={() => p.onSelect(x.i)}>
              <span className={'hop-badge h' + d} title={d === 1 ? 'Calls this directly' : `${d} hops away`}>{d}</span>
              <span className="mini-main"><b className="mono">{x.name}</b><span className="mono dim">{x.dir}/</span></span>
              <span className="mini-side"><CovBar value={x.cov} /></span>
            </button></li>
          ))}
        </ul>
        {list.length > 6 && <button className="link-btn" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show fewer' : `Show all ${list.length}`}</button>}
        <p className="sec-sub">Within each ring, least-tested first. {list.length > 0 && 'A hop is one call or import.'}</p>
      </section>

      {nearIssues.length > 0 && (
        <section className="sec">
          <h3 className="sec-h">Open issues here and next door</h3>
          <ul className="mini-list">
            {nearIssues.map(({ is, hop }) => (
              <li key={is.n}><button className="mini issue-mini" onClick={() => p.onSelect(is.module)}>
                <span className="issue-chip">#{is.n}</span>
                <span className="mini-main"><b>{is.title}</b>
                  <span className="dim">{hop === 0 ? 'Pinned to this module' : <>Pinned to <span className="mono">{mods[is.module].name}</span>, {m.out.includes(is.module) ? 'which this calls' : 'which calls this'}</>} · opened {fmtShort(is.opened)}</span>
                </span>
              </button></li>
            ))}
          </ul>
        </section>
      )}

      <section className="sec">
        <h3 className="sec-h">Who’s been in this area</h3>
        <p className="sec-sub" style={{ marginTop: 0 }}>Latest changes next door in <span className="mono">{m.pkg}/</span></p>
        <ul className="area-list">
          {areaMods.map((x) => (
            <li key={x.i}><button className="area-row" onClick={() => p.onSelect(x.i)}>
              <span className="mono area-name">{x.name}</span><span className="area-who">{x.by}</span><span className="area-date">{fmtShort(x.mod)}{x.mod.slice(0, 4) !== '2026' ? ' ’' + x.mod.slice(2, 4) : ''}</span>
            </button></li>
          ))}
        </ul>
      </section>

      {callees.length > 0 && (
        <section className="sec">
          <h3 className="sec-h">It depends on <span className="count">{callees.length}</span></h3>
          <ul className="mini-list">
            {callees.slice(0, 5).map((x) => (
              <li key={x.i}><button className="mini" onClick={() => p.onSelect(x.i)}>
                <ServiceDot id={x.service} /><span className="mini-main"><b className="mono">{x.name}</b><span className="mono dim">{x.dir}/</span></span>
                <span className="mini-side"><CovBar value={x.cov} /></span>
              </button></li>
            ))}
          </ul>
          {callees.length > 5 && <p className="sec-sub">and {callees.length - 5} more, shown with dashed lines on the map.</p>}
        </section>
      )}
    </div>
  );
}
