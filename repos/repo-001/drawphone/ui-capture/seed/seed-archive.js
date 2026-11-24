// Seeds this browser's Drawphone results archive (IndexedDB "DrawphoneDatabase",
// same Dexie schema as client/archive.js) with past games from archive.json,
// once, then loads the real app bundle.
(function () {
    var me = document.currentScript;
    var main = me.getAttribute("data-main");
    function loadApp() {
        var s = document.createElement("script");
        s.src = main;
        document.body.appendChild(s);
    }
    var FLAG = "drawphone-ui-capture-seed-v1";
    (async function () {
        try {
            if (!localStorage.getItem(FLAG)) {
                var db = new Dexie("DrawphoneDatabase");
                db.version(1).stores({ archive: "++id,date,chains" });
                var n = await db.archive.count();
                if (n === 0) {
                    var res = await fetch("/__stub/seed/archive.json");
                    var games = await res.json();
                    await db.archive.bulkAdd(
                        games.map(function (g) {
                            return { date: new Date(g.date), chains: g.chains };
                        })
                    );
                }
                db.close();
                localStorage.setItem(FLAG, "1");
            }
        } catch (e) {
            console.error("archive seed failed", e);
        }
        loadApp();
    })();
})();
