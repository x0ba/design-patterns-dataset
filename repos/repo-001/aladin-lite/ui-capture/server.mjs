// Local server for the Aladin Lite UI capture.
// - serves the static app from ./out (index.html, published aladin.js, local HiPS, VOTables)
// - answers every outside service the browser would call (rewritten to /__ext/<host>/<path>
//   by out/ext-redirect.js) with local, realistic responses.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HIPS_REGISTRY, LOCAL_HIPS } from './stub/hips-registry.mjs';
import { OBJECTS } from './stub/objects.mjs';
import { coneVOTable, simbadConeVOTable } from './stub/catalogs.mjs';
import { serveHiPSFile } from './stub/tiles.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out');
const PORT = parseInt(process.env.PORT || '4483', 10);
const VERBOSE = !!process.env.STUB_VERBOSE;

const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.fits': 'application/fits',
    '.xml': 'text/xml', '.vot': 'text/xml', '.wasm': 'application/wasm', '.txt': 'text/plain',
};

function send(res, status, body, type = 'text/plain; charset=utf-8', extra = {}) {
    res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache', ...extra });
    res.end(body);
}

function serveFile(res, file) {
    fs.stat(file, (err, st) => {
        if (err || !st.isFile()) return send(res, 404, 'Not found');
        res.writeHead(200, {
            'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
            'Content-Length': st.size, 'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(file).pipe(res);
    });
}

// ---------------------------------------------------------------- MocServer
function wildcardToRegex(p) {
    return new RegExp('^' + p.split('*').map(s => s.replace(/[.+?^${}()|[\]\\/]/g, '\\$&')).join('.*') + '$', 'i');
}
function mocServer(q, res) {
    let recs = HIPS_REGISTRY;
    const expr = q.get('expr') || '';
    if (/dataproduct_type=catalog/.test(expr)) {
        recs = recs.filter(r => r.dataproduct_type === 'catalog');
    } else if (expr) {
        recs = recs.filter(r => r.dataproduct_type !== 'catalog');
    }
    const idExpr = /ID=([^&|]+)/.exec(expr);
    if (idExpr) {
        const ids = idExpr[1].split(',');
        recs = recs.filter(r => ids.some(id => wildcardToRegex(id).test(r.ID)));
    }
    const id = q.get('ID');
    if (id) {
        const re = wildcardToRegex(id);
        recs = recs.filter(r => re.test(r.ID));
    }
    const stc = q.get('stc');
    if (stc) {
        // keep all-sky surveys + the pointed ones whose initial position is inside the polygon bbox
        const nums = stc.replace(/^Polygon\s*/i, '').trim().split(/\s+/).map(Number);
        const ras = nums.filter((_, i) => i % 2 === 0), decs = nums.filter((_, i) => i % 2 === 1);
        const [dmin, dmax] = [Math.min(...decs) - 1, Math.max(...decs) + 1];
        const [rmin, rmax] = [Math.min(...ras) - 1, Math.max(...ras) + 1];
        recs = recs.filter(r => !r.moc_sky_fraction || +r.moc_sky_fraction > 0.2 ||
            (+r.hips_initial_dec >= dmin && +r.hips_initial_dec <= dmax && +r.hips_initial_ra >= rmin && +r.hips_initial_ra <= rmax));
    }
    const fields = q.get('fields');
    if (fields) {
        const fl = fields.split(',');
        recs = recs.map(r => Object.fromEntries(fl.filter(f => f in r).map(f => [f, r[f]])));
    }
    if ((q.get('fmt') || 'json') === 'json') return send(res, 200, JSON.stringify(recs), 'application/json');
    return send(res, 200, recs.map(r => Object.entries(r).map(([k, v]) => `${k.padEnd(20)} = ${v}`).join('\n')).join('\n\n'));
}

// ---------------------------------------------------------------- name resolution
const norm = s => s.toLowerCase().replace(/[\s_-]+/g, '');
function findObject(name) {
    const n = norm(decodeURIComponent(name));
    return OBJECTS.find(o => norm(o.name) === n || (o.aliases || []).some(a => norm(a) === n));
}
function sexa(ra, dec) {
    const h = ra / 15, hh = Math.floor(h), mm = Math.floor((h - hh) * 60), ss = ((h - hh) * 60 - mm) * 60;
    const sg = dec < 0 ? '-' : '+', ad = Math.abs(dec), dd = Math.floor(ad), dm = Math.floor((ad - dd) * 60), ds = ((ad - dd) * 60 - dm) * 60;
    const p = (v, w, d = 0) => v.toFixed(d).padStart(w, '0');
    return `${p(hh, 2)} ${p(mm, 2)} ${p(ss, 5, 2)} ${sg}${p(dd, 2)} ${p(dm, 2)} ${p(ds, 4, 1)}`;
}
function sesame(name, res) {
    const o = findObject(name);
    const q = decodeURIComponent(name);
    if (!o) {
        return send(res, 200, `# ${q}\t#Q${Date.now() % 100000}\n#=S=Simbad (CDS, via client/server):  *** Nothing found ***\n#=N=NED:  *** Nothing found ***\n#=V=VizieR (CDS):  *** Nothing found ***\n`);
    }
    const txt = `# ${q}\t#Q${Date.now() % 100000}\n#=S=Simbad (via url):    1\n%@ ${o.ra.toFixed(7)} ${o.dec.toFixed(7)}\n%I.0 ${o.name}\n%C.0 ${o.otype}\n%J ${o.ra.toFixed(7)} ${o.dec >= 0 ? '+' : ''}${o.dec.toFixed(7)} = ${sexa(o.ra, o.dec)}\n%J.E [ 0.10 0.10 0] A 2020yCat.1350....0G\n%T ${o.otype}\n%I.0 ${o.name}\n\n#====Done (${new Date().toUTCString()})====\n`;
    send(res, 200, txt);
}
function angDist(ra1, de1, ra2, de2) {
    const r = Math.PI / 180;
    const c = Math.sin(de1 * r) * Math.sin(de2 * r) + Math.cos(de1 * r) * Math.cos(de2 * r) * Math.cos((ra1 - ra2) * r);
    return Math.acos(Math.min(1, Math.max(-1, c))) / r;
}
function parseSexa(s) {
    const m = s.trim().split(/\s+/).map(Number);
    if (m.length >= 6) {
        const ra = (m[0] + m[1] / 60 + m[2] / 3600) * 15;
        const sign = s.trim().split(/\s+/)[3].startsWith('-') ? -1 : 1;
        const dec = sign * (Math.abs(m[3]) + m[4] / 60 + m[5] / 3600);
        return [ra, dec];
    }
    if (m.length >= 2) return [m[0], m[1]];
    return [0, 0];
}
function simbadQuick(q, res) {
    const [ra, dec] = parseSexa((q.get('Ident') || '').replace(/\//g, ' '));
    const sr = parseFloat(q.get('SR') || '0.01');
    let best = null, bd = 1e9;
    for (const o of OBJECTS) {
        const d = angDist(ra, dec, o.ra, o.dec);
        if (d < bd) { bd = d; best = o; }
    }
    if (!best || bd > Math.max(sr, 0.05)) return send(res, 200, '');
    send(res, 200, `${sexa(best.ra, best.dec)}/${best.name}(${best.name},${best.otype})\n`);
}

// ---------------------------------------------------------------- ext router
const PREVIEWS = {
    'P_DSS2_color.jpg': 'hips/DSS2_color/preview.jpg',
    'P_PanSTARRS_DR1_color-z-zg-g.jpg': 'hips/PanSTARRS_DR1_color/preview.jpg',
};

function handleExt(host, p, q, res) {
    if (/\/MocServer\/query/.test(p)) return mocServer(q, res);
    if (/nph-sesame/.test(p)) {
        const name = p.split('/').pop() === 'SVNI' || p.endsWith('SVNI') ? [...q.keys()][0] || '' : p.split('/').pop();
        return sesame(name, res);
    }
    if (/simbad-quick\.py/.test(p)) return simbadQuick(q, res);
    if (/survey-previews\//.test(p)) {
        const f = PREVIEWS[p.split('/').pop()];
        if (f) return serveFile(res, path.join(OUT, f));
        return send(res, 404, 'Not found');
    }
    if (/\/AladinLite\/logos\//.test(p)) return serveFile(res, path.join(OUT, 'img', p.split('/').pop()));
    // catalog services
    if (host.startsWith('simbad') && /\/cone/.test(p)) return send(res, 200, simbadConeVOTable(q), 'text/xml');
    if (/viz-bin\/(votable|conesearch)|\/cone\b|\/conesearch/.test(p)) return send(res, 200, coneVOTable(host, p, q), 'text/xml');
    if (/JSONProxy/.test(p)) {
        const target = q.get('url');
        if (target) {
            const u = new URL(target);
            return handleExt(u.host, u.pathname, u.searchParams, res);
        }
    }
    // HiPS mirrors served from local directories
    for (const [prefix, dir] of LOCAL_HIPS) {
        if (p === prefix || p.startsWith(prefix + '/')) {
            const rest = p.slice(prefix.length) || '/properties';
            return serveLocalHiPS(res, path.join(OUT, 'hips', dir), rest);
        }
    }
    if (VERBOSE) console.error('[stub 404]', host + p + (q.toString() ? '?' + q : ''));
    return send(res, 404, 'Not found (offline stub)');
}

// local HiPS: real files first, missing tiles rebuilt from ancestors / Allsky (stub/tiles.mjs)
function serveLocalHiPS(res, dir, rel) {
    serveHiPSFile(res, dir, rel).then((handled) => { if (!handled) serveFile(res, path.join(dir, rel)); })
        .catch(() => serveFile(res, path.join(dir, rel)));
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let p = decodeURIComponent(url.pathname);
    if (p.startsWith('/__ext/')) {
        const rest = url.pathname.slice('/__ext/'.length);
        const i = rest.indexOf('/');
        const host = i < 0 ? rest : rest.slice(0, i);
        const hp = i < 0 ? '/' : decodeURIComponent(rest.slice(i));
        return handleExt(host, hp, url.searchParams, res);
    }
    if (p.includes('..')) return send(res, 400, 'bad path');
    const hm = /^\/hips\/([^/]+)(\/.*)$/.exec(p);
    if (hm) return serveLocalHiPS(res, path.join(OUT, 'hips', hm[1]), hm[2]);
    let file = path.join(OUT, p);
    fs.stat(file, (err, st) => {
        if (!err && st.isDirectory()) file = path.join(file, 'index.html');
        else if (err && !path.extname(p)) file = path.join(OUT, 'index.html');
        serveFile(res, file);
    });
});
server.listen(PORT, () => console.log(`Aladin Lite UI on http://localhost:${PORT}/`));
// test helper: exit automatically after STUB_TTL seconds (unset in start.sh)
if (process.env.STUB_TTL) setTimeout(() => process.exit(0), 1000 * +process.env.STUB_TTL).unref();
