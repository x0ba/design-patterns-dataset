---
name: flaky-test-hunter
description: Reproduce and diagnose intermittently failing Go tests by running them under -race with -count=50 and bisecting shared state.
---

# flaky-test-hunter

Run `go test -race -count=50 -run <Test> ./pkg/...` and report the first failing seed and the shared state involved.
