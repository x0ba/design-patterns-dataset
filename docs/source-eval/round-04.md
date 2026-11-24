# Round 4: genUI vs GitHub

**Verdict:** GitHub — genUI still has more patterns per site and more reliable captures, but gen-002 is used up and its look is still one template, while this round's repo views moved away from that template and supplied every new codebook entry.
**Confidence:** low

**Basis:** 96 gen-002 sites (all of gen-002; this round added 21) against 88 repo-001 views from 37 apps. This round added 19 repo views:
- 8 from three newly served apps (fiftyone, invio, myfin).
- 11 that are extra views of apps labeled before.

## 1. Visual variety and the "vibecoded" look
I looked at 9 new gen and 9 new repo screenshots, plus 2 full-page captures.

- **genUI is still one template.**
  - Consensus labels: soft 95/96, thin 96/96, solid 93/96. All 21 new sites are soft and thin.
  - 6 of the 9 gen screenshots are built around a countdown:
    - `speech-dataset-review-space`: "35:49 left of 60 min"
    - `family-road-trip-audiobooks`: "Arriving in 4:19:57"
    - `line-side-work-instructions`: "6 h 06 min left"
    - `jobs-report-chart-production`: "1 d 2 h 37 m left"
    - `restaurant-tip-pool-onboarding`: "about 22 hours from now"
    - `brand-identity-ai-delegation`: "2 d 16 h left"
  - Most also have a "Needs you" or "N to do" gate, e.g. `chess-tournament-director-helper` ("3 to do").
  - The cream page with a forest-green accent is still common (chess, family-road-trip, restaurant).
  - Three dark sites (speech, line-side, lunar) are the most distinctive gen work so far, but the labels can't tell them apart from the rest.
- **GitHub's new views moved away from genUI's profile.**
  - Only 10 of 19 new views are soft, thin and solid on consensus. In round 3 it was 20 of 25 server views.
  - The departures:
    - Sharp Office ribbon: `dbdesigner-id--table-detail-drawer`
    - Mixed shape and tight spacing in a dark photo grid with bounding boxes: `fiftyone--model-evaluation`
    - Borderless dark Material dashboard: `myfin--dashboard`
    - Image backgrounds: `leon--search-sessions`, `solar-wanderer--guided-tour`
    - Texture: `otelbin--share-popover`
  - Only `tokentracker--limits` looks AI-styled.
- **Evenness (repo / gen):** shape 0.54 / 0.08, borders 0.54 / 0.00, background 0.56 / 0.14, whitespace 0.76 / 0.39. Repo held its round-3 values.
- **Near-duplicates:** two of this round's views are near-duplicates of earlier views of the same app:
  - `catai--settings-builtin-apis` ~ `catai--settings-model` (0.9)
  - `solar-wanderer--guided-tour` ~ `solar-wanderer--explorer-earth` (1.0)

## 2. Pattern coverage
| | gen (n=96) | repo (n=88) |
|---|---|---|
| Distinct patterns present | 86 (72%) | 72 (61%) |
| At n=88 (interpolated) | ~85 | 72 |
| Present per site | 11.1 (this round 11.2) | 7.7 (this round 7.6) |
| Only in this source | 23 | 9 |
| New patterns this round | +4 from 21 sites (0.19 per site) | +2 from 19 views (0.11 per view) |
| New-entry proposals this round | 0 | 3 |

- **gen's new patterns:**
  - generative-variations (`brand-identity-ai-delegation`) and focus-context (`speech-dataset-review-space`).
  - file-upload (`line-side-work-instructions`) and toast (`family-road-trip-audiobooks`). Both were repo-only before; toast's α is −0.11, so that label is fragile.
- **Repo's new patterns:** date-picker (`myfin--dashboard`) and autocomplete (`leon--search-sessions`). Both were already in gen.
- **Combined:** 95 of the 119 codebook entries; 24 appear in neither source.
- **Proposals:**
  - Repo filed three new entries, one rater each:
    - `usage-meter` (`tokentracker--limits`): a common component the codebook lacks.
    - `code-snippet` (`fiftyone--sample-grid`).
    - `space-simulator` (`solar-wanderer--guided-tour`).
  - gen filed only new values for existing patterns (faceted-search, filter-controls, media-player, playlist-queue).

## 3. Label reliability
| Field | gen α (Δ from r3) | repo α (Δ from r3) |
|---|---|---|
| Pattern status | 0.698 (+.013) | 0.692 (−.006) |
| Confidence | 0.868 | 0.861 |
| density | 0.909 | 0.844 |
| elevation | 0.777 | 0.826 (+.019) |
| shape | 0.594* | 0.837 (+.037) |
| whitespace | 0.835 (−.053) | 0.824 (+.016) |
| iconStyle | 0.881 | 0.829 (+.036) |
| borders | n/a* | 0.935 (+.022) |
| backgroundTreatment | 0.873 (+.077) | 0.977 |
| dims (extra) | 0.921 | 0.922 |

\*Only one gen site is not soft, and no gen site varies on borders.

- **Overall:** repo α rose on 8 of 10 fields. Mean per-site agreement for this round's sites is 0.892 for gen and 0.884 for repo. The lowest are `solar-wanderer--guided-tour` (0.683) and `myfin--transactions` (0.762).
- **Disagreement hot spots:**
  - contextual-help: 0.23 in gen and 0.29 in repo, for the 4th round running.
  - Overlay patterns: gen toast −0.11, drawer −0.03, modal-dialog 0.26; repo popover 0.06.
  - Repo slider has α 0.00 despite 94% agreement. That is a prevalence artifact, not real disagreement.
- **Repo capture: 19 labeled from 31 attempts (61%, down from 77%).**
  - 8 failed on a harness bug, "port already in use", for kresus (3), dumbbudget (2) and svelte-commerce (3).
  - 4 more failed:
    - both maildev views, a third time;
    - `privacy-protect--reveal-message`, a screenshot error again;
    - `fiftyone--embeddings-panel`, a step timeout.
  - 3 were labeled but are degraded:
    - `myfin--budget-detail` was captured on a loading spinner, which the raters coded as progress-indicator.
    - `fiftyone--sample-grid` shows "No dataset selected".
    - `dbdesigner-id--table-detail-drawer` shows the start page, as `erd-canvas` did in round 3.
  - `fiftyone--model-evaluation` has a "Shared session · open in 4 tabs" banner, caused by the capture and the raters sharing one server. It was labeled as `banner`.
- **genUI: 21/21 labeled.** But `lunar-surface-explorer` was captured with its map stuck on "Charting the Moon's surface…". It is the first degraded gen capture.

## 4. Domain coverage and realism
- **genUI:** all 19 named domains are covered (evenness 0.95).
- **GitHub:** 15 named domains.
  - Finance arrived with invio (3 views) and myfin (3).
  - Commerce, social-community, nonprofit and reference-docs are still empty, although the site list has 24, 19, 15 and 5 views for them.
  - developer-tools is 16 of 88 views (18%).
- **Realism still favors repos:**
  - invio has 254 invoices across 42 customers.
  - myfin shows six months of savings and a €132k net worth.
  - FiftyOne holds 128 real COCO images with two model runs.
  - gen data is just as specific, but each app is staged around one moment.

## 5. Cost and throughput
| | gen-002 | repo-001 |
|---|---|---|
| Source spend this round | $68.1 → $3.24/site | $15.8 → $0.83/view (fiftyone $3.30, invio $3.63, myfin $8.86) |
| Spend on the sources behind labeled sites | $262 → $2.73/site | $171.7 → $1.95/view |
| All spend to date per labeled site | $262 / 96 = $2.73 | ~$439 / 88 = $4.99 |
| Failures this round | 0 of 21, plus 1 degraded | 12 of 31, plus 3 degraded |

- **gen by generator this round:** Haiku $0.78/site for 10.7 patterns, Sonnet $3.27 for 11.1, Opus $5.07 for 11.6.
- **Repo waste:** $19.0 of finished setups (kresus, dumbbudget, svelte-commerce) went unused because of the port bug.
- **Supply:** gen-002 is used up. 96 of its 100 briefs built; the other 4 failed. repo-001 has about 290 views left.
- **Still unrecorded:** explore and labeling sessions still don't record USD.

## What changed since the last round
- Round 3's main worry reversed. New repo views split from genUI's profile: 53% soft/thin/solid, against 80% in round 3.
- Repo reliability rose on 8 of 10 fields; gen fell on whitespace.
- Repo-only patterns fell from 11 to 9; gen-only stayed at 23.
- Round 3's conditions:
  - **Toward GitHub:** evenness ≥0.5 was met. The others were missed: +1 domain instead of 3, +2 new patterns instead of 5, and failed plus degraded captures at 48% instead of ≤10%.
  - **Toward genUI:** failed plus degraded ≥20% was met; ">80% soft/thin/solid" was not.
- Breadth-first picking was applied, with all six named apps first, but the port bug blocked three of them. maildev was retried again, and captures that don't match their saved view are still labeled.

## What would change the verdict
- **Toward genUI:** after the fixes below, any of:
  - Failed plus degraded repo captures stay at 20% or more.
  - The next 25 repo views add fewer than 2 new patterns and no new-entry proposals.
  - A gen-003 reaches shape or borders evenness of 0.4 or more.
- **Firmer for GitHub:**
  - Commerce, social and nonprofit views add at least 2 domains and 4 new patterns.
  - Repo coverage at equal n comes within 6 patterns of gen.
  - Failed plus degraded captures fall to 15% or less.

## Recommendations for the next round
1. **Fix the port collision:** stop stray servers on the app's port before starting it. Then label kresus, dumbbudget and svelte-commerce first.
2. **Only label a capture once the page is ready.**
   - Wait for spinners and progress bars to clear.
   - Require at least 0.75 text similarity to the saved view, as `save_view` does, and refuse the capture instead of labeling it.
   - Relabel `myfin--budget-detail`, `fiftyone--sample-grid`, `dbdesigner-id--table-detail-drawer` and `lunar-surface-explorer`.
3. **Isolate FiftyOne sessions** per page, so the shared-session banner doesn't appear.
4. **Enforce the skip list.** Skip any view at least 0.8 similar to one already labeled.
5. **Go breadth-first into the empty domains:** commerce, social-community, nonprofit and reference-docs. Cap developer-tools.
6. **genUI:** if you generate a gen-003:
   - Keep it small and aim it at the 24 codebook entries neither source has.
   - Use Haiku: 92% of Opus's patterns at 15% of the cost.
   - Remove deadlines from the briefs.
7. **Codebook review:**
   - Review `usage-meter`, `code-snippet`, `space-simulator`, `mind-map-editor` and `ribbon-toolbar`.
   - Merge the checklist ids and the floor-plan ids.
   - Rewrite the definitions of contextual-help and of the overlay patterns (popover, drawer, modal-dialog, toast).
8. **Record USD for explore and labeling,** and compare the two sources with style statistics from `styles.json`.

---
_Evaluator: claude-opus-5-5, effort xhigh (served by: claude-opus-5-5); gen-002 96 labeled, repo-001 88 labeled; 2026-11-17; cost $6.44 equivalent._
