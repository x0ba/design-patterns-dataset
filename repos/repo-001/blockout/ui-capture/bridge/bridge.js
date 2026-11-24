/*
 * Browser stand-in for Blockout's Electron preload (src/preload/index.ts).
 * Exposes the same window.blockout surface; every call that the Electron
 * main process would handle is forwarded to the local server
 * (.ui-capture/server.mjs) which implements the same IPC handlers against
 * project folders on disk under .ui-capture/data.
 *
 * Loaded as a classic <script> before the app bundle (injected by the
 * server), so window.blockout.platform exists at module-evaluation time.
 */
;(function () {
  'use strict'

  async function ipc(channel, args) {
    const res = await fetch('/__ipc/' + channel, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(args || [])
    })
    if (!res.ok) throw new Error((await res.text()) || channel + ' failed')
    return res.json()
  }

  // Native file dialog → browser file picker; the chosen file is uploaded to
  // the local server, which returns a filesystem path the other handlers
  // (importAsset / importScan / analyzeReference) can copy from.
  function pickFile(filters) {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      const exts = []
      ;(filters || []).forEach((f) => (f.extensions || []).forEach((e) => exts.push('.' + e)))
      if (exts.length && exts.indexOf('.*') < 0) input.accept = exts.join(',')
      input.style.display = 'none'
      let settled = false
      input.addEventListener('change', async () => {
        settled = true
        const file = input.files && input.files[0]
        input.remove()
        if (!file) return resolve(null)
        const res = await fetch('/__upload?name=' + encodeURIComponent(file.name), {
          method: 'POST',
          body: file
        })
        resolve(res.ok ? (await res.json()).path : null)
      })
      input.addEventListener('cancel', () => {
        if (!settled) resolve(null)
        input.remove()
      })
      document.body.appendChild(input)
      input.click()
    })
  }

  const exportListeners = new Set()
  const jobs = new Map()

  const isMac = /Mac/i.test(navigator.platform || navigator.userAgent)
  const platform = {
    platform: isMac ? 'macos' : /Win/i.test(navigator.platform) ? 'windows' : 'linux',
    isMac: isMac,
    primaryModifier: isMac ? '⌘' : 'Ctrl',
    alternateModifier: isMac ? '⌥' : 'Alt',
    showInFolderLabel: isMac ? 'Reveal in Finder' : 'Show in Folder'
  }

  const api = {
    platform: platform,
    newProjectDialog: () => ipc('dialog:newProject'),
    openProjectDialog: () => ipc('dialog:openProject'),
    pickFile: pickFile,
    saveProject: (folder, json) => ipc('project:save', [folder, json]),
    saveBackup: (folder, json) => ipc('project:saveBackup', [folder, json]),
    loadProject: (folder) => ipc('project:load', [folder]),
    importAsset: (folder, src) => ipc('project:importAsset', [folder, src]),
    importScan: (folder, src) => ipc('scan:import', [folder, src]),
    importReference: (folder, src) => ipc('project:importReference', [folder, src]),
    readProjectFile: async (folder, rel) => {
      const res = await fetch(
        '/__file?folder=' + encodeURIComponent(folder) + '&rel=' + encodeURIComponent(rel)
      )
      if (!res.ok) throw new Error(await res.text())
      return res.arrayBuffer()
    },
    showFolder: (path) => ipc('shell:showFolder', [path]).then(() => undefined),
    openExternal: (url) => ipc('shell:openExternal', [url]),
    // Video encoding: the desktop app pipes raw frames into ffmpeg. There is
    // no ffmpeg here, so frames are counted in-page and the server writes a
    // small encode log in place of the MP4 (stills/metadata/prompt files are
    // written for real via exportWriteFile).
    exportBegin: async (jobId, outPath, opts) => {
      jobs.set(jobId, { outPath, opts, frames: 0 })
      return true
    },
    exportFrame: async (jobId) => {
      const job = jobs.get(jobId)
      if (!job) throw new Error('no export job ' + jobId)
      job.frames++
      return true
    },
    exportEnd: async (jobId) => {
      const job = jobs.get(jobId)
      if (!job) return false
      jobs.delete(jobId)
      const r = await ipc('export:encode', [job.outPath, job.opts, job.frames])
      setTimeout(() => exportListeners.forEach((cb) => cb(jobId, r.code, r.log)), 50)
      return true
    },
    exportCancel: async (jobId) => {
      jobs.delete(jobId)
      return true
    },
    exportWriteFile: async (path, data) => {
      const body = typeof data === 'string' ? data : new Blob([data])
      const res = await fetch('/__write?path=' + encodeURIComponent(path), {
        method: 'POST',
        headers: { 'x-kind': typeof data === 'string' ? 'text' : 'binary' },
        body: body
      })
      if (!res.ok) throw new Error(await res.text())
      return true
    },
    exportConcat: (outPath, inputPaths) => ipc('export:concat', [outPath, inputPaths]),
    onExportClosed: (cb) => {
      exportListeners.add(cb)
      return () => exportListeners.delete(cb)
    },
    versions: () => ipc('app:versions'),
    presetsList: () => ipc('presets:list'),
    presetSave: (name, json) => ipc('presets:save', [name, json]),
    presetLoad: (id) => ipc('presets:load', [id]),
    presetDelete: (id) => ipc('presets:delete', [id]),
    // The MCP control server only exists in the desktop main process.
    onControlInvoke: () => () => {},
    controlResult: () => {},
    analyzeReference: (filePath) => ipc('ai:analyzeReference', [filePath])
  }

  window.blockout = api

  // Reopen the user's most recent project on launch (the desktop app's
  // equivalent is double-clicking the .blockout folder). Uses the app's own
  // automation surface + load path, exactly as Open Project… does.
  window.addEventListener('DOMContentLoaded', () => {
    let tries = 0
    const tick = async () => {
      const bo = window.__blockout
      if (!bo || !bo.store) {
        if (tries++ < 100) setTimeout(tick, 30)
        return
      }
      try {
        const r = await fetch('/__recent')
        const recent = r.ok ? await r.json() : null
        if (!recent || !recent.folder) return
        const loaded = await api.loadProject(recent.folder)
        if (loaded.json) bo.store.getState().loadFromJson(recent.folder, loaded.json)
      } catch (e) {
        console.warn('[bridge] could not reopen recent project', e)
      }
    }
    tick()
  })
})()
