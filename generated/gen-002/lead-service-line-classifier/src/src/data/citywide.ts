import type { Cls } from '../types';

/** Citywide inventory as of the last sync (Nov 14, 2026). */
export const CITYWIDE: { cls: Cls; count: number }[] = [
  { cls: 'NON_LEAD', count: 11906 },
  { cls: 'LEAD', count: 412 },
  { cls: 'GRR', count: 2974 },
  { cls: 'UNKNOWN', count: 3120 },
];

export const CITYWIDE_TOTAL = CITYWIDE.reduce((s, r) => s + r.count, 0);

export interface ActivityEntry {
  at: string;
  who: string;
  text: string;
}

/** Recent events, newest first. Local decisions made in this browser are added on top at runtime. */
export const ACTIVITY: ActivityEntry[] = [
  {
    at: '2026-11-14T17:42:00-08:00',
    who: 'Tapcard Assist',
    text: 'Run 3 paused at 410 of 600 Northgate proposals. 190 addresses are queued in blocks 0417 to 0424.',
  },
  {
    at: '2026-11-14T17:40:00-08:00',
    who: 'Tapcard Assist',
    text: '12 proposals flagged: each contradicts a 2024 field verification on the same line.',
  },
  {
    at: '2026-11-14T06:00:00-08:00',
    who: 'Citywide sync',
    text: 'Inventory synced: 18,412 service lines. 3,120 are unknown, including the 600 in Northgate.',
  },
  {
    at: '2026-11-12T11:10:00-08:00',
    who: 'L. Ferreira',
    text: 'Checked 6 tap-card transcriptions on block 0403 against the scanned cards. Two were corrected to "iron, material unclear".',
  },
  {
    at: '2026-11-11T16:55:00-08:00',
    who: 'L. Ferreira',
    text: 'Accepted 58 high-confidence, direct-record proposals across blocks 0401 to 0407 (Nov 9 to 11). Galvanized and flagged lines were left open.',
  },
  {
    at: '2026-10-02T09:00:00-07:00',
    who: 'L. Ferreira',
    text: 'Correction C3 applied: field verification outranks tap cards and permits for the same line.',
  },
];
