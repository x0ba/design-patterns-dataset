# Cabinroll (front end)

Lodging and visitor-logistics front end for Río Sierpe Biological Station. Mock data only; no backend.

## Run

```
npm install
npm run dev        # development server
npm run build      # typecheck, then production build into ./out
```

`./out/index.html` is the entry point. It uses relative asset paths and hash routing, so it works from the root of any plain static file server.

## What is in the demo

- Opens on Tue 17 Nov 2026, 09:15 station time, with the BIO 377 block hold unresolved (release at 17:00 today).
- `src/data/seed.ts` holds the mock cabins, bunks, and people. `src/logic.ts` holds the placement rules, cover counts, and boat logic.
- Changes are saved in the browser's localStorage. Use "Reset demo data" in the sidebar to return to the starting state.
