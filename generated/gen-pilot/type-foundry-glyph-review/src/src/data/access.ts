import { t, type PersonId, type StyleId } from './core';

export type OutlineScope = 'all' | 'greek' | 'none';

export interface Access {
  person: PersonId;
  styles: StyleId[] | 'all';
  outlines: OutlineScope;
  spacing: boolean; // sidebearings & advance widths
  kerning: boolean;
  approve: boolean;
  comment: boolean;
  owner?: boolean;
}

export const INITIAL_ACCESS: Record<PersonId, Access> = {
  ines: { person: 'ines', styles: 'all', outlines: 'all', spacing: true, kerning: true, approve: true, comment: true, owner: true },
  tomas: { person: 'tomas', styles: 'all', outlines: 'all', spacing: true, kerning: true, approve: true, comment: true },
  eleni: { person: 'eleni', styles: 'all', outlines: 'greek', spacing: false, kerning: false, approve: false, comment: true },
  jonas: { person: 'jonas', styles: 'all', outlines: 'none', spacing: true, kerning: true, approve: false, comment: true },
  marieke: { person: 'marieke', styles: 'all', outlines: 'none', spacing: false, kerning: false, approve: false, comment: true },
};

export type Presence =
  | { kind: 'active'; style: StyleId; doing: string }
  | { kind: 'away'; lastSeen: number; where: string }
  | { kind: 'invited'; invitedAt: number };

export const INITIAL_PRESENCE: Record<PersonId, Presence> = {
  ines: { kind: 'active', style: 'regular', doing: 'Reviewing' },
  jonas: { kind: 'active', style: 'bold', doing: 'Kerning' },
  eleni: { kind: 'away', lastSeen: t('Thu', 3, 6), where: 'Greek · Regular & Bold' },
  tomas: { kind: 'away', lastSeen: t('Tue', 18, 31), where: 'Latin · Light' },
  marieke: { kind: 'invited', invitedAt: t('Mon', 14, 10) },
};

// What each person has actually changed since Tuesday 16:40 — used for the access audit.
export const AUDIT_SINCE_TUE: Record<PersonId, { outlines: number; spacing: number; kerning: number }> = {
  ines: { outlines: 0, spacing: 0, kerning: 0 },
  tomas: { outlines: 2, spacing: 0, kerning: 0 },
  eleni: { outlines: 31, spacing: 0, kerning: 0 },
  jonas: { outlines: 0, spacing: 0, kerning: 214 },
  marieke: { outlines: 0, spacing: 0, kerning: 0 },
};
