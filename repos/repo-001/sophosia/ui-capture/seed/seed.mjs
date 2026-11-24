// Generates a Sophosia workspace the way the desktop app lays it out on disk:
//   <storage>/<projectId>/<projectId>.md   folder note with the JSON meta block
//   <storage>/<projectId>/*.pdf            attached paper
//   <storage>/<projectId>/**/*.md|.excalidraw  notes (optionally in folders)
//   <storage>/.sophosia/{appState,layout,pdfAnnotation,...}/*.json
// plus the app config file (workspace.json) in the app config dir.
// The app indexes all of this into its SQLite db on startup.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makePdf } from "./pdf.mjs";
import { PAPERS } from "./papers.mjs";
import { NOTES, EXCALIDRAWS, ANNOTATION_COMMENTS } from "./notes.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DATA_DIR || path.resolve(HERE, "..", "data");
const VHOME = "/home/dana";
const REAL_HOME = path.join(DATA, "home");
const V_STORAGE = `${VHOME}/Documents/Sophosia`;
const STORAGE = path.join(REAL_HOME, "Documents", "Sophosia");
const CONFIG = path.join(REAL_HOME, ".config", "sophosia");

// deterministic RNG
let seed = 20261118;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const nid = (n = 8) => Array.from({ length: n }, () => ALPHA[Math.floor(rnd() * 36)]).join("");

fs.rmSync(DATA, { recursive: true, force: true });
fs.mkdirSync(STORAGE, { recursive: true });
fs.mkdirSync(CONFIG, { recursive: true });
fs.mkdirSync(path.join(DATA, "tmp"), { recursive: true });
for (const d of ["appState", "layout", "pdfAnnotation", "pdfState", "image", "plugin"])
  fs.mkdirSync(path.join(STORAGE, ".sophosia", d), { recursive: true });

const NOW = new Date("2026-11-18T09:30:00-08:00").getTime();
const DAY = 86400000;

function writeFile(real, content, mtime) {
  fs.mkdirSync(path.dirname(real), { recursive: true });
  fs.writeFileSync(real, content);
  if (mtime) {
    const t = new Date(mtime);
    fs.utimesSync(real, t, t);
  }
}

function parseAuthors(s) {
  return s.split(";").map((x) => x.trim()).filter(Boolean).map((full) => {
    const parts = full.split(" ");
    const family = parts.pop();
    return { given: parts.join(" "), family };
  });
}

const STOP = new Set(["a", "an", "the", "on", "for", "of", "with", "to", "in", "and", "is", "are", "can", "does"]);
function citeKey(p, authors) {
  const fam = (authors[0]?.family || "anon").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
  const word = p.t.split(/[\s:,-]+/).map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, "")).find((w) => w && !STOP.has(w)) || "untitled";
  return `${fam}${p.y}${word}`;
}
function pdfName(p, authors) {
  const fam = authors[0]?.family || "Anon";
  const short = p.t.split(":")[0].replace(/[^A-Za-z0-9 ]/g, "").trim();
  return `${fam}_${p.y}_${short}.pdf`.replace(/\s+/g, " ");
}

// spread "added" dates: oldest items first, newest last; last ~8 inside 30 days
const N = PAPERS.length;
const order = PAPERS.map((p, i) => i).sort(() => rnd() - 0.5);
const addedAt = new Array(N);
order.forEach((idx, rank) => {
  const daysAgo = rank < 8 ? 2 + rank * 3.4 : 32 + ((rank - 8) / (N - 8)) * 760;
  addedAt[idx] = NOW - daysAgo * DAY - Math.floor(rnd() * 8 * 3600000);
});

const projects = [];
const byTitle = new Map();
PAPERS.forEach((p, i) => {
  const authors = parseAuthors(p.a);
  const _id = "SP" + nid();
  const proj = {
    _id,
    id: _id,
    dataType: "project",
    type: p.ty,
    label: p.t,
    title: p.t,
    "original-title": "",
    author: authors,
    abstract: p.ab || "",
    issued: { "date-parts": [[p.y, p.m || 1]] },
    "citation-key": citeKey(p, authors),
    "container-title": p.c || "",
    "container-title-short": p.cs || "",
    tags: p.tags || [],
    categories: ["library", ...(p.cats || [])],
    favorite: !!p.fav,
    timestampAdded: addedAt[i],
    timestampModified: Math.min(NOW - DAY / 3, addedAt[i] + Math.floor(rnd() * 40) * DAY),
    children: [],
  };
  if (p.doi) proj.DOI = p.doi;
  if (p.url) proj.URL = p.url;
  else if (p.doi) proj.URL = `https://doi.org/${p.doi}`;
  if (p.isbn) proj.ISBN = p.isbn;
  if (p.pub) proj.publisher = p.pub;
  if (p.vol) proj.volume = p.vol;
  if (p.pg) proj.page = String(p.pg);
  if (p.ty === "article-journal" && p.doi) proj.ISSN = "";
  projects.push({ proj, paper: p, authors });
  byTitle.set(p.t, proj);
});

// a couple of half-filled entries, like ones created by hand and never completed
projects.push({
  proj: {
    _id: "SP" + nid(), id: "", dataType: "project", type: "article", label: "Clinical-Longformer reproduction - Hanyin's slides",
    title: "Clinical-Longformer reproduction - Hanyin's slides", "original-title": "", author: [], abstract: "",
    "citation-key": "", "container-title": "", "container-title-short": "", tags: ["slides"], categories: ["library", "Thesis/Ch4 Experiments"],
    favorite: false, timestampAdded: NOW - 41 * DAY, timestampModified: NOW - 41 * DAY, children: [],
  }, paper: { pdf: false }, authors: [],
});
projects.push({
  proj: {
    _id: "SP" + nid(), id: "", dataType: "project", type: "article", label: "New Project", title: "New Project", "original-title": "",
    author: [], abstract: "", "citation-key": "", "container-title": "", "container-title-short": "", tags: [], categories: ["library"],
    favorite: false, timestampAdded: NOW - 6 * DAY, timestampModified: NOW - 6 * DAY, children: [],
  }, paper: { pdf: false }, authors: [],
});

const idOf = (title) => byTitle.get(title)?._id;
const ctx = { idOf };

function folderNote(proj) {
  const authors = proj.author.map((a) => (a.literal ? a.literal : `${a.given} ${a.family}`)).join(", ");
  return `
This note is automatically generated and managed by Sophosia. Changes to this note will be overwritten.
# ${proj.label}
Author: ${authors}
Abstract: ${proj.abstract || ""}

## meta
\`\`\`json
${JSON.stringify(proj, null, 2)}
\`\`\`
`;
}

const SECTION_TEXT = {
  default: [
    "We situate this work within the broader literature and describe the experimental setup in detail, including data preprocessing, model configuration, and the evaluation protocol used throughout.",
    "Results are reported as the mean over five random seeds with standard deviations in parentheses. Statistical significance is assessed with a paired bootstrap test at the 0.05 level.",
    "We release code and trained checkpoints to support reproducibility, and discuss the computational budget required for each experiment in the appendix.",
  ],
  clinical: [
    "Clinical notes differ from general-domain text in vocabulary, abbreviation density, and document length; a typical discharge summary in MIMIC-III exceeds 1,500 word pieces, far beyond the 512-token window of standard encoders.",
    "All data were accessed under the PhysioNet credentialed data use agreement. Protected health information had been removed by the dataset curators prior to release, and no attempt was made to re-identify patients.",
    "We stratify performance by note type (discharge summary, radiology, nursing) and by patient subgroups to assess whether gains are uniform across the population.",
  ],
  efficient: [
    "Let n denote sequence length and d the hidden size. Standard self-attention requires O(n^2 d) time and O(n^2) memory for the attention matrix, which dominates cost for long inputs.",
    "We benchmark wall-clock throughput and peak memory on a single A100 80GB GPU with batch size 8 and mixed precision, sweeping sequence lengths from 512 to 16,384 tokens.",
    "Ablations isolate the contribution of each design choice: window size, number of global tokens, and whether positional information is shared across heads.",
  ],
};

let pdfCount = 0;
const pdfLines = new Map();
for (const { proj, paper, authors } of projects) {
  const dir = path.join(STORAGE, proj._id);
  fs.mkdirSync(dir, { recursive: true });
  writeFile(path.join(dir, `${proj._id}.md`), folderNote(proj), proj.timestampModified);

  if (paper.pdf) {
    const cats = (paper.cats || []).join(" ");
    const extra = /Clinical/.test(cats) ? SECTION_TEXT.clinical : /Efficient|State Space|Systems/.test(cats) ? SECTION_TEXT.efficient : SECTION_TEXT.default;
    const venue = [paper.c || paper.pub, paper.vol ? `vol. ${paper.vol}` : "", paper.pg ? `pp. ${paper.pg}` : "", paper.y].filter(Boolean).join(", ");
    const abs = paper.ab || "";
    const sentences = abs.split(/(?<=\.)\s+/);
    const blocks = [
      { text: paper.t, size: 17, bold: true, gap: 0 },
      { text: authors.map((a) => `${a.given} ${a.family}`).join(", "), size: 10.5, gap: 8 },
      { text: venue + (paper.doi ? `   doi:${paper.doi}` : ""), size: 9, gap: 4 },
      { text: "Abstract", size: 12, bold: true, gap: 18 },
      { text: abs, size: 10.5 },
      { text: "1  Introduction", size: 12, bold: true, gap: 18 },
      { text: "Neural language models have become the default tool for a wide range of text understanding problems. This question has become central as models are deployed on longer and more heterogeneous inputs, and as practitioners weigh accuracy against cost.", size: 10.5 },
      { text: extra[0], size: 10.5 },
      { text: "2  Related Work", size: 12, bold: true, gap: 18 },
      { text: "Prior work spans architectural changes to the attention mechanism, training objectives tailored to the target domain, and evaluation suites that probe robustness. We review the most closely related approaches and highlight where our assumptions differ.", size: 10.5 },
      { text: "3  Method", size: 12, bold: true, gap: 18 },
      { text: (sentences.length > 1 ? sentences.slice(1).join(" ") + " " : "") + "We describe the model architecture, the training objective and the optimization schedule, and note where our choices depart from common practice. " + extra[2], size: 10.5 },
      { text: "4  Experiments", size: 12, bold: true, gap: 18 },
      { text: extra[1], size: 10.5 },
      { text: SECTION_TEXT.default[1], size: 10.5 },
      { text: "5  Limitations", size: 12, bold: true, gap: 18 },
      { text: "Our evaluation is restricted to English-language data from a limited number of sources. Hyperparameters were tuned on development sets that may not reflect deployment conditions, and compute constraints prevented exhaustive sweeps at the largest scales.", size: 10.5 },
      { text: "6  Conclusion", size: 12, bold: true, gap: 18 },
      { text: `We presented an empirical study and discussed its implications for practitioners. ${SECTION_TEXT.default[2]}`, size: 10.5 },
      { text: "References", size: 12, bold: true, gap: 18 },
      { text: "[1] A. Vaswani et al. Attention is all you need. NeurIPS, 2017.", size: 9 },
      { text: "[2] J. Devlin et al. BERT: Pre-training of deep bidirectional transformers for language understanding. NAACL, 2019.", size: 9 },
      { text: "[3] A. E. W. Johnson et al. MIMIC-III, a freely accessible critical care database. Scientific Data, 2016.", size: 9 },
      { text: "[4] I. Beltagy, M. E. Peters, and A. Cohan. Longformer: The long-document transformer. arXiv:2004.05150, 2020.", size: 9 },
    ];
    const { bytes, lines } = makePdf(blocks, { header: paper.cs ? `${paper.cs} ${paper.y}` : String(paper.y) });
    writeFile(path.join(dir, pdfName(paper, authors)), bytes, proj.timestampAdded);
    pdfLines.set(proj._id, lines);
    pdfCount++;
  }
}

// ---------- notes ----------
let noteCount = 0;
for (const note of NOTES(ctx)) {
  const pid = idOf(note.project);
  if (!pid) continue;
  const proj = projects.find((x) => x.proj._id === pid).proj;
  const t = Math.min(NOW - 3600000, proj.timestampAdded + (note.daysAfter ?? 1) * DAY);
  writeFile(path.join(STORAGE, pid, ...note.file.split("/")), note.content.trim() + "\n", t);
  noteCount++;
}
for (const ex of EXCALIDRAWS(ctx)) {
  const pid = idOf(ex.project);
  if (!pid) continue;
  const proj = projects.find((x) => x.proj._id === pid).proj;
  writeFile(path.join(STORAGE, pid, ex.file), JSON.stringify(ex.data, null, 2), Math.min(NOW - 7200000, proj.timestampAdded + 3 * DAY));
  noteCount++;
}
// empty folders people make and forget about
fs.mkdirSync(path.join(STORAGE, idOf("Mamba: Linear-Time Sequence Modeling with Selective State Spaces"), "figures"), { recursive: true });

// ---------- PDF annotations (legacy SA*.json store, migrated by the reader) ----------
const COLORS = ["#ffd400", "#ffd400", "#ffd400", "#ff6666", "#5fb236", "#2ea8e5", "#a28ae5"];
let annotCount = 0;
for (const [title, comments] of Object.entries(ANNOTATION_COMMENTS)) {
  const pid = idOf(title);
  const lines = pdfLines.get(pid);
  if (!pid || !lines) continue;
  const proj = byTitle.get(title);
  const body = lines.filter((l, i) => i > 4 && l.text.length > 50);
  comments.forEach((comment, k) => {
    const line = body[Math.min(body.length - 1, Math.floor(((k + 0.5) / comments.length) * body.length))];
    const id = "SA" + nid();
    const ts = proj.timestampAdded + (k + 1) * 3600000 * (1 + Math.floor(rnd() * 20));
    const annot = {
      _id: id,
      dataType: "pdfAnnotation",
      projectId: pid,
      pageNumber: line.page,
      content: comment,
      color: comment ? pick(COLORS) : "#ffd400",
      rects: [{ left: line.left, top: line.top, width: line.width, height: line.height }],
      type: k % 5 === 4 ? "underline" : "highlight",
      timestampAdded: ts,
      timestampModified: ts,
    };
    writeFile(path.join(STORAGE, ".sophosia", "pdfAnnotation", `${id}.json`), JSON.stringify(annot), Math.min(NOW, ts));
    annotCount++;
  });
}

// ---------- app state + layout ----------
const P = (t) => byTitle.get(t);
const mamba = P("Mamba: Linear-Time Sequence Modeling with Selective State Spaces");
const longClin = P("A Comparative Study of Pretrained Language Models for Long Clinical Text");
const lost = P("Lost in the Middle: How Language Models Use Long Contexts");
const longformer = P("Longformer: The Long-Document Transformer");
const opened = [longClin, mamba, lost, longformer].map((p) => p._id);

const appState = {
  _id: "appState",
  dataType: "appState",
  rightMenuSize: 0,
  selectedCategory: "library",
  currentItemId: "library",
  historyItemIds: ["library", longClin._id, mamba._id, "library"],
  openedProjectIds: opened,
  theme: "dark",
  fontSize: "16px",
  pdfTranslateEngine: "google",
  pdfTranslateApiKey: "",
  pdfTranslateLanguage: "fr",
  showTranslatedTitle: false,
  citeKeyRule: "author_year_title",
  pdfRenameRule: "author_year_fullTitle",
  projectIdRule: "uid",
};
writeFile(path.join(STORAGE, ".sophosia", "appState", "appState.json"), JSON.stringify(appState), NOW - 3600000);

const layout = {
  _id: "layout",
  dataType: "layout",
  layout: {
    id: "stack",
    type: "stack",
    children: [
      { id: "library", type: "LibraryPage", label: "library", visible: true },
      { id: longClin._id, type: "ReaderPage", label: pdfName(PAPERS.find((p) => p.t === longClin.title), longClin.author), visible: false },
      { id: `${mamba._id}/Reading notes.md`, type: "NotePage", label: "Reading notes.md", visible: false },
    ],
  },
};
writeFile(path.join(STORAGE, ".sophosia", "layout", "layout.json"), JSON.stringify(layout), NOW - 3600000);
writeFile(
  path.join(STORAGE, ".sophosia", "plugin", "plugin.json"),
  JSON.stringify({ _id: "plugin", dataType: "plugin", status: {} }),
  NOW - 90 * DAY
);

// ---------- app config (Tauri AppConfig dir) ----------
writeFile(
  path.join(CONFIG, "workspace.json"),
  JSON.stringify({
    storagePath: V_STORAGE,
    language: "en_US",
    lastScanTime: 0,
    storagePaths: [V_STORAGE, `${VHOME}/Dropbox/Sophosia-TA`],
  })
);
// second, smaller workspace listed in the workspace switcher
const TA = path.join(REAL_HOME, "Dropbox", "Sophosia-TA");
fs.mkdirSync(path.join(TA, ".sophosia", "appState"), { recursive: true });

console.log(`seeded ${projects.length} projects, ${pdfCount} PDFs, ${noteCount} notes, ${annotCount} annotations -> ${STORAGE}`);
