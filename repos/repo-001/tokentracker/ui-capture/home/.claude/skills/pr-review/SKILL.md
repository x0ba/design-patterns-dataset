---
name: pr-review
description: Review the current branch diff like a senior reviewer: correctness, tests, migrations, and API compatibility. Use before opening a PR.
---

# pr-review

1. `git diff main...HEAD`
2. Check for missing tests, unsafe migrations, and breaking API changes.
3. Output findings grouped by severity.
