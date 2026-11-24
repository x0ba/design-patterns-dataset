import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFString } from "pdf-lib";
import { generateInvoiceXML } from "./xmlProfiles.ts";
import { generateZugferdXMP } from "./xmp.ts";
import { join } from "std/path";
import { contentTypeFromLogoPath, normalizeStoredLogoReference, resolveLogoFsPathFromPublicPath } from "./logoStorage.ts";
import { getTemplateById, renderTemplate as renderTpl } from "../controllers/templates.ts";
import { getDefaultTemplate } from "../controllers/templates.ts";
import { getInvoiceLabels } from "../i18n/translations.ts";
// pdf-lib is used to embed XML attachments and tweak metadata after rendering
// ---- Basic color helpers ----
function normalizeHex(hex) {
  if (!hex) return undefined;
  const h = hex.trim();
  if (/^#?[0-9a-fA-F]{6}$/.test(h)) return h.startsWith("#") ? h : `#${h}`;
  return undefined;
}
function escapeHtml(value) {
  const str = value === undefined || value === null ? "" : String(value);
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function _escapeHtmlWithBreaks(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}
const CITY_FIRST_POSTAL_COUNTRIES = new Set([
  "US",
  "GB",
  "BR",
  "AU",
  "CA",
  "NZ",
  "IE",
  "MX"
]);
function normalizePostalCityFormat(value) {
  if (value === "city-postal" || value === "postal-city") return value;
  return "auto";
}
function formatPostalCityLine(postalCode, city, countryCode, format) {
  const postal = (postalCode || "").trim();
  const place = (city || "").trim();
  if (!postal && !place) return undefined;
  if (!postal) return place;
  if (!place) return postal;
  const normalizedFormat = normalizePostalCityFormat(format);
  if (normalizedFormat === "city-postal") {
    // City + Postal formats frequently expect a comma for readable locality. Example: Boston, 02110
    return `${place}, ${postal}`;
  }
  if (normalizedFormat === "postal-city") {
    return `${postal} ${place}`;
  }
  const country = (countryCode || "").trim().toUpperCase();
  if (CITY_FIRST_POSTAL_COUNTRIES.has(country)) {
    return `${place} ${postal}`;
  }
  return `${postal} ${place}`;
}
const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1"
]);
function isPrivateIPv4Host(hostname) {
  const parts = hostname.split(".").map((n)=>Number(n));
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
  return false;
}
function isPrivateIPv6Host(hostname) {
  const lower = hostname.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fd") || lower.startsWith("fc")) return true;
  if (lower.startsWith("fe80")) return true;
  return false;
}
function tryParseSafeRemoteUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch  {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return null;
  if (isPrivateIPv4Host(host) || isPrivateIPv6Host(host)) return null;
  return url;
}
function lighten(hex, amount = 0.85) {
  const n = normalizeHex(hex) ?? "#2563eb";
  const m = n.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const mix = (c)=>Math.round(c + (255 - c) * amount);
  const rr = mix(r).toString(16).padStart(2, "0");
  const gg = mix(g).toString(16).padStart(2, "0");
  const bb = mix(b).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}`;
}
function formatDate(d, format = "YYYY-MM-DD") {
  if (!d) return undefined;
  const date = new Date(d);
  // Issue/due dates are stored as UTC midnight; read UTC parts so the
  // server's timezone can't shift them by a day.
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  if (format === "DD.MM.YYYY") {
    return `${day}.${month}.${year}`;
  }
  // Default to YYYY-MM-DD
  return `${year}-${month}-${day}`;
}
function normalizeLogoUrlForRender(logo, forceAbsolute = false) {
  if (!logo) return undefined;
  const value = normalizeStoredLogoReference(logo.trim());
  if (!value) return undefined;
  if (value.startsWith("data:")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) {
    if (forceAbsolute) {
      const fsPath = resolveLogoFsPathFromPublicPath(value);
      if (fsPath) {
        const normalized = fsPath.replaceAll("\\", "/").replace(/^\/*/, "/");
        return `file://${normalized}`;
      }
    }
    if (!forceAbsolute) return value;
    const base = Deno.env.get("BASE_URL") || "http://localhost:3000";
    try {
      return new URL(value, base).toString();
    } catch  {
      return value;
    }
  }
  return value;
}
function formatMoney(value, currency, numberFormat = "comma") {
  // Create a custom locale based on the number format preference
  let locale;
  let options;
  if (numberFormat === "period") {
    // European style: 1.000,00
    locale = "de-DE"; // German locale uses period as thousands separator and comma as decimal
    options = {
      style: "currency",
      currency
    };
  } else {
    // US style: 1,000.00
    locale = "en-US";
    options = {
      style: "currency",
      currency
    };
  }
  return new Intl.NumberFormat(locale, options).format(value);
}
async function _inlineLogoIfPossible(settings) {
  if (!settings?.logo) return settings;
  const url = settings.logo.trim();
  if (url.startsWith("data:")) {
    return {
      ...settings,
      logoUrl: url
    };
  }
  const toDataUrl = (bytes, mime = "image/png")=>{
    const base64 = btoa(String.fromCharCode(...bytes));
    return `data:${mime};base64,${base64}`;
  };
  try {
    if (url.startsWith("/") && resolveLogoFsPathFromPublicPath(url)) {
      const fsPath = resolveLogoFsPathFromPublicPath(url);
      if (fsPath) {
        const file = await Deno.readFile(fsPath);
        return {
          ...settings,
          logoUrl: toDataUrl(file, contentTypeFromLogoPath(fsPath))
        };
      }
    }
    const remote = tryParseSafeRemoteUrl(url);
    if (remote) {
      const res = await fetch(remote);
      if (!res.ok) return settings;
      const buf = new Uint8Array(await res.arrayBuffer());
      const mime = res.headers.get("content-type") ?? "image/png";
      return {
        ...settings,
        logoUrl: toDataUrl(buf, mime)
      };
    }
    // Attempt local file read (prevent traversal)
    if (url.includes("..")) {
      return settings;
    }
    const file = await Deno.readFile(url);
    let mime = "image/png";
    if (url.endsWith(".jpg") || url.endsWith(".jpeg")) mime = "image/jpeg";
    if (url.endsWith(".svg")) mime = "image/svg+xml";
    return {
      ...settings,
      logoUrl: toDataUrl(file, mime)
    };
  } catch (_e) {
    return settings; // keep original
  }
}
function buildContext(invoice, settings, _highlight, dateFormat, numberFormat, localeOverride, forceAbsoluteLogoUrl = false) {
  const requestedLocale = localeOverride ?? invoice.locale ?? settings?.locale;
  const { locale: resolvedLocale, labels } = getInvoiceLabels(requestedLocale);
  const currency = invoice.currency || settings?.currency || "USD";
  const companyPostalCity = formatPostalCityLine(settings?.companyPostalCode, settings?.companyCity, settings?.companyCountryCode, settings?.postalCityFormat);
  const taxLabel = settings?.taxLabel && String(settings.taxLabel).trim() ? String(settings.taxLabel).trim() : labels.taxLabel;
  // Build tax summary from normalized taxes if present
  let taxSummary = invoice.taxes && invoice.taxes.length > 0 ? invoice.taxes.map((t)=>({
      label: `${taxLabel} ${t.percent}%`,
      percent: t.percent,
      taxable: formatMoney(t.taxableAmount, currency, numberFormat || "comma"),
      amount: formatMoney(t.taxAmount, currency, numberFormat || "comma")
    })) : undefined;
  // Fallback: synthesize a single-row summary from invoice-level taxRate
  if ((!taxSummary || taxSummary.length === 0) && invoice.taxAmount > 0) {
    const percent = invoice.taxRate || 0;
    const taxableBase = Math.max(0, (invoice.subtotal || 0) - (invoice.discountAmount || 0));
    taxSummary = [
      {
        label: `${taxLabel} ${percent}%`,
        percent,
        taxable: formatMoney(taxableBase, currency, numberFormat || "comma"),
        amount: formatMoney(invoice.taxAmount, currency, numberFormat || "comma")
      }
    ];
  }
  const hasItemUnits = invoice.items.some((i)=>typeof i.unit === "string" && i.unit.trim().length > 0);
  return {
    // Company
    companyName: settings?.companyName || "Your Company",
    companyAddress: _escapeHtmlWithBreaks(settings?.companyAddress || ""),
    companyCity: (settings?.companyCity || "").trim() || undefined,
    companyPostalCode: (settings?.companyPostalCode || "").trim() || undefined,
    companyPostalCity,
    companyEmail: settings?.companyEmail || "",
    companyPhone: settings?.companyPhone || "",
    companyTaxId: settings?.companyTaxId || "",
    // Invoice
    invoiceNumber: invoice.invoiceNumber,
    issueDate: formatDate(invoice.issueDate, dateFormat),
    dueDate: formatDate(invoice.dueDate, dateFormat),
    currency,
    status: invoice.status,
    // Customer
    customerName: invoice.customer.name,
    customerContactName: invoice.customer.contactName,
    customerEmail: invoice.customer.email,
    customerPhone: invoice.customer.phone,
    customerAddress: _escapeHtmlWithBreaks(invoice.customer.address),
    customerCity: invoice.customer.city,
    customerPostalCode: invoice.customer.postalCode,
    customerRegion: invoice.customer.region,
    customerCountryCode: invoice.customer.countryCode,
    customerPostalCity: formatPostalCityLine(invoice.customer.postalCode, invoice.customer.city, invoice.customer.countryCode, settings?.postalCityFormat),
    customerTaxId: invoice.customer.taxId,
    // Items
    items: invoice.items.map((i)=>({
        description: i.description,
        quantity: i.quantity,
        unit: typeof i.unit === "string" && i.unit.trim().length > 0 ? i.unit.trim() : undefined,
        unitPrice: formatMoney(i.unitPrice, currency, numberFormat || "comma"),
        lineTotal: formatMoney(i.lineTotal, currency, numberFormat || "comma"),
        notes: i.notes
      })),
    hasItemUnits,
    // Totals
    subtotal: formatMoney(invoice.subtotal, currency, numberFormat || "comma"),
    discountAmount: invoice.discountAmount > 0 ? formatMoney(invoice.discountAmount, currency, numberFormat || "comma") : undefined,
    discountPercentage: invoice.discountPercentage || undefined,
    taxRate: invoice.taxRate || undefined,
    taxAmount: invoice.taxAmount > 0 ? formatMoney(invoice.taxAmount, currency, numberFormat || "comma") : undefined,
    total: formatMoney(invoice.total, currency, numberFormat || "comma"),
    taxSummary,
    hasTaxSummary: Boolean(taxSummary && taxSummary.length > 0),
    // Net subtotal (taxable base after discount, before tax) for convenience
    netSubtotal: formatMoney(Math.max(0, (invoice.subtotal || 0) - (invoice.discountAmount || 0)), currency, numberFormat || "comma"),
    // Flags
    hasDiscount: invoice.discountAmount > 0,
    hasTax: invoice.taxAmount > 0,
    // Payment
    paymentTerms: invoice.paymentTerms || settings?.paymentTerms || undefined,
    paymentMethods: settings?.paymentMethods || undefined,
    bankAccount: settings?.bankAccount || undefined,
    // Notes
    notes: invoice.notes || settings?.defaultNotes || undefined,
    // Internationalization
    locale: resolvedLocale,
    labels,
    // Non-mustache extras consumed by templates
    // Prefer inlined data URL if available; otherwise pass through the provided logo value
    logoUrl: normalizeLogoUrlForRender(settings?.logoUrl || settings?.logo, forceAbsoluteLogoUrl),
    // Permanently use logo-left layout
    brandLogoLeft: true
  };
}
export async function generateInvoicePDF(invoiceData, businessSettings, templateId, customHighlightColor, opts) {
  // Keep logos as normal URLs/files for WeasyPrint.
  // Data URLs significantly slow down rendering for larger images.
  const renderSettings = businessSettings;
  const html = buildInvoiceHTML(invoiceData, renderSettings, templateId, customHighlightColor, opts?.dateFormat, opts?.numberFormat, opts?.locale ?? invoiceData.locale ?? renderSettings?.locale, true);
  const attachments = [];
  if (opts?.embedXml) {
    try {
      const profileId = opts.embedXmlProfileId || "ubl21";
      const { xml, profile } = generateInvoiceXML(profileId, invoiceData, renderSettings || {});
      attachments.push({
        fileName: `invoice-${invoiceData.invoiceNumber || invoiceData.id}.${profile.fileExtension}`,
        bytes: new TextEncoder().encode(xml)
      });
    } catch (error) {
      console.warn("Failed to prepare XML attachment:", error);
    }
  }
  try {
    return await renderPdfWithWeasyPrint(html, attachments);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`WeasyPrint PDF rendering failed: ${msg}`);
  }
}
export function buildInvoiceHTML(invoice, settings, templateId, highlight, dateFormat, numberFormat, localeOverride, forceAbsoluteLogoUrl = false) {
  const ctx = buildContext(invoice, settings, highlight, dateFormat, numberFormat, localeOverride, forceAbsoluteLogoUrl);
  const hl = normalizeHex(highlight) || "#2563eb";
  const hlLight = lighten(hl, 0.86);
  let template;
  if (templateId) {
    try {
      template = getTemplateById(templateId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`Failed to load template ${templateId}: ${message}`);
    }
  }
  const fallbackTemplate = template ?? getDefaultTemplate();
  if (!fallbackTemplate) {
    throw new Error("No invoice templates available. Ensure database migrations have seeded templates.");
  }
  return renderTpl(fallbackTemplate.html, {
    ...ctx,
    highlightColor: hl,
    highlightColorLight: hlLight
  });
}
async function resolveWeasyPrintExecutable() {
  const candidates = [];
  try {
    const configured = Deno.env.get("WEASYPRINT_BIN");
    if (configured && configured.trim().length > 0) {
      candidates.push(configured.trim());
    }
  } catch  {
  // ignore env access errors
  }
  candidates.push("weasyprint");
  for (const candidate of candidates){
    try {
      const probe = new Deno.Command(candidate, {
        args: [
          "--version"
        ],
        stdout: "piped",
        stderr: "piped"
      });
      const { success } = await probe.output();
      if (success) return candidate;
    } catch  {
    // continue probing
    }
  }
  return null;
}
async function runWeasyPrint(executable, inputHtmlPath, outputPdfPath, attachmentPaths, includePdfVariant) {
  const args = [
    inputHtmlPath,
    outputPdfPath,
    "--media-type",
    "screen"
  ];
  if (includePdfVariant) {
    args.push("--pdf-variant", "pdf/a-3b");
  }
  for (const p of attachmentPaths){
    args.push("--attachment", p);
  }
  const cmd = new Deno.Command(executable, {
    args,
    stdout: "piped",
    stderr: "piped"
  });
  const { code, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(new TextDecoder().decode(stderr) || `weasyprint exited with code ${code}`);
  }
}
function resolveCssVariablesForWeasy(html) {
  const variableMap = new Map();
  const rootVarRegex = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
  let m;
  while((m = rootVarRegex.exec(html)) !== null){
    variableMap.set(m[1], m[2].trim());
  }
  return html.replace(/var\(\s*--([a-zA-Z0-9_-]+)\s*(?:,[^)]+)?\)/g, (full, name)=>{
    return variableMap.get(name) || full;
  });
}
async function renderPdfWithWeasyPrint(html, attachments) {
  const executable = await resolveWeasyPrintExecutable();
  if (!executable) {
    throw new Error("WeasyPrint binary not found. Install `weasyprint` and set WEASYPRINT_BIN if needed.");
  }
  const tmpDir = await Deno.makeTempDir({
    prefix: "invio-weasy-"
  });
  const htmlPath = join(tmpDir, "invoice.html");
  const pdfPath = join(tmpDir, "invoice.pdf");
  try {
    const preparedHtml = resolveCssVariablesForWeasy(html);
    await Deno.writeTextFile(htmlPath, preparedHtml);
    const attachmentPaths = [];
    for (const attachment of attachments){
      const safeName = attachment.fileName.replaceAll("/", "_");
      const path = join(tmpDir, safeName);
      await Deno.writeFile(path, attachment.bytes);
      attachmentPaths.push(path);
    }
    await runWeasyPrint(executable, htmlPath, pdfPath, attachmentPaths, true);
    return await Deno.readFile(pdfPath);
  } finally{
    try {
      await Deno.remove(tmpDir, {
        recursive: true
      });
    } catch  {
    // ignore cleanup errors
    }
  }
}
export async function embedXmlAttachment(pdfBytes, xmlBytes, fileName, mediaType, description, docLang, profile) {
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    updateMetadata: false
  });
  const context = pdfDoc.context;
  const now = new Date();
  const paramsDict = context.obj({
    Size: PDFNumber.of(xmlBytes.length),
    CreationDate: PDFString.fromDate(now),
    ModDate: PDFString.fromDate(now)
  });
  const subtypeName = mediaType.includes("/") ? mediaType.replace("/", "#2F") : mediaType;
  const embeddedFileStream = context.stream(xmlBytes, {
    Type: PDFName.of("EmbeddedFile"),
    Subtype: PDFName.of(subtypeName),
    Params: paramsDict
  });
  const embeddedFileRef = context.register(embeddedFileStream);
  const efDict = context.obj({
    F: embeddedFileRef,
    UF: embeddedFileRef
  });
  const fileSpecDict = context.obj({
    Type: PDFName.of("Filespec"),
    F: PDFString.of(fileName),
    UF: PDFString.of(fileName),
    EF: efDict,
    Desc: PDFString.of(description),
    AFRelationship: PDFName.of("Data")
  });
  const fileSpecRef = context.register(fileSpecDict);
  let namesDict = pdfDoc.catalog.get(PDFName.of("Names"));
  if (!(namesDict instanceof PDFDict)) {
    const created = context.obj({});
    pdfDoc.catalog.set(PDFName.of("Names"), created);
    namesDict = created;
  }
  const namesDictObj = namesDict;
  let embeddedFilesDict = namesDictObj.get(PDFName.of("EmbeddedFiles"));
  if (!(embeddedFilesDict instanceof PDFDict)) {
    const created = context.obj({});
    namesDictObj.set(PDFName.of("EmbeddedFiles"), created);
    embeddedFilesDict = created;
  }
  const embeddedFilesDictObj = embeddedFilesDict;
  let namesArray = embeddedFilesDictObj.get(PDFName.of("Names"));
  if (!(namesArray instanceof PDFArray)) {
    const created = context.obj([]);
    embeddedFilesDictObj.set(PDFName.of("Names"), created);
    namesArray = created;
  }
  const namesArrayObj = namesArray;
  namesArrayObj.push(PDFString.of(fileName));
  namesArrayObj.push(fileSpecRef);
  let afArray = pdfDoc.catalog.get(PDFName.of("AF"));
  if (!(afArray instanceof PDFArray)) {
    const created = context.obj([]);
    pdfDoc.catalog.set(PDFName.of("AF"), created);
    afArray = created;
  }
  const afArrayObj = afArray;
  afArrayObj.push(fileSpecRef);
  pdfDoc.setSubject(`Embedded XML: ${fileName}`);
  pdfDoc.setKeywords([
    "Invoice",
    "Embedded XML",
    fileName
  ]);
  pdfDoc.setModificationDate(now);
  if (docLang) {
    pdfDoc.catalog.set(PDFName.of("Lang"), PDFString.of(docLang));
  }
  if (profile && (profile.id === "facturx22" || profile.id === "zugferd")) {
    const xmp = generateZugferdXMP(fileName, "EN16931");
    const metadataStream = context.stream(xmp, {
      Type: PDFName.of("Metadata"),
      Subtype: PDFName.of("XML")
    });
    const metadataRef = context.register(metadataStream);
    pdfDoc.catalog.set(PDFName.of("Metadata"), metadataRef);
  }
  return pdfDoc.save({
    useObjectStreams: false
  });
}
// Alias for backward compatibility
export const generatePDF = generateInvoicePDF;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL3V0aWxzL3BkZi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBQREZBcnJheSxcbiAgUERGRGljdCxcbiAgUERGRG9jdW1lbnQsXG4gIFBERk5hbWUsXG4gIFBERk51bWJlcixcbiAgUERGU3RyaW5nLFxufSBmcm9tIFwicGRmLWxpYlwiO1xuaW1wb3J0IHsgZ2VuZXJhdGVJbnZvaWNlWE1MLCBYTUxQcm9maWxlIH0gZnJvbSBcIi4veG1sUHJvZmlsZXMudHNcIjtcbmltcG9ydCB7IGdlbmVyYXRlWnVnZmVyZFhNUCB9IGZyb20gXCIuL3htcC50c1wiO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJzdGQvcGF0aFwiO1xuaW1wb3J0IHtcbiAgQnVzaW5lc3NTZXR0aW5ncyxcbiAgSW52b2ljZVdpdGhEZXRhaWxzLFxuICBUZW1wbGF0ZUNvbnRleHQsXG59IGZyb20gXCIuLi90eXBlcy9pbmRleC50c1wiO1xuaW1wb3J0IHtcbiAgY29udGVudFR5cGVGcm9tTG9nb1BhdGgsXG4gIG5vcm1hbGl6ZVN0b3JlZExvZ29SZWZlcmVuY2UsXG4gIHJlc29sdmVMb2dvRnNQYXRoRnJvbVB1YmxpY1BhdGgsXG59IGZyb20gXCIuL2xvZ29TdG9yYWdlLnRzXCI7XG5pbXBvcnQge1xuICBnZXRUZW1wbGF0ZUJ5SWQsXG4gIHJlbmRlclRlbXBsYXRlIGFzIHJlbmRlclRwbCxcbn0gZnJvbSBcIi4uL2NvbnRyb2xsZXJzL3RlbXBsYXRlcy50c1wiO1xuaW1wb3J0IHsgZ2V0RGVmYXVsdFRlbXBsYXRlIH0gZnJvbSBcIi4uL2NvbnRyb2xsZXJzL3RlbXBsYXRlcy50c1wiO1xuaW1wb3J0IHsgZ2V0SW52b2ljZUxhYmVscyB9IGZyb20gXCIuLi9pMThuL3RyYW5zbGF0aW9ucy50c1wiO1xuLy8gcGRmLWxpYiBpcyB1c2VkIHRvIGVtYmVkIFhNTCBhdHRhY2htZW50cyBhbmQgdHdlYWsgbWV0YWRhdGEgYWZ0ZXIgcmVuZGVyaW5nXG5cbi8vIC0tLS0gQmFzaWMgY29sb3IgaGVscGVycyAtLS0tXG5mdW5jdGlvbiBub3JtYWxpemVIZXgoaGV4Pzogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCFoZXgpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNvbnN0IGggPSBoZXgudHJpbSgpO1xuICBpZiAoL14jP1swLTlhLWZBLUZdezZ9JC8udGVzdChoKSkgcmV0dXJuIGguc3RhcnRzV2l0aChcIiNcIikgPyBoIDogYCMke2h9YDtcbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZXNjYXBlSHRtbCh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB7XG4gIGNvbnN0IHN0ciA9IHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwgPyBcIlwiIDogU3RyaW5nKHZhbHVlKTtcbiAgcmV0dXJuIHN0clxuICAgIC5yZXBsYWNlKC8mL2csIFwiJmFtcDtcIilcbiAgICAucmVwbGFjZSgvPC9nLCBcIiZsdDtcIilcbiAgICAucmVwbGFjZSgvPi9nLCBcIiZndDtcIilcbiAgICAucmVwbGFjZSgvXCIvZywgXCImcXVvdDtcIilcbiAgICAucmVwbGFjZSgvJy9nLCBcIiYjMzk7XCIpO1xufVxuXG5mdW5jdGlvbiBfZXNjYXBlSHRtbFdpdGhCcmVha3ModmFsdWU6IHVua25vd24pOiBzdHJpbmcge1xuICByZXR1cm4gZXNjYXBlSHRtbCh2YWx1ZSkucmVwbGFjZSgvXFxyP1xcbi9nLCBcIjxiciAvPlwiKTtcbn1cblxuY29uc3QgQ0lUWV9GSVJTVF9QT1NUQUxfQ09VTlRSSUVTID0gbmV3IFNldChbXG4gIFwiVVNcIixcbiAgXCJHQlwiLFxuICBcIkJSXCIsXG4gIFwiQVVcIixcbiAgXCJDQVwiLFxuICBcIk5aXCIsXG4gIFwiSUVcIixcbiAgXCJNWFwiLFxuXSk7XG5cbnR5cGUgUG9zdGFsQ2l0eUZvcm1hdCA9IFwiYXV0b1wiIHwgXCJjaXR5LXBvc3RhbFwiIHwgXCJwb3N0YWwtY2l0eVwiO1xuXG5mdW5jdGlvbiBub3JtYWxpemVQb3N0YWxDaXR5Rm9ybWF0KHZhbHVlPzogc3RyaW5nKTogUG9zdGFsQ2l0eUZvcm1hdCB7XG4gIGlmICh2YWx1ZSA9PT0gXCJjaXR5LXBvc3RhbFwiIHx8IHZhbHVlID09PSBcInBvc3RhbC1jaXR5XCIpIHJldHVybiB2YWx1ZTtcbiAgcmV0dXJuIFwiYXV0b1wiO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRQb3N0YWxDaXR5TGluZShcbiAgcG9zdGFsQ29kZT86IHN0cmluZyxcbiAgY2l0eT86IHN0cmluZyxcbiAgY291bnRyeUNvZGU/OiBzdHJpbmcsXG4gIGZvcm1hdD86IHN0cmluZyxcbik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHBvc3RhbCA9IChwb3N0YWxDb2RlIHx8IFwiXCIpLnRyaW0oKTtcbiAgY29uc3QgcGxhY2UgPSAoY2l0eSB8fCBcIlwiKS50cmltKCk7XG4gIGlmICghcG9zdGFsICYmICFwbGFjZSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgaWYgKCFwb3N0YWwpIHJldHVybiBwbGFjZTtcbiAgaWYgKCFwbGFjZSkgcmV0dXJuIHBvc3RhbDtcblxuICBjb25zdCBub3JtYWxpemVkRm9ybWF0ID0gbm9ybWFsaXplUG9zdGFsQ2l0eUZvcm1hdChmb3JtYXQpO1xuICBpZiAobm9ybWFsaXplZEZvcm1hdCA9PT0gXCJjaXR5LXBvc3RhbFwiKSB7XG4gICAgLy8gQ2l0eSArIFBvc3RhbCBmb3JtYXRzIGZyZXF1ZW50bHkgZXhwZWN0IGEgY29tbWEgZm9yIHJlYWRhYmxlIGxvY2FsaXR5LiBFeGFtcGxlOiBCb3N0b24sIDAyMTEwXG4gICAgcmV0dXJuIGAke3BsYWNlfSwgJHtwb3N0YWx9YDtcbiAgfVxuICBpZiAobm9ybWFsaXplZEZvcm1hdCA9PT0gXCJwb3N0YWwtY2l0eVwiKSB7XG4gICAgcmV0dXJuIGAke3Bvc3RhbH0gJHtwbGFjZX1gO1xuICB9XG5cbiAgY29uc3QgY291bnRyeSA9IChjb3VudHJ5Q29kZSB8fCBcIlwiKS50cmltKCkudG9VcHBlckNhc2UoKTtcbiAgaWYgKENJVFlfRklSU1RfUE9TVEFMX0NPVU5UUklFUy5oYXMoY291bnRyeSkpIHtcbiAgICByZXR1cm4gYCR7cGxhY2V9ICR7cG9zdGFsfWA7XG4gIH1cbiAgcmV0dXJuIGAke3Bvc3RhbH0gJHtwbGFjZX1gO1xufVxuXG5jb25zdCBCTE9DS0VEX0hPU1RTID0gbmV3IFNldChbXCJsb2NhbGhvc3RcIiwgXCIxMjcuMC4wLjFcIiwgXCI6OjFcIl0pO1xuXG5mdW5jdGlvbiBpc1ByaXZhdGVJUHY0SG9zdChob3N0bmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHBhcnRzID0gaG9zdG5hbWUuc3BsaXQoXCIuXCIpLm1hcCgobikgPT4gTnVtYmVyKG4pKTtcbiAgaWYgKFxuICAgIHBhcnRzLmxlbmd0aCAhPT0gNCB8fFxuICAgIHBhcnRzLnNvbWUoKG4pID0+IE51bWJlci5pc05hTihuKSB8fCBuIDwgMCB8fCBuID4gMjU1KVxuICApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgW2EsIGJdID0gcGFydHM7XG4gIGlmIChhID09PSAxMCkgcmV0dXJuIHRydWU7XG4gIGlmIChhID09PSAxOTIgJiYgYiA9PT0gMTY4KSByZXR1cm4gdHJ1ZTtcbiAgaWYgKGEgPT09IDE3MiAmJiBiID49IDE2ICYmIGIgPD0gMzEpIHJldHVybiB0cnVlO1xuICBpZiAoYSA9PT0gMTY5ICYmIGIgPT09IDI1NCkgcmV0dXJuIHRydWU7XG4gIGlmIChhID09PSAxMjcpIHJldHVybiB0cnVlO1xuICBpZiAoYSA9PT0gMCkgcmV0dXJuIHRydWU7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNQcml2YXRlSVB2Nkhvc3QoaG9zdG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCBsb3dlciA9IGhvc3RuYW1lLnRvTG93ZXJDYXNlKCk7XG4gIGlmIChsb3dlciA9PT0gXCI6OjFcIikgcmV0dXJuIHRydWU7XG4gIGlmIChsb3dlci5zdGFydHNXaXRoKFwiZmRcIikgfHwgbG93ZXIuc3RhcnRzV2l0aChcImZjXCIpKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKGxvd2VyLnN0YXJ0c1dpdGgoXCJmZTgwXCIpKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiB0cnlQYXJzZVNhZmVSZW1vdGVVcmwocmF3OiBzdHJpbmcpOiBVUkwgfCBudWxsIHtcbiAgbGV0IHVybDogVVJMO1xuICB0cnkge1xuICAgIHVybCA9IG5ldyBVUkwocmF3KTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKHVybC5wcm90b2NvbCAhPT0gXCJodHRwczpcIikgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGhvc3QgPSB1cmwuaG9zdG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgaWYgKEJMT0NLRURfSE9TVFMuaGFzKGhvc3QpKSByZXR1cm4gbnVsbDtcbiAgaWYgKGlzUHJpdmF0ZUlQdjRIb3N0KGhvc3QpIHx8IGlzUHJpdmF0ZUlQdjZIb3N0KGhvc3QpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHVybDtcbn1cblxuZnVuY3Rpb24gbGlnaHRlbihoZXg6IHN0cmluZywgYW1vdW50ID0gMC44NSk6IHN0cmluZyB7XG4gIGNvbnN0IG4gPSBub3JtYWxpemVIZXgoaGV4KSA/PyBcIiMyNTYzZWJcIjtcbiAgY29uc3QgbSA9IG4ucmVwbGFjZShcIiNcIiwgXCJcIik7XG4gIGNvbnN0IHIgPSBwYXJzZUludChtLnNsaWNlKDAsIDIpLCAxNik7XG4gIGNvbnN0IGcgPSBwYXJzZUludChtLnNsaWNlKDIsIDQpLCAxNik7XG4gIGNvbnN0IGIgPSBwYXJzZUludChtLnNsaWNlKDQsIDYpLCAxNik7XG4gIGNvbnN0IG1peCA9IChjOiBudW1iZXIpID0+IE1hdGgucm91bmQoYyArICgyNTUgLSBjKSAqIGFtb3VudCk7XG4gIGNvbnN0IHJyID0gbWl4KHIpLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIik7XG4gIGNvbnN0IGdnID0gbWl4KGcpLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIik7XG4gIGNvbnN0IGJiID0gbWl4KGIpLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIik7XG4gIHJldHVybiBgIyR7cnJ9JHtnZ30ke2JifWA7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdERhdGUoZD86IERhdGUsIGZvcm1hdDogc3RyaW5nID0gXCJZWVlZLU1NLUREXCIpIHtcbiAgaWYgKCFkKSByZXR1cm4gdW5kZWZpbmVkO1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoZCk7XG4gIC8vIElzc3VlL2R1ZSBkYXRlcyBhcmUgc3RvcmVkIGFzIFVUQyBtaWRuaWdodDsgcmVhZCBVVEMgcGFydHMgc28gdGhlXG4gIC8vIHNlcnZlcidzIHRpbWV6b25lIGNhbid0IHNoaWZ0IHRoZW0gYnkgYSBkYXkuXG4gIGNvbnN0IHllYXIgPSBkYXRlLmdldFVUQ0Z1bGxZZWFyKCk7XG4gIGNvbnN0IG1vbnRoID0gU3RyaW5nKGRhdGUuZ2V0VVRDTW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsIFwiMFwiKTtcbiAgY29uc3QgZGF5ID0gU3RyaW5nKGRhdGUuZ2V0VVRDRGF0ZSgpKS5wYWRTdGFydCgyLCBcIjBcIik7XG5cbiAgaWYgKGZvcm1hdCA9PT0gXCJERC5NTS5ZWVlZXCIpIHtcbiAgICByZXR1cm4gYCR7ZGF5fS4ke21vbnRofS4ke3llYXJ9YDtcbiAgfVxuICAvLyBEZWZhdWx0IHRvIFlZWVktTU0tRERcbiAgcmV0dXJuIGAke3llYXJ9LSR7bW9udGh9LSR7ZGF5fWA7XG59XG5cbi8vIFN1cHBvcnQgYSBzaW5nbGUgc3RvcmVkICdsb2dvJyBzZXR0aW5nOyAnbG9nb1VybCcgaGVyZSBpcyBhIGRlcml2ZWQsIGlubGluZWQgZGF0YSBVUkwgZm9yIHJlbmRlcmluZyByb2J1c3RuZXNzXG50eXBlIFdpdGhMb2dvID0gQnVzaW5lc3NTZXR0aW5ncyAmIHtcbiAgbG9nbz86IHN0cmluZztcbiAgbG9nb1VybD86IHN0cmluZztcbiAgYnJhbmRMYXlvdXQ/OiBzdHJpbmc7XG59O1xuXG5mdW5jdGlvbiBub3JtYWxpemVMb2dvVXJsRm9yUmVuZGVyKFxuICBsb2dvPzogc3RyaW5nLFxuICBmb3JjZUFic29sdXRlID0gZmFsc2UsXG4pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAoIWxvZ28pIHJldHVybiB1bmRlZmluZWQ7XG4gIGNvbnN0IHZhbHVlID0gbm9ybWFsaXplU3RvcmVkTG9nb1JlZmVyZW5jZShsb2dvLnRyaW0oKSk7XG4gIGlmICghdmFsdWUpIHJldHVybiB1bmRlZmluZWQ7XG4gIGlmICh2YWx1ZS5zdGFydHNXaXRoKFwiZGF0YTpcIikpIHJldHVybiB2YWx1ZTtcbiAgaWYgKC9eaHR0cHM/OlxcL1xcLy9pLnRlc3QodmFsdWUpKSByZXR1cm4gdmFsdWU7XG4gIGlmICh2YWx1ZS5zdGFydHNXaXRoKFwiL1wiKSkge1xuICAgIGlmIChmb3JjZUFic29sdXRlKSB7XG4gICAgICBjb25zdCBmc1BhdGggPSByZXNvbHZlTG9nb0ZzUGF0aEZyb21QdWJsaWNQYXRoKHZhbHVlKTtcbiAgICAgIGlmIChmc1BhdGgpIHtcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IGZzUGF0aC5yZXBsYWNlQWxsKFwiXFxcXFwiLCBcIi9cIikucmVwbGFjZSgvXlxcLyovLCBcIi9cIik7XG4gICAgICAgIHJldHVybiBgZmlsZTovLyR7bm9ybWFsaXplZH1gO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWZvcmNlQWJzb2x1dGUpIHJldHVybiB2YWx1ZTtcbiAgICBjb25zdCBiYXNlID0gRGVuby5lbnYuZ2V0KFwiQkFTRV9VUkxcIikgfHwgXCJodHRwOi8vbG9jYWxob3N0OjMwMDBcIjtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIG5ldyBVUkwodmFsdWUsIGJhc2UpLnRvU3RyaW5nKCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TW9uZXkoXG4gIHZhbHVlOiBudW1iZXIsXG4gIGN1cnJlbmN5OiBzdHJpbmcsXG4gIG51bWJlckZvcm1hdDogXCJjb21tYVwiIHwgXCJwZXJpb2RcIiA9IFwiY29tbWFcIixcbik6IHN0cmluZyB7XG4gIC8vIENyZWF0ZSBhIGN1c3RvbSBsb2NhbGUgYmFzZWQgb24gdGhlIG51bWJlciBmb3JtYXQgcHJlZmVyZW5jZVxuICBsZXQgbG9jYWxlOiBzdHJpbmc7XG4gIGxldCBvcHRpb25zOiBJbnRsLk51bWJlckZvcm1hdE9wdGlvbnM7XG5cbiAgaWYgKG51bWJlckZvcm1hdCA9PT0gXCJwZXJpb2RcIikge1xuICAgIC8vIEV1cm9wZWFuIHN0eWxlOiAxLjAwMCwwMFxuICAgIGxvY2FsZSA9IFwiZGUtREVcIjsgLy8gR2VybWFuIGxvY2FsZSB1c2VzIHBlcmlvZCBhcyB0aG91c2FuZHMgc2VwYXJhdG9yIGFuZCBjb21tYSBhcyBkZWNpbWFsXG4gICAgb3B0aW9ucyA9IHsgc3R5bGU6IFwiY3VycmVuY3lcIiwgY3VycmVuY3kgfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBVUyBzdHlsZTogMSwwMDAuMDBcbiAgICBsb2NhbGUgPSBcImVuLVVTXCI7XG4gICAgb3B0aW9ucyA9IHsgc3R5bGU6IFwiY3VycmVuY3lcIiwgY3VycmVuY3kgfTtcbiAgfVxuXG4gIHJldHVybiBuZXcgSW50bC5OdW1iZXJGb3JtYXQobG9jYWxlLCBvcHRpb25zKS5mb3JtYXQodmFsdWUpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBfaW5saW5lTG9nb0lmUG9zc2libGUoXG4gIHNldHRpbmdzPzogQnVzaW5lc3NTZXR0aW5ncyxcbik6IFByb21pc2U8QnVzaW5lc3NTZXR0aW5ncyB8IHVuZGVmaW5lZD4ge1xuICBpZiAoIXNldHRpbmdzPy5sb2dvKSByZXR1cm4gc2V0dGluZ3M7XG4gIGNvbnN0IHVybCA9IHNldHRpbmdzLmxvZ28udHJpbSgpO1xuICBpZiAodXJsLnN0YXJ0c1dpdGgoXCJkYXRhOlwiKSkge1xuICAgIHJldHVybiB7IC4uLnNldHRpbmdzLCBsb2dvVXJsOiB1cmwgfSBhcyB1bmtub3duIGFzIEJ1c2luZXNzU2V0dGluZ3M7XG4gIH1cblxuICBjb25zdCB0b0RhdGFVcmwgPSAoYnl0ZXM6IFVpbnQ4QXJyYXksIG1pbWUgPSBcImltYWdlL3BuZ1wiKSA9PiB7XG4gICAgY29uc3QgYmFzZTY0ID0gYnRvYShTdHJpbmcuZnJvbUNoYXJDb2RlKC4uLmJ5dGVzKSk7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZX07YmFzZTY0LCR7YmFzZTY0fWA7XG4gIH07XG5cbiAgdHJ5IHtcbiAgICBpZiAodXJsLnN0YXJ0c1dpdGgoXCIvXCIpICYmIHJlc29sdmVMb2dvRnNQYXRoRnJvbVB1YmxpY1BhdGgodXJsKSkge1xuICAgICAgY29uc3QgZnNQYXRoID0gcmVzb2x2ZUxvZ29Gc1BhdGhGcm9tUHVibGljUGF0aCh1cmwpO1xuICAgICAgaWYgKGZzUGF0aCkge1xuICAgICAgICBjb25zdCBmaWxlID0gYXdhaXQgRGVuby5yZWFkRmlsZShmc1BhdGgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLnNldHRpbmdzLFxuICAgICAgICAgIGxvZ29Vcmw6IHRvRGF0YVVybChmaWxlLCBjb250ZW50VHlwZUZyb21Mb2dvUGF0aChmc1BhdGgpKSxcbiAgICAgICAgfSBhcyB1bmtub3duIGFzIEJ1c2luZXNzU2V0dGluZ3M7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmVtb3RlID0gdHJ5UGFyc2VTYWZlUmVtb3RlVXJsKHVybCk7XG4gICAgaWYgKHJlbW90ZSkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2gocmVtb3RlKTtcbiAgICAgIGlmICghcmVzLm9rKSByZXR1cm4gc2V0dGluZ3M7XG4gICAgICBjb25zdCBidWYgPSBuZXcgVWludDhBcnJheShhd2FpdCByZXMuYXJyYXlCdWZmZXIoKSk7XG4gICAgICBjb25zdCBtaW1lID0gcmVzLmhlYWRlcnMuZ2V0KFwiY29udGVudC10eXBlXCIpID8/IFwiaW1hZ2UvcG5nXCI7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5zZXR0aW5ncyxcbiAgICAgICAgbG9nb1VybDogdG9EYXRhVXJsKGJ1ZiwgbWltZSksXG4gICAgICB9IGFzIHVua25vd24gYXMgQnVzaW5lc3NTZXR0aW5ncztcbiAgICB9XG4gICAgLy8gQXR0ZW1wdCBsb2NhbCBmaWxlIHJlYWQgKHByZXZlbnQgdHJhdmVyc2FsKVxuICAgIGlmICh1cmwuaW5jbHVkZXMoXCIuLlwiKSkge1xuICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH1cbiAgICBjb25zdCBmaWxlID0gYXdhaXQgRGVuby5yZWFkRmlsZSh1cmwpO1xuICAgIGxldCBtaW1lID0gXCJpbWFnZS9wbmdcIjtcbiAgICBpZiAodXJsLmVuZHNXaXRoKFwiLmpwZ1wiKSB8fCB1cmwuZW5kc1dpdGgoXCIuanBlZ1wiKSkgbWltZSA9IFwiaW1hZ2UvanBlZ1wiO1xuICAgIGlmICh1cmwuZW5kc1dpdGgoXCIuc3ZnXCIpKSBtaW1lID0gXCJpbWFnZS9zdmcreG1sXCI7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnNldHRpbmdzLFxuICAgICAgbG9nb1VybDogdG9EYXRhVXJsKGZpbGUsIG1pbWUpLFxuICAgIH0gYXMgdW5rbm93biBhcyBCdXNpbmVzc1NldHRpbmdzO1xuICB9IGNhdGNoIChfZSkge1xuICAgIHJldHVybiBzZXR0aW5nczsgLy8ga2VlcCBvcmlnaW5hbFxuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkQ29udGV4dChcbiAgaW52b2ljZTogSW52b2ljZVdpdGhEZXRhaWxzLFxuICBzZXR0aW5ncz86IEJ1c2luZXNzU2V0dGluZ3MgJiB7IGxvZ29Vcmw/OiBzdHJpbmc7IGJyYW5kTGF5b3V0Pzogc3RyaW5nIH0sXG4gIF9oaWdobGlnaHQ/OiBzdHJpbmcsXG4gIGRhdGVGb3JtYXQ/OiBzdHJpbmcsXG4gIG51bWJlckZvcm1hdD86IFwiY29tbWFcIiB8IFwicGVyaW9kXCIsXG4gIGxvY2FsZU92ZXJyaWRlPzogc3RyaW5nLFxuICBmb3JjZUFic29sdXRlTG9nb1VybCA9IGZhbHNlLFxuKTogVGVtcGxhdGVDb250ZXh0ICYgeyBsb2dvVXJsPzogc3RyaW5nOyBicmFuZExvZ29MZWZ0PzogYm9vbGVhbiB9IHtcbiAgY29uc3QgcmVxdWVzdGVkTG9jYWxlID0gbG9jYWxlT3ZlcnJpZGUgPz8gaW52b2ljZS5sb2NhbGUgPz8gc2V0dGluZ3M/LmxvY2FsZTtcbiAgY29uc3QgeyBsb2NhbGU6IHJlc29sdmVkTG9jYWxlLCBsYWJlbHMgfSA9IGdldEludm9pY2VMYWJlbHMocmVxdWVzdGVkTG9jYWxlKTtcbiAgY29uc3QgY3VycmVuY3kgPSBpbnZvaWNlLmN1cnJlbmN5IHx8IHNldHRpbmdzPy5jdXJyZW5jeSB8fCBcIlVTRFwiO1xuICBjb25zdCBjb21wYW55UG9zdGFsQ2l0eSA9IGZvcm1hdFBvc3RhbENpdHlMaW5lKFxuICAgIHNldHRpbmdzPy5jb21wYW55UG9zdGFsQ29kZSxcbiAgICBzZXR0aW5ncz8uY29tcGFueUNpdHksXG4gICAgc2V0dGluZ3M/LmNvbXBhbnlDb3VudHJ5Q29kZSxcbiAgICBzZXR0aW5ncz8ucG9zdGFsQ2l0eUZvcm1hdCxcbiAgKTtcbiAgY29uc3QgdGF4TGFiZWwgPSBzZXR0aW5ncz8udGF4TGFiZWwgJiYgU3RyaW5nKHNldHRpbmdzLnRheExhYmVsKS50cmltKClcbiAgICA/IFN0cmluZyhzZXR0aW5ncy50YXhMYWJlbCkudHJpbSgpXG4gICAgOiBsYWJlbHMudGF4TGFiZWw7XG4gIC8vIEJ1aWxkIHRheCBzdW1tYXJ5IGZyb20gbm9ybWFsaXplZCB0YXhlcyBpZiBwcmVzZW50XG4gIGxldCB0YXhTdW1tYXJ5ID0gaW52b2ljZS50YXhlcyAmJiBpbnZvaWNlLnRheGVzLmxlbmd0aCA+IDBcbiAgICA/IGludm9pY2UudGF4ZXMubWFwKCh0KSA9PiAoe1xuICAgICAgbGFiZWw6IGAke3RheExhYmVsfSAke3QucGVyY2VudH0lYCxcbiAgICAgIHBlcmNlbnQ6IHQucGVyY2VudCxcbiAgICAgIHRheGFibGU6IGZvcm1hdE1vbmV5KFxuICAgICAgICB0LnRheGFibGVBbW91bnQsXG4gICAgICAgIGN1cnJlbmN5LFxuICAgICAgICBudW1iZXJGb3JtYXQgfHwgXCJjb21tYVwiLFxuICAgICAgKSxcbiAgICAgIGFtb3VudDogZm9ybWF0TW9uZXkodC50YXhBbW91bnQsIGN1cnJlbmN5LCBudW1iZXJGb3JtYXQgfHwgXCJjb21tYVwiKSxcbiAgICB9KSlcbiAgICA6IHVuZGVmaW5lZDtcbiAgLy8gRmFsbGJhY2s6IHN5bnRoZXNpemUgYSBzaW5nbGUtcm93IHN1bW1hcnkgZnJvbSBpbnZvaWNlLWxldmVsIHRheFJhdGVcbiAgaWYgKCghdGF4U3VtbWFyeSB8fCB0YXhTdW1tYXJ5Lmxlbmd0aCA9PT0gMCkgJiYgaW52b2ljZS50YXhBbW91bnQgPiAwKSB7XG4gICAgY29uc3QgcGVyY2VudCA9IGludm9pY2UudGF4UmF0ZSB8fCAwO1xuICAgIGNvbnN0IHRheGFibGVCYXNlID0gTWF0aC5tYXgoXG4gICAgICAwLFxuICAgICAgKGludm9pY2Uuc3VidG90YWwgfHwgMCkgLSAoaW52b2ljZS5kaXNjb3VudEFtb3VudCB8fCAwKSxcbiAgICApO1xuICAgIHRheFN1bW1hcnkgPSBbXG4gICAgICB7XG4gICAgICAgIGxhYmVsOiBgJHt0YXhMYWJlbH0gJHtwZXJjZW50fSVgLFxuICAgICAgICBwZXJjZW50LFxuICAgICAgICB0YXhhYmxlOiBmb3JtYXRNb25leSh0YXhhYmxlQmFzZSwgY3VycmVuY3ksIG51bWJlckZvcm1hdCB8fCBcImNvbW1hXCIpLFxuICAgICAgICBhbW91bnQ6IGZvcm1hdE1vbmV5KFxuICAgICAgICAgIGludm9pY2UudGF4QW1vdW50LFxuICAgICAgICAgIGN1cnJlbmN5LFxuICAgICAgICAgIG51bWJlckZvcm1hdCB8fCBcImNvbW1hXCIsXG4gICAgICAgICksXG4gICAgICB9LFxuICAgIF07XG4gIH1cbiAgY29uc3QgaGFzSXRlbVVuaXRzID0gaW52b2ljZS5pdGVtcy5zb21lKFxuICAgIChpKSA9PiB0eXBlb2YgaS51bml0ID09PSBcInN0cmluZ1wiICYmIGkudW5pdC50cmltKCkubGVuZ3RoID4gMCxcbiAgKTtcbiAgcmV0dXJuIHtcbiAgICAvLyBDb21wYW55XG4gICAgY29tcGFueU5hbWU6IHNldHRpbmdzPy5jb21wYW55TmFtZSB8fCBcIllvdXIgQ29tcGFueVwiLFxuICAgIGNvbXBhbnlBZGRyZXNzOiBfZXNjYXBlSHRtbFdpdGhCcmVha3Moc2V0dGluZ3M/LmNvbXBhbnlBZGRyZXNzIHx8IFwiXCIpLFxuICAgIGNvbXBhbnlDaXR5OiAoc2V0dGluZ3M/LmNvbXBhbnlDaXR5IHx8IFwiXCIpLnRyaW0oKSB8fCB1bmRlZmluZWQsXG4gICAgY29tcGFueVBvc3RhbENvZGU6IChzZXR0aW5ncz8uY29tcGFueVBvc3RhbENvZGUgfHwgXCJcIikudHJpbSgpIHx8IHVuZGVmaW5lZCxcbiAgICBjb21wYW55UG9zdGFsQ2l0eSxcbiAgICBjb21wYW55RW1haWw6IHNldHRpbmdzPy5jb21wYW55RW1haWwgfHwgXCJcIixcbiAgICBjb21wYW55UGhvbmU6IHNldHRpbmdzPy5jb21wYW55UGhvbmUgfHwgXCJcIixcbiAgICBjb21wYW55VGF4SWQ6IHNldHRpbmdzPy5jb21wYW55VGF4SWQgfHwgXCJcIixcblxuICAgIC8vIEludm9pY2VcbiAgICBpbnZvaWNlTnVtYmVyOiBpbnZvaWNlLmludm9pY2VOdW1iZXIsXG4gICAgaXNzdWVEYXRlOiBmb3JtYXREYXRlKGludm9pY2UuaXNzdWVEYXRlLCBkYXRlRm9ybWF0KSEsXG4gICAgZHVlRGF0ZTogZm9ybWF0RGF0ZShpbnZvaWNlLmR1ZURhdGUsIGRhdGVGb3JtYXQpLFxuICAgIGN1cnJlbmN5LFxuICAgIHN0YXR1czogaW52b2ljZS5zdGF0dXMsXG5cbiAgICAvLyBDdXN0b21lclxuICAgIGN1c3RvbWVyTmFtZTogaW52b2ljZS5jdXN0b21lci5uYW1lLFxuICAgIGN1c3RvbWVyQ29udGFjdE5hbWU6IGludm9pY2UuY3VzdG9tZXIuY29udGFjdE5hbWUsXG4gICAgY3VzdG9tZXJFbWFpbDogaW52b2ljZS5jdXN0b21lci5lbWFpbCxcbiAgICBjdXN0b21lclBob25lOiBpbnZvaWNlLmN1c3RvbWVyLnBob25lLFxuICAgIGN1c3RvbWVyQWRkcmVzczogX2VzY2FwZUh0bWxXaXRoQnJlYWtzKGludm9pY2UuY3VzdG9tZXIuYWRkcmVzcyksXG4gICAgY3VzdG9tZXJDaXR5OiBpbnZvaWNlLmN1c3RvbWVyLmNpdHksXG4gICAgY3VzdG9tZXJQb3N0YWxDb2RlOiBpbnZvaWNlLmN1c3RvbWVyLnBvc3RhbENvZGUsXG4gICAgY3VzdG9tZXJSZWdpb246IGludm9pY2UuY3VzdG9tZXIucmVnaW9uLFxuICAgIGN1c3RvbWVyQ291bnRyeUNvZGU6IGludm9pY2UuY3VzdG9tZXIuY291bnRyeUNvZGUsXG4gICAgY3VzdG9tZXJQb3N0YWxDaXR5OiBmb3JtYXRQb3N0YWxDaXR5TGluZShcbiAgICAgIGludm9pY2UuY3VzdG9tZXIucG9zdGFsQ29kZSxcbiAgICAgIGludm9pY2UuY3VzdG9tZXIuY2l0eSxcbiAgICAgIGludm9pY2UuY3VzdG9tZXIuY291bnRyeUNvZGUsXG4gICAgICBzZXR0aW5ncz8ucG9zdGFsQ2l0eUZvcm1hdCxcbiAgICApLFxuICAgIGN1c3RvbWVyVGF4SWQ6IGludm9pY2UuY3VzdG9tZXIudGF4SWQsXG5cbiAgICAvLyBJdGVtc1xuICAgIGl0ZW1zOiBpbnZvaWNlLml0ZW1zLm1hcCgoaSkgPT4gKHtcbiAgICAgIGRlc2NyaXB0aW9uOiBpLmRlc2NyaXB0aW9uLFxuICAgICAgcXVhbnRpdHk6IGkucXVhbnRpdHksXG4gICAgICB1bml0OiB0eXBlb2YgaS51bml0ID09PSBcInN0cmluZ1wiICYmIGkudW5pdC50cmltKCkubGVuZ3RoID4gMFxuICAgICAgICA/IGkudW5pdC50cmltKClcbiAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICB1bml0UHJpY2U6IGZvcm1hdE1vbmV5KGkudW5pdFByaWNlLCBjdXJyZW5jeSwgbnVtYmVyRm9ybWF0IHx8IFwiY29tbWFcIiksXG4gICAgICBsaW5lVG90YWw6IGZvcm1hdE1vbmV5KGkubGluZVRvdGFsLCBjdXJyZW5jeSwgbnVtYmVyRm9ybWF0IHx8IFwiY29tbWFcIiksXG4gICAgICBub3RlczogaS5ub3RlcyxcbiAgICB9KSksXG4gICAgaGFzSXRlbVVuaXRzLFxuXG4gICAgLy8gVG90YWxzXG4gICAgc3VidG90YWw6IGZvcm1hdE1vbmV5KGludm9pY2Uuc3VidG90YWwsIGN1cnJlbmN5LCBudW1iZXJGb3JtYXQgfHwgXCJjb21tYVwiKSxcbiAgICBkaXNjb3VudEFtb3VudDogaW52b2ljZS5kaXNjb3VudEFtb3VudCA+IDBcbiAgICAgID8gZm9ybWF0TW9uZXkoaW52b2ljZS5kaXNjb3VudEFtb3VudCwgY3VycmVuY3ksIG51bWJlckZvcm1hdCB8fCBcImNvbW1hXCIpXG4gICAgICA6IHVuZGVmaW5lZCxcbiAgICBkaXNjb3VudFBlcmNlbnRhZ2U6IGludm9pY2UuZGlzY291bnRQZXJjZW50YWdlIHx8IHVuZGVmaW5lZCxcbiAgICB0YXhSYXRlOiBpbnZvaWNlLnRheFJhdGUgfHwgdW5kZWZpbmVkLFxuICAgIHRheEFtb3VudDogaW52b2ljZS50YXhBbW91bnQgPiAwXG4gICAgICA/IGZvcm1hdE1vbmV5KGludm9pY2UudGF4QW1vdW50LCBjdXJyZW5jeSwgbnVtYmVyRm9ybWF0IHx8IFwiY29tbWFcIilcbiAgICAgIDogdW5kZWZpbmVkLFxuICAgIHRvdGFsOiBmb3JtYXRNb25leShpbnZvaWNlLnRvdGFsLCBjdXJyZW5jeSwgbnVtYmVyRm9ybWF0IHx8IFwiY29tbWFcIiksXG4gICAgdGF4U3VtbWFyeSxcbiAgICBoYXNUYXhTdW1tYXJ5OiBCb29sZWFuKHRheFN1bW1hcnkgJiYgdGF4U3VtbWFyeS5sZW5ndGggPiAwKSxcbiAgICAvLyBOZXQgc3VidG90YWwgKHRheGFibGUgYmFzZSBhZnRlciBkaXNjb3VudCwgYmVmb3JlIHRheCkgZm9yIGNvbnZlbmllbmNlXG4gICAgbmV0U3VidG90YWw6IGZvcm1hdE1vbmV5KFxuICAgICAgTWF0aC5tYXgoMCwgKGludm9pY2Uuc3VidG90YWwgfHwgMCkgLSAoaW52b2ljZS5kaXNjb3VudEFtb3VudCB8fCAwKSksXG4gICAgICBjdXJyZW5jeSxcbiAgICAgIG51bWJlckZvcm1hdCB8fCBcImNvbW1hXCIsXG4gICAgKSxcblxuICAgIC8vIEZsYWdzXG4gICAgaGFzRGlzY291bnQ6IGludm9pY2UuZGlzY291bnRBbW91bnQgPiAwLFxuICAgIGhhc1RheDogaW52b2ljZS50YXhBbW91bnQgPiAwLFxuXG4gICAgLy8gUGF5bWVudFxuICAgIHBheW1lbnRUZXJtczogaW52b2ljZS5wYXltZW50VGVybXMgfHwgc2V0dGluZ3M/LnBheW1lbnRUZXJtcyB8fCB1bmRlZmluZWQsXG4gICAgcGF5bWVudE1ldGhvZHM6IHNldHRpbmdzPy5wYXltZW50TWV0aG9kcyB8fCB1bmRlZmluZWQsXG4gICAgYmFua0FjY291bnQ6IHNldHRpbmdzPy5iYW5rQWNjb3VudCB8fCB1bmRlZmluZWQsXG5cbiAgICAvLyBOb3Rlc1xuICAgIG5vdGVzOiBpbnZvaWNlLm5vdGVzIHx8IHNldHRpbmdzPy5kZWZhdWx0Tm90ZXMgfHwgdW5kZWZpbmVkLFxuXG4gICAgLy8gSW50ZXJuYXRpb25hbGl6YXRpb25cbiAgICBsb2NhbGU6IHJlc29sdmVkTG9jYWxlLFxuICAgIGxhYmVscyxcblxuICAgIC8vIE5vbi1tdXN0YWNoZSBleHRyYXMgY29uc3VtZWQgYnkgdGVtcGxhdGVzXG4gICAgLy8gUHJlZmVyIGlubGluZWQgZGF0YSBVUkwgaWYgYXZhaWxhYmxlOyBvdGhlcndpc2UgcGFzcyB0aHJvdWdoIHRoZSBwcm92aWRlZCBsb2dvIHZhbHVlXG4gICAgbG9nb1VybDogbm9ybWFsaXplTG9nb1VybEZvclJlbmRlcihcbiAgICAgIChzZXR0aW5ncyBhcyBXaXRoTG9nbyB8IHVuZGVmaW5lZCk/LmxvZ29VcmwgfHxcbiAgICAgICAgKHNldHRpbmdzIGFzIFdpdGhMb2dvIHwgdW5kZWZpbmVkKT8ubG9nbyxcbiAgICAgIGZvcmNlQWJzb2x1dGVMb2dvVXJsLFxuICAgICksXG4gICAgLy8gUGVybWFuZW50bHkgdXNlIGxvZ28tbGVmdCBsYXlvdXRcbiAgICBicmFuZExvZ29MZWZ0OiB0cnVlLFxuICB9IGFzIFRlbXBsYXRlQ29udGV4dCAmIHsgbG9nb1VybD86IHN0cmluZzsgYnJhbmRMb2dvTGVmdD86IGJvb2xlYW4gfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlSW52b2ljZVBERihcbiAgaW52b2ljZURhdGE6IEludm9pY2VXaXRoRGV0YWlscyxcbiAgYnVzaW5lc3NTZXR0aW5ncz86IEJ1c2luZXNzU2V0dGluZ3MsXG4gIHRlbXBsYXRlSWQ/OiBzdHJpbmcsXG4gIGN1c3RvbUhpZ2hsaWdodENvbG9yPzogc3RyaW5nLFxuICBvcHRzPzoge1xuICAgIGVtYmVkWG1sUHJvZmlsZUlkPzogc3RyaW5nO1xuICAgIGVtYmVkWG1sPzogYm9vbGVhbjtcbiAgICB4bWxPcHRpb25zPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgZGF0ZUZvcm1hdD86IHN0cmluZztcbiAgICBudW1iZXJGb3JtYXQ/OiBcImNvbW1hXCIgfCBcInBlcmlvZFwiO1xuICAgIGxvY2FsZT86IHN0cmluZztcbiAgfSxcbik6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAvLyBLZWVwIGxvZ29zIGFzIG5vcm1hbCBVUkxzL2ZpbGVzIGZvciBXZWFzeVByaW50LlxuICAvLyBEYXRhIFVSTHMgc2lnbmlmaWNhbnRseSBzbG93IGRvd24gcmVuZGVyaW5nIGZvciBsYXJnZXIgaW1hZ2VzLlxuICBjb25zdCByZW5kZXJTZXR0aW5ncyA9IGJ1c2luZXNzU2V0dGluZ3M7XG4gIGNvbnN0IGh0bWwgPSBidWlsZEludm9pY2VIVE1MKFxuICAgIGludm9pY2VEYXRhLFxuICAgIHJlbmRlclNldHRpbmdzLFxuICAgIHRlbXBsYXRlSWQsXG4gICAgY3VzdG9tSGlnaGxpZ2h0Q29sb3IsXG4gICAgb3B0cz8uZGF0ZUZvcm1hdCxcbiAgICBvcHRzPy5udW1iZXJGb3JtYXQsXG4gICAgb3B0cz8ubG9jYWxlID8/IGludm9pY2VEYXRhLmxvY2FsZSA/PyByZW5kZXJTZXR0aW5ncz8ubG9jYWxlLFxuICAgIHRydWUsXG4gICk7XG4gIGNvbnN0IGF0dGFjaG1lbnRzOiBBcnJheTx7IGZpbGVOYW1lOiBzdHJpbmc7IGJ5dGVzOiBVaW50OEFycmF5IH0+ID0gW107XG4gIGlmIChvcHRzPy5lbWJlZFhtbCkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwcm9maWxlSWQgPSBvcHRzLmVtYmVkWG1sUHJvZmlsZUlkIHx8IFwidWJsMjFcIjtcbiAgICAgIGNvbnN0IHsgeG1sLCBwcm9maWxlIH0gPSBnZW5lcmF0ZUludm9pY2VYTUwoXG4gICAgICAgIHByb2ZpbGVJZCxcbiAgICAgICAgaW52b2ljZURhdGEsXG4gICAgICAgIHJlbmRlclNldHRpbmdzIHx8ICh7fSBhcyBCdXNpbmVzc1NldHRpbmdzKSxcbiAgICAgICk7XG4gICAgICBhdHRhY2htZW50cy5wdXNoKHtcbiAgICAgICAgZmlsZU5hbWU6IGBpbnZvaWNlLSR7XG4gICAgICAgICAgaW52b2ljZURhdGEuaW52b2ljZU51bWJlciB8fCBpbnZvaWNlRGF0YS5pZFxuICAgICAgICB9LiR7cHJvZmlsZS5maWxlRXh0ZW5zaW9ufWAsXG4gICAgICAgIGJ5dGVzOiBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoeG1sKSxcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gcHJlcGFyZSBYTUwgYXR0YWNobWVudDpcIiwgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIHRyeSB7XG4gICAgcmV0dXJuIGF3YWl0IHJlbmRlclBkZldpdGhXZWFzeVByaW50KGh0bWwsIGF0dGFjaG1lbnRzKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc3QgbXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFN0cmluZyhlcnIpO1xuICAgIHRocm93IG5ldyBFcnJvcihgV2Vhc3lQcmludCBQREYgcmVuZGVyaW5nIGZhaWxlZDogJHttc2d9YCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkSW52b2ljZUhUTUwoXG4gIGludm9pY2U6IEludm9pY2VXaXRoRGV0YWlscyxcbiAgc2V0dGluZ3M/OiBCdXNpbmVzc1NldHRpbmdzLFxuICB0ZW1wbGF0ZUlkPzogc3RyaW5nLFxuICBoaWdobGlnaHQ/OiBzdHJpbmcsXG4gIGRhdGVGb3JtYXQ/OiBzdHJpbmcsXG4gIG51bWJlckZvcm1hdD86IFwiY29tbWFcIiB8IFwicGVyaW9kXCIsXG4gIGxvY2FsZU92ZXJyaWRlPzogc3RyaW5nLFxuICBmb3JjZUFic29sdXRlTG9nb1VybCA9IGZhbHNlLFxuKTogc3RyaW5nIHtcbiAgY29uc3QgY3R4ID0gYnVpbGRDb250ZXh0KFxuICAgIGludm9pY2UsXG4gICAgc2V0dGluZ3MsXG4gICAgaGlnaGxpZ2h0LFxuICAgIGRhdGVGb3JtYXQsXG4gICAgbnVtYmVyRm9ybWF0LFxuICAgIGxvY2FsZU92ZXJyaWRlLFxuICAgIGZvcmNlQWJzb2x1dGVMb2dvVXJsLFxuICApO1xuICBjb25zdCBobCA9IG5vcm1hbGl6ZUhleChoaWdobGlnaHQpIHx8IFwiIzI1NjNlYlwiO1xuICBjb25zdCBobExpZ2h0ID0gbGlnaHRlbihobCwgMC44Nik7XG5cbiAgbGV0IHRlbXBsYXRlO1xuICBpZiAodGVtcGxhdGVJZCkge1xuICAgIHRyeSB7XG4gICAgICB0ZW1wbGF0ZSA9IGdldFRlbXBsYXRlQnlJZCh0ZW1wbGF0ZUlkKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycik7XG4gICAgICBjb25zb2xlLndhcm4oYEZhaWxlZCB0byBsb2FkIHRlbXBsYXRlICR7dGVtcGxhdGVJZH06ICR7bWVzc2FnZX1gKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBmYWxsYmFja1RlbXBsYXRlID0gdGVtcGxhdGUgPz8gZ2V0RGVmYXVsdFRlbXBsYXRlKCk7XG4gIGlmICghZmFsbGJhY2tUZW1wbGF0ZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiTm8gaW52b2ljZSB0ZW1wbGF0ZXMgYXZhaWxhYmxlLiBFbnN1cmUgZGF0YWJhc2UgbWlncmF0aW9ucyBoYXZlIHNlZWRlZCB0ZW1wbGF0ZXMuXCIsXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiByZW5kZXJUcGwoZmFsbGJhY2tUZW1wbGF0ZS5odG1sLCB7XG4gICAgLi4uY3R4LFxuICAgIGhpZ2hsaWdodENvbG9yOiBobCxcbiAgICBoaWdobGlnaHRDb2xvckxpZ2h0OiBobExpZ2h0LFxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZVdlYXN5UHJpbnRFeGVjdXRhYmxlKCk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICBjb25zdCBjYW5kaWRhdGVzOiBzdHJpbmdbXSA9IFtdO1xuICB0cnkge1xuICAgIGNvbnN0IGNvbmZpZ3VyZWQgPSBEZW5vLmVudi5nZXQoXCJXRUFTWVBSSU5UX0JJTlwiKTtcbiAgICBpZiAoY29uZmlndXJlZCAmJiBjb25maWd1cmVkLnRyaW0oKS5sZW5ndGggPiAwKSB7XG4gICAgICBjYW5kaWRhdGVzLnB1c2goY29uZmlndXJlZC50cmltKCkpO1xuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gaWdub3JlIGVudiBhY2Nlc3MgZXJyb3JzXG4gIH1cbiAgY2FuZGlkYXRlcy5wdXNoKFwid2Vhc3lwcmludFwiKTtcblxuICBmb3IgKGNvbnN0IGNhbmRpZGF0ZSBvZiBjYW5kaWRhdGVzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHByb2JlID0gbmV3IERlbm8uQ29tbWFuZChjYW5kaWRhdGUsIHtcbiAgICAgICAgYXJnczogW1wiLS12ZXJzaW9uXCJdLFxuICAgICAgICBzdGRvdXQ6IFwicGlwZWRcIixcbiAgICAgICAgc3RkZXJyOiBcInBpcGVkXCIsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHsgc3VjY2VzcyB9ID0gYXdhaXQgcHJvYmUub3V0cHV0KCk7XG4gICAgICBpZiAoc3VjY2VzcykgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIGNvbnRpbnVlIHByb2JpbmdcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJ1bldlYXN5UHJpbnQoXG4gIGV4ZWN1dGFibGU6IHN0cmluZyxcbiAgaW5wdXRIdG1sUGF0aDogc3RyaW5nLFxuICBvdXRwdXRQZGZQYXRoOiBzdHJpbmcsXG4gIGF0dGFjaG1lbnRQYXRoczogc3RyaW5nW10sXG4gIGluY2x1ZGVQZGZWYXJpYW50OiBib29sZWFuLFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGFyZ3M6IHN0cmluZ1tdID0gW1xuICAgIGlucHV0SHRtbFBhdGgsXG4gICAgb3V0cHV0UGRmUGF0aCxcbiAgICBcIi0tbWVkaWEtdHlwZVwiLFxuICAgIFwic2NyZWVuXCIsXG4gIF07XG4gIGlmIChpbmNsdWRlUGRmVmFyaWFudCkge1xuICAgIGFyZ3MucHVzaChcIi0tcGRmLXZhcmlhbnRcIiwgXCJwZGYvYS0zYlwiKTtcbiAgfVxuICBmb3IgKGNvbnN0IHAgb2YgYXR0YWNobWVudFBhdGhzKSB7XG4gICAgYXJncy5wdXNoKFwiLS1hdHRhY2htZW50XCIsIHApO1xuICB9XG5cbiAgY29uc3QgY21kID0gbmV3IERlbm8uQ29tbWFuZChleGVjdXRhYmxlLCB7XG4gICAgYXJncyxcbiAgICBzdGRvdXQ6IFwicGlwZWRcIixcbiAgICBzdGRlcnI6IFwicGlwZWRcIixcbiAgfSk7XG4gIGNvbnN0IHsgY29kZSwgc3RkZXJyIH0gPSBhd2FpdCBjbWQub3V0cHV0KCk7XG4gIGlmIChjb2RlICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKHN0ZGVycikgfHwgYHdlYXN5cHJpbnQgZXhpdGVkIHdpdGggY29kZSAke2NvZGV9YCxcbiAgICApO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVDc3NWYXJpYWJsZXNGb3JXZWFzeShodG1sOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB2YXJpYWJsZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IHJvb3RWYXJSZWdleCA9IC8tLShbYS16QS1aMC05Xy1dKylcXHMqOlxccyooW147XSspOy9nO1xuICBsZXQgbTogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcbiAgd2hpbGUgKChtID0gcm9vdFZhclJlZ2V4LmV4ZWMoaHRtbCkpICE9PSBudWxsKSB7XG4gICAgdmFyaWFibGVNYXAuc2V0KG1bMV0sIG1bMl0udHJpbSgpKTtcbiAgfVxuXG4gIHJldHVybiBodG1sLnJlcGxhY2UoXG4gICAgL3ZhclxcKFxccyotLShbYS16QS1aMC05Xy1dKylcXHMqKD86LFteKV0rKT9cXCkvZyxcbiAgICAoZnVsbCwgbmFtZSkgPT4ge1xuICAgICAgcmV0dXJuIHZhcmlhYmxlTWFwLmdldChuYW1lKSB8fCBmdWxsO1xuICAgIH0sXG4gICk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlbmRlclBkZldpdGhXZWFzeVByaW50KFxuICBodG1sOiBzdHJpbmcsXG4gIGF0dGFjaG1lbnRzOiBBcnJheTx7IGZpbGVOYW1lOiBzdHJpbmc7IGJ5dGVzOiBVaW50OEFycmF5IH0+LFxuKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIGNvbnN0IGV4ZWN1dGFibGUgPSBhd2FpdCByZXNvbHZlV2Vhc3lQcmludEV4ZWN1dGFibGUoKTtcbiAgaWYgKCFleGVjdXRhYmxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJXZWFzeVByaW50IGJpbmFyeSBub3QgZm91bmQuIEluc3RhbGwgYHdlYXN5cHJpbnRgIGFuZCBzZXQgV0VBU1lQUklOVF9CSU4gaWYgbmVlZGVkLlwiLFxuICAgICk7XG4gIH1cblxuICBjb25zdCB0bXBEaXIgPSBhd2FpdCBEZW5vLm1ha2VUZW1wRGlyKHsgcHJlZml4OiBcImludmlvLXdlYXN5LVwiIH0pO1xuICBjb25zdCBodG1sUGF0aCA9IGpvaW4odG1wRGlyLCBcImludm9pY2UuaHRtbFwiKTtcbiAgY29uc3QgcGRmUGF0aCA9IGpvaW4odG1wRGlyLCBcImludm9pY2UucGRmXCIpO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcHJlcGFyZWRIdG1sID0gcmVzb2x2ZUNzc1ZhcmlhYmxlc0ZvcldlYXN5KGh0bWwpO1xuICAgIGF3YWl0IERlbm8ud3JpdGVUZXh0RmlsZShodG1sUGF0aCwgcHJlcGFyZWRIdG1sKTtcblxuICAgIGNvbnN0IGF0dGFjaG1lbnRQYXRoczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGF0dGFjaG1lbnQgb2YgYXR0YWNobWVudHMpIHtcbiAgICAgIGNvbnN0IHNhZmVOYW1lID0gYXR0YWNobWVudC5maWxlTmFtZS5yZXBsYWNlQWxsKFwiL1wiLCBcIl9cIik7XG4gICAgICBjb25zdCBwYXRoID0gam9pbih0bXBEaXIsIHNhZmVOYW1lKTtcbiAgICAgIGF3YWl0IERlbm8ud3JpdGVGaWxlKHBhdGgsIGF0dGFjaG1lbnQuYnl0ZXMpO1xuICAgICAgYXR0YWNobWVudFBhdGhzLnB1c2gocGF0aCk7XG4gICAgfVxuXG4gICAgYXdhaXQgcnVuV2Vhc3lQcmludChleGVjdXRhYmxlLCBodG1sUGF0aCwgcGRmUGF0aCwgYXR0YWNobWVudFBhdGhzLCB0cnVlKTtcblxuICAgIHJldHVybiBhd2FpdCBEZW5vLnJlYWRGaWxlKHBkZlBhdGgpO1xuICB9IGZpbmFsbHkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBEZW5vLnJlbW92ZSh0bXBEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gaWdub3JlIGNsZWFudXAgZXJyb3JzXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbWJlZFhtbEF0dGFjaG1lbnQoXG4gIHBkZkJ5dGVzOiBVaW50OEFycmF5LFxuICB4bWxCeXRlczogVWludDhBcnJheSxcbiAgZmlsZU5hbWU6IHN0cmluZyxcbiAgbWVkaWFUeXBlOiBzdHJpbmcsXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmcsXG4gIGRvY0xhbmc/OiBzdHJpbmcsXG4gIHByb2ZpbGU/OiBYTUxQcm9maWxlLFxuKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIGNvbnN0IHBkZkRvYyA9IGF3YWl0IFBERkRvY3VtZW50LmxvYWQocGRmQnl0ZXMsIHsgdXBkYXRlTWV0YWRhdGE6IGZhbHNlIH0pO1xuICBjb25zdCBjb250ZXh0ID0gcGRmRG9jLmNvbnRleHQ7XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHBhcmFtc0RpY3QgPSBjb250ZXh0Lm9iaih7XG4gICAgU2l6ZTogUERGTnVtYmVyLm9mKHhtbEJ5dGVzLmxlbmd0aCksXG4gICAgQ3JlYXRpb25EYXRlOiBQREZTdHJpbmcuZnJvbURhdGUobm93KSxcbiAgICBNb2REYXRlOiBQREZTdHJpbmcuZnJvbURhdGUobm93KSxcbiAgfSk7XG5cbiAgY29uc3Qgc3VidHlwZU5hbWUgPSBtZWRpYVR5cGUuaW5jbHVkZXMoXCIvXCIpXG4gICAgPyBtZWRpYVR5cGUucmVwbGFjZShcIi9cIiwgXCIjMkZcIilcbiAgICA6IG1lZGlhVHlwZTtcblxuICBjb25zdCBlbWJlZGRlZEZpbGVTdHJlYW0gPSBjb250ZXh0LnN0cmVhbSh4bWxCeXRlcywge1xuICAgIFR5cGU6IFBERk5hbWUub2YoXCJFbWJlZGRlZEZpbGVcIiksXG4gICAgU3VidHlwZTogUERGTmFtZS5vZihzdWJ0eXBlTmFtZSksXG4gICAgUGFyYW1zOiBwYXJhbXNEaWN0LFxuICB9KTtcbiAgY29uc3QgZW1iZWRkZWRGaWxlUmVmID0gY29udGV4dC5yZWdpc3RlcihlbWJlZGRlZEZpbGVTdHJlYW0pO1xuXG4gIGNvbnN0IGVmRGljdCA9IGNvbnRleHQub2JqKHtcbiAgICBGOiBlbWJlZGRlZEZpbGVSZWYsXG4gICAgVUY6IGVtYmVkZGVkRmlsZVJlZixcbiAgfSk7XG5cbiAgY29uc3QgZmlsZVNwZWNEaWN0ID0gY29udGV4dC5vYmooe1xuICAgIFR5cGU6IFBERk5hbWUub2YoXCJGaWxlc3BlY1wiKSxcbiAgICBGOiBQREZTdHJpbmcub2YoZmlsZU5hbWUpLFxuICAgIFVGOiBQREZTdHJpbmcub2YoZmlsZU5hbWUpLFxuICAgIEVGOiBlZkRpY3QsXG4gICAgRGVzYzogUERGU3RyaW5nLm9mKGRlc2NyaXB0aW9uKSxcbiAgICBBRlJlbGF0aW9uc2hpcDogUERGTmFtZS5vZihcIkRhdGFcIiksXG4gIH0pO1xuICBjb25zdCBmaWxlU3BlY1JlZiA9IGNvbnRleHQucmVnaXN0ZXIoZmlsZVNwZWNEaWN0KTtcblxuICBsZXQgbmFtZXNEaWN0ID0gcGRmRG9jLmNhdGFsb2cuZ2V0KFBERk5hbWUub2YoXCJOYW1lc1wiKSk7XG4gIGlmICghKG5hbWVzRGljdCBpbnN0YW5jZW9mIFBERkRpY3QpKSB7XG4gICAgY29uc3QgY3JlYXRlZCA9IGNvbnRleHQub2JqKHt9KTtcbiAgICBwZGZEb2MuY2F0YWxvZy5zZXQoUERGTmFtZS5vZihcIk5hbWVzXCIpLCBjcmVhdGVkKTtcbiAgICBuYW1lc0RpY3QgPSBjcmVhdGVkO1xuICB9XG4gIGNvbnN0IG5hbWVzRGljdE9iaiA9IG5hbWVzRGljdCBhcyBQREZEaWN0O1xuXG4gIGxldCBlbWJlZGRlZEZpbGVzRGljdCA9IG5hbWVzRGljdE9iai5nZXQoUERGTmFtZS5vZihcIkVtYmVkZGVkRmlsZXNcIikpO1xuICBpZiAoIShlbWJlZGRlZEZpbGVzRGljdCBpbnN0YW5jZW9mIFBERkRpY3QpKSB7XG4gICAgY29uc3QgY3JlYXRlZCA9IGNvbnRleHQub2JqKHt9KTtcbiAgICBuYW1lc0RpY3RPYmouc2V0KFBERk5hbWUub2YoXCJFbWJlZGRlZEZpbGVzXCIpLCBjcmVhdGVkKTtcbiAgICBlbWJlZGRlZEZpbGVzRGljdCA9IGNyZWF0ZWQ7XG4gIH1cbiAgY29uc3QgZW1iZWRkZWRGaWxlc0RpY3RPYmogPSBlbWJlZGRlZEZpbGVzRGljdCBhcyBQREZEaWN0O1xuXG4gIGxldCBuYW1lc0FycmF5ID0gZW1iZWRkZWRGaWxlc0RpY3RPYmouZ2V0KFBERk5hbWUub2YoXCJOYW1lc1wiKSk7XG4gIGlmICghKG5hbWVzQXJyYXkgaW5zdGFuY2VvZiBQREZBcnJheSkpIHtcbiAgICBjb25zdCBjcmVhdGVkID0gY29udGV4dC5vYmooW10pO1xuICAgIGVtYmVkZGVkRmlsZXNEaWN0T2JqLnNldChQREZOYW1lLm9mKFwiTmFtZXNcIiksIGNyZWF0ZWQpO1xuICAgIG5hbWVzQXJyYXkgPSBjcmVhdGVkO1xuICB9XG4gIGNvbnN0IG5hbWVzQXJyYXlPYmogPSBuYW1lc0FycmF5IGFzIFBERkFycmF5O1xuICBuYW1lc0FycmF5T2JqLnB1c2goUERGU3RyaW5nLm9mKGZpbGVOYW1lKSk7XG4gIG5hbWVzQXJyYXlPYmoucHVzaChmaWxlU3BlY1JlZik7XG5cbiAgbGV0IGFmQXJyYXkgPSBwZGZEb2MuY2F0YWxvZy5nZXQoUERGTmFtZS5vZihcIkFGXCIpKTtcbiAgaWYgKCEoYWZBcnJheSBpbnN0YW5jZW9mIFBERkFycmF5KSkge1xuICAgIGNvbnN0IGNyZWF0ZWQgPSBjb250ZXh0Lm9iaihbXSk7XG4gICAgcGRmRG9jLmNhdGFsb2cuc2V0KFBERk5hbWUub2YoXCJBRlwiKSwgY3JlYXRlZCk7XG4gICAgYWZBcnJheSA9IGNyZWF0ZWQ7XG4gIH1cbiAgY29uc3QgYWZBcnJheU9iaiA9IGFmQXJyYXkgYXMgUERGQXJyYXk7XG4gIGFmQXJyYXlPYmoucHVzaChmaWxlU3BlY1JlZik7XG5cbiAgcGRmRG9jLnNldFN1YmplY3QoYEVtYmVkZGVkIFhNTDogJHtmaWxlTmFtZX1gKTtcbiAgcGRmRG9jLnNldEtleXdvcmRzKFtcIkludm9pY2VcIiwgXCJFbWJlZGRlZCBYTUxcIiwgZmlsZU5hbWVdKTtcbiAgcGRmRG9jLnNldE1vZGlmaWNhdGlvbkRhdGUobm93KTtcbiAgaWYgKGRvY0xhbmcpIHtcbiAgICBwZGZEb2MuY2F0YWxvZy5zZXQoUERGTmFtZS5vZihcIkxhbmdcIiksIFBERlN0cmluZy5vZihkb2NMYW5nKSk7XG4gIH1cblxuICBpZiAocHJvZmlsZSAmJiAocHJvZmlsZS5pZCA9PT0gXCJmYWN0dXJ4MjJcIiB8fCBwcm9maWxlLmlkID09PSBcInp1Z2ZlcmRcIikpIHtcbiAgICBjb25zdCB4bXAgPSBnZW5lcmF0ZVp1Z2ZlcmRYTVAoZmlsZU5hbWUsIFwiRU4xNjkzMVwiKTtcbiAgICBjb25zdCBtZXRhZGF0YVN0cmVhbSA9IGNvbnRleHQuc3RyZWFtKHhtcCwge1xuICAgICAgVHlwZTogUERGTmFtZS5vZihcIk1ldGFkYXRhXCIpLFxuICAgICAgU3VidHlwZTogUERGTmFtZS5vZihcIlhNTFwiKSxcbiAgICB9KTtcbiAgICBjb25zdCBtZXRhZGF0YVJlZiA9IGNvbnRleHQucmVnaXN0ZXIobWV0YWRhdGFTdHJlYW0pO1xuICAgIHBkZkRvYy5jYXRhbG9nLnNldChQREZOYW1lLm9mKFwiTWV0YWRhdGFcIiksIG1ldGFkYXRhUmVmKTtcbiAgfVxuXG4gIHJldHVybiBwZGZEb2Muc2F2ZSh7IHVzZU9iamVjdFN0cmVhbXM6IGZhbHNlIH0pO1xufVxuXG4vLyBBbGlhcyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuZXhwb3J0IGNvbnN0IGdlbmVyYXRlUERGID0gZ2VuZXJhdGVJbnZvaWNlUERGO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQ0UsUUFBUSxFQUNSLE9BQU8sRUFDUCxXQUFXLEVBQ1gsT0FBTyxFQUNQLFNBQVMsRUFDVCxTQUFTLFFBQ0osVUFBVTtBQUNqQixTQUFTLGtCQUFrQixRQUFvQixtQkFBbUI7QUFDbEUsU0FBUyxrQkFBa0IsUUFBUSxXQUFXO0FBQzlDLFNBQVMsSUFBSSxRQUFRLFdBQVc7QUFNaEMsU0FDRSx1QkFBdUIsRUFDdkIsNEJBQTRCLEVBQzVCLCtCQUErQixRQUMxQixtQkFBbUI7QUFDMUIsU0FDRSxlQUFlLEVBQ2Ysa0JBQWtCLFNBQVMsUUFDdEIsOEJBQThCO0FBQ3JDLFNBQVMsa0JBQWtCLFFBQVEsOEJBQThCO0FBQ2pFLFNBQVMsZ0JBQWdCLFFBQVEsMEJBQTBCO0FBQzNELDhFQUE4RTtBQUU5RSxnQ0FBZ0M7QUFDaEMsU0FBUyxhQUFhLEdBQVk7RUFDaEMsSUFBSSxDQUFDLEtBQUssT0FBTztFQUNqQixNQUFNLElBQUksSUFBSSxJQUFJO0VBQ2xCLElBQUkscUJBQXFCLElBQUksQ0FBQyxJQUFJLE9BQU8sRUFBRSxVQUFVLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUc7RUFDeEUsT0FBTztBQUNUO0FBRUEsU0FBUyxXQUFXLEtBQWM7RUFDaEMsTUFBTSxNQUFNLFVBQVUsYUFBYSxVQUFVLE9BQU8sS0FBSyxPQUFPO0VBQ2hFLE9BQU8sSUFDSixPQUFPLENBQUMsTUFBTSxTQUNkLE9BQU8sQ0FBQyxNQUFNLFFBQ2QsT0FBTyxDQUFDLE1BQU0sUUFDZCxPQUFPLENBQUMsTUFBTSxVQUNkLE9BQU8sQ0FBQyxNQUFNO0FBQ25CO0FBRUEsU0FBUyxzQkFBc0IsS0FBYztFQUMzQyxPQUFPLFdBQVcsT0FBTyxPQUFPLENBQUMsVUFBVTtBQUM3QztBQUVBLE1BQU0sOEJBQThCLElBQUksSUFBSTtFQUMxQztFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0NBQ0Q7QUFJRCxTQUFTLDBCQUEwQixLQUFjO0VBQy9DLElBQUksVUFBVSxpQkFBaUIsVUFBVSxlQUFlLE9BQU87RUFDL0QsT0FBTztBQUNUO0FBRUEsU0FBUyxxQkFDUCxVQUFtQixFQUNuQixJQUFhLEVBQ2IsV0FBb0IsRUFDcEIsTUFBZTtFQUVmLE1BQU0sU0FBUyxDQUFDLGNBQWMsRUFBRSxFQUFFLElBQUk7RUFDdEMsTUFBTSxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSTtFQUMvQixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sT0FBTztFQUM5QixJQUFJLENBQUMsUUFBUSxPQUFPO0VBQ3BCLElBQUksQ0FBQyxPQUFPLE9BQU87RUFFbkIsTUFBTSxtQkFBbUIsMEJBQTBCO0VBQ25ELElBQUkscUJBQXFCLGVBQWU7SUFDdEMsZ0dBQWdHO0lBQ2hHLE9BQU8sR0FBRyxNQUFNLEVBQUUsRUFBRSxRQUFRO0VBQzlCO0VBQ0EsSUFBSSxxQkFBcUIsZUFBZTtJQUN0QyxPQUFPLEdBQUcsT0FBTyxDQUFDLEVBQUUsT0FBTztFQUM3QjtFQUVBLE1BQU0sVUFBVSxDQUFDLGVBQWUsRUFBRSxFQUFFLElBQUksR0FBRyxXQUFXO0VBQ3RELElBQUksNEJBQTRCLEdBQUcsQ0FBQyxVQUFVO0lBQzVDLE9BQU8sR0FBRyxNQUFNLENBQUMsRUFBRSxRQUFRO0VBQzdCO0VBQ0EsT0FBTyxHQUFHLE9BQU8sQ0FBQyxFQUFFLE9BQU87QUFDN0I7QUFFQSxNQUFNLGdCQUFnQixJQUFJLElBQUk7RUFBQztFQUFhO0VBQWE7Q0FBTTtBQUUvRCxTQUFTLGtCQUFrQixRQUFnQjtFQUN6QyxNQUFNLFFBQVEsU0FBUyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFNLE9BQU87RUFDcEQsSUFDRSxNQUFNLE1BQU0sS0FBSyxLQUNqQixNQUFNLElBQUksQ0FBQyxDQUFDLElBQU0sT0FBTyxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssSUFBSSxNQUNsRDtJQUNBLE9BQU87RUFDVDtFQUNBLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRztFQUNmLElBQUksTUFBTSxJQUFJLE9BQU87RUFDckIsSUFBSSxNQUFNLE9BQU8sTUFBTSxLQUFLLE9BQU87RUFDbkMsSUFBSSxNQUFNLE9BQU8sS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPO0VBQzVDLElBQUksTUFBTSxPQUFPLE1BQU0sS0FBSyxPQUFPO0VBQ25DLElBQUksTUFBTSxLQUFLLE9BQU87RUFDdEIsSUFBSSxNQUFNLEdBQUcsT0FBTztFQUNwQixPQUFPO0FBQ1Q7QUFFQSxTQUFTLGtCQUFrQixRQUFnQjtFQUN6QyxNQUFNLFFBQVEsU0FBUyxXQUFXO0VBQ2xDLElBQUksVUFBVSxPQUFPLE9BQU87RUFDNUIsSUFBSSxNQUFNLFVBQVUsQ0FBQyxTQUFTLE1BQU0sVUFBVSxDQUFDLE9BQU8sT0FBTztFQUM3RCxJQUFJLE1BQU0sVUFBVSxDQUFDLFNBQVMsT0FBTztFQUNyQyxPQUFPO0FBQ1Q7QUFFQSxTQUFTLHNCQUFzQixHQUFXO0VBQ3hDLElBQUk7RUFDSixJQUFJO0lBQ0YsTUFBTSxJQUFJLElBQUk7RUFDaEIsRUFBRSxPQUFNO0lBQ04sT0FBTztFQUNUO0VBQ0EsSUFBSSxJQUFJLFFBQVEsS0FBSyxVQUFVLE9BQU87RUFDdEMsTUFBTSxPQUFPLElBQUksUUFBUSxDQUFDLFdBQVc7RUFDckMsSUFBSSxjQUFjLEdBQUcsQ0FBQyxPQUFPLE9BQU87RUFDcEMsSUFBSSxrQkFBa0IsU0FBUyxrQkFBa0IsT0FBTyxPQUFPO0VBQy9ELE9BQU87QUFDVDtBQUVBLFNBQVMsUUFBUSxHQUFXLEVBQUUsU0FBUyxJQUFJO0VBQ3pDLE1BQU0sSUFBSSxhQUFhLFFBQVE7RUFDL0IsTUFBTSxJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUs7RUFDekIsTUFBTSxJQUFJLFNBQVMsRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJO0VBQ2xDLE1BQU0sSUFBSSxTQUFTLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSTtFQUNsQyxNQUFNLElBQUksU0FBUyxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUk7RUFDbEMsTUFBTSxNQUFNLENBQUMsSUFBYyxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7RUFDdEQsTUFBTSxLQUFLLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxRQUFRLENBQUMsR0FBRztFQUMzQyxNQUFNLEtBQUssSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxHQUFHO0VBQzNDLE1BQU0sS0FBSyxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksUUFBUSxDQUFDLEdBQUc7RUFDM0MsT0FBTyxDQUFDLENBQUMsRUFBRSxLQUFLLEtBQUssSUFBSTtBQUMzQjtBQUVBLFNBQVMsV0FBVyxDQUFRLEVBQUUsU0FBaUIsWUFBWTtFQUN6RCxJQUFJLENBQUMsR0FBRyxPQUFPO0VBQ2YsTUFBTSxPQUFPLElBQUksS0FBSztFQUN0QixvRUFBb0U7RUFDcEUsK0NBQStDO0VBQy9DLE1BQU0sT0FBTyxLQUFLLGNBQWM7RUFDaEMsTUFBTSxRQUFRLE9BQU8sS0FBSyxXQUFXLEtBQUssR0FBRyxRQUFRLENBQUMsR0FBRztFQUN6RCxNQUFNLE1BQU0sT0FBTyxLQUFLLFVBQVUsSUFBSSxRQUFRLENBQUMsR0FBRztFQUVsRCxJQUFJLFdBQVcsY0FBYztJQUMzQixPQUFPLEdBQUcsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLEVBQUUsTUFBTTtFQUNsQztFQUNBLHdCQUF3QjtFQUN4QixPQUFPLEdBQUcsS0FBSyxDQUFDLEVBQUUsTUFBTSxDQUFDLEVBQUUsS0FBSztBQUNsQztBQVNBLFNBQVMsMEJBQ1AsSUFBYSxFQUNiLGdCQUFnQixLQUFLO0VBRXJCLElBQUksQ0FBQyxNQUFNLE9BQU87RUFDbEIsTUFBTSxRQUFRLDZCQUE2QixLQUFLLElBQUk7RUFDcEQsSUFBSSxDQUFDLE9BQU8sT0FBTztFQUNuQixJQUFJLE1BQU0sVUFBVSxDQUFDLFVBQVUsT0FBTztFQUN0QyxJQUFJLGdCQUFnQixJQUFJLENBQUMsUUFBUSxPQUFPO0VBQ3hDLElBQUksTUFBTSxVQUFVLENBQUMsTUFBTTtJQUN6QixJQUFJLGVBQWU7TUFDakIsTUFBTSxTQUFTLGdDQUFnQztNQUMvQyxJQUFJLFFBQVE7UUFDVixNQUFNLGFBQWEsT0FBTyxVQUFVLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxRQUFRO1FBQ2hFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWTtNQUMvQjtJQUNGO0lBQ0EsSUFBSSxDQUFDLGVBQWUsT0FBTztJQUMzQixNQUFNLE9BQU8sS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLGVBQWU7SUFDekMsSUFBSTtNQUNGLE9BQU8sSUFBSSxJQUFJLE9BQU8sTUFBTSxRQUFRO0lBQ3RDLEVBQUUsT0FBTTtNQUNOLE9BQU87SUFDVDtFQUNGO0VBQ0EsT0FBTztBQUNUO0FBRUEsU0FBUyxZQUNQLEtBQWEsRUFDYixRQUFnQixFQUNoQixlQUFtQyxPQUFPO0VBRTFDLCtEQUErRDtFQUMvRCxJQUFJO0VBQ0osSUFBSTtFQUVKLElBQUksaUJBQWlCLFVBQVU7SUFDN0IsMkJBQTJCO0lBQzNCLFNBQVMsU0FBUyx3RUFBd0U7SUFDMUYsVUFBVTtNQUFFLE9BQU87TUFBWTtJQUFTO0VBQzFDLE9BQU87SUFDTCxxQkFBcUI7SUFDckIsU0FBUztJQUNULFVBQVU7TUFBRSxPQUFPO01BQVk7SUFBUztFQUMxQztFQUVBLE9BQU8sSUFBSSxLQUFLLFlBQVksQ0FBQyxRQUFRLFNBQVMsTUFBTSxDQUFDO0FBQ3ZEO0FBRUEsZUFBZSxzQkFDYixRQUEyQjtFQUUzQixJQUFJLENBQUMsVUFBVSxNQUFNLE9BQU87RUFDNUIsTUFBTSxNQUFNLFNBQVMsSUFBSSxDQUFDLElBQUk7RUFDOUIsSUFBSSxJQUFJLFVBQVUsQ0FBQyxVQUFVO0lBQzNCLE9BQU87TUFBRSxHQUFHLFFBQVE7TUFBRSxTQUFTO0lBQUk7RUFDckM7RUFFQSxNQUFNLFlBQVksQ0FBQyxPQUFtQixPQUFPLFdBQVc7SUFDdEQsTUFBTSxTQUFTLEtBQUssT0FBTyxZQUFZLElBQUk7SUFDM0MsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLFFBQVEsRUFBRSxRQUFRO0VBQ3hDO0VBRUEsSUFBSTtJQUNGLElBQUksSUFBSSxVQUFVLENBQUMsUUFBUSxnQ0FBZ0MsTUFBTTtNQUMvRCxNQUFNLFNBQVMsZ0NBQWdDO01BQy9DLElBQUksUUFBUTtRQUNWLE1BQU0sT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDO1FBQ2pDLE9BQU87VUFDTCxHQUFHLFFBQVE7VUFDWCxTQUFTLFVBQVUsTUFBTSx3QkFBd0I7UUFDbkQ7TUFDRjtJQUNGO0lBRUEsTUFBTSxTQUFTLHNCQUFzQjtJQUNyQyxJQUFJLFFBQVE7TUFDVixNQUFNLE1BQU0sTUFBTSxNQUFNO01BQ3hCLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxPQUFPO01BQ3BCLE1BQU0sTUFBTSxJQUFJLFdBQVcsTUFBTSxJQUFJLFdBQVc7TUFDaEQsTUFBTSxPQUFPLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7TUFDaEQsT0FBTztRQUNMLEdBQUcsUUFBUTtRQUNYLFNBQVMsVUFBVSxLQUFLO01BQzFCO0lBQ0Y7SUFDQSw4Q0FBOEM7SUFDOUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxPQUFPO01BQ3RCLE9BQU87SUFDVDtJQUNBLE1BQU0sT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDO0lBQ2pDLElBQUksT0FBTztJQUNYLElBQUksSUFBSSxRQUFRLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxVQUFVLE9BQU87SUFDMUQsSUFBSSxJQUFJLFFBQVEsQ0FBQyxTQUFTLE9BQU87SUFDakMsT0FBTztNQUNMLEdBQUcsUUFBUTtNQUNYLFNBQVMsVUFBVSxNQUFNO0lBQzNCO0VBQ0YsRUFBRSxPQUFPLElBQUk7SUFDWCxPQUFPLFVBQVUsZ0JBQWdCO0VBQ25DO0FBQ0Y7QUFFQSxTQUFTLGFBQ1AsT0FBMkIsRUFDM0IsUUFBd0UsRUFDeEUsVUFBbUIsRUFDbkIsVUFBbUIsRUFDbkIsWUFBaUMsRUFDakMsY0FBdUIsRUFDdkIsdUJBQXVCLEtBQUs7RUFFNUIsTUFBTSxrQkFBa0Isa0JBQWtCLFFBQVEsTUFBTSxJQUFJLFVBQVU7RUFDdEUsTUFBTSxFQUFFLFFBQVEsY0FBYyxFQUFFLE1BQU0sRUFBRSxHQUFHLGlCQUFpQjtFQUM1RCxNQUFNLFdBQVcsUUFBUSxRQUFRLElBQUksVUFBVSxZQUFZO0VBQzNELE1BQU0sb0JBQW9CLHFCQUN4QixVQUFVLG1CQUNWLFVBQVUsYUFDVixVQUFVLG9CQUNWLFVBQVU7RUFFWixNQUFNLFdBQVcsVUFBVSxZQUFZLE9BQU8sU0FBUyxRQUFRLEVBQUUsSUFBSSxLQUNqRSxPQUFPLFNBQVMsUUFBUSxFQUFFLElBQUksS0FDOUIsT0FBTyxRQUFRO0VBQ25CLHFEQUFxRDtFQUNyRCxJQUFJLGFBQWEsUUFBUSxLQUFLLElBQUksUUFBUSxLQUFLLENBQUMsTUFBTSxHQUFHLElBQ3JELFFBQVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQU0sQ0FBQztNQUMxQixPQUFPLEdBQUcsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO01BQ2xDLFNBQVMsRUFBRSxPQUFPO01BQ2xCLFNBQVMsWUFDUCxFQUFFLGFBQWEsRUFDZixVQUNBLGdCQUFnQjtNQUVsQixRQUFRLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxnQkFBZ0I7SUFDN0QsQ0FBQyxLQUNDO0VBQ0osdUVBQXVFO0VBQ3ZFLElBQUksQ0FBQyxDQUFDLGNBQWMsV0FBVyxNQUFNLEtBQUssQ0FBQyxLQUFLLFFBQVEsU0FBUyxHQUFHLEdBQUc7SUFDckUsTUFBTSxVQUFVLFFBQVEsT0FBTyxJQUFJO0lBQ25DLE1BQU0sY0FBYyxLQUFLLEdBQUcsQ0FDMUIsR0FDQSxDQUFDLFFBQVEsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsY0FBYyxJQUFJLENBQUM7SUFFeEQsYUFBYTtNQUNYO1FBQ0UsT0FBTyxHQUFHLFNBQVMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2hDO1FBQ0EsU0FBUyxZQUFZLGFBQWEsVUFBVSxnQkFBZ0I7UUFDNUQsUUFBUSxZQUNOLFFBQVEsU0FBUyxFQUNqQixVQUNBLGdCQUFnQjtNQUVwQjtLQUNEO0VBQ0g7RUFDQSxNQUFNLGVBQWUsUUFBUSxLQUFLLENBQUMsSUFBSSxDQUNyQyxDQUFDLElBQU0sT0FBTyxFQUFFLElBQUksS0FBSyxZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLEdBQUc7RUFFOUQsT0FBTztJQUNMLFVBQVU7SUFDVixhQUFhLFVBQVUsZUFBZTtJQUN0QyxnQkFBZ0Isc0JBQXNCLFVBQVUsa0JBQWtCO0lBQ2xFLGFBQWEsQ0FBQyxVQUFVLGVBQWUsRUFBRSxFQUFFLElBQUksTUFBTTtJQUNyRCxtQkFBbUIsQ0FBQyxVQUFVLHFCQUFxQixFQUFFLEVBQUUsSUFBSSxNQUFNO0lBQ2pFO0lBQ0EsY0FBYyxVQUFVLGdCQUFnQjtJQUN4QyxjQUFjLFVBQVUsZ0JBQWdCO0lBQ3hDLGNBQWMsVUFBVSxnQkFBZ0I7SUFFeEMsVUFBVTtJQUNWLGVBQWUsUUFBUSxhQUFhO0lBQ3BDLFdBQVcsV0FBVyxRQUFRLFNBQVMsRUFBRTtJQUN6QyxTQUFTLFdBQVcsUUFBUSxPQUFPLEVBQUU7SUFDckM7SUFDQSxRQUFRLFFBQVEsTUFBTTtJQUV0QixXQUFXO0lBQ1gsY0FBYyxRQUFRLFFBQVEsQ0FBQyxJQUFJO0lBQ25DLHFCQUFxQixRQUFRLFFBQVEsQ0FBQyxXQUFXO0lBQ2pELGVBQWUsUUFBUSxRQUFRLENBQUMsS0FBSztJQUNyQyxlQUFlLFFBQVEsUUFBUSxDQUFDLEtBQUs7SUFDckMsaUJBQWlCLHNCQUFzQixRQUFRLFFBQVEsQ0FBQyxPQUFPO0lBQy9ELGNBQWMsUUFBUSxRQUFRLENBQUMsSUFBSTtJQUNuQyxvQkFBb0IsUUFBUSxRQUFRLENBQUMsVUFBVTtJQUMvQyxnQkFBZ0IsUUFBUSxRQUFRLENBQUMsTUFBTTtJQUN2QyxxQkFBcUIsUUFBUSxRQUFRLENBQUMsV0FBVztJQUNqRCxvQkFBb0IscUJBQ2xCLFFBQVEsUUFBUSxDQUFDLFVBQVUsRUFDM0IsUUFBUSxRQUFRLENBQUMsSUFBSSxFQUNyQixRQUFRLFFBQVEsQ0FBQyxXQUFXLEVBQzVCLFVBQVU7SUFFWixlQUFlLFFBQVEsUUFBUSxDQUFDLEtBQUs7SUFFckMsUUFBUTtJQUNSLE9BQU8sUUFBUSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBTSxDQUFDO1FBQy9CLGFBQWEsRUFBRSxXQUFXO1FBQzFCLFVBQVUsRUFBRSxRQUFRO1FBQ3BCLE1BQU0sT0FBTyxFQUFFLElBQUksS0FBSyxZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLEdBQUcsSUFDdkQsRUFBRSxJQUFJLENBQUMsSUFBSSxLQUNYO1FBQ0osV0FBVyxZQUFZLEVBQUUsU0FBUyxFQUFFLFVBQVUsZ0JBQWdCO1FBQzlELFdBQVcsWUFBWSxFQUFFLFNBQVMsRUFBRSxVQUFVLGdCQUFnQjtRQUM5RCxPQUFPLEVBQUUsS0FBSztNQUNoQixDQUFDO0lBQ0Q7SUFFQSxTQUFTO0lBQ1QsVUFBVSxZQUFZLFFBQVEsUUFBUSxFQUFFLFVBQVUsZ0JBQWdCO0lBQ2xFLGdCQUFnQixRQUFRLGNBQWMsR0FBRyxJQUNyQyxZQUFZLFFBQVEsY0FBYyxFQUFFLFVBQVUsZ0JBQWdCLFdBQzlEO0lBQ0osb0JBQW9CLFFBQVEsa0JBQWtCLElBQUk7SUFDbEQsU0FBUyxRQUFRLE9BQU8sSUFBSTtJQUM1QixXQUFXLFFBQVEsU0FBUyxHQUFHLElBQzNCLFlBQVksUUFBUSxTQUFTLEVBQUUsVUFBVSxnQkFBZ0IsV0FDekQ7SUFDSixPQUFPLFlBQVksUUFBUSxLQUFLLEVBQUUsVUFBVSxnQkFBZ0I7SUFDNUQ7SUFDQSxlQUFlLFFBQVEsY0FBYyxXQUFXLE1BQU0sR0FBRztJQUN6RCx5RUFBeUU7SUFDekUsYUFBYSxZQUNYLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLGNBQWMsSUFBSSxDQUFDLElBQ2xFLFVBQ0EsZ0JBQWdCO0lBR2xCLFFBQVE7SUFDUixhQUFhLFFBQVEsY0FBYyxHQUFHO0lBQ3RDLFFBQVEsUUFBUSxTQUFTLEdBQUc7SUFFNUIsVUFBVTtJQUNWLGNBQWMsUUFBUSxZQUFZLElBQUksVUFBVSxnQkFBZ0I7SUFDaEUsZ0JBQWdCLFVBQVUsa0JBQWtCO0lBQzVDLGFBQWEsVUFBVSxlQUFlO0lBRXRDLFFBQVE7SUFDUixPQUFPLFFBQVEsS0FBSyxJQUFJLFVBQVUsZ0JBQWdCO0lBRWxELHVCQUF1QjtJQUN2QixRQUFRO0lBQ1I7SUFFQSw0Q0FBNEM7SUFDNUMsdUZBQXVGO0lBQ3ZGLFNBQVMsMEJBQ1AsQUFBQyxVQUFtQyxXQUNqQyxVQUFtQyxNQUN0QztJQUVGLG1DQUFtQztJQUNuQyxlQUFlO0VBQ2pCO0FBQ0Y7QUFFQSxPQUFPLGVBQWUsbUJBQ3BCLFdBQStCLEVBQy9CLGdCQUFtQyxFQUNuQyxVQUFtQixFQUNuQixvQkFBNkIsRUFDN0IsSUFPQztFQUVELGtEQUFrRDtFQUNsRCxpRUFBaUU7RUFDakUsTUFBTSxpQkFBaUI7RUFDdkIsTUFBTSxPQUFPLGlCQUNYLGFBQ0EsZ0JBQ0EsWUFDQSxzQkFDQSxNQUFNLFlBQ04sTUFBTSxjQUNOLE1BQU0sVUFBVSxZQUFZLE1BQU0sSUFBSSxnQkFBZ0IsUUFDdEQ7RUFFRixNQUFNLGNBQThELEVBQUU7RUFDdEUsSUFBSSxNQUFNLFVBQVU7SUFDbEIsSUFBSTtNQUNGLE1BQU0sWUFBWSxLQUFLLGlCQUFpQixJQUFJO01BQzVDLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsbUJBQ3ZCLFdBQ0EsYUFDQSxrQkFBbUIsQ0FBQztNQUV0QixZQUFZLElBQUksQ0FBQztRQUNmLFVBQVUsQ0FBQyxRQUFRLEVBQ2pCLFlBQVksYUFBYSxJQUFJLFlBQVksRUFBRSxDQUM1QyxDQUFDLEVBQUUsUUFBUSxhQUFhLEVBQUU7UUFDM0IsT0FBTyxJQUFJLGNBQWMsTUFBTSxDQUFDO01BQ2xDO0lBQ0YsRUFBRSxPQUFPLE9BQU87TUFDZCxRQUFRLElBQUksQ0FBQyxxQ0FBcUM7SUFDcEQ7RUFDRjtFQUVBLElBQUk7SUFDRixPQUFPLE1BQU0sd0JBQXdCLE1BQU07RUFDN0MsRUFBRSxPQUFPLEtBQUs7SUFDWixNQUFNLE1BQU0sZUFBZSxRQUFRLElBQUksT0FBTyxHQUFHLE9BQU87SUFDeEQsTUFBTSxJQUFJLE1BQU0sQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLO0VBQzNEO0FBQ0Y7QUFFQSxPQUFPLFNBQVMsaUJBQ2QsT0FBMkIsRUFDM0IsUUFBMkIsRUFDM0IsVUFBbUIsRUFDbkIsU0FBa0IsRUFDbEIsVUFBbUIsRUFDbkIsWUFBaUMsRUFDakMsY0FBdUIsRUFDdkIsdUJBQXVCLEtBQUs7RUFFNUIsTUFBTSxNQUFNLGFBQ1YsU0FDQSxVQUNBLFdBQ0EsWUFDQSxjQUNBLGdCQUNBO0VBRUYsTUFBTSxLQUFLLGFBQWEsY0FBYztFQUN0QyxNQUFNLFVBQVUsUUFBUSxJQUFJO0VBRTVCLElBQUk7RUFDSixJQUFJLFlBQVk7SUFDZCxJQUFJO01BQ0YsV0FBVyxnQkFBZ0I7SUFDN0IsRUFBRSxPQUFPLEtBQUs7TUFDWixNQUFNLFVBQVUsZUFBZSxRQUFRLElBQUksT0FBTyxHQUFHLE9BQU87TUFDNUQsUUFBUSxJQUFJLENBQUMsQ0FBQyx3QkFBd0IsRUFBRSxXQUFXLEVBQUUsRUFBRSxTQUFTO0lBQ2xFO0VBQ0Y7RUFFQSxNQUFNLG1CQUFtQixZQUFZO0VBQ3JDLElBQUksQ0FBQyxrQkFBa0I7SUFDckIsTUFBTSxJQUFJLE1BQ1I7RUFFSjtFQUVBLE9BQU8sVUFBVSxpQkFBaUIsSUFBSSxFQUFFO0lBQ3RDLEdBQUcsR0FBRztJQUNOLGdCQUFnQjtJQUNoQixxQkFBcUI7RUFDdkI7QUFDRjtBQUVBLGVBQWU7RUFDYixNQUFNLGFBQXVCLEVBQUU7RUFDL0IsSUFBSTtJQUNGLE1BQU0sYUFBYSxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFDaEMsSUFBSSxjQUFjLFdBQVcsSUFBSSxHQUFHLE1BQU0sR0FBRyxHQUFHO01BQzlDLFdBQVcsSUFBSSxDQUFDLFdBQVcsSUFBSTtJQUNqQztFQUNGLEVBQUUsT0FBTTtFQUNOLDJCQUEyQjtFQUM3QjtFQUNBLFdBQVcsSUFBSSxDQUFDO0VBRWhCLEtBQUssTUFBTSxhQUFhLFdBQVk7SUFDbEMsSUFBSTtNQUNGLE1BQU0sUUFBUSxJQUFJLEtBQUssT0FBTyxDQUFDLFdBQVc7UUFDeEMsTUFBTTtVQUFDO1NBQVk7UUFDbkIsUUFBUTtRQUNSLFFBQVE7TUFDVjtNQUNBLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLE1BQU0sTUFBTTtNQUN0QyxJQUFJLFNBQVMsT0FBTztJQUN0QixFQUFFLE9BQU07SUFDTixtQkFBbUI7SUFDckI7RUFDRjtFQUNBLE9BQU87QUFDVDtBQUVBLGVBQWUsY0FDYixVQUFrQixFQUNsQixhQUFxQixFQUNyQixhQUFxQixFQUNyQixlQUF5QixFQUN6QixpQkFBMEI7RUFFMUIsTUFBTSxPQUFpQjtJQUNyQjtJQUNBO0lBQ0E7SUFDQTtHQUNEO0VBQ0QsSUFBSSxtQkFBbUI7SUFDckIsS0FBSyxJQUFJLENBQUMsaUJBQWlCO0VBQzdCO0VBQ0EsS0FBSyxNQUFNLEtBQUssZ0JBQWlCO0lBQy9CLEtBQUssSUFBSSxDQUFDLGdCQUFnQjtFQUM1QjtFQUVBLE1BQU0sTUFBTSxJQUFJLEtBQUssT0FBTyxDQUFDLFlBQVk7SUFDdkM7SUFDQSxRQUFRO0lBQ1IsUUFBUTtFQUNWO0VBQ0EsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUksTUFBTTtFQUN6QyxJQUFJLFNBQVMsR0FBRztJQUNkLE1BQU0sSUFBSSxNQUNSLElBQUksY0FBYyxNQUFNLENBQUMsV0FBVyxDQUFDLDRCQUE0QixFQUFFLE1BQU07RUFFN0U7QUFDRjtBQUVBLFNBQVMsNEJBQTRCLElBQVk7RUFDL0MsTUFBTSxjQUFjLElBQUk7RUFDeEIsTUFBTSxlQUFlO0VBQ3JCLElBQUk7RUFDSixNQUFPLENBQUMsSUFBSSxhQUFhLElBQUksQ0FBQyxLQUFLLE1BQU0sS0FBTTtJQUM3QyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSTtFQUNqQztFQUVBLE9BQU8sS0FBSyxPQUFPLENBQ2pCLCtDQUNBLENBQUMsTUFBTTtJQUNMLE9BQU8sWUFBWSxHQUFHLENBQUMsU0FBUztFQUNsQztBQUVKO0FBRUEsZUFBZSx3QkFDYixJQUFZLEVBQ1osV0FBMkQ7RUFFM0QsTUFBTSxhQUFhLE1BQU07RUFDekIsSUFBSSxDQUFDLFlBQVk7SUFDZixNQUFNLElBQUksTUFDUjtFQUVKO0VBRUEsTUFBTSxTQUFTLE1BQU0sS0FBSyxXQUFXLENBQUM7SUFBRSxRQUFRO0VBQWU7RUFDL0QsTUFBTSxXQUFXLEtBQUssUUFBUTtFQUM5QixNQUFNLFVBQVUsS0FBSyxRQUFRO0VBRTdCLElBQUk7SUFDRixNQUFNLGVBQWUsNEJBQTRCO0lBQ2pELE1BQU0sS0FBSyxhQUFhLENBQUMsVUFBVTtJQUVuQyxNQUFNLGtCQUE0QixFQUFFO0lBQ3BDLEtBQUssTUFBTSxjQUFjLFlBQWE7TUFDcEMsTUFBTSxXQUFXLFdBQVcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLO01BQ3JELE1BQU0sT0FBTyxLQUFLLFFBQVE7TUFDMUIsTUFBTSxLQUFLLFNBQVMsQ0FBQyxNQUFNLFdBQVcsS0FBSztNQUMzQyxnQkFBZ0IsSUFBSSxDQUFDO0lBQ3ZCO0lBRUEsTUFBTSxjQUFjLFlBQVksVUFBVSxTQUFTLGlCQUFpQjtJQUVwRSxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUM7RUFDN0IsU0FBVTtJQUNSLElBQUk7TUFDRixNQUFNLEtBQUssTUFBTSxDQUFDLFFBQVE7UUFBRSxXQUFXO01BQUs7SUFDOUMsRUFBRSxPQUFNO0lBQ04sd0JBQXdCO0lBQzFCO0VBQ0Y7QUFDRjtBQUVBLE9BQU8sZUFBZSxtQkFDcEIsUUFBb0IsRUFDcEIsUUFBb0IsRUFDcEIsUUFBZ0IsRUFDaEIsU0FBaUIsRUFDakIsV0FBbUIsRUFDbkIsT0FBZ0IsRUFDaEIsT0FBb0I7RUFFcEIsTUFBTSxTQUFTLE1BQU0sWUFBWSxJQUFJLENBQUMsVUFBVTtJQUFFLGdCQUFnQjtFQUFNO0VBQ3hFLE1BQU0sVUFBVSxPQUFPLE9BQU87RUFDOUIsTUFBTSxNQUFNLElBQUk7RUFDaEIsTUFBTSxhQUFhLFFBQVEsR0FBRyxDQUFDO0lBQzdCLE1BQU0sVUFBVSxFQUFFLENBQUMsU0FBUyxNQUFNO0lBQ2xDLGNBQWMsVUFBVSxRQUFRLENBQUM7SUFDakMsU0FBUyxVQUFVLFFBQVEsQ0FBQztFQUM5QjtFQUVBLE1BQU0sY0FBYyxVQUFVLFFBQVEsQ0FBQyxPQUNuQyxVQUFVLE9BQU8sQ0FBQyxLQUFLLFNBQ3ZCO0VBRUosTUFBTSxxQkFBcUIsUUFBUSxNQUFNLENBQUMsVUFBVTtJQUNsRCxNQUFNLFFBQVEsRUFBRSxDQUFDO0lBQ2pCLFNBQVMsUUFBUSxFQUFFLENBQUM7SUFDcEIsUUFBUTtFQUNWO0VBQ0EsTUFBTSxrQkFBa0IsUUFBUSxRQUFRLENBQUM7RUFFekMsTUFBTSxTQUFTLFFBQVEsR0FBRyxDQUFDO0lBQ3pCLEdBQUc7SUFDSCxJQUFJO0VBQ047RUFFQSxNQUFNLGVBQWUsUUFBUSxHQUFHLENBQUM7SUFDL0IsTUFBTSxRQUFRLEVBQUUsQ0FBQztJQUNqQixHQUFHLFVBQVUsRUFBRSxDQUFDO0lBQ2hCLElBQUksVUFBVSxFQUFFLENBQUM7SUFDakIsSUFBSTtJQUNKLE1BQU0sVUFBVSxFQUFFLENBQUM7SUFDbkIsZ0JBQWdCLFFBQVEsRUFBRSxDQUFDO0VBQzdCO0VBQ0EsTUFBTSxjQUFjLFFBQVEsUUFBUSxDQUFDO0VBRXJDLElBQUksWUFBWSxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7RUFDOUMsSUFBSSxDQUFDLENBQUMscUJBQXFCLE9BQU8sR0FBRztJQUNuQyxNQUFNLFVBQVUsUUFBUSxHQUFHLENBQUMsQ0FBQztJQUM3QixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVTtJQUN4QyxZQUFZO0VBQ2Q7RUFDQSxNQUFNLGVBQWU7RUFFckIsSUFBSSxvQkFBb0IsYUFBYSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7RUFDcEQsSUFBSSxDQUFDLENBQUMsNkJBQTZCLE9BQU8sR0FBRztJQUMzQyxNQUFNLFVBQVUsUUFBUSxHQUFHLENBQUMsQ0FBQztJQUM3QixhQUFhLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxrQkFBa0I7SUFDOUMsb0JBQW9CO0VBQ3RCO0VBQ0EsTUFBTSx1QkFBdUI7RUFFN0IsSUFBSSxhQUFhLHFCQUFxQixHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7RUFDckQsSUFBSSxDQUFDLENBQUMsc0JBQXNCLFFBQVEsR0FBRztJQUNyQyxNQUFNLFVBQVUsUUFBUSxHQUFHLENBQUMsRUFBRTtJQUM5QixxQkFBcUIsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVU7SUFDOUMsYUFBYTtFQUNmO0VBQ0EsTUFBTSxnQkFBZ0I7RUFDdEIsY0FBYyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDaEMsY0FBYyxJQUFJLENBQUM7RUFFbkIsSUFBSSxVQUFVLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztFQUM1QyxJQUFJLENBQUMsQ0FBQyxtQkFBbUIsUUFBUSxHQUFHO0lBQ2xDLE1BQU0sVUFBVSxRQUFRLEdBQUcsQ0FBQyxFQUFFO0lBQzlCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPO0lBQ3JDLFVBQVU7RUFDWjtFQUNBLE1BQU0sYUFBYTtFQUNuQixXQUFXLElBQUksQ0FBQztFQUVoQixPQUFPLFVBQVUsQ0FBQyxDQUFDLGNBQWMsRUFBRSxVQUFVO0VBQzdDLE9BQU8sV0FBVyxDQUFDO0lBQUM7SUFBVztJQUFnQjtHQUFTO0VBQ3hELE9BQU8sbUJBQW1CLENBQUM7RUFDM0IsSUFBSSxTQUFTO0lBQ1gsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsVUFBVSxFQUFFLENBQUM7RUFDdEQ7RUFFQSxJQUFJLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxlQUFlLFFBQVEsRUFBRSxLQUFLLFNBQVMsR0FBRztJQUN2RSxNQUFNLE1BQU0sbUJBQW1CLFVBQVU7SUFDekMsTUFBTSxpQkFBaUIsUUFBUSxNQUFNLENBQUMsS0FBSztNQUN6QyxNQUFNLFFBQVEsRUFBRSxDQUFDO01BQ2pCLFNBQVMsUUFBUSxFQUFFLENBQUM7SUFDdEI7SUFDQSxNQUFNLGNBQWMsUUFBUSxRQUFRLENBQUM7SUFDckMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLGFBQWE7RUFDN0M7RUFFQSxPQUFPLE9BQU8sSUFBSSxDQUFDO0lBQUUsa0JBQWtCO0VBQU07QUFDL0M7QUFFQSxtQ0FBbUM7QUFDbkMsT0FBTyxNQUFNLGNBQWMsbUJBQW1CIn0=
// denoCacheMetadata=6488761966430368310,17723149747036717643