// Small, exact string helpers for slicing the atlas HTML. We deliberately avoid
// a DOM round-trip here: a parser would re-serialize and change bytes we want to
// keep verbatim in the template.

/** Index range [innerStart, innerEnd) of the element whose opening tag starts at `openIdx`. */
export function innerRange(html: string, openIdx: number): [number, number] {
  const m = /^<([a-zA-Z][\w-]*)/.exec(html.slice(openIdx, openIdx + 64));
  if (!m) throw new Error(`no tag at ${openIdx}`);
  const tag = m[1].toLowerCase();
  const innerStart = html.indexOf('>', openIdx) + 1;
  const re = new RegExp(`<(/?)${tag}(?=[\\s>/])`, 'gi');
  re.lastIndex = innerStart;
  let depth = 1;
  for (let x = re.exec(html); x; x = re.exec(html)) {
    depth += x[1] ? -1 : 1;
    if (depth === 0) return [innerStart, x.index];
  }
  throw new Error(`unclosed <${tag}> at ${openIdx}`);
}

/** Find the opening tag that contains `needle` (e.g. `id="map-host"`) and return its inner range. */
export function innerRangeOf(html: string, needle: string, from = 0): [number, number] {
  const at = html.indexOf(needle, from);
  if (at < 0) throw new Error(`not found: ${needle}`);
  const open = html.lastIndexOf('<', at);
  return innerRange(html, open);
}

export function innerOf(html: string, needle: string): string {
  const [a, b] = innerRangeOf(html, needle);
  return html.slice(a, b);
}

/** Collapse insignificant whitespace so two renderings can be compared structurally. */
export function normalizeMarkup(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\s+</g, '<')
    .replace(/>\s+/g, '>')
    .trim();
}

/** Remove <marble-alt> wrappers, keeping only the active alternative's content. */
export function resolveMarbleAlts(html: string): string {
  let out = html;
  for (;;) {
    const i = out.indexOf('<marble-alt');
    if (i < 0) return out;
    const [a, b] = innerRange(out, i);
    const tagOpen = out.slice(i, a);
    const active = /data-marble-active="([^"]*)"/.exec(tagOpen)?.[1];
    const inner = out.slice(a, b);
    // children are <div data-marble-alt="..."> blocks; keep the active one
    let keep = inner;
    const re = /<div\b[^>]*data-marble-alt="([^"]*)"/g;
    for (let m = re.exec(inner); m; m = re.exec(inner)) {
      if (m[1] === active) {
        const [ca, cb] = innerRange(inner, m.index);
        // re-open as a plain element without the alt bookkeeping attributes
        const open = inner.slice(m.index, ca)
          .replace(/\sdata-marble-(by|alt)="[^"]*"/g, '')
          .replace(/data-marble-id="[^"]*"/, `data-marble-id="${/data-marble-id="([^"]*)"/.exec(tagOpen)?.[1]}"`);
        keep = open + inner.slice(ca, cb) + '</div>';
        break;
      }
    }
    out = out.slice(0, i) + keep + out.slice(b + '</marble-alt>'.length);
  }
}
