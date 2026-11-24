import { useEffect, useState } from 'react';

export const INITIAL_ROUTE = '/b/crunchwell/paprika/p150/cz';

export function currentRoute(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h || INITIAL_ROUTE;
}
export function navigate(to: string) {
  if (currentRoute() === to) return;
  window.location.hash = to;
}
export function useRoute(): string {
  const [r, setR] = useState(currentRoute());
  useEffect(() => {
    if (!window.location.hash) history.replaceState(null, '', '#' + INITIAL_ROUTE);
    const on = () => setR(currentRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
export function splitRoute(route: string): { segs: string[]; query: URLSearchParams } {
  const [p, q] = route.split('?');
  return { segs: p.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q || '') };
}
