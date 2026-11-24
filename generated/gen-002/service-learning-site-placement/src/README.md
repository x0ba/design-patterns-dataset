# Commonplace Placements

Front end for matching service-learning students to community partner sites by
location and transit access. Client-side only, with mock data.

## Commands

```sh
npm install
npm run dev      # local development server
npm run build    # static production build into ./out (entry: ./out/index.html)
```

`./out` uses relative asset paths, so it can be served from the root of any
plain static file server with no rewrites.

## What is in the app

- **Assign**: unplaced students, most constrained first. The selected student's
  recommended sites (open seat, shared time slot, reachable, within the commute
  limit) are ranked by estimated transit time. Sites that break a rule are listed
  separately with the reason; "Assign anyway" asks for a second click.
- **Sites**: all 34 partner sites with seats, open seats, time slots, nearest stop,
  and a detail drawer listing who is placed there.
- **Map**: schematic network (campus, Blue Line and its four 2026 extension
  stations, bus routes, sites). Colour sites by open seats or by estimated transit
  minutes from a chosen home neighborhood.
- **Roster**: all 145 students with status, filters, and unplace / find-a-site actions.
- **Export CSV**: the full roster as it stands now, including a within-limit flag.

Changes are saved in the browser's localStorage under one key. "Reset changes"
restores the baseline roster.

## Mock data

Everything under `src/data/` is invented for the demo: site names and addresses,
student names, course titles, the transit network, and the baseline roster.

- `sites.js`: 34 sites. `filled` counts the baseline placements; totals are
  118 placed of 154 seats, leaving 36 open.
- `unplaced.js`: the 27 unplaced students, 9 of whom can attend weekday evenings only.
- `placed.js`: 118 baseline placements. Generated once with a seeded script so
  every site's filled count matches `sites.js`.
- `network.js`: neighborhoods, lines and stations in a schematic km grid, plus the
  course-to-partner-type map used for the "Fits course" hint. **That map is a
  placeholder.** Replace it with the real syllabus guidance before use.

## How commute times are estimated

`src/lib/placement.js` → `estimateMinutes`. Home neighborhood to site door is
estimated from straight-line distance, a detour factor, a per-km speed (rail or
bus), stop access time, and a 12-minute penalty when no line is shared. Drivers get
a drive estimate and are exempt from the transit limit. This is an estimate, not a
routing result. The UI labels it as one.

Campus minutes come from the office's transit export, as given in the brief.
