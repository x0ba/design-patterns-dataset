export const wordCount = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length

const ABBREV = /\b(Mr|Ms|Mrs|Dr|Nov|Dec|Oct|Sept|No|St|a\.m|p\.m)\.$/

// Split a paragraph into sentences, returning [start, end) offsets.
export function sentenceRanges(text) {
  const out = []
  let start = 0
  const re = /[.!?;]\s+(?=[A-Z(“"])/g
  let m
  while ((m = re.exec(text))) {
    const end = m.index + 1
    if (ABBREV.test(text.slice(0, end))) continue
    out.push([start, end])
    start = m.index + m[0].length
  }
  out.push([start, text.length])
  return out
}

export function sentenceAt(text, idx) {
  const r = sentenceRanges(text).find(([a, b]) => idx >= a && idx < b) || [0, text.length]
  return text.slice(r[0], r[1]).trim()
}

export const paragraphs = (pageText) => pageText.split('\n\n')

export const isHeading = (p) => p.startsWith('# ')

// Time shown on new work-log lines. The desk opens at 9:12 p.m. Wednesday.
export function clockLabel(minutesAfterOpen) {
  const total = 9 * 60 + 12 + minutesAfterOpen
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'p.m.' : 'a.m.'}`
}
