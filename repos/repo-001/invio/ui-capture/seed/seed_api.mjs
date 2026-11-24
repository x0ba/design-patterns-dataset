// Seeds Invio through its own REST API, as an established small studio would have it
// after ~15 months of use. Usage: node seed_api.mjs http://127.0.0.1:PORT
// Writes a sidecar JSON (backdate.json) with intended historical timestamps,
// applied afterwards by backdate.mjs directly against the SQLite schema.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.argv[2] || "http://127.0.0.1:3000") + "/api/v1";
const HERE = dirname(fileURLToPath(import.meta.url));
const TODAY = new Date("2026-11-17T10:00:00Z");

// deterministic PRNG
let seed = 20251;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

let TOKEN = "";
async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const backdate = { customers: {}, products: {}, invoices: {}, taxes: [], users: {} };

// ---------- login ----------
const login = await api("POST", "/auth/login", { username: process.env.ADMIN_USER || "admin", password: process.env.ADMIN_PASS || "invio-demo-2026" });
TOKEN = login.token || login.accessToken || login.access_token;
if (!TOKEN) throw new Error("no token: " + JSON.stringify(login));

// ---------- settings ----------
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="#0E7C86"/><path d="M18 60c10-15 20-15 30 0s20 15 30 0" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M18 40c10-15 20-15 30 0s20 15 30 0" stroke="#9FE3E8" stroke-width="7" fill="none" stroke-linecap="round"/></svg>`;
await api("PUT", "/settings", {
  companyName: "Brightwater Creative B.V.",
  companyAddress: "Westerdok 214",
  companyCity: "Amsterdam",
  companyPostalCode: "1013 BH",
  companyCountryCode: "NL",
  companyEmail: "billing@brightwater.studio",
  companyPhone: "+31 20 893 4417",
  companyTaxId: "NL863412097B01",
  currency: "EUR",
  taxLabel: "VAT",
  defaultTaxRate: "21",
  defaultPricesIncludeTax: "false",
  defaultRoundingMode: "line",
  paymentMethods: "Bank transfer (SEPA), iDEAL, PayPal, Stripe card payment",
  bankAccount: "IBAN NL42 RABO 0318 2245 90 · BIC RABONL2U · Brightwater Creative B.V.",
  paymentTerms: "Due in 30 days",
  defaultNotes: "Thank you for working with Brightwater! Please mention the invoice number with your payment.",
  invoiceNumberPattern: "INV-{YYYY}-{SEQ}",
  invoiceNumberingEnabled: "true",
  templateId: "professional-modern",
  postalCityFormat: "postal-city",
  locale: "en",
  logo: "data:image/svg+xml;base64," + Buffer.from(logoSvg).toString("base64"),
});

// ---------- tax definitions ----------
const existingTax = await api("GET", "/tax-definitions");
for (const t of existingTax) await api("DELETE", `/tax-definitions/${t.id}`).catch(() => {});
const TAX = {};
for (const [k, def] of Object.entries({
  std: { code: "NL-VAT-21", name: "VAT 21% (standard)", percent: 21, categoryCode: "S", countryCode: "NL" },
  low: { code: "NL-VAT-9", name: "VAT 9% (reduced – books & printed matter)", percent: 9, categoryCode: "S", countryCode: "NL" },
  rc: { code: "EU-RC", name: "Reverse charge (intra-EU B2B)", percent: 0, categoryCode: "AE", countryCode: "NL" },
  exp: { code: "EXPORT-0", name: "Export outside EU – 0%", percent: 0, categoryCode: "G", countryCode: "NL" },
})) TAX[k] = await api("POST", "/tax-definitions", def);

// ---------- users ----------
const perms = (spec) => Object.entries(spec).flatMap(([resource, actions]) => actions.map((action) => ({ resource, action })));
const users = [
  { username: "daniel", displayName: "Daniel Okafor", email: "daniel@brightwater.studio", isAdmin: true, password: "Daniel!2026-studio" },
  { username: "jonas.k", displayName: "Jonas Keller", email: "jonas@brightwater.studio", isAdmin: false, password: "Jonas!2026-studio",
    permissions: perms({ invoices: ["read", "create", "update", "publish", "export"], customers: ["read", "create", "update"], products: ["read"], templates: ["read"], settings: ["read"], tax_definitions: ["read"] }) },
  { username: "boekhouder", displayName: "Ellen Bakker (Bakker Administratie)", email: "ellen@bakkeradministratie.nl", isAdmin: false, password: "Ellen!2026-books",
    permissions: perms({ invoices: ["read", "export", "void"], customers: ["read"], products: ["read"], tax_definitions: ["read"], settings: ["read"] }) },
  { username: "sanne.intern", displayName: "Sanne Visser", email: "sanne@brightwater.studio", isAdmin: false, password: "Sanne!2026-studio",
    permissions: perms({ invoices: ["read", "create"], customers: ["read"], products: ["read"] }) },
];
const me = await api("GET", "/users/me");
await api("PUT", `/users/${me.id ?? me.user?.id}`, { displayName: "Maartje de Vries", email: "maartje@brightwater.studio" });
for (const u of users) {
  const created = await api("POST", "/users", u);
  backdate.users[created.id] = u.username === "sanne.intern" ? "2026-06-03T09:12:00Z" : u.username === "boekhouder" ? "2025-10-14T13:40:00Z" : "2025-08-21T08:05:00Z";
  if (u.username === "sanne.intern") await api("PUT", `/users/${created.id}`, { isActive: false });
}

// ---------- products ----------
const P = [
  ["Brand identity package", "Logo suite, colour palette, typography system and a 24-page brand guidelines PDF. Two rounds of revisions included.", 6800, "BRD-ID-01", "lump_sum", "service", "std"],
  ["Logo refresh", "Modernisation of an existing mark, delivered in SVG/PNG/PDF, light & dark variants.", 1450, "BRD-LOGO", "lump_sum", "service", "std"],
  ["UX research workshop", "Full-day facilitated workshop incl. preparation, stakeholder interviews and synthesis report.", 1850, "UX-WS-DAY", "day", "service", "std"],
  ["UI design", "Interface design in Figma, hourly rate.", 95, "DES-UI-H", "hour", "service", "std"],
  ["Frontend development", "SvelteKit / React / Astro implementation, hourly rate.", 105, "DEV-FE-H", "hour", "service", "std"],
  ["Backend development", "API, integrations and database work, hourly rate.", 115, "DEV-BE-H", "hour", "service", "std"],
  ["Project management", "Planning, client calls, sprint reviews.", 80, "PM-H", "hour", "service", "std"],
  ["Copywriting (EN/NL)", "Web copy and microcopy, bilingual.", 85, "COPY-H", "hour", "service", "std"],
  ["Accessibility audit (WCAG 2.2 AA)", "Manual + automated audit, prioritised findings report and retest.", 2400, "A11Y-AUD", "lump_sum", "service", "std"],
  ["SEO technical audit", "Crawl, Core Web Vitals review and action list.", 950, "SEO-AUD", "lump_sum", "service", "std"],
  ["Website care plan – Basic", "Hosting, daily backups, security updates, 1h small changes / month.", 149, "CARE-BAS", "piece", "subscription", "std"],
  ["Website care plan – Pro", "Managed hosting, uptime monitoring, priority support, 4h changes / month.", 389, "CARE-PRO", "piece", "subscription", "std"],
  ["Domain renewal (.nl/.com)", "Annual domain registration renewal.", 18.5, "DOM-REN", "piece", "subscription", "std"],
  ["Photography day rate", "On-location product or team photography, incl. basic retouching of 40 selects.", 1250, "PHO-DAY", "day", "service", "std"],
  ["Illustration", "Custom editorial / spot illustration, per piece.", 420, "ILL-PC", "piece", "service", "std"],
  ["Motion design", "Animated explainer or social loop, per day.", 780, "MOT-DAY", "day", "service", "std"],
  ["Newsletter template", "Responsive email template for Mailchimp / Brevo.", 1150, "EML-TPL", "lump_sum", "service", "std"],
  ["Business cards (500 pcs)", "Printed on 400gsm uncoated stock, double-sided.", 135, "PRT-BC500", "piece", "goods", "low"],
  ["Printed brand book", "Hard-cover printed brand guidelines, short run.", 64, "PRT-BOOK", "piece", "goods", "low"],
  ["Stock photo licence", "Extended licence, pass-through at cost.", 49, "LIC-STOCK", "piece", "other", "std"],
  ["Font licence (web, 50k views)", "Commercial webfont licence, pass-through at cost.", 210, "LIC-FONT", "piece", "other", "std"],
  ["Travel & expenses", "Train travel and accommodation for on-site work.", 1, "EXP-TRV", "lump_sum", "other", "std"],
  ["Rush fee", "Surcharge for delivery under 5 business days.", 350, "FEE-RUSH", "lump_sum", "other", "std"],
  ["Strategy consulting", "Senior digital strategy session.", 145, "CON-H", "hour", "service", "std"],
  ["Webflow build (legacy)", "Fixed-price Webflow marketing site — no longer offered.", 3900, "WF-BUILD", "lump_sum", "service", "std"],
  ["Social media kit", "Template set for Instagram/LinkedIn (12 templates).", 690, "SOC-KIT", "lump_sum", "service", "std"],
];
const products = [];
for (const [name, description, unitPrice, sku, unit, category, tax] of P) {
  const p = await api("POST", "/products", { name, description, unitPrice, sku, unit, category, taxDefinitionId: TAX[tax].id });
  products.push(p);
  backdate.products[p.id] = iso(addDays(new Date("2025-08-22"), between(0, 40))) + "T10:00:00Z";
}
const prod = Object.fromEntries(products.map((p) => [p.sku, p]));

// ---------- customers ----------
// [name, contact, email, phone, address, city, postal, region, country, taxId, regime, size]
const C = [
  ["Fietsfabriek Noord B.V.", "Ruben Smit", "ruben@fietsfabrieknoord.nl", "+31 20 334 1290", "NDSM-plein 28", "Amsterdam", "1033 WB", "", "NL", "NL859012334B01", "std", "L"],
  ["Koffiebranderij De Gouden Boon", "Lotte Jansen", "lotte@goudenboon.nl", "+31 30 271 8890", "Oudegracht 117", "Utrecht", "3511 AH", "", "NL", "NL001288734B02", "std", "M"],
  ["Stichting Groene Stad", "Pieter van Dijk", "p.vandijk@groenestad.org", "+31 10 455 2210", "Witte de Withstraat 61", "Rotterdam", "3012 BN", "", "NL", "NL822104589B01", "std", "M"],
  ["Hotel Canal House Leiden", "Fatima El Amrani", "reservations@canalhouseleiden.nl", "+31 71 512 6633", "Rapenburg 8", "Leiden", "2311 EV", "", "NL", "NL854419023B01", "std", "S"],
  ["Tandartspraktijk Zuidas", "Dr. Mark Verhoeven", "info@tandartszuidas.nl", "+31 20 763 0040", "Gustav Mahlerlaan 310", "Amsterdam", "1082 ME", "", "NL", "NL003945221B01", "std", "S"],
  ["Wolkenkrabber Software B.V.", "Daan Mulder", "finance@wolkenkrabber.io", "+31 40 290 1180", "Strijp-S, Torenallee 20", "Eindhoven", "5617 BC", "", "NL", "NL862003471B01", "std", "L"],
  ["Bakkerij Van der Linden", "Anouk van der Linden", "anouk@bakkerijvdlinden.nl", "+31 23 531 4478", "Grote Houtstraat 95", "Haarlem", "2011 SK", "", "NL", "", "std", "S"],
  ["Museum Het Verborgen Huis", "Hendrik Bos", "h.bos@verborgenhuis.nl", "+31 70 346 9912", "Lange Voorhout 34", "Den Haag", "2514 EE", "", "NL", "NL814556790B01", "std", "M"],
  ["Studio Noor Architecten", "Noor Hendriks", "noor@studionoor.nl", "+31 20 220 5517", "Czaar Peterstraat 152", "Amsterdam", "1018 PR", "", "NL", "NL857710233B01", "std", "M"],
  ["Groningen Jazz Festival", "Thijs Kuipers", "thijs@gnjazzfest.nl", "+31 50 318 7720", "Vismarkt 40", "Groningen", "9711 KV", "", "NL", "NL819004562B01", "std", "S"],
  ["Petra Wouters Coaching", "Petra Wouters", "petra@petrawouters.nl", "+31 6 4128 9930", "Kerkstraat 12", "Nijmegen", "6511 GE", "", "NL", "", "std", "S"],
  ["Huisartsenpraktijk De Linde", "Ingrid Smeets", "praktijkmanager@delinde-huisartsen.nl", "+31 43 321 5566", "Lindenkruis 5", "Maastricht", "6211 MV", "", "NL", "", "std", "S"],
  ["Nordlicht Mobility GmbH", "Katharina Weiß", "k.weiss@nordlicht-mobility.de", "+49 30 6098 4410", "Schlesische Str. 26", "Berlin", "10997", "Berlin", "DE", "DE318845720", "rc", "L"],
  ["Rheinwerk Brauerei KG", "Florian Becker", "f.becker@rheinwerk-brauerei.de", "+49 221 7788 230", "Deutzer Freiheit 71", "Köln", "50679", "NRW", "DE", "DE296611043", "rc", "M"],
  ["Atelier Lumière SARL", "Camille Dubois", "camille@atelier-lumiere.fr", "+33 1 42 71 88 05", "18 Rue Oberkampf", "Paris", "75011", "Île-de-France", "FR", "FR42831204567", "rc", "M"],
  ["Brasserie Les Quais", "Julien Moreau", "contact@brasserielesquais.fr", "+33 4 78 37 21 90", "12 Quai Saint-Antoine", "Lyon", "69002", "", "FR", "FR09512334870", "rc", "S"],
  ["Vlaams Designplatform vzw", "Elke Peeters", "elke.peeters@designplatform.be", "+32 3 226 4410", "Kloosterstraat 90", "Antwerpen", "2000", "", "BE", "BE0712345982", "rc", "M"],
  ["Gent Fietskoeriers BV", "Wout De Smet", "wout@gentkoeriers.be", "+32 9 233 1170", "Dok Noord 4", "Gent", "9000", "", "BE", "BE0798122356", "rc", "S"],
  ["Hafenkontor Logistik GmbH", "Jan-Hendrik Petersen", "rechnungen@hafenkontor.de", "+49 40 3198 7720", "Am Sandtorkai 41", "Hamburg", "20457", "Hamburg", "DE", "DE812233901", "rc", "L"],
  ["Fjällkraft AB", "Elin Lindqvist", "elin.lindqvist@fjallkraft.se", "+46 8 520 274 11", "Götgatan 48", "Stockholm", "118 26", "", "SE", "SE556901234501", "rc", "M"],
  ["Hygge Interiør ApS", "Mads Sørensen", "mads@hyggeinterior.dk", "+45 33 12 47 90", "Jægersborggade 17", "København N", "2200", "", "DK", "DK38812745", "rc", "S"],
  ["Casa Olivar S.L.", "Lucía Fernández", "lucia@casaolivar.es", "+34 954 22 61 08", "Calle Feria 33", "Sevilla", "41003", "Andalucía", "ES", "ESB91827364", "rc", "S"],
  ["Ortiz & Rossi Studio Legale", "Avv. Giulia Rossi", "g.rossi@ortizrossi.it", "+39 02 8645 3301", "Via Brera 19", "Milano", "20121", "MI", "IT", "IT10928374651", "rc", "S"],
  ["Liffey Analytics Ltd", "Siobhán O'Connor", "accounts@liffeyanalytics.ie", "+353 1 678 2045", "Grand Canal Quay 6", "Dublin 2", "D02 X576", "", "IE", "IE3456712QH", "rc", "M"],
  ["Thames & Rowe Publishing Ltd", "Oliver Hartley", "o.hartley@thamesrowe.co.uk", "+44 20 7946 0321", "14 Clerkenwell Green", "London", "EC1R 0DP", "", "GB", "GB284719306", "exp", "M"],
  ["Northfield Outdoor Co.", "Emily Carter", "ap@northfieldoutdoor.com", "+1 503 555 0187", "1120 NW Couch St, Suite 400", "Portland", "97209", "OR", "US", "", "exp", "L"],
  ["Maple & Finch Bakery", "Sarah Thompson", "hello@mapleandfinch.ca", "+1 416 555 0142", "388 Queen St W", "Toronto", "M5V 2A8", "ON", "CA", "", "exp", "S"],
  ["Alpenblick Ferienwohnungen", "Martina Huber", "info@alpenblick-fewo.ch", "+41 81 413 22 70", "Via Maistra 16", "St. Moritz", "7500", "GR", "CH", "CHE-112.345.678 MWST", "exp", "S"],
  ["Kiwi Pixel Labs Ltd", "Aroha Ngata", "accounts@kiwipixel.co.nz", "+64 9 555 0193", "22 Ponsonby Rd", "Auckland", "1011", "", "NZ", "", "exp", "S"],
  ["Sunbeam Health Inc.", "Dr. Priya Raman", "vendor-payments@sunbeamhealth.com", "+1 415 555 0119", "500 Howard St, Floor 3", "San Francisco", "94105", "CA", "US", "", "exp", "L"],
  ["Vereniging Amstel Roeiers", "Bas Willems", "penningmeester@amstelroeiers.nl", "", "Jan Pieter Heijestraat 7", "Amsterdam", "1053 GA", "", "NL", "", "std", "S"],
  ["Kringloop Zuid", "Joyce Meijer", "joyce@kringloopzuid.nl", "+31 20 676 1123", "Ferdinand Bolstraat 140", "Amsterdam", "1072 LN", "", "NL", "NL001992381B01", "std", "S"],
  ["De Boekenkast Uitgeverij", "Rianne Prins", "productie@deboekenkast.nl", "+31 20 624 9981", "Herengracht 433", "Amsterdam", "1017 BR", "", "NL", "NL807733120B01", "std", "M"],
  ["Polderzicht Zorg B.V.", "Gerrit Dekker", "inkoop@polderzicht-zorg.nl", "+31 320 28 4400", "Stationsplein 2", "Lelystad", "8232 VT", "", "NL", "NL853390112B01", "std", "M"],
  ["Tulp & Ko Bloemen", "Mila de Boer", "mila@tulpenko.nl", "+31 6 2219 0874", "Bloemenmarkt 3", "Amsterdam", "1017 BS", "", "NL", "", "std", "S"],
  ["Zeeuwse Oesterkwekerij Yerseke", "Kees Verburg", "kees@oesterkwekerij-yerseke.nl", "+31 113 57 1290", "Havenweg 14", "Yerseke", "4401 NE", "", "NL", "NL812004577B01", "std", "S"],
  ["MIRA Robotics B.V.", "Sophie Claassen", "s.claassen@mirarobotics.ai", "+31 15 760 3300", "Molengraaffsingel 12", "Delft", "2629 JD", "", "NL", "NL864120098B01", "std", "L"],
  ["freelance – Tim Groot", "Tim Groot", "tim.groot.dev@gmail.com", "+31 6 1188 4209", "Javastraat 51-2", "Amsterdam", "1094 HA", "", "NL", "", "std", "S"],
  ["Klein Duimpje Kinderopvang", "Esther Kok", "administratie@kleinduimpje.nl", "+31 35 621 7744", "Kerkbrink 22", "Hilversum", "1211 BX", "", "NL", "", "std", "S"],
  ["Bergmann Schmuck e.K.", "Lena Bergmann", "lena@bergmann-schmuck.de", "+49 89 2154 662", "Theresienstraße 74", "München", "80333", "Bayern", "DE", "DE301228745", "rc", "S"],
];
const customers = [];
for (let i = 0; i < C.length; i++) {
  const [name, contactName, email, phone, address, city, postalCode, region, countryCode, taxId, regime, size] = C[i];
  const c = await api("POST", "/customers", { name, contactName, email, phone, address, city, postalCode, region, countryCode, taxId });
  customers.push({ ...c, regime, size, idx: i });
}

// ---------- invoices ----------
// Work packages by customer size; each returns line items.
const L = (sku, quantity, extra = {}) => {
  const p = prod[sku];
  return { productId: p.id, description: extra.description || p.name, quantity, unit: p.unit, unitPrice: extra.unitPrice ?? p.unitPrice, notes: extra.notes };
};
const jobs = {
  L: [
    () => [L("UX-WS-DAY", 2), L("DES-UI-H", between(28, 60)), L("PM-H", between(6, 14))],
    () => [L("DEV-FE-H", between(40, 96), { notes: "Sprint " + between(3, 18) }), L("DEV-BE-H", between(10, 40)), L("PM-H", between(6, 12))],
    () => [L("BRD-ID-01", 1), L("PRT-BOOK", between(10, 25)), L("LIC-FONT", 1)],
    () => [L("A11Y-AUD", 1), L("DEV-FE-H", between(12, 30), { description: "Accessibility remediation" })],
    () => [L("MOT-DAY", between(2, 5)), L("ILL-PC", between(2, 6)), L("LIC-STOCK", between(2, 8))],
    () => [L("CON-H", between(4, 10)), L("UX-WS-DAY", 1)],
  ],
  M: [
    () => [L("DES-UI-H", between(14, 36)), L("DEV-FE-H", between(16, 48))],
    () => [L("BRD-LOGO", 1), L("SOC-KIT", 1), L("PRT-BC500", between(1, 4))],
    () => [L("SEO-AUD", 1), L("COPY-H", between(6, 18))],
    () => [L("EML-TPL", 1), L("COPY-H", between(3, 8))],
    () => [L("PHO-DAY", 1), L("LIC-STOCK", between(1, 4)), L("EXP-TRV", 1, { unitPrice: between(80, 340), description: "Travel & expenses – NS train + parking" })],
    () => [L("DEV-FE-H", between(8, 24)), L("PM-H", between(2, 6))],
  ],
  S: [
    () => [L("BRD-LOGO", 1), L("PRT-BC500", 1)],
    () => [L("DES-UI-H", between(6, 18)), L("DEV-FE-H", between(6, 20))],
    () => [L("PHO-DAY", 1)],
    () => [L("ILL-PC", between(1, 3))],
    () => [L("SOC-KIT", 1)],
    () => [L("COPY-H", between(4, 10)), L("DES-UI-H", between(2, 6))],
  ],
};
const careFor = new Set([0, 1, 5, 6, 8, 12, 24, 31, 36]); // customers on a monthly care plan
const notesPool = [
  "",
  "",
  "PO number 4500128833 – please reference on remittance.",
  "As agreed in the kick-off meeting, 50% of the fixed fee is invoiced up front.",
  "Final instalment for the website relaunch project. It was a pleasure working with your team on this one — looking forward to phase two in the spring!",
  "Includes the extra revision round requested on the homepage hero.",
  "Hours per the attached timesheet (Toggl export).",
];
const rcNote = "VAT reverse-charged – Article 196 of Council Directive 2006/112/EC. Customer VAT ID listed above.";
const expNote = "Export of services outside the EU – VAT not applicable (Art. 6 Wet OB / place of supply rules).";
const payMethods = ["Bank transfer", "Bank transfer", "Bank transfer", "iDEAL", "PayPal", "Stripe"];

const plans = [];
const START = new Date("2025-08-25T00:00:00Z");
// one-off project invoices
const weights = customers.map((c) => (c.size === "L" ? 6 : c.size === "M" ? 3 : 1.4));
const wsum = weights.reduce((a, b) => a + b, 0);
const pickCustomer = () => { let r = rnd() * wsum; for (let i = 0; i < customers.length; i++) { r -= weights[i]; if (r <= 0) return customers[i]; } return customers[0]; };
for (let d = new Date(START); d < TODAY; d = addDays(d, between(2, 5))) {
  const cust = pickCustomer();
  plans.push({ cust, date: new Date(d), items: pick(jobs[cust.size])() });
}
// monthly care plans
for (const idx of careFor) {
  const cust = customers[idx];
  const plan = idx % 3 === 0 ? "CARE-PRO" : "CARE-BAS";
  let m = new Date(Date.UTC(2025, 8 + (idx % 4), 1));
  while (m < TODAY) {
    const label = m.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
    const items = [L(plan, 1, { description: `${prod[plan].name} – ${label}` })];
    if (m.getUTCMonth() === 9 && idx % 2 === 0) items.push(L("DOM-REN", between(1, 3)));
    plans.push({ cust, date: new Date(m), items, recurring: true });
    m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1));
  }
}
plans.sort((a, b) => a.date - b.date);

const seqByYear = {};
let created = 0;
for (const plan of plans) {
  const { cust, date } = plan;
  const ageDays = (TODAY - date) / 86400000;
  const terms = cust.size === "L" && cust.regime !== "std" ? 45 : cust.idx % 5 === 0 ? 14 : 30;
  const due = addDays(date, terms);
  // decide lifecycle
  let status;
  const r = rnd();
  if (ageDays < 8) status = r < 0.6 ? "draft" : "sent";
  else if (ageDays < 30) status = r < 0.2 ? "draft" : r < 0.55 ? "sent" : "paid";
  else if (ageDays < 75) status = r < 0.16 ? "sent" : r < 0.975 ? "paid" : "voided"; // sent+past due → overdue
  else status = r < 0.03 ? "sent" : r < 0.055 ? "voided" : r < 0.42 ? "complete" : "paid";

  const taxDef = cust.regime === "std" ? TAX.std : cust.regime === "rc" ? TAX.rc : TAX.exp;
  const hasPrinted = plan.items.some((i) => i.productId === prod["PRT-BC500"].id || i.productId === prod["PRT-BOOK"].id);
  let notes = cust.regime === "rc" ? rcNote : cust.regime === "exp" ? expNote : pick(notesPool);
  if (plan.recurring) notes = cust.regime === "std" ? "" : notes;
  const currency = cust.countryCode === "US" ? "USD" : cust.countryCode === "GB" ? "GBP" : "EUR";
  const fx = currency === "USD" ? 1.08 : currency === "GBP" ? 0.86 : 1;
  const items = plan.items.map((i) => ({ ...i, unitPrice: Math.round(i.unitPrice * fx * 100) / 100 }));
  const payload = {
    customerId: cust.id,
    issueDate: iso(date),
    dueDate: iso(due),
    currency,
    paymentTerms: `Due in ${terms} days`,
    notes,
    discountPercentage: !plan.recurring && rnd() < 0.08 ? pick([5, 10]) : 0,
    items: cust.regime === "std" && hasPrinted
      ? items.map((i) => ({ ...i, taxes: [{ percent: [prod["PRT-BC500"].id, prod["PRT-BOOK"].id].includes(i.productId) ? 9 : 21, taxDefinitionId: [prod["PRT-BC500"].id, prod["PRT-BOOK"].id].includes(i.productId) ? TAX.low.id : TAX.std.id }] }))
      : items,
    taxRate: taxDef.percent,
    taxDefinitionId: taxDef.id,
  };
  {
    const y = date.getUTCFullYear();
    seqByYear[y] = (seqByYear[y] || 0) + 1;
    payload.invoiceNumber = `INV-${y}-${String(seqByYear[y]).padStart(3, "0")}`;
  }
  const inv = await api("POST", "/invoices", payload);
  const hist = [{ status: "draft", at: date }];
  const sentAt = addDays(date, rnd() < 0.7 ? 0 : 1);
  if (status !== "draft") {
    await api("PUT", `/invoices/${inv.id}`, { status: "sent" });
    hist.push({ status: "sent", at: sentAt });
  }
  if (status === "paid" || status === "complete") {
    const late = cust.idx % 7 === 3 ? between(5, 25) : 0;
    const paidAt = addDays(date, Math.min(Math.floor(ageDays) - 1, between(4, terms) + late));
    const method = cust.regime === "exp" ? pick(["Bank transfer", "PayPal", "Stripe", "Wise transfer"]) : pick(payMethods);
    await api("PUT", `/invoices/${inv.id}`, { status: "paid", paymentMethod: method });
    hist.push({ status: "paid", at: paidAt });
    if (status === "complete") {
      await api("PUT", `/invoices/${inv.id}`, { status: "complete" });
      hist.push({ status: "complete", at: addDays(paidAt, between(1, 20)) });
    }
  }
  if (status === "voided") {
    await api("POST", `/invoices/${inv.id}/void`);
    hist.push({ status: "voided", at: addDays(sentAt, between(2, 12)) });
  }
  backdate.invoices[inv.id] = { createdAt: date.toISOString(), history: hist.map((h) => ({ status: h.status, at: new Date(Math.min(h.at.getTime() + between(8, 18) * 3600000 + between(0, 59) * 60000, TODAY - 3600000)).toISOString() })) };
  created++;
}

// a couple of customers created recently with no invoices yet
for (const extra of [
  ["Oranje Pedaal Fietsverhuur", "Kevin Brouwer", "kevin@oranjepedaal.nl", "+31 6 3901 2276", "Prinsengracht 302", "Amsterdam", "1016 HX", "", "NL", ""],
  ["Lumen Climate Partners SAS", "Antoine Lefèvre", "a.lefevre@lumenclimate.eu", "+33 6 71 22 90 14", "4 Rue des Arts", "Lille", "59800", "Hauts-de-France", "FR", "FR77901234455"],
]) {
  const [name, contactName, email, phone, address, city, postalCode, region, countryCode, taxId] = extra;
  const c = await api("POST", "/customers", { name, contactName, email, phone, address, city, postalCode, region, countryCode, taxId });
  backdate.customers[c.id] = "2026-11-" + (extra[0].startsWith("Oranje") ? "12" : "14") + "T14:20:00Z";
}
// customer created_at ≈ a few days before their first invoice
for (const c of customers) {
  const first = plans.find((p) => p.cust.id === c.id);
  backdate.customers[c.id] = (first ? addDays(first.date, -between(1, 9)) : addDays(TODAY, -between(20, 200))).toISOString();
}

// retire a legacy product (soft-deactivates if used)
await api("DELETE", `/products/${prod["WF-BUILD"].id}`).catch((e) => console.warn(String(e)));

writeFileSync(join(HERE, "backdate.json"), JSON.stringify(backdate, null, 1));
console.log(`seeded: ${customers.length + 2} customers, ${products.length} products, ${created} invoices`);
