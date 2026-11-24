"""Local stand-in for https://api.adsbdb.com (callsign -> route lookup).

Serves GET /v0/callsign/<CALLSIGN> with the same JSON shape adsbdb returns.
Routes come from routes.json (shared with the seed generator); airport and
airline details are read from the app's own data/airports.db and data/airlines.db.
Unknown callsigns get adsbdb's 404 body: {"response": "unknown callsign"}.
"""
import json
import os
import re
import sqlite3
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
ROUTES = json.loads((HERE / "routes.json").read_text())  # {"UAL1185": ["KSAN", "KDEN"], ...}

ap = sqlite3.connect(REPO / "data" / "airports.db", check_same_thread=False)
al = sqlite3.connect(REPO / "data" / "airlines.db", check_same_thread=False)

COUNTRY_ISO = {
    "United States": "US", "Canada": "CA", "Mexico": "MX", "United Kingdom": "GB", "France": "FR",
    "Germany": "DE", "Netherlands": "NL", "Japan": "JP", "Portugal": "PT", "Spain": "ES", "Italy": "IT",
    "Iceland": "IS", "Ireland": "IE", "Denmark": "DK", "South Korea": "KR", "Singapore": "SG",
    "Australia": "AU", "New Zealand": "NZ", "Thailand": "TH", "Vietnam": "VN", "Taiwan": "TW",
    "Switzerland": "CH", "Austria": "AT", "Greece": "GR", "Turkey": "TR", "Costa Rica": "CR",
    "Colombia": "CO", "Peru": "PE", "Chile": "CL", "Hong Kong": "HK",
}


def airport(icao):
    r = ap.execute("SELECT icao, iata, name, municipality, country, latitude, longitude FROM airports WHERE icao=?", [icao]).fetchone()
    if not r:
        return None
    return {
        "country_iso_name": COUNTRY_ISO.get(r[4], ""),
        "country_name": r[4],
        "elevation": 0,
        "iata_code": r[1],
        "icao_code": r[0],
        "latitude": r[5],
        "longitude": r[6],
        "municipality": r[3],
        "name": r[2],
    }


def airline(icao):
    r = al.execute("SELECT icao, iata, name FROM airlines WHERE icao=?", [icao]).fetchone()
    if not r:
        return None
    return {"name": r[2], "icao": r[0], "iata": r[1], "country": "", "country_iso": "", "callsign": r[2].split()[0].upper()}


def lookup(callsign):
    cs = callsign.upper().replace(" ", "")
    route = ROUTES.get(cs)
    if not route:
        # allow IATA-style input such as "UA1185"
        m = re.match(r"^([A-Z0-9]{2})(\d+)$", cs)
        if m:
            row = al.execute("SELECT icao FROM airlines WHERE iata=? ORDER BY icao", [m.group(1)]).fetchall()
            for (icao,) in row:
                if icao + m.group(2) in ROUTES:
                    cs = icao + m.group(2)
                    route = ROUTES[cs]
                    break
    if not route:
        return None
    a = airline(cs[:3])
    o, d = airport(route[0]), airport(route[1])
    if not (a and o and d):
        return None
    return {
        "response": {
            "flightroute": {
                "callsign": cs,
                "callsign_icao": cs,
                "callsign_iata": (a["iata"] or "") + cs[3:],
                "airline": a,
                "origin": o,
                "destination": d,
            }
        }
    }


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self._send(204, {})

    def do_GET(self):
        m = re.match(r"^/v0/callsign/([^/?]+)", self.path)
        if not m:
            return self._send(404, {"response": "not found"})
        res = lookup(m.group(1))
        if res is None:
            return self._send(404, {"response": "unknown callsign"})
        self._send(200, res)

    def log_message(self, fmt, *args):
        sys.stderr.write("[adsbdb-stub] " + fmt % args + "\n")


if __name__ == "__main__":
    port = int(os.environ.get("ADSBDB_PORT", "4457"))
    print(f"adsbdb stub listening on http://localhost:{port}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
