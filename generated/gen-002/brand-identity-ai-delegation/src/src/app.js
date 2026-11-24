/*
 * Studiotrace UI. Renders from one state object and re-renders on each change.
 * Decisions, edits, revision requests, and the activity trail persist in localStorage.
 */
(function (root) {
  'use strict';

  var Core = root.StudioCore;
  var SEED = root.STUDIOTRACE_SEED;
  var doc = root.document;

  var STORE_KEY = 'studiotrace.crumb-and-kettle.v1';
  var MIN = 60 * 1000;
  var DAY = 24 * 60 * MIN;
  var NOW_MS = Date.parse(SEED.now);
  var CRITIQUE_MS = Date.parse(SEED.critique);
  var AMP_PATH = 'M18 28 C12 22 14 12 24 11 C33 10 35 19 28 25 C22 30 13 33 13 42 C13 51 27 52 35 46 C41 41 40 34 45 34 C50 34 49 44 53 46';

  var TYPE = Core.TYPE_BY_KEY;
  var SLOTS = SEED.slots;
  var VARS = SEED.variations;
  var ORIG = {};
  SEED.outputs.forEach(function (o) { ORIG[o.id] = o; });

  var VIEWS = [
    { id: 'review', label: 'Mockups' },
    { id: 'assets', label: 'Assets' },
    { id: 'brief', label: 'Brief and policy' },
    { id: 'delegation', label: 'Delegation' },
    { id: 'record', label: 'Contribution record' }
  ];
  var VIEW_NAME = {};
  VIEWS.forEach(function (v) { VIEW_NAME[v.id] = v.label; });

  var FILTERS = [
    { key: 'all', label: 'All', test: function () { return true; } },
    { key: 'fail', label: 'Failing', test: function (o) { return !Core.isPending(o) && Core.failingChecks(o).length > 0; } },
    { key: 'open', label: 'Unreviewed', test: function (o) { return !Core.isPending(o) && !o.decision; } },
    { key: 'kept', label: 'Kept', test: function (o) { return o.decision === 'kept'; } },
    { key: 'queued', label: 'Queued', test: function (o) { return Core.isPending(o); } }
  ];

  var S = null;
  var toastTimer = null;

  // ---------- helpers ----------

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function byId(id) {
    return S.outputs.filter(function (o) { return o.id === id; })[0];
  }

  function actorLabel(a) {
    if (a === 'student') { return SEED.student.name.split(' ')[0]; }
    if (a === 'model') { return SEED.model; }
    return 'Studiotrace';
  }

  // The demo clock stays on the snapshot moment and moves forward only as the student acts.
  function nowMs() {
    var last = S.trail.length ? Date.parse(S.trail[S.trail.length - 1].at) : NOW_MS;
    return Math.max(NOW_MS, last);
  }

  function nextAt() {
    return new Date(nowMs() + 3 * MIN).toISOString();
  }

  function addTrail(actor, text, at) {
    S.trail.push({ at: at || nextAt(), actor: actor, text: text });
  }

  function countdown() {
    var diff = Math.max(0, CRITIQUE_MS - nowMs());
    var days = Math.floor(diff / DAY);
    var hours = Math.floor((diff % DAY) / (60 * MIN));
    return days > 0 ? days + ' d ' + hours + ' h left' : hours + ' h left';
  }

  function variationName(o) { return VARS[o.n - 1].name; }

  function ampLabel(a) { return a === 'student' ? 'your lettering' : 'typeface glyph'; }

  function statusInfo(o) {
    if (Core.isPending(o)) { return { cls: 'queued', text: 'Queued · expected Nov 18' }; }
    if (o.decision === 'kept') { return { cls: 'ok', text: 'Kept for submission' }; }
    if (o.decision === 'discarded') { return { cls: 'muted', text: 'Discarded' }; }
    if (o.decision === 'sent-back') { return { cls: 'warn', text: 'Sent back to model' }; }
    if (Core.failingChecks(o).length) { return { cls: 'fail', text: 'Failing checks' }; }
    return { cls: 'open', text: 'Passes checks · unreviewed' };
  }

  function diffLines(o, d) {
    var out = [];
    SLOTS.forEach(function (s) {
      if (o.design[s.key] !== d.design[s.key]) {
        out.push(s.label + ' ' + o.design[s.key] + ' → ' + d.design[s.key]);
      }
    });
    if (o.ampersand !== d.ampersand) {
      out.push('Ampersand: ' + ampLabel(o.ampersand) + ' → ' + ampLabel(d.ampersand));
    }
    return out;
  }

  // ---------- state ----------

  function readSaved() {
    try {
      var raw = root.localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeSaved() {
    var data = { v: 1, outputs: {}, trail: S.trail, revisions: S.revisions, exportedAt: S.exportedAt };
    S.outputs.forEach(function (o) {
      data.outputs[o.id] = {
        design: o.design,
        ampersand: o.ampersand,
        decision: o.decision,
        decidedAt: o.decidedAt,
        discardNote: o.discardNote
      };
    });
    try { root.localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* storage full or blocked: keep working in memory */ }
  }

  function freshState(useSaved) {
    var saved = useSaved ? readSaved() : null;
    var st = {
      view: 'review',
      filter: 'all',
      selected: 'MB-3',
      tab: 'checks',
      panel: null,
      sb: null,
      dn: null,
      draft: null,
      overlay: { palette: true, wordmark: true },
      recordTab: 'record',
      outputs: [],
      trail: [],
      revisions: [],
      exportedAt: null
    };
    st.outputs = SEED.outputs.map(function (seed) {
      var o = Core.clone(seed);
      var sv = saved && saved.outputs ? saved.outputs[seed.id] : null;
      if (sv) {
        o.design = sv.design;
        o.ampersand = sv.ampersand;
        o.decision = sv.decision;
        o.decidedAt = sv.decidedAt;
        o.discardNote = sv.discardNote;
      }
      return o;
    });
    st.trail = saved && saved.trail ? saved.trail : Core.clone(SEED.trail);
    st.revisions = saved && saved.revisions ? saved.revisions : [];
    st.exportedAt = saved ? saved.exportedAt : null;
    return st;
  }

  function commit() {
    writeSaved();
    render();
  }

  function draftFor(o) {
    if (!S.draft || S.draft.id !== o.id) {
      S.draft = { id: o.id, design: Core.clone(o.design), ampersand: o.ampersand };
    }
    return S.draft;
  }

  function displayOutput(o) {
    if (S.tab === 'edit' && S.draft && S.draft.id === o.id && o.design) {
      return Object.assign({}, o, { design: S.draft.design, ampersand: S.draft.ampersand });
    }
    return o;
  }

  // ---------- artboards ----------

  function wordmarkHTML(amp, size, flag) {
    var mark = amp === 'glyph'
      ? '<span class="amp-glyph' + (flag ? ' flag' : '') + '" data-amp="glyph">&amp;</span>'
      : '<svg class="amp-hand" data-amp="student" viewBox="0 0 60 60" role="img" aria-label="Hand-lettered ampersand"><path d="' + AMP_PATH + '"/></svg>';
    return '<div class="wm" style="font-size:' + size + 'px"><span>Crumb</span>' + mark + '<span>Kettle</span></div>';
  }

  var BODY = {
    menu: function (o, F, wm) {
      var c = SEED.copy.menu;
      var sections = c.groups.map(function (g) {
        var rows = g.items.map(function (it) {
          return '<div class="row"><span>' + esc(it[0]) + '</span><i class="dots"></i><b>' + esc(it[1]) + '</b></div>';
        }).join('');
        return '<div class="sec"><div class="sec-head band' + F('band') + '">' + esc(g.title) + '</div>' + rows + '</div>';
      }).join('');
      return '<div class="ab-body">' +
        '<div class="head">' + wm(TYPE.menu.wm) + '<p class="sub">' + esc(c.sub) + '</p></div>' +
        sections +
        '<div class="rule' + F('accent') + '"></div>' +
        '<p class="foot">' + esc(c.foot) + '</p>' +
        '</div>';
    },
    bag: function (o, F, wm) {
      var c = SEED.copy.bag;
      return '<div class="ab-body">' +
        '<p class="kicker">' + esc(c.kicker) + '</p>' +
        wm(TYPE.bag.wm) +
        '<div class="rule' + F('accent') + '"></div>' +
        '<div class="bag-band band' + F('band') + '">' + esc(c.band) + '</div>' +
        '</div>';
    },
    decal: function (o, F, wm) {
      var c = SEED.copy.decal;
      return '<div class="ab-body">' +
        '<div class="d-left">' + wm(TYPE.decal.wm) + '<p class="d-sub">' + esc(c.sub) + '</p></div>' +
        '<div class="d-right"><span class="sun' + F('accent') + '"></span><p class="hours">' + esc(c.hours) + '<br>' + esc(c.time) + '</p></div>' +
        '<div class="d-band band' + F('band') + '">' + esc(c.band) + '</div>' +
        '</div>';
    },
    loyalty: function (o, F, wm) {
      var c = SEED.copy.loyalty;
      var stamps = '';
      for (var i = 0; i < 8; i++) { stamps += '<i class="stamp' + (i < 5 ? ' on' : '') + '"></i>'; }
      return '<div class="ab-body">' +
        '<div class="l-top">' + wm(TYPE.loyalty.wm) + '<span class="l-no">' + esc(c.no) + '</span></div>' +
        '<div class="stamps' + F('accent') + '">' + stamps + '</div>' +
        '<p class="l-copy">' + esc(c.copy) + '</p>' +
        '<div class="l-band band' + F('band') + '">' + esc(c.member) + '</div>' +
        '</div>';
    },
    ig: function (o, F, wm) {
      var c = SEED.copy.ig;
      return '<div class="ab-body">' +
        '<p class="ig-kicker">' + esc(c.kicker) + '</p>' +
        '<div><h2 class="ig-head">' + esc(c.head) + '</h2><p class="ig-sub">' + esc(c.sub) + '</p></div>' +
        '<div class="ig-foot">' + wm(TYPE.ig.wm) + '<span class="ig-dot' + F('accent') + '"></span></div>' +
        '</div>';
    }
  };

  // ov: { palette: bool, wordmark: bool }. Overlays mark off-palette colors and a substituted ampersand.
  function artboardHTML(o, ov) {
    ov = ov || {};
    var t = TYPE[o.type];
    var d = o.design;
    var v = VARS[o.n - 1];
    var F = function (slot) {
      return ov.palette && !Core.inPalette(d[slot]) ? ' flag' : '';
    };
    var wm = function (size) {
      return wordmarkHTML(o.ampersand, size, ov.wordmark && o.ampersand !== 'student');
    };
    var style = 'width:' + t.w + 'px;height:' + t.h + 'px;--sp:' + v.k +
      ';--bg:' + d.bg + ';--ink:' + d.ink + ';--accent:' + d.accent +
      ';--band:' + d.band + ';--on-band:' + d.onBand + ';';
    return '<div class="ab ab-' + t.key + F('bg') + '" style="' + style + '" data-artboard="' + o.id + '">' +
      BODY[o.type](o, F, wm) + '</div>';
  }

  // Scales each .fit wrapper to its parent box, keeping the artboard's native proportions.
  function fitAll() {
    doc.querySelectorAll('.fit').forEach(function (el) {
      var p = el.parentElement;
      var w = Number(el.getAttribute('data-w'));
      var h = Number(el.getAttribute('data-h'));
      var pad = parseFloat(p.getAttribute('data-pad')) || 0;
      var s = Math.min((p.clientWidth - pad * 2) / w, (p.clientHeight - pad * 2) / h);
      if (!isFinite(s) || s <= 0) { return; }
      el.style.width = (w * s) + 'px';
      el.style.height = (h * s) + 'px';
      var ab = el.firstElementChild;
      if (ab) {
        ab.style.transform = 'scale(' + s + ')';
      }
    });
  }

  // ---------- shell ----------

  function sideHTML() {
    var failCount = S.outputs.filter(function (o) {
      return !Core.isPending(o) && Core.failingChecks(o).length > 0;
    }).length;
    var keptCount = S.outputs.filter(function (o) { return o.decision === 'kept'; }).length;
    var nav = VIEWS.map(function (v) {
      var badge = '';
      if (v.id === 'review' && failCount) { badge = '<span class="count fail">' + failCount + '</span>'; }
      if (v.id === 'record') { badge = '<span class="count">' + keptCount + ' of ' + SEED.types.length + '</span>'; }
      return '<button class="nav-item' + (S.view === v.id ? ' active' : '') + '" data-act="view" data-view="' + v.id + '">' +
        '<span>' + esc(v.label) + '</span>' + badge + '</button>';
    }).join('');
    return '<aside class="side">' +
      '<div class="brand"><span class="logo" aria-hidden="true"></span><span>Studiotrace</span></div>' +
      '<div class="project"><div class="p-name">' + esc(SEED.project.name) + '</div>' +
      '<div class="p-meta">' + esc(SEED.course.name) + ' · ' + esc(SEED.course.instructor) + '</div></div>' +
      '<nav class="nav">' + nav + '</nav>' +
      '<div class="side-foot">' +
      '<div class="me"><span class="avatar">' + esc(SEED.student.initials) + '</span><div>' +
      '<div class="me-name">' + esc(SEED.student.name) + '</div>' +
      '<div class="me-meta">' + esc(SEED.student.program) + '</div></div></div>' +
      '<button class="link small" data-act="reset">Reset demo data</button>' +
      '</div></aside>';
  }

  function topHTML() {
    var c = countdown();
    var hot = (CRITIQUE_MS - nowMs()) < 3 * DAY;
    return '<header class="top">' +
      '<div class="crumbs"><span>' + esc(SEED.course.name) + '</span><span class="sep">/</span>' +
      '<span>' + esc(SEED.project.name) + '</span><span class="sep">/</span>' +
      '<span class="cur">' + esc(VIEW_NAME[S.view]) + '</span></div>' +
      '<div class="countdown' + (hot ? ' hot' : '') + '"><span class="dot"></span>Critique Fri, Nov 20 · 9:00 a.m. <b>' + c + '</b></div>' +
      '</header>';
  }

  function shellHTML() {
    var viewCls = S.view === 'review' ? ' view-review' : '';
    return '<div class="shell">' + sideHTML() +
      '<div class="work">' + topHTML() +
      '<main class="view' + viewCls + '" data-scroll="view">' + viewHTML() + '</main>' +
      '</div></div>';
  }

  function viewHTML() {
    switch (S.view) {
      case 'assets': return assetsView();
      case 'brief': return briefView();
      case 'delegation': return delegationView();
      case 'record': return recordView();
      default: return reviewView();
    }
  }

  // ---------- review ----------

  function reviewView() {
    var outs = S.outputs;
    var delivered = outs.filter(function (o) { return !Core.isPending(o); });
    var failing = delivered.filter(function (o) { return Core.failingChecks(o).length > 0; });
    var queued = outs.length - delivered.length;
    var kept = outs.filter(function (o) { return o.decision === 'kept'; }).length;
    var discarded = outs.filter(function (o) { return o.decision === 'discarded'; }).length;

    var stats = '<div class="stats">' +
      '<span class="stat"><b>' + delivered.length + '</b>of ' + outs.length + ' delivered</span>' +
      '<span class="stat' + (failing.length ? ' fail' : '') + '"><b>' + failing.length + '</b>failing checks</span>' +
      '<span class="stat"><b>' + queued + '</b>queued</span>' +
      '<span class="stat ok"><b>' + kept + '</b>kept</span>' +
      '<span class="stat"><b>' + discarded + '</b>discarded</span>' +
      '</div>';

    return '<div class="review">' +
      '<div class="review-head"><div><h1>Mockups</h1>' +
      '<p>5 applications × 3 spacing variations. Check each delivery against your rules before you keep it.</p></div>' + stats + '</div>' +
      '<div class="review-cols">' +
      '<aside class="col-list">' + filtersHTML() + '<div class="list-scroll" data-scroll="list">' + listHTML() + '</div></aside>' +
      '<section class="col-preview">' + previewHTML(byId(S.selected)) + '</section>' +
      '<aside class="col-insp">' + inspectorHTML(byId(S.selected)) + '</aside>' +
      '</div></div>';
  }

  function filtersHTML() {
    return '<div class="filters">' + FILTERS.map(function (f) {
      var n = S.outputs.filter(f.test).length;
      return '<button class="chip' + (S.filter === f.key ? ' on' : '') + '" data-act="filter" data-filter="' + f.key + '">' +
        esc(f.label) + '<b>' + n + '</b></button>';
    }).join('') + '</div>';
  }

  function listHTML() {
    var f = FILTERS.filter(function (x) { return x.key === S.filter; })[0];
    return SEED.types.map(function (t) {
      var items = S.outputs.filter(function (o) { return o.type === t.key && f.test(o); });
      if (!items.length) { return ''; }
      return '<section class="group"><h3><span>' + esc(t.label) + '</span><span class="faint">' + items.length + ' of 3</span></h3>' +
        items.map(itemHTML).join('') + '</section>';
    }).join('') || '<div class="empty">Nothing in this view.</div>';
  }

  function itemHTML(o) {
    var t = TYPE[o.type];
    var tags = [];
    var status = statusInfo(o);
    if (Core.isPending(o)) {
      tags.push('<span class="tag queued">Queued</span>');
    } else {
      Core.failingChecks(o).forEach(function (c) {
        tags.push('<span class="tag fail">' + (c.id === 'palette' ? 'Off-palette color' : 'Typeface ampersand') + '</span>');
      });
      if (o.decision === 'kept') { tags.push('<span class="tag ok">Kept</span>'); }
      if (o.decision === 'discarded') { tags.push('<span class="tag">Discarded</span>'); }
      if (o.decision === 'sent-back') { tags.push('<span class="tag warn">Sent back</span>'); }
      if (Core.editedSlots(o).length || Core.ampersandEdited(o)) { tags.push('<span class="tag edit">Student-edited</span>'); }
    }
    var thumb = Core.isPending(o)
      ? '<span class="thumb"><span class="thumb-q">Queued</span></span>'
      : '<span class="thumb"><span class="fit" data-w="' + t.w + '" data-h="' + t.h + '">' + artboardHTML(o, {}) + '</span></span>';
    var sub = Core.isPending(o)
      ? 'Expected Nov 18'
      : Core.formatTime(o.at) + ' · ' + o.seconds + ' s';
    return '<button class="item' + (S.selected === o.id ? ' active' : '') + '" data-act="select" data-id="' + o.id + '" aria-label="' + esc(Core.outputLabel(o)) + ', ' + esc(status.text) + '">' +
      thumb +
      '<span class="item-meta"><span class="item-title">' + esc(t.label) + ' · V' + o.n + '</span>' +
      '<span class="item-sub">' + esc(o.id) + ' · ' + esc(variationName(o)) + ' · ' + esc(sub) + '</span>' +
      '<span class="tags">' + tags.join('') + '</span></span>' +
      '</button>';
  }

  function previewHTML(o) {
    var t = TYPE[o.type];
    var status = statusInfo(o);
    var stage = Core.isPending(o)
      ? '<div class="queued-card"><div class="q-title">Not delivered yet</div>' +
        '<p>' + esc(t.label) + ' variation ' + o.n + ' is queued in ' + esc(o.run) + '. Expected Nov 18.</p>' +
        '<p class="small faint">Its prompt and sources are already logged under Provenance once it is delivered.</p></div>'
      : '<div class="fit" data-w="' + t.w + '" data-h="' + t.h + '">' + artboardHTML(displayOutput(o), S.overlay) + '</div>';
    var toggles = !Core.isPending(o)
      ? '<span class="lbl">Overlay</span>' +
        '<button class="toggle' + (S.overlay.palette ? ' on' : '') + '" data-act="overlay" data-key="palette">Off-palette colors</button>' +
        '<button class="toggle' + (S.overlay.wordmark ? ' on' : '') + '" data-act="overlay" data-key="wordmark">Typeface ampersand</button>'
      : '';
    var captionText = Core.isPending(o)
      ? 'Source assets for this output are fixed at queue time.'
      : 'Sources: ' + o.sources.join(', ') + '. Rendered from this output’s color and ampersand values.';
    var captionRun = Core.isPending(o) ? esc(o.run) : esc(o.run + ' · ' + SEED.model);
    return '<div class="prev-head"><div>' +
      '<div class="eyebrow">' + esc(t.label) + ' · Variation ' + o.n + ' · ' + esc(variationName(o)) + ' spacing</div>' +
      '<div class="prev-title"><h2>' + esc(o.id) + '</h2><span class="pill ' + status.cls + '">' + esc(status.text) + '</span></div>' +
      '</div></div>' +
      '<div class="toolbar">' + toggles + '</div>' +
      '<div class="stage" data-pad="26">' + stage + '</div>' +
      '<div class="caption"><span>' + esc(captionText) + '</span><span class="faint">' + captionRun + '</span></div>';
  }

  function inspectorHTML(o) {
    var checks = Core.runChecks(o);
    var passCount = checks.filter(function (c) { return c.pass; }).length;
    var failCount = checks.length - passCount;
    var tabs = [
      { id: 'checks', label: 'Checks', count: failCount ? '<span class="count fail">' + failCount + '</span>' : '' },
      { id: 'provenance', label: 'Provenance', count: '' },
      { id: 'edit', label: 'Edit', count: '' }
    ];
    var tabHTML = tabs.map(function (t) {
      return '<button class="tab' + (S.tab === t.id ? ' on' : '') + '" data-act="tab" data-tab="' + t.id + '">' + t.label + t.count + '</button>';
    }).join('');
    var body;
    if (S.tab === 'provenance') { body = provenanceTab(o); }
    else if (S.tab === 'edit') { body = editTab(o); }
    else { body = checksTab(o, checks, passCount); }
    return '<div class="tabs" role="tablist">' + tabHTML + '</div>' +
      '<div class="insp-body" data-scroll="insp">' + body + '</div>' +
      '<div class="insp-foot">' + decisionFoot(o) + '</div>';
  }

  function checksTab(o, checks, passCount) {
    if (Core.isPending(o)) {
      return '<div class="empty">Not delivered yet. ' + esc(o.run) + ' is queued, expected Nov 18. Checks run as soon as the output arrives.</div>';
    }
    var html = '<div class="section-title"><span>Rules</span><span class="faint">' + passCount + ' of ' + checks.length + ' pass</span></div>';
    checks.forEach(function (c) {
      html += '<div class="check' + (c.pass ? '' : ' fail') + '">' +
        '<div class="check-head"><span class="check-icon">' + (c.pass ? '✓' : '✕') + '</span><div>' +
        '<div class="check-title">' + esc(c.title) + '</div>' +
        '<div class="check-detail">' + esc(c.detail) + '</div></div></div>';
      if (c.items) {
        html += '<ul class="swatches">' + c.items.map(function (i) {
          var verdict = i.ok
            ? '<span class="sw-verdict ok">In palette: ' + esc(i.name) + '</span>'
            : '<span class="sw-verdict bad">Not in palette. Set to ' + esc(i.fixName) + ' ' + esc(i.fix) + '</span>';
          return '<li><span class="chip-sw" style="background:' + i.hex + '"></span>' +
            '<span class="sw-slot">' + esc(i.label) + '</span><span class="sw-hex">' + esc(i.hex) + '</span>' + verdict + '</li>';
        }).join('') + '</ul>';
      }
      if (!c.pass && c.id === 'palette') {
        html += '<div class="fix-hint">Use the Edit tab to set the off-palette slot to a palette color, or send it back to the model with a correction.</div>';
      }
      if (!c.pass && c.id === 'wordmark') {
        html += '<div class="fix-hint">Use the Edit tab to restore your ampersand, or send it back. Core marks stay student-made.</div>';
      }
      html += '</div>';
    });

    var rows = Core.provenanceRows(o);
    var disclosure = o.decision === 'kept'
      ? 'Listed in the contribution record: ' + rows.filter(function (r) { return r.prov === 'student'; }).length + ' student-made element, ' +
        rows.filter(function (r) { return r.prov !== 'student'; }).length + ' AI-made or AI-made and student-edited.'
      : 'Not in the contribution record until you keep it. Every AI-touched element is listed when it is.';
    html += '<div class="section-title"><span>Disclosure</span></div><p class="small muted">' + esc(disclosure) + '</p>';
    return html;
  }

  function provenanceTab(o) {
    var run = SEED.runs.filter(function (r) { return r.id === o.run; })[0];
    var chips = o.sources.map(function (s) { return '<span class="src">' + esc(s) + '</span>'; }).join('');
    var rows = Core.isPending(o) ? [] : Core.provenanceRows(o);
    var html = '<dl class="facts">' +
      '<dt>Run</dt><dd>' + esc(o.run) + ' · requested ' + esc(Core.formatTime(run.at)) + '</dd>' +
      '<dt>Model</dt><dd class="mono">' + esc(SEED.model) + '</dd>' +
      '<dt>Delivered</dt><dd>' + (o.at ? esc(Core.formatTime(o.at)) + ' · took ' + o.seconds + ' s' : 'Not yet') + '</dd>' +
      '<dt>Sources</dt><dd><div class="chips">' + chips + '</div></dd>' +
      '</dl>';
    html += '<div class="section-title"><span>Prompt</span></div><pre class="prompt">' + esc(o.prompt) + '</pre>';
    if (rows.length) {
      html += '<div class="section-title"><span>Element provenance</span></div><ul class="prov-list">' +
        rows.map(function (r) {
          var label = Core.PROVENANCE_LABEL[r.prov];
          return '<li><span>' + esc(r.element) + '</span><span class="pill ' + r.prov + '">' + esc(label) + '</span><span class="note">' + esc(r.note) + '</span></li>';
        }).join('') + '</ul>';
    }
    html += '<div class="section-title"><span>Versions</span></div>';
    html += '<p class="small">AI original, delivered ' + esc(o.at ? Core.formatTime(o.at) : '') + '.</p>';
    if (Core.editedSlots(o).length || Core.ampersandEdited(o)) {
      var changes = [];
      SLOTS.forEach(function (s) {
        if (o.design[s.key] !== ORIG[o.id].design[s.key]) { changes.push(s.label + ' ' + ORIG[o.id].design[s.key] + ' → ' + o.design[s.key]); }
      });
      if (Core.ampersandEdited(o)) { changes.push('Ampersand ' + ampLabel(ORIG[o.id].ampersand) + ' → ' + ampLabel(o.ampersand)); }
      html += '<p class="small">Student edit saved: ' + esc(changes.join('; ')) + '.</p>';
    }
    return html;
  }

  function editTab(o) {
    if (Core.isPending(o)) {
      return '<div class="empty">Nothing to edit until ' + esc(o.id) + ' is delivered.</div>';
    }
    var d = draftFor(o);
    var changes = diffLines(o, d);
    var edited = Core.editedSlots(o).length || Core.ampersandEdited(o);
    var slotRows = SLOTS.map(function (s) {
      var cur = d.design[s.key];
      var inPal = Core.inPalette(cur);
      var opts = SEED.palette.map(function (p) {
        return '<option value="' + p.hex + '"' + (Core.hexKey(p.hex) === Core.hexKey(cur) ? ' selected' : '') + '>' + esc(p.name) + ' ' + p.hex + '</option>';
      });
      if (!inPal) {
        opts.unshift('<option value="' + cur + '" selected>Not in palette · ' + cur + '</option>');
      }
      return '<label class="field"><span>' + esc(s.label) + '</span>' +
        '<select data-change="slot" data-slot="' + s.key + '" data-key="slot-' + s.key + '">' + opts.join('') + '</select></label>';
    }).join('');

    var html = '<p class="edit-note">Your edits save as student edits. The record marks each changed element as AI-made and student-edited.</p>' +
      '<div class="section-title"><span>Colors</span></div>' + slotRows +
      '<fieldset class="amp-choice"><legend>Ampersand</legend>' +
      '<label><input type="radio" name="amp" value="student" data-change="amp" data-key="amp-student"' + (d.ampersand === 'student' ? ' checked' : '') + '>' +
      '<span>Your hand-lettered ampersand from wordmark-v3.svg</span></label>' +
      '<label><input type="radio" name="amp" value="glyph" data-change="amp" data-key="amp-glyph"' + (d.ampersand === 'glyph' ? ' checked' : '') + '>' +
      '<span>Typeface ampersand. Fails the core-mark rule.</span></label></fieldset>';

    html += '<div class="section-title"><span>Changes</span></div>';
    if (changes.length) {
      html += '<ul class="diff">' + changes.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>';
    } else {
      html += '<p class="small faint">No unsaved changes.</p>';
    }
    html += '<div class="btn-row" style="margin-top:14px">' +
      '<button class="btn primary" data-act="edit-save"' + (changes.length ? '' : ' disabled') + '>Save student edit</button>' +
      '<button class="btn" data-act="edit-discard"' + (changes.length ? '' : ' disabled') + '>Discard changes</button>' +
      '<button class="btn danger" data-act="edit-restore"' + (edited ? '' : ' disabled') + '>Restore AI version</button>' +
      '</div>';
    return html;
  }

  function decisionLine(o) {
    if (o.decision === 'kept') { return 'Kept for submission' + (o.decidedAt ? ' · ' + Core.formatTime(o.decidedAt) : ''); }
    if (o.decision === 'discarded') { return 'Discarded' + (o.discardNote ? ': ' + o.discardNote : ''); }
    if (o.decision === 'sent-back') { return 'Sent back to model' + (o.decidedAt ? ' · ' + Core.formatTime(o.decidedAt) : ''); }
    return 'No decision yet';
  }

  function panelHTML(o) {
    if (S.panel === 'sendback' && S.sb && S.sb.id === o.id) {
      return '<div class="panel"><h4>Send back to the model</h4>' +
        '<p class="small muted">Prefilled from the failing checks. Edit the text, then send. It is logged as a revision request.</p>' +
        '<textarea class="ta" rows="5" data-input="sb" data-key="sb-text" placeholder="Describe the change, for example: keep the spacing and use the Sage band from palette-v2.">' + esc(S.sb.text) + '</textarea>' +
        '<div class="btn-row"><button class="btn primary" data-act="sb-send">Send revision request</button>' +
        '<button class="btn" data-act="panel-close">Cancel</button></div></div>';
    }
    if (S.panel === 'discard' && S.dn && S.dn.id === o.id) {
      return '<div class="panel"><h4>Discard ' + esc(o.id) + '</h4>' +
        '<p class="small muted">Your reason stays in the activity trail.</p>' +
        '<textarea class="ta" rows="3" data-input="dn" data-key="dn-text" placeholder="Why it is not going in the submission.">' + esc(S.dn.text) + '</textarea>' +
        '<div class="btn-row"><button class="btn danger" data-act="dn-confirm">Discard output</button>' +
        '<button class="btn" data-act="panel-close">Cancel</button></div></div>';
    }
    return '';
  }

  function decisionFoot(o) {
    if (Core.isPending(o)) {
      return '<p class="foot-note">Not delivered yet. Queued in ' + esc(o.run) + ', expected Nov 18.</p>';
    }
    var fails = Core.failingChecks(o).length;
    var state = '<div class="dec-state dec-' + (o.decision || 'none') + '"><span>' + esc(decisionLine(o)) + '</span>' +
      (o.decision ? '<button class="link small" data-act="undo">Clear</button>' : '') + '</div>';
    var keepDisabled = fails > 0 || o.decision === 'kept';
    var keepLabel = o.decision === 'kept' ? 'Kept' : 'Keep for submission';
    var note = fails > 0
      ? '<p class="foot-note">Keep is locked while ' + fails + ' check' + (fails > 1 ? 's fail' : ' fails') + '. Send it back or fix it first.</p>'
      : '';
    return panelHTML(o) + state +
      '<div class="btn-row">' +
      '<button class="btn primary" data-act="keep"' + (keepDisabled ? ' disabled' : '') + '>' + keepLabel + '</button>' +
      '<button class="btn" data-act="panel" data-panel="sendback">Send back</button>' +
      '<button class="btn" data-act="panel" data-panel="discard">Discard</button>' +
      '</div>' + note;
  }

  // ---------- assets ----------

  function hexRGB(hex) {
    var n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
  }

  function assetsView() {
    var delivered = S.outputs.filter(function (o) { return !Core.isPending(o); });
    var swatches = SEED.palette.map(function (p) {
      var uses = delivered.filter(function (o) {
        return SLOTS.some(function (s) { return o.design[s.key] === p.hex; });
      }).length;
      return '<div class="swatch"><div class="swatch-color" style="background:' + p.hex + '"></div>' +
        '<div class="swatch-body"><b>' + esc(p.name) + '</b>' +
        '<button class="hex-btn" data-act="copy-hex" data-hex="' + p.hex + '">' + p.hex + '</button>' +
        '<span class="faint">RGB ' + hexRGB(p.hex) + '</span>' +
        '<span class="muted small">In ' + uses + ' of ' + delivered.length + ' outputs</span></div></div>';
    }).join('');

    var wm = SEED.wordmark;
    var tp = SEED.typePairing;
    return '<div class="page">' +
      '<div class="page-head"><div><h1>Assets</h1><p>Everything the model was given. Core marks are student-made and cannot be changed by AI.</p></div></div>' +
      '<div class="grid-2">' +
      '<div class="card"><div class="card-head"><h3>Wordmark · ' + esc(wm.version) + '</h3><span class="pill ok">Student-made</span></div>' +
      '<div class="wm-stage" style="--bg:' + SEED.palette[1].hex + ';--ink:' + SEED.palette[0].hex + '">' + wordmarkHTML('student', 92, false) + '</div>' +
      '<p class="small muted" style="margin-top:12px">' + esc(wm.note) + '</p>' +
      '<dl class="facts" style="margin-top:12px">' +
      '<dt>File</dt><dd class="mono">' + esc(wm.file) + '</dd>' +
      '<dt>Drawn</dt><dd>Oct 28, 2026</dd>' +
      '<dt>Format</dt><dd>' + esc(wm.format) + '</dd>' +
      '<dt>Rule</dt><dd>AI may place this mark. It may not redraw or substitute any letter.</dd>' +
      '</dl></div>' +
      '<div class="card"><div class="card-head"><h3>Type pairing</h3><span class="pill ok">Student-made</span></div>' +
      '<div class="type-spec">' +
      '<div class="type-line"><span class="faint small">Display · hand lettering</span><div class="type-sample-lettering">Crumb &amp; Kettle</div><span class="small muted">' + esc(tp.display) + '</span></div>' +
      '<div class="type-line"><span class="faint small">Text · Source Serif 4</span><div class="type-sample-serif">Country sourdough, baked each morning. Kettle pour-over, single origin.</div><span class="small muted">' + esc(tp.text) + '</span></div>' +
      '</div></div>' +
      '</div>' +
      '<div class="card"><div class="card-head"><h3>Palette · palette-v2</h3><span class="pill ok">Student-picked</span></div>' +
      '<div class="swatch-grid">' + swatches + '</div>' +
      '<p class="small muted" style="margin-top:12px">Only these five hex values are allowed in outputs. Use the Edit tab to change a color slot to one of them.</p></div>' +
      '</div>';
  }

  // ---------- brief ----------

  function briefView() {
    var b = SEED.brief;
    var specs = SEED.types.map(function (t) {
      var outs = S.outputs.filter(function (o) { return o.type === t.key; });
      var delivered = outs.filter(function (o) { return !Core.isPending(o); }).length;
      return '<tr><td><b>' + esc(t.label) + '</b></td><td>' + esc(t.dims) + '</td>' +
        '<td>3 spacing variations</td><td>' + delivered + ' of 3</td></tr>';
    }).join('');
    var rules = SEED.policy.rules.map(function (r) {
      var cls = r.tag === 'Not allowed' ? 'fail' : (r.tag === 'Allowed' ? 'ok' : 'open');
      return '<div class="rule-row"><span>' + esc(r.text) + '</span><span class="pill ' + cls + '">' + esc(r.tag) + '</span></div>';
    }).join('');
    return '<div class="page">' +
      '<div class="page-head"><div><h1>Brief and policy</h1>' +
      '<p>' + esc(b.file) + ' · ' + b.pages + ' pages · received ' + esc(b.received) + '</p></div></div>' +
      '<div class="grid-2">' +
      '<div class="card"><div class="card-head"><h3>Client brief</h3></div>' +
      '<p>' + esc(b.about) + '</p>' +
      '<h4>Goal</h4><p>' + esc(b.goal) + '</p>' +
      '<h4>Deliverables</h4><ul class="bullets">' + b.deliverables.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' +
      '<h4>Notes from the client</h4><ul class="bullets">' + b.notes.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' +
      '<h4>Dates</h4><div class="dates">' + b.dates.map(function (d) {
        return '<div class="date-box"><div class="lbl">' + esc(d.label) + '</div><div class="val">' + esc(d.at) + '</div></div>';
      }).join('') + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>Course AI policy</h3><span class="muted small">' + esc(SEED.policy.course) + ' · ' + esc(SEED.policy.instructor) + '</span></div>' +
      rules +
      '</div></div>' +
      '<div class="card"><div class="card-head"><h3>Applications</h3><span class="muted small">Each in three spacing variations</span></div>' +
      '<table class="spec-table"><thead><tr><th>Application</th><th>Print or format</th><th>Variations</th><th>Delivered</th></tr></thead><tbody>' + specs + '</tbody></table></div>' +
      '</div>';
  }

  // ---------- delegation ----------

  function delegationView() {
    var rules = SEED.rules.map(function (r) {
      var failing = [];
      if (r.id === 'wordmark' || r.id === 'palette') {
        S.outputs.forEach(function (o) {
          if (Core.isPending(o)) { return; }
          Core.failingChecks(o).forEach(function (c) {
            if (c.id === r.id) { failing.push(o.id); }
          });
        });
      }
      var automated = r.id === 'wordmark' || r.id === 'palette';
      var status;
      if (!automated) {
        status = '<span class="pill muted">Reviewed by you</span>';
      } else if (failing.length) {
        status = '<span class="pill fail">' + failing.length + ' failing · ' + esc(failing.join(', ')) + '</span>';
      } else {
        status = '<span class="pill ok">All delivered outputs pass</span>';
      }
      return '<div class="rule-row"><span>' + esc(r.text) + '</span><span>' + status + '</span></div>';
    }).join('');

    var runs = SEED.runs.map(function (r) {
      return '<tr><td class="mono">' + esc(r.id) + '</td><td>' + esc(Core.formatTime(r.at)) + '</td>' +
        '<td>' + esc(r.types) + '</td><td>' + r.delivered + ' of ' + r.requested + '</td>' +
        '<td>' + esc(r.status) + (r.note ? '<div class="small muted">' + esc(r.note) + '</div>' : '') + '</td></tr>';
    }).join('');

    var revisions = S.revisions.length
      ? S.revisions.slice().reverse().map(function (r) {
        return '<div class="rule-row"><span><b class="mono">' + esc(r.id) + '</b> · ' + esc(r.outputId) + ' · ' + esc(Core.formatTime(r.sentAt)) + '<br><span class="small muted" style="white-space:pre-wrap">' + esc(r.text) + '</span></span><span class="pill warn">' + esc(r.status) + '</span></div>';
      }).join('')
      : '<div class="empty">No revision requests yet. Send an output back from Mockups to log a correction here.</div>';

    return '<div class="page">' +
      '<div class="page-head"><div><h1>Delegation</h1><p>What you asked the model to do, the rules it had, and the corrections you sent back.</p></div></div>' +
      '<div class="card"><div class="card-head"><h3>Task</h3><span class="muted small">Created Nov 10, 9:30 a.m. · ' + esc(SEED.model) + '</span></div>' +
      '<p><b>Mockup set:</b> 5 applications × 3 spacing variations = 15 outputs. Scope: layout and application. Core marks are not in scope.</p>' +
      '<h4>Rules sent with every run</h4>' + rules +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="card"><div class="card-head"><h3>Runs</h3></div><table class="data-table"><thead><tr><th>Run</th><th>Requested</th><th>Types</th><th>Delivered</th><th>Status</th></tr></thead><tbody>' + runs + '</tbody></table></div>' +
      '<div class="card"><div class="card-head"><h3>Revision requests</h3><span class="muted small">' + S.revisions.length + ' sent</span></div>' + revisions + '</div>' +
      '</div></div>';
  }

  // ---------- record ----------

  function recordView() {
    var rec = Core.buildRecord(S.outputs);
    var tabs = '<div class="tabs-page">' +
      '<button class="tab' + (S.recordTab === 'record' ? ' on' : '') + '" data-act="rtab" data-tab="record">Contribution record</button>' +
      '<button class="tab' + (S.recordTab === 'activity' ? ' on' : '') + '" data-act="rtab" data-tab="activity">Activity trail</button>' +
      '</div>';
    var head = '<div class="page-head"><div><h1>Contribution record</h1>' +
      '<p>Every AI-touched element in what you submit, with its provenance. Critique is Fri, Nov 20, 9:00 a.m.</p></div></div>';
    if (S.recordTab === 'activity') {
      return '<div class="page">' + head + tabs + activityHTML() + '</div>';
    }
    return '<div class="page">' + head + tabs + '<div class="rec-grid"><div>' + recordMain(rec) + '</div><div>' + recordAside(rec) + '</div></div></div>';
  }

  function recordMain(rec) {
    var w = SEED.wordmark;
    var assets = '<div class="card rec-section"><div class="card-head"><h3>Student-made assets</h3><span class="rec-sub">Always included</span></div>' +
      '<table class="data-table"><thead><tr><th>Asset</th><th>Detail</th><th>Provenance</th></tr></thead><tbody>' +
      '<tr><td><b>Wordmark</b></td><td>' + esc(w.file) + ', drawn Oct 28, 2026. Letters and ampersand hand-lettered.</td><td><span class="pill student">Student-made</span></td></tr>' +
      '<tr><td><b>Palette</b></td><td>palette-v2: ' + SEED.palette.map(function (p) { return esc(p.name) + ' ' + p.hex; }).join(', ') + '</td><td><span class="pill student">Student-made</span></td></tr>' +
      '<tr><td><b>Type pairing</b></td><td>Hand lettering for the wordmark and section heads. Source Serif 4 for body copy.</td><td><span class="pill student">Student-made</span></td></tr>' +
      '</tbody></table></div>';

    var sections;
    if (!rec.sections.length) {
      sections = '<div class="card rec-section"><div class="empty">No kept outputs yet. Keep outputs in Mockups and they appear here with their provenance.</div></div>';
    } else {
      sections = rec.sections.map(function (s) {
        var o = s.output;
        var blocked = s.blockers.length
          ? '<div class="fix-hint" style="background:var(--fail-soft);color:var(--fail)">Blocked: ' + esc(s.blockers.join('; ')) + '. Fix this output before you submit.</div>'
          : '';
        return '<div class="card rec-section">' +
          '<div class="card-head"><h3>' + esc(s.label) + ' · ' + esc(o.id) + '</h3>' +
          '<span class="rec-sub">' + esc(Core.formatTime(o.at)) + ' · ' + o.seconds + ' s · ' + esc(o.run) + ' · ' + esc(SEED.model) + '</span></div>' +
          blocked +
          '<table class="data-table"><thead><tr><th>Element</th><th>Provenance</th><th>Note</th></tr></thead><tbody>' +
          s.rows.map(function (r) {
            return '<tr><td>' + esc(r.element) + '</td><td><span class="pill ' + r.prov + '">' + esc(Core.PROVENANCE_LABEL[r.prov]) + '</span></td><td class="small">' + esc(r.note) + '</td></tr>';
          }).join('') +
          '</tbody></table>' +
          '<div class="card-head" style="margin:12px 0 0"><span class="rec-sub">Prompt</span></div>' +
          '<pre class="prompt" style="margin-top:6px">' + esc(o.prompt) + '</pre></div>';
      }).join('');
    }

    var excluded = '';
    if (rec.notSubmitted.length) {
      var discarded = rec.notSubmitted.filter(function (o) { return o.decision === 'discarded'; });
      var others = rec.notSubmitted.length - discarded.length;
      excluded = '<div class="card rec-section"><div class="card-head"><h3>Not in the submission</h3><span class="rec-sub">' + rec.notSubmitted.length + ' outputs</span></div>' +
        discarded.map(function (o) {
          return '<p class="small"><b>' + esc(o.id) + '</b> discarded. ' + esc(o.discardNote || 'No reason given.') + '</p>';
        }).join('') +
        '<p class="small muted">' + others + ' more are unreviewed, sent back, or not kept. They are not disclosed because they are not submitted.</p></div>';
    }
    return assets + sections + excluded;
  }

  function recordAside(rec) {
    var checks = Core.submissionChecks(rec, S.exportedAt);
    var list = checks.map(function (c) {
      return '<li><span class="mark' + (c.pass ? ' pass' : ' open') + '">' + (c.pass ? '✓' : '') + '</span>' +
        '<div><div class="lbl">' + esc(c.label) + '</div><div class="det">' + esc(c.detail) + '</div></div></li>';
    }).join('');
    var disclosure = Core.disclosureText(rec, recordContext(nowAtForDisplay()));
    var blocked = rec.blockerCount > 0;
    return '<div class="card"><div class="card-head"><h3>Submission checklist</h3></div>' +
      '<ul class="checklist">' + list + '</ul>' +
      '<div class="action-col">' +
      '<button class="btn primary" data-act="export"' + (blocked ? ' disabled' : '') + '>Export record (.md)</button>' +
      (blocked ? '<p class="small muted">Export is locked until every kept output passes its checks.</p>' : '') +
      '<button class="btn" data-act="copy-disclosure">Copy AI disclosure</button>' +
      '</div></div>' +
      '<div class="card" style="margin-top:14px"><div class="card-head"><h3>AI disclosure</h3><span class="rec-sub">Preview</span></div>' +
      '<pre class="disclosure">' + esc(disclosure) + '</pre></div>';
  }

  function activityHTML() {
    var items = S.trail.slice().reverse().map(function (e) {
      return '<li><span class="when">' + esc(Core.formatTime(e.at)) + '</span>' +
        '<span class="who ' + esc(e.actor) + '">' + esc(actorLabel(e.actor)) + '</span>' +
        '<span>' + esc(e.text) + '</span></li>';
    }).join('');
    return '<div class="card"><ol class="trail" style="list-style:none;margin:0;padding:0">' + items + '</ol></div>';
  }

  function nowAtForDisplay() {
    return S.exportedAt || new Date(nowMs()).toISOString();
  }

  function recordContext(atIso) {
    var trailRows = S.trail.map(function (e) {
      return { at: e.at, actorLabel: actorLabel(e.actor), text: e.text };
    });
    return {
      project: SEED.project.name,
      course: SEED.course.name,
      student: SEED.student.name,
      program: SEED.student.program,
      instructor: SEED.course.instructor,
      model: SEED.model,
      critiqueText: 'Fri, Nov 20, 2026, 9:00 a.m. Pacific',
      generatedText: Core.formatTime(atIso),
      wordmark: SEED.wordmark.file + ', drawn Oct 28, 2026',
      paletteText: SEED.palette.map(function (p) { return p.name + ' ' + p.hex; }).join(', '),
      typeText: SEED.typePairing.display + '; ' + SEED.typePairing.text,
      trail: trailRows
    };
  }

  // ---------- toast and clipboard ----------

  function flash(text) {
    var el = doc.getElementById('toast');
    if (!el) {
      el = doc.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      doc.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    root.clearTimeout(toastTimer);
    toastTimer = root.setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function copyText(text, doneMsg) {
    var nav = root.navigator;
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      nav.clipboard.writeText(text).then(function () {
        flash(doneMsg);
      }, function () {
        flash('Copy blocked by the browser. Select the text and copy it manually.');
      });
    } else {
      flash('Clipboard is not available here.');
    }
  }

  function download(name, text) {
    var blob = new root.Blob([text], { type: 'text/markdown;charset=utf-8' });
    var url = root.URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url;
    a.download = name;
    doc.body.appendChild(a);
    a.click();
    a.remove();
    root.setTimeout(function () { root.URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- actions ----------

  function current() { return byId(S.selected); }

  function openPanel(kind) {
    var o = current();
    if (!o || Core.isPending(o)) { return; }
    S.panel = kind;
    if (kind === 'sendback') {
      S.sb = { id: o.id, text: Core.correctionsFor(o).join('\n') };
      S.dn = null;
    } else {
      S.dn = { id: o.id, text: '' };
      S.sb = null;
    }
    render();
  }

  function closePanel() {
    S.panel = null;
    S.sb = null;
    S.dn = null;
    render();
  }

  function handleAct(act, ds) {
    var o = current();
    switch (act) {
      case 'view':
        S.view = ds.view;
        if (ds.view === 'record') { S.recordTab = 'record'; }
        render();
        return;
      case 'select':
        S.selected = ds.id;
        S.panel = null; S.sb = null; S.dn = null; S.draft = null;
        render();
        return;
      case 'filter':
        S.filter = ds.filter;
        render();
        return;
      case 'overlay':
        S.overlay[ds.key] = !S.overlay[ds.key];
        render();
        return;
      case 'tab':
        S.tab = ds.tab;
        render();
        return;
      case 'rtab':
        S.recordTab = ds.tab;
        render();
        return;
      case 'panel':
        openPanel(ds.panel);
        return;
      case 'panel-close':
        closePanel();
        return;
      case 'keep':
        if (!o || Core.isPending(o) || Core.failingChecks(o).length) { return; }
        o.decision = 'kept';
        o.decidedAt = nextAt();
        addTrail('student', 'Kept ' + Core.outputLabel(o) + ' (' + o.id + ') for submission.', o.decidedAt);
        commit();
        return;
      case 'undo':
        if (!o) { return; }
        o.decision = null;
        o.decidedAt = null;
        o.discardNote = null;
        addTrail('student', 'Cleared the decision on ' + o.id + '.');
        commit();
        return;
      case 'sb-send': {
        if (!o || !S.sb || !S.sb.text.trim()) {
          flash('Add a correction before sending.');
          return;
        }
        var at = nextAt();
        var count = S.revisions.length + 1;
        S.revisions.push({ id: 'RR-' + count, outputId: o.id, sentAt: at, text: S.sb.text.trim(), status: 'Awaiting revision' });
        o.decision = 'sent-back';
        o.decidedAt = at;
        addTrail('student', 'Sent ' + o.id + ' back to the model (RR-' + count + ').', at);
        S.panel = null; S.sb = null;
        commit();
        return;
      }
      case 'dn-confirm': {
        if (!o || !S.dn) { return; }
        o.decision = 'discarded';
        o.decidedAt = nextAt();
        o.discardNote = S.dn.text.trim() || null;
        addTrail('student', 'Discarded ' + o.id + (o.discardNote ? ': ' + o.discardNote : '.'), o.decidedAt);
        S.panel = null; S.dn = null;
        commit();
        return;
      }
      case 'edit-save': {
        if (!o || !S.draft || S.draft.id !== o.id) { return; }
        var changes = diffLines(o, S.draft);
        if (!changes.length) { flash('No changes to save.'); return; }
        o.design = Core.clone(S.draft.design);
        o.ampersand = S.draft.ampersand;
        addTrail('student', 'Edited ' + o.id + ': ' + changes.join('; ') + '.');
        S.draft = null;
        commit();
        flash('Student edit saved to ' + o.id + '.');
        return;
      }
      case 'edit-discard':
        S.draft = null;
        render();
        return;
      case 'edit-restore':
        if (!o) { return; }
        o.design = Core.clone(ORIG[o.id].design);
        o.ampersand = ORIG[o.id].ampersand;
        addTrail('student', 'Restored the AI version of ' + o.id + '.');
        S.draft = null;
        commit();
        return;
      case 'export': {
        var rec = Core.buildRecord(S.outputs);
        if (rec.blockerCount > 0) { flash('Fix the blocked outputs before exporting.'); return; }
        var exportAt = nextAt();
        S.exportedAt = exportAt;
        addTrail('student', 'Exported the contribution record (' + rec.kept.length + ' kept outputs).', exportAt);
        writeSaved();
        var md = Core.recordMarkdown(rec, recordContext(exportAt));
        download('crumb-and-kettle-contribution-record.md', md);
        commit();
        flash('Record exported as a Markdown file.');
        return;
      }
      case 'copy-disclosure': {
        var rec2 = Core.buildRecord(S.outputs);
        copyText(Core.disclosureText(rec2, recordContext(nowAtForDisplay())), 'AI disclosure copied.');
        return;
      }
      case 'copy-hex':
        copyText(ds.hex, 'Copied ' + ds.hex + '.');
        return;
      case 'reset':
        if (root.confirm('Reset decisions, edits, revision requests, and the activity trail to the Nov 17 snapshot?')) {
          try { root.localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
          S = freshState(false);
          render();
          flash('Demo data reset to Nov 17, 4:40 p.m.');
        }
        return;
      default:
    }
  }

  function handleChange(kind, el) {
    var o = current();
    if (!o || Core.isPending(o)) { return; }
    if (kind === 'slot') {
      draftFor(o).design[el.getAttribute('data-slot')] = el.value;
      render();
    } else if (kind === 'amp') {
      draftFor(o).ampersand = el.value;
      render();
    }
  }

  // ---------- render and events ----------

  function captureUi() {
    var scroll = {};
    doc.querySelectorAll('[data-scroll]').forEach(function (el) {
      scroll[el.getAttribute('data-scroll')] = el.scrollTop;
    });
    var ae = doc.activeElement;
    var key = ae && ae.getAttribute ? ae.getAttribute('data-key') : null;
    return { scroll: scroll, key: key };
  }

  function restoreUi(state) {
    doc.querySelectorAll('[data-scroll]').forEach(function (el) {
      var v = state.scroll[el.getAttribute('data-scroll')];
      if (v != null) { el.scrollTop = v; }
    });
    if (state.key) {
      var f = doc.querySelector('[data-key="' + state.key + '"]');
      if (f) { f.focus(); }
    }
  }

  function render() {
    var ui = captureUi();
    doc.getElementById('app').innerHTML = shellHTML();
    restoreUi(ui);
    fitAll();
  }

  function bind() {
    doc.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!t || t.disabled) { return; }
      handleAct(t.getAttribute('data-act'), t.dataset);
    });
    doc.addEventListener('change', function (e) {
      var t = e.target;
      if (t.getAttribute && t.hasAttribute('data-change')) {
        handleChange(t.getAttribute('data-change'), t);
      }
    });
    doc.addEventListener('input', function (e) {
      var t = e.target;
      if (!t.getAttribute || !t.hasAttribute('data-input')) { return; }
      if (t.getAttribute('data-input') === 'sb' && S.sb) { S.sb.text = t.value; }
      if (t.getAttribute('data-input') === 'dn' && S.dn) { S.dn.text = t.value; }
    });
    root.addEventListener('resize', fitAll);
  }

  function start() {
    S = freshState(true);
    bind();
    render();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { artboardHTML: artboardHTML };
  }

  if (doc && doc.getElementById('app')) {
    start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
