export type DocType =
  | "candidate_oath"
  | "financial_disclosure"
  | "loyalty_oath"
  | "fee_payment"
  | "petition_alternative"
  | "nickname_statement";

export const DOC_LABELS: Record<DocType, string> = {
  candidate_oath: "Candidate oath",
  financial_disclosure: "Financial disclosure form",
  loyalty_oath: "Loyalty oath",
  fee_payment: "Filing fee payment",
  petition_alternative: "Petition alternative (optional)",
  nickname_statement: "Sworn nickname statement",
};

export const DOC_TYPES: DocType[] = [
  "candidate_oath",
  "financial_disclosure",
  "loyalty_oath",
  "fee_payment",
  "nickname_statement",
  "petition_alternative",
];

export interface ReceivedDoc {
  id: string;
  type: DocType;
  /** Local time, "YYYY-MM-DDTHH:mm:ss" */
  receivedAt: string;
  pages: number;
  signed: boolean;
  notarized: boolean;
  dated: boolean;
  /** fee_payment only */
  amount: number | null;
  tender: "check" | "cash" | null;
  /** check number (tender "check") or cash receipt number (tender "cash") */
  reference: string;
  /** petition_alternative only */
  signatures: number | null;
  notes: string;
}

export interface VoterFileRecord {
  voterId: string;
  nameOnFile: string;
  dobOnFile: string;
  addressOnFile: string;
  partyOnFile: string;
  status: "Active" | "Inactive";
  precinct: string;
  district: number;
  /** YYYY-MM-DD */
  registeredOn: string;
}

export interface Candidate {
  legalName: string;
  /** Ballot name as requested; may be amended at the counter */
  ballotName: string;
  party: string;
  /** YYYY-MM-DD */
  dob: string;
  voterId: string;
  phone: string;
  email: string;
  residence: string;
  mailing: string;
  treasurer: string;
}

export interface OfficeInfo {
  title: string;
  district: number;
  /** Annual salary used for the filing fee base */
  salary: number;
  /** Fee as a fraction of salary, e.g. 0.06 */
  feeRate: number;
}

export interface EventEntry {
  /** Local time, "YYYY-MM-DDTHH:mm:ss" */
  at: string;
  text: string;
}

export interface Filing {
  id: string;
  counter: number;
  receivedAt: string;
  candidate: Candidate;
  office: OfficeInfo;
  voterFile: VoterFileRecord;
  docs: ReceivedDoc[];
  events: EventEntry[];
  referredAt: string | null;
  noticePrintedAt: string | null;
}
