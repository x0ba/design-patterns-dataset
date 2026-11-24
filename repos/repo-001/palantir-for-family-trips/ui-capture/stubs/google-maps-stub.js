// Offline stand-in for the Google Maps JavaScript API (maps, geometry, places).
// Implements the subset of google.maps the app uses, rendering to a canvas with a
// coarse dark basemap, and answers Directions / Places requests locally.
import { COAST, HIGHWAYS, LAND, PARKS, PLACES, STATE_LINES, WATER } from './basemap.js'
import { PLACE_RECORDS } from './places-data.js'

const R = 6378137
const TILE = 256
const toRad = (d) => (d * Math.PI) / 180

// ---------- core value types ----------
class LatLng {
  constructor(lat, lng) {
    if (lat && typeof lat === 'object') {
      const o = lat
      this._lat = typeof o.lat === 'function' ? o.lat() : Number(o.lat)
      this._lng = typeof o.lng === 'function' ? o.lng() : Number(o.lng)
    } else {
      this._lat = Number(lat)
      this._lng = Number(lng)
    }
  }
  lat() { return this._lat }
  lng() { return this._lng }
  toJSON() { return { lat: this._lat, lng: this._lng } }
  toString() { return `(${this._lat}, ${this._lng})` }
  equals(o) { return !!o && Math.abs(o.lat() - this._lat) < 1e-9 && Math.abs(o.lng() - this._lng) < 1e-9 }
}
const ll = (v) => (v instanceof LatLng ? v : v ? new LatLng(v) : null)

class LatLngBounds {
  constructor(sw, ne) {
    this.s = Infinity; this.w = Infinity; this.n = -Infinity; this.e = -Infinity
    if (sw) this.extend(sw)
    if (ne) this.extend(ne)
  }
  extend(p) {
    const q = ll(p)
    if (!q || !Number.isFinite(q.lat()) || !Number.isFinite(q.lng())) return this
    this.s = Math.min(this.s, q.lat()); this.n = Math.max(this.n, q.lat())
    this.w = Math.min(this.w, q.lng()); this.e = Math.max(this.e, q.lng())
    return this
  }
  union(b) { if (!b.isEmpty()) { this.extend(b.getSouthWest()); this.extend(b.getNorthEast()) } return this }
  isEmpty() { return !(this.s <= this.n) }
  getCenter() { return new LatLng((this.s + this.n) / 2, (this.w + this.e) / 2) }
  getSouthWest() { return new LatLng(this.s, this.w) }
  getNorthEast() { return new LatLng(this.n, this.e) }
  contains(p) { const q = ll(p); return q.lat() >= this.s && q.lat() <= this.n && q.lng() >= this.w && q.lng() <= this.e }
  toJSON() { return { south: this.s, west: this.w, north: this.n, east: this.e } }
}

class Point { constructor(x, y) { this.x = x; this.y = y } }
class Size { constructor(w, h) { this.width = w; this.height = h } }

// ---------- events / MVCObject ----------
const LISTENERS = new WeakMap()
const event = {
  addListener(target, name, fn) {
    let m = LISTENERS.get(target)
    if (!m) { m = new Map(); LISTENERS.set(target, m) }
    if (!m.has(name)) m.set(name, new Set())
    m.get(name).add(fn)
    return { remove: () => m.get(name)?.delete(fn) }
  },
  addListenerOnce(target, name, fn) {
    const h = event.addListener(target, name, (...a) => { h.remove(); fn(...a) })
    return h
  },
  removeListener(h) { h?.remove?.() },
  clearInstanceListeners(target) { LISTENERS.delete(target) },
  clearListeners(target, name) { LISTENERS.get(target)?.delete(name) },
  trigger(target, name, ...args) {
    const set = LISTENERS.get(target)?.get(name)
    if (set) [...set].forEach((fn) => { try { fn.apply(target, args) } catch (e) { console.error(e) } })
  },
  hasListeners(target, name) { return !!LISTENERS.get(target)?.get(name)?.size },
}

class MVCObject {
  constructor() { this._v = {} }
  get(k) { return this._v[k] }
  set(k, v) { this._v[k] = v; this._changed?.(k); event.trigger(this, `${k}_changed`) }
  setValues(o) { Object.entries(o || {}).forEach(([k, v]) => this.set(k, v)) }
  setOptions(o) { this.setValues(o) }
  addListener(name, fn) { return event.addListener(this, name, fn) }
  notify(k) { event.trigger(this, `${k}_changed`) }
  bindTo() {}
  unbind() {}
}

// ---------- projection helpers ----------
function project(lat, lng, zoom) {
  const scale = TILE * 2 ** zoom
  const s = Math.min(Math.max(Math.sin(toRad(lat)), -0.9999), 0.9999)
  return { x: ((lng + 180) / 360) * scale, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale }
}
function unproject(x, y, zoom) {
  const scale = TILE * 2 ** zoom
  const lng = (x / scale) * 360 - 180
  const n = Math.PI - (2 * Math.PI * y) / scale
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  return new LatLng(lat, lng)
}

// ---------- spherical geometry ----------
function computeDistanceBetween(a, b) {
  const p = ll(a); const q = ll(b)
  const dLat = toRad(q.lat() - p.lat()); const dLng = toRad(q.lng() - p.lng())
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(p.lat())) * Math.cos(toRad(q.lat())) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}
function pathArray(path) { return Array.isArray(path) ? path : path?.getArray?.() || [] }
function computeLength(path) {
  const arr = pathArray(path); let t = 0
  for (let i = 1; i < arr.length; i += 1) t += computeDistanceBetween(arr[i - 1], arr[i])
  return t
}
function interpolate(a, b, f) {
  const p = ll(a); const q = ll(b)
  return new LatLng(p.lat() + (q.lat() - p.lat()) * f, p.lng() + (q.lng() - p.lng()) * f)
}
function computeHeading(a, b) {
  const p = ll(a); const q = ll(b)
  const φ1 = toRad(p.lat()); const φ2 = toRad(q.lat()); const Δλ = toRad(q.lng() - p.lng())
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 540) % 360 - 180
}
function computeOffset(from, distance, heading) {
  const p = ll(from); const δ = distance / R; const θ = toRad(heading)
  const φ1 = toRad(p.lat()); const λ1 = toRad(p.lng())
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ))
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2))
  return new LatLng((φ2 * 180) / Math.PI, (λ2 * 180) / Math.PI)
}

// ---------- overlays ----------
const SymbolPath = { CIRCLE: 0, FORWARD_CLOSED_ARROW: 1, FORWARD_OPEN_ARROW: 2, BACKWARD_CLOSED_ARROW: 3, BACKWARD_OPEN_ARROW: 4 }
const BUILTIN_PATHS = {
  1: 'M 0 -2.9 L 2.4 2.8 L 0 1.4 L -2.4 2.8 Z',
  2: 'M -2.4 2.8 L 0 -2.9 L 2.4 2.8',
  3: 'M 0 2.9 L 2.4 -2.8 L 0 -1.4 L -2.4 -2.8 Z',
  4: 'M -2.4 -2.8 L 0 2.9 L 2.4 -2.8',
}
const PATH_CACHE = new Map()
function getPath2D(path) {
  const key = typeof path === 'number' ? BUILTIN_PATHS[path] : path
  if (!PATH_CACHE.has(key)) PATH_CACHE.set(key, new Path2D(key))
  return PATH_CACHE.get(key)
}

class Overlay extends MVCObject {
  constructor(opts) { super(); this._map = null; this.setValues(opts || {}) }
  _changed(k) {
    if (k === 'map') {
      const next = this._v.map || null
      if (this._map && this._map !== next) this._map._remove(this)
      this._map = next
      if (next) next._add(this)
    } else this._map?._invalidate()
  }
  setMap(m) { this.set('map', m) }
  getMap() { return this._v.map || null }
  getVisible() { return this._v.visible !== false }
  setVisible(v) { this.set('visible', v) }
}

class Marker extends Overlay {
  setPosition(p) { this.set('position', ll(p)) }
  getPosition() { return ll(this._v.position) }
  setIcon(i) { this.set('icon', i) }
  getIcon() { return this._v.icon }
  setTitle(t) { this.set('title', t) }
  getTitle() { return this._v.title }
  setLabel(l) { this.set('label', l) }
  getLabel() { return this._v.label }
  setZIndex(z) { this.set('zIndex', z) }
  getZIndex() { return this._v.zIndex }
  setOpacity(o) { this.set('opacity', o) }
  setClickable(c) { this.set('clickable', c) }
  setDraggable() {}
  setAnimation() {}
}

class Polyline extends Overlay {
  setPath(p) { this.set('path', pathArray(p).map(ll)) }
  getPath() { const arr = (this._v.path || []).map(ll); return { getArray: () => arr, getLength: () => arr.length, getAt: (i) => arr[i], forEach: (f) => arr.forEach(f) } }
  _changed(k) {
    if (k === 'path' && this._v.path) this._v.path = pathArray(this._v.path).map(ll)
    super._changed(k)
  }
}
class Polygon extends Polyline {}
class Circle extends Overlay {}
class TrafficLayer extends Overlay {}
class OverlayView extends MVCObject { setMap() {} getMap() { return null } getPanes() { return null } getProjection() { return null } }

class InfoWindow extends MVCObject {
  constructor(opts) { super(); this.setValues(opts || {}); this._el = null; this._mapObj = null }
  setContent(c) { this.set('content', c); this._render() }
  getContent() { return this._v.content }
  setPosition(p) { this.set('position', ll(p)); this._mapObj?._invalidate() }
  open(arg, anchorArg) {
    let map = arg; let anchor = anchorArg
    if (arg && !(arg instanceof GMap) && typeof arg === 'object') { map = arg.map; anchor = arg.anchor }
    if (!map && anchor) map = anchor.getMap()
    if (!map) return
    this.close()
    this._mapObj = map; this._anchor = anchor || null
    map._infoWindows.add(this)
    this._el = document.createElement('div')
    this._el.style.cssText = 'position:absolute;z-index:100;transform:translate(-50%,-100%);pointer-events:auto;'
    const c = document.createElement('div'); c.className = 'gm-style-iw-c'
    c.style.cssText = 'position:relative;background:#fff;border-radius:8px;box-shadow:0 2px 7px 1px rgba(0,0,0,.3);'
    const d = document.createElement('div'); d.className = 'gm-style-iw-d'
    const close = document.createElement('button'); close.className = 'gm-ui-hover-effect'; close.setAttribute('aria-label', 'Close')
    close.style.cssText = 'position:absolute;top:6px;right:6px;width:24px;height:24px;border:0;background:transparent;cursor:pointer;color:#333;font:18px/1 sans-serif;z-index:2;'
    close.textContent = '×'
    close.addEventListener('click', (e) => { e.stopPropagation(); this.close(); event.trigger(this, 'closeclick') })
    const tip = document.createElement('div')
    tip.style.cssText = 'width:0;height:0;margin:0 auto;border-left:9px solid transparent;border-right:9px solid transparent;border-top:10px solid rgba(12,17,24,.98);'
    c.appendChild(close); c.appendChild(d); this._el.appendChild(c); this._el.appendChild(tip)
    this._body = d
    this._el.addEventListener('mousedown', (e) => e.stopPropagation())
    this._el.addEventListener('wheel', (e) => e.stopPropagation())
    map._overlayLayer.appendChild(this._el)
    this._render(); map._positionInfoWindows()
    event.trigger(this, 'domready')
  }
  _render() {
    if (!this._body) return
    const c = this._v.content
    this._body.innerHTML = ''
    if (c instanceof Node) this._body.appendChild(c)
    else this._body.innerHTML = c == null ? '' : String(c)
  }
  _anchorPos() { return this._anchor ? this._anchor.getPosition() : ll(this._v.position) }
  close() {
    if (this._el) this._el.remove()
    this._el = null; this._body = null
    this._mapObj?._infoWindows.delete(this)
    this._mapObj = null
  }
}

// ---------- the map ----------
class GMap extends MVCObject {
  constructor(div, opts = {}) {
    super()
    this._div = div
    this._overlays = new Set()
    this._infoWindows = new Set()
    this._center = ll(opts.center) || new LatLng(37.5, -120)
    this._zoom = opts.zoom ?? 7
    this._bg = opts.backgroundColor || '#080a0f'
    this._pendingFit = null
    this._setupDom(opts)
    this._invalidate()
  }
  _setupDom(opts) {
    const div = this._div
    div.innerHTML = ''
    if (getComputedStyle(div).position === 'static') div.style.position = 'relative'
    const root = document.createElement('div')
    root.className = 'gm-style'
    root.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${this._bg};cursor:grab;font-family:Roboto,Arial,sans-serif;`
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;'
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;'
    overlay.addEventListener('mousedown', () => {})
    root.appendChild(canvas); root.appendChild(overlay)
    div.appendChild(root)
    this._root = root; this._canvas = canvas; this._overlayLayer = overlay
    // children of overlay layer should receive events
    const style = document.createElement('style')
    style.textContent = '.gm-style>div>div{pointer-events:auto}'
    root.appendChild(style)

    if (opts.zoomControl !== false) {
      const zc = document.createElement('div')
      zc.style.cssText = 'position:absolute;right:10px;bottom:24px;display:flex;flex-direction:column;background:#1b2028;border-radius:2px;box-shadow:0 1px 4px rgba(0,0,0,.4);z-index:5;'
      ;[['+', 1], ['−', -1]].forEach(([t, d], i) => {
        const b = document.createElement('button')
        b.textContent = t
        b.title = d > 0 ? 'Zoom in' : 'Zoom out'
        b.style.cssText = `width:40px;height:40px;border:0;background:transparent;color:#c9d1d9;font:500 22px/1 Roboto,Arial,sans-serif;cursor:pointer;${i ? 'border-top:1px solid #30363d;' : ''}`
        b.addEventListener('click', (e) => { e.stopPropagation(); this.setZoom(Math.round(this._zoom) + d) })
        b.addEventListener('mousedown', (e) => e.stopPropagation())
        zc.appendChild(b)
      })
      root.appendChild(zc)
    }
    const attrib = document.createElement('div')
    attrib.textContent = 'Map data: offline basemap'
    attrib.style.cssText = 'position:absolute;right:0;bottom:0;padding:1px 6px;font:10px Roboto,Arial,sans-serif;color:#6e7681;background:rgba(8,10,15,.6);z-index:5;pointer-events:none;'
    root.appendChild(attrib)

    let drag = null
    root.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return
      drag = { x: e.clientX, y: e.clientY, c: project(this._center.lat(), this._center.lng(), this._zoom), moved: false }
      root.style.cursor = 'grabbing'
    })
    window.addEventListener('mousemove', (e) => {
      if (!drag) { this._hover(e); return }
      const dx = e.clientX - drag.x; const dy = e.clientY - drag.y
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        if (!drag.moved) event.trigger(this, 'dragstart')
        drag.moved = true
      }
      if (drag.moved) {
        this._center = unproject(drag.c.x - dx, drag.c.y - dy, this._zoom)
        event.trigger(this, 'drag'); event.trigger(this, 'center_changed')
        this._invalidate()
      }
    })
    window.addEventListener('mouseup', (e) => {
      if (!drag) return
      const wasDrag = drag.moved
      drag = null; root.style.cursor = 'grab'
      if (wasDrag) { event.trigger(this, 'dragend'); this._idleSoon(); return }
      if (e.target !== canvas) return
      this._click(e)
    })
    root.addEventListener('wheel', (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left; const py = e.clientY - rect.top
      const before = this._toLatLng(px, py)
      this._zoom = Math.min(18, Math.max(3, this._zoom - e.deltaY * 0.0025))
      const c = project(before.lat(), before.lng(), this._zoom)
      this._center = unproject(c.x - (px - rect.width / 2), c.y - (py - rect.height / 2), this._zoom)
      event.trigger(this, 'zoom_changed'); event.trigger(this, 'center_changed')
      this._invalidate(); this._idleSoon()
    }, { passive: false })

    new ResizeObserver(() => {
      if (this._pendingFit && this._size().w > 0) { const [b, p] = this._pendingFit; this._pendingFit = null; this.fitBounds(b, p) }
      this._invalidate()
    }).observe(div)
  }
  _idleSoon() { clearTimeout(this._idleT); this._idleT = setTimeout(() => event.trigger(this, 'idle'), 150) }
  _size() { return { w: this._root.clientWidth, h: this._root.clientHeight } }
  _toPx(p) {
    const q = ll(p); const { w, h } = this._size()
    const c = project(this._center.lat(), this._center.lng(), this._zoom)
    const a = project(q.lat(), q.lng(), this._zoom)
    return { x: a.x - c.x + w / 2, y: a.y - c.y + h / 2 }
  }
  _toLatLng(x, y) {
    const { w, h } = this._size()
    const c = project(this._center.lat(), this._center.lng(), this._zoom)
    return unproject(c.x + x - w / 2, c.y + y - h / 2, this._zoom)
  }
  _add(o) { this._overlays.add(o); this._invalidate() }
  _remove(o) { this._overlays.delete(o); this._invalidate() }
  _invalidate() {
    if (this._raf) return
    this._raf = requestAnimationFrame(() => { this._raf = null; this._draw() })
  }

  getDiv() { return this._div }
  getCenter() { return this._center }
  getZoom() { return this._zoom }
  getBounds() {
    const { w, h } = this._size()
    return new LatLngBounds(this._toLatLng(0, h), this._toLatLng(w, 0))
  }
  getHeading() { return 0 }
  getTilt() { return 0 }
  setCenter(c) { this._center = ll(c); event.trigger(this, 'center_changed'); this._invalidate(); this._idleSoon() }
  panTo(c) { this.setCenter(c) }
  panBy(dx, dy) { const c = project(this._center.lat(), this._center.lng(), this._zoom); this.setCenter(unproject(c.x + dx, c.y + dy, this._zoom)) }
  setZoom(z) { this._zoom = Math.min(18, Math.max(3, Number(z))); event.trigger(this, 'zoom_changed'); this._invalidate(); this._idleSoon() }
  moveCamera(opts = {}) {
    if (opts.center) this._center = ll(opts.center)
    if (opts.zoom != null) this._zoom = Math.min(18, Math.max(3, opts.zoom))
    event.trigger(this, 'center_changed'); this._invalidate()
  }
  setOptions(o = {}) { if (o.center) this.setCenter(o.center); if (o.zoom != null) this.setZoom(o.zoom) }
  setMapTypeId() {}
  fitBounds(bounds, padding = 0) {
    const b = bounds instanceof LatLngBounds ? bounds : new LatLngBounds({ lat: bounds.south, lng: bounds.west }, { lat: bounds.north, lng: bounds.east })
    if (b.isEmpty()) return
    const { w, h } = this._size()
    if (!w || !h) { this._pendingFit = [b, padding]; return }
    const pad = typeof padding === 'number' ? { top: padding, bottom: padding, left: padding, right: padding } : { top: 0, bottom: 0, left: 0, right: 0, ...padding }
    const aw = Math.max(w - pad.left - pad.right, 40); const ah = Math.max(h - pad.top - pad.bottom, 40)
    let z = 18
    for (; z > 2; z -= 1) {
      const a = project(b.n, b.w, z); const c = project(b.s, b.e, z)
      if (c.x - a.x <= aw && c.y - a.y <= ah) break
    }
    this._zoom = z
    const a = project(b.n, b.w, z); const c = project(b.s, b.e, z)
    const cx = (a.x + c.x) / 2 - (pad.left - pad.right) / 2; const cy = (a.y + c.y) / 2 - (pad.top - pad.bottom) / 2
    this._center = unproject(cx, cy, z)
    event.trigger(this, 'zoom_changed'); event.trigger(this, 'center_changed'); event.trigger(this, 'bounds_changed')
    this._invalidate(); this._idleSoon()
  }

  _visibleMarkers() {
    return [...this._overlays].filter((o) => o instanceof Marker && o.getVisible() && o._v.position)
      .sort((a, b) => (a._v.zIndex || 0) - (b._v.zIndex || 0))
  }
  _hitTest(x, y) {
    const markers = this._visibleMarkers().reverse()
    for (const m of markers) {
      if (m._v.clickable === false) continue
      const p = this._toPx(m._v.position)
      const s = Math.max(8, (m._v.icon?.scale || 1) * 6)
      if (Math.abs(p.x - x) <= s && Math.abs(p.y - y) <= s) return m
    }
    for (const o of this._overlays) {
      if (!(o instanceof Polyline) || o._v.clickable === false) continue
      const path = o._v.path || []
      for (let i = 1; i < path.length; i += 1) {
        const a = this._toPx(path[i - 1]); const b = this._toPx(path[i])
        if (distToSeg(x, y, a, b) < 6) return o
      }
    }
    return null
  }
  _hover(e) {
    const rect = this._canvas.getBoundingClientRect()
    const x = e.clientX - rect.left; const y = e.clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
    const hit = this._hitTest(x, y)
    this._root.style.cursor = hit ? 'pointer' : 'grab'
    this._canvas.title = hit instanceof Marker ? hit._v.title || '' : ''
  }
  _click(e) {
    const rect = this._canvas.getBoundingClientRect()
    const x = e.clientX - rect.left; const y = e.clientY - rect.top
    const hit = this._hitTest(x, y)
    const latLng = this._toLatLng(x, y)
    if (hit) event.trigger(hit, 'click', { latLng, domEvent: e, stop() {} })
    else event.trigger(this, 'click', { latLng, domEvent: e, stop() {} })
  }
  _positionInfoWindows() {
    this._infoWindows.forEach((iw) => {
      if (!iw._el) return
      const pos = iw._anchorPos(); if (!pos) return
      const p = this._toPx(pos)
      const lift = iw._anchor ? 14 : 0
      iw._el.style.left = `${p.x}px`; iw._el.style.top = `${p.y - lift}px`
    })
  }

  _draw() {
    const { w, h } = this._size()
    if (!w || !h) return
    const dpr = window.devicePixelRatio || 1
    const cv = this._canvas
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawBasemap(this, ctx, w, h)
    const traffic = [...this._overlays].some((o) => o instanceof TrafficLayer)
    if (traffic) drawTraffic(this, ctx)

    for (const o of this._overlays) if (o instanceof Polyline && o.getVisible()) drawPolyline(this, ctx, o)
    for (const m of this._visibleMarkers()) drawMarker(this, ctx, m)
    this._positionInfoWindows()
  }
}

function distToSeg(x, y, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y
  const t = dx || dy ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy))) : 0
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy))
}

function ringPath(map, ctx, ring) {
  ring.forEach(([lat, lng], i) => { const p = map._toPx({ lat, lng }); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y) })
}

function drawBasemap(map, ctx, w, h) {
  const z = map._zoom
  ctx.fillStyle = '#08111d'
  ctx.fillRect(0, 0, w, h)
  ctx.beginPath(); ringPath(map, ctx, LAND); ctx.closePath()
  ctx.fillStyle = '#0b0f14'; ctx.fill()

  // subtle terrain shading for the Sierra Nevada spine
  const sierra = [[40.3, -121.3], [39.4, -120.6], [38.6, -120.2], [37.9, -119.7], [37.2, -119.1], [36.4, -118.5], [35.6, -118.3]]
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(40, 52, 64, 0.22)'
  ctx.lineWidth = Math.max(18, 0.9 * 2 ** z / 1.2)
  ctx.beginPath(); ringPath(map, ctx, sierra); ctx.stroke(); ctx.restore()

  PARKS.forEach((park) => {
    ctx.beginPath(); ringPath(map, ctx, park.ring); ctx.closePath()
    ctx.fillStyle = park.forest ? 'rgba(15, 23, 18, 0.55)' : '#0f1712'; ctx.fill()
    ctx.strokeStyle = park.forest ? 'rgba(63,185,80,0.08)' : 'rgba(63,185,80,0.22)'; ctx.lineWidth = 1; ctx.stroke()
  })

  ctx.fillStyle = '#08111d'
  WATER.forEach((ring) => { ctx.beginPath(); ringPath(map, ctx, ring); ctx.closePath(); ctx.fill() })
  ctx.strokeStyle = 'rgba(88,166,255,0.12)'; ctx.lineWidth = 1
  ctx.beginPath(); ringPath(map, ctx, COAST); ctx.stroke()

  // graticule
  ctx.strokeStyle = 'rgba(139,148,158,0.05)'; ctx.lineWidth = 1
  const step = z >= 10 ? 0.1 : z >= 8 ? 0.5 : 1
  const tl = map._toLatLng(0, 0); const br = map._toLatLng(w, h)
  ctx.beginPath()
  for (let lng = Math.ceil(tl.lng() / step) * step; lng < br.lng(); lng += step) { const p = map._toPx({ lat: tl.lat(), lng }); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, h) }
  for (let lat = Math.floor(tl.lat() / step) * step; lat > br.lat(); lat -= step) { const p = map._toPx({ lat, lng: tl.lng() }); ctx.moveTo(0, p.y); ctx.lineTo(w, p.y) }
  ctx.stroke()

  ctx.setLineDash([6, 4]); ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1.2
  STATE_LINES.forEach((line) => { ctx.beginPath(); ringPath(map, ctx, line); ctx.stroke() })
  ctx.setLineDash([])

  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  HIGHWAYS.forEach((hw) => {
    if (!hw.major && z < 7) return
    ctx.beginPath(); ringPath(map, ctx, hw.points)
    ctx.strokeStyle = '#161b22'; ctx.lineWidth = hw.major ? 5 : 3.5; ctx.stroke()
    ctx.strokeStyle = hw.major ? '#24313d' : '#1f2a34'; ctx.lineWidth = hw.major ? 3 : 2; ctx.stroke()
  })

  // highway shields
  if (z >= 7) {
    ctx.font = '600 9px Roboto, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    HIGHWAYS.forEach((hw) => {
      if (/Rd$/.test(hw.name)) return
      const mid = hw.points[Math.floor(hw.points.length / 2)]
      const p = map._toPx({ lat: mid[0], lng: mid[1] })
      if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) return
      const tw = ctx.measureText(hw.name).width + 8
      ctx.fillStyle = '#161b22'; ctx.fillRect(p.x - tw / 2, p.y - 7, tw, 14)
      ctx.strokeStyle = '#30363d'; ctx.strokeRect(p.x - tw / 2, p.y - 7, tw, 14)
      ctx.fillStyle = '#8b949e'; ctx.fillText(hw.name, p.x, p.y)
    })
  }

  const maxRank = z < 6 ? 1 : z < 7 ? 2 : z < 8 ? 3 : z < 10 ? 4 : 5
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  PLACES.forEach((pl) => {
    if (pl.rank > maxRank) return
    const p = map._toPx(pl)
    if (p.x < -60 || p.y < -20 || p.x > w + 60 || p.y > h + 20) return
    ctx.font = `${pl.rank <= 1 ? 600 : 500} ${pl.rank <= 1 ? 12 : pl.rank <= 3 ? 11 : 10}px Roboto, Arial, sans-serif`
    const color = pl.water ? '#58a6ff' : pl.park ? '#3fb950' : '#8b949e'
    ctx.lineWidth = 3; ctx.strokeStyle = '#0b0f14'
    if (!pl.water) { ctx.fillStyle = color; ctx.globalAlpha = 0.6; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); ctx.globalAlpha = 1 }
    const ty = pl.water ? p.y : p.y + 10
    ctx.strokeText(pl.name, p.x, ty); ctx.fillStyle = color; ctx.fillText(pl.name, p.x, ty)
  })
  const yose = PARKS[0]
  if (z >= 8) {
    const p = map._toPx({ lat: 37.88, lng: -119.55 })
    ctx.font = 'italic 500 11px Roboto, Arial, sans-serif'; ctx.fillStyle = 'rgba(63,185,80,0.7)'
    ctx.fillText(yose.name, p.x, p.y)
  }
}

function drawTraffic(map, ctx) {
  ctx.save(); ctx.lineCap = 'round'
  HIGHWAYS.forEach((hw, hi) => {
    for (let i = 1; i < hw.points.length; i += 1) {
      const a = map._toPx({ lat: hw.points[i - 1][0], lng: hw.points[i - 1][1] })
      const b = map._toPx({ lat: hw.points[i][0], lng: hw.points[i][1] })
      const k = (hi * 7 + i * 3) % 11
      ctx.strokeStyle = k === 0 ? '#e5534b' : k < 3 ? '#e3b341' : '#3fb950'
      ctx.globalAlpha = 0.75; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    }
  })
  ctx.restore()
}

function polyLengthPx(pts) { let t = 0; for (let i = 1; i < pts.length; i += 1) t += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return t }

function drawPolyline(map, ctx, o) {
  const v = o._v; const path = v.path || []
  if (path.length < 2) return
  const pts = path.map((p) => map._toPx(p))
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const so = v.strokeOpacity ?? 1
  if (so > 0) {
    ctx.globalAlpha = so; ctx.strokeStyle = v.strokeColor || '#000'; ctx.lineWidth = v.strokeWeight ?? 3
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke()
  }
  ;(v.icons || []).forEach((entry) => {
    const icon = entry.icon || {}
    const len = polyLengthPx(pts)
    const repeat = parseUnit(entry.repeat, len) || 0
    const offset = parseUnit(entry.offset, len) || 0
    const scale = icon.scale ?? (v.strokeWeight || 2)
    ctx.globalAlpha = icon.strokeOpacity ?? 1
    ctx.strokeStyle = icon.strokeColor || v.strokeColor || '#000'
    ctx.lineWidth = icon.strokeWeight ?? (v.strokeWeight || 2)
    if (icon.path === 'M 0,-1 0,1' && repeat > 0) {
      const dash = Math.max(scale * 2, 1)
      ctx.setLineDash([dash, Math.max(repeat - dash, 1)]); ctx.lineDashOffset = -(offset - dash / 2)
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke()
      ctx.setLineDash([])
    }
  })
  ctx.restore()
}
function parseUnit(val, len) {
  if (val == null) return 0
  const s = String(val)
  if (s.endsWith('%')) return (parseFloat(s) / 100) * len
  return parseFloat(s) || 0
}

function drawMarker(map, ctx, m) {
  const v = m._v; const p = map._toPx(v.position)
  const { w, h } = map._size()
  if (p.x < -50 || p.y < -50 || p.x > w + 50 || p.y > h + 50) return
  const icon = v.icon
  ctx.save(); ctx.globalAlpha = v.opacity ?? 1
  if (icon && typeof icon === 'object' && icon.path != null) {
    const scale = icon.scale ?? 1
    ctx.translate(p.x, p.y)
    ctx.rotate(toRad(icon.rotation || 0))
    const ax = icon.anchor?.x || 0; const ay = icon.anchor?.y || 0
    if (icon.path === SymbolPath.CIRCLE) {
      if (scale > 0) {
        ctx.beginPath(); ctx.arc(-ax * scale, -ay * scale, scale, 0, Math.PI * 2)
        if (icon.fillOpacity) { ctx.globalAlpha = (v.opacity ?? 1) * icon.fillOpacity; ctx.fillStyle = icon.fillColor || '#000'; ctx.fill() }
        if ((icon.strokeOpacity ?? 1) > 0) { ctx.globalAlpha = (v.opacity ?? 1) * (icon.strokeOpacity ?? 1); ctx.strokeStyle = icon.strokeColor || '#000'; ctx.lineWidth = icon.strokeWeight ?? 1; ctx.stroke() }
      }
    } else {
      ctx.save(); ctx.scale(scale, scale); ctx.translate(-ax, -ay)
      const path = getPath2D(icon.path)
      if (icon.fillOpacity) { ctx.globalAlpha = (v.opacity ?? 1) * icon.fillOpacity; ctx.fillStyle = icon.fillColor || '#000'; ctx.fill(path) }
      ctx.restore()
      ctx.save(); ctx.scale(scale, scale); ctx.translate(-ax, -ay)
      ctx.globalAlpha = (v.opacity ?? 1) * (icon.strokeOpacity ?? 1)
      ctx.strokeStyle = icon.strokeColor || '#000'; ctx.lineWidth = (icon.strokeWeight ?? 1) / scale; ctx.lineJoin = 'round'
      if ((icon.strokeWeight ?? 1) > 0) ctx.stroke(path)
      ctx.restore()
    }
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0)
  } else {
    // default red pin
    ctx.translate(p.x, p.y)
    ctx.fillStyle = '#ea4335'; ctx.beginPath(); ctx.arc(0, -16, 7, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(0, 0); ctx.lineTo(6, -12); ctx.fill()
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0)
  }
  const label = v.label
  if (label) {
    const text = typeof label === 'string' ? label : label.text
    if (text) {
      const lo = icon?.labelOrigin; const sc = icon?.scale ?? 1
      const lx = p.x + (lo ? lo.x * sc : 0); const ly = p.y + (lo ? lo.y * sc : 0)
      ctx.globalAlpha = 1
      ctx.font = `${label.fontWeight || 600} ${label.fontSize || '11px'} ${label.fontFamily || 'Roboto, Arial, sans-serif'}`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.lineWidth = 3; ctx.strokeStyle = '#0b0f14'; ctx.strokeText(text, lx, ly)
      ctx.fillStyle = label.color || '#c9d1d9'; ctx.fillText(text, lx, ly)
    }
  }
  ctx.restore()
}

// ---------- services ----------
const graph = buildRoadGraph()
function buildRoadGraph() {
  const nodes = []
  const find = (lat, lng) => {
    for (let i = 0; i < nodes.length; i += 1) if (Math.abs(nodes[i].lat - lat) < 0.035 && Math.abs(nodes[i].lng - lng) < 0.035) return i
    nodes.push({ lat, lng, edges: [] }); return nodes.length - 1
  }
  HIGHWAYS.forEach((hw) => {
    let prev = null
    hw.points.forEach(([lat, lng]) => {
      const id = find(lat, lng)
      if (prev != null && prev !== id) {
        const d = computeDistanceBetween(nodes[prev], nodes[id]) * (hw.major ? 1 : 1.18)
        nodes[prev].edges.push([id, d]); nodes[id].edges.push([prev, d])
      }
      prev = id
    })
  })
  return nodes
}
function nearestNode(p) {
  let best = 0; let bd = Infinity
  graph.forEach((n, i) => { const d = computeDistanceBetween(n, p); if (d < bd) { bd = d; best = i } })
  return best
}
function shortestPath(a, b) {
  const dist = new Array(graph.length).fill(Infinity); const prev = new Array(graph.length).fill(-1); const done = new Set()
  dist[a] = 0
  while (done.size < graph.length) {
    let u = -1; let ud = Infinity
    for (let i = 0; i < graph.length; i += 1) if (!done.has(i) && dist[i] < ud) { ud = dist[i]; u = i }
    if (u < 0 || u === b) break
    done.add(u)
    graph[u].edges.forEach(([v, d]) => { if (dist[u] + d < dist[v]) { dist[v] = dist[u] + d; prev[v] = u } })
  }
  const out = []
  for (let u = b; u !== -1; u = prev[u]) out.unshift(graph[u])
  return out[0] === graph[a] ? out : [graph[a], graph[b]]
}
function routeLeg(from, to) {
  const f = ll(from).toJSON(); const t = ll(to).toJSON()
  const direct = computeDistanceBetween(f, t)
  let pts
  if (direct < 25000) pts = [f, t]
  else {
    const chain = shortestPath(nearestNode(f), nearestNode(t)).map((n) => ({ lat: n.lat, lng: n.lng }))
    pts = [f, ...chain, t]
  }
  const dense = []
  for (let i = 1; i < pts.length; i += 1) {
    const seg = computeDistanceBetween(pts[i - 1], pts[i]); const steps = Math.max(1, Math.round(seg / 4000))
    for (let s = 0; s < steps; s += 1) dense.push(interpolate(pts[i - 1], pts[i], s / steps))
  }
  dense.push(new LatLng(t))
  const meters = Math.round(computeLength(dense) * 1.06)
  const mountain = (p) => p.lng() > -120.5 && p.lng() < -119.3 && p.lat() > 37.4 && p.lat() < 38.4
  const mtnShare = dense.filter(mountain).length / dense.length
  const mps = 29 * (1 - mtnShare) + 15 * mtnShare
  const seconds = Math.round(meters / mps + 240)
  return { path: dense, meters, seconds }
}
function fmtDuration(s) { const m = Math.round(s / 60); const h = Math.floor(m / 60); return h ? `${h} hr${h > 1 ? 's' : ''} ${m % 60} min` : `${m} min` }
function fmtDistance(m) { const mi = m / 1609.344; return `${mi >= 10 ? Math.round(mi) : mi.toFixed(1)} mi` }

class DirectionsService {
  route(req, cb) {
    const stops = [req.origin, ...(req.waypoints || []).map((w) => w.location), req.destination].map((p) => ll(typeof p === 'object' && p.location ? p.location : p))
    const legs = []; let path = []
    for (let i = 1; i < stops.length; i += 1) {
      const leg = routeLeg(stops[i - 1], stops[i])
      path = path.concat(i > 1 ? leg.path.slice(1) : leg.path)
      legs.push({ distance: { value: leg.meters, text: fmtDistance(leg.meters) }, duration: { value: leg.seconds, text: fmtDuration(leg.seconds) }, start_location: stops[i - 1], end_location: stops[i], steps: [] })
    }
    // Google merges stopover:false waypoints into a single leg
    const viaOnly = (req.waypoints || []).every((w) => w.stopover === false)
    const finalLegs = viaOnly && legs.length > 1
      ? [{ distance: { value: legs.reduce((a, l) => a + l.distance.value, 0), text: fmtDistance(legs.reduce((a, l) => a + l.distance.value, 0)) }, duration: { value: legs.reduce((a, l) => a + l.duration.value, 0), text: fmtDuration(legs.reduce((a, l) => a + l.duration.value, 0)) }, start_location: stops[0], end_location: stops[stops.length - 1], steps: [] }]
      : legs
    const result = { status: 'OK', geocoded_waypoints: [], request: req, routes: [{ overview_path: path, legs: finalLegs, summary: 'CA-120 E', warnings: [], bounds: path.reduce((b, p) => b.extend(p), new LatLngBounds()) }] }
    const p = new Promise((resolve) => setTimeout(() => { cb?.(result, 'OK'); resolve(result) }, 40))
    return p
  }
}

const PlacesServiceStatus = { OK: 'OK', ZERO_RESULTS: 'ZERO_RESULTS', REQUEST_DENIED: 'REQUEST_DENIED', INVALID_REQUEST: 'INVALID_REQUEST', NOT_FOUND: 'NOT_FOUND', OVER_QUERY_LIMIT: 'OVER_QUERY_LIMIT', UNKNOWN_ERROR: 'UNKNOWN_ERROR' }
function normalize(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() }
function lookupPlace(query) {
  const q = normalize(query)
  return PLACE_RECORDS.find((r) => normalize(r.query) === q) || PLACE_RECORDS.find((r) => q.includes(normalize(r.name)))
}
function toPlaceResult(r, fields) {
  const out = { place_id: r.place_id, name: r.name, formatted_address: r.formatted_address, geometry: { location: new LatLng(r.lat, r.lng) } }
  if (!fields || fields.includes('formatted_phone_number')) out.formatted_phone_number = r.phone
  if (!fields || fields.includes('website')) out.website = r.website
  if (!fields || fields.includes('rating')) out.rating = r.rating
  if (!fields || fields.includes('user_ratings_total')) out.user_ratings_total = r.user_ratings_total
  if (!fields || fields.includes('opening_hours')) out.opening_hours = { weekday_text: r.hours, open_now: true }
  if (!fields || fields.includes('photos')) out.photos = (r.photos || []).map((url) => ({ getUrl: () => url, height: 600, width: 900, html_attributions: [] }))
  return out
}
class PlacesService {
  constructor() {}
  findPlaceFromQuery(req, cb) {
    const r = lookupPlace(req.query)
    setTimeout(() => (r ? cb([toPlaceResult(r, ['name'])], 'OK') : cb(null, 'ZERO_RESULTS')), 30)
  }
  textSearch(req, cb) { this.findPlaceFromQuery(req, cb) }
  getDetails(req, cb) {
    const r = PLACE_RECORDS.find((x) => x.place_id === req.placeId)
    setTimeout(() => (r ? cb(toPlaceResult(r, req.fields), 'OK') : cb(null, 'NOT_FOUND')), 30)
  }
}

// ---------- namespace ----------
const TravelMode = { DRIVING: 'DRIVING', WALKING: 'WALKING', BICYCLING: 'BICYCLING', TRANSIT: 'TRANSIT' }
const maps = {
  version: '3.58-offline',
  LatLng, LatLngBounds, Point, Size, MVCObject, event,
  Map: GMap, Marker, Polyline, Polygon, Circle, InfoWindow, TrafficLayer, OverlayView,
  SymbolPath, TravelMode,
  MapTypeId: { ROADMAP: 'roadmap', TERRAIN: 'terrain', SATELLITE: 'satellite', HYBRID: 'hybrid' },
  ControlPosition: { TOP_LEFT: 1, TOP_RIGHT: 3, BOTTOM_LEFT: 10, BOTTOM_RIGHT: 12, RIGHT_BOTTOM: 9 },
  DirectionsService, DirectionsStatus: { OK: 'OK', ZERO_RESULTS: 'ZERO_RESULTS', REQUEST_DENIED: 'REQUEST_DENIED' },
  geometry: { spherical: { computeDistanceBetween, computeLength, interpolate, computeHeading, computeOffset } },
  places: { PlacesService, PlacesServiceStatus },
}
maps.importLibrary = async (name) => {
  if (name === 'geometry') return maps.geometry
  if (name === 'places') return maps.places
  if (name === 'marker') return { Marker }
  if (name === 'routes') return { DirectionsService }
  if (name === 'core') return { LatLng, LatLngBounds, Point, event }
  return maps
}

export function installGoogleMapsStub() {
  if (typeof window === 'undefined') return
  window.google = window.google || {}
  window.google.maps = maps
}
