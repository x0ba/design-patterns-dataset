import { useEffect, useState } from 'react';

export interface Route { path: string[]; query: URLSearchParams; raw: string }
function read(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [p, q] = h.split('?');
  return { path: p.split('/').filter(Boolean), query: new URLSearchParams(q || ''), raw: h };
}
export function useRoute(): Route {
  const [r, setR] = useState<Route>(read);
  useEffect(() => {
    const on = () => setR(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
export const go = (to: string) => { window.location.hash = to.startsWith('#') ? to : '#/' + to.replace(/^\//, ''); };
export const href = (to: string) => '#/' + to.replace(/^\//, '');
