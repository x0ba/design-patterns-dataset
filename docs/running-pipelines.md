# Running the pipelines

Two pipelines produce labeled UI captures with the same downstream steps:

| Pipeline | Source of UIs | Frame file | First command |
| --- | --- | --- | --- |
| **Generated** | Coding agents build apps from written briefs | `briefs/<batch>.yaml` | `node scripts/briefs.ts` |
| **Repos** | Open-source apps cloned and run from GitHub | `repos/<batch>.yaml` | `node scripts/discover-repos.ts` |

Both end with `node scripts/label.ts` and `node scripts/irr.ts`, and write to
`dataset/<batch>/`. Use a **new batch name** for every run (for example
`gen-002` or `repo-002`). A batch name is the unit of resumability, the
codebook freeze, and git conflicts: two branches must not write the same batch.
Use a `scratch-` prefix for experiments; those batches are gitignored.

Commands below run from the repository root. They assume `node`, `pnpm`,
`mise`, `git`, `gh` and the `claude` CLI are on `PATH`.

---

## 1. One-time setup (both pipelines)

```sh
# Node 26 and pnpm 12, as pinned in mise.toml (macOS/Homebrew shown; on Linux use
# your distro's mise and git-lfs packages)
brew install mise git-lfs
mise install

# Dependencies and browser
pnpm install
pnpm exec playwright install chromium

# Screenshots, builds and transcripts are stored with Git LFS
git lfs install

# Labeling uses the local Claude Code CLI and its login, not an API key
claude auth status

# Codebook bundle: label.ts refuses to run without dist/codebook.json
node scripts/validate-codebook.ts
node scripts/build-codebook.ts
```

Check the machine before a real run:

```sh
node scripts/validate-codebook.ts   # schema + cross-references
pnpm test                           # unit and integration tests
pnpm typecheck
```

A model-free end-to-end smoke test of capture → raters → IRR:

```sh
pnpm smoke
rm -rf dataset/dry-run proposals/dry-run
```

### Configuration files

| File | Used by | What it controls |
| --- | --- | --- |
| `config/generators.yaml` | Generated pipeline | Brief writer, generator models, tools, timeout, repair rounds |
| `config/raters.yaml` | Both | The raters that label every site; default is 3 × `claude-opus-5-5` |
| `config/repos.yaml` | Repo pipeline | Search terms, screener, setup/explorer models, sandbox, ports, checkout root |

Raters are fixed when a batch starts. To change models or rater IDs, use a new
batch name. To use a non-default config file, pass it explicitly:
`--config`, `--raters`, or `--repos-config` (see each step).

**Time and model usage.** Brief writing, generation, repo setup/exploration and
labeling all run Claude Code sessions. Generation and setup are the slowest
stages because each app or repo gets its own session; labeling runs one session
per rater per site. A Claude Code usage limit pauses the run and the same
command resumes it after the limit resets.

---

## 2. Generated UI pipeline

The pipeline writes briefs, has coding agents build one app per brief, then
labels the built apps exactly like captured sites.

### 2.1 Write the briefs

Preview the domain × software-function × context × generator cells without
calling a model:

```sh
node scripts/briefs.ts --batch gen-001 --n 48 --seed 1 --plan-only
```

Write the brief file:

```sh
node scripts/briefs.ts --batch gen-001 --n 48 --seed 1
```

This writes `briefs/gen-001.yaml`. The brief writer model is
`briefWriter` in `config/generators.yaml`.

Review the file before generating. In particular check the `echo` list: it
names codebook patterns that leaked into a brief's wording. Briefs should
describe the work, not the interface, or the labels will just echo the prompt.

Useful options:

```sh
# Restrict the frame
node scripts/briefs.ts --batch gen-001 --n 12 --seed 1 \
  --domains finance,health --archetypes analyze,monitor

# No context axis
node scripts/briefs.ts --batch gen-001 --n 12 --seed 1 --contexts none

# Rewrite an existing brief file
node scripts/briefs.ts --batch gen-001 --n 48 --seed 2 --force
```

### 2.2 Generate the apps

```sh
node scripts/generate.ts --batch gen-001 --concurrency 2
```

One Claude Code session builds each app. Output goes to
`generated/gen-001/<slug>/` (`out/`, `src/`, `preview.png`, `transcript.jsonl`,
`generation.json`). On success the script writes `sites/gen-001.yaml`; failed
builds are listed at the end and omitted from the site list.

Useful options:

```sh
# One app, or a comma-separated subset
node scripts/generate.ts --batch gen-001 --only checkout-flow,lab-notebook

# Rebuild apps that already succeeded
node scripts/generate.ts --batch gen-001 --regenerate --only checkout-flow

# Different generator config
node scripts/generate.ts --batch gen-001 --config my-generators.yaml
```

The run is resumable: briefs with a successful `generation.json` are skipped.
A Claude Code usage limit pauses the run until the limit resets.

**Safety:** generators run `Bash` without prompts so they can install packages
and build. They work in a temporary directory but are not sandboxed. Run this on
a machine where that is acceptable.

### 2.3 Label the generated apps

```sh
node scripts/label.ts --batch gen-001 --concurrency 2
```

`label.ts` serves each build at `http://<slug>.localhost:4318/`, captures it
once at 1440×900, and has every rater label the same capture. It writes
`dataset/gen-001/`.

Useful options:

```sh
# Capture only, no model calls
node scripts/label.ts --batch gen-001 --capture-only

# One site, or redo one stage
node scripts/label.ts --batch gen-001 --only checkout-flow
node scripts/label.ts --batch gen-001 --recapture --only checkout-flow
node scripts/label.ts --batch gen-001 --relabel --only checkout-flow

# One rater only (useful for a pilot)
node scripts/label.ts --batch gen-001 --rater rater-1 --only checkout-flow

# Non-default raters
node scripts/label.ts --batch gen-001 --raters config/raters.yaml
```

If another process is using port 4318, stop it first. Generated site URLs carry
the port used by `generate.ts`, and `label.ts` serves each build on that port.
Leave it at the default unless you are willing to regenerate the site list.

### 2.4 Score agreement

```sh
node scripts/irr.ts --batch gen-001
```

Writes `dataset/gen-001/irr.json` and refreshes each site's `agreement.json` and
`consensus.json`.

```sh
# Only patterns with at least 20 pooled units
node scripts/irr.ts --batch gen-001 --min-units 20
```

### 2.5 Review and inspect

```sh
# Check frame variety (before labeling), and labeled variety after
node scripts/site-variety.ts sites/gen-001.yaml
node scripts/site-variety.ts sites/gen-001.yaml --batch gen-001

# Agent proposals raised while labeling
node scripts/proposals.ts list gen-001

# Console: progress, agreement, codebook, UI viewer
node console/server.ts
# → http://127.0.0.1:4317
```

### Generated pipeline: full command sequence

```sh
BATCH=gen-001
node scripts/build-codebook.ts
node scripts/briefs.ts --batch "$BATCH" --n 48 --seed 1 --plan-only
node scripts/briefs.ts --batch "$BATCH" --n 48 --seed 1
# review briefs/$BATCH.yaml
node scripts/generate.ts --batch "$BATCH" --concurrency 2
node scripts/site-variety.ts "sites/$BATCH.yaml"
node scripts/label.ts --batch "$BATCH" --concurrency 2
node scripts/irr.ts --batch "$BATCH"
node scripts/proposals.ts list "$BATCH"
node console/server.ts
```

---

## 3. GitHub repo pipeline

The pipeline discovers open-source apps, pins them to a commit, has a sandboxed
agent build and seed each one, explores the running app for views, then labels
those views.

### 3.1 Prerequisites specific to this pipeline

```sh
gh auth status || gh auth login   # discovery uses the GitHub API through gh
mise --version                    # setup pins every runtime with mise
```

Server-mode apps are served under macOS `sandbox-exec`. On a machine without it,
`prepare-repos.ts` exits. Run on macOS, or set `setup.sandbox: false` in
`config/repos.yaml` on a throwaway machine only.

Checkouts (with `node_modules`) are kept outside the repo, by default in
`~/.cache/design-patterns-dataset/repos`. Expect several GB per batch.

### 3.2 Discover repos

Search only first; this calls GitHub, not a model:

```sh
node scripts/discover-repos.ts --batch repo-001 --n 20 --search-only
```

Build the frame with the screener model:

```sh
node scripts/discover-repos.ts --batch repo-001 --n 20 --seed 1
```

This writes `repos/repo-001.yaml`: repos pinned to a commit, each with the domain
it was sampled for and its screen result. Review and edit the frame before
preparing it.

Useful options:

```sh
# Limit domains
node scripts/discover-repos.ts --batch repo-001 --n 10 --domains finance,health

# Rewrite an existing frame
node scripts/discover-repos.ts --batch repo-001 --n 20 --seed 2 --force

# Different discovery/screener config
node scripts/discover-repos.ts --batch repo-001 --n 20 --config my-repos.yaml
```

If a domain is short of quota, the script reports it. Add search terms for that
domain in `config/repos.yaml` rather than lowering the quality bar.

### 3.3 Set up and explore the repos

```sh
node scripts/prepare-repos.ts --batch repo-001 --concurrency 2
```

Per repo this runs two stages:

1. **Setup** — clone the pinned commit and have a sandboxed agent get the app
   running without restyling it. It installs runtimes with mise, seeds realistic
   data, fakes external services, and leaves a contract in `.ui-capture/`.
2. **Explore** — a browser agent signs in, saves up to `explorer.maxViews`
   views, and records each view as replayable steps.

Output goes to `repos/repo-001/<slug>/` and the script writes
`sites/repo-001.yaml`, one site per explored view (`<repo>--<view>`).

Run the stages separately when you want to review setup before exploring:

```sh
node scripts/prepare-repos.ts --batch repo-001 --stage setup
node scripts/prepare-repos.ts --batch repo-001 --stage explore

# One repo
node scripts/prepare-repos.ts --batch repo-001 --only excalidraw

# Redo stages
node scripts/prepare-repos.ts --batch repo-001 --redo-explore --only excalidraw
node scripts/prepare-repos.ts --batch repo-001 --redo-setup --only excalidraw
```

`--redo-setup` re-clones and also redoes exploration. The run is resumable: a
repo with a successful `setup.json` / `explore.json` skips that stage. A Claude
Code usage limit pauses the run until the limit resets.

**Safety:** setup runs third-party install and build scripts, and labeling runs
third-party servers. Both are sandboxed by default. The sandbox narrows what a
malicious dependency can reach; it is not a VM. Server mode needs macOS.

### 3.4 Label the repo views

```sh
node scripts/label.ts --batch repo-001 --concurrency 2
```

Static repo builds are served like generated apps. Server apps are started while
their views are captured and labeled, then stopped. Capture and raters replay
the recorded steps, so they see the chosen state.

If you prepared with a non-default config, pass the same file to labeling so the
sandbox and startup settings match:

```sh
node scripts/prepare-repos.ts --batch repo-001 --config my-repos.yaml
node scripts/label.ts --batch repo-001 --repos-config my-repos.yaml
```

The batch records the codebook version at start. Do not accept proposals or
rebuild a changed codebook mid-run.

### 3.5 Score agreement

```sh
node scripts/irr.ts --batch repo-001
```

### 3.6 Review and inspect

```sh
node scripts/site-variety.ts sites/repo-001.yaml
node scripts/site-variety.ts sites/repo-001.yaml --batch repo-001
node scripts/proposals.ts list repo-001
node console/server.ts
# → http://127.0.0.1:4317
```

### Repo pipeline: full command sequence

```sh
BATCH=repo-001
node scripts/build-codebook.ts
gh auth status || gh auth login
node scripts/discover-repos.ts --batch "$BATCH" --n 20 --search-only
node scripts/discover-repos.ts --batch "$BATCH" --n 20 --seed 1
# review repos/$BATCH.yaml
node scripts/prepare-repos.ts --batch "$BATCH" --concurrency 2
node scripts/site-variety.ts "sites/$BATCH.yaml"
node scripts/label.ts --batch "$BATCH" --concurrency 2
node scripts/irr.ts --batch "$BATCH"
node scripts/proposals.ts list "$BATCH"
node console/server.ts
```

---

## 4. Before a real batch: run a pilot

Pick one site and one rater. This exercises the real Claude Code rater without
paying for a whole batch:

```sh
node scripts/label.ts --batch pilot \
  --sites sites/dry-run.yaml \
  --only linear-app \
  --rater rater-1
```

Then check `dataset/pilot/sites/linear-app/status.json`,
`labels/rater-1.json` and `agreement.json`, and open the console.

For the repo pipeline, a pilot is a small frame and one repo:

```sh
node scripts/discover-repos.ts --batch repo-pilot --n 2 --seed 1
# pick a slug from repos/repo-pilot.yaml
node scripts/prepare-repos.ts --batch repo-pilot --only excalidraw
node scripts/label.ts --batch repo-pilot
```

---

## 5. What a completed batch looks like

```text
briefs/<batch>.yaml          generated: the brief frame (reviewed)
generated/<batch>/<slug>/    generated: build, sources, preview, transcript
repos/<batch>.yaml           repos: the frame (reviewed)
repos/<batch>/<slug>/        repos: setup.json, setup.patch, app.json,
                             start.sh, preview.png, explore.json, views/
sites/<batch>.yaml           one site per app, app view or live URL
dataset/<batch>/
  batch.json                 codebook version + hash frozen at batch start, raters
  irr.json                   Krippendorff's alpha per field
  sites/<slug>/
    capture/                 screenshot, viewport, a11y, elements, styles, meta
    labels/<rater>.json      one label per rater, plus transcripts
    agreement.json           per-site agreement and disagreements
    consensus.json           majority-vote label
    status.json              queued | capturing | labeling | labeled | flagged | failed
proposals/<batch>/<id>.yaml  agent proposals, merged across raters and sites
```

Commit a batch when its run has finished, so committed `status.json` files are
terminal states. Labels, consensus, agreement, IRR and status JSON stay in plain
git; screenshots, builds, generated app sources and transcripts go through Git LFS.

---

## 6. Common problems

| Symptom | Fix |
| --- | --- |
| `dist/codebook.json is missing` | Run `node scripts/build-codebook.ts` |
| `Codebook changed since batch … started` | The batch is frozen. Rebuild the codebook version it used, or start a new batch name |
| `Raters … are not part of batch` | Rater IDs are fixed at batch start. Use a new batch |
| `briefs/<batch>.yaml is missing` | Run `node scripts/briefs.ts --batch <batch>` first |
| `repos/<batch>.yaml is missing` | Run `node scripts/discover-repos.ts --batch <batch>` first |
| `repos/<batch>.yaml exists` | Review it, or pass `--force` to rewrite it |
| `is not installed` (mise) | `brew install mise`, then re-run `prepare-repos.ts` |
| `sandbox-exec … not available` | Run on macOS, or set `setup.sandbox: false` on a throwaway machine |
| Could not serve on port 4318 | Another label run is using it; stop it. The port comes from the site list (`generate.ts` / `prepare-repos.ts --port`) |
| `gh` authentication errors | `gh auth login` |
| Run paused with a usage-limit message | Wait for the reset; re-run the same command to resume |
| A site is `failed` | Read `dataset/<batch>/sites/<slug>/status.json`; re-run with `--recapture` / `--relabel` after fixing |

Runs are safe to re-run: generation, setup/explore and labeling all skip work
that already succeeded unless you pass `--regenerate`, `--redo-setup`,
`--redo-explore`, `--recapture` or `--relabel`.

---

## 7. Useful checks

```sh
# Codebook
node scripts/validate-codebook.ts
node scripts/build-codebook.ts
node scripts/verify-roundtrip.ts

# Tests and types
pnpm test
pnpm typecheck

# Codebook proposals between batches
node scripts/proposals.ts list gen-001
node scripts/proposals.ts accept gen-001 new-pattern --note "why"
node scripts/proposals.ts reject gen-001 new-pattern --note "why"
node scripts/proposals.ts deprecate old-id --replaced-by new-id --note "why"

# After accepting proposals: bump VERSION + CHANGELOG, then rebuild
node scripts/build-codebook.ts
```

Accepting proposals edits `codebook/` (entries, `VERSION`, `CHANGELOG.md`).
Those are the only data-driven changes that can genuinely conflict between
branches; resolve them like code, then rebuild `dist/`. Existing batches keep
their frozen codebook version and will refuse to continue against a new one.
