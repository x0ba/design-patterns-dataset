import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store.tsx';
import { BookStrip, Delta, GROUP_COLORS, Heading, TypeTag, Typeset } from '../components/bits.tsx';
import { allLocs, locCount } from '../lib/locators.ts';
import { entryLines } from '../lib/lines.ts';
import { mergeEntries } from '../lib/apply.ts';
import type { NameCluster } from '../lib/names.ts';
import type { Entry } from '../data/types.ts';

const NOTES: Record<string, string> = {
  'Rotch, William': 'The unsuffixed form may be either father or son. Check each page before merging.',
  'Cuffe, Paul': 'Both spellings appear in period sources; the subject signed himself “Cuffe”.',
  'Fayal (Azores)': '“Fayal” is the period spelling, “Faial” the modern one. Pick one and add a See reference from the other.',
  'Talcahuano': '“Talcahuana” is not a recognised variant, so this is probably a keying error.',
};

export function NamesView() {
  const { an, s, dispatch, decided } = useStore();
  const sel = an.clusters.find((c) => c.id === s.ui.clusterId) ?? an.clusters[0];
  const open = an.clusters.filter((c) => !decided(`name:${c.id}`)).length;
  return (
    <div className="view split2">
      <aside className="listpane">
        <div className="listpane-head">
          <h1>Name forms</h1>
          <p className="lede small">
            {an.clusters.length} groups of headings that look like the same person, place, or ship entered two ways. {open} still open.
          </p>
        </div>
        <div className="listpane-body">
          {an.clusters.map((c) => {
            const d = decided(`name:${c.id}`);
            const members = c.members.map((m) => an.byId.get(m)!).sort((a, b) => locCount(b) - locCount(a));
            return (
              <button key={c.id} className={`lrow nrow ${sel.id === c.id ? 'on' : ''}`} onClick={() => dispatch({ type: 'ui', patch: { clusterId: c.id } })}>
                <span className="nrow-main">
                  {members.map((m, i) => (
                    <span key={m.id} className="serif">
                      {i > 0 && <span className="muted"> · </span>}
                      <Heading e={m} />
                    </span>
                  ))}
                </span>
                <span className="nrow-meta">
                  <span className="small muted">{[...new Set(c.links.map((l) => l.reason))].join('; ')}</span>
                  {d && <span className={`xstatus done`}>{d.kind === 'merge' ? 'merged' : 'kept apart'}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </aside>
      <ClusterDetail key={sel.id} c={sel} />
    </div>
  );
}

function ClusterDetail({ c }: { c: NameCluster }) {
  const { an, dispatch, decided } = useStore();
  const members = useMemo(() => c.members.map((m) => an.byId.get(m)!).sort((a, b) => locCount(b) - locCount(a)), [c, an]);
  const d = decided(`name:${c.id}`);
  const directLinked = (a: number, b: number) => c.links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
  const [keepId, setKeepId] = useState(d?.kind === 'merge' ? d.keepId : members[0].id);
  const [mergeIds, setMergeIds] = useState<number[]>(
    d?.kind === 'merge' ? d.mergeIds : members.filter((m) => m.id !== members[0].id && directLinked(m.id, members[0].id) && !/Rotch, William$/.test(m.heading)).map((m) => m.id),
  );
  const [leaveSee, setLeaveSee] = useState(d?.kind === 'merge' ? d.leaveSee : members.some((m) => /Fayal|Faial|Cuff/.test(m.heading)));
  useEffect(() => {
    setMergeIds((ids) => ids.filter((i) => i !== keepId));
  }, [keepId]);

  const keep = members.find((m) => m.id === keepId)!;
  const others = members.filter((m) => mergeIds.includes(m.id));
  const delta = useMemo(() => {
    if (!others.length) return 0;
    const merged = mergeEntries(keep, others);
    let after = entryLines(merged);
    if (leaveSee) for (const o of others) after += entryLines({ ...o, direct: [], subs: [], seeAlso: [], see: [keep.heading] });
    const before = entryLines(keep) + others.reduce((a, o) => a + entryLines(o), 0);
    return after - before;
  }, [keep, others, leaveSee]);
  const merged = others.length ? mergeEntries(keep, others) : null;

  // pages cited under more than one form
  const pageSets = members.map((m) => new Set(allLocs(m).filter((l) => l.n == null).flatMap((l) => Array.from({ length: (l.e ?? l.p) - l.p + 1 }, (_, i) => l.p + i))));
  const shared: number[] = [];
  for (const p of pageSets[0]) if (pageSets.slice(1).some((s) => s.has(p))) shared.push(p);
  shared.sort((a, b) => a - b);
  const note = members.map((m) => NOTES[m.heading]).find(Boolean);

  const apply = () =>
    dispatch({ type: 'decide', decision: { kind: 'merge', key: `name:${c.id}`, clusterId: c.id, keepId, mergeIds, leaveSee }, toast: `Merged into “${keep.heading}”` });
  const dismiss = () => dispatch({ type: 'decide', decision: { kind: 'dismissName', key: `name:${c.id}`, clusterId: c.id }, toast: 'Kept as separate headings' });

  return (
    <section className="detail">
      <div className="eyebrow">
        <TypeTag type={members[0].type} /> {[...new Set(c.links.map((l) => l.reason))].join('; ')}
      </div>
      <h2 className="serif">
        {members.map((m, i) => (
          <span key={m.id}>
            {i > 0 && <span className="muted"> / </span>}
            <Heading e={m} />
          </span>
        ))}
      </h2>
      {note && <p className="note">{note}</p>}
      {d && (
        <div className="banner ok">
          {d.kind === 'merge' ? `Merged into “${an.byId.get(d.keepId)?.heading}”` : 'Kept as separate headings'}
          <button className="link" onClick={() => dispatch({ type: 'undo', key: `name:${c.id}` })}>
            Undo
          </button>
        </div>
      )}

      <div className="strip-block">
        <BookStrip marks={members.flatMap((m, i) => allLocs(m).map((l) => ({ loc: l, color: GROUP_COLORS[i] })))} height={28} />
        <div className="strip-cap small">
          {members.map((m, i) => (
            <span key={m.id} className="legend-i">
              <span className="sw" style={{ background: GROUP_COLORS[i] }} /> {m.heading}
            </span>
          ))}
          {shared.length > 0 ? (
            <span className="warn"> · same page cited under both forms: pp. {shared.slice(0, 8).join(', ')}{shared.length > 8 ? '…' : ''}</span>
          ) : (
            <span className="muted"> · no page cited under more than one form</span>
          )}
        </div>
      </div>

      <table className="mtable">
        <thead>
          <tr>
            <th>Keep as heading</th>
            <th>Form</th>
            <th className="num">Locators</th>
            <th className="num">Subentries</th>
            <th className="num">Lines</th>
            <th>Merge in</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className={m.id === keepId ? 'sel' : ''}>
              <td>
                <input type="radio" name={`keep-${c.id}`} checked={m.id === keepId} onChange={() => setKeepId(m.id)} aria-label={`Keep ${m.heading}`} />
              </td>
              <td className="serif">
                <Heading e={m} />
              </td>
              <td className="num">{locCount(m)}</td>
              <td className="num">{m.subs.length}</td>
              <td className="num">{entryLines(m)}</td>
              <td>
                {m.id !== keepId && (
                  <input
                    type="checkbox"
                    checked={mergeIds.includes(m.id)}
                    onChange={(e) => setMergeIds(e.target.checked ? [...mergeIds, m.id] : mergeIds.filter((x) => x !== m.id))}
                    aria-label={`Merge ${m.heading}`}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <label className="check">
        <input type="checkbox" checked={leaveSee} onChange={(e) => setLeaveSee(e.target.checked)} />
        <span>
          Leave a <i>See</i> reference from the merged form{others.length > 1 ? 's' : ''}
        </span>
      </label>

      <div className="twocol">
        <div>
          <div className="preview-h">
            <span>As set now</span>
          </div>
          {members.map((m) => (
            <Typeset key={m.id} e={m} dim />
          ))}
        </div>
        <div>
          <div className="preview-h">
            <span>After merge</span>
            <Delta n={delta} />
          </div>
          {merged ? (
            <>
              <Typeset e={merged} />
              {leaveSee && others.map((o) => <Typeset key={o.id} e={{ ...o, direct: [], subs: [], seeAlso: [], see: [keep.heading] } as Entry} />)}
              {members
                .filter((m) => m.id !== keepId && !mergeIds.includes(m.id))
                .map((m) => (
                  <Typeset key={m.id} e={m} dim />
                ))}
            </>
          ) : (
            <p className="muted small">Tick at least one form to merge.</p>
          )}
        </div>
      </div>

      <div className="row gap top">
        <button className="btn primary" disabled={!others.length} onClick={apply}>
          {d?.kind === 'merge' ? 'Update merge' : 'Merge'}
        </button>
        <button className="btn" onClick={dismiss} disabled={d?.kind === 'dismissName'}>
          Different — keep separate
        </button>
      </div>
    </section>
  );
}
