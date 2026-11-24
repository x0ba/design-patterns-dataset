import { useMemo, useState } from 'react';
import { useApp } from './App';
import { CRITERIA, PEOPLE, TEAM, BID, draftSection, type Crit, type PersonId } from './data';
import { isOpenGap, srcRef, nameOf, type Req } from './state';
import { StatusPill, Avatar, Icon } from './ui';

const rank = (r: Req) => (r.passFail ? 0 : 10) + (r.status === 'missing' ? 0 : 5) + (r.mand === 'Mandatory' ? 0 : 2);

export function GapsView() {
  const { state, dispatch, act } = useApp();
  const [composeFor, setComposeFor] = useState<PersonId | null>(null);

  const items = useMemo(
    () => state.reqs.filter((r) => r.review !== 'removed' && (isOpenGap(r) || r.assignee)).sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id)),
    [state.reqs],
  );
  const open = items.filter(isOpenGap);
  const unassigned = items.filter((r) => !r.assignee);
  const byPerson = (p: PersonId) => items.filter((r) => r.assignee === p);
  const suggestedPairs = unassigned.filter((r) => r.suggestedOwner && r.suggestedOwner !== 'leah').map((r) => ({ id: r.id, to: r.suggestedOwner as PersonId }));

  const crits: Crit[] = ['T', 'E', 'P', 'L'];
  const pf = open.filter((r) => r.passFail);

  const openInMatrix = (id: string) => { dispatch({ type: 'select', id }); dispatch({ type: 'view', view: 'matrix' }); };

  return (
    <div className="gaps">
      <section className="gaps-summary">
        <div className="pf-box">
          <div className="pf-n">{pf.length}</div>
          <div>
            <div className="pf-t">Pass/fail items still open</div>
            <div className="pf-s">Any one of these can get the proposal set aside as non-responsive before scoring. {pf.filter((r) => !r.assignee).length > 0 ? `${pf.filter((r) => !r.assignee).length} not yet assigned.` : 'All assigned.'}</div>
          </div>
        </div>
        <div className="crit-bars">
          <div className="strip-label">Open gaps by evaluation criterion (RFP §8.4)</div>
          <div className="crit-row">
            {crits.map((c) => {
              const g = open.filter((r) => r.crit === c);
              return (
                <div key={c} className="crit" style={{ flexGrow: CRITERIA[c].weight! }}>
                  <div className="crit-bar"><span style={{ width: `${Math.min(100, g.length * 9)}%` }} /></div>
                  <div className="crit-l"><b>{CRITERIA[c].short}</b> {CRITERIA[c].weight} pts</div>
                  <div className="crit-n">{g.length} open{g.filter((r) => r.status === 'missing').length ? ` · ${g.filter((r) => r.status === 'missing').length} missing` : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="gaps-totals">
          <div><b>{open.length}</b> open gaps</div>
          <div className="muted small">{open.filter((r) => r.status === 'missing').length} missing · {open.filter((r) => r.status === 'partial').length} partial</div>
          <div className="muted small">{items.filter((r) => r.sentAt).length} sent · {items.filter((r) => r.assignee && !r.sentAt).length} assigned, not sent</div>
        </div>
      </section>

      <div className="board">
        <div className="lane lane-un">
          <div className="lane-h">
            <div className="lane-title">
              <span className="lane-icon"><Icon name="flag" /></span>
              <div>
                <b>Unassigned</b>
                <span className="muted small">Your decision</span>
              </div>
              <span className="lane-n">{unassigned.length}</span>
            </div>
            {suggestedPairs.length > 0 && (
              <button className="btn btn-sm btn-block" onClick={() => act({ type: 'assignMany', pairs: suggestedPairs }, `Assigned ${suggestedPairs.length} gaps to suggested owners`, false)}>
                Assign all {suggestedPairs.length} to suggested owners
              </button>
            )}
          </div>
          <div className="lane-body">
            {unassigned.length === 0 && <div className="lane-empty">Every open gap has an owner.</div>}
            {unassigned.map((r) => <GapCard key={r.id} r={r} onOpen={() => openInMatrix(r.id)} unassigned />)}
          </div>
        </div>

        {TEAM.map((p) => {
          const list = byPerson(p);
          const unsent = list.filter((r) => !r.sentAt);
          return (
            <div key={p} className="lane">
              <div className="lane-h">
                <div className="lane-title">
                  <Avatar id={p} size={28} />
                  <div>
                    <b>{PEOPLE[p].name}</b>
                    <span className="muted small">{PEOPLE[p].owns}</span>
                  </div>
                  <span className="lane-n">{list.length}</span>
                </div>
                <button className="btn btn-sm btn-block btn-primary" disabled={unsent.length === 0} onClick={() => setComposeFor(p)}>
                  <Icon name="send" size={12} /> {unsent.length ? `Send ${unsent.length} to ${nameOf(p)}` : list.length ? 'All sent' : 'Nothing to send'}
                </button>
              </div>
              <div className="lane-body">
                {list.length === 0 && <div className="lane-empty">No gaps assigned.</div>}
                {list.map((r) => <GapCard key={r.id} r={r} onOpen={() => openInMatrix(r.id)} />)}
              </div>
            </div>
          );
        })}
      </div>
      {composeFor && <Compose to={composeFor} items={byPerson(composeFor).filter((r) => !r.sentAt)} onClose={() => setComposeFor(null)} />}
    </div>
  );
}

function GapCard({ r, onOpen, unassigned }: { r: Req; onOpen: () => void; unassigned?: boolean }) {
  const { act } = useApp();
  const [pick, setPick] = useState(false);
  const sugg = r.suggestedOwner && r.suggestedOwner !== 'leah' ? r.suggestedOwner : null;
  return (
    <div className={`gcard ${r.passFail ? 'pf' : ''} ${r.status === 'addressed' ? 'resolved' : ''}`}>
      <div className="gcard-top">
        <button className="rid linkish" onClick={onOpen}>{r.id}</button>
        <StatusPill status={r.status} conflict={r.conflict} />
        {r.passFail && <span className="mini-tag pf">Pass/fail</span>}
        {r.crit !== 'R' && <span className="mini-tag">{CRITERIA[r.crit].short}</span>}
      </div>
      <div className="gcard-title" onClick={onOpen}>{r.title}</div>
      <div className="gcard-ref">{srcRef(r)}{r.draftSec ? ` → §${r.draftSec} ${draftSection(r.draftSec)?.title}` : ''}</div>
      <div className="gcard-why">{r.assignNote || r.reasoning}</div>
      <div className="gcard-f">
        {unassigned ? (
          pick ? (
            <div className="pick">
              {TEAM.map((p) => (
                <button key={p} className={`pick-p ${p === sugg ? 'sugg' : ''}`} title={PEOPLE[p].name} onClick={() => act({ type: 'assign', id: r.id, to: p }, `Assigned ${r.id} to ${nameOf(p)}`)}>
                  <Avatar id={p} size={22} />
                </button>
              ))}
              <button className="linkbtn" onClick={() => setPick(false)}>cancel</button>
            </div>
          ) : (
            <>
              {sugg ? (
                <button className="btn btn-sm" onClick={() => act({ type: 'assign', id: r.id, to: sugg }, `Assigned ${r.id} to ${nameOf(sugg)}`)}>
                  <Avatar id={sugg} size={16} /> Assign to {nameOf(sugg)}
                </button>
              ) : <span className="muted small">No suggested owner</span>}
              <button className="linkbtn" onClick={() => setPick(true)}>Someone else</button>
            </>
          )
        ) : (
          <>
            <span className={`sent ${r.sentAt ? 'yes' : ''}`}>{r.sentAt ? `✓ Sent ${r.sentAt}` : 'Not sent'}</span>
            <span className="muted small">due {r.assignDue.replace(/^\w+ /, '').replace(', 12:00 PM', ' noon')}</span>
            <span className="spacer" />
            <button className="linkbtn" onClick={() => act({ type: 'assign', id: r.id, to: null }, `Moved ${r.id} back to Unassigned`)}>Unassign</button>
          </>
        )}
      </div>
    </div>
  );
}

function Compose({ to, items, onClose }: { to: PersonId; items: Req[]; onClose: () => void }) {
  const { act } = useApp();
  const due = items[0]?.assignDue ?? 'Thu Nov 19, 12:00 PM';
  const body = useMemo(() => {
    const lines = items.map((r, i) => {
      const where = r.draftSec ? `draft §${r.draftSec}, p.${r.draftPage}` : 'not in the draft';
      return `${i + 1}. ${r.id}: ${r.title} (${r.status}${r.passFail ? ', PASS/FAIL' : ''})\n   Source: ${srcRef(r)}. Where it stands: ${where}.\n   ${r.assignNote || r.reasoning}`;
    });
    const pf = items.filter((r) => r.passFail).length;
    return `Hi ${nameOf(to)},\n\nI'm working through the compliance matrix for the Port Ellery 311 bid (RFP ${BID.rfpNo}, due Fri Nov 20 at 2:00 PM). These ${items.length} item${items.length > 1 ? 's' : ''} in your part of the response need a fix by ${due}.${pf ? ` ${pf} ${pf > 1 ? 'are' : 'is'} pass/fail, so please do ${pf > 1 ? 'those' : 'that one'} first.` : ''}\n\n${lines.join('\n\n')}\n\nReply on each item in Bidwright when it's in draft v7, or tell me if one needs a decision from Daniel.\n\nThanks,\nLeah`;
  }, [items, to, due]);
  const [text, setText] = useState(body);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <Avatar id={to} size={28} />
          <div>
            <b>To {PEOPLE[to].name}</b>
            <div className="muted small">RFP {BID.rfpNo}: {items.length} compliance gap{items.length > 1 ? 's' : ''}, fix by {due}</div>
          </div>
          <span className="spacer" />
          <button className="x" onClick={onClose}><Icon name="x" /></button>
        </div>
        <textarea className="compose" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="modal-f">
          <span className="muted small">Delivered to {nameOf(to)}’s Bidwright inbox with links to each requirement.</span>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { act({ type: 'send', to, ids: items.map((r) => r.id) }, `Sent ${items.length} item${items.length > 1 ? 's' : ''} to ${PEOPLE[to].name}`, false); onClose(); }}>
            <Icon name="send" size={12} /> Send {items.length} item{items.length > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
