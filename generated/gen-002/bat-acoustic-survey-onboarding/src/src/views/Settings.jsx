import React from 'react';
import { DETECTORS, FILES, FILE_BY_ID, LABELS, PROJECT, nf } from '../data.js';
import { WhatIf } from './Guide.jsx';
import { Icon } from '../ui.jsx';

const PATTERNS = { 'HR-01': 'HR01_YYYYMMDD_HHMMSS.wav', 'HR-02': 'HR02_YYYYMMDD_HHMMSS.wav', 'HR-03': 'HR03_YYYYMMDD_HHMMSS.wav' };
const HEIGHT = { 'HR-01': '50 m', 'HR-02': '3 m', 'HR-03': '2 m' };

export default function Settings({ ctx }) {
  const { applied, vetted, info, say } = ctx;
  const nVet = Object.keys(vetted).length;
  const agree = Object.entries(vetted).filter(([id, x]) => x.label === info[FILE_BY_ID[id].i].auto).length;
  const methods =
    `Recordings from ${DETECTORS.length} detectors (${DETECTORS.map((d) => d.id).join(', ')}) over the nights of ${PROJECT.nights.join(', ')} 2026 were analysed in Echolog with the ${PROJECT.pack} classifier pack. ` +
    `Noise filter: signal threshold ${applied.thr} dB, minimum ${applied.minCalls} calls per sequence, minimum call frequency ${applied.minFreq} kHz. ` +
    (nVet ? `${nf(nVet)} files were reviewed manually; the reviewer agreed with the automatic label for ${Math.round((agree / nVet) * 100)}% of them. ` : 'No files have been reviewed manually yet. ') +
    'Counts are numbers of recordings, not bat passes.';
  const copy = async () => {
    try { await navigator.clipboard.writeText(methods); say('Methods text copied.'); } catch { say('Copy is blocked in this browser. Select the text and copy it manually.'); }
  };
  return (
    <div className="page">
      <div className="page-h"><div><h1>Settings</h1><p className="muted">Applies to the whole project. Applying re-runs the classifier on every file and keeps your vetted labels.</p></div></div>
      <WhatIf ctx={ctx} compact />

      <div className="two">
        <section className="card">
          <div className="card-h"><h2>Classifier pack</h2><span className="chip ok">Active</span></div>
          <p><b>{PROJECT.pack}</b></p>
          <p className="muted">Outputs for this pack:</p>
          <ul className="legend plain">
            {['myotis', 'redbat', 'hoary', 'bbsh'].map((k) => <li key={k}><i style={{ background: LABELS[k].color }} /><span>{LABELS[k].name}</span><small className="code">{LABELS[k].code}</small></li>)}
          </ul>
          <p className="muted small">Changing the pack re-runs every file, so do it before vetting.</p>
        </section>
        <section className="card">
          <div className="card-h"><h2>Methods text for the report</h2></div>
          <p className="methods">{methods}</p>
          <button className="btn" onClick={copy}>Copy text</button>
        </section>
      </div>

      <section className="card flush">
        <div className="card-h pad"><h2>Detector profiles</h2><span className="muted">Rate is read from each file’s header and checked against the profile.</span></div>
        <table className="data">
          <thead><tr><th>Detector</th><th>Site</th><th>Mic height</th><th className="r">Sample rate</th><th className="r">Time expansion</th><th>Filename pattern</th><th className="r">Header match</th></tr></thead>
          <tbody>
            {DETECTORS.map((d) => {
              const n = FILES.filter((f) => f.det === d.id).length;
              return (
                <tr key={d.id}>
                  <td><b>{d.id}</b></td><td>{d.name}</td><td>{HEIGHT[d.id]}</td><td className="r">{d.sr} kHz</td><td className="r">×1</td>
                  <td className="mono">{PATTERNS[d.id]}</td>
                  <td className="r"><span className="okline"><Icon name="check" size={14} /> {nf(n)} of {nf(n)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
