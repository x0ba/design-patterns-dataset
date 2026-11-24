// Local stand-in for Vercel Web Analytics (normally served by Vercel's edge at
// /_vercel/insights/script.js). Rath's main.tsx calls @vercel/analytics inject(),
// which queues calls on window.vaq and loads this script. Here we drain the queue
// and accept further calls without sending anything anywhere.
(function () {
  var queue = window.vaq || [];
  window.vaq = [];
  window.va = function () {};
  queue.length = 0;
})();
