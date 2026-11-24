import type { Section, Speaker, Transcript } from '../../types';
import { parseTime } from '../../lib/time';

const speakers: Record<string, Speaker> = {
  ir: { id: 'ir', name: 'Priya Shah', title: 'Vice President, Investor Relations', org: 'Harrowgate Outdoor', kind: 'host' },
  ceo: { id: 'ceo', name: 'Caroline Vance', title: 'Chief Executive Officer', org: 'Harrowgate Outdoor', kind: 'management' },
  cfo: { id: 'cfo', name: 'Nathan Okoro', title: 'Chief Financial Officer', org: 'Harrowgate Outdoor', kind: 'management' },
  op: { id: 'op', name: 'Operator', title: 'Conference operator', org: 'Harrowgate Outdoor', kind: 'operator' },
  frost: { id: 'frost', name: 'Alexandra Frost', title: 'Analyst', org: 'Meridian Equity Research', kind: 'analyst' },
  lindqvist: { id: 'lindqvist', name: 'Ben Lindqvist', title: 'Analyst', org: 'Northgate Partners', kind: 'analyst' },
  haddad: { id: 'haddad', name: 'Rafi Haddad', title: 'Analyst', org: 'Ironbark Securities', kind: 'analyst' },
};

type Row = [t: string, speaker: string, section: Section, question: boolean, text: string];

const rows: Row[] = [
  ['0:00', 'ir', 'ceo', false, "Good afternoon, and welcome to Harrowgate Outdoor's second-quarter fiscal 2026 earnings call. I'm Priya Shah, Vice President of Investor Relations. With me are Caroline Vance and Nathan Okoro. Caroline, please go ahead."],
  ['0:50', 'ceo', 'ceo', false, "Thank you, Priya. Second-quarter comparable sales rose 1.8%, led by our summer assortment and a stronger response to the new trail footwear line. Adjusted operating margin was 8.8%."],
  ['4:30', 'ceo', 'ceo', false, "The Trailhead pilot opened in Denver and Boise this quarter. It is early, but sales per square foot are tracking ahead of plan, and we have not yet seen the cannibalization we were concerned about."],
  ['8:15', 'ceo', 'ceo', false, "Summit membership reached 4.0 million active members. Loyalty penetration in online sales was 56%."],
  ['10:40', 'ceo', 'ceo', false, "I'll hand over to Nathan for the numbers."],

  ['12:00', 'cfo', 'cfo', false, "Thank you, Caroline. Net sales were $1.31 billion, up 3.4%. Gross margin was 39.8%, up 20 basis points, reflecting lower ocean freight costs and disciplined summer clearance."],
  ['16:20', 'cfo', 'cfo', false, "Adjusted diluted earnings per share were $1.33, above the top of our $1.22 to $1.28 range."],
  ['19:40', 'cfo', 'cfo', false, "For fiscal 2026, we now expect adjusted gross margin of approximately 39.5%. That assumes ocean freight holds near current levels and that fall promotional depth stays close to plan. Our adjusted operating margin outlook is 8.6% to 8.9%."],
  ['23:05', 'cfo', 'cfo', false, "Inventory ended the quarter at $586 million, up 3% on store growth of 3%. We feel good about the mix going into the back half."],
  ['25:30', 'cfo', 'cfo', false, "We repurchased $30 million of stock in the quarter, and capital expenditures were $29 million. That concludes our prepared remarks. Operator?"],

  ['26:30', 'op', 'qa', false, "Thank you. Our first question comes from Alexandra Frost of Meridian Equity Research."],
  ['26:45', 'frost', 'qa', true, "Nathan, with ocean freight coming down, how much of the 39.5% is locked in, and how much depends on fall promotions?"],
  ['27:50', 'cfo', 'qa', false, "About two-thirds is contracted. The remaining third depends on promotional depth in October and November, which we have planned about 30 basis points below last year."],
  ['29:20', 'frost', 'qa', true, "Has the fall promotional plan changed since you set that number?"],
  ['29:40', 'ceo', 'qa', false, "Not yet. We will revisit it at the end of the quarter."],

  ['31:10', 'lindqvist', 'qa', true, "Caroline, two quarters of Trailhead data is early. What would make you slow the rollout?"],
  ['31:40', 'ceo', 'qa', false, "Two things. Sales per square foot falling below plan, or payback stretching beyond four years. If the suburban test markets do not confirm the urban results, we would slow the rollout."],
  ['34:10', 'lindqvist', 'qa', false, "Thank you."],

  ['35:00', 'haddad', 'qa', true, "Rafi Haddad, Ironbark Securities. You repurchased $30 million this quarter. How do you balance buybacks against the store build?"],
  ['35:40', 'cfo', 'qa', false, "The store build comes first. We buy back stock with cash left after the capital plan, and we intend to keep leverage below 1.5 times."],
  ['36:50', 'haddad', 'qa', false, "Understood. Thank you."],
];

export const hrgoQ2Transcript: Transcript = {
  speakers,
  exchangeTopics: {
    [parseTime('26:45')]: 'Gross margin: contracted vs. promotional',
    [parseTime('31:10')]: 'Trailhead rollout pace',
    [parseTime('35:00')]: 'Buybacks vs. store build',
  },
  segments: rows.map(([t, speaker, section, question, text]) => ({
    t: parseTime(t),
    speaker,
    section,
    question,
    text,
  })),
  notes: [],
  partialNote: 'Partial transcript: prepared remarks and the first three analyst exchanges.',
};
