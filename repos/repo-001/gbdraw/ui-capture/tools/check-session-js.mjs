// Read a Session with the web app's own reader (readSessionDocument) in Node.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [repo, file] = process.argv.slice(2);
globalThis.window ??= globalThis;
const { readSessionDocument } = await import(pathToFileURL(path.join(repo, 'gbdraw/web/js/services/session-authority.js')).href);
let bytes = readFileSync(file);
if (file.endsWith('.gz')) bytes = gunzipSync(bytes);
const { value, repairs } = readSessionDocument(JSON.parse(bytes.toString('utf8')));
console.log('version', value.version, 'mode', value.ui?.mode, 'results', value.results?.length,
  'other', value.otherModeResult?.renderRequest?.mode, 'otherResults', value.otherModeResult?.results?.length);
console.log('repairs', JSON.stringify(repairs).slice(0, 1500));
