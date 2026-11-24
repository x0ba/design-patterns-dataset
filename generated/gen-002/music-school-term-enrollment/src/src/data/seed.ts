import type { AppState, Family, Program, Slot, Txn } from '../types';

const at = (h: number, m: number) => new Date(2026, 10, 16, h, m, 0).getTime();

export const PROGRAMS: Program[] = [
  {
    id: 'pno-30',
    instrument: 'Piano',
    teacher: 'Mr. Abara',
    format: 'private',
    formatLabel: '30-min private',
    listCents: 34000,
    seats: 1,
  },
  {
    id: 'vln-45',
    instrument: 'Violin',
    teacher: 'Ms. Chen',
    format: 'private',
    formatLabel: '45-min private',
    listCents: 48000,
    seats: 1,
  },
  {
    id: 'gtr-grp',
    instrument: 'Beginner guitar',
    teacher: 'Ms. Brooks',
    format: 'group',
    formatLabel: 'Group · max 6',
    listCents: 21000,
    seats: 6,
  },
];

/**
 * Winter 2027 slots as they stand at the start of the call, before the
 * Pereira holds. Mr. Abara has six open piano slots; Ms. Chen has two open
 * Tuesday violin slots; Saturday 10:00 guitar has two of six seats left.
 */
export const SLOTS: Slot[] = [
  { id: 'pno30-mon-1600', programId: 'pno-30', label: 'Mon 4:00 PM', baseBooked: 0 },
  { id: 'pno30-wed-1530', programId: 'pno-30', label: 'Wed 3:30 PM', baseBooked: 0 },
  { id: 'pno30-wed-1615', programId: 'pno-30', label: 'Wed 4:15 PM', baseBooked: 0 },
  { id: 'pno30-thu-1600', programId: 'pno-30', label: 'Thu 4:00 PM', baseBooked: 0 },
  { id: 'pno30-thu-1700', programId: 'pno-30', label: 'Thu 5:00 PM', baseBooked: 0 },
  { id: 'pno30-fri-1530', programId: 'pno-30', label: 'Fri 3:30 PM', baseBooked: 0 },
  { id: 'vln45-tue-1615', programId: 'vln-45', label: 'Tue 4:15 PM', baseBooked: 0 },
  { id: 'vln45-tue-1745', programId: 'vln-45', label: 'Tue 5:45 PM', baseBooked: 0 },
  { id: 'vln45-wed-1600', programId: 'vln-45', label: 'Wed 4:00 PM', baseBooked: 1 },
  { id: 'vln45-thu-1700', programId: 'vln-45', label: 'Thu 5:00 PM', baseBooked: 1 },
  { id: 'gtr-sat-1000', programId: 'gtr-grp', label: 'Sat 10:00 AM', baseBooked: 4 },
  { id: 'gtr-sat-1130', programId: 'gtr-grp', label: 'Sat 11:30 AM', baseBooked: 6 },
];

export const FAMILIES: Family[] = [
  {
    id: 'fam-pereira',
    name: 'Pereira',
    parents: 'Ana and Rui Pereira',
    phone: '(858) 555-0147',
    email: 'ana.pereira@example.com',
    cardBrand: 'Visa',
    cardLast4: '4471',
    cardExp: '09/29',
    pastTerms: ['Fall 2025', 'Spring 2026'],
  },
  {
    id: 'fam-whitaker',
    name: 'Whitaker',
    parents: 'Denise Whitaker',
    phone: '(858) 555-0119',
    email: 'd.whitaker@example.com',
    cardBrand: 'Visa',
    cardLast4: '8830',
    cardExp: '02/28',
    pastTerms: ['Fall 2025', 'Spring 2026', 'Summer 2026'],
  },
  {
    id: 'fam-lindgren',
    name: 'Lindgren',
    parents: 'Peter and Mari Lindgren',
    phone: '(619) 555-0163',
    email: 'lindgrens@example.com',
    cardBrand: 'Mastercard',
    cardLast4: '6604',
    cardExp: '11/27',
    pastTerms: ['Spring 2026'],
  },
  {
    id: 'fam-castillo',
    name: 'Castillo',
    parents: 'Marcos Castillo',
    phone: '(858) 555-0190',
    email: 'mcastillo@example.com',
    cardBrand: 'Visa',
    cardLast4: '2287',
    cardExp: '05/28',
    pastTerms: ['Fall 2025', 'Spring 2026', 'Summer 2026'],
  },
  {
    id: 'fam-moreau',
    name: 'Moreau',
    parents: 'Claire and Julien Moreau',
    phone: '(760) 555-0106',
    email: 'moreau.family@example.com',
    cardBrand: 'Amex',
    cardLast4: '1008',
    cardExp: '03/29',
    pastTerms: ['Fall 2025'],
  },
  {
    id: 'fam-ferreira',
    name: 'Ferreira',
    parents: 'Helena Ferreira',
    phone: '(858) 555-0175',
    email: 'helena.f@example.com',
    cardBrand: 'Visa',
    cardLast4: '5519',
    cardExp: '08/28',
    pastTerms: ['Spring 2026', 'Summer 2026'],
  },
  {
    id: 'fam-adeyemi',
    name: 'Adeyemi',
    parents: 'Funmi and Tayo Adeyemi',
    phone: '(619) 555-0128',
    email: 'adeyemi.lessons@example.com',
    cardBrand: 'Visa',
    cardLast4: '7742',
    cardExp: '12/27',
    pastTerms: ['Fall 2025', 'Spring 2026'],
  },
];

/**
 * Earlier today: 14 enrollments and 2 withdrawals. Enrollment payments total
 * $6,920.00 collected; refunds total $442.00.
 */
const EARLIER_TODAY: Txn[] = [
  { id: 't-01', at: at(8, 5), familyName: 'Okafor', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · installment 1 of 3', method: 'Visa ••2210', amountCents: 52000 },
  { id: 't-02', at: at(8, 31), familyName: 'Lindqvist', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · installment 1 of 3', method: 'Mastercard ••6604', amountCents: 54800 },
  { id: 't-03', at: at(9, 2), familyName: 'Tran', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · paid in full', method: 'Visa ••0381', amountCents: 48600 },
  { id: 't-04', at: at(9, 18), familyName: 'Haddad', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · installment 1 of 3', method: 'Visa ••5073', amountCents: 43750 },
  { id: 't-05', at: at(9, 22), familyName: 'Halvorsen', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · installment 1 of 3', method: 'Visa ••7713', amountCents: 65500 },
  { id: 't-06', at: at(9, 40), familyName: 'Halvorsen', kind: 'refund', type: 'withdrawal', description: 'Winter 2027 withdrawal · within 7-day window · full refund of tuition paid', method: 'Visa ••7713', amountCents: 14200 },
  { id: 't-07', at: at(10, 10), familyName: 'Brennan', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · installment 1 of 3', method: 'Amex ••3391', amountCents: 39200 },
  { id: 't-08', at: at(10, 44), familyName: 'Oyelaran', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · paid in full', method: 'Visa ••1856', amountCents: 50450 },
  { id: 't-09', at: at(11, 3), familyName: 'Kowalski', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · installment 1 of 3', method: 'Visa ••4402', amountCents: 57100 },
  { id: 't-10', at: at(11, 30), familyName: 'Mendez', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · installment 1 of 3', method: 'Mastercard ••9028', amountCents: 44600 },
  { id: 't-11', at: at(12, 15), familyName: 'Whitfield', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · installment 1 of 3', method: 'Visa ••6315', amountCents: 42000 },
  { id: 't-12', at: at(12, 48), familyName: 'Nakamura', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · paid in full', method: 'Visa ••2974', amountCents: 61000 },
  { id: 't-13', at: at(13, 15), familyName: 'Osei', kind: 'refund', type: 'withdrawal', description: 'Winter 2027 withdrawal · after 7-day window · 10 of 10 weeks remain, less $40 fee', method: 'Visa ••0932', amountCents: 30000 },
  { id: 't-14', at: at(13, 20), familyName: 'Delacroix', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · installment 1 of 3', method: 'Visa ••8148', amountCents: 46800 },
  { id: 't-15', at: at(13, 50), familyName: 'Bianchi', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · installment 1 of 3', method: 'Amex ••5520', amountCents: 40000 },
  { id: 't-16', at: at(14, 5), familyName: 'Sato', kind: 'payment', type: 'enrollment', description: 'Winter 2027 enrollment · paid in full', method: 'Visa ••7036', amountCents: 46200 },
];

export function initialState(): AppState {
  return {
    families: FAMILIES,
    programs: PROGRAMS,
    slots: SLOTS,
    enrollments: [],
    txns: EARLIER_TODAY,
    draft: {
      familyId: 'fam-pereira',
      plan: 'inst3',
      lines: [
        { id: 'line-1', childName: 'Sofia Pereira', age: 9, programId: 'pno-30', slotId: 'pno30-wed-1530' },
        { id: 'line-2', childName: 'Mateo Pereira', age: 12, programId: 'vln-45', slotId: 'vln45-tue-1615' },
        { id: 'line-3', childName: 'Lucas Pereira', age: 7, programId: 'gtr-grp', slotId: 'gtr-sat-1000' },
      ],
    },
    view: 'enroll',
    selectedFamilyId: 'fam-pereira',
    receipt: null,
    seq: 1000,
  };
}
