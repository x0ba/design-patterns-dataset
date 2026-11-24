// Browser-side seeder. Runs before the app bundle (see build.sh) and writes seed-data.json into
// the app's own storage: localStorage flags + IndexedDB "ToothPasteDB"/"deviceKeys", with every
// value encrypted exactly like EncryptedStorage.encryptValue() does in passwordless mode.
const DB_NAME = "ToothPasteDB", STORE = "deviceKeys", DB_VERSION = 3;

async function passwordlessKey() {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", enc.encode("insecure-key"), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode("toothpaste-salt"), info: enc.encode("toothpaste-encryption-v1") },
    km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
function b64(bytes) { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); }
async function encryptValue(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(value))));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return b64(out);
}
function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: "clientID" }); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function seed() {
  const res = await fetch("/ui-capture/seed-data.json", { cache: "no-store" });
  const data = await res.json();
  if (localStorage.getItem("__ui_capture_seed__") === data.version) return;
  const key = await passwordlessKey();
  const records = [];
  for (const rec of data.records) {
    const enc = {};
    for (const [k, v] of Object.entries(rec.data)) enc[k] = await encryptValue(key, v);
    records.push({ clientID: rec.clientID, data: enc });
  }
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    for (const r of records) store.put(r);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
  db.close();
  for (const [k, v] of Object.entries(data.localStorage)) localStorage.setItem(k, v);
  localStorage.setItem("__ui_capture_seed__", data.version);
  console.log("[ui-capture] seeded", records.length, "storage records");
}
