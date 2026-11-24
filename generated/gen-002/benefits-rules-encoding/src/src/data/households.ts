import type { Value } from '../engine/expr';

export interface TestCase {
  id: string;
  title: string;
  composition: string;
  hhSize: number;
  facts: Record<string, Value>;
  /** Legal advisor's expected outcome for this household. */
  expected: { eligible: boolean; benefit: number };
}

// Twelve test households. Expected outcomes come from the legal advisor's sheet (demo).
// T-04, T-07 and T-11 each include an elderly or disabled member and fail on the current draft.

const base = {
  eld_dis_members: 0,
  earned: 0,
  unearned: 0,
  rent: 0,
  heat_expense: false,
  dep_care: 0,
  dep_care_work: false,
  medical: 0,
  child_support: 0,
  cash: 0,
  vehicle_value: 0,
  state_resident: true,
  citizenship_ok: true,
  ssn_ok: true,
  work_req_ok: true,
  student_ineligible: false,
  pay_stubs_on_file: true,
  unearned_docs: true,
};

function hh(
  id: string,
  title: string,
  composition: string,
  hhSize: number,
  over: Partial<typeof base>,
  expected: { eligible: boolean; benefit: number },
): TestCase {
  return {
    id,
    title,
    composition,
    hhSize,
    facts: { ...base, hh_size: hhSize, ...over },
    expected,
  };
}

export const TEST_CASES: TestCase[] = [
  hh('T-01', 'Single adult, wages', '1 adult (34)', 1, { earned: 1100, rent: 700, cash: 800 }, { eligible: true, benefit: 206 }),
  hh(
    'T-02',
    'Family of three, wages, care needed for work',
    '2 adults (31, 33), 1 child (6)',
    3,
    { earned: 2400, rent: 1100, dep_care: 350, dep_care_work: true, cash: 1200, vehicle_value: 3900 },
    { eligible: true, benefit: 435 },
  ),
  hh(
    'T-03',
    'Family of four, unearned income over gross limit',
    '2 adults (45, 43), 2 children (12, 8)',
    4,
    { unearned: 3600, rent: 1250, cash: 400 },
    { eligible: false, benefit: 0 },
  ),
  hh(
    'T-04',
    'Elderly couple, Social Security, high medical costs',
    '2 adults (67, 70)',
    2,
    { eld_dis_members: 2, unearned: 2350, rent: 650, medical: 480, cash: 2100 },
    { eligible: true, benefit: 37 },
  ),
  hh(
    'T-05',
    'Single adult, wages, heating billed separately',
    '1 adult (29)',
    1,
    { earned: 1400, rent: 950, heat_expense: true, cash: 300 },
    { eligible: true, benefit: 247 },
  ),
  hh(
    'T-06',
    'Two adults, SSN not provided for one member',
    '2 adults (38, 36)',
    2,
    { earned: 900, rent: 600, ssn_ok: false, cash: 250 },
    { eligible: false, benefit: 0 },
  ),
  hh(
    'T-07',
    'Single adult with disability, SSDI',
    '1 adult (58), disability benefits',
    1,
    { eld_dis_members: 1, unearned: 1780, rent: 1000, medical: 339, cash: 900 },
    { eligible: true, benefit: 27 },
  ),
  hh(
    'T-08',
    'Three adults, pension over net limit',
    '3 adults (41, 39, 19)',
    3,
    { unearned: 2870, rent: 480, cash: 1500 },
    { eligible: false, benefit: 0 },
  ),
  hh('T-09', 'Two adults, earned income over gross limit', '2 adults (29, 27)', 2, { earned: 2450, rent: 900, cash: 600 }, { eligible: false, benefit: 0 }),
  hh('T-10', 'Two adults, cash over resource limit', '2 adults (50, 47)', 2, { earned: 1200, rent: 800, cash: 3600 }, { eligible: false, benefit: 0 }),
  hh(
    'T-11',
    'Single adult aged 61 with disability, wages over gross limit',
    '1 adult (61), disability',
    1,
    { eld_dis_members: 1, earned: 1800, rent: 1000, cash: 1200 },
    { eligible: true, benefit: 44 },
  ),
  hh(
    'T-12',
    'Two adults, heating billed, vehicle under exclusion',
    '2 adults (32, 30)',
    2,
    { earned: 1350, rent: 880, heat_expense: true, cash: 500, vehicle_value: 3800 },
    { eligible: true, benefit: 507 },
  ),
];
