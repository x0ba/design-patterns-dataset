# Site viewer

The site page shows the full-page screenshot, rater buttons, pattern boxes, and the agreement table.

## Sub-features

- `site-open` opens a site from its table row.
- `site-rater` switches the side panel to one rater.
- `site-boxes` draws region and pattern boxes on the screenshot.

## How to get to it (user POV)

- On the progress page, choose a row in the sites table.
- Open `#/site/dry-run/linear-app` directly.

## Driving it with Playwright

Preconditions:

- The progress filter shows the Linear row.
- `dataset/dry-run/sites/linear-app/capture/screenshot.png` exists.

- **Open the row.** Click the first `#sites tr`. The URL becomes `http://127.0.0.1:4317/#/site/dry-run/linear-app`. The heading is the captured page title. A proved run's heading text included `Linear` and the line `https://linear.app/ · 1440×9960px`. The pixel height comes from that capture. Read `meta.json` if a new capture differs.
- **Select a rater.** The buttons in `#srcs` are `consensus`, `dry-1`, `dry-2`, and `dry-3`. Click the button named `dry-2`. Wait until `#srcs button.on` has `data-src="dry-2"`. The side text includes `Structure & aesthetics (dry-2)`.
- **See the screenshot.** `#shot img` is visible. Its `src` starts with `/files/dataset/dry-run/sites/linear-app/capture/screenshot.png`.
- **Proof.** Save a screenshot under `/tmp/verify-dataset-console/<run-id>/`. A proved run's body text listed disagreements for `aesthetics.whitespace`, `aesthetics.iconStyle`, `aesthetics.borders`, and `aesthetics.backgroundTreatment`, and the agreement score `0.70`.

## Gotchas

- `consensus` is a button even though it is not a rater file. The label files are `dry-1.json`, `dry-2.json`, and `dry-3.json`.
- Boxes use screenshot pixels. A recapture changes the image URL with a `?v=` mtime query. Compare the file on disk if the image looks stale.
- Pattern-status alpha on a single site can render blank when the alpha is undefined. The batch table is the place that prints `n/a`.
