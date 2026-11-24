// Generates realistic PrivacyProtect secret files (the only artifact the app
// produces) using the repo's own CLI (./cli.ts encrypt). Output goes to
// .ui-capture/out/secrets/<slug>.html; each opens to the "Reveal secret" page.
// Passwords are listed in .ui-capture/secrets.json.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CAP = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(CAP);
const OUT = join(CAP, "out", "secrets");
const SRC = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), "pp-src-"));
mkdirSync(OUT, { recursive: true });

const files = {
  "w2-2025-ortiz.csv": [
    "field,value",
    "employer,Brightline Logistics LLC",
    "employer_ein,84-2913307",
    "employee,Maya R. Ortiz",
    "ssn,***-**-4471",
    "box1_wages,\"98,412.55\"",
    "box2_fed_withheld,\"14,233.10\"",
    "box12a_D,\"11,500.00\"",
    "state,CA",
    "box17_state_tax,\"5,904.76\"",
  ].join("\n"),
  "recovery-codes-github.txt": [
    "GitHub recovery codes — maya-ortiz",
    "Generated 2026-03-04. Each code works once.",
    "",
    "4f1c2-9ab07", "d83e1-77c20", "0b6a9-e1f53", "a22d4-5c8e9",
    "71fe0-3b6d2", "c9a18-80f4e", "5e3b7-d0a61", "e60c2-14b9f",
    "2d9f5-a7e03", "b8c41-6f2d8", "93e7a-c51b0", "f05d6-2e8a4",
    "8a7b3-09d1c", "6c2e0-b4f97", "1d5a8-e3c62", "47b9f-0a2e5",
  ].join("\n"),
  "home-network.env": [
    "# Router admin + network config (ASUS RT-AX86U, hall closet)",
    "ROUTER_ADMIN_URL=http://192.168.50.1",
    "ROUTER_ADMIN_USER=admin",
    "ROUTER_ADMIN_PASS=Kp7#wQz!r2Lm",
    "WIFI_MAIN_SSID=Ortiz-Home-5G",
    "WIFI_MAIN_PSK=lemon-tree-harbor-1987",
    "WIFI_GUEST_SSID=Ortiz-Guest",
    "WIFI_GUEST_PSK=welcomefriends",
    "NAS_IP=192.168.50.20",
    "NAS_ADMIN_PASS=Synology!Backup2024",
  ].join("\n"),
  "lease-deposit-receipt.txt": [
    "RECEIPT — Security deposit",
    "Property: 2214 Fern St, Apt 3B, San Diego, CA 92104",
    "Tenant: Maya Ortiz & Daniel Kwan",
    "Amount: $3,150.00 (check #1182, Wells Fargo)",
    "Received: 2025-07-28 by Harbor View Property Mgmt (R. Patel)",
    "Deposit held at: Chase business acct ending 0937",
  ].join("\n"),
};
for (const [name, body] of Object.entries(files)) writeFileSync(join(SRC, name), body + "\n");

const secrets = [
  {
    slug: "wifi-guest-network",
    password: "harbor",
    hint: "Name of the street the beach house is on (lowercase).",
    message: "Guest WiFi for the Cardiff house\nSSID: Cardiff-Guest\nPassword: saltair-pelican-42\n\nRouter is in the hall closet if you need to power-cycle it.",
  },
  {
    slug: "netflix-family-login",
    password: "biscuit2019",
    hint: "Our first dog's name + the year we got her",
    message: "Netflix (family plan)\nemail: ortiz.household@gmail.com\npw: Tv-Night!Sundays\n\nPlease don't change the profile pics again 🙃",
  },
  {
    slug: "landlord-ach-details",
    password: "fern-3b-rent",
    hint: "street-unit-what this is for",
    message: "Harbor View Property Mgmt — ACH for rent\nBank: Chase\nRouting: 322271627\nAccount: 8840 1179 0937\nMemo: 2214 Fern 3B\n\nRent is due on the 1st, late after the 5th. $2,875/mo through July 2026.",
  },
  {
    slug: "mom-medicare-portal",
    password: "Rosalind1952",
    hint: "Mom's middle name and birth year, capitalized",
    message: "Medicare.gov account for Mom\nUsername: rosalind.ortiz52\nPassword: Garden$Path_77\nMedicare #: 1EG4-TE5-MK73\n\nSecurity Q (first car): Datsun\nPart D plan is Wellcare Value Script — renewal in October.",
  },
  {
    slug: "aws-root-breakglass",
    password: "copper-kettle-midnight-orbit",
    hint: "Four words from the sticky note in the office safe. Ask Priya if unsure.",
    message: "AWS root (break-glass ONLY — log usage in #infra-incidents)\nAccount ID: 4419-2083-7716\nEmail: aws-root@brightline-logistics.com\nPassword: 9w$Fh2!pLq#Zr7vX@kT3\nMFA: YubiKey #2 in the safe, serial 18264301\n\nRotate after any use. Last rotated 2026-08-12 by M. Ortiz.",
  },
  {
    slug: "ssh-deploy-passphrase",
    password: "tidepool",
    hint: "the staging cluster's codename",
    message: "Passphrase for ~/.ssh/deploy_ed25519 (staging + prod bastion):\nmangrove-quarry-71-ledger\n\nFingerprint: SHA256:q3Vt8xZ1nP0bE6yFk2LwR9sJ4mH7cD5aG1uT0oI8eWs",
  },
  {
    slug: "safe-deposit-box",
    password: "1987kwan",
    hint: "year + Daniel's last name",
    message: "Safe deposit box #412, US Bank, University Ave branch.\nKeys: one in the desk drawer (taped under), one with Aunt Lucia.\nContents: passports, birth certificates, house deed copy, grandpa's watch.",
  },
  {
    slug: "garage-and-alarm-codes",
    password: "otter",
    hint: "Lily's favorite animal at the aquarium",
    message: "Garage keypad: 5821 then ENTER\nAlarm disarm: 0614\nDuress code (silent alarm): 0615 — don't use unless you mean it!\nSpare key: lockbox on the side gate, code 3390",
  },
  {
    slug: "freelance-client-ftp",
    password: "Sunset-Cliffs-24",
    hint: "where we had the kickoff dinner, + year",
    message: "Tidewater Coffee Co. — SFTP for brand assets\nHost: sftp.tidewatercoffee.com:2222\nUser: mortiz-design\nPass: Br3w!ng_Assets#9\n\nUpload finals to /incoming/2026-fall-campaign. They want PNG + layered PSD.",
  },
  {
    slug: "crypto-wallet-seed",
    password: "never-type-this-online-ever",
    hint: "",
    message: "Ledger Nano X — recovery phrase (24 words)\n\n1 orbit 2 velvet 3 canyon 4 maple 5 relief 6 shadow\n7 cereal 8 humble 9 drift 10 lantern 11 opera 12 tiger\n13 absorb 14 nephew 15 silk 16 rival 17 glimpse 18 vapor\n19 harbor 20 stem 21 rescue 22 fabric 23 pilot 24 zone\n\nPIN is on paper in the safe deposit box, NOT here.",
  },
  { slug: "w2-2025-ortiz", password: "taxes-2025-maya", hint: "taxes-year-name", file: "w2-2025-ortiz.csv" },
  { slug: "github-recovery-codes", password: "octocat-backup", hint: "GitHub mascot + what these are", file: "recovery-codes-github.txt" },
  { slug: "home-network-config", password: "lemon-tree", hint: "What's in the backyard (two words, dash)", file: "home-network.env" },
  { slug: "lease-deposit-receipt", password: "fern-3b-rent", hint: "same as the rent one", file: "lease-deposit-receipt.txt" },
];

const index = [];
for (const s of secrets) {
  const out = join(OUT, `${s.slug}.html`);
  const args = ["--loader", "ts-node/esm", "cli.ts", "encrypt"];
  if (s.file) args.push("-f", join(SRC, s.file));
  else args.push("-m", s.message);
  if (s.hint) args.push("--hint", s.hint);
  args.push("-p", s.password, out);
  execFileSync("node", args, { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  index.push({ path: `/secrets/${s.slug}.html`, type: s.file ? "File" : "Message", password: s.password, hint: s.hint || null });
  console.log("wrote", out);
}
writeFileSync(join(CAP, "secrets.json"), JSON.stringify(index, null, 2) + "\n");
