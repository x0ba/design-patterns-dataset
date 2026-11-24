// Generates the seed for an established Image Cockpit user (indie dev building
// "Hollowmere", a top-down pixel-art action RPG), working since early July 2026.
//  - .ui-capture/seed-web/seed-state.json : browser local state (history/frames/actions)
//    written into the app's IndexedDB schema by seed-bootstrap.js on first visit.
//  - .ui-capture/data/codex-handoff/      : server-side handoff folders (inbox jobs,
//    runner status, logs, outbox PNGs) exactly as the app's API writes them.
// Usage: node .ui-capture/gen-seed.mjs
import { copyFileSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const handoff = join(root, ".ui-capture/data/codex-handoff");
const seedWeb = join(root, ".ui-capture/seed-web");
const examples = join(root, "public/prompt-examples");

let rng = 20261117;
const rand = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
const suffix = () => Array.from({ length: 6 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(rand() * 36)]).join("");
const jobIdAt = (iso) => `codex-job-${iso.replace(/[:.]/g, "-")}-${suffix()}`;

const STYLE = "crisp 32-bit fantasy RPG pixel-art rendering, transparent background preferred, no scenery, no readable text, no logo, no watermark";
const NEG = "blur, text, watermark, logo, cropped body, cut off feet, extra limbs, scenery, floor shadow, photorealistic, 3d render, vector art";

// Newest first. Local (US Pacific) wall-clock times.
const entries = [
  { at: "2026-11-16T22:41:09-08:00", kind: "gen", file: "profession-young-female-witch.png", adopted: true,
    prompt: `Create a single full-body pixel-art character: Maren, the Hollowmere swamp witch NPC, young woman with wide-brimmed violet hat, dark laced dress, potion flask in one hand and an old broom, calm knowing smile, idle-animation-ready front pose, ${STYLE}.` },
  { at: "2026-11-16T22:18:47-08:00", kind: "gen", file: "profession-young-female-witch.png",
    prompt: "Maren the swamp witch, same outfit, try a darker robe and a bigger potion glow. keep the hat silhouette readable at 64px" },
  { at: "2026-11-14T13:05:22-08:00", kind: "anim", sheet: "victory-cheer-sheet.png", action: "victory-cheer", from: "basic-young-female-hero.png",
    prompt: "Victory Cheer preset: Sera raises her sword overhead, scarf flutter, 8 frames x 5 directions, feet planted, clean frames for the boss-clear screen." },
  { at: "2026-11-12T20:33:51-08:00", kind: "gen", file: "monster-treasure-mimic.png", adopted: true,
    prompt: `Create a single full-body pixel-art monster asset: a treasure chest mimic for Hollowmere's sunken vault, iron-banded oak lid, purple tongue, rows of tiny teeth, gold coins spilling, centered idle pose, ${STYLE}.` },
  { at: "2026-11-12T20:11:02-08:00", kind: "gen", file: "monster-floating-eye-monster.png",
    prompt: "floating eye sentinel for the vault floor 3, single big iris, small bat wings, hovering, readable silhouette, transparent bg" },
  { at: "2026-11-09T09:47:30-08:00", kind: "edit", file: "monster-ember-slime.png", editOf: "monster-classic-green-slime.png",
    prompt: "Region 1: recolor body to ember orange with glowing core. Region 2: add charcoal feet. Keep same size and silhouette as the green slime so hitboxes match." },
  { at: "2026-10-05T20:58:10-08:00", kind: "gen", file: "monster-classic-green-slime.png", adopted: true,
    prompt: `Create a single full-body pixel-art monster asset: a classic small green slime for the Hollowmere marsh, glossy rounded body, simple cute face, tiny wobble shape, centered idle pose, ${STYLE}. If transparency is unavailable, use flat #ff00ff chroma key.` },
  { at: "2026-11-03T18:22:40-08:00", kind: "gen", file: "monster-skeleton-soldier.png",
    prompt: `Create a single full-body pixel-art monster asset: skeleton soldier of the drowned garrison, rusted round shield, chipped short sword, faint teal eye glow, ${STYLE}.` },
  { at: "2026-11-03T18:04:16-08:00", kind: "import", file: "monster-patchwork-zombie.png", name: "drowned_garrison_zombie_ref_v2.png", prompt: "" },
  { at: "2026-10-27T23:58:03-08:00", kind: "gen", file: "profession-middle-aged-male-chef.png",
    prompt: "tavern cook NPC for the Lantern Inn, big belly apron, ladle, cheerful moustache. same proportions as Rowan, full body" },
  { at: "2026-10-22T16:40:12-08:00", kind: "anim", sheet: "death-downed-sheet.png", action: "death-downed", from: "basic-young-male-hero.png",
    prompt: "Death / Downed preset: Rowan staggers, drops to one knee and collapses, sword stays in hand, 8 frames x 5 directions, one-shot, heavy weight." },
  { at: "2026-10-19T11:12:55-08:00", kind: "gen", file: "profession-young-male-blacksmith.png", adopted: true,
    prompt: `Create a single full-body pixel-art character: Dain, the Hollowmere blacksmith, young man with soot-smudged leather apron, heavy hammer on shoulder, rolled sleeves, confident grin, ${STYLE}.` },
  { at: "2026-10-08T21:30:44-08:00", kind: "anim", sheet: "hurt-reaction-sheet.png", action: "hurt-reaction", from: "basic-young-male-hero.png",
    prompt: "Hurt Reaction preset: Rowan flinches back from a hit, cape whips forward, recovers to guard stance, 8 frames x 5 directions, normal intensity." },
  { at: "2026-10-05T21:30:44-08:00", kind: "edit", file: "monster-blue-water-slime.png", editOf: "monster-classic-green-slime.png",
    prompt: "Region 1: make the body translucent blue water with a small wave crest on top. Do not change the eyes. Water variant for the flooded cellar." },
  { at: "2026-10-02T10:15:09-08:00", kind: "anim", sheet: "skill-release-sheet.png", action: "skill-release", from: "forest-mage-idle.png",
    prompt: "Skill Release preset: Wren raises the leaf staff and releases a green thorn burst, 8 frames x 5 directions, strong intensity, staff weapon class, vfx normal." },
  { at: "2026-09-30T14:02:19-08:00", kind: "anim", sheet: "basic-attack-sheet.png", action: "basic-attack", from: "basic-young-male-hero.png",
    prompt: "Basic Attack preset: Rowan one-handed horizontal slash with spark on contact, 8 frames x 5 directions, fast tempo, sword." },
  { at: "2026-09-24T19:16:27-08:00", kind: "gen", file: "monster-goblin-scout.png", adopted: true,
    prompt: `Create a single full-body pixel-art monster asset: a small goblin scout of the reedfen tribe, patched leather vest, tiny dagger, big ears, sly grin, clear feet contact, ${STYLE}. Use #ff00ff chroma key if needed because the goblin is green.` },
  { at: "2026-09-24T18:58:03-08:00", kind: "gen", file: "monster-kobold-miner.png",
    prompt: "kobold miner w/ headlamp and pickaxe, for the quarry level. keep it small, about 0.8x Rowan height" },
  { at: "2026-09-11T08:44:50-08:00", kind: "gen", file: "forest-mage-idle.png", adopted: true,
    prompt: `Create a single full-body pixel-art character: Wren, forest mage party member, small girl in a big leafy green hood and cloak, crystal-topped wooden staff, shy expression, idle-animation-ready pose, ${STYLE}.` },
  { at: "2026-09-02T22:31:12-08:00", kind: "gen", file: "basic-young-female-hero.png", adopted: true,
    prompt: `Create a single full-body pixel-art character: Sera, Rowan's rival-turned-ally, young swordswoman with auburn ponytail, red scarf, light silver armor, short sword, confident stance, full body with both feet visible, ${STYLE}.` },
  { at: "2026-09-02T22:05:31-08:00", kind: "import", file: "basic-girl-adventurer.png", name: "sera_concept_final_FINAL.png", prompt: "" },
  { at: "2026-08-21T17:26:09-08:00", kind: "gen", file: "monster-young-wyvern.png", adopted: true,
    prompt: `Create a single full-body pixel-art monster asset: young wyvern miniboss for the cliffs, slate-blue scales, folded leathery wings, curled tail, fierce but small, ${STYLE}.` },
  { at: "2026-08-21T16:59:44-08:00", kind: "gen", file: "monster-harpy-fledgling.png",
    prompt: "harpy fledgling, fluffy grey wings, talons, cliffside enemy. second try - first one had cropped wings" },
  { at: "2026-08-03T20:48:26-08:00", kind: "anim", sheet: "spell-cast-sheet.png", action: "spell-cast", from: "basic-elder-male-sage.png",
    prompt: "Spell Cast preset: Elder Bram lifts his staff and channels a light spell, robe sway, 8 frames x 5 directions, slow tempo, staff." },
  { at: "2026-07-29T13:20:05-08:00", kind: "gen", file: "basic-young-male-hero.png", adopted: true,
    prompt: `Create a single full-body pixel-art character: Rowan, the Hollowmere hero, young swordsman with spiky brown hair, long blue scarf and cape, light plate armor over tan clothes, longsword lowered, full body, idle-animation-ready front pose, clear feet contact, ${STYLE}.` },
  { at: "2026-07-29T12:55:48-08:00", kind: "gen", file: "basic-boy-adventurer.png",
    prompt: "Rowan v1 - boy adventurer with backpack and short sword. (too young/casual, needs armor + blue cape for the hero read)" },
  { at: "2026-07-21T10:08:33-08:00", kind: "gen", file: "basic-elder-male-sage.png", adopted: true,
    prompt: `Create a single full-body pixel-art character: Elder Bram, village sage who gives Rowan the first quest, long white beard, layered grey-blue robes, gnarled walking staff, ${STYLE}.` },
  { at: "2026-07-14T21:41:17-08:00", kind: "gen", file: "animal-fox.png",
    prompt: "small red fox critter for the forest ambient spawns, sitting pose, fluffy tail, transparent background" },
  { at: "2026-07-09T19:03:28-08:00", kind: "gen", file: "monster-tiny-mushroom-monster.png",
    prompt: "tiny mushroom monster, spotted red cap, stubby feet, first enemy of the tutorial forest" },
  { at: "2026-07-08T23:15:00-08:00", kind: "import", file: "rainy-neon-forest-tile.png", name: "mood_forest_tile_test.png", prompt: "" }
];

const toIso = (s) => new Date(s).toISOString();
const sizeOf = (file) => (file.endsWith("-sheet.png") ? "2048x1280" : "1254x1254");

rmSync(handoff, { recursive: true, force: true });
for (const d of ["inbox", "outbox", "outbox/.staging", "outbox/.tournaments", "assets", "status", "logs"]) mkdirSync(join(handoff, d), { recursive: true });
mkdirSync(seedWeb, { recursive: true });

const history = [];
const frameSheets = [];
const byFile = new Map();
const setTimes = (path, iso) => { const t = new Date(iso); utimesSync(path, t, t); };

function writeJob({ id, createdAt, workflowMode, prompt, notes, selected, finishedAt, outputName }) {
  const job = {
    id, createdAt, kind: "image-cockpit.codex-handoff", workflowMode,
    intent: workflowMode === "image-edit" ? "Edit the selected image according to annotations and comments" : "Generate pixel art from the prompt",
    prompt, negativePrompt: NEG, jobNotes: notes ?? "",
    generationHints: { seed: "", size: "1024x1024", count: 1, quality: "auto" },
    selectedImage: selected ?? { name: "", size: "", source: "", assetPath: "", fingerprint: "", mimeType: "", originalSource: "" },
    annotationContext: { annotations: [], annotationCount: 0, coordinateSpace: "Image Cockpit canvas coordinates plus source image normalized and pixel rectangles", canvasSize: { width: 920, height: 520 } },
    spriteContext: { action: "", frames: 0, grid: null, cell: null, chromaKey: "", variant: "", directions: [] },
    effectContext: null,
    returnTo: { outboxDir: join(handoff, "outbox"), expected: ["png", "webp", "gif", "json"] },
    notes: ["This app does not call OpenAI APIs directly.", "Codex or the user should perform generation/editing externally and place results in the outbox or import them through the UI."]
  };
  const jobPath = join(handoff, "inbox", `${id}.json`);
  writeFileSync(jobPath, JSON.stringify(job, null, 2));
  setTimes(jobPath, createdAt);
  const statusPath = join(handoff, "status", `${id}.json`);
  const logPath = join(handoff, "logs", `${id}.log`);
  const status = outputName
    ? { jobId: id, state: "completed", message: `codex exec completed for ${id}`, command: "codex", requestedCommand: "codex", startedAt: createdAt, initialStartedAt: createdAt, resumeCount: 0, finishedAt, exitCode: 0, signal: null, logPath, statusPath, outboxDir: join(handoff, "outbox") }
    : { jobId: id, state: "failed", message: "Codex returned a blocker sidecar instead of an image.", command: "codex", requestedCommand: "codex", startedAt: createdAt, initialStartedAt: createdAt, resumeCount: 0, finishedAt, exitCode: 0, signal: null, logPath, statusPath, outboxDir: join(handoff, "outbox"),
        diagnostic: { kind: "policy_or_safety", title: "Image generation blocked", userMessage: "The image request was declined by the image generation safety check.", suggestion: "Rephrase the prompt without gore and retry." } };
  writeFileSync(statusPath, JSON.stringify(status, null, 2));
  setTimes(statusPath, finishedAt);
  const tokens = 14000 + Math.floor(rand() * 9000);
  writeFileSync(logPath, [
    `[${createdAt}] Starting codex exec for ${id}`,
    `Job path: ${jobPath}`,
    `Outbox: ${join(handoff, "outbox")}`,
    "",
    `[${createdAt}] codex exec: reading ${jobPath}`,
    `workflowMode=${workflowMode}`,
    `[${createdAt}] imagegen: invoking built-in image_gen`,
    outputName ? `[${finishedAt}] image_gen returned 1 image -> ${join(handoff, "outbox", outputName)}` : `[${finishedAt}] image_gen blocked: policy_or_safety; wrote blocker sidecar`,
    `[${finishedAt}] tokens used: ${tokens.toLocaleString("en-US")}`,
    `[${finishedAt}] codex exec exited with code 0`,
    ""
  ].join("\n"));
  setTimes(logPath, finishedAt);
}

let heroId = "";
// Chronological order so edits can reference their earlier source items.
[...entries].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).forEach((e) => {
  const createdAt = toIso(e.at);
  const finishedAt = new Date(Date.parse(createdAt) + (70 + Math.floor(rand() * 160)) * 1000).toISOString();
  const histId = `hist-${Date.parse(createdAt).toString(36)}-${suffix()}`;
  if (e.hero) heroId = histId;
  const base = { id: histId, prompt: e.prompt, seed: "", createdAt, adopted: Boolean(e.adopted) };
  if (e.kind === "import") {
    history.push({ ...base, name: e.name, imageUrl: `/prompt-examples/${e.file}`, provider: "local-file", size: sizeOf(e.file), source: "import" });
  } else if (e.kind === "gen" || e.kind === "edit") {
    const id = jobIdAt(createdAt);
    const name = `${id}.png`;
    const outPath = join(handoff, "outbox", name);
    copyFileSync(join(examples, e.file), outPath);
    setTimes(outPath, finishedAt);
    let selected;
    let derived = {};
    if (e.kind === "edit") {
      const src = byFile.get(e.editOf);
      const assetPath = join(handoff, "assets", `${id}-source.png`);
      copyFileSync(join(examples, e.editOf), assetPath);
      selected = { name: src?.name ?? e.editOf, size: "1254x1254", source: "inbox", assetPath, fingerprint: `sha256:${suffix()}${suffix()}${suffix()}`, mimeType: "image/png", originalSource: "data-url" };
      derived = { derivedFromId: src?.id, derivedFromName: src?.name };
    }
    writeJob({ id, createdAt, workflowMode: e.kind === "edit" ? "image-edit" : "image-generate", prompt: e.prompt, selected, finishedAt, outputName: name });
    history.push({
      ...base, name, imageUrl: `/prompt-examples/${e.file}`, provider: "local-inbox", size: "1254x1254", source: "inbox", ...derived,
      outboxImportKey: e.kind === "edit" ? `image-edit:${id}:${name}` : `single:${name}`
    });
    if (!byFile.has(e.file)) byFile.set(e.file, history[history.length - 1]);
  }
});
// Second pass: animation results derive from the hero source item.
entries.forEach((e) => {
  if (e.kind !== "anim") return;
  const createdAt = toIso(e.at);
  const id = jobIdAt(createdAt);
  const histId = `hist-${Date.parse(createdAt).toString(36)}-${suffix()}`;
  const hero = byFile.get(e.from);
  const item = {
    id: histId, name: `${id}-direction-split-animation-sheet.png`, imageUrl: `/samples/${e.sheet}`, provider: "local-inbox",
    prompt: e.prompt, seed: "", size: "2048x1280", createdAt, adopted: true, source: "generate",
    derivedFromId: hero?.id, derivedFromName: hero?.name,
    animationDirections: ["front", "front three-quarter", "side", "back three-quarter", "back"],
    animationGenerationProfile: "balanced",
    outboxImportKey: `direction-split:${id}:${["front", "front-three-quarter", "side", "back-three-quarter", "back"].map((d) => `${id}-${d}.png`).sort().join("|")}:${id}-manifest.json`
  };
  history.push(item);
  frameSheets.push({ imageUrl: `/samples/${e.sheet}`, sourceId: histId, idPrefix: `${e.action}-${id.slice(-6)}`, namePrefix: `${e.action}`, cell: { width: 256, height: 256 } });
});
history.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

// A failed (blocked) job and two results that finished while the browser was closed.
{
  const createdAt = toIso("2026-10-27T23:31:40-08:00");
  const id = jobIdAt(createdAt);
  const finishedAt = new Date(Date.parse(createdAt) + 95000).toISOString();
  writeJob({ id, createdAt, workflowMode: "image-generate", prompt: "patchwork zombie boss with exposed ribcage and stitched wounds, dripping, gory", finishedAt, outputName: null });
  const p = join(handoff, "outbox", `${id}-blocked.json`);
  writeFileSync(p, JSON.stringify({ status: "blocked", reasonKind: "policy_or_safety", userMessage: "The image request was declined by the image generation safety check.", suggestion: "Rephrase the prompt without gore and retry." }, null, 2));
  setTimes(p, finishedAt);
}
for (const [at, file, prompt] of [
  ["2026-11-16T23:52:31-08:00", "monster-candle-wisp.png", "candle wisp ghost for the vault corridors, small blue flame head, wax drips, floating, transparent bg"],
  ["2026-11-16T23:54:05-08:00", "monster-friendly-ghost.png", "friendly ghost shopkeeper variant, round sheet body, tiny lantern, smiling"]
]) {
  const createdAt = toIso(at);
  const id = jobIdAt(createdAt);
  const finishedAt = new Date(Date.parse(createdAt) + 140000).toISOString();
  const name = `${id}.png`;
  const outPath = join(handoff, "outbox", name);
  copyFileSync(join(examples, file), outPath);
  setTimes(outPath, finishedAt);
  writeJob({ id, createdAt, workflowMode: "image-generate", prompt, finishedAt, outputName: name });
}

const cell = { width: 256, height: 256 };
const anchor = { x: 128, y: 236 };
const sheetFor = (action) => frameSheets.find((s) => s.idPrefix.startsWith(action));
const actions = [
  { name: "idle", fps: 12, loop: true, frameIds: [], cell, anchor },
  { name: "walk", fps: 12, loop: true, frameIds: [], cell, anchor },
  { name: "cast", fps: 10, loop: false, frameSourceId: sheetFor("spell-cast")?.sourceId, frameIds: [], cell, anchor },
  { name: "attack", fps: 14, loop: false, frameSourceId: sheetFor("basic-attack")?.sourceId, frameIds: [], cell, anchor },
  { name: "run", fps: 20, loop: true, playbackMode: "ping-pong-reverse", frameIds: [], cell, anchor }
];

writeFileSync(join(seedWeb, "seed-state.json"), JSON.stringify({ history, frameSheets, actions, animationLibrary: [], localStorage: {} }, null, 2));
console.log(`history=${history.length} adopted=${history.filter((h) => h.adopted).length} sheets=${frameSheets.length} frames=${frameSheets.length * 40}`);
