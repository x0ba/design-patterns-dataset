// Preloaded into the TREK server process (node --require). Routes the server's calls to
// Open-Meteo (weather/wind, hard-coded https URLs) to the local stub in stub-server.mjs,
// since the app runs without internet. Everything else goes through untouched.
const STUB = `http://127.0.0.1:${process.env.STUB_PORT}`;
const HOSTS = new Set(['api.open-meteo.com', 'archive-api.open-meteo.com']);
const realFetch = globalThis.fetch;
globalThis.fetch = function (input, init) {
  try {
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
    if (HOSTS.has(url.hostname)) return realFetch(`${STUB}/open-meteo/${url.hostname}${url.pathname}${url.search}`, init);
  } catch { /* fall through */ }
  return realFetch(input, init);
};
