/**
 * Generates the JSON database served by ../stub-server/server.js.
 * Models an established user (Maya Okafor, backend lead at "Ledgerly") after ~10 months of use:
 * an organization with several workspaces, many collections / folders / REST, GraphQL, WebSocket
 * and Socket.IO requests, environments and teammates. Deterministic (seeded PRNG).
 */
const fs = require('fs');
const path = require('path');
const { lib } = require('./catalog');

let seed = 20260117;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
const nid = (n = 21) => Array.from({ length: n }, () => ALPH[Math.floor(rnd() * 64)]).join('');

const NOW = Date.UTC(2026, 10, 16, 15, 20);
const DAY = 86400000;
const ago = (days, jitterH = 10) => Math.round(NOW - days * DAY - rnd() * jitterH * 3600000);

/* ------------------------------ people ------------------------------ */
const people = [
  ['Maya Okafor', 'mayaokafor', 'maya.okafor@ledgerly.io'],
  ['Daniel Reyes', 'dreyes', 'daniel.reyes@ledgerly.io'],
  ['Priya Natarajan', 'priyan', 'priya.natarajan@ledgerly.io'],
  ['Tomasz Wiśniewski', 'tomasz.w', 'tomasz@ledgerly.io'],
  ['Hana Kobayashi', 'hanak', 'hana.kobayashi@ledgerly.io'],
  ['Femi Adeyemi', 'femi', 'femi.adeyemi@ledgerly.io'],
  ['Lucía Fernández', 'luciaf', 'lucia.fernandez@ledgerly.io'],
  ['Sam Whitaker', 'swhitaker', 'sam@ledgerly.io'],
  ['Arjun Mehta', 'arjunm', 'arjun.mehta@ledgerly.io'],
  ['Chloé Martin', 'chloe.m', 'chloe.martin@ledgerly.io'],
];
const users = people.map(([name, username, email], i) => ({
  name, username, email,
  password: i === 0 ? 'Campfire#2026' : nid(16),
  __meta: {},
  __ref: { id: i === 0 ? 'usr_maya_okafor' : `usr_${username.replace(/\W/g, '')}`, createdAt: ago(320 - i * 9) },
}));
const U = users.map((u) => u.__ref.id);
const author = () => pick([U[0], U[0], U[0], U[1], U[2], U[3], U[4], U[5]]);

/* ------------------------------ org & workspaces ------------------------------ */
const org = { name: 'Ledgerly', description: 'Payments & treasury infrastructure for B2B marketplaces', __ref: { id: 'org_ledgerly', createdAt: ago(318), createdBy: U[0] } };
const org2 = { name: 'Kestrel Labs (consulting)', description: 'Side project with former colleagues', __ref: { id: 'org_kestrel', createdAt: ago(140), createdBy: U[0] } };

const mkWrs = (id, name, description, orgId, created) => ({
  name, description, __meta: { cOrders: [], type: orgId ? 2 : 1 },
  __ref: { id, orgId, createdAt: created, createdBy: U[0], updatedAt: ago(rnd() * 20) },
});
const workspaces = [
  mkWrs('wrs_payments_platform', 'Payments Platform', 'Core payments, ledger and payout APIs. Source of truth for anything touching money movement.', org.__ref.id, ago(316)),
  mkWrs('wrs_mobile_backend', 'Mobile Backend', 'BFF endpoints consumed by the iOS / Android merchant apps.', org.__ref.id, ago(240)),
  mkWrs('wrs_partner_integrations', 'Partner Integrations', 'Bank, KYC and accounting partner sandboxes.', org.__ref.id, ago(201)),
  mkWrs('wrs_data_platform', 'Data & Reporting', 'Warehouse export jobs and finance reporting endpoints.', org.__ref.id, ago(95)),
  mkWrs('wrs_kestrel_core', 'Kestrel Booking API', 'Booking engine for the climbing-gym client.', org2.__ref.id, ago(138)),
  mkWrs('wrs_maya_personal', "Maya's Sandbox", 'Personal scratch space', undefined, ago(330)),
];
users[0].__meta.defaultWorkspaceId = workspaces[0].__ref.id;

const roleOwner = 1, roleAdmin = 2, roleCollab = 3, roleViewer = 4;
const workspaceMembers = {
  wrs_payments_platform: [[0, roleOwner], [1, roleAdmin], [2, roleCollab], [3, roleCollab], [4, roleCollab], [5, roleCollab], [6, roleViewer], [8, roleCollab]],
  wrs_mobile_backend: [[0, roleAdmin], [4, roleOwner], [7, roleCollab], [9, roleCollab]],
  wrs_partner_integrations: [[0, roleOwner], [2, roleCollab], [6, roleCollab]],
  wrs_data_platform: [[8, roleOwner], [0, roleCollab], [3, roleViewer]],
  wrs_kestrel_core: [[0, roleOwner]],
  wrs_maya_personal: [[0, roleOwner]],
};
Object.keys(workspaceMembers).forEach((k) => (workspaceMembers[k] = workspaceMembers[k].map(([i, role]) => ({ userId: U[i], role }))));
const workspaceInvites = {
  wrs_payments_platform: [
    { __ref: { id: 'inv_1' }, name: '', email: 'oliver.grant@ledgerly.io', role: roleCollab },
    { __ref: { id: 'inv_2' }, name: '', email: 'contractor.qa@testpilot.dev', role: roleViewer },
  ],
};
const orgMembers = {
  org_ledgerly: users.map((u, i) => ({ userId: u.__ref.id, role: i === 0 ? roleOwner : i < 3 ? roleAdmin : roleCollab })),
  org_kestrel: [{ userId: U[0], role: roleOwner }],
};
const pendingInvitations = [
  { token: 'tok_inv_harbor', inviterName: 'Rafael Costa', orgName: 'Harbor Freight Tech', workspaceName: 'Carrier Webhooks', role: roleCollab, workspaceId: 'x', orgId: 'x' },
];

/* ------------------------------ builders ------------------------------ */
const db = {
  currentUserId: U[0], users, organizations: [org, org2], workspaces, workspaceMembers, workspaceInvites, orgMembers, pendingInvitations,
  collections: [], folders: [], requests: [], requestItems: [], requestFolders: [], environments: [],
};

const script = (type, code) => ({ id: nid(), type, language: 'text/javascript', value: code.split('\n') });
const kv = (key, value, extra = {}) => ({ id: nid(), key, value: String(value), ...extra });

function addCollection(wrs, def, createdDaysAgo) {
  const created = ago(createdDaysAgo);
  const c = {
    name: def.name,
    description: def.description || '',
    auth: def.auth,
    preScripts: def.pre ? [script('prerequest', def.pre)] : [],
    postScripts: def.post ? [script('test', def.post)] : [],
    variables: (def.variables || []).map(([k, v, t]) => kv(k, v, { type: t || 'text' })),
    __meta: { fOrders: [], rOrders: [] },
    __ref: { id: nid(), workspaceId: wrs.__ref.id, createdAt: created, createdBy: U[0], updatedAt: ago(createdDaysAgo * rnd() * 0.5), updatedBy: author() },
  };
  db.collections.push(c);
  wrs.__meta.cOrders.push(c.__ref.id);
  const walk = (parent, children, folderId, age) => {
    for (const ch of children || []) {
      if (ch.folder) {
        const f = {
          name: ch.folder, description: ch.description || '', auth: ch.auth,
          preScripts: ch.pre ? [script('prerequest', ch.pre)] : [], postScripts: [],
          __meta: { fOrders: [], rOrders: [] },
          __ref: { id: nid(), collectionId: c.__ref.id, folderId, createdAt: ago(age * (0.75 + rnd() * 0.25)), createdBy: author() },
        };
        db.folders.push(f);
        parent.__meta.fOrders.push(f.__ref.id);
        walk(f, ch.items, f.__ref.id, age * 0.9);
      } else {
        const r = buildRequest(ch, c.__ref.id, folderId, age);
        db.requests.push(r);
        parent.__meta.rOrders.push(r.__ref.id);
      }
    }
  };
  walk(c, def.items, undefined, createdDaysAgo);
  return c;
}

function parseUrl(raw) {
  const [base, qs] = raw.split('?');
  const pathParams = (base.match(/\/:([a-zA-Z_]+)/g) || []).map((m) => m.slice(2));
  const queryParams = qs ? qs.split('&').map((p) => { const [k, v = ''] = p.split('='); return kv(k, decodeURIComponent(v)); }) : [];
  return { pathParams, queryParams };
}

function buildRequest(d, collectionId, folderId, age) {
  const created = ago(age * (0.3 + rnd() * 0.7));
  const updated = Math.min(NOW - 3600000, created + rnd() * (NOW - created));
  const __ref = { id: nid(), collectionId, folderId, createdAt: created, createdBy: author(), updatedAt: Math.round(updated), updatedBy: author() };
  const type = d.type || 'rest';
  if (type === 'rest') {
    const { pathParams, queryParams } = parseUrl(d.url);
    const pv = d.pathValues || {};
    return {
      url: {
        raw: d.url,
        queryParams: queryParams.map((q) => (d.disabledQuery || []).includes(q.key) ? { ...q, disable: true } : q),
        pathParams: pathParams.map((k) => kv(k, pv[k] || '')),
      },
      method: d.method,
      headers: (d.headers || []).map(([k, v, desc]) => kv(k, v, desc ? { description: desc } : {})),
      body: d.json !== undefined
        ? { type: 'application/json', value: typeof d.json === 'string' ? d.json : JSON.stringify(d.json, null, 2) }
        : d.form ? { type: 'application/x-www-form-urlencoded', value: d.form.map(([k, v]) => kv(k, v, { type: 'text' })) }
        : d.multipart ? { type: 'multipart/form-data', value: d.multipart.map(([k, v, t]) => kv(k, v, { type: t || 'text' })) }
        : d.xml ? { type: 'application/xml', value: d.xml }
        : { type: 'none', value: '' },
      auth: d.auth || { type: 'inherit', value: '' },
      config: { maxRedirects: 5, rejectUnauthorized: !d.insecure, requestTimeout: d.timeout || 30000, followLocation: true },
      preScripts: d.pre ? [script('prerequest', d.pre)] : [],
      postScripts: d.test ? [script('test', d.test)] : [],
      __meta: { name: d.name, description: d.desc || '', type: 'rest', version: '2.0.0' },
      __ref,
    };
  }
  if (type === 'graphql') {
    const r = {
      method: 'POST', url: { raw: d.url, queryParams: [], pathParams: [] },
      headers: (d.headers || []).map(([k, v]) => kv(k, v)),
      config: { maxRedirects: 5, rejectUnauthorized: true, requestTimeout: 30000 },
      __meta: { name: d.name, description: d.desc || '', type: 'graphql', version: '2.0.0', fOrders: [], iOrders: [] },
      __ref,
    };
    addSubItems(r, d.items || [], (it) => ({ value: { query: it.query, variables: it.variables ? JSON.stringify(it.variables, null, 2) : '{}' }, __meta: { type: it.query.trim().startsWith('mutation') ? 'm' : it.query.trim().startsWith('subscription') ? 's' : 'q' } }), 'graphql');
    return r;
  }
  if (type === 'websocket') {
    const { queryParams } = parseUrl(d.url);
    const r = {
      url: { raw: d.url, queryParams, pathParams: [] },
      config: { reconnect: false, reconnectAttempts: 3, reconnectTimeout: 3000, rejectUnauthorized: true, followRedirects: false, handshakeTimeout: 3000, maxRedirects: 10, protocolVersion: 13, origin: '', maxPayload: 0, protocols: d.protocols || [] },
      connection: { id: nid(), name: 'Default', isDefault: true, headers: (d.headers || []).map(([k, v]) => kv(k, v)), queryParams, ping: !!d.ping, pingInterval: 30000 },
      __meta: { name: d.name, description: d.desc || '', type: 'websocket', version: '2.0.0', fOrders: [], iOrders: [] },
      __ref,
    };
    addSubItems(r, d.items || [], (it) => ({ value: typeof it.body === 'string' ? it.body : JSON.stringify(it.body, null, 2), __meta: { type: typeof it.body === 'string' ? 'text' : 'json' } }), 'websocket');
    return r;
  }
  if (type === 'socketio') {
    const { queryParams } = parseUrl(d.url);
    const r = {
      url: { raw: d.url.split('?')[0], queryParams, pathParams: [] },
      config: { version: d.version || 'v4', rejectUnauthorized: true, timeout: 20000, reconnection: false, reconnectionAttempts: 3, reconnectionDelay: 1000, reconnectionDelayMax: 5000, onConnectListeners: d.listeners || [] },
      connection: { id: nid(), name: 'Default', isDefault: true, forceNew: false, namespace: d.namespace || '/', path: '/socket.io', ping: false, pingInterval: 3000, transports: { websocket: true, polling: true }, headers: (d.headers || []).map(([k, v]) => kv(k, v)), queryParams, auth: (d.authKv || []).map(([k, v]) => kv(k, v)) },
      listeners: (d.listeners || []).map((n) => ({ id: nid(), name: n, description: '' })),
      __meta: { name: d.name, description: d.desc || '', type: 'socketio', version: '2.0.0', fOrders: [], iOrders: [] },
      __ref,
    };
    addSubItems(r, d.items || [], (it) => ({ value: (it.args || []).map((a) => ({ body: typeof a === 'string' ? a : JSON.stringify(a, null, 2), __meta: { type: typeof a === 'string' ? 'text' : 'json' } })), __meta: { label: it.label || '', ack: !!it.ack } }), 'socketio');
    return r;
  }
  throw new Error('unknown type ' + type);
}

function addSubItems(request, items, mapValue, requestType) {
  const rid = request.__ref.id;
  const cid = request.__ref.collectionId;
  const walk = (list, folderId, orders) => {
    for (const it of list) {
      if (it.folder) {
        const f = { name: it.folder, __meta: { fOrders: [], iOrders: [] }, __ref: { id: nid(), collectionId: cid, requestId: rid, folderId, requestType, createdAt: request.__ref.createdAt, createdBy: request.__ref.createdBy } };
        db.requestFolders.push(f);
        orders.fOrders.push(f.__ref.id);
        walk(it.items, f.__ref.id, f.__meta);
      } else {
        const m = { name: it.name, ...mapValue(it), __ref: { id: nid(), collectionId: cid, requestId: rid, folderId, requestType, createdAt: request.__ref.createdAt, createdBy: request.__ref.createdBy } };
        db.requestItems.push(m);
        orders.iOrders.push(m.__ref.id);
      }
    }
  };
  walk(items, undefined, request.__meta);
}

function addEnv(wrs, name, vars, isGlobal = false, days = 200) {
  db.environments.push({
    name, description: '',
    variables: vars.map(([k, v, t]) => ({ id: nid(), key: k, value: v, initialValue: v, type: t || 'text' })),
    __meta: isGlobal ? { isGlobal: true } : {},
    __ref: { id: isGlobal ? `global_${wrs.__ref.id}` : nid(), workspaceId: wrs.__ref.id, createdAt: ago(days), createdBy: U[0], updatedAt: ago(days * rnd() * 0.4), updatedBy: author() },
  });
}

/* ------------------------------ content ------------------------------ */
lib({ db, workspaces, addCollection, addEnv, rnd, pick, nid });

const out = process.argv[2] || path.join(__dirname, '../data/db.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(db));
console.log(`seeded: ${db.collections.length} collections, ${db.folders.length} folders, ${db.requests.length} requests, ${db.requestItems.length} saved messages/queries, ${db.environments.length} environments → ${out}`);
