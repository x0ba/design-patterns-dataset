import { useState } from "react";
import type { Dispatch } from "react";
import type { Action } from "../state/store";
import type { Filing } from "../domain/types";
import type { Requirement } from "../domain/rules";
import { fmtTime, money } from "../domain/format";
import { Pill } from "./Pill";
import type { Tone } from "./Pill";

interface Props {
  filing: Filing;
  reqs: Requirement[];
  at: string;
  dispatch: Dispatch<Action>;
}

export function RequirementsCard({ filing, reqs, at, dispatch }: Props) {
  const metCount = reqs.filter((r) => r.met).length;
  return (
    <section className="card" aria-labelledby="checks-title">
      <header className="card-head">
        <h2 id="checks-title">Statutory checks</h2>
        <span className="muted">
          {metCount} of {reqs.length} met
        </span>
      </header>
      <ol className="reqs">
        {reqs.map((r) => (
          <RequirementItem key={r.id} req={r} filing={filing} at={at} dispatch={dispatch} />
        ))}
      </ol>
    </section>
  );
}

function RequirementItem({
  req: r,
  filing,
  at,
  dispatch,
}: {
  req: Requirement;
  filing: Filing;
  at: string;
  dispatch: Dispatch<Action>;
}) {
  const tone: Tone = r.met ? "ok" : r.severity === "curable" ? "warn" : "bad";
  const label = r.met ? "Met" : r.severity === "curable" ? "Curable by deadline" : "Would disqualify";
  return (
    <li className={`req req-${tone}`}>
      <div className="req-head">
        <span className="req-title">{r.title}</span>
        <Pill tone={tone}>{label}</Pill>
      </div>
      <div className="req-rule">{r.rule}</div>
      <div className="req-finding">{r.finding}</div>

      {!r.met && (
        <div className="req-action">
          <div>
            <strong>To resolve:</strong> {r.action}
          </div>
          <div className={r.severity === "curable" ? "cure cure-ok" : "cure cure-bad"}>{r.cureBy}</div>
        </div>
      )}

      {!r.met && r.id === "filing-fee" && (
        <FeeCure key={r.shortfall} shortfall={r.shortfall} filing={filing} at={at} dispatch={dispatch} />
      )}
      {!r.met && r.id === "ballot-name" && <BallotNameCure filing={filing} at={at} dispatch={dispatch} />}
      {!r.met && r.id === "residency" && <ReferralCure filing={filing} at={at} dispatch={dispatch} />}
    </li>
  );
}

function FeeCure({
  shortfall,
  filing,
  at,
  dispatch,
}: {
  shortfall: number;
  filing: Filing;
  at: string;
  dispatch: Dispatch<Action>;
}) {
  const [amount, setAmount] = useState(shortfall.toFixed(2));
  const [tender, setTender] = useState<"check" | "cash">("cash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  function record() {
    const value = Math.round(Number(amount) * 100) / 100;
    if (!(value > 0)) {
      setError("Enter the amount received.");
      return;
    }
    if (value > shortfall + 0.001) {
      setError(`The balance is ${money(shortfall)}. Enter no more than that.`);
      return;
    }
    if (!reference.trim()) {
      setError(tender === "cash" ? "Enter the cash receipt number." : "Enter the check number.");
      return;
    }
    dispatch({ type: "payment", id: filing.id, amount: value, tender, reference: reference.trim(), at });
    setReference("");
    setError(null);
  }

  return (
    <div className="inline-cure">
      <div className="inline-cure-title">Record balance paid at the counter</div>
      <div className="inline-row">
        <label className="field">
          <span>Amount ($)</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="field">
          <span>Tender</span>
          <select value={tender} onChange={(e) => setTender(e.target.value as "check" | "cash")}>
            <option value="cash">Cash</option>
            <option value="check">Check</option>
          </select>
        </label>
        <label className="field grow">
          <span>{tender === "cash" ? "Receipt no." : "Check no."}</span>
          <input value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
        <button className="btn primary" onClick={record}>
          Record payment
        </button>
      </div>
      {error && <div className="err">{error}</div>}
    </div>
  );
}

function BallotNameCure({ filing, at, dispatch }: { filing: Filing; at: string; dispatch: Dispatch<Action> }) {
  const [name, setName] = useState(filing.candidate.ballotName);
  const registrationName = filing.voterFile.nameOnFile;
  return (
    <div className="inline-cure">
      <div className="inline-cure-title">Amend the ballot name</div>
      <div className="inline-row">
        <label className="field grow">
          <span>Ballot name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button
          className="btn"
          onClick={() => dispatch({ type: "amendBallot", id: filing.id, name, at })}
        >
          Apply
        </button>
        <button
          className="btn"
          onClick={() => {
            setName(registrationName);
            dispatch({ type: "amendBallot", id: filing.id, name: registrationName, at });
          }}
        >
          Use “{registrationName}”
        </button>
      </div>
      <p className="hint">
        To keep the nickname on the ballot, log a notarized nickname statement under Documents instead.
      </p>
    </div>
  );
}

function ReferralCure({ filing, at, dispatch }: { filing: Filing; at: string; dispatch: Dispatch<Action> }) {
  return (
    <div className="inline-cure">
      <div className="inline-row">
        {filing.referredAt ? (
          <span className="ok-text">Referred to the supervising clerk at {fmtTime(filing.referredAt)}.</span>
        ) : (
          <button className="btn" onClick={() => dispatch({ type: "refer", id: filing.id, at })}>
            Refer to supervising clerk
          </button>
        )}
      </div>
      <p className="hint">
        Before referring, confirm the precinct assignment on the current district map and the address the candidate
        declared.
      </p>
    </div>
  );
}
