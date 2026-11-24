import { useMemo } from 'react'
import { CycleChart } from './CycleChart'
import { LAST_MONTH_ALERTS, PEAK_KW } from './data'
import { evaluate, guardLine, guardTextTime, projectSlots, replayFixed, replayGuard } from './model'
import { useStore } from './state'
import { at, fmtStamp, fmtTime } from './time'
import { startLabel } from './Watch'
import { Card, Icon, Pill, Switch } from './ui'

function Range({
  id,
  label,
  hint,
  min,
  max,
  step,
  value,
  unit,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  min: number
  max: number
  step: number
  value: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div className="field">
      <div className="field-h">
        <label htmlFor={id}>{label}</label>
        <b>
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </b>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p className="muted small">{hint}</p>}
    </div>
  )
}

function Seg<T extends number>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

export function Alerts() {
  const S = useStore()
  const g = S.guard
  const fixedAlerts = useMemo(() => replayFixed(S.fixed.kw), [S.fixed.kw])
  const guardAlerts = useMemo(() => replayGuard(g), [g])
  const slots = useMemo(() => projectSlots(S.committed, S.loads), [S.committed, S.loads])
  const guardAt = useMemo(() => guardTextTime(slots, g), [slots, g])
  const out = useMemo(() => evaluate(S.committed, S.loads), [S.committed, S.loads])
  const line = guardLine(g)

  const sample = guardAt
    ? `Peakmind: Big kiln start at ${startLabel(S.committed)} projects ${guardAt.kw.toFixed(1)} kW at ${fmtTime(guardAt.slot)}, ${guardAt.kw >= PEAK_KW ? (guardAt.kw - PEAK_KW < 0.05 ? 'tying' : `${(guardAt.kw - PEAK_KW).toFixed(1)} kW over`) : `${(PEAK_KW - guardAt.kw).toFixed(1)} kW under`} your ${PEAK_KW} kW cycle peak. Start at ${startLabel(Math.ceil(at(11, 16, 18, 40) / 15) * 15)} or switch the heater off to stay clear.`
    : `Peakmind: Demand is projected to stay ${out.headroom.toFixed(1)} kW under your ${PEAK_KW} kW cycle peak. No action needed.`

  const channelsOn = [S.channels.sms && 'text', S.channels.email && 'email', S.channels.push && 'app notification'].filter(Boolean) as string[]

  function sendTest() {
    if (channelsOn.length === 0) {
      S.toast('Turn on at least one delivery method first.')
      return
    }
    S.toast(`Test sent by ${channelsOn.join(' and ')}: “${sample}”`)
  }

  return (
    <>
      <div className="page-h">
        <div className="eyebrow">Alerts</div>
        <h1>Hear about it when you're about to cross the line, not every time a kiln clicks on</h1>
        <p className="lede">
          Your {S.fixed.kw} kW rule fired {LAST_MONTH_ALERTS} times last month and {fixedAlerts.length} times so far this cycle, whenever two kilns overlapped, even when you were still well under your {PEAK_KW} kW peak. Peak guard follows the line your bill is actually set by.
        </p>
      </div>

      <div className="grid-two">
        <div className="col">
          <Card
            title={
              <span className="rule-title">
                Peak guard <Pill tone="accent">Recommended</Pill>
              </span>
            }
            sub="Texts only when projected 15-minute demand is about to reach your cycle peak."
            right={<Switch checked={g.enabled} onChange={(v) => S.patchGuard({ enabled: v })} label="Peak guard" />}
            className={g.enabled ? 'rule on' : 'rule'}
          >
            <div className="guard-box">
              <div className="line-big">
                <span>Warn me at</span>
                <b>{line.toFixed(1)} kW</b>
                <span className="muted">
                  {line > PEAK_KW - g.margin + 0.001 ? `(floor of ${g.floor.toFixed(1)} kW applies)` : `${g.margin.toFixed(1)} kW under your ${PEAK_KW} kW peak`}
                </span>
              </div>
              <Range id="margin" label="How close to the peak" min={0} max={3} step={0.5} value={g.margin} unit="kW under" onChange={(v) => S.patchGuard({ margin: v })} hint="0 = only warn once I'd tie or beat the peak. Higher gives you more room to react." />
              <Range id="floor" label="Never warn below" min={12} max={20} step={0.5} value={g.floor} unit="kW" onChange={(v) => S.patchGuard({ floor: v })} hint="One kiln plus heater, lights and pug mill tops out at 15.9 kW, so 16 kW ignores single-kiln days." />
              <div className="field">
                <div className="field-h">
                  <span>Look ahead</span>
                </div>
                <Seg label="Look ahead" value={g.lookahead} onChange={(v) => S.patchGuard({ lookahead: v })} options={[{ v: 15, l: '15 min' }, { v: 30, l: '30 min' }, { v: 45, l: '45 min' }, { v: 60, l: '1 hour' }]} />
                <p className="muted small">Uses your planned firings and what's running now to see a spike before the meter does.</p>
              </div>
              <div className="field">
                <div className="field-h">
                  <span>Don't repeat within</span>
                </div>
                <Seg label="Repeat gap" value={g.repeatHrs} onChange={(v) => S.patchGuard({ repeatHrs: v })} options={[{ v: 1, l: '1 h' }, { v: 2, l: '2 h' }, { v: 4, l: '4 h' }]} />
              </div>
            </div>
          </Card>

          <Card
            title={
              <span className="rule-title">
                Notify at {S.fixed.kw} kW <Pill tone="warn">{LAST_MONTH_ALERTS} alerts last month</Pill>
              </span>
            }
            sub="Fires every time a reading crosses the number, wherever your peak is."
            right={<Switch checked={S.fixed.enabled} onChange={(v) => S.patchFixed({ enabled: v })} label="Fixed kW rule" />}
            className="rule"
          >
            <div className="stepper">
              <span>Threshold</span>
              <button type="button" className="step" aria-label="Lower threshold" onClick={() => S.patchFixed({ kw: Math.max(14, S.fixed.kw - 1) })}>
                −
              </button>
              <b>{S.fixed.kw} kW</b>
              <button type="button" className="step" aria-label="Raise threshold" onClick={() => S.patchFixed({ kw: Math.min(22, S.fixed.kw + 1) })}>
                +
              </button>
            </div>
          </Card>

          <Card
            title="Utility event notice"
            sub="Heads-up when the utility calls a peak event, with a check against your firings."
            right={<Switch checked={S.event.enabled} onChange={(v) => S.patchEvent({ enabled: v })} label="Utility event notice" />}
            className="rule"
          >
            <div className={'checks' + (S.event.enabled ? '' : ' dim')}>
              <label>
                <input type="checkbox" checked={S.event.dayBefore} onChange={(e) => S.patchEvent({ dayBefore: e.target.checked })} /> The day before
              </label>
              <label>
                <input type="checkbox" checked={S.event.hoursBefore} onChange={(e) => S.patchEvent({ hoursBefore: e.target.checked })} /> 2 hours before it starts
              </label>
              <label>
                <input type="checkbox" checked={S.event.flagOverlap} onChange={(e) => S.patchEvent({ flagOverlap: e.target.checked })} /> Flag any scheduled firing that overlaps the window
              </label>
            </div>
            <p className="muted small">Next: Tue Nov 17, 5–8 pm. Received today at 2:05 pm. No firing overlaps it right now.</p>
          </Card>
        </div>

        <div className="col">
          <Card title="Replay on this cycle" sub="What each rule would have sent from Oct 28 to now, using your actual meter readings.">
            <CycleChart width={520} height={230} rows={[
              { label: `${S.fixed.kw} kW rule · ${fixedAlerts.length} alerts`, alerts: fixedAlerts, tone: 'old' },
              { label: `Peak guard · ${guardAlerts.length} alerts`, alerts: guardAlerts, tone: 'new' },
            ]} fixedKw={S.fixed.kw} guardKw={line} />
            <div className="compare">
              <div>
                <span className="muted small">{S.fixed.kw} kW rule</span>
                <b>{fixedAlerts.length}</b>
              </div>
              <Icon name="arrow" />
              <div className="good">
                <span className="muted small">Peak guard</span>
                <b>{guardAlerts.length}</b>
              </div>
              <p className="small muted">
                Replay assumes your planned firings were known ahead of time. Peak guard warns before the Nov 4 {PEAK_KW} kW interval and stays quiet on overlaps that end well under the peak.
              </p>
            </div>
            <ul className="alert-list">
              {guardAlerts.map((a) => (
                <li key={a.i}>
                  <span className="when">{fmtStamp(a.t)}</span>
                  <span>
                    Projected <b>{a.kw.toFixed(1)} kW</b> against a line of {a.line.toFixed(1)} kW
                  </span>
                </li>
              ))}
              {guardAlerts.length === 0 && <li className="muted">No alerts at these settings.</li>}
            </ul>
          </Card>

          <Card title="Delivery" sub="Where Peakmind reaches you. Peak guard texts are sent immediately, any hour." right={<button type="button" className="btn ghost sm" onClick={sendTest}><Icon name="send" size={15} /> Send test</button>}>
            <div className="deliv">
              <div className="rule-line">
                <span>
                  Text message <em className="muted">(619) 555-0142</em>
                </span>
                <Switch checked={S.channels.sms} onChange={(v) => S.patchChannels({ sms: v })} label="Text message" />
              </div>
              <div className="rule-line">
                <span>
                  Email <em className="muted">address on file</em>
                </span>
                <Switch checked={S.channels.email} onChange={(v) => S.patchChannels({ email: v })} label="Email" />
              </div>
              <div className="rule-line">
                <span>
                  App notification <em className="muted">this browser</em>
                </span>
                <Switch checked={S.channels.push} onChange={(v) => S.patchChannels({ push: v })} label="App notification" />
              </div>
            </div>
            <div className="sms">
              <div className="sms-h">Preview of tonight's text</div>
              <p>{sample}</p>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
