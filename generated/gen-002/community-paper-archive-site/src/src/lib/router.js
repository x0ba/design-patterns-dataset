// Hash-based routing. The site is a plain static folder, so every page lives
// at index.html#/something. No server rewrites are needed.
//
// The trail remembers the pages a reader has visited this session, so each
// page can offer a "Back to ..." link that returns to exactly where they were.

import { useMemo, useSyncExternalStore } from 'react';

const TRAIL_KEY = 'gazette-trail';

export function parseHash(hash) {
  const raw = (hash || '').replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const segs = pathPart.split('/').filter(Boolean).map((s) => decodeURIComponent(s));
  return { hash: raw, segs, query: new URLSearchParams(queryPart) };
}

export function currentHash() {
  return (window.location.hash || '#/').replace(/^#/, '') || '/';
}

export function navigate(to) {
  const target = to.startsWith('#') ? to : `#${to}`;
  if (window.location.hash === target) return;
  window.location.hash = target;
}

function readTrail() {
  try {
    return JSON.parse(sessionStorage.getItem(TRAIL_KEY)) || [];
  } catch {
    return [];
  }
}

function writeTrail(trail) {
  try {
    sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail.slice(-40)));
  } catch {
    /* storage unavailable: the trail simply won't persist */
  }
}

// Runs on every hash change, before React re-renders, so pages can label
// their own trail entry in an effect.
function recordVisit(hash) {
  const trail = readTrail();
  const last = trail[trail.length - 1];
  const prev = trail[trail.length - 2];
  if (last && last.hash === hash) return;
  if (prev && prev.hash === hash) {
    trail.pop(); // the reader pressed Back
  } else {
    trail.push({ hash, label: null });
  }
  writeTrail(trail);
}

window.addEventListener('hashchange', () => recordVisit(currentHash()));
recordVisit(currentHash());

export function labelVisit(hash, label) {
  if (!label) return;
  const trail = readTrail();
  for (let i = trail.length - 1; i >= 0; i--) {
    if (trail[i].hash === hash) {
      if (trail[i].label !== label) {
        trail[i].label = label;
        writeTrail(trail);
      }
      return;
    }
  }
}

// The most recent earlier page (other than this one) that has a label.
export function previousVisit(hash) {
  const trail = readTrail();
  let idx = -1;
  for (let i = trail.length - 1; i >= 0; i--) {
    if (trail[i].hash === hash) {
      idx = i;
      break;
    }
  }
  for (let i = idx - 1; i >= 0; i--) {
    if (trail[i].hash !== hash && trail[i].label) return trail[i];
  }
  return null;
}

const subscribe = (cb) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const getSnapshot = () => window.location.hash;

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, getSnapshot);
  return useMemo(() => parseHash(hash), [hash]);
}
