import { Jimp } from 'jimp';
const D = process.argv[2];
const diff = (a, b) => { let s = 0; const A = a.bitmap.data, B = b.bitmap.data; for (let i = 0; i < A.length; i += 4) s += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]); return (s / (A.length / 4) / 3).toFixed(1); };
const parent = await Jimp.read(`${D}/Norder3/Dir0/Npix357.jpg`);
const quads = { TL: [0, 0], TR: [256, 0], BL: [0, 256], BR: [256, 256] };
for (let i = 0; i < 4; i++) {
  const c = (await Jimp.read(`${D}/Norder4/Dir0/Npix${1428 + i}.jpg`)).resize({ w: 256, h: 256 });
  console.log('child', i, Object.entries(quads).map(([k, [x, y]]) => k + '=' + diff(parent.clone().crop({ x, y, w: 256, h: 256 }), c)).join(' '));
}
const all = await Jimp.read(`${D}/Norder3/Allsky.jpg`);
const n = 357, sub = all.clone().crop({ x: (n % 27) * 64, y: Math.floor(n / 27) * 64, w: 64, h: 64 });
console.log('allsky357 vs tile', diff(sub, parent.clone().resize({ w: 64, h: 64 })), 'vs flipped', diff(sub, parent.clone().resize({ w: 64, h: 64 }).flip({ horizontal: false, vertical: true })));
