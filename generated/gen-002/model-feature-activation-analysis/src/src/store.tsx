import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadWorkspace, saveWorkspace, type Workspace, type Bookmark, type Hypothesis, type HypId } from './data/seed'
import { db, N, NF, LAYERS, C_CLUSTER } from './data/db'

export type Page = 'explorer' | 'notebook' | 'bookmarks' | 'runs'
export type Sel = 'all' | 'dI' | 'dN' | 'sI' | 'sN' | 'cluster' | 'brush'
export type SortKey = 'feature' | 'label' | 'freq' | 'score' | 'ci' | 'human'

export interface Brush { x0: number; x1: number; y0: number; y1: number; ids: Uint32Array }

export interface View {
  layers: boolean[]
  q: string
  denseT: number
  interpT: number
  humanOnly: boolean
  showDead: boolean
  colorBy: 'layer' | 'human' | 'ci'
  zoom: 'full' | 'dense'
  hlCluster: boolean
  tab: 'scatter' | 'layers' | 'reliability'
  sel: Sel
  brush: Brush | null
  sort: { key: SortKey; dir: 1 | -1 }
}

interface Ctx {
  page: Page
  setPage: (p: Page) => void
  view: View
  setView: (p: Partial<View>) => void
  selected: number
  select: (g: number) => void
  ws: Workspace
  toggleBookmark: (g: number) => void
  updateBookmark: (g: number, p: Partial<Bookmark>) => void
  updateHyp: (id: HypId, p: Partial<Hypothesis>) => void
  resetWorkspace: () => void
  openHypothesis: (id: HypId) => void
  activeHyp: HypId
}

const C = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(C)

const initialView = (): View => ({
  layers: LAYERS.map(() => true),
  q: '',
  denseT: 0.1,
  interpT: 0.5,
  humanOnly: false,
  showDead: false,
  colorBy: 'layer',
  zoom: 'full',
  hlCluster: true,
  tab: 'scatter',
  sel: 'cluster',
  brush: null,
  sort: { key: 'freq', dir: -1 },
})

function initialSelected(ws: Workspace) {
  // the strongest dense L12 code feature
  let best = -1
  for (let g = 0; g < N; g++) if (db.cls[g] === C_CLUSTER && (best < 0 || db.freq[g] > db.freq[best])) best = g
  return ws.bookmarks[best] !== undefined || best >= 0 ? best : 0
}

export function Provider({ children }: { children: ReactNode }) {
  const [ws, setWs] = useState<Workspace>(() => loadWorkspace())
  const [page, setPage] = useState<Page>('explorer')
  const [view, setViewState] = useState<View>(initialView)
  const [selected, setSelected] = useState<number>(() => initialSelected(ws))
  const [activeHyp, setActiveHyp] = useState<HypId>('H3')

  useEffect(() => { saveWorkspace(ws) }, [ws])

  const setView = useCallback((p: Partial<View>) => setViewState((v) => ({ ...v, ...p })), [])
  const select = useCallback((g: number) => setSelected(g), [])

  const toggleBookmark = useCallback((g: number) => {
    setWs((w) => {
      const b = { ...w.bookmarks }
      if (b[g]) delete b[g]
      else b[g] = { note: '', hyp: null, stance: 'neutral', added: 'Nov 17' }
      return { ...w, bookmarks: b }
    })
  }, [])
  const updateBookmark = useCallback((g: number, p: Partial<Bookmark>) => {
    setWs((w) => (w.bookmarks[g] ? { ...w, bookmarks: { ...w.bookmarks, [g]: { ...w.bookmarks[g], ...p } } } : w))
  }, [])
  const updateHyp = useCallback((id: HypId, p: Partial<Hypothesis>) => {
    setWs((w) => ({ ...w, hyps: w.hyps.map((h) => (h.id === id ? { ...h, ...p } : h)) }))
  }, [])
  const resetWorkspace = useCallback(() => {
    try { localStorage.removeItem('featurescope.workspace.v1') } catch { /* ignore */ }
    setWs(loadWorkspace())
  }, [])

  const openHypothesis = useCallback((id: HypId) => {
    setActiveHyp(id)
    const all = LAYERS.map(() => true)
    if (id === 'H1') {
      setViewState((v) => ({ ...v, tab: 'layers', layers: all, q: '', humanOnly: false, sel: 'dI', brush: null, hlCluster: false, sort: { key: 'freq', dir: -1 } }))
    } else if (id === 'H2') {
      setViewState((v) => ({ ...v, tab: 'reliability', layers: all, q: '', humanOnly: false, sel: 'dN', brush: null, hlCluster: false, sort: { key: 'ci', dir: -1 } }))
    } else {
      setViewState((v) => ({ ...v, tab: 'scatter', layers: LAYERS.map((l) => l === 12), q: '', humanOnly: false, sel: 'cluster', brush: null, hlCluster: true, sort: { key: 'freq', dir: -1 } }))
    }
    setPage('explorer')
  }, [])

  const value = useMemo(
    () => ({ page, setPage, view, setView, selected, select, ws, toggleBookmark, updateBookmark, updateHyp, resetWorkspace, openHypothesis, activeHyp }),
    [page, view, setView, selected, select, ws, toggleBookmark, updateBookmark, updateHyp, resetWorkspace, openHypothesis, activeHyp],
  )
  return <C.Provider value={value}>{children}</C.Provider>
}

export { NF }
