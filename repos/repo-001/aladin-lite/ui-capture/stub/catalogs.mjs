// VOTable generators standing in for SIMBAD / VizieR / NED cone searches.
// Sources are deterministic (seeded by cone position) so repeated queries return the same rows.
import { OBJECTS } from './objects.mjs';

function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function conePos(q) {
    let ra = parseFloat(q.get('RA') ?? q.get('ra') ?? q.get('-c.ra'));
    let dec = parseFloat(q.get('DEC') ?? q.get('dec') ?? q.get('-c.dec'));
    let sr = parseFloat(q.get('SR') ?? q.get('sr') ?? q.get('-c.rd') ?? '0.1');
    const c = q.get('-c');
    if (isNaN(ra) && c && /[a-zA-Z]/.test(c)) {
        const n = c.toLowerCase().replace(/[\s_-]+/g, '');
        const o = OBJECTS.find(o => [o.name, ...(o.aliases || [])].some(x => x.toLowerCase().replace(/[\s_-]+/g, '') === n));
        if (o) { ra = o.ra; dec = o.dec; }
    } else if (isNaN(ra) && c) { const m = c.trim().split(/[\s,+]+/).map(Number); ra = m[0]; dec = (c.includes('-', 1) ? -1 : 1) * Math.abs(m[1]); }
    const rs = q.get('-c.rs'); if (rs) sr = parseFloat(rs) / 3600;
    const rm = q.get('-c.rm'); if (rm) sr = parseFloat(rm) / 60;
    return [isNaN(ra) ? 0 : ra, isNaN(dec) ? 0 : dec, isNaN(sr) ? 0.1 : Math.min(sr, 5)];
}
function randomInCone(r, ra, dec, sr) {
    const rho = sr * Math.sqrt(r()), th = 2 * Math.PI * r();
    const d = dec + rho * Math.sin(th);
    const a = ra + rho * Math.cos(th) / Math.max(0.05, Math.cos(dec * Math.PI / 180));
    return [((a % 360) + 360) % 360, Math.max(-89.999, Math.min(89.999, d))];
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function votable(name, desc, fields, rows) {
    const f = fields.map(([n, t, u, ucd, w]) => `      <FIELD name="${n}" datatype="${t}"${u ? ` unit="${u}"` : ''}${ucd ? ` ucd="${ucd}"` : ''}${t === 'char' ? ' arraysize="*"' : ''}${w ? ` width="${w}"` : ''}/>`).join('\n');
    const tr = rows.map(r => '        <TR>' + r.map(v => `<TD>${v === null || v === undefined ? '' : esc(v)}</TD>`).join('') + '</TR>').join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<VOTABLE version="1.4" xmlns="http://www.ivoa.net/xml/VOTable/v1.3">
  <RESOURCE type="results">
    <INFO name="QUERY_STATUS" value="OK"/>
    <TABLE name="${esc(name)}">
      <DESCRIPTION>${esc(desc)}</DESCRIPTION>
${f}
      <DATA><TABLEDATA>
${tr}
      </TABLEDATA></DATA>
    </TABLE>
  </RESOURCE>
</VOTABLE>`;
}

const OTYPES = ['*', '*', '*', '*', 'PM*', 'V*', 'EB*', 'YSO', 'Em*', 'G', 'G', 'IR', 'X', 'RR*', 'WD*', 'HII', 'PN', 'Rad', 'QSO', 'BD*'];
const SPT = ['G2V', 'K0III', 'M3V', 'A0V', 'F5V', 'B2IV', 'K5V', 'M1III', 'G8III', '', '', 'O9.5V'];

export function simbadConeVOTable(q) {
    const [ra, dec, sr] = conePos(q);
    const r = rng(Math.round(ra * 1000) * 7919 + Math.round(dec * 1000) * 104729);
    const rows = [];
    for (const o of OBJECTS) {
        const dd = Math.hypot((o.ra - ra) * Math.cos(dec * Math.PI / 180), o.dec - dec);
        if (dd <= sr) rows.push([o.name, o.ra.toFixed(6), o.dec.toFixed(6), o.otype, o.vmag ?? '', '', 'A', 1 + Math.floor(r() * 3000)]);
    }
    const n = Math.min(400, Math.round(60 + 900 * Math.min(1, sr * sr * 4)));
    for (let i = 0; i < n; i++) {
        const [a, d] = randomInCone(r, ra, dec, sr);
        const ot = OTYPES[Math.floor(r() * OTYPES.length)];
        let id;
        const k = r();
        if (ot === 'G' || ot === 'QSO') id = k < 0.5 ? `LEDA ${Math.floor(1e4 + r() * 4e6)}` : `2MASX J${fmtJ(a, d)}`;
        else if (ot === 'X') id = `4XMM J${fmtJ(a, d)}`;
        else if (ot === 'Rad') id = `NVSS J${fmtJ(a, d).slice(0, 13)}`;
        else if (k < 0.45) id = `Gaia DR3 ${Math.floor(1e18 + r() * 5e18)}`;
        else if (k < 0.7) id = `TYC ${Math.floor(1 + r() * 9500)}-${Math.floor(1 + r() * 2500)}-1`;
        else if (k < 0.85) id = `2MASS J${fmtJ(a, d)}`;
        else id = `HD ${Math.floor(1000 + r() * 230000)}`;
        const v = ot === 'G' ? (13 + r() * 5).toFixed(2) : (7 + r() * 11).toFixed(2);
        rows.push([id, a.toFixed(6), d.toFixed(6), ot, r() < 0.8 ? v : '', ot.endsWith('*') || ot === '*' ? SPT[Math.floor(r() * SPT.length)] : '', 'ABCDE'[Math.floor(r() * 5)], Math.floor(r() * 40)]);
    }
    return votable('basic', 'SIMBAD cone search', [
        ['main_id', 'char', '', 'meta.id;meta.main'], ['ra', 'double', 'deg', 'pos.eq.ra;meta.main'], ['dec', 'double', 'deg', 'pos.eq.dec;meta.main'],
        ['main_type', 'char', '', 'src.class'], ['V', 'double', 'mag', 'phot.mag;em.opt.V'], ['sp_type', 'char', '', 'src.spType'],
        ['coo_qual', 'char', '', 'meta.code.qual;pos'], ['nbref', 'int', '', 'meta.bib;meta.number'],
    ], rows);
}

function fmtJ(a, d) {
    const h = a / 15, hh = Math.floor(h), mm = Math.floor((h - hh) * 60), ss = (((h - hh) * 60 - mm) * 60);
    const ad = Math.abs(d), dd = Math.floor(ad), dm = Math.floor((ad - dd) * 60), ds = Math.floor(((ad - dd) * 60 - dm) * 60);
    const p = (v, n) => String(v).padStart(n, '0');
    return `${p(hh, 2)}${p(mm, 2)}${ss.toFixed(2).padStart(5, '0')}${d < 0 ? '-' : '+'}${p(dd, 2)}${p(dm, 2)}${p(ds, 2)}`;
}

export function coneVOTable(host, p, q) {
    const [ra, dec, sr] = conePos(q);
    const src = (q.get('-source') || p.split('conesearch/')[1] || 'I/355/gaiadr3').replace(/\?$/, '');
    const r = rng(Math.round(ra * 997) + Math.round(dec * 991) * 31 + src.length * 7);
    const n = Math.min(1500, Math.round(120 + 2600 * Math.min(1, sr * sr * 4)));
    const rows = [];
    if (/2MASS|II\/246/i.test(src)) {
        for (let i = 0; i < n; i++) {
            const [a, d] = randomInCone(r, ra, dec, sr);
            const j = 9 + r() * 7.5, h = j - 0.2 - r() * 0.6, k = h - 0.05 - r() * 0.4;
            rows.push([a.toFixed(6), d.toFixed(6), fmtJ(a, d).replace('.', '').slice(0, 16), j.toFixed(3), (0.02 + r() * 0.1).toFixed(3), h.toFixed(3), (0.02 + r() * 0.12).toFixed(3), k.toFixed(3), (0.02 + r() * 0.15).toFixed(3), ['AAA', 'AAA', 'AAB', 'ABC', 'AAU'][Math.floor(r() * 5)]]);
        }
        return votable('II/246/out', '2MASS All-Sky Catalog of Point Sources (Cutri+ 2003)', [
            ['RAJ2000', 'double', 'deg', 'pos.eq.ra;meta.main'], ['DEJ2000', 'double', 'deg', 'pos.eq.dec;meta.main'], ['2MASS', 'char', '', 'meta.id;meta.main'],
            ['Jmag', 'float', 'mag', 'phot.mag;em.IR.J'], ['e_Jmag', 'float', 'mag', 'stat.error'], ['Hmag', 'float', 'mag', 'phot.mag;em.IR.H'], ['e_Hmag', 'float', 'mag', 'stat.error'],
            ['Kmag', 'float', 'mag', 'phot.mag;em.IR.K'], ['e_Kmag', 'float', 'mag', 'stat.error'], ['Qflg', 'char', '', 'meta.code.qual'],
        ], rows);
    }
    for (let i = 0; i < n; i++) {
        const [a, d] = randomInCone(r, ra, dec, sr);
        const g = 10 + 11 * Math.pow(r(), 0.45);
        const bprp = 0.3 + r() * 2.4;
        const plx = Math.abs(0.05 + (r() ** 3) * 8);
        rows.push([Math.floor(1e18 + r() * 5e18).toString(), a.toFixed(8), d.toFixed(8), plx.toFixed(4), (0.01 + g / 500).toFixed(4), ((r() - 0.5) * 30).toFixed(3), ((r() - 0.5) * 30).toFixed(3), g.toFixed(4), bprp.toFixed(4), r() < 0.15 ? (r() * 120 - 60).toFixed(2) : '', r() < 0.3 ? (3500 + r() * 6000).toFixed(1) : '']);
    }
    return votable('I/355/gaiadr3', 'Gaia DR3 Part 1. Main source (Gaia Collaboration, 2022)', [
        ['Source', 'char', '', 'meta.id;meta.main'], ['RA_ICRS', 'double', 'deg', 'pos.eq.ra;meta.main'], ['DE_ICRS', 'double', 'deg', 'pos.eq.dec;meta.main'],
        ['Plx', 'double', 'mas', 'pos.parallax.trig'], ['e_Plx', 'float', 'mas', 'stat.error'], ['pmRA', 'double', 'mas/yr', 'pos.pm;pos.eq.ra'], ['pmDE', 'double', 'mas/yr', 'pos.pm;pos.eq.dec'],
        ['Gmag', 'double', 'mag', 'phot.mag;em.opt'], ['BP-RP', 'double', 'mag', 'phot.color'], ['RV', 'double', 'km/s', 'spect.dopplerVeloc.opt'], ['Teff', 'double', 'K', 'phys.temperature.effective'],
    ], rows);
}
