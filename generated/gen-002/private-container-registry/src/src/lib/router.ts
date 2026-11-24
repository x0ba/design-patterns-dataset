import { useEffect, useMemo, useState } from 'react';

/**
 * Hash-based routing: works from any plain static file server with no rewrites.
 *   #/advisory                 CVE exposure view (default)
 *   #/repos  |  #/repos/<name> repositories, or one repository's tags
 *   #/tags?q=...               all tags
 * Any route can carry ?tag=<repo:tag> to open the detail drawer.
 */
export interface Route {
  segments: string[];
  query: URLSearchParams;
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const [pathPart, qs = ''] = raw.split('?');
  const segments = pathPart
    .split('/')
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
  return {
    segments: segments.length > 0 ? segments : ['advisory'],
    query: new URLSearchParams(qs),
  };
}

export function useRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return useMemo(() => parseHash(hash), [hash]);
}

export function go(segments: string[], query: Record<string, string | undefined> = {}): void {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  const target = `#/${segments.map(encodeURIComponent).join('/')}${s ? `?${s}` : ''}`;
  if (window.location.hash !== target) window.location.hash = target;
}

/** Set or clear one query parameter while keeping the current route. */
export function setQueryParam(key: string, value?: string): void {
  const route = parseHash(window.location.hash);
  const q: Record<string, string | undefined> = {};
  route.query.forEach((v, k) => {
    q[k] = v;
  });
  q[key] = value;
  go(route.segments, q);
}
