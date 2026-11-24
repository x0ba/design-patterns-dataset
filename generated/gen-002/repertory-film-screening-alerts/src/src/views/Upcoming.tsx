import { useMemo, useState } from "react";
import { Chip, FormatBadge, Sparkline, SoldBar } from "../components/ui";
import { SCREENING_ROWS, groupByWeek, projectSold, type ScreeningRow } from "../lib/data";
import { verdictFor } from "../lib/rules";
import { useStore } from "../lib/store";
import { FORMATS, type Format, type Verdict } from "../types";
import { NOW, endTime, fmtClockHHMM, fmtDate, fmtDateLong, fmtRuntime, fmtShortDay, parseDay, addDays, toDayKey } from "../lib/time";
import { CINEMAS } from "../data/catalog";

interface Annotated {
  row: ScreeningRow;
  v: Verdict;
}

function Detail({ item, onClose }: { item: Annotated; onClose: () => void }) {
  const { row: s, v } = item;
  const proj = projectSold(s, NOW);
  const left = s.cinema.seats - s.sold;
  return (
    <aside className="drawer" aria-label="Screening details">
      <div className="drawer-head">
        <p className="kicker">{v.route === "interrupt" ? "Would interrupt you" : "Goes to the roundup"}</p>
        <button className="btn ghost" onClick={onClose} aria-label="Close details">
          Close
        </button>
      </div>
      <h2 className="film-title">{s.film.title}</h2>
      <p className="film-meta">
        {s.film.year} · {s.film.director}
        {s.film.runtime ? ` · ${fmtRuntime(s.film.runtime)}` : ""}
      </p>
      <div className="drawer-tags">
        <FormatBadge format={s.format} />
        {s.film.seen ? <Chip tone="seen">Seen before</Chip> : <Chip tone="neutral">Not seen yet</Chip>}
        {s.film.mustSeeOnFilm && <Chip tone="must">Must see on film</Chip>}
        {s.series && <Chip tone="muted">{s.series}</Chip>}
      </div>

      <dl className="facts drawer-facts">
        <div>
          <dt>When</dt>
          <dd>
            {fmtDateLong(s.date)}, {fmtClockHHMM(s.time)}
            {s.film.runtime ? ` – ${endTime(s.time, s.film.runtime)}` : ""}
          </dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>{s.cinema.name}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>${s.price}</dd>
        </div>
        <div>
          <dt>Seats</dt>
          <dd>
            {left} left of {s.cinema.seats}
          </dd>
        </div>
      </dl>

      <SoldBar sold={s.sold} seats={s.cinema.seats} />

      <div className="verdict-explainer">
        <strong>Filter says:</strong> {v.route === "interrupt" ? "interrupt" : "roundup"} · {v.reason}
      </div>

      {s.sales && (
        <>
          <h3 className="drawer-sub">Sales so far</h3>
          <Sparkline points={s.sales} seats={s.cinema.seats} />
          {proj && (
            <p className="small muted">
              Pace +{proj.pacePerDay.toFixed(1)} a day. About {proj.projectedSold} sold by showtime (
              {proj.projectedPct}%).
            </p>
          )}
        </>
      )}
      {s.id === "s05" || s.id === "s07" ? (
        <a className="btn" href="#/today">
          Compare Saturday and Sunday
        </a>
      ) : null}
    </aside>
  );
}

export function Upcoming() {
  const { draft } = useStore();
  const [format, setFormat] = useState<Format | "all">("all");
  const [cinemaId, setCinemaId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [onlyInterrupts, setOnlyInterrupts] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const annotated: Annotated[] = useMemo(
    () =>
      SCREENING_ROWS.map((row) => ({
        row,
        v: verdictFor(row.film, row.cinema, row.format, row.sold, row.series, draft),
      })),
    [draft],
  );

  const visible = annotated.filter(({ row, v }) => {
    if (format !== "all" && row.format !== format) return false;
    if (cinemaId !== "all" && row.cinemaId !== cinemaId) return false;
    if (onlyInterrupts && v.route !== "interrupt") return false;
    const q = query.trim().toLowerCase();
    if (q && !`${row.film.title} ${row.film.director} ${row.series ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const interruptTotal = annotated.filter((x) => x.v.route === "interrupt").length;
  const groups = groupByWeek(visible.map((x) => x.row));
  const byId = new Map(annotated.map((x) => [x.row.id, x]));
  const selectedItem = selected ? byId.get(selected) ?? null : null;

  const weekRange = (monday: string) => {
    const start = parseDay(monday);
    const end = addDays(start, 6);
    return `${fmtShortDay(toDayKey(start))} – ${fmtShortDay(toDayKey(end))}`;
  };

  return (
    <div className="page upcoming">
      <header className="page-head">
        <div>
          <p className="kicker">Next six weeks · Nov 17 – Dec 27</p>
          <h1>Upcoming</h1>
        </div>
        <p className="status-line">
          {SCREENING_ROWS.length} matching screenings. {interruptTotal} would interrupt you under your draft filter.
        </p>
      </header>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Search film, director or series"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search screenings"
        />
        <div className="segmented" role="group" aria-label="Format">
          <button className={format === "all" ? "on" : ""} onClick={() => setFormat("all")}>
            All formats
          </button>
          {FORMATS.map((f) => (
            <button key={f} className={format === f ? "on" : ""} onClick={() => setFormat(f)}>
              {f}
            </button>
          ))}
        </div>
        <select value={cinemaId} onChange={(e) => setCinemaId(e.target.value)} aria-label="Cinema">
          <option value="all">All cinemas</option>
          {CINEMAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={onlyInterrupts} onChange={(e) => setOnlyInterrupts(e.target.checked)} />
          Only interrupts
        </label>
        <span className="muted small toolbar-count">Showing {visible.length}</span>
      </div>

      {groups.length === 0 && <p className="empty">Nothing matches these filters.</p>}

      {groups.map((g) => (
        <section key={g.monday} className="week-group">
          <h3 className="week-head">
            <span>Week of {fmtShortDay(g.monday)}</span>
            <span className="muted">{weekRange(g.monday)}</span>
            <span className="muted">{g.rows.length} screenings</span>
          </h3>
          <table className="screenings">
            <thead>
              <tr>
                <th>Date</th>
                <th>Film</th>
                <th>Cinema</th>
                <th>Format</th>
                <th>Sold</th>
                <th>Price</th>
                <th>Filter</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((row) => {
                const item = byId.get(row.id)!;
                return (
                  <tr
                    key={row.id}
                    className={`${selected === row.id ? "selected" : ""} ${item.v.route}`}
                    onClick={() => setSelected(row.id)}
                  >
                    <td className="col-date">
                      <span className="dow">{fmtDate(row.date).split(",")[0]}</span>
                      <span>{fmtDate(row.date).split(", ")[1]}</span>
                      <span className="muted">{fmtClockHHMM(row.time)}</span>
                    </td>
                    <td className="col-film">
                      <span className="serif">{row.film.title}</span>
                      <span className="muted"> {row.film.year}</span>
                      <div className="tags">
                        {row.film.seen ? <Chip tone="seen">Seen</Chip> : <Chip tone="neutral">Unseen</Chip>}
                        {row.film.mustSeeOnFilm && <Chip tone="must">On film list</Chip>}
                        {row.series && <Chip tone="muted">{row.series}</Chip>}
                      </div>
                    </td>
                    <td>{row.cinema.name}</td>
                    <td>
                      <FormatBadge format={row.format} />
                    </td>
                    <td className="col-sold">
                      <SoldBar sold={row.sold} seats={row.cinema.seats} />
                    </td>
                    <td>${row.price}</td>
                    <td>
                      <Chip tone={item.v.route} title={item.v.reason}>
                        {item.v.route === "interrupt" ? "Interrupt" : "Roundup"}
                      </Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      {selectedItem && <Detail item={selectedItem} onClose={() => setSelected(null)} />}
    </div>
  );
}
