export interface Correction {
  id: string;
  date: string;
  author: string;
  text: string;
  appliedFrom: string;
}

/** Corrections already applied to the assistant. */
export const CORRECTIONS: Correction[] = [
  {
    id: 'C1',
    date: '2026-08-04',
    author: 'L. Ferreira',
    text: 'Customer side is never inferred from neighboring lines. With no customer-side record the class is Unknown.',
    appliedFrom: 'Run 1',
  },
  {
    id: 'C2',
    date: '2026-09-15',
    author: 'L. Ferreira',
    text: 'A tap card that says "iron" with no "galvanized" or "cast" is Unknown, not galvanized.',
    appliedFrom: 'Run 2',
  },
  {
    id: 'C3',
    date: '2026-10-02',
    author: 'L. Ferreira',
    text: 'A field verification from any year outranks tap cards, permits, and neighbor inference for the same line. A conflict goes to field dig, not to the tap card.',
    appliedFrom: 'Run 2',
  },
];

/** Draft correction the reviewer is tightening. Not applied to the assistant yet. */
export const DRAFT_TITLE = 'D1 · Permit notes establish dates, not material';

export const DRAFT_DEFAULT = `A permit establishes the install or renewal date and the work type. It establishes material only when the permit text names the material (for example "copper" or "galvanized iron").

A permit that says "material not stated", or gives no material field, supports no material class.

Do not infer copper, plastic, galvanized, or lead from the permit year, from a standard-specification reference, or from the period when a city standard was in use.

Where the only record is a permit without a stated material, propose Unknown, with the permit cited as the source for the install date.`;
