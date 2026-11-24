import { useEffect, useState, type ReactNode } from 'react';
import { nowMs, useStore } from '../store';
import { LEADERS, groupById, type Leader } from '../data/community';

export const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
export const dur = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, '0')}m`;
};
export const dayTime = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + hhmm(ms);

export function useNow(intervalMs = 15000) {
  const [n, setN] = useState(nowMs());
  useEffect(() => {
    const id = setInterval(() => setN(nowMs()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return n;
}

type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
export function Btn(props: { kind?: BtnKind; onClick?: () => void; children: ReactNode; disabled?: boolean; small?: boolean; title?: string; type?: 'button' | 'submit' }) {
  const { kind = 'secondary', small, ...rest } = props;
  return (
    <button type={props.type ?? 'button'} className={`btn btn-${kind}${small ? ' btn-sm' : ''}`} onClick={rest.onClick} disabled={rest.disabled} title={rest.title}>
      {rest.children}
    </button>
  );
}

export type Tone = 'red' | 'amber' | 'violet' | 'teal' | 'slate' | 'green' | 'blue';
export const Pill = ({ tone = 'slate', children, solid }: { tone?: Tone; children: ReactNode; solid?: boolean }) => (
  <span className={`pill pill-${tone}${solid ? ' pill-solid' : ''}`}>{children}</span>
);

export const Avatar = ({ initials, tone = 'slate', size = 28 }: { initials: string; tone?: string; size?: number }) => (
  <span className={`avatar av-${tone}`} style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>
);

export const StatusDot = ({ status }: { status: Leader['status'] }) => (
  <span className={`dot dot-${status}`} aria-hidden />
);
export const STATUS_LABEL: Record<Leader['status'], string> = { shift: 'On shift', session: 'In session', off: 'Off' };

export function Modal({ title, sub, onClose, children, footer, width = 620 }: { title: string; sub?: ReactNode; onClose: () => void; children: ReactNode; footer: ReactNode; width?: number }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="modal-body">{children}</div>
        <footer className="modal-foot">{footer}</footer>
      </div>
    </div>
  );
}

export function ToastHost() {
  const toast = useStore((s) => s.toast);
  const undo = useStore((s) => s.undo);
  const dismiss = useStore((s) => s.dismissToast);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(dismiss, toast.undo ? 7000 : 4000);
    return () => clearTimeout(id);
  }, [toast, dismiss]);
  if (!toast) return null;
  return (
    <div className="toast" key={toast.id} role="status">
      <span className="toast-check">✓</span>
      <span>{toast.text}</span>
      {toast.undo && <button className="toast-undo" onClick={undo}>Undo</button>}
      <button className="toast-x" onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}

/** Ranks leaders for a hand-off: covers the group and on shift first. */
export function rankLeaders(groupIds: string[]) {
  const covers = (l: Leader) => groupIds.some((gid) => groupById(gid).leaders.includes(l.id));
  const order = { shift: 0, session: 1, off: 2 } as const;
  return [...LEADERS].sort((a, b) => {
    const ca = covers(a) ? 0 : 1, cb = covers(b) ? 0 : 1;
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return ca - cb;
  }).map((l) => ({ leader: l, covers: covers(l) }));
}

export function AssignModal({ title, sub, groupIds, defaultNote, onClose, onAssign, confirmLabel = 'Hand off' }: {
  title: string; sub?: ReactNode; groupIds: string[]; defaultNote: string; onClose: () => void;
  onAssign: (leaderId: string, note: string) => void; confirmLabel?: string;
}) {
  const handoffs = useStore((s) => s.handoffs);
  const ranked = rankLeaders(groupIds);
  const [sel, setSel] = useState<string>(ranked.find((r) => r.leader.status === 'shift' && r.covers)?.leader.id ?? ranked[0].leader.id);
  const [note, setNote] = useState(defaultNote);
  return (
    <Modal title={title} sub={sub} onClose={onClose} width={680}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => onAssign(sel, note)}>{confirmLabel} to {LEADERS.find((l) => l.id === sel)!.name.split(' ')[0]}</Btn></>}>
      <div className="field-label">Orientation leader</div>
      <div className="leader-pick">
        {ranked.map(({ leader: l, covers }) => (
          <label key={l.id} className={`leader-opt${sel === l.id ? ' on' : ''}${l.status === 'off' ? ' dim' : ''}`}>
            <input type="radio" name="leader" checked={sel === l.id} onChange={() => setSel(l.id)} />
            <Avatar initials={l.initials} size={26} tone={l.status === 'shift' ? 'teal' : 'slate'} />
            <span className="lo-main">
              <span className="lo-name">{l.name}{covers && <span className="lo-covers">covers this group</span>}</span>
              <span className="lo-sub"><StatusDot status={l.status} />{l.statusNote}</span>
            </span>
            <span className="lo-load">{handoffs[l.id] ?? 0} open</span>
          </label>
        ))}
      </div>
      <label className="field-label" htmlFor="handoff-note">Note to leader</label>
      <textarea id="handoff-note" className="textarea" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  );
}

export const Check = ({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) => (
  <label className="check">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{children}</span>
  </label>
);

export const Empty = ({ children }: { children: ReactNode }) => <div className="empty">{children}</div>;
