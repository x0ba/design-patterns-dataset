import { getDatabase } from "../database/init.ts";
import { resolveInDataRoot } from "../utils/dataPaths.ts";
import { generateUUID } from "../utils/uuid.ts";
import { parse as parseYaml } from "yaml";
import { dirname, isAbsolute, normalize, relative, resolve } from "std/path";
import { ZipReader } from "https://deno.land/x/zipjs@v2.7.34/index.js";
async function fetchText(url) {
  const res = await safeFetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return await res.text();
}
async function fetchBytes(url) {
  const res = await safeFetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}
async function sha256Hex(source) {
  const buffer = source instanceof Uint8Array ? source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) : source.slice(0);
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash)).map((b)=>b.toString(16).padStart(2, "0")).join("");
}
function basicHtmlSanity(html) {
  const lower = html.toLowerCase();
  // Block dangerous embed containers and executable script tags.
  const bannedTags = [
    "<iframe",
    "<object",
    "<embed",
    "<script"
  ];
  for (const tag of bannedTags){
    if (lower.includes(tag)) {
      throw new Error(`HTML contains disallowed tag: ${tag}`);
    }
  }
  // Disallow inline event handlers (attribute boundary)
  if (/(\s|<)on[a-z]+\s*=\s*['\"]/i.test(lower)) {
    throw new Error("Inline event handlers not allowed");
  }
}
function assertManifestShape(m) {
  if (!m || typeof m !== "object") {
    throw new Error("Manifest must be an object");
  }
  const r = m;
  for (const k of [
    "id",
    "name",
    "version",
    "invio",
    "html"
  ]){
    if (!(k in r)) throw new Error(`Manifest missing ${k}`);
  }
  const html = r.html;
  if (!html || typeof html.path !== "string" || typeof html.url !== "string") {
    throw new Error("html.path and html.url are required");
  }
  if (!String(html.url).startsWith("http")) {
    throw new Error("html.url must be http(s)");
  }
}
const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
function enforceSafeIdentifier(value, field) {
  const trimmed = value.trim();
  if (!SAFE_ID_PATTERN.test(trimmed)) {
    throw new Error(`${field} must be 1-64 characters using letters, numbers, dashes, underscores, or dots`);
  }
  return trimmed;
}
function sanitizeManifestPath(pathValue) {
  const trimmed = pathValue.trim();
  if (!trimmed) {
    throw new Error("html.path must not be empty");
  }
  if (isAbsolute(trimmed)) {
    throw new Error("html.path must be relative");
  }
  const unixified = trimmed.replaceAll("\\", "/");
  const normalized = normalize(unixified);
  if (!normalized || normalized.startsWith("..") || normalized.includes("/../")) {
    throw new Error("html.path must stay within the template directory");
  }
  return normalized;
}
const FORBIDDEN_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1"
]);
function isPrivateIPv4(hostname) {
  const parts = hostname.split(".").map((p)=>Number(p));
  if (parts.length !== 4 || parts.some((n)=>Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  // CGNAT / carrier-grade NAT (RFC 6598) — internal in shared-hosting envs.
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}
// Normalize an IPv6 literal the way URL.hostname returns it: it is wrapped in
// square brackets (e.g. "[::1]"). Strip them so range checks see the raw
// address. Returns the lower-cased address without brackets.
function stripIpv6Brackets(hostname) {
  const lower = hostname.toLowerCase();
  if (lower.startsWith("[") && lower.endsWith("]")) {
    return lower.slice(1, -1);
  }
  return lower;
}
function isPrivateIPv6(hostname) {
  const addr = stripIpv6Brackets(hostname);
  if (!addr.includes(":")) return false; // not an IPv6 literal
  // Loopback ::1 and the unspecified address ::
  if (addr === "::1" || addr === "::") return true;
  // IPv4-mapped (::ffff:a.b.c.d / ::ffff:7f00:1) and IPv4-compatible / NAT64 /
  // 6to4 all embed an IPv4 address — extract and re-check against IPv4 rules.
  const mappedV4 = extractEmbeddedIPv4(addr);
  if (mappedV4 && isPrivateIPv4(mappedV4)) return true;
  // Unique-local fc00::/7 (fc.. and fd..) and link-local fe80::/10.
  if (/^f[cd][0-9a-f]{0,2}:/.test(addr) || addr === "fc00" || addr === "fd00") {
    return true;
  }
  if (/^fe[89ab][0-9a-f]?:/.test(addr)) return true;
  return false;
}
// Pull an embedded IPv4 address out of IPv4-mapped/compatible/NAT64/6to4 IPv6
// forms so it can be validated against the IPv4 private ranges.
function extractEmbeddedIPv4(addr) {
  // Dotted-quad tail, e.g. ::ffff:127.0.0.1 or 64:ff9b::127.0.0.1
  const dotted = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dotted) return dotted[1];
  // Hextet-encoded IPv4-mapped, e.g. ::ffff:7f00:1 -> 127.0.0.1
  const mapped = addr.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mapped) {
    const hi = parseInt(mapped[1], 16);
    const lo = parseInt(mapped[2], 16);
    return `${hi >> 8 & 0xff}.${hi & 0xff}.${lo >> 8 & 0xff}.${lo & 0xff}`;
  }
  // 6to4 2002:V4V4::/16 and NAT64 64:ff9b::V4V4 first two hextets after prefix.
  const sixToFour = addr.match(/^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})/);
  if (sixToFour) {
    const hi = parseInt(sixToFour[1], 16);
    const lo = parseInt(sixToFour[2], 16);
    return `${hi >> 8 & 0xff}.${hi & 0xff}.${lo >> 8 & 0xff}.${lo & 0xff}`;
  }
  return null;
}
// True if a literal/resolved IP string targets an internal range.
function isForbiddenAddress(host) {
  const h = host.toLowerCase();
  if (FORBIDDEN_HOSTS.has(h)) return true;
  const bare = stripIpv6Brackets(h);
  if (FORBIDDEN_HOSTS.has(bare)) return true;
  if (isPrivateIPv4(bare) || isPrivateIPv6(h)) return true;
  return false;
}
async function assertSafeRemoteUrl(raw, field) {
  let url;
  try {
    url = new URL(raw);
  } catch  {
    throw new Error(`${field} is not a valid URL`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`${field} must use https`);
  }
  // 1) Reject internal targets supplied directly as host literals.
  if (isForbiddenAddress(url.hostname)) {
    throw new Error(`${field} host is not allowed`);
  }
  // 2) Resolve the hostname and reject if ANY resolved address is internal.
  //    Defeats DNS-rebinding / A-record-points-internal SSRF. If the host is
  //    already an IP literal, resolveDns is skipped (it would error).
  const bare = stripIpv6Brackets(url.hostname);
  const looksLikeIp = bare.includes(":") || /^\d{1,3}(\.\d{1,3}){3}$/.test(bare);
  if (!looksLikeIp) {
    let addrs = [];
    for (const kind of [
      "A",
      "AAAA"
    ]){
      try {
        addrs = addrs.concat(await Deno.resolveDns(bare, kind));
      } catch  {
      // No record of this type; ignore.
      }
    }
    for (const ip of addrs){
      if (isForbiddenAddress(ip)) {
        throw new Error(`${field} resolves to a disallowed address`);
      }
    }
  }
  return url;
}
// fetch() wrapper that follows redirects MANUALLY and re-validates every hop,
// so a public host cannot 30x-redirect the request into an internal target.
async function safeFetch(url, maxRedirects = 5) {
  let current = url;
  for(let hop = 0; hop <= maxRedirects; hop++){
    const res = await fetch(current, {
      redirect: "manual"
    });
    if (res.status >= 300 && res.status < 400 && res.headers.has("location")) {
      // Drain the redirect body to release the connection.
      await res.body?.cancel();
      const loc = res.headers.get("location");
      const next = new URL(loc, current);
      // Re-run the full guard (protocol + literal + DNS) on the next target.
      current = await assertSafeRemoteUrl(next.toString(), "redirect target");
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects");
}
export async function installTemplateFromManifest(manifestUrl) {
  const manifestUrlObj = await assertSafeRemoteUrl(manifestUrl, "manifest URL");
  const text = await fetchText(manifestUrlObj);
  let manifest;
  try {
    manifest = parseYaml(text);
  } catch (_e) {
    try {
      manifest = JSON.parse(text);
    } catch  {
      throw new Error("Manifest parse failed");
    }
  }
  assertManifestShape(manifest);
  const manifestId = enforceSafeIdentifier(manifest.id, "manifest.id");
  const manifestVersion = enforceSafeIdentifier(manifest.version, "manifest.version");
  const manifestPath = sanitizeManifestPath(String(manifest.html.path));
  const htmlUrl = await assertSafeRemoteUrl(String(manifest.html.url), "manifest.html.url");
  const htmlBuf = await fetchBytes(htmlUrl);
  if (htmlBuf.byteLength > 128 * 1024) {
    throw new Error("HTML too large (>128KB)");
  }
  if (manifest.html.sha256 && manifest.html.sha256.trim()) {
    const digest = await sha256Hex(htmlBuf);
    if (digest.toLowerCase() !== manifest.html.sha256.toLowerCase()) {
      throw new Error("HTML sha256 mismatch");
    }
  }
  const html = new TextDecoder().decode(htmlBuf);
  basicHtmlSanity(html);
  const baseDir = resolveInDataRoot("templates", manifestId, manifestVersion);
  const outPath = resolve(baseDir, manifestPath);
  const rel = relative(baseDir, outPath);
  if (!rel || rel.startsWith("..")) {
    throw new Error("html.path escapes template directory");
  }
  await Deno.mkdir(dirname(outPath), {
    recursive: true
  });
  await Deno.writeTextFile(outPath, html);
  const saved = upsertTemplateWithId(manifestId, {
    name: `${manifest.name} ${manifestVersion ? `v${manifestVersion}` : ""}`.trim(),
    html,
    isDefault: false,
    templateType: "remote"
  });
  return saved;
}
export const getTemplates = ()=>{
  const db = getDatabase();
  const results = db.query("SELECT id, name, html, is_default, template_type, created_at FROM templates ORDER BY created_at DESC");
  return results.map((row)=>({
      id: row[0],
      name: row[1],
      html: row[2],
      isDefault: row[3],
      templateType: row[4] || "builtin",
      createdAt: new Date(row[5])
    }));
};
export const getTemplateById = (id)=>{
  const db = getDatabase();
  const rows = db.query("SELECT id, name, html, is_default, template_type, created_at FROM templates WHERE id = ? LIMIT 1", [
    id
  ]);
  if (rows.length === 0) {
    return undefined;
  }
  const row = rows[0];
  return {
    id: row[0],
    name: row[1],
    html: row[2],
    isDefault: Boolean(row[3]),
    templateType: row[4] || "builtin",
    createdAt: new Date(row[5])
  };
};
let builtInDefaultTemplate;
function loadBuiltinTemplate() {
  if (builtInDefaultTemplate !== undefined) {
    return builtInDefaultTemplate;
  }
  try {
    const url = new URL("../../static/templates/professional-modern.html", import.meta.url);
    const html = Deno.readTextFileSync(url);
    builtInDefaultTemplate = {
      id: "builtin-professional-modern",
      name: "Professional Modern",
      html,
      isDefault: true,
      templateType: "builtin",
      createdAt: new Date(0)
    };
  } catch (error) {
    console.error("Failed to load built-in template:", error);
    builtInDefaultTemplate = null;
  }
  return builtInDefaultTemplate ?? null;
}
export const getDefaultTemplate = ()=>{
  const db = getDatabase();
  const defaultRows = db.query("SELECT id, name, html, is_default, template_type, created_at FROM templates WHERE is_default = 1 ORDER BY created_at DESC LIMIT 1");
  if (defaultRows.length > 0) {
    const row = defaultRows[0];
    return {
      id: row[0],
      name: row[1],
      html: row[2],
      isDefault: Boolean(row[3]),
      templateType: row[4] || "builtin",
      createdAt: new Date(row[5])
    };
  }
  const anyRows = db.query("SELECT id, name, html, is_default, template_type, created_at FROM templates ORDER BY created_at DESC LIMIT 1");
  if (anyRows.length > 0) {
    const row = anyRows[0];
    return {
      id: row[0],
      name: row[1],
      html: row[2],
      isDefault: Boolean(row[3]),
      templateType: row[4] || "builtin",
      createdAt: new Date(row[5])
    };
  }
  return loadBuiltinTemplate();
};
export const loadTemplateFromFile = async (filePath)=>{
  try {
    return await Deno.readTextFile(filePath);
  } catch (error) {
    console.error(`Failed to load template from ${filePath}:`, error);
    throw new Error(`Template file not found: ${filePath}`);
  }
};
export const renderTemplate = (templateHtml, data)=>{
  const escapeHtml = (input)=>{
    const str = input === undefined || input === null ? "" : String(input);
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };
  // Lightweight Mustache-like renderer with block-first strategy
  const lookup = (obj, path)=>{
    const clean = path.trim().replace(/^['"]|['"]$/g, "");
    return clean.split(".").reduce((acc, key)=>{
      if (acc && typeof acc === "object" && key in acc) {
        return acc[key];
      }
      return undefined;
    }, obj);
  };
  const merge = (a, b)=>({
      ...a,
      ...b
    });
  const renderBlocks = (tpl, ctx)=>{
    const blockRe = /\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    let result = tpl;
    let match;
    // Iterate until no blocks remain
    while((match = blockRe.exec(result)) !== null){
      const [full, rawKey, inner] = match;
      const key = rawKey.trim();
      const val = lookup(ctx, key);
      let replacement = "";
      if (Array.isArray(val)) {
        replacement = val.map((it)=>{
          const scope = merge(ctx, it || {});
          return renderAll(inner, scope);
        }).join("");
      } else if (val) {
        replacement = renderAll(inner, ctx);
      } else {
        replacement = "";
      }
      result = result.slice(0, match.index) + replacement + result.slice(match.index + full.length);
      blockRe.lastIndex = 0; // reset after modifying string
    }
    return result;
  };
  const renderVars = (tpl, ctx)=>{
    return tpl.replace(/\{\{([^}]+)\}\}/g, (m, raw)=>{
      const key = String(raw).trim();
      if (key.startsWith("#") || key.startsWith("/")) return m; // skip block tags
      // default value support: {{var || 'default'}}
      if (key.includes("||")) {
        const [lhs, rhs] = key.split("||").map((s)=>s.trim());
        const val = lookup(ctx, lhs.replace(/['"]/g, ""));
        if (val === undefined || val === null || val === "") {
          return escapeHtml(rhs.replace(/^['"]|['"]$/g, ""));
        }
        return escapeHtml(val);
      }
      const v = lookup(ctx, key);
      return v !== undefined && v !== null ? escapeHtml(v) : "";
    });
  };
  const renderTriple = (tpl, ctx)=>{
    const tripleRe = /\{\{\{([^}]+)\}\}\}/g;
    return tpl.replace(tripleRe, (_m, raw)=>{
      const key = String(raw).trim();
      const val = lookup(ctx, key);
      return val === undefined || val === null ? "" : String(val);
    });
  };
  const renderAll = (tpl, ctx)=>{
    const withBlocks = renderBlocks(tpl, ctx);
    const withTriple = renderTriple(withBlocks, ctx);
    return renderVars(withTriple, ctx);
  };
  return renderAll(templateHtml, data);
};
export const createTemplate = (data)=>{
  const db = getDatabase();
  const templateId = generateUUID();
  const template = {
    id: templateId,
    name: data.name,
    html: data.html,
    isDefault: data.isDefault || false,
    templateType: data.templateType || "local",
    createdAt: new Date()
  };
  // If this new template is marked as default, unset default on all others first
  if (template.isDefault) {
    db.query("UPDATE templates SET is_default = 0");
  }
  db.query("INSERT INTO templates (id, name, html, is_default, template_type, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
    template.id,
    template.name,
    template.html,
    template.isDefault,
    template.templateType,
    template.createdAt
  ]);
  return template;
};
// Insert or replace a template with a specific id (used by manifest installs)
export const upsertTemplateWithId = (id, data)=>{
  const db = getDatabase();
  if (data.isDefault === true) {
    db.query("UPDATE templates SET is_default = 0 WHERE id != ?", [
      id
    ]);
  }
  db.query("INSERT OR REPLACE INTO templates (id, name, html, is_default, template_type, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
    id,
    data.name || id,
    data.html || "",
    data.isDefault || false,
    data.templateType || "remote",
    new Date().toISOString()
  ]);
  return getTemplateById(id);
};
export const updateTemplate = (id, data)=>{
  const db = getDatabase();
  // Enforce a single default when toggling isDefault to true
  if (data.isDefault === true) {
    db.query("UPDATE templates SET is_default = 0 WHERE id != ?", [
      id
    ]);
  }
  db.query("UPDATE templates SET name = ?, html = ?, is_default = ? WHERE id = ?", [
    data.name,
    data.html,
    data.isDefault,
    id
  ]);
  const result = db.query("SELECT id, name, html, is_default, template_type, created_at FROM templates WHERE id = ?", [
    id
  ]);
  if (result.length > 0) {
    const row = result[0];
    return {
      id: row[0],
      name: row[1],
      html: row[2],
      isDefault: row[3],
      templateType: row[4] || "builtin",
      createdAt: new Date(row[5])
    };
  }
  return null;
};
export const deleteTemplate = (id)=>{
  const db = getDatabase();
  db.query("DELETE FROM templates WHERE id = ?", [
    id
  ]);
  // Best-effort cleanup of stored files for this template id (all versions)
  try {
    const dir = resolveInDataRoot("templates", id);
    // Remove recursively if exists
    Deno.removeSync(dir, {
      recursive: true
    });
  } catch (_e) {
  // ignore missing or permission errors
  }
  return true;
};
// Set the active default template by id, unsetting all others
export const setDefaultTemplate = (id)=>{
  const db = getDatabase();
  // Reset all
  db.query("UPDATE templates SET is_default = 0");
  // Set requested id; ignore if not found (no rows updated)
  db.query("UPDATE templates SET is_default = 1 WHERE id = ?", [
    id
  ]);
  return true;
};
function assertLocalManifestShape(m) {
  if (!m || typeof m !== "object") {
    throw new Error("Manifest must be an object");
  }
  const r = m;
  for (const k of [
    "id",
    "name",
    "html"
  ]){
    if (!(k in r)) throw new Error(`Manifest missing ${k}`);
  }
  const html = r.html;
  if (!html || typeof html.path !== "string") {
    throw new Error("html.path is required");
  }
}
// Install a template from an uploaded .zip file (local template)
export async function installLocalTemplateFromZip(zipData) {
  // Create a blob from the zip data for the ZipReader
  const blob = new Blob([
    zipData
  ]);
  const zipReader = new ZipReader(blob.stream());
  try {
    const entries = await zipReader.getEntries();
    // Detect if files are in a subfolder (Windows-style zip)
    // Look for manifest at root first, then check for single subfolder
    let rootPrefix = "";
    let manifestEntry = entries.find((e)=>e.filename === "manifest.yaml" || e.filename === "manifest.yml" || e.filename === "manifest.json");
    if (!manifestEntry) {
      // Check if there's a single root folder containing the manifest
      const topLevelDirs = new Set();
      for (const entry of entries){
        const parts = entry.filename.split("/");
        if (parts.length > 1 && parts[0]) {
          topLevelDirs.add(parts[0]);
        }
      }
      // If there's exactly one top-level directory, look for manifest inside it
      if (topLevelDirs.size === 1) {
        const folderName = [
          ...topLevelDirs
        ][0];
        rootPrefix = `${folderName}/`;
        manifestEntry = entries.find((e)=>e.filename === `${rootPrefix}manifest.yaml` || e.filename === `${rootPrefix}manifest.yml` || e.filename === `${rootPrefix}manifest.json`);
      }
    }
    if (!manifestEntry) {
      throw new Error("No manifest.yaml or manifest.json found in zip root (or single subfolder)");
    }
    // Read and parse manifest using a simpler approach
    const manifestChunks = [];
    const manifestWriter = new WritableStream({
      write (chunk) {
        manifestChunks.push(chunk);
      }
    });
    await manifestEntry.getData(manifestWriter);
    const manifestBytes = new Uint8Array(manifestChunks.reduce((acc, c)=>acc + c.length, 0));
    let offset = 0;
    for (const chunk of manifestChunks){
      manifestBytes.set(chunk, offset);
      offset += chunk.length;
    }
    const manifestText = new TextDecoder().decode(manifestBytes);
    let manifest;
    try {
      manifest = parseYaml(manifestText);
    } catch (_e) {
      try {
        manifest = JSON.parse(manifestText);
      } catch  {
        throw new Error("Manifest parse failed");
      }
    }
    assertLocalManifestShape(manifest);
    const manifestId = enforceSafeIdentifier(manifest.id, "manifest.id");
    const manifestVersion = manifest.version ? enforceSafeIdentifier(manifest.version, "manifest.version") : "1.0.0";
    const htmlPath = sanitizeManifestPath(String(manifest.html.path));
    // Find and read the HTML file (check with rootPrefix for Windows-style zips)
    const htmlEntry = entries.find((e)=>e.filename === `${rootPrefix}${htmlPath}` || e.filename === `${rootPrefix}./${htmlPath}` || e.filename === htmlPath || e.filename === `./${htmlPath}`);
    if (!htmlEntry) {
      throw new Error(`HTML file not found in zip: ${htmlPath}`);
    }
    const htmlChunks = [];
    const htmlWriter = new WritableStream({
      write (chunk) {
        htmlChunks.push(chunk);
      }
    });
    await htmlEntry.getData(htmlWriter);
    const htmlBytes = new Uint8Array(htmlChunks.reduce((acc, c)=>acc + c.length, 0));
    let htmlOffset = 0;
    for (const chunk of htmlChunks){
      htmlBytes.set(chunk, htmlOffset);
      htmlOffset += chunk.length;
    }
    if (htmlBytes.byteLength > 128 * 1024) {
      throw new Error("HTML too large (>128KB)");
    }
    const html = new TextDecoder().decode(htmlBytes);
    basicHtmlSanity(html);
    // Store template files on disk
    const baseDir = resolveInDataRoot("templates", manifestId, manifestVersion);
    const outPath = resolve(baseDir, htmlPath);
    const rel = relative(baseDir, outPath);
    if (!rel || rel.startsWith("..")) {
      throw new Error("html.path escapes template directory");
    }
    await Deno.mkdir(dirname(outPath), {
      recursive: true
    });
    await Deno.writeTextFile(outPath, html);
    // Save to database as local template (no source URL stored)
    const saved = upsertTemplateWithId(manifestId, {
      name: `${manifest.name} ${manifestVersion ? `v${manifestVersion}` : ""}`.trim(),
      html,
      isDefault: false,
      templateType: "local"
    });
    return saved;
  } finally{
    await zipReader.close();
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL2NvbnRyb2xsZXJzL3RlbXBsYXRlcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBnZXREYXRhYmFzZSB9IGZyb20gXCIuLi9kYXRhYmFzZS9pbml0LnRzXCI7XG5pbXBvcnQgeyBUZW1wbGF0ZSwgVGVtcGxhdGVUeXBlIH0gZnJvbSBcIi4uL3R5cGVzL2luZGV4LnRzXCI7XG5pbXBvcnQgeyByZXNvbHZlSW5EYXRhUm9vdCB9IGZyb20gXCIuLi91dGlscy9kYXRhUGF0aHMudHNcIjtcbmltcG9ydCB7IGdlbmVyYXRlVVVJRCB9IGZyb20gXCIuLi91dGlscy91dWlkLnRzXCI7XG5pbXBvcnQgeyBwYXJzZSBhcyBwYXJzZVlhbWwgfSBmcm9tIFwieWFtbFwiO1xuaW1wb3J0IHsgZGlybmFtZSwgaXNBYnNvbHV0ZSwgbm9ybWFsaXplLCByZWxhdGl2ZSwgcmVzb2x2ZSB9IGZyb20gXCJzdGQvcGF0aFwiO1xuaW1wb3J0IHsgWmlwUmVhZGVyIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3gvemlwanNAdjIuNy4zNC9pbmRleC5qc1wiO1xuLy8gTWFuaWZlc3QtYmFzZWQgaW5zdGFsbGVyIChNVlApOiBvbmUgSFRNTCBmaWxlICsgb3B0aW9uYWwgZm9udHMgKGlnbm9yZWQgZm9yIG5vdylcblxudHlwZSBNYW5pZmVzdEhUTUwgPSB7XG4gIHBhdGg6IHN0cmluZztcbiAgdXJsOiBzdHJpbmc7XG4gIHNoYTI1Nj86IHN0cmluZztcbn07XG5cbnR5cGUgVGVtcGxhdGVNYW5pZmVzdCA9IHtcbiAgc2NoZW1hPzogbnVtYmVyO1xuICBpZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbiAgaW52aW86IHN0cmluZztcbiAgaHRtbDogTWFuaWZlc3RIVE1MO1xuICAvLyBmb250cz86IHsgcGF0aDogc3RyaW5nOyB1cmw6IHN0cmluZzsgc2hhMjU2Pzogc3RyaW5nOyB3ZWlnaHQ/OiBudW1iZXI7IHN0eWxlPzogc3RyaW5nIH1bXTtcbiAgbGljZW5zZT86IHN0cmluZztcbiAgc291cmNlPzogeyBtYW5pZmVzdFVybD86IHN0cmluZzsgaG9tZXBhZ2U/OiBzdHJpbmcgfTtcbn07XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoVGV4dCh1cmw6IFVSTCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHJlcyA9IGF3YWl0IHNhZmVGZXRjaCh1cmwpO1xuICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGBGZXRjaCBmYWlsZWQgJHtyZXMuc3RhdHVzfWApO1xuICByZXR1cm4gYXdhaXQgcmVzLnRleHQoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hCeXRlcyh1cmw6IFVSTCk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICBjb25zdCByZXMgPSBhd2FpdCBzYWZlRmV0Y2godXJsKTtcbiAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgRmV0Y2ggZmFpbGVkICR7cmVzLnN0YXR1c31gKTtcbiAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVzLmFycmF5QnVmZmVyKCk7XG4gIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzaGEyNTZIZXgoc291cmNlOiBVaW50OEFycmF5IHwgQXJyYXlCdWZmZXIpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBidWZmZXIgPSBzb3VyY2UgaW5zdGFuY2VvZiBVaW50OEFycmF5XG4gICAgPyBzb3VyY2UuYnVmZmVyLnNsaWNlKHNvdXJjZS5ieXRlT2Zmc2V0LCBzb3VyY2UuYnl0ZU9mZnNldCArIHNvdXJjZS5ieXRlTGVuZ3RoKVxuICAgIDogc291cmNlLnNsaWNlKDApO1xuICBjb25zdCBoYXNoID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXCJTSEEtMjU2XCIsIGJ1ZmZlciBhcyBBcnJheUJ1ZmZlcik7XG4gIHJldHVybiBBcnJheS5mcm9tKG5ldyBVaW50OEFycmF5KGhhc2gpKS5tYXAoKGIpID0+XG4gICAgYi50b1N0cmluZygxNikucGFkU3RhcnQoMiwgXCIwXCIpXG4gICkuam9pbihcIlwiKTtcbn1cblxuZnVuY3Rpb24gYmFzaWNIdG1sU2FuaXR5KGh0bWw6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBsb3dlciA9IGh0bWwudG9Mb3dlckNhc2UoKTtcbiAgLy8gQmxvY2sgZGFuZ2Vyb3VzIGVtYmVkIGNvbnRhaW5lcnMgYW5kIGV4ZWN1dGFibGUgc2NyaXB0IHRhZ3MuXG4gIGNvbnN0IGJhbm5lZFRhZ3MgPSBbXG4gICAgXCI8aWZyYW1lXCIsXG4gICAgXCI8b2JqZWN0XCIsXG4gICAgXCI8ZW1iZWRcIixcbiAgICBcIjxzY3JpcHRcIixcbiAgXTtcbiAgZm9yIChjb25zdCB0YWcgb2YgYmFubmVkVGFncykge1xuICAgIGlmIChsb3dlci5pbmNsdWRlcyh0YWcpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEhUTUwgY29udGFpbnMgZGlzYWxsb3dlZCB0YWc6ICR7dGFnfWApO1xuICAgIH1cbiAgfVxuICAvLyBEaXNhbGxvdyBpbmxpbmUgZXZlbnQgaGFuZGxlcnMgKGF0dHJpYnV0ZSBib3VuZGFyeSlcbiAgaWYgKC8oXFxzfDwpb25bYS16XStcXHMqPVxccypbJ1xcXCJdL2kudGVzdChsb3dlcikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmxpbmUgZXZlbnQgaGFuZGxlcnMgbm90IGFsbG93ZWRcIik7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXNzZXJ0TWFuaWZlc3RTaGFwZShtOiB1bmtub3duKTogYXNzZXJ0cyBtIGlzIFRlbXBsYXRlTWFuaWZlc3Qge1xuICBpZiAoIW0gfHwgdHlwZW9mIG0gIT09IFwib2JqZWN0XCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNYW5pZmVzdCBtdXN0IGJlIGFuIG9iamVjdFwiKTtcbiAgfVxuICBjb25zdCByID0gbSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgZm9yIChjb25zdCBrIG9mIFtcImlkXCIsIFwibmFtZVwiLCBcInZlcnNpb25cIiwgXCJpbnZpb1wiLCBcImh0bWxcIl0pIHtcbiAgICBpZiAoIShrIGluIHIpKSB0aHJvdyBuZXcgRXJyb3IoYE1hbmlmZXN0IG1pc3NpbmcgJHtrfWApO1xuICB9XG4gIGNvbnN0IGh0bWwgPSByLmh0bWwgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGlmICghaHRtbCB8fCB0eXBlb2YgaHRtbC5wYXRoICE9PSBcInN0cmluZ1wiIHx8IHR5cGVvZiBodG1sLnVybCAhPT0gXCJzdHJpbmdcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcImh0bWwucGF0aCBhbmQgaHRtbC51cmwgYXJlIHJlcXVpcmVkXCIpO1xuICB9XG4gIGlmICghU3RyaW5nKGh0bWwudXJsKS5zdGFydHNXaXRoKFwiaHR0cFwiKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcImh0bWwudXJsIG11c3QgYmUgaHR0cChzKVwiKTtcbiAgfVxufVxuXG5jb25zdCBTQUZFX0lEX1BBVFRFUk4gPSAvXlthLXowLTldW2EtejAtOS5fLV17MCw2M30kL2k7XG5cbmZ1bmN0aW9uIGVuZm9yY2VTYWZlSWRlbnRpZmllcih2YWx1ZTogc3RyaW5nLCBmaWVsZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgdHJpbW1lZCA9IHZhbHVlLnRyaW0oKTtcbiAgaWYgKCFTQUZFX0lEX1BBVFRFUk4udGVzdCh0cmltbWVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGAke2ZpZWxkfSBtdXN0IGJlIDEtNjQgY2hhcmFjdGVycyB1c2luZyBsZXR0ZXJzLCBudW1iZXJzLCBkYXNoZXMsIHVuZGVyc2NvcmVzLCBvciBkb3RzYCxcbiAgICApO1xuICB9XG4gIHJldHVybiB0cmltbWVkO1xufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZU1hbmlmZXN0UGF0aChwYXRoVmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHRyaW1tZWQgPSBwYXRoVmFsdWUudHJpbSgpO1xuICBpZiAoIXRyaW1tZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJodG1sLnBhdGggbXVzdCBub3QgYmUgZW1wdHlcIik7XG4gIH1cbiAgaWYgKGlzQWJzb2x1dGUodHJpbW1lZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJodG1sLnBhdGggbXVzdCBiZSByZWxhdGl2ZVwiKTtcbiAgfVxuICBjb25zdCB1bml4aWZpZWQgPSB0cmltbWVkLnJlcGxhY2VBbGwoXCJcXFxcXCIsIFwiL1wiKTtcbiAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZSh1bml4aWZpZWQpO1xuICBpZiAoIW5vcm1hbGl6ZWQgfHwgbm9ybWFsaXplZC5zdGFydHNXaXRoKFwiLi5cIikgfHwgbm9ybWFsaXplZC5pbmNsdWRlcyhcIi8uLi9cIikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJodG1sLnBhdGggbXVzdCBzdGF5IHdpdGhpbiB0aGUgdGVtcGxhdGUgZGlyZWN0b3J5XCIpO1xuICB9XG4gIHJldHVybiBub3JtYWxpemVkO1xufVxuXG5jb25zdCBGT1JCSURERU5fSE9TVFMgPSBuZXcgU2V0KFtcbiAgXCJsb2NhbGhvc3RcIixcbiAgXCIxMjcuMC4wLjFcIixcbiAgXCI6OjFcIixcbl0pO1xuXG5mdW5jdGlvbiBpc1ByaXZhdGVJUHY0KGhvc3RuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcGFydHMgPSBob3N0bmFtZS5zcGxpdChcIi5cIikubWFwKChwKSA9PiBOdW1iZXIocCkpO1xuICBpZiAocGFydHMubGVuZ3RoICE9PSA0IHx8IHBhcnRzLnNvbWUoKG4pID0+IE51bWJlci5pc05hTihuKSB8fCBuIDwgMCB8fCBuID4gMjU1KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBbYSwgYl0gPSBwYXJ0cztcbiAgaWYgKGEgPT09IDEwKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKGEgPT09IDE5MiAmJiBiID09PSAxNjgpIHJldHVybiB0cnVlO1xuICBpZiAoYSA9PT0gMTcyICYmIGIgPj0gMTYgJiYgYiA8PSAzMSkgcmV0dXJuIHRydWU7XG4gIGlmIChhID09PSAxNjkgJiYgYiA9PT0gMjU0KSByZXR1cm4gdHJ1ZTtcbiAgaWYgKGEgPT09IDEyNykgcmV0dXJuIHRydWU7XG4gIGlmIChhID09PSAwKSByZXR1cm4gdHJ1ZTtcbiAgLy8gQ0dOQVQgLyBjYXJyaWVyLWdyYWRlIE5BVCAoUkZDIDY1OTgpIOKAlCBpbnRlcm5hbCBpbiBzaGFyZWQtaG9zdGluZyBlbnZzLlxuICBpZiAoYSA9PT0gMTAwICYmIGIgPj0gNjQgJiYgYiA8PSAxMjcpIHJldHVybiB0cnVlO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIE5vcm1hbGl6ZSBhbiBJUHY2IGxpdGVyYWwgdGhlIHdheSBVUkwuaG9zdG5hbWUgcmV0dXJucyBpdDogaXQgaXMgd3JhcHBlZCBpblxuLy8gc3F1YXJlIGJyYWNrZXRzIChlLmcuIFwiWzo6MV1cIikuIFN0cmlwIHRoZW0gc28gcmFuZ2UgY2hlY2tzIHNlZSB0aGUgcmF3XG4vLyBhZGRyZXNzLiBSZXR1cm5zIHRoZSBsb3dlci1jYXNlZCBhZGRyZXNzIHdpdGhvdXQgYnJhY2tldHMuXG5mdW5jdGlvbiBzdHJpcElwdjZCcmFja2V0cyhob3N0bmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbG93ZXIgPSBob3N0bmFtZS50b0xvd2VyQ2FzZSgpO1xuICBpZiAobG93ZXIuc3RhcnRzV2l0aChcIltcIikgJiYgbG93ZXIuZW5kc1dpdGgoXCJdXCIpKSB7XG4gICAgcmV0dXJuIGxvd2VyLnNsaWNlKDEsIC0xKTtcbiAgfVxuICByZXR1cm4gbG93ZXI7XG59XG5cbmZ1bmN0aW9uIGlzUHJpdmF0ZUlQdjYoaG9zdG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCBhZGRyID0gc3RyaXBJcHY2QnJhY2tldHMoaG9zdG5hbWUpO1xuICBpZiAoIWFkZHIuaW5jbHVkZXMoXCI6XCIpKSByZXR1cm4gZmFsc2U7IC8vIG5vdCBhbiBJUHY2IGxpdGVyYWxcbiAgLy8gTG9vcGJhY2sgOjoxIGFuZCB0aGUgdW5zcGVjaWZpZWQgYWRkcmVzcyA6OlxuICBpZiAoYWRkciA9PT0gXCI6OjFcIiB8fCBhZGRyID09PSBcIjo6XCIpIHJldHVybiB0cnVlO1xuICAvLyBJUHY0LW1hcHBlZCAoOjpmZmZmOmEuYi5jLmQgLyA6OmZmZmY6N2YwMDoxKSBhbmQgSVB2NC1jb21wYXRpYmxlIC8gTkFUNjQgL1xuICAvLyA2dG80IGFsbCBlbWJlZCBhbiBJUHY0IGFkZHJlc3Mg4oCUIGV4dHJhY3QgYW5kIHJlLWNoZWNrIGFnYWluc3QgSVB2NCBydWxlcy5cbiAgY29uc3QgbWFwcGVkVjQgPSBleHRyYWN0RW1iZWRkZWRJUHY0KGFkZHIpO1xuICBpZiAobWFwcGVkVjQgJiYgaXNQcml2YXRlSVB2NChtYXBwZWRWNCkpIHJldHVybiB0cnVlO1xuICAvLyBVbmlxdWUtbG9jYWwgZmMwMDo6LzcgKGZjLi4gYW5kIGZkLi4pIGFuZCBsaW5rLWxvY2FsIGZlODA6Oi8xMC5cbiAgaWYgKC9eZltjZF1bMC05YS1mXXswLDJ9Oi8udGVzdChhZGRyKSB8fCBhZGRyID09PSBcImZjMDBcIiB8fCBhZGRyID09PSBcImZkMDBcIikge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmICgvXmZlWzg5YWJdWzAtOWEtZl0/Oi8udGVzdChhZGRyKSkgcmV0dXJuIHRydWU7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLy8gUHVsbCBhbiBlbWJlZGRlZCBJUHY0IGFkZHJlc3Mgb3V0IG9mIElQdjQtbWFwcGVkL2NvbXBhdGlibGUvTkFUNjQvNnRvNCBJUHY2XG4vLyBmb3JtcyBzbyBpdCBjYW4gYmUgdmFsaWRhdGVkIGFnYWluc3QgdGhlIElQdjQgcHJpdmF0ZSByYW5nZXMuXG5mdW5jdGlvbiBleHRyYWN0RW1iZWRkZWRJUHY0KGFkZHI6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICAvLyBEb3R0ZWQtcXVhZCB0YWlsLCBlLmcuIDo6ZmZmZjoxMjcuMC4wLjEgb3IgNjQ6ZmY5Yjo6MTI3LjAuMC4xXG4gIGNvbnN0IGRvdHRlZCA9IGFkZHIubWF0Y2goLyhcXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfSkkLyk7XG4gIGlmIChkb3R0ZWQpIHJldHVybiBkb3R0ZWRbMV07XG4gIC8vIEhleHRldC1lbmNvZGVkIElQdjQtbWFwcGVkLCBlLmcuIDo6ZmZmZjo3ZjAwOjEgLT4gMTI3LjAuMC4xXG4gIGNvbnN0IG1hcHBlZCA9IGFkZHIubWF0Y2goL146OmZmZmY6KFswLTlhLWZdezEsNH0pOihbMC05YS1mXXsxLDR9KSQvKTtcbiAgaWYgKG1hcHBlZCkge1xuICAgIGNvbnN0IGhpID0gcGFyc2VJbnQobWFwcGVkWzFdLCAxNik7XG4gICAgY29uc3QgbG8gPSBwYXJzZUludChtYXBwZWRbMl0sIDE2KTtcbiAgICByZXR1cm4gYCR7KGhpID4+IDgpICYgMHhmZn0uJHtoaSAmIDB4ZmZ9LiR7KGxvID4+IDgpICYgMHhmZn0uJHtsbyAmIDB4ZmZ9YDtcbiAgfVxuICAvLyA2dG80IDIwMDI6VjRWNDo6LzE2IGFuZCBOQVQ2NCA2NDpmZjliOjpWNFY0IGZpcnN0IHR3byBoZXh0ZXRzIGFmdGVyIHByZWZpeC5cbiAgY29uc3Qgc2l4VG9Gb3VyID0gYWRkci5tYXRjaCgvXjIwMDI6KFswLTlhLWZdezEsNH0pOihbMC05YS1mXXsxLDR9KS8pO1xuICBpZiAoc2l4VG9Gb3VyKSB7XG4gICAgY29uc3QgaGkgPSBwYXJzZUludChzaXhUb0ZvdXJbMV0sIDE2KTtcbiAgICBjb25zdCBsbyA9IHBhcnNlSW50KHNpeFRvRm91clsyXSwgMTYpO1xuICAgIHJldHVybiBgJHsoaGkgPj4gOCkgJiAweGZmfS4ke2hpICYgMHhmZn0uJHsobG8gPj4gOCkgJiAweGZmfS4ke2xvICYgMHhmZn1gO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vLyBUcnVlIGlmIGEgbGl0ZXJhbC9yZXNvbHZlZCBJUCBzdHJpbmcgdGFyZ2V0cyBhbiBpbnRlcm5hbCByYW5nZS5cbmZ1bmN0aW9uIGlzRm9yYmlkZGVuQWRkcmVzcyhob3N0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgaCA9IGhvc3QudG9Mb3dlckNhc2UoKTtcbiAgaWYgKEZPUkJJRERFTl9IT1NUUy5oYXMoaCkpIHJldHVybiB0cnVlO1xuICBjb25zdCBiYXJlID0gc3RyaXBJcHY2QnJhY2tldHMoaCk7XG4gIGlmIChGT1JCSURERU5fSE9TVFMuaGFzKGJhcmUpKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKGlzUHJpdmF0ZUlQdjQoYmFyZSkgfHwgaXNQcml2YXRlSVB2NihoKSkgcmV0dXJuIHRydWU7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYXNzZXJ0U2FmZVJlbW90ZVVybChyYXc6IHN0cmluZywgZmllbGQ6IHN0cmluZyk6IFByb21pc2U8VVJMPiB7XG4gIGxldCB1cmw6IFVSTDtcbiAgdHJ5IHtcbiAgICB1cmwgPSBuZXcgVVJMKHJhdyk7XG4gIH0gY2F0Y2gge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtmaWVsZH0gaXMgbm90IGEgdmFsaWQgVVJMYCk7XG4gIH1cbiAgaWYgKHVybC5wcm90b2NvbCAhPT0gXCJodHRwczpcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtmaWVsZH0gbXVzdCB1c2UgaHR0cHNgKTtcbiAgfVxuICAvLyAxKSBSZWplY3QgaW50ZXJuYWwgdGFyZ2V0cyBzdXBwbGllZCBkaXJlY3RseSBhcyBob3N0IGxpdGVyYWxzLlxuICBpZiAoaXNGb3JiaWRkZW5BZGRyZXNzKHVybC5ob3N0bmFtZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7ZmllbGR9IGhvc3QgaXMgbm90IGFsbG93ZWRgKTtcbiAgfVxuICAvLyAyKSBSZXNvbHZlIHRoZSBob3N0bmFtZSBhbmQgcmVqZWN0IGlmIEFOWSByZXNvbHZlZCBhZGRyZXNzIGlzIGludGVybmFsLlxuICAvLyAgICBEZWZlYXRzIEROUy1yZWJpbmRpbmcgLyBBLXJlY29yZC1wb2ludHMtaW50ZXJuYWwgU1NSRi4gSWYgdGhlIGhvc3QgaXNcbiAgLy8gICAgYWxyZWFkeSBhbiBJUCBsaXRlcmFsLCByZXNvbHZlRG5zIGlzIHNraXBwZWQgKGl0IHdvdWxkIGVycm9yKS5cbiAgY29uc3QgYmFyZSA9IHN0cmlwSXB2NkJyYWNrZXRzKHVybC5ob3N0bmFtZSk7XG4gIGNvbnN0IGxvb2tzTGlrZUlwID0gYmFyZS5pbmNsdWRlcyhcIjpcIikgfHwgL15cXGR7MSwzfShcXC5cXGR7MSwzfSl7M30kLy50ZXN0KGJhcmUpO1xuICBpZiAoIWxvb2tzTGlrZUlwKSB7XG4gICAgbGV0IGFkZHJzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qga2luZCBvZiBbXCJBXCIsIFwiQUFBQVwiXSBhcyBjb25zdCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYWRkcnMgPSBhZGRycy5jb25jYXQoYXdhaXQgRGVuby5yZXNvbHZlRG5zKGJhcmUsIGtpbmQpKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBObyByZWNvcmQgb2YgdGhpcyB0eXBlOyBpZ25vcmUuXG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgaXAgb2YgYWRkcnMpIHtcbiAgICAgIGlmIChpc0ZvcmJpZGRlbkFkZHJlc3MoaXApKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtmaWVsZH0gcmVzb2x2ZXMgdG8gYSBkaXNhbGxvd2VkIGFkZHJlc3NgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVybDtcbn1cblxuLy8gZmV0Y2goKSB3cmFwcGVyIHRoYXQgZm9sbG93cyByZWRpcmVjdHMgTUFOVUFMTFkgYW5kIHJlLXZhbGlkYXRlcyBldmVyeSBob3AsXG4vLyBzbyBhIHB1YmxpYyBob3N0IGNhbm5vdCAzMHgtcmVkaXJlY3QgdGhlIHJlcXVlc3QgaW50byBhbiBpbnRlcm5hbCB0YXJnZXQuXG5hc3luYyBmdW5jdGlvbiBzYWZlRmV0Y2godXJsOiBVUkwsIG1heFJlZGlyZWN0cyA9IDUpOiBQcm9taXNlPFJlc3BvbnNlPiB7XG4gIGxldCBjdXJyZW50ID0gdXJsO1xuICBmb3IgKGxldCBob3AgPSAwOyBob3AgPD0gbWF4UmVkaXJlY3RzOyBob3ArKykge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGN1cnJlbnQsIHsgcmVkaXJlY3Q6IFwibWFudWFsXCIgfSk7XG4gICAgaWYgKHJlcy5zdGF0dXMgPj0gMzAwICYmIHJlcy5zdGF0dXMgPCA0MDAgJiYgcmVzLmhlYWRlcnMuaGFzKFwibG9jYXRpb25cIikpIHtcbiAgICAgIC8vIERyYWluIHRoZSByZWRpcmVjdCBib2R5IHRvIHJlbGVhc2UgdGhlIGNvbm5lY3Rpb24uXG4gICAgICBhd2FpdCByZXMuYm9keT8uY2FuY2VsKCk7XG4gICAgICBjb25zdCBsb2MgPSByZXMuaGVhZGVycy5nZXQoXCJsb2NhdGlvblwiKSE7XG4gICAgICBjb25zdCBuZXh0ID0gbmV3IFVSTChsb2MsIGN1cnJlbnQpO1xuICAgICAgLy8gUmUtcnVuIHRoZSBmdWxsIGd1YXJkIChwcm90b2NvbCArIGxpdGVyYWwgKyBETlMpIG9uIHRoZSBuZXh0IHRhcmdldC5cbiAgICAgIGN1cnJlbnQgPSBhd2FpdCBhc3NlcnRTYWZlUmVtb3RlVXJsKG5leHQudG9TdHJpbmcoKSwgXCJyZWRpcmVjdCB0YXJnZXRcIik7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJUb28gbWFueSByZWRpcmVjdHNcIik7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YWxsVGVtcGxhdGVGcm9tTWFuaWZlc3QobWFuaWZlc3RVcmw6IHN0cmluZykge1xuICBjb25zdCBtYW5pZmVzdFVybE9iaiA9IGF3YWl0IGFzc2VydFNhZmVSZW1vdGVVcmwobWFuaWZlc3RVcmwsIFwibWFuaWZlc3QgVVJMXCIpO1xuICBjb25zdCB0ZXh0ID0gYXdhaXQgZmV0Y2hUZXh0KG1hbmlmZXN0VXJsT2JqKTtcbiAgbGV0IG1hbmlmZXN0OiBUZW1wbGF0ZU1hbmlmZXN0O1xuICB0cnkge1xuICAgIG1hbmlmZXN0ID0gcGFyc2VZYW1sKHRleHQpIGFzIFRlbXBsYXRlTWFuaWZlc3Q7XG4gIH0gY2F0Y2ggKF9lKSB7XG4gICAgdHJ5IHtcbiAgICAgIG1hbmlmZXN0ID0gSlNPTi5wYXJzZSh0ZXh0KSBhcyBUZW1wbGF0ZU1hbmlmZXN0O1xuICAgIH0gY2F0Y2gge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWFuaWZlc3QgcGFyc2UgZmFpbGVkXCIpO1xuICAgIH1cbiAgfVxuICBhc3NlcnRNYW5pZmVzdFNoYXBlKG1hbmlmZXN0KTtcblxuICBjb25zdCBtYW5pZmVzdElkID0gZW5mb3JjZVNhZmVJZGVudGlmaWVyKG1hbmlmZXN0LmlkLCBcIm1hbmlmZXN0LmlkXCIpO1xuICBjb25zdCBtYW5pZmVzdFZlcnNpb24gPSBlbmZvcmNlU2FmZUlkZW50aWZpZXIobWFuaWZlc3QudmVyc2lvbiwgXCJtYW5pZmVzdC52ZXJzaW9uXCIpO1xuICBjb25zdCBtYW5pZmVzdFBhdGggPSBzYW5pdGl6ZU1hbmlmZXN0UGF0aChTdHJpbmcobWFuaWZlc3QuaHRtbC5wYXRoKSk7XG4gIGNvbnN0IGh0bWxVcmwgPSBhd2FpdCBhc3NlcnRTYWZlUmVtb3RlVXJsKFN0cmluZyhtYW5pZmVzdC5odG1sLnVybCksIFwibWFuaWZlc3QuaHRtbC51cmxcIik7XG5cbiAgY29uc3QgaHRtbEJ1ZiA9IGF3YWl0IGZldGNoQnl0ZXMoaHRtbFVybCk7XG4gIGlmIChodG1sQnVmLmJ5dGVMZW5ndGggPiAxMjggKiAxMDI0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSFRNTCB0b28gbGFyZ2UgKD4xMjhLQilcIik7XG4gIH1cbiAgaWYgKG1hbmlmZXN0Lmh0bWwuc2hhMjU2ICYmIG1hbmlmZXN0Lmh0bWwuc2hhMjU2LnRyaW0oKSkge1xuICAgIGNvbnN0IGRpZ2VzdCA9IGF3YWl0IHNoYTI1NkhleChodG1sQnVmKTtcbiAgICBpZiAoZGlnZXN0LnRvTG93ZXJDYXNlKCkgIT09IG1hbmlmZXN0Lmh0bWwuc2hhMjU2LnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkhUTUwgc2hhMjU2IG1pc21hdGNoXCIpO1xuICAgIH1cbiAgfVxuICBjb25zdCBodG1sID0gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKGh0bWxCdWYpO1xuICBiYXNpY0h0bWxTYW5pdHkoaHRtbCk7XG5cbiAgY29uc3QgYmFzZURpciA9IHJlc29sdmVJbkRhdGFSb290KFwidGVtcGxhdGVzXCIsIG1hbmlmZXN0SWQsIG1hbmlmZXN0VmVyc2lvbik7XG4gIGNvbnN0IG91dFBhdGggPSByZXNvbHZlKGJhc2VEaXIsIG1hbmlmZXN0UGF0aCk7XG4gIGNvbnN0IHJlbCA9IHJlbGF0aXZlKGJhc2VEaXIsIG91dFBhdGgpO1xuICBpZiAoIXJlbCB8fCByZWwuc3RhcnRzV2l0aChcIi4uXCIpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaHRtbC5wYXRoIGVzY2FwZXMgdGVtcGxhdGUgZGlyZWN0b3J5XCIpO1xuICB9XG5cbiAgYXdhaXQgRGVuby5ta2RpcihkaXJuYW1lKG91dFBhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgYXdhaXQgRGVuby53cml0ZVRleHRGaWxlKG91dFBhdGgsIGh0bWwpO1xuXG4gIGNvbnN0IHNhdmVkID0gdXBzZXJ0VGVtcGxhdGVXaXRoSWQobWFuaWZlc3RJZCwge1xuICAgIG5hbWU6IGAke21hbmlmZXN0Lm5hbWV9ICR7bWFuaWZlc3RWZXJzaW9uID8gYHYke21hbmlmZXN0VmVyc2lvbn1gIDogXCJcIn1gXG4gICAgICAudHJpbSgpLFxuICAgIGh0bWwsXG4gICAgaXNEZWZhdWx0OiBmYWxzZSxcbiAgICB0ZW1wbGF0ZVR5cGU6IFwicmVtb3RlXCIsXG4gIH0pO1xuICByZXR1cm4gc2F2ZWQ7XG59XG5cbmV4cG9ydCBjb25zdCBnZXRUZW1wbGF0ZXMgPSAoKSA9PiB7XG4gIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgY29uc3QgcmVzdWx0cyA9IGRiLnF1ZXJ5KFxuICAgIFwiU0VMRUNUIGlkLCBuYW1lLCBodG1sLCBpc19kZWZhdWx0LCB0ZW1wbGF0ZV90eXBlLCBjcmVhdGVkX2F0IEZST00gdGVtcGxhdGVzIE9SREVSIEJZIGNyZWF0ZWRfYXQgREVTQ1wiLFxuICApO1xuICByZXR1cm4gcmVzdWx0cy5tYXAoKHJvdzogdW5rbm93bltdKSA9PiAoe1xuICAgIGlkOiByb3dbMF0gYXMgc3RyaW5nLFxuICAgIG5hbWU6IHJvd1sxXSBhcyBzdHJpbmcsXG4gICAgaHRtbDogcm93WzJdIGFzIHN0cmluZyxcbiAgICBpc0RlZmF1bHQ6IHJvd1szXSBhcyBib29sZWFuLFxuICAgIHRlbXBsYXRlVHlwZTogKHJvd1s0XSBhcyBUZW1wbGF0ZVR5cGUpIHx8IFwiYnVpbHRpblwiLFxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUocm93WzVdIGFzIHN0cmluZyksXG4gIH0pKTtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRUZW1wbGF0ZUJ5SWQgPSAoaWQ6IHN0cmluZykgPT4ge1xuICBjb25zdCBkYiA9IGdldERhdGFiYXNlKCk7XG4gIGNvbnN0IHJvd3MgPSBkYi5xdWVyeShcbiAgICBcIlNFTEVDVCBpZCwgbmFtZSwgaHRtbCwgaXNfZGVmYXVsdCwgdGVtcGxhdGVfdHlwZSwgY3JlYXRlZF9hdCBGUk9NIHRlbXBsYXRlcyBXSEVSRSBpZCA9ID8gTElNSVQgMVwiLFxuICAgIFtpZF0sXG4gICk7XG4gIGlmIChyb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3Qgcm93ID0gcm93c1swXSBhcyB1bmtub3duW107XG4gIHJldHVybiB7XG4gICAgaWQ6IHJvd1swXSBhcyBzdHJpbmcsXG4gICAgbmFtZTogcm93WzFdIGFzIHN0cmluZyxcbiAgICBodG1sOiByb3dbMl0gYXMgc3RyaW5nLFxuICAgIGlzRGVmYXVsdDogQm9vbGVhbihyb3dbM10pLFxuICAgIHRlbXBsYXRlVHlwZTogKHJvd1s0XSBhcyBUZW1wbGF0ZVR5cGUpIHx8IFwiYnVpbHRpblwiLFxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUocm93WzVdIGFzIHN0cmluZyksXG4gIH0gYXMgVGVtcGxhdGU7XG59O1xuXG5sZXQgYnVpbHRJbkRlZmF1bHRUZW1wbGF0ZTogVGVtcGxhdGUgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBsb2FkQnVpbHRpblRlbXBsYXRlKCk6IFRlbXBsYXRlIHwgbnVsbCB7XG4gIGlmIChidWlsdEluRGVmYXVsdFRlbXBsYXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gYnVpbHRJbkRlZmF1bHRUZW1wbGF0ZTtcbiAgfVxuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwoXCIuLi8uLi9zdGF0aWMvdGVtcGxhdGVzL3Byb2Zlc3Npb25hbC1tb2Rlcm4uaHRtbFwiLCBpbXBvcnQubWV0YS51cmwpO1xuICAgIGNvbnN0IGh0bWwgPSBEZW5vLnJlYWRUZXh0RmlsZVN5bmModXJsKTtcbiAgICBidWlsdEluRGVmYXVsdFRlbXBsYXRlID0ge1xuICAgICAgaWQ6IFwiYnVpbHRpbi1wcm9mZXNzaW9uYWwtbW9kZXJuXCIsXG4gICAgICBuYW1lOiBcIlByb2Zlc3Npb25hbCBNb2Rlcm5cIixcbiAgICAgIGh0bWwsXG4gICAgICBpc0RlZmF1bHQ6IHRydWUsXG4gICAgICB0ZW1wbGF0ZVR5cGU6IFwiYnVpbHRpblwiLFxuICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgwKSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gbG9hZCBidWlsdC1pbiB0ZW1wbGF0ZTpcIiwgZXJyb3IpO1xuICAgIGJ1aWx0SW5EZWZhdWx0VGVtcGxhdGUgPSBudWxsO1xuICB9XG4gIHJldHVybiBidWlsdEluRGVmYXVsdFRlbXBsYXRlID8/IG51bGw7XG59XG5cbmV4cG9ydCBjb25zdCBnZXREZWZhdWx0VGVtcGxhdGUgPSAoKTogVGVtcGxhdGUgfCBudWxsID0+IHtcbiAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpO1xuICBjb25zdCBkZWZhdWx0Um93cyA9IGRiLnF1ZXJ5KFxuICAgIFwiU0VMRUNUIGlkLCBuYW1lLCBodG1sLCBpc19kZWZhdWx0LCB0ZW1wbGF0ZV90eXBlLCBjcmVhdGVkX2F0IEZST00gdGVtcGxhdGVzIFdIRVJFIGlzX2RlZmF1bHQgPSAxIE9SREVSIEJZIGNyZWF0ZWRfYXQgREVTQyBMSU1JVCAxXCIsXG4gICk7XG4gIGlmIChkZWZhdWx0Um93cy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3Qgcm93ID0gZGVmYXVsdFJvd3NbMF0gYXMgdW5rbm93bltdO1xuICAgIHJldHVybiB7XG4gICAgICBpZDogcm93WzBdIGFzIHN0cmluZyxcbiAgICAgIG5hbWU6IHJvd1sxXSBhcyBzdHJpbmcsXG4gICAgICBodG1sOiByb3dbMl0gYXMgc3RyaW5nLFxuICAgICAgaXNEZWZhdWx0OiBCb29sZWFuKHJvd1szXSksXG4gICAgICB0ZW1wbGF0ZVR5cGU6IChyb3dbNF0gYXMgVGVtcGxhdGVUeXBlKSB8fCBcImJ1aWx0aW5cIixcbiAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUocm93WzVdIGFzIHN0cmluZyksXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGFueVJvd3MgPSBkYi5xdWVyeShcbiAgICBcIlNFTEVDVCBpZCwgbmFtZSwgaHRtbCwgaXNfZGVmYXVsdCwgdGVtcGxhdGVfdHlwZSwgY3JlYXRlZF9hdCBGUk9NIHRlbXBsYXRlcyBPUkRFUiBCWSBjcmVhdGVkX2F0IERFU0MgTElNSVQgMVwiLFxuICApO1xuICBpZiAoYW55Um93cy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3Qgcm93ID0gYW55Um93c1swXSBhcyB1bmtub3duW107XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3dbMF0gYXMgc3RyaW5nLFxuICAgICAgbmFtZTogcm93WzFdIGFzIHN0cmluZyxcbiAgICAgIGh0bWw6IHJvd1syXSBhcyBzdHJpbmcsXG4gICAgICBpc0RlZmF1bHQ6IEJvb2xlYW4ocm93WzNdKSxcbiAgICAgIHRlbXBsYXRlVHlwZTogKHJvd1s0XSBhcyBUZW1wbGF0ZVR5cGUpIHx8IFwiYnVpbHRpblwiLFxuICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZShyb3dbNV0gYXMgc3RyaW5nKSxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGxvYWRCdWlsdGluVGVtcGxhdGUoKTtcbn07XG5cbmV4cG9ydCBjb25zdCBsb2FkVGVtcGxhdGVGcm9tRmlsZSA9IGFzeW5jIChcbiAgZmlsZVBhdGg6IHN0cmluZyxcbik6IFByb21pc2U8c3RyaW5nPiA9PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGF3YWl0IERlbm8ucmVhZFRleHRGaWxlKGZpbGVQYXRoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gbG9hZCB0ZW1wbGF0ZSBmcm9tICR7ZmlsZVBhdGh9OmAsIGVycm9yKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFRlbXBsYXRlIGZpbGUgbm90IGZvdW5kOiAke2ZpbGVQYXRofWApO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgcmVuZGVyVGVtcGxhdGUgPSAoXG4gIHRlbXBsYXRlSHRtbDogc3RyaW5nLFxuICBkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbik6IHN0cmluZyA9PiB7XG4gIGNvbnN0IGVzY2FwZUh0bWwgPSAoaW5wdXQ6IHVua25vd24pOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IHN0ciA9IGlucHV0ID09PSB1bmRlZmluZWQgfHwgaW5wdXQgPT09IG51bGwgPyBcIlwiIDogU3RyaW5nKGlucHV0KTtcbiAgICByZXR1cm4gc3RyXG4gICAgICAucmVwbGFjZSgvJi9nLCBcIiZhbXA7XCIpXG4gICAgICAucmVwbGFjZSgvPC9nLCBcIiZsdDtcIilcbiAgICAgIC5yZXBsYWNlKC8+L2csIFwiJmd0O1wiKVxuICAgICAgLnJlcGxhY2UoL1wiL2csIFwiJnF1b3Q7XCIpXG4gICAgICAucmVwbGFjZSgvJy9nLCBcIiYjMzk7XCIpO1xuICB9O1xuXG4gIC8vIExpZ2h0d2VpZ2h0IE11c3RhY2hlLWxpa2UgcmVuZGVyZXIgd2l0aCBibG9jay1maXJzdCBzdHJhdGVneVxuICBjb25zdCBsb29rdXAgPSAob2JqOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiwgcGF0aDogc3RyaW5nKTogdW5rbm93biA9PiB7XG4gICAgY29uc3QgY2xlYW4gPSBwYXRoLnRyaW0oKS5yZXBsYWNlKC9eWydcIl18WydcIl0kL2csIFwiXCIpO1xuICAgIHJldHVybiBjbGVhbi5zcGxpdChcIi5cIikucmVkdWNlPHVua25vd24+KChhY2MsIGtleSkgPT4ge1xuICAgICAgaWYgKFxuICAgICAgICBhY2MgJiYgdHlwZW9mIGFjYyA9PT0gXCJvYmplY3RcIiAmJlxuICAgICAgICBrZXkgaW4gKGFjYyBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gKGFjYyBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilba2V5XTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSwgb2JqKTtcbiAgfTtcblxuICBjb25zdCBtZXJnZSA9IChhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiwgYjogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+ICh7XG4gICAgLi4uYSxcbiAgICAuLi5iLFxuICB9KTtcblxuICBjb25zdCByZW5kZXJCbG9ja3MgPSAodHBsOiBzdHJpbmcsIGN0eDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IGJsb2NrUmUgPSAvXFx7XFx7IyhbXn1dKylcXH1cXH0oW1xcc1xcU10qPylcXHtcXHtcXC9cXDFcXH1cXH0vZztcbiAgICBsZXQgcmVzdWx0ID0gdHBsO1xuICAgIGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcbiAgICAvLyBJdGVyYXRlIHVudGlsIG5vIGJsb2NrcyByZW1haW5cbiAgICB3aGlsZSAoKG1hdGNoID0gYmxvY2tSZS5leGVjKHJlc3VsdCkpICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBbZnVsbCwgcmF3S2V5LCBpbm5lcl0gPSBtYXRjaDtcbiAgICAgIGNvbnN0IGtleSA9IHJhd0tleS50cmltKCk7XG4gICAgICBjb25zdCB2YWwgPSBsb29rdXAoY3R4LCBrZXkpO1xuICAgICAgbGV0IHJlcGxhY2VtZW50ID0gXCJcIjtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgcmVwbGFjZW1lbnQgPSB2YWwubWFwKChpdCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHNjb3BlID0gbWVyZ2UoY3R4LCAoaXQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHx8IHt9KTtcbiAgICAgICAgICByZXR1cm4gcmVuZGVyQWxsKGlubmVyLCBzY29wZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcIik7XG4gICAgICB9IGVsc2UgaWYgKHZhbCkge1xuICAgICAgICByZXBsYWNlbWVudCA9IHJlbmRlckFsbChpbm5lciwgY3R4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcGxhY2VtZW50ID0gXCJcIjtcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IHJlc3VsdC5zbGljZSgwLCBtYXRjaC5pbmRleCkgKyByZXBsYWNlbWVudCArXG4gICAgICAgIHJlc3VsdC5zbGljZShtYXRjaC5pbmRleCArIGZ1bGwubGVuZ3RoKTtcbiAgICAgIGJsb2NrUmUubGFzdEluZGV4ID0gMDsgLy8gcmVzZXQgYWZ0ZXIgbW9kaWZ5aW5nIHN0cmluZ1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIGNvbnN0IHJlbmRlclZhcnMgPSAodHBsOiBzdHJpbmcsIGN0eDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiB0cGwucmVwbGFjZSgvXFx7XFx7KFtefV0rKVxcfVxcfS9nLCAobSwgcmF3KSA9PiB7XG4gICAgICBjb25zdCBrZXkgPSBTdHJpbmcocmF3KS50cmltKCk7XG4gICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoXCIjXCIpIHx8IGtleS5zdGFydHNXaXRoKFwiL1wiKSkgcmV0dXJuIG07IC8vIHNraXAgYmxvY2sgdGFnc1xuICAgICAgLy8gZGVmYXVsdCB2YWx1ZSBzdXBwb3J0OiB7e3ZhciB8fCAnZGVmYXVsdCd9fVxuICAgICAgaWYgKGtleS5pbmNsdWRlcyhcInx8XCIpKSB7XG4gICAgICAgIGNvbnN0IFtsaHMsIHJoc10gPSBrZXkuc3BsaXQoXCJ8fFwiKS5tYXAoKHM6IHN0cmluZykgPT4gcy50cmltKCkpO1xuICAgICAgICBjb25zdCB2YWwgPSBsb29rdXAoY3R4LCBsaHMucmVwbGFjZSgvWydcIl0vZywgXCJcIikpO1xuICAgICAgICBpZiAodmFsID09PSB1bmRlZmluZWQgfHwgdmFsID09PSBudWxsIHx8IHZhbCA9PT0gXCJcIikge1xuICAgICAgICAgIHJldHVybiBlc2NhcGVIdG1sKHJocy5yZXBsYWNlKC9eWydcIl18WydcIl0kL2csIFwiXCIpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXNjYXBlSHRtbCh2YWwpO1xuICAgICAgfVxuICAgICAgY29uc3QgdiA9IGxvb2t1cChjdHgsIGtleSk7XG4gICAgICByZXR1cm4gdiAhPT0gdW5kZWZpbmVkICYmIHYgIT09IG51bGwgPyBlc2NhcGVIdG1sKHYpIDogXCJcIjtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCByZW5kZXJUcmlwbGUgPSAodHBsOiBzdHJpbmcsIGN0eDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IHRyaXBsZVJlID0gL1xce1xce1xceyhbXn1dKylcXH1cXH1cXH0vZztcbiAgICByZXR1cm4gdHBsLnJlcGxhY2UodHJpcGxlUmUsIChfbSwgcmF3KSA9PiB7XG4gICAgICBjb25zdCBrZXkgPSBTdHJpbmcocmF3KS50cmltKCk7XG4gICAgICBjb25zdCB2YWwgPSBsb29rdXAoY3R4LCBrZXkpO1xuICAgICAgcmV0dXJuIHZhbCA9PT0gdW5kZWZpbmVkIHx8IHZhbCA9PT0gbnVsbCA/IFwiXCIgOiBTdHJpbmcodmFsKTtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCByZW5kZXJBbGwgPSAodHBsOiBzdHJpbmcsIGN0eDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IHdpdGhCbG9ja3MgPSByZW5kZXJCbG9ja3ModHBsLCBjdHgpO1xuICAgIGNvbnN0IHdpdGhUcmlwbGUgPSByZW5kZXJUcmlwbGUod2l0aEJsb2NrcywgY3R4KTtcbiAgICByZXR1cm4gcmVuZGVyVmFycyh3aXRoVHJpcGxlLCBjdHgpO1xuICB9O1xuXG4gIHJldHVybiByZW5kZXJBbGwodGVtcGxhdGVIdG1sLCBkYXRhKTtcbn07XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVUZW1wbGF0ZSA9IChkYXRhOiBQYXJ0aWFsPFRlbXBsYXRlPikgPT4ge1xuICBjb25zdCBkYiA9IGdldERhdGFiYXNlKCk7XG4gIGNvbnN0IHRlbXBsYXRlSWQgPSBnZW5lcmF0ZVVVSUQoKTtcblxuICBjb25zdCB0ZW1wbGF0ZTogVGVtcGxhdGUgPSB7XG4gICAgaWQ6IHRlbXBsYXRlSWQsXG4gICAgbmFtZTogZGF0YS5uYW1lISxcbiAgICBodG1sOiBkYXRhLmh0bWwhLFxuICAgIGlzRGVmYXVsdDogZGF0YS5pc0RlZmF1bHQgfHwgZmFsc2UsXG4gICAgdGVtcGxhdGVUeXBlOiBkYXRhLnRlbXBsYXRlVHlwZSB8fCBcImxvY2FsXCIsXG4gICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxuICB9O1xuXG4gIC8vIElmIHRoaXMgbmV3IHRlbXBsYXRlIGlzIG1hcmtlZCBhcyBkZWZhdWx0LCB1bnNldCBkZWZhdWx0IG9uIGFsbCBvdGhlcnMgZmlyc3RcbiAgaWYgKHRlbXBsYXRlLmlzRGVmYXVsdCkge1xuICAgIGRiLnF1ZXJ5KFwiVVBEQVRFIHRlbXBsYXRlcyBTRVQgaXNfZGVmYXVsdCA9IDBcIik7XG4gIH1cblxuICBkYi5xdWVyeShcbiAgICBcIklOU0VSVCBJTlRPIHRlbXBsYXRlcyAoaWQsIG5hbWUsIGh0bWwsIGlzX2RlZmF1bHQsIHRlbXBsYXRlX3R5cGUsIGNyZWF0ZWRfYXQpIFZBTFVFUyAoPywgPywgPywgPywgPywgPylcIixcbiAgICBbXG4gICAgICB0ZW1wbGF0ZS5pZCxcbiAgICAgIHRlbXBsYXRlLm5hbWUsXG4gICAgICB0ZW1wbGF0ZS5odG1sLFxuICAgICAgdGVtcGxhdGUuaXNEZWZhdWx0LFxuICAgICAgdGVtcGxhdGUudGVtcGxhdGVUeXBlLFxuICAgICAgdGVtcGxhdGUuY3JlYXRlZEF0LFxuICAgIF0sXG4gICk7XG5cbiAgcmV0dXJuIHRlbXBsYXRlO1xufTtcblxuLy8gSW5zZXJ0IG9yIHJlcGxhY2UgYSB0ZW1wbGF0ZSB3aXRoIGEgc3BlY2lmaWMgaWQgKHVzZWQgYnkgbWFuaWZlc3QgaW5zdGFsbHMpXG5leHBvcnQgY29uc3QgdXBzZXJ0VGVtcGxhdGVXaXRoSWQgPSAoXG4gIGlkOiBzdHJpbmcsXG4gIGRhdGE6IFBhcnRpYWw8VGVtcGxhdGU+LFxuKSA9PiB7XG4gIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgaWYgKGRhdGEuaXNEZWZhdWx0ID09PSB0cnVlKSB7XG4gICAgZGIucXVlcnkoXCJVUERBVEUgdGVtcGxhdGVzIFNFVCBpc19kZWZhdWx0ID0gMCBXSEVSRSBpZCAhPSA/XCIsIFtpZF0pO1xuICB9XG4gIGRiLnF1ZXJ5KFxuICAgIFwiSU5TRVJUIE9SIFJFUExBQ0UgSU5UTyB0ZW1wbGF0ZXMgKGlkLCBuYW1lLCBodG1sLCBpc19kZWZhdWx0LCB0ZW1wbGF0ZV90eXBlLCBjcmVhdGVkX2F0KSBWQUxVRVMgKD8sID8sID8sID8sID8sID8pXCIsXG4gICAgW1xuICAgICAgaWQsXG4gICAgICBkYXRhLm5hbWUgfHwgaWQsXG4gICAgICBkYXRhLmh0bWwgfHwgXCJcIixcbiAgICAgIGRhdGEuaXNEZWZhdWx0IHx8IGZhbHNlLFxuICAgICAgZGF0YS50ZW1wbGF0ZVR5cGUgfHwgXCJyZW1vdGVcIixcbiAgICAgIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBdLFxuICApO1xuICByZXR1cm4gZ2V0VGVtcGxhdGVCeUlkKGlkKTtcbn07XG5cbmV4cG9ydCBjb25zdCB1cGRhdGVUZW1wbGF0ZSA9IChpZDogc3RyaW5nLCBkYXRhOiBQYXJ0aWFsPFRlbXBsYXRlPikgPT4ge1xuICBjb25zdCBkYiA9IGdldERhdGFiYXNlKCk7XG4gIC8vIEVuZm9yY2UgYSBzaW5nbGUgZGVmYXVsdCB3aGVuIHRvZ2dsaW5nIGlzRGVmYXVsdCB0byB0cnVlXG4gIGlmIChkYXRhLmlzRGVmYXVsdCA9PT0gdHJ1ZSkge1xuICAgIGRiLnF1ZXJ5KFwiVVBEQVRFIHRlbXBsYXRlcyBTRVQgaXNfZGVmYXVsdCA9IDAgV0hFUkUgaWQgIT0gP1wiLCBbaWRdKTtcbiAgfVxuXG4gIGRiLnF1ZXJ5KFxuICAgIFwiVVBEQVRFIHRlbXBsYXRlcyBTRVQgbmFtZSA9ID8sIGh0bWwgPSA/LCBpc19kZWZhdWx0ID0gPyBXSEVSRSBpZCA9ID9cIixcbiAgICBbZGF0YS5uYW1lLCBkYXRhLmh0bWwsIGRhdGEuaXNEZWZhdWx0LCBpZF0sXG4gICk7XG5cbiAgY29uc3QgcmVzdWx0ID0gZGIucXVlcnkoXG4gICAgXCJTRUxFQ1QgaWQsIG5hbWUsIGh0bWwsIGlzX2RlZmF1bHQsIHRlbXBsYXRlX3R5cGUsIGNyZWF0ZWRfYXQgRlJPTSB0ZW1wbGF0ZXMgV0hFUkUgaWQgPSA/XCIsXG4gICAgW2lkXSxcbiAgKTtcbiAgaWYgKHJlc3VsdC5sZW5ndGggPiAwKSB7XG4gICAgY29uc3Qgcm93ID0gcmVzdWx0WzBdIGFzIHVua25vd25bXTtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvd1swXSBhcyBzdHJpbmcsXG4gICAgICBuYW1lOiByb3dbMV0gYXMgc3RyaW5nLFxuICAgICAgaHRtbDogcm93WzJdIGFzIHN0cmluZyxcbiAgICAgIGlzRGVmYXVsdDogcm93WzNdIGFzIGJvb2xlYW4sXG4gICAgICB0ZW1wbGF0ZVR5cGU6IChyb3dbNF0gYXMgVGVtcGxhdGVUeXBlKSB8fCBcImJ1aWx0aW5cIixcbiAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUocm93WzVdIGFzIHN0cmluZyksXG4gICAgfTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn07XG5cbmV4cG9ydCBjb25zdCBkZWxldGVUZW1wbGF0ZSA9IChpZDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgZGIucXVlcnkoXCJERUxFVEUgRlJPTSB0ZW1wbGF0ZXMgV0hFUkUgaWQgPSA/XCIsIFtpZF0pO1xuICAvLyBCZXN0LWVmZm9ydCBjbGVhbnVwIG9mIHN0b3JlZCBmaWxlcyBmb3IgdGhpcyB0ZW1wbGF0ZSBpZCAoYWxsIHZlcnNpb25zKVxuICB0cnkge1xuICAgIGNvbnN0IGRpciA9IHJlc29sdmVJbkRhdGFSb290KFwidGVtcGxhdGVzXCIsIGlkKTtcbiAgICAvLyBSZW1vdmUgcmVjdXJzaXZlbHkgaWYgZXhpc3RzXG4gICAgRGVuby5yZW1vdmVTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIH0gY2F0Y2ggKF9lKSB7XG4gICAgLy8gaWdub3JlIG1pc3Npbmcgb3IgcGVybWlzc2lvbiBlcnJvcnNcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIFNldCB0aGUgYWN0aXZlIGRlZmF1bHQgdGVtcGxhdGUgYnkgaWQsIHVuc2V0dGluZyBhbGwgb3RoZXJzXG5leHBvcnQgY29uc3Qgc2V0RGVmYXVsdFRlbXBsYXRlID0gKGlkOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpO1xuICAvLyBSZXNldCBhbGxcbiAgZGIucXVlcnkoXCJVUERBVEUgdGVtcGxhdGVzIFNFVCBpc19kZWZhdWx0ID0gMFwiKTtcbiAgLy8gU2V0IHJlcXVlc3RlZCBpZDsgaWdub3JlIGlmIG5vdCBmb3VuZCAobm8gcm93cyB1cGRhdGVkKVxuICBkYi5xdWVyeShcIlVQREFURSB0ZW1wbGF0ZXMgU0VUIGlzX2RlZmF1bHQgPSAxIFdIRVJFIGlkID0gP1wiLCBbaWRdKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBMb2NhbCB6aXAgbWFuaWZlc3Qgc2NoZW1hIChzaW1pbGFyIHRvIHJlbW90ZSBtYW5pZmVzdHMpXG50eXBlIExvY2FsTWFuaWZlc3QgPSB7XG4gIGlkOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgdmVyc2lvbj86IHN0cmluZztcbiAgaHRtbDoge1xuICAgIHBhdGg6IHN0cmluZztcbiAgfTtcbn07XG5cbmZ1bmN0aW9uIGFzc2VydExvY2FsTWFuaWZlc3RTaGFwZShtOiB1bmtub3duKTogYXNzZXJ0cyBtIGlzIExvY2FsTWFuaWZlc3Qge1xuICBpZiAoIW0gfHwgdHlwZW9mIG0gIT09IFwib2JqZWN0XCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNYW5pZmVzdCBtdXN0IGJlIGFuIG9iamVjdFwiKTtcbiAgfVxuICBjb25zdCByID0gbSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgZm9yIChjb25zdCBrIG9mIFtcImlkXCIsIFwibmFtZVwiLCBcImh0bWxcIl0pIHtcbiAgICBpZiAoIShrIGluIHIpKSB0aHJvdyBuZXcgRXJyb3IoYE1hbmlmZXN0IG1pc3NpbmcgJHtrfWApO1xuICB9XG4gIGNvbnN0IGh0bWwgPSByLmh0bWwgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGlmICghaHRtbCB8fCB0eXBlb2YgaHRtbC5wYXRoICE9PSBcInN0cmluZ1wiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaHRtbC5wYXRoIGlzIHJlcXVpcmVkXCIpO1xuICB9XG59XG5cbi8vIEluc3RhbGwgYSB0ZW1wbGF0ZSBmcm9tIGFuIHVwbG9hZGVkIC56aXAgZmlsZSAobG9jYWwgdGVtcGxhdGUpXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFsbExvY2FsVGVtcGxhdGVGcm9tWmlwKFxuICB6aXBEYXRhOiBVaW50OEFycmF5PEFycmF5QnVmZmVyPixcbik6IFByb21pc2U8VGVtcGxhdGU+IHtcbiAgLy8gQ3JlYXRlIGEgYmxvYiBmcm9tIHRoZSB6aXAgZGF0YSBmb3IgdGhlIFppcFJlYWRlclxuICBjb25zdCBibG9iID0gbmV3IEJsb2IoW3ppcERhdGFdKTtcbiAgY29uc3QgemlwUmVhZGVyID0gbmV3IFppcFJlYWRlcihibG9iLnN0cmVhbSgpKTtcblxuICB0cnkge1xuICAgIGNvbnN0IGVudHJpZXMgPSBhd2FpdCB6aXBSZWFkZXIuZ2V0RW50cmllcygpO1xuXG4gICAgLy8gRGV0ZWN0IGlmIGZpbGVzIGFyZSBpbiBhIHN1YmZvbGRlciAoV2luZG93cy1zdHlsZSB6aXApXG4gICAgLy8gTG9vayBmb3IgbWFuaWZlc3QgYXQgcm9vdCBmaXJzdCwgdGhlbiBjaGVjayBmb3Igc2luZ2xlIHN1YmZvbGRlclxuICAgIGxldCByb290UHJlZml4ID0gXCJcIjtcbiAgICBsZXQgbWFuaWZlc3RFbnRyeSA9IGVudHJpZXMuZmluZChcbiAgICAgIChlOiB7IGZpbGVuYW1lOiBzdHJpbmcgfSkgPT5cbiAgICAgICAgZS5maWxlbmFtZSA9PT0gXCJtYW5pZmVzdC55YW1sXCIgfHxcbiAgICAgICAgZS5maWxlbmFtZSA9PT0gXCJtYW5pZmVzdC55bWxcIiB8fFxuICAgICAgICBlLmZpbGVuYW1lID09PSBcIm1hbmlmZXN0Lmpzb25cIixcbiAgICApO1xuXG4gICAgaWYgKCFtYW5pZmVzdEVudHJ5KSB7XG4gICAgICAvLyBDaGVjayBpZiB0aGVyZSdzIGEgc2luZ2xlIHJvb3QgZm9sZGVyIGNvbnRhaW5pbmcgdGhlIG1hbmlmZXN0XG4gICAgICBjb25zdCB0b3BMZXZlbERpcnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgICBjb25zdCBwYXJ0cyA9IGVudHJ5LmZpbGVuYW1lLnNwbGl0KFwiL1wiKTtcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEgJiYgcGFydHNbMF0pIHtcbiAgICAgICAgICB0b3BMZXZlbERpcnMuYWRkKHBhcnRzWzBdKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGVyZSdzIGV4YWN0bHkgb25lIHRvcC1sZXZlbCBkaXJlY3RvcnksIGxvb2sgZm9yIG1hbmlmZXN0IGluc2lkZSBpdFxuICAgICAgaWYgKHRvcExldmVsRGlycy5zaXplID09PSAxKSB7XG4gICAgICAgIGNvbnN0IGZvbGRlck5hbWUgPSBbLi4udG9wTGV2ZWxEaXJzXVswXTtcbiAgICAgICAgcm9vdFByZWZpeCA9IGAke2ZvbGRlck5hbWV9L2A7XG4gICAgICAgIG1hbmlmZXN0RW50cnkgPSBlbnRyaWVzLmZpbmQoXG4gICAgICAgICAgKGU6IHsgZmlsZW5hbWU6IHN0cmluZyB9KSA9PlxuICAgICAgICAgICAgZS5maWxlbmFtZSA9PT0gYCR7cm9vdFByZWZpeH1tYW5pZmVzdC55YW1sYCB8fFxuICAgICAgICAgICAgZS5maWxlbmFtZSA9PT0gYCR7cm9vdFByZWZpeH1tYW5pZmVzdC55bWxgIHx8XG4gICAgICAgICAgICBlLmZpbGVuYW1lID09PSBgJHtyb290UHJlZml4fW1hbmlmZXN0Lmpzb25gLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbWFuaWZlc3RFbnRyeSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBcIk5vIG1hbmlmZXN0LnlhbWwgb3IgbWFuaWZlc3QuanNvbiBmb3VuZCBpbiB6aXAgcm9vdCAob3Igc2luZ2xlIHN1YmZvbGRlcilcIixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gUmVhZCBhbmQgcGFyc2UgbWFuaWZlc3QgdXNpbmcgYSBzaW1wbGVyIGFwcHJvYWNoXG4gICAgY29uc3QgbWFuaWZlc3RDaHVua3M6IFVpbnQ4QXJyYXlbXSA9IFtdO1xuICAgIGNvbnN0IG1hbmlmZXN0V3JpdGVyID0gbmV3IFdyaXRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+KHtcbiAgICAgIHdyaXRlKGNodW5rOiBVaW50OEFycmF5KSB7XG4gICAgICAgIG1hbmlmZXN0Q2h1bmtzLnB1c2goY2h1bmspO1xuICAgICAgfSxcbiAgICB9KTtcbiAgICBhd2FpdCBtYW5pZmVzdEVudHJ5LmdldERhdGEhKG1hbmlmZXN0V3JpdGVyKTtcbiAgICBjb25zdCBtYW5pZmVzdEJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoXG4gICAgICBtYW5pZmVzdENodW5rcy5yZWR1Y2UoKGFjYzogbnVtYmVyLCBjOiBVaW50OEFycmF5KSA9PiBhY2MgKyBjLmxlbmd0aCwgMCksXG4gICAgKTtcbiAgICBsZXQgb2Zmc2V0ID0gMDtcbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIG1hbmlmZXN0Q2h1bmtzKSB7XG4gICAgICBtYW5pZmVzdEJ5dGVzLnNldChjaHVuaywgb2Zmc2V0KTtcbiAgICAgIG9mZnNldCArPSBjaHVuay5sZW5ndGg7XG4gICAgfVxuICAgIGNvbnN0IG1hbmlmZXN0VGV4dCA9IG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShtYW5pZmVzdEJ5dGVzKTtcblxuICAgIGxldCBtYW5pZmVzdDogTG9jYWxNYW5pZmVzdDtcbiAgICB0cnkge1xuICAgICAgbWFuaWZlc3QgPSBwYXJzZVlhbWwobWFuaWZlc3RUZXh0KSBhcyBMb2NhbE1hbmlmZXN0O1xuICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICB0cnkge1xuICAgICAgICBtYW5pZmVzdCA9IEpTT04ucGFyc2UobWFuaWZlc3RUZXh0KSBhcyBMb2NhbE1hbmlmZXN0O1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1hbmlmZXN0IHBhcnNlIGZhaWxlZFwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgYXNzZXJ0TG9jYWxNYW5pZmVzdFNoYXBlKG1hbmlmZXN0KTtcblxuICAgIGNvbnN0IG1hbmlmZXN0SWQgPSBlbmZvcmNlU2FmZUlkZW50aWZpZXIobWFuaWZlc3QuaWQsIFwibWFuaWZlc3QuaWRcIik7XG4gICAgY29uc3QgbWFuaWZlc3RWZXJzaW9uID0gbWFuaWZlc3QudmVyc2lvblxuICAgICAgPyBlbmZvcmNlU2FmZUlkZW50aWZpZXIobWFuaWZlc3QudmVyc2lvbiwgXCJtYW5pZmVzdC52ZXJzaW9uXCIpXG4gICAgICA6IFwiMS4wLjBcIjtcbiAgICBjb25zdCBodG1sUGF0aCA9IHNhbml0aXplTWFuaWZlc3RQYXRoKFN0cmluZyhtYW5pZmVzdC5odG1sLnBhdGgpKTtcblxuICAgIC8vIEZpbmQgYW5kIHJlYWQgdGhlIEhUTUwgZmlsZSAoY2hlY2sgd2l0aCByb290UHJlZml4IGZvciBXaW5kb3dzLXN0eWxlIHppcHMpXG4gICAgY29uc3QgaHRtbEVudHJ5ID0gZW50cmllcy5maW5kKFxuICAgICAgKGU6IHsgZmlsZW5hbWU6IHN0cmluZyB9KSA9PlxuICAgICAgICBlLmZpbGVuYW1lID09PSBgJHtyb290UHJlZml4fSR7aHRtbFBhdGh9YCB8fFxuICAgICAgICBlLmZpbGVuYW1lID09PSBgJHtyb290UHJlZml4fS4vJHtodG1sUGF0aH1gIHx8XG4gICAgICAgIGUuZmlsZW5hbWUgPT09IGh0bWxQYXRoIHx8XG4gICAgICAgIGUuZmlsZW5hbWUgPT09IGAuLyR7aHRtbFBhdGh9YCxcbiAgICApO1xuICAgIGlmICghaHRtbEVudHJ5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEhUTUwgZmlsZSBub3QgZm91bmQgaW4gemlwOiAke2h0bWxQYXRofWApO1xuICAgIH1cblxuICAgIGNvbnN0IGh0bWxDaHVua3M6IFVpbnQ4QXJyYXlbXSA9IFtdO1xuICAgIGNvbnN0IGh0bWxXcml0ZXIgPSBuZXcgV3JpdGFibGVTdHJlYW08VWludDhBcnJheT4oe1xuICAgICAgd3JpdGUoY2h1bms6IFVpbnQ4QXJyYXkpIHtcbiAgICAgICAgaHRtbENodW5rcy5wdXNoKGNodW5rKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgYXdhaXQgaHRtbEVudHJ5LmdldERhdGEhKGh0bWxXcml0ZXIpO1xuICAgIGNvbnN0IGh0bWxCeXRlcyA9IG5ldyBVaW50OEFycmF5KFxuICAgICAgaHRtbENodW5rcy5yZWR1Y2UoKGFjYzogbnVtYmVyLCBjOiBVaW50OEFycmF5KSA9PiBhY2MgKyBjLmxlbmd0aCwgMCksXG4gICAgKTtcbiAgICBsZXQgaHRtbE9mZnNldCA9IDA7XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiBodG1sQ2h1bmtzKSB7XG4gICAgICBodG1sQnl0ZXMuc2V0KGNodW5rLCBodG1sT2Zmc2V0KTtcbiAgICAgIGh0bWxPZmZzZXQgKz0gY2h1bmsubGVuZ3RoO1xuICAgIH1cblxuICAgIGlmIChodG1sQnl0ZXMuYnl0ZUxlbmd0aCA+IDEyOCAqIDEwMjQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkhUTUwgdG9vIGxhcmdlICg+MTI4S0IpXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IGh0bWwgPSBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoaHRtbEJ5dGVzKTtcbiAgICBiYXNpY0h0bWxTYW5pdHkoaHRtbCk7XG5cbiAgICAvLyBTdG9yZSB0ZW1wbGF0ZSBmaWxlcyBvbiBkaXNrXG4gICAgY29uc3QgYmFzZURpciA9IHJlc29sdmVJbkRhdGFSb290KFwidGVtcGxhdGVzXCIsIG1hbmlmZXN0SWQsIG1hbmlmZXN0VmVyc2lvbik7XG4gICAgY29uc3Qgb3V0UGF0aCA9IHJlc29sdmUoYmFzZURpciwgaHRtbFBhdGgpO1xuICAgIGNvbnN0IHJlbCA9IHJlbGF0aXZlKGJhc2VEaXIsIG91dFBhdGgpO1xuICAgIGlmICghcmVsIHx8IHJlbC5zdGFydHNXaXRoKFwiLi5cIikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImh0bWwucGF0aCBlc2NhcGVzIHRlbXBsYXRlIGRpcmVjdG9yeVwiKTtcbiAgICB9XG5cbiAgICBhd2FpdCBEZW5vLm1rZGlyKGRpcm5hbWUob3V0UGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIGF3YWl0IERlbm8ud3JpdGVUZXh0RmlsZShvdXRQYXRoLCBodG1sKTtcblxuICAgIC8vIFNhdmUgdG8gZGF0YWJhc2UgYXMgbG9jYWwgdGVtcGxhdGUgKG5vIHNvdXJjZSBVUkwgc3RvcmVkKVxuICAgIGNvbnN0IHNhdmVkID0gdXBzZXJ0VGVtcGxhdGVXaXRoSWQobWFuaWZlc3RJZCwge1xuICAgICAgbmFtZTogYCR7bWFuaWZlc3QubmFtZX0gJHttYW5pZmVzdFZlcnNpb24gPyBgdiR7bWFuaWZlc3RWZXJzaW9ufWAgOiBcIlwifWBcbiAgICAgICAgLnRyaW0oKSxcbiAgICAgIGh0bWwsXG4gICAgICBpc0RlZmF1bHQ6IGZhbHNlLFxuICAgICAgdGVtcGxhdGVUeXBlOiBcImxvY2FsXCIsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2F2ZWQhO1xuICB9IGZpbmFsbHkge1xuICAgIGF3YWl0IHppcFJlYWRlci5jbG9zZSgpO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxXQUFXLFFBQVEsc0JBQXNCO0FBRWxELFNBQVMsaUJBQWlCLFFBQVEsd0JBQXdCO0FBQzFELFNBQVMsWUFBWSxRQUFRLG1CQUFtQjtBQUNoRCxTQUFTLFNBQVMsU0FBUyxRQUFRLE9BQU87QUFDMUMsU0FBUyxPQUFPLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsT0FBTyxRQUFRLFdBQVc7QUFDN0UsU0FBUyxTQUFTLFFBQVEsNkNBQTZDO0FBcUJ2RSxlQUFlLFVBQVUsR0FBUTtFQUMvQixNQUFNLE1BQU0sTUFBTSxVQUFVO0VBQzVCLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxNQUFNLElBQUksTUFBTSxDQUFDLGFBQWEsRUFBRSxJQUFJLE1BQU0sRUFBRTtFQUN6RCxPQUFPLE1BQU0sSUFBSSxJQUFJO0FBQ3ZCO0FBRUEsZUFBZSxXQUFXLEdBQVE7RUFDaEMsTUFBTSxNQUFNLE1BQU0sVUFBVTtFQUM1QixJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsTUFBTSxJQUFJLE1BQU0sQ0FBQyxhQUFhLEVBQUUsSUFBSSxNQUFNLEVBQUU7RUFDekQsTUFBTSxTQUFTLE1BQU0sSUFBSSxXQUFXO0VBQ3BDLE9B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
// denoCacheMetadata=6294157407561707353,14716437518947900369