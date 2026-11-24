import type { DeckId, Topic } from './types';

/**
 * Cards written out in full for this build. Everything else in the decks
 * exists in the review history as counts only. Weights and difficulty values
 * shape how often these come up and how often they are missed.
 */
export interface AuthoredCard {
  id: string;
  deck: DeckId;
  topic: Topic;
  addDay: number;
  weight: number;
  difficulty: number;
  front: string;
  back: string;
}

export const AUTHORED: AuthoredCard[] = [
  // --- AP Bio Unit 3: glycolysis, pyruvate oxidation, fermentation ---
  {
    id: 'u3-net-atp',
    deck: 'bio3', topic: 'glyc', addDay: -38, weight: 1.6, difficulty: -0.26,
    front: 'Net ATP from glycolysis',
    back: '2 ATP. Glycolysis makes 4 ATP but spends 2 in the investment phase, so the net gain is 2.',
  },
  {
    id: 'u3-glyc-location', deck: 'bio3', topic: 'glyc', addDay: -40, weight: 1, difficulty: 0,
    front: 'Where in the cell does glycolysis happen?',
    back: 'In the cytosol (cytoplasm). It does not need oxygen.',
  },
  {
    id: 'u3-pfk', deck: 'bio3', topic: 'glyc', addDay: -33, weight: 1, difficulty: -0.12,
    front: 'Which enzyme makes glycolysis committed?',
    back: 'Phosphofructokinase-1 (PFK-1) turns fructose-6-phosphate into fructose-1,6-bisphosphate. It uses 1 ATP.',
  },
  {
    id: 'u3-hexokinase', deck: 'bio3', topic: 'glyc', addDay: -36, weight: 1, difficulty: -0.08,
    front: 'What does hexokinase do?',
    back: 'Adds a phosphate from ATP to glucose, making glucose-6-phosphate. This traps glucose inside the cell.',
  },
  {
    id: 'u3-glyc-products', deck: 'bio3', topic: 'glyc', addDay: -30, weight: 1.1, difficulty: -0.14,
    front: 'What does one glucose give during glycolysis?',
    back: '2 pyruvate, 2 net ATP, and 2 NADH.',
  },
  {
    id: 'u3-pyruvate-ox', deck: 'bio3', topic: 'glyc', addDay: -18, weight: 1.2, difficulty: -0.1,
    front: 'Pyruvate oxidation: what does each pyruvate become?',
    back: 'Acetyl-CoA. It releases 1 CO₂ and makes 1 NADH. One glucose makes 2 pyruvate, so double both.',
  },
  {
    id: 'u3-ferm-why', deck: 'bio3', topic: 'glyc', addDay: -25, weight: 1, difficulty: -0.05,
    front: 'Why does fermentation happen?',
    back: 'It regenerates NAD⁺ so glycolysis can keep running when there is no oxygen.',
  },
  {
    id: 'u3-lactate', deck: 'bio3', topic: 'glyc', addDay: -25, weight: 1, difficulty: -0.02,
    front: 'Where does lactate fermentation happen?',
    back: 'Muscle cells during hard exercise, and some bacteria (such as the ones used to make yogurt).',
  },
  {
    id: 'u3-alcohol-ferm', deck: 'bio3', topic: 'glyc', addDay: -25, weight: 1, difficulty: -0.02,
    front: 'Products of alcohol fermentation in yeast',
    back: 'Ethanol and CO₂. Pyruvate is turned into ethanol, and NAD⁺ is regenerated.',
  },

  // --- AP Bio Unit 3: Krebs cycle (mostly added in big batches) ---
  {
    id: 'u3-krebs-where', deck: 'bio3', topic: 'krebs', addDay: -19, weight: 1.8, difficulty: -0.04,
    front: 'Where does the Krebs cycle take place?',
    back: 'The mitochondrial matrix.',
  },
  {
    id: 'u3-citrate-synthase', deck: 'bio3', topic: 'krebs', addDay: -19, weight: 1.8, difficulty: -0.08,
    front: 'What does citrate synthase make, and from what?',
    back: 'Citrate (citric acid), from acetyl-CoA and oxaloacetate. This is the first step of the Krebs cycle.',
  },
  {
    id: 'u3-isocitrate', deck: 'bio3', topic: 'krebs', addDay: -14, weight: 1.8, difficulty: -0.12,
    front: 'Which Krebs step releases the first CO₂?',
    back: 'Isocitrate → α-ketoglutarate, by isocitrate dehydrogenase. It makes NADH.',
  },
  {
    id: 'u3-ketoglutarate', deck: 'bio3', topic: 'krebs', addDay: -14, weight: 1.8, difficulty: -0.1,
    front: 'α-ketoglutarate → succinyl-CoA: what is produced?',
    back: 'CO₂ and NADH, by α-ketoglutarate dehydrogenase.',
  },
  {
    id: 'u3-succinyl-gtp', deck: 'bio3', topic: 'krebs', addDay: -9, weight: 1.8, difficulty: -0.1,
    front: 'Succinyl-CoA → succinate: what is made directly?',
    back: 'GTP (or ATP) by substrate-level phosphorylation.',
  },
  {
    id: 'u3-succinate-fad', deck: 'bio3', topic: 'krebs', addDay: -9, weight: 1.8, difficulty: -0.15,
    front: 'Succinate → fumarate: which carrier is reduced?',
    back: 'FAD → FADH₂, by succinate dehydrogenase. This enzyme is also Complex II of the electron transport chain.',
  },
  {
    id: 'u3-malate', deck: 'bio3', topic: 'krebs', addDay: -9, weight: 1.8, difficulty: -0.12,
    front: 'Malate → oxaloacetate: what is made?',
    back: 'NADH. Oxaloacetate is regenerated so the cycle can start again.',
  },
  {
    id: 'u3-krebs-turn', deck: 'bio3', topic: 'krebs', addDay: -5, weight: 1.8, difficulty: -0.08,
    front: 'How many CO₂ does one turn of the Krebs cycle release?',
    back: '2 CO₂ per acetyl-CoA, so one turn releases 2.',
  },
  {
    id: 'u3-krebs-products', deck: 'bio3', topic: 'krebs', addDay: -5, weight: 1.8, difficulty: -0.1,
    front: 'Products of one turn of the Krebs cycle',
    back: '3 NADH, 1 FADH₂, 1 ATP (or GTP), and 2 CO₂.',
  },
  {
    id: 'u3-krebs-glucose', deck: 'bio3', topic: 'krebs', addDay: -2, weight: 1.8, difficulty: -0.12,
    front: 'Krebs cycle products for one glucose (two turns)',
    back: '6 NADH, 2 FADH₂, 2 ATP (or GTP), and 4 CO₂.',
  },
  {
    id: 'u3-krebs-stall', deck: 'bio3', topic: 'krebs', addDay: -21, weight: 1.2, difficulty: -0.06,
    front: 'Why does the Krebs cycle stop when oxygen runs out?',
    back: 'Oxygen is not used directly. But without oxygen the ETC cannot re-oxidize NADH and FADH₂, so the carriers back up and the cycle stalls.',
  },

  // --- AP Bio Unit 3: electron transport chain and chemiosmosis ---
  {
    id: 'u3-etc-location', deck: 'bio3', topic: 'etc', addDay: -5, weight: 1.8, difficulty: -0.06,
    front: 'Where is the electron transport chain located?',
    back: 'The inner mitochondrial membrane, folded into cristae.',
  },
  {
    id: 'u3-etc-final', deck: 'bio3', topic: 'etc', addDay: -5, weight: 1.8, difficulty: -0.1,
    front: 'What is the final electron acceptor in the ETC?',
    back: 'Oxygen. It combines with electrons and H⁺ to form water.',
  },
  {
    id: 'u3-complex-1', deck: 'bio3', topic: 'etc', addDay: -5, weight: 1.8, difficulty: -0.14,
    front: 'What does Complex I accept electrons from?',
    back: 'NADH, which is oxidized back to NAD⁺. Complex I also pumps H⁺ into the intermembrane space.',
  },
  {
    id: 'u3-fadh2-entry', deck: 'bio3', topic: 'etc', addDay: -5, weight: 1.8, difficulty: -0.18,
    front: 'Where do FADH₂ electrons enter the chain?',
    back: 'Complex II. They skip Complex I, so FADH₂ drives fewer H⁺ pumps than NADH does.',
  },
  {
    id: 'u3-chemiosmosis', deck: 'bio3', topic: 'etc', addDay: -4, weight: 1.8, difficulty: -0.16,
    front: 'What creates the proton gradient in chemiosmosis?',
    back: 'The ETC pumps H⁺ from the matrix into the intermembrane space.',
  },
  {
    id: 'u3-atp-synthase', deck: 'bio3', topic: 'etc', addDay: -4, weight: 1.8, difficulty: -0.12,
    front: 'What does ATP synthase do with the gradient?',
    back: 'H⁺ flows back into the matrix through ATP synthase. That flow drives ADP + Pi → ATP.',
  },
  {
    id: 'u3-cytochrome-c', deck: 'bio3', topic: 'etc', addDay: -4, weight: 1.8, difficulty: -0.12,
    front: 'What is cytochrome c’s job?',
    back: 'It carries electrons between Complex III and Complex IV.',
  },
  {
    id: 'u3-atp-nadh', deck: 'bio3', topic: 'etc', addDay: -2, weight: 1.4, difficulty: -0.12,
    front: 'About how many ATP does one NADH make? (modern estimate)',
    back: 'About 2.5 ATP.',
  },
  {
    id: 'u3-atp-fadh2', deck: 'bio3', topic: 'etc', addDay: -2, weight: 1.4, difficulty: -0.12,
    front: 'About how many ATP does one FADH₂ make? (modern estimate)',
    back: 'About 1.5 ATP.',
  },
  {
    id: 'u3-dnp', deck: 'bio3', topic: 'etc', addDay: -21, weight: 1, difficulty: -0.2,
    front: 'What does DNP (a chemical uncoupler) do?',
    back: 'It lets H⁺ leak back across the membrane without going through ATP synthase, so the energy is released as heat instead of ATP.',
  },

  // --- AP Bio Unit 3: totals and redox ---
  {
    id: 'u3-total-atp', deck: 'bio3', topic: 'bio-other', addDay: -2, weight: 1.2, difficulty: -0.06,
    front: 'Total ATP from one glucose in aerobic respiration (modern estimate)',
    back: 'About 30–32 ATP. Glycolysis and the Krebs cycle make about 4, and the ETC makes most of the rest.',
  },
  {
    id: 'u3-oxidized', deck: 'bio3', topic: 'bio-other', addDay: -21, weight: 1, difficulty: -0.02,
    front: 'In cell respiration, what does “oxidized” mean?',
    back: 'Losing electrons. For example, NADH is oxidized to NAD⁺.',
  },
  {
    id: 'u3-co2-total', deck: 'bio3', topic: 'bio-other', addDay: -16, weight: 1.2, difficulty: -0.08,
    front: 'How many CO₂ does full respiration release per glucose?',
    back: '6 CO₂: 2 from pyruvate oxidation and 4 from the Krebs cycle.',
  },
  {
    id: 'u3-energy-currency', deck: 'bio3', topic: 'bio-other', addDay: -60, weight: 0.6, difficulty: 0.02,
    front: 'What is the main energy currency of the cell?',
    back: 'ATP (adenosine triphosphate).',
  },

  // --- AP Bio Units 1–2 (older cards) ---
  {
    id: 'u12-amphipathic', deck: 'bio12', topic: 'bio-other', addDay: -150, weight: 1, difficulty: 0,
    front: 'Why is a phospholipid called amphipathic?',
    back: 'It has a hydrophilic (water-loving) head and hydrophobic (water-fearing) tails.',
  },
  {
    id: 'u12-osmosis', deck: 'bio12', topic: 'bio-other', addDay: -170, weight: 1, difficulty: 0,
    front: 'In osmosis, which way does water move?',
    back: 'Toward the side with more solute, from hypotonic to hypertonic.',
  },
  {
    id: 'u12-mitochondria', deck: 'bio12', topic: 'bio-other', addDay: -180, weight: 1, difficulty: 0.02,
    front: 'Which organelle makes most of a cell’s ATP?',
    back: 'The mitochondrion.',
  },
  {
    id: 'u12-light-rxn', deck: 'bio12', topic: 'bio-other', addDay: -120, weight: 1, difficulty: -0.02,
    front: 'Where do the light-dependent reactions happen?',
    back: 'In the thylakoid membranes of the chloroplast.',
  },
  {
    id: 'u12-rubisco', deck: 'bio12', topic: 'bio-other', addDay: -120, weight: 1, difficulty: -0.12,
    front: 'What does RuBisCO do in the Calvin cycle?',
    back: 'It fixes CO₂ by attaching it to RuBP.',
  },
  {
    id: 'u12-anaphase', deck: 'bio12', topic: 'bio-other', addDay: -140, weight: 1, difficulty: 0,
    front: 'What happens in anaphase of mitosis?',
    back: 'Sister chromatids separate and move to opposite poles of the cell.',
  },
  {
    id: 'u12-prok-euk', deck: 'bio12', topic: 'bio-other', addDay: -160, weight: 1, difficulty: 0,
    front: 'Main difference between prokaryotic and eukaryotic cells',
    back: 'Eukaryotic cells have a membrane-bound nucleus. Prokaryotic cells do not.',
  },
  {
    id: 'u12-psii', deck: 'bio12', topic: 'bio-other', addDay: -110, weight: 1, difficulty: -0.1,
    front: 'Which photosystem splits water and releases O₂?',
    back: 'Photosystem II.',
  },
];

/**
 * Reserve text. Generated Biology cards that rank in the top 25 most-missed
 * cards are given one of these (matched by topic) so every card shown in the
 * app has real content.
 */
const RESERVE_CORE: { topic: Topic; front: string; back: string }[] = [
  { topic: 'krebs', front: 'Which carrier brings Krebs cycle electrons to the ETC?', back: 'NADH and FADH₂.' },
  { topic: 'krebs', front: 'What does fumarase do?', back: 'It adds water to fumarate to make malate.' },
  { topic: 'krebs', front: 'Which molecule starts the Krebs cycle as a 6-carbon compound?', back: 'Citrate. It forms from a 2-carbon acetyl-CoA joining a 4-carbon oxaloacetate.' },
  { topic: 'krebs', front: 'Which Krebs enzyme is inhibited by both ATP and NADH?', back: 'Isocitrate dehydrogenase, a key regulated step of the cycle.' },
  { topic: 'krebs', front: 'Which molecule carries the acetyl group into the Krebs cycle?', back: 'Coenzyme A, as acetyl-CoA.' },
  { topic: 'krebs', front: 'Where do the CO₂ molecules released in the Krebs cycle come from?', back: 'From carbon atoms that came from the original glucose, through pyruvate. Not from oxygen.' },
  { topic: 'etc', front: 'What is ubiquinone (coenzyme Q)?', back: 'A mobile electron carrier that moves electrons from Complexes I and II to Complex III.' },
  { topic: 'etc', front: 'What does Complex IV do?', back: 'It transfers electrons to O₂ to form water. It is also called cytochrome c oxidase.' },
  { topic: 'etc', front: 'What is the proton-motive force?', back: 'The combined electrical and chemical gradient of H⁺ across the inner membrane, which drives ATP synthase.' },
  { topic: 'etc', front: 'What does Complex III do?', back: 'It passes electrons from ubiquinone to cytochrome c and pumps H⁺ into the intermembrane space.' },
  { topic: 'etc', front: 'What is the intermembrane space’s role in chemiosmosis?', back: 'It stores the H⁺ pumped out of the matrix, building the gradient that drives ATP synthase.' },
  { topic: 'etc', front: 'Which complex is the first proton pump, and what does it accept?', back: 'Complex I. It accepts electrons from NADH and pumps H⁺ out of the matrix.' },
  { topic: 'etc', front: 'What does FADH₂ become after it donates its electrons?', back: 'FAD, which goes back to the Krebs cycle to be reused.' },
  { topic: 'etc', front: 'Why are the inner mitochondrial membrane’s cristae important?', back: 'Folding increases surface area, so more ETC complexes and ATP synthase fit in the membrane.' },
  { topic: 'etc', front: 'Why is ATP synthase described as a rotary motor?', back: 'H⁺ flowing through it spins a rotor. The rotation changes the enzyme’s shape and drives ATP synthesis.' },
  { topic: 'glyc', front: 'Which glycolysis step makes the first NADH?', back: 'Glyceraldehyde-3-phosphate dehydrogenase, which oxidizes G3P and makes NADH.' },
  { topic: 'glyc', front: 'What does pyruvate kinase do?', back: 'It moves a phosphate from PEP to ADP, making pyruvate and ATP.' },
  { topic: 'glyc', front: 'What does phosphoglycerate kinase make?', back: 'ATP, by substrate-level phosphorylation (1,3-bisphosphoglycerate → 3-phosphoglycerate).' },
  { topic: 'bio-other', front: 'What is substrate-level phosphorylation?', back: 'Making ATP by moving a phosphate group directly from a substrate molecule to ADP.' },
];

/** Reserve text for generated Units 1–2 cards that rank among the most missed. */
export const RESERVE_UNITS_1_2: { topic: Topic; front: string; back: string }[] = [
  { topic: 'bio-other', front: 'What do ribosomes do?', back: 'Translate mRNA into a polypeptide chain (protein synthesis).' },
  { topic: 'bio-other', front: 'Which structure controls what enters and leaves the cell?', back: 'The plasma membrane, which is selectively permeable.' },
  { topic: 'bio-other', front: 'What does the Golgi apparatus do?', back: 'Modifies, sorts, and packages proteins and lipids for transport.' },
  { topic: 'bio-other', front: 'What is the difference between rough and smooth ER?', back: 'Rough ER has ribosomes and makes and folds proteins. Smooth ER makes lipids and helps detoxify.' },
  { topic: 'bio-other', front: 'What is facilitated diffusion?', back: 'Passive movement of a substance across the membrane through a channel or carrier protein. No ATP is used.' },
  { topic: 'bio-other', front: 'What does chlorophyll absorb most strongly?', back: 'Red and blue light. It reflects green, which is why plants look green.' },
  { topic: 'bio-other', front: 'Where does the Calvin cycle take place?', back: 'In the stroma of the chloroplast.' },
  { topic: 'bio-other', front: 'What happens during prophase of mitosis?', back: 'Chromosomes condense and the nuclear envelope begins to break down.' },
  { topic: 'bio-other', front: 'What happens to a red blood cell in a hypotonic solution?', back: 'Water rushes in, and the cell can swell and burst (lyse).' },
  { topic: 'bio-other', front: 'What does the sodium-potassium pump do each cycle?', back: 'Moves 3 Na⁺ out and 2 K⁺ in, using 1 ATP.' },
  { topic: 'bio-other', front: 'What is the job of telomeres?', back: 'They protect the ends of chromosomes from degradation and from fusing together.' },
  { topic: 'bio-other', front: 'What is cellulose made of?', back: 'Long chains of glucose units (β-glucose). It forms plant cell walls.' },
];

export const RESERVE = [...RESERVE_CORE, ...RESERVE_UNITS_1_2];
