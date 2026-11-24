import { createContext, useContext, useReducer, ReactNode, useCallback } from 'react'
import { Alert, ALERTS_INITIAL, FEED_ALERT_TEMPLATE, Mute, MUTES_INITIAL } from './data/alerts'
import { BtConfig } from './data/history'
import { Rule, RULES_INITIAL } from './data/rules'
import { ME } from './data/people'
import { fmtClock } from './time'

export interface Toast {
  id: number
  text: string
  undo?: () => void
}

export interface Escalation {
  alertId: string
  at: Date
  recipients: string[]
  followUpBy: Date
  updated?: boolean
}
export interface Ticket {
  id: string
  alertId: string
  text: string
  at: Date
}

export interface State {
  alerts: Alert[]
  mutes: Mute[]
  rules: Rule[]
  banners: Record<string, string>
  escalations: Escalation[]
  tickets: Ticket[]
  retries: Record<string, number>
  handoff: string
  toasts: Toast[]
  nextAlert: number
  nextMute: number
}

export const initialState: State = {
  alerts: ALERTS_INITIAL,
  mutes: MUTES_INITIAL,
  rules: RULES_INITIAL,
  banners: {},
  escalations: [],
  tickets: [],
  retries: {},
  handoff: '',
  toasts: [],
  nextAlert: 1045,
  nextMute: 6,
  // eslint-disable-next-line
}

type Action =
  | { t: 'ack'; id: string; now: Date; note?: string }
  | { t: 'resolve'; id: string; now: Date; note?: string }
  | { t: 'addMute'; mute: Mute; alertId?: string; now: Date }
  | { t: 'removeMute'; id: string }
  | { t: 'liftMute'; id: string; now: Date }
  | { t: 'extendMute'; id: string; hours: number }
  | { t: 'escalate'; esc: Escalation; banner?: { reportId: string; text: string } }
  | { t: 'followUpDone'; alertId: string; now: Date }
  | { t: 'banner'; reportId: string; text: string | null }
  | { t: 'log'; alertId: string; now: Date; text: string; actor?: string }
  | { t: 'ticket'; ticket: Ticket }
  | { t: 'retry'; alertId: string; now: Date }
  | { t: 'ruleEnabled'; id: string; enabled: boolean }
  | { t: 'ruleApply'; id: string; cfg: BtConfig; now: Date }
  | { t: 'handoff'; text: string }
  | { t: 'toast'; toast: Toast }
  | { t: 'dismiss'; id: number }

const upd = (alerts: Alert[], id: string, fn: (a: Alert) => Alert) => alerts.map((a) => (a.id === id ? fn(a) : a))

function reducer(s: State, a: Action): State {
  switch (a.t) {
    case 'ack':
      return {
        ...s,
        alerts: upd(s.alerts, a.id, (x) => ({
          ...x,
          status: 'acknowledged',
          ackBy: ME.name,
          timeline: [...x.timeline, { at: a.now, text: a.note ? `Acknowledged: “${a.note}”` : 'Acknowledged', actor: ME.name }],
        })),
      }
    case 'resolve':
      return {
        ...s,
        alerts: upd(s.alerts, a.id, (x) => ({
          ...x,
          status: 'resolved',
          resolvedAt: a.now,
          resolution: a.note || 'Marked resolved',
          timeline: [...x.timeline, { at: a.now, text: a.note ? `Resolved: “${a.note}”` : 'Marked resolved', actor: ME.name }],
        })),
      }
    case 'addMute': {
      const alerts = a.alertId
        ? upd(s.alerts, a.alertId, (x) => ({
            ...x,
            status: x.status === 'open' ? 'acknowledged' : x.status,
            ackBy: x.ackBy ?? ME.name,
            muteId: a.mute.id,
            timeline: [
              ...x.timeline,
              { at: a.now, text: `Muted by ${ME.name} (${a.mute.id}, ${a.mute.expiresAt ? 'until ' + fmtClock(a.mute.expiresAt) : 'until lifted'}): ${a.mute.reason}`, actor: ME.name },
            ],
          }))
        : s.alerts
      return { ...s, alerts, mutes: [a.mute, ...s.mutes], nextMute: s.nextMute + 1 }
    }
    case 'removeMute':
      return { ...s, mutes: s.mutes.filter((m) => m.id !== a.id), alerts: s.alerts.map((x) => (x.muteId === a.id ? { ...x, muteId: undefined } : x)) }
    case 'liftMute': {
      const mute = s.mutes.find((m) => m.id === a.id)
      const mutes = s.mutes.map((m) => (m.id === a.id ? { ...m, active: false } : m))
      // Lifting M-3 releases the row-count alert it was holding back.
      if (a.id === 'M-3' && !s.alerts.some((x) => x.kind === 'feed')) {
        const feed: Alert = {
          ...FEED_ALERT_TEMPLATE,
          id: `A-${s.nextAlert}`,
          timeline: [...FEED_ALERT_TEMPLATE.timeline, { at: a.now, text: `Mute M-3 lifted by ${ME.name}. Alert released`, actor: ME.name }],
        }
        return { ...s, mutes, alerts: [...s.alerts, feed], nextAlert: s.nextAlert + 1 }
      }
      void mute
      return { ...s, mutes }
    }
    case 'extendMute':
      return { ...s, mutes: s.mutes.map((m) => (m.id === a.id && m.expiresAt ? { ...m, expiresAt: new Date(m.expiresAt.getTime() + a.hours * 3600000) } : m)) }
    case 'escalate': {
      const banners = a.banner ? { ...s.banners, [a.banner.reportId]: a.banner.text } : s.banners
      return {
        ...s,
        banners,
        escalations: [...s.escalations, a.esc],
        alerts: upd(s.alerts, a.esc.alertId, (x) => ({
          ...x,
          escalated: true,
          status: x.status === 'open' ? 'acknowledged' : x.status,
          ackBy: x.ackBy ?? ME.name,
          timeline: [
            ...x.timeline,
            { at: a.esc.at, text: `Escalated to ${a.esc.recipients.length} people: ${a.esc.recipients.join(', ')}`, actor: ME.name },
            ...(a.banner ? [{ at: a.esc.at, text: 'Added “provisional data” notice to the report', actor: ME.name }] : []),
          ],
        })),
      }
    }
    case 'followUpDone':
      return {
        ...s,
        escalations: s.escalations.map((e) => (e.alertId === a.alertId ? { ...e, updated: true } : e)),
        alerts: upd(s.alerts, a.alertId, (x) => ({ ...x, timeline: [...x.timeline, { at: a.now, text: 'Follow-up update sent to directors', actor: ME.name }] })),
      }
    case 'banner': {
      const banners = { ...s.banners }
      if (a.text) banners[a.reportId] = a.text
      else delete banners[a.reportId]
      return { ...s, banners }
    }
    case 'log':
      return { ...s, alerts: upd(s.alerts, a.alertId, (x) => ({ ...x, timeline: [...x.timeline, { at: a.now, text: a.text, actor: a.actor }] })) }
    case 'ticket':
      return {
        ...s,
        tickets: [...s.tickets, a.ticket],
        alerts: upd(s.alerts, a.ticket.alertId, (x) => ({ ...x, timeline: [...x.timeline, { at: a.ticket.at, text: `Opened ${a.ticket.id}: ${a.ticket.text}`, actor: ME.name }] })),
      }
    case 'retry':
      return {
        ...s,
        retries: { ...s.retries, [a.alertId]: (s.retries[a.alertId] ?? 0) + 1 },
        alerts: upd(s.alerts, a.alertId, (x) => ({ ...x, timeline: [...x.timeline, { at: a.now, text: 'Manual refresh retry failed: PERMISSION_DENIED on lp.shrink_events_curated', actor: ME.name }] })),
      }
    case 'ruleEnabled':
      return { ...s, rules: s.rules.map((r) => (r.id === a.id ? { ...r, enabled: a.enabled } : r)) }
    case 'ruleApply':
      return {
        ...s,
        rules: s.rules.map((r) =>
          r.id === a.id
            ? {
                ...r,
                version: r.version + 1,
                updated: a.now,
                updatedBy: ME.name,
                threshold: a.cfg.threshold,
                gateMin: a.cfg.gateMin,
                maxHold: a.cfg.maxHold,
                honorCalendar: a.cfg.honorCalendar,
                condition: `Metric moves more than ${a.cfg.threshold}% vs. same period last week${a.cfg.gateMin !== null ? `; held until upstream rows ≥ ${a.cfg.gateMin}% (max ${a.cfg.maxHold} min)` : ''}${a.cfg.honorCalendar ? '; skipped during planned late-feed windows' : ''}`,
              }
            : r
        ),
      }
    case 'handoff':
      return { ...s, handoff: a.text }
    case 'toast':
      return { ...s, toasts: [...s.toasts, a.toast] }
    case 'dismiss':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) }
  }
}

interface Ctx {
  state: State
  dispatch: (a: Action) => void
  toast: (text: string, undo?: () => void) => void
}
const StoreCtx = createContext<Ctx>(null as unknown as Ctx)
export const useStore = () => useContext(StoreCtx)

let toastId = 1
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const toast = useCallback((text: string, undo?: () => void) => {
    const id = toastId++
    dispatch({ t: 'toast', toast: { id, text, undo } })
    setTimeout(() => dispatch({ t: 'dismiss', id }), undo ? 8000 : 4500)
  }, [])
  return <StoreCtx.Provider value={{ state, dispatch, toast }}>{children}</StoreCtx.Provider>
}

export const isUnacked = (a: Alert) => a.status === 'open'
