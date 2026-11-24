import { useEffect } from 'react'
import { Shell } from './components/Shell'
import { Actions } from './pages/Actions'
import { CatchUp } from './pages/CatchUp'
import { Library } from './pages/Library'
import { Recording } from './pages/Recording'
import { Search } from './pages/Search'
import { recById } from './data/recordings'
import { useRoute } from './lib/router'

export default function App() {
  const route = useRoute()
  const [a, b] = route.path
  useEffect(() => {
    document.getElementById('scroll')?.scrollTo({ top: 0 })
  }, [a, b])
  let page
  let wide = false
  if (a === 'library') page = <Library />
  else if (a === 'actions') page = <Actions />
  else if (a === 'search') page = <Search q={route.query.get('q') ?? ''} />
  else if (a === 'rec' && b) {
    wide = true
    const at = route.query.get('at')
    page = <Recording id={recById(b).id} at={at ? Number(at) : null} />
  } else page = <CatchUp />
  return <Shell wide={wide}>{page}</Shell>
}
