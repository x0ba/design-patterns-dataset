export type Verdict = 'listen' | 'skim' | 'skip'
export type Topic = 'cytometer' | 'authorship' | 'cruise' | 'dataplan'

export interface Person {
  id: string
  name: string
  first: string
  initials: string
  role: string
  color: string
}

export interface Chapter {
  id: string
  start: number
  end: number
  title: string
  verdict: Verdict
  note: string
  topic?: Topic
}

export interface Turn {
  t: number
  who: string
  text: string
  decision?: boolean
}

export interface Recording {
  id: string
  kind: 'lab' | 'journal'
  title: string
  short: string
  date: string // ISO
  duration: number
  presenter?: string
  paper?: string
  attendees: string[]
  chapters: Chapter[]
  turns: Turn[]
}

export interface ActionItem {
  id: string
  owner: string // person id or 'me'
  text: string
  due: string // ISO
  done: boolean
  rec: string
  at: number
}
