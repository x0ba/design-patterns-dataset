// Mock data for the Brooks household. Names, phone numbers and emails are invented.
// Phone numbers use the 555-01xx range reserved for fiction.

export interface Immunization {
  id: string;
  vaccine: string;
  dose: string;
  date: string; // ISO YYYY-MM-DD
  givenBy: string;
}

export interface Allergy {
  id: string;
  allergen: string;
  kind: 'Food' | 'Drug';
  severity: 'Severe' | 'Moderate' | 'Mild';
  reaction: string;
  plan?: string;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  unit: string | null; // null = the unit was never entered
  schedule: string;
  lot?: string;
  /** YYYY-MM from the original record, or YYYY-MM-DD once a replacement is entered. */
  expires?: string;
  purpose: string;
}

export interface Insurance {
  carrier: string;
  memberId: string;
  group: string;
  lastConfirmed: string; // ISO
}

export interface Doctor {
  name: string;
  practice: string;
  phone: string;
  address: string;
}

export interface HouseholdMember {
  id: string;
  name: string;
  relation: string;
  dob?: string;
  adult: boolean;
}

export const CAMP = {
  name: 'Camp Ridgeline Winter Session',
  start: '2026-12-27',
  end: '2027-01-02',
  dueDate: '2026-11-20', // Friday
  dueMinutes: 12 * 60, // 12:00 PM
  address: 'Ridgeline Outdoor School, 1180 Pine Hollow Rd, Idyllwild, CA 92549',
  submitTo: 'Camp Ridgeline health office',
};

export const CAMPER_ID = 'imani';

export const HOUSEHOLD: HouseholdMember[] = [
  { id: 'darnell', name: 'Darnell Brooks', relation: 'Father', adult: true },
  { id: 'keisha', name: 'Keisha Brooks', relation: 'Partner (parent)', adult: true },
  { id: 'imani', name: 'Imani Brooks', relation: 'Daughter', dob: '2015-03-08', adult: false },
  { id: 'malik', name: 'Malik Brooks', relation: 'Son', dob: '2018-05-17', adult: false },
  { id: 'zuri', name: 'Zuri Brooks', relation: 'Daughter', dob: '2023-07-22', adult: false },
];

export const PERSON = {
  legalName: 'Imani Renée Brooks',
  preferredName: 'Imani',
  dob: '2015-03-08',
  sex: 'Female',
  address: '3360 Clairemont Mesa Blvd, San Diego, CA 92117',
  school: 'Sunrise Ridge Middle School · 6th grade',
};

export const PARENTS = {
  p1: { name: 'Darnell Brooks', phone: '(619) 555-0147', email: 'darnell.brooks@example.com' },
  p2: { name: 'Keisha Brooks', phone: '(619) 555-0139' },
};

/** Contacts Darnell has used on other forms; offered as shortcuts only. */
export const SAVED_CONTACTS = [
  {
    id: 'saved-gloria',
    name: 'Gloria Simmons',
    relation: 'Grandparent',
    phone: '(619) 555-0166',
    usedOn: "Malik's youth soccer registration, spring 2025",
  },
  {
    id: 'saved-terrence',
    name: 'Terrence Brooks',
    relation: 'Aunt or uncle',
    phone: '(858) 555-0112',
    usedOn: "Zuri's preschool pickup list, 2025–26",
  },
];

export const RELATIONSHIPS_NON_PARENT = [
  'Grandparent',
  'Aunt or uncle',
  'Adult sibling',
  'Family friend',
  'Neighbor',
  'Other adult',
];

export const DOCTOR: Doctor = {
  name: 'Dr. Anika Sorensen',
  practice: 'Eastgate Pediatrics',
  phone: '(619) 555-0260',
  address: 'Suite 210, 4455 Mesa Ridge Pkwy, San Diego, CA 92121',
};

export const INSURANCE_SEED: Insurance = {
  carrier: 'Blue Shield of California',
  memberId: 'XGK447102885',
  group: 'F2219-004',
  lastConfirmed: '2025-08-14',
};

export const ALLERGIES: Allergy[] = [
  {
    id: 'alg-nuts',
    allergen: 'Tree nuts',
    kind: 'Food',
    severity: 'Severe',
    reaction: 'Hives, throat tightness',
    plan: 'Epinephrine 0.3 mg into outer thigh, then call 911',
  },
  {
    id: 'alg-amox',
    allergen: 'Amoxicillin',
    kind: 'Drug',
    severity: 'Mild',
    reaction: 'Rash',
  },
];

export const MEDICATIONS_SEED: Medication[] = [
  {
    id: 'med-cetirizine',
    name: 'Cetirizine',
    dose: '10',
    unit: null,
    schedule: 'Once daily, morning',
    purpose: 'Seasonal allergies',
  },
  {
    id: 'med-epi',
    name: 'Epinephrine auto-injector',
    dose: '0.3',
    unit: 'mg',
    schedule: 'As needed for severe allergic reaction',
    lot: '7H2041',
    expires: '2026-09',
    purpose: 'Anaphylaxis (tree nuts)',
  },
];

export const IMMUNIZATIONS_SEED: Immunization[] = [
  { id: 'imm-01', vaccine: 'Hepatitis B', dose: 'Dose 1', date: '2015-03-09', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-02', vaccine: 'Hepatitis B', dose: 'Dose 2', date: '2015-04-13', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-03', vaccine: 'Hepatitis B', dose: 'Dose 3', date: '2015-09-08', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-04', vaccine: 'DTaP', dose: 'Dose 1', date: '2015-05-11', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-05', vaccine: 'DTaP', dose: 'Dose 2', date: '2015-07-14', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-06', vaccine: 'DTaP', dose: 'Dose 3', date: '2015-11-10', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-07', vaccine: 'Polio (IPV)', dose: 'Dose 1', date: '2015-05-11', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-08', vaccine: 'Polio (IPV)', dose: 'Dose 2', date: '2015-07-14', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-09', vaccine: 'Polio (IPV)', dose: 'Dose 3', date: '2015-11-10', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-10', vaccine: 'DTaP', dose: 'Dose 4', date: '2016-11-02', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-11', vaccine: 'MMR', dose: 'Dose 1', date: '2016-03-21', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-12', vaccine: 'Varicella', dose: 'Dose 1', date: '2016-03-21', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-13', vaccine: 'MMR', dose: 'Dose 2', date: '2019-06-11', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-14', vaccine: 'Varicella', dose: 'Dose 2', date: '2019-06-11', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-15', vaccine: 'DTaP', dose: 'Dose 5', date: '2019-06-11', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-16', vaccine: 'Tdap', dose: 'Adolescent booster', date: '2025-11-20', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-17', vaccine: 'HPV', dose: 'Dose 1', date: '2025-05-07', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-18', vaccine: 'HPV', dose: 'Dose 2', date: '2025-11-07', givenBy: 'Eastgate Pediatrics' },
  { id: 'imm-19', vaccine: 'Influenza', dose: '2026–27 season', date: '2026-10-08', givenBy: 'Eastgate Pediatrics' },
];

/** Tdap is accepted by camp only when given on or after the 11th birthday. */
export const TDAP_MIN_AGE_YEARS = 11;

/** What the after-visit summary photo says. Highlighted values can be tapped to use them. */
export const AVS = {
  visitDate: '2026-04-02',
  visitLabel: '04/02/2026',
  tdapDate: '2026-04-02',
  cetirizineText: '10 mg',
  physicianDate: '2026-04-02',
};

export const FORM_TITLE = 'Camp health form (Health history and physician)';
