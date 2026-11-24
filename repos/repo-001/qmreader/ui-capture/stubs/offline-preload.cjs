'use strict';
// Loaded with NODE_OPTIONS=--require in the web process and every forked worker.
// 1) Routes the hard-wired DeepSeek endpoint to the local AI stub server.
// 2) Replaces network feed fetching with an offline "replay" of what is already
//    stored, so refreshes succeed without reaching RSSHub / the open web.
// 3) Answers other outbound HTTP (favicons, podscribe, jina, ...) with a quick
//    local failure instead of hanging on a blocked network.
const path = require('path');

const AI_STUB = process.env.QM_AI_STUB_URL || 'http://127.0.0.1:4437';
const REPO = path.resolve(__dirname, '..', '..');

// Name resolution for anything but localhost fails immediately. The app's own
// fetcher (favicon proxy, original-article fetch, podscribe, ...) resolves DNS
// itself and then connects through undici; in a sandbox where DNS still answers
// but connections are refused (EPERM), that TLS socket error is unhandled and
// crashes the web server. Failing at DNS keeps every caller on its normal
// "domain cannot be resolved" fallback path (e.g. the letter-icon favicon).
const dns = require('dns');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'ip6-localhost']);
const isLocalHost = host => LOCAL_HOSTS.has(String(host || '').toLowerCase().replace(/^\[|\]$/g, ''));
const offlineDnsError = host => Object.assign(new Error(`getaddrinfo ENOTFOUND ${host} (offline sandbox)`), {
  code: 'ENOTFOUND', errno: -3008, syscall: 'getaddrinfo', hostname: host,
});
const realLookup = dns.lookup;
dns.lookup = function offlineLookup(host, options, callback) {
  if (isLocalHost(host)) return realLookup.apply(this, arguments);
  const cb = typeof options === 'function' ? options : callback;
  process.nextTick(() => cb(offlineDnsError(host)));
  return {};
};
const realPromiseLookup = dns.promises.lookup;
dns.promises.lookup = async function offlinePromiseLookup(host, options) {
  if (isLocalHost(host)) return realPromiseLookup.call(this, host, options);
  throw offlineDnsError(host);
};

const realFetch = globalThis.fetch;
globalThis.fetch = async function patchedFetch(input, init) {
  const url = typeof input === 'string' ? input : input && input.url ? input.url : String(input);
  let parsed = null;
  try { parsed = new URL(url); } catch { /* relative */ }
  if (parsed && parsed.hostname === 'api.deepseek.com') {
    const target = AI_STUB + parsed.pathname + parsed.search;
    const opts = { ...(init || {}) };
    delete opts.redirect;
    return realFetch(target, opts);
  }
  if (parsed && !['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw Object.assign(new TypeError(`offline sandbox: ${parsed.hostname} is not reachable`), { code: 'ENOTFOUND' });
  }
  return realFetch(input, init);
};

function patchFetcher(fetcher) {
  const store = require(path.join(REPO, 'lib', 'store.js'));
  fetcher.fetchSource = async function offlineReplay(source) {
    if (!source || !source.id) return null;
    if (source.manual) return null;
    const page = store.getEntriesBySource(source.id, { limit: Math.min(source.limit || 20, 30) });
    const entries = (page && page.entries) || [];
    if (!entries.length) return { status: 'pending', entries: [], changedEntries: [] };
    const result = fetcher.__test.finalizeFetchedSource(source, entries, {
      feedUrl: String((source.feeds && source.feeds[0]) || source.siteUrl || ''),
      feedTitle: source.name,
    });
    return { ...result, changedEntries: [] };
  };
}

// Patch synchronously the moment lib/fetcher.js finishes loading (forked fetch
// children can receive their IPC message before any timer fires).
const Module = require('module');
const FETCHER_FILE = path.join(REPO, 'lib', 'fetcher.js');
const originalLoad = Module._load;
let patched = false;
Module._load = function patchedLoad(request, parent, isMain) {
  const exports = originalLoad.apply(this, arguments);
  if (!patched && exports && typeof exports.fetchSource === 'function' && exports.__test && exports.__test.finalizeFetchedSource) {
    try {
      if (Module._resolveFilename(request, parent, isMain) === FETCHER_FILE) { patched = true; patchFetcher(exports); }
    } catch (error) { console.error('[offline-preload] fetcher patch failed', error); }
  }
  return exports;
};
