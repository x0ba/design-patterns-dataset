// Browser stand-in for Electron's renderer APIs used by IGdm's pages:
// require('electron') -> { ipcRenderer, remote: { Menu, MenuItem }, shell, clipboard }
// require('moment')   -> window.moment
// IPC goes to the Node process running main/main.js (see server.js).
(function () {
  'use strict';
  var listeners = {};
  var queue = [];
  var connected = false;

  function post (url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  var ipcRenderer = {
    on: function (ch, fn) { (listeners[ch] = listeners[ch] || []).push(fn); return ipcRenderer; },
    once: function (ch, fn) { var w = function () { ipcRenderer.removeListener(ch, w); fn.apply(null, arguments); }; return ipcRenderer.on(ch, w); },
    removeListener: function (ch, fn) { listeners[ch] = (listeners[ch] || []).filter(function (f) { return f !== fn; }); },
    removeAllListeners: function (ch) { delete listeners[ch]; },
    send: function (ch) {
      var msg = { channel: ch, args: Array.prototype.slice.call(arguments, 1) };
      if (connected) post('/__ipc', msg); else queue.push(msg);
    },
  };

  function dispatch (ch, args) {
    (listeners[ch] || []).slice().forEach(function (fn) {
      try { fn.apply(null, [{ sender: ipcRenderer }].concat(args || [])); } catch (e) { console.error(e); }
    });
  }

  var currentPath = location.pathname;
  var es = new EventSource('/__events');
  es.onmessage = function (e) {
    var msg = JSON.parse(e.data);
    if (msg.type === 'hello') {
      if (msg.page !== currentPath && /\/(index|login)\.html$/.test(currentPath)) { location.replace(msg.page); return; }
      connected = true;
      queue.splice(0).forEach(function (m) { post('/__ipc', m); });
    } else if (msg.type === 'navigate') {
      if (msg.path !== currentPath) location.replace(msg.path); else if (/index\.html$/.test(msg.path) && /login/.test(currentPath)) location.replace(msg.path);
    } else if (msg.type === 'ipc') {
      if (msg.channel === '__dialog') return showDialog(msg.args[0]);
      if (msg.channel === '__errorBox') return console.error(msg.args[0].title, msg.args[0].content);
      dispatch(msg.channel, msg.args);
    }
  };

  function showDialog (d) {
    var o = d.options || {};
    var ok = window.confirm((o.message || '') + (o.detail ? '\n\n' + o.detail : ''));
    // buttons are ['Delete', 'Cancel'] in the app's own dialog
    post('/__dialog', { id: d.id, response: ok ? 0 : (o.buttons ? o.buttons.length - 1 : 1) });
  }

  // ---- remote.Menu / MenuItem (native context menu stand-in) ----
  var lastPoint = { x: 0, y: 0 };
  var menuRequested = false;
  document.addEventListener('contextmenu', function (e) { lastPoint = { x: e.clientX, y: e.clientY }; }, true);
  window.addEventListener('contextmenu', function (e) { if (menuRequested) { e.preventDefault(); menuRequested = false; } });
  var css = '.__ctx-menu{position:fixed;z-index:99999;min-width:180px;background:#f6f6f6;border:1px solid #c8c8c8;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.18);padding:4px 0;font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#222}' +
    '.__ctx-menu div{padding:4px 18px;cursor:default;white-space:nowrap}.__ctx-menu div:hover{background:#3b82f6;color:#fff}';
  function closeMenus () { Array.prototype.forEach.call(document.querySelectorAll('.__ctx-menu'), function (m) { m.remove(); }); }
  document.addEventListener('mousedown', function (e) { if (!e.target.closest || !e.target.closest('.__ctx-menu')) closeMenus(); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(); });

  function MenuItem (opts) { Object.assign(this, opts || {}); }
  function Menu () { this.items = []; }
  Menu.prototype.append = function (item) { this.items.push(item); };
  Menu.prototype.popup = function () {
    menuRequested = true;
    closeMenus();
    if (!document.getElementById('__ctx-style')) {
      var st = document.createElement('style'); st.id = '__ctx-style'; st.textContent = css; document.head.appendChild(st);
    }
    var el = document.createElement('div');
    el.className = '__ctx-menu';
    this.items.forEach(function (it) {
      var row = document.createElement('div');
      row.textContent = it.label;
      row.onclick = function () { closeMenus(); if (it.click) it.click(it); };
      el.appendChild(row);
    });
    document.body.appendChild(el);
    var x = Math.min(lastPoint.x, window.innerWidth - el.offsetWidth - 4);
    var y = Math.min(lastPoint.y, window.innerHeight - el.offsetHeight - 4);
    el.style.left = x + 'px'; el.style.top = y + 'px';
  };
  Menu.buildFromTemplate = function (t) { var m = new Menu(); t.forEach(function (i) { m.append(new MenuItem(i)); }); return m; };

  var electron = {
    ipcRenderer: ipcRenderer,
    remote: { Menu: Menu, MenuItem: MenuItem, app: { getVersion: function () { return '3.0.4'; } } },
    shell: { openExternal: function (u) { window.open(u, '_blank', 'noopener'); return Promise.resolve(); } },
    clipboard: { writeText: function (t) { if (navigator.clipboard) navigator.clipboard.writeText(t).catch(function () {}); } },
  };

  window.require = function (name) {
    if (name === 'electron') return electron;
    if (name === 'moment') return window.moment;
    throw new Error('Cannot find module ' + name);
  };
})();
