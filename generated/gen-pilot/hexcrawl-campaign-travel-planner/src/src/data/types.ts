export type Terrain = 'plains' | 'forest' | 'marsh' | 'hills' | 'mountains' | 'river' | 'road'
export type Know = 'explored' | 'rumored' | 'unknown'
export type Prep = 'ready' | 'sketched' | 'bare'
export type LocKind = 'settlement' | 'ruin' | 'shrine' | 'landmark' | 'hazard' | 'lair' | 'camp'
export type FactionId = 'pilgrims' | 'wardens' | 'lantern'

export interface Player { id: string; name: string; cls: string; lvl: number }

export interface Faction { id: FactionId; name: string; color: string; stance: string; note: string }

export interface Loc {
  id: string
  name: string
  hex: string
  kind: LocKind
  prep: Prep
  blurb: string
  encounter?: string
  threat?: number // lairs: 1–5
  radius?: number // lairs: territory radius in hexes
  faction?: FactionId // camps
}

export interface Rumor { text: string; source: string; truth: 'true' | 'partly' | 'false' | 'seen'; dmNote?: string }

export interface Hex {
  id: string
  col: number
  row: number
  terrain: Terrain
  know: Know
  rumor?: Rumor
  sessions: number[]
}

export interface Session {
  n: number
  date: string // ISO
  title: string
  players: string[]
  summary: string
  path: string[] // hexes entered, outbound order, starting with Greyhollow
}

export interface Weather { day: number; label: string; kind: 'clear' | 'cloud' | 'rain' }
