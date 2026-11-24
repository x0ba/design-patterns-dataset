'use strict';
// Test helper only (not used by start.sh): simulates an offline sandbox where DNS
// still answers with public IPs but outbound connections are refused. Load it
// BEFORE offline-preload.cjs to verify the preload keeps the server alive.
const dns = require('dns');
const net = require('net');
const resolve = h => (net.isIP(h) ? { address: h, family: net.isIP(h) }
  : h === 'localhost' ? { address: '127.0.0.1', family: 4 }
  : { address: '93.184.215.14', family: 4 });
dns.lookup = (h, o, cb) => {
  if (typeof o === 'function') cb = o;
  const r = resolve(h);
  process.nextTick(() => (o && o.all ? cb(null, [r]) : cb(null, r.address, r.family)));
};
dns.promises.lookup = async (h, o) => (o && o.all ? [resolve(h)] : resolve(h));
