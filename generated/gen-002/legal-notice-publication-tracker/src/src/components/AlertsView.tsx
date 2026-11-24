import { useMemo, useState } from 'react';
import { STAFF, TYPE_LABEL, TYPE_ORDER } from '../data';
import { fDayTime } from '../dates';
import { SIGNAL_LABEL, alertCounts, alerts, recipients } from '../logic';
import { useApp } from '../store';
import type { AlertConfig, AlertMode, NoticeType, Signal, StaffId } from '../types';
import { Avatar, Icon, Toggle } from './ui';
import type { View } from '../App';

const MODES: { v: AlertMode; title: string; desc: string }[] = [
  { v: 'all', title: 'Every status change', desc: 'Every AdDesk message becomes an alert — receipts, reminders, re-validations, invoices.' },
  { v: 'threats', title: 'Deadline threats only', desc: 'Alert only when something can push a notice past its legal run-by date. Everything else is logged.' },
  { v: 'threats_digest', title: 'Threats + daily digest', desc: 'Threats immediately; one 4:30 PM summary of routine traffic on business days.' },
];

const SIGNAL_HELP: Record<Signal, string> = {
  policy: 'Cutoff rules, print days, holiday editions. Affects every open notice.',
  not_run: 'Held ads, dropped insertions, cancelled editions.',
  past_deadline: 'Paper auto-rolls an ad to a date after the statutory window.',
  pending_near_deadline: 'Placement still pending with little or no slack before the run-by date.',
  proof_pending: 'Paper needs a proof approved before cutoff. Usually not deadline-critical.',
};

export function AlertsView({ go }: { go: (v: View) => void }) {
  const { state, dispatch, messages, toast } = useApp();
  const saved = state.alerts;
  const [cfg, setCfg] = useState<AlertConfig>(saved);
  const dirty = JSON.stringify(cfg) !== JSON.stringify(saved);

  const current = useMemo(() => alertCounts(messages, saved, state.notices), [messages, saved, state.notices]);
  // baseline is always "every status change", so the replay shows what the noise would have been
  const before = useMemo(() => alertCounts(messages, { ...cfg, mode: 'all' }, state.notices), [messages, cfg, state.notices]);
  const after = useMemo(() => alertCounts(messages, cfg, state.notices), [messages, cfg, state.notices]);
  const preview = messages.filter((m) => alerts(m, cfg)).sort((a, b) => b.at.localeCompare(a.at));

  const setSignal = (s: Signal, v: boolean) => setCfg({ ...cfg, signals: { ...cfg.signals, [s]: v } });
  const toggleType = (p: StaffId, t: NoticeType) => {
    const cur = cfg.routing[p].types;
    const types = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
    setCfg({ ...cfg, routing: { ...cfg.routing, [p]: { ...cfg.routing[p], types } } });
  };

  const save = () => {
    dispatch({ type: 'saveAlerts', cfg });
    toast(
      cfg.mode === 'all'
        ? 'Alert rules saved: every status change.'
        : `Alert rules saved. ${after.per.gloria} of the ${messages.length} messages since Friday would have reached you.`,
    );
  };

  return (
    <div className="alerts-page">
      <div className="page-head">
        <div>
          <h1>Alert rules</h1>
          <p className="sub">
            Currently saved: <strong>{MODES.find((m) => m.v === saved.mode)!.title}</strong> — {current.per.gloria} alerts to you since Friday.
          </p>
        </div>
        <div className="head-actions">
          {dirty && <span className="dirty">Unsaved changes</span>}
          <button className="btn" disabled={!dirty} onClick={() => setCfg(saved)}>
            Revert
          </button>
          <button className="btn primary" disabled={!dirty} onClick={save}>
            Save rules
          </button>
        </div>
      </div>

      <div className="alerts-layout">
        <div className="alerts-main">
          <section className="panel">
            <h3>When should Proofrun alert someone?</h3>
            <div className="mode-cards">
              {MODES.map((m) => {
                const c = alertCounts(messages, { ...cfg, mode: m.v }, state.notices);
                return (
                  <label key={m.v} className={`mode-card${cfg.mode === m.v ? ' on' : ''}`}>
                    <input type="radio" name="mode" checked={cfg.mode === m.v} onChange={() => setCfg({ ...cfg, mode: m.v })} />
                    <div className="mc-title">
                      {m.title}
                      {m.v === 'threats' && <span className="rec">Recommended</span>}
                    </div>
                    <div className="mc-desc">{m.desc}</div>
                    <div className="mc-n">
                      <strong>{c.per.gloria}</strong> to you since Fri{c.digests ? ' + 1 digest' : ''}
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          <section className={`panel${cfg.mode === 'all' ? ' dim' : ''}`}>
            <h3>What counts as a threat</h3>
            <ul className="sig-list">
              {(Object.keys(SIGNAL_LABEL) as Signal[]).map((s) => {
                const n = messages.filter((m) => m.signal === s && !m.subject.startsWith('Reminder:')).length;
                return (
                  <li key={s}>
                    <Toggle on={cfg.signals[s]} onChange={(v) => setSignal(s, v)} label={SIGNAL_LABEL[s]} />
                    <div>
                      <div className="sig-title">{SIGNAL_LABEL[s]}</div>
                      <div className="sig-help">{SIGNAL_HELP[s]}</div>
                    </div>
                    <span className="sig-n">{n} since Fri</span>
                  </li>
                );
              })}
              <li>
                <span className="slack-sel">
                  <select value={cfg.slackDays} onChange={(e) => setCfg({ ...cfg, slackDays: Number(e.target.value) })} aria-label="Slack threshold">
                    {[0, 1, 2, 3, 5].map((x) => (
                      <option key={x} value={x}>
                        {x} day{x === 1 ? '' : 's'}
                      </option>
                    ))}
                  </select>
                </span>
                <div>
                  <div className="sig-title">Slack threshold for unconfirmed bookings</div>
                  <div className="sig-help">An unconfirmed insertion this close to its run-by date is marked At risk. Also changes notice status on the dashboard.</div>
                </div>
                <span className="sig-n" />
              </li>
              <li className="note">
                <Icon name="check" size={14} />
                <div className="sig-help">Repeat reminders about a problem you’ve already been alerted to are always suppressed.</div>
              </li>
            </ul>
          </section>

          <section className="panel">
            <h3>Who gets which notices</h3>
            <table className="route-table">
              <thead>
                <tr>
                  <th>Person</th>
                  {TYPE_ORDER.map((t) => (
                    <th key={t}>{TYPE_LABEL[t]}</th>
                  ))}
                  <th>Channel</th>
                  <th className="num">Since Fri</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(STAFF) as StaffId[]).map((p) => (
                  <tr key={p}>
                    <td>
                      <div className="rt-person">
                        <Avatar id={p} size={24} />
                        <div>
                          <div className="t-strong">{STAFF[p].name}</div>
                        </div>
                      </div>
                    </td>
                    {TYPE_ORDER.map((t) => (
                      <td key={t} className="center">
                        <input type="checkbox" checked={cfg.routing[p].types.includes(t)} onChange={() => toggleType(p, t)} aria-label={`${STAFF[p].first}: ${TYPE_LABEL[t]}`} />
                      </td>
                    ))}
                    <td>
                      <select
                        value={cfg.routing[p].channel}
                        onChange={(e) => setCfg({ ...cfg, routing: { ...cfg.routing, [p]: { ...cfg.routing[p], channel: e.target.value as 'email' | 'email_sms' } } })}
                        aria-label={`${STAFF[p].first} channel`}
                      >
                        <option value="email">Email</option>
                        <option value="email_sms">Email + text</option>
                      </select>
                    </td>
                    <td className="num">
                      <span className="old-n">{before.per[p]}</span> → <strong>{after.per[p]}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <label className="copy-row">
              <Toggle on={cfg.copyGloria} onChange={(v) => setCfg({ ...cfg, copyGloria: v })} label="Copy Gloria" />
              <span>Copy Gloria on every alert, regardless of notice type (she signs off on all hearing notices)</span>
            </label>
          </section>
        </div>

        <aside className="alerts-preview">
          <div className="ap-head">
            <div className="ap-k">Replay since Friday — alerts to you vs. every status change</div>
            <div className="ap-big">
              <span className="old">{before.per.gloria}</span>
              <Icon name="arrow" size={18} />
              <span className="new">{after.per.gloria}</span>
              {after.digests ? <span className="dig">+ 1 digest</span> : null}
            </div>
            <div className="ap-sub">out of {messages.length} AdDesk messages</div>
          </div>
          <ul className="ap-list">
            {preview
              .filter((m) => recipients(m, cfg, state.notices).includes('gloria'))
              .slice(0, 40)
              .map((m) => (
                <li key={m.id}>
                  <span className="ap-at">{fDayTime(new Date(m.at))}</span>
                  <span className="ap-subj">{m.subject}</span>
                  <span className="ap-to">
                    {recipients(m, cfg, state.notices)
                      .filter((r) => r !== 'gloria')
                      .map((r) => (
                        <Avatar key={r} id={r} size={16} />
                      ))}
                  </span>
                </li>
              ))}
            {preview.length > 40 && <li className="ap-more">…and {preview.length - 40} more</li>}
          </ul>
          <button className="btn ghost sm" onClick={() => go('messages')}>
            See all paper messages <Icon name="arrow" size={13} />
          </button>
        </aside>
      </div>
    </div>
  );
}
