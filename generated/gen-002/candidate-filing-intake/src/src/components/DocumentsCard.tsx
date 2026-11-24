import { useState } from "react";
import type { Dispatch, FormEvent } from "react";
import type { Action, DocInput } from "../state/store";
import type { DocType, Filing } from "../domain/types";
import { DOC_LABELS, DOC_TYPES } from "../domain/types";
import { docView } from "../domain/rules";
import { fmtTime } from "../domain/format";
import { Pill } from "./Pill";

export function DocumentsCard({ filing, at, dispatch }: { filing: Filing; at: string; dispatch: Dispatch<Action> }) {
  const totalPages = filing.docs.reduce((n, d) => n + d.pages, 0);
  return (
    <section className="card" aria-labelledby="docs-title">
      <header className="card-head">
        <h2 id="docs-title">Documents received</h2>
        <span className="muted">
          {filing.docs.length} logged · {totalPages} pages
        </span>
      </header>

      <table className="doc-table">
        <thead>
          <tr>
            <th scope="col">Document</th>
            <th scope="col">Received</th>
            <th scope="col">Pages</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {filing.docs.map((d) => {
            const v = docView(d);
            const tone = v.tone === "ok" ? "ok" : v.tone === "bad" ? "bad" : "info";
            return (
              <tr key={d.id}>
                <td>
                  <div className="doc-name">{DOC_LABELS[d.type]}</div>
                  <div className="doc-id mono">{d.id}</div>
                  <div className="chips">
                    {v.checks.map((c) => (
                      <span
                        key={c.label}
                        className={`chip ${c.info ? "chip-info" : c.ok ? "chip-ok" : "chip-bad"}`}
                      >
                        {c.info ? "•" : c.ok ? "✓" : "✕"} {c.label}
                      </span>
                    ))}
                  </div>
                  {d.notes && <div className="doc-note">{d.notes}</div>}
                </td>
                <td className="mono">{fmtTime(d.receivedAt)}</td>
                <td>{d.pages}</td>
                <td>
                  <Pill tone={tone}>{v.result}</Pill>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <LogDocumentForm filingId={filing.id} at={at} dispatch={dispatch} />
    </section>
  );
}

interface FormState {
  type: DocType;
  pages: string;
  signed: boolean;
  notarized: boolean;
  dated: boolean;
  amount: string;
  tender: "check" | "cash";
  reference: string;
  signatures: string;
  notes: string;
}

const EMPTY: FormState = {
  type: "candidate_oath",
  pages: "1",
  signed: false,
  notarized: false,
  dated: false,
  amount: "",
  tender: "check",
  reference: "",
  signatures: "0",
  notes: "",
};

function LogDocumentForm({ filingId, at, dispatch }: { filingId: string; at: string; dispatch: Dispatch<Action> }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const isFee = form.type === "fee_payment";
  const isPetition = form.type === "petition_alternative";
  const hasNotary = form.type === "candidate_oath" || form.type === "nickname_statement";
  const hasDated = form.type === "financial_disclosure";

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const pages = Number.parseInt(form.pages, 10);
    if (!Number.isFinite(pages) || pages < 1) {
      setError("Enter the page count, 1 or more.");
      return;
    }
    let input: DocInput = {
      type: form.type,
      pages,
      signed: form.signed,
      notarized: hasNotary ? form.notarized : false,
      dated: hasDated ? form.dated : true,
      amount: null,
      tender: null,
      reference: "",
      signatures: null,
      notes: form.notes.trim(),
    };
    if (isFee) {
      const amount = Number(form.amount);
      if (!(amount > 0)) {
        setError("Enter the amount received, in dollars.");
        return;
      }
      if (!form.reference.trim()) {
        setError(form.tender === "cash" ? "Enter the cash receipt number." : "Enter the check number.");
        return;
      }
      input = {
        ...input,
        signed: true,
        dated: true,
        amount: Math.round(amount * 100) / 100,
        tender: form.tender,
        reference: form.reference.trim(),
      };
    }
    if (isPetition) {
      const n = Number.parseInt(form.signatures, 10);
      if (!(n >= 0)) {
        setError("Enter the number of signatures, 0 or more.");
        return;
      }
      input = { ...input, signed: false, dated: false, signatures: n };
    }
    dispatch({ type: "logDoc", id: filingId, input, at });
    setSaved(`Logged ${DOC_LABELS[form.type]}. Checks re-run.`);
    setError(null);
    setForm((f) => ({ ...EMPTY, type: f.type, pages: f.pages }));
  }

  return (
    <form className="log-form" onSubmit={submit} noValidate>
      <div className="log-title">Log a document received</div>
      <div className="form-grid">
        <label className="field span-2">
          <span>Document</span>
          <select value={form.type} onChange={(e) => update("type", e.target.value as DocType)}>
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOC_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Pages</span>
          <input
            type="number"
            min={1}
            value={form.pages}
            onChange={(e) => update("pages", e.target.value)}
          />
        </label>

        {!isFee && !isPetition && (
          <div className="field span-3 checks-row">
            <span>Checks</span>
            <label className="check">
              <input type="checkbox" checked={form.signed} onChange={(e) => update("signed", e.target.checked)} />
              Signed
            </label>
            {hasNotary && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.notarized}
                  onChange={(e) => update("notarized", e.target.checked)}
                />
                Notarized
              </label>
            )}
            {hasDated && (
              <label className="check">
                <input type="checkbox" checked={form.dated} onChange={(e) => update("dated", e.target.checked)} />
                Dated
              </label>
            )}
          </div>
        )}

        {isFee && (
          <>
            <label className="field">
              <span>Amount received ($)</span>
              <input
                inputMode="decimal"
                value={form.amount}
                placeholder="0.00"
                onChange={(e) => update("amount", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Tender</span>
              <select value={form.tender} onChange={(e) => update("tender", e.target.value as "check" | "cash")}>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
              </select>
            </label>
            <label className="field">
              <span>{form.tender === "cash" ? "Receipt no." : "Check no."}</span>
              <input value={form.reference} onChange={(e) => update("reference", e.target.value)} />
            </label>
          </>
        )}

        {isPetition && (
          <label className="field">
            <span>Signatures entered</span>
            <input
              type="number"
              min={0}
              value={form.signatures}
              onChange={(e) => update("signatures", e.target.value)}
            />
          </label>
        )}

        <label className="field span-3">
          <span>Notes (optional)</span>
          <input value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </label>
      </div>

      <div className="log-foot">
        <div className="log-msg" role="alert">
          {error && <span className="err">{error}</span>}
          {!error && saved && <span className="ok-text">{saved}</span>}
        </div>
        <button type="submit" className="btn primary">
          Log document
        </button>
      </div>
    </form>
  );
}
