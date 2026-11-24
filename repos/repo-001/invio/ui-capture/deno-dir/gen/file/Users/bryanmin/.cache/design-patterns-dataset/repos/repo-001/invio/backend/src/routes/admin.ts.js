// @ts-nocheck: route handlers use Hono context without typings to keep edits minimal
import { Hono } from "hono";
import { createInvoice, deleteInvoice, duplicateInvoice, getInvoiceById, getInvoices, getLatestPaidPaymentMethods, publishInvoice, unpublishInvoice, updateInvoice, voidInvoice } from "../controllers/invoices.ts";
import { createTemplate, deleteTemplate, getTemplateById, getTemplates, installLocalTemplateFromZip, installTemplateFromManifest, loadTemplateFromFile, renderTemplate, setDefaultTemplate } from "../controllers/templates.ts";
import { deleteSetting, getSetting, getSettings, setSetting, updateSettings } from "../controllers/settings.ts";
import { createCustomer, deleteCustomer, getCustomerById, getCustomers, updateCustomer } from "../controllers/customers.ts";
import { createProduct, deleteProduct, getProductById, getProducts, isProductUsedInInvoices, reactivateProduct, updateProduct } from "../controllers/products.ts";
import { createTaxDefinition, deleteTaxDefinition, getTaxDefinitionById, getTaxDefinitions, updateTaxDefinition } from "../controllers/taxDefinitions.ts";
import { createCategory, createUnit, deleteCategory, deleteUnit, getCategories, getUnits, isCategoryUsed, isUnitUsed, updateCategory, updateUnit } from "../controllers/productOptions.ts";
import { buildInvoiceHTML, generatePDF } from "../utils/pdf.ts";
import { isEmailConfigured, sendEmail } from "../utils/email.ts";
import { generateUBLInvoiceXML } from "../utils/ubl.ts"; // legacy direct import
import { generateInvoiceXML, listXMLProfiles } from "../utils/xmlProfiles.ts";
import { normalizeInvoiceLocaleSetting, resolveInvoiceRenderLocale } from "../i18n/translations.ts";
import { resetDatabaseFromDemo } from "../database/init.ts";
import { getNextInvoiceNumber } from "../database/init.ts";
import { isDemoMode } from "../utils/env.ts";
import { normalizeStoredLogoReference, saveDataUrlLogo, saveUploadedLogoFile } from "../utils/logoStorage.ts";
import { getAuthUser, requireAdminAuth, requirePermission } from "../middleware/auth.ts";
import { createUser as createUserCtrl, deleteUser as deleteUserCtrl, disableUserTwoFactor, getUserById as getUserByIdCtrl, getUserTwoFactorState, listUsers, setUserTwoFactorState, updateUser as updateUserCtrl } from "../controllers/users.ts";
import { RESOURCE_ACTIONS, RESOURCES } from "../types/index.ts";
import { createPendingTwoFactorSetup, decryptTwoFactorSecret, encryptTwoFactorSecret, generateRecoveryCodes, hashRecoveryCodes, verifyPendingTwoFactorSetup, verifyTotpToken } from "../utils/twoFactor.ts";
const adminRoutes = new Hono();
// Normalize tax-related settings coming from the client to robust canonical forms
function normalizeTaxSettingsPayload(data) {
  // defaultTaxRate: parse to finite non-negative number, store as canonical string
  if (data && Object.prototype.hasOwnProperty.call(data, "defaultTaxRate")) {
    const raw = String(data["defaultTaxRate"] ?? "").trim();
    const norm = raw.replace(",", ".");
    const n = Number(norm);
    if (!isFinite(n) || isNaN(n) || n < 0) {
      // Remove invalid value to avoid persisting junk
      delete data["defaultTaxRate"];
    } else {
      // Keep a trimmed canonical numeric string (avoid trailing spaces)
      data["defaultTaxRate"] = String(n);
    }
  }
  // defaultPricesIncludeTax: normalize to "true" | "false"
  if (data && Object.prototype.hasOwnProperty.call(data, "defaultPricesIncludeTax")) {
    const v = String(data["defaultPricesIncludeTax"] ?? "").toLowerCase().trim();
    const truthy = new Set([
      "1",
      "true",
      "yes",
      "y",
      "on"
    ]);
    data["defaultPricesIncludeTax"] = truthy.has(v) ? "true" : "false";
  }
  // defaultRoundingMode: normalize to "line" | "total" (default line)
  if (data && Object.prototype.hasOwnProperty.call(data, "defaultRoundingMode")) {
    const v = String(data["defaultRoundingMode"] ?? "").toLowerCase().trim();
    data["defaultRoundingMode"] = v === "total" ? "total" : "line";
  }
}
function normalizeLocaleSettingPayload(data) {
  if (!data) return;
  // Accept common aliases and normalize to canonical keys
  if (!Object.prototype.hasOwnProperty.call(data, "dateFormat") && Object.prototype.hasOwnProperty.call(data, "date_format")) {
    data.dateFormat = data.date_format;
    delete data.date_format;
  }
  if (!Object.prototype.hasOwnProperty.call(data, "numberFormat") && Object.prototype.hasOwnProperty.call(data, "number_format")) {
    data.numberFormat = data.number_format;
    delete data.number_format;
  }
  // Accept common aliases and normalize to canonical key
  if (!Object.prototype.hasOwnProperty.call(data, "postalCityFormat") && Object.prototype.hasOwnProperty.call(data, "postal_city_format")) {
    data.postalCityFormat = data.postal_city_format;
    delete data.postal_city_format;
  }
  if (!Object.prototype.hasOwnProperty.call(data, "postalCityFormat") && Object.prototype.hasOwnProperty.call(data, "postalcityformat")) {
    data.postalCityFormat = data.postalcityformat;
    delete data.postalcityformat;
  }
  if (Object.prototype.hasOwnProperty.call(data, "locale")) {
    const normalized = normalizeInvoiceLocaleSetting(data.locale);
    if (normalized) data.locale = normalized;
    else delete data.locale;
  }
  // Empty value is kept so the settings controller clears the stored fallback
  if (Object.prototype.hasOwnProperty.call(data, "invoiceFallbackLocale")) {
    data.invoiceFallbackLocale = normalizeInvoiceLocaleSetting(data.invoiceFallbackLocale) ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(data, "postalCityFormat")) {
    const rawFormat = String(data.postalCityFormat ?? "").trim().toLowerCase();
    if (rawFormat === "city-postal" || rawFormat === "postal-city") {
      data.postalCityFormat = rawFormat;
    } else {
      data.postalCityFormat = "auto";
    }
  }
  if (Object.prototype.hasOwnProperty.call(data, "numberFormat")) {
    const rawNumberFormat = String(data.numberFormat ?? "").trim().toLowerCase();
    data.numberFormat = rawNumberFormat === "period" ? "period" : "comma";
  }
  if (Object.prototype.hasOwnProperty.call(data, "dateFormat")) {
    const rawDateFormat = String(data.dateFormat ?? "").trim();
    data.dateFormat = rawDateFormat === "DD.MM.YYYY" ? "DD.MM.YYYY" : "YYYY-MM-DD";
  }
}
function normalizeInvoiceProtectionSettingsPayload(data) {
  if (!Object.prototype.hasOwnProperty.call(data, "allowProtectedInvoiceChanges")) {
    return;
  }
  const raw = String(data.allowProtectedInvoiceChanges ?? "").toLowerCase().trim();
  const truthy = new Set([
    "1",
    "true",
    "yes",
    "y",
    "on"
  ]);
  data.allowProtectedInvoiceChanges = truthy.has(raw) ? "true" : "false";
}
// Demo mode flag (mutations allowed; periodic resets handle reverting state)
const DEMO_MODE = isDemoMode();
adminRoutes.use("/invoices/*", requireAdminAuth);
adminRoutes.use("/customers/*", requireAdminAuth);
adminRoutes.use("/products/*", requireAdminAuth);
adminRoutes.use("/templates/*", requireAdminAuth);
adminRoutes.use("/tax-definitions/*", requireAdminAuth);
adminRoutes.use("/product-categories/*", requireAdminAuth);
adminRoutes.use("/product-units/*", requireAdminAuth);
adminRoutes.use("/settings", requireAdminAuth);
adminRoutes.use("/settings/*", requireAdminAuth);
// Protect admin alias routes as well
adminRoutes.use("/admin/*", requireAdminAuth);
// Protect export routes
adminRoutes.use("/export/*", requireAdminAuth);
// Demo helper: trigger an immediate reset (only effective when DEMO_MODE=true)
adminRoutes.post("/admin/demo/reset", async (c)=>{
  if (!DEMO_MODE) return c.json({
    error: "Demo mode is not enabled"
  }, 400);
  try {
    await resetDatabaseFromDemo();
    return c.json({
      ok: true
    });
  } catch (e) {
    return c.json({
      error: String(e)
    }, 500);
  }
});
// Invoice routes
adminRoutes.get("/invoices/next-number", requirePermission("invoices", "create"), (c)=>{
  try {
    const customerId = c.req.query("customerId") || undefined;
    const next = getNextInvoiceNumber(customerId);
    return c.json({
      next
    });
  } catch (e) {
    return c.json({
      error: String(e)
    }, 500);
  }
});
adminRoutes.post("/invoices", requirePermission("invoices", "create"), async (c)=>{
  const data = await c.req.json();
  try {
    const invoice = createInvoice(data);
    return c.json(invoice);
  } catch (e) {
    const msg = String(e);
    if (/already exists/i.test(msg)) {
      return c.json({
        error: msg
      }, 409);
    }
    return c.json({
      error: msg
    }, 400);
  }
});
adminRoutes.get("/invoices", requirePermission("invoices", "read"), (c)=>{
  const invoices = getInvoices();
  // Look up payment methods for paid and complete invoices — complete invoices
  // were previously paid and their payment method should remain visible.
  const paidIds = invoices.filter((inv)=>inv.status === "paid" || inv.status === "complete").map((inv)=>inv.id);
  const paymentMethods = getLatestPaidPaymentMethods(paidIds);
  const list = invoices.map((inv)=>{
    let customerName = undefined;
    try {
      const customer = getCustomerById(inv.customerId);
      customerName = customer?.name;
    } catch (_e) {
    /* ignore */ }
    const issue_date = inv.issueDate ? new Date(inv.issueDate).toISOString().slice(0, 10) : undefined;
    return {
      ...inv,
      customer: customerName ? {
        name: customerName
      } : undefined,
      issue_date,
      paidWith: paymentMethods.get(inv.id)
    };
  });
  return c.json(list);
});
adminRoutes.get("/invoices/:id", requirePermission("invoices", "read"), (c)=>{
  const id = c.req.param("id");
  const invoice = getInvoiceById(id);
  if (!invoice) {
    return c.json({
      error: "Invoice not found"
    }, 404);
  }
  // Add snake_case date strings for UI compatibility (same as list endpoint)
  const issue_date = invoice.issueDate ? new Date(invoice.issueDate).toISOString().slice(0, 10) : undefined;
  const due_date = invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : undefined;
  return c.json({
    ...invoice,
    issue_date,
    due_date
  });
});
adminRoutes.put("/invoices/:id", requirePermission("invoices", "update"), async (c)=>{
  const id = c.req.param("id");
  const data = await c.req.json();
  try {
    const invoice = await updateInvoice(id, data);
    return c.json(invoice);
  } catch (e) {
    const msg = String(e);
    if (/already exists/i.test(msg)) {
      return c.json({
        error: msg
      }, 409);
    }
    return c.json({
      error: msg
    }, 400);
  }
});
adminRoutes.delete("/invoices/:id", requirePermission("invoices", "delete"), async (c)=>{
  const id = c.req.param("id");
  try {
    await deleteInvoice(id);
    return c.json({
      success: true
    });
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
adminRoutes.post("/invoices/:id/publish", requirePermission("invoices", "publish"), async (c)=>{
  const id = c.req.param("id");
  try {
    const result = await publishInvoice(id);
    return c.json(result);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
adminRoutes.post("/invoices/:id/unpublish", requirePermission("invoices", "publish"), async (c)=>{
  const id = c.req.param("id");
  const result = await unpublishInvoice(id);
  return c.json(result);
});
adminRoutes.post("/invoices/:id/duplicate", requirePermission("invoices", "create"), async (c)=>{
  const id = c.req.param("id");
  const copy = await duplicateInvoice(id);
  if (!copy) return c.json({
    error: "Invoice not found"
  }, 404);
  return c.json(copy);
});
adminRoutes.post("/invoices/:id/void", requirePermission("invoices", "void"), async (c)=>{
  const id = c.req.param("id");
  try {
    const result = await voidInvoice(id);
    return c.json(result);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
// Template routes
adminRoutes.get("/templates", requirePermission("templates", "read"), async (c)=>{
  let templates = await getTemplates();
  // Overlay the default from settings if present; also compute 'updatable' flag when a manifest source exists
  try {
    const settings = await getSettings();
    const map = settings.reduce((acc, s)=>{
      acc[s.key] = s.value;
      return acc;
    }, {});
    const current = map.templateId;
    if (current) {
      templates = templates.map((t)=>({
          ...t,
          isDefault: t.id === current,
          updatable: !!map[`templateSource:${t.id}`]
        }));
    } else {
      templates = templates.map((t)=>({
          ...t,
          updatable: !!map[`templateSource:${t.id}`]
        }));
    }
  } catch  {
  /* ignore */ }
  return c.json(templates);
});
// Tax definition routes
adminRoutes.get("/tax-definitions", requirePermission("tax_definitions", "read"), (c)=>{
  try {
    const list = getTaxDefinitions();
    return c.json(list);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 500);
  }
});
adminRoutes.get("/tax-definitions/:id", requirePermission("tax_definitions", "read"), (c)=>{
  try {
    const id = c.req.param("id");
    const tax = getTaxDefinitionById(id);
    if (!tax) return c.json({
      error: "Not found"
    }, 404);
    return c.json(tax);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 500);
  }
});
adminRoutes.post("/tax-definitions", requirePermission("tax_definitions", "create"), async (c)=>{
  const data = await c.req.json();
  try {
    const created = createTaxDefinition(data);
    return c.json(created, 201);
  } catch (e) {
    const msg = String(e);
    if (/unique constraint failed: tax_definitions\.code/i.test(msg)) {
      return c.json({
        error: "Tax code already exists"
      }, 409);
    }
    return c.json({
      error: msg
    }, 400);
  }
});
adminRoutes.put("/tax-definitions/:id", requirePermission("tax_definitions", "update"), async (c)=>{
  const data = await c.req.json();
  try {
    const id = c.req.param("id");
    const updated = updateTaxDefinition(id, data);
    return c.json(updated);
  } catch (e) {
    const msg = String(e);
    if (msg === "NOT_FOUND") return c.json({
      error: "Not found"
    }, 404);
    if (/unique constraint failed: tax_definitions\.code/i.test(msg)) {
      return c.json({
        error: "Tax code already exists"
      }, 409);
    }
    return c.json({
      error: msg
    }, 400);
  }
});
adminRoutes.delete("/tax-definitions/:id", requirePermission("tax_definitions", "delete"), (c)=>{
  try {
    const id = c.req.param("id");
    const result = deleteTaxDefinition(id);
    return c.json(result);
  } catch (e) {
    const msg = String(e);
    if (msg === "NOT_FOUND") return c.json({
      error: "Not found"
    }, 404);
    return c.json({
      error: msg
    }, 400);
  }
});
adminRoutes.post("/templates", requirePermission("templates", "create"), async (c)=>{
  const data = await c.req.json();
  const template = await createTemplate(data);
  return c.json(template);
});
// Install a template from a remote manifest URL (YAML or JSON)
adminRoutes.post("/templates/install-from-manifest", requirePermission("templates", "install"), async (c)=>{
  try {
    const { url } = await c.req.json();
    if (!url || typeof url !== "string") {
      return c.json({
        error: "Missing 'url'"
      }, 400);
    }
    const t = await installTemplateFromManifest(url);
    try {
      // Remember the source manifest used for this template id to enable future updates
      setSetting(`templateSource:${t.id}`, url);
    } catch (_e) {
    /* non-fatal */ }
    return c.json(t);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
// Install a local template from an uploaded .zip file
adminRoutes.post("/templates/upload", requirePermission("templates", "install"), async (c)=>{
  try {
    const contentType = c.req.header("content-type") || "";
    let zipData;
    if (contentType.includes("multipart/form-data")) {
      // Handle multipart form upload
      const formData = await c.req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return c.json({
          error: "No file uploaded"
        }, 400);
      }
      if (!file.name.endsWith(".zip")) {
        return c.json({
          error: "File must be a .zip archive"
        }, 400);
      }
      if (file.size > 5 * 1024 * 1024) {
        return c.json({
          error: "File too large (max 5MB)"
        }, 400);
      }
      const arrayBuffer = await file.arrayBuffer();
      zipData = new Uint8Array(arrayBuffer);
    } else if (contentType.includes("application/zip") || contentType.includes("application/octet-stream")) {
      // Handle raw binary upload
      const arrayBuffer = await c.req.arrayBuffer();
      if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
        return c.json({
          error: "File too large (max 5MB)"
        }, 400);
      }
      zipData = new Uint8Array(arrayBuffer);
    } else {
      return c.json({
        error: "Invalid content type. Expected multipart/form-data or application/zip"
      }, 400);
    }
    const t = await installLocalTemplateFromZip(zipData);
    return c.json(t);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
// Update a template by id using its stored source manifest URL
adminRoutes.post("/templates/:id/update", requirePermission("templates", "update"), async (c)=>{
  const id = c.req.param("id");
  try {
    const src = await getSetting(`templateSource:${id}`);
    if (!src || typeof src !== "string") {
      return c.json({
        error: "No stored manifest URL for this template"
      }, 404);
    }
    const updated = await installTemplateFromManifest(src);
    if (!updated || updated.id !== id) {
      return c.json({
        error: "Manifest ID does not match template id"
      }, 400);
    }
    return c.json({
      ok: true,
      template: updated
    });
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
// Delete a template (disallow removing built-in app templates)
adminRoutes.delete("/templates/:id", requirePermission("templates", "delete"), async (c)=>{
  const id = c.req.param("id");
  // Built-in templates are protected
  const builtin = new Set([
    "professional-modern",
    "minimalist-clean"
  ]);
  if (builtin.has(id)) {
    return c.json({
      error: "Cannot delete built-in templates"
    }, 400);
  }
  // If this template is currently selected in settings, reset to minimalist-clean
  try {
    const current = await getSetting("templateId");
    if (current === id) {
      await setSetting("templateId", "minimalist-clean");
    }
  } catch (_e) {
  // non-fatal
  }
  try {
    await deleteTemplate(id);
    return c.json({
      success: true
    });
  } catch (e) {
    return c.json({
      error: String(e)
    }, 500);
  }
});
// Get template by ID
adminRoutes.get("/templates/:id", requirePermission("templates", "read"), (c)=>{
  const id = c.req.param("id");
  const template = getTemplateById(id);
  if (!template) {
    return c.json({
      error: "Template not found"
    }, 404);
  }
  return c.json(template);
});
// Preview template with sample data
adminRoutes.post("/templates/:id/preview", requirePermission("templates", "read"), async (c)=>{
  const id = c.req.param("id");
  const data = await c.req.json();
  const template = getTemplateById(id);
  if (!template) {
    return c.json({
      error: "Template not found"
    }, 404);
  }
  // Add sample data if not provided
  const sampleData = {
    companyName: "Sample Company Inc",
    companyAddress: "123 Business St, City, State 12345",
    companyEmail: "contact@sample.com",
    companyPhone: "+1-555-123-4567",
    companyTaxId: "TAX123456",
    invoiceNumber: "INV-2025-001",
    issueDate: "2025-08-26",
    dueDate: "2025-09-25",
    currency: "USD",
    status: "draft",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    customerAddress: "456 Client Ave, City, State 54321",
    customerPostalCity: "54321 City",
    customerCountryCode: "US",
    highlightColor: data.highlightColor || "#2563eb",
    highlightColorLight: data.highlightColorLight || "#dbeafe",
    subtotal: 2500.0,
    discountAmount: 250.0,
    discountPercentage: 10,
    taxRate: 8.5,
    taxAmount: 191.25,
    total: 2441.25,
    hasDiscount: true,
    hasTax: true,
    items: [
      {
        description: "Website Development",
        quantity: 1,
        unitPrice: 2500.0,
        lineTotal: 2500.0,
        notes: "Custom responsive website with modern design"
      }
    ],
    notes: "Thank you for your business! Payment is due within 30 days.",
    paymentTerms: "Net 30 days",
    paymentMethods: "Bank Transfer, Credit Card",
    bankAccount: "Account: 123-456-789, Routing: 987-654-321",
    ...data
  };
  try {
    const renderedHtml = renderTemplate(template.html, sampleData);
    return new Response(renderedHtml, {
      headers: {
        "Content-Type": "text/html"
      }
    });
  } catch (error) {
    return c.json({
      error: "Failed to render template",
      details: String(error)
    }, 500);
  }
});
// Load template from file
adminRoutes.post("/templates/load-from-file", requirePermission("templates", "create"), async (c)=>{
  try {
    const { filePath, name, isDefault, highlightColor } = await c.req.json();
    const html = await loadTemplateFromFile(filePath);
    const template = await createTemplate({
      name,
      html,
      isDefault: isDefault || false
    });
    return c.json({
      ...template,
      highlightColor: highlightColor || "#2563eb",
      message: "Template loaded successfully from file"
    });
  } catch (error) {
    return c.json({
      error: "Failed to load template from file",
      details: String(error)
    }, 500);
  }
});
// Settings routes
adminRoutes.get("/settings", async (c)=>{
  const settings = await getSettings();
  const map = settings.reduce((acc, s)=>{
    acc[s.key] = s.value;
    return acc;
  }, {});
  // Provide normalized aliases expected by the frontend
  if (map.companyEmail && !map.email) map.email = map.companyEmail;
  if (map.companyPhone && !map.phone) map.phone = map.companyPhone;
  if (map.companyTaxId && !map.taxId) map.taxId = map.companyTaxId;
  if (map.companyCountryCode && !map.countryCode) {
    map.countryCode = map.companyCountryCode;
  }
  // Unify logo fields: prefer single 'logo'; hide legacy 'logoUrl'
  if (map.logoUrl && !map.logo) map.logo = map.logoUrl;
  if (map.logoUrl) delete map.logoUrl;
  if (typeof map.logo === "string") {
    map.logo = normalizeStoredLogoReference(map.logo);
  }
  if (!map.locale) map.locale = "en";
  if (!map.invoiceFallbackLocale) map.invoiceFallbackLocale = "";
  if (!map.dateFormat && map.date_format) map.dateFormat = map.date_format;
  if (!map.numberFormat && map.number_format) {
    map.numberFormat = map.number_format;
  }
  if (!map.postalCityFormat && map.postal_city_format) {
    map.postalCityFormat = map.postal_city_format;
  }
  if (!map.postalCityFormat && map.postalcityformat) {
    map.postalCityFormat = map.postalcityformat;
  }
  if (!map.dateFormat) map.dateFormat = "YYYY-MM-DD";
  if (!map.numberFormat) map.numberFormat = "comma";
  if (!map.postalCityFormat) map.postalCityFormat = "auto";
  if (!map.allowProtectedInvoiceChanges) {
    map.allowProtectedInvoiceChanges = "false";
  }
  // Expose demo mode to frontend UI
  map.demoMode = DEMO_MODE ? "true" : "false";
  return c.json(map);
});
adminRoutes.put("/settings", requirePermission("settings", "update"), async (c)=>{
  const data = await c.req.json();
  // Normalize legacy logoUrl to logo
  if (typeof data.logoUrl === "string" && !data.logo) {
    data.logo = data.logoUrl;
    delete data.logoUrl;
  }
  if (typeof data.logo === "string" && data.logo.startsWith("data:image/")) {
    data.logo = await saveDataUrlLogo(data.logo);
  } else if (typeof data.logo === "string") {
    data.logo = normalizeStoredLogoReference(data.logo);
  }
  // Normalize tax-related settings
  normalizeTaxSettingsPayload(data);
  normalizeLocaleSettingPayload(data);
  normalizeInvoiceProtectionSettingsPayload(data);
  const settings = await updateSettings(data);
  try {
    if ("logoUrl" in data) deleteSetting("logoUrl");
  } catch (_e) {
  /* ignore legacy cleanup errors */ }
  // If default template changed, reflect in templates table
  if (typeof data.templateId === "string" && data.templateId) {
    try {
      setDefaultTemplate(String(data.templateId));
    } catch  {
    /* ignore */ }
  }
  return c.json(settings);
});
// Partial update (PATCH) to merge provided keys only
adminRoutes.patch("/settings", requirePermission("settings", "update"), async (c)=>{
  const data = await c.req.json();
  // Normalize legacy logoUrl to logo
  if (typeof data.logoUrl === "string" && !data.logo) {
    data.logo = data.logoUrl;
    delete data.logoUrl;
  }
  if (typeof data.logo === "string" && data.logo.startsWith("data:image/")) {
    data.logo = await saveDataUrlLogo(data.logo);
  } else if (typeof data.logo === "string") {
    data.logo = normalizeStoredLogoReference(data.logo);
  }
  // Normalize countryCode alias to companyCountryCode
  if (typeof data.countryCode === "string" && !data.companyCountryCode) {
    data.companyCountryCode = data.countryCode;
    delete data.countryCode;
  }
  // Normalize tax-related settings
  normalizeTaxSettingsPayload(data);
  normalizeLocaleSettingPayload(data);
  normalizeInvoiceProtectionSettingsPayload(data);
  const settings = await updateSettings(data);
  if (typeof data.templateId === "string" && data.templateId) {
    try {
      setDefaultTemplate(String(data.templateId));
    } catch  {
    /* ignore */ }
  }
  try {
    if ("logoUrl" in data) deleteSetting("logoUrl");
  } catch (_e) {
  /* ignore legacy cleanup errors */ }
  return c.json(settings);
});
adminRoutes.post("/settings/logo-upload", requirePermission("settings", "update"), async (c)=>{
  try {
    const form = await c.req.formData();
    const entry = form.get("file");
    if (!(entry instanceof File)) {
      return c.json({
        error: "Missing file"
      }, 400);
    }
    const logo = await saveUploadedLogoFile(entry);
    return c.json({
      logo
    });
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
// Optional admin-prefixed aliases for clarity/documentation parity
adminRoutes.get("/admin/settings", async (c)=>{
  const settings = await getSettings();
  const map = settings.reduce((acc, s)=>{
    acc[s.key] = s.value;
    return acc;
  }, {});
  if (map.companyEmail && !map.email) map.email = map.companyEmail;
  if (map.companyPhone && !map.phone) map.phone = map.companyPhone;
  if (map.companyTaxId && !map.taxId) map.taxId = map.companyTaxId;
  if (map.companyCountryCode && !map.countryCode) {
    map.countryCode = map.companyCountryCode;
  }
  if (map.logoUrl && !map.logo) map.logo = map.logoUrl;
  if (map.logoUrl) delete map.logoUrl;
  if (typeof map.logo === "string") {
    map.logo = normalizeStoredLogoReference(map.logo);
  }
  if (!map.locale) map.locale = "en";
  if (!map.invoiceFallbackLocale) map.invoiceFallbackLocale = "";
  if (!map.dateFormat && map.date_format) map.dateFormat = map.date_format;
  if (!map.numberFormat && map.number_format) {
    map.numberFormat = map.number_format;
  }
  if (!map.postalCityFormat && map.postal_city_format) {
    map.postalCityFormat = map.postal_city_format;
  }
  if (!map.postalCityFormat && map.postalcityformat) {
    map.postalCityFormat = map.postalcityformat;
  }
  if (!map.dateFormat) map.dateFormat = "YYYY-MM-DD";
  if (!map.numberFormat) map.numberFormat = "comma";
  if (!map.postalCityFormat) map.postalCityFormat = "auto";
  if (!map.allowProtectedInvoiceChanges) {
    map.allowProtectedInvoiceChanges = "false";
  }
  // Expose demo mode to frontend UI for admin-prefixed route as well
  map.demoMode = DEMO_MODE ? "true" : "false";
  return c.json(map);
});
adminRoutes.put("/admin/settings", requirePermission("settings", "update"), async (c)=>{
  const data = await c.req.json();
  if (typeof data.logoUrl === "string" && !data.logo) {
    data.logo = data.logoUrl;
    delete data.logoUrl;
  }
  if (typeof data.logo === "string" && data.logo.startsWith("data:image/")) {
    data.logo = await saveDataUrlLogo(data.logo);
  } else if (typeof data.logo === "string") {
    data.logo = normalizeStoredLogoReference(data.logo);
  }
  // Normalize tax-related settings
  normalizeTaxSettingsPayload(data);
  normalizeLocaleSettingPayload(data);
  normalizeInvoiceProtectionSettingsPayload(data);
  const settings = await updateSettings(data);
  try {
    if ("logoUrl" in data) deleteSetting("logoUrl");
  } catch (_e) {
  /* ignore legacy cleanup errors */ }
  return c.json(settings);
});
adminRoutes.patch("/admin/settings", requirePermission("settings", "update"), async (c)=>{
  const data = await c.req.json();
  if (typeof data.logoUrl === "string" && !data.logo) {
    data.logo = data.logoUrl;
    delete data.logoUrl;
  }
  if (typeof data.logo === "string" && data.logo.startsWith("data:image/")) {
    data.logo = await saveDataUrlLogo(data.logo);
  } else if (typeof data.logo === "string") {
    data.logo = normalizeStoredLogoReference(data.logo);
  }
  // Normalize tax-related settings
  normalizeTaxSettingsPayload(data);
  normalizeLocaleSettingPayload(data);
  normalizeInvoiceProtectionSettingsPayload(data);
  const settings = await updateSettings(data);
  try {
    if ("logoUrl" in data) deleteSetting("logoUrl");
  } catch (_e) {
  /* ignore legacy cleanup errors */ }
  return c.json(settings);
});
// Customer routes
adminRoutes.get("/customers", requirePermission("customers", "read"), async (c)=>{
  const customers = await getCustomers();
  return c.json(customers);
});
adminRoutes.get("/customers/:id", requirePermission("customers", "read"), async (c)=>{
  const id = c.req.param("id");
  const customer = await getCustomerById(id);
  if (!customer) {
    return c.json({
      error: "Customer not found"
    }, 404);
  }
  return c.json(customer);
});
adminRoutes.post("/customers", requirePermission("customers", "create"), async (c)=>{
  const data = await c.req.json();
  const customer = createCustomer(data);
  return c.json(customer);
});
adminRoutes.put("/customers/:id", requirePermission("customers", "update"), async (c)=>{
  const id = c.req.param("id");
  const data = await c.req.json();
  const customer = await updateCustomer(id, data);
  return c.json(customer);
});
adminRoutes.delete("/customers/:id", requirePermission("customers", "delete"), async (c)=>{
  const id = c.req.param("id");
  await deleteCustomer(id);
  return c.json({
    success: true
  });
});
// Product routes
adminRoutes.get("/products", requirePermission("products", "read"), (c)=>{
  const url = new URL(c.req.url);
  const includeInactive = url.searchParams.get("includeInactive")?.toLowerCase() === "true";
  const products = getProducts(includeInactive);
  return c.json(products);
});
adminRoutes.get("/products/:id", requirePermission("products", "read"), (c)=>{
  const id = c.req.param("id");
  const product = getProductById(id);
  if (!product) {
    return c.json({
      error: "Product not found"
    }, 404);
  }
  return c.json(product);
});
adminRoutes.post("/products", requirePermission("products", "create"), async (c)=>{
  const data = await c.req.json();
  try {
    const product = createProduct(data);
    return c.json(product, 201);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
adminRoutes.put("/products/:id", requirePermission("products", "update"), async (c)=>{
  const id = c.req.param("id");
  const data = await c.req.json();
  try {
    const product = updateProduct(id, data);
    if (!product) {
      return c.json({
        error: "Product not found"
      }, 404);
    }
    return c.json(product);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
adminRoutes.delete("/products/:id", requirePermission("products", "delete"), (c)=>{
  const id = c.req.param("id");
  try {
    deleteProduct(id);
    return c.json({
      success: true
    });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("not found")) {
      return c.json({
        error: "Product not found"
      }, 404);
    }
    return c.json({
      error: msg
    }, 400);
  }
});
// Check if product is used in invoices
adminRoutes.get("/products/:id/usage", requirePermission("products", "read"), (c)=>{
  const id = c.req.param("id");
  const product = getProductById(id);
  if (!product) {
    return c.json({
      error: "Product not found"
    }, 404);
  }
  const usedInInvoices = isProductUsedInInvoices(id);
  return c.json({
    usedInInvoices
  });
});
// Reactivate a soft-deleted product
adminRoutes.post("/products/:id/reactivate", requirePermission("products", "update"), (c)=>{
  const id = c.req.param("id");
  try {
    const product = reactivateProduct(id);
    if (!product) {
      return c.json({
        error: "Product not found"
      }, 404);
    }
    return c.json(product);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
// Product Categories
adminRoutes.get("/product-categories", requirePermission("products", "read"), (c)=>{
  const categories = getCategories();
  return c.json(categories);
});
adminRoutes.get("/product-categories/:id", requirePermission("products", "read"), (c)=>{
  if (!category) {
    return c.json({
      error: "Category not found"
    }, 404);
  }
  return c.json(category);
});
adminRoutes.post("/product-categories", requirePermission("products", "create"), async (c)=>{
  const data = await c.req.json();
  try {
    const category1 = createCategory(data);
    return c.json(category1, 201);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
adminRoutes.put("/product-categories/:id", requirePermission("products", "update"), async (c)=>{
  const id = c.req.param("id");
  const data = await c.req.json();
  try {
    const category1 = updateCategory(id, data);
    if (!category1) {
      return c.json({
        error: "Category not found"
      }, 404);
    }
    return c.json(category1);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
adminRoutes.delete("/product-categories/:id", requirePermission("products", "delete"), (c)=>{
  const id = c.req.param("id");
  try {
    const deleted = deleteCategory(id);
    if (!deleted) {
      return c.json({
        error: "Category not found"
      }, 404);
    }
    return c.json({
      success: true
    });
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
adminRoutes.get("/product-categories/:id/usage", requirePermission("products", "read"), (c)=>{
  const id = c.req.param("id");
  const usage = isCategoryUsed(id);
  return c.json(usage);
});
// Product Units
adminRoutes.get("/product-units", requirePermission("products", "read"), (c)=>{
  const units = getUnits();
  return c.json(units);
});
adminRoutes.get("/product-units/:id", requirePermission("products", "read"), (c)=>{
  if (!unit) {
    return c.json({
      error: "Unit not found"
    }, 404);
  }
  return c.json(unit);
});
adminRoutes.post("/product-units", requirePermission("products", "create"), async (c)=>{
  const data = await c.req.json();
  try {
    const unit1 = createUnit(data);
    return c.json(unit1, 201);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
adminRoutes.put("/product-units/:id", requirePermission("products", "update"), async (c)=>{
  const id = c.req.param("id");
  const data = await c.req.json();
  try {
    const unit1 = updateUnit(id, data);
    if (!unit1) {
      return c.json({
        error: "Unit not found"
      }, 404);
    }
    return c.json(unit1);
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
adminRoutes.delete("/product-units/:id", requirePermission("products", "delete"), (c)=>{
  const id = c.req.param("id");
  try {
    const deleted = deleteUnit(id);
    if (!deleted) {
      return c.json({
        error: "Unit not found"
      }, 404);
    }
    return c.json({
      success: true
    });
  } catch (e) {
    return c.json({
      error: String(e)
    }, 400);
  }
});
adminRoutes.get("/product-units/:id/usage", requirePermission("products", "read"), (c)=>{
  const id = c.req.param("id");
  const usage = isUnitUsed(id);
  return c.json(usage);
});
// Authenticated HTML/PDF generation for invoices by ID (no share token required)
adminRoutes.get("/invoices/:id/html", requirePermission("invoices", "read"), async (c)=>{
  const id = c.req.param("id");
  const invoice = getInvoiceById(id);
  if (!invoice) {
    return c.json({
      message: "Invoice not found"
    }, 404);
  }
  // Settings map
  const settings = await getSettings();
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
  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyCity: settingsMap.companyCity || "",
    companyPostalCode: settingsMap.companyPostalCode || "",
    companyCountryCode: settingsMap.companyCountryCode || "",
    postalCityFormat: settingsMap.postalCityFormat || "auto",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
    currency: settingsMap.currency || "USD",
    taxLabel: settingsMap.taxLabel || undefined,
    logo: settingsMap.logo,
    // brandLayout removed; always treating as logo-left in rendering
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
      "Cache-Control": "no-store"
    }
  });
});
adminRoutes.get("/invoices/:id/pdf", requirePermission("invoices", "export"), async (c)=>{
  const id = c.req.param("id");
  const invoice = getInvoiceById(id);
  if (!invoice) {
    return c.json({
      message: "Invoice not found"
    }, 404);
  }
  // Settings map
  const settings = await getSettings();
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
  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyCity: settingsMap.companyCity || "",
    companyPostalCode: settingsMap.companyPostalCode || "",
    companyCountryCode: settingsMap.companyCountryCode || "",
    postalCityFormat: settingsMap.postalCityFormat || "auto",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
    currency: settingsMap.currency || "USD",
    taxLabel: settingsMap.taxLabel || undefined,
    logo: settingsMap.logo,
    // brandLayout removed; always treating as logo-left in rendering
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
      // Dynamically import to avoid import cycles
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
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber || id}.pdf"`,
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
    console.error("/invoices/:id/pdf failed:", msg);
    return c.json({
      error: "Failed to generate PDF",
      details: msg
    }, 500);
  }
});
// Send invoice via email (SMTP2GO)
adminRoutes.post("/invoices/:id/send-email", requirePermission("invoices", "export"), async (c)=>{
  if (!isEmailConfigured()) {
    return c.json({
      error: "Email is not configured. Set SMTP2GO_API_KEY and EMAIL_FROM_ADDRESS."
    }, 503);
  }
  const id = c.req.param("id");
  const invoice = getInvoiceById(id);
  if (!invoice) return c.json({
    error: "Invoice not found"
  }, 404);
  let to = [];
  let subject = "";
  let message = "";
  try {
    const body = await c.req.json();
    to = Array.isArray(body.to) ? body.to.filter((e)=>typeof e === "string" && e.includes("@")) : [];
    subject = typeof body.subject === "string" ? body.subject.trim() : "";
    message = typeof body.message === "string" ? body.message.trim() : "";
  } catch  {
    return c.json({
      error: "Invalid request body"
    }, 400);
  }
  if (to.length === 0) {
    return c.json({
      error: "At least one valid recipient email is required"
    }, 400);
  }
  if (!subject) {
    return c.json({
      error: "Subject is required"
    }, 400);
  }
  // Build settings map (same as /pdf route)
  const settings = await getSettings();
  const settingsMap = settings.reduce((acc, s)=>{
    acc[s.key] = s.value;
    return acc;
  }, {});
  if (!settingsMap.postalCityFormat && settingsMap.postal_city_format) {
    settingsMap.postalCityFormat = settingsMap.postal_city_format;
  }
  if (!settingsMap.logo && settingsMap.logoUrl) {
    settingsMap.logo = settingsMap.logoUrl;
  }
  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyCity: settingsMap.companyCity || "",
    companyPostalCode: settingsMap.companyPostalCode || "",
    companyCountryCode: settingsMap.companyCountryCode || "",
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
  const highlight = settingsMap.highlight ?? undefined;
  let selectedTemplateId = settingsMap.templateId?.toLowerCase();
  if (selectedTemplateId === "professional" || selectedTemplateId === "professional-modern") {
    selectedTemplateId = "professional-modern";
  } else if (selectedTemplateId === "minimalist" || selectedTemplateId === "minimalist-clean") {
    selectedTemplateId = "minimalist-clean";
  }
  // Generate PDF attachment
  let pdfBuffer;
  try {
    const customer = getCustomerById(invoice.customerId);
    const renderLocale = resolveInvoiceRenderLocale(invoice.locale, customer?.countryCode, settingsMap.invoiceFallbackLocale, settingsMap.locale);
    pdfBuffer = await generatePDF(invoice, businessSettings, selectedTemplateId, highlight, {
      embedXml: false,
      dateFormat: settingsMap.dateFormat,
      numberFormat: settingsMap.numberFormat,
      locale: renderLocale
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Email: PDF generation failed:", msg);
    return c.json({
      error: "Failed to generate PDF attachment",
      details: msg
    }, 500);
  }
  // Build email body
  const companyName = businessSettings.companyName;
  const invoiceNumber = invoice.invoiceNumber || invoice.id;
  const total = `${Number(invoice.total || 0).toFixed(2)} ${invoice.currency || ""}`.trim();
  const issueDate = invoice.issueDate ? new Date(invoice.issueDate).toISOString().slice(0, 10) : "";
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : null;
  const origin = c.req.header("origin") || c.req.header("referer")?.replace(/\/$/, "") || "";
  const shareLink = invoice.shareToken && origin ? `${origin}/public/invoices/${invoice.shareToken}` : null;
  const messageHtml = message ? `<p style="white-space:pre-wrap;">${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` : "";
  const shareLinkHtml = shareLink ? `<p><a href="${shareLink}" style="color:#2563eb;">View invoice online</a></p>` : "";
  const dueDateHtml = dueDate ? `<tr><td style="padding:4px 8px;color:#6b7280;">Due date</td><td style="padding:4px 8px;">${dueDate}</td></tr>` : "";
  const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="margin-top:0;">${companyName}</h2>
  ${messageHtml}
  <table style="border-collapse:collapse;margin:16px 0;width:auto;">
    <tr><td style="padding:4px 8px;color:#6b7280;">Invoice</td><td style="padding:4px 8px;font-weight:600;">#${invoiceNumber}</td></tr>
    <tr><td style="padding:4px 8px;color:#6b7280;">Issue date</td><td style="padding:4px 8px;">${issueDate}</td></tr>
    ${dueDateHtml}
    <tr><td style="padding:4px 8px;color:#6b7280;">Total</td><td style="padding:4px 8px;font-weight:600;">${total}</td></tr>
  </table>
  ${shareLinkHtml}
  <p style="color:#6b7280;font-size:13px;">The invoice PDF is attached to this email.</p>
</body>
</html>`;
  const textBody = [
    companyName,
    "",
    message || "",
    `Invoice: #${invoiceNumber}`,
    `Issue date: ${issueDate}`,
    dueDate ? `Due date: ${dueDate}` : "",
    `Total: ${total}`,
    shareLink ? `\nView online: ${shareLink}` : ""
  ].filter((l)=>l !== undefined).join("\n").trim();
  try {
    await sendEmail({
      to,
      subject,
      htmlBody,
      textBody,
      attachment: {
        filename: `invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        mimeType: "application/pdf"
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Email send failed:", msg);
    return c.json({
      error: "Failed to send email",
      details: msg
    }, 502);
  }
  return c.json({
    sent: true,
    recipients: to.length
  });
});
// UBL (PEPPOL BIS Billing 3.0) XML for an invoice by ID
adminRoutes.get("/invoices/:id/ubl.xml", requirePermission("invoices", "export"), async (c)=>{
  const id = c.req.param("id");
  const invoice = getInvoiceById(id);
  if (!invoice) {
    return c.json({
      message: "Invoice not found"
    }, 404);
  }
  const settings = await getSettings();
  const map = settings.reduce((acc, s)=>{
    acc[s.key] = s.value;
    return acc;
  }, {});
  const businessSettings = {
    companyName: map.companyName || "Your Company",
    companyAddress: map.companyAddress || "",
    companyCity: map.companyCity || "",
    companyPostalCode: map.companyPostalCode || "",
    companyEmail: map.companyEmail || "",
    companyPhone: map.companyPhone || "",
    companyTaxId: map.companyTaxId || "",
    currency: map.currency || "USD",
    logo: map.logo,
    paymentMethods: map.paymentMethods || "Bank Transfer",
    bankAccount: map.bankAccount || "",
    paymentTerms: map.paymentTerms || "Due in 30 days",
    defaultNotes: map.defaultNotes || "",
    companyCountryCode: map.companyCountryCode || ""
  };
  // Optional PEPPOL endpoint IDs if configured in settings
  const xml = generateUBLInvoiceXML(invoice, businessSettings, {
    sellerEndpointId: map.peppolSellerEndpointId,
    sellerEndpointSchemeId: map.peppolSellerEndpointSchemeId,
    buyerEndpointId: map.peppolBuyerEndpointId,
    buyerEndpointSchemeId: map.peppolBuyerEndpointSchemeId,
    sellerCountryCode: map.companyCountryCode,
    buyerCountryCode: invoice.customer.countryCode
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber || id}.xml"`
    }
  });
});
// Generic XML export selecting an internal profile (?profile=ubl21 or stub-generic)
adminRoutes.get("/invoices/:id/xml", requirePermission("invoices", "export"), async (c)=>{
  const id = c.req.param("id");
  const invoice = getInvoiceById(id);
  if (!invoice) return c.json({
    message: "Invoice not found"
  }, 404);
  const settings = await getSettings();
  const map = settings.reduce((acc, s)=>{
    acc[s.key] = s.value;
    return acc;
  }, {});
  const businessSettings = {
    companyName: map.companyName || "Your Company",
    companyAddress: map.companyAddress || "",
    companyCity: map.companyCity || "",
    companyPostalCode: map.companyPostalCode || "",
    companyEmail: map.companyEmail || "",
    companyPhone: map.companyPhone || "",
    companyTaxId: map.companyTaxId || "",
    currency: map.currency || "USD",
    logo: map.logo,
    paymentMethods: map.paymentMethods || "Bank Transfer",
    bankAccount: map.bankAccount || "",
    paymentTerms: map.paymentTerms || "Due in 30 days",
    defaultNotes: map.defaultNotes || "",
    companyCountryCode: map.companyCountryCode || ""
  };
  const url = new URL(c.req.url);
  const profileParam = url.searchParams.get("profile") || map.xmlProfileId || undefined;
  const { xml, profile } = generateInvoiceXML(profileParam, invoice, businessSettings, {
    sellerEndpointId: map.peppolSellerEndpointId,
    sellerEndpointSchemeId: map.peppolSellerEndpointSchemeId,
    buyerEndpointId: map.peppolBuyerEndpointId,
    buyerEndpointSchemeId: map.peppolBuyerEndpointSchemeId,
    sellerCountryCode: map.companyCountryCode,
    buyerCountryCode: invoice.customer.countryCode
  });
  return new Response(xml, {
    headers: {
      "Content-Type": `${profile.mediaType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber || id}.${profile.fileExtension}"`
    }
  });
});
// List built-in XML profiles
adminRoutes.get("/xml-profiles", requirePermission("invoices", "read"), (c)=>{
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
// =============================================
// User management routes
// =============================================
adminRoutes.use("/users/*", requireAdminAuth);
// GET /users/me — current authenticated user (any authenticated user)
adminRoutes.get("/users/me", (c)=>{
  const user = getAuthUser(c);
  if (!user) return c.json({
    error: "Not authenticated"
  }, 401);
  // Return user info with permissions and available RESOURCE_ACTIONS map
  return c.json({
    ...user,
    availableResources: RESOURCE_ACTIONS
  });
});
adminRoutes.post("/users/me/2fa/setup", (c)=>{
  if (DEMO_MODE) {
    return c.json({
      error: "2FA is not available in demo mode"
    }, 403);
  }
  const user = getAuthUser(c);
  if (!user) return c.json({
    error: "Not authenticated"
  }, 401);
  const setup = createPendingTwoFactorSetup(user.id, user.username);
  return c.json({
    otpAuthUrl: setup.otpAuthUrl,
    expiresIn: setup.expiresIn
  });
});
adminRoutes.post("/users/me/2fa/verify", async (c)=>{
  if (DEMO_MODE) {
    return c.json({
      error: "2FA is not available in demo mode"
    }, 403);
  }
  const user = getAuthUser(c);
  if (!user) return c.json({
    error: "Not authenticated"
  }, 401);
  let token;
  try {
    const body = await c.req.json();
    if (body && typeof body.token === "string") token = body.token;
  } catch  {
  // ignore parse errors
  }
  if (!token) return c.json({
    error: "Missing 2FA token"
  }, 400);
  const result = verifyPendingTwoFactorSetup(user.id, user.username, token);
  if (!result.ok) return c.json({
    error: result.reason
  }, 400);
  const recoveryCodes = generateRecoveryCodes();
  const recoveryCodeHashes = await hashRecoveryCodes(recoveryCodes);
  const encryptedSecret = await encryptTwoFactorSecret(result.secretBase32);
  setUserTwoFactorState(user.id, encryptedSecret, recoveryCodeHashes);
  return c.json({
    twoFactorEnabled: true,
    recoveryCodes
  });
});
adminRoutes.delete("/users/me/2fa", async (c)=>{
  if (DEMO_MODE) {
    return c.json({
      error: "2FA is not available in demo mode"
    }, 403);
  }
  const user = getAuthUser(c);
  if (!user) return c.json({
    error: "Not authenticated"
  }, 401);
  let token;
  try {
    const body = await c.req.json();
    if (body && typeof body.token === "string") token = body.token;
  } catch  {
  // ignore parse errors
  }
  if (!token) return c.json({
    error: "Missing 2FA token"
  }, 400);
  const state = getUserTwoFactorState(user.id);
  if (!state?.enabled || !state.encryptedSecret) {
    return c.json({
      error: "2FA is not enabled"
    }, 400);
  }
  const secret = await decryptTwoFactorSecret(state.encryptedSecret);
  if (!secret || !verifyTotpToken(secret, user.username, token)) {
    return c.json({
      error: "Invalid 2FA token"
    }, 401);
  }
  disableUserTwoFactor(user.id);
  return c.json({
    twoFactorEnabled: false
  });
});
// GET /users/permissions-schema — returns the valid resources and actions
adminRoutes.get("/users/permissions-schema", (c)=>{
  const user = getAuthUser(c);
  const canViewSchema = !!user && (user.isAdmin || user.permissions.some((p)=>p.resource === "users" && (p.action === "read" || p.action === "create" || p.action === "update")));
  if (!canViewSchema) {
    return c.json({
      error: "Missing permission: users:read|create|update"
    }, 403);
  }
  return c.json({
    resources: RESOURCES,
    resourceActions: RESOURCE_ACTIONS
  });
});
// GET /users — list all users
adminRoutes.get("/users", requirePermission("users", "read"), (c)=>{
  const users = listUsers();
  return c.json(users);
});
// POST /users — create a new user
adminRoutes.post("/users", requirePermission("users", "create"), async (c)=>{
  try {
    const data = await c.req.json();
    const user = await createUserCtrl(data);
    return c.json(user, 201);
  } catch (e) {
    const msg = String(e);
    if (/already exists/i.test(msg)) return c.json({
      error: msg
    }, 409);
    return c.json({
      error: msg
    }, 400);
  }
});
// GET /users/:id — get user details
adminRoutes.get("/users/:id", requirePermission("users", "read"), (c)=>{
  const id = c.req.param("id");
  const user = getUserByIdCtrl(id);
  if (!user) return c.json({
    error: "User not found"
  }, 404);
  return c.json(user);
});
// PUT /users/:id — update user
adminRoutes.put("/users/:id", requirePermission("users", "update"), async (c)=>{
  const id = c.req.param("id");
  try {
    const data = await c.req.json();
    const currentUser = getAuthUser(c);
    // Prevent admin from demoting themselves
    if (currentUser.id === id && data.isAdmin === false) {
      return c.json({
        error: "Cannot remove your own admin status"
      }, 400);
    }
    // Prevent admin from deactivating themselves
    if (currentUser.id === id && data.isActive === false) {
      return c.json({
        error: "Cannot deactivate your own account"
      }, 400);
    }
    const user = await updateUserCtrl(id, data);
    return c.json(user);
  } catch (e) {
    const msg = String(e);
    if (/already exists/i.test(msg)) return c.json({
      error: msg
    }, 409);
    if (/not found/i.test(msg)) return c.json({
      error: msg
    }, 404);
    return c.json({
      error: msg
    }, 400);
  }
});
// DELETE /users/:id — delete user
adminRoutes.delete("/users/:id", requirePermission("users", "delete"), (c)=>{
  const id = c.req.param("id");
  try {
    deleteUserCtrl(id);
    return c.json({
      success: true
    });
  } catch (e) {
    const msg = String(e);
    if (/not found/i.test(msg)) return c.json({
      error: msg
    }, 404);
    if (/last admin/i.test(msg)) return c.json({
      error: msg
    }, 400);
    return c.json({
      error: msg
    }, 400);
  }
});
export { adminRoutes };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL3JvdXRlcy9hZG1pbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAdHMtbm9jaGVjazogcm91dGUgaGFuZGxlcnMgdXNlIEhvbm8gY29udGV4dCB3aXRob3V0IHR5cGluZ3MgdG8ga2VlcCBlZGl0cyBtaW5pbWFsXG5pbXBvcnQgeyBIb25vIH0gZnJvbSBcImhvbm9cIjtcbmltcG9ydCB7XG4gIGNyZWF0ZUludm9pY2UsXG4gIGRlbGV0ZUludm9pY2UsXG4gIGR1cGxpY2F0ZUludm9pY2UsXG4gIGdldEludm9pY2VCeUlkLFxuICBnZXRJbnZvaWNlcyxcbiAgZ2V0TGF0ZXN0UGFpZFBheW1lbnRNZXRob2RzLFxuICBwdWJsaXNoSW52b2ljZSxcbiAgdW5wdWJsaXNoSW52b2ljZSxcbiAgdXBkYXRlSW52b2ljZSxcbiAgdm9pZEludm9pY2UsXG59IGZyb20gXCIuLi9jb250cm9sbGVycy9pbnZvaWNlcy50c1wiO1xuaW1wb3J0IHtcbiAgY3JlYXRlVGVtcGxhdGUsXG4gIGRlbGV0ZVRlbXBsYXRlLFxuICBnZXRUZW1wbGF0ZUJ5SWQsXG4gIGdldFRlbXBsYXRlcyxcbiAgaW5zdGFsbExvY2FsVGVtcGxhdGVGcm9tWmlwLFxuICBpbnN0YWxsVGVtcGxhdGVGcm9tTWFuaWZlc3QsXG4gIGxvYWRUZW1wbGF0ZUZyb21GaWxlLFxuICByZW5kZXJUZW1wbGF0ZSxcbiAgc2V0RGVmYXVsdFRlbXBsYXRlLFxufSBmcm9tIFwiLi4vY29udHJvbGxlcnMvdGVtcGxhdGVzLnRzXCI7XG5pbXBvcnQge1xuICBkZWxldGVTZXR0aW5nLFxuICBnZXRTZXR0aW5nLFxuICBnZXRTZXR0aW5ncyxcbiAgc2V0U2V0dGluZyxcbiAgdXBkYXRlU2V0dGluZ3MsXG59IGZyb20gXCIuLi9jb250cm9sbGVycy9zZXR0aW5ncy50c1wiO1xuaW1wb3J0IHtcbiAgY3JlYXRlQ3VzdG9tZXIsXG4gIGRlbGV0ZUN1c3RvbWVyLFxuICBnZXRDdXN0b21lckJ5SWQsXG4gIGdldEN1c3RvbWVycyxcbiAgdXBkYXRlQ3VzdG9tZXIsXG59IGZyb20gXCIuLi9jb250cm9sbGVycy9jdXN0b21lcnMudHNcIjtcbmltcG9ydCB7XG4gIGNyZWF0ZVByb2R1Y3QsXG4gIGRlbGV0ZVByb2R1Y3QsXG4gIGdldFByb2R1Y3RCeUlkLFxuICBnZXRQcm9kdWN0cyxcbiAgaXNQcm9kdWN0VXNlZEluSW52b2ljZXMsXG4gIHJlYWN0aXZhdGVQcm9kdWN0LFxuICB1cGRhdGVQcm9kdWN0LFxufSBmcm9tIFwiLi4vY29udHJvbGxlcnMvcHJvZHVjdHMudHNcIjtcbmltcG9ydCB7XG4gIGNyZWF0ZVRheERlZmluaXRpb24sXG4gIGRlbGV0ZVRheERlZmluaXRpb24sXG4gIGdldFRheERlZmluaXRpb25CeUlkLFxuICBnZXRUYXhEZWZpbml0aW9ucyxcbiAgdXBkYXRlVGF4RGVmaW5pdGlvbixcbn0gZnJvbSBcIi4uL2NvbnRyb2xsZXJzL3RheERlZmluaXRpb25zLnRzXCI7XG5pbXBvcnQge1xuICBjcmVhdGVDYXRlZ29yeSxcbiAgY3JlYXRlVW5pdCxcbiAgZGVsZXRlQ2F0ZWdvcnksXG4gIGRlbGV0ZVVuaXQsXG4gIGdldENhdGVnb3JpZXMsXG4gIGdldFVuaXRzLFxuICBpc0NhdGVnb3J5VXNlZCxcbiAgaXNVbml0VXNlZCxcbiAgdXBkYXRlQ2F0ZWdvcnksXG4gIHVwZGF0ZVVuaXQsXG59IGZyb20gXCIuLi9jb250cm9sbGVycy9wcm9kdWN0T3B0aW9ucy50c1wiO1xuaW1wb3J0IHsgYnVpbGRJbnZvaWNlSFRNTCwgZ2VuZXJhdGVQREYgfSBmcm9tIFwiLi4vdXRpbHMvcGRmLnRzXCI7XG5pbXBvcnQgeyBpc0VtYWlsQ29uZmlndXJlZCwgc2VuZEVtYWlsIH0gZnJvbSBcIi4uL3V0aWxzL2VtYWlsLnRzXCI7XG5pbXBvcnQgeyBnZW5lcmF0ZVVCTEludm9pY2VYTUwgfSBmcm9tIFwiLi4vdXRpbHMvdWJsLnRzXCI7IC8vIGxlZ2FjeSBkaXJlY3QgaW1wb3J0XG5pbXBvcnQgeyBnZW5lcmF0ZUludm9pY2VYTUwsIGxpc3RYTUxQcm9maWxlcyB9IGZyb20gXCIuLi91dGlscy94bWxQcm9maWxlcy50c1wiO1xuaW1wb3J0IHtcbiAgbm9ybWFsaXplSW52b2ljZUxvY2FsZVNldHRpbmcsXG4gIHJlc29sdmVJbnZvaWNlUmVuZGVyTG9jYWxlLFxufSBmcm9tIFwiLi4vaTE4bi90cmFuc2xhdGlvbnMudHNcIjtcblxuaW1wb3J0IHsgcmVzZXREYXRhYmFzZUZyb21EZW1vIH0gZnJvbSBcIi4uL2RhdGFiYXNlL2luaXQudHNcIjtcbmltcG9ydCB7IGdldE5leHRJbnZvaWNlTnVtYmVyIH0gZnJvbSBcIi4uL2RhdGFiYXNlL2luaXQudHNcIjtcbmltcG9ydCB7IGlzRGVtb01vZGUgfSBmcm9tIFwiLi4vdXRpbHMvZW52LnRzXCI7XG5pbXBvcnQge1xuICBub3JtYWxpemVTdG9yZWRMb2dvUmVmZXJlbmNlLFxuICBzYXZlRGF0YVVybExvZ28sXG4gIHNhdmVVcGxvYWRlZExvZ29GaWxlLFxufSBmcm9tIFwiLi4vdXRpbHMvbG9nb1N0b3JhZ2UudHNcIjtcbmltcG9ydCB7XG4gIGdldEF1dGhVc2VyLFxuICByZXF1aXJlQWRtaW5BdXRoLFxuICByZXF1aXJlUGVybWlzc2lvbixcbn0gZnJvbSBcIi4uL21pZGRsZXdhcmUvYXV0aC50c1wiO1xuaW1wb3J0IHtcbiAgY3JlYXRlVXNlciBhcyBjcmVhdGVVc2VyQ3RybCxcbiAgZGVsZXRlVXNlciBhcyBkZWxldGVVc2VyQ3RybCxcbiAgZGlzYWJsZVVzZXJUd29GYWN0b3IsXG4gIGdldFVzZXJCeUlkIGFzIGdldFVzZXJCeUlkQ3RybCxcbiAgZ2V0VXNlclR3b0ZhY3RvclN0YXRlLFxuICBsaXN0VXNlcnMsXG4gIHNldFVzZXJUd29GYWN0b3JTdGF0ZSxcbiAgdXBkYXRlVXNlciBhcyB1cGRhdGVVc2VyQ3RybCxcbn0gZnJvbSBcIi4uL2NvbnRyb2xsZXJzL3VzZXJzLnRzXCI7XG5pbXBvcnQgeyBSRVNPVVJDRV9BQ1RJT05TLCBSRVNPVVJDRVMgfSBmcm9tIFwiLi4vdHlwZXMvaW5kZXgudHNcIjtcbmltcG9ydCB7XG4gIGNyZWF0ZVBlbmRpbmdUd29GYWN0b3JTZXR1cCxcbiAgZGVjcnlwdFR3b0ZhY3RvclNlY3JldCxcbiAgZW5jcnlwdFR3b0ZhY3RvclNlY3JldCxcbiAgZ2VuZXJhdGVSZWNvdmVyeUNvZGVzLFxuICBoYXNoUmVjb3ZlcnlDb2RlcyxcbiAgdmVyaWZ5UGVuZGluZ1R3b0ZhY3RvclNldHVwLFxuICB2ZXJpZnlUb3RwVG9rZW4sXG59IGZyb20gXCIuLi91dGlscy90d29GYWN0b3IudHNcIjtcblxuY29uc3QgYWRtaW5Sb3V0ZXMgPSBuZXcgSG9ubygpO1xuXG4vLyBOb3JtYWxpemUgdGF4LXJlbGF0ZWQgc2V0dGluZ3MgY29taW5nIGZyb20gdGhlIGNsaWVudCB0byByb2J1c3QgY2Fub25pY2FsIGZvcm1zXG5mdW5jdGlvbiBub3JtYWxpemVUYXhTZXR0aW5nc1BheWxvYWQoZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHtcbiAgLy8gZGVmYXVsdFRheFJhdGU6IHBhcnNlIHRvIGZpbml0ZSBub24tbmVnYXRpdmUgbnVtYmVyLCBzdG9yZSBhcyBjYW5vbmljYWwgc3RyaW5nXG4gIGlmIChkYXRhICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBcImRlZmF1bHRUYXhSYXRlXCIpKSB7XG4gICAgY29uc3QgcmF3ID0gU3RyaW5nKFxuICAgICAgKGRhdGEgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW1wiZGVmYXVsdFRheFJhdGVcIl0gPz8gXCJcIixcbiAgICApLnRyaW0oKTtcbiAgICBjb25zdCBub3JtID0gcmF3LnJlcGxhY2UoXCIsXCIsIFwiLlwiKTtcbiAgICBjb25zdCBuID0gTnVtYmVyKG5vcm0pO1xuICAgIGlmICghaXNGaW5pdGUobikgfHwgaXNOYU4obikgfHwgbiA8IDApIHtcbiAgICAgIC8vIFJlbW92ZSBpbnZhbGlkIHZhbHVlIHRvIGF2b2lkIHBlcnNpc3RpbmcganVua1xuICAgICAgZGVsZXRlIChkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtcImRlZmF1bHRUYXhSYXRlXCJdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBLZWVwIGEgdHJpbW1lZCBjYW5vbmljYWwgbnVtZXJpYyBzdHJpbmcgKGF2b2lkIHRyYWlsaW5nIHNwYWNlcylcbiAgICAgIChkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtcImRlZmF1bHRUYXhSYXRlXCJdID0gU3RyaW5nKG4pO1xuICAgIH1cbiAgfVxuXG4gIC8vIGRlZmF1bHRQcmljZXNJbmNsdWRlVGF4OiBub3JtYWxpemUgdG8gXCJ0cnVlXCIgfCBcImZhbHNlXCJcbiAgaWYgKFxuICAgIGRhdGEgJiZcbiAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZGF0YSwgXCJkZWZhdWx0UHJpY2VzSW5jbHVkZVRheFwiKVxuICApIHtcbiAgICBjb25zdCB2ID0gU3RyaW5nKFxuICAgICAgKGRhdGEgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW1wiZGVmYXVsdFByaWNlc0luY2x1ZGVUYXhcIl0gPz8gXCJcIixcbiAgICApXG4gICAgICAudG9Mb3dlckNhc2UoKVxuICAgICAgLnRyaW0oKTtcbiAgICBjb25zdCB0cnV0aHkgPSBuZXcgU2V0KFtcIjFcIiwgXCJ0cnVlXCIsIFwieWVzXCIsIFwieVwiLCBcIm9uXCJdKTtcbiAgICAoZGF0YSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbXCJkZWZhdWx0UHJpY2VzSW5jbHVkZVRheFwiXSA9IHRydXRoeS5oYXModilcbiAgICAgID8gXCJ0cnVlXCJcbiAgICAgIDogXCJmYWxzZVwiO1xuICB9XG5cbiAgLy8gZGVmYXVsdFJvdW5kaW5nTW9kZTogbm9ybWFsaXplIHRvIFwibGluZVwiIHwgXCJ0b3RhbFwiIChkZWZhdWx0IGxpbmUpXG4gIGlmIChcbiAgICBkYXRhICYmXG4gICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGRhdGEsIFwiZGVmYXVsdFJvdW5kaW5nTW9kZVwiKVxuICApIHtcbiAgICBjb25zdCB2ID0gU3RyaW5nKFxuICAgICAgKGRhdGEgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW1wiZGVmYXVsdFJvdW5kaW5nTW9kZVwiXSA/PyBcIlwiLFxuICAgIClcbiAgICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgICAudHJpbSgpO1xuICAgIChkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtcImRlZmF1bHRSb3VuZGluZ01vZGVcIl0gPSB2ID09PSBcInRvdGFsXCJcbiAgICAgID8gXCJ0b3RhbFwiXG4gICAgICA6IFwibGluZVwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUxvY2FsZVNldHRpbmdQYXlsb2FkKGRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gIGlmICghZGF0YSkgcmV0dXJuO1xuXG4gIC8vIEFjY2VwdCBjb21tb24gYWxpYXNlcyBhbmQgbm9ybWFsaXplIHRvIGNhbm9uaWNhbCBrZXlzXG4gIGlmIChcbiAgICAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGRhdGEsIFwiZGF0ZUZvcm1hdFwiKSAmJlxuICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBcImRhdGVfZm9ybWF0XCIpXG4gICkge1xuICAgIChkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5kYXRlRm9ybWF0ID0gKFxuICAgICAgZGF0YSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuICAgICkuZGF0ZV9mb3JtYXQ7XG4gICAgZGVsZXRlIChkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5kYXRlX2Zvcm1hdDtcbiAgfVxuICBpZiAoXG4gICAgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBcIm51bWJlckZvcm1hdFwiKSAmJlxuICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBcIm51bWJlcl9mb3JtYXRcIilcbiAgKSB7XG4gICAgKGRhdGEgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLm51bWJlckZvcm1hdCA9IChcbiAgICAgIGRhdGEgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbiAgICApLm51bWJlcl9mb3JtYXQ7XG4gICAgZGVsZXRlIChkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5udW1iZXJfZm9ybWF0O1xuICB9XG5cbiAgLy8gQWNjZXB0IGNvbW1vbiBhbGlhc2VzIGFuZCBub3JtYWxpemUgdG8gY2Fub25pY2FsIGtleVxuICBpZiAoXG4gICAgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBcInBvc3RhbENpdHlGb3JtYXRcIikgJiZcbiAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZGF0YSwgXCJwb3N0YWxfY2l0eV9mb3JtYXRcIilcbiAgKSB7XG4gICAgKGRhdGEgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLnBvc3RhbENpdHlGb3JtYXQgPSAoXG4gICAgICBkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+XG4gICAgKS5wb3N0YWxfY2l0eV9mb3JtYXQ7XG4gICAgZGVsZXRlIChkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5wb3N0YWxfY2l0eV9mb3JtYXQ7XG4gIH1cbiAgaWYgKFxuICAgICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZGF0YSwgXCJwb3N0YWxDaXR5Rm9ybWF0XCIpICYmXG4gICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGRhdGEsIFwicG9zdGFsY2l0eWZvcm1hdFwiKVxuICApIHtcbiAgICAoZGF0YSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikucG9zdGFsQ2l0eUZvcm1hdCA9IChcbiAgICAgIGRhdGEgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbiAgICApLnBvc3RhbGNpdHlmb3JtYXQ7XG4gICAgZGVsZXRlIChkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5wb3N0YWxjaXR5Zm9ybWF0O1xuICB9XG5cbiAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBcImxvY2FsZVwiKSkge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVJbnZvaWNlTG9jYWxlU2V0dGluZyhkYXRhLmxvY2FsZSk7XG4gICAgaWYgKG5vcm1hbGl6ZWQpIGRhdGEubG9jYWxlID0gbm9ybWFsaXplZDtcbiAgICBlbHNlIGRlbGV0ZSBkYXRhLmxvY2FsZTtcbiAgfVxuXG4gIC8vIEVtcHR5IHZhbHVlIGlzIGtlcHQgc28gdGhlIHNldHRpbmdzIGNvbnRyb2xsZXIgY2xlYXJzIHRoZSBzdG9yZWQgZmFsbGJhY2tcbiAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBcImludm9pY2VGYWxsYmFja0xvY2FsZVwiKSkge1xuICAgIGRhdGEuaW52b2ljZUZhbGxiYWNrTG9jYWxlID1cbiAgICAgIG5vcm1hbGl6ZUludm9pY2VMb2NhbGVTZXR0aW5nKGRhdGEuaW52b2ljZUZhbGxiYWNrTG9jYWxlKSA/PyBcIlwiO1xuICB9XG5cbiAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBcInBvc3RhbENpdHlGb3JtYXRcIikpIHtcbiAgICBjb25zdCByYXdGb3JtYXQgPSBTdHJpbmcoZGF0YS5wb3N0YWxDaXR5Rm9ybWF0ID8/IFwiXCIpXG4gICAgICAudHJpbSgpXG4gICAgICAudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAocmF3Rm9ybWF0ID09PSBcImNpdHktcG9zdGFsXCIgfHwgcmF3Rm9ybWF0ID09PSBcInBvc3RhbC1jaXR5XCIpIHtcbiAgICAgIChkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5wb3N0YWxDaXR5Rm9ybWF0ID0gcmF3Rm9ybWF0O1xuICAgIH0gZWxzZSB7XG4gICAgICAoZGF0YSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikucG9zdGFsQ2l0eUZvcm1hdCA9IFwiYXV0b1wiO1xuICAgIH1cbiAgfVxuXG4gIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZGF0YSwgXCJudW1iZXJGb3JtYXRcIikpIHtcbiAgICBjb25zdCByYXdOdW1iZXJGb3JtYXQgPSBTdHJpbmcoZGF0YS5udW1iZXJGb3JtYXQgPz8gXCJcIilcbiAgICAgIC50cmltKClcbiAgICAgIC50b0xvd2VyQ2FzZSgpO1xuICAgIChkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5udW1iZXJGb3JtYXQgPVxuICAgICAgcmF3TnVtYmVyRm9ybWF0ID09PSBcInBlcmlvZFwiID8gXCJwZXJpb2RcIiA6IFwiY29tbWFcIjtcbiAgfVxuXG4gIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZGF0YSwgXCJkYXRlRm9ybWF0XCIpKSB7XG4gICAgY29uc3QgcmF3RGF0ZUZvcm1hdCA9IFN0cmluZyhkYXRhLmRhdGVGb3JtYXQgPz8gXCJcIikudHJpbSgpO1xuICAgIChkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5kYXRlRm9ybWF0ID1cbiAgICAgIHJhd0RhdGVGb3JtYXQgPT09IFwiREQuTU0uWVlZWVwiID8gXCJERC5NTS5ZWVlZXCIgOiBcIllZWVktTU0tRERcIjtcbiAgfVxufVxuXG5mdW5jdGlvbiBub3JtYWxpemVJbnZvaWNlUHJvdGVjdGlvblNldHRpbmdzUGF5bG9hZChcbiAgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4pIHtcbiAgaWYgKFxuICAgICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZGF0YSwgXCJhbGxvd1Byb3RlY3RlZEludm9pY2VDaGFuZ2VzXCIpXG4gICkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCByYXcgPSBTdHJpbmcoZGF0YS5hbGxvd1Byb3RlY3RlZEludm9pY2VDaGFuZ2VzID8/IFwiXCIpXG4gICAgLnRvTG93ZXJDYXNlKClcbiAgICAudHJpbSgpO1xuICBjb25zdCB0cnV0aHkgPSBuZXcgU2V0KFtcIjFcIiwgXCJ0cnVlXCIsIFwieWVzXCIsIFwieVwiLCBcIm9uXCJdKTtcbiAgKGRhdGEgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLmFsbG93UHJvdGVjdGVkSW52b2ljZUNoYW5nZXMgPSB0cnV0aHkuaGFzKFxuICAgICAgcmF3LFxuICAgIClcbiAgICA/IFwidHJ1ZVwiXG4gICAgOiBcImZhbHNlXCI7XG59XG5cbi8vIERlbW8gbW9kZSBmbGFnIChtdXRhdGlvbnMgYWxsb3dlZDsgcGVyaW9kaWMgcmVzZXRzIGhhbmRsZSByZXZlcnRpbmcgc3RhdGUpXG5jb25zdCBERU1PX01PREUgPSBpc0RlbW9Nb2RlKCk7XG5cbmFkbWluUm91dGVzLnVzZShcIi9pbnZvaWNlcy8qXCIsIHJlcXVpcmVBZG1pbkF1dGgpO1xuXG5hZG1pblJvdXRlcy51c2UoXCIvY3VzdG9tZXJzLypcIiwgcmVxdWlyZUFkbWluQXV0aCk7XG5cbmFkbWluUm91dGVzLnVzZShcIi9wcm9kdWN0cy8qXCIsIHJlcXVpcmVBZG1pbkF1dGgpO1xuXG5hZG1pblJvdXRlcy51c2UoXCIvdGVtcGxhdGVzLypcIiwgcmVxdWlyZUFkbWluQXV0aCk7XG5cbmFkbWluUm91dGVzLnVzZShcIi90YXgtZGVmaW5pdGlvbnMvKlwiLCByZXF1aXJlQWRtaW5BdXRoKTtcblxuYWRtaW5Sb3V0ZXMudXNlKFwiL3Byb2R1Y3QtY2F0ZWdvcmllcy8qXCIsIHJlcXVpcmVBZG1pbkF1dGgpO1xuXG5hZG1pblJvdXRlcy51c2UoXCIvcHJvZHVjdC11bml0cy8qXCIsIHJlcXVpcmVBZG1pbkF1dGgpO1xuXG5hZG1pblJvdXRlcy51c2UoXCIvc2V0dGluZ3NcIiwgcmVxdWlyZUFkbWluQXV0aCk7XG5cbmFkbWluUm91dGVzLnVzZShcIi9zZXR0aW5ncy8qXCIsIHJlcXVpcmVBZG1pbkF1dGgpO1xuXG4vLyBQcm90ZWN0IGFkbWluIGFsaWFzIHJvdXRlcyBhcyB3ZWxsXG5hZG1pblJvdXRlcy51c2UoXCIvYWRtaW4vKlwiLCByZXF1aXJlQWRtaW5BdXRoKTtcblxuLy8gUHJvdGVjdCBleHBvcnQgcm91dGVzXG5hZG1pblJvdXRlcy51c2UoXCIvZXhwb3J0LypcIiwgcmVxdWlyZUFkbWluQXV0aCk7XG5cbi8vIERlbW8gaGVscGVyOiB0cmlnZ2VyIGFuIGltbWVkaWF0ZSByZXNldCAob25seSBlZmZlY3RpdmUgd2hlbiBERU1PX01PREU9dHJ1ZSlcbmFkbWluUm91dGVzLnBvc3QoXCIvYWRtaW4vZGVtby9yZXNldFwiLCBhc3luYyAoYykgPT4ge1xuICBpZiAoIURFTU9fTU9ERSkgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIkRlbW8gbW9kZSBpcyBub3QgZW5hYmxlZFwiIH0sIDQwMCk7XG4gIHRyeSB7XG4gICAgYXdhaXQgcmVzZXREYXRhYmFzZUZyb21EZW1vKCk7XG4gICAgcmV0dXJuIGMuanNvbih7IG9rOiB0cnVlIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBTdHJpbmcoZSkgfSwgNTAwKTtcbiAgfVxufSk7XG5cbi8vIEludm9pY2Ugcm91dGVzXG5hZG1pblJvdXRlcy5nZXQoXG4gIFwiL2ludm9pY2VzL25leHQtbnVtYmVyXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwiaW52b2ljZXNcIiwgXCJjcmVhdGVcIiksXG4gIChjKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGN1c3RvbWVySWQgPSBjLnJlcS5xdWVyeShcImN1c3RvbWVySWRcIikgfHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3QgbmV4dCA9IGdldE5leHRJbnZvaWNlTnVtYmVyKGN1c3RvbWVySWQpO1xuICAgICAgcmV0dXJuIGMuanNvbih7IG5leHQgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBTdHJpbmcoZSkgfSwgNTAwKTtcbiAgICB9XG4gIH0sXG4pO1xuYWRtaW5Sb3V0ZXMucG9zdChcbiAgXCIvaW52b2ljZXNcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJpbnZvaWNlc1wiLCBcImNyZWF0ZVwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgYy5yZXEuanNvbigpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBpbnZvaWNlID0gY3JlYXRlSW52b2ljZShkYXRhKTtcbiAgICAgIHJldHVybiBjLmpzb24oaW52b2ljZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc3QgbXNnID0gU3RyaW5nKGUpO1xuICAgICAgaWYgKC9hbHJlYWR5IGV4aXN0cy9pLnRlc3QobXNnKSkge1xuICAgICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IG1zZyB9LCA0MDkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBtc2cgfSwgNDAwKTtcbiAgICB9XG4gIH0sXG4pO1xuXG5hZG1pblJvdXRlcy5nZXQoXCIvaW52b2ljZXNcIiwgcmVxdWlyZVBlcm1pc3Npb24oXCJpbnZvaWNlc1wiLCBcInJlYWRcIiksIChjKSA9PiB7XG4gIGNvbnN0IGludm9pY2VzID0gZ2V0SW52b2ljZXMoKTtcblxuICAvLyBMb29rIHVwIHBheW1lbnQgbWV0aG9kcyBmb3IgcGFpZCBhbmQgY29tcGxldGUgaW52b2ljZXMg4oCUIGNvbXBsZXRlIGludm9pY2VzXG4gIC8vIHdlcmUgcHJldmlvdXNseSBwYWlkIGFuZCB0aGVpciBwYXltZW50IG1ldGhvZCBzaG91bGQgcmVtYWluIHZpc2libGUuXG4gIGNvbnN0IHBhaWRJZHMgPSBpbnZvaWNlc1xuICAgIC5maWx0ZXIoKGludikgPT4gaW52LnN0YXR1cyA9PT0gXCJwYWlkXCIgfHwgaW52LnN0YXR1cyA9PT0gXCJjb21wbGV0ZVwiKVxuICAgIC5tYXAoKGludikgPT4gaW52LmlkKTtcbiAgY29uc3QgcGF5bWVudE1ldGhvZHMgPSBnZXRMYXRlc3RQYWlkUGF5bWVudE1ldGhvZHMocGFpZElkcyk7XG5cbiAgY29uc3QgbGlzdCA9IGludm9pY2VzLm1hcCgoaW52KSA9PiB7XG4gICAgbGV0IGN1c3RvbWVyTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjdXN0b21lciA9IGdldEN1c3RvbWVyQnlJZChpbnYuY3VzdG9tZXJJZCk7XG4gICAgICBjdXN0b21lck5hbWUgPSBjdXN0b21lcj8ubmFtZTtcbiAgICB9IGNhdGNoIChfZSkge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICAgIGNvbnN0IGlzc3VlX2RhdGUgPSBpbnYuaXNzdWVEYXRlXG4gICAgICA/IG5ldyBEYXRlKGludi5pc3N1ZURhdGUpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApXG4gICAgICA6IHVuZGVmaW5lZDtcbiAgICByZXR1cm4ge1xuICAgICAgLi4uaW52LFxuICAgICAgY3VzdG9tZXI6IGN1c3RvbWVyTmFtZSA/IHsgbmFtZTogY3VzdG9tZXJOYW1lIH0gOiB1bmRlZmluZWQsXG4gICAgICBpc3N1ZV9kYXRlLFxuICAgICAgcGFpZFdpdGg6IHBheW1lbnRNZXRob2RzLmdldChpbnYuaWQpLFxuICAgIH0gYXMgdW5rbm93bjtcbiAgfSk7XG4gIHJldHVybiBjLmpzb24obGlzdCk7XG59KTtcblxuYWRtaW5Sb3V0ZXMuZ2V0KFwiL2ludm9pY2VzLzppZFwiLCByZXF1aXJlUGVybWlzc2lvbihcImludm9pY2VzXCIsIFwicmVhZFwiKSwgKGMpID0+IHtcbiAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICBjb25zdCBpbnZvaWNlID0gZ2V0SW52b2ljZUJ5SWQoaWQpO1xuICBpZiAoIWludm9pY2UpIHtcbiAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiSW52b2ljZSBub3QgZm91bmRcIiB9LCA0MDQpO1xuICB9XG4gIC8vIEFkZCBzbmFrZV9jYXNlIGRhdGUgc3RyaW5ncyBmb3IgVUkgY29tcGF0aWJpbGl0eSAoc2FtZSBhcyBsaXN0IGVuZHBvaW50KVxuICBjb25zdCBpc3N1ZV9kYXRlID0gaW52b2ljZS5pc3N1ZURhdGVcbiAgICA/IG5ldyBEYXRlKGludm9pY2UuaXNzdWVEYXRlKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKVxuICAgIDogdW5kZWZpbmVkO1xuICBjb25zdCBkdWVfZGF0ZSA9IGludm9pY2UuZHVlRGF0ZVxuICAgID8gbmV3IERhdGUoaW52b2ljZS5kdWVEYXRlKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKVxuICAgIDogdW5kZWZpbmVkO1xuICByZXR1cm4gYy5qc29uKHsgLi4uaW52b2ljZSwgaXNzdWVfZGF0ZSwgZHVlX2RhdGUgfSk7XG59KTtcblxuYWRtaW5Sb3V0ZXMucHV0KFxuICBcIi9pbnZvaWNlcy86aWRcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJpbnZvaWNlc1wiLCBcInVwZGF0ZVwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBpZCA9IGMucmVxLnBhcmFtKFwiaWRcIik7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGMucmVxLmpzb24oKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgaW52b2ljZSA9IGF3YWl0IHVwZGF0ZUludm9pY2UoaWQsIGRhdGEpO1xuICAgICAgcmV0dXJuIGMuanNvbihpbnZvaWNlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zdCBtc2cgPSBTdHJpbmcoZSk7XG4gICAgICBpZiAoL2FscmVhZHkgZXhpc3RzL2kudGVzdChtc2cpKSB7XG4gICAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogbXNnIH0sIDQwOSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IG1zZyB9LCA0MDApO1xuICAgIH1cbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLmRlbGV0ZShcbiAgXCIvaW52b2ljZXMvOmlkXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwiaW52b2ljZXNcIiwgXCJkZWxldGVcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBkZWxldGVJbnZvaWNlKGlkKTtcbiAgICAgIHJldHVybiBjLmpzb24oeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogU3RyaW5nKGUpIH0sIDQwMCk7XG4gICAgfVxuICB9LFxuKTtcblxuYWRtaW5Sb3V0ZXMucG9zdChcbiAgXCIvaW52b2ljZXMvOmlkL3B1Ymxpc2hcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJpbnZvaWNlc1wiLCBcInB1Ymxpc2hcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwdWJsaXNoSW52b2ljZShpZCk7XG4gICAgICByZXR1cm4gYy5qc29uKHJlc3VsdCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBTdHJpbmcoZSkgfSwgNDAwKTtcbiAgICB9XG4gIH0sXG4pO1xuXG5hZG1pblJvdXRlcy5wb3N0KFxuICBcIi9pbnZvaWNlcy86aWQvdW5wdWJsaXNoXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwiaW52b2ljZXNcIiwgXCJwdWJsaXNoXCIpLFxuICBhc3luYyAoYykgPT4ge1xuICAgIGNvbnN0IGlkID0gYy5yZXEucGFyYW0oXCJpZFwiKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB1bnB1Ymxpc2hJbnZvaWNlKGlkKTtcbiAgICByZXR1cm4gYy5qc29uKHJlc3VsdCk7XG4gIH0sXG4pO1xuXG5hZG1pblJvdXRlcy5wb3N0KFxuICBcIi9pbnZvaWNlcy86aWQvZHVwbGljYXRlXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwiaW52b2ljZXNcIiwgXCJjcmVhdGVcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICAgIGNvbnN0IGNvcHkgPSBhd2FpdCBkdXBsaWNhdGVJbnZvaWNlKGlkKTtcbiAgICBpZiAoIWNvcHkpIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJJbnZvaWNlIG5vdCBmb3VuZFwiIH0sIDQwNCk7XG4gICAgcmV0dXJuIGMuanNvbihjb3B5KTtcbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLnBvc3QoXG4gIFwiL2ludm9pY2VzLzppZC92b2lkXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwiaW52b2ljZXNcIiwgXCJ2b2lkXCIpLFxuICBhc3luYyAoYykgPT4ge1xuICAgIGNvbnN0IGlkID0gYy5yZXEucGFyYW0oXCJpZFwiKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdm9pZEludm9pY2UoaWQpO1xuICAgICAgcmV0dXJuIGMuanNvbihyZXN1bHQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogU3RyaW5nKGUpIH0sIDQwMCk7XG4gICAgfVxuICB9LFxuKTtcblxuLy8gVGVtcGxhdGUgcm91dGVzXG5hZG1pblJvdXRlcy5nZXQoXG4gIFwiL3RlbXBsYXRlc1wiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInRlbXBsYXRlc1wiLCBcInJlYWRcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgbGV0IHRlbXBsYXRlcyA9IGF3YWl0IGdldFRlbXBsYXRlcygpO1xuICAgIC8vIE92ZXJsYXkgdGhlIGRlZmF1bHQgZnJvbSBzZXR0aW5ncyBpZiBwcmVzZW50OyBhbHNvIGNvbXB1dGUgJ3VwZGF0YWJsZScgZmxhZyB3aGVuIGEgbWFuaWZlc3Qgc291cmNlIGV4aXN0c1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzZXR0aW5ncyA9IGF3YWl0IGdldFNldHRpbmdzKCk7XG4gICAgICBjb25zdCBtYXAgPSBzZXR0aW5ncy5yZWR1Y2UoXG4gICAgICAgIChhY2M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIHMpID0+IHtcbiAgICAgICAgICBhY2Nbcy5rZXldID0gcy52YWx1ZSBhcyBzdHJpbmc7XG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSxcbiAgICAgICAge30gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgICAgICk7XG4gICAgICBjb25zdCBjdXJyZW50ID0gbWFwLnRlbXBsYXRlSWQ7XG4gICAgICBpZiAoY3VycmVudCkge1xuICAgICAgICB0ZW1wbGF0ZXMgPSB0ZW1wbGF0ZXMubWFwKCh0KSA9PiAoe1xuICAgICAgICAgIC4uLnQsXG4gICAgICAgICAgaXNEZWZhdWx0OiB0LmlkID09PSBjdXJyZW50LFxuICAgICAgICAgIHVwZGF0YWJsZTogISFtYXBbYHRlbXBsYXRlU291cmNlOiR7dC5pZH1gXSxcbiAgICAgICAgfSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGVtcGxhdGVzID0gdGVtcGxhdGVzLm1hcCgodCkgPT4gKHtcbiAgICAgICAgICAuLi50LFxuICAgICAgICAgIHVwZGF0YWJsZTogISFtYXBbYHRlbXBsYXRlU291cmNlOiR7dC5pZH1gXSxcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICAgIHJldHVybiBjLmpzb24odGVtcGxhdGVzKTtcbiAgfSxcbik7XG5cbi8vIFRheCBkZWZpbml0aW9uIHJvdXRlc1xuYWRtaW5Sb3V0ZXMuZ2V0KFxuICBcIi90YXgtZGVmaW5pdGlvbnNcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJ0YXhfZGVmaW5pdGlvbnNcIiwgXCJyZWFkXCIpLFxuICAoYykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBsaXN0ID0gZ2V0VGF4RGVmaW5pdGlvbnMoKTtcbiAgICAgIHJldHVybiBjLmpzb24obGlzdCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBTdHJpbmcoZSkgfSwgNTAwKTtcbiAgICB9XG4gIH0sXG4pO1xuXG5hZG1pblJvdXRlcy5nZXQoXG4gIFwiL3RheC1kZWZpbml0aW9ucy86aWRcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJ0YXhfZGVmaW5pdGlvbnNcIiwgXCJyZWFkXCIpLFxuICAoYykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBpZCA9IGMucmVxLnBhcmFtKFwiaWRcIik7XG4gICAgICBjb25zdCB0YXggPSBnZXRUYXhEZWZpbml0aW9uQnlJZChpZCk7XG4gICAgICBpZiAoIXRheCkgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIk5vdCBmb3VuZFwiIH0sIDQwNCk7XG4gICAgICByZXR1cm4gYy5qc29uKHRheCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBTdHJpbmcoZSkgfSwgNTAwKTtcbiAgICB9XG4gIH0sXG4pO1xuXG5hZG1pblJvdXRlcy5wb3N0KFxuICBcIi90YXgtZGVmaW5pdGlvbnNcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJ0YXhfZGVmaW5pdGlvbnNcIiwgXCJjcmVhdGVcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGMucmVxLmpzb24oKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY3JlYXRlZCA9IGNyZWF0ZVRheERlZmluaXRpb24oZGF0YSk7XG4gICAgICByZXR1cm4gYy5qc29uKGNyZWF0ZWQsIDIwMSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc3QgbXNnID0gU3RyaW5nKGUpO1xuICAgICAgaWYgKC91bmlxdWUgY29uc3RyYWludCBmYWlsZWQ6IHRheF9kZWZpbml0aW9uc1xcLmNvZGUvaS50ZXN0KG1zZykpIHtcbiAgICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIlRheCBjb2RlIGFscmVhZHkgZXhpc3RzXCIgfSwgNDA5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogbXNnIH0sIDQwMCk7XG4gICAgfVxuICB9LFxuKTtcblxuYWRtaW5Sb3V0ZXMucHV0KFxuICBcIi90YXgtZGVmaW5pdGlvbnMvOmlkXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwidGF4X2RlZmluaXRpb25zXCIsIFwidXBkYXRlXCIpLFxuICBhc3luYyAoYykgPT4ge1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBjLnJlcS5qc29uKCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGlkID0gYy5yZXEucGFyYW0oXCJpZFwiKTtcbiAgICAgIGNvbnN0IHVwZGF0ZWQgPSB1cGRhdGVUYXhEZWZpbml0aW9uKGlkLCBkYXRhKTtcbiAgICAgIHJldHVybiBjLmpzb24odXBkYXRlZCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc3QgbXNnID0gU3RyaW5nKGUpO1xuICAgICAgaWYgKG1zZyA9PT0gXCJOT1RfRk9VTkRcIikgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIk5vdCBmb3VuZFwiIH0sIDQwNCk7XG4gICAgICBpZiAoL3VuaXF1ZSBjb25zdHJhaW50IGZhaWxlZDogdGF4X2RlZmluaXRpb25zXFwuY29kZS9pLnRlc3QobXNnKSkge1xuICAgICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiVGF4IGNvZGUgYWxyZWFkeSBleGlzdHNcIiB9LCA0MDkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBtc2cgfSwgNDAwKTtcbiAgICB9XG4gIH0sXG4pO1xuXG5hZG1pblJvdXRlcy5kZWxldGUoXG4gIFwiL3RheC1kZWZpbml0aW9ucy86aWRcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJ0YXhfZGVmaW5pdGlvbnNcIiwgXCJkZWxldGVcIiksXG4gIChjKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGlkID0gYy5yZXEucGFyYW0oXCJpZFwiKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGRlbGV0ZVRheERlZmluaXRpb24oaWQpO1xuICAgICAgcmV0dXJuIGMuanNvbihyZXN1bHQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnN0IG1zZyA9IFN0cmluZyhlKTtcbiAgICAgIGlmIChtc2cgPT09IFwiTk9UX0ZPVU5EXCIpIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJOb3QgZm91bmRcIiB9LCA0MDQpO1xuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBtc2cgfSwgNDAwKTtcbiAgICB9XG4gIH0sXG4pO1xuXG5hZG1pblJvdXRlcy5wb3N0KFxuICBcIi90ZW1wbGF0ZXNcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJ0ZW1wbGF0ZXNcIiwgXCJjcmVhdGVcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGMucmVxLmpzb24oKTtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IGF3YWl0IGNyZWF0ZVRlbXBsYXRlKGRhdGEpO1xuICAgIHJldHVybiBjLmpzb24odGVtcGxhdGUpO1xuICB9LFxuKTtcblxuLy8gSW5zdGFsbCBhIHRlbXBsYXRlIGZyb20gYSByZW1vdGUgbWFuaWZlc3QgVVJMIChZQU1MIG9yIEpTT04pXG5hZG1pblJvdXRlcy5wb3N0KFxuICBcIi90ZW1wbGF0ZXMvaW5zdGFsbC1mcm9tLW1hbmlmZXN0XCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwidGVtcGxhdGVzXCIsIFwiaW5zdGFsbFwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyB1cmwgfSA9IGF3YWl0IGMucmVxLmpzb24oKTtcbiAgICAgIGlmICghdXJsIHx8IHR5cGVvZiB1cmwgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIk1pc3NpbmcgJ3VybCdcIiB9LCA0MDApO1xuICAgICAgfVxuICAgICAgY29uc3QgdCA9IGF3YWl0IGluc3RhbGxUZW1wbGF0ZUZyb21NYW5pZmVzdCh1cmwpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gUmVtZW1iZXIgdGhlIHNvdXJjZSBtYW5pZmVzdCB1c2VkIGZvciB0aGlzIHRlbXBsYXRlIGlkIHRvIGVuYWJsZSBmdXR1cmUgdXBkYXRlc1xuICAgICAgICBzZXRTZXR0aW5nKGB0ZW1wbGF0ZVNvdXJjZToke3QuaWR9YCwgdXJsKTtcbiAgICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICAgIC8qIG5vbi1mYXRhbCAqL1xuICAgICAgfVxuICAgICAgcmV0dXJuIGMuanNvbih0KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFN0cmluZyhlKSB9LCA0MDApO1xuICAgIH1cbiAgfSxcbik7XG5cbi8vIEluc3RhbGwgYSBsb2NhbCB0ZW1wbGF0ZSBmcm9tIGFuIHVwbG9hZGVkIC56aXAgZmlsZVxuYWRtaW5Sb3V0ZXMucG9zdChcbiAgXCIvdGVtcGxhdGVzL3VwbG9hZFwiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInRlbXBsYXRlc1wiLCBcImluc3RhbGxcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gYy5yZXEuaGVhZGVyKFwiY29udGVudC10eXBlXCIpIHx8IFwiXCI7XG5cbiAgICAgIGxldCB6aXBEYXRhOiBVaW50OEFycmF5PEFycmF5QnVmZmVyPjtcblxuICAgICAgaWYgKGNvbnRlbnRUeXBlLmluY2x1ZGVzKFwibXVsdGlwYXJ0L2Zvcm0tZGF0YVwiKSkge1xuICAgICAgICAvLyBIYW5kbGUgbXVsdGlwYXJ0IGZvcm0gdXBsb2FkXG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0gYXdhaXQgYy5yZXEuZm9ybURhdGEoKTtcbiAgICAgICAgY29uc3QgZmlsZSA9IGZvcm1EYXRhLmdldChcImZpbGVcIik7XG4gICAgICAgIGlmICghZmlsZSB8fCAhKGZpbGUgaW5zdGFuY2VvZiBGaWxlKSkge1xuICAgICAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJObyBmaWxlIHVwbG9hZGVkXCIgfSwgNDAwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWZpbGUubmFtZS5lbmRzV2l0aChcIi56aXBcIikpIHtcbiAgICAgICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiRmlsZSBtdXN0IGJlIGEgLnppcCBhcmNoaXZlXCIgfSwgNDAwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmlsZS5zaXplID4gNSAqIDEwMjQgKiAxMDI0KSB7XG4gICAgICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIkZpbGUgdG9vIGxhcmdlIChtYXggNU1CKVwiIH0sIDQwMCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYXJyYXlCdWZmZXIgPSBhd2FpdCBmaWxlLmFycmF5QnVmZmVyKCk7XG4gICAgICAgIHppcERhdGEgPSBuZXcgVWludDhBcnJheShhcnJheUJ1ZmZlcik7XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICBjb250ZW50VHlwZS5pbmNsdWRlcyhcImFwcGxpY2F0aW9uL3ppcFwiKSB8fFxuICAgICAgICBjb250ZW50VHlwZS5pbmNsdWRlcyhcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiKVxuICAgICAgKSB7XG4gICAgICAgIC8vIEhhbmRsZSByYXcgYmluYXJ5IHVwbG9hZFxuICAgICAgICBjb25zdCBhcnJheUJ1ZmZlciA9IGF3YWl0IGMucmVxLmFycmF5QnVmZmVyKCk7XG4gICAgICAgIGlmIChhcnJheUJ1ZmZlci5ieXRlTGVuZ3RoID4gNSAqIDEwMjQgKiAxMDI0KSB7XG4gICAgICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIkZpbGUgdG9vIGxhcmdlIChtYXggNU1CKVwiIH0sIDQwMCk7XG4gICAgICAgIH1cbiAgICAgICAgemlwRGF0YSA9IG5ldyBVaW50OEFycmF5KGFycmF5QnVmZmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjLmpzb24oXG4gICAgICAgICAge1xuICAgICAgICAgICAgZXJyb3I6XG4gICAgICAgICAgICAgIFwiSW52YWxpZCBjb250ZW50IHR5cGUuIEV4cGVjdGVkIG11bHRpcGFydC9mb3JtLWRhdGEgb3IgYXBwbGljYXRpb24vemlwXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICA0MDAsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHQgPSBhd2FpdCBpbnN0YWxsTG9jYWxUZW1wbGF0ZUZyb21aaXAoemlwRGF0YSk7XG4gICAgICByZXR1cm4gYy5qc29uKHQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogU3RyaW5nKGUpIH0sIDQwMCk7XG4gICAgfVxuICB9LFxuKTtcblxuLy8gVXBkYXRlIGEgdGVtcGxhdGUgYnkgaWQgdXNpbmcgaXRzIHN0b3JlZCBzb3VyY2UgbWFuaWZlc3QgVVJMXG5hZG1pblJvdXRlcy5wb3N0KFxuICBcIi90ZW1wbGF0ZXMvOmlkL3VwZGF0ZVwiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInRlbXBsYXRlc1wiLCBcInVwZGF0ZVwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBpZCA9IGMucmVxLnBhcmFtKFwiaWRcIik7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNyYyA9IGF3YWl0IGdldFNldHRpbmcoYHRlbXBsYXRlU291cmNlOiR7aWR9YCk7XG4gICAgICBpZiAoIXNyYyB8fCB0eXBlb2Ygc3JjICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHJldHVybiBjLmpzb24oXG4gICAgICAgICAgeyBlcnJvcjogXCJObyBzdG9yZWQgbWFuaWZlc3QgVVJMIGZvciB0aGlzIHRlbXBsYXRlXCIgfSxcbiAgICAgICAgICA0MDQsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBjb25zdCB1cGRhdGVkID0gYXdhaXQgaW5zdGFsbFRlbXBsYXRlRnJvbU1hbmlmZXN0KHNyYyk7XG4gICAgICBpZiAoIXVwZGF0ZWQgfHwgdXBkYXRlZC5pZCAhPT0gaWQpIHtcbiAgICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIk1hbmlmZXN0IElEIGRvZXMgbm90IG1hdGNoIHRlbXBsYXRlIGlkXCIgfSwgNDAwKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjLmpzb24oeyBvazogdHJ1ZSwgdGVtcGxhdGU6IHVwZGF0ZWQgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBTdHJpbmcoZSkgfSwgNDAwKTtcbiAgICB9XG4gIH0sXG4pO1xuXG4vLyBEZWxldGUgYSB0ZW1wbGF0ZSAoZGlzYWxsb3cgcmVtb3ZpbmcgYnVpbHQtaW4gYXBwIHRlbXBsYXRlcylcbmFkbWluUm91dGVzLmRlbGV0ZShcbiAgXCIvdGVtcGxhdGVzLzppZFwiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInRlbXBsYXRlc1wiLCBcImRlbGV0ZVwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBpZCA9IGMucmVxLnBhcmFtKFwiaWRcIik7XG4gICAgLy8gQnVpbHQtaW4gdGVtcGxhdGVzIGFyZSBwcm90ZWN0ZWRcbiAgICBjb25zdCBidWlsdGluID0gbmV3IFNldChbXCJwcm9mZXNzaW9uYWwtbW9kZXJuXCIsIFwibWluaW1hbGlzdC1jbGVhblwiXSk7XG4gICAgaWYgKGJ1aWx0aW4uaGFzKGlkKSkge1xuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIkNhbm5vdCBkZWxldGUgYnVpbHQtaW4gdGVtcGxhdGVzXCIgfSwgNDAwKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGlzIHRlbXBsYXRlIGlzIGN1cnJlbnRseSBzZWxlY3RlZCBpbiBzZXR0aW5ncywgcmVzZXQgdG8gbWluaW1hbGlzdC1jbGVhblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gYXdhaXQgZ2V0U2V0dGluZyhcInRlbXBsYXRlSWRcIik7XG4gICAgICBpZiAoY3VycmVudCA9PT0gaWQpIHtcbiAgICAgICAgYXdhaXQgc2V0U2V0dGluZyhcInRlbXBsYXRlSWRcIiwgXCJtaW5pbWFsaXN0LWNsZWFuXCIpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICAvLyBub24tZmF0YWxcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgZGVsZXRlVGVtcGxhdGUoaWQpO1xuICAgICAgcmV0dXJuIGMuanNvbih7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBTdHJpbmcoZSkgfSwgNTAwKTtcbiAgICB9XG4gIH0sXG4pO1xuXG4vLyBHZXQgdGVtcGxhdGUgYnkgSURcbmFkbWluUm91dGVzLmdldChcbiAgXCIvdGVtcGxhdGVzLzppZFwiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInRlbXBsYXRlc1wiLCBcInJlYWRcIiksXG4gIChjKSA9PiB7XG4gICAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICAgIGNvbnN0IHRlbXBsYXRlID0gZ2V0VGVtcGxhdGVCeUlkKGlkKTtcbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiVGVtcGxhdGUgbm90IGZvdW5kXCIgfSwgNDA0KTtcbiAgICB9XG4gICAgcmV0dXJuIGMuanNvbih0ZW1wbGF0ZSk7XG4gIH0sXG4pO1xuXG4vLyBQcmV2aWV3IHRlbXBsYXRlIHdpdGggc2FtcGxlIGRhdGFcbmFkbWluUm91dGVzLnBvc3QoXG4gIFwiL3RlbXBsYXRlcy86aWQvcHJldmlld1wiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInRlbXBsYXRlc1wiLCBcInJlYWRcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBjLnJlcS5qc29uKCk7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IGdldFRlbXBsYXRlQnlJZChpZCk7XG4gICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIlRlbXBsYXRlIG5vdCBmb3VuZFwiIH0sIDQwNCk7XG4gICAgfVxuXG4gICAgLy8gQWRkIHNhbXBsZSBkYXRhIGlmIG5vdCBwcm92aWRlZFxuICAgIGNvbnN0IHNhbXBsZURhdGEgPSB7XG4gICAgICBjb21wYW55TmFtZTogXCJTYW1wbGUgQ29tcGFueSBJbmNcIixcbiAgICAgIGNvbXBhbnlBZGRyZXNzOiBcIjEyMyBCdXNpbmVzcyBTdCwgQ2l0eSwgU3RhdGUgMTIzNDVcIixcbiAgICAgIGNvbXBhbnlFbWFpbDogXCJjb250YWN0QHNhbXBsZS5jb21cIixcbiAgICAgIGNvbXBhbnlQaG9uZTogXCIrMS01NTUtMTIzLTQ1NjdcIixcbiAgICAgIGNvbXBhbnlUYXhJZDogXCJUQVgxMjM0NTZcIixcbiAgICAgIGludm9pY2VOdW1iZXI6IFwiSU5WLTIwMjUtMDAxXCIsXG4gICAgICBpc3N1ZURhdGU6IFwiMjAyNS0wOC0yNlwiLFxuICAgICAgZHVlRGF0ZTogXCIyMDI1LTA5LTI1XCIsXG4gICAgICBjdXJyZW5jeTogXCJVU0RcIixcbiAgICAgIHN0YXR1czogXCJkcmFmdFwiLFxuICAgICAgY3VzdG9tZXJOYW1lOiBcIkpvaG4gRG9lXCIsXG4gICAgICBjdXN0b21lckVtYWlsOiBcImpvaG5AZXhhbXBsZS5jb21cIixcbiAgICAgIGN1c3RvbWVyQWRkcmVzczogXCI0NTYgQ2xpZW50IEF2ZSwgQ2l0eSwgU3RhdGUgNTQzMjFcIixcbiAgICAgIGN1c3RvbWVyUG9zdGFsQ2l0eTogXCI1NDMyMSBDaXR5XCIsXG4gICAgICBjdXN0b21lckNvdW50cnlDb2RlOiBcIlVTXCIsXG4gICAgICBoaWdobGlnaHRDb2xvcjogZGF0YS5oaWdobGlnaHRDb2xvciB8fCBcIiMyNTYzZWJcIixcbiAgICAgIGhpZ2hsaWdodENvbG9yTGlnaHQ6IGRhdGEuaGlnaGxpZ2h0Q29sb3JMaWdodCB8fCBcIiNkYmVhZmVcIixcbiAgICAgIHN1YnRvdGFsOiAyNTAwLjAsXG4gICAgICBkaXNjb3VudEFtb3VudDogMjUwLjAsXG4gICAgICBkaXNjb3VudFBlcmNlbnRhZ2U6IDEwLFxuICAgICAgdGF4UmF0ZTogOC41LFxuICAgICAgdGF4QW1vdW50OiAxOTEuMjUsXG4gICAgICB0b3RhbDogMjQ0MS4yNSxcbiAgICAgIGhhc0Rpc2NvdW50OiB0cnVlLFxuICAgICAgaGFzVGF4OiB0cnVlLFxuXG4gICAgICBpdGVtczogW1xuICAgICAgICB7XG4gICAgICAgICAgZGVzY3JpcHRpb246IFwiV2Vic2l0ZSBEZXZlbG9wbWVudFwiLFxuICAgICAgICAgIHF1YW50aXR5OiAxLFxuICAgICAgICAgIHVuaXRQcmljZTogMjUwMC4wLFxuICAgICAgICAgIGxpbmVUb3RhbDogMjUwMC4wLFxuICAgICAgICAgIG5vdGVzOiBcIkN1c3RvbSByZXNwb25zaXZlIHdlYnNpdGUgd2l0aCBtb2Rlcm4gZGVzaWduXCIsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgbm90ZXM6IFwiVGhhbmsgeW91IGZvciB5b3VyIGJ1c2luZXNzISBQYXltZW50IGlzIGR1ZSB3aXRoaW4gMzAgZGF5cy5cIixcbiAgICAgIHBheW1lbnRUZXJtczogXCJOZXQgMzAgZGF5c1wiLFxuICAgICAgcGF5bWVudE1ldGhvZHM6IFwiQmFuayBUcmFuc2ZlciwgQ3JlZGl0IENhcmRcIixcbiAgICAgIGJhbmtBY2NvdW50OiBcIkFjY291bnQ6IDEyMy00NTYtNzg5LCBSb3V0aW5nOiA5ODctNjU0LTMyMVwiLFxuICAgICAgLi4uZGF0YSxcbiAgICB9O1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlbmRlcmVkSHRtbCA9IHJlbmRlclRlbXBsYXRlKHRlbXBsYXRlLmh0bWwsIHNhbXBsZURhdGEpO1xuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShyZW5kZXJlZEh0bWwsIHtcbiAgICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvaHRtbFwiIH0sXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIGMuanNvbihcbiAgICAgICAge1xuICAgICAgICAgIGVycm9yOiBcIkZhaWxlZCB0byByZW5kZXIgdGVtcGxhdGVcIixcbiAgICAgICAgICBkZXRhaWxzOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICB9LFxuICAgICAgICA1MDAsXG4gICAgICApO1xuICAgIH1cbiAgfSxcbik7XG5cbi8vIExvYWQgdGVtcGxhdGUgZnJvbSBmaWxlXG5hZG1pblJvdXRlcy5wb3N0KFxuICBcIi90ZW1wbGF0ZXMvbG9hZC1mcm9tLWZpbGVcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJ0ZW1wbGF0ZXNcIiwgXCJjcmVhdGVcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgZmlsZVBhdGgsIG5hbWUsIGlzRGVmYXVsdCwgaGlnaGxpZ2h0Q29sb3IgfSA9IGF3YWl0IGMucmVxLmpzb24oKTtcblxuICAgICAgY29uc3QgaHRtbCA9IGF3YWl0IGxvYWRUZW1wbGF0ZUZyb21GaWxlKGZpbGVQYXRoKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gYXdhaXQgY3JlYXRlVGVtcGxhdGUoe1xuICAgICAgICBuYW1lLFxuICAgICAgICBodG1sLFxuICAgICAgICBpc0RlZmF1bHQ6IGlzRGVmYXVsdCB8fCBmYWxzZSxcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gYy5qc29uKHtcbiAgICAgICAgLi4udGVtcGxhdGUsXG4gICAgICAgIGhpZ2hsaWdodENvbG9yOiBoaWdobGlnaHRDb2xvciB8fCBcIiMyNTYzZWJcIixcbiAgICAgICAgbWVzc2FnZTogXCJUZW1wbGF0ZSBsb2FkZWQgc3VjY2Vzc2Z1bGx5IGZyb20gZmlsZVwiLFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiBjLmpzb24oXG4gICAgICAgIHtcbiAgICAgICAgICBlcnJvcjogXCJGYWlsZWQgdG8gbG9hZCB0ZW1wbGF0ZSBmcm9tIGZpbGVcIixcbiAgICAgICAgICBkZXRhaWxzOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICB9LFxuICAgICAgICA1MDAsXG4gICAgICApO1xuICAgIH1cbiAgfSxcbik7XG5cbi8vIFNldHRpbmdzIHJvdXRlc1xuYWRtaW5Sb3V0ZXMuZ2V0KFwiL3NldHRpbmdzXCIsIGFzeW5jIChjKSA9PiB7XG4gIGNvbnN0IHNldHRpbmdzID0gYXdhaXQgZ2V0U2V0dGluZ3MoKTtcbiAgY29uc3QgbWFwID0gc2V0dGluZ3MucmVkdWNlKFxuICAgIChhY2M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIHMpID0+IHtcbiAgICAgIGFjY1tzLmtleV0gPSBzLnZhbHVlIGFzIHN0cmluZztcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSxcbiAgICB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuICApO1xuICAvLyBQcm92aWRlIG5vcm1hbGl6ZWQgYWxpYXNlcyBleHBlY3RlZCBieSB0aGUgZnJvbnRlbmRcbiAgaWYgKG1hcC5jb21wYW55RW1haWwgJiYgIW1hcC5lbWFpbCkgbWFwLmVtYWlsID0gbWFwLmNvbXBhbnlFbWFpbDtcbiAgaWYgKG1hcC5jb21wYW55UGhvbmUgJiYgIW1hcC5waG9uZSkgbWFwLnBob25lID0gbWFwLmNvbXBhbnlQaG9uZTtcbiAgaWYgKG1hcC5jb21wYW55VGF4SWQgJiYgIW1hcC50YXhJZCkgbWFwLnRheElkID0gbWFwLmNvbXBhbnlUYXhJZDtcbiAgaWYgKG1hcC5jb21wYW55Q291bnRyeUNvZGUgJiYgIW1hcC5jb3VudHJ5Q29kZSkge1xuICAgIG1hcC5jb3VudHJ5Q29kZSA9IG1hcC5jb21wYW55Q291bnRyeUNvZGU7XG4gIH1cbiAgLy8gVW5pZnkgbG9nbyBmaWVsZHM6IHByZWZlciBzaW5nbGUgJ2xvZ28nOyBoaWRlIGxlZ2FjeSAnbG9nb1VybCdcbiAgaWYgKG1hcC5sb2dvVXJsICYmICFtYXAubG9nbykgbWFwLmxvZ28gPSBtYXAubG9nb1VybDtcbiAgaWYgKG1hcC5sb2dvVXJsKSBkZWxldGUgbWFwLmxvZ29Vcmw7XG4gIGlmICh0eXBlb2YgbWFwLmxvZ28gPT09IFwic3RyaW5nXCIpIHtcbiAgICBtYXAubG9nbyA9IG5vcm1hbGl6ZVN0b3JlZExvZ29SZWZlcmVuY2UobWFwLmxvZ28pO1xuICB9XG4gIGlmICghbWFwLmxvY2FsZSkgbWFwLmxvY2FsZSA9IFwiZW5cIjtcbiAgaWYgKCFtYXAuaW52b2ljZUZhbGxiYWNrTG9jYWxlKSBtYXAuaW52b2ljZUZhbGxiYWNrTG9jYWxlID0gXCJcIjtcbiAgaWYgKCFtYXAuZGF0ZUZvcm1hdCAmJiBtYXAuZGF0ZV9mb3JtYXQpIG1hcC5kYXRlRm9ybWF0ID0gbWFwLmRhdGVfZm9ybWF0O1xuICBpZiAoIW1hcC5udW1iZXJGb3JtYXQgJiYgbWFwLm51bWJlcl9mb3JtYXQpIHtcbiAgICBtYXAubnVtYmVyRm9ybWF0ID0gbWFwLm51bWJlcl9mb3JtYXQ7XG4gIH1cbiAgaWYgKCFtYXAucG9zdGFsQ2l0eUZvcm1hdCAmJiBtYXAucG9zdGFsX2NpdHlfZm9ybWF0KSB7XG4gICAgbWFwLnBvc3RhbENpdHlGb3JtYXQgPSBtYXAucG9zdGFsX2NpdHlfZm9ybWF0O1xuICB9XG4gIGlmICghbWFwLnBvc3RhbENpdHlGb3JtYXQgJiYgbWFwLnBvc3RhbGNpdHlmb3JtYXQpIHtcbiAgICBtYXAucG9zdGFsQ2l0eUZvcm1hdCA9IG1hcC5wb3N0YWxjaXR5Zm9ybWF0O1xuICB9XG4gIGlmICghbWFwLmRhdGVGb3JtYXQpIG1hcC5kYXRlRm9ybWF0ID0gXCJZWVlZLU1NLUREXCI7XG4gIGlmICghbWFwLm51bWJlckZvcm1hdCkgbWFwLm51bWJlckZvcm1hdCA9IFwiY29tbWFcIjtcbiAgaWYgKCFtYXAucG9zdGFsQ2l0eUZvcm1hdCkgbWFwLnBvc3RhbENpdHlGb3JtYXQgPSBcImF1dG9cIjtcbiAgaWYgKCFtYXAuYWxsb3dQcm90ZWN0ZWRJbnZvaWNlQ2hhbmdlcykge1xuICAgIG1hcC5hbGxvd1Byb3RlY3RlZEludm9pY2VDaGFuZ2VzID0gXCJmYWxzZVwiO1xuICB9XG4gIC8vIEV4cG9zZSBkZW1vIG1vZGUgdG8gZnJvbnRlbmQgVUlcbiAgKG1hcCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuZGVtb01vZGUgPSBERU1PX01PREUgPyBcInRydWVcIiA6IFwiZmFsc2VcIjtcbiAgcmV0dXJuIGMuanNvbihtYXApO1xufSk7XG5cbmFkbWluUm91dGVzLnB1dChcbiAgXCIvc2V0dGluZ3NcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJzZXR0aW5nc1wiLCBcInVwZGF0ZVwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgYy5yZXEuanNvbigpO1xuICAgIC8vIE5vcm1hbGl6ZSBsZWdhY3kgbG9nb1VybCB0byBsb2dvXG4gICAgaWYgKHR5cGVvZiBkYXRhLmxvZ29VcmwgPT09IFwic3RyaW5nXCIgJiYgIWRhdGEubG9nbykge1xuICAgICAgZGF0YS5sb2dvID0gZGF0YS5sb2dvVXJsO1xuICAgICAgZGVsZXRlIGRhdGEubG9nb1VybDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBkYXRhLmxvZ28gPT09IFwic3RyaW5nXCIgJiYgZGF0YS5sb2dvLnN0YXJ0c1dpdGgoXCJkYXRhOmltYWdlL1wiKSkge1xuICAgICAgZGF0YS5sb2dvID0gYXdhaXQgc2F2ZURhdGFVcmxMb2dvKGRhdGEubG9nbyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGF0YS5sb2dvID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBkYXRhLmxvZ28gPSBub3JtYWxpemVTdG9yZWRMb2dvUmVmZXJlbmNlKGRhdGEubG9nbyk7XG4gICAgfVxuICAgIC8vIE5vcm1hbGl6ZSB0YXgtcmVsYXRlZCBzZXR0aW5nc1xuICAgIG5vcm1hbGl6ZVRheFNldHRpbmdzUGF5bG9hZChkYXRhKTtcbiAgICBub3JtYWxpemVMb2NhbGVTZXR0aW5nUGF5bG9hZChkYXRhKTtcbiAgICBub3JtYWxpemVJbnZvaWNlUHJvdGVjdGlvblNldHRpbmdzUGF5bG9hZChkYXRhKTtcbiAgICBjb25zdCBzZXR0aW5ncyA9IGF3YWl0IHVwZGF0ZVNldHRpbmdzKGRhdGEpO1xuICAgIHRyeSB7XG4gICAgICBpZiAoXCJsb2dvVXJsXCIgaW4gZGF0YSkgZGVsZXRlU2V0dGluZyhcImxvZ29VcmxcIik7XG4gICAgfSBjYXRjaCAoX2UpIHtcbiAgICAgIC8qIGlnbm9yZSBsZWdhY3kgY2xlYW51cCBlcnJvcnMgKi9cbiAgICB9XG4gICAgLy8gSWYgZGVmYXVsdCB0ZW1wbGF0ZSBjaGFuZ2VkLCByZWZsZWN0IGluIHRlbXBsYXRlcyB0YWJsZVxuICAgIGlmICh0eXBlb2YgZGF0YS50ZW1wbGF0ZUlkID09PSBcInN0cmluZ1wiICYmIGRhdGEudGVtcGxhdGVJZCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgc2V0RGVmYXVsdFRlbXBsYXRlKFN0cmluZyhkYXRhLnRlbXBsYXRlSWQpKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGMuanNvbihzZXR0aW5ncyk7XG4gIH0sXG4pO1xuXG4vLyBQYXJ0aWFsIHVwZGF0ZSAoUEFUQ0gpIHRvIG1lcmdlIHByb3ZpZGVkIGtleXMgb25seVxuYWRtaW5Sb3V0ZXMucGF0Y2goXG4gIFwiL3NldHRpbmdzXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwic2V0dGluZ3NcIiwgXCJ1cGRhdGVcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGMucmVxLmpzb24oKTtcbiAgICAvLyBOb3JtYWxpemUgbGVnYWN5IGxvZ29VcmwgdG8gbG9nb1xuICAgIGlmICh0eXBlb2YgZGF0YS5sb2dvVXJsID09PSBcInN0cmluZ1wiICYmICFkYXRhLmxvZ28pIHtcbiAgICAgIGRhdGEubG9nbyA9IGRhdGEubG9nb1VybDtcbiAgICAgIGRlbGV0ZSBkYXRhLmxvZ29Vcmw7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZGF0YS5sb2dvID09PSBcInN0cmluZ1wiICYmIGRhdGEubG9nby5zdGFydHNXaXRoKFwiZGF0YTppbWFnZS9cIikpIHtcbiAgICAgIGRhdGEubG9nbyA9IGF3YWl0IHNhdmVEYXRhVXJsTG9nbyhkYXRhLmxvZ28pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRhdGEubG9nbyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgZGF0YS5sb2dvID0gbm9ybWFsaXplU3RvcmVkTG9nb1JlZmVyZW5jZShkYXRhLmxvZ28pO1xuICAgIH1cbiAgICAvLyBOb3JtYWxpemUgY291bnRyeUNvZGUgYWxpYXMgdG8gY29tcGFueUNvdW50cnlDb2RlXG4gICAgaWYgKHR5cGVvZiBkYXRhLmNvdW50cnlDb2RlID09PSBcInN0cmluZ1wiICYmICFkYXRhLmNvbXBhbnlDb3VudHJ5Q29kZSkge1xuICAgICAgZGF0YS5jb21wYW55Q291bnRyeUNvZGUgPSBkYXRhLmNvdW50cnlDb2RlO1xuICAgICAgZGVsZXRlIGRhdGEuY291bnRyeUNvZGU7XG4gICAgfVxuICAgIC8vIE5vcm1hbGl6ZSB0YXgtcmVsYXRlZCBzZXR0aW5nc1xuICAgIG5vcm1hbGl6ZVRheFNldHRpbmdzUGF5bG9hZChkYXRhKTtcbiAgICBub3JtYWxpemVMb2NhbGVTZXR0aW5nUGF5bG9hZChkYXRhKTtcbiAgICBub3JtYWxpemVJbnZvaWNlUHJvdGVjdGlvblNldHRpbmdzUGF5bG9hZChkYXRhKTtcbiAgICBjb25zdCBzZXR0aW5ncyA9IGF3YWl0IHVwZGF0ZVNldHRpbmdzKGRhdGEpO1xuICAgIGlmICh0eXBlb2YgZGF0YS50ZW1wbGF0ZUlkID09PSBcInN0cmluZ1wiICYmIGRhdGEudGVtcGxhdGVJZCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgc2V0RGVmYXVsdFRlbXBsYXRlKFN0cmluZyhkYXRhLnRlbXBsYXRlSWQpKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGlmIChcImxvZ29VcmxcIiBpbiBkYXRhKSBkZWxldGVTZXR0aW5nKFwibG9nb1VybFwiKTtcbiAgICB9IGNhdGNoIChfZSkge1xuICAgICAgLyogaWdub3JlIGxlZ2FjeSBjbGVhbnVwIGVycm9ycyAqL1xuICAgIH1cbiAgICByZXR1cm4gYy5qc29uKHNldHRpbmdzKTtcbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLnBvc3QoXG4gIFwiL3NldHRpbmdzL2xvZ28tdXBsb2FkXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwic2V0dGluZ3NcIiwgXCJ1cGRhdGVcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGZvcm0gPSBhd2FpdCBjLnJlcS5mb3JtRGF0YSgpO1xuICAgICAgY29uc3QgZW50cnkgPSBmb3JtLmdldChcImZpbGVcIik7XG4gICAgICBpZiAoIShlbnRyeSBpbnN0YW5jZW9mIEZpbGUpKSB7XG4gICAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJNaXNzaW5nIGZpbGVcIiB9LCA0MDApO1xuICAgICAgfVxuICAgICAgY29uc3QgbG9nbyA9IGF3YWl0IHNhdmVVcGxvYWRlZExvZ29GaWxlKGVudHJ5KTtcbiAgICAgIHJldHVybiBjLmpzb24oeyBsb2dvIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogU3RyaW5nKGUpIH0sIDQwMCk7XG4gICAgfVxuICB9LFxuKTtcblxuLy8gT3B0aW9uYWwgYWRtaW4tcHJlZml4ZWQgYWxpYXNlcyBmb3IgY2xhcml0eS9kb2N1bWVudGF0aW9uIHBhcml0eVxuYWRtaW5Sb3V0ZXMuZ2V0KFwiL2FkbWluL3NldHRpbmdzXCIsIGFzeW5jIChjKSA9PiB7XG4gIGNvbnN0IHNldHRpbmdzID0gYXdhaXQgZ2V0U2V0dGluZ3MoKTtcbiAgY29uc3QgbWFwID0gc2V0dGluZ3MucmVkdWNlKFxuICAgIChhY2M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIHMpID0+IHtcbiAgICAgIGFjY1tzLmtleV0gPSBzLnZhbHVlIGFzIHN0cmluZztcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSxcbiAgICB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuICApO1xuICBpZiAobWFwLmNvbXBhbnlFbWFpbCAmJiAhbWFwLmVtYWlsKSBtYXAuZW1haWwgPSBtYXAuY29tcGFueUVtYWlsO1xuICBpZiAobWFwLmNvbXBhbnlQaG9uZSAmJiAhbWFwLnBob25lKSBtYXAucGhvbmUgPSBtYXAuY29tcGFueVBob25lO1xuICBpZiAobWFwLmNvbXBhbnlUYXhJZCAmJiAhbWFwLnRheElkKSBtYXAudGF4SWQgPSBtYXAuY29tcGFueVRheElkO1xuICBpZiAobWFwLmNvbXBhbnlDb3VudHJ5Q29kZSAmJiAhbWFwLmNvdW50cnlDb2RlKSB7XG4gICAgbWFwLmNvdW50cnlDb2RlID0gbWFwLmNvbXBhbnlDb3VudHJ5Q29kZTtcbiAgfVxuICBpZiAobWFwLmxvZ29VcmwgJiYgIW1hcC5sb2dvKSBtYXAubG9nbyA9IG1hcC5sb2dvVXJsO1xuICBpZiAobWFwLmxvZ29VcmwpIGRlbGV0ZSBtYXAubG9nb1VybDtcbiAgaWYgKHR5cGVvZiBtYXAubG9nbyA9PT0gXCJzdHJpbmdcIikge1xuICAgIG1hcC5sb2dvID0gbm9ybWFsaXplU3RvcmVkTG9nb1JlZmVyZW5jZShtYXAubG9nbyk7XG4gIH1cbiAgaWYgKCFtYXAubG9jYWxlKSBtYXAubG9jYWxlID0gXCJlblwiO1xuICBpZiAoIW1hcC5pbnZvaWNlRmFsbGJhY2tMb2NhbGUpIG1hcC5pbnZvaWNlRmFsbGJhY2tMb2NhbGUgPSBcIlwiO1xuICBpZiAoIW1hcC5kYXRlRm9ybWF0ICYmIG1hcC5kYXRlX2Zvcm1hdCkgbWFwLmRhdGVGb3JtYXQgPSBtYXAuZGF0ZV9mb3JtYXQ7XG4gIGlmICghbWFwLm51bWJlckZvcm1hdCAmJiBtYXAubnVtYmVyX2Zvcm1hdCkge1xuICAgIG1hcC5udW1iZXJGb3JtYXQgPSBtYXAubnVtYmVyX2Zvcm1hdDtcbiAgfVxuICBpZiAoIW1hcC5wb3N0YWxDaXR5Rm9ybWF0ICYmIG1hcC5wb3N0YWxfY2l0eV9mb3JtYXQpIHtcbiAgICBtYXAucG9zdGFsQ2l0eUZvcm1hdCA9IG1hcC5wb3N0YWxfY2l0eV9mb3JtYXQ7XG4gIH1cbiAgaWYgKCFtYXAucG9zdGFsQ2l0eUZvcm1hdCAmJiBtYXAucG9zdGFsY2l0eWZvcm1hdCkge1xuICAgIG1hcC5wb3N0YWxDaXR5Rm9ybWF0ID0gbWFwLnBvc3RhbGNpdHlmb3JtYXQ7XG4gIH1cbiAgaWYgKCFtYXAuZGF0ZUZvcm1hdCkgbWFwLmRhdGVGb3JtYXQgPSBcIllZWVktTU0tRERcIjtcbiAgaWYgKCFtYXAubnVtYmVyRm9ybWF0KSBtYXAubnVtYmVyRm9ybWF0ID0gXCJjb21tYVwiO1xuICBpZiAoIW1hcC5wb3N0YWxDaXR5Rm9ybWF0KSBtYXAucG9zdGFsQ2l0eUZvcm1hdCA9IFwiYXV0b1wiO1xuICBpZiAoIW1hcC5hbGxvd1Byb3RlY3RlZEludm9pY2VDaGFuZ2VzKSB7XG4gICAgbWFwLmFsbG93UHJvdGVjdGVkSW52b2ljZUNoYW5nZXMgPSBcImZhbHNlXCI7XG4gIH1cbiAgLy8gRXhwb3NlIGRlbW8gbW9kZSB0byBmcm9udGVuZCBVSSBmb3IgYWRtaW4tcHJlZml4ZWQgcm91dGUgYXMgd2VsbFxuICAobWFwIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5kZW1vTW9kZSA9IERFTU9fTU9ERSA/IFwidHJ1ZVwiIDogXCJmYWxzZVwiO1xuICByZXR1cm4gYy5qc29uKG1hcCk7XG59KTtcblxuYWRtaW5Sb3V0ZXMucHV0KFxuICBcIi9hZG1pbi9zZXR0aW5nc1wiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInNldHRpbmdzXCIsIFwidXBkYXRlXCIpLFxuICBhc3luYyAoYykgPT4ge1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBjLnJlcS5qc29uKCk7XG4gICAgaWYgKHR5cGVvZiBkYXRhLmxvZ29VcmwgPT09IFwic3RyaW5nXCIgJiYgIWRhdGEubG9nbykge1xuICAgICAgZGF0YS5sb2dvID0gZGF0YS5sb2dvVXJsO1xuICAgICAgZGVsZXRlIGRhdGEubG9nb1VybDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBkYXRhLmxvZ28gPT09IFwic3RyaW5nXCIgJiYgZGF0YS5sb2dvLnN0YXJ0c1dpdGgoXCJkYXRhOmltYWdlL1wiKSkge1xuICAgICAgZGF0YS5sb2dvID0gYXdhaXQgc2F2ZURhdGFVcmxMb2dvKGRhdGEubG9nbyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGF0YS5sb2dvID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBkYXRhLmxvZ28gPSBub3JtYWxpemVTdG9yZWRMb2dvUmVmZXJlbmNlKGRhdGEubG9nbyk7XG4gICAgfVxuICAgIC8vIE5vcm1hbGl6ZSB0YXgtcmVsYXRlZCBzZXR0aW5nc1xuICAgIG5vcm1hbGl6ZVRheFNldHRpbmdzUGF5bG9hZChkYXRhKTtcbiAgICBub3JtYWxpemVMb2NhbGVTZXR0aW5nUGF5bG9hZChkYXRhKTtcbiAgICBub3JtYWxpemVJbnZvaWNlUHJvdGVjdGlvblNldHRpbmdzUGF5bG9hZChkYXRhKTtcbiAgICBjb25zdCBzZXR0aW5ncyA9IGF3YWl0IHVwZGF0ZVNldHRpbmdzKGRhdGEpO1xuICAgIHRyeSB7XG4gICAgICBpZiAoXCJsb2dvVXJsXCIgaW4gZGF0YSkgZGVsZXRlU2V0dGluZyhcImxvZ29VcmxcIik7XG4gICAgfSBjYXRjaCAoX2UpIHtcbiAgICAgIC8qIGlnbm9yZSBsZWdhY3kgY2xlYW51cCBlcnJvcnMgKi9cbiAgICB9XG4gICAgcmV0dXJuIGMuanNvbihzZXR0aW5ncyk7XG4gIH0sXG4pO1xuXG5hZG1pblJvdXRlcy5wYXRjaChcbiAgXCIvYWRtaW4vc2V0dGluZ3NcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJzZXR0aW5nc1wiLCBcInVwZGF0ZVwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgYy5yZXEuanNvbigpO1xuICAgIGlmICh0eXBlb2YgZGF0YS5sb2dvVXJsID09PSBcInN0cmluZ1wiICYmICFkYXRhLmxvZ28pIHtcbiAgICAgIGRhdGEubG9nbyA9IGRhdGEubG9nb1VybDtcbiAgICAgIGRlbGV0ZSBkYXRhLmxvZ29Vcmw7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZGF0YS5sb2dvID09PSBcInN0cmluZ1wiICYmIGRhdGEubG9nby5zdGFydHNXaXRoKFwiZGF0YTppbWFnZS9cIikpIHtcbiAgICAgIGRhdGEubG9nbyA9IGF3YWl0IHNhdmVEYXRhVXJsTG9nbyhkYXRhLmxvZ28pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRhdGEubG9nbyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgZGF0YS5sb2dvID0gbm9ybWFsaXplU3RvcmVkTG9nb1JlZmVyZW5jZShkYXRhLmxvZ28pO1xuICAgIH1cbiAgICAvLyBOb3JtYWxpemUgdGF4LXJlbGF0ZWQgc2V0dGluZ3NcbiAgICBub3JtYWxpemVUYXhTZXR0aW5nc1BheWxvYWQoZGF0YSk7XG4gICAgbm9ybWFsaXplTG9jYWxlU2V0dGluZ1BheWxvYWQoZGF0YSk7XG4gICAgbm9ybWFsaXplSW52b2ljZVByb3RlY3Rpb25TZXR0aW5nc1BheWxvYWQoZGF0YSk7XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBhd2FpdCB1cGRhdGVTZXR0aW5ncyhkYXRhKTtcbiAgICB0cnkge1xuICAgICAgaWYgKFwibG9nb1VybFwiIGluIGRhdGEpIGRlbGV0ZVNldHRpbmcoXCJsb2dvVXJsXCIpO1xuICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICAvKiBpZ25vcmUgbGVnYWN5IGNsZWFudXAgZXJyb3JzICovXG4gICAgfVxuICAgIHJldHVybiBjLmpzb24oc2V0dGluZ3MpO1xuICB9LFxuKTtcblxuLy8gQ3VzdG9tZXIgcm91dGVzXG5hZG1pblJvdXRlcy5nZXQoXG4gIFwiL2N1c3RvbWVyc1wiLFxuICByZXF1aXJlUGVybWlzc2lvbihcImN1c3RvbWVyc1wiLCBcInJlYWRcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgY3VzdG9tZXJzID0gYXdhaXQgZ2V0Q3VzdG9tZXJzKCk7XG4gICAgcmV0dXJuIGMuanNvbihjdXN0b21lcnMpO1xuICB9LFxuKTtcblxuYWRtaW5Sb3V0ZXMuZ2V0KFxuICBcIi9jdXN0b21lcnMvOmlkXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwiY3VzdG9tZXJzXCIsIFwicmVhZFwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBpZCA9IGMucmVxLnBhcmFtKFwiaWRcIik7XG4gICAgY29uc3QgY3VzdG9tZXIgPSBhd2FpdCBnZXRDdXN0b21lckJ5SWQoaWQpO1xuICAgIGlmICghY3VzdG9tZXIpIHtcbiAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJDdXN0b21lciBub3QgZm91bmRcIiB9LCA0MDQpO1xuICAgIH1cbiAgICByZXR1cm4gYy5qc29uKGN1c3RvbWVyKTtcbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLnBvc3QoXG4gIFwiL2N1c3RvbWVyc1wiLFxuICByZXF1aXJlUGVybWlzc2lvbihcImN1c3RvbWVyc1wiLCBcImNyZWF0ZVwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgYy5yZXEuanNvbigpO1xuICAgIGNvbnN0IGN1c3RvbWVyID0gY3JlYXRlQ3VzdG9tZXIoZGF0YSk7XG4gICAgcmV0dXJuIGMuanNvbihjdXN0b21lcik7XG4gIH0sXG4pO1xuXG5hZG1pblJvdXRlcy5wdXQoXG4gIFwiL2N1c3RvbWVycy86aWRcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJjdXN0b21lcnNcIiwgXCJ1cGRhdGVcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBjLnJlcS5qc29uKCk7XG4gICAgY29uc3QgY3VzdG9tZXIgPSBhd2FpdCB1cGRhdGVDdXN0b21lcihpZCwgZGF0YSk7XG4gICAgcmV0dXJuIGMuanNvbihjdXN0b21lcik7XG4gIH0sXG4pO1xuXG5hZG1pblJvdXRlcy5kZWxldGUoXG4gIFwiL2N1c3RvbWVycy86aWRcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJjdXN0b21lcnNcIiwgXCJkZWxldGVcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICAgIGF3YWl0IGRlbGV0ZUN1c3RvbWVyKGlkKTtcbiAgICByZXR1cm4gYy5qc29uKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgfSxcbik7XG5cbi8vIFByb2R1Y3Qgcm91dGVzXG5hZG1pblJvdXRlcy5nZXQoXCIvcHJvZHVjdHNcIiwgcmVxdWlyZVBlcm1pc3Npb24oXCJwcm9kdWN0c1wiLCBcInJlYWRcIiksIChjKSA9PiB7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoYy5yZXEudXJsKTtcbiAgY29uc3QgaW5jbHVkZUluYWN0aXZlID1cbiAgICB1cmwuc2VhcmNoUGFyYW1zLmdldChcImluY2x1ZGVJbmFjdGl2ZVwiKT8udG9Mb3dlckNhc2UoKSA9PT0gXCJ0cnVlXCI7XG4gIGNvbnN0IHByb2R1Y3RzID0gZ2V0UHJvZHVjdHMoaW5jbHVkZUluYWN0aXZlKTtcbiAgcmV0dXJuIGMuanNvbihwcm9kdWN0cyk7XG59KTtcblxuYWRtaW5Sb3V0ZXMuZ2V0KFwiL3Byb2R1Y3RzLzppZFwiLCByZXF1aXJlUGVybWlzc2lvbihcInByb2R1Y3RzXCIsIFwicmVhZFwiKSwgKGMpID0+IHtcbiAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICBjb25zdCBwcm9kdWN0ID0gZ2V0UHJvZHVjdEJ5SWQoaWQpO1xuICBpZiAoIXByb2R1Y3QpIHtcbiAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiUHJvZHVjdCBub3QgZm91bmRcIiB9LCA0MDQpO1xuICB9XG4gIHJldHVybiBjLmpzb24ocHJvZHVjdCk7XG59KTtcblxuYWRtaW5Sb3V0ZXMucG9zdChcbiAgXCIvcHJvZHVjdHNcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJwcm9kdWN0c1wiLCBcImNyZWF0ZVwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgYy5yZXEuanNvbigpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwcm9kdWN0ID0gY3JlYXRlUHJvZHVjdChkYXRhKTtcbiAgICAgIHJldHVybiBjLmpzb24ocHJvZHVjdCwgMjAxKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFN0cmluZyhlKSB9LCA0MDApO1xuICAgIH1cbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLnB1dChcbiAgXCIvcHJvZHVjdHMvOmlkXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwicHJvZHVjdHNcIiwgXCJ1cGRhdGVcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBjLnJlcS5qc29uKCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHByb2R1Y3QgPSB1cGRhdGVQcm9kdWN0KGlkLCBkYXRhKTtcbiAgICAgIGlmICghcHJvZHVjdCkge1xuICAgICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiUHJvZHVjdCBub3QgZm91bmRcIiB9LCA0MDQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGMuanNvbihwcm9kdWN0KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFN0cmluZyhlKSB9LCA0MDApO1xuICAgIH1cbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLmRlbGV0ZShcbiAgXCIvcHJvZHVjdHMvOmlkXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwicHJvZHVjdHNcIiwgXCJkZWxldGVcIiksXG4gIChjKSA9PiB7XG4gICAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICAgIHRyeSB7XG4gICAgICBkZWxldGVQcm9kdWN0KGlkKTtcbiAgICAgIHJldHVybiBjLmpzb24oeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnN0IG1zZyA9IFN0cmluZyhlKTtcbiAgICAgIGlmIChtc2cuaW5jbHVkZXMoXCJub3QgZm91bmRcIikpIHtcbiAgICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIlByb2R1Y3Qgbm90IGZvdW5kXCIgfSwgNDA0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogbXNnIH0sIDQwMCk7XG4gICAgfVxuICB9LFxuKTtcblxuLy8gQ2hlY2sgaWYgcHJvZHVjdCBpcyB1c2VkIGluIGludm9pY2VzXG5hZG1pblJvdXRlcy5nZXQoXG4gIFwiL3Byb2R1Y3RzLzppZC91c2FnZVwiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInByb2R1Y3RzXCIsIFwicmVhZFwiKSxcbiAgKGMpID0+IHtcbiAgICBjb25zdCBpZCA9IGMucmVxLnBhcmFtKFwiaWRcIik7XG4gICAgY29uc3QgcHJvZHVjdCA9IGdldFByb2R1Y3RCeUlkKGlkKTtcbiAgICBpZiAoIXByb2R1Y3QpIHtcbiAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJQcm9kdWN0IG5vdCBmb3VuZFwiIH0sIDQwNCk7XG4gICAgfVxuICAgIGNvbnN0IHVzZWRJbkludm9pY2VzID0gaXNQcm9kdWN0VXNlZEluSW52b2ljZXMoaWQpO1xuICAgIHJldHVybiBjLmpzb24oeyB1c2VkSW5JbnZvaWNlcyB9KTtcbiAgfSxcbik7XG5cbi8vIFJlYWN0aXZhdGUgYSBzb2Z0LWRlbGV0ZWQgcHJvZHVjdFxuYWRtaW5Sb3V0ZXMucG9zdChcbiAgXCIvcHJvZHVjdHMvOmlkL3JlYWN0aXZhdGVcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJwcm9kdWN0c1wiLCBcInVwZGF0ZVwiKSxcbiAgKGMpID0+IHtcbiAgICBjb25zdCBpZCA9IGMucmVxLnBhcmFtKFwiaWRcIik7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHByb2R1Y3QgPSByZWFjdGl2YXRlUHJvZHVjdChpZCk7XG4gICAgICBpZiAoIXByb2R1Y3QpIHtcbiAgICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIlByb2R1Y3Qgbm90IGZvdW5kXCIgfSwgNDA0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjLmpzb24ocHJvZHVjdCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBTdHJpbmcoZSkgfSwgNDAwKTtcbiAgICB9XG4gIH0sXG4pO1xuXG4vLyBQcm9kdWN0IENhdGVnb3JpZXNcbmFkbWluUm91dGVzLmdldChcbiAgXCIvcHJvZHVjdC1jYXRlZ29yaWVzXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwicHJvZHVjdHNcIiwgXCJyZWFkXCIpLFxuICAoYykgPT4ge1xuICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBnZXRDYXRlZ29yaWVzKCk7XG4gICAgcmV0dXJuIGMuanNvbihjYXRlZ29yaWVzKTtcbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLmdldChcbiAgXCIvcHJvZHVjdC1jYXRlZ29yaWVzLzppZFwiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInByb2R1Y3RzXCIsIFwicmVhZFwiKSxcbiAgKGMpID0+IHtcbiAgICBpZiAoIWNhdGVnb3J5KSB7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiQ2F0ZWdvcnkgbm90IGZvdW5kXCIgfSwgNDA0KTtcbiAgICB9XG4gICAgcmV0dXJuIGMuanNvbihjYXRlZ29yeSk7XG4gIH0sXG4pO1xuXG5hZG1pblJvdXRlcy5wb3N0KFxuICBcIi9wcm9kdWN0LWNhdGVnb3JpZXNcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJwcm9kdWN0c1wiLCBcImNyZWF0ZVwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgYy5yZXEuanNvbigpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjYXRlZ29yeSA9IGNyZWF0ZUNhdGVnb3J5KGRhdGEpO1xuICAgICAgcmV0dXJuIGMuanNvbihjYXRlZ29yeSwgMjAxKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFN0cmluZyhlKSB9LCA0MDApO1xuICAgIH1cbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLnB1dChcbiAgXCIvcHJvZHVjdC1jYXRlZ29yaWVzLzppZFwiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInByb2R1Y3RzXCIsIFwidXBkYXRlXCIpLFxuICBhc3luYyAoYykgPT4ge1xuICAgIGNvbnN0IGlkID0gYy5yZXEucGFyYW0oXCJpZFwiKTtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgYy5yZXEuanNvbigpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjYXRlZ29yeSA9IHVwZGF0ZUNhdGVnb3J5KGlkLCBkYXRhKTtcbiAgICAgIGlmICghY2F0ZWdvcnkpIHtcbiAgICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIkNhdGVnb3J5IG5vdCBmb3VuZFwiIH0sIDQwNCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYy5qc29uKGNhdGVnb3J5KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFN0cmluZyhlKSB9LCA0MDApO1xuICAgIH1cbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLmRlbGV0ZShcbiAgXCIvcHJvZHVjdC1jYXRlZ29yaWVzLzppZFwiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInByb2R1Y3RzXCIsIFwiZGVsZXRlXCIpLFxuICAoYykgPT4ge1xuICAgIGNvbnN0IGlkID0gYy5yZXEucGFyYW0oXCJpZFwiKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGVsZXRlZCA9IGRlbGV0ZUNhdGVnb3J5KGlkKTtcbiAgICAgIGlmICghZGVsZXRlZCkge1xuICAgICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiQ2F0ZWdvcnkgbm90IGZvdW5kXCIgfSwgNDA0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjLmpzb24oeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogU3RyaW5nKGUpIH0sIDQwMCk7XG4gICAgfVxuICB9LFxuKTtcblxuYWRtaW5Sb3V0ZXMuZ2V0KFxuICBcIi9wcm9kdWN0LWNhdGVnb3JpZXMvOmlkL3VzYWdlXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwicHJvZHVjdHNcIiwgXCJyZWFkXCIpLFxuICAoYykgPT4ge1xuICAgIGNvbnN0IGlkID0gYy5yZXEucGFyYW0oXCJpZFwiKTtcbiAgICBjb25zdCB1c2FnZSA9IGlzQ2F0ZWdvcnlVc2VkKGlkKTtcbiAgICByZXR1cm4gYy5qc29uKHVzYWdlKTtcbiAgfSxcbik7XG5cbi8vIFByb2R1Y3QgVW5pdHNcbmFkbWluUm91dGVzLmdldChcbiAgXCIvcHJvZHVjdC11bml0c1wiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInByb2R1Y3RzXCIsIFwicmVhZFwiKSxcbiAgKGMpID0+IHtcbiAgICBjb25zdCB1bml0cyA9IGdldFVuaXRzKCk7XG4gICAgcmV0dXJuIGMuanNvbih1bml0cyk7XG4gIH0sXG4pO1xuXG5hZG1pblJvdXRlcy5nZXQoXG4gIFwiL3Byb2R1Y3QtdW5pdHMvOmlkXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwicHJvZHVjdHNcIiwgXCJyZWFkXCIpLFxuICAoYykgPT4ge1xuICAgIGlmICghdW5pdCkge1xuICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIlVuaXQgbm90IGZvdW5kXCIgfSwgNDA0KTtcbiAgICB9XG4gICAgcmV0dXJuIGMuanNvbih1bml0KTtcbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLnBvc3QoXG4gIFwiL3Byb2R1Y3QtdW5pdHNcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJwcm9kdWN0c1wiLCBcImNyZWF0ZVwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgYy5yZXEuanNvbigpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB1bml0ID0gY3JlYXRlVW5pdChkYXRhKTtcbiAgICAgIHJldHVybiBjLmpzb24odW5pdCwgMjAxKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFN0cmluZyhlKSB9LCA0MDApO1xuICAgIH1cbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLnB1dChcbiAgXCIvcHJvZHVjdC11bml0cy86aWRcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJwcm9kdWN0c1wiLCBcInVwZGF0ZVwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBpZCA9IGMucmVxLnBhcmFtKFwiaWRcIik7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGMucmVxLmpzb24oKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdW5pdCA9IHVwZGF0ZVVuaXQoaWQsIGRhdGEpO1xuICAgICAgaWYgKCF1bml0KSB7XG4gICAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJVbml0IG5vdCBmb3VuZFwiIH0sIDQwNCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYy5qc29uKHVuaXQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogU3RyaW5nKGUpIH0sIDQwMCk7XG4gICAgfVxuICB9LFxuKTtcblxuYWRtaW5Sb3V0ZXMuZGVsZXRlKFxuICBcIi9wcm9kdWN0LXVuaXRzLzppZFwiLFxuICByZXF1aXJlUGVybWlzc2lvbihcInByb2R1Y3RzXCIsIFwiZGVsZXRlXCIpLFxuICAoYykgPT4ge1xuICAgIGNvbnN0IGlkID0gYy5yZXEucGFyYW0oXCJpZFwiKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGVsZXRlZCA9IGRlbGV0ZVVuaXQoaWQpO1xuICAgICAgaWYgKCFkZWxldGVkKSB7XG4gICAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJVbml0IG5vdCBmb3VuZFwiIH0sIDQwNCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYy5qc29uKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFN0cmluZyhlKSB9LCA0MDApO1xuICAgIH1cbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLmdldChcbiAgXCIvcHJvZHVjdC11bml0cy86aWQvdXNhZ2VcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJwcm9kdWN0c1wiLCBcInJlYWRcIiksXG4gIChjKSA9PiB7XG4gICAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICAgIGNvbnN0IHVzYWdlID0gaXNVbml0VXNlZChpZCk7XG4gICAgcmV0dXJuIGMuanNvbih1c2FnZSk7XG4gIH0sXG4pO1xuXG4vLyBBdXRoZW50aWNhdGVkIEhUTUwvUERGIGdlbmVyYXRpb24gZm9yIGludm9pY2VzIGJ5IElEIChubyBzaGFyZSB0b2tlbiByZXF1aXJlZClcbmFkbWluUm91dGVzLmdldChcbiAgXCIvaW52b2ljZXMvOmlkL2h0bWxcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJpbnZvaWNlc1wiLCBcInJlYWRcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICAgIGNvbnN0IGludm9pY2UgPSBnZXRJbnZvaWNlQnlJZChpZCk7XG4gICAgaWYgKCFpbnZvaWNlKSB7XG4gICAgICByZXR1cm4gYy5qc29uKHsgbWVzc2FnZTogXCJJbnZvaWNlIG5vdCBmb3VuZFwiIH0sIDQwNCk7XG4gICAgfVxuXG4gICAgLy8gU2V0dGluZ3MgbWFwXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBhd2FpdCBnZXRTZXR0aW5ncygpO1xuICAgIGNvbnN0IHNldHRpbmdzTWFwID0gc2V0dGluZ3MucmVkdWNlKFxuICAgICAgKGFjYzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiwgcykgPT4ge1xuICAgICAgICBhY2Nbcy5rZXldID0gcy52YWx1ZSBhcyBzdHJpbmc7XG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LFxuICAgICAge30gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgICApO1xuICAgIGlmICghc2V0dGluZ3NNYXAucG9zdGFsQ2l0eUZvcm1hdCAmJiBzZXR0aW5nc01hcC5wb3N0YWxfY2l0eV9mb3JtYXQpIHtcbiAgICAgIHNldHRpbmdzTWFwLnBvc3RhbENpdHlGb3JtYXQgPSBzZXR0aW5nc01hcC5wb3N0YWxfY2l0eV9mb3JtYXQ7XG4gICAgfVxuICAgIGlmICghc2V0dGluZ3NNYXAucG9zdGFsQ2l0eUZvcm1hdCAmJiBzZXR0aW5nc01hcC5wb3N0YWxjaXR5Zm9ybWF0KSB7XG4gICAgICBzZXR0aW5nc01hcC5wb3N0YWxDaXR5Rm9ybWF0ID0gc2V0dGluZ3NNYXAucG9zdGFsY2l0eWZvcm1hdDtcbiAgICB9XG4gICAgaWYgKCFzZXR0aW5nc01hcC5sb2dvICYmIHNldHRpbmdzTWFwLmxvZ29VcmwpIHtcbiAgICAgIHNldHRpbmdzTWFwLmxvZ28gPSBzZXR0aW5nc01hcC5sb2dvVXJsO1xuICAgIH1cblxuICAgIGNvbnN0IGJ1c2luZXNzU2V0dGluZ3MgPSB7XG4gICAgICBjb21wYW55TmFtZTogc2V0dGluZ3NNYXAuY29tcGFueU5hbWUgfHwgXCJZb3VyIENvbXBhbnlcIixcbiAgICAgIGNvbXBhbnlBZGRyZXNzOiBzZXR0aW5nc01hcC5jb21wYW55QWRkcmVzcyB8fCBcIlwiLFxuICAgICAgY29tcGFueUNpdHk6IHNldHRpbmdzTWFwLmNvbXBhbnlDaXR5IHx8IFwiXCIsXG4gICAgICBjb21wYW55UG9zdGFsQ29kZTogc2V0dGluZ3NNYXAuY29tcGFueVBvc3RhbENvZGUgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlDb3VudHJ5Q29kZTogc2V0dGluZ3NNYXAuY29tcGFueUNvdW50cnlDb2RlIHx8IFwiXCIsXG4gICAgICBwb3N0YWxDaXR5Rm9ybWF0OiBzZXR0aW5nc01hcC5wb3N0YWxDaXR5Rm9ybWF0IHx8IFwiYXV0b1wiLFxuICAgICAgY29tcGFueUVtYWlsOiBzZXR0aW5nc01hcC5jb21wYW55RW1haWwgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlQaG9uZTogc2V0dGluZ3NNYXAuY29tcGFueVBob25lIHx8IFwiXCIsXG4gICAgICBjb21wYW55VGF4SWQ6IHNldHRpbmdzTWFwLmNvbXBhbnlUYXhJZCB8fCBcIlwiLFxuICAgICAgY3VycmVuY3k6IHNldHRpbmdzTWFwLmN1cnJlbmN5IHx8IFwiVVNEXCIsXG4gICAgICB0YXhMYWJlbDogc2V0dGluZ3NNYXAudGF4TGFiZWwgfHwgdW5kZWZpbmVkLFxuICAgICAgbG9nbzogc2V0dGluZ3NNYXAubG9nbyxcbiAgICAgIC8vIGJyYW5kTGF5b3V0IHJlbW92ZWQ7IGFsd2F5cyB0cmVhdGluZyBhcyBsb2dvLWxlZnQgaW4gcmVuZGVyaW5nXG4gICAgICBwYXltZW50TWV0aG9kczogc2V0dGluZ3NNYXAucGF5bWVudE1ldGhvZHMgfHwgXCJCYW5rIFRyYW5zZmVyXCIsXG4gICAgICBiYW5rQWNjb3VudDogc2V0dGluZ3NNYXAuYmFua0FjY291bnQgfHwgXCJcIixcbiAgICAgIHBheW1lbnRUZXJtczogc2V0dGluZ3NNYXAucGF5bWVudFRlcm1zIHx8IFwiRHVlIGluIDMwIGRheXNcIixcbiAgICAgIGRlZmF1bHROb3Rlczogc2V0dGluZ3NNYXAuZGVmYXVsdE5vdGVzIHx8IFwiXCIsXG4gICAgICBsb2NhbGU6IHNldHRpbmdzTWFwLmxvY2FsZSB8fCB1bmRlZmluZWQsXG4gICAgfTtcblxuICAgIC8vIFVzZSB0ZW1wbGF0ZS9oaWdobGlnaHQgZnJvbSBzZXR0aW5ncyBvbmx5IChubyBxdWVyeSBvdmVycmlkZXMpXG4gICAgY29uc3QgaGlnaGxpZ2h0ID0gc2V0dGluZ3NNYXAuaGlnaGxpZ2h0ID8/IHVuZGVmaW5lZDtcbiAgICBsZXQgc2VsZWN0ZWRUZW1wbGF0ZUlkOiBzdHJpbmcgfCB1bmRlZmluZWQgPSBzZXR0aW5nc01hcC50ZW1wbGF0ZUlkXG4gICAgICA/LnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKFxuICAgICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID09PSBcInByb2Zlc3Npb25hbFwiIHx8XG4gICAgICBzZWxlY3RlZFRlbXBsYXRlSWQgPT09IFwicHJvZmVzc2lvbmFsLW1vZGVyblwiXG4gICAgKSB7XG4gICAgICBzZWxlY3RlZFRlbXBsYXRlSWQgPSBcInByb2Zlc3Npb25hbC1tb2Rlcm5cIjtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID09PSBcIm1pbmltYWxpc3RcIiB8fFxuICAgICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID09PSBcIm1pbmltYWxpc3QtY2xlYW5cIlxuICAgICkge1xuICAgICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID0gXCJtaW5pbWFsaXN0LWNsZWFuXCI7XG4gICAgfVxuXG4gICAgY29uc3QgY3VzdG9tZXIgPSBnZXRDdXN0b21lckJ5SWQoaW52b2ljZS5jdXN0b21lcklkKTtcbiAgICBjb25zdCByZW5kZXJMb2NhbGUgPSByZXNvbHZlSW52b2ljZVJlbmRlckxvY2FsZShcbiAgICAgIGludm9pY2UubG9jYWxlLFxuICAgICAgY3VzdG9tZXI/LmNvdW50cnlDb2RlLFxuICAgICAgc2V0dGluZ3NNYXAuaW52b2ljZUZhbGxiYWNrTG9jYWxlLFxuICAgICAgc2V0dGluZ3NNYXAubG9jYWxlLFxuICAgICk7XG5cbiAgICBjb25zdCBodG1sID0gYnVpbGRJbnZvaWNlSFRNTChcbiAgICAgIGludm9pY2UsXG4gICAgICBidXNpbmVzc1NldHRpbmdzLFxuICAgICAgc2VsZWN0ZWRUZW1wbGF0ZUlkLFxuICAgICAgaGlnaGxpZ2h0LFxuICAgICAgc2V0dGluZ3NNYXAuZGF0ZUZvcm1hdCxcbiAgICAgIHNldHRpbmdzTWFwLm51bWJlckZvcm1hdCxcbiAgICAgIHJlbmRlckxvY2FsZSxcbiAgICApO1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoaHRtbCwge1xuICAgICAgaGVhZGVyczoge1xuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvaHRtbDsgY2hhcnNldD11dGYtOFwiLFxuICAgICAgICBcIkNhY2hlLUNvbnRyb2xcIjogXCJuby1zdG9yZVwiLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSxcbik7XG5cbmFkbWluUm91dGVzLmdldChcbiAgXCIvaW52b2ljZXMvOmlkL3BkZlwiLFxuICByZXF1aXJlUGVybWlzc2lvbihcImludm9pY2VzXCIsIFwiZXhwb3J0XCIpLFxuICBhc3luYyAoYykgPT4ge1xuICAgIGNvbnN0IGlkID0gYy5yZXEucGFyYW0oXCJpZFwiKTtcbiAgICBjb25zdCBpbnZvaWNlID0gZ2V0SW52b2ljZUJ5SWQoaWQpO1xuICAgIGlmICghaW52b2ljZSkge1xuICAgICAgcmV0dXJuIGMuanNvbih7IG1lc3NhZ2U6IFwiSW52b2ljZSBub3QgZm91bmRcIiB9LCA0MDQpO1xuICAgIH1cblxuICAgIC8vIFNldHRpbmdzIG1hcFxuICAgIGNvbnN0IHNldHRpbmdzID0gYXdhaXQgZ2V0U2V0dGluZ3MoKTtcbiAgICBjb25zdCBzZXR0aW5nc01hcCA9IHNldHRpbmdzLnJlZHVjZShcbiAgICAgIChhY2M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIHMpID0+IHtcbiAgICAgICAgYWNjW3Mua2V5XSA9IHMudmFsdWUgYXMgc3RyaW5nO1xuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSxcbiAgICAgIHt9IGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4gICAgKTtcbiAgICBpZiAoIXNldHRpbmdzTWFwLnBvc3RhbENpdHlGb3JtYXQgJiYgc2V0dGluZ3NNYXAucG9zdGFsX2NpdHlfZm9ybWF0KSB7XG4gICAgICBzZXR0aW5nc01hcC5wb3N0YWxDaXR5Rm9ybWF0ID0gc2V0dGluZ3NNYXAucG9zdGFsX2NpdHlfZm9ybWF0O1xuICAgIH1cbiAgICBpZiAoIXNldHRpbmdzTWFwLnBvc3RhbENpdHlGb3JtYXQgJiYgc2V0dGluZ3NNYXAucG9zdGFsY2l0eWZvcm1hdCkge1xuICAgICAgc2V0dGluZ3NNYXAucG9zdGFsQ2l0eUZvcm1hdCA9IHNldHRpbmdzTWFwLnBvc3RhbGNpdHlmb3JtYXQ7XG4gICAgfVxuICAgIGlmICghc2V0dGluZ3NNYXAubG9nbyAmJiBzZXR0aW5nc01hcC5sb2dvVXJsKSB7XG4gICAgICBzZXR0aW5nc01hcC5sb2dvID0gc2V0dGluZ3NNYXAubG9nb1VybDtcbiAgICB9XG5cbiAgICBjb25zdCBidXNpbmVzc1NldHRpbmdzID0ge1xuICAgICAgY29tcGFueU5hbWU6IHNldHRpbmdzTWFwLmNvbXBhbnlOYW1lIHx8IFwiWW91ciBDb21wYW55XCIsXG4gICAgICBjb21wYW55QWRkcmVzczogc2V0dGluZ3NNYXAuY29tcGFueUFkZHJlc3MgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlDaXR5OiBzZXR0aW5nc01hcC5jb21wYW55Q2l0eSB8fCBcIlwiLFxuICAgICAgY29tcGFueVBvc3RhbENvZGU6IHNldHRpbmdzTWFwLmNvbXBhbnlQb3N0YWxDb2RlIHx8IFwiXCIsXG4gICAgICBjb21wYW55Q291bnRyeUNvZGU6IHNldHRpbmdzTWFwLmNvbXBhbnlDb3VudHJ5Q29kZSB8fCBcIlwiLFxuICAgICAgcG9zdGFsQ2l0eUZvcm1hdDogc2V0dGluZ3NNYXAucG9zdGFsQ2l0eUZvcm1hdCB8fCBcImF1dG9cIixcbiAgICAgIGNvbXBhbnlFbWFpbDogc2V0dGluZ3NNYXAuY29tcGFueUVtYWlsIHx8IFwiXCIsXG4gICAgICBjb21wYW55UGhvbmU6IHNldHRpbmdzTWFwLmNvbXBhbnlQaG9uZSB8fCBcIlwiLFxuICAgICAgY29tcGFueVRheElkOiBzZXR0aW5nc01hcC5jb21wYW55VGF4SWQgfHwgXCJcIixcbiAgICAgIGN1cnJlbmN5OiBzZXR0aW5nc01hcC5jdXJyZW5jeSB8fCBcIlVTRFwiLFxuICAgICAgdGF4TGFiZWw6IHNldHRpbmdzTWFwLnRheExhYmVsIHx8IHVuZGVmaW5lZCxcbiAgICAgIGxvZ286IHNldHRpbmdzTWFwLmxvZ28sXG4gICAgICAvLyBicmFuZExheW91dCByZW1vdmVkOyBhbHdheXMgdHJlYXRpbmcgYXMgbG9nby1sZWZ0IGluIHJlbmRlcmluZ1xuICAgICAgcGF5bWVudE1ldGhvZHM6IHNldHRpbmdzTWFwLnBheW1lbnRNZXRob2RzIHx8IFwiQmFuayBUcmFuc2ZlclwiLFxuICAgICAgYmFua0FjY291bnQ6IHNldHRpbmdzTWFwLmJhbmtBY2NvdW50IHx8IFwiXCIsXG4gICAgICBwYXltZW50VGVybXM6IHNldHRpbmdzTWFwLnBheW1lbnRUZXJtcyB8fCBcIkR1ZSBpbiAzMCBkYXlzXCIsXG4gICAgICBkZWZhdWx0Tm90ZXM6IHNldHRpbmdzTWFwLmRlZmF1bHROb3RlcyB8fCBcIlwiLFxuICAgICAgbG9jYWxlOiBzZXR0aW5nc01hcC5sb2NhbGUgfHwgdW5kZWZpbmVkLFxuICAgIH07XG5cbiAgICAvLyBVc2UgdGVtcGxhdGUvaGlnaGxpZ2h0IGZyb20gc2V0dGluZ3Mgb25seSAobm8gcXVlcnkgb3ZlcnJpZGVzKVxuICAgIGNvbnN0IGhpZ2hsaWdodCA9IHNldHRpbmdzTWFwLmhpZ2hsaWdodCA/PyB1bmRlZmluZWQ7XG4gICAgbGV0IHNlbGVjdGVkVGVtcGxhdGVJZDogc3RyaW5nIHwgdW5kZWZpbmVkID0gc2V0dGluZ3NNYXAudGVtcGxhdGVJZFxuICAgICAgPy50b0xvd2VyQ2FzZSgpO1xuICAgIGlmIChcbiAgICAgIHNlbGVjdGVkVGVtcGxhdGVJZCA9PT0gXCJwcm9mZXNzaW9uYWxcIiB8fFxuICAgICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID09PSBcInByb2Zlc3Npb25hbC1tb2Rlcm5cIlxuICAgICkge1xuICAgICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID0gXCJwcm9mZXNzaW9uYWwtbW9kZXJuXCI7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIHNlbGVjdGVkVGVtcGxhdGVJZCA9PT0gXCJtaW5pbWFsaXN0XCIgfHxcbiAgICAgIHNlbGVjdGVkVGVtcGxhdGVJZCA9PT0gXCJtaW5pbWFsaXN0LWNsZWFuXCJcbiAgICApIHtcbiAgICAgIHNlbGVjdGVkVGVtcGxhdGVJZCA9IFwibWluaW1hbGlzdC1jbGVhblwiO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBlbWJlZFhtbCA9XG4gICAgICAgIFN0cmluZyhzZXR0aW5nc01hcC5lbWJlZFhtbEluUGRmIHx8IFwiZmFsc2VcIikudG9Mb3dlckNhc2UoKSA9PT0gXCJ0cnVlXCI7XG4gICAgICBjb25zdCB4bWxQcm9maWxlSWQgPSBzZXR0aW5nc01hcC54bWxQcm9maWxlSWQgfHwgXCJ1YmwyMVwiO1xuICAgICAgY29uc3QgY3VzdG9tZXIgPSBnZXRDdXN0b21lckJ5SWQoaW52b2ljZS5jdXN0b21lcklkKTtcbiAgICAgIGNvbnN0IHJlbmRlckxvY2FsZSA9IHJlc29sdmVJbnZvaWNlUmVuZGVyTG9jYWxlKFxuICAgICAgICBpbnZvaWNlLmxvY2FsZSxcbiAgICAgICAgY3VzdG9tZXI/LmNvdW50cnlDb2RlLFxuICAgICAgICBzZXR0aW5nc01hcC5pbnZvaWNlRmFsbGJhY2tMb2NhbGUsXG4gICAgICAgIHNldHRpbmdzTWFwLmxvY2FsZSxcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IHBkZkJ1ZmZlciA9IGF3YWl0IGdlbmVyYXRlUERGKFxuICAgICAgICBpbnZvaWNlLFxuICAgICAgICBidXNpbmVzc1NldHRpbmdzLFxuICAgICAgICBzZWxlY3RlZFRlbXBsYXRlSWQsXG4gICAgICAgIGhpZ2hsaWdodCxcbiAgICAgICAge1xuICAgICAgICAgIGVtYmVkWG1sLFxuICAgICAgICAgIGVtYmVkWG1sUHJvZmlsZUlkOiB4bWxQcm9maWxlSWQsXG4gICAgICAgICAgZGF0ZUZvcm1hdDogc2V0dGluZ3NNYXAuZGF0ZUZvcm1hdCxcbiAgICAgICAgICBudW1iZXJGb3JtYXQ6IHNldHRpbmdzTWFwLm51bWJlckZvcm1hdCxcbiAgICAgICAgICBsb2NhbGU6IHJlbmRlckxvY2FsZSxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgICAvLyBEZXRlY3QgZW1iZWRkZWQgYXR0YWNobWVudHMgZm9yIGRpYWdub3N0aWNzXG4gICAgICBsZXQgaGFzQXR0YWNobWVudCA9IGZhbHNlO1xuICAgICAgbGV0IGF0dGFjaG1lbnROYW1lczogc3RyaW5nW10gPSBbXTtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIER5bmFtaWNhbGx5IGltcG9ydCB0byBhdm9pZCBpbXBvcnQgY3ljbGVzXG4gICAgICAgIGNvbnN0IHsgUERGRG9jdW1lbnQgfSA9IGF3YWl0IGltcG9ydChcInBkZi1saWJcIik7XG4gICAgICAgIGNvbnN0IGRvYyA9IGF3YWl0IFBERkRvY3VtZW50LmxvYWQocGRmQnVmZmVyKTtcbiAgICAgICAgY29uc3QgbWF5YmUgPSAoXG4gICAgICAgICAgZG9jIGFzIHVua25vd24gYXMge1xuICAgICAgICAgICAgZ2V0QXR0YWNobWVudHM/OiAoKSA9PiBSZWNvcmQ8c3RyaW5nLCBVaW50OEFycmF5PjtcbiAgICAgICAgICB9XG4gICAgICAgICkuZ2V0QXR0YWNobWVudHM/LigpO1xuICAgICAgICBpZiAobWF5YmUgJiYgdHlwZW9mIG1heWJlID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgYXR0YWNobWVudE5hbWVzID0gT2JqZWN0LmtleXMobWF5YmUpO1xuICAgICAgICAgIGhhc0F0dGFjaG1lbnQgPSBhdHRhY2htZW50TmFtZXMubGVuZ3RoID4gMDtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoX2UpIHtcbiAgICAgICAgLyogaWdub3JlICovXG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHBkZkJ1ZmZlciwge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9wZGZcIixcbiAgICAgICAgICBcIkNvbnRlbnQtRGlzcG9zaXRpb25cIjogYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwiaW52b2ljZS0ke1xuICAgICAgICAgICAgaW52b2ljZS5pbnZvaWNlTnVtYmVyIHx8IGlkXG4gICAgICAgICAgfS5wZGZcImAsXG4gICAgICAgICAgLi4uKGhhc0F0dGFjaG1lbnRcbiAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBcIlgtRW1iZWRkZWQtWE1MXCI6IFwidHJ1ZVwiLFxuICAgICAgICAgICAgICBcIlgtRW1iZWRkZWQtWE1MLU5hbWVzXCI6IGF0dGFjaG1lbnROYW1lcy5qb2luKFwiLFwiKSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDogeyBcIlgtRW1iZWRkZWQtWE1MXCI6IFwiZmFsc2VcIiB9KSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6IFN0cmluZyhlKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCIvaW52b2ljZXMvOmlkL3BkZiBmYWlsZWQ6XCIsIG1zZyk7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiRmFpbGVkIHRvIGdlbmVyYXRlIFBERlwiLCBkZXRhaWxzOiBtc2cgfSwgNTAwKTtcbiAgICB9XG4gIH0sXG4pO1xuXG4vLyBTZW5kIGludm9pY2UgdmlhIGVtYWlsIChTTVRQMkdPKVxuYWRtaW5Sb3V0ZXMucG9zdChcbiAgXCIvaW52b2ljZXMvOmlkL3NlbmQtZW1haWxcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJpbnZvaWNlc1wiLCBcImV4cG9ydFwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBpZiAoIWlzRW1haWxDb25maWd1cmVkKCkpIHtcbiAgICAgIHJldHVybiBjLmpzb24oXG4gICAgICAgIHsgZXJyb3I6IFwiRW1haWwgaXMgbm90IGNvbmZpZ3VyZWQuIFNldCBTTVRQMkdPX0FQSV9LRVkgYW5kIEVNQUlMX0ZST01fQUREUkVTUy5cIiB9LFxuICAgICAgICA1MDMsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGlkID0gYy5yZXEucGFyYW0oXCJpZFwiKTtcbiAgICBjb25zdCBpbnZvaWNlID0gZ2V0SW52b2ljZUJ5SWQoaWQpO1xuICAgIGlmICghaW52b2ljZSkgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIkludm9pY2Ugbm90IGZvdW5kXCIgfSwgNDA0KTtcblxuICAgIGxldCB0bzogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgc3ViamVjdCA9IFwiXCI7XG4gICAgbGV0IG1lc3NhZ2UgPSBcIlwiO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBib2R5ID0gYXdhaXQgYy5yZXEuanNvbigpO1xuICAgICAgdG8gPSBBcnJheS5pc0FycmF5KGJvZHkudG8pID8gYm9keS50by5maWx0ZXIoKGU6IHVua25vd24pID0+IHR5cGVvZiBlID09PSBcInN0cmluZ1wiICYmIGUuaW5jbHVkZXMoXCJAXCIpKSA6IFtdO1xuICAgICAgc3ViamVjdCA9IHR5cGVvZiBib2R5LnN1YmplY3QgPT09IFwic3RyaW5nXCIgPyBib2R5LnN1YmplY3QudHJpbSgpIDogXCJcIjtcbiAgICAgIG1lc3NhZ2UgPSB0eXBlb2YgYm9keS5tZXNzYWdlID09PSBcInN0cmluZ1wiID8gYm9keS5tZXNzYWdlLnRyaW0oKSA6IFwiXCI7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiSW52YWxpZCByZXF1ZXN0IGJvZHlcIiB9LCA0MDApO1xuICAgIH1cblxuICAgIGlmICh0by5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJBdCBsZWFzdCBvbmUgdmFsaWQgcmVjaXBpZW50IGVtYWlsIGlzIHJlcXVpcmVkXCIgfSwgNDAwKTtcbiAgICB9XG4gICAgaWYgKCFzdWJqZWN0KSB7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiU3ViamVjdCBpcyByZXF1aXJlZFwiIH0sIDQwMCk7XG4gICAgfVxuXG4gICAgLy8gQnVpbGQgc2V0dGluZ3MgbWFwIChzYW1lIGFzIC9wZGYgcm91dGUpXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBhd2FpdCBnZXRTZXR0aW5ncygpO1xuICAgIGNvbnN0IHNldHRpbmdzTWFwID0gc2V0dGluZ3MucmVkdWNlKFxuICAgICAgKGFjYzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiwgcykgPT4geyBhY2Nbcy5rZXldID0gcy52YWx1ZSBhcyBzdHJpbmc7IHJldHVybiBhY2M7IH0sXG4gICAgICB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuICAgICk7XG4gICAgaWYgKCFzZXR0aW5nc01hcC5wb3N0YWxDaXR5Rm9ybWF0ICYmIHNldHRpbmdzTWFwLnBvc3RhbF9jaXR5X2Zvcm1hdCkge1xuICAgICAgc2V0dGluZ3NNYXAucG9zdGFsQ2l0eUZvcm1hdCA9IHNldHRpbmdzTWFwLnBvc3RhbF9jaXR5X2Zvcm1hdDtcbiAgICB9XG4gICAgaWYgKCFzZXR0aW5nc01hcC5sb2dvICYmIHNldHRpbmdzTWFwLmxvZ29VcmwpIHtcbiAgICAgIHNldHRpbmdzTWFwLmxvZ28gPSBzZXR0aW5nc01hcC5sb2dvVXJsO1xuICAgIH1cblxuICAgIGNvbnN0IGJ1c2luZXNzU2V0dGluZ3MgPSB7XG4gICAgICBjb21wYW55TmFtZTogc2V0dGluZ3NNYXAuY29tcGFueU5hbWUgfHwgXCJZb3VyIENvbXBhbnlcIixcbiAgICAgIGNvbXBhbnlBZGRyZXNzOiBzZXR0aW5nc01hcC5jb21wYW55QWRkcmVzcyB8fCBcIlwiLFxuICAgICAgY29tcGFueUNpdHk6IHNldHRpbmdzTWFwLmNvbXBhbnlDaXR5IHx8IFwiXCIsXG4gICAgICBjb21wYW55UG9zdGFsQ29kZTogc2V0dGluZ3NNYXAuY29tcGFueVBvc3RhbENvZGUgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlDb3VudHJ5Q29kZTogc2V0dGluZ3NNYXAuY29tcGFueUNvdW50cnlDb2RlIHx8IFwiXCIsXG4gICAgICBwb3N0YWxDaXR5Rm9ybWF0OiBzZXR0aW5nc01hcC5wb3N0YWxDaXR5Rm9ybWF0IHx8IFwiYXV0b1wiLFxuICAgICAgY29tcGFueUVtYWlsOiBzZXR0aW5nc01hcC5jb21wYW55RW1haWwgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlQaG9uZTogc2V0dGluZ3NNYXAuY29tcGFueVBob25lIHx8IFwiXCIsXG4gICAgICBjb21wYW55VGF4SWQ6IHNldHRpbmdzTWFwLmNvbXBhbnlUYXhJZCB8fCBcIlwiLFxuICAgICAgY3VycmVuY3k6IHNldHRpbmdzTWFwLmN1cnJlbmN5IHx8IFwiVVNEXCIsXG4gICAgICB0YXhMYWJlbDogc2V0dGluZ3NNYXAudGF4TGFiZWwgfHwgdW5kZWZpbmVkLFxuICAgICAgbG9nbzogc2V0dGluZ3NNYXAubG9nbyxcbiAgICAgIHBheW1lbnRNZXRob2RzOiBzZXR0aW5nc01hcC5wYXltZW50TWV0aG9kcyB8fCBcIkJhbmsgVHJhbnNmZXJcIixcbiAgICAgIGJhbmtBY2NvdW50OiBzZXR0aW5nc01hcC5iYW5rQWNjb3VudCB8fCBcIlwiLFxuICAgICAgcGF5bWVudFRlcm1zOiBzZXR0aW5nc01hcC5wYXltZW50VGVybXMgfHwgXCJEdWUgaW4gMzAgZGF5c1wiLFxuICAgICAgZGVmYXVsdE5vdGVzOiBzZXR0aW5nc01hcC5kZWZhdWx0Tm90ZXMgfHwgXCJcIixcbiAgICAgIGxvY2FsZTogc2V0dGluZ3NNYXAubG9jYWxlIHx8IHVuZGVmaW5lZCxcbiAgICB9O1xuXG4gICAgY29uc3QgaGlnaGxpZ2h0ID0gc2V0dGluZ3NNYXAuaGlnaGxpZ2h0ID8/IHVuZGVmaW5lZDtcbiAgICBsZXQgc2VsZWN0ZWRUZW1wbGF0ZUlkOiBzdHJpbmcgfCB1bmRlZmluZWQgPSBzZXR0aW5nc01hcC50ZW1wbGF0ZUlkPy50b0xvd2VyQ2FzZSgpO1xuICAgIGlmIChzZWxlY3RlZFRlbXBsYXRlSWQgPT09IFwicHJvZmVzc2lvbmFsXCIgfHwgc2VsZWN0ZWRUZW1wbGF0ZUlkID09PSBcInByb2Zlc3Npb25hbC1tb2Rlcm5cIikge1xuICAgICAgc2VsZWN0ZWRUZW1wbGF0ZUlkID0gXCJwcm9mZXNzaW9uYWwtbW9kZXJuXCI7XG4gICAgfSBlbHNlIGlmIChzZWxlY3RlZFRlbXBsYXRlSWQgPT09IFwibWluaW1hbGlzdFwiIHx8IHNlbGVjdGVkVGVtcGxhdGVJZCA9PT0gXCJtaW5pbWFsaXN0LWNsZWFuXCIpIHtcbiAgICAgIHNlbGVjdGVkVGVtcGxhdGVJZCA9IFwibWluaW1hbGlzdC1jbGVhblwiO1xuICAgIH1cblxuICAgIC8vIEdlbmVyYXRlIFBERiBhdHRhY2htZW50XG4gICAgbGV0IHBkZkJ1ZmZlcjogVWludDhBcnJheTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY3VzdG9tZXIgPSBnZXRDdXN0b21lckJ5SWQoaW52b2ljZS5jdXN0b21lcklkKTtcbiAgICAgIGNvbnN0IHJlbmRlckxvY2FsZSA9IHJlc29sdmVJbnZvaWNlUmVuZGVyTG9jYWxlKFxuICAgICAgICBpbnZvaWNlLmxvY2FsZSxcbiAgICAgICAgY3VzdG9tZXI/LmNvdW50cnlDb2RlLFxuICAgICAgICBzZXR0aW5nc01hcC5pbnZvaWNlRmFsbGJhY2tMb2NhbGUsXG4gICAgICAgIHNldHRpbmdzTWFwLmxvY2FsZSxcbiAgICAgICk7XG4gICAgICBwZGZCdWZmZXIgPSBhd2FpdCBnZW5lcmF0ZVBERihcbiAgICAgICAgaW52b2ljZSxcbiAgICAgICAgYnVzaW5lc3NTZXR0aW5ncyxcbiAgICAgICAgc2VsZWN0ZWRUZW1wbGF0ZUlkLFxuICAgICAgICBoaWdobGlnaHQsXG4gICAgICAgIHtcbiAgICAgICAgICBlbWJlZFhtbDogZmFsc2UsXG4gICAgICAgICAgZGF0ZUZvcm1hdDogc2V0dGluZ3NNYXAuZGF0ZUZvcm1hdCxcbiAgICAgICAgICBudW1iZXJGb3JtYXQ6IHNldHRpbmdzTWFwLm51bWJlckZvcm1hdCxcbiAgICAgICAgICBsb2NhbGU6IHJlbmRlckxvY2FsZSxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc3QgbXNnID0gZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpO1xuICAgICAgY29uc29sZS5lcnJvcihcIkVtYWlsOiBQREYgZ2VuZXJhdGlvbiBmYWlsZWQ6XCIsIG1zZyk7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiRmFpbGVkIHRvIGdlbmVyYXRlIFBERiBhdHRhY2htZW50XCIsIGRldGFpbHM6IG1zZyB9LCA1MDApO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIGVtYWlsIGJvZHlcbiAgICBjb25zdCBjb21wYW55TmFtZSA9IGJ1c2luZXNzU2V0dGluZ3MuY29tcGFueU5hbWU7XG4gICAgY29uc3QgaW52b2ljZU51bWJlciA9IGludm9pY2UuaW52b2ljZU51bWJlciB8fCBpbnZvaWNlLmlkO1xuICAgIGNvbnN0IHRvdGFsID0gYCR7TnVtYmVyKGludm9pY2UudG90YWwgfHwgMCkudG9GaXhlZCgyKX0gJHtpbnZvaWNlLmN1cnJlbmN5IHx8IFwiXCJ9YC50cmltKCk7XG4gICAgY29uc3QgaXNzdWVEYXRlID0gaW52b2ljZS5pc3N1ZURhdGVcbiAgICAgID8gbmV3IERhdGUoaW52b2ljZS5pc3N1ZURhdGUpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApXG4gICAgICA6IFwiXCI7XG4gICAgY29uc3QgZHVlRGF0ZSA9IGludm9pY2UuZHVlRGF0ZVxuICAgICAgPyBuZXcgRGF0ZShpbnZvaWNlLmR1ZURhdGUpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApXG4gICAgICA6IG51bGw7XG4gICAgY29uc3Qgb3JpZ2luID0gYy5yZXEuaGVhZGVyKFwib3JpZ2luXCIpIHx8XG4gICAgICBjLnJlcS5oZWFkZXIoXCJyZWZlcmVyXCIpPy5yZXBsYWNlKC9cXC8kLywgXCJcIikgfHwgXCJcIjtcbiAgICBjb25zdCBzaGFyZUxpbmsgPSBpbnZvaWNlLnNoYXJlVG9rZW4gJiYgb3JpZ2luXG4gICAgICA/IGAke29yaWdpbn0vcHVibGljL2ludm9pY2VzLyR7aW52b2ljZS5zaGFyZVRva2VufWBcbiAgICAgIDogbnVsbDtcblxuICAgIGNvbnN0IG1lc3NhZ2VIdG1sID0gbWVzc2FnZVxuICAgICAgPyBgPHAgc3R5bGU9XCJ3aGl0ZS1zcGFjZTpwcmUtd3JhcDtcIj4ke21lc3NhZ2UucmVwbGFjZSgvJi9nLCBcIiZhbXA7XCIpLnJlcGxhY2UoLzwvZywgXCImbHQ7XCIpLnJlcGxhY2UoLz4vZywgXCImZ3Q7XCIpfTwvcD5gXG4gICAgICA6IFwiXCI7XG4gICAgY29uc3Qgc2hhcmVMaW5rSHRtbCA9IHNoYXJlTGlua1xuICAgICAgPyBgPHA+PGEgaHJlZj1cIiR7c2hhcmVMaW5rfVwiIHN0eWxlPVwiY29sb3I6IzI1NjNlYjtcIj5WaWV3IGludm9pY2Ugb25saW5lPC9hPjwvcD5gXG4gICAgICA6IFwiXCI7XG4gICAgY29uc3QgZHVlRGF0ZUh0bWwgPSBkdWVEYXRlID8gYDx0cj48dGQgc3R5bGU9XCJwYWRkaW5nOjRweCA4cHg7Y29sb3I6IzZiNzI4MDtcIj5EdWUgZGF0ZTwvdGQ+PHRkIHN0eWxlPVwicGFkZGluZzo0cHggOHB4O1wiPiR7ZHVlRGF0ZX08L3RkPjwvdHI+YCA6IFwiXCI7XG5cbiAgICBjb25zdCBodG1sQm9keSA9IGA8IURPQ1RZUEUgaHRtbD5cbjxodG1sPlxuPGhlYWQ+PG1ldGEgY2hhcnNldD1cInV0Zi04XCI+PC9oZWFkPlxuPGJvZHkgc3R5bGU9XCJmb250LWZhbWlseTpzYW5zLXNlcmlmO2NvbG9yOiMxMTE7bWF4LXdpZHRoOjYwMHB4O21hcmdpbjowIGF1dG87cGFkZGluZzoyNHB4O1wiPlxuICA8aDIgc3R5bGU9XCJtYXJnaW4tdG9wOjA7XCI+JHtjb21wYW55TmFtZX08L2gyPlxuICAke21lc3NhZ2VIdG1sfVxuICA8dGFibGUgc3R5bGU9XCJib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7bWFyZ2luOjE2cHggMDt3aWR0aDphdXRvO1wiPlxuICAgIDx0cj48dGQgc3R5bGU9XCJwYWRkaW5nOjRweCA4cHg7Y29sb3I6IzZiNzI4MDtcIj5JbnZvaWNlPC90ZD48dGQgc3R5bGU9XCJwYWRkaW5nOjRweCA4cHg7Zm9udC13ZWlnaHQ6NjAwO1wiPiMke2ludm9pY2VOdW1iZXJ9PC90ZD48L3RyPlxuICAgIDx0cj48dGQgc3R5bGU9XCJwYWRkaW5nOjRweCA4cHg7Y29sb3I6IzZiNzI4MDtcIj5Jc3N1ZSBkYXRlPC90ZD48dGQgc3R5bGU9XCJwYWRkaW5nOjRweCA4cHg7XCI+JHtpc3N1ZURhdGV9PC90ZD48L3RyPlxuICAgICR7ZHVlRGF0ZUh0bWx9XG4gICAgPHRyPjx0ZCBzdHlsZT1cInBhZGRpbmc6NHB4IDhweDtjb2xvcjojNmI3MjgwO1wiPlRvdGFsPC90ZD48dGQgc3R5bGU9XCJwYWRkaW5nOjRweCA4cHg7Zm9udC13ZWlnaHQ6NjAwO1wiPiR7dG90YWx9PC90ZD48L3RyPlxuICA8L3RhYmxlPlxuICAke3NoYXJlTGlua0h0bWx9XG4gIDxwIHN0eWxlPVwiY29sb3I6IzZiNzI4MDtmb250LXNpemU6MTNweDtcIj5UaGUgaW52b2ljZSBQREYgaXMgYXR0YWNoZWQgdG8gdGhpcyBlbWFpbC48L3A+XG48L2JvZHk+XG48L2h0bWw+YDtcblxuICAgIGNvbnN0IHRleHRCb2R5ID0gW1xuICAgICAgY29tcGFueU5hbWUsXG4gICAgICBcIlwiLFxuICAgICAgbWVzc2FnZSB8fCBcIlwiLFxuICAgICAgYEludm9pY2U6ICMke2ludm9pY2VOdW1iZXJ9YCxcbiAgICAgIGBJc3N1ZSBkYXRlOiAke2lzc3VlRGF0ZX1gLFxuICAgICAgZHVlRGF0ZSA/IGBEdWUgZGF0ZTogJHtkdWVEYXRlfWAgOiBcIlwiLFxuICAgICAgYFRvdGFsOiAke3RvdGFsfWAsXG4gICAgICBzaGFyZUxpbmsgPyBgXFxuVmlldyBvbmxpbmU6ICR7c2hhcmVMaW5rfWAgOiBcIlwiLFxuICAgIF0uZmlsdGVyKChsKSA9PiBsICE9PSB1bmRlZmluZWQpLmpvaW4oXCJcXG5cIikudHJpbSgpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNlbmRFbWFpbCh7XG4gICAgICAgIHRvLFxuICAgICAgICBzdWJqZWN0LFxuICAgICAgICBodG1sQm9keSxcbiAgICAgICAgdGV4dEJvZHksXG4gICAgICAgIGF0dGFjaG1lbnQ6IHtcbiAgICAgICAgICBmaWxlbmFtZTogYGludm9pY2UtJHtpbnZvaWNlTnVtYmVyfS5wZGZgLFxuICAgICAgICAgIGNvbnRlbnQ6IHBkZkJ1ZmZlcixcbiAgICAgICAgICBtaW1lVHlwZTogXCJhcHBsaWNhdGlvbi9wZGZcIixcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6IFN0cmluZyhlKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFbWFpbCBzZW5kIGZhaWxlZDpcIiwgbXNnKTtcbiAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJGYWlsZWQgdG8gc2VuZCBlbWFpbFwiLCBkZXRhaWxzOiBtc2cgfSwgNTAyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYy5qc29uKHsgc2VudDogdHJ1ZSwgcmVjaXBpZW50czogdG8ubGVuZ3RoIH0pO1xuICB9LFxuKTtcblxuLy8gVUJMIChQRVBQT0wgQklTIEJpbGxpbmcgMy4wKSBYTUwgZm9yIGFuIGludm9pY2UgYnkgSURcbmFkbWluUm91dGVzLmdldChcbiAgXCIvaW52b2ljZXMvOmlkL3VibC54bWxcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJpbnZvaWNlc1wiLCBcImV4cG9ydFwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBpZCA9IGMucmVxLnBhcmFtKFwiaWRcIik7XG4gICAgY29uc3QgaW52b2ljZSA9IGdldEludm9pY2VCeUlkKGlkKTtcbiAgICBpZiAoIWludm9pY2UpIHtcbiAgICAgIHJldHVybiBjLmpzb24oeyBtZXNzYWdlOiBcIkludm9pY2Ugbm90IGZvdW5kXCIgfSwgNDA0KTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IGF3YWl0IGdldFNldHRpbmdzKCk7XG4gICAgY29uc3QgbWFwID0gc2V0dGluZ3MucmVkdWNlKFxuICAgICAgKGFjYzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiwgcykgPT4ge1xuICAgICAgICBhY2Nbcy5rZXldID0gcy52YWx1ZSBhcyBzdHJpbmc7XG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LFxuICAgICAge30gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgICApO1xuXG4gICAgY29uc3QgYnVzaW5lc3NTZXR0aW5ncyA9IHtcbiAgICAgIGNvbXBhbnlOYW1lOiBtYXAuY29tcGFueU5hbWUgfHwgXCJZb3VyIENvbXBhbnlcIixcbiAgICAgIGNvbXBhbnlBZGRyZXNzOiBtYXAuY29tcGFueUFkZHJlc3MgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlDaXR5OiBtYXAuY29tcGFueUNpdHkgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlQb3N0YWxDb2RlOiBtYXAuY29tcGFueVBvc3RhbENvZGUgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlFbWFpbDogbWFwLmNvbXBhbnlFbWFpbCB8fCBcIlwiLFxuICAgICAgY29tcGFueVBob25lOiBtYXAuY29tcGFueVBob25lIHx8IFwiXCIsXG4gICAgICBjb21wYW55VGF4SWQ6IG1hcC5jb21wYW55VGF4SWQgfHwgXCJcIixcbiAgICAgIGN1cnJlbmN5OiBtYXAuY3VycmVuY3kgfHwgXCJVU0RcIixcbiAgICAgIGxvZ286IG1hcC5sb2dvLFxuICAgICAgcGF5bWVudE1ldGhvZHM6IG1hcC5wYXltZW50TWV0aG9kcyB8fCBcIkJhbmsgVHJhbnNmZXJcIixcbiAgICAgIGJhbmtBY2NvdW50OiBtYXAuYmFua0FjY291bnQgfHwgXCJcIixcbiAgICAgIHBheW1lbnRUZXJtczogbWFwLnBheW1lbnRUZXJtcyB8fCBcIkR1ZSBpbiAzMCBkYXlzXCIsXG4gICAgICBkZWZhdWx0Tm90ZXM6IG1hcC5kZWZhdWx0Tm90ZXMgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlDb3VudHJ5Q29kZTogbWFwLmNvbXBhbnlDb3VudHJ5Q29kZSB8fCBcIlwiLFxuICAgIH07XG5cbiAgICAvLyBPcHRpb25hbCBQRVBQT0wgZW5kcG9pbnQgSURzIGlmIGNvbmZpZ3VyZWQgaW4gc2V0dGluZ3NcbiAgICBjb25zdCB4bWwgPSBnZW5lcmF0ZVVCTEludm9pY2VYTUwoaW52b2ljZSwgYnVzaW5lc3NTZXR0aW5ncywge1xuICAgICAgc2VsbGVyRW5kcG9pbnRJZDogbWFwLnBlcHBvbFNlbGxlckVuZHBvaW50SWQsXG4gICAgICBzZWxsZXJFbmRwb2ludFNjaGVtZUlkOiBtYXAucGVwcG9sU2VsbGVyRW5kcG9pbnRTY2hlbWVJZCxcbiAgICAgIGJ1eWVyRW5kcG9pbnRJZDogbWFwLnBlcHBvbEJ1eWVyRW5kcG9pbnRJZCxcbiAgICAgIGJ1eWVyRW5kcG9pbnRTY2hlbWVJZDogbWFwLnBlcHBvbEJ1eWVyRW5kcG9pbnRTY2hlbWVJZCxcbiAgICAgIHNlbGxlckNvdW50cnlDb2RlOiBtYXAuY29tcGFueUNvdW50cnlDb2RlLFxuICAgICAgYnV5ZXJDb3VudHJ5Q29kZTogaW52b2ljZS5jdXN0b21lci5jb3VudHJ5Q29kZSxcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoeG1sLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24veG1sOyBjaGFyc2V0PXV0Zi04XCIsXG4gICAgICAgIFwiQ29udGVudC1EaXNwb3NpdGlvblwiOiBgYXR0YWNobWVudDsgZmlsZW5hbWU9XCJpbnZvaWNlLSR7XG4gICAgICAgICAgaW52b2ljZS5pbnZvaWNlTnVtYmVyIHx8IGlkXG4gICAgICAgIH0ueG1sXCJgLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSxcbik7XG5cbi8vIEdlbmVyaWMgWE1MIGV4cG9ydCBzZWxlY3RpbmcgYW4gaW50ZXJuYWwgcHJvZmlsZSAoP3Byb2ZpbGU9dWJsMjEgb3Igc3R1Yi1nZW5lcmljKVxuYWRtaW5Sb3V0ZXMuZ2V0KFxuICBcIi9pbnZvaWNlcy86aWQveG1sXCIsXG4gIHJlcXVpcmVQZXJtaXNzaW9uKFwiaW52b2ljZXNcIiwgXCJleHBvcnRcIiksXG4gIGFzeW5jIChjKSA9PiB7XG4gICAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICAgIGNvbnN0IGludm9pY2UgPSBnZXRJbnZvaWNlQnlJZChpZCk7XG4gICAgaWYgKCFpbnZvaWNlKSByZXR1cm4gYy5qc29uKHsgbWVzc2FnZTogXCJJbnZvaWNlIG5vdCBmb3VuZFwiIH0sIDQwNCk7XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IGF3YWl0IGdldFNldHRpbmdzKCk7XG4gICAgY29uc3QgbWFwID0gc2V0dGluZ3MucmVkdWNlKFxuICAgICAgKGFjYzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiwgcykgPT4ge1xuICAgICAgICBhY2Nbcy5rZXldID0gcy52YWx1ZSBhcyBzdHJpbmc7XG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LFxuICAgICAge30gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgICApO1xuXG4gICAgY29uc3QgYnVzaW5lc3NTZXR0aW5ncyA9IHtcbiAgICAgIGNvbXBhbnlOYW1lOiBtYXAuY29tcGFueU5hbWUgfHwgXCJZb3VyIENvbXBhbnlcIixcbiAgICAgIGNvbXBhbnlBZGRyZXNzOiBtYXAuY29tcGFueUFkZHJlc3MgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlDaXR5OiBtYXAuY29tcGFueUNpdHkgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlQb3N0YWxDb2RlOiBtYXAuY29tcGFueVBvc3RhbENvZGUgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlFbWFpbDogbWFwLmNvbXBhbnlFbWFpbCB8fCBcIlwiLFxuICAgICAgY29tcGFueVBob25lOiBtYXAuY29tcGFueVBob25lIHx8IFwiXCIsXG4gICAgICBjb21wYW55VGF4SWQ6IG1hcC5jb21wYW55VGF4SWQgfHwgXCJcIixcbiAgICAgIGN1cnJlbmN5OiBtYXAuY3VycmVuY3kgfHwgXCJVU0RcIixcbiAgICAgIGxvZ286IG1hcC5sb2dvLFxuICAgICAgcGF5bWVudE1ldGhvZHM6IG1hcC5wYXltZW50TWV0aG9kcyB8fCBcIkJhbmsgVHJhbnNmZXJcIixcbiAgICAgIGJhbmtBY2NvdW50OiBtYXAuYmFua0FjY291bnQgfHwgXCJcIixcbiAgICAgIHBheW1lbnRUZXJtczogbWFwLnBheW1lbnRUZXJtcyB8fCBcIkR1ZSBpbiAzMCBkYXlzXCIsXG4gICAgICBkZWZhdWx0Tm90ZXM6IG1hcC5kZWZhdWx0Tm90ZXMgfHwgXCJcIixcbiAgICAgIGNvbXBhbnlDb3VudHJ5Q29kZTogbWFwLmNvbXBhbnlDb3VudHJ5Q29kZSB8fCBcIlwiLFxuICAgIH07XG5cbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKGMucmVxLnVybCk7XG4gICAgY29uc3QgcHJvZmlsZVBhcmFtID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJwcm9maWxlXCIpIHx8IG1hcC54bWxQcm9maWxlSWQgfHxcbiAgICAgIHVuZGVmaW5lZDtcbiAgICBjb25zdCB7IHhtbCwgcHJvZmlsZSB9ID0gZ2VuZXJhdGVJbnZvaWNlWE1MKFxuICAgICAgcHJvZmlsZVBhcmFtLFxuICAgICAgaW52b2ljZSxcbiAgICAgIGJ1c2luZXNzU2V0dGluZ3MsXG4gICAgICB7XG4gICAgICAgIHNlbGxlckVuZHBvaW50SWQ6IG1hcC5wZXBwb2xTZWxsZXJFbmRwb2ludElkLFxuICAgICAgICBzZWxsZXJFbmRwb2ludFNjaGVtZUlkOiBtYXAucGVwcG9sU2VsbGVyRW5kcG9pbnRTY2hlbWVJZCxcbiAgICAgICAgYnV5ZXJFbmRwb2ludElkOiBtYXAucGVwcG9sQnV5ZXJFbmRwb2ludElkLFxuICAgICAgICBidXllckVuZHBvaW50U2NoZW1lSWQ6IG1hcC5wZXBwb2xCdXllckVuZHBvaW50U2NoZW1lSWQsXG4gICAgICAgIHNlbGxlckNvdW50cnlDb2RlOiBtYXAuY29tcGFueUNvdW50cnlDb2RlLFxuICAgICAgICBidXllckNvdW50cnlDb2RlOiBpbnZvaWNlLmN1c3RvbWVyLmNvdW50cnlDb2RlLFxuICAgICAgfSxcbiAgICApO1xuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh4bWwsIHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogYCR7cHJvZmlsZS5tZWRpYVR5cGV9OyBjaGFyc2V0PXV0Zi04YCxcbiAgICAgICAgXCJDb250ZW50LURpc3Bvc2l0aW9uXCI6IGBhdHRhY2htZW50OyBmaWxlbmFtZT1cImludm9pY2UtJHtcbiAgICAgICAgICBpbnZvaWNlLmludm9pY2VOdW1iZXIgfHwgaWRcbiAgICAgICAgfS4ke3Byb2ZpbGUuZmlsZUV4dGVuc2lvbn1cImAsXG4gICAgICB9LFxuICAgIH0pO1xuICB9LFxuKTtcblxuLy8gTGlzdCBidWlsdC1pbiBYTUwgcHJvZmlsZXNcbmFkbWluUm91dGVzLmdldChcIi94bWwtcHJvZmlsZXNcIiwgcmVxdWlyZVBlcm1pc3Npb24oXCJpbnZvaWNlc1wiLCBcInJlYWRcIiksIChjKSA9PiB7XG4gIGNvbnN0IHByb2ZpbGVzID0gbGlzdFhNTFByb2ZpbGVzKCkubWFwKChwKSA9PiAoe1xuICAgIGlkOiBwLmlkLFxuICAgIG5hbWU6IHAubmFtZSxcbiAgICBtZWRpYVR5cGU6IHAubWVkaWFUeXBlLFxuICAgIGZpbGVFeHRlbnNpb246IHAuZmlsZUV4dGVuc2lvbixcbiAgICBleHBlcmltZW50YWw6ICEhcC5leHBlcmltZW50YWwsXG4gICAgYnVpbHRJbjogdHJ1ZSxcbiAgfSkpO1xuICByZXR1cm4gYy5qc29uKHByb2ZpbGVzKTtcbn0pO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFVzZXIgbWFuYWdlbWVudCByb3V0ZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuYWRtaW5Sb3V0ZXMudXNlKFwiL3VzZXJzLypcIiwgcmVxdWlyZUFkbWluQXV0aCk7XG5cbi8vIEdFVCAvdXNlcnMvbWUg4oCUIGN1cnJlbnQgYXV0aGVudGljYXRlZCB1c2VyIChhbnkgYXV0aGVudGljYXRlZCB1c2VyKVxuYWRtaW5Sb3V0ZXMuZ2V0KFwiL3VzZXJzL21lXCIsIChjKSA9PiB7XG4gIGNvbnN0IHVzZXIgPSBnZXRBdXRoVXNlcihjKTtcbiAgaWYgKCF1c2VyKSByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiTm90IGF1dGhlbnRpY2F0ZWRcIiB9LCA0MDEpO1xuICAvLyBSZXR1cm4gdXNlciBpbmZvIHdpdGggcGVybWlzc2lvbnMgYW5kIGF2YWlsYWJsZSBSRVNPVVJDRV9BQ1RJT05TIG1hcFxuICByZXR1cm4gYy5qc29uKHtcbiAgICAuLi51c2VyLFxuICAgIGF2YWlsYWJsZVJlc291cmNlczogUkVTT1VSQ0VfQUNUSU9OUyxcbiAgfSk7XG59KTtcblxuYWRtaW5Sb3V0ZXMucG9zdChcIi91c2Vycy9tZS8yZmEvc2V0dXBcIiwgKGMpID0+IHtcbiAgaWYgKERFTU9fTU9ERSkge1xuICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCIyRkEgaXMgbm90IGF2YWlsYWJsZSBpbiBkZW1vIG1vZGVcIiB9LCA0MDMpO1xuICB9XG4gIGNvbnN0IHVzZXIgPSBnZXRBdXRoVXNlcihjKTtcbiAgaWYgKCF1c2VyKSByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiTm90IGF1dGhlbnRpY2F0ZWRcIiB9LCA0MDEpO1xuICBjb25zdCBzZXR1cCA9IGNyZWF0ZVBlbmRpbmdUd29GYWN0b3JTZXR1cCh1c2VyLmlkLCB1c2VyLnVzZXJuYW1lKTtcbiAgcmV0dXJuIGMuanNvbih7XG4gICAgb3RwQXV0aFVybDogc2V0dXAub3RwQXV0aFVybCxcbiAgICBleHBpcmVzSW46IHNldHVwLmV4cGlyZXNJbixcbiAgfSk7XG59KTtcblxuYWRtaW5Sb3V0ZXMucG9zdChcIi91c2Vycy9tZS8yZmEvdmVyaWZ5XCIsIGFzeW5jIChjKSA9PiB7XG4gIGlmIChERU1PX01PREUpIHtcbiAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiMkZBIGlzIG5vdCBhdmFpbGFibGUgaW4gZGVtbyBtb2RlXCIgfSwgNDAzKTtcbiAgfVxuICBjb25zdCB1c2VyID0gZ2V0QXV0aFVzZXIoYyk7XG4gIGlmICghdXNlcikgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIk5vdCBhdXRoZW50aWNhdGVkXCIgfSwgNDAxKTtcbiAgbGV0IHRva2VuOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHRyeSB7XG4gICAgY29uc3QgYm9keSA9IGF3YWl0IGMucmVxLmpzb24oKTtcbiAgICBpZiAoYm9keSAmJiB0eXBlb2YgYm9keS50b2tlbiA9PT0gXCJzdHJpbmdcIikgdG9rZW4gPSBib2R5LnRva2VuO1xuICB9IGNhdGNoIHtcbiAgICAvLyBpZ25vcmUgcGFyc2UgZXJyb3JzXG4gIH1cbiAgaWYgKCF0b2tlbikgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIk1pc3NpbmcgMkZBIHRva2VuXCIgfSwgNDAwKTtcblxuICBjb25zdCByZXN1bHQgPSB2ZXJpZnlQZW5kaW5nVHdvRmFjdG9yU2V0dXAodXNlci5pZCwgdXNlci51c2VybmFtZSwgdG9rZW4pO1xuICBpZiAoIXJlc3VsdC5vaykgcmV0dXJuIGMuanNvbih7IGVycm9yOiByZXN1bHQucmVhc29uIH0sIDQwMCk7XG5cbiAgY29uc3QgcmVjb3ZlcnlDb2RlcyA9IGdlbmVyYXRlUmVjb3ZlcnlDb2RlcygpO1xuICBjb25zdCByZWNvdmVyeUNvZGVIYXNoZXMgPSBhd2FpdCBoYXNoUmVjb3ZlcnlDb2RlcyhyZWNvdmVyeUNvZGVzKTtcbiAgY29uc3QgZW5jcnlwdGVkU2VjcmV0ID0gYXdhaXQgZW5jcnlwdFR3b0ZhY3RvclNlY3JldChyZXN1bHQuc2VjcmV0QmFzZTMyKTtcbiAgc2V0VXNlclR3b0ZhY3RvclN0YXRlKHVzZXIuaWQsIGVuY3J5cHRlZFNlY3JldCwgcmVjb3ZlcnlDb2RlSGFzaGVzKTtcblxuICByZXR1cm4gYy5qc29uKHtcbiAgICB0d29GYWN0b3JFbmFibGVkOiB0cnVlLFxuICAgIHJlY292ZXJ5Q29kZXMsXG4gIH0pO1xufSk7XG5cbmFkbWluUm91dGVzLmRlbGV0ZShcIi91c2Vycy9tZS8yZmFcIiwgYXN5bmMgKGMpID0+IHtcbiAgaWYgKERFTU9fTU9ERSkge1xuICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCIyRkEgaXMgbm90IGF2YWlsYWJsZSBpbiBkZW1vIG1vZGVcIiB9LCA0MDMpO1xuICB9XG4gIGNvbnN0IHVzZXIgPSBnZXRBdXRoVXNlcihjKTtcbiAgaWYgKCF1c2VyKSByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiTm90IGF1dGhlbnRpY2F0ZWRcIiB9LCA0MDEpO1xuXG4gIGxldCB0b2tlbjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCBjLnJlcS5qc29uKCk7XG4gICAgaWYgKGJvZHkgJiYgdHlwZW9mIGJvZHkudG9rZW4gPT09IFwic3RyaW5nXCIpIHRva2VuID0gYm9keS50b2tlbjtcbiAgfSBjYXRjaCB7XG4gICAgLy8gaWdub3JlIHBhcnNlIGVycm9yc1xuICB9XG4gIGlmICghdG9rZW4pIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJNaXNzaW5nIDJGQSB0b2tlblwiIH0sIDQwMCk7XG5cbiAgY29uc3Qgc3RhdGUgPSBnZXRVc2VyVHdvRmFjdG9yU3RhdGUodXNlci5pZCk7XG4gIGlmICghc3RhdGU/LmVuYWJsZWQgfHwgIXN0YXRlLmVuY3J5cHRlZFNlY3JldCkge1xuICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCIyRkEgaXMgbm90IGVuYWJsZWRcIiB9LCA0MDApO1xuICB9XG5cbiAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgZGVjcnlwdFR3b0ZhY3RvclNlY3JldChzdGF0ZS5lbmNyeXB0ZWRTZWNyZXQpO1xuICBpZiAoIXNlY3JldCB8fCAhdmVyaWZ5VG90cFRva2VuKHNlY3JldCwgdXNlci51c2VybmFtZSwgdG9rZW4pKSB7XG4gICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIkludmFsaWQgMkZBIHRva2VuXCIgfSwgNDAxKTtcbiAgfVxuXG4gIGRpc2FibGVVc2VyVHdvRmFjdG9yKHVzZXIuaWQpO1xuICByZXR1cm4gYy5qc29uKHsgdHdvRmFjdG9yRW5hYmxlZDogZmFsc2UgfSk7XG59KTtcblxuLy8gR0VUIC91c2Vycy9wZXJtaXNzaW9ucy1zY2hlbWEg4oCUIHJldHVybnMgdGhlIHZhbGlkIHJlc291cmNlcyBhbmQgYWN0aW9uc1xuYWRtaW5Sb3V0ZXMuZ2V0KFwiL3VzZXJzL3Blcm1pc3Npb25zLXNjaGVtYVwiLCAoYykgPT4ge1xuICBjb25zdCB1c2VyID0gZ2V0QXV0aFVzZXIoYyk7XG4gIGNvbnN0IGNhblZpZXdTY2hlbWEgPSAhIXVzZXIgJiZcbiAgICAodXNlci5pc0FkbWluIHx8XG4gICAgICB1c2VyLnBlcm1pc3Npb25zLnNvbWUoXG4gICAgICAgIChwKSA9PlxuICAgICAgICAgIHAucmVzb3VyY2UgPT09IFwidXNlcnNcIiAmJlxuICAgICAgICAgIChwLmFjdGlvbiA9PT0gXCJyZWFkXCIgfHxcbiAgICAgICAgICAgIHAuYWN0aW9uID09PSBcImNyZWF0ZVwiIHx8XG4gICAgICAgICAgICBwLmFjdGlvbiA9PT0gXCJ1cGRhdGVcIiksXG4gICAgICApKTtcbiAgaWYgKCFjYW5WaWV3U2NoZW1hKSB7XG4gICAgcmV0dXJuIGMuanNvbihcbiAgICAgIHsgZXJyb3I6IFwiTWlzc2luZyBwZXJtaXNzaW9uOiB1c2VyczpyZWFkfGNyZWF0ZXx1cGRhdGVcIiB9LFxuICAgICAgNDAzLFxuICAgICk7XG4gIH1cblxuICByZXR1cm4gYy5qc29uKHtcbiAgICByZXNvdXJjZXM6IFJFU09VUkNFUyxcbiAgICByZXNvdXJjZUFjdGlvbnM6IFJFU09VUkNFX0FDVElPTlMsXG4gIH0pO1xufSk7XG5cbi8vIEdFVCAvdXNlcnMg4oCUIGxpc3QgYWxsIHVzZXJzXG5hZG1pblJvdXRlcy5nZXQoXCIvdXNlcnNcIiwgcmVxdWlyZVBlcm1pc3Npb24oXCJ1c2Vyc1wiLCBcInJlYWRcIiksIChjKSA9PiB7XG4gIGNvbnN0IHVzZXJzID0gbGlzdFVzZXJzKCk7XG4gIHJldHVybiBjLmpzb24odXNlcnMpO1xufSk7XG5cbi8vIFBPU1QgL3VzZXJzIOKAlCBjcmVhdGUgYSBuZXcgdXNlclxuYWRtaW5Sb3V0ZXMucG9zdChcIi91c2Vyc1wiLCByZXF1aXJlUGVybWlzc2lvbihcInVzZXJzXCIsIFwiY3JlYXRlXCIpLCBhc3luYyAoYykgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBjLnJlcS5qc29uKCk7XG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGNyZWF0ZVVzZXJDdHJsKGRhdGEpO1xuICAgIHJldHVybiBjLmpzb24odXNlciwgMjAxKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnN0IG1zZyA9IFN0cmluZyhlKTtcbiAgICBpZiAoL2FscmVhZHkgZXhpc3RzL2kudGVzdChtc2cpKSByZXR1cm4gYy5qc29uKHsgZXJyb3I6IG1zZyB9LCA0MDkpO1xuICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogbXNnIH0sIDQwMCk7XG4gIH1cbn0pO1xuXG4vLyBHRVQgL3VzZXJzLzppZCDigJQgZ2V0IHVzZXIgZGV0YWlsc1xuYWRtaW5Sb3V0ZXMuZ2V0KFwiL3VzZXJzLzppZFwiLCByZXF1aXJlUGVybWlzc2lvbihcInVzZXJzXCIsIFwicmVhZFwiKSwgKGMpID0+IHtcbiAgY29uc3QgaWQgPSBjLnJlcS5wYXJhbShcImlkXCIpO1xuICBjb25zdCB1c2VyID0gZ2V0VXNlckJ5SWRDdHJsKGlkKTtcbiAgaWYgKCF1c2VyKSByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiVXNlciBub3QgZm91bmRcIiB9LCA0MDQpO1xuICByZXR1cm4gYy5qc29uKHVzZXIpO1xufSk7XG5cbi8vIFBVVCAvdXNlcnMvOmlkIOKAlCB1cGRhdGUgdXNlclxuYWRtaW5Sb3V0ZXMucHV0KFxuICBcIi91c2Vycy86aWRcIixcbiAgcmVxdWlyZVBlcm1pc3Npb24oXCJ1c2Vyc1wiLCBcInVwZGF0ZVwiKSxcbiAgYXN5bmMgKGMpID0+IHtcbiAgICBjb25zdCBpZCA9IGMucmVxLnBhcmFtKFwiaWRcIik7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBjLnJlcS5qc29uKCk7XG4gICAgICBjb25zdCBjdXJyZW50VXNlciA9IGdldEF1dGhVc2VyKGMpO1xuXG4gICAgICAvLyBQcmV2ZW50IGFkbWluIGZyb20gZGVtb3RpbmcgdGhlbXNlbHZlc1xuICAgICAgaWYgKGN1cnJlbnRVc2VyLmlkID09PSBpZCAmJiBkYXRhLmlzQWRtaW4gPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJDYW5ub3QgcmVtb3ZlIHlvdXIgb3duIGFkbWluIHN0YXR1c1wiIH0sIDQwMCk7XG4gICAgICB9XG4gICAgICAvLyBQcmV2ZW50IGFkbWluIGZyb20gZGVhY3RpdmF0aW5nIHRoZW1zZWx2ZXNcbiAgICAgIGlmIChjdXJyZW50VXNlci5pZCA9PT0gaWQgJiYgZGF0YS5pc0FjdGl2ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIkNhbm5vdCBkZWFjdGl2YXRlIHlvdXIgb3duIGFjY291bnRcIiB9LCA0MDApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB1c2VyID0gYXdhaXQgdXBkYXRlVXNlckN0cmwoaWQsIGRhdGEpO1xuICAgICAgcmV0dXJuIGMuanNvbih1c2VyKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zdCBtc2cgPSBTdHJpbmcoZSk7XG4gICAgICBpZiAoL2FscmVhZHkgZXhpc3RzL2kudGVzdChtc2cpKSByZXR1cm4gYy5qc29uKHsgZXJyb3I6IG1zZyB9LCA0MDkpO1xuICAgICAgaWYgKC9ub3QgZm91bmQvaS50ZXN0KG1zZykpIHJldHVybiBjLmpzb24oeyBlcnJvcjogbXNnIH0sIDQwNCk7XG4gICAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IG1zZyB9LCA0MDApO1xuICAgIH1cbiAgfSxcbik7XG5cbi8vIERFTEVURSAvdXNlcnMvOmlkIOKAlCBkZWxldGUgdXNlclxuYWRtaW5Sb3V0ZXMuZGVsZXRlKFwiL3VzZXJzLzppZFwiLCByZXF1aXJlUGVybWlzc2lvbihcInVzZXJzXCIsIFwiZGVsZXRlXCIpLCAoYykgPT4ge1xuICBjb25zdCBpZCA9IGMucmVxLnBhcmFtKFwiaWRcIik7XG4gIHRyeSB7XG4gICAgZGVsZXRlVXNlckN0cmwoaWQpO1xuICAgIHJldHVybiBjLmpzb24oeyBzdWNjZXNzOiB0cnVlIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc3QgbXNnID0gU3RyaW5nKGUpO1xuICAgIGlmICgvbm90IGZvdW5kL2kudGVzdChtc2cpKSByZXR1cm4gYy5qc29uKHsgZXJyb3I6IG1zZyB9LCA0MDQpO1xuICAgIGlmICgvbGFzdCBhZG1pbi9pLnRlc3QobXNnKSkgcmV0dXJuIGMuanNvbih7IGVycm9yOiBtc2cgfSwgNDAwKTtcbiAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IG1zZyB9LCA0MDApO1xuICB9XG59KTtcblxuZXhwb3J0IHsgYWRtaW5Sb3V0ZXMgfTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxRkFBcUY7QUFDckYsU0FBUyxJQUFJLFFBQVEsT0FBTztBQUM1QixTQUNFLGFBQWEsRUFDYixhQUFhLEVBQ2IsZ0JBQWdCLEVBQ2hCLGNBQWMsRUFDZCxXQUFXLEVBQ1gsMkJBQTJCLEVBQzNCLGNBQWMsRUFDZCxnQkFBZ0IsRUFDaEIsYUFBYSxFQUNiLFdBQVcsUUFDTiw2QkFBNkI7QUFDcEMsU0FDRSxjQUFjLEVBQ2QsY0FBYyxFQUNkLGVBQWUsRUFDZixZQUFZLEVBQ1osMkJBQTJCLEVBQzNCLDJCQUEyQixFQUMzQixvQkFBb0IsRUFDcEIsY0FBYyxFQUNkLGtCQUFrQixRQUNiLDhCQUE4QjtBQUNyQyxTQUNFLGFBQWEsRUFDYixVQUFVLEVBQ1YsV0FBVyxFQUNYLFVBQVUsRUFDVixjQUFjLFFBQ1QsNkJBQTZCO0FBQ3BDLFNBQ0UsY0FBYyxFQUNkLGNBQWMsRUFDZCxlQUFlLEVBQ2YsWUFBWSxFQUNaLGNBQWMsUUFDVCw4QkFBOEI7QUFDckMsU0FDRSxhQUFhLEVBQ2IsYUFBYSxFQUNiLGNBQWMsRUFDZCxXQUFXLEVBQ1gsdUJBQXVCLEVBQ3ZCLGlCQUFp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
// denoCacheMetadata=9921450436911963781,13205802107490940217