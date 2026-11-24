// Mock snapshot of Priya's Plumhollow village, as synced at 2:40 AM.

export const at = (day: 16 | 17 | 18, h: number, m: number) => new Date(2026, 10, day, h, m, 0);

export const START = at(17, 2, 40); // the moment the app opens
export const LEFT_AT = at(16, 22, 2); // last time Priya was in the game
export const BREAK_END = at(17, 2, 52);
export const EVENT_END = at(17, 4, 32);
export const RESTOCK_AT = at(17, 4, 0);
export const BURST_AT = at(17, 2, 38);

export const PLAYER = { name: 'Priya', handle: 'Priya_N' };
export const VILLAGE = { name: 'Plumhollow', level: 34, xp: 18_240, xpNext: 21_000 };

export type CropId = 'pumpkin' | 'lavender' | 'wheat';
export interface Crop {
  id: CropId;
  name: string;
  plot: string;
  qty: number;
  readyAt: Date;
  spoilsAt: Date | null;
  keepsNote: string;
}

export const CROPS: Crop[] = [
  { id: 'pumpkin', name: 'Pumpkins', plot: 'South field', qty: 40, readyAt: at(16, 23, 15), spoilsAt: at(17, 3, 15), keepsNote: 'Spoils 4h after ripening' },
  { id: 'lavender', name: 'Lavender', plot: 'Cottage beds', qty: 25, readyAt: at(17, 1, 30), spoilsAt: at(18, 1, 30), keepsNote: 'Keeps 24h' },
  { id: 'wheat', name: 'Wheat', plot: 'East field', qty: 60, readyAt: at(17, 2, 5), spoilsAt: null, keepsNote: 'Never spoils' },
];

export const BARN_START = { lavender: 12, goldenEgg: 0, coins: 4_865 };

export const BAKERY = {
  item: 'Apple pie',
  total: 5,
  doneTimes: [at(16, 23, 42), at(17, 1, 22)],
  nextAt: at(17, 3, 2),
  trayCapacity: 3,
  allDoneIfCollected: at(17, 6, 22),
};

export const GUILD = {
  name: 'Moss & Mischief',
  members: 18,
  onlineNow: 6,
  event: 'Harvest Moon Festival',
  goal: 10_000,
  pointsAtStart: 6_420,
  pacePerHour: 1_850, // last two hours
  myContribution: 410,
  crateSize: 10,
  ptsPerCrate: 40,
  ptsPerPie: 30,
  reward: 'Moonlit Lantern Arch + 1,200 coins each',
  top: [
    { name: 'Thornbury', pts: 1_240 },
    { name: 'June_bug', pts: 905 },
    { name: 'Fennwick', pts: 760 },
    { name: 'Priya_N', pts: 410, me: true },
  ],
};

export type Tier = 'close' | 'friend' | 'stranger';

export const CLOSE_FRIENDS_START = ['June_bug', 'Fennwick'];
export const OTHER_FRIENDS_START = [
  'Marigold_Ash', 'tobyknits', 'Okonkwo.Farms', 'sleepyheron', 'Bramble_Bee', 'quillon',
  'RosieThistle', 'dandelion_dev', 'Haruto_M', 'mapleandmoss', 'Wrenna', 'pip_squash',
  'Cobblestone_Kai', 'TeaWithLiesel', 'oatmilk_otter', 'Saffron.Lane', 'hollyhock88',
  'BenedictBarn', 'luna_lilypad', 'GrumpyGourd', 'Ines_Plantwell', 'fernfiddle', 'Tuckerbrook',
];

export interface Trade {
  id: string;
  from: string;
  receivedAt: Date;
  wants: string;
  offers: string;
  note: string;
  verdict: 'fair' | 'lowball';
}

export const TRADES: Trade[] = [
  {
    id: 'june',
    from: 'June_bug',
    receivedAt: at(17, 2, 38),
    wants: '10 lavender',
    offers: '1 golden egg',
    note: 'Golden eggs go for 15–20 lavender on the guild market.',
    verdict: 'fair',
  },
  {
    id: 'farmlord',
    from: 'xXFarmlordXx',
    receivedAt: at(17, 2, 38),
    wants: '40 pumpkins',
    offers: '120 coins',
    note: 'Market price is ~9 coins per pumpkin (~360). Not on your friends list, no shared guild.',
    verdict: 'lowball',
  },
];

export type CategoryId =
  | 'cropReady' | 'cropSpoil' | 'production' | 'animals'
  | 'eventDeadline' | 'eventMilestone' | 'guildMention' | 'guildChat'
  | 'trades' | 'friendVisits' | 'gifts'
  | 'shopRestock' | 'dailyRewards' | 'news';

export interface Category {
  id: CategoryId;
  group: 'Village' | 'Guild' | 'Friends & trades' | 'Shop & news';
  name: string;
  desc: string;
}

export const CATEGORIES: Category[] = [
  { id: 'cropReady', group: 'Village', name: 'Crops ready', desc: 'A field or bed finished growing' },
  { id: 'cropSpoil', group: 'Village', name: 'Crops about to spoil', desc: '30–40 min before a ready crop spoils' },
  { id: 'production', group: 'Village', name: 'Bakery & workshop', desc: 'An item in a production queue is done' },
  { id: 'animals', group: 'Village', name: 'Animal goods', desc: 'Eggs, wool or milk ready to collect' },
  { id: 'eventDeadline', group: 'Guild', name: 'Guild event deadline', desc: 'When a guild event has under 2 hours left' },
  { id: 'eventMilestone', group: 'Guild', name: 'Guild event milestones', desc: 'Your guild passes 25%, 50%, 75% of a goal' },
  { id: 'guildMention', group: 'Guild', name: 'Guild chat mentions', desc: 'Someone @mentions you in guild chat' },
  { id: 'guildChat', group: 'Guild', name: 'All guild chat', desc: 'Batched summary of new guild messages' },
  { id: 'trades', group: 'Friends & trades', name: 'Trade requests', desc: 'Someone offers you a trade' },
  { id: 'friendVisits', group: 'Friends & trades', name: 'Friend visits', desc: 'A friend visits or helps in your village' },
  { id: 'gifts', group: 'Friends & trades', name: 'Gifts received', desc: 'A friend sends you a gift' },
  { id: 'shopRestock', group: 'Shop & news', name: 'Limited shop restocks', desc: 'Reminder 1–2 hours before a restock' },
  { id: 'dailyRewards', group: 'Shop & news', name: 'Daily rewards', desc: 'Your daily login reward is ready' },
  { id: 'news', group: 'Shop & news', name: 'News & seasonal offers', desc: 'Updates, sales and new seasons' },
];

export interface Alert {
  id: string;
  at: Date;
  cat: CategoryId;
  title: string;
  body?: string;
  from?: string; // sender, for trades
}

export const ALERTS: Alert[] = [
  { id: 'a1', at: at(16, 22, 41), cat: 'guildChat', title: 'Moss & Mischief: 14 new messages', body: 'Thornbury, June_bug and 4 others are chatting' },
  { id: 'a2', at: at(16, 23, 15), cat: 'cropReady', title: 'Pumpkins ×40 are ready', body: 'South field' },
  { id: 'a3', at: at(16, 23, 42), cat: 'production', title: 'Apple pie 1 of 5 is out of the oven', body: 'Bakery' },
  { id: 'a4', at: at(16, 23, 58), cat: 'friendVisits', title: 'Fennwick visited Plumhollow', body: 'Watered your orchard (+40 XP)' },
  { id: 'a5', at: at(17, 0, 0), cat: 'dailyRewards', title: 'Daily reward ready — day 12 streak', body: '3 moon seeds waiting' },
  { id: 'a6', at: at(17, 1, 22), cat: 'production', title: 'Apple pie 2 of 5 is out of the oven', body: 'Bakery' },
  { id: 'a7', at: at(17, 1, 30), cat: 'cropReady', title: 'Lavender ×25 is ready', body: 'Cottage beds' },
  { id: 'a8', at: at(17, 1, 54), cat: 'eventMilestone', title: 'Harvest Moon Festival is halfway there', body: 'Guild passed 5,000 points' },
  { id: 'a9', at: at(17, 2, 5), cat: 'cropReady', title: 'Wheat ×60 is ready', body: 'East field' },
  { id: 'b1', at: BURST_AT, cat: 'cropSpoil', title: 'Pumpkins spoil at 3:15 AM', body: '40 pumpkins in South field' },
  { id: 'b2', at: BURST_AT, cat: 'eventDeadline', title: 'Harvest Moon Festival ends in 1h 54m', body: '6,420 of 10,000 points' },
  { id: 'b3', at: BURST_AT, cat: 'trades', from: 'June_bug', title: 'June_bug sent a trade request', body: '10 lavender → 1 golden egg' },
  { id: 'b4', at: BURST_AT, cat: 'trades', from: 'xXFarmlordXx', title: 'xXFarmlordXx sent a trade request', body: '40 pumpkins → 120 coins' },
  { id: 'b5', at: BURST_AT, cat: 'shopRestock', title: 'Limited shop restocks at 4:00 AM', body: 'Lantern Gazebo is back' },
  { id: 'b6', at: BURST_AT, cat: 'guildMention', title: 'Thornbury mentioned you', body: '“@Priya_N any spare pumpkins for the festival? we’re close!”' },
];

// ---------- Alert settings ----------

export type TradeFrom = 'anyone' | 'friends' | 'close';
export type QuietTradeFrom = 'close' | 'friends';

export interface Settings {
  enabled: Record<CategoryId, boolean>;
  breakthrough: Record<CategoryId, boolean>;
  tradeFrom: TradeFrom;
  quietTradeFrom: QuietTradeFrom;
  quietOn: boolean;
  quietStart: number; // minutes after midnight
  quietEnd: number;
  quietDays: boolean[]; // Sun..Sat, the night the quiet period starts
  digest: boolean;
}

const allCats = (v: boolean) =>
  Object.fromEntries(CATEGORIES.map((c) => [c.id, v])) as Record<CategoryId, boolean>;

export const INITIAL_SETTINGS: Settings = {
  enabled: allCats(true),
  breakthrough: allCats(false),
  tradeFrom: 'anyone',
  quietTradeFrom: 'close',
  quietOn: false,
  quietStart: 22 * 60,
  quietEnd: 6 * 60 + 30,
  quietDays: [true, true, true, true, true, true, true],
  digest: false,
};

export function shiftPreset(s: Settings): Settings {
  const breakthrough = allCats(false);
  breakthrough.eventDeadline = true;
  breakthrough.trades = true;
  return {
    ...s,
    enabled: { ...s.enabled, eventDeadline: true, trades: true },
    breakthrough,
    quietTradeFrom: 'close',
    quietOn: true,
    quietStart: 22 * 60,
    quietEnd: 6 * 60 + 30,
    digest: true,
  };
}

export type Outcome = 'delivered' | 'held' | 'off' | 'filtered';

export function tierOf(name: string | undefined, close: string[], others: string[]): Tier {
  if (!name) return 'stranger';
  if (close.includes(name)) return 'close';
  if (others.includes(name)) return 'friend';
  return 'stranger';
}

const tierAllows = (tier: Tier, rule: TradeFrom | QuietTradeFrom) =>
  rule === 'anyone' || (rule === 'friends' && tier !== 'stranger') || (rule === 'close' && tier === 'close');

export function inQuiet(d: Date, s: Settings): boolean {
  if (!s.quietOn) return false;
  const mins = d.getHours() * 60 + d.getMinutes();
  const overnight = s.quietStart > s.quietEnd;
  let nightDay = d.getDay();
  let inside: boolean;
  if (overnight) {
    if (mins >= s.quietStart) inside = true;
    else if (mins < s.quietEnd) {
      inside = true;
      nightDay = (nightDay + 6) % 7; // belongs to the previous night
    } else inside = false;
  } else {
    inside = mins >= s.quietStart && mins < s.quietEnd;
  }
  return inside && s.quietDays[nightDay];
}

export function outcome(a: Alert, s: Settings, close: string[], others: string[]): Outcome {
  if (!s.enabled[a.cat]) return 'off';
  const tier = tierOf(a.from, close, others);
  if (a.cat === 'trades' && !tierAllows(tier, s.tradeFrom)) return 'filtered';
  if (inQuiet(a.at, s)) {
    if (!s.breakthrough[a.cat]) return 'held';
    if (a.cat === 'trades' && !tierAllows(tier, s.quietTradeFrom)) return 'held';
  }
  return 'delivered';
}

export function minsToLabel(m: number): string {
  const h24 = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(mm).padStart(2, '0')} ${ampm}`;
}

export const fmtTime = (d: Date) => minsToLabel(d.getHours() * 60 + d.getMinutes());

export function fmtDur(ms: number): string {
  if (ms <= 0) return '0m';
  const total = Math.floor(ms / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function fmtClock(ms: number): string {
  if (ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
