import type { Callout, Doc, Photo } from './types'

export const setField = <K extends keyof Doc>(k: K, v: Doc[K]) => (d: Doc): Doc => (d[k] === v ? d : { ...d, [k]: v })

export const editStep = (id: string, text: string) => (d: Doc): Doc => ({
  ...d,
  steps: d.steps.map((s) => (s.id === id ? { ...s, text } : s)),
})

export const moveStep = (id: string, toIndex: number) => (d: Doc): Doc => {
  const from = d.steps.findIndex((s) => s.id === id)
  if (from < 0) return d
  const to = Math.max(0, Math.min(d.steps.length - 1, toIndex))
  if (from === to) return d
  const steps = [...d.steps]
  const [it] = steps.splice(from, 1)
  steps.splice(to, 0, it)
  return { ...d, steps }
}

export const addStepAfter = (afterId: string | null, newId: string, text = '') => (d: Doc): Doc => {
  const i = afterId ? d.steps.findIndex((s) => s.id === afterId) : d.steps.length - 1
  const steps = [...d.steps]
  steps.splice(i + 1, 0, { id: newId, text })
  return { ...d, steps }
}

export const deleteStep = (id: string) => (d: Doc): Doc => ({
  ...d,
  steps: d.steps.filter((s) => s.id !== id),
  note: d.note.stepId === id ? { ...d.note, stepId: null } : d.note,
  callouts: d.callouts.map((c) => (c.stepId === id ? { ...c, stepId: null } : c)),
})

export const setNoteText = (text: string) => (d: Doc): Doc => ({ ...d, note: { ...d.note, text } })
export const attachNote = (stepId: string | null) => (d: Doc): Doc =>
  d.note.stepId === stepId ? d : { ...d, note: { ...d.note, stepId } }

export const moveCallout = (id: string, x: number, y: number) => (d: Doc): Doc => ({
  ...d,
  callouts: d.callouts.map((c) => (c.id === id ? { ...c, x, y } : c)),
})
export const patchCallout = (id: string, p: Partial<Callout>) => (d: Doc): Doc => ({
  ...d,
  callouts: d.callouts.map((c) => (c.id === id ? { ...c, ...p } : c)),
})
export const addCallout = (c: Callout) => (d: Doc): Doc => ({ ...d, callouts: [...d.callouts, c] })
export const deleteCallout = (id: string) => (d: Doc): Doc => ({ ...d, callouts: d.callouts.filter((c) => c.id !== id) })

export const movePhoto = (id: string, delta: number) => (d: Doc): Doc => {
  const i = d.photos.findIndex((p) => p.id === id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= d.photos.length) return d
  const photos = [...d.photos]
  ;[photos[i], photos[j]] = [photos[j], photos[i]]
  return { ...d, photos }
}
export const setCaption = (id: string, caption: string) => (d: Doc): Doc => ({
  ...d,
  photos: d.photos.map((p) => (p.id === id ? { ...p, caption } : p)),
})
export const addPhoto = (p: Photo) => (d: Doc): Doc => ({ ...d, photos: [...d.photos, p] })
export const deletePhoto = (id: string) => (d: Doc): Doc => ({
  ...d,
  photos: d.photos.filter((p) => p.id !== id),
  callouts: d.callouts.filter((c) => c.photoId !== id),
})

export const addTool = (t: string) => (d: Doc): Doc =>
  d.tools.some((x) => x.toLowerCase() === t.toLowerCase()) ? d : { ...d, tools: [...d.tools, t] }
export const removeTool = (t: string) => (d: Doc): Doc => ({ ...d, tools: d.tools.filter((x) => x !== t) })
export const setTorque = (n: number) => (d: Doc): Doc => ({ ...d, torque: Math.max(0.5, Math.round(n * 2) / 2) })

export const toggleRelated = (id: string) => (d: Doc): Doc => ({
  ...d,
  related: d.related.includes(id) ? d.related.filter((x) => x !== id) : [...d.related, id],
})

/** callout numbers run across the photos in sheet order */
export function calloutNumbers(d: Doc): Record<string, number> {
  const out: Record<string, number> = {}
  let n = 0
  for (const p of d.photos) for (const c of d.callouts) if (c.photoId === p.id) out[c.id] = ++n
  return out
}

export const stepNo = (d: Doc, id: string | null) => (id ? d.steps.findIndex((s) => s.id === id) + 1 : 0)

/** Reuse wording from the 500 ml sheet for this 330 ml sheet. */
export function adaptFrom500(text: string): { text: string; changes: string[] } {
  const changes: string[] = []
  let out = text
  if (/156 mm/.test(out)) {
    out = out.replace(/156 mm/g, '142.5 mm')
    changes.push('156 mm → 142.5 mm')
  }
  if (/500 ml/.test(out)) {
    out = out.replace(/500 ml/g, '330 ml')
    changes.push('500 ml → 330 ml')
  }
  return { text: out, changes }
}
