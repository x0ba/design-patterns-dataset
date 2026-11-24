import { useState } from 'react';
import { CircleCheck, Eye, EyeOff, GitCompareArrows, History, Layers, Lock, OctagonAlert, Plus, TriangleAlert, Type, Unlock, Wheat } from 'lucide-react';
import { fmt, describeDiff, type Check } from '../model';
import type { Doc, El, Version } from '../types';

interface Props {
  doc: Doc;
  selected: string | null;
  checks: Check[];
  versions: Version[];
  compareId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string, patch: Partial<El>) => void;
  onAdd: () => void;
  onFix: (c: Check) => void;
  onCompare: (id: string | null) => void;
  onSaveVersion: () => void;
  onRestore: (v: Version) => void;
}

export default function LeftPanel(p: Props) {
  const [tab, setTab] = useState<'layers' | 'versions'>('layers');
  const errors = p.checks.filter((c) => c.level === 'error').length;
  const warns = p.checks.filter((c) => c.level === 'warn').length;
  return (
    <aside className="left">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'layers'} className={tab === 'layers' ? 'on' : ''} onClick={() => setTab('layers')}>
          <Layers size={14} /> Elements
        </button>
        <button role="tab" aria-selected={tab === 'versions'} className={tab === 'versions' ? 'on' : ''} onClick={() => setTab('versions')}>
          <History size={14} /> Versions
        </button>
      </div>
      {tab === 'layers' ? (
        <div className="left-scroll">
          <ul className="layers">
            {p.doc.elements.map((e) => (
              <li key={e.id}>
                <div
                  role="button"
                  tabIndex={0}
                  className={`layer${p.selected === e.id ? ' sel' : ''}${e.visible ? '' : ' hidden'}`}
                  onClick={() => p.onSelect(e.id)}
                  onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), p.onSelect(e.id))}
                >
                  <span className="layer-ico">{e.kind === 'ornament' ? <Wheat size={16} /> : <Type size={16} />}</span>
                  <span className="layer-main">
                    <span className="layer-name">{e.name}</span>
                    <span className="layer-sub">
                      {e.kind === 'ornament' ? 'Ornament' : e.lines.join(' / ')}
                    </span>
                    <span className="layer-meta">
                      <span className="mono">{fmt(e.cap)}″ {e.kind === 'ornament' ? 'tall' : 'cap'}</span>
                      {e.kind === 'text' && e.arc !== 0 && <span className="mono">· {fmt(e.arc)}° arc</span>}
                      <span className="chips" aria-label="Finishes">
                        <i className={`chip ${e.fill === 'gold' ? 'gold on' : e.fill === 'enamel' ? 'ink on' : ''}`} title={e.fill === 'gold' ? 'Gold leaf fill' : e.fill === 'enamel' ? 'Enamel fill' : 'Open (unfilled)'} />
                        <i className={`chip outline${e.outline.on ? ' on' : ''}`} title="Outline" />
                        <i className={`chip shade${e.shade.on ? ' on' : ''}`} title="Drop shade" />
                      </span>
                    </span>
                  </span>
                  <span className="layer-actions">
                    <button className="icon-btn" aria-label={e.visible ? `Hide ${e.name}` : `Show ${e.name}`} onClick={(ev) => (ev.stopPropagation(), p.onToggle(e.id, { visible: !e.visible }))}>
                      {e.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button className="icon-btn" aria-label={e.locked ? `Unlock ${e.name}` : `Lock ${e.name}`} onClick={(ev) => (ev.stopPropagation(), p.onToggle(e.id, { locked: !e.locked }))}>
                      {e.locked ? <Lock size={15} /> : <Unlock size={15} />}
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <button className="add-btn" onClick={p.onAdd}>
            <Plus size={14} /> Add lettering line
          </button>

          <div className="checks-head">
            <h3>Layout checks</h3>
            <span className={`badge ${errors ? 'error' : warns ? 'warn' : 'ok'}`}>
              {errors || warns ? `${errors + warns} to resolve` : 'All clear'}
            </span>
          </div>
          <ul className="checks">
            {p.checks.map((c) => (
              <li key={c.id} className={`check ${c.level}`}>
                <span className="check-ico">
                  {c.level === 'error' ? <OctagonAlert size={16} /> : c.level === 'warn' ? <TriangleAlert size={16} /> : <CircleCheck size={16} />}
                </span>
                <div>
                  <b>{c.title}</b>
                  <p>{c.detail}</p>
                  {(c.elementId || c.fix) && (
                    <div className="check-actions">
                      {c.fix && (
                        <button className="mini primary" onClick={() => p.onFix(c)}>
                          Move clear of bar
                        </button>
                      )}
                      {c.elementId && (
                        <button className="mini" onClick={() => p.onSelect(c.elementId!)}>
                          Select
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="left-scroll">
          <ul className="versions">
            <li className="version current">
              <div className="v-top">
                <b>Working copy</b>
                <span className="tag">Editing</span>
              </div>
              <p>Revision 1 applied · wording approved Nov 15</p>
            </li>
            {p.versions.map((v) => {
              const on = p.compareId === v.id;
              const diff = describeDiff(v.doc, p.doc);
              return (
                <li key={v.id} className={`version${on ? ' compare' : ''}`}>
                  <div className="v-top">
                    <b>
                      {v.label} · {v.date}
                    </b>
                  </div>
                  <p>{v.note}</p>
                  <div className="v-actions">
                    <button className={`mini${on ? ' primary' : ''}`} onClick={() => p.onCompare(on ? null : v.id)}>
                      <GitCompareArrows size={13} /> {on ? 'Hide overlay' : 'Compare overlay'}
                    </button>
                    <button className="mini" onClick={() => p.onRestore(v)}>
                      Restore
                    </button>
                  </div>
                  {on && (
                    <div className="diff">
                      <h4>Changed since {v.date}</h4>
                      {diff.length === 0 && <p>Identical to the working copy.</p>}
                      {diff.map((d) => (
                        <div key={d.id} className="diff-row">
                          <button className="link" onClick={() => p.onSelect(d.id)} disabled={d.kind === 'removed'}>
                            {d.name}
                          </button>
                          <ul>
                            {d.changes.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <button className="add-btn" onClick={p.onSaveVersion}>
            <Plus size={14} /> Save working copy as a version
          </button>
        </div>
      )}
    </aside>
  );
}
