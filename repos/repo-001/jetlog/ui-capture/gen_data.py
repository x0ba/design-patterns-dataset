"""Generate a realistic multi-year flight history for the seed.

Writes:
  flights.json  - list of {"username"?, "travelers": [...], flight fields...} consumed by seed.py
  routes.json   - callsign -> [origin_icao, destination_icao], consumed by adsbdb_stub.py

Persona: Dana Okafor, a San Diego based UX consultant. Lots of short work hops up and
down the West Coast and to client offices, yearly Thanksgiving in Boston, a few big
trips abroad with partner Marco, a quiet 2020. Deterministic (fixed RNG seed).
"""
import datetime as dt
import json
import math
import random
import sqlite3
from pathlib import Path

import pytz

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
rng = random.Random(20190107)
TODAY = dt.date(2026, 11, 16)

ap = sqlite3.connect(REPO / "data" / "airports.db")
AP = {r[0]: r for r in ap.execute("SELECT icao, latitude, longitude, timezone FROM airports")}


def dist_km(a, b):
    _, la1, lo1, _ = AP[a]
    _, la2, lo2, _ = AP[b]
    la1, lo1, la2, lo2 = map(math.radians, (la1, lo1, la2, lo2))
    h = math.sin((la1 - la2) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo1 - lo2) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def block_minutes(a, b):
    d = dist_km(a, b)
    m = d / 820 * 60 + 32
    return int(round(m / 5) * 5)


# ---------------------------------------------------------------- routes
# callsign: (origin, destination, local departure "HH:MM", [aircraft choices])
B738, B739, B39M, B38M = "Boeing 737-800", "Boeing 737-900ER", "Boeing 737 MAX 9", "Boeing 737 MAX 8"
A320, A20N, A321, A21N, A319 = "Airbus A320", "Airbus A320neo", "Airbus A321", "Airbus A321neo", "Airbus A319"
B737 = "Boeing 737-700"
E175 = "Embraer E175"
B789, B788, B77W, B772, A359, A333, A332, B763 = ("Boeing 787-9", "Boeing 787-8", "Boeing 777-300ER", "Boeing 777-200ER",
                                                  "Airbus A350-900", "Airbus A330-300", "Airbus A330-200", "Boeing 767-300ER")
B752 = "Boeing 757-200"
ROUTES = {
    # Alaska
    "ASA509": ("KSAN", "KSEA", "07:05", [B739, B39M, B738]),
    "ASA526": ("KSEA", "KSAN", "17:40", [B739, B39M, B738]),
    "ASA1342": ("KSAN", "KSFO", "06:30", [A320, A21N, E175]),
    "ASA1349": ("KSFO", "KSAN", "18:55", [A320, A21N, E175]),
    "ASA3412": ("KSAN", "KPDX", "09:15", [E175]),
    "ASA3419": ("KPDX", "KSAN", "16:20", [E175]),
    # United
    "UAL1520": ("KSAN", "KSFO", "07:50", [A320, B738, A319]),
    "UAL2079": ("KSFO", "KSAN", "19:30", [A320, B738, A319]),
    "UAL2318": ("KSAN", "KDEN", "06:00", [B738, B39M, A320]),
    "UAL1765": ("KDEN", "KSAN", "18:25", [B738, B39M, A320]),
    "UAL1148": ("KSAN", "KORD", "06:15", [B739, B38M, B752]),
    "UAL2241": ("KORD", "KSAN", "17:55", [B739, B38M, B752]),
    "UAL1630": ("KSAN", "KEWR", "22:20", [B752, B739]),
    "UAL1631": ("KEWR", "KSAN", "08:45", [B752, B739]),
    "UAL5402": ("KSFO", "KSMF", "14:10", [E175]),
    # Southwest
    "SWA1876": ("KSAN", "KOAK", "08:25", [B737, B38M]),
    "SWA2402": ("KOAK", "KSAN", "18:10", [B737, B38M]),
    "SWA2241": ("KSAN", "KSMF", "10:40", [B737, B38M]),
    "SWA977": ("KSMF", "KSAN", "19:05", [B737, B38M]),
    "SWA1312": ("KSAN", "KLAS", "16:35", [B737, B38M]),
    "SWA2087": ("KLAS", "KSAN", "20:15", [B737, B38M]),
    "SWA3127": ("KSAN", "KAUS", "11:50", [B737, B38M]),
    "SWA1840": ("KAUS", "KSAN", "15:30", [B737, B38M]),
    "SWA845": ("KSAN", "KPHX", "13:05", [B737]),
    "SWA1209": ("KPHX", "KSAN", "18:45", [B737]),
    "SWA4410": ("KSAN", "KSLC", "07:35", [B737, B38M]),
    "SWA4415": ("KSLC", "KSAN", "17:20", [B737, B38M]),
    # Delta
    "DAL1874": ("KSAN", "KATL", "06:55", [B752, A321, B739]),
    "DAL1875": ("KATL", "KSAN", "18:10", [B752, A321, B739]),
    "DAL1452": ("KSAN", "KJFK", "13:40", [A21N, B752]),
    "DAL1453": ("KJFK", "KSAN", "18:30", [A21N, B752]),
    "DAL2210": ("KSAN", "KMSP", "07:10", [A320, A321, B739]),
    "DAL2211": ("KMSP", "KSAN", "16:45", [A320, A321, B739]),
    # JetBlue
    "JBU1488": ("KSAN", "KBOS", "21:59", [A321, A21N]),
    "JBU1489": ("KBOS", "KSAN", "17:25", [A321, A21N]),
    "JBU1324": ("KSAN", "KJFK", "06:45", [A320, A321]),
    "JBU1325": ("KJFK", "KSAN", "16:05", [A320, A321]),
    # American
    "AAL2611": ("KSAN", "KDFW", "06:00", [A321, B738]),
    "AAL2612": ("KDFW", "KSAN", "19:40", [A321, B738]),
    # Hawaiian
    "HAL15": ("KSAN", "PHNL", "08:10", [A332, A21N]),
    "HAL16": ("PHNL", "KSAN", "22:40", [A332, A21N]),
    "HAL33": ("KSAN", "PHOG", "07:30", [A21N]),
    "HAL34": ("PHOG", "KSAN", "21:55", [A21N]),
    "HAL148": ("PHNL", "PHOG", "11:20", ["Boeing 717-200"]),
    # Japan
    "JAL65": ("KSAN", "RJAA", "11:55", [B788]),
    "JAL66": ("RJAA", "KSAN", "17:25", [B788]),
    "ANA245": ("RJTT", "RJFF", "08:30", [B772, B789]),
    "ANA30": ("RJOO", "RJTT", "15:00", [B763]),
    # Iberia / TAP
    "TAP202": ("KJFK", "LPPT", "22:10", [A21N, A333]),
    "TAP1940": ("LPPT", "LPPR", "09:35", [A20N, A319]),
    "VLG8471": ("LPPR", "LEBL", "13:15", [A320]),
    "IBE2735": ("LEBL", "LEMD", "11:00", [A21N, A320]),
    "IBE6251": ("LEMD", "KJFK", "12:05", [A359, A333]),
    # British Airways
    "BAW272": ("KSAN", "EGLL", "19:55", [B789, B77W]),
    "BAW273": ("EGLL", "KSAN", "15:40", [B789, B77W]),
    "BAW1442": ("EGLL", "EGPH", "07:50", [A320, A20N]),
    "BAW1463": ("EGPH", "EGLL", "18:25", [A320, A20N]),
    "KLM1000": ("EGLL", "EHAM", "06:40", ["Embraer E190", "Boeing 737-800"]),
    "KLM1009": ("EHAM", "EGLL", "20:50", ["Embraer E190", "Boeing 737-800"]),
    # Icelandair
    "ICE680": ("KSEA", "BIKF", "16:30", [B752, "Boeing 737 MAX 9"]),
    "ICE204": ("BIKF", "EKCH", "07:40", [B39M, B752]),
    "ICE213": ("EKCH", "BIKF", "14:00", [B39M, B752]),
    "ICE681": ("BIKF", "KSEA", "17:00", [B752, "Boeing 737 MAX 9"]),
    # Mexico
    "VOI2011": ("MMTJ", "MMMX", "06:50", [A20N, A21N]),
    "AMX2466": ("MMMX", "MMOX", "10:30", ["Embraer E190", B38M]),
    "AMX2471": ("MMOX", "MMMX", "16:45", ["Embraer E190", B38M]),
    "VOI2014": ("MMMX", "MMTJ", "20:30", [A20N, A21N]),
    # Korea / Taiwan
    "KAL12": ("KLAX", "RKSI", "11:00", ["Airbus A380-800", B789]),
    "KAL691": ("RKSI", "RCTP", "08:05", [A333, B772]),
    "EVA16": ("RCTP", "KLAX", "23:40", [B77W]),
}

TAIL_PREFIX = {
    "ASA": lambda: f"N{rng.randint(200, 999)}AK" if rng.random() < .6 else f"N{rng.randint(270, 299)}{rng.choice('AKVX')}{rng.choice('AKQ')}",
    "UAL": lambda: f"N{rng.randint(37200, 37599)}" if rng.random() < .5 else f"N{rng.randint(400, 899)}UA",
    "SWA": lambda: f"N{rng.randint(200, 999)}{rng.choice(['WN', 'SW', 'WR'])}",
    "DAL": lambda: f"N{rng.randint(300, 899)}{rng.choice(['DN', 'DX', 'NW'])}",
    "JBU": lambda: f"N{rng.randint(900, 999)}JB",
    "AAL": lambda: f"N{rng.randint(100, 999)}{rng.choice(['AN', 'NN', 'AA'])}",
    "HAL": lambda: f"N{rng.randint(380, 395)}HA",
    "JAL": lambda: f"JA{rng.randint(821, 848)}J",
    "ANA": lambda: f"JA{rng.randint(741, 789)}A",
    "BAW": lambda: f"G-ZB{rng.choice('ABCDEHJK')}{rng.choice('ABCDEFGH')}",
    "ICE": lambda: f"TF-{rng.choice(['ISK', 'FIA', 'ICE', 'ICN', 'ISF'])}",
    "KAL": lambda: f"HL{rng.randint(7611, 7630)}",
    "EVA": lambda: f"B-{rng.randint(16701, 16740)}",
    "TAP": lambda: f"CS-TX{rng.choice('ABCDEFGHI')}",
}

routes_json = {cs: [r[0], r[1]] for cs, r in ROUTES.items()}

# --------------------------------------------------------------- note pools
WORK_NOTES = [
    "Client kickoff at the Mission Bay office.",
    "Quarterly design review. Prepped the deck on the plane.",
    "Usability sessions all day Tue/Wed.",
    "Wifi didn't work the whole flight, so I actually read a book.",
    "Free upgrade, the gate agent was lovely.",
    "45 min ground delay for fog at SFO, as usual.",
    "Workshop with the payments team.",
    "Sat next to a guy who builds furniture for a living, great chat.",
    "Last-minute trip, middle seat was all that was left.",
    "Red-eye. Did not sleep.",
    "On-site research visit.",
    "Board demo prep, flew out a day early.",
    "Gate change twice. Ran the length of the B concourse.",
    "Smooth flight, landed 20 min early.",
    "Mechanical delay, swapped aircraft. Departed 1h40 late.",
    "",
]
LEISURE_NOTES = [
    "Clear skies, amazing views of the coast.",
    "Snacks were good for once.",
    "Took off over the ocean at sunset 🌅",
    "Bumpy descent.",
    "",
]

# ------------------------------------------------------------------ builder
flights = []


def leg(date, cs, *, travelers=("dana",), purpose="leisure", seat=None, side=None, cls="economy", notes=None,
        times=True, airline=True, tail=None, flight_number=True, aircraft=True, dep=None, extra=None):
    o, d, dep_default, acs = ROUTES[cs]
    dep = dep or dep_default
    # small realistic jitter in schedules over years
    if dep == dep_default and rng.random() < 0.3:
        h, m = map(int, dep.split(":"))
        m = max(0, min(55, m + rng.choice([-10, -5, 5, 10, 15])))
        dep = f"{h:02d}:{m:02d}"
    f = {"date": date.isoformat(), "origin": o, "destination": d, "purpose": purpose, "ticketClass": cls,
         "_travelers": list(travelers)}
    if times:
        tz_o, tz_d = pytz.timezone(AP[o][3]), pytz.timezone(AP[d][3])
        dep_local = tz_o.localize(dt.datetime.combine(date, dt.time(*map(int, dep.split(":")))))
        mins = block_minutes(o, d) + rng.choice([-10, -5, 0, 0, 5, 10, 20])
        arr = (dep_local + dt.timedelta(minutes=mins)).astimezone(tz_d)
        f["departureTime"] = dep
        f["arrivalTime"] = arr.strftime("%H:%M")
        if arr.date() != date:
            f["arrivalDate"] = arr.date().isoformat()
    if airline:
        f["airline"] = cs[:3]
    if flight_number:
        f["flightNumber"] = cs
    if aircraft:
        f["airplane"] = rng.choice(acs)
    if tail is None:
        tail = rng.random() < 0.35
    if tail and cs[:3] in TAIL_PREFIX:
        f["tailNumber"] = TAIL_PREFIX[cs[:3]]()
    if seat is None:
        seat = rng.choices(["window", "aisle", "middle", None], [5, 4, 1, 1.2])[0]
    if seat:
        f["seat"] = seat
    if side is None and seat == "window":
        side = rng.choice(["left", "right"])
    if side:
        f["aircraftSide"] = side
    if notes:
        f["notes"] = notes
    if extra:
        f.update(extra)
    flights.append(f)
    return f


def round_trip(start, out_cs, back_cs, nights, purpose, notes_pool, **kw):
    n_out = rng.choice(notes_pool) if rng.random() < 0.45 else None
    n_back = rng.choice(notes_pool) if rng.random() < 0.3 else None
    leg(start, out_cs, purpose=purpose, notes=n_out or None, **kw)
    leg(start + dt.timedelta(days=nights), back_cs, purpose=purpose, notes=n_back or None, **kw)


WORK_DESTS = [
    (("ASA1342", "ASA1349"), 14), (("UAL1520", "UAL2079"), 12), (("SWA1876", "SWA2402"), 6),
    (("ASA509", "ASA526"), 9), (("UAL2318", "UAL1765"), 6), (("UAL1148", "UAL2241"), 6),
    (("JBU1324", "JBU1325"), 4), (("DAL1452", "DAL1453"), 3), (("UAL1630", "UAL1631"), 2),
    (("SWA3127", "SWA1840"), 4), (("ASA3412", "ASA3419"), 3), (("SWA4410", "SWA4415"), 2),
    (("DAL1874", "DAL1875"), 2), (("DAL2210", "DAL2211"), 2), (("AAL2611", "AAL2612"), 2),
    (("SWA845", "SWA1209"), 2),
]


def month_iter(start, end):
    y, m = start
    while (y, m) <= end:
        yield y, m
        m += 1
        if m == 13:
            y, m = y + 1, 1


busy = set()  # dates already used by handcrafted trips


def reserve(start, days):
    for i in range(days + 1):
        busy.add(start + dt.timedelta(days=i))


def free(start, days):
    return all((start + dt.timedelta(days=i)) not in busy for i in range(-1, days + 2))


# ------------------------------------------------------- handcrafted trips
def thanksgiving(year):
    # 4th Thursday of November
    d = dt.date(year, 11, 1)
    d += dt.timedelta(days=(3 - d.weekday()) % 7)
    return d + dt.timedelta(days=21)


trips = []  # (start, days, fn)


def trip(start, days):
    def deco(fn):
        trips.append((start, days, fn))
        return fn
    return deco


both = ("dana", "marco")


@trip(dt.date(2019, 4, 12), 13)
def japan():
    s = dt.date(2019, 4, 12)
    leg(s, "JAL65", travelers=both, seat="window", side="left", notes="First time in Japan!! 11 hours, watched 3 movies and slept maybe 2.")
    leg(s + dt.timedelta(days=5), "ANA245", travelers=both, seat="window", side="right", notes="Mt. Fuji visible on the right side about 20 min after takeoff 🗻")
    leg(s + dt.timedelta(days=11), "ANA30", travelers=both, times=False, seat="aisle")
    leg(s + dt.timedelta(days=13), "JAL66", travelers=both, seat="aisle",
        notes="JAL economy is genuinely better than most domestic first class. Hamburger steak + Haagen-Dazs for breakfast.")


@trip(dt.date(2019, 8, 23), 2)
def vegas_bach():
    s = dt.date(2019, 8, 23)
    leg(s, "SWA1312", seat="aisle", notes="Kelsey's bachelorette 🎰")
    leg(s + dt.timedelta(days=2), "SWA2087", seat=None, notes="never again")


@trip(dt.date(2020, 2, 7), 3)
def chi_feb():
    s = dt.date(2020, 2, 7)
    leg(s, "UAL1148", purpose="business", seat="aisle", cls="economy+")
    leg(s + dt.timedelta(days=3), "UAL2241", purpose="business", seat="aisle", cls="economy+",
        notes="Last work trip before everything shut down. Lots of people already in masks at O'Hare.")


@trip(dt.date(2020, 3, 13), 0)
def cancelled_era():
    pass


@trip(dt.date(2020, 10, 22), 3)
def covid_family():
    s = dt.date(2020, 10, 22)
    leg(s, "JBU1488", purpose="other", seat="window", side="left", cls="economy",
        notes="Flew out to help mom after her surgery. Middle seats blocked, N95 the whole way. Plane was maybe 30% full.")
    leg(s + dt.timedelta(days=10), "JBU1489", purpose="other", seat="window", side="right")


@trip(dt.date(2021, 7, 2), 7)
def maui():
    s = dt.date(2021, 7, 2)
    leg(s, "HAL33", travelers=both, seat="window", side="left", notes="First vacation in 18 months. Pre-travel COVID test drama at the airport.")
    leg(s + dt.timedelta(days=7), "HAL34", travelers=both, seat="window", side="right")


@trip(dt.date(2022, 5, 19), 12)
def iberia():
    s = dt.date(2022, 5, 19)
    leg(s, "DAL1452", travelers=both, seat="window", cls="economy+")
    leg(s + dt.timedelta(days=1), "TAP202", travelers=both, seat="window", side="left",
        notes="Overnight to Lisbon. Short layover at JFK so we stayed at the TWA hotel the night before.")
    leg(s + dt.timedelta(days=5), "TAP1940", travelers=both, seat="aisle", tail=True)
    leg(s + dt.timedelta(days=8), "VLG8471", travelers=both, seat="middle", times=False, notes="Vueling. Carry-on drama at the gate, paid €45 to check it.")
    leg(s + dt.timedelta(days=11), "IBE2735", travelers=both, seat=None)
    leg(s + dt.timedelta(days=12), "IBE6251", travelers=both, seat="window", side="right")
    leg(s + dt.timedelta(days=12), "DAL1453", travelers=both, seat="aisle", dep="19:15",
        notes="Tight connection at JFK, made it with 8 minutes to spare after customs.")


@trip(dt.date(2022, 9, 9), 2)
def sac_wedding():
    s = dt.date(2022, 9, 9)
    leg(s, "SWA2241", travelers=both, seat="window")
    leg(s + dt.timedelta(days=2), "SWA977", travelers=both, seat="aisle", notes="Priya & Sam's wedding 💍")


@trip(dt.date(2023, 3, 3), 10)
def uk():
    s = dt.date(2023, 3, 3)
    leg(s, "BAW272", purpose="business", seat="window", side="right", cls="business",
        notes="Client paid for Club World on the long haul. Lie-flat bed, slept 6 hours. Could get used to this.")
    leg(s + dt.timedelta(days=4), "BAW1442", purpose="business", seat="aisle", cls="economy")
    leg(s + dt.timedelta(days=6), "BAW1463", purpose="leisure", seat="window", side="left")
    leg(s + dt.timedelta(days=7), "KLM1000", purpose="leisure", seat="window", times=False)
    leg(s + dt.timedelta(days=9), "KLM1009", purpose="leisure", seat="aisle")
    leg(s + dt.timedelta(days=10), "BAW273", purpose="business", seat="aisle", cls="economy+",
        notes="Premium economy on the way back, not bad.")


@trip(dt.date(2023, 8, 18), 3)
def catalina():
    s = dt.date(2023, 8, 18)
    flights.append({"date": s.isoformat(), "origin": "KCRQ", "destination": "KAVX", "purpose": "leisure",
                    "ticketClass": "private", "departureTime": "10:15", "arrivalTime": "10:55",
                    "airplane": "Cessna 172S", "tailNumber": "N5216K", "seat": "window", "aircraftSide": "right",
                    "notes": "Ben flew us over to Catalina in his club's 172. Landed on the 'airport in the sky'. Very windy.",
                    "_travelers": list(both)})
    flights.append({"date": (s + dt.timedelta(days=2)).isoformat(), "origin": "KAVX", "destination": "KCRQ",
                    "purpose": "leisure", "ticketClass": "private", "departureTime": "16:30", "arrivalTime": "17:05",
                    "airplane": "Cessna 172S", "tailNumber": "N5216K", "seat": "window", "aircraftSide": "left",
                    "_travelers": list(both)})


@trip(dt.date(2024, 6, 13), 11)
def iceland_dk():
    s = dt.date(2024, 6, 13)
    leg(s, "ASA509", travelers=both, seat="aisle")
    leg(s, "ICE680", travelers=both, seat="window", side="right", dep="16:40",
        notes="Midnight sun on arrival. Didn't get dark at all.")
    leg(s + dt.timedelta(days=6), "ICE204", travelers=both, seat="window", side="left")
    leg(s + dt.timedelta(days=9), "ICE213", travelers=both, seat="aisle")
    leg(s + dt.timedelta(days=10), "ICE681", travelers=both, seat="window", side="left",
        notes="Flew over Greenland, ice sheet for an hour straight. Best window seat of my life.")
    leg(s + dt.timedelta(days=11), "ASA526", travelers=both, seat="aisle", dep="09:10", notes="Overnight in Seattle on the way back.")


@trip(dt.date(2025, 2, 14), 5)
def oaxaca():
    s = dt.date(2025, 2, 14)
    leg(s, "VOI2011", travelers=both, seat="window", notes="Walked across the CBX bridge, so much easier than flying out of SAN.")
    leg(s + dt.timedelta(days=1), "AMX2466", travelers=both, seat="window", side="right")
    leg(s + dt.timedelta(days=4), "AMX2471", travelers=both, seat="aisle")
    leg(s + dt.timedelta(days=5), "VOI2014", travelers=both, seat="middle", notes="Delayed 2h. Got back across the border at 1am.")


@trip(dt.date(2025, 10, 3), 12)
def asia():
    s = dt.date(2025, 10, 3)
    leg(s, "KAL12", travelers=both, seat="window", side="left", cls="economy+",
        notes="Drove up to LAX for this one. A380 upper deck in economy, didn't know that was a thing.")
    leg(s + dt.timedelta(days=7), "KAL691", travelers=both, seat="aisle")
    leg(s + dt.timedelta(days=12), "EVA16", travelers=both, seat="window", side="right",
        notes="Hello Kitty plane was the one before ours, unfortunately. Still a great flight.")


@trip(dt.date(2026, 4, 24), 4)
def honolulu_conf():
    s = dt.date(2026, 4, 24)
    leg(s, "HAL15", purpose="business", seat="aisle", notes="Design systems conference, gave a talk on day 2.")
    leg(s + dt.timedelta(days=2), "HAL148", purpose="leisure", seat="window", times=False, aircraft=False)
    leg(s + dt.timedelta(days=4), "HAL34", purpose="leisure", seat="window", side="left", dep="22:05")


@trip(dt.date(2026, 12, 18), 10)
def upcoming_xmas():
    s = dt.date(2026, 12, 18)
    leg(s, "SWA3127", travelers=both, seat=None, tail=False, aircraft=False, notes="Christmas in Austin with Marco's family.")
    leg(s + dt.timedelta(days=10), "SWA1840", travelers=both, seat=None, tail=False, aircraft=False)


def build():
    for start, days, fn in trips:
        reserve(start, days)
    for y in range(2019, 2027):
        tg = thanksgiving(y)
        if y == 2020:
            continue
        reserve(tg - dt.timedelta(days=1), 5)
    for y in (2019, 2021, 2023, 2025):
        reserve(dt.date(y, 12, 20), 8)

    for start, days, fn in trips:
        fn()

    # Thanksgiving in Boston
    for y in range(2019, 2026):
        if y == 2020:
            continue
        tg = thanksgiving(y)
        trav = both if y >= 2021 else ("dana",)
        leg(tg - dt.timedelta(days=1), "JBU1488", travelers=trav, seat="window", dep="06:50" if y % 2 else None,
            notes="Thanksgiving at mom's 🦃" if y in (2019, 2023) else None)
        leg(tg + dt.timedelta(days=3), "JBU1489", travelers=trav, seat="aisle",
            notes="Sunday after Thanksgiving = worst travel day of the year. Line at security out the door." if y == 2022 else None)

    # Christmas in Austin (odd years)
    for y in (2019, 2021, 2023, 2025):
        s = dt.date(y, 12, 21)
        leg(s, "SWA3127", travelers=both, seat="aisle")
        leg(s + dt.timedelta(days=6), "SWA1840", travelers=both, seat="window",
            notes="Southwest meltdown week. Our flight was one of the few that actually went." if y == 2021 else None)

    # Recurring work trips
    dests, weights = zip(*WORK_DESTS)
    for y, m in month_iter((2019, 1), (2026, 11)):
        if (2020, 3) <= (y, m) <= (2021, 5):
            continue  # pandemic
        p = 0.35 if (2021, 6) <= (y, m) <= (2021, 12) else 0.7
        n = 0
        while n < 2 and rng.random() < (p if n == 0 else 0.25):
            n += 1
            for _ in range(10):
                start = dt.date(y, m, rng.randint(1, 26))
                if start.weekday() >= 5:
                    continue
                nights = rng.choice([1, 2, 2, 3, 3, 4])
                if start + dt.timedelta(days=nights) >= TODAY:
                    break
                if not free(start, nights):
                    continue
                out_cs, back_cs = rng.choices(dests, weights)[0]
                cls = rng.choices(["economy", "economy+", "first"], [8, 3, 1])[0]
                seat = rng.choices(["aisle", "window", "middle", None], [6, 3, 1, 1])[0]
                kw = {}
                if rng.random() < 0.08:
                    kw["airline"] = False  # imported without airline (fixable via 'fetch airlines' job)
                if rng.random() < 0.07:
                    kw["times"] = False
                round_trip(start, out_cs, back_cs, nights, "business", WORK_NOTES, cls=cls, seat=seat, **kw)
                reserve(start, nights)
                break

    # A few quick leisure weekends
    weekend_routes = [("SWA1876", "SWA2402"), ("SWA1312", "SWA2087"), ("ASA3412", "ASA3419"), ("SWA4410", "SWA4415"),
                      ("ASA509", "ASA526")]
    for y in (2019, 2021, 2022, 2023, 2024, 2025, 2026):
        for _ in range(rng.choice([1, 1, 2])):
            for _ in range(20):
                start = dt.date(y, rng.randint(1, 10), rng.randint(1, 26))
                start += dt.timedelta(days=(4 - start.weekday()) % 7)  # Friday
                if start >= TODAY - dt.timedelta(days=5) or not free(start, 2):
                    continue
                o, b = rng.choice(weekend_routes)
                trav = both if rng.random() < 0.6 else ("dana",)
                round_trip(start, o, b, 2, "leisure", LEISURE_NOTES, travelers=trav, seat="window")
                reserve(start, 2)
                break

    # Marco-only flights (he visits his family / work trips)
    for d, o, b, n in [(dt.date(2022, 3, 10), "SWA3127", "SWA1840", 4), (dt.date(2023, 6, 1), "UAL2318", "UAL1765", 3),
                       (dt.date(2024, 10, 17), "SWA3127", "SWA1840", 5), (dt.date(2025, 5, 8), "DAL1874", "DAL1875", 2),
                       (dt.date(2026, 7, 30), "SWA3127", "SWA1840", 4)]:
        round_trip(d, o, b, n, "leisure" if o.startswith("SWA") else "business", LEISURE_NOTES, travelers=("marco",))

    # Priya (colleague, occasional shared work trips)
    for d, o, b, n in [(dt.date(2024, 2, 6), "ASA1342", "ASA1349", 2), (dt.date(2024, 9, 10), "UAL1148", "UAL2241", 3),
                       (dt.date(2025, 4, 15), "ASA509", "ASA526", 2), (dt.date(2026, 3, 3), "UAL1520", "UAL2079", 1)]:
        if free(d, n):
            round_trip(d, o, b, n, "business", WORK_NOTES, travelers=("dana", "priya"), seat="aisle")
            reserve(d, n)
        else:
            round_trip(d, o, b, n, "business", WORK_NOTES, travelers=("priya",), seat="aisle")
    for d, o, b, n in [(dt.date(2023, 11, 3), "SWA2241", "SWA977", 2), (dt.date(2025, 8, 22), "DAL2210", "DAL2211", 4)]:
        round_trip(d, o, b, n, "leisure", LEISURE_NOTES, travelers=("priya",))

    flights.sort(key=lambda f: (f["date"], f.get("departureTime") or "99:99"))


build()
(HERE / "flights.json").write_text(json.dumps(flights, indent=1, ensure_ascii=False))
(HERE / "routes.json").write_text(json.dumps(routes_json, indent=1))
from collections import Counter
c = Counter(t for f in flights for t in f["_travelers"])
print(f"{len(flights)} flight records; per user: {dict(c)}")
