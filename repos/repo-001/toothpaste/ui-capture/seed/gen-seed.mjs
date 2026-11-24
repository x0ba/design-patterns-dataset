// Generates seed-data.json for the browser-side seeder (seed.js).
// Uses the app's own DuckyscriptParser (bundled with esbuild from web/src) so the stored
// ast/errors/estimatedTime match exactly what DuckyscriptService.saveScript() would store.
// Usage: node gen-seed.mjs <outFile>
import { build } from "../../web/node_modules/esbuild/lib/main.js";
import { createECDH, randomBytes, createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SCRIPTS } from "./scripts-content.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = process.argv[2];
const tmp = join(process.env.TMPDIR || "/tmp", "toothpaste-parser.mjs");
await build({
  entryPoints: [join(here, "../../web/src/services/duckyscript/DuckyscriptParser.ts")],
  bundle: true, format: "esm", platform: "neutral", outfile: tmp, logLevel: "warning",
});
const { parseDuckyscript, estimateExecutionTime } = await import(pathToFileURL(tmp).href + "?" + Date.now());

const NOW = Date.UTC(2026, 10, 17, 17, 30, 0); // 2026-11-17
const DAY = 86400000;
// deterministic pseudo-random
let s = 1337;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const id9 = () => Array.from({ length: 9 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(rnd() * 36)]).join("");
const jitter = () => Math.floor((rnd() * 10 - 3) * 3600000); // working-hours-ish spread

const scripts = SCRIPTS.map(([name, createdAgo, updatedAgo, content]) => {
  const createdAt = NOW - createdAgo * DAY + jitter();
  const updatedAt = Math.max(createdAt, NOW - updatedAgo * DAY + jitter());
  const pr = parseDuckyscript(content);
  return {
    id: `script-${createdAt}-${id9()}`, name, content, createdAt, updatedAt,
    ast: pr.ast, errors: pr.errors, estimatedTime: estimateExecutionTime(pr.ast),
  };
});
// DuckyscriptService appends to the index on every save, so the index is ordered by last save.
const index = [...scripts].sort((a, b) => a.updatedAt - b.updatedAt).map((sc) => ({
  id: sc.id, name: sc.name, createdAt: sc.createdAt, updatedAt: sc.updatedAt,
  estimatedTime: sc.estimatedTime, lineCount: sc.content.split("\n").length, hasErrors: sc.errors.length > 0,
}));
const scriptData = { "scripts-index": index };
for (const sc of scripts) scriptData[sc.id] = sc;

// Paired ToothPaste devices: keys as ECDHContext.processPeerKeyAndGenerateSharedSecret stores them.
// The first one is the device the Web Bluetooth stub (ble-stub.js) presents.
const DEVICES = [
  { mac: "f4122fa8c3d1", name: "ToothPaste Desk" },
  { mac: "48ca43b9e10a", name: "Rack KVM" },
  { mac: "dc5475c0f2e8", name: "Laptop Bag" },
];
const deviceRecords = DEVICES.map(({ mac }) => {
  const self = createECDH("prime256v1"); self.generateKeys();
  const peer = createECDH("prime256v1"); peer.generateKeys();
  return {
    clientID: mac,
    data: {
      PeerPublicKey: peer.getPublicKey().toString("base64"),
      SelfPublicKey: self.getPublicKey().toString("base64"),
      sharedSecret: self.computeSecret(peer.getPublicKey()).toString("base64"),
    },
  };
});

const seed = {
  version: createHash("sha256").update(JSON.stringify([scriptData, DEVICES])).digest("hex").slice(0, 12),
  localStorage: {
    quickstart_viewed: "true",
    __EncryptedStorage_AuthScheme__: "passwordless",
  },
  devices: DEVICES,
  records: [{ clientID: "duckyscript-scripts", data: scriptData }, ...deviceRecords],
};
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(seed));
console.log(`[seed] ${scripts.length} scripts (${scripts.filter((x) => x.errors.length).length} with errors), ${DEVICES.length} paired devices -> ${outFile}`);
for (const sc of scripts.filter((x) => x.errors.length)) console.log("   errors:", sc.name, JSON.stringify(sc.errors.map((e) => e.message)));
