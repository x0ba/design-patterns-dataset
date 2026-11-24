import { useSyncExternalStore } from 'react';

export type Page = 'overview' | 'calls' | 'assistant' | 'services' | 'business';

export interface Route {
  page: Page;
  id: string | null;
}

const PAGES: Page[] = ['overview', 'calls', 'assistant', 'services', 'business'];

function parse(hash: string): Route {
  const [page = 'overview', id = null] = hash.replace(/^#\/?/, '').split('/');
  return {
    page: (PAGES as string[]).includes(page) ? (page as Page) : 'overview',
    id: id || null,
  };
}

function subscribe(fn: () => void) {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parse(hash);
}

export function go(path: string) {
  window.location.hash = path;
}
