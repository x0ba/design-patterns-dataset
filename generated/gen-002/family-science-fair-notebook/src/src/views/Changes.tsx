import { ReactNode, useState } from 'react';
import { Change, ENV_NOTES, LAST_VISIT, LAST_WEEK, ME, PEOPLE, PersonId, Reading, SUNDAY, container, siteLabel } from '../data';
import { commentsFor, photoTarget, readingTarget, sectionTarget, stepTarget, useStore } from '../store';
import { checkReading, dayHeading, fmtTime, fmtWhen, g, previousReading, r2, signed, wordDiff } from '../util';
import { Avatar, Icon, Who } from '../components/bits';
import PhotoArt from '../components/PhotoArt';

type Range = 'sunday' | 'week';

export default function Changes() {
  const s = useStore();
  const [range, setRange] = useState<Range>('sunday');
  const [who, setWho] = useState<PersonId | 'all'>('all');
  const [group, setGroup] = useState<'time' | 'person'>('time');

  const since = range === 'sunday' ? SUNDAY : LAST_WEEK;
  const inRange = s.history.filter((c) => c.at >= since).sort((a, b) => b.at.getTime() - a.at.getTime());
  const shown = inRange.filter((c) => who === 'all' || c.by === who);
  const authors = Array.from(new Set(inRange.map((c) => c.by)));
  const order: PersonId[] = ['temi', 'funmi', 'marcus', 'albrecht'];
  authors.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const reviewable = inRange.filter((c) => c.by !== ME);
  const done = reviewable.filter((c) => s.reviewed.has(c.id)).length;

  const groups: { key: string; label: ReactNode; items: Change[] }[] = [];
  if (group === 'time') {
    for (const c of shown) {
      const k = c.at.toDateString();
      let gp = groups.find((x) => x.key === k);
      if (!gp) groups.push((gp = { key: k, label: dayHeading(c.at), items: [] }));
      gp.items.push(c);
    }
  } else {
    for (const p of authors) {
      const items = shown.filter((c) => c.by === p);
      if (items.length)
        groups.push({
          key: p,
          label: (
            <>
              <Who id={p} /> · {items.length} {items.length === 1 ? 'edit' : 'edits'}
            </>
          ),
          items,
        });
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Change history</div>
          <h1>
            What changed {range === 'sunday' ? 'since Sunday' : 'in the last 7 days'}
          </h1>
          <p className="lede">
            {inRange.length} edits by {authors.length} people. You last looked {fmtWhen(LAST_VISIT)}. Nothing anyone adds replaces someone else’s work. Every edit is kept here.
          </p>
        </div>
        <div className="seg seg-lg">
          <button className={range === 'sunday' ? 'on' : ''} onClick={() => setRange('sunday')}>
            Since Sun, Nov 15
          </button>
          <button className={range === 'week' ? 'on' : ''} onClick={() => setRange('week')}>
            Last 7 days
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="chips">
          <button className={'chip' + (who === 'all' ? ' chip-on chip-dark' : '')} onClick={() => setWho('all')}>
            Everyone <span className="count">{inRange.length}</span>
          </button>
          {authors.map((p) => {
            const n = inRange.filter((c) => c.by === p).length;
            const on = who === p;
            return (
              <button
                key={p}
                className={'chip' + (on ? ' chip-on' : '')}
                style={on ? { background: PEOPLE[p].tint, color: PEOPLE[p].color, borderColor: PEOPLE[p].color + '66' } : undefined}
                onClick={() => setWho(on ? 'all' : p)}
              >
                <Avatar id={p} size={18} /> {p === ME ? 'You' : PEOPLE[p].short} <span className="count">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="toolbar-r">
          <div className="seg">
            <button className={group === 'time' ? 'on' : ''} onClick={() => setGroup('time')}>
              By day
            </button>
            <button className={group === 'person' ? 'on' : ''} onClick={() => setGroup('person')}>
              By person
            </button>
          </div>
        </div>
      </div>

      <div className="review-bar">
        <div className="review-track">
          <div className="review-fill" style={{ width: `${reviewable.length ? (done / reviewable.length) * 100 : 0}%` }} />
        </div>
        <span>
          <b>{done}</b> of {reviewable.length} reviewed
        </span>
        {done < reviewable.length ? (
          <button className="btn btn-sm btn-ghost" onClick={() => s.setReviewed(reviewable.map((c) => c.id), true)}>
            Mark all reviewed
          </button>
        ) : (
          <button className="btn btn-sm btn-ghost" onClick={() => s.setReviewed(reviewable.map((c) => c.id), false)}>
            Undo
          </button>
        )}
      </div>

      {groups.map((gp) => (
        <section key={gp.key} className="day-group">
          <h2 className="day-h">{gp.label}</h2>
          {gp.items.map((c) => (
            <ChangeCard key={c.id} c={c} showDate={group === 'person'} />
          ))}
        </section>
      ))}
      {groups.length === 0 && <div className="empty-big">No edits from this person in this range.</div>}
    </div>
  );
}

function title(c: Change, s: ReturnType<typeof useStore>): ReactNode {
  switch (c.kind) {
    case 'readings': {
      const rs = c.readingIds.map((id) => s.readings.find((r) => r.id === id)!).filter(Boolean);
      const site = rs[0] ? siteLabel(container(rs[0].container)) : '';
      return (
        <>
          added <b>{rs.length === 1 ? '1 reading' : `${rs.length} readings`}</b> · {c.summary}
          <span className="muted"> · {site === 'Home' ? 'home tubs' : 'her tubs'}</span>
        </>
      );
    }
    case 'hypothesis':
      return (
        <>
          rewrote the <b>hypothesis</b>
        </>
      );
    case 'procedure':
      return (
        <>
          edited <b>procedure step {c.step}</b>
        </>
      );
    case 'photos':
      return (
        <>
          added <b>{c.photoIds.length === 1 ? '1 photo' : `${c.photoIds.length} photos`}</b>
        </>
      );
    case 'note':
      return (
        <>
          added a <b>note</b> to the home tubs
        </>
      );
  }
}

function ChangeCard({ c, showDate }: { c: Change; showDate: boolean }) {
  const s = useStore();
  const mine = c.by === ME;
  const reviewed = s.reviewed.has(c.id);
  const [open, setOpen] = useState(false);
  const collapsed = reviewed && !open;
  const flagged = c.kind === 'readings' && c.readingIds.some((id) => {
    const r = s.readings.find((x) => x.id === id);
    return r && checkReading(s.readings, r);
  });

  return (
    <article className={'card change' + (collapsed ? ' change-collapsed' : '') + (flagged ? ' change-flag' : '')} style={{ ['--who' as string]: PEOPLE[c.by].color }}>
      <header className="change-head" onClick={() => reviewed && setOpen(!open)}>
        <Avatar id={c.by} size={30} />
        <div className="change-title">
          <Who id={c.by} /> {title(c, s)}
          <div className="muted small">
            {showDate ? fmtWhen(c.at) : fmtTime(c.at)}
            {c.kind === 'readings' && c.by === 'funmi' && ' · entered from Grandma’s house'}
            {flagged && <span className="tag tag-warn">1 reading looks off</span>}
          </div>
        </div>
        {mine ? (
          <span className="tag">Your edit</span>
        ) : (
          <button
            className={'review-btn' + (reviewed ? ' on' : '')}
            onClick={(e) => {
              e.stopPropagation();
              s.setReviewed([c.id], !reviewed);
              setOpen(false);
            }}
            title={reviewed ? 'Mark as not reviewed' : 'Mark as reviewed'}
          >
            <Icon name="check" size={14} /> {reviewed ? 'Reviewed' : 'Mark reviewed'}
          </button>
        )}
      </header>
      {!collapsed && <div className="change-body">{body(c)}</div>}
    </article>
  );
}

function body(c: Change) {
  switch (c.kind) {
    case 'readings':
      return <ReadingsBody ids={c.readingIds} />;
    case 'hypothesis':
      return <HypothesisBody from={c.from} to={c.to} />;
    case 'procedure':
      return <StepBody step={c.step} from={c.from} to={c.to} />;
    case 'photos':
      return <PhotosBody ids={c.photoIds} />;
    case 'note':
      return <NoteBody id={c.noteId} />;
  }
}

function ReadingsBody({ ids }: { ids: string[] }) {
  const s = useStore();
  const rs = ids.map((id) => s.readings.find((r) => r.id === id)).filter(Boolean) as Reading[];
  const anyFlag = rs.some((r) => checkReading(s.readings, r));

  if (!anyFlag) {
    return (
      <div className="mini-grid">
        {rs.map((r) => {
          const c = container(r.container);
          const prev = previousReading(s.readings, r);
          const d = r.mass != null && prev?.mass != null ? r2(r.mass - prev.mass) : null;
          const n = commentsFor(s.comments, `reading:${r.id}`).length;
          return (
            <button key={r.id} className="mini" onClick={() => s.open(readingTarget(r))} title="Comment on this reading">
              <span className="mini-dot" style={{ background: c.color }} />
              <span className="mini-name">{c.label}</span>
              <span className="mini-val mono">{c.hasFoam ? g(r.mass) : 'no foam'}</span>
              <span className="mini-sub">
                {d != null && <span className="mono">{signed(d)} · </span>}
                {r.live} live{r.dead > 0 && <span className="dead"> · {r.dead} dead</span>}
              </span>
              {n > 0 && <span className="badge-c">{n}</span>}
            </button>
          );
        })}
        <div className="mini-ok">
          <Icon name="check" size={14} /> {(() => {
            const k = rs.filter((r) => r.mass != null).length;
            return k === 0 ? 'Worm counts recorded' : k === 1 ? 'Foam weight went down or held steady' : `${k === 2 ? 'Both' : `All ${k}`} foam weights went down or held steady`;
          })()}
        </div>
      </div>
    );
  }

  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Tub</th>
          <th>Day</th>
          <th className="num">Foam mass</th>
          <th className="num">vs. previous</th>
          <th className="num">Live</th>
          <th className="num">Dead</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rs.map((r) => {
          const c = container(r.container);
          const prev = previousReading(s.readings, r);
          const d = r.mass != null && prev?.mass != null ? r2(r.mass - prev.mass) : null;
          const ck = checkReading(s.readings, r);
          const n = commentsFor(s.comments, `reading:${r.id}`).length;
          const q = s.questioned.has(r.id);
          return [
            <tr key={r.id} className={ck ? 'row-warn' : ''}>
              <td className="nowrap">
                <span className="mini-dot" style={{ background: c.color }} /> {c.label}
              </td>
              <td>
                Day {r.day}
                {r.measuredNote && <div className="muted tiny">{r.measuredNote}</div>}
              </td>
              <td className="num mono">
                <b>{g(r.mass)}</b>
              </td>
              <td className={'num mono ' + (ck ? 'warn-t' : 'muted')}>
                {d != null ? (
                  <>
                    {ck && '▲ '}
                    {signed(d)}
                    <div className="tiny">since day {prev!.day}</div>
                  </>
                ) : (
                  '—'
                )}
              </td>
              <td className="num mono">{r.live}</td>
              <td className="num mono">{r.dead}</td>
              <td className="row-act">
                <button
                  className={'btn btn-sm ' + (ck && !n ? 'btn-primary' : 'btn-ghost') + (!ck && !n ? ' btn-quiet' : '')}
                  onClick={() => s.open(readingTarget(r))}
                  title="Comment on this reading"
                >
                  <Icon name={ck ? 'question' : 'chat'} size={14} />
                  {n > 0 ? `${n}` : ck ? `Ask ${r.by === 'funmi' ? 'Grandma' : PEOPLE[r.by].short}` : ''}
                </button>
              </td>
            </tr>,
            ck && (
              <tr key={r.id + '-w'} className="row-warn-msg">
                <td colSpan={7}>
                  <Icon name="warn" size={14} />
                  <span>
                    Foam mass went <b>up</b> {signed(ck.rise).slice(1)} since day {ck.prev.day}
                    {ck.aboveStart && ', higher than the day-0 starting weight'}. The scale reads to 0.01 g, so this isn’t normal wobble.
                    {r.note && <span className="muted"> {PEOPLE[r.by].short}’s note: “{r.note}”</span>}
                  </span>
                  {q && <span className="pill pill-wait">Questioned</span>}
                </td>
              </tr>
            ),
          ];
        })}
      </tbody>
    </table>
  );
}

function DiffText({ from, to }: { from: string; to: string }) {
  const segs = wordDiff(from, to);
  return (
    <p className="diff">
      {segs.map((x, i) =>
        x.t === 'same' ? <span key={i}>{x.s}</span> : x.t === 'add' ? <ins key={i}>{x.s}</ins> : <del key={i}>{x.s}</del>,
      )}
    </p>
  );
}

function HypothesisBody({ from, to }: { from: string; to: string }) {
  const s = useStore();
  const [mode, setMode] = useState<'side' | 'diff'>('side');
  const n = commentsFor(s.comments, 'section:hypothesis').filter((c) => c.at >= SUNDAY).length;
  return (
    <div>
      <div className="body-tools">
        <div className="seg">
          <button className={mode === 'side' ? 'on' : ''} onClick={() => setMode('side')}>
            Before / after
          </button>
          <button className={mode === 'diff' ? 'on' : ''} onClick={() => setMode('diff')}>
            Word changes
          </button>
        </div>
        <span className="muted small">Version 1 from Sat, Oct 24 → version 2</span>
      </div>
      {mode === 'side' ? (
        <div className="sbs">
          <div className="side-col side-old">
            <div className="side-lbl">Before</div>
            <p className="temi-text">{from}</p>
          </div>
          <div className="side-col side-new">
            <div className="side-lbl">Now</div>
            <p className="temi-text">{to}</p>
          </div>
        </div>
      ) : (
        <DiffText from={from} to={to} />
      )}
      <div className="change-foot">
        <span className="lock-note">
          <Icon name="lock" size={13} /> Temi’s section. You can comment, not edit.
        </span>
        <div className="foot-btns">
          <button className="btn btn-sm btn-ghost" onClick={() => s.go('hypothesis')}>
            Open hypothesis
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => { s.go('hypothesis'); s.open(sectionTarget('hypothesis')); }}>
            <Icon name="chat" size={14} /> {n ? `${n} new ${n === 1 ? 'comment' : 'comments'}` : 'Comment for Temi'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepBody({ step, from, to }: { step: number; from: string; to: string }) {
  const s = useStore();
  const n = commentsFor(s.comments, `step:${step}`).length;
  return (
    <div>
      <div className="step-diff">
        <span className="step-n">{step}</span>
        <DiffText from={from} to={to} />
      </div>
      <div className="change-foot">
        <span className="lock-note">
          <Icon name="lock" size={13} /> Temi’s section. You can comment, not edit.
        </span>
        <button className="btn btn-sm btn-ghost" onClick={() => { s.go('procedure'); s.open(stepTarget(step)); }}>
          <Icon name="chat" size={14} /> {n ? `${n} ${n === 1 ? 'comment' : 'comments'}` : 'Comment'}
        </button>
      </div>
    </div>
  );
}

function PhotosBody({ ids }: { ids: string[] }) {
  const s = useStore();
  const ps = ids.map((id) => s.photos.find((p) => p.id === id)!).filter(Boolean);
  return (
    <div className="thumbs">
      {ps.map((p) => (
        <button key={p.id} className="thumb" onClick={() => s.open(photoTarget(p))}>
          <PhotoArt photo={p} />
          <span className="thumb-cap">{p.caption}</span>
        </button>
      ))}
    </div>
  );
}

function NoteBody({ id }: { id: string }) {
  const n = ENV_NOTES.find((x) => x.id === id)!;
  return <blockquote className="note-q">{n.text}</blockquote>;
}
