# Sandbox blocks writing files named .gitmodules; pre-populate yarn's cache
# for a tarball by extracting it without that file.
# usage: python3 fix-yarn-cache-gitmodules.py <name> <version> <sha1> <sha512-integrity>
import json, sys, os, subprocess, urllib.request, base64, hashlib
name, ver, sha1, integ = sys.argv[1:5]
cache = os.environ['YARN_CACHE_FOLDER'] + '/v6'
d = f'{cache}/npm-{name}-{ver}-{sha1}-integrity/node_modules/{name}'
os.makedirs(d, exist_ok=True)
url = f'https://registry.yarnpkg.com/{name}/-/{name}-{ver}.tgz'
subprocess.check_call(['curl', '-sS', '-o', d + '/.yarn-tarball.tgz', url])
subprocess.check_call(['tar', '-xzf', d + '/.yarn-tarball.tgz', '-C', d, '--strip-components=1', '--exclude', 'package/.gitmodules'])
s1 = base64.b64encode(bytes.fromhex(sha1)).decode()
r = {'resolved': f'{url}#{sha1}', 'type': 'tarball', 'reference': url, 'hash': sha1, 'integrity': integ,
     'registry': 'npm', 'packageName': name, 'cacheIntegrity': f'{integ} sha1-{s1}'}
m = json.load(open(d + '/package.json'))
m.update({'_registry': 'npm', '_loc': d + '/package.json', '_remote': r, '_uid': ''})
json.dump({'manifest': m, 'artifacts': [], 'remote': r, 'registry': 'npm', 'hash': sha1}, open(d + '/.yarn-metadata.json', 'w'))
