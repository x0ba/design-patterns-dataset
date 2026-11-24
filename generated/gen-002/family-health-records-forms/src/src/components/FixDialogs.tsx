import { useState } from 'react';
import { useStore } from '../lib/store';
import type { FixAction } from '../lib/formModel';
import { PHYSICIAN_MIN_DATE, TDAP_MIN_DATE } from '../lib/formModel';
import {
  AVS,
  CAMP,
  PERSON,
  RELATIONSHIPS_NON_PARENT,
  SAVED_CONTACTS,
} from '../lib/seed';
import { NOW_ISO, shortDate, usDate, usMonthYear } from '../lib/dates';
import {
  checkCetirizineDose,
  checkEmergency,
  checkEpipenExpiry,
  checkMemberId,
  checkPhysicianDate,
  checkTdapDate,
  CETIRIZINE_UNITS,
  type EmergencyDraft,
} from '../lib/validators';
import { AvsPhoto, type AvsKey } from './AvsPhoto';
import { Callout, Field, fieldProps, Modal, StatusPill } from './ui';

interface DialogProps {
  onClose: () => void;
}

export function FixDialog({ kind, onClose }: { kind: FixAction; onClose: () => void }) {
  switch (kind) {
    case 'tdap':
      return <TdapDialog onClose={onClose} />;
    case 'epipen':
      return <EpipenDialog onClose={onClose} />;
    case 'cetirizine':
      return <CetirizineDialog onClose={onClose} />;
    case 'memberId':
      return <MemberIdDialog onClose={onClose} />;
    case 'emergency':
      return <EmergencyDialog onClose={onClose} />;
    case 'physDate':
      return <PhysicianDateDialog onClose={onClose} />;
  }
}

/* ---------- Tdap booster date (flagged) ---------- */

function TdapDialog({ onClose }: DialogProps) {
  const { state, dispatch } = useStore();
  const tdap = state.record.immunizations.find((i) => i.id === 'imm-16');
  const [value, setValue] = useState(tdap?.date ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const r = checkTdapDate(value);
    if (!r.ok) return setError(r.error);
    dispatch({ type: 'saveTdap', date: r.value });
    onClose();
  };

  const use = (key: AvsKey) => {
    if (key === 'tdap') {
      setValue(AVS.tdapDate);
      setError(null);
    }
  };

  return (
    <Modal
      eyebrow="Immunizations · flagged"
      title="Fix the Tdap booster date"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            Save date
          </button>
        </>
      }
    >
      <div className="dialog-cols">
        <div className="stack">
          <Callout tone="bad" title="Why it's flagged">
            Stored as <b>{tdap ? usDate(tdap.date) : ''}</b>. Imani turned 11 on <b>{usDate('2026-03-08')}</b>. Camp
            accepts a Tdap given on or after that birthday, so this entry fails the rule.
          </Callout>

          <div className="kv">
            <div>
              <span>Current entry</span>
              {tdap ? usDate(tdap.date) : 'None'}
            </div>
            <div>
              <span>Dose</span>Adolescent booster
            </div>
            <div>
              <span>Given by</span>Eastgate Pediatrics
            </div>
          </div>

          <Field
            id="tdap-date"
            label="Date the Tdap was given"
            hint="Use the date from the after-visit summary photo, or type it."
            error={error}
          >
            <input
              type="date"
              className="input"
              id="tdap-date"
              {...fieldProps('tdap-date', error)}
              value={value}
              min={TDAP_MIN_DATE}
              max={NOW_ISO}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
            />
          </Field>

          <p className="muted small">
            Saving updates Imani’s immunization record. The camp form’s “Most recent tetanus-containing dose” fills in
            from it.
          </p>
        </div>

        <AvsPhoto active="tdap" onUse={use} />
      </div>
    </Modal>
  );
}

/* ---------- Epinephrine auto-injector expiration (flagged) ---------- */

function EpipenDialog({ onClose }: DialogProps) {
  const { state, dispatch } = useStore();
  const epi = state.record.medications.find((m) => m.id === 'med-epi');
  const [expires, setExpires] = useState('');
  const [lot, setLot] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const r = checkEpipenExpiry(expires);
    if (!r.ok) return setError(r.error);
    dispatch({ type: 'saveEpipen', expires: r.value, lot });
    onClose();
  };

  return (
    <Modal
      eyebrow="Medications · flagged"
      title="Replace the epinephrine auto-injector date"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            Save replacement
          </button>
        </>
      }
    >
      <div className="dialog-cols">
        <div className="stack">
          <Callout tone="bad" title="Why it's flagged">
            The device on file ({epi?.dose} {epi?.unit}, lot {epi?.lot}) expired <b>{epi?.expires ? usMonthYear(epi.expires) : ''}</b>.
            Camp needs epinephrine that lasts through the last day of camp, <b>{usDate(CAMP.end)}</b>.
          </Callout>

          <div className="kv">
            <div>
              <span>Strength</span>
              {epi?.dose} {epi?.unit}
            </div>
            <div>
              <span>Old lot</span>
              {epi?.lot}
            </div>
            <div>
              <span>Old expiration</span>
              {epi?.expires ? usMonthYear(epi.expires) : ''}
            </div>
          </div>

          <Field
            id="epi-exp"
            label="Expiration printed on the new device"
            hint="Check the label on the carton or the device. The after-visit summary does not list it."
            error={error}
          >
            <input
              type="date"
              className="input"
              id="epi-exp"
              {...fieldProps('epi-exp', error)}
              value={expires}
              min={CAMP.end}
              onChange={(e) => {
                setExpires(e.target.value);
                setError(null);
              }}
            />
          </Field>

          <Field id="epi-lot" label="Lot number (optional)">
            <input
              type="text"
              className="input"
              id="epi-lot"
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              placeholder="As printed on the carton"
              autoComplete="off"
            />
          </Field>
        </div>

        <div className="stack">
          <AvsPhoto />
          <Callout tone="info" title="What to do with the old device">
            Keep the expired device out of the camper’s bag. The record keeps the old lot for history.
          </Callout>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Cetirizine dose (flagged) ---------- */

function CetirizineDialog({ onClose }: DialogProps) {
  const { state, dispatch } = useStore();
  const ceti = state.record.medications.find((m) => m.id === 'med-cetirizine');
  const [dose, setDose] = useState(ceti?.dose ?? '');
  const [unit, setUnit] = useState(ceti?.unit ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const r = checkCetirizineDose(dose, unit);
    if (!r.ok) return setError(r.error);
    dispatch({ type: 'saveCetirizine', dose: r.value.dose, unit: r.value.unit });
    onClose();
  };

  const use = (key: AvsKey) => {
    if (key === 'ceti') {
      setDose('10');
      setUnit('mg');
      setError(null);
    }
  };

  return (
    <Modal
      eyebrow="Medications · flagged"
      title="Add the unit to the cetirizine dose"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            Save dose
          </button>
        </>
      }
    >
      <div className="dialog-cols">
        <div className="stack">
          <Callout tone="bad" title="Why it's flagged">
            The dose is stored as <b>“{ceti?.dose}”</b> with no unit. A number without a unit is not a usable dose on a
            camp form, so the form can’t be signed yet.
          </Callout>

          <Field id="ceti-dose" label="Amount and unit" error={error}>
            <div className="inline-inputs">
              <input
                id="ceti-dose"
                className="input"
                inputMode="decimal"
                value={dose}
                onChange={(e) => {
                  setDose(e.target.value);
                  setError(null);
                }}
                aria-invalid={error ? true : undefined}
              />
              <select
                id="ceti-unit"
                className="input"
                aria-label="Unit"
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setError(null);
                }}
                aria-invalid={error ? true : undefined}
              >
                <option value="">Choose unit</option>
                {CETIRIZINE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <div className="kv">
            <div>
              <span>Medication</span>Cetirizine
            </div>
            <div>
              <span>Schedule</span>
              {ceti?.schedule}
            </div>
          </div>
        </div>

        <AvsPhoto active="ceti" onUse={use} />
      </div>
    </Modal>
  );
}

/* ---------- Insurance member ID (confirm) ---------- */

function MemberIdDialog({ onClose }: DialogProps) {
  const { state, dispatch } = useStore();
  const ins = state.record.insurance;
  const [memberId, setMemberId] = useState(ins.memberId);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const r = checkMemberId(memberId);
    if (!r.ok) return setError(r.error);
    if (!checked) return setError('Check the ID against the card, then tick the box.');
    dispatch({ type: 'confirmMemberId', memberId: r.value, date: NOW_ISO });
    onClose();
  };

  return (
    <Modal
      eyebrow="Health insurance · confirm"
      title="Confirm the insurance member ID"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            Confirm ID
          </button>
        </>
      }
    >
      <div className="stack">
        <Callout tone="warn" title="Not an error, just old">
          Last confirmed <b>{usDate(ins.lastConfirmed)}</b>. Camps often check this against the card, so confirm it
          before Friday.
        </Callout>

        <div className="kv">
          <div>
            <span>Carrier</span>
            {ins.carrier}
          </div>
          <div>
            <span>Group</span>
            {ins.group}
          </div>
        </div>

        <Field id="member-id" label="Member ID" error={error}>
          <input
            id="member-id"
            className="input mono"
            value={memberId}
            onChange={(e) => {
              setMemberId(e.target.value);
              setError(null);
            }}
            {...fieldProps('member-id', error)}
          />
        </Field>

        <label className="check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              setChecked(e.target.checked);
              setError(null);
            }}
          />
          <span>I checked this ID against the insurance card in my wallet.</span>
        </label>
      </div>
    </Modal>
  );
}

/* ---------- Non-parent emergency contact (blank) ---------- */

const EMPTY_DRAFT: EmergencyDraft = {
  name: '',
  relation: '',
  phone: '',
  altPhone: '',
  adultConfirmed: false,
  canPickUp: true,
  fromSaved: null,
};

function EmergencyDialog({ onClose }: DialogProps) {
  const { dispatch } = useStore();
  const [draft, setDraft] = useState<EmergencyDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Partial<Record<keyof EmergencyDraft, string>>>({});

  const set = <K extends keyof EmergencyDraft>(key: K, value: EmergencyDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const useSaved = (id: string) => {
    const s = SAVED_CONTACTS.find((c) => c.id === id);
    if (!s) return;
    setDraft((d) => ({ ...d, name: s.name, relation: s.relation, phone: s.phone, fromSaved: s.id }));
    setErrors({});
  };

  const save = () => {
    const r = checkEmergency(draft);
    if (!r.ok) return setErrors(r.errors);
    dispatch({ type: 'saveEmergency', contact: r.value });
    onClose();
  };

  return (
    <Modal
      eyebrow="Emergency contacts · required"
      title="Add an emergency contact who is not a parent"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            Save contact
          </button>
        </>
      }
    >
      <div className="dialog-cols">
        <div className="stack">
          <Callout tone="info" title="Camp rule">
            One adult, 18 or older, who is not a parent or guardian. Camp calls this person if a parent can’t be
            reached. Darnell and Keisha can’t be used.
          </Callout>

          {SAVED_CONTACTS.length > 0 && (
            <div className="stack-sm">
              <div className="field-label">Saved from earlier forms</div>
              {SAVED_CONTACTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`saved-contact${draft.fromSaved === s.id ? ' is-selected' : ''}`}
                  onClick={() => useSaved(s.id)}
                >
                  <span>
                    <b>{s.name}</b> · {s.relation}
                  </span>
                  <span className="muted small">
                    {s.phone}. Used on {s.usedOn}
                  </span>
                </button>
              ))}
            </div>
          )}

          <Field id="em-name" label="Full name" error={errors.name}>
            <input
              id="em-name"
              className="input"
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              autoComplete="off"
              {...fieldProps('em-name', errors.name)}
            />
          </Field>

          <div className="grid-2">
            <Field id="em-rel" label="Relationship to Imani" error={errors.relation}>
              <select
                id="em-rel"
                className="input"
                value={draft.relation}
                onChange={(e) => set('relation', e.target.value)}
                {...fieldProps('em-rel', errors.relation)}
              >
                <option value="">Choose</option>
                {RELATIONSHIPS_NON_PARENT.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="em-phone" label="Mobile phone" error={errors.phone}>
              <input
                id="em-phone"
                className="input"
                inputMode="tel"
                value={draft.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="(619) 555-0000"
                {...fieldProps('em-phone', errors.phone)}
              />
            </Field>
          </div>

          <Field id="em-alt" label="Second phone (optional)" error={errors.altPhone}>
            <input
              id="em-alt"
              className="input"
              inputMode="tel"
              value={draft.altPhone}
              onChange={(e) => set('altPhone', e.target.value)}
              placeholder="(858) 555-0000"
              {...fieldProps('em-alt', errors.altPhone)}
            />
          </Field>

          <label className="check">
            <input
              type="checkbox"
              checked={draft.adultConfirmed}
              onChange={(e) => set('adultConfirmed', e.target.checked)}
              aria-invalid={errors.adultConfirmed ? true : undefined}
            />
            <span>This person is 18 or older.</span>
          </label>
          {errors.adultConfirmed && (
            <p className="field-error" role="alert">
              {errors.adultConfirmed}
            </p>
          )}

          <label className="check">
            <input
              type="checkbox"
              checked={draft.canPickUp}
              onChange={(e) => set('canPickUp', e.target.checked)}
            />
            <span>Allowed to pick {PERSON.preferredName} up from camp.</span>
          </label>
        </div>

        <div className="stack">
          <div className="info-card">
            <div className="eyebrow">Who can’t be used</div>
            <p>
              Parents, stepparents and guardians, including Keisha. Good choices are a grandparent, aunt or uncle, adult
              sibling, family friend or neighbor.
            </p>
          </div>
          <div className="info-card">
            <div className="eyebrow">Heads up</div>
            <p className="small muted">
              Let this person know they may be called if Imani is hurt or unwell at camp, and that the number needs to
              be answered during camp dates.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Physician signature date (blank) ---------- */

function PhysicianDateDialog({ onClose }: DialogProps) {
  const { dispatch } = useStore();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const r = checkPhysicianDate(value);
    if (!r.ok) return setError(r.error);
    dispatch({ type: 'savePhysicianDate', date: r.value });
    onClose();
  };

  const use = (key: AvsKey) => {
    if (key === 'phys') {
      setValue(AVS.physicianDate);
      setError(null);
    }
  };

  return (
    <Modal
      eyebrow="Physician section · required"
      title="Enter the physician signature date"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            Save date
          </button>
        </>
      }
    >
      <div className="dialog-cols">
        <div className="stack">
          <Callout tone="info" title="Camp rule">
            The physician’s signature must be dated within the 12 months before camp starts ({shortDate(CAMP.start)}).
            That means on or after <b>{usDate(PHYSICIAN_MIN_DATE)}</b>.
          </Callout>

          <Field
            id="phys-date"
            label="Date Dr. Sorensen signed the camp physical"
            hint="The after-visit summary says the form was signed on the visit date."
            error={error}
          >
            <input
              type="date"
              className="input"
              id="phys-date"
              {...fieldProps('phys-date', error)}
              value={value}
              min={PHYSICIAN_MIN_DATE}
              max={NOW_ISO}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
            />
          </Field>

          <div className="kv">
            <div>
              <span>Physician</span>Dr. Anika Sorensen
            </div>
            <div>
              <span>Practice</span>Eastgate Pediatrics
            </div>
            <div>
              <span>Status</span>
              <StatusPill tone="empty">Blank on the form</StatusPill>
            </div>
          </div>
        </div>

        <AvsPhoto active="phys" onUse={use} />
      </div>
    </Modal>
  );
}
