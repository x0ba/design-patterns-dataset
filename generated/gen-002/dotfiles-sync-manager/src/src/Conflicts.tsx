import { useState } from 'react'
import { UP_APT_DEFAULT } from './data'
import { useStore } from './store'
import { Icon, MName } from './ui'

export function UpConflict({ compact }: { compact?: boolean }) {
  const { state, update, toast } = useStore()
  const [cmd, setCmd] = useState(state.conflicts.up?.pi ?? UP_APT_DEFAULT)
  const resolved = state.conflicts.up

  return (
    <div className={'conflict' + (resolved ? ' resolved' : '') + (compact ? ' compact' : '')}>
      <div className="conflict-head">
        <span className="conflict-tag">{resolved ? 'Resolved' : 'Conflict'}</span>
        <h4>
          Alias <code>up</code> means something different on each machine
        </h4>
      </div>
      <table className="conflict-table">
        <tbody>
          <tr>
            <td><MName m="thinkpad" /></td>
            <td className="muted">Arch · pacman group</td>
            <td><code>sudo pacman -Syu</code></td>
          </tr>
          <tr>
            <td><MName m="mac" /></td>
            <td className="muted">macOS · homebrew group</td>
            <td><code>brew update &amp;&amp; brew upgrade</code></td>
          </tr>
          <tr className="pi-row">
            <td><MName m="pi" /></td>
            <td className="muted">Debian · apt</td>
            <td>
              {resolved ? (
                <code>{resolved.pi}</code>
              ) : (
                <input className="mono-input" value={cmd} onChange={(e) => setCmd(e.target.value)} aria-label="Command for up on pi-media" spellCheck={false} />
              )}
            </td>
          </tr>
        </tbody>
      </table>
      {resolved ? (
        <div className="conflict-foot">
          <span className="ok-text">
            <Icon name="check" /> <code>up</code> is now OS-aware. thinkpad-x1 and mac-mini-studio keep their command, so their files don't change.
          </span>
          <button
            className="btn ghost sm"
            onClick={() =>
              update((d) => {
                d.conflicts.up = null
              })
            }
          >
            <Icon name="undo" /> Undo
          </button>
        </div>
      ) : (
        <div className="conflict-foot">
          <span className="muted">
            Fix: make <code>up</code> OS-aware so each machine runs its own package manager. pi-media gets the command above.
          </span>
          <button
            className="btn primary sm"
            disabled={!cmd.trim()}
            onClick={() => {
              update((d) => {
                d.conflicts.up = { pi: cmd.trim() }
              })
              toast("Resolved: 'up' is OS-aware")
            }}
          >
            Make OS-aware
          </button>
        </div>
      )}
    </div>
  )
}

export function CargoConflict() {
  const { state, update, toast } = useStore()
  const [choice, setChoice] = useState<'drop-rustup' | 'skip-shared'>(state.conflicts.cargo ?? 'drop-rustup')
  const resolved = state.conflicts.cargo

  return (
    <div className={'conflict' + (resolved ? ' resolved' : '')}>
      <div className="conflict-head">
        <span className="conflict-tag">{resolved ? 'Resolved' : 'Conflict'}</span>
        <h4>
          <code>~/.cargo/bin</code> is added to PATH twice on mac-mini-studio
        </h4>
      </div>
      <div className="code-pair">
        <div>
          <div className="code-pair-label">~/.zshenv · line 8 · shared</div>
          <pre className={resolved === 'skip-shared' ? 'struck' : ''}>export PATH="$HOME/.cargo/bin:$PATH"</pre>
        </div>
        <div>
          <div className="code-pair-label">~/.zprofile · line 3 · local change on mac-mini-studio, not pushed</div>
          <pre className={resolved === 'drop-rustup' ? 'struck' : ''}>. "$HOME/.cargo/env"    # added by rustup-init</pre>
        </div>
      </div>
      {resolved ? (
        <div className="conflict-foot">
          <span className="ok-text">
            <Icon name="check" />
            {resolved === 'drop-rustup' ? "rustup's line is removed on mac-mini-studio." : 'The shared line is skipped on mac-mini-studio only.'} Applies to mac-mini-studio on its next sync.
          </span>
          <button
            className="btn ghost sm"
            onClick={() =>
              update((d) => {
                d.conflicts.cargo = null
              })
            }
          >
            <Icon name="undo" /> Undo
          </button>
        </div>
      ) : (
        <>
          <div className="radio-list">
            <label className={'radio' + (choice === 'drop-rustup' ? ' on' : '')}>
              <input type="radio" name="cargo" checked={choice === 'drop-rustup'} onChange={() => setChoice('drop-rustup')} />
              <span>
                <strong>Drop rustup's line on mac-mini-studio</strong>
                <span className="muted"> The shared PATH line already covers it. Recommended.</span>
              </span>
            </label>
            <label className={'radio' + (choice === 'skip-shared' ? ' on' : '')}>
              <input type="radio" name="cargo" checked={choice === 'skip-shared'} onChange={() => setChoice('skip-shared')} />
              <span>
                <strong>Keep rustup's line; skip the shared one on mac-mini-studio</strong>
                <span className="muted"> Other machines keep the shared line.</span>
              </span>
            </label>
          </div>
          <div className="conflict-foot">
            <span className="muted">Only mac-mini-studio is affected. pi-media and thinkpad-x1 don't change.</span>
            <button
              className="btn primary sm"
              onClick={() => {
                update((d) => {
                  d.conflicts.cargo = choice
                })
                toast('Resolved: duplicate cargo PATH line')
              }}
            >
              Resolve
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function ConflictsPage() {
  const { state } = useStore()
  const open = (state.conflicts.up ? 0 : 1) + (state.conflicts.cargo ? 0 : 1)
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Conflicts</h1>
          <p className="sub">{open === 0 ? 'Nothing left to resolve.' : `${open} open. Dotwell found these when it compared what each machine reported.`}</p>
        </div>
      </header>
      <div className="page-body narrow stack">
        <UpConflict />
        <CargoConflict />
      </div>
    </div>
  )
}
