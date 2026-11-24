import type { Filing } from "../domain/types";
import { fmtDateOnly } from "../domain/format";
import { namesMatch } from "../domain/rules";

export function RecordCard({ filing }: { filing: Filing }) {
  const c = filing.candidate;
  const v = filing.voterFile;
  const o = filing.office;
  const districtMismatch = v.district !== o.district;
  const nameFlag = !namesMatch(c.ballotName, v.nameOnFile);
  const addressMatches = c.residence === v.addressOnFile;

  return (
    <section className="card" aria-labelledby="record-title">
      <header className="card-head">
        <h2 id="record-title">Filing record</h2>
        <span className="muted">Filed at counter {filing.counter}</span>
      </header>

      <dl className="kv two">
        <div>
          <dt>Legal name</dt>
          <dd>{c.legalName}</dd>
        </div>
        <div>
          <dt>Ballot name requested</dt>
          <dd className={nameFlag ? "flag" : undefined}>{c.ballotName}</dd>
        </div>
        <div>
          <dt>Party</dt>
          <dd>{c.party}</dd>
        </div>
        <div>
          <dt>Office</dt>
          <dd>
            {o.title}, District {o.district}
          </dd>
        </div>
        <div className="wide">
          <dt>Residence (declared)</dt>
          <dd className={districtMismatch ? "flag" : undefined}>{c.residence}</dd>
        </div>
        <div className="wide">
          <dt>Mailing address</dt>
          <dd>{c.mailing}</dd>
        </div>
        <div>
          <dt>Voter ID</dt>
          <dd className="mono">{c.voterId}</dd>
        </div>
        <div>
          <dt>Date of birth</dt>
          <dd>{fmtDateOnly(c.dob)}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{c.phone}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{c.email}</dd>
        </div>
        <div className="wide">
          <dt>Treasurer appointment</dt>
          <dd>{c.treasurer}</dd>
        </div>
      </dl>

      <div className={`voterfile ${districtMismatch ? "voterfile-flag" : ""}`}>
        <div className="voterfile-title">Voter-file lookup</div>
        {districtMismatch && (
          <p className="voterfile-alert">
            Residence does not match the office. The voter file places precinct {v.precinct} in District {v.district};{" "}
            {o.title} requires District {o.district}.
          </p>
        )}
        <dl className="kv three">
          <div>
            <dt>Precinct</dt>
            <dd className="mono">{v.precinct}</dd>
          </div>
          <div>
            <dt>District on file</dt>
            <dd className={districtMismatch ? "flag" : undefined}>{v.district}</dd>
          </div>
          <div>
            <dt>Registered</dt>
            <dd>{fmtDateOnly(v.registeredOn)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{v.status}</dd>
          </div>
          <div>
            <dt>Party on file</dt>
            <dd>{v.partyOnFile}</dd>
          </div>
          <div>
            <dt>Date of birth on file</dt>
            <dd>{v.dobOnFile === c.dob ? "Matches" : "Does not match"}</dd>
          </div>
          <div className="wide">
            <dt>Address on file</dt>
            <dd>{addressMatches ? "Matches declared residence" : v.addressOnFile}</dd>
          </div>
          <div className="wide">
            <dt>Name on file</dt>
            <dd>{v.nameOnFile}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
