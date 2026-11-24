import type { BatchStats } from '../lib/stats';
import { ACTIVITY, CITYWIDE, CITYWIDE_TOTAL } from '../data/citywide';
import { CLS_NAME, daysBetween, fmtDate, fmtInt, fmtStamp, pct, BATCH, ASOF } from '../lib/model';
import { Panel, ProgressBar, Stacked } from '../components/ui';
import type { Nav } from '../App';

interface Props {
  stats: BatchStats;
  go: Nav;
  onLocalChanges: boolean;
}

export function Overview({ stats, go, onLocalChanges }: Props) {
  const meta = BATCH.meta;
  const daysLeft = daysBetween(ASOF, meta.dueDate);
  const partial = stats.blocks.find((b) => b.proposed > 0 && b.proposed < b.total);
  const firstQueued = stats.blocks.find((b) => b.proposed === 0);
  const lastBlock = stats.blocks[stats.blocks.length - 1];
  const queuedText =
    partial && firstQueued
      ? `The last ${partial.total - partial.proposed} addresses of block ${partial.block}, and blocks ${firstQueued.block} to ${lastBlock.block}, wait for the next run.`
      : `Blocks ${firstQueued?.block ?? ''} to ${lastBlock.block} wait for the next run.`;

  const needs = [
    {
      count: stats.grr,
      title: 'Galvanized requiring replacement (GRR) proposals',
      body: `${stats.grrUnlinked} of ${stats.grr} have no documented lead link. ${stats.grrNeighborHigh} of those rest on neighbor inference at high confidence.`,
      cta: 'Review the GRR group',
      go: () => go('groups', { tab: 'grr' }),
    },
    {
      count: stats.conflicts,
      title: 'Proposals that contradict a 2024 field verification',
      body: 'Each one proposes copper on a line where the 2024 excavation found galvanized or lead. They cannot be accepted until resolved.',
      cta: 'Resolve the conflicts',
      go: () => go('groups', { tab: 'conflicts' }),
    },
    {
      count: stats.permitUnstated,
      title: 'Copper proposals that rest on a permit naming no material',
      body: `${stats.permitUnstatedInConflict} of these are among the conflicts above. The other ${stats.permitUnstated - stats.permitUnstatedInConflict} have no field check.`,
      cta: 'Show these proposals',
      go: () => go('proposals', { flag: 'permit_unstated' }),
    },
    {
      count: stats.low,
      title: 'Low-confidence proposals',
      body: 'Mostly Unknown. The rest are copper from a permit that names no material, and galvanized inferred from neighboring services.',
      cta: 'Show low confidence',
      go: () => go('proposals', { conf: 'low' }),
    },
    {
      count: stats.customerLead,
      title: 'Customer-side lead pigtails found at the meter in 2024',
      body: 'Direct field observations. Confirm these before the customer side is reported as lead.',
      cta: 'Show customer-side lead',
      go: () => go('proposals', { customer: 'LEAD' }),
    },
    {
      count: stats.queued,
      title: 'Addresses not yet proposed',
      body: queuedText,
      cta: 'Show queued addresses',
      go: () => go('proposals', { conf: 'queued' }),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{meta.utility}</div>
          <h1>{meta.zone}</h1>
          <p className="sub">
            {meta.purpose} · Batch {meta.batchId} · {meta.totalLines} service lines built {meta.builtRange[0]}–{meta.builtRange[1]}
          </p>
        </div>
        <div className="due-card">
          <div className="small muted">State submission due</div>
          <div className="due-date">{fmtDate(meta.dueDate)}</div>
          <div className="small">
            <strong>{daysLeft} days</strong> from {fmtDate(ASOF)}
          </div>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Proposed by the assistant</div>
          <div className="kpi-value">
            {stats.proposed} <span className="of">of {stats.total}</span>
          </div>
          <ProgressBar value={stats.proposed} max={stats.total} label="Proposals complete" />
          <div className="kpi-foot">{stats.queued} addresses queued · {meta.runLabel}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Confidence of proposals</div>
          <div className="kpi-value conf-split">
            <span className="c-high">{stats.high}</span>
            <span className="c-med">{stats.medium}</span>
            <span className="c-low">{stats.low}</span>
          </div>
          <Stacked
            parts={[
              { value: stats.high, cls: 'seg-high', label: 'High' },
              { value: stats.medium, cls: 'seg-medium', label: 'Medium' },
              { value: stats.low, cls: 'seg-low', label: 'Low' },
            ]}
          />
          <div className="kpi-foot">High · medium · low, utility side</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Your decisions</div>
          <div className="kpi-value">
            {stats.decided} <span className="of">of {stats.proposed} decided</span>
          </div>
          <ProgressBar value={stats.decided} max={stats.proposed} label="Decisions made" />
          <div className="kpi-foot">
            {stats.accepted} accepted · {stats.overridden} overridden · {stats.fieldDig} field dig · {stats.open} open
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Citywide unknown lines</div>
          <div className="kpi-value">
            {fmtInt(CITYWIDE[3].count)} <span className="of">of {fmtInt(CITYWIDE_TOTAL)}</span>
          </div>
          <div className="kpi-foot">The {meta.totalLines} Northgate lines are part of this unknown count.</div>
        </div>
      </div>

      <div className="grid-2">
        <Panel
          title={
            <>
              Needs your decision <span className="count-pill">{needs.length} items</span>
            </>
          }
        >
          <ul className="needs">
            {needs.map((n) => (
              <li key={n.title} className="need">
                <div className="need-count">{n.count}</div>
                <div className="need-body">
                  <div className="need-title">{n.title}</div>
                  <div className="small muted">{n.body}</div>
                </div>
                <button className="btn" onClick={n.go}>
                  {n.cta}
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="stack">
          <Panel title="Citywide inventory" className="panel-tight">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num">Lines</th>
                  <th className="num">Share</th>
                </tr>
              </thead>
              <tbody>
                {CITYWIDE.map((r) => (
                  <tr key={r.cls}>
                    <td>{CLS_NAME[r.cls]}</td>
                    <td className="num">{fmtInt(r.count)}</td>
                    <td className="num">{pct(r.count, CITYWIDE_TOTAL)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Total</td>
                  <td className="num">{fmtInt(CITYWIDE_TOTAL)}</td>
                  <td className="num">100%</td>
                </tr>
              </tbody>
            </table>
            <p className="small muted">Synced {fmtStamp(meta.citywideSyncedAt)}. Your local decisions are not yet in this count.</p>
          </Panel>

          <Panel title="Assistant status" className="panel-tight">
            <dl className="status-list">
              <dt>Run</dt>
              <dd>{meta.runLabel}</dd>
              <dt>Last run</dt>
              <dd>{fmtStamp(meta.lastRunAt)}</dd>
              <dt>Instructions</dt>
              <dd>v7 · corrections C1 to C3 applied</dd>
              <dt>Draft D1</dt>
              <dd>Drafted in Instructions. Not sent to the assistant.</dd>
              <dt>Local changes</dt>
              <dd>{onLocalChanges ? 'Kept in this browser' : 'None in this browser'}</dd>
            </dl>
          </Panel>
        </div>
      </div>

      <div className="grid-2 grid-wide-left">
        <Panel
          title="Blocks"
          actions={<span className="small muted">Open a block to filter proposals</span>}
        >
          <div className="block-grid">
            {stats.blocks.map((b) => {
              const state = b.proposed === 0 ? 'queued' : b.proposed < b.total ? 'partial' : 'done';
              return (
                <button
                  key={b.block}
                  className={`block-tile block-${state}`}
                  onClick={() => go('proposals', { block: b.block })}
                  title={`${b.street}: ${b.proposed} of ${b.total} proposed, ${b.decided} decided, ${b.flagged} flagged`}
                >
                  <div className="block-top">
                    <span className="mono small">{b.block}</span>
                    <span className="small">
                      {b.proposed}/{b.total} proposed
                    </span>
                  </div>
                  <div className="block-street">{b.street}</div>
                  <div className="small muted">
                    {b.decided} decided{b.flagged ? ` · ${b.flagged} flagged` : ''}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="legend small muted">
            <span className="swatch block-done" /> Proposed
            <span className="swatch block-partial" /> Partly proposed
            <span className="swatch block-queued" /> Queued
          </div>
        </Panel>

        <Panel title="Activity">
          <ul className="activity">
            {ACTIVITY.map((a) => (
              <li key={a.at + a.text}>
                <div className="small muted">
                  {fmtStamp(a.at)} · {a.who}
                </div>
                <div className="small">{a.text}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
