"""Setup-time only: local relay to registry.yarnpkg.com with retries, used
because yarn's own fetches through the sandbox proxy kept aborting."""
import sys, time, subprocess, urllib.error
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
UP = "https://registry.yarnpkg.com"
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        for i in range(6):
            try:
                r = subprocess.run(["curl", "-sSf", "--max-time", "120", "-H", "Accept: " + self.headers.get("Accept", "*/*"), UP + self.path], capture_output=True)
                if r.returncode == 22:
                    self.send_response(404); self.end_headers(); return
                if r.returncode != 0:
                    raise RuntimeError(r.stderr)
                body = r.stdout; ct = "application/json" if not self.path.endswith(".tgz") else "application/octet-stream"
                self.send_response(200); self.send_header("Content-Type", ct)
                self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body); return
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    self.send_response(404); self.end_headers(); return
            except Exception as e:
                time.sleep(1 + i)
        self.send_response(502); self.end_headers()
    def log_message(self, *a): pass
ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
