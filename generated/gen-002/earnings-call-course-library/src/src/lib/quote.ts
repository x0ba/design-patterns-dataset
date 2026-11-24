/** Collapse whitespace and trim, so a saved quote reads cleanly without changing any words. */
export function normalizeQuote(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
