// Local stand-in for https://plausible.io/js/script.js: records events in
// memory instead of sending them to plausible.io.
(function () {
  var q = [];
  window.plausible = function () {
    q.push(Array.prototype.slice.call(arguments));
  };
  window.plausible.q = q;
})();
