import { useState } from 'react';
import { BOAT, COURSE } from '../config';
import { GuideBox, Panel, Pill, Term } from '../components/ui';
import { useStore } from '../state/store';
import { arrivalCovers, courseDays, covers, dayLabel, kitchenMessage, MEAL_LABEL } from '../logic';
import type { Meal } from '../types';

export function MealsView() {
  const { state, dispatch } = useStore();
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const c = arrivalCovers(state);
  const matches =
    state.kitchen.B === c.B.confirmedTotal && state.kitchen.L === c.L.confirmedTotal && state.kitchen.D === c.D.confirmedTotal;
  const message = kitchenMessage(state);
  const days = courseDays();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied('copied');
    } catch {
      // Clipboard is blocked on some non-secure origins; the text is on screen to copy by hand.
      setCopied('failed');
    }
    setTimeout(() => setCopied('idle'), 2500);
  };

  const rows: { meal: Meal; note: string }[] = [
    {
      meal: 'B',
      note: `Course is not on site until the boat arrives at ${BOAT.times[1]}. Residents only.`,
    },
    {
      meal: 'L',
      note: state.lunchPackedForBoat
        ? 'Lunch is packed for the boat, so the course is counted.'
        : 'Residents only, unless lunch is packed for the boat.',
    },
    {
      meal: 'D',
      note: `${c.D.residents.length} residents + ${c.D.confirmed.length} confirmed course members. ${c.D.pendingTotal} pending are decided at 17:00.`,
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Meals</h1>
          <p className="subtle">Cover counts for the kitchen, from the same bookings as the bunk board. Covers are people fed, not bunks.</p>
        </div>
      </div>

      <GuideBox id="meals" title="How the kitchen number is built">
        <ul>
          <li>
            <strong>Confirmed covers</strong> are residents and confirmed course members on site for that meal. Plan from this number.
          </li>
          <li>
            <strong>Pending covers</strong> are <Term k="tentative">tentative</Term> names and <Term k="block-hold">unnamed hold bunks</Term>. They may still be released at 17:00.
          </li>
          <li>
            The kitchen sheet had <strong>{state.kitchen.D}</strong> for every meal. That was the whole hold, including pending bunks, and it included breakfast and lunch before the course arrived.
          </li>
        </ul>
      </GuideBox>

      <div className="grid-meals">
        <Panel
          title={`${dayLabel(COURSE.from)}: kitchen sheet vs. system`}
          right={matches ? <Pill tone="ok">Sheet matches the system</Pill> : <Pill tone="alert">Sheet is out of date</Pill>}
        >
          <table className="table">
            <thead>
              <tr>
                <th>Meal</th>
                <th className="num">Kitchen sheet</th>
                <th className="num">Confirmed</th>
                <th className="num">Pending</th>
                <th className="num">Max</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ meal, note }) => {
                const cv = c[meal];
                return (
                  <tr key={meal}>
                    <td>
                      <strong>{MEAL_LABEL[meal]}</strong>
                      <div className="subtle small-text">{note}</div>
                    </td>
                    <td className={`num ${state.kitchen[meal] !== cv.confirmedTotal ? 'changed' : ''}`}>{state.kitchen[meal]}</td>
                    <td className="num strong">{cv.confirmedTotal}</td>
                    <td className="num">{cv.pendingTotal}</td>
                    <td className="num">{cv.maxTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <label className="check-row">
            <input
              type="checkbox"
              checked={state.lunchPackedForBoat}
              onChange={(e) => dispatch({ type: 'setLunchPacked', value: e.target.checked })}
            />
            Lunch on {dayLabel(COURSE.from)} is packed for the boat
          </label>

          <div className="meal-actions">
            <button className="btn primary" onClick={() => dispatch({ type: 'sendKitchen' })} disabled={matches}>
              {matches ? 'Sheet already matches' : 'Mark sheet as sent to the kitchen'}
            </button>
            <span className="subtle small-text">Use after you have sent the message. It records the numbers here.</span>
          </div>
        </Panel>

        <Panel title="Who is in the dinner count">
          <div className="who-grid">
            <div className="who">
              <div className="who-head">
                <Pill tone="resident">{c.D.residents.length} residents</Pill>
                <span className="subtle small-text">Counted, in house</span>
              </div>
              <ul>
                {c.D.residents.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
            </div>
            <div className="who">
              <div className="who-head">
                <Pill tone="confirmed">{c.D.confirmed.length} confirmed</Pill>
                <span className="subtle small-text">Counted, will stay</span>
              </div>
              <ul className="names">
                {c.D.confirmed.map((p) => (
                  <li key={p.id}>
                    {p.name}
                    {p.diet && <span className="diet-tag"> {p.diet}</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="who who-pending">
              <div className="who-head">
                <Pill tone="tentative">{c.D.pendingTotal} pending</Pill>
                <span className="subtle small-text">Released at 17:00 unless settled</span>
              </div>
              <ul>
                {c.D.tentative.map((p) => (
                  <li key={p.id}>
                    {p.name} <span className="subtle small-text">(tentative)</span>
                  </li>
                ))}
                {Array.from({ length: c.D.emptySlots }).map((_, i) => (
                  <li key={`slot-${i}`}>
                    Unnamed hold bunk <span className="subtle small-text">(block hold)</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="two-up-note">
            <div>
              <strong>Block hold</strong> is about a bunk. An unnamed bunk is a pending cover until someone takes it.
            </div>
            <div>
              <strong>Tentative</strong> is about a person. The name is in the bunk, but the course has not confirmed it.
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="Message for the kitchen"
        right={
          <button className="btn small" onClick={copy}>
            {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Select the text and copy' : 'Copy message'}
          </button>
        }
      >
        <pre className="message" aria-label="Kitchen message">{message}</pre>
        <p className="note">
          Cabinroll does not send messages. Copy the text and send it through the kitchen's usual channel, then mark the sheet as sent.
        </p>
      </Panel>

      <Panel title="Day by day, confirmed (pending in brackets)">
        <div className="day-grid">
          <table className="table compact">
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">Breakfast</th>
                <th className="num">Lunch</th>
                <th className="num">Dinner</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d} className={d === COURSE.from ? 'row-highlight' : ''}>
                  <td>
                    {dayLabel(d)}
                    {d === COURSE.from && <span className="subtle small-text"> arrival</span>}
                    {d === COURSE.to && <span className="subtle small-text"> check-out</span>}
                  </td>
                  {(['B', 'L', 'D'] as Meal[]).map((m) => {
                    const cv = covers(state, d, m);
                    return (
                      <td key={m} className="num">
                        {cv.confirmedTotal}
                        {cv.pendingTotal > 0 && <span className="subtle"> ({cv.pendingTotal})</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          The course counts from dinner on arrival day, and breakfast only on check-out morning. Residents are counted every day.
        </p>
      </Panel>
    </div>
  );
}
