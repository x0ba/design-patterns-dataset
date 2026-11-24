import { readFileSync } from 'node:fs'
const g = globalThis as any
g.window = g
g.window.blockout = { platform: { platform: 'macos', isMac: true, primaryModifier: '⌘', alternateModifier: '⌥', showInFolderLabel: 'Reveal in Finder' }, presetsList: async () => [], onExportClosed: () => () => {} }
g.document = { activeElement: null, addEventListener() {}, removeEventListener() {} }
g.localStorage = { getItem: () => null, setItem() {} }
const { renderToString } = await import('react-dom/server')
const React = await import('react')
const { useStore } = await import('@renderer/store')
const { ProjectRail } = await import('@renderer/panels/ProjectRail')
const { Inspector } = await import('@renderer/panels/Inspector')
const { Library } = await import('@renderer/panels/Library')
const { Timeline } = await import('@renderer/panels/Timeline')
const { DeliverPanel } = await import('@renderer/panels/DeliverPanel')
const folder = process.argv[2]
const ok = useStore.getState().loadFromJson(folder, readFileSync(folder + '/project.json', 'utf-8'))
console.log('loaded', ok)
const s = useStore.getState()
let n = 0
for (const sc of s.doc!.scenes) {
  useStore.getState().selectScene(sc.id)
  for (const sh of [...sc.shots, ...(sc.drafts ?? [])]) {
    useStore.setState({ shotId: sh.id })
    for (const mode of ['stage', 'shoot', 'deliver'] as const) {
      useStore.setState({ mode })
      for (const C of [ProjectRail, Inspector, Library, Timeline, DeliverPanel]) {
        renderToString(React.createElement(C)); n++
      }
    }
    for (const e of sc.entities) {
      useStore.setState({ selection: { kind: 'entities', entityIds: [e.id] } as any, mode: 'stage' })
      renderToString(React.createElement(Inspector)); n++
    }
    useStore.setState({ selection: null })
  }
}
console.log('rendered', n, 'panel trees OK')
