export type Pattern =
  | 'perf-gradient'
  | 'perf-round'
  | 'perf-square'
  | 'mesh'
  | 'folded'
  | 'cable'
  | 'green'
  | 'precast'
  | 'brick'
  | 'glass'
  | 'timber'
  | 'terracotta'
  | 'zinc'
  | 'fibercement'

export type SheetKind = 'Detail' | 'Elevation' | 'Section' | 'Plan' | 'Schedule'

export interface Sheet {
  id: string
  projectId: string
  number: string
  title: string
  kind: SheetKind
  scale: string
  issued: string
}

export interface Related {
  id: string
  count: number
}

export interface Project {
  id: string
  commissionYear: number
  seq: number
  year: number
  name: string
  client: string
  sector: string
  type: string
  city: string
  lead: string
  materials: string[]
  awards: string[]
  specs: string[]
  drawings: number
  photos: number
  specDocs: number
  facade: string
  summary: string
  pattern: Pattern
  body: string
  sky: number
  levels: number
  sizeSf: number
  stalls?: number
  openArea?: string
  panel?: string
  support?: string
  featured: boolean
  referenced: number
  detailSheets: Sheet[]
  breakdown: { plans: number; elevations: number; sections: number; details: number; consultant: number }
  related: Related[]
}
