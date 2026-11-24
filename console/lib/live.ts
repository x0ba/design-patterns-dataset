// Watches the directories the console reads and fans changes out to every open
// page. Changes are coalesced for a short window, so a rater rewriting
// status.json several times in a row becomes one event. Pages decide whether a
// change touches what they show (see components/live.tsx).

import fs from 'node:fs';
import path from 'node:path';
import { P } from '../../src/paths.ts';

export type Change =
  | { scope: 'dataset' | 'generated'; batch: string; slug?: string; file: string }
  | { scope: 'proposals' | 'codebook'; file: string };

type Listener = (changes: Change[]) => void;

interface Hub { listeners: Set<Listener>; queued: Change[]; timer?: NodeJS.Timeout }

// Kept on globalThis so dev-mode module reloads reuse one set of watchers.
const g = globalThis as typeof globalThis & { __consoleLive?: Hub };

// Temp files from atomic writes and rater transcripts (appended on every
// turn, never shown) would otherwise fire constantly.
// Generator sessions append to <slug>/transcript.jsonl the same way; out/ and src/
// are copied in file by file when a build finishes, after generation.json says so.
const ignored = (rel: string) => /\.tmp$|\.transcript\.jsonl$|(^|\/)\.|~$|_viewer\.html$/.test(rel);
const ignoredGenerated = (rel: string) => /^[^/]+\/[^/]+\/(transcript\.jsonl$|out\/|src\/)/.test(rel);

type Root = 'dataset' | 'generated' | 'briefs' | 'proposals' | 'codebook';

function classify(root: Root, rel: string): Change {
  // A brief file is the generated batch of the same name.
  if (root === 'briefs') return { scope: 'generated', batch: rel.replace(/\.yaml$/, ''), file: '' };
  if (root === 'generated') {
    const [batch = '', slug, ...rest] = rel.split('/');
    return { scope: 'generated', batch, slug, file: rest.join('/') };
  }
  if (root !== 'dataset') return { scope: root, file: rel };
  const [batch = '', sites, slug, ...rest] = rel.split('/');
  return sites === 'sites' && slug
    ? { scope: 'dataset', batch, slug, file: rest.join('/') }
    : { scope: 'dataset', batch, file: rel.split('/').slice(1).join('/') };
}

function hub(): Hub {
  if (g.__consoleLive) return g.__consoleLive;
  const h: Hub = { listeners: new Set(), queued: [] };
  g.__consoleLive = h;

  const queue = (c: Change) => {
    h.queued.push(c);
    h.timer ??= setTimeout(() => {
      h.timer = undefined;
      const seen = new Set<string>();
      const changes = h.queued.filter((c) => { const k = JSON.stringify(c); return !seen.has(k) && !!seen.add(k); });
      h.queued = [];
      for (const l of h.listeners) l(changes);
    }, 250);
  };

  // fs.watch a directory recursively; if it doesn't exist yet (or is removed), keep checking until it does.
  const watchDir = (dir: string, root: Root) => {
    let watcher: fs.FSWatcher | undefined;
    const restart = () => {
      watcher?.close();
      watcher = undefined;
      queue(classify(root, ''));
    };
    const start = () => {
      if (watcher || !fs.existsSync(dir)) return;
      try {
        watcher = fs.watch(dir, { recursive: true }, (_event, name) => {
          const rel = name ? String(name).split(path.sep).join('/') : '';
          if (rel && (ignored(rel) || (root === 'generated' && ignoredGenerated(rel)))) return;
          queue(classify(root, rel));
          if (!fs.existsSync(dir)) restart();
        });
        watcher.on('error', restart);
      } catch {
        watcher = undefined;
      }
    };
    start();
    setInterval(start, 2000).unref();
  };

  watchDir(P.dataset, 'dataset');
  watchDir(P.generated, 'generated');
  watchDir(P.briefs, 'briefs');
  watchDir(P.proposals, 'proposals');
  watchDir(P.dist, 'codebook');
  return h;
}

export function subscribe(listener: Listener) {
  const h = hub();
  h.listeners.add(listener);
  return () => { h.listeners.delete(listener); };
}
