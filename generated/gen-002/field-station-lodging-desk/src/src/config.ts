export const STATION = 'Río Sierpe Biological Station';

export const USER = {
  name: 'Tomás Arguedas',
  title: 'Assistant station manager',
};

/** The scenario date. Everything in the app is computed relative to this. */
export const TODAY = '2026-11-17';
export const START_MINUTE = 9 * 60 + 15;

export const COURSE = {
  code: 'BIO 377',
  title: 'Tropical Field Ecology',
  instructor: 'Dr. Helen Brandt',
  from: '2026-11-18',
  /** Check-out morning. */
  to: '2026-12-02',
  releaseMinute: 17 * 60,
  releaseLabel: 'Tue 17 Nov, 17:00',
};

export const BOAT = {
  date: '2026-11-18',
  origin: 'Sierpe dock',
  captain: 'Capt. Rolando Mora',
  capacity: 14,
  times: { 1: '13:30', 2: '15:00' } as Record<1 | 2, string>,
};

export const MANAGER = {
  name: 'Dr. Elena Vargas',
  status: 'Station manager. At a conference, back Mon 23 Nov.',
};
