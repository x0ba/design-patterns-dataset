# Seed a dry-run batch

`pnpm smoke` captures four sites, writes three synthetic labels each, scores agreement, and writes `dataset/dry-run/irr.json`.

## Sub-features

- `smoke-label` captures and labels `gov-uk`, `news-ycombinator-com`, `linear-app`, and `lichess-org`.
- `smoke-irr` writes the batch alpha table.
- `smoke-proposal` leaves an open `dry-run/card` proposal.

## How to get to it (user POV)

- Run `pnpm smoke` from the repo root.
- Or run `node scripts/label.ts --batch dry-run --sites sites/dry-run.yaml --raters config/raters.dry-run.yaml` and then `node scripts/irr.ts --batch dry-run`.

## Driving it with the repo CLIs

Preconditions:

- Node 24 and pnpm 12.9.0 are on `PATH`.
- `node scripts/build-codebook.ts` has already printed 119 entries.
- Chromium is installed for this Playwright version.
- The four smoke hosts are reachable.

- **Label.** Run `pnpm smoke`. Exit code 0. Stdout contains `New batch dry-run` on a fresh batch, then four lines ending in `-> labeled`, then an IRR table. A resumed batch does not print `New batch`.
- **Confirm files.** Read `dataset/dry-run/sites/linear-app/status.json`. `state` is `labeled` and `flags` is empty. `dataset/dry-run/sites/linear-app/capture/screenshot.png` has a non-zero size.
- **Confirm the proposal.** Run `node scripts/proposals.ts list dry-run --all`. Stdout contains `open` and `dry-run/card` and `new-values`.

## Gotchas

- A second smoke on the same batch skips captures and labels. Delete `dataset/dry-run` first if you need a clean capture. That delete removes the proposal evidence screenshots too. `proposals/dry-run/card.yaml` can remain.
- HTTP status 400 or higher sets the site to `failed` and skips labeling. The batch can still exit 0.
- `dry-run` labels are synthetic. Do not point `--raters config/raters.dry-run.yaml` at a batch that was created with `config/raters.yaml`.
