// @ts-nocheck: simplify handlers without explicit typings
import { Hono } from "hono";
import { normalize, relative, resolve } from "std/path";
import { getInvoiceByShareToken } from "../controllers/invoices.ts";
import { getSettings } from "../controllers/settings.ts";
import { getCustomerById } from "../controllers/customers.ts";
import { resolveInvoiceRenderLocale } from "../i18n/translations.ts";
import { buildInvoiceHTML, generatePDF } from "../utils/pdf.ts";
import { generateUBLInvoiceXML } from "../utils/ubl.ts"; // legacy direct import (will be removed after deprecation window)
import { generateInvoiceXML, listXMLProfiles } from "../utils/xmlProfiles.ts";
import { resolveInDataRoot } from "../utils/dataPaths.ts";
import { contentTypeFromLogoPath, normalizeStoredLogoReference, resolveLogoFsPathFromPublicPath } from "../utils/logoStorage.ts";
const publicRoutes = new Hono();
function isSafeTemplateIdentifier(value) {
  return /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(value);
}
// Expose a lightweight public endpoint so unauthenticated clients can
// detect whether the backend is running in demo (read-only) mode.
const DEMO_MODE = (Deno.env.get("DEMO_MODE") || "").toLowerCase() === "true";
const DEMO_RESET_HOURS = parseFloat(Deno.env.get("DEMO_RESET_HOURS") || "0.5");
publicRoutes.get("/demo-mode", (c)=>{
  // Janky function I wrote at night. 0.5 -> 30 min is the main idea
  if (DEMO_MODE == true) {
    const resetMinutes = DEMO_RESET_HOURS * 60;
    return c.json({
      demoMode: DEMO_MODE,
      demoResetMinutes: resetMinutes
    });
  } else {
    return c.json({
      demoMode: DEMO_MODE
    });
  }
});
publicRoutes.get("/public/assets/logos/:file", async (c)=>{
  const file = c.req.param("file") || "";
  const fsPath = resolveLogoFsPathFromPublicPath(`/public/assets/logos/${file}`);
  if (!fsPath) return c.notFound();
  try {
    const bytes = await Deno.readFile(fsPath);
    return new Response(bytes, {
      headers: {
        "content-type": contentTypeFromLogoPath(fsPath),
        "cache-control": "public, max-age=31536000, immutable"
      }
    });
  } catch  {
    return c.notFound();
  }
});
// Serve stored template files (fonts, html) for installed templates
publicRoutes.get("/_template-assets/:id/:version/*", async (c)=>{
  const { id, version } = c.req.param();
  if (!isSafeTemplateIdentifier(id) || !isSafeTemplateIdentifier(version)) {
    return c.notFound();
  }
  const rest = c.req.param("*") || "";
  const normalizedRest = normalize(rest.replaceAll("\\", "/"));
  if (!normalizedRest || normalizedRest.startsWith("..")) {
    return c.notFound();
  }
  const baseDir = resolveInDataRoot("templates");
  const candidate = resolve(baseDir, id, version, normalizedRest);
  const relativePath = relative(baseDir, candidate);
  if (!relativePath || relativePath.startsWith("..")) {
    return c.notFound();
  }
  try {
    const bytes = await Deno.readFile(candidate);
    return new Response(bytes);
  } catch  {
    return c.notFound();
  }
});
publicRoutes.get("/public/invoices/:share_token", async (c)=>{
  const shareToken = c.req.param("share_token");
  const invoice = await getInvoiceByShareToken(shareToken);
  if (!invoice) {
    return c.json({
      message: "Invoice not found"
    }, 404);
  }
  return c.json(invoice);
});
publicRoutes.get("/public/invoices/:share_token/pdf", async (c)=>{
  const shareToken = c.req.param("share_token");
  const invoice = await getInvoiceByShareToken(shareToken);
  if (!invoice) {
    return c.json({
      message: "Invoice not found"
    }, 404);
  }
  // Settings map
  const settings = getSettings();
  const settingsMap = settings.reduce((acc, s)=>{
    acc[s.key] = s.value;
    return acc;
  }, {});
  if (!settingsMap.postalCityFormat && settingsMap.postal_city_format) {
    settingsMap.postalCityFormat = settingsMap.postal_city_format;
  }
  if (!settingsMap.postalCityFormat && settingsMap.postalcityformat) {
    settingsMap.postalCityFormat = settingsMap.postalcityformat;
  }
  if (!settingsMap.logo && settingsMap.logoUrl) {
    settingsMap.logo = settingsMap.logoUrl;
  }
  if (typeof settingsMap.logo === "string") {
    settingsMap.logo = normalizeStoredLogoReference(settingsMap.logo);
  }
  // Construct BusinessSettings with sane defaults; unified single 'logo' field
  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyCity: settingsMap.companyCity || "",
    companyPostalCode: settingsMap.companyPostalCode || "",
    companyCountryCode: settingsMap.companyCountryCode || settingsMap.countryCode || "",
    postalCityFormat: settingsMap.postalCityFormat || "auto",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
    currency: settingsMap.currency || "USD",
    taxLabel: settingsMap.taxLabel || undefined,
    logo: settingsMap.logo,
    paymentMethods: settingsMap.paymentMethods || "Bank Transfer",
    bankAccount: settingsMap.bankAccount || "",
    paymentTerms: settingsMap.paymentTerms || "Due in 30 days",
    defaultNotes: settingsMap.defaultNotes || "",
    locale: settingsMap.locale || undefined
  };
  // Use template/highlight from settings only (no query overrides)
  const highlight = settingsMap.highlight ?? undefined;
  let selectedTemplateId = settingsMap.templateId?.toLowerCase();
  if (selectedTemplateId === "professional" || selectedTemplateId === "professional-modern") {
    selectedTemplateId = "professional-modern";
  } else if (selectedTemplateId === "minimalist" || selectedTemplateId === "minimalist-clean") {
    selectedTemplateId = "minimalist-clean";
  }
  try {
    const embedXml = String(settingsMap.embedXmlInPdf || "false").toLowerCase() === "true";
    const xmlProfileId = settingsMap.xmlProfileId || "ubl21";
    const customer = getCustomerById(invoice.customerId);
    const renderLocale = resolveInvoiceRenderLocale(invoice.locale, customer?.countryCode, settingsMap.invoiceFallbackLocale, settingsMap.locale);
    const pdfBuffer = await generatePDF(invoice, businessSettings, selectedTemplateId, highlight, {
      embedXml,
      embedXmlProfileId: xmlProfileId,
      dateFormat: settingsMap.dateFormat,
      numberFormat: settingsMap.numberFormat,
      locale: renderLocale
    });
    // Detect embedded attachments for diagnostics
    let hasAttachment = false;
    let attachmentNames = [];
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(pdfBuffer);
      const maybe = doc.getAttachments?.();
      if (maybe && typeof maybe === "object") {
        attachmentNames = Object.keys(maybe);
        hasAttachment = attachmentNames.length > 0;
      }
    } catch (_e) {
    /* ignore */ }
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber || shareToken}.pdf"`,
        "X-Robots-Tag": "noindex",
        ...hasAttachment ? {
          "X-Embedded-XML": "true",
          "X-Embedded-XML-Names": attachmentNames.join(",")
        } : {
          "X-Embedded-XML": "false"
        }
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("/public/invoices/:share_token/pdf failed:", msg);
    return c.json({
      error: "Failed to generate PDF",
      details: msg
    }, 500);
  }
});
// Return invoice as HTML (same options as PDF, but no PDF generation)
publicRoutes.get("/public/invoices/:share_token/html", async (c)=>{
  const shareToken = c.req.param("share_token");
  const invoice = await getInvoiceByShareToken(shareToken);
  if (!invoice) {
    return c.json({
      message: "Invoice not found"
    }, 404);
  }
  const settings = getSettings();
  const settingsMap = settings.reduce((acc, s)=>{
    acc[s.key] = s.value;
    return acc;
  }, {});
  if (!settingsMap.postalCityFormat && settingsMap.postal_city_format) {
    settingsMap.postalCityFormat = settingsMap.postal_city_format;
  }
  if (!settingsMap.postalCityFormat && settingsMap.postalcityformat) {
    settingsMap.postalCityFormat = settingsMap.postalcityformat;
  }
  if (!settingsMap.logo && settingsMap.logoUrl) {
    settingsMap.logo = settingsMap.logoUrl;
  }
  if (typeof settingsMap.logo === "string") {
    settingsMap.logo = normalizeStoredLogoReference(settingsMap.logo);
  }
  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyCity: settingsMap.companyCity || "",
    companyPostalCode: settingsMap.companyPostalCode || "",
    companyCountryCode: settingsMap.companyCountryCode || settingsMap.countryCode || "",
    postalCityFormat: settingsMap.postalCityFormat || "auto",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
    currency: settingsMap.currency || "USD",
    taxLabel: settingsMap.taxLabel || undefined,
    logo: settingsMap.logo,
    paymentMethods: settingsMap.paymentMethods || "Bank Transfer",
    bankAccount: settingsMap.bankAccount || "",
    paymentTerms: settingsMap.paymentTerms || "Due in 30 days",
    defaultNotes: settingsMap.defaultNotes || "",
    locale: settingsMap.locale || undefined
  };
  // Use template/highlight from settings only (no query overrides)
  const highlight = settingsMap.highlight ?? undefined;
  let selectedTemplateId = settingsMap.templateId?.toLowerCase();
  if (selectedTemplateId === "professional" || selectedTemplateId === "professional-modern") {
    selectedTemplateId = "professional-modern";
  } else if (selectedTemplateId === "minimalist" || selectedTemplateId === "minimalist-clean") {
    selectedTemplateId = "minimalist-clean";
  }
  const customer = getCustomerById(invoice.customerId);
  const renderLocale = resolveInvoiceRenderLocale(invoice.locale, customer?.countryCode, settingsMap.invoiceFallbackLocale, settingsMap.locale);
  const html = buildInvoiceHTML(invoice, businessSettings, selectedTemplateId, highlight, settingsMap.dateFormat, settingsMap.numberFormat, renderLocale);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "X-Frame-Options": "SAMEORIGIN"
    }
  });
});
// Return invoice as UBL (PEPPOL BIS Billing 3.0) XML
publicRoutes.get("/public/invoices/:share_token/ubl.xml", async (c)=>{
  const shareToken = c.req.param("share_token");
  const invoice = await getInvoiceByShareToken(shareToken);
  if (!invoice) {
    return c.json({
      message: "Invoice not found"
    }, 404);
  }
  const settings = getSettings();
  const settingsMap = settings.reduce((acc, s)=>{
    acc[s.key] = s.value;
    return acc;
  }, {});
  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyCity: settingsMap.companyCity || "",
    companyPostalCode: settingsMap.companyPostalCode || "",
    companyCountryCode: settingsMap.companyCountryCode || "",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
    currency: settingsMap.currency || "USD",
    taxLabel: settingsMap.taxLabel || undefined,
    logo: settingsMap.logo,
    paymentMethods: settingsMap.paymentMethods || "Bank Transfer",
    bankAccount: settingsMap.bankAccount || "",
    paymentTerms: settingsMap.paymentTerms || "Due in 30 days",
    defaultNotes: settingsMap.defaultNotes || ""
  };
  const xml = generateUBLInvoiceXML(invoice, businessSettings, {
    sellerEndpointId: settingsMap.peppolSellerEndpointId,
    sellerEndpointSchemeId: settingsMap.peppolSellerEndpointSchemeId,
    buyerEndpointId: settingsMap.peppolBuyerEndpointId,
    buyerEndpointSchemeId: settingsMap.peppolBuyerEndpointSchemeId,
    sellerCountryCode: settingsMap.companyCountryCode,
    buyerCountryCode: invoice.customer.countryCode
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber || shareToken}.xml"`,
      "X-Robots-Tag": "noindex"
    }
  });
});
// Generic XML export endpoint selecting a profile (built-in only for now)
// Query param: ?profile=ubl21 (default)
publicRoutes.get("/public/invoices/:share_token/xml", async (c)=>{
  const shareToken = c.req.param("share_token");
  const invoice = await getInvoiceByShareToken(shareToken);
  if (!invoice) return c.json({
    message: "Invoice not found"
  }, 404);
  const settings = getSettings();
  const settingsMap = settings.reduce((acc, s)=>{
    acc[s.key] = s.value;
    return acc;
  }, {});
  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
    currency: settingsMap.currency || "USD",
    taxLabel: settingsMap.taxLabel || undefined,
    logo: settingsMap.logo,
    paymentMethods: settingsMap.paymentMethods || "Bank Transfer",
    bankAccount: settingsMap.bankAccount || "",
    paymentTerms: settingsMap.paymentTerms || "Due in 30 days",
    defaultNotes: settingsMap.defaultNotes || "",
    companyCountryCode: settingsMap.companyCountryCode || ""
  };
  const url = new URL(c.req.url);
  const profileParam = url.searchParams.get("profile") || settingsMap.xmlProfileId || undefined;
  const { xml, profile } = generateInvoiceXML(profileParam, invoice, businessSettings, {
    sellerEndpointId: settingsMap.peppolSellerEndpointId,
    sellerEndpointSchemeId: settingsMap.peppolSellerEndpointSchemeId,
    buyerEndpointId: settingsMap.peppolBuyerEndpointId,
    buyerEndpointSchemeId: settingsMap.peppolBuyerEndpointSchemeId,
    sellerCountryCode: settingsMap.companyCountryCode,
    buyerCountryCode: invoice.customer.countryCode
  });
  return new Response(xml, {
    headers: {
      "Content-Type": `${profile.mediaType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber || shareToken}.${profile.fileExtension}"`,
      "X-Robots-Tag": "noindex"
    }
  });
});
// List available built-in XML profiles (public; could also require auth, but contents are non-sensitive)
publicRoutes.get("/public/xml-profiles", (c)=>{
  const profiles = listXMLProfiles().map((p)=>({
      id: p.id,
      name: p.name,
      mediaType: p.mediaType,
      fileExtension: p.fileExtension,
      experimental: !!p.experimental,
      builtIn: true
    }));
  return c.json(profiles);
});
export { publicRoutes };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL3JvdXRlcy9wdWJsaWMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLW5vY2hlY2s6IHNpbXBsaWZ5IGhhbmRsZXJzIHdpdGhvdXQgZXhwbGljaXQgdHlwaW5nc1xuaW1wb3J0IHsgSG9ubyB9IGZyb20gXCJob25vXCI7XG5pbXBvcnQgeyBub3JtYWxpemUsIHJlbGF0aXZlLCByZXNvbHZlIH0gZnJvbSBcInN0ZC9wYXRoXCI7XG5pbXBvcnQgeyBnZXRJbnZvaWNlQnlTaGFyZVRva2VuIH0gZnJvbSBcIi4uL2NvbnRyb2xsZXJzL2ludm9pY2VzLnRzXCI7XG5pbXBvcnQgeyBnZXRTZXR0aW5ncyB9IGZyb20gXCIuLi9jb250cm9sbGVycy9zZXR0aW5ncy50c1wiO1xuaW1wb3J0IHsgZ2V0Q3VzdG9tZXJCeUlkIH0gZnJvbSBcIi4uL2NvbnRyb2xsZXJzL2N1c3RvbWVycy50c1wiO1xuaW1wb3J0IHsgcmVzb2x2ZUludm9pY2VSZW5kZXJMb2NhbGUgfSBmcm9tIFwiLi4vaTE4bi90cmFuc2xhdGlvbnMudHNcIjtcbmltcG9ydCB7IGJ1aWxkSW52b2ljZUhUTUwsIGdlbmVyYXRlUERGIH0gZnJvbSBcIi4uL3V0aWxzL3BkZi50c1wiO1xuaW1wb3J0IHsgZ2VuZXJhdGVVQkxJbnZvaWNlWE1MIH0gZnJvbSBcIi4uL3V0aWxzL3VibC50c1wiOyAvLyBsZWdhY3kgZGlyZWN0IGltcG9ydCAod2lsbCBiZSByZW1vdmVkIGFmdGVyIGRlcHJlY2F0aW9uIHdpbmRvdylcbmltcG9ydCB7IGdlbmVyYXRlSW52b2ljZVhNTCwgbGlzdFhNTFByb2ZpbGVzIH0gZnJvbSBcIi4uL3V0aWxzL3htbFByb2ZpbGVzLnRzXCI7XG5pbXBvcnQgeyByZXNvbHZlSW5EYXRhUm9vdCB9IGZyb20gXCIuLi91dGlscy9kYXRhUGF0aHMudHNcIjtcbmltcG9ydCB7XG4gIGNvbnRlbnRUeXBlRnJvbUxvZ29QYXRoLFxuICBub3JtYWxpemVTdG9yZWRMb2dvUmVmZXJlbmNlLFxuICByZXNvbHZlTG9nb0ZzUGF0aEZyb21QdWJsaWNQYXRoLFxufSBmcm9tIFwiLi4vdXRpbHMvbG9nb1N0b3JhZ2UudHNcIjtcblxuY29uc3QgcHVibGljUm91dGVzID0gbmV3IEhvbm8oKTtcblxuZnVuY3Rpb24gaXNTYWZlVGVtcGxhdGVJZGVudGlmaWVyKHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIC9eW2EtejAtOV1bYS16MC05Ll8tXXswLDYzfSQvaS50ZXN0KHZhbHVlKTtcbn1cblxuLy8gRXhwb3NlIGEgbGlnaHR3ZWlnaHQgcHVibGljIGVuZHBvaW50IHNvIHVuYXV0aGVudGljYXRlZCBjbGllbnRzIGNhblxuLy8gZGV0ZWN0IHdoZXRoZXIgdGhlIGJhY2tlbmQgaXMgcnVubmluZyBpbiBkZW1vIChyZWFkLW9ubHkpIG1vZGUuXG5jb25zdCBERU1PX01PREUgPSAoRGVuby5lbnYuZ2V0KFwiREVNT19NT0RFXCIpIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCkgPT09IFwidHJ1ZVwiO1xuY29uc3QgREVNT19SRVNFVF9IT1VSUyA9IHBhcnNlRmxvYXQoRGVuby5lbnYuZ2V0KFwiREVNT19SRVNFVF9IT1VSU1wiKSB8fCBcIjAuNVwiKTtcblxucHVibGljUm91dGVzLmdldChcIi9kZW1vLW1vZGVcIiwgKGMpID0+IHtcbiAgLy8gSmFua3kgZnVuY3Rpb24gSSB3cm90ZSBhdCBuaWdodC4gMC41IC0+IDMwIG1pbiBpcyB0aGUgbWFpbiBpZGVhXG4gIGlmIChERU1PX01PREUgPT0gdHJ1ZSkge1xuICAgIGNvbnN0IHJlc2V0TWludXRlcyA9IERFTU9fUkVTRVRfSE9VUlMgKiA2MDtcbiAgICByZXR1cm4gYy5qc29uKHtcbiAgICAgIGRlbW9Nb2RlOiBERU1PX01PREUsXG4gICAgICBkZW1vUmVzZXRNaW51dGVzOiByZXNldE1pbnV0ZXMsXG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGMuanNvbih7IGRlbW9Nb2RlOiBERU1PX01PREUgfSk7XG4gIH1cbn0pO1xuXG5wdWJsaWNSb3V0ZXMuZ2V0KFwiL3B1YmxpYy9hc3NldHMvbG9nb3MvOmZpbGVcIiwgYXN5bmMgKGMpID0+IHtcbiAgY29uc3QgZmlsZSA9IGMucmVxLnBhcmFtKFwiZmlsZVwiKSB8fCBcIlwiO1xuICBjb25zdCBmc1BhdGggPSByZXNvbHZlTG9nb0ZzUGF0aEZyb21QdWJsaWNQYXRoKFxuICAgIGAvcHVibGljL2Fzc2V0cy9sb2dvcy8ke2ZpbGV9YCxcbiAgKTtcbiAgaWYgKCFmc1BhdGgpIHJldHVybiBjLm5vdEZvdW5kKCk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBieXRlcyA9IGF3YWl0IERlbm8ucmVhZEZpbGUoZnNQYXRoKTtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKGJ5dGVzLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiY29udGVudC10eXBlXCI6IGNvbnRlbnRUeXBlRnJvbUxvZ29QYXRoKGZzUGF0aCksXG4gICAgICAgIFwiY2FjaGUtY29udHJvbFwiOiBcInB1YmxpYywgbWF4LWFnZT0zMTUzNjAwMCwgaW1tdXRhYmxlXCIsXG4gICAgICB9LFxuICAgIH0pO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gYy5ub3RGb3VuZCgpO1xuICB9XG59KTtcblxuLy8gU2VydmUgc3RvcmVkIHRlbXBsYXRlIGZpbGVzIChmb250cywgaHRtbCkgZm9yIGluc3RhbGxlZCB0ZW1wbGF0ZXNcbnB1YmxpY1JvdXRlcy5nZXQoXCIvX3RlbXBsYXRlLWFzc2V0cy86aWQvOnZlcnNpb24vKlwiLCBhc3luYyAoYykgPT4ge1xuICBjb25zdCB7IGlkLCB2ZXJzaW9uIH0gPSBjLnJlcS5wYXJhbSgpO1xuICBpZiAoIWlzU2FmZVRlbXBsYXRlSWRlbnRpZmllcihpZCkgfHwgIWlzU2FmZVRlbXBsYXRlSWRlbnRpZmllcih2ZXJzaW9uKSkge1xuICAgIHJldHVybiBjLm5vdEZvdW5kKCk7XG4gIH1cbiAgY29uc3QgcmVzdCA9IGMucmVxLnBhcmFtKFwiKlwiKSB8fCBcIlwiO1xuICBjb25zdCBub3JtYWxpemVkUmVzdCA9IG5vcm1hbGl6ZShyZXN0LnJlcGxhY2VBbGwoXCJcXFxcXCIsIFwiL1wiKSk7XG4gIGlmICghbm9ybWFsaXplZFJlc3QgfHwgbm9ybWFsaXplZFJlc3Quc3RhcnRzV2l0aChcIi4uXCIpKSB7XG4gICAgcmV0dXJuIGMubm90Rm91bmQoKTtcbiAgfVxuXG4gIGNvbnN0IGJhc2VEaXIgPSByZXNvbHZlSW5EYXRhUm9vdChcInRlbXBsYXRlc1wiKTtcbiAgY29uc3QgY2FuZGlkYXRlID0gcmVzb2x2ZShiYXNlRGlyLCBpZCwgdmVyc2lvbiwgbm9ybWFsaXplZFJlc3QpO1xuICBjb25zdCByZWxhdGl2ZVBhdGggPSByZWxhdGl2ZShiYXNlRGlyLCBjYW5kaWRhdGUpO1xuICBpZiAoIXJlbGF0aXZlUGF0aCB8fCByZWxhdGl2ZVBhdGguc3RhcnRzV2l0aChcIi4uXCIpKSB7XG4gICAgcmV0dXJuIGMubm90Rm91bmQoKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgYnl0ZXMgPSBhd2FpdCBEZW5vLnJlYWRGaWxlKGNhbmRpZGF0ZSk7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShieXRlcyk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBjLm5vdEZvdW5kKCk7XG4gIH1cbn0pO1xuXG5wdWJsaWNSb3V0ZXMuZ2V0KFwiL3B1YmxpYy9pbnZvaWNlcy86c2hhcmVfdG9rZW5cIiwgYXN5bmMgKGMpID0+IHtcbiAgY29uc3Qgc2hhcmVUb2tlbiA9IGMucmVxLnBhcmFtKFwic2hhcmVfdG9rZW5cIik7XG4gIGNvbnN0IGludm9pY2UgPSBhd2FpdCBnZXRJbnZvaWNlQnlTaGFyZVRva2VuKHNoYXJlVG9rZW4pO1xuXG4gIGlmICghaW52b2ljZSkge1xuICAgIHJldHVybiBjLmpzb24oeyBtZXNzYWdlOiBcIkludm9pY2Ugbm90IGZvdW5kXCIgfSwgNDA0KTtcbiAgfVxuXG4gIHJldHVybiBjLmpzb24oaW52b2ljZSk7XG59KTtcblxucHVibGljUm91dGVzLmdldChcIi9wdWJsaWMvaW52b2ljZXMvOnNoYXJlX3Rva2VuL3BkZlwiLCBhc3luYyAoYykgPT4ge1xuICBjb25zdCBzaGFyZVRva2VuID0gYy5yZXEucGFyYW0oXCJzaGFyZV90b2tlblwiKTtcbiAgY29uc3QgaW52b2ljZSA9IGF3YWl0IGdldEludm9pY2VCeVNoYXJlVG9rZW4oc2hhcmVUb2tlbik7XG4gIGlmICghaW52b2ljZSkge1xuICAgIHJldHVybiBjLmpzb24oeyBtZXNzYWdlOiBcIkludm9pY2Ugbm90IGZvdW5kXCIgfSwgNDA0KTtcbiAgfVxuXG4gIC8vIFNldHRpbmdzIG1hcFxuICBjb25zdCBzZXR0aW5ncyA9IGdldFNldHRpbmdzKCk7XG4gIGNvbnN0IHNldHRpbmdzTWFwID0gc2V0dGluZ3MucmVkdWNlKFxuICAgIChhY2M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIHMpID0+IHtcbiAgICAgIGFjY1tzLmtleV0gPSBzLnZhbHVlO1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LFxuICAgIHt9IGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4gICk7XG4gIGlmICghc2V0dGluZ3NNYXAucG9zdGFsQ2l0eUZvcm1hdCAmJiBzZXR0aW5nc01hcC5wb3N0YWxfY2l0eV9mb3JtYXQpIHtcbiAgICBzZXR0aW5nc01hcC5wb3N0YWxDaXR5Rm9ybWF0ID0gc2V0dGluZ3NNYXAucG9zdGFsX2NpdHlfZm9ybWF0O1xuICB9XG4gIGlmICghc2V0dGluZ3NNYXAucG9zdGFsQ2l0eUZvcm1hdCAmJiBzZXR0aW5nc01hcC5wb3N0YWxjaXR5Zm9ybWF0KSB7XG4gICAgc2V0dGluZ3NNYXAucG9zdGFsQ2l0eUZvcm1hdCA9IHNldHRpbmdzTWFwLnBvc3RhbGNpdHlmb3JtYXQ7XG4gIH1cbiAgaWYgKCFzZXR0aW5nc01hcC5sb2dvICYmIHNldHRpbmdzTWFwLmxvZ29VcmwpIHtcbiAgICBzZXR0aW5nc01hcC5sb2dvID0gc2V0dGluZ3NNYXAubG9nb1VybCBhcyBzdHJpbmc7XG4gIH1cbiAgaWYgKHR5cGVvZiBzZXR0aW5nc01hcC5sb2dvID09PSBcInN0cmluZ1wiKSB7XG4gICAgc2V0dGluZ3NNYXAubG9nbyA9IG5vcm1hbGl6ZVN0b3JlZExvZ29SZWZlcmVuY2Uoc2V0dGluZ3NNYXAubG9nbyk7XG4gIH1cblxuICAvLyBDb25zdHJ1Y3QgQnVzaW5lc3NTZXR0aW5ncyB3aXRoIHNhbmUgZGVmYXVsdHM7IHVuaWZpZWQgc2luZ2xlICdsb2dvJyBmaWVsZFxuICBjb25zdCBidXNpbmVzc1NldHRpbmdzID0ge1xuICAgIGNvbXBhbnlOYW1lOiBzZXR0aW5nc01hcC5jb21wYW55TmFtZSB8fCBcIllvdXIgQ29tcGFueVwiLFxuICAgIGNvbXBhbnlBZGRyZXNzOiBzZXR0aW5nc01hcC5jb21wYW55QWRkcmVzcyB8fCBcIlwiLFxuICAgIGNvbXBhbnlDaXR5OiBzZXR0aW5nc01hcC5jb21wYW55Q2l0eSB8fCBcIlwiLFxuICAgIGNvbXBhbnlQb3N0YWxDb2RlOiBzZXR0aW5nc01hcC5jb21wYW55UG9zdGFsQ29kZSB8fCBcIlwiLFxuICAgIGNvbXBhbnlDb3VudHJ5Q29kZTogc2V0dGluZ3NNYXAuY29tcGFueUNvdW50cnlDb2RlIHx8XG4gICAgICBzZXR0aW5nc01hcC5jb3VudHJ5Q29kZSB8fCBcIlwiLFxuICAgIHBvc3RhbENpdHlGb3JtYXQ6IHNldHRpbmdzTWFwLnBvc3RhbENpdHlGb3JtYXQgfHwgXCJhdXRvXCIsXG4gICAgY29tcGFueUVtYWlsOiBzZXR0aW5nc01hcC5jb21wYW55RW1haWwgfHwgXCJcIixcbiAgICBjb21wYW55UGhvbmU6IHNldHRpbmdzTWFwLmNvbXBhbnlQaG9uZSB8fCBcIlwiLFxuICAgIGNvbXBhbnlUYXhJZDogc2V0dGluZ3NNYXAuY29tcGFueVRheElkIHx8IFwiXCIsXG4gICAgY3VycmVuY3k6IHNldHRpbmdzTWFwLmN1cnJlbmN5IHx8IFwiVVNEXCIsXG4gICAgdGF4TGFiZWw6IHNldHRpbmdzTWFwLnRheExhYmVsIHx8IHVuZGVmaW5lZCxcbiAgICBsb2dvOiBzZXR0aW5nc01hcC5sb2dvLFxuICAgIHBheW1lbnRNZXRob2RzOiBzZXR0aW5nc01hcC5wYXltZW50TWV0aG9kcyB8fCBcIkJhbmsgVHJhbnNmZXJcIixcbiAgICBiYW5rQWNjb3VudDogc2V0dGluZ3NNYXAuYmFua0FjY291bnQgfHwgXCJcIixcbiAgICBwYXltZW50VGVybXM6IHNldHRpbmdzTWFwLnBheW1lbnRUZXJtcyB8fCBcIkR1ZSBpbiAzMCBkYXlzXCIsXG4gICAgZGVmYXVsdE5vdGVzOiBzZXR0aW5nc01hcC5kZWZhdWx0Tm90ZXMgfHwgXCJcIixcbiAgICBsb2NhbGU6IHNldHRpbmdzTWFwLmxvY2FsZSB8fCB1bmRlZmluZWQsXG4gIH07XG5cbiAgLy8gVXNlIHRlbXBsYXRlL2hpZ2hsaWdodCBmcm9tIHNldHRpbmdzIG9ubHkgKG5vIHF1ZXJ5IG92ZXJyaWRlcylcbiAgY29uc3QgaGlnaGxpZ2h0ID0gc2V0dGluZ3NNYXAuaGlnaGxpZ2h0ID8/IHVuZGVmaW5lZDtcbiAgbGV0IHNlbGVjdGVkVGVtcGxhdGVJZDogc3RyaW5nIHwgdW5kZWZpbmVkID0gc2V0dGluZ3NNYXAudGVtcGxhdGVJZFxuICAgID8udG9Mb3dlckNhc2UoKTtcbiAgaWYgKFxuICAgIHNlbGVjdGVkVGVtcGxhdGVJZCA9PT0gXCJwcm9mZXNzaW9uYWxcIiB8fFxuICAgIHNlbGVjdGVkVGVtcGxhdGVJZCA9PT0gXCJwcm9mZXNzaW9uYWwtbW9kZXJuXCJcbiAgKSB7XG4gICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID0gXCJwcm9mZXNzaW9uYWwtbW9kZXJuXCI7XG4gIH0gZWxzZSBpZiAoXG4gICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID09PSBcIm1pbmltYWxpc3RcIiB8fFxuICAgIHNlbGVjdGVkVGVtcGxhdGVJZCA9PT0gXCJtaW5pbWFsaXN0LWNsZWFuXCJcbiAgKSB7XG4gICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID0gXCJtaW5pbWFsaXN0LWNsZWFuXCI7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IGVtYmVkWG1sID1cbiAgICAgIFN0cmluZyhzZXR0aW5nc01hcC5lbWJlZFhtbEluUGRmIHx8IFwiZmFsc2VcIikudG9Mb3dlckNhc2UoKSA9PT0gXCJ0cnVlXCI7XG4gICAgY29uc3QgeG1sUHJvZmlsZUlkID0gc2V0dGluZ3NNYXAueG1sUHJvZmlsZUlkIHx8IFwidWJsMjFcIjtcbiAgICBjb25zdCBjdXN0b21lciA9IGdldEN1c3RvbWVyQnlJZChpbnZvaWNlLmN1c3RvbWVySWQpO1xuICAgIGNvbnN0IHJlbmRlckxvY2FsZSA9IHJlc29sdmVJbnZvaWNlUmVuZGVyTG9jYWxlKFxuICAgICAgaW52b2ljZS5sb2NhbGUsXG4gICAgICBjdXN0b21lcj8uY291bnRyeUNvZGUsXG4gICAgICBzZXR0aW5nc01hcC5pbnZvaWNlRmFsbGJhY2tMb2NhbGUsXG4gICAgICBzZXR0aW5nc01hcC5sb2NhbGUsXG4gICAgKTtcbiAgICBjb25zdCBwZGZCdWZmZXIgPSBhd2FpdCBnZW5lcmF0ZVBERihcbiAgICAgIGludm9pY2UsXG4gICAgICBidXNpbmVzc1NldHRpbmdzLFxuICAgICAgc2VsZWN0ZWRUZW1wbGF0ZUlkLFxuICAgICAgaGlnaGxpZ2h0LFxuICAgICAge1xuICAgICAgICBlbWJlZFhtbCxcbiAgICAgICAgZW1iZWRYbWxQcm9maWxlSWQ6IHhtbFByb2ZpbGVJZCxcbiAgICAgICAgZGF0ZUZvcm1hdDogc2V0dGluZ3NNYXAuZGF0ZUZvcm1hdCxcbiAgICAgICAgbnVtYmVyRm9ybWF0OiBzZXR0aW5nc01hcC5udW1iZXJGb3JtYXQsXG4gICAgICAgIGxvY2FsZTogcmVuZGVyTG9jYWxlLFxuICAgICAgfSxcbiAgICApO1xuICAgIC8vIERldGVjdCBlbWJlZGRlZCBhdHRhY2htZW50cyBmb3IgZGlhZ25vc3RpY3NcbiAgICBsZXQgaGFzQXR0YWNobWVudCA9IGZhbHNlO1xuICAgIGxldCBhdHRhY2htZW50TmFtZXM6IHN0cmluZ1tdID0gW107XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgUERGRG9jdW1lbnQgfSA9IGF3YWl0IGltcG9ydChcInBkZi1saWJcIik7XG4gICAgICBjb25zdCBkb2MgPSBhd2FpdCBQREZEb2N1bWVudC5sb2FkKHBkZkJ1ZmZlcik7XG4gICAgICBjb25zdCBtYXliZSA9IChcbiAgICAgICAgZG9jIGFzIHVua25vd24gYXMgeyBnZXRBdHRhY2htZW50cz86ICgpID0+IFJlY29yZDxzdHJpbmcsIFVpbnQ4QXJyYXk+IH1cbiAgICAgICkuZ2V0QXR0YWNobWVudHM/LigpO1xuICAgICAgaWYgKG1heWJlICYmIHR5cGVvZiBtYXliZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBhdHRhY2htZW50TmFtZXMgPSBPYmplY3Qua2V5cyhtYXliZSk7XG4gICAgICAgIGhhc0F0dGFjaG1lbnQgPSBhdHRhY2htZW50TmFtZXMubGVuZ3RoID4gMDtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChfZSkge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UocGRmQnVmZmVyLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vcGRmXCIsXG4gICAgICAgIFwiQ29udGVudC1EaXNwb3NpdGlvblwiOiBgYXR0YWNobWVudDsgZmlsZW5hbWU9XCJpbnZvaWNlLSR7XG4gICAgICAgICAgaW52b2ljZS5pbnZvaWNlTnVtYmVyIHx8IHNoYXJlVG9rZW5cbiAgICAgICAgfS5wZGZcImAsXG4gICAgICAgIFwiWC1Sb2JvdHMtVGFnXCI6IFwibm9pbmRleFwiLFxuICAgICAgICAuLi4oaGFzQXR0YWNobWVudFxuICAgICAgICAgID8ge1xuICAgICAgICAgICAgXCJYLUVtYmVkZGVkLVhNTFwiOiBcInRydWVcIixcbiAgICAgICAgICAgIFwiWC1FbWJlZGRlZC1YTUwtTmFtZXNcIjogYXR0YWNobWVudE5hbWVzLmpvaW4oXCIsXCIpLFxuICAgICAgICAgIH1cbiAgICAgICAgICA6IHsgXCJYLUVtYmVkZGVkLVhNTFwiOiBcImZhbHNlXCIgfSksXG4gICAgICB9LFxuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc3QgbXNnID0gZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpO1xuICAgIGNvbnNvbGUuZXJyb3IoXCIvcHVibGljL2ludm9pY2VzLzpzaGFyZV90b2tlbi9wZGYgZmFpbGVkOlwiLCBtc2cpO1xuICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJGYWlsZWQgdG8gZ2VuZXJhdGUgUERGXCIsIGRldGFpbHM6IG1zZyB9LCA1MDApO1xuICB9XG59KTtcblxuLy8gUmV0dXJuIGludm9pY2UgYXMgSFRNTCAoc2FtZSBvcHRpb25zIGFzIFBERiwgYnV0IG5vIFBERiBnZW5lcmF0aW9uKVxucHVibGljUm91dGVzLmdldChcIi9wdWJsaWMvaW52b2ljZXMvOnNoYXJlX3Rva2VuL2h0bWxcIiwgYXN5bmMgKGMpID0+IHtcbiAgY29uc3Qgc2hhcmVUb2tlbiA9IGMucmVxLnBhcmFtKFwic2hhcmVfdG9rZW5cIik7XG4gIGNvbnN0IGludm9pY2UgPSBhd2FpdCBnZXRJbnZvaWNlQnlTaGFyZVRva2VuKHNoYXJlVG9rZW4pO1xuICBpZiAoIWludm9pY2UpIHtcbiAgICByZXR1cm4gYy5qc29uKHsgbWVzc2FnZTogXCJJbnZvaWNlIG5vdCBmb3VuZFwiIH0sIDQwNCk7XG4gIH1cblxuICBjb25zdCBzZXR0aW5ncyA9IGdldFNldHRpbmdzKCk7XG4gIGNvbnN0IHNldHRpbmdzTWFwID0gc2V0dGluZ3MucmVkdWNlKFxuICAgIChhY2M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIHMpID0+IHtcbiAgICAgIGFjY1tzLmtleV0gPSBzLnZhbHVlO1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LFxuICAgIHt9IGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4gICk7XG4gIGlmICghc2V0dGluZ3NNYXAucG9zdGFsQ2l0eUZvcm1hdCAmJiBzZXR0aW5nc01hcC5wb3N0YWxfY2l0eV9mb3JtYXQpIHtcbiAgICBzZXR0aW5nc01hcC5wb3N0YWxDaXR5Rm9ybWF0ID0gc2V0dGluZ3NNYXAucG9zdGFsX2NpdHlfZm9ybWF0O1xuICB9XG4gIGlmICghc2V0dGluZ3NNYXAucG9zdGFsQ2l0eUZvcm1hdCAmJiBzZXR0aW5nc01hcC5wb3N0YWxjaXR5Zm9ybWF0KSB7XG4gICAgc2V0dGluZ3NNYXAucG9zdGFsQ2l0eUZvcm1hdCA9IHNldHRpbmdzTWFwLnBvc3RhbGNpdHlmb3JtYXQ7XG4gIH1cbiAgaWYgKCFzZXR0aW5nc01hcC5sb2dvICYmIHNldHRpbmdzTWFwLmxvZ29VcmwpIHtcbiAgICBzZXR0aW5nc01hcC5sb2dvID0gc2V0dGluZ3NNYXAubG9nb1VybCBhcyBzdHJpbmc7XG4gIH1cbiAgaWYgKHR5cGVvZiBzZXR0aW5nc01hcC5sb2dvID09PSBcInN0cmluZ1wiKSB7XG4gICAgc2V0dGluZ3NNYXAubG9nbyA9IG5vcm1hbGl6ZVN0b3JlZExvZ29SZWZlcmVuY2Uoc2V0dGluZ3NNYXAubG9nbyk7XG4gIH1cblxuICBjb25zdCBidXNpbmVzc1NldHRpbmdzID0ge1xuICAgIGNvbXBhbnlOYW1lOiBzZXR0aW5nc01hcC5jb21wYW55TmFtZSB8fCBcIllvdXIgQ29tcGFueVwiLFxuICAgIGNvbXBhbnlBZGRyZXNzOiBzZXR0aW5nc01hcC5jb21wYW55QWRkcmVzcyB8fCBcIlwiLFxuICAgIGNvbXBhbnlDaXR5OiBzZXR0aW5nc01hcC5jb21wYW55Q2l0eSB8fCBcIlwiLFxuICAgIGNvbXBhbnlQb3N0YWxDb2RlOiBzZXR0aW5nc01hcC5jb21wYW55UG9zdGFsQ29kZSB8fCBcIlwiLFxuICAgIGNvbXBhbnlDb3VudHJ5Q29kZTogc2V0dGluZ3NNYXAuY29tcGFueUNvdW50cnlDb2RlIHx8XG4gICAgICBzZXR0aW5nc01hcC5jb3VudHJ5Q29kZSB8fCBcIlwiLFxuICAgIHBvc3RhbENpdHlGb3JtYXQ6IHNldHRpbmdzTWFwLnBvc3RhbENpdHlGb3JtYXQgfHwgXCJhdXRvXCIsXG4gICAgY29tcGFueUVtYWlsOiBzZXR0aW5nc01hcC5jb21wYW55RW1haWwgfHwgXCJcIixcbiAgICBjb21wYW55UGhvbmU6IHNldHRpbmdzTWFwLmNvbXBhbnlQaG9uZSB8fCBcIlwiLFxuICAgIGNvbXBhbnlUYXhJZDogc2V0dGluZ3NNYXAuY29tcGFueVRheElkIHx8IFwiXCIsXG4gICAgY3VycmVuY3k6IHNldHRpbmdzTWFwLmN1cnJlbmN5IHx8IFwiVVNEXCIsXG4gICAgdGF4TGFiZWw6IHNldHRpbmdzTWFwLnRheExhYmVsIHx8IHVuZGVmaW5lZCxcbiAgICBsb2dvOiBzZXR0aW5nc01hcC5sb2dvLFxuICAgIHBheW1lbnRNZXRob2RzOiBzZXR0aW5nc01hcC5wYXltZW50TWV0aG9kcyB8fCBcIkJhbmsgVHJhbnNmZXJcIixcbiAgICBiYW5rQWNjb3VudDogc2V0dGluZ3NNYXAuYmFua0FjY291bnQgfHwgXCJcIixcbiAgICBwYXltZW50VGVybXM6IHNldHRpbmdzTWFwLnBheW1lbnRUZXJtcyB8fCBcIkR1ZSBpbiAzMCBkYXlzXCIsXG4gICAgZGVmYXVsdE5vdGVzOiBzZXR0aW5nc01hcC5kZWZhdWx0Tm90ZXMgfHwgXCJcIixcbiAgICBsb2NhbGU6IHNldHRpbmdzTWFwLmxvY2FsZSB8fCB1bmRlZmluZWQsXG4gIH07XG5cbiAgLy8gVXNlIHRlbXBsYXRlL2hpZ2hsaWdodCBmcm9tIHNldHRpbmdzIG9ubHkgKG5vIHF1ZXJ5IG92ZXJyaWRlcylcbiAgY29uc3QgaGlnaGxpZ2h0ID0gc2V0dGluZ3NNYXAuaGlnaGxpZ2h0ID8/IHVuZGVmaW5lZDtcbiAgbGV0IHNlbGVjdGVkVGVtcGxhdGVJZDogc3RyaW5nIHwgdW5kZWZpbmVkID0gc2V0dGluZ3NNYXAudGVtcGxhdGVJZFxuICAgID8udG9Mb3dlckNhc2UoKTtcbiAgaWYgKFxuICAgIHNlbGVjdGVkVGVtcGxhdGVJZCA9PT0gXCJwcm9mZXNzaW9uYWxcIiB8fFxuICAgIHNlbGVjdGVkVGVtcGxhdGVJZCA9PT0gXCJwcm9mZXNzaW9uYWwtbW9kZXJuXCJcbiAgKSB7XG4gICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID0gXCJwcm9mZXNzaW9uYWwtbW9kZXJuXCI7XG4gIH0gZWxzZSBpZiAoXG4gICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID09PSBcIm1pbmltYWxpc3RcIiB8fFxuICAgIHNlbGVjdGVkVGVtcGxhdGVJZCA9PT0gXCJtaW5pbWFsaXN0LWNsZWFuXCJcbiAgKSB7XG4gICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID0gXCJtaW5pbWFsaXN0LWNsZWFuXCI7XG4gIH1cblxuICBjb25zdCBjdXN0b21lciA9IGdldEN1c3RvbWVyQnlJZChpbnZvaWNlLmN1c3RvbWVySWQpO1xuICBjb25zdCByZW5kZXJMb2NhbGUgPSByZXNvbHZlSW52b2ljZVJlbmRlckxvY2FsZShcbiAgICBpbnZvaWNlLmxvY2FsZSxcbiAgICBjdXN0b21lcj8uY291bnRyeUNvZGUsXG4gICAgc2V0dGluZ3NNYXAuaW52b2ljZUZhbGxiYWNrTG9jYWxlLFxuICAgIHNldHRpbmdzTWFwLmxvY2FsZSxcbiAgKTtcbiAgY29uc3QgaHRtbCA9IGJ1aWxkSW52b2ljZUhUTUwoXG4gICAgaW52b2ljZSxcbiAgICBidXNpbmVzc1NldHRpbmdzLFxuICAgIHNlbGVjdGVkVGVtcGxhdGVJZCxcbiAgICBoaWdobGlnaHQsXG4gICAgc2V0dGluZ3NNYXAuZGF0ZUZvcm1hdCxcbiAgICBzZXR0aW5nc01hcC5udW1iZXJGb3JtYXQsXG4gICAgcmVuZGVyTG9jYWxlLFxuICApO1xuICByZXR1cm4gbmV3IFJlc3BvbnNlKGh0bWwsIHtcbiAgICBoZWFkZXJzOiB7XG4gICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvaHRtbDsgY2hhcnNldD11dGYtOFwiLFxuICAgICAgXCJDYWNoZS1Db250cm9sXCI6IFwibm8tc3RvcmVcIixcbiAgICAgIFwiWC1Sb2JvdHMtVGFnXCI6IFwibm9pbmRleFwiLFxuICAgICAgXCJYLUZyYW1lLU9wdGlvbnNcIjogXCJTQU1FT1JJR0lOXCIsXG4gICAgfSxcbiAgfSk7XG59KTtcblxuLy8gUmV0dXJuIGludm9pY2UgYXMgVUJMIChQRVBQT0wgQklTIEJpbGxpbmcgMy4wKSBYTUxcbnB1YmxpY1JvdXRlcy5nZXQoXCIvcHVibGljL2ludm9pY2VzLzpzaGFyZV90b2tlbi91YmwueG1sXCIsIGFzeW5jIChjKSA9PiB7XG4gIGNvbnN0IHNoYXJlVG9rZW4gPSBjLnJlcS5wYXJhbShcInNoYXJlX3Rva2VuXCIpO1xuICBjb25zdCBpbnZvaWNlID0gYXdhaXQgZ2V0SW52b2ljZUJ5U2hhcmVUb2tlbihzaGFyZVRva2VuKTtcbiAgaWYgKCFpbnZvaWNlKSB7XG4gICAgcmV0dXJuIGMuanNvbih7IG1lc3NhZ2U6IFwiSW52b2ljZSBub3QgZm91bmRcIiB9LCA0MDQpO1xuICB9XG5cbiAgY29uc3Qgc2V0dGluZ3MgPSBnZXRTZXR0aW5ncygpO1xuICBjb25zdCBzZXR0aW5nc01hcCA9IHNldHRpbmdzLnJlZHVjZShcbiAgICAoYWNjOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LCBzKSA9PiB7XG4gICAgICBhY2Nbcy5rZXldID0gcy52YWx1ZTtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSxcbiAgICB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuICApO1xuXG4gIGNvbnN0IGJ1c2luZXNzU2V0dGluZ3MgPSB7XG4gICAgY29tcGFueU5hbWU6IHNldHRpbmdzTWFwLmNvbXBhbnlOYW1lIHx8IFwiWW91ciBDb21wYW55XCIsXG4gICAgY29tcGFueUFkZHJlc3M6IHNldHRpbmdzTWFwLmNvbXBhbnlBZGRyZXNzIHx8IFwiXCIsXG4gICAgY29tcGFueUNpdHk6IHNldHRpbmdzTWFwLmNvbXBhbnlDaXR5IHx8IFwiXCIsXG4gICAgY29tcGFueVBvc3RhbENvZGU6IHNldHRpbmdzTWFwLmNvbXBhbnlQb3N0YWxDb2RlIHx8IFwiXCIsXG4gICAgY29tcGFueUNvdW50cnlDb2RlOiBzZXR0aW5nc01hcC5jb21wYW55Q291bnRyeUNvZGUgfHwgXCJcIixcbiAgICBjb21wYW55RW1haWw6IHNldHRpbmdzTWFwLmNvbXBhbnlFbWFpbCB8fCBcIlwiLFxuICAgIGNvbXBhbnlQaG9uZTogc2V0dGluZ3NNYXAuY29tcGFueVBob25lIHx8IFwiXCIsXG4gICAgY29tcGFueVRheElkOiBzZXR0aW5nc01hcC5jb21wYW55VGF4SWQgfHwgXCJcIixcbiAgICBjdXJyZW5jeTogc2V0dGluZ3NNYXAuY3VycmVuY3kgfHwgXCJVU0RcIixcbiAgICB0YXhMYWJlbDogc2V0dGluZ3NNYXAudGF4TGFiZWwgfHwgdW5kZWZpbmVkLFxuICAgIGxvZ286IHNldHRpbmdzTWFwLmxvZ28sXG4gICAgcGF5bWVudE1ldGhvZHM6IHNldHRpbmdzTWFwLnBheW1lbnRNZXRob2RzIHx8IFwiQmFuayBUcmFuc2ZlclwiLFxuICAgIGJhbmtBY2NvdW50OiBzZXR0aW5nc01hcC5iYW5rQWNjb3VudCB8fCBcIlwiLFxuICAgIHBheW1lbnRUZXJtczogc2V0dGluZ3NNYXAucGF5bWVudFRlcm1zIHx8IFwiRHVlIGluIDMwIGRheXNcIixcbiAgICBkZWZhdWx0Tm90ZXM6IHNldHRpbmdzTWFwLmRlZmF1bHROb3RlcyB8fCBcIlwiLFxuICB9O1xuXG4gIGNvbnN0IHhtbCA9IGdlbmVyYXRlVUJMSW52b2ljZVhNTChpbnZvaWNlLCBidXNpbmVzc1NldHRpbmdzLCB7XG4gICAgc2VsbGVyRW5kcG9pbnRJZDogc2V0dGluZ3NNYXAucGVwcG9sU2VsbGVyRW5kcG9pbnRJZCxcbiAgICBzZWxsZXJFbmRwb2ludFNjaGVtZUlkOiBzZXR0aW5nc01hcC5wZXBwb2xTZWxsZXJFbmRwb2ludFNjaGVtZUlkLFxuICAgIGJ1eWVyRW5kcG9pbnRJZDogc2V0dGluZ3NNYXAucGVwcG9sQnV5ZXJFbmRwb2ludElkLFxuICAgIGJ1eWVyRW5kcG9pbnRTY2hlbWVJZDogc2V0dGluZ3NNYXAucGVwcG9sQnV5ZXJFbmRwb2ludFNjaGVtZUlkLFxuICAgIHNlbGxlckNvdW50cnlDb2RlOiBzZXR0aW5nc01hcC5jb21wYW55Q291bnRyeUNvZGUsXG4gICAgYnV5ZXJDb3VudHJ5Q29kZTogaW52b2ljZS5jdXN0b21lci5jb3VudHJ5Q29kZSxcbiAgfSk7XG5cbiAgcmV0dXJuIG5ldyBSZXNwb25zZSh4bWwsIHtcbiAgICBoZWFkZXJzOiB7XG4gICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL3htbDsgY2hhcnNldD11dGYtOFwiLFxuICAgICAgXCJDb250ZW50LURpc3Bvc2l0aW9uXCI6IGBhdHRhY2htZW50OyBmaWxlbmFtZT1cImludm9pY2UtJHtcbiAgICAgICAgaW52b2ljZS5pbnZvaWNlTnVtYmVyIHx8IHNoYXJlVG9rZW5cbiAgICAgIH0ueG1sXCJgLFxuICAgICAgXCJYLVJvYm90cy1UYWdcIjogXCJub2luZGV4XCIsXG4gICAgfSxcbiAgfSk7XG59KTtcblxuLy8gR2VuZXJpYyBYTUwgZXhwb3J0IGVuZHBvaW50IHNlbGVjdGluZyBhIHByb2ZpbGUgKGJ1aWx0LWluIG9ubHkgZm9yIG5vdylcbi8vIFF1ZXJ5IHBhcmFtOiA/cHJvZmlsZT11YmwyMSAoZGVmYXVsdClcbnB1YmxpY1JvdXRlcy5nZXQoXCIvcHVibGljL2ludm9pY2VzLzpzaGFyZV90b2tlbi94bWxcIiwgYXN5bmMgKGMpID0+IHtcbiAgY29uc3Qgc2hhcmVUb2tlbiA9IGMucmVxLnBhcmFtKFwic2hhcmVfdG9rZW5cIik7XG4gIGNvbnN0IGludm9pY2UgPSBhd2FpdCBnZXRJbnZvaWNlQnlTaGFyZVRva2VuKHNoYXJlVG9rZW4pO1xuICBpZiAoIWludm9pY2UpIHJldHVybiBjLmpzb24oeyBtZXNzYWdlOiBcIkludm9pY2Ugbm90IGZvdW5kXCIgfSwgNDA0KTtcblxuICBjb25zdCBzZXR0aW5ncyA9IGdldFNldHRpbmdzKCk7XG4gIGNvbnN0IHNldHRpbmdzTWFwID0gc2V0dGluZ3MucmVkdWNlKFxuICAgIChhY2M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIHMpID0+IHtcbiAgICAgIGFjY1tzLmtleV0gPSBzLnZhbHVlO1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LFxuICAgIHt9IGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4gICk7XG5cbiAgY29uc3QgYnVzaW5lc3NTZXR0aW5ncyA9IHtcbiAgICBjb21wYW55TmFtZTogc2V0dGluZ3NNYXAuY29tcGFueU5hbWUgfHwgXCJZb3VyIENvbXBhbnlcIixcbiAgICBjb21wYW55QWRkcmVzczogc2V0dGluZ3NNYXAuY29tcGFueUFkZHJlc3MgfHwgXCJcIixcbiAgICBjb21wYW55RW1haWw6IHNldHRpbmdzTWFwLmNvbXBhbnlFbWFpbCB8fCBcIlwiLFxuICAgIGNvbXBhbnlQaG9uZTogc2V0dGluZ3NNYXAuY29tcGFueVBob25lIHx8IFwiXCIsXG4gICAgY29tcGFueVRheElkOiBzZXR0aW5nc01hcC5jb21wYW55VGF4SWQgfHwgXCJcIixcbiAgICBjdXJyZW5jeTogc2V0dGluZ3NNYXAuY3VycmVuY3kgfHwgXCJVU0RcIixcbiAgICB0YXhMYWJlbDogc2V0dGluZ3NNYXAudGF4TGFiZWwgfHwgdW5kZWZpbmVkLFxuICAgIGxvZ286IHNldHRpbmdzTWFwLmxvZ28sXG4gICAgcGF5bWVudE1ldGhvZHM6IHNldHRpbmdzTWFwLnBheW1lbnRNZXRob2RzIHx8IFwiQmFuayBUcmFuc2ZlclwiLFxuICAgIGJhbmtBY2NvdW50OiBzZXR0aW5nc01hcC5iYW5rQWNjb3VudCB8fCBcIlwiLFxuICAgIHBheW1lbnRUZXJtczogc2V0dGluZ3NNYXAucGF5bWVudFRlcm1zIHx8IFwiRHVlIGluIDMwIGRheXNcIixcbiAgICBkZWZhdWx0Tm90ZXM6IHNldHRpbmdzTWFwLmRlZmF1bHROb3RlcyB8fCBcIlwiLFxuICAgIGNvbXBhbnlDb3VudHJ5Q29kZTogc2V0dGluZ3NNYXAuY29tcGFueUNvdW50cnlDb2RlIHx8IFwiXCIsXG4gIH07XG5cbiAgY29uc3QgdXJsID0gbmV3IFVSTChjLnJlcS51cmwpO1xuICBjb25zdCBwcm9maWxlUGFyYW0gPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcInByb2ZpbGVcIikgfHxcbiAgICBzZXR0aW5nc01hcC54bWxQcm9maWxlSWQgfHwgdW5kZWZpbmVkO1xuICBjb25zdCB7IHhtbCwgcHJvZmlsZSB9ID0gZ2VuZXJhdGVJbnZvaWNlWE1MKFxuICAgIHByb2ZpbGVQYXJhbSxcbiAgICBpbnZvaWNlLFxuICAgIGJ1c2luZXNzU2V0dGluZ3MsXG4gICAge1xuICAgICAgc2VsbGVyRW5kcG9pbnRJZDogc2V0dGluZ3NNYXAucGVwcG9sU2VsbGVyRW5kcG9pbnRJZCxcbiAgICAgIHNlbGxlckVuZHBvaW50U2NoZW1lSWQ6IHNldHRpbmdzTWFwLnBlcHBvbFNlbGxlckVuZHBvaW50U2NoZW1lSWQsXG4gICAgICBidXllckVuZHBvaW50SWQ6IHNldHRpbmdzTWFwLnBlcHBvbEJ1eWVyRW5kcG9pbnRJZCxcbiAgICAgIGJ1eWVyRW5kcG9pbnRTY2hlbWVJZDogc2V0dGluZ3NNYXAucGVwcG9sQnV5ZXJFbmRwb2ludFNjaGVtZUlkLFxuICAgICAgc2VsbGVyQ291bnRyeUNvZGU6IHNldHRpbmdzTWFwLmNvbXBhbnlDb3VudHJ5Q29kZSxcbiAgICAgIGJ1eWVyQ291bnRyeUNvZGU6IGludm9pY2UuY3VzdG9tZXIuY291bnRyeUNvZGUsXG4gICAgfSxcbiAgKTtcblxuICByZXR1cm4gbmV3IFJlc3BvbnNlKHhtbCwge1xuICAgIGhlYWRlcnM6IHtcbiAgICAgIFwiQ29udGVudC1UeXBlXCI6IGAke3Byb2ZpbGUubWVkaWFUeXBlfTsgY2hhcnNldD11dGYtOGAsXG4gICAgICBcIkNvbnRlbnQtRGlzcG9zaXRpb25cIjogYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwiaW52b2ljZS0ke1xuICAgICAgICBpbnZvaWNlLmludm9pY2VOdW1iZXIgfHwgc2hhcmVUb2tlblxuICAgICAgfS4ke3Byb2ZpbGUuZmlsZUV4dGVuc2lvbn1cImAsXG4gICAgICBcIlgtUm9ib3RzLVRhZ1wiOiBcIm5vaW5kZXhcIixcbiAgICB9LFxuICB9KTtcbn0pO1xuXG4vLyBMaXN0IGF2YWlsYWJsZSBidWlsdC1pbiBYTUwgcHJvZmlsZXMgKHB1YmxpYzsgY291bGQgYWxzbyByZXF1aXJlIGF1dGgsIGJ1dCBjb250ZW50cyBhcmUgbm9uLXNlbnNpdGl2ZSlcbnB1YmxpY1JvdXRlcy5nZXQoXCIvcHVibGljL3htbC1wcm9maWxlc1wiLCAoYykgPT4ge1xuICBjb25zdCBwcm9maWxlcyA9IGxpc3RYTUxQcm9maWxlcygpLm1hcCgocCkgPT4gKHtcbiAgICBpZDogcC5pZCxcbiAgICBuYW1lOiBwLm5hbWUsXG4gICAgbWVkaWFUeXBlOiBwLm1lZGlhVHlwZSxcbiAgICBmaWxlRXh0ZW5zaW9uOiBwLmZpbGVFeHRlbnNpb24sXG4gICAgZXhwZXJpbWVudGFsOiAhIXAuZXhwZXJpbWVudGFsLFxuICAgIGJ1aWx0SW46IHRydWUsXG4gIH0pKTtcbiAgcmV0dXJuIGMuanNvbihwcm9maWxlcyk7XG59KTtcblxuZXhwb3J0IHsgcHVibGljUm91dGVzIH07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMERBQTBEO0FBQzFELFNBQVMsSUFBSSxRQUFRLE9BQU87QUFDNUIsU0FBUyxTQUFTLEVBQUUsUUFBUSxFQUFFLE9BQU8sUUFBUSxXQUFXO0FBQ3hELFNBQVMsc0JBQXNCLFFBQVEsNkJBQTZCO0FBQ3BFLFNBQVMsV0FBVyxRQUFRLDZCQUE2QjtBQUN6RCxTQUFTLGVBQWUsUUFBUSw4QkFBOEI7QUFDOUQsU0FBUywwQkFBMEIsUUFBUSwwQkFBMEI7QUFDckUsU0FBUyxnQkFBZ0IsRUFBRSxXQUFXLFFBQVEsa0JBQWtCO0FBQ2hFLFNBQVMscUJBQXFCLFFBQVEsa0JBQWtCLENBQUMsa0VBQWtFO0FBQzNILFNBQVMsa0JBQWtCLEVBQUUsZUFBZSxRQUFRLDBCQUEwQjtBQUM5RSxTQUFTLGlCQUFpQixRQUFRLHdCQUF3QjtBQUMxRCxTQUNFLHVCQUF1QixFQUN2Qiw0QkFBNEIsRUFDNUIsK0JBQStCLFFBQzFCLDBCQUEwQjtBQUVq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
// denoCacheMetadata=6944225053393393046,16753683916277180138