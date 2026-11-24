import { useState } from 'react';
import { money } from '../lib/money';
import { fmtDateTime } from '../lib/time';
import { Badge, PageHeader } from '../components/ui';
import { useStore } from '../store';

export function TransactionsView() {
  const { state } = useStore();
  const [filter, setFilter] = useState<'all' | 'payment' | 'refund'>('all');

  const collected = state.txns.filter((t) => t.kind === 'payment').reduce((s, t) => s + t.amountCents, 0);
  const refunds = state.txns.filter((t) => t.kind === 'refund').reduce((s, t) => s + t.amountCents, 0);
  const rows = [...state.txns]
    .filter((t) => filter === 'all' || t.kind === filter)
    .sort((a, b) => b.at - a.at);

  return (
    <div className="page">
      <PageHeader title="Transactions" subtitle="Monday, Nov 16 · payments and refunds" />
      <div className="kpi-row three">
        <div className="card kpi">
          <span className="label">Collected</span>
          <strong>{money(collected)}</strong>
        </div>
        <div className="card kpi">
          <span className="label">Refunded</span>
          <strong>{money(refunds)}</strong>
        </div>
        <div className="card kpi">
          <span className="label">Net</span>
          <strong>{money(collected - refunds)}</strong>
        </div>
      </div>

      <div className="card">
        <div className="tabs" role="tablist">
          {(
            [
              ['all', 'All'],
              ['payment', 'Payments'],
              ['refund', 'Refunds'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={filter === id}
              className={`tab ${filter === id ? 'active' : ''}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date and time</th>
              <th>Family</th>
              <th>Type</th>
              <th>Description</th>
              <th>Method</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{fmtDateTime(t.at)}</td>
                <td>
                  <strong>{t.familyName}</strong>
                </td>
                <td>
                  {t.type === 'enrollment' ? <Badge tone="success">Enrollment</Badge> : <Badge tone="danger">Withdrawal</Badge>}
                </td>
                <td className="small">{t.description}</td>
                <td className="small">{t.method}</td>
                <td className={`num ${t.kind === 'refund' ? 'text-warn' : ''}`}>
                  {t.kind === 'refund' ? money(-t.amountCents) : money(t.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
