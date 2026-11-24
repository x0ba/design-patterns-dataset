# Round 1: genUI vs GitHub

**Verdict:** GitHub — its UIs vary in look and it surfaces UI types the codebook lacks, which is what the dataset is for, but genUI is cheaper, has more patterns per site and captures more reliably.
**Confidence:** low

Basis: 34 gen-002 sites against 22 repo-001 sites. The repo sites are first views of static apps only, and 3 of the 25 static repos failed capture.

## 1. Visual variety and the "vibecoded" look
I viewed 12 gen and 16 repo screenshots.

- **genUI:** the consensus aesthetics barely change from site to site. Shape is soft on 34/34 sites, borders thin on 34/34, background solid on 33/34 and whitespace moderate on 30/34. Every site has `badge` (34/34) and half have `stat-tile` (17/34).
  - The screenshots share one template: a left sidebar with a square logo tile and an avatar footer, rounded cream or white cards, an Inter-like sans with an occasional serif display face, and an amber deadline banner or "N days left" chip. Examples: `course-visualization-workspace`, `public-health-plan-selection`, `benefits-rules-encoding`, `supper-club-guest-confirmation`, `lab-meeting-recording-library`.
  - The variety is in palette (dark `cozy-game-companion-alerts`, broadsheet `community-paper-archive-site`) and in each app's custom central widget: the window canvas in `storefront-lettering-layout`, the floor plan in `stockroom-slotting-planner`, the multitrack timeline in `student-audio-story-editor`. That helps for composition, not for aesthetics.
  - genUI is more even on elevation (1.00 vs 0.65) and iconStyle (0.74 vs 0.69).
- **GitHub:** evenness for shape / borders / background / whitespace is 0.59 / 0.77 / 0.63 / 0.78, against genUI's 0.00 / 0.00 / 0.19 / 0.40.
  - The looks really differ: painted game art (`ancientbeast--battlefield`), a macOS-style desktop with wallpaper (`aurora-os-js--mail-reading`), dense dark pro tools (`blockbench--edit-mode`, `apiark--request-editor`, `kepler-gl--map-workspace`), a hand-drawn whiteboard (`excalidraw--board-overview`), a Bootstrap civic portal (`jkan--home`), unstyled HTML (`bubo-rss--feed-list`) and grey desktop widgets (`huey--pivot-workspace`).
  - Not all of it is free of the AI look. `word-to-markdown-js` (cream background, dot grid, lime accent, serif italic) and `palantir-for-family-trips` look AI-styled. The ≥150-stars, pushed-in-2-years filter lets AI-built repos in.
- **Jaccard distance:** mean pairwise distance is 0.88 for repo and 0.73 for gen. The repo figure is inflated by tiny pattern sets: 5 repo sites have 2 or fewer present patterns, while the gen minimum is 4.

## 2. Pattern coverage
| | gen-002 | repo-001 |
|---|---|---|
| Distinct patterns present | 66 (55% of codebook) | 48 (40%) |
| Present patterns per site | 10.8 | 6.6 |
| Found only in this source | 29 | 11 |
| New-entry proposals | 9 ids (~6 concepts, 6 sites) | 8 ids (3 concepts, 3 sites) |
| New-value proposals | 7 | 5 |

- **Gen-only patterns** include agent-run, ai-provenance, wizard, plan-picker, comparison-table, calendar, availability-picker, version-history, comment-thread, co-editing-presence, timeline-editor, faceted-search and onboarding-tour.
- **Repo-only patterns** are mostly whole workspaces: code-editor, tree-view, pivot-table, map-explorer, zoomable-canvas, gantt-timeline and file-manager, plus prompt-input, carousel, toast and file-upload.
- **Proposals:**
  - Repo proposals point to structural gaps in the codebook: a game board / HUD / turn order (`ancientbeast`, 4 near-duplicate ids), a 3D scene editor (`blockbench`, 2 ids) and a window manager (`aurora-os-js`, 2 ids).
  - Gen proposals are domain panels: a validation-checklist trio (rule-checks-panel, diagnostics-panel, gated-commit-checklist), facility-floor-plan, what-if-scenario, section-index (×2), and resolution-suggestions / suggested-fixes. The checklist trio looks like a generator habit; `supper-club` has the same "Before you confirm" panel.
- Patterns per site doesn't depend on sample size, so genUI's broader coverage is not just its larger n.

## 3. Label reliability
| Field | gen α | repo α |
|---|---|---|
| Pattern status | 0.681 | 0.724 |
| Confidence | 0.854 | 0.838 |
| density | 0.910 | 0.809 |
| elevation | 0.767 | 0.805 |
| shape | 0.000* | 0.923 |
| whitespace | 0.801 | 0.806 |
| iconStyle | 0.894 | 0.805 |
| borders | n/a* | 0.920 |
| backgroundTreatment | 0.495 | 1.000 |
| dims (extra) | 0.924 | 0.914 |

\*Raters agree 98–100% of the time, but every site has the same value, so α can't be computed meaningfully.

- **Overall:** about even. Mean per-site agreement is 0.876 for gen and 0.884 for repo. Repo's site-level α rests on 22 units, so a single changed vote moves it noticeably.
- **Least reliable patterns:**
  - gen: overview-detail (α 0.19 over 16 units), recommendations (0.23), coordinated-views (0.31).
  - repo: filter-controls (0.22), tooltip (0.31), split-pane (0.33), and choice-control (0.00 despite 0.93 raw agreement; the pattern is nearly always present, so α breaks down).
  - Both sources: contextual-help and accordion.
- **Lowest-agreement sites:** `photo-studio-bay-scheduling` (0.73) and `blockbench--edit-mode` (0.74).
- **Capture problems, all on the repo side: 5 of 25 static repos (20%).**
  - `datadex--landing`, `flight-path--globe` and `solar-wanderer--explorer-earth` failed outright with `Page.captureScreenshot` errors. All three are WebGL apps.
  - `voxel-musou--title-menu` was labeled on a "載入失敗 / Failed to load" screen. Its agreement is 1.00 and its consensus is `empty-state`, which inflates the repo reliability numbers.
  - `huey--pivot-workspace` has a blank pivot result area; the raters noted it.
  - Two sites have demo or artificial content: `mere-medical` shows a "demo mode" toast, and `word-to-markdown-js` shows the app converting its own page.
- **genUI:** all 34 sites labeled, and none of the 12 I viewed was blank or an error screen.

## 4. Domain coverage and realism
- **genUI:** 17 consensus domains across 34 sites (education 6, government-civic 4). Missing: science-research, social-community, nonprofit.
  - The seeded data is specific and dense; `benefits-rules-encoding` has 63 rule steps with CFR citations, and `stockroom` has 212 bins.
  - But each app is a single scene staged for the brief's "moment", usually with a countdown ("7 h 16 min left", "2h 19m left"). Some even say "Prototype with mock data".
- **GitHub:** 13 domains across 22 sites, skewed toward what runs as a static build: utilities 5, data-visualization 3, design-creative 3, games 2.
  - No finance, commerce, education, productivity or social sites yet. Those repos (myfin, kresus, invio, shopnex, svelte-commerce, phanpy, karakeep) all need a server.
  - The real products are deep: Blockbench, kepler.gl, Excalidraw, ApiArk with about 400 seeded history entries. Next to them are thin ones: `bubo-rss`, `privacy-protect`, `urlclash-converter`.

## 5. Cost and throughput
| | gen-002 | repo-001 |
|---|---|---|
| Recorded acquisition spend | $262 for 100 briefs | $428 for 89 repos ($92 for 25 static, $336 for 62 server) |
| Source failures | 4 of 100 builds | 2 of 89 setups (one clone timeout; sophosia) |
| Capture failures this round | 0 of 34 | 3 of 25, plus 2 degraded |
| Cost per labeled site | $2.58 ($87.8 / 34) | $4.13 ($90.8 / 22); $4.62 per fully usable site |
| Ceiling | one site per build | 381 views from 87 repos, about $1.12 per view if server mode works |

- **By generator (gen):** Haiku costs $0.82 per site for 9.8 patterns, Sonnet $2.35 for 10.1, Opus $4.41 for 12.3.
- **Unproductive spend:** the $336 spent setting up the 62 server-mode repos has produced no labels yet.
- **Labeling cost:** the same three Opus 5.5 raters label both sources, but labeling isn't recorded in USD. Repo explore sessions record tokens only, and gen spend is slightly undercounted because failed or timed-out runs record $0.

## What changed since the last round
This is the first round; there is no earlier report.

## What would change the verdict
- **Toward genUI:**
  - Server-mode repo views turn out to be generic Tailwind/shadcn admin screens, pulling repo evenness down toward genUI's.
  - Capture failures stay at 15% or more.
  - Second views of the same repo add few new patterns or new looks.
- **Firmer for GitHub:**
  - Server-mode views keep evenness above 0.5 on shape, borders and background.
  - They fill finance, commerce and social.
  - Cost per view moves toward $1.12.

## Recommendations for the next round
1. **Fix capture.**
   - Make WebGL work in headless Chromium on Linux (SwiftShader/ANGLE flags), then re-capture the 3 failed sites and `voxel-musou`.
   - Re-capture `huey` with a wait for DuckDB-WASM to finish loading.
   - Automatically flag captures with 1 or fewer present patterns or error text. Leave `voxel-musou` out of IRR until it is relabeled.
2. **Get server-mode repos into the sample.** Finish the Linux runtime sandbox so round 2 can label first views of server-mode repos, aimed at finance, commerce, education, productivity and social. Stay breadth-first.
3. **Compare at equal sample size.** Report coverage rarefied to equal n, and Jaccard distance only over sites with 5 or more patterns.
4. **Record cost in USD** for explore and labeling sessions, so per-site cost is complete.
5. **Clean up proposals before the next codebook bump.**
   - Merge the duplicates: game-board / game-hud / game-board-hud / turn-order-queue, window-manager / desktop-window-manager, scene-editor-3d / model-editor-3d, section-index / section-index-nav, and resolution-suggestions / suggested-fixes.
   - Tighten the definitions of overview-detail, contextual-help and accordion.
6. **Use genUI for patterns, not looks.** Use gen labels for pattern and composition examples, and treat gen aesthetics as the vibecoded baseline, as the README already says. Haiku gives about 80% of Opus's pattern count at about a fifth of the cost.

---
_Evaluator: claude-opus-5-5, effort xhigh (served by: claude-opus-5-5); gen-002 34 labeled, repo-001 22 labeled; 2026-11-17; cost $5.94 equivalent._
