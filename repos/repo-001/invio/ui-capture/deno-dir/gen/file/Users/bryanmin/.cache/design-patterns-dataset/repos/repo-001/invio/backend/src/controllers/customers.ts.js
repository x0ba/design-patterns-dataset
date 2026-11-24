import { getDatabase } from "../database/init.ts";
import { generateUUID } from "../utils/uuid.ts";
const mapRowToCustomer = (row)=>({
    id: row[0],
    name: row[1],
    contactName: row[2] ?? undefined,
    email: row[3] ?? undefined,
    phone: row[4] ?? undefined,
    address: row[5] ?? undefined,
    countryCode: row[6] ?? undefined,
    taxId: row[7] ?? undefined,
    createdAt: new Date(row[8]),
    // Optional city/postal_code/customer_number/region columns if present at the end
    city: row[9] ?? undefined,
    postalCode: row[10] ?? undefined,
    customerNumber: row[11] ?? undefined,
    region: row[12] ?? undefined
  });
export const getCustomers = ()=>{
  const db = getDatabase();
  // Select with optional columns city, postal_code if exist; SQLite will ignore missing columns in SELECT list only by error, so use PRAGMA to detect
  let results = [];
  try {
    results = db.query("SELECT id, name, contact_name, email, phone, address, country_code, tax_id, created_at, city, postal_code, customer_number, region FROM customers ORDER BY created_at DESC");
  } catch (_e) {
    // fallback older schema
    try {
      results = db.query("SELECT id, name, email, phone, address, country_code, tax_id, created_at, city, postal_code FROM customers ORDER BY created_at DESC");
    } catch (_e2) {
      results = db.query("SELECT id, name, email, phone, address, country_code, tax_id, created_at FROM customers ORDER BY created_at DESC");
    }
  }
  return results.map((row)=>mapRowToCustomer(row));
};
export const getCustomerById = (id)=>{
  const db = getDatabase();
  let results = [];
  try {
    results = db.query("SELECT id, name, contact_name, email, phone, address, country_code, tax_id, created_at, city, postal_code, customer_number, region FROM customers WHERE id = ?", [
      id
    ]);
  } catch (_e) {
    try {
      results = db.query("SELECT id, name, email, phone, address, country_code, tax_id, created_at, city, postal_code FROM customers WHERE id = ?", [
        id
      ]);
    } catch (_e2) {
      results = db.query("SELECT id, name, email, phone, address, country_code, tax_id, created_at FROM customers WHERE id = ?", [
        id
      ]);
    }
  }
  if (results.length === 0) return null;
  return mapRowToCustomer(results[0]);
};
const toNullable = (v)=>{
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};
const nextCustomerNumber = (db)=>{
  const rows = db.query("SELECT COALESCE(MAX(customer_number), 0) FROM customers");
  return Number(rows[0][0]) + 1;
};
export const createCustomer = (data)=>{
  const db = getDatabase();
  const customerId = generateUUID();
  const now = new Date();
  const customerNumber = nextCustomerNumber(db);
  // Normalize optional fields: store NULLs for empty strings
  const contactName = toNullable(data.contactName);
  const email = toNullable(data.email);
  const phone = toNullable(data.phone);
  const address = toNullable(data.address);
  const countryCode = toNullable(data.countryCode);
  const city = toNullable(data.city);
  const postal = toNullable(data.postalCode);
  const region = toNullable(data.region);
  const taxId = toNullable(data.taxId);
  try {
    db.query(`
      INSERT INTO customers (id, name, contact_name, email, phone, address, country_code, tax_id, created_at, city, postal_code, customer_number, region)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customerId,
      data.name,
      contactName,
      email,
      phone,
      address,
      countryCode,
      taxId,
      now,
      city,
      postal,
      customerNumber,
      region
    ]);
  } catch (_e) {
    // fallback older schema
    try {
      db.query(`
        INSERT INTO customers (id, name, email, phone, address, country_code, tax_id, created_at, city, postal_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customerId,
        data.name,
        email,
        phone,
        address,
        countryCode,
        taxId,
        now,
        city,
        postal
      ]);
    } catch (_e2) {
      db.query(`
        INSERT INTO customers (id, name, email, phone, address, country_code, tax_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customerId,
        data.name,
        email,
        phone,
        address,
        countryCode,
        taxId,
        now
      ]);
    }
  }
  // Return undefined for missing optional fields
  return {
    id: customerId,
    name: data.name,
    contactName: contactName ?? undefined,
    email: email ?? undefined,
    phone: phone ?? undefined,
    address: address ?? undefined,
    countryCode: countryCode ?? undefined,
    taxId: taxId ?? undefined,
    createdAt: now,
    city: city ?? undefined,
    postalCode: postal ?? undefined,
    region: region ?? undefined,
    customerNumber
  };
};
export const updateCustomer = (id, data)=>{
  const db = getDatabase();
  // Read existing to support partials and normalize empties
  const existing = getCustomerById(id);
  if (!existing) return null;
  const next = {
    name: data.name ?? existing.name,
    contactName: data.contactName === undefined ? existing.contactName : undefined,
    email: data.email === undefined ? existing.email : undefined,
    phone: data.phone === undefined ? existing.phone : undefined,
    address: data.address === undefined ? existing.address : undefined,
    taxId: data.taxId === undefined ? existing.taxId : undefined
  };
  // If provided, coerce empty to NULL
  const contactName = data.contactName !== undefined ? toNullable(data.contactName) : existing.contactName ?? null;
  const email = data.email !== undefined ? toNullable(data.email) : existing.email ?? null;
  const phone = data.phone !== undefined ? toNullable(data.phone) : existing.phone ?? null;
  const address = data.address !== undefined ? toNullable(data.address) : existing.address ?? null;
  const countryCode = data.countryCode !== undefined ? toNullable(data.countryCode) : existing.countryCode ?? null;
  const taxId = data.taxId !== undefined ? toNullable(data.taxId) : existing.taxId ?? null;
  const city = data.city !== undefined ? toNullable(data.city) : existing.city ?? null;
  const postal = data.postalCode !== undefined ? toNullable(data.postalCode) : existing.postalCode ?? null;
  const region = data.region !== undefined ? toNullable(data.region) : existing.region ?? null;
  try {
    db.query(`
      UPDATE customers SET
        name = ?, contact_name = ?, email = ?, phone = ?, address = ?, country_code = ?, tax_id = ?, city = ?, postal_code = ?, region = ?
      WHERE id = ?
    `, [
      next.name,
      contactName,
      email,
      phone,
      address,
      countryCode,
      taxId,
      city,
      postal,
      region,
      id
    ]);
  } catch (_e) {
    try {
      db.query(`
        UPDATE customers SET
          name = ?, email = ?, phone = ?, address = ?, country_code = ?, tax_id = ?, city = ?, postal_code = ?
        WHERE id = ?
      `, [
        next.name,
        email,
        phone,
        address,
        countryCode,
        taxId,
        city,
        postal,
        id
      ]);
    } catch (_e2) {
      db.query(`
        UPDATE customers SET
          name = ?, email = ?, phone = ?, address = ?, country_code = ?, tax_id = ?
        WHERE id = ?
      `, [
        next.name,
        email,
        phone,
        address,
        countryCode,
        taxId,
        id
      ]);
    }
  }
  return getCustomerById(id);
};
export function deleteCustomer(customerId) {
  try {
    const db = getDatabase();
    // First check if customer has any invoices
    const invoices = db.query(`
      SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?
    `, [
      customerId
    ]);
    const invoiceCount = invoices[0] ? Number(invoices[0][0]) : 0;
    if (invoiceCount > 0) {
      throw new Error(`Cannot delete customer: ${invoiceCount} invoice(s) exist for this customer. Delete invoices first.`);
    }
    // Delete customer if no invoices exist
    db.query(`DELETE FROM customers WHERE id = ?`, [
      customerId
    ]);
    if (getDatabase().changes === 0) {
      throw new Error("Customer not found");
    }
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL2NvbnRyb2xsZXJzL2N1c3RvbWVycy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBnZXREYXRhYmFzZSB9IGZyb20gXCIuLi9kYXRhYmFzZS9pbml0LnRzXCI7XG5pbXBvcnQgeyBDcmVhdGVDdXN0b21lclJlcXVlc3QsIEN1c3RvbWVyIH0gZnJvbSBcIi4uL3R5cGVzL2luZGV4LnRzXCI7XG5pbXBvcnQgeyBnZW5lcmF0ZVVVSUQgfSBmcm9tIFwiLi4vdXRpbHMvdXVpZC50c1wiO1xuXG5jb25zdCBtYXBSb3dUb0N1c3RvbWVyID0gKHJvdzogdW5rbm93bltdKTogQ3VzdG9tZXIgPT4gKHtcbiAgaWQ6IHJvd1swXSBhcyBzdHJpbmcsXG4gIG5hbWU6IHJvd1sxXSBhcyBzdHJpbmcsXG4gIGNvbnRhY3ROYW1lOiAocm93WzJdID8/IHVuZGVmaW5lZCkgYXMgc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBlbWFpbDogKHJvd1szXSA/PyB1bmRlZmluZWQpIGFzIHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgcGhvbmU6IChyb3dbNF0gPz8gdW5kZWZpbmVkKSBhcyBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIGFkZHJlc3M6IChyb3dbNV0gPz8gdW5kZWZpbmVkKSBhcyBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIGNvdW50cnlDb2RlOiAocm93WzZdID8/IHVuZGVmaW5lZCkgYXMgc3RyaW5nIHwgdW5kZWZpbmVkLFxuICB0YXhJZDogKHJvd1s3XSA/PyB1bmRlZmluZWQpIGFzIHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgY3JlYXRlZEF0OiBuZXcgRGF0ZShyb3dbOF0gYXMgc3RyaW5nKSxcbiAgLy8gT3B0aW9uYWwgY2l0eS9wb3N0YWxfY29kZS9jdXN0b21lcl9udW1iZXIvcmVnaW9uIGNvbHVtbnMgaWYgcHJlc2VudCBhdCB0aGUgZW5kXG4gIGNpdHk6IChyb3dbOV0gPz8gdW5kZWZpbmVkKSBhcyBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIHBvc3RhbENvZGU6IChyb3dbMTBdID8/IHVuZGVmaW5lZCkgYXMgc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBjdXN0b21lck51bWJlcjogKHJvd1sxMV0gPz8gdW5kZWZpbmVkKSBhcyBudW1iZXIgfCB1bmRlZmluZWQsXG4gIHJlZ2lvbjogKHJvd1sxMl0gPz8gdW5kZWZpbmVkKSBhcyBzdHJpbmcgfCB1bmRlZmluZWQsXG59KTtcblxuZXhwb3J0IGNvbnN0IGdldEN1c3RvbWVycyA9ICgpID0+IHtcbiAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpO1xuICAvLyBTZWxlY3Qgd2l0aCBvcHRpb25hbCBjb2x1bW5zIGNpdHksIHBvc3RhbF9jb2RlIGlmIGV4aXN0OyBTUUxpdGUgd2lsbCBpZ25vcmUgbWlzc2luZyBjb2x1bW5zIGluIFNFTEVDVCBsaXN0IG9ubHkgYnkgZXJyb3IsIHNvIHVzZSBQUkFHTUEgdG8gZGV0ZWN0XG4gIGxldCByZXN1bHRzOiB1bmtub3duW11bXSA9IFtdO1xuICB0cnkge1xuICAgIHJlc3VsdHMgPSBkYi5xdWVyeShcbiAgICAgIFwiU0VMRUNUIGlkLCBuYW1lLCBjb250YWN0X25hbWUsIGVtYWlsLCBwaG9uZSwgYWRkcmVzcywgY291bnRyeV9jb2RlLCB0YXhfaWQsIGNyZWF0ZWRfYXQsIGNpdHksIHBvc3RhbF9jb2RlLCBjdXN0b21lcl9udW1iZXIsIHJlZ2lvbiBGUk9NIGN1c3RvbWVycyBPUkRFUiBCWSBjcmVhdGVkX2F0IERFU0NcIixcbiAgICApIGFzIHVua25vd25bXVtdO1xuICB9IGNhdGNoIChfZSkge1xuICAgIC8vIGZhbGxiYWNrIG9sZGVyIHNjaGVtYVxuICAgIHRyeSB7XG4gICAgICByZXN1bHRzID0gZGIucXVlcnkoXG4gICAgICAgIFwiU0VMRUNUIGlkLCBuYW1lLCBlbWFpbCwgcGhvbmUsIGFkZHJlc3MsIGNvdW50cnlfY29kZSwgdGF4X2lkLCBjcmVhdGVkX2F0LCBjaXR5LCBwb3N0YWxfY29kZSBGUk9NIGN1c3RvbWVycyBPUkRFUiBCWSBjcmVhdGVkX2F0IERFU0NcIixcbiAgICAgICkgYXMgdW5rbm93bltdW107XG4gICAgfSBjYXRjaCAoX2UyKSB7XG4gICAgICByZXN1bHRzID0gZGIucXVlcnkoXG4gICAgICAgIFwiU0VMRUNUIGlkLCBuYW1lLCBlbWFpbCwgcGhvbmUsIGFkZHJlc3MsIGNvdW50cnlfY29kZSwgdGF4X2lkLCBjcmVhdGVkX2F0IEZST00gY3VzdG9tZXJzIE9SREVSIEJZIGNyZWF0ZWRfYXQgREVTQ1wiLFxuICAgICAgKSBhcyB1bmtub3duW11bXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHMubWFwKChyb3c6IHVua25vd25bXSkgPT4gbWFwUm93VG9DdXN0b21lcihyb3cpKTtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRDdXN0b21lckJ5SWQgPSAoaWQ6IHN0cmluZyk6IEN1c3RvbWVyIHwgbnVsbCA9PiB7XG4gIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgbGV0IHJlc3VsdHM6IHVua25vd25bXVtdID0gW107XG4gIHRyeSB7XG4gICAgcmVzdWx0cyA9IGRiLnF1ZXJ5KFxuICAgICAgXCJTRUxFQ1QgaWQsIG5hbWUsIGNvbnRhY3RfbmFtZSwgZW1haWwsIHBob25lLCBhZGRyZXNzLCBjb3VudHJ5X2NvZGUsIHRheF9pZCwgY3JlYXRlZF9hdCwgY2l0eSwgcG9zdGFsX2NvZGUsIGN1c3RvbWVyX251bWJlciwgcmVnaW9uIEZST00gY3VzdG9tZXJzIFdIRVJFIGlkID0gP1wiLFxuICAgICAgW2lkXSxcbiAgICApIGFzIHVua25vd25bXVtdO1xuICB9IGNhdGNoIChfZSkge1xuICAgIHRyeSB7XG4gICAgICByZXN1bHRzID0gZGIucXVlcnkoXG4gICAgICAgIFwiU0VMRUNUIGlkLCBuYW1lLCBlbWFpbCwgcGhvbmUsIGFkZHJlc3MsIGNvdW50cnlfY29kZSwgdGF4X2lkLCBjcmVhdGVkX2F0LCBjaXR5LCBwb3N0YWxfY29kZSBGUk9NIGN1c3RvbWVycyBXSEVSRSBpZCA9ID9cIixcbiAgICAgICAgW2lkXSxcbiAgICAgICkgYXMgdW5rbm93bltdW107XG4gICAgfSBjYXRjaCAoX2UyKSB7XG4gICAgICByZXN1bHRzID0gZGIucXVlcnkoXG4gICAgICAgIFwiU0VMRUNUIGlkLCBuYW1lLCBlbWFpbCwgcGhvbmUsIGFkZHJlc3MsIGNvdW50cnlfY29kZSwgdGF4X2lkLCBjcmVhdGVkX2F0IEZST00gY3VzdG9tZXJzIFdIRVJFIGlkID0gP1wiLFxuICAgICAgICBbaWRdLFxuICAgICAgKSBhcyB1bmtub3duW11bXTtcbiAgICB9XG4gIH1cbiAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIG1hcFJvd1RvQ3VzdG9tZXIocmVzdWx0c1swXSBhcyB1bmtub3duW10pO1xufTtcblxuY29uc3QgdG9OdWxsYWJsZSA9ICh2Pzogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCA9PiB7XG4gIGlmICh2ID09PSB1bmRlZmluZWQgfHwgdiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHMgPSBTdHJpbmcodikudHJpbSgpO1xuICByZXR1cm4gcy5sZW5ndGggPyBzIDogbnVsbDtcbn07XG5cbmNvbnN0IG5leHRDdXN0b21lck51bWJlciA9IChkYjogUmV0dXJuVHlwZTx0eXBlb2YgZ2V0RGF0YWJhc2U+KTogbnVtYmVyID0+IHtcbiAgY29uc3Qgcm93cyA9IGRiLnF1ZXJ5KFxuICAgIFwiU0VMRUNUIENPQUxFU0NFKE1BWChjdXN0b21lcl9udW1iZXIpLCAwKSBGUk9NIGN1c3RvbWVyc1wiLFxuICApIGFzIHVua25vd25bXVtdO1xuICByZXR1cm4gTnVtYmVyKChyb3dzWzBdIGFzIHVua25vd25bXSlbMF0pICsgMTtcbn07XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVDdXN0b21lciA9IChkYXRhOiBDcmVhdGVDdXN0b21lclJlcXVlc3QpOiBDdXN0b21lciA9PiB7XG4gIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgY29uc3QgY3VzdG9tZXJJZCA9IGdlbmVyYXRlVVVJRCgpO1xuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBjdXN0b21lck51bWJlciA9IG5leHRDdXN0b21lck51bWJlcihkYik7XG5cbiAgLy8gTm9ybWFsaXplIG9wdGlvbmFsIGZpZWxkczogc3RvcmUgTlVMTHMgZm9yIGVtcHR5IHN0cmluZ3NcbiAgY29uc3QgY29udGFjdE5hbWUgPSB0b051bGxhYmxlKGRhdGEuY29udGFjdE5hbWUpO1xuICBjb25zdCBlbWFpbCA9IHRvTnVsbGFibGUoZGF0YS5lbWFpbCk7XG4gIGNvbnN0IHBob25lID0gdG9OdWxsYWJsZShkYXRhLnBob25lKTtcbiAgY29uc3QgYWRkcmVzcyA9IHRvTnVsbGFibGUoZGF0YS5hZGRyZXNzKTtcbiAgY29uc3QgY291bnRyeUNvZGUgPSB0b051bGxhYmxlKGRhdGEuY291bnRyeUNvZGUpO1xuICBjb25zdCBjaXR5ID0gdG9OdWxsYWJsZSgoZGF0YSBhcyB7IGNpdHk/OiBzdHJpbmcgfSkuY2l0eSk7XG4gIGNvbnN0IHBvc3RhbCA9IHRvTnVsbGFibGUoKGRhdGEgYXMgeyBwb3N0YWxDb2RlPzogc3RyaW5nIH0pLnBvc3RhbENvZGUpO1xuICBjb25zdCByZWdpb24gPSB0b051bGxhYmxlKGRhdGEucmVnaW9uKTtcbiAgY29uc3QgdGF4SWQgPSB0b051bGxhYmxlKGRhdGEudGF4SWQpO1xuXG4gIHRyeSB7XG4gICAgZGIucXVlcnkoXG4gICAgICBgXG4gICAgICBJTlNFUlQgSU5UTyBjdXN0b21lcnMgKGlkLCBuYW1lLCBjb250YWN0X25hbWUsIGVtYWlsLCBwaG9uZSwgYWRkcmVzcywgY291bnRyeV9jb2RlLCB0YXhfaWQsIGNyZWF0ZWRfYXQsIGNpdHksIHBvc3RhbF9jb2RlLCBjdXN0b21lcl9udW1iZXIsIHJlZ2lvbilcbiAgICAgIFZBTFVFUyAoPywgPywgPywgPywgPywgPywgPywgPywgPywgPywgPywgPywgPylcbiAgICBgLFxuICAgICAgW1xuICAgICAgICBjdXN0b21lcklkLFxuICAgICAgICBkYXRhLm5hbWUsXG4gICAgICAgIGNvbnRhY3ROYW1lLFxuICAgICAgICBlbWFpbCxcbiAgICAgICAgcGhvbmUsXG4gICAgICAgIGFkZHJlc3MsXG4gICAgICAgIGNvdW50cnlDb2RlLFxuICAgICAgICB0YXhJZCxcbiAgICAgICAgbm93LFxuICAgICAgICBjaXR5LFxuICAgICAgICBwb3N0YWwsXG4gICAgICAgIGN1c3RvbWVyTnVtYmVyLFxuICAgICAgICByZWdpb24sXG4gICAgICBdLFxuICAgICk7XG4gIH0gY2F0Y2ggKF9lKSB7XG4gICAgLy8gZmFsbGJhY2sgb2xkZXIgc2NoZW1hXG4gICAgdHJ5IHtcbiAgICAgIGRiLnF1ZXJ5KFxuICAgICAgICBgXG4gICAgICAgIElOU0VSVCBJTlRPIGN1c3RvbWVycyAoaWQsIG5hbWUsIGVtYWlsLCBwaG9uZSwgYWRkcmVzcywgY291bnRyeV9jb2RlLCB0YXhfaWQsIGNyZWF0ZWRfYXQsIGNpdHksIHBvc3RhbF9jb2RlKVxuICAgICAgICBWQUxVRVMgKD8sID8sID8sID8sID8sID8sID8sID8sID8sID8pXG4gICAgICBgLFxuICAgICAgICBbXG4gICAgICAgICAgY3VzdG9tZXJJZCxcbiAgICAgICAgICBkYXRhLm5hbWUsXG4gICAgICAgICAgZW1haWwsXG4gICAgICAgICAgcGhvbmUsXG4gICAgICAgICAgYWRkcmVzcyxcbiAgICAgICAgICBjb3VudHJ5Q29kZSxcbiAgICAgICAgICB0YXhJZCxcbiAgICAgICAgICBub3csXG4gICAgICAgICAgY2l0eSxcbiAgICAgICAgICBwb3N0YWwsXG4gICAgICAgIF0sXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKF9lMikge1xuICAgICAgZGIucXVlcnkoXG4gICAgICAgIGBcbiAgICAgICAgSU5TRVJUIElOVE8gY3VzdG9tZXJzIChpZCwgbmFtZSwgZW1haWwsIHBob25lLCBhZGRyZXNzLCBjb3VudHJ5X2NvZGUsIHRheF9pZCwgY3JlYXRlZF9hdClcbiAgICAgICAgVkFMVUVTICg/LCA/LCA/LCA/LCA/LCA/LCA/LCA/KVxuICAgICAgYCxcbiAgICAgICAgW2N1c3RvbWVySWQsIGRhdGEubmFtZSwgZW1haWwsIHBob25lLCBhZGRyZXNzLCBjb3VudHJ5Q29kZSwgdGF4SWQsIG5vd10sXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybiB1bmRlZmluZWQgZm9yIG1pc3Npbmcgb3B0aW9uYWwgZmllbGRzXG4gIHJldHVybiB7XG4gICAgaWQ6IGN1c3RvbWVySWQsXG4gICAgbmFtZTogZGF0YS5uYW1lLFxuICAgIGNvbnRhY3ROYW1lOiBjb250YWN0TmFtZSA/PyB1bmRlZmluZWQsXG4gICAgZW1haWw6IGVtYWlsID8/IHVuZGVmaW5lZCxcbiAgICBwaG9uZTogcGhvbmUgPz8gdW5kZWZpbmVkLFxuICAgIGFkZHJlc3M6IGFkZHJlc3MgPz8gdW5kZWZpbmVkLFxuICAgIGNvdW50cnlDb2RlOiBjb3VudHJ5Q29kZSA/PyB1bmRlZmluZWQsXG4gICAgdGF4SWQ6IHRheElkID8/IHVuZGVmaW5lZCxcbiAgICBjcmVhdGVkQXQ6IG5vdyxcbiAgICBjaXR5OiBjaXR5ID8/IHVuZGVmaW5lZCxcbiAgICBwb3N0YWxDb2RlOiBwb3N0YWwgPz8gdW5kZWZpbmVkLFxuICAgIHJlZ2lvbjogcmVnaW9uID8/IHVuZGVmaW5lZCxcbiAgICBjdXN0b21lck51bWJlcixcbiAgfTtcbn07XG5cbmV4cG9ydCBjb25zdCB1cGRhdGVDdXN0b21lciA9IChcbiAgaWQ6IHN0cmluZyxcbiAgZGF0YTogUGFydGlhbDxDcmVhdGVDdXN0b21lclJlcXVlc3Q+LFxuKTogQ3VzdG9tZXIgfCBudWxsID0+IHtcbiAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpO1xuICAvLyBSZWFkIGV4aXN0aW5nIHRvIHN1cHBvcnQgcGFydGlhbHMgYW5kIG5vcm1hbGl6ZSBlbXB0aWVzXG4gIGNvbnN0IGV4aXN0aW5nID0gZ2V0Q3VzdG9tZXJCeUlkKGlkKTtcbiAgaWYgKCFleGlzdGluZykgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgbmV4dCA9IHtcbiAgICBuYW1lOiBkYXRhLm5hbWUgPz8gZXhpc3RpbmcubmFtZSxcbiAgICBjb250YWN0TmFtZTpcbiAgICAgIGRhdGEuY29udGFjdE5hbWUgPT09IHVuZGVmaW5lZCA/IGV4aXN0aW5nLmNvbnRhY3ROYW1lIDogdW5kZWZpbmVkLFxuICAgIGVtYWlsOiBkYXRhLmVtYWlsID09PSB1bmRlZmluZWQgPyBleGlzdGluZy5lbWFpbCA6IHVuZGVmaW5lZCxcbiAgICBwaG9uZTogZGF0YS5waG9uZSA9PT0gdW5kZWZpbmVkID8gZXhpc3RpbmcucGhvbmUgOiB1bmRlZmluZWQsXG4gICAgYWRkcmVzczogZGF0YS5hZGRyZXNzID09PSB1bmRlZmluZWQgPyBleGlzdGluZy5hZGRyZXNzIDogdW5kZWZpbmVkLFxuICAgIHRheElkOiBkYXRhLnRheElkID09PSB1bmRlZmluZWQgPyBleGlzdGluZy50YXhJZCA6IHVuZGVmaW5lZCxcbiAgfSBhcyBQYXJ0aWFsPEN1c3RvbWVyPjtcblxuICAvLyBJZiBwcm92aWRlZCwgY29lcmNlIGVtcHR5IHRvIE5VTExcbiAgY29uc3QgY29udGFjdE5hbWUgPVxuICAgIGRhdGEuY29udGFjdE5hbWUgIT09IHVuZGVmaW5lZFxuICAgICAgPyB0b051bGxhYmxlKGRhdGEuY29udGFjdE5hbWUpXG4gICAgICA6IChleGlzdGluZy5jb250YWN0TmFtZSA/PyBudWxsKTtcbiAgY29uc3QgZW1haWwgPVxuICAgIGRhdGEuZW1haWwgIT09IHVuZGVmaW5lZFxuICAgICAgPyB0b051bGxhYmxlKGRhdGEuZW1haWwpXG4gICAgICA6IChleGlzdGluZy5lbWFpbCA/PyBudWxsKTtcbiAgY29uc3QgcGhvbmUgPVxuICAgIGRhdGEucGhvbmUgIT09IHVuZGVmaW5lZFxuICAgICAgPyB0b051bGxhYmxlKGRhdGEucGhvbmUpXG4gICAgICA6IChleGlzdGluZy5waG9uZSA/PyBudWxsKTtcbiAgY29uc3QgYWRkcmVzcyA9XG4gICAgZGF0YS5hZGRyZXNzICE9PSB1bmRlZmluZWRcbiAgICAgID8gdG9OdWxsYWJsZShkYXRhLmFkZHJlc3MpXG4gICAgICA6IChleGlzdGluZy5hZGRyZXNzID8/IG51bGwpO1xuICBjb25zdCBjb3VudHJ5Q29kZSA9XG4gICAgZGF0YS5jb3VudHJ5Q29kZSAhPT0gdW5kZWZpbmVkXG4gICAgICA/IHRvTnVsbGFibGUoZGF0YS5jb3VudHJ5Q29kZSlcbiAgICAgIDogKGV4aXN0aW5nLmNvdW50cnlDb2RlID8/IG51bGwpO1xuICBjb25zdCB0YXhJZCA9XG4gICAgZGF0YS50YXhJZCAhPT0gdW5kZWZpbmVkXG4gICAgICA/IHRvTnVsbGFibGUoZGF0YS50YXhJZClcbiAgICAgIDogKGV4aXN0aW5nLnRheElkID8/IG51bGwpO1xuICBjb25zdCBjaXR5ID1cbiAgICAoZGF0YSBhcyB7IGNpdHk/OiBzdHJpbmcgfSkuY2l0eSAhPT0gdW5kZWZpbmVkXG4gICAgICA/IHRvTnVsbGFibGUoKGRhdGEgYXMgeyBjaXR5Pzogc3RyaW5nIH0pLmNpdHkpXG4gICAgICA6IChleGlzdGluZy5jaXR5ID8/IG51bGwpO1xuICBjb25zdCBwb3N0YWwgPVxuICAgIChkYXRhIGFzIHsgcG9zdGFsQ29kZT86IHN0cmluZyB9KS5wb3N0YWxDb2RlICE9PSB1bmRlZmluZWRcbiAgICAgID8gdG9OdWxsYWJsZSgoZGF0YSBhcyB7IHBvc3RhbENvZGU/OiBzdHJpbmcgfSkucG9zdGFsQ29kZSlcbiAgICAgIDogKGV4aXN0aW5nLnBvc3RhbENvZGUgPz8gbnVsbCk7XG4gIGNvbnN0IHJlZ2lvbiA9XG4gICAgZGF0YS5yZWdpb24gIT09IHVuZGVmaW5lZFxuICAgICAgPyB0b051bGxhYmxlKGRhdGEucmVnaW9uKVxuICAgICAgOiAoZXhpc3RpbmcucmVnaW9uID8/IG51bGwpO1xuXG4gIHRyeSB7XG4gICAgZGIucXVlcnkoXG4gICAgICBgXG4gICAgICBVUERBVEUgY3VzdG9tZXJzIFNFVFxuICAgICAgICBuYW1lID0gPywgY29udGFjdF9uYW1lID0gPywgZW1haWwgPSA/LCBwaG9uZSA9ID8sIGFkZHJlc3MgPSA/LCBjb3VudHJ5X2NvZGUgPSA/LCB0YXhfaWQgPSA/LCBjaXR5ID0gPywgcG9zdGFsX2NvZGUgPSA/LCByZWdpb24gPSA/XG4gICAgICBXSEVSRSBpZCA9ID9cbiAgICBgLFxuICAgICAgW1xuICAgICAgICBuZXh0Lm5hbWUsXG4gICAgICAgIGNvbnRhY3ROYW1lLFxuICAgICAgICBlbWFpbCxcbiAgICAgICAgcGhvbmUsXG4gICAgICAgIGFkZHJlc3MsXG4gICAgICAgIGNvdW50cnlDb2RlLFxuICAgICAgICB0YXhJZCxcbiAgICAgICAgY2l0eSxcbiAgICAgICAgcG9zdGFsLFxuICAgICAgICByZWdpb24sXG4gICAgICAgIGlkLFxuICAgICAgXSxcbiAgICApO1xuICB9IGNhdGNoIChfZSkge1xuICAgIHRyeSB7XG4gICAgICBkYi5xdWVyeShcbiAgICAgICAgYFxuICAgICAgICBVUERBVEUgY3VzdG9tZXJzIFNFVFxuICAgICAgICAgIG5hbWUgPSA/LCBlbWFpbCA9ID8sIHBob25lID0gPywgYWRkcmVzcyA9ID8sIGNvdW50cnlfY29kZSA9ID8sIHRheF9pZCA9ID8sIGNpdHkgPSA/LCBwb3N0YWxfY29kZSA9ID9cbiAgICAgICAgV0hFUkUgaWQgPSA/XG4gICAgICBgLFxuICAgICAgICBbXG4gICAgICAgICAgbmV4dC5uYW1lLFxuICAgICAgICAgIGVtYWlsLFxuICAgICAgICAgIHBob25lLFxuICAgICAgICAgIGFkZHJlc3MsXG4gICAgICAgICAgY291bnRyeUNvZGUsXG4gICAgICAgICAgdGF4SWQsXG4gICAgICAgICAgY2l0eSxcbiAgICAgICAgICBwb3N0YWwsXG4gICAgICAgICAgaWQsXG4gICAgICAgIF0sXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKF9lMikge1xuICAgICAgZGIucXVlcnkoXG4gICAgICAgIGBcbiAgICAgICAgVVBEQVRFIGN1c3RvbWVycyBTRVRcbiAgICAgICAgICBuYW1lID0gPywgZW1haWwgPSA/LCBwaG9uZSA9ID8sIGFkZHJlc3MgPSA/LCBjb3VudHJ5X2NvZGUgPSA/LCB0YXhfaWQgPSA/XG4gICAgICAgIFdIRVJFIGlkID0gP1xuICAgICAgYCxcbiAgICAgICAgW25leHQubmFtZSwgZW1haWwsIHBob25lLCBhZGRyZXNzLCBjb3VudHJ5Q29kZSwgdGF4SWQsIGlkXSxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGdldEN1c3RvbWVyQnlJZChpZCk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGVsZXRlQ3VzdG9tZXIoY3VzdG9tZXJJZDogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpO1xuXG4gICAgLy8gRmlyc3QgY2hlY2sgaWYgY3VzdG9tZXIgaGFzIGFueSBpbnZvaWNlc1xuICAgIGNvbnN0IGludm9pY2VzID0gZGIucXVlcnkoXG4gICAgICBgXG4gICAgICBTRUxFQ1QgQ09VTlQoKikgYXMgY291bnQgRlJPTSBpbnZvaWNlcyBXSEVSRSBjdXN0b21lcl9pZCA9ID9cbiAgICBgLFxuICAgICAgW2N1c3RvbWVySWRdLFxuICAgICk7XG5cbiAgICBjb25zdCBpbnZvaWNlQ291bnQgPSBpbnZvaWNlc1swXSA/IE51bWJlcihpbnZvaWNlc1swXVswXSkgOiAwO1xuXG4gICAgaWYgKGludm9pY2VDb3VudCA+IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYENhbm5vdCBkZWxldGUgY3VzdG9tZXI6ICR7aW52b2ljZUNvdW50fSBpbnZvaWNlKHMpIGV4aXN0IGZvciB0aGlzIGN1c3RvbWVyLiBEZWxldGUgaW52b2ljZXMgZmlyc3QuYCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gRGVsZXRlIGN1c3RvbWVyIGlmIG5vIGludm9pY2VzIGV4aXN0XG4gICAgZGIucXVlcnkoYERFTEVURSBGUk9NIGN1c3RvbWVycyBXSEVSRSBpZCA9ID9gLCBbY3VzdG9tZXJJZF0pO1xuICAgIGlmICgoZ2V0RGF0YWJhc2UoKSBhcyB1bmtub3duIGFzIHsgY2hhbmdlczogbnVtYmVyIH0pLmNoYW5nZXMgPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkN1c3RvbWVyIG5vdCBmb3VuZFwiKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIGRlbGV0aW5nIGN1c3RvbWVyOlwiLCBlcnJvcik7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLFdBQVcsUUFBUSxzQkFBc0I7QUFFbEQsU0FBUyxZQUFZLFFBQVEsbUJBQW1CO0FBRWhELE1BQU0sbUJBQW1CLENBQUMsTUFBNkIsQ0FBQztJQUN0RCxJQUFJLEdBQUcsQ0FBQyxFQUFFO0lBQ1YsTUFBTSxHQUFHLENBQUMsRUFBRTtJQUNaLGFBQWMsR0FBRyxDQUFDLEVBQUUsSUFBSTtJQUN4QixPQUFRLEdBQUcsQ0FBQyxFQUFFLElBQUk7SUFDbEIsT0FBUSxHQUFHLENBQUMsRUFBRSxJQUFJO0lBQ2xCLFNBQVUsR0FBRyxDQUFDLEVBQUUsSUFBSTtJQUNwQixhQUFjLEdBQUcsQ0FBQyxFQUFFLElBQUk7SUFDeEIsT0FBUSxHQUFHLENBQUMsRUFBRSxJQUFJO0lBQ2xCLFdBQVcsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFO0lBQzFCLGlGQUFpRjtJQUNqRixNQUFPLEdBQUcsQ0FBQyxFQUFFLElBQUk7SUFDakIsWUFBYSxHQUFHLENBQUMsR0FBRyxJQUFJO0lBQ3hCLGdCQUFpQixHQUFHLENBQUMsR0FBRyxJQUFJO0lBQzVCLFFBQVMsR0FBRyxDQUFDLEdBQUcsSUFBSTtFQUN0QixDQUFDO0FBRUQsT0FBTyxNQUFNLGVBQWU7RUFDMUIsTUFBTSxLQUFLO0VBQ1gsb0pBQW9KO0VBQ3BKLElBQUksVUFBdUIsRUFBRTtFQUM3QixJQUFJO0lBQ0YsVUFBVSxHQUFHLEtBQUssQ0FDaEI7RUFFSixF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
// denoCacheMetadata=12454682374200553590,16226415037986733574