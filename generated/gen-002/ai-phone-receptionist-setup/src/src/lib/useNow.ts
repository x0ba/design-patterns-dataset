import { useEffect, useState } from 'react';
import { nowMs } from './time';

/** Re-renders every 30 seconds so "right now" text stays current. */
export function useNow(): number {
  const [now, setNow] = useState(nowMs);
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
