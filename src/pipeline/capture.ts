// Capture one site once, deterministically, so every rater codes the same
// artifact (otherwise IRR would measure capture drift, not rater agreement).
//
// dataset/<batch>/sites/<slug>/capture/
//   meta.json        url, finalUrl, status, title, capturedAt, viewport, screenshot size, userAgent
//   screenshot.png   full page, CSS px == screenshot px (deviceScaleFactor 1)
//   viewport.png     above the fold
//   a11y.yaml        Playwright ARIA snapshot of <body>
//   elements.json    indexed landmarks/headings/controls/media with page-pixel bboxes + key styles
//   styles.json      page-level style statistics (colors by area, fonts, radii, shadows, borders)

import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

export const VIEWPORT = { width: 1440, height: 900 };
export const MAX_SCREENSHOT_HEIGHT = 16000;

export interface CaptureMeta {
  url: string;
  finalUrl: string;
  status: number | null;
  title: string;
  capturedAt: string;
  viewport: { width: number; height: number };
  screenshot: { ref: string; width: number; height: number; truncated: boolean; pageHeight: number };
  viewportShot: string;
  userAgent: string;
  durationMs: number;
  error?: string;
}

export interface IndexedElement {
  id: string; // e0, e1, …
  tag: string;
  role?: string;
  name?: string; // accessible-ish name: aria-label, alt, title, or text
  text?: string;
  bbox: { x: number; y: number; width: number; height: number };
  depth: number;
  kind: 'landmark' | 'heading' | 'control' | 'media' | 'container';
  style?: { bg?: string; color?: string; font?: string; size?: number; weight?: number; radius?: string; shadow?: boolean; border?: string };
}

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
}

export async function openPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  return ctx.newPage();
}

export async function captureSite(browser: Browser, url: string, outDir: string): Promise<CaptureMeta> {
  fs.mkdirSync(outDir, { recursive: true });
  const t0 = Date.now();
  const page = await openPage(browser);
  let status: number | null = null;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    status = resp?.status() ?? null;
    await page.waitForLoadState('load', { timeout: 20_000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
    await autoScroll(page);
    await page.waitForTimeout(800);

    const pageHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0));
    const height = Math.min(pageHeight, MAX_SCREENSHOT_HEIGHT);
    await page.screenshot({ path: path.join(outDir, 'viewport.png') });
    await page.screenshot({
      path: path.join(outDir, 'screenshot.png'),
      fullPage: true,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height },
      animations: 'disabled',
    });

    const aria = await page.locator('body').ariaSnapshot({ timeout: 15_000 }).catch((e) => `# aria snapshot failed: ${e.message}`);
    fs.writeFileSync(path.join(outDir, 'a11y.yaml'), aria);

    const { elements, styles } = await page.evaluate(indexPage, { maxY: height });
    fs.writeFileSync(path.join(outDir, 'elements.json'), JSON.stringify(elements));
    fs.writeFileSync(path.join(outDir, 'styles.json'), JSON.stringify(styles, null, 1));

    const meta: CaptureMeta = {
      url,
      finalUrl: page.url(),
      status,
      title: await page.title(),
      capturedAt: new Date().toISOString(),
      viewport: VIEWPORT,
      screenshot: { ref: 'capture/screenshot.png', width: VIEWPORT.width, height, truncated: pageHeight > height, pageHeight },
      viewportShot: 'capture/viewport.png',
      userAgent: await page.evaluate(() => navigator.userAgent),
      durationMs: Date.now() - t0,
    };
    fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));
    return meta;
  } finally {
    await page.context().close();
  }
}

async function autoScroll(page: Page): Promise<void> {
  // Trigger lazy-loaded content, then return to the top so fixed headers sit where a person sees them.
  await page.evaluate(async (max) => {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < Math.min(document.documentElement.scrollHeight, max); y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  }, MAX_SCREENSHOT_HEIGHT);
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
}

/** Runs in the page. Must be self-contained. */
function indexPage({ maxY }: { maxY: number }) {
  const LANDMARK_TAGS = new Set(['header', 'nav', 'main', 'footer', 'aside', 'section', 'form', 'dialog', 'article', 'table', 'menu']);
  const LANDMARK_ROLES = new Set(['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'region', 'search', 'form', 'dialog', 'alertdialog', 'tablist', 'tabpanel', 'menu', 'menubar', 'listbox', 'grid', 'tree', 'toolbar', 'feed', 'list', 'table', 'progressbar', 'slider', 'tooltip', 'status', 'alert']);
  const CONTROL_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary', 'details', 'label']);
  const CONTROL_ROLES = new Set(['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch', 'combobox', 'searchbox', 'textbox', 'option']);
  const MEDIA_TAGS = new Set(['img', 'video', 'canvas', 'svg', 'iframe', 'picture']);
  const out: any[] = [];
  const colorArea = new Map<string, number>();
  const textColor = new Map<string, number>();
  const fonts = new Map<string, number>();
  const radii = new Map<string, number>();
  const sizes = new Map<number, number>();
  let shadowed = 0, bordered = 0, boxes = 0, gradients = 0, bgImages = 0;
  const sy = window.scrollY;

  const hex = (c: string): string | undefined => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return undefined;
    const [r, g, b, a = '1'] = m[1].split(/[,\s/]+/).filter(Boolean);
    if (Number(a) < 0.5) return undefined;
    return '#' + [r, g, b].map((x) => Math.round(Number(x)).toString(16).padStart(2, '0')).join('');
  };
  const bump = <K,>(m: Map<K, number>, k: K | undefined, w = 1) => { if (k !== undefined) m.set(k, (m.get(k) ?? 0) + w); };
  const visible = (el: Element, r: DOMRect, cs: CSSStyleDeclaration) =>
    r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  const textOf = (el: Element) => ((el as HTMLElement).innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();

  const walk = (el: Element, depth: number) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const y = r.top + sy;
    if (cs.display === 'none') return;
    if (visible(el, r, cs) && y < maxY) {
      boxes++;
      const area = Math.min(r.width * r.height, 1440 * 3000);
      bump(colorArea, hex(cs.backgroundColor), area);
      if (cs.boxShadow && cs.boxShadow !== 'none') shadowed++;
      if (parseFloat(cs.borderTopWidth) >= 1 && hex(cs.borderTopColor)) bordered++;
      if (cs.backgroundImage.includes('gradient')) gradients++;
      else if (cs.backgroundImage.includes('url(')) bgImages++;
      const rad = cs.borderTopLeftRadius;
      if (rad && rad !== '0px') bump(radii, rad);
      const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim().length > 1);
      if (direct) {
        bump(textColor, hex(cs.color), (el.textContent ?? '').length);
        bump(fonts, cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), 1);
        bump(sizes, Math.round(parseFloat(cs.fontSize)), 1);
      }
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role') ?? undefined;
      let kind: string | undefined;
      if (/^h[1-6]$/.test(tag) || role === 'heading') kind = 'heading';
      else if (LANDMARK_TAGS.has(tag) || (role && LANDMARK_ROLES.has(role))) kind = 'landmark';
      else if (CONTROL_TAGS.has(tag) || (role && CONTROL_ROLES.has(role))) kind = 'control';
      else if (MEDIA_TAGS.has(tag)) kind = r.width * r.height > 900 ? 'media' : undefined;
      else if ((tag === 'ul' || tag === 'ol' || tag === 'div' || tag === 'li') && r.width > 120 && r.height > 60 && el.children.length >= 2 &&
               (cs.boxShadow !== 'none' || parseFloat(cs.borderTopWidth) >= 1 || (hex(cs.backgroundColor) && cs.backgroundColor !== getComputedStyle(el.parentElement ?? el).backgroundColor) || cs.display.includes('grid'))) kind = 'container';
      if (kind) {
        const text = textOf(el);
        out.push({
          tag, role, kind, depth,
          name: el.getAttribute('aria-label') ?? el.getAttribute('alt') ?? el.getAttribute('title') ?? el.getAttribute('placeholder') ?? undefined,
          text: text ? text.slice(0, kind === 'landmark' || kind === 'container' ? 60 : 100) : undefined,
          bbox: { x: Math.max(0, Math.round(r.left)), y: Math.max(0, Math.round(y)), width: Math.round(r.width), height: Math.round(r.height) },
          style: {
            bg: hex(cs.backgroundColor), color: hex(cs.color), font: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
            size: Math.round(parseFloat(cs.fontSize)), weight: Number(cs.fontWeight) || undefined,
            radius: rad !== '0px' ? rad : undefined, shadow: cs.boxShadow !== 'none' || undefined,
            border: parseFloat(cs.borderTopWidth) >= 1 ? `${cs.borderTopWidth} ${hex(cs.borderTopColor) ?? ''}`.trim() : undefined,
          },
        });
      }
    }
    for (const c of el.children) walk(c, depth + 1);
    if ((el as HTMLElement).shadowRoot) for (const c of (el as HTMLElement).shadowRoot!.children) walk(c, depth + 1);
  };
  walk(document.body, 0);
  const pageBg = hex(getComputedStyle(document.body).backgroundColor) ?? hex(getComputedStyle(document.documentElement).backgroundColor) ?? '#ffffff';

  // Keep the index bounded: everything structural, then controls/media by size.
  const rank: Record<string, number> = { landmark: 0, heading: 1, container: 2, media: 3, control: 4 };
  const kept = out
    .map((e, i) => ({ e, i }))
    .sort((a, b) => rank[a.e.kind] - rank[b.e.kind] || b.e.bbox.width * b.e.bbox.height - a.e.bbox.width * a.e.bbox.height)
    .slice(0, 2500)
    .sort((a, b) => a.i - b.i)
    .map(({ e }, i) => ({ id: `e${i}`, ...e }));

  const top = <K,>(m: Map<K, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const totalArea = [...colorArea.values()].reduce((a, b) => a + b, 0) || 1;
  return {
    elements: kept,
    styles: {
      pageBackground: pageBg,
      backgroundsByArea: top(colorArea, 16).map(([c, a]) => ({ color: c, share: Math.round((a / totalArea) * 10000) / 10000 })),
      textColors: top(textColor, 10).map(([c, n]) => ({ color: c, chars: n })),
      fonts: top(fonts, 8).map(([f, n]) => ({ family: f, textNodes: n })),
      fontSizes: top(sizes, 12).map(([s, n]) => ({ px: s, textNodes: n })).sort((a, b) => b.px - a.px),
      radii: top(radii, 8).map(([r, n]) => ({ radius: r, boxes: n })),
      boxesMeasured: boxes,
      shadowedShare: Math.round((shadowed / Math.max(1, boxes)) * 1000) / 1000,
      borderedShare: Math.round((bordered / Math.max(1, boxes)) * 1000) / 1000,
      gradientBackgrounds: gradients,
      imageBackgrounds: bgImages,
    },
  };
}
