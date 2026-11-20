'use client';

import { usePathname, useRouter } from 'next/navigation';
import { startTransition, useEffect, useRef, useState } from 'react';
import type { Change } from '@/lib/live';

/** Does this file change affect what the page at `pathname` shows? */
function affects(c: Change, pathname: string) {
  // The header's codebook version compares dist/ with codebook/VERSION, which accepting a proposal bumps.
  if (c.scope !== 'dataset') return true;
  const [view, a, b] = pathname.split('/').slice(1).map(decodeURIComponent);
  if (!view || view === 'batch') return true;
  if (view === 'site') return c.batch === a && (!c.slug || c.slug === b);
  if (view === 'codebook') return c.file === 'consensus.json' || !c.file;
  return false;
}

const TEXT = { wait: 'Connecting…', on: 'Live', off: 'Offline' } as const;
const TITLE = {
  wait: 'Connecting to the console server…',
  on: 'Pages update as the pipeline writes files',
  off: 'Lost the console server. Restart it with pnpm console, then reload.',
} as const;

/**
 * Listens to /api/events and refreshes the current route when a change touches
 * it. Client state (filters, selection, scroll) survives a refresh.
 */
export function Live() {
  const router = useRouter();
  const pathname = usePathname();
  const path = useRef(pathname);
  path.current = pathname;
  const [state, setState] = useState<keyof typeof TEXT>('wait');

  useEffect(() => {
    const es = new EventSource('/api/events');
    let connectedBefore = false;
    let held = false;
    const refresh = () => {
      if (held) return;
      // Don't move boxes out from under the pointer in the viewer; refresh once it leaves.
      const hold = document.querySelector('[data-live-hold]:hover');
      if (hold) {
        held = true;
        hold.addEventListener('mouseleave', () => { held = false; refresh(); }, { once: true });
        return;
      }
      startTransition(() => router.refresh());
    };
    es.addEventListener('hello', () => {
      setState('on');
      // After a reconnect, anything could have changed while we were away.
      if (connectedBefore) refresh();
      connectedBefore = true;
    });
    es.addEventListener('change', (e) => {
      const { changes } = JSON.parse((e as MessageEvent).data) as { changes: Change[] };
      if (changes.some((c) => affects(c, path.current))) refresh();
    });
    es.onerror = () => setState(es.readyState === EventSource.CLOSED ? 'off' : 'wait');
    return () => es.close();
  }, [router]);

  return (
    <span className="live" data-state={state} title={TITLE[state]} role="status">
      <i aria-hidden="true" />
      {TEXT[state]}
    </span>
  );
}
