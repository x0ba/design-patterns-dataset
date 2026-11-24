import { useMemo, useState } from 'react';
import { Download, OctagonAlert } from 'lucide-react';
import { buildPattern, SHEET, type PatternOpts } from '../pattern';
import type { Check } from '../model';
import type { Doc } from '../types';
import { Modal } from './ui';

interface Props {
  doc: Doc;
  checks: Check[];
  onClose: () => void;
  onFix: (id: string) => void;
  onExported: (file: string) => void;
}

export default function ExportDialog({ doc, checks, onClose, onFix, onExported }: Props) {
  const [o, setO] = useState<Omit<PatternOpts, 'preview'>>({ scale: 1, dotted: true, marks: true, hatch: true, reference: true, labels: true, shade: true });
  const issues = checks.filter((c) => c.level === 'error');
  const svg = useMemo(() => buildPattern(doc, { ...o, preview: true }), [doc, o]);
  const mirrored = doc.finishes.side === 'reverse';
  const ratio = o.scale === 1 ? '1to1' : o.scale === 0.5 ? '1to2' : '1to4';
  const file = `hollis-daughter-front-window-pattern-${ratio}${mirrored ? '-mirrored' : ''}.svg`;

  const download = () => {
    const out = buildPattern(doc, { ...o, preview: false });
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${out}`], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    onExported(file);
  };

  const Check = ({ k, label, hint }: { k: 'marks' | 'hatch' | 'reference' | 'labels' | 'shade'; label: string; hint: string }) => (
    <label className="chk">
      <input type="checkbox" checked={o[k]} onChange={(e) => setO({ ...o, [k]: e.target.checked })} />
      <span>
        <b>{label}</b>
        <small>{hint}</small>
      </span>
    </label>
  );

  return (
    <Modal
      title="Export pounce pattern"
      width={980}
      onClose={onClose}
      footer={
        <>
          <span className="foot-note">
            {o.dotted ? "Preview shows solid lines; the file is dotted. " : ""}Sheet {(SHEET.w * o.scale).toFixed(o.scale === 1 ? 0 : 1)} × {(SHEET.h * o.scale).toFixed(o.scale === 1 ? 0 : 1)} in · SVG, true scale
          </span>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={download}>
            <Download size={15} /> Download pattern
          </button>
        </>
      }
    >
      <div className="export-grid">
        <div className="preview" aria-label="Pattern preview" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="export-opts">
          {issues.length > 0 && (
            <div className="banner error">
              <OctagonAlert size={16} />
              <div>
                <b>{issues.length === 1 ? '1 layout problem is still open' : `${issues.length} layout problems are still open`}</b>
                <ul>
                  {issues.map((c) => (
                    <li key={c.id}>
                      {c.title}
                      {c.elementId && (
                        <button className="link" onClick={() => (onClose(), onFix(c.elementId!))}>
                          Go fix
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <small>You can still export, but the pattern will carry the problem onto the glass.</small>
              </div>
            </div>
          )}
          <h3>Scale</h3>
          <div className="seg" role="radiogroup" aria-label="Pattern scale">
            {[{ v: 1, l: '1:1 full size' }, { v: 0.5, l: '1:2' }, { v: 0.25, l: '1:4' }].map((s) => (
              <button key={s.v} role="radio" aria-checked={o.scale === s.v} className={o.scale === s.v ? 'on' : ''} onClick={() => setO({ ...o, scale: s.v })}>
                {s.l}
              </button>
            ))}
          </div>
          <h3>Pounce line</h3>
          <div className="seg" role="radiogroup" aria-label="Line style">
            <button role="radio" aria-checked={o.dotted} className={o.dotted ? 'on' : ''} onClick={() => setO({ ...o, dotted: true })}>Dotted, ⅛″ pitch</button>
            <button role="radio" aria-checked={!o.dotted} className={!o.dotted ? 'on' : ''} onClick={() => setO({ ...o, dotted: false })}>Solid hairline</button>
          </div>
          <h3>Reading direction</h3>
          <p className={`dir-note${mirrored ? ' warn' : ''}`}>
            {mirrored ? 'Mirrored — reverse-glass is gilded from the inside.' : 'Right-reading — surface gilded from the outside.'}
          </p>
          <h3>Include</h3>
          <div className="chk-list">
            <Check k="hatch" label="Hatch gold-leaf areas" hint={`${doc.finishes.leafKarat} leaf`} />
            <Check k="shade" label="Drop-shade edges" hint="Dashed offset line" />
            <Check k="reference" label="Push bar & glass line" hint="38–42 in keep-out, glass from 6 in" />
            <Check k="marks" label="Centre line & registration" hint="Crosshairs at corners and mid-point" />
            <Check k="labels" label="Element tags & key" hint="A, B, C… with sizes" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
