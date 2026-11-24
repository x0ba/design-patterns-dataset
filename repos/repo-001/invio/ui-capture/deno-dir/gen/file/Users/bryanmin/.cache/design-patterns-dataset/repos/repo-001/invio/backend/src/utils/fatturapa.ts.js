// Generator for FatturaPA (Italian electronic invoice format)
// Based on PA.004.001.03 standard used in Italy
function xmlEscape(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}
function fmtDate(d) {
  if (!d) return undefined;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function decimals(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}
// Lines without taxes are not in the stored per-rate summary: add their base
// at 0% (net total minus the taxed bases) so the summary covers every line
function addUntaxedBase(rows, netTotal) {
  const r2 = (n)=>Math.round(n * 100) / 100;
  const base = r2(netTotal - rows.reduce((s, r)=>s + r.taxable, 0));
  const zero = rows.find((r)=>r.percent === 0);
  if (zero) zero.taxable = r2(zero.taxable + base);
  else rows.unshift({
    percent: 0,
    taxable: base,
    amount: 0
  });
}
function safeCurrency(biz, invCurrency) {
  return (invCurrency || biz?.currency || "EUR").toUpperCase();
}
// Validate and extract IBAN (must be 15-34 chars, alphanumeric only)
function extractIBAN(iban) {
  if (!iban) return "";
  const s = iban.trim().replace(/\s/g, "").toUpperCase();
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(s) && s.length >= 15 && s.length <= 34) {
    return s;
  }
  return "";
}
function extractVatId(taxId) {
  if (!taxId) return "00000000000";
  const s = taxId.trim().replace(/[^0-9]/g, "");
  if (s.length === 0) return "00000000000";
  if (s.length >= 11) return s.slice(0, 11);
  return s.padStart(11, "0");
}
function extractTaxCode(taxId) {
  if (!taxId) return "";
  const s = taxId.trim().toUpperCase();
  if (s.length === 16 && /^[A-Z0-9]{16}$/.test(s)) return s;
  return s.slice(0, 16);
}
function splitAddress(addr) {
  if (!addr) return {
    country: "IT"
  };
  const parts = addr.split(",").map((s)=>s.trim()).filter(Boolean);
  const out = {
    country: "IT"
  };
  if (parts.length > 0) {
    const streetParts = parts[0].split(/\s+/);
    if (streetParts.length > 1) {
      out.street = streetParts.slice(0, -1).join(" ");
      out.houseNum = streetParts[streetParts.length - 1];
    } else {
      out.street = parts[0];
    }
  }
  if (parts.length > 1) out.city = parts[1];
  if (parts.length > 2) {
    const tail = parts.slice(2).join(" ");
    const postalMatch = tail.match(/\b(\d{5})\b/);
    if (postalMatch) out.postal = postalMatch[1];
    const provMatch = tail.match(/\b([A-Z]{2})\b/);
    if (provMatch) out.province = provMatch[1];
  }
  return out;
}
function taxNatureId(rate) {
  if (rate === 0) return "N1";
  return "S";
}
export function generateFatturaXML(invoice, business, opts = {}) {
  const currency = safeCurrency(business, invoice.currency);
  const issueDate = fmtDate(invoice.issueDate) || fmtDate(new Date()) || "";
  const dueDate = fmtDate(invoice.dueDate) || issueDate;
  const sellerAddr = splitAddress(business.companyAddress);
  if (opts.sellerCountryCode) sellerAddr.country = opts.sellerCountryCode.toUpperCase();
  if (business.companyCountryCode) sellerAddr.country = business.companyCountryCode.toUpperCase();
  const buyerAddr = splitAddress(invoice.customer.address);
  if (opts.buyerCountryCode) buyerAddr.country = opts.buyerCountryCode.toUpperCase();
  if (invoice.customer.countryCode) buyerAddr.country = invoice.customer.countryCode.toUpperCase();
  const taxRate = Number(invoice.taxRate || 0);
  const taxAmount = Number(invoice.taxAmount || 0);
  // With prices including tax the subtotal is gross: the net is total - tax
  const taxableAmount = invoice.pricesIncludeTax ? Math.max(0, Math.round((Number(invoice.total || 0) - taxAmount) * 100) / 100) : Math.max(0, (invoice.subtotal || 0) - (invoice.discountAmount || 0));
  // With per-line taxes the invoice-level taxRate is 0: take each line's rate
  // and the stored per-rate summary instead (as Factur-X does)
  const hasLineTaxes = invoice.items.some((it)=>(it.taxes?.length || 0) > 0);
  const storedTaxes = hasLineTaxes ? invoice.taxes ?? [] : [];
  const lineSummary = storedTaxes.length > 0;
  const summary = lineSummary ? storedTaxes.map((t)=>({
      percent: Number(t.percent) || 0,
      taxable: Number(t.taxableAmount) || 0,
      amount: Number(t.taxAmount) || 0
    })) : [
    {
      percent: taxRate,
      taxable: taxableAmount,
      amount: taxAmount
    }
  ];
  if (lineSummary && invoice.items.some((it)=>!it.taxes?.length)) {
    addUntaxedBase(summary, Number(invoice.total || 0) - taxAmount);
  }
  const sellerVatId = extractVatId(business.companyTaxId);
  const buyerVatId = extractVatId(invoice.customer.taxId);
  const sellerCF = extractTaxCode(business.companyTaxId);
  const buyerCF = extractTaxCode(invoice.customer.taxId);
  const ibanClean = extractIBAN(business.bankAccount);
  const senderCode = opts.senderCode || "01234567890"; // default SDI sender code
  const transmissionFormat = (opts.transmissionFormat || "FPA12").toUpperCase();
  const headerXml = `
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${xmlEscape(senderCode)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>1</ProgressivoInvio>
  <FormatoTrasmissione>${xmlEscape(transmissionFormat)}</FormatoTrasmissione>
      <CodiceDestinatario>${opts.buyerIsPA ? "999999" : "AUTORIZ"}</CodiceDestinatario>
      <ContattiTrasmittente>
        ${business.companyEmail ? `<Email>${xmlEscape(business.companyEmail)}</Email>` : "<Email>info@company.it</Email>"}
      </ContattiTrasmittente>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${xmlEscape(sellerVatId || "00000000000")}</IdCodice>
        </IdFiscaleIVA>
        ${sellerCF ? `<CodiceFiscale>${xmlEscape(sellerCF)}</CodiceFiscale>` : ""}
        <Anagrafica>
          <Denominazione>${xmlEscape(business.companyName || "Company")}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${xmlEscape(sellerAddr.street || "Via Generica")}</Indirizzo>
        ${sellerAddr.houseNum ? `<NumeroCivico>${xmlEscape(sellerAddr.houseNum)}</NumeroCivico>` : "<NumeroCivico>1</NumeroCivico>"}
        <CAP>${xmlEscape(sellerAddr.postal || "00000")}</CAP>
        <Comune>${xmlEscape(sellerAddr.city || "Roma")}</Comune>
        ${sellerAddr.province ? `<Provincia>${xmlEscape(sellerAddr.province)}</Provincia>` : "<Provincia>RM</Provincia>"}
        <Nazione>${xmlEscape(sellerAddr.country || "IT")}</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${xmlEscape(buyerVatId)}</IdCodice>
        </IdFiscaleIVA>
        ${buyerCF && buyerCF !== buyerVatId ? `<CodiceFiscale>${xmlEscape(buyerCF)}</CodiceFiscale>` : ""}
        <Anagrafica>
          <Denominazione>${xmlEscape(invoice.customer.name || "Cliente")}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${xmlEscape(buyerAddr.street || "Via Generica")}</Indirizzo>
        ${buyerAddr.houseNum ? `<NumeroCivico>${xmlEscape(buyerAddr.houseNum)}</NumeroCivico>` : "<NumeroCivico>1</NumeroCivico>"}
        <CAP>${xmlEscape(buyerAddr.postal || "00000")}</CAP>
        <Comune>${xmlEscape(buyerAddr.city || "Roma")}</Comune>
        ${buyerAddr.province ? `<Provincia>${xmlEscape(buyerAddr.province)}</Provincia>` : "<Provincia>RM</Provincia>"}
        <Nazione>${xmlEscape(buyerAddr.country || "IT")}</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>`;
  const linesXml = invoice.items.map((item, idx)=>{
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice) || 0;
    const lineTotal = Number(item.lineTotal) || qty * unitPrice;
    const lineRate = hasLineTaxes ? Number(item.taxes?.[0]?.percent) || 0 : taxRate;
    return `
    <DettaglioLinee>
      <NumeroLinea>${idx + 1}</NumeroLinea>
      <Descrizione>${xmlEscape(item.description || "Servizio")}</Descrizione>
      <Quantita>${decimals(qty)}</Quantita>
      <UnitaMisura>PC</UnitaMisura>
      <PrezzoUnitario>${decimals(unitPrice)}</PrezzoUnitario>
      <PrezzoTotale>${decimals(lineTotal)}</PrezzoTotale>
      <AliquotaIVA>${decimals(lineRate)}</AliquotaIVA>
      <Natura>${taxNatureId(lineRate)}</Natura>
    </DettaglioLinee>`;
  }).join("");
  const datiBody = `
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>${xmlEscape(currency)}</Divisa>
        <Data>${issueDate}</Data>
        <Numero>${xmlEscape(invoice.invoiceNumber)}</Numero>
        <Causale>${xmlEscape(invoice.notes || "Fattura")}</Causale>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      ${linesXml}${summary.map((s)=>`
      <DatiRiepilogo>
        <AliquotaIVA>${decimals(s.percent)}</AliquotaIVA>
        <Natura>${taxNatureId(s.percent)}</Natura>
        <ImponibileImporto>${decimals(s.taxable)}</ImponibileImporto>
        <Imposta>${decimals(s.amount)}</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>`).join("")}
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>${ibanClean ? "MP05" : "MP23"}</ModalitaPagamento>
        <DataScadenzaPagamento>${dueDate}</DataScadenzaPagamento>
        <ImportoPagamento>${decimals(invoice.total)}</ImportoPagamento>
        ${ibanClean ? `<IBAN>${xmlEscape(ibanClean)}</IBAN>` : ""}
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <p:FatturaElettronica versione="${xmlEscape(transmissionFormat)}" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  ${headerXml}
  ${datiBody}
</p:FatturaElettronica>`;
  return xml;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL3V0aWxzL2ZhdHR1cmFwYS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBHZW5lcmF0b3IgZm9yIEZhdHR1cmFQQSAoSXRhbGlhbiBlbGVjdHJvbmljIGludm9pY2UgZm9ybWF0KVxuLy8gQmFzZWQgb24gUEEuMDA0LjAwMS4wMyBzdGFuZGFyZCB1c2VkIGluIEl0YWx5XG5pbXBvcnQgeyBCdXNpbmVzc1NldHRpbmdzLCBJbnZvaWNlV2l0aERldGFpbHMgfSBmcm9tIFwiLi4vdHlwZXMvaW5kZXgudHNcIjtcblxudHlwZSBNYXliZTxUPiA9IFQgfCB1bmRlZmluZWQgfCBudWxsO1xuXG5mdW5jdGlvbiB4bWxFc2NhcGUodjogTWF5YmU8c3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbj4pOiBzdHJpbmcge1xuICBpZiAodiA9PT0gdW5kZWZpbmVkIHx8IHYgPT09IG51bGwpIHJldHVybiBcIlwiO1xuICBjb25zdCBzID0gU3RyaW5nKHYpO1xuICByZXR1cm4gcy5yZXBsYWNlKC8mL2csIFwiJmFtcDtcIilcbiAgICAucmVwbGFjZSgvPC9nLCBcIiZsdDtcIilcbiAgICAucmVwbGFjZSgvPi9nLCBcIiZndDtcIilcbiAgICAucmVwbGFjZSgvXFxcIi9nLCBcIiZxdW90O1wiKVxuICAgIC5yZXBsYWNlKC8nL2csIFwiJmFwb3M7XCIpO1xufVxuXG5mdW5jdGlvbiBmbXREYXRlKGQ/OiBEYXRlKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCFkKSByZXR1cm4gdW5kZWZpbmVkO1xuICBjb25zdCB5eXl5ID0gZC5nZXRVVENGdWxsWWVhcigpO1xuICBjb25zdCBtbSA9IFN0cmluZyhkLmdldFVUQ01vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCBcIjBcIik7XG4gIGNvbnN0IGRkID0gU3RyaW5nKGQuZ2V0VVRDRGF0ZSgpKS5wYWRTdGFydCgyLCBcIjBcIik7XG4gIHJldHVybiBgJHt5eXl5fS0ke21tfS0ke2RkfWA7XG59XG5cbmZ1bmN0aW9uIGRlY2ltYWxzKG46IG51bWJlcik6IHN0cmluZyB7XG4gIHJldHVybiAoTWF0aC5yb3VuZChuICogMTAwKSAvIDEwMCkudG9GaXhlZCgyKTtcbn1cblxudHlwZSBUYXhTdW1tYXJ5Um93ID0geyBwZXJjZW50OiBudW1iZXI7IHRheGFibGU6IG51bWJlcjsgYW1vdW50OiBudW1iZXIgfTtcblxuLy8gTGluZXMgd2l0aG91dCB0YXhlcyBhcmUgbm90IGluIHRoZSBzdG9yZWQgcGVyLXJhdGUgc3VtbWFyeTogYWRkIHRoZWlyIGJhc2Vcbi8vIGF0IDAlIChuZXQgdG90YWwgbWludXMgdGhlIHRheGVkIGJhc2VzKSBzbyB0aGUgc3VtbWFyeSBjb3ZlcnMgZXZlcnkgbGluZVxuZnVuY3Rpb24gYWRkVW50YXhlZEJhc2Uocm93czogVGF4U3VtbWFyeVJvd1tdLCBuZXRUb3RhbDogbnVtYmVyKTogdm9pZCB7XG4gIGNvbnN0IHIyID0gKG46IG51bWJlcikgPT4gTWF0aC5yb3VuZChuICogMTAwKSAvIDEwMDtcbiAgY29uc3QgYmFzZSA9IHIyKG5ldFRvdGFsIC0gcm93cy5yZWR1Y2UoKHMsIHIpID0+IHMgKyByLnRheGFibGUsIDApKTtcbiAgY29uc3QgemVybyA9IHJvd3MuZmluZCgocikgPT4gci5wZXJjZW50ID09PSAwKTtcbiAgaWYgKHplcm8pIHplcm8udGF4YWJsZSA9IHIyKHplcm8udGF4YWJsZSArIGJhc2UpO1xuICBlbHNlIHJvd3MudW5zaGlmdCh7IHBlcmNlbnQ6IDAsIHRheGFibGU6IGJhc2UsIGFtb3VudDogMCB9KTtcbn1cblxuZnVuY3Rpb24gc2FmZUN1cnJlbmN5KGJpej86IEJ1c2luZXNzU2V0dGluZ3MsIGludkN1cnJlbmN5Pzogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIChpbnZDdXJyZW5jeSB8fCBiaXo/LmN1cnJlbmN5IHx8IFwiRVVSXCIpLnRvVXBwZXJDYXNlKCk7XG59XG5cbi8vIFZhbGlkYXRlIGFuZCBleHRyYWN0IElCQU4gKG11c3QgYmUgMTUtMzQgY2hhcnMsIGFscGhhbnVtZXJpYyBvbmx5KVxuZnVuY3Rpb24gZXh0cmFjdElCQU4oaWJhbj86IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghaWJhbikgcmV0dXJuIFwiXCI7XG4gIGNvbnN0IHMgPSBpYmFuLnRyaW0oKS5yZXBsYWNlKC9cXHMvZywgXCJcIikudG9VcHBlckNhc2UoKTtcbiAgaWYgKC9eW0EtWl17Mn1cXGR7Mn1bQS1aMC05XXsxLDMwfSQvLnRlc3QocykgJiYgcy5sZW5ndGggPj0gMTUgJiYgcy5sZW5ndGggPD0gMzQpIHtcbiAgICByZXR1cm4gcztcbiAgfVxuICByZXR1cm4gXCJcIjtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFZhdElkKHRheElkPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCF0YXhJZCkgcmV0dXJuIFwiMDAwMDAwMDAwMDBcIjtcbiAgY29uc3QgcyA9IHRheElkLnRyaW0oKS5yZXBsYWNlKC9bXjAtOV0vZywgXCJcIik7XG4gIGlmIChzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwiMDAwMDAwMDAwMDBcIjtcbiAgaWYgKHMubGVuZ3RoID49IDExKSByZXR1cm4gcy5zbGljZSgwLCAxMSk7XG4gIHJldHVybiBzLnBhZFN0YXJ0KDExLCBcIjBcIik7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RUYXhDb2RlKHRheElkPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCF0YXhJZCkgcmV0dXJuIFwiXCI7XG4gIGNvbnN0IHMgPSB0YXhJZC50cmltKCkudG9VcHBlckNhc2UoKTtcbiAgaWYgKHMubGVuZ3RoID09PSAxNiAmJiAvXltBLVowLTldezE2fSQvLnRlc3QocykpIHJldHVybiBzO1xuICByZXR1cm4gcy5zbGljZSgwLCAxNik7XG59XG5cbmZ1bmN0aW9uIHNwbGl0QWRkcmVzcyhhZGRyPzogc3RyaW5nKTogeyBcbiAgc3RyZWV0Pzogc3RyaW5nOyBcbiAgaG91c2VOdW0/OiBzdHJpbmc7IFxuICBjaXR5Pzogc3RyaW5nOyBcbiAgcG9zdGFsPzogc3RyaW5nOyBcbiAgcHJvdmluY2U/OiBzdHJpbmc7IFxuICBjb3VudHJ5Pzogc3RyaW5nO1xufSB7XG4gIGlmICghYWRkcikgcmV0dXJuIHsgY291bnRyeTogXCJJVFwiIH07XG4gIGNvbnN0IHBhcnRzID0gYWRkci5zcGxpdChcIixcIikubWFwKChzKSA9PiBzLnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pO1xuICBjb25zdCBvdXQ6IHsgXG4gICAgc3RyZWV0Pzogc3RyaW5nO1xuICAgIGhvdXNlTnVtPzogc3RyaW5nO1xuICAgIGNpdHk/OiBzdHJpbmc7XG4gICAgcG9zdGFsPzogc3RyaW5nO1xuICAgIHByb3ZpbmNlPzogc3RyaW5nO1xuICAgIGNvdW50cnk/OiBzdHJpbmc7XG4gIH0gPSB7IGNvdW50cnk6IFwiSVRcIiB9O1xuICBcbiAgaWYgKHBhcnRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBzdHJlZXRQYXJ0cyA9IHBhcnRzWzBdLnNwbGl0KC9cXHMrLyk7XG4gICAgaWYgKHN0cmVldFBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgIG91dC5zdHJlZXQgPSBzdHJlZXRQYXJ0cy5zbGljZSgwLCAtMSkuam9pbihcIiBcIik7XG4gICAgICBvdXQuaG91c2VOdW0gPSBzdHJlZXRQYXJ0c1tzdHJlZXRQYXJ0cy5sZW5ndGggLSAxXTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0LnN0cmVldCA9IHBhcnRzWzBdO1xuICAgIH1cbiAgfVxuICBcbiAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpIG91dC5jaXR5ID0gcGFydHNbMV07XG4gIFxuICBpZiAocGFydHMubGVuZ3RoID4gMikge1xuICAgIGNvbnN0IHRhaWwgPSBwYXJ0cy5zbGljZSgyKS5qb2luKFwiIFwiKTtcbiAgICBjb25zdCBwb3N0YWxNYXRjaCA9IHRhaWwubWF0Y2goL1xcYihcXGR7NX0pXFxiLyk7XG4gICAgaWYgKHBvc3RhbE1hdGNoKSBvdXQucG9zdGFsID0gcG9zdGFsTWF0Y2hbMV07XG4gICAgXG4gICAgY29uc3QgcHJvdk1hdGNoID0gdGFpbC5tYXRjaCgvXFxiKFtBLVpdezJ9KVxcYi8pO1xuICAgIGlmIChwcm92TWF0Y2gpIG91dC5wcm92aW5jZSA9IHByb3ZNYXRjaFsxXTtcbiAgfVxuICBcbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gdGF4TmF0dXJlSWQocmF0ZTogbnVtYmVyKTogc3RyaW5nIHtcbiAgaWYgKHJhdGUgPT09IDApIHJldHVybiBcIk4xXCI7XG4gIHJldHVybiBcIlNcIjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGYXR0dXJhWE1MT3B0aW9ucyB7XG4gIHNlbGxlckNvdW50cnlDb2RlPzogc3RyaW5nO1xuICBidXllckNvdW50cnlDb2RlPzogc3RyaW5nO1xuICBidXllcklzUEE/OiBib29sZWFuO1xuICBzZW5kZXJDb2RlPzogc3RyaW5nOyAvLyBJZFRyYXNtaXR0ZW50ZSBjb2RlXG4gIHRyYW5zbWlzc2lvbkZvcm1hdD86IHN0cmluZzsgLy8gZGVmYXVsdHMgdG8gRlBBMTJcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlRmF0dHVyYVhNTChcbiAgaW52b2ljZTogSW52b2ljZVdpdGhEZXRhaWxzLFxuICBidXNpbmVzczogQnVzaW5lc3NTZXR0aW5ncyxcbiAgb3B0czogRmF0dHVyYVhNTE9wdGlvbnMgPSB7fSxcbik6IHN0cmluZyB7XG4gIGNvbnN0IGN1cnJlbmN5ID0gc2FmZUN1cnJlbmN5KGJ1c2luZXNzLCBpbnZvaWNlLmN1cnJlbmN5KTtcbiAgY29uc3QgaXNzdWVEYXRlID0gZm10RGF0ZShpbnZvaWNlLmlzc3VlRGF0ZSkgfHwgZm10RGF0ZShuZXcgRGF0ZSgpKSB8fCBcIlwiO1xuICBjb25zdCBkdWVEYXRlID0gZm10RGF0ZShpbnZvaWNlLmR1ZURhdGUpIHx8IGlzc3VlRGF0ZTtcblxuICBjb25zdCBzZWxsZXJBZGRyID0gc3BsaXRBZGRyZXNzKGJ1c2luZXNzLmNvbXBhbnlBZGRyZXNzKTtcbiAgaWYgKG9wdHMuc2VsbGVyQ291bnRyeUNvZGUpIHNlbGxlckFkZHIuY291bnRyeSA9IG9wdHMuc2VsbGVyQ291bnRyeUNvZGUudG9VcHBlckNhc2UoKTtcbiAgaWYgKGJ1c2luZXNzLmNvbXBhbnlDb3VudHJ5Q29kZSkgc2VsbGVyQWRkci5jb3VudHJ5ID0gYnVzaW5lc3MuY29tcGFueUNvdW50cnlDb2RlLnRvVXBwZXJDYXNlKCk7XG5cbiAgY29uc3QgYnV5ZXJBZGRyID0gc3BsaXRBZGRyZXNzKGludm9pY2UuY3VzdG9tZXIuYWRkcmVzcyk7XG4gIGlmIChvcHRzLmJ1eWVyQ291bnRyeUNvZGUpIGJ1eWVyQWRkci5jb3VudHJ5ID0gb3B0cy5idXllckNvdW50cnlDb2RlLnRvVXBwZXJDYXNlKCk7XG4gIGlmIChpbnZvaWNlLmN1c3RvbWVyLmNvdW50cnlDb2RlKSBidXllckFkZHIuY291bnRyeSA9IGludm9pY2UuY3VzdG9tZXIuY291bnRyeUNvZGUudG9VcHBlckNhc2UoKTtcblxuICBjb25zdCB0YXhSYXRlID0gTnVtYmVyKGludm9pY2UudGF4UmF0ZSB8fCAwKTtcbiAgY29uc3QgdGF4QW1vdW50ID0gTnVtYmVyKGludm9pY2UudGF4QW1vdW50IHx8IDApO1xuICAvLyBXaXRoIHByaWNlcyBpbmNsdWRpbmcgdGF4IHRoZSBzdWJ0b3RhbCBpcyBncm9zczogdGhlIG5ldCBpcyB0b3RhbCAtIHRheFxuICBjb25zdCB0YXhhYmxlQW1vdW50ID0gaW52b2ljZS5wcmljZXNJbmNsdWRlVGF4XG4gICAgPyBNYXRoLm1heCgwLCBNYXRoLnJvdW5kKChOdW1iZXIoaW52b2ljZS50b3RhbCB8fCAwKSAtIHRheEFtb3VudCkgKiAxMDApIC8gMTAwKVxuICAgIDogTWF0aC5tYXgoMCwgKGludm9pY2Uuc3VidG90YWwgfHwgMCkgLSAoaW52b2ljZS5kaXNjb3VudEFtb3VudCB8fCAwKSk7XG5cbiAgLy8gV2l0aCBwZXItbGluZSB0YXhlcyB0aGUgaW52b2ljZS1sZXZlbCB0YXhSYXRlIGlzIDA6IHRha2UgZWFjaCBsaW5lJ3MgcmF0ZVxuICAvLyBhbmQgdGhlIHN0b3JlZCBwZXItcmF0ZSBzdW1tYXJ5IGluc3RlYWQgKGFzIEZhY3R1ci1YIGRvZXMpXG4gIGNvbnN0IGhhc0xpbmVUYXhlcyA9IGludm9pY2UuaXRlbXMuc29tZSgoaXQpID0+IChpdC50YXhlcz8ubGVuZ3RoIHx8IDApID4gMCk7XG4gIGNvbnN0IHN0b3JlZFRheGVzID0gaGFzTGluZVRheGVzID8gaW52b2ljZS50YXhlcyA/PyBbXSA6IFtdO1xuICBjb25zdCBsaW5lU3VtbWFyeSA9IHN0b3JlZFRheGVzLmxlbmd0aCA+IDA7XG4gIGNvbnN0IHN1bW1hcnkgPSBsaW5lU3VtbWFyeVxuICAgID8gc3RvcmVkVGF4ZXMubWFwKCh0KSA9PiAoe1xuICAgICAgcGVyY2VudDogTnVtYmVyKHQucGVyY2VudCkgfHwgMCxcbiAgICAgIHRheGFibGU6IE51bWJlcih0LnRheGFibGVBbW91bnQpIHx8IDAsXG4gICAgICBhbW91bnQ6IE51bWJlcih0LnRheEFtb3VudCkgfHwgMCxcbiAgICB9KSlcbiAgICA6IFt7IHBlcmNlbnQ6IHRheFJhdGUsIHRheGFibGU6IHRheGFibGVBbW91bnQsIGFtb3VudDogdGF4QW1vdW50IH1dO1xuICBpZiAobGluZVN1bW1hcnkgJiYgaW52b2ljZS5pdGVtcy5zb21lKChpdCkgPT4gIShpdC50YXhlcz8ubGVuZ3RoKSkpIHtcbiAgICBhZGRVbnRheGVkQmFzZShzdW1tYXJ5LCBOdW1iZXIoaW52b2ljZS50b3RhbCB8fCAwKSAtIHRheEFtb3VudCk7XG4gIH1cblxuICBjb25zdCBzZWxsZXJWYXRJZCA9IGV4dHJhY3RWYXRJZChidXNpbmVzcy5jb21wYW55VGF4SWQpO1xuICBjb25zdCBidXllclZhdElkID0gZXh0cmFjdFZhdElkKGludm9pY2UuY3VzdG9tZXIudGF4SWQpO1xuICBjb25zdCBzZWxsZXJDRiA9IGV4dHJhY3RUYXhDb2RlKGJ1c2luZXNzLmNvbXBhbnlUYXhJZCk7XG4gIGNvbnN0IGJ1eWVyQ0YgPSBleHRyYWN0VGF4Q29kZShpbnZvaWNlLmN1c3RvbWVyLnRheElkKTtcbiAgY29uc3QgaWJhbkNsZWFuID0gZXh0cmFjdElCQU4oYnVzaW5lc3MuYmFua0FjY291bnQpO1xuXG4gIGNvbnN0IHNlbmRlckNvZGUgPSBvcHRzLnNlbmRlckNvZGUgfHwgXCIwMTIzNDU2Nzg5MFwiOyAvLyBkZWZhdWx0IFNESSBzZW5kZXIgY29kZVxuICBjb25zdCB0cmFuc21pc3Npb25Gb3JtYXQgPSAob3B0cy50cmFuc21pc3Npb25Gb3JtYXQgfHwgXCJGUEExMlwiKS50b1VwcGVyQ2FzZSgpO1xuXG4gIGNvbnN0IGhlYWRlclhtbCA9IGBcbiAgPEZhdHR1cmFFbGV0dHJvbmljYUhlYWRlcj5cbiAgICA8RGF0aVRyYXNtaXNzaW9uZT5cbiAgICAgIDxJZFRyYXNtaXR0ZW50ZT5cbiAgICAgICAgPElkUGFlc2U+SVQ8L0lkUGFlc2U+XG4gICAgICAgIDxJZENvZGljZT4ke3htbEVzY2FwZShzZW5kZXJDb2RlKX08L0lkQ29kaWNlPlxuICAgICAgPC9JZFRyYXNtaXR0ZW50ZT5cbiAgICAgIDxQcm9ncmVzc2l2b0ludmlvPjE8L1Byb2dyZXNzaXZvSW52aW8+XG4gIDxGb3JtYXRvVHJhc21pc3Npb25lPiR7eG1sRXNjYXBlKHRyYW5zbWlzc2lvbkZvcm1hdCl9PC9Gb3JtYXRvVHJhc21pc3Npb25lPlxuICAgICAgPENvZGljZURlc3RpbmF0YXJpbz4ke29wdHMuYnV5ZXJJc1BBID8gXCI5OTk5OTlcIiA6IFwiQVVUT1JJWlwifTwvQ29kaWNlRGVzdGluYXRhcmlvPlxuICAgICAgPENvbnRhdHRpVHJhc21pdHRlbnRlPlxuICAgICAgICAke2J1c2luZXNzLmNvbXBhbnlFbWFpbCA/IGA8RW1haWw+JHt4bWxFc2NhcGUoYnVzaW5lc3MuY29tcGFueUVtYWlsKX08L0VtYWlsPmAgOiBcIjxFbWFpbD5pbmZvQGNvbXBhbnkuaXQ8L0VtYWlsPlwifVxuICAgICAgPC9Db250YXR0aVRyYXNtaXR0ZW50ZT5cbiAgICA8L0RhdGlUcmFzbWlzc2lvbmU+XG4gICAgPENlZGVudGVQcmVzdGF0b3JlPlxuICAgICAgPERhdGlBbmFncmFmaWNpPlxuICAgICAgICA8SWRGaXNjYWxlSVZBPlxuICAgICAgICAgIDxJZFBhZXNlPklUPC9JZFBhZXNlPlxuICAgICAgICAgIDxJZENvZGljZT4ke3htbEVzY2FwZShzZWxsZXJWYXRJZCB8fCBcIjAwMDAwMDAwMDAwXCIpfTwvSWRDb2RpY2U+XG4gICAgICAgIDwvSWRGaXNjYWxlSVZBPlxuICAgICAgICAke3NlbGxlckNGID8gYDxDb2RpY2VGaXNjYWxlPiR7eG1sRXNjYXBlKHNlbGxlckNGKX08L0NvZGljZUZpc2NhbGU+YCA6IFwiXCJ9XG4gICAgICAgIDxBbmFncmFmaWNhPlxuICAgICAgICAgIDxEZW5vbWluYXppb25lPiR7eG1sRXNjYXBlKGJ1c2luZXNzLmNvbXBhbnlOYW1lIHx8IFwiQ29tcGFueVwiKX08L0Rlbm9taW5hemlvbmU+XG4gICAgICAgIDwvQW5hZ3JhZmljYT5cbiAgICAgICAgPFJlZ2ltZUZpc2NhbGU+UkYwMTwvUmVnaW1lRmlzY2FsZT5cbiAgICAgIDwvRGF0aUFuYWdyYWZpY2k+XG4gICAgICA8U2VkZT5cbiAgICAgICAgPEluZGlyaXp6bz4ke3htbEVzY2FwZShzZWxsZXJBZGRyLnN0cmVldCB8fCBcIlZpYSBHZW5lcmljYVwiKX08L0luZGlyaXp6bz5cbiAgICAgICAgJHtzZWxsZXJBZGRyLmhvdXNlTnVtID8gYDxOdW1lcm9DaXZpY28+JHt4bWxFc2NhcGUoc2VsbGVyQWRkci5ob3VzZU51bSl9PC9OdW1lcm9DaXZpY28+YCA6IFwiPE51bWVyb0Npdmljbz4xPC9OdW1lcm9DaXZpY28+XCJ9XG4gICAgICAgIDxDQVA+JHt4bWxFc2NhcGUoc2VsbGVyQWRkci5wb3N0YWwgfHwgXCIwMDAwMFwiKX08L0NBUD5cbiAgICAgICAgPENvbXVuZT4ke3htbEVzY2FwZShzZWxsZXJBZGRyLmNpdHkgfHwgXCJSb21hXCIpfTwvQ29tdW5lPlxuICAgICAgICAke3NlbGxlckFkZHIucHJvdmluY2UgPyBgPFByb3ZpbmNpYT4ke3htbEVzY2FwZShzZWxsZXJBZGRyLnByb3ZpbmNlKX08L1Byb3ZpbmNpYT5gIDogXCI8UHJvdmluY2lhPlJNPC9Qcm92aW5jaWE+XCJ9XG4gICAgICAgIDxOYXppb25lPiR7eG1sRXNjYXBlKHNlbGxlckFkZHIuY291bnRyeSB8fCBcIklUXCIpfTwvTmF6aW9uZT5cbiAgICAgIDwvU2VkZT5cbiAgICA8L0NlZGVudGVQcmVzdGF0b3JlPlxuICAgIDxDZXNzaW9uYXJpb0NvbW1pdHRlbnRlPlxuICAgICAgPERhdGlBbmFncmFmaWNpPlxuICAgICAgICA8SWRGaXNjYWxlSVZBPlxuICAgICAgICAgIDxJZFBhZXNlPklUPC9JZFBhZXNlPlxuICAgICAgICAgIDxJZENvZGljZT4ke3htbEVzY2FwZShidXllclZhdElkKX08L0lkQ29kaWNlPlxuICAgICAgICA8L0lkRmlzY2FsZUlWQT5cbiAgICAgICAgJHtidXllckNGICYmIGJ1eWVyQ0YgIT09IGJ1eWVyVmF0SWQgPyBgPENvZGljZUZpc2NhbGU+JHt4bWxFc2NhcGUoYnV5ZXJDRil9PC9Db2RpY2VGaXNjYWxlPmAgOiBcIlwifVxuICAgICAgICA8QW5hZ3JhZmljYT5cbiAgICAgICAgICA8RGVub21pbmF6aW9uZT4ke3htbEVzY2FwZShpbnZvaWNlLmN1c3RvbWVyLm5hbWUgfHwgXCJDbGllbnRlXCIpfTwvRGVub21pbmF6aW9uZT5cbiAgICAgICAgPC9BbmFncmFmaWNhPlxuICAgICAgPC9EYXRpQW5hZ3JhZmljaT5cbiAgICAgIDxTZWRlPlxuICAgICAgICA8SW5kaXJpenpvPiR7eG1sRXNjYXBlKGJ1eWVyQWRkci5zdHJlZXQgfHwgXCJWaWEgR2VuZXJpY2FcIil9PC9JbmRpcml6em8+XG4gICAgICAgICR7YnV5ZXJBZGRyLmhvdXNlTnVtID8gYDxOdW1lcm9DaXZpY28+JHt4bWxFc2NhcGUoYnV5ZXJBZGRyLmhvdXNlTnVtKX08L051bWVyb0Npdmljbz5gIDogXCI8TnVtZXJvQ2l2aWNvPjE8L051bWVyb0Npdmljbz5cIn1cbiAgICAgICAgPENBUD4ke3htbEVzY2FwZShidXllckFkZHIucG9zdGFsIHx8IFwiMDAwMDBcIil9PC9DQVA+XG4gICAgICAgIDxDb211bmU+JHt4bWxFc2NhcGUoYnV5ZXJBZGRyLmNpdHkgfHwgXCJSb21hXCIpfTwvQ29tdW5lPlxuICAgICAgICAke2J1eWVyQWRkci5wcm92aW5jZSA/IGA8UHJvdmluY2lhPiR7eG1sRXNjYXBlKGJ1eWVyQWRkci5wcm92aW5jZSl9PC9Qcm92aW5jaWE+YCA6IFwiPFByb3ZpbmNpYT5STTwvUHJvdmluY2lhPlwifVxuICAgICAgICA8TmF6aW9uZT4ke3htbEVzY2FwZShidXllckFkZHIuY291bnRyeSB8fCBcIklUXCIpfTwvTmF6aW9uZT5cbiAgICAgIDwvU2VkZT5cbiAgICA8L0Nlc3Npb25hcmlvQ29tbWl0dGVudGU+XG4gIDwvRmF0dHVyYUVsZXR0cm9uaWNhSGVhZGVyPmA7XG5cbiAgY29uc3QgbGluZXNYbWwgPSBpbnZvaWNlLml0ZW1zLm1hcCgoaXRlbSwgaWR4KSA9PiB7XG4gICAgY29uc3QgcXR5ID0gTnVtYmVyKGl0ZW0ucXVhbnRpdHkpIHx8IDE7XG4gICAgY29uc3QgdW5pdFByaWNlID0gTnVtYmVyKGl0ZW0udW5pdFByaWNlKSB8fCAwO1xuICAgIGNvbnN0IGxpbmVUb3RhbCA9IE51bWJlcihpdGVtLmxpbmVUb3RhbCkgfHwgKHF0eSAqIHVuaXRQcmljZSk7XG4gICAgY29uc3QgbGluZVJhdGUgPSBoYXNMaW5lVGF4ZXNcbiAgICAgID8gTnVtYmVyKGl0ZW0udGF4ZXM/LlswXT8ucGVyY2VudCkgfHwgMFxuICAgICAgOiB0YXhSYXRlO1xuICAgIFxuICAgIHJldHVybiBgXG4gICAgPERldHRhZ2xpb0xpbmVlPlxuICAgICAgPE51bWVyb0xpbmVhPiR7aWR4ICsgMX08L051bWVyb0xpbmVhPlxuICAgICAgPERlc2NyaXppb25lPiR7eG1sRXNjYXBlKGl0ZW0uZGVzY3JpcHRpb24gfHwgXCJTZXJ2aXppb1wiKX08L0Rlc2NyaXppb25lPlxuICAgICAgPFF1YW50aXRhPiR7ZGVjaW1hbHMocXR5KX08L1F1YW50aXRhPlxuICAgICAgPFVuaXRhTWlzdXJhPlBDPC9Vbml0YU1pc3VyYT5cbiAgICAgIDxQcmV6em9Vbml0YXJpbz4ke2RlY2ltYWxzKHVuaXRQcmljZSl9PC9QcmV6em9Vbml0YXJpbz5cbiAgICAgIDxQcmV6em9Ub3RhbGU+JHtkZWNpbWFscyhsaW5lVG90YWwpfTwvUHJlenpvVG90YWxlPlxuICAgICAgPEFsaXF1b3RhSVZBPiR7ZGVjaW1hbHMobGluZVJhdGUpfTwvQWxpcXVvdGFJVkE+XG4gICAgICA8TmF0dXJhPiR7dGF4TmF0dXJlSWQobGluZVJhdGUpfTwvTmF0dXJhPlxuICAgIDwvRGV0dGFnbGlvTGluZWU+YDtcbiAgfSkuam9pbihcIlwiKTtcblxuICBjb25zdCBkYXRpQm9keSA9IGBcbiAgPEZhdHR1cmFFbGV0dHJvbmljYUJvZHk+XG4gICAgPERhdGlHZW5lcmFsaT5cbiAgICAgIDxEYXRpR2VuZXJhbGlEb2N1bWVudG8+XG4gICAgICAgIDxUaXBvRG9jdW1lbnRvPlREMDE8L1RpcG9Eb2N1bWVudG8+XG4gICAgICAgIDxEaXZpc2E+JHt4bWxFc2NhcGUoY3VycmVuY3kpfTwvRGl2aXNhPlxuICAgICAgICA8RGF0YT4ke2lzc3VlRGF0ZX08L0RhdGE+XG4gICAgICAgIDxOdW1lcm8+JHt4bWxFc2NhcGUoaW52b2ljZS5pbnZvaWNlTnVtYmVyKX08L051bWVybz5cbiAgICAgICAgPENhdXNhbGU+JHt4bWxFc2NhcGUoaW52b2ljZS5ub3RlcyB8fCBcIkZhdHR1cmFcIil9PC9DYXVzYWxlPlxuICAgICAgPC9EYXRpR2VuZXJhbGlEb2N1bWVudG8+XG4gICAgPC9EYXRpR2VuZXJhbGk+XG4gICAgPERhdGlCZW5pU2Vydml6aT5cbiAgICAgICR7bGluZXNYbWx9JHtzdW1tYXJ5Lm1hcCgocykgPT4gYFxuICAgICAgPERhdGlSaWVwaWxvZ28+XG4gICAgICAgIDxBbGlxdW90YUlWQT4ke2RlY2ltYWxzKHMucGVyY2VudCl9PC9BbGlxdW90YUlWQT5cbiAgICAgICAgPE5hdHVyYT4ke3RheE5hdHVyZUlkKHMucGVyY2VudCl9PC9OYXR1cmE+XG4gICAgICAgIDxJbXBvbmliaWxlSW1wb3J0bz4ke2RlY2ltYWxzKHMudGF4YWJsZSl9PC9JbXBvbmliaWxlSW1wb3J0bz5cbiAgICAgICAgPEltcG9zdGE+JHtkZWNpbWFscyhzLmFtb3VudCl9PC9JbXBvc3RhPlxuICAgICAgICA8RXNpZ2liaWxpdGFJVkE+STwvRXNpZ2liaWxpdGFJVkE+XG4gICAgICA8L0RhdGlSaWVwaWxvZ28+YCkuam9pbihcIlwiKX1cbiAgICA8L0RhdGlCZW5pU2Vydml6aT5cbiAgICA8RGF0aVBhZ2FtZW50bz5cbiAgICAgIDxDb25kaXppb25pUGFnYW1lbnRvPlRQMDI8L0NvbmRpemlvbmlQYWdhbWVudG8+XG4gICAgICA8RGV0dGFnbGlvUGFnYW1lbnRvPlxuICAgICAgICA8TW9kYWxpdGFQYWdhbWVudG8+JHtpYmFuQ2xlYW4gPyBcIk1QMDVcIiA6IFwiTVAyM1wifTwvTW9kYWxpdGFQYWdhbWVudG8+XG4gICAgICAgIDxEYXRhU2NhZGVuemFQYWdhbWVudG8+JHtkdWVEYXRlfTwvRGF0YVNjYWRlbnphUGFnYW1lbnRvPlxuICAgICAgICA8SW1wb3J0b1BhZ2FtZW50bz4ke2RlY2ltYWxzKGludm9pY2UudG90YWwpfTwvSW1wb3J0b1BhZ2FtZW50bz5cbiAgICAgICAgJHtpYmFuQ2xlYW4gPyBgPElCQU4+JHt4bWxFc2NhcGUoaWJhbkNsZWFuKX08L0lCQU4+YCA6IFwiXCJ9XG4gICAgICA8L0RldHRhZ2xpb1BhZ2FtZW50bz5cbiAgICA8L0RhdGlQYWdhbWVudG8+XG4gIDwvRmF0dHVyYUVsZXR0cm9uaWNhQm9keT5gO1xuXG4gIGNvbnN0IHhtbCA9IGA8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiPz5cbiAgPHA6RmF0dHVyYUVsZXR0cm9uaWNhIHZlcnNpb25lPVwiJHt4bWxFc2NhcGUodHJhbnNtaXNzaW9uRm9ybWF0KX1cIiB4bWxuczpwPVwiaHR0cDovL2l2YXNlcnZpemkuYWdlbnppYWVudHJhdGUuZ292Lml0L2RvY3MveHNkL2ZhdHR1cmUvdjEuMlwiIHhtbG5zOmRzPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnI1wiPlxuICAke2hlYWRlclhtbH1cbiAgJHtkYXRpQm9keX1cbjwvcDpGYXR0dXJhRWxldHRyb25pY2E+YDtcblxuICByZXR1cm4geG1sO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDhEQUE4RDtBQUM5RCxnREFBZ0Q7QUFLaEQsU0FBUyxVQUFVLENBQW1DO0VBQ3BELElBQUksTUFBTSxhQUFhLE1BQU0sTUFBTSxPQUFPO0VBQzFDLE1BQU0sSUFBSSxPQUFPO0VBQ2pCLE9BQU8sRUFBRSxPQUFPLENBQUMsTUFBTSxTQUNwQixPQUFPLENBQUMsTUFBTSxRQUNkLE9BQU8sQ0FBQyxNQUFNLFFBQ2QsT0FBTyxDQUFDLE9BQU8sVUFDZixPQUFPLENBQUMsTUFBTTtBQUNuQjtBQUVBLFNBQVMsUUFBUSxDQUFRO0VBQ3ZCLElBQUksQ0FBQyxHQUFHLE9BQU87RUFDZixNQUFNLE9BQU8sRUFBRSxjQUFjO0VBQzdCLE1BQU0sS0FBSyxPQUFPLEVBQUUsV0FBVyxLQUFLLEdBQUcsUUFBUSxDQUFDLEdBQUc7RUFDbkQsTUFBTSxLQUFLLE9BQU8sRUFBRSxVQUFVLElBQUksUUFBUSxDQUFDLEdBQUc7RUFDOUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUk7QUFDOUI7QUFFQSxTQUFTLFNBQVMsQ0FBUztFQUN6QixPQUFPLENBQUMsS0FBSyxLQUFLLENBQUMsSUFBSSxPQUFPLEdBQUcsRUFBRSxPQUFPLENBQUM7QUFDN0M7QUFJQSw2RUFBNkU7QUFDN0UsMkVBQTJFO0FBQzNFLFNBQVMsZUFBZSxJQUFxQixFQUFFLFFBQWdCO0VBQzdELE1BQU0sS0FBSyxDQUFDLElBQWMsS0FBSyxLQUFLLENBQUMsSUFBSSxPQUFPO0VBQ2hELE1BQU0sT0FBTyxHQUFHLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQU0sSUFBSSxFQUFFLE9BQU8sRUFBRTtFQUNoRSxNQUFNLE9BQU8sS0FBSyxJQUFJLENBQUMsQ0FBQyxJQUFNLEVBQUUsT0FBTyxLQUFLO0VBQzVDLElBQUksTUFBTSxLQUFLLE9BQU8sR0FBRyxHQUFHLEtBQUssT0FBTyxHQUFHO09BQ3RDLEtBQUssT0FBTyxDQUFDO0lBQUUsU0FBUztJQUFHLFNBQVM7SUFBTSxRQUFRO0VBQUU7QUFDM0Q7QUFFQSxTQUFTLGFBQWEsR0FBc0IsRUFBRSxXQUFvQjtFQUNoRSxPQUFPLENBQUMsZUFBZSxLQUFLLFlBQVksS0FBSyxFQUFFLFdBQVc7QUFDNUQ7QUFFQSxxRUFBcUU7QUFDckUsU0FBUyxZQUFZLElBQWE7RUFDaEMsSUFBSSxDQUFDLE1BQU0sT0FBTztFQUNsQixNQUFNLElBQUksS0FBSyxJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sSUFBSSxXQUFXO0VBQ3BELElBQUksZ0NBQWdDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxJQUFJLE1BQU0sRUFBRSxNQUFNLElBQUksSUFBSTtJQUMvRSxPQUFPO0VBQ1Q7RUFDQSxPQUFPO0FBQ1Q7QUFFQSxTQUFTLGFBQWEsS0FBYztFQUNsQyxJQUFJLENBQUMsT0FBTyxPQUFPO0VBQ25CLE1BQU0sSUFBSSxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsV0FBVztFQUMxQyxJQUFJLEVBQUUsTUFBTSxLQUFLLEdBQUcsT0FBTztFQUMzQixJQUFJLEVBQUUsTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFLEtBQUssQ0FBQyxHQUFHO0VBQ3RDLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSTtBQUN4QjtBQUVBLFNBQVMsZUFBZSxLQUFjO0VBQ3BDLElBQUksQ0FBQyxPQUFPLE9BQU87RUFDbkIsTUFBTSxJQUFJLE1BQU0sSUFBSSxHQUFHLFdBQVc7RUFDbEMsSUFBSSxFQUFFLE1BQU0sS0FBSyxNQUFNLGlCQUFpQixJQUFJLENBQUMsSUFBSSxPQUFPO0VBQ3hELE9BQU8sRUFBRSxLQUFLLENBQUMsR0FBRztBQUNwQjtBQUVBLFNBQVMsYUFBYSxJQUFhO0VBUWpDLElBQUksQ0FBQyxNQUFNLE9BQU87SUFBRSxTQUFTO0VBQUs7RUFDbEMsTUFBTSxRQUFRLEtBQUssS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBTSxFQUFFLElBQUksSUFBSSxNQUFNLENBQUM7RUFDMUQsTUFBTSxNQU9GO0lBQUUsU0FBUztFQUFLO0VBRXBCLElBQUksTUFBTSxNQUFNLEdBQUcsR0FBRztJQUNwQixNQUFNLGNBQWMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUM7SUFDbkMsSUFBSSxZQUFZLE1BQU0sR0FBRyxHQUFHO01BQzFCLElBQUksTUFBTSxHQUFHLFlBQVksS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztNQUMzQyxJQUFJLFFBQVEsR0FBRyxXQUFXLENBQUMsWUFBWSxNQUFNLEdBQUcsRUFBRTtJQUNwRCxPQUFPO01BQ0wsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLEVBQUU7SUFDdkI7RUFDRjtFQUVBLElBQUksTUFBTSxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRTtFQUV6QyxJQUFJLE1BQU0sTUFBTSxHQUFHLEdBQUc7SUFDcEIsTUFBTSxPQUFPLE1BQU0sS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ2pDLE1BQU0sY0FBYyxLQUFLLEtBQUssQ0FBQztJQUMvQixJQUFJLGFBQWEsSUFBSSxNQUFNLEdBQUcsV0FBVyxDQUFDLEVBQUU7SUFFNUMsTUFBTSxZQUFZLEtBQUssS0FBSyxDQUFDO0lBQzdCLElBQUksV0FBVyxJQUFJLFFBQVEsR0FBRyxTQUFTLENBQUMsRUFBRTtFQUM1QztFQUVBLE9BQU87QUFDVDtBQUVBLFNBQVMsWUFBWSxJQUFZO0VBQy9CLElBQUksU0FBUyxHQUFHLE9BQU87RUFDdkIsT0FBTztBQUNUO0FBVUEsT0FBTyxTQUFTLG1CQUNkLE9BQTJCLEVBQzNCLFFBQTBCLEVBQzFCLE9BQTBCLENBQUMsQ0FBQztFQUU1QixNQUFNLFdBQVcsYUFBYSxVQUFVLFFBQVEsUUFBUTtFQUN4RCxNQUFNLFlBQVksUUFBUSxRQUFRLFNBQVMsS0FBSyxRQUFRLElBQUksV0FBVztFQUN2RSxNQUFNLFVBQVUsUUFBUSxRQUFRLE9BQU8sS0FBSztFQUU1QyxNQUFNLGFBQWEsYUFBYSxTQUFTLGNBQWM7RUFDdkQsSUFBSSxLQUFLLGlCQUFpQixFQUFFLFdBQVcsT0FBTyxHQUFHLEtBQUssaUJBQWlCLENBQUMsV0FBVztFQUNuRixJQUFJLFNBQVMsa0JBQWtCLEVBQUUsV0FBVyxPQUFPLEdBQUcsU0FBUyxrQkFBa0IsQ0FBQyxXQUFXO0VBRTdGLE1BQU0sWUFBWSxhQUFhLFFBQVEsUUFBUSxDQUFDLE9BQU87RUFDdkQsSUFBSSxLQUFLLGdCQUFnQixFQUFFLFVBQVUsT0FBTyxHQUFHLEtBQUssZ0JBQWdCLENBQUMsV0FBVztFQUNoRixJQUFJLFFBQVEsUUFBUSxDQUFDLFdBQVcsRUFBRSxVQUFVLE9BQU8sR0FBRyxRQUFRLFFBQVEsQ0FBQyxXQUFXLENBQUMsV0FBVztFQUU5RixNQUFNLFVBQVUsT0FBTyxRQUFRLE9BQU8sSUFBSTtFQUMxQyxNQUFNLFlBQVksT0FBTyxRQUFRLFNBQVMsSUFBSTtFQUM5QywwRUFBMEU7RUFDMUUsTUFBTSxnQkFBZ0IsUUFBUSxnQkFBZ0IsR0FDMUMsS0FBSyxHQUFHLENBQUMsR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDLE9BQU8sUUFBUSxLQUFLLElBQUksS0FBSyxTQUFTLElBQUksT0FBTyxPQUN6RSxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxjQUFjLElBQUksQ0FBQztFQUV0RSw0RUFBNEU7RUFDNUUsNkRBQTZEO0VBQzdELE1BQU0sZUFBZSxRQUFRLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFPLENBQUMsR0FBRyxLQUFLLEVBQUUsVUFBVSxDQUFDLElBQUk7RUFDMUUsTUFBTSxjQUFjLGVBQWUsUUFBUSxLQUFLLElBQUksRUFBRSxHQUFHLEVBQUU7RUFDM0QsTUFBTSxjQUFjLFlBQVksTUFBTSxHQUFHO0VBQ3pDLE1BQU0sVUFBVSxjQUNaLFlBQVksR0FBRyxDQUFDLENBQUMsSUFBTSxDQUFDO01BQ3hCLFNBQVMsT0FBTyxFQUFFLE9BQU8sS0FBSztNQUM5QixTQUFTLE9BQU8sRUFBRSxhQUFhLEtBQUs7TUFDcEMsUUFBUSxPQUFPLEVBQUUsU0FBUyxLQUFLO0lBQ2pDLENBQUMsS0FDQztJQUFDO01BQUUsU0FBUztNQUFTLFNBQVM7TUFBZSxRQUFRO0lBQVU7R0FBRTtFQUNyRSxJQUFJLGVBQWUsUUFBUSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBTyxDQUFFLEdBQUcsS0FBSyxFQUFFLFNBQVU7SUFDbEUsZUFBZSxTQUFTLE9BQU8sUUFBUSxLQUFLLElBQUksS0FBSztFQUN2RDtFQUVBLE1BQU0sY0FBYyxhQUFhLFNBQVMsWUFBWTtFQUN0RCxNQUFNLGFBQWEsYUFBYSxRQUFRLFFBQVEsQ0FBQyxLQUFLO0VBQ3RELE1BQU0sV0FBVyxlQUFlLFNBQVMsWUFBWTtFQUNyRCxNQUFNLFVBQVUsZUFBZSxRQUFRLFFBQVEsQ0FBQyxLQUFLO0VBQ3JELE1BQU0sWUFBWSxZQUFZLFNBQVMsV0FBVztFQUVsRCxNQUFNLGFBQWEsS0FBSyxVQUFVLElBQUksZUFBZSwwQkFBMEI7RUFDL0UsTUFBTSxxQkFBcUIsQ0FBQyxLQUFLLGtCQUFrQixJQUFJLE9BQU8sRUFBRSxXQUFXO0VBRTNFLE1BQU0sWUFBWSxDQUFDOzs7OztrQkFLSCxFQUFFLFVBQVUsWUFBWTs7O3VCQUduQixFQUFFLFVBQVUsb0JBQW9COzBCQUM3QixFQUFFLEtBQUssU0FBUyxHQUFHLFdBQVcsVUFBVTs7UUFFMUQsRUFBRSxTQUFTLFlBQVksR0FBRyxDQUFDLE9BQU8sRUFBRSxVQUFVLFNBQVMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxHQUFHLGlDQUFpQzs7Ozs7OztvQkFPdEcsRUFBRSxVQUFVLGVBQWUsZUFBZTs7UUFFdEQsRUFBRSxXQUFXLENBQUMsZUFBZSxFQUFFLFVBQVUsVUFBVSxnQkFBZ0IsQ0FBQyxHQUFHLEdBQUc7O3lCQUV6RCxFQUFFLFVBQVUsU0FBUyxXQUFXLElBQUksV0FBVzs7Ozs7bUJBS3JELEVBQUUsVUFBVSxXQUFXLE1BQU0sSUFBSSxnQkFBZ0I7UUFDNUQsRUFBRSxXQUFXLFFBQVEsR0FBRyxDQUFDLGNBQWMsRUFBRSxVQUFVLFdBQVcsUUFBUSxFQUFFLGVBQWUsQ0FBQyxHQUFHLGlDQUFpQzthQUN2SCxFQUFFLFVBQVUsV0FBVyxNQUFNLElBQUksU0FBUztnQkFDdkMsRUFBRSxVQUFVLFdBQVcsSUFBSSxJQUFJLFFBQVE7UUFDL0MsRUFBRSxXQUFXLFFBQVEsR0FBRyxDQUFDLFdBQVcsRUFBRSxVQUFVLFdBQVcsUUFBUSxFQUFFLFlBQVksQ0FBQyxHQUFHLDRCQUE0QjtpQkFDeEcsRUFBRSxVQUFVLFdBQVcsT0FBTyxJQUFJLE1BQU07Ozs7Ozs7b0JBT3JDLEVBQUUsVUFBVSxZQUFZOztRQUVwQyxFQUFFLFdBQVcsWUFBWSxhQUFhLENBQUMsZUFBZSxFQUFFLFVBQVUsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFHLEdBQUc7O3lCQUVqRixFQUFFLFVBQVUsUUFBUSxRQUFRLENBQUMsSUFBSSxJQUFJLFdBQVc7Ozs7bUJBSXRELEVBQUUsVUFBVSxVQUFVLE1BQU0sSUFBSSxnQkFBZ0I7UUFDM0QsRUFBRSxVQUFVLFFBQVEsR0FBRyxDQUFDLGNBQWMsRUFBRSxVQUFVLFVBQVUsUUFBUSxFQUFFLGVBQWUsQ0FBQyxHQUFHLGlDQUFpQzthQUNySCxFQUFFLFVBQVUsVUFBVSxNQUFNLElBQUksU0FBUztnQkFDdEMsRUFBRSxVQUFVLFVBQVUsSUFBSSxJQUFJLFFBQVE7UUFDOUMsRUFBRSxVQUFVLFFBQVEsR0FBRyxDQUFDLFdBQVcsRUFBRSxVQUFVLFVBQVUsUUFBUSxFQUFFLFlBQVksQ0FBQyxHQUFHLDRCQUE0QjtpQkFDdEcsRUFBRSxVQUFVLFVBQVUsT0FBTyxJQUFJLE1BQU07Ozs2QkFHM0IsQ0FBQztFQUU1QixNQUFNLFdBQVcsUUFBUSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTTtJQUN4QyxNQUFNLE1BQU0sT0FBTyxLQUFLLFFBQVEsS0FBSztJQUNyQyxNQUFNLFlBQVksT0FBTyxLQUFLLFNBQVMsS0FBSztJQUM1QyxNQUFNLFlBQVksT0FBTyxLQUFLLFNBQVMsS0FBTSxNQUFNO0lBQ25ELE1BQU0sV0FBVyxlQUNiLE9BQU8sS0FBSyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsWUFBWSxJQUNwQztJQUVKLE9BQU8sQ0FBQzs7bUJBRU8sRUFBRSxNQUFNLEVBQUU7bUJBQ1YsRUFBRSxVQUFVLEtBQUssV0FBVyxJQUFJLFlBQVk7Z0JBQy9DLEVBQUUsU0FBUyxLQUFLOztzQkFFVixFQUFFLFNBQVMsV0FBVztvQkFDeEIsRUFBRSxTQUFTLFdBQVc7bUJBQ3ZCLEVBQUUsU0FBUyxVQUFVO2NBQzFCLEVBQUUsWUFBWSxVQUFVO3FCQUNqQixDQUFDO0VBQ3BCLEdBQUcsSUFBSSxDQUFDO0VBRVIsTUFBTSxXQUFXLENBQUM7Ozs7O2dCQUtKLEVBQUUsVUFBVSxVQUFVO2NBQ3hCLEVBQUUsVUFBVTtnQkFDVixFQUFFLFVBQVUsUUFBUSxhQUFhLEVBQUU7aUJBQ2xDLEVBQUUsVUFBVSxRQUFRLEtBQUssSUFBSSxXQUFXOzs7O01BSW5ELEVBQUUsV0FBVyxRQUFRLEdBQUcsQ0FBQyxDQUFDLElBQU0sQ0FBQzs7cUJBRWxCLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRTtnQkFDM0IsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFOzJCQUNkLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRTtpQkFDaEMsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFOztzQkFFaEIsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJOzs7OzsyQkFLUCxFQUFFLFlBQVksU0FBUyxPQUFPOytCQUMxQixFQUFFLFFBQVE7MEJBQ2YsRUFBRSxTQUFTLFFBQVEsS0FBSyxFQUFFO1FBQzVDLEVBQUUsWUFBWSxDQUFDLE1BQU0sRUFBRSxVQUFVLFdBQVcsT0FBTyxDQUFDLEdBQUcsR0FBRzs7OzJCQUd2QyxDQUFDO0VBRTFCLE1BQU0sTUFBTSxDQUFDO2tDQUNtQixFQUFFLFVBQVUsb0JBQW9CO0VBQ2hFLEVBQUUsVUFBVTtFQUNaLEVBQUUsU0FBUzt1QkFDVSxDQUFDO0VBRXRCLE9BQU87QUFDVCJ9
// denoCacheMetadata=18298902992079748054,12332716146197331203