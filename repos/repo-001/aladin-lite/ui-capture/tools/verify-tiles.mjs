// Compares tiles rebuilt by stub/tiles.mjs with real tiles of the same index (mean abs diff per channel, 0-255)
import { Jimp } from 'jimp';
import { buildTile } from '../stub/tiles.mjs';
const D = new URL('../out/hips/DSS2_color', import.meta.url).pathname;
const diff = (a, b) => { let s = 0; const A = a.bitmap.data, B = b.bitmap.data; for (let i = 0; i < A.length; i += 4) s += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]); return (s / (A.length / 4) / 3).toFixed(1); };
const cases = [[0, 5], [1, 22], [1, 23], [2, 89], [2, 94], [3, 357], [4, 1430], [5, 5719], [5, 6046]];
for (const [o, n] of cases) {
  const real = await Jimp.read(`${D}/Norder${o}/Dir0/Npix${n}.jpg`);
  // hide the real file from the builder by asking for its own index (builder only reads ancestors / Allsky)
  const built = await buildTile(D, o, n, 'jpg');
  const r = real.clone().flip({ horizontal: false, vertical: true });
  console.log(`Norder${o}/Npix${n}: diff=${diff(built, real)} (vs vertically flipped ${diff(built, r)})`);
}
