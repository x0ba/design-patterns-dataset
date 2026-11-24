import { useMemo, useState } from "react";
import { Card, Chip, FormatBadge } from "../components/ui";
import { alertsLastThirtyDays, type AlertRow } from "../lib/data";
import { verdictFor } from "../lib/rules";
import { useStore } from "../lib/store";
import { ALERT_LABEL, type AlertType } from "../types";
import { NOW, addDays, fmtClockHHMM, fmtDate, fmtShortDay, fmtWhen, toDayKey } from "../lib/time";

const TYPES: AlertType[] = ["new", "selling", "last", "upgrade"];

export function History() {
  const { draft } = useStore();
  const [type, setType] = useState<AlertType | "all">("all");

  const rows = alertsLastThirtyDays(NOW);
  const total = rows.length;

  const byType = useMemo(() => {
    const out = new Map<AlertType, number>(TYPES.map((t) => [t, 0]));
    for (const r of rows) out.set(r.type, (out.get(r.type) ?? 0) + 1);
    return out;
  }, [rows]);

  const annotated = rows.map((r) => ({
    r,
    route: verdictFor(r.film, r.cinema, r.format, r.sold, r.series, draft),
  }));
  const interruptTotal = annotated.filter((x) => x.route.route === "interrupt").length;

  // One bar per day, oldest first, for the last 30 days.
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(NOW, i - 29);
    const key = toDayKey(d);
    const count = rows.filter((r) => toDayKey(r.when) === key).length;
    return { key, count, label: fmtShortDay(key) };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const visible = annotated.filter((x) => type === "all" || x.r.type === type);

  const shareOf = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="page history">
      <header className="page-head">
        <div>
          <p className="kicker">Oct 18 – Nov 16 · last 30 days</p>
          <h1>History</h1>
        </div>
        <p className="status-line">
          {total} alerts. {interruptTotal} would still interrupt you under your draft filter.
        </p>
      </header>

      <div className="history-top">
        <Card kicker="By reason" title={`${total} alerts`}>
          <ul className="reason-bars">
            {TYPES.map((t) => {
              const n = byType.get(t) ?? 0;
              return (
                <li key={t}>
                  <div className="reason-label">
                    <span>{ALERT_LABEL[t]}</span>
                    <span>
                      <strong>{n}</strong> <span className="muted">· {shareOf(n)}%</span>
                    </span>
                  </div>
                  <div className="track">
                    <div className={`fill type-${t}`} style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card kicker="Per day" title="When alerts arrived">
          <div className="daybars" role="img" aria-label="Alerts per day for the last 30 days">
            {days.map((d) => (
              <div key={d.key} className="daybar" title={`${d.label}: ${d.count}`}>
                <div className="daybar-fill" style={{ height: `${(d.count / maxDay) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="daybar-axis">
            <span>{days[0].label}</span>
            <span>{days[days.length - 1].label}</span>
          </div>
        </Card>
      </div>

      <Card
        kicker="Every alert"
        title="Newest first"
        action={
          <div className="segmented" role="group" aria-label="Filter by reason">
            <button className={type === "all" ? "on" : ""} onClick={() => setType("all")}>
              All
            </button>
            {TYPES.map((t) => (
              <button key={t} className={type === t ? "on" : ""} onClick={() => setType(t)}>
                {ALERT_LABEL[t]}
              </button>
            ))}
          </div>
        }
      >
        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Reason</th>
                <th>Film</th>
                <th>Cinema</th>
                <th>Format</th>
                <th>Screening</th>
                <th>Sold</th>
                <th>Filter</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ r, route }) => (
                <HistoryRow key={r.id} row={r} route={route} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function HistoryRow({ row, route }: { row: AlertRow; route: { route: "interrupt" | "roundup"; reason: string } }) {
  return (
    <tr>
      <td className="nowrap">{fmtWhen(row.when)}</td>
      <td className="nowrap">{ALERT_LABEL[row.type]}</td>
      <td>
        <span className="serif">{row.film.title}</span>
        <span className="muted"> {row.film.year}</span>
      </td>
      <td>{row.cinema.name}</td>
      <td>
        <FormatBadge format={row.format} />
      </td>
      <td className="nowrap">
        {fmtDate(row.date)} · {fmtClockHHMM(row.time)}
      </td>
      <td className="nowrap">{row.pct}%</td>
      <td>
        <Chip tone={route.route} title={route.reason}>
          {route.route === "interrupt" ? "Interrupt" : "Roundup"}
        </Chip>
      </td>
    </tr>
  );
}
