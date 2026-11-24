import React, { useMemo } from 'react';
import { FILES, FILE_BY_ID, DETECTORS, LABELS, LABEL_ORDER, REASONS, PROJECT, fmtClock, fmtDay, nf, pct } from '../data.js';
import { Icon } from '../ui.jsx';

function download(name, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

export default function Results({ ctx }) {
  const { info, vetted, say, go, applied } = ctx;
  const eff = (f) => vetted[f.id]?.label ?? info[f.i].auto;

  const t = useMemo(() => {
    const cells = {}; const auto = {}; const night = {};
    LABEL_ORDER.forEach((k) => { cells[k] = { all: 0 }; auto[k] = 0; DETECTORS.forEach((d) => (cells[k][d.id] = 0)); });
    DETECTORS.forEach((d) => { night[d.id] = [0, 1, 2].map(() => ({})); });
    for (const f of FILES) {
      const l = vetted[f.id]?.label ?? info[f.i].auto;
      cells[l][f.det]++; cells[l].all++; auto[info[f.i].auto]++;
      night[f.det][f.night][l] = (night[f.det][f.night][l] || 0) + 1;
    }
    return { cells, auto, night };
  }, [info, vetted]);

  const nVet = Object.keys(vetted).length;
  const agree = Object.entries(vetted).filter(([id, x]) => x.label === info[FILE_BY_ID[id].i].auto).length;
  const detTotals = Object.fromEntries(DETECTORS.map((d) => [d.id, FILES.filter((f) => f.det === d.id).length]));
  const batFiles = FILES.length - t.cells.noise.all;

  const exportFiles = () => {
    const head = ['file', 'detector', 'night', 'recorded', 'sample_rate_khz', 'duration_s', 'calls', 'signal_db', 'peak_khz', 'echolog_label', 'rejected_by', 'confidence_pct', 'vetted_label', 'final_label'];
    const lines = [head.join(',')];
    for (const f of FILES) {
      const i = info[f.i]; const v = vetted[f.id];
      lines.push([
        f.name, f.det, PROJECT.nights[f.night], `${fmtDay(f.ts)} ${fmtClock(f.ts)}`, f.sr, f.dur.toFixed(1), f.calls, f.snr.toFixed(1), f.fpk.toFixed(1),
        LABELS[i.auto].name, i.reason ? REASONS[i.reason].short : '', i.reason || f.conf == null ? '' : Math.round(f.conf * 100),
        v ? LABELS[v.label].name : '', LABELS[eff(f)].name,
      ].map(csvCell).join(','));
    }
    download('hollins-ridge-wind_files_2026-11-16.csv', lines.join('\n'));
    say(`Downloaded ${nf(FILES.length)} rows, with Echolog and vetted labels side by side.`);
  };
  const exportSummary = () => {
    const lines = [['label', ...DETECTORS.map((d) => d.id), 'all_detectors', 'echolog_label_total'].join(',')];
    LABEL_ORDER.forEach((k) => lines.push([LABELS[k].name, ...DETECTORS.map((d) => t.cells[k][d.id]), t.cells[k].all, t.auto[k]].map(csvCell).join(',')));
    lines.push(['Total files', ...DETECTORS.map((d) => detTotals[d.id]), FILES.length, FILES.length].join(','));
    download('hollins-ridge-wind_summary_2026-11-16.csv', lines.join('\n'));
    say('Downloaded the species-by-detector summary.');
  };

  const maxNight = Math.max(1, ...DETECTORS.flatMap((d) => t.night[d.id].map((n) => ['myotis', 'redbat', 'hoary', 'bbsh', 'unclass'].reduce((s, k) => s + (n[k] || 0), 0))));
  const yMax = Math.ceil(maxNight / 100) * 100;
  const BAT = ['myotis', 'redbat', 'hoary', 'bbsh', 'unclass'];

  return (
    <div className="page">
      <div className="page-h">
        <div>
          <h1>Results</h1>
          <p className="muted">Counts are files. Where you have vetted a file, your label replaces Echolog’s.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={exportSummary}><Icon name="download" size={16} /> Summary CSV</button>
          <button className="btn primary" onClick={exportFiles}><Icon name="download" size={16} /> All files CSV</button>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat"><span>Bat files</span><b>{nf(batFiles)}</b><small>{pct(batFiles, FILES.length, 1)} of {nf(FILES.length)}</small></div>
        <div className="stat"><span>Noise</span><b>{nf(t.cells.noise.all)}</b><small>{pct(t.cells.noise.all, FILES.length, 1)} of files</small></div>
        <div className="stat"><span>Vetted by you</span><b>{nf(nVet)}</b><small>{nVet ? `${Math.round((agree / nVet) * 100)}% agree with Echolog` : 'None yet'}</small></div>
        <div className="stat"><span>Settings</span><b className="sm">{applied.thr} dB · {applied.minCalls} calls · {applied.minFreq} kHz</b><small>{PROJECT.pack}</small></div>
      </div>

      {nVet < 60 && (
        <div className="callout warn">
          <Icon name="alert" size={16} />
          <p>{nVet === 0 ? 'No files vetted yet, so every number below is an unchecked Echolog label.' : `Only ${nVet} ${nVet === 1 ? 'file' : 'files'} vetted.`} An interim report normally quotes a vetted QA sample alongside the counts.{' '}
            <button className="link" onClick={() => go('vetting', { vet: { queue: 'qa' } })}>Vet the 60-file QA sample</button></p>
        </div>
      )}

      <section className="card flush">
        <div className="card-h pad"><h2>Species by detector</h2><span className="muted">Files, after vetting</span></div>
        <table className="data matrix">
          <thead>
            <tr><th>Label</th>{DETECTORS.map((d) => <th key={d.id} className="r">{d.id}<small>{d.name}</small></th>)}<th className="r">All detectors</th><th className="r">Share of bat files</th><th className="r">Changed by vetting</th></tr>
          </thead>
          <tbody>
            {LABEL_ORDER.map((k) => {
              const delta = t.cells[k].all - t.auto[k];
              return (
                <tr key={k} className={k === 'noise' ? 'muted-row' : ''}>
                  <td><span className="lchip"><i style={{ background: LABELS[k].color }} />{LABELS[k].name}</span> <small className="code">{LABELS[k].code}</small></td>
                  {DETECTORS.map((d) => <td key={d.id} className="r num">{nf(t.cells[k][d.id])}</td>)}
                  <td className="r num"><b>{nf(t.cells[k].all)}</b></td>
                  <td className="r num">{k === 'noise' ? <span className="muted">—</span> : pct(t.cells[k].all, batFiles, 1)}</td>
                  <td className="r num">{delta === 0 ? <span className="muted">0</span> : <b className={delta > 0 ? 'pos' : 'neg'}>{delta > 0 ? '+' : '−'}{Math.abs(delta)}</b>}</td>
                </tr>
              );
            })}
            <tr className="total">
              <td>Total files</td>{DETECTORS.map((d) => <td key={d.id} className="r num">{nf(detTotals[d.id])}</td>)}<td className="r num">{nf(FILES.length)}</td><td /><td />
            </tr>
            <tr className="muted-row">
              <td>Noise share</td>{DETECTORS.map((d) => <td key={d.id} className="r num">{pct(t.cells.noise[d.id], detTotals[d.id])}</td>)}<td className="r num">{pct(t.cells.noise.all, FILES.length)}</td><td /><td />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="card-h"><h2>Nightly activity by detector</h2><span className="muted">Bat files per night, noise excluded</span></div>
        <div className="nights">
          {DETECTORS.map((d) => (
            <figure key={d.id}>
              <figcaption><b>{d.id}</b> {d.name}</figcaption>
              <svg viewBox="0 0 300 170" role="img" aria-label={`${d.id} bat files per night`}>
                {[0, 0.5, 1].map((g) => (
                  <g key={g}>
                    <line x1="34" x2="292" y1={140 - g * 120} y2={140 - g * 120} stroke="#e3dfd3" />
                    <text x="28" y={144 - g * 120} textAnchor="end" className="ax">{Math.round(yMax * g)}</text>
                  </g>
                ))}
                {[0, 1, 2].map((n) => {
                  let y = 140;
                  const x = 52 + n * 82;
                  const total = BAT.reduce((s, k) => s + (t.night[d.id][n][k] || 0), 0);
                  return (
                    <g key={n}>
                      {BAT.map((k) => {
                        const h = ((t.night[d.id][n][k] || 0) / yMax) * 120;
                        y -= h;
                        return h > 0 ? <rect key={k} x={x} y={y} width="52" height={h} fill={LABELS[k].color}><title>{LABELS[k].name}: {t.night[d.id][n][k]}</title></rect> : null;
                      })}
                      <text x={x + 26} y={y - 5} textAnchor="middle" className="ax b">{total}</text>
                      <text x={x + 26} y="158" textAnchor="middle" className="ax">{PROJECT.nights[n]}</text>
                    </g>
                  );
                })}
              </svg>
            </figure>
          ))}
        </div>
        <ul className="legend inline">{BAT.map((k) => <li key={k}><i style={{ background: LABELS[k].color }} /><span>{LABELS[k].name}</span></li>)}</ul>
      </section>
    </div>
  );
}
