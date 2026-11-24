import { Fragment, useEffect, useRef, useState } from 'react';
import { CONTAINERS, ContainerId, ENV_NOTES, ME, PEOPLE, Reading, TODAY_DAY, container, dayDate, siteLabel } from '../data';
import { commentsFor, readingTarget, useStore } from '../store';
import { checkReading, fmtDateShort, fmtWhen, g, previousReading, r2, signed, SCALE_TOLERANCE } from '../util';
import { Avatar, Icon } from '../components/bits';
import Chart from '../components/Chart';

export default function Data() {
  const s = useStore();
  const [mode, setMode] = useState<'g' | 'pct'>('g');
  const [visible, setVisible] = useState<ContainerId[]>(['H-F', 'H-FO', 'G-F', 'G-FO']);
  const [adding, setAdding] = useState(false);
  const cid = s.focus.container;
  const c = container(cid);
  const rows = s.readings.filter((r) => r.container === cid).sort((a, b) => a.day - b.day || Number(!!a.second) - Number(!!b.second));
  const tableRef = useRef<HTMLDivElement>(null);
  const chartBox = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(740);
  useEffect(() => {
    const el = chartBox.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCw(el.clientWidth));
    ro.observe(el);
    setCw(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!s.focus.readingId) return;
    const el = document.getElementById('row-' + s.focus.readingId);
    if (el && tableRef.current) {
      tableRef.current.scrollTop = el.offsetTop - 80;
      el.closest('.page-scroll')?.scrollTo?.({ top: (tableRef.current.offsetTop ?? 0) - 120, behavior: 'smooth' });
    }
  }, [s.focus.nonce, s.focus.readingId]);

  const start = rows.find((r) => r.day === 0);
  const latest = [...rows].reverse().find((r) => !r.second);
  const latestGood = [...rows].reverse().find((r) => !r.second && !checkReading(s.readings, r) && r.mass != null);
  const totalDead = rows.filter((r) => !r.second).reduce((a, r) => a + r.dead, 0);
  const flagged = rows.filter((r) => checkReading(s.readings, r));

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <div className="eyebrow">Shared data · everyone adds, nobody overwrites</div>
          <h1>Data</h1>
          <p className="lede">6 tubs, 50 mealworms each. Foam weighed to 0.01 g. Home tubs weighed daily; Grandma weighs hers twice a week.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={15} /> Add a reading
        </button>
      </div>

      <div className="card chart-card">
        <div className="chart-top">
          <div className="legend">
            {CONTAINERS.filter((x) => x.hasFoam).map((x) => {
              const on = visible.includes(x.id);
              return (
                <button key={x.id} className={'leg' + (on ? '' : ' off')} onClick={() => setVisible(on ? visible.filter((v) => v !== x.id) : [...visible, x.id])}>
                  <svg width="22" height="10">
                    <line x1="1" x2="21" y1="5" y2="5" stroke={x.color} strokeWidth="2.4" strokeDasharray={x.site === 'grandma' ? '5 3' : undefined} />
                  </svg>
                  {siteLabel(x)} · {x.label}
                </button>
              );
            })}
          </div>
          <div className="seg">
            <button className={mode === 'g' ? 'on' : ''} onClick={() => setMode('g')}>
              Grams
            </button>
            <button className={mode === 'pct' ? 'on' : ''} onClick={() => setMode('pct')}>
              % of start
            </button>
          </div>
        </div>
        <div ref={chartBox}>
        <Chart
          readings={s.readings}
          visible={visible}
          mode={mode}
          questioned={s.questioned}
          selectedId={s.focus.readingId}
          onPick={(r) => s.go('data', { container: r.container, readingId: r.id })}
          width={cw}
          height={260}
        />
        </div>
        <div className="chart-cap muted small">
          Grandma’s blocks were cut a little smaller, so “% of start” compares the tubs fairly. Circled points went up, which foam can’t do. Click any point to
          see its row.
        </div>
      </div>

      <div className="tabs">
        {(['home', 'grandma'] as const).map((site) => (
          <div className="tab-group" key={site}>
            <span className="tab-site">
              <Icon name={site === 'home' ? 'home' : 'car'} size={14} /> {site === 'home' ? 'Home' : 'Grandma’s house'}
            </span>
            {CONTAINERS.filter((x) => x.site === site).map((x) => {
              const warn = s.readings.some((r) => r.container === x.id && checkReading(s.readings, r));
              return (
                <button key={x.id} className={'tab' + (x.id === cid ? ' on' : '')} onClick={() => s.setFocusContainer(x.id)}>
                  <span className="mini-dot" style={{ background: x.color }} /> {x.label}
                  {warn && <span className="tab-warn" title="Has a reading that looks off" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="card table-card">
        <div className="stats">
          {c.hasFoam ? (
            <>
              <Stat label="Start (day 0)" value={g(start?.mass)} />
              <Stat label={`Latest trusted (day ${latestGood?.day})`} value={g(latestGood?.mass)} />
              <Stat
                label="Eaten so far"
                value={start?.mass != null && latestGood?.mass != null ? `${(start.mass - latestGood.mass).toFixed(2)} g` : '—'}
                sub={start?.mass && latestGood?.mass ? `${(((start.mass - latestGood.mass) / start.mass) * 100).toFixed(1)}% of block` : undefined}
              />
            </>
          ) : (
            <Stat label="Foam" value="none in this tub" />
          )}
          <Stat label="Live worms" value={`${latest?.live ?? '—'} of 50`} />
          <Stat label="Dead so far" value={`${totalDead}`} />
          <div className="stat stat-keeper">
            <Avatar id={c.keeper} size={22} />
            <span className="muted small">Kept by {PEOPLE[c.keeper].short}</span>
          </div>
        </div>
        {flagged.length > 0 && (
          <div className="flag-banner">
            <Icon name="warn" size={15} /> {flagged.length === 1 ? 'One reading' : `${flagged.length} readings`} in this tub went up. Latest trusted value skips{' '}
            {flagged.length === 1 ? 'it' : 'them'} until {PEOPLE[c.keeper].short} confirms.
          </div>
        )}

        {adding && <AddForm initial={cid} onClose={() => setAdding(false)} />}

        <div className="table-scroll" ref={tableRef}>
          <table className="dtable">
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th className="num">Foam mass</th>
                <th className="num">Change</th>
                <th className="num">Live</th>
                <th className="num">Dead</th>
                <th>Entered by</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const prev = previousReading(s.readings, r);
                const d = r.mass != null && prev?.mass != null ? r2(r.mass - prev.mass) : null;
                const ck = checkReading(s.readings, r);
                const q = s.questioned.has(r.id);
                const n = commentsFor(s.comments, `reading:${r.id}`).length;
                const focused = s.focus.readingId === r.id;
                const note = ENV_NOTES.find((x) => x.site === c.site && x.afterDay === r.day && !r.second);
                return (
                  <Fragment key={r.id}>
                    <tr id={'row-' + r.id} className={(ck ? 'row-warn ' : '') + (focused ? 'row-focus ' : '') + (r.second ? 'row-second' : '')}>
                      <td>
                        <b>{r.day}</b>
                        {r.second && <span className="tag">2nd</span>}
                      </td>
                      <td className="muted nowrap">{fmtDateShort(dayDate(r.day))}</td>
                      <td className="num mono">{c.hasFoam ? <b>{g(r.mass)}</b> : <span className="muted">—</span>}</td>
                      <td className={'num mono nowrap ' + (ck ? 'warn-t' : 'muted')}>{d != null ? (ck ? '▲ ' : '') + signed(d) : ''}</td>
                      <td className="num mono">{r.live}</td>
                      <td className={'num mono' + (r.dead ? ' dead' : ' muted')}>{r.dead}</td>
                      <td>
                        <span className="by" title={`Entered ${fmtWhen(r.at)}`}>
                          <Avatar id={r.by} size={18} /> {r.by === ME ? 'You' : PEOPLE[r.by].short}
                        </span>
                        {r.measuredNote && <div className="tiny muted">{r.measuredNote}</div>}
                      </td>
                      <td className="note-cell">
                        {q && <span className="pill pill-wait">Questioned</span>}
                        {r.note && <span className="muted">{r.note}</span>}
                        {r.photoId && (
                          <button className="link small" onClick={() => s.go('photos', { photoId: r.photoId })}>
                            <Icon name="photo" size={12} /> photo
                          </button>
                        )}
                      </td>
                      <td className="row-act">
                        {r.by !== ME && (
                          <span className="lock-hint" title={`Entered by ${PEOPLE[r.by].short}. Only they can correct it.`}>
                            <Icon name="lock" size={12} />
                          </span>
                        )}
                        <button className={'btn btn-sm ' + (ck && !n ? 'btn-primary' : 'btn-ghost')} onClick={() => s.open(readingTarget(r))}>
                          <Icon name={ck ? 'question' : 'chat'} size={13} />
                          {n > 0 ? n : ck ? 'Ask' : ''}
                        </button>
                      </td>
                    </tr>
                    {note && (
                      <tr className="row-env">
                        <td colSpan={9}>
                          <Avatar id={note.by} size={18} /> <b>{note.by === ME ? 'You' : PEOPLE[note.by].short}</b>, {fmtWhen(note.at)}: {note.text}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-l">{label}</div>
      <div className="stat-v mono">{value}</div>
      {sub && <div className="tiny muted">{sub}</div>}
    </div>
  );
}

function AddForm({ initial, onClose }: { initial: ContainerId; onClose: () => void }) {
  const s = useStore();
  const [cid, setCid] = useState<ContainerId>(initial);
  const c = container(cid);
  const existingDays = s.readings.filter((r) => r.container === cid).map((r) => r.day);
  const [day, setDay] = useState<number>(existingDays.includes(TODAY_DAY) ? TODAY_DAY : TODAY_DAY);
  const last = s.readings.filter((r) => r.container === cid && !r.second).sort((a, b) => b.day - a.day)[0];
  const [mass, setMass] = useState('');
  const [live, setLive] = useState(String(last?.live ?? 50));
  const [dead, setDead] = useState('0');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const existing = s.readings.find((r) => r.container === cid && r.day === day && !r.second);
  const m = parseFloat(mass);
  const prev: Reading | undefined = s.readings
    .filter((r) => r.container === cid && r.day < day && r.mass != null && !r.second && !checkReading(s.readings, r))
    .sort((a, b) => b.day - a.day)[0];
  const rising = c.hasFoam && !isNaN(m) && prev?.mass != null && m - prev.mass > SCALE_TOLERANCE;
  const massOk = !c.hasFoam || (!isNaN(m) && m > 0 && m < 50);
  const valid = massOk && day >= 0 && day <= 28 && live !== '' && dead !== '' && (!rising || confirmed);

  const submit = () => {
    if (!valid) return;
    s.addReading({
      container: cid,
      day,
      mass: c.hasFoam ? r2(m) : null,
      live: parseInt(live, 10),
      dead: parseInt(dead, 10),
      note: note.trim() || undefined,
      second: !!existing,
    });
    onClose();
  };

  return (
    <div className="addform">
      <div className="addform-h">
        <b>Add a reading</b>
        <span className="muted small">It’s saved under your name. It never replaces anyone else’s reading.</span>
        <button className="btn btn-icon btn-ghost" onClick={onClose} title="Cancel">
          <Icon name="x" />
        </button>
      </div>
      <div className="addform-grid">
        <label>
          Tub
          <select value={cid} onChange={(e) => { setCid(e.target.value as ContainerId); setConfirmed(false); }}>
            {CONTAINERS.map((x) => (
              <option key={x.id} value={x.id}>
                {siteLabel(x)} · {x.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Day
          <input type="number" min={0} max={28} value={day} onChange={(e) => { setDay(parseInt(e.target.value || '0', 10)); setConfirmed(false); }} />
          <span className="tiny muted">{fmtDateShort(dayDate(day))}</span>
        </label>
        <label>
          Foam mass (g)
          <input
            type="number"
            step="0.01"
            placeholder={c.hasFoam ? (prev?.mass != null ? `last ${prev.mass.toFixed(2)}` : '0.00') : 'no foam'}
            disabled={!c.hasFoam}
            value={mass}
            onChange={(e) => { setMass(e.target.value); setConfirmed(false); }}
            className="mono"
          />
        </label>
        <label>
          Live worms
          <input type="number" min={0} max={50} value={live} onChange={(e) => setLive(e.target.value)} />
        </label>
        <label>
          Dead today
          <input type="number" min={0} max={50} value={dead} onChange={(e) => setDead(e.target.value)} />
        </label>
        <label className="addform-note">
          Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Re-weighed after taring the boat" />
        </label>
      </div>
      {existing && (
        <div className="addform-msg info">
          <Icon name="lock" size={14} />
          <span className="msg-t">
            Day {day} already has a reading from {existing.by === ME ? 'you' : PEOPLE[existing.by].short}
            {existing.mass != null ? ` (${g(existing.mass)})` : ''}. Yours will be saved as a second measurement next to it. Theirs stays as entered.
          </span>
        </div>
      )}
      {rising && (
        <div className="addform-msg warn">
          <Icon name="warn" size={14} />
          <span className="msg-t">
            {m.toFixed(2)} g is higher than day {prev!.day} ({g(prev!.mass)}). Foam can’t gain mass. Was the boat tared to 0.00 first?
          </span>
          <label className="check">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I re-checked, save it anyway
          </label>
        </div>
      )}
      <div className="addform-foot">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={!valid} onClick={submit}>
          Save reading
        </button>
      </div>
    </div>
  );
}
