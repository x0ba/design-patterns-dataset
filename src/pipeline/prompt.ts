// Rater instructions. The system prompt is identical for every site and rater
// in a batch (so it caches, and so raters are interchangeable); everything
// site-specific goes in the first user message.

import type { CodebookBundle } from '../codebook/bundle.ts';
import { labelSchema, LOW_CONFIDENCE } from './label.ts';
import type { CaptureMeta, IndexedElement } from './capture.ts';

/** The label schema minus harness-owned fields, with $refs inlined (tool input schema). */
export function modelLabelSchema(): any {
  const s = structuredClone(labelSchema());
  const defs = s.$defs;
  const inline = (x: any): any => {
    if (Array.isArray(x)) return x.map(inline);
    if (x && typeof x === 'object') {
      if (x.$ref) {
        const { $ref, ...rest } = x;
        return { ...inline(defs[$ref.replace('#/$defs/', '')]), ...rest };
      }
      return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, inline(v)]));
    }
    return x;
  };
  const props = s.properties;
  const site = props.site;
  const out = {
    type: 'object',
    additionalProperties: false,
    required: ['site', 'regions', 'patterns', 'structure', 'aesthetics', 'notes'],
    properties: {
      site: {
        type: 'object', additionalProperties: false, required: ['domain'],
        properties: { domain: site.properties.domain, domainNote: site.properties.domainNote },
      },
      regions: props.regions,
      patterns: props.patterns,
      structure: {
        type: 'object', additionalProperties: false, required: ['layout', 'density'],
        properties: { layout: props.structure.properties.layout, density: props.structure.properties.density },
      },
      aesthetics: props.aesthetics,
      notes: props.notes,
    },
  };
  return inline(out);
}

export function systemPrompt(codebook: CodebookBundle): string {
  const index = codebook.entries
    .filter((e) => !e.deprecated)
    .map((e) => `${e.id} | ${e.level}${e.parent ? `/${e.parent}` : ''} | ${e.name}: ${truncate(e.definition, 110)}`)
    .join('\n');
  return `You are one of three independent raters building a research dataset of web UI design patterns. You code one captured website against a fixed codebook of UI design patterns. Two other raters code the same capture without seeing your work; their agreement with you is measured with Krippendorff's alpha, so code what the evidence shows, consistently, not what a typical site would have.

# The artifact
The site was captured once, before any rater started: a full-page screenshot (1440px wide, CSS pixels = screenshot pixels), the ARIA accessibility tree, and an index of DOM elements with exact bounding boxes and computed styles. Every bounding box you write is in full-screenshot pixels with the origin at the top-left of the page. You may also open a live copy of the page to check behavior a still image cannot show, but the label describes the capture.

# How to work
1. Scan the whole screenshot top to bottom with view_screenshot (about 1200-1600px per view) before deciding anything. Read the accessibility tree for structure, menus, tabs, and hidden-but-present controls.
2. Divide the page into its major regions, top to bottom (header, hero, feature grid, pricing table, stats strip, footer, ...). Get exact boxes from find_elements where possible.
3. For each region, identify which codebook patterns appear. Search the codebook (search_codebook) and read every candidate in full (get_patterns) before you use it. Use the most specific entry that fits; components (card, tabs, carousel, badge, ...) inside patterns should be coded too.
4. For each pattern, set dims: for every sub-dimension you can observe, the value id(s) that match what this page does. Skip sub-dimensions you cannot observe; do not guess. If you code several instances of one pattern (e.g. many cards), code the dominant instance and note exceptions in evidence notes.
5. Check uncertain behavior on the live page when it changes a code (does that tab strip switch content? does the carousel advance?).
6. Draw your boxes over the screenshot (view_screenshot with boxes) to confirm they are right, run validate_label, fix every error, then submit_label.

# Codes
- status: "present" = clearly on the page. "uncertain" = some evidence but it could be a different pattern or could not be verified. "absent" = you checked a plausible candidate and it is not there (list absent only for patterns you seriously considered; everything you do not list is treated as absent).
- confidence (0-1) is your confidence that the status is right. Calibrate: 0.9+ unmistakable, 0.7-0.9 clear but some judgment, 0.5-0.7 genuinely unsure. Below ${LOW_CONFIDENCE} you must give a rationale saying what could not be verified.
- evidence: every present/uncertain pattern needs at least one item with a bbox around an instance; add a verbatim quote when there is text, and the region id. Several instances may each get an evidence item (up to about 5).
- dims: keys are sub-dimension ids from get_patterns; values are value ids (a list for multi-select sub-dimensions). Only codebook values. If the page shows a variation no value describes, add it to that pattern's "novel" list and file it with propose_codebook_change (kind "new-values"). If the page shows a UI pattern the codebook has no entry for, file a proposal (kind "new-entry") and mention it in notes — do not invent ids in the label.
- regions[].patterns lists the codebook ids present (or uncertain) inside that region.

# Structure and aesthetics
- density: sparse (few elements, lots of air, one idea per screen) | medium | dense (many controls/items per screen, data-heavy).
- whitespace: tight | moderate | generous. shape (corners): soft (rounded) | sharp | mixed. elevation: flat | subtle-shadows | elevated (cards clearly lifted). borders: none | thin (minimal outlines) | heavy. iconStyle: line | filled | duotone | mixed | none. backgroundTreatment: solid | gradient (soft gradients) | texture (subtle texture/noise/pattern) | image.
- palette: the hex colors that actually carry the design (backgrounds, text, brand, accents), usually 4-10; take exact values from find_elements styles and the capture's style summary rather than estimating. colorRoles maps roles (background, surface, text, muted, primary, accent, border, ...) to palette colors.
- typography: name the typefaces (from computed styles) and where each is used. typeScale: size/weight contrast and hierarchy, with px sizes.
- imagery and mood: short, concrete tags.
- domain: what the product/site is for (pick the closest; add domainNote to refine).
- notes: anything distinctive the fields above cannot express — the details that would help a designer reproduce this site's character rather than a generic version of it.

# Codebook ${codebook.version} — id | level/archetype | name: definition
${index}`;
}

export function firstMessage(opts: {
  url: string;
  meta: CaptureMeta;
  styles: any;
  elements: IndexedElement[];
  a11yLines: number;
  siteNote?: string;
}): string {
  const { meta, styles } = opts;
  const landmarks = opts.elements
    .filter((e) => e.kind === 'landmark' || (e.kind === 'heading' && /^h[12]$/.test(e.tag)))
    .slice(0, 60)
    .map((e) => `${e.id} <${e.tag}${e.role ? ` role=${e.role}` : ''}> [${e.bbox.x},${e.bbox.y} ${e.bbox.width}x${e.bbox.height}]${e.name ? ` "${e.name}"` : ''}${e.text ? ` ${truncate(e.text, 70)}` : ''}`);
  const fmt = (xs: any[], f: (x: any) => string) => xs.map(f).join(', ');
  return `Code this site.

URL: ${opts.url}${meta.finalUrl !== opts.url ? ` (final: ${meta.finalUrl})` : ''}
Title: ${meta.title}
HTTP status: ${meta.status ?? 'unknown'}
Screenshot: ${meta.screenshot.width}x${meta.screenshot.height}px${meta.screenshot.truncated ? ` (truncated; the page is ${meta.screenshot.pageHeight}px tall)` : ''}; viewport ${meta.viewport.width}x${meta.viewport.height}. The image above is the first viewport.
${meta.panels ? `Scrolling panels: this page scrolls inside ${meta.panels.scrollers} panel(s) rather than (only) as a whole. So their contents are visible, the full screenshot was taken with the window ${meta.panels.viewportHeight}px tall${meta.panels.expandedInPlace ? ` and ${meta.panels.expandedInPlace} fixed-height panel(s) expanded in place` : ''}; panels and stretched areas are therefore taller than at ${meta.viewport.height}px${meta.panels.hiddenRemaining ? `, and about ${meta.panels.hiddenRemaining}px of panel content is still scrolled out of view (check it on the live page)` : ''}. The image above is the real ${meta.viewport.width}x${meta.viewport.height} first screen; bounding boxes and find_elements use the full screenshot. Code the interface, not the taller layout (e.g. density and whitespace as seen at ${meta.viewport.height}px).
` : ''}Accessibility tree: ${opts.a11yLines} lines. Indexed elements: ${opts.elements.length}.
${opts.siteNote ? `Curator note: ${opts.siteNote}\n` : ''}
Style summary (computed, whole page):
- page background ${styles.pageBackground}; backgrounds by area: ${fmt(styles.backgroundsByArea.slice(0, 8), (b) => `${b.color} ${(b.share * 100).toFixed(1)}%`)}
- text colors: ${fmt(styles.textColors.slice(0, 8), (t) => `${t.color} (${t.chars} chars)`)}
- fonts: ${fmt(styles.fonts, (f) => `${f.family} (${f.textNodes})`)}
- font sizes: ${fmt(styles.fontSizes, (s) => `${s.px}px×${s.textNodes}`)}
- corner radii: ${fmt(styles.radii, (r) => `${r.radius}×${r.boxes}`) || 'none'}
- ${(styles.shadowedShare * 100).toFixed(1)}% of boxes have shadows, ${(styles.borderedShare * 100).toFixed(1)}% have borders; ${styles.gradientBackgrounds} gradient and ${styles.imageBackgrounds} image backgrounds

Landmarks and top headings:
${landmarks.join('\n') || '(none indexed)'}`;
}

export const NUDGE = 'You have not submitted a label yet. Continue the work, then call validate_label and submit_label with the complete label. Do not end your turn without calling a tool.';

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
