export type Role = 'student' | 'instructor' | 'ta' | 'mentor'

export interface Person {
  id: string
  name: string
  first: string
  role: Role
  title: string
  hue: number // avatar hue
}

export interface Quote {
  who: string
  text: string
  msgId?: string
}

export interface Msg {
  id: string
  from: string
  at: string // ISO with offset
  text: string
  unread?: boolean
  files?: string[]
  quote?: Quote
  call?: string // slot id
  longRead?: boolean
}

export interface Thread {
  id: string
  kind: 'team' | 'mentor' | 'staff' | 'dm'
  title: string
  subtitle: string
  members: string[]
  total?: number // total messages this term (when more than loaded)
}

export interface FileMeta {
  id: string
  name: string
  kind: 'PDF' | 'DOC'
  size: string
  from: string
  at: string
  blurb: string
}

export interface Slot {
  id: string
  day: number // 0 = Mon Nov 16 ... 3 = Thu Nov 19
  start: number // minutes from midnight
  end: number
  kind: 'mentor' | 'office'
}
