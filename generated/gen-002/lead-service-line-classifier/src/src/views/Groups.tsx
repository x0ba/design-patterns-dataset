import { useMemo, useState } from 'react';
import type { Decision, LineRecord } from '../types';
import { REVIEWER, fmtDate, flagsFor } from '../lib/model';
import type { BatchStats } from '../lib/stats';
import { ClsChip, ConfChip, DecisionChip, MethodText, Panel } from '../components/ui';

export type GroupTab = 'grr' | 'conflicts';

interface Props {
  lines: LineRecord[];
  decisions: Record<string, Decision>;
  stats: BatchStats;
  tab: GroupTab;
  onTab: (t: GroupTab) => void;
  onOpen: (id: string, listIds: string[]) => void;
  openId: string | null;
  setDecision: (ids: string[], d: Decision | null) => void;
}

function short(text: string, n = 96): string {
  return text.length > n ? `${text.slice(0, n - 1)}…` : text;
}

export function Groups({ lines, decisions, stats, tab, onTab, onOpen, openId, setDecision }: Props) {
  const grr = useMemo(
    () => lines.filter((l) => l.status === 'proposed' && l.utility?.cls === 'GRR'),
    [lines],
  );
  const conflicts = useMemo(
    () => lines.filter((l) => l.status === 'proposed' && (stats.flagsById.get(l.id) ?? []).includes('conflict')),
    [lines, stats],
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Northgate · group review</div>
          <h1>Groups and conflicts</h1>
          <p className="sub">Decide these together, since they share one cause. Lines in a group can still be opened one by one.</p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'grr'} className={`tab ${tab === 'grr' ? 'on' : ''}`} onClick={() => onTab('grr')}>
          Galvanized requiring replacement <span className="count-pill">{grr.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'conflicts'}
          className={`tab ${tab === 'conflicts' ? 'on' : ''}`}
          onClick={() => onTab('conflicts')}
        >
          2024 field-verification conflicts <span className="count-pill block">{conflicts.length}</span>
        </button>
      </div>

      {tab === 'grr' ? (
        <GrrGroup grr={grr} decisions={decisions} stats={stats} onOpen={onOpen} openId={openId} setDecision={setDecision} />
      ) : (
        <Conflicts conflicts={conflicts} decisions={decisions} stats={stats} onOpen={onOpen} openId={openId} setDecision={setDecision} />
      )}
    </div>
  );
}

function GrrGroup({
  grr,
  decisions,
  stats,
  onOpen,
  openId,
  setDecision,
}: {
  grr: LineRecord[];
  decisions: Record<string, Decision>;
  stats: BatchStats;
  onOpen: Props['onOpen'];
  openId: string | null;
  setDecision: Props['setDecision'];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const hasUnlink = (l: LineRecord) => (stats.flagsById.get(l.id) ?? []).includes('grr_unlinked');
  const linked = grr.filter((l) => !hasUnlink(l));
  const unlinked = grr.filter(hasUnlink);
  const linkedOpen = linked.filter((l) => !decisions[l.id]);
  const unlinkedOpen = unlinked.filter((l) => !decisions[l.id]);

  const acceptLinked = () => {
    if (linkedOpen.length === 0) return;
    if (!window.confirm(`Accept ${linkedOpen.length} GRR lines that have a documented lead link?\n\nEach becomes accepted under your initials. You can clear any one of them later.`)) return;
    const at = new Date().toISOString();
    setDecision(linkedOpen.map((l) => l.id), { status: 'accepted', by: REVIEWER.initials, at, note: 'Bulk accept: galvanized run downstream of a documented lead connection (§3.2).' });
    setMessage(`Accepted ${linkedOpen.length} lines.`);
  };

  const sendUnlinked = () => {
    if (unlinkedOpen.length === 0) return;
    const at = new Date().toISOString();
    setDecision(
      unlinkedOpen.map((l) => l.id),
      {
        status: 'field_dig',
        by: REVIEWER.initials,
        at,
        note: 'No lead link is documented, so GRR is not supported on the record (§3.2). Field dig to confirm what the galvanized run connects to.',
      },
    );
    setMessage(`Sent ${unlinkedOpen.length} lines to field dig.`);
  };

  return (
    <>
      <div className="summary-strip">
        <div className="tile">
          <div className="tile-label">Proposed GRR</div>
          <div className="tile-value">{grr.length}</div>
          <div className="small muted">{grr.every((l) => l.confidence === 'high') ? 'All at high confidence' : 'Mixed confidence'}</div>
        </div>
        <div className="tile tile-ok">
          <div className="tile-label">Lead link documented</div>
          <div className="tile-value">{linked.length}</div>
          <div className="small muted">
            Tap card or field record shows lead upstream of the galvanized run. {linkedOpen.length} still open.
          </div>
        </div>
        <div className="tile tile-warn">
          <div className="tile-label">No lead link documented</div>
          <div className="tile-value">{unlinked.length}</div>
          <div className="small muted">
            {stats.grrNeighborHigh} rest on neighbor inference alone, which §4.4 caps at medium. {unlinkedOpen.length} still open.
          </div>
        </div>
      </div>

      <Panel
        title="Accept or send as a group"
        actions={
          <div className="btn-row">
            <button className="btn primary" disabled={linkedOpen.length === 0} onClick={acceptLinked}>
              Accept the {linkedOpen.length} with a lead link
            </button>
            <button className="btn" disabled={unlinkedOpen.length === 0} onClick={sendUnlinked}>
              Send the {unlinkedOpen.length} without one to field dig
            </button>
          </div>
        }
      >
        <p className="small">
          A galvanized service is GRR only if it is or was downstream of lead (§3.2). Galvanized iron with no lead link is non-lead.
          The bulk actions only touch lines with no decision yet. Accepted lines are still listed here and can be cleared one by one.
        </p>
        {message && <p className="small ok-msg">{message}</p>}
      </Panel>

      <GroupTable lines={grr} decisions={decisions} onOpen={onOpen} openId={openId} />
    </>
  );
}

function Conflicts({
  conflicts,
  decisions,
  stats,
  onOpen,
  openId,
  setDecision,
}: {
  conflicts: LineRecord[];
  decisions: Record<string, Decision>;
  stats: BatchStats;
  onOpen: Props['onOpen'];
  openId: string | null;
  setDecision: Props['setDecision'];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const open = conflicts.filter((l) => !decisions[l.id]);
  const byResult = {
    GRR: conflicts.filter((l) => l.fv2024?.cls === 'GRR').length,
    NON_LEAD: conflicts.filter((l) => l.fv2024?.cls === 'NON_LEAD').length,
    LEAD: conflicts.filter((l) => l.fv2024?.cls === 'LEAD').length,
  };
  const neighborBased = conflicts.filter((l) => l.utility?.method === 'neighbor').length;
  const allCopper = conflicts.every((l) => l.utility?.material === 'Copper');

  const useFieldResult = (l: LineRecord) => {
    if (!l.fv2024) return;
    const at = new Date().toISOString();
    setDecision([l.id], {
      status: 'overridden',
      utility: { cls: l.fv2024.cls, material: l.fv2024.material },
      customer: l.customer ? { cls: l.customer.cls, material: l.customer.material } : undefined,
      note: `Overridden to the 2024 field result: ${l.fv2024.ref} (${l.fv2024.date}) found ${l.fv2024.material}. A field verification outranks the proposal (§4.5).`,
      by: REVIEWER.initials,
      at,
    });
  };

  const fieldDigOne = (l: LineRecord) => {
    setDecision([l.id], {
      status: 'field_dig',
      by: REVIEWER.initials,
      at: new Date().toISOString(),
      note: `Conflicts with ${l.fv2024?.ref ?? '2024 verification'}. Re-excavate to settle the material before classifying.`,
    });
  };

  const fieldDigAll = () => {
    if (open.length === 0) return;
    if (!window.confirm(`Send ${open.length} open conflicts to field dig?`)) return;
    const at = new Date().toISOString();
    setDecision(
      open.map((l) => l.id),
      { status: 'field_dig', by: REVIEWER.initials, at, note: 'Conflicts with a 2024 field verification. Re-excavate to settle the material.' },
    );
    setMessage(`Sent ${open.length} conflicts to field dig.`);
  };

  return (
    <>
      <div className="summary-strip">
        <div className="tile tile-warn">
          <div className="tile-label">Contradicting proposals</div>
          <div className="tile-value">{conflicts.length}</div>
          <div className="small muted">
            {stats.permitUnstatedInConflict} rest on a permit naming no material; {neighborBased} on neighbor inference. {open.length} still open.
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">What the 2024 digs found</div>
          <div className="tile-value small-value">
            {byResult.GRR} GRR · {byResult.NON_LEAD} galvanized, no lead · {byResult.LEAD} lead
          </div>
          <div className="small muted">{allCopper ? 'Every one of these proposals said copper.' : 'Not every proposal here said copper.'}</div>
        </div>
        <div className="tile">
          <div className="tile-label">Rule</div>
          <div className="tile-value small-value">Field verification governs</div>
          <div className="small muted">§4.5 applies from any year. An open conflict cannot be accepted.</div>
        </div>
      </div>

      <Panel
        title="Resolve as a group"
        actions={
          <button className="btn" disabled={open.length === 0} onClick={fieldDigAll}>
            Send the {open.length} open to field dig
          </button>
        }
      >
        <p className="small">
          Use the field result to override a proposal when the excavation is clear and you accept it. Send to field dig when you want
          the line dug again first. An open conflict is never accepted as proposed.
        </p>
        {message && <p className="small ok-msg">{message}</p>}
      </Panel>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Line</th>
              <th>Address · parcel</th>
              <th>Assistant proposed (utility)</th>
              <th>2024 field verification</th>
              <th>Decision</th>
              <th>Resolve</th>
            </tr>
          </thead>
          <tbody>
            {conflicts.map((l) => {
              const d = decisions[l.id];
              const fv = l.fv2024;
              const sel = openId === l.id;
              return (
                <tr key={l.id} className={`row-conflict ${sel ? 'selected' : ''}`}>
                  <td className="mono small" onClick={() => onOpen(l.id, conflicts.map((x) => x.id))}>
                    {l.id}
                  </td>
                  <td onClick={() => onOpen(l.id, conflicts.map((x) => x.id))}>
                    <div>{l.address}</div>
                    <div className="mono small muted">{l.parcelId}</div>
                  </td>
                  <td>
                    <div className="side-cell">
                      <ClsChip cls={l.utility!.cls} />
                      <span className="material">{l.utility!.material}</span>
                    </div>
                    <div className="small">
                      <MethodText m={l.utility!.method} /> <ConfChip c={l.confidence} />
                    </div>
                    <div className="small muted">{short(l.utility!.sources[0]?.ref ?? '', 60)}</div>
                  </td>
                  <td>
                    {fv && (
                      <>
                        <div className="side-cell">
                          <ClsChip cls={fv.cls} />
                          <span className="material">{fv.material}</span>
                        </div>
                        <div className="small muted">
                          {fv.ref} · {fmtDate(fv.date)} · {fv.crew}
                        </div>
                        <div className="small">{short(fv.text, 110)}</div>
                      </>
                    )}
                  </td>
                  <td>
                    <DecisionChip d={d} />
                    {d && <div className="small muted">{d.by}</div>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn small-btn" onClick={() => useFieldResult(l)} disabled={!!d && d.status === 'overridden'}>
                        Use field result
                      </button>
                      <button className="btn small-btn" onClick={() => fieldDigOne(l)} disabled={!!d && d.status === 'field_dig'}>
                        Field dig
                      </button>
                      <button className="btn small-btn ghost" onClick={() => onOpen(l.id, conflicts.map((x) => x.id))}>
                        Open
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Utility-side classes are compared to the field result. Customer-side classes are unchanged by these actions.
      </p>
    </>
  );
}

function GroupTable({
  lines,
  decisions,
  onOpen,
  openId,
}: {
  lines: LineRecord[];
  decisions: Record<string, Decision>;
  onOpen: Props['onOpen'];
  openId: string | null;
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Line</th>
            <th>Address · parcel</th>
            <th className="num">Built</th>
            <th>Evidence (first cited record)</th>
            <th>Lead link</th>
            <th>Method</th>
            <th>Conf.</th>
            <th>Flags</th>
            <th>Decision</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const first = l.utility!.sources[0];
            const link = l.utility!.sources.some((s) => s.documentsLeadLink);
            const flags = flagsFor(l);
            return (
              <tr
                key={l.id}
                className={openId === l.id ? 'selected' : ''}
                onClick={() => onOpen(l.id, lines.map((x) => x.id))}
              >
                <td className="mono small">{l.id}</td>
                <td>
                  <div>{l.address}</div>
                  <div className="mono small muted">{l.parcelId}</div>
                </td>
                <td className="num">{l.builtYear}</td>
                <td>
                  <div className="small">{first ? short(first.text, 84) : '—'}</div>
                  <div className="small muted">{first?.ref}</div>
                </td>
                <td>{link ? <span className="chip tag tag-ok">Yes</span> : <span className="chip tag tag-warn">No</span>}</td>
                <td>
                  <MethodText m={l.utility!.method} />
                </td>
                <td>
                  <ConfChip c={l.confidence} />
                </td>
                <td>
                  {flags.length === 0 ? (
                    <span className="muted small">None</span>
                  ) : (
                    <span className="small">{flags.map((f) => f.label).join('; ')}</span>
                  )}
                </td>
                <td>
                  <DecisionChip d={decisions[l.id]} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="small muted">
        A galvanized line with no lead link is non-lead, not GRR (§3.2). Flagged lines are listed with their rule.
      </p>
    </div>
  );
}
