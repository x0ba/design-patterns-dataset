import { routeStats, suggestRoute, prepCandidates } from '../src/data/route'
const A = ['1004','1104','1204','1305','1405','1406','1407','1408','1409']
const B = ['1004','1105','1205','1306','1307','1407','1408','1409']
for (const [n, r] of [['A', A], ['B', B]] as const) {
  const s = routeStats(r, 0)
  console.log(n, 'hexes', s.hexes, 'days', s.days, 'dry', s.dryDays, 'ret', s.returnDays, 'lairHexes', s.lairHexes, 'peak', s.peakThreat, 'hostile', s.hostileReachHexes, 'exp/rum/unk', s.exploredCount, s.rumoredCount, s.unknownCount, 'outs', s.runsOutDay, s.runsOutHex)
  console.log(s.legs.map((l) => `${l.hex}:${l.terrain[0]}${l.cost}[${l.startDay}-${l.endDay}] lairs=${l.lairs.map((x) => x.threat)} near=${l.near.map((x) => x.name).join('/')}`).join('\n'))
}
console.log('fast', suggestRoute('1004', '1409', 'fast').join(' '), routeStats(suggestRoute('1004', '1409', 'fast'), 0).days)
console.log('safe', suggestRoute('1004', '1409', 'safe').join(' '), routeStats(suggestRoute('1004', '1409', 'safe'), 0).days)
console.log(prepCandidates(A, B, 0).slice(0, 8).map((c) => `${c.hex} ${c.title} ${c.score.toFixed(1)} ${c.reasons.join('; ')}`).join('\n'))
