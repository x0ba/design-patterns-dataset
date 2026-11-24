# Shared environment for the EdgeEver self-hosted server (sourced by start.sh / seed.sh).
UI_CAPTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$UI_CAPTURE_DIR")"
export EDGE_EVER_AUTH_USERNAME=maya
export EDGE_EVER_AUTH_PASSWORD='Fieldnotes-2026'
export EDGE_EVER_HOST=127.0.0.1
export EDGE_EVER_SESSION_TTL_DAYS=400
# Placeholder secrets so nothing is generated from the network / keychain.
export EDGE_EVER_CREDENTIALS_ENCRYPTION_KEY='local-ui-capture-placeholder-credentials-key-0001'
# Plugin/community registry points at a local stub (no outside network).
export EDGE_EVER_COMMUNITY_REGISTRY_URL="http://127.0.0.1:${STUB_PORT:-4499}/registry/index.json"
