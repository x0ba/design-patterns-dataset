# Round 5: genUI vs GitHub

**Verdict:** GitHub — gen-002 added nothing this round and its look is still one template, while 28 new repo views added the commerce domain and two codebook entries neither source had, and repo reliability now matches genUI's.
**Confidence:** low

**Basis:**
- **genUI:** 96 gen-002 sites. That is all of gen-002, unchanged since round 4.
- **GitHub:** 116 repo-001 views from 45 apps; this round added 28.
  - 23 of the 28 come from 8 new apps: kresus, dumbbudget, all-set-tw, shopnex, next-ecommerce-shopco, minshop, flocafe and podgrab.
  - Repo views cluster at 2.6 per app, so the effective repo sample is smaller than 116.

## 1. Visual variety and the "vibecoded" look
I looked at 10 new repo viewports and 8 gen viewports.

- **genUI is polished and dense, but it is still one template.** The 8 sites: `storefront-lettering-layout`, `private-container-registry`, `water-association-meter-readings`, `fab-lab-material-commit`, `hospital-lobby-wayfinding-kiosk`, `music-school-term-enrollment`, `smoke-week-sensor-replay`, `home-automation-flow-editor`.
  - 4 of 8 use a deep teal or navy as the main color, and 5 of 8 have a cream or off-white page.
  - 6 of 8 have a right-hand summary or "needs review" column.
  - Most have amber warning callouts, and 3 of 8 show a countdown ("4 days left", "9h 20m left", "3 d 1 h 19 min").
  - Only the storefront brush-script canvas and smoke-week's serif headings step outside this.
- **The repo screenshots show distinct design languages:**
  - Podgrab looks like a 2010s Skeleton CSS site: centered title, tracked uppercase nav, square black icon buttons.
  - Kresus is a Bootstrap / Font Awesome ledger with striped rows.
  - minshop is editorial: serif wordmark and heading, tracked caps, monospace order IDs.
  - Shop.co has a heavy display wordmark, product photos and star ratings.
  - all-set-tw is in Traditional Chinese on a dark slate rail.
  - kepler-gl is a dark map with additive blending.
  - Only flocafe and shopnex look like shadcn-style defaults.
- **The categorical labels miss these differences.**
  - On consensus, 22 of 28 new views are soft, thin and solid (79%, against 53% in round 4). All 28 are solid; 27 are thin.
  - Repo evenness fell on borders (0.54→0.48) and background (0.56→0.47), and held on shape (0.56) and whitespace (0.77). genUI is at 0.00, 0.14, 0.08 and 0.39 on the same fields.
  - Podgrab and Kresus get genUI's aesthetic labels. What sets them apart is typeface and color, which are not IRR fields.
- **New near-duplicates:** `kepler-gl--data-table` matches `--map-workspace` (0.83) and `--layer-config` (0.82).

## 2. Pattern coverage
| | gen (n=96, 96 apps) | repo (n=116, 45 apps) |
|---|---|---|
| Distinct patterns present | 86 (72%) | 76 (64%) |
| At n=96 (interpolated) | 86 | ~73 |
| Present per site | 11.1 | 7.7 (this round 7.8) |
| Mean pairwise Jaccard distance | 0.73 | 0.84 |
| Only in this source | 21 (was 23) | 11 (was 9) |
| New patterns this round | 0 | +4 from 28 views |

- **Repo's 4 new patterns:**
  - checkout (`flocafe--pos-register`, `next-ecommerce-shopco--cart`)
  - playlist-queue (`podgrab--player`)
  - rating and product-configurator (`next-ecommerce-shopco--shop-catalog` / `--product-detail`). These two were in neither source before.
- **Combined coverage:** 97 of 119 entries; 22 appear in neither source.
- **Most of the commerce gain came from one app.** Shop.co supplied 3 of the 4 new patterns. The other commerce apps (shopnex, minshop, flocafe) are admin views that repeat dashboard, data-table and stat-tile.
- **Proposals:**
  - All three raters proposed `quantity-stepper` (the "− 2 +" pill on `next-ecommerce-shopco--cart`). It is the same control as gen-002's single-rater `number-stepper` (`fab-lab-material-commit`), so it confirms a gap rather than finding a new one.
  - Raters also proposed new filter-controls values from dumbbudget, minshop and podgrab. Two pairs are near-duplicates: on-summary-tiles / embedded-in-summary-tiles, and inline-select-bar / inline-dropdown-bar.

## 3. Label reliability
| Field | gen α (unchanged) | repo α (Δ from r4) |
|---|---|---|
| Pattern status | 0.698 | 0.699 (+.007) |
| Confidence | 0.868 | 0.863 (+.002) |
| density | 0.909 | 0.822 (−.022) |
| elevation | 0.777 | 0.831 (+.005) |
| shape | 0.594* | 0.841 (+.004) |
| whitespace | 0.835 | 0.830 (+.006) |
| iconStyle | 0.881 | 0.869 (+.040) |
| borders | n/a* | 0.941 (+.006) |
| backgroundTreatment | 0.873 | 0.978 (+.001) |
| dims (extra) | 0.921 | 0.927 (+.005) |

\*Prevalence effect: 95 of 96 gen sites are soft, and all 96 are thin.

- **Overall:** repo α rose on 9 of 10 fields and now equals genUI on pattern status.
- **Per-site agreement:** new repo views average 0.891. The lowest:
  - `kresus--transactions` 0.767
  - `kepler-gl--data-table` 0.778
  - `kresus--budget` 0.788
  - `shopnex--order-detail` 0.792
- **Disagreement hot spots:**
  - contextual-help: 0.24 in repo and 0.23 in gen, for the 5th round running.
  - Repo: popover 0.06, coordinated-views 0.21, drag-reorder 0.28.
  - gen: toast −0.11, drawer −0.03.
  - Repo toast rose to 0.75 and playlist-queue to 0.47.
- **Repo captures: 28 labeled from 38 attempts (74%, up from 61%).**
  - 9 failed on "port already in use" again: svelte-commerce, vidbee and feishin, 3 views each.
  - `privacy-protect--reveal-message` failed a third time, although views are supposed to be skipped after two failures.
  - 2 were labeled but are degraded:
    - `shopnex--order-detail` was captured on a loading skeleton; consensus is only app-shell and progress-indicator.
    - `kepler-gl--data-table` never opened its table.
  - Failed plus degraded: 12 of 38 (32%), down from 48%.

## 4. Domain coverage and realism
- **genUI:** 19 named domains, evenness 0.95, unchanged.
- **GitHub:**
  - Commerce arrived with 12 views from 4 apps.
  - Social-community, nonprofit and reference-docs are still empty, and raters coded no view as education.
  - 20 of the 28 new views are commerce or finance. developer-tools fell to 14% (16 of 116).
- **Realism still favors repos:**
  - flocafe has about 1,000 orders over 150 days, 47 products and an open cash shift.
  - minshop's order numbers run to #244.
  - kresus has accounts at several banks, including a −€171k mortgage.
  - all-set-tw shows a one-year NT$ net-worth series.
  - gen data is just as specific, but each app is staged around one moment.

## 5. Cost and throughput
| | gen-002 | repo-001 |
|---|---|---|
| New source spend this round | $0 (no briefs left) | $0 (all setups ran before round 4) |
| Spend on the sources behind labeled sites | $262 → $2.73/site | $197.9 → $1.71/view |
| All spend to date per labeled site | $2.73 | ~$439 / 116 = $3.78 (round 4: $4.99) |
| Yield this round | 0 new | 28 of 38 attempts |

- **Setups wasted by the port bug: $22.2** (svelte-commerce $13.45, feishin $4.37, vidbee $4.35).
- **Supply:** about 265 repo views are left in the site list. More genUI needs a new batch; in round 4 that cost about $0.78/site with Haiku and $5.07 with Opus.
- **Still unrecorded:** USD for exploring and labeling.

## What changed since the last round
- **genUI added nothing.** Each round now compares a fixed gen set with a growing repo set.
- **GitHub gained:**
  - 8 apps, 1 domain and 4 patterns, 2 of them new to the dataset.
  - α up on 9 of 10 fields.
  - Capture yield up from 61% to 74%.
- **GitHub lost ground on look:** new repo views returned to genUI's categorical profile (79% soft/thin/solid, against 53% in round 4).
- **Round 4's conditions:**
  - **Toward genUI:**
    - "Failed plus degraded stays at 20% or more" was met (32%), but the fixes it assumed were never made.
    - "Fewer than 2 new patterns and no new-entry proposals" was not met.
  - **Firmer for GitHub:**
    - The pattern target was met (4).
    - The domain target was not: 1 domain instead of 2.
    - The coverage gap at equal n is still about 13 patterns, not 6.
    - Failed plus degraded is 32%, not 15% or less.
- **Round 4's recommendations:** only "go into commerce" was done. The port fix, readiness gate, skip list, other empty domains, styles.json comparison and USD recording were not.

## What would change the verdict
- **Toward genUI:**
  - A small gen-003 reaches shape or borders evenness of 0.4 or more, or covers at least 3 of the 22 missing entries per 25 sites.
  - After the port fix and readiness gate, repo failed plus degraded captures stay at 20% or more.
  - The next 25 repo views add fewer than 2 new patterns.
  - A styles.json comparison shows repo typefaces and palettes vary no more than genUI's.
- **Firmer for GitHub:**
  - Social-community, nonprofit, reference-docs or education views add at least 2 domains and 3 new patterns.
  - styles.json shows clearly wider repo variety in typefaces and palettes.
  - Failed plus degraded captures fall to 15% or less.

## Recommendations for the next round
1. **Fix the port collision.** It caused 9 of this round's 10 failures, and blocked kresus, dumbbudget and svelte-commerce in round 4 too. Stop any process on the app's port before starting it, or give each run its own port. Then label svelte-commerce, vidbee and feishin first.
2. **Add a readiness gate.**
   - Wait for skeletons and spinners to clear.
   - Require at least 0.75 text similarity to the saved view, and refuse the capture otherwise.
   - Relabel `shopnex--order-detail`, `kepler-gl--data-table` and round 4's four degraded sites.
3. **Enforce the skip rules.** Drop `privacy-protect--reveal-message`, and skip any view at least 0.8 similar to one already labeled.
4. **Go breadth-first into the empty domains:** social-community, nonprofit, reference-docs and education. Cap commerce, finance and developer-tools.
5. **Measure the look with styles.json:** font families, palette spread and corner radii. The IRR fields can't tell Podgrab or Kresus from a genUI app.
6. **Codebook review:**
   - Merge `quantity-stepper` and `number-stepper` into one entry and accept it.
   - Merge the duplicate filter-controls values.
   - Rewrite the definitions of contextual-help and the overlay patterns.
7. **If you generate a gen-003:** keep it small, use Haiku, remove deadlines from the briefs, and aim it at the 22 entries neither source has.
8. **Record USD for exploring and labeling.**

---
_Evaluator: claude-opus-5-5, effort xhigh (served by: claude-opus-5-5); gen-002 96 labeled, repo-001 116 labeled; 2026-11-17; cost $4.67 equivalent._
