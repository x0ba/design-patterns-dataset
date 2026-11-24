"""Settings overlay for running HealthStack locally (UI capture).

Imports the project's own settings and only overrides what is needed to run
fully offline on localhost.
"""
import os
from healthstack.settings import *  # noqa

ALLOWED_HOSTS = ['*']

# Hide the django-debug-toolbar handle; a real user would never see it.
DEBUG_TOOLBAR_CONFIG = {'SHOW_TOOLBAR_CALLBACK': lambda request: False}

# Email (Mailtrap in the original) -> written to files under .ui-capture/mail
EMAIL_BACKEND = 'django.core.mail.backends.filebased.EmailBackend'
EMAIL_FILE_PATH = os.path.join(BASE_DIR, '.ui-capture', 'mail')

# Rewrite browser-side CDN URLs (bootstrap, fontawesome, google fonts, ...)
# to locally vendored copies under /static/vendor/.
MIDDLEWARE = MIDDLEWARE + ['ui_cdn_rewrite.CdnRewriteMiddleware']

# SSLCommerz payment gateway -> local stub server (see sslcommerz_stub.py)
SSLCZ_STUB_URL = os.environ.get('SSLCZ_STUB_URL', 'http://127.0.0.1:4453')

import sslcommerz_lib.sslcommerz as _sslcz_mod  # noqa: E402

_orig_init = _sslcz_mod.SSLCOMMERZ.__init__


def _stub_init(self, config):
    _orig_init(self, config)
    base = SSLCZ_STUB_URL.rstrip('/')
    self.createSessionUrl = base + '/gwprocess/v4/api.php'
    self.validation_url = base + '/validator/api/validationserverAPI.php'
    self.transaction_url = base + '/validator/api/merchantTransIDvalidationAPI.php'


_sslcz_mod.SSLCOMMERZ.__init__ = _stub_init

# Use a working copy of the repo's bundled SQLite DB (seeded by seed.py)
DATABASES['default']['NAME'] = os.environ.get('UI_DB_PATH') or os.path.join(BASE_DIR, '.ui-capture', 'data', 'db.sqlite3')
