import type { Section, Speaker, Transcript } from '../../types';
import { parseTime } from '../../lib/time';

const speakers: Record<string, Speaker> = {
  ir: { id: 'ir', name: 'Priya Shah', title: 'Vice President, Investor Relations', org: 'Harrowgate Outdoor', kind: 'host' },
  ceo: { id: 'ceo', name: 'Caroline Vance', title: 'Chief Executive Officer', org: 'Harrowgate Outdoor', kind: 'management' },
  cfo: { id: 'cfo', name: 'Nathan Okoro', title: 'Chief Financial Officer', org: 'Harrowgate Outdoor', kind: 'management' },
  op: { id: 'op', name: 'Operator', title: 'Conference operator', org: 'Harrowgate Outdoor', kind: 'operator' },
  frost: { id: 'frost', name: 'Alexandra Frost', title: 'Analyst', org: 'Meridian Equity Research', kind: 'analyst' },
  lindqvist: { id: 'lindqvist', name: 'Ben Lindqvist', title: 'Analyst', org: 'Northgate Partners', kind: 'analyst' },
  castellano: { id: 'castellano', name: 'Maya Castellano', title: 'Analyst', org: 'Brightwater Research', kind: 'analyst' },
  doherty: { id: 'doherty', name: 'Samuel Doherty', title: 'Analyst', org: 'Fairhaven Capital', kind: 'analyst' },
  park: { id: 'park', name: 'Jun Park', title: 'Analyst', org: 'Cordell & Vine', kind: 'analyst' },
  weller: { id: 'weller', name: 'Tom Weller', title: 'Analyst', org: 'Pelham Street Research', kind: 'analyst' },
  haddad: { id: 'haddad', name: 'Rafi Haddad', title: 'Analyst', org: 'Ironbark Securities', kind: 'analyst' },
  monroe: { id: 'monroe', name: 'Keisha Monroe', title: 'Analyst', org: 'Stonebridge Asset Management', kind: 'analyst' },
  ferreira: { id: 'ferreira', name: 'Lucia Ferreira', title: 'Analyst', org: 'Ashgrove Capital', kind: 'analyst' },
};

type Row = [t: string, speaker: string, section: Section, question: boolean, text: string];

const rows: Row[] = [
  // Prepared remarks: CEO
  ['0:00', 'ir', 'ceo', false, "Good afternoon, and welcome to Harrowgate Outdoor's third-quarter fiscal 2026 earnings call. I'm Priya Shah, Vice President of Investor Relations. With me are Caroline Vance, our Chief Executive Officer, and Nathan Okoro, our Chief Financial Officer. Today's remarks include forward-looking statements that are subject to the risks in our filings, and we will refer to adjusted measures reconciled in today's release. Caroline, please go ahead."],
  ['0:58', 'ceo', 'ceo', false, "Thank you, Priya, and good afternoon, everyone. Third-quarter comparable sales rose 3.2%, ahead of our plan, and adjusted operating margin came in at 9.4%. The quarter was driven by a stronger back-to-school and a better-than-expected response to our fall product drops, especially layering and cold-weather footwear."],
  ['3:20', 'ceo', 'ceo', false, "Comparable-store traffic was positive for the first time since the second quarter of last year. Average ticket was flat, which tells us the customer is coming back more often rather than trading up. I'll come back to how we measure that in our loyalty data."],
  ['6:10', 'ceo', 'ceo', false, "We opened 11 stores and closed 4 underperforming locations, ending the quarter at 412. The Harrowgate Trailhead format, a smaller-footprint store we piloted in Denver and Boise, is running about 18% ahead of our legacy box on sales per square foot after two quarters."],
  ['9:35', 'ceo', 'ceo', false, "Digital sales grew 6%. Members of Harrowgate Summit, our loyalty program, now account for 58% of online sales. Member visit frequency is up, and the redemption rate on outerwear rewards is the highest we have recorded."],
  ['12:05', 'ceo', 'ceo', false, "Before Nathan takes you through the numbers, a word on the holiday setup. We are investing in inventory discipline, not in volume. We would rather end the year with clean shelves than with a warehouse full of last season's shell jackets. Nathan?"],

  // Prepared remarks: CFO
  ['14:10', 'cfo', 'cfo', false, "Thank you, Caroline, and good afternoon. Net sales were $1.36 billion, up 4.1% year over year. Gross margin was 40.1%, up 30 basis points, driven by lower air freight and fewer clearance units in the back half of the quarter. SG&A leveraged modestly."],
  ['16:45', 'cfo', 'cfo', false, "Adjusted diluted earnings per share were $1.42, compared with $1.31 a year ago and above the $1.30 to $1.36 range we gave in August."],
  ['19:30', 'cfo', 'cfo', false, "Turning to the full year. We are reaffirming our fiscal 2026 adjusted gross margin outlook of approximately 39.5%. That reflects the path we laid out in August, with ocean freight stable and promotional depth in line with the plan we built this summer. Our adjusted operating margin outlook is unchanged at 8.6% to 8.9%."],
  ['21:40', 'cfo', 'cfo', false, "On the balance sheet, liquidity is $740 million, including undrawn revolver capacity. Our capital allocation priorities have not changed."],
  ['22:04', 'cfo', 'cfo', false, "Inventory ended the quarter at $612 million, up 6% year over year, against store growth of 4%. About 70% of our holiday receipts are already in our distribution centers, and in-transit goods are the smallest share of the balance we have carried in three years."],
  ['24:10', 'cfo', 'cfo', false, "On capital returns, we repurchased $45 million of stock in the quarter and have $180 million remaining under the current authorization. Capital expenditures were $38 million, mostly new-format build-outs and the distribution center automation pilot."],
  ['25:20', 'cfo', 'cfo', false, "For the fourth quarter, we expect comparable sales growth of 1% to 3% and adjusted operating margin of about 8.0%, reflecting holiday mix. That concludes our prepared remarks. Operator, please open the line for questions."],

  // Analyst Q&A
  ['26:30', 'op', 'qa', false, "Thank you. We will now begin the question-and-answer session. Please limit yourself to one question and one follow-up. Our first question comes from Ben Lindqvist of Northgate Partners."],
  ['26:40', 'lindqvist', 'qa', true, "Thanks, and congratulations on the traffic turn. Caroline, you said ticket was flat. How are you thinking about promotional versus full-price units into December, and are you seeing trade-down in the core tiers?"],
  ['27:50', 'ceo', 'qa', false, "We're not seeing trade-down in the core, Ben. The customer buying a $180 shell is buying the $180 shell. Where we see price sensitivity is in entry-level fleece, where about 9% of units have moved to promotional pricing since October."],
  ['29:10', 'ceo', 'qa', false, "Summit data helps here. Members who received a personalized offer in September came back about 1.4 times as often in October as members who did not. That is a better read on demand than the aggregate comp."],

  ['30:05', 'castellano', 'qa', true, "Maya Castellano, Brightwater Research. Nathan, inventory was up 6% against store growth of 4%. How much of that sits in outerwear, and how much markdown exposure are you carrying into January?"],
  ['31:10', 'cfo', 'qa', false, "Outerwear is roughly 45% of the increase. We bought deeper into the cold-weather shell program in July because lead times from our supplier base stretched. We have reserved for 2 to 3 points of potential markdown on fourth-quarter outerwear receipts, and we would rather carry that than be short in November."],
  ['32:40', 'castellano', 'qa', true, "So that reserve is already in the gross margin outlook?"],
  ['32:50', 'cfo', 'qa', false, "It is, which is part of why we are comfortable reaffirming the 39.5% for the year. I can come back to the margin in more detail if you want it."],
  ['33:30', 'castellano', 'qa', false, "Thanks, that's helpful."],

  ['33:45', 'doherty', 'qa', true, "Samuel Doherty, Fairhaven Capital. On e-commerce, digital grew 6%, a clear slowdown from the high single digits in the first half. Is that a deliberate choice around shipping thresholds, or is it demand?"],
  ['34:40', 'ceo', 'qa', false, "It's deliberate, Samuel. We raised the free-shipping threshold to $75 in September because our margin on sub-threshold orders was too thin, and we gave up some low-basket orders. Average order value is up, and contribution margin per order is up about 40 basis points."],
  ['36:00', 'doherty', 'qa', true, "So you would accept slower digital growth for better unit economics?"],
  ['36:10', 'ceo', 'qa', false, "Yes. Growth at any cost is how you end up with a clearance problem in January."],

  ['37:15', 'park', 'qa', true, "Jun Park, Cordell and Vine. Caroline, you opened 11 stores and closed 4. Is the Trailhead format still on track for the 60 locations you outlined in August?"],
  ['38:10', 'ceo', 'qa', false, "We're on track for 60 by the end of fiscal 2027, but the mix is shifting. Next year we will open fewer large-box formats and more Trailheads in suburban markets, where we have the clearest evidence of demand."],
  ['39:30', 'park', 'qa', true, "What is the capex implication? Is the build-out lower per store?"],
  ['39:45', 'cfo', 'qa', false, "About 25% lower per store, mostly because we are reusing existing fixtures and leasing smaller footprints. We will give you the full capex bridge in February."],

  // Walkback exchange
  ['40:30', 'frost', 'qa', true, "Alexandra Frost, Meridian Equity Research. Nathan, in your prepared remarks you reaffirmed approximately 39.5% for the full year. Given the freight and promotional cadence you described for the holiday, does 39.5% still feel like the right anchor?"],
  ['40:58', 'ceo', 'qa', false, "Nathan will take that one directly, Alexandra."],
  ['41:15', 'cfo', 'qa', false, "Alexandra, I'll be direct, because the question deserves it. When we spoke about 39.5% in prepared remarks, that was our best view as of late October. Since then two things have moved. Ocean freight for the holiday window came in roughly 90 basis points above our plan, and we are running deeper promotional depth in outerwear clearance than we budgeted."],
  ['41:52', 'cfo', 'qa', false, "So I would be doing you a disservice if I kept 39.5% as the anchor. Our working plan for the full year is now 38.8% to 39.0% adjusted gross margin, and I would put us closer to the bottom of that range than the top."],
  ['42:31', 'frost', 'qa', true, "So that's a revision of roughly 50 to 70 basis points from the 39.5% you reaffirmed earlier on this call?"],
  ['42:40', 'cfo', 'qa', false, "That is the right way to frame it. The 39.5% assumed a promotional cadence we no longer expect to hold, and I would rather reset the number now than in February."],
  ['43:10', 'frost', 'qa', true, "And the fourth quarter specifically?"],
  ['43:18', 'cfo', 'qa', false, "Fourth-quarter gross margin should be down year over year by roughly 60 basis points, primarily from freight and clearance. We are not planning for that to reverse before spring receipts arrive."],
  ['43:55', 'frost', 'qa', false, "Thank you. That's clear."],

  ['44:20', 'weller', 'qa', true, "Tom Weller, Pelham Street Research. I want to push on the framing. Caroline, is this timing, as the first part of Nathan's answer suggests, or is it structural to the margin model?"],
  ['44:50', 'ceo', 'qa', false, "Mostly timing, Tom. Freight normalizes in the spring, and the clearance we are running now cleans up outerwear receipts. It is not a change in how we price. The structural story has not changed: private label and the Trailhead format still add about 150 basis points of gross margin over three years."],
  ['45:50', 'weller', 'qa', true, "You said mostly timing, but Nathan revised the full-year number in the same breath. Which is it?"],
  ['46:25', 'cfo', 'qa', false, "Both can be true. The full-year number reflects timing, and the three-year model is structural. We will refresh the three-year framework in February with the new store formats."],
  ['47:20', 'weller', 'qa', false, "Fair enough. Thank you."],

  ['47:50', 'haddad', 'qa', true, "Rafi Haddad, Ironbark Securities. Quick one on capital returns. With $180 million left on the authorization and the margin revision, are you still planning to repurchase at the same pace in the fourth quarter?"],
  ['48:35', 'cfo', 'qa', false, "We'll be more measured. We bought $45 million this quarter. Given the revised margin outlook, I would expect fourth-quarter repurchases closer to $25 million, and we will revisit with February results."],
  ['49:30', 'haddad', 'qa', true, "Got it. Did the Summit membership count change its enrollment criteria?"],
  ['49:45', 'ceo', 'qa', false, "No change. We have 4.1 million active members, on the same definition we have used since fiscal 2024."],

  ['51:20', 'monroe', 'qa', true, "Keisha Monroe, Stonebridge Asset Management. Two questions on costs. Are distribution center wage rates running above plan after the automation pilot, and what does that mean for SG&A leverage in fiscal 2027?"],
  ['52:10', 'cfo', 'qa', false, "Wages are about 3% above plan in the two pilot DCs, and automation offsets roughly half of that. We expect modest SG&A leverage in fiscal 2027, around 10 to 20 basis points."],
  ['53:20', 'monroe', 'qa', true, "And the store count for next year? Are you still planning 20 to 25 net new?"],
  ['53:35', 'ceo', 'qa', false, "Closer to 15 to 20 net new, given the format shift. We will give you the detailed plan in February."],
  ['54:40', 'monroe', 'qa', false, "Thanks, that helps."],

  ['54:50', 'ferreira', 'qa', true, "Lucia Ferreira, Ashgrove Capital. Back to the holiday guide. Your fourth-quarter comp range is 1% to 3%. Does that already include the clearance you are describing, or is it a separate line?"],
  ['55:35', 'cfo', 'qa', false, "It is included. The comp range is on sales, so clearance supports units but does not change the comp math. Fourth-quarter sales guidance is unchanged. The change is in margin."],
  ['56:20', 'ferreira', 'qa', true, "Clear. Last one: any change to the digital target?"],
  ['56:35', 'ceo', 'qa', false, "No change. We still target digital at 22% of sales by fiscal 2028. The threshold change is about profitable growth, not the target."],

  ['57:50', 'ceo', 'qa', false, "Thank you, all. Traffic and member engagement were good this quarter. Our full-year margin view has changed, and we said so plainly today. We would rather reset expectations once, carefully, than have to do it again in February. Thank you for joining us."],
  ['60:10', 'op', 'qa', false, "This concludes today's conference call. A replay will be available on the Harrowgate Outdoor investor relations website."],
];

export const hrgoQ3Transcript: Transcript = {
  speakers,
  exchangeTopics: {
    [parseTime('26:40')]: 'Comp sales and traffic',
    [parseTime('30:05')]: 'Inventory and markdown exposure',
    [parseTime('33:45')]: 'E-commerce and shipping threshold',
    [parseTime('37:15')]: 'Store openings and capex per store',
    [parseTime('40:30')]: 'Full-year gross margin anchor',
    [parseTime('44:20')]: 'Timing vs. structural margin',
    [parseTime('47:50')]: 'Buybacks and capital returns',
    [parseTime('51:20')]: 'Distribution costs and store growth',
    [parseTime('54:50')]: 'Holiday comp and digital target',
  },
  segments: rows.map(([t, speaker, section, question, text]) => ({
    t: parseTime(t),
    speaker,
    section,
    question,
    text,
  })),
  notes: [
    {
      t: parseTime('19:42'),
      author: 'Professor Chen',
      text: "Reaffirmed full-year guide. Note the exact wording (\"approximately 39.5%\"). You will need it to compare with the Q2 call.",
    },
    {
      t: parseTime('41:15'),
      author: 'Professor Chen',
      text: 'margin guidance revision — listen carefully',
    },
    {
      t: parseTime('44:50'),
      author: 'Professor Chen',
      text: "The CEO calls this \"mostly timing.\" Test that framing against the CFO's answer at 41:15.",
    },
  ],
};
