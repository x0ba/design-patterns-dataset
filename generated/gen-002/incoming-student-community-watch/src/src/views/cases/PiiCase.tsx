import { useState } from 'react';
import { useStore } from '../../store';
import { PII } from '../../data/cases';
import { leaderById } from '../../data/community';
import { Btn, Pill, hhmm, AssignModal, Avatar, StatusDot } from '../../components/ui';
import { piiSteps, visiblePiiComments } from '../../progress';
import { CaseHead, Section, Done } from './common';

const mask = (p: string) => p.replace(/\d{4}$/, '••••');
const allEntries = PII.comments.flatMap((c) => c.entries);

export default function PiiCase() {
  const s = useStore();
  const [reveal, setReveal] = useState(false);
  const [assign, setAssign] = useState(false);
  const steps = piiSteps(s);
  const visible = visiblePiiComments(s);

  const hide = (ids: string[]) =>
    s.act(ids.length > 1 ? `${ids.length} comments hidden` : 'Comment hidden', (d) => ({ pii: { ...d.pii, hidden: [...new Set([...d.pii.hidden, ...ids])] } }),
      { undoable: true, log: `Personal info (Roommate Search 2030): hid ${ids.length} comment${ids.length > 1 ? 's' : ''} by ${PII.poster.name} listing others’ phone numbers` });

  return (
    <div className="case">
      <CaseHead kind="Personal info exposure" tone="violet"
        title="Phone numbers posted in a roommate thread"
        meta={<>Roommate Search 2030 · 2 reports · {allEntries.length} students’ numbers · {visible.length > 0 ? <Pill tone="violet" solid>{visible.reduce((a, c) => a + c.views, 0)} views so far, still visible</Pill> : <Pill tone="green">Hidden</Pill>}</>}
        steps={steps} />

      <div className="case-actions sticky">
        <Btn kind={visible.length ? 'primary' : 'secondary'} disabled={!visible.length} onClick={() => hide(visible.map((c) => c.id))}>
          {visible.length ? `Hide ${visible.length === 2 ? 'both comments' : 'comment'} now` : 'Comments hidden'}
        </Btn>
        <Btn kind={!visible.length && !s.pii.leader ? 'primary' : 'secondary'} disabled={!!s.pii.leader} onClick={() => setAssign(true)}>
          {s.pii.leader ? `Follow-up with ${leaderById(s.pii.leader).name.split(' ')[0]}` : 'Hand follow-up to a leader'}
        </Btn>
        <span className="spacer" />
        <Btn kind="ghost" small onClick={() => setReveal((r) => !r)}>{reveal ? 'Mask numbers' : 'Reveal numbers'}</Btn>
      </div>

      <div className="case-body two-col">
        <div className="col-main">
          <Section title="Thread" aside={<span className="muted">{PII.threadComments} comments · started by {PII.threadBy}</span>}>
            <div className="thread-title">“{PII.thread}”</div>
            {PII.comments.map((c) => {
              const hidden = s.pii.hidden.includes(c.id);
              return (
                <article key={c.id} className={`post compact${hidden ? ' removed' : ''}`}>
                  <div className="post-head">
                    <Avatar initials="TB" size={26} />
                    <div><div className="post-author">{PII.poster.name}</div><div className="post-sub">{hhmm(c.at)} · {c.views} views</div></div>
                    <span className="spacer" />
                    {hidden ? <Pill tone="slate">Hidden by staff</Pill> : <button className="link-btn" onClick={() => hide([c.id])}>Hide</button>}
                  </div>
                  <p className="post-body">{c.intro}</p>
                  <ul className="pii-list">
                    {c.entries.map((e) => <li key={e.name}><span>{e.name}</span><mark className="mark-violet mono">{reveal ? e.phone : mask(e.phone)}</mark></li>)}
                  </ul>
                </article>
              );
            })}
          </Section>
          <Section title="Reports">
            {PII.reports.map((r) => (
              <div className="report-note" key={r.at}>
                <div className="rn-reason">Personal information · <span className="mono">{hhmm(r.at)}</span></div>
                <div>“{r.note}”</div>
                <div className="rn-by">— {r.by} (number is in the list)</div>
              </div>
            ))}
          </Section>
        </div>
        <aside className="col-side">
          <Section title="Suggested split">
            <ol className="plain-list numbered">
              <li><b>You, now:</b> hide both comments. It takes one click and the numbers have already been seen {PII.comments.reduce((a, c) => a + c.views, 0)} times.</li>
              <li><b>Leader:</b> message {PII.poster.name.split(' ')[0]} about the privacy guideline (first time, no prior warnings) and tell the {allEntries.length} students their numbers were exposed.</li>
            </ol>
          </Section>
          <Section title="Poster">
            <dl className="facts">
              <dt>Account</dt><dd>{PII.poster.name}</dd>
              <dt>Admissions</dt><dd>{PII.poster.record}</dd>
              <dt>Prior warnings</dt><dd>None</dd>
              <dt>Likely intent</dt><dd>Trying to help, not malicious — the source is a private group chat</dd>
            </dl>
          </Section>
          {s.pii.leader && (
            <Section title="Handed off">
              <div className="leader-line">
                <Avatar initials={leaderById(s.pii.leader).initials} size={26} tone="teal" />
                <div><b>{leaderById(s.pii.leader).name}</b><div className="muted small"><StatusDot status={leaderById(s.pii.leader).status} />{leaderById(s.pii.leader).statusNote}</div></div>
              </div>
              <div className="quote small">{s.pii.leaderNote}</div>
              <Done>In their queue</Done>
            </Section>
          )}
        </aside>
      </div>

      {assign && (
        <AssignModal title="Hand off follow-up" sub="Roommate Search 2030 · personal info exposure" groupIds={['roommates']}
          defaultNote={`I've hidden Tyler Brandt's two comments in the Hartwell + Ostrander roommate thread. Please (1) message Tyler with the privacy guideline: don't share other students' contact info without their OK, first notice; (2) let the 7 students listed know their numbers were posted for about an hour and that they can report unwanted texts to us. Close it out in Watch when done.`}
          onClose={() => setAssign(false)}
          onAssign={(lid, note) => {
            s.act(`Follow-up handed to ${leaderById(lid).name}`, (d) => ({ pii: { ...d.pii, leader: lid, leaderNote: note }, handoffs: { ...d.handoffs, [lid]: (d.handoffs[lid] ?? 0) + 1 } }),
              { log: `Personal info (Roommate Search 2030): handed follow-up to ${leaderById(lid).name}` });
            setAssign(false);
          }} />
      )}
    </div>
  );
}
