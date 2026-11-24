import type { EventEntry, Filing, ReceivedDoc } from "./types";

function doc(
  id: string,
  type: ReceivedDoc["type"],
  receivedAt: string,
  pages: number,
  opts: Partial<ReceivedDoc> = {},
): ReceivedDoc {
  return {
    id,
    type,
    receivedAt,
    pages,
    signed: true,
    notarized: false,
    dated: true,
    amount: null,
    tender: null,
    reference: "",
    signatures: null,
    notes: "",
    ...opts,
  };
}

function fee(id: string, receivedAt: string, amount: number, tender: "check" | "cash", reference: string): ReceivedDoc {
  return doc(id, "fee_payment", receivedAt, 1, { amount, tender, reference, notes: "" });
}

function ev(at: string, text: string): EventEntry {
  return { at, text };
}

/* ------------------------------------------------------------------ */
/* Open at the counter: Q-2026-1187                                    */
/* ------------------------------------------------------------------ */

const filing1187: Filing = {
  id: "Q-2026-1187",
  counter: 3,
  receivedAt: "2026-11-17T10:14:00",
  candidate: {
    legalName: "Roberto L. Quiñones",
    ballotName: "Bobby",
    party: "Democratic",
    dob: "1984-03-22",
    voterId: "0046-40817-2",
    phone: "(916) 555-0148",
    email: "rquinones@example.com",
    residence: "1137 Lantern Ridge Rd, Apt 3B, Millbrook",
    mailing: "PO Box 2281, Millbrook",
    treasurer: "Self-appointed (candidate)",
  },
  office: { title: "State House", district: 47, salary: 29702, feeRate: 0.06 },
  voterFile: {
    voterId: "0046-40817-2",
    nameOnFile: "Roberto L. Quiñones",
    dobOnFile: "1984-03-22",
    addressOnFile: "1137 Lantern Ridge Rd, Apt 3B, Millbrook",
    partyOnFile: "Democratic",
    status: "Active",
    precinct: "46-012",
    district: 46,
    registeredOn: "2019-08-03",
  },
  docs: [
    doc("DOC-1187-01", "candidate_oath", "2026-11-17T10:19:00", 2, {
      notarized: true,
      notes: "Notary seal and commission number present.",
    }),
    doc("DOC-1187-02", "financial_disclosure", "2026-11-17T10:20:00", 6, {
      notes: "Candidate initialed each page.",
    }),
    doc("DOC-1187-03", "loyalty_oath", "2026-11-17T10:21:00", 1),
    fee("DOC-1187-04", "2026-11-17T10:23:00", 1770.12, "check", "2041"),
    doc("DOC-1187-05", "petition_alternative", "2026-11-17T10:24:00", 3, {
      signed: false,
      dated: false,
      signatures: 0,
      notes: "Blank signature sheets. Candidate did not enter signatures.",
    }),
  ],
  events: [
    ev("2026-11-17T10:14:00", "Filing Q-2026-1187 opened at counter 3 (walk-in)."),
    ev("2026-11-17T10:21:00", "Voter-file lookup: precinct 46-012, District 46, registered 2019-08-03."),
    ev("2026-11-17T10:24:00", "Petition alternative logged with 0 signatures."),
    ev("2026-11-17T10:26:00", "Statutory checks run: 3 open items, 1 disqualifying and 2 curable."),
  ],
  referredAt: null,
  noticePrintedAt: null,
};

/* ------------------------------------------------------------------ */
/* Other filings on counter 3's queue                                  */
/* ------------------------------------------------------------------ */

const filing1186: Filing = {
  id: "Q-2026-1186",
  counter: 3,
  receivedAt: "2026-11-17T09:41:00",
  candidate: {
    legalName: "Priya S. Raman",
    ballotName: "Priya S. Raman",
    party: "Democratic",
    dob: "1979-11-02",
    voterId: "0015-22019-6",
    phone: "(916) 555-0163",
    email: "priya.raman@example.com",
    residence: "58 Cedar Hollow Ln, Millbrook",
    mailing: "58 Cedar Hollow Ln, Millbrook",
    treasurer: "Self-appointed (candidate)",
  },
  office: { title: "State House", district: 15, salary: 29702, feeRate: 0.06 },
  voterFile: {
    voterId: "0015-22019-6",
    nameOnFile: "Priya S. Raman",
    dobOnFile: "1979-11-02",
    addressOnFile: "58 Cedar Hollow Ln, Millbrook",
    partyOnFile: "Democratic",
    status: "Active",
    precinct: "15-004",
    district: 15,
    registeredOn: "2008-05-19",
  },
  docs: [
    doc("DOC-1186-01", "candidate_oath", "2026-11-17T09:42:00", 2, { notarized: true }),
    doc("DOC-1186-02", "financial_disclosure", "2026-11-17T09:44:00", 6),
    fee("DOC-1186-03", "2026-11-17T09:46:00", 1782.12, "cash", "CR-7782"),
  ],
  events: [
    ev("2026-11-17T09:41:00", "Filing Q-2026-1186 opened at counter 3 (walk-in)."),
    ev("2026-11-17T09:46:00", "Cash fee of $1,782.12 applied against receipt CR-7782."),
  ],
  referredAt: null,
  noticePrintedAt: null,
};

const filing1180: Filing = {
  id: "Q-2026-1180",
  counter: 1,
  receivedAt: "2026-11-17T08:57:00",
  candidate: {
    legalName: "Wendell A. Price",
    ballotName: "Wendell A. Price",
    party: "Democratic",
    dob: "1968-06-14",
    voterId: "0003-61177-0",
    phone: "(916) 555-0177",
    email: "wprice.filing@example.com",
    residence: "904 Harbor Point Dr, Millbrook",
    mailing: "904 Harbor Point Dr, Millbrook",
    treasurer: "Self-appointed (candidate)",
  },
  office: { title: "State Senate", district: 3, salary: 36500, feeRate: 0.06 },
  voterFile: {
    voterId: "0003-61177-0",
    nameOnFile: "Wendell A. Price",
    dobOnFile: "1968-06-14",
    addressOnFile: "904 Harbor Point Dr, Millbrook",
    partyOnFile: "Democratic",
    status: "Inactive",
    precinct: "03-019",
    district: 3,
    registeredOn: "2011-02-07",
  },
  docs: [
    doc("DOC-1180-01", "candidate_oath", "2026-11-17T09:00:00", 2, { notarized: true }),
    doc("DOC-1180-02", "financial_disclosure", "2026-11-17T09:02:00", 6),
    doc("DOC-1180-03", "loyalty_oath", "2026-11-17T09:03:00", 1),
    fee("DOC-1180-04", "2026-11-17T09:05:00", 2190.0, "check", "5518"),
  ],
  events: [
    ev("2026-11-17T08:57:00", "Filing Q-2026-1180 opened at counter 1 (walk-in)."),
    ev("2026-11-17T09:20:00", "Voter-file lookup: status Inactive. Referred for review."),
  ],
  referredAt: "2026-11-17T09:21:00",
  noticePrintedAt: null,
};

const filing1176: Filing = {
  id: "Q-2026-1176",
  counter: 2,
  receivedAt: "2026-11-17T09:12:00",
  candidate: {
    legalName: "Marisol A. Tran",
    ballotName: "Marisol A. Tran",
    party: "Republican",
    dob: "1990-01-29",
    voterId: "0047-30852-4",
    phone: "(916) 555-0190",
    email: "marisol.tran@example.com",
    residence: "2210 Ferncliff Ave, Millbrook",
    mailing: "2210 Ferncliff Ave, Millbrook",
    treasurer: "Self-appointed (candidate)",
  },
  office: { title: "State House", district: 47, salary: 29702, feeRate: 0.06 },
  voterFile: {
    voterId: "0047-30852-4",
    nameOnFile: "Marisol A. Tran",
    dobOnFile: "1990-01-29",
    addressOnFile: "2210 Ferncliff Ave, Millbrook",
    partyOnFile: "Republican",
    status: "Active",
    precinct: "47-006",
    district: 47,
    registeredOn: "2016-10-11",
  },
  docs: [
    doc("DOC-1176-01", "candidate_oath", "2026-11-17T09:14:00", 2, { notarized: true }),
    doc("DOC-1176-02", "financial_disclosure", "2026-11-17T09:16:00", 6),
    doc("DOC-1176-03", "loyalty_oath", "2026-11-17T09:17:00", 1),
    fee("DOC-1176-04", "2026-11-17T09:19:00", 1782.12, "check", "0412"),
  ],
  events: [ev("2026-11-17T09:12:00", "Filing Q-2026-1176 opened at counter 2 (walk-in).")],
  referredAt: null,
  noticePrintedAt: null,
};

const filing1171: Filing = {
  id: "Q-2026-1171",
  counter: 4,
  receivedAt: "2026-11-17T10:02:00",
  candidate: {
    legalName: "Imani T. Okafor",
    ballotName: "Imani T. Okafor",
    party: "Democratic",
    dob: "1986-09-07",
    voterId: "0022-71904-3",
    phone: "(916) 555-0124",
    email: "imani.okafor@example.com",
    residence: "415 Quarry Hill Rd, Millbrook",
    mailing: "415 Quarry Hill Rd, Millbrook",
    treasurer: "Self-appointed (candidate)",
  },
  office: { title: "State House", district: 22, salary: 29702, feeRate: 0.06 },
  voterFile: {
    voterId: "0022-71904-3",
    nameOnFile: "Imani T. Okafor",
    dobOnFile: "1986-09-07",
    addressOnFile: "415 Quarry Hill Rd, Millbrook",
    partyOnFile: "Democratic",
    status: "Active",
    precinct: "22-031",
    district: 22,
    registeredOn: "2012-04-02",
  },
  docs: [
    doc("DOC-1171-01", "candidate_oath", "2026-11-17T10:04:00", 2, { notarized: false, notes: "Notary block not completed." }),
    doc("DOC-1171-02", "financial_disclosure", "2026-11-17T10:06:00", 6),
    doc("DOC-1171-03", "loyalty_oath", "2026-11-17T10:07:00", 1),
    fee("DOC-1171-04", "2026-11-17T10:09:00", 1782.12, "check", "3320"),
  ],
  events: [
    ev("2026-11-17T10:02:00", "Filing Q-2026-1171 opened at counter 4 (walk-in)."),
    ev("2026-11-17T10:08:00", "Candidate oath returned: notary block not completed."),
  ],
  referredAt: null,
  noticePrintedAt: null,
};

const filing1163: Filing = {
  id: "Q-2026-1163",
  counter: 1,
  receivedAt: "2026-11-17T08:31:00",
  candidate: {
    legalName: "Dana M. Whitcomb",
    ballotName: "Dana M. Whitcomb",
    party: "Democratic",
    dob: "1975-04-18",
    voterId: "0008-44609-1",
    phone: "(916) 555-0109",
    email: "dana.whitcomb@example.com",
    residence: "77 Bayview Terrace, Millbrook",
    mailing: "77 Bayview Terrace, Millbrook",
    treasurer: "Self-appointed (candidate)",
  },
  office: { title: "State Senate", district: 8, salary: 36500, feeRate: 0.06 },
  voterFile: {
    voterId: "0008-44609-1",
    nameOnFile: "Dana M. Whitcomb",
    dobOnFile: "1975-04-18",
    addressOnFile: "77 Bayview Terrace, Millbrook",
    partyOnFile: "Democratic",
    status: "Active",
    precinct: "08-031",
    district: 8,
    registeredOn: "2014-02-11",
  },
  docs: [
    doc("DOC-1163-01", "candidate_oath", "2026-11-17T08:33:00", 2, { notarized: true }),
    doc("DOC-1163-02", "financial_disclosure", "2026-11-17T08:35:00", 6),
    doc("DOC-1163-03", "loyalty_oath", "2026-11-17T08:36:00", 1),
    fee("DOC-1163-04", "2026-11-17T08:38:00", 2190.0, "check", "1877"),
  ],
  events: [ev("2026-11-17T08:31:00", "Filing Q-2026-1163 opened at counter 1 (walk-in).")],
  referredAt: null,
  noticePrintedAt: null,
};

export const INITIAL_ORDER = ["Q-2026-1187", "Q-2026-1186", "Q-2026-1180", "Q-2026-1176", "Q-2026-1171", "Q-2026-1163"];

export const INITIAL_FILINGS: Record<string, Filing> = {
  "Q-2026-1187": filing1187,
  "Q-2026-1186": filing1186,
  "Q-2026-1180": filing1180,
  "Q-2026-1176": filing1176,
  "Q-2026-1171": filing1171,
  "Q-2026-1163": filing1163,
};
