"""Serve out/ like a plain static server (unknown paths -> index.html) and fetch the
page's local assets: every src/href in index.html, the module graph from js/app.js,
the wheels in js/config.js, the autoload script and the seeded Session."""
import functools, http.server, os, re, socketserver, sys, threading, urllib.request
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out')
PORT = 5485
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def send_head(self):
        if not os.path.exists(self.translate_path(self.path)): self.path = '/index.html'
        return super().send_head()
socketserver.ThreadingTCPServer.allow_reuse_address = True
httpd = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), functools.partial(H, directory=ROOT))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{PORT}/'
def get(u):
    with urllib.request.urlopen(base + u) as r: return r.status, r.read()
bad = []
st, html = get('')
html = html.decode()
refs = set(re.findall(r'(?:src|href)="(\./[^"#?]+)"', html))
seen, queue = set(), ['js/app.js']
while queue:
    m = queue.pop()
    if m in seen: continue
    seen.add(m)
    st, body = get(m)
    for imp in re.findall(r'''(?:from|import)\s*\(?\s*['"](\.{1,2}/[^'"]+)['"]''', body.decode('utf-8', 'replace')):
        queue.append(os.path.normpath(os.path.join(os.path.dirname(m), imp)))
for r in sorted(refs) + ['ui-capture-autoload.js', 'ui-capture-data/current.gbdraw-session.json.gz',
          'gbdraw-0.14.5-py3-none-any.whl', 'vendor/pyodide/v0.29.0/full/pyodide.asm.wasm', 'gallery/examples.json']:
    p = r[2:] if r.startswith('./') else r
    if not os.path.exists(os.path.join(ROOT, p)): bad.append(('missing', p)); continue
    st, body = get(p)
    if st != 200: bad.append((st, p))
missing_mods = [m for m in seen if not os.path.exists(os.path.join(ROOT, m))]
print('index bytes', len(html), '| refs', len(refs), '| modules', len(seen), '| missing modules', missing_mods[:5], '| bad', bad[:10])
print('autoload tag present:', 'ui-capture-autoload.js' in html, '| SPA fallback:', get('some/unknown/path')[1][:15])
httpd.shutdown()
