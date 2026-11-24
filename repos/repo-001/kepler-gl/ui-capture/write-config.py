#!/usr/bin/env python3
"""Write the demo app's runtime config.json (read by src/utils/runtime-config.js)."""
import json, os, sys
OUT = sys.argv[1]
styles = [
    ('dark-matter', 'DarkMatter'), ('positron', 'Positron'), ('voyager', 'Voyager')]
cfg = {
    'pageTitle': 'kepler.gl',
    'credentials': {'MapboxAccessToken': 'pk.placeholder-offline-token'},
    'mapUrl': '/maps/norcal-seismic-ops.json',
    'mapConfigUrl': '/samples/samples.json',
    'applicationConfig': {'customIconUrl': '/vendor/custom-icons.json'},
    'mapStylesReplaceDefault': True,
    'mapStyles': [{'id': i, 'label': l, 'url': f'/basemaps/{i}.json', 'icon': f'/basemaps/{i}.svg'}
                  for i, l in styles],
}
json.dump(cfg, open(os.path.join(OUT, 'config.json'), 'w'), indent=1)
