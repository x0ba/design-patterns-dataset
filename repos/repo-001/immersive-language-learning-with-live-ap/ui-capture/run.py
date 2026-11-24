"""
Local launcher for Immergo.

Runs the app's own FastAPI server (server/main.py) with the Gemini Live
integration module (server.gemini_live) swapped for a local stub, and adds a
few /__stub/* routes that stand in for browser-side third-party assets
(Google Fonts, reCAPTCHA Enterprise JS, GitHub buttons, Cloud logo).

Usage: python .ui-capture/run.py   (PORT env var, default 4446)
"""
import os
import sys
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
os.chdir(ROOT)  # server/main.py resolves "dist" relative to CWD
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(HERE / "stubs"))

# Swap the Gemini Live and reCAPTCHA Enterprise service modules for the local stub before main imports it
import gemini_live_stub  # noqa: E402
import recaptcha_validator_stub  # noqa: E402
sys.modules["server.gemini_live"] = gemini_live_stub
sys.modules["server.recaptcha_validator"] = recaptcha_validator_stub

from fastapi.staticfiles import StaticFiles  # noqa: E402
from starlette.routing import Mount  # noqa: E402

from server.main import app  # noqa: E402

# Put the stub asset mount ahead of the SPA catch-all route
app.router.routes.insert(
    0, Mount("/__stub", app=StaticFiles(directory=str(HERE / "stub_static")), name="stub-static")
)

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "4446"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
