import { DOC_LABELS } from "./types";
import type { DocType, Filing, ReceivedDoc } from "./types";
import { CURE_BY_LABEL, fmtDateOnly, fmtTime, money } from "./format";

export type Severity = "curable" | "disqualifying";

export interface Requirement {
  id: string;
  title: string;
  /** The rule as applied, in plain words */
  rule: string;
  met: boolean;
  /** Only meaningful when !met */
  severity: Severity;
  finding: string;
  action: string;
  cureBy: string;
  /** Fee requirement only: amount still owed */
  shortfall: number;
}

export interface DocCheck {
  label: string;
  ok: boolean;
  /** Informational only: shown neutrally and not counted as pass or fail */
  info?: boolean;
}

export interface DocView {
  checks: DocCheck[];
  tone: "ok" | "bad" | "info";
  result: string;
}

const CURE_BY_TEXT = `Cure by ${CURE_BY_LABEL}`;
const NOT_CURABLE_TEXT = "Not curable by the deadline. Disqualifies filing.";

function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function namesMatch(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

export function latestDoc(filing: Filing, type: DocType): ReceivedDoc | undefined {
  const matches = filing.docs.filter((d) => d.type === type);
  return matches[matches.length - 1];
}

export function feeRequired(filing: Filing): number {
  return Math.round(filing.office.salary * filing.office.feeRate * 100) / 100;
}

export function feePaid(filing: Filing): number {
  const total = filing.docs
    .filter((d) => d.type === "fee_payment")
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);
  return Math.round(total * 100) / 100;
}

export function nicknameStatementOnFile(filing: Filing): boolean {
  const d = latestDoc(filing, "nickname_statement");
  return !!d && d.signed && d.notarized;
}

/** Document-completeness requirement: the latest document of a type must pass its gap check. */
function documentRequirement(
  filing: Filing,
  o: {
    id: string;
    title: string;
    rule: string;
    type: DocType;
    gaps: (d: ReceivedDoc) => string[];
    missingAction: string;
  },
): Requirement {
  const doc = latestDoc(filing, o.type);
  if (!doc) {
    return {
      id: o.id,
      title: o.title,
      rule: o.rule,
      met: false,
      severity: "curable",
      finding: "Not received.",
      action: o.missingAction,
      cureBy: CURE_BY_TEXT,
      shortfall: 0,
    };
  }
  const gaps = o.gaps(doc);
  const met = gaps.length === 0;
  return {
    id: o.id,
    title: o.title,
    rule: o.rule,
    met,
    severity: "curable",
    finding: met
      ? `Received ${fmtTime(doc.receivedAt)}. Passes all checks.`
      : `Received ${fmtTime(doc.receivedAt)}, but ${gaps.join(" and ")}.`,
    action: met ? "None." : o.missingAction,
    cureBy: CURE_BY_TEXT,
    shortfall: 0,
  };
}

/** Evaluates every statutory requirement against the filing's current data. */
export function evaluate(filing: Filing): Requirement[] {
  const { candidate, office, voterFile } = filing;
  const requirements: Requirement[] = [];

  requirements.push(
    documentRequirement(filing, {
      id: "candidate-oath",
      title: "Candidate oath",
      rule: "Candidate oath must be signed and notarized.",
      type: "candidate_oath",
      gaps: (d) => [!d.signed && "unsigned", !d.notarized && "not notarized"].filter((x): x is string => Boolean(x)),
      missingAction: "Obtain a signed, notarized candidate oath before the deadline.",
    }),
  );

  requirements.push(
    documentRequirement(filing, {
      id: "financial-disclosure",
      title: "Financial disclosure",
      rule: "Financial disclosure form must be signed and dated.",
      type: "financial_disclosure",
      gaps: (d) => [!d.signed && "unsigned", !d.dated && "undated"].filter((x): x is string => Boolean(x)),
      missingAction: "Obtain a signed, dated financial disclosure form before the deadline.",
    }),
  );

  requirements.push(
    documentRequirement(filing, {
      id: "loyalty-oath",
      title: "Loyalty oath",
      rule: "Loyalty oath must be signed.",
      type: "loyalty_oath",
      gaps: (d) => (d.signed ? [] : ["unsigned"]),
      missingAction: "Obtain a signed loyalty oath before the deadline.",
    }),
  );

  const required = feeRequired(filing);
  const paid = feePaid(filing);
  const shortfall = Math.max(0, Math.round((required - paid) * 100) / 100);
  const feeMet = paid >= required;
  requirements.push({
    id: "filing-fee",
    title: "Filing fee",
    rule: `Filing fee is ${Math.round(office.feeRate * 100)}% of the ${office.title} salary of ${money(office.salary)}, so ${money(required)}.`,
    met: feeMet,
    severity: "curable",
    finding: feeMet
      ? `Paid ${money(paid)} against ${money(required)} required.`
      : `Paid ${money(paid)} against ${money(required)} required. Short by ${money(shortfall)}.`,
    action: feeMet
      ? "None."
      : `Collect the ${money(shortfall)} balance and log it as a fee payment.`,
    cureBy: CURE_BY_TEXT,
    shortfall,
  });

  const registrationName = voterFile.nameOnFile;
  const nameMatches = namesMatch(candidate.ballotName, registrationName) || namesMatch(candidate.ballotName, candidate.legalName);
  const nickname = nicknameStatementOnFile(filing);
  const ballotMet = nameMatches || nickname;
  requirements.push({
    id: "ballot-name",
    title: "Ballot name",
    rule: "Ballot name must match the registration name. A nickname is allowed only with a sworn statement.",
    met: ballotMet,
    severity: "curable",
    finding: nameMatches
      ? "Ballot name matches the registration name."
      : nickname
        ? "Nickname on the ballot is supported by a sworn nickname statement."
        : `Ballot name "${candidate.ballotName}" differs from the registration name "${registrationName}", and no sworn nickname statement is on file.`,
    action: ballotMet
      ? "None."
      : "File a sworn nickname statement, or amend the ballot name to the registration name.",
    cureBy: CURE_BY_TEXT,
    shortfall: 0,
  });

  const districtMet = voterFile.district === office.district;
  requirements.push({
    id: "residency",
    title: "Residence in district",
    rule: `Residence must be in ${office.title} District ${office.district} at qualifying.`,
    met: districtMet,
    severity: "disqualifying",
    finding: districtMet
      ? `Residence is in precinct ${voterFile.precinct}, District ${voterFile.district}.`
      : `Declared residence ${candidate.residence} is in precinct ${voterFile.precinct}, which the voter file assigns to District ${voterFile.district}. The office requires District ${office.district}.`,
    action: districtMet
      ? "None."
      : "Confirm the precinct assignment on the current district map, then refer to the supervising clerk. Do not accept by amendment.",
    cureBy: NOT_CURABLE_TEXT,
    shortfall: 0,
  });

  const registrationActive = voterFile.status === "Active";
  requirements.push({
    id: "registration",
    title: "Voter registration",
    rule: "Candidate must be an active registered voter.",
    met: registrationActive,
    severity: "disqualifying",
    finding: registrationActive
      ? `Active since ${fmtDateOnly(voterFile.registeredOn)}.`
      : `Voter file status is ${voterFile.status}.`,
    action: registrationActive ? "None." : "Refer to the supervising clerk.",
    cureBy: NOT_CURABLE_TEXT,
    shortfall: 0,
  });

  return requirements;
}

export type Disposition = "complete" | "deficient" | "disqualifying";

export interface DispositionResult {
  kind: Disposition;
  disq: Requirement[];
  cur: Requirement[];
  openCount: number;
}

export function dispositionOf(reqs: Requirement[]): DispositionResult {
  const open = reqs.filter((r) => !r.met);
  const disq = open.filter((r) => r.severity === "disqualifying");
  const cur = open.filter((r) => r.severity === "curable");
  const kind: Disposition = disq.length > 0 ? "disqualifying" : cur.length > 0 ? "deficient" : "complete";
  return { kind, disq, cur, openCount: open.length };
}

export const DISPOSITION_TEXT: Record<Disposition, string> = {
  complete: "Complete",
  deficient: "Deficient, curable",
  disqualifying: "Disqualifying defect",
};

export function docView(doc: ReceivedDoc): DocView {
  switch (doc.type) {
    case "candidate_oath": {
      const checks = [
        { label: "Signed", ok: doc.signed },
        { label: "Notarized", ok: doc.notarized },
      ];
      const ok = checks.every((c) => c.ok);
      return { checks, tone: ok ? "ok" : "bad", result: ok ? "Accepted" : "Defective" };
    }
    case "financial_disclosure": {
      const checks = [
        { label: "Signed", ok: doc.signed },
        { label: "Dated", ok: doc.dated },
      ];
      const ok = checks.every((c) => c.ok);
      return { checks, tone: ok ? "ok" : "bad", result: ok ? "Accepted" : "Defective" };
    }
    case "loyalty_oath": {
      const checks = [{ label: "Signed", ok: doc.signed }];
      return { checks, tone: doc.signed ? "ok" : "bad", result: doc.signed ? "Accepted" : "Defective" };
    }
    case "fee_payment": {
      const tender = doc.tender === "cash" ? `Cash receipt ${doc.reference}` : `Check #${doc.reference}`;
      return {
        checks: [
          { label: `${money(doc.amount ?? 0)} applied`, ok: (doc.amount ?? 0) > 0 },
          { label: tender, ok: true },
        ],
        tone: "ok",
        result: "Applied to fee",
      };
    }
    case "nickname_statement": {
      const checks = [
        { label: "Signed", ok: doc.signed },
        { label: "Notarized (sworn)", ok: doc.notarized },
      ];
      const ok = checks.every((c) => c.ok);
      return { checks, tone: ok ? "ok" : "bad", result: ok ? "Accepted" : "Not sworn" };
    }
    case "petition_alternative": {
      const n = doc.signatures ?? 0;
      return {
        checks: [{ label: `${n} signature${n === 1 ? "" : "s"} entered`, ok: true, info: true }],
        tone: "info",
        result: "Optional · not counted",
      };
    }
  }
}

export function docTypeLabel(type: DocType): string {
  return DOC_LABELS[type];
}
