// Offline stand-in for https://buttons.github.io/buttons.js: renders the .github-button links
// as GitHub-style buttons with static counts.
(function () {
  var css = '.gh-btn{display:inline-flex;align-items:center;font:600 14px/20px -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;margin:0 4px 4px 0;vertical-align:middle}' +
    '.gh-btn a{color:#24292f;text-decoration:none;background:linear-gradient(#f6f8fa,#ebf0f4);border:1px solid #d0d7de;border-radius:6px;padding:4px 12px;display:inline-flex;align-items:center;gap:6px}' +
    '.gh-btn .gh-count{margin-left:6px;padding:4px 10px;background:#fff;border:1px solid #d0d7de;border-radius:6px;color:#24292f}' +
    '.gh-btn svg{width:16px;height:16px;fill:currentColor}';
  var icons = {
    'mark': 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z',
    'octicon-star': 'M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z',
    'octicon-repo-forked': 'M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878z',
    'octicon-issue-opened': 'M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z'
  };
  var counts = { 'octicon-star': 412, 'octicon-repo-forked': 121 };
  function run() {
    var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    var links = document.querySelectorAll('a.github-button');
    for (var i = 0; i < links.length; i++) {
      var a = links[i], icon = a.getAttribute('data-icon') || 'mark';
      var wrap = document.createElement('span'); wrap.className = 'gh-btn';
      var b = a.cloneNode(false); b.className = '';
      b.innerHTML = '<svg viewBox="0 0 16 16"><path d="' + (icons[icon] || icons.mark) + '"/></svg><span>' + a.textContent + '</span>';
      wrap.appendChild(b);
      if (a.getAttribute('data-show-count') === 'true' && counts[icon]) {
        var c = document.createElement('a'); c.className = 'gh-count'; c.href = a.href; c.textContent = counts[icon]; c.style.textDecoration = 'none'; wrap.appendChild(c);
      }
      a.parentNode.replaceChild(wrap, a);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
