import { CAMP, RELATIONSHIPS_NON_PARENT } from './seed';
import { NOW_ISO, parseUserDate, usDate } from './dates';
import { PHYSICIAN_MIN_DATE, TDAP_MIN_DATE } from './formModel';
import type { EmergencyContact } from './store';

export type Check<T> = { ok: true; value: T } | { ok: false; error: string };

export function checkTdapDate(input: string): Check<string> {
  const iso = parseUserDate(input);
  if (!iso) return { ok: false, error: 'Enter the date as MM/DD/YYYY, for example 04/02/2026.' };
  if (iso > NOW_ISO) return { ok: false, error: "The Tdap date can't be in the future." };
  if (iso < TDAP_MIN_DATE) {
    return {
      ok: false,
      error: `Camp needs a Tdap given on or after ${usDate(TDAP_MIN_DATE)}, Imani's 11th birthday.`,
    };
  }
  return { ok: true, value: iso };
}

export function checkEpipenExpiry(input: string): Check<string> {
  const iso = parseUserDate(input);
  if (!iso) return { ok: false, error: 'Enter the expiration date printed on the device, as MM/DD/YYYY.' };
  if (iso <= NOW_ISO) return { ok: false, error: 'That date has already passed. Use a device that has not expired.' };
  if (iso < CAMP.end) {
    return {
      ok: false,
      error: `This device expires before camp ends on ${usDate(CAMP.end)}. Camp needs one that lasts through the last day.`,
    };
  }
  return { ok: true, value: iso };
}

export const CETIRIZINE_UNITS = ['mg', 'mL', 'tablet'] as const;

export function checkCetirizineDose(dose: string, unit: string): Check<{ dose: string; unit: string }> {
  const trimmed = dose.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed) || Number(trimmed) <= 0) {
    return { ok: false, error: 'Enter the amount as a number, for example 10.' };
  }
  if (!(CETIRIZINE_UNITS as readonly string[]).includes(unit)) {
    return { ok: false, error: 'Choose the unit the dose is measured in. The camp form needs it.' };
  }
  return { ok: true, value: { dose: trimmed, unit } };
}

export function checkMemberId(input: string): Check<string> {
  const trimmed = input.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9 \-]{5,}$/.test(trimmed)) {
    return { ok: false, error: 'Member IDs are letters and numbers, usually 9 or more characters.' };
  }
  return { ok: true, value: trimmed };
}

export function checkPhysicianDate(input: string): Check<string> {
  const iso = parseUserDate(input);
  if (!iso) return { ok: false, error: 'Enter the date as MM/DD/YYYY, for example 04/02/2026.' };
  if (iso > NOW_ISO) return { ok: false, error: "The signature date can't be in the future." };
  if (iso < PHYSICIAN_MIN_DATE) {
    return {
      ok: false,
      error: `Camp needs a physician date within 12 months before camp starts, so on or after ${usDate(PHYSICIAN_MIN_DATE)}.`,
    };
  }
  return { ok: true, value: iso };
}

export interface EmergencyDraft {
  name: string;
  relation: string;
  phone: string;
  altPhone: string;
  adultConfirmed: boolean;
  canPickUp: boolean;
  fromSaved: string | null;
}

export type EmergencyResult =
  | { ok: true; value: EmergencyContact }
  | { ok: false; errors: Partial<Record<keyof EmergencyDraft, string>> };

export function checkEmergency(draft: EmergencyDraft): EmergencyResult {
  const errors: Partial<Record<keyof EmergencyDraft, string>> = {};
  const name = draft.name.trim().replace(/\s+/g, ' ');
  if (name.split(' ').filter(Boolean).length < 2) errors.name = 'Enter first and last name.';
  if (!draft.relation) {
    errors.relation = 'Choose the relationship. Parents and guardians can’t be used here.';
  } else if (!RELATIONSHIPS_NON_PARENT.includes(draft.relation)) {
    errors.relation = 'Camp needs someone who is not a parent or guardian.';
  }
  const phoneDigits = draft.phone.replace(/\D/g, '');
  if (phoneDigits.length !== 10) errors.phone = 'Enter a 10-digit phone number.';
  if (draft.altPhone.trim() && draft.altPhone.replace(/\D/g, '').length !== 10) {
    errors.altPhone = 'Enter a 10-digit phone number, or leave it blank.';
  }
  if (!draft.adultConfirmed) errors.adultConfirmed = 'Confirm this person is 18 or older.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const fmt = (d: string) => `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return {
    ok: true,
    value: {
      name,
      relation: draft.relation,
      phone: fmt(phoneDigits),
      altPhone: draft.altPhone.trim() ? fmt(draft.altPhone.replace(/\D/g, '')) : '',
      canPickUp: draft.canPickUp,
      fromSaved: draft.fromSaved,
    },
  };
}
