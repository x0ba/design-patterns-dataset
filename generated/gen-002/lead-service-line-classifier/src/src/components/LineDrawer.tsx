import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Cls, Decision, LineRecord, Source, SideOverride, SideProposal } from '../types';
import { CLS_NAME, flagsFor, fmtStamp, overrideFromSides, REVIEWER, type Flag } from '../lib/model';
import { ClsChip, ConfChip, DecisionChip, FlagChip, MethodText } from './ui';

const SOURCE_KIND: Record<Source['kind'], string> = {
  tap_card: 'Tap card',
  permit: 'Permit',
  field_verification: 'Field verification',
  neighbor_record: 'Neighbor record',
};

const MATERIAL_SUGGESTIONS = [
  'Lead',
  'Lead goose-neck',
  'Galvanized iron',
  'Copper',
  'Polyethylene (PE)',
  'PVC',
  'Unknown',
  'Unknown (leaning galvanized)',
  'Unknown (leaning copper)',
];

const CLS_OPTIONS: Cls[] = ['LEAD', 'GRR', 'NON_LEAD', 'UNKNOWN'];

interface Props {
  line: LineRecord;
  decision: Decision | undefined;
  position: { index: number; total: number } | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onDecide: (ids: string[], d: Decision | null) => void;
}

export function LineDrawer({ line, decision, position, onClose, onPrev, onNext, onDecide }: Props) {
  const flags = useMemo(() => flagsFor(line), [line]);
  const blocking = flags.some((f) => f.blocking);
  const warnings = flags.filter((f) => !f.blocking);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [ovUtil, setOvUtil] = useState<SideOverride>({ cls: 'NON_LEAD', material: '' });
  const [ovCust, setOvCust] = useState<SideOverride>({ cls: 'UNKNOWN', material: '' });
  const [ovNote, setOvNote] = useState('');

  // Reset local editing state whenever the reviewer moves to a different line.
  useEffect(() => {
    setNote('');
    setEditing(false);
    setOvNote('');
    const base = overrideFromSides(line);
    if (base) {
      setOvUtil(decision?.utility ?? base.utility);
      setOvCust(decision?.customer ?? base.customer);
    }
  }, [line, decision]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'j') onNext?.();
      if (e.key === 'ArrowLeft' || e.key === 'k') onPrev?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNext, onPrev]);

  const now = () => new Date().toISOString();
  const queued = line.status === 'queued' || !line.utility || !line.customer;

  if (queued || !line.utility || !line.customer) {
    return (
      <Shell line={line} position={position} onClose={onClose} onPrev={onPrev} onNext={onNext}>
        <div className="queued-note">
          <strong>Not yet proposed.</strong>
          <p>
            Built {line.builtYear}. The assistant has not written a proposal for this address. It is in block {line.block} and will be
            processed in the next run. There is nothing to review yet.
          </p>
        </div>
      </Shell>
    );
  }

  const utility = line.utility;
  const customer = line.customer;

  const acceptDisabled = blocking || (warnings.length > 0 && note.trim().length === 0);

  const accept = () => {
    onDecide([line.id], {
      status: 'accepted',
      note: note.trim() || undefined,
      by: REVIEWER.initials,
      at: now(),
    });
  };

  const fieldDig = () => {
    const reason = note.trim() || (flags.length ? `Field dig to resolve: ${flags.map((f) => f.label).join('; ')}.` : 'Field dig to confirm the classification.');
    onDecide([line.id], { status: 'field_dig', note: reason, by: REVIEWER.initials, at: now() });
  };

  const hold = () => {
    onDecide([line.id], { status: 'held', note: note.trim() || undefined, by: REVIEWER.initials, at: now() });
  };

  const saveOverride = () => {
    if (!ovNote.trim()) return;
    onDecide([line.id], {
      status: 'overridden',
      utility: { cls: ovUtil.cls, material: ovUtil.material.trim() || CLS_NAME[ovUtil.cls] },
      customer: { cls: ovCust.cls, material: ovCust.material.trim() || CLS_NAME[ovCust.cls] },
      note: ovNote.trim(),
      by: REVIEWER.initials,
      at: now(),
    });
    setEditing(false);
  };

  const clear = () => onDecide([line.id], null);

  return (
    <Shell line={line} position={position} onClose={onClose} onPrev={onPrev} onNext={onNext}>
      <div className="drawer-summary">
        <ConfChip c={line.confidence} />
        <MethodText m={utility.method} />
        <span className="muted small">Utility-side confidence</span>
        <span className="spacer" />
        <DecisionChip d={decision} />
      </div>

      {flags.length > 0 && (
        <div className="flag-box">
          {flags.map((f) => (
            <FlagRow key={f.code} f={f} />
          ))}
        </div>
      )}

      {line.fv2024 && (
        <div className={`fv-box ${flags.some((f) => f.code === 'conflict') ? 'fv-conflict' : 'fv-agree'}`}>
          <div className="fv-title">
            2024 field verification · {line.fv2024.ref} · {line.fv2024.date} · {line.fv2024.crew}
          </div>
          <div className="fv-compare">
            <div>
              <span className="label">Assistant proposed</span>
              <div>
                {utility.material} <ClsChip cls={utility.cls} />
              </div>
            </div>
            <div>
              <span className="label">Field found</span>
              <div>
                {line.fv2024.material} <ClsChip cls={line.fv2024.cls} />
              </div>
            </div>
          </div>
          <p className="small">{line.fv2024.text}</p>
        </div>
      )}

      <div className="kv-grid">
        <div>
          <span className="label">Address</span>
          <div>{line.address}</div>
        </div>
        <div>
          <span className="label">Parcel</span>
          <div className="mono">{line.parcelId}</div>
        </div>
        <div>
          <span className="label">Built</span>
          <div>{line.builtYear}</div>
        </div>
        <div>
          <span className="label">Install year</span>
          <div>
            {line.installYear}
            <span className="muted small"> · {line.installBasis}</span>
          </div>
        </div>
      </div>

      <SideCard title="Utility side (city-owned)" side={utility} />
      <SideCard title="Customer side (private)" side={customer} />

      <div className="decision-box">
        <div className="panel-head small-head">
          <h3>Your decision</h3>
          {decision && (
            <button className="link" onClick={clear}>
              Clear decision
            </button>
          )}
        </div>

        {decision && (
          <div className="decided">
            <DecisionChip d={decision} />
            <span className="small muted">
              {REVIEWER.initials} · {fmtStamp(decision.at)}
            </span>
            {decision.note && <p className="small">{decision.note}</p>}
            {decision.status === 'overridden' && decision.utility && (
              <p className="small">
                Utility: {decision.utility.material} ({CLS_NAME[decision.utility.cls]}) · Customer:{' '}
                {decision.customer?.material} ({CLS_NAME[decision.customer?.cls ?? 'UNKNOWN']})
              </p>
            )}
          </div>
        )}

        {!editing && (
          <>
            {blocking && (
              <p className="block-msg">
                Cannot accept. A 2024 field verification contradicts this proposal. Override to the field result or send it to field dig.
              </p>
            )}
            {!blocking && warnings.length > 0 && (
              <p className="warn-msg">Flagged. Add a note explaining why the proposal stands before accepting.</p>
            )}
            <label className="field">
              <span className="label">Note {warnings.length > 0 ? '(required to accept)' : '(optional)'}</span>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={warnings.length > 0 ? 'Why the proposal stands despite the flag' : 'Reason, source you checked, or a follow-up'}
              />
            </label>
            <div className="btn-row">
              <button className="btn primary" disabled={acceptDisabled} onClick={accept}>
                Accept and vouch
              </button>
              <button className="btn" onClick={() => setEditing(true)}>
                Override…
              </button>
              <button className="btn" onClick={fieldDig}>
                Send to field dig
              </button>
              <button className="btn ghost" onClick={hold}>
                Hold
              </button>
            </div>
          </>
        )}

        {editing && (
          <div className="override">
            <p className="small muted">Your classification replaces the proposal in the working file. Explain the basis in the note.</p>
            <OverrideFields label="Utility side" value={ovUtil} onChange={setOvUtil} />
            <OverrideFields label="Customer side" value={ovCust} onChange={setOvCust} />
            <label className="field">
              <span className="label">Basis for override (required)</span>
              <textarea rows={2} value={ovNote} onChange={(e) => setOvNote(e.target.value)} placeholder="Cite the record or field check that supports this" />
            </label>
            <div className="btn-row">
              <button className="btn primary" disabled={!ovNote.trim()} onClick={saveOverride}>
                Save override
              </button>
              <button className="btn ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({
  line,
  position,
  onClose,
  onPrev,
  onNext,
  children,
}: {
  line: LineRecord;
  position: { index: number; total: number } | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  children: ReactNode;
}) {
  return (
    <aside className="drawer" aria-label={`Line ${line.id}`}>
      <header className="drawer-head">
        <div>
          <div className="small muted mono">
            {line.id} · block {line.block}
          </div>
          <h2>{line.address}</h2>
        </div>
        <div className="drawer-nav">
          {position && (
            <span className="small muted">
              {position.index} of {position.total}
            </span>
          )}
          <button className="icon-btn" onClick={onPrev} disabled={!onPrev} aria-label="Previous line (k)">
            ‹
          </button>
          <button className="icon-btn" onClick={onNext} disabled={!onNext} aria-label="Next line (j)">
            ›
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="Close (Esc)">
            ×
          </button>
        </div>
      </header>
      <div className="drawer-body">{children}</div>
    </aside>
  );
}

function FlagRow({ f }: { f: Flag }) {
  return (
    <div className={`flag-row ${f.blocking ? 'block' : 'warn'}`}>
      <div>
        <FlagChip code={f.code} />
        <span className="small muted"> rule {f.rule}</span>
      </div>
      <p className="small">{f.detail}</p>
    </div>
  );
}

function SideCard({ title, side }: { title: string; side: SideProposal }) {
  return (
    <div className="side-card">
      <div className="side-head">
        <h3>{title}</h3>
        <ClsChip cls={side.cls} />
      </div>
      <div className="side-meta">
        <strong>{side.material}</strong>
        <span className="muted small">{CLS_NAME[side.cls]}</span>
        <MethodText m={side.method} />
      </div>
      <div className="reasoning">
        <span className="label">Assistant reasoning</span>
        <p>{side.reasoning}</p>
      </div>
      <div className="sources">
        <span className="label">Cited sources ({side.sources.length})</span>
        {side.sources.length === 0 && <p className="small muted">None. No customer-side record exists for this parcel.</p>}
        {side.sources.map((s, i) => (
          <div className="source" key={i}>
            <div className="source-head">
              <span className={`kind kind-${s.kind}`}>{SOURCE_KIND[s.kind]}</span>
              <span className="mono small">{s.ref}</span>
              <span className="small muted">{s.date}</span>
              {s.documentsLeadLink && <span className="chip tag">lead link documented</span>}
              {s.statesMaterial === false && <span className="chip tag tag-warn">no material stated</span>}
            </div>
            <div className="source-text">{s.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverrideFields({ label, value, onChange }: { label: string; value: SideOverride; onChange: (v: SideOverride) => void }) {
  const id = `mat-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="override-side">
      <span className="label">{label}</span>
      <div className="override-row">
        <select value={value.cls} onChange={(e) => onChange({ ...value, cls: e.target.value as Cls })} aria-label={`${label} class`}>
          {CLS_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {CLS_NAME[c]}
            </option>
          ))}
        </select>
        <input
          list={id}
          value={value.material}
          placeholder="Material as recorded"
          onChange={(e) => onChange({ ...value, material: e.target.value })}
          aria-label={`${label} material`}
        />
        <datalist id={id}>
          {MATERIAL_SUGGESTIONS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

