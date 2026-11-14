# Earshot Analytics (front end)

Internal listening-retention tool for the ad-slot review: did completion and per-minute retention change after the narrative mid-roll moved from about minute 18 to about minute 25 on 4 Aug 2026?

Everything runs in the browser. There is no backend.

## Commands

```sh
npm install
npm run dev      # local development server
npm run build    # type-check, then static production build into ./out
```

`./out/index.html` is the entry point. It uses relative asset paths and no rewrites, so any static file server works:

```sh
python3 -m http.server 8000 --directory out
```

It also opens directly from disk (file://).

## Data

All figures come from a seeded synthetic dataset, so the same build always shows the same numbers:

- `src/data/shows.ts`: the 14 shows, with their parameters.
- `src/data/generate.ts`: builds 1,186 episodes with per-minute retention curves, platform shares, mid-roll positions, and the nine production notes.

The header shows a **Synthetic demo data** badge. Remove it, and replace `generateDataset()` in `src/App.tsx` with a loader for real exports, before the numbers are used for decisions.

Each episode needs: `showId`, `date`, `lengthMin`, `downloads`, `starts`, `completion`, `listenThrough`, `midroll`, `adBreaks`, `shares` (Apple / Spotify / Network app / Other), `majorityPlatform`, `note`, and `retention` (share still listening at each minute, index = minute).

## How the numbers are computed

See the **Method & data** tab in the app. In short:

- **Completion**: share of starters still listening in the final minute, starts-weighted.
- **Adjusted change**: each narrative show's own change, averaged, minus the same for non-narrative shows over the same window. Uncertainty from a bootstrap over episodes.
- **Outlier show**: at least 3 pts below the median narrative show and 2 standard errors below it.
- **Production-note episodes** are excluded by default. The sidebar toggle switches this.

## Layout

- `src/analysis/`: estimators, filters, and derived groups (pure functions).
- `src/components/`: sidebar, hand-built SVG charts, drawer.
- `src/views/`: Overview, Shows, Segments, Episodes, Method & data.
