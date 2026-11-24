import { useEffect, useState, type Dispatch, type FormEvent } from 'react';
import { PRODUCTS, BRANDS, attributeValue } from '../data/products';
import {
  ATTRIBUTE_LABELS,
  AVAILABLE_ATTRIBUTES,
  AVAILABILITY,
  OOS_OPTIONS,
  SORT_OPTIONS,
  boostStatus,
  ruleWarnings,
  validateBoost,
  type SettingChange,
  type SettingKey,
} from '../domain/rules';
import { REGIONS, type AttributeId, type BrandBoost, type RuleSet } from '../domain/types';
import { dateRange, inclusiveDays, shortDate } from '../domain/time';
import type { Action } from '../state/draftStore';
import { Badge, Button, Callout, Card } from './ui';

/** Distinct values each attribute takes across the active catalog. */
const VALUE_COUNTS = Object.fromEntries(
  (Object.keys(ATTRIBUTE_LABELS) as AttributeId[]).map((id) => [
    id,
    new Set(PRODUCTS.map((p) => attributeValue(p, id)).filter((v): v is string => v !== null)).size,
  ]),
) as Record<AttributeId, number>;

interface RulesPanelProps {
  live: RuleSet;
  rules: RuleSet;
  changes: SettingChange[];
  locked: boolean;
  dispatch: Dispatch<Action>;
}

export function RulesPanel({ live, rules, changes, locked, dispatch }: RulesPanelProps) {
  const changed = (key: SettingKey) => changes.find((c) => c.key === key)?.changed ?? false;
  return (
    <div className="stack">
      <SortCard live={live} rules={rules} locked={locked} changed={changed('sort')} dispatch={dispatch} />
      <BoostCard live={live} rules={rules} locked={locked} changed={changed('boosts')} dispatch={dispatch} />
      <AttributeCard live={live} rules={rules} locked={locked} changed={changed('attributes')} dispatch={dispatch} />
      <OosCard live={live} rules={rules} locked={locked} changed={changed('oos')} dispatch={dispatch} />
    </div>
  );
}

function ChangeBadge({ changed }: { changed: boolean }) {
  return changed ? <Badge tone="changed">Changed from live</Badge> : <Badge tone="muted">Matches live</Badge>;
}

// ---------------------------------------------------------------------------
// Default sort
// ---------------------------------------------------------------------------

function SortCard({
  live,
  rules,
  locked,
  changed,
  dispatch,
}: CardProps) {
  const liveLabel = SORT_OPTIONS.find((o) => o.id === live.sort)?.label;
  return (
    <Card
      id="rules-sort"
      title="Default sort"
      subtitle="How results are ordered when a shopper opens Snow Blowers without choosing a sort."
      actions={<ChangeBadge changed={changed} />}
    >
      <p className="live-line">
        Live now: <strong>{liveLabel}</strong>
      </p>
      <div role="radiogroup" aria-label="Default sort" className="option-list">
        {SORT_OPTIONS.map((o) => {
          const selected = rules.sort === o.id;
          return (
            <label key={o.id} className={`option${selected ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="default-sort"
                value={o.id}
                checked={selected}
                disabled={locked}
                onChange={() => dispatch({ type: 'setSort', sort: o.id })}
              />
              <span className="option-text">
                <span className="option-label">
                  {o.label}
                  {live.sort === o.id && <Badge tone="muted">Live</Badge>}
                </span>
                <span className="option-help">{o.help}</span>
              </span>
            </label>
          );
        })}
      </div>
      {ruleWarnings(rules).map((w) => (
        <Callout key={w} tone="warn">
          {w}
        </Callout>
      ))}
    </Card>
  );
}

interface CardProps {
  live: RuleSet;
  rules: RuleSet;
  locked: boolean;
  changed: boolean;
  dispatch: Dispatch<Action>;
}

// ---------------------------------------------------------------------------
// Brand boosts
// ---------------------------------------------------------------------------

function BoostCard({ live, rules, locked, changed, dispatch }: CardProps) {
  const liveIds = new Set(live.boosts.map((b) => b.id));
  const rows = [...rules.boosts].sort((a, b) => a.start.localeCompare(b.start) || a.brand.localeCompare(b.brand));
  const [brand, setBrand] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);

  const expiredCount = rows.filter((b) => boostStatus(b) === 'expired').length;

  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = validateBoost({ brand, start, end }, rules.boosts);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    dispatch({ type: 'addBoost', brand, start, end });
    setBrand('');
    setStart('');
    setEnd('');
  }

  return (
    <Card
      id="rules-boosts"
      title="Brand boosts"
      subtitle="Lift a brand’s products toward the top of results during a date window. Windows include both dates."
      actions={<ChangeBadge changed={changed} />}
    >
      {rows.length === 0 ? (
        <p className="empty">No boosts in the draft.</p>
      ) : (
        <table className="table boost-table">
          <thead>
            <tr>
              <th>Brand</th>
              <th>Window</th>
              <th>Length</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <BoostRow key={b.id} boost={b} isNew={!liveIds.has(b.id)} locked={locked} dispatch={dispatch} />
            ))}
          </tbody>
        </table>
      )}
      {expiredCount > 0 && (
        <p className="hint">
          Expired boosts stay in the draft until you remove them. They do not affect ranking and are dropped when the
          change set is scheduled.
        </p>
      )}

      <form className="inline-form" onSubmit={add} aria-label="Add a brand boost">
        <label className="field">
          <span className="field-label">Brand</span>
          <select value={brand} disabled={locked} onChange={(e) => setBrand(e.target.value)}>
            <option value="">Choose a brand</option>
            {BRANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Start</span>
          <input type="date" value={start} disabled={locked} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">End</span>
          <input type="date" value={end} disabled={locked} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <Button type="submit" variant="secondary" disabled={locked}>
          Add boost
        </Button>
      </form>
      {error && <Callout tone="danger">{error}</Callout>}
    </Card>
  );
}

function BoostRow({
  boost,
  isNew,
  locked,
  dispatch,
}: {
  boost: BrandBoost;
  isNew: boolean;
  locked: boolean;
  dispatch: Dispatch<Action>;
}) {
  const status = boostStatus(boost);
  const statusBadge =
    status === 'expired' ? (
      <Badge tone="muted">Expired {shortDate(boost.end)}</Badge>
    ) : status === 'active' ? (
      <Badge tone="ok">Active</Badge>
    ) : (
      <Badge tone="info">Starts {shortDate(boost.start)}</Badge>
    );
  return (
    <tr className={status === 'expired' ? 'is-muted' : undefined}>
      <td>
        <span className="cell-strong">{boost.brand}</span> {isNew && <Badge tone="new">New</Badge>}
      </td>
      <td>{dateRange(boost.start, boost.end)}</td>
      <td>{inclusiveDays(boost.start, boost.end)} days</td>
      <td>{statusBadge}</td>
      <td className="cell-right">
        <Button
          variant="ghost"
          size="sm"
          disabled={locked}
          aria-label={`Remove ${boost.brand} boost`}
          onClick={() => dispatch({ type: 'removeBoost', id: boost.id })}
        >
          Remove
        </Button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Shopper-narrowing attributes
// ---------------------------------------------------------------------------

function AttributeCard({ live, rules, locked, changed, dispatch }: CardProps) {
  const liveSet = new Set(live.attributes);
  const shownSet = new Set(rules.attributes);
  const removed = live.attributes.filter((a) => !shownSet.has(a));
  const available = AVAILABLE_ATTRIBUTES.filter((a) => !shownSet.has(a));

  return (
    <Card
      id="rules-attributes"
      title="Shopper filters"
      subtitle="Attributes shoppers can narrow by. Order here is the order of the filter panel."
      actions={<ChangeBadge changed={changed} />}
    >
      <h3 className="sub-h">Shown to shoppers · {rules.attributes.length}</h3>
      <ol className="attr-list">
        {rules.attributes.map((id, i) => {
          const label = ATTRIBUTE_LABELS[id];
          return (
            <li key={id} className="attr-row">
              <span className="attr-pos">{i + 1}</span>
              <span className="attr-name">{label}</span>
              <span className="attr-meta">{VALUE_COUNTS[id]} values</span>
              {!liveSet.has(id) && <Badge tone="new">New</Badge>}
              <span className="attr-tools">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={locked || i === 0}
                  aria-label={`Move ${label} up`}
                  onClick={() => dispatch({ type: 'moveAttribute', id, direction: -1 })}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={locked || i === rules.attributes.length - 1}
                  aria-label={`Move ${label} down`}
                  onClick={() => dispatch({ type: 'moveAttribute', id, direction: 1 })}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={locked}
                  aria-label={`Stop showing ${label}`}
                  onClick={() => dispatch({ type: 'toggleAttribute', id })}
                >
                  Remove
                </Button>
              </span>
            </li>
          );
        })}
      </ol>

      {(available.length > 0 || removed.length > 0) && (
        <>
          <h3 className="sub-h">Available, not shown</h3>
          <ul className="attr-list attr-list-muted">
            {[...removed, ...available.filter((a) => !removed.includes(a))].map((id) => (
              <li key={id} className="attr-row">
                <span className="attr-name">{ATTRIBUTE_LABELS[id]}</span>
                <span className="attr-meta">{VALUE_COUNTS[id]} values</span>
                {removed.includes(id) && <Badge tone="changed">Removed from live</Badge>}
                <span className="attr-tools">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={locked}
                    onClick={() => dispatch({ type: 'toggleAttribute', id })}
                  >
                    Add to filters
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="hint">
        Shoppers only see values that exist in this subcategory. Value counts come from the 412 active products.
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Out-of-stock handling
// ---------------------------------------------------------------------------

function OosCard({ live, rules, locked, changed, dispatch }: CardProps) {
  const threshold = rules.oos.threshold;
  const [text, setText] = useState(String(threshold));

  useEffect(() => {
    setText(String(threshold));
  }, [threshold]);

  const underRegions = REGIONS.filter((r) => AVAILABILITY[r] * 100 < threshold);

  return (
    <Card
      id="rules-oos"
      title="Out-of-stock items"
      subtitle="What happens to a product that has no stock in the shopper’s region."
      actions={<ChangeBadge changed={changed} />}
    >
      <div role="radiogroup" aria-label="Out-of-stock handling" className="option-list">
        {OOS_OPTIONS.map((o) => {
          const selected = rules.oos.mode === o.id;
          return (
            <label key={o.id} className={`option${selected ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="oos-mode"
                value={o.id}
                checked={selected}
                disabled={locked}
                onChange={() => dispatch({ type: 'setOosMode', mode: o.id })}
              />
              <span className="option-text">
                <span className="option-label">
                  {o.label}
                  {live.oos.mode === o.id && <Badge tone="muted">Live</Badge>}
                </span>
                <span className="option-help">{o.help}</span>
                {o.id === 'hide-below' && selected && (
                  <span className="inline-field">
                    Hide where availability is under
                    <input
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      inputMode="numeric"
                      aria-label="Availability threshold, percent"
                      value={text}
                      disabled={locked}
                      onChange={(e) => {
                        setText(e.target.value);
                        const n = Number(e.target.value);
                        if (e.target.value !== '' && Number.isInteger(n) && n >= 1 && n <= 50) {
                          dispatch({ type: 'setOosThreshold', threshold: n });
                        }
                      }}
                      onBlur={() => setText(String(threshold))}
                    />
                    %
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      <h3 className="sub-h">Regional availability</h3>
      <p className="hint">Share of the 412 products in stock in each region, measured now.</p>
      <div className="region-strip">
        {REGIONS.map((r) => {
          const under = rules.oos.mode === 'hide-below' && AVAILABILITY[r] * 100 < threshold;
          return (
            <div key={r} className={`region-chip${under ? ' is-under' : ''}`}>
              <span className="region-name">{r}</span>
              <span className="region-pct">{Math.round(AVAILABILITY[r] * 100)}%</span>
            </div>
          );
        })}
      </div>
      {rules.oos.mode === 'hide-below' && (
        <p className="hint">
          {underRegions.length
            ? `Out-of-stock items will be hidden in ${underRegions.join(' and ')}.`
            : 'No region is under this threshold, so nothing is hidden today.'}
        </p>
      )}
    </Card>
  );
}
