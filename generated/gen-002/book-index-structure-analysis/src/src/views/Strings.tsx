import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store.tsx';
import type { Entry } from '../data/types.ts';
import { BookStrip, Delta, GROUP_COLORS, Heading, Seg, SpreadCells, TypeTag, Typeset, fmt } from '../components/bits.tsx';
import { suggestSplit, locMap, type SplitPlan, chapterForLoc } from '../lib/analysis.ts';
import { applySplit } from '../lib/apply.ts';
import { entryLines } from '../lib/lines.ts';
import { formatLoc } from '../lib/locators.ts';

function planFor(e: Entry, drafts: Record<number, SplitPlan>, applied?: SplitPlan): SplitPlan {
  return drafts[e.id] ?? applied ?? suggestSplit(e);
}

function samePlan(a: SplitPlan, b: SplitPlan) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function StringsView() {
  const { an, s, dispatch, decided } = useStore();
  const costs = useMemo(() => {
    const m = new Map<number, number>();
    for (const e of an.long) m.set(e.id, entryLines(applySplit(e, suggestSplit(e))) - entryLines(e));
    return m;
  }, [an]);
  const status = (e: Entry) => (decided(`split:${e.id}`) ? 'split' : decided(`keep:${e.id}`) ? 'kept' : 'open');
  const list = useMemo(() => {
    let l = [...an.long];
    if (s.ui.stringFilter === 'open') l = l.filter((e) => status(e) === 'open');
    if (s.ui.stringFilter === 'done') l = l.filter((e) => status(e) !== 'open');
    if (s.ui.stringSort === 'cost') l.sort((a, b) => costs.get(a.id)! - costs.get(b.id)! || b.direct.length - a.direct.length);
    else if (s.ui.stringSort === 'alpha') l.sort((a, b) => a.heading.localeCompare(b.heading));
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [an, s.ui.stringFilter, s.ui.stringSort, s.decisions, costs]);

  const selected = an.long.find((e) => e.id === s.ui.stringId) ?? an.byId.get(s.ui.stringId ?? -1) ?? an.long[0];
  const doneCount = an.long.filter((e) => status(e) !== 'open').length;

  return (
    <div className="view split2">
      <aside className="listpane">
        <div className="listpane-head">
          <h1>Long locator strings</h1>
          <p className="lede small">
            {an.long.length} headings carry more than 7 undifferentiated locators. {doneCount > 0 && <>{doneCount} reviewed.</>}
          </p>
          <div className="row gap">
            <Seg
              value={s.ui.stringFilter}
              onChange={(v) => dispatch({ type: 'ui', patch: { stringFilter: v } })}
              options={[
                ['open', `Open (${an.long.length - doneCount})`],
                ['done', `Reviewed (${doneCount})`],
                ['all', 'All'],
              ]}
            />
            <select className="select" value={s.ui.stringSort} onChange={(e) => dispatch({ type: 'ui', patch: { stringSort: e.target.value as 'count' } })}>
              <option value="count">Most locators</option>
              <option value="cost">Cheapest split</option>
              <option value="alpha">A–Z</option>
            </select>
          </div>
        </div>
        <div className="listpane-cols">
          <span>Heading</span>
          <span>Spread, Ch. 1–14</span>
          <span className="num">Locs</span>
          <span className="num">Split</span>
        </div>
        <div className="listpane-body">
          {list.length === 0 && <p className="muted pad">Nothing here.</p>}
          {list.map((e) => {
            const st = status(e);
            return (
              <button key={e.id} className={`lrow ${selected.id === e.id ? 'on' : ''} st-${st}`} onClick={() => dispatch({ type: 'ui', patch: { stringId: e.id } })}>
                <span className="lrow-h">
                  {st !== 'open' && <span className={`dot ${st}`} title={st === 'split' ? 'Split applied' : 'Kept as is'} />}
                  <Heading e={e} className="serif" />
                </span>
                <SpreadCells locs={e.direct} small />
                <span className="num strong">{e.direct.length}</span>
                <span className="num muted">+{costs.get(e.id)}</span>
              </button>
            );
          })}
        </div>
      </aside>
      <SplitPlanner key={selected.id} e={selected} />
    </div>
  );
}

function SplitPlanner({ e }: { e: Entry }) {
  const { s, dispatch, decided, projectedLines, limitLines } = useStore();
  const applied = decided(`split:${e.id}`);
  const kept = decided(`keep:${e.id}`);
  const appliedPlan = applied?.kind === 'split' ? applied.plan : undefined;
  const plan = planFor(e, s.drafts, appliedPlan);
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => setSel(new Set()), [e.id]);
  const lm = useMemo(() => locMap(e), [e]);
  const setPlan = (p: SplitPlan) => dispatch({ type: 'draft', entryId: e.id, plan: p });

  const after = useMemo(() => applySplit(e, plan), [e, plan]);
  const beforeLines = entryLines(e);
  const afterLines = entryLines(after);
  const cost = afterLines - beforeLines;
  const newSubs = new Set(plan.groups.filter((g) => g.locs.length).map((g) => g.heading.trim()));
  const dirty = appliedPlan ? !samePlan(plan, appliedPlan) : true;
  const emptyHeadings = plan.groups.some((g) => g.locs.length && !g.heading.trim());

  const colorOf = new Map<string, string>();
  plan.groups.forEach((g, i) => g.locs.forEach((k) => colorOf.set(k, GROUP_COLORS[i % GROUP_COLORS.length])));

  const toggle = (k: string) => {
    const n = new Set(sel);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    setSel(n);
  };
  const strip = (p: SplitPlan): SplitPlan => ({
    groups: p.groups.map((g) => ({ ...g, locs: g.locs.filter((k) => !sel.has(k)) })),
    general: p.general.filter((k) => !sel.has(k)),
  });
  const ordered = (keys: string[]) => [...keys].sort((a, b) => lm.get(a)!.p - lm.get(b)!.p || (lm.get(a)!.n ?? 0) - (lm.get(b)!.n ?? 0));
  const moveTo = (target: string) => {
    if (!sel.size) return;
    const p = strip(plan);
    if (target === '__general') p.general = ordered([...p.general, ...sel]);
    else if (target === '__new') p.groups.push({ key: 'g' + Date.now(), heading: '', locs: ordered([...sel]) });
    else p.groups = p.groups.map((g) => (g.key === target ? { ...g, locs: ordered([...g.locs, ...sel]) } : g));
    setPlan(p);
    setSel(new Set());
  };
  const removeGroup = (key: string) => {
    const g = plan.groups.find((x) => x.key === key)!;
    setPlan({ groups: plan.groups.filter((x) => x.key !== key), general: ordered([...plan.general, ...g.locs]) });
  };
  const rename = (key: string, heading: string) => setPlan({ ...plan, groups: plan.groups.map((g) => (g.key === key ? { ...g, heading } : g)) });

  const chip = (k: string) => {
    const l = lm.get(k);
    if (!l) return null;
    const ch = chapterForLoc(l);
    return (
      <button key={k} className={`chip ${sel.has(k) ? 'on' : ''} ${l.n != null ? 'note' : ''}`} onClick={() => toggle(k)} title={`${l.n != null ? 'Note, ' : ''}Ch. ${ch}`} style={{ borderColor: colorOf.get(k) }}>
        {formatLoc(l)}
      </button>
    );
  };

  const apply = () => {
    dispatch({ type: 'decide', decision: { kind: 'split', key: `split:${e.id}`, entryId: e.id, plan }, toast: `Split “${e.heading}” · ${cost >= 0 ? '+' : '−'}${Math.abs(cost)} lines` });
    dispatch({ type: 'undo', key: `keep:${e.id}` });
    dispatch({ type: 'draft', entryId: e.id, plan: null });
  };
  const keep = () => {
    dispatch({ type: 'undo', key: `split:${e.id}` });
    dispatch({ type: 'decide', decision: { kind: 'keep', key: `keep:${e.id}`, entryId: e.id }, toast: `Kept “${e.heading}” as is` });
  };
  const reset = () => {
    dispatch({ type: 'draft', entryId: e.id, plan: suggestSplit(e) });
    setSel(new Set());
  };

  const spare = limitLines - projectedLines;

  return (
    <section className="planner">
      <div className="planner-head">
        <div>
          <div className="eyebrow">
            <TypeTag type={e.type} /> {e.direct.length} undifferentiated locators
            {e.subs.length > 0 && <> · {e.subs.length} existing subentries</>} · {beforeLines} lines as set
          </div>
          <h2 className="serif">
            <Heading e={e} />
          </h2>
        </div>
        {applied && (
          <div className="banner ok">
            Split applied
            <button className="link" onClick={() => dispatch({ type: 'undo', key: `split:${e.id}` })}>
              Undo
            </button>
          </div>
        )}
        {kept && (
          <div className="banner">
            Kept as is
            <button className="link" onClick={() => dispatch({ type: 'undo', key: `keep:${e.id}` })}>
              Undo
            </button>
          </div>
        )}
      </div>

      <div className="strip-block">
        <BookStrip marks={e.direct.map((l) => ({ loc: l, color: colorOf.get(formatKey(l)) ?? '#8a8f98' }))} />
        <div className="strip-cap small muted">Where the locators fall. Colours match the draft subentries below; grey stays on the main heading.</div>
      </div>

      <div className="planner-body">
        <div className="groups">
          <div className={`selbar ${sel.size ? 'show' : ''}`}>
            {sel.size ? (
              <>
                <b>{sel.size} selected</b>
                <span className="muted">move to</span>
                <select className="select" value="" onChange={(ev) => moveTo(ev.target.value)}>
                  <option value="" disabled>
                    choose…
                  </option>
                  {plan.groups.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.heading || '(untitled)'}
                    </option>
                  ))}
                  <option value="__general">Main heading (no subentry)</option>
                </select>
                <button className="btn sm" onClick={() => moveTo('__new')}>
                  New subentry from selection
                </button>
                <button className="link" onClick={() => setSel(new Set())}>
                  Clear
                </button>
              </>
            ) : (
              <span className="muted">Click locators to select them, then move them between subentries.</span>
            )}
          </div>

          <div className="group general">
            <div className="group-head">
              <span className="group-title">Stays on main heading</span>
              <span className={`muted small ${plan.general.length > 7 ? 'warn' : ''}`}>
                {plan.general.length} locator{plan.general.length === 1 ? '' : 's'}
                {plan.general.length > 7 && ' · still a long run'}
              </span>
            </div>
            <div className="chips">{plan.general.length ? plan.general.map(chip) : <span className="muted small">None</span>}</div>
          </div>
          {plan.groups.map((g, i) => (
            <div className="group" key={g.key} style={{ borderLeftColor: GROUP_COLORS[i % GROUP_COLORS.length] }}>
              <div className="group-head">
                <input
                  className={`subin serif ${!g.heading.trim() ? 'empty' : ''}`}
                  value={g.heading}
                  placeholder="Subheading…"
                  onChange={(ev) => rename(g.key, ev.target.value)}
                  autoFocus={!g.heading}
                />
                <span className="muted small">{g.locs.length}</span>
                <button className="icon" title="Dissolve: return locators to main heading" onClick={() => removeGroup(g.key)}>
                  ×
                </button>
              </div>
              <div className="chips">{g.locs.length ? g.locs.map(chip) : <span className="muted small">Empty — will be dropped</span>}</div>
            </div>
          ))}
          <button className="btn ghost sm addgroup" onClick={() => setPlan({ ...plan, groups: [...plan.groups, { key: 'g' + Date.now(), heading: '', locs: [] }] })}>
            + Add subentry
          </button>
        </div>

        <div className="previews">
          <div className="preview">
            <div className="preview-h">
              <span>Draft as it stands</span>
              <span className="muted">{beforeLines} lines</span>
            </div>
            <Typeset e={e} dim />
          </div>
          <div className="preview">
            <div className="preview-h">
              <span>After this split</span>
              <span className="muted">{afterLines} lines</span>
            </div>
            <Typeset e={after} highlightSubs={newSubs} />
          </div>
        </div>
      </div>

      <footer className="planner-foot">
        <div className="cost">
          <Delta n={cost} />
          <span className="muted small">
            {spare >= 0 ? `${fmt(spare)} lines spare under the ${28}-page limit` : `index is ${fmt(-spare)} lines over the limit before this split`}
          </span>
        </div>
        <div className="row gap">
          <button className="btn ghost" onClick={reset}>
            Reset to suggestion
          </button>
          <button className="btn" onClick={keep} disabled={!!kept}>
            Keep undifferentiated
          </button>
          <button className="btn primary" onClick={apply} disabled={(!!applied && !dirty) || emptyHeadings}>
            {applied ? (dirty ? 'Update split' : 'Split applied') : 'Apply split'}
          </button>
        </div>
      </footer>
    </section>
  );
}

function formatKey(l: { p: number; e?: number; n?: number }) {
  return l.n != null ? `${l.p}n${l.n}` : `${l.p}-${l.e ?? l.p}`;
}
