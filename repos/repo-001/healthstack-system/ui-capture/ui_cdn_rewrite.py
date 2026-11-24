"""Middleware: point CDN asset URLs in HTML at locally vendored copies."""
import re

REWRITES = [
    ('https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/', '/static/vendor/bootstrap-5.0.2/'),
    ('https://cdn.jsdelivr.net/npm/bootstrap@4.0.0/dist/', '/static/vendor/bootstrap-4.0.0/'),
    ('https://cdn.jsdelivr.net/npm/popper.js@1.12.9/dist/', '/static/vendor/popper-1.12.9/'),
    ('https://code.jquery.com/jquery-3.2.1.slim.min.js', '/static/vendor/jquery/jquery-3.2.1.slim.min.js'),
    ('https://code.jquery.com/jquery-3.3.1.slim.min.js', '/static/vendor/jquery/jquery-3.3.1.slim.min.js'),
    ('https://cdn.datatables.net/1.12.1/', '/static/vendor/datatables-1.12.1/'),
    ('https://use.fontawesome.com/releases/v5.7.2/', '/static/vendor/fontawesome-5.7.2/'),
    ('https://fonts.googleapis.com/css?family=', '/static/vendor/fonts/css?family='),
    ('https://maps.googleapis.com/maps/api/js', '/static/vendor/noop.js'),
    ('https://www.googletagmanager.com/gtag/js', '/static/vendor/noop.js'),
]

_INTEGRITY = re.compile(r'\s(integrity|crossorigin)="[^"]*"')
_FONT_CSS = re.compile(r'/static/vendor/fonts/css\?family=([^"\'&]+)[^"\']*')


def _font_href(m):
    fam = m.group(1).split(':')[0].replace('+', '-').lower()
    return '/static/vendor/fonts/%s.css' % fam


class CdnRewriteMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        ctype = response.get('Content-Type', '')
        if 'text/html' not in ctype or getattr(response, 'streaming', False):
            return response
        try:
            html = response.content.decode(response.charset or 'utf-8')
        except Exception:
            return response
        changed = False
        for src, dst in REWRITES:
            if src in html:
                html = html.replace(src, dst)
                changed = True
        if changed:
            html = _FONT_CSS.sub(_font_href, html)
            # SRI hashes refer to the CDN builds; drop them on rewritten tags
            html = re.sub(r'<(link|script)\b[^>]*/static/vendor/[^>]*>',
                          lambda m: _INTEGRITY.sub('', m.group(0)), html)
            response.content = html.encode(response.charset or 'utf-8')
            if response.has_header('Content-Length'):
                response['Content-Length'] = str(len(response.content))
        return response
