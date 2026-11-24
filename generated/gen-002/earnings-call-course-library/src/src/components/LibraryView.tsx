import { useMemo, useState } from 'react';
import { CALLS } from '../data/catalog';
import type { CallMeta, CallStatus, SavedState } from '../types';
import { formatDateShort, formatMinutes, formatTime } from '../lib/time';

export function statusOf(call: CallMeta, saved: SavedState): { kind: CallStatus; label: string } {
  if (saved.completed.includes(call.id)) return { kind: 'completed', label: 'Completed' };
  const pos = saved.positions[call.id];
  if (pos && pos > 0) return { kind: 'in-progress', label: `In progress · ${formatTime(pos)}` };
  return { kind: 'not-started', label: 'Not started' };
}

interface LibraryViewProps {
  saved: SavedState;
  onOpen: (callId: string) => void;
  onQueue: (callId: string) => void;
}

export function LibraryView({ saved, onOpen, onQueue }: LibraryViewProps) {
  const [company, setCompany] = useState('all');
  const [quarter, setQuarter] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');

  const companies = useMemo(
    () => Array.from(new Map(CALLS.map((c) => [c.companyId, c.companyName])).entries()),
    [],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CALLS.filter((c) => {
      if (company !== 'all' && c.companyId !== company) return false;
      if (quarter !== 'all' && c.quarter !== quarter) return false;
      if (status !== 'all' && statusOf(c, saved).kind !== status) return false;
      if (q && !`${c.companyName} ${c.ticker} ${c.sector}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => (a.callDate < b.callDate ? 1 : -1));
  }, [company, quarter, status, query, saved]);

  const queued = new Set(saved.queue);

  return (
    <section className="library">
      <div className="library-head">
        <div>
          <h1>Call library</h1>
          <p className="muted">
            12 case companies · four quarters each · 48 recorded calls. Synced transcripts are loaded
            for Harrowgate Outdoor's Q2 and Q3 2026 calls in this build.
          </p>
        </div>
      </div>

      <div className="library-filters" role="search">
        <input
          type="search"
          placeholder="Search company, ticker or sector"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search calls"
        />
        <select value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company">
          <option value="all">All companies</option>
          {companies.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select value={quarter} onChange={(e) => setQuarter(e.target.value)} aria-label="Quarter">
          <option value="all">All quarters</option>
          {['Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026'].map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="all">Any status</option>
          <option value="in-progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="not-started">Not started</option>
        </select>
        <span className="muted small">{rows.length} of {CALLS.length} calls</span>
      </div>

      <table className="call-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Quarter</th>
            <th>Call date</th>
            <th>Length</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((call) => {
            const st = statusOf(call, saved);
            return (
              <tr key={call.id} className={call.id === 'hrgo-q3-2026' ? 'is-case' : undefined}>
                <td>
                  <div className="cell-company">{call.companyName}</div>
                  <div className="muted small">{call.ticker} · {call.sector}</div>
                </td>
                <td>{call.quarter}</td>
                <td>{formatDateShort(call.callDate)}</td>
                <td>{formatMinutes(call.durationSec)}</td>
                <td>
                  <span className={`status status-${st.kind}`}>{st.label}</span>
                  {!call.hasTranscript && <span className="muted small status-note">Transcript pending</span>}
                </td>
                <td className="row-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!call.hasTranscript}
                    onClick={() => onOpen(call.id)}
                    title={call.hasTranscript ? 'Open the call' : 'Transcript not loaded in this build'}
                  >
                    {st.kind === 'in-progress' ? 'Resume' : 'Open'}
                  </button>
                  <button
                    className="btn btn-sm"
                    disabled={!call.hasTranscript || queued.has(call.id)}
                    onClick={() => onQueue(call.id)}
                  >
                    {queued.has(call.id) ? 'Queued' : 'Add to queue'}
                  </button>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="muted empty">No calls match these filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
