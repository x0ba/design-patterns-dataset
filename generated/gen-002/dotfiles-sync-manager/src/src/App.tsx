import { StoreProvider, useStore } from './store'
import { Sidebar } from './Sidebar'
import { PiSetup } from './PiSetup'
import { Review } from './Review'
import { MachinePage } from './Machines'
import { AliasesPage, FilesPage } from './Library'
import { ConflictsPage } from './Conflicts'
import { Icon } from './ui'

function Main() {
  const { state } = useStore()
  const v = state.view
  let page
  if (v.kind === 'machine') page = v.id === 'pi' ? <PiSetup /> : <MachinePage id={v.id} key={v.id} />
  else if (v.kind === 'review') page = <Review />
  else if (v.kind === 'files') page = <FilesPage />
  else if (v.kind === 'aliases') page = <AliasesPage />
  else page = <ConflictsPage />
  return (
    <div className="app">
      <Sidebar />
      <main className={'main-scroll' + (v.kind === 'review' ? ' no-scroll' : '')}>{page}</main>
      {state.toast && (
        <div className="toast" role="status" key={state.toast.id}>
          <Icon name="check" /> {state.toast.text}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Main />
    </StoreProvider>
  )
}
