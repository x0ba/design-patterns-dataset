import { makeRand } from './rng.js'

export const W = 1000, H = 700
export const CAPITAL = { name: 'Ellery', x: 505, y: 345 }
const NAMES = ['Ashby','Barlow','Brannock','Calder','Carrow','Colfax','Dunmore','Eastwick','Fenner','Garrick','Greer','Halloran','Harmon','Hollis','Ingram','Jessup','Kellam','Lanier','Larkin','Marden','Mercer','Merrow','Navarre','Norwood','Ostrander','Pellham','Prescott','Quarles','Radnor','Redmond','Rowan','Sutter','Talbot','Tillery','Underhill','Vance','Wexford','Whitlock','Yarrow','Aldridge','Bexley','Cutler','Dalton','Everly','Fairmont','Gatlin','Haskell','Ivers']
const r = makeRand(91)
const order = r.shuffle(NAMES)
export const COUNTIES = []
let k = 0
for (let row = 0; row < 6; row++) for (let col = 0; col < 8; col++) {
  const name = order[k++]
  COUNTIES.push({
    name,
    x: Math.round(70 + col * 123 + (r.f() - 0.5) * 60),
    y: Math.round(60 + row * 115 + (r.f() - 0.5) * 50),
    roadFactor: 0.92 + r.f() * 0.3,
  })
}
export const driveFrom = (x, y, rf = 1) => {
  const d = Math.hypot(x - CAPITAL.x, y - CAPITAL.y)
  return Math.max(4, Math.round(d * 0.4 * rf))
}
export const countyByName = Object.fromEntries(COUNTIES.map((c) => [c.name, c]))
