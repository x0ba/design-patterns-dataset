import { SEGMENTS, type MachineId, type SegId } from './data'
import type { Snapshot } from './model'
import { fmtMs, promptMs } from './derive'

const SAMPLE: Record<MachineId, Partial<Record<SegId, string>> & { dir: string }> = {
  thinkpad: { dir: '~/src/pharmacy-tools', git_branch: 'main', git_status: '[!2?1]', python: '🐍 3.12.4 (.venv)', battery: '🔋 82%' },
  mac: { dir: '~/src/pharmacy-tools', git_branch: 'main', git_status: '[!2?1]', python: '🐍 3.12.4 (.venv)', battery: '' },
  pi: { dir: '~/media-stack', git_branch: 'main', git_status: '[!1]', python: '🐍 3.11.2', battery: '' },
}

export function PromptLine({ m, snap, ssh }: { m: MachineId; snap: Snapshot; ssh?: boolean }) {
  const seg = snap.configs[m].segments
  const s = SAMPLE[m]
  const parts: React.ReactNode[] = []
  if (ssh) parts.push(<span key="host" className="t-host">pi-media </span>)
  for (const x of SEGMENTS) {
    if (!seg[x.id]) continue
    switch (x.id) {
      case 'directory':
        parts.push(<span key={x.id} className="t-dir">{s.dir} </span>)
        break
      case 'git_branch':
        parts.push(
          <span key={x.id}>
            on <span className="t-branch">⎇ {s.git_branch}</span>{' '}
          </span>,
        )
        break
      case 'git_status':
        parts.push(<span key={x.id} className="t-status">{s.git_status} </span>)
        break
      case 'python':
        parts.push(
          <span key={x.id}>
            via <span className="t-py">{s.python}</span>{' '}
          </span>,
        )
        break
      case 'battery':
        parts.push(
          s.battery ? (
            <span key={x.id} className="t-bat">{s.battery} </span>
          ) : (
            <span key={x.id} className="t-ghost" title="Module runs but prints nothing: no battery">
              ·battery?·{' '}
            </span>
          ),
        )
        break
      case 'cmd_duration':
        parts.push(
          <span key={x.id}>
            took <span className="t-dur">3s</span>{' '}
          </span>,
        )
        break
      case 'time':
        parts.push(
          <span key={x.id}>
            at <span className="t-time">14:32</span>
          </span>,
        )
        break
    }
  }
  return (
    <div className="term">
      <div className="term-line">{parts}</div>
      <div className="term-line">
        <span className="t-char">❯</span> <span className="t-cursor" />
      </div>
    </div>
  )
}

export function PromptCost({ m, snap, before }: { m: MachineId; snap: Snapshot; before?: Snapshot }) {
  const ms = promptMs(m, snap)
  const prev = before ? promptMs(m, before) : null
  const slow = ms > 50
  return (
    <span className={'cost' + (slow ? ' slow' : '')}>
      ~{fmtMs(ms)} per prompt
      {prev !== null && Math.abs(prev - ms) > 0.5 && <span className="muted"> (was {fmtMs(prev)})</span>}
    </span>
  )
}
