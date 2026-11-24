import { calculateInvoiceTotals, generateDraftInvoiceNumber, getDatabase, getNextInvoiceNumber } from "../database/init.ts";
import { getSetting } from "./settings.ts";
import { getProductById } from "./products.ts";
import { normalizeInvoiceLocaleSetting } from "../i18n/translations.ts";
import { generateShareToken, generateUUID } from "../utils/uuid.ts";
function isInvoiceProtectionOverrideEnabled() {
  const raw = getSetting("allowProtectedInvoiceChanges");
  if (raw === null || raw === undefined) return false;
  const normalized = String(raw).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}
function calculatePerLineTotals(items, discountPercentage = 0, discountAmount = 0, pricesIncludeTax = false, _roundingMode = "line") {
  const r2 = (n)=>Math.round(n * 100) / 100;
  const lineGrosses = items.map((it)=>(Number(it.quantity) || 0) * (Number(it.unitPrice) || 0));
  const subtotal = lineGrosses.reduce((a, b)=>a + b, 0);
  let finalDiscountAmount = Number(discountAmount) || 0;
  if (discountPercentage > 0) {
    finalDiscountAmount = subtotal * (discountPercentage / 100);
  }
  finalDiscountAmount = Math.min(Math.max(finalDiscountAmount, 0), subtotal);
  // Proportional discount per line to keep rounding consistent
  let distributed = 0;
  const lineDiscounts = lineGrosses.map((g, idx)=>{
    if (subtotal === 0) return 0;
    if (idx === lineGrosses.length - 1) {
      return r2(finalDiscountAmount - distributed);
    }
    const share = g / subtotal;
    const d = r2(finalDiscountAmount * share);
    distributed += d;
    return d;
  });
  const perItem = [];
  let taxAmount = 0;
  let total = 0;
  const summaryMap = new Map();
  for(let i = 0; i < items.length; i++){
    const gross = lineGrosses[i] || 0;
    const afterDiscount = Math.max(0, gross - (lineDiscounts[i] || 0));
    const taxes = items[i].taxes || [];
    const rateSum = taxes.reduce((s, t)=>s + (Number(t.percent) || 0), 0) / 100;
    let net = afterDiscount;
    if (pricesIncludeTax && rateSum > 0) {
      net = afterDiscount / (1 + rateSum);
    }
    const itemTaxes = [];
    for (const t of taxes){
      const p = (Number(t.percent) || 0) / 100;
      const amt = r2(net * p);
      itemTaxes.push({
        percent: r2(p * 100),
        amount: amt,
        note: t.note,
        taxDefinitionId: t.taxDefinitionId
      });
      const s = summaryMap.get(r2(p * 100)) || {
        taxable: 0,
        amount: 0
      };
      s.taxable = r2(s.taxable + net);
      s.amount = r2(s.amount + amt);
      summaryMap.set(r2(p * 100), s);
    }
    const itemTaxSum = r2(itemTaxes.reduce((a, b)=>a + b.amount, 0));
    perItem.push({
      taxable: r2(net),
      taxes: itemTaxes
    });
    if (pricesIncludeTax) {
      total = r2(total + afterDiscount);
      taxAmount = r2(taxAmount + itemTaxSum);
    } else {
      total = r2(total + net + itemTaxSum);
      taxAmount = r2(taxAmount + itemTaxSum);
    }
  }
  const summary = Array.from(summaryMap.entries()).map(([percent, v])=>({
      percent,
      taxable: r2(v.taxable),
      amount: r2(v.amount)
    })).sort((a, b)=>a.percent - b.percent);
  return {
    subtotal: r2(subtotal),
    discountAmount: r2(finalDiscountAmount),
    taxAmount: r2(taxAmount),
    total: r2(total),
    perItem,
    summary
  };
}
function recordStatusChange(db, invoiceId, status, paymentMethod, note) {
  db.query(`INSERT INTO invoice_status_history (id, invoice_id, status, changed_at, payment_method, note)
     VALUES (?, ?, ?, ?, ?, ?)`, [
    generateUUID(),
    invoiceId,
    status,
    new Date().toISOString(),
    paymentMethod ?? null,
    note ?? null
  ]);
}
export function getStatusHistory(invoiceId) {
  const db = getDatabase();
  const rows = db.query(`SELECT id, invoice_id, status, changed_at, payment_method, note
     FROM invoice_status_history
     WHERE invoice_id = ?
     ORDER BY changed_at ASC`, [
    invoiceId
  ]);
  return rows.map((r)=>({
      id: String(r[0]),
      invoiceId: String(r[1]),
      status: String(r[2]),
      changedAt: new Date(String(r[3])),
      paymentMethod: r[4] ? String(r[4]) : undefined,
      note: r[5] ? String(r[5]) : undefined
    }));
}
export function getLatestPaidPaymentMethods(invoiceIds) {
  if (invoiceIds.length === 0) return new Map();
  const db = getDatabase();
  const placeholders = invoiceIds.map(()=>"?").join(", ");
  const rows = db.query(`SELECT invoice_id, payment_method
     FROM invoice_status_history
     WHERE status = 'paid'
       AND payment_method IS NOT NULL
       AND payment_method != ''
       AND invoice_id IN (${placeholders})
     ORDER BY changed_at DESC`, invoiceIds);
  // Keep only the most recent payment method per invoice
  const result = new Map();
  for (const row of rows){
    const id = String(row[0]);
    if (!result.has(id)) result.set(id, String(row[1]));
  }
  return result;
}
/** Current shipping/customs values of the item's product, copied onto the item when it is saved. */ const snapshotProduct = (productId)=>{
  const p = productId ? getProductById(productId) : null;
  return {
    hsCode: p?.hsCode ?? null,
    countryOfOrigin: p?.countryOfOrigin ?? null,
    lengthMm: p?.lengthMm ?? null,
    widthMm: p?.widthMm ?? null,
    heightMm: p?.heightMm ?? null,
    weightG: p?.weightG ?? null
  };
};
const snapshotParams = (s)=>[
    s.hsCode,
    s.countryOfOrigin,
    s.lengthMm,
    s.widthMm,
    s.heightMm,
    s.weightG
  ];
const toNullableNumber = (v)=>v === null || v === undefined ? null : Number(v);
export const createInvoice = (data)=>{
  const db = getDatabase();
  const invoiceId = generateUUID();
  const shareToken = generateShareToken();
  // Prefer client-provided invoiceNumber when unique; otherwise auto-generate
  let invoiceNumber = data.invoiceNumber;
  if (invoiceNumber) {
    const exists = db.query("SELECT 1 FROM invoices WHERE invoice_number = ? LIMIT 1", [
      invoiceNumber
    ]);
    if (exists.length > 0) {
      // Client requested an explicit number which already exists -> reject
      throw new Error("Invoice number already exists");
    }
  } else {
    // If advanced numbering pattern with {SEQ}, {CSEQ}, or {CNUM} is active, allocate real number now; else draft placeholder
    try {
      const rows = db.query("SELECT value FROM settings WHERE key = 'invoiceNumberPattern' LIMIT 1");
      if (rows.length > 0) {
        const pattern = String(rows[0][0] || "").trim();
        if (pattern && /\{(C?SEQ|CNUM)\}/.test(pattern)) {
          invoiceNumber = getNextInvoiceNumber(data.customerId);
        } else {
          invoiceNumber = generateDraftInvoiceNumber();
        }
      } else {
        invoiceNumber = generateDraftInvoiceNumber();
      }
    } catch (_e) {
      invoiceNumber = generateDraftInvoiceNumber();
    }
  }
  // Load settings for defaults
  const settings = getSettings();
  // Determine tax behavior defaults
  const defaultPricesIncludeTax = String(settings.defaultPricesIncludeTax || "false").toLowerCase() === "true";
  const defaultRoundingMode = String(settings.defaultRoundingMode || "line");
  const defaultTaxRate = Number(settings.defaultTaxRate || 0) || 0;
  // Determine if per-line taxes are used
  const hasPerLineTaxes = Array.isArray(data.items) && data.items.some((i)=>Array.isArray(i.taxes) && (i.taxes?.length || 0) > 0);
  let totals = {
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    total: 0
  };
  let perLineCalc = undefined;
  if (hasPerLineTaxes) {
    perLineCalc = calculatePerLineTotals(data.items, data.discountPercentage || 0, data.discountAmount || 0, data.pricesIncludeTax ?? defaultPricesIncludeTax, data.roundingMode || defaultRoundingMode);
    totals = {
      subtotal: perLineCalc.subtotal,
      discountAmount: perLineCalc.discountAmount,
      taxAmount: perLineCalc.taxAmount,
      total: perLineCalc.total
    };
  } else {
    totals = calculateInvoiceTotals(data.items, data.discountPercentage || 0, data.discountAmount || 0, (typeof data.taxRate === "number" ? data.taxRate : defaultTaxRate) || 0, data.pricesIncludeTax ?? defaultPricesIncludeTax, data.roundingMode || defaultRoundingMode);
  }
  const now = new Date();
  const issueDate = data.issueDate ? new Date(data.issueDate) : now;
  const dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
  // Get default settings for currency and payment terms
  const currency = data.currency || settings.currency || "USD";
  const paymentTerms = data.paymentTerms || settings.paymentTerms || "Due in 30 days";
  const pricesIncludeTax = data.pricesIncludeTax ?? defaultPricesIncludeTax;
  const roundingMode = data.roundingMode || defaultRoundingMode;
  const locale = normalizeInvoiceLocaleSetting(data.locale);
  const invoice = {
    id: invoiceId,
    invoiceNumber: invoiceNumber,
    customerId: data.customerId,
    issueDate,
    dueDate,
    currency,
    status: data.status || "draft",
    // Totals
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    discountPercentage: data.discountPercentage || 0,
    taxRate: hasPerLineTaxes ? 0 : data.taxRate || 0,
    taxAmount: totals.taxAmount,
    total: totals.total,
    pricesIncludeTax,
    roundingMode,
    locale,
    // Payment and notes
    paymentTerms,
    notes: data.notes,
    // System fields
    shareToken,
    createdAt: now,
    updatedAt: now
  };
  // Insert invoice
  db.query(`INSERT INTO invoices (
      id, invoice_number, customer_id, issue_date, due_date, currency, status,
      subtotal, discount_amount, discount_percentage, tax_rate, tax_amount, total,
      payment_terms, notes, share_token, created_at, updated_at,
      prices_include_tax, rounding_mode, locale
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    invoice.id,
    invoice.invoiceNumber,
    invoice.customerId,
    invoice.issueDate,
    invoice.dueDate,
    invoice.currency,
    invoice.status,
    invoice.subtotal,
    invoice.discountAmount,
    invoice.discountPercentage,
    invoice.taxRate,
    invoice.taxAmount,
    invoice.total,
    invoice.paymentTerms,
    invoice.notes,
    invoice.shareToken,
    invoice.createdAt,
    invoice.updatedAt,
    pricesIncludeTax ? 1 : 0,
    roundingMode,
    locale ?? null
  ]);
  recordStatusChange(db, invoiceId, invoice.status || "draft");
  // Insert invoice items
  const items = [];
  for(let i = 0; i < data.items.length; i++){
    const item = data.items[i];
    const itemId = generateUUID();
    const lineTotal = item.quantity * item.unitPrice;
    const unit = typeof item.unit === "string" ? item.unit.trim() : "";
    const snapshot = snapshotProduct(item.productId);
    const invoiceItem = {
      id: itemId,
      invoiceId: invoiceId,
      productId: item.productId || undefined,
      description: item.description,
      quantity: item.quantity,
      unit: unit || undefined,
      unitPrice: item.unitPrice,
      lineTotal,
      notes: item.notes,
      sortOrder: i,
      ...snapshot
    };
    db.query(`INSERT INTO invoice_items (
        id, invoice_id, product_id, description, quantity, unit, unit_price, line_total, notes, sort_order,
        hs_code, country_of_origin, length_mm, width_mm, height_mm, weight_g
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      itemId,
      invoiceId,
      item.productId || null,
      item.description,
      item.quantity,
      unit || null,
      item.unitPrice,
      lineTotal,
      item.notes,
      i,
      ...snapshotParams(snapshot)
    ]);
    items.push(invoiceItem);
    // Insert per-line taxes if provided
    if (hasPerLineTaxes && perLineCalc) {
      const calc = perLineCalc.perItem[i];
      if (calc && Array.isArray(item.taxes)) {
        for (const t of calc.taxes){
          db.query(`INSERT INTO invoice_item_taxes (id, invoice_item_id, tax_definition_id, percent, taxable_amount, amount, included, sequence, note, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            generateUUID(),
            itemId,
            t.taxDefinitionId || null,
            t.percent,
            calc.taxable,
            t.amount,
            data.pricesIncludeTax ?? defaultPricesIncludeTax ? 1 : 0,
            0,
            t.note || null,
            new Date()
          ]);
        }
      }
    }
  }
  // Insert invoice-level tax summary if calculated
  if (hasPerLineTaxes && perLineCalc) {
    for (const s of perLineCalc.summary){
      db.query(`INSERT INTO invoice_taxes (id, invoice_id, tax_definition_id, percent, taxable_amount, tax_amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        generateUUID(),
        invoiceId,
        null,
        s.percent,
        s.taxable,
        s.amount,
        new Date()
      ]);
    }
  } else {
    const rawTaxDefId = data.taxDefinitionId;
    const taxDefinitionId = typeof rawTaxDefId === "string" ? rawTaxDefId.trim() : "";
    if (taxDefinitionId) {
      const r2 = (n)=>Math.round(n * 100) / 100;
      const percent = invoice.taxRate || 0;
      const rate = Math.max(0, Number(percent) || 0) / 100;
      const afterDiscount = r2(invoice.subtotal - invoice.discountAmount);
      const taxable = pricesIncludeTax ? rate > 0 ? r2(afterDiscount / (1 + rate)) : afterDiscount : afterDiscount;
      db.query(`INSERT INTO invoice_taxes (id, invoice_id, tax_definition_id, percent, taxable_amount, tax_amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        generateUUID(),
        invoiceId,
        taxDefinitionId,
        percent,
        taxable,
        invoice.taxAmount,
        new Date()
      ]);
    }
  }
  // Get customer info for response
  const customer = getCustomerById(data.customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }
  return {
    ...invoice,
    customer,
    items,
    taxes: hasPerLineTaxes && perLineCalc ? perLineCalc.summary.map((s)=>({
        id: "",
        invoiceId: invoiceId,
        taxDefinitionId: undefined,
        percent: s.percent,
        taxableAmount: s.taxable,
        taxAmount: s.amount
      })) : undefined
  };
};
export const getInvoices = ()=>{
  const db = getDatabase();
  const results = db.query(`
    SELECT id, invoice_number, customer_id, issue_date, due_date, currency, status,
           subtotal, discount_amount, discount_percentage, tax_rate, tax_amount, total,
           payment_terms, notes, share_token, created_at, updated_at,
           prices_include_tax, rounding_mode, locale
    FROM invoices
    ORDER BY created_at DESC
  `);
  const list = results.map((row)=>mapRowToInvoice(row));
  return list.map(applyDerivedOverdue);
};
export const getInvoiceById = (id)=>{
  const db = getDatabase();
  const result = db.query(`
    SELECT id, invoice_number, customer_id, issue_date, due_date, currency, status,
           subtotal, discount_amount, discount_percentage, tax_rate, tax_amount, total,
           payment_terms, notes, share_token, created_at, updated_at,
           prices_include_tax, rounding_mode, locale
    FROM invoices
    WHERE id = ?
  `, [
    id
  ]);
  if (result.length === 0) return null;
  let invoice = mapRowToInvoice(result[0]);
  invoice = applyDerivedOverdue(invoice);
  // Get customer
  const customer = getCustomerById(invoice.customerId);
  if (!customer) return null;
  // Get items
  const itemsResult = db.query(`
    SELECT id, invoice_id, product_id, description, quantity, unit, unit_price, line_total, notes, sort_order,
           hs_code, country_of_origin, length_mm, width_mm, height_mm, weight_g
    FROM invoice_items
    WHERE invoice_id = ?
    ORDER BY sort_order
  `, [
    id
  ]);
  const items = itemsResult.map((row)=>({
      id: row[0],
      invoiceId: row[1],
      productId: row[2] ? String(row[2]) : undefined,
      description: row[3],
      quantity: row[4],
      unit: row[5] ? String(row[5]) : undefined,
      unitPrice: row[6],
      lineTotal: row[7],
      notes: row[8],
      sortOrder: row[9],
      hsCode: row[10] ? String(row[10]) : null,
      countryOfOrigin: row[11] ? String(row[11]) : null,
      lengthMm: toNullableNumber(row[12]),
      widthMm: toNullableNumber(row[13]),
      heightMm: toNullableNumber(row[14]),
      weightG: toNullableNumber(row[15])
    }));
  let itemsWithTaxes = items.map((it)=>({
      ...it
    }));
  if (items.length > 0) {
    const placeholders = items.map(()=>"?").join(",");
    const taxRows = db.query(`SELECT invoice_item_id, tax_definition_id, percent, taxable_amount, amount, included, note FROM invoice_item_taxes WHERE invoice_item_id IN (${placeholders})`, items.map((it)=>it.id));
    const taxesByItem = new Map();
    for (const r of taxRows){
      const itemId = String(r[0]);
      const tax = {
        taxDefinitionId: r[1] ? String(r[1]) : undefined,
        percent: Number(r[2]),
        taxableAmount: Number(r[3]),
        amount: Number(r[4]),
        included: Boolean(r[5]),
        note: r[6]
      };
      if (!taxesByItem.has(itemId)) taxesByItem.set(itemId, []);
      taxesByItem.get(itemId).push(tax);
    }
    itemsWithTaxes = items.map((it)=>({
        ...it,
        taxes: taxesByItem.get(it.id)
      }));
  }
  // Invoice tax summary
  const invTaxRows = db.query(`SELECT id, invoice_id, tax_definition_id, percent, taxable_amount, tax_amount FROM invoice_taxes WHERE invoice_id = ?`, [
    id
  ]);
  const taxes = invTaxRows.map((r)=>({
      id: r[0],
      invoiceId: r[1],
      taxDefinitionId: r[2] ? String(r[2]) : undefined,
      percent: Number(r[3]),
      taxableAmount: Number(r[4]),
      taxAmount: Number(r[5])
    }));
  const statusHistory = getStatusHistory(id);
  return {
    ...invoice,
    customer,
    items: itemsWithTaxes,
    taxes,
    statusHistory
  };
};
export const getInvoiceByShareToken = (shareToken)=>{
  const db = getDatabase();
  const result = db.query(`
    SELECT id, invoice_number, customer_id, issue_date, due_date, currency, status,
           subtotal, discount_amount, discount_percentage, tax_rate, tax_amount, total,
           payment_terms, notes, share_token, created_at, updated_at,
           prices_include_tax, rounding_mode, locale
    FROM invoices
    WHERE share_token = ?
  `, [
    shareToken
  ]);
  if (result.length === 0) return null;
  let invoice = mapRowToInvoice(result[0]);
  invoice = applyDerivedOverdue(invoice);
  // Draft invoices must never be exposed via public share links.
  if (invoice.status === "draft") return null;
  // Get customer
  const customer = getCustomerById(invoice.customerId);
  if (!customer) return null;
  // Get items
  const itemsResult = db.query(`
    SELECT id, invoice_id, product_id, description, quantity, unit, unit_price, line_total, notes, sort_order
    FROM invoice_items
    WHERE invoice_id = ?
    ORDER BY sort_order
  `, [
    invoice.id
  ]);
  const items = itemsResult.map((row)=>({
      id: row[0],
      invoiceId: row[1],
      productId: row[2] ? String(row[2]) : undefined,
      description: row[3],
      quantity: row[4],
      unit: row[5] ? String(row[5]) : undefined,
      unitPrice: row[6],
      lineTotal: row[7],
      notes: row[8],
      sortOrder: row[9]
    }));
  let itemsWithTaxes = items.map((it)=>({
      ...it
    }));
  if (items.length > 0) {
    const placeholders = items.map(()=>"?").join(",");
    const taxRows = db.query(`SELECT invoice_item_id, tax_definition_id, percent, taxable_amount, amount, included, note FROM invoice_item_taxes WHERE invoice_item_id IN (${placeholders})`, items.map((it)=>it.id));
    const taxesByItem = new Map();
    for (const r of taxRows){
      const itemId = String(r[0]);
      const tax = {
        taxDefinitionId: r[1] ? String(r[1]) : undefined,
        percent: Number(r[2]),
        taxableAmount: Number(r[3]),
        amount: Number(r[4]),
        included: Boolean(r[5]),
        note: r[6]
      };
      if (!taxesByItem.has(itemId)) taxesByItem.set(itemId, []);
      taxesByItem.get(itemId).push(tax);
    }
    itemsWithTaxes = items.map((it)=>({
        ...it,
        taxes: taxesByItem.get(it.id)
      }));
  }
  // Invoice tax summary
  const invTaxRows = db.query(`SELECT id, invoice_id, tax_definition_id, percent, taxable_amount, tax_amount FROM invoice_taxes WHERE invoice_id = ?`, [
    invoice.id
  ]);
  const taxes = invTaxRows.map((r)=>({
      id: r[0],
      invoiceId: r[1],
      taxDefinitionId: r[2] ? String(r[2]) : undefined,
      percent: Number(r[3]),
      taxableAmount: Number(r[4]),
      taxAmount: Number(r[5])
    }));
  const statusHistory = getStatusHistory(String(invoice.id));
  return {
    ...invoice,
    customer,
    items: itemsWithTaxes,
    taxes,
    statusHistory
  };
};
export const updateInvoice = async (id, data)=>{
  const existing = await getInvoiceById(id);
  if (!existing) return null;
  const db = getDatabase();
  // existing.status may be the derived "overdue"; persist the stored status
  // instead so it isn't frozen into the database.
  const storedStatus = db.query("SELECT status FROM invoices WHERE id = ?", [
    id
  ])[0]?.[0] ?? existing.status;
  // Immutability: prevent structural changes once sent/paid
  // Voided invoices are completely locked — only deletion is allowed
  if (existing.status === "voided") {
    throw new Error("Voided invoices cannot be modified.");
  }
  // Validate status transitions
  if (data.status && data.status !== existing.status) {
    const from = existing.status;
    const to = data.status;
    const allowed = {
      draft: [
        "sent"
      ],
      sent: [
        "paid"
      ],
      complete: [],
      overdue: [
        "paid"
      ],
      paid: [
        "complete"
      ],
      voided: []
    };
    if (!(allowed[from] || []).includes(to)) {
      throw new Error(`Cannot change status from '${from}' to '${to}'.`);
    }
  }
  const isIssued = existing.status !== "draft";
  const allowProtectedChanges = isInvoiceProtectionOverrideEnabled();
  if (isIssued && !allowProtectedChanges) {
    const forbidden = [
      "items",
      "discountAmount",
      "discountPercentage",
      "taxRate",
      "pricesIncludeTax",
      "roundingMode",
      "currency",
      "customerId",
      "issueDate",
      "invoiceNumber",
      "subtotal",
      "total"
    ];
    for (const k of forbidden){
      if (data[k] !== undefined) {
        throw new Error("Issued invoices cannot be modified. Create a credit note instead.");
      }
    }
  }
  // Optional: validate a custom invoice number if provided
  let nextInvoiceNumber = undefined;
  if (typeof data.invoiceNumber === "string") {
    const desired = data.invoiceNumber.trim();
    if (desired.length > 0 && desired !== existing.invoiceNumber) {
      const dup = db.query("SELECT 1 FROM invoices WHERE invoice_number = ? AND id <> ? LIMIT 1", [
        desired,
        id
      ]);
      if (dup.length > 0) {
        throw new Error("Invoice number already exists");
      }
      nextInvoiceNumber = desired;
    }
  }
  // If items are being updated, recalculate totals
  let totals = {
    subtotal: existing.subtotal,
    discountAmount: existing.discountAmount,
    taxAmount: existing.taxAmount,
    total: existing.total
  };
  let perLineCalcUpdate = undefined;
  if (data.items) {
    const hasPerLine = data.items.some((i)=>Array.isArray(i.taxes) && (i.taxes?.length || 0) > 0);
    if (hasPerLine) {
      perLineCalcUpdate = calculatePerLineTotals(data.items, data.discountPercentage ?? existing.discountPercentage, data.discountAmount ?? existing.discountAmount, data.pricesIncludeTax ?? existing.pricesIncludeTax ?? false, data.roundingMode || existing.roundingMode || "line");
      totals = {
        subtotal: perLineCalcUpdate.subtotal,
        discountAmount: perLineCalcUpdate.discountAmount,
        taxAmount: perLineCalcUpdate.taxAmount,
        total: perLineCalcUpdate.total
      };
    } else {
      totals = calculateInvoiceTotals(data.items, data.discountPercentage ?? existing.discountPercentage, data.discountAmount ?? existing.discountAmount, data.taxRate ?? existing.taxRate, data.pricesIncludeTax ?? existing.pricesIncludeTax ?? false, data.roundingMode || existing.roundingMode || "line");
    }
  }
  const updatedAt = new Date();
  // Normalize notes: treat whitespace-only as empty string so it clears stored notes
  const normalizedNotes = (()=>{
    if (data.notes === undefined) return undefined; // not provided
    const v = String(data.notes);
    return v.trim().length === 0 ? "" : v;
  })();
  db.execute("BEGIN");
  try {
    // Update invoice
    db.query(`
    UPDATE invoices SET
      customer_id = ?, issue_date = ?, due_date = ?, currency = ?, status = ?,
      subtotal = ?, discount_amount = ?, discount_percentage = ?, tax_rate = ?, tax_amount = ?, total = ?,
      payment_terms = ?, notes = ?, updated_at = ?,
      prices_include_tax = COALESCE(?, prices_include_tax),
      rounding_mode = COALESCE(?, rounding_mode),
      locale = ?,
      invoice_number = COALESCE(?, invoice_number)
    WHERE id = ?
  `, [
      data.customerId ?? existing.customerId,
      data.issueDate ? new Date(data.issueDate) : existing.issueDate,
      data.dueDate === null || data.dueDate === "" ? null : data.dueDate ? new Date(data.dueDate) : existing.dueDate,
      data.currency ?? existing.currency,
      data.status ?? storedStatus,
      totals.subtotal,
      totals.discountAmount,
      data.discountPercentage ?? existing.discountPercentage,
      data.taxRate ?? existing.taxRate,
      totals.taxAmount,
      totals.total,
      data.paymentTerms ?? existing.paymentTerms,
      normalizedNotes !== undefined ? normalizedNotes : existing.notes,
      updatedAt,
      typeof data.pricesIncludeTax === "boolean" ? data.pricesIncludeTax ? 1 : 0 : null,
      data.roundingMode ?? null,
      data.locale === undefined ? existing.locale ?? null : normalizeInvoiceLocaleSetting(data.locale) ?? null,
      nextInvoiceNumber ?? null,
      id
    ]);
    // Lock a final invoice number when transitioning out of draft without a custom number
    if ((data.status === "sent" || data.status === "paid") && existing.status === "draft" && !nextInvoiceNumber && existing.invoiceNumber.startsWith("DRAFT-")) {
      const finalNum = getNextInvoiceNumber(data.customerId ?? existing.customerId);
      db.query("UPDATE invoices SET invoice_number = ?, updated_at = ? WHERE id = ?", [
        finalNum,
        new Date(),
        id
      ]);
    }
    // Record status transition in history
    if (data.status && data.status !== existing.status) {
      recordStatusChange(db, id, data.status, data.status === "paid" ? data.paymentMethod : undefined);
    }
    // Update items if provided
    if (data.items) {
      // Delete existing taxes, then items
      db.query("DELETE FROM invoice_item_taxes WHERE invoice_item_id IN (SELECT id FROM invoice_items WHERE invoice_id = ?)", [
        id
      ]);
      db.query("DELETE FROM invoice_taxes WHERE invoice_id = ?", [
        id
      ]);
      db.query("DELETE FROM invoice_items WHERE invoice_id = ?", [
        id
      ]);
      // Drafts take the products' current values; issued invoices (protection
      // override) keep the snapshot taken when they were last saved as draft.
      const previousSnapshots = new Map();
      if (isIssued) {
        for (const prev of existing.items){
          if (prev.productId && !previousSnapshots.has(prev.productId)) {
            previousSnapshots.set(prev.productId, prev);
          }
        }
      }
      // Insert new items
      for(let i = 0; i < data.items.length; i++){
        const item = data.items[i];
        const itemId = generateUUID();
        const lineTotal = item.quantity * item.unitPrice;
        const unit = typeof item.unit === "string" ? item.unit.trim() : "";
        const snapshot = item.productId && previousSnapshots.get(item.productId) || snapshotProduct(item.productId);
        db.query(`
        INSERT INTO invoice_items (
          id, invoice_id, product_id, description, quantity, unit, unit_price, line_total, notes, sort_order,
          hs_code, country_of_origin, length_mm, width_mm, height_mm, weight_g
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
          itemId,
          id,
          item.productId || null,
          item.description,
          item.quantity,
          unit || null,
          item.unitPrice,
          lineTotal,
          item.notes,
          i,
          ...snapshotParams(snapshot)
        ]);
        if (perLineCalcUpdate) {
          const calc = perLineCalcUpdate.perItem[i];
          if (calc && Array.isArray(item.taxes)) {
            for (const t of calc.taxes){
              db.query(`INSERT INTO invoice_item_taxes (id, invoice_item_id, tax_definition_id, percent, taxable_amount, amount, included, sequence, note, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                generateUUID(),
                itemId,
                t.taxDefinitionId || null,
                t.percent,
                calc.taxable,
                t.amount,
                data.pricesIncludeTax ?? existing.pricesIncludeTax ?? false ? 1 : 0,
                0,
                t.note || null,
                new Date()
              ]);
            }
          }
        }
      }
      if (perLineCalcUpdate) {
        for (const s of perLineCalcUpdate.summary){
          db.query(`INSERT INTO invoice_taxes (id, invoice_id, tax_definition_id, percent, taxable_amount, tax_amount, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            generateUUID(),
            id,
            null,
            s.percent,
            s.taxable,
            s.amount,
            new Date()
          ]);
        }
      }
    }
    // If using invoice-level tax (no per-line taxes), optionally persist a single invoice tax definition.
    const existingHasPerLineTaxes = (existing.items || []).some((it)=>Array.isArray(it.taxes) && it.taxes.length > 0);
    const nextHasPerLineTaxes = data.items ? !!perLineCalcUpdate : existingHasPerLineTaxes;
    if (!nextHasPerLineTaxes) {
      const hasTaxDefinitionIdInRequest = Object.prototype.hasOwnProperty.call(data, "taxDefinitionId");
      if (data.items || hasTaxDefinitionIdInRequest) {
        const rawTaxDefId = data.taxDefinitionId;
        const requested = typeof rawTaxDefId === "string" ? rawTaxDefId.trim() : "";
        const effectiveTaxDefinitionId = hasTaxDefinitionIdInRequest ? requested || undefined : existing.taxes && existing.taxes.length > 0 ? existing.taxes[0].taxDefinitionId : undefined;
        // Replace existing invoice_taxes rows (invoice-level mode only)
        db.query("DELETE FROM invoice_taxes WHERE invoice_id = ?", [
          id
        ]);
        if (effectiveTaxDefinitionId) {
          const r2 = (n)=>Math.round(n * 100) / 100;
          const percent = (data.taxRate ?? existing.taxRate) || 0;
          const rate = Math.max(0, Number(percent) || 0) / 100;
          const includeTax = data.pricesIncludeTax ?? existing.pricesIncludeTax ?? false;
          const afterDiscount = r2(totals.subtotal - totals.discountAmount);
          const taxable = includeTax ? rate > 0 ? r2(afterDiscount / (1 + rate)) : afterDiscount : afterDiscount;
          db.query(`INSERT INTO invoice_taxes (id, invoice_id, tax_definition_id, percent, taxable_amount, tax_amount, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            generateUUID(),
            id,
            effectiveTaxDefinitionId,
            percent,
            taxable,
            totals.taxAmount,
            new Date()
          ]);
        }
      }
    }
    db.execute("COMMIT");
  } catch (e) {
    try {
      db.execute("ROLLBACK");
    } catch  {
    /* ignore */ }
    throw e;
  }
  return await getInvoiceById(id);
};
export const deleteInvoice = async (id)=>{
  const existing = await getInvoiceById(id);
  if (!existing) throw new Error("Invoice not found");
  const allowProtectedChanges = isInvoiceProtectionOverrideEnabled();
  // Only draft invoices can be deleted; issued invoices must be voided for audit trail
  if (!allowProtectedChanges && existing.status !== "draft" && existing.status !== "voided") {
    throw new Error("Only draft or voided invoices can be deleted. Void the invoice first.");
  }
  const db = getDatabase();
  // Delete items first (CASCADE should handle this, but being explicit)
  db.query("DELETE FROM invoice_items WHERE invoice_id = ?", [
    id
  ]);
  // Delete invoice
  db.query("DELETE FROM invoices WHERE id = ?", [
    id
  ]);
  return true;
};
export const duplicateInvoice = async (id)=>{
  const original = await getInvoiceById(id);
  if (!original) return null;
  const db = getDatabase();
  const newId = generateUUID();
  const newShare = generateShareToken();
  const now = new Date();
  // Start as draft with a draft invoice number; copy descriptive fields, totals will be recalculated from items
  const items = original.items || [];
  const pricesIncludeTax = Boolean(original.pricesIncludeTax);
  const roundingMode = original.roundingMode || "line";
  // Recompute totals to avoid stale numbers, the same way createInvoice does
  const hasPerLineTaxes = items.some((i)=>(i.taxes?.length || 0) > 0);
  const perLineCalc = hasPerLineTaxes ? calculatePerLineTotals(items.map((i)=>({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      taxes: (i.taxes || []).map((t)=>({
          percent: t.percent,
          taxDefinitionId: t.taxDefinitionId,
          note: t.note
        }))
    })), original.discountPercentage, original.discountAmount, pricesIncludeTax, roundingMode) : undefined;
  const totals = perLineCalc ?? calculateInvoiceTotals(items.map((i)=>({
      quantity: i.quantity,
      unitPrice: i.unitPrice
    })), original.discountPercentage, original.discountAmount, original.taxRate, pricesIncludeTax, roundingMode);
  db.execute("BEGIN");
  try {
    db.query(`
    INSERT INTO invoices (
      id, invoice_number, customer_id, issue_date, due_date, currency, status,
      subtotal, discount_amount, discount_percentage, tax_rate, tax_amount, total,
      payment_terms, notes, share_token, created_at, updated_at,
      prices_include_tax, rounding_mode, locale
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
      newId,
      generateDraftInvoiceNumber(),
      original.customerId,
      now,
      original.dueDate || null,
      original.currency,
      "draft",
      totals.subtotal,
      totals.discountAmount,
      original.discountPercentage,
      original.taxRate,
      totals.taxAmount,
      totals.total,
      original.paymentTerms || null,
      original.notes || null,
      newShare,
      now,
      now,
      pricesIncludeTax ? 1 : 0,
      roundingMode,
      original.locale ?? null
    ]);
    // Copy items
    for (const [idx, it] of items.entries()){
      const itemId = generateUUID();
      // New draft: take current product values, keep the original's if the product is gone
      const snapshot = it.productId && getProductById(it.productId) ? snapshotProduct(it.productId) : it;
      db.query(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, description, quantity, unit, unit_price, line_total, notes, sort_order,
        hs_code, country_of_origin, length_mm, width_mm, height_mm, weight_g
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        itemId,
        newId,
        it.productId || null,
        it.description,
        it.quantity,
        it.unit || null,
        it.unitPrice,
        it.lineTotal,
        it.notes || null,
        idx,
        ...snapshotParams(snapshot)
      ]);
      const lineCalc = perLineCalc?.perItem[idx];
      for (const t of lineCalc?.taxes || []){
        db.query(`INSERT INTO invoice_item_taxes (id, invoice_item_id, tax_definition_id, percent, taxable_amount, amount, included, sequence, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          generateUUID(),
          itemId,
          t.taxDefinitionId || null,
          t.percent,
          lineCalc.taxable,
          t.amount,
          pricesIncludeTax ? 1 : 0,
          0,
          t.note || null,
          now
        ]);
      }
    }
    // Invoice tax summary: per-rate totals, or the invoice-level tax definition
    const r2 = (n)=>Math.round(n * 100) / 100;
    const afterDiscount = r2(totals.subtotal - totals.discountAmount);
    const rate = Math.max(0, Number(original.taxRate) || 0) / 100;
    const invoiceTaxes = perLineCalc ? perLineCalc.summary.map((s)=>({
        taxDefinitionId: null,
        percent: s.percent,
        taxable: s.taxable,
        amount: s.amount
      })) : (original.taxes || []).filter((t)=>t.taxDefinitionId).map((t)=>({
        taxDefinitionId: t.taxDefinitionId || null,
        percent: original.taxRate,
        taxable: pricesIncludeTax && rate > 0 ? r2(afterDiscount / (1 + rate)) : afterDiscount,
        amount: totals.taxAmount
      }));
    for (const t of invoiceTaxes){
      db.query(`INSERT INTO invoice_taxes (id, invoice_id, tax_definition_id, percent, taxable_amount, tax_amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        generateUUID(),
        newId,
        t.taxDefinitionId,
        t.percent,
        t.taxable,
        t.amount,
        now
      ]);
    }
    recordStatusChange(db, newId, "draft");
    db.execute("COMMIT");
  } catch (e) {
    try {
      db.execute("ROLLBACK");
    } catch  {
    /* ignore */ }
    throw e;
  }
  return await getInvoiceById(newId);
};
export const publishInvoice = async (id)=>{
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  // Validate minimal required fields before issuing
  const missing = [];
  if (!invoice.customer?.name) missing.push("customer.name");
  if (!invoice.items || invoice.items.length === 0) missing.push("items");
  if (!invoice.currency) missing.push("currency");
  if (!invoice.issueDate) missing.push("issueDate");
  if (missing.length) {
    throw new Error(`Cannot publish invoice. Missing required fields: ${missing.join(", ")}`);
  }
  // Update status to 'sent' if it's currently 'draft'
  if (invoice.status === "draft") {
    const db = getDatabase();
    const now = new Date();
    let num = invoice.invoiceNumber;
    if (num.startsWith("DRAFT-")) {
      num = getNextInvoiceNumber(invoice.customerId);
    }
    db.execute("BEGIN");
    try {
      db.query("UPDATE invoices SET status = 'sent', invoice_number = ?, updated_at = ? WHERE id = ?", [
        num,
        now,
        id
      ]);
      recordStatusChange(db, id, "sent");
      db.execute("COMMIT");
    } catch (e) {
      try {
        db.execute("ROLLBACK");
      } catch  {
      /* ignore */ }
      throw e;
    }
  }
  const shareUrl = `${Deno.env.get("BASE_URL") || "http://localhost:3000"}/api/v1/public/invoices/${invoice.shareToken}`;
  return {
    shareToken: invoice.shareToken,
    shareUrl
  };
};
export const unpublishInvoice = async (id)=>{
  const existing = await getInvoiceById(id);
  if (!existing) throw new Error("Invoice not found");
  // Only sent or overdue invoices can be unpublished
  if (existing.status !== "sent" && existing.status !== "overdue") {
    throw new Error("Only sent or overdue invoices can be unpublished.");
  }
  const db = getDatabase();
  const newToken = generateShareToken();
  const now = new Date();
  // Rotate share token to invalidate old public links and revert invoice to draft
  db.execute("BEGIN");
  try {
    db.query("UPDATE invoices SET share_token = ?, status = 'draft', updated_at = ? WHERE id = ?", [
      newToken,
      now,
      id
    ]);
    recordStatusChange(db, id, "draft");
    db.execute("COMMIT");
  } catch (e) {
    try {
      db.execute("ROLLBACK");
    } catch  {
    /* ignore */ }
    throw e;
  }
  return {
    shareToken: newToken
  };
};
export const voidInvoice = async (id)=>{
  const existing = await getInvoiceById(id);
  if (!existing) throw new Error("Invoice not found");
  if (existing.status === "voided") {
    throw new Error("Invoice is already voided");
  }
  if (existing.status === "draft") {
    throw new Error("Draft invoices cannot be voided. Delete them instead.");
  }
  if (existing.status === "paid") {
    throw new Error("Paid invoices cannot be voided. Issue a credit note instead.");
  }
  if (existing.status === "complete") {
    throw new Error("Complete invoices cannot be voided. Issue a credit note instead.");
  }
  const db = getDatabase();
  const now = new Date();
  db.execute("BEGIN");
  try {
    db.query("UPDATE invoices SET status = 'voided', updated_at = ? WHERE id = ?", [
      now,
      id
    ]);
    recordStatusChange(db, id, "voided");
    db.execute("COMMIT");
  } catch (e) {
    try {
      db.execute("ROLLBACK");
    } catch  {
    /* ignore */ }
    throw e;
  }
  return {
    success: true
  };
};
// Helper functions
function mapRowToInvoice(row) {
  return {
    id: row[0],
    invoiceNumber: row[1],
    customerId: row[2],
    issueDate: new Date(row[3]),
    dueDate: row[4] ? new Date(row[4]) : undefined,
    currency: row[5],
    status: row[6],
    subtotal: row[7],
    discountAmount: row[8],
    discountPercentage: row[9],
    taxRate: row[10],
    taxAmount: row[11],
    total: row[12],
    paymentTerms: row[13],
    notes: row[14],
    shareToken: row[15],
    createdAt: new Date(row[16]),
    updatedAt: new Date(row[17]),
    pricesIncludeTax: Boolean(row[18]),
    roundingMode: row[19] || "line",
    locale: row[20] || undefined
  };
}
function applyDerivedOverdue(inv) {
  if (!inv) return inv;
  // Only sent invoices can become overdue; drafts were never issued and
  // paid/voided/complete invoices are settled.
  if (inv.status !== "sent") return inv;
  if (!inv.dueDate) return inv;
  const today = new Date();
  const dd = new Date(inv.dueDate.getUTCFullYear(), inv.dueDate.getUTCMonth(), inv.dueDate.getUTCDate());
  const td = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (dd < td) {
    inv.status = "overdue";
  }
  return inv;
}
function getCustomerById(id) {
  const db = getDatabase();
  let rows = [];
  try {
    rows = db.query("SELECT id, name, contact_name, email, phone, address, country_code, tax_id, created_at, city, postal_code, region FROM customers WHERE id = ?", [
      id
    ]);
  } catch (_e) {
    // Fallback older schema without contact_name/city/postal_code/region
    try {
      rows = db.query("SELECT id, name, email, phone, address, country_code, tax_id, created_at, city, postal_code FROM customers WHERE id = ?", [
        id
      ]);
    } catch (_e2) {
      rows = db.query("SELECT id, name, email, phone, address, country_code, tax_id, created_at FROM customers WHERE id = ?", [
        id
      ]);
    }
  }
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row[0],
    name: row[1],
    contactName: row[2] ?? undefined,
    email: row[3] ?? undefined,
    phone: row[4] ?? undefined,
    address: row[5] ?? undefined,
    countryCode: row[6] ?? undefined,
    taxId: row[7] ?? undefined,
    createdAt: new Date(row[8]),
    city: row[9] ?? undefined,
    postalCode: row[10] ?? undefined,
    region: row[11] ?? undefined
  };
}
function getSettings() {
  const db = getDatabase();
  const results = db.query("SELECT key, value FROM settings");
  const settings = {};
  for (const row of results){
    const [key, value] = row;
    settings[key] = value;
  }
  return settings;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL2NvbnRyb2xsZXJzL2ludm9pY2VzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGNhbGN1bGF0ZUludm9pY2VUb3RhbHMsXG4gIGdlbmVyYXRlRHJhZnRJbnZvaWNlTnVtYmVyLFxuICBnZXREYXRhYmFzZSxcbiAgZ2V0TmV4dEludm9pY2VOdW1iZXIsXG59IGZyb20gXCIuLi9kYXRhYmFzZS9pbml0LnRzXCI7XG5pbXBvcnQgeyBnZXRTZXR0aW5nIH0gZnJvbSBcIi4vc2V0dGluZ3MudHNcIjtcbmltcG9ydCB7IGdldFByb2R1Y3RCeUlkIH0gZnJvbSBcIi4vcHJvZHVjdHMudHNcIjtcbmltcG9ydCB7IG5vcm1hbGl6ZUludm9pY2VMb2NhbGVTZXR0aW5nIH0gZnJvbSBcIi4uL2kxOG4vdHJhbnNsYXRpb25zLnRzXCI7XG5pbXBvcnQge1xuICBDcmVhdGVJbnZvaWNlUmVxdWVzdCxcbiAgSW52b2ljZSxcbiAgSW52b2ljZUl0ZW0sXG4gIEludm9pY2VXaXRoRGV0YWlscyxcbiAgU3RhdHVzSGlzdG9yeUVudHJ5LFxuICBVcGRhdGVJbnZvaWNlUmVxdWVzdCxcbn0gZnJvbSBcIi4uL3R5cGVzL2luZGV4LnRzXCI7XG5pbXBvcnQgeyBnZW5lcmF0ZVNoYXJlVG9rZW4sIGdlbmVyYXRlVVVJRCB9IGZyb20gXCIuLi91dGlscy91dWlkLnRzXCI7XG5cbnR5cGUgTGluZVRheElucHV0ID0ge1xuICBwZXJjZW50OiBudW1iZXI7XG4gIHRheERlZmluaXRpb25JZD86IHN0cmluZztcbiAgY29kZT86IHN0cmluZztcbiAgaW5jbHVkZWQ/OiBib29sZWFuOyAvLyBpZ25vcmVkOyB3ZSB1c2UgaW52b2ljZS1sZXZlbCBwcmljZXNJbmNsdWRlVGF4XG4gIG5vdGU/OiBzdHJpbmc7XG59O1xuXG50eXBlIEl0ZW1JbnB1dCA9IHtcbiAgcHJvZHVjdElkPzogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBxdWFudGl0eTogbnVtYmVyO1xuICB1bml0Pzogc3RyaW5nO1xuICB1bml0UHJpY2U6IG51bWJlcjtcbiAgbm90ZXM/OiBzdHJpbmc7XG4gIHRheGVzPzogTGluZVRheElucHV0W107XG59O1xuXG50eXBlIFBlckxpbmVDYWxjID0ge1xuICBzdWJ0b3RhbDogbnVtYmVyO1xuICBkaXNjb3VudEFtb3VudDogbnVtYmVyO1xuICB0YXhBbW91bnQ6IG51bWJlcjtcbiAgdG90YWw6IG51bWJlcjtcbiAgLy8gRm9yIGVhY2ggaXRlbSBpbmRleCwgdGhlIHRheGFibGUgYmFzZSAoYWZ0ZXIgZGlzY291bnQpIGFuZCBwZXItcmF0ZSB0YXggYW1vdW50c1xuICBwZXJJdGVtOiBBcnJheTx7XG4gICAgdGF4YWJsZTogbnVtYmVyO1xuICAgIHRheGVzOiBBcnJheTx7XG4gICAgICBwZXJjZW50OiBudW1iZXI7XG4gICAgICBhbW91bnQ6IG51bWJlcjtcbiAgICAgIG5vdGU/OiBzdHJpbmc7XG4gICAgICB0YXhEZWZpbml0aW9uSWQ/OiBzdHJpbmc7XG4gICAgfT47XG4gIH0+O1xuICAvLyBTdW1tYXJ5IGdyb3VwZWQgYnkgcGVyY2VudFxuICBzdW1tYXJ5OiBBcnJheTx7IHBlcmNlbnQ6IG51bWJlcjsgdGF4YWJsZTogbnVtYmVyOyBhbW91bnQ6IG51bWJlciB9Pjtcbn07XG5cbmZ1bmN0aW9uIGlzSW52b2ljZVByb3RlY3Rpb25PdmVycmlkZUVuYWJsZWQoKTogYm9vbGVhbiB7XG4gIGNvbnN0IHJhdyA9IGdldFNldHRpbmcoXCJhbGxvd1Byb3RlY3RlZEludm9pY2VDaGFuZ2VzXCIpO1xuICBpZiAocmF3ID09PSBudWxsIHx8IHJhdyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBTdHJpbmcocmF3KS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIChcbiAgICBub3JtYWxpemVkID09PSBcInRydWVcIiB8fFxuICAgIG5vcm1hbGl6ZWQgPT09IFwiMVwiIHx8XG4gICAgbm9ybWFsaXplZCA9PT0gXCJ5ZXNcIiB8fFxuICAgIG5vcm1hbGl6ZWQgPT09IFwib25cIlxuICApO1xufVxuXG5mdW5jdGlvbiBjYWxjdWxhdGVQZXJMaW5lVG90YWxzKFxuICBpdGVtczogSXRlbUlucHV0W10sXG4gIGRpc2NvdW50UGVyY2VudGFnZSA9IDAsXG4gIGRpc2NvdW50QW1vdW50ID0gMCxcbiAgcHJpY2VzSW5jbHVkZVRheCA9IGZhbHNlLFxuICBfcm91bmRpbmdNb2RlOiBcImxpbmVcIiB8IFwidG90YWxcIiA9IFwibGluZVwiLFxuKTogUGVyTGluZUNhbGMge1xuICBjb25zdCByMiA9IChuOiBudW1iZXIpID0+IE1hdGgucm91bmQobiAqIDEwMCkgLyAxMDA7XG4gIGNvbnN0IGxpbmVHcm9zc2VzID0gaXRlbXMubWFwKFxuICAgIChpdCkgPT4gKE51bWJlcihpdC5xdWFudGl0eSkgfHwgMCkgKiAoTnVtYmVyKGl0LnVuaXRQcmljZSkgfHwgMCksXG4gICk7XG4gIGNvbnN0IHN1YnRvdGFsID0gbGluZUdyb3NzZXMucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMCk7XG5cbiAgbGV0IGZpbmFsRGlzY291bnRBbW91bnQgPSBOdW1iZXIoZGlzY291bnRBbW91bnQpIHx8IDA7XG4gIGlmIChkaXNjb3VudFBlcmNlbnRhZ2UgPiAwKSB7XG4gICAgZmluYWxEaXNjb3VudEFtb3VudCA9IHN1YnRvdGFsICogKGRpc2NvdW50UGVyY2VudGFnZSAvIDEwMCk7XG4gIH1cbiAgZmluYWxEaXNjb3VudEFtb3VudCA9IE1hdGgubWluKE1hdGgubWF4KGZpbmFsRGlzY291bnRBbW91bnQsIDApLCBzdWJ0b3RhbCk7XG5cbiAgLy8gUHJvcG9ydGlvbmFsIGRpc2NvdW50IHBlciBsaW5lIHRvIGtlZXAgcm91bmRpbmcgY29uc2lzdGVudFxuICBsZXQgZGlzdHJpYnV0ZWQgPSAwO1xuICBjb25zdCBsaW5lRGlzY291bnRzID0gbGluZUdyb3NzZXMubWFwKChnLCBpZHgpID0+IHtcbiAgICBpZiAoc3VidG90YWwgPT09IDApIHJldHVybiAwO1xuICAgIGlmIChpZHggPT09IGxpbmVHcm9zc2VzLmxlbmd0aCAtIDEpIHtcbiAgICAgIHJldHVybiByMihmaW5hbERpc2NvdW50QW1vdW50IC0gZGlzdHJpYnV0ZWQpO1xuICAgIH1cbiAgICBjb25zdCBzaGFyZSA9IGcgLyBzdWJ0b3RhbDtcbiAgICBjb25zdCBkID0gcjIoZmluYWxEaXNjb3VudEFtb3VudCAqIHNoYXJlKTtcbiAgICBkaXN0cmlidXRlZCArPSBkO1xuICAgIHJldHVybiBkO1xuICB9KTtcblxuICBjb25zdCBwZXJJdGVtOiBQZXJMaW5lQ2FsY1tcInBlckl0ZW1cIl0gPSBbXTtcbiAgbGV0IHRheEFtb3VudCA9IDA7XG4gIGxldCB0b3RhbCA9IDA7XG4gIGNvbnN0IHN1bW1hcnlNYXAgPSBuZXcgTWFwPG51bWJlciwgeyB0YXhhYmxlOiBudW1iZXI7IGFtb3VudDogbnVtYmVyIH0+KCk7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGdyb3NzID0gbGluZUdyb3NzZXNbaV0gfHwgMDtcbiAgICBjb25zdCBhZnRlckRpc2NvdW50ID0gTWF0aC5tYXgoMCwgZ3Jvc3MgLSAobGluZURpc2NvdW50c1tpXSB8fCAwKSk7XG4gICAgY29uc3QgdGF4ZXMgPSBpdGVtc1tpXS50YXhlcyB8fCBbXTtcbiAgICBjb25zdCByYXRlU3VtID1cbiAgICAgIHRheGVzLnJlZHVjZSgocywgdCkgPT4gcyArIChOdW1iZXIodC5wZXJjZW50KSB8fCAwKSwgMCkgLyAxMDA7XG5cbiAgICBsZXQgbmV0ID0gYWZ0ZXJEaXNjb3VudDtcbiAgICBpZiAocHJpY2VzSW5jbHVkZVRheCAmJiByYXRlU3VtID4gMCkge1xuICAgICAgbmV0ID0gYWZ0ZXJEaXNjb3VudCAvICgxICsgcmF0ZVN1bSk7XG4gICAgfVxuXG4gICAgY29uc3QgaXRlbVRheGVzOiBBcnJheTx7XG4gICAgICBwZXJjZW50OiBudW1iZXI7XG4gICAgICBhbW91bnQ6IG51bWJlcjtcbiAgICAgIG5vdGU/OiBzdHJpbmc7XG4gICAgICB0YXhEZWZpbml0aW9uSWQ/OiBzdHJpbmc7XG4gICAgfT4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHQgb2YgdGF4ZXMpIHtcbiAgICAgIGNvbnN0IHAgPSAoTnVtYmVyKHQucGVyY2VudCkgfHwgMCkgLyAxMDA7XG4gICAgICBjb25zdCBhbXQgPSByMihuZXQgKiBwKTtcbiAgICAgIGl0ZW1UYXhlcy5wdXNoKHtcbiAgICAgICAgcGVyY2VudDogcjIocCAqIDEwMCksXG4gICAgICAgIGFtb3VudDogYW10LFxuICAgICAgICBub3RlOiB0Lm5vdGUsXG4gICAgICAgIHRheERlZmluaXRpb25JZDogdC50YXhEZWZpbml0aW9uSWQsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHMgPSBzdW1tYXJ5TWFwLmdldChyMihwICogMTAwKSkgfHwgeyB0YXhhYmxlOiAwLCBhbW91bnQ6IDAgfTtcbiAgICAgIHMudGF4YWJsZSA9IHIyKHMudGF4YWJsZSArIG5ldCk7XG4gICAgICBzLmFtb3VudCA9IHIyKHMuYW1vdW50ICsgYW10KTtcbiAgICAgIHN1bW1hcnlNYXAuc2V0KHIyKHAgKiAxMDApLCBzKTtcbiAgICB9XG5cbiAgICBjb25zdCBpdGVtVGF4U3VtID0gcjIoaXRlbVRheGVzLnJlZHVjZSgoYSwgYikgPT4gYSArIGIuYW1vdW50LCAwKSk7XG4gICAgcGVySXRlbS5wdXNoKHsgdGF4YWJsZTogcjIobmV0KSwgdGF4ZXM6IGl0ZW1UYXhlcyB9KTtcbiAgICBpZiAocHJpY2VzSW5jbHVkZVRheCkge1xuICAgICAgdG90YWwgPSByMih0b3RhbCArIGFmdGVyRGlzY291bnQpO1xuICAgICAgdGF4QW1vdW50ID0gcjIodGF4QW1vdW50ICsgaXRlbVRheFN1bSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvdGFsID0gcjIodG90YWwgKyBuZXQgKyBpdGVtVGF4U3VtKTtcbiAgICAgIHRheEFtb3VudCA9IHIyKHRheEFtb3VudCArIGl0ZW1UYXhTdW0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHN1bW1hcnkgPSBBcnJheS5mcm9tKHN1bW1hcnlNYXAuZW50cmllcygpKVxuICAgIC5tYXAoKFtwZXJjZW50LCB2XSkgPT4gKHtcbiAgICAgIHBlcmNlbnQsXG4gICAgICB0YXhhYmxlOiByMih2LnRheGFibGUpLFxuICAgICAgYW1vdW50OiByMih2LmFtb3VudCksXG4gICAgfSkpXG4gICAgLnNvcnQoKGEsIGIpID0+IGEucGVyY2VudCAtIGIucGVyY2VudCk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdWJ0b3RhbDogcjIoc3VidG90YWwpLFxuICAgIGRpc2NvdW50QW1vdW50OiByMihmaW5hbERpc2NvdW50QW1vdW50KSxcbiAgICB0YXhBbW91bnQ6IHIyKHRheEFtb3VudCksXG4gICAgdG90YWw6IHIyKHRvdGFsKSxcbiAgICBwZXJJdGVtLFxuICAgIHN1bW1hcnksXG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlY29yZFN0YXR1c0NoYW5nZShcbiAgZGI6IFJldHVyblR5cGU8dHlwZW9mIGdldERhdGFiYXNlPixcbiAgaW52b2ljZUlkOiBzdHJpbmcsXG4gIHN0YXR1czogc3RyaW5nLFxuICBwYXltZW50TWV0aG9kPzogc3RyaW5nLFxuICBub3RlPzogc3RyaW5nLFxuKTogdm9pZCB7XG4gIGRiLnF1ZXJ5KFxuICAgIGBJTlNFUlQgSU5UTyBpbnZvaWNlX3N0YXR1c19oaXN0b3J5IChpZCwgaW52b2ljZV9pZCwgc3RhdHVzLCBjaGFuZ2VkX2F0LCBwYXltZW50X21ldGhvZCwgbm90ZSlcbiAgICAgVkFMVUVTICg/LCA/LCA/LCA/LCA/LCA/KWAsXG4gICAgW1xuICAgICAgZ2VuZXJhdGVVVUlEKCksXG4gICAgICBpbnZvaWNlSWQsXG4gICAgICBzdGF0dXMsXG4gICAgICBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBwYXltZW50TWV0aG9kID8/IG51bGwsXG4gICAgICBub3RlID8/IG51bGwsXG4gICAgXSxcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXR1c0hpc3RvcnkoaW52b2ljZUlkOiBzdHJpbmcpOiBTdGF0dXNIaXN0b3J5RW50cnlbXSB7XG4gIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgY29uc3Qgcm93cyA9IGRiLnF1ZXJ5KFxuICAgIGBTRUxFQ1QgaWQsIGludm9pY2VfaWQsIHN0YXR1cywgY2hhbmdlZF9hdCwgcGF5bWVudF9tZXRob2QsIG5vdGVcbiAgICAgRlJPTSBpbnZvaWNlX3N0YXR1c19oaXN0b3J5XG4gICAgIFdIRVJFIGludm9pY2VfaWQgPSA/XG4gICAgIE9SREVSIEJZIGNoYW5nZWRfYXQgQVNDYCxcbiAgICBbaW52b2ljZUlkXSxcbiAgKSBhcyB1bmtub3duW11bXTtcbiAgcmV0dXJuIHJvd3MubWFwKChyKSA9PiAoe1xuICAgIGlkOiBTdHJpbmcoclswXSksXG4gICAgaW52b2ljZUlkOiBTdHJpbmcoclsxXSksXG4gICAgc3RhdHVzOiBTdHJpbmcoclsyXSksXG4gICAgY2hhbmdlZEF0OiBuZXcgRGF0ZShTdHJpbmcoclszXSkpLFxuICAgIHBheW1lbnRNZXRob2Q6IHJbNF0gPyBTdHJpbmcocls0XSkgOiB1bmRlZmluZWQsXG4gICAgbm90ZTogcls1XSA/IFN0cmluZyhyWzVdKSA6IHVuZGVmaW5lZCxcbiAgfSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TGF0ZXN0UGFpZFBheW1lbnRNZXRob2RzKFxuICBpbnZvaWNlSWRzOiBzdHJpbmdbXSxcbik6IE1hcDxzdHJpbmcsIHN0cmluZz4ge1xuICBpZiAoaW52b2ljZUlkcy5sZW5ndGggPT09IDApIHJldHVybiBuZXcgTWFwKCk7XG4gIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgY29uc3QgcGxhY2Vob2xkZXJzID0gaW52b2ljZUlkcy5tYXAoKCkgPT4gXCI/XCIpLmpvaW4oXCIsIFwiKTtcbiAgY29uc3Qgcm93cyA9IGRiLnF1ZXJ5KFxuICAgIGBTRUxFQ1QgaW52b2ljZV9pZCwgcGF5bWVudF9tZXRob2RcbiAgICAgRlJPTSBpbnZvaWNlX3N0YXR1c19oaXN0b3J5XG4gICAgIFdIRVJFIHN0YXR1cyA9ICdwYWlkJ1xuICAgICAgIEFORCBwYXltZW50X21ldGhvZCBJUyBOT1QgTlVMTFxuICAgICAgIEFORCBwYXltZW50X21ldGhvZCAhPSAnJ1xuICAgICAgIEFORCBpbnZvaWNlX2lkIElOICgke3BsYWNlaG9sZGVyc30pXG4gICAgIE9SREVSIEJZIGNoYW5nZWRfYXQgREVTQ2AsXG4gICAgaW52b2ljZUlkcyxcbiAgKSBhcyB1bmtub3duW11bXTtcbiAgLy8gS2VlcCBvbmx5IHRoZSBtb3N0IHJlY2VudCBwYXltZW50IG1ldGhvZCBwZXIgaW52b2ljZVxuICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHJvdyBvZiByb3dzKSB7XG4gICAgY29uc3QgaWQgPSBTdHJpbmcocm93WzBdKTtcbiAgICBpZiAoIXJlc3VsdC5oYXMoaWQpKSByZXN1bHQuc2V0KGlkLCBTdHJpbmcocm93WzFdKSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxudHlwZSBQcm9kdWN0U25hcHNob3QgPSBQaWNrPFxuICBJbnZvaWNlSXRlbSxcbiAgXCJoc0NvZGVcIiB8IFwiY291bnRyeU9mT3JpZ2luXCIgfCBcImxlbmd0aE1tXCIgfCBcIndpZHRoTW1cIiB8IFwiaGVpZ2h0TW1cIiB8IFwid2VpZ2h0R1wiXG4+O1xuXG4vKiogQ3VycmVudCBzaGlwcGluZy9jdXN0b21zIHZhbHVlcyBvZiB0aGUgaXRlbSdzIHByb2R1Y3QsIGNvcGllZCBvbnRvIHRoZSBpdGVtIHdoZW4gaXQgaXMgc2F2ZWQuICovXG5jb25zdCBzbmFwc2hvdFByb2R1Y3QgPSAocHJvZHVjdElkPzogc3RyaW5nKTogUHJvZHVjdFNuYXBzaG90ID0+IHtcbiAgY29uc3QgcCA9IHByb2R1Y3RJZCA/IGdldFByb2R1Y3RCeUlkKHByb2R1Y3RJZCkgOiBudWxsO1xuICByZXR1cm4ge1xuICAgIGhzQ29kZTogcD8uaHNDb2RlID8/IG51bGwsXG4gICAgY291bnRyeU9mT3JpZ2luOiBwPy5jb3VudHJ5T2ZPcmlnaW4gPz8gbnVsbCxcbiAgICBsZW5ndGhNbTogcD8ubGVuZ3RoTW0gPz8gbnVsbCxcbiAgICB3aWR0aE1tOiBwPy53aWR0aE1tID8/IG51bGwsXG4gICAgaGVpZ2h0TW06IHA/LmhlaWdodE1tID8/IG51bGwsXG4gICAgd2VpZ2h0RzogcD8ud2VpZ2h0RyA/PyBudWxsLFxuICB9O1xufTtcblxuY29uc3Qgc25hcHNob3RQYXJhbXMgPSAoczogUHJvZHVjdFNuYXBzaG90KSA9PiBbXG4gIHMuaHNDb2RlLFxuICBzLmNvdW50cnlPZk9yaWdpbixcbiAgcy5sZW5ndGhNbSxcbiAgcy53aWR0aE1tLFxuICBzLmhlaWdodE1tLFxuICBzLndlaWdodEcsXG5dO1xuXG5jb25zdCB0b051bGxhYmxlTnVtYmVyID0gKHY6IHVua25vd24pOiBudW1iZXIgfCBudWxsID0+XG4gIHYgPT09IG51bGwgfHwgdiA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IE51bWJlcih2KTtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUludm9pY2UgPSAoXG4gIGRhdGE6IENyZWF0ZUludm9pY2VSZXF1ZXN0LFxuKTogSW52b2ljZVdpdGhEZXRhaWxzID0+IHtcbiAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpO1xuICBjb25zdCBpbnZvaWNlSWQgPSBnZW5lcmF0ZVVVSUQoKTtcbiAgY29uc3Qgc2hhcmVUb2tlbiA9IGdlbmVyYXRlU2hhcmVUb2tlbigpO1xuICAvLyBQcmVmZXIgY2xpZW50LXByb3ZpZGVkIGludm9pY2VOdW1iZXIgd2hlbiB1bmlxdWU7IG90aGVyd2lzZSBhdXRvLWdlbmVyYXRlXG4gIGxldCBpbnZvaWNlTnVtYmVyID0gZGF0YS5pbnZvaWNlTnVtYmVyO1xuICBpZiAoaW52b2ljZU51bWJlcikge1xuICAgIGNvbnN0IGV4aXN0cyA9IGRiLnF1ZXJ5KFxuICAgICAgXCJTRUxFQ1QgMSBGUk9NIGludm9pY2VzIFdIRVJFIGludm9pY2VfbnVtYmVyID0gPyBMSU1JVCAxXCIsXG4gICAgICBbaW52b2ljZU51bWJlcl0sXG4gICAgKTtcbiAgICBpZiAoZXhpc3RzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIENsaWVudCByZXF1ZXN0ZWQgYW4gZXhwbGljaXQgbnVtYmVyIHdoaWNoIGFscmVhZHkgZXhpc3RzIC0+IHJlamVjdFxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52b2ljZSBudW1iZXIgYWxyZWFkeSBleGlzdHNcIik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIElmIGFkdmFuY2VkIG51bWJlcmluZyBwYXR0ZXJuIHdpdGgge1NFUX0sIHtDU0VRfSwgb3Ige0NOVU19IGlzIGFjdGl2ZSwgYWxsb2NhdGUgcmVhbCBudW1iZXIgbm93OyBlbHNlIGRyYWZ0IHBsYWNlaG9sZGVyXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJvd3MgPSBkYi5xdWVyeShcbiAgICAgICAgXCJTRUxFQ1QgdmFsdWUgRlJPTSBzZXR0aW5ncyBXSEVSRSBrZXkgPSAnaW52b2ljZU51bWJlclBhdHRlcm4nIExJTUlUIDFcIixcbiAgICAgICk7XG4gICAgICBpZiAocm93cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IHBhdHRlcm4gPSBTdHJpbmcoKHJvd3NbMF0gYXMgdW5rbm93bltdKVswXSB8fCBcIlwiKS50cmltKCk7XG4gICAgICAgIGlmIChwYXR0ZXJuICYmIC9cXHsoQz9TRVF8Q05VTSlcXH0vLnRlc3QocGF0dGVybikpIHtcbiAgICAgICAgICBpbnZvaWNlTnVtYmVyID0gZ2V0TmV4dEludm9pY2VOdW1iZXIoZGF0YS5jdXN0b21lcklkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpbnZvaWNlTnVtYmVyID0gZ2VuZXJhdGVEcmFmdEludm9pY2VOdW1iZXIoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW52b2ljZU51bWJlciA9IGdlbmVyYXRlRHJhZnRJbnZvaWNlTnVtYmVyKCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoX2UpIHtcbiAgICAgIGludm9pY2VOdW1iZXIgPSBnZW5lcmF0ZURyYWZ0SW52b2ljZU51bWJlcigpO1xuICAgIH1cbiAgfVxuXG4gIC8vIExvYWQgc2V0dGluZ3MgZm9yIGRlZmF1bHRzXG4gIGNvbnN0IHNldHRpbmdzID0gZ2V0U2V0dGluZ3MoKTtcblxuICAvLyBEZXRlcm1pbmUgdGF4IGJlaGF2aW9yIGRlZmF1bHRzXG4gIGNvbnN0IGRlZmF1bHRQcmljZXNJbmNsdWRlVGF4ID1cbiAgICBTdHJpbmcoc2V0dGluZ3MuZGVmYXVsdFByaWNlc0luY2x1ZGVUYXggfHwgXCJmYWxzZVwiKS50b0xvd2VyQ2FzZSgpID09PVxuICAgIFwidHJ1ZVwiO1xuICBjb25zdCBkZWZhdWx0Um91bmRpbmdNb2RlID0gU3RyaW5nKHNldHRpbmdzLmRlZmF1bHRSb3VuZGluZ01vZGUgfHwgXCJsaW5lXCIpO1xuICBjb25zdCBkZWZhdWx0VGF4UmF0ZSA9IE51bWJlcihzZXR0aW5ncy5kZWZhdWx0VGF4UmF0ZSB8fCAwKSB8fCAwO1xuXG4gIC8vIERldGVybWluZSBpZiBwZXItbGluZSB0YXhlcyBhcmUgdXNlZFxuICBjb25zdCBoYXNQZXJMaW5lVGF4ZXMgPVxuICAgIEFycmF5LmlzQXJyYXkoZGF0YS5pdGVtcykgJiZcbiAgICBkYXRhLml0ZW1zLnNvbWUoXG4gICAgICAoaSkgPT5cbiAgICAgICAgQXJyYXkuaXNBcnJheSgoaSBhcyB7IHRheGVzPzogTGluZVRheElucHV0W10gfSkudGF4ZXMpICYmXG4gICAgICAgICgoaSBhcyB7IHRheGVzPzogTGluZVRheElucHV0W10gfSkudGF4ZXM/Lmxlbmd0aCB8fCAwKSA+IDAsXG4gICAgKTtcbiAgbGV0IHRvdGFscyA9IHsgc3VidG90YWw6IDAsIGRpc2NvdW50QW1vdW50OiAwLCB0YXhBbW91bnQ6IDAsIHRvdGFsOiAwIH07XG4gIGxldCBwZXJMaW5lQ2FsYzogUGVyTGluZUNhbGMgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGlmIChoYXNQZXJMaW5lVGF4ZXMpIHtcbiAgICBwZXJMaW5lQ2FsYyA9IGNhbGN1bGF0ZVBlckxpbmVUb3RhbHMoXG4gICAgICBkYXRhLml0ZW1zIGFzIHVua25vd24gYXMgSXRlbUlucHV0W10sXG4gICAgICBkYXRhLmRpc2NvdW50UGVyY2VudGFnZSB8fCAwLFxuICAgICAgZGF0YS5kaXNjb3VudEFtb3VudCB8fCAwLFxuICAgICAgZGF0YS5wcmljZXNJbmNsdWRlVGF4ID8/IGRlZmF1bHRQcmljZXNJbmNsdWRlVGF4LFxuICAgICAgKGRhdGEucm91bmRpbmdNb2RlIGFzIFwibGluZVwiIHwgXCJ0b3RhbFwiKSB8fFxuICAgICAgICAoZGVmYXVsdFJvdW5kaW5nTW9kZSBhcyBcImxpbmVcIiB8IFwidG90YWxcIiksXG4gICAgKTtcbiAgICB0b3RhbHMgPSB7XG4gICAgICBzdWJ0b3RhbDogcGVyTGluZUNhbGMuc3VidG90YWwsXG4gICAgICBkaXNjb3VudEFtb3VudDogcGVyTGluZUNhbGMuZGlzY291bnRBbW91bnQsXG4gICAgICB0YXhBbW91bnQ6IHBlckxpbmVDYWxjLnRheEFtb3VudCxcbiAgICAgIHRvdGFsOiBwZXJMaW5lQ2FsYy50b3RhbCxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHRvdGFscyA9IGNhbGN1bGF0ZUludm9pY2VUb3RhbHMoXG4gICAgICBkYXRhLml0ZW1zLFxuICAgICAgZGF0YS5kaXNjb3VudFBlcmNlbnRhZ2UgfHwgMCxcbiAgICAgIGRhdGEuZGlzY291bnRBbW91bnQgfHwgMCxcbiAgICAgICh0eXBlb2YgZGF0YS50YXhSYXRlID09PSBcIm51bWJlclwiID8gZGF0YS50YXhSYXRlIDogZGVmYXVsdFRheFJhdGUpIHx8IDAsXG4gICAgICBkYXRhLnByaWNlc0luY2x1ZGVUYXggPz8gZGVmYXVsdFByaWNlc0luY2x1ZGVUYXgsXG4gICAgICAoZGF0YS5yb3VuZGluZ01vZGUgYXMgXCJsaW5lXCIgfCBcInRvdGFsXCIpIHx8XG4gICAgICAgIChkZWZhdWx0Um91bmRpbmdNb2RlIGFzIFwibGluZVwiIHwgXCJ0b3RhbFwiKSxcbiAgICApO1xuICB9XG5cbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgY29uc3QgaXNzdWVEYXRlID0gZGF0YS5pc3N1ZURhdGUgPyBuZXcgRGF0ZShkYXRhLmlzc3VlRGF0ZSkgOiBub3c7XG4gIGNvbnN0IGR1ZURhdGUgPSBkYXRhLmR1ZURhdGUgPyBuZXcgRGF0ZShkYXRhLmR1ZURhdGUpIDogdW5kZWZpbmVkO1xuXG4gIC8vIEdldCBkZWZhdWx0IHNldHRpbmdzIGZvciBjdXJyZW5jeSBhbmQgcGF5bWVudCB0ZXJtc1xuICBjb25zdCBjdXJyZW5jeSA9IGRhdGEuY3VycmVuY3kgfHwgc2V0dGluZ3MuY3VycmVuY3kgfHwgXCJVU0RcIjtcbiAgY29uc3QgcGF5bWVudFRlcm1zID1cbiAgICBkYXRhLnBheW1lbnRUZXJtcyB8fCBzZXR0aW5ncy5wYXltZW50VGVybXMgfHwgXCJEdWUgaW4gMzAgZGF5c1wiO1xuXG4gIGNvbnN0IHByaWNlc0luY2x1ZGVUYXggPSBkYXRhLnByaWNlc0luY2x1ZGVUYXggPz8gZGVmYXVsdFByaWNlc0luY2x1ZGVUYXg7XG4gIGNvbnN0IHJvdW5kaW5nTW9kZSA9IGRhdGEucm91bmRpbmdNb2RlIHx8IGRlZmF1bHRSb3VuZGluZ01vZGU7XG4gIGNvbnN0IGxvY2FsZSA9IG5vcm1hbGl6ZUludm9pY2VMb2NhbGVTZXR0aW5nKGRhdGEubG9jYWxlKTtcblxuICBjb25zdCBpbnZvaWNlOiBJbnZvaWNlID0ge1xuICAgIGlkOiBpbnZvaWNlSWQsXG4gICAgaW52b2ljZU51bWJlcjogaW52b2ljZU51bWJlciEsXG4gICAgY3VzdG9tZXJJZDogZGF0YS5jdXN0b21lcklkLFxuICAgIGlzc3VlRGF0ZSxcbiAgICBkdWVEYXRlLFxuICAgIGN1cnJlbmN5LFxuICAgIHN0YXR1czogZGF0YS5zdGF0dXMgfHwgXCJkcmFmdFwiLFxuXG4gICAgLy8gVG90YWxzXG4gICAgc3VidG90YWw6IHRvdGFscy5zdWJ0b3RhbCxcbiAgICBkaXNjb3VudEFtb3VudDogdG90YWxzLmRpc2NvdW50QW1vdW50LFxuICAgIGRpc2NvdW50UGVyY2VudGFnZTogZGF0YS5kaXNjb3VudFBlcmNlbnRhZ2UgfHwgMCxcbiAgICB0YXhSYXRlOiBoYXNQZXJMaW5lVGF4ZXMgPyAwIDogZGF0YS50YXhSYXRlIHx8IDAsXG4gICAgdGF4QW1vdW50OiB0b3RhbHMudGF4QW1vdW50LFxuICAgIHRvdGFsOiB0b3RhbHMudG90YWwsXG5cbiAgICBwcmljZXNJbmNsdWRlVGF4LFxuICAgIHJvdW5kaW5nTW9kZSxcbiAgICBsb2NhbGUsXG5cbiAgICAvLyBQYXltZW50IGFuZCBub3Rlc1xuICAgIHBheW1lbnRUZXJtcyxcbiAgICBub3RlczogZGF0YS5ub3RlcyxcblxuICAgIC8vIFN5c3RlbSBmaWVsZHNcbiAgICBzaGFyZVRva2VuLFxuICAgIGNyZWF0ZWRBdDogbm93LFxuICAgIHVwZGF0ZWRBdDogbm93LFxuICB9O1xuXG4gIC8vIEluc2VydCBpbnZvaWNlXG4gIGRiLnF1ZXJ5KFxuICAgIGBJTlNFUlQgSU5UTyBpbnZvaWNlcyAoXG4gICAgICBpZCwgaW52b2ljZV9udW1iZXIsIGN1c3RvbWVyX2lkLCBpc3N1ZV9kYXRlLCBkdWVfZGF0ZSwgY3VycmVuY3ksIHN0YXR1cyxcbiAgICAgIHN1YnRvdGFsLCBkaXNjb3VudF9hbW91bnQsIGRpc2NvdW50X3BlcmNlbnRhZ2UsIHRheF9yYXRlLCB0YXhfYW1vdW50LCB0b3RhbCxcbiAgICAgIHBheW1lbnRfdGVybXMsIG5vdGVzLCBzaGFyZV90b2tlbiwgY3JlYXRlZF9hdCwgdXBkYXRlZF9hdCxcbiAgICAgIHByaWNlc19pbmNsdWRlX3RheCwgcm91bmRpbmdfbW9kZSwgbG9jYWxlXG4gICAgKSBWQUxVRVMgKD8sID8sID8sID8sID8sID8sID8sID8sID8sID8sID8sID8sID8sID8sID8sID8sID8sID8sID8sID8sID8pYCxcbiAgICBbXG4gICAgICBpbnZvaWNlLmlkLFxuICAgICAgaW52b2ljZS5pbnZvaWNlTnVtYmVyLFxuICAgICAgaW52b2ljZS5jdXN0b21lcklkLFxuICAgICAgaW52b2ljZS5pc3N1ZURhdGUsXG4gICAgICBpbnZvaWNlLmR1ZURhdGUsXG4gICAgICBpbnZvaWNlLmN1cnJlbmN5LFxuICAgICAgaW52b2ljZS5zdGF0dXMsXG4gICAgICBpbnZvaWNlLnN1YnRvdGFsLFxuICAgICAgaW52b2ljZS5kaXNjb3VudEFtb3VudCxcbiAgICAgIGludm9pY2UuZGlzY291bnRQZXJjZW50YWdlLFxuICAgICAgaW52b2ljZS50YXhSYXRlLFxuICAgICAgaW52b2ljZS50YXhBbW91bnQsXG4gICAgICBpbnZvaWNlLnRvdGFsLFxuICAgICAgaW52b2ljZS5wYXltZW50VGVybXMsXG4gICAgICBpbnZvaWNlLm5vdGVzLFxuICAgICAgaW52b2ljZS5zaGFyZVRva2VuLFxuICAgICAgaW52b2ljZS5jcmVhdGVkQXQsXG4gICAgICBpbnZvaWNlLnVwZGF0ZWRBdCxcbiAgICAgIHByaWNlc0luY2x1ZGVUYXggPyAxIDogMCxcbiAgICAgIHJvdW5kaW5nTW9kZSxcbiAgICAgIGxvY2FsZSA/PyBudWxsLFxuICAgIF0sXG4gICk7XG4gIHJlY29yZFN0YXR1c0NoYW5nZShkYiwgaW52b2ljZUlkLCBpbnZvaWNlLnN0YXR1cyB8fCBcImRyYWZ0XCIpO1xuXG4gIC8vIEluc2VydCBpbnZvaWNlIGl0ZW1zXG4gIGNvbnN0IGl0ZW1zOiBJbnZvaWNlSXRlbVtdID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YS5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGl0ZW0gPSBkYXRhLml0ZW1zW2ldO1xuICAgIGNvbnN0IGl0ZW1JZCA9IGdlbmVyYXRlVVVJRCgpO1xuICAgIGNvbnN0IGxpbmVUb3RhbCA9IGl0ZW0ucXVhbnRpdHkgKiBpdGVtLnVuaXRQcmljZTtcbiAgICBjb25zdCB1bml0ID0gdHlwZW9mIGl0ZW0udW5pdCA9PT0gXCJzdHJpbmdcIiA/IGl0ZW0udW5pdC50cmltKCkgOiBcIlwiO1xuICAgIGNvbnN0IHNuYXBzaG90ID0gc25hcHNob3RQcm9kdWN0KGl0ZW0ucHJvZHVjdElkKTtcblxuICAgIGNvbnN0IGludm9pY2VJdGVtOiBJbnZvaWNlSXRlbSA9IHtcbiAgICAgIGlkOiBpdGVtSWQsXG4gICAgICBpbnZvaWNlSWQ6IGludm9pY2VJZCxcbiAgICAgIHByb2R1Y3RJZDogaXRlbS5wcm9kdWN0SWQgfHwgdW5kZWZpbmVkLFxuICAgICAgZGVzY3JpcHRpb246IGl0ZW0uZGVzY3JpcHRpb24sXG4gICAgICBxdWFudGl0eTogaXRlbS5xdWFudGl0eSxcbiAgICAgIHVuaXQ6IHVuaXQgfHwgdW5kZWZpbmVkLFxuICAgICAgdW5pdFByaWNlOiBpdGVtLnVuaXRQcmljZSxcbiAgICAgIGxpbmVUb3RhbCxcbiAgICAgIG5vdGVzOiBpdGVtLm5vdGVzLFxuICAgICAgc29ydE9yZGVyOiBpLFxuICAgICAgLi4uc25hcHNob3QsXG4gICAgfTtcblxuICAgIGRiLnF1ZXJ5KFxuICAgICAgYElOU0VSVCBJTlRPIGludm9pY2VfaXRlbXMgKFxuICAgICAgICBpZCwgaW52b2ljZV9pZCwgcHJvZHVjdF9pZCwgZGVzY3JpcHRpb24sIHF1YW50aXR5LCB1bml0LCB1bml0X3ByaWNlLCBsaW5lX3RvdGFsLCBub3Rlcywgc29ydF9vcmRlcixcbiAgICAgICAgaHNfY29kZSwgY291bnRyeV9vZl9vcmlnaW4sIGxlbmd0aF9tbSwgd2lkdGhfbW0sIGhlaWdodF9tbSwgd2VpZ2h0X2dcbiAgICAgICkgVkFMVUVTICg/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/KWAsXG4gICAgICBbXG4gICAgICAgIGl0ZW1JZCxcbiAgICAgICAgaW52b2ljZUlkLFxuICAgICAgICBpdGVtLnByb2R1Y3RJZCB8fCBudWxsLFxuICAgICAgICBpdGVtLmRlc2NyaXB0aW9uLFxuICAgICAgICBpdGVtLnF1YW50aXR5LFxuICAgICAgICB1bml0IHx8IG51bGwsXG4gICAgICAgIGl0ZW0udW5pdFByaWNlLFxuICAgICAgICBsaW5lVG90YWwsXG4gICAgICAgIGl0ZW0ubm90ZXMsXG4gICAgICAgIGksXG4gICAgICAgIC4uLnNuYXBzaG90UGFyYW1zKHNuYXBzaG90KSxcbiAgICAgIF0sXG4gICAgKTtcblxuICAgIGl0ZW1zLnB1c2goaW52b2ljZUl0ZW0pO1xuXG4gICAgLy8gSW5zZXJ0IHBlci1saW5lIHRheGVzIGlmIHByb3ZpZGVkXG4gICAgaWYgKGhhc1BlckxpbmVUYXhlcyAmJiBwZXJMaW5lQ2FsYykge1xuICAgICAgY29uc3QgY2FsYyA9IHBlckxpbmVDYWxjLnBlckl0ZW1baV07XG4gICAgICBpZiAoY2FsYyAmJiBBcnJheS5pc0FycmF5KGl0ZW0udGF4ZXMpKSB7XG4gICAgICAgIGZvciAoY29uc3QgdCBvZiBjYWxjLnRheGVzKSB7XG4gICAgICAgICAgZGIucXVlcnkoXG4gICAgICAgICAgICBgSU5TRVJUIElOVE8gaW52b2ljZV9pdGVtX3RheGVzIChpZCwgaW52b2ljZV9pdGVtX2lkLCB0YXhfZGVmaW5pdGlvbl9pZCwgcGVyY2VudCwgdGF4YWJsZV9hbW91bnQsIGFtb3VudCwgaW5jbHVkZWQsIHNlcXVlbmNlLCBub3RlLCBjcmVhdGVkX2F0KVxuICAgICAgICAgICAgIFZBTFVFUyAoPywgPywgPywgPywgPywgPywgPywgPywgPywgPylgLFxuICAgICAgICAgICAgW1xuICAgICAgICAgICAgICBnZW5lcmF0ZVVVSUQoKSxcbiAgICAgICAgICAgICAgaXRlbUlkLFxuICAgICAgICAgICAgICB0LnRheERlZmluaXRpb25JZCB8fCBudWxsLFxuICAgICAgICAgICAgICB0LnBlcmNlbnQsXG4gICAgICAgICAgICAgIGNhbGMudGF4YWJsZSxcbiAgICAgICAgICAgICAgdC5hbW91bnQsXG4gICAgICAgICAgICAgIChkYXRhLnByaWNlc0luY2x1ZGVUYXggPz8gZGVmYXVsdFByaWNlc0luY2x1ZGVUYXgpID8gMSA6IDAsXG4gICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgIHQubm90ZSB8fCBudWxsLFxuICAgICAgICAgICAgICBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gSW5zZXJ0IGludm9pY2UtbGV2ZWwgdGF4IHN1bW1hcnkgaWYgY2FsY3VsYXRlZFxuICBpZiAoaGFzUGVyTGluZVRheGVzICYmIHBlckxpbmVDYWxjKSB7XG4gICAgZm9yIChjb25zdCBzIG9mIHBlckxpbmVDYWxjLnN1bW1hcnkpIHtcbiAgICAgIGRiLnF1ZXJ5KFxuICAgICAgICBgSU5TRVJUIElOVE8gaW52b2ljZV90YXhlcyAoaWQsIGludm9pY2VfaWQsIHRheF9kZWZpbml0aW9uX2lkLCBwZXJjZW50LCB0YXhhYmxlX2Ftb3VudCwgdGF4X2Ftb3VudCwgY3JlYXRlZF9hdClcbiAgICAgICAgIFZBTFVFUyAoPywgPywgPywgPywgPywgPywgPylgLFxuICAgICAgICBbXG4gICAgICAgICAgZ2VuZXJhdGVVVUlEKCksXG4gICAgICAgICAgaW52b2ljZUlkLFxuICAgICAgICAgIG51bGwsXG4gICAgICAgICAgcy5wZXJjZW50LFxuICAgICAgICAgIHMudGF4YWJsZSxcbiAgICAgICAgICBzLmFtb3VudCxcbiAgICAgICAgICBuZXcgRGF0ZSgpLFxuICAgICAgICBdLFxuICAgICAgKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcmF3VGF4RGVmSWQgPSAoZGF0YSBhcyB7IHRheERlZmluaXRpb25JZD86IHN0cmluZyB8IG51bGwgfSlcbiAgICAgIC50YXhEZWZpbml0aW9uSWQ7XG4gICAgY29uc3QgdGF4RGVmaW5pdGlvbklkID1cbiAgICAgIHR5cGVvZiByYXdUYXhEZWZJZCA9PT0gXCJzdHJpbmdcIiA/IHJhd1RheERlZklkLnRyaW0oKSA6IFwiXCI7XG4gICAgaWYgKHRheERlZmluaXRpb25JZCkge1xuICAgICAgY29uc3QgcjIgPSAobjogbnVtYmVyKSA9PiBNYXRoLnJvdW5kKG4gKiAxMDApIC8gMTAwO1xuICAgICAgY29uc3QgcGVyY2VudCA9IGludm9pY2UudGF4UmF0ZSB8fCAwO1xuICAgICAgY29uc3QgcmF0ZSA9IE1hdGgubWF4KDAsIE51bWJlcihwZXJjZW50KSB8fCAwKSAvIDEwMDtcbiAgICAgIGNvbnN0IGFmdGVyRGlzY291bnQgPSByMihpbnZvaWNlLnN1YnRvdGFsIC0gaW52b2ljZS5kaXNjb3VudEFtb3VudCk7XG4gICAgICBjb25zdCB0YXhhYmxlID0gcHJpY2VzSW5jbHVkZVRheFxuICAgICAgICA/IHJhdGUgPiAwXG4gICAgICAgICAgPyByMihhZnRlckRpc2NvdW50IC8gKDEgKyByYXRlKSlcbiAgICAgICAgICA6IGFmdGVyRGlzY291bnRcbiAgICAgICAgOiBhZnRlckRpc2NvdW50O1xuICAgICAgZGIucXVlcnkoXG4gICAgICAgIGBJTlNFUlQgSU5UTyBpbnZvaWNlX3RheGVzIChpZCwgaW52b2ljZV9pZCwgdGF4X2RlZmluaXRpb25faWQsIHBlcmNlbnQsIHRheGFibGVfYW1vdW50LCB0YXhfYW1vdW50LCBjcmVhdGVkX2F0KVxuICAgICAgICAgVkFMVUVTICg/LCA/LCA/LCA/LCA/LCA/LCA/KWAsXG4gICAgICAgIFtcbiAgICAgICAgICBnZW5lcmF0ZVVVSUQoKSxcbiAgICAgICAgICBpbnZvaWNlSWQsXG4gICAgICAgICAgdGF4RGVmaW5pdGlvbklkLFxuICAgICAgICAgIHBlcmNlbnQsXG4gICAgICAgICAgdGF4YWJsZSxcbiAgICAgICAgICBpbnZvaWNlLnRheEFtb3VudCxcbiAgICAgICAgICBuZXcgRGF0ZSgpLFxuICAgICAgICBdLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyBHZXQgY3VzdG9tZXIgaW5mbyBmb3IgcmVzcG9uc2VcbiAgY29uc3QgY3VzdG9tZXIgPSBnZXRDdXN0b21lckJ5SWQoZGF0YS5jdXN0b21lcklkKTtcbiAgaWYgKCFjdXN0b21lcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkN1c3RvbWVyIG5vdCBmb3VuZFwiKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgLi4uaW52b2ljZSxcbiAgICBjdXN0b21lcixcbiAgICBpdGVtcyxcbiAgICB0YXhlczpcbiAgICAgIGhhc1BlckxpbmVUYXhlcyAmJiBwZXJMaW5lQ2FsY1xuICAgICAgICA/IHBlckxpbmVDYWxjLnN1bW1hcnkubWFwKChzKSA9PiAoe1xuICAgICAgICAgICAgaWQ6IFwiXCIsXG4gICAgICAgICAgICBpbnZvaWNlSWQ6IGludm9pY2VJZCxcbiAgICAgICAgICAgIHRheERlZmluaXRpb25JZDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgcGVyY2VudDogcy5wZXJjZW50LFxuICAgICAgICAgICAgdGF4YWJsZUFtb3VudDogcy50YXhhYmxlLFxuICAgICAgICAgICAgdGF4QW1vdW50OiBzLmFtb3VudCxcbiAgICAgICAgICB9KSlcbiAgICAgICAgOiB1bmRlZmluZWQsXG4gIH07XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0SW52b2ljZXMgPSAoKTogSW52b2ljZVtdID0+IHtcbiAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpO1xuICBjb25zdCByZXN1bHRzID0gZGIucXVlcnkoYFxuICAgIFNFTEVDVCBpZCwgaW52b2ljZV9udW1iZXIsIGN1c3RvbWVyX2lkLCBpc3N1ZV9kYXRlLCBkdWVfZGF0ZSwgY3VycmVuY3ksIHN0YXR1cyxcbiAgICAgICAgICAgc3VidG90YWwsIGRpc2NvdW50X2Ftb3VudCwgZGlzY291bnRfcGVyY2VudGFnZSwgdGF4X3JhdGUsIHRheF9hbW91bnQsIHRvdGFsLFxuICAgICAgICAgICBwYXltZW50X3Rlcm1zLCBub3Rlcywgc2hhcmVfdG9rZW4sIGNyZWF0ZWRfYXQsIHVwZGF0ZWRfYXQsXG4gICAgICAgICAgIHByaWNlc19pbmNsdWRlX3RheCwgcm91bmRpbmdfbW9kZSwgbG9jYWxlXG4gICAgRlJPTSBpbnZvaWNlc1xuICAgIE9SREVSIEJZIGNyZWF0ZWRfYXQgREVTQ1xuICBgKTtcbiAgY29uc3QgbGlzdCA9IHJlc3VsdHMubWFwKChyb3c6IHVua25vd25bXSkgPT4gbWFwUm93VG9JbnZvaWNlKHJvdykpO1xuICByZXR1cm4gbGlzdC5tYXAoYXBwbHlEZXJpdmVkT3ZlcmR1ZSk7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0SW52b2ljZUJ5SWQgPSAoaWQ6IHN0cmluZyk6IEludm9pY2VXaXRoRGV0YWlscyB8IG51bGwgPT4ge1xuICBjb25zdCBkYiA9IGdldERhdGFiYXNlKCk7XG4gIGNvbnN0IHJlc3VsdCA9IGRiLnF1ZXJ5KFxuICAgIGBcbiAgICBTRUxFQ1QgaWQsIGludm9pY2VfbnVtYmVyLCBjdXN0b21lcl9pZCwgaXNzdWVfZGF0ZSwgZHVlX2RhdGUsIGN1cnJlbmN5LCBzdGF0dXMsXG4gICAgICAgICAgIHN1YnRvdGFsLCBkaXNjb3VudF9hbW91bnQsIGRpc2NvdW50X3BlcmNlbnRhZ2UsIHRheF9yYXRlLCB0YXhfYW1vdW50LCB0b3RhbCxcbiAgICAgICAgICAgcGF5bWVudF90ZXJtcywgbm90ZXMsIHNoYXJlX3Rva2VuLCBjcmVhdGVkX2F0LCB1cGRhdGVkX2F0LFxuICAgICAgICAgICBwcmljZXNfaW5jbHVkZV90YXgsIHJvdW5kaW5nX21vZGUsIGxvY2FsZVxuICAgIEZST00gaW52b2ljZXNcbiAgICBXSEVSRSBpZCA9ID9cbiAgYCxcbiAgICBbaWRdLFxuICApO1xuXG4gIGlmIChyZXN1bHQubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcblxuICBsZXQgaW52b2ljZSA9IG1hcFJvd1RvSW52b2ljZShyZXN1bHRbMF0gYXMgdW5rbm93bltdKTtcbiAgaW52b2ljZSA9IGFwcGx5RGVyaXZlZE92ZXJkdWUoaW52b2ljZSk7XG5cbiAgLy8gR2V0IGN1c3RvbWVyXG4gIGNvbnN0IGN1c3RvbWVyID0gZ2V0Q3VzdG9tZXJCeUlkKGludm9pY2UuY3VzdG9tZXJJZCk7XG4gIGlmICghY3VzdG9tZXIpIHJldHVybiBudWxsO1xuXG4gIC8vIEdldCBpdGVtc1xuICBjb25zdCBpdGVtc1Jlc3VsdCA9IGRiLnF1ZXJ5KFxuICAgIGBcbiAgICBTRUxFQ1QgaWQsIGludm9pY2VfaWQsIHByb2R1Y3RfaWQsIGRlc2NyaXB0aW9uLCBxdWFudGl0eSwgdW5pdCwgdW5pdF9wcmljZSwgbGluZV90b3RhbCwgbm90ZXMsIHNvcnRfb3JkZXIsXG4gICAgICAgICAgIGhzX2NvZGUsIGNvdW50cnlfb2Zfb3JpZ2luLCBsZW5ndGhfbW0sIHdpZHRoX21tLCBoZWlnaHRfbW0sIHdlaWdodF9nXG4gICAgRlJPTSBpbnZvaWNlX2l0ZW1zXG4gICAgV0hFUkUgaW52b2ljZV9pZCA9ID9cbiAgICBPUkRFUiBCWSBzb3J0X29yZGVyXG4gIGAsXG4gICAgW2lkXSxcbiAgKTtcblxuICBjb25zdCBpdGVtcyA9IGl0ZW1zUmVzdWx0Lm1hcCgocm93OiB1bmtub3duW10pID0+ICh7XG4gICAgaWQ6IHJvd1swXSBhcyBzdHJpbmcsXG4gICAgaW52b2ljZUlkOiByb3dbMV0gYXMgc3RyaW5nLFxuICAgIHByb2R1Y3RJZDogcm93WzJdID8gU3RyaW5nKHJvd1syXSkgOiB1bmRlZmluZWQsXG4gICAgZGVzY3JpcHRpb246IHJvd1szXSBhcyBzdHJpbmcsXG4gICAgcXVhbnRpdHk6IHJvd1s0XSBhcyBudW1iZXIsXG4gICAgdW5pdDogcm93WzVdID8gU3RyaW5nKHJvd1s1XSkgOiB1bmRlZmluZWQsXG4gICAgdW5pdFByaWNlOiByb3dbNl0gYXMgbnVtYmVyLFxuICAgIGxpbmVUb3RhbDogcm93WzddIGFzIG51bWJlcixcbiAgICBub3Rlczogcm93WzhdIGFzIHN0cmluZyxcbiAgICBzb3J0T3JkZXI6IHJvd1s5XSBhcyBudW1iZXIsXG4gICAgaHNDb2RlOiByb3dbMTBdID8gU3RyaW5nKHJvd1sxMF0pIDogbnVsbCxcbiAgICBjb3VudHJ5T2ZPcmlnaW46IHJvd1sxMV0gPyBTdHJpbmcocm93WzExXSkgOiBudWxsLFxuICAgIGxlbmd0aE1tOiB0b051bGxhYmxlTnVtYmVyKHJvd1sxMl0pLFxuICAgIHdpZHRoTW06IHRvTnVsbGFibGVOdW1iZXIocm93WzEzXSksXG4gICAgaGVpZ2h0TW06IHRvTnVsbGFibGVOdW1iZXIocm93WzE0XSksXG4gICAgd2VpZ2h0RzogdG9OdWxsYWJsZU51bWJlcihyb3dbMTVdKSxcbiAgfSkpO1xuXG4gIC8vIEF0dGFjaCBwZXItaXRlbSB0YXhlc1xuICB0eXBlIEl0ZW1UYXhSb3cgPSB7XG4gICAgdGF4RGVmaW5pdGlvbklkPzogc3RyaW5nO1xuICAgIHBlcmNlbnQ6IG51bWJlcjtcbiAgICB0YXhhYmxlQW1vdW50OiBudW1iZXI7XG4gICAgYW1vdW50OiBudW1iZXI7XG4gICAgaW5jbHVkZWQ6IGJvb2xlYW47XG4gICAgbm90ZT86IHN0cmluZztcbiAgfTtcbiAgbGV0IGl0ZW1zV2l0aFRheGVzID0gaXRlbXMubWFwKChpdCkgPT4gKHsgLi4uaXQgfSkpO1xuICBpZiAoaXRlbXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHBsYWNlaG9sZGVycyA9IGl0ZW1zLm1hcCgoKSA9PiBcIj9cIikuam9pbihcIixcIik7XG4gICAgY29uc3QgdGF4Um93cyA9IGRiLnF1ZXJ5KFxuICAgICAgYFNFTEVDVCBpbnZvaWNlX2l0ZW1faWQsIHRheF9kZWZpbml0aW9uX2lkLCBwZXJjZW50LCB0YXhhYmxlX2Ftb3VudCwgYW1vdW50LCBpbmNsdWRlZCwgbm90ZSBGUk9NIGludm9pY2VfaXRlbV90YXhlcyBXSEVSRSBpbnZvaWNlX2l0ZW1faWQgSU4gKCR7cGxhY2Vob2xkZXJzfSlgLFxuICAgICAgaXRlbXMubWFwKChpdCkgPT4gaXQuaWQpLFxuICAgICk7XG4gICAgY29uc3QgdGF4ZXNCeUl0ZW0gPSBuZXcgTWFwPHN0cmluZywgSXRlbVRheFJvd1tdPigpO1xuICAgIGZvciAoY29uc3QgciBvZiB0YXhSb3dzKSB7XG4gICAgICBjb25zdCBpdGVtSWQgPSBTdHJpbmcoKHIgYXMgdW5rbm93bltdKVswXSk7XG4gICAgICBjb25zdCB0YXg6IEl0ZW1UYXhSb3cgPSB7XG4gICAgICAgIHRheERlZmluaXRpb25JZDogKHIgYXMgdW5rbm93bltdKVsxXVxuICAgICAgICAgID8gU3RyaW5nKChyIGFzIHVua25vd25bXSlbMV0pXG4gICAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgIHBlcmNlbnQ6IE51bWJlcigociBhcyB1bmtub3duW10pWzJdKSxcbiAgICAgICAgdGF4YWJsZUFtb3VudDogTnVtYmVyKChyIGFzIHVua25vd25bXSlbM10pLFxuICAgICAgICBhbW91bnQ6IE51bWJlcigociBhcyB1bmtub3duW10pWzRdKSxcbiAgICAgICAgaW5jbHVkZWQ6IEJvb2xlYW4oKHIgYXMgdW5rbm93bltdKVs1XSksXG4gICAgICAgIG5vdGU6IChyIGFzIHVua25vd25bXSlbNl0gYXMgc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgICAgfTtcbiAgICAgIGlmICghdGF4ZXNCeUl0ZW0uaGFzKGl0ZW1JZCkpIHRheGVzQnlJdGVtLnNldChpdGVtSWQsIFtdKTtcbiAgICAgIHRheGVzQnlJdGVtLmdldChpdGVtSWQpIS5wdXNoKHRheCk7XG4gICAgfVxuICAgIGl0ZW1zV2l0aFRheGVzID0gaXRlbXMubWFwKChpdCkgPT4gKHtcbiAgICAgIC4uLml0LFxuICAgICAgdGF4ZXM6IHRheGVzQnlJdGVtLmdldChpdC5pZCksXG4gICAgfSkpO1xuICB9XG5cbiAgLy8gSW52b2ljZSB0YXggc3VtbWFyeVxuICBjb25zdCBpbnZUYXhSb3dzID0gZGIucXVlcnkoXG4gICAgYFNFTEVDVCBpZCwgaW52b2ljZV9pZCwgdGF4X2RlZmluaXRpb25faWQsIHBlcmNlbnQsIHRheGFibGVfYW1vdW50LCB0YXhfYW1vdW50IEZST00gaW52b2ljZV90YXhlcyBXSEVSRSBpbnZvaWNlX2lkID0gP2AsXG4gICAgW2lkXSxcbiAgKTtcbiAgY29uc3QgdGF4ZXMgPSBpbnZUYXhSb3dzLm1hcCgocikgPT4gKHtcbiAgICBpZDogclswXSBhcyBzdHJpbmcsXG4gICAgaW52b2ljZUlkOiByWzFdIGFzIHN0cmluZyxcbiAgICB0YXhEZWZpbml0aW9uSWQ6IHJbMl0gPyBTdHJpbmcoclsyXSkgOiB1bmRlZmluZWQsXG4gICAgcGVyY2VudDogTnVtYmVyKHJbM10gYXMgbnVtYmVyKSxcbiAgICB0YXhhYmxlQW1vdW50OiBOdW1iZXIocls0XSBhcyBudW1iZXIpLFxuICAgIHRheEFtb3VudDogTnVtYmVyKHJbNV0gYXMgbnVtYmVyKSxcbiAgfSkpO1xuXG4gIGNvbnN0IHN0YXR1c0hpc3RvcnkgPSBnZXRTdGF0dXNIaXN0b3J5KGlkKTtcbiAgcmV0dXJuIHsgLi4uaW52b2ljZSwgY3VzdG9tZXIsIGl0ZW1zOiBpdGVtc1dpdGhUYXhlcywgdGF4ZXMsIHN0YXR1c0hpc3RvcnkgfTtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRJbnZvaWNlQnlTaGFyZVRva2VuID0gKFxuICBzaGFyZVRva2VuOiBzdHJpbmcsXG4pOiBJbnZvaWNlV2l0aERldGFpbHMgfCBudWxsID0+IHtcbiAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpO1xuICBjb25zdCByZXN1bHQgPSBkYi5xdWVyeShcbiAgICBgXG4gICAgU0VMRUNUIGlkLCBpbnZvaWNlX251bWJlciwgY3VzdG9tZXJfaWQsIGlzc3VlX2RhdGUsIGR1ZV9kYXRlLCBjdXJyZW5jeSwgc3RhdHVzLFxuICAgICAgICAgICBzdWJ0b3RhbCwgZGlzY291bnRfYW1vdW50LCBkaXNjb3VudF9wZXJjZW50YWdlLCB0YXhfcmF0ZSwgdGF4X2Ftb3VudCwgdG90YWwsXG4gICAgICAgICAgIHBheW1lbnRfdGVybXMsIG5vdGVzLCBzaGFyZV90b2tlbiwgY3JlYXRlZF9hdCwgdXBkYXRlZF9hdCxcbiAgICAgICAgICAgcHJpY2VzX2luY2x1ZGVfdGF4LCByb3VuZGluZ19tb2RlLCBsb2NhbGVcbiAgICBGUk9NIGludm9pY2VzXG4gICAgV0hFUkUgc2hhcmVfdG9rZW4gPSA/XG4gIGAsXG4gICAgW3NoYXJlVG9rZW5dLFxuICApO1xuXG4gIGlmIChyZXN1bHQubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcblxuICBsZXQgaW52b2ljZSA9IG1hcFJvd1RvSW52b2ljZShyZXN1bHRbMF0gYXMgdW5rbm93bltdKTtcbiAgaW52b2ljZSA9IGFwcGx5RGVyaXZlZE92ZXJkdWUoaW52b2ljZSk7XG5cbiAgLy8gRHJhZnQgaW52b2ljZXMgbXVzdCBuZXZlciBiZSBleHBvc2VkIHZpYSBwdWJsaWMgc2hhcmUgbGlua3MuXG4gIGlmIChpbnZvaWNlLnN0YXR1cyA9PT0gXCJkcmFmdFwiKSByZXR1cm4gbnVsbDtcblxuICAvLyBHZXQgY3VzdG9tZXJcbiAgY29uc3QgY3VzdG9tZXIgPSBnZXRDdXN0b21lckJ5SWQoaW52b2ljZS5jdXN0b21lcklkKTtcbiAgaWYgKCFjdXN0b21lcikgcmV0dXJuIG51bGw7XG5cbiAgLy8gR2V0IGl0ZW1zXG4gIGNvbnN0IGl0ZW1zUmVzdWx0ID0gZGIucXVlcnkoXG4gICAgYFxuICAgIFNFTEVDVCBpZCwgaW52b2ljZV9pZCwgcHJvZHVjdF9pZCwgZGVzY3JpcHRpb24sIHF1YW50aXR5LCB1bml0LCB1bml0X3ByaWNlLCBsaW5lX3RvdGFsLCBub3Rlcywgc29ydF9vcmRlclxuICAgIEZST00gaW52b2ljZV9pdGVtc1xuICAgIFdIRVJFIGludm9pY2VfaWQgPSA/XG4gICAgT1JERVIgQlkgc29ydF9vcmRlclxuICBgLFxuICAgIFtpbnZvaWNlLmlkXSxcbiAgKTtcblxuICBjb25zdCBpdGVtcyA9IGl0ZW1zUmVzdWx0Lm1hcCgocm93OiB1bmtub3duW10pID0+ICh7XG4gICAgaWQ6IHJvd1swXSBhcyBzdHJpbmcsXG4gICAgaW52b2ljZUlkOiByb3dbMV0gYXMgc3RyaW5nLFxuICAgIHByb2R1Y3RJZDogcm93WzJdID8gU3RyaW5nKHJvd1syXSkgOiB1bmRlZmluZWQsXG4gICAgZGVzY3JpcHRpb246IHJvd1szXSBhcyBzdHJpbmcsXG4gICAgcXVhbnRpdHk6IHJvd1s0XSBhcyBudW1iZXIsXG4gICAgdW5pdDogcm93WzVdID8gU3RyaW5nKHJvd1s1XSkgOiB1bmRlZmluZWQsXG4gICAgdW5pdFByaWNlOiByb3dbNl0gYXMgbnVtYmVyLFxuICAgIGxpbmVUb3RhbDogcm93WzddIGFzIG51bWJlcixcbiAgICBub3Rlczogcm93WzhdIGFzIHN0cmluZyxcbiAgICBzb3J0T3JkZXI6IHJvd1s5XSBhcyBudW1iZXIsXG4gIH0pKTtcblxuICAvLyBBdHRhY2ggcGVyLWl0ZW0gdGF4ZXNcbiAgdHlwZSBJdGVtVGF4Um93MiA9IHtcbiAgICB0YXhEZWZpbml0aW9uSWQ/OiBzdHJpbmc7XG4gICAgcGVyY2VudDogbnVtYmVyO1xuICAgIHRheGFibGVBbW91bnQ6IG51bWJlcjtcbiAgICBhbW91bnQ6IG51bWJlcjtcbiAgICBpbmNsdWRlZDogYm9vbGVhbjtcbiAgICBub3RlPzogc3RyaW5nO1xuICB9O1xuICBsZXQgaXRlbXNXaXRoVGF4ZXMgPSBpdGVtcy5tYXAoKGl0KSA9PiAoeyAuLi5pdCB9KSk7XG4gIGlmIChpdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgcGxhY2Vob2xkZXJzID0gaXRlbXMubWFwKCgpID0+IFwiP1wiKS5qb2luKFwiLFwiKTtcbiAgICBjb25zdCB0YXhSb3dzID0gZGIucXVlcnkoXG4gICAgICBgU0VMRUNUIGludm9pY2VfaXRlbV9pZCwgdGF4X2RlZmluaXRpb25faWQsIHBlcmNlbnQsIHRheGFibGVfYW1vdW50LCBhbW91bnQsIGluY2x1ZGVkLCBub3RlIEZST00gaW52b2ljZV9pdGVtX3RheGVzIFdIRVJFIGludm9pY2VfaXRlbV9pZCBJTiAoJHtwbGFjZWhvbGRlcnN9KWAsXG4gICAgICBpdGVtcy5tYXAoKGl0KSA9PiBpdC5pZCksXG4gICAgKTtcbiAgICBjb25zdCB0YXhlc0J5SXRlbSA9IG5ldyBNYXA8c3RyaW5nLCBJdGVtVGF4Um93MltdPigpO1xuICAgIGZvciAoY29uc3QgciBvZiB0YXhSb3dzKSB7XG4gICAgICBjb25zdCBpdGVtSWQgPSBTdHJpbmcoKHIgYXMgdW5rbm93bltdKVswXSk7XG4gICAgICBjb25zdCB0YXg6IEl0ZW1UYXhSb3cyID0ge1xuICAgICAgICB0YXhEZWZpbml0aW9uSWQ6IChyIGFzIHVua25vd25bXSlbMV1cbiAgICAgICAgICA/IFN0cmluZygociBhcyB1bmtub3duW10pWzFdKVxuICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICBwZXJjZW50OiBOdW1iZXIoKHIgYXMgdW5rbm93bltdKVsyXSksXG4gICAgICAgIHRheGFibGVBbW91bnQ6IE51bWJlcigociBhcyB1bmtub3duW10pWzNdKSxcbiAgICAgICAgYW1vdW50OiBOdW1iZXIoKHIgYXMgdW5rbm93bltdKVs0XSksXG4gICAgICAgIGluY2x1ZGVkOiBCb29sZWFuKChyIGFzIHVua25vd25bXSlbNV0pLFxuICAgICAgICBub3RlOiAociBhcyB1bmtub3duW10pWzZdIGFzIHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICAgIH07XG4gICAgICBpZiAoIXRheGVzQnlJdGVtLmhhcyhpdGVtSWQpKSB0YXhlc0J5SXRlbS5zZXQoaXRlbUlkLCBbXSk7XG4gICAgICB0YXhlc0J5SXRlbS5nZXQoaXRlbUlkKSEucHVzaCh0YXgpO1xuICAgIH1cbiAgICBpdGVtc1dpdGhUYXhlcyA9IGl0ZW1zLm1hcCgoaXQpID0+ICh7XG4gICAgICAuLi5pdCxcbiAgICAgIHRheGVzOiB0YXhlc0J5SXRlbS5nZXQoaXQuaWQpLFxuICAgIH0pKTtcbiAgfVxuXG4gIC8vIEludm9pY2UgdGF4IHN1bW1hcnlcbiAgY29uc3QgaW52VGF4Um93cyA9IGRiLnF1ZXJ5KFxuICAgIGBTRUxFQ1QgaWQsIGludm9pY2VfaWQsIHRheF9kZWZpbml0aW9uX2lkLCBwZXJjZW50LCB0YXhhYmxlX2Ftb3VudCwgdGF4X2Ftb3VudCBGUk9NIGludm9pY2VfdGF4ZXMgV0hFUkUgaW52b2ljZV9pZCA9ID9gLFxuICAgIFtpbnZvaWNlLmlkXSxcbiAgKTtcbiAgY29uc3QgdGF4ZXMgPSBpbnZUYXhSb3dzLm1hcCgocikgPT4gKHtcbiAgICBpZDogclswXSBhcyBzdHJpbmcsXG4gICAgaW52b2ljZUlkOiByWzFdIGFzIHN0cmluZyxcbiAgICB0YXhEZWZpbml0aW9uSWQ6IHJbMl0gPyBTdHJpbmcoclsyXSkgOiB1bmRlZmluZWQsXG4gICAgcGVyY2VudDogTnVtYmVyKHJbM10gYXMgbnVtYmVyKSxcbiAgICB0YXhhYmxlQW1vdW50OiBOdW1iZXIocls0XSBhcyBudW1iZXIpLFxuICAgIHRheEFtb3VudDogTnVtYmVyKHJbNV0gYXMgbnVtYmVyKSxcbiAgfSkpO1xuXG4gIGNvbnN0IHN0YXR1c0hpc3RvcnkgPSBnZXRTdGF0dXNIaXN0b3J5KFN0cmluZyhpbnZvaWNlLmlkKSk7XG4gIHJldHVybiB7IC4uLmludm9pY2UsIGN1c3RvbWVyLCBpdGVtczogaXRlbXNXaXRoVGF4ZXMsIHRheGVzLCBzdGF0dXNIaXN0b3J5IH07XG59O1xuXG5leHBvcnQgY29uc3QgdXBkYXRlSW52b2ljZSA9IGFzeW5jIChcbiAgaWQ6IHN0cmluZyxcbiAgZGF0YTogUGFydGlhbDxVcGRhdGVJbnZvaWNlUmVxdWVzdD4sXG4pOiBQcm9taXNlPEludm9pY2VXaXRoRGV0YWlscyB8IG51bGw+ID0+IHtcbiAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBnZXRJbnZvaWNlQnlJZChpZCk7XG4gIGlmICghZXhpc3RpbmcpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgLy8gZXhpc3Rpbmcuc3RhdHVzIG1heSBiZSB0aGUgZGVyaXZlZCBcIm92ZXJkdWVcIjsgcGVyc2lzdCB0aGUgc3RvcmVkIHN0YXR1c1xuICAvLyBpbnN0ZWFkIHNvIGl0IGlzbid0IGZyb3plbiBpbnRvIHRoZSBkYXRhYmFzZS5cbiAgY29uc3Qgc3RvcmVkU3RhdHVzID0gKChkYi5xdWVyeShcIlNFTEVDVCBzdGF0dXMgRlJPTSBpbnZvaWNlcyBXSEVSRSBpZCA9ID9cIiwgW1xuICAgIGlkLFxuICBdKSBhcyB1bmtub3duW11bXSlbMF0/LlswXSA/PyBleGlzdGluZy5zdGF0dXMpIGFzIEludm9pY2VbXCJzdGF0dXNcIl07XG5cbiAgLy8gSW1tdXRhYmlsaXR5OiBwcmV2ZW50IHN0cnVjdHVyYWwgY2hhbmdlcyBvbmNlIHNlbnQvcGFpZFxuICAvLyBWb2lkZWQgaW52b2ljZXMgYXJlIGNvbXBsZXRlbHkgbG9ja2VkIOKAlCBvbmx5IGRlbGV0aW9uIGlzIGFsbG93ZWRcbiAgaWYgKGV4aXN0aW5nLnN0YXR1cyA9PT0gXCJ2b2lkZWRcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlZvaWRlZCBpbnZvaWNlcyBjYW5ub3QgYmUgbW9kaWZpZWQuXCIpO1xuICB9XG5cbiAgLy8gVmFsaWRhdGUgc3RhdHVzIHRyYW5zaXRpb25zXG4gIGlmIChkYXRhLnN0YXR1cyAmJiBkYXRhLnN0YXR1cyAhPT0gZXhpc3Rpbmcuc3RhdHVzKSB7XG4gICAgY29uc3QgZnJvbSA9IGV4aXN0aW5nLnN0YXR1cztcbiAgICBjb25zdCB0byA9IGRhdGEuc3RhdHVzO1xuICAgIGNvbnN0IGFsbG93ZWQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcbiAgICAgIGRyYWZ0OiBbXCJzZW50XCJdLFxuICAgICAgc2VudDogW1wicGFpZFwiXSxcbiAgICAgIGNvbXBsZXRlOiBbXSxcbiAgICAgIG92ZXJkdWU6IFtcInBhaWRcIl0sXG4gICAgICBwYWlkOiBbXCJjb21wbGV0ZVwiXSxcbiAgICAgIHZvaWRlZDogW10sXG4gICAgfTtcbiAgICBpZiAoIShhbGxvd2VkW2Zyb21dIHx8IFtdKS5pbmNsdWRlcyh0bykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGNoYW5nZSBzdGF0dXMgZnJvbSAnJHtmcm9tfScgdG8gJyR7dG99Jy5gKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBpc0lzc3VlZCA9IGV4aXN0aW5nLnN0YXR1cyAhPT0gXCJkcmFmdFwiO1xuICBjb25zdCBhbGxvd1Byb3RlY3RlZENoYW5nZXMgPSBpc0ludm9pY2VQcm90ZWN0aW9uT3ZlcnJpZGVFbmFibGVkKCk7XG4gIGlmIChpc0lzc3VlZCAmJiAhYWxsb3dQcm90ZWN0ZWRDaGFuZ2VzKSB7XG4gICAgY29uc3QgZm9yYmlkZGVuID0gW1xuICAgICAgXCJpdGVtc1wiLFxuICAgICAgXCJkaXNjb3VudEFtb3VudFwiLFxuICAgICAgXCJkaXNjb3VudFBlcmNlbnRhZ2VcIixcbiAgICAgIFwidGF4UmF0ZVwiLFxuICAgICAgXCJwcmljZXNJbmNsdWRlVGF4XCIsXG4gICAgICBcInJvdW5kaW5nTW9kZVwiLFxuICAgICAgXCJjdXJyZW5jeVwiLFxuICAgICAgXCJjdXN0b21lcklkXCIsXG4gICAgICBcImlzc3VlRGF0ZVwiLFxuICAgICAgXCJpbnZvaWNlTnVtYmVyXCIsXG4gICAgICBcInN1YnRvdGFsXCIsXG4gICAgICBcInRvdGFsXCIsXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IGsgb2YgZm9yYmlkZGVuKSB7XG4gICAgICBpZiAoKGRhdGEgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW2tdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIFwiSXNzdWVkIGludm9pY2VzIGNhbm5vdCBiZSBtb2RpZmllZC4gQ3JlYXRlIGEgY3JlZGl0IG5vdGUgaW5zdGVhZC5cIixcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBPcHRpb25hbDogdmFsaWRhdGUgYSBjdXN0b20gaW52b2ljZSBudW1iZXIgaWYgcHJvdmlkZWRcbiAgbGV0IG5leHRJbnZvaWNlTnVtYmVyOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGlmICh0eXBlb2YgZGF0YS5pbnZvaWNlTnVtYmVyID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3QgZGVzaXJlZCA9IGRhdGEuaW52b2ljZU51bWJlci50cmltKCk7XG4gICAgaWYgKGRlc2lyZWQubGVuZ3RoID4gMCAmJiBkZXNpcmVkICE9PSBleGlzdGluZy5pbnZvaWNlTnVtYmVyKSB7XG4gICAgICBjb25zdCBkdXAgPSBkYi5xdWVyeShcbiAgICAgICAgXCJTRUxFQ1QgMSBGUk9NIGludm9pY2VzIFdIRVJFIGludm9pY2VfbnVtYmVyID0gPyBBTkQgaWQgPD4gPyBMSU1JVCAxXCIsXG4gICAgICAgIFtkZXNpcmVkLCBpZF0sXG4gICAgICApO1xuICAgICAgaWYgKGR1cC5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludm9pY2UgbnVtYmVyIGFscmVhZHkgZXhpc3RzXCIpO1xuICAgICAgfVxuICAgICAgbmV4dEludm9pY2VOdW1iZXIgPSBkZXNpcmVkO1xuICAgIH1cbiAgfVxuXG4gIC8vIElmIGl0ZW1zIGFyZSBiZWluZyB1cGRhdGVkLCByZWNhbGN1bGF0ZSB0b3RhbHNcbiAgbGV0IHRvdGFscyA9IHtcbiAgICBzdWJ0b3RhbDogZXhpc3Rpbmcuc3VidG90YWwsXG4gICAgZGlzY291bnRBbW91bnQ6IGV4aXN0aW5nLmRpc2NvdW50QW1vdW50LFxuICAgIHRheEFtb3VudDogZXhpc3RpbmcudGF4QW1vdW50LFxuICAgIHRvdGFsOiBleGlzdGluZy50b3RhbCxcbiAgfTtcblxuICBsZXQgcGVyTGluZUNhbGNVcGRhdGU6IFBlckxpbmVDYWxjIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBpZiAoZGF0YS5pdGVtcykge1xuICAgIGNvbnN0IGhhc1BlckxpbmUgPSAoZGF0YS5pdGVtcyBhcyBBcnJheTx7IHRheGVzPzogTGluZVRheElucHV0W10gfT4pLnNvbWUoXG4gICAgICAoaSkgPT4gQXJyYXkuaXNBcnJheShpLnRheGVzKSAmJiAoaS50YXhlcz8ubGVuZ3RoIHx8IDApID4gMCxcbiAgICApO1xuICAgIGlmIChoYXNQZXJMaW5lKSB7XG4gICAgICBwZXJMaW5lQ2FsY1VwZGF0ZSA9IGNhbGN1bGF0ZVBlckxpbmVUb3RhbHMoXG4gICAgICAgIGRhdGEuaXRlbXMgYXMgdW5rbm93biBhcyBJdGVtSW5wdXRbXSxcbiAgICAgICAgZGF0YS5kaXNjb3VudFBlcmNlbnRhZ2UgPz8gZXhpc3RpbmcuZGlzY291bnRQZXJjZW50YWdlLFxuICAgICAgICBkYXRhLmRpc2NvdW50QW1vdW50ID8/IGV4aXN0aW5nLmRpc2NvdW50QW1vdW50LFxuICAgICAgICBkYXRhLnByaWNlc0luY2x1ZGVUYXggPz8gZXhpc3RpbmcucHJpY2VzSW5jbHVkZVRheCA/PyBmYWxzZSxcbiAgICAgICAgKGRhdGEucm91bmRpbmdNb2RlIGFzIFwibGluZVwiIHwgXCJ0b3RhbFwiKSB8fFxuICAgICAgICAgIChleGlzdGluZy5yb3VuZGluZ01vZGUgYXMgXCJsaW5lXCIgfCBcInRvdGFsXCIpIHx8XG4gICAgICAgICAgXCJsaW5lXCIsXG4gICAgICApO1xuICAgICAgdG90YWxzID0ge1xuICAgICAgICBzdWJ0b3RhbDogcGVyTGluZUNhbGNVcGRhdGUuc3VidG90YWwsXG4gICAgICAgIGRpc2NvdW50QW1vdW50OiBwZXJMaW5lQ2FsY1VwZGF0ZS5kaXNjb3VudEFtb3VudCxcbiAgICAgICAgdGF4QW1vdW50OiBwZXJMaW5lQ2FsY1VwZGF0ZS50YXhBbW91bnQsXG4gICAgICAgIHRvdGFsOiBwZXJMaW5lQ2FsY1VwZGF0ZS50b3RhbCxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvdGFscyA9IGNhbGN1bGF0ZUludm9pY2VUb3RhbHMoXG4gICAgICAgIGRhdGEuaXRlbXMsXG4gICAgICAgIGRhdGEuZGlzY291bnRQZXJjZW50YWdlID8/IGV4aXN0aW5nLmRpc2NvdW50UGVyY2VudGFnZSxcbiAgICAgICAgZGF0YS5kaXNjb3VudEFtb3VudCA/PyBleGlzdGluZy5kaXNjb3VudEFtb3VudCxcbiAgICAgICAgZGF0YS50YXhSYXRlID8/IGV4aXN0aW5nLnRheFJhdGUsXG4gICAgICAgIGRhdGEucHJpY2VzSW5jbHVkZVRheCA/PyBleGlzdGluZy5wcmljZXNJbmNsdWRlVGF4ID8/IGZhbHNlLFxuICAgICAgICAoZGF0YS5yb3VuZGluZ01vZGUgYXMgXCJsaW5lXCIgfCBcInRvdGFsXCIpIHx8XG4gICAgICAgICAgKGV4aXN0aW5nLnJvdW5kaW5nTW9kZSBhcyBcImxpbmVcIiB8IFwidG90YWxcIikgfHxcbiAgICAgICAgICBcImxpbmVcIixcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgdXBkYXRlZEF0ID0gbmV3IERhdGUoKTtcblxuICAvLyBOb3JtYWxpemUgbm90ZXM6IHRyZWF0IHdoaXRlc3BhY2Utb25seSBhcyBlbXB0eSBzdHJpbmcgc28gaXQgY2xlYXJzIHN0b3JlZCBub3Rlc1xuICBjb25zdCBub3JtYWxpemVkTm90ZXMgPSAoKCk6IHN0cmluZyB8IHVuZGVmaW5lZCA9PiB7XG4gICAgaWYgKGRhdGEubm90ZXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZDsgLy8gbm90IHByb3ZpZGVkXG4gICAgY29uc3QgdiA9IFN0cmluZyhkYXRhLm5vdGVzKTtcbiAgICByZXR1cm4gdi50cmltKCkubGVuZ3RoID09PSAwID8gXCJcIiA6IHY7XG4gIH0pKCk7XG5cbiAgZGIuZXhlY3V0ZShcIkJFR0lOXCIpO1xuICB0cnkge1xuICAgIC8vIFVwZGF0ZSBpbnZvaWNlXG4gICAgZGIucXVlcnkoXG4gICAgICBgXG4gICAgVVBEQVRFIGludm9pY2VzIFNFVFxuICAgICAgY3VzdG9tZXJfaWQgPSA/LCBpc3N1ZV9kYXRlID0gPywgZHVlX2RhdGUgPSA/LCBjdXJyZW5jeSA9ID8sIHN0YXR1cyA9ID8sXG4gICAgICBzdWJ0b3RhbCA9ID8sIGRpc2NvdW50X2Ftb3VudCA9ID8sIGRpc2NvdW50X3BlcmNlbnRhZ2UgPSA/LCB0YXhfcmF0ZSA9ID8sIHRheF9hbW91bnQgPSA/LCB0b3RhbCA9ID8sXG4gICAgICBwYXltZW50X3Rlcm1zID0gPywgbm90ZXMgPSA/LCB1cGRhdGVkX2F0ID0gPyxcbiAgICAgIHByaWNlc19pbmNsdWRlX3RheCA9IENPQUxFU0NFKD8sIHByaWNlc19pbmNsdWRlX3RheCksXG4gICAgICByb3VuZGluZ19tb2RlID0gQ09BTEVTQ0UoPywgcm91bmRpbmdfbW9kZSksXG4gICAgICBsb2NhbGUgPSA/LFxuICAgICAgaW52b2ljZV9udW1iZXIgPSBDT0FMRVNDRSg/LCBpbnZvaWNlX251bWJlcilcbiAgICBXSEVSRSBpZCA9ID9cbiAgYCxcbiAgICAgIFtcbiAgICAgICAgZGF0YS5jdXN0b21lcklkID8/IGV4aXN0aW5nLmN1c3RvbWVySWQsXG4gICAgICAgIGRhdGEuaXNzdWVEYXRlID8gbmV3IERhdGUoZGF0YS5pc3N1ZURhdGUpIDogZXhpc3RpbmcuaXNzdWVEYXRlLFxuICAgICAgICBkYXRhLmR1ZURhdGUgPT09IG51bGwgfHwgZGF0YS5kdWVEYXRlID09PSBcIlwiXG4gICAgICAgICAgPyBudWxsXG4gICAgICAgICAgOiBkYXRhLmR1ZURhdGVcbiAgICAgICAgICAgID8gbmV3IERhdGUoZGF0YS5kdWVEYXRlKVxuICAgICAgICAgICAgOiBleGlzdGluZy5kdWVEYXRlLFxuICAgICAgICBkYXRhLmN1cnJlbmN5ID8/IGV4aXN0aW5nLmN1cnJlbmN5LFxuICAgICAgICBkYXRhLnN0YXR1cyA/PyBzdG9yZWRTdGF0dXMsXG4gICAgICAgIHRvdGFscy5zdWJ0b3RhbCxcbiAgICAgICAgdG90YWxzLmRpc2NvdW50QW1vdW50LFxuICAgICAgICBkYXRhLmRpc2NvdW50UGVyY2VudGFnZSA/PyBleGlzdGluZy5kaXNjb3VudFBlcmNlbnRhZ2UsXG4gICAgICAgIGRhdGEudGF4UmF0ZSA/PyBleGlzdGluZy50YXhSYXRlLFxuICAgICAgICB0b3RhbHMudGF4QW1vdW50LFxuICAgICAgICB0b3RhbHMudG90YWwsXG4gICAgICAgIGRhdGEucGF5bWVudFRlcm1zID8/IGV4aXN0aW5nLnBheW1lbnRUZXJtcyxcbiAgICAgICAgbm9ybWFsaXplZE5vdGVzICE9PSB1bmRlZmluZWQgPyBub3JtYWxpemVkTm90ZXMgOiBleGlzdGluZy5ub3RlcyxcbiAgICAgICAgdXBkYXRlZEF0LFxuICAgICAgICB0eXBlb2YgZGF0YS5wcmljZXNJbmNsdWRlVGF4ID09PSBcImJvb2xlYW5cIlxuICAgICAgICAgID8gZGF0YS5wcmljZXNJbmNsdWRlVGF4XG4gICAgICAgICAgICA/IDFcbiAgICAgICAgICAgIDogMFxuICAgICAgICAgIDogbnVsbCxcbiAgICAgICAgZGF0YS5yb3VuZGluZ01vZGUgPz8gbnVsbCxcbiAgICAgICAgZGF0YS5sb2NhbGUgPT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gKGV4aXN0aW5nLmxvY2FsZSA/PyBudWxsKVxuICAgICAgICAgIDogKG5vcm1hbGl6ZUludm9pY2VMb2NhbGVTZXR0aW5nKGRhdGEubG9jYWxlKSA/PyBudWxsKSxcbiAgICAgICAgbmV4dEludm9pY2VOdW1iZXIgPz8gbnVsbCxcbiAgICAgICAgaWQsXG4gICAgICBdLFxuICAgICk7XG4gICAgLy8gTG9jayBhIGZpbmFsIGludm9pY2UgbnVtYmVyIHdoZW4gdHJhbnNpdGlvbmluZyBvdXQgb2YgZHJhZnQgd2l0aG91dCBhIGN1c3RvbSBudW1iZXJcbiAgICBpZiAoXG4gICAgICAoZGF0YS5zdGF0dXMgPT09IFwic2VudFwiIHx8IGRhdGEuc3RhdHVzID09PSBcInBhaWRcIikgJiZcbiAgICAgIGV4aXN0aW5nLnN0YXR1cyA9PT0gXCJkcmFmdFwiICYmXG4gICAgICAhbmV4dEludm9pY2VOdW1iZXIgJiZcbiAgICAgIGV4aXN0aW5nLmludm9pY2VOdW1iZXIuc3RhcnRzV2l0aChcIkRSQUZULVwiKVxuICAgICkge1xuICAgICAgY29uc3QgZmluYWxOdW0gPSBnZXROZXh0SW52b2ljZU51bWJlcihcbiAgICAgICAgZGF0YS5jdXN0b21lcklkID8/IGV4aXN0aW5nLmN1c3RvbWVySWQsXG4gICAgICApO1xuICAgICAgZGIucXVlcnkoXG4gICAgICAgIFwiVVBEQVRFIGludm9pY2VzIFNFVCBpbnZvaWNlX251bWJlciA9ID8sIHVwZGF0ZWRfYXQgPSA/IFdIRVJFIGlkID0gP1wiLFxuICAgICAgICBbZmluYWxOdW0sIG5ldyBEYXRlKCksIGlkXSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gUmVjb3JkIHN0YXR1cyB0cmFuc2l0aW9uIGluIGhpc3RvcnlcbiAgICBpZiAoZGF0YS5zdGF0dXMgJiYgZGF0YS5zdGF0dXMgIT09IGV4aXN0aW5nLnN0YXR1cykge1xuICAgICAgcmVjb3JkU3RhdHVzQ2hhbmdlKFxuICAgICAgICBkYixcbiAgICAgICAgaWQsXG4gICAgICAgIGRhdGEuc3RhdHVzLFxuICAgICAgICBkYXRhLnN0YXR1cyA9PT0gXCJwYWlkXCIgPyBkYXRhLnBheW1lbnRNZXRob2QgOiB1bmRlZmluZWQsXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIFVwZGF0ZSBpdGVtcyBpZiBwcm92aWRlZFxuICAgIGlmIChkYXRhLml0ZW1zKSB7XG4gICAgICAvLyBEZWxldGUgZXhpc3RpbmcgdGF4ZXMsIHRoZW4gaXRlbXNcbiAgICAgIGRiLnF1ZXJ5KFxuICAgICAgICBcIkRFTEVURSBGUk9NIGludm9pY2VfaXRlbV90YXhlcyBXSEVSRSBpbnZvaWNlX2l0ZW1faWQgSU4gKFNFTEVDVCBpZCBGUk9NIGludm9pY2VfaXRlbXMgV0hFUkUgaW52b2ljZV9pZCA9ID8pXCIsXG4gICAgICAgIFtpZF0sXG4gICAgICApO1xuICAgICAgZGIucXVlcnkoXCJERUxFVEUgRlJPTSBpbnZvaWNlX3RheGVzIFdIRVJFIGludm9pY2VfaWQgPSA/XCIsIFtpZF0pO1xuICAgICAgZGIucXVlcnkoXCJERUxFVEUgRlJPTSBpbnZvaWNlX2l0ZW1zIFdIRVJFIGludm9pY2VfaWQgPSA/XCIsIFtpZF0pO1xuXG4gICAgICAvLyBEcmFmdHMgdGFrZSB0aGUgcHJvZHVjdHMnIGN1cnJlbnQgdmFsdWVzOyBpc3N1ZWQgaW52b2ljZXMgKHByb3RlY3Rpb25cbiAgICAgIC8vIG92ZXJyaWRlKSBrZWVwIHRoZSBzbmFwc2hvdCB0YWtlbiB3aGVuIHRoZXkgd2VyZSBsYXN0IHNhdmVkIGFzIGRyYWZ0LlxuICAgICAgY29uc3QgcHJldmlvdXNTbmFwc2hvdHMgPSBuZXcgTWFwPHN0cmluZywgUHJvZHVjdFNuYXBzaG90PigpO1xuICAgICAgaWYgKGlzSXNzdWVkKSB7XG4gICAgICAgIGZvciAoY29uc3QgcHJldiBvZiBleGlzdGluZy5pdGVtcykge1xuICAgICAgICAgIGlmIChwcmV2LnByb2R1Y3RJZCAmJiAhcHJldmlvdXNTbmFwc2hvdHMuaGFzKHByZXYucHJvZHVjdElkKSkge1xuICAgICAgICAgICAgcHJldmlvdXNTbmFwc2hvdHMuc2V0KHByZXYucHJvZHVjdElkLCBwcmV2KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSW5zZXJ0IG5ldyBpdGVtc1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLml0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSBkYXRhLml0ZW1zW2ldO1xuICAgICAgICBjb25zdCBpdGVtSWQgPSBnZW5lcmF0ZVVVSUQoKTtcbiAgICAgICAgY29uc3QgbGluZVRvdGFsID0gaXRlbS5xdWFudGl0eSAqIGl0ZW0udW5pdFByaWNlO1xuICAgICAgICBjb25zdCB1bml0ID0gdHlwZW9mIGl0ZW0udW5pdCA9PT0gXCJzdHJpbmdcIiA/IGl0ZW0udW5pdC50cmltKCkgOiBcIlwiO1xuICAgICAgICBjb25zdCBzbmFwc2hvdCA9XG4gICAgICAgICAgKGl0ZW0ucHJvZHVjdElkICYmIHByZXZpb3VzU25hcHNob3RzLmdldChpdGVtLnByb2R1Y3RJZCkpIHx8XG4gICAgICAgICAgc25hcHNob3RQcm9kdWN0KGl0ZW0ucHJvZHVjdElkKTtcblxuICAgICAgICBkYi5xdWVyeShcbiAgICAgICAgICBgXG4gICAgICAgIElOU0VSVCBJTlRPIGludm9pY2VfaXRlbXMgKFxuICAgICAgICAgIGlkLCBpbnZvaWNlX2lkLCBwcm9kdWN0X2lkLCBkZXNjcmlwdGlvbiwgcXVhbnRpdHksIHVuaXQsIHVuaXRfcHJpY2UsIGxpbmVfdG90YWwsIG5vdGVzLCBzb3J0X29yZGVyLFxuICAgICAgICAgIGhzX2NvZGUsIGNvdW50cnlfb2Zfb3JpZ2luLCBsZW5ndGhfbW0sIHdpZHRoX21tLCBoZWlnaHRfbW0sIHdlaWdodF9nXG4gICAgICAgICkgVkFMVUVTICg/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/KVxuICAgICAgYCxcbiAgICAgICAgICBbXG4gICAgICAgICAgICBpdGVtSWQsXG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIGl0ZW0ucHJvZHVjdElkIHx8IG51bGwsXG4gICAgICAgICAgICBpdGVtLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgaXRlbS5xdWFudGl0eSxcbiAgICAgICAgICAgIHVuaXQgfHwgbnVsbCxcbiAgICAgICAgICAgIGl0ZW0udW5pdFByaWNlLFxuICAgICAgICAgICAgbGluZVRvdGFsLFxuICAgICAgICAgICAgaXRlbS5ub3RlcyxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICAuLi5zbmFwc2hvdFBhcmFtcyhzbmFwc2hvdCksXG4gICAgICAgICAgXSxcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAocGVyTGluZUNhbGNVcGRhdGUpIHtcbiAgICAgICAgICBjb25zdCBjYWxjID0gcGVyTGluZUNhbGNVcGRhdGUucGVySXRlbVtpXTtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBjYWxjICYmXG4gICAgICAgICAgICBBcnJheS5pc0FycmF5KChpdGVtIGFzIHsgdGF4ZXM/OiBMaW5lVGF4SW5wdXRbXSB9KS50YXhlcylcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdCBvZiBjYWxjLnRheGVzKSB7XG4gICAgICAgICAgICAgIGRiLnF1ZXJ5KFxuICAgICAgICAgICAgICAgIGBJTlNFUlQgSU5UTyBpbnZvaWNlX2l0ZW1fdGF4ZXMgKGlkLCBpbnZvaWNlX2l0ZW1faWQsIHRheF9kZWZpbml0aW9uX2lkLCBwZXJjZW50LCB0YXhhYmxlX2Ftb3VudCwgYW1vdW50LCBpbmNsdWRlZCwgc2VxdWVuY2UsIG5vdGUsIGNyZWF0ZWRfYXQpXG4gICAgICAgICAgICAgICBWQUxVRVMgKD8sID8sID8sID8sID8sID8sID8sID8sID8sID8pYCxcbiAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICBnZW5lcmF0ZVVVSUQoKSxcbiAgICAgICAgICAgICAgICAgIGl0ZW1JZCxcbiAgICAgICAgICAgICAgICAgIHQudGF4RGVmaW5pdGlvbklkIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgICB0LnBlcmNlbnQsXG4gICAgICAgICAgICAgICAgICBjYWxjLnRheGFibGUsXG4gICAgICAgICAgICAgICAgICB0LmFtb3VudCxcbiAgICAgICAgICAgICAgICAgIChkYXRhLnByaWNlc0luY2x1ZGVUYXggPz8gZXhpc3RpbmcucHJpY2VzSW5jbHVkZVRheCA/PyBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgPyAxXG4gICAgICAgICAgICAgICAgICAgIDogMCxcbiAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICB0Lm5vdGUgfHwgbnVsbCxcbiAgICAgICAgICAgICAgICAgIG5ldyBEYXRlKCksXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHBlckxpbmVDYWxjVXBkYXRlKSB7XG4gICAgICAgIGZvciAoY29uc3QgcyBvZiBwZXJMaW5lQ2FsY1VwZGF0ZS5zdW1tYXJ5KSB7XG4gICAgICAgICAgZGIucXVlcnkoXG4gICAgICAgICAgICBgSU5TRVJUIElOVE8gaW52b2ljZV90YXhlcyAoaWQsIGludm9pY2VfaWQsIHRheF9kZWZpbml0aW9uX2lkLCBwZXJjZW50LCB0YXhhYmxlX2Ftb3VudCwgdGF4X2Ftb3VudCwgY3JlYXRlZF9hdClcbiAgICAgICAgICAgVkFMVUVTICg/LCA/LCA/LCA/LCA/LCA/LCA/KWAsXG4gICAgICAgICAgICBbXG4gICAgICAgICAgICAgIGdlbmVyYXRlVVVJRCgpLFxuICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgcy5wZXJjZW50LFxuICAgICAgICAgICAgICBzLnRheGFibGUsXG4gICAgICAgICAgICAgIHMuYW1vdW50LFxuICAgICAgICAgICAgICBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgdXNpbmcgaW52b2ljZS1sZXZlbCB0YXggKG5vIHBlci1saW5lIHRheGVzKSwgb3B0aW9uYWxseSBwZXJzaXN0IGEgc2luZ2xlIGludm9pY2UgdGF4IGRlZmluaXRpb24uXG4gICAgY29uc3QgZXhpc3RpbmdIYXNQZXJMaW5lVGF4ZXMgPSAoZXhpc3RpbmcuaXRlbXMgfHwgW10pLnNvbWUoXG4gICAgICAoaXQpID0+IEFycmF5LmlzQXJyYXkoaXQudGF4ZXMpICYmIGl0LnRheGVzLmxlbmd0aCA+IDAsXG4gICAgKTtcbiAgICBjb25zdCBuZXh0SGFzUGVyTGluZVRheGVzID0gZGF0YS5pdGVtc1xuICAgICAgPyAhIXBlckxpbmVDYWxjVXBkYXRlXG4gICAgICA6IGV4aXN0aW5nSGFzUGVyTGluZVRheGVzO1xuXG4gICAgaWYgKCFuZXh0SGFzUGVyTGluZVRheGVzKSB7XG4gICAgICBjb25zdCBoYXNUYXhEZWZpbml0aW9uSWRJblJlcXVlc3QgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoXG4gICAgICAgIGRhdGEsXG4gICAgICAgIFwidGF4RGVmaW5pdGlvbklkXCIsXG4gICAgICApO1xuXG4gICAgICBpZiAoZGF0YS5pdGVtcyB8fCBoYXNUYXhEZWZpbml0aW9uSWRJblJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgcmF3VGF4RGVmSWQgPSAoZGF0YSBhcyB7IHRheERlZmluaXRpb25JZD86IHN0cmluZyB8IG51bGwgfSlcbiAgICAgICAgICAudGF4RGVmaW5pdGlvbklkO1xuICAgICAgICBjb25zdCByZXF1ZXN0ZWQgPVxuICAgICAgICAgIHR5cGVvZiByYXdUYXhEZWZJZCA9PT0gXCJzdHJpbmdcIiA/IHJhd1RheERlZklkLnRyaW0oKSA6IFwiXCI7XG4gICAgICAgIGNvbnN0IGVmZmVjdGl2ZVRheERlZmluaXRpb25JZCA9IGhhc1RheERlZmluaXRpb25JZEluUmVxdWVzdFxuICAgICAgICAgID8gcmVxdWVzdGVkIHx8IHVuZGVmaW5lZFxuICAgICAgICAgIDogZXhpc3RpbmcudGF4ZXMgJiYgZXhpc3RpbmcudGF4ZXMubGVuZ3RoID4gMFxuICAgICAgICAgICAgPyBleGlzdGluZy50YXhlc1swXS50YXhEZWZpbml0aW9uSWRcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuXG4gICAgICAgIC8vIFJlcGxhY2UgZXhpc3RpbmcgaW52b2ljZV90YXhlcyByb3dzIChpbnZvaWNlLWxldmVsIG1vZGUgb25seSlcbiAgICAgICAgZGIucXVlcnkoXCJERUxFVEUgRlJPTSBpbnZvaWNlX3RheGVzIFdIRVJFIGludm9pY2VfaWQgPSA/XCIsIFtpZF0pO1xuXG4gICAgICAgIGlmIChlZmZlY3RpdmVUYXhEZWZpbml0aW9uSWQpIHtcbiAgICAgICAgICBjb25zdCByMiA9IChuOiBudW1iZXIpID0+IE1hdGgucm91bmQobiAqIDEwMCkgLyAxMDA7XG4gICAgICAgICAgY29uc3QgcGVyY2VudCA9IChkYXRhLnRheFJhdGUgPz8gZXhpc3RpbmcudGF4UmF0ZSkgfHwgMDtcbiAgICAgICAgICBjb25zdCByYXRlID0gTWF0aC5tYXgoMCwgTnVtYmVyKHBlcmNlbnQpIHx8IDApIC8gMTAwO1xuICAgICAgICAgIGNvbnN0IGluY2x1ZGVUYXggPVxuICAgICAgICAgICAgZGF0YS5wcmljZXNJbmNsdWRlVGF4ID8/IGV4aXN0aW5nLnByaWNlc0luY2x1ZGVUYXggPz8gZmFsc2U7XG4gICAgICAgICAgY29uc3QgYWZ0ZXJEaXNjb3VudCA9IHIyKHRvdGFscy5zdWJ0b3RhbCAtIHRvdGFscy5kaXNjb3VudEFtb3VudCk7XG4gICAgICAgICAgY29uc3QgdGF4YWJsZSA9IGluY2x1ZGVUYXhcbiAgICAgICAgICAgID8gcmF0ZSA+IDBcbiAgICAgICAgICAgICAgPyByMihhZnRlckRpc2NvdW50IC8gKDEgKyByYXRlKSlcbiAgICAgICAgICAgICAgOiBhZnRlckRpc2NvdW50XG4gICAgICAgICAgICA6IGFmdGVyRGlzY291bnQ7XG4gICAgICAgICAgZGIucXVlcnkoXG4gICAgICAgICAgICBgSU5TRVJUIElOVE8gaW52b2ljZV90YXhlcyAoaWQsIGludm9pY2VfaWQsIHRheF9kZWZpbml0aW9uX2lkLCBwZXJjZW50LCB0YXhhYmxlX2Ftb3VudCwgdGF4X2Ftb3VudCwgY3JlYXRlZF9hdClcbiAgICAgICAgICAgVkFMVUVTICg/LCA/LCA/LCA/LCA/LCA/LCA/KWAsXG4gICAgICAgICAgICBbXG4gICAgICAgICAgICAgIGdlbmVyYXRlVVVJRCgpLFxuICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgZWZmZWN0aXZlVGF4RGVmaW5pdGlvbklkLFxuICAgICAgICAgICAgICBwZXJjZW50LFxuICAgICAgICAgICAgICB0YXhhYmxlLFxuICAgICAgICAgICAgICB0b3RhbHMudGF4QW1vdW50LFxuICAgICAgICAgICAgICBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZGIuZXhlY3V0ZShcIkNPTU1JVFwiKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRyeSB7XG4gICAgICBkYi5leGVjdXRlKFwiUk9MTEJBQ0tcIik7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBpZ25vcmUgKi9cbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIHJldHVybiBhd2FpdCBnZXRJbnZvaWNlQnlJZChpZCk7XG59O1xuXG5leHBvcnQgY29uc3QgZGVsZXRlSW52b2ljZSA9IGFzeW5jIChpZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgZ2V0SW52b2ljZUJ5SWQoaWQpO1xuICBpZiAoIWV4aXN0aW5nKSB0aHJvdyBuZXcgRXJyb3IoXCJJbnZvaWNlIG5vdCBmb3VuZFwiKTtcblxuICBjb25zdCBhbGxvd1Byb3RlY3RlZENoYW5nZXMgPSBpc0ludm9pY2VQcm90ZWN0aW9uT3ZlcnJpZGVFbmFibGVkKCk7XG4gIC8vIE9ubHkgZHJhZnQgaW52b2ljZXMgY2FuIGJlIGRlbGV0ZWQ7IGlzc3VlZCBpbnZvaWNlcyBtdXN0IGJlIHZvaWRlZCBmb3IgYXVkaXQgdHJhaWxcbiAgaWYgKFxuICAgICFhbGxvd1Byb3RlY3RlZENoYW5nZXMgJiZcbiAgICBleGlzdGluZy5zdGF0dXMgIT09IFwiZHJhZnRcIiAmJlxuICAgIGV4aXN0aW5nLnN0YXR1cyAhPT0gXCJ2b2lkZWRcIlxuICApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBcIk9ubHkgZHJhZnQgb3Igdm9pZGVkIGludm9pY2VzIGNhbiBiZSBkZWxldGVkLiBWb2lkIHRoZSBpbnZvaWNlIGZpcnN0LlwiLFxuICAgICk7XG4gIH1cblxuICBjb25zdCBkYiA9IGdldERhdGFiYXNlKCk7XG5cbiAgLy8gRGVsZXRlIGl0ZW1zIGZpcnN0IChDQVNDQURFIHNob3VsZCBoYW5kbGUgdGhpcywgYnV0IGJlaW5nIGV4cGxpY2l0KVxuICBkYi5xdWVyeShcIkRFTEVURSBGUk9NIGludm9pY2VfaXRlbXMgV0hFUkUgaW52b2ljZV9pZCA9ID9cIiwgW2lkXSk7XG5cbiAgLy8gRGVsZXRlIGludm9pY2VcbiAgZGIucXVlcnkoXCJERUxFVEUgRlJPTSBpbnZvaWNlcyBXSEVSRSBpZCA9ID9cIiwgW2lkXSk7XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5leHBvcnQgY29uc3QgZHVwbGljYXRlSW52b2ljZSA9IGFzeW5jIChcbiAgaWQ6IHN0cmluZyxcbik6IFByb21pc2U8SW52b2ljZVdpdGhEZXRhaWxzIHwgbnVsbD4gPT4ge1xuICBjb25zdCBvcmlnaW5hbCA9IGF3YWl0IGdldEludm9pY2VCeUlkKGlkKTtcbiAgaWYgKCFvcmlnaW5hbCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgY29uc3QgbmV3SWQgPSBnZW5lcmF0ZVVVSUQoKTtcbiAgY29uc3QgbmV3U2hhcmUgPSBnZW5lcmF0ZVNoYXJlVG9rZW4oKTtcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgLy8gU3RhcnQgYXMgZHJhZnQgd2l0aCBhIGRyYWZ0IGludm9pY2UgbnVtYmVyOyBjb3B5IGRlc2NyaXB0aXZlIGZpZWxkcywgdG90YWxzIHdpbGwgYmUgcmVjYWxjdWxhdGVkIGZyb20gaXRlbXNcbiAgY29uc3QgaXRlbXMgPSBvcmlnaW5hbC5pdGVtcyB8fCBbXTtcbiAgY29uc3QgcHJpY2VzSW5jbHVkZVRheCA9IEJvb2xlYW4oKG9yaWdpbmFsIGFzIEludm9pY2UpLnByaWNlc0luY2x1ZGVUYXgpO1xuICBjb25zdCByb3VuZGluZ01vZGUgPSAoKG9yaWdpbmFsIGFzIEludm9pY2UpLnJvdW5kaW5nTW9kZSB8fCBcImxpbmVcIikgYXNcbiAgICBcImxpbmVcIiB8IFwidG90YWxcIjtcbiAgLy8gUmVjb21wdXRlIHRvdGFscyB0byBhdm9pZCBzdGFsZSBudW1iZXJzLCB0aGUgc2FtZSB3YXkgY3JlYXRlSW52b2ljZSBkb2VzXG4gIGNvbnN0IGhhc1BlckxpbmVUYXhlcyA9IGl0ZW1zLnNvbWUoKGkpID0+IChpLnRheGVzPy5sZW5ndGggfHwgMCkgPiAwKTtcbiAgY29uc3QgcGVyTGluZUNhbGMgPSBoYXNQZXJMaW5lVGF4ZXNcbiAgICA/IGNhbGN1bGF0ZVBlckxpbmVUb3RhbHMoXG4gICAgICAgIGl0ZW1zLm1hcCgoaSkgPT4gKHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogaS5kZXNjcmlwdGlvbixcbiAgICAgICAgICBxdWFudGl0eTogaS5xdWFudGl0eSxcbiAgICAgICAgICB1bml0UHJpY2U6IGkudW5pdFByaWNlLFxuICAgICAgICAgIHRheGVzOiAoaS50YXhlcyB8fCBbXSkubWFwKCh0KSA9PiAoe1xuICAgICAgICAgICAgcGVyY2VudDogdC5wZXJjZW50LFxuICAgICAgICAgICAgdGF4RGVmaW5pdGlvbklkOiB0LnRheERlZmluaXRpb25JZCxcbiAgICAgICAgICAgIG5vdGU6IHQubm90ZSxcbiAgICAgICAgICB9KSksXG4gICAgICAgIH0pKSxcbiAgICAgICAgb3JpZ2luYWwuZGlzY291bnRQZXJjZW50YWdlLFxuICAgICAgICBvcmlnaW5hbC5kaXNjb3VudEFtb3VudCxcbiAgICAgICAgcHJpY2VzSW5jbHVkZVRheCxcbiAgICAgICAgcm91bmRpbmdNb2RlLFxuICAgICAgKVxuICAgIDogdW5kZWZpbmVkO1xuICBjb25zdCB0b3RhbHMgPVxuICAgIHBlckxpbmVDYWxjID8/XG4gICAgY2FsY3VsYXRlSW52b2ljZVRvdGFscyhcbiAgICAgIGl0ZW1zLm1hcCgoaSkgPT4gKHsgcXVhbnRpdHk6IGkucXVhbnRpdHksIHVuaXRQcmljZTogaS51bml0UHJpY2UgfSkpLFxuICAgICAgb3JpZ2luYWwuZGlzY291bnRQZXJjZW50YWdlLFxuICAgICAgb3JpZ2luYWwuZGlzY291bnRBbW91bnQsXG4gICAgICBvcmlnaW5hbC50YXhSYXRlLFxuICAgICAgcHJpY2VzSW5jbHVkZVRheCxcbiAgICAgIHJvdW5kaW5nTW9kZSxcbiAgICApO1xuICBkYi5leGVjdXRlKFwiQkVHSU5cIik7XG4gIHRyeSB7XG4gICAgZGIucXVlcnkoXG4gICAgICBgXG4gICAgSU5TRVJUIElOVE8gaW52b2ljZXMgKFxuICAgICAgaWQsIGludm9pY2VfbnVtYmVyLCBjdXN0b21lcl9pZCwgaXNzdWVfZGF0ZSwgZHVlX2RhdGUsIGN1cnJlbmN5LCBzdGF0dXMsXG4gICAgICBzdWJ0b3RhbCwgZGlzY291bnRfYW1vdW50LCBkaXNjb3VudF9wZXJjZW50YWdlLCB0YXhfcmF0ZSwgdGF4X2Ftb3VudCwgdG90YWwsXG4gICAgICBwYXltZW50X3Rlcm1zLCBub3Rlcywgc2hhcmVfdG9rZW4sIGNyZWF0ZWRfYXQsIHVwZGF0ZWRfYXQsXG4gICAgICBwcmljZXNfaW5jbHVkZV90YXgsIHJvdW5kaW5nX21vZGUsIGxvY2FsZVxuICAgICkgVkFMVUVTICg/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/KVxuICBgLFxuICAgICAgW1xuICAgICAgICBuZXdJZCxcbiAgICAgICAgZ2VuZXJhdGVEcmFmdEludm9pY2VOdW1iZXIoKSxcbiAgICAgICAgb3JpZ2luYWwuY3VzdG9tZXJJZCxcbiAgICAgICAgbm93LFxuICAgICAgICBvcmlnaW5hbC5kdWVEYXRlIHx8IG51bGwsXG4gICAgICAgIG9yaWdpbmFsLmN1cnJlbmN5LFxuICAgICAgICBcImRyYWZ0XCIsXG4gICAgICAgIHRvdGFscy5zdWJ0b3RhbCxcbiAgICAgICAgdG90YWxzLmRpc2NvdW50QW1vdW50LFxuICAgICAgICBvcmlnaW5hbC5kaXNjb3VudFBlcmNlbnRhZ2UsXG4gICAgICAgIG9yaWdpbmFsLnRheFJhdGUsXG4gICAgICAgIHRvdGFscy50YXhBbW91bnQsXG4gICAgICAgIHRvdGFscy50b3RhbCxcbiAgICAgICAgb3JpZ2luYWwucGF5bWVudFRlcm1zIHx8IG51bGwsXG4gICAgICAgIG9yaWdpbmFsLm5vdGVzIHx8IG51bGwsXG4gICAgICAgIG5ld1NoYXJlLFxuICAgICAgICBub3csXG4gICAgICAgIG5vdyxcbiAgICAgICAgcHJpY2VzSW5jbHVkZVRheCA/IDEgOiAwLFxuICAgICAgICByb3VuZGluZ01vZGUsXG4gICAgICAgIChvcmlnaW5hbCBhcyBJbnZvaWNlKS5sb2NhbGUgPz8gbnVsbCxcbiAgICAgIF0sXG4gICAgKTtcbiAgICAvLyBDb3B5IGl0ZW1zXG4gICAgZm9yIChjb25zdCBbaWR4LCBpdF0gb2YgaXRlbXMuZW50cmllcygpKSB7XG4gICAgICBjb25zdCBpdGVtSWQgPSBnZW5lcmF0ZVVVSUQoKTtcbiAgICAgIC8vIE5ldyBkcmFmdDogdGFrZSBjdXJyZW50IHByb2R1Y3QgdmFsdWVzLCBrZWVwIHRoZSBvcmlnaW5hbCdzIGlmIHRoZSBwcm9kdWN0IGlzIGdvbmVcbiAgICAgIGNvbnN0IHNuYXBzaG90ID0gaXQucHJvZHVjdElkICYmIGdldFByb2R1Y3RCeUlkKGl0LnByb2R1Y3RJZClcbiAgICAgICAgPyBzbmFwc2hvdFByb2R1Y3QoaXQucHJvZHVjdElkKVxuICAgICAgICA6IGl0O1xuICAgICAgZGIucXVlcnkoXG4gICAgICAgIGBcbiAgICAgIElOU0VSVCBJTlRPIGludm9pY2VfaXRlbXMgKFxuICAgICAgICBpZCwgaW52b2ljZV9pZCwgcHJvZHVjdF9pZCwgZGVzY3JpcHRpb24sIHF1YW50aXR5LCB1bml0LCB1bml0X3ByaWNlLCBsaW5lX3RvdGFsLCBub3Rlcywgc29ydF9vcmRlcixcbiAgICAgICAgaHNfY29kZSwgY291bnRyeV9vZl9vcmlnaW4sIGxlbmd0aF9tbSwgd2lkdGhfbW0sIGhlaWdodF9tbSwgd2VpZ2h0X2dcbiAgICAgICkgVkFMVUVTICg/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/KVxuICAgIGAsXG4gICAgICAgIFtcbiAgICAgICAgICBpdGVtSWQsXG4gICAgICAgICAgbmV3SWQsXG4gICAgICAgICAgaXQucHJvZHVjdElkIHx8IG51bGwsXG4gICAgICAgICAgaXQuZGVzY3JpcHRpb24sXG4gICAgICAgICAgaXQucXVhbnRpdHksXG4gICAgICAgICAgaXQudW5pdCB8fCBudWxsLFxuICAgICAgICAgIGl0LnVuaXRQcmljZSxcbiAgICAgICAgICBpdC5saW5lVG90YWwsXG4gICAgICAgICAgaXQubm90ZXMgfHwgbnVsbCxcbiAgICAgICAgICBpZHgsXG4gICAgICAgICAgLi4uc25hcHNob3RQYXJhbXMoc25hcHNob3QpLFxuICAgICAgICBdLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IGxpbmVDYWxjID0gcGVyTGluZUNhbGM/LnBlckl0ZW1baWR4XTtcbiAgICAgIGZvciAoY29uc3QgdCBvZiBsaW5lQ2FsYz8udGF4ZXMgfHwgW10pIHtcbiAgICAgICAgZGIucXVlcnkoXG4gICAgICAgICAgYElOU0VSVCBJTlRPIGludm9pY2VfaXRlbV90YXhlcyAoaWQsIGludm9pY2VfaXRlbV9pZCwgdGF4X2RlZmluaXRpb25faWQsIHBlcmNlbnQsIHRheGFibGVfYW1vdW50LCBhbW91bnQsIGluY2x1ZGVkLCBzZXF1ZW5jZSwgbm90ZSwgY3JlYXRlZF9hdClcbiAgICAgICAgICAgVkFMVUVTICg/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/LCA/KWAsXG4gICAgICAgICAgW1xuICAgICAgICAgICAgZ2VuZXJhdGVVVUlEKCksXG4gICAgICAgICAgICBpdGVtSWQsXG4gICAgICAgICAgICB0LnRheERlZmluaXRpb25JZCB8fCBudWxsLFxuICAgICAgICAgICAgdC5wZXJjZW50LFxuICAgICAgICAgICAgbGluZUNhbGMhLnRheGFibGUsXG4gICAgICAgICAgICB0LmFtb3VudCxcbiAgICAgICAgICAgIHByaWNlc0luY2x1ZGVUYXggPyAxIDogMCxcbiAgICAgICAgICAgIDAsXG4gICAgICAgICAgICB0Lm5vdGUgfHwgbnVsbCxcbiAgICAgICAgICAgIG5vdyxcbiAgICAgICAgICBdLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBJbnZvaWNlIHRheCBzdW1tYXJ5OiBwZXItcmF0ZSB0b3RhbHMsIG9yIHRoZSBpbnZvaWNlLWxldmVsIHRheCBkZWZpbml0aW9uXG4gICAgY29uc3QgcjIgPSAobjogbnVtYmVyKSA9PiBNYXRoLnJvdW5kKG4gKiAxMDApIC8gMTAwO1xuICAgIGNvbnN0IGFmdGVyRGlzY291bnQgPSByMih0b3RhbHMuc3VidG90YWwgLSB0b3RhbHMuZGlzY291bnRBbW91bnQpO1xuICAgIGNvbnN0IHJhdGUgPSBNYXRoLm1heCgwLCBOdW1iZXIob3JpZ2luYWwudGF4UmF0ZSkgfHwgMCkgLyAxMDA7XG4gICAgY29uc3QgaW52b2ljZVRheGVzOiBBcnJheTx7XG4gICAgICB0YXhEZWZpbml0aW9uSWQ6IHN0cmluZyB8IG51bGw7XG4gICAgICBwZXJjZW50OiBudW1iZXI7XG4gICAgICB0YXhhYmxlOiBudW1iZXI7XG4gICAgICBhbW91bnQ6IG51bWJlcjtcbiAgICB9PiA9IHBlckxpbmVDYWxjXG4gICAgICA/IHBlckxpbmVDYWxjLnN1bW1hcnkubWFwKChzKSA9PiAoe1xuICAgICAgICAgIHRheERlZmluaXRpb25JZDogbnVsbCxcbiAgICAgICAgICBwZXJjZW50OiBzLnBlcmNlbnQsXG4gICAgICAgICAgdGF4YWJsZTogcy50YXhhYmxlLFxuICAgICAgICAgIGFtb3VudDogcy5hbW91bnQsXG4gICAgICAgIH0pKVxuICAgICAgOiAob3JpZ2luYWwudGF4ZXMgfHwgW10pXG4gICAgICAgICAgLmZpbHRlcigodCkgPT4gdC50YXhEZWZpbml0aW9uSWQpXG4gICAgICAgICAgLm1hcCgodCkgPT4gKHtcbiAgICAgICAgICAgIHRheERlZmluaXRpb25JZDogdC50YXhEZWZpbml0aW9uSWQgfHwgbnVsbCxcbiAgICAgICAgICAgIHBlcmNlbnQ6IG9yaWdpbmFsLnRheFJhdGUsXG4gICAgICAgICAgICB0YXhhYmxlOlxuICAgICAgICAgICAgICBwcmljZXNJbmNsdWRlVGF4ICYmIHJhdGUgPiAwXG4gICAgICAgICAgICAgICAgPyByMihhZnRlckRpc2NvdW50IC8gKDEgKyByYXRlKSlcbiAgICAgICAgICAgICAgICA6IGFmdGVyRGlzY291bnQsXG4gICAgICAgICAgICBhbW91bnQ6IHRvdGFscy50YXhBbW91bnQsXG4gICAgICAgICAgfSkpO1xuICAgIGZvciAoY29uc3QgdCBvZiBpbnZvaWNlVGF4ZXMpIHtcbiAgICAgIGRiLnF1ZXJ5KFxuICAgICAgICBgSU5TRVJUIElOVE8gaW52b2ljZV90YXhlcyAoaWQsIGludm9pY2VfaWQsIHRheF9kZWZpbml0aW9uX2lkLCBwZXJjZW50LCB0YXhhYmxlX2Ftb3VudCwgdGF4X2Ftb3VudCwgY3JlYXRlZF9hdClcbiAgICAgICAgIFZBTFVFUyAoPywgPywgPywgPywgPywgPywgPylgLFxuICAgICAgICBbXG4gICAgICAgICAgZ2VuZXJhdGVVVUlEKCksXG4gICAgICAgICAgbmV3SWQsXG4gICAgICAgICAgdC50YXhEZWZpbml0aW9uSWQsXG4gICAgICAgICAgdC5wZXJjZW50LFxuICAgICAgICAgIHQudGF4YWJsZSxcbiAgICAgICAgICB0LmFtb3VudCxcbiAgICAgICAgICBub3csXG4gICAgICAgIF0sXG4gICAgICApO1xuICAgIH1cbiAgICByZWNvcmRTdGF0dXNDaGFuZ2UoZGIsIG5ld0lkLCBcImRyYWZ0XCIpO1xuICAgIGRiLmV4ZWN1dGUoXCJDT01NSVRcIik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0cnkge1xuICAgICAgZGIuZXhlY3V0ZShcIlJPTExCQUNLXCIpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICAgIHRocm93IGU7XG4gIH1cbiAgcmV0dXJuIGF3YWl0IGdldEludm9pY2VCeUlkKG5ld0lkKTtcbn07XG5cbmV4cG9ydCBjb25zdCBwdWJsaXNoSW52b2ljZSA9IGFzeW5jIChcbiAgaWQ6IHN0cmluZyxcbik6IFByb21pc2U8eyBzaGFyZVRva2VuOiBzdHJpbmc7IHNoYXJlVXJsOiBzdHJpbmcgfT4gPT4ge1xuICBjb25zdCBpbnZvaWNlID0gYXdhaXQgZ2V0SW52b2ljZUJ5SWQoaWQpO1xuICBpZiAoIWludm9pY2UpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZvaWNlIG5vdCBmb3VuZFwiKTtcbiAgfVxuXG4gIC8vIFZhbGlkYXRlIG1pbmltYWwgcmVxdWlyZWQgZmllbGRzIGJlZm9yZSBpc3N1aW5nXG4gIGNvbnN0IG1pc3Npbmc6IHN0cmluZ1tdID0gW107XG4gIGlmICghaW52b2ljZS5jdXN0b21lcj8ubmFtZSkgbWlzc2luZy5wdXNoKFwiY3VzdG9tZXIubmFtZVwiKTtcbiAgaWYgKCFpbnZvaWNlLml0ZW1zIHx8IGludm9pY2UuaXRlbXMubGVuZ3RoID09PSAwKSBtaXNzaW5nLnB1c2goXCJpdGVtc1wiKTtcbiAgaWYgKCFpbnZvaWNlLmN1cnJlbmN5KSBtaXNzaW5nLnB1c2goXCJjdXJyZW5jeVwiKTtcbiAgaWYgKCFpbnZvaWNlLmlzc3VlRGF0ZSkgbWlzc2luZy5wdXNoKFwiaXNzdWVEYXRlXCIpO1xuICBpZiAobWlzc2luZy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgQ2Fubm90IHB1Ymxpc2ggaW52b2ljZS4gTWlzc2luZyByZXF1aXJlZCBmaWVsZHM6ICR7bWlzc2luZy5qb2luKFwiLCBcIil9YCxcbiAgICApO1xuICB9XG5cbiAgLy8gVXBkYXRlIHN0YXR1cyB0byAnc2VudCcgaWYgaXQncyBjdXJyZW50bHkgJ2RyYWZ0J1xuICBpZiAoaW52b2ljZS5zdGF0dXMgPT09IFwiZHJhZnRcIikge1xuICAgIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIGxldCBudW0gPSBpbnZvaWNlLmludm9pY2VOdW1iZXI7XG4gICAgaWYgKG51bS5zdGFydHNXaXRoKFwiRFJBRlQtXCIpKSB7XG4gICAgICBudW0gPSBnZXROZXh0SW52b2ljZU51bWJlcihpbnZvaWNlLmN1c3RvbWVySWQpO1xuICAgIH1cbiAgICBkYi5leGVjdXRlKFwiQkVHSU5cIik7XG4gICAgdHJ5IHtcbiAgICAgIGRiLnF1ZXJ5KFxuICAgICAgICBcIlVQREFURSBpbnZvaWNlcyBTRVQgc3RhdHVzID0gJ3NlbnQnLCBpbnZvaWNlX251bWJlciA9ID8sIHVwZGF0ZWRfYXQgPSA/IFdIRVJFIGlkID0gP1wiLFxuICAgICAgICBbbnVtLCBub3csIGlkXSxcbiAgICAgICk7XG4gICAgICByZWNvcmRTdGF0dXNDaGFuZ2UoZGIsIGlkLCBcInNlbnRcIik7XG4gICAgICBkYi5leGVjdXRlKFwiQ09NTUlUXCIpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGRiLmV4ZWN1dGUoXCJST0xMQkFDS1wiKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvKiBpZ25vcmUgKi9cbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgc2hhcmVVcmwgPSBgJHtcbiAgICBEZW5vLmVudi5nZXQoXCJCQVNFX1VSTFwiKSB8fCBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMFwiXG4gIH0vYXBpL3YxL3B1YmxpYy9pbnZvaWNlcy8ke2ludm9pY2Uuc2hhcmVUb2tlbn1gO1xuXG4gIHJldHVybiB7XG4gICAgc2hhcmVUb2tlbjogaW52b2ljZS5zaGFyZVRva2VuLFxuICAgIHNoYXJlVXJsLFxuICB9O1xufTtcblxuZXhwb3J0IGNvbnN0IHVucHVibGlzaEludm9pY2UgPSBhc3luYyAoXG4gIGlkOiBzdHJpbmcsXG4pOiBQcm9taXNlPHsgc2hhcmVUb2tlbjogc3RyaW5nIH0+ID0+IHtcbiAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBnZXRJbnZvaWNlQnlJZChpZCk7XG4gIGlmICghZXhpc3RpbmcpIHRocm93IG5ldyBFcnJvcihcIkludm9pY2Ugbm90IGZvdW5kXCIpO1xuXG4gIC8vIE9ubHkgc2VudCBvciBvdmVyZHVlIGludm9pY2VzIGNhbiBiZSB1bnB1Ymxpc2hlZFxuICBpZiAoZXhpc3Rpbmcuc3RhdHVzICE9PSBcInNlbnRcIiAmJiBleGlzdGluZy5zdGF0dXMgIT09IFwib3ZlcmR1ZVwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT25seSBzZW50IG9yIG92ZXJkdWUgaW52b2ljZXMgY2FuIGJlIHVucHVibGlzaGVkLlwiKTtcbiAgfVxuXG4gIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgY29uc3QgbmV3VG9rZW4gPSBnZW5lcmF0ZVNoYXJlVG9rZW4oKTtcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgLy8gUm90YXRlIHNoYXJlIHRva2VuIHRvIGludmFsaWRhdGUgb2xkIHB1YmxpYyBsaW5rcyBhbmQgcmV2ZXJ0IGludm9pY2UgdG8gZHJhZnRcbiAgZGIuZXhlY3V0ZShcIkJFR0lOXCIpO1xuICB0cnkge1xuICAgIGRiLnF1ZXJ5KFxuICAgICAgXCJVUERBVEUgaW52b2ljZXMgU0VUIHNoYXJlX3Rva2VuID0gPywgc3RhdHVzID0gJ2RyYWZ0JywgdXBkYXRlZF9hdCA9ID8gV0hFUkUgaWQgPSA/XCIsXG4gICAgICBbbmV3VG9rZW4sIG5vdywgaWRdLFxuICAgICk7XG4gICAgcmVjb3JkU3RhdHVzQ2hhbmdlKGRiLCBpZCwgXCJkcmFmdFwiKTtcbiAgICBkYi5leGVjdXRlKFwiQ09NTUlUXCIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGRiLmV4ZWN1dGUoXCJST0xMQkFDS1wiKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIGlnbm9yZSAqL1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgcmV0dXJuIHsgc2hhcmVUb2tlbjogbmV3VG9rZW4gfTtcbn07XG5cbmV4cG9ydCBjb25zdCB2b2lkSW52b2ljZSA9IGFzeW5jIChpZDogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IHRydWUgfT4gPT4ge1xuICBjb25zdCBleGlzdGluZyA9IGF3YWl0IGdldEludm9pY2VCeUlkKGlkKTtcbiAgaWYgKCFleGlzdGluZykgdGhyb3cgbmV3IEVycm9yKFwiSW52b2ljZSBub3QgZm91bmRcIik7XG4gIGlmIChleGlzdGluZy5zdGF0dXMgPT09IFwidm9pZGVkXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZvaWNlIGlzIGFscmVhZHkgdm9pZGVkXCIpO1xuICB9XG4gIGlmIChleGlzdGluZy5zdGF0dXMgPT09IFwiZHJhZnRcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkRyYWZ0IGludm9pY2VzIGNhbm5vdCBiZSB2b2lkZWQuIERlbGV0ZSB0aGVtIGluc3RlYWQuXCIpO1xuICB9XG4gIGlmIChleGlzdGluZy5zdGF0dXMgPT09IFwicGFpZFwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJQYWlkIGludm9pY2VzIGNhbm5vdCBiZSB2b2lkZWQuIElzc3VlIGEgY3JlZGl0IG5vdGUgaW5zdGVhZC5cIixcbiAgICApO1xuICB9XG4gIGlmIChleGlzdGluZy5zdGF0dXMgPT09IFwiY29tcGxldGVcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiQ29tcGxldGUgaW52b2ljZXMgY2Fubm90IGJlIHZvaWRlZC4gSXNzdWUgYSBjcmVkaXQgbm90ZSBpbnN0ZWFkLlwiLFxuICAgICk7XG4gIH1cblxuICBjb25zdCBkYiA9IGdldERhdGFiYXNlKCk7XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gIGRiLmV4ZWN1dGUoXCJCRUdJTlwiKTtcbiAgdHJ5IHtcbiAgICBkYi5xdWVyeShcbiAgICAgIFwiVVBEQVRFIGludm9pY2VzIFNFVCBzdGF0dXMgPSAndm9pZGVkJywgdXBkYXRlZF9hdCA9ID8gV0hFUkUgaWQgPSA/XCIsXG4gICAgICBbbm93LCBpZF0sXG4gICAgKTtcbiAgICByZWNvcmRTdGF0dXNDaGFuZ2UoZGIsIGlkLCBcInZvaWRlZFwiKTtcbiAgICBkYi5leGVjdXRlKFwiQ09NTUlUXCIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGRiLmV4ZWN1dGUoXCJST0xMQkFDS1wiKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIGlnbm9yZSAqL1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xufTtcblxuLy8gSGVscGVyIGZ1bmN0aW9uc1xuZnVuY3Rpb24gbWFwUm93VG9JbnZvaWNlKHJvdzogdW5rbm93bltdKTogSW52b2ljZSB7XG4gIHJldHVybiB7XG4gICAgaWQ6IHJvd1swXSBhcyBzdHJpbmcsXG4gICAgaW52b2ljZU51bWJlcjogcm93WzFdIGFzIHN0cmluZyxcbiAgICBjdXN0b21lcklkOiByb3dbMl0gYXMgc3RyaW5nLFxuICAgIGlzc3VlRGF0ZTogbmV3IERhdGUocm93WzNdIGFzIHN0cmluZyksXG4gICAgZHVlRGF0ZTogcm93WzRdID8gbmV3IERhdGUocm93WzRdIGFzIHN0cmluZykgOiB1bmRlZmluZWQsXG4gICAgY3VycmVuY3k6IHJvd1s1XSBhcyBzdHJpbmcsXG4gICAgc3RhdHVzOiByb3dbNl0gYXNcbiAgICAgIHwgXCJkcmFmdFwiXG4gICAgICB8IFwic2VudFwiXG4gICAgICB8IFwiY29tcGxldGVcIlxuICAgICAgfCBcInBhaWRcIlxuICAgICAgfCBcIm92ZXJkdWVcIlxuICAgICAgfCBcInZvaWRlZFwiLFxuICAgIHN1YnRvdGFsOiByb3dbN10gYXMgbnVtYmVyLFxuICAgIGRpc2NvdW50QW1vdW50OiByb3dbOF0gYXMgbnVtYmVyLFxuICAgIGRpc2NvdW50UGVyY2VudGFnZTogcm93WzldIGFzIG51bWJlcixcbiAgICB0YXhSYXRlOiByb3dbMTBdIGFzIG51bWJlcixcbiAgICB0YXhBbW91bnQ6IHJvd1sxMV0gYXMgbnVtYmVyLFxuICAgIHRvdGFsOiByb3dbMTJdIGFzIG51bWJlcixcbiAgICBwYXltZW50VGVybXM6IHJvd1sxM10gYXMgc3RyaW5nLFxuICAgIG5vdGVzOiByb3dbMTRdIGFzIHN0cmluZyxcbiAgICBzaGFyZVRva2VuOiByb3dbMTVdIGFzIHN0cmluZyxcbiAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKHJvd1sxNl0gYXMgc3RyaW5nKSxcbiAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKHJvd1sxN10gYXMgc3RyaW5nKSxcbiAgICBwcmljZXNJbmNsdWRlVGF4OiBCb29sZWFuKHJvd1sxOF0gYXMgbnVtYmVyKSxcbiAgICByb3VuZGluZ01vZGU6IChyb3dbMTldIGFzIHN0cmluZykgfHwgXCJsaW5lXCIsXG4gICAgbG9jYWxlOiAocm93WzIwXSBhcyBzdHJpbmcpIHx8IHVuZGVmaW5lZCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXBwbHlEZXJpdmVkT3ZlcmR1ZTxcbiAgVCBleHRlbmRzIHsgc3RhdHVzOiBJbnZvaWNlW1wic3RhdHVzXCJdOyBkdWVEYXRlPzogRGF0ZSB9LFxuPihpbnY6IFQpOiBUIHtcbiAgaWYgKCFpbnYpIHJldHVybiBpbnY7XG4gIC8vIE9ubHkgc2VudCBpbnZvaWNlcyBjYW4gYmVjb21lIG92ZXJkdWU7IGRyYWZ0cyB3ZXJlIG5ldmVyIGlzc3VlZCBhbmRcbiAgLy8gcGFpZC92b2lkZWQvY29tcGxldGUgaW52b2ljZXMgYXJlIHNldHRsZWQuXG4gIGlmIChpbnYuc3RhdHVzICE9PSBcInNlbnRcIikgcmV0dXJuIGludjtcbiAgaWYgKCFpbnYuZHVlRGF0ZSkgcmV0dXJuIGludjtcbiAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBkZCA9IG5ldyBEYXRlKFxuICAgIGludi5kdWVEYXRlLmdldFVUQ0Z1bGxZZWFyKCksXG4gICAgaW52LmR1ZURhdGUuZ2V0VVRDTW9udGgoKSxcbiAgICBpbnYuZHVlRGF0ZS5nZXRVVENEYXRlKCksXG4gICk7XG4gIGNvbnN0IHRkID0gbmV3IERhdGUodG9kYXkuZ2V0RnVsbFllYXIoKSwgdG9kYXkuZ2V0TW9udGgoKSwgdG9kYXkuZ2V0RGF0ZSgpKTtcbiAgaWYgKGRkIDwgdGQpIHtcbiAgICAoaW52IGFzIHVua25vd24gYXMgeyBzdGF0dXM6IEludm9pY2VbXCJzdGF0dXNcIl0gfSkuc3RhdHVzID0gXCJvdmVyZHVlXCI7XG4gIH1cbiAgcmV0dXJuIGludjtcbn1cblxuZnVuY3Rpb24gZ2V0Q3VzdG9tZXJCeUlkKGlkOiBzdHJpbmcpIHtcbiAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpO1xuICBsZXQgcm93czogdW5rbm93bltdW10gPSBbXTtcbiAgdHJ5IHtcbiAgICByb3dzID0gZGIucXVlcnkoXG4gICAgICBcIlNFTEVDVCBpZCwgbmFtZSwgY29udGFjdF9uYW1lLCBlbWFpbCwgcGhvbmUsIGFkZHJlc3MsIGNvdW50cnlfY29kZSwgdGF4X2lkLCBjcmVhdGVkX2F0LCBjaXR5LCBwb3N0YWxfY29kZSwgcmVnaW9uIEZST00gY3VzdG9tZXJzIFdIRVJFIGlkID0gP1wiLFxuICAgICAgW2lkXSxcbiAgICApIGFzIHVua25vd25bXVtdO1xuICB9IGNhdGNoIChfZSkge1xuICAgIC8vIEZhbGxiYWNrIG9sZGVyIHNjaGVtYSB3aXRob3V0IGNvbnRhY3RfbmFtZS9jaXR5L3Bvc3RhbF9jb2RlL3JlZ2lvblxuICAgIHRyeSB7XG4gICAgICByb3dzID0gZGIucXVlcnkoXG4gICAgICAgIFwiU0VMRUNUIGlkLCBuYW1lLCBlbWFpbCwgcGhvbmUsIGFkZHJlc3MsIGNvdW50cnlfY29kZSwgdGF4X2lkLCBjcmVhdGVkX2F0LCBjaXR5LCBwb3N0YWxfY29kZSBGUk9NIGN1c3RvbWVycyBXSEVSRSBpZCA9ID9cIixcbiAgICAgICAgW2lkXSxcbiAgICAgICkgYXMgdW5rbm93bltdW107XG4gICAgfSBjYXRjaCAoX2UyKSB7XG4gICAgICByb3dzID0gZGIucXVlcnkoXG4gICAgICAgIFwiU0VMRUNUIGlkLCBuYW1lLCBlbWFpbCwgcGhvbmUsIGFkZHJlc3MsIGNvdW50cnlfY29kZSwgdGF4X2lkLCBjcmVhdGVkX2F0IEZST00gY3VzdG9tZXJzIFdIRVJFIGlkID0gP1wiLFxuICAgICAgICBbaWRdLFxuICAgICAgKSBhcyB1bmtub3duW11bXTtcbiAgICB9XG4gIH1cbiAgaWYgKHJvd3MubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcbiAgY29uc3Qgcm93ID0gcm93c1swXSBhcyB1bmtub3duW107XG4gIHJldHVybiB7XG4gICAgaWQ6IHJvd1swXSBhcyBzdHJpbmcsXG4gICAgbmFtZTogcm93WzFdIGFzIHN0cmluZyxcbiAgICBjb250YWN0TmFtZTogKHJvd1syXSA/PyB1bmRlZmluZWQpIGFzIHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBlbWFpbDogKHJvd1szXSA/PyB1bmRlZmluZWQpIGFzIHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBwaG9uZTogKHJvd1s0XSA/PyB1bmRlZmluZWQpIGFzIHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBhZGRyZXNzOiAocm93WzVdID8/IHVuZGVmaW5lZCkgYXMgc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIGNvdW50cnlDb2RlOiAocm93WzZdID8/IHVuZGVmaW5lZCkgYXMgc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIHRheElkOiAocm93WzddID8/IHVuZGVmaW5lZCkgYXMgc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUocm93WzhdIGFzIHN0cmluZyksXG4gICAgY2l0eTogKHJvd1s5XSA/PyB1bmRlZmluZWQpIGFzIHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBwb3N0YWxDb2RlOiAocm93WzEwXSA/PyB1bmRlZmluZWQpIGFzIHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICByZWdpb246IChyb3dbMTFdID8/IHVuZGVmaW5lZCkgYXMgc3RyaW5nIHwgdW5kZWZpbmVkLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRTZXR0aW5ncygpIHtcbiAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpO1xuICBjb25zdCByZXN1bHRzID0gZGIucXVlcnkoXCJTRUxFQ1Qga2V5LCB2YWx1ZSBGUk9NIHNldHRpbmdzXCIpO1xuICBjb25zdCBzZXR0aW5nczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuXG4gIGZvciAoY29uc3Qgcm93IG9mIHJlc3VsdHMpIHtcbiAgICBjb25zdCBba2V5LCB2YWx1ZV0gPSByb3cgYXMgW3N0cmluZywgc3RyaW5nXTtcbiAgICBzZXR0aW5nc1trZXldID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gc2V0dGluZ3M7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FDRSxzQkFBc0IsRUFDdEIsMEJBQTBCLEVBQzFCLFdBQVcsRUFDWCxvQkFBb0IsUUFDZixzQkFBc0I7QUFDN0IsU0FBUyxVQUFVLFFBQVEsZ0JBQWdCO0FBQzNDLFNBQVMsY0FBYyxRQUFRLGdCQUFnQjtBQUMvQyxTQUFTLDZCQUE2QixRQUFRLDBCQUEwQjtBQVN4RSxTQUFTLGtCQUFrQixFQUFFLFlBQVksUUFBUSxtQkFB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
// denoCacheMetadata=6734896147145346714,9868729938400613368