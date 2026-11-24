"""In-process stand-in for a forward-auth reverse proxy (Authelia/Authentik style).

Jetlog supports header auth through the AUTH_HEADER env var: if the named header is present,
the request is treated as that user. A real deployment sets the header in a reverse proxy.
This wrapper does the same for local viewing: any request that has no Authorization
header gets `Remote-User: <LOCAL_AUTH_USER>`, so a fresh browser lands straight in the
signed-in UI. Requests carrying a Bearer token (after a normal /login) are left untouched.

Run with: uvicorn local_auth_proxy:app --app-dir .ui-capture  (repo root as cwd)
"""
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
# same import roots as `uvicorn main:app --app-dir server` (some modules import `models` unqualified)
sys.path.insert(0, str(REPO / "server"))
sys.path.insert(0, str(REPO))

from server.main import app as jetlog_app  # noqa: E402

HEADER = os.environ.get("AUTH_HEADER", "Remote-User").lower().encode()
USER = os.environ.get("LOCAL_AUTH_USER", "dana").encode()


async def app(scope, receive, send):
    if scope["type"] == "http":
        headers = list(scope.get("headers", []))
        names = {k.lower() for k, _ in headers}
        if b"authorization" not in names and HEADER not in names:
            headers.append((HEADER, USER))
            scope = dict(scope, headers=headers)
    await jetlog_app(scope, receive, send)
