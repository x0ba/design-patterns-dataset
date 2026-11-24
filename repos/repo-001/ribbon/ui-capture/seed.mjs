// Seeds the local permalink store (stand-in for api.genomeribbon.com /v0/store KV).
// Entries are written exactly as the real API stores them: the POST body {name, ribbon: base64(deflate(json))}.
// Sources: the real permalink snapshots shipped in ./permalinks, plus a researcher's own saved views
// derived from them (different selected reads, filters, focus regions, names, dates).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const pako = require(path.join(ROOT, "node_modules/pako"));
const STORE = path.join(ROOT, ".ui-capture/store");
fs.rmSync(STORE, { recursive: true, force: true });
fs.mkdirSync(STORE, { recursive: true });

// deterministic RNG
let seed = 20261117;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const uuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
  const r = Math.floor(rnd() * 16); return (c === "x" ? r : (r & 3) | 8).toString(16);
});

const keyToFile = (k) => path.join(STORE, encodeURIComponent(k) + ".json");
function put(key, name, obj, created) {
  const ribbon = Buffer.from(pako.deflate(JSON.stringify(obj))).toString("base64");
  fs.writeFileSync(keyToFile(key), JSON.stringify({ name, ribbon, _created: created }));
}

const load = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "permalinks", f), "utf8"));
const SRC = {
  a549: "E_Illumina_deletion_in_A549_cell_line_(600KB).json",
  hg19: "E_hg19_against_GRCh38_(2MB).json",
  tra: "E_PacBio_SKBR3_TRA_chr16_to_chr19_(5MB).json",
  fusion: "E_SKBR3_CYTH1-EIF3H_gene_fusion_(11MB).json",
  gorilla: "E_Gorilla_against_GRCh38_(12MB).json",
};
const EXAMPLE_KEYS = {
  a549: "_ribbon/ilmn_deletion_a549",
  hg19: "_ribbon/grch38_vs_hg19",
  tra: "_ribbon/pacb_skbr3_tra",
  fusion: "_ribbon/pacb_skbr3_gene_fusion",
  gorilla: "_ribbon/grch38_vs_gorilla",
};

// 1) Public example permalinks, stored the way bin/create-permalink.js produces them (stringified file text)
const data = {};
for (const [k, f] of Object.entries(SRC)) {
  const text = fs.readFileSync(path.join(ROOT, "permalinks", f), "utf8");
  data[k] = JSON.parse(text);
  const ribbon = Buffer.from(pako.deflate(JSON.stringify(text))).toString("base64");
  fs.writeFileSync(keyToFile(EXAMPLE_KEYS[k]), JSON.stringify({ name: data[k].ribbon_perma.permalink_name, ribbon, _created: "2019-06-02T10:00:00Z" }));
}

// 2) The researcher's own saved views (as written by write_permalink() in the app)
const multi = (p) => p.alignments.map((r, i) => [r, i]).filter(([r]) => r.alignments.length > 1).map(([, i]) => i);
const VIEWS = [
  // [source, name, tweaks, iso date]
  ["fusion", "CYTH1-EIF3H fusion - split reads chr8:121.5M / chr17:76.7M (lab meeting)", { sel: 106 }, "2026-11-12T16:41:09-08:00"],
  ["fusion", "CYTH1-EIF3H - dotplot of longest spanning read", { dotplot: true, sort: "longest" }, "2026-11-12T17:03:55-08:00"],
  ["fusion", "SKBR3 fusion, MAPQ>=30 only", { mq: 30 }, "2026-11-10T09:15:22-08:00"],
  ["fusion", "EIF3H breakpoint w/ indels shown as numbers", { indels: "numbers", chroms: ["8", "17"] }, "2026-11-04T14:27:48-08:00"],
  ["fusion", "fusion reads sorted by # alignments - for Sam", { sort: "num_alignments", color: 2 }, "2026-10-29T11:52:01-07:00"],
  ["tra", "chr16-chr19 TRA, reciprocal? check both junctions", { sel: 23 }, "2026-10-21T10:08:37-07:00"],
  ["tra", "TRA chr16:79.86M -> chr19:30.39M  (sniffles id 1203)", { mq: 20 }, "2026-10-14T15:44:10-07:00"],
  ["tra", "SKBR3 t(16;19) dotplot", { dotplot: true }, "2026-10-14T15:58:26-07:00"],
  ["tra", "TRA reads colored alt palette for figure 3B", { color: 1, outline: true }, "2026-09-30T19:22:03-07:00"],
  ["a549", "A549 chr1:26.49M deletion - microhomology (Illumina PE)", { sel: 44 }, "2026-09-18T13:05:14-07:00"],
  ["a549", "A549 del, paired-end mode, discordant pairs", { mq: 10 }, "2026-09-17T09:31:47-07:00"],
  ["a549", "a549 deletion v2", { color: 3 }, "2026-09-02T16:10:59-07:00"],
  ["hg19", "liftover sanity check hg19 -> GRCh38 chr1", { sel: 81 }, "2026-08-21T11:40:30-07:00"],
  ["hg19", "hg19 vs GRCh38 contigs, dotplot", { dotplot: true }, "2026-08-21T11:47:12-07:00"],
  ["gorilla", "Gorilla vs GRCh38 - inversion near chr7 contig", { sel: 45 }, "2026-07-30T14:02:44-07:00"],
  ["gorilla", "gorilla assembly - Assemblytics 10kb coords, MAPQ 20", { mq: 20, sort: "longest" }, "2026-07-11T10:17:09-07:00"],
  ["gorilla", "Gorilla contigs w/ >=5 alignments (complex)", { minAligns: 5 }, "2026-06-25T17:55:33-07:00"],
  ["fusion", "SKBR3 PacBio - ERBB2 amplicon neighbourhood?? (revisit)", { color: 1, chroms: ["17", "8", "20"] }, "2026-06-03T09:12:40-07:00"],
  ["tra", "old TRA view before re-calling with sniffles 2", { mq: 0, color: 0 }, "2026-04-16T12:33:18-07:00"],
  ["a549", "A549 test", {}, "2026-03-09T08:58:02-08:00"],
];

const index = [];
for (const [src, name, t, date] of VIEWS) {
  const p = structuredClone(data[src].ribbon_perma);
  const s = p.config.settings;
  delete s.bam_url; // remote BAMs are not reachable offline; the snapshot itself carries the reads
  if (t.chroms) {
    p.alignments = p.alignments.filter((r) => r.alignments.some((a) => t.chroms.includes(String(a.r))));
  }
  const m = multi(p);
  p.config.selected_read = t.sel !== undefined && t.sel < p.alignments.length ? t.sel : (m.length ? pick(m) : 0);
  if (t.dotplot) s.ribbon_vs_dotplot = "dotplot";
  if (t.mq !== undefined) s.min_mapping_quality = t.mq;
  if (t.sort) s.feature_to_sort_reads = t.sort;
  if (t.indels) s.show_indels_as = t.indels;
  if (t.color !== undefined) s.color_index = t.color;
  if (t.outline) s.ribbon_outline = true;
  if (t.minAligns) s.min_num_alignments = t.minAligns;
  p.permalink_name = name;
  const key = `ribbon/${uuid()}`;
  put(key, name, { ribbon_perma: p }, date);
  index.push({ name, perma: key, date });
}
fs.writeFileSync(path.join(STORE, "_index.json"), JSON.stringify(index, null, 2));
console.log(`seeded ${Object.keys(EXAMPLE_KEYS).length} example + ${index.length} user permalinks into ${STORE}`);
console.log("entry permalink:", index[0].perma);
