# Shared environment for the local Karakeep setup (sourced by start.sh and seed scripts).
UI="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
export DATA_DIR="$UI/data"
export NEXTAUTH_SECRET="local-ui-capture-secret-6f2c9a1e8b7d4c3f"
export NEXTAUTH_URL="http://localhost:${PORT:-4400}"
export NEXT_TELEMETRY_DISABLED=1
export DISABLE_NEW_RELEASE_CHECK=true
export npm_config_verify_deps_before_run=false
# Local stubs (see stubs/server.mjs)
export OPENAI_STUB_PORT=4411
export MEILI_STUB_PORT=4412
export OPENAI_API_KEY="sk-local-stub-placeholder"
export OPENAI_BASE_URL="http://127.0.0.1:${OPENAI_STUB_PORT}/v1"
export INFERENCE_TEXT_MODEL="gpt-4.1-mini"
export INFERENCE_IMAGE_MODEL="gpt-4o-mini"
export INFERENCE_ENABLE_AUTO_SUMMARIZATION=false
export MEILI_ADDR="http://127.0.0.1:${MEILI_STUB_PORT}"
export MEILI_MASTER_KEY="local-stub-master-key"
# Crawling needs the open internet; there is no browser here.
export CRAWLER_DOWNLOAD_BANNER_IMAGE=false
# Auto-indexing defaults to off when OPENAI_BASE_URL is set; the stub serves embeddings.
export EMBEDDING_ENABLE_AUTO_INDEXING=true
