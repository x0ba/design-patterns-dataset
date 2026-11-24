/* Aurora OS returning-player autopilot (ui-capture).
 * The game always opens on a "CLICK TO START" splash, then Main Menu -> Continue -> boot log ->
 * login screen. This script performs those same clicks/keystrokes through the real UI so the
 * entry URL lands on the logged-in desktop of the seeded player.
 * Disable with ?intro (or ?manual) in the URL to see the untouched flow. */
(function () {
  try {
    var q = location.search;
    if (/[?&](intro|manual)\b/.test(q)) return;
    if (!localStorage.getItem('os_filesystem')) return; // no save -> leave New Game flow alone
    var users = JSON.parse(localStorage.getItem('os_users_db') || '[]');
    var player = users.filter(function (u) { return u.username !== 'root' && u.username !== 'guest' && u.password; })[0];
    if (!player) return;
  } catch (e) { return; }

  var done = false, started = 0, t0 = Date.now(), lastPwTry = 0;
  var setVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  function btns() { return Array.prototype.slice.call(document.querySelectorAll('button')); }
  function key(target, k) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k === ' ' ? 'Space' : k, bubbles: true }));
  }

  function tick() {
    if (done || Date.now() - t0 > 90000) return;
    // 1. Intro splash: press start, then skip the logo animation
    var init = document.querySelector('button[aria-label="Initialize System"]');
    if (init && !started) { started = Date.now(); init.click(); return later(); }
    if (started && Date.now() - started > 1100 && document.querySelector('.z-50000')) {
      key(window, 'Escape');
      var splash = document.querySelector('.z-50000'); if (splash) splash.click();
      return later();
    }
    // 2. Main menu: Continue (only enabled when a save exists)
    var cont = btns().filter(function (b) { return !b.disabled && (b.textContent || '').indexOf('Continue') >= 0 && (b.textContent || '').indexOf('Resume your previous loop') >= 0; })[0];
    if (cont) { cont.click(); return later(); }
    // 3. Login screen: pick the player, type the password, Enter
    var pw = document.querySelector('input[type="password"]');
    if (pw) {
      if (Date.now() - lastPwTry > 1500) {
        lastPwTry = Date.now();
        pw.focus();
        setVal.call(pw, player.password);
        pw.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(function () { key(pw, 'Enter'); }, 120);
      }
      return later();
    }
    var tile = btns().filter(function (b) { return (b.textContent || '').indexOf('@' + player.username) >= 0; })[0];
    if (tile) { tile.click(); return later(); }
    // 4. Desktop reached once the dock is present and the login overlay is gone
    if (lastPwTry && !document.querySelector('.z-20000')) { done = true; return; }
    later();
  }
  function later() { setTimeout(tick, 200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
})();
