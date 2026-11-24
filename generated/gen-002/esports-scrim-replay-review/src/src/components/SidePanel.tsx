import { useEffect, useMemo, useRef, useState } from 'react';
import { SCOUTING } from '../data/review';
import { ALL_EVENTS, PLAYER_COLOR, ROUND_BY_ID, ROUNDS, TEAM_COLOR, teamOf } from '../data/scrim';
import type { CommsLine, GameEvent, Round } from '../data/types';
import { MAP_LABEL, fmt, useApp, type SideTab } from '../store';

export function SidePanel() {
  const tab = useApp((s) => s.sideTab);
  const set = useApp((s) => s.set);
  const roundId = useApp((s) => s.roundId);
  const r = ROUND_BY_ID[roundId];
  const tabs: { id: SideTab; label: string; n?: number }[] = [
    { id: 'comms', label: 'Comms', n: r.comms.length },
    { id: 'events', label: 'Events', n: r.events.length },
    { id: 'scouting', label: 'Thu · Scouting', n: SCOUTING.clips.length },
  ];
  return (
    <section className="sidepanel">
      <div className="tabs">
        {tabs.map((x) => (
          <button key={x.id} className={tab === x.id ? 'on' : ''} onClick={() => set({ sideTab: x.id })}>
            {x.label} {x.n !== undefined && <span className="cnt">{x.n}</span>}
          </button>
        ))}
      </div>
      {tab === 'comms' && <Comms r={r} />}
      {tab === 'events' && <Events r={r} />}
      {tab === 'scouting' && <Scouting />}
    </section>
  );
}

/** Finds the first "enemies are here" info call and the first rotate call, to surface call latency. */
function callGap(r: Round) {
  const info = r.comms.find((l) => /\b(four|three|heavy|on site|they're grouping)\b/i.test(l.text) && !/rotate/i.test(l.text));
  const rot = r.comms.find((l) => /\brotat/i.test(l.text));
  if (!info || !rot || rot.t < info.t) return null;
  return { info, rot, gap: rot.t - info.t };
}

function Comms({ r }: { r: Round }) {
  const t = useApp((s) => s.t);
  const playing = useApp((s) => s.playing);
  const seek = useApp((s) => s.seek);
  const [follow, setFollow] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const activeIdx = useMemo(() => {
    let idx = -1;
    r.comms.forEach((l, i) => { if (l.t <= t + 0.05) idx = i; });
    return idx;
  }, [r, t]);
  useEffect(() => {
    if (!follow || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-i="${Math.max(0, activeIdx)}"]`);
    if (el) {
      const box = listRef.current;
      const top = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
      box.scrollTo({ top, behavior: playing ? 'smooth' : 'auto' });
    }
  }, [activeIdx, follow, r.id]);
  const gap = callGap(r);
  return (
    <div className="comms">
      <div className="comms-bar">
        <span className="muted small">Team voice · synced to round clock</span>
        <span className="spacer" />
        <label className="check"><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> Follow playhead</label>
      </div>
      {gap && (
        <button className={`gap-callout ${gap.gap >= 6 ? 'late' : ''}`} onClick={() => seek(Math.max(0, gap.info.t - 1))} title="Jump to the info call">
          <span className="gap-n mono">{gap.gap.toFixed(1)}s</span>
          <span>
            from {gap.info.speaker}’s “{gap.info.text.length > 34 ? gap.info.text.slice(0, 32) + '…' : gap.info.text}” <span className="mono muted">{fmt(gap.info.t)}</span> to {gap.rot.speaker}’s rotate call <span className="mono muted">{fmt(gap.rot.t)}</span>
          </span>
        </button>
      )}
      <div className="comms-list" ref={listRef}>
        {r.comms.map((l: CommsLine, i) => {
          const live = t >= l.t && t <= l.t + l.dur + 0.3;
          const past = l.t < t && !live;
          const after = l.t > r.endT;
          return (
            <div
              key={i}
              data-i={i}
              className={`cl ${live ? 'live' : past ? 'past' : 'future'} ${after ? 'post' : ''}`}
              onClick={() => seek(Math.max(0, l.t - 0.4))}
            >
              <span className="cl-t mono">{fmt(l.t, true)}</span>
              <span className="cl-s" style={{ color: PLAYER_COLOR[l.speaker] }}>{l.speaker}</span>
              <span className="cl-x">{l.text}</span>
              {live && <span className="eq"><i /><i /><i /></span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const EV_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'kill', label: 'Kills' },
  { id: 'ability', label: 'Utility' },
  { id: 'obj', label: 'Objective' },
] as const;

function evText(e: GameEvent) {
  if (e.type === 'kill') return (
    <>
      <b style={{ color: TEAM_COLOR[e.team] }}>{e.actor}</b>
      <span className="muted"> {e.headshot ? '⌖' : '▸'} </span>
      <b style={{ color: TEAM_COLOR[teamOf(e.victim!)] }}>{e.victim}</b>
      <span className="muted"> · {e.weapon}</span>
    </>
  );
  if (e.type === 'plant') return <><b style={{ color: TEAM_COLOR[e.team] }}>{e.actor}</b> planted</>;
  if (e.type === 'defuse') return <><b style={{ color: TEAM_COLOR[e.team] }}>{e.actor}</b> defused</>;
  return <><b style={{ color: TEAM_COLOR[e.team] }}>{e.actor}</b> <span className="muted">used</span> {e.ability}{e.abilityKind === 'flash' && e.popT ? <span className="muted"> · pops {fmt(e.popT, true)}</span> : null}</>;
}

function Events({ r }: { r: Round }) {
  const t = useApp((s) => s.t);
  const seek = useApp((s) => s.seek);
  const [f, setF] = useState<(typeof EV_FILTERS)[number]['id']>('all');
  const evs = r.events.filter((e) => f === 'all' || (f === 'obj' ? e.type === 'plant' || e.type === 'defuse' : e.type === f));
  return (
    <div className="events">
      <div className="comms-bar">
        <div className="seg tiny-seg">
          {EV_FILTERS.map((x) => (
            <button key={x.id} className={f === x.id ? 'on' : ''} onClick={() => setF(x.id)}>{x.label}</button>
          ))}
        </div>
        <span className="spacer" />
        <span className="muted tiny">Auto-detected</span>
      </div>
      <div className="ev-list">
        {evs.map((e) => (
          <div key={e.id} className={`evr ${e.t <= t ? 'past' : ''} ${Math.abs(e.t - t) < 0.6 ? 'live' : ''}`} onClick={() => seek(Math.max(0, e.t - 2))} title="Jump to 2s before">
            <span className="cl-t mono">{fmt(e.t, true)}</span>
            <span className={`evi ${e.type} ${e.abilityKind ?? ''} ${e.type === 'kill' && teamOf(e.victim!) === 'LOW' ? 'loss' : ''}`} />
            <span className="evx">{evText(e)}</span>
            <span className="muted tiny ev-area">{e.area}</span>
          </div>
        ))}
        {!evs.length && <div className="muted small pad">No {f === 'ability' ? 'utility' : f} events detected this round.</div>}
      </div>
      <div className="ev-foot muted tiny">{ALL_EVENTS.length} events detected across {ROUNDS.length} rounds of this scrim block</div>
    </div>
  );
}

function Scouting() {
  const roundId = useApp((s) => s.roundId);
  const cur = ROUND_BY_ID[roundId].map;
  const [open, setOpen] = useState<string | null>(null);
  const groups = (['foundry', 'saltworks', 'canopy'] as const)
    .map((m) => ({ m, items: SCOUTING.clips.filter((c) => c.map === m) }))
    .sort((a, b) => Number(b.m === cur) - Number(a.m === cur));
  return (
    <div className="scout">
      <div className="comms-bar">
        <span className="small"><b>{SCOUTING.title}</b> <span className="muted">· {SCOUTING.created}</span></span>
        <span className="spacer" />
        <span className="muted tiny">Read-only · past session</span>
      </div>
      <div className="ev-list">
        {groups.map((g) => (
          <div key={g.m}>
            <div className="half">{MAP_LABEL[g.m]} · {g.items.length}</div>
            {g.items.map((c, i) => (
              <div key={c.id} className={`sc-row ${open === c.id ? 'open' : ''}`} onClick={() => setOpen(open === c.id ? null : c.id)}>
                <span className="sc-n mono">{SCOUTING.clips.indexOf(c) + 1}</span>
                <span className="sc-main">
                  <span className="sc-title">{c.title}</span>
                  <span className="muted tiny">{c.source} · {c.at} · {c.len}</span>
                  {open === c.id && c.note && <span className="sc-note">{c.note}</span>}
                </span>
                {c.note && <span className="muted tiny">{open === c.id ? '▾' : '▸'}</span>}
                <span hidden>{i}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Speaks team comms as the playhead crosses each line (stand-in for the recorded voice track). */
export function useCommsVoice() {
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    let prevT = useApp.getState().t;
    let prevRound = useApp.getState().roundId;
    let wasPlaying = false;
    const pitch: Record<string, number> = { Rook: 0.8, Vesper: 1.25, Juno: 1.15, Kael: 1.0, Mara: 1.4 };
    let voices: SpeechSynthesisVoice[] = [];
    const loadVoices = () => { voices = synth.getVoices().filter((v) => v.lang.startsWith('en')); };
    loadVoices();
    synth.addEventListener?.('voiceschanged', loadVoices);
    const unsub = useApp.subscribe((s) => {
      const jumped = s.roundId !== prevRound || Math.abs(s.t - prevT) > 0.5;
      if (!s.playing || !s.voice || jumped) {
        if (wasPlaying && (!s.playing || jumped || !s.voice)) synth.cancel();
      }
      if (s.playing && s.voice && !jumped && s.t > prevT) {
        const r = ROUND_BY_ID[s.roundId];
        for (const l of r.comms) {
          if (l.t > prevT && l.t <= s.t) {
            const u = new SpeechSynthesisUtterance(l.text.replace(/—/g, ', '));
            u.rate = Math.max(0.55, Math.min(1.7, s.speed * 1.15));
            u.pitch = pitch[l.speaker] ?? 1;
            u.volume = 0.9;
            const names = ['Rook', 'Vesper', 'Juno', 'Kael', 'Mara'];
            if (voices.length) u.voice = voices[names.indexOf(l.speaker) % voices.length];
            synth.speak(u);
          }
        }
      }
      wasPlaying = s.playing;
      prevT = s.t;
      prevRound = s.roundId;
    });
    return () => { unsub(); synth.cancel(); };
  }, []);
}
