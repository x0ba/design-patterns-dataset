import { useState } from 'react';
import type { Session } from '../types';
import { PEOPLE } from '../data/people';
import { useApp } from '../store';
import { dayLabel, dur, nowV, when } from '../lib/time';
import { Avatar, Icon } from './ui';

const tone = (s: Session) => (s.minutes <= s.target ? 'ok' : s.minutes <= s.target + 15 ? 'mid' : 'bad');
const TAGS = ['harbor', 'economy', 'pacing', 'rules', 'docking', 'balance', 'feel'];

function Trend({ sessions, sel, onSel }: { sessions: Session[]; sel: string; onSel: (id: string) => void }) {
  const W = 340, H = 170, pad = { l: 30, r: 8, t: 10, b: 28 };
  const max = 150;
  const bw = (W - pad.l - pad.r) / sessions.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Session length by playtest against the 90 minute target">
      {[0, 30, 60, 90, 120].map((t) => (
        <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="axis">{t}</text></g>
      ))}
      {sessions.map((s, i) => {
        const x = pad.l + i * bw + bw * 0.16;
        const w = bw * 0.68;
        return (
          <g key={s.id} className={`bar ${tone(s)} ${sel === s.id ? 'sel' : ''}`} onClick={() => onSel(s.id)} tabIndex={0} role="button" aria-label={`${dayLabel(s.date)}, ${dur(s.minutes)}`} onKeyDown={(e) => e.key === 'Enter' && onSel(s.id)}>
            <rect x={x - 3} y={pad.t} width={w + 6} height={H - pad.t - pad.b} className="hit" />
            <rect x={x} y={y(s.minutes)} width={w} height={y(0) - y(s.minutes)} rx="3" />
            <text x={x + w / 2} y={y(s.minutes) - 5} textAnchor="middle" className="val">{s.minutes}</text>
            <text x={x + w / 2} y={H - 10} textAnchor="middle" className="axis">{dayLabel(s.date).slice(4)}</text>
          </g>
        );
      })}
      <line x1={pad.l} x2={W - pad.r} y1={y(90)} y2={y(90)} className="target" />
    </svg>
  );
}

function RoundBars({ rounds, target }: { rounds: number[]; target: number }) {
  const W = 360, H = 190, pad = { l: 30, r: 10, t: 14, b: 26 };
  const per = target / rounds.length;
  const max = 40;
  const bw = (W - pad.l - pad.r) / rounds.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Minutes per round">
      {[0, 10, 20, 30, 40].map((t) => (
        <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="axis">{t}</text></g>
      ))}
      {rounds.map((m, i) => {
        const x = pad.l + i * bw + bw * 0.18;
        const w = bw * 0.64;
        const over = m > per * 1.25;
        return (
          <g key={i} className={`bar ${over ? 'bad' : m > per ? 'mid' : 'ok'}`}>
            <rect x={x} y={y(m)} width={w} height={y(0) - y(m)} rx="3" />
            <text x={x + w / 2} y={y(m) - 5} textAnchor="middle" className="val">{m}</text>
            <text x={x + w / 2} y={H - 8} textAnchor="middle" className="axis">R{i + 1}</text>
          </g>
        );
      })}
      <line x1={pad.l} x2={W - pad.r} y1={y(per)} y2={y(per)} className="target" />
    </svg>
  );
}

function GoldLines({ gold }: { gold: NonNullable<Session['gold']> }) {
  const W = 360, H = 190, pad = { l: 30, r: 54, t: 14, b: 26 };
  const n = gold[0].series.length;
  const max = 90;
  const x = (i: number) => pad.l + ((W - pad.l - pad.r) * i) / (n - 1);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const lead = gold.reduce((a, b) => (b.series[n - 1] > a.series[n - 1] ? b : a));
  // spread end labels so they don't collide
  const ends = [...gold].sort((a, b) => b.series[n - 1] - a.series[n - 1]);
  const ly: Record<string, number> = {};
  let last = -99;
  ends.forEach((g) => { const yy = Math.max(y(g.series[n - 1]), last + 13); ly[g.name] = yy; last = yy; });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Coins held by each player at the end of each round">
      {[0, 30, 60, 90].map((t) => (
        <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="axis">{t}</text></g>
      ))}
      {Array.from({ length: n }, (_, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="axis">R{i + 1}</text>)}
      {gold.map((g) => (
        <g key={g.name} className={g.name === lead.name ? 'line lead' : 'line'}>
          <polyline points={g.series.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" />
          <circle cx={x(n - 1)} cy={y(g.series[n - 1])} r="3.5" />
          <text x={x(n - 1) + 8} y={ly[g.name] + 4} className="end-label">{g.name} {g.series[n - 1]}</text>
        </g>
      ))}
    </svg>
  );
}

export function PlaytestsView() {
  const { state, dispatch } = useApp();
  const s = state.sessions.find((x) => x.id === state.sessionId)!;
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const delta = s.minutes - s.target;
  const sorted = [...state.sessions].sort((a, b) => b.date.getTime() - a.date.getTime());
  const lead = s.gold ? [...s.gold].sort((a, b) => b.series[b.series.length - 1] - a.series[a.series.length - 1]) : null;
  const ratio = lead ? (lead[0].series[lead[0].series.length - 1] / lead[1].series[lead[1].series.length - 1]).toFixed(1) : null;

  return (
    <div className="view playtests-view">
      <div className="page-head">
        <div>
          <h1>Playtests</h1>
          <p className="sub">{state.sessions.length} sessions logged. The target is <strong>90 minutes</strong>; Saturday&rsquo;s ran <strong>{dur(state.sessions.find((x) => x.id === 's6')!.minutes)}</strong>.</p>
        </div>
      </div>
      <div className="playtests-grid">
        <section className="panel sessions">
          <h3 className="panel-title">Session length <span className="legend"><i />90 min target</span></h3>
          <Trend sessions={[...state.sessions].sort((a, b) => a.date.getTime() - b.date.getTime())} sel={s.id} onSel={(id) => dispatch({ type: 'selectSession', id })} />
          <ul className="session-list">
            {sorted.map((x) => (
              <li key={x.id}>
                <button className={`session-item ${s.id === x.id ? 'selected' : ''}`} onClick={() => dispatch({ type: 'selectSession', id: x.id })} aria-current={s.id === x.id}>
                  <span className="session-date"><strong>{dayLabel(x.date)}</strong><span className="muted">v{x.version} &middot; {x.players.length} players</span></span>
                  <span className={`delta ${tone(x)}`}>{dur(x.minutes)}<small>{x.minutes - x.target > 0 ? `+${x.minutes - x.target}` : x.minutes - x.target} min</small></span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel session-detail">
          <header className="detail-head">
            <div>
              <div className="eyebrow">{dayLabel(s.date)} &middot; version {s.version} &middot; {s.players.length} players</div>
              <h2>{s.headline}</h2>
            </div>
            <div className={`bigtime ${tone(s)}`}><strong>{dur(s.minutes)}</strong><span>{delta > 0 ? `${delta} min over` : `${-delta} min under`} the {s.target} min target</span></div>
          </header>
          <p className="players">Played by {s.players.join(', ')}.</p>

          <div className="charts">
            {s.rounds ? (
              <div className="chartbox"><h4>Minutes per round <span className="legend"><i />{s.target / s.rounds.length} min fits {s.target}</span></h4><RoundBars rounds={s.rounds} target={s.target} /><p className="caption">{s.rounds[s.rounds.length - 1] > s.rounds[0] * 2 ? `Round 6 took ${s.rounds[s.rounds.length - 1]} minutes, ${(s.rounds[s.rounds.length - 1] / s.rounds[0]).toFixed(1)} times round 1.` : 'Rounds stayed close to even.'}</p></div>
            ) : (
              <div className="chartbox empty-chart"><h4>Minutes per round</h4><p className="muted">Round timings weren&rsquo;t logged for this session. Add them from the next one.</p></div>
            )}
            {s.gold ? (
              <div className="chartbox"><h4>Coins at end of each round</h4><GoldLines gold={s.gold} /><p className="caption">{ratio && Number(ratio) > 1.6 ? `${lead![0].name} finished with ${ratio} times the next player.` : 'Everyone stayed within reach of each other.'}</p></div>
            ) : (
              <div className="chartbox empty-chart"><h4>Coins at end of each round</h4><p className="muted">Coins weren&rsquo;t tracked this session.</p></div>
            )}
          </div>

          <h3 className="panel-title">Notes <span className="tab-n">{s.notes.length}</span></h3>
          <ul className="notes">
            {s.notes.map((n, i) => (
              <li key={i}>
                <Avatar id={(n.by in PEOPLE ? n.by : 'hollis') as keyof typeof PEOPLE} size={26} />
                <div>
                  <div className="note-meta"><strong>{PEOPLE[(n.by in PEOPLE ? n.by : 'hollis') as keyof typeof PEOPLE].short}</strong><span className="muted">{when(n.at, nowV())}</span>{n.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
                  <p>{n.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <form className="addnote-form" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; dispatch({ type: 'addNote', sessionId: s.id, text: text.trim(), tags }); setText(''); setTags([]); }}>
            <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note about this session" aria-label="Add a note about this session" />
            <div className="addnote-row">
              {TAGS.map((t) => <button type="button" key={t} className={`tag-btn ${tags.includes(t) ? 'on' : ''}`} onClick={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}>{t}</button>)}
              <span className="spacer" />
              <button className="btn primary" disabled={!text.trim()}><Icon name="plus" size={15} /> Add note</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
