// Club settings and the club's rules note as they appear in the software.
// The rules note is maintained by the regular director (M. Feld); the copy below is the
// version loaded into this event.

export const clubSettings = {
  timeControl: 'G/25+5',
  clubRated: true,
  halfByeLateRounds: [1, 2] as const,
  fullByeRule: 'lowest-rated player in the lowest score group who has not had a bye yet',
  colourBalance: true,
  tiebreaks: ['Buchholz Cut-1', 'Sonneborn-Berger'] as const,
};

export interface RuleSection {
  id: string;
  title: string;
  body: string[];
}

export const rulesNote: { heading: string; by: string; sections: RuleSection[] } = {
  heading: 'Rules note: Saturday monthly rated-practice Swiss',
  by: 'Maintained by M. Feld, regular tournament director',
  sections: [
    {
      id: 'format',
      title: 'Format',
      body: [
        'Five rounds of Swiss pairing, G/25+5, club-rated. Players are grouped by points and paired within their group wherever possible.',
        'Within a score group, the top half of the group (by rating) plays the bottom half. No two players meet twice.',
      ],
    },
    {
      id: 'results',
      title: 'Results and disputes',
      body: [
        'The signed scoresheet is the record of the game. If players tell the director a different result from the one entered, check the scoresheet and ask both players.',
        'Correct the result in the software before the next round is posted and write a short reason. Once a round is posted, changing a result does not re-pair anyone.',
      ],
    },
    {
      id: 'late',
      title: 'Late entries',
      body: [
        'A player who arrives after the event has started may join at the next round to be posted.',
        'A late entry may be given a half-point bye for each of rounds 1 and 2 they missed. Byes are not given for later rounds.',
        'A late entry who is not playing is marked "not joining" so the record is complete.',
      ],
    },
    {
      id: 'withdraw',
      title: 'Withdrawals',
      body: [
        'A player who has to leave is withdrawn before the next round is posted. They are not paired again.',
        'Their points stay in the standings and still count for their opponents’ tiebreaks.',
      ],
    },
    {
      id: 'byes',
      title: 'Byes',
      body: [
        'A bye is only needed when an odd number of players is eligible for a round. The bye is a full point.',
        'The bye goes to the lowest-rated player in the lowest score group who has not had a bye yet. Nobody gets a second bye while someone in their group has not had one.',
      ],
    },
    {
      id: 'floats',
      title: 'Floats',
      body: [
        'If a score group has an odd number of players, one player floats down to the next group for that round. The floater is the lowest-rated player who cannot be paired in their own group without a repeat game.',
      ],
    },
    {
      id: 'colours',
      title: 'Colours',
      body: [
        'Colour balance is on. A player who has had one colour two more times than the other is given the other colour. A player who had the same colour in the last two games is given the other colour.',
      ],
    },
    {
      id: 'tiebreaks',
      title: 'Tiebreaks',
      body: [
        'Standings are ordered by points, then Buchholz Cut-1, then Sonneborn-Berger. Players still level after all three share a place.',
        'Byes and late-entry credits do not count as opponents.',
      ],
    },
    {
      id: 'posting',
      title: 'Before a round is posted',
      body: [
        'Every result from the last round is entered. Any disputed result is resolved.',
        'Late entries are added or marked "not joining". Players who have gone home are withdrawn.',
      ],
    },
  ],
};

export interface GlossaryTerm {
  term: string;
  short: string;
  long: string;
}

export const glossary: GlossaryTerm[] = [
  {
    term: 'Active player',
    short: 'Can be paired in the round being prepared.',
    long: 'Playing in the event, has joined by that round, and has not been withdrawn. Only active players are paired, and the bye check counts only active players.',
  },
  {
    term: 'Score group',
    short: 'Everyone with the same number of points so far.',
    long: 'Players are paired within their score group first. Score groups are paired from the highest points down.',
  },
  {
    term: 'Bye',
    short: 'A round where a player is not paired and is credited points.',
    long: 'Used only when an odd number of players is active. The bye is recorded on the player, not as a game.',
  },
  {
    term: 'Full-point bye',
    short: 'One point for a round not played.',
    long: 'The pairing bye. Goes to the lowest-rated player in the lowest score group who has not had a bye yet.',
  },
  {
    term: 'Half-point bye',
    short: 'Half a point for a round not played.',
    long: 'Club rule: a late entry may be credited ½ for each of round 1 and round 2 they missed. It is never a pairing bye, so it does not count as having had a bye.',
  },
  {
    term: 'Late entry',
    short: 'A player who joins after the event has started.',
    long: 'Added as active from the next round to be posted. Any half-point credit is decided when they join.',
  },
  {
    term: 'Withdrawal',
    short: 'A player who leaves and is not paired again.',
    long: 'Withdrawn from the next round to be posted. Points already earned stay in the standings and still count for opponents’ tiebreaks.',
  },
  {
    term: 'Colour due',
    short: 'The colour a player should get next.',
    long: 'Decided by colour balance: a player with two more games of one colour gets the other, and a player who had the same colour twice in a row gets the other.',
  },
  {
    term: 'Float',
    short: 'Moving a player down to the next score group for one round.',
    long: 'Happens when a score group has an odd number of players left after pairing. The floater is paired in the next group down.',
  },
  {
    term: 'Disputed result',
    short: 'The entered result does not match what the players report.',
    long: 'Check the signed scoresheet, ask both players, then correct the result with a reason. Resolve it before the next round is posted.',
  },
  {
    term: 'Buchholz Cut-1',
    short: 'Total of your opponents’ scores, minus the lowest one.',
    long: 'A measure of how strong your opponents were. The lowest-scoring opponent is dropped so one weak opponent does not drag the total down.',
  },
  {
    term: 'Sonneborn-Berger',
    short: 'Second tiebreak: wins and draws weighted by the opponent’s score.',
    long: 'For each win, add the beaten opponent’s score. For each draw, add half the opponent’s score. Losses add nothing.',
  },
];
