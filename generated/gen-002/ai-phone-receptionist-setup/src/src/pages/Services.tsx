import { Card, PageHeader, Pill, Toggle } from '../components/ui';
import { quoteNowShort } from '../lib/engine';
import { updateDraft, useAppState } from '../lib/store';
import { useNow } from '../lib/useNow';
import { fmtTime } from '../lib/time';
import type { Booking, PriceType, Service, Settings } from '../types';

const TYPE_OPTIONS: Array<{ value: PriceType; label: string }> = [
  { value: 'fixed', label: 'Fixed price' },
  { value: 'quote', label: 'Quote only' },
  { value: 'none', label: 'Not offered' },
];

const BOOKING_OPTIONS: Array<{ value: Booking; label: string }> = [
  { value: 'book', label: 'Book it' },
  { value: 'message', label: 'Take a message' },
  { value: 'refuse', label: "Don't offer" },
];

function parseMoney(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export function Services() {
  const services = useAppState((s) => s.draft.services);
  const draft = useAppState((s) => s.draft);
  const live = useAppState((s) => s.live);
  const now = useNow();
  const dirty = JSON.stringify(live.services) !== JSON.stringify(services);

  const patch = (id: string, change: (svc: Service) => Service) =>
    updateDraft((d: Settings) => ({
      ...d,
      services: d.services.map((x) => (x.id === id ? change(x) : x)),
    }));

  return (
    <>
      <PageHeader
        title="Prices & services"
        lede={`The price sheet, and what the assistant may do for each job. "Quoted now" is what a caller hears at ${fmtTime(now)} with your draft.`}
      />

      <Card
        subtitle={
          <>
            After-hours rate applies outside 7:00 AM to 7:00 PM and all day Sunday, when it's turned on for that service.
            Safe openings are quote only, so the assistant never says a number for them.
          </>
        }
      >
        <div className="table-wrap">
          <table className="price-table">
            <thead>
              <tr>
                <th className="svc-col">Service</th>
                <th>Price type</th>
                <th>Regular</th>
                <th>After hours</th>
                <th>After-hours rate</th>
                <th>Assistant may</th>
                <th>
                  Quoted now <span className="muted">(draft)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => {
                const hasNumbers = svc.priceType === 'fixed';
                const changedFromLive = JSON.stringify(live.services.find((x) => x.id === svc.id)) !== JSON.stringify(svc);
                return (
                  <tr key={svc.id} className={changedFromLive ? 'changed' : ''}>
                    <td className="svc-col">
                      <div className="strong">{svc.name}</div>
                      {svc.unit && <div className="muted small">{svc.unit}</div>}
                    </td>
                    <td>
                      <select
                        aria-label={`${svc.name} price type`}
                        value={svc.priceType}
                        onChange={(e) =>
                          patch(svc.id, (x) => ({
                            ...x,
                            priceType: e.target.value as PriceType,
                            booking: e.target.value === 'none' ? 'refuse' : x.booking,
                          }))
                        }
                      >
                        {TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="money">
                        <span>$</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          aria-label={`${svc.name} regular price`}
                          value={svc.regular ?? ''}
                          disabled={!hasNumbers}
                          onChange={(e) => patch(svc.id, (x) => ({ ...x, regular: parseMoney(e.target.value) }))}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="money">
                        <span>$</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          aria-label={`${svc.name} after-hours price`}
                          value={svc.afterHours ?? ''}
                          placeholder="none"
                          disabled={!hasNumbers}
                          onChange={(e) =>
                            patch(svc.id, (x) => {
                              const afterHours = parseMoney(e.target.value);
                              return { ...x, afterHours, useAfterHours: afterHours === null ? false : x.useAfterHours };
                            })
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <div className="switch-cell">
                        <Toggle
                          label={`${svc.name}: use after-hours rate`}
                          checked={svc.useAfterHours}
                          disabled={!hasNumbers || svc.afterHours === null}
                          onChange={(v) => patch(svc.id, (x) => ({ ...x, useAfterHours: v }))}
                        />
                        <span className="small muted">
                          {svc.afterHours === null || !hasNumbers
                            ? 'No after-hours rate'
                            : svc.useAfterHours
                              ? 'On'
                              : 'Off: regular rate at night'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <select
                        aria-label={`${svc.name} booking rule`}
                        value={svc.booking}
                        onChange={(e) => patch(svc.id, (x) => ({ ...x, booking: e.target.value as Booking }))}
                      >
                        {BOOKING_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <QuoteNow text={quoteNowShort(draft, svc, now)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="table-foot muted small">
          {dirty ? 'Highlighted rows differ from the live price sheet.' : 'The draft matches the live price sheet.'}
        </div>
      </Card>
    </>
  );
}

function QuoteNow({ text }: { text: string }) {
  return <Pill tone={text.includes('after hours') ? 'info' : 'neutral'}>{text}</Pill>;
}
