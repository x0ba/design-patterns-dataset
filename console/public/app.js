// Dataset console front end. No build step; hash routes:
//   #/                      progress dashboard (latest batch)
//   #/batch/<batch>         progress dashboard for a batch
//   #/site/<batch>/<slug>   UI viewer
//   #/codebook[/<id>]       codebook browser
//   #/proposals             proposal review

const app = document.getElementById('app');
const tip = document.getElementById('tip');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const api = async (url, opts) => {
  const r = await fetch(url, opts);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
};
const fmt = (x, d = 2) => (x === null || x === undefined || Number.isNaN(x) ? '—' : Number(x).toFixed(d));

const STATE = {
  queued: 'Queued', capturing: 'Capturing', labeling: 'Labeling', labeled: 'Labeled', flagged: 'Flagged', failed: 'Failed',
};
const stateChip = (s) => `<span class="st ${esc(s)}"><i></i>${esc(STATE[s] ?? s)}</span>`;
const RSTATE = { pending: 'queued', running: 'labeling', done: 'labeled', failed: 'failed' };

let codebookCache;
async function codebook() {
  codebookCache ??= await api('/api/codebook');
  return codebookCache;
}

// ------------------------------------------------------------------ router

async function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on',
    (a.dataset.nav === 'progress' && (!parts[0] || parts[0] === 'batch' || parts[0] === 'site')) || a.dataset.nav === parts[0]));
  hideTip();
  try {
    if (!parts[0] || parts[0] === 'batch') await viewProgress(parts[1]);
    else if (parts[0] === 'site') await viewSite(parts[1], parts[2]);
    else if (parts[0] === 'codebook') await viewCodebook(parts[1]);
    else if (parts[0] === 'proposals') await viewProposals();
    else app.innerHTML = `<div class="empty">Not found</div>`;
  } catch (e) {
    app.innerHTML = `<div class="card err">${esc(e.message)}</div>`;
  }
}
addEventListener('hashchange', route);

codebook().then((c) => {
  document.getElementById('cb-version').textContent = `codebook ${c.version}${c.sourceVersion && c.sourceVersion !== c.version ? ` (source ${c.sourceVersion}, rebuild dist/)` : ''}`;
}).catch(() => {});
route();

// --------------------------------------------------------------- progress

async function viewProgress(batchName) {
  const { batches } = await api('/api/batches');
  if (!batches.length) {
    app.innerHTML = `<div class="card empty">No batches yet.<br><br><code>node scripts/label.ts --batch batch-001</code></div>`;
    return;
  }
  const b = batches.find((x) => x.batch === batchName) ?? batches[batches.length - 1];
  const total = b.sites.length;
  const inProgress = (b.counts.capturing ?? 0) + (b.counts.labeling ?? 0);
  const kpi = (n, label, cls) => `<div class="kpi"><div class="n">${n}</div><div class="l">${cls ? `<span class="st ${cls}"><i></i></span>` : ''}${label}</div></div>`;
  const segs = [['labeled', 'var(--good)'], ['flagged', 'var(--warning)'], ['failed', 'var(--critical)'], ['labeling', 'var(--accent)'], ['capturing', 'var(--accent)'], ['queued', 'var(--seq-track)']];

  app.innerHTML = `
    <div class="row">
      <div><h1>${esc(b.batch)}</h1>
        <div class="muted small">codebook ${esc(b.info?.codebookVersion ?? '?')} · raters ${b.raters.map(esc).join(', ')} · started ${esc(b.info?.createdAt?.slice(0, 10) ?? '')}</div></div>
      <div class="spacer"></div>
      ${batches.length > 1 ? `<select id="batch">${batches.map((x) => `<option ${x.batch === b.batch ? 'selected' : ''}>${esc(x.batch)}</option>`).join('')}</select>` : ''}
    </div>
    <div class="kpis">
      ${kpi(total, 'Sites')}${kpi(b.counts.queued ?? 0, 'Queued', 'queued')}${kpi(inProgress, 'In progress', 'labeling')}
      ${kpi(b.counts.labeled ?? 0, 'Labeled', 'labeled')}${kpi(b.counts.flagged ?? 0, 'Flagged', 'flagged')}${kpi(b.counts.failed ?? 0, 'Failed', 'failed')}
    </div>
    <div class="card">
      <div class="progress" role="img" aria-label="Batch progress">${segs.map(([s, c]) => (b.counts[s] ? `<div style="flex:${b.counts[s]};background:${c}" title="${STATE[s]}: ${b.counts[s]}"></div>` : '')).join('')}</div>
      <div class="legend">${segs.filter(([s]) => s !== 'capturing').map(([s]) => `${stateChip(s)} <span class="small muted">${s === 'labeling' ? inProgress : (b.counts[s] ?? 0)}</span>`).join('')}</div>
    </div>
    <div class="card" style="margin-top:16px">${irrTable(b)}</div>
    <div class="card" style="margin-top:16px">
      <div class="row" style="margin-bottom:8px"><h2 style="margin:0">Sites</h2><div class="spacer"></div>
        <input type="search" id="q" placeholder="Filter sites…">
        <select id="st"><option value="">All states</option>${Object.keys(STATE).map((s) => `<option value="${s}">${STATE[s]}</option>`).join('')}</select>
        <label class="small"><input type="checkbox" id="dis"> only with disagreements</label>
      </div>
      <table><thead><tr><th>Site</th><th>Domain</th><th>State</th><th>Raters</th><th class="num">Agreement</th><th>Disagreeing fields</th></tr></thead>
      <tbody id="sites"></tbody></table>
    </div>`;

  const renderSites = () => {
    const q = document.getElementById('q').value.toLowerCase();
    const st = document.getElementById('st').value;
    const dis = document.getElementById('dis').checked;
    const rows = b.sites.filter((s) => (!q || `${s.slug} ${s.title ?? ''} ${s.domain ?? ''}`.toLowerCase().includes(q)) && (!st || s.state === st) && (!dis || s.agreement?.disagreements));
    document.getElementById('sites').innerHTML = rows.map((s) => `
      <tr class="click" data-href="#/site/${encodeURIComponent(b.batch)}/${encodeURIComponent(s.slug)}">
        <td><div>${esc(s.title || s.slug)}</div><div class="small muted mono">${esc(s.url ?? '')}</div>${s.error ? `<div class="small err">${esc(s.error)}</div>` : ''}${s.flags?.length ? `<div class="small">${s.flags.map(esc).join(' · ')}</div>` : ''}</td>
        <td class="small">${esc(s.domain ?? '')}</td>
        <td>${stateChip(s.state)}</td>
        <td><div class="dots">${b.raters.map((r) => `<span class="st ${RSTATE[s.raters[r]?.state] ?? 'queued'}" title="${esc(r)}: ${esc(s.raters[r]?.state ?? 'pending')}${s.raters[r]?.error ? ' — ' + esc(s.raters[r].error) : ''}"><i></i></span>`).join('')}</div></td>
        <td class="num">${s.agreement ? `${fmt(s.agreement.score)}<div class="ubar" style="margin-top:4px"><b style="width:${Math.max(0, s.agreement.score) * 100}%"></b></div>` : '<span class="muted">—</span>'}</td>
        <td><div class="chips">${(s.agreement?.fields ?? []).map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div></td>
      </tr>`).join('') || `<tr><td colspan="6" class="empty">No sites match.</td></tr>`;
  };
  renderSites();
  ['q', 'st', 'dis'].forEach((id) => document.getElementById(id).addEventListener('input', renderSites));
  document.getElementById('sites').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-href]'); if (tr) location.hash = tr.dataset.href; });
  document.getElementById('batch')?.addEventListener('change', (e) => { location.hash = `#/batch/${encodeURIComponent(e.target.value)}`; });
}

function irrTable(b) {
  if (!b.irr) return `<h2>Inter-rater reliability</h2><p class="muted">Not computed yet. Run <code>node scripts/irr.ts --batch ${esc(b.batch)}</code>.</p>`;
  const bar = (a) => {
    const v = a === null ? 0 : Math.max(0, Math.min(1, a));
    return `<div class="abar" role="img" aria-label="alpha ${fmt(a, 3)}"><div class="fill" style="width:${v * 100}%"></div><div class="tick" style="left:66.7%"></div><div class="tick" style="left:80%"></div></div>`;
  };
  return `<div class="row"><h2 style="margin:0">Inter-rater reliability</h2><span class="muted small">Krippendorff's α over ${b.irr.sitesWithTwoPlusLabels} site(s) · ticks at 0.667 (tentative) and 0.8 (reliable)</span></div>
    <table style="margin-top:8px"><thead><tr><th>Field</th><th>Location</th><th>Metric</th><th style="width:34%">α</th><th class="num">α</th><th class="num">Pairwise agreement</th><th class="num">Units</th></tr></thead>
    <tbody>${b.irr.fields.map((f) => `<tr><td>${esc(f.label)}</td><td class="small muted">${esc(f.location)}</td><td class="small">${esc(f.metric)}</td>
      <td>${bar(f.alpha)}</td><td class="num">${fmt(f.alpha, 3)}${f.alpha !== null && f.alpha < 0 ? ' <span class="small muted">(below chance)</span>' : ''}</td>
      <td class="num">${f.metric === 'interval' ? '<span class="muted" title="exact agreement is not meaningful for a continuous value">—</span>' : fmt(f.pairwiseAgreement, 2)}</td><td class="num">${f.units}${f.note ? ` <span class="small muted" title="${esc(f.note)}">ⓘ</span>` : ''}</td></tr>`).join('')}</tbody></table>
    ${b.irr.patternStatusByPattern?.length ? `<h3>Least reliable pattern statuses</h3><div class="chips">${b.irr.patternStatusByPattern.slice(0, 12).map((p) => `<a class="chip" href="#/codebook/${esc(p.id)}" title="α ${fmt(p.alpha, 3)} over ${p.units} units">${esc(p.id)} ${fmt(p.alpha, 2)}</a>`).join('')}</div>` : ''}`;
}

// ------------------------------------------------------------------ viewer

async function viewSite(batch, slug) {
  const [d, cb] = await Promise.all([api(`/api/site/${encodeURIComponent(batch)}/${encodeURIComponent(slug)}`), codebook()]);
  const byId = new Map(cb.entries.map((e) => [e.id, e]));
  const sources = [...(d.consensus ? ['consensus'] : []), ...Object.keys(d.labels)];
  let source = sources[0];
  let showRegions = true, showPatterns = true, tags = false;

  const header = `
    <div class="row"><a href="#/batch/${encodeURIComponent(batch)}" class="small">← ${esc(batch)}</a></div>
    <div class="row" style="margin:6px 0 14px"><div><h1>${esc(d.meta?.title || slug)}</h1>
      <div class="small muted mono"><a href="${esc(d.meta?.finalUrl ?? d.status?.url)}" target="_blank" rel="noopener">${esc(d.meta?.finalUrl ?? d.status?.url ?? '')}</a>
      ${d.meta ? ` · ${d.meta.screenshot.width}×${d.meta.screenshot.height}px · captured ${esc(d.meta.capturedAt.slice(0, 16).replace('T', ' '))}` : ''}</div></div>
      <div class="spacer"></div>${d.status ? stateChip(d.status.state) : ''}</div>`;

  if (!d.screenshot) {
    app.innerHTML = header + `<div class="card empty">No capture yet.</div>`;
    return;
  }

  app.innerHTML = header + `
    <div class="viewer">
      <div>
        <div class="row" style="margin-bottom:8px">
          <div class="tabs" id="srcs">${sources.map((s) => `<button data-src="${esc(s)}">${esc(s)}</button>`).join('') || '<span class="muted">No labels yet</span>'}</div>
          <div class="spacer"></div>
          <label class="small"><input type="checkbox" id="t-reg" checked> regions</label>
          <label class="small"><input type="checkbox" id="t-pat" checked> patterns</label>
          <label class="small"><input type="checkbox" id="t-tag"> labels</label>
        </div>
        <div class="shot-wrap" id="shot"><img src="${esc(d.screenshot)}" alt="Full-page screenshot of ${esc(d.meta.title)}"><div class="ov" id="ov"></div></div>
      </div>
      <aside class="side card" id="side"></aside>
    </div>
    <div class="grid2" style="margin-top:16px">
      <div class="card" id="agree"></div>
      <div class="card" id="aest"></div>
    </div>`;

  const W = d.meta.screenshot.width, H = d.meta.screenshot.height;
  const ov = document.getElementById('ov');

  const current = () => {
    if (source === 'consensus') {
      const c = d.consensus;
      const ref = Object.values(d.labels)[0];
      return {
        regions: ref?.regions ?? [],
        patterns: c.patterns.filter((p) => p.status !== 'absent').map((p) => ({ ...p, evidence: p.evidence })),
        aesthetics: Object.fromEntries(Object.entries(c.aesthetics).map(([k, v]) => [k, v.value])),
        structure: { density: c.structure.density.value },
        consensus: true,
      };
    }
    return d.labels[source];
  };

  const dimText = (p) => Object.entries(p.dims ?? {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('+') : v}`).join(' · ');

  const draw = () => {
    document.querySelectorAll('#srcs button').forEach((b) => b.classList.toggle('on', b.dataset.src === source));
    const l = current();
    if (!l) { ov.innerHTML = ''; document.getElementById('side').innerHTML = '<p class="muted">No label.</p>'; return; }
    const pct = (b) => `left:${(b.x / W) * 100}%;top:${(b.y / H) * 100}%;width:${(b.width / W) * 100}%;height:${(b.height / H) * 100}%`;
    let html = '';
    if (showRegions) for (const r of l.regions) html += `<div class="bx region" data-k="r:${esc(r.id)}" style="${pct(r.bbox)}"><span class="tag">${esc(r.id)}</span></div>`;
    if (showPatterns) {
      for (const p of l.patterns.filter((p) => p.status !== 'absent')) {
        p.evidence.forEach((e, i) => {
          if (!e.bbox) return;
          html += `<div class="bx" data-k="p:${esc(p.id)}" data-i="${i}" style="${pct(e.bbox)}"><span class="tag">${esc(p.id)}</span></div>`;
        });
      }
    }
    ov.innerHTML = html;
    document.getElementById('shot').classList.toggle('show-tags', tags);

    const byRegion = new Map(l.regions.map((r) => [r.id, []]));
    const loose = [];
    for (const p of l.patterns) {
      const rs = l.regions.filter((r) => r.patterns.includes(p.id));
      if (rs.length) rs.forEach((r) => byRegion.get(r.id).push(p)); else loose.push(p);
    }
    const item = (p) => `<li data-k="p:${esc(p.id)}">
        <div class="row" style="gap:8px"><span class="pid">${esc(p.id)}</span>
          <span class="small muted">${esc(byId.get(p.id)?.level ?? '?')}</span><span class="spacer"></span>
          <span class="small">${esc(p.status)}</span><span class="conf" title="confidence ${fmt(p.confidence)}"><b style="width:${p.confidence * 100}%"></b></span>
          ${p.support !== undefined ? `<span class="small muted" title="raters agreeing">${p.support}/${p.raters}</span>` : ''}</div>
        ${dimText(p) ? `<div class="dims">${esc(dimText(p))}</div>` : ''}
        ${p.ties?.length ? `<div class="small" style="color:var(--serious)">no majority: ${p.ties.map(esc).join(', ')}</div>` : ''}
      </li>`;
    document.getElementById('side').innerHTML = `
      ${l.consensus ? `<p class="small muted" style="margin-top:0">Majority vote across raters. Region boxes come from ${esc(Object.keys(d.labels)[0] ?? '—')}.</p>` : `<p class="small muted" style="margin-top:0">${esc(l.model?.name)}${l.model?.servedBy?.some((m) => m !== l.model.name) ? ` <span class="chip warn">served by ${esc(l.model.servedBy.join(', '))}</span>` : ''} · codebook ${esc(l.codebookVersion)} · ${l.model?.turns ?? '?'} turns</p>`}
      ${l.regions.map((r) => `<h3 data-k="r:${esc(r.id)}" style="cursor:pointer">${esc(r.id)} <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· ${esc(r.label ?? r.role ?? '')}</span></h3>
        <ul class="plist">${byRegion.get(r.id).map(item).join('') || '<li class="muted small">no codebook patterns</li>'}</ul>`).join('')}
      ${loose.length ? `<h3>Not placed in a region</h3><ul class="plist">${loose.map(item).join('')}</ul>` : ''}`;

    // aesthetics
    const a = l.aesthetics ?? {};
    document.getElementById('aest').innerHTML = `<h2>Structure &amp; aesthetics <span class="muted small">(${esc(source)})</span></h2>
      ${a.palette ? `<div class="row" style="margin-bottom:10px">${a.palette.map((c) => `<span title="${esc(c)}" class="swatch" style="background:${esc(c)}"></span>`).join('')}</div>` : ''}
      <dl class="kv">
        ${l.structure?.layout ? `<dt>layout</dt><dd>${esc(l.structure.layout)}</dd>` : ''}
        <dt>density</dt><dd>${esc(l.structure?.density)}</dd>
        ${['shape', 'elevation', 'borders', 'iconStyle', 'whitespace', 'backgroundTreatment'].map((k) => `<dt>${k}</dt><dd>${esc(a[k])}</dd>`).join('')}
        ${a.colorRoles ? `<dt>color roles</dt><dd>${Object.entries(a.colorRoles).map(([k, v]) => `<span class="swatch" style="background:${esc(v)};width:12px;height:12px"></span> ${esc(k)} <span class="mono small">${esc(v)}</span>`).join('<br>')}</dd>` : ''}
        ${a.typography ? `<dt>typography</dt><dd>${esc(a.typography)}</dd>` : ''}
        ${a.typeScale ? `<dt>type scale</dt><dd>${esc(a.typeScale)}</dd>` : ''}
        ${a.imagery ? `<dt>imagery</dt><dd>${a.imagery.map(esc).join(', ')}</dd>` : ''}
        ${a.mood ? `<dt>mood</dt><dd>${a.mood.map(esc).join(', ')}</dd>` : ''}
        ${l.site?.domain ? `<dt>domain</dt><dd>${esc(l.site.domain)}${l.site.domainNote ? ` — ${esc(l.site.domainNote)}` : ''}</dd>` : ''}
        ${l.notes ? `<dt>notes</dt><dd>${esc(l.notes)}</dd>` : ''}
      </dl>`;
  };

  // agreement panel
  const ag = d.agreement;
  document.getElementById('agree').innerHTML = ag ? `<h2>Agreement <span class="muted small">score ${fmt(ag.score)} · pattern-status α ${fmt(ag.patternStatusAlpha, 3)}</span></h2>
    ${ag.disagreements.length ? `<table><thead><tr><th>Field</th><th>Unit</th>${ag.raters.map((r) => `<th>${esc(r)}</th>`).join('')}</tr></thead><tbody>
      ${ag.disagreements.map((x) => `<tr><td class="small">${esc(x.field)}</td><td class="mono small">${x.field.startsWith('pattern') ? `<a href="#/codebook/${esc(x.unit)}">${esc(x.unit)}</a>` : '—'}</td>${ag.raters.map((r) => `<td class="mono small">${esc(x.values[r] ?? '·')}</td>`).join('')}</tr>`).join('')}
    </tbody></table>` : '<p class="muted">All raters agree on every compared field.</p>'}
    ${ag.missing.length ? `<p class="small err">Missing labels: ${ag.missing.map(esc).join(', ')}</p>` : ''}` : `<h2>Agreement</h2><p class="muted">Needs at least two rater labels.</p>`;

  // interaction
  const hot = (k, on) => {
    ov.querySelectorAll('.bx').forEach((b) => { b.classList.toggle('hot', on && b.dataset.k === k); b.classList.toggle('dim', on && b.dataset.k !== k); });
    document.querySelectorAll('#side [data-k]').forEach((li) => li.classList.toggle('hot', on && li.dataset.k === k));
  };
  ov.addEventListener('mousemove', (e) => {
    // smallest box under the pointer wins
    const boxes = [...ov.querySelectorAll('.bx')].filter((b) => { const r = b.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
    if (!boxes.length) { hot(null, false); hideTip(); return; }
    boxes.sort((a, b) => a.offsetWidth * a.offsetHeight - b.offsetWidth * b.offsetHeight);
    const b = boxes[0];
    hot(b.dataset.k, true);
    const [kind, id] = [b.dataset.k.slice(0, 1), b.dataset.k.slice(2)];
    const l = current();
    if (kind === 'r') {
      const r = l.regions.find((x) => x.id === id);
      showTip(e, `<div class="t">region · ${esc(id)}</div><div>${esc(r?.label ?? '')}</div><div class="small">${(r?.patterns ?? []).map(esc).join(', ')}</div>`);
    } else {
      const p = l.patterns.find((x) => x.id === id);
      const ev = p?.evidence?.[Number(b.dataset.i)] ?? {};
      showTip(e, `<div class="t">${esc([id, dimText(p)].filter(Boolean).join(' · '))}</div>
        <div class="small">${esc(p.status)} · confidence ${fmt(p.confidence)}${ev.rater ? ` · ${esc(ev.rater)}` : ''}${ev.region ? ` · in ${esc(ev.region)}` : ''}</div>
        ${ev.quote ? `<div class="q">“${esc(ev.quote)}”</div>` : ''}${ev.note ? `<div class="q">${esc(ev.note)}</div>` : ''}${p.rationale ? `<div class="q">${esc(p.rationale)}</div>` : ''}`);
    }
  });
  ov.addEventListener('mouseleave', () => { hot(null, false); hideTip(); });
  const side = document.getElementById('side');
  side.addEventListener('mouseover', (e) => { const li = e.target.closest('[data-k]'); if (li) hot(li.dataset.k, true); });
  side.addEventListener('mouseleave', () => hot(null, false));
  side.addEventListener('click', (e) => {
    const li = e.target.closest('[data-k]');
    const box = li && ov.querySelector(`.bx[data-k="${CSS.escape(li.dataset.k)}"]`);
    box?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  document.getElementById('srcs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { source = b.dataset.src; draw(); } });
  document.getElementById('t-reg').addEventListener('change', (e) => { showRegions = e.target.checked; draw(); });
  document.getElementById('t-pat').addEventListener('change', (e) => { showPatterns = e.target.checked; draw(); });
  document.getElementById('t-tag').addEventListener('change', (e) => { tags = e.target.checked; draw(); });
  draw();
}

function showTip(e, html) {
  tip.innerHTML = html;
  tip.hidden = false;
  const pad = 14, r = tip.getBoundingClientRect();
  tip.style.left = `${Math.min(innerWidth - r.width - 8, e.clientX + pad)}px`;
  tip.style.top = `${e.clientY + pad + r.height > innerHeight ? e.clientY - r.height - pad : e.clientY + pad}px`;
}
function hideTip() { tip.hidden = true; }

// ---------------------------------------------------------------- codebook

async function viewCodebook(id) {
  const cb = await codebook();
  const { proposals } = await api('/api/proposals');
  const usage = cb.usage;
  const maxSites = Math.max(1, ...Object.values(usage.patterns).map((u) => u.sites));
  let level = '', q = '', sort = 'archetype';
  app.innerHTML = `
    <div class="row"><h1>Codebook ${esc(cb.version)}</h1><span class="muted small">${cb.entries.length} entries · usage from ${usage.sites} labeled site(s) (consensus)</span></div>
    <div class="cb" style="margin-top:14px">
      <div class="card">
        <div class="row" style="margin-bottom:8px">
          <input type="search" id="cq" placeholder="Search patterns…" style="flex:1">
          <select id="cl"><option value="">All levels</option><option>archetype</option><option>pattern</option><option>component</option></select>
          <select id="cs"><option value="archetype">By archetype</option><option value="usage">By usage</option><option value="name">By name</option></select>
        </div>
        <div class="cblist" id="cblist"></div>
      </div>
      <div class="card" id="cbdetail"></div>
    </div>`;
  const list = () => {
    let es = cb.entries.filter((e) => (!level || e.level === level) && (!q || `${e.id} ${e.name} ${e.aliases.join(' ')} ${e.definition}`.toLowerCase().includes(q)));
    if (sort === 'usage') es = [...es].sort((a, b) => (usage.patterns[b.id]?.sites ?? 0) - (usage.patterns[a.id]?.sites ?? 0));
    if (sort === 'name') es = [...es].sort((a, b) => a.name.localeCompare(b.name));
    document.getElementById('cblist').innerHTML = es.map((e) => {
      const n = usage.patterns[e.id]?.sites ?? 0;
      const open = proposals.filter((p) => p.proposal.id === e.id && p.proposal.status === 'open').length;
      return `<div class="item ${e.id === id ? 'on' : ''}" data-id="${esc(e.id)}">
        <div><span class="mono">${esc(e.id)}</span>${e.deprecated ? ' <span class="chip">deprecated</span>' : ''}${open ? ` <span class="chip warn" title="open proposals">+${open}</span>` : ''}<div class="small muted">${esc(e.level)}${e.parent ? ` · ${esc(e.parent)}` : ''}</div></div>
        <div class="ubar" title="${n} site(s)"><b style="width:${(n / maxSites) * 100}%"></b></div><div class="small num">${n}</div></div>`;
    }).join('') || '<div class="muted empty">No matches</div>';
  };
  document.getElementById('cq').addEventListener('input', (e) => { q = e.target.value.toLowerCase(); list(); });
  document.getElementById('cl').addEventListener('change', (e) => { level = e.target.value; list(); });
  document.getElementById('cs').addEventListener('change', (e) => { sort = e.target.value; list(); });
  document.getElementById('cblist').addEventListener('click', (e) => { const it = e.target.closest('[data-id]'); if (it) location.hash = `#/codebook/${it.dataset.id}`; });
  list();

  const e = cb.entries.find((x) => x.id === id) ?? cb.entries[0];
  const u = usage.patterns[e.id];
  const props = proposals.filter((p) => p.proposal.id === e.id);
  document.getElementById('cbdetail').innerHTML = `
    <div class="row" style="align-items:flex-start">
      <div style="flex:1;min-width:260px">
        <div class="small muted">${esc(e.level)}${e.parent ? ` · <a href="#/codebook/${esc(e.parent)}">${esc(e.parent)}</a>` : ''} · added in ${esc(e.addedIn)}</div>
        <h1>${esc(e.name)} <span class="mono muted" style="font-size:14px">${esc(e.id)}</span></h1>
        ${e.deprecated ? `<p class="err">Deprecated — replaced by <a href="#/codebook/${esc(e.replacedBy)}">${esc(e.replacedBy)}</a></p>` : ''}
        <p>${esc(e.definition)}</p>
        ${e.aliases.length ? `<p class="small muted">Also called: ${e.aliases.map(esc).join(', ')}</p>` : ''}
        <p class="small">${u ? `Present on <b>${u.sites}</b> labeled site(s)${u.uncertain ? `, uncertain on ${u.uncertain}` : ''}.` : 'Not yet observed in the dataset.'}</p>
      </div>
      ${e.previews[0] ? `<div class="preview"><img src="/files/dist/${esc(e.previews[0].path)}" alt="${esc(e.name)} diagram"></div>` : ''}
    </div>
    ${e.anatomy.length ? `<h3>Anatomy</h3><ul>${e.anatomy.map((a) => `<li><b>${esc(a.name)}</b> — ${esc(a.role)}</li>`).join('')}</ul>` : ''}
    <h3>Dimensions</h3>
    ${e.dimensions.map((d) => `<div style="margin-bottom:14px"><div><b>${esc(d.name)}</b> <span class="chip">${esc(d.family)}</span> <span class="muted small">${esc(d.question)}</span></div>
      ${d.subdimensions.map((s) => {
        const counts = u?.values?.[s.id] ?? {};
        const mx = Math.max(1, ...Object.values(counts));
        return `<div style="margin:8px 0 0 12px"><div class="small"><span class="mono">${esc(s.id)}</span> · ${esc(s.name)} · <i>${s.select === 'many' ? 'multi-select' : 'single-select'}</i></div>
          <div class="values" style="margin-top:4px">${s.values.map((v) => `<div title="${esc(v.description ?? '')}"><span class="mono small">${esc(v.id)}</span>${v.example ? ` <span class="muted small">e.g. ${esc(v.example)}</span>` : ''}</div>
            <div class="ubar"><b style="width:${((counts[v.id] ?? 0) / mx) * 100}%"></b></div><div class="small num">${counts[v.id] ?? 0}</div>`).join('')}</div></div>`;
      }).join('')}</div>`).join('')}
    ${Object.entries(e.relations).some(([, v]) => v.length) ? `<h3>Related</h3><div class="chips">${Object.entries(e.relations).flatMap(([k, v]) => v.map((r) => `<a class="chip" href="#/codebook/${esc(r)}">${esc(k)}: ${esc(r)}</a>`)).join('')}</div>` : ''}
    ${u?.where?.length ? `<h3>Seen on</h3><div class="chips">${u.where.map((w) => `<a class="chip" href="#/site/${esc(w.batch)}/${esc(w.slug)}">${esc(w.slug)}</a>`).join('')}</div>` : ''}
    ${props.length ? `<h3>Proposals</h3>${props.map((p) => `<div class="small"><a href="#/proposals">${esc(p.batch)}/${esc(p.proposal.id)}</a> · ${esc(p.proposal.kind)} · ${esc(p.proposal.status)}</div>`).join('')}` : ''}
    <h3>Sources</h3><ul class="small">${e.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a> ` : ''}${s.paper ? `paper ${esc(s.paper)} ` : ''}${s.site ? `${esc(s.batch)}/${esc(s.site)} ` : ''}${esc(s.note ?? '')}</li>`).join('')}</ul>`;
}

// --------------------------------------------------------------- proposals

async function viewProposals() {
  const { proposals } = await api('/api/proposals');
  let filter = 'open';
  const render = () => {
    const rows = proposals.filter((r) => filter === 'all' || r.proposal.status === filter);
    app.innerHTML = `
      <div class="row"><h1>Proposals</h1><span class="muted small">Filed by raters during batches; the codebook only changes when one is accepted here (between batches).</span>
        <div class="spacer"></div><div class="tabs">${['open', 'accepted', 'rejected', 'all'].map((f) => `<button data-f="${f}" class="${f === filter ? 'on' : ''}">${f}</button>`).join('')}</div></div>
      <div class="stack" style="margin-top:14px">${rows.map(proposalCard).join('') || `<div class="card empty">No ${filter === 'all' ? '' : filter} proposals.</div>`}</div>`;
    app.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; render(); }));
    app.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.batch, b.dataset.id, b.dataset.act)));
  };
  const act = async (batch, id, action) => {
    const note = action === 'reject' ? prompt(`Why reject ${id}?`) : prompt(`Accept ${id} into the codebook? Optional note:`, '');
    if (note === null || (action === 'reject' && !note.trim())) return;
    try {
      const r = await api(`/api/proposals/${encodeURIComponent(batch)}/${encodeURIComponent(id)}/${action}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note }) });
      if (r.message) alert(r.message);
      codebookCache = undefined;
      viewProposals();
    } catch (e) {
      alert(e.message);
    }
  };
  render();
}

function proposalCard({ batch, proposal: p }) {
  const vals = p.dimensions.flatMap((d) => d.subdimensions.map((s) => `<div class="small"><span class="mono">${esc(s.id)}</span>${s.name ? ` (${esc(s.name)})` : ''}: ${s.values.map((v) => `<b class="mono">${esc(v.id)}</b> ${esc(v.name)}${v.description ? ` — <span class="muted">${esc(v.description)}</span>` : ''}`).join('; ')}</div>`)).join('');
  const crops = p.evidence.filter((e) => e.bbox).slice(0, 4).map((e) => {
    const scale = Math.min(260 / e.bbox.width, 140 / e.bbox.height, 1);
    return `<a href="#/site/${esc(batch)}/${esc(e.site)}" title="${esc(e.site)} · ${esc(e.rater)}${e.quote ? ` · “${esc(e.quote)}”` : ''}"><div class="crop" style="background-image:url('/files/dataset/${esc(batch)}/sites/${esc(e.site)}/capture/screenshot.png');background-size:${1440 * scale}px auto;background-position:${-e.bbox.x * scale}px ${-e.bbox.y * scale}px;width:${Math.max(40, e.bbox.width * scale)}px;height:${Math.max(30, e.bbox.height * scale)}px"></div></a>`;
  }).join('');
  return `<div class="card prop ${esc(p.status)}">
    <div class="row"><span class="mono" style="font-weight:600">${esc(p.id)}</span><span class="chip">${esc(p.kind)}</span><span class="small muted">${esc(batch)} · codebook ${esc(p.codebookVersion)} · ${p.rationale.length} filing(s)</span>
      <div class="spacer"></div>${p.status === 'open' ? `<button data-act="reject" data-batch="${esc(batch)}" data-id="${esc(p.id)}">Reject</button><button class="primary" data-act="accept" data-batch="${esc(batch)}" data-id="${esc(p.id)}">Accept</button>` : `<span class="small">${esc(p.status)}${p.review?.mergedInto ? ` in ${esc(p.review.mergedInto)}` : ''}${p.review?.note ? ` — ${esc(p.review.note)}` : ''}</span>`}</div>
    ${p.kind === 'new-entry' ? `<p><b>${esc(p.name)}</b> <span class="small muted">${esc(p.level)}${p.parent ? ` · ${esc(p.parent)}` : ''}</span> — ${esc(p.definition)}</p>` : `<p class="small">New values for <a href="#/codebook/${esc(p.id)}">${esc(p.id)}</a></p>`}
    ${vals}
    <h3>Rationale</h3>${p.rationale.map((r) => `<p class="small" style="margin:4px 0"><span class="mono muted">${esc(r.rater)} @ ${esc(r.site)}</span> ${esc(r.text)}</p>`).join('')}
    <h3>Found on</h3><div class="chips">${p.sources.map((s) => `<a class="chip" href="#/site/${esc(s.batch)}/${esc(s.site)}">${esc(s.site)}</a>`).join('')}</div>
    ${crops ? `<div class="row" style="margin-top:10px">${crops}</div>` : ''}
  </div>`;
}
