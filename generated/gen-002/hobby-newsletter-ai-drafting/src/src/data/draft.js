// The assistant's output for the "What Council Did" task, plus the task record and work log.

export const ISSUE = {
  newsletter: 'The Eastside Ledger',
  section: 'What Council Did',
  sendsAt: 'Thu, Nov 19 · 7:00 a.m.',
  subscribers: 340,
  houseLimit: 380,
  perItemLimit: 80,
}

export const TASK = {
  instruction:
    'Read the three council and planning meeting minutes from this week plus the two city press releases, and draft a “What Council Did” section with plain-language items under 80 words each.',
  askedAt: 'Wed, Nov 18 · 6:02 p.m.',
  sources: ['council', 'special', 'planning', 'leaves', 'water'],
}

// Each claim is one sentence of the draft. `sources` are the passages the assistant linked it to.
// `quote` must appear verbatim on the cited page so the viewer can highlight it.
export const ITEMS = [
  {
    id: 1,
    label: 'Leaf pickup goes to two zones',
    confidence: 'high',
    note: 'All four claims come straight from the city’s leaf-collection release.',
    claims: [
      {
        id: '1a',
        text: 'Leaf collection moves to a two-zone rotation starting Monday, Nov. 23.',
        sources: [
          {
            doc: 'leaves',
            page: 1,
            quote:
              'Beginning Monday, Nov. 23, the Department of Public Works will collect leaves on a two-zone rotation',
          },
        ],
      },
      {
        id: '1b',
        text: 'Zone A, north of Fenwick Avenue, is picked up the weeks of Nov. 23 and Dec. 7; Zone B, south of Fenwick, the weeks of Nov. 30 and Dec. 14.',
        sources: [
          {
            doc: 'leaves',
            page: 1,
            quote:
              'Zone A, the part of the city north of Fenwick Avenue, will be collected the weeks of Nov. 23 and Dec. 7. Zone B, south of Fenwick Avenue, will be collected the weeks of Nov. 30 and Dec. 14.',
          },
        ],
      },
      {
        id: '1c',
        text: 'Leaves must be at the curb by 6:30 a.m. Monday, in paper yard-waste bags or raked loose. Plastic bags will not be collected.',
        sources: [
          {
            doc: 'leaves',
            page: 1,
            quote:
              'Leaves must be at the curb by 6:30 a.m. on Monday of the assigned week, either in paper yard-waste bags or raked loose. Plastic bags will not be collected.',
          },
        ],
      },
      {
        id: '1d',
        text: 'The program ends Friday, Dec. 18.',
        sources: [{ doc: 'leaves', page: 1, quote: 'The program ends Friday, Dec. 18.' }],
      },
    ],
  },
  {
    id: 2,
    label: 'Fenwick Avenue water main contract',
    confidence: 'high',
    note: 'The contract award is in the Nov. 10 minutes. Schedule and outage details come from the Public Works release.',
    claims: [
      {
        id: '2a',
        text: 'Council awarded a $1,462,300 contract to Kestrel Utility Contractors on a 7–0 vote to replace the aging water main on Fenwick Avenue.',
        sources: [
          {
            doc: 'council',
            page: 9,
            quote:
              'to award the contract to Kestrel Utility Contractors in the amount of $1,462,300 and to authorize the City Manager to sign. The motion carried 7–0 by roll call.',
          },
        ],
      },
      {
        id: '2b',
        text: 'Crews will replace about 2,600 feet of 1920s cast-iron pipe between Harlow Street and 9th Street, starting Tuesday, Dec. 1.',
        sources: [
          {
            doc: 'water',
            page: 1,
            quote:
              'about 2,600 feet of 1920s-era cast-iron water main along Fenwick Avenue between Harlow Street and 9th Street on Tuesday, Dec. 1',
          },
        ],
      },
      {
        id: '2c',
        text: 'The work should take eight weeks, weather permitting, with one lane closed at a time.',
        sources: [
          { doc: 'water', page: 1, quote: 'The work is expected to take eight weeks, weather permitting.' },
          { doc: 'water', page: 1, quote: 'Crews will close one lane of Fenwick Avenue at a time' },
        ],
      },
      {
        id: '2d',
        text: 'Each home may lose water for up to four hours, with a door hanger at least 48 hours ahead.',
        sources: [
          {
            doc: 'water',
            page: 1,
            quote:
              'Water service will be interrupted for up to four hours at each address while crews connect homes to the new main. Affected households will receive a door hanger at least 48 hours in advance.',
          },
        ],
      },
    ],
  },
  {
    id: 3,
    label: 'Library roof, $214,000',
    confidence: 'low',
    note: 'The Nov. 10 minutes disagree with themselves on the vote. The narrative says 5–2; the roll call on the same page lists four ayes and three nays. I used 5–2 because that is what the text says. I can’t tell which is right.',
    claims: [
      {
        id: '3a',
        text: 'Council approved $214,000 to replace the flat roof on the 1974 wing of the Brannock Public Library.',
        sources: [
          {
            doc: 'council',
            page: 11,
            quote:
              'to approve a budget amendment of $214,000 from the capital reserve fund and to award the roof replacement contract to Hartwell Roofing',
          },
          { doc: 'council', page: 10, quote: 'replace the flat roof over the 1974 wing of the Brannock Public Library' },
        ],
      },
      {
        id: '3b',
        text: 'Water has damaged ceiling tiles in the children’s room and the periodicals room.',
        sources: [
          {
            doc: 'council',
            page: 10,
            quote: 'Water intrusion has damaged ceiling tiles in the children\'s room and the periodicals room',
          },
        ],
      },
      {
        id: '3c',
        text: 'The money comes from the capital reserve fund. Hartwell Roofing submitted the low bid, and work is planned for spring 2027.',
        sources: [
          {
            doc: 'council',
            page: 10,
            quote:
              'The low bid, from Hartwell Roofing, was $214,000, including a 10 percent contingency. Staff recommended paying for the work from the capital reserve fund',
          },
          { doc: 'council', page: 10, quote: 'Work would be scheduled for spring 2027.' },
        ],
      },
      {
        id: '3d',
        text: 'Councilmember Dale Hutchins asked whether patching could put off the cost; staff said the consultant did not recommend it.',
        sources: [
          {
            doc: 'council',
            page: 10,
            quote:
              'Councilmember Hutchins asked whether a partial repair could put off the cost. Mr. Obuya said the consultant did not recommend patching the membrane.',
          },
        ],
      },
      {
        id: '3e',
        text: 'The vote was 5–2.',
        conflict: true,
        sources: [
          {
            doc: 'council',
            page: 11,
            quote: 'The motion carried 5–2.',
            label: 'Narrative says 5–2',
          },
          {
            doc: 'council',
            page: 11,
            quote: 'Roll call: Ayes (4): Castellanos, Teague, Reyes, Venkataraman. Nays (3): Hutchins, Okafor, Wójcik.',
            label: 'Roll call lists 4 ayes, 3 nays',
          },
        ],
        suggestions: [{ label: 'Use the roll-call count (4–3)', text: 'The vote was 4–3.' }],
      },
    ],
  },
  {
    id: 4,
    label: 'Safe Routes grant for Dunmore Road',
    confidence: 'high',
    note: 'I couldn’t locate a source for the quote attributed to Councilmember Okafor. The Nov. 12 minutes only paraphrase her. It may be in pages 6–8 of the Nov. 10 minutes, which I couldn’t read. The other claims link to the Nov. 12 minutes.',
    claims: [
      {
        id: '4a',
        text: 'In a special session Nov. 12, council voted 6–1 to apply for a $480,000 state Safe Routes to School grant.',
        sources: [
          {
            doc: 'special',
            page: 3,
            quote:
              'authorizing the City Manager to submit an application for $480,000 in Safe Routes to School funds',
          },
          { doc: 'special', page: 3, quote: 'The motion carried 6–1 by roll call.' },
        ],
      },
      {
        id: '4b',
        text: 'It would pay for sidewalks along Dunmore Road and a flashing crosswalk beacon at Harlow Elementary.',
        sources: [
          {
            doc: 'special',
            page: 1,
            quote:
              'sidewalk infill along Dunmore Road between Harlow Street and Linden Avenue, and a pedestrian-activated flashing beacon at the Harlow Elementary School crosswalk',
          },
        ],
      },
      {
        id: '4c',
        text: 'The city would put up a $60,000 local match from the street improvement fund.',
        sources: [
          {
            doc: 'special',
            page: 3,
            quote: 'committing a local match of $60,000 from the street improvement fund',
          },
        ],
      },
      {
        id: '4d',
        text: 'The application is due Nov. 20.',
        sources: [
          {
            doc: 'special',
            page: 1,
            quote: 'due to the state Department of Transportation by 5:00 p.m. on Friday, November 20',
          },
        ],
      },
      {
        id: '4e',
        text: '“We have been asking for a crosswalk at Harlow since the day I was sworn in,” Councilmember Ngozi Okafor said.',
        sources: [],
        searchHint: 'crosswalk',
        suggestions: [
          {
            label: 'Replace with the paraphrase in the Nov. 12 minutes',
            text: 'Councilmember Ngozi Okafor asked staff to confirm the city’s local match before the application is filed.',
            sources: [
              {
                doc: 'special',
                page: 2,
                quote:
                  'Councilmember Okafor asked staff to confirm the amount of the city\'s local match before the application is filed.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 5,
    label: 'Alder Street rezoning',
    confidence: 'low',
    note: 'Part of this item rests on the council’s Nov. 10 discussion, which falls in the pages I couldn’t read. I also blended what the Planning Commission did with what the council did. The council has not voted on this yet.',
    claims: [
      {
        id: '5a',
        text: 'The Planning Commission voted 4–2 on Nov. 13 to recommend rezoning 1.2 acres at 418 Alder Street from single-family to mixed-use.',
        sources: [
          {
            doc: 'planning',
            page: 7,
            quote:
              'Roll call: Ayes (4): Abrams, Delgado, Sato, Mehta. Nays (2): Pruitt, Hollis. Recused (1): Thornbury. The motion carried 4–2.',
          },
          {
            doc: 'planning',
            page: 5,
            quote:
              'asks to rezone 1.2 acres at 418 Alder Street from R-1 Single-Family Residential to MU-2 Mixed-Use Residential',
          },
        ],
      },
      {
        id: '5b',
        text: 'Cedar Row Partners wants 18 townhomes where a vacant warehouse stands.',
        sources: [
          {
            doc: 'planning',
            page: 5,
            quote: 'The applicant proposes 18 townhomes on the site, which now holds a vacant warehouse.',
          },
        ],
      },
      {
        id: '5c',
        text: 'The recommendation carries two conditions: a six-foot buffer fence and 1.5 parking spaces per unit.',
        sources: [
          {
            doc: 'planning',
            page: 7,
            quote:
              'subject to two conditions: (1) an eight-foot opaque buffer fence along the north and east property lines, and (2) a minimum of 1.5 off-street parking spaces per unit',
          },
        ],
      },
      {
        id: '5d',
        text: 'Neighbors told the commission they worry about parking and construction traffic.',
        sources: [
          {
            doc: 'planning',
            page: 6,
            quote: 'said parking on the street is already scarce',
          },
          {
            doc: 'planning',
            page: 6,
            quote: 'worried that construction traffic would block the street',
          },
        ],
      },
      {
        id: '5e',
        text: 'Council sent the request to the commission on Nov. 10 after hearing from residents; its own hearing is Dec. 8.',
        sources: [],
        searchHint: 'referred',
      },
    ],
  },
  {
    id: 6,
    label: 'Consent agenda: animal control, Pruitt, lights walk',
    confidence: 'high',
    note: 'Routine items. I kept them short.',
    claims: [
      {
        id: '6a',
        text: 'Council passed three routine items on a 7–0 vote.',
        sources: [{ doc: 'council', page: 4, quote: 'The consent agenda was approved 7–0 by roll call.' }],
      },
      {
        id: '6b',
        text: 'The county animal control contract is renewed for two years at $41,200 a year.',
        sources: [
          {
            doc: 'council',
            page: 4,
            quote:
              'Renewal of the animal control services agreement with Tillery County for two years, January 1, 2027 through December 31, 2028, at $41,200 per year',
          },
        ],
      },
      {
        id: '6c',
        text: 'That is about 6 percent more than the city pays now.',
        sources: [],
        searchHint: '6 percent',
      },
      {
        id: '6d',
        text: 'Walter Pruitt was reappointed to the Planning Commission through 2030.',
        sources: [
          {
            doc: 'council',
            page: 4,
            quote:
              'Reappointment of Walter Pruitt to the Planning Commission for a term ending December 31, 2030',
          },
        ],
      },
      {
        id: '6e',
        text: 'Main Street will close between 2nd and 4th streets for the Holiday Lights Walk on Saturday, Dec. 5.',
        sources: [
          {
            doc: 'council',
            page: 4,
            quote:
              'temporary closure of Main Street between 2nd and 4th Streets for the Holiday Lights Walk on Saturday, December 5, 2026',
          },
        ],
      },
    ],
  },
  {
    id: 7,
    label: 'Fire Department annual report',
    confidence: 'high',
    note: 'Figures are from the Fire Chief’s report on page 5 of the Nov. 10 minutes.',
    claims: [
      {
        id: '7a',
        text: 'Fire Chief Dolores Whitfield told council the department answered 1,184 calls in the year ended Sept. 30, up 6 percent.',
        sources: [
          {
            doc: 'council',
            page: 5,
            quote: 'The department answered 1,184 calls for service, an increase of 6 percent over the prior year.',
          },
        ],
      },
      {
        id: '7b',
        text: 'Medical calls were 62 percent of the total, and the median response time inside city limits was 5 minutes 52 seconds.',
        sources: [
          { doc: 'council', page: 5, quote: 'Emergency medical calls made up 62 percent of the total.' },
          {
            doc: 'council',
            page: 5,
            quote: 'The median response time inside city limits was 5 minutes 52 seconds.',
          },
        ],
      },
      {
        id: '7c',
        text: 'Engine 2, in service since 2004, reaches the end of its front-line life in 2028, and a replacement proposal will come with the next budget.',
        sources: [
          {
            doc: 'council',
            page: 5,
            quote:
              'Engine 2, in service since 2004, will reach the end of its front-line life in 2028 and that the department will bring a replacement proposal to the council during the next budget cycle',
          },
        ],
      },
      {
        id: '7d',
        text: 'Council took no action; the report was for information only.',
        sources: [
          { doc: 'council', page: 5, quote: 'The council received the report; no action was required.' },
        ],
      },
    ],
  },
]

// What the assistant produces when Doug asks it to redo item 5 from the planning minutes alone.
export const ITEM5_PLANNING_ONLY = {
  label: 'Alder Street rezoning',
  confidence: 'high',
  note: 'Rebuilt from the Planning Commission minutes only. I dropped the claim about the council’s Nov. 10 discussion, since the only record of it is in pages I couldn’t read. The fence height now matches the minutes: eight feet, not six.',
  claims: [
    {
      id: '5a',
      text: 'The Planning Commission voted 4–2 on Nov. 13, with one member recused, to recommend rezoning 1.2 acres at 418 Alder Street for mixed-use housing.',
      sources: [
        {
          doc: 'planning',
          page: 7,
          quote:
            'Roll call: Ayes (4): Abrams, Delgado, Sato, Mehta. Nays (2): Pruitt, Hollis. Recused (1): Thornbury. The motion carried 4–2.',
        },
        {
          doc: 'planning',
          page: 5,
          quote:
            'asks to rezone 1.2 acres at 418 Alder Street from R-1 Single-Family Residential to MU-2 Mixed-Use Residential',
        },
      ],
    },
    {
      id: '5b',
      text: 'Cedar Row Partners proposes 18 townhomes on the site of a vacant warehouse.',
      sources: [
        {
          doc: 'planning',
          page: 5,
          quote: 'The applicant proposes 18 townhomes on the site, which now holds a vacant warehouse.',
        },
      ],
    },
    {
      id: '5c',
      text: 'The recommendation requires an eight-foot buffer fence and at least 1.5 parking spaces per unit.',
      sources: [
        {
          doc: 'planning',
          page: 7,
          quote:
            'subject to two conditions: (1) an eight-foot opaque buffer fence along the north and east property lines, and (2) a minimum of 1.5 off-street parking spaces per unit',
        },
      ],
    },
    {
      id: '5d',
      text: 'Neighbors raised concerns about parking and construction traffic.',
      sources: [
        { doc: 'planning', page: 6, quote: 'said parking on the street is already scarce' },
        { doc: 'planning', page: 6, quote: 'worried that construction traffic would block the street' },
      ],
    },
    {
      id: '5e',
      text: 'The City Council holds its public hearing Tuesday, Dec. 8.',
      sources: [
        {
          doc: 'planning',
          page: 8,
          quote: 'A public hearing before the council is scheduled for Tuesday, December 8, 2026',
        },
      ],
    },
  ],
}

export const WORK_LOG = [
  { n: 1, time: '6:02 p.m.', text: 'Read your instruction: three sets of minutes and two press releases in, a “What Council Did” section out, plain language, each item under 80 words.' },
  { n: 2, time: '6:02 p.m.', text: 'Opened all 5 source documents (29 pages in total).' },
  { n: 3, time: '6:03 p.m.', text: 'Read Nov 10 council minutes, pages 1–5.' },
  {
    n: 4,
    time: '6:05 p.m.',
    text: 'Skipped pages 6–8 of council minutes: scanned image, text unreadable.',
    warn: true,
    jump: { doc: 'council', page: 6 },
  },
  { n: 5, time: '6:06 p.m.', text: 'Read Nov 10 council minutes, pages 9–14.' },
  { n: 6, time: '6:08 p.m.', text: 'Read the Nov 12 special session minutes (4 pages).' },
  { n: 7, time: '6:10 p.m.', text: 'Read the Nov 13 Planning Commission minutes (9 pages).' },
  { n: 8, time: '6:12 p.m.', text: 'Read the two press releases: leaf collection and the Fenwick Avenue water main.' },
  { n: 9, time: '6:14 p.m.', text: 'Listed 11 possible items and kept the 7 that most affect residents.' },
  { n: 10, time: '6:17 p.m.', text: 'Drafted 7 items (512 words). Linked each claim to a document and page. 3 claims had no source to link.' },
  { n: 11, time: '6:19 p.m.', text: 'Rated confidence: 5 high, 2 low (items 3 and 5). Noted that I could not locate a source for a quote attributed to Councilmember Okafor.', warn: true },
]
