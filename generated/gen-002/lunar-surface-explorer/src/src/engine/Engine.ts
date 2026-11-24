import * as THREE from 'three';
import { vertexShader, fragmentShader, CAP_DEG, POLAR_SIZE } from './shaders';
import type { Terrain } from './terrain';
import { FEATURES, PLACES, Place, getPlace, POLAR_SCOUT, HAWORTH_CENTER, POLAR_SCOUT_BEARING, POLAR_SCOUT_GAP_KM } from '../data';
import { destination, fmtNum, R_KM, toVec, fromVec, V3, angleBetween, slerp, kmToMi } from '../lib/geo';
import { sunVector, sunElevation } from '../lib/sun';

const D2R = Math.PI / 180;
const FOV = 30;
const MIN_RANGE = 0.0115;
const MAX_RANGE = 5.6;
const EXAG = 1.6;
const CAP_RAD = CAP_DEG * D2R;

export interface Layers { missions: boolean; labels: boolean; shadow: boolean; saved: boolean }
export interface ViewInfo {
  lat: number; lon: number; range: number; tilt: number; pxKm: number;
  sunAngle: number; sunEl: number; flying: boolean;
}
export interface EngineCallbacks {
  onSelect: (key: string) => void;
  onView: (v: ViewInfo) => void;
  onInteract: () => void;
}
export interface FlyOpts { lat: number; lon: number; range: number; tilt?: number; duration?: number }

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Visible view height as a multiple of range (R units): 2·tan(fov/2). */
const VH = 2 * Math.tan((FOV * D2R) / 2);
export const rangeForViewKm = (km: number) => Math.min(MAX_RANGE, Math.max(MIN_RANGE, km / R_KM / VH));

function basisQuat(f: V3, upRef: V3 = [0, 1, 0]): THREE.Quaternion {
  const z = new THREE.Vector3(...f).normalize();
  const up = new THREE.Vector3(...upRef);
  let x = new THREE.Vector3().crossVectors(up, z);
  if (x.lengthSq() < 1e-8) x = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, f[1] > 0 ? -1 : 1), z);
  x.normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  return new THREE.Quaternion().setFromRotationMatrix(m).invert();
}

interface MarkerEl {
  place: Place;
  el: HTMLButtonElement;
  label: HTMLSpanElement;
  prio: number;
  v: V3;
}

export class Engine {
  private host: HTMLElement;
  private cb: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private starScene = new THREE.Scene();
  private starCam = new THREE.PerspectiveCamera(FOV, 1, 1, 100);
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.001, 50);
  private moon = new THREE.Group();
  private matGlobe!: THREE.ShaderMaterial;
  private matPatch!: THREE.ShaderMaterial;
  private terrain: Terrain | null = null;
  private raf = 0;
  private dirty = true;
  private disposed = false;

  // view state
  private Q = new THREE.Quaternion();
  private range = 4.4;
  private targetRange = 4.4;
  private tilt = 0;
  private anim: null | {
    t0: number; dur: number; q0: THREE.Quaternion; q1: THREE.Quaternion;
    r0: number; r1: number; tl0: number; tl1: number; hump: number;
  } = null;
  private vel = { x: 0, y: 0 };
  private W = 1; private H = 1;
  private pxKm = 5;

  // scene data
  private time = Date.UTC(2026, 10, 17, 15, 0);
  private sun: V3 = [0, 0, 1];
  private exposure = 1;
  private layers: Layers = { missions: true, labels: true, shadow: true, saved: true };
  private selected: Place | null = null;
  private compare: Place | null = null;
  private savedKeys = new Set<string>();
  private showGap = false;
  private showSunBeam = false;

  // overlay DOM
  private root!: HTMLDivElement;
  private svg!: SVGSVGElement;
  private pRingSel!: SVGPathElement;
  private pRingCmp!: SVGPathElement;
  private pArc!: SVGPathElement;
  private pGap!: SVGPathElement;
  private gapChip!: HTMLDivElement;
  private selChip!: HTMLDivElement;
  private cmpChip!: HTMLDivElement;
  private poleMk!: HTMLDivElement;
  private scaleEl!: HTMLDivElement;
  private scaleBar!: HTMLDivElement;
  private scaleTxt!: HTMLSpanElement;
  private tip!: HTMLDivElement;
  private markers: MarkerEl[] = [];
  private savedPins = new Map<string, HTMLDivElement>();
  private labelPool: HTMLDivElement[] = [];
  private tmpV = new THREE.Vector3();
  private lastViewSent = 0;
  private lastViewJson = '';
  private featCos: Float32Array;
  private featVec: V3[];
  private labelOrder: number[];
  private ready = false;
  private moveInfo = { downX: 0, downY: 0, moved: false, dragging: false, mode: 'rotate' as 'rotate' | 'tilt', id: -1 };

  constructor(host: HTMLElement, cb: EngineCallbacks) {
    this.host = host;
    this.cb = cb;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x04060a, 1);
    const canvas = this.renderer.domElement;
    canvas.className = 'moon-canvas';
    host.appendChild(canvas);

    this.featVec = FEATURES.map((f) => toVec(f.lat, f.lon));
    this.featCos = Float32Array.from(FEATURES.map((f) => Math.cos(Math.min(Math.PI, f.diameter / 2 / R_KM))));
    this.labelOrder = FEATURES.map((_, i) => i).sort((a, b) => FEATURES[b].diameter - FEATURES[a].diameter);
    this.craterIdx = this.labelOrder.filter((i) => FEATURES[i].kind === 'crater' && FEATURES[i].lat > -83);

    this.buildStars();
    this.buildOverlay();
    this.scene.add(this.moon);
    this.Q = basisQuat(toVec(0, 0));
    this.applyTime();
    this.bind();
    this.resize();
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(host);
    this.ro = ro;
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }
  private ro!: ResizeObserver;
  private crC = Array.from({ length: 64 }, () => new THREE.Vector4());
  private crP = Array.from({ length: 64 }, () => new THREE.Vector4());
  private craterIdx: number[] = [];

  /* ───────────── setup ───────────── */
  setTerrain(t: Terrain) {
    this.terrain = t;
    const uniforms = {
      uGlobal: { value: t.global }, uPolar: { value: t.polar },
      uSun: { value: new THREE.Vector3() }, uCam: { value: new THREE.Vector3() },
      uCrN: { value: 0 }, uCrC: { value: this.crC }, uCrP: { value: this.crP },
      uPxKm: { value: 5 }, uPsr: { value: 1 }, uExposure: { value: 1 }, uExag: { value: EXAG }, uLoaded: { value: 1 },
    };
    this.matGlobe = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    this.matPatch = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, defines: { PATCH: '' } });

    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 512, 256, 0, Math.PI * 2, 0, Math.PI - CAP_RAD), this.matGlobe);
    globe.frustumCulled = false;
    this.moon.add(globe);

    // south-polar patch
    const rings = 300, segs = 512;
    const pos = new Float32Array((rings + 1) * (segs + 1) * 3);
    let k = 0;
    for (let i = 0; i <= rings; i++) {
      const th = (CAP_RAD * i) / rings;
      for (let j = 0; j <= segs; j++) {
        const ph = (2 * Math.PI * j) / segs;
        pos[k++] = -Math.cos(ph) * Math.sin(th);
        pos[k++] = -Math.cos(th);
        pos[k++] = Math.sin(ph) * Math.sin(th);
      }
    }
    const idx: number[] = [];
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * (segs + 1) + j, b = a + 1, c = a + segs + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    const patch = new THREE.Mesh(g, this.matPatch);
    patch.frustumCulled = false;
    this.moon.add(patch);
    this.ready = true;
    this.applyTime();
    this.dirty = true;
  }

  private buildStars() {
    const n = 1400;
    const p = new Float32Array(n * 3);
    let s = 12345;
    const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, q = Math.sqrt(1 - u * u);
      p.set([q * Math.cos(th) * 40, u * 40, q * Math.sin(th) * 40], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ color: 0xbfc8dd, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.55 });
    this.starScene.add(new THREE.Points(g, m));
  }

  private el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent: HTMLElement = this.root) {
    const e = document.createElement(tag);
    e.className = cls;
    parent.appendChild(e);
    return e;
  }

  private buildOverlay() {
    this.root = document.createElement('div');
    this.root.className = 'ov-root';
    this.host.appendChild(this.root);
    const NS = 'http://www.w3.org/2000/svg';
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'ov-svg');
    const mk = (cls: string) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('class', cls);
      this.svg.appendChild(p);
      return p;
    };
    this.pArc = mk('ov-arc');
    this.pRingCmp = mk('ov-ring cmp');
    this.pRingSel = mk('ov-ring sel');
    this.pGap = mk('ov-gap');
    this.root.appendChild(this.svg);

    this.poleMk = this.el('div', 'pole-mk');
    this.poleMk.innerHTML = '<span class="pole-x"></span><span class="pole-t">Moon’s south pole</span>';

    // markers for missions and Apollo sites
    const prio = (p: Place) =>
      p.key === 'r:polar-scout' ? 100 : p.type === 'apollo' ? 60 : p.robotic?.status === 'active' ? 40 : 20;
    for (const p of PLACES.filter((x) => x.type !== 'feature')) {
      const el = this.el('button', 'mk', this.root) as HTMLButtonElement;
      el.type = 'button';
      el.dataset.key = p.key;
      const status = p.robotic?.status;
      el.classList.add(p.type === 'apollo' ? 'apollo' : 'robotic');
      if (status) el.classList.add('st-' + status);
      if (p.key === 'r:polar-scout') el.classList.add('hero');
      el.setAttribute('aria-label', `${p.name}, ${p.kindLabel}`);
      const dot = this.el('span', 'mk-dot', el);
      if (p.apollo) dot.textContent = p.apollo.mission.replace('Apollo ', '');
      const label = this.el('span', 'mk-label', el);
      label.textContent = p.apollo ? p.apollo.mission : p.name;
      el.addEventListener('click', (e) => { e.stopPropagation(); this.cb.onSelect(p.key); });
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('wheel', (e) => this.onWheel(e as WheelEvent), { passive: false });
      this.markers.push({ place: p, el, label, prio: prio(p), v: toVec(p.lat, p.lon) });
    }
    this.markers.sort((a, b) => b.prio - a.prio);

    this.selChip = this.el('div', 'sel-chip');
    this.cmpChip = this.el('div', 'sel-chip cmp');
    this.gapChip = this.el('div', 'gap-chip');
    this.tip = this.el('div', 'tip');

    this.scaleEl = this.el('div', 'scale');
    this.scaleBar = this.el('div', 'scale-bar', this.scaleEl);
    this.scaleTxt = this.el('span', 'scale-txt', this.scaleEl);
  }

  private labelEl(i: number) {
    while (this.labelPool.length <= i) {
      const d = this.el('div', 'lbl');
      d.addEventListener('click', (e) => {
        e.stopPropagation();
        const k = d.dataset.key;
        if (k) this.cb.onSelect(k);
      });
      d.addEventListener('pointerdown', (e) => e.stopPropagation());
      d.addEventListener('wheel', (e) => this.onWheel(e as WheelEvent), { passive: false });
      this.labelPool.push(d);
    }
    return this.labelPool[i];
  }

  /* ───────────── public API ───────────── */
  setLayers(l: Layers) {
    this.layers = l;
    if (this.matGlobe) this.matGlobe.uniforms.uPsr.value = l.shadow ? 1 : 0;
    this.dirty = true;
  }
  setTime(ms: number) { this.time = ms; this.applyTime(); this.dirty = true; }
  setSelected(key: string | null) { this.selected = key ? getPlace(key) ?? null : null; this.dirty = true; }
  setCompare(key: string | null) { this.compare = key ? getPlace(key) ?? null : null; this.dirty = true; }
  setSavedKeys(keys: string[]) {
    this.savedKeys = new Set(keys);
    for (const [k, el] of this.savedPins) if (!this.savedKeys.has(k)) { el.remove(); this.savedPins.delete(k); }
    for (const k of keys) {
      if (this.savedPins.has(k)) continue;
      const p = getPlace(k);
      if (!p) continue;
      const el = this.el('div', 'saved-pin');
      el.innerHTML = '<svg viewBox="0 0 12 16" width="12" height="16"><path d="M1 1h10v14l-5-3.5L1 15z"/></svg>';
      this.savedPins.set(k, el);
    }
    this.dirty = true;
  }
  setGuides(o: { gap: boolean; sunBeam: boolean }) { this.showGap = o.gap; this.showSunBeam = o.sunBeam; this.dirty = true; }
  isReady() { return this.ready; }

  getFocus() { return this.focus(); }

  flyTo(o: FlyOpts) {
    const f = toVec(o.lat, o.lon);
    const q1 = basisQuat(f);
    const cur = this.focus();
    const arc = angleBetween(cur, f);
    const dur = o.duration ?? Math.min(2.6, 0.9 + arc * 1.1);
    const r1 = Math.min(MAX_RANGE, Math.max(MIN_RANGE, o.range));
    const hump = arc > 0.08 ? Math.min(1.5, Math.log(1 + arc * 3.2)) : 0;
    if (dur <= 0.001) {
      this.Q.copy(q1); this.range = this.targetRange = r1; this.tilt = (o.tilt ?? 0) * D2R; this.dirty = true;
      return;
    }
    this.anim = {
      t0: performance.now(), dur: dur * 1000, q0: this.Q.clone(), q1,
      r0: this.range, r1, tl0: this.tilt, tl1: (o.tilt ?? 0) * D2R, hump,
    };
    this.vel = { x: 0, y: 0 };
    this.targetRange = r1;
    this.dirty = true;
  }
  zoomBy(factor: number) {
    this.anim = null;
    this.targetRange = Math.min(MAX_RANGE, Math.max(MIN_RANGE, this.targetRange * factor));
    this.dirty = true;
  }
  setTilt(deg: number) {
    this.anim = null;
    this.tilt = Math.max(0, Math.min(66, deg)) * D2R;
    this.dirty = true;
  }
  getTiltDeg() { return this.tilt / D2R; }
  getRange() { return this.range; }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.renderer.dispose();
    this.host.innerHTML = '';
  }

  /* ───────────── internals ───────────── */
  private focus(): V3 {
    const v = new THREE.Vector3(0, 0, 1).applyQuaternion(this.Q.clone().invert());
    return [v.x, v.y, v.z];
  }
  private applyTime() {
    this.sun = sunVector(this.time);
    if (this.matGlobe) this.matGlobe.uniforms.uSun.value.set(...this.sun);
  }
  private resize() {
    const r = this.host.getBoundingClientRect();
    this.W = Math.max(2, Math.floor(r.width));
    this.H = Math.max(2, Math.floor(r.height));
    this.renderer.setSize(this.W, this.H, false);
    this.camera.aspect = this.W / this.H;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  private bind() {
    const el = this.host;
    el.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button, .lbl')) return;
      this.cb.onInteract();
      el.setPointerCapture(e.pointerId);
      this.moveInfo = {
        downX: e.clientX, downY: e.clientY, moved: false, dragging: true,
        mode: e.button === 2 || e.shiftKey || e.altKey ? 'tilt' : 'rotate', id: e.pointerId,
      };
      this.anim = null;
      this.vel = { x: 0, y: 0 };
      this.lastX = e.clientX; this.lastY = e.clientY;
    });
    el.addEventListener('pointermove', (e) => {
      const m = this.moveInfo;
      if (m.dragging && e.pointerId === m.id) {
        const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
        this.lastX = e.clientX; this.lastY = e.clientY;
        if (Math.abs(e.clientX - m.downX) + Math.abs(e.clientY - m.downY) > 4) m.moved = true;
        if (!m.moved) return;
        if (m.mode === 'tilt') {
          this.tilt = Math.max(0, Math.min(66 * D2R, this.tilt + dy * 0.006));
          this.dirty = true;
        } else {
          this.rotateBy(dx, dy);
          this.vel = { x: dx, y: dy };
        }
        this.tip.style.opacity = '0';
      } else {
        this.hover(e);
      }
    });
    const up = (e: PointerEvent) => {
      const m = this.moveInfo;
      if (!m.dragging || e.pointerId !== m.id) return;
      m.dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      if (!m.moved) this.clickAt(e);
      else if (Math.hypot(this.vel.x, this.vel.y) < 2) this.vel = { x: 0, y: 0 };
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', () => { this.tip.style.opacity = '0'; });
    el.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('dblclick', (e) => {
      if ((e.target as HTMLElement).closest('button, .lbl')) return;
      const hit = this.pickSurface(e.clientX, e.clientY);
      if (!hit) return;
      const ll = fromVec(hit);
      this.flyTo({ lat: ll.lat, lon: ll.lon, range: Math.max(MIN_RANGE * 1.5, this.range * 0.4), tilt: this.tilt / D2R, duration: 0.9 });
    });
  }
  private lastX = 0; private lastY = 0;

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    this.cb.onInteract();
    this.anim = null;
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    const f = Math.exp(Math.max(-120, Math.min(120, d)) * (e.ctrlKey ? 0.01 : 0.0018));
    this.targetRange = Math.min(MAX_RANGE, Math.max(MIN_RANGE, this.targetRange * f));
    this.dirty = true;
  }

  private rotateBy(dx: number, dy: number) {
    const f = this.focus();
    const lat = Math.asin(Math.max(-1, Math.min(1, f[1])));
    const k = this.pxKm / R_KM;
    const kLon = k / Math.max(Math.cos(lat), 0.02);
    const ay = dx * kLon;
    const ax = dy * k / Math.max(Math.cos(this.tilt), 0.45);
    const Rx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ax);
    const Ry = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ay);
    this.Q.premultiply(Rx).multiply(Ry).normalize();
    this.dirty = true;
  }

  /** Ray → unit sphere in Moon-fixed coordinates, or null if the pointer is off the Moon. */
  private pickSurface(cx: number, cy: number): V3 | null {
    const r = this.host.getBoundingClientRect();
    const nx = ((cx - r.left) / r.width) * 2 - 1;
    const ny = -(((cy - r.top) / r.height) * 2 - 1);
    this.camera.updateMatrixWorld();
    const o = this.camera.position.clone();
    const d = new THREE.Vector3(nx, ny, 0.5).unproject(this.camera).sub(o).normalize();
    const b = o.dot(d);
    const c = o.lengthSq() - 1;
    const disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    if (t < 0) return null;
    const p = o.add(d.multiplyScalar(t)).applyQuaternion(this.Q.clone().invert());
    return [p.x, p.y, p.z];
  }

  private pickFeatureAt(p: V3): number {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < FEATURES.length; i++) {
      const v = this.featVec[i];
      const dp = v[0] * p[0] + v[1] * p[1] + v[2] * p[2];
      if (dp >= this.featCos[i]) {
        const f = FEATURES[i];
        // prefer the smallest feature under the pointer; ignore giant seas when much smaller things are present
        if (f.diameter < bestD) { bestD = f.diameter; best = i; }
      }
    }
    return best;
  }

  private hover(e: PointerEvent) {
    const hit = this.pickSurface(e.clientX, e.clientY);
    const r = this.host.getBoundingClientRect();
    let idx = -1;
    if (hit) idx = this.pickFeatureAt(hit);
    if (idx < 0) { this.tip.style.opacity = '0'; this.host.style.cursor = hit ? 'grab' : 'default'; return; }
    const f = FEATURES[idx];
    this.host.style.cursor = 'pointer';
    this.tip.innerHTML = `<b>${f.name}</b><span>${f.parent ? 'Satellite crater' : f.kind === 'mare' ? 'Sea' : f.kind[0].toUpperCase() + f.kind.slice(1)} · ${fmtNum(f.diameter)} km</span>`;
    this.tip.style.opacity = '1';
    const x = Math.min(e.clientX - r.left + 14, r.width - 190);
    this.tip.style.transform = `translate(${x}px, ${e.clientY - r.top + 16}px)`;
  }

  private clickAt(e: PointerEvent) {
    const hit = this.pickSurface(e.clientX, e.clientY);
    if (!hit) return;
    const idx = this.pickFeatureAt(hit);
    if (idx >= 0) this.cb.onSelect(`f:${FEATURES[idx].id}`);
  }

  /* ───────────── frame ───────────── */
  private loop() {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();

    if (this.anim) {
      const a = this.anim;
      const t = Math.min(1, (now - a.t0) / a.dur);
      const e = ease(t);
      this.Q.slerpQuaternions(a.q0, a.q1, e);
      const lr = Math.log(a.r0) * (1 - e) + Math.log(a.r1) * e + a.hump * Math.sin(Math.PI * e);
      this.range = Math.min(MAX_RANGE, Math.exp(lr));
      this.tilt = a.tl0 + (a.tl1 - a.tl0) * e;
      if (t >= 1) { this.anim = null; this.range = this.targetRange = a.r1; }
      this.dirty = true;
    } else {
      if (Math.abs(this.range - this.targetRange) > 1e-5 * this.range) {
        this.range += (this.targetRange - this.range) * 0.22;
        this.dirty = true;
      }
      if (!this.moveInfo.dragging && (Math.abs(this.vel.x) > 0.15 || Math.abs(this.vel.y) > 0.15)) {
        this.rotateBy(this.vel.x, this.vel.y);
        this.vel.x *= 0.93; this.vel.y *= 0.93;
      }
    }
    const targetEx = this.exposureFor();
    if (Math.abs(targetEx - this.exposure) > 0.004) {
      this.exposure += (targetEx - this.exposure) * 0.12;
      this.dirty = true;
    }
    if (!this.dirty || !this.ready) return;
    this.dirty = false;
    this.render();
  }

  /** Named craters near the view are drawn analytically in the shader, so they stay sharp at any zoom. */
  private updateCraterUniforms() {
    const u = this.matGlobe.uniforms;
    if (this.pxKm > 5.2) { u.uCrN.value = 0; return; }
    const f = this.focus();
    const viewKm = this.pxKm * Math.max(this.W, this.H) * (this.range > 0.6 ? 1.3 : 0.85);
    let n = 0;
    for (const i of this.craterIdx) {
      const ft = FEATURES[i];
      if (ft.diameter / this.pxKm < 5) break;
      const v = this.featVec[i];
      const rk = ft.diameter / 2;
      const reach = Math.min(Math.PI, (viewKm + rk * 3) / R_KM);
      if (v[0] * f[0] + v[1] * f[1] + v[2] * f[2] < Math.cos(reach)) continue;
      this.crC[n].set(v[0], v[1], v[2], rk);
      const depth = ft.depth ?? ft.diameter * 0.18;
      const peak = ft.diameter > 36 && ft.diameter < 200 && !ft.psr && !ft.floorDark ? 1 : 0;
      this.crP[n].set(depth, peak, ft.diameter > 30 ? 0.55 : 0, Math.cos(Math.min(Math.PI, (rk * 3) / R_KM)));
      if (++n >= 64) break;
    }
    u.uCrN.value = n;
  }

  private exposureFor() {
    const f = this.focus();
    const s = this.sun;
    const sinEl = f[0] * s[0] + f[1] * s[1] + f[2] * s[2];
    const w = 1 - smooth(0.35, 1.5, this.range);
    const near = Math.min(7, Math.max(1, 0.36 / (Math.max(sinEl, 0) + 0.05)));
    return 1 + (near - 1) * w;
  }

  private updateCamera() {
    const r = this.range;
    const s = smooth(0.7, 2.2, r);
    const tilt = this.tilt * (1 - s);
    const tz = 1 - s;
    const target = new THREE.Vector3(0, 0, tz);
    this.camera.position.set(0, -r * Math.sin(tilt), tz + r * Math.cos(tilt));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(target);
    const dist = this.camera.position.length();
    this.camera.near = Math.max(0.0002, (dist - 1 - 0.004) * 0.3);
    this.camera.far = dist + 3;
    this.camera.setViewOffset(this.W, this.H, 0, 26, this.W, this.H);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.starCam.aspect = this.camera.aspect;
    this.starCam.quaternion.copy(this.camera.quaternion);
    this.starCam.setViewOffset(this.W, this.H, 0, 26, this.W, this.H);
    this.starCam.updateProjectionMatrix();
    const d = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 1));
    this.pxKm = (2 * Math.tan((FOV * D2R) / 2) * Math.max(d, 0.01) * R_KM) / this.H;
    if (s > 0.6) this.pxKm = (2 * Math.tan((FOV * D2R) / 2) * Math.max(dist - 1, 0.01) * R_KM) / this.H;
  }

  private render() {
    this.updateCamera();
    this.moon.quaternion.copy(this.Q);
    this.moon.updateMatrixWorld(true);
    const qi = this.Q.clone().invert();
    const camObj = this.camera.position.clone().applyQuaternion(qi);
    const u = this.matGlobe.uniforms;
    u.uCam.value.copy(camObj);
    u.uSun.value.set(...this.sun);
    u.uPxKm.value = this.pxKm;
    u.uExposure.value = this.exposure;
    this.updateCraterUniforms();
    this.renderer.autoClear = true;
    this.renderer.render(this.starScene, this.starCam);
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);
    this.updateOverlay(camObj);
    this.emitView();
  }

  /* ───────────── overlay ───────────── */
  private polarHeight(v: V3): number {
    if (!this.terrain || v[1] > -Math.cos(CAP_RAD)) return 0;
    const s = Math.sin(CAP_RAD);
    const i = Math.min(POLAR_SIZE - 1, Math.max(0, Math.floor((v[0] / s * 0.5 + 0.5) * POLAR_SIZE)));
    const j = Math.min(POLAR_SIZE - 1, Math.max(0, Math.floor((v[2] / s * 0.5 + 0.5) * POLAR_SIZE)));
    const h = this.terrain.polarLevel0[(j * POLAR_SIZE + i) * 4];
    return halfToFloat(h);
  }
  private liftFor(v: V3, extra = 0.0006): number {
    const rr = Math.hypot(v[0], v[2]);
    let disp = 0;
    if (v[1] < 0 && rr < Math.sin(CAP_RAD)) {
      const fade = 1 - smooth(0.8, 1.0, rr / Math.sin(CAP_RAD));
      disp = (this.polarHeight(v) * EXAG * fade) / R_KM;
    }
    return 1 + disp + extra;
  }

  private proj(v: V3, lift?: number): { x: number; y: number; vis: boolean; depth: number } {
    const l = lift ?? this.liftFor(v);
    const t = this.tmpV.set(v[0] * l, v[1] * l, v[2] * l).applyQuaternion(this.Q);
    const nx = t.x / l, ny = t.y / l, nz = t.z / l;
    const cp = this.camera.position;
    const vis = nx * (cp.x - t.x) + ny * (cp.y - t.y) + nz * (cp.z - t.z) > 0.0004;
    const depth = t.distanceTo(cp);
    t.project(this.camera);
    return { x: (t.x * 0.5 + 0.5) * this.W, y: (1 - (t.y * 0.5 + 0.5)) * this.H, vis: vis && t.z < 1 && t.z > -1, depth };
  }

  private circlePath(lat: number, lon: number, radiusKm: number, n = 72): string {
    let d = '';
    let pen = false;
    for (let i = 0; i <= n; i++) {
      const pt = destination(lat, lon, (i / n) * 360, radiusKm);
      const v = toVec(pt.lat, pt.lon);
      const p = this.proj(v);
      if (!p.vis) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      pen = true;
    }
    return d;
  }

  private placeNeedsRing(p: Place) {
    return p.type === 'feature' && p.feature!.kind === 'crater';
  }

  private updateOverlay(_camObj: THREE.Vector3) {
    const W = this.W, H = this.H;
    const taken: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const free = (x0: number, y0: number, x1: number, y1: number) => {
      for (const r of taken) if (x0 < r.x1 && x1 > r.x0 && y0 < r.y1 && y1 > r.y0) return false;
      return true;
    };
    const claim = (x0: number, y0: number, x1: number, y1: number) => taken.push({ x0, y0, x1, y1 });
    const inView = (x: number, y: number, m = 0) => x > -m && x < W + m && y > -m && y < H + m;

    // reserved regions (UI chrome painted over the canvas)
    claim(W - 70, 0, W, 250);
    claim(0, 0, 215, 235);
    claim(0, H - 82, W, H);

    const sel = this.selected;
    const cmp = this.compare;
    const keyActive = (k: string) => (sel && sel.key === k) || (cmp && cmp.key === k);

    // ── selected & compare rings
    const setRing = (path: SVGPathElement, p: Place | null) => {
      if (!p || !this.placeNeedsRing(p)) { path.setAttribute('d', ''); return; }
      const pd = (p.feature!.diameter) / this.pxKm;
      if (pd < 10) { path.setAttribute('d', ''); return; }
      path.setAttribute('d', this.circlePath(p.lat, p.lon, p.feature!.diameter / 2));
    };
    setRing(this.pRingSel, sel);
    setRing(this.pRingCmp, cmp);

    // ── compare arc
    if (sel && cmp && sel.key !== cmp.key) {
      const a = toVec(sel.lat, sel.lon), b = toVec(cmp.lat, cmp.lon);
      const n = 90;
      let d = '', pen = false;
      for (let i = 0; i <= n; i++) {
        const v = slerp(a, b, i / n);
        const lift = 1.0025 + 0.004 * Math.sin((i / n) * Math.PI);
        const p = this.proj(v, lift);
        if (!p.vis) { pen = false; continue; }
        d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        pen = true;
      }
      this.pArc.setAttribute('d', d);
    } else this.pArc.setAttribute('d', '');

    // ── missions
    const showMissions = this.layers.missions;
    const hovZoom = this.pxKm;
    for (const m of this.markers) {
      const active = keyActive(m.place.key);
      let on = showMissions || active;
      let p = { x: 0, y: 0, vis: false, depth: 0 };
      if (on) {
        p = this.proj(m.v);
        on = p.vis && inView(p.x, p.y, 20);
      }
      if (!on) { m.el.style.display = 'none'; continue; }
      m.el.style.display = 'block';
      m.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      m.el.classList.toggle('sel', !!(sel && sel.key === m.place.key));
      m.el.classList.toggle('cmp', !!(cmp && cmp.key === m.place.key));
      // label policy
      const wantLabel = active || m.place.key === 'r:polar-scout' || (hovZoom < 1.4) || m.place.type === 'apollo';
      const txtW = m.label.textContent!.length * 6.6 + 14;
      const lx0 = p.x + 10, lx1 = lx0 + txtW, ly0 = p.y - 9, ly1 = p.y + 9;
      let showLabel = false;
      if (active) showLabel = true;
      else if (wantLabel && this.layers.labels && free(lx0, ly0, lx1, ly1)) showLabel = true;
      m.el.classList.toggle('lab', showLabel);
      if (showLabel) claim(lx0, ly0, lx1, ly1);
      claim(p.x - 8, p.y - 8, p.x + 8, p.y + 8);
      m.el.style.zIndex = String(active ? 30 : m.prio > 50 ? 20 : 10);
    }

    // ── saved pins
    for (const [k, el] of this.savedPins) {
      const pl = getPlace(k);
      if (!pl || !this.layers.saved) { el.style.display = 'none'; continue; }
      const p = this.proj(toVec(pl.lat, pl.lon), this.liftFor(toVec(pl.lat, pl.lon), 0.0009));
      if (!p.vis || !inView(p.x, p.y, 10) || (pl.type !== 'feature' && !this.layers.missions)) { el.style.display = 'none'; continue; }
      el.style.display = 'block';
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    }

    // ── selected / compare chips (name tags)
    const chip = (el: HTMLDivElement, p: Place | null, kind: string) => {
      if (!p) { el.style.display = 'none'; return; }
      const v = toVec(p.lat, p.lon);
      const pr = this.proj(v);
      if (!pr.vis || !inView(pr.x, pr.y, 60)) { el.style.display = 'none'; return; }
      let y = pr.y;
      const pd = p.type === 'feature' ? p.feature!.diameter / this.pxKm : 0;
      const big = pd > 90 && this.placeNeedsRing(p);
      if (big) y = pr.y - Math.min(pd / 2, H * 0.36) * Math.cos(this.tilt * 0.8) - 6;
      else if (p.type !== 'feature') y = pr.y - 26;
      else y = pr.y - 18;
      el.style.display = 'block';
      el.innerHTML = `<span class="sc-k">${kind}</span><span class="sc-n">${p.type === 'apollo' ? p.apollo!.mission + ' · ' + p.apollo!.siteName : p.name}</span>`;
      el.style.transform = `translate(${pr.x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      const w = 130;
      claim(pr.x - w / 2, y - 34, pr.x + w / 2, y);
    };
    if (sel && sel.type === 'feature') chip(this.selChip, sel, this.placeNeedsRing(sel) ? '' : sel.kindLabel);
    else this.selChip.style.display = 'none';
    if (cmp && cmp.type === 'feature') chip(this.cmpChip, cmp, 'Compare');
    else this.cmpChip.style.display = 'none';
    if (cmp && sel && cmp.type === 'feature' === false) { /* mission chips are shown via marker labels */ }

    // ── south pole marker
    {
      const pv: V3 = [0, -1, 0];
      const p = this.proj(pv, this.liftFor(pv));
      const show = p.vis && inView(p.x, p.y, 30) && this.range < 1.0 && p.y < H - 86;
      this.poleMk.style.display = show ? 'block' : 'none';
      if (show) {
        this.poleMk.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
        claim(p.x - 12, p.y - 12, p.x + 100, p.y + 12);
      }
    }

    // ── gap: Polar Scout ↔ Haworth rim
    {
      let show = this.showGap;
      let d = '';
      if (show) {
        const h = HAWORTH_CENTER;
        const rim = destination(h.lat, h.lon, POLAR_SCOUT_BEARING, h.diameter / 2);
        const a = this.proj(toVec(POLAR_SCOUT.lat, POLAR_SCOUT.lon));
        const b = this.proj(toVec(rim.lat, rim.lon));
        if (a.vis && b.vis) {
          const dx = a.x - b.x, dy = a.y - b.y;
          const L = Math.hypot(dx, dy);
          if (L > 5) {
            const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
            const tick = 7;
            d = `M${b.x.toFixed(1)} ${b.y.toFixed(1)}L${a.x.toFixed(1)} ${a.y.toFixed(1)}` +
              `M${(b.x + nx * tick).toFixed(1)} ${(b.y + ny * tick).toFixed(1)}L${(b.x - nx * tick).toFixed(1)} ${(b.y - ny * tick).toFixed(1)}` +
              `M${(a.x + nx * tick).toFixed(1)} ${(a.y + ny * tick).toFixed(1)}L${(a.x - nx * tick).toFixed(1)} ${(a.y - ny * tick).toFixed(1)}`;
            // chip sits just beyond the lander, away from the crater
            const off = L < 70 ? 52 : 0;
            const mx = L < 70 ? a.x + ux * off * 0.6 + nx * 0 : (a.x + b.x) / 2 + nx * 22;
            const my = L < 70 ? a.y + uy * off * 0.6 - 4 : (a.y + b.y) / 2 + ny * 22;
            this.gapChip.style.display = 'block';
            this.gapChip.innerHTML = `<b>${POLAR_SCOUT_GAP_KM} km</b> to the rim <i>${fmtNum(kmToMi(POLAR_SCOUT_GAP_KM), 1)} mi</i>`;
            this.gapChip.style.transform = `translate(${mx.toFixed(1)}px, ${my.toFixed(1)}px)`;
            claim(mx - 60, my - 18, mx + 60, my + 18);
          } else this.gapChip.style.display = 'none';
        } else this.gapChip.style.display = 'none';
      } else this.gapChip.style.display = 'none';
      this.pGap.setAttribute('d', d);
    }

    // ── feature labels
    const pool = this.layers.labels ? this.labelOrder : [];
    let used = 0;
    const maxLabels = 30;
    const selFeatId = sel?.feature?.id;
    const cmpFeatId = cmp?.feature?.id;
    for (let k = 0; k < pool.length && used < maxLabels; k++) {
      const i = pool[k];
      const f = FEATURES[i];
      const pd = f.diameter / this.pxKm;
      if (pd < 26) break;
      if (f.id === selFeatId || f.id === cmpFeatId) continue;
      const thresh = f.kind === 'mare' ? 85 : f.kind === 'crater' ? (f.parent ? 46 : 34) : f.kind === 'mountain' ? 70 : 90;
      if (pd < thresh) continue;
      if (pd > 2600) continue; // the label would be meaningless when you are inside the feature
      const v = this.featVec[i];
      const p = this.proj(v);
      if (!p.vis || !inView(p.x, p.y, 0)) continue;
      const txt = f.kind === 'mare' ? f.name.toUpperCase() : f.name;
      const w = txt.length * (f.kind === 'mare' ? 8.2 : 6.6) + 8;
      const x0 = p.x - w / 2, y0 = p.y - 9, x1 = p.x + w / 2, y1 = p.y + 9;
      if (!free(x0, y0, x1, y1)) continue;
      claim(x0, y0, x1, y1);
      const e = this.labelEl(used++);
      if (e.dataset.key !== `f:${f.id}`) {
        e.dataset.key = `f:${f.id}`;
        e.textContent = txt;
        e.className = `lbl k-${f.kind}${f.parent ? ' sat' : ''}`;
      }
      e.style.display = 'block';
      e.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    }
    for (let i = used; i < this.labelPool.length; i++) this.labelPool[i].style.display = 'none';

    // ── scale bar (top-down views only)
    {
      const show = this.tilt < 0.5 && this.range < 1.2;
      this.scaleEl.style.display = show ? 'flex' : 'none';
      if (show) {
        const target = this.pxKm * 120;
        const pow = Math.pow(10, Math.floor(Math.log10(target)));
        const m = target / pow;
        const nice = (m >= 5 ? 5 : m >= 2 ? 2 : 1) * pow;
        this.scaleBar.style.width = `${(nice / this.pxKm).toFixed(0)}px`;
        const unit = nice < 1 ? `${fmtNum(nice * 1000)} m` : `${fmtNum(nice)} km`;
        const mi = kmToMi(nice);
        this.scaleTxt.textContent = `${unit} · ${mi < 1 ? fmtNum(mi, 2) : fmtNum(mi, mi < 10 ? 1 : 0)} mi`;
      }
    }
  }

  private emitView() {
    const now = performance.now();
    if (now - this.lastViewSent < 90) { this.dirty = true; return; }
    const f = this.focus();
    const ll = fromVec(f);
    const sv = new THREE.Vector3(...this.sun).applyQuaternion(this.Q);
    const sinEl = f[0] * this.sun[0] + f[1] * this.sun[1] + f[2] * this.sun[2];
    const info: ViewInfo = {
      lat: ll.lat, lon: ll.lon, range: this.range, tilt: this.tilt / D2R, pxKm: this.pxKm,
      sunAngle: Math.atan2(sv.y, sv.x) / D2R, sunEl: Math.asin(Math.max(-1, Math.min(1, sinEl))) / D2R,
      flying: !!this.anim,
    };
    const json = `${info.lat.toFixed(2)}|${info.lon.toFixed(2)}|${info.range.toFixed(3)}|${info.tilt.toFixed(0)}|${info.sunAngle.toFixed(0)}|${info.sunEl.toFixed(1)}|${info.flying}`;
    if (json === this.lastViewJson) return;
    this.lastViewJson = json;
    this.lastViewSent = now;
    this.cb.onView(info);
  }
}

const hbuf = new Float32Array(1);
const hu = new Uint32Array(hbuf.buffer);
function halfToFloat(h: number) {
  const e = (h >> 10) & 0x1f;
  if (e === 0) return 0;
  hu[0] = ((h & 0x8000) << 16) | ((e - 15 + 127) << 23) | ((h & 0x3ff) << 13);
  return hbuf[0];
}

export { sunElevation };
