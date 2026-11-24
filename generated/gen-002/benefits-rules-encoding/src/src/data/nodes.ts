import type { Kind, RuleNode, SectionId } from '../engine/model';

// The rule model as saved in revision r27 (the working draft's starting point).
// Before the 2025 amendment is wired in, gross_test applies the 130% limit to every
// household, and net_test reads gross_test, so an elderly or disabled household that
// fails gross never reaches its net check.

function step(
  id: string,
  label: string,
  kind: Kind,
  section: SectionId,
  expr: string,
  cites: string[],
  tags: string[] = [],
): RuleNode {
  return { id, label, kind, section, expr, cites, tags };
}

export const INITIAL_NODES: RuleNode[] = [
  // Non-financial criteria
  step('unit_defined', 'Household unit is defined', 'condition', 'nonfin', 'hh_size >= 1', ['c-273-1']),
  step('resident', 'State residency met', 'condition', 'nonfin', 'state_resident', ['c-273-3']),
  step('citizen_qualified', 'Citizenship or qualified status', 'condition', 'nonfin', 'citizenship_ok', ['c-273-4']),
  step('ssn_provided', 'SSN provided for each member', 'condition', 'nonfin', 'ssn_ok', ['c-273-6']),
  step('work_req_met', 'Work requirement met', 'condition', 'nonfin', 'work_req_ok', ['c-273-7']),
  step('student_ok', 'Student rule not disqualifying', 'condition', 'nonfin', '!student_ineligible', ['c-273-5']),
  step(
    'nonfin_ok',
    'Non-financial criteria met',
    'condition',
    'nonfin',
    'unit_defined && resident && citizen_qualified && ssn_provided && work_req_met && student_ok',
    ['c-273-1'],
  ),

  // Resources
  step('vehicle_excess', 'Vehicle value above exclusion', 'calculation', 'resources', 'max(0, vehicle_value - vehicle_excl)', ['c-273-8']),
  step('countable_resources', 'Countable resources', 'calculation', 'resources', 'max(0, cash + vehicle_excess)', ['c-273-8']),
  step(
    'resource_limit',
    'Resource limit for this household',
    'calculation',
    'resources',
    'eld_dis_members > 0 ? res_limit_eld : res_limit_std',
    ['c-273-8', 'c-271-2'],
  ),
  step('resource_test', 'Resource test', 'condition', 'resources', 'countable_resources <= resource_limit', ['c-273-8']),

  // Gross and net income tests
  step('gross_income', 'Gross monthly income', 'calculation', 'income', 'earned + unearned', ['c-273-9-a']),
  step('gross_limit_row', 'Gross limit for household size', 'calculation', 'income', 'gross_limit', ['c-273-9-a']),
  step('gross_test', 'Gross income test', 'condition', 'income', 'gross_income <= gross_limit_row', ['c-273-9-a'], ['income-standard']),
  step('net_income', 'Net monthly income', 'calculation', 'income', 'max(0, pre_shelter - shelter_ded)', ['c-273-9-a']),
  step('net_limit_row', 'Net limit for household size', 'calculation', 'income', 'net_limit', ['c-273-9-a']),
  step(
    'net_test',
    'Net income test',
    'condition',
    'income',
    'gross_test && net_income <= net_limit_row',
    ['c-273-9-a'],
    ['income-standard'],
  ),
  step('income_test', 'Income tests passed', 'condition', 'income', 'gross_test && net_test', ['c-273-9-a'], ['income-standard']),

  // Deductions and shelter
  step('heat_included', 'Heating or cooling billed separately', 'condition', 'deductions', 'heat_expense', ['c-273-9-d']),
  step('shelter_total', 'Total shelter cost', 'calculation', 'deductions', 'rent + (heat_included ? sua : 0)', ['c-273-9-d']),
  step('earned_present', 'Earned income present', 'condition', 'deductions', 'earned > 0', ['c-273-9-d']),
  step('earned_ded', 'Earned income deduction (20%)', 'calculation', 'deductions', 'earned_present ? earned * 0.2 : 0', ['c-273-9-d']),
  step('std_ded', 'Standard deduction', 'calculation', 'deductions', 'std_deduction', ['c-273-9-d']),
  step('dep_care_qualifies', 'Dependent care needed for work or training', 'condition', 'deductions', 'dep_care_work && dep_care > 0', ['c-273-9-d']),
  step('dep_care_capped', 'Dependent care capped per person', 'calculation', 'deductions', 'min(dep_care, child_care_cap)', ['c-273-9-d']),
  step('dep_care_ded', 'Dependent care deduction', 'calculation', 'deductions', 'dep_care_qualifies ? dep_care_capped : 0', ['c-273-9-d']),
  step('medical_excess', 'Medical expense above threshold', 'calculation', 'deductions', 'max(0, medical - medical_threshold)', ['c-273-9-d']),
  step(
    'medical_ded',
    'Medical deduction (elderly or disabled only)',
    'calculation',
    'deductions',
    'eld_dis_members > 0 ? medical_excess : 0',
    ['c-273-9-d', 'c-271-2'],
  ),
  step('child_support_ded', 'Child support deduction', 'calculation', 'deductions', 'child_support', ['c-273-9-d']),
  step(
    'total_deductions',
    'Total deductions',
    'calculation',
    'deductions',
    'earned_ded + std_ded + dep_care_ded + medical_ded + child_support_ded',
    ['c-273-9-d'],
  ),
  step('pre_shelter', 'Income after deductions', 'calculation', 'deductions', 'max(0, gross_income - total_deductions)', ['c-273-9-a']),
  step('half_pre', 'Half of income after deductions', 'calculation', 'deductions', 'pre_shelter * 0.5', ['c-273-9-d']),
  step('shelter_excess', 'Shelter cost above half of income', 'calculation', 'deductions', 'max(0, shelter_total - half_pre)', ['c-273-9-d']),
  step('shelter_capped', 'Excess shelter after cap', 'calculation', 'deductions', 'min(shelter_excess, shelter_cap)', ['c-273-9-d']),
  step(
    'shelter_ded',
    'Excess shelter deduction',
    'calculation',
    'deductions',
    'eld_dis_members > 0 ? shelter_excess : shelter_capped',
    ['c-273-9-d', 'c-271-2'],
  ),

  // Eligibility and benefit amount
  step(
    'eligible',
    'Eligible for SNAP',
    'condition',
    'benefit',
    'nonfin_ok && resource_test && income_test && benefit_raw > 0',
    ['c-273-10'],
  ),
  step('max_allot_row', 'Maximum allotment for household size', 'calculation', 'benefit', 'max_allot', ['c-273-10-e']),
  step('ceil_30pct', '30% of net income, rounded up', 'calculation', 'benefit', 'ceil(0.3 * net_income)', ['c-273-10-e']),
  step('benefit_raw', 'Maximum allotment less 30% of net income', 'calculation', 'benefit', 'max_allot_row - ceil_30pct', ['c-273-10-e']),
  step('min_benefit_applies', 'Household of one or two persons', 'condition', 'benefit', 'hh_size <= 2', ['c-273-10-e']),
  step(
    'benefit_floor',
    'Minimum benefit applied where due',
    'calculation',
    'benefit',
    'min_benefit_applies && benefit_raw > 0 ? max(benefit_raw, min_benefit) : benefit_raw',
    ['c-273-10-e'],
  ),
  step('benefit_nonneg', 'Benefit not below zero', 'calculation', 'benefit', 'max(0, benefit_floor)', ['c-273-10-e']),
  step('benefit_final', 'Monthly benefit amount', 'calculation', 'benefit', 'eligible ? benefit_nonneg : 0', ['c-273-10-e']),

  // Verification and certification
  step('income_verified', 'Earned income verified', 'condition', 'verification', 'earned == 0 || pay_stubs_on_file', ['c-273-2-f']),
  step('unearned_verified', 'Unearned income verified', 'condition', 'verification', 'unearned == 0 || unearned_docs', ['c-273-2-f']),
  step(
    'verification_complete',
    'Verification complete',
    'condition',
    'verification',
    'income_verified && unearned_verified',
    ['c-273-2-f'],
  ),
  step('all_eld_dis', 'Every member elderly or disabled', 'condition', 'verification', 'eld_dis_members == hh_size', ['c-271-2']),
  step('cert_months', 'Certification period (months)', 'calculation', 'verification', 'eligible ? (all_eld_dis ? 24 : 12) : 0', ['c-273-10-f']),

  // Study flags (lab protocol)
  step('gross_margin', 'Room under gross limit', 'calculation', 'study', 'gross_limit_row - gross_income', ['lab-protocol-2-3']),
  step('net_margin', 'Room under net limit', 'calculation', 'study', 'net_limit_row - net_income', ['lab-protocol-2-3']),
  step(
    'borderline_flag',
    'Within $100 of a limit',
    'condition',
    'study',
    '(gross_margin >= 0 && gross_margin < 100) || (net_margin >= 0 && net_margin < 100)',
    ['lab-protocol-2-3'],
  ),

  // Outcomes
  step('outcome_eligible', 'Determination: eligible', 'outcome', 'outcomes', 'eligible', ['c-273-10']),
  step('outcome_benefit', 'Reported benefit amount', 'outcome', 'outcomes', 'eligible ? benefit_final : 0', ['c-273-10-e']),
  step(
    'reason_code',
    'Reason code',
    'outcome',
    'outcomes',
    'eligible ? "ELIGIBLE" : !nonfin_ok ? "NONFINANCIAL" : !resource_test ? "RESOURCE" : !gross_test ? "GROSS_INCOME" : !net_test ? "NET_INCOME" : "BENEFIT_ZERO"',
    ['c-273-10'],
  ),
  step(
    'notice_type',
    'Notice type',
    'outcome',
    'outcomes',
    '!verification_complete ? "PENDING_VERIFICATION" : eligible ? "APPROVAL" : reason_code',
    ['c-273-13'],
  ),
  step(
    'outcome_verification',
    'Verification status',
    'outcome',
    'outcomes',
    'verification_complete ? "COMPLETE" : unearned_verified ? "PENDING_EARNED" : "PENDING_UNEARNED"',
    ['c-273-2-f'],
  ),
  step('outcome_cert', 'Certification period outcome', 'outcome', 'outcomes', 'cert_months', ['c-273-10-f']),
  step('outcome_gross_pass', 'Gross test result', 'outcome', 'outcomes', 'gross_test', ['c-273-10']),
  step('outcome_net_pass', 'Net test result', 'outcome', 'outcomes', 'net_test', ['c-273-10']),
  step('outcome_resource_pass', 'Resource test result', 'outcome', 'outcomes', 'resource_test', ['c-273-8']),
  step('outcome_nonfin_pass', 'Non-financial test result', 'outcome', 'outcomes', 'nonfin_ok', ['c-273-1']),
  step('outcome_borderline', 'Borderline approval flag', 'outcome', 'outcomes', 'eligible && borderline_flag', ['lab-protocol-2-3']),
  step(
    'outcome_path',
    'Test path taken',
    'outcome',
    'outcomes',
    '!gross_test ? "GROSS_FAILED" : !net_test ? "NET_FAILED" : eligible ? "PASSED" : "BENEFIT_ZERO"',
    ['c-273-9-a'],
  ),
];
