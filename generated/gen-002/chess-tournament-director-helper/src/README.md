# Pairwise Club (front end)

Static, client-side front end for running a volunteer-run Swiss tournament. The demo event is
"November Junior Swiss", opened at the moment the director is about to pair round 3.

## Commands

```sh
npm install
npm run dev      # local development server
npm run build    # type-check, then write the static site to ./out (entry: out/index.html)
npm test         # rule tests for pairing, bye, standings and tiebreaks
npm run gen:mock # regenerate src/data/mock.ts from the pairing engine (seeded)
```

Serve `out/` from any static file server at the site root. Open it over HTTP; browsers block the
module script when `index.html` is opened directly from disk.

## Layout

- `src/lib/swiss.ts` – pairing (score groups, floats, byes, colour rules), standings, tiebreaks, readiness checks
- `src/state/reducer.ts` – every change (correction, late entry, withdrawal, posting, results) goes through here and is logged
- `src/state/derive.ts` – what the screens show: open items, checks, bye scenarios
- `src/pages/` – Before round 3, results, players, pairings, standings, rules
- `src/components/dialogs.tsx` – correct a result, late entry, withdrawal (each previews its effect before saving)
- `src/data/rules.ts` – club settings, rules note and 12-term glossary (drafted; replace with the club's own text)
- `src/data/mock.ts` – generated starting state (fictional players and results)

## Notes

- Nothing is saved between page loads. "Discard today's changes" returns to the starting state.
- Players level on points and both tiebreaks share a place.
