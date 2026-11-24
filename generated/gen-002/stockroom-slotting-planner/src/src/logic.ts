import {
  BASE_FILL,
  BINS,
  BIN_BY_ID,
  Bin,
  FRONT_FERTILIZER,
  FRONT_FERTILIZER_BINS,
  HEAVY_OVERHEAD_LB,
  SIZES,
  SIZE_BY_KEY,
  SKU_BY_ID,
  STOCK,
  ShipmentSize,
  SizeKey,
} from './data';

export interface Allocation {
  id: string;
  size: SizeKey;
  binId: string;
  units: number;
}

export interface Move {
  fromBin: string;
  toBin: string | null;
  skuId: string;
  units: number;
  fill: number; // fill % at destination
  minutes: number;
}

export interface BinView {
  bin: Bin;
  fill: number;
  loadLb: number;
  lines: { skuId: string; units: number }[];
  planned: Allocation[];
  movedFrom?: string; // fertilizer arrives here from
  movedTo?: string; // fertilizer leaves here to
  reserved: boolean; // destination of a move — no planters
}

export type ViewMap = Record<string, BinView>;

const LEVEL_PREF: Record<number, number> = { 2: 0, 3: 1, 1: 2, 4: 3 };

export function gridCap(size: ShipmentSize, bin: Bin) {
  const { w, d, h } = size.box;
  const a = Math.floor(bin.w / w) * Math.floor(bin.d / d);
  const b = Math.floor(bin.w / d) * Math.floor(bin.d / w);
  return Math.max(a, b) * Math.floor(bin.h / h);
}

const vol = (b: Bin) => b.w * b.d * b.h;

// ---------------------------------------------------------------------------
// Fertilizer relocation
export function planRelocation(allocs: Allocation[]): Move[] {
  const taken = new Set(allocs.map((a) => a.binId));
  const isFreeLower = (b: Bin) => b.level !== 4 && (BASE_FILL[b.id] ?? 0) === 0 && !taken.has(b.id);
  const backWall = BINS.filter((b) => b.row === 'F' && isFreeLower(b)).sort(
    (x, y) => y.distFt - x.distFt || x.level - y.level,
  );
  const overflow = BINS.filter((b) => b.row === 'E' && b.bay >= 6 && isFreeLower(b)).sort(
    (x, y) => y.distFt - x.distFt || x.level - y.level,
  );
  const pool = [...backWall, ...overflow];

  // Slowest movers go deepest.
  const sources = FRONT_FERTILIZER.flatMap((f) =>
    f.bins.map(([binId, units, fill]) => ({ binId, units, fill, skuId: f.sku[0], picks: f.sku[4] ?? 0 })),
  ).sort((a, b) => a.picks - b.picks || b.units - a.units);

  const used = new Set<string>();
  const moves: Move[] = [];
  for (const src of sources) {
    const sb = BIN_BY_ID[src.binId];
    const load = src.units * SKU_BY_ID[src.skuId].unitLb;
    const dest = pool.find((b) => {
      if (used.has(b.id)) return false;
      const f = (src.fill * vol(sb)) / vol(b);
      return f <= 100 && load <= b.limitLb;
    });
    if (dest) used.add(dest.id);
    moves.push({
      fromBin: src.binId,
      toBin: dest?.id ?? null,
      skuId: src.skuId,
      units: src.units,
      fill: dest ? Math.round((src.fill * vol(sb)) / vol(dest)) : src.fill,
      minutes: 8 + Math.ceil(src.units / 20),
    });
  }
  return moves;
}

// ---------------------------------------------------------------------------
// Effective bin state
export function buildView(
  allocs: Allocation[],
  relocate: boolean,
  fixedMoves?: Move[],
): { view: ViewMap; moves: Move[] } {
  const view: ViewMap = {};
  for (const b of BINS) {
    view[b.id] = { bin: b, fill: BASE_FILL[b.id] ?? 0, loadLb: 0, lines: [], planned: [], reserved: false };
  }
  for (const s of STOCK) {
    const v = view[s.binId];
    v.lines.push({ skuId: s.skuId, units: s.units });
    v.loadLb += s.units * SKU_BY_ID[s.skuId].unitLb;
  }
  const moves = relocate ? fixedMoves ?? planRelocation(allocs) : [];
  for (const m of moves) {
    if (!m.toBin) continue;
    const src = view[m.fromBin];
    const dst = view[m.toBin];
    dst.lines = [...src.lines];
    dst.loadLb = src.loadLb;
    dst.fill = m.fill;
    dst.movedFrom = m.fromBin;
    dst.reserved = true;
    src.lines = [];
    src.loadLb = 0;
    src.fill = 0;
    src.movedTo = m.toBin;
  }
  for (const a of allocs) applyAlloc(view, a);
  return { view, moves };
}

function applyAlloc(view: ViewMap, a: Allocation) {
  const v = view[a.binId];
  const size = SIZE_BY_KEY[a.size];
  const g = gridCap(size, v.bin);
  v.fill = Math.min(100, v.fill + (g ? (a.units / g) * 100 : 100));
  v.loadLb += a.units * size.unitLb;
  v.planned = [...v.planned, a];
}

export type BlockReason = 'overhead' | 'too-short' | 'reserved' | null;

export interface Capacity {
  units: number;
  byVolume: number;
  byWeight: number;
  grid: number;
  limitedBy: 'space' | 'weight';
  blocked: BlockReason;
}

export function capacity(size: ShipmentSize, v: BinView): Capacity {
  const grid = gridCap(size, v.bin);
  const byVolume = Math.max(0, Math.floor((grid * (100 - v.fill)) / 100 + 1e-6));
  const byWeight = Math.max(0, Math.floor((v.bin.limitLb - v.loadLb) / size.unitLb + 1e-6));
  let blocked: BlockReason = null;
  if (grid === 0) blocked = 'too-short';
  else if (v.bin.level === 4 && size.unitLb > HEAVY_OVERHEAD_LB) blocked = 'overhead';
  else if (v.reserved) blocked = 'reserved';
  const units = blocked ? 0 : Math.min(byVolume, byWeight);
  return { units, byVolume, byWeight, grid, limitedBy: byWeight < byVolume ? 'weight' : 'space', blocked };
}

export function sortBins(a: Bin, b: Bin) {
  return a.distFt - b.distFt || LEVEL_PREF[a.level] - LEVEL_PREF[b.level] || a.id.localeCompare(b.id);
}

// Re-validate a list of allocations against a scenario, trimming anything that no longer fits.
export function reconcile(allocs: Allocation[], relocate: boolean) {
  const accepted: Allocation[] = [];
  let dropped = 0;
  const moves = relocate ? planRelocation(allocs) : [];
  for (const a of allocs) {
    const { view } = buildView(accepted, relocate, moves);
    const cap = capacity(SIZE_BY_KEY[a.size], view[a.binId]);
    const units = Math.min(a.units, cap.units);
    dropped += a.units - units;
    if (units > 0) accepted.push({ ...a, units });
  }
  return { allocs: accepted, dropped };
}

let idSeq = 100;
export const newId = () => `al-${idSeq++}`;

export function placedUnits(allocs: Allocation[], size: SizeKey) {
  return allocs.filter((a) => a.size === size).reduce((s, a) => s + a.units, 0);
}

// Picks-per-cubic-inch ordering (cube-per-order index): denser pickers get the nearest bins.
export const COI_ORDER: SizeKey[] = [...SIZES]
  .sort(
    (a, b) =>
      b.forecastPicks30 / b.units / (b.box.w * b.box.d * b.box.h) -
      a.forecastPicks30 / a.units / (a.box.w * a.box.d * a.box.h),
  )
  .map((s) => s.key);

export function autoPlan(
  start: Allocation[],
  relocate: boolean,
  opts: { sizes?: SizeKey[]; minFreePct?: number } = {},
): Allocation[] {
  const allocs = [...start];
  const order = opts.sizes ?? COI_ORDER;
  const moves = relocate ? planRelocation(start) : [];
  for (const key of order) {
    const size = SIZE_BY_KEY[key];
    let remaining = size.units - placedUnits(allocs, key);
    let guard = 0;
    while (remaining > 0 && guard++ < 60) {
      const { view } = buildView(allocs, relocate, moves);
      const cand = BINS.filter((b) => {
        const v = view[b.id];
        if (opts.minFreePct != null && 100 - v.fill < opts.minFreePct && !v.planned.some((p) => p.size === key)) return false;
        return capacity(size, v).units > 0;
      }).sort(sortBins)[0];
      if (!cand) break;
      const cap = capacity(size, view[cand.id]).units;
      const units = Math.min(cap, remaining);
      const existing = allocs.find((a) => a.binId === cand.id && a.size === key);
      if (existing) {
        const i = allocs.indexOf(existing);
        allocs[i] = { ...existing, units: existing.units + units };
      } else {
        allocs.push({ id: newId(), size: key, binId: cand.id, units });
      }
      remaining -= units;
    }
  }
  return allocs;
}

// ---------------------------------------------------------------------------
// Walking metrics
export const WALK_FT_PER_MIN = 264; // ~3 mph with a tote

export interface SizeWalk {
  key: SizeKey;
  placed: number;
  avgDist: number | null;
  ftPerMonth: number | null;
}

export function planWalk(allocs: Allocation[]): { sizes: SizeWalk[]; total: number; allPlaced: boolean } {
  let total = 0;
  let allPlaced = true;
  const sizes = SIZES.map((s) => {
    const mine = allocs.filter((a) => a.size === s.key);
    const placed = mine.reduce((t, a) => t + a.units, 0);
    if (placed < s.units) allPlaced = false;
    if (!placed) return { key: s.key, placed, avgDist: null, ftPerMonth: null };
    const avgDist = mine.reduce((t, a) => t + a.units * BIN_BY_ID[a.binId].distFt, 0) / placed;
    const ft = s.forecastPicks30 * 2 * avgDist;
    total += ft;
    return { key: s.key, placed, avgDist, ftPerMonth: ft };
  });
  return { sizes, total, allPlaced };
}

export function fertilizerWalkDelta(moves: Move[]) {
  let delta = 0;
  for (const f of FRONT_FERTILIZER) {
    const picks = f.sku[4] ?? 0;
    const total = f.bins.reduce((t, b) => t + b[1], 0);
    let before = 0;
    let after = 0;
    for (const [bin, units] of f.bins) {
      const m = moves.find((x) => x.fromBin === bin);
      before += units * BIN_BY_ID[bin].distFt;
      after += units * BIN_BY_ID[m?.toBin ?? bin].distFt;
    }
    delta += picks * 2 * ((after - before) / total);
  }
  return delta;
}

export interface ScenarioCompare {
  stay: { planter: number; fert: number; total: number; avgByKey: Record<SizeKey, number> };
  move: { planter: number; fert: number; total: number; avgByKey: Record<SizeKey, number>; moves: Move[] };
  moveMinutes: number;
  savedFtPerMonth: number;
  savedMinPerMonth: number;
  paybackDays: number | null;
  freedBins: string[];
  unplacedMoves: number;
}

let cachedCompare: ScenarioCompare | null = null;
export function compareScenarios(): ScenarioCompare {
  if (cachedCompare) return cachedCompare;
  const summarize = (relocate: boolean) => {
    const plan = autoPlan([], relocate, { minFreePct: 50 });
    const w = planWalk(plan);
    const moves = relocate ? planRelocation([]) : [];
    const fert = relocate ? fertilizerWalkDelta(moves) : 0;
    const avgByKey = Object.fromEntries(w.sizes.map((s) => [s.key, s.avgDist ?? 0])) as Record<SizeKey, number>;
    return { planter: w.total, fert, total: w.total + fert, avgByKey, moves };
  };
  const stay = summarize(false);
  const move = summarize(true);
  const moveMinutes = move.moves.reduce((t, m) => t + (m.toBin ? m.minutes : 0), 0);
  const saved = stay.total - move.total;
  const savedMin = saved / WALK_FT_PER_MIN;
  cachedCompare = {
    stay,
    move,
    moveMinutes,
    savedFtPerMonth: saved,
    savedMinPerMonth: savedMin,
    paybackDays: savedMin > 0 ? (moveMinutes / savedMin) * 30 : null,
    freedBins: move.moves.filter((m) => m.toBin).map((m) => m.fromBin),
    unplacedMoves: move.moves.filter((m) => !m.toBin).length,
  };
  return cachedCompare;
}

export const fertilizerBinSet = new Set(FRONT_FERTILIZER_BINS);

// ---------------------------------------------------------------------------
// Putaway list (route order, carton split)
export interface PutawayLine {
  binId: string;
  size: SizeKey;
  units: number;
  cartons: { label: string; units: number; of: number }[];
}

export function putawayList(allocs: Allocation[]): PutawayLine[] {
  const lines: PutawayLine[] = [];
  for (const s of SIZES) {
    const mine = allocs
      .filter((a) => a.size === s.key)
      .sort((a, b) => sortBins(BIN_BY_ID[a.binId], BIN_BY_ID[b.binId]));
    let carton = 1;
    let left = s.perCarton;
    for (const a of mine) {
      let need = a.units;
      const cartons: PutawayLine['cartons'] = [];
      while (need > 0 && carton <= s.cartons) {
        const take = Math.min(need, left);
        cartons.push({ label: `${s.key}-${String(carton).padStart(2, '0')}`, units: take, of: s.perCarton });
        need -= take;
        left -= take;
        if (left === 0) {
          carton++;
          left = s.perCarton;
        }
      }
      lines.push({ binId: a.binId, size: s.key, units: a.units, cartons });
    }
  }
  return lines.sort((a, b) => sortBins(BIN_BY_ID[a.binId], BIN_BY_ID[b.binId]));
}

export const fmtFt = (ft: number) => `${Math.round(ft).toLocaleString()} ft`;
export const fmtMi = (ft: number) => `${(ft / 5280).toFixed(1)} mi`;
export const fmtMin = (min: number) => {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
};
