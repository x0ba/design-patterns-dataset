import { Card, Field, PageHeader, Pill } from '../components/ui';
import { updateDraft, useAppState } from '../lib/store';
import { WEEKDAYS, type DayHours, type Profile, type Settings, type Weekday } from '../types';

const DAY_NAMES: Record<Weekday, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

export function Business() {
  const draft = useAppState((s) => s.draft);
  const live = useAppState((s) => s.live);
  const update = (change: (d: Settings) => Settings) => updateDraft(change);

  const setProfile = (key: keyof Profile, value: string) =>
    update((d) => ({ ...d, profile: { ...d.profile, [key]: value } }));

  const setDay = (day: Weekday, patch: Partial<DayHours>) =>
    update((d) => ({ ...d, hours: { ...d.hours, [day]: { ...d.hours[day], ...patch } } }));

  const onCount = draft.cities.filter((c) => c.on).length;
  const ajOn = draft.cities.find((c) => c.name === 'Apache Junction')?.on ?? false;

  return (
    <>
      <PageHeader
        title="Business"
        lede="Hours, service area, booking window, and the details the assistant uses when it introduces you."
      />

      <div className="two-col">
        <Card title="Business profile" subtitle="Used on every call and in text alerts.">
          <div className="form-grid">
            <Field label="Business name">
              <input value={draft.profile.businessName} onChange={(e) => setProfile('businessName', e.target.value)} />
            </Field>
            <Field label="Owner">
              <input value={draft.profile.owner} onChange={(e) => setProfile('owner', e.target.value)} />
            </Field>
            <Field label="License">
              <input value={draft.profile.license} onChange={(e) => setProfile('license', e.target.value)} />
            </Field>
            <Field label="Base ZIP">
              <input
                value={draft.profile.baseZip}
                inputMode="numeric"
                maxLength={5}
                onChange={(e) => setProfile('baseZip', e.target.value.replace(/\D/g, ''))}
              />
            </Field>
            <Field label="Business line" hint="The number callers dial.">
              <input value={draft.profile.businessPhone} onChange={(e) => setProfile('businessPhone', e.target.value)} />
            </Field>
            <Field label="Text alerts go to" hint="Child or pet alerts are sent here.">
              <input value={draft.profile.alertNumber} onChange={(e) => setProfile('alertNumber', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card
          title="Booking window"
          subtitle="How far ahead the assistant may book a visit."
          actions={
            draft.bookingWindowHours !== live.bookingWindowHours ? <Pill tone="info">Changed in draft</Pill> : null
          }
        >
          <div className="window-row">
            <input
              type="number"
              min={1}
              max={24}
              aria-label="Booking window in hours"
              value={draft.bookingWindowHours}
              onChange={(e) => {
                const n = Math.min(24, Math.max(1, Math.round(Number(e.target.value) || 1)));
                update((d) => ({ ...d, bookingWindowHours: n }));
              }}
            />
            <span>hours ahead</span>
          </div>
          <p className="muted">
            Requests later than this become a message for Rafa to call back. Right now the assistant books only visits
            starting within {draft.bookingWindowHours} hour{draft.bookingWindowHours === 1 ? '' : 's'}.
          </p>
        </Card>
      </div>

      <Card title="Hours" subtitle="Regular hours are when the regular rate applies. Everything else gets the after-hours rate.">
        <table className="hours-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Opens</th>
              <th>Closes</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((day) => {
              const h = draft.hours[day];
              const regular = !!h.open && !!h.close;
              return (
                <tr key={day}>
                  <td className="strong">{DAY_NAMES[day]}</td>
                  <td>
                    <input
                      type="time"
                      aria-label={`${DAY_NAMES[day]} opens`}
                      value={h.open ?? ''}
                      onChange={(e) => setDay(day, { open: e.target.value || null })}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      aria-label={`${DAY_NAMES[day]} closes`}
                      value={h.close ?? ''}
                      onChange={(e) => setDay(day, { close: e.target.value || null })}
                    />
                  </td>
                  <td>
                    {regular ? (
                      <Pill tone="neutral">Regular rate</Pill>
                    ) : (
                      <Pill tone="info">After-hours rate all day</Pill>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card
        title="Service area"
        subtitle={`${onCount} cities. Callers outside these hear that you don't serve their area.`}
        actions={ajOn ? <Pill tone="warn">Apache Junction is on</Pill> : <Pill tone="ok">Apache Junction is off</Pill>}
      >
        <div className="city-grid">
          {draft.cities.map((c) => (
            <label key={c.name} className={`city${c.on ? ' on' : ''}`}>
              <input
                type="checkbox"
                checked={c.on}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    cities: d.cities.map((x) => (x.name === c.name ? { ...x, on: e.target.checked } : x)),
                  }))
                }
              />
              <span>{c.name}</span>
              <span className="city-state">{c.on ? 'Serves' : 'Off'}</span>
            </label>
          ))}
        </div>
      </Card>
    </>
  );
}
