import { useState } from 'react';
import { ME, Issue, Thread, externals, shows, timeline, trainingSessions, volunteers } from '../data';
import { dmFor, needsReply, useStore } from '../store';
import { Avatar, DAYS, Icon, ago, firstName, otherMember, showsFor, slotLabel, threadTitle, volById } from '../util';

const roleLabel = (r: string) => r[0].toUpperCase() + r.slice(1);

function PersonCard({ id }: { id: string }) {
  const { d } = useStore();
  const v = volById(id);
  if (!v) return null;
  const sh = showsFor(id);
  return (
    <div className="card person">
      <div className="person-top">
        <Avatar id={id} size={44} />
        <div>
          <div className="person-name">{v.name}</div>
          <div className="chips">
            {v.roles.map((r) => <span key={r} className={`chip role-${r.replace(' ', '')}`}>{roleLabel(r)}</span>)}
          </div>
        </div>
      </div>
      {v.title && <div className="person-title">{v.title}</div>}
      {sh.length > 0 && (
        <div className="kv">
          {sh.map((s) => (
            <div key={s.id} className="kv-row">
              <span className="k">{s.hostIds.includes(id) ? 'Hosts' : 'Board op'}</span>
              <button className="link-btn" onClick={() => d({ type: 'view', view: 'schedule' })}>
                {s.name} · {DAYS[s.day]} {slotLabel(s.start, s.end)}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="kv">
        <div className="kv-row"><span className="k">Phone</span><span>{v.phone}</span></div>
        <div className="kv-row"><span className="k">Since</span><span>{v.joined}</span></div>
      </div>
      {v.note && <p className="person-note">{v.note}</p>}
    </div>
  );
}

function Checklist({ issue }: { issue: Issue }) {
  const { s, d } = useStore();
  const [logOpen, setLogOpen] = useState(false);
  const [logText, setLogText] = useState(
    '11/12 21:42–21:53 — 11 min dead air during Night Market (L. Ibarra). Silence alarm fired at 21:43; automation failover sent START, no response from playout-01. Live audio restored 21:53. Cause under investigation (W. Shumaker, Wed 11/18). Listener complaint received 11/13.',
  );
  const allDone = issue.checklist.every((c) => c.done);

  return (
    <div className="checklist">
      {issue.checklist.map((c) => {
        const th = c.threadId ? s.threads.find((t) => t.id === c.threadId) : undefined;
        const isLog = c.id === 'c4';
        return (
          <div key={c.id} className={`check-row ${c.done ? 'done' : ''}`}>
            <button className="checkbox" role="checkbox" aria-checked={c.done} aria-label={c.label}
              onClick={() => (isLog && !c.done ? setLogOpen(true) : d({ type: 'check', issueId: issue.id, itemId: c.id }))}>
              {c.done && <Icon name="check" size={12} stroke={3} />}
            </button>
            <div className="check-main">
              <span className="check-label">{c.label}</span>
              {th && s.activeThreadId !== th.id && (
                <button className="link-btn tiny" onClick={() => d({ type: 'open', threadId: th.id })}>
                  Open {th.kind === 'email' ? 'email' : threadTitle(th)} <Icon name="chev" size={10} />
                </button>
              )}
              {th && s.activeThreadId === th.id && !c.done && <span className="here">This conversation · checks off when you reply</span>}
              {isLog && !c.done && !logOpen && (
                <button className="link-btn tiny" onClick={() => setLogOpen(true)}>Write entry <Icon name="chev" size={10} /></button>
              )}
              {isLog && c.done && s.stationLog.length > 0 && (
                <span className="here">Logged {ago(s.stationLog[s.stationLog.length - 1].at) === 'just now' ? 'just now' : `${ago(s.stationLog[s.stationLog.length - 1].at)} ago`}</span>
              )}
            </div>
          </div>
        );
      })}
      {logOpen && (
        <div className="log-entry">
          <label className="mini-label">Station log entry</label>
          <textarea value={logText} onChange={(e) => setLogText(e.target.value)} rows={6} />
          <div className="row-end">
            <button className="btn ghost sm" onClick={() => setLogOpen(false)}>Cancel</button>
            <button className="btn primary sm" disabled={!logText.trim()} onClick={() => {
              d({ type: 'log', text: logText.trim() });
              d({ type: 'check', issueId: issue.id, itemId: 'c4', done: true });
              d({ type: 'toast', text: 'Added to the station log' });
              setLogOpen(false);
            }}>Save to log</button>
          </div>
        </div>
      )}
      {allDone && (
        <button className="btn outline full" onClick={() => {
          d({ type: 'resolveIssue', issueId: issue.id, resolved: true });
          d({ type: 'toast', text: `Closed: ${issue.title}` });
        }}>
          <Icon name="check" size={14} /> Close this issue
        </button>
      )}
    </div>
  );
}

function IncidentCard({ issue }: { issue: Issue }) {
  const { s, d } = useStore();
  const done = issue.checklist.filter((c) => c.done).length;
  return (
    <div className="card issue-card incident">
      <div className="card-kicker"><Icon name="wave" size={13} stroke={2} /> Open issue · {done}/{issue.checklist.length}</div>
      <div className="card-title">{issue.title}</div>
      <div className="card-sub">{issue.subtitle}</div>

      <div className="mini-label">What we know so far</div>
      <ol className="timeline">
        {timeline.map((e, i) => (
          <li key={i}><span className="tl-at">{e.at}</span><span className="tl-text">{e.text}</span></li>
        ))}
      </ol>
      <p className="callout">
        Walt’s log puts the gap on the backup system: the silence alarm worked, the failover didn’t.
        Worth saying to Lourdes up front.
      </p>

      <div className="mini-label">To close this out</div>
      <Checklist issue={issue} />

      <div className="mini-label">Conversations</div>
      <div className="linked">
        {issue.threadIds.map((id) => {
          const th = s.threads.find((t) => t.id === id)!;
          const nr = needsReply(th);
          return (
            <button key={id} className={`linked-row ${s.activeThreadId === id ? 'active' : ''}`} onClick={() => d({ type: 'open', threadId: id })}>
              <Avatar id={otherMember(th)} size={22} />
              <span className="linked-name">{th.kind === 'email' ? 'Listener email' : threadTitle(th)}</span>
              <span className={`linked-status ${nr ? 'warn' : 'ok'}`}>{nr ? 'Needs reply' : 'Replied'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const COVER_CANDIDATES = volunteers.filter((v) => v.willingEarly);

function coverMessage(name: string) {
  return `Hi ${firstName(name)}, Joy's out with the flu. Could you cover Farm Report this Saturday, Nov 21, 6–8 am? Pete is on the board from 8 for Swap Shop and can come in early. The price sheet template is in the Farm Report folder and the co-op posts numbers by 5:30. A quick yes or no helps me plan, and no pressure at all.`;
}

function CoverCard({ issue }: { issue: Issue }) {
  const { s, d, askCover } = useStore();
  const [picked, setPicked] = useState<string[]>([]);
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState(coverMessage('{first_name}'));
  const assigned = s.cover.assigned ? volById(s.cover.assigned) : undefined;
  const farm = shows.find((x) => x.id === 'farm')!;
  const done = issue.checklist.filter((c) => c.done).length;

  const statusLabel: Record<string, string> = { asked: 'Asked · no reply yet', yes: 'Said yes', 'if-needed': 'Only if no one else', no: 'Can’t' };

  return (
    <div className="card issue-card cover">
      <div className="card-kicker"><Icon name="sun" size={13} stroke={2} /> Open issue · {done}/{issue.checklist.length}</div>
      <div className="card-title">{farm.name} needs cover</div>
      <div className="slot">
        <div className="slot-date"><span>SAT</span><b>21</b><span>NOV</span></div>
        <div>
          <div className="slot-time">6:00–8:00 am</div>
          <div className="slot-meta">Regular host: Joy Carter (out sick)</div>
          <div className="slot-meta">Next on air: Saturday Swap Shop · Ellen & Pete</div>
        </div>
      </div>

      {assigned ? (
        <div className="assigned">
          <Avatar id={assigned.id} size={30} />
          <div className="assigned-text">
            <b>{assigned.name}</b> is covering
            <span>On the schedule for Sat Nov 21</span>
          </div>
          <button className="link-btn tiny" onClick={() => d({ type: 'assignCover', volId: null })}>Undo</button>
        </div>
      ) : (
        <>
          <div className="mini-label">Said they’ll fill in early mornings · {COVER_CANDIDATES.length}</div>
          <ul className="candidates">
            {COVER_CANDIDATES.map((v) => {
              const st = s.cover.asked[v.id];
              const sel = picked.includes(v.id);
              const th = dmFor(s.threads, v.id);
              return (
                <li key={v.id} className={`cand ${sel ? 'sel' : ''} ${st ? `st-${st.status}` : ''}`}>
                  <div className="cand-top">
                    {!st ? (
                      <button className="checkbox" role="checkbox" aria-checked={sel} aria-label={`Select ${v.name}`}
                        onClick={() => setPicked((p) => (sel ? p.filter((x) => x !== v.id) : [...p, v.id]))}>
                        {sel && <Icon name="check" size={12} stroke={3} />}
                      </button>
                    ) : <span className={`status-dot ${st.status}`} />}
                    <Avatar id={v.id} size={26} />
                    <div className="cand-name">
                      <b>{v.name}</b>
                      <span>{showsFor(v.id).map((x) => `${x.name}, ${DAYS[x.day]}`).join(' · ')}</span>
                    </div>
                  </div>
                  <div className="cand-note">{v.earlyNote}</div>
                  {st && (
                    <div className="cand-status">
                      <span>{statusLabel[st.status]}{st.status === 'asked' ? ` · ${ago(st.at)}` : ''}</span>
                      {th && <button className="link-btn tiny" onClick={() => d({ type: 'open', threadId: th.id })}>Open chat</button>}
                      {(st.status === 'yes' || st.status === 'if-needed') && (
                        <button className="btn primary sm" onClick={() => {
                          d({ type: 'assignCover', volId: v.id });
                          if (th) d({ type: 'send', threadId: th.id, body: `Thank you ${firstName(v.name)}! You're on the schedule for Farm Report, Sat Nov 21, 6–8 am. I'll let Joy and Pete know.` });
                          d({ type: 'toast', text: `${v.name} is covering Farm Report` });
                        }}>Confirm</button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {composing ? (
            <div className="ask-compose">
              <label className="mini-label">Message to {picked.map((p) => firstName(volById(p)!.name)).join(', ')}</label>
              <textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} />
              <div className="mini-hint">{'{first_name}'} is filled in for each person. Sent as separate 1:1 messages.</div>
              <div className="row-end">
                <button className="btn ghost sm" onClick={() => setComposing(false)}>Cancel</button>
                <button className="btn primary sm" disabled={!picked.length || !text.trim()} onClick={() => {
                  askCover(picked.map((id) => ({ volId: id, body: text.replace(/\{first_name\}/g, firstName(volById(id)!.name)) })));
                  d({ type: 'toast', text: `Asked ${picked.length === 1 ? volById(picked[0])!.name : `${picked.length} hosts`} about Saturday` });
                  setPicked([]);
                  setComposing(false);
                }}>
                  <Icon name="send" size={13} /> Send {picked.length > 1 ? `${picked.length} messages` : ''}
                </button>
              </div>
            </div>
          ) : COVER_CANDIDATES.some((v) => !s.cover.asked[v.id]) && (
            <div className="row-end">
              {(
                <button className="btn ghost sm" onClick={() => setPicked(COVER_CANDIDATES.filter((v) => !s.cover.asked[v.id]).map((v) => v.id))}>
                  Select all
                </button>
              )}
              <button className="btn primary sm" disabled={!picked.length} onClick={() => setComposing(true)}>
                Ask {picked.length ? picked.length : ''} to cover…
              </button>
            </div>
          )}
        </>
      )}

      <div className="mini-label">To close this out</div>
      <Checklist issue={issue} />
      {assigned && (
        <div className="next-steps">
          {!issue.checklist.find((c) => c.id === 'f1')!.done && (
            <button className="btn outline sm" onClick={() => d({ type: 'prefill', threadId: 'th-joy', draft: `Feel better, Joy. ${firstName(assigned.name)} is covering Saturday, so don't give it another thought. Just rest.` })}>
              Draft note to Joy
            </button>
          )}
          {!issue.checklist.find((c) => c.id === 'f3')!.done && (
            <button className="btn outline sm" onClick={() => d({ type: 'prefill', threadId: 'th-weekend', draft: `Thanks all. ${assigned.name} is covering Farm Report this Saturday, 6–8 am. Pete, ${firstName(assigned.name)} would appreciate you coming in a little early. Ellen, thanks for offering. You're off the hook.` })}>
              Draft post to Weekend hosts
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TrainingCard() {
  return (
    <div className="card">
      <div className="card-kicker"><Icon name="calendar" size={13} /> Board-op training</div>
      <ul className="sessions">
        {trainingSessions.map((t) => (
          <li key={t.when}><b>{t.when}</b><span>with {t.lead} · {t.seats}</span></li>
        ))}
      </ul>
      <p className="mini-hint">The “Training sign-up” saved reply lists both sessions.</p>
    </div>
  );
}

function ListenerCard({ thread }: { thread: Thread }) {
  const ext = externals[otherMember(thread)];
  return (
    <div className="card person">
      <div className="person-top">
        <Avatar id={otherMember(thread)} size={44} />
        <div>
          <div className="person-name">{ext.name}</div>
          <div className="chips"><span className="chip listener">Listener</span></div>
        </div>
      </div>
      <div className="kv">
        <div className="kv-row"><span className="k">Email</span><span className="mono-sm">{ext.email}</span></div>
        <div className="kv-row"><span className="k">Giving</span><span>$10/month sustainer since 2023</span></div>
        <div className="kv-row"><span className="k">Via</span><span>info@ box, forwarded by Carol</span></div>
      </div>
    </div>
  );
}

function MembersCard({ thread }: { thread: Thread }) {
  const { d } = useStore();
  return (
    <div className="card">
      <div className="card-kicker"><Icon name="people" size={13} /> {thread.members.length} members</div>
      <ul className="members">
        {thread.members.map((id) => {
          const v = volById(id)!;
          const sh = showsFor(id)[0];
          return (
            <li key={id}>
              <button className="member" disabled={id === ME} onClick={() => d({ type: 'startDm', volId: id })} title={id === ME ? '' : `Message ${v.name}`}>
                <Avatar id={id} size={24} />
                <span className="member-name">{id === ME ? 'You' : v.name}</span>
                <span className="member-meta">{sh ? sh.name : roleLabel(v.roles[0])}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PledgeCard() {
  return (
    <div className="card">
      <div className="card-kicker"><Icon name="bookmark" size={13} /> Decided so far</div>
      <div className="kv">
        <div className="kv-row"><span className="k">Dates</span><span>Apr 12–18, 2027</span></div>
        <div className="kv-row"><span className="k">Goal</span><span>$6,500 + $750 Riverside Hardware match</span></div>
        <div className="kv-row"><span className="k">Premiums</span><span>Tote $60 · Bowl $120 · Mug $40 · $10/mo sustainer</span></div>
        <div className="kv-row"><span className="k">Last year</span><span>$5,840 spring · $4,915 fall</span></div>
      </div>
      <div className="mini-label">Yours</div>
      <ul className="todo">
        <li>Circulate phone-shift sign-up after Thanksgiving (56 slots)</li>
        <li>Check timing with Wendell on the Kids’ Corner spot</li>
      </ul>
    </div>
  );
}

export function ContextPanel() {
  const { s } = useStore();
  const t = s.threads.find((x) => x.id === s.activeThreadId)!;
  const issue = s.issues.find((i) => i.id === t.issueId && !i.resolved);
  const other = otherMember(t);

  return (
    <aside className="context" key={t.id}>
      {t.kind === 'dm' && <PersonCard id={other} />}
      {t.kind === 'email' && <ListenerCard thread={t} />}
      {issue?.kind === 'incident' && <IncidentCard issue={issue} />}
      {issue?.kind === 'cover' && <CoverCard issue={issue} />}
      {other === 'abel' && <TrainingCard />}
      {t.id === 'th-board' && <PledgeCard />}
      {t.id === 'th-weekend' && !issue && s.issues.find((i) => i.id === 'cover-farm' && !i.resolved) && (
        <CoverCard issue={s.issues.find((i) => i.id === 'cover-farm')!} />
      )}
      {t.kind === 'group' && <MembersCard thread={t} />}
    </aside>
  );
}
