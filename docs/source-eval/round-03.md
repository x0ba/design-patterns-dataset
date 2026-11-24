# Round 3: genUI vs GitHub

**Verdict:** too close to call — genUI now leads on pattern coverage, domain breadth, reliability and yield, while GitHub is still the only source of looks that aren't model defaults, and its new server-mode views are converging on genUI's categorical aesthetic profile.
**Confidence:** low

**Basis:** 75 gen-002 sites against 69 repo-001 views from 34 apps (23 static, 11 server-mode). Round 3 added 25 gen sites and 24 repo views. Of the repo views, 20 came from 9 newly served server apps (edgeever, altero, maildev, firecamp, tokentracker, otelbin, dbdesigner-id, leon, catai); the other 4 were extra views of old apps.

## 1. Visual variety and the "vibecoded" look
I viewed 8 new gen and 9 new repo screenshots.

- **genUI is still one template.**
  - Consensus aesthetics: soft 74/75, thin 75/75, solid 73/75.
  - The screenshots share a cream page, a forest or teal accent and a serif display face (`herbarium-lobby-kiosk`, `invitation-order-guest-details`, `state-filming-location-search`).
  - 7 of the 8 are built around a countdown:
    - `candidate-filing-intake`: "3 d 1 h 7 m remaining"
    - `esports-scrim-replay-review`: "in 2h 20m"
    - `craft-market-booth-layout`: "18 days to market day"
    - `hospital-lobby-wayfinding-kiosk`: "9 min to spare"
    - `invitation-order-guest-details`: "17 days left"
    - `state-filming-location-search`: "due today, 5:00 PM"
    - `studio-electric-demand-alerts`: a 4:30 pm deadline
  - 18 of the 25 new sites have a `banner`.
  - The only departures are `esports` (dark, dense) and `craft-market`, the first gen site that isn't soft (mixed shape, tight whitespace).
- **GitHub's server-mode views look human-made, but the labels can't show it.**
  - The screenshots show distinct idioms: an Office ribbon (`dbdesigner-id`), a Zotero-style library (`altero--library`), a chat over an illustrated night scene (`leon--session-feed`), and a dark IDE with a pipeline graph (`otelbin`).
  - `tokentracker--dashboard` and `catai` do look AI-styled.
  - Yet 20 of the 25 server-mode views are soft, thin and solid on consensus, close to genUI's 72/75.
- **Evenness (repo / gen):**
  - shape 0.55 / 0.10, borders 0.52 / 0.00, background 0.58 / 0.18, whitespace 0.74 / 0.37.
  - Repo fell from 0.61 / 0.68 / 0.57 / 0.79. What spread is left comes from the static apps.
- **Pattern-set distance:** mean Jaccard distance is 0.84 for repo and 0.73 for gen. The repo figure is inflated by 7 views with 2 or fewer patterns.
- **First cross-app near-duplicate:** `firecamp--graphql-playground` ~ `apiark--request-editor` (0.82).

## 2. Pattern coverage
| | gen (n=75) | repo (n=69) |
|---|---|---|
| Distinct present | 82 (69%) | 70 (59%) |
| At n=69 (interpolated) | ~81 | 70 |
| Present per site | 11.1 | 7.7 (server 9.1, static 6.9) |
| Only in this source | 23 | 11 |
| New patterns this round | +5 from 25 sites | +5 from 24 views |
| New-entry proposal ids this round | 6 | 2 |

- **gen's new patterns:** seat-map (`campsite-search-and-compare`), reactions (`family-news-story-messaging`) and spreadsheet (`shared-cash-forecast-workbook`). It also picked up map-explorer and bulk-actions, which were repo-only.
- **Repo's new patterns are generic:** sharing-permissions and inline-edit (both previously gen-only), plus confirmation, suggestion-chips and popover. Repo's long tail (code-editor, file-manager, object-viewer-3d, pivot-table) all dates from rounds 1–2.
- **Saturation:** both sources fell from about 0.7 to about 0.2 new patterns per site. Together they cover 93 of the codebook's 119 entries.
- **Proposals:**
  - Repo: `mind-map-editor` (edgeever) and `ribbon-toolbar` (dbdesigner-id), 1 rater each.
  - gen: `turn-by-turn-directions`, two more floor-plan ids and `staged-changes`.
  - gen also filed `requirements-checklist` and `commit-readiness-checklist`, the 4th and 5th ids for the same pre-commit validation panel. That is a generator habit, not variety.

## 3. Label reliability
| Field | gen α (Δ from r2) | repo α (Δ from r2) |
|---|---|---|
| Pattern status | 0.685 (+.007) | 0.698 (−.012) |
| Confidence | 0.862 | 0.866 |
| density | 0.909 | 0.840 (−.027) |
| elevation | 0.782 | 0.807 |
| shape | 0.747* | 0.800 (−.083) |
| whitespace | 0.888 (+.087) | 0.808 (−.028) |
| iconStyle | 0.881 | 0.793 (−.038) |
| borders | n/a* | 0.913 |
| backgroundTreatment | 0.796 | 0.971 (−.029) |
| dims (extra) | 0.926 | 0.917 |

\*Only one gen site is not soft, and no gen site varies on borders.

- **Overall:** mean per-site agreement is 0.880 for gen and 0.872 for repo. Among this round's sites alone it is 0.888 against 0.854.
- **Disagreement hot spots:**
  - contextual-help scores 0.28 in both sources, for the third round running.
  - Overlay patterns are unreliable in both: gen toast −0.22, drawer −0.03, modal-dialog 0.24; repo popover −0.01.
  - Repo menu (0.40 → 0.56) and split-pane (0.42 → 0.57) improved.
- **Repo capture problems: 24 labeled from 31 attempts (77%).**
  - Four failures were retries that should have been skipped: datadex, flight-path, solar-wanderer help-overlay, and toothpaste (refused again).
  - Three were new:
    - Both maildev email views: the replay can't find the seeded email.
    - `privacy-protect--reveal-message`: screenshot error.
  - Three views were labeled but are degraded:
    - `otelbin--workspace` was captured under a first-run "Welcome to OTelBin" modal. Its agreement, 0.733, is the lowest of the round.
    - `dbdesigner-id--erd-canvas` shows the start page, not the ERD (2 patterns).
    - `voxel-musou--title-menu` now loads but has 0 present patterns.
- **genUI:** 25/25 labeled. The minimum is `herbarium-lobby-kiosk` with 3 patterns.

## 4. Domain coverage and realism
- **genUI:** all 19 named domains are covered; social-community arrived with `family-news-story-messaging`. Education (11) and government-civic (10) make up 28% of sites.
- **GitHub:** still 13 named domains. This round's views went to developer-tools (+8, now 12), productivity (+5, now 10) and ai-tools (+4, now 6).
  - Finance, commerce, education, social-community, nonprofit and reference-docs are still empty.
  - Yet kresus, myfin, dumbbudget, invio and svelte-commerce are already rebuilt on Linux and waiting.
- **Realism still favors repos.** Firecamp has about 125 requests across 6 workspaces behind a stubbed cloud API, and altero's library holds plausible citations. Edgeever, though, shows its own demo notebook, with every note dated the same day.
  - gen data is dense, but each app is one staged scene.

## 5. Cost and throughput
| | gen-002 | repo-001 |
|---|---|---|
| Spend on the sources behind labeled sites | $193.9 → $2.59/site | $155.9 → $2.26/view (setup $149.3 + Linux rebuilds $6.6) |
| This round | $69.9 → $2.80/site | $55.4 → $2.31/view ($2.77 per new server view) |
| All spend to date per labeled site | $262 / 75 = $3.49 | $439 / 69 = $6.36 |
| Failures this round | 0 of 25 | 7 of 31, plus 3 degraded |

- **gen by generator this round:** Haiku $0.75/site for 9.1 patterns, Sonnet $2.84 for 11.6, Opus $5.05 for 12.5.
- **Linux rebuilds:** 17 of 17 succeeded, at a mean of $0.63.
- **Supply:** gen-002 has only 21 sites left, enough for one round. repo-001 has 312 queued views.
- **Still unrecorded:** explore and labeling sessions still don't record USD.

## What changed since the last round
- Server mode now works at scale: 9 new apps and 20 views, with no rebuild failures.
- Round 2's "toward genUI" conditions were partly met. 20 of 25 server-mode views carry genUI's soft/thin/solid profile, and repo's new-pattern yield is 0.21 per view.
- None of round 2's "firmer for GitHub" conditions were met: no new domains, and fewer proposals than gen this round.
- Repo α fell on 7 of 10 fields; gen held or rose.
- The overlap between sources grew: gen-only fell from 25 to 23 patterns and repo-only from 13 to 11.
- Breadth-first picking was not kept. edgeever, altero and firecamp got 3 views each, while the rebuilt finance and commerce apps got none.

## What would change the verdict
- **Toward GitHub:**
  - Round 4's finance and commerce repos add at least 3 named domains and 5 new patterns, with evenness staying at or above 0.5.
  - A finer style measure separates server-mode repos from gen. That could be background luminance, accent hue and display-typeface share, taken from `styles.json`.
  - Failed plus degraded captures fall to 10% or less.
- **Toward genUI:**
  - New server-mode views stay above 80% soft/thin/solid and add fewer than 0.2 new patterns per view.
  - Failed plus degraded repo captures stay at 20% or more.

## Recommendations for the next round
1. **Label the rebuilt apps first, one view each:** kresus, myfin, dumbbudget, invio, svelte-commerce and fiftyone. Enforce breadth-first picking, and skip any view that is at least 0.8 similar to one already labeled.
2. **Capture fidelity:**
   - Dismiss first-run modals with a prelude step or seeded storage (otelbin).
   - Reject a capture whose text doesn't match its saved view, using the `save_view` check, instead of labeling it (dbdesigner-id).
   - Make maildev's seed deterministic.
   - Put datadex, flight-path, solar-wanderer help-overlay and `toothpaste--script-editor` on the skip list.
3. **Measure the vibecoded look more finely.** Compare style statistics, because the six categorical fields can no longer tell server-mode repos from gen.
4. **genUI:** gen-002 runs out after round 4. If you generate a gen-003:
   - Write briefs without countdowns.
   - Prefer Haiku or Sonnet.
   - Use gen aesthetics only as the vibecoded baseline.
5. **Codebook review:**
   - Merge the 5 checklist ids and the 3 floor-plan ids.
   - Review `mind-map-editor`, `ribbon-toolbar` and `timed-text-sync-editor`.
   - Rewrite the definitions of contextual-help and of the overlay patterns (popover, drawer, modal-dialog, toast).
6. **Record USD for explore and labeling** (asked for in every round so far).

---
_Evaluator: claude-opus-5-5, effort xhigh (served by: claude-opus-5-5); gen-002 75 labeled, repo-001 69 labeled; 2026-11-17; cost $5.35 equivalent._
