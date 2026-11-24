// Seeds browser-side state (localStorage) the way it looks for an established Rapid user, once,
// before Rapid boots. Loaded from the generated index.html (see build-site.sh).
(function () {
  var ls;
  try { ls = window.localStorage; } catch (e) { return; }
  if (!ls) return;
  var origin = window.location.origin;

  if (!ls.getItem('uiCaptureSeeded')) {
    var prefs = {
      // OAuth2 token for the local OSM API stub (osm-auth stores it as `${url}oauth2_access_token`)
      // (also passed via context.preauth in index.html)
      'sawPrivacyVersion': '20201202',
      'sawWhatsNewVersion': '20241222',
      'sawVersion': '2.5.7',
      'walkthrough_completed': 'yes',
      'walkthrough_progress': 'welcome;navigation;navigation;points;areas;lines;buildings;startEditing;rapid',
      'background-custom-template': origin + '/tiles/{zoom}/{x}/{y}.png',
      'background-last-used': 'custom',
      'background-last-used-toggle': 'none',
      'background-opacity': '1',
      'preset_recents': JSON.stringify([
        'building/house', 'highway/footway/sidewalk', 'highway/crossing/marked', 'amenity/bench',
        'leisure/picnic_table', 'building/shed', 'highway/residential', 'amenity/parking',
        'shop/convenience', 'amenity/waste_basket'
      ]),
      'hashtags': '#MapThreeRivers',
      'comment': 'Added sidewalks and crossings along N Main St #MapThreeRivers',
      'commentDate': String(Date.now() - 2 * 86400000),
      'source': 'survey;Custom imagery',
      'area-fill': 'partial',
      'area-fill-toggle': 'partial',
      'inspector.width': '400',
      'raw-tag-editor-view': 'list',
      'validate-what': 'edited',
      'validate-where': 'visible',
      'preferences.privacy.thirdpartyicons': 'true',
      'prefs.mouse_wheel.interaction': 'auto',
      'uiCaptureSeeded': '1'
    };
    for (var k in prefs) ls.setItem(k, prefs[k]);
  }

  // Open where this mapper usually works (Three Rivers, MI) when no map position is in the URL,
  // like following the "Edit" link from their OSM profile.
  if (!/map=/.test(window.location.hash)) {
    var h = window.location.hash.replace(/^#/, '');
    window.location.hash = 'map=17.00/41.94320/-85.63180&background=custom&overlays=' +
      '&datasets=8c3f1d29a6b54e0f9e2c7a51d4b0e6f2,2b7e94c0f13d4a5c8d6e0a9b3c1f7e48' + (h ? '&' + h : '');
  }
})();
