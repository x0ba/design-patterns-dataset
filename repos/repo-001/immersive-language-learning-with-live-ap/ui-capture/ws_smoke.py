"""Smoke test: auth + websocket session against a running server. Usage: python ws_smoke.py PORT MODE"""
import asyncio, json, sys, requests, websockets
port, mode = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "teacher"
LANG = sys.argv[3] if len(sys.argv) > 3 else "🇪🇸 Spanish"
base = f"http://127.0.0.1:{port}"
print(requests.get(base + "/api/status").json())
for p in ["/", "/__stub/fonts/fonts.css", "/__stub/fonts/nunito-latin-400-normal.woff2", "/__stub/recaptcha/enterprise.js", "/__stub/img/google_cloud_48dp.svg", "/winner-bell.mp3", "/missions"]:
    r = requests.get(base + p); print(p, r.status_code, r.headers.get("content-type"), len(r.content))
tok = requests.post(base + "/api/auth", json={"recaptcha_token": "03AFcWeAxyz"}).json()
print(tok)
instr = ("\nROLEPLAY INSTRUCTION:\nYou are acting as **Flustered/Panicked Barista**, a native speaker of " + LANG + ".\n"
         "The user is a language learner (native speaker of 🇬🇧 English) trying to: \"Order a Coffee\" (Order a coffee and a pastry to go.).\n"
         + ("Your goal is to be a PROACTIVE LANGUAGE MENTOR" if mode == "teacher" else "Your goal is to play your role"))
setup = {"setup": {"system_instruction": {"parts": [{"text": instr}]}, "tools": {"function_declarations": []}}}
if mode == "teacher":
    setup["setup"]["input_audio_transcription"] = {}; setup["setup"]["output_audio_transcription"] = {}
async def main():
    async with websockets.connect(f"ws://127.0.0.1:{port}/ws?token={tok['session_token']}", max_size=None) as ws:
        await ws.send(json.dumps(setup))
        nbytes = 0
        try:
            while True:
                m = await asyncio.wait_for(ws.recv(), 20)
                if isinstance(m, bytes): nbytes += len(m)
                else: print(m[:160])
        except Exception as e:
            print("end:", type(e).__name__, "audio bytes:", nbytes)
asyncio.run(main())
