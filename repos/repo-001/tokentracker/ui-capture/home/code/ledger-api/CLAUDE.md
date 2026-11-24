# ledger-api

Go 1.25 service. Postgres 17, Redis 7. `make test` runs unit tests, `make itest` needs docker compose.

## Conventions
- Handlers live in internal/http, business logic in internal/ledger. No SQL in handlers.
- Money is always int64 minor units + ISO currency. Use the Money type, never float64.
- Every write endpoint must accept an Idempotency-Key header.
- Feature flags via internal/flags; default off.

## Gotchas
- settlement_test.go uses a shared test DB schema per package — don't run it with -p > 1.
- FX rates come from the fx_rates table, backfilled nightly; missing dates fall back to previous business day.
