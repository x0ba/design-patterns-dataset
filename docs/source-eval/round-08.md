# Round 8: genUI vs GitHub

**Verdict:** GitHub — gen-002 is still frozen at 96 sites with one look, while this round's repo views opened the last empty domain, added 3 patterns and the first new-entry proposal backed by two raters, though capture quality slipped again.
**Confidence:** medium. Round 7 set two "toward genUI" tests: repo adding fewer than 2 patterns, and failed-plus-degraded views above 25%. The first was not met. The second was met for the second round running (28%). Of the "high confidence" conditions, only nonprofit coverage was met.

**Basis:** gen-002 has 96 sites from 96 apps, unchanged since round 4. repo-001 has 195 labeled views from 82 apps. This round added 24 views, 10 of them from 5 new apps: ikuyo, ws4kp, allsky, frontend and rapid. Three more views were flagged with only 2 raters. They are included in `irr-repo-001` and `variety-repo-001`, where n=198. All of this round's views are server mode.

## 1. Visual variety and the "vibecoded" look
**gen.** I looked at 8 screenshots: `lunar-surface-explorer`, `storefront-lettering-layout`, `cozy-game-companion-alerts`, `passport-appointment-booking`, `craft-market-booth-layout`, `mutual-aid-grant-payouts`, `jobs-report-chart-production` and `student-audio-story-editor`. The content is specific to each domain (a door-lettering ruler in inches, a booth floor plan), but the frame around it is shared:
- 7 of 8 use a list, a work area and a right rail.
- 5 of 8 have a right rail of checks or tasks: "Layout checks 2 to resolve", "2 to fix", "NEEDS YOU 5 to you", "Pinned to your draft", "Compare".
- 6 of 8 show countdown chips: "4 days left", "in 16 h 7 m", "hold ends 12:39", "1 d 2 h 37 m left".
- 4 of 8 have warm off-white pages and 2 are dark.

**repo.** I looked at 12 screenshots from this round:
- `ws4kp--weather-player`: a WeatherStar 4000 emulator set in the Star4000 pixel font, in a 640 px column of radio buttons.
- `rapid--map-editor`: a full-bleed OpenStreetMap editor with a Point / Line / Area toolbar.
- `frontend--campaign-detail`: a Bulgarian donation page set in Commissioner and Montserrat, in Cyrillic.
- `allsky--live-view`: a Bootstrap-3 admin in Helvetica Neue with a fisheye sky frame.
- `qmreader--admin-console`: a monochrome Chinese admin.
- `ribbon--large-variants-table`: genomics views.
- `blockout--shoot-camera`: a dark previz timeline.
- `ikuyo`: a system-font card grid.
- Only `floe--download` (Geist, dark marketing page), `feishin--album-detail` (Inter, a Spotify-like layout) and `mirotalk` look generic.

**Measurements.** The new apps add Star4000 and Commissioner as primary fonts. Round 7's `styles.json` table still holds: gen pages are 78% warm off-white, and gen has an effective 4.2 primary font families against repo's 10.7.

The categorical labels still flatten repo's variety. Of this round's 27 views, 23 are labeled soft, 23 thin and 21 solid.

## 2. Pattern coverage
| | gen (n=96) | repo (n=198 consensus, 82 apps) |
|---|---|---|
| Distinct patterns present | 86 (72%) | 84 (71%), +3 this round |
| Present per site | 11.1 | 7.4 in this round's 24 views |
| Mean pairwise Jaccard distance | 0.73 | 0.84 |
| Only in this source | 14 (was 17) | 12 |

- **The three new repo patterns were already in gen:**
  - `approval-flow` (`qmreader--admin-console`) appears on 8 gen sites.
  - `focus-context` (`ribbon--large-variants-table`) and `timeline-editor` (`blockout--shoot-camera`) each appear on 1.
  - So combined coverage stays at 98 of 119. Repo is catching up, not extending the dataset.
- **New-entry proposals:**
  - `completion-summary`: 2 raters, at the flagged `…--mission-summary`.
  - `map-editor`: 1 rater, at rapid.
  - `layer-stack-panel`: 1 rater, at aladin-lite.
  - `section-jump-links`: 1 rater, at frontend.
- **New values backed by 3 raters:**
  - view-switcher `raw-text` (rapid).
  - bulk-actions `detail-panel-swap` (fluent-reader).
  - `scene-editor-3d` gained `blockout--shoot-camera` with all 3 raters.
- **Proposals are still the real growth path, and gen-002 can't add any.**

## 3. Label reliability
| Field | gen α | repo α (Δ from round 7) |
|---|---|---|
| Pattern status | 0.698 | 0.697 (+.008) |
| Confidence | 0.868 | 0.860 (+.002) |
| density | 0.909 | 0.843 (+.007) |
| elevation | 0.777 | 0.850 (+.001) |
| shape | 0.594* | 0.848 (+.005) |
| whitespace | 0.835 | 0.886 (+.015) |
| iconStyle | 0.881 | 0.870 (−.003) |
| borders | n/a* | 0.883 (−.031) |
| backgroundTreatment | 0.873 | 0.947 (−.002) |
| dims | 0.921 | 0.931 |

\*Prevalence effect: nearly every gen site gets the same value.

- **Per-site agreement:** the new views average 0.898 (round 7: 0.879). The lowest are `rapid--map-editor` 0.759, `image-cockpit…--animation-sheet-preview` 0.768 and `feishin--album-detail` 0.787.
- **Agreement does not catch bad captures.** `ikuyo--trip-overview` scores 0.926 on a backend error page.
- **Hot spots:**
  - repo: slider 0.10 (26 units), contextual-help 0.17 (8th round under 0.25), popover 0.17, autocomplete 0.24 (new), choice-control 0.33 over 95 units.
  - gen: toast −0.11, drawer −0.03.
- **Repo capture failures (29 attempts):**
  - 2 port collisions: `oksskolten--chat-conversation` on 4435 and `igdm--not-following-back` on 4439. These are the same two apps as in round 7, and they failed after this round's rebuilds had finished. That points to servers left running by the previous labeling run, not to rebuilds running at the same time.
  - 3 views flagged by a new rater-page bug, `waitForFunction … reading 'complete'` of null: `frontend--campaigns`, `drawphone--result-detail` (0 patterns) and `…--mission-summary` (1 pattern).
- **Degraded repo views that were still labeled:**
  - `ikuyo--trip-overview`: "No query results for model [App\Models\Trip]", plus a spinner.
  - `mirotalk--polls-panel`: the polls panel never opens; only a toast shows (3 patterns).
  - `floe--download`: a download landing page with 1 pattern.
  - `ribbon` again shows its "Loading data from permalink" banner.
- **Failed plus degraded: 8 of 29 (28%)**, up from 26%.
- **gen is not clean either.** `lunar-surface-explorer` was captured with its map stuck on "Charting the Moon's surface…" in both the viewport and the full-page screenshot.

## 4. Domain coverage and realism
- **Nonprofit is filled** by `frontend--campaign-detail`, so all 19 frame domains now have labeled views. rapid was sampled as nonprofit, but the raters coded it as utilities. agoracosmica is still unlabeled. Travel stayed within its cap (2 ikuyo views).
- **Repo data is real-world in scale:**
  - frontend: euro donations with relative dates, 93% of €9,000.
  - rapid: real OSM tagging and a field inspector over local tiles.
  - allsky: 14 seeded nights, but the sky images are synthetic, drawn with PHP GD.
  - qmreader: 75 of 96 feeds active.
- **Repo near-duplicates:** `speechgpt--settings-chat` ≈ `…--settings-synthesis` (1.0) and the two aladin-lite views (0.8).
- **gen** still covers 19 domains with evenness 0.95, with dense fictional data, but every app is a single screen. `jobs-report-chart-production` even says in its footer "Prototype with sample data."

## 5. Cost and throughput
| | gen-002 | repo-001 |
|---|---|---|
| Spend this round | $0 | $3.9 in Linux rebuilds (ws4kp, frontend, rapid) |
| Setup spend behind labeled sites | $262 → $2.73/site | $409 → $2.10/view; this round's new apps $45.6 → $5.70/view (allsky alone $17.9) |
| All setup spend / labeled | $2.73 | ≈ ($433 + $42) / 195 ≈ $2.44 |
| Yield this round | — | 24 of 29 attempts (83%; round 7: 77%) |

- **Throughput is not the limit:** 29 attempts took 33 minutes.
- **USD for exploring and labeling is still unrecorded.**
- **Supply:** about 180 frame views have not been attempted. More genUI needs a gen-003.

## What changed since the last round
- **Repo:** +24 views, +5 apps, +3 patterns (all already in gen), +4 new-entry proposals, and nonprofit filled.
- **Yield and quality:** yield rose to 83%, but failed plus degraded rose to 28%. There is a new rater-page bug.
- **Round 7's recommendations:**
  - Done: ikuyo and allsky relabeled, nonprofit views labeled, travel capped.
  - Not done: the port fix, the thin-view and near-duplicate gates, the `site-variety.ts` font metrics, the codebook review and USD recording.

## What would change the verdict
- **Toward genUI:**
  - A 25-site gen-003 gets warm off-white pages under 40% and an effective 8 or more primary font families.
  - Or repo failed plus degraded stays above 25% for a third round while its new views add nothing that gen lacks: no pattern absent from gen and no new-entry proposal backed by several raters.
- **To high confidence for GitHub:**
  - Yield of 90% or more with failed plus degraded at 15% or less, once the port and readiness bugs are fixed.
  - A codebook review that accepts at least 2 repo-sourced entries, for example `scene-editor-3d` and `completion-summary`.

## Recommendations for the next round
1. **Stop leftover servers.** Have `label.ts` kill any listener on an app's port before starting it, and stop every app server when it exits. Then relabel `oksskolten--chat-conversation` and `igdm--not-following-back`.
2. **Fix the readiness check** that reads `.complete` on a missing element. Rerun one rater on the 3 flagged views, but drop `drawphone--result-detail`, which has 0 patterns and is a duplicate.
3. **Gate bad captures** before labeling:
   - Reject views whose text matches server-error strings, or whose consensus has 2 or fewer patterns.
   - Retake `ikuyo--trip-overview`, and `mirotalk--polls-panel` with its panel open.
   - Skip `floe--download`, and skip second views at Jaccard ≥ 0.8.
4. **Review the codebook** between batches:
   - Accept `scene-editor-3d`, `completion-summary`, view-switcher `raw-text` and bulk-actions `detail-panel-swap`.
   - Consider folding `map-editor` and `layer-stack-panel` into map-explorer.
5. **Prioritize first views of apps that are still unlabeled,** such as agoracosmica and svelte-commerce, over more settings screens.
6. **Add the font and warm-page metrics to `site-variety.ts`, and record USD** for exploring and labeling. If you run a gen-003, keep it to 25 sites scored against round 7's §1 table.

---
_Evaluator: claude-opus-5-5, effort xhigh (served by: claude-opus-5-5); gen-002 96 labeled, repo-001 195 labeled; 2026-11-18; cost $5.98 equivalent._
