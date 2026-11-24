import './styles.css';
import { BUILDS, CURRENT_BUILD, SESSION, DB_STATS } from './data/session.js';
import { buildCorpus } from './data/corpus.js';
import {
  buildIndex, search, makeContext, analyze, CONCEPT_LABEL, STATUS_LABEL,
} from './search/engine.js';

const PLATFORMS = ['PS5', 'Xbox Series', 'PC'];
const SEVERITIES = ['S1', 'S2', 'S3', 'S4'];
const STATUSES = ['open', 'fixed', 'cant-repro', 'duplicate'];
const SORTS = [
  ['relevance', 'Relevance'],
  ['recent', 'Last seen build'],
  ['dupes', 'Most duplicates'],
];
const PAGE = 50;
const CHIP_ORDER = ['MAP', 'WX', 'FT', 'COOP', 'CRASH', 'ps5', 'xbox', 'pc'];
const ACTIONABLE = ['reopen', 'repro', 'follow'];

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => Number(n).toLocaleString('en-US');
const pill = (status) => `<span class="pill st-${status}">${esc(STATUS_LABEL[status])}</span>`;

// ---- Data -----------------------------------------------------------------

const records = buildCorpus(BUILDS);
const index = buildIndex(records, BUILDS);
const idxById = new Map(records.map((r, i) => [r.id, i]));

// ---- State ----------------------------------------------------------------

const state = {
  query: SESSION.description,
  includeSig: true,
  statuses: new Set(STATUSES),
  platforms: new Set(PLATFORMS),
  severities: new Set(SEVERITIES),
  minBuild: '',
  onlySig: false,
  onlyClips: false,
  sortBy: 'relevance',
  limit: PAGE,
  selected: null,
  decision: null, // { kind: 'reopen' | 'repro' | 'related' | 'new', target: string | null }
  edits: new Map(), // draftKey -> user-edited draft text
  ctx: null,
  result: null,
  scrollDetail: false,
};

// ---- Search and selection -------------------------------------------------

function runSearch() {
  state.ctx = makeContext({
    query: state.query,
    dumpSig: SESSION.signature,
    platform: SESSION.platform,
    currentBuild: CURRENT_BUILD,
    builds: BUILDS,
  });
  state.result = search(index, state.query, {
    statuses: state.statuses,
    platforms: state.platforms,
    severities: state.severities,
    minBuildIdx: state.minBuild ? BUILDS.indexOf(state.minBuild) : -1,
    onlySig: state.onlySig,
    onlyClips: state.onlyClips,
    includeSig: state.includeSig,
    dumpSig: SESSION.signature,
    sortBy: state.sortBy,
  });
  const list = state.result.results;
  const cur = idxById.get(state.selected);
  if (cur === undefined || !list.includes(cur)) {
    selectRecord(list.length ? records[list[0]].id : null);
  }
}

function primaryOf(r) {
  // Where a repro or reopen should go: a duplicate's canonical report, otherwise the report itself.
  if (r.status === 'duplicate' && r.duplicateOf && idxById.has(r.duplicateOf)) {
    return records[idxById.get(r.duplicateOf)];
  }
  return r;
}

function defaultDecision(r, a) {
  if (a.sug.kind === 'related') return { kind: 'related', target: r.id };
  if (a.sug.kind === 'none') return { kind: 'new', target: null };
  const pt = primaryOf(r);
  return { kind: pt.status === 'open' ? 'repro' : 'reopen', target: pt.id };
}

function selectRecord(id) {
  state.selected = id;
  state.scrollDetail = true;
  if (!id) {
    state.decision = null;
    return;
  }
  const r = records[idxById.get(id)];
  state.decision = defaultDecision(r, analyze(r, state.ctx));
}

function draftKey(d) {
  return `${d.kind}|${d.target ?? ''}`;
}

function decisionOptions(r, pt) {
  const st = STATUS_LABEL[pt.status].toLowerCase();
  const reopenable = pt.status === 'fixed' || pt.status === 'cant-repro';
  return [
    {
      kind: 'repro',
      target: pt.id,
      label: `Add repro to ${pt.id}`,
      enabled: pt.status === 'open',
      note: pt.status === 'open' ? 'Attach your dump, clip and steps' : `Unavailable: ${pt.id} is ${st}. Reopen it instead.`,
    },
    {
      kind: 'reopen',
      target: pt.id,
      label: `Reopen ${pt.id}`,
      enabled: reopenable,
      note: reopenable
        ? 'Use when the crash returns after a fix, or a closed report has new evidence'
        : `Unavailable: ${pt.id} is ${st}. Add a repro instead.`,
    },
    {
      kind: 'related',
      target: r.id,
      label: `Link ${r.id} as related`,
      enabled: true,
      note: 'Keeps both reports open. Use when the platform or symptom differs',
    },
    {
      kind: 'new',
      target: null,
      label: 'File a new report',
      enabled: true,
      note: 'Use when no report covers this symptom',
    },
  ];
}

// ---- Draft text -----------------------------------------------------------

function sessionLines() {
  const s = SESSION;
  return [
    `Build ${CURRENT_BUILD} · ${s.platform} · devkit ${s.devkit} · tester ${s.tester.id}`,
    `Crash dump: ${s.dumpId} (captured ${s.capturedAt})`,
    `Signature: ${s.signature}`,
    `Clip: ${s.clip.duration}, attached`,
    'Session: 4-player co-op, rainstorm active. A teammate was fast travelling when I opened the world map; the client crashed to the dashboard.',
    'Repro rate: 1 of 1 attempts this session.',
  ];
}

function stepLines() {
  return [
    'Steps to reproduce:',
    `1. Start a 4-player co-op session on ${SESSION.devkit} (build ${CURRENT_BUILD}) during a rainstorm.`,
    '2. Have a teammate start a fast travel.',
    '3. Open the world map while the fast travel is in progress.',
    'Expected: the world map opens with the weather overlay.',
    'Actual: the client crashes to the dashboard. Dump and clip attached.',
  ];
}

function buildDraft(kind, r, pt, a) {
  if (kind === 'reopen') {
    const lead = a.sameSig ? 'The same crash signature' : 'The same conditions';
    const fixed = pt.fixedIn ? `, after the fix in ${pt.fixedIn}, so this looks like a regression` : '';
    const closed = pt.status === 'cant-repro' ? " It was closed as can't reproduce; this dump and clip are new evidence." : '';
    return [
      `Reopening ${pt.id}. ${lead} reproduces on ${CURRENT_BUILD}${fixed}.${closed}`,
      '',
      ...sessionLines(),
      '',
      ...stepLines(),
    ].join('\n');
  }
  if (kind === 'repro') {
    const dupNote = pt.id !== r.id ? ` (${r.id} is marked as a duplicate of it)` : '';
    const sigNote = a.sameSig
      ? 'Same crash signature.'
      : 'Same trigger conditions. My repro ends in a crash; the existing report describes a different symptom, so please compare before merging.';
    return [`Additional repro for ${pt.id}${dupNote}. ${sigNote}`, '', ...sessionLines(), '', ...stepLines()].join('\n');
  }
  if (kind === 'related') {
    return [`Related to ${r.id}, not a duplicate. ${a.sug.reason}`, '', ...sessionLines()].join('\n');
  }
  const checked = state.result.results.slice(0, 3).map((i) => {
    const x = analyze(records[i], state.ctx).sug;
    return `${records[i].id} (${x.label.toLowerCase()})`;
  });
  return [
    'Title: Client crash opening world map during rainstorm while a teammate fast travels (PS5)',
    '',
    ...sessionLines(),
    '',
    ...stepLines(),
    '',
    `Reports checked before filing: ${checked.length ? checked.join(', ') : 'none'}.`,
  ].join('\n');
}

// ---- Rendering ------------------------------------------------------------

// Replace an element's HTML while keeping keyboard focus (via data-key) and scroll position.
function paint(el, html) {
  const active = document.activeElement;
  const key = active && el.contains(active) && active.dataset ? active.dataset.key : undefined;
  const scroll = el.scrollTop;
  el.innerHTML = html;
  el.scrollTop = scroll;
  if (key) {
    const next = [...el.querySelectorAll('[data-key]')].find((n) => n.dataset.key === key);
    if (next) next.focus({ preventScroll: true });
  }
}

function renderSession() {
  $('#session').innerHTML = `
    <div class="sess"><span class="k">Dump</span><code>${esc(SESSION.dumpId)}</code><span class="muted">captured ${esc(SESSION.capturedAt)}</span></div>
    <div class="sess grow"><span class="k">Signature</span><code class="sig">${esc(SESSION.signature)}</code></div>
    <div class="sess"><span class="k">Session</span>${esc(SESSION.sessionType)} · rain · ${esc(SESSION.devkit)}</div>
    <div class="sess"><span class="k">Clip</span>${esc(SESSION.clip.duration)} attached</div>
    <div class="sess"><span class="k">Tester</span>${esc(SESSION.tester.id)}</div>`;
}

function renderFilters() {
  const sc = state.result.statusCounts;
  const check = (filter, value, label, checked, count) => `
    <label class="check">
      <input type="checkbox" data-filter="${filter}" data-value="${esc(value)}" data-key="${filter}:${esc(value)}" ${checked ? 'checked' : ''} />
      <span>${esc(label)}</span>${count === undefined ? '' : `<em>${fmt(count)}</em>`}
    </label>`;
  const toggle = (name, label, checked) => `
    <label class="check">
      <input type="checkbox" data-toggle="${name}" data-key="${name}" ${checked ? 'checked' : ''} />
      <span>${esc(label)}</span>
    </label>`;

  paint($('#filters'), `
    <div class="fhead"><h2>Filters</h2><button class="link" data-reset>Reset</button></div>
    <div class="fgroup">
      <h3>Status <span class="muted">counts in current matches</span></h3>
      ${STATUSES.map((s) => check('status', s, STATUS_LABEL[s], state.statuses.has(s), sc[s])).join('')}
    </div>
    <div class="fgroup">
      <h3>Platform</h3>
      ${PLATFORMS.map((p) => check('platform', p, p, state.platforms.has(p))).join('')}
    </div>
    <div class="fgroup">
      <h3>Severity</h3>
      ${SEVERITIES.map((s) => check('severity', s, s, state.severities.has(s))).join('')}
    </div>
    <div class="fgroup">
      <h3>Seen in build</h3>
      <select id="minBuild" data-key="minBuild" aria-label="Seen in build or later">
        <option value="">Any build</option>
        ${BUILDS.map((b) => `<option value="${b}" ${state.minBuild === b ? 'selected' : ''}>${b} or later${b === CURRENT_BUILD ? ' (current only)' : ''}</option>`).join('')}
      </select>
    </div>
    <div class="fgroup">
      <h3>Only reports with</h3>
      ${toggle('onlySig', 'Crash signature', state.onlySig)}
      ${toggle('onlyClips', 'Attached clip', state.onlyClips)}
    </div>
    <p class="fnote">Searching ${fmt(records.length)} reports. Built-in example data, not the live tracker.</p>
  `);
}

function renderBanner() {
  const list = state.result.results;
  let rec = null;
  for (const i of list.slice(0, 10)) {
    const a = analyze(records[i], state.ctx);
    if (ACTIONABLE.includes(a.sug.kind)) {
      rec = { r: records[i], a };
      break;
    }
  }

  let html;
  if (rec) {
    const { r, a } = rec;
    html = `
      <div class="banner kind-${a.sug.kind}">
        <div class="banner-top">
          <span class="banner-k">Most likely match</span>
          <span class="chip-kind kind-${a.sug.kind}">${esc(a.sug.label)}</span>
        </div>
        <div class="banner-t"><button class="link strong" data-select="${esc(r.id)}">${esc(r.id)}</button> · ${esc(r.title)}</div>
        <p>${esc(a.sug.reason)}</p>
      </div>`;
  } else if (list.length === 0) {
    html = `
      <div class="banner banner-neutral">
        <div class="banner-t">No reports match this search.</div>
        <p>Remove a word or clear filters. If nothing covers the symptom after that, file a new report.</p>
      </div>`;
  } else {
    html = `
      <div class="banner banner-neutral">
        <div class="banner-t">No report carries this crash signature.</div>
        <p>Review the related reports below. File a new report only if none of them cover the symptom.</p>
      </div>`;
  }
  paint($('#banner'), html);
}

function card(i) {
  const r = records[i];
  const a = analyze(r, state.ctx);
  const sel = r.id === state.selected;
  const order = (t) => {
    const k = CHIP_ORDER.indexOf(t);
    return k < 0 ? 99 : k;
  };
  const chips = [...a.matched]
    .sort((x, y) => order(x) - order(y))
    .slice(0, 5)
    .map((t) => `<span class="chip">${esc(CONCEPT_LABEL[t] ?? t)}</span>`);
  if (a.sameSig) chips.unshift('<span class="chip chip-sig">same crash signature</span>');

  return `
    <li>
      <button class="card${sel ? ' is-sel' : ''}" data-select="${esc(r.id)}" data-key="card:${esc(r.id)}" aria-current="${sel}">
        <span class="card-top">
          <span class="rid">${esc(r.id)}</span>${pill(r.status)}
          <span class="sev sev-${r.severity}">${r.severity}</span>
          <span class="dupes">${fmt(r.dupes)} dup${r.dupes === 1 ? '' : 's'}</span>
        </span>
        <span class="card-title">${esc(r.title)}</span>
        <span class="card-meta">
          ${r.platforms.map((p) => `<span class="plat">${esc(p)}</span>`).join('')}
          <span class="builds">${esc(r.firstBuild)} → ${esc(r.lastBuild)}</span>
        </span>
        <span class="chips">${chips.join('')}</span>
        <span class="card-sugg kind-${a.sug.kind}">${esc(a.sug.label)}</span>
      </button>
    </li>`;
}

function renderResults() {
  const { results, total } = state.result;
  const shown = results.slice(0, state.limit);
  paint($('#resultsHead'), `
    <div class="rhead">
      <div><strong>${fmt(total)}</strong> ${total === 1 ? 'match' : 'matches'} <span class="muted">of ${fmt(records.length)} reports</span></div>
      <label class="sort">Sort
        <select id="sort" data-key="sort">
          ${SORTS.map(([v, l]) => `<option value="${v}" ${v === state.sortBy ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </label>
    </div>`);
  paint($('#list'), shown.length
    ? shown.map(card).join('')
    : '<li class="empty">Nothing matches the current search and filters.</li>');
  const left = total - shown.length;
  paint($('#more'), left > 0
    ? `<button class="more" data-more>Show ${fmt(Math.min(PAGE, left))} more (${fmt(left)} left)</button>`
    : '');
}

function renderDetail() {
  const det = $('#detail');
  if (state.scrollDetail) {
    det.scrollTop = 0;
    state.scrollDetail = false;
  }
  const i = idxById.get(state.selected);
  if (i === undefined) {
    paint(det, '<div class="empty-state"><h2>No report selected</h2><p>Widen the filters or change the search to see candidates.</p></div>');
    return;
  }

  const r = records[i];
  const a = analyze(r, state.ctx);
  const pt = primaryOf(r);
  const d = state.decision ?? defaultDecision(r, a);
  const suggestedKind = defaultDecision(r, a).kind;
  const key = draftKey(d);
  const draft = state.edits.has(key) ? state.edits.get(key) : buildDraft(d.kind, r, pt, a);

  const coverage = [
    ['map', a.terms.has('MAP')],
    ['rain / storm', a.terms.has('WX')],
    ['fast travel', a.terms.has('FT')],
    ['co-op', a.terms.has('COOP')],
    ['crash', a.terms.has('CRASH')],
    ['PS5', r.platforms.includes(SESSION.platform)],
  ];

  const sigHtml = !r.signature
    ? '<span class="muted">None recorded (symptom only)</span>'
    : a.sameSig
      ? '<span class="ok">Matches your dump</span>'
      : `<span class="warn">Different:</span> <code>${esc(r.signature)}</code>`;
  const platHtml = r.platforms.includes(SESSION.platform)
    ? `<span class="ok">PS5 reported</span> · ${esc(r.platforms.join(', '))}`
    : `<span class="warn">Not reported on PS5</span> · ${esc(r.platforms.join(', '))}`;
  const buildBits = [`last seen ${r.lastBuild}`, `you are on ${CURRENT_BUILD}`];
  if (r.fixedIn) buildBits.push(`fixed in ${r.fixedIn}`);
  const regress = a.sameSig && r.status === 'fixed' ? ' · <span class="warn">crash returns after the fix</span>' : '';
  const buildHtml = `${esc(buildBits.join(', '))}${regress}`;

  const meta = [
    ['Severity', r.severity],
    ['Reporter', r.reporter],
    ['Team', r.team],
    ['First seen', r.firstBuild],
    ['Last seen', r.lastBuild],
    ['Fixed in', r.fixedIn ?? '—'],
    ['Linked duplicates', fmt(r.dupes)],
    ['Clips attached', fmt(r.clips)],
  ];
  if (r.duplicateOf) {
    meta.push(['Duplicate of', `<button class="link" data-select="${esc(r.duplicateOf)}">${esc(r.duplicateOf)}</button>`]);
  }

  const options = decisionOptions(r, pt)
    .map((o) => {
      const on = o.kind === d.kind && (o.target ?? '') === (d.target ?? '');
      return `
        <button class="opt${on ? ' is-on' : ''}" data-kind="${o.kind}" data-target="${esc(o.target ?? '')}"
          data-key="opt:${o.kind}" ${o.enabled ? '' : 'disabled'} aria-pressed="${on}">
          <span class="opt-row"><span class="opt-l">${esc(o.label)}</span>${o.kind === suggestedKind ? '<span class="tag">Suggested</span>' : ''}</span>
          <span class="opt-n">${esc(o.note)}</span>
        </button>`;
    })
    .join('');

  paint(det, `
    <header class="d-head">
      <div class="d-ids">
        <span class="rid">${esc(r.id)}</span>${pill(r.status)}
        <span class="sev sev-${r.severity}">${r.severity}</span>
        ${r.platforms.map((p) => `<span class="plat">${esc(p)}</span>`).join('')}
      </div>
      <h2>${esc(r.title)}</h2>
    </header>

    <section class="sugg kind-${a.sug.kind}">
      <div class="sugg-k">${esc(a.sug.label)}</div>
      <p>${esc(a.sug.reason)}</p>
      <p class="sugg-note">Rule-based suggestion from signature, status, build and trigger overlap. Your call.</p>
    </section>

    <h3>Against your session</h3>
    <dl class="compare">
      <dt>Crash signature</dt><dd>${sigHtml}</dd>
      <dt>Platform</dt><dd>${platHtml}</dd>
      <dt>Build</dt><dd>${buildHtml}</dd>
    </dl>
    <div class="coverage" aria-label="Trigger coverage">
      ${coverage.map(([label, hit]) => `<span class="cov ${hit ? 'yes' : 'no'}">${hit ? '✓' : '✗'} ${esc(label)}</span>`).join('')}
    </div>

    <h3>Report</h3>
    <dl class="meta">
      ${meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${k === 'Duplicate of' ? v : esc(v)}</dd></div>`).join('')}
    </dl>
    <p class="desc">${esc(r.description)}</p>
    ${r.signature ? `<p class="sigline"><span class="muted">Signature</span> <code>${esc(r.signature)}</code></p>` : ''}

    <h3>Your decision</h3>
    <div class="options">${options}</div>

    <label class="draft-label" for="draft">Draft for the tracker</label>
    <textarea id="draft" class="draft" spellcheck="false" rows="13">${esc(draft)}</textarea>
    <div class="draft-foot">
      <button class="btn primary" data-copy>Copy draft</button>
      <button class="btn ghost" data-reset-draft>Reset draft</button>
      <span class="muted">Drafts are not submitted. Paste into the tracker.</span>
    </div>
  `);
}

function renderAll() {
  renderFilters();
  renderBanner();
  renderResults();
  renderDetail();
}

function run({ resetLimit = true } = {}) {
  if (resetLimit) state.limit = PAGE;
  runSearch();
  renderAll();
}

// ---- Interaction ----------------------------------------------------------

function moveSelection(delta) {
  const list = state.result.results;
  if (!list.length) return;
  const cur = list.indexOf(idxById.get(state.selected));
  const next = Math.max(0, Math.min(list.length - 1, cur < 0 ? 0 : cur + delta));
  if (next >= state.limit) state.limit = Math.ceil((next + 1) / PAGE) * PAGE;
  selectRecord(records[list[next]].id);
  renderResults();
  renderDetail();
  document.querySelector('.card.is-sel')?.scrollIntoView({ block: 'nearest' });
}

function resetFilters() {
  state.statuses = new Set(STATUSES);
  state.platforms = new Set(PLATFORMS);
  state.severities = new Set(SEVERITIES);
  state.minBuild = '';
  state.onlySig = false;
  state.onlyClips = false;
  run();
}

async function copyDraft() {
  const area = $('#draft');
  const btn = document.querySelector('[data-copy]');
  if (!area || !btn) return;
  let ok = false;
  try {
    await navigator.clipboard.writeText(area.value);
    ok = true;
  } catch {
    area.select();
    ok = document.execCommand('copy');
  }
  btn.textContent = ok ? 'Copied' : 'Copy failed';
  setTimeout(() => {
    btn.textContent = 'Copy draft';
  }, 1600);
}

function wire() {
  const q = $('#q');
  let timer = 0;
  q.addEventListener('input', () => {
    state.query = q.value;
    clearTimeout(timer);
    timer = setTimeout(() => run(), 60);
  });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && q.value) {
      q.value = '';
      state.query = '';
      run();
    }
  });

  document.addEventListener('click', (e) => {
    const t = e.target;
    const sel = t.closest('[data-select]');
    if (sel) {
      selectRecord(sel.dataset.select);
      renderResults();
      renderDetail();
      return;
    }
    const opt = t.closest('button.opt');
    if (opt && !opt.disabled) {
      state.decision = { kind: opt.dataset.kind, target: opt.dataset.target || null };
      renderDetail();
      return;
    }
    if (t.closest('[data-copy]')) {
      copyDraft();
      return;
    }
    if (t.closest('[data-reset-draft]')) {
      if (state.decision) state.edits.delete(draftKey(state.decision));
      renderDetail();
      return;
    }
    if (t.closest('[data-more]')) {
      state.limit += PAGE;
      renderResults();
      return;
    }
    if (t.closest('[data-reset]')) {
      resetFilters();
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.filter) {
      const set = {
        status: state.statuses,
        platform: state.platforms,
        severity: state.severities,
      }[el.dataset.filter];
      if (el.checked) set.add(el.dataset.value);
      else set.delete(el.dataset.value);
    } else if (el.dataset.toggle) {
      state[el.dataset.toggle] = el.checked;
    } else if (el.id === 'minBuild') {
      state.minBuild = el.value;
    } else if (el.id === 'sort') {
      state.sortBy = el.value;
    } else if (el.id === 'incsig') {
      state.includeSig = el.checked;
    } else {
      return;
    }
    run();
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'draft' && state.decision) {
      state.edits.set(draftKey(state.decision), e.target.value);
    }
  });

  document.addEventListener('keydown', (e) => {
    const el = e.target;
    const isSearch = el.id === 'q';
    const typing = !isSearch && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.tagName === 'INPUT');
    if (typing) return;
    if (e.key === '/') {
      e.preventDefault();
      q.focus();
      q.select();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(e.key === 'ArrowDown' ? 1 : -1);
    }
  });
}

// ---- Boot -----------------------------------------------------------------

function init() {
  $('#dbstats').textContent = `${fmt(DB_STATS.total)} reports · ${fmt(DB_STATS.open)} open`;
  $('#who').textContent = `${SESSION.tester.name} · ${SESSION.tester.id}`;
  $('#q').value = state.query;
  $('#incsig').checked = state.includeSig;
  $('#sigchip').textContent = SESSION.signature;
  renderSession();
  wire();
  run();
}

init();
