import { CUTOFF_AT, CVE_ID, matchesCve } from './cve';
import { hex, mulberry32, pick, randInt, type Rng } from '../lib/rng';
import { NOW_MS } from '../lib/time';
import type { Env, Finding, HistoryLine, RepoMeta, ScanCounts, Severity, Tag } from './types';

/*
 * Mock registry for the Cratehold console. Deterministic: same output on every load.
 *
 * Totals: 38 repositories, 1,240 tags. Nine repositories carry the 17 hand-written
 * debian:12 tags pushed before Nov 14. Bulk tags are generated so that none of them
 * can match the CVE rule: pre-cutoff bulk tags only use non-Debian-12 bases, and
 * debian:12 bulk tags only appear after the cutoff, when the base is already patched.
 */

const CUTOFF_MS = Date.parse(CUTOFF_AT);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const CI_BOT = 'CI bot';
const HUMANS = ['Noor Haddad', 'Sam Whitfield'] as const;

const digestOf = (r: Rng) => `sha256:${hex(r, 64)}`;

/** Base image digests: `before` is what pre-cutoff builds pulled, `current` is today's. */
export const BASE_DIGESTS: Record<string, { before: string; current: string }> = {
  'debian:12-slim': { before: digestOf(mulberry32(7001)), current: digestOf(mulberry32(7002)) },
  'node:20-bookworm': { before: digestOf(mulberry32(7003)), current: digestOf(mulberry32(7004)) },
};

export function currentBaseDigest(base: string): string | undefined {
  return BASE_DIGESTS[base]?.current;
}

function weighted<T>(r: Rng, items: ReadonlyArray<readonly [T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x < 0) return v;
  }
  return items[items.length - 1][0];
}

// Bases for bulk tags built before the cutoff. Deliberately no debian:12 here.
const PRE_BASES: ReadonlyArray<readonly [string, number]> = [
  ['debian:11-slim', 3],
  ['alpine:3.19', 3],
  ['alpine:3.18', 1],
  ['node:20-alpine', 3],
  ['node:18-alpine', 1],
  ['python:3.11-slim-bullseye', 1],
  ['ubuntu:22.04', 1],
  ['gcr.io/distroless/static-debian11', 1],
];

// Bases for bulk tags built after the cutoff. Debian 12 is fine here because it is patched.
const POST_BASES: ReadonlyArray<readonly [string, number]> = [
  ['debian:12-slim', 5],
  ['alpine:3.20', 2],
  ['node:20-alpine', 2],
  ['python:3.12-slim-bookworm', 1],
];

const COMMIT_MESSAGES = [
  'Bump dependencies',
  'Fix reminder timezone offset for clinics in Arizona',
  'Retry SMS callbacks on 429 responses',
  'Tighten CORS allowlist for clinic subdomains',
  'Merge release branch',
  'Add appointment type filter to search API',
  'Update base image',
  'Log slow queries above 800 ms',
  'Handle empty practitioner calendars',
  'Rotate webhook signing key',
  'Fix PDF margins on estimates',
  'Remove deprecated v1 routes',
  'Pin Node to 20 LTS',
  'Speed up directory search index',
];

const VULN_POOL: ReadonlyArray<{ pkg: string; ver: string; titles: string[] }> = [
  { pkg: 'libc6', ver: '2.36-9+deb12u', titles: ['Out-of-bounds write in locale name handling', 'Integer overflow in regex compilation'] },
  { pkg: 'zlib1g', ver: '1:1.2.13.dfsg-1+deb12u', titles: ['Heap buffer overflow when inflating crafted input'] },
  { pkg: 'libxml2', ver: '2.9.14+dfsg-1.3~deb12u', titles: ['Use after free during XPath evaluation'] },
  { pkg: 'curl', ver: '7.88.1-10+deb12u', titles: ['Cookie injection via crafted Set-Cookie header', 'Certificate name check skipped on redirect'] },
  { pkg: 'libexpat1', ver: '2.5.0-1+deb12u', titles: ['Quadratic entity expansion causes denial of service'] },
  { pkg: 'tar', ver: '1.34+dfsg-1.2+deb12u', titles: ['Path traversal when extracting symlinked archives'] },
  { pkg: 'openssh-client', ver: '1:9.2p1-2+deb12u', titles: ['Race condition in agent forwarding'] },
  { pkg: 'libsqlite3-0', ver: '3.40.1-2+deb12u', titles: ['Crash on malformed virtual table query'] },
  { pkg: 'libpng16-16', ver: '1.6.39-2+deb12u', titles: ['Out-of-bounds read in palette chunk handling'] },
  { pkg: 'perl-base', ver: '5.36.0-7+deb12u', titles: ['Buffer overflow in locale-aware string conversion'] },
  { pkg: 'libnghttp2-14', ver: '1.52.0-1+deb12u', titles: ['Excessive memory use from SETTINGS frame flood'] },
  { pkg: 'busybox', ver: '1:1.36.1-6+b', titles: ['Heap overflow in unlzma decoder'] },
];

interface Explicit {
  repo: string;
  name: string;
  base: string;
  pushedAt: string;
  pushedBy: string;
  env: Env;
  lastPulledAt: string | null;
  pulls30d: number;
  sizeMB: number;
  scan: ScanCounts;
  branch: string;
  message: string;
}

/* Hand-written tags. The first 17 entries are the advisory's affected set. */
const EXPLICIT: Explicit[] = [
  // api-gateway: the internet-facing edge and the most-pulled production image
  { repo: 'api-gateway', name: '3.4.0', base: 'debian:12-slim', pushedAt: '2026-11-11T16:40:00-08:00', pushedBy: 'Noor Haddad', env: 'prod', lastPulledAt: '2026-11-16T08:58:00-08:00', pulls30d: 386, sizeMB: 412, scan: { critical: 2, high: 9, medium: 14, low: 21 }, branch: 'release/3.4', message: 'Release 3.4.0: per-clinic rate limits and webhook retry backoff' },
  { repo: 'api-gateway', name: '3.4.0-rc.2', base: 'debian:12-slim', pushedAt: '2026-11-07T11:05:00-08:00', pushedBy: 'Noor Haddad', env: 'staging', lastPulledAt: '2026-11-13T15:22:00-08:00', pulls30d: 58, sizeMB: 409, scan: { critical: 1, high: 9, medium: 14, low: 20 }, branch: 'release/3.4', message: 'Cut 3.4.0-rc.2 with tenant header fix' },
  { repo: 'api-gateway', name: '3.3.2', base: 'debian:12-slim', pushedAt: '2026-10-28T09:22:00-08:00', pushedBy: CI_BOT, env: 'none', lastPulledAt: '2026-11-02T10:17:00-08:00', pulls30d: 4, sizeMB: 401, scan: { critical: 2, high: 8, medium: 13, low: 19 }, branch: 'release/3.3', message: 'Fix JWT clock skew on token refresh' },
  { repo: 'api-gateway', name: 'main-7c2e91a', base: 'debian:12-slim', pushedAt: '2026-11-16T06:12:00-08:00', pushedBy: CI_BOT, env: 'none', lastPulledAt: null, pulls30d: 0, sizeMB: 414, scan: { critical: 0, high: 4, medium: 12, low: 18 }, branch: 'main', message: 'Add clinic timezone to booking webhook payload' },
  { repo: 'appointment-worker', name: '2.8.1', base: 'debian:12-slim', pushedAt: '2026-11-10T13:48:00-08:00', pushedBy: 'Sam Whitfield', env: 'prod', lastPulledAt: '2026-11-16T08:41:00-08:00', pulls30d: 642, sizeMB: 388, scan: { critical: 1, high: 6, medium: 10, low: 12 }, branch: 'release/2.8', message: 'Retry calendar slot writes on 409 conflict' },
  { repo: 'appointment-worker', name: '2.7.4', base: 'debian:12-slim', pushedAt: '2026-10-02T10:15:00-08:00', pushedBy: CI_BOT, env: 'none', lastPulledAt: '2026-11-12T19:03:00-08:00', pulls30d: 9, sizeMB: 380, scan: { critical: 1, high: 6, medium: 9, low: 12 }, branch: 'release/2.7', message: 'Bump queue client to 5.4' },
  { repo: 'sms-reminders', name: '1.9.3', base: 'debian:12-slim', pushedAt: '2026-11-09T09:30:00-08:00', pushedBy: CI_BOT, env: 'prod', lastPulledAt: '2026-11-16T08:52:00-08:00', pulls30d: 210, sizeMB: 296, scan: { critical: 1, high: 5, medium: 8, low: 11 }, branch: 'main', message: 'Handle carrier 429 with jittered backoff' },
  { repo: 'sms-reminders', name: '1.9.0', base: 'debian:12-slim', pushedAt: '2026-09-30T14:02:00-08:00', pushedBy: CI_BOT, env: 'none', lastPulledAt: '2026-10-14T11:40:00-08:00', pulls30d: 0, sizeMB: 292, scan: { critical: 1, high: 5, medium: 8, low: 10 }, branch: 'main', message: 'Add quiet hours per clinic' },
  { repo: 'pdf-invoices', name: '4.1.0', base: 'debian:12-slim', pushedAt: '2026-11-12T15:02:00-08:00', pushedBy: 'Noor Haddad', env: 'prod', lastPulledAt: '2026-11-16T07:20:00-08:00', pulls30d: 164, sizeMB: 1184, scan: { critical: 1, high: 7, medium: 16, low: 24 }, branch: 'main', message: 'Render estimate totals with tax breakdown' },
  { repo: 'pdf-invoices', name: '4.0.2', base: 'debian:12-slim', pushedAt: '2026-08-19T10:44:00-08:00', pushedBy: CI_BOT, env: 'none', lastPulledAt: '2026-09-03T16:08:00-08:00', pulls30d: 0, sizeMB: 1171, scan: { critical: 1, high: 7, medium: 15, low: 23 }, branch: 'release/4.0', message: 'Patch: fix font fallback on Linux' },
  { repo: 'clinic-web', name: '2.19.0', base: 'debian:12-slim', pushedAt: '2026-11-13T18:20:00-08:00', pushedBy: 'Sam Whitfield', env: 'staging', lastPulledAt: '2026-11-15T16:44:00-08:00', pulls30d: 37, sizeMB: 221, scan: { critical: 1, high: 3, medium: 7, low: 9 }, branch: 'main', message: 'Show practitioner availability by room' },
  { repo: 'clinic-web', name: '2.18.4', base: 'debian:12-slim', pushedAt: '2026-10-21T08:55:00-08:00', pushedBy: CI_BOT, env: 'none', lastPulledAt: '2026-10-27T13:30:00-08:00', pulls30d: 0, sizeMB: 219, scan: { critical: 1, high: 3, medium: 7, low: 9 }, branch: 'release/2.18', message: 'Hotfix: timezone label on booking confirmation' },
  { repo: 'scheduler-ui', name: '5.2.0', base: 'debian:12-slim', pushedAt: '2026-11-04T12:10:00-08:00', pushedBy: 'Sam Whitfield', env: 'staging', lastPulledAt: '2026-11-13T09:31:00-08:00', pulls30d: 22, sizeMB: 180, scan: { critical: 1, high: 2, medium: 6, low: 8 }, branch: 'main', message: 'Drag to reschedule across practitioners' },
  { repo: 'scheduler-ui', name: '5.1.7', base: 'debian:12-slim', pushedAt: '2026-09-19T17:26:00-08:00', pushedBy: CI_BOT, env: 'none', lastPulledAt: '2026-10-08T12:02:00-08:00', pulls30d: 0, sizeMB: 178, scan: { critical: 1, high: 2, medium: 6, low: 8 }, branch: 'release/5.1', message: 'Keyboard navigation for day view' },
  { repo: 'ops-backup-runner', name: 'main-3e1b7c0', base: 'debian:12-slim', pushedAt: '2026-11-03T02:14:00-08:00', pushedBy: CI_BOT, env: 'none', lastPulledAt: null, pulls30d: 0, sizeMB: 612, scan: { critical: 1, high: 4, medium: 11, low: 15 }, branch: 'main', message: 'Switch nightly dump to custom format' },
  { repo: 'data-export-job', name: '2026.10.30', base: 'debian:12-slim', pushedAt: '2026-10-30T22:41:00-08:00', pushedBy: CI_BOT, env: 'none', lastPulledAt: '2026-11-01T03:00:00-08:00', pulls30d: 3, sizeMB: 544, scan: { critical: 1, high: 5, medium: 12, low: 16 }, branch: 'main', message: 'Add CSV export for invoices' },
  { repo: 'data-export-job', name: '2026.10.09', base: 'debian:12-slim', pushedAt: '2026-10-09T22:37:00-08:00', pushedBy: CI_BOT, env: 'none', lastPulledAt: '2026-10-10T03:00:00-08:00', pulls30d: 0, sizeMB: 541, scan: { critical: 1, high: 5, medium: 12, low: 16 }, branch: 'main', message: 'Stream large exports to S3' },
  { repo: 'legacy-php-portal', name: '2.1.9', base: 'debian:12-slim', pushedAt: '2025-09-17T11:26:00-08:00', pushedBy: 'Noor Haddad', env: 'none', lastPulledAt: '2026-05-02T08:14:00-08:00', pulls30d: 0, sizeMB: 912, scan: { critical: 1, high: 4, medium: 18, low: 27 }, branch: 'master', message: 'Final patch before retirement freeze' },

  // Already on the patched base: not affected, shown as a contrast
  { repo: 'auth-service', name: '4.8.2', base: 'debian:12-slim', pushedAt: '2026-11-15T17:04:00-08:00', pushedBy: 'Noor Haddad', env: 'prod', lastPulledAt: '2026-11-16T08:30:00-08:00', pulls30d: 512, sizeMB: 268, scan: { critical: 0, high: 3, medium: 9, low: 14 }, branch: 'release/4.8', message: 'Rotate staff SSO signing keys' },

  // Debian 12 underneath via bookworm, but outside the base rule. Warning list only.
  { repo: 'ci-runner-base', name: '2026.10.2', base: 'node:20-bookworm', pushedAt: '2026-10-12T12:40:00-08:00', pushedBy: CI_BOT, env: 'none', lastPulledAt: '2026-10-13T09:05:00-08:00', pulls30d: 0, sizeMB: 1012, scan: { critical: 1, high: 9, medium: 22, low: 31 }, branch: 'main', message: 'Pin pnpm 9 in build image' },
  { repo: 'ci-runner-base', name: '2026.09.1', base: 'node:20-bookworm', pushedAt: '2026-09-08T16:22:00-08:00', pushedBy: CI_BOT, env: 'none', lastPulledAt: '2026-09-09T07:12:00-08:00', pulls30d: 0, sizeMB: 1003, scan: { critical: 1, high: 9, medium: 21, low: 30 }, branch: 'main', message: 'Add Playwright browser deps' },
  { repo: 'e2e-test-runner', name: '1.4.2', base: 'node:20-bookworm', pushedAt: '2026-10-19T19:50:00-08:00', pushedBy: 'Sam Whitfield', env: 'none', lastPulledAt: '2026-11-11T03:00:00-08:00', pulls30d: 22, sizeMB: 1234, scan: { critical: 1, high: 6, medium: 19, low: 25 }, branch: 'main', message: 'Add checkout flow for multi-clinic accounts' },
];

interface RepoSpec {
  name: string;
  description: string;
  total: number;
  oldest: string;
  major: number;
  /** Bulk tags pushed after the cutoff (on the patched base). */
  post: number;
}

const REPO_SPECS: RepoSpec[] = [
  { name: 'api-gateway', description: 'Public API edge: auth, rate limits, tenant routing', total: 212, oldest: '2026-01-12T10:00:00Z', major: 3, post: 6 },
  { name: 'appointment-worker', description: 'Consumes booking events and writes calendar slots', total: 70, oldest: '2026-03-02T10:00:00Z', major: 2, post: 0 },
  { name: 'sms-reminders', description: 'Sends appointment reminder texts through the carrier API', total: 62, oldest: '2026-02-14T10:00:00Z', major: 1, post: 0 },
  { name: 'pdf-invoices', description: 'Renders invoices and estimates to PDF', total: 44, oldest: '2026-01-20T10:00:00Z', major: 4, post: 0 },
  { name: 'legacy-php-portal', description: 'Clinic admin portal, in retirement freeze', total: 38, oldest: '2024-03-04T10:00:00Z', major: 2, post: 0 },
  { name: 'clinic-web', description: 'Clinic-facing scheduling web app', total: 74, oldest: '2026-01-05T10:00:00Z', major: 2, post: 2 },
  { name: 'scheduler-ui', description: 'Calendar component and host app for the scheduler', total: 48, oldest: '2026-02-02T10:00:00Z', major: 5, post: 0 },
  { name: 'ops-backup-runner', description: 'Nightly database dump and offsite copy', total: 22, oldest: '2026-02-01T10:00:00Z', major: 1, post: 0 },
  { name: 'data-export-job', description: 'Clinic data exports to CSV and S3', total: 27, oldest: '2025-11-03T10:00:00Z', major: 1, post: 0 },
  { name: 'auth-service', description: 'Logins, sessions, and staff SSO', total: 66, oldest: '2026-01-20T10:00:00Z', major: 4, post: 3 },
  { name: 'notifications-hub', description: 'Email and push notification fan-out', total: 39, oldest: '2026-02-10T10:00:00Z', major: 2, post: 0 },
  { name: 'calendar-sync', description: 'Two-way sync with Google and Outlook calendars', total: 33, oldest: '2026-03-04T10:00:00Z', major: 1, post: 1 },
  { name: 'client-portal', description: 'Pet owner booking portal', total: 58, oldest: '2025-12-15T10:00:00Z', major: 3, post: 0 },
  { name: 'billing-webhooks', description: 'Stripe webhook receiver', total: 24, oldest: '2026-04-01T10:00:00Z', major: 1, post: 0 },
  { name: 'vet-directory-api', description: 'Clinic and practitioner directory', total: 30, oldest: '2026-01-30T10:00:00Z', major: 1, post: 0 },
  { name: 'inventory-sync', description: 'Practice inventory import jobs', total: 17, oldest: '2026-05-12T10:00:00Z', major: 1, post: 0 },
  { name: 'patient-records-api', description: 'Patient and appointment history API', total: 44, oldest: '2026-01-09T10:00:00Z', major: 2, post: 0 },
  { name: 'reports-service', description: 'Utilization and no-show reports', total: 20, oldest: '2026-04-22T10:00:00Z', major: 1, post: 0 },
  { name: 'analytics-ingest', description: 'Product event ingestion', total: 25, oldest: '2026-02-27T10:00:00Z', major: 1, post: 0 },
  { name: 'email-templates', description: 'Transactional email templates', total: 14, oldest: '2026-03-18T10:00:00Z', major: 1, post: 0 },
  { name: 'cron-scheduler', description: 'Scheduled job dispatcher', total: 19, oldest: '2026-02-06T10:00:00Z', major: 1, post: 0 },
  { name: 'metrics-proxy', description: 'Prometheus remote-write proxy', total: 11, oldest: '2026-06-02T10:00:00Z', major: 1, post: 0 },
  { name: 'log-shipper', description: 'Log shipping sidecar', total: 9, oldest: '2026-06-11T10:00:00Z', major: 1, post: 0 },
  { name: 'staff-mobile-api', description: 'Backend for the staff mobile app', total: 36, oldest: '2026-01-26T10:00:00Z', major: 2, post: 0 },
  { name: 'feature-flags', description: 'Flag evaluation service', total: 12, oldest: '2026-05-20T10:00:00Z', major: 1, post: 0 },
  { name: 'search-indexer', description: 'Clinic and client search index builder', total: 16, oldest: '2026-04-09T10:00:00Z', major: 1, post: 0 },
  { name: 'webhooks-dispatch', description: 'Outbound webhook delivery with retries', total: 18, oldest: '2026-03-27T10:00:00Z', major: 1, post: 1 },
  { name: 'img-resizer', description: 'Thumbnails for pet profile photos', total: 14, oldest: '2026-02-19T10:00:00Z', major: 1, post: 0 },
  { name: 'payments-reconciler', description: 'Nightly payment reconciliation', total: 17, oldest: '2026-03-11T10:00:00Z', major: 1, post: 0 },
  { name: 'clinic-onboarding', description: 'Onboarding workflows for new clinics', total: 23, oldest: '2026-02-24T10:00:00Z', major: 1, post: 0 },
  { name: 'ci-runner-base', description: 'Base image for CI build agents', total: 9, oldest: '2026-05-04T10:00:00Z', major: 1, post: 0 },
  { name: 'dev-sandbox', description: 'Throwaway environments for feature branches', total: 7, oldest: '2026-07-01T10:00:00Z', major: 1, post: 2 },
  { name: 'e2e-test-runner', description: 'Playwright end-to-end suite runner', total: 11, oldest: '2026-04-30T10:00:00Z', major: 1, post: 0 },
  { name: 'docs-site', description: 'Public API documentation', total: 10, oldest: '2026-06-16T10:00:00Z', major: 1, post: 0 },
  { name: 'status-page', description: 'Public status page', total: 6, oldest: '2026-08-03T10:00:00Z', major: 1, post: 0 },
  { name: 'migrations-runner', description: 'Database migration job', total: 13, oldest: '2026-03-03T10:00:00Z', major: 1, post: 0 },
  { name: 'support-tools', description: 'Helpers for the internal support console', total: 15, oldest: '2026-05-27T10:00:00Z', major: 1, post: 0 },
  { name: 'admin-console', description: 'Internal admin app', total: 27, oldest: '2026-01-16T10:00:00Z', major: 2, post: 0 },
];

function makeFinding(r: Rng, sev: Severity): Finding {
  const v = pick(r, VULN_POOL);
  const year = pick(r, [2024, 2025]);
  const n = randInt(r, 1, 9);
  return {
    cve: `CVE-${year}-${randInt(r, 1000, 49999)}`,
    severity: sev,
    pkg: v.pkg,
    installed: `${v.ver}${n}`,
    fixedIn: r() < 0.7 ? `${v.ver}${n + 1}` : null,
    title: pick(r, v.titles),
  };
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];
const FINDING_CAP = 14;

function makeFindings(scan: ScanCounts, r: Rng, affected: boolean): Finding[] {
  const list: Finding[] = [];
  for (const sev of SEVERITY_ORDER) {
    for (let i = 0; i < scan[sev] && list.length < FINDING_CAP; i++) {
      list.push(makeFinding(r, sev));
    }
  }
  if (affected) {
    const advisory: Finding = {
      cve: CVE_ID,
      severity: 'critical',
      pkg: 'libssl3',
      installed: '3.0.11-1~deb12u2',
      fixedIn: '3.0.17-1~deb12u1',
      title: 'Out-of-bounds read in TLS handshake parsing',
    };
    const firstCrit = list.findIndex((f) => f.severity === 'critical');
    if (firstCrit >= 0) list[firstCrit] = advisory;
    else list.unshift(advisory);
  }
  return list;
}

function historyFor(base: string, sizeMB: number, app: string): HistoryLine[] {
  const distroless = base.includes('distroless');
  const debian = !distroless && /debian|bookworm|bullseye/.test(base);
  const alpine = base.includes('alpine');
  const isNode = base.startsWith('node');
  const baseMB = Math.min(debian ? 74.2 : alpine ? (isNode ? 46.3 : 7.6) : distroless ? 2.1 : 38.5, sizeMB * 0.45);
  const pkgCmd = debian
    ? 'RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libssl3 tzdata && rm -rf /var/lib/apt/lists/*'
    : alpine
      ? 'RUN apk add --no-cache ca-certificates libssl3 tzdata'
      : null;
  const pkgMB = pkgCmd ? (debian ? 18.6 : 2.4) : 0;
  const rest = Math.max(sizeMB - baseMB - pkgMB, 4);
  const lines: HistoryLine[] = [{ instruction: `FROM ${base}`, sizeMB: baseMB }];
  if (pkgCmd) lines.push({ instruction: pkgCmd, sizeMB: pkgMB });
  lines.push({ instruction: 'COPY --from=build /src/deps /app/deps', sizeMB: rest * 0.6 });
  lines.push({ instruction: `COPY --from=build /out/${app} /usr/local/bin/${app}`, sizeMB: rest * 0.4 });
  lines.push({ instruction: 'USER 10001', sizeMB: 0 });
  lines.push({ instruction: `ENTRYPOINT ["/usr/local/bin/${app}"]`, sizeMB: 0 });
  return lines.map((l) => ({ ...l, sizeMB: Math.round(l.sizeMB * 10) / 10 }));
}

interface TagInput {
  repo: string;
  name: string;
  base: string;
  pushedAt: string;
  pushedBy: string;
  lastPulledAt: string | null;
  pulls30d: number;
  env: Env;
  sizeMB: number;
  scan: ScanCounts;
  branch: string;
  message: string;
  author: string;
}

function finishTag(i: TagInput, r: Rng): Tag {
  const pushedMs = Date.parse(i.pushedAt);
  const affected = matchesCve(i.base, i.pushedAt);
  const known = BASE_DIGESTS[i.base];
  const baseDigest = known ? (pushedMs < CUTOFF_MS ? known.before : known.current) : digestOf(r);
  const commit = hex(r, 40);
  return {
    id: `${i.repo}:${i.name}`,
    repo: i.repo,
    name: i.name,
    digest: digestOf(r),
    sizeMB: i.sizeMB,
    arch: 'linux/amd64',
    base: i.base,
    baseDigest,
    pushedAt: new Date(pushedMs).toISOString(),
    pushedBy: i.pushedBy,
    lastPulledAt: i.lastPulledAt,
    pulls30d: i.pulls30d,
    env: i.env,
    scan: i.scan,
    findings: makeFindings(i.scan, r, affected),
    build: {
      sourceRepo: `pawsched/${i.repo}`,
      commit,
      commitMessage: i.message,
      branch: i.branch,
      author: i.author,
      pipeline: `#${randInt(r, 1800, 2300)}`,
      runner: `ci-amd64-0${randInt(r, 1, 4)}`,
      durationSec: randInt(r, 70, 610),
      dockerfile: 'Dockerfile',
      buildArgs: {
        BASE_IMAGE: i.base,
        APP_VERSION: i.name,
        GIT_SHA: commit.slice(0, 7),
      },
      labels: {
        'org.opencontainers.image.source': `https://github.com/pawsched/${i.repo}`,
        'org.opencontainers.image.revision': commit,
        'org.opencontainers.image.version': i.name,
      },
      history: historyFor(i.base, i.sizeMB, i.repo),
    },
  };
}

function fromExplicit(e: Explicit, r: Rng): Tag {
  return finishTag(
    {
      repo: e.repo,
      name: e.name,
      base: e.base,
      pushedAt: new Date(Date.parse(e.pushedAt)).toISOString(),
      pushedBy: e.pushedBy,
      lastPulledAt: e.lastPulledAt ? new Date(Date.parse(e.lastPulledAt)).toISOString() : null,
      pulls30d: e.pulls30d,
      env: e.env,
      sizeMB: e.sizeMB,
      scan: e.scan,
      branch: e.branch,
      message: e.message,
      author: e.pushedBy === CI_BOT ? pick(r, HUMANS) : e.pushedBy,
    },
    r,
  );
}

function sortedTimes(r: Rng, n: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(lo + r() * (hi - lo));
  return out.sort((a, b) => a - b);
}

function buildRegistry(): { tags: Tag[]; repos: RepoMeta[] } {
  const rng = mulberry32(20261116);
  const tags: Tag[] = [];

  for (const spec of REPO_SPECS) {
    const explicit = EXPLICIT.filter((e) => e.repo === spec.name);
    for (const e of explicit) tags.push(fromExplicit(e, rng));

    // Bulk tags pushed before the cutoff must stay off debian:12 and off the
    // window where this repo is already on a Debian 12 base.
    const debianPre = explicit
      .filter((e) => e.base.startsWith('debian:12') && Date.parse(e.pushedAt) < CUTOFF_MS)
      .map((e) => Date.parse(e.pushedAt));
    const preEnd = debianPre.length > 0 ? Math.min(...debianPre) : CUTOFF_MS;

    const bulk = spec.total - explicit.length;
    const postN = spec.post;
    const preN = bulk - postN;
    if (preN < 0) throw new Error(`Bad spec for ${spec.name}`);

    const times = [
      ...sortedTimes(rng, preN, Date.parse(spec.oldest), preEnd).map((t) => ({ t, post: false })),
      ...sortedTimes(rng, postN, CUTOFF_MS, NOW_MS - 6 * HOUR).map((t) => ({ t, post: true })),
    ];

    const used = new Set(explicit.map((e) => e.name));
    let minor = 0;
    let patch = 0;
    const nextSemver = (): string => {
      for (;;) {
        patch += 1;
        if (patch > 6) {
          minor += 1;
          patch = 1;
        }
        const n = `${spec.major}.${minor}.${patch}`;
        if (!used.has(n)) {
          used.add(n);
          return n;
        }
      }
    };
    const nextSha = (): string => {
      for (;;) {
        const n = rng() < 0.7 ? `main-${hex(rng, 7)}` : `pr-${randInt(rng, 100, 980)}`;
        if (!used.has(n)) {
          used.add(n);
          return n;
        }
      }
    };

    for (const { t, post } of times) {
      const base = post ? weighted(rng, POST_BASES) : weighted(rng, PRE_BASES);
      const pushedBy = rng() < 0.72 ? CI_BOT : pick(rng, HUMANS);
      const lastPulledAt = rng() < 0.2 ? null : new Date(t + rng() * (NOW_MS - t)).toISOString();
      const pulledRecently = lastPulledAt !== null && NOW_MS - Date.parse(lastPulledAt) < 30 * DAY;
      const scan: ScanCounts = post
        ? { critical: rng() < 0.08 ? 1 : 0, high: randInt(rng, 0, 4), medium: randInt(rng, 1, 12), low: randInt(rng, 2, 16) }
        : { critical: rng() < 0.25 ? randInt(rng, 1, 2) : 0, high: randInt(rng, 0, 10), medium: randInt(rng, 2, 22), low: randInt(rng, 3, 28) };
      const name = post ? nextSha() : rng() < 0.5 ? nextSemver() : nextSha();
      tags.push(
        finishTag(
          {
            repo: spec.name,
            name,
            base,
            pushedAt: new Date(t).toISOString(),
            pushedBy,
            lastPulledAt,
            pulls30d: pulledRecently ? randInt(rng, 1, 40) : 0,
            env: 'none',
            sizeMB: Math.round(48 + Math.pow(rng(), 1.7) * 1252),
            scan,
            branch: 'main',
            message: pick(rng, COMMIT_MESSAGES),
            author: pushedBy === CI_BOT ? pick(rng, HUMANS) : pushedBy,
          },
          rng,
        ),
      );
    }
  }

  return {
    tags,
    repos: REPO_SPECS.map((s) => ({ name: s.name, description: s.description })),
  };
}

const registry = buildRegistry();

export const BASE_TAGS: Tag[] = registry.tags;
export const REPO_METAS: RepoMeta[] = registry.repos;
