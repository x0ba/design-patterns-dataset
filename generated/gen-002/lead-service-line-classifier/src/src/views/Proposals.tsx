import { useMemo, useState, type ReactNode } from 'react';
import type { Cls, Confidence, Decision, LineRecord, Method } from '../types';
import { CLS_NAME, FLAG_SHORT, flagsFor, METHOD_NAME, type FlagCode } from '../lib/model';
import type { BatchStats } from '../lib/stats';
import { ClsChip, ConfChip, DecisionChip, MethodText } from '../components/ui';

export interface ProposalFilters {
  q: string;
  conf: 'all' | Confidence | 'queued';
  utility: 'all' | Cls;
  customer: 'all' | Cls;
  method: 'all' | Method;
  flag: 'all' | 'any' | FlagCode;
  decision: 'all' | 'open' | 'accepted' | 'overridden' | 'field_dig' | 'held';
  block: 'all' | string;
}

export const DEFAULT_FILTERS: ProposalFilters = {
  q: '',
  conf: 'all',
  utility: 'all',
  customer: 'all',
  method: 'all',
  flag: 'all',
  decision: 'all',
  block: 'all',
};

const PAGE_SIZE = 50;

interface Props {
  lines: LineRecord[];
  decisions: Record<string, Decision>;
  stats: BatchStats;
  preset: Partial<ProposalFilters>;
  onOpen: (id: string, listIds: string[]) => void;
  openId: string | null;
}

export function Proposals({ lines, decisions, stats, preset, onOpen, openId }: Props) {
  const [filters, setFilters] = useState<ProposalFilters>(() => ({ ...DEFAULT_FILTERS, ...preset }));
  const [page, setPage] = useState(0);

  const update = (patch: Partial<ProposalFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return lines.filter((l) => {
      if (filters.conf === 'queued' && l.status !== 'queued') return false;
      if (filters.conf !== 'all' && filters.conf !== 'queued' && l.confidence !== filters.conf) return false;
      if (filters.utility !== 'all' && l.utility?.cls !== filters.utility) return false;
      if (filters.customer !== 'all' && l.customer?.cls !== filters.customer) return false;
      if (filters.method !== 'all' && l.utility?.method !== filters.method) return false;
      if (filters.block !== 'all' && l.block !== filters.block) return false;
      if (filters.flag !== 'all') {
        const codes = stats.flagsById.get(l.id) ?? [];
        if (filters.flag === 'any' ? codes.length === 0 : !codes.includes(filters.flag)) return false;
      }
      if (filters.decision !== 'all') {
        if (filters.decision === 'open') {
          if (l.status !== 'proposed' || decisions[l.id]) return false;
        } else if (decisions[l.id]?.status !== filters.decision) return false;
      }
      if (q && !`${l.id} ${l.address} ${l.parcelId}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lines, decisions, filters, stats]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Northgate · {stats.total} service lines</div>
          <h1>Proposals</h1>
          <p className="sub">
            Each proposal gives a utility-side and a customer-side class. Select a line to check its reasoning and sources, then decide.
          </p>
        </div>
        <div className="head-stats small">
          <div>
            <strong>{stats.proposed}</strong> proposed · <strong>{stats.queued}</strong> queued
          </div>
          <div>
            <strong>{stats.decided}</strong> decided · <strong>{stats.open}</strong> open
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="search"
          type="search"
          placeholder="Search address, parcel, or line ID"
          value={filters.q}
          onChange={(e) => update({ q: e.target.value })}
          aria-label="Search proposals"
        />
        <Select label="Confidence" value={filters.conf} onChange={(v) => update({ conf: v as ProposalFilters['conf'] })}>
          <option value="all">All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="queued">Queued (not proposed)</option>
        </Select>
        <Select label="Utility side" value={filters.utility} onChange={(v) => update({ utility: v as ProposalFilters['utility'] })}>
          <option value="all">All</option>
          {(['LEAD', 'GRR', 'NON_LEAD', 'UNKNOWN'] as Cls[]).map((c) => (
            <option key={c} value={c}>
              {CLS_NAME[c]}
            </option>
          ))}
        </Select>
        <Select label="Customer side" value={filters.customer} onChange={(v) => update({ customer: v as ProposalFilters['customer'] })}>
          <option value="all">All</option>
          {(['LEAD', 'GRR', 'NON_LEAD', 'UNKNOWN'] as Cls[]).map((c) => (
            <option key={c} value={c}>
              {CLS_NAME[c]}
            </option>
          ))}
        </Select>
        <Select label="Method" value={filters.method} onChange={(v) => update({ method: v as ProposalFilters['method'] })}>
          <option value="all">All</option>
          {(['direct', 'permit', 'neighbor', 'none'] as Method[]).map((m) => (
            <option key={m} value={m}>
              {METHOD_NAME[m]}
            </option>
          ))}
        </Select>
        <Select label="Rule flag" value={filters.flag} onChange={(v) => update({ flag: v as ProposalFilters['flag'] })}>
          <option value="all">All</option>
          <option value="any">Any flag</option>
          <option value="conflict">{FLAG_SHORT.conflict}</option>
          <option value="permit_unstated">{FLAG_SHORT.permit_unstated}</option>
          <option value="neighbor_high">{FLAG_SHORT.neighbor_high}</option>
          <option value="grr_unlinked">{FLAG_SHORT.grr_unlinked}</option>
        </Select>
        <Select label="Decision" value={filters.decision} onChange={(v) => update({ decision: v as ProposalFilters['decision'] })}>
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="accepted">Accepted</option>
          <option value="overridden">Overridden</option>
          <option value="field_dig">Field dig</option>
          <option value="held">Held</option>
        </Select>
        <Select label="Block" value={filters.block} onChange={(v) => update({ block: v })}>
          <option value="all">All blocks</option>
          {stats.blocks.map((b) => (
            <option key={b.block} value={b.block}>
              {b.block} · {b.street}
            </option>
          ))}
        </Select>
        {filtersActive && (
          <button className="btn ghost" onClick={() => update(DEFAULT_FILTERS)}>
            Clear filters
          </button>
        )}
      </div>

      <div className="result-line small">
        {filtered.length === 0 ? (
          <span>No lines match these filters.</span>
        ) : (
          <span>
            Showing {safePage * PAGE_SIZE + 1}–{Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} of {filtered.length} lines
          </span>
        )}
        <div className="pager">
          <button className="btn small-btn" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            Previous
          </button>
          <span className="small">
            Page {safePage + 1} of {pageCount}
          </span>
          <button className="btn small-btn" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
            Next
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table proposals">
          <thead>
            <tr>
              <th className="col-id">Line</th>
              <th>Address · parcel</th>
              <th className="num col-built">Built</th>
              <th>Utility side</th>
              <th>Customer side</th>
              <th>Conf.</th>
              <th>Method</th>
              <th>Rule flags</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((l) => {
              const flags = stats.flagsById.get(l.id) ?? [];
              const selected = openId === l.id;
              if (l.status === 'queued' || !l.utility || !l.customer) {
                return (
                  <tr key={l.id} className={`row-queued ${selected ? 'selected' : ''}`} onClick={() => onOpen(l.id, filtered.map((x) => x.id))}>
                    <td className="mono small">{l.id}</td>
                    <td>
                      <div>{l.address}</div>
                      <div className="mono small muted">{l.parcelId}</div>
                    </td>
                    <td className="num">{l.builtYear}</td>
                    <td colSpan={6} className="muted small">
                      Not yet proposed. Block {l.block} is queued for the next run.
                    </td>
                    <td>
                      <DecisionChip d={undefined} />
                    </td>
                  </tr>
                );
              }
              const decision = decisions[l.id];
              return (
                <tr
                  key={l.id}
                  className={`${flags.includes('conflict') ? 'row-conflict' : ''} ${selected ? 'selected' : ''}`}
                  onClick={() => onOpen(l.id, filtered.map((x) => x.id))}
                >
                  <td className="mono small">{l.id}</td>
                  <td className="nowrap">
                    <div>{l.address}</div>
                    <div className="mono small muted">{l.parcelId}</div>
                  </td>
                  <td className="num">{l.builtYear}</td>
                  <td>
                    <SideCell cls={l.utility.cls} material={l.utility.material} />
                  </td>
                  <td>
                    <SideCell cls={l.customer.cls} material={l.customer.material} />
                  </td>
                  <td>
                    <ConfChip c={l.confidence} />
                  </td>
                  <td className="nowrap">
                    <MethodText m={l.utility.method} />
                  </td>
                  <td>
                    <FlagList l={l} />
                  </td>
                  <td>
                    <DecisionChip d={decision} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SideCell({ cls, material }: { cls: Cls; material: string }) {
  return (
    <div className="side-cell">
      <ClsChip cls={cls} />
      <span className="material" title={material}>
        {material}
      </span>
    </div>
  );
}

function FlagList({ l }: { l: LineRecord }) {
  const flags = flagsFor(l);
  if (flags.length === 0) return <span className="muted small">None</span>;
  return (
    <div className="flag-list">
      {flags.map((f) => (
        <span key={f.code} className={`chip flag ${f.blocking ? 'flag-block' : 'flag-warn'}`}>
          {FLAG_SHORT[f.code]}
        </span>
      ))}
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="select">
      <span className="label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

