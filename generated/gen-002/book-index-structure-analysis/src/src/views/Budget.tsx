import { useMemo } from 'react';
import { BOOK } from '../data/book.ts';
import { fmtPages, useStore } from '../store.tsx';
import { Delta, Heading, fmt } from '../components/bits.tsx';
import { buildWorking, applySplit, type Levers } from '../lib/apply.ts';
import { suggestSplit } from '../lib/analysis.ts';
import { entryLines } from '../lib/lines.ts';
import { labelOf } from '../store.tsx';

export function BudgetView() {
  const { an, base, s, dispatch, working, projectedLines, baselineLines, limitLines, decided } = useStore();
  const over = projectedLines - limitLines;

  // what each lever would save if switched on now
  const leverPreview = useMemo(() => {
    const out: Record<keyof Levers, number> = { citeNotes: 0, crewNames: 0 };
    for (const k of ['citeNotes', 'crewNames'] as (keyof Levers)[]) {
      const w = buildWorking(base, s.decisions, { ...s.levers, [k]: true }, labelOf);
      out[k] = w.delta - working.delta;
    }
    return out;
  }, [base, s.decisions, s.levers, working.delta]);

  const openSplits = useMemo(() => {
    const open = an.long.filter((e) => !decided(`split:${e.id}`) && !decided(`keep:${e.id}`));
    const rows = open.map((e) => ({ e, cost: entryLines(applySplit(e, suggestSplit(e))) - entryLines(e) }));
    rows.sort((a, b) => b.e.direct.length / Math.max(1, b.cost) - a.e.direct.length / Math.max(1, a.cost));
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [an, s.decisions]);
  const allSplitCost = openSplits.reduce((a, r) => a + r.cost, 0);

  // how many of the best-value splits fit in the current headroom
  const spare = -over;
  let fit = 0;
  let acc = 0;
  for (const r of openSplits) {
    if (acc + r.cost > spare) break;
    acc += r.cost;
    fit++;
  }

  const lo = 24 * BOOK.linesPerPage;
  const hi = 34 * BOOK.linesPerPage;
  const pos = (l: number) => `${((l - lo) / (hi - lo)) * 100}%`;
  const ticks = [24, 26, 28, 30, 32, 34];

  const decisionsLedger = working.ledger.filter((l) => !l.lever);
  const crewCount = base.filter((e) => e.crew).length;

  return (
    <div className="view budget">
      <div className="view-head">
        <div>
          <h1>Length budget</h1>
          <p className="lede">
            The publisher allows {BOOK.limitPages} typeset pages at about {BOOK.linesPerPage} lines a page ({fmt(limitLines)} lines). The cast-off of the draft came to {BOOK.baselinePages} pages. Changes below are estimated line by line against the press's two-column setting.
          </p>
        </div>
      </div>

      <div className="bigmeter">
        <div className="bigmeter-nums">
          <div>
            <div className="stat-label">Draft cast-off</div>
            <div className="big">{BOOK.baselinePages} pp</div>
            <div className="small muted">{fmt(baselineLines)} lines</div>
          </div>
          <div className="arrow">→</div>
          <div>
            <div className="stat-label">Projected</div>
            <div className={`big ${over > 0 ? 'warn' : 'ok'}`}>{fmtPages(projectedLines)} pp</div>
            <div className="small muted">
              {fmt(projectedLines)} lines · <Delta n={working.delta} />
            </div>
          </div>
          <div className="arrow" />
          <div>
            <div className="stat-label">Limit</div>
            <div className="big">{BOOK.limitPages} pp</div>
            <div className={`small ${over > 0 ? 'warn' : 'ok'}`}>{over > 0 ? `${fmt(over)} lines still to cut` : `${fmt(-over)} lines spare`}</div>
          </div>
        </div>
        <div className="bigtrack">
          {ticks.map((t) => (
            <div key={t} className="tick" style={{ left: pos(t * BOOK.linesPerPage) }}>
              <span>{t}</span>
            </div>
          ))}
          <div className="bt-fill" style={{ width: pos(projectedLines) }} />
          <div className="bt-base" style={{ left: pos(baselineLines) }} title="Cast-off" />
          <div className="bt-limit" style={{ left: pos(limitLines) }}>
            <span>limit</span>
          </div>
        </div>
      </div>

      <div className="budget-grid">
        <section>
          <h3>Ways to recover space</h3>
          <div className={`lever ${s.levers.citeNotes ? 'on' : ''}`}>
            <label className="lever-h">
              <input type="checkbox" checked={s.levers.citeNotes} onChange={(e) => dispatch({ type: 'lever', lever: 'citeNotes', on: e.target.checked })} />
              <span>Drop note locators that only cite a source</span>
              <Delta n={s.levers.citeNotes ? working.ledger.find((l) => l.lever === 'citeNotes')?.delta ?? 0 : leverPreview.citeNotes} />
            </label>
            <p className="small muted">
              {fmt(an.notes.cite)} of the {fmt(an.notes.locs)} locators to the notes (pp. 541–598) point to notes that give a source and nothing more. Most presses' style sheets leave those out. Headings
              whose only locators are such notes disappear.
            </p>
          </div>
          <div className={`lever ${s.levers.crewNames ? 'on' : ''}`}>
            <label className="lever-h">
              <input type="checkbox" checked={s.levers.crewNames} onChange={(e) => dispatch({ type: 'lever', lever: 'crewNames', on: e.target.checked })} />
              <span>Drop names that appear only in printed crew lists</span>
              <Delta n={s.levers.crewNames ? working.ledger.find((l) => l.lever === 'crewNames')?.delta ?? 0 : leverPreview.crewNames} />
            </label>
            <p className="small muted">
              {crewCount} personal names have a single locator to the crew lists reproduced on pp. 244–46, 252–53 and 281–82, with no discussion in the text. These are passing mentions.
            </p>
          </div>
          <p className="small muted">Merging name forms and fixing cross-references also save a few lines each; those are recorded in the ledger as you make them.</p>

          <h3>Splitting long strings costs lines</h3>
          <div className="splitcost">
            <div>
              <div className="stat-label">All {openSplits.length} open, as suggested</div>
              <div className="mid">
                <Delta n={allSplitCost} />
              </div>
              <div className="small muted">would take the index to {fmtPages(projectedLines + allSplitCost)} pp</div>
            </div>
            <div>
              <div className="stat-label">Affordable now</div>
              <div className="mid">{spare > 0 ? `${fit} split${fit === 1 ? '' : 's'}` : 'none'}</div>
              <div className="small muted">{spare > 0 ? `best value first, using ${acc} of ${spare} spare lines` : 'recover space first'}</div>
            </div>
          </div>
          <table className="mini">
            <thead>
              <tr>
                <th>Best value per line (locators broken up ÷ lines added)</th>
                <th className="num">Locs</th>
                <th className="num">Cost</th>
              </tr>
            </thead>
            <tbody>
              {openSplits.slice(0, 12).map((r, i) => (
                <tr key={r.e.id} className={i < fit ? 'fits' : ''} onClick={() => dispatch({ type: 'go', view: 'strings', patch: { stringId: r.e.id } })}>
                  <td>
                    <Heading e={r.e} className="serif" />
                  </td>
                  <td className="num">{r.e.direct.length}</td>
                  <td className="num">+{r.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3>Ledger</h3>
          {working.ledger.length === 0 && <p className="muted small">No changes yet. Splits, merges, cross-reference fixes and the options on the left will be listed here with their line cost.</p>}
          <ul className="ledger">
            {decisionsLedger.map((l) => (
              <li key={l.key}>
                <div>
                  <div className="ledger-l">{l.label}</div>
                  <div className="small muted">{l.detail}</div>
                </div>
                <Delta n={l.delta} />
                <button className="link" onClick={() => dispatch({ type: 'undo', key: l.key })}>
                  Undo
                </button>
              </li>
            ))}
            {working.ledger
              .filter((l) => l.lever)
              .map((l) => (
                <li key={l.key} className="lever-row">
                  <div>
                    <div className="ledger-l">{l.label}</div>
                    <div className="small muted">{l.detail}</div>
                  </div>
                  <Delta n={l.delta} />
                  <button className="link" onClick={() => dispatch({ type: 'lever', lever: l.lever!, on: false })}>
                    Undo
                  </button>
                </li>
              ))}
          </ul>
          {working.ledger.length > 0 && (
            <div className="ledger-total">
              <span>Net change</span>
              <Delta n={working.delta} />
              <span className="muted">= {fmtPages(projectedLines)} pp</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
