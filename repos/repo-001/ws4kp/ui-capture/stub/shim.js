// Injected by the local server right after jQuery (not part of the app's source).
// 1) Routes the few requests the browser sends straight to third-party hosts (ArcGIS geocoder)
//    to the local stub server, mirroring what /cors/?u= does for everything else.
// 2) On first visit, seeds localStorage with the preferences of a long-time user, the same keys
//    index.js writes when someone picks a city and adjusts settings.
(function () {
  var DIRECT = /^(?:https?:)?\/\/(geocode\.arcgis\.com|buttons\.github\.io)\//i;
  if (window.jQuery) {
    jQuery.ajaxPrefilter(function (options) {
      if (options.url && DIRECT.test(options.url)) {
        options.url = options.url.replace(/^(?:https?:)?\/\//i, '/stub/');
        options.crossDomain = false;
      }
    });
  }

  try {
    if (window.top === window && !localStorage.getItem('ws4kpSeeded')) {
      var seed = {
        TwcQuery: 'San Diego, California, USA',
        TwcLatLon: JSON.stringify({ x: -117.1611, y: 32.7157 }),
        TwcUnits: 'ENGLISH',
        TwcThemes: 'THEMEA',
        TwcAutoRefresh: 'true',
        TwcPlay: 'true',
        TwcAudioPlay: 'false',
        TwcNarrationPlay: 'false',
        TwcScrollHazardText: 'true',
        TwcScrollChecked: 'radScrollDefault',
        TwcScrollText: 'Mission Bay Yacht Club: Saturday junior regatta moved to Sunday 10 AM due to weather -- check the club board for updates',
        TwcScrollRss: 'https://www.weather.gov/sgx/news',
      };
      for (var k in seed) localStorage.setItem(k, seed[k]);
      localStorage.setItem('ws4kpSeeded', '1');
    }
  } catch (e) { }
})();
