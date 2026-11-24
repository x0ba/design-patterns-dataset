import type { Analysis, RuleNode, SectionId } from '../engine/model';
import type { Note } from '../data/history';
import { AMENDED_CITE, SECTIONS } from '../data/spec';
import { citeById, isAffected } from './ui';

interface Props {
  nodes: RuleNode[];
  analysis: Analysis;
  section: SectionId | 'all';
  onSection: (s: SectionId | 'all') => void;
  notes: Note[];
  onNote: (nodeId: string) => void;
  onAttachAmended: () => void;
  counts: { notes: number; revisions: number };
}

export function Sidebar({ nodes, analysis, section, onSection, notes, onNote, onAttachAmended, counts }: Props) {
  const affected = nodes.filter(isAffected);
  const cited = affected.filter((n) => n.cites.includes(AMENDED_CITE));
  const unattached = affected.length - cited.length;
  const amended = citeById.get(AMENDED_CITE)!;

  return (
    <aside className="sidebar">
      <div className="side-block">
        <div className="stats">
          <Stat label="Steps" value={nodes.length} />
          <Stat label="Connections" value={analysis.edgeCount} />
          <Stat label="Revisions" value={counts.revisions} />
          <Stat label="Open notes" value={counts.notes} />
        </div>
        <div className="muted small">Parameters effective 2026-10-01</div>
      </div>

      <div className="side-block">
        <div className="side-title">Sections</div>
        <ul className="section-list">
          <li>
            <button className={`section-item ${section === 'all' ? 'active' : ''}`} onClick={() => onSection('all')}>
              <span>All steps</span>
              <span className="count">{nodes.length}</span>
            </button>
          </li>
          {SECTIONS.map((s) => {
            const inSec = nodes.filter((n) => n.section === s.id);
            const errs = inSec.filter((n) => analysis.issues[n.id]?.length).length;
            return (
              <li key={s.id}>
                <button className={`section-item ${section === s.id ? 'active' : ''}`} onClick={() => onSection(s.id)}>
                  <span>{s.label}</span>
                  <span className="count-wrap">
                    {errs > 0 && <span className="err-count">{errs} error{errs === 1 ? '' : 's'}</span>}
                    <span className="count">{inSec.length}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="side-block amend-block">
        <div className="side-title">2025 amendment</div>
        <div className="amend-cite">{amended.cite}</div>
        <div className="small">{amended.title}</div>
        <ul className="affected-list">
          {affected.map((n) => {
            const ok = n.cites.includes(AMENDED_CITE);
            return (
              <li key={n.id}>
                <span className={`dot ${ok ? 'ok' : 'todo'}`} aria-hidden="true" />
                <code>{n.id}</code>
                <span className="muted small">{ok ? 'cites amendment' : 'not cited'}</span>
              </li>
            );
          })}
        </ul>
        <div className="small muted">
          {cited.length} of {affected.length} affected steps cite the amendment.
        </div>
        <button className="btn small-btn" disabled={unattached === 0} onClick={onAttachAmended}>
          {unattached === 0 ? 'All affected steps cite it' : `Attach to ${unattached} unattached step${unattached === 1 ? '' : 's'}`}
        </button>
        <div className="fine muted">Demo paraphrase in the registry. Check wording against the official text.</div>
      </div>

      <div className="side-block">
        <div className="side-title">Open notes</div>
        {notes.length === 0 && <div className="muted small">No open notes.</div>}
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.id}>
              <button className="note-item" onClick={() => onNote(n.nodeId)}>
                <code>{n.nodeId}</code>
                <span className="small">{n.thread[0].text.slice(0, 84)}…</span>
                <span className="fine muted">
                  {n.thread[0].author} · {n.thread[0].at}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
