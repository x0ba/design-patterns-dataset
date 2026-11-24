#!/usr/bin/env node
// Local stand-in for Kresus' Python/Woob bridge (server/providers/woob/py/main.py).
// Kresus spawns `$KRESUS_PYTHON_EXEC main.py <command> --module X --login Y ...`
// and parses a JSON document from stdout. Instead of scraping real banks, this
// stub answers from woob-stub-data.json (written by seed.js), so "sync now"
// works offline and returns the same accounts/transactions the bank would.
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(3); // [0]=node, [1]=this file, [2]=main.py
const command = args[0];
const opt = name => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : null;
};

const out = obj => {
    process.stdout.write(JSON.stringify(obj));
    process.exit(0);
};

if (command === 'version') out({ values: '3.7' });
if (command === 'test') out({});

const dataFile = process.env.WOOB_STUB_DATA || path.join(__dirname, 'data', 'woob-stub-data.json');
let data = {};
try {
    data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
} catch (_e) {
    // no data: behave like a bank with no accounts.
}

const key = `${opt('module')}:${opt('login')}`;
const entry = data[key];

if (!process.env.KRESUS_WOOB_PWD) {
    out({ error_code: 'NO_PASSWORD', error_message: 'Password is not set' });
}
if (!entry) {
    out({ error_code: 'INVALID_PASSWORD', error_message: 'Wrong login or password' });
}
if (entry.error) {
    out({ error_code: entry.error, error_message: entry.errorMessage || entry.error });
}

if (command === 'accounts') {
    out({ values: entry.accounts, errors: [] });
}
if (command === 'transactions') {
    const from = opt('fromDate') ? new Date(Number(opt('fromDate')) * 1000) : null;
    const values = entry.transactions.filter(t => !from || new Date(t.date) >= from);
    out({ values, errors: [] });
}
out({ error_code: 'INTERNAL_ERROR', error_message: `unknown command ${command}` });
