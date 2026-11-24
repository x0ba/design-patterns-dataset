#!/usr/bin/env node
// Placeholder provider config files an established user's machine has:
// ~/.codex/auth.json (ChatGPT Pro login, placeholder unsigned JWTs).
// The matching network endpoints are answered by stubs/provider-stub.cjs.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const home = path.resolve(process.argv[2]);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const authNs = {
  chatgpt_account_id: "8c1f3e2a-5b7d-4e19-a0c4-2f6d9b8e71aa",
  chatgpt_plan_type: "pro",
  chatgpt_subscription_active_start: "2026-03-02T18:11:40+00:00",
  chatgpt_subscription_active_until: "2026-12-02T18:11:40+00:00",
  chatgpt_subscription_last_checked: new Date().toISOString(),
};
const jwt = (payload) => `${b64({ alg: "none", typ: "JWT" })}.${b64(payload)}.local-placeholder`;
const codexDir = path.join(home, ".codex");
fs.mkdirSync(codexDir, { recursive: true });
fs.writeFileSync(path.join(codexDir, "auth.json"), JSON.stringify({
  OPENAI_API_KEY: null,
  tokens: {
    id_token: jwt({ iss: "https://auth.openai.com", aud: ["app_EMoamEEZ73f0CkXaXp7hrann"], email: "dmin@harborline.dev", exp: now + 10 * 86400, "https://api.openai.com/auth": authNs }),
    access_token: jwt({ iss: "https://auth.openai.com", exp: now + 10 * 86400, "https://api.openai.com/auth": authNs }),
    refresh_token: "rt_local_placeholder",
    account_id: authNs.chatgpt_account_id,
  },
  last_refresh: new Date().toISOString(),
}, null, 2));
console.log("provider config written");
