import { useMemo, useState } from 'react';
import { HISTORY, LAST_PUBLISHED } from '../data/history';
import { longDate } from '../domain/time';
import type { HistoryEntry } from '../domain/types';
import { Badge, Card } from './ui';

type Area = HistoryEntry['area'] | 'All';

const AREAS: Area[] = ['All', 'Default sort', 'Brand boost', 'Shopper filters', 'Out-of-stock', 'Setup'];

export function HistoryPanel() {
  const [area, setArea] = useState<Area>('All');
  const rows = useMemo(
    () => (area === 'All' ? HISTORY : HISTORY.filter((h) => h.area === area)),
    [area],
  );

  return (
    <Card
      id="history"
      title="Edit history"
      subtitle={`${HISTORY.length} prior edits. Last published ${longDate(LAST_PUBLISHED.date)} by ${LAST_PUBLISHED.by}.`}
      actions={
        <label className="field field-inline">
          <span className="field-label">Area</span>
          <select value={area} onChange={(e) => setArea(e.target.value as Area)}>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      }
    >
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: '14%' }}>Date</th>
            <th style={{ width: '18%' }}>Editor</th>
            <th style={{ width: '16%' }}>Area</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.id}>
              <td>{longDate(h.date)}</td>
              <td>{h.editor}</td>
              <td>
                <Badge tone="muted">{h.area}</Badge>
              </td>
              <td>{h.summary}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="empty">
                No edits in this area.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
