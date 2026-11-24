// Generates realistic seed data for the converter:
//   <out>/seed/clash-config.yaml   – a long-lived mihomo config (airport subscription + self-hosted nodes)
//   <out>/sub/*.yaml|txt           – local stand-ins for subscription URLs (used by "Load URL")
// Deterministic (seeded PRNG) so re-runs produce identical output.
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2];
if (!out) throw new Error("usage: node generate.mjs <outDir>");

let s = 20240611;
const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const hex = (n) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(rnd() * 16)]).join("");
const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(["8", "9", "a", "b"])}${hex(3)}-${hex(12)}`;
const b64 = (n) => {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  return Array.from({ length: n }, () => c[Math.floor(rnd() * 64)]).join("");
};
const b64url = (n) => b64(n).replace(/\+/g, "-").replace(/\//g, "_");
const q = (v) => (/^[\w.\-/]+$/.test(String(v)) ? String(v) : JSON.stringify(String(v)));

// ---- Airport subscription ("星河云 Nebula") -------------------------------------------
const regions = [
  { flag: "🇭🇰", zh: "香港", n: 9, tags: ["IEPL", "BGP", "HKT", "HGC", ""] },
  { flag: "🇯🇵", zh: "日本", n: 7, tags: ["东京", "大阪", "IIJ", "原生IP", ""] },
  { flag: "🇸🇬", zh: "新加坡", n: 5, tags: ["IEPL", "Ox", ""] },
  { flag: "🇺🇸", zh: "美国", n: 7, tags: ["洛杉矶", "圣何塞", "西雅图", "原生IP", "家宽"] },
  { flag: "🇹🇼", zh: "台湾", n: 4, tags: ["Hinet", "家宽", ""] },
  { flag: "🇰🇷", zh: "韩国", n: 3, tags: ["首尔", ""] },
  { flag: "🇬🇧", zh: "英国", n: 2, tags: ["伦敦"] },
  { flag: "🇩🇪", zh: "德国", n: 2, tags: ["法兰克福"] },
  { flag: "🇹🇷", zh: "土耳其", n: 1, tags: ["伊斯坦布尔"] },
  { flag: "🇦🇷", zh: "阿根廷", n: 1, tags: [""] },
];
const relayHosts = ["gz-cm.relay.nebulaxy.net", "sh-ct.relay.nebulaxy.net", "bj-cu.relay.nebulaxy.net", "sz-cmi.nbx-edge.com"];
const airportPw = uuid();
const airport = [];
airport.push({ name: "剩余流量：183.62 GB", type: "ss", server: "info.nebulaxy.net", port: 10086, cipher: "aes-128-gcm", password: airportPw });
airport.push({ name: "距离下次重置剩余：13 天", type: "ss", server: "info.nebulaxy.net", port: 10086, cipher: "aes-128-gcm", password: airportPw });
airport.push({ name: "套餐到期：2027-03-14", type: "ss", server: "info.nebulaxy.net", port: 10086, cipher: "aes-128-gcm", password: airportPw });
for (const r of regions) {
  for (let i = 1; i <= r.n; i++) {
    const tag = pick(r.tags);
    const rate = pick(["", "", "", " [1.5x]", " [0.5x]", " [2x]"]);
    const name = `${r.flag} ${r.zh} ${String(i).padStart(2, "0")}${tag ? " | " + tag : ""}${rate}`;
    const server = pick(relayHosts);
    const port = 20000 + Math.floor(rnd() * 40000);
    const kind = rnd();
    if (kind < 0.45) {
      const cipher = pick(["aes-256-gcm", "chacha20-ietf-poly1305", "2022-blake3-aes-128-gcm"]);
      airport.push({ name, type: "ss", server, port, cipher, password: cipher.startsWith("2022") ? b64(22) + "==" : airportPw, udp: true });
    } else if (kind < 0.7) {
      airport.push({ name, type: "trojan", server, port, password: airportPw, udp: true, sni: "cdn.nebulaxy.net", "skip-cert-verify": rnd() < 0.3 });
    } else if (kind < 0.9) {
      airport.push({
        name, type: "vmess", server, port, uuid: airportPw, alterId: 0, cipher: "auto", udp: true, tls: true,
        network: "ws", servername: "cdn.nebulaxy.net",
        "ws-opts": { path: `/nbx${hex(6)}`, headers: { Host: "cdn.nebulaxy.net" } },
      });
    } else {
      airport.push({ name, type: "hysteria2", server: server.replace("relay", "hy2"), port: 443, password: airportPw, sni: "hy2.nebulaxy.net", "skip-cert-verify": false, up: "50 Mbps", down: "200 Mbps" });
    }
  }
}

// ---- Self-hosted nodes (personal VPSes built up over the year) ------------------------
const selfHosted = [
  {
    name: "🏠 RackNerd LA · Reality", type: "vless", server: "198.46.211.37", port: 443, uuid: uuid(), network: "tcp", tls: true, udp: true,
    flow: "xtls-rprx-vision", servername: "www.microsoft.com", "client-fingerprint": "chrome",
    "reality-opts": { "public-key": b64url(43), "short-id": hex(8) },
  },
  {
    name: "🏠 Vultr Tokyo · Reality gRPC", type: "vless", server: "45.76.202.118", port: 8443, uuid: uuid(), network: "grpc", tls: true, udp: true,
    servername: "www.lovelive-anime.jp", "client-fingerprint": "safari",
    "reality-opts": { "public-key": b64url(43), "short-id": hex(6) },
    "grpc-opts": { "grpc-service-name": "tun" },
  },
  {
    name: "🏠 BandwagonHost CN2 GIA · Hy2", type: "hysteria2", server: "dc6.bwg.lin-wenjie.dev", port: 34127, password: b64url(22),
    sni: "dc6.bwg.lin-wenjie.dev", alpn: ["h3"], obfs: "salamander", "obfs-password": b64url(16), up: "30 Mbps", down: "150 Mbps",
  },
  {
    name: "🏠 Oracle 首尔 ARM · TUIC", type: "tuic", server: "kr.lin-wenjie.dev", port: 15443, uuid: uuid(), password: b64url(16),
    "congestion-controller": "bbr", "udp-relay-mode": "native", alpn: ["h3"], sni: "kr.lin-wenjie.dev", "reduce-rtt": true,
  },
  {
    name: "🏠 Hetzner FSN · AnyTLS", type: "anytls", server: "fsn1.lin-wenjie.dev", port: 443, password: b64url(24),
    sni: "fsn1.lin-wenjie.dev", "client-fingerprint": "chrome", udp: true, "skip-cert-verify": false,
  },
  {
    name: "🏠 Cloudflare CDN · VMess WS", type: "vmess", server: "104.21.63.44", port: 2096, uuid: uuid(), alterId: 0, cipher: "auto",
    tls: true, network: "ws", servername: "cf.lin-wenjie.dev",
    "ws-opts": { path: "/ray?ed=2048", headers: { Host: "cf.lin-wenjie.dev" } },
  },
  {
    name: "🏠 Cloudflare CDN · Trojan WS", type: "trojan", server: "icook.tw", port: 443, password: b64url(18), network: "ws",
    sni: "tj.lin-wenjie.dev", "ws-opts": { path: "/trws", headers: { Host: "tj.lin-wenjie.dev" } }, udp: true,
  },
  {
    name: "🏡 家里 WireGuard (上海电信)", type: "wireguard", server: "home.lin-wenjie.dev", port: 51820, ip: "10.13.13.4",
    "private-key": b64(43) + "=", "public-key": b64(43) + "=", "allowed-ips": ["0.0.0.0/0"], mtu: 1420, udp: true,
  },
  {
    name: "🏠 DMIT HK · SS2022", type: "ss", server: "103.135.249.12", port: 52011, cipher: "2022-blake3-aes-256-gcm",
    password: b64(43) + "=", udp: true,
  },
  {
    name: "🏠 旧 SSR (搬瓦工 2021, 已失效?)", type: "ssr", server: "172.93.47.201", port: 8389, cipher: "chacha20-ietf", password: "Wj@2021ssr",
    obfs: "tls1.2_ticket_auth", protocol: "auth_aes128_md5", "obfs-param": "download.windowsupdate.com", "protocol-param": "",
  },
  {
    name: "🏢 公司 HTTP 代理", type: "http", server: "proxy.corp.hengtai-tech.cn", port: 3128, username: "lin.wenjie", password: "Ht#2026q3", tls: false,
  },
  {
    name: "🏢 公司 SOCKS5 跳板", type: "socks5", server: "10.20.8.15", port: 1080, username: "ops", password: "jump-8f3k", udp: true,
  },
];

const allNames = [...airport.map((p) => p.name), ...selfHosted.map((p) => p.name)];
const nodeNames = airport.slice(3).map((p) => p.name);
const byRegion = (zh) => nodeNames.filter((n) => n.includes(zh));

// ---- YAML emitter (flow-style mappings per proxy, like most subscription outputs) ----
const flow = (o) =>
  "{ " + Object.entries(o).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: [${v.map(q).join(", ")}]`;
    if (v && typeof v === "object") return `${k}: ${flow(v)}`;
    return `${k}: ${typeof v === "string" ? q(v) : v}`;
  }).join(", ") + " }";

const groups = [
  { name: "🚀 节点选择", type: "select", proxies: ["♻️ 自动选择", "🇭🇰 香港节点", "🇯🇵 日本节点", "🇸🇬 狮城节点", "🇺🇸 美国节点", "🏠 自建", "DIRECT"] },
  { name: "♻️ 自动选择", type: "url-test", url: "https://www.gstatic.com/generate_204", interval: 300, tolerance: 50, proxies: nodeNames },
  { name: "🏠 自建", type: "select", proxies: selfHosted.map((p) => p.name) },
  { name: "🤖 AI 服务", type: "select", proxies: ["🇺🇸 美国节点", "🏠 RackNerd LA · Reality", "🇯🇵 日本节点", "🇸🇬 狮城节点"] },
  { name: "📺 YouTube", type: "select", proxies: ["🚀 节点选择", "🇭🇰 香港节点", "🇸🇬 狮城节点"] },
  { name: "🎮 Steam", type: "select", proxies: ["DIRECT", "🇭🇰 香港节点", "🇯🇵 日本节点"] },
  { name: "🍎 Apple", type: "select", proxies: ["DIRECT", "🚀 节点选择"] },
  { name: "🇭🇰 香港节点", type: "url-test", url: "https://www.gstatic.com/generate_204", interval: 300, proxies: byRegion("香港") },
  { name: "🇯🇵 日本节点", type: "url-test", url: "https://www.gstatic.com/generate_204", interval: 300, proxies: byRegion("日本") },
  { name: "🇸🇬 狮城节点", type: "url-test", url: "https://www.gstatic.com/generate_204", interval: 300, proxies: byRegion("新加坡") },
  { name: "🇺🇸 美国节点", type: "fallback", url: "https://www.gstatic.com/generate_204", interval: 300, proxies: byRegion("美国") },
  { name: "🐟 漏网之鱼", type: "select", proxies: ["🚀 节点选择", "DIRECT"] },
];

const rules = [
  "DOMAIN-SUFFIX,lin-wenjie.dev,DIRECT",
  "DOMAIN-SUFFIX,hengtai-tech.cn,🏢 公司 HTTP 代理",
  "IP-CIDR,10.20.0.0/16,🏢 公司 SOCKS5 跳板,no-resolve",
  "DOMAIN-SUFFIX,openai.com,🤖 AI 服务",
  "DOMAIN-SUFFIX,chatgpt.com,🤖 AI 服务",
  "DOMAIN-SUFFIX,anthropic.com,🤖 AI 服务",
  "DOMAIN-SUFFIX,claude.ai,🤖 AI 服务",
  "DOMAIN-SUFFIX,gemini.google.com,🤖 AI 服务",
  "GEOSITE,youtube,📺 YouTube",
  "DOMAIN-SUFFIX,steamserver.net,DIRECT",
  "GEOSITE,steam,🎮 Steam",
  "GEOSITE,apple-cn,DIRECT",
  "GEOSITE,apple,🍎 Apple",
  "GEOSITE,github,🚀 节点选择",
  "GEOSITE,telegram,🚀 节点选择",
  "GEOIP,telegram,🚀 节点选择,no-resolve",
  "GEOSITE,private,DIRECT",
  "GEOSITE,cn,DIRECT",
  "GEOIP,LAN,DIRECT,no-resolve",
  "GEOIP,CN,DIRECT,no-resolve",
  "MATCH,🐟 漏网之鱼",
];

const lines = [];
lines.push("# Mihomo 配置 · MacBook Pro (lin)");
lines.push("# 订阅: 星河云 Nebula Pro 年付  |  自建节点手动维护");
lines.push("# 最后更新: 2026-11-12  ——  TODO: 旧 SSR 节点确认失效后删掉");
lines.push("mixed-port: 7890");
lines.push("allow-lan: false");
lines.push("mode: rule");
lines.push("log-level: warning");
lines.push("ipv6: false");
lines.push("unified-delay: true");
lines.push("tcp-concurrent: true");
lines.push("external-controller: 127.0.0.1:9090");
lines.push("geodata-mode: true");
lines.push("");
lines.push("dns:");
lines.push("  enable: true");
lines.push("  enhanced-mode: fake-ip");
lines.push("  fake-ip-range: 198.18.0.1/16");
lines.push("  nameserver:");
lines.push("    - https://doh.pub/dns-query");
lines.push("    - https://dns.alidns.com/dns-query");
lines.push("  fallback:");
lines.push("    - https://1.1.1.1/dns-query");
lines.push("    - tls://8.8.4.4:853");
lines.push("");
lines.push("proxies:");
lines.push("  # ---------- 自建 ----------");
for (const p of selfHosted) lines.push("  - " + flow(p));
lines.push("  # ---------- 星河云 Nebula (订阅更新于 2026-11-12 08:31) ----------");
for (const p of airport) lines.push("  - " + flow(p));
lines.push("");
lines.push("proxy-groups:");
for (const g of groups) {
  lines.push(`  - name: ${q(g.name)}`);
  lines.push(`    type: ${g.type}`);
  if (g.url) lines.push(`    url: ${g.url}`);
  if (g.interval) lines.push(`    interval: ${g.interval}`);
  if (g.tolerance) lines.push(`    tolerance: ${g.tolerance}`);
  lines.push("    proxies:");
  for (const n of g.proxies) lines.push(`      - ${q(n)}`);
}
lines.push("");
lines.push("rules:");
for (const r of rules) lines.push(`  - ${r}`);
const config = lines.join("\n") + "\n";

// Subscription stand-ins: plain clash "proxies:" yaml, and a base64 link list for the links column.
const subYaml = "proxies:\n" + airport.map((p) => "  - " + flow(p)).join("\n") + "\n";

fs.mkdirSync(path.join(out, "seed"), { recursive: true });
fs.mkdirSync(path.join(out, "sub"), { recursive: true });
fs.writeFileSync(path.join(out, "seed", "clash-config.yaml"), config);
fs.writeFileSync(path.join(out, "sub", "nebula-clash.yaml"), subYaml);
fs.writeFileSync(path.join(out, "sub", "selfhosted-clash.yaml"), "proxies:\n" + selfHosted.map((p) => "  - " + flow(p)).join("\n") + "\n");
console.log(`seed: ${allNames.length} proxies (${airport.length} airport, ${selfHosted.length} self-hosted), ${groups.length} groups, ${rules.length} rules`);
