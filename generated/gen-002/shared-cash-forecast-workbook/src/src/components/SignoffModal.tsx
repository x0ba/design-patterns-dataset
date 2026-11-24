import { useMemo, useState } from 'react';
import { FLOOR, WEEKS, lineById, person } from '../data';
import { useApp } from '../ctx';
import { V11_END, bridge, breachWeeks, fmtDate, fmtM, fmtMoneyK, fmtTime, weekRange } from '../model';
import { Avatar } from './Avatar';

export function SignoffModal({ onClose }: { onClose: () => void }) {
  const { s, bal, checks, dispatch, now } = useApp();
  const blockers = checks.filter((c) => c.level === 'block');

  const generated = useMemo(() => {
    const low = Math.min(...bal.end);
    const lw = bal.end.indexOf(low);
    const br = bridge(s.edits, 4);
    const lines: string[] = [];
    lines.push(`Cash forecast v12, weeks of ${fmtDate(WEEKS[0])} – ${fmtDate(WEEKS[12])}, 2027. Consolidated, 4 entities.`);
    lines.push('');
    lines.push(`Low point: ${fmtM(low)} in wk ${lw + 1} (${fmtDate(WEEKS[lw])}), ${fmtM(low - FLOOR, true)} vs the $25.0M floor.`);
    lines.push(`Wk 5 ending: ${fmtM(bal.end[4])} vs ${fmtM(V11_END[4]!)} in v11. Main drivers:`);
    br.moving.slice(0, 4).forEach((it) => {
      const note = it.edits.find((e) => e.note)?.note;
      lines.push(`  • ${fmtMoneyK(it.delta, true)}: ${lineById[it.lineId].name} (${lineById[it.lineId].entity}), ${weekRange(it.weeks)}, ${person[it.by].name}${note ? `. ${note}` : '. No explanation recorded'}`);
    });
    const br2 = breachWeeks(bal.end);
    lines.push('');
    if (br2.length) lines.push(`Floor: wk ${br2.map((w) => w + 1).join(', ')} below $25.0M. Mitigation: ${s.floorNote.trim() || '(none written yet)'}`);
    else lines.push('Floor: no week below $25.0M.');
    const mri = s.threads.find((t) => t.id === 't-mri')!;
    const mriMoved = s.edits.some((e) => e.lineId === 'F2' && e.week === 6 && e.by === 'tomas' && e.live);
    if (mri.status === 'resolved' || mri.messages.some((m) => m.by === 'helen'))
      lines.push(`Siemens MRI final milestone ($3.1M): ${mriMoved ? 'moved to wk 7 (net 45 amendment, Siemens countersignature still pending)' : 'kept in wk 5 until the net-45 amendment is countersigned'}.`);
    lines.push(s.payrollLock.holder ? 'Payroll: Raj is still loading the RN contract retro into the Dec 31 cycle (wk 7).' : 'Payroll: RN contract retro ($2.33M + $180K employer taxes) loaded in the Dec 31 cycle (wk 7).');
    const open = s.threads.filter((t) => t.status === 'open');
    if (open.length) lines.push(`Open items for you: ${open.map((t) => t.title).join('; ')}.`);
    lines.push('');
    lines.push('Helen');
    return lines.join('\n');
  }, [bal, s.edits, s.threads, s.floorNote, s.payrollLock.holder]);

  const [memo, setMemo] = useState<string | null>(null);
  const text = memo ?? generated;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Send to Kathleen for sign-off">
        <div className="pop-head">
          <Avatar id="kathleen" size={26} />
          <div>
            <b>Send v12 to Kathleen Moore for sign-off</b>
            <div className="muted small">Kathleen locks and publishes. You can recall it until it's locked.</div>
          </div>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <div className="modal-checks">
            {checks.filter((c) => c.level !== 'info').map((c) => (
              <div key={c.id} className={'mc lvl-' + c.level}>
                <span className="cl-icon">{c.level === 'ok' ? '✓' : c.level === 'block' ? '!' : '~'}</span>
                <span>{c.title}</span>
                {c.level === 'block' && c.actions[0] && (
                  <button className="link" onClick={() => { c.actions[0].run(); onClose(); }}>{c.actions[0].label}</button>
                )}
              </div>
            ))}
          </div>
          <label className="memo">
            <span className="memo-head">
              Cover memo
              {memo != null && <button className="link small" onClick={() => setMemo(null)}>Regenerate from current data</button>}
            </span>
            <textarea rows={15} value={text} onChange={(e) => setMemo(e.target.value)} />
          </label>
        </div>
        <div className="modal-foot">
          {blockers.length > 0 ? (
            <span className="neg small">{blockers.length} item{blockers.length > 1 ? 's' : ''} still block sign-off</span>
          ) : (
            <span className="muted small">Kathleen gets this in Cashweek and by email</span>
          )}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={blockers.length > 0}
            onClick={() => {
              dispatch({ type: 'submit', at: now(), memo: text });
              dispatch({ type: 'toast', text: `Sent to Kathleen Moore at ${fmtTime(now())}` });
              onClose();
            }}
          >
            Send for sign-off
          </button>
        </div>
      </div>
    </>
  );
}
