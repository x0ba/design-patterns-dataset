# Dataset console verification map

This directory is the maintained source for verifying the user-facing behavior of the design-patterns dataset console and the model-free labeling pipeline. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch from the repo root with Node 24 and pnpm 12.9.0 on `PATH`.
- `node scripts/build-codebook.ts` has printed `codebook 1.0.0: 119 entries`.
- Playwright Chromium is installed with `pnpm exec playwright install chromium`.
- For progress, site, and proposal-crop checks, `pnpm smoke` has produced batch `dry-run`.
- The console you drive is the process you started, on `http://127.0.0.1:4317`.
- Two consoles in one checkout share `dataset/`, `proposals/`, `dist/`, and `codebook/`. There is no data-directory flag. Use a second git worktree for a second instance.
- Do not post to `/api/proposals/.../accept` or `reject`.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer accessible names, then the stable handles named in each feature (`#q`, `#cq`, `data-src`, `data-f`, `data-act`, `data-id`).
- Treat every command as literal.
- Run browser actions with the repo's Playwright, from the repo root, via `node --input-type=module`.
- Run pipeline actions with `node scripts/...` or `pnpm smoke`.
- Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- Console proof includes a screenshot and the `body` inner text, under `/tmp/verify-dataset-console/<run-id>/`.
- CLI proof includes the command, stdout, stderr, and the exit code in that same directory.
- Label proof includes `dataset/<batch>/sites/<slug>/status.json` read after the command.
- Record the feature id and the entry point with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short ids with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with <harness>` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Seed a dry-run batch](./smoke-batch.md) captures four sites, writes synthetic labels, scores agreement, and leaves an open proposal.
- [Progress dashboard](./progress.md) lists sites, state counts, and the batch agreement table, and filters the table.
- [Site viewer](./site-viewer.md) opens a capture, switches raters, and shows the screenshot.
- [Codebook browser](./codebook-browser.md) lists the built entries and opens `card`.
- [Proposal list](./proposals.md) lists open suggestions and stops before Accept and Reject.
