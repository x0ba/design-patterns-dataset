// Generator for Factur-X / ZUGFeRD 2.2 BASIC profile
// Perfect for uncluttered, self-hosted invoicing without the bloat
function xmlEscape(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}
function fmtDateYYYYMMDD(d) {
  if (!d) return undefined;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}
function decimals(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}
function safeCurrency(biz, invCurrency) {
  return (invCurrency || biz?.currency || "EUR").toUpperCase();
}
function taxCategoryId(rate) {
  return rate > 0 ? "S" : "Z";
}
function splitAddressLines(address) {
  if (!address) return {};
  const parts = address.split(/\r?\n/).map((part)=>part.trim()).filter((part)=>part.length > 0);
  if (parts.length === 0) return {};
  const [lineOne, ...rest] = parts;
  const lineTwo = rest.length ? rest.join(", ") : undefined;
  // Simple heuristic: if lineTwo looks like "12345 City", try to extract it
  // This is a fallback if structured city/zip are missing
  let city;
  let zip;
  if (lineTwo && /^\d{4,5}\s+/.test(lineTwo)) {
    const m = lineTwo.match(/^(\d{4,5})\s+(.*)$/);
    if (m) {
      zip = m[1];
      city = m[2];
    }
  } else if (lineOne && /^\d{4,5}\s+/.test(lineOne)) {
  // Sometimes address is just one line: "Street 1, 12345 City"
  // But here we split by newline. If lineOne is "12345 City", it's weird.
  // Let's just leave it for now.
  }
  return {
    lineOne,
    lineTwo,
    city,
    zip
  };
}
function isLikelyVatId(v) {
  if (!v) return false;
  const s = v.trim();
  if (s.length < 3) return false;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return false; // looks like timestamp
  return /^[A-Za-z0-9][A-Za-z0-9\-\./ ]{1,30}$/.test(s);
}
export function generateFacturX22XML(invoice, business, opts = {}) {
  const currency = safeCurrency(business, invoice.currency);
  const issue = fmtDateYYYYMMDD(invoice.issueDate) || fmtDateYYYYMMDD(new Date()) || "";
  // EN16931 (COMFORT) profile - required for XRechnung compliance
  // EN16931 (COMFORT) profile - required for XRechnung compliance
  const profileUrn = "urn:cen.eu:en16931:2017";
  // With prices including tax the subtotal is gross: the net is total - tax
  const netTotal = invoice.pricesIncludeTax ? Math.max(0, Math.round(((invoice.total || 0) - (invoice.taxAmount || 0)) * 100) / 100) : Math.max(0, (invoice.subtotal || 0) - (invoice.discountAmount || 0));
  // Tax summary
  const taxes = invoice.taxes && invoice.taxes.length > 0 ? invoice.taxes.map((t)=>({
      percent: Number(t.percent) || 0,
      taxable: Number(t.taxableAmount) || 0,
      amount: Number(t.taxAmount) || 0
    })) : (invoice.taxAmount || 0) > 0 ? [
    {
      percent: Number(invoice.taxRate) || 0,
      taxable: netTotal,
      amount: Number(invoice.taxAmount) || 0
    }
  ] : [];
  const docContext = `
  <rsm:ExchangedDocumentContext>
    <ram:BusinessProcessSpecifiedDocumentContextParameter>
      <ram:ID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</ram:ID>
    </ram:BusinessProcessSpecifiedDocumentContextParameter>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${xmlEscape(profileUrn)}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>`;
  const docHeader = `
  <rsm:ExchangedDocument>
    <ram:ID>${xmlEscape(invoice.invoiceNumber)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${issue}</udt:DateTimeString></ram:IssueDateTime>
    ${invoice.notes ? `<ram:IncludedNote><ram:Content>${xmlEscape(invoice.notes)}</ram:Content></ram:IncludedNote>` : ""}
  </rsm:ExchangedDocument>`;
  // BASIC: Simplified seller party - only essential elements
  const sellerAddressLines = splitAddressLines(business.companyAddress);
  const sellerParty = `
    <ram:SellerTradeParty>
      <ram:Name>${xmlEscape(business.companyName)}</ram:Name>
      <ram:DefinedTradeContact>
        <ram:PersonName>${xmlEscape(business.companyName)}</ram:PersonName>
        <ram:TelephoneUniversalCommunication>
          <ram:CompleteNumber>${xmlEscape(business.companyPhone || "+49 000 000000")}</ram:CompleteNumber>
        </ram:TelephoneUniversalCommunication>
        <ram:EmailURIUniversalCommunication>
          <ram:URIID>${xmlEscape(business.companyEmail || "info@example.com")}</ram:URIID>
        </ram:EmailURIUniversalCommunication>
      </ram:DefinedTradeContact>
      <ram:PostalTradeAddress>
        ${business.companyPostalCode || sellerAddressLines.zip ? `<ram:PostcodeCode>${xmlEscape(business.companyPostalCode || sellerAddressLines.zip)}</ram:PostcodeCode>` : ""}
        ${sellerAddressLines.lineOne ? `<ram:LineOne>${xmlEscape(sellerAddressLines.lineOne)}</ram:LineOne>` : ""}
        ${sellerAddressLines.lineTwo ? `<ram:LineTwo>${xmlEscape(sellerAddressLines.lineTwo)}</ram:LineTwo>` : ""}
        ${business.companyCity || sellerAddressLines.city ? `<ram:CityName>${xmlEscape(business.companyCity || sellerAddressLines.city)}</ram:CityName>` : ""}
        <ram:CountryID>${xmlEscape(business.companyCountryCode || opts.sellerCountryCode || "DE")}</ram:CountryID>
      </ram:PostalTradeAddress>
      <ram:URIUniversalCommunication>
        <ram:URIID schemeID="0088">${xmlEscape(business.companyTaxId || "0000000000000")}</ram:URIID>
      </ram:URIUniversalCommunication>
      ${isLikelyVatId(business.companyTaxId) ? `
      <ram:SpecifiedTaxRegistration>
        <ram:ID schemeID="VA">${xmlEscape((business.companyCountryCode || opts.sellerCountryCode || "DE") + business.companyTaxId)}</ram:ID>
      </ram:SpecifiedTaxRegistration>` : ""}
    </ram:SellerTradeParty>`;
  // BASIC: Simplified buyer party - only essential elements
  const buyer = invoice.customer;
  const buyerAddressLines = splitAddressLines(buyer.address);
  const buyerParty = `
    <ram:BuyerTradeParty>
      <ram:Name>${xmlEscape(buyer.name)}</ram:Name>
      <ram:PostalTradeAddress>
        ${buyer.postalCode || buyerAddressLines.zip ? `<ram:PostcodeCode>${xmlEscape(buyer.postalCode || buyerAddressLines.zip)}</ram:PostcodeCode>` : ""}
        ${buyerAddressLines.lineOne ? `<ram:LineOne>${xmlEscape(buyerAddressLines.lineOne)}</ram:LineOne>` : ""}
        ${buyerAddressLines.lineTwo ? `<ram:LineTwo>${xmlEscape(buyerAddressLines.lineTwo)}</ram:LineTwo>` : ""}
        ${buyer.city || buyerAddressLines.city ? `<ram:CityName>${xmlEscape(buyer.city || buyerAddressLines.city)}</ram:CityName>` : ""}
        <ram:CountryID>${xmlEscape(buyer.countryCode || opts.buyerCountryCode || "DE")}</ram:CountryID>
        ${buyer.region ? `<ram:CountrySubDivisionName>${xmlEscape(buyer.region)}</ram:CountrySubDivisionName>` : ""}
      </ram:PostalTradeAddress>
      <ram:URIUniversalCommunication>
        <ram:URIID schemeID="0088">${xmlEscape(buyer.taxId || "0000000000000")}</ram:URIID>
      </ram:URIUniversalCommunication>
      ${isLikelyVatId(buyer.taxId) ? `
      <ram:SpecifiedTaxRegistration>
        <ram:ID schemeID="VA">${xmlEscape((buyer.countryCode || opts.buyerCountryCode || "DE") + buyer.taxId)}</ram:ID>
      </ram:SpecifiedTaxRegistration>` : ""}
    </ram:BuyerTradeParty>`;
  const headerAgreement = `
  <ram:ApplicableHeaderTradeAgreement>
    <ram:BuyerReference>${xmlEscape(invoice.customer.reference || "N/A")}</ram:BuyerReference>
    ${sellerParty}
    ${buyerParty}
    ${opts.orderReferenceId ? `<ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>${xmlEscape(opts.orderReferenceId)}</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>` : ""}
  </ram:ApplicableHeaderTradeAgreement>`;
  const paymentTerms = business.paymentTerms || invoice.paymentTerms;
  const headerTaxes = taxes.length > 0 ? taxes : [
    {
      percent: 0,
      taxable: Math.max(0, (invoice.subtotal || 0) - (invoice.discountAmount || 0)),
      amount: 0
    }
  ];
  // BASIC: Simplified settlement with correct element order
  const headerSettlement = `
  <ram:ApplicableHeaderTradeSettlement>
    <ram:InvoiceCurrencyCode>${xmlEscape(currency)}</ram:InvoiceCurrencyCode>
    ${business.bankAccount ? `
    <ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:TypeCode>58</ram:TypeCode>
      <ram:PayeePartyCreditorFinancialAccount>
        <ram:IBANID>${xmlEscape(business.bankAccount)}</ram:IBANID>
      </ram:PayeePartyCreditorFinancialAccount>
    </ram:SpecifiedTradeSettlementPaymentMeans>` : ""}
    ${headerTaxes.map((t)=>`
    <ram:ApplicableTradeTax>
      <ram:CalculatedAmount>${decimals(t.amount)}</ram:CalculatedAmount>
      <ram:TypeCode>VAT</ram:TypeCode>
      <ram:BasisAmount>${decimals(t.taxable)}</ram:BasisAmount>
      <ram:CategoryCode>${taxCategoryId(t.percent)}</ram:CategoryCode>
      <ram:RateApplicablePercent>${decimals(t.percent)}</ram:RateApplicablePercent>
    </ram:ApplicableTradeTax>`).join("")}
    ${paymentTerms ? `<ram:SpecifiedTradePaymentTerms><ram:Description>${xmlEscape(paymentTerms)}</ram:Description></ram:SpecifiedTradePaymentTerms>` : ""}
    <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
      <ram:LineTotalAmount>${decimals(invoice.subtotal)}</ram:LineTotalAmount>
      <ram:TaxBasisTotalAmount>${decimals(netTotal)}</ram:TaxBasisTotalAmount>
      <ram:TaxTotalAmount currencyID="${xmlEscape(currency)}">${decimals(invoice.taxAmount)}</ram:TaxTotalAmount>
      <ram:GrandTotalAmount>${decimals(invoice.total)}</ram:GrandTotalAmount>
      <ram:DuePayableAmount>${decimals(invoice.total)}</ram:DuePayableAmount>
    </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
  </ram:ApplicableHeaderTradeSettlement>`;
  // BASIC: Essential line items only
  const linesXml = invoice.items.map((it, idx)=>{
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.unitPrice) || 0;
    const lineTotal = Number(it.lineTotal) || qty * unit;
    const lineRate = it.taxes && it.taxes.length > 0 ? Number(it.taxes[0].percent) || 0 : Number(invoice.taxRate) || 0;
    return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${idx + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${xmlEscape(it.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${decimals(unit)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${decimals(qty)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${taxCategoryId(lineRate)}</ram:CategoryCode>
          <ram:RateApplicablePercent>${decimals(lineRate)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${decimals(lineTotal)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
  }).join("");
  // Correct element order for BASIC
  const trx = `
  <rsm:SupplyChainTradeTransaction>
    ${linesXml}
    ${headerAgreement}
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime><udt:DateTimeString format="102">${issue}</udt:DateTimeString></ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    ${headerSettlement}
  </rsm:SupplyChainTradeTransaction>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
  ${docContext}
  ${docHeader}
  ${trx}
</rsm:CrossIndustryInvoice>`;
  return xml;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL3V0aWxzL2ZhY3R1cngudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gR2VuZXJhdG9yIGZvciBGYWN0dXItWCAvIFpVR0ZlUkQgMi4yIEJBU0lDIHByb2ZpbGVcbi8vIFBlcmZlY3QgZm9yIHVuY2x1dHRlcmVkLCBzZWxmLWhvc3RlZCBpbnZvaWNpbmcgd2l0aG91dCB0aGUgYmxvYXRcbmltcG9ydCB7IEJ1c2luZXNzU2V0dGluZ3MsIEludm9pY2VXaXRoRGV0YWlscyB9IGZyb20gXCIuLi90eXBlcy9pbmRleC50c1wiO1xuXG50eXBlIE1heWJlPFQ+ID0gVCB8IHVuZGVmaW5lZCB8IG51bGw7XG5cbmZ1bmN0aW9uIHhtbEVzY2FwZSh2OiBNYXliZTxzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuPik6IHN0cmluZyB7XG4gIGlmICh2ID09PSB1bmRlZmluZWQgfHwgdiA9PT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gIGNvbnN0IHMgPSBTdHJpbmcodik7XG4gIHJldHVybiBzLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxuICAgIC5yZXBsYWNlKC88L2csIFwiJmx0O1wiKVxuICAgIC5yZXBsYWNlKC8+L2csIFwiJmd0O1wiKVxuICAgIC5yZXBsYWNlKC9cXFwiL2csIFwiJnF1b3Q7XCIpXG4gICAgLnJlcGxhY2UoLycvZywgXCImYXBvcztcIik7XG59XG5cbmZ1bmN0aW9uIGZtdERhdGVZWVlZTU1ERChkPzogRGF0ZSk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICghZCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY29uc3QgeXl5eSA9IGQuZ2V0VVRDRnVsbFllYXIoKTtcbiAgY29uc3QgbW0gPSBTdHJpbmcoZC5nZXRVVENNb250aCgpICsgMSkucGFkU3RhcnQoMiwgXCIwXCIpO1xuICBjb25zdCBkZCA9IFN0cmluZyhkLmdldFVUQ0RhdGUoKSkucGFkU3RhcnQoMiwgXCIwXCIpO1xuICByZXR1cm4gYCR7eXl5eX0ke21tfSR7ZGR9YDtcbn1cblxuZnVuY3Rpb24gZGVjaW1hbHMobjogbnVtYmVyKTogc3RyaW5nIHtcbiAgcmV0dXJuIChNYXRoLnJvdW5kKG4gKiAxMDApIC8gMTAwKS50b0ZpeGVkKDIpO1xufVxuXG5mdW5jdGlvbiBzYWZlQ3VycmVuY3koYml6PzogQnVzaW5lc3NTZXR0aW5ncywgaW52Q3VycmVuY3k/OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gKGludkN1cnJlbmN5IHx8IGJpej8uY3VycmVuY3kgfHwgXCJFVVJcIikudG9VcHBlckNhc2UoKTtcbn1cblxuZnVuY3Rpb24gdGF4Q2F0ZWdvcnlJZChyYXRlOiBudW1iZXIpOiBzdHJpbmcgeyBcbiAgcmV0dXJuIHJhdGUgPiAwID8gXCJTXCIgOiBcIlpcIjsgXG59XG5cbmZ1bmN0aW9uIHNwbGl0QWRkcmVzc0xpbmVzKGFkZHJlc3M/OiBzdHJpbmcpOiB7IGxpbmVPbmU/OiBzdHJpbmc7IGxpbmVUd28/OiBzdHJpbmc7IGNpdHk/OiBzdHJpbmc7IHppcD86IHN0cmluZyB9IHtcbiAgaWYgKCFhZGRyZXNzKSByZXR1cm4ge307XG4gIGNvbnN0IHBhcnRzID0gYWRkcmVzcy5zcGxpdCgvXFxyP1xcbi8pLm1hcCgocGFydCkgPT4gcGFydC50cmltKCkpLmZpbHRlcigocGFydCkgPT4gcGFydC5sZW5ndGggPiAwKTtcbiAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHt9O1xuICBjb25zdCBbbGluZU9uZSwgLi4ucmVzdF0gPSBwYXJ0cztcbiAgY29uc3QgbGluZVR3byA9IHJlc3QubGVuZ3RoID8gcmVzdC5qb2luKFwiLCBcIikgOiB1bmRlZmluZWQ7XG4gIFxuICAvLyBTaW1wbGUgaGV1cmlzdGljOiBpZiBsaW5lVHdvIGxvb2tzIGxpa2UgXCIxMjM0NSBDaXR5XCIsIHRyeSB0byBleHRyYWN0IGl0XG4gIC8vIFRoaXMgaXMgYSBmYWxsYmFjayBpZiBzdHJ1Y3R1cmVkIGNpdHkvemlwIGFyZSBtaXNzaW5nXG4gIGxldCBjaXR5OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGxldCB6aXA6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBpZiAobGluZVR3byAmJiAvXlxcZHs0LDV9XFxzKy8udGVzdChsaW5lVHdvKSkge1xuICAgICBjb25zdCBtID0gbGluZVR3by5tYXRjaCgvXihcXGR7NCw1fSlcXHMrKC4qKSQvKTtcbiAgICAgaWYgKG0pIHtcbiAgICAgICB6aXAgPSBtWzFdO1xuICAgICAgIGNpdHkgPSBtWzJdO1xuICAgICB9XG4gIH0gZWxzZSBpZiAobGluZU9uZSAmJiAvXlxcZHs0LDV9XFxzKy8udGVzdChsaW5lT25lKSkge1xuICAgICAvLyBTb21ldGltZXMgYWRkcmVzcyBpcyBqdXN0IG9uZSBsaW5lOiBcIlN0cmVldCAxLCAxMjM0NSBDaXR5XCJcbiAgICAgLy8gQnV0IGhlcmUgd2Ugc3BsaXQgYnkgbmV3bGluZS4gSWYgbGluZU9uZSBpcyBcIjEyMzQ1IENpdHlcIiwgaXQncyB3ZWlyZC5cbiAgICAgLy8gTGV0J3MganVzdCBsZWF2ZSBpdCBmb3Igbm93LlxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBsaW5lT25lLFxuICAgIGxpbmVUd28sXG4gICAgY2l0eSxcbiAgICB6aXAsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGlzTGlrZWx5VmF0SWQodj86IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAoIXYpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgcyA9IHYudHJpbSgpO1xuICBpZiAocy5sZW5ndGggPCAzKSByZXR1cm4gZmFsc2U7XG4gIGlmICgvXlxcZHs0fS1cXGR7Mn0tXFxkezJ9VFxcZHsyfTpcXGR7Mn0vLnRlc3QocykpIHJldHVybiBmYWxzZTsgLy8gbG9va3MgbGlrZSB0aW1lc3RhbXBcbiAgcmV0dXJuIC9eW0EtWmEtejAtOV1bQS1aYS16MC05XFwtXFwuLyBdezEsMzB9JC8udGVzdChzKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGYWN0dXJYT3B0aW9ucyB7XG4gIHNlbGxlckNvdW50cnlDb2RlPzogc3RyaW5nO1xuICBidXllckNvdW50cnlDb2RlPzogc3RyaW5nO1xuICBvcmRlclJlZmVyZW5jZUlkPzogc3RyaW5nOyAvLyBvcHRpb25hbFxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVGYWN0dXJYMjJYTUwoXG4gIGludm9pY2U6IEludm9pY2VXaXRoRGV0YWlscyxcbiAgYnVzaW5lc3M6IEJ1c2luZXNzU2V0dGluZ3MsXG4gIG9wdHM6IEZhY3R1clhPcHRpb25zID0ge30sXG4pOiBzdHJpbmcge1xuICBjb25zdCBjdXJyZW5jeSA9IHNhZmVDdXJyZW5jeShidXNpbmVzcywgaW52b2ljZS5jdXJyZW5jeSk7XG4gIGNvbnN0IGlzc3VlID0gZm10RGF0ZVlZWVlNTUREKGludm9pY2UuaXNzdWVEYXRlKSB8fCBmbXREYXRlWVlZWU1NREQobmV3IERhdGUoKSkgfHwgXCJcIjtcbiAgXG4gIC8vIEVOMTY5MzEgKENPTUZPUlQpIHByb2ZpbGUgLSByZXF1aXJlZCBmb3IgWFJlY2hudW5nIGNvbXBsaWFuY2VcbiAgLy8gRU4xNjkzMSAoQ09NRk9SVCkgcHJvZmlsZSAtIHJlcXVpcmVkIGZvciBYUmVjaG51bmcgY29tcGxpYW5jZVxuICBjb25zdCBwcm9maWxlVXJuID0gXCJ1cm46Y2VuLmV1OmVuMTY5MzE6MjAxN1wiO1xuXG4gIC8vIFdpdGggcHJpY2VzIGluY2x1ZGluZyB0YXggdGhlIHN1YnRvdGFsIGlzIGdyb3NzOiB0aGUgbmV0IGlzIHRvdGFsIC0gdGF4XG4gIGNvbnN0IG5ldFRvdGFsID0gaW52b2ljZS5wcmljZXNJbmNsdWRlVGF4XG4gICAgPyBNYXRoLm1heCgwLCBNYXRoLnJvdW5kKCgoaW52b2ljZS50b3RhbCB8fCAwKSAtIChpbnZvaWNlLnRheEFtb3VudCB8fCAwKSkgKiAxMDApIC8gMTAwKVxuICAgIDogTWF0aC5tYXgoMCwgKGludm9pY2Uuc3VidG90YWwgfHwgMCkgLSAoaW52b2ljZS5kaXNjb3VudEFtb3VudCB8fCAwKSk7XG5cbiAgLy8gVGF4IHN1bW1hcnlcbiAgY29uc3QgdGF4ZXMgPSAoaW52b2ljZS50YXhlcyAmJiBpbnZvaWNlLnRheGVzLmxlbmd0aCA+IDApXG4gICAgPyBpbnZvaWNlLnRheGVzLm1hcCgodCkgPT4gKHsgcGVyY2VudDogTnVtYmVyKHQucGVyY2VudCkgfHwgMCwgdGF4YWJsZTogTnVtYmVyKHQudGF4YWJsZUFtb3VudCkgfHwgMCwgYW1vdW50OiBOdW1iZXIodC50YXhBbW91bnQpIHx8IDAgfSkpXG4gICAgOiAoKGludm9pY2UudGF4QW1vdW50IHx8IDApID4gMCA/IFt7XG4gICAgICBwZXJjZW50OiBOdW1iZXIoaW52b2ljZS50YXhSYXRlKSB8fCAwLFxuICAgICAgdGF4YWJsZTogbmV0VG90YWwsXG4gICAgICBhbW91bnQ6IE51bWJlcihpbnZvaWNlLnRheEFtb3VudCkgfHwgMCxcbiAgICB9XSA6IFtdKTtcblxuICBjb25zdCBkb2NDb250ZXh0ID0gYFxuICA8cnNtOkV4Y2hhbmdlZERvY3VtZW50Q29udGV4dD5cbiAgICA8cmFtOkJ1c2luZXNzUHJvY2Vzc1NwZWNpZmllZERvY3VtZW50Q29udGV4dFBhcmFtZXRlcj5cbiAgICAgIDxyYW06SUQ+dXJuOmZkYzpwZXBwb2wuZXU6MjAxNzpwb2FjYzpiaWxsaW5nOjAxOjEuMDwvcmFtOklEPlxuICAgIDwvcmFtOkJ1c2luZXNzUHJvY2Vzc1NwZWNpZmllZERvY3VtZW50Q29udGV4dFBhcmFtZXRlcj5cbiAgICA8cmFtOkd1aWRlbGluZVNwZWNpZmllZERvY3VtZW50Q29udGV4dFBhcmFtZXRlcj5cbiAgICAgIDxyYW06SUQ+JHt4bWxFc2NhcGUocHJvZmlsZVVybil9PC9yYW06SUQ+XG4gICAgPC9yYW06R3VpZGVsaW5lU3BlY2lmaWVkRG9jdW1lbnRDb250ZXh0UGFyYW1ldGVyPlxuICA8L3JzbTpFeGNoYW5nZWREb2N1bWVudENvbnRleHQ+YDtcblxuICBjb25zdCBkb2NIZWFkZXIgPSBgXG4gIDxyc206RXhjaGFuZ2VkRG9jdW1lbnQ+XG4gICAgPHJhbTpJRD4ke3htbEVzY2FwZShpbnZvaWNlLmludm9pY2VOdW1iZXIpfTwvcmFtOklEPlxuICAgIDxyYW06VHlwZUNvZGU+MzgwPC9yYW06VHlwZUNvZGU+XG4gICAgPHJhbTpJc3N1ZURhdGVUaW1lPjx1ZHQ6RGF0ZVRpbWVTdHJpbmcgZm9ybWF0PVwiMTAyXCI+JHtpc3N1ZX08L3VkdDpEYXRlVGltZVN0cmluZz48L3JhbTpJc3N1ZURhdGVUaW1lPlxuICAgICR7aW52b2ljZS5ub3RlcyA/IGA8cmFtOkluY2x1ZGVkTm90ZT48cmFtOkNvbnRlbnQ+JHt4bWxFc2NhcGUoaW52b2ljZS5ub3Rlcyl9PC9yYW06Q29udGVudD48L3JhbTpJbmNsdWRlZE5vdGU+YCA6IFwiXCJ9XG4gIDwvcnNtOkV4Y2hhbmdlZERvY3VtZW50PmA7XG5cbiAgLy8gQkFTSUM6IFNpbXBsaWZpZWQgc2VsbGVyIHBhcnR5IC0gb25seSBlc3NlbnRpYWwgZWxlbWVudHNcbiAgY29uc3Qgc2VsbGVyQWRkcmVzc0xpbmVzID0gc3BsaXRBZGRyZXNzTGluZXMoYnVzaW5lc3MuY29tcGFueUFkZHJlc3MpO1xuICBjb25zdCBzZWxsZXJQYXJ0eSA9IGBcbiAgICA8cmFtOlNlbGxlclRyYWRlUGFydHk+XG4gICAgICA8cmFtOk5hbWU+JHt4bWxFc2NhcGUoYnVzaW5lc3MuY29tcGFueU5hbWUpfTwvcmFtOk5hbWU+XG4gICAgICA8cmFtOkRlZmluZWRUcmFkZUNvbnRhY3Q+XG4gICAgICAgIDxyYW06UGVyc29uTmFtZT4ke3htbEVzY2FwZShidXNpbmVzcy5jb21wYW55TmFtZSl9PC9yYW06UGVyc29uTmFtZT5cbiAgICAgICAgPHJhbTpUZWxlcGhvbmVVbml2ZXJzYWxDb21tdW5pY2F0aW9uPlxuICAgICAgICAgIDxyYW06Q29tcGxldGVOdW1iZXI+JHt4bWxFc2NhcGUoYnVzaW5lc3MuY29tcGFueVBob25lIHx8IFwiKzQ5IDAwMCAwMDAwMDBcIil9PC9yYW06Q29tcGxldGVOdW1iZXI+XG4gICAgICAgIDwvcmFtOlRlbGVwaG9uZVVuaXZlcnNhbENvbW11bmljYXRpb24+XG4gICAgICAgIDxyYW06RW1haWxVUklVbml2ZXJzYWxDb21tdW5pY2F0aW9uPlxuICAgICAgICAgIDxyYW06VVJJSUQ+JHt4bWxFc2NhcGUoYnVzaW5lc3MuY29tcGFueUVtYWlsIHx8IFwiaW5mb0BleGFtcGxlLmNvbVwiKX08L3JhbTpVUklJRD5cbiAgICAgICAgPC9yYW06RW1haWxVUklVbml2ZXJzYWxDb21tdW5pY2F0aW9uPlxuICAgICAgPC9yYW06RGVmaW5lZFRyYWRlQ29udGFjdD5cbiAgICAgIDxyYW06UG9zdGFsVHJhZGVBZGRyZXNzPlxuICAgICAgICAkeyhidXNpbmVzcy5jb21wYW55UG9zdGFsQ29kZSB8fCBzZWxsZXJBZGRyZXNzTGluZXMuemlwKSA/IGA8cmFtOlBvc3Rjb2RlQ29kZT4ke3htbEVzY2FwZShidXNpbmVzcy5jb21wYW55UG9zdGFsQ29kZSB8fCBzZWxsZXJBZGRyZXNzTGluZXMuemlwKX08L3JhbTpQb3N0Y29kZUNvZGU+YCA6IFwiXCJ9XG4gICAgICAgICR7c2VsbGVyQWRkcmVzc0xpbmVzLmxpbmVPbmUgPyBgPHJhbTpMaW5lT25lPiR7eG1sRXNjYXBlKHNlbGxlckFkZHJlc3NMaW5lcy5saW5lT25lKX08L3JhbTpMaW5lT25lPmAgOiBcIlwifVxuICAgICAgICAke3NlbGxlckFkZHJlc3NMaW5lcy5saW5lVHdvID8gYDxyYW06TGluZVR3bz4ke3htbEVzY2FwZShzZWxsZXJBZGRyZXNzTGluZXMubGluZVR3byl9PC9yYW06TGluZVR3bz5gIDogXCJcIn1cbiAgICAgICAgJHsoYnVzaW5lc3MuY29tcGFueUNpdHkgfHwgc2VsbGVyQWRkcmVzc0xpbmVzLmNpdHkpID8gYDxyYW06Q2l0eU5hbWU+JHt4bWxFc2NhcGUoYnVzaW5lc3MuY29tcGFueUNpdHkgfHwgc2VsbGVyQWRkcmVzc0xpbmVzLmNpdHkpfTwvcmFtOkNpdHlOYW1lPmAgOiBcIlwifVxuICAgICAgICA8cmFtOkNvdW50cnlJRD4ke3htbEVzY2FwZShidXNpbmVzcy5jb21wYW55Q291bnRyeUNvZGUgfHwgb3B0cy5zZWxsZXJDb3VudHJ5Q29kZSB8fCBcIkRFXCIpfTwvcmFtOkNvdW50cnlJRD5cbiAgICAgIDwvcmFtOlBvc3RhbFRyYWRlQWRkcmVzcz5cbiAgICAgIDxyYW06VVJJVW5pdmVyc2FsQ29tbXVuaWNhdGlvbj5cbiAgICAgICAgPHJhbTpVUklJRCBzY2hlbWVJRD1cIjAwODhcIj4ke3htbEVzY2FwZShidXNpbmVzcy5jb21wYW55VGF4SWQgfHwgXCIwMDAwMDAwMDAwMDAwXCIpfTwvcmFtOlVSSUlEPlxuICAgICAgPC9yYW06VVJJVW5pdmVyc2FsQ29tbXVuaWNhdGlvbj5cbiAgICAgICR7aXNMaWtlbHlWYXRJZChidXNpbmVzcy5jb21wYW55VGF4SWQpID8gYFxuICAgICAgPHJhbTpTcGVjaWZpZWRUYXhSZWdpc3RyYXRpb24+XG4gICAgICAgIDxyYW06SUQgc2NoZW1lSUQ9XCJWQVwiPiR7eG1sRXNjYXBlKChidXNpbmVzcy5jb21wYW55Q291bnRyeUNvZGUgfHwgb3B0cy5zZWxsZXJDb3VudHJ5Q29kZSB8fCBcIkRFXCIpICsgYnVzaW5lc3MuY29tcGFueVRheElkISl9PC9yYW06SUQ+XG4gICAgICA8L3JhbTpTcGVjaWZpZWRUYXhSZWdpc3RyYXRpb24+YCA6IFwiXCJ9XG4gICAgPC9yYW06U2VsbGVyVHJhZGVQYXJ0eT5gO1xuXG4gIC8vIEJBU0lDOiBTaW1wbGlmaWVkIGJ1eWVyIHBhcnR5IC0gb25seSBlc3NlbnRpYWwgZWxlbWVudHNcbiAgY29uc3QgYnV5ZXIgPSBpbnZvaWNlLmN1c3RvbWVyO1xuICBjb25zdCBidXllckFkZHJlc3NMaW5lcyA9IHNwbGl0QWRkcmVzc0xpbmVzKGJ1eWVyLmFkZHJlc3MpO1xuICBjb25zdCBidXllclBhcnR5ID0gYFxuICAgIDxyYW06QnV5ZXJUcmFkZVBhcnR5PlxuICAgICAgPHJhbTpOYW1lPiR7eG1sRXNjYXBlKGJ1eWVyLm5hbWUpfTwvcmFtOk5hbWU+XG4gICAgICA8cmFtOlBvc3RhbFRyYWRlQWRkcmVzcz5cbiAgICAgICAgJHsoYnV5ZXIucG9zdGFsQ29kZSB8fCBidXllckFkZHJlc3NMaW5lcy56aXApID8gYDxyYW06UG9zdGNvZGVDb2RlPiR7eG1sRXNjYXBlKGJ1eWVyLnBvc3RhbENvZGUgfHwgYnV5ZXJBZGRyZXNzTGluZXMuemlwKX08L3JhbTpQb3N0Y29kZUNvZGU+YCA6IFwiXCJ9XG4gICAgICAgICR7YnV5ZXJBZGRyZXNzTGluZXMubGluZU9uZSA/IGA8cmFtOkxpbmVPbmU+JHt4bWxFc2NhcGUoYnV5ZXJBZGRyZXNzTGluZXMubGluZU9uZSl9PC9yYW06TGluZU9uZT5gIDogXCJcIn1cbiAgICAgICAgJHtidXllckFkZHJlc3NMaW5lcy5saW5lVHdvID8gYDxyYW06TGluZVR3bz4ke3htbEVzY2FwZShidXllckFkZHJlc3NMaW5lcy5saW5lVHdvKX08L3JhbTpMaW5lVHdvPmAgOiBcIlwifVxuICAgICAgICAkeyhidXllci5jaXR5IHx8IGJ1eWVyQWRkcmVzc0xpbmVzLmNpdHkpID8gYDxyYW06Q2l0eU5hbWU+JHt4bWxFc2NhcGUoYnV5ZXIuY2l0eSB8fCBidXllckFkZHJlc3NMaW5lcy5jaXR5KX08L3JhbTpDaXR5TmFtZT5gIDogXCJcIn1cbiAgICAgICAgPHJhbTpDb3VudHJ5SUQ+JHt4bWxFc2NhcGUoYnV5ZXIuY291bnRyeUNvZGUgfHwgb3B0cy5idXllckNvdW50cnlDb2RlIHx8IFwiREVcIil9PC9yYW06Q291bnRyeUlEPlxuICAgICAgICAke2J1eWVyLnJlZ2lvbiA/IGA8cmFtOkNvdW50cnlTdWJEaXZpc2lvbk5hbWU+JHt4bWxFc2NhcGUoYnV5ZXIucmVnaW9uKX08L3JhbTpDb3VudHJ5U3ViRGl2aXNpb25OYW1lPmAgOiBcIlwifVxuICAgICAgPC9yYW06UG9zdGFsVHJhZGVBZGRyZXNzPlxuICAgICAgPHJhbTpVUklVbml2ZXJzYWxDb21tdW5pY2F0aW9uPlxuICAgICAgICA8cmFtOlVSSUlEIHNjaGVtZUlEPVwiMDA4OFwiPiR7eG1sRXNjYXBlKGJ1eWVyLnRheElkIHx8IFwiMDAwMDAwMDAwMDAwMFwiKX08L3JhbTpVUklJRD5cbiAgICAgIDwvcmFtOlVSSVVuaXZlcnNhbENvbW11bmljYXRpb24+XG4gICAgICAke2lzTGlrZWx5VmF0SWQoYnV5ZXIudGF4SWQpID8gYFxuICAgICAgPHJhbTpTcGVjaWZpZWRUYXhSZWdpc3RyYXRpb24+XG4gICAgICAgIDxyYW06SUQgc2NoZW1lSUQ9XCJWQVwiPiR7eG1sRXNjYXBlKChidXllci5jb3VudHJ5Q29kZSB8fCBvcHRzLmJ1eWVyQ291bnRyeUNvZGUgfHwgXCJERVwiKSArIGJ1eWVyLnRheElkISl9PC9yYW06SUQ+XG4gICAgICA8L3JhbTpTcGVjaWZpZWRUYXhSZWdpc3RyYXRpb24+YCA6IFwiXCJ9XG4gICAgPC9yYW06QnV5ZXJUcmFkZVBhcnR5PmA7XG5cbiAgY29uc3QgaGVhZGVyQWdyZWVtZW50ID0gYFxuICA8cmFtOkFwcGxpY2FibGVIZWFkZXJUcmFkZUFncmVlbWVudD5cbiAgICA8cmFtOkJ1eWVyUmVmZXJlbmNlPiR7eG1sRXNjYXBlKGludm9pY2UuY3VzdG9tZXIucmVmZXJlbmNlIHx8IFwiTi9BXCIpfTwvcmFtOkJ1eWVyUmVmZXJlbmNlPlxuICAgICR7c2VsbGVyUGFydHl9XG4gICAgJHtidXllclBhcnR5fVxuICAgICR7b3B0cy5vcmRlclJlZmVyZW5jZUlkID8gYDxyYW06QnV5ZXJPcmRlclJlZmVyZW5jZWREb2N1bWVudD48cmFtOklzc3VlckFzc2lnbmVkSUQ+JHt4bWxFc2NhcGUob3B0cy5vcmRlclJlZmVyZW5jZUlkKX08L3JhbTpJc3N1ZXJBc3NpZ25lZElEPjwvcmFtOkJ1eWVyT3JkZXJSZWZlcmVuY2VkRG9jdW1lbnQ+YCA6IFwiXCJ9XG4gIDwvcmFtOkFwcGxpY2FibGVIZWFkZXJUcmFkZUFncmVlbWVudD5gO1xuXG4gIGNvbnN0IHBheW1lbnRUZXJtcyA9IGJ1c2luZXNzLnBheW1lbnRUZXJtcyB8fCBpbnZvaWNlLnBheW1lbnRUZXJtcztcbiAgY29uc3QgaGVhZGVyVGF4ZXMgPSAodGF4ZXMubGVuZ3RoID4gMCA/IHRheGVzIDogW3sgcGVyY2VudDogMCwgdGF4YWJsZTogTWF0aC5tYXgoMCwgKGludm9pY2Uuc3VidG90YWwgfHwgMCkgLSAoaW52b2ljZS5kaXNjb3VudEFtb3VudCB8fCAwKSksIGFtb3VudDogMCB9XSk7XG5cbiAgLy8gQkFTSUM6IFNpbXBsaWZpZWQgc2V0dGxlbWVudCB3aXRoIGNvcnJlY3QgZWxlbWVudCBvcmRlclxuICBjb25zdCBoZWFkZXJTZXR0bGVtZW50ID0gYFxuICA8cmFtOkFwcGxpY2FibGVIZWFkZXJUcmFkZVNldHRsZW1lbnQ+XG4gICAgPHJhbTpJbnZvaWNlQ3VycmVuY3lDb2RlPiR7eG1sRXNjYXBlKGN1cnJlbmN5KX08L3JhbTpJbnZvaWNlQ3VycmVuY3lDb2RlPlxuICAgICR7YnVzaW5lc3MuYmFua0FjY291bnQgPyBgXG4gICAgPHJhbTpTcGVjaWZpZWRUcmFkZVNldHRsZW1lbnRQYXltZW50TWVhbnM+XG4gICAgICA8cmFtOlR5cGVDb2RlPjU4PC9yYW06VHlwZUNvZGU+XG4gICAgICA8cmFtOlBheWVlUGFydHlDcmVkaXRvckZpbmFuY2lhbEFjY291bnQ+XG4gICAgICAgIDxyYW06SUJBTklEPiR7eG1sRXNjYXBlKGJ1c2luZXNzLmJhbmtBY2NvdW50KX08L3JhbTpJQkFOSUQ+XG4gICAgICA8L3JhbTpQYXllZVBhcnR5Q3JlZGl0b3JGaW5hbmNpYWxBY2NvdW50PlxuICAgIDwvcmFtOlNwZWNpZmllZFRyYWRlU2V0dGxlbWVudFBheW1lbnRNZWFucz5gIDogXCJcIn1cbiAgICAke2hlYWRlclRheGVzLm1hcCgodCkgPT4gYFxuICAgIDxyYW06QXBwbGljYWJsZVRyYWRlVGF4PlxuICAgICAgPHJhbTpDYWxjdWxhdGVkQW1vdW50PiR7ZGVjaW1hbHModC5hbW91bnQpfTwvcmFtOkNhbGN1bGF0ZWRBbW91bnQ+XG4gICAgICA8cmFtOlR5cGVDb2RlPlZBVDwvcmFtOlR5cGVDb2RlPlxuICAgICAgPHJhbTpCYXNpc0Ftb3VudD4ke2RlY2ltYWxzKHQudGF4YWJsZSl9PC9yYW06QmFzaXNBbW91bnQ+XG4gICAgICA8cmFtOkNhdGVnb3J5Q29kZT4ke3RheENhdGVnb3J5SWQodC5wZXJjZW50KX08L3JhbTpDYXRlZ29yeUNvZGU+XG4gICAgICA8cmFtOlJhdGVBcHBsaWNhYmxlUGVyY2VudD4ke2RlY2ltYWxzKHQucGVyY2VudCl9PC9yYW06UmF0ZUFwcGxpY2FibGVQZXJjZW50PlxuICAgIDwvcmFtOkFwcGxpY2FibGVUcmFkZVRheD5gKS5qb2luKFwiXCIpfVxuICAgICR7cGF5bWVudFRlcm1zID8gYDxyYW06U3BlY2lmaWVkVHJhZGVQYXltZW50VGVybXM+PHJhbTpEZXNjcmlwdGlvbj4ke3htbEVzY2FwZShwYXltZW50VGVybXMpfTwvcmFtOkRlc2NyaXB0aW9uPjwvcmFtOlNwZWNpZmllZFRyYWRlUGF5bWVudFRlcm1zPmAgOiBcIlwifVxuICAgIDxyYW06U3BlY2lmaWVkVHJhZGVTZXR0bGVtZW50SGVhZGVyTW9uZXRhcnlTdW1tYXRpb24+XG4gICAgICA8cmFtOkxpbmVUb3RhbEFtb3VudD4ke2RlY2ltYWxzKGludm9pY2Uuc3VidG90YWwpfTwvcmFtOkxpbmVUb3RhbEFtb3VudD5cbiAgICAgIDxyYW06VGF4QmFzaXNUb3RhbEFtb3VudD4ke2RlY2ltYWxzKG5ldFRvdGFsKX08L3JhbTpUYXhCYXNpc1RvdGFsQW1vdW50PlxuICAgICAgPHJhbTpUYXhUb3RhbEFtb3VudCBjdXJyZW5jeUlEPVwiJHt4bWxFc2NhcGUoY3VycmVuY3kpfVwiPiR7ZGVjaW1hbHMoaW52b2ljZS50YXhBbW91bnQpfTwvcmFtOlRheFRvdGFsQW1vdW50PlxuICAgICAgPHJhbTpHcmFuZFRvdGFsQW1vdW50PiR7ZGVjaW1hbHMoaW52b2ljZS50b3RhbCl9PC9yYW06R3JhbmRUb3RhbEFtb3VudD5cbiAgICAgIDxyYW06RHVlUGF5YWJsZUFtb3VudD4ke2RlY2ltYWxzKGludm9pY2UudG90YWwpfTwvcmFtOkR1ZVBheWFibGVBbW91bnQ+XG4gICAgPC9yYW06U3BlY2lmaWVkVHJhZGVTZXR0bGVtZW50SGVhZGVyTW9uZXRhcnlTdW1tYXRpb24+XG4gIDwvcmFtOkFwcGxpY2FibGVIZWFkZXJUcmFkZVNldHRsZW1lbnQ+YDtcblxuICAvLyBCQVNJQzogRXNzZW50aWFsIGxpbmUgaXRlbXMgb25seVxuICBjb25zdCBsaW5lc1htbCA9IGludm9pY2UuaXRlbXMubWFwKChpdCwgaWR4KSA9PiB7XG4gICAgY29uc3QgcXR5ID0gTnVtYmVyKGl0LnF1YW50aXR5KSB8fCAwO1xuICAgIGNvbnN0IHVuaXQgPSBOdW1iZXIoaXQudW5pdFByaWNlKSB8fCAwO1xuICAgIGNvbnN0IGxpbmVUb3RhbCA9IE51bWJlcihpdC5saW5lVG90YWwpIHx8IChxdHkgKiB1bml0KTtcbiAgICBjb25zdCBsaW5lUmF0ZSA9IChpdC50YXhlcyAmJiBpdC50YXhlcy5sZW5ndGggPiAwKSA/IE51bWJlcihpdC50YXhlc1swXS5wZXJjZW50KSB8fCAwIDogKE51bWJlcihpbnZvaWNlLnRheFJhdGUpIHx8IDApO1xuICAgIFxuICAgIHJldHVybiBgXG4gICAgPHJhbTpJbmNsdWRlZFN1cHBseUNoYWluVHJhZGVMaW5lSXRlbT5cbiAgICAgIDxyYW06QXNzb2NpYXRlZERvY3VtZW50TGluZURvY3VtZW50PlxuICAgICAgICA8cmFtOkxpbmVJRD4ke2lkeCArIDF9PC9yYW06TGluZUlEPlxuICAgICAgPC9yYW06QXNzb2NpYXRlZERvY3VtZW50TGluZURvY3VtZW50PlxuICAgICAgPHJhbTpTcGVjaWZpZWRUcmFkZVByb2R1Y3Q+XG4gICAgICAgIDxyYW06TmFtZT4ke3htbEVzY2FwZShpdC5kZXNjcmlwdGlvbil9PC9yYW06TmFtZT5cbiAgICAgIDwvcmFtOlNwZWNpZmllZFRyYWRlUHJvZHVjdD5cbiAgICAgIDxyYW06U3BlY2lmaWVkTGluZVRyYWRlQWdyZWVtZW50PlxuICAgICAgICA8cmFtOk5ldFByaWNlUHJvZHVjdFRyYWRlUHJpY2U+XG4gICAgICAgICAgPHJhbTpDaGFyZ2VBbW91bnQ+JHtkZWNpbWFscyh1bml0KX08L3JhbTpDaGFyZ2VBbW91bnQ+XG4gICAgICAgIDwvcmFtOk5ldFByaWNlUHJvZHVjdFRyYWRlUHJpY2U+XG4gICAgICA8L3JhbTpTcGVjaWZpZWRMaW5lVHJhZGVBZ3JlZW1lbnQ+XG4gICAgICA8cmFtOlNwZWNpZmllZExpbmVUcmFkZURlbGl2ZXJ5PlxuICAgICAgICA8cmFtOkJpbGxlZFF1YW50aXR5IHVuaXRDb2RlPVwiQzYyXCI+JHtkZWNpbWFscyhxdHkpfTwvcmFtOkJpbGxlZFF1YW50aXR5PlxuICAgICAgPC9yYW06U3BlY2lmaWVkTGluZVRyYWRlRGVsaXZlcnk+XG4gICAgICA8cmFtOlNwZWNpZmllZExpbmVUcmFkZVNldHRsZW1lbnQ+XG4gICAgICAgIDxyYW06QXBwbGljYWJsZVRyYWRlVGF4PlxuICAgICAgICAgIDxyYW06VHlwZUNvZGU+VkFUPC9yYW06VHlwZUNvZGU+XG4gICAgICAgICAgPHJhbTpDYXRlZ29yeUNvZGU+JHt0YXhDYXRlZ29yeUlkKGxpbmVSYXRlKX08L3JhbTpDYXRlZ29yeUNvZGU+XG4gICAgICAgICAgPHJhbTpSYXRlQXBwbGljYWJsZVBlcmNlbnQ+JHtkZWNpbWFscyhsaW5lUmF0ZSl9PC9yYW06UmF0ZUFwcGxpY2FibGVQZXJjZW50PlxuICAgICAgICA8L3JhbTpBcHBsaWNhYmxlVHJhZGVUYXg+XG4gICAgICAgIDxyYW06U3BlY2lmaWVkVHJhZGVTZXR0bGVtZW50TGluZU1vbmV0YXJ5U3VtbWF0aW9uPlxuICAgICAgICAgIDxyYW06TGluZVRvdGFsQW1vdW50PiR7ZGVjaW1hbHMobGluZVRvdGFsKX08L3JhbTpMaW5lVG90YWxBbW91bnQ+XG4gICAgICAgIDwvcmFtOlNwZWNpZmllZFRyYWRlU2V0dGxlbWVudExpbmVNb25ldGFyeVN1bW1hdGlvbj5cbiAgICAgIDwvcmFtOlNwZWNpZmllZExpbmVUcmFkZVNldHRsZW1lbnQ+XG4gICAgPC9yYW06SW5jbHVkZWRTdXBwbHlDaGFpblRyYWRlTGluZUl0ZW0+YDtcbiAgfSkuam9pbihcIlwiKTtcblxuICAvLyBDb3JyZWN0IGVsZW1lbnQgb3JkZXIgZm9yIEJBU0lDXG4gIGNvbnN0IHRyeCA9IGBcbiAgPHJzbTpTdXBwbHlDaGFpblRyYWRlVHJhbnNhY3Rpb24+XG4gICAgJHtsaW5lc1htbH1cbiAgICAke2hlYWRlckFncmVlbWVudH1cbiAgICA8cmFtOkFwcGxpY2FibGVIZWFkZXJUcmFkZURlbGl2ZXJ5PlxuICAgICAgPHJhbTpBY3R1YWxEZWxpdmVyeVN1cHBseUNoYWluRXZlbnQ+XG4gICAgICAgIDxyYW06T2NjdXJyZW5jZURhdGVUaW1lPjx1ZHQ6RGF0ZVRpbWVTdHJpbmcgZm9ybWF0PVwiMTAyXCI+JHtpc3N1ZX08L3VkdDpEYXRlVGltZVN0cmluZz48L3JhbTpPY2N1cnJlbmNlRGF0ZVRpbWU+XG4gICAgICA8L3JhbTpBY3R1YWxEZWxpdmVyeVN1cHBseUNoYWluRXZlbnQ+XG4gICAgPC9yYW06QXBwbGljYWJsZUhlYWRlclRyYWRlRGVsaXZlcnk+XG4gICAgJHtoZWFkZXJTZXR0bGVtZW50fVxuICA8L3JzbTpTdXBwbHlDaGFpblRyYWRlVHJhbnNhY3Rpb24+YDtcblxuICBjb25zdCB4bWwgPSBgPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+XG48cnNtOkNyb3NzSW5kdXN0cnlJbnZvaWNlXG4gIHhtbG5zOnJzbT1cInVybjp1bjp1bmVjZTp1bmNlZmFjdDpkYXRhOnN0YW5kYXJkOkNyb3NzSW5kdXN0cnlJbnZvaWNlOjEwMFwiXG4gIHhtbG5zOnJhbT1cInVybjp1bjp1bmVjZTp1bmNlZmFjdDpkYXRhOnN0YW5kYXJkOlJldXNhYmxlQWdncmVnYXRlQnVzaW5lc3NJbmZvcm1hdGlvbkVudGl0eToxMDBcIlxuICB4bWxuczp1ZHQ9XCJ1cm46dW46dW5lY2U6dW5jZWZhY3Q6ZGF0YTpzdGFuZGFyZDpVbnF1YWxpZmllZERhdGFUeXBlOjEwMFwiXG4gIHhtbG5zOnFkdD1cInVybjp1bjp1bmVjZTp1bmNlZmFjdDpkYXRhOnN0YW5kYXJkOlF1YWxpZmllZERhdGFUeXBlOjEwMFwiPlxuICAke2RvY0NvbnRleHR9XG4gICR7ZG9jSGVhZGVyfVxuICAke3RyeH1cbjwvcnNtOkNyb3NzSW5kdXN0cnlJbnZvaWNlPmA7XG5cbiAgcmV0dXJuIHhtbDtcbn0iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEscURBQXFEO0FBQ3JELG1FQUFtRTtBQUtuRSxTQUFTLFVBQVUsQ0FBbUM7RUFDcEQsSUFBSSxNQUFNLGFBQWEsTUFBTSxNQUFNLE9BQU87RUFDMUMsTUFBTSxJQUFJLE9BQU87RUFDakIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNLFNBQ3BCLE9BQU8sQ0FBQyxNQUFNLFFBQ2QsT0FBTyxDQUFDLE1BQU0sUUFDZCxPQUFPLENBQUMsT0FBTyxVQUNmLE9BQU8sQ0FBQyxNQUFNO0FBQ25CO0FBRUEsU0FBUyxnQkFBZ0IsQ0FBUTtFQUMvQixJQUFJLENBQUMsR0FBRyxPQUFPO0VBQ2YsTUFBTSxPQUFPLEVBQUUsY0FBYztFQUM3QixNQUFNLEtBQUssT0FBTyxFQUFFLFdBQVcsS0FBSyxHQUFHLFFBQVEsQ0FBQyxHQUFHO0VBQ25ELE1BQU0sS0FBSyxPQUFPLEVBQUUsVUFBVSxJQUFJLFFBQVEsQ0FBQyxHQUFHO0VBQzlDLE9BQU8sR0FBRyxPQUFPLEtBQUssSUFBSTtBQUM1QjtBQUVBLFNBQVMsU0FBUyxDQUFTO0VBQ3pCLE9BQU8sQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLE9BQU8sR0FBRyxFQUFFLE9BQU8sQ0FBQztBQUM3QztBQUVBLFNBQVMsYUFBYSxHQUFzQixFQUFFLFdBQW9CO0VBQ2hFLE9BQU8sQ0FBQyxlQUFlLEtBQUssWUFBWSxLQUFLLEVBQUUsV0FBVztBQUM1RDtBQUVBLFNBQVMsY0FBYyxJQUFZO0VBQ2pDLE9BQU8sT0FBTyxJQUFJLE1BQU07QUFDMUI7QUFFQSxTQUFTLGtCQUFrQixPQUFnQjtFQUN6QyxJQUFJLENBQUMsU0FBUyxPQUFPLENBQUM7RUFDdEIs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
// denoCacheMetadata=18273202701407413475,6224312381905874937