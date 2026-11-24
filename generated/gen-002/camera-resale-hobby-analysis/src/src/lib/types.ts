export type Cat = 'slr' | 'pns' | 'mf' | 'lens' | 'acc';
export type Status = 'sold' | 'listed' | 'kept' | 'written-off';
export type Platform = 'eBay' | 'Etsy' | 'Photrio Forum';
export type Source = 'Estate sale' | 'Thrift store' | 'Flea market' | 'Online lot';

export interface Cut { date: string; price: number }

export interface Item {
  id: string;
  category: Cat;
  brand: string;
  model: string;
  source: Source;
  purchase: number;
  acquired: string;
  hours: number;
  parts: number;
  status: Status;
  note?: string;
  platform?: Platform;
  listed?: string;
  listPrice?: number;
  cuts?: Cut[];
  salePrice?: number;
  fee?: number;
  shipping?: number;
  sold?: string;
  offer?: boolean;
  feedback?: { stars: number; text: string };
}

/** An item plus everything derived from it, computed once. */
export interface Row extends Item {
  title: string;
  cost: number;           // purchase + parts
  revenue: number;        // sale price (sold only)
  feesShip: number;
  net: number;            // everything in, everything out. Unsold items count as their cost.
  perHour: number | null; // net / hours for this item
  acqDay: number;
  listDay: number | null;
  soldDay: number | null;
  daysListed: number | null; // sold: list→sale. Listed: list→today.
  cutPcts: number[];         // size of each cut as a % of the price before it
  lastPrice: number | null;  // current asking (listed) or final asking (sold)
}
