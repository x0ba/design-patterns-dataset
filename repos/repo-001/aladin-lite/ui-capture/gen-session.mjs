// Generates the saved working session of an observer who has been using Aladin Lite for months
// to plan and follow up an Orion B / L1630 young-stellar-object programme.
// Output: out/session/*.json + out/session/orion_yso_candidates.xml (loaded by out/session.js
// through Aladin Lite's own public API: catalogFromURL, graphicOverlay, marker, MOC...).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'session');
fs.mkdirSync(OUT, { recursive: true });

let seed = 20260611;
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const D2R = Math.PI / 180;
const day = (start, span) => { const t = new Date(start).getTime() + Math.floor(rnd() * span) * 864e5; return new Date(t).toISOString().slice(0, 10); };
const fmtJ = (a, d) => {
    const h = a / 15, hh = Math.floor(h), mm = Math.floor((h - hh) * 60), ss = ((h - hh) * 60 - mm) * 60;
    const ad = Math.abs(d), dd = Math.floor(ad), dm = Math.floor((ad - dd) * 60), ds = ((ad - dd) * 60 - dm) * 60;
    const p = (v, n) => String(v).padStart(n, '0');
    return `${p(hh, 2)}${p(mm, 2)}${ss.toFixed(2).padStart(5, '0')}${d < 0 ? '-' : '+'}${p(dd, 2)}${p(dm, 2)}${ds.toFixed(1).padStart(4, '0')}`;
};

// ------------------------------------------------------------------ 1. YSO candidate table (VOTable)
// clustered around NGC 2024, NGC 2023, the Horsehead and the sigma Ori cluster
const CLUSTERS = [
    { name: 'NGC 2024', ra: 85.4208, dec: -1.905, s: 0.07, n: 70 },
    { name: 'sigma Ori', ra: 84.6865, dec: -2.600, s: 0.13, n: 55 },
    { name: 'NGC 2023', ra: 85.3125, dec: -2.235, s: 0.05, n: 25 },
    { name: 'Horsehead / IC 434', ra: 85.245, dec: -2.46, s: 0.06, n: 22 },
    { name: 'field', ra: 85.05, dec: -2.15, s: 0.45, n: 38 },
];
const CLASSES = ['0/I', 'I', 'Flat', 'II', 'II', 'II', 'II', 'III', 'III'];
const STATUS = ['confirmed', 'confirmed', 'candidate', 'candidate', 'candidate', 'needs spectrum', 'rejected (background galaxy)', 'rejected (AGB)', 'follow-up scheduled'];
const COMMENTS = [
    '', '', '', '', 'strong Halpha in MUSE cube', 'Li 6708 absorption, EW 0.45 A', 'variable in TESS sector 32', 'edge-on disk candidate, check JWST',
    'blended with neighbour at 1.8"', 'IR excess only at W3/W4 - nebular contamination?', 'outflow knot nearby (HH 92?)', 'periodic, P=6.3 d',
    'X-ray flare in Chandra ObsID 18761', 'spectrum taken 2026-02-14, reduce!', 'ask Marta about the FLAMES fibre clash', 'too faint for UVES, move to X-shooter',
];
const yso = [];
let k = 0;
for (const c of CLUSTERS) {
    for (let i = 0; i < c.n; i++) {
        const ra = c.ra + gauss() * c.s / Math.cos(c.dec * D2R), dec = c.dec + gauss() * c.s;
        const cls = pick(CLASSES);
        const K = 8.5 + rnd() * 6.5 + (cls === '0/I' ? 2 : 0);
        const exc = { '0/I': 2.4, 'I': 1.6, 'Flat': 0.9, 'II': 0.5, 'III': 0.05 }[cls];
        const st = pick(STATUS);
        yso.push({
            id: `OriB-YSO-${String(++k).padStart(3, '0')}`, twomass: fmtJ(ra, dec), ra: ra.toFixed(6), dec: dec.toFixed(6), region: c.name, cls,
            Jmag: (K + 1.1 + rnd() * 0.9 + exc * 0.4).toFixed(2), Kmag: K.toFixed(2), W1W2: (0.1 + exc * (0.4 + rnd() * 0.4)).toFixed(2),
            alpha: (exc * 1.1 - 1.6 + gauss() * 0.25).toFixed(2), Av: (1 + rnd() * 18).toFixed(1),
            SpT: cls === '0/I' || rnd() < 0.35 ? '' : pick(['M0', 'M1.5', 'M2', 'M3', 'M3.5', 'M4', 'M5', 'K5', 'K7', 'G9', 'M2.5', 'M6']),
            status: st, last_obs: day('2025-09-20', 420), comment: pick(COMMENTS),
        });
    }
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const F = [
    ['ID', 'char', '', 'meta.id;meta.main'], ['2MASS', 'char', '', 'meta.id.cross'], ['RAJ2000', 'double', 'deg', 'pos.eq.ra;meta.main'], ['DEJ2000', 'double', 'deg', 'pos.eq.dec;meta.main'],
    ['Region', 'char', '', 'meta.note'], ['Class', 'char', '', 'src.class'], ['Jmag', 'float', 'mag', 'phot.mag;em.IR.J'], ['Kmag', 'float', 'mag', 'phot.mag;em.IR.K'],
    ['W1-W2', 'float', 'mag', 'phot.color'], ['alpha_IR', 'float', '', 'spect.index'], ['Av', 'float', 'mag', 'phys.absorption'], ['SpT', 'char', '', 'src.spType'],
    ['Status', 'char', '', 'meta.code.status'], ['LastObs', 'char', '', 'time.epoch;obs'], ['Comment', 'char', '', 'meta.note'],
];
const vot = `<?xml version="1.0" encoding="UTF-8"?>
<VOTABLE version="1.4" xmlns="http://www.ivoa.net/xml/VOTable/v1.3">
  <RESOURCE name="OriB_YSO_candidates">
    <DESCRIPTION>Orion B YSO candidates - working list (2MASS+AllWISE+Spitzer selection, Gutermuth-like colour cuts), last edited 2026-11-09</DESCRIPTION>
    <COOSYS ID="J2000" system="ICRS"/>
    <TABLE name="OriB_YSO_candidates_v7">
${F.map(([n, t, u, ucd]) => `      <FIELD name="${n}" datatype="${t}"${t === 'char' ? ' arraysize="*"' : ''}${u ? ` unit="${u}"` : ''} ucd="${ucd}"/>`).join('\n')}
      <DATA><TABLEDATA>
${yso.map(y => '        <TR>' + [y.id, y.twomass, y.ra, y.dec, y.region, y.cls, y.Jmag, y.Kmag, y.W1W2, y.alpha, y.Av, y.SpT, y.status, y.last_obs, y.comment].map(v => `<TD>${esc(v)}</TD>`).join('') + '</TR>').join('\n')}
      </TABLEDATA></DATA>
    </TABLE>
  </RESOURCE>
</VOTABLE>
`;
fs.writeFileSync(path.join(OUT, 'orion_yso_candidates.xml'), vot);

// ------------------------------------------------------------------ 2. Observation footprints (MUSE / KMOS / NIRCam pointings)
function rect(ra, dec, wDeg, hDeg, paDeg) {
    const pa = paDeg * D2R, c = Math.cos(dec * D2R);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
        const dx = x * wDeg / 2, dy = y * hDeg / 2;
        const rx = dx * Math.cos(pa) - dy * Math.sin(pa), ry = dx * Math.sin(pa) + dy * Math.cos(pa);
        return [+(ra + rx / c).toFixed(6), +(dec + ry).toFixed(6)];
    });
}
const PLANS = [
    { inst: 'VLT/MUSE WFM', prog: '114.27HQ.001', w: 1 / 60, h: 1 / 60, color: '#4fd1ff' },
    { inst: 'VLT/KMOS', prog: '114.27HQ.002', w: 2.8 / 60, h: 2.8 / 60, color: '#ffb347' },
    { inst: 'JWST/NIRCam', prog: 'GO 5871', w: 2.2 / 60 * 2.1, h: 2.2 / 60, color: '#b388ff' },
    { inst: 'CFHT/WIRCam', prog: '26BF12', w: 20 / 60, h: 20 / 60, color: '#7CFC00' },
];
const FSTATE = ['executed', 'executed', 'executed', 'scheduled', 'scheduled', 'submitted', 'not started', 'failed QC (seeing 1.6")', 'executed (partial, 2/3 OBs)'];
const footprints = [];
const anchors = [[85.4208, -1.905], [85.3125, -2.235], [85.245, -2.46], [84.6865, -2.60], [85.19, -1.94], [85.10, -2.30], [84.98, -1.75], [85.55, -2.05]];
for (let i = 0; i < 46; i++) {
    const p = i < 18 ? PLANS[0] : i < 32 ? PLANS[1] : i < 42 ? PLANS[2] : PLANS[3];
    const [ara, adec] = pick(anchors);
    const spread = p === PLANS[3] ? 0.25 : 0.06;
    const ra = ara + gauss() * spread, dec = adec + gauss() * spread;
    const state = pick(FSTATE);
    footprints.push({
        name: `${p.inst.split('/')[1]}-${String(i + 1).padStart(2, '0')}`, inst: p.inst, prog: p.prog, state,
        date: state.startsWith('executed') || state.startsWith('failed') ? day('2025-10-01', 380) : day('2026-11-20', 150),
        color: p.color, dashed: !state.startsWith('executed'), vertices: rect(ra, dec, p.w, p.h, p === PLANS[2] ? 32 : Math.floor(rnd() * 4) * 15),
    });
}
fs.writeFileSync(path.join(OUT, 'footprints.json'), JSON.stringify(footprints, null, 1));

// ------------------------------------------------------------------ 3. Personal annotations (markers)
const NOTES = [
    [85.2458, -2.4583, 'Horsehead (B33) - PDR edge', 'Best MUSE pointing so far: 2026-01-18, seeing 0.62". Compare [S II]/Halpha ratio along the ridge with the Pabst+2017 slit.'],
    [85.4208, -1.9050, 'NGC 2024 core', 'IRS 2b is the main ionising source, NOT IRS 2. JWST GO 5871 obs 3 lands here (Feb 2027 window).'],
    [85.3125, -2.2350, 'NGC 2023', 'HD 37903 reflection nebula. KMOS IFUs arranged around the star, avoid the saturated core.'],
    [84.6865, -2.6000, 'sigma Ori cluster', 'Disk census done (~38 class II). TODO: cross-match with the 2MASS/AllWISE list v7 before the telecon.'],
    [85.1897, -1.9426, 'Alnitak glare', 'zeta Ori (V=1.8) - mask r < 4\' in every catalogue cut; ghosts in WIRCam frames.'],
    [85.3440, -2.3010, 'HH 92 jet?', 'Knot seen in Halpha+[S II] from the Dec 2025 run. Proper motion check vs 2008 ACS image.'],
    [85.0410, -2.0360, 'Possible new Bok globule', 'Dark patch in DSS2 + no WISE emission. Ask Jaime whether it is in the Dobashi catalogue.'],
    [85.4630, -1.8360, 'NGC 2024 FIR-5', 'ALMA band 7 continuum peak (Cycle 11 data). Multiplicity?'],
    [84.9050, -2.4840, 'Background galaxy contaminant', 'OriB-YSO-147 is a spiral at z~0.04 - rejected, keep for the paper appendix.'],
    [85.6000, -2.6200, 'Edge of WIRCam mosaic', 'Gap between pointings 26BF12-07 and -08, re-observe in 2027A.'],
    [84.7750, -2.2470, 'IC 431', 'Small reflection nebula, low priority.'],
    [85.1600, -2.7400, 'IC 432', 'Check MUSE archive (ESO 0102.C-0599).'],
];
fs.writeFileSync(path.join(OUT, 'notes.json'), JSON.stringify(NOTES.map(([ra, dec, title, desc], i) => ({ ra, dec, title, desc, added: day('2025-08-01', 460) })), null, 1));

// ------------------------------------------------------------------ 4. Session meta
fs.writeFileSync(path.join(OUT, 'session.json'), JSON.stringify({
    title: 'Orion B YSO follow-up', target: '05 38 58.0 -01 59 00', fov: 3.6,
    simbad: { ra: 85.0, dec: -2.2, radius: 1.6 },
    gaia: { target: '85.36 -2.05', radius: 0.2 },
    mocCones: [
        { name: 'KMOS 2026B coverage', ra: 85.38, dec: -2.05, radius: 0.32, color: '#ffb347' },
    ],
}, null, 1));

console.log(`session: ${yso.length} YSO rows, ${footprints.length} footprints, ${NOTES.length} notes -> ${OUT}`);
