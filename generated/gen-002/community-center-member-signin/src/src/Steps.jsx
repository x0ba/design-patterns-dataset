import React, { useState } from 'react';
import { Field, TextInput, Chip, Icon } from './ui.jsx';
import {
  MATCH, MONTHS, RELATIONSHIPS, ACCESS_OPTIONS, HEARD_OPTIONS, MERGE_REASONS, VOLUNTEER, PROGRAMS,
} from './data.js';
import { phoneIssue, emailIssue, normPhone, fmtPhone, dobInfo, timeLabel, minutesUntil, relMinutes } from './logic.js';

/* ---------------- Step 1: Name ---------------- */

export function NameStep({ f, set, show, touch, match }) {
  const [newName, setNewName] = useState('');
  const addName = () => {
    const n = newName.trim();
    if (!n || f.previousNames.some((p) => p.name.toLowerCase() === n.toLowerCase())) return setNewName('');
    set('previousNames', [...f.previousNames, { name: n, source: 'typed' }]);
    setNewName('');
  };
  return (
    <div className="step-body">
      <div className="row two">
        <Field id="firstName" label="First name" error={show('firstName') && !f.firstName.trim() ? 'Please enter your first name.' : null}>
          <TextInput id="firstName" value={f.firstName} onChange={(v) => set('firstName', v)} onBlur={() => touch('firstName')} />
        </Field>
        <Field id="lastName" label="Last name" error={show('lastName') && !f.lastName.trim() ? 'Please enter your last name.' : null}>
          <TextInput id="lastName" value={f.lastName} onChange={(v) => set('lastName', v)} onBlur={() => touch('lastName')} />
        </Field>
      </div>
      <Field id="preferredName" label="What would you like us to call you?" optional hint="Only if it's different from your first name.">
        <TextInput id="preferredName" value={f.preferredName} onChange={(v) => set('preferredName', v)} hint placeholder="" />
      </Field>
      <Field id="prevName" label="Have you used any other last names?" optional hint="For example a maiden name. This helps us find any older records of yours.">
        {f.previousNames.length > 0 && (
          <ul className="name-chips">
            {f.previousNames.map((p) => (
              <li key={p.name} className="name-chip">
                <span>{p.name}</span>
                {p.source === 'merge' ? (
                  <span className="name-chip-tag">from record #{MATCH.id}</span>
                ) : (
                  <button type="button" className="name-chip-x" aria-label={`Remove ${p.name}`} onClick={() => set('previousNames', f.previousNames.filter((x) => x.name !== p.name))}>
                    <Icon name="x" size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="inline-add">
          <TextInput
            id="prevName"
            value={newName}
            onChange={setNewName}
            hint
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addName(); } }}
          />
          <button type="button" className="btn secondary" onClick={addName} disabled={!newName.trim()}>
            <Icon name="plus" size={18} /> Add name
          </button>
        </div>
        {match === null && f.previousNames.length === 0 && (
          <p className="soft-note">
            <Icon name="info" size={18} /> On the next page we'll ask about a 2019 record at your address.
          </p>
        )}
      </Field>
    </div>
  );
}

/* ---------------- Step 2: Address & phone, with possible match ---------------- */

export function ContactStep({ f, set, show, touch, matchProps }) {
  const phoneErr = show('phone') ? phoneIssue(f.phone) : null;
  const emailErr = show('email') ? emailIssue(f.email) : null;
  const zipErr = show('zip') && !/^\d{5}$/.test(f.zip.trim()) ? 'Please enter a 5-digit ZIP code.' : null;

  const onPhoneBlur = () => {
    touch('phone');
    const n = normPhone(f.phone);
    if (n) set('phone', fmtPhone(n));
  };

  return (
    <div className="step-body">
      {matchProps && <MatchCard f={f} {...matchProps} />}

      <div className="row two top">
        <Field id="phone" label="Phone number" hint="10 digits, starting with the area code." error={null} className={phoneErr ? 'has-error' : ''}>
          <TextInput id="phone" type="tel" inputMode="tel" value={f.phone} error={phoneErr} hint onChange={(v) => set('phone', v)} onBlur={onPhoneBlur} />
          {phoneErr && (
            <div className="phone-error" id="phone-error" role="alert">
              <p><Icon name="alert" size={18} /> <span>{phoneErr.msg}</span></p>
              {phoneErr.fix && (
                <button type="button" className="btn fix" onClick={() => { set('phone', fmtPhone(phoneErr.fix)); }}>
                  Use <strong>{fmtPhone(phoneErr.fix)}</strong> instead
                </button>
              )}
            </div>
          )}
          {!phoneErr && normPhone(f.phone) && show('phone') && (
            <p className="field-ok"><Icon name="check" size={18} /> 10 digits. That looks right.</p>
          )}
        </Field>
        <Field id="email" label="Email" optional hint="For the monthly newsletter and class changes." error={emailErr}>
          <TextInput id="email" type="email" inputMode="email" value={f.email} error={emailErr} hint onChange={(v) => set('email', v)} onBlur={() => touch('email')} />
        </Field>
      </div>
      <fieldset className="group">
        <legend>Your home address</legend>
        <div className="row street">
          <Field id="street" label="Street address" error={show('street') && !f.street.trim() ? 'Please enter your street address.' : null}>
            <TextInput id="street" value={f.street} onChange={(v) => set('street', v)} onBlur={() => touch('street')} />
          </Field>
          <Field id="unit" label="Apt or unit" optional>
            <TextInput id="unit" value={f.unit} onChange={(v) => set('unit', v)} />
          </Field>
        </div>
        <div className="row city">
          <Field id="city" label="City" error={show('city') && !f.city.trim() ? 'Please enter your city.' : null}>
            <TextInput id="city" value={f.city} onChange={(v) => set('city', v)} onBlur={() => touch('city')} />
          </Field>
          <Field id="state" label="State">
            <select id="state" className="input" value={f.state} onChange={(e) => set('state', e.target.value)}>
              {['OR', 'WA', 'ID', 'CA'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field id="zip" label="ZIP code" error={zipErr}>
            <TextInput id="zip" inputMode="numeric" maxLength={5} value={f.zip} error={zipErr} onChange={(v) => set('zip', v.replace(/\D/g, ''))} onBlur={() => touch('zip')} />
          </Field>
        </div>
      </fieldset>

    </div>
  );
}

function MatchCard({ f, match, setMatch, mergeReason, setMergeReason, mergeNote, setMergeNote, mergeRecord, confirmMerge, undoMatch, showMergeError }) {
  const phone = normPhone(f.phone);
  const phoneSame = phone && phone.slice(-4) === MATCH.phoneLast4;
  const sameAddress = f.street.trim().toLowerCase() === MATCH.street.toLowerCase();

  if (match === 'merged') {
    return (
      <section className="match-card resolved ok" id="match-card" tabIndex={-1}>
        <Icon name="check" size={24} />
        <div>
          <h3>Welcome back. We're updating your record from 2019 (#{MATCH.id}).</h3>
          <p>"Kowalski" is saved as a previous name, and your pottery class history stays on the record.</p>
          <p className="audit">Updated by {mergeRecord.by} at {mergeRecord.time}. Reason: {mergeRecord.reasonLabel}</p>
        </div>
        <button type="button" className="btn link" onClick={undoMatch}>Undo</button>
      </section>
    );
  }
  if (match === 'new') {
    return (
      <section className="match-card resolved neutral" id="match-card" tabIndex={-1}>
        <Icon name="user" size={24} />
        <div>
          <h3>We'll make a new record for you.</h3>
          <p>The 2019 record for Doreen Kowalski (#{MATCH.id}) won't be changed.</p>
        </div>
        <button type="button" className="btn link" onClick={undoMatch}>Change</button>
      </section>
    );
  }

  return (
    <section className={`match-card ${match === 'confirming' ? 'open' : ''}`} id="match-card" tabIndex={-1} aria-labelledby="match-title">
      <header className="match-head">
        <span className="match-icon"><Icon name="users" size={22} /></span>
        <div>
          <h3 id="match-title">Have you been a member here before?</h3>
          <p>We found a member record from 2019 at the same address.</p>
        </div>
      </header>

      <table className="compare">
        <thead>
          <tr><th scope="col"><span className="sr-only">Detail</span></th><th scope="col">What you entered today</th><th scope="col">Record #{MATCH.id} from 2019</th></tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Name</th>
            <td>{f.firstName} {f.lastName}</td>
            <td>{MATCH.firstName} <strong>{MATCH.lastName}</strong> <span className="tag diff">different last name</span></td>
          </tr>
          <tr>
            <th scope="row">Address</th>
            <td>{f.street}</td>
            <td>{MATCH.street} {sameAddress && <span className="tag same"><Icon name="check" size={14} /> same</span>}</td>
          </tr>
          <tr>
            <th scope="row">Phone</th>
            <td>{phone ? fmtPhone(phone) : <span className="muted">needs fixing below</span>}</td>
            <td>ending in {MATCH.phoneLast4} {phoneSame && <span className="tag same"><Icon name="check" size={14} /> same</span>}</td>
          </tr>
          <tr>
            <th scope="row">Last visit</th>
            <td className="muted">—</td>
            <td>{MATCH.lastVisit} · {MATCH.history}</td>
          </tr>
        </tbody>
      </table>

      {match === null && (
        <div className="match-actions">
          <button type="button" className="btn primary-soft big" onClick={() => setMatch('confirming')}>
            Yes, that's me. Kowalski was my earlier name.
          </button>
          <button type="button" className="btn secondary big" onClick={() => setMatch('new')}>
            No, that's not me
          </button>
        </div>
      )}

      {match === 'confirming' && (
        <div className="merge-panel">
          <div className="merge-changes">
            <h4>What will happen to record #{MATCH.id}</h4>
            <ul>
              <li>Name: <span className="from">Kowalski</span> <Icon name="arrow-right" size={16} /> <strong>{f.lastName}</strong></li>
              <li>"Kowalski" kept as a previous name</li>
              <li>Membership: <span className="from">lapsed</span> <Icon name="arrow-right" size={16} /> <strong>active</strong></li>
              <li>Keeps <strong>#{MATCH.id}</strong> and the 2019 pottery history</li>
            </ul>
          </div>

          <div className="volunteer-zone" id="merge-confirm" tabIndex={-1}>
            <div className="vz-head">
              <span className="vz-badge"><Icon name="shield" size={16} /> For the desk volunteer</span>
              <span className="vz-who">{VOLUNTEER.name} · {VOLUNTEER.role} · can update records with a reason</span>
            </div>
            <p className="vz-label" id="merge-reason-label">Reason for updating this record</p>
            <div className="chips" role="radiogroup" aria-labelledby="merge-reason-label">
              {MERGE_REASONS.map((r) => (
                <Chip key={r.id} selected={mergeReason === r.id} onClick={() => { setMergeReason(r.id); if (!mergeNote || MERGE_REASONS.some((x) => x.note === mergeNote)) setMergeNote(r.note); }}>
                  {r.label}
                </Chip>
              ))}
            </div>
            <label className="vz-label" htmlFor="merge-note">Note for the record</label>
            <textarea id="merge-note" className="input textarea small" rows={2} value={mergeNote} onChange={(e) => setMergeNote(e.target.value)} placeholder="What you checked with the member" />
            {showMergeError && (!mergeReason || !mergeNote.trim()) && (
              <p className="field-error" role="alert"><Icon name="alert" size={18} /> Choose a reason and add a short note before updating the record.</p>
            )}
            <div className="vz-actions">
              <button type="button" className="btn link" onClick={() => setMatch(null)}>Back</button>
              <button type="button" className="btn volunteer" onClick={confirmMerge}>
                <Icon name="merge" size={18} /> Update record #{MATCH.id}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- Step 3: Birthday & emergency contact ---------------- */

export function EmergencyStep({ f, set, show, touch, today }) {
  const dob = dobInfo(f, today);
  const dobErr = show('dobMonth') && dob.error ? dob.error : null;
  const ecPhoneIssue = phoneIssue(f.ecPhone);
  const ecSame = !ecPhoneIssue && normPhone(f.ecPhone) === normPhone(f.phone);
  const ecPhoneErr = show('ecPhone') ? (ecPhoneIssue ? ecPhoneIssue.msg : ecSame ? "That's your own number. Please give a number for your emergency contact." : null) : null;
  const relErr = show('ecRelationship') && !f.ecRelationship ? 'Please choose how you know them.' : null;

  return (
    <div className="step-body">
      <fieldset className="group">
        <legend>Date of birth</legend>
        <p className="field-hint">We only use this to show programs for your age group.</p>
        <div className="row dob">
          <Field id="dobMonth" label="Month">
            <select id="dobMonth" className="input" value={f.dobMonth} aria-invalid={dobErr ? 'true' : undefined} onChange={(e) => set('dobMonth', e.target.value)} onBlur={() => f.dobDay && f.dobYear && touch('dobMonth')}>
              <option value="">Choose…</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Field>
          <Field id="dobDay" label="Day">
            <TextInput id="dobDay" inputMode="numeric" maxLength={2} value={f.dobDay} onChange={(v) => set('dobDay', v.replace(/\D/g, ''))} onBlur={() => f.dobYear && touch('dobMonth')} />
          </Field>
          <Field id="dobYear" label="Year">
            <TextInput id="dobYear" inputMode="numeric" maxLength={4} value={f.dobYear} placeholder="e.g. 1958" onChange={(v) => set('dobYear', v.replace(/\D/g, ''))} onBlur={() => touch('dobMonth')} />
          </Field>
        </div>
        {dobErr && <p className="field-error" role="alert"><Icon name="alert" size={18} /> <span>{dobErr}</span></p>}
        {!dob.error && <p className="field-ok"><Icon name="check" size={18} /> {dob.label}</p>}
      </fieldset>

      <fieldset className="group">
        <legend>Emergency contact</legend>
        <p className="field-hint">Someone we can call if you feel unwell while you're at the center.</p>
        <div className="row two">
          <Field id="ecName" label="Their name" error={show('ecName') && !f.ecName.trim() ? "Please enter your emergency contact's name." : null}>
            <TextInput id="ecName" value={f.ecName} onChange={(v) => set('ecName', v)} onBlur={() => touch('ecName')} />
          </Field>
          <Field id="ecPhone" label="Their phone number" error={ecPhoneErr}>
            <TextInput id="ecPhone" type="tel" inputMode="tel" value={f.ecPhone} error={ecPhoneErr}
              onChange={(v) => set('ecPhone', v)}
              onBlur={() => { touch('ecPhone'); const n = normPhone(f.ecPhone); if (n) set('ecPhone', fmtPhone(n)); }} />
          </Field>
        </div>
        <div className={`field ${relErr ? 'has-error' : ''}`}>
          <p className="field-label" id="ecRelationship-label">How do you know them?</p>
          <div className="chips" role="radiogroup" aria-labelledby="ecRelationship-label">
            {RELATIONSHIPS.map((r, i) => (
              <Chip key={r} id={i === 0 ? 'ecRelationship' : undefined} selected={f.ecRelationship === r} onClick={() => { set('ecRelationship', r); touch('ecRelationship'); }}>{r}</Chip>
            ))}
          </div>
          {f.ecRelationship === 'Other' && (
            <div className="sub-field">
              <label htmlFor="ecRelationshipOther" className="sr-only">How you know them</label>
              <TextInput id="ecRelationshipOther" value={f.ecRelationshipOther} placeholder="For example: nephew, carer" onChange={(v) => set('ecRelationshipOther', v)} />
            </div>
          )}
          {relErr && <p className="field-error" role="alert"><Icon name="alert" size={18} /> <span>{relErr}</span></p>}
        </div>
      </fieldset>
    </div>
  );
}

/* ---------------- Step 4: Questions ---------------- */

export function QuestionsStep({ f, set, show, touch }) {
  const toggleAccess = (a) => set('access', f.access.includes(a) ? f.access.filter((x) => x !== a) : [...f.access, a]);
  const photoErr = show('photo-yes') && f.photo === null;
  const heardErr = show('heard-0') && !f.heard;
  return (
    <div className="step-body">
      <div className="field">
        <p className="field-label" id="access-label">Is there anything that would make your visits easier? <span className="optional">optional</span></p>
        <p className="field-hint">Choose any that apply. The program leaders will see this.</p>
        <div className="chips" role="group" aria-labelledby="access-label">
          {ACCESS_OPTIONS.map((a) => (
            <Chip key={a} role="checkbox" selected={f.access.includes(a)} onClick={() => toggleAccess(a)}>{a}</Chip>
          ))}
        </div>
        <label htmlFor="accessNote" className="sr-only">Anything else</label>
        <TextInput id="accessNote" value={f.accessNote} placeholder="Anything else we should know (optional)" onChange={(v) => set('accessNote', v)} style={{ marginTop: 12 }} />
      </div>

      <div className={`field ${photoErr ? 'has-error' : ''}`}>
        <p className="field-label" id="photo-label">May we include photos of you in the center newsletter?</p>
        <p className="field-hint">We sometimes take group photos at programs. You can change your answer at the desk any time.</p>
        <div className="choice-cards" role="radiogroup" aria-labelledby="photo-label">
          <button type="button" id="photo-yes" role="radio" aria-checked={f.photo === 'yes'} className={`choice-card ${f.photo === 'yes' ? 'selected' : ''}`} onClick={() => { set('photo', 'yes'); touch('photo-yes'); }}>
            <span className="radio-dot" /> <span><strong>Yes</strong>, photos of me are fine</span>
          </button>
          <button type="button" role="radio" aria-checked={f.photo === 'no'} className={`choice-card ${f.photo === 'no' ? 'selected' : ''}`} onClick={() => { set('photo', 'no'); touch('photo-yes'); }}>
            <span className="radio-dot" /> <span><strong>No</strong>, please leave me out of photos</span>
          </button>
        </div>
        {photoErr && <p className="field-error" role="alert"><Icon name="alert" size={18} /> <span>Please choose yes or no.</span></p>}
      </div>

      <div className={`field ${heardErr ? 'has-error' : ''}`}>
        <p className="field-label" id="heard-label">How did you hear about the center?</p>
        <div className="chips" role="radiogroup" aria-labelledby="heard-label">
          {HEARD_OPTIONS.map((h, i) => (
            <Chip key={h} id={`heard-${i}`} selected={f.heard === h} onClick={() => { set('heard', h); touch('heard-0'); }}>{h}</Chip>
          ))}
        </div>
        {f.heard === 'Other' && (
          <div className="sub-field">
            <label htmlFor="heardOther" className="sr-only">How you heard about us</label>
            <TextInput id="heardOther" value={f.heardOther} placeholder="Tell us where" onChange={(v) => set('heardOther', v)} />
          </div>
        )}
        {heardErr && <p className="field-error" role="alert"><Icon name="alert" size={18} /> <span>Please choose one, or "Prefer not to say".</span></p>}
      </div>
    </div>
  );
}

/* ---------------- Step 5: Review & sign in ---------------- */

export function programAvailability(p, { now, age, counts }) {
  const count = counts[p.id];
  const mins = minutesUntil(now, p.end);
  if (mins <= 0) return { ok: false, why: 'Finished for today' };
  if (p.minAge != null && age != null && (age < p.minAge || age > p.maxAge)) return { ok: false, why: `For ages ${p.minAge}–${p.maxAge}` };
  if (p.guardianUnder && age != null && age < p.guardianUnder) return { ok: false, why: 'Needs a guardian on file first' };
  if (p.mealCutoff && minutesUntil(now, p.mealCutoff) <= 0) return { ok: false, why: `Meal count closed at ${timeLabel(p.mealCutoff)}` };
  if (count >= p.capacity) return { ok: false, why: 'Full today' };
  return { ok: true };
}

export function ReviewStep({ f, goTo, match, memberId, today, now, counts, chosen, setChosen }) {
  const dob = dobInfo(f, today);
  const age = dob.error ? null : dob.age;
  const rel = f.ecRelationship === 'Other' ? f.ecRelationshipOther : f.ecRelationship;
  const toggle = (id) => setChosen(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);

  return (
    <div className="step-body review">
      <div className="review-grid">
        <ReviewBlock title="Name" onEdit={() => goTo(0)}>
          <p>{f.firstName} {f.lastName}{f.preferredName && ` (goes by ${f.preferredName})`}</p>
          {f.previousNames.length > 0 && <p className="muted">Previous names: {f.previousNames.map((p) => p.name).join(', ')}</p>}
          <p className="muted">{match === 'merged' ? `Existing member #${memberId}, back after 2019` : `New member #${memberId}`}</p>
        </ReviewBlock>
        <ReviewBlock title="Address and phone" onEdit={() => goTo(1)}>
          <p>{f.street}{f.unit && `, ${f.unit}`}, {f.city}, {f.state} {f.zip}</p>
          <p>{normPhone(f.phone) ? fmtPhone(normPhone(f.phone)) : f.phone}</p>
          <p className="muted">{f.email || 'No email given'}</p>
        </ReviewBlock>
        <ReviewBlock title="Birthday and emergency contact" onEdit={() => goTo(2)}>
          <p>Born {dob.label}</p>
          <p>{f.ecName} ({rel?.toLowerCase()}), {normPhone(f.ecPhone) ? fmtPhone(normPhone(f.ecPhone)) : f.ecPhone}</p>
        </ReviewBlock>
        <ReviewBlock title="Your answers" onEdit={() => goTo(3)}>
          <p>Newsletter photos: <strong>{f.photo === 'yes' ? 'Yes' : 'No'}</strong></p>
          <p className="muted">{f.access.length || f.accessNote ? [...f.access, f.accessNote].filter(Boolean).join('; ') : 'No access needs listed'}</p>
          <p className="muted">Heard about us: {f.heard === 'Other' ? f.heardOther : f.heard}</p>
        </ReviewBlock>
      </div>

      <fieldset className="group programs-pick">
        <legend>Sign me in for today</legend>
        <div className="program-list">
          {PROGRAMS.map((p) => {
            const av = programAvailability(p, { now, age, counts });
            const on = chosen.includes(p.id);
            const count = counts[p.id];
            const until = minutesUntil(now, p.start);
            return (
              <button
                key={p.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={!av.ok}
                className={`program-option ${on ? 'selected' : ''}`}
                onClick={() => toggle(p.id)}
              >
                <span className="box">{on && <Icon name="check" size={18} />}</span>
                <span className="po-main">
                  <span className="po-name">{p.name}</span>
                  <span className="po-meta">
                    {timeLabel(p.start)}–{timeLabel(p.end)} · {p.room}
                    {av.ok && until > 0 && <> · starts {relMinutes(until)}</>}
                  </span>
                </span>
                <span className="po-side">
                  {!av.ok ? <span className="po-why">{av.why}</span> : p.isMeal ? (
                    <span className="po-count">Lunch is counted by {timeLabel(p.mealCutoff)}</span>
                  ) : (
                    <span className="po-count">{count + (on ? 1 : 0)} of {p.capacity} spots</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }) {
  return (
    <section className="review-block">
      <header>
        <h3>{title}</h3>
        <button type="button" className="btn link small" onClick={onEdit}><Icon name="pencil" size={16} /> Change</button>
      </header>
      {children}
    </section>
  );
}
