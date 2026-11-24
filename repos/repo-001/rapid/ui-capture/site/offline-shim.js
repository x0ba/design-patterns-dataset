// Integration-boundary stub: Rapid's services call a few third-party HTTP APIs directly with fetch()
// using hardcoded hosts. This shim (loaded by index.html before Rapid) rewrites those requests to
// the local stub server (stub-server.mjs), so the app runs fully offline. No Rapid code is changed.
(function () {
  var routes = [
    ['https://openstreetmap.maps.arcgis.com/', '/stub/arcgis/'],   // Esri ArcGIS dataset catalog (Rapid datasets)
    ['https://stac.overturemaps.org/', '/stub/overture/'],         // Overture STAC catalog
    ['https://taginfo.openstreetmap.org/', '/stub/taginfo/'],      // field value suggestions
    ['https://nominatim.openstreetmap.org/', '/stub/nominatim/'],  // search / reverse geocode
    ['https://www.wikidata.org/', '/stub/wikidata/']               // wikidata field lookups
  ];
  function rewrite(url) {
    if (typeof url !== 'string') return null;
    for (var i = 0; i < routes.length; i++) {
      if (url.indexOf(routes[i][0]) === 0) return window.location.origin + routes[i][1] + url.slice(routes[i][0].length);
    }
    return null;
  }
  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = (typeof input === 'string') ? input : (input && input.url);
    var local = rewrite(url);
    if (local) {
      return origFetch(typeof input === 'string' ? local : new Request(local, input), init);
    }
    return origFetch(input, init);
  };
})();
