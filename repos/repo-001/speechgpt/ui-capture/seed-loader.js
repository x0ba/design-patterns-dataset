// Seeds SpeechGPT's own client-side storage (localStorage "globalState" /
// "sessionState" + the Dexie IndexedDB "chatDB") from /seed-data.json the first
// time the app is opened in a browser profile, then boots the real app bundle.
(function () {
  var SEED_FLAG = 'speechgpt-ui-capture-seed';

  function boot() {
    var s = document.createElement('script');
    s.type = 'module';
    s.crossOrigin = '';
    s.src = window.__APP_ENTRY__;
    document.body.appendChild(s);
  }

  function writeChats(chats) {
    return new Promise(function (resolve, reject) {
      // Dexie version(3) => IndexedDB version 30; schema "++id, sessionId"
      var req = indexedDB.open('chatDB', 30);
      req.onupgradeneeded = function () {
        var db = req.result;
        var store = db.objectStoreNames.contains('chat')
          ? req.transaction.objectStore('chat')
          : db.createObjectStore('chat', { keyPath: 'id', autoIncrement: true });
        if (!store.indexNames.contains('sessionId'))
          store.createIndex('sessionId', 'sessionId', { unique: false, multiEntry: false });
      };
      req.onerror = function () { reject(req.error); };
      req.onsuccess = function () {
        var db = req.result;
        var tx = db.transaction('chat', 'readwrite');
        var store = tx.objectStore('chat');
        store.clear();
        chats.forEach(function (c) { store.add(c); });
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { reject(tx.error); };
      };
    });
  }

  fetch('/seed-data.json')
    .then(function (r) { return r.json(); })
    .then(function (seed) {
      if (localStorage.getItem(SEED_FLAG) === seed.version) return;
      var global = seed.globalState;
      // Point the OpenAI client at the local stub served by start.sh
      global.key.openaiHost = location.origin;
      localStorage.setItem('globalState', JSON.stringify(global));
      localStorage.setItem('sessionState', JSON.stringify(seed.sessionState));
      return writeChats(seed.chats).then(function () {
        localStorage.setItem(SEED_FLAG, seed.version);
      });
    })
    .catch(function (e) { console.error('[seed] failed', e); })
    .then(boot);
})();
