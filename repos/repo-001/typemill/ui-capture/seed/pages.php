<?php
/*
 * Content tree of the Ledgerline Help Center. Keys are slugs; folders have 'children'.
 * status: published (default) | modified (published + unsaved draft changes) | draft (never published)
 */

// helper: a how-to article from parts
function howto($title, $intro, array $steps, $tip = null, array $faq = [], $extra = '') {
    $md = "# $title\n\n$intro\n\n## Steps\n\n";
    foreach ($steps as $n => $s) $md .= ($n + 1) . ". $s\n";
    if ($tip) $md .= "\n! $tip\n";
    if ($extra) $md .= "\n$extra\n";
    if ($faq) { $md .= "\n## Common questions\n"; foreach ($faq as $q => $a) $md .= "\n**$q**\n\n$a\n"; }
    return $md;
}
function d($date) { return $date; }

// author spread
$W = ['dkowalski', 'jmensah', 'priyanair', 'tbrzezinski', 'lfernandez', 'mokafor', 'aberg'];

$p = function ($title, $body, $created, $modified, $owner, $opts = []) {
    return array_merge(['title' => $title, 'body' => $body, 'created' => $created, 'modified' => $modified, 'owner' => $owner], $opts);
};

$tree = [];

$tree['__home'] = $p('Ledgerline Help Center', <<<MD
# Ledgerline Help Center

Find answers, step-by-step guides and release notes for Ledgerline, the invoicing and bookkeeping app for small businesses, freelancers and their accountants.

## Popular articles

* [Create and send your first invoice](/invoicing/create-and-send-an-invoice)
* [Connect your bank account](/banking/bank-feeds/connect-a-bank-account)
* [Reconcile transactions](/banking/reconcile-transactions)
* [Set up sales tax or VAT](/taxes/set-up-sales-tax)
* [Import data from QuickBooks or Xero](/getting-started/import-from-another-tool)

## Still stuck?

Our support team answers in English, Spanish, German and Polish, Monday to Friday 8:00–20:00 CET. Write to **support@ledgerline.io** or use the chat bubble inside the app.

! Status of bank feeds and payment providers is published at status.ledgerline.io.
MD, '2025-02-14', '2026-10-02', 'dkowalski', ['nav' => 'Home', 'title' => 'Ledgerline Help Center',
    'extra' => ['cyhome' => ['landingpage' => false, 'blogfolder' => '', 'introTitle' => '', 'introMarkdown' => '']]]);

/* ------------------------------------------------------------------ Getting started */
$tree['getting-started'] = $p('Getting Started', "# Getting Started\n\nNew to Ledgerline? These guides take you from sign-up to your first paid invoice in about 30 minutes.", '2025-02-14', '2026-06-11', 'dkowalski', ['children' => [
    'welcome-to-ledgerline' => $p('Welcome to Ledgerline', <<<MD
# Welcome to Ledgerline

Ledgerline keeps your invoices, expenses, bank transactions and taxes in one place. This page gives you a short tour of the app so you know where everything lives.

## The main areas

| Area | What you do there |
|------|-------------------|
| Dashboard | See cash in, cash out, overdue invoices and your bank balance at a glance |
| Sales | Invoices, quotes, credit notes and customers |
| Purchases | Bills, expenses, receipts and vendors |
| Banking | Bank feeds, reconciliation and rules |
| Reports | Profit & loss, balance sheet, VAT/sales tax and aged receivables |
| Settings | Company details, users, tax rates, templates and integrations |

## What to do first

1. [Set up your company profile](/getting-started/company-profile)
2. [Connect a bank account](/banking/bank-feeds/connect-a-bank-account)
3. [Create your first invoice](/invoicing/create-and-send-an-invoice)

! Your free trial lasts 30 days and includes every feature of the Growth plan. No card is needed until you choose a plan.
MD, '2025-02-14', '2026-03-09', 'dkowalski'),
    'company-profile' => $p('Set up your company profile', howto('Set up your company profile',
        'Your company profile appears on every invoice, quote and statement you send. Fill it in before sending anything to customers – changes are not applied retroactively to invoices that were already sent.',
        ['Go to **Settings → Company**.', 'Enter your legal business name and, if different, the trading name customers know you by.', 'Add your registered address, tax number (EIN, VAT number or ABN) and company registration number.', 'Upload your logo. PNG or SVG, at least 400 px wide, works best.', 'Choose your **base currency** and **fiscal year start**. These cannot be changed after you post your first transaction.', 'Click **Save**.'],
        'Base currency and fiscal year are locked once transactions exist. If you picked the wrong one, contact support before entering data.',
        ['Can I have more than one company?' => 'Yes. Each company is a separate ledger with its own subscription. Switch between them from the company menu in the top-left corner.',
         'Why is my logo blurry on PDFs?' => 'Logos are scaled to 180 px height. Upload a larger PNG or an SVG file.']), '2025-02-15', '2025-11-20', 'jmensah', ['nav' => 'Company profile']),
    'invite-your-team' => $p('Invite your team and your accountant', howto('Invite your team and your accountant',
        'You can invite as many people as your plan allows. Each person gets their own login, and you decide what they can see.',
        ['Go to **Settings → Users**.', 'Click **Invite user** and enter their e-mail address.', 'Pick a role: *Owner*, *Admin*, *Standard*, *Invoicing only* or *Accountant*.', 'Click **Send invite**. The link is valid for 7 days.'],
        'Accountant seats are free on all plans and do not count toward your user limit.', [],
        "## Roles at a glance\n\n| Role | Invoices | Bank | Reports | Settings |\n|---|---|---|---|---|\n| Owner | ✔ | ✔ | ✔ | ✔ |\n| Admin | ✔ | ✔ | ✔ | ✔ (no billing) |\n| Standard | ✔ | ✔ | ✔ | – |\n| Invoicing only | ✔ | – | – | – |\n| Accountant | ✔ | ✔ | ✔ | tax & chart of accounts |"),
        '2025-02-16', '2026-01-27', 'jmensah', ['nav' => 'Invite your team']),
    'import-from-another-tool' => $p('Import data from QuickBooks, Xero or a spreadsheet', <<<MD
# Import data from QuickBooks, Xero or a spreadsheet

Moving from another tool? The import assistant brings over customers, vendors, items, open invoices and opening balances. Historical transactions can be imported as a journal summary.

## Supported sources

* QuickBooks Online (direct connection)
* QuickBooks Desktop (IIF or CSV export)
* Xero (direct connection)
* FreshBooks and Wave (CSV)
* Any spreadsheet that follows our [CSV template](/media/files/ledgerline-import-template.csv)

## Before you import

Close your books in the old tool on a month end. Importing mid-month makes reconciliation much harder because transactions get split across both systems.

!! The direct QuickBooks Online connection imports a maximum of 24 months of history. Older data stays available in QuickBooks.

## Run the import

1. Go to **Settings → Import data**.
2. Choose the source and sign in, or upload your CSV files.
3. Map the columns. Ledgerline suggests a mapping; check the *Tax rate* and *Account* columns carefully.
4. Review the preview and click **Start import**. Large files (10,000+ rows) can take up to 20 minutes – you'll get an e-mail when it is done.

## After the import

Run a trial balance report for the cut-off date and compare it with the old system. Differences are usually caused by unmatched tax rates or by invoices that were partially paid on the cut-off date.
MD, '2025-03-02', '2026-09-15', 'priyanair', ['nav' => 'Import data', 'status' => 'modified',
        'draft' => "# Import data from QuickBooks, Xero or a spreadsheet\n\nMoving from another tool? The import assistant brings over customers, vendors, items, open invoices and opening balances. Historical transactions can be imported as a journal summary.\n\n## Supported sources\n\n* QuickBooks Online (direct connection)\n* QuickBooks Desktop (IIF or CSV export)\n* Xero (direct connection)\n* FreshBooks, Wave and Zoho Books (CSV)\n* Sage 50 (CSV, beta)\n* Any spreadsheet that follows our CSV template\n\n## Before you import\n\nClose your books in the old tool on a month end. Importing mid-month makes reconciliation much harder.\n\nTODO(Priya): screenshots of the new mapping screen once 4.12 ships"]),
    'keyboard-shortcuts' => $p('Keyboard shortcuts', <<<MD
# Keyboard shortcuts

Work faster with these shortcuts. Press `?` anywhere in the app to see the list.

| Shortcut | Action |
|---|---|
| `N` then `I` | New invoice |
| `N` then `E` | New expense |
| `N` then `B` | New bill |
| `G` then `D` | Go to dashboard |
| `G` then `R` | Go to reports |
| `/` | Search |
| `Ctrl` + `Enter` | Save and send |
| `Esc` | Close dialog |

On macOS, use `Cmd` instead of `Ctrl`.
MD, '2025-04-10', '2025-04-10', 'aberg'),
    'mobile-app' => $p('Ledgerline on your phone', howto('Ledgerline on your phone',
        'The Ledgerline app for iOS and Android lets you snap receipts, send invoices and check who owes you money while you are away from your desk.',
        ['Download *Ledgerline* from the App Store or Google Play.', 'Sign in with the same e-mail and password you use on the web.', 'Allow camera access if you want to scan receipts.', 'Turn on notifications to hear about paid invoices.'],
        'Payroll and reconciliation are only available on the web.'), '2025-05-21', '2026-02-03', 'lfernandez', ['nav' => 'Mobile app']),
]]);

/* ------------------------------------------------------------------ Invoicing */
$inv = [];
$inv['create-and-send-an-invoice'] = $p('Create and send an invoice', <<<MD
# Create and send an invoice

Invoices are the heart of Ledgerline. You can send them by e-mail, share a payment link, or download a PDF and send it yourself.

## Create the invoice

1. Go to **Sales → Invoices** and click **New invoice**.
2. Choose a customer, or type a new name to create one on the fly.
3. Check the **invoice date** and **due date**. The due date follows the customer's payment terms (Net 30 by default).
4. Add line items. Start typing to pick a saved item, or enter a description, quantity and price.
5. Select the tax rate for each line. Ledgerline adds the totals for you.
6. Add a note for the customer – for example a project reference or a thank-you.

## Send it

Click **Save and send**. You can edit the e-mail subject and message before it goes out. The customer receives a link to a web version of the invoice with a **Pay now** button if you have [online payments](/integrations/stripe) switched on.

! Use the **Preview** button to see exactly what your customer sees, including your logo and bank details.

## What happens next

The invoice status changes as your customer interacts with it:

* **Sent** – the e-mail was delivered
* **Viewed** – the customer opened the invoice
* **Partially paid** – some money has arrived
* **Paid** – the full amount is matched to a bank transaction or online payment
* **Overdue** – the due date has passed and the invoice is not fully paid

## Common questions

**Can I change an invoice after sending it?**

Yes, as long as it has no payments. The customer link always shows the latest version. If a payment is already recorded, issue a [credit note](/invoicing/credit-notes) instead.

**Why did my customer not receive the e-mail?**

Check **Sales → Invoices → Activity**. If the status says *bounced*, the address is wrong or the mailbox is full. Corporate spam filters sometimes hold invoices – ask the customer to allow mail from invoices@ledgerline.io.
MD, '2025-02-18', '2026-07-30', 'jmensah', ['nav' => 'Create an invoice']);
$inv['recurring-invoices'] = $p('Recurring invoices', howto('Recurring invoices',
    'Bill retainers, subscriptions and rent automatically. A recurring profile creates a new invoice on a schedule and can send it for you.',
    ['Open an existing invoice and click **More → Make recurring**, or go to **Sales → Recurring** and click **New profile**.', 'Choose how often: weekly, every 2 weeks, monthly, quarterly or yearly.', 'Pick the first invoice date and when the profile should end (never, after a number of invoices, or on a date).', 'Decide whether invoices are sent automatically or saved as drafts for you to review.', 'Click **Save profile**.'],
    'Recurring invoices created before 1 March 2025 used the old scheduler. They still run, but you cannot edit their schedule – recreate them to get the new options.',
    ['Can I charge the customer\'s card automatically?' => 'Yes, if they saved a card through Stripe on a previous payment. Turn on **Auto-charge** in the profile.',
     'What if the date falls on a weekend?' => 'Invoices are created on the scheduled date regardless of weekends. Use *Send on next business day* if you prefer.']),
    '2025-02-20', '2026-05-18', 'jmensah');
$inv['invoice-templates'] = $p('Customize invoice templates', howto('Customize invoice templates',
    'Make invoices look like your brand. You can choose a layout, colors, fonts, and which fields appear.',
    ['Go to **Settings → Templates**.', 'Choose one of the four layouts: *Classic*, *Modern*, *Compact* or *Letterhead*.', 'Set your accent color and font.', 'Toggle optional fields: PO number, shipping address, item images, signature.', 'Edit the default footer text, for example your bank details and payment terms.', 'Click **Save template**. You can mark one template as default and assign others to specific customers.'],
    null, ['Can I upload my own HTML template?' => 'Not yet. Custom HTML templates are on the roadmap for the Scale plan.']),
    '2025-03-05', '2025-12-01', 'aberg', ['nav' => 'Templates']);
$inv['payment-reminders'] = $p('Automatic payment reminders', <<<MD
# Automatic payment reminders

Ledgerline can nudge customers about unpaid invoices so you don't have to. Reminders are polite by default and you can edit every word.

## Default schedule

| When | Message |
|---|---|
| 3 days before due date | Friendly heads-up |
| On the due date | Payment is due today |
| 7 days overdue | First reminder |
| 14 days overdue | Second reminder, includes late fee notice if enabled |
| 30 days overdue | Final reminder |

## Turn reminders on or off

Go to **Settings → Reminders**. You can switch reminders off for a single customer from the customer page – useful for clients with a payment plan.

!!! Reminders are never sent for invoices in *Draft* or *Disputed* status.
MD, '2025-03-11', '2026-08-04', 'jmensah', ['nav' => 'Payment reminders']);
$inv['credit-notes'] = $p('Credit notes and refunds', howto('Credit notes and refunds',
    'Use a credit note to reduce what a customer owes, for example after a return, a discount agreed after invoicing, or a billing mistake.',
    ['Open the invoice and click **More → Create credit note**.', 'Adjust the lines and amounts you want to credit.', 'Choose what to do with the credit: apply it to this invoice, keep it on the customer account, or refund it.', 'If you refund, record how the money was paid back (bank transfer, card refund, cash).'],
    'In the UK and EU a credit note must reference the original invoice number. Ledgerline adds this automatically.'),
    '2025-03-19', '2025-10-14', 'jmensah');
$inv['partial-payments'] = $p('Record partial and split payments', howto('Record partial and split payments',
    'Customers do not always pay in one go. Ledgerline tracks every payment against the invoice and keeps the balance up to date.',
    ['Open the invoice and click **Record payment**.', 'Enter the amount received, the date and the account it went into.', 'Repeat for each instalment. The status shows *Partially paid* until the balance is zero.'],
    null, ['A customer paid two invoices in one transfer. What do I do?' => 'In **Banking**, match the transaction and select both invoices. Ledgerline splits the amount in due-date order; you can change the split.']),
    '2025-04-02', '2025-04-02', 'lfernandez', ['nav' => 'Partial payments']);
$inv['multi-currency'] = $p('Invoice in other currencies', <<<MD
# Invoice in other currencies

On the Growth and Scale plans you can invoice in 160+ currencies. Ledgerline converts amounts to your base currency using the daily rate from the European Central Bank, and records exchange gains or losses when the payment arrives.

## Set a currency for a customer

Open the customer, click **Edit** and choose the currency. All new invoices for that customer use it.

## Exchange rates

Rates are updated every business day at 16:00 CET. You can override the rate on an individual invoice under **More options → Exchange rate**.

! Realised gains and losses are posted to the account *7200 Exchange differences*. You can change the account in Settings → Chart of accounts.
MD, '2025-04-15', '2026-02-26', 'priyanair', ['nav' => 'Multi-currency']);
$inv['late-fees'] = $p('Late fees and interest', howto('Late fees and interest',
    'Add a fixed fee or a monthly interest charge to overdue invoices. Late fees are added as a separate line so your original invoice stays unchanged.',
    ['Go to **Settings → Reminders → Late fees**.', 'Choose *Fixed amount* (for example $25) or *Percentage per month* (for example 1.5%).', 'Set the grace period – the number of days after the due date before the fee applies.', 'Save. Fees apply to invoices that become overdue from now on.'],
    'Check local law before charging interest. In the UK, the Late Payment of Commercial Debts Act sets statutory interest of 8% above the Bank of England base rate for B2B invoices.'),
    '2025-06-03', '2025-09-22', 'mokafor');
$inv['quotes-and-estimates'] = $p('Quotes and estimates', howto('Quotes and estimates',
    'Send a quote before you start work. When the customer accepts it online, you can turn it into an invoice with one click.',
    ['Go to **Sales → Quotes** and click **New quote**.', 'Add the customer, line items and an expiry date.', 'Click **Send**. The customer can accept, decline, or ask for changes from the web view.', 'When a quote is accepted, click **Convert to invoice**. You can invoice the full amount or a deposit.']),
    '2025-05-08', '2026-04-21', 'jmensah', ['nav' => 'Quotes']);
$inv['deposit-invoices'] = $p('Deposit and milestone invoices', <<<MD
# Deposit and milestone invoices

Split a large project into a deposit and milestone payments.

## Create a deposit invoice from a quote

1. Open the accepted quote.
2. Click **Convert to invoice → Deposit**.
3. Enter the deposit as a percentage or amount.

The remaining balance stays on the quote until you invoice the next milestone.

TODO: confirm with product how VAT on deposits is handled for UK cash accounting (ticket DOC-418).
MD, '2026-10-20', '2026-11-16', 'jmensah', ['nav' => 'Deposit invoices', 'status' => 'draft']);
$inv['invoice-numbering'] = $p('Invoice numbering', howto('Invoice numbering',
    'Ledgerline numbers invoices sequentially. You can set a prefix and the next number, for example *INV-2026-0001*.',
    ['Go to **Settings → Invoices → Numbering**.', 'Enter a prefix. You can use {YYYY} and {MM} placeholders.', 'Set the next number. It must be higher than the last invoice you sent.'],
    'Many tax authorities require gap-free numbering. Ledgerline never reuses a number, even when you delete a draft.'),
    '2025-02-22', '2025-02-22', 'aberg', ['nav' => 'Numbering']);
$inv['customer-portal'] = $p('Customer portal', howto('Customer portal',
    'Give customers a single place to see all their invoices, download PDFs and update their saved card.',
    ['Go to **Settings → Customer portal** and switch it on.', 'Choose what customers can see: invoices, quotes, statements, or all of them.', 'Copy the portal link into your e-mail signature, or let Ledgerline add it to every invoice e-mail.']),
    '2025-09-09', '2026-01-14', 'jmensah', ['status' => 'modified',
     'draft' => "# Customer portal\n\nGive customers a single place to see all their invoices, download PDFs, update their saved card and – new in 4.11 – download their statement of account.\n\n## Steps\n\n1. Go to **Settings → Customer portal** and switch it on.\n2. Choose what customers can see.\n3. Copy the portal link into your e-mail signature."]);
$tree['invoicing'] = $p('Invoicing', "# Invoicing\n\nEverything about quotes, invoices, recurring billing, credit notes and getting paid on time.", '2025-02-14', '2026-07-30', 'jmensah', ['children' => $inv]);

/* ------------------------------------------------------------------ Expenses */
$tree['expenses'] = $p('Expenses and Bills', "# Expenses and Bills\n\nTrack what your business spends, from coffee receipts to supplier bills.", '2025-02-14', '2025-12-09', 'priyanair', ['nav' => 'Expenses', 'children' => [
    'capture-receipts' => $p('Capture receipts', howto('Capture receipts',
        'Snap a photo, forward an e-mail or drag a PDF into Ledgerline. We read the vendor, date, amount and tax for you.',
        ['In the mobile app, tap **+** and then **Scan receipt**.', 'On the web, drag files onto **Purchases → Receipts**.', 'Or forward e-mails to your personal receipts address, shown on the Receipts page (for example *acme-7f3k@receipts.ledgerline.io*).', 'Review the extracted data and click **Create expense** or match it to an existing bank transaction.'],
        'Receipts are stored for 10 years, which covers the retention period in the US, UK, Germany and Poland.'),
        '2025-02-25', '2026-06-30', 'priyanair'),
    'expense-categories' => $p('Expense categories', <<<MD
# Expense categories

Categories map to accounts in your chart of accounts. We start you off with a list that matches the IRS Schedule C and the UK self-assessment boxes, so your tax reports come out right.

You can rename categories, merge two that mean the same thing, or hide ones you never use. Deleting a category that has transactions is not possible – merge it instead.

* Advertising and marketing
* Bank fees
* Contractors
* Meals (50% deductible in the US)
* Office supplies
* Rent
* Software and subscriptions
* Travel
* Vehicle and mileage
MD, '2025-03-01', '2025-08-12', 'priyanair', ['nav' => 'Categories']),
    'mileage' => $p('Track mileage', howto('Track mileage',
        'Log business trips and Ledgerline calculates the deductible amount using the official rate for your country.',
        ['Go to **Purchases → Mileage** and click **Add trip**.', 'Enter the start and end address, or the distance.', 'Pick the vehicle and mark the trip as one-way or return.', 'Save. The amount is calculated with the current rate (US: 70¢/mile for 2025, UK: 45p/mile for the first 10,000 miles).'],
        null, ['Does the mobile app track trips automatically?' => 'Not yet. Automatic GPS tracking is planned for 2027.']),
        '2025-06-17', '2026-01-08', 'mokafor', ['nav' => 'Mileage']),
    'employee-reimbursements' => $p('Reimburse employees', howto('Reimburse employees',
        'When someone pays for a business expense with their own card, record it as a reimbursable expense and pay them back in one batch.',
        ['The employee adds the expense and selects **Paid by: me (reimbursable)**.', 'An Admin approves it under **Purchases → Approvals**.', 'Click **Pay reimbursements**, select the approved expenses and record the bank transfer.']),
        '2025-07-22', '2025-07-22', 'lfernandez', ['nav' => 'Reimbursements']),
    'bills-and-vendors' => $p('Bills and vendors', howto('Bills and vendors',
        'Enter supplier bills when they arrive so you always know what you owe and when it is due.',
        ['Go to **Purchases → Bills** and click **New bill**, or forward the PDF to your receipts address.', 'Choose the vendor, bill date and due date.', 'Add lines with categories and tax.', 'Save. The bill appears in *Aged payables* until you record the payment.'],
        'Schedule a payment date on the bill to see it in the cash flow forecast.'),
        '2025-03-14', '2025-12-09', 'priyanair', ['nav' => 'Bills']),
]]);

/* ------------------------------------------------------------------ Banking */
$banks = ['Chase', 'Bank of America', 'Wells Fargo', 'Mercury', 'Brex', 'Barclays', 'HSBC UK', 'Monzo Business', 'Starling', 'Revolut Business', 'Wise Business', 'Deutsche Bank', 'Commerzbank', 'N26 Business', 'ING', 'PKO Bank Polski', 'mBank', 'Santander'];
$bankTable = "| Bank | Country | Connection | History |\n|---|---|---|---|\n";
foreach ($banks as $i => $b) {
    $c = $i < 5 ? 'US' : ($i < 11 ? 'UK' : ($i < 15 ? 'DE / EU' : 'PL'));
    $bankTable .= "| $b | $c | " . ($i % 4 === 3 ? 'Open Banking (re-consent every 180 days)' : ($i < 5 ? 'Plaid' : 'Open Banking')) . " | " . ([24, 12, 24, 18][$i % 4]) . " months |\n";
}
$tree['banking'] = $p('Banking', "# Banking\n\nConnect accounts, categorise transactions and reconcile your books with your bank statements.", '2025-02-14', '2026-10-21', 'priyanair', ['children' => [
    'bank-feeds' => $p('Bank feeds', "# Bank feeds\n\nBank feeds import transactions automatically every few hours, so you never have to upload a statement again.", '2025-02-19', '2026-10-21', 'priyanair', ['children' => [
        'connect-a-bank-account' => $p('Connect a bank account', howto('Connect a bank account',
            'Connect your business bank account and Ledgerline imports transactions automatically, usually three to four times per day.',
            ['Go to **Banking** and click **Add bank account**.', 'Search for your bank. If it is not listed, you can still [import statements](/banking/bank-feeds/import-bank-statements).', 'Sign in to your bank in the secure window. Ledgerline never sees your bank password.', 'Choose which accounts to connect and how far back to import (up to 24 months for most banks).', 'Click **Connect**. The first import can take a few minutes.'],
            'In the UK and EU, Open Banking rules require you to re-confirm the connection every 180 days. We e-mail you 7 days before it expires.',
            ['Is it safe?' => 'Connections are read-only and run through regulated providers (Plaid in the US, TrueLayer in the UK and EU). Ledgerline cannot move money.',
             'Which accounts can I connect?' => 'Checking, savings and credit card accounts. Loan and investment accounts are not supported.']),
            '2025-02-19', '2026-10-21', 'priyanair', ['nav' => 'Connect a bank']),
        'supported-banks' => $p('Supported banks', "# Supported banks\n\nThese are the most-used connections. More than 12,000 institutions are supported in total – search for yours in the app.\n\n$bankTable\n! Last checked by the support team on 1 October 2026.", '2025-02-19', '2026-10-01', 'lfernandez'),
        'import-bank-statements' => $p('Import bank statements', howto('Import bank statements',
            'If your bank does not support a live feed, import statement files instead. Ledgerline reads CSV, OFX, QFX, QIF, CAMT.053 and MT940.',
            ['Download a statement from online banking.', 'In **Banking**, open the account and click **Import statement**.', 'Upload the file and check the column mapping for CSV files.', 'Ledgerline skips transactions it has already imported, so overlapping date ranges are fine.']),
            '2025-03-07', '2025-11-02', 'priyanair', ['nav' => 'Import statements']),
        'fix-a-broken-bank-feed' => $p('Fix a broken bank feed', <<<MD
# Fix a broken bank feed

If transactions stop appearing, the connection probably needs attention. Check the status icon next to the account in **Banking**.

| Status | What it means | What to do |
|---|---|---|
| Green | Working | Nothing |
| Yellow – *Reconnect needed* | Your consent expired or the bank changed its login | Click **Reconnect** and sign in again |
| Red – *Bank unavailable* | The bank's service is down | Wait; we retry every hour |
| Grey – *Paused* | You or an admin paused the feed | Click **Resume** |

## Duplicate transactions

Duplicates usually appear when a statement file was imported for the same period as a live feed. Select the duplicates and click **Delete**; reconciled transactions cannot be deleted until you unreconcile them.

## Missing transactions

Pending card transactions show up only after they settle, which takes 1–3 business days. If something older is missing, use **Refresh feed** and, if needed, import a statement for that period.

!! Known issue (October 2026): HSBC UK business accounts occasionally import transactions twice after reconnecting. We are working with HSBC on a fix.
MD, '2025-04-29', '2026-10-21', 'lfernandez', ['nav' => 'Troubleshooting feeds']),
    ]]),
    'reconcile-transactions' => $p('Reconcile transactions', <<<MD
# Reconcile transactions

Reconciling means confirming that every transaction in your bank feed is recorded correctly in Ledgerline. Do it weekly and month-end takes minutes instead of days.

## How matching works

For each bank transaction Ledgerline suggests a match:

* an **invoice** or **bill** with the same amount,
* an **expense** with a similar date and amount, or
* a **rule** you created earlier.

Click **OK** to accept the suggestion, or **Find & match** to pick something else.

## Reconcile a statement period

1. Go to **Banking → Reconcile**.
2. Choose the account and enter the closing balance from your bank statement.
3. Tick off each transaction. The difference at the top should reach 0.00.
4. Click **Finish reconciliation**. Ledgerline locks the period so it cannot be changed by accident.

! Reconciled transactions show a small padlock. An Admin can unlock a period from **Banking → Reconciliation history**.
MD, '2025-02-21', '2026-04-14', 'priyanair', ['nav' => 'Reconcile']),
    'bank-rules' => $p('Bank rules', howto('Bank rules',
        'Rules categorise recurring transactions automatically, for example your monthly rent, software subscriptions or card processing fees.',
        ['Go to **Banking → Rules** and click **New rule**.', 'Set conditions, for example *Description contains "ADOBE"* and *Amount is less than 100*.', 'Choose the category, tax rate and, optionally, a vendor.', 'Decide whether the rule only suggests a match or reconciles automatically.'],
        'Rules run in order from top to bottom. Drag them to change priority.'),
        '2025-03-26', '2026-02-11', 'priyanair', ['nav' => 'Rules']),
    'transfers-between-accounts' => $p('Transfers between accounts', howto('Transfers between accounts',
        'Moving money from checking to savings is not income or an expense. Record it as a transfer so your reports stay accurate.',
        ['Find the outgoing transaction in the first account.', 'Click **Find & match → Transfer** and pick the receiving account.', 'Ledgerline links it to the incoming transaction automatically when it appears.']),
        '2025-05-13', '2025-05-13', 'aberg', ['nav' => 'Transfers']),
    'cash-accounts' => $p('Petty cash', "# Petty cash\n\nTrack a cash box like any other account: create a manual account called *Petty cash*, record top-ups as transfers from your bank and enter expenses against it.\n\nThis article needs screenshots.", '2026-08-30', '2026-08-30', 'mokafor', ['status' => 'draft']),
]]);

/* ------------------------------------------------------------------ Taxes */
$tree['taxes'] = $p('Taxes', "# Taxes\n\nSales tax, VAT and year-end. Ledgerline calculates the numbers; always check filings with your accountant.", '2025-02-14', '2026-11-04', 'mokafor', ['children' => [
    'set-up-sales-tax' => $p('Set up sales tax or VAT', <<<MD
# Set up sales tax or VAT

Tell Ledgerline where you are registered and it creates the right tax rates for you.

## United States

1. Go to **Settings → Taxes** and click **Add registration**.
2. Choose the state and enter your permit number.
3. Ledgerline loads state, county and city rates. For destination-based states, rates are calculated from the customer's shipping address.

## United Kingdom

Enter your VAT number and choose your scheme: *Standard*, *Cash accounting* or *Flat rate*. The rates 20%, 5%, 0% and exempt are created automatically.

## European Union

Enter your VAT number. For sales to other EU businesses, Ledgerline applies the reverse charge and adds the required note to the invoice when the customer has a valid VAT ID.

| Country | Standard rate | Reduced rates |
|---|---|---|
| Germany | 19% | 7% |
| Poland | 23% | 8%, 5% |
| Spain | 21% | 10%, 4% |
| France | 20% | 10%, 5.5%, 2.1% |
| Netherlands | 21% | 9% |
MD, '2025-02-27', '2026-03-31', 'mokafor', ['nav' => 'Sales tax and VAT']),
    'file-a-vat-return-uk' => $p('File a VAT return with HMRC (UK)', howto('File a VAT return with HMRC (UK)',
        'Ledgerline is recognised by HMRC for Making Tax Digital. You can submit VAT returns directly from the app.',
        ['Go to **Reports → VAT return**.', 'Click **Connect to HMRC** the first time and sign in with your Government Gateway ID.', 'Choose the open period. Ledgerline fills in boxes 1–9.', 'Review the transactions behind each box, then click **Submit to HMRC**.', 'Download the receipt for your records.'],
        'Once submitted, a return cannot be changed. Corrections under £10,000 can be included in your next return.',
        ['My numbers differ from my accountant\'s spreadsheet.' => 'The usual causes are transactions dated in the wrong period, or bills entered with the wrong VAT rate. Use the *Drill down* link on each box.']),
        '2025-03-20', '2026-08-27', 'mokafor', ['nav' => 'VAT return (UK)']),
    '1099-contractors' => $p('1099 forms for contractors (US)', howto('1099 forms for contractors (US)',
        'If you paid a US contractor $600 or more during the year, you probably need to file a 1099-NEC by January 31.',
        ['Mark vendors as 1099 contractors on the vendor page and add their TIN (from Form W-9).', 'In January, go to **Reports → 1099 summary**.', 'Review the amounts. Card payments are excluded because the card processor reports them.', 'Click **E-file** to submit to the IRS and e-mail copies to your contractors ($4.50 per form).']),
        '2025-11-18', '2026-01-12', 'mokafor', ['nav' => '1099 forms']),
    'year-end-close' => $p('Year-end close checklist', <<<MD
# Year-end close checklist

Work through this list before you hand your books to your accountant.

1. Reconcile every bank and card account to 31 December (or your fiscal year end).
2. Review **Aged receivables**. Write off invoices you will not collect.
3. Review **Aged payables** and enter any missing bills.
4. Record depreciation for fixed assets.
5. Check the balance of *Undeposited funds* – it should be zero.
6. Run the **Trial balance** and send it to your accountant.
7. Lock the period in **Settings → Lock dates**.

! Your accountant can do steps 4 to 7 for you if you invite them with the free Accountant role.
MD, '2025-12-02', '2026-11-04', 'dkowalski', ['nav' => 'Year-end close']),
    'tax-rates-germany' => $p('Umsatzsteuer: Kleinunternehmerregelung (DE)', "# Kleinunternehmerregelung\n\nIf you use the small business scheme under §19 UStG, choose **Settings → Taxes → Germany → Kleinunternehmer**. Ledgerline removes VAT from your invoices and adds the required note.\n\nFrom 1 January 2025 the thresholds are €25,000 for the previous year and €100,000 for the current year.", '2026-02-09', '2026-02-09', 'lfernandez', ['nav' => 'Kleinunternehmer (DE)']),
]]);

/* ------------------------------------------------------------------ Payroll (beta, partly hidden) */
$tree['payroll'] = $p('Payroll (beta)', "# Payroll (beta)\n\nPayroll is in beta for US customers in 14 states. Pages in this section change often.", '2026-06-02', '2026-11-10', 'mokafor', ['nav' => 'Payroll (beta)', 'children' => [
    'run-your-first-payroll' => $p('Run your first payroll', howto('Run your first payroll',
        'Pay employees and contractors and let Ledgerline handle withholding, filings and year-end forms.',
        ['Go to **Payroll → Setup** and add your federal EIN and state account numbers.', 'Add employees. They receive an invite to enter their W-4 and bank details.', 'Choose a pay schedule: weekly, every two weeks, twice a month or monthly.', 'Click **Run payroll**, review hours and amounts, and approve at least 2 business days before payday.'],
        'Payroll beta is available in CA, CO, FL, GA, IL, MA, NC, NJ, NY, OH, PA, TX, VA and WA.'),
        '2026-06-02', '2026-11-10', 'mokafor', ['nav' => 'First payroll']),
    'payroll-taxes' => $p('Payroll taxes', "# Payroll taxes\n\nLedgerline calculates federal income tax withholding, Social Security, Medicare, FUTA and state taxes for supported states. Filings (941, 940, state equivalents) are submitted automatically.", '2026-06-09', '2026-09-01', 'mokafor', ['status' => 'modified', 'draft' => "# Payroll taxes\n\nLedgerline calculates federal income tax withholding, Social Security (6.2% up to the wage base), Medicare (1.45%), FUTA and state taxes for supported states.\n\n## Filings\n\nForms 941 and 940 and the state equivalents are submitted automatically. You can download copies under **Payroll → Filings**.\n\n! Local taxes in Ohio and Pennsylvania are not supported in the beta."]),
    'contractor-payments' => $p('Pay contractors through payroll', "# Pay contractors through payroll\n\nContractors can be paid by direct deposit for $2 per payment. Amounts flow into the 1099 summary automatically.", '2026-07-14', '2026-07-14', 'tbrzezinski', ['nav' => 'Contractor payments', 'hide' => true]),
]]);

/* ------------------------------------------------------------------ Reports */
$reports = [
    'profit-and-loss' => ['Profit and loss', 'The profit and loss report (also called income statement) shows income, expenses and net profit for a period. Compare months side by side or against the same period last year.'],
    'balance-sheet' => ['Balance sheet', 'The balance sheet shows what your business owns (assets), what it owes (liabilities) and the owners\' equity on a specific date.'],
    'cash-flow-statement' => ['Cash flow statement', 'See where cash came from and where it went, split into operating, investing and financing activities.'],
    'aged-receivables' => ['Aged receivables', 'Who owes you money and for how long. Invoices are grouped into current, 1–30, 31–60, 61–90 and 90+ days overdue.'],
    'sales-by-customer' => ['Sales by customer', 'Find your biggest customers and spot the ones whose spend is dropping.'],
    'custom-reports' => ['Build a custom report', 'Pick columns, filters and grouping to build the exact report you need, then save it or schedule it by e-mail.'],
];
$rc = [];
$i = 0;
foreach ($reports as $slug => [$t, $intro]) {
    $created = date('Y-m-d', strtotime('2025-03-03 +' . ($i * 19) . ' days'));
    $modified = date('Y-m-d', strtotime($created . ' +' . (40 + $i * 53) . ' days'));
    $rc[$slug] = $p($t, "# $t\n\n$intro\n\n## Open the report\n\nGo to **Reports** and click **$t**. Use the date picker to choose a period – *This month*, *Last quarter*, *Year to date* or a custom range.\n\n## Options\n\n* **Basis** – accrual (default) or cash\n* **Compare** – previous period or previous year\n* **Group by** – month, quarter, class or project\n\n## Export\n\nDownload as PDF, Excel or CSV, or click **Schedule** to e-mail it every month to you and your accountant.",
        $created, $modified, $i % 2 ? 'aberg' : 'priyanair');
    $i++;
}
$rc['custom-reports']['status'] = 'modified';
$rc['custom-reports']['draft'] = "# Build a custom report\n\nPick columns, filters and grouping to build the exact report you need.\n\n## New: share reports with your team\n\nSaved reports can now be shared with other users in the company. Click **Share** and pick the people or roles.";
$tree['reports'] = $p('Reports', "# Reports\n\nUnderstand how your business is doing. All reports can be exported to PDF, Excel and CSV.", '2025-03-03', '2026-05-28', 'priyanair', ['children' => $rc]);

/* ------------------------------------------------------------------ Integrations */
$integ = [
    'stripe' => ['Accept card payments with Stripe', 'Connect Stripe and customers can pay invoices by card, Apple Pay, Google Pay, ACH or SEPA debit. Payments are matched to the invoice automatically and fees are recorded as an expense.', 'jmensah'],
    'paypal' => ['Accept PayPal', 'Add a PayPal button to your invoices. PayPal fees are recorded automatically when the payment is matched.', 'jmensah'],
    'shopify' => ['Shopify', 'Import daily sales summaries from Shopify, including taxes, discounts, refunds and payout fees, as one journal per day.', 'tbrzezinski'],
    'gusto' => ['Gusto payroll', 'Already use Gusto? Sync payroll journals into Ledgerline after every pay run, mapped to your wage and tax accounts.', 'tbrzezinski'],
    'zapier' => ['Zapier', 'Connect Ledgerline to 6,000+ apps. Popular zaps: create a customer from a new HubSpot deal, or post to Slack when an invoice is paid.', 'tbrzezinski'],
    'google-workspace' => ['Google Workspace sign-in', 'Let your team sign in with their Google Workspace account and enforce your organisation\'s 2-step verification policy.', 'aberg'],
];
$ic = []; $i = 0;
foreach ($integ as $slug => [$t, $intro, $own]) {
    $created = date('Y-m-d', strtotime('2025-04-08 +' . ($i * 31) . ' days'));
    $ic[$slug] = $p($t, howto($t, $intro, ['Go to **Settings → Integrations**.', "Find **" . explode(' ', str_replace(['Accept card payments with ', 'Accept '], '', $t))[0] . "** and click **Connect**.", 'Sign in and approve the requested permissions.', 'Choose the accounts Ledgerline should post to, then click **Save**.'],
        $slug === 'stripe' ? 'Stripe fees are 2.9% + 30¢ per card payment in the US. Ledgerline adds no extra fee.' : null),
        $created, date('Y-m-d', strtotime($created . ' +' . (20 + $i * 47) . ' days')), $own, ['nav' => str_replace(['Accept card payments with ', 'Accept '], '', $t)]);
    $i++;
}
$ic['api-reference'] = $p('REST API', <<<MD
# REST API

The Ledgerline API lets you read and write invoices, customers, items, payments and bank transactions. It is available on the Scale plan.

## Authentication

Create an API key in **Settings → Developers**. Send it as a bearer token:

```
curl https://api.ledgerline.io/v2/invoices?status=overdue \
  -H "Authorization: Bearer ll_live_••••••••••••"
```

## Rate limits

120 requests per minute per company. Responses include `X-RateLimit-Remaining`.

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /v2/invoices | List invoices |
| POST | /v2/invoices | Create an invoice |
| GET | /v2/invoices/{id} | Retrieve an invoice |
| POST | /v2/invoices/{id}/send | Send by e-mail |
| GET | /v2/customers | List customers |
| POST | /v2/payments | Record a payment |
| GET | /v2/bank-transactions | List bank transactions |

Full OpenAPI specification: `https://api.ledgerline.io/v2/openapi.json`
MD, '2025-06-24', '2026-09-08', 'tbrzezinski', ['nav' => 'API', 'allowedrole' => 'member']);
$ic['webhooks'] = $p('Webhooks', <<<MD
# Webhooks

Webhooks notify your server when something happens in Ledgerline.

## Events

* `invoice.created`, `invoice.sent`, `invoice.paid`, `invoice.overdue`
* `payment.received`
* `customer.updated`
* `bank_transaction.imported`

## Verifying signatures

Each request has a `Ledgerline-Signature` header – an HMAC-SHA256 of the raw body using your webhook secret.

```php
\$expected = hash_hmac('sha256', \$payload, \$secret);
if (!hash_equals(\$expected, \$_SERVER['HTTP_LEDGERLINE_SIGNATURE'])) {
    http_response_code(400);
    exit;
}
```

We retry failed deliveries with exponential backoff for up to 72 hours.
MD, '2025-07-01', '2026-02-17', 'tbrzezinski', ['status' => 'modified', 'draft' => "# Webhooks\n\nWebhooks notify your server when something happens in Ledgerline.\n\n## Events\n\n* `invoice.created`, `invoice.sent`, `invoice.paid`, `invoice.overdue`, `invoice.voided`\n* `payment.received`, `payment.refunded`\n* `customer.updated`\n* `bank_transaction.imported`\n\n!! `invoice.voided` and `payment.refunded` are only sent to endpoints using API version 2026-10-01 or later."]);
$tree['integrations'] = $p('Integrations', "# Integrations\n\nConnect Ledgerline with payment providers, e-commerce, payroll and your own systems.", '2025-04-08', '2026-09-08', 'tbrzezinski', ['children' => $ic]);

/* ------------------------------------------------------------------ Account & billing */
$tree['account-and-billing'] = $p('Account and Billing', "# Account and Billing\n\nManage your subscription, security settings and your data.", '2025-02-14', '2026-11-02', 'dkowalski', ['nav' => 'Account & billing', 'children' => [
    'plans-and-pricing' => $p('Plans and pricing', <<<MD
# Plans and pricing

| | Starter | Growth | Scale |
|---|---|---|---|
| Price (billed yearly) | \$15 / month | \$35 / month | \$70 / month |
| Users | 1 | 5 | Unlimited |
| Invoices | 20 per month | Unlimited | Unlimited |
| Bank feeds | 1 account | Unlimited | Unlimited |
| Multi-currency | – | ✔ | ✔ |
| Projects and classes | – | ✔ | ✔ |
| API access | – | – | ✔ |
| Priority support | – | – | ✔ |

Monthly billing is 20% more. Prices exclude VAT and sales tax. Accountant seats are always free.
MD, '2025-02-14', '2026-07-01', 'skimura', ['nav' => 'Plans']),
    'change-or-cancel-your-plan' => $p('Change or cancel your plan', howto('Change or cancel your plan',
        'You can upgrade, downgrade or cancel at any time from Settings → Billing.',
        ['Go to **Settings → Billing**.', 'Click **Change plan** and pick the new plan. Upgrades apply immediately and are prorated.', 'To cancel, click **Cancel subscription** at the bottom of the page. Your data stays available read-only for 12 months.'],
        'Downgrading to Starter disconnects all but one bank feed. Choose which feed to keep before you downgrade.'),
        '2025-02-17', '2026-03-02', 'skimura', ['nav' => 'Change or cancel']),
    'two-factor-authentication' => $p('Two-factor authentication', howto('Two-factor authentication',
        'Protect your books with a second step at sign-in. We support authenticator apps, security keys (WebAuthn/passkeys) and SMS as a fallback.',
        ['Click your avatar and choose **Security**.', 'Click **Turn on two-factor authentication**.', 'Scan the QR code with an authenticator app such as 1Password, Authy or Google Authenticator.', 'Save your 10 backup codes somewhere safe.'],
        'Owners can require 2FA for everyone under Settings → Users → Security policy.'),
        '2025-03-12', '2026-11-02', 'aberg', ['nav' => '2FA']),
    'export-your-data' => $p('Export your data', "# Export your data\n\nYour data belongs to you. Go to **Settings → Export** to download a ZIP file with CSV files for every list (customers, invoices, transactions, journals) plus PDFs of all invoices and attached receipts. Large exports are prepared in the background and e-mailed to you.", '2025-08-05', '2025-08-05', 'dkowalski', ['nav' => 'Export data']),
    'privacy-and-gdpr' => $p('Privacy and GDPR', "# Privacy and GDPR\n\nLedgerline stores EU customer data in Frankfurt (AWS eu-central-1) and US customer data in Virginia (us-east-1). Our Data Processing Agreement is available under **Settings → Legal**. To request deletion of a customer's personal data, open the customer and choose **More → Anonymise**.", '2025-05-27', '2026-01-19', 'dkowalski', ['nav' => 'Privacy']),
    'billing-faq' => $p('Billing FAQ', "# Billing FAQ", '2025-02-17', '2025-03-02', 'dkowalski', ['nav' => 'Billing FAQ', 'reference' => '/account-and-billing/change-or-cancel-your-plan', 'referencetype' => 'redirect301']),
]]);

/* ------------------------------------------------------------------ Release notes (posts) */
$releases = [
    ['2025-03-04', '4.0', 'Ledgerline 4.0: a faster, redesigned app', 'The biggest update since launch: a redesigned dashboard, 3× faster invoice search, and a new navigation that puts Sales, Purchases and Banking one click away.', ['New dashboard with cash flow widget', 'Invoice search now covers line item descriptions', 'Dark mode (beta)']],
    ['2025-03-27', '4.0.3', 'Bug fixes for recurring invoices', 'This maintenance release fixes issues some customers saw after migrating recurring profiles to the new scheduler.', ['Recurring invoices no longer skip February in leap years', 'Fixed duplicate reminder e-mails for invoices created from quotes', 'PDF footer no longer overlaps long notes']],
    ['2025-04-22', '4.1', 'Quotes get online acceptance', 'Customers can now accept or decline quotes from the web view, and you can convert accepted quotes to invoices in one click.', ['Online quote acceptance with typed signature', 'Quote expiry reminders', 'Convert quote to deposit invoice']],
    ['2025-05-20', '4.2', 'Mobile receipt scanning', 'Snap a receipt in the iOS and Android apps and Ledgerline extracts the vendor, date, total and tax.', ['Receipt OCR in 11 languages', 'Forward receipts to your personal e-mail address', 'Match receipts to bank transactions']],
    ['2025-06-17', '4.3', 'Mileage tracking', 'Log business trips and Ledgerline calculates the deduction using the official IRS and HMRC rates.', ['Mileage log with vehicles', 'Round-trip toggle', 'Mileage report for tax time']],
    ['2025-07-15', '4.4', 'Webhooks and API v2', 'Developers on the Scale plan can now subscribe to webhooks and use the new v2 REST API with cursor pagination.', ['Webhooks for invoices, payments and customers', 'API v2 with OpenAPI spec', 'API keys with read-only scope']],
    ['2025-08-26', '4.5', 'Bank rules 2.0', 'Rules can now match on amount ranges and multiple conditions, and can reconcile automatically.', ['AND/OR conditions', 'Amount ranges', 'Auto-reconcile option', 'Rule priority by drag and drop']],
    ['2025-09-23', '4.6', 'Customer portal', 'Give customers one link to see every invoice, download PDFs and update their saved card.', ['Customer portal', 'Saved cards via Stripe', 'Statement PDFs']],
    ['2025-10-28', '4.6.2', 'Improvements to multi-currency', 'Exchange gains and losses are now calculated per payment instead of per invoice, which is more accurate for invoices paid in instalments.', ['Per-payment FX gains/losses', 'Manual exchange rate override per invoice', 'Fixed rounding on JPY invoices']],
    ['2025-11-25', '4.7', '1099 e-filing', 'File 1099-NEC forms with the IRS and send copies to contractors without leaving Ledgerline.', ['1099-NEC e-filing', 'TIN matching', 'Contractor copies by e-mail']],
    ['2026-01-13', '4.8', 'Year-end tools', 'A guided year-end checklist and lock dates to keep closed periods safe.', ['Year-end checklist', 'Lock dates per user role', 'Trial balance export for accountants']],
    ['2026-02-10', '4.8.1', 'Security: passkeys', 'You can now sign in with passkeys and hardware security keys.', ['Passkey sign-in', 'Security keys (WebAuthn)', 'Owners can require 2FA for all users']],
    ['2026-03-17', '4.9', 'EU reverse charge and VIES checks', 'Ledgerline now checks customer VAT IDs against VIES and applies the reverse charge automatically for valid B2B sales within the EU.', ['VIES validation', 'Automatic reverse-charge note', 'OSS report for EU distance sales']],
    ['2026-04-21', '4.9.4', 'Fixes for HMRC submissions', 'A handful of fixes for VAT returns submitted under the flat rate scheme.', ['Flat rate percentage now applied to box 1', 'Clearer error when Government Gateway session expires']],
    ['2026-05-26', '4.10', 'Custom reports', 'Build your own reports with any columns, filters and grouping, save them and schedule them by e-mail.', ['Custom report builder', 'Scheduled reports', 'Excel export with formulas']],
    ['2026-06-09', '4.10.1', 'Payroll beta opens in 14 US states', 'Payroll is now in open beta for US companies in 14 states.', ['Run payroll with automatic tax filings', 'Employee self-onboarding', 'W-2 and 1099 at year end']],
    ['2026-07-21', '4.11', 'Statements and portal improvements', 'Customers can download their statement of account from the portal, and you can send statements in bulk.', ['Statement of account in the portal', 'Bulk statement sending', 'Portal branding']],
    ['2026-08-25', '4.11.2', 'Reminder schedule editor', 'You can now edit the timing and text of each reminder, and add up to eight steps.', ['Up to 8 reminder steps', 'Per-customer reminder pause', 'Preview reminder e-mails']],
    ['2026-09-29', '4.12', 'Import from Sage and Zoho Books', 'The import assistant now supports Sage 50 and Zoho Books exports.', ['Sage 50 CSV import (beta)', 'Zoho Books import', 'Faster mapping screen']],
    ['2026-10-27', '4.12.3', 'Bank feed reliability update', 'We moved UK and EU bank connections to a new provider infrastructure. Most customers will not notice anything – except fewer broken feeds.', ['Fewer reconnect prompts', 'Faster first import', 'Known issue: HSBC UK duplicates after reconnect']],
];
$posts = [];
foreach ($releases as $k => [$date, $ver, $title, $intro, $items]) {
    $slug = 'release-' . str_replace('.', '-', $ver);
    $body = "# $title\n\n$intro\n\n## What's new in $ver\n\n" . implode("\n", array_map(fn($x) => "* $x", $items)) . "\n\nAs always, tell us what you think at feedback@ledgerline.io.";
    $posts[$slug] = $p($title, $body, $date, date('Y-m-d', strtotime($date . ' +' . ($k % 3) . ' days')), $k % 4 === 1 ? 'jmensah' : 'dkowalski',
        ['nav' => $title, 'manualdate' => $date, 'author' => $k % 4 === 1 ? 'Joseph Mensah' : 'Dana Kowalski', 'time' => sprintf('%02d-%02d-00', 9 + $k % 6, ($k * 7) % 60)]);
}
// upcoming release, not yet published
$posts['release-4-13'] = $p('Ledgerline 4.13: deposit invoices and AI categorisation', "# Ledgerline 4.13: deposit invoices and AI categorisation\n\nComing 24 November 2026.\n\n* Deposit and milestone invoices\n* Smart categorisation suggestions for bank transactions\n* Petty cash accounts\n\n(Draft – waiting for final scope from Sae)", '2026-11-12', '2026-11-17', 'dkowalski', ['nav' => 'Ledgerline 4.13', 'status' => 'draft', 'manualdate' => '2026-11-24', 'author' => 'Dana Kowalski', 'time' => '15-20-00']);
$tree['release-notes'] = $p('Release Notes', "# Release Notes\n\nWhat changed in Ledgerline, release by release.", '2025-03-04', '2026-10-27', 'dkowalski', ['contains' => 'posts', 'children' => $posts]);

/* ------------------------------------------------------------------ Internal (hidden, restricted) */
$tree['internal'] = $p('Internal: Docs team', "# Internal: Docs team\n\nWorkspace for the documentation team. Not visible in navigation.", '2025-02-20', '2026-10-12', 'dkowalski', ['nav' => 'Internal', 'hide' => true, 'allowedrole' => 'editor', 'children' => [
    'style-guide' => $p('Docs style guide', <<<MD
# Docs style guide

* Write in second person ("you"), present tense.
* UI labels in **bold**, navigation paths with arrows: **Settings → Company**.
* One task per article. If you need more than 8 steps, split the article.
* Use notices sparingly: `!` for tips, `!!` for warnings, `!!!` for things that cause data loss.
* US English spelling, except on UK- and EU-specific tax pages.
* Never use real customer names or data in screenshots – use the *Juniper & Oak Studio* demo company.

## Review process

Contributors save drafts; an editor reviews and publishes. Release notes are published by Dana on release day, 10:00 CET.
MD, '2025-02-20', '2026-10-12', 'dkowalski', ['allowedrole' => 'editor']),
    'support-macros' => $p('Support macros that link to docs', "# Support macros that link to docs\n\n| Macro | Article |\n|---|---|\n| BANK-RECONNECT | /banking/bank-feeds/fix-a-broken-bank-feed |\n| INV-NOT-RECEIVED | /invoicing/create-and-send-an-invoice |\n| VAT-MTD | /taxes/file-a-vat-return-uk |\n| IMPORT-QBO | /getting-started/import-from-another-tool |\n| 2FA-LOCKED-OUT | /account-and-billing/two-factor-authentication |\n\nLucía updates this table when macros change in Zendesk.", '2025-05-06', '2026-09-24', 'lfernandez', ['allowedrole' => 'editor']),
    'content-audit-2026' => $p('Content audit Q4 2026', "# Content audit Q4 2026\n\n- [ ] Screenshots in Banking still show the pre-4.0 sidebar\n- [ ] Reports section: add cash basis explanation\n- [x] Remove Wave import page (merged into Import data)\n- [ ] Payroll beta pages: legal review before GA\n- [ ] Check all links after the 4.12 menu rename", '2026-10-05', '2026-11-13', 'skimura', ['status' => 'draft']),
]]);

return $tree;
