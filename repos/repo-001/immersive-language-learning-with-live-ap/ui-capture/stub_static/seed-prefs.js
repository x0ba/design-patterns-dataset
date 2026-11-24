// Seeds the browser-side preferences an established Immergo user would have
// saved (the app stores these in localStorage itself when you change them).
// Only fills keys that are not already set, so in-app changes still persist.
(function () {
  var prefs = {
    immergo_from_language: "🇬🇧 English",
    immergo_language: "🇪🇸 Spanish",
    immergo_mode: "immergo_teacher"
  };
  try {
    for (var k in prefs) if (localStorage.getItem(k) === null) localStorage.setItem(k, prefs[k]);
  } catch (e) {}
})();
