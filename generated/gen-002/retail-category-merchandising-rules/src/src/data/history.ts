import type { HistoryEntry } from '../domain/types';

// The 14 prior edits to the Snow Blowers rules, newest first.
// The most recent entry is the last publish, by Kevin Osterberg on Oct 30.
export const HISTORY: HistoryEntry[] = [
  {
    id: 'h14',
    date: '2026-10-30',
    editor: 'Kevin Osterberg',
    area: 'Brand boost',
    summary: 'Extended the Ironridge and Redfield Outdoor boosts to end Nov 1 (previously Oct 31).',
  },
  {
    id: 'h13',
    date: '2026-10-26',
    editor: 'Dana Whitfield',
    area: 'Out-of-stock',
    summary: 'Reworded the out-of-stock label on product tiles to “Out of stock at your store”.',
  },
  {
    id: 'h12',
    date: '2026-10-21',
    editor: 'Kevin Osterberg',
    area: 'Shopper filters',
    summary: 'Moved “Start type” above “Brand” in the filter panel.',
  },
  {
    id: 'h11',
    date: '2026-10-15',
    editor: 'Kevin Osterberg',
    area: 'Brand boost',
    summary: 'Added brand boosts for Ironridge and Redfield Outdoor, Oct 15–Oct 31.',
  },
  {
    id: 'h10',
    date: '2026-10-08',
    editor: 'Marcus Hale',
    area: 'Default sort',
    summary: 'Tested “Top rated” as the default sort. Reverted to “Best selling” the same day.',
  },
  {
    id: 'h9',
    date: '2026-09-29',
    editor: 'Priya Raman',
    area: 'Shopper filters',
    summary: 'Removed “Headlights” from shopper filters after low click-through.',
  },
  {
    id: 'h8',
    date: '2026-09-22',
    editor: 'Dana Whitfield',
    area: 'Shopper filters',
    summary: 'Changed the price filter to $50 bands.',
  },
  {
    id: 'h7',
    date: '2026-09-15',
    editor: 'Kevin Osterberg',
    area: 'Out-of-stock',
    summary: 'Switched out-of-stock items from “Hide from results” to “Show with out-of-stock notice”.',
  },
  {
    id: 'h6',
    date: '2026-09-08',
    editor: 'Marcus Hale',
    area: 'Shopper filters',
    summary: 'Added “Chute control” to shopper filters.',
  },
  {
    id: 'h5',
    date: '2026-08-27',
    editor: 'Dana Whitfield',
    area: 'Default sort',
    summary: 'Set default sort to “Best selling” (was “Price: low to high”).',
  },
  {
    id: 'h4',
    date: '2026-08-19',
    editor: 'Priya Raman',
    area: 'Shopper filters',
    summary: 'Added “Headlights” to shopper filters for two- and three-stage models.',
  },
  {
    id: 'h3',
    date: '2026-08-11',
    editor: 'Kevin Osterberg',
    area: 'Shopper filters',
    summary: 'Added “Drive type” to shopper filters.',
  },
  {
    id: 'h2',
    date: '2026-08-04',
    editor: 'Marcus Hale',
    area: 'Shopper filters',
    summary: 'Added “Customer rating” to shopper filters.',
  },
  {
    id: 'h1',
    date: '2026-07-28',
    editor: 'Marcus Hale',
    area: 'Setup',
    summary: 'Created Snow Blowers rules from the Lawn Mowers template.',
  },
];

export const LAST_PUBLISHED = { date: '2026-10-30', by: 'Kevin Osterberg' };
export const CATEGORY_STATS = { activeProducts: 412, brands: 7, priorEdits: 14 };
export const CURRENT_USER = {
  name: 'Kevin Osterberg',
  title: 'Senior Online Merchandiser',
  initials: 'KO',
};
