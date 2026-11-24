# Round 6: genUI vs GitHub

**Verdict:** GitHub — gen-002 is still frozen at 96 sites. This round's 28 repo views opened two empty domains (social-community and education) and added 5 patterns, including the first `video-call` in the dataset. Capture yield rose to 82%, and reliability is unchanged.
**Confidence:** medium. I raised it from low because GitHub met round 5's "firmer for GitHub" condition on domains and patterns. The look advantage still rests on screenshots, not measurement.

**Basis:**
- **genUI:** 96 gen-002 sites from 96 apps, unchanged since round 4.
- **GitHub:** 144 repo-001 views from 62 apps (2.3 views per app). This round added 28 views:
  - 2 each from vidbee and feishin, which the port bug blocked in round 5.
  - 24 from 15 new apps, among them phanpy, selfoss, fluent-reader, fusion, qmreader, mirotalk, riff, nutritrace, subminer, speechgpt and zestsend.

## 1. Visual variety and the "vibecoded" look
I looked at 8 gen and 14 new repo viewports.

- **genUI is still one template.** The 8 sites: `family-news-story-messaging`, `community-paper-archive-site`, `repertory-film-screening-alerts`, `dietitian-ai-meal-planning`, `family-road-trip-audiobooks`, `interest-community-wayfinding`, `community-radio-volunteer-messages`, `lunar-surface-explorer`.
  - 6 of 8 are three-column layouts with a right-hand context pane.
  - 5 of 8 have a cream page, and 4 use deep green or teal as the main color.
  - 4 have amber or red "waiting on you" / "needs your answer" callouts.
  - Urgency timers recur: "Arriving in 4:19:57", "Send by … 3 days", "Waiting 3d".
  - Only the Millrace Gazette's newspaper serif breaks the template.
- **The repo views have their own design languages:**
  - selfoss: dark teal rail with saturated tag pills.
  - mirotalk: dark glass modal over a grid of avatar tiles.
  - zestsend: full-bleed smoke image, a particle wordmark and underline-only digit boxes.
  - fluent-reader: Windows Fluent chrome with window controls.
  - qmreader: bilingual Chinese/English with a serif reading column.
  - subminer: navy with pastel monospace numerals and an activity heatmap.
  - riff: dark three-pane player with generative album art.
  - video-call-app-nodejs: bare Bootstrap teal.
  - Only `immersive-language-learning…--mission-selector` (cream, serif, soft cards) looks like genUI.
- **The categorical labels still flatten these differences.** Of the 28 new views, 23 are soft, 21 thin and 22 solid.
  - Repo evenness moved on borders (0.48→0.56), background (0.47→0.42), shape (0.56, unchanged) and whitespace (0.77→0.75).
  - genUI is at 0.00, 0.14, 0.08 and 0.39 on the same fields.
- **New near-duplicates (Jaccard 1.0):** fluent-reader `--all-articles-cards` / `--magazine-view`, and selfoss `--newest-stream` / `--article-expanded`.

## 2. Pattern coverage
| | gen (n=96, 96 apps) | repo (n=144, 62 apps) |
|---|---|---|
| Distinct patterns present | 86 (72%) | 81 (68%), was 76 |
| At n=96 (interpolated) | 86 | ~73 |
| Present per site | 11.1 | 7.6 overall (7.3 this round) |
| Mean pairwise Jaccard distance | 0.73 | 0.84 |
| Only in this source | 17 (was 21) | 12 (was 11) |

- **Repo's 5 new patterns:**
  - `video-call` (`mirotalk--room-settings`, `video-call-app-nodejs--call-with-chat`), which neither source had before.
  - `chat-thread`, `reactions` and `notification-center` (phanpy, video-call-app-nodejs).
  - `reader` (fusion, qmreader). Repo raters agree on it perfectly (α 1.00), against 0.02 in gen.
- **Combined coverage:** 98 of 119 entries; 21 appear in neither source.
- **Per app, the sources are now close:** 81 patterns from 62 repo apps against 86 from 96 gen apps.
- **Proposals:** 5 new-values and no new-entry proposals.
  - Three have support from several raters:
    - toast `top-centre` (3 of 3 raters, mirotalk).
    - date-picker per-day metric (3 of 3 raters, nutritrace). The raters filed it under three near-identical ids.
    - feed `uniform-grid` (vidbee and fluent-reader).
  - Two come from a single rater: text-field `segmented-code` (zestsend) and view-switcher `cycle-button` (feishin).

## 3. Label reliability
| Field | gen α | repo α (Δ from round 5) |
|---|---|---|
| Pattern status | 0.698 | 0.692 (−.007) |
| Confidence | 0.868 | 0.859 (−.004) |
| density | 0.909 | 0.816 (−.006) |
| elevation | 0.777 | 0.829 (−.002) |
| shape | 0.594* | 0.842 (+.001) |
| whitespace | 0.835 | 0.857 (+.027) |
| iconStyle | 0.881 | 0.865 (−.004) |
| borders | n/a* | 0.924 (−.017) |
| backgroundTreatment | 0.873 | 0.966 (−.012) |
| dims (extra) | 0.921 | 0.930 (+.003) |

\*Prevalence effect: 95 of 96 gen sites are soft, and all 96 are thin.

- **Per-site agreement:** new views average 0.871 (0.891 in round 5). The lowest:
  - `qmreader--reader-workspace` 0.739
  - `yomininja--home` 0.754
  - `vidbee--downloads-home` 0.758
  - `nutritrace--diary` 0.773
- **Disagreement hot spots:**
  - Repo: slider is new to the list at 0.09 (19 units, from the media players' scrubbers). Popover is 0.15 and contextual-help 0.20, its 6th round under 0.25.
  - gen: toast −0.11, drawer −0.03, reader 0.02.
- **Repo captures: 28 labeled from 34 attempts (82%, up from 74%).**
  - 4 failures were the port collision again: oksskolten ×2 and igdm ×2, both social or news apps.
  - The other 2: `mirotalk--meeting-grid` (step timeout) and `riff--playlist-detail` (screenshot timeout).
  - **Degraded:** `video-call-app-nodejs--call-with-chat` has an empty white video stage, because there is no camera in the sandbox.
  - **Thin:** `--create-room` (a 2-field form) and `zestsend--home` (a splash screen) have 2 patterns each.
  - **Seed artifacts:** phanpy repeats the same post at the top of the feed, and selfoss shows "0 min read" on every item.
  - Failed plus degraded: 7 of 34 (21%), down from 32%.
- **genUI is not clean either:** `lunar-surface-explorer` was captured on its "Charting the Moon's surface…" loader.

## 4. Domain coverage and realism
- **GitHub filled two empty domains:** social-community (3 views) and education (2). Nonprofit and reference-docs are still empty.
- **This round leaned on one domain:** 8 of the 28 views are news-publishing (RSS readers).
- **genUI:** 19 named domains, evenness 0.95, unchanged.
- **Repo data looks like real use:**
  - selfoss: 296 items, 63 unread.
  - fluent-reader: 93 articles across about 25 named feeds, with Hacker News items in their real RSS format.
  - subminer: 191 sessions and 79.4 h over 136 active days.
  - nutritrace: a week of meals logged under real brand names.
- **Toy apps:** 4 of the 28 views have 3 or fewer patterns (video-call-app-nodejs ×2, zestsend--home, immersive).

## 5. Cost and throughput
| | gen-002 | repo-001 |
|---|---|---|
| New source spend this round | $0 | $0 (existing setups) |
| Setup spend behind labeled sites | $262 → $2.73/site | $279.6 → $1.94/view (this round's apps: $81.7, $2.92/view) |
| All setup spend / labeled | $2.73 | ~$433 (93 setups) / 144 = $3.00 (round 5: $3.78) |
| Yield this round | 0 new | 28 of 34 attempts |

- **Setups idled by the port bug:**
  - oksskolten ($14.17) and igdm ($4.28) this round.
  - svelte-commerce ($13.45) now sits behind the two-failure skip rule.
- **Supply:** about 220 usable repo views remain. More genUI needs a gen-003.
- **Still unrecorded:** USD for exploring and labeling.

## What changed since the last round
- **GitHub met round 5's "firmer" condition:** at least 2 domains and at least 3 new patterns (it added 2 and 5).
- **Not met:** failed plus degraded is 21%, above the 15% target.
- **No "toward genUI" condition triggered:**
  - The new patterns (5) beat the "fewer than 2" threshold.
  - No gen-003 was generated.
  - No styles.json comparison was run.
- **The coverage gap at unequal n narrowed from 10 to 5.**
- **Round 5's recommendations:** only "go breadth-first into empty domains" was done. The port fix, readiness gate, near-duplicate skip, codebook review, styles.json measurement and USD recording were not.

## What would change the verdict
- **Toward genUI:**
  - A small gen-003 reaches shape or borders evenness of 0.4 or more, or covers at least 3 of the 21 missing entries per 25 sites.
  - styles.json shows repo typefaces and palettes vary no more than genUI's.
  - The next 25 repo views add fewer than 2 patterns, or near-duplicates and toy views grow beyond this round's 6 of 28.
- **To high confidence for GitHub:**
  - styles.json confirms wider repo variety.
  - Nonprofit or reference-docs views arrive.
  - Failed plus degraded falls to 15% or less after the port fix.

## Recommendations for the next round
1. **Fix the port collision.** It caused 4 of this round's 6 failures. Exempt infrastructure failures from the skip rule, then label oksskolten, igdm and svelte-commerce.
2. **Fake media devices in capture** (`--use-fake-device-for-media-stream`) so video-call views show tiles.
3. **Add a readiness gate for both sources.** Wait for loaders to clear (`lunar-surface-explorer`, `shopnex--order-detail`).
4. **Skip near-duplicate views.** Skip a second view whose Jaccard similarity to a labeled sibling is 0.8 or more, and prefer a new app over a second view.
5. **Domains:**
   - Go next for nonprofit, reference-docs and government-civic.
   - Cap news-publishing.
6. **Measure the look with styles.json:** font families, palette spread and corner radii.
7. **Codebook review:**
   - Merge the three date-picker ids into one.
   - Accept toast `top-centre` and feed `uniform-grid`.
   - Merge `quantity-stepper` with `number-stepper`.
   - Clarify slider vs. media scrubber, and contextual-help.
8. **Record USD for exploring and labeling.** Keep any gen-003 small, on Haiku, and aimed at the 21 entries neither source has.

---
_Evaluator: claude-opus-5-5, effort xhigh (served by: claude-opus-5-5); gen-002 96 labeled, repo-001 144 labeled; 2026-11-17; cost $4.17 equivalent._
