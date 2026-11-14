import type { Episode } from '../data/generate';
import { PRODUCTION_NOTES, MOVE_ISO } from '../data/generate';
import { SHOW_BY_ID } from '../data/shows';
import type { Filters } from '../analysis/model';
import { dateLong, dateShort, num } from '../lib/format';

interface Props {
  all: Episode[];
  f: Filters;
}

export function Method({ all, f }: Props) {
  const narrativeNotes = PRODUCTION_NOTES.filter((n) => SHOW_BY_ID[n.showId].format === 'Narrative').length;
  const episodes = all.length;
  const shows = Object.keys(SHOW_BY_ID).length;
  const narr = all.filter((e) => SHOW_BY_ID[e.showId].format === 'Narrative');
  const narrPre = narr.filter((e) => e.date < MOVE_ISO);
  const narrPost = narr.filter((e) => e.date >= MOVE_ISO);
  const narrShows = Object.values(SHOW_BY_ID).filter((s) => s.format === 'Narrative').length;
  const weeksPre = Math.round(Math.abs(Date.parse(`${MOVE_ISO}T00:00:00Z`) - Date.parse('2025-01-01T00:00:00Z')) / 604_800_000);
  const weeksPost = Math.round(Math.abs(Date.parse('2026-11-13T00:00:00Z') - Date.parse(`${MOVE_ISO}T00:00:00Z`)) / 604_800_000);

  return (
    <div className="method">
      <div className="page-head">
        <div>
          <h1>Method &amp; data</h1>
          <p>What each number means, how the comparison is built, and what it cannot show.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="note warn" style={{ marginBottom: 12 }}>
          <strong>Synthetic demo data.</strong> Every episode, retention curve, and production note in this build is generated for
          demonstration. Figures on screen are not the network's results. Replace the data source before using any number in a
          meeting.
        </div>

        <h2>What the tool answers</h2>
        <p>
          Did completion and per-minute retention change after the narrative mid-roll moved from about minute 18 to about minute 25
          on {dateLong(MOVE_ISO)}? Does the change differ by show, episode length, or platform? Which shows or episodes stand out?
        </p>

        <h2>Data</h2>
        <ul>
          <li>
            {shows} shows: 6 narrative, 5 interview, 3 daily news. {num(episodes)} episodes from January 2025 to 13 November 2026.
          </li>
          <li>
            Per episode: downloads, starts, completion, average listened share, length, mid-roll minute, number of ad breaks, platform share
            of starts (Apple, Spotify, network app, other), and a per-minute retention curve.
          </li>
          <li>
            Narrative episodes: {narrPre.length} before {dateShort(MOVE_ISO)}, {narrPost.length} after. Non-narrative (comparison) episodes keep
            their ad positions throughout.
          </li>
          <li>Production notes are attached to {PRODUCTION_NOTES.length} episodes ({narrativeNotes} narrative).</li>
        </ul>

        <h2>Definitions</h2>
        <ul>
          <li>
            <strong>Completion</strong>: the share of starting listeners still listening in the final minute. Starts-weighted when
            averaged across episodes.
          </li>
          <li>
            <strong>Share still listening, by minute</strong>: for each minute, the share of starters still listening. Averages only include
            episodes long enough to reach that minute.
          </li>
          <li>
            <strong>Lost at mid-roll</strong>: the share of listeners who were still listening just before the mid-roll minute and had left
            one minute later.
          </li>
          <li>
            <strong>Before / after</strong>: episodes dated before or on or after the split date in the sidebar (default {dateShort(MOVE_ISO)}).
            The window end in the sidebar drops later episodes entirely. Setting the split to an earlier date and ending the window on
            3 Aug 2026 gives a placebo check that uses no post-move episodes.
          </li>
          <li>
            <strong>Majority platform</strong>: the platform with the largest share of starts for that episode.
          </li>
        </ul>

        <h2>How the comparison is built</h2>
        <ul>
          <li>
            <strong>Pooled completion</strong>: starts-weighted completion across all episodes before or after the split. Shows with
            more episodes after the move carry more weight, so this figure is shown for reference only.
          </li>
          <li>
            <strong>Show-by-show change</strong>: each show is compared with itself. Its change is its completion after the split minus
            its completion before, both starts-weighted.
          </li>
          <li>
            <strong>Adjusted change</strong>: the average of the narrative shows' own changes, minus the average of the non-narrative
            shows' own changes over the same window. Each show counts once. Non-narrative shows never moved their ad slot, so this
            removes general drift in listening. This is a difference-in-differences comparison with show-level units.
          </li>
          <li>
            <strong>Why not pool?</strong> The shows differ in completion level and in how many episodes sit after the move. Pooling
            lets that mix shift the result even when no show changed. On this data, a placebo split on 1 March with the window ending
            3 August shows a pooled change of about −2 pts, but a change close to zero once each show is compared with itself.
          </li>
          <li>
            <strong>Uncertainty</strong>: 95% intervals from a bootstrap with 1,000 resamples (600 for per-show estimates, 500 for segments).
            Each resample draws episodes with replacement within each show and period, recomputes every show's change, and then the
            average. Intervals are wider when there are fewer episodes.
          </li>
          <li>
            <strong>Segments</strong>: each segment (length, platform, ad breaks, downloads) gets its own adjusted change, using the
            narrative and non-narrative shows that have episodes in that segment on both sides of the split. If there is no comparison
            show in a segment, the figure is a raw change and is labelled as such.
          </li>
          <li>
            <strong>Outlier show</strong>: a narrative show at least 3 pts below the median narrative show, and at least 2 standard
            errors below it. Only drops are flagged. Needs at least three narrative shows in view.
          </li>
          <li>
            <strong>Unusual episode</strong>: completion more than two standard deviations from the show's own before-move average (each
            show's baseline uses only its episodes before the split, with production-note episodes included).
          </li>
        </ul>

        <h2>Production notes</h2>
        <p>
          Producers flagged these episodes. By default they are excluded from the comparison. The toggle in the sidebar switches this.
          Current setting: <strong>{f.excludeFlagged ? 'excluded' : 'included'}</strong>.
        </p>
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table className="data">
            <thead>
              <tr>
                <th className="left">Show</th>
                <th className="left">Date</th>
                <th className="left">Period</th>
                <th className="left">Note</th>
                <th className="left">Status</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTION_NOTES.slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((n) => {
                  const after = n.date >= f.split;
                  return (
                    <tr key={`${n.showId}-${n.date}`}>
                      <td className="left name">{SHOW_BY_ID[n.showId].name}</td>
                      <td className="left">{dateShort(n.date)}</td>
                      <td className="left">{after ? 'After' : 'Before'}</td>
                      <td className="left" style={{ whiteSpace: 'normal' }}>{n.text}</td>
                      <td className="left">
                        <span className={`tag ${f.excludeFlagged ? 'amber' : ''}`}>{f.excludeFlagged ? 'Excluded' : 'Included'}</span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <h2>Limits</h2>
        <ul>
          <li>
            This is an observational before-and-after comparison, not a randomised test. The ad move is the only ad change we see in
            the narrative shows, but other things changed on the same date and the comparison shows only partly control for them.
          </li>
          <li>
            Only {narrPost.length} narrative episodes sit after the move, across {narrShows} shows. Per-show results rest on about{' '}
            {Math.round(narrPost.length / narrShows)} episodes each.
          </li>
          <li>
            Narrative episodes were published more often after the move ({narrPost.length} in about {weeksPost} weeks, against {narrPre.length} in about{' '}
            {weeksPre} weeks before). Frequency changes can affect listening, and the tool does not model them.
          </li>
          <li>
            Platform and length effects are compared within segments, not modelled jointly. Overlaps between segments (for example, long
            episodes that are also mostly on Spotify) are not separated.
          </li>
          <li>
            The "bailing earlier" check compares per-minute retention before the new slot. It shows whether listeners leave earlier, but
            not why.
          </li>
        </ul>
      </div>

      <p className="side-help" style={{ marginTop: 10 }}>
        Build: React and Vite, no server. All calculations run in the browser from the seeded demo dataset.
      </p>
    </div>
  );
}
