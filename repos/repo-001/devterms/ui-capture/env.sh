# Environment for building and running DevTerms fully offline against local stubs.
# Sourced by build.sh / start.sh. All secrets are placeholders.
export PORT="${PORT:-4475}"
export NEXT_PUBLIC_BASE_URL="http://localhost:4475"
export TURSO_DATABASE_URL="http://127.0.0.1:4488"
export TURSO_AUTH_TOKEN="local-stub-token"
export CRON_SECRET="local-cron-secret"
export OG_HMAC_SECRET="local-og-hmac-secret"
export GITHUB_CLIENT_ID="Iv1.localstubclient"
export GITHUB_CLIENT_SECRET="local-stub-github-secret"
export GITHUB_OAUTH_AUTHORIZE_URL="http://localhost:4486/github/login/oauth/authorize"
export UPSTASH_REDIS_REST_URL="http://127.0.0.1:4486/upstash"
export UPSTASH_REDIS_REST_TOKEN="local-stub-upstash-token"
export MEILISEARCH_MASTER_KEY="local-meili-master-key"
export NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY="local-meili-search-key"
export NEXT_PUBLIC_MEILISEARCH_HOST="http://localhost:4487"
export NEXT_PUBLIC_PLAUSIBLE_SRC="http://localhost:4486/plausible/js/script.js"
export NEXT_TELEMETRY_DISABLED=1
export NODE_NO_WARNINGS=1
