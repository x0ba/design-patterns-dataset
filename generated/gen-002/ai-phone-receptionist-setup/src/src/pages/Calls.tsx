import { useMemo, useState } from 'react';
import { Card, Pill, PageHeader, Segmented, type Tone } from '../components/ui';
import { seedCalls } from '../data/seed';
import { evaluateCall, type CheckResult } from '../lib/engine';
import { clearFlag, useAppState } from '../lib/store';
import { fmtDateTime, fmtDuration } from '../lib/time';
import type { Call, Outcome, Settings } from '../types';

type Filter = 'all' | 'flagged' | 'booked' | 'message' | 'declined';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'booked', label: 'Booked' },
  { value: 'message', label: 'Messages' },
  { value: 'declined', label: 'Declined' },
];

const OUTCOME_TONE: Record<Outcome, Tone> = {
  booked: 'ok',
  message: 'info',
  declined: 'neutral',
  texted: 'bad',
};

const sortedCalls = [...seedCalls].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

function resultPill(status: CheckResult['status']) {
  if (status === 'pass') return <Pill tone="ok">Pass</Pill>;
  if (status === 'fail') return <Pill tone="bad">Fails</Pill>;
  return <Pill tone="warn">Needs a rule</Pill>;
}

function summaryLine(results: CheckResult[], label: string) {
  const pass = results.filter((r) => r.status === 'pass').length;
  return `${pass} of ${results.length} checks pass with ${label}.`;
}

export function Calls({ id }: { id: string | null }) {
  const [filter, setFilter] = useState<Filter>('all');
  const cleared = useAppState((s) => s.cleared);
  const live = useAppState((s) => s.live);
  const draft = useAppState((s) => s.draft);

  const list = useMemo(() => {
    return sortedCalls.filter((c) => {
      if (filter === 'all') return true;
      if (filter === 'flagged') return !!c.flag && !cleared.includes(c.id);
      return c.outcome === filter;
    });
  }, [filter, cleared]);

  const counts = {
    all: seedCalls.length,
    flagged: seedCalls.filter((c) => c.flag && !cleared.includes(c.id)).length,
    booked: seedCalls.filter((c) => c.outcome === 'booked').length,
    message: seedCalls.filter((c) => c.outcome === 'message').length,
    declined: seedCalls.filter((c) => c.outcome === 'declined').length,
  };

  const firstFlagged = sortedCalls.find((c) => c.flag && !cleared.includes(c.id));
  const selected: Call | undefined = seedCalls.find((c) => c.id === id) ?? firstFlagged ?? sortedCalls[0];

  return (
    <>
      <PageHeader
        title="Calls"
        lede="15 of the 212 calls from the last 30 days. All 9 flagged calls are included. Each flagged call can be re-checked against your settings."
      />

      <div className="calls-layout">
        <div className="call-list-col">
          <Segmented
            label="Filter calls"
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((f) => ({
              value: f.value,
              label: (
                <>
                  {f.label} <span className="count">{counts[f.value]}</span>
                </>
              ),
            }))}
          />
          <ul className="call-list">
            {list.map((c) => {
              const open = !!c.flag && !cleared.includes(c.id);
              return (
                <li key={c.id}>
                  <a href={`#/calls/${c.id}`} className={`call-row${selected?.id === c.id ? ' active' : ''}`}>
                    <div className="call-row-top">
                      <span className="call-name">{c.callerName}</span>
                      <span className="muted small">{fmtDateTime(c.startedAt)}</span>
                    </div>
                    <div className="call-row-mid">
                      <span className="muted small">
                        {c.city} · {fmtDuration(c.durationSec)}
                      </span>
                      {open && <span className="flag-dot" title="Flagged" />}
                    </div>
                    <div className="call-row-bottom">
                      <Pill tone={OUTCOME_TONE[c.outcome]}>{c.outcomeText}</Pill>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {selected ? <CallDetail call={selected} live={live} draft={draft} cleared={cleared.includes(selected.id)} /> : null}
      </div>
    </>
  );
}

function CallDetail({
  call,
  live,
  draft,
  cleared,
}: {
  call: Call;
  live: Settings;
  draft: Settings;
  cleared: boolean;
}) {
  const dirty = JSON.stringify(live) !== JSON.stringify(draft);
  const [mode, setMode] = useState<'live' | 'draft' | null>(null);
  const effective = mode ?? (dirty ? 'draft' : 'live');
  const settings = effective === 'draft' ? draft : live;
  const results = useMemo(() => evaluateCall(settings, call), [settings, call]);
  const open = !!call.flag && !cleared;
  const allPass = results.length > 0 && results.every((r) => r.status === 'pass');

  return (
    <div className="call-detail">
      <Card>
        <header className="call-head">
          <div>
            <h2>
              {call.callerName} <span className="muted">· {call.callerPhone}</span>
            </h2>
            <div className="muted">
              {fmtDateTime(call.startedAt)} · {call.city} · {fmtDuration(call.durationSec)} call
            </div>
          </div>
          <div className="call-head-right">
            <Pill tone={OUTCOME_TONE[call.outcome]}>{call.outcomeText}</Pill>
            {call.flag && !open && <Pill tone="ok">Reviewed</Pill>}
          </div>
        </header>

        {call.flag && (
          <div className={`flag-box${open ? '' : ' reviewed'}`}>
            <div className="flag-box-top">
              <strong>Flagged: {call.flag.category.toLowerCase()}</strong>
              {open ? (
                <button type="button" className="btn ghost small" onClick={() => clearFlag(call.id)}>
                  Mark reviewed
                </button>
              ) : null}
            </div>
            <p>{call.flag.note}</p>
          </div>
        )}
      </Card>

      {call.flag && (
        <Card
          title="Re-check with your settings"
          subtitle={
            <>
              {summaryLine(results, effective === 'draft' ? 'your draft (unsaved)' : 'live settings')} This runs your rules
              on this call's facts. It is not a replay of the model.
            </>
          }
          actions={
            <Segmented
              label="Settings to check against"
              value={effective}
              onChange={(v) => setMode(v)}
              options={[
                { value: 'live', label: 'Live' },
                { value: 'draft', label: dirty ? 'Draft (unsaved)' : 'Draft' },
              ]}
            />
          }
        >
          <table className="check-table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Assistant said</th>
                <th>Would now do</th>
                <th>Should do</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {call.flag.checks.map((spec, i) => {
                const r = results[i];
                return (
                  <tr key={i}>
                    <td>
                      <strong>{spec.label}</strong>
                    </td>
                    <td className="said">{spec.said}</td>
                    <td>{r.now}</td>
                    <td>{r.should}</td>
                    <td>{resultPill(r.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {effective === 'draft' && dirty && (
            <p className="note">Draft is not live. Save it from the bar at the bottom before new calls use it.</p>
          )}
          {effective === 'live' && allPass && (
            <p className="note">
              Your settings already give the right answer, but the assistant still said something different on this call.
              Check the next few calls of this type before you mark it reviewed.
            </p>
          )}
        </Card>
      )}

      <Card title="Transcript" subtitle="Lines marked wrong are the ones Rafa flagged.">
        <ol className="transcript">
          {call.transcript.map((line, i) => (
            <li key={i} className={`line ${line.who}${line.wrong ? ' wrong' : ''}`}>
              <div className="who">{line.who === 'caller' ? call.callerName : 'Assistant'}</div>
              <div className="bubble">
                {line.text}
                {line.wrong && <span className="wrong-tag">Wrong info</span>}
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
