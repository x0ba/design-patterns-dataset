"""Dev helper: run start.sh on a test port, fetch some paths (optionally logged in), then stop."""
import os, re, signal, subprocess, sys, time, urllib.request, urllib.parse, http.cookiejar
port = int(os.environ.get('PROBE_PORT', '5460'))
env = dict(os.environ, PORT=str(port), SSLCZ_STUB_PORT=str(port + 1))
here = os.path.dirname(os.path.abspath(__file__))
p = subprocess.Popen([os.path.join(here, 'start.sh')], env=env, start_new_session=True,
                     stdout=open(os.path.join(os.environ.get('TMPDIR', '/tmp'), 'probe.log'), 'w'), stderr=subprocess.STDOUT)
base = 'http://127.0.0.1:%d' % port
cj = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.ProxyHandler({}))
try:
    for _ in range(60):
        try: op.open(base + '/login/', timeout=2); break
        except Exception: time.sleep(0.5)
    args = sys.argv[1:]
    for a in args:
        if a.startswith('login:'):
            _, url, user, pw = a.split(':', 3)
            html = op.open(base + url).read().decode()
            tok = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', html)
            data = {'username': user, 'password': pw}
            if tok: data['csrfmiddlewaretoken'] = tok.group(1)
            r = op.open(urllib.request.Request(base + url, urllib.parse.urlencode(data).encode(), headers={'Referer': base + url}))
            print('LOGIN', user, '->', r.geturl())
            continue
        try:
            r = op.open(base + a, timeout=30); body = r.read().decode('utf-8', 'replace')
            print(r.status, a, '->', r.geturl().replace(base, ''), len(body))
            if os.environ.get('DUMP'): open(os.path.join(os.environ['TMPDIR'], 'page.html'), 'w').write(body)
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', 'replace')
            m = re.search(r'<title>(.*?)</title>', body, re.S); ev = re.search(r'exception_value">(.*?)<', body, re.S)
            print(e.code, a, (m.group(1).strip() if m else ''), (ev.group(1)[:300] if ev else ''))
finally:
    os.killpg(p.pid, signal.SIGTERM); time.sleep(0.5)
    try: os.killpg(p.pid, signal.SIGKILL)
    except Exception: pass
