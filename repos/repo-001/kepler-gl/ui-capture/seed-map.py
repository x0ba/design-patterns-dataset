#!/usr/bin/env python3
"""Generate the saved kepler.gl map that the app opens on boot.

Represents an analyst at a regional seismic network who has been working in
kepler.gl for months: the real NCSN earthquake catalogue (kepler.gl-data
sample, 1967-2011) plus the network's station inventory and field-service
ticket log (generated deterministically, anchored to real California places).

Output is kepler.gl's own saved-map JSON (same shape as "Export map > JSON"),
loaded by the demo app via config.json `mapUrl` -> loadRemoteMap -> loadFiles.

Usage: python3 seed-map.py <out_dir>
"""
import csv
import datetime as dt
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
rng = random.Random(20261117)

# ---------------------------------------------------------------- earthquakes
eq_rows = []
with open(os.path.join(HERE, 'raw/samples/earthquakes/data.csv')) as f:
    r = csv.reader(f)
    header = next(r)
    for row in r:
        dt_s, lat, lng, depth, mag, magtype, nst, gap, dist, rms, src, eid = row
        num = lambda v, t=float: (t(v) if v not in ('', None) else None)
        eq_rows.append([dt_s, num(lat), num(lng), num(depth), num(mag), magtype,
                        num(nst, int), num(gap, int), num(dist, int), num(rms), src, eid])
eq_fields = [
    ('DateTime', 'timestamp', 'YYYY/MM/DD HH:mm:ss.SS'), ('Latitude', 'real', ''),
    ('Longitude', 'real', ''), ('Depth', 'real', ''), ('Magnitude', 'real', ''),
    ('MagType', 'string', ''), ('NbStations', 'integer', ''), ('Gap', 'integer', ''),
    ('Distance', 'integer', ''), ('RMS', 'real', ''), ('Source', 'string', ''),
    ('EventID', 'string', '')]

# ---------------------------------------------------------------- stations
# Real California / Nevada / Oregon places (approx lat, lng) to anchor stations.
PLACES = [
    ('Berkeley', 37.876, -122.236), ('Mount Hamilton', 37.341, -121.643), ('Hollister', 36.853, -121.402),
    ('Parkfield', 35.900, -120.433), ('San Juan Bautista', 36.845, -121.537), ('Bodega Bay', 38.333, -123.048),
    ('Point Reyes', 38.069, -122.806), ('Mount Diablo', 37.882, -121.914), ('Calistoga', 38.579, -122.580),
    ('The Geysers', 38.790, -122.756), ('Ukiah', 39.150, -123.207), ('Eureka', 40.802, -124.164),
    ('Cape Mendocino', 40.440, -124.409), ('Petrolia', 40.325, -124.287), ('Arcata', 40.867, -124.083),
    ('Redding', 40.587, -122.392), ('Mount Shasta', 41.310, -122.310), ('Lassen Peak', 40.488, -121.505),
    ('Chico', 39.729, -121.837), ('Oroville', 39.514, -121.556), ('Sacramento', 38.582, -121.494),
    ('Auburn', 38.897, -121.077), ('Truckee', 39.328, -120.183), ('Lake Tahoe', 39.097, -120.032),
    ('Mammoth Lakes', 37.649, -118.972), ('Long Valley', 37.640, -118.880), ('Bishop', 37.364, -118.395),
    ('Bridgeport', 38.256, -119.231), ('Yosemite Valley', 37.745, -119.593), ('Fresno', 36.738, -119.787),
    ('Coalinga', 36.140, -120.360), ('Paso Robles', 35.627, -120.691), ('San Luis Obispo', 35.283, -120.660),
    ('Santa Cruz', 36.974, -122.031), ('Watsonville', 36.910, -121.757), ('Monterey', 36.600, -121.894),
    ('Big Sur', 36.270, -121.808), ('Gilroy', 37.006, -121.568), ('San Jose', 37.338, -121.886),
    ('Fremont', 37.548, -121.988), ('Livermore', 37.682, -121.768), ('Stockton', 37.958, -121.291),
    ('Modesto', 37.639, -120.997), ('Merced', 37.302, -120.483), ('Napa', 38.297, -122.286),
    ('Santa Rosa', 38.440, -122.714), ('Vallejo', 38.104, -122.257), ('Half Moon Bay', 37.464, -122.428),
    ('Woodside', 37.430, -122.254), ('Los Gatos', 37.227, -121.975), ('Tres Pinos', 36.790, -121.320),
    ('Pinnacles', 36.491, -121.197), ('King City', 36.213, -121.126), ('Bakersfield', 35.373, -119.019),
    ('Tehachapi', 35.132, -118.449), ('Ridgecrest', 35.622, -117.671), ('Reno', 39.530, -119.814),
    ('Carson City', 39.164, -119.767), ('Klamath Falls', 42.225, -121.782), ('Crescent City', 41.756, -124.202),
]
NETS = [('NC', 0.55), ('BK', 0.25), ('NP', 0.08), ('CE', 0.07), ('PG', 0.05)]
SENSORS = ['Streckeisen STS-2', 'Nanometrics Trillium 120PA', 'Guralp CMG-3T', 'Kinemetrics EpiSensor ES-T',
           'Mark Products L-4C', 'Nanometrics Trillium Compact', 'Kinemetrics Episensor + STS-5A']
TELEMETRY = ['Cellular (LTE)', 'Licensed radio', 'Satellite (VSAT)', 'Fiber', 'Spread-spectrum radio']
STATUS_W = [('operational', 0.68), ('degraded', 0.12), ('offline', 0.07), ('decommissioned', 0.08), ('planned', 0.05)]


def wpick(pairs):
    x = rng.random()
    acc = 0
    for v, w in pairs:
        acc += w
        if x <= acc:
            return v
    return pairs[-1][0]


TODAY = dt.datetime(2026, 11, 16, 17, 0)
stations = []
used = set()
for i in range(176):
    pname, plat, plng = PLACES[i % len(PLACES)] if i < len(PLACES) else rng.choice(PLACES)
    lat = plat + rng.uniform(-0.12, 0.12)
    lng = plng + rng.uniform(-0.14, 0.14)
    net = wpick(NETS)
    while True:
        base = ''.join(ch for ch in pname.upper() if ch.isalpha())
        code = (base[0] + ''.join(rng.sample(base[1:] or 'XYZ', min(2, len(base) - 1 or 2)))
                + rng.choice('ABCDEFGHJKLMNPRSTVWXYZ0123456789'))[:4]
        if (net, code) not in used:
            used.add((net, code))
            break
    status = wpick(STATUS_W)
    installed = dt.date(1968, 1, 1) + dt.timedelta(days=rng.randint(0, 57 * 365))
    if status == 'planned':
        installed = None
    last_maint = None
    if status not in ('planned',):
        days_ago = rng.randint(4, 900) if status != 'decommissioned' else rng.randint(700, 4000)
        last_maint = (TODAY - dt.timedelta(days=days_ago)).date()
        if installed and last_maint < installed:
            last_maint = installed + dt.timedelta(days=30)
    uptime = {'operational': rng.uniform(97.5, 99.99), 'degraded': rng.uniform(71, 96),
              'offline': rng.uniform(0, 45), 'decommissioned': None, 'planned': None}[status]
    notes = rng.choice([
        '', '', '', 'Vault re-sealed after winter flooding.', 'Shared site with PG&E substation; badge required.',
        'Battery bank replaced; solar panel cleaned.', 'Gate code changed by landowner, see site binder.',
        'Intermittent GPS lock since firmware 4.2 upgrade — monitor clock quality.',
        'Access road washed out Feb storms; 4WD only until county regrades.',
        'Co-located with GNSS monument. Horizontal component shows long-period tilt after heavy rain; '
        'consider moving sensor to the deeper posthole once permit clears.',
        'Strong-motion only.', 'Telemetry migrated from radio to LTE.',
        'Landowner (R. Alvarez) prefers 48h notice before visits.',
        'Woodpecker damage to cable conduit, temporary fix applied.',
    ])
    if status == 'decommissioned':
        notes = rng.choice(['Site lease ended; equipment recovered.', 'Replaced by nearby borehole station.',
                            'Decommissioned after vandalism (third incident).'])
    if status == 'planned':
        notes = rng.choice(['Permit pending with BLM.', 'Site survey done; awaiting landowner agreement.',
                            'Funded under 2026 ShakeAlert densification.'])
    elev = int(max(2, rng.gauss(420, 380))) if 'Mount' not in pname and 'Lassen' not in pname else rng.randint(900, 2600)
    stations.append([
        f'{net}.{code}', net, f'{pname} {rng.choice(["Ridge", "Hill", "Ranch", "Road", "Peak", "Creek", "Station", "Vault"])}',
        round(lat, 5), round(lng, 5), elev, status, rng.choice(SENSORS), rng.choice(TELEMETRY),
        installed.isoformat() if installed else None, last_maint.isoformat() if last_maint else None,
        round(uptime, 2) if uptime is not None else None, rng.random() < 0.62, notes,
    ])
st_fields = [
    ('station_id', 'string', ''), ('network', 'string', ''), ('site_name', 'string', ''),
    ('latitude', 'real', ''), ('longitude', 'real', ''), ('elevation_m', 'integer', ''),
    ('status', 'string', ''), ('sensor', 'string', ''), ('telemetry', 'string', ''),
    ('installed_on', 'date', 'YYYY-MM-DD'), ('last_maintenance', 'date', 'YYYY-MM-DD'),
    ('uptime_30d_pct', 'real', ''), ('shakealert_contributing', 'boolean', ''), ('notes', 'string', '')]

# ---------------------------------------------------------------- tickets
OFFICES = [('Menlo Park field office', 37.4567, -122.1694), ('Berkeley Seismo Lab', 37.8735, -122.2597),
           ('Eureka depot', 40.7766, -124.1450), ('Mammoth Lakes depot', 37.6455, -118.9660)]
TECHS = ['Priya Raman', 'Marcus Delgado', 'Hannah Okafor', 'Tom Lindqvist', 'Jae-won Park',
         'Lucía Ferrer', 'Dale Whitcomb', 'Aisha Mbeki', 'Unassigned']
CATS = {
    'Telemetry outage': ['No data since {d}; modem unresponsive.', 'LTE link flapping, latency spikes >8s.',
                         'Radio repeater on {p} down, 3 stations affected.'],
    'Power': ['Battery voltage trending below 11.8V at night.', 'Solar controller failed, running on reserve.',
              'Power outage after PSPS event, generator requested.'],
    'Sensor noise': ['Elevated noise on HHE above 2 Hz — possible loose pier bolt.',
                     'Mass position out of range on vertical, recenter needed.',
                     'Spikes correlated with irrigation pump cycle on neighbouring field.'],
    'Timing / GPS': ['Clock quality degraded; GPS antenna cable likely damaged by rodents.',
                     'Leap-second handling issue after digitizer reboot.'],
    'Site access': ['Gate lock replaced by owner, need new key.', 'Road closed for wildfire mitigation work.'],
    'Vandalism / damage': ['Enclosure lid pried open, solar panel stolen.', 'Fallen oak limb on antenna mast.'],
    'Upgrade': ['Swap Q330 for Centaur digitizer per 2026 refresh plan.', 'Install accelerometer for ShakeAlert.',
                'Migrate telemetry radio → LTE.'],
}
PRIORITY_W = [('P1 - critical', 0.12), ('P2 - high', 0.28), ('P3 - normal', 0.45), ('P4 - low', 0.15)]
tickets = []
live_stations = [s for s in stations if s[6] != 'planned']
for i in range(268):
    s = rng.choice(live_stations)
    office = min(OFFICES, key=lambda o: (o[1] - s[3]) ** 2 + (o[2] - s[4]) ** 2)
    if rng.random() < 0.15:
        office = rng.choice(OFFICES)
    opened = TODAY - dt.timedelta(days=rng.betavariate(1.3, 3.2) * 540, hours=rng.randint(0, 23),
                                  minutes=rng.randint(0, 59))
    cat = rng.choice(list(CATS))
    prio = wpick(PRIORITY_W)
    age = (TODAY - opened).days
    sla = {'P1 - critical': 2, 'P2 - high': 7, 'P3 - normal': 21, 'P4 - low': 60}[prio]
    if age > 45:
        state = wpick([('resolved', 0.86), ('cancelled', 0.06), ('overdue', 0.08)])
    else:
        state = wpick([('resolved', 0.42), ('in progress', 0.30), ('open', 0.18), ('cancelled', 0.03),
                       ('overdue', 0.07)])
    if state in ('open', 'in progress') and age > sla:
        state = 'overdue'
    closed = None
    if state in ('resolved', 'cancelled'):
        closed = opened + dt.timedelta(hours=rng.uniform(2, sla * 24 * 1.6))
        if closed > TODAY:
            closed = TODAY - dt.timedelta(hours=rng.randint(1, 30))
    tech = rng.choice(TECHS[:-1]) if state != 'open' else rng.choice(TECHS)
    summary = rng.choice(CATS[cat]).format(d=opened.strftime('%b %d'), p=s[2].split(' ')[0])
    if rng.random() < 0.2:
        summary += ' ' + rng.choice([
            'Follow-up visit scheduled with landowner.', 'Parts ordered (ETA 2 wks).',
            'Remote reboot attempted twice, no change.', 'Photos uploaded to site folder.',
            'Coordinate with Caltrans for lane closure; site sits on the shoulder of SR-1.'])
    tickets.append([
        f'FS-{24000 + i * 3 + rng.randint(0, 2)}', s[0], cat, prio, state, tech,
        opened.strftime('%Y-%m-%d %H:%M'), closed.strftime('%Y-%m-%d %H:%M') if closed else None,
        round((closed - opened).total_seconds() / 3600, 1) if closed else None,
        office[0], office[1], office[2], s[3], s[4], summary])
tickets.sort(key=lambda t: t[6])
tk_fields = [
    ('ticket_id', 'string', ''), ('station_id', 'string', ''), ('category', 'string', ''),
    ('priority', 'string', ''), ('status', 'string', ''), ('assigned_to', 'string', ''),
    ('opened_at', 'timestamp', 'YYYY-MM-DD HH:mm'), ('closed_at', 'timestamp', 'YYYY-MM-DD HH:mm'),
    ('hours_to_close', 'real', ''), ('dispatch_from', 'string', ''), ('office_lat', 'real', ''),
    ('office_lng', 'real', ''), ('station_lat', 'real', ''), ('station_lng', 'real', ''),
    ('summary', 'string', '')]


def dataset(did, label, color, fields, rows):
    return {'version': 'v1', 'data': {
        'id': did, 'label': label, 'color': color,
        'allData': rows,
        'fields': [{'name': n, 'type': t, 'format': f, 'analyzerType':
                    {'timestamp': 'DATETIME', 'real': 'FLOAT', 'integer': 'INT', 'string': 'STRING',
                     'boolean': 'BOOLEAN', 'date': 'DATE'}[t]} for n, t, f in fields]}}


def ms(s):
    return int(dt.datetime.strptime(s, '%Y-%m-%d').replace(tzinfo=dt.timezone.utc).timestamp() * 1000)


STATUS_COLORS = ['#2ecc71', '#f5b041', '#e74c3c', '#7f8c8d', '#5dade2']
config = {
    'version': 'v1',
    'config': {
        'visState': {
            'filters': [
                {'dataId': ['earthquakes'], 'id': 'eq_time', 'name': ['DateTime'], 'type': 'timeRange',
                 'value': [ms('1989-01-01'), ms('2011-03-31')], 'view': 'enlarged', 'plotType': {'type': 'histogram'},
                 'animationWindow': 'free', 'speed': 1},
                {'dataId': ['earthquakes'], 'id': 'eq_mag', 'name': ['Magnitude'], 'type': 'range',
                 'value': [2.8, 7.1], 'view': 'side'},
                {'dataId': ['field_tickets'], 'id': 'tk_status', 'name': ['status'], 'type': 'multiSelect',
                 'value': ['open', 'in progress', 'overdue'], 'view': 'side'},
            ],
            'layers': [
                {'id': 'eq_points', 'type': 'point', 'config': {
                    'dataId': 'earthquakes', 'label': 'Earthquakes (M2.8+)', 'color': [23, 184, 190],
                    'columns': {'lat': 'Latitude', 'lng': 'Longitude', 'altitude': None}, 'isVisible': True,
                    'visConfig': {'radius': 9, 'fixedRadius': False, 'opacity': 0.45, 'outline': False,
                                  'thickness': 2, 'radiusRange': [2, 60],
                                  'colorRange': {'name': 'Global Warming', 'type': 'sequential', 'category': 'Uber',
                                                 'colors': ['#5A1846', '#900C3F', '#C70039', '#E3611C', '#F1920E', '#FFC300']}}},
                    'visualChannels': {'colorField': {'name': 'Magnitude', 'type': 'real'}, 'colorScale': 'quantize',
                                       'sizeField': {'name': 'Magnitude', 'type': 'real'}, 'sizeScale': 'sqrt'}},
                {'id': 'eq_heat', 'type': 'heatmap', 'config': {
                    'dataId': 'earthquakes', 'label': 'Seismicity density', 'color': [255, 153, 31],
                    'columns': {'lat': 'Latitude', 'lng': 'Longitude'}, 'isVisible': False,
                    'visConfig': {'opacity': 0.8, 'radius': 22}},
                    'visualChannels': {'weightField': {'name': 'Magnitude', 'type': 'real'}, 'weightScale': 'linear'}},
                {'id': 'st_points', 'type': 'point', 'config': {
                    'dataId': 'stations', 'label': 'Stations by status', 'color': [255, 255, 255],
                    'columns': {'lat': 'latitude', 'lng': 'longitude', 'altitude': None}, 'isVisible': True,
                    'visConfig': {'radius': 6, 'fixedRadius': False, 'opacity': 0.95, 'outline': True,
                                  'thickness': 1.5, 'strokeColor': [20, 20, 20], 'filled': True,
                                  'colorRange': {'name': 'Station status', 'type': 'custom', 'category': 'Custom',
                                                 'colors': STATUS_COLORS,
                                                 'colorMap': [[s, c] for s, c in zip(
                                                     ['operational', 'degraded', 'offline', 'decommissioned', 'planned'],
                                                     STATUS_COLORS)]}}},
                    'visualChannels': {'colorField': {'name': 'status', 'type': 'string'}, 'colorScale': 'ordinal'}},
                {'id': 'tk_arcs', 'type': 'arc', 'config': {
                    'dataId': 'field_tickets', 'label': 'Open dispatches', 'color': [130, 154, 227],
                    'columns': {'lat0': 'office_lat', 'lng0': 'office_lng', 'lat1': 'station_lat', 'lng1': 'station_lng'},
                    'isVisible': True,
                    'visConfig': {'opacity': 0.75, 'thickness': 2,
                                  'colorRange': {'name': 'Priority', 'type': 'sequential', 'category': 'Custom',
                                                 'colors': ['#ff4d4d', '#ff9f43', '#54a0ff', '#a4b0be']},
                                  'targetColor': None}},
                    'visualChannels': {'colorField': {'name': 'priority', 'type': 'string'}, 'colorScale': 'ordinal'}},
            ],
            'interactionConfig': {
                'tooltip': {'enabled': True, 'compareMode': False, 'compareType': 'absolute', 'fieldsToShow': {
                    'earthquakes': [{'name': n, 'format': None} for n in ['DateTime', 'Magnitude', 'Depth', 'NbStations', 'EventID']],
                    'stations': [{'name': n, 'format': None} for n in ['station_id', 'site_name', 'status', 'uptime_30d_pct', 'last_maintenance']],
                    'field_tickets': [{'name': n, 'format': None} for n in ['ticket_id', 'station_id', 'priority', 'status', 'assigned_to', 'summary']],
                }},
                'brush': {'size': 0.5, 'enabled': False}, 'geocoder': {'enabled': False},
                'coordinate': {'enabled': False}},
            'layerBlending': 'additive', 'splitMaps': [], 'animationConfig': {'currentTime': None, 'speed': 1},
        },
        'mapState': {'bearing': 0, 'dragRotate': False, 'latitude': 37.62, 'longitude': -121.15, 'pitch': 0,
                     'zoom': 6.35, 'isSplit': False},
        'mapStyle': {'styleType': 'dark-matter', 'topLayerGroups': {},
                     'visibleLayerGroups': {'label': True, 'road': True, 'border': True, 'building': True,
                                            'water': True, 'land': True},
                     'threeDBuildingColor': [9, 17, 25], 'mapStyles': {}},
    }}

out = {
    'version': 'v1',
    'info': {'app': 'kepler.gl', 'created_at': 'Mon Nov 16 2026 16:42:10 GMT-0800 (Pacific Standard Time)',
             'title': 'NorCal seismic network — Q4 2026 ops review',
             'description': 'Catalogue M2.8+ since 1989 vs. station health and open field dispatches.'},
    'datasets': [
        dataset('earthquakes', 'NCSN catalogue 1967–2011', [23, 184, 190], eq_fields, eq_rows),
        dataset('stations', 'Station inventory (Nov 2026)', [221, 178, 124], st_fields, stations),
        dataset('field_tickets', 'Field service tickets', [136, 87, 44], tk_fields, tickets),
    ],
    'config': config,
}
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'maps', 'norcal-seismic-ops.json') if os.path.isdir(os.path.join(OUT, 'maps'))
          else os.path.join(OUT, 'norcal-seismic-ops.json'), 'w') as f:
    json.dump(out, f, separators=(',', ':'))
print('earthquakes', len(eq_rows), 'stations', len(stations), 'tickets', len(tickets))
