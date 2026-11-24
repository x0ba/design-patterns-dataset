import { Download, GitCompareArrows, Redo2, Undo2, Save } from 'lucide-react';

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  compareOn: boolean;
  onCompare: () => void;
  onExport: () => void;
  onSaveVersion: () => void;
  saved: string;
  issues: number;
}

export default function TopBar(p: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
          <rect width="32" height="32" rx="7" fill="#211d18" />
          <path d="M22 11a7 7 0 1 0 1 6h-7" fill="none" stroke="#e0b448" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="wordmark">Gildmark</span>
      </div>
      <div className="crumb">
        <div className="crumb-title">Hollis &amp; Daughter Bakery <span>/</span> Front window</div>
        <div className="crumb-sub">
          <span className="tag">Working copy</span>
          <span>Revisions: 1 of 2 used · quote $1,850</span>
          <span className="saved">● {p.saved}</span>
        </div>
      </div>
      <div className="top-actions">
        <div className="btn-group">
          <button className="icon-btn" aria-label="Undo" title="Undo (⌘Z)" disabled={!p.canUndo} onClick={p.onUndo}><Undo2 size={17} /></button>
          <button className="icon-btn" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!p.canRedo} onClick={p.onRedo}><Redo2 size={17} /></button>
        </div>
        <button className={`btn${p.compareOn ? ' active' : ''}`} aria-pressed={p.compareOn} onClick={p.onCompare}>
          <GitCompareArrows size={15} /> Compare Nov 12
        </button>
        <button className="btn" onClick={p.onSaveVersion}>
          <Save size={15} /> Save version
        </button>
        <button className="btn primary" onClick={p.onExport}>
          <Download size={15} /> Export pattern
          {p.issues > 0 && <span className="count-pip" title={`${p.issues} open problem`}>{p.issues}</span>}
        </button>
        <div className="avatar" title="Rosa Villanueva">RV</div>
      </div>
    </header>
  );
}
