import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import {
  ALLERGIES,
  DOCTOR,
  IMMUNIZATIONS_SEED,
  INSURANCE_SEED,
  MEDICATIONS_SEED,
  type Allergy,
  type Doctor,
  type Immunization,
  type Insurance,
  type Medication,
} from './seed';
import { usDate, usMonthYear } from './dates';

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
  altPhone: string;
  canPickUp: boolean;
  fromSaved: string | null;
}

export interface RecordState {
  immunizations: Immunization[];
  medications: Medication[];
  allergies: Allergy[];
  doctor: Doctor;
  insurance: Insurance;
}

export type RecordsTab = 'immunizations' | 'allergies' | 'medications' | 'doctor';
export type View = 'forms' | 'records' | 'household' | 'review' | 'submitted';

export interface CampState {
  emergencyContact: EmergencyContact | null;
  physicianSignatureDate: string | null;
  /** Human-readable log of fixes made in this session, shown on the review screen. */
  changes: string[];
  submittedRef: string | null;
}

export interface AppState {
  view: View;
  recordsTab: RecordsTab;
  record: RecordState;
  camp: CampState;
}

export type Action =
  | { type: 'navigate'; view: View }
  | { type: 'setRecordsTab'; tab: RecordsTab }
  | { type: 'saveTdap'; date: string }
  | { type: 'saveEpipen'; expires: string; lot: string }
  | { type: 'saveCetirizine'; dose: string; unit: string }
  | { type: 'confirmMemberId'; memberId: string; date: string }
  | { type: 'saveEmergency'; contact: EmergencyContact }
  | { type: 'savePhysicianDate'; date: string }
  | { type: 'submit'; reference: string };

export const initialState: AppState = {
  view: 'forms',
  recordsTab: 'immunizations',
  record: {
    immunizations: IMMUNIZATIONS_SEED,
    medications: MEDICATIONS_SEED,
    allergies: ALLERGIES,
    doctor: DOCTOR,
    insurance: INSURANCE_SEED,
  },
  camp: {
    emergencyContact: null,
    physicianSignatureDate: null,
    changes: [],
    submittedRef: null,
  },
};

function updateImmunization(list: Immunization[], id: string, patch: Partial<Immunization>) {
  return list.map((i) => (i.id === id ? { ...i, ...patch } : i));
}

function updateMedication(list: Medication[], id: string, patch: Partial<Medication>) {
  return list.map((m) => (m.id === id ? { ...m, ...patch } : m));
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'navigate':
      return { ...state, view: action.view };

    case 'setRecordsTab':
      return { ...state, recordsTab: action.tab };

    case 'saveTdap': {
      const old = state.record.immunizations.find((i) => i.id === 'imm-16');
      const from = old ? usDate(old.date) : 'blank';
      return {
        ...state,
        record: {
          ...state.record,
          immunizations: updateImmunization(state.record.immunizations, 'imm-16', { date: action.date }),
        },
        camp: {
          ...state.camp,
          changes: [...state.camp.changes, `Tdap booster date changed from ${from} to ${usDate(action.date)}`],
        },
      };
    }

    case 'saveEpipen': {
      const old = state.record.medications.find((m) => m.id === 'med-epi');
      const lot = action.lot.trim() || old?.lot;
      return {
        ...state,
        record: {
          ...state.record,
          medications: updateMedication(state.record.medications, 'med-epi', {
            expires: action.expires,
            lot,
          }),
        },
        camp: {
          ...state.camp,
          changes: [
            ...state.camp.changes,
            `Epinephrine auto-injector replaced: expires ${usDate(action.expires)}`,
          ],
        },
      };
    }

    case 'saveCetirizine':
      return {
        ...state,
        record: {
          ...state.record,
          medications: updateMedication(state.record.medications, 'med-cetirizine', {
            dose: action.dose,
            unit: action.unit,
          }),
        },
        camp: {
          ...state.camp,
          changes: [...state.camp.changes, `Cetirizine dose set to ${action.dose} ${action.unit}`],
        },
      };

    case 'confirmMemberId':
      return {
        ...state,
        record: {
          ...state.record,
          insurance: {
            ...state.record.insurance,
            memberId: action.memberId,
            lastConfirmed: action.date,
          },
        },
        camp: {
          ...state.camp,
          changes: [...state.camp.changes, `Insurance member ID confirmed against the card`],
        },
      };

    case 'saveEmergency':
      return {
        ...state,
        camp: {
          ...state.camp,
          emergencyContact: action.contact,
          changes: [
            ...state.camp.changes,
            `Emergency contact added: ${action.contact.name} (${action.contact.relation})`,
          ],
        },
      };

    case 'savePhysicianDate':
      return {
        ...state,
        camp: {
          ...state.camp,
          physicianSignatureDate: action.date,
          changes: [...state.camp.changes, `Physician signature date set to ${usDate(action.date)}`],
        },
      };

    case 'submit':
      return {
        ...state,
        view: 'submitted',
        camp: { ...state.camp, submittedRef: action.reference },
      };

    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

/** Display helper for medication expiry, which may be YYYY-MM (original) or YYYY-MM-DD. */
export function expiryLabel(expires: string): string {
  return expires.length === 7 ? usMonthYear(expires) : usDate(expires);
}
