// Generates a MyFin backup (same format as GET /user/backup) for an established user:
// ~23 months of history (Jan 2025 -> mid Nov 2026), Lisbon-based, EUR.
// Output: seed-backup.json, loaded through the app's own PUT /user/restore endpoint by seed.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_VERSION = '5.5.2';

// ---------- deterministic RNG ----------
let s = 20261117;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const rf = (a, b) => a + rnd() * (b - a);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
const cents = (eur) => Math.round(eur * 100);

const TODAY = Date.UTC(2026, 10, 17); // 2026-11-17
const ts = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d, 12, 0, 0) / 1000);
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const NOW_S = Math.floor(TODAY / 1000);

// ---------- accounts ----------
const accounts = [];
const acc = (name, type, description, color, opts = {}) => {
  const a = {
    account_id: accounts.length + 1, name, type, description,
    exclude_from_budgets: opts.exclude ?? false, status: opts.status ?? 'Ativa', users_user_id: 1,
    current_balance: 0, created_timestamp: opts.created ?? ts(2025, 1, 2), updated_timestamp: NOW_S,
    color_gradient: color,
  };
  accounts.push(a);
  return a.account_id;
};
const A = {
  main: acc('Millennium – Conta Ordenado', 'CHEAC', 'Main checking account. Salary lands here, most direct debits go out from here.', 'blue-gradient'),
  revolut: acc('Revolut', 'CHEAC', 'Day-to-day card, subscriptions and travel', 'dark-gray-gradient'),
  savings: acc('CGD – Poupança', 'SAVAC', 'Medium-term savings (trips, car, home stuff)', 'purple-gradient'),
  emergency: acc('Emergency Fund – Banco CTT', 'SAVAC', '6 months of expenses. Do not touch!', 'green-gradient'),
  broker: acc('Trade Republic', 'INVAC', 'ETF savings plan + cash interest', 'dusk-gradient'),
  meal: acc('Coverflex Meal Card', 'MEALAC', 'Meal allowance card (subsídio de refeição)', 'orange-gradient'),
  wallet: acc('Wallet', 'WALLET', 'Cash', 'pale-wood-gradient'),
  cc: acc('Cetelem Visa', 'CREAC', 'Credit card – paid in full every month', 'red-gradient', { exclude: true }),
  mortgage: acc('Crédito Habitação – CGD', 'CREAC', 'Mortgage for the Arroios apartment. 30y, Euribor 6M + 0.85%', 'dark-blue-gradient', { exclude: true }),
  home: acc('Apartamento Arroios (valor estimado)', 'OTHAC', 'T2 bought in 2021. Estimated market value, updated once a year from idealista / bank valuation.', 'pale-wood-gradient', { exclude: true }),
  oldbank: acc('Novo Banco (closed)', 'CHEAC', 'Old account, closed in March 2025 after moving salary to Millennium', 'light-gray-gradient', { status: 'Inativa' }),
};

// ---------- categories ----------
const categories = [];
const cat = (name, icon, color, description = null, opts = {}) => {
  categories.push({
    category_id: categories.length + 1, name, type: 'M', users_user_id: 1, description,
    color_gradient: color, icon_key: icon, status: opts.status ?? 'Ativa', exclude_from_budgets: opts.exclude ? 1 : 0,
  });
  return categories.length;
};
const C = {
  salary: cat('Salary', 'salary', 'green-gradient', 'Net monthly salary + holiday/Christmas subsidies'),
  meal: cat('Meal Allowance', 'restaurant', 'light-green-gradient', 'Subsídio de refeição on the Coverflex card'),
  freelance: cat('Freelance', 'freelancing', 'lush-gradient', 'Translation & copywriting gigs (PT/EN)'),
  interest: cat('Interest & Cashback', 'banking', 'decent-gradient', null),
  groceries: cat('Groceries', 'groceries', 'roseanna-gradient', 'Supermarket, market, bakery'),
  eatingOut: cat('Restaurants & Takeaway', 'fast_food', 'orange-gradient', 'Eating out, Uber Eats, Glovo'),
  coffee: cat('Coffee & Snacks', 'coffee', 'brown-gradient', null),
  mortgageInt: cat('Mortgage Interest', 'home', 'dark-blue-gradient', 'Interest part of the monthly mortgage payment'),
  condo: cat('Condo & Home Insurance', 'insurance', 'blue-gradient', 'Condomínio + multirriscos'),
  utilities: cat('Utilities', 'utilities', 'yellow-gradient', 'EDP electricity, EPAL water, Galp gas'),
  telecom: cat('Internet & Phone', 'internet', 'aubergine-gradient', 'MEO fiber + 2 mobile lines'),
  subs: cat('Subscriptions', 'streaming', 'mauve-gradient', 'Netflix, Spotify, iCloud, ChatGPT…'),
  transport: cat('Public Transport & Rides', 'public_transport', 'decent-gradient', 'Navegante pass, Uber/Bolt, CP trains'),
  fuel: cat('Fuel', 'fuel', 'dark-red-gradient', null),
  car: cat('Car Maintenance & Taxes', 'auto_maintenance', 'light-green-gradient', 'Inspections, IUC, Via Verde, repairs'),
  health: cat('Health & Pharmacy', 'health', 'pink-gradient', 'Doctor, dentist, pharmacy'),
  fitness: cat('Gym & Sports', 'fitness', 'green-gradient', null),
  shopping: cat('Shopping & Clothing', 'shopping', 'orange-coral-gradient', null),
  home: cat('Home & Furniture', 'home_repairs', 'pale-wood-gradient', 'IKEA, Leroy Merlin, small repairs'),
  travel: cat('Travel', 'travel', 'dusk-gradient', 'Flights, hotels, holiday spending'),
  gifts: cat('Gifts & Celebrations', 'gifts', 'red-gradient', null),
  pets: cat('Pets', 'pets', 'brown-gradient', 'Mostarda the cat 🐈'),
  education: cat('Books & Courses', 'books', 'dull-gradient', null),
  personal: cat('Personal Care', 'personal_care', 'pink-gradient', 'Haircuts, cosmetics'),
  taxes: cat('Taxes (IRS)', 'taxes', 'dark-gray-gradient', 'IRS settlements and refunds'),
  fees: cat('Bank Fees', 'banking', 'light-gray-gradient', null),
  charity: cat('Charity', 'charity', 'green-gradient', 'Monthly donation to Animais de Rua + one-offs'),
  reimb: cat('Reimbursable', 'cash', 'light-gray-gradient', 'Work expenses / splitting with friends – should net to zero', { exclude: true }),
  language: cat('Language Classes', 'education', 'dull-gradient', 'Japanese course at the Instituto – stopped in 2025', { status: 'Inativa' }),
};

// ---------- entities ----------
const entities = [];
const ENT = {};
const ent = (key, name) => { entities.push({ entity_id: entities.length + 1, name, users_user_id: 1 }); ENT[key] = entities.length; };
[
  ['employer', 'Feedzai'], ['continente', 'Continente'], ['pingo', 'Pingo Doce'], ['lidl', 'Lidl'], ['mercadona', 'Mercadona'],
  ['padaria', 'Padaria Portuguesa'], ['mercado', 'Mercado de Arroios'], ['ubereats', 'Uber Eats'], ['glovo', 'Glovo'],
  ['zeDaMouraria', 'Zé da Mouraria'], ['taberna', 'Taberna da Rua das Flores'], ['sushi', 'Sushi Café Avenida'],
  ['timeout', 'Time Out Market'], ['delta', 'Delta Cafés'], ['starbucks', 'Starbucks'], ['cgd', 'Caixa Geral de Depósitos'],
  ['millennium', 'Millennium bcp'], ['condo', 'Condomínio R. Angelina Vidal 41'], ['fidelidade', 'Fidelidade'],
  ['edp', 'EDP Comercial'], ['epal', 'EPAL'], ['galp', 'Galp'], ['meo', 'MEO'], ['netflix', 'Netflix'], ['spotify', 'Spotify'],
  ['apple', 'Apple'], ['openai', 'OpenAI'], ['navegante', 'Metro de Lisboa'], ['uber', 'Uber'], ['bolt', 'Bolt'], ['cp', 'CP – Comboios de Portugal'],
  ['repsol', 'Repsol'], ['viaverde', 'Via Verde'], ['norauto', 'Norauto'], ['at', 'Autoridade Tributária'], ['cuf', 'Hospital CUF Descobertas'],
  ['wells', 'Farmácia Estácio'], ['dentist', 'Clínica Dentária Sorriso'], ['fitnesshut', 'Fitness Hut'], ['zara', 'Zara'],
  ['primark', 'Primark'], ['decathlon', 'Decathlon'], ['worten', 'Worten'], ['fnac', 'Fnac'], ['amazon', 'Amazon.es'],
  ['ikea', 'IKEA Alfragide'], ['leroy', 'Leroy Merlin'], ['tap', 'TAP Air Portugal'], ['ryanair', 'Ryanair'], ['booking', 'Booking.com'],
  ['airbnb', 'Airbnb'], ['kiwoko', 'Kiwoko'], ['vet', 'Hospital Veterinário do Restelo'], ['bertrand', 'Livraria Bertrand'],
  ['udemy', 'Udemy'], ['barber', 'Barbearia Campos'], ['animais', 'Animais de Rua'], ['clients', 'Lingo Bridge Agency'],
  ['clientB', 'Atelier Norte Studio'], ['traderep', 'Trade Republic'], ['coverflex', 'Coverflex'], ['revolut', 'Revolut'],
  ['ana', 'Ana Ribeiro'], ['ctt', 'Banco CTT'], ['cetelem', 'Cetelem'], ['elcorte', 'El Corte Inglés'],
].forEach(([k, n]) => ent(k, n));

// ---------- transactions ----------
const transactions = [];
const T = (date, amountEur, type, description, { from = null, to = null, c = null, e = null, ess = false } = {}) => {
  if (date * 1000 > TODAY + 12 * 3600 * 1000) return; // nothing in the future
  transactions.push({
    transaction_id: transactions.length + 1, date_timestamp: date, amount: cents(amountEur), type, description,
    entities_entity_id: e ? ENT[e] : null, accounts_account_from_id: from, accounts_account_to_id: to,
    categories_category_id: c, is_essential: ess,
  });
};
const exp = (d, amt, desc, acct, c, e, ess = false) => T(d, amt, 'E', desc, { from: acct, c, e, ess });
const inc = (d, amt, desc, acct, c, e) => T(d, amt, 'I', desc, { to: acct, c, e });
const trf = (d, amt, desc, from, to, c = null, e = null) => T(d, amt, 'T', desc, { from, to, c, e });

// Opening balances (end of Dec 2024)
const D0 = ts(2024, 12, 31);
inc(D0, 3412.57, 'Opening balance', A.oldbank, null, null);
inc(D0, 4180.0, 'Opening balance', A.savings, null, 'cgd');
inc(D0, 9600.0, 'Opening balance', A.emergency, null, 'ctt');
inc(D0, 214.35, 'Opening balance', A.revolut, null, 'revolut');
inc(D0, 85.0, 'Opening balance', A.wallet, null, null);
inc(D0, 2650.0, 'Opening balance', A.broker, null, 'traderep');
inc(D0, 265000.0, 'Opening balance – estimated property value', A.home, null, null);
exp(D0, 182340.0, 'Opening balance – outstanding mortgage principal', A.mortgage, null, 'cgd');

// Moving salary account from Novo Banco to Millennium (Jan–Mar 2025)
trf(ts(2025, 1, 6), 1500.0, 'TRF Novo Banco -> Millennium', A.oldbank, A.main);
trf(ts(2025, 2, 3), 1200.0, 'TRF Novo Banco -> Millennium', A.oldbank, A.main);
exp(ts(2025, 2, 28), 7.28, 'MANUTENCAO CONTA PACOTE', A.oldbank, C.fees, null);
exp(ts(2025, 1, 31), 7.28, 'MANUTENCAO CONTA PACOTE', A.oldbank, C.fees, null);
trf(ts(2025, 3, 10), 3170.16, 'Saldo final – fecho de conta', A.oldbank, A.main);

let principal = 182340.0;
const groceryShops = [
  ['continente', 'COMPRA CONTINENTE BOM DIA ARROIOS', 25, 95],
  ['pingo', 'Pingo Doce Alameda', 12, 70],
  ['lidl', 'LIDL & CIA LISBOA', 18, 65],
  ['mercadona', 'MERCADONA ALCANTARA', 30, 110],
  ['mercado', 'Mercado de Arroios – fruta e legumes', 8, 26],
  ['padaria', 'Padaria Portuguesa', 3.2, 11.5],
];
const restaurants = [
  ['zeDaMouraria', 'Jantar Zé da Mouraria', 28, 62],
  ['taberna', 'Taberna da Rua das Flores', 35, 78],
  ['sushi', 'Sushi Café Avenida', 40, 92],
  ['timeout', 'Time Out Market – almoço', 14, 32],
  ['ubereats', 'UBER *EATS', 14, 29],
  ['glovo', 'Glovo – pizza', 16, 27],
  [null, 'Almoço tasca perto do escritório', 9.5, 14],
];
const shopping = [
  ['zara', 'ZARA COLOMBO', 25, 89], ['primark', 'Primark Chiado', 12, 46], ['decathlon', 'Decathlon Telheiras', 15, 120],
  ['worten', 'WORTEN AMOREIRAS', 19, 159], ['fnac', 'Fnac Chiado', 14, 65], ['amazon', 'AMZN Mktp ES', 9, 74], ['elcorte', 'El Corte Inglés', 30, 140],
];

for (let y = 2025; y <= 2026; y++) {
  for (let m = 1; m <= 12; m++) {
    if (y === 2026 && m > 11) break;
    const dim = daysIn(y, m);
    const D = (d) => ts(y, m, Math.min(d, dim));
    const isRaise = y === 2026;
    const salaryAcct = y === 2025 && m <= 1 ? A.oldbank : A.main;

    // --- income ---
    const net = isRaise ? 2685.4 : 2472.15;
    inc(D(m === 12 ? 20 : 25), net, pick(['Vencimento Feedzai', 'TRF VENCIMENTO FEEDZAI SA', 'Monthly salary']), salaryAcct, C.salary, 'employer');
    if (m === 6) inc(D(25), isRaise ? 2210.0 : 2050.3, 'Subsídio de férias', A.main, C.salary, 'employer');
    if (m === 11 && y === 2025) inc(D(25), 2050.3, 'Subsídio de Natal', A.main, C.salary, 'employer');
    if (m === 3 && y === 2026) inc(D(25), 1350.0, 'Annual performance bonus 2025 🎉', A.main, C.salary, 'employer');
    const workDays = ri(19, 22);
    inc(D(1), +(workDays * 10.2).toFixed(2), `Subsídio refeição ${String(m).padStart(2, '0')}/${y}`, A.meal, C.meal, 'coverflex');
    if (chance(0.45)) {
      const client = pick(['clients', 'clients', 'clientB']);
      inc(D(ri(5, 28)), +rf(280, 940).toFixed(2), client === 'clients' ? `Lingo Bridge – translation invoice FT ${y}/${ri(10, 99)}` : 'Atelier Norte – website copy (EN)', A.revolut, C.freelance, client);
    }
    inc(D(dim), +rf(4.1, 9.8).toFixed(2), 'Juros conta poupança', A.savings, C.interest, 'cgd');
    inc(D(dim), +rf(14, 22).toFixed(2), 'Interest payment', A.broker, C.interest, 'traderep');
    if (chance(0.3)) inc(D(ri(2, 27)), +rf(1.2, 6.5).toFixed(2), 'Cashback', A.revolut, C.interest, 'revolut');

    // --- housing ---
    const rate = 0.0315 - (y - 2025) * 0.004 - m * 0.0002;
    const interest = +(principal * rate / 12).toFixed(2);
    const installment = 812.46;
    const princ = +(installment - interest).toFixed(2);
    principal -= princ;
    trf(D(5), princ, 'Prestação crédito habitação – capital', A.main, A.mortgage, null, 'cgd');
    exp(D(5), interest, 'Prestação crédito habitação – juros', A.main, C.mortgageInt, 'cgd', true);
    exp(D(8), 62.5, 'Condomínio – quota mensal', A.main, C.condo, 'condo', true);
    if (m === 4) exp(D(12), 318.4, 'Seguro multirriscos habitação (anual)', A.main, C.condo, 'fidelidade', true);
    if (m === 9 && y === 2025) exp(D(14), 410.0, 'Quota extra condomínio – obras fachada', A.main, C.condo, 'condo', true);

    // --- utilities & telecom ---
    const winter = [1, 2, 3, 12, 11].includes(m);
    exp(D(ri(9, 13)), +(winter ? rf(68, 104) : rf(38, 61)).toFixed(2), 'DD EDP COMERCIAL', A.main, C.utilities, 'edp', true);
    exp(D(ri(14, 18)), +rf(17.5, 27.9).toFixed(2), 'EPAL – água', A.main, C.utilities, 'epal', true);
    if (m % 2 === 0) exp(D(ri(19, 22)), +(winter ? rf(42, 66) : rf(18, 31)).toFixed(2), 'Galp Gás Natural', A.main, C.utilities, 'galp', true);
    exp(D(20), y === 2026 ? 52.99 : 49.99, 'MEO Fibra + Móvel', A.main, C.telecom, 'meo', true);

    // --- subscriptions (Revolut) ---
    exp(D(2), y === 2026 && m >= 3 ? 15.99 : 13.99, 'NETFLIX.COM', A.revolut, C.subs, 'netflix');
    exp(D(7), 13.99, 'Spotify Duo', A.revolut, C.subs, 'spotify');
    exp(D(11), 2.99, 'APPLE.COM/BILL iCloud 200GB', A.revolut, C.subs, 'apple');
    if (y === 2026 || m >= 6) exp(D(16), 23.0, 'OPENAI *CHATGPT SUBSCR', A.revolut, C.subs, 'openai');

    // --- transport ---
    exp(D(1), 40.0, 'Passe Navegante Metropolitano', A.main, C.transport, 'navegante', true);
    for (let i = 0; i < ri(0, 3); i++) {
      const u = pick(['uber', 'bolt']);
      exp(D(ri(1, dim)), +rf(5.4, 17.8).toFixed(2), u === 'uber' ? 'UBER *TRIP' : 'Bolt.eu ride', A.revolut, C.transport, u);
    }
    for (let i = 0; i < ri(1, 2); i++) {
      const g = pick(['galp', 'repsol']);
      exp(D(ri(3, dim)), +rf(42, 71).toFixed(2), g === 'galp' ? 'GALP ENERGIA – combustível' : 'REPSOL E.S. SACAVEM', A.cc, C.fuel, g, true);
    }
    exp(D(ri(4, 9)), +rf(9, 28).toFixed(2), 'Via Verde – portagens', A.main, C.car, 'viaverde');

    // --- groceries ---
    for (let i = 0; i < ri(7, 10); i++) {
      const [e, desc, lo, hi] = pick(groceryShops);
      const acct = chance(0.35) ? A.meal : chance(0.5) ? A.main : A.cc;
      exp(D(ri(1, dim)), +rf(lo, hi).toFixed(2), desc, acct, C.groceries, e, true);
    }

    // --- eating out & coffee ---
    for (let i = 0; i < ri(4, 8); i++) {
      const [e, desc, lo, hi] = pick(restaurants);
      exp(D(ri(1, dim)), +rf(lo, hi).toFixed(2), desc, chance(0.45) ? A.meal : A.revolut, C.eatingOut, e);
    }
    for (let i = 0; i < ri(2, 5); i++) {
      const sb = chance(0.25);
      exp(D(ri(1, dim)), +(sb ? rf(4.5, 7.9) : rf(1.6, 4.8)).toFixed(2), sb ? 'Starbucks Saldanha' : pick(['Café + pastel de nata', 'Delta – café', 'Pastelaria Versailles']), chance(0.3) ? A.wallet : A.revolut, C.coffee, sb ? 'starbucks' : 'delta');
    }

    // --- health, gym, personal ---
    exp(D(3), 34.9, 'Fitness Hut – mensalidade', A.main, C.fitness, 'fitnesshut');
    if (chance(0.5)) exp(D(ri(1, dim)), +rf(6.3, 38.6).toFixed(2), 'Farmácia Estácio', A.main, C.health, 'wells', true);
    if ([2, 9].includes(m)) exp(D(ri(10, 20)), 55.0, 'Consulta higiene oral', A.main, C.health, 'dentist', true);
    if (y === 2025 && m === 5) exp(D(19), 85.0, 'Consulta dermatologia CUF', A.main, C.health, 'cuf', true);
    if (y === 2026 && m === 10) exp(D(7), 140.0, 'Ressonância joelho – CUF (comparticipação seguro)', A.main, C.health, 'cuf', true);
    if (m % 2 === 1) exp(D(ri(10, 25)), 16.0, 'Barbearia Campos', A.wallet, C.personal, 'barber');

    // --- pets ---
    exp(D(ri(5, 25)), +rf(24, 41).toFixed(2), 'Kiwoko – ração e areia Mostarda', A.main, C.pets, 'kiwoko');
    if ((y === 2025 && m === 6) || (y === 2026 && m === 6)) exp(D(18), 68.5, 'Vacina anual + check-up Mostarda', A.main, C.pets, 'vet');

    // --- shopping / home / education ---
    for (let i = 0; i < ri(0, 3); i++) {
      const [e, desc, lo, hi] = pick(shopping);
      exp(D(ri(1, dim)), +rf(lo, hi).toFixed(2), desc, chance(0.6) ? A.cc : A.revolut, C.shopping, e);
    }
    if (chance(0.3)) exp(D(ri(1, dim)), +rf(12, 85).toFixed(2), pick(['Leroy Merlin – material', 'IKEA – arrumação', 'Lâmpadas + extensões']), A.cc, C.home, pick(['leroy', 'ikea']));
    if (chance(0.35)) exp(D(ri(1, dim)), +rf(9.9, 32).toFixed(2), pick(['Livraria Bertrand', 'Bertrand Chiado – livros']), A.revolut, C.education, 'bertrand');
    if (y === 2025 && m <= 6) exp(D(4), 95.0, 'Curso de japonês – mensalidade', A.main, C.language, null);

    // --- charity ---
    exp(D(15), 10.0, 'Donativo mensal Animais de Rua', A.main, C.charity, 'animais');

    // --- cash ---
    if (chance(0.6)) exp(D(ri(1, dim)), +rf(4, 22).toFixed(2), pick(['Feira da Ladra', 'Mercado – peixe', 'Gelados Santini', 'Quiosque – imperial']), A.wallet, pick([C.groceries, C.coffee, C.eatingOut]), null);

    // --- reimbursables (net to zero-ish) ---
    if (chance(0.25)) {
      const amt = +rf(40, 160).toFixed(2);
      const d = ri(2, Math.min(24, dim - 3));
      exp(D(d), amt, 'Jantar de equipa – adiantado por mim', A.revolut, C.reimb, null);
      inc(D(d + ri(1, 3)), amt, 'Reembolso despesas – jantar equipa', A.main, C.reimb, 'employer');
    }

    // --- savings & investing ---
    trf(D(26), y === 2026 ? 400 : 300, 'Poupança mensal', A.main, A.savings);
    trf(D(27), 150, 'Plano poupança ETF', A.main, A.broker, null, 'traderep');
    if (m === 7 && y === 2025) trf(D(27), 1000, 'Reforço fundo de emergência', A.main, A.emergency, null, 'ctt');
    if (m === 2 && y === 2026) trf(D(27), 800, 'Reforço fundo de emergência', A.main, A.emergency, null, 'ctt');

    // --- credit card payoff (previous month) ---
  }
}

// --- one-off / seasonal events ---
// Taxes & car
exp(ts(2025, 5, 14), 152.36, 'IUC 2025 – Renault Clio', A.main, C.car, 'at', true);
exp(ts(2026, 5, 12), 152.36, 'IUC 2026 – Renault Clio', A.main, C.car, 'at', true);
exp(ts(2025, 10, 3), 34.45, 'Inspeção periódica obrigatória', A.main, C.car, 'norauto', true);
exp(ts(2025, 10, 9), 287.9, 'Norauto – pastilhas travão + mudança óleo', A.cc, C.car, 'norauto', true);
exp(ts(2026, 8, 22), 189.0, 'Pneus dianteiros Michelin', A.cc, C.car, 'norauto', true);
exp(ts(2025, 3, 21), 412.0, 'Seguro automóvel – anual', A.main, C.car, 'fidelidade', true);
exp(ts(2026, 3, 20), 428.5, 'Seguro automóvel – anual', A.main, C.car, 'fidelidade', true);
inc(ts(2025, 7, 18), 612.43, 'Reembolso IRS 2024', A.main, C.taxes, 'at');
exp(ts(2026, 8, 29), 238.17, 'IRS 2025 – nota de cobrança (freelance)', A.main, C.taxes, 'at');
// Travel
exp(ts(2025, 4, 2), 238.4, 'TAP – voos Lisboa ↔ Ponta Delgada (2 pax)', A.revolut, C.travel, 'tap');
exp(ts(2025, 4, 3), 486.0, 'Airbnb São Miguel – 5 noites', A.revolut, C.travel, 'airbnb');
for (let d = 18; d <= 22; d++) exp(ts(2025, 4, d), +rf(22, 74).toFixed(2), pick(['Restaurante em Furnas', 'Rent-a-car combustível', 'Termas Poça da Dona Beija', 'Jantar Ponta Delgada']), A.revolut, C.travel, null);
exp(ts(2025, 8, 4), 312.6, 'Ryanair – LIS-NAP', A.revolut, C.travel, 'ryanair');
exp(ts(2025, 8, 5), 742.0, 'Booking.com – Hotel Sorrento 4 noites', A.cc, C.travel, 'booking');
for (let d = 11; d <= 18; d++) exp(ts(2025, 8, d), +rf(28, 96).toFixed(2), pick(['Pizzeria Da Michele', 'Ferry Capri', 'Trattoria – jantar', 'Museo Archeologico', 'Gelato + café']), A.revolut, C.travel, null);
exp(ts(2025, 12, 19), 96.4, 'CP Alfa Pendular Lisboa–Porto (ida/volta)', A.main, C.transport, 'cp');
exp(ts(2026, 3, 12), 186.0, 'Booking.com – Porto fim de semana', A.revolut, C.travel, 'booking');
exp(ts(2026, 7, 2), 528.8, 'TAP – voos Lisboa ↔ Copenhaga', A.revolut, C.travel, 'tap');
exp(ts(2026, 7, 3), 890.0, 'Airbnb Copenhaga – 6 noites', A.cc, C.travel, 'airbnb');
for (let d = 14; d <= 20; d++) exp(ts(2026, 7, d), +rf(25, 110).toFixed(2), pick(['Tivoli Gardens', 'Smørrebrød lunch', 'Metro 72h pass', 'Dinner Nørrebro', 'Bike rental']), A.revolut, C.travel, null);
exp(ts(2026, 10, 28), 642.0, 'Flights LIS–NRT (deposit, Japan 2027) ✈️', A.savings, C.travel, 'tap');
// Gifts
for (const y of [2025]) {
  exp(ts(y, 12, 6), 89.9, 'Presentes Natal – Fnac', A.cc, C.gifts, 'fnac');
  exp(ts(y, 12, 13), 146.3, 'Presentes Natal – El Corte Inglés', A.cc, C.gifts, 'elcorte');
  exp(ts(y, 12, 20), 54.0, 'Bolo-rei + jantar consoada (contribuição)', A.main, C.gifts, null);
}
exp(ts(2025, 6, 7), 150.0, 'Prenda casamento Rita & João', A.main, C.gifts, null);
exp(ts(2026, 2, 11), 62.0, 'Aniversário Ana – jantar surpresa', A.revolut, C.gifts, 'ana');
exp(ts(2026, 9, 20), 75.0, 'Prenda aniversário mãe', A.cc, C.gifts, 'amazon');
exp(ts(2025, 12, 2), 50.0, 'Donativo Banco Alimentar', A.main, C.charity, null);
// Home
exp(ts(2025, 2, 15), 649.0, 'IKEA – sofá KIVIK', A.cc, C.home, 'ikea');
exp(ts(2025, 11, 8), 389.99, 'Worten – máquina lavar loiça Bosch', A.main, C.home, 'worten');
exp(ts(2026, 4, 18), 214.6, 'Leroy Merlin – pintura sala', A.cc, C.home, 'leroy');
exp(ts(2026, 11, 3), 1249.0, 'MacBook Air M4 (trabalho freelance)', A.savings, C.shopping, 'apple');
exp(ts(2025, 9, 15), 189.99, 'Udemy + Coursera – cursos UX writing', A.revolut, C.education, 'udemy');
// Splitting with Ana (messy: some unmatched)
exp(ts(2026, 5, 9), 84.0, 'Concerto Primavera Sound – 2 bilhetes', A.revolut, C.reimb, null);
inc(ts(2026, 5, 10), 42.0, 'MBWAY Ana Ribeiro – bilhete', A.revolut, C.reimb, 'ana');
exp(ts(2026, 10, 24), 38.4, 'Supermercado jantar amigos', A.revolut, C.groceries, 'pingo', true);
// A few uncategorized / messy recent imports
exp(ts(2026, 11, 12), 23.5, 'COMPRA 4829 PAYPAL *STEAM', A.revolut, null, null);
exp(ts(2026, 11, 14), 7.9, 'COMPRA 4829 TABACARIA', A.wallet, null, null);
exp(ts(2026, 11, 15), 61.2, 'MB WAY – 912xxx345', A.main, null, null);
exp(ts(2026, 11, 16), 12.4, 'SumUp *Mercado Campo de Ourique', A.revolut, C.groceries, null, true);

transactions.sort((a, b) => a.date_timestamp - b.date_timestamp);

// Settlement pass: derive Revolut top-ups, credit card payoffs and cash withdrawals from running balances
{
  const bal = {};
  const flow = (t) => {
    if (t.accounts_account_from_id) bal[t.accounts_account_from_id] = (bal[t.accounts_account_from_id] ?? 0) - t.amount;
    if (t.accounts_account_to_id) bal[t.accounts_account_to_id] = (bal[t.accounts_account_to_id] ?? 0) + t.amount;
  };
  const extra = [];
  const ccByMonth = {};
  let cursor = 0;
  const sorted = [...transactions];
  for (let y = 2025; y <= 2026; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= daysIn(y, m); d++) {
    const day = ts(y, m, d);
    if (day * 1000 > TODAY) break;
    while (cursor < sorted.length && sorted[cursor].date_timestamp <= day) {
      const t = sorted[cursor++];
      if (t.accounts_account_from_id === A.meal && (bal[A.meal] ?? 0) - t.amount < 0) t.accounts_account_from_id = A.revolut;
      flow(t);
      if (t.accounts_account_from_id === A.cc && t.type === "E") { const k = (new Date(t.date_timestamp * 1000)).getUTCFullYear() * 12 + (new Date(t.date_timestamp * 1000)).getUTCMonth(); ccByMonth[k] = (ccByMonth[k] ?? 0) + t.amount; }
    }
    const add = (amt, desc, from, to, e) => { const t = { transaction_id: 0, date_timestamp: day, amount: amt, type: "T", description: desc, entities_entity_id: e ? ENT[e] : null, accounts_account_from_id: from, accounts_account_to_id: to, categories_category_id: null, is_essential: false }; extra.push(t); flow(t); };
    if ((bal[A.revolut] ?? 0) < 8000) add(pick([15000, 20000, 25000, 30000]), pick(["Top-up Revolut", "Revolut top-up via Apple Pay", "TRF p/ Revolut"]), A.main, A.revolut, "revolut");
    if ((bal[A.wallet] ?? 0) < 1500) add(pick([4000, 5000, 6000]), pick(["Levantamento MB", "LEV. MULTIBANCO ARROIOS"]), A.main, A.wallet, null);
    if (d === 10) { const k = y * 12 + (m - 1) - 1; if (ccByMonth[k]) add(ccByMonth[k], "PAGAMENTO CARTAO CETELEM", A.main, A.cc, "cetelem"); }
  }
  transactions.push(...extra);
  transactions.sort((a, b) => a.date_timestamp - b.date_timestamp);
  transactions.forEach((t, i) => (t.transaction_id = i + 1));
}

// ---------- budgets ----------
const budgets = [];
const budgets_has_categories = [];
const budget_category_items = [];
const observationsByMonth = {
  '2025-1': '🏦 Salary moved to Millennium • close Novo Banco',
  '2025-2': '🛋️ New sofa (IKEA)',
  '2025-3': '🚗 Car insurance renewal',
  '2025-4': '🏝️ Azores trip – São Miguel',
  '2025-5': '🚘 IUC',
  '2025-6': '💍 Rita & João wedding • holiday subsidy',
  '2025-7': '💰 IRS refund → emergency fund',
  '2025-8': '🇮🇹 Naples / Sorrento',
  '2025-9': '🏢 Condo extra fee (facade works)',
  '2025-10': '🔧 Car inspection + brakes',
  '2025-11': '🍽️ Dishwasher',
  '2025-12': '🎄 Christmas gifts • Porto by train',
  '2026-1': 'Back to basics – no eating out challenge 😅',
  '2026-2': '🎂 Ana’s birthday',
  '2026-3': '🎉 Bonus • Porto weekend',
  '2026-4': '🎨 Painting the living room',
  '2026-5': '🎵 Primavera Sound • IUC',
  '2026-6': '🐈 Mostarda vet check-up',
  '2026-7': '🇩🇰 Copenhagen',
  '2026-8': '🛞 New tyres • IRS payment',
  '2026-9': '🎁 Mum’s birthday',
  '2026-10': '✈️ Japan flights deposit',
  '2026-11': '💻 New laptop from savings • start Christmas shopping early',
  '2026-12': '🎄 Christmas + New Year in Madeira?',
  '2027-1': '',
};
const plannedDebit = {
  [C.groceries]: 360, [C.eatingOut]: 170, [C.coffee]: 30, [C.mortgageInt]: 470, [C.condo]: 65, [C.utilities]: 120,
  [C.telecom]: 50, [C.subs]: 55, [C.transport]: 65, [C.fuel]: 100, [C.car]: 25, [C.health]: 35, [C.fitness]: 35,
  [C.shopping]: 90, [C.home]: 40, [C.travel]: 60, [C.gifts]: 25, [C.pets]: 35, [C.education]: 20, [C.personal]: 10,
  [C.charity]: 10, [C.fees]: 0,
};
const plannedCredit = { [C.salary]: 2470, [C.meal]: 205, [C.freelance]: 250, [C.interest]: 25 };
let bid = 0;
const months = [];
for (let y = 2025; y <= 2027; y++) for (let m = 1; m <= 12; m++) if (y < 2027 || m === 1) months.push([y, m]);
for (const [y, m] of months) {
  bid++;
  budgets.push({
    budget_id: bid, month: m, year: y, observations: observationsByMonth[`${y}-${m}`] ?? '',
    is_open: y > 2026 || (y === 2026 && m >= 11), initial_balance: null, users_user_id: 1,
  });
  const adj = (c, v) => {
    let x = v;
    if (c === C.travel && [4, 8].includes(m) && y === 2025) x = 1100;
    if (c === C.travel && m === 7 && y === 2026) x = 1700;
    if (c === C.travel && m === 10 && y === 2026) x = 650;
    if (c === C.travel && m === 12 && y === 2026) x = 900;
    if (c === C.gifts && m === 12) x = 320;
    if (c === C.home && ((y === 2025 && [2, 11].includes(m)) || (y === 2026 && m === 4))) x = 650;
    if (c === C.car && [3, 5, 10].includes(m)) x = 450;
    if (c === C.condo && m === 4) x = 390;
    if (c === C.eatingOut && y === 2026 && m === 1) x = 60;
    if (c === C.shopping && y === 2026 && m === 11) x = 1300;
    if (c === C.utilities && [1, 2, 12].includes(m)) x = 160;
    if (y === 2026 && c === C.groceries) x = 380;
    return cents(x);
  };
  for (const c of Object.keys(plannedDebit).map(Number)) {
    budgets_has_categories.push({ budgets_budget_id: bid, budgets_users_user_id: 1, categories_category_id: c, planned_amount_credit: 0, current_amount: 0, planned_amount_debit: adj(c, plannedDebit[c]) });
  }
  for (const c of Object.keys(plannedCredit).map(Number)) {
    let v = plannedCredit[c];
    if (c === C.salary && y === 2026) v = 2685;
    if (c === C.salary && m === 6) v += 2050;
    if (c === C.salary && m === 11 && y === 2025) v += 2050;
    if (c === C.salary && m === 12 && y === 2026) v += 2200;
    budgets_has_categories.push({ budgets_budget_id: bid, budgets_users_user_id: 1, categories_category_id: c, planned_amount_credit: cents(v), current_amount: 0, planned_amount_debit: 0 });
  }
  if (y === 2025 && m <= 6) budgets_has_categories.push({ budgets_budget_id: bid, budgets_users_user_id: 1, categories_category_id: C.language, planned_amount_credit: 0, current_amount: 0, planned_amount_debit: cents(95) });
  if (y === 2026 && m === 8) budgets_has_categories.push({ budgets_budget_id: bid, budgets_users_user_id: 1, categories_category_id: C.taxes, planned_amount_credit: 0, current_amount: 0, planned_amount_debit: cents(240) });
  if (y === 2025 && m === 7) budgets_has_categories.push({ budgets_budget_id: bid, budgets_users_user_id: 1, categories_category_id: C.taxes, planned_amount_credit: cents(600), current_amount: 0, planned_amount_debit: 0 });
  // Breakdown items for the open months
  if ((y === 2026 && m >= 11) || y === 2027) {
    const items = (c, dir, list) => list.forEach(([label, eur], i) => budget_category_items.push({
      budgets_budget_id: bid, budgets_users_user_id: 1, categories_category_id: c, direction: dir, label, amount: String(cents(eur)), sort_order: i,
    }));
    const row = (c) => budgets_has_categories.find((r) => r.budgets_budget_id === bid && r.categories_category_id === c);
    const setDebit = (c, eur) => { row(c).planned_amount_debit = cents(eur); };
    if (y === 2026 && m === 11) {
      setDebit(C.shopping, 1300); items(C.shopping, 'EXPENSE', [['MacBook Air M4 (from savings)', 1249], ['Winter jacket', 51]]);
      setDebit(C.gifts, 120); items(C.gifts, 'EXPENSE', [['Early Christmas gifts', 90], ['Secret Santa – office', 30]]);
    }
    if (y === 2026 && m === 12) {
      setDebit(C.gifts, 320); items(C.gifts, 'EXPENSE', [['Family gifts', 180], ['Ana', 90], ['Secret Santa – friends', 25], ['Consoada contribution', 25]]);
      setDebit(C.travel, 900); items(C.travel, 'EXPENSE', [['Flights LIS–FNC', 260], ['Hotel Funchal 3 nights', 480], ['Fireworks dinner', 160]]);
    }
    setDebit(C.groceries, 380); items(C.groceries, 'EXPENSE', [['Weekly supermarket', 300], ['Market & bakery', 50], ['Household / cleaning', 30]]);
  }
}

// ---------- investments ----------
const invest_assets = [];
const invest_transactions = [];
const invest_asset_evo_snapshot = [];
const asset = (name, ticker, type, broker) => { invest_assets.push({ asset_id: invest_assets.length + 1, name, ticker, units: '0', type, broker, created_at: ts(2024, 6, 1), updated_at: NOW_S, users_user_id: 1 }); return invest_assets.length; };
const assetDefs = [
  { id: asset('Vanguard FTSE All-World UCITS ETF (Acc)', 'VWCE', 'etf', 'Trade Republic'), p0: 118.2, drift: 0.009, vol: 0.035, monthly: 120, start: 0, units0: 22 },
  { id: asset('iShares Core MSCI EM IMI (Acc)', 'EIMI', 'etf', 'Trade Republic'), p0: 31.4, drift: 0.005, vol: 0.045, monthly: 30, start: 0, units0: 40 },
  { id: asset('Bitcoin', 'BTC', 'crypto', 'Coinbase'), p0: 89500, drift: 0.02, vol: 0.12, monthly: 0, start: 0, units0: 0.021 },
  { id: asset('PPR Save & Grow – Optimize', 'OPT-PPR', 'ppr', 'Optimize Investment Partners'), p0: 15.8, drift: 0.004, vol: 0.02, monthly: 0, start: 0, units0: 380, yearlyTopUp: 1500 },
  { id: asset('Certificados de Aforro Série F', 'CA-F', 'fixed', 'IGCP / CTT'), p0: 1.0, drift: 0.0021, vol: 0, monthly: 0, start: 0, units0: 5000 },
  { id: asset('Raize – P2P loans', 'RAIZE', 'p2p', 'Raize'), p0: 1.0, drift: 0.004, vol: 0.002, monthly: 0, start: 0, units0: 1200, sellAt: [2025, 9] },
];
const ITRX = (asset_id, date, type, units, total, note, fees = 0) => invest_transactions.push({
  transaction_id: invest_transactions.length + 1, date_timestamp: date, type, note, total_price: cents(total), units: String(units),
  fees_taxes_amount: cents(fees), fees_taxes_units: '0', invest_assets_asset_id: asset_id, created_at: date, updated_at: date,
});
for (const a of assetDefs) {
  a.ticker = invest_assets.find((x) => x.asset_id === a.id).ticker;
  let price = a.p0;
  let units = a.units0;
  let invested = +(a.units0 * a.p0).toFixed(2);
  let withdrawn = 0;
  ITRX(a.id, ts(2024, 12, 15), 'B', a.units0, invested, 'Position carried over from 2024');
  // Dec 2024 snapshot
  invest_asset_evo_snapshot.push({ month: 12, year: 2024, units: String(units), invested_amount: cents(invested), current_value: cents(units * price), invest_assets_asset_id: a.id, created_at: NOW_S, updated_at: NOW_S, withdrawn_amount: 0, income_amount: 0, cost_amount: 0 });
  for (const [y, m] of months) {
    if (y === 2027 || (y === 2026 && m > 11)) break;
    price = price * (1 + a.drift + (rnd() - 0.5) * 2 * a.vol);
    if (a.ticker === 'BTC' && y === 2025 && m === 4) price *= 0.82; // dip
    let income = 0;
    if (a.monthly) {
      const u = +(a.monthly / price).toFixed(4);
      units = +(units + u).toFixed(4);
      invested = +(invested + a.monthly).toFixed(2);
      ITRX(a.id, ts(y, m, 2), 'B', u, a.monthly, 'Plano poupança mensal', 0);
    }
    if (a.ticker === 'BTC' && [[2025, 2], [2025, 4], [2025, 11], [2026, 6]].some(([yy, mm]) => yy === y && mm === m)) {
      const amt = pick([100, 150, 250]);
      const u = +(amt / price).toFixed(6);
      units = +(units + u).toFixed(6);
      invested += amt;
      ITRX(a.id, ts(y, m, ri(3, 25)), 'B', u, amt, pick(['DCA', 'Buying the dip', 'Monthly DCA – manual']), 1.49);
    }
    if (a.yearlyTopUp && m === 12) {
      const u = +(a.yearlyTopUp / price).toFixed(4);
      units = +(units + u).toFixed(4); invested += a.yearlyTopUp;
      ITRX(a.id, ts(y, 12, 18), 'B', u, a.yearlyTopUp, 'Reforço PPR – dedução IRS');
    }
    if (a.ticker === 'CA-F' && m % 3 === 0) {
      income = +(units * price * 0.0063).toFixed(2);
      ITRX(a.id, ts(y, m, 28), 'I', 0, income, 'Juros trimestrais');
    }
    if (a.ticker === 'RAIZE' && y === 2025 && m <= 9) {
      income = +(units * 0.0045).toFixed(2);
      ITRX(a.id, ts(y, m, 20), 'I', 0, income, 'Juros recebidos');
    }
    if (a.sellAt && a.sellAt[0] === y && a.sellAt[1] === m) {
      const total = +(units * price).toFixed(2);
      ITRX(a.id, ts(y, m, 24), 'S', units, total, 'Platform wind-down – withdrew everything', 0);
      withdrawn += total; units = 0;
    }
    if (a.ticker === 'VWCE' && y === 2026 && m === 9) ITRX(a.id, ts(y, m, 30), 'C', 0, 1.0, 'Custody / FX fee');
    invest_asset_evo_snapshot.push({
      month: m, year: y, units: String(units), invested_amount: cents(invested), current_value: cents(units * price),
      invest_assets_asset_id: a.id, created_at: NOW_S, updated_at: NOW_S, withdrawn_amount: cents(withdrawn),
      income_amount: cents(income), cost_amount: 0,
    });
  }
  invest_assets.find((x) => x.asset_id === a.id).units = String(units);
}

// ---------- rules ----------
const rules = [];
const rule = (descOp, descVal, { amountOp = 'IG', amount = null, typeOp = 'IG', type = '', cat = null, ent = null, ess = false } = {}) => rules.push({
  rule_id: rules.length + 1, matcher_description_operator: descOp, matcher_description_value: descVal,
  matcher_amount_operator: amountOp, matcher_amount_value: amount, matcher_type_operator: typeOp, matcher_type_value: type,
  matcher_account_to_id_operator: 'IG', matcher_account_to_id_value: null, matcher_account_from_id_operator: 'IG', matcher_account_from_id_value: null,
  assign_category_id: cat, assign_entity_id: ent, assign_account_to_id: null, assign_account_from_id: null, assign_type: '', users_user_id: 1, assign_is_essential: ess,
});
rule('CONTAINS', 'VENCIMENTO', { typeOp: 'EQ', type: 'I', cat: C.salary, ent: ENT.employer });
rule('CONTAINS', 'CONTINENTE', { cat: C.groceries, ent: ENT.continente, ess: true });
rule('CONTAINS', 'PINGO DOCE', { cat: C.groceries, ent: ENT.pingo, ess: true });
rule('CONTAINS', 'LIDL', { cat: C.groceries, ent: ENT.lidl, ess: true });
rule('CONTAINS', 'MERCADONA', { cat: C.groceries, ent: ENT.mercadona, ess: true });
rule('CONTAINS', 'EDP COMERCIAL', { cat: C.utilities, ent: ENT.edp, ess: true });
rule('CONTAINS', 'NETFLIX', { cat: C.subs, ent: ENT.netflix });
rule('CONTAINS', 'UBER *EATS', { cat: C.eatingOut, ent: ENT.ubereats });
rule('CONTAINS', 'UBER *TRIP', { cat: C.transport, ent: ENT.uber });
rule('EQ', 'Passe Navegante Metropolitano', { amountOp: 'EQ', amount: 4000, cat: C.transport, ent: ENT.navegante, ess: true });
rule('CONTAINS', 'MEO', { typeOp: 'EQ', type: 'E', cat: C.telecom, ent: ENT.meo, ess: true });
rule('CONTAINS', 'GALP ENERGIA', { cat: C.fuel, ent: ENT.galp, ess: true });

// ---------- goals ----------
const goals = [
  { goal_id: 1, name: 'Emergency fund (6 months)', description: '6× average monthly expenses. Lives in Banco CTT and nowhere else.', priority: 1, amount: cents(12000), due_date: null, is_archived: false, created_at: Date.UTC(2025, 0, 4), updated_at: Date.UTC(2026, 1, 27), users_user_id: 1 },
  { goal_id: 2, name: 'Japan trip – spring 2027 🌸', description: 'Two weeks Tokyo → Kyoto → Osaka with Ana. Flights deposit already paid in October.', priority: 2, amount: cents(4500), due_date: ts(2027, 3, 20), is_archived: false, created_at: Date.UTC(2025, 9, 2), updated_at: Date.UTC(2026, 9, 28), users_user_id: 1 },
  { goal_id: 3, name: 'Car replacement fund', description: 'The Clio is from 2014. Aim for a used EV around 2028.', priority: 3, amount: cents(9000), due_date: ts(2028, 6, 30), is_archived: false, created_at: Date.UTC(2025, 5, 10), updated_at: Date.UTC(2026, 5, 10), users_user_id: 1 },
  { goal_id: 4, name: 'Pay off mortgage early (extra €10k)', description: 'Partial amortisation once Euribor drops – check penalty (0.5%).', priority: 4, amount: cents(10000), due_date: ts(2029, 12, 31), is_archived: false, created_at: Date.UTC(2026, 0, 15), updated_at: Date.UTC(2026, 0, 15), users_user_id: 1 },
  { goal_id: 5, name: 'New sofa', description: 'Bought the KIVIK in Feb 2025 🛋️', priority: 5, amount: cents(650), due_date: ts(2025, 2, 28), is_archived: true, created_at: Date.UTC(2024, 10, 3), updated_at: Date.UTC(2025, 1, 16), users_user_id: 1 },
];
const goal_has_accounts = [
  { goals_goal_id: 1, accounts_account_id: A.emergency, match_type: 'relative', match_value: '100' },
  { goals_goal_id: 2, accounts_account_id: A.savings, match_type: 'absolute', match_value: '2600' },
  { goals_goal_id: 3, accounts_account_id: A.savings, match_type: 'relative', match_value: '40' },
  { goals_goal_id: 4, accounts_account_id: A.broker, match_type: 'relative', match_value: '25' },
  { goals_goal_id: 5, accounts_account_id: A.savings, match_type: 'absolute', match_value: '650' },
];

const tags = [
  { tag_id: 1, name: 'vacation', description: 'Anything spent while travelling', users_user_id: 1 },
  { tag_id: 2, name: 'tax-deductible', description: 'Keep invoice with NIF for IRS (e-fatura)', users_user_id: 1 },
  { tag_id: 3, name: 'shared-with-ana', description: 'Split 50/50 – settle at the end of the month', users_user_id: 1 },
  { tag_id: 4, name: 'work', description: 'Freelance or employer-related', users_user_id: 1 },
  { tag_id: 5, name: 'one-off', description: null, users_user_id: 1 },
];

const backup = {
  apiVersion: API_VERSION, accounts, balances_snapshot: [], budgets, budgets_has_categories, budget_category_items,
  categories, entities, tags, invest_asset_evo_snapshot, invest_assets, invest_desired_allocations: [], invest_transactions,
  rules, goals, goal_has_accounts, transactions,
};
fs.writeFileSync(path.join(HERE, 'seed-backup.json'), JSON.stringify(backup));
console.log(`accounts=${accounts.length} categories=${categories.length} entities=${entities.length} transactions=${transactions.length} budgets=${budgets.length} assets=${invest_assets.length} invest_trx=${invest_transactions.length} snapshots=${invest_asset_evo_snapshot.length} goals=${goals.length} rules=${rules.length}`);
