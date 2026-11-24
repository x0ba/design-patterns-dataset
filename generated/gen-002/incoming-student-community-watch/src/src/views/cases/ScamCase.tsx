import { useState } from 'react';
import { useStore, nowMs } from '../../store';
import { SCAM_ACCOUNTS, SCAM_MESSAGES, SCAM_SIGNALS, LAST_AUGUST, SCAM_HIGHLIGHT, SCAM_GROUP_IDS, SCAM_DM_RECIPIENTS } from '../../data/cases';
import { groupById, GROUPS } from '../../data/community';
import { Btn, Modal, Pill, hhmm, Check } from '../../components/ui';
import { scamSteps, visibleScamPosts } from '../../progress';
import { CaseHead, Section, Done, Highlight } from './common';

const posts = SCAM_MESSAGES.filter((m) => m.state !== 'dm');
const acct = (id: string) => SCAM_ACCOUNTS.find((a) => a.id === id)!;

function RemoveModal({ onClose }: { onClose: () => void }) {
  const act = useStore((s) => s.act);
  const [suspend, setSuspend] = useState(true);
  const [block, setBlock] = useState(true);
  return (
    <Modal title={`Remove ${posts.length} posts${suspend ? ` and suspend ${SCAM_ACCOUNTS.length} accounts` : ''}`} sub="Removed content is kept as evidence for Housing and University Police. You can undo for a few seconds." onClose={onClose}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="danger" onClick={() => {
          act(`Removed ${posts.length} scam posts${suspend ? `, suspended ${SCAM_ACCOUNTS.length} accounts` : ''}`, (d) => ({
            scam: { ...d.scam, removed: posts.map((p) => p.id), suspended: suspend ? SCAM_ACCOUNTS.map((a) => a.id) : d.scam.suspended },
          }), { undoable: true, log: `Scam wave: removed ${posts.length} posts (2 visible, 11 held)${suspend ? ` and suspended ${SCAM_ACCOUNTS.length} accounts${block ? '; blocked their DMs' : ''}` : ''}` });
          onClose();
        }}>Remove{suspend ? ' and suspend' : ''}</Btn></>}>
      <ul className="plain-list">
        <li><b>2 visible posts</b> come down now (Hartwell Hall 2030, Class of 2030 General)</li>
        <li><b>11 held posts</b> are rejected instead of waiting in the review queue</li>
        <li>Students who already replied to a visible post see “removed by staff”</li>
      </ul>
      <Check checked={suspend} onChange={setSuspend}>Suspend all {SCAM_ACCOUNTS.length} accounts (none has an admissions record)</Check>
      <Check checked={block} onChange={setBlock}>Block their pending DMs from being delivered</Check>
    </Modal>
  );
}

function MbekiModal({ onClose }: { onClose: () => void }) {
  const act = useStore((s) => s.act);
  const [note, setNote] = useState(
    'Fake sublet wave targeting admitted first-years started 09:41 today — same script as last August (furnished room “6 min walk”, $600–650/mo, $300 Zelle deposit, “abroad, will mail keys”). ' +
    'One payment handle seen so far: Zelle 555-0193. We’ve removed the posts and suspended the accounts. Could you check whether any students have reported paying, and advise on a notice from Housing?',
  );
  return (
    <Modal title="Send case to D. Mbeki, Housing Fraud Liaison" sub="Residential Life · (555) 014-6612 · Mon–Fri 8:30–17:00" onClose={onClose} width={680}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={() => {
          act('Case sent to D. Mbeki (Housing fraud)', (d) => ({ scam: { ...d.scam, mbekiAt: nowMs() } }), { log: 'Scam wave: sent evidence package to D. Mbeki, Housing Fraud Liaison' });
          onClose();
        }}>Send evidence package</Btn></>}>
      <div className="evidence">
        <div className="ev-title">Evidence package (attached automatically)</div>
        <div className="ev-grid">
          <span>Accounts</span><b>{SCAM_ACCOUNTS.length} · created 09:12–09:38 · sign-up emails and IPs</b>
          <span>Messages</span><b>{SCAM_MESSAGES.length} · full text and timestamps, incl. 2 reported DMs</b>
          <span>Payment handle</span><b className="mono">Zelle 555-0193</b>
          <span>Students reached</span><b>{SCAM_DM_RECIPIENTS} by DM · ~{SCAM_GROUP_IDS.reduce((a, g) => a + groupById(g).members, 0).toLocaleString()} group members could see posts</b>
          <span>Prior pattern</span><b>{LAST_AUGUST}</b>
        </div>
      </div>
      <label className="field-label" htmlFor="mb-note">Note</label>
      <textarea id="mb-note" className="textarea" rows={5} value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  );
}

function WarningModal({ onClose }: { onClose: () => void }) {
  const act = useStore((s) => s.act);
  const [scope, setScope] = useState<'affected' | 'all'>('all');
  const [text, setText] = useState(
    '⚠️ Housing scam alert from New Student Programs\n\n' +
    'Accounts that are not admitted students are posting “cheap furnished room near campus” offers and asking for a deposit by Zelle, often saying they’re studying abroad and will mail keys.\n\n' +
    '• University Housing and real landlords never ask for a deposit by Zelle, Venmo or CashApp to “hold” a room.\n' +
    '• If someone messages you about a room, don’t send money. Report the message with the ⋯ menu.\n' +
    '• If you already paid, contact Housing Fraud Liaison D. Mbeki at (555) 014-6612 today — the sooner, the better the chance of stopping the payment.',
  );
  const n = scope === 'all' ? GROUPS.length : SCAM_GROUP_IDS.length;
  return (
    <Modal title="Post a community warning" sub="Posts from the New Student Programs account and pins to the top of each group for 7 days." onClose={onClose} width={700}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={() => {
          act(`Warning pinned in ${n} groups`, (d) => ({ scam: { ...d.scam, warningAt: nowMs(), warningGroups: n } }), { log: `Scam wave: pinned housing scam warning in ${n} groups` });
          onClose();
        }}>Pin in {n} groups</Btn></>}>
      <div className="seg">
        <button className={scope === 'affected' ? 'on' : ''} onClick={() => setScope('affected')}>{SCAM_GROUP_IDS.length} groups where it appeared</button>
        <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>All {GROUPS.length} groups</button>
      </div>
      <textarea className="textarea" rows={11} value={text} onChange={(e) => setText(e.target.value)} aria-label="Warning text" />
    </Modal>
  );
}

function NotifyModal({ onClose }: { onClose: () => void }) {
  const act = useStore((s) => s.act);
  const [text, setText] = useState(
    'Hi — this is New Student Programs. An account that messaged you today has been removed for running a housing scam. Please don’t send any money to it. ' +
    'If you already sent a deposit, contact Housing Fraud Liaison D. Mbeki at (555) 014-6612 today. You haven’t done anything wrong by replying.',
  );
  return (
    <Modal title={`Message the ${SCAM_DM_RECIPIENTS} students these accounts DM’d`} sub="Sent individually from the NSP account. We know who was messaged, not what each DM said." onClose={onClose}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={() => {
          act(`Safety notice sent to ${SCAM_DM_RECIPIENTS} students`, (d) => ({ scam: { ...d.scam, recipientsNotifiedAt: nowMs() } }), { log: `Scam wave: sent safety notice to ${SCAM_DM_RECIPIENTS} DM recipients` });
          onClose();
        }}>Send to {SCAM_DM_RECIPIENTS} students</Btn></>}>
      <textarea className="textarea" rows={6} value={text} onChange={(e) => setText(e.target.value)} aria-label="Notice text" />
    </Modal>
  );
}

export default function ScamCase() {
  const s = useStore();
  const [modal, setModal] = useState<null | 'remove' | 'mbeki' | 'warn' | 'notify'>(null);
  const [filter, setFilter] = useState<'all' | 'visible' | 'held' | 'dm'>('all');
  const steps = scamSteps(s);
  const vis = visibleScamPosts(s);
  const allRemoved = steps[0].done;
  const msgs = SCAM_MESSAGES.filter((m) => filter === 'all' || m.state === filter).sort((a, b) => {
    const live = (m: typeof a) => (m.state === 'visible' && !s.scam.removed.includes(m.id) ? 0 : 1);
    return live(a) - live(b) || a.at - b.at;
  });

  return (
    <div className="case">
      <CaseHead kind="Scam pattern · money" tone="amber"
        title="Housing scam wave: ‘cheap room near campus, Zelle deposit’"
        meta={<>{SCAM_ACCOUNTS.length} accounts · {SCAM_MESSAGES.length} messages · {SCAM_GROUP_IDS.length} groups · 4 student reports · first post 09:41 · {vis.length > 0 ? <Pill tone="amber" solid>{vis.length} posts visible to students</Pill> : <Pill tone="green">Nothing visible</Pill>}</>}
        steps={steps} />

      <div className="case-actions sticky">
        <Btn kind={allRemoved ? 'secondary' : 'danger'} disabled={allRemoved} onClick={() => setModal('remove')}>{allRemoved ? 'Posts removed' : `Remove ${posts.length} posts + suspend accounts`}</Btn>
        <Btn kind={allRemoved && !s.scam.mbekiAt ? 'primary' : 'secondary'} disabled={!!s.scam.mbekiAt} onClick={() => setModal('mbeki')}>{s.scam.mbekiAt ? `Sent to D. Mbeki ${hhmm(s.scam.mbekiAt)}` : 'Send to D. Mbeki'}</Btn>
        <Btn disabled={!!s.scam.warningAt} onClick={() => setModal('warn')}>{s.scam.warningAt ? `Warning pinned · ${s.scam.warningGroups} groups` : 'Post community warning'}</Btn>
        <Btn disabled={!!s.scam.recipientsNotifiedAt} onClick={() => setModal('notify')}>{s.scam.recipientsNotifiedAt ? `${SCAM_DM_RECIPIENTS} students notified` : `Notify ${SCAM_DM_RECIPIENTS} DM recipients`}</Btn>
      </div>

      <div className="case-body two-col">
        <div className="col-main">
          <Section title={`Messages (${SCAM_MESSAGES.length})`} aside={
            <div className="seg seg-sm">
              {(['all', 'visible', 'held', 'dm'] as const).map((f) => (
                <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All' : f === 'visible' ? 'Visible' : f === 'held' ? 'Auto-held' : 'Reported DMs'}
                </button>
              ))}
            </div>}>
            <div className="msg-list">
              {msgs.map((m) => {
                const removed = s.scam.removed.includes(m.id);
                const a = acct(m.accountId);
                return (
                  <div key={m.id} className={`msg${removed ? ' removed' : ''}${m.state === 'visible' && !removed ? ' live' : ''}`}>
                    <div className="msg-meta">
                      <span className="mono">{hhmm(m.at)}</span>
                      <b>{a.name}</b>
                      <span className="muted">{m.groupId ? `in ${groupById(m.groupId).name}` : 'direct message'}</span>
                      <span className="spacer" />
                      {removed ? <Pill tone="slate">Removed</Pill>
                        : m.state === 'visible' ? <Pill tone="amber" solid>Visible</Pill>
                        : m.state === 'held' ? <Pill tone="slate">Auto-held</Pill>
                        : <Pill tone="violet">DM · reported</Pill>}
                      {m.reported && m.state !== 'dm' && <Pill tone="red">Reported</Pill>}
                      {!removed && m.state !== 'dm' && (
                        <button className="link-btn" onClick={() => s.act('Post removed', (d) => ({ scam: { ...d.scam, removed: [...d.scam.removed, m.id] } }), { undoable: true, log: `Scam wave: removed post by ${a.name} in ${groupById(m.groupId!).name}` })}>Remove</button>
                      )}
                    </div>
                    <div className="msg-body"><Highlight text={m.body} re={SCAM_HIGHLIGHT} /></div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        <aside className="col-side">
          <Section title="Why this looks coordinated">
            <ul className="signals">
              {SCAM_SIGNALS.map((x) => <li key={x.label}><b>{x.label}</b><span>{x.detail}</span></li>)}
            </ul>
            <div className="callout callout-amber tight"><b>Last August:</b> {LAST_AUGUST}</div>
          </Section>

          <Section title={`Accounts (${SCAM_ACCOUNTS.length})`}>
            <table className="mini-table">
              <thead><tr><th>Account</th><th>Created</th><th>DMs</th><th /></tr></thead>
              <tbody>
                {SCAM_ACCOUNTS.map((a) => {
                  const sus = s.scam.suspended.includes(a.id);
                  return (
                    <tr key={a.id} className={sus ? 'dim' : ''}>
                      <td><div>{a.name}</div><div className="muted small mono">{a.email}</div></td>
                      <td className="mono">{hhmm(a.createdAt)}</td>
                      <td>{a.dms} <span className="muted small">→{a.dmRecipients}</span></td>
                      <td className="right">{sus ? <span className="muted small">Suspended</span> : (
                        <button className="link-btn" onClick={() => s.act(`Suspended ${a.name}`, (d) => ({ scam: { ...d.scam, suspended: [...d.scam.suspended, a.id] } }), { undoable: true, log: `Scam wave: suspended account “${a.name}”` })}>Suspend</button>
                      )}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="muted small" style={{ marginTop: 8 }}>
              A seventh profile, “Campus Housing Help”, joined the same groups at 11:50. <button className="link-btn" onClick={() => s.select('accounts')}>Review it →</button>
            </div>
          </Section>

          <Section title="Stop the next wave">
            <Check checked={s.scam.autoHold} onChange={(v) => s.act(v ? 'Look-alike posts will be auto-held' : 'Auto-hold rule turned off', (d) => ({ scam: { ...d.scam, autoHold: v } }), { log: `Scam wave: ${v ? 'enabled' : 'disabled'} auto-hold for posts and DMs from unverified accounts that mention deposits or payment apps` })}>
              Auto-hold posts <i>and DMs</i> from accounts without an admissions record that mention a deposit, Zelle, Venmo, CashApp or Wise
            </Check>
            {s.scam.autoHold && <Done>Active · applies to new content immediately</Done>}
          </Section>
        </aside>
      </div>

      {modal === 'remove' && <RemoveModal onClose={() => setModal(null)} />}
      {modal === 'mbeki' && <MbekiModal onClose={() => setModal(null)} />}
      {modal === 'warn' && <WarningModal onClose={() => setModal(null)} />}
      {modal === 'notify' && <NotifyModal onClose={() => setModal(null)} />}
    </div>
  );
}
