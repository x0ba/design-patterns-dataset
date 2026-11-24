# Herbarium Kiosk (lobby front end)

A touch-first kiosk for browsing the vascular plant herbarium's digitized Penstemon sheets.
No backend: all data ships in the build as mock records.

## Commands

```sh
npm install
npm run generate-data   # rebuilds src/data/specimens.json (seeded, deterministic)
npm run dev             # local development server
npm run build           # typecheck, then writes ./out/index.html (single self-contained file)
```

`out/index.html` is the entry point. It inlines its JavaScript and CSS, so it works from any static
root and also when opened directly from disk.

## What the kiosk does

- **Welcome** opens first. It has a search box, quick starts with live counts, and the featured exhibit.
- **Results** have a filter panel (species, county, distance from Coyote Hollow County Preserve, years,
  season, phenology, earlier determinations, images only), active-filter chips, undo, sort, a grid, and a map.
- **Compare** shows the earliest and most recent sheets from the current results, side by side.
- **Sheet** shows a zoomable sheet with a "Read label" close-up, the determination history, collection data,
  georeference, and a label transcription. Sheets on loan show a "Not imaged" panel.
- **Idle**: after 2 min 30 s without touch a "Still there?" prompt appears. At 3 min the kiosk returns to Welcome.

## Mock data

`scripts/generate-data.mjs` writes 312 Penstemon sheets across 14 species, 47 from Lane County, and 3 on loan
and not imaged. It hand-places the sheets the demo depends on:

- `OSU-V-118204`: 1938 Detling sheet, P. serrulatus annotated P. cardwellii in 1991.
- `OSU-V-103562`: 1952 Callow sheet from Coyote Hollow, first determined P. rattanii, now P. serrulatus.
- `OSU-V-101187`: 1898 Skinner's Butte sheet, the earliest Lane County record.
- `OSU-V-166930`: April 2019 Spencer Butte sheet, the latest spring record near the preserve.

The script checks its own counts and exits non-zero if they drift.
