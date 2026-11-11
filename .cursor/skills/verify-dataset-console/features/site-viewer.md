# Site viewer

The site page shows the full-page screenshot, rater buttons, pattern boxes, and the agreement table.

## Sub-features

- `site-open` opens a site from its table row.
- `site-rater` switches the side panel to one rater.
- `site-boxes` draws region boxes and pattern boxes, and `#t-reg` and `#t-pat` hide each set.

## How to get to it (user POV)

- On the progress page, choose a row in the sites table.
- Open `#/site/dry-run/linear-app` directly.

## Driving it with Playwright

Preconditions:

- The progress filter shows the Linear row.
- `dataset/dry-run/sites/linear-app/capture/screenshot.png` exists.

- **Open the row.** Click the first `#sites tr`. The URL becomes `http://127.0.0.1:4317/#/site/dry-run/linear-app`. The heading is the captured page title. A proved run's heading text included `Linear` and the line `https://linear.app/ · 1440×9960px`. The pixel height comes from that capture. Read `meta.json` if a new capture differs.
- **Select a rater.** The buttons in `#srcs` are `consensus`, `dry-1`, `dry-2`, and `dry-3`. Click the button named `dry-2`. Wait until `#srcs button.on` has `data-src="dry-2"`. The heading in `#aest` is `Structure & aesthetics (dry-2)`. `#side` lists regions and patterns.
- **See the screenshot.** `#shot img` is visible. Its `src` starts with `/files/dataset/dry-run/sites/linear-app/capture/screenshot.png`.
- **See the boxes.** With `dry-2` selected, `#ov .bx.region` has at least one box and `#ov .bx:not(.region)` has at least one box. On the dry-run capture used here the counts were 3 and 4 (`r:header`, `r:content`, `r:footer`, `p:app-shell`, and three `p:card` boxes).
- **Toggle regions.** Uncheck `#t-reg`. `#ov .bx.region` is empty and the pattern boxes stay. Check `#t-reg`. The region boxes return.
- **Toggle patterns.** Uncheck `#t-pat`. `#ov .bx:not(.region)` is empty and the region boxes stay. Check `#t-pat`. The pattern boxes return.
- **Proof.** Save a screenshot under `/tmp/verify-dataset-console/<run-id>/`. A proved run's body text listed disagreements for `aesthetics.whitespace`, `aesthetics.iconStyle`, `aesthetics.borders`, and `aesthetics.backgroundTreatment`, and the agreement score `0.70`.

## Gotchas

- `consensus` is a button even though it is not a rater file. The label files are `dry-1.json`, `dry-2.json`, and `dry-3.json`.
- Boxes use screenshot pixels. A recapture changes the image URL with a `?v=` mtime query. Compare the file on disk if the image looks stale.
- When pattern-status alpha is null, `#agree` renders it as `—`. On Linear the heading is `Agreement score 0.70 · pattern-status α —`. The batch table prints `n/a` for a field with no variation.
