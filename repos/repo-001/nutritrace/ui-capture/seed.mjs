// Seeds NutriTrace with ~6 months of realistic use for one account, through
// the app's own REST API (register, foods, meals, diary, activity, fasts,
// settings, AI history). Boots the real server on a side port with a fresh
// database, seeds, then stops it. Dates are relative to the day it runs.
//
//   node .ui-capture/seed.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { FOODS, MEALS, RECIPES, foodNutrition } from './seed-data.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DATA = path.join(HERE, 'data');
const PORT = Number(process.env.SEED_PORT || 5461);
const BASE = `http://127.0.0.1:${PORT}`;

export const LOGIN = { username: 'maya', email: 'maya.okafor@fastmail.com', password: 'Lentil-Harbor-2026!' };
const DAYS_BACK = 175;

// ── deterministic PRNG ──────────────────────────────────────────────────────
let _s = 20261116;
const rnd = () => { _s = (_s * 1664525 + 1013904223) % 4294967296; return _s / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const chance = p => rnd() < p;
const jitter = (v, pct) => Math.round(v * (1 + (rnd() * 2 - 1) * pct) * 10) / 10;

// ── server lifecycle ────────────────────────────────────────────────────────
fs.rmSync(DATA, { recursive: true, force: true });
fs.mkdirSync(path.join(DATA, 'db'), { recursive: true });
fs.mkdirSync(path.join(DATA, 'uploads'), { recursive: true });
const env = {
  ...process.env,
  PORT: String(PORT), NODE_ENV: 'production',
  DB_PATH: path.join(DATA, 'db', 'nutritrace.db'),
  UPLOADS_PATH: path.join(DATA, 'uploads'),
  BACKUPS_PATH: path.join(DATA, 'backups'),
  JWT_SECRET: 'local-ui-capture-jwt-secret-0123456789abcdefghijklmnopqrstuvwxyz',
  TOKEN_ENC_KEY: 'local-ui-capture-token-enc-key-0123456789abcdef',
  INSECURE_COOKIES: '1', UPDATE_CHECK: 'off', LOG_LEVEL: 'warn',
};
for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']) delete env[k];
const srv = spawn(process.execPath, ['index.js'], { cwd: path.join(ROOT, 'server'), env, stdio: ['ignore', 'inherit', 'inherit'] });
const stop = () => { try { srv.kill('SIGTERM'); } catch {} };
process.on('exit', stop);

async function waitUp() {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(BASE + '/api/auth/status'); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error('server did not start');
}

let TOKEN = null;
async function api(method, p, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const r = await fetch(BASE + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

// ── date helpers (local time, like the browser) ─────────────────────────────
const NOW_H = new Date().getHours();
const today = new Date(); today.setHours(12, 0, 0, 0);
const dayOffset = n => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
const ymd = d => d.toLocaleDateString('sv-SE');
const at = (d, h, m) => { const x = new Date(d); x.setHours(h, m, Math.floor(rnd() * 60), 0); return x; };
const fmtTime = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const scale = (nut, f) => Object.fromEntries(Object.entries(nut).map(([k, v]) => [k, Math.round(v * f * 10) / 10]));
const sumN = list => { const o = {}; for (const n of list) for (const [k, v] of Object.entries(n)) o[k] = Math.round(((o[k] || 0) + v) * 10) / 10; return o; };

async function main() {
  await waitUp();

  // Account (first user becomes admin)
  await api('POST', '/api/auth/register', {
    username: LOGIN.username, password: LOGIN.password, email: LOGIN.email,
    full_name: 'Maya Okafor', nickname: 'Maya', birthday: '1990-04-22', gender: 'female',
  });
  const login = await api('POST', '/api/auth/login', { username: LOGIN.username, password: LOGIN.password });
  TOKEN = login.token;

  // Settings: an account that finished the wizard and tuned a few things
  const goals = {
    calories:      { max: 1950, sharedGoal: false, isMin: false, showInDiary: true, showInStats: true, days: [2150, 1900, 1900, 1900, 1900, 1900, 2150] },
    proteins:      { min: 135, sharedGoal: true, isMin: true, showInDiary: true, showInStats: true, days: Array(7).fill(135) },
    carbohydrates: { max: 200, sharedGoal: true, isMin: false, showInDiary: true, showInStats: true, days: Array(7).fill(200) },
    fat:           { max: 70, sharedGoal: true, isMin: false, showInDiary: true, showInStats: true, days: Array(7).fill(70) },
    fiber:         { min: 28, sharedGoal: true, isMin: true, showInDiary: true, showInStats: true, days: Array(7).fill(28) },
    sodium:        { max: 2300, sharedGoal: true, isMin: false, showInDiary: false, showInStats: true, days: Array(7).fill(2300) },
  };
  await api('PUT', '/api/settings/bulk', { settings: {
    setupComplete: true, unitMetadataMigrationV1: true,
    mealNames: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
    goals, calorieGoalMode: 'fixed',
    weightUnit: 'lb', heightUnit: 'ft', lengthUnit: 'in', distUnit: 'mi', tempUnit: 'F',
    waterGoalMl: 2500, waterUnit: 'oz',
    diaryShowActivity: true, fastingEnabled: true, fastingDefaultHours: 16,
    diaryShowTimestamps: true, foodsSort: 'alpha',
    foodCategories: [...new Set(FOODS.map(f => f[2]))].sort(),
    goalTemplates: [
      { id: today.getTime() - 120 * 86400000, name: 'Cut (training days)', createdAt: new Date(today.getTime() - 120 * 86400000).toISOString(), goals, waterGoalMl: 2500, goalCount: 7 },
      { id: today.getTime() - 160 * 86400000, name: 'Maintenance', createdAt: new Date(today.getTime() - 160 * 86400000).toISOString(), goals: { ...goals, calories: { ...goals.calories, sharedGoal: true, max: 2250, days: Array(7).fill(2250) } }, waterGoalMl: 2000, goalCount: 7 },
      { id: today.getTime() - 20 * 86400000, name: 'Race week carb load', createdAt: new Date(today.getTime() - 20 * 86400000).toISOString(), goals: { ...goals, calories: { ...goals.calories, sharedGoal: true, max: 2400, days: Array(7).fill(2400) }, carbohydrates: { ...goals.carbohydrates, max: 320 } }, waterGoalMl: 3000, goalCount: 7 },
    ],
    aiAssistantName: 'Trace',
    // Wellness from the Android app's Health Connect sync
    wellnessEnabled: true, healthConnectEnabled: true, workoutsEnabled: true,
  } });

  // Foods
  const foods = new Map();
  const dayMs = 86400000;
  for (let i = 0; i < FOODS.length; i++) {
    const row = FOODS[i];
    const [name, brand, category, portion, unit, , , , , , , , , barcode, notes] = row;
    const created = new Date(today.getTime() - (DAYS_BACK - Math.floor(i * 1.6)) * dayMs).toISOString();
    const f = await api('POST', '/api/foods', {
      name, brand, category, portion, unit, barcode, notes,
      nutrition: foodNutrition(row), created_at: created,
    });
    foods.set(name, f);
  }
  const F = n => { const f = foods.get(n); if (!f) throw new Error('missing food ' + n); return f; };

  // Snapshot of a food at `qty` servings, as MealEditor stores ingredients
  const ingredient = (name, qty) => {
    const f = F(name);
    return { ...f, portion: Math.round(f.portion * qty * 10) / 10, unit: f.unit, quantity: 1, nutrition: scale(f.nutrition, qty) };
  };

  const meals = new Map();
  for (const [name, notes, parts] of MEALS) {
    const items = parts.map(([n, q]) => ingredient(n, q));
    const m = await api('POST', '/api/meals', {
      name, notes, items, is_recipe: 0, nutrition: sumN(items.map(i => i.nutrition)),
      portion: Math.round(items.reduce((s, i) => s + (i.unit === 'g' || i.unit === 'ml' ? i.portion : 0), 0)), unit: 'g', servings: 1,
    });
    meals.set(name, m);
  }
  const recipes = new Map();
  for (const [name, notes, servings, perPortion, parts] of RECIPES) {
    const items = parts.map(([n, q]) => ingredient(n, q));
    const total = sumN(items.map(i => i.nutrition));
    const r = await api('POST', '/api/meals', {
      name, notes, items, is_recipe: 1, servings,
      nutrition: scale(total, 1 / servings), portion: perPortion, unit: 'g',
    });
    recipes.set(name, r);
  }

  // ── Diary generation ──────────────────────────────────────────────────────
  const foodItem = (name, qty, meal, when) => {
    const f = F(name);
    return { ...f, portion: f.portion, unit: f.unit, quantity: qty, nutrition: f.nutrition,
      uuid: randomUUID(), meal, addedAt: when.toISOString(), food_server_id: f.id };
  };
  const mealItems = (mealName, meal, when) => meals.get(mealName).items.map(it => ({
    ...it, quantity: it.quantity || 1, uuid: randomUUID(), meal, addedAt: when.toISOString(),
    food_server_id: typeof it.id === 'number' ? it.id : null,
  }));
  const recipeItem = (name, qty, meal, when) => {
    const r = recipes.get(name);
    return { ...r, quantity: qty, uuid: randomUUID(), meal, addedAt: when.toISOString(), food_server_id: r.id };
  };
  const quick = (name, kcal, meal, when, macros = {}) => ({
    type: 'quick_calories', name, nutrition: { calories: kcal, ...macros }, uuid: randomUUID(), meal, addedAt: when.toISOString(),
  });

  const usage = { foods: new Map(), meals: new Map() };
  const bump = (kind, id, date) => {
    const m = usage[kind]; const u = m.get(id) || { n: 0, last: '' };
    u.n++; if (date > u.last) u.last = date; m.set(id, u);
  };

  const NOTES = [
    'Slept badly, ~5.5 hrs. Way more snacky than usual in the afternoon.',
    'Long run day. Felt strong through mile 8, legs heavy after.',
    'Period started, craving chocolate. Logged it all anyway.',
    'Team lunch at work, guessed on the portions.',
    'Rest day. Kept protein up.',
    'Dinner at Mom\'s. No idea what was in the stew, logged it as quick calories.',
    'Felt bloated after the pad thai, sodium was probably through the roof.',
    'Meal prepped chili + egg muffins for the week.',
    'Hit protein without the shake for once!',
    'Travel day, airport food. Not great but tracked.',
    'Weigh-in after a salty dinner, ignore the bump.',
    'Back to the routine after the weekend.',
    'Tried the new dal recipe. Would make again with more ginger.',
    'Hungry all day, maybe because of yesterday\'s 10 mile run.',
    'Wedding! Did not track the open bar accurately.',
    'Low energy, skipped the gym. Early night.',
    'Half marathon training week 6: 28 miles total.',
  ];

  // Weight trend: 171.8 lb -> ~163 lb with noise and a holiday plateau
  const weightOn = n => {
    const t = (DAYS_BACK - n) / DAYS_BACK;
    let w = 171.8 - 8.6 * t + Math.sin(n / 5) * 0.6 + (rnd() - 0.5) * 0.9;
    if (n < 95 && n > 85) w += 1.4; // vacation bump
    return Math.round(w * 10) / 10;
  };

  const vacation = n => n >= 86 && n <= 93; // a week away, patchy logging

  // 16:8 fasts on most weeknights over the last ~7 weeks: start after dinner,
  // break at lunch the next day (so that morning has only black coffee).
  const fastPlan = new Map();
  for (let n = 50; n >= 2; n--) {
    const dow = dayOffset(n).getDay();
    if (dow === 5 || dow === 6 || !chance(0.7)) continue;
    const goal = chance(0.15) ? 18 : 16;
    const broke = chance(0.12);
    fastPlan.set(n, { goal, broke, startH: 20, startM: 5 + Math.floor(rnd() * 40), hours: broke ? 12 + rnd() * 2.5 : goal + (rnd() - 0.3) * 1.2 });
  }
  let diaryDays = 0, itemCount = 0;
  const activities = [];

  for (let n = DAYS_BACK; n >= 0; n--) {
    const d = dayOffset(n);
    const date = ymd(d);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;
    const isToday = n === 0;
    if (!isToday && !vacation(n) && chance(n > 120 ? 0.1 : 0.04)) continue; // missed days, more early on
    if (vacation(n) && chance(0.5)) continue;

    const items = [];
    // Breakfast
    const bt = at(d, weekend ? 9 : 7, weekend ? 30 : 10 + Math.floor(rnd() * 30));
    const bRoll = rnd();
    const fp = fastPlan.get(n + 1);
    const fastedMorning = fp && !fp.broke;
    if (fastedMorning) {
      items.push(foodItem('Cold Brew Coffee, black', 1, 0, at(d, 7, 20)));
    } else if (vacation(n)) {
      items.push(foodItem('Oat Milk Latte, Grande', 1, 0, bt));
      items.push(quick('Hotel breakfast buffet', 640, 0, bt, { proteins: 28, carbohydrates: 62, fat: 30 }));
    } else if (weekend && bRoll < 0.45) {
      items.push(recipeItem('Breakfast Egg Muffins', 1, 0, bt));
      items.push(foodItem('Sourdough Bread', 1, 0, bt), foodItem('Butter, Salted', 0.5, 0, bt));
      items.push(foodItem('Oat Milk Latte, Grande', 1, 0, bt));
    } else if (bRoll < 0.45) {
      items.push(...mealItems('Weekday Yogurt Bowl', 0, bt)); bump('meals', meals.get('Weekday Yogurt Bowl').id, date);
      items.push(foodItem('Cold Brew Coffee, black', 1, 0, bt));
    } else if (bRoll < 0.7) {
      items.push(...mealItems('Protein Oats', 0, bt)); bump('meals', meals.get('Protein Oats').id, date);
      items.push(foodItem('Cold Brew Coffee, black', 1, 0, bt));
    } else if (bRoll < 0.85) {
      items.push(...mealItems('Eggs & Toast', 0, bt)); bump('meals', meals.get('Eggs & Toast').id, date);
      items.push(foodItem('Oat Milk Latte, Grande', 1, 0, bt));
    } else {
      items.push(recipeItem('Overnight Oats (meal prep)', 1, 0, bt), foodItem('Frozen Berry Medley', 0.5, 0, bt));
      items.push(foodItem('Cold Brew Coffee, black', 1, 0, bt));
    }

    // Lunch
    const lt = fastedMorning ? at(d, 12, 35 + Math.floor(rnd() * 20)) : at(d, 12, 15 + Math.floor(rnd() * 40));
    const lRoll = rnd();
    if (vacation(n)) {
      items.push(foodItem(pick(['Poke Bowl, Salmon', 'Chicken Burrito Bowl']), 1, 1, lt));
    } else if (!weekend && lRoll < 0.35) {
      items.push(...mealItems('Desk Lunch Salad', 1, lt)); bump('meals', meals.get('Desk Lunch Salad').id, date);
      if (chance(0.4)) items.push(foodItem('Sourdough Bread', 1, 1, lt));
    } else if (!weekend && lRoll < 0.55) {
      items.push(...mealItems('Turkey Wrap', 1, lt)); bump('meals', meals.get('Turkey Wrap').id, date);
      items.push(foodItem('Pink Lady Apple', 1, 1, lt));
    } else if (lRoll < 0.72) {
      items.push(recipeItem(pick(['Turkey Chili', 'Red Lentil Coconut Dal', 'Chicken Stir-Fry']), 1, 1, lt));
      if (chance(0.5)) items.push(foodItem('Jasmine Rice, cooked', 0.75, 1, lt));
    } else if (lRoll < 0.86) {
      items.push(foodItem(pick(['Chicken Burrito Bowl', 'Poke Bowl, Salmon', 'Spicy Tuna Roll']), 1, 1, lt));
      if (chance(0.3)) items.push(foodItem('Kombucha, Ginger', 1, 1, lt));
    } else {
      items.push(foodItem('Cottage Cheese 2%', 1, 1, lt), foodItem('Cherry Tomatoes', 1, 1, lt), foodItem('Dave\'s Killer Bread, 21 Whole Grains', 2, 1, lt), foodItem('Avocado, Hass', 1, 1, lt));
    }

    // Snacks (skip on today — it's still the afternoon of the day)
    const st = at(d, 15, 30 + Math.floor(rnd() * 25));
    if (!isToday) {
      const sRoll = rnd();
      if (sRoll < 0.3) { items.push(...mealItems('Afternoon Snack Plate', 3, st)); bump('meals', meals.get('Afternoon Snack Plate').id, date); }
      else if (sRoll < 0.5) items.push(foodItem(pick(['Protein Bar, Chocolate Chip Cookie Dough', 'RXBAR Chocolate Sea Salt']), 1, 3, st));
      else if (sRoll < 0.65) items.push(foodItem('Hummus, Classic', 2, 3, st), foodItem('Cucumber', 1, 3, st));
      else if (sRoll < 0.78) items.push(foodItem('Trail Mix, Simply Nuts & Fruit', 1, 3, st));
      if (chance(0.35)) items.push(foodItem('Dark Chocolate 85%', pick([0.5, 1, 1]), 3, at(d, 20, 40)));
      if (weekend && chance(0.35)) items.push(foodItem(pick(['Halo Top, Sea Salt Caramel', 'Kettle Brand Sea Salt Chips', 'Air-Popped Popcorn']), pick([1, 1.5, 2]), 3, at(d, 21, 10)));
      if (chance(0.06)) items.push(quick('Office birthday cake', 350, 3, at(d, 14, 30)));
      if (chance(0.25)) items.push(foodItem('Sparkling Water, Lime', 1, 3, at(d, 16, 5)));
    } else {
      items.push(foodItem('String Cheese, Low Moisture Part-Skim', 1, 3, at(d, 15, 40)));
    }

    // Dinner (not yet on today)
    if (!isToday) {
      const dt = at(d, 18 + Math.floor(rnd() * 2), 15 + Math.floor(rnd() * 40));
      const dRoll = rnd();
      if (vacation(n)) {
        items.push(quick(pick(['Tapas dinner', 'Seafood paella (shared)', 'Ramen + gyoza']), pick([880, 950, 1020]), 2, dt));
        items.push(foodItem('Red Wine, Pinot Noir', 2, 2, dt));
      } else if (weekend && dRoll < 0.4) {
        if (chance(0.5)) items.push(foodItem('Margherita Pizza, slice', pick([2, 3]), 2, dt));
        else items.push(foodItem('Pad Thai with Chicken', pick([0.75, 1]), 2, dt));
        items.push(foodItem(pick(['IPA, 12 oz', 'Red Wine, Pinot Noir']), pick([1, 2]), 2, dt));
      } else if (dRoll < 0.55) {
        items.push(...mealItems('Salmon, Rice & Broccoli', 2, dt)); bump('meals', meals.get('Salmon, Rice & Broccoli').id, date);
      } else if (dRoll < 0.85) {
        const r = pick(['Turkey Chili', 'Spaghetti Bolognese', 'Chicken Stir-Fry', 'Tofu Fried Rice', 'Shrimp Tacos', 'Red Lentil Coconut Dal']);
        items.push(recipeItem(r, pick([1, 1, 1.5]), 2, dt));
        if (r === 'Red Lentil Coconut Dal' || r === 'Chicken Stir-Fry') items.push(foodItem('Jasmine Rice, cooked', 1, 2, dt));
        if (chance(0.3)) items.push(foodItem('Spring Mix Salad', 1, 2, dt), foodItem('Extra Virgin Olive Oil', 0.5, 2, dt));
      } else {
        items.push(foodItem('Chicken Breast, boneless skinless (raw)', 1.5, 2, dt), foodItem('Sweet Potato, baked', 1, 2, dt), foodItem('Broccoli Florets', 1, 2, dt), foodItem('Extra Virgin Olive Oil', 0.5, 2, dt));
      }
      if (chance(0.06)) items.push(quick('Dinner at Mom\'s', 900, 2, dt));
    } else {
      items.push(recipeItem('Turkey Chili', 1.5, 2, at(d, 19, 5)), foodItem('Shredded Mexican Cheese', 1, 2, at(d, 19, 5)));
    }

    // Long-run fuel on Saturdays (half-marathon block)
    if (dow === 6 && n < 100 && !vacation(n)) {
      items.push(foodItem('Maurten Gel 100', 2, 3, at(d, 8, 15)), foodItem('Electrolyte Mix, Lemon Lime', 1, 3, at(d, 8, 0)));
      if (chance(0.5)) items.push(...mealItems('Post-Run Shake', 3, at(d, 10, 20)));
    }

    if (isToday) {
      // Only what has plausibly been eaten by now
      const cutoff = new Date(); 
      for (let i = items.length - 1; i >= 0; i--) if (new Date(items[i].addedAt) > cutoff && !(NOW_H < 8 && items[i].meal === 0 && i === 0)) items.splice(i, 1);
    }
    for (const it of items) if (it.food_server_id && !it.is_recipe && it.type !== 'quick_calories') bump('foods', it.food_server_id, date);
    for (const it of items) if (it.is_recipe) bump('meals', it.id, date);

    // Water
    const water = [];
    const glasses = isToday ? Math.max(1, Math.min(4, Math.floor((NOW_H - 7) / 2.5))) : (vacation(n) ? 2 + Math.floor(rnd() * 2) : 4 + Math.floor(rnd() * 4));
    for (let g = 0; g < glasses; g++) {
      water.push({ uuid: randomUUID(), amount: pick([355, 500, 500, 750, 250]), time: fmtTime(at(d, 8 + g * 2, Math.floor(rnd() * 50))) });
    }

    // Body stats: weigh-ins most mornings (more consistent recently)
    const body_stats = {};
    if (!vacation(n) && (isToday || chance(n < 60 ? 0.75 : 0.45))) {
      body_stats.weight = weightOn(n); body_stats.weight_unit = 'lb';
      if (dow === 0) { body_stats.body_fat = Math.round((29.5 - (DAYS_BACK - n) / DAYS_BACK * 3.2 + (rnd() - 0.5)) * 10) / 10; }
      if (dow === 0 && n % 28 < 7) { body_stats.waist = Math.round((31.5 - (DAYS_BACK - n) / DAYS_BACK * 1.8) * 4) / 4; body_stats.hips = Math.round((40.5 - (DAYS_BACK - n) / DAYS_BACK * 1.2) * 4) / 4; body_stats.lengths_unit = 'in'; }
    }

    const body = { items, water, body_stats };
    if (!isToday && chance(0.17)) body.notes = pick(NOTES);
    if (isToday) body.notes = 'Tempo run this morning, 5 mi. Chili for dinner tonight.';
    await api('PUT', `/api/diary/${date}`, body);
    diaryDays++; itemCount += items.length;

    // Manual activity entries
    if (!vacation(n) && !isToday) {
      if ([2, 4].includes(dow) && chance(0.85)) activities.push({ date, name: 'Running', kcal: Math.round(jitter(390, 0.15)), duration_min: Math.round(jitter(42, 0.15)), distance: `${jitter(4.5, 0.15)} mi`, source: 'manual_form', met: 9.8 });
      if (dow === 6 && chance(0.9)) { const mi = n < 100 ? Math.round(Math.min(13.1, 7 + (100 - n) / 16) * 10) / 10 : jitter(6, 0.2); activities.push({ date, name: 'Long Run', kcal: Math.round(mi * 92), duration_min: Math.round(mi * 9.6), distance: `${mi} mi`, source: 'manual_form', met: 9.8 }); }
      if ([1, 3, 5].includes(dow) && chance(0.7)) activities.push({ date, name: pick(['Strength Training (upper)', 'Strength Training (lower)', 'Strength Training (full body)']), kcal: Math.round(jitter(230, 0.2)), duration_min: pick([45, 50, 55, 60]), source: 'manual_form', met: 5 });
      if (dow === 0 && chance(0.4)) activities.push({ date, name: pick(['Yoga (Vinyasa)', 'Hiking', 'Cycling, leisurely']), kcal: Math.round(jitter(260, 0.3)), duration_min: pick([60, 75, 90]), source: 'manual_form', met: 3.5 });
    }
    if (isToday) activities.push({ date, name: 'Tempo Run', kcal: 470, duration_min: 44, distance: '5 mi', source: 'manual_form', met: 10.5 });
  }

  for (const a of activities) await api('POST', '/api/activity', a);
  for (const t of [
    { name: 'Running', kcal: 390, duration_min: 42, distance: '4.5 mi', met: 9.8 },
    { name: 'Strength Training (full body)', kcal: 230, duration_min: 50, met: 5 },
    { name: 'Yoga (Vinyasa)', kcal: 220, duration_min: 60, met: 3.5 },
  ]) await api('POST', '/api/activity', { ...t, date: ymd(dayOffset(DAYS_BACK - 10)), source: 'manual_form', is_template: 1 });

  // Fasts (planned above, alongside the diary)
  let fastCount = 0;
  for (const [n, fp] of [...fastPlan.entries()].sort((a, b) => b[0] - a[0])) {
    const start = at(dayOffset(n), fp.startH, fp.startM);
    const end = new Date(start.getTime() + fp.hours * 3600000);
    const f = await api('POST', '/api/fasts/start', { goal_hours: fp.goal });
    await api('POST', `/api/fasts/${f.id}/end`, {});
    const patch = { start_at: start.toISOString(), end_at: end.toISOString() };
    if (fp.broke) patch.notes = pick(['Broke it early, too hungry before the long run', 'Coffee meeting at 9, ate a pastry', 'Felt lightheaded, stopped', 'Early flight, ate at the airport']);
    else if (chance(0.15)) patch.notes = pick(['Easy one, slept through most of it', 'Black coffee + LMNT got me through', 'Hungry around 11 but fine']);
    await api('PATCH', `/api/fasts/${f.id}`, patch);
    fastCount++;
  }

  // Usage counters behind "Most Used" / "Recently Used"
  for (const [id, u] of usage.foods) for (let i = 0; i < Math.min(u.n, 1); i++) await api('POST', `/api/foods/${id}/used`, { date: u.last });
  for (const [id, u] of usage.meals) await api('POST', `/api/meals/${id}/used`, { date: u.last });

  // Trace chat history (a previous conversation)
  const hist = [
    ['user', 'I want to run a half marathon in March and still lose about 5 more lbs. Is 1900 kcal too low on training days?'],
    ['assistant', "Good question. Looking at your last 28 days, you averaged about 1,940 kcal and dropped roughly 2 lb, so you're in a moderate deficit already. On long-run days (Saturdays) you're burning an extra 900–1,200 kcal, so 1,900 is too low *for those days specifically*.\n\nSuggestion: keep weekdays at 1,900, but raise Saturday and Sunday to ~2,150 (your current per-day goals already do this) and make sure the extra comes mostly from carbs before and after the run. Your protein average (128 g) is a little under your 135 g target, so a post-run shake on Saturdays would close that gap."],
    ['user', 'what should I eat before a 10 mile run'],
    ['assistant', "For a 10-miler, aim for 40–60 g of easily digested carbs 60–90 minutes before you start:\n\n- Your **Protein Oats** without the whey (oats + half banana + honey) ≈ 50 g carbs\n- Or 2 slices of sourdough with honey ≈ 75 g carbs\n\nThen take one Maurten gel around mile 5–6. Keep fat and fiber low beforehand; the chia seeds and peanut butter are better saved for after."],
  ];
  for (const [role, content] of hist) { await api('POST', '/api/ai/history', { role, content }); await new Promise(r => setTimeout(r, 1100)); }

  const wn = seedWellness(activities);
  console.log(`[seed] wellness: ${wn.rows} metric rows, ${wn.workouts} workouts`);
  console.log(`[seed] ${foods.size} foods, ${meals.size} meals, ${recipes.size} recipes, ${diaryDays} diary days (${itemCount} items), ${activities.length} activities, ${fastCount} fasts`);
}

// Health Connect data as the Android app's sync stores it (source
// 'health_connect'), written into the app's wellness tables.
function seedWellness(activities) {
  const require = createRequire(path.join(ROOT, 'server', 'package.json'));
  const Database = require('better-sqlite3');
  const db = new Database(env.DB_PATH);
  const uid = db.prepare(`SELECT id FROM users WHERE username = ?`).get(LOGIN.username).id;
  const ins = db.prepare(`INSERT OR REPLACE INTO wellness_data (user_id, date, source, metric_type, value, metadata, synced_at) VALUES (?, ?, 'health_connect', ?, ?, '{}', ?)`);
  const insW = db.prepare(`INSERT OR REPLACE INTO workouts (user_id, source, source_id, date, activity_type, activity_name, start_time, duration_ms, distance_km, calories, avg_hr, max_hr, steps, has_gps, synced_at, updated_at) VALUES (?, 'health_connect', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`);
  const byDate = new Map();
  for (const a of activities) { const l = byDate.get(a.date) || []; l.push(a); byDate.set(a.date, l); }
  let rows = 0, workouts = 0;
  db.transaction(() => {
    for (let n = 120; n >= 0; n--) {
      const d = dayOffset(n); const date = ymd(d);
      if (n > 0 && chance(0.03)) continue; // phone left at home / didn't sync
      const acts = byDate.get(date) || [];
      const runMi = acts.filter(a => /Run/.test(a.name)).reduce((s, a) => s + parseFloat(a.distance || '0'), 0);
      const isToday = n === 0;
      const frac = isToday ? 0.62 : 1;
      const t = (120 - n) / 120;
      const put = (k, v) => { ins.run(uid, date, k, Math.round(v * 10) / 10, at(d, isToday ? 15 : 23, 50).toISOString()); rows++; };
      const steps = Math.round((6200 + rnd() * 4200 + runMi * 2050) * frac);
      put('steps', steps);
      put('distance_km', steps * 0.00072);
      put('floors', Math.round((4 + rnd() * 9) * frac));
      put('active_minutes', Math.round((28 + rnd() * 30 + runMi * 9) * frac));
      put('calories_out', Math.round((1720 + steps * 0.045 + acts.reduce((s, a) => s + a.kcal * 0.6, 0)) * frac));
      put('active_calories', Math.round((steps * 0.04 + acts.reduce((s, a) => s + a.kcal * 0.8, 0)) * frac));
      // Last night's sleep
      const late = d.getDay() === 6 || d.getDay() === 0;
      const dur = Math.round(400 + (rnd() - 0.5) * 80 + (late ? 25 : 0) - (chance(0.08) ? 90 : 0));
      const deep = Math.round(dur * (0.13 + rnd() * 0.06)), rem = Math.round(dur * (0.2 + rnd() * 0.05));
      const wake = Math.round(18 + rnd() * 30);
      put('sleep_duration_min', dur);
      put('sleep_deep_min', deep); put('sleep_rem_min', rem); put('sleep_wake_min', wake);
      put('sleep_light_min', Math.max(0, dur - deep - rem));
      put('sleep_efficiency', Math.round(100 * dur / (dur + wake)));
      put('resting_hr', Math.round(60 - t * 4 + (rnd() - 0.5) * 3 + (runMi > 8 ? 2 : 0)));
      put('avg_heart_rate', Math.round(72 - t * 3 + (rnd() - 0.5) * 4));
      put('max_hr', Math.round(runMi > 0 ? 168 + rnd() * 18 : 128 + rnd() * 20));
      put('hrv_daily_rmssd', Math.round(42 + t * 9 + (rnd() - 0.5) * 14 - (runMi > 8 ? 7 : 0)));
      put('spo2_avg', 95.5 + rnd() * 2.5);
      put('respiratory_rate', 14.1 + rnd() * 1.4);
      if (n % 7 === 0) put('vo2_max', 42.3 + t * 2.6 + (rnd() - 0.5) * 0.6);
      // Workouts recorded by the watch
      for (const a of acts) {
        if (a.is_template) continue;
        const run = /Run/.test(a.name);
        const startH = run ? (d.getDay() === 6 ? 7 : 6) : (a.name.startsWith('Strength') ? 18 : 10);
        const start = at(d, startH, 10 + Math.floor(rnd() * 30));
        const km = run ? parseFloat(a.distance) * 1.60934 : (a.name.startsWith('Cycling') ? 18 + rnd() * 6 : (a.name === 'Hiking' ? 8 + rnd() * 4 : null));
        const type = run ? 'running' : a.name.startsWith('Strength') ? 'strength_training' : a.name.startsWith('Yoga') ? 'yoga' : a.name === 'Hiking' ? 'hiking' : 'biking';
        insW.run(uid, `hc-${date}-${type}-${workouts}`, date, type, a.name, start.toISOString(), a.duration_min * 60000,
          km == null ? null : Math.round(km * 100) / 100, a.kcal,
          run ? Math.round(148 + rnd() * 14) : Math.round(112 + rnd() * 18), run ? Math.round(170 + rnd() * 14) : Math.round(140 + rnd() * 15),
          run ? Math.round(km * 1250) : (type === 'hiking' ? Math.round(km * 1400) : null), start.toISOString(), start.toISOString());
        workouts++;
      }
    }
  })();
  db.close();
  return { rows, workouts };
}

main().then(() => {
  fs.writeFileSync(path.join(DATA, 'seeded-on.txt'), ymd(today) + '\n');
  stop();
  setTimeout(() => process.exit(0), 500);
}).catch(e => { console.error('[seed] failed:', e); stop(); process.exit(1); });
