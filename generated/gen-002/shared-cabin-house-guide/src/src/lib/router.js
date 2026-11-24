import { useEffect, useState, useCallback } from 'react';

// Hash routes, so the app runs from any plain static server with no rewrites.
// Examples: #/closing/5   #/map?pin=S1   #/plans/ground?pin=G1   #/pins?q=shutoff   #/manuals/rheem   #/notes

function parse(hash) {
  const raw = hash.replace(/^#\/?/, '');
  const [pathPart, query = ''] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  return { segments, params: new URLSearchParams(query) };
}

export function useRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

// Navigate to a view. params is an object of query values; empty values are dropped.
export function go(path, params) {
  const qs = params
    ? new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      ).toString()
    : '';
  const target = `#/${path}${qs ? `?${qs}` : ''}`;
  if (window.location.hash === target) return;
  window.location.hash = target;
}

export function useGo() {
  return useCallback((path, params) => go(path, params), []);
}
