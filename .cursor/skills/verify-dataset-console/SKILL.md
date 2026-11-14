---
name: verify-dataset-console
description: Drive the design-patterns-dataset review console and the model-free labeling pipeline with Playwright and the repo CLIs. Use when proving the console, a capture, or a dry-run batch. Do not accept proposals or edit labeling prompts, the label schema, or IRR.
---

# Verify the dataset console

The primary thing a person touches is the console at `http://127.0.0.1:4317`. The command line is how a batch gets onto that page. The codebook build is what the codebook page reads.

Checked by running these steps on commit `7956aec` on 2026-11-11. Nix was not installed. Node was v24.22.2 from nvm, pnpm 12.9.0 from corepack, and Playwright Chromium from `pnpm exec playwright install chromium`. A machine with `nix develop` still needs that Playwright install. The flake does not ship the browser.

Read `features/README.md` before driving. Use the matching feature file as the recipe.

## Launch

From the repo root, with Node 24 and pnpm 12.9.0 on `PATH`.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
node scripts/build-codebook.ts
```

Build prints `codebook 1.0.0: 119 entries`. If `dataset/` has no batch, the progress page is empty until you seed it. The empty copy in `console/public/app.js` is `No batches yet.` followed by `node scripts/label.ts --batch batch-001`.

```sh
pnpm smoke
```

That is `node scripts/label.ts --batch dry-run --sites sites/dry-run.yaml --raters config/raters.dry-run.yaml` and then `node scripts/irr.ts --batch dry-run`. Ready for the console when the IRR table has been printed and `dataset/dry-run/sites/linear-app/status.json` has `"state": "labeled"`. Smoke needs a network path to `linear.app`, `www.gov.uk`, `news.ycombinator.com`, and `lichess.org`. It does not call a model.

Start the console in its own session so you can kill that process later.

```sh
node console/server.ts --port 4317
```

Ready when stdout contains `Dataset console: http://127.0.0.1:4317`. The host defaults to `127.0.0.1`. `--port` and `PORT` change the port.

Two processes in one checkout share `dataset/`, `proposals/`, `dist/`, and `codebook/`. There is no data-directory flag. Use a second git worktree if you need a second instance. Use another `--port` only when you accept that they still share those directories.

## Doctor

Run this before driving. It answers whether this process is the console, on the expected port, with a built codebook.

```sh
curl -sf -o /dev/null -w "root %{http_code}\n" http://127.0.0.1:4317/
curl -sf http://127.0.0.1:4317/api/codebook | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s); if(j.version!=="1.0.0"||j.entries.length!==119) process.exit(1); console.log(j.version, j.entries.length, "usageSites", j.usage.sites);})'
curl -sf -N --max-time 2 http://127.0.0.1:4317/api/events | head -n 4
```

A healthy run prints `root 200`, then `1.0.0 119 usageSites` with a count, then `event: hello`. A 404 body `dist/codebook.json missing — run scripts/build-codebook.ts` means you skipped the build. Stop if `codebook/VERSION` and the API `sourceVersion` differ. Accepting a proposal causes that, and the badge text becomes `codebook <dist> (source <VERSION>, rebuild dist/)`.

Confirm the listener is the process you started. Record its pid from the session. Do not drive a console you did not start.

## Drive

Use the repo's Playwright. Prefer the accessible names in the feature files. The progress filter is `input#q`. The codebook search is `input#cq`. Rater buttons use `data-src`. Proposal filters use `data-f`. Accept and Reject use `data-act`. Do not click Accept or Reject.

Run drive scripts with `node --input-type=module` from the repo root so `import { chromium } from "playwright"` resolves.

## Evidence

Write a run's files to `/tmp/verify-dataset-console/<run-id>/`. Keep the command, the URL, and the resulting state. For the console, save a screenshot and `body` inner text. For a CLI step, save stdout, stderr, and the exit code. For a label, also read `dataset/<batch>/sites/<slug>/status.json` and one `labels/<rater>.json` after the command. That file read is a second view of what the command wrote.

The dry-run provider skips the model. It still opens Chromium and writes `dataset/dry-run/` and `proposals/dry-run/`. Confirm those directories exist after smoke, and confirm `git status --short` does not list them. Both paths are gitignored.

Do not treat a 200 from `GET /api/batches` as proof of the viewer. Open the site hash and check the screenshot image and a rater button.

## Cleanup

Stop the console by the pid you recorded. `tmux kill-session` is enough when that session is the one you created for the server. Do not kill every `node` process.

Leave `/tmp/verify-dataset-console/<run-id>/` in place. The README smoke cleanup is `rm -rf dataset/dry-run proposals/dry-run`. Run that only after the proof files have been copied out, and only if this run created those directories. Do not delete `proposals/batch-001/`.

## Helpers

No helper script is shipped. The feature map states each check in prose and names the selector. Progress reads a `.kpi` whose `.n` is `4` and whose label is `Labeled`, plus the line `Krippendorff's α over 4 site(s)`. The filter is `#q`. The site viewer reads `Structure & aesthetics` from `#aest`. Region boxes are `#ov .bx.region`. Pattern boxes are `#ov .bx:not(.region)`. The toggles are `#t-reg` and `#t-pat`. Rater buttons are `#srcs button[data-src]`. The codebook searches with `#cq` and opens `[data-id="card"]`. Before smoke an entry with no usage row says `Not yet observed in the dataset.` After smoke, read `usage.patterns.card` from `GET /api/codebook` and check that the card line uses those `sites` and `uncertain` values. Do not hardcode either number. A null alpha on the site viewer and the batch IRR table is U+2014 (`—`). `n/a` is only the CLI table in `scripts/irr.ts` line 60 and the smoke stdout. Proposals filter with `button[data-f]` and count `button[data-act="accept"]`. Do not click Accept or Reject.

## Maintenance

When the console or the smoke command changes, update this map with `/maintain-verification-skill`.
