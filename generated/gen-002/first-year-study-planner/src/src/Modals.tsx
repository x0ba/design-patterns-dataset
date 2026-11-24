import { useEffect, useState, type ReactNode } from 'react';
import { COACHING, COACHING_SLOTS, COURSES } from './data';
import { fmtDay, fmtRange } from './dates';
import { Icon } from './Icon';
import { checklist } from './checklist';
import { uid, useStore } from './store';

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ShareModal() {
  const { s, d, toast } = useStore();
  const [includeWork, setIncludeWork] = useState(true);
  const steps = checklist(s);
  const open = steps.filter((x) => !x.done && x.id !== 'share');
  const close = () => d({ type: 'modal', modal: null });
  const dueCount = s.items.length;

  return (
    <Modal title="Share your plan with Ms. Ortega" onClose={close}>
      <div className="share-who">
        <span className="avatar alt">MO</span>
        <div>
          <strong>Ms. Ortega</strong>
          <div className="muted sm">COLL 100 College Success · Thursdays 1 pm</div>
        </div>
        <span className="badge">Can view, can't edit</span>
      </div>

      <div className="share-sees">
        <div className="eyebrow">She'll see</div>
        <ul>
          <li><Icon name="check" size={14} stroke={3} /> Your 4 courses and class times</li>
          <li><Icon name="check" size={14} stroke={3} /> {dueCount} dates you've entered (readings, papers, exams)</li>
          <li><Icon name="check" size={14} stroke={3} /> Your study block and any week you've planned</li>
          <li><Icon name="check" size={14} stroke={3} /> Your setup checklist progress</li>
        </ul>
        <label className="check-line boxed">
          <input type="checkbox" checked={includeWork} onChange={(e) => setIncludeWork(e.target.checked)} />
          <span>
            <strong>Include my work shifts</strong>
            <span className="muted sm block">Helps her see your real week. Shows only times, not where you work.</span>
          </span>
        </label>
      </div>

      {open.length > 0 && (
        <div className="callout tip">
          <Icon name="info" />
          <div>
            {open.length} step{open.length === 1 ? ' is' : 's are'} still open ({open.map((x) => x.title.toLowerCase()).join(', ')}). That's fine. Share now and she'll see updates as you finish.
          </div>
        </div>
      )}

      <div className="modal-actions">
        <button className="btn ghost" onClick={close}>Not yet</button>
        <button
          className="btn primary"
          onClick={() => {
            d({ type: 'share', includeWork });
            d({ type: 'modal', modal: null });
            toast('Shared with Ms. Ortega. Step 7 done.', { undoable: true });
          }}
        >
          <Icon name="share" size={15} /> Share with Ms. Ortega
        </button>
      </div>
    </Modal>
  );
}

export function CoachingModal() {
  const { d, toast } = useStore();
  const [pick, setPick] = useState(0);
  const close = () => d({ type: 'modal', modal: null });
  return (
    <Modal title="Plan a peer coach drop-in" onClose={close}>
      <p className="muted">
        Drop-ins are {COACHING.hours} in {COACHING.where}. No appointment needed. These times fit around your classes this week:
      </p>
      <div className="slot-list" role="radiogroup">
        {COACHING_SLOTS.map((sl, i) => (
          <button key={i} role="radio" aria-checked={pick === i} className={`slot${pick === i ? ' on' : ''}`} onClick={() => setPick(i)}>
            <span className="radio" />
            <span>
              <strong>{fmtDay(sl.date)}</strong>
              <span className="muted"> · {fmtRange(sl.start, sl.end)}</span>
            </span>
            {i === 0 && <span className="badge">Soonest</span>}
          </button>
        ))}
      </div>
      <p className="sm muted">Bring: your {COURSES.filter((c) => c.id !== 'coll100').map((c) => c.code).join(', ')} syllabi and this planner open on your phone or laptop.</p>
      <div className="modal-actions">
        <button className="btn ghost" onClick={close}>Cancel</button>
        <button
          className="btn primary"
          onClick={() => {
            const sl = COACHING_SLOTS[pick];
            d({ type: 'addBlock', block: { id: uid('coach'), kind: 'coaching', title: 'Peer coach drop-in', sub: 'Learning Commons 120', date: sl.date, start: sl.start, end: sl.end } });
            d({ type: 'modal', modal: null });
            toast(`Drop-in added: ${fmtDay(sl.date)}, ${fmtRange(sl.start, sl.end)}`, { undoable: true });
          }}
        >
          Add to my week
        </button>
      </div>
    </Modal>
  );
}
