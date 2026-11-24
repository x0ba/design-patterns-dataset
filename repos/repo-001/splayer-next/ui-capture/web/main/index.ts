// 浏览器内模拟的 Electron 主进程：按 IPC 通道返回与真实主进程相同结构的数据
// 曲库 / 歌单 / 统计来自 seed.json（由 .ui-capture/seed/generate.mjs 生成）
import { defaultSystemConfig } from "@shared/defaults/settings";
import { CURRENT_AGREEMENT_VERSION } from "@shared/constants/agreement";
import type { Track } from "@shared/types/player";
import { seedClientStorage } from "./clientStorage";
import { createLibrary } from "./library";
import { createPlayer } from "./player";
import { handleNetease } from "./netease";
import rawSeed from "../seed.json";

type Emit = (channel: string, data: unknown) => void;
let emit: Emit = () => {};
export const setEmitter = (fn: Emit): void => {
  emit = fn;
};

const clone = <T>(v: T): T => structuredClone(v);

/** 种子数据以生成时刻为基准，打开时整体平移到"现在"，让播放记录始终是最近几个月的 */
const TIME_KEYS = new Set(["startedAt", "playedAt", "createTime", "updateTime", "mtime", "ctime"]);
const shiftTimes = (v: any, delta: number): any => {
  if (Array.isArray(v)) return v.map((x) => shiftTimes(x, delta));
  if (v && typeof v === "object") {
    const o: any = {};
    for (const [k, x] of Object.entries(v)) o[k] = TIME_KEYS.has(k) && typeof x === "number" ? x + delta : shiftTimes(x, delta);
    return o;
  }
  return v;
};
const delta = Math.max(0, Date.now() - (rawSeed as any).generatedAt - 15 * 60000);
const seed: any = { ...shiftTimes(rawSeed, delta), generatedAt: (rawSeed as any).generatedAt + delta };

/** 主配置：默认值 + 一位老用户的个性化设置 */
const config: any = clone(defaultSystemConfig);
config.system.onboardingCompleted = true;
config.system.agreedAgreementVersion = CURRENT_AGREEMENT_VERSION;
config.library.scanDirs = [...seed.scanDirs];
config.player.volume = 0.72;
config.player.equalizer = {
  enabled: true,
  preset: "custom",
  bands: [3, 2, 1, 0, -1, 0, 1, 2, 3, 2],
  preamp: -2,
};
config.media.discord.enabled = true;

const getPath = (obj: any, keyPath: string): unknown =>
  keyPath.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
const setPath = (obj: any, keyPath: string, value: unknown): void => {
  const keys = keyPath.split(".");
  const last = keys.pop()!;
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
};

const library = createLibrary(seed as any);
const player = createPlayer((data) => emit("player:event", data), () => config.player.volume);

const ok = <T>(data?: T) => ({ success: true, data });

const clientReady = seedClientStorage(seed as any, library).catch((e) => console.error("[fake-main] seed storage failed", e));

const OUTPUT_DEVICES = [
  { id: "coreaudio:BuiltInSpeakerDevice", name: "MacBook Pro 扬声器", isDefault: true },
  { id: "coreaudio:AirPods-Pro-2", name: "Lin 的 AirPods Pro", isDefault: false },
  { id: "coreaudio:FiiO-K7", name: "FiiO K7", isDefault: false },
];

const DOWNLOADS = () => {
  const now = seed.generatedAt;
  const pickTrack = (title: string): Track | undefined =>
    library.tracks.find((t: Track) => t.title === title);
  const rows: any[] = [];
  const add = (title: string, state: string, daysAgo: number, extra: any = {}) => {
    const t = pickTrack(title);
    if (!t) return;
    rows.push({
      taskId: `dl_${t.id}`,
      status: state,
      track: { ...t, source: "netease", id: String(186000000 + rows.length * 7919), path: undefined },
      qualityLevel: extra.quality ?? "lossless",
      received: Math.round((t.fileSize ?? 0) * (state === "done" ? 1 : (extra.progress ?? 0))),
      total: t.fileSize ?? 0,
      filePath: state === "done" ? `/Users/lin/Music/SPlayer/${t.artists[0].name} - ${t.title}.flac` : undefined,
      errorCode: extra.error,
      createdAt: now - daysAgo * 86400000,
      finishedAt: state === "done" ? now - daysAgo * 86400000 + 42000 : undefined,
    });
  };
  add("Lemon", "downloading", 0, { progress: 0.62 });
  add("Pretender", "queued", 0);
  add("Blinding Lights", "failed", 1, { error: "NETWORK" });
  add("Viva La Vida", "canceled", 3);
  for (const [i, title] of [
    "夜曲", "稻香", "光年之外", "后来", "Shape of You", "River Flows in You",
    "Merry Christmas Mr. Lawrence", "一样的月光（Live）", "四季予你", "孤勇者",
  ].entries())
    add(title, "done", 2 + i * 6);
  return rows;
};

/** 处理 invoke 调用 */
export const handleInvoke = async (channel: string, args: any[]): Promise<unknown> => {
  const [ns] = channel.split(":");
  if (ns === "library") return library.invoke(channel, args);
  if (ns === "playlist") return library.invokePlaylist(channel, args);
  if (ns === "stats") return library.invokeStats(channel, args);
  if (ns === "player") return player.invoke(channel, args, OUTPUT_DEVICES);
  if (channel === "apis:call") {
    const [platform, name, params] = args;
    if (platform === "netease") return handleNetease(name, params ?? {}, seed);
    return { ok: false, status: 503, error: "离线模式：平台接口不可用" };
  }
  switch (channel) {
    case "window:ready":
      await clientReady;
      return;
    case "window:startupComplete":
      return;
    case "window:isMaximized":
    case "window:isFullscreen":
    case "window:isDesktopLyricOpen":
    case "window:isDynamicIslandOpen":
    case "window:isTaskbarLyricOpen":
      return false;
    case "config:getAll":
      return clone(config);
    case "config:get":
      return clone(getPath(config, args[0]));
    case "config:set":
      setPath(config, args[0], clone(args[1]));
      return true;
    case "config:reset":
    case "config:replaceAll":
      return true;
    case "system:consumePendingAudioFiles":
      return [];
    case "system:consumePendingProtocolUrl":
      return null;
    case "system:listFonts":
      return ["PingFang SC", "Helvetica Neue", "HarmonyOS Sans SC", "LXGW WenKai", "Inter", "SF Pro Display", "Source Han Serif SC", "JetBrains Mono"];
    case "system:copyTrackFile":
      return true;
    case "hotkey:getAll":
      return clone(config.hotkeys);
    case "hotkey:getConflicts":
      return [];
    case "hotkey:set":
    case "hotkey:reset":
    case "hotkey:setGlobalEnabled":
      return clone(config.hotkeys);
    case "hotkey:probe":
      return true;
    case "update:getState":
      return {
        revision: 0,
        channel: config.update.channel,
        phase: "upToDate",
        mode: "external",
        meta: null,
        percent: 0,
        error: null,
      };
    case "update:check":
      return { ok: true };
    case "streaming:loadServers":
      return {
        servers: [],
        activeServerId: null,
      };
    case "streaming:getSnapshot":
      return null;
    case "plugin:list":
      return [];
    case "plugin:market":
      return [];
    case "download:list":
      return DOWNLOADS();
    case "download:getDir":
      return "/Users/lin/Music/SPlayer";
    case "download:lookup":
      return null;
    case "cache:getDir":
      return "/Users/lin/Library/Application Support/SPlayer-Next/app-data/cache";
    case "cache:getStats":
      return [
        { id: "songs", kind: "file", path: "…/cache/songs", size: 1_284_550_656 },
        { id: "covers", kind: "file", path: "…/cache/covers", size: 48_210_944 },
        { id: "artists", kind: "file", path: "…/cache/artists", size: 9_830_400 },
        { id: "backgrounds", kind: "file", path: "…/cache/backgrounds", size: 3_145_728 },
        { id: "lyrics", kind: "db", path: "library.db", size: 6_553_600 },
      ];
    case "lastfm:getStatus":
      return { connected: true, username: "lin_listens" };
    case "externalApi:getStatus":
      return { listening: false, allowLan: false, host: null, port: null, error: null };
    case "mcp:getStatus":
      return { listening: false, port: null, error: null };
    case "mcp:detectAgents":
      return [];
    case "aiModel:list":
      return { models: [], activeModelId: null };
    case "automix:getStatus":
      return {
        state: "missing",
        models: (["beat", "demucs", "runtime"] as const).map((id) => ({ id, state: "missing", received: 0, total: 0 })),
      };
    case "recognition:isSupported":
      return true;
    case "comments:sources":
      return [];
    case "nowPlaying:requestSnapshot":
      return { track: null, lyric: [], source: null, position: 0, playing: false, state: "idle", speed: 1, lyricOffsetMs: 0, sendTimestamp: Date.now() };
    case "motionCover:resolve":
      return null;
    case "lyrics:getManualMatch":
      return null;
    case "lyrics:matchById":
    case "lyrics:matchByQuery":
    case "lyrics:fetchTTMLOverlay":
    case "lyrics:matchLocalTTML":
    case "lyrics:searchTTML":
      return null;
    case "lyrics:searchCandidates":
      return [];
    case "opencc:convert":
      return args[0];
    case "opencc:convertBatch":
      return args[0];
    case "apis:clearSession":
    case "apis:setCookie":
    case "apis:openLoginWeb":
      return;
    default:
      if (import.meta.env.DEV) console.debug("[fake-main] unhandled invoke", channel, args);
      return undefined;
  }
};

/** 处理 send（单向）调用 */
export const handleSend = (channel: string, args: any[]): void => {
  if (channel === "stats:recordPlay") library.recordPlay(args[0]);
};
