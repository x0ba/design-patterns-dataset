export type Meal = 'B' | 'L' | 'D';
export type Designation = 'women' | 'men' | 'mixed';
export type Lodging = 'women' | 'men';
export type Booking = 'confirmed' | 'tentative' | 'released';
export type Waiver = 'complete' | 'incomplete';
export type Role = 'Instructor' | 'Student' | 'Resident researcher' | 'Graduate researcher';

export interface Restriction {
  from: string;
  to: string;
  label: string;
  detail: string;
}

export interface Cabin {
  id: string;
  name: string;
  designation: Designation;
  bathroom: string;
  restrictions: Restriction[];
}

export interface Bunk {
  id: string;
  cabinId: string;
  number: number;
  /** Part of the BIO 377 block hold (held for the course, named or not). */
  held: boolean;
}

export interface Person {
  id: string;
  name: string;
  role: Role;
  lodging: Lodging;
  isResident: boolean;
  booking: Booking;
  waiver: Waiver;
  diet: string | null;
  bunkId: string | null;
  trip: 1 | 2 | null;
  from: string;
  to: string;
}

export interface LogEntry {
  id: number;
  time: string;
  text: string;
}

export interface AppState {
  /** Station clock in minutes after midnight on Tue 17 Nov. */
  clock: number;
  people: Person[];
  bunks: Bunk[];
  /** Kitchen sheet as it currently stands. */
  kitchen: { B: number; L: number; D: number };
  lunchPackedForBoat: boolean;
  manifestSentKey: string | null;
  log: LogEntry[];
  nextLogId: number;
}
