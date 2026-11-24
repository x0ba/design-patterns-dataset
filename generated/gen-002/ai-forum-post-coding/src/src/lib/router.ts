import { useEffect, useState } from 'react'

const read = () => {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [path, query = ''] = h.split('?')
  return { segs: path.split('/').filter(Boolean), query: new URLSearchParams(query) }
}

export function navigate(to: string) {
  window.location.hash = '#/' + to.replace(/^\//, '')
}

export function useRoute() {
  const [r, setR] = useState(read)
  useEffect(() => {
    const on = () => setR(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}
