// Seed loader (capture setup only — injected into out/index.html, not part of the app source).
// The app keeps no state between visits, so this replays what a user does on opening it:
// paste their mihomo config into the config box and press "To Node Link". Everything goes
// through the app's own input + convert path. Skip with ?noseed.
(function () {
  if (/[?&]noseed\b/.test(location.search)) return;
  var setValue = function (el, v) {
    var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  var run = function (yaml, tries) {
    var tas = document.querySelectorAll("#root textarea");
    var btn = Array.prototype.find.call(document.querySelectorAll("#root button"), function (b) {
      return /To Node Link|转换为节点链接/.test(b.textContent || "");
    });
    if (tas.length < 2 || !btn) {
      if (tries < 100) setTimeout(function () { run(yaml, tries + 1); }, 50);
      return;
    }
    setValue(tas[0], yaml);
    setTimeout(function () {
      btn.click();
      setTimeout(function () { tas[0].scrollTop = 0; tas[1].scrollTop = 0; }, 100);
    }, 50);
  };
  fetch("/seed/clash-config.yaml")
    .then(function (r) { return r.text(); })
    .then(function (t) { run(t, 0); })
    .catch(function (e) { console.warn("seed load failed", e); });
})();
