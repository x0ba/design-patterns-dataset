<?php
// Team behind the Ledgerline Help Center. dkowalski is created via the /tm/setup form first; here it is enriched.
$ts = fn($d) => strtotime($d);
return [
    ['username' => 'dkowalski', 'email' => 'dana.kowalski@ledgerline.io', 'userrole' => 'administrator', 'firstname' => 'Dana', 'lastname' => 'Kowalski',
     'description' => 'Head of Documentation at Ledgerline. Owns the help center structure and release notes.', 'lastlogin' => $ts('2026-11-18 09:12'), 'plainpassword' => 'Ledgerline-2026'],
    ['username' => 'jmensah', 'email' => 'joseph.mensah@ledgerline.io', 'userrole' => 'editor', 'firstname' => 'Joseph', 'lastname' => 'Mensah',
     'description' => 'Senior technical writer, invoicing and payments.', 'lastlogin' => $ts('2026-11-17 16:40'), 'plainpassword' => 'Mensah!Docs24'],
    ['username' => 'priyanair', 'email' => 'priya.nair@ledgerline.io', 'userrole' => 'author', 'firstname' => 'Priya', 'lastname' => 'Nair',
     'description' => 'Writes the banking, reconciliation and reports guides.', 'lastlogin' => $ts('2026-11-14 11:05'), 'plainpassword' => 'Nair-Banking-77'],
    ['username' => 'tbrzezinski', 'email' => 'tomasz.brzezinski@ledgerline.io', 'userrole' => 'author', 'firstname' => 'Tomasz', 'lastname' => 'Brzeziński',
     'description' => 'Integrations engineer; maintains the API and webhook docs.', 'lastlogin' => $ts('2026-11-03 08:51'), 'plainpassword' => 'Tomasz-API-2025'],
    ['username' => 'lfernandez', 'email' => 'lucia.fernandez@ledgerline.io', 'userrole' => 'contributor', 'firstname' => 'Lucía', 'lastname' => 'Fernández',
     'description' => 'Customer support lead (EMEA). Contributes troubleshooting articles.', 'lastlogin' => $ts('2026-10-29 14:22'), 'plainpassword' => 'Lucia-Support-9'],
    ['username' => 'mokafor', 'email' => 'm.okafor@ledgerline.io', 'userrole' => 'contributor', 'firstname' => 'Michael', 'lastname' => 'Okafor',
     'description' => 'Support specialist, payroll and tax questions.', 'lastlogin' => $ts('2026-09-30 10:02'), 'plainpassword' => 'Okafor-Tax-2026'],
    ['username' => 'skimura', 'email' => 'sae.kimura@ledgerline.io', 'userrole' => 'manager', 'firstname' => 'Sae', 'lastname' => 'Kimura',
     'description' => 'Product manager for the help center and in-app guidance.', 'lastlogin' => $ts('2026-11-12 13:37'), 'plainpassword' => 'Kimura-PM-2026'],
    ['username' => 'rholloway', 'email' => 'rachel.holloway@brightwater-accounting.co.uk', 'userrole' => 'member', 'firstname' => 'Rachel', 'lastname' => 'Holloway',
     'description' => 'Partner accountant (Brightwater Accounting), reviews UK VAT articles.', 'lastlogin' => $ts('2026-08-19 19:15'), 'plainpassword' => 'Holloway-VAT-1'],
    ['username' => 'aberg', 'email' => 'anders.berg@ledgerline.io', 'userrole' => 'author', 'firstname' => 'Anders', 'lastname' => 'Berg',
     'description' => 'Former writer, moved to the product team in May 2026.', 'lastlogin' => $ts('2026-04-28 17:48'), 'plainpassword' => 'Berg-Former-22'],
];
