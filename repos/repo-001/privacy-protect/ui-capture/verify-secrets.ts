// Decrypts every generated secret with the app's own decrypt + strToConfig
// (same code path the in-browser "Reveal secret" page uses).
import { webcrypto } from "crypto";
import { readFileSync } from "fs";
import { decrypt } from "../src/lib/decrypt.js";
import { strToConfig } from "../src/lib/template-secret.js";

const index = JSON.parse(readFileSync(".ui-capture/secrets.json", "utf-8"));
for (const s of index) {
  const html = readFileSync(`.ui-capture/out${s.path}`, "utf-8");
  const raw = /^ {2}var CONFIG = `(.+)`;$/m.exec(html)?.[1];
  const config = strToConfig(raw)!;
  const [res] = await decrypt({
    ...config,
    payloads: config.payloads.map((p) => ({ ...p, password: s.password })),
    subtle: webcrypto.subtle as never,
  });
  const text = res.cipherText ? new TextDecoder().decode(res.cipherText) : "FAILED";
  console.log(s.path, "=>", text.split("\n")[0]);
}
