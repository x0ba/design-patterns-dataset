// Minimal local stand-in for the Stripe API + hosted Checkout page, so the
// shop's Card rail works with no network. The Worker's Stripe SDK is pointed
// here via STRIPE_API_BASE. Implements what minshop calls:
//   POST /v1/checkout/sessions, GET /v1/checkout/sessions[/:id],
//   POST/GET /v1/refunds
// and serves GET/POST /c/pay/:id — a hosted-checkout page that, on "Pay",
// sends a signed checkout.session.completed webhook to the app and redirects
// the shopper to success_url (like Stripe does).
//   node stripe-stub.mjs <port> <app origin> <whsec>
import http from 'node:http';
import { createHmac, randomBytes } from 'node:crypto';

const [port = '4479', appOrigin = 'http://127.0.0.1:4424', whsec = 'whsec_local_stub'] = process.argv.slice(2);
const sessions = new Map();
const refunds = [];
const id = (p, n = 24) => p + randomBytes(n).toString('base64url').replace(/[-_]/g, 'x').slice(0, n);

// Decode Stripe's bracketed form encoding (a[b][0][c]=v) into nested objects.
function parseForm(body) {
  const root = {};
  for (const [k, v] of new URLSearchParams(body)) {
    const parts = k.replace(/\]/g, '').split('[');
    let cur = root;
    parts.forEach((p, i) => {
      const last = i === parts.length - 1;
      const nextIsIndex = !last && /^\d+$/.test(parts[i + 1]);
      if (last) cur[p] = v;
      else cur = cur[p] ??= nextIsIndex ? [] : {};
    });
  }
  return root;
}
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const read = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });
const money = (c) => `$${(c / 100).toFixed(2)}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const body = req.method === 'POST' ? await read(req) : '';
  try {
    if (req.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
      const p = parseForm(body);
      const items = (p.line_items || []).map((li) => ({ name: li.price_data.product_data.name, unit: Number(li.price_data.unit_amount), qty: Number(li.quantity), currency: li.price_data.currency }));
      const subtotal = items.reduce((s, i) => s + i.unit * i.qty, 0);
      const options = (p.shipping_options || []).map((o, k) => ({ id: `shr_${k}${randomBytes(6).toString('hex')}`, display_name: o.shipping_rate_data.display_name, amount: Number(o.shipping_rate_data.fixed_amount.amount), metadata: o.shipping_rate_data.metadata || {} }));
      const s = {
        id: id('cs_test_a1', 58), object: 'checkout.session', mode: 'payment', status: 'open', payment_status: 'unpaid',
        currency: items[0]?.currency || 'usd', amount_subtotal: subtotal, amount_total: subtotal, metadata: p.metadata || {},
        success_url: p.success_url, cancel_url: p.cancel_url, expires_at: Number(p.expires_at), created: Math.floor(Date.now() / 1000),
        _items: items, _options: options, payment_intent: null, customer_details: null, shipping_details: null, total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 },
      };
      s.url = `http://localhost:${port}/c/pay/${s.id}`;
      sessions.set(s.id, s);
      return json(res, 200, s);
    }
    let m;
    if (req.method === 'GET' && (m = url.pathname.match(/^\/v1\/checkout\/sessions\/([^/]+)$/))) {
      const s = sessions.get(m[1]);
      return s ? json(res, 200, s) : json(res, 404, { error: { type: 'invalid_request_error', message: `No such checkout.session: '${m[1]}'` } });
    }
    if (req.method === 'GET' && url.pathname === '/v1/checkout/sessions') {
      const pi = url.searchParams.get('payment_intent');
      return json(res, 200, { object: 'list', data: [...sessions.values()].filter((s) => !pi || s.payment_intent === pi), has_more: false });
    }
    if (url.pathname === '/v1/refunds') {
      if (req.method === 'POST') {
        const p = parseForm(body);
        const r = { id: id('re_3S', 22), object: 'refund', amount: Number(p.amount), payment_intent: p.payment_intent, status: 'succeeded', currency: 'usd', created: Math.floor(Date.now() / 1000) };
        refunds.push(r);
        return json(res, 200, r);
      }
      const pi = url.searchParams.get('payment_intent');
      return json(res, 200, { object: 'list', data: refunds.filter((r) => !pi || r.payment_intent === pi), has_more: false });
    }
    if ((m = url.pathname.match(/^\/c\/pay\/([^/]+)$/))) {
      const s = sessions.get(m[1]);
      if (!s) { res.writeHead(404); return res.end('Checkout session not found'); }
      if (req.method === 'GET') {
        const opts = s._options.map((o, k) => `<label class="opt"><input type="radio" name="rate" value="${k}" ${k === 0 ? 'checked' : ''}> ${esc(o.display_name)} <b>${o.amount ? money(o.amount) : 'Free'}</b></label>`).join('');
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Checkout</title><style>body{font:15px -apple-system,system-ui,sans-serif;margin:0;display:flex;min-height:100vh}main{flex:1;padding:60px 8vw}aside{flex:1;background:#f6f7f9;padding:60px 8vw}h2{font-weight:600}.row{display:flex;justify-content:space-between;margin:10px 0}input[type=text],input[type=email]{width:100%;padding:10px;margin:4px 0 12px;border:1px solid #d5d8dc;border-radius:6px;box-sizing:border-box}.opt{display:block;padding:10px;border:1px solid #d5d8dc;border-radius:6px;margin:6px 0}button{width:100%;padding:13px;border:0;border-radius:6px;background:#635bff;color:#fff;font-size:16px;margin-top:16px}small{color:#888}</style></head><body>
<aside><a href="${esc(s.cancel_url)}">&larr; Back</a><h2>Order summary</h2>${s._items.map((i) => `<div class="row"><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.unit * i.qty)}</span></div>`).join('')}<hr><div class="row"><b>Subtotal</b><b>${money(s.amount_subtotal)}</b></div></aside>
<main><form method="post"><h2>Contact</h2><input type="email" name="email" value="jordan.reyes@gmail.com" required><h2>Shipping address</h2><input type="text" name="name" value="Jordan Reyes"><input type="text" name="line1" value="1815 NE 15th Ave"><input type="text" name="city" value="Portland"><input type="text" name="state" value="OR"><input type="text" name="postal" value="97212">${opts ? `<h2>Shipping method</h2>${opts}` : ''}<h2>Payment</h2><input type="text" value="4242 4242 4242 4242" readonly><button>Pay</button><p><small>Local Stripe stub — no real charge.</small></p></form></main></body></html>`);
      }
      const f = new URLSearchParams(body);
      const rate = s._options[Number(f.get('rate') || 0)];
      const ship = rate ? rate.amount : 0;
      Object.assign(s, {
        status: 'complete', payment_status: 'paid', payment_intent: id('pi_3S', 22), amount_total: s.amount_subtotal + ship,
        customer_details: { email: f.get('email'), name: f.get('name') },
        shipping_details: { name: f.get('name'), address: { line1: f.get('line1'), line2: null, city: f.get('city'), state: f.get('state'), postal_code: f.get('postal'), country: 'US' } },
        collected_information: { shipping_details: { name: f.get('name'), address: { line1: f.get('line1'), line2: null, city: f.get('city'), state: f.get('state'), postal_code: f.get('postal'), country: 'US' } } },
        shipping_cost: rate ? { amount_total: ship, shipping_rate: { id: rate.id, display_name: rate.display_name, metadata: rate.metadata } } : null,
        total_details: { amount_discount: 0, amount_shipping: ship, amount_tax: 0 },
      });
      const { _items, _options, ...obj } = s;
      const event = JSON.stringify({ id: id('evt_1S', 22), object: 'event', type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000), data: { object: obj }, livemode: false, api_version: '2025-01-27' });
      const t = Math.floor(Date.now() / 1000);
      const sig = createHmac('sha256', whsec).update(`${t}.${event}`).digest('hex');
      const hook = await fetch(`${appOrigin}/api/webhook/stripe`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${sig}` }, body: event }).catch((e) => ({ status: String(e) }));
      console.log(`[stripe-stub] ${s.id} paid ${money(s.amount_total)} -> webhook ${hook.status}`);
      res.writeHead(303, { location: s.success_url.replace('{CHECKOUT_SESSION_ID}', s.id) });
      return res.end();
    }
    json(res, 404, { error: { type: 'invalid_request_error', message: `Unrecognized request URL (${req.method}: ${url.pathname})` } });
  } catch (e) {
    console.error('[stripe-stub]', e);
    json(res, 500, { error: { type: 'api_error', message: String(e) } });
  }
}).listen(Number(port), '127.0.0.1', () => console.log(`[stripe-stub] listening on http://localhost:${port}`));
