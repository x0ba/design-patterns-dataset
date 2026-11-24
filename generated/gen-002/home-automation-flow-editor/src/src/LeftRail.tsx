import { useState } from 'react';
import { Icon } from './Icon';
import { DEVICES, DEVICE_GROUPS, HOLIDAYS, HOUSEHOLD, NOW, PEOPLE, SWIM } from './data';
import type { Device, Routine } from './types';
import { DAY_SHORT, fmtDate, fmtTime } from './time';

type Tab = 'routines' | 'devices' | 'calendars';

interface Props {
  routines: Routine[];
  draft: { name: string; status: 'draft' | 'enabled'; trigger: string };
  viewing: string; // 'draft' or routine id
  onOpen: (id: string) => void;
  onToggleRoutine: (id: string) => void;
  addableType: Device['type'] | null;
  onAddDevice: (id: string) => void;
  selectedDeviceIds: string[];
  testDate: string;
}

const DEVICE_ICON: Record<Device['type'], string> = {
  light: 'bulb', plug: 'plug', thermostat: 'thermo', door: 'door', router: 'router', wifi: 'wifi', phone: 'phone', hub: 'hub',
};

export function LeftRail(p: Props) {
  const [tab, setTab] = useState<Tab>('routines');
  return (
    <aside className="rail">
      <div className="household">
        <div className="hh-icon"><Icon name="home" size={16} stroke={2} /></div>
        <div>
          <div className="hh-name">{HOUSEHOLD.name}</div>
          <div className="hh-meta">{DEVICES.length} devices · {PEOPLE.length} people</div>
        </div>
      </div>
      <div className="rail-tabs" role="tablist">
        {(['routines', 'devices', 'calendars'] as Tab[]).map((t) => (
          <button type="button" role="tab" key={t} aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'routines' ? 'Routines' : t === 'devices' ? 'Devices' : 'Calendars'}
          </button>
        ))}
      </div>
      <div className="rail-body">
        {tab === 'routines' && <RoutineList {...p} />}
        {tab === 'devices' && <DeviceList {...p} />}
        {tab === 'calendars' && <Calendars testDate={p.testDate} />}
      </div>
    </aside>
  );
}

function RoutineList({ routines, draft, viewing, onOpen, onToggleRoutine }: Props) {
  const on = routines.filter((r) => r.enabled).length;
  return (
    <>
      <div className="rail-section">{draft.status === 'draft' ? 'Draft' : 'Just enabled'}</div>
      <button type="button" className={`routine-row draft${viewing === 'draft' ? ' on' : ''}`} onClick={() => onOpen('draft')}>
        <span className="r-icon draft"><Icon name="moon" size={14} /></span>
        <span className="r-text">
          <span className="r-name">{draft.name}</span>
          <span className="r-meta">{draft.status === 'draft' ? 'Editing · never run' : `On · ${draft.trigger}`}</span>
        </span>
        {draft.status === 'draft' ? <span className="tag tag-draft">Draft</span> : <span className="tag tag-on">On</span>}
      </button>
      <div className="rail-section">
        Routines <span className="muted">· {on} of {routines.length} on</span>
      </div>
      {routines.map((r) => (
        <div key={r.id} className={`routine-row${viewing === r.id ? ' on' : ''}${r.enabled ? '' : ' off'}`} onClick={() => onOpen(r.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(r.id)}>
          <span className="r-icon"><Icon name={r.icon} size={14} /></span>
          <span className="r-text">
            <span className="r-name">{r.name}</span>
            <span className="r-meta">{r.enabled ? `Last ran ${r.lastRun}` : `Off · last ran ${r.lastRun}`}</span>
          </span>
          <button
            type="button"
            className={`switch${r.enabled ? ' on' : ''}`}
            role="switch"
            aria-checked={r.enabled}
            aria-label={`${r.name} ${r.enabled ? 'on' : 'off'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleRoutine(r.id);
            }}
          >
            <i />
          </button>
        </div>
      ))}
    </>
  );
}

function DeviceList({ addableType, onAddDevice, selectedDeviceIds }: Props) {
  const [q, setQ] = useState('');
  const match = (d: Device) => !q || `${d.name} ${d.room} ${d.state}`.toLowerCase().includes(q.toLowerCase());
  return (
    <>
      <div className="search">
        <Icon name="search" size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 27 devices" aria-label="Search devices" />
      </div>
      {addableType && <div className="rail-note">Click <b>+</b> to add a {addableType === 'wifi' ? 'Wi-Fi device' : addableType} to the selected step.</div>}
      {DEVICE_GROUPS.map((g) => {
        const list = DEVICES.filter((d) => d.type === g.type && match(d));
        if (!list.length) return null;
        return (
          <div key={g.type}>
            <div className="rail-section">
              {g.label} <span className="muted">· {DEVICES.filter((d) => d.type === g.type).length}</span>
            </div>
            {list.map((d) => {
              const can = addableType === d.type && !selectedDeviceIds.includes(d.id);
              const inStep = addableType === d.type && selectedDeviceIds.includes(d.id);
              return (
                <div key={d.id} className={`device-row${d.on ? ' is-on' : ''}`}>
                  <span className={`d-icon t-${d.type}`}><Icon name={DEVICE_ICON[d.type]} size={13} /></span>
                  <span className="d-text">
                    <span className="d-name">{d.name}</span>
                    <span className="d-meta">
                      {d.type === 'wifi' || d.type === 'phone' ? '' : `${d.room} · `}
                      {d.state}
                      {d.type === 'light' && !d.dimmable ? ' · on/off' : ''}
                    </span>
                  </span>
                  {can && (
                    <button type="button" className="icon-btn add-dev" title="Add to selected step" onClick={() => onAddDevice(d.id)}>
                      <Icon name="plus" size={13} stroke={2.4} />
                    </button>
                  )}
                  {inStep && <span className="tag tag-in" title="Used by selected step"><Icon name="check" size={10} stroke={3} /></span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

function Calendars({ testDate }: { testDate: string }) {
  return (
    <>
      <div className="cal-card">
        <div className="cal-head">
          <span className="cal-sw" style={{ background: '#c2412d' }} />
          <b>School Holidays</b>
        </div>
        <div className="cal-meta">Shared family calendar · synced {fmtTime(NOW.minutes - 12)} · read by <code>holiday()</code></div>
        <ul className="cal-dates">
          {HOLIDAYS.map((h) => {
            const past = h.date < NOW.date;
            return (
              <li key={h.date} className={`${past ? 'past' : ''}${h.date === testDate ? ' hit' : ''}`}>
                <span className="cd-date">{fmtDate(h.date, { weekday: true })}{h.date.startsWith('2027') ? ', 2027' : ''}</span>
                <span className="cd-name">{h.name}</span>
              </li>
            );
          })}
        </ul>
        <div className="cal-meta">{HOLIDAYS.length} dates through January</div>
      </div>
      <div className="cal-card">
        <div className="cal-head">
          <span className="cal-sw" style={{ background: '#c0702f' }} />
          <b>Ada · Swim practice</b>
        </div>
        <div className="cal-meta">{SWIM.place}</div>
        <ul className="cal-dates">
          <li>
            <span className="cd-date">{SWIM.days.map((d) => DAY_SHORT[d]).join(' & ')}</span>
            <span className="cd-name">{fmtTime(SWIM.start)} – {fmtTime(SWIM.end)}</span>
          </li>
        </ul>
        <div className="cal-meta">
          In expressions: <code>ada.swim_days</code>, <code>ada.swim_ends</code>, <code>ada.swim_today</code>
        </div>
      </div>
    </>
  );
}
