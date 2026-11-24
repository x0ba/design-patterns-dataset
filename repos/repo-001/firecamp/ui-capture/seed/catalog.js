/** Collection / environment content for the seed. Each workspace gets collections typical of its team. */
const bearer = (token) => ({ type: 'bearer', value: { token, prefix: 'Bearer' } });
const JSONH = ['Content-Type', 'application/json'];
const IDEM = ['Idempotency-Key', '{{$randomUUID}}', 'Required for all POSTs that move money'];

const authTest = `fc.test('status is 200', () => {
  fc.expect(fc.response.code).to.equal(200);
});
const body = fc.response.json();
fc.environment.set('accessToken', body.access_token);`;

const statusTest = (code = 200) => `fc.test('returns ${code}', () => {
  fc.expect(fc.response.code).to.equal(${code});
});`;

exports.lib = ({ workspaces, addCollection, addEnv }) => {
  const [pay, mobile, partner, data, kestrel, personal] = workspaces;

  /* ============================ Payments Platform ============================ */
  addCollection(pay, {
    name: 'Payments API v2',
    description: '## Payments API v2\nPublic merchant-facing API. Every money-moving POST **must** send an `Idempotency-Key`.\n\n- Owner: @mayaokafor\n- Runbook: https://wiki.ledgerly.io/payments/runbook\n- Rate limit: 100 req/s per merchant',
    auth: bearer('{{accessToken}}'),
    pre: `// attach a correlation id to every request
fc.request.headers.add({ key: 'X-Request-Id', value: fc.variables.replaceIn('{{$randomUUID}}') });`,
    variables: [['apiVersion', '2026-06-01'], ['defaultCurrency', 'USD']],
    items: [
      { folder: 'Authentication', auth: { type: 'none', value: '' }, items: [
        { name: 'Get access token (client credentials)', method: 'POST', url: '{{baseUrl}}/oauth/token', form: [['grant_type', 'client_credentials'], ['client_id', '{{clientId}}'], ['client_secret', '{{clientSecret}}'], ['scope', 'payments:write refunds:write payouts:read']], test: authTest, desc: 'Run this first. Stores `accessToken` in the active environment.' },
        { name: 'Refresh token', method: 'POST', url: '{{baseUrl}}/oauth/token', form: [['grant_type', 'refresh_token'], ['refresh_token', '{{refreshToken}}']], test: authTest },
        { name: 'Introspect token', method: 'POST', url: '{{baseUrl}}/oauth/introspect', form: [['token', '{{accessToken}}']] },
        { name: 'Revoke token', method: 'POST', url: '{{baseUrl}}/oauth/revoke', form: [['token', '{{accessToken}}'], ['token_type_hint', 'access_token']] },
      ] },
      { folder: 'Customers', items: [
        { name: 'List customers', method: 'GET', url: '{{baseUrl}}/v2/customers?limit=25&starting_after=&email=&created[gte]=1735689600', disabledQuery: ['starting_after', 'email', 'created[gte]'], test: statusTest() },
        { name: 'Create customer', method: 'POST', url: '{{baseUrl}}/v2/customers', headers: [JSONH, IDEM], json: { name: 'Brightwater Outfitters LLC', email: 'ap@brightwater-outfitters.com', phone: '+1 503 555 0142', metadata: { crm_id: 'HS-88213', segment: 'mid-market' }, address: { line1: '1220 SE Hawthorne Blvd', city: 'Portland', state: 'OR', postal_code: '97214', country: 'US' } }, test: statusTest(201) },
        { name: 'Retrieve customer', method: 'GET', url: '{{baseUrl}}/v2/customers/:customerId?expand=default_payment_method', pathValues: { customerId: 'cus_Qx81LmT0aZ' } },
        { name: 'Update customer', method: 'PATCH', url: '{{baseUrl}}/v2/customers/:customerId', pathValues: { customerId: 'cus_Qx81LmT0aZ' }, headers: [JSONH], json: { email: 'payables@brightwater-outfitters.com', metadata: { segment: 'enterprise' } } },
        { name: 'Delete customer', method: 'DELETE', url: '{{baseUrl}}/v2/customers/:customerId', pathValues: { customerId: 'cus_TEST_DELETE_ME' }, desc: 'Soft-deletes. Fails with 409 if the customer has open invoices.' },
        { name: 'Search customers', method: 'GET', url: "{{baseUrl}}/v2/customers/search?query=metadata['segment']:'enterprise' AND created>1751328000&limit=50" },
        { name: 'Attach payment method', method: 'POST', url: '{{baseUrl}}/v2/customers/:customerId/payment_methods', pathValues: { customerId: 'cus_Qx81LmT0aZ' }, headers: [JSONH], json: { payment_method: 'pm_card_visa', set_default: true } },
        { name: 'List payment methods', method: 'GET', url: '{{baseUrl}}/v2/customers/:customerId/payment_methods?type=card', pathValues: { customerId: 'cus_Qx81LmT0aZ' } },
      ] },
      { folder: 'Payment Intents', items: [
        { name: 'Create payment intent', method: 'POST', url: '{{baseUrl}}/v2/payment_intents', headers: [JSONH, IDEM], json: { amount: 248900, currency: '{{defaultCurrency}}', customer: 'cus_Qx81LmT0aZ', capture_method: 'manual', description: 'Invoice INV-2026-00417 — 14x Alpine Pro tents', statement_descriptor_suffix: 'BRIGHTWATER', metadata: { invoice_id: 'INV-2026-00417', order_ref: 'SO-55120' } }, test: `${statusTest(201)}\nfc.environment.set('paymentIntentId', fc.response.json().id);` },
        { name: 'Confirm payment intent', method: 'POST', url: '{{baseUrl}}/v2/payment_intents/:id/confirm', pathValues: { id: '{{paymentIntentId}}' }, headers: [JSONH, IDEM], json: { payment_method: 'pm_card_visa', return_url: 'https://merchant.example.com/checkout/complete' } },
        { name: 'Capture payment intent', method: 'POST', url: '{{baseUrl}}/v2/payment_intents/:id/capture', pathValues: { id: '{{paymentIntentId}}' }, headers: [JSONH, IDEM], json: { amount_to_capture: 248900 } },
        { name: 'Partial capture (split shipment)', method: 'POST', url: '{{baseUrl}}/v2/payment_intents/:id/capture', pathValues: { id: '{{paymentIntentId}}' }, headers: [JSONH, IDEM], json: { amount_to_capture: 120000, final_capture: false }, desc: 'Multi-capture is only enabled for merchants on the `multicapture_beta` flag.' },
        { name: 'Cancel payment intent', method: 'POST', url: '{{baseUrl}}/v2/payment_intents/:id/cancel', pathValues: { id: '{{paymentIntentId}}' }, headers: [JSONH], json: { cancellation_reason: 'requested_by_customer' } },
        { name: 'Retrieve payment intent', method: 'GET', url: '{{baseUrl}}/v2/payment_intents/:id?expand=latest_charge', pathValues: { id: '{{paymentIntentId}}' } },
        { name: 'List payment intents', method: 'GET', url: '{{baseUrl}}/v2/payment_intents?limit=50&customer=cus_Qx81LmT0aZ&status=requires_capture', disabledQuery: ['customer'] },
        { name: '3DS challenge simulation', method: 'POST', url: '{{baseUrl}}/v2/test_helpers/payment_intents/:id/simulate_3ds', pathValues: { id: '{{paymentIntentId}}' }, headers: [JSONH], json: { outcome: 'challenge_failed' } },
      ] },
      { folder: 'Refunds', items: [
        { name: 'Create refund', method: 'POST', url: '{{baseUrl}}/v2/refunds', headers: [JSONH, IDEM], json: { payment_intent: '{{paymentIntentId}}', amount: 17780, reason: 'requested_by_customer', metadata: { zendesk_ticket: '#48211' } }, test: statusTest(201) },
        { name: 'Retrieve refund', method: 'GET', url: '{{baseUrl}}/v2/refunds/:refundId', pathValues: { refundId: 're_3PbL2c9Hd' } },
        { name: 'List refunds', method: 'GET', url: '{{baseUrl}}/v2/refunds?limit=20&payment_intent={{paymentIntentId}}' },
        { name: 'Cancel pending refund', method: 'POST', url: '{{baseUrl}}/v2/refunds/:refundId/cancel', pathValues: { refundId: 're_3PbL2c9Hd' } },
      ] },
      { folder: 'Payouts', items: [
        { name: 'List payouts', method: 'GET', url: '{{baseUrl}}/v2/payouts?limit=30&status=in_transit&arrival_date[gte]=1762300800' },
        { name: 'Create instant payout', method: 'POST', url: '{{baseUrl}}/v2/payouts', headers: [JSONH, IDEM, ['Ledgerly-Account', 'acct_1Nv0FGQ9RKHgCVdK']], json: { amount: 1250000, currency: 'usd', method: 'instant', destination: 'ba_1OyW2kQ9RKHgCVdK', statement_descriptor: 'LEDGERLY PAYOUT' } },
        { name: 'Retrieve payout', method: 'GET', url: '{{baseUrl}}/v2/payouts/:payoutId', pathValues: { payoutId: 'po_1Q7k0BQ9RKHgCVdK' } },
        { name: 'Payout reconciliation report', method: 'GET', url: '{{baseUrl}}/v2/payouts/:payoutId/balance_transactions?limit=100', pathValues: { payoutId: 'po_1Q7k0BQ9RKHgCVdK' } },
      ] },
      { folder: 'Disputes', items: [
        { name: 'List open disputes', method: 'GET', url: '{{baseUrl}}/v2/disputes?status=needs_response&limit=25' },
        { name: 'Retrieve dispute', method: 'GET', url: '{{baseUrl}}/v2/disputes/:disputeId', pathValues: { disputeId: 'dp_1QAZ8mQ9RKHgCVdK' } },
        { folder: 'Evidence', items: [
          { name: 'Upload evidence file', method: 'POST', url: '{{filesUrl}}/v2/files', multipart: [['purpose', 'dispute_evidence'], ['file', '', 'file']] },
          { name: 'Submit evidence', method: 'POST', url: '{{baseUrl}}/v2/disputes/:disputeId', pathValues: { disputeId: 'dp_1QAZ8mQ9RKHgCVdK' }, headers: [JSONH], json: { evidence: { customer_email_address: 'jordan.lee@gmail.com', shipping_tracking_number: '1Z999AA10123456784', shipping_carrier: 'UPS', uncategorized_text: 'Customer signed for delivery on 2026-10-02. Photo of signed POD attached.' }, submit: true } },
        ] },
        { name: 'Accept dispute (close)', method: 'POST', url: '{{baseUrl}}/v2/disputes/:disputeId/close', pathValues: { disputeId: 'dp_1QAZ8mQ9RKHgCVdK' } },
      ] },
      { folder: 'Webhooks', items: [
        { name: 'List webhook endpoints', method: 'GET', url: '{{baseUrl}}/v2/webhook_endpoints' },
        { name: 'Register webhook endpoint', method: 'POST', url: '{{baseUrl}}/v2/webhook_endpoints', headers: [JSONH], json: { url: 'https://hooks.brightwater-outfitters.com/ledgerly', enabled_events: ['payment_intent.succeeded', 'payment_intent.payment_failed', 'charge.refunded', 'payout.paid', 'charge.dispute.created'], api_version: '{{apiVersion}}' } },
        { name: 'Rotate signing secret', method: 'POST', url: '{{baseUrl}}/v2/webhook_endpoints/:endpointId/rotate_secret', pathValues: { endpointId: 'we_1P2s7rQ9RKHgCVdK' }, headers: [JSONH], json: { expire_previous_in_hours: 24 } },
        { name: 'Resend event', method: 'POST', url: '{{baseUrl}}/v2/events/:eventId/resend', pathValues: { eventId: 'evt_1QBc4hQ9RKHgCVdK' }, headers: [JSONH], json: { endpoint: 'we_1P2s7rQ9RKHgCVdK' } },
        { name: 'List recent events', method: 'GET', url: '{{baseUrl}}/v2/events?type=payment_intent.*&limit=50&delivery_success=false', disabledQuery: ['delivery_success'] },
      ] },
      { name: 'Health check', method: 'GET', url: '{{baseUrl}}/healthz', auth: { type: 'none', value: '' }, test: statusTest() },
      { name: 'Get balance', method: 'GET', url: '{{baseUrl}}/v2/balance' },
    ],
  }, 300);

  addCollection(pay, {
    name: 'Ledger Service (internal)',
    description: 'Double-entry ledger. **Internal only** — requests need the mTLS sidecar or VPN.\nAll amounts are minor units (cents).',
    auth: bearer('{{internalServiceToken}}'),
    items: [
      { folder: 'Accounts', items: [
        { name: 'List ledger accounts', method: 'GET', url: '{{ledgerUrl}}/accounts?type=liability&currency=USD&page_size=100' },
        { name: 'Create ledger account', method: 'POST', url: '{{ledgerUrl}}/accounts', headers: [JSONH], json: { name: 'Merchant pending balance — acct_1Nv0FG', type: 'liability', normal_balance: 'credit', currency: 'USD', external_id: 'merchant:acct_1Nv0FGQ9RKHgCVdK:pending' } },
        { name: 'Get account balance (as of)', method: 'GET', url: '{{ledgerUrl}}/accounts/:accountId/balance?as_of=2026-10-31T23:59:59Z', pathValues: { accountId: 'la_01HZX4M2K8Q3' } },
        { name: 'Freeze account', method: 'POST', url: '{{ledgerUrl}}/accounts/:accountId/freeze', pathValues: { accountId: 'la_01HZX4M2K8Q3' }, headers: [JSONH], json: { reason: 'risk_review', ticket: 'RISK-2291' } },
      ] },
      { folder: 'Journal Entries', items: [
        { name: 'Post journal entry', method: 'POST', url: '{{ledgerUrl}}/journal_entries', headers: [JSONH, IDEM], json: { effective_at: '2026-11-14T18:00:00Z', description: 'Capture pi_3QBx… settlement', lines: [{ account_id: 'la_card_clearing', direction: 'debit', amount: 248900 }, { account_id: 'la_01HZX4M2K8Q3', direction: 'credit', amount: 241680 }, { account_id: 'la_fee_revenue', direction: 'credit', amount: 7220 }] } },
        { name: 'Reverse journal entry', method: 'POST', url: '{{ledgerUrl}}/journal_entries/:entryId/reverse', pathValues: { entryId: 'je_01J9QK3S7T' }, headers: [JSONH], json: { reason: 'duplicate capture — see INC-0412' } },
        { name: 'List entries for account', method: 'GET', url: '{{ledgerUrl}}/journal_entries?account_id=la_01HZX4M2K8Q3&from=2026-11-01&to=2026-11-15' },
      ] },
      { folder: 'Reconciliation', items: [
        { name: 'Start bank recon run', method: 'POST', url: '{{ledgerUrl}}/recon/runs', headers: [JSONH], json: { bank: 'svb', statement_date: '2026-11-14', dry_run: true } },
        { name: 'Recon run status', method: 'GET', url: '{{ledgerUrl}}/recon/runs/:runId', pathValues: { runId: 'rr_20261114_svb' } },
        { name: 'Unmatched items', method: 'GET', url: '{{ledgerUrl}}/recon/runs/:runId/unmatched?min_amount=100', pathValues: { runId: 'rr_20261114_svb' } },
      ] },
      { folder: 'Reports', items: [
        { name: 'Trial balance', method: 'GET', url: '{{ledgerUrl}}/reports/trial_balance?period=2026-10' },
        { name: 'Daily settlement CSV', method: 'GET', url: '{{ledgerUrl}}/reports/settlement.csv?date=2026-11-14', headers: [['Accept', 'text/csv']] },
      ] },
    ],
  }, 260);

  addCollection(pay, {
    name: 'Merchant Dashboard GraphQL',
    description: 'GraphQL gateway behind dashboard.ledgerly.io. Schema: `apps/gateway/schema.graphql`.',
    auth: bearer('{{dashboardSessionJwt}}'),
    items: [
      { type: 'graphql', name: 'Dashboard gateway', url: '{{graphqlUrl}}', headers: [JSONH, ['X-Merchant-Id', 'acct_1Nv0FGQ9RKHgCVdK']], items: [
        { folder: 'Overview', items: [
          { name: 'Home KPIs', query: `query HomeKpis($range: DateRange!) {\n  merchant {\n    id\n    displayName\n    kpis(range: $range) {\n      grossVolume { amount currency }\n      netVolume { amount currency }\n      successfulPayments\n      disputeRate\n    }\n  }\n}`, variables: { range: { from: '2026-11-01', to: '2026-11-15' } } },
          { name: 'Recent payments', query: `query RecentPayments($first: Int = 20, $after: String) {\n  payments(first: $first, after: $after, orderBy: CREATED_AT_DESC) {\n    edges {\n      node { id amount { amount currency } status customer { name email } createdAt }\n    }\n    pageInfo { hasNextPage endCursor }\n  }\n}`, variables: { first: 20 } },
        ] },
        { folder: 'Payouts', items: [
          { name: 'Upcoming payouts', query: `query UpcomingPayouts {\n  payouts(filter: { status: [PENDING, IN_TRANSIT] }) {\n    id\n    amount { amount currency }\n    arrivalDate\n    destination { bankName last4 }\n  }\n}` },
          { name: 'Update payout schedule', query: `mutation UpdatePayoutSchedule($input: PayoutScheduleInput!) {\n  updatePayoutSchedule(input: $input) {\n    schedule { interval weeklyAnchor delayDays }\n    errors { field message }\n  }\n}`, variables: { input: { interval: 'WEEKLY', weeklyAnchor: 'FRIDAY', delayDays: 2 } } },
        ] },
        { name: 'Invite teammate', query: `mutation InviteTeammate($email: String!, $role: TeamRole!) {\n  inviteTeammate(email: $email, role: $role) {\n    invitation { id email role expiresAt }\n  }\n}`, variables: { email: 'finance@brightwater-outfitters.com', role: 'ANALYST' } },
        { name: 'Payment status subscription', query: `subscription OnPaymentUpdated($merchantId: ID!) {\n  paymentUpdated(merchantId: $merchantId) { id status updatedAt }\n}`, variables: { merchantId: 'acct_1Nv0FGQ9RKHgCVdK' } },
      ] },
      { type: 'graphql', name: 'Schema introspection (staging)', url: 'https://gateway.staging.ledgerly.io/graphql', headers: [JSONH], items: [
        { name: 'Introspection', query: `query IntrospectionQuery {\n  __schema {\n    queryType { name }\n    mutationType { name }\n    types { name kind }\n  }\n}` },
      ] },
    ],
  }, 210);

  addCollection(pay, {
    name: 'Realtime Streams',
    description: 'Live feeds used by the ops console and the fraud team.',
    items: [
      { type: 'websocket', name: 'Live transactions feed', url: 'wss://stream.staging.ledgerly.io/v1/transactions?merchant=acct_1Nv0FGQ9RKHgCVdK', headers: [['Authorization', 'Bearer {{accessToken}}']], ping: true, items: [
        { name: 'Subscribe: all payment events', body: { action: 'subscribe', channels: ['payment_intent.*', 'charge.*'], merchant: 'acct_1Nv0FGQ9RKHgCVdK' } },
        { name: 'Subscribe: payouts only', body: { action: 'subscribe', channels: ['payout.*'] } },
        { name: 'Unsubscribe', body: { action: 'unsubscribe', channels: ['*'] } },
        { name: 'ping', body: 'ping' },
      ] },
      { type: 'websocket', name: 'Fraud alerts (risk-engine)', url: 'wss://risk.internal.ledgerly.io/ws/alerts', headers: [['X-Service-Token', '{{internalServiceToken}}']], items: [
        { folder: 'Filters', items: [
          { name: 'High score only (>= 0.85)', body: { op: 'filter', min_score: 0.85 } },
          { name: 'Card testing pattern', body: { op: 'filter', rules: ['velocity.card_testing', 'bin.mismatch'] } },
        ] },
        { name: 'Ack alert', body: { op: 'ack', alert_id: 'ra_01JC8Z4WQ2', analyst: 'mayaokafor' } },
      ] },
      { type: 'socketio', name: 'Support chat (ops console)', url: 'https://chat.staging.ledgerly.io', namespace: '/support', listeners: ['message:new', 'agent:typing', 'ticket:assigned', 'connect_error'], authKv: [['token', '{{supportAgentToken}}']], items: [
        { name: 'Join merchant room', label: 'room:join', args: [{ room: 'merchant:acct_1Nv0FGQ9RKHgCVdK' }], ack: true },
        { name: 'Send message', label: 'message:send', args: [{ ticketId: 'T-48211', body: 'Hi Jordan — the refund was issued today and should land in 5–10 business days.' }] },
        { name: 'Typing indicator', label: 'agent:typing', args: [{ ticketId: 'T-48211' }] },
      ] },
      { type: 'socketio', name: 'Merchant presence (v2 legacy server)', url: 'https://presence.ledgerly.io', version: 'v2', listeners: ['presence:update'], items: [
        { name: 'Heartbeat', label: 'presence:heartbeat', args: [{ userId: 'usr_maya_okafor', status: 'online' }] },
      ] },
    ],
  }, 180);

  addCollection(pay, {
    name: 'Fraud & Risk Scoring',
    description: 'Risk engine v3. Scores are 0..1; anything over 0.85 is auto-held.',
    auth: bearer('{{internalServiceToken}}'),
    items: [
      { name: 'Score transaction', method: 'POST', url: '{{riskUrl}}/v3/score', headers: [JSONH], json: { payment_intent: 'pi_3QBx7dQ9RKHgCVdK', amount: 248900, currency: 'USD', card: { bin: '424242', country: 'US' }, ip: '73.162.14.201', device_fingerprint: 'fp_8c1e3b0a', shipping_country: 'US' }, test: `fc.test('score is a number', () => {\n  fc.expect(fc.response.json().score).to.be.a('number');\n});` },
      { name: 'Explain score', method: 'GET', url: '{{riskUrl}}/v3/score/:scoreId/explain', pathValues: { scoreId: 'rs_01JCA0V7' } },
      { name: 'Add to blocklist', method: 'POST', url: '{{riskUrl}}/v3/blocklist', headers: [JSONH], json: { type: 'card_fingerprint', value: 'Xt5EWLLDS7FJjR1c', reason: 'confirmed card testing — RISK-2291', expires_at: null } },
      { name: 'Remove from blocklist', method: 'DELETE', url: '{{riskUrl}}/v3/blocklist/:entryId', pathValues: { entryId: 'bl_01JBZ2' } },
      { name: 'List rules', method: 'GET', url: '{{riskUrl}}/v3/rules?enabled=true' },
      { name: 'Toggle rule', method: 'PATCH', url: '{{riskUrl}}/v3/rules/:ruleId', pathValues: { ruleId: 'velocity.card_testing' }, headers: [JSONH], json: { enabled: false, note: 'disabled during Black Friday load test — re-enable after 11/30!!' } },
    ],
  }, 150);

  addCollection(pay, {
    name: 'Legacy v1 API (deprecated)',
    description: '⚠️ Sunset date: **2027-01-31**. Kept for debugging merchants that have not migrated yet (see migration tracker).',
    auth: { type: 'basic', value: { username: '{{legacyApiKey}}', password: '' } },
    items: [
      { name: 'v1 charge', method: 'POST', url: '{{legacyUrl}}/v1/charges', form: [['amount', '1999'], ['currency', 'usd'], ['source', 'tok_visa'], ['description', 'legacy checkout']] },
      { name: 'v1 list charges', method: 'GET', url: '{{legacyUrl}}/v1/charges?count=10&offset=0' },
      { name: 'v1 refund', method: 'POST', url: '{{legacyUrl}}/v1/charges/:chargeId/refund', pathValues: { chargeId: 'ch_1A2b3C' }, form: [['amount', '1999']] },
      { name: 'v1 SOAP settlement (XML)', method: 'POST', url: '{{legacyUrl}}/soap/SettlementService', headers: [['Content-Type', 'text/xml; charset=utf-8'], ['SOAPAction', 'GetSettlementBatch']], xml: '<?xml version="1.0" encoding="utf-8"?>\n<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n  <soap:Body>\n    <GetSettlementBatch xmlns="urn:ledgerly:settlement">\n      <BatchDate>2026-11-13</BatchDate>\n    </GetSettlementBatch>\n  </soap:Body>\n</soap:Envelope>' },
    ],
  }, 315);

  addCollection(pay, {
    name: 'Scratchpad',
    description: 'random stuff, clean up later',
    items: [
      { name: 'copy of Create refund', method: 'POST', url: '{{baseUrl}}/v2/refunds', headers: [JSONH], json: { payment_intent: 'pi_3QBx7dQ9RKHgCVdK', amount: 100 } },
      { name: 'test webhook retry (DONT RUN IN PROD)', method: 'POST', url: 'https://api.ledgerly.io/internal/webhooks/retry_all', headers: [JSONH], json: { since: '2026-11-10T00:00:00Z', dry_run: false } },
      { name: 'INC-0412 repro — double capture', method: 'POST', url: '{{baseUrl}}/v2/payment_intents/:id/capture', pathValues: { id: 'pi_3QAv1rQ9RKHgCVdK' }, headers: [JSONH], json: { amount_to_capture: 5400 }, desc: 'Fired twice within 40ms without idempotency key → two journal entries. Fixed in #2213.' },
      { name: 'untitled', method: 'GET', url: 'http://localhost:8080/debug/vars' },
      { name: 'pprof heap (local)', method: 'GET', url: 'http://localhost:6060/debug/pprof/heap?debug=1' },
      { name: 'Daniel — FX rates check', method: 'GET', url: 'https://fx.internal.ledgerly.io/rates?base=USD&symbols=EUR,GBP,CAD,MXN' },
    ],
  }, 120);

  addEnv(pay, 'Global', [['clientId', 'ldg_client_7Hq2xP'], ['tenant', 'ledgerly'], ['supportAgentToken', '', 'secret']], true, 300);
  addEnv(pay, 'Local', [['baseUrl', 'http://localhost:4000'], ['filesUrl', 'http://localhost:4000'], ['ledgerUrl', 'http://localhost:4100'], ['riskUrl', 'http://localhost:4200'], ['graphqlUrl', 'http://localhost:4000/graphql'], ['legacyUrl', 'http://localhost:3000'], ['clientSecret', 'local-dev-secret', 'secret'], ['accessToken', '', 'secret'], ['internalServiceToken', 'dev-only-token', 'secret']], false, 299);
  addEnv(pay, 'Development', [['baseUrl', 'https://api.dev.ledgerly.io'], ['filesUrl', 'https://files.dev.ledgerly.io'], ['ledgerUrl', 'https://ledger.dev.internal.ledgerly.io'], ['riskUrl', 'https://risk.dev.internal.ledgerly.io'], ['graphqlUrl', 'https://gateway.dev.ledgerly.io/graphql'], ['legacyUrl', 'https://legacy.dev.ledgerly.io'], ['clientSecret', '', 'secret'], ['accessToken', '', 'secret'], ['internalServiceToken', '', 'secret']], false, 280);
  addEnv(pay, 'Staging', [['baseUrl', 'https://api.staging.ledgerly.io'], ['filesUrl', 'https://files.staging.ledgerly.io'], ['ledgerUrl', 'https://ledger.staging.internal.ledgerly.io'], ['riskUrl', 'https://risk.staging.internal.ledgerly.io'], ['graphqlUrl', 'https://gateway.staging.ledgerly.io/graphql'], ['legacyUrl', 'https://legacy.staging.ledgerly.io'], ['clientSecret', '', 'secret'], ['accessToken', '', 'secret'], ['dashboardSessionJwt', '', 'secret']], false, 270);
  addEnv(pay, 'Production (read-only!)', [['baseUrl', 'https://api.ledgerly.io'], ['filesUrl', 'https://files.ledgerly.io'], ['graphqlUrl', 'https://gateway.ledgerly.io/graphql'], ['clientSecret', '', 'secret'], ['accessToken', '', 'secret']], false, 250);
  addEnv(pay, 'Partner QA sandbox', [['baseUrl', 'https://sandbox.ledgerly.io'], ['clientId', 'ldg_partner_qa'], ['clientSecret', '', 'secret']], false, 90);

  /* ============================ Mobile Backend ============================ */
  addCollection(mobile, {
    name: 'Merchant App BFF',
    description: 'Backend-for-frontend used by the Ledgerly Merchant iOS & Android apps (v5.x).',
    auth: bearer('{{sessionToken}}'),
    items: [
      { folder: 'Session', auth: { type: 'none', value: '' }, items: [
        { name: 'Login (email + password)', method: 'POST', url: '{{bffUrl}}/session', headers: [JSONH, ['X-App-Version', '5.12.0 (iOS)']], json: { email: 'hana.kobayashi@ledgerly.io', password: '{{testPassword}}', device_id: 'A1B2C3D4-E5F6-47A8-9B0C-1D2E3F405162' } },
        { name: 'Verify OTP', method: 'POST', url: '{{bffUrl}}/session/otp', headers: [JSONH], json: { challenge_id: 'ch_9f2a', code: '424242' } },
        { name: 'Logout', method: 'DELETE', url: '{{bffUrl}}/session' },
      ] },
      { folder: 'Home', items: [
        { name: 'Home feed', method: 'GET', url: '{{bffUrl}}/home?tz=America/Los_Angeles' },
        { name: 'Today summary widget', method: 'GET', url: '{{bffUrl}}/widgets/today' },
      ] },
      { folder: 'Payments', items: [
        { name: 'Payment list (paged)', method: 'GET', url: '{{bffUrl}}/payments?cursor=&limit=30', disabledQuery: ['cursor'] },
        { name: 'Payment detail', method: 'GET', url: '{{bffUrl}}/payments/:id', pathValues: { id: 'pi_3QBx7dQ9RKHgCVdK' } },
        { name: 'Issue refund from app', method: 'POST', url: '{{bffUrl}}/payments/:id/refund', pathValues: { id: 'pi_3QBx7dQ9RKHgCVdK' }, headers: [JSONH], json: { amount: 2500, note: 'damaged item' } },
        { name: 'Tap to Pay — create reader session', method: 'POST', url: '{{bffUrl}}/terminal/sessions', headers: [JSONH], json: { location: 'loc_portland_flagship', reader_type: 'tap_to_pay_iphone' } },
      ] },
      { folder: 'Push notifications', items: [
        { name: 'Register device token (APNs)', method: 'PUT', url: '{{bffUrl}}/devices/:deviceId/push', pathValues: { deviceId: 'A1B2C3D4-E5F6-47A8-9B0C-1D2E3F405162' }, headers: [JSONH], json: { provider: 'apns', token: '7f1c3d0e2b9a4c5d8e6f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d', sandbox: true } },
        { name: 'Send test push', method: 'POST', url: '{{bffUrl}}/internal/push/test', headers: [JSONH], json: { user_id: 'usr_hanak', title: 'Payout sent', body: '$12,500.00 is on its way to •••• 6789' } },
      ] },
      { name: 'Feature flags', method: 'GET', url: '{{bffUrl}}/config/flags?platform=ios&app_version=5.12.0' },
      { name: 'Force-update check', method: 'GET', url: '{{bffUrl}}/config/min-version?platform=android' },
    ],
  }, 230);
  addCollection(mobile, {
    name: 'App Store Server API',
    description: 'Subscriptions for Ledgerly Pro (in-app).',
    items: [
      { name: 'Get transaction history', method: 'GET', url: 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1/history/:originalTransactionId?sort=DESCENDING', pathValues: { originalTransactionId: '2000000712345678' }, auth: bearer('{{appStoreJwt}}') },
      { name: 'Get subscription statuses', method: 'GET', url: 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1/subscriptions/:originalTransactionId', pathValues: { originalTransactionId: '2000000712345678' }, auth: bearer('{{appStoreJwt}}') },
      { name: 'Google Play — verify purchase', method: 'GET', url: 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/io.ledgerly.merchant/purchases/subscriptionsv2/tokens/:token', pathValues: { token: 'opaque-purchase-token' }, auth: bearer('{{googleAccessToken}}') },
    ],
  }, 160);
  addEnv(mobile, 'Global', [['testPassword', '', 'secret']], true, 230);
  addEnv(mobile, 'Local (simulator)', [['bffUrl', 'http://localhost:5050']], false, 229);
  addEnv(mobile, 'Staging', [['bffUrl', 'https://bff.staging.ledgerly.io'], ['sessionToken', '', 'secret']], false, 225);
  addEnv(mobile, 'Production', [['bffUrl', 'https://bff.ledgerly.io'], ['sessionToken', '', 'secret']], false, 200);

  /* ============================ Partner Integrations ============================ */
  addCollection(partner, {
    name: 'Plaid',
    description: 'Bank account linking for payouts. Sandbox credentials: user_good / pass_good.',
    items: [
      { name: 'Create link token', method: 'POST', url: 'https://sandbox.plaid.com/link/token/create', headers: [JSONH], json: { client_id: '{{plaidClientId}}', secret: '{{plaidSecret}}', client_name: 'Ledgerly', country_codes: ['US', 'CA'], language: 'en', user: { client_user_id: 'acct_1Nv0FGQ9RKHgCVdK' }, products: ['auth', 'identity'] } },
      { name: 'Exchange public token', method: 'POST', url: 'https://sandbox.plaid.com/item/public_token/exchange', headers: [JSONH], json: { client_id: '{{plaidClientId}}', secret: '{{plaidSecret}}', public_token: 'public-sandbox-5c224a01-8314-4491-a06f-39e193d5cddc' } },
      { name: 'Auth — get account numbers', method: 'POST', url: 'https://sandbox.plaid.com/auth/get', headers: [JSONH], json: { client_id: '{{plaidClientId}}', secret: '{{plaidSecret}}', access_token: '{{plaidAccessToken}}' } },
      { name: 'Identity match', method: 'POST', url: 'https://sandbox.plaid.com/identity/match', headers: [JSONH], json: { client_id: '{{plaidClientId}}', secret: '{{plaidSecret}}', access_token: '{{plaidAccessToken}}', user: { legal_name: 'Brightwater Outfitters LLC' } } },
    ],
  }, 200);
  addCollection(partner, {
    name: 'KYC — Onfido',
    description: 'Merchant owner identity checks (US + EU).',
    auth: { type: 'bearer', value: { token: 'token={{onfidoApiToken}}', prefix: 'Token' } },
    items: [
      { name: 'Create applicant', method: 'POST', url: 'https://api.eu.onfido.com/v3.6/applicants', headers: [JSONH], json: { first_name: 'Jordan', last_name: 'Lee', dob: '1988-04-12', address: { building_number: '1220', street: 'SE Hawthorne Blvd', town: 'Portland', postcode: '97214', country: 'USA', state: 'OR' } } },
      { name: 'Upload document', method: 'POST', url: 'https://api.eu.onfido.com/v3.6/documents', multipart: [['applicant_id', '{{applicantId}}'], ['type', 'driving_licence'], ['side', 'front'], ['file', '', 'file']] },
      { name: 'Create check', method: 'POST', url: 'https://api.eu.onfido.com/v3.6/checks', headers: [JSONH], json: { applicant_id: '{{applicantId}}', report_names: ['document', 'facial_similarity_photo', 'watchlist_standard'] } },
      { name: 'Retrieve check', method: 'GET', url: 'https://api.eu.onfido.com/v3.6/checks/:checkId', pathValues: { checkId: '8546921-123123-123123' } },
    ],
  }, 190);
  addCollection(partner, {
    name: 'Messaging (Twilio / SendGrid)',
    items: [
      { name: 'Send SMS (Twilio)', method: 'POST', url: 'https://api.twilio.com/2010-04-01/Accounts/:AccountSid/Messages.json', pathValues: { AccountSid: '{{twilioAccountSid}}' }, auth: { type: 'basic', value: { username: '{{twilioAccountSid}}', password: '{{twilioAuthToken}}' } }, form: [['To', '+15035550142'], ['From', '+18335550100'], ['Body', 'Ledgerly: your verification code is 424242']] },
      { name: 'Send payout email (SendGrid)', method: 'POST', url: 'https://api.sendgrid.com/v3/mail/send', auth: bearer('{{sendgridApiKey}}'), headers: [JSONH], json: { personalizations: [{ to: [{ email: 'ap@brightwater-outfitters.com' }], dynamic_template_data: { amount: '$12,500.00', arrival: 'Nov 18, 2026' } }], from: { email: 'payouts@ledgerly.io', name: 'Ledgerly Payouts' }, template_id: 'd-4f1a2b3c4d5e6f708192a3b4c5d6e7f8' } },
      { name: 'Email activity (last 24h)', method: 'GET', url: 'https://api.sendgrid.com/v3/messages?limit=50&query=to_email%3D%22ap%40brightwater-outfitters.com%22', auth: bearer('{{sendgridApiKey}}') },
    ],
  }, 175);
  addCollection(partner, {
    name: 'QuickBooks Online sync',
    description: 'Accounting export for merchants on the Growth plan. OAuth2 tokens expire every 60 min.',
    auth: bearer('{{qboAccessToken}}'),
    items: [
      { name: 'Company info', method: 'GET', url: 'https://sandbox-quickbooks.api.intuit.com/v3/company/:realmId/companyinfo/:realmId?minorversion=73', pathValues: { realmId: '9341452178526034' }, headers: [['Accept', 'application/json']] },
      { name: 'Create journal entry', method: 'POST', url: 'https://sandbox-quickbooks.api.intuit.com/v3/company/:realmId/journalentry?minorversion=73', pathValues: { realmId: '9341452178526034' }, headers: [JSONH, ['Accept', 'application/json']], json: { Line: [{ Description: 'Ledgerly payout po_1Q7k0B', Amount: 12500.0, DetailType: 'JournalEntryLineDetail', JournalEntryLineDetail: { PostingType: 'Debit', AccountRef: { value: '35' } } }, { Description: 'Ledgerly payout po_1Q7k0B', Amount: 12500.0, DetailType: 'JournalEntryLineDetail', JournalEntryLineDetail: { PostingType: 'Credit', AccountRef: { value: '84' } } }] } },
      { name: 'Query invoices (SQL-ish)', method: 'GET', url: "https://sandbox-quickbooks.api.intuit.com/v3/company/:realmId/query?query=select * from Invoice where TxnDate > '2026-10-01' MAXRESULTS 50", pathValues: { realmId: '9341452178526034' } },
    ],
  }, 110);
  addEnv(partner, 'Global', [['plaidClientId', '64f0c2a1b2c3d4e5f6a7b8c9'], ['twilioAccountSid', 'AC2f6c1d0b9e8a7f6e5d4c3b2a1f0e9d8c']], true, 200);
  addEnv(partner, 'Sandbox', [['plaidSecret', '', 'secret'], ['plaidAccessToken', 'access-sandbox-de3ce8ef-33f8-452c-a685-8671031fc0f6'], ['onfidoApiToken', '', 'secret'], ['applicantId', '1030303-123123-123123'], ['sendgridApiKey', '', 'secret'], ['twilioAuthToken', '', 'secret']], false, 198);

  /* ============================ Data & Reporting ============================ */
  addCollection(data, {
    name: 'Warehouse Exports',
    description: 'Airflow-triggered export endpoints. Owner: @arjunm',
    auth: bearer('{{internalServiceToken}}'),
    items: [
      { name: 'Trigger nightly export', method: 'POST', url: '{{exportsUrl}}/jobs', headers: [JSONH], json: { job: 'payments_daily', date: '2026-11-15', destination: 's3://ledgerly-warehouse-raw/payments/' } },
      { name: 'Job status', method: 'GET', url: '{{exportsUrl}}/jobs/:jobId', pathValues: { jobId: 'job_20261115_payments_daily' } },
      { name: 'Backfill range', method: 'POST', url: '{{exportsUrl}}/jobs/backfill', headers: [JSONH], json: { job: 'refunds_daily', from: '2026-09-01', to: '2026-09-30', parallelism: 4 } },
      { name: 'Monthly finance pack', method: 'GET', url: '{{exportsUrl}}/reports/finance-pack?month=2026-10&format=xlsx' },
    ],
  }, 90);
  addEnv(data, 'Production', [['exportsUrl', 'https://exports.internal.ledgerly.io'], ['internalServiceToken', '', 'secret']], false, 90);

  /* ============================ Kestrel ============================ */
  addCollection(kestrel, {
    name: 'Booking API',
    description: 'Class & slot booking for Granite Peak Climbing (3 locations).',
    auth: bearer('{{token}}'),
    items: [
      { folder: 'Slots', items: [
        { name: 'Available slots', method: 'GET', url: '{{host}}/api/slots?location=granite-peak-se&date=2026-11-21&type=bouldering' },
        { name: 'Hold slot', method: 'POST', url: '{{host}}/api/slots/:slotId/hold', pathValues: { slotId: 'slot_8812' }, headers: [JSONH], json: { member_id: 'mem_20931', minutes: 10 } },
      ] },
      { folder: 'Bookings', items: [
        { name: 'Create booking', method: 'POST', url: '{{host}}/api/bookings', headers: [JSONH], json: { slot_id: 'slot_8812', member_id: 'mem_20931', guests: 1, waiver_signed: true } },
        { name: 'Cancel booking', method: 'DELETE', url: '{{host}}/api/bookings/:bookingId?refund=credit', pathValues: { bookingId: 'bk_55120' } },
        { name: 'Member bookings', method: 'GET', url: '{{host}}/api/members/:memberId/bookings?upcoming=true', pathValues: { memberId: 'mem_20931' } },
      ] },
      { type: 'websocket', name: 'Front desk live check-ins', url: 'wss://booking.granitepeak.app/ws/checkins', items: [
        { name: 'join location', body: { join: 'granite-peak-se' } },
      ] },
    ],
  }, 135);
  addEnv(kestrel, 'Local', [['host', 'http://localhost:3001'], ['token', 'dev']], false, 135);
  addEnv(kestrel, 'Fly.io staging', [['host', 'https://kestrel-booking-staging.fly.dev'], ['token', '', 'secret']], false, 120);

  /* ============================ Personal ============================ */
  addCollection(personal, {
    name: 'Public APIs I poke at',
    items: [
      { name: 'GitHub — my repos', method: 'GET', url: 'https://api.github.com/users/mayaokafor/repos?sort=updated&per_page=20', headers: [['Accept', 'application/vnd.github+json'], ['X-GitHub-Api-Version', '2022-11-28']] },
      { name: 'GitHub — open PR reviews', method: 'GET', url: 'https://api.github.com/search/issues?q=is:pr+is:open+review-requested:mayaokafor', auth: bearer('{{githubPat}}') },
      { name: 'httpbin anything', method: 'POST', url: 'https://httpbin.org/anything?foo=bar', headers: [JSONH], json: { hello: 'world', n: 42 } },
      { name: 'Weather — Portland', method: 'GET', url: 'https://api.open-meteo.com/v1/forecast?latitude=45.52&longitude=-122.68&hourly=temperature_2m,precipitation&timezone=America/Los_Angeles' },
      { name: 'ECB FX rates', method: 'GET', url: 'https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY' },
      { type: 'websocket', name: 'Echo server', url: 'wss://echo.websocket.org', items: [{ name: 'hello', body: 'hello from firecamp' }] },
      { type: 'graphql', name: 'Countries GraphQL', url: 'https://countries.trevorblades.com/graphql', items: [{ name: 'Countries in Europe', query: `query {\n  continent(code: "EU") {\n    name\n    countries { code name emoji currency }\n  }\n}` }] },
    ],
  }, 330);
  addCollection(personal, {
    name: 'Conference talk demo (APIs in 15 min)',
    description: 'Demo requests for the PDX Node meetup talk (Sept 2026).',
    items: [
      { name: '1. hello', method: 'GET', url: 'http://localhost:3000/' },
      { name: '2. create todo', method: 'POST', url: 'http://localhost:3000/todos', headers: [JSONH], json: { title: 'buy more chalk', done: false } },
      { name: '3. list todos', method: 'GET', url: 'http://localhost:3000/todos' },
      { name: '4. finish todo', method: 'PATCH', url: 'http://localhost:3000/todos/:id', pathValues: { id: '1' }, headers: [JSONH], json: { done: true } },
    ],
  }, 75);
  addEnv(personal, 'Global', [['githubPat', '', 'secret']], true, 330);
};
