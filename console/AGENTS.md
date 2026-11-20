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
