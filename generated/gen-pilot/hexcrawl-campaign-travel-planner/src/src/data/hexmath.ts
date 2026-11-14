// Flat-top hexes, 1-based columns 01–24 and rows 01–18, even columns shifted down half a hex.
export const COLS = 24
export const ROWS = 18
export const SQRT3 = Math.sqrt(3)

export interface Cube { x: number; y: number; z: number }

export const hid = (col: number, row: number) =>
  String(col).padStart(2, '0') + String(row).padStart(2, '0')
export const parseHex = (id: string) => ({ col: Number(id.slice(0, 2)), row: Number(id.slice(2)) })
export const inGrid = (col: number, row: number) => col >= 1 && col <= COLS && row >= 1 && row <= ROWS

export function toCube(id: string): Cube {
  const { col, row } = parseHex(id)
  const q = col - 1
  const r = row - 1
  const x = q
  const z = r - (q - (q & 1)) / 2
  return { x, z, y: -x - z }
}

export function fromCube(c: Cube): string {
  const q = c.x
  const r = c.z + (q - (q & 1)) / 2
  return hid(q + 1, r + 1)
}

const DIRS: Cube[] = [
  { x: 1, y: -1, z: 0 }, { x: 1, y: 0, z: -1 }, { x: 0, y: 1, z: -1 },
  { x: -1, y: 1, z: 0 }, { x: -1, y: 0, z: 1 }, { x: 0, y: -1, z: 1 },
]

export function neighbors(id: string): string[] {
  const c = toCube(id)
  const out: string[] = []
  for (const d of DIRS) {
    const n = { x: c.x + d.x, y: c.y + d.y, z: c.z + d.z }
    const nid = fromCube(n)
    const p = parseHex(nid)
    if (inGrid(p.col, p.row)) out.push(nid)
  }
  return out
}

export function distance(a: string, b: string): number {
  const p = toCube(a)
  const q = toCube(b)
  return Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y), Math.abs(p.z - q.z))
}

export function hexLine(a: string, b: string): string[] {
  const n = distance(a, b)
  const p = toCube(a)
  const q = toCube(b)
  const out: string[] = []
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n
    // nudge to avoid ties on edges
    const x = p.x + (q.x - p.x) * t + 1e-6
    const y = p.y + (q.y - p.y) * t + 2e-6
    const z = p.z + (q.z - p.z) * t - 3e-6
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z)
    const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z)
    if (dx > dy && dx > dz) rx = -ry - rz
    else if (dy > dz) ry = -rx - rz
    else rz = -rx - ry
    out.push(fromCube({ x: rx, y: ry, z: rz }))
  }
  return out
}

export function withinRange(center: string, radius: number): string[] {
  const out: string[] = []
  for (let col = 1; col <= COLS; col++)
    for (let row = 1; row <= ROWS; row++) {
      const id = hid(col, row)
      if (distance(center, id) <= radius) out.push(id)
    }
  return out
}

export function allHexIds(): string[] {
  const out: string[] = []
  for (let col = 1; col <= COLS; col++) for (let row = 1; row <= ROWS; row++) out.push(hid(col, row))
  return out
}

export function center(id: string, s: number) {
  const { col, row } = parseHex(id)
  const q = col - 1
  const r = row - 1
  return { x: s * (1.5 * q + 1), y: s * SQRT3 * (r + 0.5 + (q % 2 === 1 ? 0.5 : 0)) }
}

export function hexPoints(cx: number, cy: number, s: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i
    pts.push(`${(cx + s * Math.cos(a)).toFixed(2)},${(cy + s * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}
