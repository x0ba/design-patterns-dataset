// Site model, reference resolution, diagnostics, and the source-level fixes the
// build report applies. Everything runs in the browser against the mock content.

import { analyzeBody, parseFrontmatter, scanLines, setFrontmatterField } from './markdown.js';

const REF_RE = /\]\(ref:([^)\s]+)\)/g;
const BLOCKQUOTE_CALLOUT_RE = /^>\s*(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\s*:/i;
const CALLOUT_TYPE = { NOTE: 'note', TIP: 'tip', WARNING: 'warning', CAUTION: 'caution', IMPORTANT: 'note' };

/**
 * Builds the site model from { slug: source } plus page order metadata.
 * `pageDefs` is [{ slug, group }] in sidebar order.
 */
export function buildSite(pageDefs, sources) {
  const pages = pageDefs.map((def) => {
    const source = sources[def.slug];
    const { fields, body } = parseFrontmatter(source);
    const { html, anchors } = analyzeBody(body);
    return {
      slug: def.slug,
      group: def.group,
      source,
      title: fields.title || def.slug,
      description: fields.description || '',
      html,
      anchors,
    };
  });
  const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
  return { pages, bySlug };
}

/** Resolves a ref target: "page", "section", or "page#section". */
export function resolveRef(target, site) {
  if (target.includes('#')) {
    const [pageName, anchor] = target.split('#');
    const page = site.bySlug[pageName];
    if (!page) return { ok: false, reason: `No page called "${pageName}".` };
    if (!page.anchors.some((a) => a.id === anchor)) {
      return { ok: false, reason: `"${pageName}" has no section with the id "${anchor}".` };
    }
    return { ok: true, slug: pageName, anchor };
  }
  if (site.bySlug[target]) return { ok: true, slug: target, anchor: null };
  for (const page of site.pages) {
    if (page.anchors.some((a) => a.id === target)) return { ok: true, slug: page.slug, anchor: target };
  }
  return { ok: false, reason: `No page or section is called "${target}".` };
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

const tokens = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function tokenMatch(a, b) {
  if (a === b) return true;
  if (a.length >= 4 && b.startsWith(a)) return true;
  if (b.length >= 4 && a.startsWith(b)) return true;
  return levenshtein(a, b) <= 1;
}

/** Share of the target's words that have a close match in the candidate id. */
function similarity(target, candidate) {
  const want = tokens(target);
  const have = tokens(candidate);
  if (!want.length) return 0;
  const matched = want.filter((w) => have.some((h) => tokenMatch(w, h))).length;
  return matched / want.length;
}

/**
 * Suggests replacement targets for a broken ref. Returns the best-scoring
 * sections (ties included, at most three), each with the ref text to insert.
 */
export function suggestTargets(target, site) {
  const [pageName, anchorName] = target.includes('#') ? target.split('#') : [null, target];
  const scope = pageName && site.bySlug[pageName] ? [site.bySlug[pageName]] : site.pages;
  const candidates = [];
  for (const page of scope) {
    for (const anchor of page.anchors) {
      const score = similarity(anchorName, anchor.id);
      if (score > 0) candidates.push({ score, page, anchor });
    }
  }
  if (!candidates.length) return [];
  candidates.sort((x, y) => y.score - x.score);
  const best = candidates[0].score;
  return candidates
    .filter((c) => c.score >= best && c.score >= 0.5)
    .slice(0, 3)
    .map(({ page, anchor }) => {
      const uniqueAnchor = site.pages.flatMap((p) => p.anchors).filter((a) => a.id === anchor.id).length === 1;
      const ref = !pageName && uniqueAnchor ? anchor.id : `${page.slug}#${anchor.id}`;
      return { ref, label: anchor.text, page: page.title, slug: page.slug };
    });
}

/** Every section on the site, grouped by page, for the "point to a different section" picker. */
export function sectionOptions(site) {
  return site.pages
    .filter((p) => p.anchors.length)
    .map((p) => ({
      page: p.title,
      items: p.anchors.map((a) => ({ ref: `${p.slug}#${a.id}`, label: a.text })),
    }));
}

/**
 * Runs every check across the site. Returns issues ordered errors, warnings, notices.
 * Each issue carries what the build report needs: page, line, text, and a fix hint.
 */
export function diagnose(site) {
  const errors = [];
  const warnings = [];
  const notices = [];

  for (const page of site.pages) {
    if (!page.description) {
      warnings.push({
        id: `${page.slug}:description`,
        kind: 'missing-description',
        severity: 'warning',
        slug: page.slug,
        pageTitle: page.title,
        line: 1,
        text: scanLines(page.source).find((row) => /^title:/.test(row.text))?.text || '---',
      });
    }

    for (const row of scanLines(page.source)) {
      if (row.inCode) continue;

      for (const match of row.text.matchAll(REF_RE)) {
        const target = match[1];
        const result = resolveRef(target, site);
        if (result.ok) continue;
        errors.push({
          id: `${page.slug}:${row.n}:ref:${match.index}`,
          kind: 'broken-ref',
          severity: 'error',
          slug: page.slug,
          pageTitle: page.title,
          line: row.n,
          text: row.text,
          target,
          reason: result.reason,
          suggestions: suggestTargets(target, site),
        });
      }

      const callout = row.text.match(BLOCKQUOTE_CALLOUT_RE);
      if (callout) {
        notices.push({
          id: `${page.slug}:${row.n}:callout`,
          kind: 'blockquote-callout',
          severity: 'notice',
          slug: page.slug,
          pageTitle: page.title,
          line: row.n,
          text: row.text,
          calloutLabel: callout[1].toUpperCase(),
        });
      }
    }
  }

  return [...errors, ...warnings, ...notices];
}

export function countIssues(issues) {
  return {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    notices: issues.filter((i) => i.severity === 'notice').length,
  };
}

/** Points one broken reference at a new target, on the line where it appears. */
export function retargetRef(source, line, oldTarget, newTarget) {
  const lines = source.split('\n');
  const index = line - 1;
  lines[index] = lines[index].replace(`](ref:${oldTarget})`, `](ref:${newTarget})`);
  return lines.join('\n');
}

/** Rewrites a blockquote such as "> NOTE: text" as a ::: callout block. */
export function convertBlockquoteCallout(source, line) {
  const lines = source.split('\n');
  const index = line - 1;
  const match = lines[index].match(/^>\s*(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\s*:\s*(.*)$/i);
  if (!match) return source;
  const type = CALLOUT_TYPE[match[1].toUpperCase()];
  const body = [match[2]];
  let next = index + 1;
  while (next < lines.length && /^>/.test(lines[next])) {
    body.push(lines[next].replace(/^>\s?/, ''));
    next += 1;
  }
  while (body.length && !body[0].trim()) body.shift();
  while (body.length && !body[body.length - 1].trim()) body.pop();
  lines.splice(index, next - index, `:::${type}`, ...body, ':::');
  return lines.join('\n');
}

export { setFrontmatterField };
