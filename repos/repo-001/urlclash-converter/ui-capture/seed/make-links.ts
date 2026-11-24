// Uses the app's own converter to turn the generated subscription YAML into a
// link-list subscription (plain + base64), as an airport would serve it.
import fs from "node:fs";
import path from "node:path";
import { clashToLink } from "../../src/converter";
const out = process.argv[2];
const yaml = fs.readFileSync(path.join(out, "sub", "nebula-clash.yaml"), "utf8");
const r = await clashToLink(yaml);
if (!r.success) throw new Error("convert failed: " + r.data);
fs.writeFileSync(path.join(out, "sub", "nebula-links.txt"), r.data + "\n");
fs.writeFileSync(path.join(out, "sub", "nebula-base64.txt"), Buffer.from(r.data).toString("base64"));
console.log("links:", r.data.split("\n").length);
