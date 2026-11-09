// The rater's tools. Everything a rater sees comes from the shared capture
// (identical for all raters) plus an optional live page for interaction that a
// static screenshot cannot show (menus, tabs, carousels, hover states).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Browser, Page } from 'playwright';
import type { BundleEntry, CodebookBundle } from '../codebook/bundle.ts';
import { openPage, type CaptureMeta, type IndexedElement } from './capture.ts';
import { validateLabel, type Label, type ModelLabel } from './label.ts';
import { checkProposal, fileProposal, type ProposalInput } from './proposals.ts';
import type { ImagePart, ToolResult, ToolSpec } from './provider.ts';

export const MAX_IMAGE_EDGE = 1568; // larger images are downsampled by the API anyway
const MAX_LIVE_ACTIONS = 25;

export interface ToolContext {
  batch: string;
  slug: string;
  siteUrl: string;
  rater: { id: string; provider: string; model: string; effort?: string };
  captureDir: string;
  meta: CaptureMeta;
  codebook: CodebookBundle;
  browser: Browser;
  /** Called with the complete label when submit_label succeeds. */
  onSubmit: (label: Label) => void;
}

const bboxSchema = {
  type: 'object',
  properties: { x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' } },
  required: ['x', 'y', 'width', 'height'],
  additionalProperties: false,
};

export function toolSpecs(labelModelSchema: object): ToolSpec[] {
  return [
    {
      name: 'view_screenshot',
      description: 'Show a region of the full-page screenshot (all coordinates are screenshot pixels, origin top-left; width is the viewport width). Use it to scan the page top to bottom and to inspect details. Pass `boxes` to draw labelled rectangles over the crop — use this to check bounding boxes before you submit them.',
      input_schema: {
        type: 'object',
        properties: {
          y: { type: 'number', description: 'Top of the crop.' },
          height: { type: 'number', description: 'Crop height (max 2400). Default 1200.' },
          x: { type: 'number', description: 'Left of the crop. Default 0.' },
          width: { type: 'number', description: 'Crop width. Default full width.' },
          zoom: { type: 'number', description: 'Magnification for small details (0.25–3). Default: fit to ~1568px.' },
          boxes: { type: 'array', items: { ...bboxSchema, properties: { ...bboxSchema.properties, label: { type: 'string' } } }, description: 'Rectangles to overlay, in screenshot pixels.' },
        },
        required: ['y'],
        additionalProperties: false,
      },
    },
    {
      name: 'find_elements',
      description: 'Search the indexed DOM elements (landmarks, headings, containers, controls, media) captured with the screenshot. Returns precise bounding boxes in screenshot pixels and key computed styles. Use it to get exact bboxes and colors/fonts instead of estimating from pixels.',
      input_schema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Case-insensitive substring of the element text or accessible name.' },
          kind: { enum: ['landmark', 'heading', 'container', 'control', 'media'] },
          tag: { type: 'string' },
          role: { type: 'string' },
          within: { ...bboxSchema, description: 'Only elements whose box intersects this rectangle.' },
          limit: { type: 'integer', description: 'Default 40, max 150.' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'read_accessibility_tree',
      description: 'Read the ARIA snapshot (YAML) of the page as captured. Paginate with offset/limit, or filter lines with `grep` (case-insensitive regex; returns matches with 2 lines of context).',
      input_schema: {
        type: 'object',
        properties: {
          offset: { type: 'integer', description: 'First line (0-based). Default 0.' },
          limit: { type: 'integer', description: 'Lines to return. Default 200, max 600.' },
          grep: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'explore_live',
      description: `Interact with a live copy of the page (same 1440x900 viewport) to verify behavior a screenshot cannot show: open a menu, switch a tab, advance a carousel, hover for a tooltip. Returns a viewport screenshot. Coordinates are page coordinates (same as the full screenshot); the page scrolls as needed. Labels and bboxes must still refer to the captured full-page screenshot. At most ${MAX_LIVE_ACTIONS} actions.`,
      input_schema: {
        type: 'object',
        properties: {
          action: { enum: ['open', 'scroll_to', 'click', 'hover', 'press', 'back'] },
          x: { type: 'number' },
          y: { type: 'number', description: 'Page y. For scroll_to: the page y to bring to the top of the viewport.' },
          text: { type: 'string', description: 'For click/hover: target the first visible element with this exact visible text instead of x/y.' },
          key: { type: 'string', description: 'For press, e.g. "Escape", "ArrowRight", "Tab".' },
        },
        required: ['action'],
        additionalProperties: false,
      },
    },
    {
      name: 'search_codebook',
      description: 'Search codebook entries by id, name, alias and definition. Returns ids with one-line definitions.',
      input_schema: {
        type: 'object',
        properties: { query: { type: 'string' }, level: { enum: ['archetype', 'pattern', 'component'] }, limit: { type: 'integer' } },
        required: ['query'],
        additionalProperties: false,
      },
    },
    {
      name: 'get_patterns',
      description: 'Full codebook definitions for up to 6 ids: anatomy, related ids, and every dimension -> sub-dimension (id, single/multi select) -> value ids with descriptions and real-world examples. Always read a pattern before labeling its dims.',
      input_schema: {
        type: 'object',
        properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 } },
        required: ['ids'],
        additionalProperties: false,
      },
    },
    {
      name: 'validate_label',
      description: 'Check a draft label against the schema and the codebook without submitting it. Returns errors (must fix) and warnings (review).',
      input_schema: { type: 'object', properties: { label: labelModelSchema }, required: ['label'], additionalProperties: false },
    },
    {
      name: 'submit_label',
      description: 'Submit the final label. It is validated first; if there are errors nothing is saved and you get the errors back. On success the session ends.',
      input_schema: { type: 'object', properties: { label: labelModelSchema }, required: ['label'], additionalProperties: false },
    },
    {
      name: 'propose_codebook_change',
      description: 'File a proposal when the page shows a UI pattern the codebook has no entry for (kind "new-entry"), or a variation of an existing pattern that none of its values describe (kind "new-values"). Proposals are reviewed between batches; the codebook does not change during this session, so keep labeling with existing ids.',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'kebab-case. For new-values: the existing pattern id.' },
          kind: { enum: ['new-entry', 'new-values'] },
          rationale: { type: 'string', description: 'Why no existing entry/value fits, and what distinguishes this one.' },
          name: { type: 'string' },
          level: { enum: ['archetype', 'pattern', 'component'] },
          parent: { type: 'string', description: 'Archetype id (new-entry).' },
          definition: { type: 'string' },
          aliases: { type: 'array', items: { type: 'string' } },
          relations: { type: 'object', properties: { uses: { type: 'array', items: { type: 'string' } }, specializes: { type: 'array', items: { type: 'string' } }, neighbors: { type: 'array', items: { type: 'string' } } }, additionalProperties: false },
          dimensions: {
            type: 'array',
            description: 'For new-values on an existing sub-dimension, only subdimensions[].id and values are needed.',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' }, family: { type: 'string' }, question: { type: 'string' },
                subdimensions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' }, name: { type: 'string' }, select: { enum: ['one', 'many'] },
                      values: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, example: { type: 'string' } }, required: ['id', 'name'], additionalProperties: false } },
                    },
                    required: ['id', 'values'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['subdimensions'],
              additionalProperties: false,
            },
          },
          evidence: { type: 'array', items: { type: 'object', properties: { bbox: bboxSchema, quote: { type: 'string' }, note: { type: 'string' } }, additionalProperties: false } },
        },
        required: ['id', 'kind', 'rationale'],
        additionalProperties: false,
      },
    },
  ];
}

export class RaterTools {
  private viewer?: Page;
  private live?: Page;
  private liveActions = 0;
  private elements: IndexedElement[];
  private a11y: string[];
  private byId: Map<string, BundleEntry>;
  submitted?: Label;
  proposals: string[] = [];

  private ctx: ToolContext;

  constructor(ctx: ToolContext) {
    this.ctx = ctx;
    this.elements = JSON.parse(fs.readFileSync(path.join(ctx.captureDir, 'elements.json'), 'utf8'));
    this.a11y = fs.readFileSync(path.join(ctx.captureDir, 'a11y.yaml'), 'utf8').split('\n');
    this.byId = new Map(ctx.codebook.entries.map((e) => [e.id, e]));
  }

  async close(): Promise<void> {
    await this.viewer?.context().close().catch(() => {});
    await this.live?.context().close().catch(() => {});
  }

  async execute(name: string, input: any): Promise<ToolResult> {
    switch (name) {
      case 'view_screenshot': return this.viewScreenshot(input);
      case 'find_elements': return this.findElements(input);
      case 'read_accessibility_tree': return this.readA11y(input);
      case 'explore_live': return this.exploreLive(input);
      case 'search_codebook': return this.searchCodebook(input);
      case 'get_patterns': return this.getPatterns(input);
      case 'validate_label': return this.validate(input, false);
      case 'submit_label': return this.validate(input, true);
      case 'propose_codebook_change': return this.propose(input);
      default: return { text: `Unknown tool "${name}"`, isError: true };
    }
  }

  // ------------------------------------------------------------ screenshot

  /** Render a crop of screenshot.png (optionally with boxes) through a local viewer page. */
  async crop(r: { x?: number; y: number; width?: number; height?: number; zoom?: number; boxes?: any[] }): Promise<{ image: ImagePart; desc: string }> {
    const W = this.ctx.meta.screenshot.width, H = this.ctx.meta.screenshot.height;
    const x = clamp(Math.round(r.x ?? 0), 0, W - 1);
    const y = clamp(Math.round(r.y ?? 0), 0, H - 1);
    const w = clamp(Math.round(r.width ?? W - x), 1, W - x);
    const h = clamp(Math.round(r.height ?? 1200), 1, Math.min(2400, H - y));
    const fit = MAX_IMAGE_EDGE / Math.max(w, h);
    const zoom = clamp(r.zoom ?? Math.min(1, fit), 0.25, Math.min(3, fit * 1.0001));
    if (!this.viewer) {
      this.viewer = await openPage(this.ctx.browser);
      const html = path.join(this.ctx.captureDir, '_viewer.html');
      fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}#s{position:absolute;left:0;top:0;transform-origin:0 0}#o{position:absolute;left:0;top:0;transform-origin:0 0}.b{position:absolute;border:2px solid #ff1f8f;box-shadow:0 0 0 1px #fff}.b span{position:absolute;left:-2px;top:-20px;background:#ff1f8f;color:#fff;font:600 12px/18px system-ui;padding:0 4px;white-space:nowrap}</style><img id="s" src="screenshot.png"><div id="o"></div>');
      await this.viewer.goto(pathToFileURL(path.resolve(html)).href);
      await this.viewer.waitForFunction(() => (document.getElementById('s') as HTMLImageElement).complete);
    }
    const vw = Math.max(1, Math.ceil(w * zoom)), vh = Math.max(1, Math.ceil(h * zoom));
    await this.viewer.setViewportSize({ width: vw, height: vh });
    await this.viewer.evaluate(({ x, y, zoom, boxes }) => {
      const t = `translate(${-x * zoom}px, ${-y * zoom}px) scale(${zoom})`;
      (document.getElementById('s') as HTMLElement).style.transform = t;
      const o = document.getElementById('o')!;
      o.style.transform = t;
      o.innerHTML = '';
      for (const b of boxes) {
        const d = document.createElement('div');
        d.className = 'b';
        Object.assign(d.style, { left: b.x + 'px', top: b.y + 'px', width: b.width + 'px', height: b.height + 'px', borderWidth: `${2 / zoom}px` });
        if (b.label) { const s = document.createElement('span'); s.textContent = b.label; s.style.transform = `scale(${1 / zoom})`; s.style.transformOrigin = '0 100%'; d.appendChild(s); }
        o.appendChild(d);
      }
    }, { x, y, zoom, boxes: r.boxes ?? [] });
    const buf = await this.viewer.screenshot({ type: 'jpeg', quality: 82 });
    return {
      image: { mediaType: 'image/jpeg', data: buf.toString('base64') },
      desc: `Crop x=${x} y=${y} w=${w} h=${h} of the ${W}x${H} screenshot at zoom ${zoom.toFixed(2)} (image is ${vw}x${vh}; screenshot px = image px / ${zoom.toFixed(2)} + offset).${y + h < H ? ` Page continues below (next y=${y + h}).` : ' This reaches the bottom of the page.'}`,
    };
  }

  private async viewScreenshot(input: any): Promise<ToolResult> {
    const { image, desc } = await this.crop(input);
    return { text: desc, images: [image] };
  }

  // -------------------------------------------------------------- elements

  private findElements(input: any): ToolResult {
    const limit = clamp(input.limit ?? 40, 1, 150);
    const q = input.text?.toLowerCase();
    const w = input.within;
    const hits = this.elements.filter((e) =>
      (!input.kind || e.kind === input.kind) &&
      (!input.tag || e.tag === input.tag.toLowerCase()) &&
      (!input.role || e.role === input.role) &&
      (!q || (e.text ?? '').toLowerCase().includes(q) || (e.name ?? '').toLowerCase().includes(q)) &&
      (!w || (e.bbox.x < w.x + w.width && e.bbox.x + e.bbox.width > w.x && e.bbox.y < w.y + w.height && e.bbox.y + e.bbox.height > w.y)));
    const lines = hits.slice(0, limit).map((e) => {
      const s = e.style ?? {};
      const style = [s.bg && `bg ${s.bg}`, s.color && `fg ${s.color}`, s.font && `${s.font} ${s.size}px/${s.weight}`, s.radius && `r ${s.radius}`, s.shadow && 'shadow', s.border && `border ${s.border}`].filter(Boolean).join(', ');
      return `${e.id} <${e.tag}${e.role ? ` role=${e.role}` : ''}> ${e.kind} [${e.bbox.x},${e.bbox.y} ${e.bbox.width}x${e.bbox.height}]${e.name ? ` name="${e.name}"` : ''}${e.text ? ` "${e.text}"` : ''}${style ? ` {${style}}` : ''}`;
    });
    return { text: `${hits.length} match(es)${hits.length > limit ? `, showing ${limit}` : ''}. Format: id <tag> kind [x,y wxh] …\n${lines.join('\n') || '(none)'}` };
  }

  private readA11y(input: any): ToolResult {
    if (input.grep) {
      let re: RegExp;
      try { re = new RegExp(input.grep, 'i'); } catch { return { text: 'Invalid regex', isError: true }; }
      const out: string[] = [];
      let matches = 0;
      this.a11y.forEach((l, i) => {
        if (re.test(l) && matches++ < 60) out.push(`--- line ${i}`, ...this.a11y.slice(Math.max(0, i - 2), i + 3));
      });
      return { text: `${matches} matching line(s)${matches > 60 ? ' (first 60)' : ''}\n${out.join('\n')}` };
    }
    const offset = clamp(input.offset ?? 0, 0, this.a11y.length);
    const limit = clamp(input.limit ?? 200, 1, 600);
    return { text: `Lines ${offset}-${Math.min(this.a11y.length, offset + limit) - 1} of ${this.a11y.length}:\n${this.a11y.slice(offset, offset + limit).join('\n')}` };
  }

  // ------------------------------------------------------------------ live

  private async exploreLive(input: any): Promise<ToolResult> {
    if (this.liveActions++ >= MAX_LIVE_ACTIONS) return { text: `Live exploration budget (${MAX_LIVE_ACTIONS} actions) is used up. Work from the captured screenshot.`, isError: true };
    try {
      if (!this.live || input.action === 'open') {
        await this.live?.context().close().catch(() => {});
        this.live = await openPage(this.ctx.browser);
        await this.live.goto(this.ctx.meta.finalUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await this.live.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
      }
      const page = this.live;
      const scrollToPageY = async (py: number) => {
        await page.evaluate((t) => window.scrollTo(0, t), Math.max(0, py - 300));
        await page.waitForTimeout(250);
        return page.evaluate(() => window.scrollY);
      };
      let note = '';
      switch (input.action) {
        case 'open': break;
        case 'scroll_to':
          await page.evaluate((t) => window.scrollTo(0, t), Math.max(0, input.y ?? 0));
          await page.waitForTimeout(400);
          break;
        case 'click':
        case 'hover': {
          if (input.text) {
            const loc = page.getByText(input.text, { exact: true }).locator('visible=true').first();
            await loc.scrollIntoViewIfNeeded({ timeout: 5000 });
            if (input.action === 'click') await loc.click({ timeout: 5000 }); else await loc.hover({ timeout: 5000 });
          } else {
            if (input.x === undefined || input.y === undefined) return { text: 'click/hover need x and y, or text', isError: true };
            const sy = await scrollToPageY(input.y);
            if (input.action === 'click') await page.mouse.click(input.x, input.y - sy); else await page.mouse.move(input.x, input.y - sy);
          }
          await page.waitForTimeout(700);
          break;
        }
        case 'press':
          await page.keyboard.press(input.key ?? 'Escape');
          await page.waitForTimeout(500);
          break;
        case 'back':
          await page.goBack({ timeout: 15_000 }).catch(() => { note = ' (no history)'; });
          await page.waitForTimeout(500);
          break;
      }
      const sy = await page.evaluate(() => window.scrollY);
      const buf = await page.screenshot({ type: 'jpeg', quality: 80 });
      return {
        text: `Live page after ${input.action}${note}: ${page.url()} — viewport shows page y ${Math.round(sy)}–${Math.round(sy) + 900}. ${MAX_LIVE_ACTIONS - this.liveActions} live actions left.`,
        images: [{ mediaType: 'image/jpeg', data: buf.toString('base64') }],
      };
    } catch (e) {
      return { text: `Live action failed: ${(e as Error).message.split('\n')[0]}`, isError: true };
    }
  }

  // -------------------------------------------------------------- codebook

  private searchCodebook(input: any): ToolResult {
    const terms = String(input.query).toLowerCase().split(/[\s,]+/).filter(Boolean);
    const scored = this.ctx.codebook.entries
      .filter((e) => !e.deprecated && (!input.level || e.level === input.level))
      .map((e) => {
        const hay = { id: e.id, name: e.name.toLowerCase(), alias: e.aliases.join(' ').toLowerCase(), def: e.definition.toLowerCase(), dims: e.dimensions.flatMap((d) => d.subdimensions.flatMap((s) => s.values.map((v) => v.name))).join(' ').toLowerCase() };
        const score = terms.reduce((a, t) => a + (hay.id.includes(t) ? 5 : 0) + (hay.name.includes(t) ? 4 : 0) + (hay.alias.includes(t) ? 3 : 0) + (hay.def.includes(t) ? 1 : 0) + (hay.dims.includes(t) ? 0.5 : 0), 0);
        return { e, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, clamp(input.limit ?? 12, 1, 40));
    if (!scored.length) return { text: 'No matches. Try other words, or propose a new entry if nothing fits.' };
    return { text: scored.map(({ e }) => `${e.id} (${e.level}${e.parent ? ` · ${e.parent}` : ''}) — ${e.name}: ${e.definition}${e.aliases.length ? ` [aka ${e.aliases.join(', ')}]` : ''}`).join('\n') };
  }

  private getPatterns(input: any): ToolResult {
    const out: string[] = [];
    for (const id of (input.ids ?? []).slice(0, 6)) {
      const e = this.byId.get(id);
      if (!e) { out.push(`## ${id}\nNot a codebook id.`); continue; }
      out.push(describeEntry(e));
    }
    return { text: out.join('\n\n') };
  }

  // ----------------------------------------------------------------- label

  /** Merge the model's label with harness-owned fields. */
  complete(m: ModelLabel): Label {
    const meta = this.ctx.meta;
    return {
      schemaVersion: '1.0.0',
      codebookVersion: this.ctx.codebook.version,
      batch: this.ctx.batch,
      site: {
        slug: this.ctx.slug,
        url: this.ctx.siteUrl,
        finalUrl: meta.finalUrl,
        status: meta.status,
        title: meta.title,
        capturedAt: meta.capturedAt,
        viewport: meta.viewport,
        screenshot: { ref: meta.screenshot.ref, width: meta.screenshot.width, height: meta.screenshot.height, ...(meta.screenshot.truncated ? { truncated: true } : {}) },
        userAgent: meta.userAgent,
        domain: m.site?.domain,
        ...(m.site?.domainNote ? { domainNote: m.site.domainNote } : {}),
      },
      regions: m.regions,
      patterns: m.patterns,
      structure: { layout: m.structure?.layout, regions: (m.regions ?? []).map((r) => r.id), density: m.structure?.density },
      aesthetics: m.aesthetics,
      model: {
        rater: this.ctx.rater.id,
        provider: this.ctx.rater.provider,
        name: this.ctx.rater.model,
        ...(this.ctx.rater.effort ? { effort: this.ctx.rater.effort } : {}),
        generatedAt: new Date().toISOString(),
      },
      notes: m.notes ?? '',
    } as Label;
  }

  private validate(input: any, submit: boolean): ToolResult {
    let m = input?.label;
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch { return { text: 'label must be a JSON object', isError: true }; } }
    if (!m || typeof m !== 'object') return { text: 'label must be an object', isError: true };
    const label = this.complete(m);
    const { errors, warnings } = validateLabel(label, this.ctx.codebook);
    const report = [
      errors.length ? `ERRORS (${errors.length}) — must fix:\n- ${errors.join('\n- ')}` : 'No errors.',
      warnings.length ? `WARNINGS (${warnings.length}) — review:\n- ${warnings.join('\n- ')}` : '',
    ].filter(Boolean).join('\n\n');
    if (!submit) return { text: report, isError: errors.length > 0 };
    if (errors.length) return { text: `Not submitted.\n\n${report}`, isError: true };
    this.submitted = label;
    this.ctx.onSubmit(label);
    return { text: `Submitted. ${label.patterns.length} patterns, ${label.regions.length} regions.${warnings.length ? `\n\n${report}` : ''}`, stop: true };
  }

  private propose(input: ProposalInput): ToolResult {
    const errs = checkProposal(input, this.byId as any, this.ctx.codebook.families.map((f) => f.id));
    if (errs.length) return { text: `Proposal not filed:\n- ${errs.join('\n- ')}`, isError: true };
    const { file, merged } = fileProposal(input, {
      batch: this.ctx.batch, codebookVersion: this.ctx.codebook.version, rater: this.ctx.rater.id, site: this.ctx.slug, url: this.ctx.siteUrl,
    });
    this.proposals.push(input.id);
    return { text: `Proposal filed (${merged ? 'merged into an existing proposal' : 'new'}): ${path.basename(path.dirname(file))}/${path.basename(file)}. Keep labeling with existing codebook ids; record the variation under the pattern's "novel" list if it is a new value.` };
  }
}

export function describeEntry(e: BundleEntry): string {
  const lines = [`## ${e.id} — ${e.name} (${e.level}${e.parent ? `, archetype ${e.parent}` : ''})${e.deprecated ? ` DEPRECATED → ${e.replacedBy}` : ''}`, e.definition];
  if (e.aliases.length) lines.push(`Aliases: ${e.aliases.join(', ')}`);
  if (e.anatomy.length) lines.push(`Anatomy: ${e.anatomy.map((a) => `${a.name} (${a.role})`).join('; ')}`);
  const rel = Object.entries(e.relations).filter(([, v]) => v.length).map(([k, v]) => `${k}: ${v.join(', ')}`);
  if (rel.length) lines.push(`Related — ${rel.join(' | ')}`);
  lines.push('Dimensions (dims key = sub-dimension id; values = value ids):');
  for (const d of e.dimensions) {
    lines.push(`* ${d.name} [${d.family}] — ${d.question}`);
    for (const s of d.subdimensions) {
      lines.push(`  - ${s.id} (${s.select === 'many' ? 'multi-select: list of ids' : 'single-select: one id'}) — ${s.name}${s.note ? ` (${s.note})` : ''}`);
      for (const v of s.values) lines.push(`      ${v.id}: ${v.name}${v.description ? ` — ${v.description}` : ''}${v.example ? ` (e.g. ${v.example})` : ''}`);
    }
  }
  return lines.join('\n');
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
