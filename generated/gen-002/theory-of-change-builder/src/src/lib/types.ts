export type Stage = 'input' | 'activity' | 'output' | 'outcome' | 'longterm'
export const STAGES: Stage[] = ['input', 'activity', 'output', 'outcome', 'longterm']

export const STAGE_META: Record<Stage, { title: string; singular: string; hint: string }> = {
  input: { title: 'Inputs', singular: 'input', hint: 'Resources you bring' },
  activity: { title: 'Activities', singular: 'activity', hint: 'What staff and volunteers do' },
  output: { title: 'Outputs', singular: 'output', hint: 'What you can count' },
  outcome: { title: 'Short & mid-term outcomes', singular: 'outcome', hint: 'Change within 1–2 years' },
  longterm: { title: 'Long-term outcomes', singular: 'long-term outcome', hint: 'Lasting change' },
}

export type Lane = 'tutoring' | 'shared' | 'bridges'
export const LANES: Lane[] = ['tutoring', 'shared', 'bridges']
export const LANE_META: Record<Lane, { name: string; short: string; color: string; tint: string }> = {
  tutoring: { name: 'After-school tutoring', short: 'Tutoring', color: '#2b6aa1', tint: 'rgba(43,106,161,0.07)' },
  shared: { name: 'Shared by both programs', short: 'Shared', color: '#7b4f8f', tint: 'rgba(123,79,143,0.07)' },
  bridges: { name: 'Book Bridges (summer)', short: 'Book Bridges', color: '#c0532a', tint: 'rgba(192,83,42,0.07)' },
}

export interface Indicator {
  id: string
  name: string
  target: string
  source: string
}

export interface Evidence {
  id: string
  kind: 'research' | 'internal'
  title: string
  cite: string
  takeaway: string
}

export interface El {
  id: string
  stage: Stage
  lane: Lane
  order: number
  text: string
  term?: 'short' | 'mid'
  indicators: Indicator[]
  evidenceIds: string[]
  /** set on the two activities created by splitting "Family engagement" */
  splitFrom?: string
}

export interface Note {
  id: string
  kind: 'assumption' | 'external'
  text: string
}

export interface Edge {
  id: string
  from: string
  to: string
  weak?: { by: string; note: string }
  /** copied over when an element was split and not yet confirmed */
  inherited?: boolean
  notes: Note[]
}

export type PersonId = 'marisol' | 'tomas' | 'ken'
export interface Person {
  id: PersonId
  name: string
  short: string
  role: string
  initials: string
  color: string
}
export const PEOPLE: Record<PersonId, Person> = {
  marisol: { id: 'marisol', name: 'Marisol Vega', short: 'Marisol', role: 'Development Director', initials: 'MV', color: '#0e5c5c' },
  tomas: { id: 'tomas', name: 'Tomás Archuleta', short: 'Tomás', role: 'Program Director', initials: 'TA', color: '#a45a14' },
  ken: { id: 'ken', name: 'Dr. Ken Ishida', short: 'Ken', role: 'Evaluation Consultant', initials: 'KI', color: '#5a4a9a' },
}
export const ME: PersonId = 'marisol'

export type Anchor = { type: 'element'; id: string } | { type: 'edge'; id: string } | { type: 'model' }

export interface Reply {
  id: string
  author: PersonId
  ts: number
  text: string
}
export interface Comment {
  id: string
  author: PersonId
  ts: number
  text: string
  anchor: Anchor
  resolved: boolean
  resolvedBy?: PersonId
  replies: Reply[]
}

export interface Version {
  id: string
  n: number
  name: string
  author: PersonId
  ts: number
  summary: string
  elements: number
  edges: number
}

export interface LogEntry {
  id: string
  author: PersonId
  ts: number
  text: string
}

export interface Doc {
  title: string
  elements: El[]
  edges: Edge[]
  evidence: Evidence[]
  comments: Comment[]
  versions: Version[]
  log: LogEntry[]
}

export type Selection = { kind: 'element'; id: string } | { kind: 'edge'; id: string } | null
