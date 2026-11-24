/* Aurora OS seed loader (ui-capture).
 * Applies seed.json (a localStorage dump in the same format DevCenter's
 * "Import Storage" accepts) once, on first load of a fresh browser profile. */
(function () {
  try {
    if (localStorage.getItem('sys_seed_applied')) return;
    if (localStorage.getItem('os_filesystem')) return; // never clobber a real save
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/seed.json', false);
    xhr.send(null);
    if (xhr.status !== 200) return;
    var data = JSON.parse(xhr.responseText);
    Object.keys(data).forEach(function (k) { localStorage.setItem(k, data[k]); });
    localStorage.setItem('sys_seed_applied', new Date().toISOString());
  } catch (e) { console.warn('[seed-loader] failed', e); }
})();

/* Local stub for the only outside call the web build makes: the main-menu
 * connectivity badge pings https://caravane.digital/favicon.ico (utils/network.ts).
 * Redirect it to a static file shipped with the build so the "CRVN xx ms" badge works offline. */
(function () {
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || String(input);
      if (/^https?:\/\/(www\.)?caravane\.digital\//.test(url)) {
        return realFetch('/stubs/caravane/favicon.ico' + (url.indexOf('?') >= 0 ? url.slice(url.indexOf('?')) : ''), init);
      }
    } catch (e) { /* fall through */ }
    return realFetch(input, init);
  };
})();
