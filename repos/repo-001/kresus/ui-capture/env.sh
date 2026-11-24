# Shared environment for running Kresus locally (sourced by start.sh / reseed.sh).
UI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export NODE_ENV=production
export KRESUS_DIR="$UI/data"
export KRESUS_DB_TYPE=sqlite
export KRESUS_DB_SQLITE_PATH="$UI/data/db.sqlite"
export KRESUS_SALT="local-placeholder-salt-for-ui-capture"
export KRESUS_PYTHON_EXEC="$UI/woob-stub.js"
export KRESUS_EMAIL_TRANSPORT=sendmail
export KRESUS_EMAIL_SENDMAIL_BIN="$UI/sendmail-stub.sh"
export KRESUS_EMAIL_FROM="kresus@localhost"
export HOST=127.0.0.1
