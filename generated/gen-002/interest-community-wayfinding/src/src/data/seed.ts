import type { Community, Guide, RegionalGroup, Space, Thread } from './types';

// All seed timestamps are in November 2026 (local time). "Today" in the story is Tuesday, Nov 17.
const at = (day: number, hour: number, minute: number) => new Date(2026, 10, day, hour, minute).getTime();

export const communities: Community[] = [
  {
    id: 'sourdough',
    name: 'Sourdough & Wild Yeast',
    members: 1240000,
    joinedAt: at(3, 9, 14),
    description:
      'Starters, shaping, scoring, and everything between a bag of flour and the oven. Beginners are the biggest group here, and no question is too small.',
    pinnedGuideId: 'starter-rescue',
  },
  {
    id: 'houseplants',
    name: 'Houseplants',
    members: 612400,
    joinedAt: at(6, 20, 40),
    description: 'Watering, light, pests, repotting, and the plants that keep surviving us.',
  },
  {
    id: 'crossword',
    name: 'Crossword Club',
    members: 388900,
    joinedAt: at(9, 12, 5),
    description: 'Daily grids, constructor tips, and the clues we argue about.',
  },
  {
    id: 'birding',
    name: 'Local Birding',
    members: 241300,
    joinedAt: at(11, 7, 30),
    description: 'Identify the bird in your yard, log sightings, and share feeder setups.',
  },
];

export const spaces: Space[] = [
  // Sourdough & Wild Yeast
  { id: 'beginners', communityId: 'sourdough', parentId: null, name: 'Beginners', description: 'New to sourdough? Start here. Ask anything about your first starter or your first loaf.', threadCount: 96410 },
  { id: 'starters-help', communityId: 'sourdough', parentId: 'beginners', name: 'Starters Help', description: 'Starter not rising, smelling strange, or looking odd? Post the day number and what you fed it.', threadCount: 31870 },
  { id: 'first-loaves', communityId: 'sourdough', parentId: 'beginners', name: 'First Loaves', description: 'Your first few bakes, from shaping to the last slice.', threadCount: 18500 },
  { id: 'kitchen-basics', communityId: 'sourdough', parentId: 'beginners', name: 'Kitchen Basics', description: 'Ovens, pots, proofing spots, and the tools you already own.', threadCount: 12400 },
  { id: 'starters', communityId: 'sourdough', parentId: null, name: 'Starters', description: 'Feeding, temperature, storage, and revival for every kind of starter.', threadCount: 58220 },
  { id: 'starter-logs', communityId: 'sourdough', parentId: 'starters', name: 'Daily Starter Logs', description: 'Day-by-day notes from new and established starters.', threadCount: 14300 },
  { id: 'rye-spelt-starters', communityId: 'sourdough', parentId: 'starters', name: 'Rye & Spelt Starters', description: 'Whole-grain starters need different water and timing. Compare notes here.', threadCount: 6820 },
  { id: 'dormant-starters', communityId: 'sourdough', parentId: 'starters', name: 'Dormant & Revived Starters', description: 'Fridge jars, neglected jars, and the ones that came back.', threadCount: 3190 },
  { id: 'shaping-scoring', communityId: 'sourdough', parentId: null, name: 'Shaping & Scoring', description: 'Tension, folds, shaping technique, and scoring patterns.', threadCount: 41075 },
  { id: 'whole-grain', communityId: 'sourdough', parentId: null, name: 'Whole Grain', description: 'Rye, spelt, emmer, and high-extraction flours.', threadCount: 22930 },
  { id: 'gear', communityId: 'sourdough', parentId: null, name: 'Gear', description: 'Bannetons, lames, Dutch ovens, and scales. What is worth buying.', threadCount: 27640 },
  { id: 'recipes', communityId: 'sourdough', parentId: null, name: 'Recipes', description: 'Formulas with hydration, timing, and bake temperature.', threadCount: 35190 },
  { id: 'show-your-bake', communityId: 'sourdough', parentId: null, name: 'Show Your Bake', description: 'Crumb shots, scoring photos, and the loaves that worked.', threadCount: 88015 },
  { id: 'regional-groups', communityId: 'sourdough', parentId: null, name: 'Regional Groups', description: 'Local bakers who meet in person. Find a group near you.', threadCount: 214 },
  { id: 'off-topic', communityId: 'sourdough', parentId: null, name: 'Off-Topic', description: 'Everything else. Keep it friendly.', threadCount: 19350 },

  // Houseplants
  { id: 'hp-care', communityId: 'houseplants', parentId: null, name: 'Care & Problems', description: 'Yellow leaves, pests, watering, and light. Tell us the plant and where it sits.', threadCount: 84210 },
  { id: 'hp-propagation', communityId: 'houseplants', parentId: null, name: 'Propagation', description: 'Cuttings, division, and seed starting.', threadCount: 31540 },
  { id: 'hp-show', communityId: 'houseplants', parentId: null, name: 'Show Your Plants', description: 'Shelf shots, first flowers, and plants that finally made it.', threadCount: 40120 },

  // Crossword Club
  { id: 'cw-clues', communityId: 'crossword', parentId: null, name: 'Clues & Grids', description: 'Clue debates and grid-by-grid discussion, every day of the week.', threadCount: 104330 },
  { id: 'cw-tips', communityId: 'crossword', parentId: null, name: 'Solving Tips', description: 'Habits, tools, and small tricks that save time.', threadCount: 52190 },
  { id: 'cw-makers', communityId: 'crossword', parentId: null, name: "Constructors' Corner", description: 'Grid design, themes, and feedback on drafts.', threadCount: 9810 },

  // Local Birding
  { id: 'bd-identify', communityId: 'birding', parentId: null, name: 'Identify This Bird', description: 'Post a photo, a location, and the date. Include what you saw in the first few seconds.', threadCount: 62400 },
  { id: 'bd-sightings', communityId: 'birding', parentId: null, name: 'Local Sightings', description: 'What is showing up this week, by county.', threadCount: 38760 },
  { id: 'bd-feeders', communityId: 'birding', parentId: null, name: 'Feeders & Gardens', description: 'Feeder setups, seed choices, and yard planting for birds.', threadCount: 27090 },
];

export const threads: Thread[] = [
  // ---- Sourdough: Beginners > Starters Help ----
  {
    id: 't-acetone',
    communityId: 'sourdough',
    spaceId: 'starters-help',
    title: 'Acetone smell at day 6 — normal?',
    author: 'rootsandrye',
    createdAt: at(14, 9, 12),
    lastActivityAt: at(17, 8, 40),
    body:
      'My starter is flour and water only, 1:1 by weight, fed once a day at the same time. Today is day 6. It is bubbly, but it has not doubled, and it smells like nail polish remover, not sour or yeasty. Is this normal at this stage, or should I start over?',
    replyCount: 87,
    guide: { guideId: 'starter-rescue', section: 3 },
    replies: [
      { id: 'r1', author: 'ferment_fern', helpful: 412, at: at(14, 20, 5), text: 'Completely normal, and it means hungry, not dead. That nail-polish smell is ethyl acetate, which yeast make once they have run through their food. Feed twice a day for three or four days at 1:5:5 by weight, then go back to once a day. It usually turns tangy within the week.' },
      { id: 'r2', author: 'mapleandmilled', helpful: 188, at: at(15, 7, 40), text: "Discard down to about 20 g before each feed, then add 100 g flour and 100 g water. Don't wait for it to double. Feed it when it is at its peak or just starting to fall." },
      { id: 'r3', author: 'dorrieb', helpful: 97, at: at(15, 18, 22), text: 'Mine did the same on day 5. It cleared up after the second feed of the day. My kitchen was 66°F and it stalled, so I moved the jar to a shelf over the radiator and it woke right up.' },
      { id: 'r4', author: 'ovenmittmoira', helpful: 88, at: at(15, 21, 3), text: 'Pink or orange streaks, or fuzzy spots anywhere on the surface, means throw it out. Acetone just means hunger. Mold is a different problem, and this is not that.' },
      { id: 'r5', author: 'ToastedOats', helpful: 65, at: at(15, 12, 10), text: "Don't toss it yet. Section 3 of the Starter Rescue 101 guide has a smell chart, and the acetone row matches exactly what you describe." },
      { id: 'r6', author: 'tessaferments', helpful: 54, at: at(16, 9, 15), text: 'If it is still only chemical after four or five feedings, try feeding whole wheat or rye for a few days. Those flours usually wake a sluggish starter faster than white.' },
      { id: 'r7', author: 'greenwoodbaker', helpful: 33, at: at(16, 19, 48), text: "Put a rubber band around the jar at the feed level so you can see whether it is doubling. That one habit stopped me from missing feeds." },
      { id: 'r8', author: 'crumbleandco', helpful: 21, at: at(16, 22, 30), text: 'Hooch on top does not change any of this. Stir it in or pour it off, just keep feeding on schedule.' },
      { id: 'r9', author: 'joanna_l_bakes', helpful: 15, at: at(17, 7, 55), text: 'Day 6 here too, same smell. Mine went from nail polish to sour yogurt over the weekend once I started feeding twice a day. Hang in there.' },
      { id: 'r10', author: 'rootsandrye', helpful: 9, at: at(17, 8, 40), text: 'Thank you, everyone. I switched to twice a day on Monday and it smells like yogurt now. Day 9 today.' },
    ],
  },
  {
    id: 't-hooch',
    communityId: 'sourdough',
    spaceId: 'starters-help',
    title: 'Hooch on top — pour it off or stir it in?',
    author: 'ovenmittmoira',
    createdAt: at(12, 8, 15),
    lastActivityAt: at(16, 13, 2),
    body:
      'There is a grey liquid sitting on top of my starter, and underneath it the flour looks like wet cement. Someone told me to pour it off. Does it matter whether I pour it off or stir it back in?',
    replyCount: 52,
    guide: { guideId: 'starter-rescue', section: 4 },
    replies: [
      { id: 'h1', author: 'cinnamonandstone', helpful: 96, at: at(12, 10, 3), text: 'Either works. Stir it in for a tangier starter, or pour it off for a milder one. Whichever you choose, feed it right after.' },
      { id: 'h2', author: 'ferment_fern', helpful: 41, at: at(13, 7, 50), text: 'Hooch means it is hungry, not dead. Feed it sooner next time, or use a bit more flour, and it usually stops showing up.' },
    ],
  },
  {
    id: 't-doubled',
    communityId: 'sourdough',
    spaceId: 'starters-help',
    title: 'Starter doubled then fell — is it dead?',
    author: 'tessaferments',
    createdAt: at(10, 17, 30),
    lastActivityAt: at(16, 20, 11),
    body:
      'I fed it at 8 a.m. It doubled by 2 p.m., then by dinner it had dropped back to the jar line and smelled a little like beer. Is that the end of it, or just a good phase?',
    replyCount: 141,
    replies: [
      { id: 'd1', author: 'cinnamonandstone', helpful: 44, at: at(10, 21, 0), text: 'Good phase. Doubling and then falling is the normal cycle. Use it at the peak or just as it starts to fall, or feed it again. A beery smell is fine.' },
      { id: 'd2', author: 'maplesourdough', helpful: 19, at: at(11, 6, 40), text: 'Not the end. If a starter sits at room temperature for two days without feeding, it takes on this beery smell. Feed it and give it a day.' },
    ],
  },
  {
    id: 't-tapwater',
    communityId: 'sourdough',
    spaceId: 'starters-help',
    title: 'Does tap water need to sit out for chlorine?',
    author: 'greenwoodbaker',
    createdAt: at(9, 12, 0),
    lastActivityAt: at(16, 11, 25),
    body:
      'Our city water has chlorine. Do I need to leave it out overnight before I feed the starter, or is it fine straight from the tap?',
    replyCount: 204,
    guide: { guideId: 'starter-rescue', section: 8 },
    replies: [
      { id: 't1', author: 'ferment_fern', helpful: 130, at: at(9, 14, 20), text: 'Most city water is fine. If your starter goes sluggish after a week, let the water sit out overnight or use filtered. Chlorine dissipates quickly.' },
      { id: 't2', author: 'joanna_l_bakes', helpful: 77, at: at(10, 8, 10), text: "I never did anything about it and my starter is four years old. Don't stress the water until the starter tells you to." },
    ],
  },

  // ---- Sourdough: Beginners ----
  {
    id: 't-intro',
    communityId: 'sourdough',
    spaceId: 'beginners',
    title: 'Introduce yourself: what made you start sourdough?',
    author: 'joanna_l_bakes',
    createdAt: at(4, 9, 0),
    lastActivityAt: at(17, 7, 50),
    body:
      'Some of you have been baking for years and I would love to hear how it started. Mine began with a jar of wild yeast a friend gave me and a very ambitious first loaf.',
    replyCount: 412,
    replies: [
      { id: 'i1', author: 'dorrieb', helpful: 58, at: at(4, 11, 20), text: 'Burnt toast turned into a starter. That was years ago and I am still feeding it.' },
    ],
  },

  // ---- Sourdough: Beginners > First Loaves ----
  {
    id: 't-first-flat',
    communityId: 'sourdough',
    spaceId: 'first-loaves',
    title: 'Why does my first loaf come out flat?',
    author: 'pennyoven',
    createdAt: at(13, 19, 40),
    lastActivityAt: at(15, 22, 5),
    body:
      'My first loaf spread into a pancake. The starter was bubbly and passed the float test, I shaped it, and it went into the oven about two hours after shaping. What went wrong?',
    replyCount: 66,
    replies: [
      { id: 'f1', author: 'hoopsandblades', helpful: 40, at: at(14, 9, 10), text: 'Two hours after shaping is usually too long for a loaf that has already overproofed. Try an overnight cold rest in the fridge so you can bake when the starter is ready.' },
      { id: 'f2', author: 'crumbleandco', helpful: 22, at: at(14, 20, 30), text: 'Floppy shaping is the other common cause. Tighten the loaf on the final shape so it holds its own walls.' },
    ],
  },
  {
    id: 't-bulk-cold',
    communityId: 'sourdough',
    spaceId: 'first-loaves',
    title: 'How long should bulk fermentation take in a cold kitchen?',
    author: 'dorrieb',
    createdAt: at(14, 6, 50),
    lastActivityAt: at(16, 17, 2),
    body:
      'My kitchen sits around 64°F this time of year. The recipe says 4 to 5 hours for bulk, but after seven hours the dough barely rose. Should I keep waiting?',
    replyCount: 27,
    replies: [
      { id: 'b1', author: 'ferment_fern', helpful: 14, at: at(14, 9, 25), text: 'Yes, keep going. Cold dough can take six to eight hours. Look for it to grow about half again and get a domed, jiggly surface, not a number on the clock.' },
    ],
  },

  // ---- Sourdough: Beginners > Kitchen Basics ----
  {
    id: 't-dutch',
    communityId: 'sourdough',
    spaceId: 'kitchen-basics',
    title: 'Do I need a Dutch oven or can I use a pot?',
    author: 'crumbleandco',
    createdAt: at(11, 9, 0),
    lastActivityAt: at(16, 9, 40),
    body:
      "I don't own a Dutch oven. Can I bake in a heavy stockpot with the lid on? I'm worried about the bottom browning too fast.",
    replyCount: 119,
    replies: [
      { id: 'k1', author: 'hoopsandblades', helpful: 58, at: at(11, 11, 30), text: 'Yes. A heavy stockpot with a lid works well. Preheat it the same way you would a Dutch oven, and set the loaf on parchment so it is easy to lift in and out.' },
      { id: 'k2', author: 'dorrieb', helpful: 26, at: at(11, 19, 15), text: 'Check the lid knob. Plastic handles melt well below typical bake temperatures, so swap in a metal one or wrap it in foil.' },
    ],
  },

  // ---- Sourdough: Starters > sub-spaces ----
  {
    id: 't-log',
    communityId: 'sourdough',
    spaceId: 'starter-logs',
    title: 'Day 9 log: bubbles finally showing up',
    author: 'lentil_lad',
    createdAt: at(13, 20, 0),
    lastActivityAt: at(16, 10, 0),
    body:
      'Day 1: flour and water, 1:1, nothing special. Day 4: first tiny bubbles. Day 9: real bubbles, a yeasty smell, and it rises after feeding. Posting so I can follow along with anyone else on a slow starter.',
    replyCount: 24,
    replies: [
      { id: 'l1', author: 'maplesourdough', helpful: 12, at: at(15, 8, 0), text: 'Day 10 here, and it smells like bread dough now. Stick with it.' },
    ],
  },
  {
    id: 't-rye-stiff',
    communityId: 'sourdough',
    spaceId: 'rye-spelt-starters',
    title: 'Rye starter stiffened overnight — rescue?',
    author: 'rye_by_the_river',
    createdAt: at(15, 8, 0),
    lastActivityAt: at(16, 12, 10),
    body:
      'I fed my rye starter at 60% hydration and left it overnight. The top is stiff like play dough and it has not risen. Should I thin it with water or start a new feed?',
    replyCount: 31,
    replies: [
      { id: 'y1', author: 'tessaferments', helpful: 12, at: at(15, 11, 40), text: 'Thin it. Stir in 20 to 30 g of warm water until it is loose and paste-like, then feed normally. Rye starters are happiest near 80 to 100 percent hydration.' },
      { id: 'y2', author: 'ferment_fern', helpful: 7, at: at(16, 8, 30), text: 'Check the room. Rye can stall in a cool kitchen. Keep it near 78°F for a day and it usually wakes up.' },
    ],
  },
  {
    id: 't-fridge-2023',
    communityId: 'sourdough',
    spaceId: 'dormant-starters',
    title: 'Fridge starter from 2023 — still alive after three feedings?',
    author: 'steadyhands_jo',
    createdAt: at(15, 18, 40),
    lastActivityAt: at(16, 18, 30),
    body:
      'Found a jar in the back of the fridge labeled "MAY 2023." Grey liquid, a lot of hooch, and the lid was cracked. I fed it three times at room temperature and now it is bubbling. Is it safe? Does it still work?',
    replyCount: 77,
    guide: { guideId: 'starter-rescue', section: 11 },
    replies: [
      { id: 'x1', author: 'ferment_fern', helpful: 52, at: at(15, 21, 0), text: 'If it is bubbling and smells yeasty or sour after three feedings, it is alive. Test it with a small loaf before you trust it with a dinner party.' },
      { id: 'x2', author: 'ToastedOats', helpful: 11, at: at(16, 7, 15), text: 'Check the surface for pink or orange streaks before you feed it. If it is clear or grey, you are fine to go.' },
    ],
  },

  // ---- Sourdough: other spaces ----
  {
    id: 't-lame',
    communityId: 'sourdough',
    spaceId: 'shaping-scoring',
    title: 'Lame vs. razor for a beginner?',
    author: 'hoopsandblades',
    createdAt: at(12, 7, 10),
    lastActivityAt: at(16, 15, 20),
    body:
      "I'm buying my first scoring tool. Is a lame easier for a beginner than a razor blade in a holder? I want clean ears, not tears.",
    replyCount: 45,
    replies: [
      { id: 'm1', author: 'maplesourdough', helpful: 17, at: at(12, 12, 40), text: 'A lame is easier to control at the start. A razor in a holder is cheaper and cuts cleaner once you have practice. Get the lame first if you are not sure which you will like.' },
      { id: 'm2', author: 'tessaferments', helpful: 9, at: at(13, 10, 0), text: 'Score about a quarter inch deep at a shallow angle, with one quick, confident stroke. Hesitation is what tears the dough.' },
    ],
  },
  {
    id: 't-day7',
    communityId: 'sourdough',
    spaceId: 'show-your-bake',
    title: 'Day-7 bake: my first open crumb!',
    author: 'maplesourdough',
    createdAt: at(9, 6, 30),
    lastActivityAt: at(16, 21, 0),
    body:
      'Eighth loaf, first one with an open crumb. 75% hydration, a three-hour bulk in a warm corner of the kitchen, shaped tight, then into the fridge overnight. Holes all the way across.',
    replyCount: 311,
    guide: undefined,
    replies: [
      { id: 'c1', author: 'steadyhands_jo', helpful: 33, at: at(10, 9, 15), text: 'Lovely crumb. Which flour did you use? The holes look even all the way through.' },
      { id: 'c2', author: 'lentil_lad', helpful: 18, at: at(10, 12, 50), text: 'Overnight in the fridge is the step that changed everything for me too.' },
    ],
  },
  {
    id: 't-whole-rye',
    communityId: 'sourdough',
    spaceId: 'whole-grain',
    title: 'Sifted vs. whole rye: how much extra water?',
    author: 'rye_by_the_river',
    createdAt: at(11, 12, 0),
    lastActivityAt: at(14, 16, 0),
    body:
      'I switched from sifted rye to whole rye in my usual formula. The dough feels much drier than it used to. Do I add more water, and how much?',
    replyCount: 19,
    replies: [
      { id: 'w1', author: 'tessaferments', helpful: 15, at: at(11, 15, 0), text: 'Usually 5 to 10 percent more water for whole rye. Let the flour rest for 30 minutes before mixing so the bran has time to hydrate.' },
    ],
  },
  {
    id: 't-banneton',
    communityId: 'sourdough',
    spaceId: 'gear',
    title: "Banneton that's cracked — still usable?",
    author: 'pennyoven',
    createdAt: at(12, 15, 0),
    lastActivityAt: at(13, 9, 30),
    body:
      'A hairline crack runs along the rim of my rattan banneton. Is it still OK to use, or will it dry out the dough too much?',
    replyCount: 12,
    replies: [
      { id: 'g1', author: 'hoopsandblades', helpful: 8, at: at(12, 19, 20), text: 'Still usable. Rub a little flour into the crack and dust the basket well. Only replace it if the basket starts to fall apart.' },
    ],
  },
  {
    id: 't-recipe',
    communityId: 'sourdough',
    spaceId: 'recipes',
    title: 'Country loaf, 80% hydration, no kneading: what would you change?',
    author: 'breadbyhand_ray',
    createdAt: at(10, 10, 0),
    lastActivityAt: at(16, 16, 0),
    body:
      'Using 500 g bread flour, 400 g water, 100 g starter, and 10 g salt. Stretch and folds every 30 minutes for two hours. What would you change for a more open crumb?',
    replyCount: 240,
    replies: [
      { id: 'e1', author: 'maplesourdough', helpful: 28, at: at(10, 13, 40), text: 'Add 10 g more water and extend the bulk by an hour. It is a small change that makes a visible difference in the crumb.' },
    ],
  },
  {
    id: 't-offtopic',
    communityId: 'sourdough',
    spaceId: 'off-topic',
    title: "What's everyone listening to while proofing?",
    author: 'lentil_lad',
    createdAt: at(8, 14, 0),
    lastActivityAt: at(17, 6, 10),
    body:
      'Dough needs about four hours and I have run out of podcasts. What are you all listening to?',
    replyCount: 520,
    replies: [
      { id: 'o1', author: 'dorrieb', helpful: 21, at: at(8, 16, 0), text: 'Anything with a steady beat keeps me from checking the dough every five minutes.' },
    ],
  },

  // ---- Houseplants ----
  {
    id: 'hp-yellow-tips',
    communityId: 'houseplants',
    spaceId: 'hp-care',
    title: 'Pothos leaves going yellow at the tips',
    author: 'fernfriend_ro',
    createdAt: at(13, 11, 0),
    lastActivityAt: at(16, 19, 20),
    body:
      'Golden pothos, about three weeks of yellowing tips. It gets watered weekly and sits about four feet from a north window. Overwatering, or not enough light?',
    replyCount: 38,
    replies: [
      { id: 'hp1', author: 'ivyandtrowel', helpful: 40, at: at(13, 15, 30), text: 'Yellow tips with soft stems point to overwatering. Let the top two inches dry out before the next watering.' },
      { id: 'hp2', author: 'sunsillhouse', helpful: 17, at: at(14, 8, 45), text: 'Light is the other suspect. Pothos needs a bit more than a north window to keep its variegation.' },
    ],
  },
  {
    id: 'hp-monstera',
    communityId: 'houseplants',
    spaceId: 'hp-care',
    title: 'Monstera with brown crispy edges: too much sun?',
    author: 'leafylorenzo',
    createdAt: at(15, 9, 0),
    lastActivityAt: at(16, 11, 0),
    body:
      'The lower leaves have brown, crispy edges, and the plant sits about three feet from a south window. Is it getting too much sun?',
    replyCount: 22,
    replies: [
      { id: 'hm1', author: 'ivyandtrowel', helpful: 31, at: at(15, 12, 10), text: 'Brown crispy edges are usually sun scorch or dry air. Move it back a foot and set it on a humidity tray.' },
    ],
  },

  // ---- Crossword Club ----
  {
    id: 'cw-thursday',
    communityId: 'crossword',
    spaceId: 'cw-tips',
    title: 'Does anyone else find Thursday themes easier than Saturdays?',
    author: 'nineacross',
    createdAt: at(12, 20, 0),
    lastActivityAt: at(17, 7, 0),
    body:
      'Thursday puzzles usually have a theme I can spot by the third entry. Saturday grids can have me stuck for an hour in one corner. Do your solve times follow the same pattern?',
    replyCount: 64,
    replies: [
      { id: 'cw1', author: 'pencilsharp_k', helpful: 28, at: at(12, 22, 15), text: 'The theme is the key. Saturdays are about wordplay, so I start with the longest entries and work inward.' },
    ],
  },

  // ---- Local Birding ----
  {
    id: 'bd-hawk',
    communityId: 'birding',
    spaceId: 'bd-identify',
    title: "Cooper's or sharp-shinned hawk at the feeder?",
    author: 'feedercam_dee',
    createdAt: at(15, 7, 30),
    lastActivityAt: at(16, 15, 0),
    body:
      'Visited the feeder this morning. Medium-size hawk, short rounded tail, dark cap. Cooper\'s or sharp-shinned? The photo came from my kitchen window, so it is not sharp.',
    replyCount: 14,
    replies: [
      { id: 'bd1', author: 'ridgelinebirder', helpful: 22, at: at(15, 9, 40), text: "Look at the tail. A rounded tip points to Cooper's. A squared-off tail is more typical of sharp-shinned." },
      { id: 'bd2', author: 'marshmarigold', helpful: 9, at: at(15, 20, 5), text: 'The dark cap suggests an adult Cooper\'s, but juveniles can look similar. Note the eye color if you can see it.' },
    ],
  },
];

export const guides: Guide[] = [
  {
    id: 'starter-rescue',
    communityId: 'sourdough',
    title: 'Starter Rescue 101',
    byline: 'Maintained by the Sourdough & Wild Yeast moderators',
    updatedAt: at(2, 9, 0),
    intro:
      'Most starter problems look alarming on day 4 and boring by day 14. Find your symptom in the list, then read that section. Each section is short, and the smell chart in section 3 is the one most people come back for.',
    sections: [
      {
        title: 'What a healthy starter looks like',
        paragraphs: [
          'A healthy starter is bubbly, smells pleasantly sour or yeasty (think yogurt, beer, or green apple), and rises predictably after each feed. It does not have to look perfect. A slightly grey, dense jar can be completely fine.',
        ],
        bullets: [
          'Roughly doubles within 4 to 8 hours at room temperature after a feed',
          'Smells tangy or yeasty, never rotten',
          'No pink, orange, or fuzzy mold anywhere',
        ],
      },
      {
        title: 'Days 1 to 4: nothing happens, and that is normal',
        paragraphs: [
          'Wild yeast and bacteria take several days to settle in. Feed once every 24 hours at the same time, using the same flour and water. Bubbles often appear around day 3 to 5, but a starter can take longer in a cool kitchen.',
        ],
      },
      {
        title: 'Smells: sour, acetone, vinegar, and gym socks',
        paragraphs: [
          'Smell is the fastest clue to what your starter needs. Use this as a rough chart. If you are unsure, feed on schedule for two days and smell again.',
        ],
        bullets: [
          'Yogurt, beer, or green apple: healthy. Keep feeding on schedule.',
          'Nail-polish remover or acetone: hungry. The yeast has used up its food and is producing ethyl acetate. Feed twice a day with more flour than before (1:5:5 by weight), and most starters settle within 3 to 5 days.',
          'Sharp vinegar: very hungry, or kept too warm. Feed sooner, or move it to a cooler spot.',
          'Gym socks or old cheese: can be normal in a young starter. Feed and smell again in two days. If you see pink or orange streaks, discard it.',
        ],
      },
      {
        title: 'Hooch: the grey liquid on top',
        paragraphs: [
          'Hooch is alcohol that forms when a starter runs out of food. It is a signal, not a failure. Pour it off for a milder flavor, or stir it back in for a tangier starter. Either way, feed the starter soon after.',
        ],
      },
      {
        title: 'Feeding ratios and schedules',
        paragraphs: [
          'Ratios are written as starter : flour : water, by weight. A 1:1:1 feed is a good everyday schedule at room temperature. Hungry or sluggish starters respond well to bigger feeds, which dilute the old culture and give the yeast more food.',
        ],
        bullets: [
          '1:1:1 once a day for a steady starter',
          '1:5:5 twice a day for a hungry starter that smells like acetone',
          '1:2:2 for a starter you only want to feed every other day',
        ],
      },
      {
        title: 'Temperature and where to keep it',
        paragraphs: [
          'Yeast is most active around 75 to 80°F (24 to 27°C). Below about 68°F (20°C), feeds take longer and rises are slower. A common trick is the oven with only the light switched on, which gives a gentle warm spot. Do not switch the oven on by mistake.',
        ],
      },
      {
        title: 'Discard: how much to remove and what to do with it',
        paragraphs: [
          'Before each feed, remove enough starter to measure the amount your recipe needs. Most everyday feeds use 20 to 50 g of starter. The rest is discard. Use it in pancakes, crackers, or flatbreads, or compost it if you have no use for it.',
        ],
      },
      {
        title: 'Flour and water choices',
        paragraphs: [
          'Unbleached bread or all-purpose flour is a reliable everyday choice. Whole wheat or rye starters tend to be more active, which helps a sluggish jar wake up. If your tap water is heavily chlorinated, let it sit out overnight or use filtered water.',
        ],
      },
      {
        title: 'Signs it is ready to bake with',
        paragraphs: [
          'A starter is ready to use when it has doubled after a feed, has a domed or peaked top, is full of bubbles throughout, and smells pleasant. Use it at peak or just as it starts to fall. The float test is unreliable for many starters, so skip it and trust the rise.',
        ],
      },
      {
        title: 'Mold vs. bubbles: what to throw out',
        paragraphs: [
          'Mold is fuzzy and colored, usually pink, orange, green, or black, and it grows on the surface. Throw the whole jar away. Do not scrape the top and keep the rest. Bubbles under a clear or grey liquid are normal.',
        ],
      },
      {
        title: 'Reviving a dormant starter from the fridge',
        paragraphs: [
          'Take the jar out, pour off the hooch, and discard all but about a spoonful. Feed at 1:5:5 and leave it at room temperature. Feed every 12 hours for two to three days, until it doubles reliably after each feed.',
        ],
      },
      {
        title: 'When to start over',
        paragraphs: [
          'Start over if you see mold, if the jar shows no activity after three weeks of consistent feeding at about 75°F, or if it still smells like nail polish or rot after a week of feeding twice a day. A new jar costs you a few days. A bad starter can waste several loaves.',
        ],
      },
    ],
  },
];

export const groups: RegionalGroup[] = [
  {
    id: 'pittsburgh-area-bakers',
    communityId: 'sourdough',
    name: 'Pittsburgh Area Bakers',
    city: 'Pittsburgh',
    state: 'PA',
    milesFromPittsburgh: 0,
    members: 2310,
    about:
      'Home bakers from across Allegheny County and beyond. We meet once a month for a bake-along, a starter swap, and a scoring demo. First-timers are welcome, and we would rather hear your questions than see finished loaves.',
    organizers: ['Priya Raman', 'Gus Mahoney'],
    meetup: {
      when: at(21, 10, 0),
      place: 'Fernway Bakery, Downtown Pittsburgh',
      detail: 'Back room, enter from the alley off Penn Avenue. We have the room from 10 a.m. until noon.',
      bring: 'A small jar of your starter for the swap table (optional).',
    },
  },
  { id: 'mt-lebanon-home-bakers', communityId: 'sourdough', name: 'Mt. Lebanon Home Bakers', city: 'Mt. Lebanon', state: 'PA', milesFromPittsburgh: 9, members: 486, about: 'A small, friendly group for bakers who prefer a coffee-and-questions morning to a big crowd.', organizers: ['Dana Whitcomb'] },
  { id: 'wexford-wild-ferment', communityId: 'sourdough', name: 'Wexford Wild Ferment', city: 'Wexford', state: 'PA', milesFromPittsburgh: 17, members: 298, about: 'Starter care, fermentation, and the odd batch of sauerkraut. Meets at members’ kitchens on rotation.', organizers: ['Tomás Ferreira'] },
  { id: 'washington-county-sourdough', communityId: 'sourdough', name: 'Washington County Sourdough Circle', city: 'Washington', state: 'PA', milesFromPittsburgh: 31, members: 355, about: 'Monthly bake-and-share in a community kitchen. Strong on whole grains and rye.', organizers: ['Lena Ostrowski'] },
  { id: 'greensburg-loaf-club', communityId: 'sourdough', name: 'Greensburg Loaf Club', city: 'Greensburg', state: 'PA', milesFromPittsburgh: 33, members: 412, about: 'Shaping and scoring workshops, plus a quarterly bake sale for the library fund.', organizers: ['Marcus Bell'] },
  { id: 'butler-bread-exchange', communityId: 'sourdough', name: 'Butler Bread Exchange', city: 'Butler', state: 'PA', milesFromPittsburgh: 36, members: 187, about: 'Trading loaves, starters, and recipes across Butler County.', organizers: ['Ruth Kessel'] },
  { id: 'morgantown-mill-and-dough', communityId: 'sourdough', name: 'Morgantown Mill & Dough', city: 'Morgantown', state: 'WV', milesFromPittsburgh: 74, members: 268, about: 'Flour nerds welcome. We compare mills, grind our own, and argue about hydration.', organizers: ['Eli Brandt'] },
  { id: 'youngstown-yeast-society', communityId: 'sourdough', name: 'Youngstown Yeast Society', city: 'Youngstown', state: 'OH', milesFromPittsburgh: 66, members: 221, about: 'Starter swaps every season and a no-judgment group for bakers who are still learning.', organizers: ['Bea Fernholz'] },
  { id: 'johnstown-wild-yeast', communityId: 'sourdough', name: 'Johnstown Wild Yeast', city: 'Johnstown', state: 'PA', milesFromPittsburgh: 71, members: 143, about: 'A small group that meets at the library annex on the second Sunday of each month.', organizers: ['Walt Sobczak'] },
  { id: 'altoona-hearth-club', communityId: 'sourdough', name: 'Altoona Hearth Club', city: 'Altoona', state: 'PA', milesFromPittsburgh: 96, members: 176, about: 'Oven talk, hearth baking, and winter bake-offs.', organizers: ['Helen Park'] },
  { id: 'erie-starter-swap', communityId: 'sourdough', name: 'Erie Starter Swap', city: 'Erie', state: 'PA', milesFromPittsburgh: 128, members: 309, about: 'Mostly a starter-trading group, with a bake-along once a quarter.', organizers: ['Sam Okonkwo'] },
  { id: 'cleveland-crumb-collective', communityId: 'sourdough', name: 'Cleveland Crumb Collective', city: 'Cleveland', state: 'OH', milesFromPittsburgh: 134, members: 1140, about: 'One of the largest regional bread groups in Ohio. Monthly meetups, workshops, and a shared oven rota.', organizers: ['Ilse Dunmore', 'Chris Adeyemi'] },
  { id: 'lehigh-valley-levain', communityId: 'sourdough', name: 'Lehigh Valley Levain', city: 'Allentown', state: 'PA', milesFromPittsburgh: 302, members: 532, about: 'Bakers across the Lehigh Valley. Quarterly bake-offs and a steady stream of starter questions.', organizers: ['Rosa Delacruz'] },
];

// Threads Lorna has opened in the last day, newest first, as they appear at 12:20 p.m. on Tuesday, Nov 17.
export const recentSeed: [string, number][] = [
  ['t-hooch', at(17, 11, 48)],
  ['t-doubled', at(17, 11, 31)],
  ['hp-yellow-tips', at(17, 10, 15)],
  ['t-lame', at(17, 9, 58)],
  ['t-first-flat', at(17, 9, 12)],
  ['cw-thursday', at(17, 8, 12)],
  ['hp-monstera', at(17, 7, 44)],
  ['t-fridge-2023', at(16, 18, 2)],
  ['t-day7', at(16, 17, 20)],
  ['t-bulk-cold', at(16, 16, 58)],
  ['t-tapwater', at(16, 15, 37)],
  ['bd-hawk', at(16, 14, 5)],
  ['t-dutch', at(16, 13, 30)],
  ['t-rye-stiff', at(16, 12, 58)],
  ['t-acetone', at(16, 12, 41)],
];
