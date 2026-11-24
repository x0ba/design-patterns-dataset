# Statute Loom

Front end for a rules-as-code authoring tool. Each eligibility step is an expression, and each step cites the code section it implements.

This build is a client-side demo. There is no backend. The rule model, the twelve test households, the revision history and Hye-jin's notes are mock data in `src/data/`.

## Run

```sh
npm install
npm run dev        # development server
npm test           # engine and rule-model checks (vitest)
npm run build      # type-check, then static build into ./out
```

`./out/index.html` is the entry point. Its asset paths are relative, so it works from the root of any plain static server with no rewrites.

## What the opening state shows

The app opens on the working draft that sits on revision r27. It is the state from before the 2025 amendment is wired in:

- 63 steps and 81 connections. Connections are derived from the names each expression reads.
- 9 of 12 test households pass. T-04, T-07 and T-11 fail at `gross_test`, and each includes an elderly or disabled member.
- The 2025 amendment checklist shows 0 of 3 affected steps citing `461-160-0015 (amended 2025)`.
- Two open notes from Hye-jin, on `medical_ded` and `shelter_ded`.

## Editing

- **Rule steps**: each expression is edited in the inspector. Validation covers parse errors, unknown names, type clashes, cycles and missing citations. Apply stays disabled until the edit is valid.
- **Add condition**: creates a condition in a chosen section, with citations and the income-standard tag.
- **Rewiring**: a step's connections change when its expression changes. The inspector lists what it reads and what reads it. Steps nothing reads are flagged.
- **Citations**: attach or detach from the inspector. The sidebar can attach the amended citation to every income-standard step at once.
- **Run all tests**: recomputes the twelve households against the draft. Results are marked stale after any edit.
- **Save revision**: saves a snapshot as the next revision. The draft is compared with the latest saved revision.

Edits persist in this browser's `localStorage` under `statute-loom:v1`. Use "Reset demo data in this browser" in Revisions to return to the starting state.

## Mock data and what to verify before use

- **Parameters** (`src/data/spec.ts`) are demo values, not the published FY2027 figures. The table is labelled as such in the app.
- **Amendment text** (`sr-461-160-0015-2025`) is a paraphrase written for the demo, not verbatim statute. Replace it with the official text.
- **Pinpoint citations** (for example 7 CFR 273.9(d), 273.10(e), 273.2(f)) were entered from memory. Check each pinpoint.
- **Baseline for the gross test.** Check whether 7 CFR 273.9(a) already exempts households with an elderly or disabled member from the gross test. The draft models the test as applying to all households.
- **Expected outcomes** for the twelve households are mock values, set so that T-04, T-07 and T-11 fail on the current draft.
- Team names in the mock data (Kwame Asante, Hye-jin) come from the brief. No real case data is included.

## Layout

- `src/engine/expr.ts`: expression tokenizer, parser, type checker and evaluator. No `eval`.
- `src/engine/model.ts`: validation, derived connections, topological order, evaluation and diffing.
- `src/data/`: facts, parameters, citations, the 63 starting steps, test households, revisions and notes.
- `src/store.ts`: reducer, test runs and `localStorage` persistence.
- `src/components/`: the views, inspector and dialogs.
