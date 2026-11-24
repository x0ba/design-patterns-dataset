# Quillstack front end (prototype)

A client-side prototype of the Quillstack documentation-site builder. It opens on
elemental.nvim's docs at the point where the first build has just finished.
There is no backend: content, build results, and publishing are simulated in the
browser, and nothing is saved between page loads.

## Run

```sh
npm install
npm run dev        # development server
npm run build      # static production build into ./out
```

`./out/index.html` is the entry point. Assets use relative paths, so the folder
can be served from the root of any plain static file server with no rewrites.

## Where things are

- `src/content/*.md`: the eleven pages and four help articles (mock project content)
- `src/data/project.js`: page order, project facts, starting site settings
- `src/lib/markdown.js`: frontmatter, `:::` callouts, headings and anchors, `ref:` links
- `src/lib/site.js`: reference resolution, diagnostics, suggested fixes, source edits
- `src/components/`: the top bar, sidebar with setup checklist, editor, preview, build report, settings, publish dialog
