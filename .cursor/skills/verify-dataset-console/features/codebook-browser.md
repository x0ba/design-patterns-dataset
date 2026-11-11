# Codebook browser

The codebook page lists the 119 built entries and opens one entry.

## Sub-features

- `codebook-list` shows version `1.0.0` and 119 entries.
- `codebook-search` filters the list.
- `codebook-entry` opens `card` and its preview.

## How to get to it (user POV)

- Choose the `Codebook` link.
- Open `#/codebook/card`.

## Driving it with Playwright

Preconditions:

- Doctor reported 119 entries.
- Do not require usage counts. They are 0 when no consensus files exist.

- **Open the list.** Click the link named `Codebook`. The URL contains `#/codebook`. The heading matches `Codebook 1.0.0`. The page text includes `119 entries`.
- **Search.** Fill `#cq` with `card`. Click the element `[data-id="card"]`. The URL becomes `#/codebook/card`. The level-1 heading text includes `Card`.
- **See the diagram.** `.preview img` has `src` `/files/dist/previews/card.svg`. A request for that URL returns 200.
- **Read usage.** After this smoke, the `card` detail includes `Present on 1 labeled site(s), uncertain on 1.` An entry consensus did not mark, such as `wizard`, includes `Not yet observed in the dataset.` That same sentence is what an entry shows when no consensus file exists.
- **Proof.** Save a screenshot under `/tmp/verify-dataset-console/<run-id>/`.

## Gotchas

- The detail sentence comes from `consensus.json`. With no consensus file it is `Not yet observed in the dataset.` After this smoke, `card` is `Present on 1 labeled site(s), uncertain on 1.` The list column can still show `0` for an entry that consensus never marked.
- The list is the built bundle, not the YAML files on disk. A hand edit under `codebook/patterns/` is invisible until `node scripts/build-codebook.ts`.
- Open `#/codebook`. `GET /codebook` is not a route and returns 404.
