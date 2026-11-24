import { useApp } from './App';
import { RUN, BORDERLINE } from './data';
import { Avatar, Icon } from './ui';

export function RunView() {
  const { state, act } = useApp();
  const extracted = 137;
  const excludedTotal = RUN.excluded.reduce((s, e) => s + e.count, 0);

  return (
    <div className="run">
      <section className="run-left">
        <div className="card">
          <div className="card-h">Your instructions</div>
          <div className="prompt">
            <Avatar id="leah" size={24} />
            <p>{RUN.instructions}</p>
          </div>
          <dl className="meta-grid">
            <div><dt>Started</dt><dd>{RUN.started}</dd></div>
            <div><dt>Finished</dt><dd>{RUN.finished.replace("Tue Nov 17, ", "")} · {RUN.duration}</dd></div>
            <div><dt>Model</dt><dd>{RUN.model}</dd></div>
            <div><dt>Run by</dt><dd>{RUN.startedBy}</dd></div>
          </dl>
        </div>

        <div className="card">
          <div className="card-h">Documents read</div>
          <table className="tbl">
            <thead><tr><th>Document</th><th className="num">Pages</th><th className="num">Read</th><th className="num">Requirements</th></tr></thead>
            <tbody>
              {RUN.docsRead.map((d) => (
                <tr key={d.name}>
                  <td><Icon name="doc" size={12} /> {d.name}</td>
                  <td className="num">{d.pages}</td>
                  <td className="num ok">{d.read === d.pages ? '✓ all' : `${d.read}`}</td>
                  <td className="num">{d.extracted ?? <span className="muted">mapped against</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-h">How 211 candidate sentences became 137 requirements</div>
          <div className="funnel">
            <div className="fn-row"><span className="fn-bar" style={{ width: '100%' }} /><span className="fn-l"><b>{RUN.candidates}</b> sentences with shall, must, required, or should</span></div>
            <div className="fn-row"><span className="fn-bar keep" style={{ width: `${(extracted / RUN.candidates) * 100}%` }} /><span className="fn-l"><b>{extracted}</b> kept as requirements (132 RFP, 2 Addendum 1, 3 Addendum 2)</span></div>
            <div className="fn-row"><span className="fn-bar drop" style={{ width: `${(excludedTotal / RUN.candidates) * 100}%` }} /><span className="fn-l"><b>{excludedTotal}</b> excluded</span></div>
          </div>
          <ul className="excl">
            {RUN.excluded.map((e) => <li key={e.reason}><span>{e.reason}</span><b>{e.count}</b></li>)}
          </ul>
        </div>
      </section>

      <section className="run-right">
        <div className="card tall">
          <div className="card-h">
            Borderline exclusions
            <span className="muted small"> · the 8 exclusions the model was least sure of. Add any that should be in the matrix.</span>
          </div>
          <div className="borderline">
            {BORDERLINE.map((c) => {
              const added = state.addedCandidates.includes(c.key);
              const addedReq = added ? state.reqs.find((r) => r.added && r.text === c.text) : null;
              return (
                <div key={c.key} className={`bl ${added ? 'added' : ''}`}>
                  <div className="bl-top">
                    <span className="ref">RFP §{c.sec} · p.{c.page}</span>
                    <span className={`mini-tag reason`}>{c.reason}</span>
                    <span className="spacer" />
                    {added ? (
                      <span className="bl-added"><Icon name="check" size={12} /> Added as {addedReq?.id}</span>
                    ) : (
                      <button className="btn btn-sm" onClick={() => act({ type: 'addCandidate', c }, `Added “${c.title}” to the matrix as a missing requirement`, false)}>
                        <Icon name="plus" size={12} /> Add to matrix
                      </button>
                    )}
                  </div>
                  <p className="doc-text">{c.text}</p>
                  <p className="bl-note">{c.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
