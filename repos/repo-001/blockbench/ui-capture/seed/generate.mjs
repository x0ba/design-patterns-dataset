// Generates seed data for the Blockbench web app UI capture:
//  - projects.json: several .bbmodel (format 5.0) projects with pixel-art textures,
//    groups, cubes, animations; stored as Blockbench auto-backups (IndexedDB)
//  - local_storage.json: settings / palette / UI state of a long-time user
//  - session.json: which tab is focused after restore
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const OUT = process.argv[2] || path.join(import.meta.dirname, 'out');
fs.mkdirSync(OUT, {recursive: true});

// ---------- deterministic random ----------
let seed = 1337;
function rand() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function uuid() {
	const b = Array.from({length: 16}, () => Math.floor(rand() * 256));
	b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
	const h = b.map(x => x.toString(16).padStart(2, '0')).join('');
	return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

// ---------- PNG ----------
const crcTable = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
	const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
	const td = Buffer.concat([Buffer.from(type), data]);
	const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
	return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, px) {
	const raw = Buffer.alloc((w * 4 + 1) * h);
	for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
	const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
	return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
class Canvas {
	constructor(w, h) { this.w = w; this.h = h; this.px = Buffer.alloc(w * h * 4); }
	set(x, y, [r, g, b, a = 255]) {
		if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
		const i = (y * this.w + x) * 4; this.px[i] = clamp(r); this.px[i+1] = clamp(g); this.px[i+2] = clamp(b); this.px[i+3] = a;
	}
	dataURL() { return 'data:image/png;base64,' + encodePNG(this.w, this.h, this.px).toString('base64'); }
}
const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
function shade(c, f) { return c.map(v => v * f); }
function jitter(c, amt) { const j = (rand() - 0.5) * amt; return c.map(v => v + j); }

// surface painters: (canvas, face, x0, y0, w, h, base) -> void
const painters = {
	fur(cv, face, x0, y0, w, h, base, opt = {}) {
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
			let c = jitter(base, 26);
			if (opt.belly && (face === 'down')) c = jitter(hex(opt.belly), 18);
			if (opt.stripe && (Math.floor((x + (face === 'up' ? 0 : y)) / opt.stripe) % 2 === 0) && face !== 'down') c = jitter(hex(opt.stripeColor), 18);
			cv.set(x0 + x, y0 + y, c);
		}
	},
	wood(cv, face, x0, y0, w, h, base) {
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
			let c = jitter(base, 14);
			if ((face === 'up' || face === 'down' ? x : y) % 4 === 3) c = shade(c, 0.78);
			if (rand() < 0.04) c = shade(c, 0.7);
			cv.set(x0 + x, y0 + y, c);
		}
	},
	metal(cv, face, x0, y0, w, h, base) {
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
			let c = jitter(base, 10);
			if (x === 0 || y === 0) c = shade(c, 1.18);
			if (x === w - 1 || y === h - 1) c = shade(c, 0.75);
			if (rand() < 0.06) c = jitter(hex('#5fa48a'), 20); // patina
			cv.set(x0 + x, y0 + y, c);
		}
	},
	cloth(cv, face, x0, y0, w, h, base) {
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
			let c = jitter(base, 10);
			if ((x + y) % 2 === 0) c = shade(c, 0.93);
			if (y === h - 1) c = shade(c, 0.8);
			cv.set(x0 + x, y0 + y, c);
		}
	},
	skin(cv, face, x0, y0, w, h, base) {
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cv.set(x0 + x, y0 + y, jitter(base, 12));
	},
	stone(cv, face, x0, y0, w, h, base) {
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
			let c = jitter(base, 30);
			if ((y % 5 === 4) || ((x + (Math.floor(y / 5) % 2) * 3) % 7 === 6)) c = shade(c, 0.7);
			cv.set(x0 + x, y0 + y, c);
		}
	},
	glow(cv, face, x0, y0, w, h, base) {
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
			const d = Math.hypot(x - w / 2 + 0.5, y - h / 2 + 0.5) / Math.max(1, Math.max(w, h) / 2);
			cv.set(x0 + x, y0 + y, shade(jitter(base, 10), 1.25 - d * 0.4));
		}
	},
};
const FACE_LIGHT = {up: 1.12, down: 0.72, north: 1.0, south: 0.9, east: 0.95, west: 0.86};

// ---------- model builder ----------
class Model {
	constructor({name, format, tw = 64, th = 64, box_uv = true, identifier = '', created}) {
		this.name = name; this.format = format; this.tw = tw; this.th = th; this.box_uv = box_uv;
		this.identifier = identifier; this.created = created;
		this.elements = []; this.outliner = []; this.groups = {}; this.animations = [];
		this.canvas = new Canvas(tw, th);
		this.shelf = {x: 0, y: 0, h: 0};
		this.extraTextures = [];
		this.display = undefined;
		this.view = null; this.selected = [];
	}
	group(name, origin, opt = {}) {
		const g = {name, origin, rotation: opt.rotation || [0,0,0], color: opt.color ?? 0, uuid: uuid(), export: true, mirror_uv: false, isOpen: opt.open ?? false, locked: false, visibility: true, autouv: 0, children: []};
		(opt.parent ? this.groups[opt.parent].children : this.outliner).push(g);
		this.groups[name] = g;
		return g;
	}
	pack(fw, fh) {
		const s = this.shelf;
		if (s.x + fw > this.tw) { s.x = 0; s.y += s.h; s.h = 0; }
		const pos = [s.x, s.y]; s.x += fw; s.h = Math.max(s.h, fh);
		if (s.y + fh > this.th) console.warn(`[${this.name}] texture overflow for ${fw}x${fh}`);
		return pos;
	}
	cube(name, from, to, opt = {}) {
		const size = [to[0]-from[0], to[1]-from[1], to[2]-from[2]].map(v => Math.max(0, v));
		const [w, h, d] = size.map(v => Math.ceil(v));
		const el = {
			name, box_uv: this.box_uv, rescale: false, locked: false, render_order: 'default', allow_mirror_modeling: true,
			from, to, autouv: 0, color: opt.color ?? Math.floor(rand() * 8),
			origin: opt.origin || [(from[0]+to[0])/2, from[1], (from[2]+to[2])/2],
			rotation: opt.rotation, inflate: opt.inflate, mirror_uv: opt.mirror || undefined,
			faces: {}, type: 'cube', uuid: uuid(),
		};
		if (this.box_uv) {
			const fw = 2 * (d + w), fh = d + h;
			const [u, v] = opt.uv || this.pack(fw, fh);
			el.uv_offset = [u, v];
			const rects = {
				up: [u + d, v, w, d], down: [u + d + w, v, w, d],
				east: [u, v + d, d, h], north: [u + d, v + d, w, h], west: [u + d + w, v + d, d, h], south: [u + 2*d + w, v + d, w, h],
			};
			const uvs = {
				north: [u+d, v+d, u+d+w, v+d+h], east: [u, v+d, u+d, v+d+h], south: [u+2*d+w, v+d, u+2*d+2*w, v+d+h],
				west: [u+d+w, v+d, u+2*d+w, v+d+h], up: [u+d+w, v+d, u+d, v], down: [u+d+2*w, v, u+d+w, v+d],
			};
			for (const f in uvs) el.faces[f] = {uv: uvs[f], texture: 0};
			if (!opt.uv && opt.paint !== false) {
				const base = hex(opt.colorHex || '#888888');
				for (const f in rects) {
					const [x0, y0, rw, rh] = rects[f];
					painters[opt.style || 'skin'](this.canvas, f, x0, y0, rw, rh, shade(base, FACE_LIGHT[f]), opt);
					if (opt.detail) opt.detail(this.canvas, f, x0, y0, rw, rh);
				}
			}
		} else {
			// per-face UV (java block style, 16x16 tiles)
			const tex = opt.texture ?? 0;
			const [x1, y1, z1] = from, [x2, y2, z2] = to;
			const uv = {
				north: [16 - x2, 16 - y2, 16 - x1, 16 - y1], south: [x1, 16 - y2, x2, 16 - y1],
				east: [16 - z2, 16 - y2, 16 - z1, 16 - y1], west: [z1, 16 - y2, z2, 16 - y1],
				up: [x1, z1, x2, z2], down: [x1, 16 - z2, x2, 16 - z1],
			};
			for (const f in uv) el.faces[f] = {uv: uv[f].map(v => Math.max(0, Math.min(16, Math.round(v * 100) / 100))), texture: tex};
			if (opt.cullface) for (const f of opt.cullface) el.faces[f].cullface = f;
		}
		if (opt.rotation === undefined) delete el.rotation;
		if (opt.inflate === undefined) delete el.inflate;
		if (opt.mirror === undefined) delete el.mirror_uv;
		this.elements.push(el);
		(opt.parent ? this.groups[opt.parent].children : this.outliner).push(el.uuid);
		return el;
	}
	tile(name, w, h, painter, base, opt = {}) {
		const cv = new Canvas(w, h);
		painters[painter](cv, 'north', 0, 0, w, h, hex(base), opt);
		this.extraTextures.push({name, cv});
	}
	animation(name, {loop = 'loop', length, bones, snapping = 24, override = false}) {
		const animators = {};
		for (const [bone, channels] of Object.entries(bones)) {
			const g = this.groups[bone];
			if (!g) throw new Error('no bone ' + bone);
			const keyframes = [];
			for (const [channel, frames] of Object.entries(channels)) {
				for (const [time, val, interp] of frames) {
					const dp = typeof val === 'string' ? {x: val, y: '0', z: '0'} : {x: String(val[0]), y: String(val[1]), z: String(val[2])};
					keyframes.push({channel, data_points: [dp], uuid: uuid(), time, color: -1, interpolation: interp || 'linear'});
				}
			}
			animators[g.uuid] = {name: bone, type: 'bone', keyframes};
		}
		this.animations.push({uuid: uuid(), name, loop, override, length, snapping, selected: false, anim_time_update: '', blend_weight: '', start_delay: '', loop_delay: '', animators});
	}
	compile() {
		const textures = [];
		const texBase = (name, src, w, h) => ({
			path: '', name, folder: '', namespace: '', id: String(textures.length), group: '', width: w, height: h, uv_width: this.box_uv ? this.tw : 16, uv_height: this.box_uv ? this.th : 16,
			particle: false, use_as_default: false, layers_enabled: false, sync_to_project: '', render_mode: 'default', render_sides: 'auto', pbr_channel: 'color',
			frame_time: 1, frame_order_type: 'loop', frame_order: '', frame_interpolate: false, visible: true, internal: true, saved: true, uuid: uuid(), source: src,
		});
		if (this.box_uv) textures.push(texBase(this.name + '.png', this.canvas.dataURL(), this.tw, this.th));
		for (const t of this.extraTextures) textures.push(texBase(t.name + '.png', t.cv.dataURL(), t.cv.w, t.cv.h));
		const m = {
			meta: {format_version: '5.0', model_format: this.format, box_uv: this.box_uv, backup: true},
			name: this.name, model_identifier: this.identifier, visible_box: [1, 1, 0], variable_placeholders: '', variable_placeholder_buttons: [], timeline_setups: [], unhandled_root_fields: {},
			resolution: {width: this.tw, height: this.th},
			elements: this.elements, outliner: this.outliner, textures,
		};
		if (this.animations.length) m.animations = this.animations;
		if (this.display) m.display = this.display;
		const v = this.view || {position: [-40, 32, -40], target: [0, 12, 0]};
		const cam = {position: v.position, target: v.target, orthographic: false, zoom: 1, angle: null};
		m.editor_state = {
			saved: true, added_models: 0, mode: "edit", tool: "move_tool", exploded_view: false,
			uv_viewport: {zoom: 1, offset: [0, 0]},
			previews: {main: cam},
			selected_elements: this.elements.filter(e => this.selected.includes(e.name)).map(e => e.uuid),
			selected_groups: [], mesh_selection: {}, selected_texture: textures[0]?.uuid,
		};
		return m;
	}
}

// eye / face detail helper
function eyes(color = '#1b1b1b', glint = '#ffffff', y = 2, spread = 1) {
	return (cv, f, x0, y0, w, h) => {
		if (f !== 'north') return;
		const cx = Math.floor(w / 2);
		for (const ex of [cx - 1 - spread, cx + spread]) { cv.set(x0 + ex, y0 + y, hex(color)); cv.set(x0 + ex, y0 + y - 1, hex(glint)); }
	};
}

const projects = [];
const DAY = 86400;
const NOW = Math.floor(Date.UTC(2026, 10, 17, 9, 40) / 1000);

// =============== 1. Red Panda (Bedrock entity) ===============
{
	const m = new Model({name: 'red_panda', format: 'bedrock', tw: 64, th: 64, identifier: 'geometry.cozyfauna.red_panda'});
	const RUST = '#b5532a', CREAM = '#efe1c6', DARK = '#3a2219';
	m.group('root', [0, 0, 0], {open: true});
	m.group('body', [0, 7, 0], {parent: 'root', open: true});
	m.cube('torso', [-3, 5, -5], [3, 10, 6], {parent: 'body', style: 'fur', colorHex: RUST, belly: DARK});
	m.group('neck', [0, 9, -5], {parent: 'body', open: true});
	m.group('head', [0, 9, -6], {parent: 'neck', open: true});
	m.cube('skull', [-3.5, 7, -11], [3.5, 12, -5], {parent: 'head', style: 'fur', colorHex: RUST, detail: (cv, f, x0, y0, w, h) => {
		if (f !== 'north') return;
		for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if ((x < 2 || x > w - 3) && y > 1) cv.set(x0 + x, y0 + y, jitter(hex(CREAM), 10));
		cv.set(x0 + 2, y0 + 2, hex('#160d08')); cv.set(x0 + w - 3, y0 + 2, hex('#160d08'));
		cv.set(x0 + 1, y0 + 1, hex(CREAM)); cv.set(x0 + w - 2, y0 + 1, hex(CREAM));
	}});
	m.cube('snout', [-1.5, 7, -13], [1.5, 9, -11], {parent: 'head', style: 'fur', colorHex: CREAM, detail: (cv, f, x0, y0, w) => { if (f === 'north') { cv.set(x0 + 1, y0, hex('#1d1210')); } }});
	m.group('ears', [0, 12, -8], {parent: 'head'});
	m.cube('ear_left', [1.5, 12, -9], [3.5, 14, -8], {parent: 'ears', style: 'fur', colorHex: CREAM, rotation: [0, 0, -12], origin: [2.5, 12, -8.5]});
	m.cube('ear_right', [-3.5, 12, -9], [-1.5, 14, -8], {parent: 'ears', style: 'fur', colorHex: CREAM, rotation: [0, 0, 12], origin: [-2.5, 12, -8.5]});
	m.cube('cheek_fluff', [-4, 7, -9], [4, 9, -6], {parent: 'head', style: 'fur', colorHex: CREAM, inflate: 0.25});
	const legs = [['leg_front_left', 2, -3], ['leg_front_right', -2, -3], ['leg_back_left', 2, 4], ['leg_back_right', -2, 4]];
	for (const [n, x, z] of legs) {
		m.group(n, [x, 5, z], {parent: 'root'});
		m.cube(n.replace('leg_', 'paw_'), [x - 1, 0, z - 1], [x + 1, 5, z + 1], {parent: n, style: 'fur', colorHex: DARK});
	}
	m.group('tail', [0, 8, 6], {parent: 'body', rotation: [-25, 0, 0], open: true});
	m.cube('tail_base', [-1.5, 6.5, 6], [1.5, 9.5, 10], {parent: 'tail', style: 'fur', colorHex: RUST, stripe: 2, stripeColor: '#7a3418'});
	m.group('tail_mid', [0, 8, 10], {parent: 'tail', open: true});
	m.cube('tail_mid', [-2, 6, 10], [2, 10, 14], {parent: 'tail_mid', style: 'fur', colorHex: RUST, stripe: 2, stripeColor: '#7a3418'});
	m.group('tail_tip', [0, 8, 14], {parent: 'tail_mid'});
	m.cube('tail_tip', [-1.5, 6.5, 14], [1.5, 9.5, 18], {parent: 'tail_tip', style: 'fur', colorHex: '#8d3b1c', stripe: 2, stripeColor: '#5b2410'});
	m.cube('scarf', [-3.5, 8.5, -5.5], [3.5, 10.5, -3.5], {parent: 'body', style: 'cloth', colorHex: '#2f6f7a', inflate: 0.1});
	m.cube('scarf_tail', [1, 6, -5.6], [3, 9, -5.4], {parent: 'body', style: 'cloth', colorHex: '#2f6f7a', rotation: [0, 0, -10], origin: [2, 9, -5.5]});

	m.animation('animation.red_panda.idle', {length: 3, bones: {
		head: {rotation: [[0, [0,0,0], 'catmullrom'], [1, [4,6,0], 'catmullrom'], [2, [-2,-5,0], 'catmullrom'], [3, [0,0,0], 'catmullrom']]},
		tail: {rotation: [[0, [0,0,0]], [1.5, [0,12,0]], [3, [0,0,0]]]},
		tail_mid: {rotation: [[0, [0,-6,0]], [1.5, [0,10,0]], [3, [0,-6,0]]]},
		ears: {rotation: [[0, [0,0,0]], [2.4, [0,0,0]], [2.55, [-14,0,0]], [2.7, [0,0,0]]]},
		body: {position: [[0, [0,0,0], 'catmullrom'], [1.5, [0,0.2,0], 'catmullrom'], [3, [0,0,0], 'catmullrom']]},
	}});
	const swing = (a, ph) => [[0, [ph ? -a : a, 0, 0]], [0.25, [0,0,0]], [0.5, [ph ? a : -a, 0, 0]], [0.75, [0,0,0]], [1, [ph ? -a : a, 0, 0]]];
	m.animation('animation.red_panda.walk', {length: 1, bones: {
		leg_front_left: {rotation: swing(28, 0)}, leg_back_right: {rotation: swing(28, 0)},
		leg_front_right: {rotation: swing(28, 1)}, leg_back_left: {rotation: swing(28, 1)},
		body: {position: [[0, [0,0,0]], [0.25, [0,0.4,0]], [0.5, [0,0,0]], [0.75, [0,0.4,0]], [1, [0,0,0]]]},
		tail: {rotation: [[0, [0,-8,0], 'catmullrom'], [0.5, [0,8,0], 'catmullrom'], [1, [0,-8,0], 'catmullrom']]},
		head: {rotation: [[0, [2,0,0]], [0.5, [-2,0,0]], [1, [2,0,0]]]},
	}});
	m.animation('animation.red_panda.sit', {loop: 'hold', length: 0.75, bones: {
		body: {rotation: [[0, [0,0,0]], [0.75, [-32,0,0]]], position: [[0, [0,0,0]], [0.75, [0,-1.5,1]]]},
		leg_back_left: {rotation: [[0, [0,0,0]], [0.75, [-60,0,0]]]},
		leg_back_right: {rotation: [[0, [0,0,0]], [0.75, [-60,0,0]]]},
		head: {rotation: [[0, [0,0,0]], [0.75, [30,0,0]]]},
		tail: {rotation: [[0, [0,0,0]], [0.75, [40,0,0]]]},
	}});
	m.animation('animation.red_panda.sleep_curl', {loop: 'loop', length: 4, bones: {
		root: {rotation: [[0, [0,0,90]]], position: [[0, [0,-2,0]]]},
		head: {rotation: [[0, [20,-50,0]]]},
		tail: {rotation: [[0, [0,-70,0]]]},
		tail_mid: {rotation: [[0, [0,-55,0]]]},
		body: {scale: [[0, [1,1,1], 'catmullrom'], [2, [1.03,1.05,1], 'catmullrom'], [4, [1,1,1], 'catmullrom']]},
	}});
	m.animation('animation.red_panda.climb_wip', {loop: 'loop', length: 1.2, bones: {
		root: {rotation: [[0, [-80,0,0]]]},
		leg_front_left: {rotation: [[0, [-40,0,0]], [0.6, [10,0,0]]]},
		leg_front_right: {rotation: [[0.6, [-40,0,0]]]},
	}});
	m.view = {position: [-34, 24, -38], target: [0, 8, 2]}; m.selected = ["skull"];
	projects.push({m, date: NOW - 40 * 60});
}

// =============== 2. Goblin Merchant (Bedrock entity) ===============
{
	const m = new Model({name: 'goblin_merchant', format: 'bedrock', tw: 128, th: 64, identifier: 'geometry.wanderers.goblin_merchant'});
	const SKIN = '#7fa34a', TUNIC = '#7b4b2a', BELT = '#3b2a1e';
	m.group('root', [0, 0, 0], {open: true});
	m.group('waist', [0, 10, 0], {parent: 'root', open: true});
	m.group('torso', [0, 10, 0], {parent: 'waist', open: true});
	m.cube('chest', [-4, 10, -2.5], [4, 18, 2.5], {parent: 'torso', style: 'cloth', colorHex: TUNIC});
	m.cube('belt', [-4, 10, -2.5], [4, 11.5, 2.5], {parent: 'torso', style: 'cloth', colorHex: BELT, inflate: 0.3});
	m.cube('coin_pouch', [2, 8.5, -3.5], [4, 10.5, -2], {parent: 'torso', style: 'cloth', colorHex: '#a8854a'});
	m.group('head', [0, 18, 0], {parent: 'torso', open: true});
	m.cube('head', [-4, 18, -4], [4, 25, 3], {parent: 'head', style: 'skin', colorHex: SKIN, detail: eyes('#e8c547', '#2a2a10', 3, 1)});
	m.cube('nose', [-1, 19, -6.5], [1, 22, -4], {parent: 'head', style: 'skin', colorHex: '#6f9140', rotation: [-12, 0, 0], origin: [0, 20, -4]});
	m.cube('ear_left', [4, 21, -1], [9, 23, 0], {parent: 'head', style: 'skin', colorHex: SKIN, rotation: [0, -15, 20], origin: [4, 22, -0.5]});
	m.cube('ear_right', [-9, 21, -1], [-4, 23, 0], {parent: 'head', style: 'skin', colorHex: SKIN, rotation: [0, 15, -20], origin: [-4, 22, -0.5], mirror: true});
	m.cube('hood', [-4.5, 22, -4.5], [4.5, 26, 3.5], {parent: 'head', style: 'cloth', colorHex: '#4c5d3a', inflate: 0.2});
	m.cube('monocle', [0.5, 21, -4.6], [2.5, 23, -4.4], {parent: 'head', style: 'metal', colorHex: '#c9a64b'});
	for (const side of [['left', 1], ['right', -1]]) {
		const [n, s] = side;
		m.group('arm_' + n, [s * 4, 17.5, 0], {parent: 'torso', open: n === 'right'});
		m.cube('upper_arm_' + n, s > 0 ? [4, 12, -1.5] : [-7, 12, -1.5], s > 0 ? [7, 18, 1.5] : [-4, 18, 1.5], {parent: 'arm_' + n, style: 'cloth', colorHex: TUNIC});
		m.cube('hand_' + n, s > 0 ? [4.25, 9, -1.25] : [-6.75, 9, -1.25], s > 0 ? [6.75, 12, 1.25] : [-4.25, 12, 1.25], {parent: 'arm_' + n, style: 'skin', colorHex: SKIN});
		m.group('leg_' + n, [s * 2, 10, 0], {parent: 'root'});
		m.cube('leg_' + n, s > 0 ? [0.5, 3, -1.5] : [-3.5, 3, -1.5], s > 0 ? [3.5, 10, 1.5] : [-0.5, 10, 1.5], {parent: 'leg_' + n, style: 'cloth', colorHex: '#594536'});
		m.cube('boot_' + n, s > 0 ? [0.25, 0, -2.5] : [-3.75, 0, -2.5], s > 0 ? [3.75, 3, 1.75] : [-0.25, 3, 1.75], {parent: 'leg_' + n, style: 'wood', colorHex: '#3e2c22'});
	}
	m.group('lantern', [-5.5, 9, 0], {parent: 'arm_right'});
	m.cube('lantern_cage', [-7, 4, -1.5], [-4, 8, 1.5], {parent: 'lantern', style: 'metal', colorHex: '#5d5650'});
	m.cube('lantern_flame', [-6.5, 4.5, -1], [-4.5, 7.5, 1], {parent: 'lantern', style: 'glow', colorHex: '#ffb648'});
	m.cube('lantern_handle', [-6, 8, -0.5], [-5, 9, 0.5], {parent: 'lantern', style: 'metal', colorHex: '#3d3a37'});
	m.group('backpack', [0, 16, 2.5], {parent: 'torso', open: true});
	m.cube('pack_frame', [-5, 9, 2.5], [5, 21, 7.5], {parent: 'backpack', style: 'wood', colorHex: '#8a6239'});
	m.cube('bedroll', [-6, 20, 3], [6, 23, 6], {parent: 'backpack', style: 'cloth', colorHex: '#8e3b3b'});
	m.group('wares', [0, 14, 7.5], {parent: 'backpack', open: true});
	const potColors = ['#c25b4d', '#4d7cc2', '#7bbf5a', '#c2a24d', '#a05ac2'];
	for (let i = 0; i < 5; i++) {
		const x = -4.5 + i * 2;
		m.cube('potion_' + ['red', 'blue', 'green', 'amber', 'violet'][i], [x, 11 + (i % 2), 7.5], [x + 1.5, 14 + (i % 2), 9], {parent: 'wares', style: 'glow', colorHex: potColors[i]});
	}
	m.cube('pan', [-4, 15, 7.5], [0, 15.5, 11.5], {parent: 'wares', style: 'metal', colorHex: '#4a4a4f', rotation: [80, 0, 0], origin: [-2, 15, 7.5]});
	m.cube('scroll_bundle', [1, 15, 7.5], [4.5, 17, 9.5], {parent: 'wares', style: 'cloth', colorHex: '#e3d2a4'});
	m.cube('rope_coil', [-4.5, 17.5, 7.5], [-1, 20, 9], {parent: 'wares', style: 'cloth', colorHex: '#b49562'});
	m.cube('hanging_sign', [1, 18, 7.5], [5, 21, 8], {parent: 'wares', style: 'wood', colorHex: '#a87b4a'});

	const sw = (a) => [[0, [a,0,0]], [0.5, [-a,0,0]], [1, [a,0,0]]];
	m.animation('animation.goblin_merchant.walk', {length: 1, bones: {
		leg_left: {rotation: sw(30)}, leg_right: {rotation: sw(-30)}, arm_left: {rotation: sw(-22)},
		arm_right: {rotation: [[0, [8,0,0]], [0.5, [-8,0,0]], [1, [8,0,0]]]},
		torso: {position: [[0, [0,0,0]], [0.25, [0,0.5,0]], [0.5, [0,0,0]], [0.75, [0,0.5,0]], [1, [0,0,0]]]},
		lantern: {rotation: [[0, [0,0,10], 'catmullrom'], [0.5, [0,0,-10], 'catmullrom'], [1, [0,0,10], 'catmullrom']]},
		wares: {rotation: [[0, [2,0,0]], [0.5, [-2,0,0]], [1, [2,0,0]]]},
	}});
	m.animation('animation.goblin_merchant.idle', {length: 4, bones: {
		head: {rotation: [[0, [0,0,0], 'catmullrom'], [1.2, [0,-18,0], 'catmullrom'], [2.6, [0,14,0], 'catmullrom'], [4, [0,0,0], 'catmullrom']]},
		torso: {scale: [[0, [1,1,1], 'catmullrom'], [2, [1.02,1.03,1.02], 'catmullrom'], [4, [1,1,1], 'catmullrom']]},
		lantern: {rotation: [[0, [0,0,3], 'catmullrom'], [2, [0,0,-3], 'catmullrom'], [4, [0,0,3], 'catmullrom']]},
	}});
	m.animation('animation.goblin_merchant.trade_offer', {loop: 'once', length: 1.6, bones: {
		arm_left: {rotation: [[0, [0,0,0]], [0.4, [-75,0,-10], 'catmullrom'], [1.2, [-75,0,-10]], [1.6, [0,0,0]]]},
		head: {rotation: [[0, [0,0,0]], [0.4, [12,0,0]], [1.2, [12,0,0]], [1.6, [0,0,0]]]},
		wares: {rotation: [[0, [0,0,0]], [0.5, [-6,0,0]], [1.6, [0,0,0]]]},
	}});
	m.animation('animation.goblin_merchant.haggle', {length: 2, bones: {
		arm_left: {rotation: [[0, [-40,0,-20]], [0.25, [-55,0,-35]], [0.5, [-40,0,-20]], [0.75, [-55,0,-35]], [1, [-40,0,-20]], [2, [-40,0,-20]]]},
		head: {rotation: [[0, [0,0,-8]], [0.5, [0,0,8]], [1, [0,0,-8]], [1.5, [0,0,8]], [2, [0,0,-8]]]},
	}});
	m.animation('animation.goblin_merchant.flee', {length: 0.6, bones: {
		leg_left: {rotation: [[0, [45,0,0]], [0.3, [-45,0,0]], [0.6, [45,0,0]]]},
		leg_right: {rotation: [[0, [-45,0,0]], [0.3, [45,0,0]], [0.6, [-45,0,0]]]},
		torso: {rotation: [[0, [18,0,0]]]},
	}});
	m.view = {position: [-44, 34, -50], target: [0, 15, 2]}; m.selected = ["nose"];
	projects.push({m, date: NOW - 2 * DAY - 3 * 3600});
}

// =============== 3. Sky Skiff (Generic model) ===============
{
	const m = new Model({name: 'sky_skiff_mk2', format: 'free', tw: 512, th: 256});
	const PLANK = '#9c6b3f', DARK_PLANK = '#6e4626', BRASS = '#c49a3c', SAIL = '#e9dfc4';
	m.group('skiff', [0, 0, 0], {open: true});
	m.group('hull', [0, 0, 0], {parent: 'skiff', open: true});
	for (let i = 0; i < 12; i++) {
		const z = -24 + i * 4;
		const taper = Math.round(Math.max(0, Math.abs(i - 5.5) - 3) * 2);
		m.cube(`keel_plank_${String(i + 1).padStart(2, '0')}`, [-6 + taper, 0, z], [6 - taper, 2, z + 4], {parent: 'hull', style: 'wood', colorHex: i % 3 === 0 ? DARK_PLANK : PLANK});
	}
	for (const s of [-1, 1]) {
		for (let row = 0; row < 3; row++) {
			const x = s * (7 + row * 0.5);
			m.cube(`strake_${s < 0 ? 'port' : 'starboard'}_${row + 1}`, s < 0 ? [x - 1, 2 + row * 2, -22] : [x, 2 + row * 2, -22], s < 0 ? [x, 4 + row * 2, 22] : [x + 1, 4 + row * 2, 22], {parent: 'hull', style: 'wood', colorHex: row === 2 ? DARK_PLANK : PLANK});
		}
	}
	m.cube('bow_cap', [-4, 2, -28], [4, 8, -22], {parent: 'hull', style: 'wood', colorHex: DARK_PLANK});
	m.cube('stern_cap', [-6, 2, 22], [6, 9, 26], {parent: 'hull', style: 'wood', colorHex: DARK_PLANK});
	m.cube('figurehead_owl', [-1.5, 6, -32], [1.5, 10, -28], {parent: 'hull', style: 'metal', colorHex: BRASS, rotation: [-15, 0, 0], origin: [0, 8, -28]});
	m.group('deck', [0, 2, 0], {parent: 'skiff', open: false});
	for (let i = 0; i < 10; i++) m.cube(`deck_board_${i + 1}`, [-7, 5.5, -20 + i * 4], [7, 6.5, -16 + i * 4], {parent: 'deck', style: 'wood', colorHex: PLANK});
	m.cube('hatch', [-3, 6.5, 4], [3, 7, 9], {parent: 'deck', style: 'wood', colorHex: DARK_PLANK});
	m.cube('cargo_crate_a', [2, 6.5, -14], [6, 10.5, -10], {parent: 'deck', style: 'wood', colorHex: '#b0874f'});
	m.cube('cargo_crate_b', [-6, 6.5, -15], [-2, 9.5, -11], {parent: 'deck', style: 'wood', colorHex: '#a07a45', rotation: [0, 22.5, 0], origin: [-4, 6.5, -13]});
	m.cube('barrel', [3, 6.5, 12], [6, 11, 15], {parent: 'deck', style: 'wood', colorHex: '#7d5431'});
	m.group('railings', [0, 7, 0], {parent: 'skiff'});
	for (const s of [-1, 1]) {
		for (let i = 0; i < 7; i++) m.cube(`rail_post_${s < 0 ? 'p' : 's'}${i + 1}`, [s * 7.5 - 0.5, 8, -18 + i * 6], [s * 7.5 + 0.5, 12, -17 + i * 6], {parent: 'railings', style: 'metal', colorHex: BRASS});
		m.cube(`handrail_${s < 0 ? 'port' : 'starboard'}`, [s * 7.5 - 0.5, 12, -19], [s * 7.5 + 0.5, 13, 19], {parent: 'railings', style: 'wood', colorHex: DARK_PLANK});
	}
	m.group('mast', [0, 6.5, -4], {parent: 'skiff', open: true});
	m.cube('mast_pole', [-1, 6.5, -5], [1, 42, -3], {parent: 'mast', style: 'wood', colorHex: DARK_PLANK});
	m.cube('crows_nest', [-3, 34, -7], [3, 37, -1], {parent: 'mast', style: 'wood', colorHex: PLANK});
	m.cube('yard_arm', [-14, 30, -4.5], [14, 31, -3.5], {parent: 'mast', style: 'wood', colorHex: DARK_PLANK});
	m.group('sail', [0, 30, -3.5], {parent: 'mast'});
	m.cube('sail_cloth', [-13, 14, -2.5], [13, 30, -1.5], {parent: 'sail', style: 'cloth', colorHex: SAIL});
	m.cube('sail_emblem', [-3, 19, -3.2], [3, 25, -2.2], {parent: 'sail', style: 'cloth', colorHex: '#3c6e91'});
	m.cube('pennant', [1, 42, -4.5], [7, 44, -3.5], {parent: 'mast', style: 'cloth', colorHex: '#b23a3a'});
	m.group('balloon', [0, 48, 0], {parent: 'skiff', open: true});
	m.cube('envelope', [-10, 44, -22], [10, 60, 22], {parent: 'balloon', style: 'cloth', colorHex: '#c9a26b', inflate: 0.5});
	for (let i = 0; i < 5; i++) m.cube(`envelope_band_${i + 1}`, [-10.5, 43.5, -18 + i * 9], [10.5, 60.5, -17 + i * 9], {parent: 'balloon', style: 'cloth', colorHex: '#6d4b2e'});
	for (const [n, x, z] of [['fl', -7, -18], ['fr', 7, -18], ['bl', -7, 18], ['br', 7, 18]]) m.cube(`rigging_${n}`, [x - 0.5, 13, z - 0.5], [x + 0.5, 44, z + 0.5], {parent: 'balloon', style: 'cloth', colorHex: '#b49562'});
	m.group('engine', [0, 8, 26], {parent: 'skiff', open: true});
	m.cube('boiler', [-3, 4, 24], [3, 10, 30], {parent: 'engine', style: 'metal', colorHex: '#b8733d'});
	m.cube('smokestack', [-1, 10, 26], [1, 18, 28], {parent: 'engine', style: 'metal', colorHex: '#3b3836'});
	m.cube('gauge', [-1, 7, 23], [1, 9, 24], {parent: 'engine', style: 'glow', colorHex: '#f0e7c0'});
	m.group('propeller', [0, 7, 31], {parent: 'engine', open: true});
	m.cube('hub', [-1, 6, 30], [1, 8, 32], {parent: 'propeller', style: 'metal', colorHex: BRASS});
	for (let i = 0; i < 4; i++) m.cube(`blade_${i + 1}`, [-0.5, 8, 31], [0.5, 15, 31.5], {parent: 'propeller', style: 'wood', colorHex: '#d9c49a', rotation: [0, 0, i * 90 === 180 ? 180 : i * 90 > 180 ? -90 : i * 90], origin: [0, 7, 31]});
	m.group('rudder', [0, 5, 26], {parent: 'skiff'});
	m.cube('rudder_fin', [-0.5, -2, 26], [0.5, 8, 32], {parent: 'rudder', style: 'wood', colorHex: DARK_PLANK});
	m.animation('propeller_spin', {length: 0.5, bones: {propeller: {rotation: [[0, [0,0,0]], [0.5, [0,0,-360]]]}}});
	m.animation('hover_bob', {length: 4, bones: {
		skiff: {position: [[0, [0,0,0], 'catmullrom'], [2, [0,1.5,0], 'catmullrom'], [4, [0,0,0], 'catmullrom']], rotation: [[0, [0,0,-1.5], 'catmullrom'], [2, [0,0,1.5], 'catmullrom'], [4, [0,0,-1.5], 'catmullrom']]},
		sail: {scale: [[0, [1,1,1], 'catmullrom'], [1, [1,1,1.4], 'catmullrom'], [2, [1,1,1], 'catmullrom'], [4, [1,1,1], 'catmullrom']]},
	}});
	m.animation('rudder_turn_left', {loop: 'hold', length: 0.5, bones: {rudder: {rotation: [[0, [0,0,0]], [0.5, [0,25,0]]]}}});
	m.view = {position: [-78, 52, -88], target: [0, 26, 0]}; m.selected = ["boiler"];
	projects.push({m, date: NOW - 9 * DAY});
}

// =============== 4. Copper Lantern Post (Java block) ===============
{
	const m = new Model({name: 'copper_lantern_post', format: 'java_block', box_uv: false, tw: 16, th: 16});
	m.tile('copper_lantern_post', 16, 16, 'metal', '#c8774a');
	m.tile('weathered_copper', 16, 16, 'metal', '#6d9f86');
	m.tile('lantern_glass', 16, 16, 'glow', '#ffd27a');
	m.tile('cobbled_base', 16, 16, 'stone', '#7d7b78');
	m.group('base', [8, 0, 8], {open: true});
	m.cube('plinth', [3, 0, 3], [13, 2, 13], {parent: 'base', texture: 3, cullface: ['down']});
	m.cube('plinth_trim', [4, 2, 4], [12, 3, 12], {parent: 'base', texture: 3});
	m.group('pole', [8, 3, 8], {open: true});
	m.cube('pole', [7, 3, 7], [9, 11, 9], {parent: 'pole', texture: 1});
	m.cube('collar', [6.5, 10, 6.5], [9.5, 11, 9.5], {parent: 'pole', texture: 0});
	m.group('lamp', [8, 11, 8], {open: true});
	m.cube('lamp_floor', [5, 11, 5], [11, 12, 11], {parent: 'lamp', texture: 0});
	m.cube('glass', [5.5, 12, 5.5], [10.5, 15, 10.5], {parent: 'lamp', texture: 2});
	for (const [n, x, z] of [['nw', 5, 5], ['ne', 10, 5], ['sw', 5, 10], ['se', 10, 10]]) m.cube(`frame_${n}`, [x, 12, z], [x + 1, 15, z + 1], {parent: 'lamp', texture: 0});
	m.cube('roof', [4.5, 15, 4.5], [11.5, 16, 11.5], {parent: 'lamp', texture: 1});
	m.cube('finial', [7.5, 16, 7.5], [8.5, 17, 8.5], {parent: 'lamp', texture: 0, rotation: undefined});
	m.display = {
		thirdperson_righthand: {rotation: [75, 45, 0], translation: [0, 2.5, 0], scale: [0.375, 0.375, 0.375]},
		firstperson_righthand: {rotation: [0, 45, 0], scale: [0.4, 0.4, 0.4]},
		ground: {translation: [0, 3, 0], scale: [0.25, 0.25, 0.25]},
		gui: {rotation: [30, 225, 0], translation: [0, -1, 0], scale: [0.625, 0.625, 0.625]},
		fixed: {scale: [0.5, 0.5, 0.5]},
	};
	m.view = {position: [-22, 22, -26], target: [0, 8, 0]}; m.selected = ["glass"];
	projects.push({m, date: NOW - 16 * DAY});
}

// =============== 5. Mossy Mushroom Stool (Java block) ===============
{
	const m = new Model({name: 'mossy_mushroom_stool', format: 'java_block', box_uv: false, tw: 16, th: 16});
	m.tile('mushroom_cap', 16, 16, 'fur', '#b8402f', {stripe: 3, stripeColor: '#e9dccb'});
	m.tile('mushroom_stem', 16, 16, 'wood', '#dccfb4');
	m.tile('moss', 16, 16, 'fur', '#5c7d34');
	m.cube('stem', [5, 0, 5], [11, 7, 11], {texture: 1, cullface: ['down']});
	m.cube('cap_lower', [2, 7, 2], [14, 9, 14], {texture: 0});
	m.cube('cap_top', [3, 9, 3], [13, 10, 13], {texture: 0});
	m.cube('moss_patch', [2, 9, 6], [7, 9.5, 12], {texture: 2});
	m.cube('sprout', [10, 10, 9], [11, 12, 10], {texture: 2, rotation: undefined});
	m.view = {position: [-20, 18, -24], target: [0, 5, 0]}; m.selected = [];
	projects.push({m, date: NOW - 34 * DAY});
}

// =============== 6. Ember Wisp (Bedrock entity, older experiment) ===============
{
	const m = new Model({name: 'ember_wisp', format: 'bedrock', tw: 32, th: 32, identifier: 'geometry.ember_wisp'});
	m.group('core', [0, 12, 0], {open: true});
	m.cube('heart', [-2, 10, -2], [2, 14, 2], {parent: 'core', style: 'glow', colorHex: '#ff8a2b', detail: eyes('#2a0d00', '#ffe2a8', 2, 0)});
	m.cube('halo', [-3, 9.5, -3], [3, 14.5, 3], {parent: 'core', style: 'glow', colorHex: '#ffc35a', inflate: 0.5});
	m.group('sparks', [0, 12, 0], {parent: 'core', open: true});
	for (let i = 0; i < 4; i++) {
		const a = i * Math.PI / 2, x = Math.round(Math.cos(a) * 5), z = Math.round(Math.sin(a) * 5);
		m.cube(`spark_${i + 1}`, [x - 0.5, 12 + (i % 2), z - 0.5], [x + 0.5, 13 + (i % 2), z + 0.5], {parent: 'sparks', style: 'glow', colorHex: '#ffe08a'});
	}
	m.cube('tail_flame', [-1, 6, -1], [1, 10, 1], {parent: 'core', style: 'glow', colorHex: '#e8541e'});
	m.animation('animation.ember_wisp.float', {length: 2, bones: {
		core: {position: [[0, [0,0,0], 'catmullrom'], [1, [0,1,0], 'catmullrom'], [2, [0,0,0], 'catmullrom']]},
		sparks: {rotation: [[0, [0,0,0]], [2, [0,360,0]]]},
	}});
	m.view = {position: [-18, 20, -22], target: [0, 11, 0]}; m.selected = ["heart"];
	projects.push({m, date: NOW - 71 * DAY});
}

// ---------- write ----------
const out = projects.map(({m, date}) => {
	const model = m.compile();
	return {uuid: uuid(), name: m.name, date, model};
});
fs.writeFileSync(path.join(OUT, 'projects.json'), JSON.stringify(out));
fs.writeFileSync(path.join(OUT, 'session.json'), JSON.stringify({focus_order: ['red_panda']}));

// localStorage of an established user (~5 months, ~150 launches)
const s = v => ({value: v});
const local = {
	startups: '148',
	last_version: '5.2.2',
	welcomed_version: '5.2.2',
	settings: {
		username: s('mossbyte'),
		recovery_save_interval: s(30),
		highlight_cubes: s(true),
		outliner_colors: s(true),
		default_cube_size: s(2),
		animation_snap: s(24),
		color_wheel: s(false),
	},
	colors: {
		palette: ['#1a1c2c','#5d275d','#b13e53','#ef7d57','#ffcd75','#a7f070','#38b764','#257179','#29366f','#3b5dc9','#41a6f6','#73eff7','#f4f4f4','#94b0c2','#566c86','#333c57'],
		history: ['#b5532a','#efe1c6','#3a2219','#2f6f7a','#7a3418','#8d3b1c','#7fa34a','#e8c547','#c49a3c','#9c6b3f','#ffb648','#c8774a','#6d9f86','#b8402f','#ff8a2b'],
	},
	action_control_recently_used: ['add_cube', 'add_group', 'flip_x', 'export_bedrock', 'add_keyframe', 'save_project', 'toggle_mirror_uv', 'resize_texture', 'export_png', 'bake_animation_into_model'],
	'StateMemory.color_picker_tab': JSON.stringify('picker'),
};
for (const k in local) if (typeof local[k] !== 'string') local[k] = JSON.stringify(local[k]);
fs.writeFileSync(path.join(OUT, 'local_storage.json'), JSON.stringify(local, null, 1));
console.log(`seed: ${out.length} projects, ${out.reduce((a, p) => a + p.model.elements.length, 0)} elements, ${out.reduce((a, p) => a + (p.model.animations?.length || 0), 0)} animations -> ${OUT}`);
