import { useState } from 'react';
import { useStore } from '../store';
import { hhmm } from '../components/ui';

export default function ActivityLog() {
  const log = useStore((s) => s.log);
  const [who, setWho] = useState<'all' | 'me' | 'leader' | 'system'>('all');
  const list = log.filter((e) => who === 'all' || e.kind === who);
  return (
    <div className="page narrow">
      <div className="page-head">
        <div>
          <h1>Activity log</h1>
          <p className="page-sub">Every staff, leader and system action today. Your actions are kept for the case record.</p>
        </div>
      </div>
      <div className="seg seg-sm" style={{ marginBottom: 14 }}>
        {(['all', 'me', 'leader', 'system'] as const).map((k) => (
          <button key={k} className={who === k ? 'on' : ''} onClick={() => setWho(k)}>{k === 'all' ? 'Everything' : k === 'me' ? 'You' : k === 'leader' ? 'Leaders' : 'System'}</button>
        ))}
      </div>
      <ul className="log">
        {list.map((e) => (
          <li key={e.id} className={`log-${e.kind}`}>
            <span className="mono">{hhmm(e.at)}</span>
            <span className="log-who">{e.who}</span>
            <span>{e.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
