// Local stand-ins for the outside services Sophosia talks to.
// Every outbound URL from the browser (fetch/XHR) or from Tauri's http client
// is routed here; nothing leaves the machine.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const json = (obj, status = 200) => ({
  status,
  type: "application/json; charset=utf-8",
  body: JSON.stringify(obj),
});

// Community plugin index (raw.githubusercontent.com/sophosia/sophosia-releases/main/plugins.json)
const PLUGINS = [
  {
    id: "sophosia-zotero-import",
    name: "Zotero Importer",
    author: "hfeng",
    version: "0.3.1",
    description: "Import collections, tags and attached PDFs from a local Zotero library (zotero.sqlite).",
    repo: "sophosia/sophosia-zotero-import",
  },
  {
    id: "sophosia-translate",
    name: "Inline Translate",
    author: "gisezerano",
    version: "0.2.0",
    description: "Translate the selected text in the PDF reader and paste the result into your notes.",
    repo: "sophosia/sophosia-translate",
  },
  {
    id: "sophosia-word-count",
    name: "Word Count",
    author: "mlindqvist",
    version: "1.0.4",
    description: "Shows word and character counts for the active markdown note in the status area.",
    repo: "mlindqvist/sophosia-word-count",
  },
  {
    id: "sophosia-reading-timer",
    name: "Reading Timer",
    author: "tkoh",
    version: "0.1.7",
    description: "Pomodoro-style timer that logs time spent reading each project.",
    repo: "tkoh/sophosia-reading-timer",
  },
  {
    id: "sophosia-arxiv-feed",
    name: "arXiv Daily Feed",
    author: "rpatel",
    version: "0.4.2",
    description: "Browse today's arXiv listings for your categories and add papers to the library in one click.",
    repo: "rpatel/sophosia-arxiv-feed",
  },
];
const STARS = {
  "sophosia/sophosia-zotero-import": 41,
  "sophosia/sophosia-translate": 18,
  "mlindqvist/sophosia-word-count": 9,
  "tkoh/sophosia-reading-timer": 6,
  "rpatel/sophosia-arxiv-feed": 23,
};

function loadDoiTable() {
  try {
    return JSON.parse(fs.readFileSync(path.join(HERE, "doi-table.json"), "utf8"));
  } catch {
    return {};
  }
}

export async function stubResponse(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return json({ message: "bad url" }, 400);
  }
  const host = url.hostname;

  if (host === "raw.githubusercontent.com" && url.pathname.endsWith("/plugins.json"))
    return json(PLUGINS);

  if (host === "api.github.com" && url.pathname.startsWith("/repos/")) {
    const repo = url.pathname.replace("/repos/", "");
    const [owner, name] = repo.split("/");
    return json({
      id: 7000000 + repo.length,
      name,
      full_name: repo,
      owner: { login: owner },
      html_url: `https://github.com/${repo}`,
      description: (PLUGINS.find((p) => p.repo === repo) || {}).description || "",
      stargazers_count: STARS[repo] ?? 3,
      watchers_count: STARS[repo] ?? 3,
      forks_count: Math.floor((STARS[repo] ?? 3) / 5),
      open_issues_count: 2,
      updated_at: "2026-10-29T14:12:03Z",
      pushed_at: "2026-10-29T14:12:00Z",
      default_branch: "main",
    });
  }

  // Updater manifest
  if (url.pathname.endsWith("/latest.json"))
    return json({ version: "v0.18.2", notes: "", pub_date: "2026-09-30T00:00:00Z", platforms: {} });

  // DOI / Crossref lookups made by citation-js
  const table = loadDoiTable();
  let doi = null;
  if (host.endsWith("doi.org")) doi = decodeURIComponent(url.pathname.slice(1));
  if (host === "api.crossref.org") {
    const m = url.pathname.match(/\/works\/(.+)$/);
    if (m) doi = decodeURIComponent(m[1]);
  }
  if (doi) {
    const hit = table[doi.toLowerCase()];
    if (hit) {
      if (host === "api.crossref.org") return json({ status: "ok", message: hit });
      return { status: 200, type: "application/vnd.citationstyles.csl+json", body: JSON.stringify(hit) };
    }
    return { status: 404, type: "text/plain", body: "Resource not found." };
  }

  return { status: 503, type: "text/plain", body: "offline: no network access in this environment" };
}
