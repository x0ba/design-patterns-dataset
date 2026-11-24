export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmtSigned = (n: number) => {
  const r = Math.round(n);
  return r > 0 ? `+${fmt(r)}` : r < 0 ? `−${fmt(-r)}` : '0';
};
export const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`;
export const pctSigned = (n: number, d = 0) => {
  const v = n * 100;
  const s = Math.abs(v).toFixed(d);
  return v > 0.05 ? `+${s}%` : v < -0.05 ? `−${s}%` : '0%';
};
export const rate = (n: number, d = 1) => (Math.abs(n) < 0.05 ? '0.0' : n < 0 ? `−${Math.abs(n).toFixed(d)}` : n.toFixed(d));
export const rateSigned = (n: number, d = 1) => (Math.abs(n) < 0.05 ? '0.0' : n < 0 ? `−${Math.abs(n).toFixed(d)}` : `+${n.toFixed(d)}`);
export const times = (n: number) => `${n.toFixed(n >= 10 ? 0 : 1)}×`;

export const COLORS = {
  deliberate: '#C4562A',
  deliberateSoft: '#F4DCCF',
  payment: '#3E5BA9',
  paymentSoft: '#D9E0F2',
  program: '#A7ABB2',
  programSoft: '#E7E8EA',
  ink: '#1E252D',
  muted: '#6B7079',
  grid: '#ECEAE5',
  waves: ['#E3A35B', '#C4562A', '#7C2D12'],
};
export const GROUP_COLORS = [COLORS.deliberate, COLORS.payment, COLORS.program];
export const GROUP_SOFT = [COLORS.deliberateSoft, COLORS.paymentSoft, COLORS.programSoft];
