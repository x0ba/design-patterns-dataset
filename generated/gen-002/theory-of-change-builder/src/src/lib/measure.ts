export interface MeasureCheck {
  who: boolean
  change: boolean
  amount: boolean
  when: boolean
  score: number
  ok: boolean
  missing: string[]
}

const WHO =
  /\b(students?|children|child|kids|families|family|parents?|caregivers?|participants?|tutored|tutors?|teachers?|schools?|youth|readers?|learners|cohort|volunteers)\b/i
const CHANGE =
  /\b(increase\w*|improv\w*|reduc\w*|gain\w*|grow\w*|meet\w*|report\w*|reads?|lose|lost|complet\w*|use|uses|review\w*|attend\w*|maintain\w*|sustain\w*|stay\w*|close|start\w*|have|has|reach\w*|achiev\w*|strengthen\w*|raise\w*|build|show\w*|score\w*|exceed\w*|decrease\w*|enroll\w*)\b/i
const AMOUNT =
  /\d+\s?%|\d+\+|\b\d{2,}\b|\b\d+\s+(or more|books|students|families|days|points|hours|schools)\b|\b(all|every|half|most|majority|none|no more than|at least)\b/i
const WHEN =
  /\b(by|within|per|each|every|annual\w*|year\w*|month\w*|week\w*|terms?|semester|quarter|fall|spring|summer|winter|sept\w*|oct\w*|nov\w*|dec\w*|jan\w*|feb\w*|mar\w*|apr\w*|june?|july?|aug\w*|grade|202\d|after)\b/i

/** A quick structural check, not a verdict: does the statement say who, what changes, how much and by when? */
export function checkMeasurable(text: string): MeasureCheck {
  const who = WHO.test(text)
  const change = CHANGE.test(text)
  const amount = AMOUNT.test(text)
  const when = WHEN.test(text)
  const score = [who, change, amount, when].filter(Boolean).length
  const missing: string[] = []
  if (!who) missing.push('who')
  if (!change) missing.push('what changes')
  if (!amount) missing.push('how much')
  if (!when) missing.push('by when')
  return { who, change, amount, when, score, ok: score >= 3, missing }
}
