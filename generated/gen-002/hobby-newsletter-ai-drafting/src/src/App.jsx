import { useCallback, useReducer } from 'react'
import Header, { TaskBar } from './components/Header.jsx'
import LeftRail from './components/LeftRail.jsx'
import ItemReview from './components/ItemReview.jsx'
import SourcePane from './components/SourcePane.jsx'
import { PreviewModal, RedoModal, Toast } from './components/Modals.jsx'
import { ITEM5_PLANNING_ONLY } from './data/draft.js'
import { DOC_BY_ID } from './data/sources.js'
import { initState, reducer } from './state.js'

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initState)

  // The mock assistant: redoing item 5 from the planning minutes alone produces a rebuilt draft.
  // Any other request comes back with the draft unchanged.
  const sendRedo = useCallback((itemId, instruction, docIds) => {
    dispatch({ type: 'redoStart', itemId, instruction })
    const planningOnly = itemId === 5 && docIds.length === 1 && docIds[0] === 'planning'
    const names = docIds.map((d) => `${DOC_BY_ID[d].short} ${DOC_BY_ID[d].date}`).join(', ')
    setTimeout(() => {
      if (planningOnly) {
        dispatch({
          type: 'redoDone',
          itemId,
          result: ITEM5_PLANNING_ONLY,
          logText: 'Reread the Nov 13 Planning Commission minutes only. Rebuilt item 5 at 70 words; every claim links to a page.',
        })
      } else {
        dispatch({
          type: 'redoDone',
          itemId,
          result: null,
          reply: `I reread ${names}. The wording still matches what those documents say, so I changed nothing. Anything you flagged still needs your judgment.`,
          logText: `Reread ${names}. Made no changes to item ${itemId}.`,
        })
      }
    }, 2400)
  }, [])

  return (
    <div className="app">
      <Header state={state} dispatch={dispatch} />
      <TaskBar state={state} dispatch={dispatch} />
      <div className="workspace">
        <LeftRail state={state} dispatch={dispatch} />
        <ItemReview state={state} dispatch={dispatch} />
        <SourcePane state={state} dispatch={dispatch} />
      </div>
      {state.modal?.type === 'redo' && <RedoModal state={state} dispatch={dispatch} itemId={state.modal.itemId} onSend={sendRedo} />}
      {state.modal?.type === 'preview' && <PreviewModal state={state} dispatch={dispatch} />}
      <Toast toast={state.toast} dispatch={dispatch} />
    </div>
  )
}
