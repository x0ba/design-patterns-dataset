// Browser stand-in for Riff's Electron preload bridge (src/main/preload.js).
// Storage goes to the front server's storage.json (same model as Electron main), everything
// that needs native OS features resolves with harmless defaults.
(function () {
  'use strict';
  var PORT = Number(location.port) || (location.protocol === 'https:' ? 443 : 80);
  var isMac = /Mac/i.test(navigator.platform || navigator.userAgent || '');

  function syncXhr(method, url, body) {
    try {
      var x = new XMLHttpRequest();
      x.open(method, url, false);
      if (body) x.setRequestHeader('Content-Type', 'application/json');
      x.send(body || null);
      return x.responseText;
    } catch (e) { return null; }
  }
  function postAsync(url, data) {
    try {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), keepalive: false });
    } catch (_) {}
  }
  var resolved = function (v) { return function () { return Promise.resolve(v); }; };
  var noop = function () {};
  var listeners = {};
  function on(name) { return function (cb) { (listeners[name] = listeners[name] || []).push(cb); }; }

  var api = {
    serverToken: 'browser-local',
    minimizeWindow: noop,
    maximizeWindow: noop,
    closeWindow: noop,
    getServerPort: resolved(PORT),
    setAppProxy: resolved({ success: true }),
    getGpuCompositing: resolved('enabled'),
    pickMedia: resolved(null),
    importAudioFiles: resolved({ success: false, canceled: true, tracks: [] }),
    pickLocalFiles: resolved([]),
    pickLocalFolder: resolved(null),
    rescanLocalMetadata: resolved([]),
    onWindowVisibility: on('visibility'),
    setZoomFactor: noop,
    getZoomFactor: function () { return 1.0; },
    clearWebFrameCache: noop,
    discordRpcUpdate: noop,
    discordRpcClear: noop,
    discordRpcSetEnabled: noop,
    discordRpcGetEnabled: resolved(true),
    discordRpcGetConnected: resolved(false),
    discordRpcReconnect: resolved(false),
    getCacheSize: resolved({ success: true, size: 1874329600, bytes: 1874329600, files: 312 }),
    clearCache: resolved({ success: true }),
    getDataDir: resolved({ current: isMac ? '~/Library/Application Support/Riff' : '~/.cache/devsize', isDefault: true, defaultDir: isMac ? '~/Library/Application Support/Riff' : '~/.cache/devsize' }),
    pickDataDir: resolved(null),
    setDataDir: resolved({ success: false }),
    getDownloadDir: resolved({ current: '~/Music/Riff', isDefault: true, defaultDir: '~/Music/Riff' }),
    pickDownloadDir: resolved(null),
    setDownloadDir: resolved({ success: true }),
    resetDownloadDir: resolved({ success: true }),
    restartApp: function () { location.reload(); },
    getAppVersion: resolved('0.7.6'),
    checkForUpdates: resolved({ available: false }),
    updateAction: noop,
    installUpdateNow: noop,
    onUpdateAvailable: on('ua'), onUpdateDownloaded: on('ud'), onUpdateProgress: on('up'),
    onUpdateReady: on('ur'), onUpdateError: on('ue'), onUpdateNotAvailable: on('una'),
    setTrayOnClose: noop,
    getMultiInstance: resolved(false),
    setMultiInstance: noop,
    getGlobalShortcuts: resolved(false),
    setGlobalShortcuts: noop,
    onMediaCommand: on('mc'),
    onMediaControl: on('mctl'),
    toggleMiniWindow: resolved(false),
    setMiniLyrics: resolved(false),
    isWindows: false,
    platform: isMac ? 'darwin' : 'linux',
    setWindowButtonsVisible: noop,
    setMediaKeys: noop,
    mediaKeysActive: noop,
    welcomeFinish: noop,
    onWelcomeResult: on('wr'),
    getLauncherInfo: resolved({ installed: true, supported: false }),
    installLauncher: resolved({ success: false }),
    listThemes: resolved([]),
    importThemes: resolved({ success: false, canceled: true }),
    setThemeEnabled: noop, disableAllThemes: noop, removeTheme: noop,
    listPlugins: resolved([]),
    setPluginEnabled: noop, disableAllPlugins: noop, openPluginsFolder: noop, removePlugin: noop,
    importPlugins: resolved({ success: false, canceled: true }),
    getAppCss: function () {
      return fetch('/styles.css').then(function (r) { return r.text(); }).catch(function () { return ''; });
    },
    openExternal: function (u) { try { window.open(u, '_blank', 'noopener'); } catch (_) {} },
    logError: noop,
    openLogsFolder: noop,
    getDiagnostics: resolved({ version: '0.7.6', platform: isMac ? 'darwin' : 'linux' }),
    getAudioOutputInfo: resolved({ success: true, sampleRate: 48000, bitDepth: 24, channels: 2, deviceName: 'Built-in Output' }),
    googleLogin: resolved({ success: false }),
    googleLogout: resolved({ success: true }),
    googleAuthStatus: resolved({ loggedIn: false }),
    googleAccountInfo: resolved(null),
    googleImportLibrary: resolved({ success: false }),
    youtubePlaybackLogin: resolved({ success: false }),
    youtubePlaybackLogout: resolved({ success: true }),
    youtubePlaybackStatus: resolved({ loggedIn: false }),
    onYoutubePlaybackAuth: on('ypa'),
    savePlaylistsJson: resolved({ success: false, canceled: true }),
    showPlaylistContextMenu: resolved(null),
    accountExport: resolved({ success: false, canceled: true }),
    accountImport: resolved({ success: false, canceled: true }),
    storageInitSync: function () {
      var raw = syncXhr('GET', '/__riff/storage');
      try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    },
    storageSaveBatch: function (data) { postAsync('/__riff/storage', data); },
    storageSaveSync: function (data) {
      try { navigator.sendBeacon('/__riff/storage', new Blob([JSON.stringify(data)], { type: 'application/json' })); } catch (_) { postAsync('/__riff/storage', data); }
      return true;
    },
    readCacheFile: function () {
      return fetch('/__riff/cache').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    },
    writeCacheFile: noop
  };
  window.electronAPI = api;
})();
