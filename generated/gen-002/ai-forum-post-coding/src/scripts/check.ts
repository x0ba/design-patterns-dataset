import { CODED, GOLD_POSTS, DISAGREEMENTS, NON_GOLD, CODED_BY_FORUM, FORUMS } from '../src/data/corpus'
import { V3_STATS, HUMAN_STATS, simulateV4, statsFor, affectedByRequestChange, THRESHOLD } from '../src/lib/stats'
import { CODE_IDS } from '../src/data/codes'

console.log('coded', CODED.length, 'gold', GOLD_POSTS.length, 'disagreements', DISAGREEMENTS.length)
console.log('request-involved', DISAGREEMENTS.filter(p=>p.gold==='request'||p.model.code==='request').length)
console.log('forums', CODED_BY_FORUM, FORUMS.map(f=>f.total - CODED_BY_FORUM[f.id]))
for (const c of CODE_IDS) { const s=V3_STATS[c]; console.log(c.padEnd(10), 'n',s.n,'k',s.kappa.toFixed(3),'ci',s.ci.map(x=>x.toFixed(2)).join('–'),'human',HUMAN_STATS[c].kappa.toFixed(2)) }
let bad=0
for (const p of CODED) { if (!p.text.includes(p.model.quote)) { bad++; console.log('QUOTE MISSING', p.id, p.model.quote) } }
console.log('bad quotes', bad)
const words = CODED.map(p=>p.text.split(/\s+/).length).sort((a,b)=>a-b)
console.log('median words', words[Math.floor(words.length/2)], 'min', words[0], 'max', words[words.length-1])
console.log('non-gold request-labeled', NON_GOLD.filter(p=>p.model.code==='request').length, 'affected', NON_GOLD.filter(affectedByRequestChange).length)
console.log('request labels total', CODED.filter(p=>p.model.code==='request').length)
console.log('break posts', GOLD_POSTS.filter(p=>p.breakAt).map(p=>p.text))
for (const s of [0,1,2,3]) {
  const { pairs, changes } = simulateV4(s, new Set())
  const st = statsFor(pairs, false)
  console.log('strength', s, 'request', st.request.kappa.toFixed(3), 'venting', st.venting.kappa.toFixed(3), 'min', Math.min(...CODE_IDS.map(c=>st[c].kappa)).toFixed(3), 'changes', changes.length)
}
console.log(NON_GOLD.slice(0,4).map(p=>p.text+'\n  → '+p.model.code+' '+p.model.conf).join('\n\n'))
