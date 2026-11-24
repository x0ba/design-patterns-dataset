import { recording } from './build'

export const oct24 = recording(
  {
    id: 'oct24',
    kind: 'journal',
    title: 'Journal club',
    short: 'Journal club · Oct 24',
    date: '2026-10-24',
    length: '41:00',
    presenter: 'hana',
    paper: 'Picoplankton succession through a coastal marine heatwave: a six-year flow cytometry record',
  },
  [
    ['0:00', 'Why this paper', 'skip', '', 'Hana explains why she chose it. Background on the heatwave record.'],
    ['3:20', 'Methods: sampling and gating', 'skim', 'cytometer', 'How the authors gated populations on a long time series. The only part with a bearing on your underway cytometry.'],
    ['14:20', 'Results: community shifts', 'skip', '', 'Synechococcus rises, heterotrophic bacteria fall. Nothing tied to your work.'],
    ['27:20', 'Critique: statistics and confounders', 'skip', '', 'Discussion of the time-series model and missing summers.'],
    ['36:20', 'Takeaways and next paper', 'skip', '', 'Wrap-up and the next presenter.'],
  ],
  [
    ['0:00', 'hana', 'Thanks for coming. I picked this paper because it’s a six-year flow cytometry record through a marine heatwave, and half of us are going to be generating similar data in the next year. The authors sampled biweekly at one coastal station and tracked three groups: Synechococcus, small eukaryotes, and heterotrophic bacteria.'],
    ['1:50', 'halv', 'What was the heatwave, in terms of temperature? I’d like a number, not just “warm”.'],
    ['2:20', 'hana', 'Surface temperature was about two and a half degrees above the climatological mean for almost five months, and the authors treat that as the event window.'],
    ['3:20', 'hana', 'Methods. They fixed samples with glutaraldehyde and flash-froze them, which is exactly our protocol, then stained with SYBR Green for the bacteria. The gating is where I have questions. They set gates by hand on the first sampling date and then reused them for the entire six years, with a drift correction based on reference beads.'],
    ['6:40', 'maren', 'That worries me. If the instrument’s laser power moves, the reference beads move with it, but populations can shift for biological reasons too. How do they tell the difference?'],
    ['7:30', 'hana', 'They don’t, entirely. They validate on thirty re-run samples and report a coefficient of variation under eight percent for the bead-normalised counts, which is respectable.'],
    ['9:10', 'priya', 'Sorry, did the beads come from the same lot every time?'],
    ['9:40', 'hana', 'The supplementary table says two lots, with an overlap period of three months. So there’s a bridging check.'],
    ['12:30', 'jun', 'It’s worth noting that they log instrument QC every Friday. That’s what we’re about to do with the new rules.'],
    ['14:20', 'hana', 'Results. Synechococcus abundance rises through the first half of the heatwave and then falls sharply once nitrate runs out. Heterotrophic bacteria move in the opposite direction, with a lag of about three weeks.'],
    ['19:50', 'tomas', 'Is the lag causal, or just coincident with the bloom crash?'],
    ['20:30', 'hana', 'They only claim correlation. The cross-correlation peaks at twenty-one days.'],
    ['27:20', 'ama', 'My concern is the model. They fit a seasonal term and a heatwave term, but the heatwave overlaps most of one summer, so it’s very hard to separate them.'],
    ['30:00', 'halv', 'Agreed, and two of the six years are missing the spring samples. I’d treat the effect size with caution. The qualitative pattern is credible, though.'],
    ['36:20', 'hana', 'Takeaways. It’s a useful reference for how to run a long time series on a shared instrument. I’ll post my notes on the gating in the group folder.'],
    ['38:10', 'halv', 'Thank you, Hana. Next journal club is the seventh. Tomás, you’ve picked something?'],
  ],
)
