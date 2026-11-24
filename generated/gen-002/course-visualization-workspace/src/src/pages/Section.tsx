import { useEffect, useState } from 'react';
import { TAS } from '../data/course';
import { Route, useStore } from '../store';
import { Icon } from '../components/Icon';

const NOTES: Record<number, { title: string; date: string; points: string[]; worksheet: string }> = {
  6: { title: 'Interaction: brushing your own PS4 charts', date: 'Thu Nov 19 (upcoming)', worksheet: 'Worksheet 6 posts Thursday morning.', points: ['Bring your three PS4 attempts — we’ll swap and do a 10-minute in-person critique.'] },
  5: {
    title: 'Juxtapose, superimpose, encode', date: 'Thu Nov 12', worksheet: 'Worksheet 5 — sort 9 published charts into the three comparison strategies, then redesign one.',
    points: [
      'Most of you sorted heatmaps under “juxtapose” — each row is its own aligned strip. That’s the reading Prof. Teague expects for PS4.',
      'Stacked areas are superimposed but only the bottom layer has a common baseline. Avoid them for comparing individual counters.',
      'For the explicit-encoding chart, indexing each counter to its 2019 average = 100 is the easiest route. Differences from Harbor Dr also work.',
      'Use `sum(min_count=1)` in pandas (or the R equivalent) so the University Ave outage stays NA instead of becoming 0.',
      'Several people downloaded the latest version by accident. PS4 = v3.',
    ],
  },
  4: { title: 'Writing Vega-Lite by hand', date: 'Thu Nov 5', worksheet: 'Worksheet 4 — rebuild two PS3 charts in Vega-Lite.', points: ['Facet vs. repeat vs. concat — know which one you need before you start typing.'] },
};

export function SectionPage({ route }: { route: Route }) {
  const { markOpened, state } = useStore();
  const qw = Number(route.query.get('week')) || 5;
  const [week, setWeek] = useState(qw);
  useEffect(() => {
    if (week === 5) markOpened('section-5');
  }, [week, markOpened]);
  const me = TAS.find((t) => t.mine)!;
  const notes = NOTES[week];
  return (
    <div className="page-wide">
      <h1 className="page-title">Section B04</h1>
      <p className="lede">{me.time} · {me.room} · TA {me.name}</p>
      <div className="week-cols">
        <div className="card">
          <div className="section-tabs seg">
            {[6, 5, 4].map((w) => <button key={w} className={week === w ? 'on' : ''} onClick={() => setWeek(w)}>Week {w}{w === 5 && !state.opened['section-5'] ? ' •' : ''}</button>)}
          </div>
          <h2 className="sec-title">Week {week} · {notes.title}</h2>
          <div className="muted small">{notes.date}{week === 5 ? ' · you were out (excused)' : ''}</div>
          <ul className="file-list" style={{ margin: '12px 0' }}><li><Icon name="doc" /><span>{notes.worksheet}</span></li></ul>
          <h3 className="sub-title">Priya’s notes</h3>
          <ul className="bullets">{notes.points.map((p) => <li key={p} dangerouslySetInnerHTML={{ __html: p.replace(/`([^`]+)`/g, '<code>$1</code>') }} />)}</ul>
          {week === 5 && <a className="btn sm" href="#/ps/4">Back to PS4 brief</a>}
        </div>
        <div>
          <div className="card">
            <h2 className="sec-title">Your TA</h2>
            <div className="ta-card">
              <div className="avatar lg">PV</div>
              <div>
                <b>{me.name}</b>
                <div className="muted small">Office hours {me.office}</div>
                <div className="muted small">Extra PS4 hours: Wed Nov 18, 4–6pm, CSE B260 (all TAs)</div>
              </div>
            </div>
          </div>
          <div className="card flush">
            <div className="card-pad"><h2 className="sec-title">All sections</h2></div>
            <table className="list-table compact">
              <thead><tr><th>Section</th><th>TA</th><th>Meets</th><th>Office hours</th></tr></thead>
              <tbody>
                {TAS.slice().sort((a, b) => a.section.localeCompare(b.section)).map((t) => (
                  <tr key={t.section} className={t.mine ? 'hl' : ''}><td className="mono">{t.section}</td><td>{t.name}{t.mine && <span className="pill ok sm" style={{ marginLeft: 6 }}>yours</span>}</td><td className="small">{t.time}<div className="muted">{t.room}</div></td><td className="small">{t.office}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
