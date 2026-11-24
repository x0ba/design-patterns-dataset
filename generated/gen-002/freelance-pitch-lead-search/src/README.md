# Leadloom front end

A client-side prototype of Leadloom's coverage check and pitch finder, opened on Priya Halvorsen's first search ("bee virus", 340 results).

## Run

```sh
npm install
npm run dev        # local dev server
npm run build      # static production build into ./out (entry: ./out/index.html)
```

`./out` uses relative asset paths (`base: './'`), so it can be served from the root of any plain static file server.

## What it does

- **Coverage**: narrowing funnel (matches → last 6 months → shown), angles covered in the last 6 months, sortable result cards with query highlighting, and an article drawer.
- **Filters**: publication window, tags (all selected must apply), angle, writer type (staff or freelance), and length. Facet counts update.
- **Outlets**: outlets ranked by a visible fit score (recent coverage, open call fit, pay, your history, and a penalty for pitches in the last 30 days), with a per-row breakdown.
- **Open calls**: 140 calls, filterable by "matches my story", deadline (closes by Friday, within 14 days), and pay type.
- **Friday plan**: up to three outlets with editable angles, drafted and sent checkboxes, recommended outlets, held-back outlets, and copy-as-text. The plan persists in `localStorage`.
- **Right rail**: saved interests with new-since-last-check counts, suggestions derived from them, and pitches currently out.

## Mock data

Everything is generated client-side and is deterministic.

- `src/data/anchors.js`: hand-written stories and calls the scenario depends on (the Milwaukee TV story, the Modern Apiarist "Tamarack virus" piece, the summer national pieces, and the named open calls).
- `src/data/outlets.js`: 38 outlets. 23 have Priya's writing history.
- `src/data/generate.js`: seeded background corpus of 1,247 articles and 140 calls. The opening query returns exactly 340 results.
- `src/data/profile.js`: seven saved searches and four pitches out.
- `src/lib/dates.js`: "today" is fixed at Tue, Nov 17, 2026, and Friday is Nov 20.

The 2.1M-article index and 4,800 publications are shown as stated in the brief. The app works on the mock sample only.
