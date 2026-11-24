// Generates abstract PNG "posters" (stand-ins for AniList cover images, which can't be downloaded offline).
import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i]! - v) * t));

export function makePoster(palette: [string, string, string], seedId: number, w = 460, h = 650): Buffer {
  const [c1, c2, c3] = palette.map(hex);
  let s = seedId >>> 0;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const circles = Array.from({ length: 5 }, () => ({ x: rnd() * w, y: rnd() * h * 0.8, r: 40 + rnd() * 140, a: 0.18 + rnd() * 0.3 }));
  const horizon = h * (0.58 + rnd() * 0.15);
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      let col = mix(c1!, c2!, y / h);
      for (const c of circles) {
        const d = Math.hypot(x - c.x, y - c.y);
        if (d < c.r) col = mix(col, [255, 255, 255], c.a * (1 - d / c.r));
      }
      const wave = horizon + Math.sin(x / 37 + seedId) * 14;
      if (y > wave) col = mix(col, c3!, Math.min(1, 0.55 + (y - wave) / h));
      // vignette
      const v = Math.hypot((x - w / 2) / w, (y - h / 2) / h);
      col = mix(col, [0, 0, 0], Math.max(0, v - 0.35) * 0.9);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = col[0]!;
      raw[o + 1] = col[1]!;
      raw[o + 2] = col[2]!;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
