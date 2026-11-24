// Minimal static server with index.html fallback (local testing only).
const root = new URL("./out/", import.meta.url).pathname;
Bun.serve({ port: Number(process.env.PORT || 5477), async fetch(req) {
  const p = decodeURIComponent(new URL(req.url).pathname);
  let f = Bun.file(root + (p.endsWith("/") ? p + "index.html" : p));
  if (!(await f.exists())) f = Bun.file(root + "index.html");
  return new Response(f);
}});
