// Builds the full mock database: the hand-written notable reports plus generated
// filler so the total is 48,600 reports with exactly 3,940 open. Deterministic
// (seeded), so every load shows the same data.
//
// Filler vocabulary deliberately avoids the trigger words used by the demo
// (map, rain, storm, weather, fast travel, co-op, host, teammate) so the only
// reports that match those concepts are the hand-written ones.

import { NOTABLE } from './notable.js';

const TOTALS = { open: 3940, fixed: 31220, 'cant-repro': 6410, duplicate: 7030 };
const TOTAL_REPORTS = 48600;

const SUBJECTS = [
  'Inventory grid', 'Matchmaking lobby', 'Voice chat', 'Quest log', 'Crafting queue',
  'Vehicle handling', 'NPC dialogue', 'Audio mixer', 'Friend invite flow', 'Achievement toast',
  'Mount stamina bar', 'Loot spawner', 'Animation blending', 'Save slot picker', 'Party HUD',
  'Cutscene sequencer', 'Haptics driver', 'Shop catalog', 'Ability cooldowns', 'Companion follow AI',
  'Texture streaming', 'Netcode rollback', 'Session join flow', 'Photo mode camera', 'Emote wheel',
  'Glider controls', 'Boss health bar', 'Subtitle layout', 'Replay recorder', 'Settings menu',
  'Reward chest', 'Horse saddle', 'Foliage LOD', 'Footstep audio', 'Pause menu', 'Respawn timer',
  'Trophy sync', 'Friends list', 'Gift box', 'Hotbar slots', 'Minimap icons', 'Minimap zoom',
];

const SYMPTOMS = [
  'freezes', 'crashes on exit', 'renders missing icons', 'desyncs for other players',
  'drops frames for two seconds', 'shows the wrong count', 'soft-locks the menu', 'plays twice',
  'clips through geometry', 'ignores input briefly', 'fails to save', 'loads default values',
  'hangs on the loading screen', 'duplicates the reward', 'stutters on first open',
  'shows stale data', 'leaves a black frame', 'resets selection',
];

const CONTEXTS = [
  '', '', '', 'in four-player sessions', 'after a controller reconnect', 'on Xbox Series X',
  'after the latest patch', 'when joining mid-quest', 'at night', 'with a full inventory',
  'after switching loadout', 'in Frostpeak', 'on PC ultrawide', 'after returning to camp',
  'after a cutscene skip', 'when two players trade', 'on a fresh save', 'with haptics off',
];

const FIRST_NAMES = [
  'Aiko', 'Brendan', 'Carmen', 'Dev', 'Elif', 'Farid', 'Gwen', 'Hiro', 'Ines', 'Jonas',
  'Kwame', 'Lucía', 'Mateo', 'Nadia', 'Oliver', 'Paula', 'Quinn', 'Rahul', 'Sofia', 'Tariq',
  'Ugo', 'Vera', 'Wen', 'Ximena', 'Yara', 'Zane', 'Mina', 'Jorge', 'Priya', 'Sven',
];
const LAST_NAMES = [
  'Abara', 'Brandt', 'Castellanos', 'Dubois', 'Eriksen', 'Fontaine', 'Gill', 'Hashemi',
  'Ishikawa', 'Jensen', 'Kowalczyk', 'Laurent', 'Moreau', 'Nakamura', 'Okoro', 'Pereira',
  'Quist', 'Reyes', 'Sato', 'Thorne', 'Usman', 'Varga', 'Wallis', 'Xu', 'Yilmaz', 'Zhou',
  'Lindqvist', 'Mensah', 'Harlow', 'Oyelaran',
];

const TEAMS = [
  'Console Certification', 'PC QA', 'Gameplay QA', 'Online QA', 'Audio QA', 'Art QA',
  'Performance', 'Localization QA',
];

const CLASSES = [
  'InventoryGrid', 'MatchmakingSession', 'VoiceChatRouter', 'QuestTracker', 'CraftingQueue',
  'VehicleController', 'DialogueRunner', 'AudioMixerBus', 'FriendInviteService',
  'AchievementToast', 'MountStamina', 'LootSpawner', 'AnimationBlender', 'SaveSlotManager',
  'PartyHud', 'CutsceneSequencer', 'HapticsDriver', 'ShopCatalog', 'AbilityCooldowns',
  'TextureStreamer', 'NetRollbackBuffer', 'PhotoModeCamera', 'EmoteWheel', 'BossHealthBar',
];
const METHODS = ['Rebuild', 'Flush', 'Commit', 'Resolve', 'Refresh', 'Tick', 'Apply', 'Dispatch', 'Sync', 'Load', 'Dequeue', 'Attach'];
const ERRORS = ['null pointer', 'access violation', 'assert: index < count', 'double free'];

// Relative frequencies used when generating filler.
const FIRST_BUILD_W = [[0, 0.1], [1, 0.12], [2, 0.18], [3, 0.25], [4, 0.35]];
const PLATFORM_W = [['PS5', 0.45], ['Xbox Series', 0.3], ['PC', 0.25]];
const SEVERITY_W = [['S1', 0.04], ['S2', 0.2], ['S3', 0.46], ['S4', 0.3]];
const CLIPS_W = [[0, 0.55], [1, 0.3], [2, 0.1], [3, 0.05]];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildCorpus(builds) {
  const rnd = mulberry32(20261117);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const weighted = (pairs) => {
    let x = rnd();
    for (const [value, w] of pairs) {
      x -= w;
      if (x < 0) return value;
    }
    return pairs[pairs.length - 1][0];
  };

  // Status pool for the generated reports: totals minus the hand-written ones.
  const counts = { ...TOTALS };
  for (const n of NOTABLE) counts[n.status] -= 1;
  const statuses = [];
  for (const [status, c] of Object.entries(counts)) {
    for (let k = 0; k < c; k++) statuses.push(status);
  }
  for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
  }

  const used = new Set(NOTABLE.map((n) => n.id));
  const out = NOTABLE.map((n) => ({
    ...n,
    fixedIn: n.fixedIn ?? null,
    duplicateOf: n.duplicateOf ?? null,
    platforms: [...n.platforms],
  }));

  for (const status of statuses) {
    let id;
    do {
      id = `GW-${between(10000, 69999)}`;
    } while (used.has(id));
    used.add(id);

    let firstIdx;
    let lastIdx;
    let fixedIdx = null;
    if (status === 'fixed') {
      firstIdx = between(0, 2);
      fixedIdx = between(firstIdx + 1, 3);
      lastIdx = between(firstIdx, fixedIdx - 1);
    } else {
      firstIdx = weighted(FIRST_BUILD_W);
      lastIdx = status === 'open' && rnd() < 0.85 ? builds.length - 1 : between(firstIdx, builds.length - 1);
    }

    const platforms = [weighted(PLATFORM_W)];
    if (rnd() < 0.35) {
      const extra = weighted(PLATFORM_W);
      if (!platforms.includes(extra)) platforms.push(extra);
    }

    const subject = pick(SUBJECTS);
    const symptom = pick(SYMPTOMS);
    const ctx = pick(CONTEXTS);
    const title = capitalize(`${subject} ${symptom}${ctx ? ` ${ctx}` : ''}`);
    const description = `Expected ${subject.toLowerCase()} to work as designed. Actual: ${symptom}${ctx ? `, ${ctx}` : ''}.`;
    const signature = rnd() < 0.07 ? `${pick(CLASSES)}::${pick(METHODS)} ${pick(ERRORS)}` : null;
    let dupes = 0;
    if (status !== 'duplicate') {
      const r = rnd();
      dupes = r < 0.68 ? 0 : r < 0.92 ? between(1, 4) : r < 0.99 ? between(5, 15) : between(16, 30);
    }

    out.push({
      id,
      title,
      status,
      fixedIn: fixedIdx === null ? null : builds[fixedIdx],
      duplicateOf: null,
      platforms,
      firstBuild: builds[firstIdx],
      lastBuild: builds[lastIdx],
      signature,
      dupes,
      reporter: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      team: pick(TEAMS),
      severity: weighted(SEVERITY_W),
      clips: weighted(CLIPS_W),
      description,
    });
  }

  // Point generated duplicates at a real (non-duplicate) report.
  const canonical = out.filter((r) => r.status !== 'duplicate');
  for (const r of out) {
    if (r.status === 'duplicate' && !r.duplicateOf) r.duplicateOf = pick(canonical).id;
  }

  if (out.length !== TOTAL_REPORTS) {
    throw new Error(`corpus size ${out.length} != ${TOTAL_REPORTS}`);
  }
  return out;
}
