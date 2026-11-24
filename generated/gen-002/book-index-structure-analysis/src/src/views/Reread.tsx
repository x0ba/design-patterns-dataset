import { useStore } from '../store.tsx';
import { chapterOf } from '../data/book.ts';
import { thinRuns } from './Structure.tsx';
import { formatRange } from '../lib/locators.ts';

export function RereadView() {
  const { s, an, dispatch } = useStore();
  const totalPages = s.reread.reduce((a, r) => a + (r.end - r.start + 1), 0);
  const suggestions = an.chapters
    .filter((c) => c.perPage < an.median * 0.7)
    .flatMap((c) => thinRuns(an, c.start, c.end).map((r) => ({ ...r, ch: c.num })))
    .filter((r) => !s.reread.some((x) => x.key === `run-${r.start}`));

  return (
    <div className="view reread">
      <div className="view-head">
        <div>
          <h1>Pages to re-read</h1>
          <p className="lede">
            Pages to go back to in the proofs before delivery: thin runs and pages you flagged from the chapter view.{' '}
            {s.reread.length > 0 && (
              <>
                {s.reread.length} item{s.reread.length === 1 ? '' : 's'}, {totalPages} page{totalPages === 1 ? '' : 's'}.
              </>
            )}
          </p>
        </div>
      </div>
      {s.reread.length === 0 && (
        <div className="empty">
          <p>Nothing on the list yet.</p>
          <p className="small muted">Add pages from the chapter view, either a thin run or a single page from the page chart.</p>
        </div>
      )}
      {s.reread.length > 0 && (
        <table className="rtable">
          <thead>
            <tr>
              <th>Pages</th>
              <th>Chapter</th>
              <th className="num">References now</th>
              <th>Note</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {s.reread.map((r) => {
              let refs = 0;
              for (let p = r.start; p <= r.end; p++) refs += an.coverage[p];
              const ch = chapterOf(r.start);
              return (
                <tr key={r.key}>
                  <td className="strong">
                    {r.end > r.start ? `pp. ${formatRange(r.start, r.end)}` : `p. ${r.start}`}
                  </td>
                  <td>
                    <button className="link" onClick={() => dispatch({ type: 'go', view: 'structure', patch: { chapter: ch.num, page: r.start } })}>
                      Ch. {ch.num}
                    </button>
                  </td>
                  <td className="num">{refs}</td>
                  <td>
                    <input className="notein" value={r.note} onChange={(e) => dispatch({ type: 'reread-note', key: r.key, note: e.target.value })} />
                  </td>
                  <td>
                    <button className="link" onClick={() => dispatch({ type: 'reread-remove', key: r.key })}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {suggestions.length > 0 && (
        <>
          <h3>Suggested from thin chapters</h3>
          <div className="suggest-runs">
            {suggestions.map((r) => (
              <div className="run" key={r.start}>
                <div>
                  <b>pp. {formatRange(r.start, r.end)}</b>{' '}
                  <span className="muted">
                    Ch. {r.ch} · {r.end - r.start + 1} pp · {r.refs} refs
                  </span>
                </div>
                <button
                  className="btn sm"
                  onClick={() => dispatch({ type: 'reread-add', item: { key: `run-${r.start}`, start: r.start, end: r.end, note: `Thin run in Ch. ${r.ch}: ${r.refs} references over ${r.end - r.start + 1} pages` } })}
                >
                  + Re-read
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
