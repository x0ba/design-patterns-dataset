"""Local stand-in for the SSLCommerz sandbox payment gateway.

Implements the endpoints sslcommerz_lib calls:
  POST /gwprocess/v4/api.php                         -> create session
  GET  /gwprocess/v4/gw.php?Q=pay&SESSIONKEY=...     -> hosted checkout page
  GET  /validator/api/validationserverAPI.php        -> validate val_id
  GET  /validator/api/merchantTransIDvalidationAPI.php
The checkout page posts a VALID IPN-style payload (with a correct verify_sign)
back to the merchant's success_url, like the real gateway does.
"""
import hashlib
import html
import json
import os
import random
import string
import sys
import uuid
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

PORT = int(os.environ.get('SSLCZ_STUB_PORT', '4453'))
PUBLIC = os.environ.get('SSLCZ_STUB_PUBLIC', 'http://localhost:%d' % PORT)
STORE_PASS = os.environ.get('STORE_PASSWORD', 'healthstack-local@ssl')
SESSIONS = {}
VALIDATED = {}


def rnd(n, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choices(chars, k=n))


def sign(fields):
    keys = sorted(fields)
    params = dict(fields)
    params['store_passwd'] = hashlib.md5(STORE_PASS.encode()).hexdigest()
    s = '&'.join('%s=%s' % (k, params[k]) for k in sorted(params))
    return ','.join(keys), hashlib.md5(s.encode()).hexdigest()


class H(BaseHTTPRequestHandler):
    def log_message(self, fmt, *a):
        sys.stderr.write('[sslcommerz-stub] ' + fmt % a + '\n')

    def _send(self, code, body, ctype='application/json'):
        b = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header('Content-Type', ctype + '; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        u = urlparse(self.path)
        n = int(self.headers.get('Content-Length') or 0)
        data = {k: v[0] for k, v in parse_qs(self.rfile.read(n).decode()).items()}
        if u.path.endswith('/gwprocess/v4/api.php'):
            key = uuid.uuid4().hex.upper()
            SESSIONS[key] = data
            self._send(200, json.dumps({
                'status': 'SUCCESS', 'failedreason': '', 'sessionkey': key,
                'gw': {'visa': 'city_visa,ebl_visa,dbbl_visa', 'master': 'city_master,ebl_master',
                       'amex': 'city_amex', 'othercards': 'qcash,fastcash',
                       'internetbanking': 'city,bankasia,ibbl,mtbl', 'mobilebanking': 'bkash,dbblmobilebanking,mycash'},
                'redirectGatewayURL': PUBLIC + '/gwprocess/v4/bankgw/indexhtml.php?mamount=%s&ssl_id=%s' % (data.get('total_amount'), key),
                'GatewayPageURL': PUBLIC + '/gwprocess/v4/gw.php?Q=pay&SESSIONKEY=' + key,
                'storeBanner': '', 'storeLogo': '', 'desc': [], 'is_direct_pay_enable': '0',
            }))
        else:
            self._send(404, json.dumps({'status': 'FAILED'}))

    def do_GET(self):
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        if u.path.endswith('/gw.php'):
            s = SESSIONS.get(q.get('SESSIONKEY'))
            if not s:
                return self._send(404, '<h3>Session expired</h3>', 'text/html')
            return self._send(200, self.checkout_page(s), 'text/html')
        if 'validationserverAPI' in u.path:
            v = VALIDATED.get(q.get('val_id'), {})
            return self._send(200, json.dumps(dict(v, status='VALID' if v else 'INVALID_TRANSACTION', APIConnect='DONE')))
        if 'merchantTransIDvalidationAPI' in u.path:
            return self._send(200, json.dumps({'APIConnect': 'DONE', 'no_of_trans_found': 1, 'element': list(VALIDATED.values())[-1:]}))
        self._send(404, json.dumps({'status': 'FAILED'}))

    def checkout_page(self, s):
        amount = s.get('total_amount', '0')
        tran_id = s.get('tran_id', '')
        val_id = datetime.now().strftime('%y%m%d%H%M') + rnd(9)
        f = {
            'tran_id': tran_id, 'val_id': val_id, 'amount': amount,
            'card_type': 'BKASH-BKash', 'store_amount': '%.2f' % (float(amount) * 0.975),
            'card_no': '01711XXXX42', 'bank_tran_id': datetime.now().strftime('%y%m%d%H%M%S') + rnd(6, string.digits),
            'status': 'VALID', 'tran_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'currency': 'BDT', 'card_issuer': 'BKash Mobile Banking', 'card_brand': 'MOBILEBANKING',
            'card_issuer_country': 'Bangladesh', 'card_issuer_country_code': 'BD',
            'currency_type': 'BDT', 'currency_amount': amount, 'risk_level': '0', 'risk_title': 'Safe',
        }
        vk, vs = sign(f)
        f['verify_key'], f['verify_sign'] = vk, vs
        VALIDATED[val_id] = f
        inputs = ''.join('<input type="hidden" name="%s" value="%s">' % (html.escape(k), html.escape(str(v))) for k, v in f.items())
        return '''<!doctype html><html><head><meta charset="utf-8"><title>SSLCommerz Payment</title>
<style>body{font-family:Arial,sans-serif;background:#eef2f7;margin:0}
.box{max-width:460px;margin:60px auto;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.12);overflow:hidden}
.hd{background:#0a3d62;color:#fff;padding:18px 24px}.hd b{font-size:18px}.bd{padding:24px}
.row{display:flex;justify-content:space-between;margin:8px 0;color:#333}.amt{font-size:26px;color:#0a3d62;font-weight:bold}
button{width:100%%;padding:12px;border:0;border-radius:5px;font-size:16px;cursor:pointer;margin-top:10px}
.pay{background:#e2136e;color:#fff}.cancel{background:#ddd;color:#333}</style></head><body>
<div class="box"><div class="hd"><b>%s</b><br><small>Secured by SSLCommerz (local sandbox)</small></div><div class="bd">
<div class="row"><span>Customer</span><span>%s</span></div>
<div class="row"><span>Transaction</span><span>%s</span></div>
<div class="row"><span>Method</span><span>bKash (01711XXXX42)</span></div>
<div class="row"><span>Amount</span><span class="amt">&#2547; %s</span></div>
<form method="post" action="%s">%s<button class="pay" type="submit">Pay Now</button></form>
<form method="post" action="%s"><input type="hidden" name="tran_id" value="%s"><input type="hidden" name="status" value="CANCELLED"><button class="cancel" type="submit">Cancel</button></form>
</div></div></body></html>''' % (
            html.escape(os.environ.get('STORE_NAME', 'HealthStack')), html.escape(s.get('cus_name', '')),
            html.escape(tran_id), html.escape(amount), html.escape(s.get('success_url', '')), inputs,
            html.escape(s.get('cancel_url', '')), html.escape(tran_id))


if __name__ == '__main__':
    print('SSLCommerz stub listening on 127.0.0.1:%d' % PORT, flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
