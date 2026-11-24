import { alertsLastSevenDays, alertsLastThirtyDays, SCREENING_ROWS, LIBRARY_COUNTS } from "./lib/data";
import { verdictFor } from "./lib/rules";
import { StoreProvider, useStore } from "./lib/store";
import { useRoute, type Route } from "./lib/router";
import { NOW, fmtClock, fmtDate, toDayKey } from "./lib/time";
import { Today } from "./views/Today";
import { Upcoming } from "./views/Upcoming";
import { Roundup } from "./views/Roundup";
import { Rules } from "./views/Rules";
import { History } from "./views/History";

function Sidebar({ route }: { route: Route }) {
  const { draft } = useStore();

  const week = alertsLastSevenDays(NOW);
  const weekVerdicts = week.map((a) => verdictFor(a.film, a.cinema, a.format, a.sold, a.series, draft).route);
  const weekInterrupts = weekVerdicts.filter((r) => r === "interrupt").length;
  const weekRoundup = weekVerdicts.length - weekInterrupts;
  const monthCount = alertsLastThirtyDays(NOW).length;

  const items: { id: Route; label: string; badge?: number; hint?: string }[] = [
    { id: "today", label: "Today", badge: weekInterrupts, hint: "interrupts this week" },
    { id: "upcoming", label: "Upcoming", badge: SCREENING_ROWS.length },
    { id: "roundup", label: "Roundup", badge: weekRoundup, hint: "held this week" },
    { id: "rules", label: "Rules" },
    { id: "history", label: "History", badge: monthCount },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          ◉
        </span>
        <div>
          <strong>Reelcall</strong>
          <span className="brand-sub">Repertory screening alerts</span>
        </div>
      </div>

      <nav aria-label="Main">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#/${item.id}`}
            className={route === item.id ? "active" : ""}
            aria-current={route === item.id ? "page" : undefined}
            title={item.hint}
          >
            <span>{item.label}</span>
            {item.badge !== undefined && <span className="count">{item.badge}</span>}
          </a>
        ))}
      </nav>

      <div className="sidebar-foot">
        <p className="small">
          <strong>Jonah</strong>
        </p>
        <p className="small muted">
          {LIBRARY_COUNTS.wanted} wanted · {LIBRARY_COUNTS.mustSeeOnFilm} on film · {LIBRARY_COUNTS.seen} seen
        </p>
        <p className="small muted">
          {fmtDate(toDayKey(NOW))} · {fmtClock(NOW.getHours(), NOW.getMinutes())}
        </p>
        <p className="small muted">Quiet hours 11 p.m. – 7 a.m.</p>
      </div>
    </aside>
  );
}

function Shell() {
  const route = useRoute();
  return (
    <div className="app">
      <Sidebar route={route} />
      <main className="main" id="main">
        {route === "today" && <Today />}
        {route === "upcoming" && <Upcoming />}
        {route === "roundup" && <Roundup />}
        {route === "rules" && <Rules />}
        {route === "history" && <History />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
