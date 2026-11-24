import type { Person } from './types'

// The 11 people identified by speaker labelling across the six recordings.
export const PEOPLE: Person[] = [
  { id: 'halv', name: 'Prof. Halvorsen', first: 'Prof. Halvorsen', initials: 'PH', role: 'Principal investigator', color: '#1f3a44' },
  { id: 'jun', name: 'Jun Takeda', first: 'Jun', initials: 'JT', role: 'Lab manager', color: '#9a5b13' },
  { id: 'ama', name: 'Ama Boateng', first: 'Ama', initials: 'AB', role: 'PhD student', color: '#2f7d5b' },
  { id: 'diego', name: 'Diego Ruiz', first: 'Diego', initials: 'DR', role: 'PhD student', color: '#a23b52' },
  { id: 'maren', name: 'Maren Becker', first: 'Maren', initials: 'MB', role: 'PhD student', color: '#5a4aa3' },
  { id: 'priya', name: 'Dr. Priya Raman', first: 'Priya', initials: 'PR', role: 'Postdoctoral researcher', color: '#1d6f8f' },
  { id: 'tomas', name: 'Tomás Herrera', first: 'Tomás', initials: 'TH', role: 'PhD student', color: '#8a6a12' },
  { id: 'lena', name: 'Lena Fischer', first: 'Lena', initials: 'LF', role: 'Research technician', color: '#3f7a2c' },
  { id: 'sam', name: 'Sam Haddad', first: 'Sam', initials: 'SH', role: 'MSc student', color: '#b0483a' },
  { id: 'hana', name: 'Hana Kobayashi', first: 'Hana', initials: 'HK', role: 'PhD student', color: '#7a4a86' },
  { id: 'chloe', name: 'Chloe Nguyen', first: 'Chloe', initials: 'CN', role: 'Undergraduate honors student', color: '#3b6a8a' },
]

export const ME = {
  id: 'me',
  name: 'Dr. Adaeze Okonkwo',
  first: 'Adaeze',
  initials: 'AO',
  role: 'Postdoctoral researcher',
  color: '#0e5a64',
}

export const personById = (id: string): Person =>
  id === 'me' ? (ME as Person) : PEOPLE.find((p) => p.id === id) ?? PEOPLE[0]
