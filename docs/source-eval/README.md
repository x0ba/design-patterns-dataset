# genUI vs GitHub: source evaluation log

Labeling of gen-002 (generated apps) and repo-001 (open-source GitHub apps) runs in
rounds of 25 labeled sites per source. After each round, Claude Opus 5.5 at xhigh
effort compares the two sources on everything labeled so far (variety, pattern
coverage, label reliability, realism, cost) and writes `round-NN.md`; the numbers it
was given are in `round-NN/`. Labeling itself uses Opus 5.5 at high effort
(`config/raters.yaml`).

Notes:
- Round 1 started 2026-11-17 on the Linux PC. gen-002 already had 34 labeled sites
  (from the Mac); repo-001 round 1 is one view from each of the 25 static repos,
  because the 62 server-mode repos need a Linux runtime sandbox first.
- Weekly usage cap for this work raised from 47% to 75% (user decision, 2026-11-17).
- Known capture issues on the Linux PC (no GPU, no audio device), found in rounds 1–2:
  - WebGL pages render in software (SwiftShader). Screenshots sometimes fail with
    "Unable to capture screenshot" under load. A retry on a fresh viewer page fixed
    `flight-path--globe` and `solar-wanderer--explorer-earth`. `datadex--landing`
    failed twice and is skipped; it captures fine when run alone.
  - Heavy 3D views can time out while loading or replaying steps
    (`flight-path--flight-plane-controls`, `solar-wanderer--help-overlay`). They get one retry.
  - Audio ran at 44.1 kHz, so `voxel-musou` crashed on load and was labeled on its error
    screen. Fixed by defaulting AudioContexts to 48 kHz; its round-1 labels were moved
    aside and it is relabeled in round 3.
  - `toothpaste--script-editor` (DuckyScript keystroke-injection payloads on screen):
    all three raters got an API refusal with zero output, so the view is skipped.
- A view is skipped after failing in two rounds (`runs/rounds/failed-repo-001.txt`).

## Rounds
- [Round 1](round-01.md) (2026-11-17): gen-002 34, repo-001 22 labeled. **Verdict:** GitHub — its UIs vary in look and it surfaces UI types the codebook lacks, which is what the dataset is for, but genUI is cheaper, has more patterns per site and captures more reliably.
- [Round 2](round-02.md) (2026-11-17): gen-002 50, repo-001 45 labeled. **Verdict:** GitHub — it is still the only source whose UIs look different from each other, and its proposals keep exposing gaps in the codebook. But genUI now covers about 9 more patterns at equal sample size, and the first 4 server-mode repo views carry genUI's aesthetic labels.
- [Round 3](round-03.md) (2026-11-17): gen-002 75, repo-001 69 labeled. **Verdict:** too close to call — genUI now leads on pattern coverage, domain breadth, reliability and yield, while GitHub is still the only source of looks that aren't model defaults, and its new server-mode views are converging on genUI's categorical aesthetic profile.
- [Round 4](round-04.md) (2026-11-17): gen-002 96, repo-001 88 labeled. **Verdict:** GitHub — genUI still has more patterns per site and more reliable captures, but gen-002 is used up and its look is still one template, while this round's repo views moved away from that template and supplied every new codebook entry.
- [Round 5](round-05.md) (2026-11-17): gen-002 96, repo-001 116 labeled. **Verdict:** GitHub — gen-002 added nothing this round and its look is still one template, while 28 new repo views added the commerce domain and two codebook entries neither source had, and repo reliability now matches genUI's.
- [Round 6](round-06.md) (2026-11-17): gen-002 96, repo-001 144 labeled. **Verdict:** GitHub — gen-002 is still frozen at 96 sites. This round's 28 repo views opened two empty domains (social-community and education) and added 5 patterns, including the first `video-call` in the dataset. Capture yield rose to 82%, and reliability is unchanged.
- [Round 7](round-07.md) (2026-11-18): gen-002 96, repo-001 171 labeled. **Verdict:** GitHub — gen-002 is still frozen at 96 sites, and this round's first measurement from `styles.json` shows its look is one template. That holds even though repo pattern coverage did not grow this round.
- [Round 8](round-08.md) (2026-11-18): gen-002 96, repo-001 195 labeled. **Verdict:** GitHub — gen-002 is still frozen at 96 sites with one look, while this round's repo views opened the last empty domain, added 3 patterns and the first new-entry proposal backed by two raters, though capture quality slipped again.
