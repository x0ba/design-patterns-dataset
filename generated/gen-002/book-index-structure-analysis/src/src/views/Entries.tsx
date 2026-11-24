import { useMemo } from 'react';
import { useStore } from '../store.tsx';
import { BookStrip, Heading, Seg, SpreadCells, TypeTag, Typeset, fmt } from '../components/bits.tsx';
import { allLocs, locCount } from '../lib/locators.ts';
import { entryLines } from '../lib/lines.ts';
import type { Entry } from '../data/types.ts';

const LIMIT = 250;

export function EntriesView() {
  const { base, s, dispatch, working } = useStore();
  const q = s.ui.entryQuery.trim().toLowerCase();
  const rows = useMemo(() => {
    let l = base;
    if (s.ui.entryType !== 'all') l = l.filter((e) => e.type === s.ui.entryType);
    if (q) l = l.filter((e) => e.heading.toLowerCase().includes(q) || e.subs.some((x) => x.heading.toLowerCase().includes(q)));
    return l;
  }, [base, q, s.ui.entryType]);
  const sel = base.find((e) => e.id === s.ui.entryId) ?? rows[0];
  const current = sel ? working.entries.get(sel.id) : undefined;

  return (
    <div className="view split2">
      <aside className="listpane wide">
        <div className="listpane-head">
          <h1>All entries</h1>
          <div className="row gap">
            <input className="search grow" placeholder="Search headings and subheadings…" value={s.ui.entryQuery} onChange={(e) => dispatch({ type: 'ui', patch: { entryQuery: e.target.value } })} autoFocus />
          </div>
          <div className="row gap">
            <Seg
              value={s.ui.entryType}
              onChange={(v) => dispatch({ type: 'ui', patch: { entryType: v } })}
              options={[
                ['all', 'All'],
                ['person', 'People'],
                ['place', 'Places'],
                ['ship', 'Ships'],
                ['concept', 'Concepts'],
              ]}
            />
            <span className="small muted">{fmt(rows.length)} match{rows.length === 1 ? '' : 'es'}</span>
          </div>
        </div>
        <div className="listpane-cols ecols">
          <span>Heading</span>
          <span>Spread</span>
          <span className="num">Locs</span>
          <span className="num">Subs</span>
        </div>
        <div className="listpane-body">
          {rows.slice(0, LIMIT).map((e) => (
            <button key={e.id} className={`lrow erow ${sel?.id === e.id ? 'on' : ''}`} onClick={() => dispatch({ type: 'ui', patch: { entryId: e.id } })}>
              <span className="serif ell">
                <Heading e={e} />
                {e.see.length > 0 && e.direct.length === 0 && <span className="muted"> → {e.see.join('; ')}</span>}
              </span>
              <SpreadCells locs={allLocs(e)} small />
              <span className={`num ${e.direct.length > 7 ? 'warn strong' : ''}`}>{locCount(e) || '—'}</span>
              <span className="num muted">{e.subs.length || ''}</span>
            </button>
          ))}
          {rows.length > LIMIT && <p className="muted small pad">Showing the first {LIMIT}. Narrow the search to see more.</p>}
        </div>
      </aside>
      <section className="detail">{sel ? <EntryDetail e={sel} current={current} /> : <p className="muted pad">No entries match.</p>}</section>
    </div>
  );
}

function EntryDetail({ e, current }: { e: Entry; current?: Entry }) {
  const { dispatch } = useStore();
  const changed = current && current !== e;
  return (
    <div>
      <div className="eyebrow">
        <TypeTag type={e.type} /> {locCount(e)} locators · {e.subs.length} subentries · {e.direct.length} undifferentiated · {entryLines(e)} line{entryLines(e) === 1 ? '' : 's'}
      </div>
      <h2 className="serif">
        <Heading e={e} />
      </h2>
      {e.crew && <p className="note">Named only in a printed crew list.</p>}
      {e.direct.length > 7 && (
        <p className="warn-text">
          {e.direct.length} undifferentiated locators.{' '}
          <button className="link" onClick={() => dispatch({ type: 'go', view: 'strings', patch: { stringId: e.id, stringFilter: 'all' } })}>
            Open in split planner
          </button>
        </p>
      )}
      {allLocs(e).length > 0 && (
        <div className="strip-block">
          <BookStrip marks={allLocs(e).map((l) => ({ loc: l }))} />
        </div>
      )}
      <div className="twocol">
        <div>
          <div className="preview-h">Draft</div>
          <Typeset e={e} />
        </div>
        <div>
          <div className="preview-h">With your changes</div>
          {current ? changed ? <Typeset e={current} /> : <p className="muted small">No changes to this entry.</p> : <p className="warn-text small">Removed by a change in the ledger.</p>}
        </div>
      </div>
    </div>
  );
}
