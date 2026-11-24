// Local stand-in for the Hevy public API (https://api.hevyapp.com/v1). The app's
// HevyClient honours HEVY_API_KEY_URL, which start.sh points here.
// Responses follow Hevy's v1 shapes. Lists return everything on page 1
// (page_count 1): the client sleeps 1s per call, and paging 10 at a time
// would make every page load wait ~15s.
import http from "node:http";
import { generate, publicWorkout } from "./data.mjs";

const port = Number(process.env.HEVY_STUB_PORT || 54330);
const D = generate();
const workouts = D.workouts.map(publicWorkout);
const byId = new Map(workouts.map((w) => [w.id, w]));
const routines = D.routines;

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const p = url.pathname.replace(/^\/v1/, "").replace(/\/$/, "");
    if (!req.headers["api-key"]) return send(res, 401, { error: "Unauthorized" });
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.method === "GET" && p === "/workouts/count") return send(res, 200, { workout_count: workouts.length });
      if (req.method === "GET" && p === "/workouts") {
        const page = Number(url.searchParams.get("page") || 1);
        return send(res, 200, { page, page_count: 1, workouts: page === 1 ? workouts : [] });
      }
      if (req.method === "GET" && p === "/workouts/events") {
        const since = Date.parse(url.searchParams.get("since") || "1970-01-01");
        const page = Number(url.searchParams.get("page") || 1);
        const evs = D.events
          .filter((e) => Date.parse(e.workout.updated_at) >= since)
          .map((e) => ({ type: e.type, workout: publicWorkout(e.workout) }));
        return send(res, 200, { page, page_count: 1, events: page === 1 ? evs : [] });
      }
      let m = p.match(/^\/workouts\/([^/]+)$/);
      if (m) {
        const w = byId.get(decodeURIComponent(m[1]));
        if (!w) return send(res, 404, { error: "Workout not found" });
        if (req.method === "PUT") {
          try { Object.assign(w, JSON.parse(body).workout ?? {}, { updated_at: new Date().toISOString() }); } catch {}
          return send(res, 200, { workout: [w] });
        }
        return send(res, 200, w);
      }
      if (req.method === "GET" && p === "/routines") {
        const page = Number(url.searchParams.get("page") || 1);
        return send(res, 200, { page, page_count: 1, routines: page === 1 ? routines : [] });
      }
      m = p.match(/^\/routines\/([^/]+)$/);
      if (m) {
        const r = routines.find((x) => x.id === decodeURIComponent(m[1]));
        return r ? send(res, 200, { routine: r }) : send(res, 404, { error: "Routine not found" });
      }
      if (req.method === "GET" && p === "/routine_folders") {
        return send(res, 200, { page: 1, page_count: 1, routine_folders: [
          { id: 1184207, index: 0, title: "PPL (Fall 2026)", updated_at: D.routines[0].updated_at, created_at: D.routines[0].created_at },
          { id: 1184211, index: 1, title: "Travel", updated_at: D.routines[6].updated_at, created_at: D.routines[6].created_at },
        ] });
      }
      if (req.method === "GET" && p === "/user/info") {
        return send(res, 200, { data: { id: "2f61c0a4-8d0e-4b7c-9a51-7c3e2b1d9f40", name: "Marek Kowalski", url: "https://hevy.com/user/mkowalski_lifts" } });
      }
      send(res, 404, { error: `No stub for ${req.method} ${url.pathname}` });
    });
  })
  .listen(port, "127.0.0.1", () => console.log(`[hevy-stub] listening on 127.0.0.1:${port} (${workouts.length} workouts, ${routines.length} routines)`));
