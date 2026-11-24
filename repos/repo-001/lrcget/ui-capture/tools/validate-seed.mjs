// Parses every seeded lyricsfile with the app's own parser and tallies lyrics status.
import fs from 'node:fs'
import vm from 'node:vm'
import { parseLyricsfile } from '../../src/utils/lyricsfile.js'
const ctx = { window: {} }
vm.runInNewContext(fs.readFileSync(new URL('../out/seed-data.js', import.meta.url), 'utf8'), ctx)
const seed = ctx.window.__LRCGET_SEED__
const tally = {}
let bad = 0
const byTrack = new Map(seed.lyricsfiles.map(l => [l.track_id, l]))
for (const t of seed.tracks) {
  const lf = byTrack.get(t.id)
  let k = 'none'
  if (lf) {
    const p = parseLyricsfile(lf.lyricsfile)
    if (!p || p.error) bad++
    k = p.isInstrumental ? 'instrumental' : p.syncedLines?.length ? (p.syncedLines.some(l => l.words?.length) ? 'word-synced' : 'synced') : p.plainLyrics ? 'plain' : 'empty?'
  }
  tally[k] = (tally[k] || 0) + 1
}
for (const r of seed.lrclib) { const p = parseLyricsfile(r.lyricsfile); if (!p || p.error) bad++ }
console.log(tally, 'parse failures:', bad)
