import {
  AUDIENCES, AudienceId, AudienceSettings, Decision, Edition, EFFECTIVE_2024, Settings, TODAY,
  BUNDLE_CURRENT_GB, BUNDLE_HEADROOM, TABLETS, bundleSize, SECTIONS,
} from './data'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}
export function daysBetween(a: string, b: string): number {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))
  const db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))
  return Math.round((db - da) / 86400000)
}
export const editionInForce = (date: string): '2021' | '2024' => (date >= EFFECTIVE_2024 ? '2024' : '2021')

export interface Resolved { edition: '2021' | '2024'; reason: string }
export function resolveEdition(s: AudienceSettings, appDate: string | null): Resolved {
  if (s.editionRule === 'fixed') return { edition: s.fixedEdition, reason: `Fixed default for this audience.` }
  if (appDate) {
    const ed = editionInForce(appDate)
    return {
      edition: ed,
      reason: ed === '2021'
        ? `Application date ${fmtDate(appDate)} is before Jan 1, 2027, so the 2021 edition governs.`
        : `Application date ${fmtDate(appDate)} is on or after Jan 1, 2027, so the 2024 edition governs.`,
    }
  }
  if (s.fallback === 'in-force') {
    const ed = editionInForce(TODAY)
    return { edition: ed, reason: `No permit open. Falls back to the edition in force today (${ed}); switches itself on Jan 1, 2027.` }
  }
  return { edition: s.fallback, reason: `No permit open. Falls back to the ${s.fallback} edition.` }
}

/* ---------- Readability (Flesch–Kincaid grade level) ---------- */
function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  const m = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g)
  return Math.max(1, m ? m.length : 1)
}
export function fkGrade(text: string): number {
  const sentences = text.split(/[.!?]+\s/).filter((x) => x.trim()).length || 1
  const words = text.match(/[A-Za-z’']+/g) || []
  if (!words.length) return 0
  const syl = words.reduce((n, w) => n + syllables(w), 0)
  const g = 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59
  return Math.round(g * 10) / 10
}
export function summaryGrades(): { id: string; ed: '2021' | '2024'; grade: number }[] {
  const out: { id: string; ed: '2021' | '2024'; grade: number }[] = []
  SECTIONS.forEach((s) => (['2021', '2024'] as const).forEach((ed) => out.push({ id: s.id, ed, grade: fkGrade(s.summary[ed].en) })))
  return out
}

/* ---------- Bundle fit ---------- */
export function bundleFit(editions: Edition[]) {
  const size = bundleSize(editions)
  const extra = Math.max(0, size - BUNDLE_CURRENT_GB)
  const need = extra + BUNDLE_HEADROOM
  const short = TABLETS.filter((t) => t.freeGb < need)
  return { size, extra, need, short }
}

/* ---------- Diffing settings ---------- */
const EDITION_RULE_LABEL = (s: AudienceSettings) =>
  s.editionRule === 'fixed'
    ? `${s.fixedEdition} edition (fixed)`
    : `Matches permit application date · no permit: ${s.fallback === 'in-force' ? 'edition in force' : s.fallback}`
const AMEND_LABEL = { inline: 'Inline', margin: 'Margin notes', collapsed: 'Collapsed, tap to expand' }
const langs = (s: AudienceSettings) => ['English', s.es && 'Spanish', s.vi && 'Vietnamese (partial)'].filter(Boolean).join(', ')

export interface Row { key: string; label: string; from: string; to: string; changed: boolean }
export function audienceRows(pub: AudienceSettings, dr: AudienceSettings, id: AudienceId): Row[] {
  const rows: [string, string, string, string][] = [
    ['edition', 'Opens to', EDITION_RULE_LABEL(pub), EDITION_RULE_LABEL(dr)],
    ['amend', 'Local amendments', AMEND_LABEL[pub.amendments], AMEND_LABEL[dr.amendments]],
    ['summ', 'Plain-language summaries', pub.summaries ? `On · grade ${pub.grade}` : 'Off', dr.summaries ? `On · grade ${dr.grade}` : 'Off'],
  ]
  if (pub.summaries || dr.summaries) rows.push(['langs', 'Summary languages', pub.summaries ? langs(pub) : '—', dr.summaries ? langs(dr) : '—'])
  rows.push(['notice', 'Transition notice', pub.notice ? 'Shown' : 'Not shown', dr.notice ? 'Shown' : 'Not shown'])
  if (pub.notice && dr.notice && pub.noticeText !== dr.noticeText) rows.push(['noticeText', 'Notice wording', 'Previous wording', 'Edited'])
  if (id === 'inspectors') {
    const b = (s: AudienceSettings) => `${s.bundle.slice().sort().join(' + ') || 'Nothing'} · ${bundleSize(s.bundle).toFixed(1)} GB`
    rows.push(['bundle', 'Offline bundle', b(pub), b(dr)])
  }
  return rows.map(([key, label, from, to]) => ({ key, label, from, to, changed: from !== to }))
}
export function audienceChanged(pub: AudienceSettings, dr: AudienceSettings, id: AudienceId): boolean {
  return audienceRows(pub, dr, id).some((r) => r.changed)
}
export function countChangedAudiences(pub: Settings, dr: Settings): number {
  return AUDIENCES.filter((a) => audienceChanged(pub[a.id], dr[a.id], a.id)).length
}
export function decisionCounts(d: Record<string, Decision>) {
  const v = Object.values(d)
  return { retire: v.filter((x) => x === 'retire').length, historical: v.filter((x) => x === 'historical').length, keep: v.filter((x) => x === 'keep').length }
}

export function changedMemoIds(dr: Record<string, Decision>, pub: Record<string, Decision>): string[] {
  const ids = new Set([...Object.keys(dr), ...Object.keys(pub)])
  return [...ids].filter((id) => dr[id] !== pub[id])
}
