import { useEffect, useState } from "react";

/**
 * The app runs against a fixed mock clock: it opens at 10:52 AM on Tuesday, Nov 17, 2026
 * and advances with real elapsed time so countdowns and timestamps keep moving.
 */
const LOADED_AT = Date.now();
const MOCK_START = new Date(2026, 10, 17, 10, 52, 0).getTime();

function currentMockTime(): Date {
  return new Date(MOCK_START + (Date.now() - LOADED_AT));
}

export function useMockNow(): Date {
  const [now, setNow] = useState<Date>(currentMockTime);
  useEffect(() => {
    const t = window.setInterval(() => setNow(currentMockTime()), 15000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}
