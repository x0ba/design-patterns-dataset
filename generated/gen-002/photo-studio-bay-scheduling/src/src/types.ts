export type BayId = 'bay1' | 'bay2' | 'bay3';

export interface Bay {
  id: BayId;
  name: string;
  surface: string; // 'Black wall' | 'White cyc'
  sqm: number;
  cyc: boolean; // true when the bay has a white cyc wall
}

export type UnitKind = 'softbox' | 'strobe' | 'paper';

export interface KitUnit {
  id: string;
  label: string; // short label used on the board, e.g. "SB-2"
  name: string;
  kind: UnitKind;
  // Softbox kits are stored in a bay between sessions; if a booking in another bay
  // needs one, it has to be carried over first.
  homeBay?: BayId;
}

export interface Booking {
  id: string;
  client: string;
  contact: string;
  project: string;
  bayId: BayId;
  start: number; // minutes after midnight
  end: number;
  crew: number;
  deposit: 'Paid' | 'Pending';
  needsCyc: boolean; // shoot requires a white cyc wall
  kit: string[]; // KitUnit ids reserved for this booking
  addons: string[]; // human-readable add-on lines
  movedFrom?: BayId; // set when staff move a booking to another bay
  offered?: boolean; // proposed to the client, not yet confirmed
}

export type BookingStatus = 'done' | 'in-session' | 'upcoming' | 'offered';
