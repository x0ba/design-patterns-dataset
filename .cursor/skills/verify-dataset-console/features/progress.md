# Progress dashboard

The progress page lists sites, state counts, and the batch IRR table.

## Sub-features

- `progress-open` shows batch `dry-run` and four labeled sites.
- `progress-filter` narrows the table with the search box.
- `progress-live` shows the live indicator connected.

## How to get to it (user POV)

- Open `http://127.0.0.1:4317/`.
- Choose the `Progress` link in the header.
- Choose a batch in the `#batch` select when more than one batch directory exists. With only `dry-run` present, the select is absent.

## Driving it with Playwright

Preconditions:

- Doctor passed and `usageSites` is at least 1.
- Batch `dry-run` exists.

- **Open progress.** Go to `http://127.0.0.1:4317/`. Wait until `#live` has `data-state="on"` and the heading `dry-run` is visible. `#cb-version` text is `codebook 1.0.0`.
- **Read counts.** The page text includes `4` labeled sites and `Krippendorff's α over 4 site(s)`.
- **Filter.** Fill `#q` with `linear`. The table body `#sites` has one row whose text includes `linear.app` and `Labeled`.
- **Proof.** Save a screenshot and the body text under `/tmp/verify-dataset-console/<run-id>/`.

## Gotchas

- The latest batch is the last directory name in sorted order, not the newest `batch.json`. With only `dry-run` present, that is the page you get.
- The filter matches slug, title, and domain. `linear` matches the Linear title and the slug `linear-app`.
