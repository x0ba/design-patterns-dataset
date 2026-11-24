import { useMemo, useState } from 'react';
import { useStore } from '../store.tsx';
import { Delta, Heading, Seg, Typeset, fmt } from '../components/bits.tsx';
import { suggestTargets, type XRef } from '../lib/analysis.ts';
import { entryLines } from '../lib/lines.ts';
import { locCount } from '../lib/locators.ts';
import { mergeEntries } from '../lib/apply.ts';
import type { Entry } from '../data/types.ts';

export function XrefsView() {
  const { an, s, dispatch, decided } = useStore();
  const [q, setQ] = useState('');
  const problems = an.xrefs.filter((x) => x.status !== 'ok');
  const loopRefs = problems.filter((x) => x.status === 'loop');
  const missing = problems.filter((x) => x.status === 'missing');
  const rows = useMemo(() => {
    let l = s.ui.xrefFilter === 'problems' ? [...missing, ...loopRefs.slice(0, 1)] : an.xrefs;
    if (q.trim()) {
      const t = q.toLowerCase();
      l = l.filter((x) => an.byId.get(x.from)!.heading.toLowerCase().includes(t) || x.target.toLowerCase().includes(t));
    }
    return l;
  }, [an, s.ui.xrefFilter, q, missing, loopRefs]);
  const selId = s.ui.xrefId ?? rows[0]?.id ?? null;
  const sel = an.xrefs.find((x) => x.id === selId) ?? null;
  const isDone = (x: XRef) => (x.status === 'loop' ? !!decided('loop') : !!decided(`xref:${x.id}`));
  const openCount = missing.filter((x) => !isDone(x)).length + (decided('loop') ? 0 : 1);

  return (
    <div className="view split2">
      <aside className="listpane wide">
        <div className="listpane-head">
          <h1>Cross-references</h1>
          <p className="lede small">
            {fmt(an.xrefs.length)} references checked: {fmt(an.xrefs.length - problems.length)} resolve, {missing.length} point to headings that don't exist, and 1 See loop (
            {loopRefs.length} references). {openCount === 0 ? 'All problems handled.' : `${openCount} still open.`}
          </p>
          <div className="row gap">
            <Seg
              value={s.ui.xrefFilter}
              onChange={(v) => dispatch({ type: 'ui', patch: { xrefFilter: v, xrefId: null } })}
              options={[
                ['problems', `Problems (${missing.length + 1})`],
                ['all', `All (${an.xrefs.length})`],
              ]}
            />
            <input className="search" placeholder="Filter headings…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="listpane-cols xcols">
          <span>From</span>
          <span />
          <span>To</span>
          <span>Status</span>
        </div>
        <div className="listpane-body">
          {rows.map((x) => {
            const from = an.byId.get(x.from)!;
            const done = isDone(x);
            return (
              <button key={x.id} className={`lrow xrow ${selId === x.id ? 'on' : ''}`} onClick={() => dispatch({ type: 'ui', patch: { xrefId: x.id } })}>
                <span className="serif ell">
                  <Heading e={from} />
                </span>
                <span className="xkind">{x.kind === 'see' ? 'See' : 'See also'}</span>
                <span className="serif ell">{x.status === 'loop' ? 'sperm whaling ⇄ whaling, sperm' : x.target}</span>
                <span className={`xstatus ${done ? 'done' : x.status}`}>{done ? 'fixed' : x.status === 'ok' ? 'ok' : x.status === 'loop' ? 'loop' : 'no target'}</span>
              </button>
            );
          })}
        </div>
      </aside>
      <section className="detail">{sel ? sel.status === 'loop' ? <LoopDetail /> : <XrefDetail x={sel} /> : <p className="muted pad">Select a reference.</p>}</section>
    </div>
  );
}

function XrefDetail({ x }: { x: XRef }) {
  const { an, base, dispatch, decided } = useStore();
  const from = an.byId.get(x.from)!;
  const done = decided(`xref:${x.id}`);
  const sugg = useMemo(() => (x.status === 'missing' ? suggestTargets(x.target, base) : []), [x, base]);
  const target = an.byHeading.get(x.target.split(': ')[0]);
  const kindLabel = x.kind === 'see' ? 'See' : 'See also';
  const removeDelta = (() => {
    const c: Entry = { ...from, see: x.kind === 'see' ? from.see.filter((t) => t !== x.target) : from.see, seeAlso: x.kind === 'seeAlso' ? from.seeAlso.filter((t) => t !== x.target) : from.seeAlso };
    return entryLines(c) - entryLines(from);
  })();

  return (
    <div className="xdetail">
      <div className="eyebrow">{kindLabel} reference</div>
      <h2 className="serif">
        <Heading e={from} />. <i>{kindLabel}</i> {x.target}
      </h2>
      {x.status === 'ok' && target && (
        <>
          <p className="ok-text">Resolves to an existing heading with {locCount(target)} locators.</p>
          <div className="twocol">
            <div>
              <div className="preview-h">Source</div>
              <Typeset e={from} />
            </div>
            <div>
              <div className="preview-h">Target</div>
              <Typeset e={target} />
            </div>
          </div>
        </>
      )}
      {x.status === 'missing' && (
        <>
          <p className="warn-text">
            There is no heading “{x.target}” in the index{x.target.includes(': ') ? ' with that subheading' : ''}. A reader following this reference finds nothing.
          </p>
          {done && done.kind === 'xref' && (
            <div className="banner ok">
              {done.action === 'remove' ? 'Reference removed' : `Now points to “${done.target}”`}
              <button className="link" onClick={() => dispatch({ type: 'undo', key: `xref:${x.id}` })}>
                Undo
              </button>
            </div>
          )}
          <h3>Closest existing headings</h3>
          <div className="sugg">
            {sugg.map(({ entry }) => {
              const chosen = done?.kind === 'xref' && done.target === entry.heading;
              return (
                <div key={entry.id} className={`sugg-row ${chosen ? 'chosen' : ''}`}>
                  <div>
                    <div className="serif">
                      <Heading e={entry} />
                    </div>
                    <div className="small muted">
                      {locCount(entry)} locators{entry.subs.length ? ` · ${entry.subs.length} subentries` : ''}
                    </div>
                  </div>
                  <button
                    className="btn sm"
                    disabled={chosen}
                    onClick={() =>
                      dispatch({ type: 'decide', decision: { kind: 'xref', key: `xref:${x.id}`, refId: x.id, action: 'retarget', target: entry.heading }, toast: `“${from.heading}” now points to “${entry.heading}”` })
                    }
                  >
                    {chosen ? 'Chosen' : 'Point here'}
                  </button>
                </div>
              );
            })}
            {sugg.length === 0 && <p className="muted small">No close matches.</p>}
          </div>
          <div className="row gap top">
            <button
              className="btn"
              disabled={done?.kind === 'xref' && done.action === 'remove'}
              onClick={() => dispatch({ type: 'decide', decision: { kind: 'xref', key: `xref:${x.id}`, refId: x.id, action: 'remove' }, toast: 'Reference removed' })}
            >
              Remove the reference
            </button>
            <Delta n={removeDelta} />
          </div>
          <h3>As set now</h3>
          <Typeset e={from} />
        </>
      )}
    </div>
  );
}

function LoopDetail() {
  const { an, dispatch, decided } = useStore();
  const a = an.byHeading.get('whaling, sperm')!;
  const b = an.byHeading.get('sperm whaling')!;
  const done = decided('loop');
  const opt = (keep: Entry, other: Entry) => {
    const merged = mergeEntries({ ...keep, see: [] }, [other]);
    merged.see = [];
    const seeEntry: Entry = { ...other, direct: [], subs: [], seeAlso: [], see: [keep.heading] };
    return entryLines(merged) + entryLines(seeEntry) - entryLines(keep) - entryLines(other);
  };
  const choose = (keep: Entry, other: Entry) =>
    dispatch({ type: 'decide', decision: { kind: 'loop', key: 'loop', keepHeading: keep.heading, otherHeading: other.heading }, toast: `Locators now under “${keep.heading}”` });
  return (
    <div className="xdetail">
      <div className="eyebrow">See loop</div>
      <h2 className="serif">sperm whaling ⇄ whaling, sperm</h2>
      <div className="loop">
        <div className="loop-node">
          <div className="serif">sperm whaling</div>
          <div className="small muted">{locCount(b)} locators</div>
        </div>
        <div className="loop-arrow">
          <span>
            <i>See</i> →
          </span>
          <span>
            ← <i>See</i>
          </span>
        </div>
        <div className="loop-node warnb">
          <div className="serif">whaling, sperm</div>
          <div className="small muted">{locCount(a)} locators, plus a See</div>
        </div>
      </div>
      <p className="warn-text">
        Each form sends the reader to the other. The {locCount(a)} locators sit under “whaling, sperm”, but that entry also says <i>See</i> sperm whaling, so a reader starting from either form goes round in a circle. One
        form has to hold the locators and the other has to point to it.
      </p>
      {done && done.kind === 'loop' && (
        <div className="banner ok">
          Resolved: locators under “{done.keepHeading}”
          <button className="link" onClick={() => dispatch({ type: 'undo', key: 'loop' })}>
            Undo
          </button>
        </div>
      )}
      <div className="options">
        {[
          [a, b, 'Keeps the inverted form, consistent with other “whaling, …” headings in the index.'],
          [b, a, 'Natural-order form; matches “sperm whales” and how readers usually look it up.'],
        ].map(([keep, other, why]) => {
          const k = keep as Entry;
          const o = other as Entry;
          const chosen = done?.kind === 'loop' && done.keepHeading === k.heading;
          return (
            <div key={k.id} className={`option ${chosen ? 'chosen' : ''}`}>
              <div className="option-h">
                <span>
                  Locators under <b className="serif">{k.heading}</b>
                </span>
                <Delta n={opt(k, o)} />
              </div>
              <p className="small muted">{why as string}</p>
              <p className="small serif">
                {o.heading}. <i>See</i> {k.heading}
              </p>
              <button className="btn sm" disabled={chosen} onClick={() => choose(k, o)}>
                {chosen ? 'Chosen' : 'Use this form'}
              </button>
            </div>
          );
        })}
      </div>
      <h3>As set now</h3>
      <Typeset e={a} />
      <Typeset e={b} />
    </div>
  );
}
