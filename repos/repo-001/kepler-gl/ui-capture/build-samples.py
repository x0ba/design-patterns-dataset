#!/usr/bin/env python3
"""Local copy of the demo's "Try sample data" gallery (samples.json from
keplergl/kepler.gl-data). Rows whose data needs remote tile servers (PMTiles,
MVT, WMS) are dropped; thumbnails (S3-hosted, unreachable) are replaced by
small generated SVG cards. Usage: build-samples.py <out_dir>"""
import json, os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'raw', 'samples')
OUT = os.path.join(sys.argv[1], 'samples')
PREFIX = 'https://raw.githubusercontent.com/keplergl/kepler.gl-data/master/'
COLORS = ['#1f6f8b', '#99a8b2', '#e6d5b8', '#3d5a80', '#ee6c4d', '#293241', '#6a4c93', '#1982c4', '#8ac926']
rows = json.load(open(os.path.join(SRC, 'samples.json')))
kept = []
for i, s in enumerate(rows):
    d, c = s.get('dataUrl'), s.get('configUrl')
    if not (isinstance(d, str) and d.startswith(PREFIX) and isinstance(c, str)):
        continue
    for k in ('dataUrl', 'configUrl'):
        rel = s[k][len(PREFIX):]
        os.makedirs(os.path.dirname(os.path.join(OUT, rel)), exist_ok=True)
        shutil.copyfile(os.path.join(SRC, rel), os.path.join(OUT, rel))
        s[k] = '/samples/' + rel
    col = COLORS[i % len(COLORS)]
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160" viewBox="0 0 300 160">'
           f'<rect width="300" height="160" fill="#242730"/><circle cx="230" cy="60" r="70" fill="{col}" opacity="0.5"/>'
           f'<circle cx="80" cy="120" r="50" fill="{col}" opacity="0.3"/>'
           f'<text x="16" y="140" font-family="Helvetica,Arial" font-size="15" fill="#fff">{s["label"][:36].replace("&", "&amp;")}</text></svg>')
    open(os.path.join(OUT, s['id'] + '.svg'), 'w').write(svg)
    s['imageUrl'] = f'/samples/{s["id"]}.svg'
    kept.append(s)
json.dump(kept, open(os.path.join(OUT, 'samples.json'), 'w'), indent=1)
print('samples', len(kept))
