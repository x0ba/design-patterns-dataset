export interface Person {
  id: string
  name: string
  role: string
  initials: string
}
const p = (id: string, name: string, role: string): Person => ({
  id,
  name,
  role,
  initials: name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2),
})

export const PEOPLE: Record<string, Person> = {
  tomas: p('tomas', 'Tomás Reyes', 'BI platform engineer'),
  priya: p('priya', 'Priya Natarajan', 'BI platform engineer'),
  kiran: p('kiran', 'Kiran Shah', 'BI platform engineer'),
  elena: p('elena', 'Elena Voss', 'BI platform lead'),
  marcus: p('marcus', 'Marcus Oyelaran', 'Sales Analytics'),
  hannah: p('hannah', 'Hannah Lindqvist', 'Loss Prevention Analytics'),
  ingrid: p('ingrid', 'Ingrid Castellanos', 'Workforce Analytics'),
  tobias: p('tobias', 'Tobias Wren', 'Supply Chain Analytics'),
  amara: p('amara', 'Amara Nwosu', 'Merchandising Analytics'),
  joel: p('joel', 'Joel Pettibone', 'Store Operations Reporting'),
  meiling: p('meiling', 'Mei-Ling Zhou', 'Finance Systems Reporting'),
  rafael: p('rafael', 'Rafael Quintero', 'E-commerce Analytics'),
  sunita: p('sunita', 'Sunita Kapoor', 'Pharmacy Analytics'),
  beatriz: p('beatriz', 'Beatriz Almeida', 'Data Governance on-call'),
  anselm: p('anselm', 'Anselm Okoye', 'Data Engineering on-call'),
  dana: p('dana', 'Dana Whitfield', 'Store Operations, Northeast'),
}
export const ME = PEOPLE.tomas

export interface Director {
  id: string
  name: string
  region: string
  stores: number
}
export const DIRECTORS: Director[] = [
  { id: 'colleen', name: 'Colleen Brandt', region: 'Northeast', stores: 84 },
  { id: 'raymond', name: 'Raymond Okafor', region: 'Mid-Atlantic', stores: 72 },
  { id: 'sofia', name: 'Sofia Marchetti', region: 'Southeast', stores: 66 },
  { id: 'jun', name: 'Jun Takeda', region: 'Great Lakes', stores: 52 },
  { id: 'wes', name: 'Wes Kaminski', region: 'Mountain', stores: 36 },
]
