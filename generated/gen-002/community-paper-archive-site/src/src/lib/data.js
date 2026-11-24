// Loads the static JSON the build writes into data/. Each file is fetched at
// most once per session.

import { useEffect, useState } from 'react';

const cache = new Map();

function load(url) {
  if (!cache.has(url)) {
    const p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${url} (${r.status})`);
      return r.json();
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return cache.get(url);
}

export const getSite = () => load('data/site.json');
export const getArticleIndex = () => load('data/articles.json');
export const getIssue = (id) => load(`data/issues/${id}.json`);

// Runs an async loader and keeps its result in component state.
export function useLoad(loader, deps) {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let alive = true;
    setState({ data: null, error: null });
    loader()
      .then((data) => alive && setState({ data, error: null }))
      .catch((error) => alive && setState({ data: null, error }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
