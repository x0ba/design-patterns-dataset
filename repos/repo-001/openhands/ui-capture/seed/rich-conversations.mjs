// Hand-written, detailed conversations (full agent transcripts).
// `ago` = minutes before the anchor that the conversation was last updated.

export const RICH = [
  {
    id: "c7a91e04d2f84b6b9e1f3a0c55d2e801",
    title: "Fix N+1 queries on /v2/shipments list endpoint",
    ws: "harbor-api",
    branch: "jl/shipments-n-plus-one",
    ago: 95,
    duration: 38,
    model: "sonnet",
    status: "finished",
    tags: { project: "perf" },
    script(b, ws) {
      const p = ws.path;
      b.user(
        "The /v2/shipments list endpoint got really slow after we added carrier SLAs — p95 is ~2.4s in staging with page_size=100. I suspect N+1 queries on carrier and stops. Can you confirm and fix it? Keep the response schema identical.",
      );
      b.agent("I'll reproduce it with SQL logging turned on so we can count queries per request before changing anything.");
      b.run(
        "HARBOR_SQL_ECHO=1 uv run pytest tests/api/test_shipments.py::test_list_shipments_paginated -q -s 2>&1 | grep -c 'SELECT'",
        "203",
        { cwd: p, summary: "Count SQL queries for a 100-row page" },
      );
      b.view(
        `${p}/harbor/api/v2/shipments.py`,
        `    41\t@router.get("/shipments", response_model=Page[ShipmentOut])\n    42\tasync def list_shipments(\n    43\t    params: ShipmentFilters = Depends(),\n    44\t    session: AsyncSession = Depends(get_session),\n    45\t    org: Org = Depends(current_org),\n    46\t):\n    47\t    stmt = (\n    48\t        select(Shipment)\n    49\t        .where(Shipment.org_id == org.id)\n    50\t        .order_by(Shipment.created_at.desc())\n    51\t    )\n    52\t    stmt = apply_filters(stmt, params)\n    53\t    return await paginate(session, stmt, params)`,
        { summary: "Read list_shipments handler", thought: "203 queries for 100 rows = 1 + 2 per row. Carrier and stops are lazy-loaded during serialization." },
      );
      b.edit(
        `${p}/harbor/api/v2/shipments.py`,
        "        select(Shipment)\n        .where(Shipment.org_id == org.id)",
        "        select(Shipment)\n        .options(\n            joinedload(Shipment.carrier).joinedload(Carrier.sla_policy),\n            selectinload(Shipment.stops).selectinload(Stop.facility),\n        )\n        .where(Shipment.org_id == org.id)",
        { summary: "Eager-load carrier, SLA policy and stops" },
      );
      b.run(
        "HARBOR_SQL_ECHO=1 uv run pytest tests/api/test_shipments.py::test_list_shipments_paginated -q -s 2>&1 | grep -c 'SELECT'",
        "4",
        { cwd: p, summary: "Re-count SQL queries" },
      );
      b.create(
        `${p}/tests/api/test_shipments_query_budget.py`,
        'import pytest\n\nfrom tests.utils.sql import count_queries\n\n\n@pytest.mark.asyncio\nasync def test_list_shipments_query_budget(client, shipment_factory, org):\n    shipment_factory.create_batch(100, org=org, with_stops=3)\n    with count_queries() as counter:\n        resp = await client.get("/v2/shipments", params={"page_size": 100})\n    assert resp.status_code == 200\n    assert counter.count <= 5, counter.statements\n',
        { summary: "Add a query-budget regression test" },
      );
      b.run(
        "uv run pytest tests/api -q",
        "........................................................................ [ 40%]\n........................................................................ [ 81%]\n.................................                                        [100%]\n177 passed in 12.84s",
        { cwd: p, summary: "Run API test suite" },
      );
      b.agent(
        "Confirmed and fixed. The endpoint was issuing **203 queries** for a 100-row page — one for the page plus a lazy load of `carrier` and `stops` per shipment during serialization (the new `sla_policy` relationship made it worse because it hung off `carrier`).\n\n**Changes**\n- `harbor/api/v2/shipments.py`: added `joinedload(Shipment.carrier).joinedload(Carrier.sla_policy)` and `selectinload(Shipment.stops).selectinload(Stop.facility)`.\n- `tests/api/test_shipments_query_budget.py`: new regression test that fails if the list endpoint goes above 5 queries.\n\n**Result**: 203 → 4 queries per request. The response schema is untouched (all 177 API tests pass). Locally the 100-row page went from ~1.9s to ~140ms; staging numbers should follow once deployed.",
      );
      b.user("Nice. Open a PR against main and mention it closes TIDE-1432.", 300);
      b.run(
        'git checkout -b jl/shipments-n-plus-one && git commit -am "Eager-load carrier and stops on shipment list (TIDE-1432)" && gh pr create --fill --base main',
        "Switched to a new branch 'jl/shipments-n-plus-one'\n[jl/shipments-n-plus-one 3e9b0c1] Eager-load carrier and stops on shipment list (TIDE-1432)\n 2 files changed, 19 insertions(+)\n create mode 100644 tests/api/test_shipments_query_budget.py\n\nCreating pull request for jl/shipments-n-plus-one into main in tidewater/harbor-api\n\nhttps://github.com/tidewater/harbor-api/pull/847",
        { cwd: p, summary: "Commit and open pull request" },
      );
      b.agent("PR is up: https://github.com/tidewater/harbor-api/pull/847 — the description references TIDE-1432 so Linear will close it on merge.");
      return b.events;
    },
  },
  {
    id: "4be0d17c9a3e4f21b8d6e2a7c1f09b33",
    title: "Add depot opening-hours constraint to VRP solver",
    ws: "route-optimizer",
    branch: "feat/depot-hours",
    ago: 12,
    duration: 22,
    model: "opus",
    status: "running",
    script(b, ws) {
      const p = ws.path;
      b.user(
        "Depots now have opening hours (depot.Hours, see internal/model/depot.go). The solver currently lets routes start at 04:00 even when the depot opens at 06:30. Add a hard time-window constraint for route start/end at the depot and make sure the existing benchmark doesn't regress more than 10%.",
      );
      b.agent("I'll look at how time windows are modelled for stops today, then reuse the same machinery for the depot.");
      b.run("rg -n 'TimeWindow' internal/ | head -20",
        "internal/model/stop.go:18:\tWindow   TimeWindow\ninternal/model/types.go:7:type TimeWindow struct {\ninternal/solver/constraints.go:44:func timeWindowPenalty(r *Route, s model.Stop, arrival time.Duration) float64 {\ninternal/solver/constraints.go:61:\tif !s.Window.Contains(arrival) {\ninternal/solver/insertion.go:132:\t\tif !feasibleWindow(route, stop, at) {",
        { cwd: p, summary: "Find time-window handling" });
      b.view(`${p}/internal/model/depot.go`,
        "     1\tpackage model\n     2\t\n     3\ttype Depot struct {\n     4\t\tID       string\n     5\t\tLocation LatLng\n     6\t\tHours    TimeWindow // local time; zero value = 24h\n     7\t\tTZ       string\n     8\t}",
        { summary: "Read depot model" });
      b.edit(`${p}/internal/solver/constraints.go`,
        "func timeWindowPenalty(r *Route, s model.Stop, arrival time.Duration) float64 {",
        "// depotWindowFeasible reports whether a route departs and returns within the\n// depot's opening hours. A zero-value window means the depot is always open.\nfunc depotWindowFeasible(r *Route, d model.Depot) bool {\n\tif d.Hours.IsZero() {\n\t\treturn true\n\t}\n\treturn d.Hours.Contains(r.Departure) && d.Hours.Contains(r.ReturnAt())\n}\n\nfunc timeWindowPenalty(r *Route, s model.Stop, arrival time.Duration) float64 {",
        { summary: "Add depot window feasibility check" });
      b.run("go test ./internal/solver/... -run Depot -v 2>&1 | tail -8",
        "=== RUN   TestDepotWindowFeasible\n=== RUN   TestDepotWindowFeasible/always_open\n=== RUN   TestDepotWindowFeasible/departs_before_open\n=== RUN   TestDepotWindowFeasible/returns_after_close\n--- PASS: TestDepotWindowFeasible (0.00s)\nPASS\nok  \tgithub.com/tidewater/route-optimizer/internal/solver\t0.312s",
        { cwd: p, summary: "Run depot constraint tests" });
      b.run("go test ./internal/solver -bench BenchmarkSolve200 -benchmem -count 3 -run ^$", "goos: darwin\ngoarch: arm64\npkg: github.com/tidewater/route-optimizer/internal/solver\nBenchmarkSolve200-10    \t      12\t  94812733 ns/op\t 18421904 B/op\t  201388 allocs/op",
        { cwd: p, summary: "Benchmark solver (200 stops)", thought: "Baseline from main was ~88ms/op. Running the comparison now." });
      return b.events;
    },
  },
  {
    id: "e2f4c8a1b7d94c0e9a3b5d6f7e8c9a10",
    title: "Migrate harbor-web dashboard tables to TanStack Table v8",
    ws: "harbor-web",
    branch: "jl/tanstack-table",
    ago: 60 * 26,
    duration: 74,
    model: "sonnet",
    status: "finished",
    tags: { project: "frontend" },
    script(b, ws) {
      const p = ws.path;
      b.user("We still use react-table v7 on the Shipments, Invoices and Carriers dashboards. Migrate them to @tanstack/react-table v8. Keep column sorting persisted in the URL like today (?sort=eta:desc).");
      b.run("rg -l \"from 'react-table'\" src", "src/features/shipments/ShipmentsTable.tsx\nsrc/features/invoices/InvoicesTable.tsx\nsrc/features/carriers/CarriersTable.tsx\nsrc/components/data-table/useUrlSort.ts", { cwd: p, summary: "Find react-table v7 usages" });
      b.run("pnpm add @tanstack/react-table@8.20.5 && pnpm remove react-table @types/react-table", "Packages: +1 -2\nProgress: resolved 1184, reused 1121, downloaded 1, added 1, done\n\ndependencies:\n+ @tanstack/react-table 8.20.5\n- react-table 7.8.0\n\ndevDependencies:\n- @types/react-table 7.7.20\n\nDone in 3.4s", { cwd: p, summary: "Swap dependencies" });
      b.edit(`${p}/src/components/data-table/useUrlSort.ts`,
        "export function useUrlSort(): [SortingRule<object>[], (rules: SortingRule<object>[]) => void] {",
        "export function useUrlSort(): [SortingState, OnChangeFn<SortingState>] {",
        { summary: "Port URL sort hook to SortingState" });
      b.run("pnpm tsc --noEmit", "src/features/invoices/InvoicesTable.tsx:88:23 - error TS2339: Property 'getToggleRowSelectedProps' does not exist on type 'Row<Invoice>'.\n\n88       {...row.getToggleRowSelectedProps()}\n                         ~~~~~~~~~~~~~~~~~~~~~~~~~\n\nFound 1 error in src/features/invoices/InvoicesTable.tsx:88", { exit: 2, cwd: p, summary: "Type-check" });
      b.edit(`${p}/src/features/invoices/InvoicesTable.tsx`,
        "      {...row.getToggleRowSelectedProps()}",
        "      checked={row.getIsSelected()}\n      onChange={row.getToggleSelectedHandler()}",
        { summary: "Port row selection API" });
      b.run("pnpm tsc --noEmit && pnpm vitest run src/features --reporter=dot", "\n ✓ 14 test files\n\n Test Files  14 passed (14)\n      Tests  96 passed (96)\n   Duration  6.21s", { cwd: p, summary: "Type-check and run feature tests" });
      b.agent("All three dashboards are on TanStack Table v8.\n\n| Table | Notes |\n| --- | --- |\n| Shipments | Column defs moved to `createColumnHelper`; virtualized rows unchanged |\n| Invoices | Row selection ported to `getIsSelected` / `getToggleSelectedHandler` |\n| Carriers | Straight port, no behaviour change |\n\n`useUrlSort` now returns `[SortingState, OnChangeFn<SortingState>]` and still serializes as `?sort=eta:desc`, so existing bookmarked links keep working. Bundle size dropped by ~9 kB gzipped since v8 is tree-shakeable. Type-check and all 96 feature tests pass.");
      b.user("Invoices table lost the sticky header on Safari, can you check?", 1800);
      b.edit(`${p}/src/features/invoices/InvoicesTable.module.css`, ".table thead {\n  position: sticky;", ".table thead th {\n  position: sticky;\n  top: 0;\n  z-index: 1;", { summary: "Move sticky positioning to th" });
      b.agent("Safari doesn't support `position: sticky` on `<thead>` — only on cells. v7 rendered a wrapper div that happened to work. I moved the sticky rule onto `thead th` with `top: 0; z-index: 1`. Verified in Safari 18 and Chrome.");
      return b.events;
    },
  },
  {
    id: "91d3a6b2c4e54f7a8b9c0d1e2f3a4b5c",
    title: "Rotate RDS credentials and move them to Secrets Manager",
    ws: "infra",
    branch: "ops/rds-secrets",
    ago: 3,
    duration: 9,
    model: "sonnet",
    status: "waiting_for_confirmation",
    tags: { project: "security" },
    script(b, ws) {
      const p = ws.path;
      b.user("The harbor-staging RDS master password is still a plain Terraform variable. Move it to AWS Secrets Manager with rotation every 30 days, and wire the ECS task definitions to read it from there. Don't apply anything without asking me.");
      b.run("rg -n 'db_password' modules/ envs/staging | head", "envs/staging/main.tf:31:  db_password = var.db_password\nmodules/rds/variables.tf:12:variable \"db_password\" {\nmodules/rds/main.tf:22:  password = var.db_password\nmodules/ecs-service/main.tf:58:        { name = \"DATABASE_PASSWORD\", value = var.db_password },", { cwd: p, summary: "Find password references" });
      b.edit(`${p}/modules/rds/main.tf`, "  password = var.db_password", "  manage_master_user_password   = true\n  master_user_secret_kms_key_id = var.kms_key_arn", { summary: "Use RDS-managed master secret" });
      b.edit(`${p}/modules/ecs-service/main.tf`, '        { name = "DATABASE_PASSWORD", value = var.db_password },', "      ]\n      secrets = [\n        { name = \"DATABASE_PASSWORD\", valueFrom = \"${var.db_secret_arn}:password::\" },", { summary: "Read password from secret in task def" });
      b.run("terraform -chdir=envs/staging plan -no-color | tail -n 4", "\nPlan: 1 to add, 3 to change, 0 to destroy.\n\nChanges to Outputs:\n  + db_secret_arn = (known after apply)", { cwd: p, summary: "Plan staging changes" });
      b.agent("The plan looks right: RDS will manage its master password in Secrets Manager (rotation defaults to 7 days, I set `rotation_schedule` to 30), and the harbor-api / harbor-worker task definitions now pull `DATABASE_PASSWORD` via `secrets.valueFrom`.\n\nApplying will rotate the password immediately, so running tasks keep working only until their next DB reconnect — ECS will roll the services right after. Shall I apply to **staging**?");
      b.pending("terraform -chdir=envs/staging apply -auto-approve", { summary: "Apply staging plan", thought: "User asked to confirm before applying." });
      return b.events;
    },
  },
  {
    id: "5a6b7c8d9e0f41a2b3c4d5e6f7a8b9c0",
    title: "Investigate flaky test_quote_expiry on CI",
    ws: "harbor-api",
    ago: 60 * 24 * 9 + 200,
    duration: 31,
    model: "haiku",
    status: "finished",
    script(b, ws) {
      const p = ws.path;
      b.user("tests/quotes/test_expiry.py::test_quote_expiry fails maybe 1 in 15 CI runs with `assert quote.status == 'expired'`. Can't reproduce locally. Figure out why.");
      b.run("for i in $(seq 1 40); do uv run pytest tests/quotes/test_expiry.py::test_quote_expiry -q -p no:randomly 2>&1 | tail -1; done | sort | uniq -c", "     40 1 passed in 0.41s", { cwd: p, summary: "Loop the test 40 times" });
      b.run("TZ=Pacific/Auckland uv run pytest tests/quotes/test_expiry.py::test_quote_expiry -q 2>&1 | tail -3", "E       AssertionError: assert 'active' == 'expired'\nFAILED tests/quotes/test_expiry.py::test_quote_expiry - AssertionError: assert 'active' == 'expired'\n1 failed in 0.44s", { exit: 1, cwd: p, summary: "Retry with a far-east timezone", thought: "Passing 40/40 locally suggests an environment dependency; CI runners don't pin TZ. Trying a timezone ahead of UTC." });
      b.view(`${p}/harbor/quotes/expiry.py`, "    12\tdef is_expired(quote: Quote, now: datetime | None = None) -> bool:\n    13\t    now = now or datetime.now()\n    14\t    return quote.valid_until < now.date()", { summary: "Read is_expired" });
      b.edit(`${p}/harbor/quotes/expiry.py`, "    now = now or datetime.now()\n    return quote.valid_until < now.date()", "    now = now or datetime.now(tz=UTC)\n    return quote.valid_until < now.astimezone(UTC).date()", { summary: "Compare dates in UTC" });
      b.run("TZ=Pacific/Auckland uv run pytest tests/quotes -q 2>&1 | tail -1", "23 passed in 0.92s", { cwd: p, summary: "Verify the fix" });
      b.agent("Root cause: `is_expired` used naive `datetime.now()`, i.e. the **runner's local timezone**, while `valid_until` is stored as a UTC date. On CI runners whose TZ was ahead of UTC (GitHub's macOS pool occasionally reports a non-UTC zone), the local date had already rolled over and the comparison flipped.\n\nFixed by comparing in UTC. I can reproduce deterministically with `TZ=Pacific/Auckland` and it now passes. I'd also suggest adding `TZ: UTC` to the CI env as a belt-and-braces measure.");
      return b.events;
    },
  },
];
