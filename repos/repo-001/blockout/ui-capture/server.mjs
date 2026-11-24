// Local server for running Blockout's renderer in a desktop browser.
//
// - Serves the production renderer build (out/renderer) and injects the
//   window.blockout bridge (.ui-capture/bridge/bridge.js) ahead of the bundle.
// - Implements the Electron main-process IPC handlers (src/main/index.ts,
//   src/main/presets.ts) over HTTP against plain folders on disk:
//     .ui-capture/data/projects/<Name>.blockout/   project folders
//     .ui-capture/data/presets/                    global stage presets
//     .ui-capture/data/uploads/                    files chosen in pickFile
// - Stubs: ffmpeg encode (writes an encode log instead of an MP4) and the
//   Claude reference-analysis call (canned, realistic layouts).
//
// Zero dependencies; Node 22.
import http from 'node:http'
import { readFile, writeFile, mkdir, stat, copyFile, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, dirname, basename, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeStub } from './stubs/analyze-stub.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const WEB = join(ROOT, 'out', 'renderer')
const DATA = resolve(process.env.BLOCKOUT_DATA_DIR || join(HERE, 'data'))
const PROJECTS = join(DATA, 'projects')
const PRESETS = join(DATA, 'presets')
const UPLOADS = join(DATA, 'uploads')
const RECENT = join(DATA, 'recent.json')
const PORT = Number(process.env.PORT || 4474)
const APP_VERSION = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf-8')).version

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
}

/** Keep every path the browser hands us inside the data dir. */
function inData(p) {
  const full = resolve(p)
  if (full !== DATA && !full.startsWith(DATA + sep)) throw new Error('path outside Blockout data dir')
  return full
}

const sanitizeName = (s) =>
  String(s)
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '-')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 120) || 'Untitled'

async function setRecent(folder) {
  await mkdir(DATA, { recursive: true })
  await writeFile(RECENT, JSON.stringify({ folder }, null, 2))
}

async function readBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  return Buffer.concat(chunks)
}

const handlers = {
  async 'dialog:newProject'() {
    await mkdir(PROJECTS, { recursive: true })
    const existing = new Set(await readdir(PROJECTS).catch(() => []))
    let name = 'Untitled'
    for (let i = 2; existing.has(`${name}.blockout`); i++) name = `Untitled ${i}`
    const folder = join(PROJECTS, `${name}.blockout`)
    await mkdir(join(folder, 'assets'), { recursive: true })
    await mkdir(join(folder, 'exports'), { recursive: true })
    await setRecent(folder)
    return { folder, name }
  },
  async 'dialog:openProject'() {
    try {
      const { folder } = JSON.parse(await readFile(RECENT, 'utf-8'))
      if (folder && existsSync(folder)) return folder
    } catch {}
    const dirs = (await readdir(PROJECTS).catch(() => [])).filter((d) => d.endsWith('.blockout'))
    return dirs.length ? join(PROJECTS, dirs[0]) : null
  },
  async 'project:save'(folder, json) {
    folder = inData(folder)
    await mkdir(folder, { recursive: true })
    await writeFile(join(folder, 'project.json'), json, 'utf-8')
    await setRecent(folder)
    return true
  },
  async 'project:saveBackup'(folder, json) {
    folder = inData(folder)
    await mkdir(join(folder, '.autosave'), { recursive: true })
    await writeFile(join(folder, '.autosave', 'project.autosave.json'), json, 'utf-8')
    return true
  },
  async 'project:load'(folder) {
    folder = inData(folder)
    const main = join(folder, 'project.json')
    const backup = join(folder, '.autosave', 'project.autosave.json')
    const out = { json: null, backupJson: null, backupNewer: false, folder }
    let mainTime = 0
    let backupTime = 0
    try {
      out.json = await readFile(main, 'utf-8')
      mainTime = (await stat(main)).mtimeMs
    } catch {}
    try {
      out.backupJson = await readFile(backup, 'utf-8')
      backupTime = (await stat(backup)).mtimeMs
    } catch {}
    out.backupNewer = backupTime > mainTime + 1500 && out.backupJson !== out.json
    if (out.json || out.backupJson) await setRecent(folder)
    return out
  },
  async 'project:importAsset'(folder, src) {
    return copyInto(inData(folder), 'assets', inData(src), true)
  },
  async 'scan:import'(folder, src) {
    return copyInto(inData(folder), 'scans', inData(src), false)
  },
  async 'project:importReference'(folder, src) {
    return copyInto(inData(folder), 'refs', inData(src), true)
  },
  async 'shell:showFolder'() {
    return null
  },
  async 'shell:openExternal'(url) {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    return parsed.protocol === 'https:' && ['wassermanproductions.com', 'wasserman.ai'].includes(host)
  },
  // ffmpeg stub: there is no encoder on this machine; record what would have
  // been encoded so the package folder still has a file at the MP4's path.
  async 'export:encode'(outPath, opts, frames) {
    outPath = inData(outPath)
    await mkdir(dirname(outPath), { recursive: true })
    const log =
      `ffmpeg (stub) -f rawvideo -pix_fmt rgba -s ${opts.width}x${opts.height} ` +
      `-framerate ${opts.fps} -i - -vf vflip -c:v libx264 -crf 18 -pix_fmt yuv420p ${basename(outPath)}\n` +
      `frames received: ${frames}/${opts.framesExpected}\n`
    await writeFile(outPath + '.encode.log', log, 'utf-8')
    return { code: 0, log }
  },
  async 'export:concat'(outPath, inputs) {
    outPath = inData(outPath)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath + '.concat.txt', inputs.map((p) => `file '${p}'`).join('\n'), 'utf-8')
    return { ok: true }
  },
  async 'app:versions'() {
    return { app: APP_VERSION, electron: '43.1.0', node: process.versions.node, platform: process.platform, productName: 'Blockout' }
  },
  async 'presets:list'() {
    let files = []
    try {
      files = await readdir(PRESETS)
    } catch {
      return []
    }
    const metas = []
    for (const f of files) {
      if (!f.endsWith('.json')) continue
      try {
        const p = JSON.parse(await readFile(join(PRESETS, f), 'utf-8'))
        if (typeof p.id !== 'string' || typeof p.name !== 'string') continue
        metas.push({ id: p.id, name: p.name, savedAt: p.savedAt, entityCount: p.entityCount ?? 0 })
      } catch {}
    }
    metas.sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''))
    return metas
  },
  async 'presets:save'(name, json) {
    try {
      const payload = JSON.parse(json)
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'preset'
      const id = `${slug}-${Date.now().toString(36)}`
      const rec = {
        id,
        name: name.trim() || 'Untitled preset',
        savedAt: new Date().toISOString(),
        entityCount: Array.isArray(payload.entities) ? payload.entities.length : 0,
        payload
      }
      await mkdir(PRESETS, { recursive: true })
      await writeFile(join(PRESETS, `${id}.json`), JSON.stringify(rec, null, 2), 'utf-8')
      return { ok: true, id }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  },
  async 'presets:load'(id) {
    const safe = String(id).toLowerCase().replace(/[^a-z0-9-]/g, '')
    try {
      const rec = JSON.parse(await readFile(join(PRESETS, `${safe}.json`), 'utf-8'))
      return JSON.stringify(rec.payload)
    } catch {
      return null
    }
  },
  async 'presets:delete'(id) {
    const safe = String(id).toLowerCase().replace(/[^a-z0-9-]/g, '')
    try {
      await rm(join(PRESETS, `${safe}.json`))
      return true
    } catch {
      return false
    }
  },
  async 'ai:analyzeReference'(filePath) {
    return analyzeStub(basename(filePath))
  }
}

async function copyInto(folder, sub, src, sanitize) {
  const dir = join(folder, sub)
  await mkdir(dir, { recursive: true })
  const srcName = sanitize ? sanitizeName(basename(src)) : basename(src)
  const name = `${Date.now().toString(36)}-${srcName}`
  await copyFile(src, join(dir, name))
  return { relativePath: `${sub}/${name}`, name: basename(src, extname(src)) }
}

let indexHtml = null
async function getIndex() {
  if (!indexHtml) {
    const raw = await readFile(join(WEB, 'index.html'), 'utf-8')
    indexHtml = raw.replace('<script type="module"', '<script src="/__bridge.js"></script>\n    <script type="module"')
  }
  return indexHtml
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const send = (code, body, type = 'application/json') => {
    res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' })
    res.end(body)
  }
  try {
    if (url.pathname.startsWith('/__ipc/') && req.method === 'POST') {
      const channel = decodeURIComponent(url.pathname.slice(7))
      const fn = handlers[channel]
      if (!fn) return send(404, `unknown channel ${channel}`, 'text/plain')
      const args = JSON.parse((await readBody(req)).toString('utf-8') || '[]')
      const out = await fn(...args)
      return send(200, JSON.stringify(out ?? null))
    }
    if (url.pathname === '/__bridge.js') {
      return send(200, await readFile(join(HERE, 'bridge', 'bridge.js')), MIME['.js'])
    }
    if (url.pathname === '/__recent') {
      try {
        const r = JSON.parse(await readFile(RECENT, 'utf-8'))
        if (r.folder && existsSync(join(r.folder, 'project.json'))) return send(200, JSON.stringify(r))
      } catch {}
      return send(200, 'null')
    }
    if (url.pathname === '/__file') {
      const base = inData(url.searchParams.get('folder') || '')
      const rel = (url.searchParams.get('rel') || '').replace(/\\/g, '/')
      if (!rel || rel.startsWith('/') || /^[a-z]:/i.test(rel)) return send(400, 'path must be relative', 'text/plain')
      const full = resolve(base, ...rel.split('/'))
      if (full !== base && !full.startsWith(base + sep)) return send(400, 'path escapes project folder', 'text/plain')
      return send(200, await readFile(full), 'application/octet-stream')
    }
    if (url.pathname === '/__write' && req.method === 'POST') {
      const p = inData(url.searchParams.get('path') || '')
      await mkdir(dirname(p), { recursive: true })
      await writeFile(p, await readBody(req))
      return send(200, 'true')
    }
    if (url.pathname === '/__upload' && req.method === 'POST') {
      await mkdir(UPLOADS, { recursive: true })
      const name = sanitizeName(url.searchParams.get('name') || 'upload.bin')
      const p = join(UPLOADS, `${Date.now().toString(36)}-${name}`)
      await writeFile(p, await readBody(req))
      return send(200, JSON.stringify({ path: p }))
    }
    // Static renderer build; unknown paths fall back to index.html.
    let rel = decodeURIComponent(url.pathname)
    if (rel === '/' || rel === '/index.html') return send(200, await getIndex(), MIME['.html'])
    const full = resolve(WEB, '.' + rel)
    if (full.startsWith(WEB + sep) && existsSync(full) && (await stat(full)).isFile()) {
      return send(200, await readFile(full), MIME[extname(full)] || 'application/octet-stream')
    }
    return send(200, await getIndex(), MIME['.html'])
  } catch (e) {
    console.error('[server]', req.method, req.url, e)
    return send(500, String(e && e.message ? e.message : e), 'text/plain')
  }
})

server.listen(PORT, () => {
  console.log(`Blockout (browser) on http://localhost:${PORT}/  data: ${DATA}`)
})
