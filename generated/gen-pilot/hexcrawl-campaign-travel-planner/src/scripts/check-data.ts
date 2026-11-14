import { COUNTS, HEXES, SESSIONS, TERRAIN } from '../src/data/world'
import { LOCATIONS } from '../src/data/content'
import { distance } from '../src/data/hexmath'

console.log(COUNTS, 'sessions', SESSIONS.length, 'locations', LOCATIONS.length)
const hexes = LOCATIONS.map((l) => l.hex)
console.log('dupe loc hex', hexes.filter((h, i) => hexes.indexOf(h) !== i))
console.log('lairs', LOCATIONS.filter((l) => l.kind === 'lair').length, 'camps', LOCATIONS.filter((l) => l.kind === 'camp').length)
for (const id of ['1004', '1104', '1204', '1305', '1405', '1406', '1407', '1408', '1409', '1105', '1205', '1306', '1307', '1206']) {
  const h = HEXES.get(id)!
  console.log(id, TERRAIN.get(id), h.know)
}
console.log('dist 1004-1409', distance('1004', '1409'))
const grid: string[] = []
const sym: Record<string, string> = { plains: '.', forest: 'f', marsh: '~', hills: 'n', mountains: 'M', river: '=', road: '+' }
for (let r = 1; r <= 18; r++) {
  let line = String(r).padStart(2) + ' '
  for (let c = 1; c <= 24; c++) {
    const h = HEXES.get(String(c).padStart(2, '0') + String(r).padStart(2, '0'))!
    const s = sym[h.terrain]
    line += h.know === 'explored' ? s.toUpperCase() === s ? s : s.toUpperCase() : s
    line += h.know === 'explored' ? '*' : h.know === 'rumored' ? '?' : ' '
  }
  grid.push(line)
}
console.log(grid.join('\n'))
