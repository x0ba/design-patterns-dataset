# Design Patterns Dataset

### What

This project aims to collapse the UIs of a large variety of different sites on
the internet into a dataset of JSON documents that capture all the information
about the component; from layout to typography to stylistic choices. Each
component will be matched to a something from our codebook, a catalog of design
patterns and possible variations for each design pattern.

### Why

The goal is to be able to pass this dataset with a large amount of variety to a
coding agent to give it sufficient context to build more unique components that
do not look like "vibecoded" user interfaces. Each UI is indexed by design
pattern, so an agent building a given component can pull many cross-domain
examples of that pattern instead of relying on same-domain references or its
training data

### How

We will pass an AI agent a list of websites. The agent will then capture the
full accessibility tree of each website, explore it visually using Playwright,
then for each website output a `.json` file that encodes the following:

- Site metadata & capture
  - url, capturedAt, finalUrl, status, title
  - viewport + screenshot dimensions
  - userAgent
  - screenshotRef
  - domain (productivity, finance, etc.)

- Regions / Roles
  - Ordered list of regions / roles (header, templates section, stats strip,
    footer, …)
  - Each role lists the codebook pattern ids from the codebook that appear
    inside it
  - Pattern IDs should match the codebook exactly.

- Patterns (design-system primitives)
  - Pattern IDs should match the codebook exactly.
  - One entry per pattern type that appears on the page (card, tabs, carousel,
    navigate, …)
  - status: present | uncertain | absent
  - confidence (0–1)
  - evidence: text quotes and/or visual regions that support the match
  - rationale: only when confidence is low; explains what couldn’t be verified
  - dims: the concrete variations of the codebook dimensions that were observed
    (media, style, advance, shape, etc. — the axes that actually differ across
    sites)

- Structure
  - layout: short description of the overall composition (e.g. “single-column
    marketing landing page with top nav and stacked sections”)
  - regions: ordered list of the major page areas
  - density: sparse | medium | dense

- Aesthetics
  - palette: list of hex codes used in the page
  - colorRoles: mapping of roles to hex (background, text, primary, accent,
    surface, …)
  - typography: description of typefaces and where each is used
  - typeScale: description of size/weight contrast and hierarchy
  - shape: corner treatment (soft rounded / sharp / mixed)
  - elevation: flat | subtle shadows | elevated cards
  - borders: minimal / thin outlines | heavy | none
  - imagery: product screenshots, soft illustrations, photography, abstract
    gradients, iconography, etc.
  - iconStyle: line | filled | duotone | none
  - whitespace: generous | moderate | tight
  - backgroundTreatment: solid | soft gradients | subtle texture | image
  - mood: short tags (clean, calm, friendly, airy, marketing, …)

- Model info
  - name / version
  - generated at

- Notes
  - Free-form observations: anything that could not be described by the above
    fields

Custom write/verify tool calls will be implemented to ensure the model's output
fits the schema.

Each website will be parsed by three separate agents with independent contexts
and IRR will be run on their separate outputs. We will only be running IRR
(using Krippendorf's) on fields that are discrete, directly comparable, or
important for the quality of the final dataset. For the above specification,
those fields are:

| Field               | Location   | Type                                   | Metric                                  |
| ------------------- | ---------- | -------------------------------------- | --------------------------------------- |
| Pattern status      | Patterns   | Nominal (present / uncertain / absent) | Fleiss’ κ or Krippendorff’s α (nominal) |
| Pattern confidence  | Patterns   | Interval (0–1)                         | Krippendorff’s α (interval) or ICC      |
| density             | Structure  | Ordinal (sparse / medium / dense)      | Krippendorff’s α (ordinal)              |
| elevation           | Aesthetics | Nominal                                | Fleiss’ κ / α (nominal)                 |
| shape               | Aesthetics | Nominal (soft / sharp / mixed)         | Fleiss’ κ / α                           |
| whitespace          | Aesthetics | Ordinal                                | α (ordinal)                             |
| iconStyle           | Aesthetics | Nominal                                | Fleiss’ κ / α                           |
| borders             | Aesthetics | Nominal                                | Fleiss’ κ / α                           |
| backgroundTreatment | Aesthetics | Nominal                                | Fleiss’ κ / α                           |

As the agents go through the various websites, we also want to make sure we keep
recursively improving the codebook. So, if any agent finds a new UI, pattern, or
variation of an existing pattern, they will add it to the codebook and document
where they found it.

### Codebook Storage

The codebook (Pattern Atlas) currently lives in a single massive HTML file
(`atlas.html`) with 119 entries, their dimensions/variations, related-pattern
links, and inline SVG previews. I'm thinking we move the data to a structured
format (YAML, JSON), and generate HTML from that.

#### Layout

```
codebook/
  patterns/            # one YAML file per entry, filename = id
    card.yaml
    carousel.yaml
    ...
  previews/            # SVG previews, extracted from atlas.html
    card.svg
    card--media-image.svg
  schema/
    pattern.schema.json
  CHANGELOG.md
  VERSION              # semver, e.g. 1.0.0
dist/
  codebook.json        # bundled output read by agents and the console
  atlas.html           # regenerated human-readable Atlas
scripts/
  extract-atlas.ts     # one-time: atlas.html -> codebook/
  build-codebook.ts    # codebook/ -> dist/codebook.json + dist/atlas.html
  validate-codebook.ts # schema + cross-reference checks
```

#### Entry format (`codebook/patterns/<id>.yaml`)

```yaml
id: card # kebab-case, unique, matches filename
name: Card
level: pattern # archetype | pattern | component
parent: browse-collections # optional, id of the archetype it belongs to
definition: >
  A bounded container grouping content and actions about a single item.
dimensions:
  - id: media
    description: What media the card leads with
    values: [none, image, video, icon]
  - id: shape
    values: [square, rounded, pill]
related: [carousel, data-table] # must resolve to existing ids
previews:
  - file: card.svg
  - file: card--media-image.svg
    dims: { media: image }
sources: # where this pattern/variation was observed
  - url: https://example.com
    note: Seed entry from original Atlas
addedIn: 1.0.0
```

#### Rules

1. `scripts/extract-atlas.ts` parses the existing `atlas.html` once, writes one
   YAML per entry and one SVG per preview, and must round-trip: running
   `build-codebook.ts` afterward should produce an `atlas.html` with the same
   entries, dimensions, and previews as the original.
2. `validate-codebook.ts` runs in CI and fails on: schema violations, duplicate
   ids, filename/id mismatch, `related` or `parent` ids that don't exist,
   missing preview files, and `dims` in previews that aren't declared dimension
   values.
3. `dist/codebook.json` contains `version` (from `VERSION`), `generatedAt`, and
   all entries with previews referenced by path, not inlined.
4. Labeling agents read only `dist/codebook.json` and must record its `version`
   in every output file.
5. **The codebook is frozen per batch.** Agents never edit `codebook/` during a
   run. Instead they write proposals to `proposals/<batch>/<id>.yaml` (same
   format, plus `rationale` and `sources`). Proposals are reviewed and merged
   between batches; each merge bumps `VERSION` (minor for new entries/values,
   major for renames or removals) and adds a `CHANGELOG.md` line.
6. Renaming or removing an id requires a `deprecated: true` + `replacedBy: <id>`
   entry rather than deleting the file, so older labeled outputs still resolve.

### Dataset Console

We'll build a small web console to track labeling progress and review what's
been coded.

- **Progress dashboard:** See which sites are queued, in progress, labeled, or
  flagged, along with agreement scores across the three agents and which fields
  they disagree on.
- **Codebook browser:** Browse every pattern and its dimensions, see how often
  each one appears in the dataset, and review agent-proposed additions (with the
  sites where they were found) before they're accepted into the next codebook
  version.
- **UI viewer:** Open a captured site's screenshot and hover over any region or
  component to see a box drawn around it, labeled with its codebook pattern id,
  the dimension values observed (e.g. `card · media: image · shape: rounded`),
  and the evidence behind the match.

To support the viewer, each pattern's evidence should include bounding boxes
(`x`, `y`, `width`, `height` in screenshot pixels) for the regions it was
matched to.

### Choosing Websites

We need to make sure that there is as much variety as possible in the dataset.
There should be various UI domains (e.g. data viz, games, productivity tools).
Quality of design matters, but diversity across domains is the priority.

### Questions

- IRR on Claude Models; would it be better to run IRR on three model labs?
  Claude models all share similar biases and behaviors; maybe running one on
  Claude, one on GPT, and another on Grok would be the best way to run IRR to
  make sure the three models actually agree because of something other than
  biases from their training data.
- If agents add patterns mid-run, labels from different points in the run are
  not comparable. How would we handle this?
- How do we quantify site variety?

### Procedure

1. Handwrote this document.
2. Passed it to Claude Code (Opus 5.5 High Reasoning) for an initial
   implementation of the pipeline + codebook rewrite + dashboard.
3. Asked Grok Bot to compile a list of websites that covers 25 UI domains,
   filling each domain with mixed sources (e.g. design sites like Mobbin,
   popularity lists like Tranco top sites, product directories like Product
   Hunt, specific picks like university websites, government portals, etc.), and
   preferring actual app pages over landing pages, if possible to reach the
   dashboard without logging in.

## Implementation

Node ≥ 23.6 runs the TypeScript directly (no build step). Dependencies are
managed with pnpm; `nix develop` (or direnv with `use flake`) provides Node 24
and pnpm. Setup:

```sh
nix develop                         # optional: Node + pnpm from flake.nix
pnpm install
pnpm exec playwright install chromium
claude auth status                  # real labeling runs use the local Claude Code CLI and its login
```

### Commands

| What                                                            | Command                                                              |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| Validate the codebook (CI gate)                                 | `node scripts/validate-codebook.ts`                                  |
| Build `dist/codebook.json`, `dist/atlas.html`, `dist/previews/` | `node scripts/build-codebook.ts`                                     |
| Check the rebuilt atlas against the original                    | `node scripts/verify-roundtrip.ts`                                   |
| Check a site list's variety before running it                   | `node scripts/site-variety.ts sites/batch-001.yaml`                  |
| Run a batch (capture → 3 raters → agreement)                    | `node scripts/label.ts --batch batch-001`                            |
| Compute IRR for a batch                                         | `node scripts/irr.ts --batch batch-001`                              |
| Review proposals between batches                                | `node scripts/proposals.ts list` / `accept` / `reject` / `deprecate` |
| Dataset console (updates live as batches run)                   | `node console/server.ts` → http://127.0.0.1:4317                     |
| End-to-end smoke test, no model and no cost                     | `pnpm smoke` (then `rm -rf dataset/dry-run proposals/dry-run`)       |
| Tests / types                                                   | `pnpm test` / `pnpm typecheck`                                       |

`scripts/extract-atlas.ts` has already been run: `codebook/` holds the 119
entries. `verify-roundtrip.ts` confirms that rebuilding produces the same
embedded atlas JSON (all 609 dimensions, 680 sub-dimensions, 3166 variations),
the same 119 entry articles, and byte-identical SVG previews, lane headers,
matrix, map, families, crosswalk and static template.

### Layout

```
codebook/
  patterns/<id>.yaml   one entry per file (schema: codebook/schema/pattern.schema.json)
  previews/<id>.svg    extracted previews
  atlas/*.yaml         atlas-wide data: families, levels, archetypes, method, crosswalk, papers
  site/                atlas page template: original CSS, scripts and prose panels, with slots
  VERSION, CHANGELOG.md
dist/                  built output; agents and the console read only this
schema/label.schema.json   the per-site label format (one file per rater)
config/raters.yaml     which models rate (default: 3 × claude-opus-5-5, independent contexts)
sites/<batch>.yaml     sampling frame per batch
dataset/<batch>/
  batch.json           codebook version + hash frozen at batch start, raters
  irr.json             Krippendorff's α per README field, plus per-pattern reliability
  sites/<slug>/
    capture/           screenshot.png, viewport.png, a11y.yaml, elements.json, styles.json, meta.json
    labels/<rater>.json + <rater>.transcript.jsonl
    agreement.json     per-site agreement and the exact disagreements
    consensus.json     majority-vote label
    status.json        queued | capturing | labeling | labeled | flagged | failed
proposals/<batch>/<id>.yaml   agent proposals (merged across raters and sites)
src/                   library code (codebook, pipeline, irr); scripts/ are thin CLIs
```

### How a site is labeled

1. **Capture once.** Playwright loads the page at 1440×900 with
   deviceScaleFactor 1 (so CSS px = screenshot px), scrolls to trigger lazy
   content, and saves a full-page screenshot (capped at 16,000 px), the ARIA
   snapshot, an index of landmark/heading/container/control/media elements with
   exact boxes and computed styles, and page-level style statistics. All three
   raters label this same capture. Live pages change between loads, and separate
   captures would show up as rater disagreement.
2. **Three raters, independent contexts.** Each is a tool-using agent
   (`src/pipeline/tools.ts`). It can crop or zoom the screenshot and overlay its
   own boxes to check them, search elements for exact bboxes and colors, read
   the a11y tree, interact with a live copy of the page (menus, tabs, carousels;
   capped at 25 actions), and search or read the codebook.
3. **Write/verify tools.** `validate_label` and `submit_label` run the JSON
   Schema plus codebook cross-checks: ids exist (with did-you-mean), dims keys
   and values are declared, single vs multi select, bboxes fall inside the
   screenshot, every present/uncertain pattern has a bbox, confidence < 0.6
   needs a rationale, and region↔pattern references are consistent. A label that
   fails is not saved. Harness-owned fields (URL, viewport, UA, codebook
   version, model info) are filled in by code, not by the model.
4. **Agreement.** After all raters finish, the site gets `agreement.json`. Sites
   below `flagBelowAgreement`, sites where a rater failed, and sites where a
   turn was served by a model other than the configured one are marked
   **flagged**.

### Decisions worth reviewing

- **The entry YAML is richer than the sketch above.** The atlas has two levels:
  a dimension (with a family and a question) contains sub-dimensions, and each
  sub-dimension contains values. The YAML keeps that structure. In labels,
  `dims` are keyed by sub-dimension id (e.g. `media`) with value ids (e.g.
  `top-image`); values got kebab-case ids derived from their names. `relations`
  stays structured (`uses` / `specializes` / `neighbors`) instead of a flat
  `related`. `parent` is the archetype. The research fields (`coding`, `wild`,
  `techniques`, `scores`, …) are kept verbatim. Derived values (`metrics`,
  `stats`) are computed at build time, never stored. Their formulas match all
  119 original entries.
- **Some atlas panels stay hand-written.** The Notes, Method, Grammar and
  Findings panels contain prose that is not in the atlas JSON (and Findings was
  edited by hand), so they live verbatim in `codebook/site/shell.html`.
  Everything that is data is rendered from `codebook/`.
- **The original atlas disagrees with itself.** Its rail says "2918 variations"
  while its data and Findings say 3166. Separately, `reactions` has two
  near-duplicate values (`single-tap` and `tap-a-dedicated-button`, both citing
  Instagram's post like) that are worth merging in the first codebook review.
- **Unlisted patterns count as absent.** For pattern-status IRR, a site's units
  are the union of patterns any rater listed. A rater who didn't list a pattern
  is counted as "absent", and their confidence for it is missing. `pattern.dims`
  agreement is reported as an extra row; it is the most useful signal for
  finding ambiguous dimensions in the codebook.
- **Raters run through the local Claude Code CLI.** The `claude-code` provider
  (`src/pipeline/providers/claude-code.ts`) runs `claude -p` once per rater and
  site. It runs in an empty temp dir with built-in tools off, only the rater
  tools (served over a local MCP server), and the codebook system prompt in
  place of Claude Code's own. It uses the CLI's login and removes
  `ANTHROPIC_API_KEY` from its environment. `label.model.servedBy` records the
  model that served each turn.

### Open questions — what the code does

- **IRR across labs.** `config/raters.yaml` defaults to three independent
  `claude-opus-5-5` raters, matching the procedure above. It includes ready-made
  alternatives: three different Claude models, or one rater per lab through an
  OpenAI-compatible provider for GPT or Grok. That provider is **untested** (no
  keys here), so run it on one site first. Comparing α between a same-model
  batch and a cross-lab batch on the same sites directly measures how much
  agreement comes from shared bias.
- **Patterns added mid-run.** This can't happen. A batch records the version and
  hash of `dist/codebook.json` at start, and `label.ts` refuses to continue if
  either changes. Agents can only file proposals. Every label records
  `codebookVersion`, and deprecated ids stay in the bundle with `replacedBy`, so
  labels from different batches can still be mapped onto each other.
- **Quantifying variety.** `scripts/site-variety.ts` reports two things. Before
  labeling, it measures the sampling frame: domain coverage, normalized Shannon
  evenness, effective number of domains (exp H), and Gini–Simpson. After
  labeling, it measures what the dataset actually contains: codebook coverage,
  mean pairwise Jaccard distance between sites' pattern sets, near-duplicate
  site pairs, and evenness of each aesthetic field. The seed frame
  `sites/batch-001.yaml` has 50 sites across 21 domains (evenness 0.98).

### Not yet verified

- **One live pilot only.** The Claude Code rater
  (`src/pipeline/providers/claude-code.ts`) has labeled a single site with a
  single rater (`news-ycombinator-com`). It has not run a full batch. Everything
  around it — capture, tools, validation, proposals, orchestration, IRR,
  consensus and the console — was run end to end with the model-free `dry-run`
  provider. Before batch-001, run one site with one rater:
  `node scripts/label.ts --batch pilot --sites sites/dry-run.yaml --only linear-app --rater rater-1`.
- Some sites in `batch-001.yaml` may block headless browsers; they will show up
  as `failed`.
