import { Changeset } from './Changeset'
import { ExportsView } from './Exports'
import { HistoryView } from './History'
import { PowerView } from './Power'
import { ProfilesView } from './Profiles'
import { QAView } from './QA'
import { SensorsView } from './Sensors'
import { Nav, TopBar } from './Shell'
import { StoreProvider, useApp } from './store'

function Main() {
  const { st } = useApp()
  return (
    <main className="main" key={st.view}>
      {st.view === 'sensors' && <SensorsView />}
      {st.view === 'qa' && <QAView />}
      {st.view === 'power' && <PowerView />}
      {st.view === 'exports' && <ExportsView />}
      {st.view === 'history' && <HistoryView />}
      {st.view === 'profiles' && <ProfilesView />}
    </main>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <div className="app">
        <TopBar />
        <div className="body">
          <Nav />
          <Main />
          <Changeset />
        </div>
      </div>
    </StoreProvider>
  )
}
