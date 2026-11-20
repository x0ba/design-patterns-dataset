export const fmt = (x: number | null | undefined, d = 2) =>
  x === null || x === undefined || Number.isNaN(x) ? '—' : Number(x).toFixed(d);

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

export const STATE_LABEL: Record<string, string> = {
  queued: 'Queued', capturing: 'Capturing', labeling: 'Labeling', labeled: 'Labeled', flagged: 'Flagged', failed: 'Failed',
};

/** A rater's state, shown with the site-state glyph it corresponds to. */
export const RATER_STATE: Record<string, string> = { pending: 'queued', running: 'labeling', done: 'labeled', failed: 'failed' };

export const dimText = (dims: Record<string, string | string[]> | undefined) =>
  Object.entries(dims ?? {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' + ') : v}`);

export const enc = encodeURIComponent;

export const siteHref = (batch: string, slug: string) => `/site/${enc(batch)}/${enc(slug)}`;
export const codebookHref = (id: string) => `/codebook/${enc(id)}`;

/** Repo link for an app at the commit its views were built from. */
export const repoHref = (app: { url?: string; commit?: string }) => (app.url ? `${app.url}${app.commit ? `/tree/${app.commit}` : ''}` : undefined);

/**
 * Krippendorff's thresholds: α ≥ 0.8 is reliable, 0.667–0.8 supports tentative
 * conclusions, below that is unreliable. Agreement scores use the same cut-offs
 * so every 0–1 reliability reading on the console is banded the same way.
 */
export const BAND_TICKS = [0.667, 0.8];
export type Band = 'high' | 'mid' | 'low';
export const band = (x: number | null | undefined): Band | undefined =>
  x === null || x === undefined || Number.isNaN(x) ? undefined : x >= 0.8 ? 'high' : x >= 0.667 ? 'mid' : 'low';
export const BAND_LABEL: Record<Band, string> = { high: 'Reliable', mid: 'Tentative', low: 'Unreliable' };

export const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');
