// Source documents attached to the task. Page text is what the assistant could read.
// Paragraphs are separated by blank lines; a paragraph starting with "# " is a heading.
// Pages flagged `unreadable` are scanned images with no text layer.

export const DOCS = [
  {
    id: 'council',
    short: 'Council',
    date: 'Nov 10',
    title: 'City Council regular meeting minutes',
    meta: 'Tuesday, Nov. 10, 2026',
    running: 'CITY OF BRANNOCK · CITY COUNCIL · REGULAR MEETING MINUTES · NOVEMBER 10, 2026',
    kind: 'minutes',
    pages: [
      {
        n: 1,
        text: `# Minutes of the Regular Meeting of the Brannock City Council

Tuesday, November 10, 2026 · 7:00 p.m. · Council Chambers, City Hall, 212 Main Street

# 1. Call to order and roll call

Mayor Linda Castellanos called the meeting to order at 7:02 p.m. The City Clerk recorded the roll: Mayor Castellanos, Vice Mayor Raymond Teague, and Councilmembers Priya Venkataraman, Dale Hutchins, Marisol Reyes, Ngozi Okafor and Tomasz Wójcik were present. A quorum was declared.

Staff present: Alan Prewitt, City Manager; Gwen Halloran, City Clerk; Keith Obuya, Public Works Director; Sunita Rao, Planning Director; Dolores Whitfield, Fire Chief; Neil Aldous, City Attorney.

The Pledge of Allegiance was led by Scout Troop 41 of Brannock.`,
      },
      {
        n: 2,
        text: `# Index of agenda items and minutes pages

Item 1 — Call to order and roll call — p. 1

Item 2 — Approval of agenda and October 27 minutes — p. 2

Item 3 — Public comment — p. 3

Item 4 — Consent agenda — p. 4

Item 5 — Fire Department annual report — p. 5

Item 6 — Dunmore Road traffic safety discussion — p. 6

Item 7 — Alder Street rezoning request (RZ-2026-04) — p. 7

Item 8 — Stormwater utility fee, first discussion — p. 8

Item 9 — Fenwick Avenue water main replacement: award of contract — p. 9

Item 10 — Public Library roof replacement — pp. 10–11

Item 11 — Council and manager comments — p. 12

Item 12 — Closed session (personnel) — p. 13

Item 13 — Adjournment — p. 14

# 2. Approval of agenda and prior minutes

Councilmember Hutchins moved, seconded by Councilmember Reyes, to approve the agenda as presented and the minutes of the October 27 regular meeting. Approved 7–0 by voice vote.`,
      },
      {
        n: 3,
        text: `# 3. Public comment

Six residents spoke during the comment period, each for up to three minutes.

Barbara Lindqvist of Dunmore Road asked the council to lower the speed limit near Harlow Elementary School and described near-misses at the school crossing. Joseph Tran of Alder Street said neighbors had not been told about a possible rezoning on his block and asked for a public meeting. Ruth Anne Pell of Fenwick Avenue asked when the water main work would reach her street.

Three other speakers addressed the winter farmers market, the condition of the Eastside ball field, and the holiday lights schedule. The Mayor thanked all speakers and closed public comment at 7:34 p.m.`,
      },
      {
        n: 4,
        text: `# 4. Consent agenda

Councilmember Reyes moved, seconded by Councilmember Venkataraman, to approve the consent agenda, which consisted of:

(a) Renewal of the animal control services agreement with Tillery County for two years, January 1, 2027 through December 31, 2028, at $41,200 per year;

(b) Reappointment of Walter Pruitt to the Planning Commission for a term ending December 31, 2030;

(c) Approval of a temporary closure of Main Street between 2nd and 4th Streets for the Holiday Lights Walk on Saturday, December 5, 2026.

The consent agenda was approved 7–0 by roll call.`,
      },
      {
        n: 5,
        text: `# 5. Fire Department annual report

Fire Chief Dolores Whitfield presented the department's report for the year ended September 30. The department answered 1,184 calls for service, an increase of 6 percent over the prior year. Emergency medical calls made up 62 percent of the total.

The median response time inside city limits was 5 minutes 52 seconds. Chief Whitfield said Engine 2, in service since 2004, will reach the end of its front-line life in 2028 and that the department will bring a replacement proposal to the council during the next budget cycle.

Councilmember Reyes thanked the department for its work during the August storm response. The council received the report; no action was required.`,
      },
      { n: 6, unreadable: true },
      { n: 7, unreadable: true },
      { n: 8, unreadable: true },
      {
        n: 9,
        text: `# 9. Fenwick Avenue water main replacement: award of contract

Public Works Director Keith Obuya presented the results of the October 29 bid opening. Four bids were received. The low responsive bid, from Kestrel Utility Contractors of Ostrander, was $1,462,300; the engineer's estimate was $1,510,000. Mr. Obuya said the existing 1920s cast-iron main on Fenwick Avenue has failed four times in the past three years.

Councilmember Venkataraman moved, seconded by Councilmember Wójcik, to award the contract to Kestrel Utility Contractors in the amount of $1,462,300 and to authorize the City Manager to sign. The motion carried 7–0 by roll call.

Mr. Obuya noted that residents on the affected blocks will be notified by door hanger before any interruption of water service.`,
      },
      {
        n: 10,
        text: `# 10. Public Library roof replacement

Mr. Obuya and Library Director Camille Duquesne presented a proposal to replace the flat roof over the 1974 wing of the Brannock Public Library. Water intrusion has damaged ceiling tiles in the children's room and the periodicals room, and a roofing consultant's June inspection found the membrane beyond repair.

Two bids were received. The low bid, from Hartwell Roofing, was $214,000, including a 10 percent contingency. Staff recommended paying for the work from the capital reserve fund, which has an unrestricted balance of $1.9 million. Work would be scheduled for spring 2027.

Councilmember Hutchins asked whether a partial repair could put off the cost. Mr. Obuya said the consultant did not recommend patching the membrane.`,
      },
      {
        n: 11,
        text: `# 10. Public Library roof replacement (continued)

Vice Mayor Teague moved, seconded by Councilmember Reyes, to approve a budget amendment of $214,000 from the capital reserve fund and to award the roof replacement contract to Hartwell Roofing.

After discussion the Mayor called the question. The motion carried 5–2.

Roll call: Ayes (4): Castellanos, Teague, Reyes, Venkataraman. Nays (3): Hutchins, Okafor, Wójcik.

The City Clerk noted that the budget amendment will appear in the November financial report to the council.`,
      },
      {
        n: 12,
        text: `# 11. Council and manager comments

City Manager Prewitt reminded residents that the leaf collection schedule had been mailed with the November utility bills and is posted on the city website.

Councilmember Okafor thanked the residents who spoke about Dunmore Road and said she would ask the City Manager to bring a grant application forward before the state deadline.

Councilmember Hutchins asked that the stormwater fee discussion return with comparison figures from neighboring cities. Mayor Castellanos reminded the audience of the Holiday Lights Walk on December 5.`,
      },
      {
        n: 13,
        text: `# 12. Closed session (personnel)

At 9:41 p.m. the council convened in closed session under the personnel exception to discuss the City Manager's annual performance review. City Attorney Neil Aldous was present.

The council returned to open session at 10:18 p.m. No reportable action was taken.`,
      },
      {
        n: 14,
        text: `# 13. Adjournment

There being no further business, Mayor Castellanos adjourned the meeting at 10:26 p.m.

Respectfully submitted,

Gwen Halloran, City Clerk

These minutes are a draft until approved by the council at its next regular meeting on November 24, 2026.`,
      },
    ],
  },
  {
    id: 'special',
    short: 'Special session',
    date: 'Nov 12',
    title: 'City Council special session minutes',
    meta: 'Thursday, Nov. 12, 2026',
    running: 'CITY OF BRANNOCK · CITY COUNCIL · SPECIAL SESSION MINUTES · NOVEMBER 12, 2026',
    kind: 'minutes',
    pages: [
      {
        n: 1,
        text: `# Minutes of the Special Session of the Brannock City Council

Thursday, November 12, 2026 · 5:30 p.m. · Council Chambers, City Hall, 212 Main Street

Mayor Castellanos called the special session to order at 5:31 p.m. All seven members of the council were present.

The session was called by the Mayor to consider a single item: authorization to apply for a state Safe Routes to School grant. The application is due to the state Department of Transportation by 5:00 p.m. on Friday, November 20.

Public Works Director Keith Obuya described the project: sidewalk infill along Dunmore Road between Harlow Street and Linden Avenue, and a pedestrian-activated flashing beacon at the Harlow Elementary School crosswalk. The total estimated cost is $540,000.`,
      },
      {
        n: 2,
        text: `# Discussion

Mr. Obuya said the city would request $480,000 from the state program and would be responsible for the remaining $60,000 as a local match.

Councilmember Okafor asked staff to confirm the amount of the city's local match before the application is filed. Councilmember Hutchins asked what would happen if the grant were not awarded; Mr. Obuya said the city would have no obligation to build the project.

# Public comment

Barbara Lindqvist of Dunmore Road spoke in favor of the application and thanked the council for meeting on short notice. No other speakers came forward.`,
      },
      {
        n: 3,
        text: `# Action

Councilmember Venkataraman moved, seconded by Councilmember Reyes, to adopt Resolution 2026-53 authorizing the City Manager to submit an application for $480,000 in Safe Routes to School funds and committing a local match of $60,000 from the street improvement fund.

The motion carried 6–1 by roll call.

Roll call: Ayes (6): Castellanos, Teague, Venkataraman, Reyes, Okafor, Wójcik. Nays (1): Hutchins.`,
      },
      {
        n: 4,
        text: `# Adjournment

There being no further business, the Mayor adjourned the special session at 6:24 p.m.

Respectfully submitted,

Gwen Halloran, City Clerk

These minutes are a draft until approved by the council at its next regular meeting on November 24, 2026.`,
      },
    ],
  },
  {
    id: 'planning',
    short: 'Planning',
    date: 'Nov 13',
    title: 'Planning Commission regular meeting minutes',
    meta: 'Friday, Nov. 13, 2026',
    running: 'CITY OF BRANNOCK · PLANNING COMMISSION · REGULAR MEETING MINUTES · NOVEMBER 13, 2026',
    kind: 'minutes',
    pages: [
      {
        n: 1,
        text: `# Minutes of the Regular Meeting of the Brannock Planning Commission

Friday, November 13, 2026 · 6:30 p.m. · Council Chambers, City Hall, 212 Main Street

The meeting was rescheduled from Thursday, November 12 because of the City Council's special session.

Chair Helen Abrams called the meeting to order at 6:33 p.m. Present: Chair Abrams and Commissioners Marcus Delgado, Walter Pruitt, Joanne Sato, Frank Hollis, Rebecca Thornbury and Anil Mehta. Staff present: Sunita Rao, Planning Director; Neil Aldous, City Attorney.`,
      },
      {
        n: 2,
        text: `# Approval of agenda and minutes

Commissioner Sato moved, seconded by Commissioner Mehta, to approve the agenda and the minutes of the October 9 meeting. Approved 7–0.

# Public comment on items not on the agenda

No one asked to speak.

# Staff announcements

Ms. Rao reported that the city's housing needs assessment will be presented to the commission in January and that two seats on the Design Review Board remain open.`,
      },
      {
        n: 3,
        text: `# Site plan review: Brannock Federal Credit Union, 640 Main Street

Ms. Rao presented a site plan for a single-lane drive-through at the credit union's Main Street branch. The plan adds a canopy and relocates six parking spaces to the rear lot. Staff found the plan consistent with the downtown overlay district.

Commissioner Delgado moved, seconded by Commissioner Pruitt, to approve the site plan as submitted. The motion carried 7–0.`,
      },
      {
        n: 4,
        text: `# Text amendment: accessory dwelling units (public hearing)

Ms. Rao presented draft language that would allow one accessory dwelling unit of up to 800 square feet on any lot in the R-1 and R-2 districts, subject to an owner-occupancy requirement.

Two residents spoke, one in favor and one concerned about on-street parking. Chair Abrams said the commission needed more time with the parking standards. The hearing was continued to the December 11 meeting.`,
      },
      {
        n: 5,
        text: `# Rezoning request RZ-2026-04: 418 Alder Street (public hearing)

Ms. Rao presented the staff report. The application, filed by Cedar Row Partners LLC, asks to rezone 1.2 acres at 418 Alder Street from R-1 Single-Family Residential to MU-2 Mixed-Use Residential. The applicant proposes 18 townhomes on the site, which now holds a vacant warehouse.

The City Council referred the application to the commission on November 10 and asked for a recommendation within 30 days.

Dana Kessler, representing Cedar Row Partners, said the company has built similar townhome projects in two neighboring towns and would be willing to accept reasonable conditions.`,
      },
      {
        n: 6,
        text: `# Rezoning request RZ-2026-04 (continued): public comment

Eight residents spoke. Joseph Tran of Alder Street said parking on the street is already scarce and that school buses use Alder to reach Harlow Elementary. Two other neighbors said they worried that construction traffic would block the street. One resident, Naomi Feld, spoke in favor and said the neighborhood needs housing that younger families can afford.

Ms. Kessler responded that the proposal includes off-street parking and that a traffic review would be part of the site plan stage.`,
      },
      {
        n: 7,
        text: `# Rezoning request RZ-2026-04 (continued): commission action

Commissioner Thornbury disclosed that she owns property adjoining the site and recused herself from the discussion and the vote.

Commissioner Delgado moved, seconded by Commissioner Sato, to recommend that the City Council approve the rezoning, subject to two conditions: (1) an eight-foot opaque buffer fence along the north and east property lines, and (2) a minimum of 1.5 off-street parking spaces per unit.

Roll call: Ayes (4): Abrams, Delgado, Sato, Mehta. Nays (2): Pruitt, Hollis. Recused (1): Thornbury. The motion carried 4–2.`,
      },
      {
        n: 8,
        text: `# Next steps on RZ-2026-04

Ms. Rao said the commission's recommendation will be forwarded to the City Council. A public hearing before the council is scheduled for Tuesday, December 8, 2026, and notice will be mailed to owners within 300 feet of the site.

# Other business

The commission set its next regular meeting for Friday, December 11, at 6:30 p.m.`,
      },
      {
        n: 9,
        text: `# Adjournment

There being no further business, Chair Abrams adjourned the meeting at 9:12 p.m.

Respectfully submitted,

Gwen Halloran, City Clerk, for the Planning Commission

These minutes are a draft until approved by the commission at its next regular meeting.`,
      },
    ],
  },
  {
    id: 'leaves',
    short: 'Press: Leaves',
    date: 'Nov 9',
    title: 'Press release: leaf collection schedule',
    meta: 'Issued Monday, Nov. 9, 2026',
    running: 'CITY OF BRANNOCK · OFFICE OF THE CITY MANAGER · NEWS RELEASE',
    kind: 'release',
    pages: [
      {
        n: 1,
        text: `FOR IMMEDIATE RELEASE · November 9, 2026

# Leaf collection moves to a two-zone schedule this year

BRANNOCK — Beginning Monday, Nov. 23, the Department of Public Works will collect leaves on a two-zone rotation instead of a single citywide route. Last year's single route took five weeks to complete.

Zone A, the part of the city north of Fenwick Avenue, will be collected the weeks of Nov. 23 and Dec. 7. Zone B, south of Fenwick Avenue, will be collected the weeks of Nov. 30 and Dec. 14.

Leaves must be at the curb by 6:30 a.m. on Monday of the assigned week, either in paper yard-waste bags or raked loose. Plastic bags will not be collected. Leaves should not be pushed into the street or onto storm drains.

The program ends Friday, Dec. 18. Residents with questions may call the Public Works information line at (607) 555-0142.`,
      },
    ],
  },
  {
    id: 'water',
    short: 'Press: Water main',
    date: 'Nov 11',
    title: 'Press release: Fenwick Avenue water main',
    meta: 'Issued Wednesday, Nov. 11, 2026',
    running: 'CITY OF BRANNOCK · DEPARTMENT OF PUBLIC WORKS · NEWS RELEASE',
    kind: 'release',
    pages: [
      {
        n: 1,
        text: `FOR IMMEDIATE RELEASE · November 11, 2026

# Fenwick Avenue water main replacement to begin Dec. 1

BRANNOCK — The Department of Public Works will begin replacing about 2,600 feet of 1920s-era cast-iron water main along Fenwick Avenue between Harlow Street and 9th Street on Tuesday, Dec. 1. The work is expected to take eight weeks, weather permitting.

The City Council awarded the construction contract to Kestrel Utility Contractors on Nov. 10. The $1.46 million project is paid for from the water enterprise fund.

Crews will close one lane of Fenwick Avenue at a time, and parking will be limited on the block under construction. Water service will be interrupted for up to four hours at each address while crews connect homes to the new main. Affected households will receive a door hanger at least 48 hours in advance.

Residents with questions may call the Public Works information line at (607) 555-0142.`,
      },
    ],
  },
]

export const DOC_BY_ID = Object.fromEntries(DOCS.map((d) => [d.id, d]))

export function getPage(docId, n) {
  const doc = DOC_BY_ID[docId]
  return doc ? doc.pages.find((p) => p.n === n) : undefined
}

export const UNREADABLE = { docId: 'council', pages: [6, 7, 8] }
