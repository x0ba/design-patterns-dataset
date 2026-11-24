import { PEOPLE, CARD_ASSIGNED, LATE_TOTAL, FOH_SHARE } from './data.js';

export const fmt = (cents, { sign = false } = {}) => {
  const abs = Math.abs(cents) / 100;
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (cents < 0) return `−$${s}`;
  return `${sign && cents > 0 ? '+' : ''}$${s}`;
};

export const pct = (n, d = 1) => `${(n * 100).toFixed(d)}%`;

// Split `total` cents by weights so the pieces add up to exactly `total`.
export function distribute(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const base = raw.map(Math.floor);
  const left = total - base.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - base[i], i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < left; k++) base[order[k][1]]++;
  return base;
}

function split(pool, key, shares) {
  const foh = Math.round(pool * FOH_SHARE);
  const boh = pool - foh;
  for (const [group, amount] of [['FOH', foh], ['BOH', boh]]) {
    const people = PEOPLE.filter((p) => p.group === group);
    const out = distribute(amount, people.map((p) => p.points * p[key]));
    people.forEach((p, i) => { shares[p.id] = (shares[p.id] || 0) + out[i]; });
  }
}

/**
 * mode: how Friday's late checks are handled
 *   'none'    – still unassigned (held out of everyone's share)
 *   'week'    – added to the week's pool
 *   'friday'  – shared by Friday dinner crew only (points × Friday hours, 80/20)
 *   'closing' – Kittyline default: to whoever was clocked in at close (Marco is excluded → Tomás)
 */
export function computeShares(mode, cashPooled) {
  const shares = {};
  const mainPool = CARD_ASSIGNED + cashPooled + (mode === 'week' ? LATE_TOTAL : 0);
  split(mainPool, 'hours', shares);
  if (mode === 'friday') split(LATE_TOTAL, 'fri', shares);
  if (mode === 'closing') shares.tomas += LATE_TOTAL;

  const totalPool = CARD_ASSIGNED + LATE_TOTAL + cashPooled;
  const sum = (g) => PEOPLE.filter((p) => p.group === g).reduce((a, p) => a + shares[p.id], 0);
  const foh = sum('FOH');
  const boh = sum('BOH');
  const distributed = foh + boh;
  const allowed = Math.round(totalPool * (1 - FOH_SHARE));
  return {
    shares, foh, boh, distributed, totalPool, allowed,
    unassigned: totalPool - distributed,
    bohPct: boh / totalPool,
    bohOver: Math.max(0, boh - allowed),
  };
}

export const pointHours = (key = 'hours') => ({
  FOH: PEOPLE.filter((p) => p.group === 'FOH').reduce((a, p) => a + p.points * p[key], 0),
  BOH: PEOPLE.filter((p) => p.group === 'BOH').reduce((a, p) => a + p.points * p[key], 0),
});
