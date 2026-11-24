import { useMemo, useState } from 'react';
import {
  APPROVAL_THRESHOLD,
  AVAILABILITY,
  nationalAvailability,
  regionRows,
  shopperListing,
  visibleCount,
  type Impact,
  type SettingChange,
} from '../domain/rules';
import { TODAY, shortDate, weekdayDate } from '../domain/time';
import { REGIONS, type Region, type RuleSet } from '../domain/types';
import { PRODUCTS } from '../data/products';
import { fmtInt, fmtMoney, fmtPct, Badge, Card, Callout } from './ui';

interface ComparePanelProps {
  live: RuleSet;
  rules: RuleSet;
  changes: SettingChange[];
  impact: Impact;
}

const AS_OF_OPTIONS = [
  { value: TODAY, label: `Today, ${shortDate(TODAY)}` },
  { value: '2026-11-27', label: `${weekdayDate('2026-11-27')} · first boost day` },
  { value: '2026-12-18', label: `${weekdayDate('2026-12-18')} · last boost day` },
  { value: '2026-12-19', label: `${weekdayDate('2026-12-19')} · after boosts end` },
];

export function ComparePanel({ live, rules, changes, impact }: ComparePanelProps) {
  const [region, setRegion] = useState<Region>('Northeast');
  const [asOf, setAsOf] = useState('2026-11-27');

  const rows = useMemo(() => regionRows(live, rules), [live, rules]);
  const liveTop = useMemo(() => shopperListing(live, region, asOf).slice(0, 8), [live, region, asOf]);
  const draftTop = useMemo(() => shopperListing(rules, region, asOf).slice(0, 8), [rules, region, asOf]);
  const liveTotal = visibleCount(live, region);
  const draftTotal = visibleCount(rules, region);
  const national = nationalAvailability();
  const inStockAnywhere = Math.round(national * PRODUCTS.length);
  const underRegions = REGIONS.filter((r) => AVAILABILITY[r] * 100 < rules.oos.threshold);

  return (
    <div className="stack">
      <Card
        id="compare-diff"
        title="Live vs draft"
        subtitle="Each row is one setting. Products affected counts items whose placement, visibility, or filter eligibility changes."
      >
        <table className="table compare-table">
          <thead>
            <tr>
              <th style={{ width: '18%' }}>Setting</th>
              <th style={{ width: '30%' }}>Live now</th>
              <th style={{ width: '34%' }}>Draft</th>
              <th style={{ width: '18%' }} className="cell-right">
                Products affected
              </th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c) => (
              <tr key={c.key} className={c.changed ? 'is-changed' : undefined}>
                <td>
                  <span className="cell-strong">{c.label}</span>
                  <div>{c.changed ? <Badge tone="changed">Changed</Badge> : <Badge tone="muted">Same</Badge>}</div>
                </td>
                <td className={c.changed ? 'diff-old' : undefined}>{c.liveText}</td>
                <td className={c.changed ? 'diff-new' : undefined}>{c.draftText}</td>
                <td className="cell-right">{c.changed ? fmtInt(c.affected.size) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="summary-line">
          <span>
            <strong>{impact.changedSettings}</strong> of {changes.length} settings differ from live.
          </span>
          <span>
            <strong>{fmtInt(impact.productsAffected)}</strong> products affected in total · approval needed above{' '}
            {fmtInt(APPROVAL_THRESHOLD)}
          </span>
        </div>
      </Card>

      <Card
        id="compare-regions"
        title="Where shoppers lose listings"
        subtitle={`Out-of-stock items are hidden per region. National figure counts products in stock in at least one region: ${fmtPct(national)} (${inStockAnywhere} of ${PRODUCTS.length}).`}
      >
        <table className="table">
          <thead>
            <tr>
              <th>Region</th>
              <th className="cell-right">In stock</th>
              <th className="cell-right">Visible · live</th>
              <th className="cell-right">Visible · draft</th>
              <th className="cell-right">Hidden · draft</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const low = AVAILABILITY[r.region] * 100 < rules.oos.threshold && rules.oos.mode === 'hide-below';
              return (
                <tr key={r.region} className={r.hiddenDraft > 0 ? 'is-changed' : undefined}>
                  <td>
                    <span className="cell-strong">{r.region}</span>{' '}
                    {low && <Badge tone="warn">Under {rules.oos.threshold}%</Badge>}
                  </td>
                  <td className="cell-right">{fmtPct(r.availability)}</td>
                  <td className="cell-right">{fmtInt(r.visibleLive)}</td>
                  <td className={`cell-right${r.visibleDraft < r.visibleLive ? ' diff-new' : ''}`}>
                    {fmtInt(r.visibleDraft)}
                  </td>
                  <td className="cell-right">{fmtInt(r.hiddenDraft)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rules.oos.mode === 'hide-below' && underRegions.length > 0 && (
          <Callout tone="warn">
            {underRegions
              .map((r) => `${r} shoppers would see ${fmtInt(visibleCount(rules, r))} of ${fmtInt(PRODUCTS.length)} snow blowers`)
              .join('; ')}
            . Regions at or above {rules.oos.threshold}% keep showing out-of-stock items with the notice.
          </Callout>
        )}
      </Card>

      <Card
        id="compare-preview"
        title="Shopper preview"
        subtitle="Top eight results for one region, live beside draft. Boosts appear only inside their windows."
        actions={
          <div className="preview-controls">
            <label className="field field-inline">
              <span className="field-label">Region</span>
              <select value={region} onChange={(e) => setRegion(e.target.value as Region)}>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-inline">
              <span className="field-label">As of</span>
              <select value={asOf} onChange={(e) => setAsOf(e.target.value)}>
                {AS_OF_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      >
        <div className="preview-grid">
          <PreviewColumn title="Live" total={liveTotal} region={region} rows={liveTop} />
          <PreviewColumn title="Draft" total={draftTotal} region={region} rows={draftTop} draft />
        </div>
      </Card>
    </div>
  );
}

function PreviewColumn({
  title,
  total,
  region,
  rows,
  draft,
}: {
  title: string;
  total: number;
  region: Region;
  rows: ReturnType<typeof shopperListing>;
  draft?: boolean;
}) {
  return (
    <div className={`preview-col${draft ? ' is-draft' : ''}`}>
      <div className="preview-head">
        <strong>{title}</strong>
        <span>
          {fmtInt(total)} visible in {region}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="empty">Nothing is visible for this region.</p>
      ) : (
        <ol className="preview-list">
          {rows.map((row, i) => (
            <li key={row.product.item} className="preview-item">
              <span className="preview-rank">{i + 1}</span>
              <span className="preview-body">
                <span className="preview-name">{row.product.name}</span>
                <span className="preview-meta">
                  {row.product.model} · {fmtMoney(row.product.price)} · ★ {row.product.rating.toFixed(1)} (
                  {fmtInt(row.product.reviews)})
                </span>
                <span className="preview-tags">
                  {row.inStock ? <Badge tone="ok">In stock</Badge> : <Badge tone="muted">Out of stock</Badge>}
                  {row.boosted && <Badge tone="info">Boosted</Badge>}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
