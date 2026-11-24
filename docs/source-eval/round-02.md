# Round 2: genUI vs GitHub

**Verdict:** GitHub — it is still the only source whose UIs look different from each other, and its proposals keep exposing gaps in the codebook. But genUI now covers about 9 more patterns at equal sample size, and the first 4 server-mode repo views carry genUI's aesthetic labels.
**Confidence:** low

Basis: 50 gen-002 sites against 45 repo-001 views. The 45 views come from only 25 apps: 23 static apps and 2 server-mode apps (karakeep, poznote). 20 of the 24 views added this round are second views of round-1 apps.

## 1. Visual variety and the "vibecoded" look
I viewed 9 gen and 11 repo screenshots, mostly from sites added this round.

- **genUI** is still one template.
  - Every site has the same consensus shape (soft, 50/50) and borders (thin, 50/50). 48/50 have a solid background and 46/50 moderate whitespace.
  - The screenshots share it too: a cream page, rounded white cards, small tracked uppercase eyebrows, a terracotta, amber or forest accent, and often a serif display face (`repertory-film-screening-alerts`, `camera-resale-hobby-analysis`, `dietitian-ai-meal-planning`, `family-ai-story-archive`).
  - 5 of the 9 show a deadline as a chip, countdown or banner: `passport-appointment-booking` "14:46 hold", `municipal-building-code-reference` "45 days until", `shared-household-notes` "13 days until lease ends", `dietitian` "3 days", `bat-acoustic-survey-onboarding` "Interim report due".
  - The variety is in the central widget: the module cluster map in `nonprofit-codebase-map`, the calendar plus comparison panel in `passport`.
- **GitHub** looks varied.
  - Dark pro tools (`blockbench--animate-mode`, `openhands--conversation`), photoreal WebGL (`solar-wanderer--explorer-earth`, `flight-path--globe`), painted game art (`ancientbeast--music-player`), a purple macOS pastiche over wallpaper (`aurora-os-js--finder-documents`), Bootstrap (`jkan--datasets-filtered`) and dated teal medical (`mere-medical--lab-report-trend`).
  - Evenness for shape / borders / background / whitespace is 0.61 / 0.68 / 0.57 / 0.79, against genUI's 0.00 / 0.00 / 0.24 / 0.30.
- **Warning sign:** all 4 server-mode views (`karakeep--*`, `poznote--*`) are soft, thin and solid on consensus, the genUI profile. Karakeep is shadcn/zinc and poznote is plain; neither looks AI-styled, but the categorical fields can't tell them apart from genUI.

## 2. Pattern coverage
| | gen-002 (n=50) | repo-001 (n=45) |
|---|---|---|
| Distinct patterns present | 77 (65%) | 65 (55%) |
| Estimated at n=45 | ~74 | 65 |
| Present patterns per site | 11.1 | 7.2 |
| Found only in this source | 25 | 13 |
| New patterns this round | +11 from 16 sites (0.69/site) | +17 from 24 views (0.71/view) |
| New-entry proposals | 10 ids (~7 concepts) | 10 ids (4 concepts) |
| New-value proposals | 13 | 9 |

The estimate at n=45 interpolates genUI's 66 → 77 growth between rounds.

- **Gen-only:** booking-flow, checkout, approval-flow, wizard, plan-picker, availability-picker, calendar, date-picker, comment-thread, co-editing-presence, sharing-permissions, inline-edit, node-editor and timeline-editor.
- **Repo-only:** code-editor, file-manager, object-viewer-3d, pivot-table, map-explorer, gantt-timeline, color-picker, bulk-actions, tag-input, toast, carousel and feed.
  - agent-run, ai-provenance, version-history, faceted-search and onboarding-tour moved from gen-only to shared this round, through `openhands--conversation`, `apiark--git-panel`, `jkan--datasets-filtered` and `motion-previs-studio--quick-start-help`.
- **Second views are productive but running out.** Most of them added patterns. `huey--datasources-tree`, `palantir-for-family-trips--meals` and `urlclash-converter--sing-box-mode` added none, and `ancientbeast--music-player` added one. Two view pairs are near-duplicates (kepler-gl and huey, 0.83 similarity each).
- **Proposals:**
  - Repo's new entry this round is `timed-text-sync-editor`, from `lrcget--lyrics-editor-synced`. All 3 raters proposed it independently.
  - `windowed-desktop` is a third id for the window-manager concept.
  - genUI added `number-stepper` (1 rater) and 6 new values.
- **Codebook gaps cause disagreement.** The lowest-agreement repo sites are the gap sites: `blockbench--animate-mode` 0.73, `blockbench--edit-mode` 0.74 and `lrcget--lyrics-editor-synced` 0.77.

## 3. Label reliability
| Field | gen α (Δ from round 1) | repo α (Δ) |
|---|---|---|
| Pattern status | 0.678 (−.003) | 0.710 (−.014) |
| Confidence | 0.859 | 0.861 |
| density | 0.903 | 0.867 (+.058) |
| elevation | 0.786 | 0.814 |
| shape | 0.000* | 0.883 |
| whitespace | 0.801 | 0.836 |
| iconStyle | 0.899 | 0.831 |
| borders | n/a* | 0.907 |
| backgroundTreatment | 0.794 (+.30) | 1.000 |
| dims (extra) | 0.925 | 0.911 |

\*Raters agree 99–100% of the time, but genUI has almost no variation on these fields, so α can't be computed meaningfully.

- **Overall:** even. Mean per-site agreement is 0.876 for gen and 0.882 for repo.
- **Disagreement hot spots:**
  - gen: overview-detail (α 0.24 over 26 units, no better than round 1), contextual-help (0.25), coordinated-views (0.30), reader (0.07), view-switcher (0.19).
  - repo: popover (−0.24), drag-reorder (0.02), contextual-help (0.15), menu (0.40 over 25 units), split-pane (0.42).
  - contextual-help is poor in both sources, so the problem is its definition.
- **Repo capture problems:**
  - Cumulative yield is 45 of 50 views. Round 2 alone: 24 labeled from 28 attempts (86%).
  - `datadex--landing` still fails (`Page.captureScreenshot`).
  - `flight-path--flight-plane-controls` timed out on `goto`.
  - `solar-wanderer--help-overlay` failed when replaying its "Enter the solar system" step.
  - `toothpaste--script-editor`: all 3 raters refused after 1 turn. It is a DuckyScript payload editor.
  - `voxel-musou` was withdrawn and is waiting for a re-capture.
  - WebGL now works for `flight-path--globe` and `solar-wanderer--explorer-earth`.
  - Degraded views:
    - `openhands--conversation` shows "No files in workspace".
    - `solar-wanderer` shows "Loading HD textures 6%".
    - `mere-medical` shows its demo toast again.
    - 5 repo sites (11%) have 2 or fewer present patterns: both `bubo-rss` views, `jkan--home`, `ancientbeast--battlefield` and `word-to-markdown-js--conversion-result`.
- **genUI:** 50/50 labeled, minimum 4 patterns (`supper-club`).

## 4. Domain coverage and realism
- **genUI:** 18 named domains across 50 sites. Only social-community is missing; science-research (`bat-acoustic`) and nonprofit (`theory-of-change-builder`) were filled this round.
  - Consensus drifts from the even brief frame: education 8 and government-civic 7 make up 30% of sites.
  - The data is dense and specific, but each app is staged around a deadline.
- **GitHub:** 13 named domains. Utilities 8, data-visualization 7 and design-creative 6 make up 47% of views.
  - Productivity arrived with karakeep and poznote.
  - Still missing: finance, commerce, education, social-community, nonprofit and reference-docs.
  - Realism is high where it exists. Karakeep was seeded with about 147 bookmarks over 14 months and about 110 tags, and the raters checked its cascading menus on the live page.
  - Breadth is 25 apps, not 45.

## 5. Cost and throughput
| | gen-002 | repo-001 |
|---|---|---|
| Spend on the sources behind labeled sites | $124.0 for 50 sites | $99.3 for 25 apps (23 static $90.9, karakeep $4.6, poznote $3.7) |
| Per labeled site | $2.48 | $2.21 |
| All spend to date per labeled site | $262 / 50 = $5.24 | $428 / 45 = $9.51 |
| Source failures | 4 of 100 builds | 2 of 89 setups |
| Capture/label failures this round | 0 of 16 | 4 of 28 |

- **Unproductive spend:** about $328 of server-mode setup (60 repos) has produced no labels yet.
- **Haiku is still the bargain:** `shared-household-notes` cost $0.80 and has 22 patterns, the most of any site.
- **Still unrecorded:**
  - Explore and labeling sessions still don't record USD.
  - genUI cost is slightly undercounted: labeled `bug-duplicate-search` records $0.

## What changed since the last round
- Repo grew from 22 to 45 labeled views; it now includes 2 server-mode apps and 20 second views.
- Codebook coverage grew from 48 to 65 patterns for repo and from 66 to 77 for genUI. The overlap between the sources grew, so gen-only fell from 29 to 25.
- WebGL capture was fixed and `voxel-musou` was withdrawn, as round 1 recommended.
- The first server-mode views match genUI's categorical aesthetics.
- Repo evenness fell on borders (0.77 → 0.68), background (0.63 → 0.57) and iconStyle (0.69 → 0.56).
- Repo got a strong new-entry proposal (`timed-text-sync-editor`).

## What would change the verdict
- **Toward genUI:**
  - The next 20 or more server-mode first views keep the soft/thin/solid profile (4/4 so far).
  - Third views of static apps add fewer than 0.3 new patterns per view.
  - Server mode can't be run at scale, so the $328 never turns into labels.
- **Firmer for GitHub:**
  - Server-mode views fill finance, commerce, education and social while keeping evenness above 0.5.
  - New-entry proposals keep coming from repos.
  - Cost per view falls below $2.48 with at least 8 patterns per site.

## Recommendations for the next round
1. **Run server-mode repos at scale first.** Without them, round 3 is third views of 23 static apps. Pick from the missing domains first (myfin, kresus, invio, shopnex, svelte-commerce, phanpy).
2. **Cap views per app by what they add.** Skip a view that adds no new pattern or is more than 0.8 similar to an earlier one.
3. **Clean up the frame.**
   - Raise the `goto` timeout for flight-path.
   - Fix the solar-wanderer help-overlay step.
   - Fix capture for datadex.
   - Re-capture voxel-musou.
   - Drop `toothpaste--script-editor`.
4. **Codebook review.**
   - Merge window-manager, desktop-window-manager and windowed-desktop; the four game ids; and the two 3D-editor ids.
   - Accept `timed-text-sync-editor`.
   - Tighten the definitions of overview-detail, contextual-help and popover.
5. **genUI.**
   - Vary the brief "moment" so the apps don't all build around a deadline.
   - Add social-community briefs.
   - Prefer Haiku for pattern coverage.
   - Keep treating gen aesthetics as the vibecoded baseline.
6. **Record USD for explore and labeling** (carried over from round 1).

---
_Evaluator: claude-opus-5-5, effort xhigh (served by: claude-opus-5-5); gen-002 50 labeled, repo-001 45 labeled; 2026-11-17; cost $4.46 equivalent._
