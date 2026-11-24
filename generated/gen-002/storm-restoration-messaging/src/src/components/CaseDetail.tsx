import { useState, type FormEvent } from 'react';
import { STORM_ID } from '../data/mock';
import { crewForOutage, isSilent } from '../derive';
import { useStore } from '../state/store';
import type { Crew, Outage, OutageStatus } from '../types';
import { elapsed, h12, hm } from '../time';
import { Thread } from './Thread';
import { Pill, STATUS_LABEL, statusTone } from './ui';

export function CaseDetail({ now }: { now: number }) {
  const { state } = useStore();

  if (state.selectedId === STORM_ID) {
    return (
      <section className="panel case" aria-label="Storm-wide thread">
        <div className="case-head">
          <div>
            <div className="case-id">
              <span className="mono">Storm-wide</span>
            </div>
            <div className="case-loc">Mutual aid, staging and advisories</div>
            <div className="case-sub">Traffic here is not tied to one outage. Crews and dispatch post staging and assignments.</div>
          </div>
        </div>
        <Thread outageId={STORM_ID} now={now} />
      </section>
    );
  }

  const o = state.outages.find((x) => x.id === state.selectedId);
  if (!o) return null;
  const crews = crewForOutage(state, o.id);

  return (
    <section className="panel case" aria-label={`Case ${o.id}`}>
      <CaseHead o={o} />
      <div className="crew-strip">
        {crews.length === 0 && <span className="muted">No crew on this outage yet.</span>}
        {crews.map((c) => (
          <CrewChip key={c.id} crew={c} now={now} />
        ))}
      </div>
      <div className="cards">
        <EtrCard o={o} now={now} />
        <ScriptCard o={o} />
      </div>
      <Thread outageId={o.id} now={now} />
    </section>
  );
}

function CaseHead({ o }: { o: Outage }) {
  const { dispatch } = useStateDispatch();
  return (
    <div className="case-head">
      <div>
        <div className="case-id">
          <span className="mono">{o.id}</span>
          <Pill tone={statusTone(o.status)}>{STATUS_LABEL[o.status]}</Pill>
          {o.medical && <Pill tone="pink">Medical callback open</Pill>}
        </div>
        <div className="case-loc">{o.location}</div>
        <div className="case-sub">
          <span className="mono">{o.feeder}</span> · {o.substation} Sub · <strong>{o.members}</strong> members out · {o.cause}
        </div>
      </div>
      <label className="status-select">
        <span>Status</span>
        <select
          value={o.status}
          onChange={(e) => dispatch({ type: 'setStatus', outageId: o.id, status: e.target.value as OutageStatus, now: 0 })}
        >
          {(Object.keys(STATUS_LABEL) as OutageStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

// Thin wrapper so CaseHead can dispatch with the current storm time.
import { useStore as useStateDispatch } from '../state/store';

function CrewChip({ crew, now }: { crew: Crew; now: number }) {
  const silent = isSilent(crew, now);
  return (
    <div className={`crew-chip ${silent ? 'crew-chip-silent' : ''}`}>
      <span className="crew-chip-name">{crew.name}</span>
      <span>{crew.foreman}</span>
      <span className="muted">{crew.truck}</span>
      <span className={silent ? 'bad-text' : 'muted'}>
        {silent ? `silent ${elapsed(crew.checkIn, now)}` : `checked in ${hm(crew.checkIn)}`}
      </span>
    </div>
  );
}

function EtrCard({ o, now }: { o: Outage; now: number }) {
  const { dispatch } = useStateDispatch();
  const [manual, setManual] = useState('');
  const p = o.pendingEtr;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!manual) return;
    dispatch({ type: 'setEtr', outageId: o.id, time: manual, now });
    setManual('');
  };

  return (
    <div className="card">
      <div className="card-label">Estimated restoration</div>
      <div className="big-value">{o.etr ? h12(o.etr) : 'Not set'}</div>
      <div className="card-meta">
        {o.etrBy && o.etrAt !== null
          ? `Set by ${o.etrBy} at ${hm(o.etrAt)} · ${elapsed(o.etrAt, now)} ago`
          : 'No estimate has been set'}
      </div>

      {p && p.time !== o.etr && (
        <div className="proposal">
          <div>
            <strong>{p.by}</strong> proposes <strong>{h12(p.time)}</strong> at {hm(p.at)}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'confirmEtr', outageId: o.id, now })}>
            Confirm {h12(p.time)}
          </button>
        </div>
      )}

      <form className="set-etr" onSubmit={submit}>
        <label>
          <span>Set a new time</span>
          <input type="time" value={manual} onChange={(e) => setManual(e.target.value)} />
        </label>
        <button className="btn btn-sm" type="submit" disabled={!manual}>
          Set ETR
        </button>
      </form>
    </div>
  );
}

function ScriptCard({ o }: { o: Outage }) {
  const { dispatch, state } = useStateDispatch();
  const draft = state.notices.find((n) => n.outageId === o.id && n.sentAt === null);
  const reading = o.scriptEtr ? h12(o.scriptEtr) : 'No estimate';
  const now = 0;
  void now;

  let body: React.ReactNode;
  if (o.scriptState === 'current') {
    body = <p className="ok-text">Script matches the published estimate.</p>;
  } else if (o.scriptState === 'needs-update') {
    body = (
      <>
        <p className="bad-text">
          Script is out of date. Members are still hearing <strong>{reading}</strong>, and the estimate is{' '}
          <strong>{o.etr ? h12(o.etr) : '—'}</strong>.
        </p>
        <button className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'notifyMemberServices', outageId: o.id, now: 0 })}>
          Tell member services
        </button>
      </>
    );
  } else {
    body = (
      <>
        <p className="warn-text">Sent to member services. Waiting for the script to change on the call center side.</p>
        <button className="btn btn-sm" onClick={() => dispatch({ type: 'ackScript', outageId: o.id, now: 0 })}>
          Mark script changed
        </button>
      </>
    );
  }

  return (
    <div className="card">
      <div className="card-label">Call center script</div>
      <div className="big-value small-value">{reading}</div>
      <div className="card-meta">Read to members who call about {o.location}</div>
      <div className="script-body">{body}</div>
      {draft && <div className="card-meta">Correction text ready for {draft.audience} members. See Member notices.</div>}
    </div>
  );
}
