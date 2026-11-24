import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { charFull } from '../data';
import { fmtDay, fmtTime, forLabel } from '../format';
import { go, href } from '../router';
import { StoryArt } from '../art';
import { useStore } from '../store';
import type { Story } from '../types';
import { IconBox, IconChevronL, IconClose, IconHeart } from '../icons';
import { VersionCard, mostReadId } from './StoryDetail';

interface Row { key: string; label: string; facts?: boolean; value: (s: Story) => string; render?: (s: Story) => ReactNode }

const ROWS: Row[] = [
  { key: 'for', label: 'Made for', facts: true, value: (s) => forLabel(s.for) },
  { key: 'by', label: 'Made by', facts: true, value: (s) => s.by },
  { key: 'when', label: 'When', facts: true, value: (s) => s.createdAt, render: (s) => <>{fmtDay(s.createdAt)}<small>{fmtTime(s.createdAt)}</small></> },
  { key: 'read', label: 'Read aloud', facts: true, value: (s) => String(s.readAloud), render: (s) => <>{s.readAloud === 0 ? 'Not yet' : `${s.readAloud} times`}</> },
  { key: 'fav', label: 'Favorite', facts: true, value: (s) => s.favoriteBy ?? '', render: (s) => (s.favoriteBy ? <span className="favline inline"><IconHeart size={14} /> {s.favoriteBy}’s favorite</span> : <span className="dim">—</span>) },
  { key: 'age', label: 'Reading age', facts: true, value: (s) => String(s.readingAge) },
  { key: 'words', label: 'Length', facts: true, value: (s) => String(s.wordCount), render: (s) => <>{s.wordCount.toLocaleString()} words</> },
  { key: 'ill', label: 'Illustrations', facts: true, value: (s) => String(s.illustrations), render: (s) => <>{s.illustrations === 0 ? 'None' : s.illustrations}</> },
  { key: 'prompt', label: 'Original prompt', value: (s) => s.prompt, render: (s) => <blockquote className="prompt-q sm">{s.prompt}</blockquote> },
];
const ROWS_AFTER: Row[] = [
  { key: 'opening', label: 'How it begins', value: (s) => s.opening, render: (s) => <p className="opening sm">{s.opening}</p> },
  { key: 'chars', label: 'Characters', facts: true, value: (s) => s.characters.join(), render: (s) => (s.characters.length ? <div className="tagsrow">{s.characters.map((c) => <span key={c} className="tag char">{charFull(c)}</span>)}</div> : <span className="dim">No recurring characters</span>) },
  { key: 'settings', label: 'Settings', facts: true, value: (s) => [...s.settings].sort().join(), render: (s) => <div className="tagsrow">{s.settings.map((c) => <span key={c} className="tag">{c}</span>)}</div> },
];

export function Compare({ ids }: { ids: string[] }) {
  const { byId, setCompare, compare } = useStore();
  const [onlyDiff, setOnlyDiff] = useState(false);
  const stories = ids.map((i) => byId(i)).filter(Boolean) as Story[];
  // keep the compare tray in sync with the URL
  useEffect(() => { if (ids.join() !== compare.join()) setCompare(stories.map((s) => s.id)); }, [ids.join()]); // eslint-disable-line

  const n = stories.length;
  const ALL = [...ROWS, ...ROWS_AFTER];
  const diffs = useMemo(() => Object.fromEntries(ALL.map((r) => [r.key, new Set(stories.map(r.value)).size > 1])), [stories]);
  // a cell is highlighted when it isn't what most of the columns have (or when every column is different)
  const odd = (r: Row, s: Story) => {
    if (!diffs[r.key]) return false;
    const vals = stories.map(r.value); const f = (v: string) => vals.filter((x) => x === v).length;
    return f(r.value(s)) < Math.max(...vals.map(f)) || vals.every((v) => f(v) === 1);
  };
  const remove = (id: string) => {
    const rest = stories.filter((s) => s.id !== id).map((s) => s.id);
    if (rest.length >= 2) go(`compare/${rest.join(',')}`); else go('');
  };

  if (n < 2) {
    return (
      <div className="page narrow"><h1>Pick at least two stories to compare</h1><p>Use the Compare button on any story in the archive.</p><a className="btn" href={href('')}>Back to the archive</a></div>
    );
  }
  const cols = `176px repeat(${n}, minmax(0, 1fr))`;
  const diffCount = ALL.filter((r) => r.facts && diffs[r.key]).length;
  const maxEndings = Math.max(...stories.map((s) => s.versions.length));

  return (
    <div className="page compare">
      <nav className="crumbs"><a href={href('')} className="back"><IconChevronL size={16} /> Back to the archive</a></nav>
      <div className="cmp-title">
        <h1>Comparing {n} stories</h1>
        <label className="switch"><input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} /><span className="track"><i /></span>Only show what’s different <small>({diffCount} of {ALL.filter((r) => r.facts).length} details differ)</small></label>
      </div>

      <div className="cgrid" style={{ gridTemplateColumns: cols }}>
        {/* sticky header */}
        <div className="chead lab" />
        {stories.map((s) => (
          <div key={s.id} className="chead">
            <span className="ch-th"><StoryArt story={s} /></span>
            <span className="ch-t"><a href={href(`story/${s.id}`)}>{s.title}</a><small>{fmtDay(s.createdAt)}</small></span>
            <button className="icon-btn" onClick={() => remove(s.id)} aria-label={`Remove ${s.title} from comparison`}><IconClose size={16} /></button>
          </div>
        ))}

        <div className="clab">Illustration</div>
        {stories.map((s) => <div key={s.id} className="ccell"><div className="cart"><StoryArt story={s} /></div></div>)}

        {ROWS.filter((r) => !(onlyDiff && r.facts && !diffs[r.key])).map((r) => (
          <FragmentRow key={r.key} label={r.label} diff={!!r.facts && diffs[r.key]} compact={!!r.facts}>
            {stories.map((s) => <div key={s.id} className={'ccell' + (r.facts ? ' f' : '') + (r.facts && odd(r, s) ? ' diff' : '')}>{r.render ? r.render(s) : r.value(s)}</div>)}
          </FragmentRow>
        ))}

        <div className="clab tall">How it ends<small>{maxEndings > 1 ? 'Read-aloud counts per ending' : ''}</small></div>
        {stories.map((s) => (
          <div key={s.id} className="ccell ends">
            {s.versions.map((v, i) => (
              <VersionCard key={v.id} story={s} v={v} index={i} total={s.versions.length} mostRead={v.id === mostReadId(s)} compact onPrint={() => go(`print/${s.id}?v=${v.id}`)} />
            ))}
          </div>
        ))}

        {ROWS_AFTER.filter((r) => !(onlyDiff && r.facts && !diffs[r.key])).map((r) => (
          <FragmentRow key={r.key} label={r.label} diff={!!r.facts && diffs[r.key]} compact={!!r.facts}>
            {stories.map((s) => <div key={s.id} className={'ccell' + (r.facts && odd(r, s) ? ' diff' : '')}>{r.render ? r.render(s) : r.value(s)}</div>)}
          </FragmentRow>
        ))}

        <div className="clab" />
        {stories.map((s) => (
          <div key={s.id} className="ccell foot">
            <a className="btn ghost sm" href={href(`story/${s.id}`)}>Open story</a>
            <a className="btn sm" href={href(`print/${s.id}`)}><IconBox size={15} /> Order printed copy</a>
          </div>
        ))}
      </div>
    </div>
  );
}

function FragmentRow({ label, diff, compact, children }: { label: string; diff: boolean; compact?: boolean; children: ReactNode }) {
  return (
    <>
      <div className={'clab' + (diff ? ' diff' : '') + (compact ? ' f' : '')}>{label}{diff && <span className="difftag">differs</span>}</div>
      {children}
    </>
  );
}
