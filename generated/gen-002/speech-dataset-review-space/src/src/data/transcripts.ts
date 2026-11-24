import { ACCENTS, DATA } from './model';
import { mulberry32, hashStr } from './rng';

const BANK: Record<string, string[]> = {
  'en-NG': [
    'please send the parcel to fourteen Adeola Odeku street Victoria Island',
    'how much is the fare from Ikeja to Obalende this evening',
    'remind me to call Chinedu when I reach the bus stop',
    'is Third Mainland Bridge still blocked this morning',
    'transfer five thousand naira to my mum’s account',
    'book a ride to Murtala Muhammed airport terminal two',
    'the generator at the shop needs diesel before seven',
    'play the new Burna Boy album on my phone',
    'what is the weather in Abuja tomorrow afternoon',
    'set an alarm for five thirty so I can beat the traffic',
    'my order number is four seven two nine one six',
    'find the nearest pharmacy on Allen Avenue',
    'tell Ngozi I am already at Ojuelegba under the bridge',
    'I want to check the balance on my GTBank account',
    'the delivery man said he is at the gate of Lekki Phase One',
  ],
  'en-GH': [
    'navigate to Kwame Nkrumah Circle and avoid the motorway',
    'send fifty cedis to Kofi on mobile money',
    'what time does Makola market close today',
    'call Akosua and tell her I am at Kaneshie',
    'is there traffic on the Tema motorway right now',
    'remind me to buy credit before I board the trotro',
    'play some highlife music by Daddy Lumba',
    'how far is Osu from Accra Mall',
    'book a taxi from Madina to the Kotoka airport',
    'what is the exchange rate for dollars to cedis today',
  ],
  'en-KE': [
    'send two thousand shillings to Wanjiru on M-Pesa',
    'how is the traffic on Mombasa Road right now',
    'find me a ride to Jomo Kenyatta airport',
    'what time does the Westlands branch open on Saturday',
    'remind me to buy KPLC tokens tonight',
    'call Otieno and tell him I am stuck at Globe roundabout',
    'what is the weather like in Kisumu tomorrow',
    'play the latest Sauti Sol songs',
  ],
  'en-ZA': [
    'how far is Sandton from Rosebank at this time',
    'remind me about load shedding at six tonight',
    'send two hundred rand to Thabo',
    'is the N1 still closed near Midrand',
    'book a table at the braai place in Melville for Friday',
  ],
  'en-IN': [
    'book an auto from Koramangala to Indiranagar',
    'recharge my Jio number with the two ninety nine plan',
    'what is the PNR status for train one two six two seven',
    'call Ramesh uncle and tell him we are reaching by eight',
    'transfer two thousand rupees to Priya on UPI',
    'is the metro running on the purple line today',
    'order one plate of masala dosa and two filter coffees',
    'what time is the flight to Hyderabad on Sunday',
  ],
  'en-PH': [
    'send five hundred pesos to my tita in Cebu',
    'what time is the last bus to Baguio tonight',
    'remind me to pay the Meralco bill on Friday',
    'I would like to report an issue with my postpaid plan',
    'can you transfer me to the billing department please',
  ],
  'en-US': [
    'add oat milk and coffee filters to my shopping list',
    'what is the status of my order from last Tuesday',
    'I would like to dispute a charge on my credit card statement',
    'turn the thermostat down to sixty eight',
    'call the pediatrician’s office and ask about Thursday',
    'can you read back my last three text messages',
    'I need to change the shipping address on my account',
    'navigate to the closest gas station that is open now',
    'my account number is five five two oh nine one',
    'the package was supposed to arrive yesterday but it never showed up',
    'set a timer for twelve minutes',
    'what is the score of the Celtics game',
  ],
  'en-GB': [
    'could you book a table for four at half seven',
    'I would like to cancel my direct debit please',
    'ring my sister on her mobile',
    'top up my Oyster card with twenty pounds',
    'what time is the next train to Manchester Piccadilly',
    'I have been on hold for forty minutes already',
  ],
  'en-AU': [
    'what time does the Woolies on George Street close',
    'remind me to put the bins out tonight',
    'how long is the drive from Brisbane to the Gold Coast',
    'call Liam and tell him I am running ten minutes late',
  ],
  'en-SC': [
    'what time is the next train to Glasgow Central',
    'is the M8 still closed near Harthill',
    'what is on at the cinema in Leith tonight',
    'phone my gran and tell her I will be up on Sunday',
  ],
  es: [
    'pon una alarma para las seis y media',
    'llama a mi mamá al celular',
    'cuánto tarda en llegar mi pedido',
    'quiero cancelar mi suscripción',
    'cómo está el tráfico en el periférico',
    'envía un mensaje a Carlos que llego tarde',
    'necesito hablar con un asesor por favor',
  ],
  pt: [
    'liga para a Fernanda no celular',
    'qual é a previsão do tempo para amanhã em São Paulo',
    'quero falar com um atendente',
    'adiciona arroz e feijão na lista de compras',
    'meu pedido ainda não chegou',
  ],
  fr: [
    'appelle Juliette sur son portable',
    'quel temps fera-t-il demain à Lyon',
    'je voudrais modifier mon adresse de livraison',
    'mets un minuteur de dix minutes',
    'je n’arrive pas à me connecter à mon compte',
  ],
  de: [
    'ruf Jonas auf dem Handy an',
    'wie wird das Wetter morgen in Hamburg',
    'ich möchte meine Bestellung stornieren',
    'stell einen Wecker auf halb sieben',
    'wann fährt die nächste S-Bahn zum Hauptbahnhof',
  ],
  hi: [
    'मम्मी को कॉल करो',
    'कल दिल्ली में मौसम कैसा रहेगा',
    'मेरा रिचार्ज कब खत्म होगा',
    'पास का पेट्रोल पंप दिखाओ',
    'राहुल को मैसेज भेजो कि मैं दस मिनट में पहुंच रहा हूं',
  ],
  ar: ['اتصل بأحمد على الموبايل', 'ايه حالة الطقس بكرة في القاهرة', 'عايز أكلم خدمة العملاء', 'فين أقرب صيدلية'],
  ja: ['明日の天気を教えて', '母に電話して', '七時にアラームをセットして', '近くのコンビニはどこですか', '注文の配送状況を確認したい'],
  zh: ['给妈妈打电话', '明天北京天气怎么样', '帮我设一个早上七点的闹钟', '我想查一下我的订单', '附近有没有加油站'],
};

const CONFUSIONS: Record<string, string[]> = {
  fourteen: ['forty'],
  forty: ['fourteen'],
  fifty: ['fifteen'],
  thirty: ['thirteen'],
  two: ['to'],
  four: ['for'],
  eight: ['ate'],
  odeku: ['o decoo', 'odeco'],
  adeola: ['a dealer', 'adela'],
  ikeja: ['a kayja', 'ikea'],
  obalende: ['oba lend a', 'obi lender'],
  chinedu: ['china do', 'chin ado'],
  naira: ['nair', 'nara'],
  mainland: ['main land', 'mail and'],
  murtala: ['more tala', 'martella'],
  muhammed: ['mohammed'],
  diesel: ['the sale', 'dizzle'],
  burna: ['burner', 'bona'],
  abuja: ['a booger', 'abba ja'],
  ojuelegba: ['oju leg bar', 'o jo leg ba'],
  ngozi: ['go zee', 'ngozy'],
  gtbank: ['gt bank', 'g t bang'],
  lekki: ['lucky', 'leki'],
  cedis: ['cities', 'cds'],
  kofi: ['coffee'],
  makola: ['my cola', 'macula'],
  akosua: ['a coaster', 'akosa'],
  kaneshie: ['can issue', 'kenneshi'],
  tema: ['tamer', 'tim a'],
  trotro: ['true true', 'trotter'],
  highlife: ['high life'],
  lumba: ['lumber', 'lambda'],
  osu: ['oh sue', 'also'],
  nkrumah: ['crew ma', 'in kruma'],
  madina: ['medina'],
  kotoka: ['coca', 'ko toka'],
  circle: ['circus'],
  motorway: ['motor way'],
  credit: ['credits'],
  board: ['bored'],
  parcel: ['pass all', 'parcels'],
  fare: ['fair'],
  reach: ['rich'],
  bus: ['boss'],
  stop: ['stuff'],
  traffic: ['traffics'],
  pharmacy: ['farmers see'],
  allen: ['alan', 'ellen'],
  wanjiru: ['one jiru'],
  otieno: ['oh tiena'],
  'm-pesa': ['impressa', 'mpesa'],
  koramangala: ['kora mangala'],
  indiranagar: ['indira nagar'],
  jio: ['geo'],
  dosa: ['dosas', 'the sa'],
  rupees: ['rupee'],
  meralco: ['mira co'],
  baguio: ['bag yo'],
  thermostat: ['thermo stat'],
  oyster: ['easter'],
  harthill: ['heart hill'],
  leith: ['leeds'],
  gran: ['gran’s', 'grand'],
  load: ['low'],
  shedding: ['sheddin', 'shading'],
  sandton: ['santon'],
  the: ['a', 'to'],
  to: ['the', 'two'],
  is: ['as', 'it'],
  my: ['me', 'a'],
  and: ['an', 'in'],
  at: ['that', 'a'],
  am: ['and', 'i'],
  for: ['four', 'of'],
  on: ['and', 'in'],
  of: ['off', 'a'],
};

const FILLERS = ['the', 'a', 'and', 'uh', 'to', 'i'];
const SHORT_SUBS = ['the', 'a', 'to', 'in', 'and', 'it', 'on', 'is'];
const VOWELS = 'aeiou';
const CJK_SUBS: Record<string, string> = {
  天: '田', 气: '起', 话: '画', 妈: '马', 钟: '中', 订: '定', 单: '但', 站: '战', 油: '有',
  明: '名', 電: '伝', 話: '和', 天気: '転機', 時: '自', 確: '画', 認: '人',
};

export type Tok =
  | { t: 'ok'; w: string }
  | { t: 'sub'; ref: string; hyp: string; isNew: boolean }
  | { t: 'del'; ref: string; isNew: boolean }
  | { t: 'ins'; hyp: string; isNew: boolean };

export interface ClipTranscript {
  ref: string[];
  charLevel: boolean;
  rtl: boolean;
  v41: Tok[];
  v42: Tok[];
  errors41: number;
  errors42: number;
}

function bankFor(accentIdx: number): string[] {
  const a = ACCENTS[accentIdx];
  if (BANK[a.code]) return BANK[a.code];
  const lang = a.code.split('-')[0];
  return BANK[lang] || BANK['en-US'];
}

function mutate(word: string, rng: () => number, charLevel: boolean): string {
  if (charLevel) return CJK_SUBS[word] || '的';
  const key = word.toLowerCase().replace(/[’'.,?]/g, '');
  const c = CONFUSIONS[key];
  if (c) return c[Math.floor(rng() * c.length)];
  if (/^[ऀ-ॿ]/.test(word)) return word.length > 2 ? word.slice(0, -1) : 'है';
  if (/^[؀-ۿ]/.test(word)) return word.length > 2 ? word.slice(0, -1) : 'في';
  if (word.length <= 3) return SHORT_SUBS[Math.floor(rng() * SHORT_SUBS.length)];
  // swap a vowel, or clip the ending — the usual shape of acoustic confusions
  const chars = word.toLowerCase().split('');
  const vi: number[] = [];
  chars.forEach((ch, i) => VOWELS.includes(ch) && i > 0 && vi.push(i));
  if (vi.length && rng() < 0.6) {
    const i = vi[Math.floor(rng() * vi.length)];
    const options = VOWELS.replace(chars[i], '');
    chars[i] = options[Math.floor(rng() * options.length)];
    return chars.join('');
  }
  return chars.slice(0, Math.max(2, chars.length - 1 - Math.floor(rng() * 2))).join('');
}

const cache = new Map<number, ClipTranscript>();

export function transcriptFor(i: number): ClipTranscript {
  const hit = cache.get(i);
  if (hit) return hit;
  const { ev } = DATA;
  const rng = mulberry32(hashStr('tx' + i));
  const acc = ACCENTS[ev.accent[i]];
  const charLevel = acc.metric === 'CER';
  const rtl = acc.code.startsWith('ar');
  const bank = bankFor(ev.accent[i]);
  const dur = ev.dur[i];
  const targetUnits = charLevel ? Math.max(4, Math.round(dur * 4.5)) : Math.max(3, Math.round(dur * 2.3));

  const sentences: string[] = [];
  let units = 0;
  const unitCount = (s: string) => (charLevel ? s.length : s.split(' ').length);
  if (dur < 7) {
    // short utterance — choose the sentence closest in length
    let best = bank[0];
    let bestD = Infinity;
    const start = Math.floor(rng() * bank.length);
    for (let k = 0; k < bank.length; k++) {
      const s = bank[(start + k) % bank.length];
      const d = Math.abs(unitCount(s) - targetUnits) + rng() * 2.5;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    const words = best.split(charLevel ? '' : ' ');
    const cap = Math.max(charLevel ? 3 : 2, Math.round(targetUnits * 1.35));
    sentences.push(words.length > cap ? words.slice(0, cap).join(charLevel ? '' : ' ') : best);
  } else {
    const order = bank.slice().sort(() => rng() - 0.5);
    let k = 0;
    while (units < targetUnits * 0.85 && k < order.length * 2) {
      const s = order[k % order.length];
      sentences.push(s);
      units += unitCount(s);
      k++;
    }
  }
  const ref = charLevel ? sentences.join('').split('') : sentences.join(' ').split(' ');
  const n = ref.length;

  // shared ranking of error positions: v42 keeps v41's errors and adds more (or drops some)
  const ranking = ref.map((_, k) => k).sort(() => rng() - 0.5);
  const kind = ranking.map(() => {
    const r = rng();
    return r < 0.62 ? 'sub' : r < 0.86 ? 'del' : 'ins';
  });
  const hypWord = ref.map((w) => mutate(w, rng, charLevel));
  const filler = ref.map(() => (charLevel ? '的' : FILLERS[Math.floor(rng() * FILLERS.length)]));

  const n41 = Math.min(n, Math.round(ev.wer41[i] * n));
  const n42 = Math.min(n, Math.round(ev.wer42[i] * n));

  const build = (count: number, other: number): Tok[] => {
    const errAt = new Map<number, number>();
    for (let k = 0; k < count; k++) errAt.set(ranking[k], k);
    const toks: Tok[] = [];
    for (let p = 0; p < n; p++) {
      const rank = errAt.get(p);
      if (rank === undefined) {
        toks.push({ t: 'ok', w: ref[p] });
        continue;
      }
      const isNew = rank >= other;
      const kd = kind[rank];
      if (kd === 'sub') toks.push({ t: 'sub', ref: ref[p], hyp: hypWord[p], isNew });
      else if (kd === 'del') toks.push({ t: 'del', ref: ref[p], isNew });
      else {
        toks.push({ t: 'ins', hyp: filler[p], isNew });
        toks.push({ t: 'ok', w: ref[p] });
      }
    }
    return toks;
  };

  const out: ClipTranscript = {
    ref,
    charLevel,
    rtl,
    v41: build(n41, Infinity),
    v42: build(n42, n41),
    errors41: n41,
    errors42: n42,
  };
  cache.set(i, out);
  return out;
}
