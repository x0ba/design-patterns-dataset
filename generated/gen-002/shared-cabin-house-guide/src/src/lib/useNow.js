import { useEffect, useState } from 'react';
import { demoNow } from './clock.js';

// Re-renders every `ms` so the freeze countdown and "now" stay current.
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => demoNow());
  useEffect(() => {
    const id = setInterval(() => setNow(demoNow()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function isoToDate(iso) {
  const [date, time = '00:00'] = iso.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0);
}
