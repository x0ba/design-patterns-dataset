// Loads the built app in happy-dom (with fake-indexeddb) from the running server and prints the rendered sidebar/chat text.
import 'fake-indexeddb/auto';
import { Window } from 'happy-dom';
const url = process.argv[2];
const window = new Window({ url, width: 1440, height: 900, settings: { disableJavaScriptFileLoading: false, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true, disableCSSFileLoading: true, errorCapture: 'tryAndCatch' } });
window.indexedDB = globalThis.indexedDB; window.IDBKeyRange = globalThis.IDBKeyRange;
window.speechSynthesis = { getVoices: () => [], cancel() {}, speak() {}, pause() {}, resume() {}, onvoiceschanged: null, addEventListener() {} };
const errs = [];
window.addEventListener('error', e => errs.push(String(e.error || e.message)));
window.console.error = (...a) => errs.push(a.map(String).join(' ').slice(0, 200));
const html = await (await fetch(url)).text();
process.stdout.write('writing\n'); window.document.write(html); process.stdout.write('written\n');
await new Promise(r => setTimeout(r, 6000));
const text = window.document.body.innerText || window.document.body.textContent;
console.log(text.replace(/\s+/g, ' ').slice(0, 1500));
console.log('ERRORS', errs.slice(0, 8));
await window.happyDOM.close();
