import { AXIS_OPTIONS, V4_DATES, V4_CHECKS, GRAPHICS, OTHER_PROJECTS } from '../data.js';
import { fmtStamp } from '../lib.js';

// Reconcile rail for the ridership graphic. Summarises the three conversations and holds the two decisions.
export function Reconcile({ messageCount, status, decision, onAxis, onDate, onBrief, onDraft, checks, onCheck }) {
  const canDraft = Boolean(decision.axis && decision.date);
  return (
    <div className="rail-body">
      <header className="rail-head">
        <div className="eyebrow">Reconcile before you reply</div>
        <h2>G3 · Ridership recovery</h2>
        <p className="muted small">3 conversations · {messageCount} messages · since Oct 14</p>
      </header>

      <section className="rail-section">
        <h3>Where each conversation stands</h3>
        <ConvoRow
          name="Client review"
          who="Renée · Mon 6:12 AM"
          summary="Wants the 2020 dip de-emphasized and the y-axis started at 40%."
          tone={status.client.tone}
          text={status.client.text}
        />
        <ConvoRow
          name="Data & methodology"
          who="Sam · Sun 4:40 PM"
          summary="October 2026 moves from 81.4% to 79.8% of the 2019 average."
          tone={status.data.tone}
          text={status.data.text}
        />
        <ConvoRow
          name="Studio only"
          who="Kofi · Mon 7:58 AM"
          summary="Asks whether a truncated axis is acceptable, and whether a corrected October figure exists."
          tone={status.studio.tone}
          text={status.studio.text}
        />
      </section>

      <section className="rail-section">
        <h3>1 · Your position on the axis request</h3>
        <p className="muted small">Picking an option also sets the chart preview, so you can check it against the data.</p>
        <div className="options">
          {AXIS_OPTIONS.map((opt) => (
            <label key={opt.id} className={`option ${decision.axis === opt.id ? 'on' : ''}`}>
              <input type="radio" name="axis" checked={decision.axis === opt.id} onChange={() => onAxis(opt.id)} />
              <div className="option-body">
                <div className="option-title">
                  {opt.title}
                  {opt.tag && <span className={`tag ${opt.tag === 'Recommended' ? 'good' : 'bad'}`}>{opt.tag}</span>}
                </div>
                <div className="small">{opt.summary}</div>
                <div className="small muted">Trade-off: {opt.tradeoff}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="rail-section">
        <h3>2 · v4 date to propose</h3>
        <div className="chips">
          {V4_DATES.map((d) => (
            <button key={d.id} className={`chip ${decision.date === d.id ? 'on' : ''}`} onClick={() => onDate(d.id)}>
              <span>{d.label} · 5 pm</span>
              {d.suggested && <span className="chip-tag">suggested</span>}
            </button>
          ))}
        </div>
        <p className="muted small">
          {V4_DATES.find((d) => d.id === decision.date)?.note ?? 'Client sign-off has to land by Mon Nov 23 for the Nov 24 board packet.'}
        </p>
      </section>

      <section className="rail-section actions">
        <button className="btn full" onClick={onBrief}>
          Brief Kofi on the corrected October figure
        </button>
        <button className="btn primary full" disabled={!canDraft} onClick={onDraft}>
          Draft client reply from these decisions
        </button>
        {!canDraft && <p className="muted small">Choose an axis position and a date to draft the reply.</p>}
      </section>

      <section className="rail-section">
        <h3>v4 change list</h3>
        {V4_CHECKS.map((c) => (
          <label key={c.id} className="check">
            <input type="checkbox" checked={Boolean(checks[c.id])} onChange={() => onCheck(c.id)} />
            <span>
              <span className="check-text">{c.text}</span>
              <span className="muted small block">{c.source}</span>
            </span>
          </label>
        ))}
      </section>

      <ApprovalsSection />
    </div>
  );
}

function ConvoRow({ name, who, summary, tone, text }) {
  return (
    <div className="convo">
      <div className="convo-head">
        <span className="convo-name">{name}</span>
        <span className="muted small">{who}</span>
      </div>
      <div className="small">{summary}</div>
      <span className={`status-pill ${tone}`}>{text}</span>
    </div>
  );
}

function ApprovalsSection() {
  const waiting = GRAPHICS.filter((g) => g.waitingDays);
  return (
    <section className="rail-section">
      <h3>Approvals waiting on Renée</h3>
      {waiting.map((g) => (
        <div className="approval" key={g.id}>
          <span>G{g.n} · {g.title}</span>
          <span className="muted small">sent {g.requested}, {g.waitingDays} days</span>
        </div>
      ))}
    </section>
  );
}

// Right rail when a graphic other than G3 is selected.
export function ProjectStatus({ project, graphic }) {
  return (
    <div className="rail-body">
      <header className="rail-head">
        <div className="eyebrow">Project status</div>
        <h2>{project.title}</h2>
        <p className="muted small">{project.client} · due {project.dueLabel} · {project.daysLeft} days</p>
      </header>
      <section className="rail-section">
        <h3>This graphic</h3>
        <div className="small">{graphic.detail}</div>
      </section>
      <ApprovalsSection />
    </div>
  );
}

// Right rail when an other studio project's inbox is open.
export function InboxSummary({ inbox, onOpenProject }) {
  const all = OTHER_PROJECTS.flatMap((p) => inbox[p.id] || []);
  const oldest = all.length ? all.reduce((a, b) => (a.at < b.at ? a : b)) : null;
  return (
    <div className="rail-body">
      <header className="rail-head">
        <div className="eyebrow">Other studio projects</div>
        <h2>{all.length} unread client messages</h2>
        <p className="muted small">
          {OTHER_PROJECTS.length} projects in flight{oldest ? ` · oldest ${fmtStamp(oldest.at)}` : ''}
        </p>
      </header>
      <section className="rail-section">
        {OTHER_PROJECTS.map((p) => {
          const n = (inbox[p.id] || []).length;
          return (
            <button key={p.id} className="project-row" onClick={() => onOpenProject(p.id)}>
              <span>
                <span className="convo-name block">{p.title}</span>
                <span className="muted small">Due {p.due}</span>
              </span>
              <span className={`count ${n ? '' : 'zero'}`}>{n}</span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
