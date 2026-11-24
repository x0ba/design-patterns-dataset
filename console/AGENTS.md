# Dataset console

A Next.js app over the pipeline's files: batch progress, inter-rater
agreement, the screenshot viewer, the codebook and proposal review. Pages are
server components that read `dataset/`, `dist/` and `proposals/` through
`lib/data.ts`. `app/api/events` streams file changes, and `components/live.tsx`
refreshes the current route when a change touches it.

- Run it: `pnpm console` from the repo root (dev server on http://127.0.0.1:4317).
- Follow the Vercel Web Interface Guidelines (https://vercel.com/design/guidelines):
  keep UI state in the URL, links are links, every control has a name.

## ui-sdk

Before using ui-sdk, follow the ui-sdk skill if it's installed
(`.agents/skills/ui-sdk`), and read `node_modules/@ui-sdk/react/docs/llms.txt`.
To build a new component, also search `node_modules/@ui-sdk/react/docs/core.md`
by heading, and read `rendering.md` next to it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
