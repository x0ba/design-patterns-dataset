import { useEffect, useRef, useState } from 'react';
import { charFull } from '../data';
import { fmtDate, fmtDay, fmtMonthLong, fmtTime, forLabel } from '../format';
import { go, href } from '../router';
import { sceneSetting, StoryArt } from '../art';
import { useStore } from '../store';
import type { Story, Version } from '../types';
import { IconBook, IconBox, IconCheck, IconChevronL, IconChevronR, IconClose, IconCompare, IconEar, IconHeart, IconImage, IconPencil, IconRegen } from '../icons';

export function VersionCard({ story, v, index, total, mostRead, onPrint, compact }: { story: Story; v: Version; index: number; total: number; mostRead: boolean; onPrint?: () => void; compact?: boolean }) {
  return (
    <div className={'vcard' + (mostRead ? ' hot' : '') + (compact ? ' compact' : '')}>
      <div className="vhead">
        <span className="vnum">{total > 1 ? `Ending ${index + 1}` : 'Ending'}</span>
        <strong>{v.label}</strong>
        {v.kind !== 'original' && <span className="vwhen"><IconRegen size={13} /> {fmtDate(v.createdAt)}</span>}
        <span className="spacer" />
        <span className={'vread' + (mostRead ? ' hot' : '')}><IconEar size={14} />{v.readAloud === 0 ? 'Not read yet' : `Read ${v.readAloud}×`}</span>
        {mostRead && <span className="vbadge">Read most</span>}
      </div>
      <p className="vtext">{v.ending}</p>
      {onPrint && (
        <div className="vfoot">
          <button className="btn ghost sm" onClick={onPrint}><IconBox size={15} /> Print this ending</button>
        </div>
      )}
      {story.versions.length < 1 && null}
    </div>
  );
}

export function mostReadId(story: Story): string | null {
  if (story.versions.length < 2) return null;
  const top = story.versions.reduce((a, b) => (b.readAloud > a.readAloud ? b : a));
  return top.readAloud > 0 && story.versions.filter((v) => v.readAloud === top.readAloud).length === 1 ? top.id : null;
}

function Title({ s }: { s: Story }) {
  const { rename } = useStore();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(s.title);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);
  useEffect(() => setVal(s.title), [s.title]);
  const save = () => { const t = val.trim(); if (t && t !== s.title) rename(s.id, t); else setVal(s.title); setEditing(false); };
  if (editing) {
    return (
      <form className="title-edit" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <input ref={ref} value={val} onChange={(e) => setVal(e.target.value)} aria-label="Story title" onKeyDown={(e) => { if (e.key === 'Escape') { setVal(s.title); setEditing(false); } }} maxLength={70} />
        <button className="btn sm" type="submit"><IconCheck size={15} /> Save</button>
        <button className="btn ghost sm" type="button" onClick={() => { setVal(s.title); setEditing(false); }}>Cancel</button>
      </form>
    );
  }
  return (
    <h1 className="dtitle">
      {s.title}
      <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Rename story" title="Give it a better name"><IconPencil size={17} /></button>
    </h1>
  );
}

export function StoryDetail({ id }: { id: string }) {
  const { byId, results, orders, compare, toggleCompare } = useStore();
  const s = byId(id);
  const [ill, setIll] = useState(0);
  if (!s) return <div className="page narrow"><h1>That story isn’t in the archive.</h1><a className="btn" href={href('')}>Back to the archive</a></div>;

  const pos = results.findIndex((r) => r.id === id);
  const prev = pos > 0 ? results[pos - 1] : null;
  const next = pos >= 0 && pos < results.length - 1 ? results[pos + 1] : null;
  const topId = mostReadId(s);
  const printed = orders.filter((o) => o.storyId === s.id);
  const inCompare = compare.includes(s.id);
  const print = (v?: string) => go(`print/${s.id}${v ? `?v=${v}` : ''}`);

  return (
    <div className="page detail">
      <nav className="crumbs" aria-label="Story navigation">
        <a href={href('')} className="back"><IconChevronL size={16} /> Back to results{results.length ? ` (${results.length})` : ''}</a>
        {pos >= 0 && (
          <div className="stepper">
            <button className="icon-btn" disabled={!prev} onClick={() => prev && go(`story/${prev.id}`)} aria-label="Previous result"><IconChevronL size={18} /></button>
            <span>{pos + 1} of {results.length}</span>
            <button className="icon-btn" disabled={!next} onClick={() => next && go(`story/${next.id}`)} aria-label="Next result"><IconChevronR size={18} /></button>
          </div>
        )}
      </nav>

      <div className="dgrid">
        <aside className="dleft">
          <div className="hero">
            <StoryArt story={s} index={ill} />
            {s.illustrations > 0 && <span className="cap"><IconImage size={14} /> Illustration {ill + 1} of {s.illustrations} · {sceneSetting(s, ill)}</span>}
            {s.illustrations === 0 && <span className="cap">No illustrations in this story</span>}
          </div>
          {s.illustrations > 1 && (
            <div className="strip" role="tablist" aria-label="Illustrations">
              {Array.from({ length: s.illustrations }, (_, i) => (
                <button key={i} role="tab" aria-selected={i === ill} className={i === ill ? 'on' : ''} onClick={() => setIll(i)} aria-label={`Illustration ${i + 1}`}><StoryArt story={s} index={i} /></button>
              ))}
            </div>
          )}

          <dl className="facts">
            <div><dt><IconBook size={15} /> Length</dt><dd>{s.wordCount.toLocaleString()} words</dd></div>
            <div><dt>Reading age</dt><dd>{s.readingAge}</dd></div>
            <div><dt><IconImage size={15} /> Illustrations</dt><dd>{s.illustrations === 0 ? 'None' : s.illustrations}</dd></div>
            <div><dt><IconEar size={15} /> Read aloud</dt><dd>{s.readAloud === 0 ? 'Not yet' : `${s.readAloud} ${s.readAloud === 1 ? 'time' : 'times'}`}</dd></div>
          </dl>

          <div className="dactions">
            <button className="btn primary block" onClick={() => print()}><IconBox size={18} /> Order a printed copy</button>
            <button className={'btn ghost block' + (inCompare ? ' on' : '')} onClick={() => toggleCompare(s.id)} disabled={!inCompare && compare.length >= 3}>
              <IconCompare size={17} /> {inCompare ? 'In comparison — remove' : 'Add to comparison'}
            </button>
            {compare.length >= 2 && <button className="link center" onClick={() => go(`compare/${compare.join(',')}`)}>Open comparison ({compare.length})</button>}
          </div>
        </aside>

        <section className="dright">
          <div className="dmeta">
            <span className="for">Made for {forLabel(s.for)}</span><span className="dot" />
            <span>by {s.by}</span><span className="dot" />
            <span>{fmtDay(s.createdAt)} at {fmtTime(s.createdAt)}</span>
          </div>
          <Title s={s} />
          {s.favoriteBy && <div className="favline"><IconHeart size={15} /> {s.favoriteBy} marked this a favorite</div>}
          {printed.length > 0 && (
            <div className="notice ok"><IconBox size={16} /> You’ve printed this story before — {printed.map((o) => fmtMonthLong(o.orderedAt.slice(0, 7))).join(', ')}. <a href={href('orders')}>See printed books</a></div>
          )}

          <div className="tagsrow">
            {s.characters.map((c) => <span key={c} className="tag char">{charFull(c)}</span>)}
            {s.settings.map((c) => <span key={c} className="tag">{c}</span>)}
          </div>

          <h2 className="sub">What you asked for</h2>
          <blockquote className="prompt-q">{s.prompt}</blockquote>

          <h2 className="sub">How it begins</h2>
          <p className="opening">{s.opening}</p>
          <div className="gap"><span>The story continues for about {s.wordCount.toLocaleString()} words</span></div>

          <h2 className="sub">
            {s.versions.length > 1 ? `How it ends — ${s.versions.length} versions saved` : 'How it ends'}
          </h2>
          {s.versions.length > 1 && <p className="subnote">Counts show how often each one was read aloud, so you can tell which one actually gets requested.</p>}
          <div className="vlist">
            {s.versions.map((v, i) => (
              <VersionCard key={v.id} story={s} v={v} index={i} total={s.versions.length} mostRead={v.id === topId} onPrint={() => print(v.id)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
