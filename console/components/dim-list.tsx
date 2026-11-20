/**
 * Observed dimension values as aligned key/value lines, so the eye can run
 * down the keys or the values instead of parsing "k: v; k: v" prose.
 */
export function DimList({ dims, max, ties }: { dims: Record<string, string | string[]> | undefined; max?: number; ties?: string[] }) {
  const all = Object.entries(dims ?? {});
  if (!all.length) return null;
  const shown = max ? all.slice(0, max) : all;
  return (
    <span className="dimlist">
      {shown.map(([k, v]) => (
        <span key={k} className="dimlist-row" data-tie={ties?.includes(k) || undefined}>
          <span className="dimlist-k">{k}</span>
          <span className="dimlist-v">{Array.isArray(v) ? v.join(', ') : v}{ties?.includes(k) ? <span className="warn-text"> no majority</span> : null}</span>
        </span>
      ))}
      {all.length > shown.length ? <span className="dimlist-more">+{all.length - shown.length} more</span> : null}
    </span>
  );
}
