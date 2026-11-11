# Proposal list

The proposals page lists open codebook suggestions. Verification stops before Accept and Reject.

## Sub-features

- `proposals-open` lists open proposals.
- `proposals-all` shows the same open set when nothing has been reviewed.
- `proposals-readonly` leaves `codebook/VERSION` at `1.0.0`.

## How to get to it (user POV)

- Choose the `Proposals` link.
- The filter buttons are `open`, `accepted`, `rejected`, and `all`. `open` is selected on arrival.

## Driving it with Playwright

Preconditions:

- `node scripts/proposals.ts list --all` prints the `dry-run/card` line and the three `batch-001` lines.
- You will not click `Accept` or `Reject`.

- **Open the list.** Click the link named `Proposals`. Wait for the heading `Proposals`. Wait until the text includes `dry-run/card` or the id `card` with `new-values`. The heading is in the first paint, and the cards arrive after `GET /api/proposals`, so wait for the card text.
- **Show every status.** Click the button named `all`. The text includes `logo-wall`, `social-proof-strip`, `banner`, and `card`.
- **Leave them open.** Count `button[data-act="accept"]`. A clean checkout after smoke has 4, one per open proposal: `banner`, `logo-wall`, `social-proof-strip`, and `card`. That matches `node scripts/proposals.ts list`. Do not click Accept or Reject. Read `codebook/VERSION` and confirm it is still `1.0.0`.
- **Proof.** Save a screenshot under `/tmp/verify-dataset-console/<run-id>/`.

## Gotchas

- `dry-run/card` is one file. Four filings from `dry-1` stay on that one card, so they add one Accept button.
- The filter button `accepted` is not an Accept action. A name match for `Accept` that is not exact also selects that filter, and the count becomes 5. Count `button[data-act="accept"]`.
- `batch-001` crops request screenshots that are not in git. The console logs 404 for those `/files/dataset/batch-001/.../screenshot.png` URLs. That is missing local capture data, not a failed proposal list. The dry-run card crops load after smoke.
- Accept edits `codebook/`, bumps `codebook/VERSION`, and makes `verify-roundtrip.ts` fail against `codebook.html`. Reject requires a note and does not bump the version, and it still changes the proposal file.
- The default filter is a page-memory value. A previous visit in the same document can leave it on `all`.
