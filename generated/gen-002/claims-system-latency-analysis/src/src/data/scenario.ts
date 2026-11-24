// Scenario definition for the mock trace set: calendar, endpoints, connectors, change log,
// and the tunable parameters of the load model. Everything the UI shows about the system
// comes from here plus the generator in generate.ts.

/** Sat 14 Nov 2026 00:00. All times in the app are local wall-clock; arithmetic is done in UTC. */
export const T0 = Date.UTC(2026, 10, 14, 0, 0, 0);
export const MINUTES = 72 * 60; // 4,320 minutes: Sat 00:00 through Mon 23:59
export const MIN_MS = 60_000;

/** Same Monday one year earlier: Mon 17 Nov 2025. */
export const YEAR_AGO_T0 = Date.UTC(2025, 10, 17, 0, 0, 0);

export const BUCKET_EDGES_MS = [
  0, 100, 200, 300, 500, 700, 1000, 1500, 2000, 3000, 5000, 8000, 12000, 20000, 30000, 31500, 40000,
];
export const NUM_BUCKETS = BUCKET_EDGES_MS.length - 1; // 16; bucket 14 is the 30.0–31.5 s gateway timeout band
export const TIMEOUT_BUCKET = 14;

export const GATEWAY_TIMEOUT_MS = 30_000;

export interface EndpointDef {
  id: string;
  label: string;
  method: 'GET' | 'POST';
  path: string;
  /** share of total traffic in normal (non-surge) conditions */
  share: number;
  /** multiplier on traffic during the Monday surge: volume = normal × (1 + surge × S(t)) */
  surge: number;
  /** mainframe transactions per request before and after the identity-verify v4.12 deploy */
  mfPre: number;
  mfPost: number;
  /** non-mainframe latency budget, median ms */
  baseMs: number;
  /** service chain used for trace waterfalls */
  chainPre: string;
  chainPost: string;
}

export const ENDPOINTS: EndpointDef[] = [
  {
    id: 'claims',
    label: 'Initial claim filing',
    method: 'POST',
    path: '/api/claims/initial',
    share: 0.1,
    surge: 3,
    mfPre: 2,
    mfPost: 2,
    baseMs: 350,
    chainPre: 'claims',
    chainPost: 'claims',
  },
  {
    id: 'cert',
    label: 'Weekly certification',
    method: 'POST',
    path: '/api/certifications/weekly',
    share: 0.36,
    surge: 0.9,
    mfPre: 2,
    mfPost: 4,
    baseMs: 450,
    chainPre: 'cert_pre',
    chainPost: 'cert_post',
  },
  {
    id: 'idv',
    label: 'Identity verification',
    method: 'POST',
    path: '/api/identity/verify',
    share: 0.2,
    surge: 1,
    mfPre: 0,
    mfPost: 2,
    baseMs: 240,
    chainPre: 'idv_pre',
    chainPost: 'idv_post',
  },
  {
    id: 'wages',
    label: 'Wage lookup',
    method: 'GET',
    path: '/api/wages/lookup',
    share: 0.14,
    surge: 0.8,
    mfPre: 1,
    mfPost: 1,
    baseMs: 120,
    chainPre: 'wages',
    chainPost: 'wages',
  },
  {
    id: 'payments',
    label: 'Payment schedule',
    method: 'GET',
    path: '/api/payments/schedule',
    share: 0.12,
    surge: 0.1,
    mfPre: 1,
    mfPost: 1,
    baseMs: 180,
    chainPre: 'payments',
    chainPost: 'payments',
  },
  {
    id: 'docs',
    label: 'Document upload',
    method: 'POST',
    path: '/api/documents',
    share: 0.08,
    surge: 0.6,
    mfPre: 0,
    mfPost: 0,
    baseMs: 400,
    chainPre: 'docs',
    chainPost: 'docs',
  },
];

export const ENDPOINT_INDEX: Record<string, number> = Object.fromEntries(
  ENDPOINTS.map((e, i) => [e.id, i]),
);

export const CONNECTORS = ['mf-conn-a', 'mf-conn-b', 'mf-conn-c'] as const;
export type ConnectorId = (typeof CONNECTORS)[number];
/** route index: 0..2 connectors, 3 = no mainframe hop */
export const ROUTE_NONE = 3;
export const ROUTE_LABEL = [...CONNECTORS, 'no mainframe hop'];

/** share of mainframe-bound requests routed to each instance */
export const ROUTE_SHARE = [0.33, 0.34, 0.33];

/** Change log and calendar events, as minute offsets from T0. */
export const MIN_OF = (dayIndex: number, hh: number, mm: number) => dayIndex * 1440 + hh * 60 + mm;

export const M_IDV_DEPLOY = MIN_OF(1, 23, 5); // Sun 15 Nov 23:05
export const M_ANNOUNCE = MIN_OF(2, 7, 35); // Mon 16 Nov, approx. (surge onset)
export const M_BATCH_START = MIN_OF(2, 6, 0);
export const M_BATCH_END = MIN_OF(2, 8, 30);
export const M_HOTFIX = MIN_OF(2, 9, 20);
export const M_POOL_CHANGE = MIN_OF(2, 10, 38);
export const M_WINDOW_START = MIN_OF(2, 8, 10);
export const M_WINDOW_END = MIN_OF(2, 10, 45); // exclusive
export const POOL_BEFORE = 40;
export const POOL_AFTER = 80;

export interface ChangeEvent {
  id: string;
  kind: 'deploy' | 'config' | 'batch' | 'external';
  title: string;
  detail: string;
  at: number;
  /** end minute for spans (batch window) */
  end?: number;
  owner: string;
}

export const CHANGE_LOG: ChangeEvent[] = [
  {
    id: 'idv-4.12',
    kind: 'deploy',
    title: 'identity-verify v4.12',
    detail: 'Deployed Sun 15 Nov 23:05. Identity match now calls wage-lookup for income verification.',
    at: M_IDV_DEPLOY,
    owner: 'Identity team',
  },
  {
    id: 'batch',
    kind: 'batch',
    title: 'Mainframe batch window',
    detail: 'Scheduled nightly batch ran 06:00–08:30 on the mainframe; batch sessions are pinned to mf-conn-b.',
    at: M_BATCH_START,
    end: M_BATCH_END,
    owner: 'Mainframe operations',
  },
  {
    id: 'announce',
    kind: 'external',
    title: 'Plant closure announced',
    detail: 'Employer announcement reached the public. Claim filings began climbing from about 07:35.',
    at: M_ANNOUNCE,
    owner: 'Communications',
  },
  {
    id: 'cw-hotfix',
    kind: 'deploy',
    title: 'claims-web hotfix',
    detail: 'Client error panel now shows a Try again button after 30 s instead of waiting for the 60 s spinner timeout.',
    at: M_HOTFIX,
    owner: 'Claims web team',
  },
  {
    id: 'pool-80',
    kind: 'config',
    title: 'mf-conn pool 40 → 80',
    detail: 'Per-instance connection pool limit raised from 40 to 80 on all three connector instances.',
    at: M_POOL_CHANGE,
    owner: 'Mainframe integration',
  },
];

/**
 * Load-model tunables. These shape the mock data only. They were chosen so the generated
 * dataset reproduces the headline numbers in the brief; see check.ts.
 */
export const TUNE = {
  seed: 20261116,
  /** mainframe hold per transaction, unloaded (ms) */
  holdBaseMs: 300,
  /** contention: hold = base × (1 + C × (rate / REF)^P) */
  contentionC: 1.5,
  contentionP: 1.6,
  contentionRefPerSec: 6,
  /** extra hold on mf-conn-b (older driver build), and during the batch window */
  connHoldFactor: [1.0, 1.4, 1.0],
  batchHoldFactor: [1.0, 1.2, 1.0],
  /** per-call failure probability: floor + κ × excess utilisation */
  failFloor: 0.0002,
  failKappa: 0.07,
  /** per-instance multiplier on failure probability at equal utilisation (mf-conn-b hosts the batch sessions) */
  failBias: [1.0, 1.1, 1.0],
  failCap: 0.8,
  /** queue wait added per unit of excess utilisation (ms) */
  queueMsPerExcess: 4000,
  queueCapMs: 20000,
  /** non-mainframe route failure probability */
  failNoMf: 0.0002,
  /** user retry probability after a failed request, before and after the claims-web hotfix */
  retryPre: 0.15,
  retryAfterHotfix: 0.45,
  /** share of gateway failures that are 504 timeouts; the rest are 502 upstream resets */
  share504: 0.94,
  /** sampling: keep one successful trace per N requests for waterfalls */
  sampleEvery: 400,
  totalRequests: 1_200_000,
  totalFailures: 14_600,
};
