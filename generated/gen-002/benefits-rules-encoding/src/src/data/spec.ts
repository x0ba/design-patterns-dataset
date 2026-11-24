import type { Citation, FactDef, ModelSpec, ParamDef, SectionDef } from '../engine/model';

// Household facts: the inputs a case supplies. Read-only in the rule editor.
export const FACTS: FactDef[] = [
  { name: 'hh_size', label: 'Persons in the household unit', type: 'number', unit: 'persons' },
  { name: 'eld_dis_members', label: 'Members aged 60+ or disabled', type: 'number', unit: 'persons' },
  { name: 'earned', label: 'Earned income', type: 'number', unit: '$/mo' },
  { name: 'unearned', label: 'Unearned income', type: 'number', unit: '$/mo' },
  { name: 'rent', label: 'Rent or mortgage', type: 'number', unit: '$/mo' },
  { name: 'heat_expense', label: 'Heating or cooling billed separately', type: 'boolean' },
  { name: 'dep_care', label: 'Dependent care paid', type: 'number', unit: '$/mo' },
  { name: 'dep_care_work', label: 'Dependent care needed to work or train', type: 'boolean' },
  { name: 'medical', label: 'Out-of-pocket medical expense', type: 'number', unit: '$/mo' },
  { name: 'child_support', label: 'Child support paid', type: 'number', unit: '$/mo' },
  { name: 'cash', label: 'Cash and bank balances', type: 'number', unit: '$' },
  { name: 'vehicle_value', label: 'Vehicle value', type: 'number', unit: '$' },
  { name: 'state_resident', label: 'State resident', type: 'boolean' },
  { name: 'citizenship_ok', label: 'Citizenship or qualified status met', type: 'boolean' },
  { name: 'ssn_ok', label: 'SSN provided for each member', type: 'boolean' },
  { name: 'work_req_ok', label: 'Work requirement met', type: 'boolean' },
  { name: 'student_ineligible', label: 'Student rule disqualifies', type: 'boolean' },
  { name: 'pay_stubs_on_file', label: 'Pay stubs on file', type: 'boolean' },
  { name: 'unearned_docs', label: 'Unearned income documents on file', type: 'boolean' },
];

// Parameters. Demo values: the lab's parameter sheet is not loaded in this build.
// The table is keyed by household size 1-8; each person above 8 adds `addl`.
export const PARAMS: ParamDef[] = [
  {
    name: 'gross_limit',
    label: 'Gross income limit (130% of poverty guideline)',
    unit: '$/mo',
    table: { values: [1695, 2292, 2887, 3483, 4079, 4675, 5270, 5867], addl: 596 },
  },
  {
    name: 'net_limit',
    label: 'Net income limit (100% of poverty guideline)',
    unit: '$/mo',
    table: { values: [1304, 1763, 2221, 2679, 3138, 3596, 4054, 4513], addl: 458 },
  },
  {
    name: 'std_deduction',
    label: 'Standard deduction',
    unit: '$/mo',
    table: { values: [209, 209, 209, 223, 261, 299, 299, 299], addl: 0 },
  },
  {
    name: 'max_allot',
    label: 'Maximum monthly allotment',
    unit: '$/mo',
    table: { values: [298, 546, 785, 994, 1183, 1420, 1571, 1794], addl: 224 },
  },
  { name: 'res_limit_std', label: 'Resource limit, standard household', unit: '$', value: 3000 },
  { name: 'res_limit_eld', label: 'Resource limit, household with elderly or disabled member', unit: '$', value: 4500 },
  { name: 'vehicle_excl', label: 'Vehicle value excluded from resources', unit: '$', value: 4650 },
  { name: 'child_care_cap', label: 'Dependent care cap per person', unit: '$/mo', value: 200 },
  { name: 'medical_threshold', label: 'Medical expense threshold (elderly or disabled)', unit: '$/mo', value: 35 },
  { name: 'shelter_cap', label: 'Excess shelter deduction cap', unit: '$/mo', value: 744 },
  { name: 'sua', label: 'Standard utility allowance', unit: '$/mo', value: 540 },
  { name: 'min_benefit', label: 'Minimum benefit, one- and two-person households', unit: '$/mo', value: 24 },
];

export const SECTIONS: SectionDef[] = [
  { id: 'nonfin', label: 'Non-financial criteria', blurb: 'Unit, residency, citizenship, SSN, work and student rules.' },
  { id: 'resources', label: 'Resources', blurb: 'Countable cash and vehicles against the resource limit.' },
  {
    id: 'income',
    label: 'Gross and net income tests',
    blurb: 'Gross and net standards. The 2025 amendment changes how the gross test applies to elderly or disabled households.',
  },
  { id: 'deductions', label: 'Deductions and shelter', blurb: 'Earned, standard, dependent care, medical, shelter and child support deductions.' },
  { id: 'benefit', label: 'Eligibility and benefit amount', blurb: 'Eligibility gate and the allotment formula.' },
  { id: 'verification', label: 'Verification and certification', blurb: 'Income verification status and certification period.' },
  { id: 'study', label: 'Study flags', blurb: 'Lab-protocol flags for the divergence study. Not statutory tests.' },
  { id: 'outcomes', label: 'Outcomes', blurb: 'Values the model reports for each household.' },
];

export const CITATIONS: Citation[] = [
  {
    id: 'c-273-1',
    cite: '7 CFR 273.1',
    title: 'Household concept',
    status: 'in-force',
    summary: 'Defines the household unit whose income, resources and members are tested together.',
  },
  {
    id: 'c-273-2-f',
    cite: '7 CFR 273.2(f)',
    title: 'Verification',
    status: 'in-force',
    summary: 'Income and other eligibility factors must be verified before certification.',
  },
  {
    id: 'c-273-3',
    cite: '7 CFR 273.3',
    title: 'Residency',
    status: 'in-force',
    summary: 'Applicant must reside in the state that administers the program.',
  },
  {
    id: 'c-273-4',
    cite: '7 CFR 273.4',
    title: 'Citizenship and alien status',
    status: 'in-force',
    summary: 'Citizenship or qualified immigration status for each member.',
  },
  {
    id: 'c-273-5',
    cite: '7 CFR 273.5',
    title: 'Students',
    status: 'in-force',
    summary: 'Enrolled students aged 18 to 49 are disqualified unless an exemption applies.',
  },
  {
    id: 'c-273-6',
    cite: '7 CFR 273.6',
    title: 'Social security numbers',
    status: 'in-force',
    summary: 'Each member must provide an SSN or apply for one.',
  },
  {
    id: 'c-273-7',
    cite: '7 CFR 273.7',
    title: 'Work requirements',
    status: 'in-force',
    summary: 'Work registration and time-limit rules for able-bodied adults without dependents.',
  },
  {
    id: 'c-273-8',
    cite: '7 CFR 273.8',
    title: 'Resource eligibility standards',
    status: 'in-force',
    summary: 'Countable resources are tested against the resource limit. Vehicles are partly excluded.',
  },
  {
    id: 'c-273-9-a',
    cite: '7 CFR 273.9(a)',
    title: 'Income eligibility standards',
    status: 'in-force',
    summary:
      'Gross test at 130% and net test at 100% of the poverty guideline. Check the current text for any exemption from the gross test for elderly or disabled households.',
  },
  {
    id: 'c-273-9-d',
    cite: '7 CFR 273.9(d)',
    title: 'Deductions from income',
    status: 'in-force',
    summary: 'Earned, standard, dependent care, medical, child support and excess shelter deductions.',
  },
  {
    id: 'c-273-10',
    cite: '7 CFR 273.10',
    title: 'Determining eligibility and benefit levels',
    status: 'in-force',
    summary: 'Eligibility is determined from non-financial criteria, resources and income tests.',
  },
  {
    id: 'c-273-10-e',
    cite: '7 CFR 273.10(e)',
    title: 'Computing the benefit',
    status: 'in-force',
    summary: 'Maximum allotment less 30% of net income, rounded up. A minimum applies to one- and two-person households.',
  },
  {
    id: 'c-273-10-f',
    cite: '7 CFR 273.10(f)',
    title: 'Certification periods',
    status: 'in-force',
    summary: 'Certification period length, including longer periods for all-elderly or all-disabled households.',
  },
  {
    id: 'c-273-13',
    cite: '7 CFR 273.13',
    title: 'Notice of adverse action',
    status: 'in-force',
    summary: 'Denials must state the reason for the action.',
  },
  {
    id: 'c-271-2',
    cite: '7 CFR 271.2',
    title: 'Definitions: elderly or disabled member',
    status: 'in-force',
    summary: 'Elderly means age 60 or older. Disabled covers members receiving disability-based benefits listed in the definition.',
  },
  {
    id: 'sr-461-160-0015-2025',
    cite: '461-160-0015 (amended 2025)',
    title: 'Gross income test for households with an elderly or disabled member',
    status: 'amended-2025',
    summary:
      'Demo paraphrase, not verbatim text. For a household with an elderly or disabled member, the gross income test does not apply. Eligibility is then decided on the net income test.',
  },
  {
    id: 'lab-protocol-2-3',
    cite: 'Lab protocol §2.3',
    title: 'Borderline-case flag',
    status: 'internal',
    summary: 'Internal study definition. Not a statutory test.',
  },
];

export const SPEC: ModelSpec = { facts: FACTS, params: PARAMS, citations: CITATIONS };

export const AMENDED_CITE = 'sr-461-160-0015-2025';
