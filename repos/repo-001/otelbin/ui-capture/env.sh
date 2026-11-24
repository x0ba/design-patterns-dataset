# Shared environment for build.sh / start.sh. All values are local placeholders.
UI_CAPTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export STUB_PORT="${STUB_PORT:-4411}"
export OTELBIN_STUB_CLERK=1
export NEXT_TELEMETRY_DISABLED=1
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$UI_CAPTURE_DIR/fonts/google-fonts-mock.js"
export UPSTASH_REDIS_REST_URL="http://localhost:$STUB_PORT/redis"
export UPSTASH_REDIS_REST_TOKEN="local-dev-upstash-token-AX3bQ0"
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_bG9jYWwuY2xlcmsuaW52YWxpZCQ"
export CLERK_SECRET_KEY="sk_test_localplaceholder0000000000000000000000"
export COLLECTOR_CONFIGURATION_VALIDATION_URL="http://localhost:$STUB_PORT"
export COLLECTOR_CONFIGURATION_VALIDATION_API_KEY="local-validation-api-key"
# Vercel Web Analytics endpoint (/_vercel/insights/*) -> local stub. Rewrites are
# baked in at build time, so this always points at the default stub port.
export OTELBIN_STUB_VERCEL_INSIGHTS_URL="http://localhost:4411"
