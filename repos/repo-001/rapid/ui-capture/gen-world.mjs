// Generates the seed "world" served by the local OSM API stub (stub-server.mjs).
// Base map data: the real OSM extract of Three Rivers, Michigan that ships with Rapid
// (data/intro_graph.json). We give it realistic OSM ids, versions, timestamps, editors and
// changesets, then add the signed-in user's account, changeset history, and map notes.
//
// usage: node .ui-capture/gen-world.mjs   -> writes .ui-capture/data/world.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const intro = JSON.parse(fs.readFileSync(path.join(root, 'data/intro_graph.json'), 'utf8')).introGraph;

// deterministic PRNG
let seed = 20261117;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const randInt = (a, b) => a + Math.floor(rnd() * (b - a + 1));

// ---------- users ----------
const ME = {
  id: 14829301, display_name: 'riverbend_maya', account_created: '2019-03-14T18:22:09Z',
  description: 'Mapping St. Joseph County, Michigan one sidewalk at a time. Volunteer with the Three Rivers Public Library local history group. Mostly Rapid + field papers.',
  changesets: 1287, traces: 34, home: { lat: 41.9437, lon: -85.6325, zoom: 16 }
};
const others = [
  [218447, 'woodpeck_fixbot', '2009-05-01T10:00:00Z', 31882],
  [91347, 'TIGERcnl', '2008-01-12T09:00:00Z', 2101],
  [1012453, 'mikelmaron_ttr', '2013-04-22T16:41:00Z', 412],
  [5512820, 'jfiedler_mi', '2017-06-08T13:10:00Z', 2380],
  [3104552, 'Glassman', '2015-09-20T20:12:00Z', 9811],
  [11923117, 'stjoe_gis_dept', '2020-11-03T15:44:00Z', 188],
  [7710321, 'KalamazooCyclist', '2018-02-27T01:15:00Z', 693],
  [16630295, 'meta_mapper_ashley', '2022-01-10T17:03:00Z', 5402],
  [16630911, 'meta_mapper_dev', '2022-01-12T17:03:00Z', 3877],
  [2441093, 'bhousel', '2014-11-05T14:22:00Z', 3315],
  [13540110, 'trillium_walks', '2021-04-18T12:00:00Z', 97],
  [9022871, 'Rocky River Paddler', '2019-08-30T22:30:00Z', 41],
  [12001882, 'quincy_n', '2020-12-12T08:15:00Z', 1520],
  [4401199, 'MichiganDOT_import', '2016-03-01T09:30:00Z', 77],
];
const users = [ME, ...others.map(([id, display_name, account_created, changesets]) =>
  ({ id, display_name, account_created, changesets }))];

// ---------- changesets ----------
const editors = ['Rapid 2.5.7', 'Rapid 2.5.6', 'Rapid 2.4.3', 'iD 2.30.4', 'JOSM/1.5 (19253 en)', 'StreetComplete 59.3', 'Every Door 6.0', 'Rapid 2.3.1', 'iD 2.27.2'];
const myComments = [
  'Added sidewalks and crossings along N Main St #MapThreeRivers',
  'Traced buildings east of the river using Rapid AI suggestions #Rapid #MapThreeRivers',
  'Fixed disconnected service roads near Scouter Park',
  'Updated opening hours for downtown shops after survey',
  'Added Riverwalk Trail benches, bins and picnic tables from field notes',
  'Corrected one-way restrictions on Portage Ave',
  'Mapped parking aisles behind City Hall',
  'Added house numbers on Hoffman St (survey 2026-06-21)',
  'Squared building outlines, Barrows School area',
  'Realigned Rocky River centerline to latest imagery',
  'Removed demolished garage on 5th Ave',
  'Added crossing=marked + kerb tags at Michigan Ave intersections',
  'Added swimming pools and sheds from imagery, residential NE',
  'Tagged surface=asphalt on residential streets',
  'Rapid: added Meta AI roads in the farmland south of town #Rapid #MapWithAI',
  'Merged duplicate POIs for Lowry\'s Books',
  'Added memorial benches in Memory Isle park',
  'Fixed crossing ways reported by validator',
  'Added wheelchair=yes to downtown entrances',
  'Mapped the new pickleball courts at Scouter Park',
  'Added fire hydrants around Constantine St (survey)',
  'Updated name tag for Main Street Cafe',
  'Added building:levels for downtown commercial block',
  'Resolved OSM note about closed pawn shop',
  'Added bike parking near the library and post office',
];
const otherComments = [
  'Bot: fix deprecated tags', 'TIGER cleanup St. Joseph County', 'Updated speed limits', 'Added buildings from Microsoft footprints',
  'Fixed road classification', 'Survey: shop names downtown', 'Mapped trails along the river', 'Added addresses from county import',
  'Rapid: added AI-detected roads #Rapid', 'StreetComplete: answered surface quests', 'Fixed self-intersecting ways', 'Updated park boundaries',
];

const now = Date.parse('2026-11-16T21:40:00Z');
const isoAt = t => new Date(t).toISOString().replace(/\.\d+Z$/, 'Z');
const BBOX = { minlon: -85.651578, minlat: 41.925406, maxlon: -85.581245, maxlat: 41.965764 };

const changesets = [];
let csid = 152884210;
// my changesets: ~70 over the last 9 months (newest last), plus scattered older ones
for (let i = 0; i < 90; i++) {
  const daysAgo = i < 70 ? Math.pow(rnd(), 1.3) * 270 : 270 + rnd() * 2400;
  const t = now - daysAgo * 86400000 - randInt(0, 36000) * 1000;
  changesets.push({ uid: ME.id, t, comment: pick(myComments), editor: pick(editors.slice(0, 4)) });
}
for (let i = 0; i < 220; i++) {
  const u = pick(others);
  const t = Date.parse(u[2]) + rnd() * (now - Date.parse(u[2]));
  changesets.push({ uid: u[0], t, comment: pick(otherComments), editor: pick(editors) });
}
changesets.sort((a, b) => a.t - b.t);
for (const c of changesets) {
  c.id = (csid += randInt(1800, 52000));
  // older changesets have lower ids
}
// re-scale ids by time order so newer = larger
// changeset ids grow ~ with time (≈1M in early 2009 → ≈176M late 2026)
const t0 = Date.parse('2009-01-01'), t1 = now;
changesets.forEach((c, i) => { const f = Math.max(0, (c.t - t0) / (t1 - t0)); c.id = Math.round(1000000 + Math.pow(f, 1.25) * 175000000) + i; });
const csByUser = new Map();
for (const c of changesets) {
  if (!csByUser.has(c.uid)) csByUser.set(c.uid, []);
  csByUser.get(c.uid).push(c);
}
const userName = new Map(users.map(u => [u.id, u.display_name]));

// ---------- entities ----------
const idMap = new Map();  // 'n12' -> 'n4419211234'
// older TIGER-era objects have low ids, objects added later have much larger ones
let nOld = 185320000, nNew = 4211000000, wOld = 17401200, wNew = 318200000, rBase = 1102300;
const keys = Object.keys(intro).sort((a, b) => (parseInt(a.slice(1)) - parseInt(b.slice(1))));
for (const k of keys) {
  const t = k[0];
  const late = rnd() < 0.45;
  if (t === 'n') idMap.set(k, 'n' + (late ? (nNew += randInt(50, 9000)) : (nOld += randInt(1, 40))));
  if (t === 'w') idMap.set(k, 'w' + (late ? (wNew += randInt(20, 900)) : (wOld += randInt(1, 30))));
  if (t === 'r') idMap.set(k, 'r' + (rBase += randInt(100, 4000)));
}

function chooseEdit(entity) {
  // who last touched this? recent edits weighted toward me (an active local mapper)
  const r = rnd();
  let list;
  if (r < 0.34) list = csByUser.get(ME.id);
  else list = csByUser.get(pick(others)[0]);
  const c = list[Math.floor(Math.pow(rnd(), 0.6) * list.length)];
  return c;
}

const entities = [];
const myRecent = csByUser.get(ME.id);
for (const k of keys) {
  const src = intro[k];
  const c = chooseEdit(src);
  const tags = src.tags ? { ...src.tags } : undefined;
  const e = {
    type: { n: 'node', w: 'way', r: 'relation' }[k[0]],
    id: Number(idMap.get(k).slice(1)),
    timestamp: isoAt(c.t),
    version: Math.max(1, Math.round(1 + Math.pow(rnd(), 2) * (tags ? 14 : 4))),
    changeset: c.id,
    user: userName.get(c.uid),
    uid: c.uid
  };
  if (k[0] === 'n') { e.lat = src.loc[1]; e.lon = src.loc[0]; }
  if (k[0] === 'w') e.nodes = src.nodes.map(n => Number(idMap.get(n).slice(1)));
  if (k[0] === 'r') e.members = src.members.map(m => ({ type: m.type, ref: Number(idMap.get(m.id).slice(1)), role: m.role }));
  if (tags) e.tags = tags;
  entities.push(e);
}

// Light enrichment, the kind a local mapper adds over months: house addresses on some houses,
// opening hours/phones on shops, building levels downtown.
const streets = ['N Main St', 'Hoffman St', 'Portage Ave', 'Constantine St', 'Michigan Ave', 'W Michigan Ave', '5th Ave', 'Railroad Dr', 'Kellogg St', 'Spring St', 'Willow Dr', 'Prutzman St'];
const hours = ['Mo-Fr 09:00-17:30; Sa 10:00-14:00', 'Mo-Sa 10:00-18:00', 'Tu-Sa 11:00-21:00; Su 12:00-19:00', 'Mo-Fr 08:00-17:00', 'Mo-Su 06:30-15:00', 'We-Sa 10:00-17:00'];
for (const e of entities) {
  const t = e.tags;
  if (!t) continue;
  if ((t.building === 'house' || (t.building === 'yes' && rnd() < 0.25)) && !t['addr:housenumber']) {
    t['addr:housenumber'] = String(randInt(1, 140) * 2 + (rnd() < 0.5 ? 1 : 0));
    t['addr:street'] = pick(streets);
    t['addr:city'] = 'Three Rivers';
    t['addr:postcode'] = '49093';
  }
  if ((t.shop || t.amenity === 'cafe' || t.amenity === 'restaurant') && !t.opening_hours && rnd() < 0.7) {
    t.opening_hours = pick(hours);
  }
  if ((t.shop || t.amenity === 'cafe' || t.amenity === 'restaurant' || t.amenity === 'bank') && !t.phone && rnd() < 0.5) {
    t.phone = `+1 269-${randInt(270, 279)}-${String(randInt(0, 9999)).padStart(4, '0')}`;
  }
  if (t.building && t.building !== 'shed' && !t['building:levels'] && rnd() < 0.15) {
    t['building:levels'] = String(pick([1, 1, 1, 2, 2, 3]));
  }
  if (t.highway === 'residential' && !t.surface && rnd() < 0.6) t.surface = 'asphalt';
}

// ---------- notes ----------
const noteTexts = [
  ['Pawn shop at this location closed in spring, windows are papered over.', 'closed', ['Thanks, removed the shop tags and left building=retail.']],
  ['There is a new crosswalk with flashing beacons here, not on the map yet.', 'open', []],
  ['Trail is washed out after the October flooding — impassable near the footbridge.', 'open', ['Confirmed on my walk 11/2, there\'s a detour sign posted by the city.']],
  ['Building has been demolished, now an empty gravel lot.', 'closed', ['Deleted the building, lot is now mapped as landuse=brownfield.']],
  ['The cafe changed its name to "Riverside Grind".', 'open', []],
  ['Street name is wrong, sign says Hoffman Street not Hoffman Ave', 'closed', ['Fixed, thanks for reporting!']],
  ['Missing playground equipment — there are swings and a slide here.', 'open', []],
  ['Is this road really private? Gate was open and there was no sign.', 'open', ['It\'s the plant access road, gated after 6pm. access=private is right during off hours.', 'Maybe access=destination + a conditional? Leaving open for discussion.']],
  ['New Dollar General under construction on the corner.', 'open', []],
  ['Bus stop moved about 50m north to in front of the library.', 'closed', ['Moved the node, thanks.']],
  ['Fishing access dock is here, has a small parking area (6 spaces).', 'open', []],
  ['parking lot is now permit only for city employees', 'open', []],
  ['Sidewalk missing on east side between Kellogg and Spring.', 'closed', ['Added from Rapid imagery + survey photo.']],
  ['Wrong house number: should be 214 not 241', 'closed', ['Corrected.']],
  ['Bridge closed for repairs until summer 2027', 'open', ['Saw MDOT signs, road is closed to cars but pedestrians can pass.']],
  ['Pizza place has a drive-thru now', 'open', []],
  ['Ice cream stand, seasonal (May-Sept)', 'open', []],
  ['This "river" is actually a drainage ditch most of the year', 'open', []],
  ['Picnic shelter can be reserved through the city parks office', 'closed', ['Added reservation=required and operator.']],
  ['Tattoo shop moved to Portage Ave.', 'open', []],
  ['Stop sign missing for northbound traffic', 'closed', ['Added highway=stop with direction=forward.']],
  ['The farm field here has been converted to a solar farm', 'open', []],
];
const notes = noteTexts.map(([text, status, replies], i) => {
  const created = now - (rnd() * 300 + 3) * 86400000;
  const lon = BBOX.minlon + 0.005 + rnd() * (BBOX.maxlon - BBOX.minlon - 0.01);
  const lat = BBOX.minlat + 0.004 + rnd() * (BBOX.maxlat - BBOX.minlat - 0.008);
  const opener = rnd() < 0.4 ? null : pick(users);
  const comments = [{ date: created, uid: opener?.id, user: opener?.display_name, action: 'opened', text }];
  let t = created;
  replies.forEach((r, j) => {
    t += (rnd() * 20 + 0.5) * 86400000;
    const u = rnd() < 0.55 ? ME : pick(users);
    const action = (status === 'closed' && j === replies.length - 1) ? 'closed' : 'commented';
    comments.push({ date: Math.min(t, now - 3600000), uid: u.id, user: u.display_name, action, text: r });
  });
  return { id: 4890112 + i * randInt(37, 311), lat: +lat.toFixed(7), lon: +lon.toFixed(7), status, created, closed: status === 'closed' ? comments.at(-1).date : null, comments };
});

// ---------- Esri / ArcGIS open datasets (Rapid "Add data" catalog) ----------
// Address points for buildings that don't have an address yet (a typical Rapid task),
// and sidewalk centerlines offset from residential streets.
const nodeLoc = new Map(entities.filter(e => e.type === 'node').map(e => [e.id, [e.lon, e.lat]]));
const esriAddresses = [];
let oid = 1;
for (const e of entities) {
  if (e.type !== 'way' || !e.tags?.building || e.tags['addr:housenumber'] || e.tags.building === 'shed') continue;
  if (rnd() < 0.35) continue;
  const pts = e.nodes.slice(0, -1).map(n => nodeLoc.get(n));
  const c = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  esriAddresses.push({
    type: 'Feature', id: oid,
    geometry: { type: 'Point', coordinates: [+c[0].toFixed(7), +c[1].toFixed(7)] },
    properties: { OBJECTID: oid++, Add_Number: String(randInt(100, 1899)), St_Name: pick(streets), Post_City: 'Three Rivers', State: 'MI', Zip_Code: '49093' }
  });
}
const esriSidewalks = [];
oid = 1;
for (const e of entities) {
  if (e.type !== 'way' || e.tags?.highway !== 'residential' || rnd() < 0.5) continue;
  const pts = e.nodes.map(n => nodeLoc.get(n));
  if (pts.length < 2) continue;
  const side = rnd() < 0.5 ? 1 : -1, off = 0.000075;   // ~7m
  const line = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = (b[0] - a[0]) * Math.cos(p[1] * Math.PI / 180), dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    return [+(p[0] - dy / len * off * side / Math.cos(p[1] * Math.PI / 180)).toFixed(7), +(p[1] + dx / len * off * side).toFixed(7)];
  });
  esriSidewalks.push({ type: 'Feature', id: oid, geometry: { type: 'LineString', coordinates: line }, properties: { OBJECTID: oid++, highway: 'footway', footway: 'sidewalk', surface: pick(['concrete', 'concrete', 'concrete', 'asphalt']) } });
}
const esri = [
  { id: '8c3f1d29a6b54e0f9e2c7a51d4b0e6f2', key: 'stjoe_addresses', title: 'St. Joseph County, MI Address Points', snippet: 'Address points maintained by St. Joseph County GIS, published for OpenStreetMap use.', tags: ['addresses'], groupCategories: ['/Categories/Addresses'], extent: [[-85.76, 41.76], [-85.29, 42.07]], created: '2024-04-02', modified: '2026-09-18',
    fields: [['OBJECTID', 'OBJECTID', 'esriFieldTypeOID', false], ['Add_Number', 'addr:housenumber', 'esriFieldTypeString', true], ['St_Name', 'addr:street', 'esriFieldTypeString', true], ['Post_City', 'addr:city', 'esriFieldTypeString', true], ['State', 'addr:state', 'esriFieldTypeString', true], ['Zip_Code', 'addr:postcode', 'esriFieldTypeString', true]],
    geometryType: 'esriGeometryPoint', features: esriAddresses },
  { id: '2b7e94c0f13d4a5c8d6e0a9b3c1f7e48', key: 'threerivers_sidewalks', title: 'City of Three Rivers Sidewalks', snippet: 'Sidewalk centerlines digitized by the City of Three Rivers Public Works department (2025).', tags: ['transportation'], groupCategories: ['/Categories/Transportation'], extent: [[-85.66, 41.92], [-85.57, 41.98]], created: '2025-07-11', modified: '2026-03-02',
    fields: [['OBJECTID', 'OBJECTID', 'esriFieldTypeOID', false], ['highway', 'highway', 'esriFieldTypeString', true], ['footway', 'footway', 'esriFieldTypeString', true], ['surface', 'surface', 'esriFieldTypeString', true]],
    geometryType: 'esriGeometryPolyline', features: esriSidewalks },
  { id: 'f04a1c7be2d94b8a9a3e5c6d7b8e9f01', key: 'kzoo_addresses', title: 'Kalamazoo County, MI Address Points', snippet: 'Address points from Kalamazoo County, Michigan.', tags: ['addresses'], groupCategories: ['/Categories/Addresses'], extent: [[-85.80, 42.07], [-85.29, 42.42]], created: '2023-10-19', modified: '2025-12-01', fields: [['OBJECTID', 'OBJECTID', 'esriFieldTypeOID', false]], geometryType: 'esriGeometryPoint', features: [] },
  { id: '5d2e7f8a9b0c4d1e8f2a3b4c5d6e7f80', key: 'mi_trailheads', title: 'Michigan DNR Trailheads', snippet: 'Trailhead locations for state-managed trails in Michigan.', tags: ['recreation'], groupCategories: ['/Categories/Recreation'], extent: [[-90.4, 41.7], [-82.4, 48.3]], created: '2022-05-23', modified: '2025-06-14', fields: [['OBJECTID', 'OBJECTID', 'esriFieldTypeOID', false]], geometryType: 'esriGeometryPoint', features: [] },
  { id: '9e8d7c6b5a4f4e3d2c1b0a9f8e7d6c5b', key: 'lansing_buildings', title: 'City of Lansing Building Footprints', snippet: 'Building outlines from the City of Lansing, MI.', tags: ['buildings'], groupCategories: ['/Categories/Buildings'], extent: [[-84.65, 42.65], [-84.47, 42.80]], created: '2021-08-30', modified: '2024-02-21', fields: [['OBJECTID', 'OBJECTID', 'esriFieldTypeOID', false]], geometryType: 'esriGeometryPolygon', features: [] },
];

const out = {
  me: ME, users, bbox: BBOX, esri,
  changesets: changesets.map(c => ({ id: c.id, uid: c.uid, user: userName.get(c.uid), created_at: isoAt(c.t), closed_at: isoAt(c.t + randInt(60, 3000) * 1000), comment: c.comment, created_by: c.editor, changes_count: randInt(1, 480) })),
  entities, notes: notes.map(n => ({ ...n, created: isoAt(n.created), closed: n.closed && isoAt(n.closed), comments: n.comments.map(c => ({ ...c, date: isoAt(c.date) })) }))
};
fs.mkdirSync(path.join(here, 'data'), { recursive: true });
fs.writeFileSync(path.join(here, 'data/world.json'), JSON.stringify(out));
console.log(`world.json: ${entities.length} entities, ${out.changesets.length} changesets, ${notes.length} notes, ${users.length} users`);
