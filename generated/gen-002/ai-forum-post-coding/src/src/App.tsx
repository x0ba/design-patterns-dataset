import { useEffect, useRef } from 'react'
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { StoreProvider, useStore } from './store'
import { SideNav, TopBar } from './components/Shell'
import { useRoute } from './lib/router'
import Overview from './pages/Overview'
import Disagreements from './pages/Disagreements'
import Codebook from './pages/Codebook'
import Runs from './pages/Runs'
import Labels from './pages/Labels'
import ActivityPage from './pages/Activity'

function Toaster() {
  const { toast } = useStore()
  if (!toast) return null
  const Icon = toast.tone === 'ok' ? CheckCircle2 : toast.tone === 'warn' ? TriangleAlert : Info
  return (
    <div className={`toast toast-${toast.tone}`} role="status" key={toast.id}>
      <Icon size={17} /> {toast.text}
    </div>
  )
}

function Routes() {
  const { segs } = useRoute()
  switch (segs[0]) {
    case 'disagreements': return <Disagreements />
    case 'codebook': return <Codebook />
    case 'runs': return <Runs />
    case 'labels': return <Labels />
    case 'activity': return <ActivityPage />
    default: return <Overview />
  }
}

function Frame() {
  const { segs } = useRoute()
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { ref.current?.scrollTo({ top: 0 }) }, [segs[0]])
  return (
    <div className="frame">
      <SideNav />
      <main className="main" id="main" ref={ref}><Routes /></main>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <div className="app">
        <TopBar />
        <Frame />
        <Toaster />
      </div>
    </StoreProvider>
  )
}
