import { useState } from 'react';
import { useStore } from '../store';
import { QUESTIONS, QUESTION_VIEWS, type Question, type Topic } from '../data/cases';
import { LEADERS, groupById, leaderById } from '../data/community';
import { Btn, Pill, dur, useNow, StatusDot, type Tone } from '../components/ui';

const TOPIC_OWNER: Record<Topic, string> = { 'Meal plans': 'l12', Parking: 'l2', 'Move-in': 'l16', Other: 'l16' };
const TOPIC_TONE: Record<Topic, Tone> = { 'Meal plans': 'teal', Parking: 'blue', 'Move-in': 'violet', Other: 'slate' };

export function suggestLeader(q: Question) {
  const covering = groupById(q.groupId).leaders.map(leaderById).find((l) => l.status === 'shift');
  return covering ? { id: covering.id, why: 'covers group' } : { id: TOPIC_OWNER[q.topic], why: `${q.topic.toLowerCase()} lead · group leader ${groupById(q.groupId).leaders.map(leaderById).map((l) => l.status === 'off' ? 'off' : 'in session')[0]}` };
}

export function QuestionsPanel({ compact }: { compact?: boolean }) {
  const s = useStore();
  const now = useNow();
  const [topic, setTopic] = useState<Topic | 'All'>('All');
  const [picks, setPicks] = useState<Record<string, string>>(() => Object.fromEntries(QUESTIONS.map((q) => [q.id, suggestLeader(q).id])));
  const list = QUESTIONS.filter((q) => topic === 'All' || q.topic === topic).sort((a, b) => a.at - b.at);
  const unassigned = QUESTIONS.filter((q) => !s.questions[q.id]);
  const onShift = LEADERS.filter((l) => l.status === 'shift');

  const assignAll = () => {
    const counts: Record<string, number> = {};
    unassigned.forEach((q) => { counts[picks[q.id]] = (counts[picks[q.id]] ?? 0) + 1; });
    s.act(`${unassigned.length} questions sent to ${Object.keys(counts).length} leaders`, (d) => {
      const handoffs = { ...d.handoffs };
      Object.entries(counts).forEach(([l, n]) => { handoffs[l] = (handoffs[l] ?? 0) + n; });
      return { questions: { ...d.questions, ...Object.fromEntries(unassigned.map((q) => [q.id, picks[q.id]])) }, handoffs };
    }, { undoable: true, log: `Unanswered questions: distributed ${unassigned.length} to ${Object.entries(counts).map(([l, n]) => `${leaderById(l).name.split(' ')[0]} (${n})`).join(', ')}` });
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          {compact && <div className="case-kind k-teal">Questions · hand to leaders</div>}
          <h2 className={compact ? 'case-title' : 'sr-only'}>14 questions unanswered for more than 6 hours</h2>
          <div className="case-meta">{QUESTIONS.length - unassigned.length}/{QUESTIONS.length} assigned · {QUESTION_VIEWS.toLocaleString()} views combined — other students are waiting on these answers too</div>
        </div>
        <Btn kind="primary" disabled={!unassigned.length} onClick={assignAll}>{unassigned.length ? `Send ${unassigned.length} to suggested leaders` : 'All assigned'}</Btn>
      </div>
      <div className="seg seg-sm" style={{ margin: '12px 0' }}>
        {(['All', 'Meal plans', 'Parking', 'Move-in', 'Other'] as const).map((t) => (
          <button key={t} className={topic === t ? 'on' : ''} onClick={() => setTopic(t)}>
            {t} <span className="muted">{t === 'All' ? QUESTIONS.length : QUESTIONS.filter((q) => q.topic === t).length}</span>
          </button>
        ))}
      </div>
      <div className="q-list">
        {list.map((q) => {
          const assigned = s.questions[q.id];
          const sug = suggestLeader(q);
          return (
            <div key={q.id} className={`q-row${assigned ? ' assigned' : ''}`}>
              <div className="q-main">
                <div className="q-meta"><Pill tone={TOPIC_TONE[q.topic]}>{q.topic}</Pill><b>{groupById(q.groupId).name}</b><span className="muted">{q.author} · <span className={now - q.at > 9 * 3600000 ? 'txt-amber' : ''}>waiting {dur(now - q.at)}</span> · {q.views} views</span></div>
                <div className="q-body">{q.body}</div>
              </div>
              <div className="q-assign">
                {assigned ? (
                  <div className="q-assigned"><StatusDot status={leaderById(assigned).status} />With {leaderById(assigned).name}</div>
                ) : (
                  <>
                    <select className="select" value={picks[q.id]} onChange={(e) => setPicks({ ...picks, [q.id]: e.target.value })} aria-label="Assign to">
                      {onShift.map((l) => <option key={l.id} value={l.id}>{l.name}{l.id === sug.id ? ` · ${sug.why}` : ''}</option>)}
                    </select>
                    <Btn small onClick={() => s.act(`Question sent to ${leaderById(picks[q.id]).name.split(' ')[0]}`, (d) => ({ questions: { ...d.questions, [q.id]: picks[q.id] }, handoffs: { ...d.handoffs, [picks[q.id]]: (d.handoffs[picks[q.id]] ?? 0) + 1 } }), { log: `Unanswered question in ${groupById(q.groupId).name} sent to ${leaderById(picks[q.id]).name}` })}>Send</Btn>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Questions() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Unanswered for more than 6 hours</h1>
          <p className="page-sub">Questions with no reply from staff, leaders or students. Suggestions go to a leader on shift who covers the group, or to the topic lead.</p>
        </div>
      </div>
      <QuestionsPanel />
    </div>
  );
}
