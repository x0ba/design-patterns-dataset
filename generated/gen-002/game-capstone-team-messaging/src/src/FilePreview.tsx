import { useEffect } from 'react'
import { FILES, PEOPLE } from './data'
import { IconClose, IconFile, IconPaperclip } from './icons'
import { fullStamp } from './time'

const STUCK = [
  { room: '1-1', n: 0 }, { room: '1-2', n: 0 }, { room: '1-3', n: 1 }, { room: '1-4', n: 1 }, { room: '1-5', n: 2 },
  { room: '2-1', n: 1 }, { room: '2-2', n: 2 }, { room: '2-3', n: 7 }, { room: '2-4', n: 3 },
]
const TIMES = [12, 13, 14, 15, 16, 17, 18, 19, 21, 24, 29]

function Playtest() {
  return (
    <>
      <div className="stat-row">
        <div><b>11</b><span>testers, each paired with a team member</span></div>
        <div><b>18 min</b><span>average completion time</span></div>
        <div className="hot"><b>7 of 11</b><span>stuck on puzzle 2-3</span></div>
      </div>
      <h4>Testers stuck per room</h4>
      <p className="doc-note">Stuck means more than 3 minutes without progress, or asking for a hint.</p>
      <div className="bars" role="img" aria-label="Number of testers stuck in each room. Room 2-3 has 7, the highest.">
        {STUCK.map((s) => (
          <div key={s.room} className={s.n >= 7 ? 'hot' : ''}>
            <span className="bar-n">{s.n}</span>
            <i style={{ height: 6 + s.n * 15 }} />
            <span className="bar-l">{s.room}</span>
          </div>
        ))}
      </div>
      <h4>Completion time per tester</h4>
      <p className="doc-note">{TIMES.join(', ')} minutes. Median 17, slowest 29.</p>
      <h4>What testers said</h4>
      <blockquote>"We kept shouting 'now?' at each other and neither of us could tell if we were wrong." <cite>Tester 4, after 2-3</cite></blockquote>
      <blockquote>"The rope feel is great. I didn't want to put it down until the cave." <cite>Tester 9</cite></blockquote>
      <blockquote>"World 2 felt like world 1 again, just longer." <cite>Tester 6</cite></blockquote>
    </>
  )
}

function Notes() {
  return (
    <>
      <h4>Added in v0.7</h4>
      <ul>
        <li>World 2: rooms 2-1 to 2-4, playable. Cave tileset is partly placeholder.</li>
        <li>Tether damping reworked; the rope no longer bounces on release.</li>
        <li>Hint chime when a pair is stuck for 90 seconds.</li>
        <li>Checkpoints at the start of each room.</li>
      </ul>
      <h4>Known issues</h4>
      <ul>
        <li>2-3: the plate timer has no audio cue and the far player cannot see it.</li>
        <li>Tether can clip through thin walls below 30 fps.</li>
        <li>Cave variant tiles and tether glow shader are not in yet.</li>
        <li>Two-player only; there is no solo test mode.</li>
      </ul>
      <h4>Planned, not in this build</h4>
      <ul>
        <li>Audio pass: SFX and two music loops.</li>
        <li>Stretch: bonus room for world 3.</li>
      </ul>
    </>
  )
}

const RUBRIC = [
  ['Playable beta', 30, 'The committed scope plays start to finish and holds up for a 30+ minute session.'],
  ['Playtest evidence', 20, '10 or more testers, a written summary, and a before/after log of changes.'],
  ['Feedback integration', 15, 'Mentor and instructor feedback is cited, with what you changed and why.'],
  ['Production', 15, 'Milestone plan, task board and risk log are current.'],
  ['Build presentation', 10, 'A 5-minute demo video and a short store-page style blurb.'],
  ['Team process', 10, 'Retro notes and individual contribution statements.'],
] as const

function Rubric() {
  return (
    <>
      <p className="doc-note" style={{ marginTop: 0 }}>Due Tuesday, Dec 1 at 11:59 PM on Canvas, with a build link. 100 points.</p>
      <table className="rubric">
        <tbody>
          {RUBRIC.map(([name, pts, desc]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td>{desc}</td>
              <td className="pts"><b>{pts}</b><i style={{ width: pts * 1.6 }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export function FilePreview({ file, onClose, onAttach, canAttach, attached }: { file: string; onClose: () => void; onAttach: () => void; canAttach: boolean; attached: boolean }) {
  const f = FILES[file]
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={f.name}>
        <header>
          <span className="file-ico big"><IconFile width={22} height={22} /></span>
          <div>
            <h2>{f.name}</h2>
            <p>{f.kind} · {f.size} · shared by {PEOPLE[f.from].name} · {fullStamp(f.at)}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close preview"><IconClose /></button>
        </header>
        <div className="doc">
          {file === 'playtest' && <Playtest />}
          {file === 'notes' && <Notes />}
          {file === 'rubric' && <Rubric />}
        </div>
        <footer>
          <span>Preview of the shared document</span>
          {canAttach && (
            <button className="btn" onClick={onAttach}><IconPaperclip /> {attached ? 'Remove from reply' : 'Attach to reply'}</button>
          )}
        </footer>
      </div>
    </div>
  )
}
