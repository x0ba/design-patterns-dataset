export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type Booking = 'book' | 'message' | 'refuse';
export type PriceType = 'fixed' | 'quote' | 'none';
export type Voice = 'warm' | 'steady' | 'bright';

export interface Service {
  id: string;
  name: string;
  priceType: PriceType;
  regular: number | null;
  afterHours: number | null;
  /** When true, the after-hours price is quoted outside regular hours and on Sundays. */
  useAfterHours: boolean;
  unit: string | null;
  booking: Booking;
}

export interface DayHours {
  /** "HH:MM" 24h, or null for no regular hours that day. */
  open: string | null;
  close: string | null;
}

export interface City {
  name: string;
  on: boolean;
}

export interface Profile {
  businessName: string;
  owner: string;
  license: string;
  baseZip: string;
  businessPhone: string;
  alertNumber: string;
}

export interface Settings {
  profile: Profile;
  hours: Record<Weekday, DayHours>;
  bookingWindowHours: number;
  cities: City[];
  services: Service[];
  greeting: string;
  disclosureOn: boolean;
  disclosureLine: string;
  /** 0 = very formal … 4 = casual */
  formality: number;
  voice: Voice;
  spanishOn: boolean;
  alertIntent: boolean;
  alertPhrases: string[];
  rules: string[];
}

export type CheckSpec =
  | { kind: 'price'; label: string; serviceId: string; qty: number; at: string; said: string }
  | { kind: 'area'; label: string; city: string; expectServed: boolean; said: string }
  | { kind: 'booking'; label: string; serviceId: string; expect: Booking; said: string }
  | { kind: 'disclosure'; label: string; said: string }
  | { kind: 'escalation'; label: string; utterance: string; said: string }
  | { kind: 'manual'; label: string; said: string; why: string };

export type FlagCategory = 'Price' | 'Service area' | 'Booking' | 'Who it is' | 'Missed text' | 'Other';

export interface Flag {
  category: FlagCategory;
  note: string;
  checks: CheckSpec[];
}

export interface Line {
  who: 'caller' | 'assistant';
  text: string;
  /** Assistant line Rafa flagged as wrong. */
  wrong?: boolean;
}

export type Outcome = 'booked' | 'message' | 'declined' | 'texted';

export interface Call {
  id: string;
  /** ISO timestamp with Phoenix offset (MST, no DST). */
  startedAt: string;
  callerName: string;
  callerPhone: string;
  city: string;
  durationSec: number;
  outcome: Outcome;
  outcomeText: string;
  transcript: Line[];
  flag?: Flag;
}
