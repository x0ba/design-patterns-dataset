import * as THREE from 'three';
import { FEATURES } from '../data';
import { CAP_DEG, GLOBAL_W, POLAR_SIZE } from './shaders';
import type { GenCrater, GenMare, GenRequest } from './terrain.types';

/** Dark plains as ellipses (semi-axes in km, east–west × north–south). */
const MARES: GenMare[] = [
  { lat: 8.5, lon: 31.4, rx: 400, ry: 330 }, { lat: 28.0, lon: 17.5, rx: 300, ry: 290 },
  { lat: 32.8, lon: -15.6, rx: 560, ry: 470 }, { lat: 17.0, lon: 59.1, rx: 270, ry: 205 },
  { lat: -21.3, lon: -16.6, rx: 330, ry: 280 }, { lat: -24.4, lon: -38.6, rx: 190, ry: 190 },
  { lat: 56.0, lon: 1.4, rx: 800, ry: 120 }, { lat: 18.4, lon: -57.4, rx: 650, ry: 800 },
  { lat: 38.0, lon: -50.0, rx: 380, ry: 330 }, { lat: -3.0, lon: -50.0, rx: 480, ry: 380 },
  { lat: -10.0, lon: -23.1, rx: 190, ry: 190 }, { lat: 7.5, lon: -30.9, rx: 260, ry: 260 },
  { lat: -7.8, lon: 51.3, rx: 320, ry: 420 }, { lat: -15.2, lon: 35.5, rx: 165, ry: 165 },
  { lat: 13.3, lon: 3.6, rx: 130, ry: 120 }, { lat: 56.8, lon: 81.5, rx: 120, ry: 120 },
  { lat: 1.3, lon: 87.5, rx: 185, ry: 185 }, { lat: 13.3, lon: 86.1, rx: 210, ry: 130 },
  { lat: -19.4, lon: -92.8, rx: 120, ry: 120 }, { lat: 27.3, lon: 147.9, rx: 120, ry: 120 },
  { lat: -33.7, lon: 163.5, rx: 150, ry: 150 }, { lat: -38.9, lon: 93.0, rx: 280, ry: 130 },
  { lat: 22.6, lon: 67.7, rx: 75, ry: 60 }, { lat: 1.1, lon: 65.1, rx: 70, ry: 60 },
  { lat: 6.8, lon: 68.4, rx: 110, ry: 100 }, { lat: 38.0, lon: 29.2, rx: 190, ry: 150 },
  { lat: 45.0, lon: 27.2, rx: 75, ry: 70 }, { lat: 2.4, lon: 1.7, rx: 130, ry: 120 },
  { lat: 44.1, lon: -31.5, rx: 115, ry: 115 }, { lat: 26.5, lon: 0.4, rx: 80, ry: 80 },
];

function craterInput(c: (typeof FEATURES)[number]): GenCrater {
  return {
    lat: c.lat, lon: c.lon, d: c.diameter, depth: c.depth ?? c.diameter * 0.18,
    psr: c.psr?.share, rays: c.rays, dark: c.floorDark,
  };
}

export interface Terrain {
  polar: THREE.DataTexture;
  global: THREE.DataTexture;
  polarLevel0: Uint16Array;
}

function toTexture(levels: { data: Uint16Array; width: number; height: number }[], repeat: boolean) {
  const t = new THREE.DataTexture(levels[0].data, levels[0].width, levels[0].height, THREE.RGBAFormat, THREE.HalfFloatType);
  t.mipmaps = levels as unknown as THREE.Texture['mipmaps'];
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

export function loadTerrain(onProgress?: (p: number) => void): Promise<Terrain> {
  const craters = FEATURES.filter((f) => f.kind === 'crater');
  const polarList = craters.filter((c) => c.lat < -76.5).map(craterInput);
  const globalList = craters.filter((c) => c.diameter >= 14 && !(c.parent && c.diameter < 20)).map(craterInput);

  const run = (req: GenRequest) =>
    new Promise<{ levels: { data: Uint16Array; width: number; height: number }[]; ms: number }>((resolve, reject) => {
      const w = new Worker(new URL('./terrain.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e) => { resolve(e.data); w.terminate(); };
      w.onerror = (e) => reject(e);
      w.postMessage(req);
    });

  let done = 0;
  const tick = () => { done++; onProgress?.(done / 2); };
  const pPolar = run({ kind: 'polar', size: POLAR_SIZE, capDeg: CAP_DEG, craters: polarList, mares: [] }).then((r) => { tick(); return r; });
  const pGlobal = run({ kind: 'global', size: GLOBAL_W, capDeg: CAP_DEG, craters: globalList, mares: MARES }).then((r) => { tick(); return r; });

  return Promise.all([pPolar, pGlobal]).then(([a, b]) => ({
    polar: toTexture(a.levels, false),
    global: toTexture(b.levels, true),
    polarLevel0: a.levels[0].data,
  }));
}
