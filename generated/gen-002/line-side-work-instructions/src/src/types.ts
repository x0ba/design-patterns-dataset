export type Category = 'Basic Knowledge' | 'Improvement' | 'Problem Case'

export interface Step {
  id: string
  text: string
}

export interface Photo {
  id: string
  file: string
  caption: string
  takenAt: string
  kind: 'chuck' | 'gauge' | 'upload'
  src?: string
}

export interface Callout {
  id: string
  photoId: string
  /** position in percent of the photo box */
  x: number
  y: number
  label: string
  stepId: string | null
  /** where the label sits relative to the ring; auto picks left/right by position */
  side?: 'l' | 'r' | 't' | 'b'
}

export interface Note {
  text: string
  /** step the note sits beside; null = still at the foot of the sheet */
  stepId: string | null
}

export interface Doc {
  id: string
  title: string
  line: string
  machine: string
  category: Category
  author: string
  date: string
  loto: string
  steps: Step[]
  note: Note
  photos: Photo[]
  callouts: Callout[]
  tools: string[]
  torque: number
  reviewer: { name: string; role: string }
  related: string[]
}

export type CommentTarget = { kind: 'step'; id: string } | { kind: 'sheet' }

export interface Comment {
  id: string
  author: string
  time: string
  text: string
  target: CommentTarget
  resolved: boolean
}

export interface Person {
  id: string
  name: string
  role: string
}

export interface LibraryEntry {
  id: string
  title: string
  line: number
  machine: string
  category: Category
  approved: string
  author: string
  rev: number
  steps?: string[]
}

export type Selection =
  | { kind: 'none' }
  | { kind: 'step'; id: string }
  | { kind: 'photo'; id: string }
  | { kind: 'callout'; id: string }
  | { kind: 'note' }
  | { kind: 'loto' }
  | { kind: 'tools' }
  | { kind: 'torque' }
