// Rule logic for the Snow Blowers subcategory: live vs draft, shopper ranking preview,
// product impact, approval threshold, and form validation.

import { PRODUCTS, attributeValue } from '../data/products';
import {
  NOW_DATETIME,
  TODAY,
  dateRange,
  formatDateTime,
  isValidDate,
  shortDate,
  weekdayDate,
} from './time';
import {
  REGIONS,
  type AttributeId,
  type BrandBoost,
  type OosRule,
  type Product,
  type Region,
  type RuleSet,
  type ScheduleState,
  type SortId,
} from './types';

/** Changes touching more than this many products need approval from the approver. */
export const APPROVAL_THRESHOLD = 500;
export const APPROVER = { name: 'Lisa Cheng', title: 'Director of Seasonal' };
export const CATEGORY_PATH = ['Outdoor Power Equipment', 'Snow Blowers'];

export const SORT_OPTIONS: { id: SortId; label: string; help: string }[] = [
  {
    id: 'best-selling',
    label: 'Best selling',
    help: 'Ranks by units sold in the last 30 days.',
  },
  {
    id: 'in-stock-near-you',
    label: 'In stock near you first',
    help: 'Items in stock in the shopper’s region rank first. Out-of-stock items fall below them.',
  },
  { id: 'top-rated', label: 'Top rated', help: 'Highest average rating, then most reviews.' },
  { id: 'price-asc', label: 'Price: low to high', help: 'Lowest shelf price first.' },
  { id: 'price-desc', label: 'Price: high to low', help: 'Highest shelf price first.' },
];

export const OOS_OPTIONS: { id: OosRule['mode']; label: string; help: string }[] = [
  {
    id: 'notice',
    label: 'Show with out-of-stock notice',
    help: 'Items stay in their sorted position and carry an “Out of stock” label.',
  },
  {
    id: 'end',
    label: 'Push to end of results',
    help: 'Out-of-stock items rank below every in-stock item.',
  },
  {
    id: 'hide',
    label: 'Hide from results',
    help: 'Out-of-stock items are removed from listings everywhere.',
  },
  {
    id: 'hide-below',
    label: 'Hide only where regional availability is low',
    help: 'Out-of-stock items are hidden in regions under the threshold. Elsewhere they show with the notice.',
  },
];

export const ATTRIBUTE_LABELS: Record<AttributeId, string> = {
  'clearing-width': 'Clearing width',
  stage: 'Stage',
  'power-source': 'Power source',
  'start-type': 'Start type',
  brand: 'Brand',
  price: 'Price',
  rating: 'Customer rating',
  'drive-type': 'Drive type',
  'chute-control': 'Chute control',
  'battery-platform': 'Battery platform',
  'engine-displacement': 'Engine displacement',
  warranty: 'Warranty length',
  headlights: 'Headlights',
};

/** Attributes the catalog supports but the category does not currently show to shoppers. */
export const AVAILABLE_ATTRIBUTES: AttributeId[] = [
  'battery-platform',
  'engine-displacement',
  'warranty',
  'headlights',
];

export const LIVE_RULES: RuleSet = {
  sort: 'best-selling',
  boosts: [
    { id: 'live-boost-ironridge', brand: 'Ironridge', start: '2026-10-15', end: '2026-11-01' },
    { id: 'live-boost-redfield', brand: 'Redfield Outdoor', start: '2026-10-15', end: '2026-11-01' },
  ],
  attributes: [
    'clearing-width',
    'stage',
    'power-source',
    'start-type',
    'brand',
    'price',
    'rating',
    'drive-type',
    'chute-control',
  ],
  oos: { mode: 'notice', threshold: 10 },
};

/** Kevin's in-progress change set, as it stands on the working day. */
export const DRAFT_RULES: RuleSet = {
  sort: 'in-stock-near-you',
  boosts: [
    ...LIVE_RULES.boosts,
    { id: 'draft-boost-voltaris', brand: 'Voltaris', start: '2026-11-27', end: '2026-12-18' },
    { id: 'draft-boost-northpeak', brand: 'Northpeak', start: '2026-11-27', end: '2026-12-18' },
  ],
  attributes: [
    'clearing-width',
    'stage',
    'power-source',
    'battery-platform',
    'start-type',
    'brand',
    'price',
    'rating',
    'drive-type',
    'chute-control',
  ],
  oos: { mode: 'hide-below', threshold: 10 },
};

export const DEFAULT_SCHEDULE: ScheduleState = {
  mode: 'later',
  goLive: '2026-11-25T06:00',
  revertOn: '',
};

// ---------------------------------------------------------------------------
// Availability and visibility
// ---------------------------------------------------------------------------

export function regionAvailability(products: readonly Product[] = PRODUCTS): Record<Region, number> {
  const out = {} as Record<Region, number>;
  for (const region of REGIONS) {
    const inStock = products.filter((p) => p.inStock[region]).length;
    out[region] = inStock / products.length;
  }
  return out;
}

export const AVAILABILITY = regionAvailability();

export function nationalAvailability(products: readonly Product[] = PRODUCTS): number {
  return products.filter((p) => REGIONS.some((r) => p.inStock[r])).length / products.length;
}

/** Whether a product is hidden from shoppers in a region under a given out-of-stock rule. */
export function isHidden(p: Product, region: Region, oos: OosRule): boolean {
  if (p.inStock[region]) return false;
  if (oos.mode === 'hide') return true;
  if (oos.mode === 'hide-below') return AVAILABILITY[region] * 100 < oos.threshold;
  return false;
}

export function boostActiveOn(b: BrandBoost, date: string): boolean {
  return b.start <= date && date <= b.end;
}

/** Boosts that still matter: not yet ended as of today. */
export function configuredBoosts(rules: RuleSet, today = TODAY): BrandBoost[] {
  return rules.boosts.filter((b) => b.end >= today);
}

export function expiredBoosts(rules: RuleSet, today = TODAY): BrandBoost[] {
  return rules.boosts.filter((b) => b.end < today);
}

export function boostStatus(b: BrandBoost, today = TODAY): 'expired' | 'active' | 'scheduled' {
  if (b.end < today) return 'expired';
  if (b.start <= today) return 'active';
  return 'scheduled';
}

function compareBySort(sort: SortId, a: Product, b: Product): number {
  switch (sort) {
    case 'best-selling':
    case 'in-stock-near-you':
      return b.unitsSold30d - a.unitsSold30d;
    case 'top-rated':
      return b.rating - a.rating || b.reviews - a.reviews;
    case 'price-asc':
      return a.price - b.price;
    case 'price-desc':
      return b.price - a.price;
  }
}

export interface ShopperRow {
  product: Product;
  inStock: boolean;
  boosted: boolean;
}

/**
 * Approximates what a shopper in `region` sees on `asOf`.
 * Order: stock tier (only when sorting by stock or pushing out-of-stock to the end),
 * then active brand boosts, then the chosen sort, then item number as a stable tiebreak.
 * This is a review preview, not the live ranking engine.
 */
export function shopperListing(
  rules: RuleSet,
  region: Region,
  asOf: string,
  products: readonly Product[] = PRODUCTS,
): ShopperRow[] {
  const boosted = new Set(rules.boosts.filter((b) => boostActiveOn(b, asOf)).map((b) => b.brand));
  const stockFirst = rules.sort === 'in-stock-near-you' || rules.oos.mode === 'end';
  const rows: ShopperRow[] = products
    .filter((p) => !isHidden(p, region, rules.oos))
    .map((p) => ({ product: p, inStock: p.inStock[region], boosted: boosted.has(p.brand) }));

  rows.sort((a, b) => {
    if (stockFirst && a.inStock !== b.inStock) return a.inStock ? -1 : 1;
    if (a.boosted !== b.boosted) return a.boosted ? -1 : 1;
    const bySort = compareBySort(rules.sort, a.product, b.product);
    if (bySort !== 0) return bySort;
    return a.product.item.localeCompare(b.product.item);
  });
  return rows;
}

export function visibleCount(rules: RuleSet, region: Region, products: readonly Product[] = PRODUCTS): number {
  return products.filter((p) => !isHidden(p, region, rules.oos)).length;
}

// ---------------------------------------------------------------------------
// Diff, impact, and approval
// ---------------------------------------------------------------------------

export type SettingKey = 'sort' | 'boosts' | 'attributes' | 'oos';

export interface SettingChange {
  key: SettingKey;
  label: string;
  liveText: string;
  draftText: string;
  changed: boolean;
  /** Item numbers of products whose placement, visibility, or filter eligibility changes. */
  affected: Set<string>;
}

function boostKey(boosts: BrandBoost[], brand: string): string {
  return boosts
    .filter((b) => b.brand === brand)
    .map((b) => `${b.start}..${b.end}`)
    .sort()
    .join('|');
}

function oosText(oos: OosRule): string {
  const opt = OOS_OPTIONS.find((o) => o.id === oos.mode);
  if (oos.mode === 'hide-below') return `Hide where availability is under ${oos.threshold}%`;
  return opt?.label ?? oos.mode;
}

export function diffRules(
  live: RuleSet,
  draft: RuleSet,
  products: readonly Product[] = PRODUCTS,
): SettingChange[] {
  const allItems = new Set(products.map((p) => p.item));
  const sortLabel = (s: SortId) => SORT_OPTIONS.find((o) => o.id === s)?.label ?? s;

  // Default sort
  const sortChanged = live.sort !== draft.sort;

  // Brand boosts: compare configured (not yet ended) boosts, per brand.
  const liveCfg = configuredBoosts(live);
  const draftCfg = configuredBoosts(draft);
  const brands = [...new Set([...liveCfg, ...draftCfg].map((b) => b.brand))];
  const boostBrands = new Set(brands.filter((b) => boostKey(liveCfg, b) !== boostKey(draftCfg, b)));
  const boostAffected = new Set(products.filter((p) => boostBrands.has(p.brand)).map((p) => p.item));
  const expired = expiredBoosts(live);
  const liveBoostText =
    liveCfg.length === 0
      ? expired.length
        ? `None active · ${expired.length} expired ${shortDate(expired[expired.length - 1].end)}`
        : 'None active'
      : liveCfg.map((b) => `${b.brand} (${dateRange(b.start, b.end)})`).join('; ');
  const draftBoostText =
    draftCfg.length === 0
      ? 'None active'
      : draftCfg.map((b) => `${b.brand} (${dateRange(b.start, b.end)})`).join('; ');

  // Shopper filters: membership and order.
  const liveSet = new Set(live.attributes);
  const draftSet = new Set(draft.attributes);
  const addedAttrs = draft.attributes.filter((a) => !liveSet.has(a));
  const removedAttrs = live.attributes.filter((a) => !draftSet.has(a));
  const orderChanged =
    live.attributes.filter((a) => draftSet.has(a)).join() !==
    draft.attributes.filter((a) => liveSet.has(a)).join();
  const attrsChanged = addedAttrs.length + removedAttrs.length > 0 || orderChanged;
  const attrChangedIds = new Set(
    products
      .filter((p) =>
        [...addedAttrs, ...removedAttrs].some((a) => attributeValue(p, a) !== null),
      )
      .map((p) => p.item),
  );
  const attrDraftText = [
    `${draft.attributes.length} shown`,
    addedAttrs.length ? `+ ${addedAttrs.map((a) => ATTRIBUTE_LABELS[a]).join(', ')}` : '',
    orderChanged && addedAttrs.length === 0 ? 'reordered' : '',
  ]
    .filter(Boolean)
    .join(' · ');

  // Out-of-stock: products hidden in any region under one rule but not the other.
  const oosChanged =
    live.oos.mode !== draft.oos.mode ||
    (draft.oos.mode === 'hide-below' && live.oos.threshold !== draft.oos.threshold);
  const oosAffected = new Set(
    products
      .filter((p) => REGIONS.some((r) => isHidden(p, r, live.oos) !== isHidden(p, r, draft.oos)))
      .map((p) => p.item),
  );

  return [
    {
      key: 'sort',
      label: 'Default sort',
      liveText: sortLabel(live.sort),
      draftText: sortLabel(draft.sort),
      changed: sortChanged,
      affected: sortChanged ? allItems : new Set(),
    },
    {
      key: 'boosts',
      label: 'Brand boosts',
      liveText: liveBoostText,
      draftText: draftBoostText,
      changed: boostBrands.size > 0,
      affected: boostAffected,
    },
    {
      key: 'attributes',
      label: 'Shopper filters',
      liveText: `${live.attributes.length} shown`,
      draftText: attrDraftText,
      changed: attrsChanged,
      affected: attrChangedIds,
    },
    {
      key: 'oos',
      label: 'Out-of-stock items',
      liveText: oosText(live.oos),
      draftText: oosText(draft.oos),
      changed: oosChanged,
      affected: oosAffected,
    },
  ];
}

export interface Impact {
  changedSettings: number;
  productsAffected: number;
  needsApproval: boolean;
}

export function computeImpact(changes: SettingChange[]): Impact {
  const union = new Set<string>();
  for (const c of changes) if (c.changed) c.affected.forEach((id) => union.add(id));
  const productsAffected = union.size;
  return {
    changedSettings: changes.filter((c) => c.changed).length,
    productsAffected,
    needsApproval: productsAffected > APPROVAL_THRESHOLD,
  };
}

export interface RegionRow {
  region: Region;
  availability: number;
  visibleLive: number;
  visibleDraft: number;
  hiddenDraft: number;
}

export function regionRows(live: RuleSet, draft: RuleSet, products: readonly Product[] = PRODUCTS): RegionRow[] {
  return REGIONS.map((region) => {
    const visibleLive = visibleCount(live, region, products);
    const visibleDraft = visibleCount(draft, region, products);
    return {
      region,
      availability: AVAILABILITY[region],
      visibleLive,
      visibleDraft,
      hiddenDraft: products.length - visibleDraft,
    };
  });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateBoost(
  form: { brand: string; start: string; end: string },
  existing: BrandBoost[],
): string | null {
  if (!form.brand) return 'Choose a brand to boost.';
  if (!isValidDate(form.start) || !isValidDate(form.end)) return 'Enter a start and end date.';
  if (form.end < form.start) return 'The end date must be on or after the start date.';
  if (form.end < TODAY) return 'That window has already ended.';
  const clash = existing.find(
    (b) => b.brand === form.brand && b.end >= TODAY && b.start <= form.end && form.start <= b.end,
  );
  if (clash) {
    return `${form.brand} already has a boost for ${dateRange(clash.start, clash.end)} that overlaps these dates.`;
  }
  return null;
}

export interface ScheduleCheck {
  errors: string[];
  warnings: string[];
  goLive: string;
}

export function checkSchedule(schedule: ScheduleState, rules: RuleSet): ScheduleCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const goLive = schedule.mode === 'now' ? NOW_DATETIME : schedule.goLive;
  let goLiveValid = true;

  if (schedule.mode === 'later') {
    const [date, time] = goLive.split('T');
    if (!date || !isValidDate(date) || !time || !/^\d{2}:\d{2}$/.test(time)) {
      errors.push('Choose a go-live date and time.');
      goLiveValid = false;
    } else if (goLive <= NOW_DATETIME) {
      errors.push(`Go-live must be later than ${formatDateTime(NOW_DATETIME)}.`);
      goLiveValid = false;
    }
  }

  const goLiveDate = goLive.slice(0, 10);
  if (schedule.revertOn) {
    if (!isValidDate(schedule.revertOn)) errors.push('Revert date is not a valid date.');
    else if (goLiveValid && schedule.revertOn <= goLiveDate) {
      errors.push('The revert date must fall after go-live.');
    }
  }

  const laterBoosts = configuredBoosts(rules).filter((b) => b.start > TODAY);
  if (laterBoosts.length && goLiveValid) {
    const earliest = laterBoosts.reduce((a, b) => (b.start < a.start ? b : a));
    if (goLive > `${earliest.start}T00:00`) {
      warnings.push(
        `${earliest.brand} boost starts ${weekdayDate(earliest.start)} at 12:00 AM. This goes live after that, so shoppers miss part of the window.`,
      );
    }
  }

  return { errors, warnings, goLive };
}

/** Warn when the sort and out-of-stock rules overlap in a way that makes one redundant. */
export function ruleWarnings(rules: RuleSet): string[] {
  const out: string[] = [];
  if (rules.sort === 'in-stock-near-you' && rules.oos.mode === 'end') {
    out.push(
      'In stock near you first already ranks out-of-stock items last, so “Push to end of results” adds nothing with this sort.',
    );
  }
  return out;
}
