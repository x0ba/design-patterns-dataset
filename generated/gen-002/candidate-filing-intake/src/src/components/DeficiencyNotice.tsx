import type { Filing } from "../domain/types";
import { DOC_LABELS } from "../domain/types";
import { docView, dispositionOf } from "../domain/rules";
import type { Requirement } from "../domain/rules";
import { CURE_BY_LABEL, fmtClock, fmtTime, fmtTimeOfDay } from "../domain/format";

interface Props {
  filing: Filing;
  reqs: Requirement[];
  now: Date;
  onPrint: () => void;
  onBack: () => void;
}

export function DeficiencyNotice({ filing, reqs, now, onPrint, onBack }: Props) {
  const disp = dispositionOf(reqs);
  const nothingOpen = disp.kind === "complete";
  const c = filing.candidate;
  const o = filing.office;

  return (
    <div className="notice-wrap">
      <div className="notice-toolbar no-print">
        <button className="btn" onClick={onBack}>
          Back to review
        </button>
        <span className="muted notice-toolbar-note">
          Open items as of {fmtTimeOfDay(now)}. Items cured since review are left off the notice.
        </span>
        <button className="btn primary" onClick={onPrint} disabled={nothingOpen}>
          Print notice
        </button>
      </div>

      {nothingOpen ? (
        <div className="empty no-print">
          {filing.id} has no open deficiencies. There is no notice to print.
        </div>
      ) : (
        <article className="notice-sheet" aria-label="Notice of filing deficiencies">
          <header className="notice-head">
            <div className="notice-agency">Secretary of State · Elections Division</div>
            <h1>Notice of Filing Deficiencies</h1>
            <div className="notice-sub">Primary election · Candidate qualifying</div>
          </header>

          <dl className="notice-fields">
            <div>
              <dt>Filing number</dt>
              <dd>{filing.id}</dd>
            </div>
            <div>
              <dt>Office</dt>
              <dd>
                {o.title}, District {o.district}
              </dd>
            </div>
            <div>
              <dt>Candidate</dt>
              <dd>{c.legalName}</dd>
            </div>
            <div>
              <dt>Ballot name</dt>
              <dd>{c.ballotName}</dd>
            </div>
            <div>
              <dt>Party</dt>
              <dd>{c.party}</dd>
            </div>
            <div>
              <dt>Declared residence</dt>
              <dd>{c.residence}</dd>
            </div>
            <div>
              <dt>Notice issued</dt>
              <dd>{fmtClock(now)}</dd>
            </div>
            <div>
              <dt>Cure deadline</dt>
              <dd className="strong">{CURE_BY_LABEL}</dd>
            </div>
          </dl>

          <section className="notice-section">
            <h2>Section 1. Items that can be cured by the deadline</h2>
            {disp.cur.length === 0 ? (
              <p className="notice-none">None.</p>
            ) : (
              <table className="notice-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Finding</th>
                    <th>Action required</th>
                  </tr>
                </thead>
                <tbody>
                  {disp.cur.map((r) => (
                    <tr key={r.id}>
                      <td>{r.title}</td>
                      <td>{r.finding}</td>
                      <td>{r.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="notice-section">
            <h2>Section 2. Items that would disqualify this filing</h2>
            {disp.disq.length === 0 ? (
              <p className="notice-none">None.</p>
            ) : (
              <table className="notice-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Finding</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {disp.disq.map((r) => (
                    <tr key={r.id}>
                      <td>{r.title}</td>
                      <td>{r.finding}</td>
                      <td>Not curable by the deadline. Would disqualify this filing.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="notice-small">
              Items in Section 2 cannot be cured by filing additional documents or payment before the deadline. If they
              remain unresolved, this filing would be disqualified.
            </p>
          </section>

          <section className="notice-section">
            <h2>Section 3. Documents received at the counter</h2>
            <table className="notice-table">
              <thead>
                <tr>
                  <th>Document no.</th>
                  <th>Document</th>
                  <th>Received</th>
                  <th>Pages</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {filing.docs.map((d) => (
                  <tr key={d.id}>
                    <td className="mono">{d.id}</td>
                    <td>{DOC_LABELS[d.type]}</td>
                    <td>{fmtTime(d.receivedAt)}</td>
                    <td>{d.pages}</td>
                    <td>{docView(d).result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="notice-section">
            <h2>Section 4. Acknowledgement</h2>
            <p className="notice-small">
              The candidate acknowledges receipt of this notice and of the list of documents in Section 3. Items in
              Section 1 must be cured on or before {CURE_BY_LABEL}.
            </p>

            <div className="sign-grid">
              <div className="sign-block">
                <div className="sign-line" />
                <div className="sign-label">Candidate signature</div>
                <div className="sign-sub">Printed name: {c.legalName}</div>
              </div>
              <div className="sign-block">
                <div className="sign-line" />
                <div className="sign-label">Date and time signed</div>
              </div>
              <div className="sign-block">
                <div className="sign-line" />
                <div className="sign-label">Qualifying clerk signature</div>
                <div className="sign-sub">Rosalind Ferreira, Senior Qualifying Clerk</div>
              </div>
            </div>
          </section>

          <footer className="notice-foot">
            {filing.id} · {o.title} District {o.district} · Counter {filing.counter}
          </footer>
        </article>
      )}
    </div>
  );
}
