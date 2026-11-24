# Pathspan

Request tracing and performance analysis front end for the unemployment claims system.
Built for the in-house SRE team to investigate the Monday 16 November cert-submit timeouts.

## Run

```
npm install
npm run dev        # development server
npm run build      # static production build in ./out (entry: ./out/index.html)
npm run typecheck
npm run check-data # prints the headline numbers the dataset is calibrated to
```

`./out` uses relative asset paths, so it works from the root of any plain static file server, with no rewrites.

## What is in the app

- **Overview**: headline numbers for the selected range, a 72-hour context chart (drag to select a range), and a minute-level focus chart.
- **Connectors**: implied concurrent sessions per mf-conn instance against the pool limit, and a scatter of pool utilisation against failure share.
- **Changes & checks**: change log, before/after checks, and a rough counterfactual for the identity-verify deploy.
- **Failed requests**: filterable request explorer with a span waterfall per request.
- **Volume vs last year**: Monday hourly claim filings against Mon 17 Nov 2025.
- **Briefing draft**: findings generated from the loaded data, plus a notes box saved in the browser.

## Data

There is no backend. All data is generated in the browser from a fixed seed (`src/data/`).

- Per-minute aggregates cover every request (about 1.2 M).
- Full records exist for every failed request (14,600) and for a 1-in-400 sample of successful requests.
- The dataset is synthetic. It reproduces the headline numbers in the incident brief (see `npm run check-data`).
  The causal story it embeds is the one the app is meant to test, not a finding.
- To use real traces, replace `src/data/generate.ts` with a loader that returns the same `Dataset` shape.
