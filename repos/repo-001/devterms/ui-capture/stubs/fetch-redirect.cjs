// Preloaded into the Next.js server (NODE_OPTIONS=--require ...).
// Redirects server-side calls to GitHub's OAuth token endpoint and REST API to
// the local stub, so the app's real GitHub sign-in code runs unchanged offline.
const MISC = process.env.STUB_MISC_URL || 'http://127.0.0.1:4486';
const RULES = [
  ['https://github.com/login/oauth/', `${MISC}/github/login/oauth/`],
  ['https://api.github.com/', `${MISC}/github-api/`]
];

const rewrite = (u) => {
  for (const [from, to] of RULES) if (u.startsWith(from)) return to + u.slice(from.length);
  return null;
};

const originalFetch = globalThis.fetch;
if (typeof originalFetch === 'function') {
  globalThis.fetch = function patchedFetch(input, init) {
    try {
      if (typeof input === 'string' || input instanceof URL) {
        const target = rewrite(String(input));
        if (target) return originalFetch(target, init);
      } else if (input && typeof input.url === 'string') {
        const target = rewrite(input.url);
        if (target)
          return (async () => {
            const hasBody = !['GET', 'HEAD'].includes(input.method);
            return originalFetch(target, {
              method: input.method,
              headers: input.headers,
              body: hasBody ? await input.arrayBuffer() : undefined,
              ...init
            });
          })();
      }
    } catch (err) {
      console.error('[fetch-redirect]', err);
    }
    return originalFetch(input, init);
  };
}
