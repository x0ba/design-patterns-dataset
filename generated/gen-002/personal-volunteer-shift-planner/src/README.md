# Givehours

A personal planner for volunteers who serve several nonprofits at once. It gathers the shifts each organization posts, sets them beside your own commitments, and shows what you can take on each month.

This build is the December 2026 front end for Theo Lindqvist, opened as it stands on Tue, Nov 17, 2026, just after December sign-ups opened.

## Run and build

No dependencies, no server code.

```sh
npm run build      # writes ./out (entry point: out/index.html)
npm run preview    # optional: serves out/ at http://localhost:8080
```

`out/` is a plain static site with relative paths. It works from the root of any static file server without rewrites.

## Source layout

- `src/data.js`: mock data (46 Cascade Harvest shifts, 31 Whisker Haven shifts, 10 tutoring sessions, commitments, history)
- `src/app.js`: state, clash rules, and rendering (vanilla JS, no framework)
- `src/styles.css`, `src/index.html`: layout and markup
- `scripts/build.mjs`: copies `src/` to `out/`, checks syntax, and checks that referenced files exist

State is saved in `localStorage`. "Reset to the Nov 17 snapshot" in the sidebar clears it.

## Assumptions to confirm

These are not in the source notes. They are set in `src/data.js` and labeled in the UI.

- **Tutoring sessions** run 1 hour, Tue and Thu, 7–8 pm. That fits the 8 h/month commitment at two sessions a week. All 10 December sessions count toward the 20 h ceiling.
- **Climbing night** is treated as Wednesdays 5–10 pm. The start time was not in the notes.
- **Work trip and family weekends** block the whole day.
- **Travel buffer** is 30 minutes between commitments at different places.
- **Monthly ceiling** is 20 h and includes tutoring.
- **Whisker Haven's 31 shifts** include Theo's two bookings (Dec 3 and Dec 17). The other 29 are open.
- **Roles** for the two booked shelter shifts (feeding on Dec 3, socializing on Dec 17) are placeholders.
- **Spots left** are mock values, consistent with the examples in the brief.
