// Markdown helpers for Quillstack pages.
// Pages are plain Markdown with a small YAML-style frontmatter block and two
// Quillstack extensions: ::: callout blocks and [text](ref:target) cross-references.

import { marked } from 'marked';

const CALLOUT_LABELS = { note: 'Note', tip: 'Tip', warning: 'Warning', caution: 'Caution' };
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

/** Reads `key: value` pairs from the frontmatter block. */
export function parseFrontmatter(source) {
  const match = source.match(FRONTMATTER_RE);
  const fields = {};
  if (match) {
    for (const line of match[1].split('\n')) {
      const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
      if (kv) fields[kv[1]] = unquote(kv[2].trim());
    }
  }
  return { fields, body: match ? source.slice(match[0].length) : source, bodyStart: match ? match[0].length : 0 };
}

/** Sets (or adds) one frontmatter field and returns the new source. */
export function setFrontmatterField(source, key, value) {
  const quoted = JSON.stringify(value);
  const match = source.match(FRONTMATTER_RE);
  if (!match) return `---\n${key}: ${quoted}\n---\n${source}`;
  const lines = match[1].split('\n');
  const index = lines.findIndex((line) => line.startsWith(`${key}:`));
  if (index >= 0) lines[index] = `${key}: ${quoted}`;
  else lines.push(`${key}: ${quoted}`);
  return `---\n${lines.join('\n')}\n---\n${source.slice(match[0].length)}`;
}

/** Splits source into lines, marking which ones sit inside a fenced code block. */
export function scanLines(source) {
  let inFence = false;
  return source.split('\n').map((text, i) => {
    const fence = /^\s*(```|~~~)/.test(text);
    const row = { n: i + 1, text, inCode: inFence || fence };
    if (fence) inFence = !inFence;
    return row;
  });
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Breaks the body into Markdown pieces and ::: callout pieces, ignoring fenced code. */
function splitCallouts(body) {
  const lines = body.split('\n');
  const pieces = [];
  let buffer = [];
  let inFence = false;
  const flush = () => {
    if (buffer.length) pieces.push({ type: 'md', text: buffer.join('\n') });
    buffer = [];
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      buffer.push(line);
      i += 1;
      continue;
    }
    const open = !inFence && line.match(/^:::(note|tip|warning|caution)\s*$/);
    if (open) {
      let j = i + 1;
      const inner = [];
      while (j < lines.length && !/^:::\s*$/.test(lines[j])) {
        inner.push(lines[j]);
        j += 1;
      }
      if (j < lines.length) {
        flush();
        pieces.push({ type: 'callout', kind: open[1], text: inner.join('\n') });
        i = j + 1;
        continue;
      }
    }
    buffer.push(line);
    i += 1;
  }
  flush();
  return pieces;
}

function domFrom(html) {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
}

const STRIP_TAGS = 'script,style,iframe,object,embed,link,meta,base';

function sanitize(root) {
  root.querySelectorAll(STRIP_TAGS).forEach((el) => el.remove());
  root.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || (['href', 'src'].includes(name) && value.startsWith('javascript:'))) {
        el.removeAttribute(attr.name);
      }
    }
  });
}

const cache = new Map();

/**
 * Renders one page body to HTML and collects its section anchors.
 * Headings get ids from their text; duplicates get -2, -3, and so on.
 * Results are cached by source text, so unchanged pages are not re-parsed.
 */
export function analyzeBody(body) {
  if (cache.has(body)) return cache.get(body);
  const html = splitCallouts(body)
    .map((piece) => {
      if (piece.type === 'md') return marked.parse(piece.text, { async: false, gfm: true });
      const label = CALLOUT_LABELS[piece.kind];
      return `<aside class="callout callout-${piece.kind}"><p class="callout-title">${label}</p>${marked.parse(piece.text, { async: false, gfm: true })}</aside>`;
    })
    .join('\n');

  const root = domFrom(html);
  sanitize(root);
  const seen = new Map();
  const anchors = [];
  root.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((heading) => {
    const text = heading.textContent.trim();
    const base = slugify(text) || 'section';
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    const id = count ? `${base}-${count + 1}` : base;
    heading.id = id;
    anchors.push({ id, text, level: Number(heading.tagName[1]) });
  });

  const result = { html: root.innerHTML, anchors };
  if (cache.size > 300) cache.clear();
  cache.set(body, result);
  return result;
}

/**
 * Replaces each ref: link in rendered HTML with a working link or a visible
 * broken-reference marker, using resolve(target) -> { ok, slug, anchor, reason }.
 */
export function linkRefs(html, resolve) {
  const root = domFrom(html);
  root.querySelectorAll('a[href^="ref:"]').forEach((a) => {
    const target = a.getAttribute('href').slice(4);
    const result = resolve(target);
    const el = document.createElement(result.ok ? 'a' : 'span');
    if (result.ok) {
      el.className = 'xref';
      el.setAttribute('href', `#${result.slug}`);
      el.dataset.slug = result.slug;
      if (result.anchor) el.dataset.anchor = result.anchor;
      el.innerHTML = a.innerHTML;
    } else {
      el.className = 'xref-broken';
      el.dataset.target = target;
      el.title = result.reason;
      el.innerHTML = `${a.innerHTML}<span class="xref-flag">broken</span>`;
    }
    a.replaceWith(el);
  });
  return root.innerHTML;
}

/** Renders a standalone Markdown string with no site context (used for help articles). */
export function renderStandalone(source) {
  return analyzeBody(source).html;
}
