const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Formats integer cents as USD. Negative values get a true minus sign. */
export function money(cents: number): string {
  const sign = cents < 0 ? '−' : '';
  return sign + usd.format(Math.abs(cents) / 100);
}

/** Percentage of an integer cent amount, rounded to the nearest cent. */
export function pctOf(cents: number, pct: number): number {
  return Math.round((cents * pct) / 100);
}
