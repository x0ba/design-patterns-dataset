#!/usr/bin/env node
// Seeds a running Kresus instance through its own JSON import endpoint
// (POST /api/all/), with ~15 months of realistic personal-finance data
// for "Camille Martin" (Lyon), and writes data/woob-stub-data.json so the woob
// stub can answer bank syncs with the same accounts and recent transactions.
//
// usage: node seed.js http://localhost:5417
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.argv[2] || 'http://localhost:5417';
const TODAY = new Date(process.env.SEED_TODAY || new Date().toISOString().slice(0, 10));
const START = new Date(TODAY.getFullYear() - 1, TODAY.getMonth() - 3, 1); // ~15 months

// Deterministic PRNG.
let seed = 20251;
const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
};
const between = (a, b) => a + rnd() * (b - a);
const money = (a, b) => -Math.round(between(a, b) * 100) / 100;
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const chance = p => rnd() < p;
const iso = d => {
    const z = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
const ddmm = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const MONTHS_FR = ['JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE'];

// ---------------------------------------------------------------- categories
const CATS = [
    ['Groceries', '#DB9320'],
    ['Housing', '#AD8D43'],
    ['Utilities', '#7F8C8D'],
    ['Internet & phone', '#D1D100'],
    ['Transport', '#2C3E50'],
    ['Restaurants & bars', '#E67E22'],
    ['Health', '#D10069'],
    ['Shopping', '#9B59B6'],
    ['Clothing', '#8E44AD'],
    ['Leisure & sport', '#27AE60'],
    ['Holidays', '#004E00'],
    ['Income', '#428BCA'],
    ['Savings & investments', '#1ABC9C'],
    ['Taxes', '#C0392B'],
    ['Bank fees', '#95A5A6'],
    ['Gifts', '#F39C12'],
    ['Pets', '#A0522D'],
    ['Subscriptions', '#5D6D7E'],
    ['Home & garden', '#16A085'],
    ['Cash', '#BDC3C7'],
    ['Insurance', '#34495E'],
    ['Meal vouchers', '#E74C3C'],
];
const categories = CATS.map(([label, color], i) => ({ id: i + 1, label, color }));
const cat = label => {
    const c = categories.find(x => x.label === label);
    if (!c) throw new Error(`unknown category ${label}`);
    return c.id;
};

// ---------------------------------------------------------------- accesses & accounts
const accesses = [
    { id: 1, vendorId: 'creditmutuel', customLabel: null, fetchStatus: 'OK',
      fields: [{ name: 'login', value: '0471852936' }, { name: 'password', value: 'local-stub-password' }] },
    { id: 2, vendorId: 'boursorama', customLabel: 'Boursorama – joint with Julien', fetchStatus: 'OK',
      fields: [{ name: 'login', value: '28461937' }, { name: 'password', value: 'local-stub-password' }] },
    { id: 3, vendorId: 'swile', customLabel: null, fetchStatus: 'OK',
      fields: [{ name: 'login', value: 'camille.martin@nexopia.fr' }, { name: 'password', value: 'local-stub-password' }] },
    { id: 4, vendorId: 'fortuneo', customLabel: 'Fortuneo (old savings)', fetchStatus: 'INVALID_PASSWORD',
      fields: [{ name: 'login', value: '71520493' }, { name: 'password', value: 'local-stub-password' }] },
];

// woob type ids: see shared/account-types.json
const ACCOUNTS = [
    { id: 1, accessId: 1, vendorAccountId: '10278073910002047130176', label: 'Compte Courant Mme Camille Martin', customLabel: 'Everyday account', type: 'account-type.checking', woobType: 1, iban: 'FR7610278073910002047130176', target: 1846.32 },
    { id: 2, accessId: 1, vendorAccountId: '10278073910002047130245', label: 'Livret Bleu', customLabel: null, type: 'account-type.savings', woobType: 2, iban: null, target: 11482.9 },
    { id: 3, accessId: 1, vendorAccountId: '10278073910002047130387', label: 'Plan Epargne Logement', customLabel: null, type: 'account-type.pel', woobType: 24, iban: null, target: 6835.0 },
    { id: 4, accessId: 1, vendorAccountId: '10278073910002047139902', label: 'Prêt Habitat Modulable', customLabel: 'Mortgage – Rue Paul Bert', type: 'account-type.mortgage', woobType: 17, iban: null, target: -171368.54, excludeFromBalance: true },
    { id: 5, accessId: 2, vendorAccountId: '00040398115', label: 'Compte Joint M. Julien Robert ou Mme Camille Martin', customLabel: 'Joint account', type: 'account-type.joint', woobType: 6, iban: 'FR7640618802980004039811504', target: 2317.85 },
    { id: 6, accessId: 2, vendorAccountId: '00040398187', label: 'PEA Boursorama', customLabel: null, type: 'account-type.pea', woobType: 13, iban: null, target: 8742.16 },
    { id: 7, accessId: 3, vendorAccountId: 'swile-meal-voucher', label: 'Titres-restaurant', customLabel: null, type: 'account-type.unknown', woobType: 0, iban: null, target: 63.4 },
    { id: 8, accessId: 4, vendorAccountId: 'FTN-LIVRET-PLUS-0193', label: 'Livret + Fortuneo', customLabel: null, type: 'account-type.savings', woobType: 2, iban: null, target: 1204.77, stale: true },
];

// ---------------------------------------------------------------- transactions
const transactions = [];
let trId = 1;
const add = (accountId, date, amount, label, rawLabel, type, category, extra = {}) => {
    if (date > TODAY || date < START) return;
    const importDate = addDays(date, Math.floor(between(0, 3)));
    transactions.push({
        id: trId++, accountId, date: iso(date), debitDate: iso(date),
        importDate: iso(importDate > TODAY ? TODAY : importDate),
        amount: Math.round(amount * 100) / 100, label, rawLabel, type,
        categoryId: category === null ? null : cat(category), isUserDefinedType: false,
        ...extra,
    });
};

const LYON_RESTAURANTS = ['LE BOUCHON DES FILLES', 'DAVID TOUTOUNJI', 'LA MERE BRAZIER', 'KHAN SAHEB', 'BIG FERNAND LYON', 'PIZZERIA POUR LES AMIS', 'MAMA SHELTER LYON', 'LE KITCHEN CAFE', 'FOOD TRAVELLERS', 'BRASSERIE GEORGES', 'LE SUPERMARCHE BAR', 'L EPICERIE DE LA RUE', 'BAR LE FLEUR DE LYS', 'HEAT LYON', 'PRIVATE BAR CROIX ROUSSE'];
const GROCERY = [['CARREFOUR CITY LYON 7', 'Carrefour City', 12, 48], ['MONOPRIX LYON GUILLOT', 'Monoprix', 18, 74], ['LIDL LYON GERLAND', 'Lidl', 24, 96], ['BIOCOOP JEAN MACE', 'Biocoop', 15, 62], ['INTERMARCHE VENISSIEUX', 'Intermarché', 60, 165], ['FROMAGERIE RICHARD', 'Fromagerie Richard', 9, 31], ['BOULANGERIE JOCTEUR', 'Boulangerie', 3.2, 11]];
const SHOPS = [['AMAZON PAYMENTS', 'Amazon', 'Shopping', 9, 89], ['FNAC LYON BELLECOUR', 'Fnac', 'Shopping', 14, 129], ['DECATHLON LYON', 'Decathlon', 'Leisure & sport', 12, 95], ['UNIQLO LYON', 'Uniqlo', 'Clothing', 19, 79], ['ZARA LYON REPUBLIQUE', 'Zara', 'Clothing', 25, 110], ['VINTED', 'Vinted', 'Clothing', 6, 34], ['CULTURA', 'Cultura', 'Leisure & sport', 8, 45], ['PHARMACIE DU PROGRES', 'Pharmacie du Progrès', 'Health', 4.5, 28], ['DARTY', 'Darty', 'Shopping', 29, 249]];

const months = [];
for (let d = new Date(START); d <= TODAY; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d);

for (const m of months) {
    const y = m.getFullYear();
    const mo = m.getMonth();
    const day = n => new Date(y, mo, n);
    const monthName = MONTHS_FR[mo];

    // --- Everyday account (Crédit Mutuel)
    const salary = 3184.27 + (mo === 11 ? 2950 : 0) + (chance(0.2) ? Math.round(between(80, 260) * 100) / 100 : 0);
    add(1, day(28), salary, 'Salaire Nexopia', `VIR SEPA RECU /DE NEXOPIA SAS /MOTIF SALAIRE ${monthName} ${y} /REF NX${y}${mo + 1}0417`, 'type.transfer', 'Income');
    add(1, day(1), -950, 'Participation compte joint', 'VIR SEPA EMIS /MOTIF PARTICIPATION COMPTE JOINT /BEN JULIEN ROBERT OU CAMILLE MARTIN', 'type.internal_transfer', 'Housing');
    add(1, day(2), -300, 'Virement Livret Bleu', 'VIR EPARGNE LIVRET BLEU', 'type.internal_transfer', 'Savings & investments');
    add(1, day(5), -45, 'Versement PEL', 'VERSEMENT PERIODIQUE PEL 10278 07391', 'type.internal_transfer', 'Savings & investments');
    add(1, day(8), -150, 'Virement PEA Boursorama', 'VIR SEPA EMIS /MOTIF DCA PEA /BEN CAMILLE MARTIN', 'type.transfer', 'Savings & investments');
    add(1, day(5), -15.99, 'Bouygues Telecom', `PRLV SEPA BOUYGUES TELECOM /RUM BT0218849 /FACT ${String(mo + 1).padStart(2, '0')}${y}`, 'type.order', 'Internet & phone');
    add(1, day(10), -11.12, 'Spotify', `CB SPOTIFY P2F8C1A9E1 ${ddmm(day(10))}`, 'type.card', 'Subscriptions');
    add(1, day(3), -29.95, 'Fitness Park', 'PRLV SEPA FITNESS PARK LYON CONFLUENCE', 'type.order', 'Leisure & sport');
    add(1, day(6), -71.5, 'Abonnement TCL', 'PRLV SEPA KEOLIS LYON TCL /ABONNEMENT MENSUEL', 'type.order', 'Transport');
    add(1, day(12), -38.4, 'Harmonie Mutuelle', 'PRLV SEPA HARMONIE MUTUELLE /COTIS SANTE', 'type.order', 'Insurance');
    add(1, day(4), -11.5, 'Cotisation Eurocompte Confort', 'COTISATION EUROCOMPTE CONFORT', 'type.bankfee', 'Bank fees');
    if (mo % 3 === 0) add(1, day(15), -4.9, 'Frais tenue de compte', 'FRAIS TENUE DE COMPTE TRIMESTRIELS', 'type.bankfee', 'Bank fees');

    // Card spending.
    const nRestaurants = Math.floor(between(4, 9));
    for (let i = 0; i < nRestaurants; i++) {
        const d = day(Math.floor(between(1, 29)));
        const r = pick(LYON_RESTAURANTS);
        add(1, d, money(12, 68), r.replace(/\b\w+/g, w => w[0] + w.slice(1).toLowerCase()), `CB ${r} ${ddmm(d)}`, 'type.card', chance(0.9) ? 'Restaurants & bars' : null);
    }
    const nShops = Math.floor(between(3, 7));
    for (let i = 0; i < nShops; i++) {
        const d = day(Math.floor(between(1, 29)));
        const [raw, label, c, a, b] = pick(SHOPS);
        add(1, d, money(a, b), label, `CB ${raw} ${ddmm(d)}`, 'type.card', chance(0.88) ? c : null);
    }
    for (let i = 0; i < Math.floor(between(1, 4)); i++) {
        const d = day(Math.floor(between(1, 29)));
        const [raw, label, a, b] = pick(GROCERY.slice(0, 2).concat(GROCERY.slice(5)));
        add(1, d, money(a * 0.5, b * 0.6), label, `CB ${raw} ${ddmm(d)}`, 'type.card', 'Groceries');
    }
    if (chance(0.6)) {
        const d = day(Math.floor(between(1, 28)));
        add(1, d, -pick([40, 60, 50, 20]), 'Retrait DAB', `RETRAIT DAB ${ddmm(d)} LYON ${pick(['PART DIEU', 'BELLECOUR', 'JEAN MACE', 'SAXE GAMBETTA'])}`, 'type.withdrawal', 'Cash');
    }
    if (chance(0.45)) {
        const d = day(Math.floor(between(1, 26)));
        add(1, d, -30, 'Dr Lefebvre', `CB DR LEFEBVRE ANNE ${ddmm(d)}`, 'type.card', 'Health');
        add(1, addDays(d, 4), 21, 'Remboursement CPAM', 'VIR SEPA RECU /DE CPAM DU RHONE /MOTIF REMBT SOINS DU ' + ddmm(d), 'type.transfer', 'Health');
        if (chance(0.7)) add(1, addDays(d, 9), 6.3, 'Remboursement mutuelle', 'VIR SEPA RECU /DE HARMONIE MUTUELLE /MOTIF REMB COMPL', 'type.transfer', 'Health');
    }
    if (chance(0.35)) {
        const d = day(Math.floor(between(1, 27)));
        add(1, d, money(29, 118), 'SNCF Connect', `CB SNCF CONNECT ${ddmm(d)}`, 'type.card', 'Transport');
    }
    if (chance(0.3)) {
        const d = day(Math.floor(between(1, 27)));
        add(1, d, money(4.5, 16), 'Uber', `CB UBER *TRIP HELP.UBER.COM ${ddmm(d)}`, 'type.card', 'Transport');
    }
    if (chance(0.25)) {
        const d = day(Math.floor(between(1, 27)));
        add(1, d, money(25, 80), 'Cinéma / concert', `CB ${pick(['PATHE BELLECOUR', 'UGC CINE CITE CONFLUENCE', 'TRANSBORDEUR', 'AUDITORIUM LYON', 'COMOEDIA'])} ${ddmm(d)}`, 'type.card', 'Leisure & sport');
    }

    // --- Joint account (Boursorama)
    add(5, day(1), 950, 'Participation Camille', 'VIR SEPA RECU /DE MME CAMILLE MARTIN /MOTIF PARTICIPATION COMPTE JOINT', 'type.transfer', 'Income');
    add(5, day(2), 950, 'Participation Julien', 'VIR SEPA RECU /DE M JULIEN ROBERT /MOTIF COMPTE JOINT', 'type.transfer', 'Income');
    add(5, day(5), -1148.62, 'Échéance prêt immobilier', `PRLV SEPA CREDIT MUTUEL /ECHEANCE PRET 10278 07391 99 /${String(mo + 1).padStart(2, '0')}-${y}`, 'type.loan_payment', 'Housing');
    add(5, day(7), money(64, 118), 'EDF', `PRLV SEPA EDF CLIENTS PARTICULIERS /FACT ${Math.floor(between(1e9, 9e9))}`, 'type.order', 'Utilities');
    add(5, day(9), -29.99, 'Free Telecom', 'PRLV SEPA FREE TELECOM /FREEBOX POP', 'type.order', 'Internet & phone');
    add(5, day(11), -24.17, 'MAIF Habitation', 'PRLV SEPA MAIF /CONTRAT HABITATION 2457793H', 'type.order', 'Insurance');
    add(5, day(14), -13.49, 'Netflix', `CB NETFLIX.COM ${ddmm(day(14))}`, 'type.card', 'Subscriptions');
    add(5, day(20), -42.0, 'Charges copropriété', 'PRLV SEPA FONCIA LYON /APPEL CHARGES COPRO', 'type.order', 'Housing');
    if (mo % 3 === 1) add(5, day(18), money(58, 96), 'Eau du Grand Lyon', 'PRLV SEPA EAU DU GRAND LYON /FACTURE TRIMESTRIELLE', 'type.order', 'Utilities');
    if (mo === 9) add(5, day(15), -1214, 'Taxe foncière', `PRLV SEPA DGFIP TAXE FONCIERE ${y}`, 'type.order', 'Taxes');
    for (let w = 0; w < 5; w++) {
        const d = day(1 + w * 7 + Math.floor(between(0, 5)));
        if (d.getMonth() !== mo) continue;
        const [raw, label, a, b] = pick(GROCERY);
        add(5, d, money(a, b), label, `CB ${raw} ${ddmm(d)}`, 'type.card', 'Groceries');
        if (chance(0.5)) {
            const d2 = addDays(d, 2);
            const [raw2, label2, a2, b2] = pick(GROCERY);
            add(5, d2, money(a2, b2), label2, `CB ${raw2} ${ddmm(d2)}`, 'type.card', chance(0.85) ? 'Groceries' : null);
        }
    }
    if (chance(0.5)) {
        const d = day(Math.floor(between(1, 28)));
        add(5, d, money(18, 64), pick(['Croquettes Zooplus', 'Clinique vétérinaire']), pick([`CB ZOOPLUS ${ddmm(d)}`, `CB CLINIQUE VETERINAIRE DES BROTTEAUX ${ddmm(d)}`]), 'type.card', 'Pets');
    }
    if (chance(0.4)) {
        const d = day(Math.floor(between(1, 28)));
        add(5, d, money(15, 220), pick(['IKEA', 'Leroy Merlin', 'Castorama', 'Truffaut']), `CB ${pick(['IKEA VENISSIEUX', 'LEROY MERLIN LYON', 'CASTORAMA BRON', 'TRUFFAUT ECULLY'])} ${ddmm(d)}`, 'type.card', 'Home & garden');
    }
    if (chance(0.5)) {
        const d = day(Math.floor(between(1, 28)));
        add(5, d, money(30, 95), 'Restaurant', `CB ${pick(LYON_RESTAURANTS)} ${ddmm(d)}`, 'type.card', 'Restaurants & bars');
    }

    // --- Mortgage: capital part of each instalment.
    add(4, day(5), 742.3 + months.indexOf(m) * 1.9, 'Échéance prêt', `ECHEANCE PRET HABITAT ${String(mo + 1).padStart(2, '0')}/${y} CAPITAL`, 'type.loan_payment', 'Housing');

    // --- Savings
    add(2, day(2), 300, 'Virement depuis compte courant', 'VIR EPARGNE LIVRET BLEU', 'type.internal_transfer', 'Savings & investments');
    add(3, day(5), 45, 'Versement périodique', 'VERSEMENT PERIODIQUE PEL', 'type.deposit', 'Savings & investments');

    // --- PEA
    add(6, day(9), 150, 'Virement reçu', 'VIR SEPA RECU /DE MME CAMILLE MARTIN /MOTIF DCA PEA', 'type.transfer', 'Savings & investments');
    const etfPrice = 5.1 + months.indexOf(m) * 0.06 + between(-0.15, 0.15);
    const qty = Math.floor(148 / etfPrice);
    add(6, day(11), -Math.round(qty * etfPrice * 100) / 100 - 0, `Achat ${qty} AMUNDI MSCI WORLD`, `ACHAT ${qty} AMUNDI PEA MSCI WORLD UCITS ETF FR0013412285 COURS ${etfPrice.toFixed(3)}`, 'type.order', 'Savings & investments');

    // --- Meal vouchers (Swile)
    add(7, day(1), 11 * Math.floor(between(17, 21)), 'Crédit titres-restaurant Nexopia', `CREDIT TITRES-RESTAURANT ${monthName} NEXOPIA SAS`, 'type.deposit', 'Meal vouchers');
    for (let i = 0; i < Math.floor(between(12, 18)); i++) {
        const d = day(Math.floor(between(2, 29)));
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const shop = pick(['Boulangerie Paul Part-Dieu', 'Pokawa Lyon Part-Dieu', 'Franprix Servient', 'Big Fernand', 'Cojean', 'Prêt à Manger Part-Dieu', 'Le Comptoir de Mamie', 'Sushi Shop Lyon 3']);
        add(7, d, money(6.8, 14.9), shop, `PAIEMENT ${shop.toUpperCase()}`, 'type.card', 'Meal vouchers');
    }

    // --- Old Fortuneo savings (stale since the password stopped working).
    if (m < new Date(TODAY.getFullYear(), TODAY.getMonth() - 2, 1)) {
        if (mo % 4 === 1) add(8, day(16), 100, 'Virement reçu', 'VIR SEPA RECU /DE MME CAMILLE MARTIN /MOTIF EPARGNE', 'type.transfer', 'Savings & investments');
        if (mo === 0) add(8, day(1), 14.62, 'Intérêts acquis', `INTERETS ACQUIS ${y - 1}`, 'type.deposit', 'Savings & investments');
    }
}

// One-off events, spread over time.
const oneOffs = [
    // [account, monthsAgo, dayOfMonth, amount, label, raw, type, category, extra]
    [1, 14, 22, -684.0, 'Darty', 'CB DARTY LYON PART DIEU', 'type.card', 'Shopping', { customLabel: 'New washing machine' }],
    [1, 11, 18, -129.0, 'Cadeau anniversaire maman', 'CB GALERIES LAFAYETTE LYON', 'type.card', 'Gifts', {}],
    [1, 11, 24, -64.9, 'Marché de Noël', 'CB MARCHE DE NOEL CARRE DE SOIE', 'type.card', 'Gifts', {}],
    [1, 11, 19, -245.0, 'Cadeaux de Noël', 'CB FNAC LYON BELLECOUR', 'type.card', 'Gifts', { customLabel: 'Christmas presents (Fnac)' }],
    [1, 6, 15, -0.0 - 386.0, 'Impôt sur le revenu', 'PRLV SEPA DGFIP IMPOT SOLDE IR 2025', 'type.order', 'Taxes', {}],
    [1, 4, 3, -412.6, 'TAP Air Portugal', 'CB TAP AIR PORTUGAL LISBOA', 'type.card', 'Holidays', {}],
    [1, 4, 6, -896.0, 'Airbnb', 'CB AIRBNB * HMQ7X2Y4ZB', 'type.card', 'Holidays', { customLabel: 'Airbnb Lisbon – Alfama, 8 nights' }],
    [1, 3, 14, -52.3, 'Pingo Doce Lisboa', 'CB PINGO DOCE LISBOA PT', 'type.card', 'Holidays', {}],
    [1, 3, 15, -78.0, 'Time Out Market', 'CB TIME OUT MARKET LISBOA PT', 'type.card', 'Holidays', {}],
    [1, 3, 17, -36.5, 'Uber Lisboa', 'CB UBER *TRIP LISBOA PT', 'type.card', 'Holidays', {}],
    [1, 8, 9, -120.0, 'Chèque 4410273', 'CHEQUE 4410273', 'type.check', null, {}],
    [1, 2, 12, -120.0, 'Chèque 4410274', 'CHEQUE 4410274', 'type.check', 'Leisure & sport', { customLabel: 'Climbing club membership (cheque)' }],
    [1, 9, 2, 250.0, 'Remboursement Léa', 'VIR SEPA RECU /DE LEA BONNET /MOTIF WEEKEND ANNECY', 'type.transfer', 'Holidays', {}],
    [1, 1, 21, -59.99, 'Amazon Prime', 'CB AMAZON PRIME FR', 'type.card', 'Subscriptions', {}],
    [1, 0, 4, -89.0, 'Fnac', 'CB FNAC LYON BELLECOUR', 'type.card', null, {}],
    [5, 13, 26, -1890.0, 'Canapé', 'CB MAISONS DU MONDE LYON', 'type.card', 'Home & garden', { customLabel: 'Sofa (Maisons du Monde)' }],
    [5, 7, 17, -312.4, 'Plombier', 'VIR SEPA EMIS /BEN SARL PLOMBERIE DU RHONE /FACT 2026-0331', 'type.transfer', 'Home & garden', {}],
    [5, 5, 30, -148.0, 'Vétérinaire – vaccins', 'CB CLINIQUE VETERINAIRE DES BROTTEAUX', 'type.card', 'Pets', {}],
    [5, 3, 1, -640.0, 'Location voiture Lisbonne', 'CB SIXT LISBOA AEROPORTO', 'type.card', 'Holidays', {}],
    [2, 10, 31, 172.46, 'Intérêts', 'INTERETS CREDITEURS 2025', 'type.deposit', 'Savings & investments', {}],
    [2, 6, 20, -1500.0, 'Virement vers compte courant', 'VIR EPARGNE VERS COMPTE COURANT', 'type.internal_transfer', 'Savings & investments', {}],
    [1, 6, 20, 1500.0, 'Virement depuis Livret Bleu', 'VIR EPARGNE DEPUIS LIVRET BLEU', 'type.internal_transfer', 'Savings & investments', {}],
    [6, 8, 2, 38.71, 'Dividende', 'DIVIDENDE TOTALENERGIES SE', 'type.deposit', 'Income', {}],
    [6, 2, 2, 41.2, 'Dividende', 'DIVIDENDE TOTALENERGIES SE', 'type.deposit', 'Income', {}],
];
for (const [acc, ago, dom, amount, label, raw, type, category, extra] of oneOffs) {
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - ago, dom);
    add(acc, d, amount, label, raw, type, category, extra);
}

// A pair of real-looking duplicates (same card payment imported twice).
{
    const d = addDays(TODAY, -9);
    add(5, d, -73.18, 'Intermarché', `CB INTERMARCHE VENISSIEUX ${ddmm(d)}`, 'type.card', 'Groceries');
    add(5, addDays(d, 1), -73.18, 'Intermarché', `CB INTERMARCHE VENISSIEUX ${ddmm(d)}`, 'type.card', null);
}

// ---------------------------------------------------------------- accounts with balances
const accounts = ACCOUNTS.map(a => {
    const sum = transactions.filter(t => t.accountId === a.id).reduce((s, t) => s + t.amount, 0);
    const accTrs = transactions.filter(t => t.accountId === a.id);
    const last = accTrs.map(t => t.date).sort().pop();
    return {
        id: a.id, accessId: a.accessId, vendorAccountId: a.vendorAccountId, label: a.label,
        customLabel: a.customLabel, type: a.type, iban: a.iban, currency: 'EUR',
        initialBalance: Math.round((a.target - sum) * 100) / 100,
        balance: a.target,
        importDate: iso(addDays(START, 2)),
        lastCheckDate: a.stale ? `${last}T08:12:00.000Z` : new Date(TODAY.getTime() + 7.5 * 3600e3).toISOString(),
        excludeFromBalance: !!a.excludeFromBalance,
    };
});

// ---------------------------------------------------------------- views, budgets
const views = [{ id: 101, label: 'Everyday account', createdByUser: false, accounts: [{ accountId: 1 }] }, { id: 100, label: 'Household (everyday + joint)', createdByUser: true, accounts: [{ accountId: 1 }, { accountId: 5 }] }];
const BUDGETS = { Groceries: 520, 'Restaurants & bars': 260, Shopping: 180, Clothing: 90, Transport: 140, 'Leisure & sport': 120, Utilities: 130, Subscriptions: 60, Pets: 60, 'Home & garden': 100, Health: 60, Gifts: null };
const budgets = [];
for (const m of months.slice(-6)) {
    for (const [label, threshold] of Object.entries(BUDGETS)) {
        budgets.push({ viewId: 100, categoryId: cat(label), year: m.getFullYear(), month: m.getMonth(), threshold });
    }
}
// Personal budgets on the everyday account's automatic view (view 101 is matched to it on import).
const PERSONAL = { 'Restaurants & bars': 220, Shopping: 150, Clothing: 80, Transport: 120, 'Leisure & sport': 90, Subscriptions: 45, Health: 50, Cash: 60, Gifts: 100, 'Bank fees': 20 };
for (const m of months.slice(-8)) {
    for (const [label, threshold] of Object.entries(PERSONAL)) {
        budgets.push({ viewId: 101, categoryId: cat(label), year: m.getFullYear(), month: m.getMonth(), threshold });
    }
}

// ---------------------------------------------------------------- rules, alerts, recurring
const rule = (text, category, type = 'label_matches_text') => ({
    conditions: [{ type, value: text }],
    actions: [{ type: 'categorize', categoryId: cat(category) }],
});
const transactionRules = [
    rule('CARREFOUR', 'Groceries'), rule('MONOPRIX', 'Groceries'), rule('BIOCOOP', 'Groceries'),
    rule('LIDL', 'Groceries'), rule('INTERMARCHE', 'Groceries'), rule('SPOTIFY', 'Subscriptions'),
    rule('NETFLIX', 'Subscriptions'), rule('KEOLIS LYON TCL', 'Transport'), rule('SNCF', 'Transport'),
    rule('SALAIRE', 'Income'), rule('EDF', 'Utilities'), rule('DGFIP', 'Taxes'),
    rule('^RETRAIT DAB', 'Cash', 'label_matches_regexp'), rule('ZOOPLUS|VETERINAIRE', 'Pets', 'label_matches_regexp'),
].map((r, i) => ({ ...r, position: i }));
const alerts = [
    { accountId: 1, type: 'balance', order: 'lt', limit: 300 },
    { accountId: 5, type: 'balance', order: 'lt', limit: 500 },
    { accountId: 1, type: 'transaction', order: 'gt', limit: 400 },
    { accountId: 1, type: 'report', frequency: 'weekly' },
    { accountId: 5, type: 'report', frequency: 'monthly' },
];
const recurringTransactions = [
    { id: 1, accountId: 1, type: 'type.transfer', label: 'Salaire Nexopia', amount: 3184.27, dayOfMonth: 28, listOfMonths: 'all' },
    { id: 2, accountId: 1, type: 'type.internal_transfer', label: 'Participation compte joint', amount: -950, dayOfMonth: 1, listOfMonths: 'all' },
    { id: 3, accountId: 1, type: 'type.order', label: 'Bouygues Telecom', amount: -15.99, dayOfMonth: 5, listOfMonths: 'all' },
    { id: 4, accountId: 1, type: 'type.order', label: 'Abonnement TCL', amount: -71.5, dayOfMonth: 6, listOfMonths: 'all' },
    { id: 5, accountId: 5, type: 'type.loan_payment', label: 'Échéance prêt immobilier', amount: -1148.62, dayOfMonth: 5, listOfMonths: 'all' },
    { id: 6, accountId: 5, type: 'type.order', label: 'Eau du Grand Lyon', amount: -78, dayOfMonth: 18, listOfMonths: '2;5;8;11' },
    { id: 7, accountId: 5, type: 'type.order', label: 'Taxe foncière', amount: -1214, dayOfMonth: 15, listOfMonths: '10' },
];

const settings = [
    { key: 'default-account-id', value: '1' },
    { key: 'locale', value: 'en' },
    { key: 'discovery-mode', value: 'false' },
    { key: 'email-recipient', value: 'camille.martin@laposte.net' },
    { key: 'budget-display-percent', value: 'true' },
    { key: 'default-chart-period', value: 'current-year' },
];

const world = { accesses, accounts, categories, transactions, budgets, views, transactionRules, alerts, recurringTransactions, settings };

// ---------------------------------------------------------------- woob stub data
const woobTypeOf = name => require(path.join(__dirname, '..', 'shared', 'transaction-types.json')).find(t => t.name === name).woob_id;
const stub = {};
for (const acc of accesses) {
    const key = `${acc.vendorId}:${acc.fields.find(f => f.name === 'login').value}`;
    if (acc.fetchStatus !== 'OK') {
        stub[key] = { error: acc.fetchStatus, errorMessage: 'Identifiant ou mot de passe incorrect' };
        continue;
    }
    const accs = ACCOUNTS.filter(a => a.accessId === acc.id);
    const recentFrom = iso(addDays(TODAY, -45));
    stub[key] = {
        accounts: accs.map(a => ({ vendorAccountId: a.vendorAccountId, label: a.label, balance: a.target, iban: a.iban, currency: 'EUR', type: a.woobType })),
        transactions: transactions
            .filter(t => accs.some(a => a.id === t.accountId) && t.date >= recentFrom)
            .map(t => ({
                account: ACCOUNTS.find(a => a.id === t.accountId).vendorAccountId,
                amount: t.amount, rawLabel: t.rawLabel, label: t.label, type: woobTypeOf(t.type),
                date: `${t.date}T00:00:00`, debit_date: `${t.debitDate}T00:00:00`,
            })),
    };
}
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'data', 'woob-stub-data.json'), JSON.stringify(stub, null, 1));

(async () => {
    const res = await fetch(`${BASE}/api/all/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: world }),
    });
    console.log('import:', res.status, await res.text());
    console.log(`seeded ${accesses.length} accesses, ${accounts.length} accounts, ${transactions.length} transactions, ${budgets.length} budgets`);
    if (!res.ok) process.exit(1);
})();
