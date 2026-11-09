
(() => {
  const body = document.body;
  const atlas = JSON.parse(document.getElementById('atlas-json').textContent);
  const byId = Object.fromEntries(atlas.entries.map(e => [e.id, e]));
  const status = document.getElementById('status');

  function setStatus(msg) {
    if (status) status.textContent = msg;
  }

  function persist(el, name, value) {
    const next = value == null ? '' : String(value);
    if (el.getAttribute(name) === next) return;
    el.setAttribute(name, next);
    const id = window.marble?.id?.(el);
    if (id) window.marble.op({ type:'setAttr', id, name, value: next });
  }

  // For an attribute declared page-only: this tab's business, never filed. The
  // search box is the whole reason it exists — one op per keystroke would fill the
  // history with a word being typed.
  function pageSet(el, name, value) {
    const next = value == null ? '' : String(value);
    if (el.getAttribute(name) === next) return;
    el.setAttribute(name, next);
  }

  function syncChooseAria() {
    document.querySelectorAll('[data-atlas-choose]').forEach(box => {
      const name = box.getAttribute('data-atlas-choose');
      const sel = box.getAttribute('data-marble-of') || 'body';
      const node = box.closest(sel) || body;
      const current = node.getAttribute(name);
      box.querySelectorAll('[data-marble-value]').forEach(btn => {
        btn.setAttribute('aria-pressed', btn.getAttribute('data-marble-value') === current ? 'true' : 'false');
      });
    });
  }

  function entryMatchesFilters(el) {
    const level = body.getAttribute('data-filter-level') || 'all';
    const evidence = body.getAttribute('data-filter-evidence') || 'all';
    const q = (body.getAttribute('data-q') || '').toLowerCase().trim();
    if (level !== 'all' && el.getAttribute('data-level') !== level) return false;
    if (evidence !== 'all' && el.getAttribute('data-evidence') !== evidence) return false;
    if (q) {
      const hay = (
        (el.getAttribute('data-id') || '') + ' ' +
        (el.getAttribute('data-archetype') || '') + ' ' +
        (el.querySelector('h3')?.textContent || '') + ' ' +
        (el.querySelector('.def')?.textContent || '')
      ).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function applyFilters() {
    document.querySelectorAll('.entry').forEach(el => {
      el.classList.toggle('marble-hidden-by-filter', !entryMatchesFilters(el));
    });
    document.querySelectorAll('.lane').forEach(lane => {
      const any = [...lane.querySelectorAll('.entry')].some(e => !e.classList.contains('marble-hidden-by-filter'));
      lane.classList.toggle('marble-hidden-by-filter', !any && body.getAttribute('data-overview') === 'hierarchy');
    });
    const level = body.getAttribute('data-filter-level') || 'all';
    const evidence = body.getAttribute('data-filter-evidence') || 'all';
    const q = (body.getAttribute('data-q') || '').toLowerCase().trim();
    document.querySelectorAll('.map-dot').forEach(dot => {
      const id = dot.getAttribute('data-id');
      const entry = byId[id];
      let ok = !!entry;
      if (ok && level !== 'all' && entry.level !== level) ok = false;
      if (ok && evidence !== 'all' && entry.evidence !== evidence) ok = false;
      if (ok && q) {
        const hay = (entry.id + ' ' + entry.name + ' ' + (entry.def || '') + ' ' + entry.archetype).toLowerCase();
        if (!hay.includes(q)) ok = false;
      }
      dot.classList.toggle('marble-hidden-by-filter', !ok);
    });
    document.querySelectorAll('#matrix-host tbody tr[data-id]').forEach(tr => {
      const card = document.querySelector('.entry[data-id="' + CSS.escape(tr.getAttribute('data-id')) + '"]');
      tr.classList.toggle('marble-hidden-by-filter', card ? card.classList.contains('marble-hidden-by-filter') : false);
    });
  }

  function sortEntries() {
    const key = body.getAttribute('data-sort') || 'archetype';
    document.querySelectorAll('.lane-grid').forEach(grid => {
      const items = [...grid.querySelectorAll(':scope > .entry')];
      items.sort((a, b) => {
        if (key === 'name' || key === 'archetype') {
          return (a.querySelector('h3')?.textContent || '').localeCompare(b.querySelector('h3')?.textContent || '');
        }
        const attr = key === 'gap' ? 'gap' : key === 'size' ? 'vars' : key === 'wild' ? 'wild' : key === 'potential' ? 'potential' : 'id';
        return Number(b.getAttribute('data-' + attr) || 0) - Number(a.getAttribute('data-' + attr) || 0);
      });
      // Order is derived from data-sort, so it goes into a marble- class rather
      // than an inline style. A style attribute is content: the carrier would keep
      // it, and a sort the reader never chose would be in the file.
      items.forEach((el, i) => {
        const want = 'marble-ord-' + i;
        for (const cls of [...el.classList]) {
          if (cls.startsWith('marble-ord-') && cls !== want) el.classList.remove(cls);
        }
        el.classList.add(want);
      });
    });
  }

  function positionMap() {
    const host = document.getElementById('map-host');
    if (!host) return;
    const xKey = body.getAttribute('data-map-x') || 'potential';
    const yKey = body.getAttribute('data-map-y') || 'gap';
    const dots = [...host.querySelectorAll('.map-dot:not(.marble-hidden-by-filter)')];
    const vals = dots.map(d => ({
      d,
      x: Number(d.getAttribute('data-' + xKey) || 0),
      y: Number(d.getAttribute('data-' + yKey) || 0),
    }));
    if (!vals.length) return;
    const xs = vals.map(v => v.x), ys = vals.map(v => v.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const nx = (v) => maxX === minX ? 50 : ((v - minX) / (maxX - minX)) * 86 + 7;
    const ny = (v) => maxY === minY ? 50 : (1 - (v - minY) / (maxY - minY)) * 86 + 7;
    vals.forEach(({ d, x, y }) => {
      d.style.left = nx(x) + '%';
      d.style.top = ny(y) + '%';
      d.classList.add('marble-positioned');
      const name = d.getAttribute('aria-label') || d.getAttribute('data-id');
      d.setAttribute('data-tip', name + ' · ' + xKey + '=' + x + ' · ' + yKey + '=' + y);
      d.setAttribute('aria-label', name);
    });
  }

  function composeSpecFromDom(entryEl) {
    const config = {};
    entryEl.querySelectorAll('.sub').forEach((sub) => {
      const key = sub.getAttribute('data-key');
      const sel = sub.getAttribute('data-sel');
      const pick = sub.getAttribute('data-pick') || '';
      if (!key) return;
      config[key] = sel === 'many' ? pick.split('||').filter(Boolean) : pick;
    });
    const id = entryEl.getAttribute('data-id');
    const entry = byId[id];
    return {
      pattern: id,
      binding: (entry?.roles || []).slice(0, 6).map((r) => ({ id: r, role: r, path: '$.' + r })),
      config,
      compose: [],
      malleability: Object.fromEntries((entry?.dims || []).map((d) => [d.name, true])),
    };
  }

  function refreshSpec(entryEl) {
    const pre = entryEl.querySelector('pre.spec-box');
    if (pre) pre.textContent = JSON.stringify(composeSpecFromDom(entryEl), null, 2);
  }

  function syncPickAria(sub) {
    const sel = sub.getAttribute('data-sel');
    const pick = sub.getAttribute('data-pick') || '';
    const picked = new Set(sel === 'many' ? pick.split('||').filter(Boolean) : [pick]);
    sub.querySelectorAll('.var').forEach((b) => {
      b.setAttribute('aria-pressed', picked.has(b.getAttribute('data-name')) ? 'true' : 'false');
    });
  }

  function setPick(sub, name, toggleMany) {
    const sel = sub.getAttribute('data-sel');
    let next = name;
    if (sel === 'many') {
      const cur = new Set((sub.getAttribute('data-pick') || '').split('||').filter(Boolean));
      if (toggleMany) {
        if (cur.has(name)) cur.delete(name); else cur.add(name);
      } else {
        cur.clear(); cur.add(name);
      }
      if (!cur.size) cur.add(name);
      next = [...cur].join('||');
    }
    persist(sub, 'data-pick', next);
    syncPickAria(sub);
  }

  function clearFocus() {
    persist(body, 'data-focus', '');
    scheduleRederive();
    setStatus('Focus cleared');
  }

  function openEntry(id) {
    if (!id || !byId[id]) {
      setStatus(id ? ('Unknown pattern: ' + id) : 'No pattern id');
      return;
    }
    if (body.getAttribute('data-view') !== 'atlas') persist(body, 'data-view', 'atlas');
    persist(body, 'data-focus', id);
    const entryEl = document.querySelector('.entry[data-id="' + CSS.escape(id) + '"]');
    if (entryEl) refreshSpec(entryEl);
    // Do not autofocus Close — steals focus and fights hover/tooltips on open.
    setStatus('Focused ' + id);
    scheduleRederive();
  }

  let rederiveQueued = false;
  function scheduleRederive() {
    if (rederiveQueued) return;
    rederiveQueued = true;
    queueMicrotask(() => {
      rederiveQueued = false;
      rederive();
    });
  }

  function rederive() {
    const focus = body.getAttribute('data-focus') || '';
    document.querySelectorAll('.entry').forEach(el => {
      const open = el.getAttribute('data-id') === focus;
      el.classList.toggle('marble-open', open);
      const next = open ? 'true' : 'false';
      if (el.getAttribute('aria-expanded') !== next) el.setAttribute('aria-expanded', next);
    });
    syncChooseAria();
    applyFilters();
    sortEntries();
    positionMap();
    // The spec box reads out the data-pick attributes around it, so it is derived
    // too — and stale after a reconcile until something recomputes it.
    if (focus) {
      const openEl = document.querySelector('.entry[data-id="' + CSS.escape(focus) + '"]');
      if (openEl) refreshSpec(openEl);
    }
  }

  // Wiring is remembered in the page, not in an attribute. An invented attribute
  // would ride along in the markup of any insert op and tell the next copy of the
  // node it was already wired.
  const wiredEntries = new WeakSet();
  const wiredChoose = new WeakSet();

  function wireEntry(entryEl) {
    if (wiredEntries.has(entryEl)) return;
    wiredEntries.add(entryEl);
    entryEl.querySelectorAll('.var').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const sub = btn.closest('.sub');
        if (!sub) return;
        setPick(sub, btn.getAttribute('data-name'), sub.getAttribute('data-sel') === 'many');
        refreshSpec(entryEl);
        setStatus('Configured ' + sub.getAttribute('data-key'));
      });
    });
    entryEl.querySelector('.btn-random')?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      entryEl.querySelectorAll('.sub').forEach((sub) => {
        const btns = [...sub.querySelectorAll('.var')];
        if (!btns.length) return;
        if (sub.getAttribute('data-sel') === 'many') {
          const picks = btns.filter(() => Math.random() > 0.55).map((b) => b.getAttribute('data-name'));
          const val = (picks.length ? picks : [btns[0].getAttribute('data-name')]).join('||');
          persist(sub, 'data-pick', val);
          syncPickAria(sub);
        } else {
          const b = btns[Math.floor(Math.random() * btns.length)];
          setPick(sub, b.getAttribute('data-name'), false);
        }
      });
      refreshSpec(entryEl);
      setStatus('Random point in ' + entryEl.getAttribute('data-id'));
    });
    entryEl.querySelector('.btn-copy')?.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const text = entryEl.querySelector('pre.spec-box')?.textContent || '';
      try {
        await navigator.clipboard.writeText(text);
        setStatus('Copied instance spec');
      } catch {
        setStatus('Copy failed — select the JSON manually');
      }
    });
    entryEl.querySelector('.btn-close-detail')?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      clearFocus();
    });
    entryEl.querySelector('.entry-detail')?.addEventListener('click', (ev) => {
      const rel = ev.target.closest('[data-focus-id]');
      if (rel) {
        ev.stopPropagation();
        openEntry(rel.getAttribute('data-focus-id'));
        return;
      }
      ev.stopPropagation();
    });
    refreshSpec(entryEl);
  }

  function wireChoose() {
    document.querySelectorAll('[data-atlas-choose]').forEach(box => {
      if (wiredChoose.has(box)) return;
      wiredChoose.add(box);
      const name = box.getAttribute('data-atlas-choose');
      const sel = box.getAttribute('data-marble-of') || 'body';
      const node = box.closest(sel) || body;
      box.querySelectorAll('[data-marble-value]').forEach(btn => {
        btn.addEventListener('click', () => {
          persist(node, name, btn.getAttribute('data-marble-value'));
          scheduleRederive();
          setStatus(name.replace('data-', '') + ' · ' + btn.getAttribute('data-marble-value'));
        });
      });
    });
  }

  // A click on editable text means edit, not open — the caret is already there.
  // Transient chrome (a grip, a remove button) belongs to the affordance that drew it.
  const ownGesture = (target) =>
    target.closest('.entry-detail') ||
    target.closest('[data-marble-editable]') ||
    target.closest('[data-marble-transient]');

  document.getElementById('overview-root')?.addEventListener('click', (e) => {
    const card = e.target.closest('.entry');
    if (!card || ownGesture(e.target)) return;
    openEntry(card.getAttribute('data-id'));
  });

  document.getElementById('overview-root')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.entry');
    if (!card || ownGesture(e.target) || e.target.closest('button')) return;
    e.preventDefault();
    openEntry(card.getAttribute('data-id'));
  });

  document.getElementById('matrix-host')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-focus-id]');
    const row = e.target.closest('tr[data-id]');
    const id = btn?.getAttribute('data-focus-id') || row?.getAttribute('data-id');
    if (!id) return;
    persist(body, 'data-view', 'atlas');
    openEntry(id);
  });

  document.getElementById('map-host')?.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-focus-id]');
    if (!dot) return;
    openEntry(dot.getAttribute('data-focus-id'));
  });

  document.getElementById('notes-map-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-goto-view]');
    if (!btn) return;
    const view = btn.getAttribute('data-goto-view');
    persist(body, 'data-view', view);
    scheduleRederive();
    setStatus('view · ' + view);
  });

  document.getElementById('findings-body')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rel]');
    if (!btn) return;
    persist(body, 'data-view', 'atlas');
    openEntry(btn.getAttribute('data-rel'));
  });

  document.getElementById('xwalk-body')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-focus-id]');
    if (!btn) return;
    persist(body, 'data-view', 'atlas');
    openEntry(btn.getAttribute('data-focus-id'));
  });

  document.getElementById('btn-clear-focus')?.addEventListener('click', clearFocus);
  document.getElementById('atlas-scrim')?.addEventListener('click', clearFocus);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (e.target.matches('input, textarea, [contenteditable="true"]')) return;
    if (!(body.getAttribute('data-focus') || '')) return;
    e.preventDefault();
    clearFocus();
  });

  document.getElementById('search')?.addEventListener('input', (e) => {
    pageSet(body, 'data-q', e.target.value);
    applyFilters();
    positionMap();
  });

  new MutationObserver(() => scheduleRederive()).observe(body, {
    attributes: true,
    attributeFilter: [
      'data-view', 'data-overview', 'data-open-in', 'data-focus',
      'data-filter-level', 'data-filter-evidence', 'data-sort',
      'data-map-x', 'data-map-y', 'data-q',
    ],
  });

  function wireAll(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const cards = scope.matches?.('.entry') ? [scope] : [...scope.querySelectorAll('.entry')];
    cards.forEach(wireEntry);
    scope.querySelectorAll('.plate').forEach(p => p.classList.add('marble-ia-live'));
    wireChoose();
  }

  // The page works with no host at all: it just stops remembering.
  wireAll(document);
  rederive();
  setStatus('Pattern Atlas');

  // The carrier is injected after this script has run, so everything that needs it
  // waits for marble:ready rather than reading window.marble now and finding nothing.
  function begin(marble) {
    // Derived from an attribute this document owns, or true of this tab only.
    // Undeclared, they would be written into the file as if the reader had typed them.
    marble.pageOnly('data-q', 'aria-pressed', 'aria-expanded');
    // Runs now, and again over anything inserted later or restored by a reconcile —
    // which is exactly when a derived class has just been lost.
    marble.register((root) => {
      wireAll(root);
      scheduleRederive();
    });
    document.addEventListener('marble:status', ({ detail }) => {
      if (detail.state === 'error') setStatus('Not saved — ' + detail.message);
      else if (detail.state === 'saved') setStatus('Saved to the file');
    });
    setStatus('Pattern Atlas · host connected');
  }

  if (window.marble) begin(window.marble);
  else {
    addEventListener('marble:ready', (e) => begin(e.detail || window.marble), { once: true });
    // Say so only once waiting has plainly failed. Announcing it on load was the
    // old bug speaking: the carrier had not arrived yet, not gone missing.
    setTimeout(() => {
      if (!window.marble) setStatus('Pattern Atlas · no host (changes won’t persist)');
    }, 2000);
  }
})();
