import { useEffect, useState } from 'react'

export interface Route {
  path: string[]
  query: URLSearchParams
}

const read = (): Route => {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [p, q] = h.split('?')
  return { path: p.split('/').filter(Boolean), query: new URLSearchParams(q ?? '') }
}

export const useRoute = (): Route => {
  const [r, setR] = useState<Route>(read)
  useEffect(() => {
    const on = () => setR(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

export const go = (to: string, replace = false) => {
  const url = `#${to.startsWith('/') ? to : '/' + to}`
  if (replace) {
    window.history.replaceState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else window.location.hash = url
}
