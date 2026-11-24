"""Local front proxy that signs the browser in as the seeded user.

altero itself is unchanged. A browser that arrives with no session cookie would
normally get 401 from GET /web/auth/session and see the sign-in form. For the UI
capture we want the established user's view instead, so for browser traffic
(/app/..., /web/...) without an `altero_session` cookie this proxy signs in
through altero's own POST /web/auth/login, forwards the request with the new
cookies, and hands the browser the Set-Cookie headers altero issued. Every other
request (the Zotero Web API, file downloads, ...) passes through untouched.

Usage: autologin_proxy.py LISTEN_PORT UPSTREAM_PORT USERNAME PASSWORD
"""

import http.client
import json
import sys
import threading
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LISTEN, UPSTREAM = int(sys.argv[1]), int(sys.argv[2])
USERNAME, PASSWORD = sys.argv[3], sys.argv[4]
SESSION_COOKIE = "altero_session"
HOP = {"connection", "keep-alive", "proxy-connection", "transfer-encoding", "te", "trailer", "upgrade"}


def browser_path(path: str) -> bool:
    return path == "/" or path.startswith("/app") or path.startswith("/web/")


def login(user_agent: str) -> list[str]:
    """Open a session through altero's login endpoint; return its Set-Cookie headers."""
    conn = http.client.HTTPConnection("127.0.0.1", UPSTREAM, timeout=30)
    body = json.dumps({"username": USERNAME, "password": PASSWORD})
    conn.request("POST", "/web/auth/login", body=body,
                 headers={"Content-Type": "application/json", "User-Agent": user_agent})
    resp = conn.getresponse()
    resp.read()
    conn.close()
    if resp.status != 200:
        raise RuntimeError(f"auto sign-in failed: HTTP {resp.status}")
    return resp.headers.get_all("Set-Cookie") or []


def cookie_pairs(set_cookies: list[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for header in set_cookies:
        jar = SimpleCookie()
        jar.load(header)
        out.update({k: m.value for k, m in jar.items()})
    return out


class Proxy(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):  # keep the console quiet
        pass

    def _forward(self, headers: dict[str, str], body: bytes | None):
        conn = http.client.HTTPConnection("127.0.0.1", UPSTREAM, timeout=None)
        conn.request(self.command, self.path, body=body, headers=headers)
        return conn, conn.getresponse()

    def _handle(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None
        # The browser's Host is kept so any absolute links altero builds point back here.
        headers = {k: v for k, v in self.headers.items() if k.lower() not in HOP}

        jar = SimpleCookie()
        jar.load(self.headers.get("Cookie", ""))
        new_cookies: list[str] = []
        has_session = SESSION_COOKIE in jar
        path_only = self.path.split("?", 1)[0]

        def sign_in():
            nonlocal new_cookies
            new_cookies = login(self.headers.get("User-Agent", ""))
            merged = {k: m.value for k, m in jar.items()} | cookie_pairs(new_cookies)
            headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in merged.items())

        if browser_path(path_only) and not has_session and path_only != "/web/auth/logout":
            sign_in()

        conn, resp = self._forward(headers, body)
        # A stale cookie (e.g. after the database was rebuilt) also yields 401 here.
        if resp.status == 401 and path_only == "/web/auth/session" and has_session:
            resp.read()
            conn.close()
            sign_in()
            conn, resp = self._forward(headers, body)

        try:
            self.send_response_only(resp.status, resp.reason)
            streamed = resp.getheader("Content-Length") is None and self.command != "HEAD" \
                and resp.status not in (204, 304)
            for k, v in resp.getheaders():
                if k.lower() in HOP:
                    continue
                self.send_header(k, v)
            for c in new_cookies:
                self.send_header("Set-Cookie", c)
            if streamed:
                self.send_header("Transfer-Encoding", "chunked")
            self.end_headers()
            if self.command == "HEAD":
                return
            while True:
                chunk = resp.read1(65536) if streamed else resp.read(65536)
                if not chunk:
                    break
                if streamed:
                    self.wfile.write(b"%x\r\n%s\r\n" % (len(chunk), chunk))
                else:
                    self.wfile.write(chunk)
                self.wfile.flush()
            if streamed:
                self.wfile.write(b"0\r\n\r\n")
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            self.close_connection = True
        finally:
            conn.close()

    do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = do_HEAD = do_OPTIONS = _handle


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    srv = Server(("127.0.0.1", LISTEN), Proxy)
    print(f"auto sign-in proxy on http://localhost:{LISTEN}/ -> altero on {UPSTREAM} as {USERNAME}", flush=True)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    threading.Event().wait()
