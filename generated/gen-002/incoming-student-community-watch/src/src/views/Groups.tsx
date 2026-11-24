import { useState } from 'react';
import { useStore } from '../store';
import { GROUPS, LEADERS, leaderById, type GroupKind } from '../data/community';
import { SCAM_MESSAGES, QUESTIONS, HELD_POSTS, PII, WELLBEING } from '../data/cases';
import { StatusDot, Pill } from '../components/ui';

const KINDS: (GroupKind | 'All')[] = ['All', 'Residence hall', 'Community', 'International', 'Practical', 'Major'];
type Sort = 'posts' | 'members' | 'open' | 'name';

export default function Groups() {
  const s = useStore();
  const [kind, setKind] = useState<GroupKind | 'All'>('All');
  const [sort, setSort] = useState<Sort>('open');
  const openFor = (gid: string) => {
    let n = 0;
    if (gid === WELLBEING.groupId && s.wb.resolvedAt === null) n++;
    if (gid === PII.groupId) n += PII.comments.filter((c) => !s.pii.hidden.includes(c.id)).length;
    n += SCAM_MESSAGES.filter((m) => m.groupId === gid && !s.scam.removed.includes(m.id)).length;
    n += QUESTIONS.filter((q) => q.groupId === gid && !s.questions[q.id]).length;
    n += HELD_POSTS.filter((h) => h.groupId === gid && s.held[h.id] === 'pending').length;
    return n;
  };
  const rows = GROUPS.filter((g) => kind === 'All' || g.kind === kind).map((g) => ({ g, open: openFor(g.id) }))
    .sort((a, b) => sort === 'name' ? a.g.name.localeCompare(b.g.name) : sort === 'members' ? b.g.members - a.g.members : sort === 'posts' ? b.g.posts24h - a.g.posts24h : b.open - a.open || b.g.posts24h - a.g.posts24h);
  const th = (k: Sort, label: string, num = true) => (
    <th className={`${num ? 'num ' : ''}sortable${sort === k ? ' on' : ''}`} onClick={() => setSort(k)}>{label}{sort === k ? ' ↓' : ''}</th>
  );
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Groups</h1>
          <p className="page-sub">{GROUPS.length} groups · {GROUPS.reduce((a, g) => a + g.posts24h, 0).toLocaleString()} posts in the last 24 hours · {LEADERS.length} leaders assigned</p>
        </div>
      </div>
      <div className="seg seg-sm" style={{ marginBottom: 14 }}>
        {KINDS.map((k) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k} <span className="muted">{k === 'All' ? GROUPS.length : GROUPS.filter((g) => g.kind === k).length}</span></button>)}
      </div>
      <table className="table">
        <thead><tr>{th('name', 'Group', false)}<th>Type</th>{th('members', 'Members')}{th('posts', 'Posts 24h')}<th>Leader</th>{th('open', 'Open items')}</tr></thead>
        <tbody>
          {rows.map(({ g, open }) => (
            <tr key={g.id}>
              <td><b>{g.name}</b></td>
              <td className="muted">{g.kind}</td>
              <td className="num">{g.members.toLocaleString()}</td>
              <td className="num"><span className="spark"><span style={{ width: `${Math.min(100, (g.posts24h / 168) * 100)}%` }} /></span>{g.posts24h}</td>
              <td>{g.leaders.map((id) => { const l = leaderById(id); return <span key={id} className="nowrap"><StatusDot status={l.status} />{l.name}</span>; })}</td>
              <td className="num">{open > 0 ? <Pill tone={open > 2 ? 'amber' : 'slate'}>{open}</Pill> : <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
