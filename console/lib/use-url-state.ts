'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

/**
 * A string kept in local state and mirrored to one query parameter, so a
 * filtered view can be reloaded and shared. The URL is replaced, not pushed:
 * typing in a filter shouldn't fill the back button. Empty removes the param.
 * A link that changes the param (say, a summary tile linking to a filtered
 * table) updates the state too.
 */
export function useUrlState(key: string, initial: string): [string, (v: string) => void] {
  const params = useSearchParams();
  const fromUrl = params.get(key) ?? '';
  const [value, setValue] = useState(initial);
  useEffect(() => { setValue(fromUrl); }, [fromUrl]);
  const set = useCallback((v: string) => {
    setValue(v);
    const url = new URL(window.location.href);
    if (v) url.searchParams.set(key, v); else url.searchParams.delete(key);
    window.history.replaceState(window.history.state, '', url);
  }, [key]);
  return [value, set];
}
