// Mirrors every third-party browser asset (CDN scripts, styles, fonts) the MiroTalk pages load,
// so the UI works with no network. Output: .ui-capture/vendor/<sha1>.bin + manifest.json
// keyed by the ORIGINAL url the page requests. Run once at setup time (needs network).
//   node .ui-capture/vendor.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const here = path.dirname(new URL(import.meta.url).pathname);
const outDir = path.join(here, 'vendor');
fs.mkdirSync(outDir, { recursive: true });
const manifestPath = path.join(outDir, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};

const J = 'https://cdn.jsdelivr.net/npm/';
// original url -> source url (null = fetch original)
const entries = [];
const add = (orig, src = null) => entries.push([orig, src || orig]);

// --- jsdelivr direct
for (const u of [
    'npm/@simonwep/pickr/dist/themes/classic.min.css',
    'npm/@simonwep/pickr/dist/themes/monolith.min.css',
    'npm/@simonwep/pickr/dist/themes/nano.min.css',
    'npm/@simonwep/pickr/dist/pickr.es5.min.js',
    'npm/@simonwep/pickr/dist/pickr.min.js',
    'npm/flatpickr/dist/flatpickr.min.css',
    'npm/flatpickr',
    'npm/quill@2.0.3/dist/quill.snow.css',
    'npm/quill@2.0.3/dist/quill.js',
    'npm/axios/dist/axios.min.js',
    'npm/emoji-mart@latest/dist/browser.js',
    'npm/@emoji-mart/data',
    'npm/@emoji-mart/data@latest',
    'npm/@emoji-mart/data@latest/sets/15/native.json',
    'npm/@emoji-mart/data@latest/sets/14/native.json',
    'npm/@emoji-mart/data@latest/i18n/en.json',
    'npm/fabric@5.3.0-browser/dist/fabric.min.js',
    'npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    'npm/jspdf@3.0.4/dist/jspdf.umd.min.js',
    'npm/marked/marked.min.js',
    'npm/pdfjs-dist@3.11.174/build/pdf.min.js',
    'npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
    'npm/qrcodejs@1.0.0/qrcode.min.js',
    'npm/qrious@4.0.2/dist/qrious.min.js',
    'npm/sweetalert2@11.4.8',
    'npm/ua-parser-js@latest/dist/ua-parser.min.js',
    'npm/xss/dist/xss.min.js',
]) add('https://cdn.jsdelivr.net/' + u);

// --- cdnjs -> jsdelivr npm equivalents
const CJ = 'https://cdnjs.cloudflare.com/ajax/libs/';
add(CJ + 'animate.css/4.1.1/animate.min.css', J + 'animate.css@4.1.1/animate.min.css');
add(CJ + 'crypto-js/4.2.0/crypto-js.min.js', J + 'crypto-js@4.2.0/crypto-js.min.js');
add(CJ + 'highlight.js/11.10.0/highlight.min.js', J + '@highlightjs/cdn-assets@11.10.0/highlight.min.js');
add(CJ + 'highlight.js/11.10.0/styles/atom-one-dark.min.css', J + '@highlightjs/cdn-assets@11.10.0/styles/atom-one-dark.min.css');
add(CJ + 'popper.js/2.11.8/umd/popper.min.js', J + '@popperjs/core@2.11.8/dist/umd/popper.min.js');
add(CJ + 'tippy.js/6.3.7/tippy-bundle.umd.min.js', J + 'tippy.js@6.3.7/dist/tippy-bundle.umd.min.js');
for (const v of ['6.1.1', '6.4.2']) {
    add(`${CJ}font-awesome/${v}/css/all.min.css`, `${J}@fortawesome/fontawesome-free@${v}/css/all.min.css`);
    for (const f of ['fa-solid-900', 'fa-regular-400', 'fa-brands-400', 'fa-v4compatibility'])
        for (const ext of ['woff2', 'ttf'])
            add(`${CJ}font-awesome/${v}/webfonts/${f}.${ext}`, `${J}@fortawesome/fontawesome-free@${v}/webfonts/${f}.${ext}`);
}

// --- unpkg / npmcdn
add('https://unpkg.com/scrollreveal@4.0.0/dist/scrollreveal.min.js');
add('https://unpkg.com/animejs@3.0.1/lib/anime.min.js');
add('https://npmcdn.com/flatpickr/dist/themes/airbnb.css', 'https://unpkg.com/flatpickr/dist/themes/airbnb.css');
add('https://webrtc.github.io/adapter/adapter-latest.js', J + 'webrtc-adapter@9/out/adapter.js');
add('https://buttons.github.io/buttons.js', J + 'github-buttons@2/dist/buttons.min.js');

// --- Google Fonts: build equivalent CSS from @fontsource packages
const fonts = {
    'https://fonts.googleapis.com/css?family=IBM+Plex+Sans:400,600': [['IBM Plex Sans', 'ibm-plex-sans', [400, 600]]],
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap': [['Montserrat', 'montserrat', [400, 500, 600, 700]]],
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap': [['Montserrat', 'montserrat', [500, 600, 700]]],
    'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@600&family=Lato:wght@400;700&display=swap': [
        ['Fira Sans', 'fira-sans', [600]],
        ['Lato', 'lato', [400, 700]],
    ],
    'https://fonts.googleapis.com/css?family=Fira+Sans:600|Lato:400&display=swap': [
        ['Fira Sans', 'fira-sans', [600]],
        ['Lato', 'lato', [400]],
    ],
};

const key = (u) => crypto.createHash('sha1').update(u).digest('hex');

async function fetchTo(orig, src) {
    if (manifest[orig] && fs.existsSync(path.join(outDir, manifest[orig].file))) return;
    const r = await fetch(src, { redirect: 'follow' });
    if (!r.ok) throw new Error(`${r.status} ${src}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const file = key(orig) + '.bin';
    fs.writeFileSync(path.join(outDir, file), buf);
    manifest[orig] = { file, type: (r.headers.get('content-type') || 'application/octet-stream').split(';')[0] };
    console.log('ok', buf.length, orig);
}

const failures = [];
for (const [orig, src] of entries) {
    try {
        await fetchTo(orig, src);
    } catch (e) {
        failures.push(e.message);
    }
}

for (const [url, families] of Object.entries(fonts)) {
    let css = '';
    for (const [family, pkg, weights] of families) {
        for (const w of weights) {
            const fileUrl = `https://fonts.gstatic.com/s/${pkg}/${pkg}-latin-${w}-normal.woff2`;
            try {
                await fetchTo(fileUrl, `${J}@fontsource/${pkg}@5/files/${pkg}-latin-${w}-normal.woff2`);
                css += `@font-face{font-family:'${family}';font-style:normal;font-weight:${w};font-display:swap;src:url(${fileUrl}) format('woff2');}\n`;
            } catch (e) {
                failures.push(e.message);
            }
        }
    }
    const file = key(url) + '.bin';
    fs.writeFileSync(path.join(outDir, file), css);
    manifest[url] = { file, type: 'text/css' };
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
console.log('entries', Object.keys(manifest).length, 'failures', failures);
