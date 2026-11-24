import { useState } from 'react';

function Badges({ counts }) {
  if (!counts) return null;
  return (
    <span className="badges">
      {counts.errors > 0 && (
        <span className="badge badge-error" title={`${counts.errors} error(s)`}>
          {counts.errors}
        </span>
      )}
      {counts.warnings > 0 && (
        <span className="badge badge-warning" title={`${counts.warnings} warning(s)`}>
          {counts.warnings}
        </span>
      )}
      {counts.notices > 0 && (
        <span className="badge badge-notice" title={`${counts.notices} notice(s)`}>
          {counts.notices}
        </span>
      )}
    </span>
  );
}

export default function Sidebar({
  project,
  steps,
  doneCount,
  totalSteps,
  groups,
  pages,
  selected,
  settingsOpen,
  issuesByPage,
  onSelectPage,
  onRunStep,
  onOpenSettings,
}) {
  const [checklistOpen, setChecklistOpen] = useState(true);
  const nextStep = steps.find((s) => !s.done);

  return (
    <aside className="sidebar">
      <div className="project">
        <div className="project-name">{project.name}</div>
        <div className="project-meta">
          {project.repo}
        </div>
        <div className="project-meta">
          {project.license} license · ★ {project.stars}
        </div>
      </div>

      <section className="checklist" aria-label="Setup checklist">
        <button
          className="checklist-head"
          aria-expanded={checklistOpen}
          onClick={() => setChecklistOpen((open) => !open)}
        >
          <span>Setup</span>
          <span className="checklist-count">
            {doneCount} of {totalSteps} done {checklistOpen ? '▾' : '▸'}
          </span>
        </button>
        <div className="progress" aria-hidden="true">
          <div style={{ width: `${(doneCount / totalSteps) * 100}%` }} />
        </div>
        {checklistOpen && (
          <ol className="steps">
            {steps.map((step, index) => (
              <li key={step.id} className={step.done ? 'done' : step === nextStep ? 'next' : ''}>
                <button disabled={step.done} onClick={() => onRunStep(step)}>
                  <span className="step-mark" aria-hidden="true">
                    {step.done ? '✓' : index + 1}
                  </span>
                  <span className="step-text">
                    <strong>{step.label}</strong>
                    <small>{step.detail}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <nav className="pagelist" aria-label="Pages">
        {groups.map((group) => (
          <div className="group" key={group}>
            <h3>{group}</h3>
            <ul>
              {pages
                .filter((page) => page.group === group)
                .map((page) => (
                  <li key={page.slug}>
                    <button
                      className={`page-link ${!settingsOpen && selected === page.slug ? 'active' : ''}`}
                      onClick={() => onSelectPage(page.slug)}
                    >
                      <span className="page-title">{page.title}</span>
                      <Badges counts={issuesByPage[page.slug]} />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>

      <button className={`settings-link ${settingsOpen ? 'active' : ''}`} onClick={onOpenSettings}>
        Site settings
      </button>
    </aside>
  );
}
