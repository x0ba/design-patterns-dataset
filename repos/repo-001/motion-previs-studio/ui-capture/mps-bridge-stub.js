/*
 * Browser stand-in for electron/preload.cjs (window.motionPrevis).
 *
 * In the desktop app this bridge talks to the Electron main process (ffmpeg,
 * yt-dlp, the file system, the Blockout sibling app and the MCP control
 * server). In the browser capture build there is no main process, so this
 * script answers the same IPC surface locally:
 *   - media/import calls return clips from ./media/library.json
 *   - analysis:prepare returns control passes pre-rendered by
 *     .ui-capture/build-media.mjs with the exact ffmpeg filters main.cjs uses
 *   - the frame encoder / export bundle calls return realistic bundle paths
 *   - project sessions persist to localStorage
 *   - Blockout status reports the sibling app as running
 *   - an MCP agent session is replayed over the control:invoke channel
 *     (import last project clip -> set range -> run analysis -> export pack),
 *     so the renderer performs real MediaPipe pose + camera analysis on load.
 * Loaded before the app bundle; no UI code is modified.
 */
(function () {
  'use strict';

  const base = new URL('./', document.baseURI).href;
  const mediaUrl = (rel) => new URL(`media/${rel}`, base).href;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const params = new URLSearchParams(location.search);
  const libraryPromise = fetch(mediaUrl('library.json')).then((r) => r.json());

  const SESSION_KEY = 'mps.session.v4';
  let controlListener = null;
  const pendingControl = new Map();
  let openMediaCursor = 0;
  const encodeSessions = new Map();

  function clipByPath(lib, filePath) {
    return lib.clips.find((c) => c.filePath === filePath) || null;
  }

  // Electron serves workspace media in-process via the mps:// protocol. Mirror
  // that: download each file completely once, then hand the renderer an
  // in-memory blob: URL. The renderer swaps/tears down <video> sources a lot
  // (source -> trimmed reference, analysis cleanup sets src=''), which would
  // otherwise abort half-finished HTTP downloads.
  const MIME = { mp4: 'video/mp4', jpg: 'image/jpeg', png: 'image/png' };
  const blobCache = new Map();
  function localMedia(rel) {
    if (!blobCache.has(rel)) {
      const type = MIME[rel.split('.').pop()] || 'application/octet-stream';
      blobCache.set(
        rel,
        fetch(mediaUrl(rel))
          .then((r) => {
            if (!r.ok) throw new Error(`Media file is missing: ${rel}`);
            return r.arrayBuffer();
          })
          .then((buf) => URL.createObjectURL(new Blob([buf], { type })))
          .catch((err) => {
            blobCache.delete(rel);
            throw err;
          })
      );
    }
    return blobCache.get(rel);
  }

  async function mediaInfo(clip) {
    return {
      filePath: clip.filePath,
      url: await localMedia(`${clip.key}/source.mp4`),
      name: clip.name,
      duration: clip.duration,
      width: clip.width,
      height: clip.height,
      frameRate: clip.frameRate,
      videoCodec: clip.videoCodec,
      audioCodec: clip.audioCodec,
      sizeBytes: clip.sizeBytes
    };
  }

  function analysisDir(lib, clip) {
    return `${lib.user.workspace}/analyses/${clip.analysisId}`;
  }

  async function manifestFor(lib, clip) {
    const dir = analysisDir(lib, clip);
    const files = ['reference.mp4', 'depth.mp4', 'edges.mp4', 'lineart.mp4', 'motion_mask.mp4', 'normals_proxy.mp4', 'animatic.mp4', 'contact_sheet.jpg', 'preview.jpg'];
    const urls = {};
    await Promise.all(
      files.map(async (f) => {
        urls[f] = await localMedia(`${clip.key}/analyses/${clip.analysisId}/${f}`);
      })
    );
    const rel = (f) => urls[f];
    const a = clip.analysis;
    return {
      analysisId: clip.analysisId,
      createdAt: a.createdAt,
      sourcePath: clip.filePath,
      sourceName: clip.name,
      range: { start: a.start, end: a.end, duration: +(a.end - a.start).toFixed(3) },
      sampleFps: a.fps,
      outputDir: dir,
      referencePath: `${dir}/reference.mp4`,
      referenceUrl: rel('reference.mp4'),
      depthPath: `${dir}/depth.mp4`,
      depthUrl: rel('depth.mp4'),
      edgesPath: `${dir}/edges.mp4`,
      edgesUrl: rel('edges.mp4'),
      lineartPath: `${dir}/lineart.mp4`,
      lineartUrl: rel('lineart.mp4'),
      motionMaskPath: `${dir}/motion_mask.mp4`,
      motionMaskUrl: rel('motion_mask.mp4'),
      normalsPath: `${dir}/normals_proxy.mp4`,
      normalsUrl: rel('normals_proxy.mp4'),
      animaticPath: `${dir}/animatic.mp4`,
      animaticUrl: rel('animatic.mp4'),
      contactSheetPath: `${dir}/contact_sheet.jpg`,
      contactSheetUrl: rel('contact_sheet.jpg'),
      previewPath: `${dir}/preview.jpg`,
      previewUrl: rel('preview.jpg'),
      frameSize: clip.referenceSize,
      status: 'prepared'
    };
  }

  function storedSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  const api = {
    async openMedia() {
      const lib = await libraryPromise;
      const local = lib.clips.filter((c) => !c.web);
      const clip = local[(openMediaCursor += 1) % local.length];
      await sleep(250);
      return await mediaInfo(clip);
    },
    async importPath(sourcePath) {
      const lib = await libraryPromise;
      const clip = clipByPath(lib, sourcePath);
      if (!clip) throw new Error('Source file is missing or outside the allowed folders.');
      await sleep(200);
      return await mediaInfo(clip);
    },
    async importUrl(url) {
      const lib = await libraryPromise;
      if (!/^https?:\/\//i.test(String(url))) throw new Error('Only http(s) video URLs can be imported.');
      await sleep(2600); // yt-dlp download
      return await mediaInfo(lib.clips.find((c) => c.web) || lib.clips[0]);
    },
    async prepareAnalysis(payload) {
      const lib = await libraryPromise;
      const clip = clipByPath(lib, payload.sourcePath);
      if (!clip) throw new Error('Source media is missing or outside the app workspace and imported sources.');
      await sleep(1400); // ffmpeg trim + control passes
      return await manifestFor(lib, clip);
    },
    async savePoseArtifacts(payload) {
      await sleep(900); // bundle write + zip
      const dir = payload.outputDir;
      const f = (name) => `${dir}/${name}`;
      return {
        outputDir: dir,
        zipPath: `${dir}.zip`,
        manifestPath: f('bundle_manifest.json'),
        files: {
          poseJson: f('pose_landmarks.json'),
          cameraMotionJson: payload.cameraMotionData ? f('camera_motion.json') : null,
          poseWebm: null,
          poseMp4: f('pose_high_contrast.mp4'),
          openPosePose: payload.openPoseVideoBuffer ? f('openpose_pose.mp4') : null,
          openPoseKeypoints: payload.openPoseKeypoints ? f('openpose_keypoints.json') : null,
          aiDepthWebm: null,
          aiDepthMp4: payload.aiDepthVideoBuffer ? f('ai_depth.mp4') : null,
          combined: f('combined_reference_depth_pose.mp4'),
          blenderScript: f('blender_import_pose.py'),
          blenderCameraScript: f('blender_import_camera.py'),
          blenderSceneScript: f('blender_import_scene.py'),
          comfyManifest: f('comfyui_manifest.json'),
          seedancePrompt: f('seedance_prompt.md'),
          promptPack: f('prompt_pack.md'),
          shotBible: f('shot_bible.json'),
          qualityReport: f('quality_report.json'),
          modelPresets: f('model_presets.json'),
          controlLayersManifest: f('control_layers_manifest.json'),
          reference: payload.referencePath,
          depth: payload.depthPath,
          edges: payload.edgesPath || null,
          lineart: payload.lineartPath || null,
          motionMask: payload.motionMaskPath || null,
          normalsProxy: payload.normalsPath || null,
          contactSheet: payload.contactSheetPath || null,
          animatic: payload.animaticPath || null
        }
      };
    },
    async encodeFramesBegin(payload) {
      const sessionId = `enc-${Date.now().toString(36)}-${encodeSessions.size + 1}`;
      encodeSessions.set(sessionId, { frames: 0, bytes: 0, ...payload });
      return { sessionId };
    },
    async encodeFramesFrame({ sessionId, buffer }) {
      const s = encodeSessions.get(sessionId);
      if (!s) throw new Error('Unknown encode session.');
      s.frames += 1;
      s.bytes += buffer?.byteLength || 0;
      return { frames: s.frames };
    },
    async encodeFramesEnd({ sessionId }) {
      const s = encodeSessions.get(sessionId);
      encodeSessions.delete(sessionId);
      // ffmpeg's H.264 output is ~6% of the PNG stream for these flat renders.
      return { buffer: new ArrayBuffer(Math.max(4096, Math.round((s?.bytes || 0) * 0.06))), frames: s?.frames || 0 };
    },
    async encodeFramesCancel({ sessionId }) {
      return { cancelled: encodeSessions.delete(sessionId) };
    },
    async cancelAnalysis() {
      return { cancelled: 0 };
    },
    async openPath(targetPath) {
      return '';
    },
    async revealPath() {},
    async openExternal() {},
    async getVersions() {
      const lib = await libraryPromise;
      return {
        electron: '43.1.0',
        chrome: '146.0.7680.72',
        node: '24.11.1',
        app: '4.1.0',
        ffmpeg: '/Applications/Motion Previs Studio v4.app/Contents/Resources/bin/ffmpeg',
        ffprobe: '/Applications/Motion Previs Studio v4.app/Contents/Resources/bin/ffprobe',
        workspace: lib.user.workspace,
        platform: 'darwin',
        displayName: 'Motion Previs Studio v4',
        appId: 'studio.motionprevis.app.v4',
        isCommunityBuild: 'false',
        maintainer: '',
        configFile: `${lib.user.home}/.config/motion-previs/control.json`
      };
    },
    async getAppInfo() {
      return {
        platform: 'darwin',
        appId: 'studio.motionprevis.app.v4',
        displayName: 'Motion Previs Studio v4',
        version: '4.1.0',
        isCommunityBuild: false,
        maintainer: null
      };
    },
    async saveSession(session) {
      const lib = await libraryPromise;
      const clean = { version: '4.1.0', savedAt: new Date().toISOString(), ...session };
      localStorage.setItem(SESSION_KEY, JSON.stringify(clean));
      return { saved: true, path: `${lib.user.workspace}/session.json` };
    },
    async loadSession() {
      const lib = await libraryPromise;
      const seeded = lib.session;
      const clip = lib.clips.find((c) => c.key === seeded.clip);
      if (params.has('fresh')) return null; // first-launch view: no session.json yet
      const stored = storedSession();
      const session = stored || {
        version: seeded.version,
        savedAt: seeded.savedAt,
        sourcePath: clip.filePath,
        sourceName: clip.name,
        range: { start: clip.analysis.start, end: clip.analysis.end },
        sampleFps: seeded.sampleFps,
        subjectMode: seeded.subjectMode,
        poseSettings: seeded.poseSettings,
        useCameraMove: seeded.useCameraMove,
        selectedLayers: seeded.selectedLayers,
        exportPresets: seeded.exportPresets,
        resolution: seeded.resolution,
        planning: seeded.planning,
        lastBundlePath: `${lib.user.workspace}/analyses/${clip.analysisId}`
      };
      session.sourceUrl = await localMedia(`${(clipByPath(lib, session.sourcePath) || clip).key}/source.mp4`);
      session.sourceExists = Boolean(clipByPath(lib, session.sourcePath));
      if (autoReplay) {
        // The replayed agent session re-opens this clip itself, so main's
        // "restore last project?" prompt would be redundant: hand back the
        // settings only.
        replaySession = { ...session };
        return { ...session, sourcePath: null };
      }
      return session;
    },
    async sendToBlockout(payload) {
      await sleep(350);
      return { ok: true, mode: payload.mode || 'ghost', opacity: payload.opacity ?? 0.5, handoffVersion: 1, result: { accepted: true } };
    },
    async blockoutStatus() {
      return { available: true };
    },
    onControlInvoke(cb) {
      controlListener = cb;
      return () => {
        if (controlListener === cb) controlListener = null;
      };
    },
    controlResult(id, result) {
      const pending = pendingControl.get(id);
      if (pending) {
        pendingControl.delete(id);
        pending(result);
      }
    }
  };

  // ---- Replayed MCP agent session (control:invoke channel) -----------------
  const autoReplay = !params.has('fresh') && !params.has('noagent');
  let replaySession = null;
  let controlSeq = 0;

  function invoke(action, actionParams = {}) {
    if (!controlListener) return Promise.reject(new Error('control handler not registered'));
    const id = `stub-${(controlSeq += 1)}`;
    return new Promise((resolve, reject) => {
      pendingControl.set(id, (result) => (result.ok ? resolve(result.data) : reject(new Error(result.error))));
      controlListener(id, action, actionParams);
    });
  }

  async function replay() {
    for (let i = 0; i < 100 && (!replaySession || !controlListener || !window.__mps); i += 1) await sleep(100);
    if (!replaySession || !controlListener) return;
    await sleep(400);
    const s = replaySession;
    await invoke('import_file', { path: s.sourcePath });
    await sleep(300);
    if (s.range) await invoke('set_range', { startS: s.range.start, endS: s.range.end });
    await sleep(300);
    await invoke('run_analysis');
    for (let i = 0; i < 900; i += 1) {
      await sleep(400);
      const state = await invoke('get_state');
      if (state.analysis.status === 'done') break;
      if (state.analysis.status === 'error') return;
    }
    if (params.has('noexport')) return;
    await sleep(600);
    await invoke('export_pack');
  }

  window.motionPrevis = api;
  if (autoReplay) replay().catch((err) => console.warn('[mps-stub] agent replay stopped:', err));
})();
