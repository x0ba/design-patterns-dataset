import { INITIAL_MEETINGS, LIN_IDS, TOTAL_ACTIVE } from '../src/data'
import { triage, scanDay, WINDOW_DAYS, fmtDay, fmtTime, pwnState } from '../src/engine'
console.log('meetings', INITIAL_MEETINGS.length, 'lin', LIN_IDS.length, 'active', TOTAL_ACTIVE)
const all = INITIAL_MEETINGS
for (const m of all.filter(x => x.coverage === 'lin')) {
  const t = triage(m, all)
  console.log('\n' + m.student, m.type, 'due', m.due, '=>', t.kind, '|', t.headline, '|', t.detail, t.near?.map(n => n.key + ':' + n.days).join(','))
  if (t.kind !== 'swap') for (const d of WINDOW_DAYS) {
    const i = scanDay(m, all, d)
    console.log('  ', fmtDay(d), i.open.length ? i.open.map(s => fmtTime(s, false)).join(' ') : '— ' + i.reason)
  }
}
console.log('\nPWN states')
for (const m of all) { const p = pwnState(m); if (p.tone !== 'ok') console.log(m.student, m.date, p.label) }
const m7 = all.find(x => x.student === 'Marcus P.')!
console.log('\nMarcus', triage(m7, all).kind)
for (const d of WINDOW_DAYS) { const i = scanDay(m7, all, d); console.log('  ', fmtDay(d), i.open.length ? i.open.length : '— ' + i.reason) }
