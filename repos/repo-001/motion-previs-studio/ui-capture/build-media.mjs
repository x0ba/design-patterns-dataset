// Pre-renders the per-clip analysis passes that the Electron main process
// (electron/main.cjs prepareAnalysis) would produce with ffmpeg, using the same
// filters, so the browser bridge stub can hand the renderer real files.
// Output: .ui-capture/media/<clipKey>/{source.mp4, analyses/<id>/...}
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const lib = JSON.parse(fs.readFileSync(path.join(here, 'library.json'), 'utf8'));
const ff = process.env.FFMPEG || 'ffmpeg';
const srcDir = path.join(here, 'media-src');
const outRoot = path.join(here, 'media');
const force = process.argv.includes('--force');

const run = (args) => execFileSync(ff, ['-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const enc = ['-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
const safeName = (s) => String(s).replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60);

export function analysisIdFor(clip) {
  return `${Date.parse(clip.analysis.createdAt)}-${safeName(clip.name)}`;
}

for (const clip of lib.clips) {
  const dir = path.join(outRoot, clip.key);
  const id = analysisIdFor(clip);
  const adir = path.join(dir, 'analyses', id);
  if (!force && fs.existsSync(path.join(adir, 'preview.jpg'))) {
    console.log(`[media] ${clip.key} up to date`);
    continue;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(adir, { recursive: true });
  const input = path.join(srcDir, clip.src);
  // Source as imported (browser-playable H.264 copy, faststart).
  run(['-y', '-i', input, '-c', 'copy', '-movflags', '+faststart', path.join(dir, 'source.mp4')]);

  const { start, end, fps } = clip.analysis;
  const landscape = clip.width >= clip.height;
  // Session uses 720p (Seedance) export resolution.
  const referenceScale = landscape ? 'scale=-2:720' : 'scale=720:-2';
  const depthScale = referenceScale;
  const ref = path.join(adir, 'reference.mp4');
  run(['-y', '-ss', String(start), '-t', String(end - start), '-i', input, '-map', '0:v:0', '-vf', referenceScale, ...enc, ref]);
  const ctl = (out, filter, inFile = ref) => run(['-y', '-i', inFile, '-vf', filter, '-r', String(fps), ...enc, path.join(adir, out)]);
  ctl('depth.mp4', `fps=${fps},${depthScale},format=gray,eq=contrast=1.45:brightness=0.03,boxblur=2:1`);
  ctl('edges.mp4', `fps=${fps},${depthScale},edgedetect=low=0.08:high=0.28,format=gray,eq=contrast=1.35`);
  ctl('lineart.mp4', `fps=${fps},${depthScale},format=gray,sobel,negate,eq=contrast=1.2`);
  ctl('motion_mask.mp4', `fps=${fps},${depthScale},tblend=all_mode=difference,format=gray,eq=contrast=3.2:brightness=0.02,boxblur=1:1`);
  ctl('normals_proxy.mp4', `fps=${fps},format=gray,sobel,eq=contrast=1.7`, path.join(adir, 'depth.mp4'));
  run(['-y', '-i', ref, '-vf', 'fps=1,scale=240:-2,tile=5x2', '-frames:v', '1', path.join(adir, 'contact_sheet.jpg')]);
  run(['-y', '-i', ref, '-vf', 'fps=2,scale=960:-2,setpts=1.4*PTS', ...enc.map((v) => (v === '18' ? '20' : v)), path.join(adir, 'animatic.mp4')]);
  run(['-y', '-ss', '0', '-i', ref, '-frames:v', '1', '-q:v', '3', path.join(adir, 'preview.jpg')]);
  console.log(`[media] built ${clip.key} -> ${id}`);
}

// Enriched library for the bridge stub (durations, sizes, analysis ids).
function probeDuration(file) {
  try {
    execFileSync(ff, ['-hide_banner', '-i', file], { stdio: 'pipe' });
  } catch (err) {
    const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(String(err.stderr));
    if (m) return +(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])).toFixed(3);
  }
  return 0;
}
const enriched = {
  ...lib,
  clips: lib.clips.map((clip) => {
    const src = path.join(outRoot, clip.key, 'source.mp4');
    const h = 720;
    const w = Math.round((clip.width / clip.height) * h / 2) * 2;
    return {
      ...clip,
      duration: probeDuration(src),
      sizeBytes: fs.statSync(path.join(srcDir, clip.src)).size,
      analysisId: analysisIdFor(clip),
      referenceSize: { width: w, height: h }
    };
  })
};
fs.writeFileSync(path.join(outRoot, 'library.json'), JSON.stringify(enriched, null, 2));
console.log('[media] wrote media/library.json');
