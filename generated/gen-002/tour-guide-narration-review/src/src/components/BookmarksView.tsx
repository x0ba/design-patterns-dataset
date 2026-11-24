import { useApp } from '../App';
import { chapterIndexAt, fmtDate, fmtFor } from '../util';
import * as I from './Icons';

export default function BookmarksView() {
  const { state, dispatch } = useApp();
  const byItem = new Map<string, typeof state.bookmarks>();
  for (const b of state.bookmarks) byItem.set(b.itemId, [...(byItem.get(b.itemId) ?? []), b]);
  const groups = [...byItem.entries()].map(([id, bms]) => ({ item: state.items[id], bms: bms.sort((a, b) => a.t - b.t) }));

  return (
    <div className="lib">
      <header className="lib-head">
        <div>
          <h1>Bookmarks</h1>
          <p className="lib-sub">{state.bookmarks.length} bookmarks across your library. Click a time to play from that moment.</p>
        </div>
      </header>
      {groups.length === 0 && <p className="empty pad">No bookmarks yet.</p>}
      {groups.map(({ item, bms }) => (
        <section className="bm-group" key={item.id}>
          <h2>
            <span className={`kind-dot ${item.kind}`} /> {item.title}
            <span className="muted"> · {item.kind === 'tour' ? `${item.subtitle}, ${fmtDate(item.date)}` : 'Lecture'}</span>
          </h2>
          <div className="table-wrap"><table className="table">
            <tbody>
              {bms.map((b) => {
                const ci = chapterIndexAt(item.chapters, b.t);
                const seg = item.transcript.filter((s) => s.t <= b.t).pop();
                return (
                  <tr key={b.id}>
                    <td style={{ width: 110 }}>
                      <button className="bm-time" onClick={() => dispatch({ type: 'load', id: item.id, at: b.t, play: true })}>
                        <I.Play size={11} /> {fmtFor(item, b.t)}
                      </button>
                    </td>
                    <td style={{ width: 120 }}>
                      <span className={`bm-kind ${b.kind}`}>{b.kind === 'note' ? 'Note' : b.kind === 'cut-start' ? 'Cut starts' : 'Cut ends'}</span>
                    </td>
                    <td>
                      <div className="cell-title">{b.note || <span className="muted">No note</span>}</div>
                      {seg && seg.speaker !== 'none' && <div className="cell-sub quote">“{seg.text.length > 140 ? seg.text.slice(0, 140) + '…' : seg.text}”</div>}
                    </td>
                    <td style={{ width: 260 }} className="cell-sub">
                      {item.kind === 'tour' ? 'Stop' : 'Chapter'} {ci + 1} · {item.chapters[ci].title}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </section>
      ))}
    </div>
  );
}
