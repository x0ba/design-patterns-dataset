// Tiny cookie-based API client for seeding TREK through its own REST API.
export function client(base) {
  let cookie = '';
  async function req(method, path, body, { raw = false, headers = {} } = {}) {
    const opts = { method, headers: { ...headers } };
    if (cookie) opts.headers.cookie = cookie;
    if (body instanceof FormData) opts.body = body;
    else if (body !== undefined) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(base + path, opts);
    const sc = res.headers.getSetCookie?.() || [];
    for (const c of sc) { const kv = c.split(';')[0]; if (kv.startsWith('trek_session=')) cookie = kv; }
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) { const e = new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`); e.status = res.status; e.data = data; throw e; }
    return raw ? res : data;
  }
  return {
    get: (p) => req('GET', p), post: (p, b) => req('POST', p, b ?? {}), put: (p, b) => req('PUT', p, b ?? {}),
    patch: (p, b) => req('PATCH', p, b ?? {}), del: (p) => req('DELETE', p),
    async login(email, password) { return req('POST', '/api/auth/login', { email, password }); },
    get cookie() { return cookie; },
  };
}
