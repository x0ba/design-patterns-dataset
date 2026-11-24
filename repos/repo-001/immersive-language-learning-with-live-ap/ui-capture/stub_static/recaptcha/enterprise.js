// Local stand-in for https://www.google.com/recaptcha/enterprise.js
// Exposes the grecaptcha.enterprise API the app uses and returns opaque tokens.
(function () {
  function token() {
    var c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", s = "03AFcWeA";
    for (var i = 0; i < 480; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }
  window.grecaptcha = {
    enterprise: {
      ready: function (cb) { setTimeout(cb, 0); },
      execute: function () { return Promise.resolve(token()); },
      render: function () { return 0; }
    }
  };
})();
