import { useEffect, useReducer } from 'react'
import { FilePreview } from './FilePreview'
import { IconUndo } from './icons'
import { Panel } from './Panel'
import { Sidebar } from './Sidebar'
import { initState, reducer } from './state'
import { ThreadView } from './Thread'

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initState)

  useEffect(() => {
    if (!state.toast) return
    const t = setTimeout(() => dispatch({ type: 'dismissToast' }), state.toast.undo ? 9000 : 3500)
    return () => clearTimeout(t)
  }, [state.toast?.id])

  const attached = state.preview ? (state.pending[state.active]?.files ?? []).includes(state.preview) : false

  return (
    <div className="app">
      <Sidebar state={state} dispatch={dispatch} />
      <ThreadView state={state} dispatch={dispatch} />
      <Panel state={state} dispatch={dispatch} />

      {state.toast && (
        <div className="toast" role="status" key={state.toast.id}>
          <span>{state.toast.text}</span>
          {state.toast.undo && (
            <button onClick={() => dispatch({ type: 'undo' })}><IconUndo width={14} height={14} /> Undo</button>
          )}
        </div>
      )}

      {state.preview && (
        <FilePreview
          file={state.preview}
          onClose={() => dispatch({ type: 'preview', file: null })}
          canAttach
          attached={attached}
          onAttach={() => dispatch({ type: 'toggleFile', id: state.active, file: state.preview! })}
        />
      )}
    </div>
  )
}
