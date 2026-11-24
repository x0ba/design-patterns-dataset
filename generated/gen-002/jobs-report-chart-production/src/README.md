# Releasewell: October 2026 Jobs Report chart workspace

Front end for the release team's chart production workspace. Opens at the
scenario's "now": Tuesday, November 17, 2026, 2:22 p.m. The viewer is Ana Delacroix,
release lead.

All names, figures and comments are invented sample data. There is no backend.

## Run

    npm install
    npm run dev        # development server
    npm run build      # type check, then static build into ./out

`./out/index.html` is the entry point. Asset URLs are relative, so the folder can
be served from the root of any plain static file server with no rewrites.

## What it does

- **Who is editing what:** "Working now" lists the four people active on charts, with
  the chart IDs and when each started. Chart rows carry their avatars.
- **What changed since you last looked:** the feed starts at the last visit,
  Monday 4:52 p.m. "Mark as seen" resets it.
- **What needs you:** the five comments addressed to Ana, the sign-off counts (each
  one filters the chart list), and holds.
- **Editor's headline note (OCT-01):** reply, rewrite the headline (saved as a new
  version), resolve the thread.
- **Sign-off:** approve, mark final (with a checklist), reopen, return to owner.
  Disclosure holds can be placed and lifted only by the disclosure reviewer.
- **Release:** the release control stays disabled until all 22 charts are final,
  there are no holds and no open comments.

## Permissions

Role rules are in `src/lib/permissions.ts`. Every state change goes through
`canAct()` in the reducer (`src/lib/store.tsx`).

| Role | Can |
| --- | --- |
| Lead (Ana) | Approve, mark final, reopen, release to communications; edit any chart's text |
| Analyst | Edit own charts; submit drafts; comment |
| Editor | Edit headlines, release notes and captions; comment |
| Disclosure reviewer | Place and lift holds; comment |

**Limit:** this is a client-side app with no server. The rules stop the interface
from taking an action a role may not take, but anyone who opens the built files can
change them. A real release gate needs server-side checks.

Reloading the page restores the scenario state.
