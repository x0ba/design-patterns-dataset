// A scripted, model-free "rater" for exercising the pipeline end to end without
// API calls: it calls the real tools (screenshot, elements, codebook, validate,
// submit, propose) and submits a crude heuristic label built from the capture.
// Raters with different ids make different (seeded) choices, so agreement/IRR
// and the console have something to show. Labels say model.provider "dry-run";
// never mix them into a real batch.

import type { AgentOutcome, AgentRun, Provider, RaterConfig } from '../provider.ts';

export const dryRunProvider: Provider = {
  async run(cfg: RaterConfig, run: AgentRun): Promise<AgentOutcome> {
    let turn = 0;
    const call = async (name: string, input: unknown) => {
      turn++;
      run.log({ type: 'tool_call', turn, data: { name, input } });
      const r = await run.execute(name, input);
      run.log({ type: 'tool_result', turn, data: { name, isError: !!r.isError, text: r.text.slice(0, 2000) } });
      return r;
    };
    const rnd = seeded(cfg.id);
    const meta = /Screenshot: (\d+)x(\d+)px/.exec(run.first.text)!;
    const W = Number(meta[1]), H = Number(meta[2]);

    await call('view_screenshot', { y: 0, height: 1600 });
    const parse = (text: string) => text.split('\n').slice(1).map((l) => {
      const m = /^(e\d+) <(\w+)[^>]*> (\w+) \[(\d+),(\d+) (\d+)x(\d+)\](?: name="([^"]*)")?(?: "([^"]*)")?/.exec(l);
      return m && { id: m[1], tag: m[2], kind: m[3], bbox: { x: +m[4], y: +m[5], width: Math.max(1, +m[6]), height: Math.max(1, +m[7]) }, name: m[8], text: m[9] };
    }).filter(Boolean) as { id: string; tag: string; kind: string; bbox: { x: number; y: number; width: number; height: number }; text?: string }[];
    const landmarks = parse((await call('find_elements', { kind: 'landmark', limit: 150 })).text);
    const headings = parse((await call('find_elements', { kind: 'heading', limit: 150 })).text);
    const containers = parse((await call('find_elements', { kind: 'container', limit: 150 })).text);
    await call('get_patterns', { ids: ['app-shell', 'card', 'menu'] });

    const clip = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x, y: Math.min(b.y, H - 2), width: Math.min(b.width, W - b.x), height: Math.max(1, Math.min(b.height, H - Math.min(b.y, H - 2))) });
    const header = landmarks.find((l) => l.tag === 'header' || l.tag === 'nav');
    const footer = [...landmarks].reverse().find((l) => l.tag === 'footer');
    const regions: any[] = [];
    const patterns: any[] = [];
    if (header) {
      regions.push({ id: 'header', role: 'header', label: 'Top navigation', bbox: clip(header.bbox), patterns: ['app-shell'] });
      patterns.push({ id: 'app-shell', status: 'present', confidence: 0.8 + rnd() * 0.15, evidence: [{ bbox: clip(header.bbox), region: 'header' }], dims: {} });
    }
    const top = header ? header.bbox.y + header.bbox.height : 0;
    const bottom = footer ? footer.bbox.y : H;
    regions.push({ id: 'content', role: 'main', label: 'Main content', bbox: clip({ x: 0, y: top, width: W, height: Math.max(1, bottom - top) }), patterns: [] });
    const cards = containers.filter((c) => c.bbox.width < W * 0.5 && c.bbox.height > 80);
    if (cards.length >= 3 || rnd() > 0.5) {
      const c = cards[0] ?? { bbox: { x: 0, y: top, width: Math.min(400, W), height: 200 } };
      const status = cards.length >= 3 ? 'present' : 'uncertain';
      regions[regions.length - 1].patterns.push('card');
      patterns.push({
        id: 'card', status, confidence: status === 'present' ? 0.75 + rnd() * 0.2 : 0.55,
        ...(status === 'uncertain' ? { rationale: 'dry-run: few card-like containers' } : {}),
        evidence: cards.slice(0, 3).map((x) => ({ bbox: clip(x.bbox), region: 'content' })).concat(cards.length ? [] : [{ bbox: clip(c.bbox), region: 'content' }]),
        dims: { style: rnd() > 0.4 ? 'borderless' : 'outlined', shape: 'vertical' },
      });
    }
    if (footer) {
      regions.push({ id: 'footer', role: 'footer', label: 'Footer', bbox: clip(footer.bbox), patterns: [] });
    }
    const h1 = headings[0];
    const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
    const label = {
      site: { domain: 'other', domainNote: 'dry-run rater' },
      regions,
      patterns,
      structure: { layout: `dry-run: ${regions.length} regions`, density: pick(['sparse', 'medium', 'medium', 'dense']) },
      aesthetics: {
        palette: ['#ffffff', '#111111'],
        colorRoles: { background: '#ffffff', text: '#111111' },
        typography: 'dry-run', typeScale: h1 ? `h1 "${h1.text?.slice(0, 30) ?? ''}"` : 'n/a',
        shape: pick(['soft', 'soft', 'sharp']), elevation: pick(['flat', 'flat', 'subtle-shadows']), borders: pick(['thin', 'thin', 'none']),
        imagery: ['product-screenshots'], iconStyle: pick(['line', 'line', 'filled']), whitespace: pick(['moderate', 'generous', 'generous']),
        backgroundTreatment: pick(['solid', 'solid', 'gradient']), mood: ['dry-run'],
      },
      notes: 'Synthetic label from the dry-run provider (no model).',
    };
    const v = await call('validate_label', { label });
    if (v.isError) run.log({ type: 'error', turn, data: v.text });
    if (cfg.id.endsWith('1')) {
      await call('propose_codebook_change', {
        id: 'card', kind: 'new-values', rationale: 'dry-run: exercising the proposal path',
        dimensions: [{ subdimensions: [{ id: 'media', values: [{ id: 'looping-video', name: 'Looping video', description: 'Muted autoplaying video instead of a still' }] }] }],
        evidence: cards[0] ? [{ bbox: clip(cards[0].bbox) }] : [],
      });
    }
    const s = await call('submit_label', { label });
    return { finished: !!s.stop, reason: s.stop ? 'stopped' : 'gave_up', turns: turn, servedBy: [cfg.model], usage: {} };
  },
};

function seeded(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
