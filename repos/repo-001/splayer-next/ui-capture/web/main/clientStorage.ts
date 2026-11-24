// 首次打开时按渲染进程自身的持久化结构写入老用户状态：
// IndexedDB（localforage: splayer/library、history、queue）与 localStorage（status / settings / theme）
import localforage from "localforage";

const MARK = "ui-capture-seeded-v1";

export const seedClientStorage = async (seed: any, library: { byId: Map<string, any> }): Promise<void> => {
  if (localStorage.getItem(MARK)) return;
  const libDb = localforage.createInstance({ name: "splayer", storeName: "library" });
  const historyDb = localforage.createInstance({ name: "splayer", storeName: "history" });
  const queueDb = localforage.createInstance({ name: "splayer", storeName: "queue" });

  const ctx = { provider: "local", originId: seed.queue.playlistId, originType: "playlist" };
  const queueItems = seed.queue.trackIds.map((id: string) => ({ track: library.byId.get(id), context: ctx }));
  await Promise.all([
    libDb.setItem("liked-ids", seed.likedIds),
    historyDb.setItem(
      "entries",
      seed.history.map((h: any) => ({ track: library.byId.get(h.trackId), playedAt: h.playedAt })),
    ),
    queueDb.setItem("playList", queueItems),
    queueDb.setItem("originalPlayList", null),
  ]);
  localStorage.setItem(
    "status",
    JSON.stringify({
      playIndex: seed.queue.index,
      repeatMode: "list",
      shuffleMode: "off",
      heartMode: false,
      volume: 0.72,
      position: seed.queue.position,
    }),
  );
  localStorage.setItem(MARK, String(Date.now()));
};
