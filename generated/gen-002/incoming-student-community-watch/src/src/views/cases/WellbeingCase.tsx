import { useState } from 'react';
import { useStore, nowMs } from '../../store';
import { WELLBEING as W } from '../../data/cases';
import { CONTACTS, leaderById } from '../../data/community';
import { Btn, Modal, Pill, dur, hhmm, useNow, Avatar, StatusDot, Check } from '../../components/ui';
import { wbSteps } from '../../progress';
import { CaseHead, Section, Done } from './common';

const firstName = W.author.name.split(' ')[0];

function EscalateModal({ onClose, initial }: { onClose: () => void; initial: string }) {
  const act = useStore((s) => s.act);
  const [contact, setContact] = useState(initial);
  const [method, setMethod] = useState<'called' | 'sent'>('called');
  const [note, setNote] = useState(
    `Admitted first-year (Class of 2030), ${W.author.name}, ${W.author.record.replace('Matched · ', '')}, assigned to Hartwell Hall.\n` +
    `Posted ${hhmm(W.postedAt)} today in the admitted-student community (Hartwell Hall 2030): "${W.body}"\n` +
    `A peer reported it at ${hhmm(W.reportedAt)}. Student last active ${hhmm(W.author.lastActive)}. Mentions family financial stress; asked about deferring enrollment on Aug 9. No prior concerns on file.\n` +
    `Requesting consultation on outreach and whether a welfare check is warranted.`,
  );
  const c = CONTACTS.find((x) => x.id === contact)!;
  return (
    <Modal title="Escalate wellbeing concern" sub="Logged to the case. Call first; the summary is what you’ll read or send." onClose={onClose} width={720}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={() => {
          act(`${method === 'called' ? 'Consulted' : 'Sent case summary to'} ${c.name}`, (d) => ({
            wb: { ...d.wb, ownedByMe: true, escalations: [...d.wb.escalations, { contactId: contact, method, at: nowMs(), note }] },
          }), { log: `Wellbeing (Hartwell Hall 2030): ${method === 'called' ? 'consulted' : 'sent case summary to'} ${c.name}` });
          onClose();
        }}>Log escalation</Btn></>}>
      <div className="contact-grid">
        {CONTACTS.map((x) => (
          <label key={x.id} className={`contact-opt${contact === x.id ? ' on' : ''}`}>
            <input type="radio" name="contact" checked={contact === x.id} onChange={() => setContact(x.id)} />
            <div>
              <div className="co-name">{x.name}</div>
              <div className="co-role">{x.role}</div>
              <div className="co-phone mono">{x.phone}</div>
              <div className="co-hours">{x.hours}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="callout callout-red tight">If anyone believes the student is in immediate danger, call <b>911</b> first, then University Police.</div>
      <div className="field-label">How you reached them</div>
      <div className="seg">
        <button className={method === 'called' ? 'on' : ''} onClick={() => setMethod('called')}>Called {c.phone}</button>
        <button className={method === 'sent' ? 'on' : ''} onClick={() => setMethod('sent')}>Sent case summary</button>
      </div>
      <label className="field-label" htmlFor="esc-note">Case summary</label>
      <textarea id="esc-note" className="textarea" rows={8} value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  );
}

function CheckInModal({ onClose }: { onClose: () => void }) {
  const act = useStore((s) => s.act);
  const [msg, setMsg] = useState(
    `Hi ${firstName}, I’m Renée Castellanos, assistant director of New Student Programs. I saw your post in the Hartwell group and wanted to reach out personally — a lot of incoming students feel exactly this way right before move-in, and you don’t have to sort it out alone.\n\n` +
    `If it would help to talk to someone today, the Counseling Center has a 24/7 line at (555) 014-2277. If money is part of what’s weighing on you, I can connect you with a financial aid counselor this week — just reply here.\n\n` +
    `Would you be open to a quick call with me tomorrow? Either way, I’m glad you’re part of the Class of 2030.`,
  );
  const [publicReply, setPublicReply] = useState(true);
  return (
    <Modal title={`Private check-in to ${W.author.name}`} sub="Sent from your staff account as a direct message. Replies come to your inbox and this case." onClose={onClose} width={680}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={() => {
          act(publicReply ? 'Check-in sent · resource reply posted in thread' : 'Private check-in sent', (d) => ({ wb: { ...d.wb, ownedByMe: true, checkInAt: nowMs() } }),
            { log: `Wellbeing (Hartwell Hall 2030): sent private check-in to ${W.author.name}${publicReply ? ' and posted resource reply in thread' : ''}` });
          onClose();
        }}>Send check-in</Btn></>}>
      <textarea className="textarea" rows={11} value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Message" />
      <Check checked={publicReply} onChange={setPublicReply}>
        Also post a short staff reply in the thread with campus resources (doesn’t mention the report or the student’s situation)
      </Check>
    </Modal>
  );
}

function OutcomeModal({ onClose }: { onClose: () => void }) {
  const act = useStore((s) => s.act);
  const options = ['Counseling Center is following up directly', 'Student replied and is connected with support', 'Referred to Dean of Students case management', 'Welfare check requested through University Police'];
  const [o, setO] = useState(options[0]);
  const [note, setNote] = useState('');
  return (
    <Modal title="Log outcome and close" onClose={onClose}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={() => {
          act('Wellbeing case closed with outcome', (d) => ({ wb: { ...d.wb, ownedByMe: true, resolvedAt: nowMs(), outcome: o + (note ? ` — ${note}` : '') } }),
            { log: `Wellbeing (Hartwell Hall 2030): closed — ${o}` });
          onClose();
        }}>Close case</Btn></>}>
      <div className="radio-list">
        {options.map((x) => (
          <label key={x} className="radio"><input type="radio" checked={o === x} onChange={() => setO(x)} /> {x}</label>
        ))}
      </div>
      <label className="field-label" htmlFor="oc-note">Note (staff only)</label>
      <textarea id="oc-note" className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Clinician will call the student by 14:00; I’ll check the thread after Session D." />
    </Modal>
  );
}

export default function WellbeingCase() {
  const s = useStore();
  const now = useNow();
  const [modal, setModal] = useState<null | 'esc-counseling' | 'esc-dos' | 'checkin' | 'outcome'>(null);
  const steps = wbSteps(s);
  const priya = leaderById('l1');
  const wait = now - W.postedAt;
  const resolved = s.wb.resolvedAt !== null;

  return (
    <div className="case">
      <CaseHead kind="Wellbeing · staff-only" tone="red"
        title={<>A Hartwell Hall admit may be in distress</>}
        meta={<>Hartwell Hall 2030 · posted {hhmm(W.postedAt)} · reported {hhmm(W.reportedAt)} · {W.views} views · {resolved ? <Pill tone="green">Closed {hhmm(s.wb.resolvedAt!)}</Pill> : s.wb.ownedByMe ? <Pill tone="teal">You’re handling it</Pill> : <Pill tone="red" solid>No staff response for {dur(wait)}</Pill>}</>}
        steps={steps} />

      <div className="case-actions sticky">
        {!s.wb.ownedByMe && (
          <Btn kind="primary" onClick={() => s.act('You’re handling the wellbeing case', (d) => ({ wb: { ...d.wb, ownedByMe: true } }), { log: 'Wellbeing (Hartwell Hall 2030): took ownership' })}>I’m taking this</Btn>
        )}
        <Btn kind={s.wb.ownedByMe && !steps[1].done ? 'primary' : 'secondary'} onClick={() => setModal('esc-counseling')}>Consult Counseling on-call</Btn>
        <Btn kind={steps[1].done && !steps[2].done ? 'primary' : 'secondary'} onClick={() => setModal('checkin')} disabled={s.wb.checkInAt !== null}>{s.wb.checkInAt ? `Check-in sent ${hhmm(s.wb.checkInAt)}` : 'Send private check-in'}</Btn>
        <Btn kind="ghost" onClick={() => setModal('esc-dos')}>Other contacts</Btn>
        <span className="spacer" />
        <Btn kind={steps[2].done && !resolved ? 'primary' : 'ghost'} onClick={() => setModal('outcome')} disabled={resolved}>Log outcome</Btn>
      </div>

      <div className="case-body two-col">
        <div className="col-main">
          <div className="callout callout-red">
            <b>Protocol:</b> staff handle wellbeing reports; leaders don’t do outreach. Leave the post up (removing it can feel like rejection) and
            consult the Counseling Center before or alongside a check-in. If there’s any sign of immediate danger, call 911.
          </div>

          <Section title="The post" aside={<span className="muted">as students see it</span>}>
            <article className="post">
              <div className="post-head">
                <Avatar initials="TO" size={30} />
                <div><div className="post-author">{W.author.name}</div><div className="post-sub">Hartwell Hall 2030 · {hhmm(W.postedAt)}</div></div>
              </div>
              <p className="post-body">{W.body.split('not sure there')[0]}<mark className="mark-red">not sure there{W.body.split('not sure there')[1]}</mark></p>
              <div className="replies">
                {W.replies.map((r) => (
                  <div className="reply" key={r.name}>
                    <span className="reply-name">{r.name}</span> <span className="reply-time mono">{hhmm(r.at)}</span>
                    <div>{r.body}</div>
                  </div>
                ))}
                {s.wb.checkInAt && (
                  <div className="reply staff">
                    <span className="reply-name">Renée Castellanos · NSP staff</span> <span className="reply-time mono">{hhmm(s.wb.checkInAt)}</span>
                    <div>Move-in nerves are really common, and support is here now — not just after you arrive. Counseling Center (24/7): (555) 014-2277 · Financial aid drop-in hours are on the Orientation page. You can always message NSP staff directly.</div>
                  </div>
                )}
              </div>
            </article>
          </Section>

          <Section title="Student report" aside={<span className="mono muted">{hhmm(W.reportedAt)}</span>}>
            <div className="report-note">
              <div className="rn-reason">{W.report.reason}</div>
              <div>“{W.report.note}”</div>
              <div className="rn-by">— {W.report.by}, also in Hartwell Hall 2030</div>
            </div>
          </Section>

          <Section title="Timeline">
            <ul className="timeline">
              {W.timeline.map((e) => <li key={e.text}><span className="mono">{hhmm(e.at)}</span>{e.text}</li>)}
              {s.wb.escalations.map((e) => (
                <li key={e.at} className="me"><span className="mono">{hhmm(e.at)}</span>You {e.method === 'called' ? 'consulted' : 'sent a case summary to'} {CONTACTS.find((c) => c.id === e.contactId)!.name}</li>
              ))}
              {s.wb.checkInAt && <li className="me"><span className="mono">{hhmm(s.wb.checkInAt)}</span>You sent a private check-in</li>}
              {s.wb.leaderFollowUp && <li className="me"><span className="mono">—</span>{s.wb.leaderFollowUp}</li>}
              {s.wb.resolvedAt && <li className="me"><span className="mono">{hhmm(s.wb.resolvedAt)}</span>Closed: {s.wb.outcome}</li>}
            </ul>
          </Section>
        </div>

        <aside className="col-side">
          <Section title="About this student">
            <dl className="facts">
              <dt>Admissions</dt><dd>{W.author.record}</dd>
              <dt>Housing</dt><dd>{W.author.housing}</dd>
              <dt>Orientation</dt><dd>{W.author.orientation}</dd>
              <dt>Groups</dt><dd>{W.author.groups.join(', ')}</dd>
              <dt>Last active</dt><dd><b>{hhmm(W.author.lastActive)}</b> (read replies)</dd>
              <dt>Prior concerns</dt><dd>None on file</dd>
            </dl>
          </Section>
          <Section title="Earlier posts">
            {W.history.map((h) => (
              <div className="mini-post" key={h.at}>
                <div className="mp-meta">{h.at} · {h.group}</div>
                <div>“{h.body}”</div>
              </div>
            ))}
          </Section>
          <Section title="Hartwell Hall leader">
            <div className="leader-line">
              <Avatar initials={priya.initials} size={26} />
              <div>
                <div><b>{priya.name}</b></div>
                <div className="muted small"><StatusDot status={priya.status} />{priya.statusNote}</div>
              </div>
            </div>
            {s.wb.leaderFollowUp ? <Done>Asked to watch the thread</Done> : (
              <Btn small onClick={() => s.act('Priya will watch the thread after 13:00', (d) => ({ wb: { ...d.wb, leaderFollowUp: 'Priya Raman asked to watch the thread for new replies after 13:00 (no outreach)' }, handoffs: { ...d.handoffs, l1: (d.handoffs.l1 ?? 0) + 1 } }), { log: 'Wellbeing (Hartwell Hall 2030): asked Priya Raman to watch the thread for new replies — no outreach' })}>
                Ask Priya to watch the thread (no outreach)
              </Btn>
            )}
          </Section>
        </aside>
      </div>

      {modal === 'esc-counseling' && <EscalateModal initial="counseling" onClose={() => setModal(null)} />}
      {modal === 'esc-dos' && <EscalateModal initial="dos" onClose={() => setModal(null)} />}
      {modal === 'checkin' && <CheckInModal onClose={() => setModal(null)} />}
      {modal === 'outcome' && <OutcomeModal onClose={() => setModal(null)} />}
    </div>
  );
}
