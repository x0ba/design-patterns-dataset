import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { Button, Chip, Field, Icon, Modal, Notice, PageHead } from '../ui.jsx';
import { FEATURE_LIBRARY, ROOM_TYPES } from '../data.js';
import { money, plural } from '../lib.js';

const BED_BY_TYPE = {
  Queen: '1 queen bed',
  'Double-Double': '2 double beds',
  King: '1 king bed',
  'Accessible King': '1 king bed',
  Suite: '1 king bed + sofa bed',
};

export default function Rooms({ intent }) {
  const { state, dispatch, notify } = useStore();
  const [selected, setSelected] = useState(intent?.select || []);
  const [editing, setEditing] = useState(intent?.edit || null); // room id | 'new'
  const [combining, setCombining] = useState(false);

  useEffect(() => {
    if (intent?.edit) setEditing(intent.edit);
    if (intent?.select) setSelected(intent.select);
  }, [intent]);

  const rooms = useMemo(() => [...state.rooms].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })), [state.rooms]);
  const picked = rooms.filter((r) => selected.includes(r.id));
  const sameFloor = picked.length === 2 && picked[0].floor === picked[1].floor;

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const lo = Math.min(...state.rooms.map((r) => r.rate));
  const hi = Math.max(...state.rooms.map((r) => r.rate));
  const maxGuests = state.rooms.reduce((n, r) => n + r.maxOcc, 0);

  return (
    <div className="page">
      <PageHead
        title="Rooms"
        lead={`${plural(state.rooms.length, 'room')} at Tamarack House, base rates ${money(lo)} to ${money(hi)} a night, sleeping up to ${maxGuests} guests.`}
        actions={<Button variant="secondary" icon="plus" onClick={() => setEditing('new')}>Add a room</Button>}
      />

      {state.rooms.some((r) => r.number === '204') && state.rooms.some((r) => r.number === '205') && (
        <Notice tone="info" icon="merge" title="Combined two rooms in the renovation?">
          Tick both rooms in the table, then choose “Combine into one suite”. The two rooms are replaced by a single suite in inventory.
        </Notice>
      )}

      <div className={`select-bar ${selected.length ? 'is-on' : ''}`} aria-live="polite">
        {selected.length === 0 && <span className="muted">Select two rooms on the same floor to combine them.</span>}
        {selected.length > 0 && (
          <>
            <strong>{plural(selected.length, 'room')} selected:</strong>
            <span>{picked.map((r) => r.number).join(', ')}</span>
            {selected.length === 2 && !sameFloor && <span className="inline-warn"><Icon name="alert" size={15} /> Rooms must be on the same floor to combine.</span>}
            {selected.length > 2 && <span className="inline-warn"><Icon name="alert" size={15} /> Combine works on exactly two rooms.</span>}
            <span className="spacer" />
            <Button variant="primary" size="sm" icon="merge" disabled={!sameFloor} onClick={() => setCombining(true)}>Combine into one suite</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button>
          </>
        )}
      </div>

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th className="col-check"><span className="sr-only">Select</span></th>
              <th>Room</th>
              <th>Type</th>
              <th className="num">Floor</th>
              <th className="num">Sleeps</th>
              <th>Bed</th>
              <th>Features</th>
              <th className="num">Base rate</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className={selected.includes(r.id) ? 'is-selected' : ''}>
                <td className="col-check">
                  <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label={`Select room ${r.number}`} />
                </td>
                <td><strong className="room-no">{r.number}</strong></td>
                <td>
                  {r.type}
                  {r.accessible && <Chip tone="info" icon="check">Accessible</Chip>}
                </td>
                <td className="num">{r.floor}</td>
                <td className="num">{r.maxOcc}</td>
                <td>{r.bed}</td>
                <td className="features-cell">
                  <span className="feature-line">{r.features.join(' · ')}</span>
                </td>
                <td className="num"><strong>{money(r.rate)}</strong></td>
                <td className="row-actions">
                  <Button variant="ghost" size="sm" icon="edit" onClick={() => setEditing(r.id)} aria-label={`Edit room ${r.number}`}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <RoomDrawer
          roomId={editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); notify(msg); }}
        />
      )}
      {combining && (
        <CombineDialog
          rooms={picked}
          onClose={() => setCombining(false)}
          onDone={(msg) => { setCombining(false); setSelected([]); notify(msg, { undo: true }); }}
        />
      )}
    </div>
  );
}

function FeaturePicker({ value, onChange }) {
  const [custom, setCustom] = useState('');
  const all = [...FEATURE_LIBRARY, ...value.filter((f) => !FEATURE_LIBRARY.includes(f))];
  const toggle = (f) => onChange(value.includes(f) ? value.filter((x) => x !== f) : [...value, f]);
  const add = () => {
    const f = custom.trim();
    if (f && !value.includes(f)) onChange([...value, f]);
    setCustom('');
  };
  return (
    <div>
      <div className="chip-picker" role="group" aria-label="Features">
        {all.map((f) => (
          <button type="button" key={f} className={`pick ${value.includes(f) ? 'is-on' : ''}`} aria-pressed={value.includes(f)} onClick={() => toggle(f)}>
            {value.includes(f) && <Icon name="check" size={13} />}
            {f}
          </button>
        ))}
      </div>
      <div className="inline-add">
        <input
          type="text"
          value={custom}
          placeholder="Add another feature"
          aria-label="Add another feature"
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <Button variant="secondary" size="sm" onClick={add} disabled={!custom.trim()}>Add</Button>
      </div>
    </div>
  );
}

function validateRoom(f, rooms, selfId) {
  const e = {};
  if (!f.number.trim()) e.number = 'Enter a room number.';
  else if (rooms.some((r) => r.id !== selfId && r.number === f.number.trim())) e.number = `Room ${f.number.trim()} already exists.`;
  if (!(Number(f.floor) >= 1)) e.floor = 'Floor must be 1 or higher.';
  if (!(Number(f.maxOcc) >= 1)) e.maxOcc = 'At least 1 guest.';
  if (!(Number(f.rate) > 0)) e.rate = 'Enter a rate above $0.';
  if (!f.bed.trim()) e.bed = 'Describe the beds.';
  return e;
}

function RoomDrawer({ roomId, onClose, onSaved }) {
  const { state, dispatch } = useStore();
  const isNew = roomId === 'new';
  const existing = state.rooms.find((r) => r.id === roomId);
  const [f, setF] = useState(() =>
    existing
      ? { ...existing, floor: String(existing.floor), maxOcc: String(existing.maxOcc), rate: String(existing.rate), features: [...existing.features] }
      : { number: '', floor: '1', type: 'Queen', bed: BED_BY_TYPE.Queen, maxOcc: '2', rate: '129', accessible: false, features: [] },
  );
  const [errors, setErrors] = useState({});
  const [confirmRemove, setConfirmRemove] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = () => {
    const e = validateRoom(f, state.rooms, existing?.id);
    setErrors(e);
    if (Object.keys(e).length) return;
    const room = {
      id: existing?.id || `r${f.number.trim()}-${Date.now() % 10000}`,
      number: f.number.trim(),
      floor: Number(f.floor),
      type: f.type,
      bed: f.bed.trim(),
      maxOcc: Number(f.maxOcc),
      rate: Number(f.rate),
      accessible: f.accessible,
      features: f.features,
    };
    dispatch(isNew ? { type: 'room/add', room } : { type: 'room/update', id: room.id, patch: room });
    onSaved(isNew ? `Added room ${room.number}.` : `Saved room ${room.number}.`);
  };

  return (
    <Modal
      variant="drawer"
      title={isNew ? 'Add a room' : `Edit room ${existing.number}`}
      subtitle={isNew ? 'New rooms go straight into inventory.' : `${existing.type} · floor ${existing.floor}`}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            confirmRemove ? (
              <span className="confirm-inline">
                Remove room {existing.number}?
                <Button variant="danger" size="sm" onClick={() => { dispatch({ type: 'room/remove', id: existing.id }); onSaved(`Removed room ${existing.number}.`); }}>Yes, remove</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>Keep</Button>
              </span>
            ) : (
              <Button variant="ghost-danger" size="sm" onClick={() => setConfirmRemove(true)}>Remove room</Button>
            )
          )}
          <span className="spacer" />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>{isNew ? 'Add room' : 'Save room'}</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Room number" error={errors.number}>
          {(p) => <input {...p} type="text" value={f.number} onChange={(e) => set('number', e.target.value)} />}
        </Field>
        <Field label="Floor" error={errors.floor}>
          {(p) => <input {...p} type="number" min="1" value={f.floor} onChange={(e) => set('floor', e.target.value)} />}
        </Field>
        <Field label="Room type">
          {(p) => (
            <select
              {...p}
              value={f.type}
              onChange={(e) => {
                const type = e.target.value;
                setF((x) => ({ ...x, type, bed: Object.values(BED_BY_TYPE).includes(x.bed) ? BED_BY_TYPE[type] : x.bed, accessible: type === 'Accessible King' ? true : x.accessible }));
              }}
            >
              {ROOM_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
        </Field>
        <Field label="Bed type" error={errors.bed}>
          {(p) => <input {...p} type="text" value={f.bed} onChange={(e) => set('bed', e.target.value)} />}
        </Field>
        <Field label="Max occupancy" error={errors.maxOcc}>
          {(p) => <input {...p} type="number" min="1" value={f.maxOcc} onChange={(e) => set('maxOcc', e.target.value)} />}
        </Field>
        <Field label="Base rate per night" error={errors.rate}>
          {(p) => (
            <div className="input-affix">
              <span aria-hidden="true">$</span>
              <input {...p} type="number" min="1" step="1" value={f.rate} onChange={(e) => set('rate', e.target.value)} />
            </div>
          )}
        </Field>
      </div>

      <label className="check-row">
        <input type="checkbox" checked={f.accessible} onChange={(e) => set('accessible', e.target.checked)} />
        <span>
          <strong>Accessible room</strong>
          <small>Shown as accessible when students assign rooms to guests who need it.</small>
        </span>
      </label>

      <div className="field">
        <span className="label">Features</span>
        <FeaturePicker value={f.features} onChange={(v) => set('features', v)} />
      </div>
    </Modal>
  );
}

function CombineDialog({ rooms, onClose, onDone }) {
  const { state, dispatch } = useStore();
  const [a, b] = rooms;
  const merged = [...new Set([...a.features, ...b.features].filter((x) => x !== 'Tub/shower'))];
  const [f, setF] = useState({
    number: a.number < b.number ? a.number : b.number,
    type: 'Suite',
    bed: '1 king bed + sofa bed',
    maxOcc: String(Math.min(a.maxOcc + b.maxOcc, 4)),
    rate: '229',
    features: [...new Set([...merged, 'Parlor', 'Sofa bed'])],
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const was = a.rate + b.rate;

  const submit = () => {
    const e = {};
    const n = f.number.trim();
    if (!n) e.number = 'Enter a room number for the suite.';
    else if (state.rooms.some((r) => r.number === n && !rooms.some((x) => x.id === r.id))) e.number = `Room ${n} already exists.`;
    if (!(Number(f.rate) > 0)) e.rate = 'Enter a rate above $0.';
    if (!(Number(f.maxOcc) >= 1)) e.maxOcc = 'At least 1 guest.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const keep = rooms.find((r) => r.number === n) || rooms[0];
    const ids = [keep.id, ...rooms.filter((r) => r.id !== keep.id).map((r) => r.id)];
    const room = { number: n, floor: a.floor, type: f.type, bed: f.bed.trim(), maxOcc: Number(f.maxOcc), rate: Number(f.rate), accessible: false, features: f.features };
    dispatch({ type: 'room/combine', ids, room });
    onDone(`Combined rooms ${a.number} and ${b.number} into ${f.type} ${n}.`);
  };

  return (
    <Modal
      title={`Combine rooms ${a.number} and ${b.number}`}
      subtitle={`Both are on floor ${a.floor}. They become one room in inventory.`}
      onClose={onClose}
      width={620}
      footer={
        <>
          <span className="spacer" />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="merge" onClick={submit}>Combine rooms</Button>
        </>
      }
    >
      <div className="combine-from">
        {rooms.map((r) => (
          <div key={r.id} className="mini-room">
            <strong>{r.number}</strong>
            <span>{r.type}</span>
            <span>{money(r.rate)}</span>
          </div>
        ))}
        <Icon name="arrow" />
        <div className="mini-room is-new">
          <strong>{f.number || '—'}</strong>
          <span>{f.type}</span>
          <span>{money(Number(f.rate) || 0)}</span>
        </div>
      </div>

      <div className="form-grid">
        <Field label="Suite room number" error={errors.number}>
          {(p) => <input {...p} type="text" value={f.number} onChange={(e) => set('number', e.target.value)} />}
        </Field>
        <Field label="Room type">
          {(p) => (
            <select {...p} value={f.type} onChange={(e) => set('type', e.target.value)}>
              {ROOM_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
        </Field>
        <Field label="Bed type">
          {(p) => <input {...p} type="text" value={f.bed} onChange={(e) => set('bed', e.target.value)} />}
        </Field>
        <Field label="Max occupancy" error={errors.maxOcc}>
          {(p) => <input {...p} type="number" min="1" value={f.maxOcc} onChange={(e) => set('maxOcc', e.target.value)} />}
        </Field>
        <Field label="Base rate per night" error={errors.rate} hint={`The two rooms were ${money(a.rate)} + ${money(b.rate)} = ${money(was)} when sold separately.`}>
          {(p) => (
            <div className="input-affix">
              <span aria-hidden="true">$</span>
              <input {...p} type="number" min="1" value={f.rate} onChange={(e) => set('rate', e.target.value)} />
            </div>
          )}
        </Field>
      </div>

      <div className="field">
        <span className="label">Features</span>
        <FeaturePicker value={f.features} onChange={(v) => set('features', v)} />
      </div>
    </Modal>
  );
}
