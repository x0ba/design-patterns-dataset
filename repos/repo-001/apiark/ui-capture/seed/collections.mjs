// Collection definitions for the seeded workspace.
// Each request mirrors an ApiArk request YAML file; `response` is the example
// response the local IPC mock returns when the request is sent.

const json = (status, body, extraHeaders = {}) => ({ status, body, headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders } });
const bearer = { type: "bearer", token: "{{accessToken}}" };
const idem = { "Idempotency-Key": "{{$uuid}}" };
const ledgerHeaders = { "Ledgerly-Version": "{{apiVersion}}", Accept: "application/json" };

const customer = (id, name, email, created, extra = {}) => ({
  id, object: "customer", name, email, phone: extra.phone ?? null, currency: extra.currency ?? "usd",
  balance: extra.balance ?? 0, delinquent: extra.delinquent ?? false, created,
  metadata: extra.metadata ?? {}, default_payment_method: extra.pm ?? null,
});
const customers = [
  customer("cus_Q8f2LmA0", "Harborview Dental Group", "billing@harborviewdental.com", "2025-03-14T17:02:11Z", { pm: "pm_1Ox9VISA4242", metadata: { crm_id: "HS-22918" } }),
  customer("cus_Q8f9TtB3", "Marisol Vega", "marisol.vega@fastmail.com", "2025-06-02T09:41:55Z", { phone: "+1 415 555 0182" }),
  customer("cus_Q9a11Rk7", "Kettle & Crumb Bakery", "accounts@kettleandcrumb.co", "2025-08-19T13:10:40Z", { balance: -4500, pm: "pm_1PbMC5454" }),
  customer("cus_QA03nWz2", "Northwind Freight LLC", "ap@northwindfreight.com", "2025-11-30T22:15:03Z", { delinquent: true, balance: 129900, metadata: { account_manager: "j.reyes" } }),
  customer("cus_QB7pX0ee", "Tomasz Wiśniewski", "tomasz.w@protonmail.com", "2026-01-07T08:00:19Z", { currency: "eur" }),
  customer("cus_QC2hYv61", "Bright Path Tutoring", "hello@brightpathtutors.org", "2026-04-22T15:33:47Z", { pm: "pm_1QxAMEX0005" }),
];

const paymentIntent = {
  id: "pi_3QzK8f2LmA0x1nC4", object: "payment_intent", amount: 18450, amount_received: 18450, currency: "usd",
  status: "succeeded", customer: "cus_Q8f2LmA0", description: "Invoice INV-2026-0418 — November hygiene visits",
  payment_method: "pm_1Ox9VISA4242", capture_method: "automatic", confirmation_method: "automatic",
  latest_charge: "ch_3QzK8f2LmA0x1nC4", created: "2026-11-16T15:41:58Z", livemode: false,
  metadata: { invoice_id: "inv_8KX2pQ", source: "api-test" },
  next_action: null, last_payment_error: null,
};

const invoice = (id, number, cust, amount, status, due, lines) => ({ id, object: "invoice", number, customer: cust, status, amount_due: amount, amount_paid: status === "paid" ? amount : 0, currency: "usd", due_date: due, lines });

export const COLLECTIONS = [
  {
    name: "Ledgerly Payments API",
    path: "~/work/ledgerly/payments-api-collection",
    defaults: { auth: bearer, sendCookies: true, storeCookies: true, persistCookies: false },
    environments: [
      { name: "Local", scope: "shared", secrets: ["clientSecret", "accessToken", "webhookSecret"], variables: { baseUrl: "http://localhost:8080", apiVersion: "2026-09-01", clientId: "ldg_cli_local_dev", clientSecret: "local-dev-secret", accessToken: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkYW5hIiwic2NvcGUiOiJwYXltZW50czp3cml0ZSJ9.k3l0c4l", webhookSecret: "whsec_local_8c1f", customerId: "cus_Q8f2LmA0", paymentIntentId: "pi_3QzK8f2LmA0x1nC4", invoiceId: "inv_8KX2pQ" } },
      { name: "Staging", scope: "shared", secrets: ["clientSecret", "accessToken", "webhookSecret"], variables: { baseUrl: "https://staging-api.ledgerly.io", apiVersion: "2026-09-01", clientId: "ldg_cli_stg_9F2kq", clientSecret: "••••••••", accessToken: "eyJhbGciOiJSUzI1NiJ9.stg.token", webhookSecret: "whsec_stg_2b77", customerId: "cus_QA03nWz2", paymentIntentId: "pi_3QyB1aStg0x2", invoiceId: "inv_7Hc0Ys" } },
      { name: "Production (read-only)", scope: "shared", secrets: ["accessToken"], variables: { baseUrl: "https://api.ledgerly.io", apiVersion: "2026-06-15", clientId: "ldg_cli_prod_ro", accessToken: "", customerId: "", paymentIntentId: "", invoiceId: "" } },
      { name: "Dana – sandbox", scope: "personal", secrets: ["accessToken"], variables: { baseUrl: "https://dana.sandbox.ledgerly.dev", apiVersion: "2026-11-01-preview", accessToken: "eyJhbGciOiJIUzI1NiJ9.sandbox", customerId: "cus_QC2hYv61" } },
    ],
    dotenv: { LEDGERLY_LOCAL_DB: "postgres://ledgerly:ledgerly@localhost:5432/ledgerly_dev" },
    cookies: [
      { name: "ldg_session", value: "s%3Aq8XzP0f1m2.Kd9", domain: "staging-api.ledgerly.io", path: "/", expires: "2026-11-23T15:42:00Z", httpOnly: true, secure: true, sameSite: "Lax" },
      { name: "__cf_bm", value: "Yt7.c0Qn_aa1", domain: ".ledgerly.io", path: "/", expires: "2026-11-16T16:12:00Z", httpOnly: true, secure: true, sameSite: "None" },
      { name: "csrftoken", value: "9f8a7c6b5d", domain: "localhost", path: "/", httpOnly: false, secure: false, sameSite: "Strict" },
    ],
    git: {
      branch: "feature/partial-refunds", ahead: 2, behind: 0,
      changes: [
        { path: "refunds/create-partial-refund.yaml", status: "modified", staged: true },
        { path: "refunds/refund-exceeds-amount.yaml", status: "added", staged: true },
        { path: "payments/capture-payment-intent.yaml", status: "modified", staged: false },
        { path: ".apiark/environments/staging.yaml", status: "modified", staged: false },
      ],
      log: [
        ["9e1c4b2", "Add refund edge cases: zero amount, exceeds captured", "Dana Okafor", 0.2],
        ["4f0aa71", "Partial refunds: assert balance_transaction on response", "Dana Okafor", 1.1],
        ["c82d913", "Merge branch 'main' into feature/partial-refunds", "Dana Okafor", 2.4],
        ["1b7e5f0", "Payouts: switch to cursor pagination (starting_after)", "Jae Reyes", 3.0],
        ["77ad2c8", "Webhooks: add replay endpoint + signature test", "Priya Natarajan", 5.6],
        ["e04b6d1", "Bump apiVersion to 2026-09-01 in Local/Staging", "Dana Okafor", 8.2],
        ["5a9f330", "Customers: search by metadata[crm_id]", "Jae Reyes", 11.9],
        ["0d3c8e4", "Fix: idempotency header missing on payouts", "Dana Okafor", 14.0],
        ["b6f21aa", "Auth: refresh token request + post-response script", "Priya Natarajan", 19.5],
        ["3e88f07", "Invoices folder: finalize, void, mark uncollectible", "Dana Okafor", 27.3],
        ["a1d4c9b", "Import from Postman workspace (payments v1)", "Dana Okafor", 96.0],
      ],
      diff: "diff --git a/refunds/create-partial-refund.yaml b/refunds/create-partial-refund.yaml\nindex 3c1e2aa..9f04b1d 100644\n--- a/refunds/create-partial-refund.yaml\n+++ b/refunds/create-partial-refund.yaml\n@@ -6,9 +6,12 @@ headers:\n   Idempotency-Key: \"{{$uuid}}\"\n body:\n   type: json\n   content: |\n     {\n       \"payment_intent\": \"{{paymentIntentId}}\",\n-      \"amount\": 5000,\n+      \"amount\": 4250,\n+      \"reason\": \"requested_by_customer\",\n+      \"metadata\": { \"ticket\": \"SUP-30412\" }\n     }\n assert:\n   status: 201\n+  body.status: { eq: \"succeeded\" }\n",
    },
    items: [
      { folder: "Auth", items: [
        { name: "Get access token (client credentials)", method: "POST", url: "{{baseUrl}}/oauth/token", auth: { type: "none" },
          description: "Exchanges client credentials for a short-lived access token. The post-response script stores it in `accessToken`.",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: { type: "urlencoded", content: "grant_type=client_credentials&client_id={{clientId}}&client_secret={{clientSecret}}&scope=payments:write customers:read" },
          postResponseScript: "const body = ark.response.json();\nark.env.set(\"accessToken\", body.access_token);\nconsole.log(`token expires in ${body.expires_in}s`);",
          tests: "ark.test(\"returns a bearer token\", () => {\n  const b = ark.response.json();\n  ark.expect(b.token_type).to.equal(\"Bearer\");\n  ark.expect(b.expires_in).to.be.above(0);\n});",
          response: json(200, { access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsZGdfY2xpX2xvY2FsX2RldiIsInNjb3BlIjoicGF5bWVudHM6d3JpdGUgY3VzdG9tZXJzOnJlYWQiLCJleHAiOjE3OTQ4NDQ5MjB9.Jx3gJm2e0x", token_type: "Bearer", expires_in: 3600, scope: "payments:write customers:read" }) },
        { name: "Refresh access token", method: "POST", url: "{{baseUrl}}/oauth/token", auth: { type: "none" }, headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: { type: "urlencoded", content: "grant_type=refresh_token&refresh_token={{refreshToken}}&client_id={{clientId}}" },
          response: json(200, { access_token: "eyJhbGciOiJIUzI1NiJ9.refreshed.Qm9", token_type: "Bearer", expires_in: 3600 }) },
        { name: "Introspect token", method: "POST", url: "{{baseUrl}}/oauth/introspect", auth: { type: "basic", username: "{{clientId}}", password: "{{clientSecret}}" },
          body: { type: "urlencoded", content: "token={{accessToken}}" },
          response: json(200, { active: true, client_id: "ldg_cli_local_dev", scope: "payments:write customers:read", exp: 1794844920, sub: "dana@ledgerly.io" }) },
        { name: "Who am I", method: "GET", url: "{{baseUrl}}/v1/account", headers: ledgerHeaders,
          response: json(200, { id: "acct_1NvLedgerly", object: "account", business_name: "Ledgerly Test Merchant", country: "US", default_currency: "usd", charges_enabled: true, payouts_enabled: true, settings: { statement_descriptor: "LEDGERLY*TEST" } }) },
      ] },
      { folder: "Customers", items: [
        { name: "List customers", method: "GET", url: "{{baseUrl}}/v1/customers", headers: ledgerHeaders, params: { limit: "20", "created[gte]": "2025-01-01" },
          assert: { status: 200, "body.object": { eq: "list" }, "body.data": { type: "array" } },
          response: json(200, { object: "list", url: "/v1/customers", has_more: true, data: customers }, { "x-request-id": "req_9Lm2Qe0aZx", "ratelimit-remaining": "98" }) },
        { name: "Get customer", method: "GET", url: "{{baseUrl}}/v1/customers/:customerId", params: { customerId: "{{customerId}}" }, headers: ledgerHeaders,
          response: json(200, customers[0]) },
        { name: "Create customer", method: "POST", url: "{{baseUrl}}/v1/customers", headers: { ...ledgerHeaders, ...idem, "Content-Type": "application/json" },
          body: { type: "json", content: { name: "Lumen Yoga Studio", email: "frontdesk@lumenyoga.studio", phone: "+1 503 555 0147", metadata: { crm_id: "HS-30551", plan: "growth" } } },
          tests: "ark.test(\"created\", () => ark.expect(ark.response.status).to.equal(201));",
          response: json(201, customer("cus_QD9xR2pL", "Lumen Yoga Studio", "frontdesk@lumenyoga.studio", "2026-11-16T15:40:12Z", { phone: "+1 503 555 0147", metadata: { crm_id: "HS-30551", plan: "growth" } })) },
        { name: "Update customer email", method: "PATCH", url: "{{baseUrl}}/v1/customers/:customerId", params: { customerId: "{{customerId}}" }, headers: { ...ledgerHeaders, "Content-Type": "application/json" },
          body: { type: "json", content: { email: "finance@harborviewdental.com" } },
          response: json(200, { ...customers[0], email: "finance@harborviewdental.com" }) },
        { name: "Search customers by CRM id", method: "GET", url: "{{baseUrl}}/v1/customers/search?query=metadata['crm_id']:'HS-22918'", headers: ledgerHeaders,
          response: json(200, { object: "search_result", data: [customers[0]], has_more: false, next_page: null }) },
        { name: "Delete customer", method: "DELETE", url: "{{baseUrl}}/v1/customers/:customerId", params: { customerId: "cus_QB7pX0ee" }, headers: ledgerHeaders,
          description: "⚠️ Hard delete — only use on Local/sandbox.",
          response: json(200, { id: "cus_QB7pX0ee", object: "customer", deleted: true }) },
        { name: "List payment methods", method: "GET", url: "{{baseUrl}}/v1/customers/:customerId/payment_methods", params: { customerId: "{{customerId}}", type: "card" }, headers: ledgerHeaders,
          response: json(200, { object: "list", data: [{ id: "pm_1Ox9VISA4242", type: "card", card: { brand: "visa", last4: "4242", exp_month: 8, exp_year: 2028, funding: "credit" } }, { id: "pm_1Pz0MC4444", type: "card", card: { brand: "mastercard", last4: "4444", exp_month: 2, exp_year: 2027, funding: "debit" } }], has_more: false }) },
      ] },
      { folder: "Payments", items: [
        { name: "Create payment intent", method: "POST", url: "{{baseUrl}}/v1/payment_intents", headers: { ...ledgerHeaders, ...idem, "Content-Type": "application/json" },
          description: "Creates and confirms a card payment for an existing customer. Uses the saved default payment method.",
          body: { type: "json", content: { amount: 18450, currency: "usd", customer: "{{customerId}}", payment_method: "pm_1Ox9VISA4242", confirm: true, description: "Invoice INV-2026-0418 — November hygiene visits", metadata: { invoice_id: "{{invoiceId}}", source: "api-test" } } },
          postResponseScript: "ark.env.set(\"paymentIntentId\", ark.response.json().id);",
          tests: "ark.test(\"status is 201\", () => ark.expect(ark.response.status).to.equal(201));\nark.test(\"payment succeeded\", () => {\n  ark.expect(ark.response.json().status).to.equal(\"succeeded\");\n});\nark.test(\"amount matches\", () => ark.expect(ark.response.json().amount).to.equal(18450));",
          assert: { status: 201, "body.status": { eq: "succeeded" }, "body.currency": { eq: "usd" }, responseTime: { lt: 1500 } },
          response: json(201, paymentIntent, { "x-request-id": "req_4Hk1nB8sTq", "idempotent-replayed": "false", "ratelimit-remaining": "97" }) },
        { name: "Get payment intent", method: "GET", url: "{{baseUrl}}/v1/payment_intents/:id", params: { id: "{{paymentIntentId}}" }, headers: ledgerHeaders, response: json(200, paymentIntent) },
        { name: "Capture payment intent", method: "POST", url: "{{baseUrl}}/v1/payment_intents/:id/capture", params: { id: "{{paymentIntentId}}" }, headers: { ...ledgerHeaders, ...idem, "Content-Type": "application/json" },
          body: { type: "json", content: { amount_to_capture: 12000 } },
          response: json(200, { ...paymentIntent, capture_method: "manual", amount_received: 12000 }) },
        { name: "Cancel payment intent", method: "POST", url: "{{baseUrl}}/v1/payment_intents/:id/cancel", params: { id: "{{paymentIntentId}}" }, headers: ledgerHeaders,
          body: { type: "json", content: { cancellation_reason: "abandoned" } },
          response: json(400, { error: { type: "invalid_request_error", code: "payment_intent_unexpected_state", message: "You cannot cancel this PaymentIntent because it has a status of succeeded.", param: null, doc_url: "https://docs.ledgerly.io/errors#payment_intent_unexpected_state" } }) },
        { name: "List charges (last 7 days)", method: "GET", url: "{{baseUrl}}/v1/charges", params: { limit: "50", "created[gte]": "{{$timestamp - 604800}}" }, headers: ledgerHeaders,
          response: json(200, { object: "list", has_more: false, data: [
            { id: "ch_3QzK8f2LmA0x1nC4", amount: 18450, currency: "usd", status: "succeeded", paid: true, customer: "cus_Q8f2LmA0", outcome: { risk_level: "normal", network_status: "approved_by_network" } },
            { id: "ch_3QyR0b9Kt2", amount: 3299, currency: "usd", status: "failed", paid: false, customer: "cus_Q8f9TtB3", failure_code: "card_declined", failure_message: "Your card has insufficient funds." },
            { id: "ch_3Qx77LmQ1", amount: 129900, currency: "usd", status: "pending", paid: false, customer: "cus_QA03nWz2" } ] }) },
        { name: "3DS required card (test)", method: "POST", url: "{{baseUrl}}/v1/payment_intents", headers: { ...ledgerHeaders, ...idem, "Content-Type": "application/json" },
          body: { type: "json", content: { amount: 2500, currency: "eur", payment_method: "pm_card_threeDSecure2Required", confirm: true } },
          response: json(200, { id: "pi_3R0aa3DS", object: "payment_intent", status: "requires_action", next_action: { type: "redirect_to_url", redirect_to_url: { url: "https://hooks.ledgerly.dev/3ds/authenticate/pi_3R0aa3DS", return_url: "ledgerly://payments/return" } } }) },
        { name: "Declined card (test)", method: "POST", url: "{{baseUrl}}/v1/payment_intents", headers: { ...ledgerHeaders, ...idem, "Content-Type": "application/json" },
          body: { type: "json", content: { amount: 1000, currency: "usd", payment_method: "pm_card_chargeDeclined", confirm: true } },
          response: json(402, { error: { type: "card_error", code: "card_declined", decline_code: "generic_decline", message: "Your card was declined.", payment_intent: { id: "pi_3R0bDecl", status: "requires_payment_method" } } }) },
      ] },
      { folder: "Refunds", items: [
        { name: "Create partial refund", method: "POST", url: "{{baseUrl}}/v1/refunds", headers: { ...ledgerHeaders, ...idem, "Content-Type": "application/json" },
          body: { type: "json", content: { payment_intent: "{{paymentIntentId}}", amount: 4250, reason: "requested_by_customer", metadata: { ticket: "SUP-30412" } } },
          assert: { status: 201, "body.status": { eq: "succeeded" } },
          tests: "ark.test(\"refund created\", () => ark.expect(ark.response.status).to.equal(201));\nark.test(\"partial amount\", () => ark.expect(ark.response.json().amount).to.equal(4250));",
          response: json(201, { id: "re_3QzM1vR0aa", object: "refund", amount: 4250, currency: "usd", payment_intent: "pi_3QzK8f2LmA0x1nC4", reason: "requested_by_customer", status: "succeeded", balance_transaction: "txn_3QzM1vR0ab", created: "2026-11-16T15:42:31Z", metadata: { ticket: "SUP-30412" } }) },
        { name: "Full refund", method: "POST", url: "{{baseUrl}}/v1/refunds", headers: { ...ledgerHeaders, ...idem, "Content-Type": "application/json" },
          body: { type: "json", content: { payment_intent: "{{paymentIntentId}}" } },
          response: json(201, { id: "re_3QzM9Full", object: "refund", amount: 18450, currency: "usd", status: "pending", reason: null }) },
        { name: "Refund exceeds amount", method: "POST", url: "{{baseUrl}}/v1/refunds", headers: { ...ledgerHeaders, ...idem, "Content-Type": "application/json" },
          description: "Negative case — should return 400 amount_too_large.",
          body: { type: "json", content: { payment_intent: "{{paymentIntentId}}", amount: 99999 } },
          assert: { status: 400, "body.error.code": { eq: "amount_too_large" } },
          response: json(400, { error: { type: "invalid_request_error", code: "amount_too_large", message: "Refund amount ($999.99) is greater than unrefunded amount on charge ($142.00)", param: "amount" } }) },
        { name: "List refunds", method: "GET", url: "{{baseUrl}}/v1/refunds", params: { limit: "10" }, headers: ledgerHeaders,
          response: json(200, { object: "list", has_more: false, data: [{ id: "re_3QzM1vR0aa", amount: 4250, status: "succeeded" }, { id: "re_3QvA02kk", amount: 1200, status: "failed", failure_reason: "expired_or_canceled_card" }] }) },
      ] },
      { folder: "Invoices", items: [
        { name: "List open invoices", method: "GET", url: "{{baseUrl}}/v1/invoices", params: { status: "open", limit: "25" }, headers: ledgerHeaders,
          response: json(200, { object: "list", has_more: false, data: [
            invoice("inv_8KX2pQ", "INV-2026-0418", "cus_Q8f2LmA0", 18450, "open", "2026-11-30", [{ description: "Hygiene visit ×3", amount: 18450 }]),
            invoice("inv_7Hc0Ys", "INV-2026-0402", "cus_QA03nWz2", 129900, "open", "2026-10-31", [{ description: "Freight audit — Q3", amount: 129900 }]),
            invoice("inv_7Gz1Lp", "INV-2026-0397", "cus_Q9a11Rk7", 4500, "open", "2026-11-05", [{ description: "POS terminal rental — Oct", amount: 4500 }]) ] }) },
        { name: "Create draft invoice", method: "POST", url: "{{baseUrl}}/v1/invoices", headers: { ...ledgerHeaders, ...idem, "Content-Type": "application/json" },
          body: { type: "json", content: { customer: "{{customerId}}", collection_method: "send_invoice", days_until_due: 30, lines: [{ description: "Teeth whitening package", quantity: 1, unit_amount: 32000 }, { description: "Fluoride treatment", quantity: 2, unit_amount: 2500 }] } },
          response: json(201, invoice("inv_8LQ0aa", null, "cus_Q8f2LmA0", 37000, "draft", "2026-12-16", [])) },
        { name: "Finalize invoice", method: "POST", url: "{{baseUrl}}/v1/invoices/:invoiceId/finalize", params: { invoiceId: "{{invoiceId}}" }, headers: ledgerHeaders,
          response: json(200, invoice("inv_8KX2pQ", "INV-2026-0418", "cus_Q8f2LmA0", 18450, "open", "2026-11-30", [])) },
        { name: "Void invoice", method: "POST", url: "{{baseUrl}}/v1/invoices/:invoiceId/void", params: { invoiceId: "{{invoiceId}}" }, headers: ledgerHeaders,
          response: json(200, invoice("inv_8KX2pQ", "INV-2026-0418", "cus_Q8f2LmA0", 18450, "void", "2026-11-30", [])) },
        { name: "Mark uncollectible", method: "POST", url: "{{baseUrl}}/v1/invoices/:invoiceId/mark_uncollectible", params: { invoiceId: "inv_7Hc0Ys" }, headers: ledgerHeaders,
          response: json(200, invoice("inv_7Hc0Ys", "INV-2026-0402", "cus_QA03nWz2", 129900, "uncollectible", "2026-10-31", [])) },
        { name: "Download invoice PDF", method: "GET", url: "{{baseUrl}}/v1/invoices/:invoiceId/pdf", params: { invoiceId: "{{invoiceId}}" }, headers: { Accept: "application/pdf" },
          response: { status: 200, body: "%PDF-1.7\n%âãÏÓ\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n…(binary content truncated)…", headers: { "content-type": "application/pdf", "content-disposition": "attachment; filename=INV-2026-0418.pdf" } } },
      ] },
      { folder: "Payouts", items: [
        { name: "List payouts", method: "GET", url: "{{baseUrl}}/v1/payouts", params: { limit: "10", starting_after: "" }, headers: ledgerHeaders,
          response: json(200, { object: "list", has_more: true, data: [
            { id: "po_1QzA01", amount: 842310, currency: "usd", arrival_date: "2026-11-18", status: "in_transit", method: "standard", destination: "ba_1Mx…6789" },
            { id: "po_1Qy9Z2", amount: 911002, currency: "usd", arrival_date: "2026-11-11", status: "paid", method: "standard" },
            { id: "po_1Qx0B3", amount: 15000, currency: "usd", arrival_date: "2026-11-06", status: "failed", failure_code: "account_closed" } ] }) },
        { name: "Create instant payout", method: "POST", url: "{{baseUrl}}/v1/payouts", headers: { ...ledgerHeaders, ...idem, "Content-Type": "application/json" },
          body: { type: "json", content: { amount: 50000, currency: "usd", method: "instant", statement_descriptor: "LEDGERLY PAYOUT" } },
          response: json(201, { id: "po_1QzB77Inst", amount: 50000, currency: "usd", method: "instant", status: "pending", arrival_date: "2026-11-16" }) },
        { name: "Get balance", method: "GET", url: "{{baseUrl}}/v1/balance", headers: ledgerHeaders,
          response: json(200, { object: "balance", available: [{ amount: 1284530, currency: "usd" }, { amount: 92010, currency: "eur" }], pending: [{ amount: 318900, currency: "usd" }], instant_available: [{ amount: 500000, currency: "usd" }] }) },
      ] },
      { folder: "Webhooks", items: [
        { name: "List webhook endpoints", method: "GET", url: "{{baseUrl}}/v1/webhook_endpoints", headers: ledgerHeaders,
          response: json(200, { object: "list", data: [
            { id: "we_1PqAa", url: "https://hooks.harborviewdental.com/ledgerly", enabled_events: ["payment_intent.succeeded", "invoice.paid"], status: "enabled", api_version: "2026-09-01" },
            { id: "we_1PqBb", url: "https://requestbin.ledgerly.dev/r/dana-test", enabled_events: ["*"], status: "disabled" } ] }) },
        { name: "Register webhook endpoint", method: "POST", url: "{{baseUrl}}/v1/webhook_endpoints", headers: { ...ledgerHeaders, "Content-Type": "application/json" },
          body: { type: "json", content: { url: "https://ngrok-free.app/dana/ledgerly-hooks", enabled_events: ["payment_intent.succeeded", "payment_intent.payment_failed", "charge.refunded"], description: "local dev via ngrok" } },
          response: json(201, { id: "we_1QzC9x", url: "https://ngrok-free.app/dana/ledgerly-hooks", secret: "whsec_8c1f…", status: "enabled" }) },
        { name: "Replay event", method: "POST", url: "{{baseUrl}}/v1/events/:eventId/replay", params: { eventId: "evt_3QzK8f2Lm" }, headers: ledgerHeaders,
          response: json(202, { id: "evt_3QzK8f2Lm", replayed: true, delivery_attempts: 4 }) },
        { name: "Simulate payment_intent.succeeded", method: "POST", url: "http://localhost:3001/webhooks/ledgerly", auth: { type: "none" },
          headers: { "Content-Type": "application/json", "Ledgerly-Signature": "t={{$timestamp}},v1={{signature}}" },
          preRequestScript: "// compute HMAC signature for the payload\nconst payload = ark.request.body;\nconst sig = ark.crypto.hmacSha256(ark.env.get(\"webhookSecret\"), `${Date.now()}.${payload}`);\nark.env.set(\"signature\", sig);",
          body: { type: "json", content: { id: "evt_3QzK8f2Lm", type: "payment_intent.succeeded", data: { object: { id: "pi_3QzK8f2LmA0x1nC4", amount: 18450, status: "succeeded" } } } },
          response: json(200, { received: true }) },
      ] },
      { name: "Health check", method: "GET", url: "{{baseUrl}}/healthz", auth: { type: "none" },
        response: json(200, { status: "ok", version: "payments-core@4.31.2", commit: "9e1c4b2", db: "ok", redis: "ok", uptime_s: 380211 }) },
    ],
  },
  {
    name: "GitHub REST",
    path: "~/work/collections/github-rest",
    defaults: { auth: { type: "bearer", token: "{{githubToken}}" }, sendCookies: false, storeCookies: false, persistCookies: false },
    environments: [
      { name: "github.com", scope: "shared", secrets: ["githubToken"], variables: { baseUrl: "https://api.github.com", owner: "ledgerly", repo: "payments-core", githubToken: "ghp_placeholderLocalOnly000000000000" } },
      { name: "GHE (corp)", scope: "personal", secrets: ["githubToken"], variables: { baseUrl: "https://github.ledgerly.internal/api/v3", owner: "platform", repo: "infra-terraform", githubToken: "" } },
    ],
    git: null,
    items: [
      { folder: "Repos", items: [
        { name: "Get repository", method: "GET", url: "{{baseUrl}}/repos/{{owner}}/{{repo}}", headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
          response: json(200, { id: 618204331, name: "payments-core", full_name: "ledgerly/payments-core", private: true, default_branch: "main", open_issues_count: 37, stargazers_count: 12, language: "Go", pushed_at: "2026-11-16T14:58:02Z", visibility: "private", topics: ["payments", "grpc", "postgres"] }, { "x-ratelimit-limit": "5000", "x-ratelimit-remaining": "4931" }) },
        { name: "List org repos", method: "GET", url: "{{baseUrl}}/orgs/{{owner}}/repos", params: { per_page: "50", sort: "pushed" }, headers: { Accept: "application/vnd.github+json" },
          response: json(200, [{ name: "payments-core", private: true, language: "Go" }, { name: "ledgerly-web", private: true, language: "TypeScript" }, { name: "mobile-ios", private: true, language: "Swift" }, { name: "openapi-specs", private: false, language: null }]) },
        { name: "List releases", method: "GET", url: "{{baseUrl}}/repos/{{owner}}/{{repo}}/releases", params: { per_page: "5" },
          response: json(200, [{ tag_name: "v4.31.2", name: "4.31.2 — refunds hotfix", draft: false, prerelease: false, published_at: "2026-11-12T19:01:44Z" }, { tag_name: "v4.31.0", name: "4.31.0", published_at: "2026-11-03T16:20:00Z" }]) },
      ] },
      { folder: "Pulls", items: [
        { name: "List open pull requests", method: "GET", url: "{{baseUrl}}/repos/{{owner}}/{{repo}}/pulls", params: { state: "open", per_page: "30" }, headers: { Accept: "application/vnd.github+json" },
          response: json(200, [
            { number: 1482, title: "Partial refunds: support multiple refunds per charge", user: { login: "danaokafor" }, draft: false, created_at: "2026-11-10T10:12:00Z", labels: [{ name: "payments" }, { name: "needs-review" }] },
            { number: 1479, title: "chore(deps): bump google.golang.org/grpc from 1.67.1 to 1.68.0", user: { login: "dependabot[bot]" }, draft: false, created_at: "2026-11-08T04:00:11Z" },
            { number: 1471, title: "WIP: payout batching experiment", user: { login: "jreyes" }, draft: true, created_at: "2026-10-28T21:44:09Z" } ]) },
        { name: "Create pull request", method: "POST", url: "{{baseUrl}}/repos/{{owner}}/{{repo}}/pulls", headers: { Accept: "application/vnd.github+json", "Content-Type": "application/json" },
          body: { type: "json", content: { title: "Refund edge cases", head: "feature/partial-refunds", base: "main", body: "Adds amount_too_large + zero-amount validation.\n\nCloses #1460" } },
          response: json(201, { number: 1483, html_url: "https://github.com/ledgerly/payments-core/pull/1483", state: "open" }) },
        { name: "Request reviewers", method: "POST", url: "{{baseUrl}}/repos/{{owner}}/{{repo}}/pulls/1482/requested_reviewers", body: { type: "json", content: { reviewers: ["pnatarajan", "jreyes"] } },
          response: json(201, { number: 1482, requested_reviewers: [{ login: "pnatarajan" }, { login: "jreyes" }] }) },
      ] },
      { folder: "Issues", items: [
        { name: "Search issues assigned to me", method: "GET", url: "{{baseUrl}}/search/issues?q=is:open+assignee:@me+org:{{owner}}",
          response: json(200, { total_count: 9, incomplete_results: false, items: [{ number: 1460, title: "Refund API accepts zero amount", state: "open" }, { number: 1391, title: "Webhook retries don't respect Retry-After", state: "open" }] }) },
        { name: "Create issue", method: "POST", url: "{{baseUrl}}/repos/{{owner}}/{{repo}}/issues", body: { type: "json", content: { title: "Payout list ignores ending_before", labels: ["bug", "payouts"] } },
          response: json(201, { number: 1484, state: "open", title: "Payout list ignores ending_before" }) },
      ] },
      { name: "Rate limit", method: "GET", url: "{{baseUrl}}/rate_limit",
        response: json(200, { resources: { core: { limit: 5000, used: 69, remaining: 4931, reset: 1794843600 }, search: { limit: 30, used: 2, remaining: 28 }, graphql: { limit: 5000, used: 0, remaining: 5000 } } }) },
      { name: "Workflow runs (failed)", method: "GET", url: "{{baseUrl}}/repos/{{owner}}/{{repo}}/actions/runs", params: { status: "failure", per_page: "10" },
        response: json(200, { total_count: 4, workflow_runs: [{ id: 11823004112, name: "CI", head_branch: "feature/partial-refunds", conclusion: "failure", run_started_at: "2026-11-15T22:10:07Z" }] }) },
    ],
  },
  {
    name: "Fleet Tracking Service",
    path: "~/work/fleetline/fleet-tracking",
    defaults: { auth: { type: "api-key", key: "X-Api-Key", value: "{{apiKey}}", addTo: "header" }, sendCookies: true, storeCookies: true, persistCookies: true },
    environments: [
      { name: "Dev cluster", scope: "shared", secrets: ["apiKey"], variables: { baseUrl: "https://fleet-dev.fleetline.internal", wsUrl: "wss://fleet-dev.fleetline.internal/ws", grpcHost: "fleet-dev.fleetline.internal:443", apiKey: "flt_dev_3c0ffee", vehicleId: "VH-20931" } },
      { name: "Local docker", scope: "shared", secrets: [], variables: { baseUrl: "http://localhost:7070", wsUrl: "ws://localhost:7070/ws", grpcHost: "localhost:50051", apiKey: "local", vehicleId: "VH-00001" } },
    ],
    git: null,
    items: [
      { folder: "Vehicles", items: [
        { name: "List vehicles", method: "GET", url: "{{baseUrl}}/v2/vehicles", params: { depot: "SEA-02", status: "active", limit: "100" },
          response: json(200, { total: 214, items: [
            { id: "VH-20931", plate: "C47219K", make: "Ford", model: "E-Transit", depot: "SEA-02", status: "en_route", battery_pct: 64, last_ping: "2026-11-16T15:41:20Z" },
            { id: "VH-20944", plate: "C47233K", make: "Rivian", model: "EDV 700", depot: "SEA-02", status: "charging", battery_pct: 22, last_ping: "2026-11-16T15:40:58Z" },
            { id: "VH-18802", plate: "B90012J", make: "Mercedes", model: "eSprinter", depot: "SEA-02", status: "maintenance", battery_pct: 91, last_ping: "2026-11-15T23:02:11Z" } ] }) },
        { name: "Get vehicle", method: "GET", url: "{{baseUrl}}/v2/vehicles/{{vehicleId}}",
          response: json(200, { id: "VH-20931", plate: "C47219K", vin: "1FTBW9CK3PKA20931", make: "Ford", model: "E-Transit", year: 2024, depot: "SEA-02", driver: { id: "DR-5521", name: "Luis Ortega" }, odometer_km: 48211.4, status: "en_route" }) },
        { name: "Update vehicle status", method: "PUT", url: "{{baseUrl}}/v2/vehicles/{{vehicleId}}/status", body: { type: "json", content: { status: "maintenance", reason: "Brake pad wear sensor", expected_back: "2026-11-18T08:00:00-08:00" } },
          response: json(200, { id: "VH-20931", status: "maintenance" }) },
        { name: "Positions export (XML)", method: "GET", url: "{{baseUrl}}/v1/legacy/positions.xml", params: { since: "2026-11-16T00:00:00Z" }, headers: { Accept: "application/xml" },
          response: { status: 200, headers: { "content-type": "application/xml" }, body: "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<positions generated=\"2026-11-16T15:42:00Z\">\n  <position vehicle=\"VH-20931\" lat=\"47.6097\" lon=\"-122.3331\" speed_kph=\"38\" heading=\"271\"/>\n  <position vehicle=\"VH-20944\" lat=\"47.5480\" lon=\"-122.3270\" speed_kph=\"0\" heading=\"0\"/>\n</positions>" } },
      ] },
      { folder: "Trips", items: [
        { name: "Create trip", method: "POST", url: "{{baseUrl}}/v2/trips", body: { type: "json", content: { vehicle_id: "{{vehicleId}}", driver_id: "DR-5521", stops: [{ address: "1201 3rd Ave, Seattle, WA", window: ["09:00", "10:30"] }, { address: "400 Broad St, Seattle, WA", window: ["11:00", "12:00"] }] } },
          response: json(201, { id: "TR-88120", status: "scheduled", eta_minutes: 74, distance_km: 18.2 }) },
        { name: "Trip history", method: "GET", url: "{{baseUrl}}/v2/vehicles/{{vehicleId}}/trips", params: { from: "2026-11-01", to: "2026-11-16" },
          response: json(200, { items: [{ id: "TR-88111", status: "completed", distance_km: 42.7 }, { id: "TR-88097", status: "cancelled", cancel_reason: "customer_unavailable" }] }) },
        { name: "Bulk upload trips (CSV)", method: "POST", url: "{{baseUrl}}/v2/trips/import", headers: { "Content-Type": "multipart/form-data" },
          body: { type: "form-data", content: "" }, response: json(202, { job_id: "imp_7731", status: "queued", rows: 312 }) },
      ] },
      { folder: "GraphQL", items: [
        { name: "Vehicle with last trips", method: "POST", url: "{{baseUrl}}/graphql", protocol: "graphql",
          body: { type: "graphql", content: "query VehicleWithTrips($id: ID!, $n: Int = 5) {\n  vehicle(id: $id) {\n    id\n    plate\n    status\n    batteryPct\n    lastTrips(first: $n) {\n      id\n      status\n      distanceKm\n      completedAt\n    }\n  }\n}" },
          response: json(200, { data: { vehicle: { id: "VH-20931", plate: "C47219K", status: "EN_ROUTE", batteryPct: 64, lastTrips: [{ id: "TR-88111", status: "COMPLETED", distanceKm: 42.7, completedAt: "2026-11-15T19:22:10Z" }, { id: "TR-88104", status: "COMPLETED", distanceKm: 12.9, completedAt: "2026-11-15T13:05:51Z" }] } } }) },
        { name: "Depot utilization", method: "POST", url: "{{baseUrl}}/graphql", protocol: "graphql",
          body: { type: "graphql", content: "query { depots { code name vehiclesTotal vehiclesCharging utilization } }" },
          response: json(200, { data: { depots: [{ code: "SEA-02", name: "SoDo", vehiclesTotal: 64, vehiclesCharging: 11, utilization: 0.83 }, { code: "SEA-05", name: "Ballard", vehiclesTotal: 38, vehiclesCharging: 4, utilization: 0.71 }] } }) },
      ] },
      { folder: "Realtime", items: [
        { name: "Live positions stream", method: "GET", url: "{{wsUrl}}/positions?depot=SEA-02", protocol: "websocket" },
        { name: "Dispatch events (SSE)", method: "GET", url: "{{baseUrl}}/v2/dispatch/events", protocol: "sse" },
        { name: "Telemetry.StreamVehicle", method: "POST", url: "{{grpcHost}}", protocol: "grpc" },
      ] },
    ],
  },
  {
    name: "Getting Started",
    path: "~/ApiArk/getting-started",
    environments: [{ name: "Default", scope: "shared", secrets: [], variables: { baseUrl: "https://httpbin.org" } }],
    git: null,
    items: [
      { folder: "basics", items: [
        { name: "Simple GET", method: "GET", url: "{{baseUrl}}/get", description: "A basic GET request to httpbin.org",
          response: json(200, { args: {}, headers: { Accept: "*/*", Host: "httpbin.org", "User-Agent": "ApiArk/0.4.6" }, origin: "73.118.20.4", url: "https://httpbin.org/get" }) },
        { name: "POST JSON", method: "POST", url: "{{baseUrl}}/post", description: "Send a JSON body to httpbin.org", body: { type: "json", content: "{\n  \"name\": \"ApiArk\",\n  \"version\": \"1.0\"\n}\n" },
          response: json(200, { json: { name: "ApiArk", version: "1.0" }, url: "https://httpbin.org/post" }) },
        { name: "Bearer Auth", method: "GET", url: "{{baseUrl}}/bearer", auth: { type: "bearer", token: "my-secret-token" }, description: "GET request with Bearer token authentication",
          response: json(200, { authenticated: true, token: "my-secret-token" }) },
        { name: "Query Parameters", method: "GET", url: "{{baseUrl}}/get", params: { page: "1", limit: "10", search: "hello" }, description: "GET request with query parameters",
          response: json(200, { args: { limit: "10", page: "1", search: "hello" }, url: "https://httpbin.org/get?page=1&limit=10&search=hello" }) },
      ] },
    ],
  },
];

// ── Back-office admin collection (generated from a resource table) ──
const adminResources = [
  ["Disputes", "disputes", "dp", [["needs_response", 3], ["under_review", 2], ["won", 1], ["lost", 1]], ["Submit evidence", "POST", "/:id/evidence", { evidence: { customer_communication: "file_8Xq1", receipt: "file_8Xq2", uncategorized_text: "Customer confirmed delivery via email on 2026-10-02." } }]],
  ["KYC reviews", "kyc/reviews", "kyc", [["pending", 5], ["approved", 3], ["rejected", 1], ["escalated", 1]], ["Approve review", "POST", "/:id/approve", { reviewer: "dana.okafor", note: "Docs match registry; UBO verified." }]],
  ["Merchant risk flags", "risk/flags", "rf", [["open", 4], ["snoozed", 2], ["resolved", 6]], ["Snooze flag", "POST", "/:id/snooze", { until: "2026-12-01", reason: "Seasonal spike (Black Friday)" }]],
  ["Feature flags", "flags", "ff", [["on", 3], ["off", 4]], ["Toggle flag", "PATCH", "/:id", { enabled: true, rollout_pct: 25, segments: ["beta_merchants"] }]],
  ["Support tickets", "support/tickets", "SUP", [["open", 6], ["pending_customer", 3], ["closed", 9]], ["Add internal note", "POST", "/:id/notes", { body: "Refund issued (re_3QzM1vR0aa). Waiting on bank to settle — ETA 5-10 business days.", visibility: "internal" }]],
];
const merchantNames = ["Harborview Dental Group", "Kettle & Crumb Bakery", "Northwind Freight LLC", "Bright Path Tutoring", "Lumen Yoga Studio", "Cascade Bike Works", "Pho Real Kitchen", "Atlas Legal PLLC", "Greenline Pharmacy", "Juniper & Co. Florals"];
const adminItems = adminResources.map(([label, path, prefix, states, action], ri) => {
  let n = 0;
  const rows = states.flatMap(([st, count]) => Array.from({ length: count }, () => {
    n++;
    return { id: `${prefix}_${(ri * 97 + n * 31).toString(36).padStart(4, "0")}`, status: st, merchant: merchantNames[(n + ri) % merchantNames.length],
      created: new Date(Date.UTC(2026, 6 + (n % 5), 1 + ((n * 7) % 27), 9 + (n % 8))).toISOString(),
      ...(prefix === "dp" ? { amount: 1500 + n * 2375, reason: ["fraudulent", "product_not_received", "duplicate", "subscription_canceled"][n % 4], due_by: `2026-11-${String(18 + (n % 10)).padStart(2, "0")}` } : {}),
      ...(prefix === "rf" ? { rule: ["velocity_24h", "high_refund_rate", "mismatched_bin_country", "new_device_large_ticket"][n % 4], score: 41 + ((n * 13) % 58) } : {}),
      ...(prefix === "ff" ? { key: ["instant_payouts_v2", "refunds_partial_multi", "invoice_pdf_v3", "3ds_exemptions", "smart_retries", "new_dashboard_nav", "webhook_v2_signing"][n - 1], rollout_pct: [100, 25, 0, 50, 10, 0, 100][n - 1] } : {}),
      ...(prefix === "SUP" ? { subject: ["Payout didn't arrive", "Refund still pending after 10 days", "Can't add second bank account", "Invoice PDF shows wrong tax", "API 429s during checkout rush", "How do I rotate webhook secret?", "Chargeback evidence upload fails", "Statement descriptor typo"][n % 8], priority: ["low", "normal", "high", "urgent"][n % 4] } : {}),
    };
  }));
  const one = rows[0];
  return { folder: label, items: [
    { name: `List ${label.toLowerCase()}`, method: "GET", url: `{{adminUrl}}/admin/v1/${path}`, params: { status: states[0][0], limit: "50" },
      response: json(200, { object: "list", total: rows.length * 14 + 3, data: rows }) },
    { name: `Get ${label.toLowerCase().replace(/s$/, "")}`, method: "GET", url: `{{adminUrl}}/admin/v1/${path}/:id`, params: { id: one.id }, response: json(200, { ...one, history: [{ at: one.created, by: "system", event: "created" }, { at: "2026-11-14T10:02:00Z", by: "dana.okafor", event: "viewed" }] }) },
    { name: action[0], method: action[1], url: `{{adminUrl}}/admin/v1/${path}${action[2]}`, params: { id: one.id }, headers: { "Content-Type": "application/json", "X-Admin-Reason": "routine ops" },
      body: { type: "json", content: action[3] }, response: json(200, { ...one, updated: true }) },
  ] };
});
adminItems.push(
  { name: "tmp – debug 500 on CSV export", method: "GET", url: "{{adminUrl}}/admin/v1/exports/transactions.csv?from=2026-10-01&to=2026-10-31&merchant=cus_QA03nWz2",
    description: "Repro for INC-2291. Delete once fixed.", response: json(500, { error: { type: "api_error", message: "An unexpected error occurred.", request_id: "req_Zx91Kq0b2f" } }) },
  { name: "copy of List disputes", method: "GET", url: "{{adminUrl}}/admin/v1/disputes?status=needs_response&limit=5" },
  { name: "Untitled request", method: "GET", url: "" },
);
COLLECTIONS.splice(1, 0, {
  name: "Ledgerly Back-office",
  path: "~/work/ledgerly/backoffice-admin",
  defaults: { auth: { type: "oauth2", grantType: "authorization_code", authUrl: "https://sso.ledgerly.io/oauth2/authorize", tokenUrl: "https://sso.ledgerly.io/oauth2/token", clientId: "backoffice-apiark", clientSecret: "", scope: "admin:read admin:write", callbackUrl: "http://localhost:9876/callback", username: "", password: "", usePkce: true }, sendCookies: true, storeCookies: true, persistCookies: false },
  environments: [
    { name: "Staging admin", scope: "shared", secrets: [], variables: { adminUrl: "https://admin.staging.ledgerly.io" } },
    { name: "Prod admin (careful!)", scope: "shared", secrets: [], variables: { adminUrl: "https://admin.ledgerly.io" } },
  ],
  git: { branch: "main", ahead: 0, behind: 3, changes: [], log: [["f1e2d3c", "Add feature flag toggles", "Priya Natarajan", 4.0], ["aa09b81", "KYC approve/reject requests", "Dana Okafor", 12.5], ["6c7d8e9", "Initial back-office collection", "Jae Reyes", 61.0]], diff: "" },
  items: adminItems,
});
