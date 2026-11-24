# The Millrace Gazette Online: front end

A static site (Vite + React) for the Gazette archive. There is no server. All routing is
hash-based (`index.html#/...`), so the built folder works on any plain static file server
with no rewrites.

## Build

```
npm install
npm run build      # regenerates public/data and public/img, then writes ./out
```

Serve `./out` from the root of any static server and open `index.html`.

## Where things live

- `scripts/build-data.mjs` builds the archive JSON the site loads at runtime:
  `public/data/site.json` (issues, places, contributors, events), `public/data/articles.json`
  (search index), and `public/data/issues/YYYY-MM.json` (full text per issue). It is seeded,
  so the same input always gives the same archive.
- `scripts/content/featured-2026.mjs` holds the hand-written November 2026 issue, including the
  Holiday Events roundup. `scripts/content/featured-1994.mjs` holds the 1994 flood stories.
  Everything else in the archive is generated from `scripts/content/pools.mjs`.
- `scripts/content/art.mjs` draws the SVG illustrations that stand in for the featured photos.
  The build rewrites `public/img/photos/` on every run, so real scans need the build changed to
  copy them in (and the `src` paths in the featured files updated) rather than dropped into that folder.
- `src/lib/search.js` is the search. It matches exact words first, then close spellings, so
  "Tannerv" from a scanned page finds "Tannery". Full text is searched for the hand-written
  stories; generated back issues are searched by headline, deck, byline, and tags.
- `src/components/Chrome.jsx` has the colored "where am I" bar (green = current issue,
  brown = archive) and the "Back to ..." trail link.

## Adding an issue

The build does not read from a content system yet. The current issue is the one exported as
`issue` in `scripts/content/featured-2026.mjs`, and the build treats it as current. Moving to a
new month means writing that issue's stories into a featured file and updating that export.
