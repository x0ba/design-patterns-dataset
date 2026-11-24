import React from 'react';
import { PEOPLE } from './data.js';
import { computeShares, fmt, pointHours } from './calc.js';

function PointsExample({ cashPooled }) {
  const r = computeShares('week', cashPooled);
  const ph = pointHours('hours');
  const lucia = PEOPLE.find((p) => p.id === 'lucia');
  const fohPool = r.foh;
  const mine = lucia.points * lucia.hours;
  return (
    <div className="example">
      <p className="example-title">Worked example: Lucia Ferraro, this week</p>
      <ol>
        <li>The pool is {fmt(r.totalPool)}. 80% goes to front of house: <b>{fmt(fohPool)}</b>.</li>
        <li>Lucia is a server (10 points) with {lucia.hours} tipped hours: 10 × {lucia.hours} = <b>{mine}</b> point-hours.</li>
        <li>Everyone in front of house together has <b>{ph.FOH.toLocaleString('en-US')}</b> point-hours.</li>
        <li>Her share: {mine} ÷ {ph.FOH.toLocaleString('en-US')} × {fmt(fohPool)} = <b>{fmt(r.shares.lucia)}</b>.</li>
      </ol>
    </div>
  );
}

export const ARTICLES = [
  {
    id: 'manager',
    title: 'Who counts as a manager?',
    kicker: 'Pool rules',
    minutes: 3,
    summary: 'Why titles don’t decide it, and where a shift lead lands in California.',
    Body: () => (
      <>
        <p className="lede">Managers and other employer-side people can’t share in a tip pool. The law looks at what a person is <em>allowed to do</em>, not at their job title, so “shift lead” can land on either side.</p>

        <h3>California (the rules Kittyline applies to Olive & Ember)</h3>
        <ul>
          <li>An employer or its <b>agent</b> may not take any part of a tip (Labor Code §351).</li>
          <li>An agent is anyone with authority to <b>hire or discharge</b> employees, or to <b>supervise, direct or control</b> what employees do (Labor Code §350(c)).</li>
        </ul>

        <h3>Federal rule (also applies)</h3>
        <p>Under the Fair Labor Standards Act, managers and supervisors can’t keep any employees’ tips, including through a pool. “Manager or supervisor” here means someone whose primary duty is management, who regularly directs two or more employees, and who can hire and fire or whose recommendations carry real weight (29 CFR 531.52 and 541.100).</p>
        <p>The federal test is narrower than California’s. Where the two differ, the broader one decides who is out of your pool.</p>

        <h3>Where a shift lead usually lands</h3>
        <table className="art-table">
          <thead><tr><th>What the shift lead does</th><th>Counts as a manager?</th></tr></thead>
          <tbody>
            <tr><td>Works a station and doesn’t direct anyone</td><td>Usually no</td></tr>
            <tr><td>Assigns sections, calls breaks, sends people home, runs the floor</td><td><b>Yes in California.</b> They direct others’ work.</td></tr>
            <tr><td>Interviews candidates or recommends who gets hired or let go</td><td><b>Yes</b></td></tr>
            <tr><td>Does the above on some shifts and works a station on others</td><td>Gray area. Kittyline plays it safe and excludes them.</td></tr>
          </tbody>
        </table>

        <h3>What Kittyline does with the answer</h3>
        <p>Anyone marked manager-designated gets $0 from the pool, and is skipped whenever Kittyline routes tips to “whoever is still on the clock.” Everyone else keeps their points-times-hours share.</p>

        <p className="fineprint">This is a plain-language summary, not legal advice. For a ruling on a specific person, ask the California Labor Commissioner’s Office (DLSE) or an employment attorney.</p>
      </>
    ),
  },
  {
    id: 'late',
    title: 'Late-closed checks',
    kicker: 'Weekly payout',
    minutes: 2,
    summary: 'Why a check can end up “unassigned,” and the three places its tip can go.',
    Body: () => (
      <>
        <p className="lede">A late-closed check is a card check that closes after the last tipped employee clocked out. Kittyline can’t match it to a shift, so it marks the tip <b>unassigned</b> and holds it out of everyone’s payout until you place it.</p>

        <h3>Where the tip can go</h3>
        <ol>
          <li><b>Add to the week’s pool.</b> Treated like every other card tip: split by points × hours, 80% front of house and 20% back of house. This is what most pooled restaurants want, because the tip was earned by the service, not by whoever stayed late.</li>
          <li><b>Share among that night’s crew only.</b> Same 80/20 split, but only among people who worked that service, weighted by their hours that night. Use it if you have always pooled night by night.</li>
          <li><b>Give to whoever is still on the clock.</b> Kittyline’s automatic suggestion. It’s skipped when it breaks a pool rule, for example when managers are excluded and one back-of-house employee would receive the whole amount.</li>
        </ol>

        <h3>Good to know</h3>
        <ul>
          <li>A week can’t be approved while any tip is unassigned.</li>
          <li>Nothing is paid out until you approve the week, so you can change your mind until then.</li>
          <li>To avoid it next time, have servers close every check before they clock out, or have the closer adjust tips on the POS before the last punch-out.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'cash',
    title: 'Entering declared cash tips',
    kicker: 'Weekly payout',
    minutes: 2,
    summary: 'One line per person per shift, exactly as declared, pooled or kept.',
    Body: () => (
      <>
        <p className="lede">Cash tips reach payroll only if they’re recorded, and they’re recorded one declaration at a time.</p>
        <ol>
          <li><b>Enter it on the shift it was earned.</b> Use the service (for example “Fri Nov 13 · Dinner”), not the day you’re doing payouts.</li>
          <li><b>One line per person.</b> Enter what each person wrote on their end-of-shift declaration, to the cent. Don’t enter one total for the room.</li>
          <li><b>Choose pooled or kept.</b> “Into the pool” cash is added to the weekly pool and shared by points and hours. “Kept by employee” is recorded for tax reporting but is not pooled.</li>
          <li><b>Don’t net anything out.</b> If a server tipped out a busser from their cash, the declaration still shows the full amount; the pool rules handle the sharing.</li>
          <li><b>Fix mistakes at the source.</b> Imported lines come from the POS tip-out screen, so correct them there and they update on the next import. Lines you add in Kittyline can be removed.</li>
        </ol>
        <p>Why so precise? Declared cash tips are taxable wages. Employees report them to the employer (the IRS asks for it monthly once cash tips reach $20), and payroll needs them per pay period.</p>
      </>
    ),
  },
  {
    id: 'points',
    title: 'How points and hours become a payout',
    kicker: 'Pool rules',
    minutes: 2,
    summary: 'The formula behind every number in your payout preview.',
    Body: ({ cashPooled }) => (
      <>
        <p className="lede">Each person’s share is their <b>points × tipped hours</b>, divided by the same figure for everyone in their half of the house.</p>
        <ol>
          <li>Add card tips and pooled cash to get the pool.</li>
          <li>Split the pool 80% front of house, 20% back of house.</li>
          <li>Inside each half, share by points × hours. Managers are left out.</li>
          <li>Round to the cent. Any odd cents go to the largest remainders, so the total always matches.</li>
        </ol>
        <PointsExample cashPooled={cashPooled} />
      </>
    ),
  },
];
