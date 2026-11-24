import type { Decision, PersonId, Role, SectionId } from './types';

// The signed-in user. Everything this browser does is recorded as this person.
export const ME: PersonId = 'kenji';
export const ME_DEVICE = 'Chrome · Mac';

export const LEASE_END = '2026-11-30';

export const SECTION_META: Record<SectionId, { title: string; short: string }> = {
  cleaning: { title: 'Cleaning Tasks', short: 'Cleaning' },
  furniture: { title: 'Shared Furniture', short: 'Furniture' },
  deposit: { title: 'Deposit Checklist', short: 'Deposit' },
  utilities: { title: 'Utilities & Forwarding', short: 'Utilities' },
  money: { title: 'Money Notes', short: 'Money Notes' },
};

export const SECTION_ORDER: SectionId[] = ['cleaning', 'furniture', 'deposit', 'utilities', 'money'];

export const DECISION_LABEL: Record<Decision, string> = {
  keep: 'Keep',
  sell: 'Sell',
  donate: 'Donate',
  undecided: 'Undecided',
};

export const DECISION_ORDER: Decision[] = ['keep', 'sell', 'donate', 'undecided'];

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  editor: 'Can edit',
  commenter: 'View & comment',
  viewer: 'View only',
};
