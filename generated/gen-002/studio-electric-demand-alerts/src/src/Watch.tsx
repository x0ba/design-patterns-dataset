import { useMemo } from 'react'
import { CycleChart } from './CycleChart'
import { DEVICES, DeviceId, PEAK_AT, PEAK_KW, RATE, SERIES, SMALL_END, SMALL_TARGET, SMALL_TEMP_NOW, STATS, LAST_MONTH_ALERTS } from './data'
import {
  BIG_HOURS,
  Loads,
  Outcome,
  evaluate,
  fmtUsd2,
  guardLine,
  guardTextTime,
  projectSlots,
  replayFixed,
  replayGuard,
} from './model'
import { PlannerChart } from './PlannerChart'
import { useStore } from './state'
import { at, EVENT_END, EVENT_START, fmtDayTime, fmtDur, fmtStamp, fmtTime, NOW } from './time'
import { Card, Icon, Pill, Switch } from './ui'

export const startLabel = (m: number) => (m >= 1440 ? 'Tue ' : '') + fmtTime(m)
const SLIDER_MIN = 945 // 3:45 pm
const SLIDER_MAX = 1440 + 21 * 60

function headline(o: Outcome, start: number) {
  const t = startLabel(start)
  if (o.status === 'over') return `Starting the glaze firing at ${t} would set a new ${o.maxKw.toFixed(1)} kW peak`
  if (o.status === 'edge')
    return o.headroom < 0.05
      ? `Starting the glaze firing at ${t} puts you right at your ${PEAK_KW} kW peak`
      : `Starting the glaze firing at ${t} leaves just ${o.headroom.toFixed(1)} kW before your peak`
  return `Starting the glaze firing at ${t} keeps you ${o.headroom.toFixed(1)} kW under your peak`
}

export function Watch() {
  const S = useStore()
  const { committed, preview, loads } = S

  const planned = useMemo(() => evaluate(committed, loads), [committed, loads])
  const pugBump = useMemo(() => evaluate(committed, { ...loads, pug: true }), [committed, loads])
  const prev = useMemo(() => evaluate(preview, loads), [preview, loads])
  const slotsCommitted = useMemo(() => projectSlots(committed, loads), [committed, loads])
  const guardAt = useMemo(() => guardTextTime(slotsCommitted, S.guard), [slotsCommitted, S.guard])

  const fixedAlerts = useMemo(() => replayFixed(S.fixed.kw), [S.fixed.kw])
  const guardAlerts = useMemo(() => replayGuard({ ...S.guard, enabled: true }), [S.guard])

  const last = SERIES.n - 1
  const nowKw = SERIES.kw[last]
  const bisqueEnd = SMALL_END
  const overlapMin = Math.max(0, Math.min(bisqueEnd, committed + BIG_HOURS * 60) - committed)

  const optB = useMemo(() => {
    const s = Math.ceil(bisqueEnd / 15) * 15
    return { start: s, o: evaluate(s, loads) }
  }, [bisqueEnd, loads])
  const optC = useMemo(() => {
    const s = at(11, 16, 21, 0)
    return { start: s, o: evaluate(s, loads) }
  }, [loads])
  const trimLoads: Loads = { heater: false, lights: loads.lights, pug: false }
  const optA = useMemo(() => evaluate(at(11, 16, 16, 30), trimLoads), [loads.lights]) // eslint-disable-line react-hooks/exhaustive-deps
  const baseline = useMemo(() => evaluate(at(11, 16, 16, 30), loads), [loads])

  const eventClear = prev.eventKilnMin === 0
  const status = planned.status

  function commit(m: number) {
    S.setCommitted(m)
    S.setPreview(m)
    const rem = m - 10
    S.setReminder(rem)
    S.toast(`Glaze firing moved to ${startLabel(m)}. We'll text you at ${startLabel(rem)} to load and start.`, {
      label: 'Undo',
      run: () => {
        S.setCommitted(at(11, 16, 16, 30))
        S.setPreview(at(11, 16, 16, 30))
        S.setReminder(null)
      },
    })
  }

  function enableGuard() {
    S.patchGuard({ enabled: true })
    S.patchFixed({ enabled: false })
    S.toast('Peak guard is on. The 18 kW alert is paused so you only get texts that matter.', {
      label: 'Undo',
      run: () => {
        S.patchGuard({ enabled: false })
        S.patchFixed({ enabled: true })
      },
    })
  }

  const devNow = (id: DeviceId) => SERIES.dev[id][last]
  const lastPug = useMemo(() => {
    for (let i = SERIES.n - 1; i >= 0; i--) if (SERIES.dev.pug[i] > 0.2) return SERIES.t[i]
    return null
  }, [])

  const peakCostBase = PEAK_KW * RATE.demand

  return (
    <>
      <div className="page-h">
        <div className="eyebrow">Monday, Nov 16 · glaze firing scheduled {startLabel(committed)}</div>
        <h1>{headline(planned, committed)}</h1>
        <p className="lede">
          {status === 'clear' ? (
            <>
              The highest 15-minute demand in this plan is <b>{planned.maxKw.toFixed(1)} kW</b> ({fmtTime(planned.maxAt)}). The small kiln finishes its bisque around {fmtTime(bisqueEnd)}, so the two kilns{' '}
              {overlapMin > 0 ? <>overlap for {fmtDur(overlapMin)}</> : <>never overlap</>}.
            </>
          ) : (
            <>
              The small kiln is still firing until about {fmtTime(bisqueEnd)}, so both kilns would run together for <b>{fmtDur(overlapMin)}</b> on top of the heater and lights.{' '}
              {pugBump.status === 'over' && (
                <>
                  Starting the pug mill in that window would push demand to <b>{pugBump.maxKw.toFixed(1)} kW</b> and add{' '}
                  <b>{fmtUsd2(pugBump.demandAdded)}</b> to this bill, for the rest of the cycle.
                </>
              )}
            </>
          )}
        </p>
      </div>

      {/* Key numbers */}
      <div className="tiles">
        <div className="tile">
          <div className="tile-k">Billing peak so far</div>
          <div className="tile-v">
            {PEAK_KW}
            <small> kW</small>
          </div>
          <div className="tile-s">
            Set {fmtStamp(PEAK_AT)} · demand charge locked in at <b>{fmtUsd2(peakCostBase)}</b>
          </div>
        </div>
        <div className="tile">
          <div className="tile-k">Right now</div>
          <div className="tile-v">
            {nowKw.toFixed(1)}
            <small> kW</small>
          </div>
          <div className="tile-s">
            <b>{(PEAK_KW - nowKw).toFixed(1)} kW</b> under your peak · small kiln at {SMALL_TEMP_NOW.toLocaleString('en-US')} °F
          </div>
        </div>
        <div className={'tile t-' + status}>
          <div className="tile-k">
            Tonight, {startLabel(committed)} start
            <Pill tone={status === 'over' ? 'bad' : status === 'edge' ? 'warn' : 'ok'}>
              {status === 'over' ? 'New peak' : status === 'edge' ? 'At the line' : 'Clear'}
            </Pill>
          </div>
          <div className="tile-v">
            {planned.maxKw.toFixed(1)}
            <small> kW</small>
          </div>
          <div className="tile-s">
            {status === 'over' ? (
              <>
                <b>+{planned.overKw.toFixed(1)} kW</b> over peak = <b>+{fmtUsd2(planned.demandAdded)}</b>
              </>
            ) : status === 'edge' ? (
              <>
                <b>{planned.headroom.toFixed(1)} kW</b> of headroom. Any extra load is a new peak.
              </>
            ) : (
              <>
                <b>{planned.headroom.toFixed(1)} kW</b> of headroom
              </>
            )}
          </div>
        </div>
        <div className="tile">
          <div className="tile-k">
            Utility peak event
            <Pill tone="accent">Tomorrow</Pill>
          </div>
          <div className="tile-v sm">
            Tue 5–8 pm
          </div>
          <div className="tile-s">
            {planned.eventKilnMin === 0 ? (
              <>
                Nothing running in the window. Glaze firing would end <b>{fmtDayTime(planned.end)}</b>.
              </>
            ) : (
              <b>Kiln runs {fmtDur(planned.eventKilnMin)} inside the event window.</b>
            )}
          </div>
        </div>
      </div>

      <div className="grid-main">
        <div className="col">
          <Card
            title="Projected 15-minute demand"
            sub="Your bill uses the single highest 15-minute reading."
            right={
              <div className="loads">
                <span className="muted small">Other loads</span>
                {(
                  [
                    ['heater', 'Heater 2.0 kW'],
                    ['lights', 'Lights 0.8 kW'],
                    ['pug', 'Pug mill 1.5 kW'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={'chip' + (loads[k] ? ' on' : '')}
                    aria-pressed={loads[k]}
                    onClick={() => S.setLoads({ ...loads, [k]: !loads[k] })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          >
            <PlannerChart glazeStart={preview} loads={loads} guard={S.guard} fixedKw={S.fixed.enabled ? S.fixed.kw : null} />

            <div className="slider-row">
              <div className="slider-l">
                <div className="slider-v">
                  <label htmlFor="start">Glaze firing starts</label>
                  <button type="button" className="step" aria-label="15 minutes earlier" disabled={preview <= SLIDER_MIN} onClick={() => S.setPreview(Math.max(SLIDER_MIN, preview - 15))}>
                    −
                  </button>
                  <b>{startLabel(preview)}</b>
                  <button type="button" className="step" aria-label="15 minutes later" disabled={preview >= SLIDER_MAX} onClick={() => S.setPreview(Math.min(SLIDER_MAX, preview + 15))}>
                    +
                  </button>
                </div>
                <div className="chips">
                  {[
                    { m: at(11, 16, 16, 30), l: '4:30 pm', s: 'scheduled' },
                    { m: optB.start, l: startLabel(optB.start), s: 'bisque done' },
                    { m: optC.start, l: '9:00 pm', s: 'off-peak' },
                    { m: at(11, 17, 16, 30), l: 'Tue 4:30 pm', s: 'in event' },
                  ].map((c) => (
                    <button key={c.m} type="button" className={'chip big' + (preview === c.m ? ' on' : '')} onClick={() => S.setPreview(c.m)}>
                      {c.l}
                      <em>{c.s}</em>
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="start"
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={15}
                value={preview}
                onChange={(e) => S.setPreview(Number(e.target.value))}
                aria-valuetext={startLabel(preview)}
              />
            </div>
          </Card>

          <div className="opts">
            <button type="button" className="opt" onClick={() => S.setPreview(optB.start)}>
              <div className="opt-h">
                <Icon name="clock" size={16} /> Start at {startLabel(optB.start)}
              </div>
              <div className="opt-d">When the bisque finishes. Kilns never overlap.</div>
              <div className="opt-n">
                <b>{optB.o.maxKw.toFixed(1)} kW</b> peak · firing energy {fmtUsd2(optB.o.energyCost)}
                <span className="save">{baseline.energyCost - optB.o.energyCost > 0.005 && <>saves {fmtUsd2(baseline.energyCost - optB.o.energyCost)}</>}</span>
              </div>
            </button>
            <button type="button" className="opt" onClick={() => S.setPreview(optC.start)}>
              <div className="opt-h">
                <Icon name="clock" size={16} /> Start at 9:00 pm
              </div>
              <div className="opt-d">Whole firing at the $0.14 off-peak rate. Done 7:00 am.</div>
              <div className="opt-n">
                <b>{optC.o.maxKw.toFixed(1)} kW</b> peak · firing energy {fmtUsd2(optC.o.energyCost)}
                <span className="save">{baseline.energyCost - optC.o.energyCost > 0.005 && <>saves {fmtUsd2(baseline.energyCost - optC.o.energyCost)}</>}</span>
              </div>
            </button>
            <button
              type="button"
              className="opt"
              onClick={() => {
                S.setPreview(at(11, 16, 16, 30))
                S.setLoads(trimLoads)
              }}
            >
              <div className="opt-h">
                <Icon name="bolt" size={16} /> Keep 4:30 pm, trim loads
              </div>
              <div className="opt-d">Heater off and no pug mill until the small kiln finishes.</div>
              <div className="opt-n">
                <b>{optA.maxKw.toFixed(1)} kW</b> peak · {optA.headroom.toFixed(1)} kW headroom
                <span className="save">still on-peak</span>
              </div>
            </button>
          </div>
        </div>

        <div className="col">
          <Card
            title={<>If it starts at {startLabel(preview)}</>}
            right={
              !eventClear ? (
                <Pill tone="bad">Hits event window</Pill>
              ) : (
                <Pill tone={prev.status === 'over' ? 'bad' : prev.status === 'edge' ? 'warn' : 'ok'}>{prev.status === 'over' ? 'New peak' : prev.status === 'edge' ? 'At the line' : 'Clear'}</Pill>
              )
            }
          >
            <dl className="facts">
              <div>
                <dt>Highest 15-min demand</dt>
                <dd>
                  <b>{prev.maxKw.toFixed(1)} kW</b> <span className="muted">at {fmtTime(prev.maxAt)}</span>
                </dd>
              </div>
              <div>
                <dt>Against your {PEAK_KW} kW peak</dt>
                <dd className={prev.status === 'over' ? 'bad' : prev.status === 'edge' ? 'warn' : 'ok'}>
                  {prev.status === 'over' ? `${prev.overKw.toFixed(1)} kW over` : prev.headroom < 0.05 ? 'Exactly at the line' : `${prev.headroom.toFixed(1)} kW under`}
                </dd>
              </div>
              <div>
                <dt>Added demand charge</dt>
                <dd className={prev.demandAdded > 0 ? 'bad' : ''}>
                  <b>{fmtUsd2(prev.demandAdded)}</b> <span className="muted">at ${RATE.demand}/kW</span>
                </dd>
              </div>
              <div>
                <dt>Firing energy (~{prev.firingKwh} kWh)</dt>
                <dd>
                  <b>{fmtUsd2(prev.energyCost)}</b> <span className="muted">{Math.round(prev.onPeakKwh)} kWh on-peak</span>
                </dd>
              </div>
              <div>
                <dt>Peak event</dt>
                <dd className={eventClear ? 'ok' : 'bad'}>
                  {eventClear ? <>Clear · ends {fmtDayTime(prev.end)}</> : <>Kiln runs {fmtDur(prev.eventKilnMin)} in Tue 5–8 pm</>}
                </dd>
              </div>
            </dl>
            {!eventClear && (
              <p className="note bad-note">
                Event rates aren't in your TOU-B data, so this isn't priced. Last January, a firing inside an event window added $410 to one bill.
              </p>
            )}
            {preview !== committed ? (
              <button type="button" className="btn primary wide" onClick={() => commit(preview)}>
                Move glaze firing to {startLabel(preview)} <Icon name="arrow" size={16} />
              </button>
            ) : (
              <div className="sched">
                <Icon name="check" size={16} /> Scheduled for {startLabel(committed)}
                {S.reminder != null && <span className="muted"> · text at {startLabel(S.reminder)}</span>}
              </div>
            )}
            {preview === committed && S.reminder == null && <p className="muted small hint">Pick another time on the slider to compare, then move the firing.</p>}
          </Card>

          <Card
            title="Alerts"
            right={S.guard.enabled ? <Pill tone="ok">Peak guard on</Pill> : <Pill tone="warn">Too noisy</Pill>}
            className={S.guard.enabled ? 'alert-on' : ''}
          >
            {!S.guard.enabled ? (
              <>
                <p className="body">
                  Your <b>{S.fixed.kw} kW</b> rule texted you <b>{LAST_MONTH_ALERTS}</b> times last month, and <b>{fixedAlerts.length}</b> times so far this cycle. A kiln overlap trips it even when you're well under your peak.
                </p>
                <p className="body">
                  <b>Peak guard</b> texts only when projected demand is within {S.guard.margin.toFixed(1)} kW of your peak ({guardLine(S.guard).toFixed(1)} kW now). On this cycle's readings it would have sent <b>{guardAlerts.length}</b>.
                </p>
                <div className="btn-row">
                  <button type="button" className="btn primary" onClick={enableGuard}>
                    Turn on Peak guard
                  </button>
                  <button type="button" className="btn ghost" onClick={() => S.go('alerts')}>
                    Fine-tune
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="body">
                  Texting when projected demand reaches <b>{guardLine(S.guard).toFixed(1)} kW</b>, {S.guard.lookahead} minutes ahead.
                </p>
                <div className={'guard-now ' + (guardAt ? 'hit' : 'quiet')}>
                  {guardAt ? (
                    <>
                      <Icon name="alert" size={16} />
                      <span>
                        With the current plan it texts you at <b>{guardAt.at <= NOW ? 'right now' : fmtTime(guardAt.at)}</b>: {guardAt.kw.toFixed(1)} kW projected at {fmtTime(guardAt.slot)}.
                      </span>
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={16} />
                      <span>With the current plan, it stays quiet. Nothing gets within {S.guard.margin.toFixed(1)} kW of your peak.</span>
                    </>
                  )}
                </div>
                <div className="rule-line">
                  <span>{S.fixed.kw} kW rule</span>
                  <Switch checked={S.fixed.enabled} onChange={(v) => S.patchFixed({ enabled: v })} label="18 kW rule" />
                </div>
                <div className="rule-line">
                  <span>Utility event notice</span>
                  <Switch checked={S.event.enabled} onChange={(v) => S.patchEvent({ enabled: v })} label="Utility event notice" />
                </div>
                <div className="btn-row">
                  <button type="button" className="btn ghost" onClick={() => S.go('alerts')}>
                    Fine-tune rules
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      <h3 className="sec">Equipment right now</h3>
      <div className="equip-row">
        {DEVICES.filter((d) => d.id !== 'base').map((d) => {
          const kw = devNow(d.id)
          const running = kw > 0.2
          return (
            <div className="eq" key={d.id}>
              <div className="eq-top">
                <i style={{ background: d.color }} />
                <b>{d.name}</b>
                <span className={'state ' + (running ? 'run' : '')}>{running ? 'On' : 'Idle'}</span>
              </div>
              <div className="eq-kw">
                {running ? kw.toFixed(1) : '0.0'} <small>kW of {d.kw}</small>
              </div>
              {d.id === 'small' && (
                <>
                  <div className="bar">
                    <span style={{ width: `${((NOW - (SMALL_END - 540)) / 540) * 100}%` }} />
                  </div>
                  <div className="eq-n">
                    Bisque · {SMALL_TEMP_NOW.toLocaleString('en-US')} → {SMALL_TARGET.toLocaleString('en-US')} °F · ends ≈{fmtTime(SMALL_END)}
                  </div>
                </>
              )}
              {d.id === 'big' && <div className="eq-n">Loaded for glaze cone 6 · queued {startLabel(committed)}</div>}
              {d.id === 'heater' && <div className="eq-n">Thermostat cycling</div>}
              {d.id === 'lights' && <div className="eq-n">Studio occupied</div>}
              {d.id === 'pug' && <div className="eq-n">{running ? 'Running now' : lastPug != null ? `Last run ${fmtTime(lastPug + 15)}` : 'Not used today'}</div>}
            </div>
          )
        })}
      </div>

      <Card
        title="This billing cycle · Oct 28 – Nov 27"
        sub={`${STATS.count.toLocaleString('en-US')} meter readings, 15-minute intervals. Latest reading: 3:15–3:30 pm.`}
        right={
          <div className="cyc-stats">
            <span>
              Energy so far <b>{fmtUsd2(STATS.energyCost)}</b>
            </span>
            <span>
              Demand charge <b>{fmtUsd2(STATS.demandCost)}</b>
            </span>
          </div>
        }
        className="mt"
      >
        <CycleChart rows={[]} fixedKw={S.fixed.enabled ? S.fixed.kw : null} guardKw={S.guard.enabled ? guardLine(S.guard) : null} height={170} />
      </Card>

      <p className="foot">
        Demand figures use nameplate kW for kilns and your typical heater and lights schedule; Tuesday assumes a normal weekday. Utility event: {fmtDayTime(EVENT_START)}–{fmtTime(EVENT_END)}.
      </p>
    </>
  )
}
