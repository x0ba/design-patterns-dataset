// Concept library used to synthesise labels and top-activating snippets.
// Template syntax:  «hot token(s)»   ‹choice a|choice b›
export type Dom = 'prose' | 'code' | 'token' | 'pos'

export interface Concept {
  id: string
  dom: Dom
  labels: string[]
  tpl: string[]
  lay: [number, number] // layer index range (0..7), inclusive
  tiers: string // subset of 's' (<0.01), 'm' (0.01–0.1), 'd' (>=0.1)
  w?: number
  src: string
  f?: [number, number] // forced frequency range (L12 cluster)
  cluster?: boolean
  match?: string // token regex for 'token' concepts
  lang?: string
}

const P = (id: string, labels: string[], tpl: string[], lay: [number, number], src: string, w = 1, tiers = 'sm'): Concept => ({
  id, dom: 'prose', labels, tpl, lay, tiers, w, src,
})

export const PROSE: Concept[] = [
  P('fr-neg', ['French negation', 'French negation (ne … pas / plus / jamais)', 'Second half of French negative constructions'], [
    'Je ne sais «pas» pourquoi il est parti si tôt.',
    'Il n’y a «plus» de pain à la boulangerie depuis lundi.',
    'Nous ne voulons «jamais» revenir en arrière, ‹dit|répondit› le maire.',
    'Elle ne parle «guère» de son enfance à ses amis.',
  ], [0, 7], 'FineWeb-Edu (fr)', 1.6),
  P('es-subj', ['Spanish subjunctive after trigger verbs', 'Spanish present subjunctive'], [
    'Espero que ‹él|ella|ustedes› «venga» mañana a la reunión.',
    'Dudo que «sea» posible terminarlo antes del viernes.',
    'Es importante que los niños «coman» antes de salir.',
    'No creo que ellos «tengan» tiempo para ayudarnos.',
  ], [2, 7], 'FineWeb-Edu (es)'),
  P('de-comp', ['German compound nouns', 'Long German compounds (Verwaltung-, Gesellschaft-)'], [
    'Der «Kundenservice» ist unter der Nummer auf der «Rechnung» erreichbar.',
    'Nach dem «Hochschulabschluss» begann sie bei einer «Versicherungsgesellschaft».',
    'Die «Bundesregierung» hat neue Regeln für die «Arbeitszeitgestaltung» angekündigt.',
  ], [0, 5], 'FineWeb-Edu (de)'),
  P('it-clit', ['Italian clitic pronouns', 'Italian reflexive and clitic pronouns before verbs'], [
    'Non «mi» ricordo dove ho lasciato le chiavi.',
    'Ieri «ci» siamo incontrati davanti alla stazione.',
    'Lei «si» è trasferita a Torino due anni fa.',
  ], [1, 6], 'FineWeb-Edu (it)', 0.7),
  P('date-iso', ['Dates in ISO format', 'ISO 8601 timestamps', 'Year component of ISO dates'], [
    'Last modified: «2023»-‹04|11|07›-‹12|19|03›',
    'created_at: "«2024»-‹02|09›-‹14|27›T‹08|16›:30:00Z"',
    'Published ‹on |›«2019»-‹06|10›-‹30|08›.',
  ], [0, 4], 'The Stack (json/yaml)', 1.1),
  P('chem', ['Chemical compound names', 'Inorganic reagent names in procedures', 'Organic chemistry nomenclature'], [
    'The mixture was treated with «sodium» hydroxide and heated to 60 °C for two hours.',
    'Dissolve ‹2.5|10› g of «potassium» permanganate in 100 mL of water.',
    'The product was purified to give «ethyl» acetate as a colourless oil.',
    '«Benzene» rings are stabilised by delocalised electrons.',
  ], [2, 7], 'PubMed Central', 1.2),
  P('legal', ['Legal case citations (X v. Y)', 'US Supreme Court case names', 'Statutory references'], [
    'See «Brown» v. Board of Education, 347 U.S. 483 (1954).',
    'The court relied on «Miranda» v. Arizona, 384 U.S. 436, in suppressing the statement.',
    'Pursuant to «Section» 230 of the Communications Decency Act, the platform was not liable.',
  ], [2, 7], 'CourtListener'),
  P('sport', ['Sports final scores', 'Score lines in match reports'], [
    'The Celtics beat the Heat «112»-«104» on Tuesday night.',
    'Arsenal drew «2»-«2» with Brighton at the Emirates.',
    'She won the final set «6»-«4» after saving two break points.',
  ], [0, 5], 'FineWeb (news)'),
  P('money', ['Currency amounts with scale words', 'Large monetary figures in business news'], [
    'The company reported revenue of $4.2 «billion» for the quarter.',
    'The deal was valued at roughly €‹800|35|1.1› «million».',
    'Funding rose to £‹2|7› «billion» over three years.',
  ], [0, 7], 'FineWeb (news)', 1.2),
  P('dose', ['Medical dosage units', 'Units following dose quantities'], [
    'Patients received ‹500|250|10› «mg» of the drug twice daily.',
    'Administer ‹5|0.5› «mL» intravenously over ten minutes.',
    'The recommended dose is ‹20|40› «mg»/kg per day.',
  ], [0, 5], 'PubMed Central', 0.9),
  P('latex', ['LaTeX math commands', 'LaTeX fractions and summations'], [
    'we obtain $\\«frac»{1}{2}\\sum_{i=1}^{n} x_i$',
    'Let $f(x) = \\«int»_0^1 x^2\\,dx$.',
    'so that $\\«mathbb»{E}[X] = \\«sum»_k k\\,p_k$.',
  ], [0, 7], 'arXiv', 1.1),
  P('phys', ['Names of physicists', 'Surnames of 20th-century scientists'], [
    '«Einstein» published the special theory of relativity in 1905.',
    'The experiment confirmed ideas first proposed by «Feynman» and «Schwinger».',
    'Her thesis extended work by «Bohr» and «Heisenberg» on atomic structure.',
  ], [1, 6], 'Wikipedia', 0.9),
  P('cook', ['Imperative verbs in recipes', 'Cooking instructions (leading verbs)'], [
    '«Preheat» the oven to 180°C and grease a 9-inch tin.',
    '«Whisk» the eggs and sugar until pale and fluffy.',
    'Gently «fold» in the flour, then pour into the prepared pan.',
  ], [2, 7], 'FineWeb (recipes)'),
  P('archaic', ['Archaic second-person pronouns', 'King James-style phrasing'], [
    'And he said unto them, «Thou» shalt not bear false witness against «thy» neighbour.',
    'Blessed art «thou» among women, and blessed is the fruit of «thy» womb.',
  ], [1, 6], 'Project Gutenberg', 0.6),
  P('wh', ['Wh-question openers', 'Question-initial interrogatives'], [
    '«Why» does the sky appear blue during the day?',
    '«How» many people attended the conference last year?',
    'Can you explain «what» happens when a star collapses?',
  ], [1, 7], 'StackExchange', 1.1),
  P('en-neg', ['English negation (not / never / no)', 'Negation particles before predicates'], [
    'The committee did «not» approve the proposal.',
    'She has «never» been to Lisbon.',
    'There was «no» evidence of tampering.',
  ], [2, 7], 'FineWeb-Edu', 1.2),
  P('quote-open', ['Opening quotation marks in dialogue', 'Quote openers after a speaker turn'], [
    'She looked up. «“»I didn’t expect you,” she said.',
    'He shrugged and answered, «“»We can leave at dawn.”',
  ], [0, 4], 'Project Gutenberg', 0.8),
  P('paren-close', ['Closing parentheses', 'Closing parenthesis after statistics'], [
    'The treatment group improved (mean difference 4.2«)», although the interval was wide.',
    'Rates were higher in 2020 (12.4%«)» than in 2018.',
  ], [0, 3], 'PubMed Central'),
  P('discourse', ['Sentence-initial discourse markers', 'Contrastive connectives (However, Nevertheless)'], [
    '«However», the results were not statistically significant.',
    '«Moreover», the authors note that the sample was small.',
    '«Nevertheless», the policy remained in force until 2011.',
    '«In contrast», rural areas saw little change.',
  ], [2, 7], 'FineWeb-Edu', 1.3),
  P('hedge', ['Hedging verbs and modals', 'Epistemic hedges in scientific prose'], [
    'These findings «suggest» that the effect may be driven by sleep.',
    'The data «may» reflect differences in reporting.',
    'It «appears» that the drought contributed to the decline.',
  ], [3, 7], 'arXiv', 1.1),
  P('compar', ['Correlative comparatives (more … than)', 'Comparative “than” clauses'], [
    'Cities are «more» expensive «than» they were a decade ago.',
    'The second trial was «less» costly «than» the first.',
  ], [3, 7], 'FineWeb-Edu', 0.8),
  P('lifespan', ['Life-span ranges after names', 'Birth–death years in parentheses'], [
    'Ada Lovelace (1815«–»1852) wrote the first published algorithm.',
    'Marie Curie («1867»–«1934») won Nobel Prizes in two sciences.',
  ], [0, 5], 'Wikipedia'),
  P('state', ['US state names', 'State names in news datelines'], [
    'She moved from «Ohio» to «Oregon» after college.',
    'Flooding across «Louisiana» and «Mississippi» closed several highways.',
  ], [0, 4], 'FineWeb (news)', 0.8),
  P('version', ['Software version numbers', 'Semantic-version patch components'], [
    'Upgrade to v«2».‹3|4|9›.‹1|0|2› to fix the regression.',
    'Requires Node «18».‹2|17›.0 or later.',
  ], [0, 4], 'StackExchange', 0.8),
  P('url', ['URL schemes and domains', 'Tokens after “https://”'], [
    'Source: «https»://www.nature.com/articles/s41586-023-06747-5',
    'See «http»://example.org/docs/index.html for details.',
  ], [0, 3], 'FineWeb'),
  P('instr', ['Musical instrument names', 'Orchestral instruments'], [
    'She plays the «cello» in the city orchestra and the «oboe» at home.',
    'The quartet features «violin», «viola» and «double bass».',
  ], [0, 5], 'Wikipedia', 0.7),
  P('chess', ['Chess move notation', 'Algebraic notation for piece moves'], [
    '1. e4 e5 2. «Nf3» Nc6 3. «Bb5» a6 4. «Ba4» Nf6',
    '12. «Qd2» O-O 13. «Rfe1» Re8 14. «Bf1» Bf8',
  ], [0, 4], 'Lichess PGN', 0.5),
  P('gene', ['Gene and protein symbols', 'Human oncogene and tumour-suppressor names'], [
    'Mutations in «BRCA1» and «TP53» are associated with elevated cancer risk.',
    'Expression of «IL6» increased after stimulation with lipopolysaccharide.',
    'Knockdown of «KRAS» reduced proliferation in all three cell lines.',
  ], [1, 6], 'PubMed Central', 1.1),
  P('pval', ['Statistical significance reporting', 'p-values inside parentheses'], [
    'The difference was significant («p» < 0.05).',
    'Group means differed (t = 2.41, «p» = 0.017).',
  ], [1, 6], 'PubMed Central', 0.9),
  P('etal', ['Citations with “et al.”', 'Author–year citations'], [
    'as shown by Vaswani «et» «al». (2017)',
    'Following Hinton «et» «al». [12], we use dropout.',
  ], [0, 5], 'arXiv'),
  P('clock', ['Clock times and AM/PM markers', 'Time-of-day expressions'], [
    'Doors open at ‹7|6|8›:‹00|30› «PM».',
    'The meeting starts at 9:30 «a».m. in room 204.',
  ], [0, 4], 'FineWeb (events)'),
  P('compass', ['Compass directions', 'Cardinal directions in geography'], [
    'The village lies «north» of the river, ten miles «south»-west of the coast.',
    'Winds from the «east» will strengthen over the «north»-east.',
  ], [0, 4], 'Wikipedia', 0.8),
  P('grief', ['Words for grief and loss', 'Bereavement vocabulary'], [
    'After his father’s death she felt a deep «grief» that did not ease.',
    'The community held a vigil to «mourn» the victims.',
    'Her «sorrow» was visible to everyone at the funeral.',
  ], [3, 7], 'Reddit (r/GriefSupport)'),
  P('ordinal', ['Ordinal numbers', 'Ordinals in addresses and dates'], [
    'Her office is on the «third» floor of the old library.',
    'Join us for her «21st» birthday on the «14th».',
  ], [0, 3], 'FineWeb'),
  P('month', ['Month names', 'Month names in dates'], [
    'Elections will be held in «September» this year.',
    'The festival runs from «March» 14 to «April» 2.',
  ], [0, 3], 'FineWeb (news)', 0.9),
  P('roman', ['Roman numerals in names and titles', 'Regnal numbers and wars'], [
    'Henry «VIII» broke with Rome in 1534.',
    'The treaty ended World War «II» in Europe.',
    'See Chapter «IV» for the full argument.',
  ], [0, 4], 'Wikipedia', 0.7),
  P('acro', ['Acronym definitions in parentheses', 'Acronym introduced after its expansion'], [
    'The World Health Organization («WHO») issued new guidance.',
    'Participants completed the Patient Health Questionnaire («PHQ»-9).',
  ], [1, 6], 'PubMed Central', 0.8),
  P('fin', ['Stock market movements', 'Verbs describing price changes in markets'], [
    'Shares «fell» 3% as investors weighed higher bond yields.',
    'The index «rallied» after the Fed signalled a pause.',
    'Tech stocks «tumbled» on weak earnings guidance.',
  ], [3, 7], 'FineWeb (finance)', 1.2),
  P('climate', ['Climate and emissions vocabulary', 'Greenhouse-gas and warming terms'], [
    'Global «emissions» rose 1.1% last year despite pledges.',
    'Warming oceans accelerate the loss of «sea» ice.',
    'Methane is a far more potent «greenhouse» gas than carbon dioxide.',
  ], [3, 7], 'FineWeb-Edu', 1.1),
  P('medieval', ['Medieval European history', 'Feudal and Carolingian terminology'], [
    'The «Carolingian» court revived classical learning under Charlemagne.',
    'After the Black Death, «feudal» obligations began to erode.',
    'Monasteries preserved manuscripts through the early «medieval» period.',
  ], [3, 7], 'Wikipedia', 1.0),
  P('court', ['Courtroom proceedings', 'Verdicts, pleas and objections'], [
    'The judge sustained the «objection» and instructed the jury.',
    'The defendant pleaded «guilty» to two counts of fraud.',
    'The jury returned a «verdict» after nine hours.',
  ], [3, 7], 'FineWeb (news)', 0.9),
  P('ml', ['Neural-network training vocabulary', 'Optimisation terms in ML papers'], [
    'We train the «transformer» with a cosine learning-rate schedule.',
    'The «gradient» norm was clipped at 1.0 to stabilise training.',
    'Each token is mapped to a learned «embedding» of dimension 2048.',
  ], [3, 7], 'arXiv', 1.3),
  P('space', ['Orbital mechanics and spaceflight', 'Launch and orbit terminology'], [
    'The probe fired its thrusters to enter a stable «orbit» around Mars.',
    'The second stage separated and the «payload» was deployed.',
  ], [3, 7], 'Wikipedia', 0.8),
  P('of-pred', ['Predicts “of” after quantity nouns', 'Quantifier nouns awaiting “of”'], [
    'A large «number» of volunteers turned up on Saturday.',
    'We saw a «lot» of rain during the trip.',
    'A «couple» of weeks later, the letter arrived.',
  ], [5, 7], 'FineWeb-Edu', 1.2),
  P('quote-pred', ['Predicts closing quotation mark', 'Final word before a closing quote'], [
    'He whispered, “We should «go»”',
    'The sign simply read “No «entry»”',
  ], [5, 7], 'Project Gutenberg', 0.9),
  P('story', ['Narrative past-tense action verbs', 'Fiction: motion verbs in third-person narration'], [
    'She «grabbed» her coat and «hurried» down the stairs.',
    'The old man «stumbled» across the yard and «vanished» into the barn.',
  ], [3, 7], 'Project Gutenberg', 1.0),
  P('phil', ['Philosophical abstractions', 'Epistemology and ethics terms'], [
    'Kant argued that «knowledge» begins with experience but does not arise entirely from it.',
    'The debate turns on whether moral «obligation» can be derived from facts alone.',
  ], [4, 7], 'Wikipedia', 0.8),
  P('transit', ['Public transport announcements', 'Service disruption notices'], [
    'Southbound trains are «delayed» by up to twenty minutes.',
    'The Northern line is «suspended» between Camden Town and Euston.',
  ], [2, 6], 'FineWeb (news)', 0.7),
]

const T = (id: string, label: string, match: string, lay: [number, number], tiers: string, w = 1): Concept => ({
  id, dom: 'token', labels: [label], tpl: [], lay, tiers, w, src: 'FineWeb-Edu', match,
})

export const TOKENS: Concept[] = [
  T('t-the', 'Token “ the”', '^ ?[Tt]he$', [0, 7], 'd', 1.6),
  T('t-comma', 'Comma tokens', '^,$', [0, 7], 'd', 1.6),
  T('t-period', 'Sentence-final periods', '^\\.$', [0, 7], 'd', 1.4),
  T('t-of', 'Prepositions “of”, “in”, “to”', '^ ?(of|in|to|for|on|at)$', [0, 6], 'd', 1.2),
  T('t-and', 'Conjunction “and”', '^ ?and$', [0, 6], 'd', 1.0),
  T('t-quote', 'Quotation marks', '^ ?["“”]$', [0, 7], 'd', 0.8),
  T('t-apos', 'Apostrophes in contractions', '^\'|’$', [0, 5], 'd', 0.8),
  T('t-cap', 'Capitalised word-initial tokens', '^ ?[A-Z][a-z]+$', [0, 6], 'd', 1.0),
  T('t-copula', 'Forms of “to be”', '^ ?(is|are|was|were|be|been)$', [0, 7], 'd', 0.9),
  T('t-art', 'Indefinite articles “a” / “an”', '^ ?(a|an)$', [0, 6], 'd', 0.8),
  T('t-digit', 'Digit tokens', '^ ?\\d+$', [0, 4], 'md', 0.8),
  T('t-hyph', 'Hyphens inside compounds', '^-$', [0, 5], 'md', 0.8),
  T('t-paren', 'Opening parenthesis', '^ ?\\($', [0, 5], 'md', 0.7),
  T('t-nl', 'Newline tokens', '^\\n$', [0, 7], 'd', 0.9),
]

export const POS: Concept[] = [
  { id: 'p-late', dom: 'pos', labels: ['Late-context position (> ~1,000 tokens)', 'Activation grows with position in document', 'Deep-in-context tokens'], tpl: [], lay: [2, 7], tiers: 'd', src: 'FineWeb-Edu (long docs)' },
  { id: 'p-early', dom: 'pos', labels: ['First tokens of a document (positions 0–16)', 'Early-context positions'], tpl: [], lay: [2, 7], tiers: 'd', src: 'FineWeb-Edu', w: 0.6 },
]

// ---------------------------------------------------------------------------------------------
// Code concepts. The first 34 (marked cluster) are the features of the layer-12 code cluster.
const C = (id: string, label: string, lang: string, f: [number, number], tpl: string[], opt: Partial<Concept> = {}): Concept => ({
  id, dom: 'code', labels: [label], tpl, lay: [2, 7], tiers: 'sm', w: 1, src: `The Stack v2 · ${lang}`, f, cluster: true, lang, ...opt,
})

export const CODE: Concept[] = [
  C('py-def', 'Python function definitions', 'python', [0.020, 0.048], [
    'import os\n\n«def» ‹load_config|parse_args|build_index|fetch_rows›(path: str) -> dict:\n    with open(path) as f:',
    'class Trainer:\n    «def» ‹__init__|step|evaluate›(self, ‹model|cfg›):\n        self.model = model',
    'if not rows:\n    return []\n\n«def» ‹normalize|tokenize|chunk›(text):\n    return text.strip()',
  ]),
  C('py-imp', 'Python import statements', 'python', [0.014, 0.036], [
    '«import» numpy as np\n«import» pandas as pd\n\ndf = pd.read_csv(path)',
    '«from» torch import nn\n«from» torch.utils.data import DataLoader',
    '#!/usr/bin/env python3\n«import» argparse\n«import» logging',
  ]),
  C('py-deco', 'Python decorators', 'python', [0.004, 0.012], [
    '«@»functools.lru_cache(maxsize=None)\ndef fib(n):\n    return n if n < 2 else fib(n-1) + fib(n-2)',
    '«@»app.route("/users/<int:uid>")\ndef get_user(uid):\n    return jsonify(db[uid])',
    '«@»dataclass\nclass Config:\n    lr: float = 3e-4',
  ]),
  C('py-comp', 'Python list comprehensions', 'python', [0.006, 0.018], [
    'squares = [x**2 «for» x «in» range(10) «if» x % 2 == 0]',
    'names = [u.name «for» u «in» users «if» u.active]',
    'pairs = {k: v «for» k, v «in» zip(keys, vals)}',
  ]),
  C('py-fstr', 'Python f-string interpolation', 'python', [0.005, 0.015], [
    'print(f"epoch «{»epoch}: loss=«{»loss:.4f}")',
    'log.info(f"Loaded «{»len(rows)} rows from «{»path}")',
    'msg = f"Hello, «{»user.name}! You have «{»n} new messages."',
  ]),
  C('py-try', 'Python try/except blocks', 'python', [0.005, 0.014], [
    'try:\n    data = json.loads(raw)\n«except» json.JSONDecodeError as e:\n    log.warning(e)',
    'try:\n    conn = connect(url)\n«except» (TimeoutError, OSError):\n    conn = None\n«finally»:\n    cleanup()',
  ]),
  C('py-class', 'Python class definitions', 'python', [0.006, 0.016], [
    '«class» ‹Encoder|Tokenizer|SparseAutoencoder›(nn.Module):\n    def __init__(self, d_in, d_sae):',
    '«class» ‹ConfigError|ParseError›(Exception):\n    pass',
  ]),
  C('py-doc', 'Python docstring delimiters', 'python', [0.008, 0.022], [
    'def norm(x):\n    «"""»Return the L2 norm of x.«"""»\n    return x.norm()',
    'def merge(a, b):\n    «"""»Merge two sorted lists.\n\n    Args:\n        a: first list\n    «"""»',
  ]),
  C('js-arrow', 'JavaScript arrow functions', 'javascript', [0.007, 0.02], [
    'const total = items.reduce((sum, item) «=>» sum + item.price, 0);',
    'const ids = users.map(u «=>» u.id).filter(Boolean);',
    'button.addEventListener("click", () «=>» {\n  setOpen(!open);\n});',
  ]),
  C('js-async', 'JavaScript async/await', 'javascript', [0.004, 0.011], [
    'const res = «await» fetch(`/api/items/${id}`);\nconst data = «await» res.json();',
    'export «async» function load() {\n  const rows = «await» db.query(sql);',
  ]),
  C('js-imp', 'ES module imports and require calls', 'javascript', [0.006, 0.016], [
    'const fs = «require»(\'fs\');\nconst path = «require»(\'path\');',
    '«import» React, { useState } from \'react\';\n«import» { createRoot } from \'react-dom/client\';',
  ]),
  C('jsx-close', 'JSX closing tags', 'javascript', [0.004, 0.010], [
    '  <li key={item.id}>{item.name}«</»li>\n))}\n«</»ul>',
    '    <Header title="Dashboard" />\n  «</»main>\n«</»div>',
  ]),
  C('ts-iface', 'TypeScript interface declarations', 'typescript', [0.003, 0.009], [
    '«interface» User {\n  id: number;\n  name: string;\n}',
    'export «type» Props = {\n  onClose: () => void;\n};',
  ]),
  C('c-inc', 'C/C++ #include directives', 'c', [0.002, 0.007], [
    '«#»include <stdio.h>\n«#»include "util.h"\n\nint main(void) {',
    '«#»include <vector>\n«#»include <string>\n\nusing namespace std;',
  ]),
  C('cpp-tmpl', 'C++ template angle brackets', 'cpp', [0.004, 0.012], [
    'std::unordered_map«<»std::string, int«>» counts;',
    'std::vector«<»std::pair«<»int, int«>»«>» edges;',
    'template «<»typename T«>»\nT clamp(T x, T lo, T hi);',
  ]),
  C('rs-fn', 'Rust function signatures', 'rust', [0.003, 0.009], [
    'pub «fn» ‹parse|load|merge›(input: &str) -> Result<Config, Error> {',
    'impl Parser {\n    «fn» new() -> Self {\n        Self { pos: 0 }',
  ]),
  C('rs-match', 'Rust match arms', 'rust', [0.003, 0.008], [
    'match cmd {\n    Cmd::Quit «=>» break,\n    Cmd::Skip «=>» continue,\n}',
    'let n = match s.parse::<u32>() {\n    Ok(v) «=>» v,\n    Err(_) «=>» 0,\n};',
  ]),
  C('rs-life', 'Rust lifetime annotations', 'rust', [0.001, 0.004], [
    'fn longest<«\'»a>(x: &«\'»a str, y: &«\'»a str) -> &«\'»a str {',
    'struct Parser<«\'»src> {\n    input: &«\'»src str,\n}',
  ]),
  C('go-err', 'Go error handling', 'go', [0.002, 0.006], [
    'f, err := os.Open(path)\nif «err» != nil {\n\treturn nil, fmt.Errorf("open %s: %w", path, err)\n}',
    'resp, err := http.Get(url)\nif «err» != nil {\n\tlog.Fatal(err)\n}',
  ]),
  C('java-ann', 'Java annotations', 'java', [0.003, 0.009], [
    '«@»Override\npublic String toString() {\n    return name;\n}',
    '«@»Autowired\nprivate UserService users;\n\n«@»GetMapping("/{id}")',
  ]),
  C('sql-sel', 'SQL SELECT … FROM', 'sql', [0.002, 0.006], [
    '«SELECT» id, email «FROM» users «WHERE» created_at > \'2024-01-01\';',
    '«SELECT» region, COUNT(*) «FROM» orders «GROUP» BY region;',
  ]),
  C('sql-join', 'SQL JOIN … ON', 'sql', [0.001, 0.004], [
    'FROM orders o\n«JOIN» customers c «ON» c.id = o.customer_id\n«LEFT» «JOIN» refunds r «ON» r.order_id = o.id',
  ]),
  C('sh-pipe', 'Shell pipes and redirects', 'shell', [0.002, 0.007], [
    'grep -r "TODO" src/ «|» sort «|» uniq -c «>» todos.txt',
    'cat access.log «|» awk \'{print $1}\' «|» sort -u «>» ips.txt',
  ]),
  C('html-tag', 'HTML opening tags', 'html', [0.015, 0.040], [
    '«<»div class="card">\n  «<»h2>Results</h2>\n  «<»p>No matches found.</p>',
    '«<»ul class="nav">\n  «<»li>Home</li>\n  «<»li>Docs</li>',
  ]),
  C('css-prop', 'CSS property declarations', 'css', [0.004, 0.012], [
    '.card {\n  display«:» flex;\n  gap«:» 12px;\n  padding«:» 16px;\n}',
    'a:hover {\n  color«:» #1d4ed8;\n  text-decoration«:» underline;\n}',
  ]),
  C('json-key', 'JSON object keys', 'json', [0.020, 0.055], [
    '{\n  «"»name«"»: "featurescope",\n  «"»version«"»: "0.4.1"\n}',
    '{"id": 42, «"»tags«"»: ["a", "b"], «"»active«"»: true}',
  ]),
  C('yaml-key', 'YAML nested keys', 'yaml', [0.006, 0.018], [
    'training«:»\n  lr«:» 3e-4\n  batch_size«:» 64\n  steps«:» 20000',
    'services«:»\n  web«:»\n    image«:» nginx:1.25\n    ports«:»\n      - "80:80"',
  ]),
  C('md-fence', 'Markdown code fences', 'markdown', [0.003, 0.010], [
    'Run the script:\n\n«```»bash\n./run.sh --fast\n«```»\n\nThen check the output.',
    'Install dependencies:\n«```»\nnpm install\n«```»',
  ]),
  C('git-diff', 'Git diff added and removed lines', 'diff', [0.006, 0.020], [
    '@@ -12,7 +12,7 @@ def load():\n«-»    x = 1\n«+»    x = 2',
    '@@ -40,3 +40,4 @@\n context line\n«+»    log.info("start")\n«-»    pass',
  ]),
  // Dense members of the cluster (>= 0.1)
  C('cb-close', 'Closing braces ending blocks', 'c', [0.102, 0.150], [
    'for (int i = 0; i < n; i++) {\n    total += a[i];\n«}»\nreturn total;\n«}»',
    'if (!ok) {\n  return null;\n«}»\n«}»\n\nexport default Card;',
  ], { lay: [0, 7] }),
  C('indent', 'Indentation whitespace in code', 'python', [0.130, 0.190], [
    'def run(self):\n«    »for x in self.items:\n«        »self.process(x)\n«    »return self.count',
    'class Node:\n«    »def __init__(self, v):\n«        »self.v = v\n«        »self.next = None',
  ], { lay: [0, 7] }),
  C('semi', 'Statement-ending semicolons', 'c', [0.103, 0.122], [
    'int count = 0«;»\nchar *buf = malloc(n)«;»\nmemset(buf, 0, n)«;»',
    'const x = compute(a, b)«;»\nlet y = x * 2«;»',
  ], { lay: [0, 7] }),
  C('comment', 'Inline code comments', 'python', [0.104, 0.140], [
    'x = x.detach()  «#» avoid backprop through target\nloss = (x - y).pow(2).mean()  «#» MSE',
    'int n = 0; «//» running total\nfor (;;) { «//» spin until ready',
  ], { lay: [0, 7] }),
  C('ops', 'Assignment and comparison operators', 'python', [0.100, 0.128], [
    'total «=» 0\nif count «>=» limit:\n    total «+=» count',
    'while i «<» n «&&» a[i] «!=» key {\n    i«++»;\n}',
  ], { lay: [0, 7] }),
]

export const CLUSTER_ORDER = CODE.map((c) => c.id)

export const ALL: Concept[] = [...PROSE, ...TOKENS, ...POS, ...CODE]

// Neutral filler sentences used for context, token-level and unclear features.
export const BANK: string[] = [
  'The committee met on Tuesday to review the budget, but no decision was reached.',
  'In 2019, researchers at the University of Leeds published a survey of 1,200 households.',
  '"We didn\'t expect the results to be this clear," said Dr. Alvarez.',
  'The river rises in the northern hills and flows south through three counties before reaching the sea.',
  'Prices have risen steadily over the past decade, particularly in coastal cities.',
  'She opened the window, listened for a moment, and then went back to her book.',
  'A well-designed experiment should isolate one variable at a time.',
  'The museum (founded in 1887) holds more than 40,000 objects from the region.',
  'Most of the volunteers arrived early, and the work was finished before noon.',
  'He has lived in Rotterdam since 2004 and works as a structural engineer.',
  'It is difficult to say whether the policy will work, but the early signs are encouraging.',
  'The bakery on Mill Street closes at six, so we should leave soon.',
  'Critics have argued that the film is too long; others found it quietly moving.',
  'Heavy rain is expected across the west tonight, with gusts of up to 60 mph.',
  'The library will extend its opening hours during the exam period.',
  'They walked along the canal until the lights of the town came into view.',
  'According to the report, three of the five sites were already contaminated.',
  'My grandmother kept a small garden behind the house, where she grew beans, tomatoes and herbs.',
  'The new bridge, which cost £42 million, opened to traffic last Friday.',
  'Teachers say that smaller classes make it easier to give every pupil attention.',
  'You can\'t simply ignore the problem and hope that it goes away.',
  'The orchestra rehearsed the second movement twice before the break.',
  'Local farmers reported a poor harvest after an unusually dry spring.',
  'Once the paperwork is signed, the keys will be handed over on Monday morning.',
  'The author\'s earlier novels were set in Lagos, Nairobi and Accra.',
  'There are two main approaches: build it in-house, or buy a ready-made solution.',
  'The station was quiet at that hour; only a cleaner and a stray dog were about.',
  'Several members of the panel questioned whether the sample was representative.',
  'Water boils at 100 °C at sea level, but at a lower temperature on a mountain.',
  'After a long delay, the train finally pulled out of the platform at 7:45.',
  'The mayor promised that the park would reopen "as soon as it is safe."',
  'Children learn language by listening, imitating and, above all, being spoken to.',
  'We reviewed twelve proposals and shortlisted four for a second round of interviews.',
  'The old mill, now a gallery, still has its original waterwheel.',
]

// Token categories used by the "unclear / mixed" labels.
export const VAGUE_CATS: [string, string][] = [
  ['punctuation', '^[,.;:!?]$'],
  ['function words', '^ ?(the|of|and|to|in|a|that|for|with|as|by|on|at)$'],
  ['sentence boundaries', '^[.!?]$|^\\n$'],
  ['numerals', '^ ?\\d+$'],
  ['capitalised words', '^ ?[A-Z][a-z]+$'],
  ['closing brackets and quotes', '^[)\\]"”\']$'],
  ['auxiliary verbs', '^ ?(is|are|was|were|has|have|had|will|would|can|could|be)$'],
  ['prepositions', '^ ?(of|in|on|at|from|through|before|after|during|along|across)$'],
  ['pronouns', '^ ?(he|she|it|they|we|you|his|her|their|its)$'],
  ['adverbs', '^ ?[a-z]{3,}ly$'],
  ['plural nouns', '^ ?[a-z]{4,}s$'],
  ['commas and conjunctions', '^,$|^ ?(and|but|or|so)$'],
]
export const VAGUE_FORMS = [
  (a: string, b: string) => `Mixed: ${a} and ${b}`,
  (a: string) => `Unclear; fires on ${a}`,
  (a: string) => `Weak association with ${a}`,
  (a: string) => `Possibly ${a} (low specificity)`,
  (a: string, b: string) => `${a[0].toUpperCase()}${a.slice(1)}, sometimes ${b}`,
]
