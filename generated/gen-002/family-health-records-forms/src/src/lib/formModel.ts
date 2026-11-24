import {
  AVS,
  CAMP,
  DOCTOR,
  PARENTS,
  PERSON,
  TDAP_MIN_AGE_YEARS,
  type Immunization,
} from './seed';
import {
  addMonths,
  addYears,
  ageOn,
  longDate,
  monthEndIso,
  NOW_ISO,
  usDate,
} from './dates';
import type { AppState } from './store';
import { expiryLabel } from './store';

export type SectionId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type FieldStatus = 'filled' | 'review' | 'empty';
export type FixAction = 'tdap' | 'epipen' | 'cetirizine' | 'memberId' | 'emergency' | 'physDate';

export interface FormField {
  id: string;
  section: SectionId;
  label: string;
  value: string | null;
  status: FieldStatus;
  /** Where the value came from, shown under the label. */
  source: string;
  /** Why it needs attention (review or empty). */
  issue?: string;
  /** Flagged problems block submission; confirm items and blanks also do. */
  severity?: 'problem' | 'confirm' | 'blank';
  fix?: FixAction;
  fixLabel?: string;
}

export const SECTIONS: { id: SectionId; title: string }[] = [
  { id: 'A', title: 'Camper information' },
  { id: 'B', title: 'Parents and guardians' },
  { id: 'C', title: 'Emergency contacts and hospital' },
  { id: 'D', title: 'Health insurance' },
  { id: 'E', title: 'Immunizations' },
  { id: 'F', title: 'Medical history, medications and physician' },
];

/** Short names for the side-panel to-do list. */
export const TODO_LABELS: Record<string, string> = {
  E5: 'Tdap booster date',
  F15: 'Cetirizine dose',
  F18: 'Epinephrine expiration',
  D2: 'Member ID',
  C1: 'Non-parent emergency contact',
  F1: 'Last tetanus date',
  F7: 'Physician signature date',
};

export const TDAP_MIN_DATE = addYears(PERSON.dob, TDAP_MIN_AGE_YEARS);
export const PHYSICIAN_MIN_DATE = addMonths(CAMP.start, -12);

export function tdapProblem(date: string): string | null {
  if (date < TDAP_MIN_DATE) {
    return `${usDate(date)} is before Imani's 11th birthday (${usDate(TDAP_MIN_DATE)}). Camp accepts a Tdap given on or after that date.`;
  }
  return null;
}

export function epipenProblem(expires: string): string | null {
  const endIso = expires.length === 7 ? monthEndIso(expires) : expires;
  if (endIso < NOW_ISO) {
    return `Expired ${expiryLabel(expires)}. Replace the device, then enter the new expiration date.`;
  }
  if (endIso < CAMP.end) {
    return `Expires ${expiryLabel(expires)}, before camp ends (${usDate(CAMP.end)}).`;
  }
  return null;
}

function immunization(state: AppState, vaccine: string, dose?: string): Immunization | undefined {
  return state.record.immunizations.find((i) => i.vaccine === vaccine && (!dose || i.dose === dose));
}

function lastDoseLabel(state: AppState, vaccine: string): string {
  const doses = state.record.immunizations.filter((i) => i.vaccine === vaccine);
  const last = doses.reduce((a, b) => (a.date > b.date ? a : b));
  return `Complete, last dose ${usDate(last.date)}`;
}

/** Latest tetanus-containing dose (Tdap, DTaP). Null if none. */
function latestTetanus(state: AppState): Immunization | undefined {
  return state.record.immunizations
    .filter((i) => i.vaccine === 'Tdap' || i.vaccine === 'DTaP')
    .reduce<Immunization | undefined>((best, i) => (!best || i.date > best.date ? i : best), undefined);
}

export function buildFields(state: AppState): FormField[] {
  const { record, camp } = state;
  const rec = (value: string, extra?: Partial<FormField>): Partial<FormField> => ({ value, ...extra });
  const from = "Stored in Imani's record";
  const byDarnell = 'Entered by Darnell';

  const tdap = immunization(state, 'Tdap');
  const tdapBad = tdap ? tdapProblem(tdap.date) : null;

  const epi = record.medications.find((m) => m.id === 'med-epi');
  const epiBad = epi?.expires ? epipenProblem(epi.expires) : 'No expiration on file';

  const ceti = record.medications.find((m) => m.id === 'med-cetirizine');

  const memberStale = addMonths(record.insurance.lastConfirmed, 12) < NOW_ISO;

  const latest = latestTetanus(state);
  const tetanusOk = !!latest && !tetanusProblemFor(latest);

  const raw: { id: string; section: SectionId; label: string; partial: Partial<FormField> }[] = [
    // A. Camper information (7)
    { id: 'A1', section: 'A', label: 'Camper legal name', partial: rec(PERSON.legalName, { source: from }) },
    { id: 'A2', section: 'A', label: 'Date of birth', partial: rec(usDate(PERSON.dob), { source: from }) },
    {
      id: 'A3',
      section: 'A',
      label: 'Age on first day of camp',
      partial: rec(`${ageOn(PERSON.dob, CAMP.start)} years`, { source: 'Calculated from date of birth' }),
    },
    { id: 'A4', section: 'A', label: 'Sex on record', partial: rec(PERSON.sex, { source: from }) },
    { id: 'A5', section: 'A', label: 'Home address', partial: rec(PERSON.address, { source: from }) },
    { id: 'A6', section: 'A', label: 'Name the camper goes by', partial: rec(PERSON.preferredName, { source: byDarnell }) },
    { id: 'A7', section: 'A', label: 'School and grade', partial: rec(PERSON.school, { source: byDarnell }) },

    // B. Parents and guardians (6)
    { id: 'B1', section: 'B', label: 'Parent or guardian 1', partial: rec(PARENTS.p1.name, { source: from }) },
    { id: 'B2', section: 'B', label: 'Phone, parent 1', partial: rec(PARENTS.p1.phone, { source: from }) },
    { id: 'B3', section: 'B', label: 'Email, parent 1', partial: rec(PARENTS.p1.email, { source: from }) },
    { id: 'B4', section: 'B', label: 'Parent or guardian 2', partial: rec(PARENTS.p2.name, { source: from }) },
    { id: 'B5', section: 'B', label: 'Phone, parent 2', partial: rec(PARENTS.p2.phone, { source: from }) },
    {
      id: 'B6',
      section: 'B',
      label: 'Medical consent given by',
      partial: rec('Darnell Brooks or Keisha Brooks', { source: byDarnell }),
    },

    // C. Emergency contacts and hospital (2)
    camp.emergencyContact
      ? {
          id: 'C1',
          section: 'C',
          label: 'Emergency contact who is not a parent',
          partial: rec(
            `${camp.emergencyContact.name} (${camp.emergencyContact.relation}), ${camp.emergencyContact.phone}`,
            { source: byDarnell },
          ),
        }
      : {
          id: 'C1',
          section: 'C',
          label: 'Emergency contact who is not a parent',
          partial: {
            value: null,
            status: 'empty',
            source: 'Not on file',
            severity: 'blank',
            issue: 'Camp requires one adult, 18 or older, who is not a parent or guardian.',
            fix: 'emergency',
            fixLabel: 'Add contact',
          },
        },
    { id: 'C2', section: 'C', label: 'Nearest hospital', partial: rec("Rady Children's Hospital, San Diego", { source: byDarnell }) },

    // D. Health insurance (3)
    { id: 'D1', section: 'D', label: 'Insurance carrier', partial: rec(record.insurance.carrier, { source: from }) },
    memberStale
      ? {
          id: 'D2',
          section: 'D',
          label: 'Member ID',
          partial: {
            value: record.insurance.memberId,
            status: 'review',
            source: from,
            severity: 'confirm',
            issue: `Last confirmed ${usDate(record.insurance.lastConfirmed)}, more than 12 months ago. Check it against the card.`,
            fix: 'memberId',
            fixLabel: 'Confirm ID',
          },
        }
      : {
          id: 'D2',
          section: 'D',
          label: 'Member ID',
          partial: rec(record.insurance.memberId, {
            source: `${from}, confirmed ${usDate(record.insurance.lastConfirmed)}`,
          }),
        },
    { id: 'D3', section: 'D', label: 'Group number', partial: rec(record.insurance.group, { source: from }) },

    // E. Immunizations (9)
    { id: 'E1', section: 'E', label: 'MMR, dose 1', partial: rec(usDate(immunization(state, 'MMR', 'Dose 1')!.date), { source: from }) },
    { id: 'E2', section: 'E', label: 'MMR, dose 2', partial: rec(usDate(immunization(state, 'MMR', 'Dose 2')!.date), { source: from }) },
    { id: 'E3', section: 'E', label: 'Varicella, dose 1', partial: rec(usDate(immunization(state, 'Varicella', 'Dose 1')!.date), { source: from }) },
    { id: 'E4', section: 'E', label: 'Varicella, dose 2', partial: rec(usDate(immunization(state, 'Varicella', 'Dose 2')!.date), { source: from }) },
    tdap && tdapBad
      ? {
          id: 'E5',
          section: 'E',
          label: 'Tdap (adolescent booster)',
          partial: {
            value: usDate(tdap.date),
            status: 'review',
            source: from,
            severity: 'problem',
            issue: tdapBad,
            fix: 'tdap',
            fixLabel: 'Fix date',
          },
        }
      : {
          id: 'E5',
          section: 'E',
          label: 'Tdap (adolescent booster)',
          partial: rec(tdap ? usDate(tdap.date) : 'None on file', { source: from }),
        },
    { id: 'E6', section: 'E', label: 'Hepatitis B series', partial: rec(lastDoseLabel(state, 'Hepatitis B'), { source: from }) },
    { id: 'E7', section: 'E', label: 'Polio (IPV) series', partial: rec(lastDoseLabel(state, 'Polio (IPV)'), { source: from }) },
    { id: 'E8', section: 'E', label: 'HPV series', partial: rec(lastDoseLabel(state, 'HPV'), { source: from }) },
    { id: 'E9', section: 'E', label: 'Influenza, 2026–27 season', partial: rec(usDate(immunization(state, 'Influenza')!.date), { source: from }) },

    // F. Medical history, medications and physician (21)
    tetanusOk && latest
      ? {
          id: 'F1',
          section: 'F',
          label: 'Most recent tetanus-containing dose',
          partial: rec(usDate(latest.date), { source: `Pulled from the ${latest.vaccine} entry` }),
        }
      : {
          id: 'F1',
          section: 'F',
          label: 'Most recent tetanus-containing dose',
          partial: {
            value: null,
            status: 'empty',
            source: 'Pulled from the Tdap entry',
            severity: 'blank',
            issue: 'Fills in automatically once the Tdap date is corrected.',
            fix: 'tdap',
            fixLabel: 'Fix Tdap',
          },
        },
    { id: 'F2', section: 'F', label: 'Physician', partial: rec(DOCTOR.name, { source: from }) },
    { id: 'F3', section: 'F', label: 'Practice', partial: rec(record.doctor.practice, { source: from }) },
    { id: 'F4', section: 'F', label: 'Practice phone', partial: rec(record.doctor.phone, { source: from }) },
    { id: 'F5', section: 'F', label: 'Practice address', partial: rec(record.doctor.address, { source: from }) },
    {
      id: 'F6',
      section: 'F',
      label: 'Date of most recent physical',
      partial: rec(usDate(AVS.visitDate), { source: 'After-visit summary, Eastgate Pediatrics' }),
    },
    camp.physicianSignatureDate
      ? {
          id: 'F7',
          section: 'F',
          label: 'Physician signature date',
          partial: rec(usDate(camp.physicianSignatureDate), { source: byDarnell }),
        }
      : {
          id: 'F7',
          section: 'F',
          label: 'Physician signature date',
          partial: {
            value: null,
            status: 'empty',
            source: 'Needed for this camp',
            severity: 'blank',
            issue: `Date the physician signed the camp physical. Must fall within 12 months before camp starts (on or after ${usDate(PHYSICIAN_MIN_DATE)}).`,
            fix: 'physDate',
            fixLabel: 'Enter date',
          },
        },
    { id: 'F8', section: 'F', label: 'Chronic conditions', partial: rec('None reported', { source: from }) },
    { id: 'F9', section: 'F', label: 'Food allergy', partial: rec(record.allergies[0].allergen, { source: from }) },
    { id: 'F10', section: 'F', label: 'Food allergy severity', partial: rec(record.allergies[0].severity, { source: from }) },
    { id: 'F11', section: 'F', label: 'Food allergy action plan', partial: rec(record.allergies[0].plan ?? '', { source: from }) },
    { id: 'F12', section: 'F', label: 'Drug allergy', partial: rec(record.allergies[1].allergen, { source: from }) },
    { id: 'F13', section: 'F', label: 'Drug allergy reaction', partial: rec(record.allergies[1].reaction, { source: from }) },
    { id: 'F14', section: 'F', label: 'Daily medication', partial: rec(ceti?.name ?? 'None', { source: from }) },
    !ceti || ceti.unit === null
      ? {
          id: 'F15',
          section: 'F',
          label: 'Cetirizine dose',
          partial: {
            value: ceti ? `${ceti.dose} (no unit)` : null,
            status: 'review',
            source: from,
            severity: 'problem',
            issue: 'Entered as "10" with no unit. Check the dose on the after-visit summary.',
            fix: 'cetirizine',
            fixLabel: 'Fix dose',
          },
        }
      : {
          id: 'F15',
          section: 'F',
          label: 'Cetirizine dose',
          partial: rec(`${ceti.dose} ${ceti.unit}`, { source: from }),
        },
    { id: 'F16', section: 'F', label: 'Cetirizine schedule', partial: rec(ceti?.schedule ?? '', { source: from }) },
    { id: 'F17', section: 'F', label: 'Epinephrine auto-injector strength', partial: rec(epi ? `${epi.dose} ${epi.unit}` : 'None', { source: from }) },
    epiBad && epi?.expires
      ? {
          id: 'F18',
          section: 'F',
          label: 'Epinephrine auto-injector expiration',
          partial: {
            value: expiryLabel(epi.expires),
            status: 'review',
            source: from,
            severity: 'problem',
            issue: epiBad,
            fix: 'epipen',
            fixLabel: 'Replace device',
          },
        }
      : {
          id: 'F18',
          section: 'F',
          label: 'Epinephrine auto-injector expiration',
          partial: rec(epi?.expires ? expiryLabel(epi.expires) : 'None', {
            source: `${from}${epi?.lot ? `, lot ${epi.lot}` : ''}`,
          }),
        },
    { id: 'F19', section: 'F', label: 'Epinephrine on hand at camp', partial: rec('Yes, camper carries one', { source: byDarnell }) },
    {
      id: 'F20',
      section: 'F',
      label: 'Cleared for camp activities',
      partial: rec('Yes, per physical on 04/02/2026', { source: 'After-visit summary' }),
    },
    { id: 'F21', section: 'F', label: 'Dietary needs', partial: rec('Nut-free meals', { source: byDarnell }) },
  ];

  return raw.map(({ id, section, label, partial }) => {
    const status: FieldStatus = partial.status ?? 'filled';
    return {
      id,
      section,
      label,
      value: partial.value ?? null,
      status,
      source: partial.source ?? '',
      issue: partial.issue,
      severity: partial.severity,
      fix: partial.fix,
      fixLabel: partial.fixLabel,
    };
  });
}

function tetanusProblemFor(i: Immunization): string | null {
  return i.vaccine === 'Tdap' ? tdapProblem(i.date) : null;
}

export interface FieldCounts {
  total: number;
  filled: number;
  review: number;
  empty: number;
}

export function countFields(fields: FormField[]): FieldCounts {
  return {
    total: fields.length,
    filled: fields.filter((f) => f.status === 'filled').length,
    review: fields.filter((f) => f.status === 'review').length,
    empty: fields.filter((f) => f.status === 'empty').length,
  };
}

/** Items the parent must clear before signing, in the order they are shown on the side panel. */
export function openItems(fields: FormField[]): FormField[] {
  const rank = { problem: 0, confirm: 1, blank: 2 } as const;
  return fields
    .filter((f) => f.status !== 'filled')
    .sort((a, b) => rank[a.severity ?? 'blank'] - rank[b.severity ?? 'blank']);
}

export const DUE_LABEL = `${longDate(CAMP.dueDate)}, 12:00 PM`;
