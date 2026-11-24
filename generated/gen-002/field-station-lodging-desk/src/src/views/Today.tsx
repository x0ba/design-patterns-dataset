import { COURSE, USER, STATION } from '../config';
import { GuideBox, Panel, Pill } from '../components/ui';
import { useStore } from '../state/store';
import {
  arrivalCovers,
  clockLabel,
  dayLabel,
  manifestKey,
  summary,
  untilLabel,
  passengers,
} from '../logic';
import type { AppState } from '../types';

interface Task {
  id: string;
  title: string;
  detail: string;
  due: string;
  done: boolean;
  cta: string;
  href: string;
}

export function buildTasks(state: AppState): Task[] {
  const s = summary(state);
  const c = arrivalCovers(state);
  const kitchenCurrent =
    state.kitchen.B === c.B.confirmedTotal && state.kitchen.L === c.L.confirmedTotal && state.kitchen.D === c.D.confirmedTotal;
  const manifestCurrent = state.manifestSentKey === manifestKey(state);
  const firstConflict = s.conflicts[0]?.bunkId ?? 'MAN-1';

  return [
    {
      id: 'tentative',
      title: `Settle ${s.tentative} tentative bookings`,
      detail: 'Confirm a name only after the course has confirmed it in writing. Anything still tentative at 17:00 returns to free stock.',
      due: 'Before 17:00 today',
      done: s.tentative === 0,
      cta: 'Open People',
      href: '#/people',
    },
    {
      id: 'unnamed',
      title: `Name or release ${s.emptyCount} unnamed hold bunks`,
      detail: 'Name a person (they start as tentative), or release the bunk. A released bunk drops out of the kitchen count.',
      due: 'Before 17:00 today',
      done: s.emptyCount === 0,
      cta: 'Open People',
      href: '#/people',
    },
    {
      id: 'conflict',
      title: s.conflicts.length > 0 ? `Move ${s.conflicts.length} course members out of Manglar` : 'No course members in restricted cabins',
      detail: 'Manglar is "Restricted – permit housing" for MINAE permit inspectors, 25–27 Nov. A course stay covers those nights, so the cabin cannot be used.',
      due: 'Today',
      done: s.conflicts.length === 0,
      cta: 'Open Bunks',
      href: `#/bunks/${firstConflict}`,
    },
    {
      id: 'waiver',
      title: `Get ${s.waiverIncomplete} waivers on file`,
      detail: 'Check-in and boat boarding are blocked until each signed waiver is on file. Their bunk assignments are not affected.',
      due: 'Before the boat, Wed 13:30',
      done: s.waiverIncomplete === 0,
      cta: 'Open People',
      href: '#/people',
    },
    {
      id: 'kitchen',
      title: `Send the kitchen the corrected count for ${dayLabel(COURSE.from)}`,
      detail: `The kitchen sheet still says ${state.kitchen.D} for dinner. Send breakfast and lunch as residents only, and dinner at the confirmed number, then update it after 17:00.`,
      due: 'Today',
      done: kitchenCurrent,
      cta: 'Open Meals',
      href: '#/meals',
    },
    {
      id: 'boat',
      title: 'Send the boat manifest to the captain',
      detail: `Trip 1 at 13:30 is ${passengers(state, 1).length} of 14 seats. Trip 2 is listed for 15:00, and that time still needs confirming.`,
      due: 'Today',
      done: manifestCurrent,
      cta: 'Open Transfers',
      href: '#/transfers',
    },
  ];
}

export function TodayView() {
  const { state } = useStore();
  const s = summary(state);
  const c = arrivalCovers(state);
  const tasks = buildTasks(state);
  const doneCount = tasks.filter((t) => t.done).length;
  const minutesLeft = COURSE.releaseMinute - state.clock;
  const pendingBunks = s.tentative + s.emptyCount;
  const recent = [...state.log].reverse().slice(0, 7);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Today</h1>
          <p className="subtle">
            {dayLabel('2026-11-17')} 2026 · {clockLabel(state.clock)} station time · {STATION}
          </p>
        </div>
        <div className="head-stats">
          <div>
            <strong>{s.heldCount}</strong>
            <span>held for BIO 377</span>
          </div>
          <div>
            <strong>{s.confirmed + s.residentCount}</strong>
            <span>confirmed for the stay</span>
          </div>
          <div>
            <strong>{s.freeCount}</strong>
            <span>free bunks</span>
          </div>
        </div>
      </div>

      <div className={`release-banner ${minutesLeft <= 0 ? 'past' : ''}`}>
        <div className="release-main">
          <div className="release-kicker">BIO 377 block hold releases today at 17:00</div>
          <div className="release-title">
            {minutesLeft > 0 ? `${untilLabel(minutesLeft)} left.` : 'The release time has passed.'} {pendingBunks} bunks are not yet confirmed:{' '}
            {s.tentative} tentative and {s.emptyCount} unnamed.
          </div>
          <div className="release-sub">
            Unconfirmed bunks return to free stock at the release. The kitchen number then falls from {c.D.maxTotal} to {c.D.confirmedTotal} for dinner on{' '}
            {dayLabel(COURSE.from)}, unless more people are confirmed first.
          </div>
        </div>
        <a className="btn primary" href="#/people">
          Settle the {pendingBunks} pending bunks
        </a>
      </div>

      <GuideBox id="today" title="What this screen is for">
        <ul>
          <li>
            <strong>Start with the list.</strong> Each item is something you need to finish. The state updates as you work, so you can see what is left.
          </li>
          <li>
            <strong>Held</strong> means bunks reserved for the course. <strong>Confirmed</strong> means people the course has confirmed. They are not the same number.
          </li>
          <li>
            The numbers on the right come from the same data as the Meals and Transfers screens, so they always agree.
          </li>
        </ul>
        <p>
          New terms are underlined. Hover one to see what it means. <a href="#/help">The help centre</a> has a short article on each.
        </p>
      </GuideBox>

      <div className="grid-today">
        <Panel
          title={`Your list for today`}
          right={
            <span className="progress-label">
              {doneCount} of {tasks.length} done
            </span>
          }
        >
          <div className="progress">
            <div className="progress-bar" style={{ width: `${(doneCount / tasks.length) * 100}%` }} />
          </div>
          <ol className="tasks">
            {tasks.map((t, i) => (
              <li key={t.id} className={t.done ? 'task done' : 'task'}>
                <div className="task-num">{t.done ? '✓' : i + 1}</div>
                <div className="task-body">
                  <div className="task-title">
                    {t.title}
                    {t.done && <Pill tone="ok">done</Pill>}
                  </div>
                  <div className="task-detail">{t.detail}</div>
                  <div className="task-meta">Due: {t.due}</div>
                </div>
                <a className={`btn ${t.done ? '' : 'primary'} small`} href={t.href}>
                  {t.done ? 'Review' : t.cta}
                </a>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="side-col">
          <Panel title={`${dayLabel(COURSE.from)}: kitchen sheet vs system`}>
            <table className="table compact">
              <thead>
                <tr>
                  <th>Meal</th>
                  <th className="num">Kitchen sheet</th>
                  <th className="num">Confirmed</th>
                  <th className="num">Pending</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Breakfast</td>
                  <td className="num">{state.kitchen.B}</td>
                  <td className="num strong">{c.B.confirmedTotal}</td>
                  <td className="num">{c.B.pendingTotal}</td>
                </tr>
                <tr>
                  <td>Lunch</td>
                  <td className="num">{state.kitchen.L}</td>
                  <td className="num strong">{c.L.confirmedTotal}</td>
                  <td className="num">{c.L.pendingTotal}</td>
                </tr>
                <tr>
                  <td>Dinner</td>
                  <td className="num">{state.kitchen.D}</td>
                  <td className="num strong">{c.D.confirmedTotal}</td>
                  <td className="num">{c.D.pendingTotal}</td>
                </tr>
              </tbody>
            </table>
            <p className="note">
              The course reaches the station at 13:30 by boat, so breakfast and lunch on this day are residents only, unless lunch is packed for the boat.
              {state.kitchen.B !== c.B.confirmedTotal && ' The sheet still counts the whole hold.'}
            </p>
            <a className="link-btn" href="#/meals">
              See the message for the kitchen →
            </a>
          </Panel>

          <Panel title="What happens at 17:00">
            <ul className="plain-list">
              <li>
                <strong>{s.confirmed}</strong> confirmed course members keep their bunks.
              </li>
              <li>
                <strong>{s.tentative}</strong> tentative and <strong>{s.emptyCount}</strong> unnamed bunks return to free stock, unless settled before then.
              </li>
              <li>
                Dinner falls to the confirmed number, <strong>{c.D.confirmedTotal}</strong>, plus anyone you settle before 17:00.
              </li>
            </ul>
            <p className="note">Waivers do not change at the release. A missing waiver still blocks check-in and boarding.</p>
          </Panel>

          <Panel title="Activity">
            <ul className="activity">
              {recent.map((entry) => (
                <li key={entry.id}>
                  <span className="activity-time">{entry.time}</span>
                  <span>{entry.text}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <p className="signoff subtle">
        Signed in as {USER.name}, {USER.title}.
      </p>
    </div>
  );
}
