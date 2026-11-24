// 模拟主进程的本地曲库（SQLite tracks 表）、本地歌单与播放统计
import type { Track } from "@shared/types/player";

const DAY = 86400000;

export const createLibrary = (seed: any) => {
  const tracks: Track[] = seed.tracks;
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const plays: { trackId: string; startedAt: number; listenedMs: number }[] = [...seed.plays];
  const playlists: any[] = structuredClone(seed.playlists);
  const avatars: Record<string, string> = seed.avatars;
  const ok = <T>(data?: T) => ({ success: true, data });
  const sorted = () => [...tracks].sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));

  const albums = () => {
    const map = new Map<string, any>();
    for (const t of tracks) {
      if (!t.album?.name) continue;
      const a = map.get(t.album.name) ?? { name: t.album.name, cover: t.cover, artist: t.album.artist ?? t.artists[0]?.name, trackCount: 0 };
      a.trackCount++;
      map.set(t.album.name, a);
    }
    return [...map.values()];
  };
  const artists = () => {
    const map = new Map<string, any>();
    for (const t of tracks)
      for (const ar of t.artists) {
        const a = map.get(ar.name) ?? { name: ar.name, trackCount: 0, cover: t.cover };
        a.trackCount++;
        map.set(ar.name, a);
      }
    return [...map.values()];
  };
  const match = (q: string) => {
    const k = q.trim().toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(k) ||
        t.artists.some((a) => a.name.toLowerCase().includes(k)) ||
        t.album?.name.toLowerCase().includes(k),
    );
  };

  const invoke = (channel: string, args: any[]) => {
    switch (channel) {
      case "library:getTracks":
        return ok(sorted());
      case "library:getAlbums":
        return ok(albums());
      case "library:getArtists":
        return ok(artists());
      case "library:getAlbumTracks":
        return ok(tracks.filter((t) => t.album?.name === args[0]).sort((a, b) => (a.track ?? 0) - (b.track ?? 0)));
      case "library:getArtistTracks":
        return ok(tracks.filter((t) => t.artists.some((a) => a.name === args[0])));
      case "library:getTracksByIds":
        return ok((args[0] as string[]).map((id) => byId.get(id)).filter(Boolean));
      case "library:searchTracks":
        return ok(match(args[0]));
      case "library:quickSearch": {
        const k = String(args[0]).toLowerCase();
        return ok({
          tracks: match(args[0]).slice(0, 8),
          albums: albums().filter((a) => a.name.toLowerCase().includes(k) || a.artist?.toLowerCase().includes(k)).slice(0, 6),
          artists: artists().filter((a) => a.name.toLowerCase().includes(k)).slice(0, 6),
        });
      }
      case "library:getTrackCount":
        return ok(tracks.length);
      case "library:getRandomTrack":
        return ok(tracks[Math.floor(Math.random() * tracks.length)]);
      case "library:getRandomTracks":
        return ok([...tracks].sort(() => Math.random() - 0.5).slice(0, args[0]));
      case "library:isScanning":
        return ok(false);
      case "library:getScanDirs":
        return ok([...seed.scanDirs]);
      case "library:scan":
      case "library:cancelScan":
      case "library:removeScanDir":
        return ok();
      case "library:fetchArtistAvatar":
        return ok(avatars[args[0]] ?? null);
      case "library:prefetchArtistAvatars": {
        const out: Record<string, string> = {};
        for (const n of args[0] as string[]) if (avatars[n]) out[n] = avatars[n];
        return ok(out);
      }
      case "library:readTags": {
        const t = tracks.find((x) => x.path === args[0]);
        return ok(t ? { title: t.title, artist: t.artists.map((a) => a.name).join("; "), album: t.album?.name ?? "", albumArtist: t.album?.artist ?? "", year: t.album?.year, trackNo: t.track, genre: "", comment: "", lyrics: "" } : null);
      }
      default:
        return ok();
    }
  };

  const summary = (p: any) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    description: p.description,
    cover: p.cover ?? byId.get(p.trackIds[0])?.cover,
    trackCount: p.trackIds.length,
    createTime: p.createTime,
    updateTime: p.updateTime,
  });
  const invokePlaylist = (channel: string, args: any[]) => {
    switch (channel) {
      case "playlist:list":
        return playlists.map(summary).sort((a, b) => b.updateTime - a.updateTime);
      case "playlist:get": {
        const p = playlists.find((x) => x.id === args[0]);
        return p ? { ...summary(p), tracks: p.trackIds.map((id: string) => byId.get(id)).filter(Boolean) } : null;
      }
      case "playlist:create": {
        const p = { id: `pl_${Date.now().toString(36)}`, type: "local", title: args[0].title, description: args[0].description, trackIds: [], createTime: Date.now(), updateTime: Date.now() };
        playlists.push(p);
        return summary(p);
      }
      case "playlist:update": {
        const p = playlists.find((x) => x.id === args[0]);
        if (!p) return null;
        Object.assign(p, args[1], { updateTime: Date.now() });
        return summary(p);
      }
      case "playlist:remove": {
        const i = playlists.findIndex((x) => x.id === args[0]);
        if (i >= 0) playlists.splice(i, 1);
        return;
      }
      case "playlist:addTracks": {
        const p = playlists.find((x) => x.id === args[0]);
        const add = (args[1] as string[]).filter((id) => !p.trackIds.includes(id));
        p.trackIds.push(...add);
        p.updateTime = Date.now();
        return add.length;
      }
      case "playlist:removeTracks": {
        const p = playlists.find((x) => x.id === args[0]);
        const before = p.trackIds.length;
        p.trackIds = p.trackIds.filter((id: string) => !args[1].includes(id));
        return before - p.trackIds.length;
      }
      default:
        return;
    }
  };

  const now = () => Date.now();
  const dayKey = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const countBy = <K>(key: (p: (typeof plays)[0]) => K | undefined) => {
    const m = new Map<K, number>();
    for (const p of plays) {
      const k = key(p);
      if (k !== undefined) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const invokeStats = (channel: string, args: any[]) => {
    const t0 = now();
    switch (channel) {
      case "stats:getStatsSummary": {
        const todayStart = new Date(new Date(t0).setHours(0, 0, 0, 0)).getTime();
        const weekStart = todayStart - 6 * DAY;
        const sum = (from: number, to = Infinity) =>
          plays.filter((p) => p.startedAt >= from && p.startedAt < to).reduce((s, p) => s + p.listenedMs, 0);
        const days = new Set(plays.map((p) => dayKey(p.startedAt)));
        let streak = 0;
        for (let d = todayStart; days.has(dayKey(d)); d -= DAY) streak++;
        return {
          todayListenedMs: sum(todayStart),
          weekListenedMs: sum(weekStart),
          lastWeekListenedMs: sum(weekStart - 7 * DAY, weekStart),
          totalListenedMs: sum(0),
          weekPlayCount: plays.filter((p) => p.startedAt >= weekStart).length,
          totalPlayCount: plays.length,
          weekFavoriteAdds: 4,
          streakDays: streak,
        };
      }
      case "stats:getTopTracks":
        return countBy((p) => p.trackId).slice(0, args[0]).map(([id, n]) => ({ track: byId.get(id), playCount: n }));
      case "stats:getRecentTracks": {
        const seen = new Set<string>();
        const out: Track[] = [];
        for (let i = plays.length - 1; i >= 0 && out.length < args[0]; i--) {
          if (seen.has(plays[i].trackId)) continue;
          seen.add(plays[i].trackId);
          out.push(byId.get(plays[i].trackId)!);
        }
        return out;
      }
      case "stats:getLibraryStats": {
        const codecs = new Map<string, number>();
        for (const t of tracks) codecs.set(t.quality!.codec, (codecs.get(t.quality!.codec) ?? 0) + 1);
        return {
          trackCount: tracks.length,
          albumCount: albums().length,
          artistCount: artists().length,
          totalDurationMs: tracks.reduce((s, t) => s + t.duration, 0),
          totalFileSize: tracks.reduce((s, t) => s + (t.fileSize ?? 0), 0),
          codecs: [...codecs.entries()].map(([codec, count]) => ({ codec, count })),
        };
      }
      case "stats:getPlayHistoryDaily": {
        const n = args[0] as number;
        const counts = new Map(countBy((p) => dayKey(p.startedAt)));
        return Array.from({ length: n }, (_, i) => {
          const day = dayKey(t0 - (n - 1 - i) * DAY);
          return { day, playCount: counts.get(day) ?? 0 };
        });
      }
      case "stats:getPlayHistoryHourly": {
        const counts = new Map(countBy((p) => new Date(p.startedAt).getHours()));
        return Array.from({ length: 24 }, (_, hour) => ({ hour, playCount: counts.get(hour) ?? 0 }));
      }
      case "stats:getTopAlbums":
        return countBy((p) => byId.get(p.trackId)?.album?.name)
          .slice(0, args[0])
          .map(([name, n]) => ({ track: tracks.find((t) => t.album?.name === name), playCount: n }));
      case "stats:getTopArtists":
        return countBy((p) => byId.get(p.trackId)?.artists[0]?.name)
          .slice(0, args[0])
          .map(([name, n]) => ({
            artist: { name, avatar: avatars[name] },
            track: tracks.find((t) => t.artists[0]?.name === name),
            playCount: n,
          }));
      default:
        return null;
    }
  };

  const recordPlay = (e: any) => {
    if (e?.track?.source === "local") plays.push({ trackId: e.track.id, startedAt: e.startedAt, listenedMs: e.listenedMs });
  };

  return { tracks, byId, invoke, invokePlaylist, invokeStats, recordPlay };
};
