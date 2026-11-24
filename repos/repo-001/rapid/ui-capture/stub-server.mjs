// Local server for the Rapid UI capture:
//  - serves the production build from .ui-capture/site
//  - stubs the OpenStreetMap API v0.6 (map data, users, changesets, notes, uploads) from data/world.json
//  - serves locally rendered aerial-style imagery tiles at /tiles/{z}/{x}/{y}.png
//  - serves small stand-ins for third-party scripts/assets the page would fetch (browser-update.org, avatar)
// usage: PORT=4487 node .ui-capture/stub-server.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { TileRenderer, encodePNG } from './tiles.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(here, 'site');
const PORT = Number(process.env.PORT || 4487);
const world = JSON.parse(fs.readFileSync(path.join(here, 'data/world.json'), 'utf8'));
const tiles = new TileRenderer(world);

// ---------- indexes ----------
const byKey = new Map();           // 'node/123' -> entity
const nodeWays = new Map();        // nodeId -> [wayId]
const memberRels = new Map();      // 'way/1' -> [relId]
for (const e of world.entities) {
  byKey.set(`${e.type}/${e.id}`, e);
  if (e.type === 'way') for (const n of e.nodes) { if (!nodeWays.has(n)) nodeWays.set(n, []); nodeWays.get(n).push(e.id); }
  if (e.type === 'relation') for (const m of e.members) { const k = `${m.type}/${m.ref}`; if (!memberRels.has(k)) memberRels.set(k, []); memberRels.get(k).push(e.id); }
}
const usersById = new Map(world.users.map(u => [String(u.id), u]));
const nodes = world.entities.filter(e => e.type === 'node');

function userJSON(u, full) {
  const out = {
    id: u.id, display_name: u.display_name, account_created: u.account_created,
    description: u.description || '', contributor_terms: { agreed: true },
    img: { href: `/stub/avatar/${u.id}.png` }, roles: [],
    changesets: { count: u.changesets }, traces: { count: u.traces || 0 },
    blocks: { received: { count: 0, active: 0 } }
  };
  if (full) {
    Object.assign(out, {
      contributor_terms: { agreed: true, pd: false },
      home: u.home, languages: ['en-US', 'en'],
      messages: { received: { count: 214, unread: 3 }, sent: { count: 87 } }
    });
  }
  return out;
}

function osmJSON(elements) {
  return { version: '0.6', generator: 'openstreetmap-cgimap 2.0.1 (local stub)', copyright: 'OpenStreetMap and contributors', attribution: 'http://www.openstreetmap.org/copyright', license: 'http://opendatacommons.org/licenses/odbl/1-0/', elements };
}

function mapQuery(minlon, minlat, maxlon, maxlat) {
  const out = new Map();
  const add = e => out.set(`${e.type}/${e.id}`, e);
  const wayIds = new Set();
  for (const n of nodes) {
    if (n.lon >= minlon && n.lon <= maxlon && n.lat >= minlat && n.lat <= maxlat) {
      add(n);
      for (const w of nodeWays.get(n.id) || []) wayIds.add(w);
    }
  }
  for (const wid of wayIds) {
    const w = byKey.get(`way/${wid}`); add(w);
    for (const n of w.nodes) add(byKey.get(`node/${n}`));
  }
  const rels = new Set();
  for (const k of out.keys()) for (const r of memberRels.get(k) || []) rels.add(r);
  for (const r of rels) add(byKey.get(`relation/${r}`));
  // order: nodes, ways, relations
  const order = { node: 0, way: 1, relation: 2 };
  return [...out.values()].sort((a, b) => order[a.type] - order[b.type]);
}

function full(type, id) {
  const e = byKey.get(`${type}/${id}`);
  if (!e) return null;
  const out = new Map([[`${type}/${id}`, e]]);
  if (type === 'way') for (const n of e.nodes) out.set(`node/${n}`, byKey.get(`node/${n}`));
  if (type === 'relation') for (const m of e.members) {
    const me = byKey.get(`${m.type}/${m.ref}`); if (!me) continue;
    out.set(`${m.type}/${m.ref}`, me);
    if (m.type === 'way') for (const n of me.nodes) out.set(`node/${n}`, byKey.get(`node/${n}`));
  }
  const order = { node: 0, way: 1, relation: 2 };
  return [...out.values()].sort((a, b) => order[a.type] - order[b.type]);
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const noteDate = iso => iso.replace('T', ' ').replace('Z', ' UTC');
function noteXML(n, origin) {
  const comments = n.comments.map(c => `<comment><date>${noteDate(c.date)}</date>${c.uid ? `<uid>${c.uid}</uid><user>${esc(c.user)}</user><user_url>${origin}/user/${encodeURIComponent(c.user)}</user_url>` : ''}<action>${c.action}</action><text>${esc(c.text)}</text><html>&lt;p&gt;${esc(esc(c.text))}&lt;/p&gt;</html></comment>`).join('');
  return `<note lon="${n.lon}" lat="${n.lat}"><id>${n.id}</id><url>${origin}/api/0.6/notes/${n.id}</url>` +
    (n.status === 'open' ? `<comment_url>${origin}/api/0.6/notes/${n.id}/comment</comment_url><close_url>${origin}/api/0.6/notes/${n.id}/close</close_url>` : `<reopen_url>${origin}/api/0.6/notes/${n.id}/reopen</reopen_url>`) +
    `<date_created>${noteDate(n.created)}</date_created><status>${n.status}</status>${n.closed ? `<date_closed>${noteDate(n.closed)}</date_closed>` : ''}<comments>${comments}</comments></note>`;
}
const xmlDoc = inner => `<?xml version="1.0" encoding="UTF-8"?>\n<osm version="0.6" generator="OpenStreetMap server (local stub)" copyright="OpenStreetMap and contributors" attribution="http://www.openstreetmap.org/copyright" license="http://opendatacommons.org/licenses/odbl/1-0/">${inner}</osm>`;

// ---------- avatars (simple generated identicons) ----------
function avatar(id) {
  const s = String(id); let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360, W = 100;
  const col = (l) => { // hsl -> rgb
    const a = 0.55 * Math.min(l, 1 - l), f = n => { const k = (n + hue / 30) % 12; return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
    return [f(0), f(8), f(4)];
  };
  const bg = col(0.92), fg = col(0.45), buf = new Float32Array(W * W * 3);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const ci = Math.floor(i / 20), cj = Math.floor(j / 20);
    const mi = ci < 3 ? ci : 4 - ci;
    const on = i >= 10 && i < 90 && j >= 10 && j < 90 && ((h >>> ((mi * 5 + cj) % 30)) & 1);
    const c = on ? fg : bg; const k = (j * W + i) * 3; buf[k] = c[0]; buf[k + 1] = c[1]; buf[k + 2] = c[2];
  }
  return encodePNG(buf, W, W);
}

// ---------- uploads (so "Save" round-trips locally) ----------
let nextChangeset = Math.max(...world.changesets.map(c => c.id)) + 1;
let nextId = { node: 13100000000, way: 1450000000, relation: 19000000 };

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Cache-Control': 'no-cache', ...extra });
  res.end(data);
}

function readBody(req) {
  return new Promise(resolve => { const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); });
}

function serveStatic(req, res, pathname) {
  let p = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = path.join(SITE, p);
  if (!file.startsWith(SITE)) return send(res, 403, 'forbidden', 'text/plain');
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  } catch { file = path.join(SITE, 'index.html'); }
  if (!fs.existsSync(file)) file = path.join(SITE, 'index.html');
  const ext = path.extname(file);
  let body = fs.readFileSync(file);
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
  if (/gzip/.test(req.headers['accept-encoding'] || '') && body.length > 2048 && ['.js', '.json', '.css', '.svg', '.html'].includes(ext)) {
    body = zlib.gzipSync(body, { level: 4 }); headers['Content-Encoding'] = 'gzip';
  }
  res.writeHead(200, headers); res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname, q = url.searchParams, origin = url.origin;
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');

    // ----- imagery tiles -----
    let m = p.match(/^\/tiles\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) return send(res, 200, tiles.render(+m[1], +m[2], +m[3]), 'image/png', { 'Cache-Control': 'public, max-age=86400' });

    if ((m = p.match(/^\/stub\/avatar\/(\d+)\.png$/))) return send(res, 200, avatar(m[1]), 'image/png');
    if (p === '/stub/browser-update.js') return send(res, 200, '/* browser-update.org stand-in: browser is supported */', 'text/javascript');

    // ----- Esri ArcGIS (openstreetmap.maps.arcgis.com) dataset catalog + feature services -----
    if (/^\/stub\/arcgis\/sharing\/rest\/content\/groups\/[^/]+\/search$/.test(p)) {
      return send(res, 200, { total: world.esri.length, start: 1, num: 100, nextStart: -1, results: world.esri.map(d => ({
        id: d.id, owner: 'EsriCommunityMaps', title: d.title, snippet: d.snippet, type: 'Feature Service', typeKeywords: ['ArcGIS Server', 'Data', 'Feature Access', 'Service'],
        tags: d.tags, thumbnail: 'thumbnail/thumbnail.png', extent: d.extent, groupCategories: d.groupCategories, created: Date.parse(d.created), modified: Date.parse(d.modified),
        licenseInfo: '<div>This dataset is available for use in OpenStreetMap. See the <a href="https://wiki.openstreetmap.org/wiki/Esri/ArcGIS_Datasets#License">Esri/ArcGIS Datasets license</a>.</div>',
        url: `${origin}/stub/esri-fs/${d.key}/FeatureServer`, access: 'public', numViews: 1200 + d.features.length * 7
      })) });
    }
    if ((m = p.match(/^\/stub\/esri-fs\/([^/]+)\/FeatureServer\/layers$/))) {
      const d = world.esri.find(d => d.key === m[1]);
      if (!d) return send(res, 404, { error: { code: 404 } });
      return send(res, 200, { layers: [{ id: 0, name: d.title, type: 'Feature Layer', geometryType: d.geometryType, maxRecordCount: 2000, copyrightText: d.title, objectIdField: 'OBJECTID',
        fields: d.fields.map(([name, alias, type, editable]) => ({ name, alias, type, editable, nullable: true, length: 64 })) }] });
    }
    if ((m = p.match(/^\/stub\/esri-fs\/([^/]+)\/FeatureServer\/0\/query$/))) {
      const d = world.esri.find(d => d.key === m[1]);
      const [a, b, c, e] = (q.get('geometry') || '-180,-90,180,90').split(',').map(Number);
      const offset = Number(q.get('resultOffset') || 0);
      const inBox = ([x, y]) => x >= a && x <= c && y >= b && y <= e;
      const feats = (d?.features || []).filter(f => f.geometry.type === 'Point' ? inBox(f.geometry.coordinates) : f.geometry.coordinates.some(inBox)).slice(offset, offset + 2000);
      return send(res, 200, { type: 'FeatureCollection', features: feats, properties: { exceededTransferLimit: false } });
    }

    // ----- Overture STAC catalog: a valid catalog, but no PMTiles archives are available offline -----
    if (p === '/stub/overture/catalog.json') {
      return send(res, 200, { type: 'Catalog', id: 'overture', stac_version: '1.0.0', description: 'Overture Maps (local stub)', links: [{ rel: 'child', href: './2026-10-22.0/catalog.json', latest: true }] });
    }
    if ((m = p.match(/^\/stub\/overture\/([^/]+)\/catalog\.json$/))) {
      return send(res, 200, { type: 'Catalog', id: m[1], stac_version: '1.0.0', description: 'Overture release', links: [] });
    }

    // ----- taginfo / nominatim / wikidata -----
    if (p.startsWith('/stub/taginfo/')) {
      return send(res, 200, { url: req.url, data_until: '2026-11-16T00:00:00Z', page: 1, rp: 100, total: 0, data: [] });
    }
    if (p.startsWith('/stub/nominatim/search')) {
      const term = (q.get('q') || '').toLowerCase();
      const hits = world.entities.filter(e => e.tags?.name && e.tags.name.toLowerCase().includes(term) && e.type === 'node').slice(0, 10);
      return send(res, 200, hits.map((e, i) => ({ place_id: 300000000 + i, osm_type: e.type, osm_id: e.id, lat: String(e.lat), lon: String(e.lon), display_name: `${e.tags.name}, Three Rivers, St. Joseph County, Michigan, 49093, United States`, class: Object.keys(e.tags)[0], type: 'yes', importance: 0.3 })));
    }
    if (p.startsWith('/stub/nominatim/reverse')) {
      return send(res, 200, { place_id: 299114022, lat: q.get('lat'), lon: q.get('lon'), display_name: 'Three Rivers, St. Joseph County, Michigan, 49093, United States', address: { city: 'Three Rivers', county: 'St. Joseph County', state: 'Michigan', postcode: '49093', country: 'United States', country_code: 'us' } });
    }
    if (p.startsWith('/stub/wikidata/')) return send(res, 200, { entities: {}, search: [], success: 1 });

    // ----- OSM API -----
    if (p === '/api/capabilities' || p === '/api/capabilities.json' || p === '/api/0.6/capabilities.json') {
      return send(res, 200, { version: '0.6', generator: 'local stub', api: { version: { minimum: '0.6', maximum: '0.6' }, area: { maximum: 0.25 }, note_area: { maximum: 25 }, tracepoints: { per_page: 5000 }, waynodes: { maximum: 2000 }, relationmembers: { maximum: 32000 }, changesets: { maximum_elements: 10000, default_query_limit: 100, maximum_query_limit: 100 }, notes: { default_query_limit: 100, maximum_query_limit: 10000 }, timeout: { seconds: 300 }, status: { database: 'online', api: 'online', gpx: 'online' } }, policy: { imagery: { blacklist: [{ regex: '.*\\.google(apis)?\\..*/(vt|kh)[\\?/].*([xyz]=.*){3}.*' }] } } });
    }
    if (p === '/api/0.6/map.json' || p === '/api/0.6/map') {
      const [a, b, c, d] = (q.get('bbox') || '').split(',').map(Number);
      return send(res, 200, osmJSON(mapQuery(a, b, c, d)));
    }
    if (p === '/api/0.6/user/details.json') return send(res, 200, { version: '0.6', user: userJSON(world.me, true) });
    if (p === '/api/0.6/user/details') return send(res, 200, xmlDoc(`<user id="${world.me.id}" display_name="${esc(world.me.display_name)}" account_created="${world.me.account_created}"><img href="/stub/avatar/${world.me.id}.png"/><changesets count="${world.me.changesets}"/><messages><received count="214" unread="3"/><sent count="87"/></messages></user>`), 'application/xml');
    if (p === '/api/0.6/user/preferences' || p === '/api/0.6/user/preferences.json') {
      return send(res, 200, xmlDoc('<preferences><preference k="gps.trace.visibility" v="identifiable"/><preference k="editor" v="rapid"/></preferences>'), 'application/xml');
    }
    if ((m = p.match(/^\/api\/0\.6\/user\/(\d+)\.json$/))) {
      const u = usersById.get(m[1]);
      return u ? send(res, 200, { version: '0.6', user: userJSON(u) }) : send(res, 404, 'Not found', 'text/plain');
    }
    if (p === '/api/0.6/users.json') {
      const ids = (q.get('users') || '').split(',');
      return send(res, 200, { version: '0.6', users: ids.map(id => usersById.get(id)).filter(Boolean).map(u => userJSON(u)) });
    }
    if (p === '/api/0.6/changesets.json') {
      const uid = Number(q.get('user'));
      const list = world.changesets.filter(c => !uid || c.uid === uid).slice(-100).reverse();
      return send(res, 200, { version: '0.6', changesets: list.map(c => ({ id: c.id, created_at: c.created_at, open: false, comments_count: 0, changes_count: c.changes_count, closed_at: c.closed_at, min_lat: 41.93, min_lon: -85.64, max_lat: 41.96, max_lon: -85.59, uid: c.uid, user: c.user, tags: { comment: c.comment, created_by: c.created_by, imagery_used: 'Custom', locale: 'en-US', host: 'https://rapideditor.org/edit' } })) });
    }
    if (p === '/api/0.6/notes' || p === '/api/0.6/notes.xml') {
      const [a, b, c, d] = (q.get('bbox') || '-180,-90,180,90').split(',').map(Number);
      const list = world.notes.filter(n => n.lon >= a && n.lon <= c && n.lat >= b && n.lat <= d);
      return send(res, 200, xmlDoc(list.map(n => noteXML(n, origin)).join('')), 'application/xml');
    }
    if ((m = p.match(/^\/api\/0\.6\/notes\/(\d+)$/))) {
      const n = world.notes.find(n => String(n.id) === m[1]);
      return n ? send(res, 200, xmlDoc(noteXML(n, origin)), 'application/xml') : send(res, 404, 'Not found', 'text/plain');
    }
    if ((m = p.match(/^\/api\/0\.6\/notes\/(\d+)\/(comment|close|reopen)/)) && req.method === 'POST') {
      const n = world.notes.find(n => String(n.id) === m[1]);
      if (!n) return send(res, 404, 'Not found', 'text/plain');
      const text = q.get('text') || '';
      const action = { comment: 'commented', close: 'closed', reopen: 'reopened' }[m[2]];
      n.comments.push({ date: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), uid: world.me.id, user: world.me.display_name, action, text });
      if (m[2] === 'close') { n.status = 'closed'; n.closed = new Date().toISOString(); }
      if (m[2] === 'reopen') { n.status = 'open'; n.closed = null; }
      return send(res, 200, xmlDoc(noteXML(n, origin)), 'application/xml');
    }
    if (p === '/api/0.6/notes' && req.method === 'POST') {
      const n = { id: 5100000 + Math.floor(Math.random() * 1000), lat: +q.get('lat'), lon: +q.get('lon'), status: 'open', created: new Date().toISOString(), closed: null, comments: [{ date: new Date().toISOString(), uid: world.me.id, user: world.me.display_name, action: 'opened', text: q.get('text') || '' }] };
      world.notes.push(n);
      return send(res, 200, xmlDoc(noteXML(n, origin)), 'application/xml');
    }
    if ((m = p.match(/^\/api\/0\.6\/(nodes|ways|relations)\.json$/))) {
      const type = m[1].slice(0, -1);
      const ids = (q.get(m[1]) || '').split(',');
      return send(res, 200, osmJSON(ids.map(id => byKey.get(`${type}/${id}`)).filter(Boolean)));
    }
    if ((m = p.match(/^\/api\/0\.6\/(node|way|relation)\/(\d+)\/relations\.json$/))) {
      return send(res, 200, osmJSON((memberRels.get(`${m[1]}/${m[2]}`) || []).map(r => byKey.get(`relation/${r}`))));
    }
    if ((m = p.match(/^\/api\/0\.6\/(node|way|relation)\/(\d+)(\/full)?\.json$/))) {
      const els = m[3] ? full(m[1], m[2]) : [byKey.get(`${m[1]}/${m[2]}`)].filter(Boolean);
      return els && els.length ? send(res, 200, osmJSON(els)) : send(res, 404, 'Not found', 'text/plain');
    }
    if ((m = p.match(/^\/api\/0\.6\/(node|way|relation)\/(\d+)\/(\d+)\.json$/))) {
      const e = byKey.get(`${m[1]}/${m[2]}`);
      return e ? send(res, 200, osmJSON([{ ...e, version: +m[3] }])) : send(res, 404, 'Not found', 'text/plain');
    }
    if (p === '/api/0.6/changeset/create' && req.method === 'PUT') {
      await readBody(req);
      return send(res, 200, String(nextChangeset++), 'text/plain');
    }
    if ((m = p.match(/^\/api\/0\.6\/changeset\/(\d+)\/upload$/)) && req.method === 'POST') {
      const body = await readBody(req);
      const results = [];
      const re = /<(create|modify|delete)[^>]*>([\s\S]*?)<\/\1>/g;
      let mm;
      while ((mm = re.exec(body))) {
        const action = mm[1];
        const ere = /<(node|way|relation)\s+([^>]*?)\/?>/g; let em;
        while ((em = ere.exec(mm[2]))) {
          const attrs = Object.fromEntries([...em[2].matchAll(/(\w+)="([^"]*)"/g)].map(a => [a[1], a[2]]));
          const type = em[1], id = attrs.id, ver = Number(attrs.version || 0);
          if (action === 'create') results.push(`<${type} old_id="${id}" new_id="${nextId[type]++}" new_version="1"/>`);
          else if (action === 'modify') results.push(`<${type} old_id="${id}" new_id="${id}" new_version="${ver + 1}"/>`);
          else results.push(`<${type} old_id="${id}"/>`);
        }
      }
      return send(res, 200, `<?xml version="1.0" encoding="UTF-8"?>\n<diffResult version="0.6" generator="local stub">${results.join('')}</diffResult>`, 'application/xml');
    }
    if ((m = p.match(/^\/api\/0\.6\/changeset\/(\d+)\/close$/))) { await readBody(req); return send(res, 200, '', 'text/plain'); }
    if ((m = p.match(/^\/api\/0\.6\/changeset\/(\d+)\.json$/))) {
      const c = world.changesets.find(c => String(c.id) === m[1]);
      return c ? send(res, 200, { version: '0.6', changeset: { id: c.id, created_at: c.created_at, closed_at: c.closed_at, open: false, user: c.user, uid: c.uid, tags: { comment: c.comment, created_by: c.created_by } } }) : send(res, 404, 'Not found', 'text/plain');
    }
    if (p.startsWith('/api/')) return send(res, 404, 'Not found', 'text/plain');

    return serveStatic(req, res, p);
  } catch (err) {
    console.error(req.method, req.url, err);
    return send(res, 500, String(err), 'text/plain');
  }
});

server.listen(PORT, () => console.log(`Rapid UI capture server on http://localhost:${PORT}/`));
