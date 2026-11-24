// Fills gaps in the local HiPS samples so the HiPS servers never answer 404.
// The repo's sample HiPS (examples/data/hips) only contain a few deep tiles plus the
// Norder3 Allsky image. A missing tile is rebuilt from real data: the nearest ancestor
// tile on disk, or the Allsky mosaic, cropped to the right sub-square and resampled to
// 512x512 (like a HiPS client zooming into a lower order). Results are cached in memory.
//
// HiPS sub-tile layout (verified against real Norder3 -> Norder4 DSS2 tiles):
//   child index i = 4*parent + i  ->  x offset bit = i >> 1, y offset bit (downwards) = i & 1
//   Allsky (Norder3): 64px cells, 27 per row, cell n at ((n % 27) * 64, floor(n / 27) * 64)
import fs from 'node:fs';
import path from 'node:path';
import { Jimp } from 'jimp';

const TILE = 512;
const ALLSKY_ORDER = 3;
const imgCache = new Map();   // decoded source images (tiles, Allsky)
const outCache = new Map();   // encoded generated tiles
const propsCache = new Map();

const tilePath = (dir, order, npix, ext) =>
    path.join(dir, `Norder${order}`, `Dir${Math.floor(npix / 10000) * 10000}`, `Npix${npix}.${ext}`);

function props(dir) {
    if (!propsCache.has(dir)) {
        const p = {};
        try {
            for (const line of fs.readFileSync(path.join(dir, 'properties'), 'utf8').split('\n')) {
                const m = /^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/.exec(line);
                if (m) p[m[1]] = m[2];
            }
        } catch (e) { /* no properties */ }
        propsCache.set(dir, p);
    }
    return propsCache.get(dir);
}

async function readImage(file) {
    if (!imgCache.has(file)) {
        imgCache.set(file, fs.existsSync(file) ? Jimp.read(file).catch(() => null) : Promise.resolve(null));
    }
    return imgCache.get(file);
}

function allskyFile(dir, ext) {
    const f = path.join(dir, `Norder${ALLSKY_ORDER}`, `Allsky.${ext}`);
    return fs.existsSync(f) ? f : null;
}

// Sub-square (in source pixel units) of an ancestor tile covering a descendant `depth` levels below.
function subRect(npix, depth, size) {
    let x = 0, y = 0, s = size;
    for (let j = depth - 1; j >= 0; j--) {
        const i = (npix >> (2 * j)) & 3;
        s /= 2;
        x += (i >> 1) * s;
        y += (i & 1) * s;
    }
    return { x, y, w: s, h: s };
}

export async function buildTile(dir, order, npix, ext) {
    // 1. nearest ancestor tile on disk (order > 3 only, Allsky handles the rest)
    for (let o = order - 1, n = npix >> 2; o >= ALLSKY_ORDER; o--, n >>= 2) {
        const anc = await readImage(tilePath(dir, o, n, ext));
        if (anc) {
            const r = subRect(npix, order - o, anc.bitmap.width);
            return anc.clone().crop(r).resize({ w: TILE, h: TILE });
        }
    }
    // 2. Allsky mosaic
    const af = allskyFile(dir, ext);
    if (!af) return null;
    const all = await readImage(af);
    if (!all) return null;
    const cell = Math.floor(all.bitmap.width / 27);
    const cellAt = (n) => ({ x: (n % 27) * cell, y: Math.floor(n / 27) * cell, w: cell, h: cell });
    if (order >= ALLSKY_ORDER) {
        const n3 = npix >> (2 * (order - ALLSKY_ORDER));
        const c = cellAt(n3);
        const r = subRect(npix, order - ALLSKY_ORDER, cell);
        return all.clone().crop({ x: c.x + r.x, y: c.y + r.y, w: Math.max(1, r.w), h: Math.max(1, r.h) }).resize({ w: TILE, h: TILE });
    }
    // order < 3: assemble the 4^(3-order) Allsky cells that make up this tile
    const depth = ALLSKY_ORDER - order, k = 1 << depth;
    const mosaic = new Jimp({ width: k * cell, height: k * cell, color: 0x00000000 });
    for (let i = 0; i < k * k; i++) {
        const child = (npix << (2 * depth)) + i;
        const r = subRect(child, depth, k * cell);
        mosaic.composite(all.clone().crop(cellAt(child)), r.x, r.y);
    }
    return mosaic.resize({ w: TILE, h: TILE });
}

/**
 * Serve a HiPS file from `dir`, synthesising missing NorderK tiles. Returns true if handled.
 */
export async function serveHiPSFile(res, dir, rel) {
    const m = /^\/?Norder(\d+)\/Dir\d+\/Npix(\d+)\.(jpg|jpeg|png)$/i.exec(rel);
    const file = path.join(dir, rel);
    if (!m || fs.existsSync(file)) return false;
    const order = +m[1], npix = +m[2], ext = m[3].toLowerCase();
    const p = props(dir);
    const maxOrder = parseInt(p.hips_order || '29', 10);
    if (order > maxOrder || npix >= 12 * 4 ** order) return false;
    const key = file;
    if (!outCache.has(key)) {
        outCache.set(key, (async () => {
            const img = await buildTile(dir, order, npix, ext);
            if (!img) return null;
            const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
            return { mime, buf: await img.getBuffer(mime, ext === 'png' ? {} : { quality: 88 }) };
        })().catch((e) => { console.error('[tiles]', file, e.message); return null; }));
    }
    const t = await outCache.get(key);
    if (!t) return false;
    res.writeHead(200, { 'Content-Type': t.mime, 'Content-Length': t.buf.length, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
    res.end(t.buf);
    return true;
}
