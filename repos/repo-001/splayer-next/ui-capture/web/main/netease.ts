// 网易云音乐接口的离线替身：访客（未登录）状态；首页推荐接口返回种子中的推荐内容，
// 其余在线接口一律按"网络不可用"失败，界面会按真实断网时的方式隐藏对应区块
export const handleNetease = async (name: string, params: Record<string, any>, seed: any) => {
  const ok = (body: unknown) => ({ ok: true, status: 200, body });
  const d = seed.discover;
  switch (name) {
    case "login_status":
      return ok({ data: { code: 200, account: null, profile: null } });
    case "personalized":
      return ok({ code: 200, result: d.playlists.slice(0, params.limit ?? 20) });
    case "top_artists":
      return ok({ code: 200, artists: d.artists.slice(0, params.limit ?? 12) });
    case "album_new":
      return ok({ code: 200, albums: d.albums.slice(0, params.limit ?? 12) });
    case "search_hot_detail":
      return ok({
        code: 200,
        data: ["晴天", "孤勇者", "夜に駆ける", "Blinding Lights", "草东没有派对", "毛不易", "Lemon", "告五人"].map((searchWord, i) => ({ searchWord, score: 980000 - i * 61000, content: "" })),
      });
    default:
      return { ok: false, status: 503, error: "网络不可用（离线演示环境）" };
  }
};
