import { ReactNode, useRef, useState } from 'react';
import { HYPOTHESIS_VERSIONS, ME, PEOPLE, PersonId, PLANNED_DAYS, PROCEDURE, QUESTION, STEP4_OLD, FAIR_DATE, dayDate } from '../data';
import { commentsFor, sectionTarget, stepTarget, useStore } from '../store';
import { fmtDate, fmtWhen, wordDiff } from '../util';
import { Avatar, Icon, Who } from '../components/bits';

function LockBanner({ what }: { what: string }) {
  return (
    <div className="lock-banner">
      <Icon name="lock" size={16} />
      <div>
        <b>Temi writes the {what} herself.</b> Science-fair rule 4.2 says the student must write the hypothesis and conclusions. You can leave comments and
        questions in the margin; they never change her words.
      </div>
    </div>
  );
}

function highlight(text: string, quotes: string[]): ReactNode[] {
  const ranges: [number, number][] = [];
  for (const q of quotes) {
    const i = text.indexOf(q);
    if (i >= 0) ranges.push([i, i + q.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const out: ReactNode[] = [];
  let pos = 0;
  ranges.forEach(([a, b], k) => {
    if (a < pos) return;
    out.push(text.slice(pos, a));
    out.push(<mark key={k}>{text.slice(a, b)}</mark>);
    pos = b;
  });
  out.push(text.slice(pos));
  return out;
}

export function Hypothesis() {
  const s = useStore();
  const [v, setV] = useState(2);
  const [showDiff, setShowDiff] = useState(false);
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const cur = HYPOTHESIS_VERSIONS.find((x) => x.v === v)!;
  const prev = HYPOTHESIS_VERSIONS.find((x) => x.v === v - 1);
  const comments = commentsFor(s.comments, 'section:hypothesis');
  const quotes = v === 2 ? comments.map((c) => c.quote).filter(Boolean) as string[] : [];

  const onUp = () => {
    const ss = window.getSelection();
    const text = ss?.toString().trim() ?? '';
    if (!ss || !text || !box.current || !ss.anchorNode || !box.current.contains(ss.anchorNode)) {
      setSel(null);
      return;
    }
    const rect = ss.getRangeAt(0).getBoundingClientRect();
    const b = box.current.getBoundingClientRect();
    setSel({ text, x: rect.left - b.left + rect.width / 2, y: rect.top - b.top });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            Written by <Who id="temi" />
          </div>
          <h1>Hypothesis</h1>
        </div>
        <div className="seg seg-lg">
          {HYPOTHESIS_VERSIONS.map((x) => (
            <button key={x.v} className={v === x.v ? 'on' : ''} onClick={() => { setV(x.v); setShowDiff(false); }}>
              {x.v === 2 ? 'Current' : `Version ${x.v}`} · {fmtWhen(x.at)}
            </button>
          ))}
        </div>
      </div>
      <LockBanner what="hypothesis" />

      <div className="paper">
        <div className="paper-lbl">Testable question</div>
        <p className="temi-text">{QUESTION}</p>
        <div className="paper-lbl">
          Hypothesis{' '}
          {v === 2 && (
            <span className="tag tag-temi">
              Rewritten {fmtWhen(cur.at)}
            </span>
          )}
        </div>
        <div className="sel-box" ref={box} onMouseUp={onUp}>
          {showDiff && prev ? (
            <p className="temi-text diff">
              {wordDiff(prev.text, cur.text).map((x, i) =>
                x.t === 'same' ? <span key={i}>{x.s}</span> : x.t === 'add' ? <ins key={i}>{x.s}</ins> : <del key={i}>{x.s}</del>,
              )}
            </p>
          ) : (
            <p className="temi-text temi-big">{highlight(cur.text, quotes)}</p>
          )}
          {sel && (
            <button
              className="sel-btn"
              style={{ left: sel.x, top: sel.y }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                s.open(sectionTarget('hypothesis', sel.text));
                setSel(null);
                window.getSelection()?.removeAllRanges();
              }}
            >
              <Icon name="chat" size={14} /> Comment on this
            </button>
          )}
        </div>
        <div className="paper-foot">
          {prev && (
            <button className="btn btn-sm btn-ghost" onClick={() => setShowDiff(!showDiff)}>
              {showDiff ? 'Hide changes' : `Show what changed from version ${prev.v}`}
            </button>
          )}
          <span className="muted small">
            <Icon name="quote" size={13} /> Select any words to comment on just that part.
          </span>
          <button className="btn btn-sm btn-primary" onClick={() => s.open(sectionTarget('hypothesis'))}>
            <Icon name="chat" size={14} /> Comment for Temi{comments.length ? ` · ${comments.length}` : ''}
          </button>
        </div>
      </div>

      <div className="hint-card">
        <Icon name="bulb" size={16} />
        <div>
          <b>Helping without writing it for her.</b> Judges look for a hypothesis that predicts a measurable result and gives a reason. Questions like
          “How would you know if you were wrong?” let Temi improve it in her own words.
        </div>
      </div>
    </div>
  );
}

export function Procedure() {
  const s = useStore();
  const [diff4, setDiff4] = useState(false);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            Written by <Who id="temi" />
          </div>
          <h1>Procedure</h1>
        </div>
        <button className="btn btn-ghost" onClick={() => s.open(sectionTarget('procedure'))}>
          <Icon name="chat" size={15} /> Comment on the whole procedure · {commentsFor(s.comments, 'section:procedure').length}
        </button>
      </div>
      <LockBanner what="procedure" />
      <div className="paper">
        <div className="paper-lbl">Materials</div>
        <p className="temi-text">
          300 mealworms (one batch), 6 clear plastic tubs with lids, white polystyrene packing foam, rolled oats, digital scale (0.01 g), small plastic weigh
          boat, soft paintbrush, tweezers, phone camera.
        </p>
        <div className="paper-lbl">Steps</div>
        <ol className="steps">
          {PROCEDURE.map((st) => {
            const n = commentsFor(s.comments, `step:${st.n}`).length;
            return (
              <li key={st.n} className={st.editedAt ? 'step-edited' : ''}>
                <span className="step-n">{st.n}</span>
                <div className="step-main">
                  {st.n === 4 && diff4 ? (
                    <p className="temi-text diff">
                      {wordDiff(STEP4_OLD, st.text).map((x, i) =>
                        x.t === 'same' ? <span key={i}>{x.s}</span> : x.t === 'add' ? <ins key={i}>{x.s}</ins> : <del key={i}>{x.s}</del>,
                      )}
                    </p>
                  ) : (
                    <p className="temi-text">{st.text}</p>
                  )}
                  {st.editedAt && (
                    <div className="step-meta">
                      <span className="tag tag-temi">Edited {fmtWhen(st.editedAt)}</span>
                      <button className="link" onClick={() => setDiff4(!diff4)}>
                        {diff4 ? 'Hide change' : 'Show change'}
                      </button>
                    </div>
                  )}
                </div>
                <button className={'btn btn-icon btn-ghost step-c' + (n ? ' has' : '')} onClick={() => s.open(stepTarget(st.n))} title="Comment on this step">
                  <Icon name="chat" size={15} />
                  {n > 0 && <span>{n}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function Conclusion() {
  const s = useStore();
  const end = dayDate(PLANNED_DAYS);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            Written by <Who id="temi" />
          </div>
          <h1>Conclusion</h1>
        </div>
      </div>
      <LockBanner what="conclusion" />
      <div className="paper paper-empty">
        <Icon name="pen" size={22} />
        <h3>Temi hasn’t started this yet</h3>
        <p>
          She plans to write it after the last weigh-in on {fmtDate(end)} (day {PLANNED_DAYS}). That leaves 11 days before the fair on {fmtDate(FAIR_DATE)}.
        </p>
        <p className="muted small">
          It will help if every reading she uses is settled by then. Questions you ask now show up next to the numbers in the data, so she’ll know which ones to
          wait on.
        </p>
        <button className="btn btn-ghost" onClick={() => s.go('data')}>
          Check the data
        </button>
      </div>
    </div>
  );
}

const PERMS: { label: string; who: Record<PersonId, boolean> }[] = [
  { label: 'Write hypothesis, procedure, conclusion', who: { temi: true, marcus: false, funmi: false, albrecht: false } },
  { label: 'Add readings and photos', who: { temi: true, marcus: true, funmi: true, albrecht: false } },
  { label: 'Correct readings they entered', who: { temi: true, marcus: true, funmi: true, albrecht: false } },
  { label: 'Comment and ask questions', who: { temi: true, marcus: true, funmi: true, albrecht: false } },
  { label: 'Read everything, including history', who: { temi: true, marcus: true, funmi: true, albrecht: true } },
];

export function People() {
  const order: PersonId[] = ['temi', 'marcus', 'funmi', 'albrecht'];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Notebook members</div>
          <h1>Family &amp; access</h1>
          <p className="lede">Temi is the owner. Helpers add data alongside her and comment; nobody can change what someone else wrote or entered.</p>
        </div>
      </div>
      <div className="people">
        {order.map((p) => (
          <div className="person card" key={p}>
            <Avatar id={p} size={40} />
            <div>
              <div className="person-n">
                {PEOPLE[p].name}
                {p === ME && <span className="tag">You</span>}
              </div>
              <div className="muted small">{PEOPLE[p].role}</div>
              <div className="muted small">{PEOPLE[p].where}</div>
            </div>
          </div>
        ))}
      </div>
      <table className="perm card">
        <thead>
          <tr>
            <th></th>
            {order.map((p) => (
              <th key={p} style={{ color: PEOPLE[p].color }}>
                {p === ME ? 'You' : PEOPLE[p].short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMS.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              {order.map((p) => (
                <td key={p} className={row.who[p] ? 'yes' : 'no'}>
                  <Icon name={row.who[p] ? 'check' : 'x'} size={15} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small" style={{ marginTop: 12 }}>
        <Avatar id="albrecht" size={18} /> Ms. Albrecht has read-only access so she can check the project before the fair. She can’t comment here.
      </p>
    </div>
  );
}
