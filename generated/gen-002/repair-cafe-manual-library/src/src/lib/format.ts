const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const fmtDate = (iso: string) => {
  const d = parse(iso);
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export const fmtDayDate = (iso: string) => {
  const d = parse(iso);
  return `${DAY[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export const fmtMonthYear = (iso: string) => {
  const d = parse(iso);
  return `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export const years = (a: number, b: number) => (a === b ? String(a) : `${a}–${b}`);

export const plural = (n: number, one: string, many = one + 's') => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

export const firstName = (full: string) => full.split(' ')[0];
