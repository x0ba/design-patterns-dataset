// UI-capture boot loader (not part of the Rath source tree).
// 1. Stubs the browser's calls to outside hosts so the app works offline:
//    Rath's production build fetches demo datasets from an Aliyun OSS bucket and
//    world/china topojson from GitHub; those are served from the local build instead.
// 2. Seeds Rath's own IndexedDB storage (localforage instance "rath_storage_instance",
//    stores "meta" + "datasource") with an established user's dataset history,
//    exactly as Rath's setDataStorage() writes it.
// 3. Loads the real app entry (passed in data-app on the script tag).
const SEED_VERSION = 'rath-ui-capture-seed-v3';
const here = new URL('.', import.meta.url);
const appEntry = document.querySelector('script[data-app]')?.dataset.app;

const REDIRECTS = [
    [/^https:\/\/chspace\.oss-cn-hongkong\.aliyuncs\.com\/api\/bike_dc-dataset-service\.json/, () => new URL('../datasets/ds-bikesharing-service.json', here).href],
    [/^https:\/\/chspace\.oss-cn-hongkong\.aliyuncs\.com\/api\/([^?#]+)/, (m) => new URL(`../datasets/${m[1]}`, here).href],
    [/^https:\/\/vega\.github\.io\/vega-lite\/data\/world-110m\.json/, () => new URL('./geo/world-110m.json', here).href],
];
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    if (url) {
        for (const [re, to] of REDIRECTS) {
            const m = re.exec(url);
            if (m) return nativeFetch(to(m), init);
        }
    }
    return nativeFetch(input, init);
};

const STORES = ['meta', 'datasource', 'workspace', 'causal', 'state', 'iterator', 'config', 'iterator_meta'];

function openDB() {
    return new Promise((resolve, reject) => {
        const probe = indexedDB.open('rath_storage_instance');
        probe.onsuccess = () => {
            const db = probe.result;
            const missing = STORES.filter((s) => !db.objectStoreNames.contains(s));
            if (missing.length === 0) return resolve(db);
            const v = db.version + 1;
            db.close();
            const up = indexedDB.open('rath_storage_instance', v);
            up.onupgradeneeded = () => missing.forEach((s) => up.result.createObjectStore(s));
            up.onsuccess = () => resolve(up.result);
            up.onerror = () => reject(up.error);
        };
        probe.onupgradeneeded = () => STORES.forEach((s) => probe.result.createObjectStore(s));
        probe.onerror = () => reject(probe.error);
    });
}

async function seed() {
    if (localStorage.getItem('rath:ui-capture-seed') === SEED_VERSION) return;
    const res = await nativeFetch(new URL('./rath-seed.json', here));
    if (!res.ok) return;
    const { datasets, localStorage: ls = {} } = await res.json();
    const now = Date.now();
    const db = await openDB();
    for (const ds of datasets) {
        let rows = ds.rows;
        let fields = ds.fields;
        if (ds.rowsFrom) {
            const demo = await (await nativeFetch(new URL(ds.rowsFrom, here))).json();
            rows = demo.dataSource;
            fields = demo.fields;
        }
        const dataString = JSON.stringify(rows);
        const meta = {
            id: ds.name,
            name: ds.name,
            type: 'dataset',
            createTime: now - ds.createdDaysAgo * 864e5,
            editTime: now - ds.editedMinutesAgo * 6e4,
            size: Math.round(dataString.length / 1024),
            rows: rows.length,
            fields,
            tag: ds.tag,
            userTagGroup: ds.userTagGroup ?? undefined,
        };
        await new Promise((resolve, reject) => {
            const tx = db.transaction(['meta', 'datasource'], 'readwrite');
            tx.objectStore('meta').put(meta, ds.name);
            tx.objectStore('datasource').put(rows, ds.name);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }
    db.close();
    for (const [k, v] of Object.entries(ls)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
    localStorage.setItem('rath:ui-capture-seed', SEED_VERSION);
}

try {
    await seed();
} catch (e) {
    console.error('[ui-capture seed] failed', e);
}
await import(new URL(appEntry, document.baseURI).href);
