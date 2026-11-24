import { CURE_BY_LABEL, money, timeRemaining } from "../domain/format";
import { DISPOSITION_TEXT } from "../domain/rules";
import type { DispositionResult } from "../domain/rules";
import { Pill, toneForDisposition } from "./Pill";

interface Props {
  disp: DispositionResult;
  now: Date;
  onPreview: () => void;
  onPrint: () => void;
}

export function DispositionCard({ disp, now, onPreview, onPrint }: Props) {
  const tone = toneForDisposition(disp.kind);
  const remaining = timeRemaining(now);
  const complete = disp.kind === "complete";

  let summary: string;
  if (disp.kind === "disqualifying") {
    summary = `This filing cannot be accepted as it stands. ${disp.disq.length === 1 ? "One item" : `${disp.disq.length} items`} would disqualify it and cannot be cured by ${CURE_BY_LABEL}.${
      disp.cur.length ? ` ${disp.cur.length} curable item${disp.cur.length === 1 ? " is" : "s are"} also open.` : ""
    }`;
  } else if (disp.kind === "deficient") {
    summary = `${disp.cur.length} curable item${disp.cur.length === 1 ? " is" : "s are"} open. The candidate can cure ${
      disp.cur.length === 1 ? "it" : "them"
    } until ${CURE_BY_LABEL}.`;
  } else {
    summary = "Every statutory check is met. No deficiency notice is needed.";
  }

  return (
    <section className={`card disposition disposition-${tone}`} aria-labelledby="disp-title">
      <header className="card-head">
        <h2 id="disp-title">Disposition</h2>
        <Pill tone={tone}>{DISPOSITION_TEXT[disp.kind]}</Pill>
      </header>

      <p className="disp-summary">{summary}</p>

      {disp.disq.length > 0 && (
        <div className="bucket bucket-bad">
          <div className="bucket-title">Would disqualify</div>
          <ul>
            {disp.disq.map((r) => (
              <li key={r.id}>{r.title}</li>
            ))}
          </ul>
        </div>
      )}
      {disp.cur.length > 0 && (
        <div className="bucket bucket-warn">
          <div className="bucket-title">Curable by {CURE_BY_LABEL}</div>
          <ul>
            {disp.cur.map((r) => (
              <li key={r.id}>
                {r.title}
                {r.id === "filing-fee" && r.shortfall > 0 ? ` (${money(r.shortfall)} owed)` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="disp-time">
        Time to cure: {remaining.closed ? "closed" : `${remaining.days} d ${remaining.hours} h ${remaining.minutes} m`}
      </div>

      <div className="disp-actions">
        <button className="btn primary" onClick={onPrint} disabled={complete}>
          Print deficiency notice
        </button>
        <button className="btn" onClick={onPreview} disabled={complete}>
          Preview notice
        </button>
      </div>
    </section>
  );
}
