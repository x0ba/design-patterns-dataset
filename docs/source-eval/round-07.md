# Round 7: genUI vs GitHub

**Verdict:** GitHub — gen-002 is still frozen at 96 sites, and this round's first measurement from `styles.json` shows its look is one template. That holds even though repo pattern coverage did not grow this round.
**Confidence:** medium. Two conditions set in round 6 were tested this round, one in each direction, and they cancel out. Pointing toward genUI: the repo views added 0 new patterns, below the threshold of 2. Pointing toward high confidence for GitHub: `styles.json` confirms that repo apps vary more.

**Basis:**
- **genUI:** 96 gen-002 sites from 96 apps, unchanged since round 4.
- **GitHub:** 171 repo-001 views from 77 apps. Round 6 reported 62 apps; the correct count was 63.
  - This round added 27 views. 21 of them come from 14 new apps: trek, jetlog, betterbahn, mini-macau, type-pal, igdm, oksskolten, aladin-lite, ribbon, blockout, devterms, floe, drawphone and image-cockpit.
  - All 27 are server-mode apps, so the static-only limit of the early rounds no longer applies.

## 1. Visual variety and the "vibecoded" look
I looked at 8 gen screenshots and 17 of this round's repo views:
- gen: `private-container-registry`, `water-association-meter-readings`, `esports-scrim-replay-review`, `home-automation-flow-editor`, `chess-tournament-director-helper`, `herbarium-lobby-kiosk`, `flashcard-memory-patterns`, `smoke-week-sensor-replay`.

**genUI still repeats one template:**
- 5 of the 8 are three-pane layouts with a context pane on the right.
- 3 have amber "Needs you" or "Needs your review" callouts.
- Urgency chips recur: "4 days left", "in 2h 20m", "Rebuild today".
- Only esports, with its dark video stage, breaks the pattern.

**The repo views each have their own look:**
- `mini-macau`: a black transit dashboard with Chinese labels, a monospace clock and a 24-hour density scrubber.
- `aladin-lite`: a full-bleed sky survey with JWST footprints drawn over it.
- `type-pal`: a pixel-art RPG editor with a Chinese interface.
- `blockout`: a dark 3D pre-visualization tool.
- `jetlog`: an all-monospace cream page with a world route map.
- `ribbon`: Bootstrap-styled genomics.
- `drawphone`: a list set in the handwritten Pangolin font.
- `betterbahn`: a German train-ticket app with outlined Arial cards.
- Only `devterms` (Geist font, shadcn style) and `image-cockpit` look generic.

**Measured from `styles.json`, for the first time.** One row per app: its primary font family and its root page background.

| | gen (96 apps) | repo (77 apps) |
|---|---|---|
| Primary font is a system stack | 59% | 39% |
| Share of the top 3 families | 84% (system, Inter, IBM Plex) | 61% (system, Inter, Geist) |
| Distinct primary families | 12 | 26 |
| Effective number of primary families | 4.2 | 10.7 |
| Has a serif accent font | 39% (Iowan Old Style 17, Fraunces 11) | 5% |
| Warm off-white page (e.g. #f3f0e8) | 78% | 6% |
| Pure white page | 0% | 47% |
| Dark page | 6% | at least 29% |

- **The sample sizes make the repo lead conservative.** The effective number of families grows with sample size, and repo has the smaller sample.
- **Caveats on the measurement:**
  - The font family recorded is the first one in the CSS stack, not necessarily the face that rendered.
  - floe and mirotalk paint their dark background on an inner container, so their root records #ffffff. Repo's dark share is therefore a minimum.
- **The categorical labels still hide these differences.** Of this round's 27 views, 22 are labeled soft, 25 thin and 19 solid.
- **Repo borders evenness fell from 0.56 to 0.36, but only because the first "heavy" label added a third category.** This is an artifact of how evenness is normalized, not a real drop.

## 2. Pattern coverage
| | gen (n=96, 96 apps) | repo (n=171, 77 apps) |
|---|---|---|
| Distinct patterns present | 86 (72%) | 81 (68%), +0 this round |
| Present per site | 11.1 | ≈7.5 overall (7.1 this round) |
| Mean pairwise Jaccard distance | 0.73 | 0.84 |
| Only in this source | 17 | 12 |

- **Repo coverage has stopped growing:** 76 patterns at n=116, 81 at n=144, and 81 at n=171.
  - Combined coverage stays at 98 of 119 entries.
- **The raters filed proposals instead:**
  - 3 new-entry proposals, each from a single rater:
    - `poll` (`mirotalk--meeting-grid`).
    - `simulation-time-control` (`mini-macau--transit-map`).
    - `status-bar` (`type-pal--scene-workspace`).
  - Proposals backed by several raters:
    - `scene-editor-3d`: all 3 raters at `blockout--stage`, and earlier at blockbench.
    - `map-explorer` new values (layer-toggle panel, sky-survey basemap, footprint overlays): 3 raters across mini-macau and aladin-lite.
  - `toast` and `canvas-editor` also gained values.
- **This plateau looks like the codebook's ceiling rather than the source running dry.** That is an inference until a review accepts some of these proposals.

## 3. Label reliability
| Field | gen α | repo α (Δ from round 6) |
|---|---|---|
| Pattern status | 0.698 | 0.689 (−.003) |
| Confidence | 0.868 | 0.858 (−.001) |
| density | 0.909 | 0.836 (+.020) |
| elevation | 0.777 | 0.849 (+.020) |
| shape | 0.594* | 0.843 (+.001) |
| whitespace | 0.835 | 0.871 (+.014) |
| iconStyle | 0.881 | 0.873 (+.008) |
| borders | n/a* | 0.914 (−.010) |
| backgroundTreatment | 0.873 | 0.949 (−.017) |
| dims (extra) | 0.921 | 0.930 (0) |

\*Prevalence effect: almost every gen site gets the same value on this field.

- **Per-site agreement:** the new views average 0.879 (round 6: 0.871). The lowest:
  - `igdm--conversation` 0.745
  - `igdm--user-search` 0.765
  - `trek--dashboard` 0.768
  - `mini-macau--transit-map` 0.773
- **Disagreement hot spots:**
  - Repo:
    - slider 0.10 (22 units) and popover 0.13 (22 units).
    - coordinated-views 0.19.
    - contextual-help 0.21, its 7th round under 0.25.
    - New to the list: rating 0.25, notification-center 0.31 and object-viewer-3d 0.32.
  - gen: toast −0.11, drawer −0.03.
- **Capture yield:** 27 labeled from 35 attempts (77%, down from 82%). Counting retries, 27 of 31 distinct views succeeded (87%).
- **The port collision caused 5 of the 8 failed attempts:** igdm ×2 (labeled on retry), ikuyo ×2 and allsky. A rebuild run was using the same app ports at the same time.
- **Other failures:**
  - `riff--playlist-detail` timed out on its screenshot for the second round in a row, so it is now skipped.
  - `oksskolten--article-reader` was flagged once after a rater's page script errored, then labeled on retry.
- **Degraded or thin views:**
  - `immersive--roleplay-chat` was captured mid-stream, and its consensus label has 0 patterns.
  - `drawphone--archive` has 1 pattern and `oksskolten--article-reader` has 2.
  - `ribbon` shows a "Loading data from permalink" banner over its rendered data.
- **Failed plus degraded: 9 of 35 attempts (26%),** up from 21%.

## 4. Domain coverage and realism
- **Domains:**
  - Repo filled reference-docs with devterms. 18 of the 19 domains in the frame now have labeled views.
  - Nonprofit is still empty, although the frame has 15 views for it (frontend, rapid, agoracosmica).
  - This round leaned on travel: 6 of 27 views (trek, betterbahn, jetlog).
- **Repo data looks like real use:**
  - jetlog: 223 flights to 40 airports, 456,654 km.
  - type-pal: 294 scenes and 181 pending items.
  - mirotalk: polls that list voters by name.
  - ribbon: real gene loci.
  - aladin-lite: real survey imagery and catalogues.
  - igdm: dated group threads.
- **Toy apps and near-duplicates:**
  - Toy views: `drawphone--archive` and `floe--home-send` (a dropzone splash screen).
  - `betterbahn--home-search` ≈ `privacy-protect--conceal-form` (0.80).
  - The two mini-macau views (0.80).
  - `immersive--roleplay-chat` ≈ `voxel-musou--title-menu` (1.0, because both have almost no patterns).
- **genUI:** 19 domains with evenness 0.95. Its fictional data is dense and plausible, but every app is a single screen.

## 5. Cost and throughput
| | gen-002 | repo-001 |
|---|---|---|
| Spend this round | $0 | $9.0 to rebuild this round's 14 apps on Linux |
| Setup spend behind labeled sites | $262 → $2.73/site | $363.8 → $2.13/view (this round's new apps: $84.2, $4.01/view) |
| Linux rebuilds (not counted before) | — | $38.4 across 60 apps |
| All setup spend / labeled | $2.73 | about ($433 + $38) / 171 ≈ $2.75 |
| Yield this round | 0 new | 77% of attempts |

- **Throughput is not the limit:** the second pass labeled 21 views in 24 minutes.
- **Still unrecorded:** USD for exploring and labeling.
- **Supply:**
  - About 195 repo views in the frame have not been attempted yet, though some can't be served yet.
  - More genUI needs a gen-003.

## What changed since the last round
- **Repo:** +27 views, +0 patterns, +1 domain.
- **Round 6's "toward genUI" condition triggered:** fewer than 2 new patterns.
- **Round 6's "high confidence for GitHub" condition on `styles.json` was met.**
- **Yield fell from 82% to 77%,** and the port bug is still unfixed.
- **Round 6's recommendations:**
  - Done: oksskolten and igdm were labeled (their ports were freed, but the bug was not fixed), and reference-docs views arrived.
  - Not done: fake media devices, the readiness gate, near-duplicate skipping, the codebook review, nonprofit views and USD recording.

## What would change the verdict
- **Toward genUI:**
  - A 25-site gen-003, using other generator models or a prompt that varies style, gets warm off-white pages under 40% and an effective number of 8 or more primary font families.
  - Or repo again adds fewer than 2 patterns, with no new proposals backed by several raters.
  - Or repo failed plus degraded stays above 25%.
- **To high confidence for GitHub:**
  - Yield reaches 90% or more once the port collision is fixed.
  - Nonprofit views are labeled.
  - A codebook review accepts at least 2 repo-sourced entries, which would show the plateau was the codebook's limit.

## Recommendations for the next round
1. **Fix the port collision.** Stop running rebuilds alongside labeling, or give each run its own port range. Then relabel ikuyo ×2 and allsky.
2. **Domains:**
   - Label the first views of frontend, rapid and agoracosmica (nonprofit).
   - Cap travel at 3 views.
3. **Add a thin-view gate and a near-duplicate skip:**
   - Retake views whose consensus has 2 or fewer patterns, or that show a live stream (`immersive--roleplay-chat`, `drawphone--archive`).
   - Skip a second view whose Jaccard similarity to a labeled sibling is 0.8 or more (`mini-macau--city-layers`).
4. **Add the §1 measurements to `site-variety.ts`:** the effective number of primary font families, the warm-page share, and a dark share computed from `backgroundsByArea` rather than the root background.
5. **Review the codebook between batches,** keeping 1.0.0 frozen for repo-001:
   - Accept `scene-editor-3d`, the new `map-explorer` values, toast `top-centre` and feed `uniform-grid`.
   - Merge the three date-picker ids into one.
   - Consider `poll`, `status-bar` and `simulation-time-control`.
6. **Record USD for exploring and labeling.** If you run a gen-003, keep it to 25 sites and score it against the table in §1.

---
_Evaluator: claude-opus-5-5, effort xhigh (served by: claude-opus-5-5); gen-002 96 labeled, repo-001 171 labeled; 2026-11-18; cost $6.69 equivalent._
