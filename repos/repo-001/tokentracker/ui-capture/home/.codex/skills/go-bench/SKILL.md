---
name: go-bench
description: Run Go benchmarks before and after a change and summarize with benchstat.
---

# go-bench

`go test -bench=. -benchmem -count=10 > new.txt` then `benchstat old.txt new.txt`.
