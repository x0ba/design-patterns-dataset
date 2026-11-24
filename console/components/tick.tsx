'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect } from 'react';

/**
 * Refreshes the route on a timer. For state that changes with time rather than
 * with a file write the live feed reports, like "last write 4m ago" or a
 * session going quiet long enough to count as stalled.
 */
export function Tick({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) startTransition(() => router.refresh()); }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
