# Studiotrace front end

A design workspace for a community college Brand Systems course. Students hand parts of a project to an AI model under course rules, and the app records what the model made and what the student changed.

This build is the front end only. It has no backend and no live model calls. All data is mock data for the *Crumb & Kettle Identity* project, snapshotted at Tue Nov 17, 2026, 4:40 p.m. Pacific.

## Build and run

```sh
npm run build   # writes a static site to ./out (index.html is the entry point)
npm test        # logic tests for checks, corrections, and the contribution record
```

No dependencies. The build copies `src/` into `out/` and checks that every asset reference is a relative file that exists. Serve `out/` from any static file server at its root. No rewrites are needed.

## What it does

- **Mockups**: 15 outputs (5 applications × 3 spacing variations), 11 delivered. Each output has rule checks (palette use, ampersand provenance), a provenance tab (prompt, model, time, sources), and an edit tab. Decisions are Keep, Discard, or Send back with a prefilled correction.
- **Assets**: the wordmark, the five-color palette, and the type pairing, with usage counts.
- **Brief and policy**: the client brief summary, application specs, and the course AI policy.
- **Delegation**: the task and its rules (each checked automatically where possible), the runs, and the revision requests.
- **Contribution record**: each kept output's elements as student-made, AI-made, or AI-made and student-edited, with a submission checklist, a Markdown export, and an AI disclosure text. Also an activity trail.

Decisions, edits, revision requests, and the trail persist in `localStorage`. "Reset demo data" in the sidebar returns to the snapshot.

## Layout

```
src/data.js     seed data: project, outputs, runs, trail, brief, policy
src/core.js     pure logic: checks, corrections, provenance, record, Markdown export
src/app.js      rendering, state, and event handling
src/styles.css  UI styles and artboard styles
src/index.html  shell
scripts/build.mjs   static build into out/
tests/core.test.js  logic tests
```

## Notes on the mock data

- Hex values for the palette are the student's. Palette names (Roast, Cream, Saffron, Sage, White) and all mockup copy are working labels.
- The wordmark and the hand-drawn ampersand are approximations rendered in a script font and an SVG stroke. The real `wordmark-v3.svg` is not in this repository.
- The Brief view shows a summary of the 2-page PDF. The PDF itself is not included.
- "Send back" logs a revision request. It does not run the model.
