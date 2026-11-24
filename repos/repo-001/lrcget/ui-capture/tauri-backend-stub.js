// Browser stand-in for LRCGET's Rust/Tauri backend.
// Installs window.__TAURI_INTERNALS__ (the IPC boundary used by @tauri-apps/api)
// and answers the app's commands from an in-memory copy of the seeded library
// (window.__LRCGET_SEED__, produced by gen-seed.mjs). LRCLIB API calls are served
// from the seed's `lrclib` catalogue instead of the network.
;(function () {
  const seed = window.__LRCGET_SEED__
  if (!seed) {
    console.error('[stub] seed-data.js missing')
    return
  }

  // ---------- in-memory "database" ----------
  const db = {
    init: seed.init,
    directories: [...seed.directories],
    config: { ...seed.config },
    artists: new Map(seed.artists.map(a => [a.id, a])),
    albums: new Map(seed.albums.map(a => [a.id, a])),
    tracks: new Map(seed.tracks.map(t => [t.id, { ...t }])),
    lyricsfiles: new Map(seed.lyricsfiles.map(l => [l.id, { ...l }])),
    lrclib: new Map(seed.lrclib.map(r => [r.id, r])),
    notifications: [],
  }
  let nextLyricsfileId = Math.max(0, ...db.lyricsfiles.keys()) + 1

  const lyricsfileForTrack = trackId => {
    for (const l of db.lyricsfiles.values()) if (l.track_id === trackId) return l
    return null
  }

  const presence = content => {
    const c = content || ''
    const instrumental = /^\s*instrumental:\s*true/m.test(c)
    const synced = /^lines:\s*\n\s*- text:/m.test(c)
    const words = /^\s+words:\s*\n/m.test(c)
    const plainMatch = c.match(/^plain:\s*(\|[-+]?\s*\n[\s\S]+|['"].+['"])/m)
    const plain = !!plainMatch && !/^plain:\s*(''|"")\s*$/m.test(c)
    return { instrumental, synced, words, plain: plain || synced }
  }

  const fullTrack = t => {
    const album = db.albums.get(t.album_id)
    const artist = db.artists.get(t.artist_id)
    const lf = lyricsfileForTrack(t.id)
    return {
      id: t.id,
      file_path: t.file_path,
      file_name: t.file_path.split('/').pop(),
      title: t.title,
      album_name: album.name,
      album_artist_name: album.album_artist_name,
      album_id: album.id,
      artist_name: artist.name,
      artist_id: artist.id,
      image_path: null,
      track_number: t.track_number,
      txt_lyrics: null,
      lrc_lyrics: null,
      lyricsfile: lf ? lf.lyricsfile : null,
      lyricsfile_id: lf ? lf.id : null,
      duration: t.duration,
      instrumental: lf ? presence(lf.lyricsfile).instrumental : false,
    }
  }

  const category = t => {
    const lf = lyricsfileForTrack(t.id)
    if (!lf) return 'none'
    const p = presence(lf.lyricsfile)
    if (p.instrumental) return 'instrumental'
    if (p.synced) return 'synced'
    if (p.plain) return 'plain'
    return 'none'
  }

  const norm = s =>
    (s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  const matches = (query, ...fields) => {
    const tokens = norm(query).split(/\s+/).filter(Boolean)
    if (!tokens.length) return true
    const words = norm(fields.join(' ')).split(/\s+/).filter(Boolean)
    return tokens.every(tok => words.some(w => w.startsWith(tok)))
  }
  const byText = f => (a, b) => f(a).localeCompare(f(b), undefined, { sensitivity: 'base' })

  const albumTracks = albumId =>
    [...db.tracks.values()]
      .filter(t => t.album_id === albumId)
      .sort((a, b) => (a.track_number ?? 999) - (b.track_number ?? 999))

  const albumObj = a => {
    const tracks = albumTracks(a.id)
    const first = tracks[0] && db.artists.get(tracks[0].artist_id)
    return {
      id: a.id,
      name: a.name,
      image_path: null,
      artist_name: a.album_artist_name || (first ? first.name : ''),
      album_artist_name: a.album_artist_name,
      tracks_count: tracks.length,
    }
  }

  const artistObj = a => ({
    id: a.id,
    name: a.name,
    tracks_count: [...db.tracks.values()].filter(t => t.artist_id === a.id).length,
  })

  const withoutFilter = (ids, args) =>
    ids.filter(t => {
      const c = category(t)
      if (args.withoutPlainLyrics && (c === 'plain' || c === 'synced' || c === 'instrumental'))
        return false
      if (args.withoutSyncedLyrics && (c === 'synced' || c === 'instrumental')) return false
      return true
    })

  // ---------- events ----------
  const callbacks = new Map()
  const listeners = new Map() // event -> [{id, handler}]
  let nextEventId = 1
  const registerCallback = (cb, once = false) => {
    const id = window.crypto.getRandomValues(new Uint32Array(1))[0]
    callbacks.set(id, data => {
      if (once) callbacks.delete(id)
      return cb && cb(data)
    })
    return id
  }
  const emit = (event, payload) => {
    for (const l of listeners.get(event) || []) {
      const cb = callbacks.get(l.handler)
      if (cb) cb({ event, id: l.id, payload })
    }
  }

  // ---------- simulated audio player ----------
  const player = {
    status: 'stopped',
    progress: 0,
    duration: 0,
    speed: 1,
    timer: null,
  }
  const playerTick = () => {
    if (player.status === 'playing') {
      player.progress += 0.1 * player.speed
      if (player.progress >= player.duration) {
        player.progress = player.duration
        player.status = 'stopped'
      }
    }
    emit('player-state', {
      status: player.status,
      progress: player.progress,
      duration: player.duration,
      volume: db.config.volume,
      playback_speed: player.speed,
    })
  }
  setInterval(playerTick, 100)

  const delay = ms => new Promise(r => setTimeout(r, ms))

  // ---------- commands ----------
  const commands = {
    get_init: () => db.init,
    get_directories: () => db.directories,
    set_directories: ({ directories }) => {
      db.directories = directories
    },
    get_config: () => ({ ...db.config }),
    set_config: args => {
      const map = {
        skipTracksWithSyncedLyrics: 'skip_tracks_with_synced_lyrics',
        skipTracksWithPlainLyrics: 'skip_tracks_with_plain_lyrics',
        showLineCount: 'show_line_count',
        tryEmbedLyrics: 'try_embed_lyrics',
        themeMode: 'theme_mode',
        lrclibInstance: 'lrclib_instance',
      }
      for (const [k, v] of Object.entries(args)) if (map[k]) db.config[map[k]] = v
    },
    set_export_preferences: args => {
      const map = {
        autoExportEnabled: 'auto_export_enabled',
        exportLrc: 'export_lrc',
        exportTxt: 'export_txt',
        exportEmbedded: 'export_embedded',
        skipTracksWithSyncedLyrics: 'skip_tracks_with_synced_lyrics',
        skipTracksWithPlainLyrics: 'skip_tracks_with_plain_lyrics',
      }
      for (const [k, v] of Object.entries(args)) if (map[k] && v != null) db.config[map[k]] = v
      return { ...db.config }
    },
    uninitialize_library: () => {
      db.init = false
    },
    scan_library: async () => runScan(false),
    full_scan_library: async () => runScan(true),
    get_tracks: () => [...db.tracks.values()].map(fullTrack),
    get_track_ids: args => {
      const want = {
        synced: args.syncedLyricsTracks ?? true,
        plain: args.plainLyricsTracks ?? true,
        instrumental: args.instrumentalTracks ?? true,
        none: args.noLyricsTracks ?? true,
      }
      const q = args.searchQuery || ''
      return [...db.tracks.values()]
        .filter(t => want[category(t)])
        .filter(t => {
          if (!q) return true
          const f = fullTrack(t)
          return matches(q, f.title, f.artist_name, f.album_name)
        })
        .sort(byText(t => t.title))
        .map(t => t.id)
    },
    get_track: ({ trackId }) => {
      const t = db.tracks.get(trackId)
      if (!t) throw 'Query returned no rows'
      return fullTrack(t)
    },
    get_track_ids_with_lyrics: () =>
      [...db.tracks.values()].filter(t => category(t) !== 'none').map(t => t.id),
    get_album_ids: ({ searchQuery }) =>
      [...db.albums.values()]
        .filter(a => !searchQuery || matches(searchQuery, a.name, albumObj(a).artist_name))
        .sort(byText(a => a.name))
        .map(a => a.id),
    get_album: ({ albumId }) => albumObj(db.albums.get(albumId)),
    get_albums: () => [...db.albums.values()].sort(byText(a => a.name)).map(albumObj),
    get_album_tracks: ({ albumId }) => albumTracks(albumId).map(fullTrack),
    get_album_track_ids: args => withoutFilter(albumTracks(args.albumId), args).map(t => t.id),
    get_artist_ids: ({ searchQuery }) =>
      [...db.artists.values()]
        .filter(a => !searchQuery || matches(searchQuery, a.name))
        .sort(byText(a => a.name))
        .map(a => a.id),
    get_artist: ({ artistId }) => artistObj(db.artists.get(artistId)),
    get_artists: () => [...db.artists.values()].sort(byText(a => a.name)).map(artistObj),
    get_artist_track_ids: args => {
      const tracks = [...db.tracks.values()]
        .filter(t => t.artist_id === args.artistId)
        .sort(
          (a, b) =>
            db.albums.get(a.album_id).name.localeCompare(db.albums.get(b.album_id).name) ||
            (a.track_number ?? 999) - (b.track_number ?? 999)
        )
      return withoutFilter(tracks, args).map(t => t.id)
    },
    get_artist_tracks: ({ artistId }) =>
      [...db.tracks.values()].filter(t => t.artist_id === artistId).map(fullTrack),

    // ----- LRCLIB (served from the seeded catalogue, no network) -----
    download_lyrics: async ({ trackId }) => {
      await delay(250 + Math.random() * 400)
      const t = fullTrack(db.tracks.get(trackId))
      const hit = [...db.lrclib.values()].find(
        r =>
          norm(r.trackName) === norm(t.title) &&
          norm(r.artistName) === norm(t.artist_name) &&
          Math.abs(r.duration - t.duration) <= 2
      )
      if (!hit) {
        throw {
          kind: 'notFound',
          message: 'This track does not exist in LRCLIB database',
          retryAfterSecs: null,
          scope: null,
        }
      }
      upsertTrackLyricsfile(trackId, hit.lyricsfile)
      emit('reload-track-id', trackId)
      if (hit.instrumental) return 'Marked track as instrumental'
      if (hit.syncedLyrics) return 'Synced lyrics downloaded'
      return 'Plain lyrics downloaded'
    },
    search_lyrics: async ({ title, artistName, albumName, q }) => {
      await delay(300)
      const query = q || [title, artistName, albumName].filter(Boolean).join(' ')
      return [...db.lrclib.values()]
        .filter(r => matches(query, r.trackName, r.artistName, r.albumName))
        .slice(0, 20)
        .map(r => ({
          id: r.id,
          trackName: r.trackName,
          artistName: r.artistName,
          albumName: r.albumName,
          duration: r.duration,
          instrumental: r.instrumental,
          hasWordSync: r.hasWordSync,
          hasPlainLyrics: !!r.plainLyrics,
          hasSyncedLyrics: !!r.syncedLyrics,
          hasLyricsfile: !!r.lyricsfile,
        }))
    },
    retrieve_lyrics_by_id: async ({ id }) => {
      await delay(150)
      const r = db.lrclib.get(id)
      if (!r) throw 'This track does not exist in LRCLIB database'
      return {
        id: r.id,
        trackName: r.trackName,
        name: r.trackName,
        artistName: r.artistName,
        albumName: r.albumName,
        duration: r.duration,
        instrumental: r.instrumental,
        hasWordSync: r.hasWordSync,
        plainLyrics: r.plainLyrics,
        syncedLyrics: r.syncedLyrics,
        lyricsfile: r.lyricsfile,
        lang: r.lang,
        isrc: null,
        spotifyId: null,
        releaseDate: null,
      }
    },
    prepare_lrclib_lyricsfile: ({ lrclibId }) => {
      const r = db.lrclib.get(lrclibId)
      let existing = [...db.lyricsfiles.values()].find(l => l.lrclib_id === lrclibId)
      const existsInDb = !!existing
      if (!existing) {
        existing = {
          id: nextLyricsfileId++,
          track_id: null,
          lrclib_id: lrclibId,
          lyricsfile: r.lyricsfile,
        }
        db.lyricsfiles.set(existing.id, existing)
      }
      return {
        lyricsfileId: existing.id,
        lyricsfile: existing.lyricsfile,
        plainLyrics: r.plainLyrics || '',
        syncedLyrics: r.syncedLyrics || '',
        isInstrumental: r.instrumental,
        existsInDb,
      }
    },
    refresh_lrclib_lyricsfile: ({ lrclibId }) => {
      const r = db.lrclib.get(lrclibId)
      const existing = [...db.lyricsfiles.values()].find(l => l.lrclib_id === lrclibId)
      existing.lyricsfile = r.lyricsfile
      return {
        lyricsfileId: existing.id,
        lyricsfile: r.lyricsfile,
        plainLyrics: r.plainLyrics || '',
        syncedLyrics: r.syncedLyrics || '',
        isInstrumental: r.instrumental,
        existsInDb: true,
      }
    },
    apply_lyrics: ({ trackId, lrclibId }) => {
      const r = db.lrclib.get(lrclibId)
      upsertTrackLyricsfile(trackId, r.lyricsfile)
      emit('reload-track-id', trackId)
      return r.syncedLyrics ? 'Synced lyrics applied' : 'Plain lyrics applied'
    },
    save_lyrics: ({ trackId, lyricsfileId, lyricsfile }) => {
      if (trackId != null) {
        upsertTrackLyricsfile(trackId, lyricsfile.trim())
        emit('reload-track-id', trackId)
      } else if (lyricsfileId != null) {
        db.lyricsfiles.get(lyricsfileId).lyricsfile = lyricsfile.trim()
      }
      return 'Lyrics saved successfully'
    },
    publish_lyrics: async () => {
      for (const [i, s] of ['Requesting challenge', 'Solving challenge', 'Publishing lyrics'].entries()) {
        emit('publish-lyrics-progress', s)
        await delay(500 + i * 300)
      }
      return null
    },
    flag_lyrics: async () => {
      for (const s of ['Requesting challenge', 'Solving challenge', 'Flagging lyrics']) {
        emit('flag-lyrics-progress', s)
        await delay(500)
      }
      return null
    },
    prepare_search_query: ({ title }) =>
      title
        .replace(/\s*[([](feat\.?|ft\.?|with|remaster(ed)?|live|demo|radio edit|\d{4} remaster)[^)\]]*[)\]]/gi, '')
        .trim(),
    get_audio_metadata: ({ filePath }) => {
      const t = [...db.tracks.values()].find(x => x.file_path === filePath)
      if (t) {
        const f = fullTrack(t)
        return {
          title: f.title,
          artist: f.artist_name,
          album: f.album_name,
          albumArtist: f.album_artist_name,
          duration: f.duration,
        }
      }
      return { title: filePath.split('/').pop().replace(/\.[^.]+$/, ''), duration: 210 }
    },
    find_matching_tracks: () => [],
    export_lyrics: ({ formats }) =>
      (formats || ['lrc']).map(f => ({ format: f, path: null, status: 'success' })),
    export_track_lyrics: async ({ trackId, formats }) => {
      await delay(80)
      const f = fullTrack(db.tracks.get(trackId))
      const base = f.file_path.replace(/\.[^.]+$/, '')
      return {
        success: true,
        exported: (formats || []).length,
        skipped: 0,
        errors: 0,
        message: `Exported ${(formats || []).length} format(s)`,
        details: (formats || []).map(fmt => ({
          format: fmt,
          status: 'success',
          path: fmt === 'embedded' ? f.file_path : `${base}.${fmt}`,
          message: null,
        })),
      }
    },
    segment_words: ({ text }) => text.match(/\S+\s*/g) || [],
    read_text_file: () => '',

    // ----- player -----
    play_track: ({ trackId, duration }) => {
      const t = trackId != null ? db.tracks.get(trackId) : null
      player.duration = t ? t.duration : duration || 0
      player.progress = 0
      player.status = 'playing'
    },
    pause_track: () => {
      player.status = 'paused'
    },
    resume_track: () => {
      player.status = 'playing'
    },
    seek_track: ({ position }) => {
      player.progress = position
    },
    stop_track: () => {
      player.status = 'stopped'
      player.progress = 0
    },
    set_volume: ({ volume }) => {
      db.config.volume = volume
    },
    set_playback_speed: ({ playbackSpeed }) => {
      player.speed = Math.min(2, Math.max(0.5, playbackSpeed))
    },
    open_devtools: () => null,
    drain_notifications: () => db.notifications.splice(0),

    // ----- tauri plugins -----
    'plugin:app|version': () => seed.appVersion,
    'plugin:app|name': () => 'LRCGET',
    'plugin:app|tauri_version': () => '2.10.1',
    'plugin:window|theme': () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    'plugin:path|resolve_directory': () => seed.directories[0],
    'plugin:os|locale': () => 'en-US',
    'plugin:os|hostname': () => 'desktop',
  }

  const upsertTrackLyricsfile = (trackId, content) => {
    let lf = lyricsfileForTrack(trackId)
    if (!lf) {
      lf = { id: nextLyricsfileId++, track_id: trackId, lrclib_id: null, lyricsfile: content }
      db.lyricsfiles.set(lf.id, lf)
    } else {
      lf.lyricsfile = content
    }
  }

  const runScan = async full => {
    const total = db.tracks.size
    const start = Date.now()
    for (let i = 0; i <= 10; i++) {
      await delay(120)
      emit('scan-progress', {
        phase: i < 3 ? 'discovering' : 'updating',
        progress: i / 10,
        filesProcessed: Math.round((total * i) / 10),
        filesTotal: total,
        message: i < 3 ? 'Discovering audio files...' : `Processing ${Math.round((total * i) / 10)} of ${total} files`,
      })
    }
    db.init = true
    const result = {
      totalFiles: total,
      added: full ? 0 : 3,
      modified: full ? 0 : 1,
      deleted: 0,
      moved: 0,
      unchanged: full ? total : total - 4,
      isInitialScan: false,
      durationMs: Date.now() - start,
    }
    emit('scan-complete', result)
    return result
  }

  window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {}
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = window.__TAURI_EVENT_PLUGIN_INTERNALS__ || {}
  window.__TAURI_OS_PLUGIN_INTERNALS__ = {
    eol: '\n',
    platform: 'linux',
    version: '6.8.0',
    family: 'unix',
    os_type: 'linux',
    arch: 'x86_64',
    exe_extension: '',
  }

  Object.assign(window.__TAURI_INTERNALS__, {
    metadata: {
      currentWindow: { label: 'main' },
      currentWebview: { windowLabel: 'main', label: 'main' },
    },
    transformCallback: registerCallback,
    unregisterCallback: id => callbacks.delete(id),
    runCallback: (id, data) => callbacks.get(id)?.(data),
    callbacks,
    convertFileSrc: (p, protocol = 'asset') => `${protocol}://localhost/${encodeURIComponent(p)}`,
    invoke: async (cmd, args = {}) => {
      if (cmd === 'plugin:event|listen') {
        const id = nextEventId++
        if (!listeners.has(args.event)) listeners.set(args.event, [])
        listeners.get(args.event).push({ id, handler: args.handler })
        return id
      }
      if (cmd === 'plugin:event|unlisten') {
        const arr = listeners.get(args.event) || []
        listeners.set(
          args.event,
          arr.filter(l => l.id !== args.eventId)
        )
        return null
      }
      if (cmd === 'plugin:event|emit' || cmd === 'plugin:event|emit_to') {
        emit(args.event, args.payload)
        return null
      }
      if (cmd.startsWith('plugin:window|') || cmd.startsWith('plugin:webview|')) {
        if (commands[cmd]) return commands[cmd](args)
        return null
      }
      if (cmd.startsWith('plugin:global-shortcut|') || cmd.startsWith('plugin:clipboard-manager|'))
        return null
      const handler = commands[cmd]
      if (!handler) {
        console.warn('[stub] unhandled command', cmd, args)
        throw `Command ${cmd} not found`
      }
      return handler(args)
    },
  })
  window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener = (event, id) => {
    const arr = listeners.get(event) || []
    listeners.set(
      event,
      arr.filter(l => l.id !== id)
    )
  }
})()
