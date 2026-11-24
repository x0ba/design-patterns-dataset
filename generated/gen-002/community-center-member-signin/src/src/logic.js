import { MONTHS } from './data.js';

export const digits = (v) => (v || '').replace(/\D/g, '');

export function normPhone(v) {
  const d = digits(v);
  if (d.length === 10) return d;
  if (d.length === 11 && d[0] === '1') return d.slice(1);
  return null;
}

export const fmtPhone = (d10) => `(${d10.slice(0, 3)}) ${d10.slice(3, 6)}-${d10.slice(6)}`;

// Returns null when fine, or { msg, fix? } in plain language.
export function phoneIssue(v, { required = true } = {}) {
  const d = digits(v);
  if (!d) return required ? { msg: 'Please enter a phone number, including the area code.' } : null;
  if (normPhone(v)) return null;
  if (d.length === 13 && d.slice(0, 3) === d.slice(3, 6)) {
    return {
      msg: `That's 13 digits. It looks like the area code ${d.slice(0, 3)} was typed twice.`,
      fix: d.slice(3),
    };
  }
  if (d.length > 10) return { msg: `That's ${d.length} digits. Phone numbers have 10: the 3-digit area code, then 7 digits.` };
  return { msg: `That's ${d.length} digits. Phone numbers have 10, including the 3-digit area code.` };
}

export function emailIssue(v) {
  const t = (v || '').trim();
  if (!t) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return 'That email address looks incomplete. It should look like name@example.com. You can also leave it blank.';
  return null;
}

export function dobInfo(f, today) {
  const m = Number(f.dobMonth);
  const d = Number(f.dobDay);
  const y = Number(f.dobYear);
  if (!f.dobMonth && !f.dobDay && !f.dobYear) return { error: 'Please enter your date of birth.' };
  if (!m) return { error: 'Please choose the month you were born.' };
  if (!f.dobDay || !d || d < 1 || d > 31) return { error: 'Please enter the day as a number from 1 to 31.' };
  if (!f.dobYear || String(f.dobYear).length !== 4) return { error: 'Please enter the year with 4 digits, for example 1958.' };
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1) return { error: `${MONTHS[m - 1]} doesn't have ${d} days. Please check the day.` };
  if (y < 1905 || date > today) return { error: 'Please check the year.' };
  let age = today.getFullYear() - y;
  if (today.getMonth() < m - 1 || (today.getMonth() === m - 1 && today.getDate() < d)) age -= 1;
  return { age, label: `${MONTHS[m - 1]} ${d}, ${y}` };
}

export const STEPS = [
  { id: 'name', title: 'Your name', short: 'Name' },
  { id: 'contact', title: 'Address and phone', short: 'Address & phone' },
  { id: 'emergency', title: 'Birthday and emergency contact', short: 'Birthday & emergency contact' },
  { id: 'questions', title: 'A few quick questions', short: 'A few questions' },
  { id: 'review', title: 'Check and sign in', short: 'Check & sign in' },
];

// Each issue: { field, msg } — field is the DOM id to focus.
export function stepIssues(stepId, f, ctx) {
  const out = [];
  if (stepId === 'name') {
    if (!f.firstName.trim()) out.push({ field: 'firstName', msg: 'Please enter your first name.' });
    if (!f.lastName.trim()) out.push({ field: 'lastName', msg: 'Please enter your last name.' });
  }
  if (stepId === 'contact') {
    if (ctx.match === null) out.push({ field: 'match-card', msg: 'Tell us whether the 2019 record is you.' });
    if (ctx.match === 'confirming') out.push({ field: 'merge-confirm', msg: 'The desk volunteer needs to confirm the record update.' });
    if (!f.street.trim()) out.push({ field: 'street', msg: 'Please enter your street address.' });
    if (!f.city.trim()) out.push({ field: 'city', msg: 'Please enter your city.' });
    if (!/^\d{5}$/.test(f.zip.trim())) out.push({ field: 'zip', msg: 'Please enter a 5-digit ZIP code.' });
    const p = phoneIssue(f.phone);
    if (p) out.push({ field: 'phone', msg: p.fix ? 'Your phone number has the area code twice.' : p.msg });
    const e = emailIssue(f.email);
    if (e) out.push({ field: 'email', msg: 'Your email address looks incomplete.' });
  }
  if (stepId === 'emergency') {
    const dob = dobInfo(f, ctx.today);
    if (dob.error) out.push({ field: 'dobMonth', msg: dob.error });
    if (!f.ecName.trim()) out.push({ field: 'ecName', msg: "Please enter your emergency contact's name." });
    if (!f.ecRelationship) out.push({ field: 'ecRelationship', msg: 'Please choose how you know them.' });
    else if (f.ecRelationship === 'Other' && !f.ecRelationshipOther.trim())
      out.push({ field: 'ecRelationshipOther', msg: 'Please say how you know them.' });
    const p = phoneIssue(f.ecPhone);
    if (p) out.push({ field: 'ecPhone', msg: p.msg });
    else if (normPhone(f.ecPhone) === normPhone(f.phone))
      out.push({ field: 'ecPhone', msg: "That's your own number. Please give a number for your emergency contact." });
  }
  if (stepId === 'questions') {
    if (f.photo === null) out.push({ field: 'photo-yes', msg: 'Please answer the newsletter photo question.' });
    if (!f.heard) out.push({ field: 'heard-0', msg: 'Please choose how you heard about us, or "Prefer not to say".' });
    else if (f.heard === 'Other' && !f.heardOther.trim()) out.push({ field: 'heardOther', msg: 'Please tell us how you heard about us.' });
  }
  return out;
}

export function timeLabel([h, m]) {
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}

export function clockLabel(date) {
  return timeLabel([date.getHours(), date.getMinutes()]);
}

export function minutesUntil(now, [h, m]) {
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  return Math.round((t - now) / 60000);
}

export function relMinutes(mins) {
  if (mins <= 0) return mins > -5 ? 'starting now' : 'in progress';
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return r ? `in ${h} h ${r} min` : `in ${h} h`;
}
