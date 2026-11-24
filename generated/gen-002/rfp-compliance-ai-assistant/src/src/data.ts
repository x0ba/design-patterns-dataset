// Mock workspace data for Bidwright — RFP No. 2026-114, City of Port Ellery.

export type DocId = 'RFP' | 'A1' | 'A2';
export type Status = 'addressed' | 'partial' | 'missing';
export type Mand = 'Mandatory' | 'Desirable';
export type Crit = 'T' | 'E' | 'P' | 'L' | 'R';
export type PersonId = 'leah' | 'marcus' | 'priya' | 'tom' | 'janelle';
export type Review = 'unreviewed' | 'accepted' | 'corrected' | 'rejected' | 'removed';

export const NOW_BASE = new Date(2026, 10, 17, 10, 4, 0); // Tue Nov 17 2026, 10:04 AM
export const DUE = new Date(2026, 10, 20, 14, 0, 0); // Fri Nov 20 2026, 2:00 PM
export const INTERNAL_DUE_OPTIONS = [
  'Wed Nov 18, 5:00 PM',
  'Thu Nov 19, 10:00 AM',
  'Thu Nov 19, 12:00 PM',
  'Thu Nov 19, 5:00 PM',
];
export const DEFAULT_INTERNAL_DUE = 'Thu Nov 19, 12:00 PM';

export const BID = {
  firm: 'Kestrel Point Engineering',
  agency: 'City of Port Ellery',
  dept: 'Department of Innovation & Technology',
  rfpNo: '2026-114',
  title: '311 Service Request Management System Replacement',
  draft: 'Draft response v6',
  draftUpdated: 'Mon Nov 16, 5:48 PM',
};

export const CRITERIA: Record<Crit, { label: string; short: string; weight: number | null }> = {
  T: { label: 'Technical approach', short: 'Technical', weight: 40 },
  E: { label: 'Experience & qualifications', short: 'Experience', weight: 25 },
  P: { label: 'Price', short: 'Price', weight: 25 },
  L: { label: 'Local participation', short: 'Local', weight: 10 },
  R: { label: 'Responsiveness (pass/fail)', short: 'Pass/fail', weight: null },
};

export interface Person {
  id: PersonId;
  name: string;
  initials: string;
  role: string;
  owns: string;
  color: string;
}

export const PEOPLE: Record<PersonId, Person> = {
  leah: { id: 'leah', name: 'Leah Ostrowski', initials: 'LO', role: 'Proposal Manager', owns: 'Transmittal, §1', color: '#5b4b8a' },
  marcus: { id: 'marcus', name: 'Marcus Delgado', initials: 'MD', role: 'Senior Solutions Architect', owns: 'Technical approach · §3–5', color: '#1f6f78' },
  priya: { id: 'priya', name: 'Priya Raman', initials: 'PR', role: 'Operations Director', owns: 'Staffing & experience · §2, §6', color: '#8a5a1f' },
  tom: { id: 'tom', name: 'Tom Becker', initials: 'TB', role: 'Controller', owns: 'Pricing · §8', color: '#3d6b2f' },
  janelle: { id: 'janelle', name: 'Janelle Fortier', initials: 'JF', role: 'Contracts Administrator', owns: 'Forms & contracts · §7, §9', color: '#9a3d4f' },
};
export const TEAM: PersonId[] = ['marcus', 'priya', 'tom', 'janelle'];

export interface DraftSection {
  id: string;
  title: string;
  pages: [number, number];
  owner: PersonId;
  summary: string;
}

export const DRAFT_OUTLINE: DraftSection[] = [
  { id: 'T', title: 'Transmittal Letter', pages: [1, 2], owner: 'leah', summary: 'Signed by Daniel Okafor, President. Point of contact, validity, conflicts, acknowledgments.' },
  { id: '1', title: 'Executive Summary', pages: [3, 4], owner: 'leah', summary: 'Win themes, response organization, compliance matrix reference (Appendix B).' },
  { id: '2.1', title: 'Company Overview', pages: [5, 5], owner: 'priya', summary: 'History since 2009, 11 staff, Port Ellery HQ, Rivermark GIS subcontract (~18%).' },
  { id: '2.2', title: 'Relevant Projects', pages: [6, 7], owner: 'priya', summary: 'Kelso Bay 311 (2024), Tamarack County permitting CRM (2023), NPUD outage portal (2022).' },
  { id: '2.3', title: 'References', pages: [8, 8], owner: 'priya', summary: 'Three references with contact names and contract values.' },
  { id: '2.4', title: 'Financial Capacity', pages: [9, 9], owner: 'priya', summary: 'Reviewed financial statements FY2025 available on request; bonding capacity.' },
  { id: '3.1', title: 'Solution Overview', pages: [10, 10], owner: 'marcus', summary: 'Platform architecture, sizing assumptions, retained City systems.' },
  { id: '3.2', title: 'Intake Channels & Resident Experience', pages: [11, 12], owner: 'marcus', summary: 'Web, app, phone, email, SMS intake; attachments; acknowledgments; knowledge base.' },
  { id: '3.3', title: 'Case Management & Routing', pages: [13, 14], owner: 'marcus', summary: 'Routing rules, SLA tracking, escalation, case merge, internal notes.' },
  { id: '3.4', title: 'Mobile Applications', pages: [15, 15], owner: 'marcus', summary: 'Resident and field worker apps for iOS/Android, push notifications.' },
  { id: '3.5', title: 'GIS & Integrations', pages: [16, 17], owner: 'marcus', summary: 'ArcGIS Enterprise, Cityworks AMS, Open311, REST API, Amazon Connect.' },
  { id: '3.6', title: 'Reporting & Analytics', pages: [18, 18], owner: 'marcus', summary: 'Dashboards, 40 standard reports, scheduled exports, Socrata publishing.' },
  { id: '3.7', title: 'Hosting & Security', pages: [19, 20], owner: 'marcus', summary: 'FedRAMP Moderate hosting, SSO/MFA, encryption, backups, data ownership.' },
  { id: '3.8', title: 'Accessibility & Language', pages: [21, 21], owner: 'marcus', summary: 'WCAG conformance statement, screen reader support, language support.' },
  { id: '3.9', title: 'Data Migration', pages: [22, 22], owner: 'marcus', summary: 'Lagan extraction toolkit, mapping, trial migrations, reconciliation.' },
  { id: '4.1', title: 'Project Management Approach', pages: [23, 23], owner: 'marcus', summary: 'Methodology, weekly status meetings, issue and risk tracking.' },
  { id: '4.2', title: 'Schedule & Testing', pages: [24, 25], owner: 'marcus', summary: '40-week schedule to go-live Aug 2027, UAT approach, training timing.' },
  { id: '4.3', title: 'Training', pages: [26, 26], owner: 'marcus', summary: 'Train-the-trainer, admin training, documentation and quick guides.' },
  { id: '4.4', title: 'Change Management & Go-Live', pages: [27, 27], owner: 'marcus', summary: 'Department workflow mapping, staff communications plan, hypercare, on-site support.' },
  { id: '4.5', title: 'Risk Management', pages: [28, 28], owner: 'marcus', summary: 'Risk register with six top project risks and mitigations.' },
  { id: '5.1', title: 'Support Model', pages: [29, 29], owner: 'marcus', summary: 'Tier 2/3 support, account manager, US-based staff, sustainment staffing.' },
  { id: '5.2', title: 'Service Levels', pages: [30, 30], owner: 'marcus', summary: 'Availability, response times, maintenance windows, service credits, reporting.' },
  { id: '5.3', title: 'Upgrades & Transition', pages: [31, 31], owner: 'marcus', summary: 'Included releases, notice periods, roadmap, end-of-contract transition.' },
  { id: '6.1', title: 'Organization Chart', pages: [32, 32], owner: 'priya', summary: 'Project org chart with City and Kestrel Point roles.' },
  { id: '6.2', title: 'Key Personnel', pages: [33, 33], owner: 'priya', summary: 'PM, lead consultant, migration lead; no-substitution commitment.' },
  { id: '6.3', title: 'Resumes', pages: [34, 35], owner: 'priya', summary: 'Two-page resumes for three key personnel.' },
  { id: '7.1', title: 'Contract Exceptions', pages: [36, 36], owner: 'janelle', summary: 'Two exceptions to Exhibit B; Exhibit F accepted.' },
  { id: '7.2', title: 'Insurance', pages: [37, 38], owner: 'janelle', summary: 'Coverage limits by line; broker letter from Cascade Risk Partners.' },
  { id: '8', title: 'Pricing Summary', pages: [39, 40], owner: 'tom', summary: 'Five-year total cost, implementation fee, escalation cap.' },
  { id: '9', title: 'Required Forms Index', pages: [41, 41], owner: 'janelle', summary: 'Index of forms in the forms package: A, C, P-1.' },
];
export const draftSection = (id: string | null) => DRAFT_OUTLINE.find((s) => s.id === id) || null;

export interface SourceDoc {
  id: DocId | 'DRAFT' | 'FORMS';
  name: string;
  short: string;
  date: string;
  pages: number;
  note: string;
}

export const DOCS: SourceDoc[] = [
  { id: 'RFP', name: 'RFP No. 2026-114 — 311 Service Request Management System Replacement', short: 'RFP', date: 'Issued Oct 26, 2026', pages: 84, note: '9 sections' },
  { id: 'A1', name: 'Addendum No. 1', short: 'Addendum 1', date: 'Nov 9, 2026', pages: 3, note: 'Page limit, migration volume, conference attendees' },
  { id: 'A2', name: 'Addendum No. 2', short: 'Addendum 2', date: 'Nov 13, 2026', pages: 5, note: 'GL insurance $2M, Form LBP-1, answers to 18 questions' },
  { id: 'DRAFT', name: 'Kestrel Point draft response v6', short: 'Draft v6', date: 'Nov 16, 2026, 5:48 PM', pages: 41, note: '9 sections + transmittal' },
  { id: 'FORMS', name: 'City required forms (A, C, D, P-1)', short: 'Forms', date: 'Issued with RFP', pages: 10, note: '4 forms' },
];

export const RFP_SECTIONS: Record<string, string> = {
  '1': 'General Information',
  '2': 'Instructions to Proposers',
  '3': 'Background & Current Environment',
  '4': 'Scope of Work — Functional Requirements',
  '5': 'Technical Requirements',
  '6': 'Implementation, Training & Support',
  '7': 'Contract Terms & Insurance',
  '8': 'Proposal Format & Evaluation',
  '9': 'Pricing & Required Forms',
};

export interface Supersedes {
  doc: DocId;
  ref: string;
  page: number;
  text: string;
}

export interface Requirement {
  id: string;
  doc: DocId;
  sec: string;
  page: number;
  title: string;
  text: string; // the model's extracted quote
  actual?: string; // the true source paragraph, when it differs from the quote
  mand: Mand;
  crit: Crit;
  passFail: boolean;
  draftSec: string | null;
  draftPage: number | null;
  excerpt: string | null;
  status: Status;
  conf: number;
  reasoning: string;
  basis?: 'document'; // satisfied by the document itself rather than a section
  conflict?: boolean;
  supersedes?: Supersedes;
  suggestedOwner: PersonId | null;
}

type Extra = Partial<Pick<Requirement, 'actual' | 'basis' | 'conflict' | 'supersedes' | 'suggestedOwner' | 'passFail'>>;
type Row = [DocId, string, number, string, string, 'M' | 'D', Crit, string | null, number | null, string | null, 'A' | 'P' | 'X', number, string, Extra?];

const ROWS: Row[] = [
  // ── Section 1 · General Information ─────────────────────────────
  ['RFP', '1.3', 3, 'Proposal due date and time', 'Proposals must be received no later than 2:00 p.m. Pacific Time on Friday, November 20, 2026.', 'M', 'R', 'T', 1, 'This proposal is submitted in response to RFP No. 2026-114 ahead of the November 20, 2026, 2:00 p.m. deadline.', 'A', 0.95, 'Submission deadline is a process requirement; transmittal confirms the date. Satisfied on timely upload.'],
  ['RFP', '1.4', 3, 'Communications only through Procurement Officer', 'Proposers shall direct all communications regarding this RFP to the Procurement Officer named in this Section; contact with other City staff regarding this RFP may result in disqualification.', 'M', 'R', 'T', 1, 'Kestrel Point acknowledges the communication restrictions in Section 1.4 and has directed all inquiries to Ms. Dana Whitcomb, Procurement Officer.', 'A', 0.9, 'Transmittal acknowledges the restriction and names the Procurement Officer.'],
  ['RFP', '1.5', 4, 'Registered in eProcurement portal', 'Proposer must be registered as a supplier in the City’s eProcurement portal prior to submission.', 'M', 'R', '9', 41, 'Kestrel Point is registered in the City’s eProcurement portal (Supplier ID PE-0048812).', 'A', 0.97, 'Forms index states the supplier ID.'],
  ['RFP', '1.6', 5, 'City business license', 'Proposer shall hold a current City of Port Ellery business license or obtain one within ten (10) days of notice of intent to award.', 'M', 'R', '9', 41, 'City of Port Ellery business license No. BL-2019-03374, valid through December 31, 2026.', 'A', 0.96, 'License number and validity date given.'],
  ['RFP', '1.7', 6, 'Proposal valid 120 days', 'Proposals shall remain valid for one hundred twenty (120) days following the proposal due date.', 'M', 'R', 'T', 2, 'This proposal remains valid for 120 days from November 20, 2026.', 'A', 0.98, 'Exact commitment stated in transmittal.'],
  ['RFP', '1.8', 7, 'Conflict of interest disclosure', 'Proposer shall disclose any actual or potential conflict of interest with the City, its officers, or employees.', 'M', 'R', 'T', 2, 'Kestrel Point has no actual or potential conflicts of interest with the City of Port Ellery, its officers, or employees.', 'A', 0.94, 'Explicit no-conflict statement satisfies the disclosure requirement.'],

  // ── Section 2 · Instructions to Proposers ───────────────────────
  ['RFP', '2.1(a)', 9, 'Electronic submission only', 'Proposals shall be submitted electronically through the City’s eProcurement portal; emailed, faxed, or hard-copy proposals will not be accepted.', 'M', 'R', '9', 41, 'This proposal and all required forms are submitted through the City’s eProcurement portal.', 'A', 0.95, 'Forms index confirms portal submission.'],
  ['RFP', '2.1(b)', 9, 'Separate technical and price PDFs', 'The technical proposal and the price proposal shall be uploaded as separate PDF files.', 'M', 'R', '8', 39, 'Per Section 2.1(b), the price proposal (Form P-1 and supporting detail) is uploaded as a separate PDF.', 'A', 0.93, 'Pricing section states the separate upload.'],
  ['RFP', '2.2', 9, 'Single point of contact with signing authority', 'Each Proposer shall designate a single point of contact for the duration of the procurement who is authorized to bind the Proposer contractually.', 'M', 'R', 'T', 1, 'Daniel Okafor, President, is Kestrel Point’s single point of contact for this procurement and is authorized to bind the firm contractually.', 'A', 0.92, 'Transmittal names a single contact with binding authority.'],
  ['RFP', '2.3', 10, 'Pre-proposal conference attendance', 'Attendance at the pre-proposal conference on November 3, 2026 is strongly encouraged but is not mandatory.', 'D', 'R', 'T', 2, 'Kestrel Point attended the November 3, 2026 pre-proposal conference.', 'A', 0.88, 'Transmittal confirms attendance.'],
  ['RFP', '2.4', 10, 'Questions in writing by Nov 6', 'All questions regarding this RFP must be submitted in writing through the eProcurement portal no later than 5:00 p.m. on November 6, 2026.', 'M', 'R', 'T', 2, 'Kestrel Point submitted four written questions through the portal on November 4, 2026.', 'A', 0.86, 'Process requirement; transmittal confirms questions were submitted in writing before the deadline.'],
  ['RFP', '2.5', 11, 'Follow Section 8.2 order and headings', 'Proposals shall be organized in the order set forth in Section 8.2 and shall use the section headings provided.', 'M', 'R', '1', 3, 'This response follows the order and headings prescribed in Section 8.2 of the RFP.', 'A', 0.9, 'Draft outline matches Section 8.2 order; heading text checked against the RFP.'],
  ['RFP', '2.6', 11, 'Identify subcontractors and work share', 'Proposer shall identify any subcontractors to be used and the percentage of work each will perform.', 'M', 'R', '2.1', 5, 'Kestrel Point will subcontract GIS configuration and data conversion, approximately 18% of contract value, to Rivermark GIS, LLC of Port Ellery.', 'A', 0.87, 'Company overview names the subcontractor and its work share.'],
  ['RFP', '2.7', 12, 'No marketing materials', 'Proposers shall not include marketing materials, brochures, or promotional content in the proposal.', 'M', 'R', null, null, null, 'A', 0.84, 'Checked all 41 pages of draft v6: no brochures, product sheets, or promotional inserts. Satisfied by absence.', { basis: 'document' }],
  ['RFP', '2.8', 12, 'Mark confidential information', 'Any information the Proposer considers confidential or proprietary shall be clearly marked on each page and listed in Section 4 of Form A.', 'M', 'R', '9', 41, 'No portion of this proposal is designated confidential; Form A, Section 4 is marked “None.”', 'A', 0.91, 'Forms index states nothing is designated confidential.'],
  ['RFP', '2.9', 13, 'Proposer bears preparation costs', 'Proposer shall bear all costs associated with the preparation and submission of its proposal.', 'M', 'R', 'T', 2, 'Kestrel Point acknowledges that it bears all costs of preparing and submitting this proposal.', 'A', 0.89, 'Acknowledged in transmittal.'],
  ['RFP', '2.10', 13, 'State exceptions to contract terms', 'Proposer shall state any exceptions to the City’s standard contract terms (Exhibit B) in its proposal; exceptions not stated will be deemed waived.', 'M', 'R', '7.1', 36, 'Kestrel Point takes two exceptions to Exhibit B: (1) Section 11, limitation of liability, and (2) Section 14.3, termination for convenience notice period.', 'A', 0.94, 'Exceptions are listed explicitly in §7.1.'],
  ['RFP', '2.11', 14, 'Signed by authorized individual', 'Proposals must be signed by an individual authorized to bind the Proposer.', 'M', 'R', 'T', 2, 'Signed: Daniel Okafor, President, Kestrel Point Engineering.', 'A', 0.95, 'Transmittal signature block names an officer with binding authority.'],
  ['RFP', '2.12', 14, 'EIN and UEI on Form A', 'Proposer shall provide its federal Employer Identification Number and Unique Entity ID (UEI) on Form A.', 'M', 'R', '9', 41, 'Form A, Proposer Information, lists EIN 47-2210945 and UEI K7PEL2VN4QX3.', 'A', 0.96, 'Both identifiers listed.'],
  ['RFP', '2.13', 15, 'Financial capacity statement', 'Proposer shall include a statement of financial capacity and shall provide its most recent audited or reviewed financial statements upon request.', 'M', 'R', '2.4', 9, 'Kestrel Point’s reviewed financial statements for FY2025 are available to the City upon request. The firm has no debt and a $2.5M line of credit.', 'A', 0.88, 'Financial capacity section provides statement and offers statements on request.'],
  ['RFP', '2.14', 15, 'City forms unaltered', 'Proposer shall not alter the language of any City-provided form.', 'M', 'R', '9', 41, 'All City-provided forms are submitted without alteration.', 'A', 0.85, 'Forms index affirms forms are unaltered.'],
  ['RFP', '2.15', 16, 'Debarment disclosure', 'Proposer must disclose whether it has been debarred or suspended by any federal, state, or local agency within the past five (5) years.', 'M', 'R', '9', 41, 'Form A, Section 6, certifies that Kestrel Point has not been debarred or suspended by any agency.', 'A', 0.93, 'Debarment certification on Form A.'],

  // ── Section 3 · Background ─────────────────────────────────────
  ['RFP', '3.2', 18, 'State assumptions about existing systems', 'Proposer shall review the City’s current-state environment described in this Section and identify any assumptions its solution makes about existing systems.', 'M', 'T', '3.1', 10, 'Our solution assumes the City’s Lagan CRM (v15) will be retired at go-live, and that Cityworks AMS 23.4 and ArcGIS Enterprise 11.1 remain in place.', 'A', 0.9, 'Solution overview lists assumptions for each named City system.'],
  ['RFP', '3.3', 19, 'Accommodate volume and growth', 'Proposer shall describe how its solution will accommodate the City’s current volume of approximately 145,000 service requests per year with projected growth of eight percent (8%) annually.', 'M', 'T', '3.1', 10, 'The platform is sized for 250,000 service requests per year at launch, well above the City’s projected volume through 2032.', 'A', 0.89, '145,000 × 1.08^6 ≈ 230,000 by 2032; 250,000 sizing covers it.'],
  ['RFP', '3.5', 21, 'Lagan CRM decommissioning support', 'Proposer shall address the retirement of the City’s existing Lagan CRM, including decommissioning support.', 'M', 'T', '4.4', 27, 'After cutover, we keep Lagan in read-only mode for 60 days, then support the City’s decommissioning with a final archive export.', 'A', 0.91, 'Go-live section covers read-only period and decommissioning.'],

  // ── Section 4 · Functional Requirements ────────────────────────
  ['RFP', '4.1.1', 23, 'Multichannel intake', 'The solution shall accept service requests through a web portal, mobile application, phone (agent-entered), email, and SMS.', 'M', 'T', '3.2', 11, 'Residents can submit requests through the web portal, the Port Ellery 311 app, by phone through call-takers, by email to 311@portellery.gov, or by text message.', 'A', 0.97, 'All five channels named.'],
  ['RFP', '4.1.2', 23, 'Anonymous or account submission', 'The solution shall allow residents to submit requests anonymously or with an account.', 'M', 'T', '3.2', 11, 'Residents may submit anonymously or sign in to track all of their requests in one place.', 'A', 0.95, 'Both options described.'],
  ['RFP', '4.1.3', 24, 'Photo and video attachments', 'The solution shall allow residents to attach up to five (5) photos or videos per request.', 'M', 'T', '3.2', 12, 'Each request accepts up to ten photos or videos, compressed automatically on upload.', 'A', 0.93, 'Draft exceeds the five-attachment minimum.'],
  ['RFP', '4.1.4', 24, 'Location capture', 'The solution shall capture request location by address search, map pin, or device GPS.', 'M', 'T', '3.2', 12, 'Location is captured by validated address search, by dropping a pin on the City basemap, or from device GPS.', 'A', 0.96, 'All three location methods named.'],
  ['RFP', '4.1.5', 24, 'Amazon Connect integration', 'The solution shall integrate with the City’s Amazon Connect contact center to provide screen-pop of caller history.', 'M', 'T', '3.5', 17, 'Our platform includes a prebuilt Amazon Connect connector that opens the caller’s request history on the agent’s screen when a call is answered.', 'A', 0.74, 'Draft describes the prebuilt Amazon Connect connector with screen-pop.', { actual: 'The solution should support integration with the City’s Amazon Connect contact center to provide screen-pop of caller history.' }],
  ['RFP', '4.1.6', 25, 'Automatic acknowledgments with tracking number', 'The solution shall send automatic acknowledgments with a tracking number by the resident’s chosen channel (email, SMS, or push notification).', 'M', 'T', '3.2', 12, 'Every request receives an immediate acknowledgment with its tracking number by email, text, or push notification, according to the resident’s preference.', 'A', 0.96, 'Directly stated.'],
  ['RFP', '4.2.1', 25, 'iOS and Android apps under City accounts', 'The resident mobile application shall be available on iOS and Android and be published under the City’s developer accounts.', 'M', 'T', '3.4', 15, 'The Port Ellery 311 app is published to the Apple App Store and Google Play under the City’s own developer accounts.', 'A', 0.95, 'Both platforms and City accounts confirmed.'],
  ['RFP', '4.2.2', 26, 'Offline request submission', 'The mobile application shall allow residents to create and submit requests while offline, queuing them for submission when connectivity returns.', 'M', 'T', '3.4', 15, 'The app is optimized for low-bandwidth conditions and caches recent request types so forms load quickly in areas with weak coverage.', 'P', 0.82, 'Draft covers low-bandwidth performance but never states that requests can be created offline and queued for later submission.'],
  ['RFP', '4.2.3', 26, 'Field worker app', 'The field worker mobile application shall allow crews to view, update, and close work assigned to them, including adding photos.', 'M', 'T', '3.4', 15, 'Crews use the field app to see their assigned requests, update status, add photos, and close work from the field.', 'A', 0.94, 'All listed functions covered.'],
  ['RFP', '4.2.4', 26, 'Push notifications', 'The mobile applications shall support push notifications for status changes.', 'M', 'T', '3.4', 15, 'Residents receive push notifications whenever their request changes status.', 'A', 0.96, 'Directly stated.'],
  ['RFP', '4.3.1', 27, 'Automatic routing by type and location', 'The solution shall route requests automatically to the responsible department based on request type and location.', 'M', 'T', '3.3', 13, 'Routing rules combine request type with City GIS boundaries (council district, maintenance zone) to assign each request to the right department queue.', 'A', 0.95, 'Type + location routing described.'],
  ['RFP', '4.3.2', 27, 'No-code routing rules', 'The solution shall allow authorized users to configure routing rules without vendor assistance or custom code.', 'M', 'T', '3.3', 13, 'City administrators build and change routing rules in a point-and-click rule editor; no vendor involvement or code is required.', 'A', 0.94, 'Directly stated.'],
  ['RFP', '4.3.3', 28, 'Automatic duplicate detection', 'The solution shall automatically detect potential duplicate requests within a configurable radius and time window and allow staff to merge them.', 'M', 'T', '3.3', 14, 'Staff can merge related cases from the case view, linking all residents to the parent case so everyone receives updates.', 'A', 0.68, 'Draft describes merging related cases; detection is implied by the case-linking workflow.'],
  ['RFP', '4.3.4', 28, 'SLA tracking and escalation', 'The solution shall track service level targets by request type and escalate overdue requests to supervisors.', 'M', 'T', '3.3', 14, 'Each request type carries a configurable service target; requests nearing or past target escalate automatically to the assigned supervisor.', 'A', 0.95, 'Tracking and escalation both described.'],
  ['RFP', '4.3.5', 28, 'Complete audit trail', 'The solution shall maintain a complete audit trail of every change to a service request, including user, timestamp, and prior value.', 'M', 'T', '3.7', 20, 'The platform is hosted in a FedRAMP Moderate authorized environment with encryption at rest and in transit and continuous security monitoring.', 'A', 0.64, 'Security section covers system integrity controls, which encompass audit logging.'],
  ['RFP', '4.3.6', 29, 'Internal notes', 'The solution shall support internal notes that are not visible to residents.', 'M', 'T', '3.3', 14, 'Staff can add internal notes, which are never shown on the resident portal or in notifications.', 'A', 0.96, 'Directly stated.'],
  ['RFP', '4.3.7', 29, 'Staff-entered requests', 'The solution shall allow staff to create service requests on behalf of residents, including walk-in and phone requests.', 'M', 'T', '3.2', 11, 'Call-takers and counter staff create requests on a resident’s behalf from the same intake screen.', 'A', 0.92, 'Covers phone and walk-in entry.'],
  ['RFP', '4.3.8', 29, 'Record retention', 'The solution shall retain all service request records for ten (10) years.', 'M', 'T', '3.7', 20, 'Service request records and attachments are retained for the full contract term plus ten years.', 'A', 0.79, 'Draft commits to ten-year retention, matching the requirement.', { actual: 'The solution shall retain service request records for no less than seven (7) years, consistent with the City’s records retention schedule.' }],
  ['RFP', '4.4.1', 30, 'Searchable knowledge base', 'The solution shall provide a searchable knowledge base for call-takers and residents, with content managed by City staff.', 'M', 'T', '3.2', 12, 'A searchable knowledge base serves both call-takers and the public site; City staff author and publish articles directly.', 'A', 0.94, 'Directly stated.'],
  ['RFP', '4.4.2', 30, 'Public status and vicinity map', 'The resident portal shall display request status and allow residents to view requests in their vicinity on a public map.', 'M', 'T', '3.2', 12, 'Residents see live status for their requests and can browse open requests near them on a public map.', 'A', 0.95, 'Both functions described.'],
  ['RFP', '4.4.3', 31, 'English and Spanish at launch', 'The resident portal shall be available in English and Spanish at launch, with the ability to add languages.', 'M', 'T', '3.8', 21, 'The resident portal and mobile app launch in English and Spanish; additional languages can be enabled by the City at any time.', 'A', 0.94, 'Both launch languages and extensibility covered. (See R-137 for Addendum 2 language change.)'],
  ['RFP', '4.4.4', 31, 'Satisfaction rating at closure', 'The solution shall allow residents to rate their satisfaction upon request closure.', 'M', 'T', '3.2', 12, 'When a request closes, residents get a one-tap satisfaction survey.', 'A', 0.93, 'Directly stated.'],
  ['RFP', '4.5.1', 32, 'Esri ArcGIS Enterprise integration', 'The solution shall integrate with the City’s Esri ArcGIS Enterprise 11.x environment to validate addresses and display City GIS layers.', 'M', 'T', '2.1', 5, 'Our team has delivered GIS-enabled solutions for municipal clients across the Pacific Northwest since 2012.', 'A', 0.58, 'Draft cites the firm’s GIS experience.'],
  ['RFP', '4.5.2', 32, 'Bi-directional Cityworks integration', 'The solution shall provide bi-directional integration with Cityworks AMS so that work orders created from service requests update the originating request on status change.', 'M', 'T', '3.5', 16, 'Service requests that need field work automatically generate a Cityworks work order through the Cityworks REST API.', 'P', 0.86, 'Covers request → work order. Says nothing about work order status flowing back to update the originating request.'],
  ['RFP', '4.5.3', 33, 'Assign requests to Cityworks assets', 'The solution shall support associating requests with City assets (e.g., streetlights, hydrants) maintained in Cityworks.', 'M', 'T', '3.5', 16, 'Requests can be tied to a specific Cityworks asset, such as a streetlight or hydrant, selected from the map.', 'A', 0.92, 'Directly stated.'],
  ['RFP', '4.5.4', 33, 'Documented REST API', 'The solution shall expose a documented REST API for request creation, status lookup, and data export.', 'M', 'T', '3.5', 17, 'A fully documented REST API supports request creation, status lookup, and bulk export.', 'A', 0.95, 'All three API functions named.'],
  ['RFP', '4.5.5', 34, 'Open311 GeoReport v2', 'The solution shall support the Open311 GeoReport v2 standard.', 'M', 'T', '3.5', 17, 'The platform is Open311 GeoReport v2 compliant.', 'A', 0.97, 'Directly stated.'],
  ['RFP', '4.5.6', 34, 'GovDelivery alerts', 'The solution should integrate with the City’s Granicus GovDelivery account for opt-in resident alerts.', 'D', 'T', '3.5', 17, 'Opt-in resident alerts can be routed through the City’s GovDelivery account.', 'A', 0.9, 'Desirable feature; addressed.'],
  ['RFP', '4.6.1', 35, 'Real-time dashboards', 'The solution shall provide real-time dashboards showing request volume, backlog, and service level performance by department.', 'M', 'T', '3.6', 18, 'Real-time dashboards show volume, backlog, and on-time performance for each department.', 'A', 0.95, 'Directly stated.'],
  ['RFP', '4.6.2', 35, 'Ad hoc reports for non-technical users', 'The solution shall allow non-technical City users to build and save ad hoc reports without vendor assistance.', 'M', 'T', '3.6', 18, 'The platform ships with 40 standard reports and configurable dashboards covering every department.', 'P', 0.84, 'Standard reports and configurable dashboards are described, but not a user-facing ad hoc report builder.'],
  ['RFP', '4.6.3', 36, 'Scheduled CSV and PDF exports', 'The solution shall allow scheduled export of reports in CSV and PDF formats.', 'M', 'T', '3.6', 18, 'Any report can be scheduled for delivery as CSV or PDF.', 'A', 0.95, 'Directly stated.'],
  ['RFP', '4.6.4', 36, 'Open data publishing', 'The solution shall publish selected request data to the City’s open data portal (Socrata) on a configurable schedule.', 'M', 'T', '3.6', 18, 'Selected fields publish to the City’s Socrata open data portal nightly or on a schedule the City sets.', 'A', 0.94, 'Directly stated.'],
  ['RFP', '4.7.1', 37, 'No-code request types and forms', 'The solution shall allow City administrators to create and modify request types, forms, and required fields without code.', 'M', 'T', '3.3', 13, 'Administrators create request types and design intake forms, including required fields, in a drag-and-drop form builder.', 'A', 0.94, 'Directly stated.'],
  ['RFP', '4.7.2', 37, 'Role-based permissions by department', 'The solution shall support role-based permissions configurable by department.', 'M', 'T', '3.7', 19, 'Role-based permissions are configured per department, so Public Works staff see only Public Works queues unless granted wider access.', 'A', 0.93, 'Directly stated.'],
  ['RFP', '4.7.3', 38, 'Sandbox environment', 'The solution shall provide a sandbox environment for testing configuration changes.', 'M', 'T', '3.7', 19, 'The subscription includes a sandbox environment refreshed from production on request.', 'A', 0.95, 'Directly stated.'],

  // ── Section 5 · Technical Requirements ─────────────────────────
  ['RFP', '5.1.1', 39, 'Vendor-hosted SaaS', 'The solution shall be offered as a vendor-hosted software-as-a-service (SaaS) solution.', 'M', 'T', '3.7', 19, 'The platform is delivered as vendor-hosted SaaS; the City installs nothing on its own servers.', 'A', 0.97, 'Directly stated.'],
  ['RFP', '5.1.2', 39, 'US data residency', 'All City data shall be stored and processed within the continental United States.', 'M', 'T', '3.7', 19, 'All City data is stored and processed in AWS GovCloud (US-West) and US-East regions.', 'A', 0.94, 'Both regions are in the continental US.'],
  ['RFP', '5.1.3', 40, 'FedRAMP or StateRAMP Moderate', 'The hosting environment shall hold a current FedRAMP Moderate authorization or StateRAMP Moderate authorization.', 'M', 'T', '3.7', 20, 'The platform is hosted in a FedRAMP Moderate authorized environment with encryption at rest and in transit and continuous security monitoring.', 'A', 0.95, 'FedRAMP Moderate stated.'],
  ['RFP', '5.1.4', 40, 'SOC 2 Type II report with proposal', 'Proposer shall provide its hosting provider’s most recent SOC 2 Type II report, or equivalent independent audit, with its proposal.', 'M', 'T', null, null, null, 'X', 0.91, 'Draft cites FedRAMP authorization (§3.7, p.20) but no SOC 2 Type II report is attached or listed in the forms index. This is a submittal, not a narrative answer.', { suggestedOwner: 'marcus' }],
  ['RFP', '5.1.5', 41, '99.9% monthly availability', 'The solution shall maintain 99.9% availability measured monthly, excluding scheduled maintenance.', 'M', 'T', '5.2', 30, 'We commit to 99.9% availability each calendar month, excluding scheduled maintenance.', 'A', 0.97, 'Directly stated.'],
  ['RFP', '5.1.6', 41, 'Maintenance windows and notice', 'Scheduled maintenance shall occur outside 6:00 a.m.–10:00 p.m. Pacific Time with at least seventy-two (72) hours’ notice.', 'M', 'T', '5.2', 30, 'Scheduled maintenance runs between 10:00 p.m. and 6:00 a.m. Pacific, announced at least 72 hours in advance.', 'A', 0.95, 'Window and notice both match.'],
  ['RFP', '5.2.1', 42, 'RPO ≤ 4 hours, RTO ≤ 24 hours', 'Proposer shall state its recovery point objective (RPO) and recovery time objective (RTO); the City requires an RPO of no more than four (4) hours and an RTO of no more than twenty-four (24) hours.', 'M', 'T', '3.7', 20, 'Daily backups are replicated to a secondary region and retained for 35 days; restores are tested quarterly.', 'X', 0.9, 'Draft never states RPO or RTO. Daily backups alone imply up to a 24-hour RPO, which would not meet the City’s 4-hour requirement. Closest text shown.'],
  ['RFP', '5.2.2', 42, 'Backup frequency and restore testing', 'Proposer shall describe its backup frequency, retention, and restoration testing.', 'M', 'T', '3.7', 20, 'Daily backups are replicated to a secondary region and retained for 35 days; restores are tested quarterly.', 'A', 0.93, 'Frequency, retention, and testing all stated.'],
  ['RFP', '5.3.1', 43, 'SSO via Microsoft Entra ID', 'The solution shall support single sign-on for City staff through the City’s Microsoft Entra ID using SAML 2.0 or OpenID Connect.', 'M', 'T', '3.7', 19, 'Staff sign in through the City’s Microsoft Entra ID using SAML 2.0.', 'A', 0.96, 'Directly stated.'],
  ['RFP', '5.3.2', 43, 'MFA for admin accounts', 'The solution shall enforce multi-factor authentication for all administrative accounts.', 'M', 'T', '3.7', 19, 'Multi-factor authentication is enforced for every administrative account.', 'A', 0.97, 'Directly stated.'],
  ['RFP', '5.3.3', 44, 'Encryption in transit and at rest', 'All data shall be encrypted in transit using TLS 1.2 or higher and at rest using AES-256 or equivalent.', 'M', 'T', '3.7', 20, 'Data is encrypted in transit with TLS 1.3 and at rest with AES-256.', 'A', 0.97, 'Exceeds minimum.'],
  ['RFP', '5.3.4', 44, '24-hour incident notification', 'Proposer shall notify the City of any security incident affecting City data within twenty-four (24) hours of discovery.', 'M', 'T', '3.7', 20, 'We notify the City of any security incident affecting City data within 24 hours of discovery.', 'A', 0.97, 'Directly stated.'],
  ['RFP', '5.3.5', 44, 'Annual penetration test', 'Proposer shall conduct an annual third-party penetration test and provide a summary of findings to the City.', 'M', 'T', '3.7', 20, 'An independent firm performs an annual penetration test; the City receives the executive summary and remediation status.', 'A', 0.94, 'Directly stated.'],
  ['RFP', '5.3.6', 45, 'Admin and auth event logging', 'The solution shall log all administrative and authentication events and retain such logs for at least one (1) year.', 'M', 'T', '3.7', 20, 'Authentication and administrative events are logged and retained for 13 months.', 'A', 0.9, '13 months exceeds the one-year minimum.'],
  ['RFP', '5.4.1', 46, 'WCAG 2.1 Level AA', 'The resident-facing portal and mobile applications shall conform to WCAG 2.1 Level AA.', 'M', 'T', '3.8', 21, 'Our resident portal conforms to WCAG 2.0 Level AA, verified annually by an independent accessibility auditor.', 'P', 0.88, 'Draft cites WCAG 2.0 AA; the RFP requires 2.1 AA. Either the product meets 2.1 and the draft is out of date, or this is a real gap. Mobile apps are not mentioned.'],
  ['RFP', '5.4.2', 46, 'Accessibility Conformance Report (VPAT)', 'Proposer shall submit a current Accessibility Conformance Report (VPAT 2.4 or later) for each proposed application.', 'M', 'T', null, null, null, 'X', 0.93, 'No ACR/VPAT appears in the draft or forms index. Required for each application (resident portal, resident app, field app, staff console).', { suggestedOwner: 'marcus' }],
  ['RFP', '5.4.3', 47, 'Keyboard and screen reader support', 'The staff interface shall support keyboard-only navigation and screen readers.', 'M', 'T', '3.8', 21, 'The staff console supports full keyboard navigation and is tested with JAWS and NVDA.', 'A', 0.94, 'Directly stated.'],
  ['RFP', '5.5.1', 47, 'Migrate Lagan records with history', 'Proposer shall migrate open and closed service requests from the Lagan CRM, including attachments and history.', 'M', 'T', '3.9', 22, 'We migrate open and closed requests with full history and attachments using our validated Lagan extraction toolkit.', 'A', 0.94, 'Directly stated.'],
  ['RFP', '5.5.2', 48, 'Mapping, cleansing, and reconciliation', 'Proposer shall describe its data mapping, cleansing, and validation approach, including reconciliation reports for the City’s approval.', 'M', 'T', '3.9', 22, 'Field mapping is agreed with the City in a signed mapping workbook; each load produces a reconciliation report the City approves before cutover.', 'A', 0.92, 'Covers mapping and reconciliation; cleansing described in the same paragraph.'],
  ['RFP', '5.5.3', 48, 'Two trial migrations', 'Proposer shall perform at least two (2) trial migrations before the production cutover.', 'M', 'T', '3.9', 22, 'We run three trial migrations before production cutover.', 'A', 0.96, 'Exceeds minimum.'],
  ['RFP', '5.6.1', 49, 'Browser support without plug-ins', 'The solution shall support current versions of Chrome, Edge, Safari, and Firefox without plug-ins.', 'M', 'T', '3.7', 19, 'Works in current Chrome, Edge, Safari, and Firefox; no plug-ins required.', 'A', 0.96, 'Directly stated.'],
  ['RFP', '5.6.2', 49, '150 concurrent staff users', 'The solution shall support at least 150 concurrent staff users without performance degradation.', 'M', 'T', '3.1', 10, 'Load-tested at 400 concurrent staff users with no measurable change in response times.', 'A', 0.93, 'Exceeds minimum.'],
  ['RFP', '5.6.3', 49, '2-second response time', 'Page response times shall not exceed two (2) seconds for 95% of staff transactions under normal load.', 'M', 'T', '5.2', 30, '95% of staff transactions complete in under two seconds under normal load.', 'A', 0.95, 'Directly stated.'],
  ['RFP', '5.7.1', 50, 'City data ownership and return', 'The City shall retain ownership of all data; Proposer shall return all City data in a non-proprietary format within thirty (30) days of contract termination.', 'M', 'T', '3.7', 20, 'The City owns its data. At contract end we deliver a complete export in CSV and JSON, with attachments, within 30 days.', 'A', 0.94, 'Ownership and 30-day return both stated.'],
  ['RFP', '5.7.2', 50, 'No secondary use of City data', 'Proposer shall not use City data for any purpose other than performance of the contract, including training of machine learning models.', 'M', 'T', '3.7', 20, 'City data is used only to deliver this contract and is never used to train machine learning models.', 'A', 0.95, 'Directly stated.'],
  ['RFP', '5.7.3', 50, 'Disclose third parties with data access', 'Proposer shall identify all third-party components and hosting subcontractors that will have access to City data.', 'M', 'T', '3.7', 19, 'Third parties with access to City data: Amazon Web Services (hosting), Twilio (SMS), and Rivermark GIS (migration, during implementation only).', 'A', 0.9, 'Lists all three.'],

  // ── Section 6 · Implementation, Training & Support ─────────────
  ['RFP', '6.1.1', 51, 'Plan and schedule; go-live by Sept 30, 2027', 'Proposer shall provide a detailed implementation plan and schedule, with go-live no later than September 30, 2027.', 'M', 'T', '4.2', 24, 'Our 40-week schedule begins at contract execution in January 2027 and reaches go-live in August 2027, with September held as contingency.', 'A', 0.93, 'Go-live in August precedes the deadline.'],
  ['RFP', '6.1.2', 51, 'Project management plan', 'Proposer shall provide a project management plan describing status reporting, issue tracking, and risk management.', 'M', 'T', '4.1', 23, 'Our project management plan covers weekly status reporting, a shared issue log, and a risk register reviewed every two weeks.', 'A', 0.93, 'All three elements covered.'],
  ['RFP', '6.1.3', 52, 'Weekly status meetings', 'Proposer shall hold weekly status meetings with the City project manager throughout implementation.', 'M', 'T', '4.1', 23, 'Our project manager meets weekly with the City’s project manager from kickoff through go-live.', 'A', 0.96, 'Directly stated.'],
  ['RFP', '6.1.4', 52, 'Change management for City staff', 'Proposer shall describe its approach to change management for City staff whose workflows will change.', 'M', 'T', '4.5', 28, 'Risk: staff resistance to new workflows. Mitigation: early demonstrations to department leads.', 'A', 0.61, 'Risk register addresses staff resistance to new workflows.'],
  ['RFP', '6.1.5', 53, 'Joint UAT scripts', 'Proposer shall support user acceptance testing with test scripts developed jointly with the City.', 'M', 'T', '4.2', 25, 'We draft UAT scripts with each department’s lead and support the City through two UAT cycles.', 'A', 0.94, 'Directly stated.'],
  ['RFP', '6.1.6', 53, 'On-site support after go-live', 'Proposer shall provide on-site support staff for ninety (90) days following go-live.', 'M', 'T', '4.4', 27, 'Two Kestrel Point staff will be on-site at the City’s 311 center for the first 30 days after go-live.', 'A', 0.71, 'Draft commits to on-site support after go-live.', { actual: 'The City prefers that the Proposer provide on-site support during the first thirty (30) days following go-live.' }],
  ['RFP', '6.2.1', 54, 'Train-the-trainer for 25 staff', 'Proposer shall provide train-the-trainer sessions for up to twenty-five (25) City staff and role-based training for administrators.', 'M', 'T', '4.3', 26, 'We deliver train-the-trainer sessions and role-based administrator training, scheduled around department availability.', 'P', 0.79, 'Both training types are covered, but the draft doesn’t commit to the 25-person capacity.'],
  ['RFP', '6.2.2', 54, 'Editable end-user documentation', 'Proposer shall provide end-user documentation and quick-reference guides in editable electronic format.', 'M', 'T', '4.3', 26, 'All user guides and quick-reference cards are delivered as editable Word files the City can adapt.', 'A', 0.94, 'Directly stated.'],
  ['RFP', '6.2.3', 55, 'Training done 2 weeks before go-live', 'Training shall be completed no fewer than two (2) weeks before go-live.', 'M', 'T', '4.2', 25, 'All end-user training completes three weeks before go-live.', 'A', 0.93, 'Exceeds requirement.'],
  ['RFP', '6.3.1', 55, 'Tier 2 and Tier 3 support', 'Proposer shall provide Tier 2 and Tier 3 technical support; the City will provide Tier 1 support.', 'M', 'T', '5.1', 29, 'Kestrel Point provides Tier 2 and Tier 3 support; City help desk staff handle Tier 1.', 'A', 0.96, 'Directly stated.'],
  ['RFP', '6.3.2', 56, 'Priority 1 response in 1 hour, 24/7', 'Proposer shall respond to Priority 1 (system down) incidents within one (1) hour, twenty-four hours a day, seven days a week.', 'M', 'T', '5.2', 30, 'Priority 1 incidents receive a response within one hour during business hours (7 a.m.–7 p.m. Pacific, Monday–Friday).', 'P', 0.92, 'Draft limits the one-hour P1 response to business hours. The RFP requires it around the clock.'],
  ['RFP', '6.3.3', 56, 'Priority 2 response in 4 business hours', 'Proposer shall respond to Priority 2 incidents within four (4) business hours.', 'M', 'T', '5.2', 30, 'Priority 2 incidents receive a response within four business hours.', 'A', 0.96, 'Directly stated.'],
  ['RFP', '6.3.4', 56, 'Monthly SLA reports', 'Proposer shall provide monthly reports on uptime, incidents, and response times.', 'M', 'T', '5.2', 30, 'The City receives a monthly service report covering uptime, incidents, and response times.', 'A', 0.96, 'Directly stated.'],
  ['RFP', '6.3.5', 57, 'Service credits', 'Proposer shall propose service credits for failure to meet availability and response-time commitments.', 'M', 'T', '5.2', 30, 'Missed availability or response targets earn service credits of 5–15% of the monthly fee, as detailed in Table 5-2.', 'A', 0.94, 'Directly stated.'],
  ['RFP', '6.4.1', 57, 'Upgrades included', 'Proposer shall include all software upgrades and new releases in the subscription fee at no additional cost.', 'M', 'T', '5.3', 31, 'All upgrades and new releases are included in the subscription.', 'A', 0.96, 'Directly stated.'],
  ['RFP', '6.4.2', 57, '30 days’ notice of user-facing releases', 'Proposer shall notify the City at least thirty (30) days before any release that changes user-facing functionality.', 'M', 'T', '5.3', 31, 'Releases that change what users see are announced at least 30 days in advance, with release notes.', 'A', 0.95, 'Directly stated.'],
  ['RFP', '6.4.3', 58, 'Annual product roadmap', 'Proposer shall maintain a product roadmap and share it with the City at least annually.', 'M', 'T', '5.3', 31, 'We share our product roadmap with the City twice a year.', 'A', 0.94, 'Exceeds requirement.'],
  ['RFP', '6.5.1', 58, 'Dedicated account manager', 'Proposer shall designate a dedicated account manager for the contract term.', 'M', 'T', '5.1', 29, 'Priya Raman serves as the City’s dedicated account manager for the full contract term.', 'A', 0.95, 'Directly stated.'],
  ['RFP', '6.5.2', 58, 'Successor vendor transition', 'Proposer shall support the City in transitioning to a successor vendor at contract end, for up to ninety (90) days.', 'M', 'T', '5.3', 31, 'At contract end we support transition to a successor vendor for up to 90 days at the then-current hourly rates.', 'A', 0.88, 'Covers the 90-day period. Note: draft adds hourly charges; RFP is silent on cost.'],
  ['RFP', '6.5.3', 58, 'US-based support staff', 'Support staff shall be located in the United States.', 'M', 'T', '5.1', 29, 'All support staff are based in the United States.', 'A', 0.97, 'Directly stated.'],

  // ── Section 7 · Contract Terms & Insurance ─────────────────────
  ['RFP', '7.1', 59, 'Accept or except Exhibit B', 'Proposer shall review the City’s standard Professional Services Agreement (Exhibit B) and indicate acceptance or list exceptions.', 'M', 'R', '7.1', 36, 'Kestrel Point accepts Exhibit B with two exceptions, listed below with proposed alternative language.', 'A', 0.95, 'Directly stated.'],
  ['RFP', '7.2', 60, 'Execute Exhibit F unmodified', 'The selected Proposer shall execute the City’s Data Sharing and Security Addendum (Exhibit F) without modification.', 'M', 'R', '7.1', 36, 'Kestrel Point will execute Exhibit F, Data Sharing and Security Addendum, without modification.', 'A', 0.95, 'Directly stated.'],
  ['RFP', '7.3.2', 61, 'Automobile liability $1M', 'Proposer shall maintain automobile liability insurance with a combined single limit of not less than $1,000,000.', 'M', 'R', '7.2', 37, 'Automobile liability: $1,000,000 combined single limit.', 'A', 0.96, 'Matches. Not changed by either addendum.'],
  ['RFP', '7.3.3', 62, 'Workers’ comp and employer’s liability', 'Proposer shall maintain workers’ compensation insurance as required by the State, and employer’s liability insurance of not less than $1,000,000.', 'M', 'R', '7.2', 37, 'Workers’ compensation: statutory. Employer’s liability: $1,000,000 each accident.', 'A', 0.95, 'Matches.'],
  ['RFP', '7.3.4', 62, 'Professional liability $2M', 'Proposer shall maintain professional liability (errors and omissions) insurance of not less than $2,000,000 per claim.', 'M', 'R', '7.2', 37, 'Professional liability (E&O): $2,000,000 per claim.', 'A', 0.96, 'Matches.'],
  ['RFP', '7.3.5', 63, 'Cyber liability $5M', 'Proposer shall maintain cyber liability insurance of not less than $5,000,000 per claim covering data breach, notification, and remediation costs.', 'M', 'R', '7.2', 38, 'Cyber liability: $5,000,000 per claim, including breach response, notification, and remediation.', 'A', 0.95, 'Matches.'],
  ['RFP', '7.3.6', 63, 'City as additional insured', 'Proposer shall name the City, its officers, and employees as additional insureds on the general liability and automobile policies.', 'M', 'R', '7.2', 38, 'The City, its officers, and employees will be named as additional insureds on our general liability and automobile policies.', 'A', 0.95, 'Directly stated.'],
  ['RFP', '7.3.7', 64, 'Certificate or broker letter with proposal', 'Proposer shall submit a certificate of insurance or a letter from its broker confirming the ability to obtain the required coverage with its proposal.', 'M', 'R', '7.2', 38, 'A letter from our broker, Cascade Risk Partners, confirming all required coverages is included in the forms package.', 'A', 0.83, 'Broker letter referenced. Its contents are not in the draft; if it was written before Nov 13 it reflects the original $1M general liability limit (see R-135).'],
  ['RFP', '7.4', 65, 'Litigation disclosure (5 years)', 'Proposer shall disclose any litigation, claims, or contract terminations involving the Proposer in the past five (5) years.', 'M', 'R', null, null, null, 'X', 0.89, 'No litigation disclosure anywhere in the draft or forms. Even if there is none, the RFP requires a statement.', { suggestedOwner: 'janelle' }],
  ['RFP', '7.5', 66, 'Living Wage Ordinance', 'Proposer shall comply with the City’s Living Wage Ordinance (PEMC Chapter 3.62) for all employees performing work under the contract.', 'M', 'R', '9', 41, 'Form A, Section 7, Living Wage Certification, is signed and included.', 'A', 0.9, 'Certification on Form A.'],

  // ── Section 8 · Proposal Format & Evaluation ───────────────────
  ['RFP', '8.2.2', 68, 'Page format: letter, 11-pt, 1-inch margins', 'The technical proposal shall use 8.5 × 11-inch pages with a minimum 11-point font and one-inch margins.', 'M', 'R', null, null, null, 'A', 0.92, 'Checked draft v6 page setup: US Letter, 11-pt body text, 1-inch margins. Table text in §5.2 is 10-pt — check whether tables count.', { basis: 'document' }],
  ['RFP', '8.2.3', 68, 'Executive summary ≤ 2 pages', 'The proposal shall include an executive summary not exceeding two (2) pages.', 'M', 'R', '1', 3, 'Executive Summary, pages 3–4.', 'A', 0.97, 'Exactly two pages.'],
  ['RFP', '8.3.1', 69, 'Firm history, size, structure', 'Proposer shall describe its firm’s history, size, and organizational structure.', 'M', 'E', '2.1', 5, 'Founded in 2009, Kestrel Point is an 11-person engineering and IT services firm headquartered in Port Ellery, organized into engineering, systems, and operations groups.', 'A', 0.95, 'All three elements covered.'],
  ['RFP', '8.3.2', 69, 'Three similar projects incl. a 311/CRM', 'Proposer shall describe at least three (3) projects of similar scope completed within the past five (5) years, including at least one 311 or CRM implementation for a public agency.', 'M', 'E', '2.2', 6, 'Kelso Bay 311 replacement (2024); Tamarack County permitting and CRM (2023); Northshore PUD outage reporting portal (2022).', 'A', 0.9, 'Three projects within five years; Kelso Bay is a 311 implementation.'],
  ['RFP', '8.3.3', 70, 'Three public-agency references, pop. ≥100,000', 'Proposer shall provide three (3) references from public agencies serving a population of 100,000 or more for which it has performed similar work within the past five (5) years.', 'M', 'E', '2.3', 8, 'References: City of Kelso Bay (pop. 128,000); Tamarack County (pop. 211,000); Northshore Public Utility District.', 'P', 0.81, 'Third reference is a public utility district serving about 64,000 customers. It likely fails the 100,000 population threshold.'],
  ['RFP', '8.3.4', 71, 'Key personnel and no substitution', 'Proposer shall identify key personnel, including the project manager, lead implementation consultant, and data migration lead, and commit that they will not be substituted without the City’s written approval.', 'M', 'E', '6.2', 33, 'Key personnel: Rachel Imbrie (Project Manager), Marcus Delgado (Lead Implementation Consultant), and Owen Talbot of Rivermark GIS (Data Migration Lead). None will be substituted without the City’s written approval.', 'A', 0.95, 'All three roles named; commitment stated.'],
  ['RFP', '8.3.5', 71, 'Project manager holds PMP', 'The proposed project manager must hold a current Project Management Professional (PMP) certification.', 'M', 'E', '6.3', 34, 'Rachel Imbrie, Project Manager — Certified ScrumMaster (CSM); 14 years managing public-sector software implementations.', 'P', 0.87, 'Resume lists CSM, not PMP. If Rachel holds a PMP it’s missing from the resume; if she doesn’t, the PM doesn’t meet a must requirement.'],
  ['RFP', '8.3.6', 72, 'Resumes ≤ 2 pages each', 'Resumes for key personnel shall not exceed two (2) pages each.', 'M', 'E', '6.3', 34, 'Resumes, pages 34–35 (three resumes).', 'A', 0.86, 'Three resumes on two pages total, so each is under two pages.'],
  ['RFP', '8.4.4', 72, 'Office within city limits', 'Proposer must maintain a business office within the City of Port Ellery city limits.', 'M', 'L', '2.1', 5, 'Kestrel Point is headquartered at 410 Harbor Street, Suite 200, Port Ellery, and has served the region since 2009.', 'A', 0.63, 'Draft states a Port Ellery headquarters address, satisfying the local office requirement.', { actual: 'Local Participation (10 points). Points will be awarded based on the percentage of total contract value to be performed by firms with a principal place of business in Port Ellery County.' }],
  ['RFP', '8.5', 73, 'Include a compliance matrix', 'Proposer shall include a compliance matrix cross-referencing each mandatory requirement to the page of the proposal where it is addressed.', 'M', 'R', '1', 4, 'A compliance matrix cross-referencing every mandatory requirement to its page appears as Appendix B.', 'A', 0.9, 'Executive summary references Appendix B. Appendix B is not yet in draft v6. This matrix will become it.'],
  ['RFP', '8.6', 74, 'Available for orals week of Dec 14', 'Finalists shall be available for oral presentations and a scripted product demonstration during the week of December 14, 2026.', 'M', 'R', 'T', 2, 'Our proposed key personnel are available for oral presentations and a product demonstration the week of December 14, 2026.', 'A', 0.94, 'Directly stated.'],
  ['RFP', '8.7', 74, 'Sustainment approach and City staffing', 'Proposer shall describe its approach to sustaining the solution after implementation, including recommended City staffing levels.', 'M', 'E', '5.1', 29, 'We recommend the City staff one full-time system administrator and a 0.5 FTE business analyst after go-live.', 'A', 0.88, 'Staffing recommendation given; sustainment approach covered in §5.1 generally.'],

  // ── Section 9 · Pricing & Required Forms ───────────────────────
  ['RFP', '9.1', 75, 'Form P-1 itemized by year', 'Proposer shall submit pricing on Form P-1, itemizing one-time implementation costs and annual subscription fees for each of the five (5) contract years.', 'M', 'P', '8', 39, 'Total five-year cost of ownership: $1,184,600, including implementation ($286,000) and subscription.', 'P', 0.8, 'Draft summary gives a five-year total only. Form P-1 requires the subscription fee for each year. Confirm the P-1 in the pricing PDF is itemized.'],
  ['RFP', '9.2', 77, 'Firm pricing; escalation ≤ 3%', 'Pricing shall be firm for the initial five-year term; any escalation in renewal years shall not exceed three percent (3%) annually.', 'M', 'P', '8', 40, 'Prices are firm for the initial five-year term. Renewal-year increases are capped at 3% per year.', 'A', 0.96, 'Directly stated.'],
  ['RFP', '9.4', 80, 'Form C: acknowledge all addenda', 'Proposer shall acknowledge receipt of each addendum on Form C, Acknowledgment of Addenda, signed by an authorized representative.', 'M', 'R', '9', 41, 'Form C acknowledges receipt of Addendum No. 1 (November 9, 2026).', 'P', 0.95, 'Form C lists Addendum 1 only. Addendum 2 (Nov 13) must also be acknowledged. Leaving it off can make the proposal non-responsive.'],
  ['RFP', '9.5', 82, 'Form D: notarized non-collusion affidavit', 'Proposer shall submit Form D, Non-Collusion Affidavit, signed and notarized.', 'M', 'R', '9', 41, 'Forms included in this package: Form A (Proposer Information and Certifications), Form C (Acknowledgment of Addenda), Form P-1 (Price Proposal).', 'X', 0.94, 'Forms index omits Form D. It must be notarized, which takes lead time. Closest text shown.', { suggestedOwner: 'janelle' }],

  // ── Addendum 1 ─────────────────────────────────────────────────
  ['A1', 'Item 2', 2, 'Page limit 45 (revised by Addendum 1)', 'Section 8.2.1 is revised as follows: The technical proposal shall not exceed forty-five (45) pages, excluding required forms, resumes, and the price proposal.', 'M', 'R', null, null, null, 'A', 0.93, 'Draft v6 is 41 pages. Excluding resumes (§6.3, pp. 34–35), 39 pages count toward the limit, within 45. Under the original 40-page rule resumes counted, so the draft would have been one page over.', { basis: 'document', supersedes: { doc: 'RFP', ref: '§8.2.1', page: 68, text: 'The technical proposal shall not exceed forty (40) pages, excluding required forms and the price proposal.' } }],
  ['A1', 'Item 3', 2, 'Migrate ~1.2M records and 340 GB', 'Proposer shall describe its approach and timeline for migrating approximately 1.2 million historical service request records (2019–present), including approximately 340 GB of attachments.', 'M', 'T', '3.9', 22, 'We migrate open and closed requests with full history and attachments using our validated Lagan extraction toolkit.', 'P', 0.85, 'Draft describes the approach but doesn’t address the volume Addendum 1 specified (1.2M records, 340 GB) or give a migration timeline.'],

  // ── Addendum 2 ─────────────────────────────────────────────────
  ['A2', 'Item 1', 1, 'General liability $2M / $4M (revised by Addendum 2)', 'Section 7.3.1(a) is revised as follows: Proposer shall maintain commercial general liability insurance with limits of not less than $2,000,000 per occurrence and $4,000,000 general aggregate.', 'M', 'R', '7.2', 37, 'Kestrel Point maintains commercial general liability coverage of $1,000,000 per occurrence and $2,000,000 general aggregate.', 'X', 0.96, 'Draft still states the original RFP limits. Addendum 2 doubled both, so the draft as written is non-compliant. The broker letter (R-114) likely needs re-issuing at the new limits, and coverage may need to be bound before award.', { conflict: true, suggestedOwner: 'janelle', supersedes: { doc: 'RFP', ref: '§7.3.1(a)', page: 61, text: 'Proposer shall maintain commercial general liability insurance with limits of not less than $1,000,000 per occurrence and $2,000,000 general aggregate.' } }],
  ['A2', 'Item 2', 2, 'Form LBP-1, Local Business Participation', 'Proposers shall complete and submit Form LBP-1, Local Business Participation, with the proposal. Proposals that omit Form LBP-1 may be deemed non-responsive.', 'M', 'L', null, null, null, 'X', 0.97, 'Form LBP-1 is new in Addendum 2 and is not in the forms index (§9, p.41). It also documents the 10 Local Participation points: §2.1 says Rivermark GIS (Port Ellery) performs about 18% of contract value, and that should go on the form.', { passFail: true, suggestedOwner: 'janelle' }],
  ['A2', 'Item 3 · Q14', 4, 'Vietnamese at go-live', 'The resident portal and mobile application shall support English, Spanish, and Vietnamese at go-live.', 'M', 'T', '3.8', 21, 'The resident portal and mobile app launch in English and Spanish; additional languages can be enabled by the City at any time.', 'P', 0.83, 'Answer to Question 14 adds Vietnamese as a go-live language. Draft says other languages “can be enabled” but doesn’t commit to Vietnamese at launch.'],
];

const STATUS_MAP = { A: 'addressed', P: 'partial', X: 'missing' } as const;

export const REQUIREMENTS: Requirement[] = ROWS.map((r, i) => {
  const [doc, sec, page, title, text, mand, crit, draftSec, draftPage, excerpt, st, conf, reasoning, extra = {}] = r;
  const ds = draftSection(draftSec);
  return {
    id: 'R-' + String(i + 1).padStart(3, '0'),
    doc,
    sec,
    page,
    title,
    text,
    mand: mand === 'M' ? 'Mandatory' : 'Desirable',
    crit,
    passFail: crit === 'R' || !!extra.passFail,
    draftSec,
    draftPage,
    excerpt,
    status: STATUS_MAP[st],
    conf,
    reasoning,
    suggestedOwner: ds ? ds.owner : null,
    ...extra,
  } as Requirement;
});

// The model's original values for the three items Leah has already corrected.
export const SEEDED_CORRECTIONS: Record<string, { ai: Partial<Requirement>; note: string; at: string }> = {
  'R-009': {
    ai: { text: 'Each Proposer shall designate a single point of contact for the duration of the procurement.' },
    note: 'Quote stopped at “procurement” and dropped “who is authorized to bind the Proposer contractually.” Restored full clause. Transmittal names Daniel, who has signing authority, so still addressed.',
    at: '9:06 AM',
  },
  'R-010': {
    ai: { mand: 'Mandatory' },
    note: '§2.3 says attendance “is not mandatory.” Changed to Desirable.',
    at: '9:11 AM',
  },
  'R-013': {
    ai: { draftSec: '6.1', draftPage: 32, excerpt: 'Organization chart showing Kestrel Point staff and partner roles, including Rivermark GIS.' },
    note: 'Org chart shows Rivermark but not the work share. The percentage is in §2.1 on p.5. Remapped.',
    at: '9:24 AM',
  },
};

// Times the 22 seeded reviews were made this morning (R-001 … R-022).
export const SEEDED_REVIEW_TIMES = [
  '8:41 AM', '8:43 AM', '8:44 AM', '8:46 AM', '8:47 AM', '8:49 AM', '8:55 AM', '8:58 AM', '9:06 AM', '9:11 AM', '9:14 AM',
  '9:17 AM', '9:24 AM', '9:27 AM', '9:31 AM', '9:33 AM', '9:38 AM', '9:41 AM', '9:44 AM', '9:47 AM', '9:52 AM', '9:56 AM',
];

// Addenda changes the model was asked to catch.
export interface AddendumItem {
  key: string;
  doc: 'A1' | 'A2';
  item: string;
  page: number;
  title: string;
  original?: { ref: string; page: number; text: string };
  revised: string;
  handling: string;
  reqIds: string[];
}

export const ADDENDUM_ITEMS: AddendumItem[] = [
  {
    key: 'A1-1', doc: 'A1', item: 'Item 1', page: 1,
    title: 'Pre-proposal conference attendee list published',
    revised: 'The sign-in sheet and attendee list from the November 3, 2026 pre-proposal conference are attached for information.',
    handling: 'Informational only, so no requirement was created. Kestrel Point appears on the attendee list (line 7).',
    reqIds: [],
  },
  {
    key: 'A1-2', doc: 'A1', item: 'Item 2', page: 2,
    title: 'Technical proposal page limit raised from 40 to 45; resumes excluded',
    original: { ref: 'RFP §8.2.1', page: 68, text: 'The technical proposal shall not exceed forty (40) pages, excluding required forms and the price proposal.' },
    revised: 'The technical proposal shall not exceed forty-five (45) pages, excluding required forms, resumes, and the price proposal.',
    handling: 'Marked the original §8.2.1 requirement as superseded (not counted) and created R-133 from the revised text.',
    reqIds: ['R-133'],
  },
  {
    key: 'A1-3', doc: 'A1', item: 'Item 3', page: 2,
    title: 'Migration volume specified: ~1.2M records, ~340 GB attachments',
    original: { ref: 'RFP §5.5.1', page: 47, text: 'Proposer shall migrate open and closed service requests from the Lagan CRM, including attachments and history.' },
    revised: 'Proposer shall describe its approach and timeline for migrating approximately 1.2 million historical service request records (2019–present), including approximately 340 GB of attachments.',
    handling: 'Kept R-078 (migration scope is unchanged) and added R-134 for the new volume and timeline requirement.',
    reqIds: ['R-078', 'R-134'],
  },
  {
    key: 'A2-1', doc: 'A2', item: 'Item 1', page: 1,
    title: 'General liability minimum raised from $1M to $2M per occurrence',
    original: { ref: 'RFP §7.3.1(a)', page: 61, text: 'Proposer shall maintain commercial general liability insurance with limits of not less than $1,000,000 per occurrence and $2,000,000 general aggregate.' },
    revised: 'Proposer shall maintain commercial general liability insurance with limits of not less than $2,000,000 per occurrence and $4,000,000 general aggregate.',
    handling: 'Marked the original §7.3.1(a) requirement as superseded and created R-135 from the revised text. Flagged that draft §7.2 still states $1M, and linked the broker letter requirement (R-114).',
    reqIds: ['R-135', 'R-114'],
  },
  {
    key: 'A2-2', doc: 'A2', item: 'Item 2', page: 2,
    title: 'New required form: LBP-1, Local Business Participation',
    revised: 'Proposers shall complete and submit Form LBP-1, Local Business Participation, with the proposal. Proposals that omit Form LBP-1 may be deemed non-responsive.',
    handling: 'Created R-136, tied it to the Local Participation criterion (10 points), and marked it pass/fail. The form is not in the draft forms index.',
    reqIds: ['R-136'],
  },
  {
    key: 'A2-3', doc: 'A2', item: 'Item 3', page: 3,
    title: 'Answers to 18 vendor questions',
    revised: 'Q14: “Which languages must be supported at go-live?” A: The resident portal and mobile application shall support English, Spanish, and Vietnamese at go-live. (Q1–Q13 and Q15–Q18 clarify existing requirements without adding obligations.)',
    handling: 'Read all 18 answers. Created R-137 from Q14, which adds Vietnamese. Kept R-046 (English and Spanish) because it still applies. The other 17 answers add no new obligations.',
    reqIds: ['R-137', 'R-046'],
  },
  {
    key: 'A2-4', doc: 'A2', item: 'Item 4', page: 5,
    title: 'Due date and time unchanged',
    revised: 'The proposal due date remains Friday, November 20, 2026, at 2:00 p.m. Pacific Time.',
    handling: 'Confirmed R-001 still applies. No new requirement.',
    reqIds: ['R-001'],
  },
];

export const RUN = {
  instructions:
    'Pull every “shall” and “must” requirement from RFP 2026-114 and both addenda. Where an addendum changes the RFP, the addendum wins. Flag every change. Map each requirement to the section and page of our draft v6 that answers it, and mark it addressed, partial, or missing. Quote the source exactly with page and paragraph. Don’t count things the City is obligated to do. Flag gaps and suggest who on the team owns each one based on who owns that part of the draft.',
  startedBy: 'Leah Ostrowski',
  started: 'Tue Nov 17, 8:12 AM',
  finished: 'Tue Nov 17, 8:29 AM',
  duration: '17 min',
  model: 'Claude Opus 5.5',
  docsRead: [
    { name: 'RFP No. 2026-114', pages: 84, read: 84, extracted: 132 },
    { name: 'Addendum No. 1 (Nov 9)', pages: 3, read: 3, extracted: 2 },
    { name: 'Addendum No. 2 (Nov 13)', pages: 5, read: 5, extracted: 3 },
    { name: 'Draft response v6', pages: 41, read: 41, extracted: null },
    { name: 'Forms A, C, D, P-1', pages: 10, read: 10, extracted: null },
  ],
  candidates: 211,
  excluded: [
    { reason: 'City obligations (“The City shall…”)', count: 29 },
    { reason: 'Post-award contract obligations', count: 22 },
    { reason: 'Duplicates of an extracted requirement', count: 14 },
    { reason: 'Definitions and boilerplate', count: 7 },
    { reason: 'Superseded by an addendum', count: 2 },
  ],
};

export interface Candidate {
  key: string;
  doc: DocId;
  sec: string;
  page: number;
  text: string;
  reason: string;
  note: string;
  crit: Crit;
  title: string;
}

export const BORDERLINE: Candidate[] = [
  { key: 'c1', doc: 'RFP', sec: '6.3.6', page: 57, title: 'Public status page', crit: 'T', text: 'The Contractor shall maintain a status page reporting real-time system availability.', reason: 'Post-award obligation', note: 'Uses “Contractor” rather than “Proposer,” but evaluators may expect the proposal to describe it.' },
  { key: 'c2', doc: 'RFP', sec: '8.4', page: 72, title: 'Minimum 45 of 65 points to reach price', crit: 'R', text: 'Proposals must achieve a minimum of forty-five (45) of the sixty-five (65) technical and experience points to have price evaluated.', reason: 'Evaluation rule', note: 'Not a proposer obligation, but it’s a threshold: below 45 points the price is never opened.' },
  { key: 'c3', doc: 'RFP', sec: '5.3', page: 45, title: 'Comply with City Information Security Policy', crit: 'T', text: 'The Contractor shall comply with the City’s Information Security Policy (Exhibit F) throughout contract performance.', reason: 'Post-award obligation', note: 'Treated as covered by R-108 (execute Exhibit F without modification).' },
  { key: 'c4', doc: 'RFP', sec: '2.4', page: 10, title: 'Check portal for addenda', crit: 'R', text: 'Answers to questions will be issued as addenda; Proposers are responsible for checking the portal for addenda prior to submission.', reason: 'City obligation', note: 'Mostly describes what the City will do; the proposer duty is covered by R-131 (Form C).' },
  { key: 'c5', doc: 'RFP', sec: '4.1', page: 23, title: 'City provides Lagan access', crit: 'T', text: 'The City shall provide the selected Contractor with read-only access to the Lagan CRM database.', reason: 'City obligation', note: 'Excluded per instructions. Relevant to the migration timeline assumption in §3.9.' },
  { key: 'c6', doc: 'RFP', sec: '7.6', page: 66, title: 'Business license before work', crit: 'R', text: 'The Contractor must obtain a City business license before commencing work.', reason: 'Duplicate', note: 'Duplicate of R-004.' },
  { key: 'c7', doc: 'RFP', sec: '9.3', page: 78, title: 'Hold pricing 120 days', crit: 'P', text: 'Proposers must hold pricing for one hundred twenty (120) days following the proposal due date.', reason: 'Duplicate', note: 'Duplicate of R-005 (proposal validity).' },
  { key: 'c8', doc: 'RFP', sec: '1.2', page: 2, title: 'Shall/must definitions', crit: 'R', text: '“Shall” and “must” indicate mandatory requirements; “should” and “may” indicate desirable features.', reason: 'Definition', note: 'Used to classify Mandatory vs. Desirable.' },
];

// Additional draft v6 page text not quoted by any mapping (used when Leah remaps a requirement).
export const DRAFT_PAGE_TEXT: Record<string, string[]> = {
  '3.5:16': [
    'Address validation and map layers come directly from the City’s ArcGIS Enterprise 11.1 portal. Intake forms geocode against the City’s address locator, and staff and residents see City layers (council districts, maintenance zones, parks) on every map.',
  ],
  '3.3:14': [
    'Every change to a request is written to its case history with the user, time stamp, and previous value. The history cannot be edited, even by administrators.',
  ],
  '3.3:13': [
    'Intake forms, request types, and routing rules are all managed by City administrators through point-and-click tools.',
  ],
  '4.4:27': [
    'Change management starts in week 3 with workflow mapping sessions for each of the City’s seven departments. Department leads review future-state workflows, we provide a communications plan and talking points for supervisors, and “super users” in each department get early access to the sandbox.',
  ],
  '3.7:19': [
    'The platform is multi-tenant SaaS on AWS GovCloud, with City data logically isolated and encrypted with City-specific keys.',
  ],
  '2.1:5': [
    'Our team has delivered GIS-enabled solutions for municipal clients across the Pacific Northwest since 2012.',
  ],
  '5.2:30': [
    'Table 5-2 lists service credits by severity and month.',
  ],
};
