import { useEffect, useMemo, useRef, useState } from 'react';
import { Comment, ME, PEOPLE, PersonId, SUNDAY, container, containerName } from '../data';
import { commentsFor, readingTarget, sectionTarget, Target, targetFromKey, useStore } from '../store';
import { checkReading, fmtWhen, g, signed } from '../util';
import { Avatar, Icon, Who } from './bits';
import PhotoArt from './PhotoArt';

export default function Discussion() {
  const s = useStore();
  return <aside className="discussion">{s.target ? <Thread key={s.target.key + (s.target.quote ?? '')} t={s.target} /> : <Overview />}</aside>;
}

function Overview() {
  const s = useStore();
  const suspects = s.readings.filter((r) => r.at >= SUNDAY && r.by !== ME && checkReading(s.readings, r));
  const openQs = s.comments.filter((c) => c.by === ME && c.kind === 'question' && !c.answered);
  const recent = [...s.comments].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 4);
  const hypReviewed = s.reviewed.has('c5');
  const hypCommented = s.comments.some((c) => c.target === 'section:hypothesis' && c.by === ME);

  return (
    <div className="disc-body">
      <h3 className="disc-h">Needs a look</h3>
      {suspects.map((r) => {
        const ck = checkReading(s.readings, r)!;
        const asked = s.comments.some((c) => c.target === `reading:${r.id}` && c.by === ME);
        return (
          <div className={'attn attn-warn' + (asked ? ' attn-done' : '')} key={r.id}>
            <div className="attn-ic">
              <Icon name={asked ? 'check' : 'warn'} />
            </div>
            <div>
              <div className="attn-t">
                {containerName(r.container)} went <b>up</b> to {g(r.mass)} on day {r.day}
              </div>
              <div className="attn-d">
                Day {ck.prev.day} was {g(ck.prev.mass)} ({signed(ck.rise)}).
                {ck.aboveStart ? ' That’s heavier than the block was on day 0.' : ''} Foam can’t gain mass, so this may be an entry slip.
              </div>
              <div className="attn-a">
                {asked ? (
                  <span className="pill pill-wait">You asked {PEOPLE[r.by].short} · waiting for reply</span>
                ) : (
                  <button className="btn btn-sm btn-primary" onClick={() => s.open(readingTarget(r))}>
                    <Icon name="question" size={14} /> Ask {PEOPLE[r.by].short}
                  </button>
                )}
                <button className="btn btn-sm btn-ghost" onClick={() => s.go('data', { container: r.container, readingId: r.id })}>
                  See it in the data
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div className={'attn' + (hypCommented ? ' attn-done' : '')}>
        <div className="attn-ic attn-ic-temi">
          <Icon name={hypCommented ? 'check' : 'bulb'} />
        </div>
        <div>
          <div className="attn-t">Temi rewrote her hypothesis</div>
          <div className="attn-d">Last night at 9:14 pm. It’s her section: you can comment beside it, but only she can change the words.</div>
          <div className="attn-a">
            {hypCommented ? (
              <span className="pill pill-ok">You commented</span>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={() => { s.go('hypothesis'); s.open(sectionTarget('hypothesis')); }}>
                <Icon name="chat" size={14} /> Read &amp; comment
              </button>
            )}
            {!hypReviewed && <span className="muted small">Not reviewed yet</span>}
          </div>
        </div>
      </div>

      {openQs.length > 0 && (
        <>
          <h3 className="disc-h">Your open questions</h3>
          {openQs.map((c) => (
            <CommentLink key={c.id} c={c} />
          ))}
        </>
      )}

      <h3 className="disc-h">Recent comments</h3>
      {recent.map((c) => (
        <CommentLink key={c.id} c={c} />
      ))}
    </div>
  );
}

function CommentLink({ c }: { c: Comment }) {
  const s = useStore();
  const t = targetFromKey(c.target, s);
  return (
    <button className="clink" onClick={() => t && s.open(t)}>
      <Avatar id={c.by} size={24} />
      <div className="clink-main">
        <div className="clink-top">
          <Who id={c.by} /> <span className="muted">on {t?.title ?? c.target}</span>
        </div>
        <div className="clink-text">{c.text}</div>
        <div className="muted small">
          {fmtWhen(c.at)}
          {c.replies.length > 0 && ` · ${c.replies.length} ${c.replies.length === 1 ? 'reply' : 'replies'}`}
          {c.kind === 'question' && !c.answered && ' · waiting for reply'}
        </div>
      </div>
    </button>
  );
}

const HYP_STARTERS = [
  'What made you change your prediction about the oats?',
  'How will you tell if the foam was really eaten and not just crumbled into the frass?',
  'I like that you explained why — the gut bacteria part makes it testable.',
];

function starters(t: Target, s: ReturnType<typeof useStore>): string[] {
  if (t.kind === 'section' && t.key === 'section:hypothesis') return HYP_STARTERS;
  if (t.kind === 'step') return ['Good idea adding this step. Should we tell Grandma so she does it too?'];
  if (t.kind === 'reading' && t.readingId) {
    const r = s.readings.find((x) => x.id === t.readingId)!;
    const ck = checkReading(s.readings, r);
    const name = r.by === 'funmi' ? 'Grandma' : PEOPLE[r.by].short;
    if (ck) {
      const c = container(r.container);
      return [
        `${name}, day ${r.day} for ${c.label.toLowerCase()} says ${g(r.mass)}, but day ${ck.prev.day} was ${g(ck.prev.mass)}. Foam can’t get heavier, so could this be a typo? If the tub is still set up, could you re-weigh it with the empty boat tared to 0.00 first?`,
        `Could you double-check this number when you get a chance? It’s higher than the last one.`,
      ];
    }
    return ['Could you double-check this one when you get a chance?'];
  }
  return [];
}

function Thread({ t }: { t: Target }) {
  const s = useStore();
  const thread = commentsFor(s.comments, t.key).sort((a, b) => a.at.getTime() - b.at.getTime());
  const [to, setTo] = useState<PersonId[]>(t.defaultTo.filter((p) => p !== ME));
  const [kind, setKind] = useState<'comment' | 'question'>(t.defaultKind);
  const [text, setText] = useState('');
  const [quote, setQuote] = useState(t.quote);
  const [flag, setFlag] = useState(true);
  const ta = useRef<HTMLTextAreaElement>(null);

  const reading = t.readingId ? s.readings.find((r) => r.id === t.readingId) : undefined;
  const check = reading ? checkReading(s.readings, reading) : null;
  const photo = t.photoId ? s.photos.find((p) => p.id === t.photoId) : reading?.photoId ? s.photos.find((p) => p.id === reading.photoId) : undefined;
  const sugg = useMemo(() => starters(t, s), [t, s]);

  useEffect(() => {
    if (t.quote) ta.current?.focus();
  }, [t.quote]);

  const ownerNote = (() => {
    if (t.owner === 'temi' && (t.kind === 'section' || t.kind === 'step'))
      return 'Only Temi can edit this section (fair rule: the student writes it herself). Your comment sits beside her words and never changes them.';
    if (t.owner && t.owner !== ME && t.kind === 'reading') return `Entered by ${PEOPLE[t.owner].short}. Only ${PEOPLE[t.owner].short === 'Temi' ? 'Temi' : 'she'} can correct it, so ask instead of changing it.`;
    if (t.owner === ME) return 'You added this.';
    return null;
  })();

  const send = () => {
    if (!text.trim()) return;
    s.addComment({ target: t.key, text: text.trim(), to, kind, quote }, kind === 'question' && t.kind === 'reading' && flag);
    setText('');
    setQuote(undefined);
  };

  const people: PersonId[] = ['temi', 'funmi'];

  return (
    <div className="disc-body">
      <div className="thread-head">
        <button className="btn btn-icon btn-ghost" onClick={() => s.open(null)} title="Close">
          <Icon name="x" />
        </button>
        <div>
          <div className="eyebrow">{t.kind === 'reading' ? 'Reading' : t.kind === 'photo' ? 'Photo' : 'Temi’s writing'}</div>
          <div className="thread-title">{t.title}</div>
          {t.subtitle && <div className="muted small">{t.subtitle}</div>}
        </div>
      </div>

      {ownerNote && (
        <div className="owner-note">
          <Icon name="lock" size={14} />
          <span>{ownerNote}</span>
        </div>
      )}

      {reading && check && (
        <div className="ctx ctx-warn">
          <div className="ctx-row">
            <span>Day {check.prev.day}</span>
            <b className="mono">{g(check.prev.mass)}</b>
          </div>
          <div className="ctx-row">
            <span>Day {reading.day}</span>
            <b className="mono warn-t">
              {g(reading.mass)} <small>{signed(check.rise)}</small>
            </b>
          </div>
          <div className="ctx-foot">
            <Icon name="warn" size={13} /> Mass went up by more than the scale’s ±0.01 g wobble.
          </div>
        </div>
      )}
      {reading && s.questioned.has(reading.id) && (
        <div className="pill pill-wait block">Marked “questioned” in the data. Temi will see it before she uses this number.</div>
      )}

      {photo && (
        <div className="ctx-photo">
          <PhotoArt photo={photo} />
          <div className="small muted">
            {reading ? 'Photo attached to this reading: ' : ''}“{photo.caption}”
          </div>
        </div>
      )}

      <div className="thread">
        {thread.length === 0 && <div className="muted small empty">No comments here yet.</div>}
        {thread.map((c) => (
          <div className="cmt" key={c.id}>
            <Avatar id={c.by} size={26} />
            <div className="cmt-main">
              <div className="cmt-top">
                <Who id={c.by} />
                {c.to.length > 0 && (
                  <span className="muted small">
                    {' '}
                    to {c.to.map((p) => (p === ME ? 'you' : PEOPLE[p].short)).join(' & ')}
                  </span>
                )}
                <span className="muted small"> · {fmtWhen(c.at)}</span>
                {c.kind === 'question' && <span className={'tag ' + (c.answered ? 'tag-ok' : 'tag-q')}>{c.answered ? 'Answered' : 'Question'}</span>}
              </div>
              {c.quote && <blockquote className="cmt-quote">“{c.quote}”</blockquote>}
              <div className="cmt-text">{c.text}</div>
              {c.replies.map((r) => (
                <div className="reply" key={r.id}>
                  <Avatar id={r.by} size={20} />
                  <div>
                    <div className="cmt-top">
                      <Who id={r.by} /> <span className="muted small">· {fmtWhen(r.at)}</span>
                    </div>
                    <div className="cmt-text">{r.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="composer">
        <div className="comp-row">
          <span className="comp-lbl">To</span>
          {people.map((p) => (
            <button
              key={p}
              className={'chip' + (to.includes(p) ? ' chip-on' : '')}
              style={to.includes(p) ? { background: PEOPLE[p].tint, color: PEOPLE[p].color, borderColor: PEOPLE[p].color + '66' } : undefined}
              onClick={() => setTo(to.includes(p) ? to.filter((x) => x !== p) : [...to, p])}
            >
              {PEOPLE[p].short}
            </button>
          ))}
          <div className="seg">
            <button className={kind === 'comment' ? 'on' : ''} onClick={() => setKind('comment')}>
              Comment
            </button>
            <button className={kind === 'question' ? 'on' : ''} onClick={() => setKind('question')}>
              Question
            </button>
          </div>
        </div>
        {quote && (
          <div className="comp-quote">
            <Icon name="quote" size={14} />
            <span>“{quote}”</span>
            <button className="btn btn-icon btn-ghost" onClick={() => setQuote(undefined)} title="Remove quote">
              <Icon name="x" size={13} />
            </button>
          </div>
        )}
        <textarea
          ref={ta}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.owner === 'temi' ? 'Ask Temi a question or tell her what you noticed…' : `Write to ${to.map((p) => PEOPLE[p].short).join(' & ') || 'the family'}…`}
          rows={4}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
          }}
        />
        {sugg.length > 0 && !text && (
          <div className="starters">
            <div className="muted small">{t.owner === 'temi' ? 'Questions help more than answers. Try:' : 'Start from:'}</div>
            {sugg.map((x) => (
              <button key={x} className="starter" onClick={() => { setText(x); if (x.trim().endsWith('?')) setKind('question'); ta.current?.focus(); }}>
                {x}
              </button>
            ))}
          </div>
        )}
        {t.kind === 'reading' && kind === 'question' && reading && !s.questioned.has(reading.id) && (
          <label className="check">
            <input type="checkbox" checked={flag} onChange={(e) => setFlag(e.target.checked)} />
            <span>Mark this reading as “questioned” in the data until it’s answered (the number itself stays as entered)</span>
          </label>
        )}
        <div className="comp-foot">
          <span className="muted small">
            {to.length ? `${to.map((p) => PEOPLE[p].short).join(' & ')} will get an email.` : 'Visible to the family.'} Ms. Albrecht can read comments.
          </span>
          <button className="btn btn-primary" disabled={!text.trim()} onClick={send}>
            {kind === 'question' ? 'Send question' : 'Post comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
