#!/usr/bin/env python3
"""Build offline stand-ins for kepler.gl's default CARTO basemaps.

The real DarkMatter / Positron / Voyager styles live on basemaps.cartocdn.com,
which is unreachable at runtime. This writes local MapLibre styles with the
same ids/labels, using Natural Earth 10m GeoJSON (downloaded from GitHub into
.ui-capture/raw/ne) filtered to North America, and OpenMapTiles glyph PBFs.

Usage: python3 build-basemap.py <out_dir>
"""
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
OUT = sys.argv[1]
BM = os.path.join(OUT, 'basemaps')
BBOX = (-172.0, 14.0, -50.0, 72.0)  # North America


def bbox_of(coords):
    xs, ys = [], []

    def walk(c):
        if not c:
            return
        if isinstance(c[0], (int, float)):
            xs.append(c[0]); ys.append(c[1])
        else:
            for cc in c:
                walk(cc)
    walk(coords)
    if not xs:
        return (999, 999, 999, 999)
    return min(xs), min(ys), max(xs), max(ys)


def intersects(b):
    return not (b[2] < BBOX[0] or b[0] > BBOX[2] or b[3] < BBOX[1] or b[1] > BBOX[3])


def rnd(c):
    if c and isinstance(c[0], (int, float)):
        return [round(c[0], 4), round(c[1], 4)]
    return [rnd(cc) for cc in c]


def load(name, keep_props=(), pred=None):
    with open(os.path.join(RAW, 'ne', name + '.geojson')) as f:
        fc = json.load(f)
    feats = []
    for ft in fc['features']:
        g = ft.get('geometry')
        if not g:
            continue
        if not intersects(bbox_of(g['coordinates'])):
            continue
        p = ft.get('properties') or {}
        if pred and not pred(p):
            continue
        feats.append({'type': 'Feature',
                      'properties': {k: p.get(k) for k in keep_props},
                      'geometry': {'type': g['type'], 'coordinates': rnd(g['coordinates'])}})
    return {'type': 'FeatureCollection', 'features': feats}


def main():
    os.makedirs(os.path.join(BM, 'data'), exist_ok=True)
    layers = {
        'land': load('ne_10m_land'),
        'lakes': load('ne_10m_lakes', ('name', 'scalerank')),
        'rivers': load('ne_10m_rivers_lake_centerlines', ('name', 'scalerank')),
        'urban': load('ne_10m_urban_areas'),
        'states': load('ne_10m_admin_1_states_provinces_lines'),
        'countries': load('ne_10m_admin_0_boundary_lines_land'),
        'roads': load('ne_10m_roads', ('type', 'scalerank', 'name'),
                      pred=lambda p: p.get('type') not in ('Ferry Route',)),
        'places': load('ne_10m_populated_places_simple',
                       ('name', 'scalerank', 'pop_max', 'adm0cap', 'featurecla')),
    }
    for k, v in layers.items():
        with open(os.path.join(BM, 'data', k + '.geojson'), 'w') as f:
            json.dump(v, f, separators=(',', ':'))
        print(k, len(v['features']))

    fonts_dst = os.path.join(BM, 'fonts')
    if os.path.exists(fonts_dst):
        shutil.rmtree(fonts_dst)
    shutil.copytree(os.path.join(RAW, 'fonts'), fonts_dst)

    palettes = {
        'dark-matter': dict(water='#0e0e10', land='#262626', urban='#2f2f2f', lake='#0e0e10',
                            river='#1b1b1d', road='#3b3b3b', road_major='#4a4a4a',
                            state='#4b4b4b', country='#6a6a6a', label='#8d8d8d',
                            label_major='#b3b3b3', halo='#111111'),
        'positron': dict(water='#d4dadc', land='#fafaf8', urban='#efefec', lake='#d4dadc',
                         river='#d4dadc', road='#e6e6e3', road_major='#dcdcd8',
                         state='#cfcfcf', country='#a8a8a8', label='#8a8a8a',
                         label_major='#5f5f5f', halo='#ffffff'),
        'voyager': dict(water='#a9d4e5', land='#f4f1ea', urban='#ebe6dc', lake='#a9d4e5',
                        river='#a9d4e5', road='#f6dca5', road_major='#f2c27a',
                        state='#d6c9de', country='#b8a7c4', label='#6e6e6e',
                        label_major='#333333', halo='#ffffff'),
    }
    for sid, c in palettes.items():
        def src(name):
            # Inline data: MapLibre fetches GeoJSON URLs from a web worker, where
            # root-relative paths don't resolve; inlining keeps the style origin-agnostic.
            return {'type': 'geojson', 'data': layers[name], 'tolerance': 0.5}
        style = {
            'version': 8,
            'name': sid,
            'glyphs': '/basemaps/fonts/{fontstack}/{range}.pbf',
            'sources': {k: src(k) for k in layers},
            'layers': [
                {'id': 'background', 'type': 'background', 'paint': {'background-color': c['water']}},
                {'id': 'landcover', 'type': 'fill', 'source': 'land', 'paint': {'fill-color': c['land']}},
                {'id': 'landcover_urban', 'type': 'fill', 'source': 'urban', 'minzoom': 5,
                 'paint': {'fill-color': c['urban']}},
                {'id': 'water_lakes', 'type': 'fill', 'source': 'lakes', 'paint': {'fill-color': c['lake']}},
                {'id': 'waterway_rivers', 'type': 'line', 'source': 'rivers',
                 'paint': {'line-color': c['river'],
                           'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.4, 10, 2]}},
                {'id': 'boundary_state', 'type': 'line', 'source': 'states',
                 'paint': {'line-color': c['state'], 'line-dasharray': [3, 2],
                           'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 10, 1.4]}},
                {'id': 'boundary_country', 'type': 'line', 'source': 'countries',
                 'paint': {'line-color': c['country'],
                           'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 10, 2]}},
                {'id': 'road_minor', 'type': 'line', 'source': 'roads', 'minzoom': 5,
                 'filter': ['!=', ['get', 'type'], 'Major Highway'],
                 'paint': {'line-color': c['road'],
                           'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 12, 2.5]}},
                {'id': 'road_major', 'type': 'line', 'source': 'roads', 'minzoom': 3,
                 'filter': ['==', ['get', 'type'], 'Major Highway'],
                 'paint': {'line-color': c['road_major'],
                           'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 12, 4]}},
                {'id': 'place_label_city', 'type': 'symbol', 'source': 'places',
                 'filter': ['<=', ['get', 'scalerank'], ['step', ['zoom'], 2, 4, 4, 6, 7, 8, 10]],
                 'layout': {'text-field': ['get', 'name'],
                            'text-font': ['Open Sans Regular'],
                            'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 10, 14],
                            'text-padding': 4},
                 'paint': {'text-color': ['case', ['<=', ['get', 'scalerank'], 3],
                                          c['label_major'], c['label']],
                           'text-halo-color': c['halo'], 'text-halo-width': 1.2}},
            ],
        }
        with open(os.path.join(BM, f'{sid}.json'), 'w') as f:
            json.dump(style, f, separators=(',', ':'))
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">'
               f'<rect width="64" height="64" fill="{c["water"]}"/>'
               f'<path d="M0 10 C18 6 30 18 40 14 S60 8 64 12 V64 H0 Z" fill="{c["land"]}"/>'
               f'<path d="M6 60 L28 30 L58 22" stroke="{c["road_major"]}" stroke-width="3" fill="none"/>'
               f'<path d="M0 44 L64 38" stroke="{c["state"]}" stroke-width="1" stroke-dasharray="3 2"/>'
               f'<ellipse cx="44" cy="44" rx="8" ry="5" fill="{c["lake"]}"/></svg>')
        with open(os.path.join(BM, f'{sid}.svg'), 'w') as f:
            f.write(svg)


if __name__ == '__main__':
    main()
