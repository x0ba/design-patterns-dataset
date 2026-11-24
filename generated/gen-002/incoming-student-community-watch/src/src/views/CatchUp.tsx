import type { ReactNode } from 'react';
import { useStore, type CaseId } from '../store';
import { NEXT_SESSION_AT, COMMUNITY } from '../data/community';
import { WELLBEING, SCAM_MESSAGES, SCAM_ACCOUNTS, HELD_POSTS, QUESTIONS, UNVERIFIED, PII, SCAM_GROUP_IDS, SCAM_DM_RECIPIENTS, QUESTION_VIEWS } from '../data/cases';
import { dur, hhmm, useNow, Pill, type Tone } from '../components/ui';
import { wbSteps, scamSteps, piiSteps, stateOf, heldDone, questionsAssigned, accountsDone, visibleScamPosts, visiblePiiComments, type Step } from '../progress';
import WellbeingCase from './cases/WellbeingCase';
import ScamCase from './cases/ScamCase';
import PiiCase from './cases/PiiCase';
import AccountsCase from './cases/AccountsCase';
import { QuestionsPanel } from './Questions';
import { HeldPanel } from './HeldPosts';

interface CardProps {
  id: CaseId; tone: Tone; kind: string; title: string; why: ReactNode; meta: ReactNode; route: ReactNode;
  steps?: Step[]; frac?: [number, number]; urgent?: boolean; urgentLabel?: string;
}

function Card(p: CardProps) {
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const done = p.steps ? p.steps.filter((x) => x.done).length : p.frac![0];
  const total = p.steps ? p.steps.length : p.frac![1];
  const complete = done === total;
  return (
    <button className={`qcard tone-${p.tone}${selected === p.id ? ' sel' : ''}${complete ? ' complete' : ''}`} onClick={() => select(p.id)}>
      <div className="qc-top">
        <span className={`qc-kind k-${p.tone}`}>{p.kind}</span>
        {p.urgent && !complete && <Pill tone={p.tone === 'amber' ? 'amber' : 'red'} solid>{p.urgentLabel ?? 'Waiting'}</Pill>}
        {complete && <Pill tone="green">Done</Pill>}
      </div>
      <div className="qc-title">{p.title}</div>
      <div className="qc-why">{p.why}</div>
      <div className="qc-meta">{p.meta}</div>
      <div className="qc-foot">
        <span className="qc-route">{p.route}</span>
        <span className="qc-prog">
          <span className="qc-bar"><span style={{ width: `${(done / total) * 100}%` }} /></span>
          <span className="mono">{done}/{total}</span>
        </span>
      </div>
    </button>
  );
}

export default function CatchUp() {
  const s = useStore();
  const now = useNow();
  const wb = wbSteps(s), scam = scamSteps(s), pii = piiSteps(s);
  const wbWait = now - WELLBEING.postedAt;
  const vis = visibleScamPosts(s).length;
  const visPii = visiblePiiComments(s).length;
  const needsYou = [wb, scam].filter((x) => stateOf(x) !== 'done').length;
  const quick = (stateOf(pii) !== 'done' ? 1 : 0) + (accountsDone(s) < UNVERIFIED.length ? 1 : 0);
  const untilSession = NEXT_SESSION_AT - now;

  return (
    <div className="catchup">
      <section className="queue">
        <div className="queue-head">
          <div className="eyebrow">Since 9:00 · {dur(now - new Date(2026, 7, 13, 9, 0).getTime())} of activity · {COMMUNITY.postsSince9} posts</div>
          <h1 className="queue-title">
            {needsYou + quick === 0 ? 'Nothing left that needs you personally.' : <>{needsYou} {needsYou === 1 ? 'thing needs' : 'things need'} you{quick > 0 && <>, {quick} quick {quick === 1 ? 'call' : 'calls'}</>}</>}
          </h1>
          <div className="queue-sub">
            {untilSession > 0 ? <>About <b>{dur(untilSession)}</b> before Session D. </> : null}
            Everything else can go to the {7} leaders on shift.
          </div>
          <div className="since-stats">
            <span><b>7</b> reports</span><span><b>23</b> auto-held</span><span><b>14</b> unanswered &gt; 6h</span><span><b>9</b> new unverified</span>
          </div>
        </div>

        <div className="lane-label"><span className="lane-dot red" />Needs you</div>
        <Card id="wellbeing" tone="red" kind="Wellbeing" urgent={stateOf(wb) === 'open'}
          title="A Hartwell Hall admit may be in distress"
          why={<>“…not sure there’s a point in me showing up on the 25th.” Reported by a peer; no staff response yet.</>}
          meta={<>Posted {hhmm(WELLBEING.postedAt)} · <b className={stateOf(wb) === 'open' ? 'txt-red' : ''}>{stateOf(wb) === 'open' ? `waiting ${dur(wbWait)}` : 'in progress'}</b> · 3 peer replies</>}
          route={<>Staff-only per wellbeing protocol</>}
          steps={wb} />
        <Card id="scam" tone="amber" kind="Scam pattern" urgent={vis > 0} urgentLabel="Live"
          title="Housing scam wave: ‘cheap room, Zelle deposit’"
          why={<>{SCAM_ACCOUNTS.length} new accounts, {SCAM_MESSAGES.length} near-identical messages in {SCAM_GROUP_IDS.length} groups since 09:41. Same pattern as last August.</>}
          meta={<>{vis > 0 ? <b className="txt-amber">{vis} posts still visible</b> : 'No posts visible'} · 4 student reports · 11 auto-held · {SCAM_DM_RECIPIENTS} students DM’d</>}
          route={<>You + D. Mbeki (Housing fraud)</>}
          steps={scam} />

        <div className="lane-label"><span className="lane-dot violet" />Quick calls · under a minute each</div>
        <Card id="pii" tone="violet" kind="Personal info"
          title="Phone numbers posted in a roommate thread"
          why={<>7 students’ numbers copied from a group chat into Roommate Search 2030 — two of them reported it.</>}
          meta={<>{visPii > 0 ? <b className="txt-violet">{visPii} comments visible · {PII.comments.filter((c) => !s.pii.hidden.includes(c.id)).reduce((a, c) => a + c.views, 0)} views</b> : 'Comments hidden'} · first posted {hhmm(PII.comments[0].at)}</>}
          route={<>Hide now · follow-up → {s.pii.leader ? 'handed off' : 'Aaliyah Brooks (on shift)'}</>}
          steps={pii} />
        <Card id="accounts" tone="slate" kind="Accounts"
          title="3 other unverified accounts need a decision"
          why={<>A parent, a likely admit on a personal email, and a profile posing as campus housing.</>}
          meta={<>Created today 08:05–11:50 · the other 6 belong to the scam wave</>}
          route={<>Verify · redirect · suspend</>}
          frac={[accountsDone(s), UNVERIFIED.length]} />

        <div className="lane-label"><span className="lane-dot teal" />Hand to orientation leaders</div>
        <Card id="questions" tone="teal" kind="Questions"
          title="14 questions unanswered for more than 6 hours"
          why={<>Meal plans (5), parking (4), move-in (3), other (2). Most covering leaders are on shift.</>}
          meta={<>Oldest from 00:34 · {QUESTION_VIEWS.toLocaleString()} views combined</>}
          route={<>Distribute to covering leaders</>}
          frac={[questionsAssigned(s), QUESTIONS.length]} />
        <Card id="held" tone="teal" kind="Held posts"
          title="12 routine held posts (links, payment terms)"
          why={<>Textbooks, rideshares, club links — plus a parking-permit resale, free-concert ‘tickets’ and a GoFundMe worth a look.</>}
          meta={<>The other 11 held posts are part of the scam wave</>}
          route={<>Approve the obvious ones · hand off the rest</>}
          frac={[heldDone(s), HELD_POSTS.length]} />
      </section>

      <section className="detail">
        {s.selected === 'wellbeing' && <WellbeingCase />}
        {s.selected === 'scam' && <ScamCase />}
        {s.selected === 'pii' && <PiiCase />}
        {s.selected === 'accounts' && <AccountsCase />}
        {s.selected === 'questions' && <div className="detail-pad"><QuestionsPanel compact /></div>}
        {s.selected === 'held' && <div className="detail-pad"><HeldPanel compact /></div>}
      </section>
    </div>
  );
}
