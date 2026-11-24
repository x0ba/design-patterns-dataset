// Headless test of the playback engine (path advance, clips, heard ranges, auto-slow, smart skip).
import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
const P = await vite.ssrLoadModule('/src/lib/player.ts')
const D = await vite.ssrLoadModule('/src/lib/derived.ts')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let bad = 0
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++ }

let s = P.getState()
ok(s.rec === 'oct15' && s.t === 1420 && s.rate === 1.5 && !s.playing, 'initial state: Oct 15 @ 23:40, 1.5x, paused')

P.play(); await sleep(2100); P.pause(); s = P.getState()
ok(Math.abs(s.t - (1420 + 2.1 * 1.5)) < 0.8, `1.5x advance (t=${s.t.toFixed(2)})`)
ok(D.overlap(s.heard.oct15, 0, 3000) > 1420 + 2, 'heard range extended')

// 90 s clip around the Oct 29 mention at 48:05
const m = D.MENTIONS.find((x) => x.rec === 'oct29' && x.t === 2885)
ok(m.clip.end - m.clip.start === 90, 'clip is 90 s')
P.setRate(2.5); P.playClip(m.clip); await sleep(500)
s = P.getState(); ok(s.mode === 'clip' && s.rec === 'oct29' && s.playing, 'clip mode started')
await sleep(37000)
s = P.getState(); ok(!s.playing && s.clipEnded && s.mode === 'free', `clip ends and pauses (t=${s.t.toFixed(1)})`)
P.setRate(1.5)

// path: jump near the end of first segment and make sure it advances to next unheard Listen item
const first = D.PATH.find((p) => !D.segDone(P.getState().heard, p))
P.startPath(D.PATH.indexOf(first), D.PATH, first.end - 1)
await sleep(1500); s = P.getState()
ok(s.rec !== first.rec || s.t < first.start || s.t > first.end ? s.qi > D.PATH.indexOf(first) : false, `path advanced (rec=${s.rec}, t=${s.t.toFixed(0)}, qi=${s.qi})`)

// auto-slow: should drop to 1x inside a decision
P.pause(); P.seek('oct22', 8 * 60 + 5); if (!P.getState().autoSlow) P.toggleAutoSlow(); P.setRate(2)
P.play(); await sleep(1100); s = P.getState()
ok(s.slowed, 'auto-slow engaged inside decision'); ok(s.t - (8 * 60 + 5) < 1.6, `advanced ~1x not 2x (${(s.t - 485).toFixed(2)}s)`)
P.pause(); P.toggleAutoSlow()

// smart skip: seeking into a Skip chapter while playing jumps to its end
P.seek('oct22', 17 * 60 + 40); P.toggleSmartSkip(); P.play(); await sleep(600); s = P.getState()
ok(s.t >= 37 * 60 + 30, `smart skip jumped past skip chapters (t=${(s.t / 60).toFixed(1)} min)`)
P.pause()
console.log(bad ? `${bad} FAILED` : 'engine OK')
await vite.close(); process.exit(bad ? 1 : 0)
