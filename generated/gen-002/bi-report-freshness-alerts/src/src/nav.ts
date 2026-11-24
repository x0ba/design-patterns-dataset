import { useEffect, useState } from 'react'

export interface Route {
  page: 'triage' | 'reports' | 'rules' | 'mutes' | 'oncall'
  id?: string
  tab?: string
  q?: string
}

export function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const parts = path.split('/').filter(Boolean)
  const params = new URLSearchParams(query)
  const page = (['triage', 'reports', 'rules', 'mutes', 'oncall'] as const).find((p) => p === parts[0]) ?? 'triage'
  return { page, id: parts[1], tab: parts[2], q: params.get('q') ?? undefined }
}

export function href(r: Route) {
  let s = `#/${r.page}`
  if (r.id) s += `/${r.id}`
  if (r.tab) s += `/${r.tab}`
  if (r.q) s += `?q=${encodeURIComponent(r.q)}`
  return s
}
export const go = (r: Route) => {
  window.location.hash = href(r)
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
