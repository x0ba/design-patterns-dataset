import { useEffect, useRef, useState } from 'react';
import { RECIPES, SLOTS, SLOT_LABEL } from './data';
import { YogAnswer } from './logic';
import { Msg, YOG_LABEL, useStore } from './store';
import { ICheck, IChevron, IChevronR, IPause, ISend, ISpark } from './icons';

export function AssistantPanel() {
  const s = useStore();
  const { thread, phase, days, w2, explainer, assistantBusy } = s;
  const scroller = useRef<HTMLDivElement>(null);
  const [showRules, setShowRules] = useState(false);

  const first = useRef(true);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (first.current) {
      first.current = false;
      const q = document.getElementById('yog-question');
      if (q) el.scrollTop = q.offsetTop - el.offsetTop - 40;
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [thread.length, assistantBusy]);

  const drafted = days.filter((d) => d.status !== 'queued' && d.status !== 'drafting').length;
  const draftingDay = days.find((d) => d.status === 'drafting');

  const status =
    phase === 'paused'
      ? { cls: 'pill-pause', text: 'Paused · needs your answer' }
      : phase === 'done'
        ? { cls: 'pill-done', text: 'Done · ready for your review' }
        : { cls: 'pill-run', text: draftingDay ? `Drafting Day ${draftingDay.def.n}` : phase === 'shopping' ? 'Drafting week 2 list' : phase === 'explainer' ? 'Drafting explainer' : 'Working' };

  const steps: { label: string; state: 'done' | 'now' | 'wait' | 'pause' }[] = [
    { label: 'Days 1–9 · 45 items', state: 'done' },
    { label: 'Shopping list, week 1', state: 'done' },
    { label: 'Question: yogurt tolerance', state: s.yog === null ? 'pause' : 'done' },
    { label: `Days 10–14 · ${Math.max(0, drafted - 9)}/5`, state: drafted >= 14 ? 'done' : phase === 'drafting' ? 'now' : 'wait' },
    { label: 'Shopping list, week 2', state: w2 ? 'done' : phase === 'shopping' ? 'now' : 'wait' },
    { label: 'One-page explainer', state: explainer === 'queued' ? 'wait' : explainer === 'drafting' ? 'now' : 'done' },
  ];

  return (
    <aside className="assistant">
      <div className="as-head">
        <div className="as-title">
          <span className="as-mark"><ISpark size={15} /></span>
          <div>
            <div className="as-name">Assistant</div>
            <div className="as-task">14-day low-FODMAP plan for Tom Brennan</div>
          </div>
          <span className={`pill ${status.cls}`}>
            {phase === 'paused' ? <IPause size={11} /> : phase === 'done' ? <ICheck size={11} /> : <span className="spin sm" />}
            {status.text}
          </span>
        </div>
        <div className="as-prog">
          <div className="ap-bar">
            {Array.from({ length: 14 }, (_, i) => {
              const d = days[i];
              const c = d.status === 'queued' ? 'q' : d.status === 'drafting' ? 'w' : 'd';
              return <span key={i} className={`ap-seg ap-${c}`} title={`Day ${i + 1}`} />;
            })}
          </div>
          <div className="ap-label">{drafted} of 14 days drafted</div>
        </div>
        <ol className="steps">
          {steps.map((st) => (
            <li key={st.label} className={`step step-${st.state}`}>
              <span className="step-ic">
                {st.state === 'done' ? <ICheck size={11} /> : st.state === 'pause' ? <IPause size={10} /> : st.state === 'now' ? <span className="spin xs" /> : null}
              </span>
              {st.label}
            </li>
          ))}
        </ol>
        <button className="rules-toggle" onClick={() => setShowRules((v) => !v)}>
          Instructions in effect ({3 + s.steer.length})
          <IChevron size={14} className={showRules ? 'is-up' : ''} />
        </button>
        {showRules && (
          <ul className="rules-list">
            <li><b>Standing rule</b> No recipes over 30 minutes on weekdays <span>you · Sep 14</span></li>
            <li><b>Targets</b> 2,100 kcal · 95 g protein · 25–30 g fiber · carbs even <span>you · Nov 12</span></li>
            <li><b>This task</b> 3 meals + 2 snacks, ~$120/wk, basic cooking <span>you · 7:52 pm</span></li>
            {s.steer.map((x, k) => (
              <li key={k}><b>Steer</b> {x.text} <span>you · {x.time}</span></li>
            ))}
          </ul>
        )}
      </div>
      <div className="thread" ref={scroller}>
        <div className="th-day">Today</div>
        {thread.map((m) => (
          <Message key={m.id} m={m} />
        ))}
        {assistantBusy && (
          <div className="msg msg-ai">
            <div className="typing"><i /><i /><i /></div>
          </div>
        )}
      </div>
      <Composer />
    </aside>
  );
}

function Message({ m }: { m: Msg }) {
  const { go } = useStore();
  if (m.kind === 'event') {
    return (
      <div className="evt">
        <span>{m.text}</span>
        <time>{m.time}</time>
      </div>
    );
  }
  if (m.kind === 'question') return <Question time={m.time} />;
  return (
    <div className={`msg ${m.who === 'assistant' ? 'msg-ai' : 'msg-me'}`}>
      <div className="msg-meta">
        {m.who === 'assistant' ? 'Assistant' : 'You'} · <time>{m.time}</time>
      </div>
      <div className="msg-body">
        {m.blocks.map((b, k) =>
          'p' in b ? (
            b.p ? <p key={k}>{b.p}</p> : null
          ) : 'ul' in b ? (
            <ul key={k}>
              {b.ul.map((x, j) => (
                <li key={j}>{x}</li>
              ))}
            </ul>
          ) : (
            <div key={k} className="msg-links">
              {b.links.map((l, j) => (
                <button key={j} className="msg-link" onClick={() => go(l.day, l.slot)}>
                  {l.label}
                  <IChevronR size={13} />
                </button>
              ))}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function Question({ time }: { time: string }) {
  const { yog, answerYog, days, setRecordOpen, go } = useStore();
  const [own, setOwn] = useState('');
  const [changing, setChanging] = useState(false);
  const uses = days
    .filter((d) => d.def.n <= 9)
    .flatMap((d) => SLOTS.filter((s) => RECIPES[d.def.slots[s]].ing.some((x) => x.tags?.includes('lfy'))).map((s) => ({ day: d.def.n, slot: s })));
  const answered = yog !== null && !changing;

  const interpret = (t: string): Exclude<YogAnswer, null> => {
    const l = t.toLowerCase();
    if (/\b(no|not|avoid|doesn'?t|does not|leave|skip|out)\b/.test(l) && !/\bno problem|no issues?\b/.test(l)) return 'no';
    if (/(limit|small|once|one|occasional|some|cap|max)/.test(l)) return 'limit';
    return 'yes';
  };

  return (
    <div className={`question ${answered ? 'is-answered' : ''}`} id="yog-question">
      <div className="q-head">
        <span className="q-tag">{answered ? 'Answered' : 'Needs your answer'}</span>
        <time>{time}</time>
      </div>
      <p className="q-text">Does “occasional lactose-free yogurt” mean Tom tolerates it?</p>
      <blockquote className="q-quote">
        “Breakfast is usually toast or cereal. Occasional lactose-free yogurt.”
        <button className="btn-link sm" onClick={() => setRecordOpen(true)}>Intake record, Nov 10 →</button>
      </blockquote>
      <p className="q-ctx">
        Lactose-free yogurt is green up to 170 g in the reference, so this is about his own tolerance, not FODMAPs. It’s in {uses.length} drafted item{uses.length === 1 ? '' : 's'}
        {uses.length > 0 && ':'}
      </p>
      {uses.length > 0 && (
        <div className="q-uses">
          {uses.map((u) => (
            <button key={`${u.day}${u.slot}`} className="q-use" onClick={() => go(u.day, u.slot)}>
              Day {u.day} {SLOT_LABEL[u.slot].toLowerCase()}
            </button>
          ))}
        </div>
      )}
      <p className="q-ctx">I’d planned 2 more for days 10–14. I’ve paused here because they depend on it.</p>
      {answered ? (
        <div className="q-answer">
          <ICheck size={14} />
          <span>{YOG_LABEL[yog!]}</span>
          <button className="btn-link sm" onClick={() => setChanging(true)}>Change</button>
        </div>
      ) : (
        <>
          <div className="q-opts">
            {(['yes', 'limit', 'no'] as const).map((a) => (
              <button
                key={a}
                className={`q-opt ${yog === a ? 'is-cur' : ''}`}
                onClick={() => {
                  setChanging(false);
                  if (yog !== a) answerYog(a);
                }}
              >
                <span className="q-opt-k">{a === 'yes' ? 'Tolerates it' : a === 'limit' ? 'Small amounts' : 'Leave it out'}</span>
                <span className="q-opt-d">{a === 'yes' ? 'Keep as planned' : a === 'limit' ? 'Max one serving (170 g) a day' : 'Assistant proposes swaps'}</span>
              </button>
            ))}
          </div>
          <div className="q-own">
            <input
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              placeholder="Or answer in your own words…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && own.trim()) {
                  answerYog(interpret(own), own.trim());
                  setOwn('');
                  setChanging(false);
                }
              }}
            />
            <button
              className="icon-btn"
              disabled={!own.trim()}
              onClick={() => {
                answerYog(interpret(own), own.trim());
                setOwn('');
                setChanging(false);
              }}
              aria-label="Send answer"
            >
              <ISend size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Composer() {
  const { sendSteer, phase, assistantBusy } = useStore();
  const [text, setText] = useState('');
  const chips =
    phase === 'paused' || phase === 'drafting'
      ? ['Make 2 dinners freezer-friendly for night shifts', 'Keep week 2 under $110', 'No tofu more than twice a week', 'Repeat breakfasts to keep shopping simple']
      : ['Keep week 2 under $110', 'No tofu more than twice a week', 'More batch-cook dinners'];
  const send = () => {
    const t = text.trim();
    if (!t) return;
    sendSteer(t);
    setText('');
  };
  return (
    <div className="composer">
      <div className="chips chips-tight">
        {chips.map((c) => (
          <button key={c} className="chip" onClick={() => setText(c)}>{c}</button>
        ))}
      </div>
      <div className="cmp-box">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={phase === 'done' ? 'Ask the assistant or add an instruction…' : 'Steer the remaining days…'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn btn-dark btn-send" disabled={!text.trim() || assistantBusy} onClick={send}>
          <ISend size={14} /> Send
        </button>
      </div>
      <div className="cmp-foot">Enter to send · Nothing reaches Tom until you send the plan</div>
    </div>
  );
}
