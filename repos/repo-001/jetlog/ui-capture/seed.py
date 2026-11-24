"""Seed a running jetlog instance through its own HTTP API.

usage: seed.py http://localhost:5456
- renames the default admin:admin account to dana (password in app.json)
- creates users marco and priya
- posts every record in flights.json (shared flights via /api/flights/many)
- runs the app's own "compute connections" job for each user
"""
import json
import random
import sys
from pathlib import Path

import requests

BASE = sys.argv[1].rstrip("/") + "/api"
HERE = Path(__file__).resolve().parent
USERS = {"dana": "skyline-2019", "marco": "marco-flies", "priya": "priya-ux-42"}
rng = random.Random(7)


def token(u, p):
    r = requests.post(f"{BASE}/auth/token", data={"username": u, "password": p})
    r.raise_for_status()
    return {"Authorization": "Bearer " + r.json()["access_token"]}


h = token("admin", "admin")
requests.patch(f"{BASE}/users/admin", json={"username": "dana", "password": USERS["dana"]}, headers=h).raise_for_status()
h = token("dana", USERS["dana"])
for u in ("marco", "priya"):
    requests.post(f"{BASE}/users", json={"username": u, "password": USERS[u]}, headers=h).raise_for_status()

OTHER_SEAT = {"window": "middle", "aisle": "middle", "middle": "window", None: None}

flights = json.loads((HERE / "flights.json").read_text())
n = 0
for rec in flights:
    travelers = rec.pop("_travelers")
    payload = []
    for i, u in enumerate(travelers):
        f = dict(rec, username=u)
        if i > 0:
            if "notes" in f and rng.random() < 0.7:
                del f["notes"]
            seat = OTHER_SEAT.get(f.get("seat"))
            if seat:
                f["seat"] = seat
            else:
                f.pop("seat", None)
            if f.get("seat") != "window":
                f.pop("aircraftSide", None)
        payload.append(f)
    if len(payload) == 1:
        r = requests.post(f"{BASE}/flights?timezones=true", json=payload[0], headers=h)
    else:
        r = requests.post(f"{BASE}/flights/many?timezones=true", json=payload, headers=h)
    if r.status_code != 201:
        print("FAILED", r.status_code, r.text, rec)
        sys.exit(1)
    n += len(payload)

for u, p in USERS.items():
    r = requests.post(f"{BASE}/flights/connections", headers=token(u, p))
    print(u, "connections:", r.json())

# record a login for each secondary user so the users list looks lived-in
for u, p in USERS.items():
    token(u, p)
print(f"seeded {n} flights")
